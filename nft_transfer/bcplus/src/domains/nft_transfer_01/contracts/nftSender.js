/* global nftId, tokenId, dstChainInfoId, dstAddress */
/* nftSender */

/* 入力をチェックする */
requireContract(nftId, 'invalid: nftId');
requireString(tokenId, 'invalid: tokenId');
requireString(dstChainInfoId, 'invalid: dstChainId');
requireEVMAddress(dstAddress, 'invalid: dstAddress');

/* チェーン情報のキーバリューストアを開く。*/
var chainStore = openContract('chains');

/* 転送元のチェーン（このチェーン）のチェーン情報のIDを取得する。*/
var srcChainInfoId = chainStore.get('chainInfoId');

/* 転送元・転送先の対応表を格納したキーバリューストアから、当該レコードを取得する */
var srcDstTable = openContract('srcDstTable');
var srcDstRecord = srcDstTable.get(['byNFTPair', srcChainInfoId, nftId, dstChainInfoId]);
require((srcDstRecord !== undefined) && (srcDstRecord !== null), 'unregistered source-destination pair');

console.log('key=');
console.log(['byNFTPair', srcChainInfoId, nftId, dstChainInfoId]);

/* 転送先のチェーンがキーバリューストアに登録されていることを確認する */
var dstChainRecord = chainStore.get(['chain', dstChainInfoId]);
require((dstChainRecord !== undefined) && (dstChainRecord !== null), 'unknown chainInfoId: ' + dstChainInfoId);

/* 転送元NFTからトークンURIと所有者のIDを取得する */
var srcNFTContract = openContract(nftId, {delegation: true});
var tokenURI = srcNFTContract.call({func: 'tokenURI', args: {tokenId: tokenId}});
var tokenOwner = srcNFTContract.call({func: 'ownerOf', args: {tokenId: tokenId}});

/* 転送元のトークンを burn する */
srcNFTContract.call({func: 'burn', args: {tokenId: tokenId}});

/* メッセージコントラクトを呼び出すことで、メッセージをトランザクションとして記録する */
openContract('messageEvent').call({
    messageType: 'NFTTransfer',
    dstChainInfoId: dstChainInfoId,
    srcNFTId: nftId,
    orgTokenId: tokenId,
    orgOwner: tokenOwner,
    tokenURI: tokenURI,
    dstNFTAddr: srcDstRecord.dstNFTAddr,
    dstWalletAddr: dstAddress
})


/* エラーチェック用の関数 */

function isContract(id) {
    return typeof id === 'string' && /^c0\d{3,18}$|^[^'`@/,;:]+@[^'`@/,;:]+$/.test(id);
}

function isEVMAddress(id) {
    return typeof id === 'string' && /^0x[a-fA-F0-9]{40}$/.test(id);
}

function require(condition, message) {
    if (!condition) throw message;
}

function requireContract(id, message) {
    require(isContract(id), message);
}

function requireEVMAddress(id, message) {
    require(isEVMAddress(id), message);
}

function requireString(id, message) {
    require(typeof id === 'string', message);
}
