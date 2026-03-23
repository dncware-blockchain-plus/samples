'use strict';

// 他のファイルからのインポート
import { getLocalStorage } from "../../localStorage.mjs";


// 画面のコンポーネントの定義
import { DisconnectScreenComponentBase } from "../bases/disconnectBase.mjs";
class DisconnectSrcScreenComponent extends DisconnectScreenComponentBase {

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);
        
        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // チェーン情報IDを取得する関数
    getChainInfoId() {
        return getLocalStorage('srcChainInfoId');
    }

}
const component = new DisconnectSrcScreenComponent;
export default component;
