var walletFn = 'dbcwallet-local-ePMq4pYjckhWX4yw6eFR49FaZz53Pz.json';
var walletPwd = 'local';


// ライブラリのインポート
const path = require('path');
const fs = require('fs');

// BC+のAPIの読み込み
const dbcpApi = require('dncware-blockchain-v3-sdk-nodejs');


// ウォレットをファイルから読み込んでデコードする関数。
async function dbcpLoadAndDecodeWallet() {
    const walletPath = path.join('wallet', walletFn);
    var walletJSON = fs.readFileSync(walletPath, 'utf8');
    var uw = await dbcpApi.unlockWalletFile(await dbcpApi.parseWalletFile(walletJSON), walletPwd);
    return uw;
}


// 関数をエクスポートする。
module.exports = {
    dbcpLoadAndDecodeWallet
};
