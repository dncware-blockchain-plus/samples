'use strict';

// 他のファイルからのインポート
import { nftReceiverContractRelPath } from './transferRelay.mjs';
import { connectToEvmChain } from '../connectToEvmChain.mjs';
import { getChainInfo } from '../../common/defsUtil.mjs';
import { evmMakeContractWrapper, evmCall } from '../../evm/evmUtil.mjs';


// 転送先チェーンと転送元のチェーンの組み合わせの各々について、
// 処理済みのトランザクションの番号のリストを格納したオブジェクト
// （二階層のオブジェクトであり、
// 　第一階層のキーが転送先チェーン情報ID、
// 　第二階層のキーが転送元チェーン情報ID、
// 　値が処理済みのトランザクションの番号のリスト）
const processedTxNoData = {};


// 指定した転送元・転送先のチェーンについて、
// 処理済みのトランザクションの番号のリストを取得する関数
export async function getProcessedTxNoListForSrcAndDstChains(srcChainInfoId, dstChainInfoId, options = {}) {

    // オプションを取得する。
    const {
        update = false      // リストを更新するかどうか
    } = options;

    // リストを更新する場合は、転送先チェーンに接続してリストを更新する。
    if(update) {
        await updateProcessedListForDstChain(dstChainInfoId);
    }

    // 指定した転送先・転送元のチェーンに対応するリストを返す。
    return processedTxNoData[dstChainInfoId]?.[srcChainInfoId] || [];
}

// リストで指定された転送先チェーンについて、処理済みのトランザクションの番号のリストを更新する関数
export async function updateProcessedTxNoLists(dstChainInfoIds) {

    // 各転送先チェーンについて、リストを更新する。
    await Promise.all(dstChainInfoIds.map(
        async dstChainInfoId => {
            await updateProcessedListForDstChain(dstChainInfoId);
        }
    ));
}

// 指定した転送先チェーンについて、処理済みのトランザクションの番号のリストを更新する関数
async function updateProcessedListForDstChain(dstChainInfoId) {

    // 転送先チェーンに接続する。
    const web3 = await connectToEvmChain(dstChainInfoId);

    // EVMウォレットのアドレス
    // （実際には用いない値なので、ダミーの値をセットする。）
    const dummyEvmWalletAddress = null;

    // 転送先のチェーンの情報を取得する。
    const dstChainInfo = await getChainInfo(dstChainInfoId);

    // コントラクト NFTReceiver のインスタンスのラッパを作成する。
    const receiverContractWrapper = await evmMakeContractWrapper(web3, dummyEvmWalletAddress, dstChainInfo.nftReceiver, nftReceiverContractRelPath);

    // ＮＦＴ受領コントラクトを呼び出して、転送元のチェーン情報のIDと、処理済みのトランザクションの番号のペアのリストを取得する。
    const pairStrs = await evmCall(receiverContractWrapper, 'getProcessedMessageTxList', []);
    const pairs = (
        pairStrs
        .map(pair => pair.split(','))
        .map(pair => ({
            srcChainInfoId: pair[1],
            txNo: Number(pair[0])
        }))
    );

    // 処理済みのトランザクションの番号のリストを、転送元のチェーンごとに格納したオブジェクトを作る。
    const listForSrcChain = {};
    for(const pair of pairs) {
        if(listForSrcChain[pair.srcChainInfoId]) {
            listForSrcChain[pair.srcChainInfoId].push(pair.txNo);
        } else {
            listForSrcChain[pair.srcChainInfoId] = [pair.txNo];
        }
    }

    // 処理済みのトランザクションの番号のリストを、転送先チェーンと転送元チェーンの組み合わせごとに格納したオブジェクトにセットする。
    processedTxNoData[dstChainInfoId] = listForSrcChain;
}
