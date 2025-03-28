//
// トランザクションの引数に関わる関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Types.sol";
import "./Primitives.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";


library TxArgs {

    // メッセージパラメータを JSON 化する関数
    function encodeMessageParametersInJSON(Types.TxArgs memory txArgs) private pure returns(string memory) {
        return string(abi.encodePacked(
            '{"messageType":"' , txArgs.messageType,
            '","dstChainInfoId":"' , txArgs.dstChainInfoId,
            '","srcNFTId":"' , txArgs.srcNFTId,
            '","orgTokenId":"' , txArgs.orgTokenId,
            '","orgOwner":"' , txArgs.orgOwner,
            '","tokenURI":"' , txArgs.tokenURI,
            '","dstNFTAddr":"' , txArgs.dstNFTAddr,
            '","dstWalletAddr":"' , txArgs.dstWalletAddr,
            '"}'
        ));
    }

    // トランザクション情報の引数部分が一致していることを確認する関数
    function compareArgs(Types.Transaction memory transaction, Types.TxArgs memory txArgs) public pure returns(bool) {
        string memory txArgsStr = encodeMessageParametersInJSON(txArgs);
        return Primitives.compareStrings(txArgsStr, transaction.argstr);
    }

}
