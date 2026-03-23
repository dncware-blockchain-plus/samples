'use strict';

// 他のファイルからのインポート
import { getLocalStorage } from '../../localStorage.mjs';
import { showScreen } from '../../../../lib/screen/screenManager.mjs';
import { unlockWalletFromLocalStorage } from '../../bcplusUnlockedWallet.mjs';
import { dbcpConnect, dbcpGetWalletUser } from '../../../../lib/bcplus/bcplusUtil.mjs';
import { unlockedWallet } from '../../bcplusUnlockedWallet.mjs';
import { getChainInfo } from '../../../../lib/common/defsUtil.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
export class WalletScreenComponentBase extends ScreenComponentBase {
    constructor() {
        super();

        // 選択されたウォレットアドレス
        this.evmWalletAddress = null;

        // ウォレットアドレスに対応するユーザ名
        this.userName = null;
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // BC+のアンロックされたウォレットを取得してグローバル変数にセットする。
        // （unlockedWallet がセットされる。）
        await unlockWalletFromLocalStorage();

        // 選択されたウォレットアドレスを取得する。
        // （evmWalletAddress がセットされる。）
        await this.getEvmWalletAddress();

        // ウォレットに対応するユーザ名を取得する。
        await this.getUserNameForWallet();

        // 画面を更新する。
        await this.update();
    }

    // 画面を非表示にする際に呼びだされる関数
    async onHide() {
    }

    // 画面の更新を行う関数
    async update() {
    
        // ウォレットアドレスの表示を更新する。
        const walletAddressElement = document.getElementById('wallet-address');
        walletAddressElement.value = this.evmWalletAddress || 'ウォレットアドレスが選択されていません';
        
        // ユーザ名の表示を更新する。
        // ユーザ名が取得できない場合は、不可視化する。
        const walletAddressContainer = document.getElementById('wallet-address-container');
        if(this.userName) {
            const userNameElement = document.getElementById('user-name');
            userNameElement.value = this.userName;
            walletAddressContainer.style.display = 'block';            
        } else {
            walletAddressContainer.style.display = 'none';            
        }

        await super.update();
    }

    // 接続解除のボタンが押された際の処理
    async onDisconnect() {
        
        // 接続解除の確認画面に遷移する。
        showScreen('disconnect');
    }

    // 選択されたウォレットアドレスを取得してメンバ変数にセットする関数
    async getEvmWalletAddress() {

        // ローカルストレージから選択されたウォレットアドレスを取得する。
        this.evmWalletAddress = getLocalStorage('evmWalletAddress');
    }

    // ウォレットアドレスに対応するユーザ名を取得してメンバ変数にセットする関数
    async getUserNameForWallet() {

        // チェーン情報のIDを取得する。
        const chainInfoId = await this.getChainInfoId();

        // チェーン情報のIDが指定されていない場合は、ユーザ名の取得結果を null とする。
        let userName = null;
        if(chainInfoId) {

            // チェーン情報を取得する。
            const chainInfo = await getChainInfo(chainInfoId);
        
            // BC+ に接続する。
            const rpc = await dbcpConnect(chainInfo.urls, chainInfo.chainId, unlockedWallet);
            
            // ユーザIDとユーザ名を含む配列を取得する。
            const uids = await dbcpGetWalletUser(rpc, unlockedWallet);

            // ユーザ名を取得する。
            userName = uids[1];
        }

        // ウォレットアドレスに対応するユーザ名を取得する。
        this.userName = userName;
    }

    // チェン情報のIDを取得する関数
    async getChainInfoId() {
        // 子クラスで実装する
    }

}
