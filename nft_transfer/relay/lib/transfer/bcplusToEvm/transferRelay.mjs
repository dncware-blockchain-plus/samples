'use strict';

// 他のファイルからのインポート
import { getLatestFetchedV, updatePeerscnf } from './peerscnf.mjs';
import { getTransactionProofs } from './proofs.mjs';
import { sortAndUniq } from '../primitives.mjs';
import { tokenPendingForSending, addTokensPendingForSending } from '../pendigForSending.mjs';
import { registerATokenAsPendingForReception, removeATokenAsPendingForReception, saveTransactionHashForReception } from './pendingForReception.mjs';
import { getChainInfo } from '../../common/defsUtil.mjs';
import { removeRedundantObjectInArray } from '../../common/arrayUtil.mjs';
import { dbcpConnect, dbcpCallContract } from '../../bcplus/bcplusUtil.mjs';
import { getBcplusMessageTransactions } from './bcplusMessageTransaction.mjs';
import { evmMakeContractWrapper } from '../../evm/evmUtil.mjs';
import { evmSend } from '../../evm/evmUtil.mjs';
import { evmSwitchChain } from '../../evm/browserEvmUtil.mjs';

// NFTReceiver コントラクトの情報を格納したファイルの相対パス
export const nftReceiverContractRelPath =  'receiver/nftReceiver.sol/NFTReceiver.json';


// ＮＦＴ転送コントラクトを呼び出す関数
async function callNFTSender(rpc, uw, srcChainInfo, srcNFTId, srcTokenIds, dstChainInfoId, dstAddress, tokens) {

    // 転送対象のトークンの各々について、
    for(const srcTokenId of srcTokenIds) {

        // ＮＦＴ転送コントラクトを呼び出す。
        try {
            await dbcpCallContract(rpc, uw, srcChainInfo.nftSender, {
                nftId: srcNFTId,
                tokenId: srcTokenId,
                dstChainInfoId: dstChainInfoId,
                dstAddress: dstAddress
            });
            console.log(`INFO: Invocation of nftSender contract has succeeded for token ${srcTokenId}.`)
        } catch(e) {
            console.error(`ERROR: Invocation of nftSender contract has failed for token ${srcTokenId}.`);
        }

        // 転送待ちのトークンのリストから当該トークンを削除する。
        delete tokenPendingForSending[srcTokenId];
    }
}

// 元のトークンIDをキー、値をトランザクションとしたマップを作る関数
async function makeMessageTransactionMap(rpc, uw, srcChainInfo) {

    // メッセージのトランザクションを列挙する。
    const transactions = await getBcplusMessageTransactions(rpc, uw, srcChainInfo.id, {
        update: true,
        verbose: true
    });

    // 元のNFTコントラクトのIDとトークンIDのペアをキー、値をトランザクションとしたマップを作って返す。
    const transactionMap = {};
    for(const tx of transactions) {
        const args = JSON.parse(tx.argstr);
        transactionMap[[args.srcNFTId, args.orgTokenId]] = tx;
    }
    return transactionMap;
}

// 転送対象のトークンの情報を取得する関数
async function getTransferingTokenInfo(rpc, transactionMap, tokenId, srcNFTId, latestFetchedV) {

    // マップのキーを作る。
    const key = [srcNFTId, tokenId]

    // 当該トランザクションが存在しない場合はエラー
    if(!(key in transactionMap)) {
        throw `ERROR: Transfer message for token ${tokenId} of NFT ${srcNFTId} does not exist.`;
    }

    // 当該トランザクションを取得する。
    const tx = transactionMap[key];

    // 引数とトランザクション番号を取得する。
    const args = JSON.parse(tx.argstr);
    const txno = tx.txno;

    // トランザクションに記録された転送元の NFT の ID が引数で指定されたものと一致しない場合はエラーとする。
    if(args.srcNFTId !== srcNFTId) {
        throw `ERROR: srcNFTId is inconsistent for token ${tokenId}. (${args.srcNFTId} in the message and ${srcNFTId} in the function argument)`;
    }

    // トランザクションの検証に必要な情報を取得する。
    const { txProof, V } = await getTransactionProofs(rpc, tx, latestFetchedV);

    // トークンの情報を取得して返す。
    const transferingTokenInfo = [
        args.tokenURI,          // tokenURI
        txno,                   // messageTxNo
        args.dstNFTAddr,        // dstNFTAddr
        args.dstWalletAddr,     // dstWalletAddr
        txProof                 // txProof
    ];
    return { transferingTokenInfo, V };
}

