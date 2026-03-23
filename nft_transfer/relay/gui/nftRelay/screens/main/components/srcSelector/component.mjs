'use strict';

// 他のファイルからのインポート
import { setLocalStorage, getLocalStorage } from '../../../../../common/localStorage.mjs';
import { generateWalletForChain } from '../../../../../common/bcplusWalletGen.mjs';
import { setUnlockedWallet } from '../../../../../common/bcplusUnlockedWallet.mjs';
import { getSrcDstData, getChainInfo, getDefs } from '../../../../../../lib/common/defsUtil.mjs';
import { removeRedundantObjectInArray } from '../../../../../../lib/common/arrayUtil.mjs';
import { getUserList } from '../../../../../common/bcplusUserUtil.mjs';


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

    // 画面の更新を行う関数
    async update() {

        // 転送元のチェーンとNFTコレクションの選択肢を更新する。
        await this.updateOptionsForSrcChainAndNft();

        // アンロック済みのウォレットを更新する。
        await this.updateUnlockedWallet();

        // 転送元のユーザの選択肢を更新する。
        await this.updateOptionsForUsers();

        await super.update();
    }

    // 転送元のチェーンの選択が変更された際に呼び出される関数
    async onChangeChain() {

        // 転送元のチェーンをローカルストレージに保存する。
        const srcChainSelector = document.getElementById('src-chain');
        const selectedSrcChainInfoId = srcChainSelector.value;
        setLocalStorage('srcChainInfoId', selectedSrcChainInfoId);

        // アンロック済みのウォレットを更新する。
        await this.updateUnlockedWallet();

        // 表示を更新する。
        await this.update();

        // NFTコレクションとユーザの選択肢を更新する。
        await this.update();
    }

    // 転送元・転送先のチェーン・NFTコレクションの選択が変更された際に呼び出される関数
    async onChangeNftCollection() {

        // 転送元のNFTコレクションをローカルストレージに保存する。
        const srcNftCollectionSelector = document.getElementById('src-nft-collection');
        const selectedSrcNFTId = srcNftCollectionSelector.value;
        setLocalStorage('srcNFTId', selectedSrcNFTId);

        // 表示を更新する。
        await this.update();

        // チェーンの選択肢を更新する。
        await this.update();
    }

    // 転送元のユーザの選択が変更された際に呼び出される関数
    async onChangeSrcUser() {

        // 転送元のユーザをローカルストレージに保存する。
        const userSelector = document.getElementById('srcUser');
        const selectedUserId = userSelector.value;
        setLocalStorage('srcUserId', selectedUserId);

        // 表示を更新する。
        await this.update();
    }

    // アンロック済みのウォレットを更新する関数
    async updateUnlockedWallet() {

        // 転送元のチェーンを取得する。
        const srcChainInfoId = getLocalStorage('srcChainInfoId');

        // 選択したチェーンのチェーンIDを取得する。
        const chainId = srcChainInfoId ? (await getChainInfo(srcChainInfoId)).chainId : null;

        // BC+の一時ウォレットを生成する。
        const walletData = await generateWalletForChain(chainId);

        // アンロック済みのウォレットを記憶する。
        setUnlockedWallet(walletData.unlockedWallet);
    }

    // 転送元のチェーンとNFTコレクションの選択肢を更新する関数
    async updateOptionsForSrcChainAndNft() {

        // 現在選択されている転送元のチェーン・NFTコレクションを取得する。
        const selectedSrcChainInfoId = getLocalStorage('srcChainInfoId');
        const selectedSrcNFTId = getLocalStorage('srcNFTId');

        // 転送元のチェーン・NFTコレクションの選択用のセレクタを取得する。
        const srcChainSelector = document.getElementById('src-chain');
        const srcNftCollectionSelector = document.getElementById('src-nft-collection');

        // チェーンの定義を取得する。
        const defs = await getDefs();
        const chainDef = defs.chainDef;

        // 既存の選択肢をクリアする。
        srcChainSelector.innerHTML = '';
        srcNftCollectionSelector.innerHTML = '';

        // 転送元のチェーンについて、デフォルトの選択肢をセットする。
        const defaultChainOption = document.createElement('option');
        defaultChainOption.value = '';
        defaultChainOption.textContent = '-- 転送元のチェーンを選択してください --';
        srcChainSelector.appendChild(defaultChainOption);

        // 転送元のNFTコレクションについて、デフォルトの選択肢をセットする。
        const defaultNftOption = document.createElement('option');
        defaultNftOption.value = '';
        defaultNftOption.textContent = '-- 転送元のNFTコレクションを選択してください --';
        srcNftCollectionSelector.appendChild(defaultNftOption);

        // 転送元のデータを取得する。
        const srcDstData = await getSrcDstData();
        if(srcDstData) {
            // 取得できた場合は、転送元のチェーンの選択肢を設定する。

            // 転送元がBC+チェーンのものに絞り込む。
            const bcplusSrcDstData = removeRedundantObjectInArray(
                srcDstData
                .filter(item => chainDef.find(chain => chain.id === item.srcChainInfoId)?.type === 'BC+')
            );

            // 選択可能な転送元チェーンのリストを作る。
            const selectableSrcChainInfoIds = removeRedundantObjectInArray(
                bcplusSrcDstData
                .filter(item => !selectedSrcNFTId || (item.srcNFTId === selectedSrcNFTId))
                .map(item => item.srcChainInfoId)
            );
            
            // 選択可能な転送元NFTコレクションのリストを作る。
            const selectableSrcNFTIds = removeRedundantObjectInArray(
                bcplusSrcDstData
                .filter(item => !selectedSrcChainInfoId || (item.srcChainInfoId === selectedSrcChainInfoId))
                .map(item => item.srcNFTId)
            );

            // 転送元のチェーンの選択肢を設定する。
            for(const chainInfoId of selectableSrcChainInfoIds) {
                const option = document.createElement('option');
                option.value = chainInfoId;
                option.textContent = chainInfoId;
                if(chainInfoId === selectedSrcChainInfoId) {
                    option.selected = true;
                }
                srcChainSelector.appendChild(option);
            }

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

    // 転送元のユーザの選択肢を更新する関数
    async updateOptionsForUsers() {

        // 現在選択されている転送元チェーンとユーザを取得する。
        const selectedSrcChainInfoId = getLocalStorage('srcChainInfoId');
        const selectedUserId = getLocalStorage('srcUserId');

        // 転送元のユーザの選択用のセレクタを取得する。
        const srcUserSelector = document.getElementById('srcUser');

        // 既存の選択肢をクリアする。
        srcUserSelector.innerHTML = '';

        // ユーザについて、デフォルトの選択肢をセットする。
        const defaultSrcUserOption = document.createElement('option');
        defaultSrcUserOption.value = '';
        defaultSrcUserOption.textContent = '-- 転送元のユーザを選択してください --';
        srcUserSelector.appendChild(defaultSrcUserOption);

        // 選択可能なユーザのリストを取得する。
        const selectableSrcUsers = await getUserList(selectedSrcChainInfoId);

        // 転送元のユーザの選択肢を設定する。
        for(const user of selectableSrcUsers) {
            const option = document.createElement('option');
            option.value = user.id[0];
            option.textContent = user.id[1];
            if(user.id.includes(selectedUserId)) {
                option.selected = true;
            }
            srcUserSelector.appendChild(option);
        }
    }

}
const component = new SrcSelectorScreenComponent;
export default component;
