const { useState, useEffect } = React;


const durationUpdatePeriod = 1000;      // 経過時間の更新周期(msec)


// 状態IDを状態の表示名に変換するマップ
const stateNameMap = {
    alive: '',
    cmdPending: '転送待ち',
    reserved: '転送予約済み',
    recepitionPending: '受領待ち',
    failed: '転送失敗',
    transfered: '転送済み'
};

// NFT表示用のスクロールバーの横幅
const nftSelectorScrollbarWidth = '20px';

// 単一トークン表示用のスタイル情報
const tokenItemStyles = {
    'id': {
        width: '40',
        textAlign: 'center',
        fontSize: '13px'
    },
    uri: {
        width: '320px',
        fontSize: '13px'
    },
    state: {
        width: '120px',
        fontSize: '13px'
    },
    duration: {
        width: '80px',
        fontSize: '13px'
    },
    dstChainInfoId: {
        width: '160px',
        fontSize: '13px'
    },
    dstNFTAddr: {
        width: '600px',
        fontSize: '13px'
    },
    dstWalletAddr: {
        width: '500px',
        fontSize: '13px'
    }
};

// トークンリストのヘッダ
const NFTSelectorHeader = () => {

    const divStyle = {
        display: 'flex'
    };

    const baseStyle = {
        border: '1px solid #808080',
        backgroundColor: '#f0f0f0'
    };

    return(
        <div style={divStyle}>
            <div style={{...baseStyle, ...tokenItemStyles.id}}>ID</div>
            <div style={{...baseStyle, ...tokenItemStyles.uri}}>URI</div>
            <div style={{...baseStyle, ...tokenItemStyles.state}}>状態</div>
            <div style={{...baseStyle, ...tokenItemStyles.duration}}>経過時間</div>
            <div style={{...baseStyle, ...tokenItemStyles.dstChainInfoId}}>転送先チェーン</div>
            <div style={{...baseStyle, ...tokenItemStyles.dstNFTAddr}}>転送先NFT</div>
            <div style={{...baseStyle, ...tokenItemStyles.dstWalletAddr}}>転送先アドレス</div>
            <div style={{...baseStyle, width: nftSelectorScrollbarWidth }}></div>
        </div>
    );
};

// 現在時刻とトークンの転送予約時刻から経過時間を計算する関数
const makeDurationString = (currentTime, tokenTime) => {

    // 現在時刻とトークンの転送予約時刻のどちらかが指定されていない場合は、空文字列を返す。
    let durationString = '';
    if(currentTime && tokenTime) {

        // 経過秒数を算出する。
        const durationSec = Math.floor((currentTime - tokenTime) / 1000);

        // １分、１時間、１日あたりの秒数
        const secPerMin = 60;
        const secPerHour = secPerMin * 60;
        const secPerDay = secPerHour * 24;

        // １日を超えている場合は、日数の文字列表現を返す。
        if(durationSec >= secPerDay) {
            durationString = String(Math.floor(durationSec / secPerDay)) + '日';
        
        // １時間を超えている場合は、時間数の文字列表現を返す。
        } else if(durationSec >= secPerHour) {
            durationString = String(Math.floor(durationSec / secPerHour)) + '時間';
            
        // １分を超えている場合は、分数の文字列表現を返す。
        } else if(durationSec >= secPerMin) {
            durationString = String(Math.floor(durationSec / secPerMin)) + '分';

        // １分未満の場合は、秒数の文字列表現を返す。
        } else {
            durationString = String(durationSec) + '秒';
        }
    }
    return durationString;
};

