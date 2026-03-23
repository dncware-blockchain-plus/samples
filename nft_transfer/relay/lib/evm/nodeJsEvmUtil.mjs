// 秘密鍵を格納したファイルのパス
const privateKeyFN = '../private_key.json';

import fs from 'fs';

// ファイルからウォレットアドレスと秘密鍵を読み込む関数
export function loadPrivateKeys() {
    const privateKeyJSON = fs.readFileSync(privateKeyFN, 'utf8');
    const privateKeyData = JSON.parse(privateKeyJSON);
    return privateKeyData;
}

// 文字列のみからなるログをデコードしてコンソールにダンプする関数
// (evmCall の戻り値の logs が入力。logs[i].data の中身が ['string'] であることが前提。)
export function dumpStringLog(contractWrapper, logs) {
    const web3 = contractWrapper.web3;
    for(const log of logs) {
        try {
            const line = web3.eth.abi.decodeLog(['string'], log.data)[0];
            console.log('LOG: ' + line);
        } catch(e) {
            // 上の方法でデコードできないイベントは無視する。
        }
    }
}

// トランザクションに署名した上で send する関数
export async function evmSignAndSend(contractWrapper, methodName, args, privateKey, options = {}) {

    // オプションの内容を取得する。
    const gasPriceMultiplier = options.gasPriceMultiplier || 2; // デフォルトのガス価格倍率を設定

    // web3.utils をインポートする。
    const { utils: web3Utils } = await import('web3');

    // web3のインスタンスを取得する。
    const web3 = contractWrapper.web3;

    // トランザクションのデータを作成する。
    const txData = contractWrapper.contract.methods[methodName](...args).encodeABI();

    // ガス価格を取得する。
    const gasPrice = await web3.eth.getGasPrice();

    // ガス価格に倍率を掛ける。
    const adjustedGasPrice = gasPrice * (web3Utils.toBigInt(gasPriceMultiplier));

    // ガス代を見積もる
    const estimatedGas = await contractWrapper.contract.methods[methodName](...args).estimateGas({
        from: contractWrapper.walletAddress
    });

    // トランザクションのオブジェクトを作成する。
    const txObject = {
        from: contractWrapper.walletAddress,
        to: contractWrapper.contract.options.address,
        data: txData,
        gasPrice: adjustedGasPrice,
        gas: estimatedGas
    };

    // トランザクションに署名する。
    const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);

    // 署名されたトランザクションを送信する。
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}
