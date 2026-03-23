'use strict';

// 他のファイルからのインポート
import { showScreen } from '../../lib/screen/screenManager.mjs';
import { getLocalStorage } from '../common/localStorage.mjs';


// 初期画面に戻る関数
export function showInitialScreen() {

    // ローカルストレージに接続情報が設定されているか否かを確認する。
    const keys = ['evmWalletAddress', 'srcChainInfoId', 'walletJSON', 'walletPassword'];
    const connected = keys.every(key => Boolean(getLocalStorage(key)));

    // 接続情報が設定されているか否かで表示する画面を切り替える。
    if (connected) {
        // 接続情報が設定されている場合、メインの画面を表示
        showScreen('main');
    } else {
        // 接続情報が設定されていない場合、接続画面を表示
        showScreen('connect');
    }
}