// 単一トークン表示用コンポーネント
const TokenItem = (props) => {

    const { token, index, selectedIndices, nftNameMap } = props;

    const selected = selectedIndices.includes(index);

    const divStyle = {
        display: 'flex'
    };

    // トークンの状態、選択状態に応じた表示色設定
    const selectionStyleData = {
        'alive': {
            false: {
                backgroundColor: '#ffffff',
                color: '#202020'
            },
            true: {
                backgroundColor: '#8080ff',
                color: '#ffffff'
            }
        },
        'cmdPending': {
            false: {
                backgroundColor: '#ffffff',
                color: '#0000ff'
            },
            true: {
                backgroundColor: '#8080ff',
                color: '#0000ff'
            }
        },
        'reserved': {
            false: {
                backgroundColor: '#ffffff',
                color: '#ff0000'
            },
            true: {
                backgroundColor: '#ff8080',
                color: '#ff0000'
            }
        },
        'recepitionPending': {
            false: {
                backgroundColor: '#ffffff',
                color: '#ff00ff'
            },
            true: {
                backgroundColor: '#ff80ff',
                color: '#ff00ff'
            }
        },
        'failed': {
            false: {
                backgroundColor: '#ffc0c0',
                color: '#ffffff'
            },
            true: {
                backgroundColor: '#ff0000',
                color: '#ffffff'
            }
        },
        'transfered': {
            false: {
                backgroundColor: '#ffffff',
                color: '#c0c0c0'
            },
            true: { // この組み合わせは実際には用いない。
                backgroundColor: '#000000',
                color: '#ffffff'
            }
        }
    };

    // トークンの状態、選択状態に応じて表示スタイルを決める。
    const baseStyle = {
        border: '1px solid #c0c0c0'
    };
    const selectionStyle = selectionStyleData[token.state][selected];
    const commonStyle = {
        ...baseStyle,
        ...selectionStyle
    };

    // ステート currentTime で現在時刻を管理する。
    const [currentTime, setCurrentTime] = useState(null);

    // 一定間隔で現在時刻を取得しなおすことで、現在時刻をもとに算出する経過時間の表示を更新する。
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime((new Date()).getTime());
        }, durationUpdatePeriod);
        return () => clearInterval(interval);
    }, []);

    // NFT名が取得できるのであれば、取得する。
    const nftName = nftNameMap[JSON.stringify({
        dstChainInfoId: token.dstChainInfoId,
        dstNFTAddr: token.dstNFTAddr        
    })];

    return(
        <div style={divStyle}>
            <div style={{...commonStyle, ...tokenItemStyles.id}}>{token.id}</div>
            <div style={{...commonStyle, ...tokenItemStyles.uri}}>{token.uri}</div>
            <div style={{...commonStyle, ...tokenItemStyles.state}}>{stateNameMap[token.state]}</div>
            <div style={{...commonStyle, ...tokenItemStyles.duration}}>{makeDurationString(currentTime, token.time)}</div>
            <div style={{...commonStyle, ...tokenItemStyles.dstChainInfoId}}>{token.dstChainInfoId}</div>
            <div style={{...commonStyle, ...tokenItemStyles.dstNFTAddr}}>{(nftName ? nftName + ' - ' : '') + (token.dstNFTAddr ? token.dstNFTAddr : '')}</div>
            <div style={{...commonStyle, ...tokenItemStyles.dstWalletAddr}}>{token.dstWalletAddr}</div>
        </div>
    );
};

// ＥＶＭ上のＮＦＴ名を取得する関数
const getEvmNFTName = async (defs, web3, evmWalletAddress, dstChainInfoId, nftAddress) => {

    // 転送先のチェーンの情報を取得する。
    const dstChainInfo = findChainInfo(defs, dstChainInfoId);

    // 取得できない場合は NFT 名として '' を返す。
    let nftName = '';
    try {
        // 転送先のチェーンを選択する。
        await evmSelectChain(web3, dstChainInfo);

        // ＮＦＴのコントラクトを呼び出してＮＦＴ名を取得する。
        const nftContractWrapper = await evmMakeERC721ContractWrapper(web3, evmWalletAddress, nftAddress);
        nftName = await evmCall(nftContractWrapper, 'name', []);

    } catch(e) {
    }

    // ＮＦＴ名を返す。
    return nftName;
};

