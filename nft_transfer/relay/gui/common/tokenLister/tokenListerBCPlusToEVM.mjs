'use strict';

// 他のファイルからのインポート
import { TokenListerBase } from './tokenLister.mjs';
import { getLocalStorage } from '../localStorage.mjs';
import { unlockedWallet } from '../bcplusUnlockedWallet.mjs';
import { bcpMakeTokenList } from '../../../lib/transfer/bcplusToEvm/tokenList.mjs';
import { bcpUpdateRawTokenLists } from '../../../lib/transfer/bcplusToEvm/rawTokens.mjs';
import { fetchNewBcplusMessageTransactions } from '../../../lib/transfer/bcplusToEvm/bcplusMessageTransaction.mjs';
import { updateProcessedTxNoLists } from '../../../lib/transfer/bcplusToEvm/processedTxNoList.mjs';


// トークン列挙を行うオブジェクトのクラス
export class TokenListerBCPlusToEVM extends TokenListerBase {

    // トークンのリストを作り直す関数
    // 
    // 取得済みの以下の情報から、トークンのリストを生成する：
    // - BC+上のトークンのリスト
    // - 転送メッセージ
    // - 処理済みのトランザクションのリスト
    async remakeTokenList(options = {}) {

        // オプションを取得する。
        const {
            onlyBurned = false,         // 「転送予約済み」以降の（burnされた）状態のトークンのみを対象とするかどうか
            reload = false              // トークンのリストの元となる情報を再取得するかどうか
        } = options;

        // 転送元のチェーン情報・NFTコレクションおよびトークンオーナーを取得する。
        const srcChainInfoId = getLocalStorage('srcChainInfoId');
        const srcNFTId = getLocalStorage('srcNFTId');
        const srcUserId = getLocalStorage('srcUserId');

        // reload が指定されている場合は、以下を行う：
        // - BC+上のトークンのリストの更新
        // - 新しいメッセージトランザクションの取得
        // - 処理済みのトランザクションのリスト全ての更新
        if(reload) {

            // BC+上のトークンのリストを更新する。
            await bcpUpdateRawTokenLists(unlockedWallet, srcChainInfoId, srcNFTId, srcUserId);

            // 新しいメッセージトランザクションを取得する。
            await fetchNewBcplusMessageTransactions(unlockedWallet, srcChainInfoId);
 
            // 転送先のチェーン情報IDのリストを抽出する。
            const dstChainInfoIds = this.getDstChainInfoIds();

            // 処理済みのトランザクションのリストを全て更新する。
            await updateProcessedTxNoLists(dstChainInfoIds);
        }

        // トークンのリストを作りなおす。
        this.tokens = await bcpMakeTokenList(
            onlyBurned,
            unlockedWallet,
            srcChainInfoId, srcNFTId, srcUserId
        );
    }

}