// ＮＦＴ受領コントラクトを呼び出す関数
async function sendTransferMessage(receiverContractWrapper, srcChainInfoId, srcNFTId, transferingTokensInfo, srcTokenIds, dstChainId, refreshProc) {

    try {

        // ＮＦＴ受領コントラクトを呼び出す。
        const contractArgs = [
            srcChainInfoId,            // srcChainInfoId
            srcNFTId,                  // srcNFTId
            transferingTokensInfo.length,  // numTransferingTokens
            transferingTokensInfo          // transferingTokens
        ];

        // EVMリクエストを送信する。
        const promise = evmSend(
            receiverContractWrapper, 'receiveNFT', contractArgs
        );

        // ＮＦＴ受領コントラクトでの処理対象としたトークンを、処理待ちリストに加える。
        for(const srcTokenId of srcTokenIds) {
            registerATokenAsPendingForReception(srcChainInfoId, srcNFTId, srcTokenId);
        }

        // 状態の変化をトークン一覧の表示に反映する。
        if(refreshProc) {
            await refreshProc({ reload: true });
        }

        // EVMリクエストの発行が完了するまで待機する。
        await (
            promise
            .once('transactionHash', transactionHash => {
                console.log(`INFO: sendTransferMessage(transactionHash) transactionHash: ${transactionHash}`);

                // トランザクションハッシュが得られたら、処理待ちのトークンの情報に追加する。
                for(const srcTokenId of srcTokenIds) {
                    saveTransactionHashForReception(srcChainInfoId, srcNFTId, srcTokenId, transactionHash);
                }

                // 状態の変化をトークン一覧の表示に反映する。
                if(refreshProc) {
                    refreshProc({ reload: true });      
                }
            })
            .once('error', (error, receipt) => {
                console.error(`ERROR: sendTransferMessage(transactionError) error: ${error}, receipt: ${JSON.stringify(receipt)}`);
            })
        );

        // 成功した旨をコンソールに出力する。
        console.log(`INFO: sendTransferMessage has succeeded.`);

        // 状態の変化をトークン一覧の表示に反映する。
        if(refreshProc) {
            await refreshProc({ reload: true });
        }

    } catch(error) {
        console.error(`ERROR: sendTransferMessage has failed. error: ${JSON.stringify(error)}`);
        alert(`転送メッセージの送信に失敗しました。\n${JSON.stringify(error, null, 2)}`);
    }

    // 処理対象としたトークンを処理待ちリストから削除する。
    for(const srcTokenId of srcTokenIds) {
        removeATokenAsPendingForReception(srcChainInfoId, srcNFTId, srcTokenId);
    }
}

// メッセージをリレーする関数
async function relayMessages(rpc, uw, web3, evmWalletAddress, srcChainInfo, dstChainInfo, srcNFTId, srcTokenIds, refreshProc) {

    // 転送先チェーンを選択する。
    await evmSwitchChain(web3, dstChainInfo);

    // コントラクト NFTReceiver のインスタンスのラッパを作成する。
    const receiverContractWrapper = await evmMakeContractWrapper(web3, evmWalletAddress, dstChainInfo.nftReceiver, nftReceiverContractRelPath);

    // 元のトークンIDをキー、値をトランザクションとしたマップを作る。
    const transactionMap = await makeMessageTransactionMap(rpc, uw, srcChainInfo);

    // EVM に転送済みの最新のピア構成の更新番号を取得する。
    const latestFetchedV = await getLatestFetchedV(receiverContractWrapper);

    try {
        // 転送対象のトークンの情報を取得する。
        // また、転送対象のトークンについて、ブロックSPVが要求する peerscnf の更新番号の一覧を取得する。
        const resps = await Promise.all(srcTokenIds.map((tokenId) => getTransferingTokenInfo(rpc, transactionMap, tokenId, srcNFTId, latestFetchedV)));
        const transferingTokensInfos = resps.map(resp => resp.transferingTokenInfo);
        const vList = sortAndUniq(resps.map(resp => resp.V));

        // ブロックSPVが要求する peerscnf の各々への更新を行う
        for(const V of vList) {
            await updatePeerscnf(rpc, uw, receiverContractWrapper, V);
        }

        // ＮＦＴ受領コントラクトを呼び出す。
        await sendTransferMessage(receiverContractWrapper, srcChainInfo.id, srcNFTId, transferingTokensInfos, srcTokenIds, dstChainInfo.chainId, refreshProc);

    } catch(e) {
        console.error(e);
    }
}

