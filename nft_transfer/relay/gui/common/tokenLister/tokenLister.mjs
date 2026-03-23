'use strict';


// トークン列挙を行うオブジェクトのクラス
export class TokenListerBase {

    // コンストラクタ
    constructor() {
        
        // トークンのリスト
        this.tokens = [];
    }

    // トークンのリストを作り直す関数
    async remakeTokenList(options = {}) {
        // 子クラスで実装する
    }

    // トークンのリストを取得する関数
    getTokens() {
        return this.tokens;
    }

    // 転送先のチェーン情報IDのリストを抽出する関数
    getDstChainInfoIds() {
        const dstChainInfoIds = [...new Set(
            this.tokens
            .filter(token => token.dstChainInfoId)  // dstChainInfoId が存在するトークンがあるトークンに限定
            .filter(
                token => token.state === 'reserved' || token.state === 'receptionPending'
            ) // 転送予約済み・受領待ちのトークンがあるに限る
            .map(
                token => token.dstChainInfoId // トークンの転送先のチェーン情報IDを抽出
            )
        )];
        return dstChainInfoIds;
    }

}
