// NFTリスティング用のコントラクト
const nftListContractName = 'listNFT';

// NFTリスティングでのチャンクサイズ
const nftListChunkSize = 100;


// 未転送・転送待ちのトークンのリストを読み込む関数
async function bcpLoadAliveAndPendingTokenList(unlockedWallet, rpc, srcChainInfo, srcNFTId, userId, pendingTokenInfo) {

    var tokenListWithoutStates = [];

    try {

        // NFTリスティング用のコントラクトについて、ドメイン名付きのコントラクト名を作る。
        const nftListContractFullName = nftListContractName + '@' + srcChainInfo.domain;

        // トークン数を取得する。
        const numToken = await dbcpCallContract(rpc, unlockedWallet, srcNFTId, {
            func: 'balanceOf',
            args: {owner: userId}
        }, {
            readmode: 'fast'
        });

        // トークンの属性取得のためのチャンクごとのリクエストを発行する。v
        const promisses = [];
        for(let start = 0; start < numToken; ) {
            const end = Math.min(numToken, start + nftListChunkSize);
            const promiss = dbcpCallContract(rpc, unlockedWallet, nftListContractFullName, {
                nftId : srcNFTId,
                owner : userId,
                start,
                end
            }, {
                readmode: 'fast'
            });
            promisses.push(promiss);
            start = end;
        }
        // 発行したリクエストの処理完了を待ち、チャンクごとのトークンリストを取得する。
        const results = await Promise.all(promisses);

        // 取得したチャンクを連結してトークンリストを得る。
        tokenListWithoutStates = results.flat(1);

    } catch(e) {
        console.log(String(e));
    }

    // トークンリスト中のトークンの各々に以下を付与する：
    // - 状態の識別名
    // - 転送先の以下の情報：
    //   - チェーン情報のID
    //   - ＮＦＴのアドレス
    //   - 転送先のアドレス
    const tokenList = tokenListWithoutStates.map((tokenWithoutState) => (
        {
            ...tokenWithoutState,
            ...pendingTokenInfo.pendingTokenIds.includes(tokenWithoutState.id) ? {
                state: 'cmdPending',
                dstChainInfoId: pendingTokenInfo.dstChainInfoId,
                dstNFTAddr: pendingTokenInfo.dstNFTAddr,
                dstWalletAddr: pendingTokenInfo.dstWalletAddr                
            } : {
                state: 'alive'
            }
        }
    ));

    // トークンリストを返す。
    return tokenList;
}

// 処理済みのメッセージのトランザクション番号のリストを取得する関数
async function getProcessedMessageTxNoList(web3, evmWalletAddress, srcChainInfoId, defs, dstChainInfoId) {

    // 転送先のチェーンの情報を取得する。
    const dstChainInfo = findChainInfo(defs, dstChainInfoId);

    // 転送先のチェーンを選択する。
    await evmSelectChain(web3, dstChainInfo);

    // コントラクト NFTReceiver のインスタンスのラッパを作成する。
    const receiverContractWrapper = await evmMakeContractWrapper(web3, evmWalletAddress, dstChainInfo.nftReceiver, nftReceiverContractRelPath);

    // ＮＦＴ受領コントラクトを呼び出して、処理済みのトランザクションの番号と転送元のチェーン情報のIDのペアのリストを取得する。
    const pairStrs = await evmCall(receiverContractWrapper, 'getProcessedMessageTxList', []);
    const pairs = pairStrs.map((pair) => (pair.split(',')));

    // 転送元のチェーン情報のIDが一致するトランザクション番号のリストを抽出して返す。
    const processedMessageTxNoList = pairs.filter((pair) => (pair[1] === srcChainInfoId)).map((pair) => Number(pair[0]));
    return processedMessageTxNoList;
}

// 発行済みのEVMトランザクションの状態を確認する関数
async function checkTransactionStatus(web3, tokenData) {
    const transactionHash = tokenData.transactionHash;
    console.log(transactionHash);
    let receipt = null;
    try {
        receipt = transactionHash ? await web3.eth.getTransactionReceipt(transactionHash) : null;
    } catch(e) {
    }
    if(receipt === null) {
        return 'pending';
    } else if(receipt.status) {
        return 'succeeded';
    } else {
        return 'failed';
    }
}

