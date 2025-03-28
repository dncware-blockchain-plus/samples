//
// プリミティブを実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// ライブラリをインポート
import "base64-sol/base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


library Primitives {

    // 部分文字列が、指定された文字列と一致するか否か判定する関数
    function checkSubstring(string memory str, string memory substr, uint pos) public pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);
        // 部分文字列が文字列の範囲外にある場合はfalseを返す
        if(pos + substrBytes.length > strBytes.length) {
            return false;
        }
        // 部分文字列が一致するかどうかをチェック
        for(uint i = 0; i < substrBytes.length; i ++) {
            if(strBytes[pos + i] != substrBytes[i]) {
                return false;
            }
        }
        return true;
    }

    // 部分文字列を取得する関数
    function substring(string memory str, uint start, uint end) public pure returns (string memory) {
        require(end > start, "substring: end <= start");
        bytes memory strBytes = bytes(str);
        uint len = strBytes.length;
        require(end <= len, "substring: end is out of the valid range");
        uint subLen = end - start;
        bytes memory subStrBytes = new bytes(subLen);
        for(uint i = 0; i < subLen; i ++) {
            subStrBytes[i] = strBytes[start + i];
        }
        return string(subStrBytes);
    }

    // 改行を除去する関数
    function removeNewline(string memory str) public pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        uint len = strBytes.length;

        // 改行抜きの長さを調べる。
        uint newLen = 0;
        for(uint i = 0; i < len; i ++) {
            if(strBytes[i] != 0x0a) {
                newLen ++;
            }
        }

        // 改行抜きの長さのバッファを作り、そこに改行以外の文字を詰める。
        bytes memory newStrBytes = new bytes(newLen);
        uint pos = 0;
        for(uint i = 0; i < len; i ++) {
            if(strBytes[i] != 0x0a) {
                newStrBytes[pos ++] = strBytes[i];
            }
        }

        // 文字列に戻して返す。
        return string(newStrBytes);
    }

    // 改行文字を '\n' に変換する関数
    function encodeNewLines(string memory str) public pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        uint len = strBytes.length;

        // 変換後の長さを求める。 
        uint newLen = len;
        for(uint i = 0; i < len; i ++) {
            if(strBytes[i] == 0x0a) {
                newLen ++;
            }
        }

        // 変換後の長さのバッファを確保する。
        bytes memory newStrBytes = new bytes(newLen);
        
        // 変換を行いながら、確保したバッファを埋める。
        uint pos = 0;
        for(uint i = 0; i < len; i ++) {
            bytes1 b = strBytes[i];
            if(b == 0x0a) {
                newStrBytes[pos ++] = 0x5c; // \
                newStrBytes[pos ++] = 0x6e; // n
            } else {
                newStrBytes[pos ++] = b;
            }
        }

        // 変換結果を文字列として返す。
        return string(newStrBytes);
    }

    // base64 をデコードする関数
    function decodeBase64(string memory base64) public pure returns (bytes memory) {
        return Base64.decode(base64);
    }

    // 文字列同士を比較して、一致する場合は true を返す関数
    function compareStrings(string memory str1, string memory str2) public pure returns(bool) {
        return Strings.equal(str1, str2);
    }

    // バイト列同士を比較して、一致する場合は true を返す関数
    function compareBytes(bytes memory arr1, bytes memory arr2) public pure returns (bool) {
        if(arr1.length != arr2.length) {
            return false;
        } else {
            for(uint i = 0; i < arr1.length; i ++) {
                if(arr1[i] != arr2[i]) {
                    return false;
                }
            }
            return true;
        }
    }

    // バイト列の部分列を返す関数
    function bytesSlice(bytes memory data, uint start, uint end) public pure returns(bytes memory) {
        require((start <= end) && (end <= data.length), "bytesSlice(): start/end is invalid");
        uint len = end - start;
        bytes memory slice = new bytes(len);
        for(uint i = 0; i < slice.length; i ++) {
            slice[i] = data[start + i];
        }
        return slice;
    }

    // ３２ビットの整数値を bytes にリトルエンディアンで書き込む関数
    function writeUint32LE(bytes memory bin, uint pos, uint32 val) public pure returns(uint) {
        require(pos + 4 <= bin.length, "Out of bounds");
        bin[pos] = bytes1(uint8(val));
        bin[pos + 1] = bytes1(uint8(val >> 8));
        bin[pos + 2] = bytes1(uint8(val >> 16));
        bin[pos + 3] = bytes1(uint8(val >> 24));
        return pos + 4;
    }

    // 指定されたバイト列を書き込む関数
    function writeBytes(bytes memory bin, uint pos, bytes memory data) public pure returns(uint) {
        for(uint i = 0; i < data.length; i ++) {
            bin[pos] = data[i];
            pos ++;
        }
        return pos;
    }

    // 文字列をUTF8のバイト列にエンコードする関数
    function encodeUTF8(string memory str) public pure returns(bytes memory) {
        return abi.encodePacked(str);
    }

    // 与えられたバイト列のリストを単純に結合したバイト列を作る関数
    function concatenateBytesArray(bytes[] memory bytesArray) internal pure returns(bytes memory) {

        // 結合後の長さを計算する。
        uint len = 0;
        for(uint i = 0; i < bytesArray.length; i ++) {
            len += bytesArray[i].length;
        }

        // 結合したバイト列のための領域を確保する。
        bytes memory newBytes = new bytes(len);

        // 確保した領域に結合元のバイト列を詰める。
        uint pos = 0;
        for(uint i = 0; i < bytesArray.length; i ++) {
            writeBytes(newBytes, pos, bytesArray[i]);
            pos += bytesArray[i].length;
        }

        // 結合結果を返す。
        return newBytes;
    }
}
