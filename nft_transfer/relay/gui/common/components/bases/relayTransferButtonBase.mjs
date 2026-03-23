'use strict';

// 他のファイルからのインポート
import { getDefs } from '../../../../lib/common/defsUtil.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
export class RelayTransferButtonScreenComponentBase extends ScreenComponentBase {
    constructor() {
        super();

        // ボタンの表示テキスト
        this.buttonText = '';

        // 転送ボタンを無効化中か否かのフラグ
        this.isButtonDisabled = false;

        // 定義情報
        this.defs = null; // ※initで設定

        // NFTセレクターのコンポーネント
        this.nftSelector = null; // ※initで設定

        // NFT一覧の表示を更新する関数
        this.updateNftList = null; // ※initで設定
    }

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);

        // 定義情報を取得する。
        this.defs = await getDefs();

        // NFTの選択用のコンポーネントを取得する。
        const components = window.screens.main.components;
        this.nftSelector = components.nftSelector;

        // NFT一覧の表示を更新する関数を取得する。
        this.updateNftList = (options = {}) => this.nftSelector.update(options);
        
        // NFTの一覧が更新された際に、表示を更新するコールバックを登録する。
        const updateProc = () => this.update();
        this.nftSelector.updateCallbacks.push(updateProc);

        // HTMLの読み込みは子クラスで行う。
    }

    // ボタンが押されたときに呼び出される関数
    async onButtonClick() {

        // 選択されたトークンを転送する。
        await this.transfer();
    }

    // 画面の更新を行う関数
    async update() {

        // 転送ボタンの表示状態を更新する。
        await this.updateTransferButton();        
    
        await super.update();
    }

    // 転送ボタンの表示状態を更新する関数
    async updateTransferButton() {

        // トークンが一つでも選択されているか否かを確認する。
        const anyTokenSelected = this.nftSelector.selectedTokenIds.length > 0;

        // 転送ボタンの表示名を特定する。
        this.buttonText = this.isButtonDisabled ? '転送中...' : '転送';

        // 転送ボタンの表示状態を更新する。
        const transferButton = document.getElementById('transfer-button');
        transferButton.textContent = this.buttonText;
        transferButton.style.display = anyTokenSelected ? 'block' : 'none';
        transferButton.disabled = this.isButtonDisabled;
    }

    // 選択されたトークンを転送する関数
    async transfer() {
        // 子クラスで実装する
    }

    // 転送ボタンを有効化する関数
    async enableTransferButton() {
        this.isButtonDisabled = false;
        await this.updateTransferButton();
    }
    
    // 転送ボタンを無効化する関数
    async disableTransferButton() {
        this.isButtonDisabled = true;
        await this.updateTransferButton();
    }

}
