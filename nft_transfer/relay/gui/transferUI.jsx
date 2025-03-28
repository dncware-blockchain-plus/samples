const { useState, useEffect } = React;


// アプリケーション本体
const App = () => {

    // ステート defs に定義情報を読み込む。
    // （読み込みが終わった時点で再描画が行われる。）
    const [defs, setDefs] = useState(null);
    useEffect(() => {
        (async function () {
            const defs = await loadDefs();
            setDefs(defs);
        })();
    }, []);

    // 転送元のＮＦＴをステート srcChainInfoId, srcNFTId で、
    // 転送先のＮＦＴをステート dstChainInfoId, dstNFTAddr で管理する。
    const [srcChainInfoId, setSrcChainInfoId] = useState('');
    const [srcNFTId, setSrcNFTId] = useState('');
    const [dstChainInfoId, setDstChainInfoId] = useState('');
    const [dstNFTAddr, setDstNFTAddr] = useState('');

    // 転送先のアドレスをステート dstAddress で管理する。
    const [dstAddress, setDstAddress] = useState('');

    // アンロック済みのＢＣ＋用ウォレットをステート unlockedWallet で管理する。
    const [unlockedWallet, setUnlockedWallet] = useState(null);

    // ステート web3 で Web3 のオブジェクトを管理する。
    const [web3, setWeb3] = useState(null);
    // ステート evmWalletAddress でＥＶＭのウォレットアドレスを管理する。
    const [evmWalletAddress, setEvmWAlletAddress] = useState(null);

    // ステート tokens でＮＦＴのトークンのリストを管理する。
    const [tokens, setTokens] = useState([]);

    // ステート selectedTokenIds で選択されているトークンのIDのリストを管理する。
    const [selectedTokenIds, setSelectedTokenIds] = useState([]);

    // ステート pendingTokenIds で転送待ちのトークンのIDのリストを管理する。
    const [pendingTokenIds, setPendingTokenIds] = useState([]);

    // ステート tokenUpdateTrigger をトークンリストを更新させるためのトリガとして用いる。
    const [tokenUpdateTrigger, setTokenUpdateTrigger] = useState([]);

    // トークンのリストを更新する関数
    const refreshTokenList = async () => {
        const pendingTokenInfo = {
            dstChainInfoId,
            dstNFTAddr,
            dstAddress,
            pendingTokenIds
        };
        const tokensNew = await bcpLoadTokenList(
            unlockedWallet,
            web3, evmWalletAddress,
            defs,
            srcChainInfoId, srcNFTId,
            pendingTokenInfo
        );
        setTokens(tokensNew);
    };

    // 状態と矛盾するトークンをＮＦＴ受領コントラクトのトランザクションの処理待ちのトークンのリストから削除する。
    removeContradictingTokensFromList(srcChainInfoId, srcNFTId, tokens);

    // ステート tokens にトークンのリストを読み込む。
    useEffect(() => {
        refreshTokenList();  
    }, [
        unlockedWallet, defs, srcChainInfoId, srcNFTId, dstChainInfoId, tokenUpdateTrigger, pendingTokenIds
    ]);

    // 指定トークンを転送待ちトークンのリストから削除する関数
    const removeTokenFromPendingList = (tokenIdToBeRemoved) => {
        setPendingTokenIds(pendingTokenIds.filter((tokenId) => (tokenId !== tokenIdToBeRemoved)));
    };

    // トークン転送を実行する関数
    const onTransfer = async () => {

        // 転送待ちのトークンのリストをセットする。
        setPendingTokenIds(selectedTokenIds);

        // 選択されているトークンを転送する。
        try {
            await transferNFT(
                unlockedWallet, web3, evmWalletAddress, defs,
                srcChainInfoId, srcNFTId,
                tokens, selectedTokenIds, removeTokenFromPendingList,
                dstChainInfoId, dstNFTAddr, dstAddress,
                refreshTokenList
            );
        } catch(e) {
            alert(JSON.stringify(e, null, 2));
        }
    };

    // トークン転送の再試行を実行する関数
    const onRetryTransfer = async () => {

        // 選択されているトークンの転送を再試行する。
        try {
            await retryNFTTransfer(
                unlockedWallet, web3, evmWalletAddress, defs,
                srcChainInfoId, srcNFTId,
                selectedTokenIds,
                tokens,
                refreshTokenList
            );
        } catch(e) {
            alert(JSON.stringify(e, null, 2));
        }
    };

    // トップレベルの <div> 要素のスタイル
    const toplevelStyle = {
        display: 'flex',
        flexDierction: 'column',
        height: '100%',
        flexFlow: 'column',
        backgroundColor: '#e0f0ff',
        margin: '0px'
    };
    // 転送ボタンの外枠のスタイル
    const buttonBoxStyle = {
        display: 'flex'
    };

    // 転送待ち以降の状態になっておらず、かつ選択されているトークンの数を数える。
    const nSelectedAliveTokens = tokens.filter(token => ((token.state === 'alive') && selectedTokenIds.includes(token.id))).length;

    // 転送予約済み、かつ選択されているトークンの数を数える。
    const nSelectedReservedTokens = tokens.filter(token => ((token.state === 'reserved') && selectedTokenIds.includes(token.id))).length;

    return (
        <div style={toplevelStyle}>
            <div>
                <BCPlusWalletInput unlockedWallet={unlockedWallet} setUnlockedWallet={setUnlockedWallet}/>
                <EVMWalletInput web3={web3} setWeb3={setWeb3} setEvmWAlletAddress={setEvmWAlletAddress} />
                <SrcSelector defs={defs} srcChainInfoId={srcChainInfoId} setSrcChainInfoId={setSrcChainInfoId} srcNFTId={srcNFTId} setSrcNFTId={setSrcNFTId} dstChainInfoId={dstChainInfoId} setDstChainInfoId={setDstChainInfoId} dstNFTAddr={dstNFTAddr} setDstNFTAddr={setDstNFTAddr} unlockedWallet={unlockedWallet} web3={web3} evmWalletAddress={evmWalletAddress} />
            </div>
            <NFTSelector tokens={tokens} setSelectedTokenIds={setSelectedTokenIds} defs={defs} dstChainInfoId={dstChainInfoId} web3={web3} evmWalletAddress={evmWalletAddress} nSelectedAliveTokens={nSelectedAliveTokens} nSelectedReservedTokens={nSelectedReservedTokens} />
            <DestinationAddressInput dstAddress={dstAddress} setDstAddress={setDstAddress} walletAddress={evmWalletAddress} />
            <div style={buttonBoxStyle}>
                <DstSelector defs={defs} srcChainInfoId={srcChainInfoId} setSrcChainInfoId={setSrcChainInfoId} srcNFTId={srcNFTId} setSrcNFTId={setSrcNFTId} dstChainInfoId={dstChainInfoId} setDstChainInfoId={setDstChainInfoId} dstNFTAddr={dstNFTAddr} setDstNFTAddr={setDstNFTAddr} unlockedWallet={unlockedWallet} web3={web3} evmWalletAddress={evmWalletAddress} />
            </div>
            {
                unlockedWallet && web3 && evmWalletAddress && defs
                    && srcChainInfoId && srcNFTId && dstChainInfoId && dstNFTAddr && dstAddress
                    && (nSelectedAliveTokens > 0)
                    && <button onClick={onTransfer}>転送実行</button>
            }
            {
                unlockedWallet && web3 && evmWalletAddress && defs
                    && srcChainInfoId && srcNFTId
                    && (nSelectedReservedTokens > 0)
                    && <button onClick={onRetryTransfer}>転送再試行</button>
            }
        </div>
    );
}

const container = document.getElementById('root');

const root = ReactDOM.createRoot(container);
root.render(<App />);
