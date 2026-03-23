'use strict';

// 他のファイルからのインポート
import { dbcpConnect, dbcpCallContract, dbcpGetTransaction } from '../../bcplus/bcplusUtil.mjs';
import { getChainInfo } from '../../common/defsUtil.mjs';


// チェーンごとのメッセージトランザクションのリストを収めるオブジェクト
export const chainTransactions = {};


// BC+のメッセージのトランザクションを取得する関数
export async function getBcplusMessageTransactions(rpc, unlockedWallet, srcChainInfoId, options = {}) {

    // オプションを取得する。
    const {
        verbose = false,    // 詳細情報も取得するかどうか
        update = false      // 新しいトランザクションを取得するかどうか
    } = options;

    // update が true の場合、新しいトランザクションを取得する。
    if(update) {

        // チェーンごとのトランザクションのリストが存在しなければ、空のリストを作る。
        chainTransactions[srcChainInfoId] = chainTransactions[srcChainInfoId] || [];

        // 新しいトランザクションを取得する。
        await fetchNewBcplusMessageTransactions(unlockedWallet, srcChainInfoId);
    }

    // 既に取得済みのトランザクションのリストを取得する。
    const transactions = chainTransactions[srcChainInfoId] || [];

    // verboseが true の場合、詳細情報が未取得のトランザクションについて、詳細情報を取得する。
    if(verbose) {
        await fetchDetailsOfBcplusMessageTransactions(rpc, unlockedWallet, transactions);
    }

    // トランザクションのリストを返す。
    return transactions;
}

// BC+の新しいメッセージトランザクションを取得する関数
// （※ メッセージの詳細は取得しない）
export async function fetchNewBcplusMessageTransactions(unlockedWallet, srcChainInfoId) {

    // チェーン情報を取得する。
    const srcChainInfo = await getChainInfo(srcChainInfoId);

    // チェーンに接続する。
    const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId, unlockedWallet);

    // 既に取得済みのトランザクションのリストを取得する。
    const transactions = chainTransactions[srcChainInfo.id] || [];

    // 既に取得済みのトランザクションのうち、最も新しいトランザクションの番号を調べる。
    const latestTxNo = transactions.length > 0 ? transactions[transactions.length - 1].txno : undefined;

    // 既に取得済みのトランザクションのうち、最も新しいトランザクションの番号より後のトランザクションを取得する。
    const newTransactions = await fetchBcplusMessageTransactionsNewerThan(rpc, unlockedWallet, srcChainInfo, latestTxNo);

    // 既に取得済みのトランザクションのリストに新しいトランザクションを追加する。
    chainTransactions[srcChainInfo.id] = transactions.concat(newTransactions);
}

// BC+の、指定された番号より後のトランザクションを取得する関数
// latestTxNo で指定された番号のトランザクションは含まれない。
// latestTxNo が undefined の場合は、全トランザクションを取得する。
async function fetchBcplusMessageTransactionsNewerThan(rpc, uw, srcChainInfo, latestTxNo) {

    // 取得したトランザクションを格納する配列
    const obtainedTransactions = [];

    // 取得開始位置
    let lastTxNo = latestTxNo;

    // トランザクションを取得する。
    while(true) {

        // 取得できるだけのトランザクションを取得する。
        const res = await dbcpCallContract(rpc, uw, 'c1query', {
            type: 'transactions',
            reverse: true,          // トランザクション番号の昇順で取得する
            after_txno: lastTxNo,
            caller: srcChainInfo.nftSender,
            callee: srcChainInfo.messageEventId,
            status: 'ok',
            details: [ 'argstr' ]
        })

        // ステータスが ok のトランザクションのみを抽出する。
        const okTransactions = res.list.filter(
            transaction => (transaction.status === 'ok')
        );

        // latestTxNo より後のトランザクションのみを抽出する。
        const newTransactions = (
            (latestTxNo === undefined)
            ? okTransactions
            : okTransactions.filter(transaction => transaction.txno > latestTxNo)
        );

        // 取得したトランザクションを配列に追加する。
        obtainedTransactions.push(...newTransactions);

        // まだ取得すべきトランザクションがある場合は、ループを続ける。
        if(res.more == null)
            break;
        lastTxNo = res.more;
    }

    // 取得したトランザクションを返す。
    return obtainedTransactions;
}

// BC+の、詳細情報が未取得のトランザクションについて、詳細情報を取得する関数
async function fetchDetailsOfBcplusMessageTransactions(rpc, unlockedWallet, transactions) {

    // 詳細情報が未取得のトランザクションのインデックスを抽出する。
    const indices = transactions.map((tx, index) => tx.verbose ? -1 : index).filter(index => index >= 0);

    // 未取得のトランザクションが存在する場合、詳細情報を取得する。
    if(indices.length > 0) {
        const details = await Promise.all(indices.map(
            async index => ({
                index,
                detail: await dbcpGetTransaction(rpc, unlockedWallet, transactions[index].txno)
            })
        ));
        for(const { index, detail } of details) {
            transactions[index] = {
                ...detail,
                verbose: true
            };
        }
    }
}
