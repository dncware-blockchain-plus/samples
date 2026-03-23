'use strict';

// 他のファイルからのインポート
import { getLocalStorage } from '../../../../../common/localStorage.mjs';
import { unlockedWallet } from '../../../../../common/bcplusUnlockedWallet.mjs';
import { sendNFTsReservedForTransfer } from '../../../../../../lib/transfer/bcplusToEvm/transferRelay.mjs';


// 画面のコンポーネントの定義
import { RelayTransferButtonScreenComponentBase } from '../../../../../common/components/bases/relayTransferButtonBase.mjs'
class TransferButtonScreenComponent extends RelayTransferButtonScreenComponentBase {

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);

        // HTMLを読み込む。
        this.html = await this.getHTML(import.meta.url);
    }
    
    // 選択されたトークンを転送する関数
    async transfer() {

        // ウォレット・ウォレットアドレス選択用のコンポーネントを取得する。
        const evmWalletSelector = window.screens.main.components.evmWalletSelector;

        // Web3のオブジェクトを取得する。
        const web3 = evmWalletSelector.web3;

        // ローカルストレージから選択されたウォレットアドレスを取得する。
        const evmWalletAddress = getLocalStorage('selectedEvmWalletAddress');

        // 転送対象のトークンのIDのリストを取得する。
        const tokenIds = this.nftSelector.selectedTokenIds;
        await this.updateTransferButton();

        // 転送元のチェーン情報・NFTコレクションを取得する。
        const srcChainInfoId = getLocalStorage('srcChainInfoId');
        const srcNFTId = getLocalStorage('srcNFTId');

        // 転送ボタンを無効化する。
        this.disableTransferButton();

        // トークンの一覧を取得する。
        const tokens = this.nftSelector.tokenLister.getTokens();

        // 選択されているトークンを転送する。
        try {
            await sendNFTsReservedForTransfer(
                unlockedWallet,
                web3, evmWalletAddress,
                srcChainInfoId, srcNFTId,
                tokenIds,
                tokens,
                this.updateNftList
            );
        } catch(e) {
            alert(e.message);
        }

        // すべてのトークンの選択を解除する。
        this.nftSelector.clearTokenSelection();

        // 転送ボタンを有効化する。
        this.enableTransferButton();
    }

}
const component = new TransferButtonScreenComponent;
export default component;