// 転送予約済みまたは転送済みのトークンのリストを読み込む関数
async function bcpLoadReservedAndTransferedTokenList(unlockedWallet, web3, evmWalletAddress, defs, rpc, srcChainInfo, srcNFTId, userId, baseIndex) {

    // メッセージのトランザクションを列挙する。
    const transactions = await bcpEnumerateMessageTransactions(rpc, unlockedWallet, srcChainInfo);

    // メッセージのリストを作る。
    const messages = transactions.map((transaction) => ({...JSON.parse(transaction.argstr), txNo: transaction.txno, time: transaction.time }));

    // 転送元のＮＦＴと所有者が一致するメッセージを抽出する。
    const matchingMessages = messages.filter((message) => (
       (message.srcNFTId === srcNFTId) && (message.orgOwner === userId) 
    ));

    // 転送先のチェーン情報のIDのリストを作る。
    const dstChainInfoIds = [...new Set(matchingMessages.map(message => message.dstChainInfoId))];

    // 転送元のチェーンの各々について、処理済みのメッセージのトランザクション番号のリストを取得する。
    let processedMessageTxNoListForChains = {};
    for(const dstChainInfoId of dstChainInfoIds) {
        processedMessageTxNoListForChains[dstChainInfoId] = await getProcessedMessageTxNoList(web3, evmWalletAddress, srcChainInfo.id, defs, dstChainInfoId);
    }

    // ＮＦＴ受領コントラクトのトランザクションの処理待ちのトークンのリストを取得する。
    const receptionPendingTokenData = getTokensPendingForReception(srcChainInfo.id, srcNFTId);

    // 上で抽出したメッセージをトークンリストに変換する。
    // そして、処理済みのメッセージのトランザクション番号のリストに基づいて、各トークンが転送済みか否かを判定する。
    const pendingOrSentTokenList = matchingMessages.map((message) => {
        const isTransfered = processedMessageTxNoListForChains[message.dstChainInfoId].includes(message.txNo);
        const tokenId = message.orgTokenId;
        let state = null;
        let time = null;
        if(isTransfered) {
            state = 'transfered';
        } else {
            if(receptionPendingTokenData[tokenId]) {
                const status = checkTransactionStatus(web3, receptionPendingTokenData[tokenId]);
                if(status === 'succeeded') {
                    state = 'transfered';               // XXX:ここには来ないはず
                } else if(status === 'failed') {
                    state = 'failed';
                } else { // status === 'pending'
                    // ＮＦＴ受領コントラクトの処理待ちなら、トランザクション送信からの経過時間を表示。
                    state = 'recepitionPending';
                    time = receptionPendingTokenData[tokenId].time;
                }
            } else {                                            // 転送予約済みなら、転送予約時からの経過時間を表示。
                state = 'reserved';
                time = isTransfered ? null : message.time;
            }
        }
        return {
            index: baseIndex + message.index,
            id: message.orgTokenId,
            uri: message.tokenURI,
            state,
            time,
            dstChainInfoId: message.dstChainInfoId,
            dstNFTAddr: message.dstNFTAddr,
            dstWalletAddr: message.dstWalletAddr
        };
    });

    // トークンのリストを返す。
    return pendingOrSentTokenList;
}

// トークンIDで、トークンリストをソートする関数
function sortTokenListById(tokenList) {
    return tokenList.sort((a, b) => {
        const regex = /(\D*)(\d*)$/;
        const [, aText, aNum] = a.id.match(regex);
        const [, bText, bNum] = b.id.match(regex);

        if (aNum && bNum) {
            return parseInt(aNum) - parseInt(bNum);
        } else if (aNum) {
            return 1;
        } else if (bNum) {
            return -1;
        } else {
            return a.localeCompare(b);
        }
    });
}

// トークンリストを読み込む関数
async function bcpLoadTokenList(unlockedWallet, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, pendingTokenInfo) {

    // ウォレット、転送元チェーン・ＮＦＴが指定されていない場合、およびエラーが起きた場合は、空のリストを返す。
    var tokenList = [];
    try {
        if(unlockedWallet && srcChainInfoId && srcNFTId) {

            // 転送元のチェーン情報を取得する。
            const srcChainInfo = findChainInfo(defs, srcChainInfoId);
            
            // BC+ に接続する。
            const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId);

            // ユーザIDを取得する。
            const userId = (await dbcpGetWalletUser(rpc, unlockedWallet))[0];
            
            // 未転送・転送待ちのトークンのリストを取得する。
            const aliveAndPendingTokenList = await bcpLoadAliveAndPendingTokenList(unlockedWallet, rpc, srcChainInfo, srcNFTId, userId, pendingTokenInfo);

            // 転送予約済み・転送済みのトークンのリストを取得する。
            const baseIndex = aliveAndPendingTokenList.length;
            const reservedAndTransferedTokenList = await bcpLoadReservedAndTransferedTokenList(unlockedWallet, web3, evmWalletAddress, defs, rpc, srcChainInfo, srcNFTId, userId, baseIndex)

            // 未転送・転送待ちのトークンのリストと転送予約済みのトークンリストを連結する。
            tokenList = [...aliveAndPendingTokenList, ...reservedAndTransferedTokenList]

            // トークンリストをソートする。
            sortTokenListById(tokenList);
        }
    } catch(e) {
        console.log(String(e));
    }

    return tokenList;
}
