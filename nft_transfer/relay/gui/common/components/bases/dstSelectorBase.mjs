'use strict';

// 他のファイルからのインポート
import { setLocalStorage } from '../../localStorage.mjs';


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
export class DstSelectorScreenComponentBase extends ScreenComponentBase {
    constructor() {
        super();
    }

    // 画面の更新を行う関数
    async update() {

        // 転送元のNFTコレクションの選択肢を更新する。
        await this.updateOptions();

        await super.update();
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // 転送先のチェーンに接続する。
        await this.connectToDstChain();

        // 画面を更新する。
        await this.update();
    }

    // 転送先のチェーン・NFTコレクションの選択が変更された際に呼び出される関数
    async onChange() {

        // 転送先のチェーンをローカルストレージに保存する。
        const dstChainSelector = document.getElementById('dst-chain');
        const selectedDstChainInfoId = dstChainSelector.value;
        setLocalStorage('dstChainInfoId', selectedDstChainInfoId);

        // 転送先のNFTコレクションをローカルストレージに保存する。
        const dstNftCollectionSelector = document.getElementById('dst-nft-collection');
        const selectedDstNFTAddr = dstNftCollectionSelector.value;
        setLocalStorage('dstNFTAddrOrId', selectedDstNFTAddr);

        // 転送先のチェーンに接続する。
        await this.connectToDstChain();

        // 表示を更新する。
        await this.update();

        // 転送元の選択肢を更新する。
        await window.screens.main.components.srcSelector.update();
    }

    // 転送元のチェーンとNFTコレクションの選択肢を更新する関数
    async updateOptions() {
        // 子クラスで実装する。
    }

    // 転送先のチェーンについて選択肢をセットする関数
    setDstChainOptions(selectableDstChainInfoIds, selectedDstChainInfoId) {

        // 転送先のチェーンの選択用のセレクタを取得する。
        const dstChainSelector = document.getElementById('dst-chain');

        // 既存の選択肢をクリアする。
        dstChainSelector.innerHTML = '';

        // 転送先のチェーンについて、デフォルトの選択肢をセットする。
        const dstDefaultOption = document.createElement('option');
        dstDefaultOption.value = '';
        dstDefaultOption.textContent = '-- 転送先のチェーンを選択してください --';
        dstChainSelector.appendChild(dstDefaultOption);

        // 選択可能な転送先チェーンのリストがある場合は、選択肢を追加する。
        if(selectableDstChainInfoIds) {
            for(const chainInfoId of selectableDstChainInfoIds) {
                const option = document.createElement('option');
                option.value = chainInfoId;
                option.textContent = chainInfoId;
                if(chainInfoId === selectedDstChainInfoId) {
                    option.selected = true;
                }
                dstChainSelector.appendChild(option);
            }
        }
    }

    // 転送先のNFTコレクションについて選択肢をセットする関数
    setDstNftCollectionOptions(selectableDstNFTAddrOrIds, selectableDstNFTNameMap, selectedDstNFTAddrOrId) {
        
        // 転送先のNFTコレクションの選択用のセレクタを取得する。
        const dstNftCollectionSelector = document.getElementById('dst-nft-collection');

        // 既存の選択肢をクリアする。
        dstNftCollectionSelector.innerHTML = '';

        // 転送先のNFTコレクションについて、デフォルトの選択肢をセットする。
        const dstDefaultNftOption = document.createElement('option');
        dstDefaultNftOption.value = '';
        dstDefaultNftOption.textContent = '-- 転送先のNFTコレクションを選択してください --';
        dstNftCollectionSelector.appendChild(dstDefaultNftOption);

        // 選択可能な転送先のNFTコレクションの選択肢がある場合は、選択肢を設定する。
        if(selectableDstNFTAddrOrIds) {
            for(const nftAddr of selectableDstNFTAddrOrIds) {
                const option = document.createElement('option');
                option.value = nftAddr;
                option.textContent = selectableDstNFTNameMap[nftAddr] || nftAddr;
                if(nftAddr === selectedDstNFTAddrOrId) {
                    option.selected = true;
                }
                dstNftCollectionSelector.appendChild(option);
            }
        }
    }

    // 転送先のチェーンに接続する関数
    async connectToDstChain() {
        // 子クラスで実装する。
    }

}
