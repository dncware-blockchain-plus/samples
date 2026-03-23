'use strict';


// 転送待ちのトークンのIDをキー、以下を含むオブジェクトを値とするオブジェクト：
// - 転送待ちとなった時刻
// - 転送先のチェーン情報ID
// - 転送先のNFTコントラクトアドレス／ＩＤ
// - 転送先のウォレットアドレス／ユーザ名
export const tokenPendingForSending = {};


// IDのリストで指定されたトークンを転送待ちのセットに追加する関数
export function addTokensPendingForSending(tokenIds, dstChainInfoId, dstNFTAddrOrId, dstWalletAddrOrUserId) {

    // 現在時刻を取得する。
    const currentTime = (new Date()).getTime();

    // 各トークンIDを転送待ちのセットに追加する。
    for(const tokenId of tokenIds) {
        tokenPendingForSending[tokenId] = {
            pendingSince: currentTime, // 転送待ちとなった時刻
            dstChainInfoId,            // 転送先のチェーン情報ID
            dstNFTAddrOrId,            // 転送先のNFTコントラクトアドレス
            dstWalletAddrOrUserId      // 転送先のウォレットアドレス
        };
    }
}
