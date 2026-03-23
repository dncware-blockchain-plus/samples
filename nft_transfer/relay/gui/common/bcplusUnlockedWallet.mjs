'use strict';

// 他のファイルからのインポート
import { dbcpDecodeWallet } from '../../../lib/bcplus/bcplusUtil.mjs';
import { getLocalStorage } from './localStorage.mjs';

// BC+のアンロックされたウォレット
export let unlockedWallet = null;


// 指定したアンロック済みウォレットをグローバル変数にセットする関数
export async function setUnlockedWallet(_unlockedWallet) {
    unlockedWallet = _unlockedWallet;
}

// ローカルストレージからウォレットを取得して、アンロックした上でグローバル変数にセットする関数
export async function unlockWalletFromLocalStorage() {

    // ローカルストレージからウォレットのJSON文字列を取得する。
    const walletJSON = getLocalStorage('walletJSON');
    if(!walletJSON) {
        throw new Error('ウォレットのJSONが設定されていません。');
    }

    // ローカルストレージからウォレットのパスワードを取得する。
    const walletPassword = getLocalStorage('walletPassword');
    if(!walletPassword) {
        throw new Error('ウォレットのパスワードが設定されていません。');
    }

    // ウォレットをデコード・アンロックする。
    unlockedWallet = await dbcpDecodeWallet(walletJSON, walletPassword);
}
