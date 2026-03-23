//
// トランザクション検証用のコントラクトを実装したライブラリ
//

// SPDX-License-Identifier: MIT
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

library Verifier {

    // 指定された peerscnf を登録する関数
    function setPeerscnf(
        mapping(uint => Types.PeerscnfForVerify) storage peerscnfsForVerify,
        mapping(uint => Types.PeerscnfForUpdate) storage peerscnfsForUpdate,
        Types.Peerscnf memory peerscnf
    ) public {
        uint V = peerscnf.V;

        Types.PublicKeyData[] memory pubkeys = Pubkey.getPublicKeys(peerscnf.peers);

        peerscnfsForVerify[V].V = V;
        peerscnfsForVerify[V].NF = peerscnf.NF;
        peerscnfsForVerify[V].hash64 = peerscnf.hash64;
        for(uint peerNo = 0; peerNo < pubkeys.length; peerNo ++) {
            peerscnfsForVerify[V].pubkeys.push(pubkeys[peerNo]);
        }

        peerscnfsForUpdate[V].cnfstr = peerscnf.cnfstr;
        peerscnfsForUpdate[V].cnf = peerscnf.cnf;
        peerscnfsForUpdate[V].blkno = peerscnf.blkno;
        for(uint peerNo = 0; peerNo < peerscnf.peers.length; peerNo ++) {
            peerscnfsForUpdate[V].peers.push(peerscnf.peers[peerNo]);
        }
        peerscnfsForUpdate[V].pids = peerscnf.pids;
        peerscnfsForUpdate[V].authorities = peerscnf.authorities;
    }

    // トランザクションを検証する関数
    function verifyATransaction(
        mapping(uint => Types.PeerscnfForVerify) storage peerscnfsForVerify,
        Types.Transaction memory transaction, Types.TxArgs memory txArgs, bytes memory txHash, bytes[][] memory proof,
        uint blockNo, bytes memory blockHash, Types.BlockSPV memory blockSPV
    ) view public returns (bool) {
        bool result = true;

        // peerscnf を取得する
        Types.PeerscnfForVerify memory peerscnfForVerify = peerscnfsForVerify[blockSPV.V];
        require(peerscnfForVerify.V != 0, "peerscnf for blockSPV.V is not registered");

        // トランザクションのパラメータが一致することを確認する
        if(!TxArgs.compareArgs(transaction, txArgs)) {
            console.log('Transaction and its arguments are inconsistent.');
            result = false;
        }

        // トランザクションとそのハッシュが一致することを確認する
        bytes memory calculatedTxHash = TxHash.calculateTxHash(transaction);
        if(!Primitives.compareBytes(calculatedTxHash, txHash)) {
            console.log('Transaction and its hash are inconsistent.');
            result = false;
        }

        // トランザクションのSPVを検証する
        bytes memory blockHashFromSPV = TxSPV.calcBlockHashFromTxSPV(proof, txHash);
        if(!Primitives.compareBytes(blockHashFromSPV, blockHash)) {
            console.log('Verification of the transaction SPV has failed.');
            result = false;
        }

        // ブロックのSPVを検証する
        if(!BlockSPV.verifyBlockSPV(blockNo, blockHash, blockSPV, peerscnfForVerify, peerscnfForVerify.pubkeys)) {
            console.log('Verification of the block SPV has failed.');
            result = false;
        }

        // 検証結果を返す。
        return result;
    }

    // 指定されたVの peerscnf を取得する関数
    function getPeerscnf(
        mapping(uint => Types.PeerscnfForVerify) storage peerscnfsForVerify,
        mapping(uint => Types.PeerscnfForUpdate) storage peerscnfsForUpdate,
        uint V
    ) public view returns (Types.Peerscnf memory) {
        require(peerscnfsForVerify[V].V == V, "peerscnf for the specified V is not registered");
        Types.Peerscnf memory peerscnf;
        peerscnf.V = V;
        peerscnf.NF = peerscnfsForVerify[V].NF;
        peerscnf.cnfstr = peerscnfsForUpdate[V].cnfstr;
        peerscnf.cnf = peerscnfsForUpdate[V].cnf;
        peerscnf.blkno = peerscnfsForUpdate[V].blkno;
        peerscnf.hash64 = peerscnfsForVerify[V].hash64;
        peerscnf.peers = peerscnfsForUpdate[V].peers;
        peerscnf.pids = peerscnfsForUpdate[V].pids;
        peerscnf.authorities = peerscnfsForUpdate[V].authorities;
        return peerscnf;
    }

    // peerscnf の更新１個分を受け付ける関数
    function receiveAPeerscnfUpdate(
        mapping(uint => Types.PeerscnfForVerify) storage peerscnfsForVerify,
        mapping(uint => Types.PeerscnfForUpdate) storage peerscnfsForUpdate,
        uint oldV, Types.Peerscnf memory newcnf, Types.SignatureData[] memory signatures
    ) public {
        
        // 更新前の peerscnf を取得する。
        // （登録済みでなかったらエラー）
        Types.Peerscnf memory oldcnf = getPeerscnf(peerscnfsForVerify, peerscnfsForUpdate, oldV);
        require(oldcnf.V == oldV, 'Old peerscnf is not present.');

        // peerscnf の更新を検証する。
        bool verified = Peerscnf.verifyAPeerscnfUpdate(oldcnf, newcnf, signatures);
        require(verified, 'Given peerscnf update is invalid.');

        // 更新後の peerscnf を登録する。
        setPeerscnf(peerscnfsForVerify, peerscnfsForUpdate, newcnf);
    }
}
