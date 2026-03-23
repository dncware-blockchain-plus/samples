'use strict';

// ライブラリのインポート
import path from 'path';
import fs from 'fs';

// BC+のAPIの読み込み
import dbcpApi from 'dncware-blockchain-api';


// ウォレットのファイル名
var walletFn = 'YOUR_WALLET_FILE_NAME_HERE.json';

// ウォレットのパスワード
var walletPwd = 'YOUR_WALLET_PASSWORD_HERE';


// ウォレットをファイルから読み込んでデコードする関数。
export async function dbcpLoadAndDecodeWallet() {
    const walletPath = path.join('wallet', walletFn);
    var walletJSON = fs.readFileSync(walletPath, 'utf8');
    var w = await dbcpApi.parseWalletFile(walletJSON);
    var uw = await dbcpApi.unlockWalletFile(w, walletPwd);
    return uw;
}
