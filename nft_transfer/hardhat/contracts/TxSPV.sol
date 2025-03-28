//
// トランザクションSPVの検証に関わる関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Utils.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";


library TxSPV {

    // トランザクションのSPVからブロックハッシュを算出する関数
    function calcBlockHashFromTxSPV(bytes[][] memory proof, bytes memory txHash) public pure returns(bytes memory) {
        bytes memory hash = txHash;
        for(uint i = 0; i < proof.length; i ++) {
            bytes[] memory p = proof[i];
            bytes[] memory q = Utils.duplicateBytesArray(p);
            int pos = Utils.findEmpty(q);
            if(pos < 0) {
                console.log("Transaction proof is invalid.");
                return new bytes(0);
            }
            q[(uint)(pos)] = hash;
            hash = Utils.calcSHA256ForConcatenated(q);
        }
        return hash;
    }
}
