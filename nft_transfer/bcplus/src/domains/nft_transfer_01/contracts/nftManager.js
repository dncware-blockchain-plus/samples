/* global nftId, func, args */
/* nftManager */


/* 入力をチェックする */
requireString(nftId, 'invalid: nftId');
requireString(func, 'invalid: func');

/* NFTコントラクトを開く */
var nftContract = openContract(nftId);

/* func に応じた処理を実行する */
switch (func) {

    case 'mint':
        /* mint 処理 */
        nftContract.call({
            func: 'mint',
            args: {
                to: args.to,
                uri: args.uri
            }
        });
        break;

    case 'burn':
        /* burn 処理 */
        nftContract.call({
            func: 'burn',
            args: {
                tokenId: args.tokenId
            }
        });
        break;

    default:
        throw 'unknown func: ' + func;
}


/* エラーチェック用の関数 */

function require(condition, message) {
    if (!condition) throw message;
}

function requireString(id, message) {
    require(typeof id === 'string', message);
}
