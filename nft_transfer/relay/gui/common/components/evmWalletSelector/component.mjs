'use strict';

// 他のファイルからのインポート
import { setLocalStorage, getLocalStorage } from '../../localStorage.mjs';
import { evmSelectProvider, evmGetProviders, evmGetWalletAddresses } from '../../../../lib/evm/browserEvmUtil.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
class EvmWalletSelectorScreenComponent extends ScreenComponentBase {
    constructor() {
        super();

        // 選択中のウォレットについて生成した Web3 オブジェクト
        this.web3 = null;
    }

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);

        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // ウォレットの選択が変更された際に呼び出される関数
    async onWalletChange() {

        // 選択されたウォレットを取得して、ローカルストレージに保存する。
        const evmWalletSelect = document.getElementById('evm-wallet');
        setLocalStorage('selectedEvmWalletName', evmWalletSelect.value);

        // Web3のオブジェクトを生成する。
        await this.updateWeb3Object();

        // 表示を更新する。
        await this.update();
    }

    // ウォレットアドレスの選択が変更された際に呼び出される関数
    async onWalletAddressChange() {

        // 選択されたウォレットアドレスを取得して、ローカルストレージに保存する。
        const evmAddressSelector = document.getElementById('evm-wallet-address');
        setLocalStorage('selectedEvmWalletAddress', evmAddressSelector.value);

        // 表示を更新する。
        await this.update();
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // EVMウォレットの一覧をリストボックスに設定する。
        await this.setupWalletList();


        // 画面を更新する。
        await this.update();
    }

    // 画面の更新を行う関数
    async update() {

        // 選択されたウォレットの表示を更新する。
        await this.updateSelectedWallet();

        // Web3のオブジェクトを更新する。
        await this.updateWeb3Object();

        // ウォレットアドレスの選択用のＵＩの表示状態を更新する。
        await this.updateWalletAddressUIVisibility();

        // ウォレットアドレスの一覧を更新する。
        await this.updateWalletAddressOptions();

        // 選択されたウォレットアドレスの表示を更新する。
        await this.updateSelectedWalletAddress();

        await super.update();
    }

    // 選択されたウォレットの表示を更新する関数
    async updateSelectedWallet() {

        // ローカルストレージから選択されたウォレットを取得する。
        const selectedWalletName = getLocalStorage('selectedEvmWalletName');

        // 値が一致するウォレットをリストボックスから選択する。
        const evmWalletSelect = document.getElementById('evm-wallet');
        const index = Array.from(evmWalletSelect.options).findIndex(option => option.value === selectedWalletName);
        if(index !== -1) {
            evmWalletSelect.selectedIndex = index;
        }
    }

    // ウォレットアドレスの選択用のＵＩの表示状態を更新する関数
    async updateWalletAddressUIVisibility() {

        // ローカルストレージから選択されたウォレットを取得する。
        const selectedWalletName = getLocalStorage('selectedEvmWalletName');

        // ウォレットアドレスの選択用のＵＩを取得する。
        const evmAddressSelectorContainer = document.getElementById('evm-wallet-address-container');

        // ウォレットが選択されている場合は表示し、そうでない場合は非表示にする。
        if(selectedWalletName) {
            evmAddressSelectorContainer.style.display = 'block';
        } else {
            evmAddressSelectorContainer.style.display = 'none';
        }
    }

    // ウォレットアドレスの一覧を更新する関数
    async updateWalletAddressOptions() {

        // ウォレットアドレスの一覧を取得する。
        const evmWalletAddresses = await evmGetWalletAddresses(this.web3);

        // ウォレットアドレスの選択用のリストボックスを取得する。
        const evmAddressSelector = document.getElementById('evm-wallet-address');

        // リストボックスにウォレットアドレスの一覧を設定する。
        evmAddressSelector.innerHTML = ''; // 既存のオプションをクリア
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- ウォレットアドレスを選択してください --';
        evmAddressSelector.appendChild(defaultOption);

        // ウォレットアドレスの一覧をリストボックスに追加する。
        for(const address of evmWalletAddresses) {
            const option = document.createElement('option');
            option.value = address;
            option.textContent = address;
            evmAddressSelector.appendChild(option);
        }
    }

    // 選択されたウォレットアドレスの表示を更新する関数
    async updateSelectedWalletAddress() {

        // ローカルストレージから選択されたウォレットアドレスを取得する。
        const evmWalletAddress = getLocalStorage('selectedEvmWalletAddress');

        // ウォレットアドレスの選択用のリストボックスを取得する。
        const evmAddressSelector = document.getElementById('evm-wallet-address');

        // 値が一致するウォレットアドレスをリストボックスから選択する。
        const index = Array.from(evmAddressSelector.options).findIndex(option => option.value === evmWalletAddress);
        if(index !== -1) {
            evmAddressSelector.selectedIndex = index;
        }
    }

    // EVMウォレットの一覧をリストボックスに設定する関数
    async setupWalletList() {

        // EVMプロバイダの一覧を取得する。
        const evmProviders = await evmGetProviders();

        // ウォレットのリストボックスを取得する。
        const evmWalletSelect = document.getElementById('evm-wallet');

        // デフォルトの選択肢を追加する。
        evmWalletSelect.innerHTML = ''; // 既存のオプションをクリア
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- ウォレットを選択してください --';
        evmWalletSelect.appendChild(defaultOption);

        // リストボックスにEVMプロバイダの一覧を設定する。
        for(const value of evmProviders.values()) {
            const option = document.createElement('option');
            const name = value.info.name;
            option.value = name;
            option.textContent = name;
            evmWalletSelect.appendChild(option);
        }
    }

    // Web3のオブジェクトを更新する関数
    async updateWeb3Object() {

        // ローカルストレージから選択されたウォレットを取得する。
        const selectedWalletName = getLocalStorage('selectedEvmWalletName');

        // ウォレットが選択されていない場合は null をセットする。
        let newWeb3 = null;
        if(selectedWalletName) {

            // 選択されたウォレットのプロバイダを取得する。
            const provider = await this.getEvmProvider(selectedWalletName);

            // 当該プロバイダが見つかった場合は、Web3のオブジェクトを生成する。
            if(provider) {
                newWeb3 = await evmSelectProvider(provider);
            }
        }

        // Web3のオブジェクトを設定する。
        this.web3 = newWeb3;
    }

    // 選択されているEVMプロバイダを取得する関数
    async getEvmProvider(walletName) {

        // EVMプロバイダの一覧を取得する。
        const evmProviders = await evmGetProviders();

        // 指定されたウォレット名に一致するEVMプロバイダを検索して返す。
        const providerRecord = evmProviders.values().find(providerRecord => providerRecord.info.name === walletName);
        return providerRecord.provider;
    }

}
const component = new EvmWalletSelectorScreenComponent;
export default component;
