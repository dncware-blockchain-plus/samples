// NFTReceiver コントラクトの情報を格納したファイルの相対パス
const nftReceiverContractRelPath =  'nftReceiver.sol/NFTReceiver.json';

// ＮＦＴ転送コントラクト呼び出し時のスリープ時間
const nftSenderSleepMsec = 2000;

// ＮＦＴ受領コントラクト呼び出し時のスリープ時間
const nftReceiverSleepMsec = 2000;



// ＮＦＴ転送コントラクトを呼び出す関数
async function callNFTSender(rpc, uw, srcChainInfo, srcNFTId, tokens, srcTokenIds, removeTokenFromPendingList, dstChainInfoId, dstAddress) {

    // 転送対象のトークンの各々について、
    for(const srcTokenId of srcTokenIds) {

        // トランザクションの処理に時間がかかる様子を再現するため、一定時間スリープする。            
        await sleep(nftSenderSleepMsec);

        // ＮＦＴ転送コントラクトを呼び出す。
        try {
            await dbcpCallContract(rpc, uw, srcChainInfo.nftSender, {
                nftId: srcNFTId,
                tokenId: srcTokenId,
                dstChainInfoId: dstChainInfoId,
                dstAddress: dstAddress
            });
            console.log(`INFO: Invocation of nftSender contract has succeeded for token ${srcTokenId}.`)
        } catch(e) {
            console.error(`ERROR: Invocation of nftSender contract has failed for token ${srcTokenId}.`);
        }

        // 転送待ちのトークンのリストから当該トークンを削除する。
        await removeTokenFromPendingList(srcTokenId);
    }
}

// 元のトークンIDをキー、値をトランザクションとしたマップを作る関数
async function makeMessageTransactionMap(rpc, uw, srcChainInfo) {

    // メッセージのトランザクションを列挙する。
    const transactions = await bcpEnumerateMessageTransactions(rpc, uw, srcChainInfo);

    // 元のNFTコントラクトのIDとトークンIDのペアをキー、値をトランザクションとしたマップを作って返す。
    var transactionMap = {};
    for(const tx of transactions) {
        const args = JSON.parse(tx.argstr);
        transactionMap[[args.srcNFTId, args.orgTokenId]] = tx;
    }
    return transactionMap;
}

// 転送対象のトークンの情報を取得する関数
function getTransferingTokenInfo(transactionMap, tokenId, srcNFTId) {

    const key = [srcNFTId, tokenId]

    // 当該トランザクションが存在しない場合はエラー
    if(!(key in transactionMap)) {
        throw `ERROR: Transfer message for token ${tokenId} of NFT ${srcNFTId} does not exist.`;
    }

    // 当該トランザクションを取得する。
    const tx = transactionMap[key];

    // 引数とトランザクション番号を取得する。
    const args = JSON.parse(tx.argstr);
    const txno = tx.txno;

    // トランザクションに記録された転送元の NFT の ID が引数で指定されたものと一致しない場合はエラーとする。
    if(args.srcNFTId !== srcNFTId) {
        throw `ERROR: srcNFTId is inconsistent for token ${tokenId}. (${args.srcNFTId} in the message and ${srcNFTId} in the function argument)`;
    }

    // トークンの情報を取得して返す。
    const transferingTokenInfo = [
        args.tokenURI,          // tokenURI
        txno,                   // messageTxNo
        args.dstNFTAddr,        // dstNFTAddr
        args.dstWalletAddr      // dstWalletAddr
    ];
    return transferingTokenInfo;
}

// ＮＦＴ受領コントラクトを呼び出す関数
async function sendTransferMessage(receiverContractWrapper, srcChainInfoId, srcNFTId, transferingTokensInfo, srcChainInfoId, srcTokenIds, refreshProc) {

    // トランザクションの処理に時間がかかる様子を再現するため、一定時間スリープする。
    await sleep(nftReceiverSleepMsec);

    try {

        // ＮＦＴ受領コントラクトを呼び出す。
        const contractArgs = [
            srcChainInfoId,            // srcChainInfoId
            srcNFTId,                  // srcNFTId
            transferingTokensInfo.length,  // numTransferingTokens
            transferingTokensInfo          // transferingTokens
        ];
        const result = await (
            evmSend(receiverContractWrapper, 'receiveNFT', contractArgs)
            .on('sending', payload => {

                // トランザクションを送信した時点で、ＮＦＴ受領コントラクトでの処理対象としたトークンを、
                // 処理待ちリストに加えた上で、画面を更新する。
                const time = (new Date()).getTime();
                for(const srcTokenId of srcTokenIds) {
                    registerATokenAsPendingForReception(srcChainInfoId, srcNFTId, srcTokenId, time);
                }

                // トークンリストを更新する。
                if(refreshProc) {
                    refreshProc();      
                }
            })
            .on('transactionHash', transactionHash => {

                // トランザクションハッシュが得られたら、処理待ちのトークンの情報に追加する。
                for(const srcTokenId of srcTokenIds) {
                    saveTransactionHashForReception(srcChainInfoId, srcNFTId, srcTokenId, transactionHash);
                }

                // トークンリストを更新する。
                if(refreshProc) {
                    refreshProc();
                }
            })
        );
        console.log(result);

    } catch(error) {

        if(refreshProc) {

            // エラーが起きた場合は処理対象としたトークンを処理待ちリストから削除した上で、画面を更新する。
            const time = (new Date()).getTime();
            for(const srcTokenId of srcTokenIds) {
                removeATokenAsPendingForReception(srcChainInfoId, srcNFTId, srcTokenId);
            }
            refreshProc();      
        }        
        
    }
}

