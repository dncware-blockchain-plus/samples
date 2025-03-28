//
// デバッグ用の関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "hardhat/console.sol";

library Debug {

    // bytes をダンプする関数
    function dumpBytes(bytes memory arr) public pure {
        bytes memory digits = "0123456789abcdef";
        uint arrLen = arr.length;
        bytes memory strBytes = new bytes(arrLen * 2);
        for(uint i = 0; i < arrLen; i ++) {
            strBytes[i * 2] = digits[(uint8)(arr[i]) >> 4];
            strBytes[i * 2 + 1] = digits[(uint8)(arr[i]) & 0x0f];
        }
        console.log(string(strBytes));
    }

    // bytes[] をダンプする関数
    function dumpBytesArray(bytes[] memory arr) public pure {
        console.log("");
        for(uint i = 0; i < arr.length; i ++) {
            dumpBytes(arr[i]);
        }
    }    
}
