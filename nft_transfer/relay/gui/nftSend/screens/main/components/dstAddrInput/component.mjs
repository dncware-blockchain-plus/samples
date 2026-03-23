'use strict';

// 他のファイルからのインポート
import { setLocalStorage, getLocalStorage } from '../../../../../common/localStorage.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../../../lib/screen/screenManager.mjs'
class DstAddrInputScreenComponent extends ScreenComponentBase {

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);
        
        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // 転送先のアドレスの入力欄が変更された際に呼び出される関数
    async onChange() {

        // 転送先のアドレスを入力欄から取得する。
        const dstAddrInput = document.getElementById('dst-address');
        const dstAddr = dstAddrInput.value.trim();

        // 転送先のアドレスをローカルストレージに保存する。
        setLocalStorage('dstAddr', dstAddr);
    }

    // ウォレットアドレスを転送先アドレスに設定するボタンがクリックされた際に呼び出される関数
    async onSetWalletAddressAsDst() {

        // ウォレットアドレスを取得する。
        const evmWalletAddress = getLocalStorage('evmWalletAddress');

        // ウォレットアドレスを転送先アドレスに設定する。
        setLocalStorage('dstAddr', evmWalletAddress);

        // 表示を更新する。
        await this.updateDstAddrInput();
    }

    // 画面の更新を行う関数
    async update() {

        // 転送先のアドレスの表示を更新する。
        await this.updateDstAddrInput();
   
        await super.update();
    }

    // 転送先のアドレスの入力欄を更新する関数
    async updateDstAddrInput() {

        // 転送先のアドレスを取得する。
        const dstAddr = getLocalStorage('dstAddr') || '';

        // 転送先のアドレスの入力欄を取得する。
        const dstAddrInput = document.getElementById('dst-address');

        // 転送先のアドレスの入力欄に値を設定する。
        dstAddrInput.value = dstAddr;
    }

}
const component = new DstAddrInputScreenComponent;
export default component;
