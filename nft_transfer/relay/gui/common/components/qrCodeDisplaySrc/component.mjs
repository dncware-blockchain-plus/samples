'use strict';

// 他のファイルからのインポート
import { setLocalStorage } from '../../localStorage.mjs';


// 画面のコンポーネントの定義
import { QRCodeDisplayScreenComponentBase } from '../bases/qrCodeDisplayBase.mjs'
class QRCodeDisplayScreenComponentSrc extends QRCodeDisplayScreenComponentBase {

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);

        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // BC+のチェーン情報IDをセットする関数
    setBcplusChainInfoId(chainInfoId) {
        setLocalStorage('srcChainInfoId', chainInfoId);
    }

}
const component = new QRCodeDisplayScreenComponentSrc();
export default component;
