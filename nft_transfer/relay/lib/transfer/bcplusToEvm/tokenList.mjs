'use strict';

// 他のファイルからのインポート
import { getPendingTokenMap } from './pendingForReception.mjs';
import { getProcessedTxNoListForSrcAndDstChains } from './processedTxNoList.mjs';
import { connectToEvmChain } from '../connectToEvmChain.mjs';
import { bcpGetRawTokenList } from './rawTokens.mjs';
import { getChainInfo } from '../../common/defsUtil.mjs';
import { dbcpConnect } from '../../bcplus/bcplusUtil.mjs';
import { getBcplusMessageTransactions } from './bcplusMessageTransaction.mjs';
import { tokenPendingForSending } from '../pendigForSending.mjs';
import { sortTokenListById } from '../tokensUtil.mjs';


// 未転送・転送待ちの（burnされていない）トークンのリストを読み込む関数
async function bcpLoadUnburnedTokenList(unlockedWallet, srcChainInfoId, srcNFTId, userId) {

    // BC+上のトークンのリストを取得する。
    const rawTokens = await bcpGetRawTokenList(unlockedWallet, srcChainInfoId, srcNFTId, userId, {
        update: false
    });

    // トークンリスト中のトークンの各々に以下を付与する：
    // - 状態の識別名
    // - 転送先の以下の情報：
    //   - チェーン情報のID
    //   - ＮＦＴのアドレス
    //   - 転送先のアドレス
    const tokens = rawTokens.map((token) => {

        // 転送待ちのトークンの情報を取得する。
        const pendingTokenData = tokenPendingForSending[token.id] || {};
        const {
            dstChainInfoId,
            dstNFTAddrOrId,
            dstWalletAddrOrUserId
        } = pendingTokenData;
        
        // トークンが転送待ちとなった時刻を取得する関数を作る。
        const getPendingForSendingSince = async () => (tokenPendingForSending[token.id]?.pendingSince || undefined);
        
        // トークンの属性をまとめる。
        return {
            burned: false, // NFTコントラクトでのリスティングで得られたトークンはburnされていない。
            ...token,
            srcChainInfoId,
            srcNFTAddrOrId: srcNFTId,
            dstChainInfoId,
            dstNFTAddrOrId,
            dstWalletAddrOrUserId,
            getPendingForSendingSince
        };
    });

    // トークンリストを返す。
    return tokens;
}

// 発行済みのEVMトランザクションの状態を確認する関数
async function checkTransactionStatus(web3, tokenData) {
    const transactionHash = tokenData.transactionHash;
    let receipt = null;
    try {
        receipt = transactionHash ? await web3.eth.getTransactionReceipt(transactionHash) : null;
    } catch(e) {
    }
    if(receipt === null) {
        return 'pending';
    } else if(receipt.status) {
        return 'succeeded';
    } else {
        return 'failed';
    }
}

// 転送予約済みまたは転送済みの（burnされた）トークンのリストを読み込む関数
async function bcpLoadBurnedTokenList(unlockedWallet, rpc, srcChainInfoId, srcNFTId, userId) {

    // メッセージのトランザクションを列挙する。
    const transactions = await getBcplusMessageTransactions(rpc, unlockedWallet, srcChainInfoId, {
        update: false,
        verbose: false
    });

    // メッセージのリストを作る。
    const messages = transactions.map((transaction) => ({...JSON.parse(transaction.argstr), txNo: transaction.txno, time: transaction.time }));

    // 転送元のＮＦＴと所有者が一致するメッセージを抽出する。
    const matchingMessages = messages.filter((message) => (
       (message.srcNFTId === srcNFTId) && (message.orgOwner === userId) 
    ));

    // 上で抽出したメッセージをトークンリストに変換する。
    const pendingOrSentTokenList = await Promise.all(matchingMessages.map(async (message) => {
        const tokenId = message.orgTokenId;

        // 転送予約済みとなった時刻を取得する。
        const reservedForSendingSince = message.time;

        // 受領待ちとなった時刻を取得する関数を作る。
        const getPendingForReceptionSince = () => {
            const pendingTokenMap = getPendingTokenMap(srcChainInfoId, srcNFTId);
            return pendingTokenMap[tokenId] ? pendingTokenMap[tokenId].time : undefined;
        };
        
        // トークンの属性をまとめる。
        return {
            burned: true, // メッセージ発行済みのトークンは、すでにburnされている。
            // index は後で付与する。
            id: message.orgTokenId,
            uri: message.tokenURI,
            reservedForSendingSince,
            getPendingForReceptionSince,
            srcChainInfoId,
            srcNFTAddrOrId: srcNFTId,
            dstChainInfoId: message.dstChainInfoId,
            dstNFTAddrOrId: message.dstNFTAddr,
            dstWalletAddrOrUserId: message.dstWalletAddr,
            messageTxNo: message.txNo
        };
    }));

    // トークンのリストを返す。
    return pendingOrSentTokenList;
}

