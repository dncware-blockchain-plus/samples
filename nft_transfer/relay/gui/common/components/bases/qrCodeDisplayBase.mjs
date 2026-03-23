'use strict';

// 他のファイルからのインポート
import { generateWalletForChain } from '../../bcplusWalletGen.mjs';
import { checkProxySettings } from '../../checkProxySettings.mjs';
import { setLocalStorage } from '../../localStorage.mjs';
import { showScreen } from '../../../../lib/screen/screenManager.mjs';
import { getChainInfo } from '../../../../lib/common/defsUtil.mjs';

// ライブラリのインポート
import QRCode from 'qrcode';


// 代理設定ができているか否かの確認の周期
const pollingInterval = 1000; // 1秒ごとに確認する


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../../../lib/screen/screenManager.mjs'
export class QRCodeDisplayScreenComponentBase extends ScreenComponentBase {
    constructor() {
        super();

        // 代理アドレス設定用のJSON文字列
        this.proxyAddressJson = null;

        // 代理設定が行われたEVMウォレットアドレス
        this.evmWalletAddress = null;

        // 代理設定の確認のためのポーリングのID
        this.pollingIntervalId = null;

        // チェーン選択用コンポーネント
        this.chainSelector = null; // ※initで設定する。

        // 生成されたウォレットのデータ
        this.walletData = {}; // ※generateProxyJsonで設定する。
    }

    // 実体化後のコールバック関数
    async onReady() {
        super.onReady();

        // チェーン選択用コンポーネントを取得する。
        this.chainSelector = window.screens.connect.components.chainSelector;

        // BC+のチェーンの選択が変更された際のコールバックを登録する。
        const updateProc = () => this.update();
        this.chainSelector.updateCallbacks.push(updateProc);
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // 代理設定の定期的な確認を開始する。
        this.startPolling();

        // 画面を更新する。
        await this.update();
    }

    // 画面を非表示にする際に呼びだされる関数
    async onHide() {

        // 代理設定の定期的な確認を停止する。
        this.stopPolling();        
    }

    // 代理アドレスのJSON文字列をコピーする関数
    async onCopyProxyJson() {
        if(this.proxyAddressJson) {
            try {
                await navigator.clipboard.writeText(this.proxyAddressJson);
            } catch(error) {
                console.error('クリップボードへのコピーに失敗しました:', error);
            }
        }
    }

    // 画面の更新を行う関数
    async update() {

        // QRコードおよびそのテキスト表示を更新する。
        await this.updateQRCodeAndText();

        await super.update();
    }

    // QRコードとそのテキスト表示を更新する関数
    async updateQRCodeAndText() {

        // 代理設定用のJSON文字列を生成する。
        this.proxyAddressJson = await this.generateProxyJson();

        // 代理アドレス設定用のJSONデータの表示用のコンテナを取得する。
        const proxyJSONContainer = document.getElementById('proxy-json-container');

        // 代理設定用のJSON文字列が生成できる場合は、QRコードとボタンを表示する。
        if(this.proxyAddressJson) {
            proxyJSONContainer.style.display = 'block';

            // QRコードを生成・表示する。
            const proxyAddressQRContainer = document.getElementById('proxy-json-qr-container');
            proxyAddressQRContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, this.proxyAddressJson, undefined, function (error) {
                if(error) {
                    console.error('QRコードの生成に失敗しました:', error);
                }
            });
            proxyAddressQRContainer.appendChild(canvas);

        } else {
            // 代理設定用のJSON文字列が生成できない場合は、QRコードとボタンを隠す。
            proxyJSONContainer.style.display = 'none';
        }
    }

    // 代理設定用のJSON文字列を生成する関数
    async generateProxyJson() {
        let proxyJson = null;

        // 選択されたBC+のチェーンのチェーンIDを取得する。
        const chainID = await this.getBcplusChianId();

        // チェーンが選択されている場合は、代理設定用のJSON文字列を生成する。
        if(chainID) {

            // 選択されたチェーン用にウォレットを生成して記憶する。
            this.walletData = await generateWalletForChain(chainID);

            // クエリ・リード・ライトの全てを無制限とする。
            const access = {
                query: 'unlimited',
                read_tx: 'unlimited',
                write_tx: 'unlimited'
            };

            // 代理設定用のJSON文字列を生成する。
            proxyJson = JSON.stringify({
                ver: '1.0',
                chainID,
                trustee: this.walletData.unlockedWallet.address,
                access
            });
        }

        // 生成されたJSON文字列を返す。
        // 生成できなかった場合は null を返す。
        return proxyJson;
    }

    // 選択されたBC+のチェーンのチェーンIDを取得する関数
    async getBcplusChianId() {
        let bcplusChainId = null;
        if(this.chainSelector.bcplusChainInfoId) {
            const chainInfo = await getChainInfo(this.chainSelector.bcplusChainInfoId);
            bcplusChainId = chainInfo ? chainInfo.chainId : null;
        }
        return bcplusChainId;
    }

    // 代理設定の定期的な確認を開始する関数
    startPolling() {

        // 代理設定の確認を開始する。
        this.pollingIntervalId = setInterval(async () => {
            await this.pollProxySettings();
        }, pollingInterval);
    }

    // 代理設定の定期的な確認を停止する関数
    stopPolling() {
        if(this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }
    }

    // 代理設定ができているか確認し、確認できている場合は、接続されたウォレットの情報を保存して、メインの画面に遷移する関数
    async pollProxySettings() {

        // 代理設定ができているか確認する。
        const evmWalletAddress = await checkProxySettings(
            this.walletData.unlockedWallet,
            this.chainSelector.bcplusChainInfoId
        );

        // 代理設定ができている場合、
        if(evmWalletAddress) {
            
            // ローカルストレージにウォレットアドレス、BC+のチェーン情報ID、アンロックされたウォレットを保存する。
            setLocalStorage('evmWalletAddress', evmWalletAddress);
            this.setBcplusChainInfoId(this.chainSelector.bcplusChainInfoId);
            setLocalStorage('walletJSON', this.walletData.walletJSON);
            setLocalStorage('walletPassword', this.walletData.walletPassword);

            // メインの画面に遷移する。
            showScreen('main');
        }
    }

    // BC+のチェーン情報IDをセットする関数
    setBcplusChainInfoId(chainInfoId) {
        // 子クラスで実装する。
    }

}
