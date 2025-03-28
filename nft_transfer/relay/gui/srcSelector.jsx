// 転送元のＮＦＴの表示用文字列に当該ＮＦＴの表示名を付け加える関数
const addTokenNamesForBCPlus = async (unlockedWallet, defs, srcChainInfoId, srcNFTIdOptions) => {

    // 転送元のチェーンの情報を取得する。
    const srcChainInfo = findChainInfo(defs, srcChainInfoId);
    
    // BC+ に接続する。
    const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId);

    // 転送元のＮＦＴのＩＤの候補の各々について、
    for(const srcNFTIdOption of srcNFTIdOptions) {

        // ＮＦＴのＩＤを取得する。
        const nftId = srcNFTIdOption.value;
        if(nftId) {

            // ＮＦＴの表示名が得られる場合は、表示用文字列に付け加える。
            try {
                const nftName = await dbcpCallContract(rpc, unlockedWallet, nftId, {func: 'name'}, {readmode: 'fast'});
                srcNFTIdOption.text = `${nftName} - ${nftId}`;
            } catch(e) {
            }
        }
    }
};

// 現在の選択状態に基づいて、転送元の選択対象の候補を絞り込む関数
const makeSrcOptions = async (unlockedWallet, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, dstChainInfoId, dstNFTAddr) => {

    //// 候補の集合を作る。
    const srcChainInfoIds = [];
    const srcNFTIds = [];

    // defs の準備ができるまでは、ダミーの選択肢を返す。
    if(defs) {

        // 転送元・転送先の対応表を取得する。
        const srcDstData = defs.srcDstData;

        // 他の項目で指定済みのオプションが一つでも一致しなかったら、選択肢に入れない。
        for(const srcDstInfo of srcDstData) {
            if(((srcNFTId === '') || (srcNFTId === srcDstInfo.srcNFTId))
              && ((dstChainInfoId === '') || (dstChainInfoId === srcDstInfo.dstChainInfoId))
              && ((dstNFTAddr === '') || (dstNFTAddr === srcDstInfo.dstNFTAddr))) {
                srcChainInfoIds.push({ value: srcDstInfo.srcChainInfoId, text: srcDstInfo.srcChainInfoId });
            }
            if(((srcChainInfoId === '') || (srcChainInfoId === srcDstInfo.srcChainInfoId))
              && ((dstChainInfoId === '') || (dstChainInfoId === srcDstInfo.dstChainInfoId))
              && ((dstNFTAddr === '') || (dstNFTAddr === srcDstInfo.dstNFTAddr))) {
                srcNFTIds.push({ value: srcDstInfo.srcNFTId, text: srcDstInfo.srcNFTId });
            }
        }
    }

    //// 候補の集合をリストに変換する。また、先頭にデフォルトの候補を追加する。
    const srcChainInfoIdOptions = makeAnOptionList({ value: '', text: '-- 転送元チェーンを選択してください --' }, srcChainInfoIds);
    const srcNFTIdOptions = makeAnOptionList({ value: '', text: '-- 転送元のＮＦＴコレクションを選択してください --' }, srcNFTIds);

    // ロック解除済みのウォレット、転送元のチェーンが共に指定されている場合は、
    // 転送元のＮＦＴの表示用文字列に当該ＮＦＴの表示名を付け加えるための処理を行う。
    if(unlockedWallet && defs && srcChainInfoId) {
        await addTokenNamesForBCPlus(unlockedWallet, defs, srcChainInfoId, srcNFTIdOptions); 
    }

    // 選択対象の候補を返す。
    return { srcChainInfoIdOptions, srcNFTIdOptions };
};

// 転送元・転送先の指定用のコンポーネント
const SrcSelector = (props) => {

    const { defs, srcChainInfoId, setSrcChainInfoId, srcNFTId, setSrcNFTId, dstChainInfoId, setDstChainInfoId, dstNFTAddr, setDstNFTAddr, unlockedWallet, web3, evmWalletAddress } = props;

    const [optionsData, setOptionsData] = useState(null);
    useEffect(() => {
        (async function () {
            setOptionsData(await makeSrcOptions(unlockedWallet, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, dstChainInfoId, dstNFTAddr));
        })();
    }, [unlockedWallet, web3, evmWalletAddress, defs, srcChainInfoId, srcNFTId, dstChainInfoId, dstNFTAddr]);

    const style = {
        display: 'flex'
    };

    return(
        optionsData ? (
            <div style={style} className="relayPartBox">
                <StringSelector setSelection={setSrcChainInfoId} options={optionsData.srcChainInfoIdOptions} />
                <StringSelector setSelection={setSrcNFTId} options={optionsData.srcNFTIdOptions} />
            </div>
        ) : (
            <div>初期化中…</div>
        )
    );
};
