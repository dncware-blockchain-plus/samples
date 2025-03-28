// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";

interface IERC721 {
    function safeMint(address to, string memory uri) external;
}

contract NFTReceiver {

    // このコントラクトのオーナー
    address             owner;

    // デバッグログ用のイベント
    event LogMessage(string message);

    // チェーン情報の構造体
    struct ChainInfo {
        string          id;
        string          chainType;
        string          chainId;
    }

    ChainInfo[] private chainInfoTbl;
    mapping(string => ChainInfo) private chainInfoMap;

    // 転送元と転送先のペア
    struct SrcDstPair {
        string          srcChainInfoId;
        string          srcNFTContractId;
        string          dstChainInfoId;
        address         dstNFTContractAddr;
    }

    SrcDstPair[] private srcDstTbl;

    // メッセージコントラクトの当該トランザクションが処理済みか否かの判定のためのマップ
    // キー："(トランザクション番号),(転送元のチェーン情報のID)"の形式の文字列
    // 値：初期値 false なら未処理、true なら処理済み
    mapping(string => bool) public messageTxNoProcessed;

    // トランザクションを前チェーンにわたって一意に識別する以下の形式の文字列を作る関数
    // (トランザクション番号),(転送元のチェーン情報のID)
    function MakeTxIdStr(uint256 messageTxNo, string memory srcChainInfoId) public pure returns (string memory) {
        return string(abi.encodePacked(Strings.toString(messageTxNo), ",", srcChainInfoId));
    }

    // 処理済みのトランザクションのIDのリスト
    string[] private processedMessageTxList;

    string thisChainInfoId = "";                        // このチェーンのチェーン情報のID

    // コンストラクタ
    constructor(address _owner) {
        owner = _owner;
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

        delete srcDstTbl;
        for(uint pairNo = 0; pairNo < newSrcDstTbl.length; pairNo ++) {
            srcDstTbl.push(newSrcDstTbl[pairNo]);
        }
    }

    // このチェーンのチェーン情報のIDをセットする関数
    function setChainInfoId(string memory chainInfoId) public {
        require(tx.origin == owner, "ERROR: The transaction origin is not the owner.");

        thisChainInfoId = chainInfoId;
    }

    // 文字列比較関数
    function compareStrings(string memory a, string memory b) private pure returns(bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    // 転送元と転送先の対応関係を検証する関数
    function checkSrcDst(string memory srcChainInfoId, string memory srcNFTId, address dstNFTAddr) private view returns(bool) {

        // このチェーンのタイプとIDを取得する。
        ChainInfo memory thisChainInfo = chainInfoMap[thisChainInfoId];
        string memory thisChainType = thisChainInfo.chainType;
        string memory thisChainId = thisChainInfo.chainId;

        // 対応関係を検証する。
        bool matchFound = false;
        uint numSrcDst = srcDstTbl.length;
        for(uint srcDstNo = 0; srcDstNo < numSrcDst; srcDstNo ++) {
            SrcDstPair memory srcDstPair = srcDstTbl[srcDstNo];
            ChainInfo memory dstChainInfo = chainInfoMap[srcDstPair.dstChainInfoId];

            /////////////////////////////////////////// デバッグコード
            // emit LogMessage("BEGIN: SRC/DST CAND");
            // if(!compareStrings(srcNFTId, srcDstPair.srcNFTContractId)) { emit LogMessage("MISMATCH: compareStrings(srcNFTId, srcDstPair.srcNFTContractId)"); }
            // if(!(dstNFTAddr == srcDstPair.dstNFTContractAddr)) { emit LogMessage("MISMATCH: (dstNFTAddr == srcDstPair.dstNFTContractAddr)"); }
            // if(!compareStrings(srcChainInfoId, srcDstPair.srcChainInfoId)) { emit LogMessage("MISMATCH: compareStrings(srcChainInfoId, srcDstPair.srcChainInfoId)"); }
            // if(!compareStrings(thisChainType, dstChainInfo.chainType)) { emit LogMessage("MISMATCH: compareStrings(thisChainType, dstChainInfo.chainType)"); }
            // if(!compareStrings(thisChainId, dstChainInfo.chainId)) { emit LogMessage("MISMATCH: compareStrings(thisChainId, dstChainInfo.chainId)"); }
            // emit LogMessage("END: SRC/DST CAND");
            /////////////////////////////////////////// デバッグコード

            if(compareStrings(srcNFTId, srcDstPair.srcNFTContractId)
                && (dstNFTAddr == srcDstPair.dstNFTContractAddr)
                && compareStrings(srcChainInfoId, srcDstPair.srcChainInfoId)
                && compareStrings(thisChainType, dstChainInfo.chainType)
                && compareStrings(thisChainId, dstChainInfo.chainId)) {
                matchFound = true;
                break;
            }
        }
        return matchFound;
    }

    // トークン１個分の情報を受け取るのに用いる構造体
    struct TransferingToken {
        string          tokenURI;
        uint            messageTxNo;
        address         dstNFTAddr;
        address         dstWalletAddr;
    }

    // NFT を受け取る関数
    function receiveNFT(string memory srcChainInfoId, string memory srcNFTId,
                        uint nToken, TransferingToken[] memory tokens) public {

        for(uint tokenNo = 0; tokenNo < nToken; tokenNo ++) {
            TransferingToken memory token = tokens[tokenNo];
            receiveANFT(srcChainInfoId, srcNFTId,
                        token.tokenURI, token.messageTxNo, token.dstNFTAddr, token.dstWalletAddr);
        }
    }

    // NFT を１個だけ受ける関数
    function receiveANFT(string memory srcChainInfoId, string memory srcNFTId,
                        string memory tokenURI, uint messageTxNo,
                        address dstNFTAddr, address dstWalletAddr) private {

        emit LogMessage("ENTER: receiveNFT");                   // デバッグログ

        // トランザクションを前チェーンにわたって一意に識別する文字列を作る。
        string memory txIdStr = MakeTxIdStr(messageTxNo, srcChainInfoId);

        // 当該トランザクションが処理済みならなにもしない。
        if(messageTxNoProcessed[txIdStr]) {
            emit LogMessage("ERROR: Already processed");        // デバッグログ
        } else {

            // 転送元と転送先の対応関係を検証する。
            if(!checkSrcDst(srcChainInfoId, srcNFTId, dstNFTAddr)) {
                emit LogMessage("ERROR: Invalid source/destination pair");  // デバッグログ
            } else {

                // dstNFTAddr で指定されたコントラクトの safeMint() を呼び出して、新たなトークンを mint する。
                IERC721 nftContract = IERC721(dstNFTAddr);
                nftContract.safeMint(dstWalletAddr, tokenURI);

                // トランザクションが処理済みであることを記憶する。
                messageTxNoProcessed[txIdStr] = true;
                processedMessageTxList.push(txIdStr);
            }
        }

        emit LogMessage("LEAVE: receiveNFT");       // デバッグログ
    }

    // 処理済みのトランザクションのIDのリストを取得する関数
    function getProcessedMessageTxList() public view returns (string[] memory) {
        return processedMessageTxList;
    }
}
