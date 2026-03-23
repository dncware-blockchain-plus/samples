'use strict';

// 他のファイルからのインポート
import { setLocalStorage, getLocalStorage } from '../../localStorage.mjs';
import { makeNftNameMap } from '../../nftNameMap.mjs';
import { getSrcDstData } from '../../../../lib/common/defsUtil.mjs';
import { removeRedundantObjectInArray } from '../../../../lib/common/arrayUtil.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
export class EVMSrcSelectorScreenComponentBase extends ScreenComponentBase {

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // 画面を更新する。
        await this.update();
    }

    // 転送元のNFTコレクションの選択が変更された際に呼び出される関数
    async onChange() {

        // 転送元のチェーンをローカルストレージに保存する。
        const srcChainSelector = document.getElementById('src-chain');
        const selectedSrcChainInfoId = srcChainSelector.value;
        setLocalStorage('srcChainInfoId', selectedSrcChainInfoId);

        // 転送元のNFTコレクションをローカルストレージに保存する。
        const srcNftCollectionSelector = document.getElementById('src-nft-collection');
        const selectedSrcNFTAddr = srcNftCollectionSelector.value;
        setLocalStorage('srcNFTAddr', selectedSrcNFTAddr);

        // 表示を更新する。
        await this.update();
    }

    // 画面の更新を行う関数
    async update() {

        // 転送元のNFTコレクションの選択肢を更新する。
        await this.updateOptions();

        await super.update();
    }

    // 転送元のNFTコレクションの選択肢を更新する関数
    async updateOptions() {

        // 現在選択されている転送元のチェーン・NFTコレクションを取得する。
        const selectedSrcChainInfoId = getLocalStorage('srcChainInfoId');
        const selectedSrcNFTAddr = getLocalStorage('srcNFTAddr');

        // 転送元について選択可能なチェーンとNFTコレクションのリストを作る。
        const { selectableSrcChainInfoIds, selectableSrcNFTAddrs } = await this.makeSelectableSrcOptions(
            selectedSrcChainInfoId,
            selectedSrcNFTAddr
        );

        // 転送元のNFTコレクションのチェーン情報IDとＮＦＴアドレスのペアのリストを作成する。
        const srcDstData = await getSrcDstData();        
        const srcNftChainPairs = (!srcDstData || selectableSrcNFTAddrs === null || selectableSrcChainInfoIds === null)
            ? []
            : removeRedundantObjectInArray(
                srcDstData
                .filter(item => selectableSrcNFTAddrs.includes(item.srcNFTAddr))
                .map(item => ({
                    chainInfoId: item.srcChainInfoId,
                    nftAddrOrId: item.srcNFTAddr
                }))
            );

        // 転送元NFTコレクションの表示名を取得するためのマップを作る。
        const selectableSrcNFTNameMap = await makeNftNameMap(srcNftChainPairs);

        // 転送元のチェーン・NFTコレクションの選択用のセレクタを取得する。
        const srcChainSelector = document.getElementById('src-chain');
        const srcNftCollectionSelector = document.getElementById('src-nft-collection');

        // 既存の選択肢をクリアする。
        srcChainSelector.innerHTML = '';
        srcNftCollectionSelector.innerHTML = '';

        // 転送元のチェーンについて、デフォルトの選択肢をセットする。
        const srcDefaultOption = document.createElement('option');
        srcDefaultOption.value = '';
        srcDefaultOption.textContent = '-- 転送元のチェーンを選択してください --';
        srcChainSelector.appendChild(srcDefaultOption);

        // 転送元のNFTコレクションについて、デフォルトの選択肢をセットする。
        const srcDefaultNftOption = document.createElement('option');
        srcDefaultNftOption.value = '';
        srcDefaultNftOption.textContent = '-- 転送元のNFTコレクションを選択してください --';
        srcNftCollectionSelector.appendChild(srcDefaultNftOption);

        // 選択可能な転送元チェーンのリストがある場合は、選択肢を追加する。
        if(selectableSrcChainInfoIds) {
            for(const chainInfoId of selectableSrcChainInfoIds) {
                const option = document.createElement('option');
                option.value = chainInfoId;
                option.textContent = chainInfoId;
                if(chainInfoId === selectedSrcChainInfoId) {
                    option.selected = true;
                }
                srcChainSelector.appendChild(option);
            }
        }

        // 選択可能な転送元のNFTコレクションの選択肢がある場合は、選択肢を設定する。
        if(selectableSrcNFTAddrs) {
            for(const nftAddr of selectableSrcNFTAddrs) {
                const option = document.createElement('option');
                option.value = nftAddr;
                option.textContent = selectableSrcNFTNameMap[nftAddr] || nftAddr;
                if(nftAddr === selectedSrcNFTAddr) {
                    option.selected = true;
                }
                srcNftCollectionSelector.appendChild(option);
            }
        }
    }

    // 転送元について選択可能なチェーンとNFTコレクションのリストを作る関数
    async makeSelectableSrcOptions(selectedSrcChainInfoId, selectedSrcNFTAddr) {
        // 子クラスで実装する。
    }

}
