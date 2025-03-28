// pendingForReception.js
//
//  ＮＦＴ受領コントラクトのトランザクションの処理待ちのトークンの登録情報に関わる関数群を含む
//

// ローカルストレージのキーを作る関数
function makeKeyForPendingTokens(srcChainInfoId, srcNFTId) {
    return JSON.stringify({srcChainInfoId, srcNFTId});
}

// 処理待ちのトークンの登録情報を取得する関数
function getTokensPendingForReception(srcChainInfoId, srcNFTId) {

    // キーを作る。
    const key = makeKeyForPendingTokens(srcChainInfoId, srcNFTId);

    // JSON形式でローカルストレージに保存した登録情報を取得して返す。
    // （キーに対応する値がない場合は {} を返す。）
    const value = JSON.parse(localStorage.getItem(key));
    return value ? value : {};
}

// 処理待ちのトークンを追加する関数
function registerATokenAsPendingForReception(srcChainInfoId, srcNFTId, tokenId, time) {

    // 処理待ちのトークンの登録情報を取得する。
    const pendingTokenData = getTokensPendingForReception(srcChainInfoId, srcNFTId);

    // リストに入っていない場合は、指定されたトークンを加えた上でローカルストレージに保存する。
    if(!pendingTokenData[tokenId]) {
        const key = makeKeyForPendingTokens(srcChainInfoId, srcNFTId);
        localStorage.setItem(key, JSON.stringify({...pendingTokenData, [tokenId]: {time}}));
    }
}

// 処理待ちのトークンを削除する関数
function removeATokenAsPendingForReception(srcChainInfoId, srcNFTId, tokenId) {

    // 処理待ちのトークンの登録情報を取得する。
    const pendingTokenData = getTokensPendingForReception(srcChainInfoId, srcNFTId);

    // リストに入っている場合は、指定されたトークンを削除した上でローカルストレージに保存する。
    if(pendingTokenData[tokenId]) {
        delete pendingTokenData[tokenId];
        const key = makeKeyForPendingTokens(srcChainInfoId, srcNFTId);
        localStorage.setItem(key, JSON.stringify(pendingTokenData));
    }
}

// トランザクションハッシュを保存する関数
function saveTransactionHashForReception(srcChainInfoId, srcNFTId, tokenId, transactionHash) {

    // 処理待ちのトークンの登録情報を取得する。
    const pendingTokenData = getTokensPendingForReception(srcChainInfoId, srcNFTId);

    // リストに入っている場合は、指定されたトークンについてトランザクションハッシュをローカルストレージに保存する。
    if(pendingTokenData[tokenId]) {
        pendingTokenData[tokenId].transactionHash = transactionHash;
        const key = makeKeyForPendingTokens(srcChainInfoId, srcNFTId);
        localStorage.setItem(key, JSON.stringify(pendingTokenData));
    }
}

// 状態と矛盾するトークンを登録情報から削除する関数
function removeContradictingTokensFromList(srcChainInfoId, srcNFTId, tokens) {

    // リストに含まれていても矛盾しないトークンIDのリストを作る。
    const possibleIds = tokens.filter(token => (
        (token.state === 'reserved') || (token.state === 'recepitionPending') || (token.state === 'failed')
    )).map(token => token.id);

    // 処理待ちのトークンの登録情報を取得する。
    const orgPendingTokenData = getTokensPendingForReception(srcChainInfoId, srcNFTId);

    // トークンのリストやトークンの状態と矛盾するトークンIDを削除した登録情報を作る。
    const pendingTokenData = {};
    for(const tokenId of Object.keys(orgPendingTokenData)) {
        if(possibleIds.includes(tokenId)) {
            pendingTokenData[tokenId] = orgPendingTokenData[tokenId];
        }
    }

    // １個でもIDが削除された場合は、ローカルストレージ上の登録情報を更新する。
    if(Object.keys(pendingTokenData).length !== Object.keys(orgPendingTokenData).length) {
        const key = makeKeyForPendingTokens(srcChainInfoId, srcNFTId);
        localStorage.setItem(key, JSON.stringify(pendingTokenData));
    }
}
