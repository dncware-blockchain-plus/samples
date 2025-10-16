// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// メッセージ情報を格納する構造体
struct MessageInfo {
    bytes32 hash;
    uint256 blockNumber;
}

contract MessageEvent {

    // メッセージイベント
    event Message(
        string messageType,
        string dstChainInfoId,
        address srcNFTAddr,
        string orgTokenId,
        address orgOwner,
        string tokenURI,
        string dstNFTId,
        string dstUserId
    );

    // メッセージ情報を格納する配列
    MessageInfo[] public messages;

    // メッセージイベントを発行する関数
    function issueMessage(
        string memory messageType,
        string memory dstChainInfoId,
        address srcNFTAddr,
        string memory orgTokenId,
        address orgOwner,
        string memory tokenURI,
        string memory dstNFTId,
        string memory dstUserId
    ) public {
        
        // 引数全てをまとめたもののハッシュを生成する。
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                messageType,
                dstChainInfoId,
                srcNFTAddr,
                orgTokenId,
                orgOwner,
                tokenURI,
                dstNFTId,
                dstUserId
            )
        );

        // メッセージイベントを発行する。
        emit Message(
            messageType,
            dstChainInfoId,
            srcNFTAddr,
            orgTokenId,
            orgOwner,
            tokenURI,
            dstNFTId,
            dstUserId
        );

        // メッセージハッシュをブロック番号と共に配列に記録する。
        messages.push(MessageInfo(messageHash, block.number));
    }
}