// メッセージをリレーする関数
async function relayMessages(rpc, uw, web3, evmWalletAddress, srcChainInfo, dstChainInfo, srcNFTId, srcTokenIds, refreshProc) {

    // 転送先のチェーンを選択する。
    await evmSelectChain(web3, dstChainInfo);

    // コントラクト NFTReceiver のインスタンスのラッパを作成する。
    const receiverContractWrapper = await evmMakeContractWrapper(web3, evmWalletAddress, dstChainInfo.nftReceiver, nftReceiverContractRelPath);

    // 元のトークンIDをキー、値をトランザクションとしたマップを作る。
    const transactionMap = await makeMessageTransactionMap(rpc, uw, srcChainInfo);

    try {
        // 転送対象のトークンの情報を取得する。
        const transferingTokensInfo = srcTokenIds.map((tokenId) => getTransferingTokenInfo(transactionMap, tokenId, srcNFTId));

        // ＮＦＴ受領コントラクトを呼び出す。
        await sendTransferMessage(receiverContractWrapper, srcChainInfo.id, srcNFTId, transferingTokensInfo, srcChainInfo.id, srcTokenIds, refreshProc);

    } catch(e) {
        console.error(e);
    }
}

// 指定されたＮＦＴを転送する関数
async function transferNFT(uw, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, tokens, srcTokenIds, removeTokenFromPendingList, dstChainInfoId, dstNFTAddr, dstAddress, refreshProc) {

    // 引数チェックを行う。
    if((!srcChainInfoId) || (!srcNFTId) || (!dstChainInfoId) || (!dstNFTAddr) || (!dstAddress)) {
        alert('転送元・転送先で未指定の項目があります。')
    } else if((!srcTokenIds) || (srcTokenIds.length == 0)) {
        alert('転送対象のトークンが選択されていません。')
    } else if(uw === null) {
        alert('ＢＣ＋用のウォレットが選択されていないか、ロック解除されていません。');
    } else if(web3 === null) {
        alert('ＥＶＭ用のウォレットが選択されていません。');
    } else {

        // 転送元・転送先のチェーン情報を取得する。
        const srcChainInfo = findChainInfo(defs, srcChainInfoId);
        const dstChainInfo = findChainInfo(defs, dstChainInfoId);
    
        // BC+ に接続する。
        const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId);

        // ＮＦＴ転送コントラクトを呼び出す。
        await callNFTSender(rpc, uw, srcChainInfo, srcNFTId, tokens, srcTokenIds, removeTokenFromPendingList, dstChainInfoId, dstAddress);

        // 転送メッセージをリレーする。
        await relayMessages(rpc, uw, web3, evmWalletAddress, srcChainInfo, dstChainInfo, srcNFTId, srcTokenIds, refreshProc);

        // トークンの状態が変わったので、画面表示を更新する。
        if(refreshProc) {
            refreshProc();
        }
    }
}

// 指定されたＮＦＴについて転送を再試行する関数
async function retryNFTTransfer(uw, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, srcTokenIds, tokens, refreshProc) {

    // 引数チェックを行う。
    if((!srcChainInfoId) || (!srcNFTId)) {
        alert('転送元・転送先で未指定の項目があります。')
    } else if((!srcTokenIds) || (srcTokenIds.length == 0)) {
        alert('転送対象のトークンが選択されていません。')
    } else if(uw === null) {
        alert('ＢＣ＋用のウォレットが選択されていないか、ロック解除されていません。');
    } else if(web3 === null) {
        alert('ＥＶＭ用のウォレットが選択されていません。');
    } else {

        // 転送元のチェーン情報を取得する。
        const srcChainInfo = findChainInfo(defs, srcChainInfoId);
    
        // BC+ に接続する。
        const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId);

        // 転送先のチェーンの情報のIDの一覧を作る。
        const dstChainInfoIds = Array.from(new Set(tokens.filter(token => srcTokenIds.includes(token.id)).map(token => token.dstChainInfoId)));

        // 転送先のチェーンの各々について、
        for(const dstChainInfoId of dstChainInfoIds) {

            // 転送先のチェーン情報を取得する。
            const dstChainInfo = findChainInfo(defs, dstChainInfoId);

            // 転送先のチェーンが一致するトークンのIDの一覧を作る。
            const tokenIds = tokens.filter(token => (srcTokenIds.includes(token.id) && (token.dstChainInfoId === dstChainInfoId))).map(token => token.id);

            // 転送メッセージをリレーする。
            await relayMessages(rpc, uw, web3, evmWalletAddress, srcChainInfo, dstChainInfo, srcNFTId, tokenIds, refreshProc);
        }

        // トークンの状態が変わったので、画面表示を更新する。
        if(refreshProc) {
            refreshProc();
        }
    }
}
