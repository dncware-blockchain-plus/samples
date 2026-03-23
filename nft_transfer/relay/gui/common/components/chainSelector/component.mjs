'use strict';

// 他のファイルからのインポート
import { getBcplusChainInfoIds } from "../../../../lib/common/defsUtil.mjs";


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
class AddressSelectorScreenComponent extends ScreenComponentBase {
    constructor() {
        super();

        // 選択されたBC+のチェーンの情報のID
        this.bcplusChainInfoId = null;
    }

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);

        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // この画面に遷移する際に、設定をリセットする。
        this.bcplusChainInfoId = null;

        // BC+のチェーンの一覧を更新する。
        await this.updateBcplusChainList();

        // 画面を更新する。
        await this.update();
    }

    // BC+のチェーンの選択が変更された際に呼び出される関数
    async onChange() {

        // 選択されたBC+のチェーンの情報のIDを取得する。
        const bcplusChainSelector = document.getElementById('bcplus-chain');
        this.bcplusChainInfoId = bcplusChainSelector.value;

        // 表示を更新する。
        await this.update();
    }

    // 画面の更新を行う関数
    async update() {

        // 選択されたBC+のチェーンの表示を更新する。
        await this.updateBcplusChainDisp();

        await super.update();
    }

    // 選択されたBC+のチェーンの表示を更新する関数
    async updateBcplusChainDisp() {
        const bcplusChainSelector = document.getElementById('bcplus-chain');
        bcplusChainSelector.value = this.bcplusChainInfoId;
    }

    // BC+のチェーンの一覧を更新する関数
    async updateBcplusChainList() {

        // BC+のチェーン情報のIDの一覧を取得する。
        const bcplusChainInfoIds = await getBcplusChainInfoIds();

        // BC+のチェーン情報の選択用のセレクタを取得する。
        const bcplusChainSelector = document.getElementById('bcplus-chain');

        // セレクタの内容をデフォルトの選択肢のみにする。
        bcplusChainSelector.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = null;
        defaultOption.textContent = '-- BC+のチェーンを選択してください --';
        bcplusChainSelector.appendChild(defaultOption);

        // BC+のチェーン情報のIDの一覧をセレクタに追加する。
        for(const chainId of bcplusChainInfoIds) {
            const option = document.createElement('option');
            option.value = chainId;
            option.textContent = chainId;
            bcplusChainSelector.appendChild(option);
        }
    }

}
const component = new AddressSelectorScreenComponent;
export default component;
