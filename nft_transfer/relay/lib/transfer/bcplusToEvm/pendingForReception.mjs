// pendingForReception.js
//
//  ＮＦＴ受領コントラクトのトランザクションの処理待ちのトークンの登録情報に関わる関数群を含む
//
'use strict';


// ＮＦＴ受領コントラクトのトランザクションの処理待ちのトークンの登録情報
//
// 登録情報はメモリ上のオブジェクトとして保持する。
// 永続化はしない。
// アプリケーションを終了・リロードした場合は消える。
//
// キー： [srcChainInfoId, srcNFTAddrOrId] のJSON文字列
// 値：トークンIDから登録情報へのマッピング用のオブジェクト。
const pendingTokenRegistry = {};


// 指定された転送元について、キーを求める関数
export function getKeyForSrc(srcChainInfoId, srcNFTAddrOrId) {
    return JSON.stringify([srcChainInfoId, srcNFTAddrOrId]);
}

// 指定された転送元について、トークンIDから登録情報へのマッピング用のオブジェクトを取得する関数
export function getPendingTokenMap(srcChainInfoId, srcNFTAddrOrId) {

    // キーを求める。
    const key = getKeyForSrc(srcChainInfoId, srcNFTAddrOrId);

    // 求めたキーで、メモリ上の登録情報を探す。
    let pendingTokenMap = pendingTokenRegistry[key];

    // メモリ上に登録情報がない場合は、空の登録情報を作って登録する。
    if(!pendingTokenMap) {
        pendingTokenMap = {};
        pendingTokenRegistry[key] = pendingTokenMap;
    }

    // 取得または新規作成した登録情報を返す。
    return pendingTokenMap;
}

// 処理待ちのトークンを追加する関数
export function registerATokenAsPendingForReception(srcChainInfoId, srcNFTAddrOrId, tokenId) {

    // 現在時刻を取得する。
    const time = (new Date()).getTime();

    // 指定された転送元について、トークンIDから登録情報へのマッピング用のオブジェクトを取得する。
    const pendingTokenMap = getPendingTokenMap(srcChainInfoId, srcNFTAddrOrId);

    // リストに入っていない場合は、指定されたトークンを加える。
    if(!pendingTokenMap[tokenId]) {
        pendingTokenMap[tokenId] = {
            time
        };
    }
}

// 処理待ちのトークンを削除する関数
export function removeATokenAsPendingForReception(srcChainInfoId, srcNFTAddrOrId, tokenId) {

    // 指定された転送元について、トークンIDから登録情報へのマッピング用のオブジェクトを取得する。
    const pendingTokenMap = getPendingTokenMap(srcChainInfoId, srcNFTAddrOrId);

    // 存在する場合は、指定されたトークンの登録情報を削除する。
    if(pendingTokenMap[tokenId]) {
        delete pendingTokenMap[tokenId];
    }
}

// トランザクションハッシュを保存する関数
// ※ 順方向（BC+→EVM）専用
export function saveTransactionHashForReception(srcChainInfoId, srcNFTAddr, tokenId, transactionHash) {

    // 指定された転送元について、トークンIDから登録情報へのマッピング用のオブジェクトを取得する。
    const pendingTokenMap = getPendingTokenMap(srcChainInfoId, srcNFTAddr);
    
    // 指定されたトークンの登録情報が存在する場合は、
    // その登録情報にトランザクションハッシュを追加する。
    const pendingTokenRecord = pendingTokenMap[tokenId];
    if(pendingTokenRecord) {
        pendingTokenRecord.transactionHash = transactionHash;
    }
}

// 状態と矛盾するトークンを登録情報から削除する関数
export function removeContradictingTokensFromList(srcChainInfoId, srcNFTAddrOrId, tokens) {

    // リストに含まれていても矛盾しないトークンIDのリストを作る。
    const possibleIds = tokens.filter(token => (
        (token.state === 'reserved') || (token.state === 'receptionPending') || (token.state === 'failed')
    )).map(token => token.id);

    // 指定された転送元について、トークンIDから登録情報へのマッピング用のオブジェクトを取得する。
    const orgPendingTokenMap = getPendingTokenMap(srcChainInfoId, srcNFTAddrOrId);

    // トークンのリストやトークンの状態と矛盾するトークンIDを削除した登録情報を作りなおす。
    const pendingTokenMap = {};
    for(const tokenId of Object.keys(orgPendingTokenMap)) {
        if(possibleIds.includes(tokenId)) {
            pendingTokenMap[tokenId] = orgPendingTokenMap[tokenId];
        }
    }

    // １個でもIDが削除された場合は、マッピング用のオブジェクトを置き換える。
    if(Object.keys(pendingTokenMap).length !== Object.keys(orgPendingTokenMap).length) {
        const key = getKeyForSrc(srcChainInfoId, srcNFTAddrOrId);
        pendingTokenRegistry[key] = pendingTokenMap;
    }
}
