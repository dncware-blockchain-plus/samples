// 秘密鍵を格納したファイルのパス
const privateKeyFN = '../private_key.json';

const fs = require('fs');

const { Web3 } = require('web3');

// ファイルからウォレットアドレスと秘密鍵を読み込む関数
function loadPrivateKey() {
    const privateKeyJSON = fs.readFileSync(privateKeyFN, 'utf8');
    const privateKeyData = JSON.parse(privateKeyJSON);
    return privateKeyData;
}

// 指定URLのEVMチェーンに接続する関数
function evmNodeJsConnect(chainUrls) {
    const web3 = new Web3(chainUrls[0]);
    return web3;
}

// 文字列のみからなるログをデコードしてコンソールにダンプする関数
// (evmCall の戻り値の logs が入力。logs[i].data の中身が ['string'] であることが前提。)
function dumpStringLog(contractWrapper, logs) {
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

module.exports = {
    loadPrivateKey,
    evmNodeJsConnect,
    dumpStringLog
};
