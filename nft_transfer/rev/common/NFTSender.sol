// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Strings.sol";


interface IERC721 {
    function burn(uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface IMessageEvent {
    // メッセージイベントを発行する関数
    function issueMessage(
        string memory messageType,
        string memory dstChainInfoId,
        address srcNFTAddr,
        uint256 orgTokenId,
        address orgOwner,
        string memory tokenURI,
        string memory dstNFTId,
        string memory dstUserId
    ) external;
}

// チェーン情報の構造体
struct ChainInfo {
    string id;
    string chainType;
    string chainId;
    address messageContractAddr;
}

// 転送元と転送先のペアの構造体
struct SrcDstPair {
    string srcChainInfoId;
    address srcNFTContractAddr;
    string dstChainInfoId;
    string dstNFTContractId;
}

contract NFTSender {

    // このコントラクトのオーナー
    address             owner;

    // 送信元の（このチェーンの）チェーン情報ID
    string private srcChainInfoId;


    // チェーン情報の表
    ChainInfo[] private chainInfoTbl;
    mapping(string => ChainInfo) private chainInfoMap;

    // 転送元・転送先の対応表
    SrcDstPair[] private srcDstTbl;
    mapping(bytes32 => SrcDstPair) private srcDstMap;


    // コンストラクタ
    constructor(address _owner) {
        owner = _owner;
    }

    // 以下の組み合わせのハッシュ値を求める関数：
    // - 転送元(パブリックBC)のチェーン情報ID
    // - 転送元のNFTのコントラクトアドレス
    // - 転送先(BC+)のチェーン情報のID
    function calcSrcDstHash(
        string memory _srcChainInfoId,
        address srcNFTContractAddr,
        string memory dstChainInfoId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _srcChainInfoId,
            srcNFTContractAddr,
            dstChainInfoId
        ));
    }

    // NFTを転送する関数
    function sendNFT(
        address nftAddr,
        uint256 tokenId,
        string memory dstChainInfoId,
        string memory dstUserId
    ) public {

        // 以下の組み合わせのハッシュ値を求める：
        // - 転送元(パブリックBC)のチェーン情報ID
        // - 転送元のNFTのコントラクトアドレス
        // - 転送先(BC+)のチェーン情報のID
        bytes32 hash = calcSrcDstHash(
            srcChainInfoId,
            nftAddr,
            dstChainInfoId
        );

        // 転送元・転送先の対応表から、当該レコードを取得する。
        SrcDstPair memory srcDstPair = srcDstMap[hash];

        // 転送先のチェーン情報を取得する。
        ChainInfo memory dstChainInfo = chainInfoMap[dstChainInfoId];
        require(bytes(dstChainInfo.id).length > 0, "Invalid destination chain info");

        // 転送元のNFTコントラクトを開く。
        IERC721 nftContract = IERC721(srcDstPair.srcNFTContractAddr);

        // 転送元のNFTのトークンURIと所有者を取得する。
        string memory tokenURI = nftContract.tokenURI(tokenId);
        address tokenOwner = nftContract.ownerOf(tokenId);

        // 転送元のトークンをいったん、このコントラクトに転送する。
        nftContract.transferFrom(tokenOwner, address(this), tokenId);

        // dstNFTAddr で指定されたコントラクトの burn() を呼び出して、指定されたトークンを burn する。
        nftContract.burn(tokenId);

        // メッセージコントラクトを呼び出すことで、メッセージを記録する。
        IMessageEvent messageEvent = IMessageEvent(dstChainInfo.messageContractAddr);
        messageEvent.issueMessage(
            "NFTTransfer",
            dstChainInfoId,
            nftAddr,
            tokenId,
            tokenOwner,
            tokenURI,
            srcDstPair.dstNFTContractId,
            dstUserId
        );
    }

    // チェーン情報のテーブルをセットする関数
    function setChainInfoTbl(ChainInfo[] memory newChainInfoTbl) public {
        require(tx.origin == owner, "ERROR: The transaction origin is not the owner.");

        // chainInfoMap を空にする。
        for(uint chainNo = 0; chainNo < chainInfoTbl.length; chainNo ++) {
            delete chainInfoMap[chainInfoTbl[chainNo].id];
        }

        // chainInfoTbl を指定された値で上書きする。
        delete chainInfoTbl;
        for(uint chainNo = 0; chainNo < chainInfoTbl.length; chainNo ++) {
            chainInfoTbl.push(newChainInfoTbl[chainNo]);
        }        

        // chainInfoMap を構築しなおす。
        for(uint chainNo = 0; chainNo < chainInfoTbl.length; chainNo ++) {
            ChainInfo memory chainInfo = chainInfoTbl[chainNo];
            chainInfoMap[chainInfo.id] = chainInfo;
        }
    }

    // 転送元と転送先のペアのテーブルをセットする関数
    function setSrcDstTbl(SrcDstPair[] memory newSrcDstTbl) public {
        require(tx.origin == owner, "ERROR: The transaction origin is not the owner.");

        // srcDstMap を空にする。
        for(uint pairNo = 0; pairNo < srcDstTbl.length; pairNo ++) {
            delete srcDstMap[calcSrcDstHash(
                srcDstTbl[pairNo].srcChainInfoId,
                srcDstTbl[pairNo].srcNFTContractAddr,
                srcDstTbl[pairNo].dstChainInfoId
            )];
        }

        // srcDstTbl を指定された値で上書きする。
        delete srcDstTbl;
        for(uint pairNo = 0; pairNo < newSrcDstTbl.length; pairNo ++) {
            srcDstTbl.push(newSrcDstTbl[pairNo]);
        }

        // srcDstMap を構築しなおす。
        for(uint pairNo = 0; pairNo < srcDstTbl.length; pairNo ++) {
            SrcDstPair memory srcDstPair = srcDstTbl[pairNo];
            srcDstMap[calcSrcDstHash(
                srcDstPair.srcChainInfoId,
                srcDstPair.srcNFTContractAddr,
                srcDstPair.dstChainInfoId
            )] = srcDstPair;
        }
    }

    // このチェーンのチェーン情報のIDをセットする関数
    function setChainInfoId(string memory chainInfoId) public {
        require(tx.origin == owner, "ERROR: The transaction origin is not the owner.");

        srcChainInfoId = chainInfoId;
    }
}
