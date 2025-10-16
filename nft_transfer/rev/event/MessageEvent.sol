// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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

    // メッセージハッシュ記録用のイベント
    event MessageHash(bytes32 indexed messageHash, uint256 blockNumber);

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

        // メッセージハッシュをブロック番号と共にイベントログに記録する。
        emit MessageHash(messageHash, block.number);
    }
}
