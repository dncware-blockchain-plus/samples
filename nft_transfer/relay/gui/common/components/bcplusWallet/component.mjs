'use strict';

// 他のファイルからのインポート
import { getLocalStorage } from '../../localStorage.mjs';


// 画面のコンポーネントの定義
import { WalletScreenComponentBase } from '../bases/walletBase.mjs'
class SrcWalletScreenComponent extends WalletScreenComponentBase {

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);
        
        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // チェン情報のIDを取得する関数
    async getChainInfoId() {
        const srcChainInfoId = getLocalStorage('srcChainInfoId');
        return srcChainInfoId;
    }

}
const component = new SrcWalletScreenComponent;
export default component;
