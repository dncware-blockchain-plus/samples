//
// ユーティリティ関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Primitives.sol";

// ライブラリをインポート
import "base64-sol/base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


library Utils {

    // 文字列の長さを取得する関数
    function strlen(string memory str) pure public returns (uint) {
        return bytes(str).length;
    }

    // 文字列２個を連結する関数
    function concatenateString(string memory str1, string memory str2) public pure returns(string memory) {
        return string(abi.encodePacked(str1, str2));
    }

    // 指定した文字列が、指定の配列に含まれているか否かを確認する関数
    function isStringInArray(string memory str, string[] memory array) public pure returns(bool) {
        bool found = false;
        for(uint i = 0; i < array.length; i ++) {
            if(Primitives.compareStrings(array[i], str)) {
                found = true;
            }
        }
        return found;
    }

    // 論理値を文字列に変換する関数
    function boolToString(bool x) public pure returns(string memory) {
        if(x) {
            return "true";
        } else {
            return "false";
        }
    }

    // 符号なし整数を文字列に変換する関数
    function uintToString(uint x) public pure returns(string memory) {
        return Strings.toString(x);
    }

    // 符号付整数を文字列に変換する関数
    function intToString(int x) public pure returns(string memory) {
        if(x >= 0) {
            return uintToString((uint)(x));
        } else {
            return concatenateString("-", uintToString((uint)(- x)));
        }
    }

    // bytes[] のシャローコピーを作る関数
    function duplicateBytesArray(bytes[] memory bytesArray) public pure returns(bytes[] memory) {
        bytes[] memory newBytesArray = new bytes[](bytesArray.length);
        for(uint i = 0; i < bytesArray.length; i ++) {
            newBytesArray[i] = bytesArray[i];
        }
        return newBytesArray;
    }

    // bytes32 から bytes への変換
    function bytes32ToBytes(bytes32 data) public pure returns(bytes memory) {
        return abi.encodePacked(data);
    }

    // bytes[] から長さ０のバイト列を探し、そのインデックスを返す関数（見つからない場合は負の数を返す）
    function findEmpty(bytes[] memory bytesArray) public pure returns(int) {
        int pos = -1;
        for(uint i = 0; i < bytesArray.length; i ++) {
            if(bytesArray[i].length == 0) {
                pos = (int)(i);
                break;
            }
        }
        return pos;
    }

    // 指定された bytes の中身を全て連結したものの SHA256 ハッシュを求める関数
    function calcSHA256ForConcatenated(bytes[] memory bytesArray) public pure returns(bytes memory) {
        bytes memory concatenatedBytes = Primitives.concatenateBytesArray(bytesArray);
        bytes32 hash = sha256(concatenatedBytes);
        return bytes32ToBytes(hash);
    }
}
