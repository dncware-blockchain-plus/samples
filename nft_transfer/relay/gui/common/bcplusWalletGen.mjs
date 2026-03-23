'use strict';

// 他のファイルからのインポート
import { generateNewWallet } from '../../lib/bcplus/bcplusUtil.mjs';


// 指定されたチェーン用にウォレットを生成して記憶する関数
export async function generateWalletForChain(chainID) {

    // chainIDが指定されていない場合は、ウォレットを生成しない。
    if (!chainID) {
        return {
            walletJSON: null,
            walletPassword: null,
            unlockedWallet: null
        };
    }

    // ランダムなウォレット名を生成する。
    const name = 'wallet-' + Math.random().toString(36).substring(2, 15);

    // ランダムなウォレットパスワードを生成する。
    const walletPassword = Math.random().toString(36).substring(2, 15);

    // ウォレットの設定
    const config = 'e';

    // ウォレットを生成する
    const walletData = await generateNewWallet(name, walletPassword, config, chainID);

    // 生成したウォレットの情報を返す。
    return {
        walletJSON: walletData.walletJSON,
        walletPassword,
        unlockedWallet: walletData.unlockedWallet
    };
}