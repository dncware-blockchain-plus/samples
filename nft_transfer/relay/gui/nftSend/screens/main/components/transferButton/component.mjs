'use strict';

// 他のファイルからのインポート
import { getLocalStorage } from '../../../../../common/localStorage.mjs';
import { unlockedWallet } from '../../../../../common/bcplusUnlockedWallet.mjs';
import { reserveNFTsForTransfer } from '../../../../../../lib/transfer/bcplusToEvm/transferRelay.mjs';
import { getDefs } from '../../../../../../lib/common/defsUtil.mjs';


// 画面のコンポーネントの定義
import { ReserveTransferButtonScreenComponentBase } from '../../../../../common/components/bases/reserveTransferButtonBase.mjs';
class ReserveTransferButtonScreenComponent extends ReserveTransferButtonScreenComponentBase {

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);

        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }

    // 選択されたトークンを転送予約状態にする関数
    async reserveTransfer() {

        // 転送対象のトークンのIDのリストを取得する。
        const tokenIds = this.nftSelector.selectedTokenIds;
        await this.updateTransferButton();

        // 転送元・転送先のチェーン情報・NFTコレクションを取得する。
        const srcChainInfoId = getLocalStorage('srcChainInfoId');
        const srcNFTId = getLocalStorage('srcNFTId');
        const dstChainInfoId = getLocalStorage('dstChainInfoId');
        const dstNFTAddr = getLocalStorage('dstNFTAddrOrId');

        // 転送先のアドレスを取得する。
        const dstAddress = getLocalStorage('dstAddr');

        // 転送予約ボタンを無効化する。
        this.isButtonDisabled = true;
        await this.updateTransferButton();

        // トークンの一覧を取得する。
        const tokens = this.nftSelector.tokenLister.getTokens();

        // 選択されているトークンを転送する。
        try {
            await reserveNFTsForTransfer(
                unlockedWallet,
                srcChainInfoId, srcNFTId,
                tokenIds,
                dstChainInfoId, dstNFTAddr, dstAddress,
                tokens,
                this.updateNftList
            );
        } catch(e) {
            alert(e.message);
        }

        // すべてのトークンの選択を解除する。
        this.nftSelector.clearTokenSelection();

        // 転送予約ボタンを有効化する。
        this.isButtonDisabled = false;
    }

}
const component = new ReserveTransferButtonScreenComponent;
export default component;