// burnされたトークンの状態を確認する関数
export async function getBurnedTokenState(web3, pendingTokenMap, processedMessageTxNoList, token) {

    // メッセージのトランザクションの番号が、処理済みのトランザクション番号のリストに
    // 含まれているかどうかをチェックすることで、転送済みかどうかを判定する。
    const isTransfered = processedMessageTxNoList.includes(token.messageTxNo);

    // 状態を判定する。
    if(isTransfered) {
        return 'transfered';
    } else {
        if(pendingTokenMap[token.id]) {
            const status = await checkTransactionStatus(web3, pendingTokenMap[token.id]);
            if(status === 'succeeded') {
                return 'transfered';               // XXX:ここには来ないはず
            } else if(status === 'failed') {
                return 'failed';
            } else { // status === 'pending'
                return 'receptionPending';
            }
        } else {
            return 'reserved';
        }
    }
}

// トークンの状態を更新する関数
async function updateTokenState(srcChainInfoId, srcNFTId, tokens) {

    // 転送先のチェーン情報のIDのリストを作る。
    const dstChainInfoIds = [...new Set(tokens.map(token => token.dstChainInfoId))].filter(id => id);

    // ＮＦＴ受領コントラクトのトランザクションの処理待ちのトークンのリストを取得する。
    const pendingTokenMap = getPendingTokenMap(srcChainInfoId, srcNFTId);

    // burn されていないトークンの各々について、転送待ちの状態を更新する。
    const unburnedTokens = tokens.filter(token => !token.burned);
    for(const token of unburnedTokens) {
        // 転送待ちでなければ alive、転送待ちであれば cmdPending とする。
        token.state = tokenPendingForSending[token.id] ? 'cmdPending' : 'alive';        
    }

    // 転送先のチェーンの各々について、転送先が該当するトークンの状態を更新する。
    await Promise.all(
        dstChainInfoIds.map(
            async dstChainInfoId => {

                // 処理済みのメッセージのトランザクション番号のリストを取得する。
                const processedMessageTxNoList = await getProcessedTxNoListForSrcAndDstChains(
                    srcChainInfoId,
                    dstChainInfoId,
                    {
                        update: false
                    }
                );

                // 転送先チェーンに接続する。
                const web3 = await connectToEvmChain(dstChainInfoId);                

                // 転送先が合致し、かつ burn されているトークンのリストを作る。
                const burnedTokensForDst = tokens.filter(
                    token => (token.dstChainInfoId === dstChainInfoId) && token.burned
                );

                // 転送先が合致するトークンの各々について、状態を更新する。
                await Promise.all(
                    burnedTokensForDst.map(
                        async token => {
                            token.state = await getBurnedTokenState(
                                web3,
                                pendingTokenMap, processedMessageTxNoList,
                                token
                            );
                        }
                    )
                );
            }
        )
    );
}

// トークンリストを作る関数
export async function bcpMakeTokenList(onlyBurned, unlockedWallet, srcChainInfoId, srcNFTId, srcUserId) {

    // ウォレット、転送元チェーン・ＮＦＴが指定されていない場合、およびエラーが起きた場合は、空のリストを返す。
    var tokens = [];
    try {
        if(unlockedWallet && srcChainInfoId && srcNFTId) {

            // 転送元のチェーン情報を取得する。
            const srcChainInfo = await getChainInfo(srcChainInfoId);
            
            // BC+ に接続する。
            const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId, unlockedWallet);
            
            // 未転送・転送待ちの（burnされていない）トークンのリストと、
            // 転送予約済み・転送済みの（burnされた）トークンのリストとを、
            // 平行して取得する。
            // まずは、両者を取得するための Promise を作り、
            // その後で await して、両者の取得を待つ。

            // 未転送・転送待ちの（burnされていない）トークンのリストの取得のための Promise を作る。
            // onlyBurned が指定されている場合は、空のリストを返す Promise を作る。
            const unburnedPromise = (
                onlyBurned
                ? (async () => [])()
                : bcpLoadUnburnedTokenList(
                    unlockedWallet, srcChainInfoId, srcNFTId, srcUserId
                )
            );

            // 転送予約済み・転送済みの（burnされた）トークンのリストの取得のための Promise を作る。
            const burnedPromise = bcpLoadBurnedTokenList(unlockedWallet, rpc, srcChainInfoId, srcNFTId, srcUserId);

            // 両者の取得を待つ。
            const [unburnedTokenList, burnedTokenList] = await Promise.all([unburnedPromise, burnedPromise]);

            // 転送予約済み・転送済みのトークンに番号を振る。
            const baseIndex = unburnedTokenList.length;
            for(const relativeIndex in burnedTokenList) {
                burnedTokenList[relativeIndex].index = baseIndex + Number(relativeIndex);
            }

            // 未転送・転送待ちのトークンのリストと転送予約済みのトークンリストを連結する。
            tokens = [...unburnedTokenList, ...burnedTokenList]

            // トークンリストをソートする。
            sortTokenListById(tokens);

            // トークンの状態を判定する。
            await updateTokenState(srcChainInfoId, srcNFTId, tokens);
        }
    } catch(e) {
        console.log(String(e));
    }

    // トークンリストを返す。
    return tokens;
}
