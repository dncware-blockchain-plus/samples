//
// トランザクション検証用のコントラクトを実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Types.sol";
import "./Primitives.sol";
import "./Utils.sol";
import "./TxArgs.sol";
import "./TxHash.sol";
import "./TxSPV.sol";
import "./BlockSPV.sol";
import "./Peerscnf.sol";
import "./Pubkey.sol";
import "./Debug.sol";

// ライブラリをインポート
import "base64-sol/base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Verifier {

    // このコントラクトのオーナー
    address             owner;

    // V ごとの peerscnf を記憶するマッピング
    mapping(uint => Types.Peerscnf)   peerscnfs;


    // コンストラクタ
    constructor(address _owner) {
        owner = _owner;
    }

    // 指定された peerscnf を登録する関数
    function setPeerscnf(Types.Peerscnf memory peerscnf) private {
        uint V = peerscnf.V;
        peerscnfs[V].V = V;
        peerscnfs[V].NF = peerscnf.NF;
        peerscnfs[V].cnfstr = peerscnf.cnfstr;
        peerscnfs[V].cnf = peerscnf.cnf;
        peerscnfs[V].blkno = peerscnf.blkno;
        peerscnfs[V].hash64 = peerscnf.hash64;
        for(uint peerNo = 0; peerNo < peerscnf.peers.length; peerNo ++) {
            peerscnfs[V].peers.push(peerscnf.peers[peerNo]);
        }
        peerscnfs[V].pids = peerscnf.pids;
        peerscnfs[V].authorities = peerscnf.authorities;        
    }

    // peerscnf のセットを追加する関数
    function addPeerscnfs(Types.Peerscnf[] memory peerscnfArray) public {

        require(tx.origin == owner, "Caller of the transaction is not the contract owner.");

        for(uint peerscnfNo = 0; peerscnfNo < peerscnfArray.length; peerscnfNo ++) {
            setPeerscnf(peerscnfArray[peerscnfNo]);
        }
    }

    // トランザクションを検証する関数
    function verifyATransaction(
        uint flags, // 通常は０を指定すること。いずれかの機能を無効化する場合は、当該ビットを１とすること。
        Types.Transaction memory transaction, Types.TxArgs memory txArgs, bytes memory txHash, bytes[][] memory proof,
        uint blockNo, bytes memory blockHash, Types.BlockSPV memory blockSPV
    ) view public returns (bool) {
        bool result = true;

        // peerscnf を取得する
        Types.Peerscnf memory peerscnf;
        if(flags & 0x0020 == 0) {
            peerscnf = peerscnfs[blockSPV.V];
            require(peerscnf.V != 0, "peerscnf for blockSPV.V is not registered");
        }

        // ピアの配列から公開鍵を収集する
        Types.PublicKeyData[] memory pubkeys;
        if(flags & 0x0010 == 0) {
            pubkeys = Pubkey.getPublicKeys(peerscnf.peers);
        }

        // トランザクションのパラメータが一致することを確認する
        if(flags & 0x0008 == 0) {
            if(!TxArgs.compareArgs(transaction, txArgs)) {
                console.log('Transaction and its arguments are inconsistent.');
                result = false;
            }
        }

        // トランザクションとそのハッシュが一致することを確認する
        if(flags & 0x0004 == 0) {
            bytes memory calculatedTxHash = TxHash.calculateTxHash(transaction);
            if(!Primitives.compareBytes(calculatedTxHash, txHash)) {
                console.log('Transaction and its hash are inconsistent.');
                result = false;
            }
        }

        // トランザクションのSPVを検証する
        if(flags & 0x0002 == 0) {
            bytes memory blockHashFromSPV = TxSPV.calcBlockHashFromTxSPV(proof, txHash);
            if(!Primitives.compareBytes(blockHashFromSPV, blockHash)) {
                console.log('Verification of the transaction SPV has failed.');
                result = false;
            }
        }

        // ブロックのSPVを検証する
        if(flags & 0x0001 == 0) {
            if(!BlockSPV.verifyBlockSPV(blockNo, blockHash, blockSPV, peerscnf, pubkeys)) {
                console.log('Verification of the block SPV has failed.');
                result = false;
            }
        }

        // 検証結果を返す。
        return result;
    }

    // peerscnf の更新１個分を受け付ける関数
    function receiveAPeerscnfUpdate(
        uint flags, // 通常は０を指定すること。いずれかの機能を無効化する場合は、当該ビットを１とすること。
        uint oldV, Types.Peerscnf memory newcnf, Types.SignatureData[] memory signatures
    ) public {
        
        // 更新前の peerscnf を取得する。
        // （登録済みでなかったらエラー）
        Types.Peerscnf memory oldcnf;
        if(flags & 0x0004 == 0) {
            oldcnf = peerscnfs[oldV];
            require(oldcnf.V == oldV, 'Old peerscnf is not present.');
        }

        // peerscnf の更新を検証する。
        bool verified = false;
        if(flags & 0x0002 == 0) {
            verified = Peerscnf.verifyAPeerscnfUpdate(oldcnf, newcnf, signatures);
            require(verified, 'Given peerscnf update is invalid.');
        }

        // 更新後の peerscnf を登録する。
        if(flags & 0x0001 == 0) {
            setPeerscnf(newcnf);
        }
    }
}
