'use strict';

// ライブラリのインポート
import Web3 from 'web3';


// EVMプロバイダの一覧を取得する関数。
export async function evmGetProviders() {
    const providers = await Web3.requestEIP6963Providers();
    return providers;
}

// EVMプロバイダを選択して、Web3 のオブジェクトを生成する関数
export async function evmSelectProvider(evmProvider) {

    // evmProvider が null でない場合は、とりあえず Web3 のオブジェクトを作る。
    var web3 = null;
    if(evmProvider) {
        web3 = new Web3(evmProvider);

        // アカウント情報を要求し、失敗した場合は Web3 のオブジェクトを廃棄する。
        const accounts = await web3.eth.requestAccounts();
        if(accounts.length <= 0) {
            web3 = null;
        }
    }

    // 生成した Web3 のオブジェクトを返す。
    return web3;
}

// EVMのウォレットアドレスの一覧を取得する関数
export async function evmGetWalletAddresses(web3) {
    const addresses = web3 ? await web3.eth.getAccounts() : [];
    return addresses;
}

// 登録したカスタムチェーンを選択する関数
export async function evmSwitchChain(web3, dstChainInfo) {
    const chainIdHex = '0x' + parseInt(dstChainInfo.chainId).toString(16);
    const params = {
        chainId: chainIdHex
    };
    await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [params]
    });
}
