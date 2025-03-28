// BC+のAPIの読み込み
if(typeof(window) === 'undefined') {    // node.js の場合
    global.dbcpApi = require('dncware-blockchain-v3-sdk-nodejs');
}


// ウォレットをデコードする関数
async function dbcpDecodeWallet(walletJSON, walletPassword) {
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
async function dbcpConnect(urls, chainId) {

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

            // プロキシが指定されている場合は、プロキシを設定する。
            var args = {};
            if(proxy != null) {
                var { HttpsProxyAgent } = await import('https-proxy-agent');
                var agent = new HttpsProxyAgent(proxy);
                args.agent = agent;
            }

            // ピアへの接続を試みる。
            var newRPC = new dbcpApi.RPC(chainId);
            newRPC.connect(url, args);

            // 接続が成功したので、RPCのオブジェクトを保持する。
            rpc = newRPC;

        } catch(e) {
            // 接続できない場合、何もせず、次の候補へ移行。
        }
    }

    return rpc;
}

// コントラクトを呼び出す関数
async function dbcpCallContract(rpc, uw, contract, args, options) {
    const result = await rpc.call(uw, contract, args, options);
    const expected_status = (options && options.readmode) ? 'read' : 'ok';
    if( result.status !== expected_status ) {
        throw new Error(result.value);
    }
    return result.value;
}

// ウォレットのユーザ情報を取得する関数
async function dbcpGetWalletUser(rpc, uw) {
    const value = await dbcpCallContract(rpc, uw, 'c1query', {type: 'a_wallet'});
    return value.user;
}


// node.js の場合は、関数をエクスポートする。
if(typeof(window) === 'undefined')  {
    module.exports = {
        dbcpDecodeWallet,
        dbcpConnect,
        dbcpCallContract,
        dbcpGetWalletUser
    };
}
