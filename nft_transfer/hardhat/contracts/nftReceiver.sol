// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Strings.sol";

// 他のファイルの内容をインポート
import "./Verifier.sol";

interface IERC721 {
    function safeMintWithOrigin(address to, string memory uri, Types.TokenOrigin memory origin) external;
}

contract NFTReceiver {

    // このコントラクトのオーナー
    address             owner;

    // V ごとの peerscnf を記憶するマッピング
    mapping(uint => Types.PeerscnfForVerify)   peerscnfsForVerify; // peerscnf のうち、メッセージ検証に必要な部分
    mapping(uint => Types.PeerscnfForUpdate)   peerscnfsForUpdate; // peerscnf のうち、peerscnf の更新に必要な部分

    // 取得済みの最新のピア構成の更新番号
    uint private    latestFetchedV;

    // 取得済みの peerscnf の更新番号(V)のリスト
    uint[] private  vList;

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

    // コントラクトのオーナーを取得する関数
    function getOwner() public view returns (address) {
        return owner;
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
        for(uint chainNo = 0; chainNo < newChainInfoTbl.length; chainNo ++) {
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

    // トランザクションの証明に関わるデータを格納する構造体
    struct TxProofs {
        Types.Transaction transaction;
        Types.TxArgs      txArgs;
        bytes             txHash;
        bytes[][]         proof;
        uint              blockNo;
        bytes             blockHash;
        Types.BlockSPV    blockSPV;
    }    

    // トークン１個分の情報を受け取るのに用いる構造体
    struct TransferingToken {
        string          tokenURI;
        uint            messageTxNo;
        address         dstNFTAddr;
        address         dstWalletAddr;
        TxProofs        txProofs;
    }

    // NFT を受け取る関数
    function receiveNFT(string memory srcChainInfoId, string memory srcNFTId,
                        uint nToken, TransferingToken[] memory tokens) public {

        for(uint tokenNo = 0; tokenNo < nToken; tokenNo ++) {
            TransferingToken memory token = tokens[tokenNo];
            receiveANFT(srcChainInfoId, srcNFTId,
                        token.tokenURI, token.messageTxNo, token.dstNFTAddr, token.dstWalletAddr, token.txProofs);
        }
    }

    // NFT を１個だけ受ける関数
    function receiveANFT(string memory srcChainInfoId, string memory srcNFTId,
                        string memory tokenURI, uint messageTxNo,
                        address dstNFTAddr, address dstWalletAddr,
                        TxProofs memory txProofs) private {

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

                // トランザクションを検証する。
                if(!Verifier.verifyATransaction(peerscnfsForVerify,
                                                txProofs.transaction, txProofs.txArgs, txProofs.txHash,
                                                txProofs.proof, txProofs.blockNo, txProofs.blockHash,
                                                txProofs.blockSPV)) {
                    emit LogMessage("ERROR: TX verification has failed");  // デバッグログ
                } else {

                    // トークンの転送元の情報をまとめる。
                    Types.TokenOrigin memory origin;
                    origin.srcChainInfoId = srcChainInfoId;
                    origin.srcNFTId = srcNFTId;
                    origin.orgTokenId = txProofs.txArgs.orgTokenId;
    
                    // dstNFTAddr で指定されたコントラクトの safeMint() を呼び出して、新たなトークンを mint する。
                    IERC721 nftContract = IERC721(dstNFTAddr);
                    nftContract.safeMintWithOrigin(dstWalletAddr, tokenURI, origin);

                    // トランザクションが処理済みであることを記憶する。
                    messageTxNoProcessed[txIdStr] = true;
                    processedMessageTxList.push(txIdStr);
                }
            }
        }

        emit LogMessage("LEAVE: receiveNFT");       // デバッグログ
    }

    // 処理済みのトランザクションのIDのリストを取得する関数
    function getProcessedMessageTxList() public view returns (string[] memory) {
        return processedMessageTxList;
    }

    // peerscnf の指定された更新番号を取得済みとして記憶する関数
    function registerV(uint V) private {

        // 最新の V の値を更新する。
        if(V > latestFetchedV) {
            latestFetchedV = V;
        }

        // V のリストに追加する。
        vList.push(V);
    }

    // peerscnf のセットを追加する関数
    function addPeerscnfs(Types.Peerscnf[] memory peerscnfArray) public {

        require(tx.origin == owner, "Caller of the transaction is not the contract owner.");

        for(uint peerscnfNo = 0; peerscnfNo < peerscnfArray.length; peerscnfNo ++) {
            Verifier.setPeerscnf(peerscnfsForVerify, peerscnfsForUpdate, peerscnfArray[peerscnfNo]);
            registerV(peerscnfArray[peerscnfNo].V);
        }
    }

    // peerscnf の更新１個分を受け付ける関数
    function receiveAPeerscnfUpdate(
        uint oldV, Types.Peerscnf memory newcnf, Types.SignatureData[] memory signatures
    ) public {
        Verifier.receiveAPeerscnfUpdate(peerscnfsForVerify, peerscnfsForUpdate, oldV, newcnf, signatures);
        registerV(newcnf.V);
    }

    // 取得済みの最新のピア構成の更新番号を返す関数
    function getLatestFetchedV() public view returns (uint) {
        return latestFetchedV;
    }

    // peerscnf の指定の更新番号について、更新元の更新番号を取得するメソッド
    function getBaseV(uint V) public view returns (uint) {

        // 蓄積された更新の番号のうち、指定された更新番号以下の更新番号の最大値を返す。
        // 指定された値より更新番号が小さい peerscnf が蓄積されていない場合は、エラーなので 0 を返す。
        uint baseV = 1;
        for(uint vno = 0; vno < vList.length; vno ++) {
            uint candV = vList[vno];
            if((candV <= V) && (candV > baseV)) {
                baseV = candV;
            }
        }
        return baseV;
    }

    // 受け取った peerscnf を全て削除する関数
    function clearPeerscnfs() public {
        require(tx.origin == owner, "Caller of the transaction is not the contract owner.");

        // peerscnfs を空にする。
        for(uint vno = 0; vno < vList.length; vno ++) {
            delete peerscnfsForVerify[vList[vno]];
            delete peerscnfsForUpdate[vList[vno]];
        }

        // vList を空にする。
        delete vList;

        // 最新の取得済みの更新番号を 0 に戻す。
        latestFetchedV = 0;
    }

    // チェーン情報IDからチェーン情報を取得する関数
    function getChainInfoById(string memory chainInfoId) public view returns (ChainInfo memory) {
        return chainInfoMap[chainInfoId];
    }
}
