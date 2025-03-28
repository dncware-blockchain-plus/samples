//
// トランザクションハッシュの算出に関わる関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Types.sol";
import "./Utils.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";


library TxHash {

    // 文字列の配列をJSON化する関数
    function encodeStringsInJSON(string[] memory strings) private pure returns(string memory) {
        bytes memory arr = bytes("[");
        for(uint i = 0; i < strings.length; i ++) {
            if(i == 0) {
                arr = abi.encodePacked(arr, strings[i]);
            } else {
                arr = abi.encodePacked(arr, ",", strings[i]);
            }
        }
        arr = abi.encodePacked(arr, "]");
        return string(arr);
    }

    // トランザクションのパラメータをJSON化する関数
    function encodeTransactionParamsInJSON(
        uint txno, uint caller_txno, string memory caller, string memory callee,
        uint subtxs, uint steps, string memory status,
        string[] memory disclosed_to, string[] memory related_to
    ) private pure returns(string memory) {

        string memory disclosed_to_JSON = encodeStringsInJSON(disclosed_to);
        string memory related_to_JSON = encodeStringsInJSON(related_to);
        return string(abi.encodePacked(
            '[', Utils.uintToString(txno),
            ',', Utils.uintToString(caller_txno),
            ',"', caller,
            '","', callee,
            '",' , Utils.uintToString(subtxs),
            ',' , Utils.uintToString(steps),
            ',"' , status, '"',
            ',' , disclosed_to_JSON,
            ',' , related_to_JSON,
            ']'
        ));
    }

    // トランザクションからそのハッシュ値をもとめる関数
    function calculateTxHash(Types.Transaction memory transaction) public pure returns(bytes memory) {

        // トランザクションのパラメータをJSON化する。
        string memory txParamsStr = encodeTransactionParamsInJSON(
            transaction.txno, transaction.caller_txno, transaction.caller, transaction.callee, transaction.subtxs, transaction.steps,
            transaction.status, transaction.disclosed_to, transaction.related_to
        );

        // 以下をまとめて、ハッシュを計算：
        // - トランザクションのパラメータ
        // - 引数の文字列
        // - 戻り値の文字列
        bytes memory h = Utils.bytes32ToBytes(sha256(abi.encodePacked(txParamsStr, transaction.argstr, transaction.valuestr)));

        if(Utils.strlen(transaction.txid) != 0) { // main transaction

            // トランザクションのパケット、アドレス、ＩＤをハッシュ値に反映させる
            h = Utils.bytes32ToBytes(sha256(abi.encodePacked(transaction.pack, h)));
            h = Utils.bytes32ToBytes(sha256(abi.encodePacked(Primitives.encodeUTF8(transaction.addr), h)));
            h = Utils.bytes32ToBytes(sha256(abi.encodePacked(Primitives.encodeUTF8(transaction.txid), h)));
        }
        return h;
    }
}
