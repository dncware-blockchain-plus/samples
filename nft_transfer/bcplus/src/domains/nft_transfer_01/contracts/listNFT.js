/* global nftId, owner, start, chunkSize */
/* listNFT */

/* 入力をチェックする */
requireContract(nftId, 'invalid: nftId');
requireString(owner, 'invalid: owner');
requireNumber(start, 'invalid: start');
requireNumber(chunkSize, 'invalid: chunkSize');

/* NFTのコントラクトを開く */
var nftContract = openContract(nftId, {delegation: false, catchable: true});

/* 指定されたオーナーが所有するトークンの総数を取得する。*/
var numToken = nftContract.call({func: 'balanceOf', args: {owner: owner}});

/* チャンクの終点を計算する。 */
var end = start + chunkSize;
if(end > numToken) {
    end = numToken;
}

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

/* 次のチャンクの始点を計算する。（次のチャンクがない場合は undefined とする。）*/
var nextStart = (end >= numToken) ? undefined : end;

/* トークンのリストと、次のチャンクの始点と、トークンの総数を返す。 */
return {
    tokens: tokens,
    nextStart: nextStart,
    numToken: numToken
};

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
