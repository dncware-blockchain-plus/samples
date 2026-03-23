'use strict';

// 他のファイルからのインポート
import { NftSelectorScreenComponentBase } from '../../../../../common/components/bases/nftSelectorBase.mjs';
import { TokenListerBCPlusToEVM } from '../../../../../common/tokenLister/tokenListerBCPlusToEVM.mjs';


// 画面のコンポーネントの定義
class NftSelectorScreenComponent extends NftSelectorScreenComponentBase {

    // コンストラクタ
    constructor() {
        super();

        // トークンをリストするオブジェクトを設定する。
        this.tokenLister = new TokenListerBCPlusToEVM();

        // 「転送予約済み」以降の状態の（burnedされた）トークンのみを表示するように設定する。
        this.onlyBurned = true;
    }

    // component.mjs の URL を取得する関数
    getComponentUrl() {
        return import.meta.url;
    }

    // 指定トークンについてチェックボックスを表示すべきか否かを判定する関数
    shouldShowCheckboxForToken(token) {
        return token.state === 'reserved';
    }

}
const component = new NftSelectorScreenComponent;
export default component;
