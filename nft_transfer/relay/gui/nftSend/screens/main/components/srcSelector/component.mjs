'use strict';

// 他のファイルからのインポート
import { setLocalStorage, getLocalStorage } from '../../../../../common/localStorage.mjs';
import { updateSrcUserId } from '../../../../../common/bcplusUserUtil.mjs';
import { getSrcDstData } from '../../../../../../lib/common/defsUtil.mjs';
import { removeRedundantObjectInArray } from '../../../../../../lib/common/arrayUtil.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../../../lib/screen/screenManager.mjs'
class SrcSelectorScreenComponent extends ScreenComponentBase {

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);

        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // 転送元ユーザの設定を更新する。
        await updateSrcUserId();

        // 画面を更新する。
        await this.update();
    }

    // 転送元のNFTコレクションの選択が変更された際に呼び出される関数
    async onChange() {

        // 転送元のNFTコレクションをローカルストレージに保存する。
        const srcNftCollectionSelector = document.getElementById('src-nft-collection');
        const selectedSrcNFTId = srcNftCollectionSelector.value;
        setLocalStorage('srcNFTId', selectedSrcNFTId);

        // 表示を更新する。
        await this.update();

        // 転送先の選択肢を更新する。
        await window.screens.main.components.dstSelector.update();
    }

    // 画面の更新を行う関数
    async update() {

        // 転送元のNFTコレクションの選択肢を更新する。
        await this.updateOptions();

        await super.update();
    }

    // 転送元のNFTコレクションの選択肢を更新する関数
    async updateOptions() {

        // 現在選択されている転送元・転送先のチェーン・NFTコレクションを取得する。
        const selectedSrcChainInfoId = getLocalStorage('srcChainInfoId');
        const selectedSrcNFTId = getLocalStorage('srcNFTId');
        const selectedDstChainInfoId = getLocalStorage('dstChainInfoId');
        const selectedDstNFTAddr = getLocalStorage('dstNFTAddrOrId');

        // 転送元のチェーンの表示用のテキストボックスを取得する。
        const srcChainElement = document.getElementById('src-chain');
        srcChainElement.value = selectedSrcChainInfoId || '転送元のチェーンが選択されていません';

        // 転送元のNFTコレクションの選択用のセレクタを取得する。
        const srcNftCollectionSelector = document.getElementById('src-nft-collection');

        // 既存の選択肢をクリアする。
        srcNftCollectionSelector.innerHTML = '';

        // 転送元のNFTコレクションについて、デフォルトの選択肢をセットする。
        const defaultNftOption = document.createElement('option');
        defaultNftOption.value = '';
        defaultNftOption.textContent = '-- 転送元のNFTコレクションを選択してください --';
        srcNftCollectionSelector.appendChild(defaultNftOption);

        // 転送元と転送先のデータを取得する。
        const srcDstData = await getSrcDstData();
        if(srcDstData) {
            // 取得できた場合は、転送元のチェーンの選択肢を設定する。
            
            // 選択可能な転送元NFTコレクションのリストを作る。
            const selectableSrcNFTIds = removeRedundantObjectInArray(
                srcDstData
                .filter(item => !selectedSrcChainInfoId || (item.srcChainInfoId === selectedSrcChainInfoId))
                .filter(item => !selectedDstChainInfoId || (item.dstChainInfoId === selectedDstChainInfoId))
                .filter(item => !selectedDstNFTAddr || (item.dstNFTAddr === selectedDstNFTAddr))
                .map(item => item.srcNFTId)
            );

            // 転送元のNFTコレクションの選択肢を設定する。
            for(const nftId of selectableSrcNFTIds) {
                const option = document.createElement('option');
                option.value = nftId;
                option.textContent = nftId;
                if(nftId === selectedSrcNFTId) {
                    option.selected = true;
                }
                srcNftCollectionSelector.appendChild(option);
            }
        }
    }

}
const component = new SrcSelectorScreenComponent;
export default component;
