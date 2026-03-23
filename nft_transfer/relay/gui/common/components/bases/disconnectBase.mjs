'use strict';

// 他のファイルからのインポート
import { showScreen } from '../../../../lib/screen/screenManager.mjs';
import { setLocalStorage } from "../../localStorage.mjs";
import { unlockedWallet, unlockWalletFromLocalStorage } from '../../bcplusUnlockedWallet.mjs';
import { dbcpConnect, dbcpCallContract } from "../../../../lib/bcplus/bcplusUtil.mjs";
import { getChainInfo } from '../../../../lib/common/defsUtil.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
export class DisconnectScreenComponentBase extends ScreenComponentBase {

    // 接続解除の確認ボタンが押された際の処理
    async onConfirmDisconnect() {

        // 接続を解除する。
        await this.disconnect();
        
        // ウォレット接続画面に遷移する。
        showScreen('connect');
    }

    // 接続解除のキャンセルボタンが押された際の処理
    async onCancelDisconnect() {
        
        // メイン画面に遷移する。
        showScreen('main');
    }

    // 接続を解除する関数
    async disconnect() {

        // 代理ウォレットの設定を解除する。
        await this.cancelProxyWallet();

        // ローカルストレージからウォレット情報を削除する。
        setLocalStorage('walletJSON', null);
        setLocalStorage('walletPassword', null);
    }

    // 代理ウォレットの設定を解除する関数
    async cancelProxyWallet() {

        // BC+のアンロックされたウォレットを取得する。
        // （unlockedWallet がセットされる。）
        await unlockWalletFromLocalStorage();

        // チェーン情報のIDを取得する。
        const chainInfoId = this.getChainInfoId();

        // チェーン情報を取得する。
        const chainInfo = await getChainInfo(chainInfoId);

        // BC+ に接続する。
        const rpc = await dbcpConnect(chainInfo.urls, chainInfo.chainId, unlockedWallet);

        // 代理ウォレットの設定を解除するためのコントラクト呼び出しを行う。
        const result = await dbcpCallContract(rpc, unlockedWallet, 'c1cancelwallet', []); 
    }

    // チェーン情報IDを取得する関数
    getChainInfoId() {
        // 子クラスで実装する。
    }

}



