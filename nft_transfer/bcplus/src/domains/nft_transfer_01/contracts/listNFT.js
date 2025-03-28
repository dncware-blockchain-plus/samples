/* global nftId, owner, start, end */
/* listNFT */

/* 入力をチェックする */
requireContract(nftId, 'invalid: nftId');
requireString(owner, 'invalid: owner');
requireNumber(start, 'invalid: start');
requireNumber(end, 'invalid: end');

/* NFTのコントラクトを開く */
var nftContract = openContract(nftId, {delegation: true, catchable: true});

/* トークンのリストを空に初期化する。 */
var tokens = [];

/* 始点と終点の間のトークンの各々について */
for(var index = start; index < end; index ++) {

    try {
        /* 表示するトークンのIDを取得する。 */
        var tokenId = nftContract.call({func: 'tokenOfOwnerByIndex', args: {owner: owner, index: index}});

        /* トークンのURIを取得する。 */
        var tokenURI = nftContract.call({func : 'tokenURI', args: {tokenId: tokenId}});

        /* トークン情報を 現在のチャンクのトークンのリストに追加する。 */
        tokens.push({ index: index, id: tokenId, uri: tokenURI });

    } catch(e) {
        // エラーは無視
    }
}

/*  トークンのリストを返す。 */
return tokens;

/* エラーチェック用の関数 */

function isContract(id) {
    return typeof id === 'string' && /^c0\d{3,18}$|^[^'`@/,;:]+@[^'`@/,;:]+$/.test(id);
}

function require(condition, message) {
    if (!condition) throw message;
}

function requireContract(id, message) {
    require(isContract(id), message);
}

function requireString(id, message) {
    require(typeof id === 'string', message);
}

function requireNumber(id, message) {
    require(typeof id === 'number', message);
}
