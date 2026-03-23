'use strict';

// 他のファイルからのインポート
import { getLocalStorage } from '../../../../../common/localStorage.mjs';
import { evmConnect } from '../../../../../../lib/evm/evmUtil.mjs';
import { getChainInfo } from '../../../../../../lib/common/defsUtil.mjs';
import { makeNftNameMap } from '../../../../../common/nftNameMap.mjs';
import { removeRedundantObjectInArray } from '../../../../../../lib/common/arrayUtil.mjs';
import { getSrcDstData, getDefs } from '../../../../../../lib/common/defsUtil.mjs';


// 画面のコンポーネントの定義
import { DstSelectorScreenComponentBase } from '../../../../../common/components/bases/dstSelectorBase.mjs'
class DstSelectorScreenComponent extends DstSelectorScreenComponentBase {
    constructor() {
        super();

        // Web3のオブジェクト
        this.web3 = null;
    }

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);
        
        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // 転送先のチェーンに接続する関数
    async connectToDstChain() {

        // 転送先のチェーン情報のIDを取得する。
        const dstChainInfoId = getLocalStorage('dstChainInfoId');

        // 転送先のチェーンが指定されている場合は、
        if(dstChainInfoId) {

            // 転送先のチェーン情報を取得する。
            const dstChainInfo = await getChainInfo(dstChainInfoId);

            // 転送先のチェーンに接続する。
            this.web3 = evmConnect(dstChainInfo.urls);

        } else {
            // 転送先のチェーンが指定されていない場合は、Web3オブジェクトをnullに設定する。
            this.web3 = null;
        }
    }

    // 転送元のチェーンとNFTコレクションの選択肢を更新する関数
    async updateOptions() {

        // 現在選択されている転送元・転送先のチェーン・NFTコレクションを取得する。
        const selectedSrcChainInfoId = getLocalStorage('srcChainInfoId');
        const selectedSrcNFTId = getLocalStorage('srcNFTId');
        const selectedDstChainInfoId = getLocalStorage('dstChainInfoId');
        const selectedDstNFTAddr = getLocalStorage('dstNFTAddrOrId');

        // チェーンの定義を取得する。
        const defs = await getDefs();
        const chainDef = defs.chainDef;

        // 転送先について選択可能なチェーンとNFTコレクションのリスト
        let selectableDstChainInfoIds = null;
        let selectableDstNFTAddrs = null;

        // 転送元と転送先のデータを取得する。
        // 取得できない場合は、転送先について選択可能なチェーンとNFTコレクションのリストは null のままとする。
        const srcDstData = await getSrcDstData();
        if(srcDstData) {
            // 取得できた場合は、転送元のチェーンの選択肢を設定する。

            // 転送元がBC+チェーンのものに絞り込む。
            const bcplusSrcDstData = removeRedundantObjectInArray(
                srcDstData
                .filter(item => chainDef.find(chain => chain.id === item.srcChainInfoId)?.type === 'BC+')
            );

            // 選択可能な転送先チェーンのリストを作る。
            selectableDstChainInfoIds = removeRedundantObjectInArray(
                bcplusSrcDstData
                .filter(item => !selectedSrcChainInfoId || (item.srcChainInfoId === selectedSrcChainInfoId))
                .filter(item => !selectedSrcNFTId || (item.srcNFTId === selectedSrcNFTId))
                .filter(item => !selectedDstNFTAddr || (item.dstNFTAddr === selectedDstNFTAddr))
                .map(item => item.dstChainInfoId)
            );

            // 選択可能な転送先NFTコレクションのリストを作る。
            selectableDstNFTAddrs = removeRedundantObjectInArray(
                bcplusSrcDstData
                .filter(item => !selectedSrcChainInfoId || (item.srcChainInfoId === selectedSrcChainInfoId))
                .filter(item => !selectedSrcNFTId || (item.srcNFTId === selectedSrcNFTId))
                .filter(item => !selectedDstChainInfoId || (item.dstChainInfoId === selectedDstChainInfoId))
                .map(item => item.dstNFTAddr)
            );
        }

        // 転送先のNFTコレクションのチェーン情報IDとアドレスのペアのリストを作成する。        
        const dstNftChainPairs = (selectableDstNFTAddrs === null || selectableDstChainInfoIds === null)
            ? []
            : removeRedundantObjectInArray(
                srcDstData
                .filter(item => selectableDstNFTAddrs.includes(item.dstNFTAddr))
                .map(item => ({
                    chainInfoId: item.dstChainInfoId,
                    nftAddrOrId: item.dstNFTAddr
                }))
            );

        // 転送先NFTコレクションの表示名を取得するためのマップを作る。
        const selectableDstNFTNameMap = await makeNftNameMap(dstNftChainPairs);

        // 転送先のチェーンについて選択肢をセットする。
        this.setDstChainOptions(selectableDstChainInfoIds, selectedDstChainInfoId);

        // 転送先のNFTコレクションについて選択肢をセットする。
        this.setDstNftCollectionOptions(selectableDstNFTAddrs, selectableDstNFTNameMap, selectedDstNFTAddr);
    }

}
const component = new DstSelectorScreenComponent;
export default component;
