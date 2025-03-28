// 転送先のＮＦＴの表示用文字列に当該ＮＦＴの表示名を付け加える関数
const addTokenNamesForEVM = async (web3, evmWalletAddress, defs, dstChainInfoId, dstNFTAddrOptions) => {

    // 転送先のチェーンの情報を取得する。
    const dstChainInfo = findChainInfo(defs, dstChainInfoId);

    // 転送先のチェーンを選択する。
    try {
        await evmSelectChain(web3, dstChainInfo);

        // 転送先のＮＦＴのＩＤの候補の各々について、
        for(const dstNFTAddrOption of dstNFTAddrOptions) {

            // ＮＦＴのアドレスを取得する。
            const nftAddress = dstNFTAddrOption.value;

            // ＮＦＴの表示名が得られる場合は、表示用文字列に付け加える。
            try {
                const nftContractWrapper = await evmMakeERC721ContractWrapper(web3, evmWalletAddress, nftAddress);
                const nftName = await evmCall(nftContractWrapper, 'name', []);
                dstNFTAddrOption.text = `${nftName} - ${nftAddress}`;
            } catch(e) {
            }
        }
    } catch(e) {
    }
};

// 現在の選択状態に基づいて、選択対象の候補を絞り込む関数
const makeOptions = async (unlockedWallet, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, dstChainInfoId, dstNFTAddr) => {

    //// 候補の集合を作る。
    const dstChainInfoIds = [];
    const dstNFTAddrs = [];

    // defs の準備ができるまでは、ダミーの選択肢を返す。
    if(defs) {

        // 転送元・転送先の対応表を取得する。
        const srcDstData = defs.srcDstData;

        // 他の項目で指定済みのオプションが一つでも一致しなかったら、選択肢に入れない。
        for(const srcDstInfo of srcDstData) {
            if(((srcChainInfoId === '') || (srcChainInfoId === srcDstInfo.srcChainInfoId))
              && ((srcNFTId === '') || (srcNFTId === srcDstInfo.srcNFTId))
              && ((dstNFTAddr === '') || (dstNFTAddr === srcDstInfo.dstNFTAddr))) {
                dstChainInfoIds.push({ value: srcDstInfo.dstChainInfoId, text: srcDstInfo.dstChainInfoId });
            }
            if(((srcChainInfoId === '') || (srcChainInfoId === srcDstInfo.srcChainInfoId))
              && ((srcNFTId === '') || (srcNFTId === srcDstInfo.srcNFTId))
              && ((dstChainInfoId === '') || (dstChainInfoId === srcDstInfo.dstChainInfoId))) {
                dstNFTAddrs.push({ value: srcDstInfo.dstNFTAddr, text: srcDstInfo.dstNFTAddr });
            }
        }
    }

    //// 候補の集合をリストに変換する。また、先頭にデフォルトの候補を追加する。
    const dstChainInfoIdOptions = makeAnOptionList({ value: '', text: '-- 転送先のチェーンを選択してください --' }, dstChainInfoIds);
    const dstNFTAddrOptions = makeAnOptionList({ value: '', text: '-- 転送先のＮＦＴコレクションを選択してください --' }, dstNFTAddrs);

    // Web3 のオブジェクト、ＥＶＭウォレットのアドレス、転送先のチェーンが共に指定されている場合は、
    // 転送先のＮＦＴの表示用文字列に当該ＮＦＴの表示名を付け加えるための処理を行う。
    if(web3 && evmWalletAddress && defs && dstChainInfoId) {
        await addTokenNamesForEVM(web3, evmWalletAddress, defs, dstChainInfoId, dstNFTAddrOptions);
    }

    // 選択対象の候補を返す。
    return { dstChainInfoIdOptions, dstNFTAddrOptions };
};

// 転送元・転送先の指定用のコンポーネント
const DstSelector = (props) => {

    const { defs, srcChainInfoId, setSrcChainInfoId, srcNFTId, setSrcNFTId, dstChainInfoId, setDstChainInfoId, dstNFTAddr, setDstNFTAddr, unlockedWallet, web3, evmWalletAddress } = props;

    const [optionsData, setOptionsData] = useState(null);
    useEffect(() => {
        (async function () {
            setOptionsData(await makeOptions(unlockedWallet, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, dstChainInfoId, dstNFTAddr));
        })();
    }, [unlockedWallet, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, dstChainInfoId, dstNFTAddr]);

    const style = {
        display: 'flex'
    };

    return(
        optionsData ? (
            <div style={style} className="relayPartBox">
                <StringSelector setSelection={setDstChainInfoId} options={optionsData.dstChainInfoIdOptions} />
                <StringSelector setSelection={setDstNFTAddr} options={optionsData.dstNFTAddrOptions} />
            </div>
        ) : (
            <div>初期化中…</div>
        )
    );
};