// ＮＦＴ名取得用のマップを作る関数
const makeNFTNameMap = async (defs, web3, evmWalletAddress, tokens) => {
    // 必要なデータがそろっていない場合は、空のマップを返す。
    var nftNameMap = {};
    if(defs && web3 && evmWalletAddress && tokens.length) {

        // 転送先がセットされたトークンのリストを作る。
        const tokensWithDestination = tokens.filter(token => (token.dstChainInfoId && token.dstNFTAddr));

        // マップのキー（転送先のチェーンの情報のIDと、ＮＦＴアドレスの組を JSON 化した文字列）のリストを作る。
        const keys = [...new Set(
            tokensWithDestination.map(token => JSON.stringify({
                dstChainInfoId: token.dstChainInfoId,
                dstNFTAddr: token.dstNFTAddr
            }))
        )];

        //　キーの各々について、ＮＦＴ名を取得してマップにセットする。
        for(const key of keys) {
            const dst = JSON.parse(key);
            nftNameMap[key] = await getEvmNFTName(defs, web3, evmWalletAddress, dst.dstChainInfoId, dst.dstNFTAddr);
        }
    }
    return nftNameMap;
};

// 転送対象ＮＦＴ選択用コンポーネント
const NFTSelector = (props) => {

    const { tokens, setSelectedTokenIds, defs, dstChainInfoId, web3, evmWalletAddress, nSelectedAliveTokens, nSelectedReservedTokens } = props;

    // トークンが選択済みか否かのフラグの配列を作る。
    const [selectedIndices, setSelectedIndices] = useState([]);

    // 選択済みのトークンのリストを更新する。
    useEffect(() => {
        setSelectedTokenIds(selectedIndices.map((index) => tokens[index].id));
    }, [
        selectedIndices, tokens
    ]);

    // トークンリストの更新時に、トークンの選択を解除する。
    useEffect(() => {
        setSelectedIndices([]);
    }, [
        tokens
    ]);

    // ステート nftNameMap でＮＦＴ名取得用のマップを管理する。
    const [nftNameMap, setNFTNameMap] = useState({});

    // ＮＦＴ名取得用のマップを作る。
    useEffect(() => {
        (async () => {
            setNFTNameMap(await makeNFTNameMap(defs, web3, evmWalletAddress, tokens));
        })();
    }, [
        defs, dstChainInfoId, web3, evmWalletAddress, tokens
    ]);

    // リスト部分のスタイル
    const listStyle = {
        listStyle: 'none',
        paddingLeft: '0',
        marginTop: '0' // 追加
    };

    // スクロールする範囲の外枠用のスタイル
    const scrollerStyle = {
        flexGrow: '1',
        minHeight: '1px',
        overflowY: 'scroll',
        backgroundColor: '#ffffff',
        scrollbarWidth: nftSelectorScrollbarWidth,
        display: 'flex', // 追加
        flexDirection: 'column' // 追加
    };

    // トークンをクリックしたときの応答を定義する関数
    const onClickToken = (index) => {

        // 当該トークンの情報を取得する。
        const token = tokens[index];

        // 当該トークンが選択されている場合、
        if(selectedIndices.includes(index)) {

            // 当該トークンの選択を取り消す。
            setSelectedIndices(selectedIndices.filter((selectedIndex) => (selectedIndex !== index)));

        // 当該トークンが選択されていない場合、
        } else {

            // 転送済みトークンは選択できないようにする。
            if(token.state === 'transfered') {
                alert('転送済みのトークンは選択できません。');
            } else {

                // 転送予約済みでないトークンが一つでも選択されている場合は、転送予約済みのトークンを選択できないようにする。
                if((nSelectedAliveTokens > 0) && (token.state === 'reserved')) {
                    alert('転送予約済みでないトークンが一つでも選択されている場合は、転送予約済みのトークンを選択できません。');
                } else {

                    // 転送予約済みのトークンが一つでも選択されている場合は、転送予約済みでないを選択できないようにする。
                    if((nSelectedReservedTokens > 0) && (token.state === 'alive')) {
                        alert('転送予約済みでないトークンが一つでも選択されている場合は、転送予約済みのトークンを選択できません。');
                    } else {

                        // 当該トークンを選択する。
                        setSelectedIndices([...selectedIndices, index]);
                    }
                }
            }
        }
    };

    return(
        <React.Fragment>
            <NFTSelectorHeader />
            <div style={scrollerStyle}>
                <ul style={listStyle}>
                    { tokens.map((token, index) => (
                        <li key={token.id} onClick={() => onClickToken(index)}>
                            <TokenItem token={token} index={index} selectedIndices={selectedIndices} nftNameMap={nftNameMap} />
                        </li>
                    ))}
                </ul>
            </div>
        </React.Fragment>
    );
};