// 指定されたＮＦＴを転送予約状態にする関数
export async function reserveNFTsForTransfer(uw, srcChainInfoId, srcNFTId, srcTokenIds, dstChainInfoId, dstNFTAddr, dstAddress, tokens, refreshProc) {

    // 引数チェックを行う。
    if((!srcChainInfoId) || (!srcNFTId) || (!dstChainInfoId) || (!dstNFTAddr) || (!dstAddress)) {
        alert('転送元・転送先で未指定の項目があります。')
    } else if((!srcTokenIds) || (srcTokenIds.length == 0)) {
        alert('転送対象のトークンが選択されていません。')
    } else if(uw === null) {
        alert('ＢＣ＋用のウォレットが選択されていないか、ロック解除されていません。');
    } else {

        // 転送元のチェーン情報を取得する。
        const srcChainInfo = await getChainInfo(srcChainInfoId);
    
        // BC+ に接続する。
        const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId, uw);

        // 転送待ちのトークンのリストをセットする。
        addTokensPendingForSending(srcTokenIds, dstChainInfoId, dstNFTAddr, dstAddress);

        // ＮＦＴ転送コントラクトを呼び出す。
        await callNFTSender(rpc, uw, srcChainInfo, srcNFTId, srcTokenIds, dstChainInfoId, dstAddress, tokens);

        // 状態の変化をトークン一覧の表示に反映する。
        if(refreshProc) {
            await refreshProc({ reload: true });
        }
    }
}

// 転送予約されたＮＦＴをＥＶＭ互換チェーンに送る関数
export async function sendNFTsReservedForTransfer(uw, web3, evmWalletAddress, srcChainInfoId, srcNFTId, srcTokenIds, tokens, refreshProc) {

    // 引数チェックを行う。
    if((!srcChainInfoId) || (!srcNFTId)) {
        alert('転送元・転送先で未指定の項目があります。')
    } else if((!srcTokenIds) || (srcTokenIds.length == 0)) {
        alert('転送対象のトークンが選択されていません。')
    } else if(uw === null) {
        alert('ＢＣ＋用のウォレットが選択されていないか、ロック解除されていません。');
    } else if(web3 === null) {
        alert('ＥＶＭ用のウォレットが選択されていません。');
    } else {

        // 転送元のチェーン情報を取得する。
        const srcChainInfo = await getChainInfo(srcChainInfoId);
    
        // BC+ に接続する。
        const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId, uw);

        // 転送先のチェーンの情報のIDの一覧を作る。
        const dstChainInfoIds = removeRedundantObjectInArray(tokens.filter(token => srcTokenIds.includes(token.id)).map(token => token.dstChainInfoId));

        // 転送先のチェーンの各々について、
        for(const dstChainInfoId of dstChainInfoIds) {

            // 転送先のチェーン情報を取得する。
            const dstChainInfo = await getChainInfo(dstChainInfoId);

            // 転送先のチェーンが一致するトークンのIDの一覧を作る。
            const tokenIds = tokens.filter(token => (srcTokenIds.includes(token.id) && (token.dstChainInfoId === dstChainInfoId))).map(token => token.id);

            // 転送メッセージをリレーする。
            await relayMessages(rpc, uw, web3, evmWalletAddress, srcChainInfo, dstChainInfo, srcNFTId, tokenIds, refreshProc);
        }

        // 状態の変化をトークン一覧の表示に反映する。
        if(refreshProc) {
            await refreshProc({ reload: true });      
        }
    }
}
