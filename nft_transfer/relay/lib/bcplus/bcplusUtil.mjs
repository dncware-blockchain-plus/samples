'use strict';

// BC+のAPIの読み込み
import * as dbcpApi from 'dncware-blockchain-api';


// RPC接続のキャッシュ
var rpcCache = {};


// ウォレットをデコードする関数
export async function dbcpDecodeWallet(walletJSON, walletPassword) {
    var unlockedWallet = null;
    if(walletJSON && walletPassword) {
        try {
            const parsedWallet = await dbcpApi.parseWalletFile(walletJSON);
            unlockedWallet = await dbcpApi.unlockWalletFile(parsedWallet, walletPassword);
        } catch(e) {
        }
    }
    return unlockedWallet;
}

// BC+に接続する関数。
export async function dbcpConnect(urls, chainId, unlockedWallet) {

    // キャッシュに接続がある場合は、それを返す。
    const cacheKey = JSON.stringify({ urls, chainId });
    if(rpcCache[cacheKey]) {
        return rpcCache[cacheKey];
    }

    // 接続先として指定された URL のどれかに接続できるまで、接続を試みる。
    var rpc = null;
    for(var url of urls) {
        try {

            // 文字列 ":::" が URL に含まれる場合は、その前がプロキシの指定だと解釈する。
            var proxy = null;
            const proxySepPos = url.indexOf(':::');
            if(proxySepPos >= 0) {
                proxy = url.substring(0, proxySepPos);
                url = url.substring(proxySepPos + 3);
            }

            // オプションを初期化
            var args = {
                headers: {
                    'User-Agent': 'DNCware Blockchain API Client'
                }
            };

            // プロキシが指定されている場合は、プロキシを設定する。
            if(proxy != null) {
                var { HttpsProxyAgent } = await import('https-proxy-agent');
                var agent = new HttpsProxyAgent(proxy);
                args.agent = agent;
            }

            // ピアへの接続を試みる。
            var newRPC = new dbcpApi.RPC(chainId);
            newRPC.connect(url, args);

            // 実際にRPCが実行できるかどうかを確認する。
            await newRPC.call(unlockedWallet, 'c1query', {type: 'a_wallet'});

            // 接続が成功したので、RPCのオブジェクトを保持する。
            rpc = newRPC;
            break;

        } catch(e) {
            // 接続できない場合、何もせず、次の候補へ移行。
        }
    }

    // どの URL にも接続できなかった場合は、エラーとする。
    if(rpc == null) {
        throw new Error('Failed to connect to any of the specified URLs.');
    }

    // キャッシュに接続を保存する。
    rpcCache[cacheKey] = rpc;

    // 接続を返す。
    return rpc;
}

// コントラクトを呼び出す関数
export async function dbcpCallContract(rpc, uw, contract, args, options) {
    const result = await rpc.call(uw, contract, args, options);
    const expected_status = (options && options.readmode) ? 'read' : 'ok';
    if( result.status !== expected_status ) {
        throw new Error(result.value);
    }
    return result.value;
}

// ウォレットのユーザ情報を取得する関数
export async function dbcpGetWalletUser(rpc, uw) {
    const value = await dbcpCallContract(rpc, uw, 'c1query', {type: 'a_wallet'});
    return value.user;
}

// ID と Unified Name を含むリストから ID を取り出す関数
function dbcpChooseId(idAndUnifiedName) {
    let uid = null;
    for(const str of idAndUnifiedName) {
        if(/^[cu][0-9]+/.test(str)) {
            uid = str;
            break;
        }
    }
    return uid;
}

// トランザクション情報を取得する関数
export async function dbcpGetTransaction(rpc, uw, txid) {

    // c1query でトランザクション情報を取得する。
    const transaction = await dbcpCallContract(rpc, uw, 'c1query', {type: 'a_transaction', id: txid});
    
    // caller/callee として、ID文字列のみを選択する。
    transaction.caller = dbcpChooseId(transaction.caller);
    transaction.callee = dbcpChooseId(transaction.callee);

    // pack をデコードする。
    if(transaction.pack64) {
        transaction.pack = decodeBase64(transaction.pack64);
    } else {
        transaction.pack = null;        
    }
    delete transaction.pack64;

    // disclosed_to/related_to が集合ならリストに直す。
    if (transaction.disclosed_to instanceof Set) {
        transaction.disclosed_to = [...transaction.disclosed_to];
    }
    if (transaction.related_to instanceof Set) {
        transaction.related_to = [...transaction.related_to];
    }

    // 取得したトランザクション情報を返す。
    return transaction;
}

// 指定条件のトランザクションを取得する関数
export async function dbcpGetTransactions(rpc, uw, options) {
    const transactions = [];
    let before_txno = options.before_txno;
    while(true){
        const { value, status } = await rpc.call(uw, 'c1query', { type: 'transactions', before_txno, ...options } );
        if(status !== 'ok') {
            throw new Error(value);
        }
        transactions.push(...value.list);
        if(!value.more) {
            break;
        }
        before_txno = value.more;
    }
    return transactions;
}

// アンロックされたウォレットを生成する関数
export async function generateNewWallet(name, password, config, chainID) {

    // ウォレットを生成する。
    const walletJSON = await dbcpApi.createWalletFile(name, password, config, chainID);

    // ウォレットの文字列をパースする。
    const parsedWallet = await dbcpApi.parseWalletFile(walletJSON);

    // ウォレットをアンロックする。
    const unlockedWallet = await dbcpApi.unlockWalletFile(parsedWallet, password);

    // アンロックされたウォレットを返す。
    return { walletJSON, unlockedWallet };
}

// ユーザのリストを取得する関数
export async function dbcpGetUserList(rpc, uw, options = {}) {
    const value = await dbcpCallContract(rpc, uw, 'c1query', {
        type: 'users',
        ...options
    });
    return value.list;
}

// 一時的なウォレットデータを生成する関数
export async function dbcpGenerateTemporaryWallet(chainId, walletName) {

    // ランダムなパスワードを生成する。
    const walletPassword = Math.random().toString(36).slice(-8);

    // ウォレットの設定
    const config = 'e';

    // 新しいウォレットを生成する。
    const walletJSON = await dbcpApi.createWalletFile(walletName, walletPassword, config, chainId);

    // ウォレットの文字列をパースする。
    const parsedWallet = await dbcpApi.parseWalletFile(walletJSON);

    // ウォレットをアンロックする。
    const unlockedWallet = await dbcpApi.unlockWalletFile(parsedWallet, walletPassword);

    // ウォレットデータとパスワードを返す。
    return {
        walletJSON,
        walletPassword,
        unlockedWallet
    };
}