
// EVMウォレット選択用コンポーネント
const EVMWalletSelector = (props) => {

    const { evmProviders, setWeb3 } = props;

    const onChange = async (event) => {
        const key = event.target.value;
        const web3 = await evmSelectProvider(key ? evmProviders.get(key).provider : null);
        setWeb3(web3);
    };
    
    return(
        <div className="relayPartBox">
            <label>EVM用ウォレット：</label>
            <select size='1' onChange={onChange}>
                <option key="" value="">-- ウォレットを選択してください --</option>
                { Array.from(evmProviders.entries()).map(([key, value]) => (<option key={key} value={key}>{value.info.name}</option>)) }
            </select>        
        </div>
    );
};

const EVMAddressSelector = (props) => {
    
    const { evmWalletAddresses, setEvmWAlletAddress } = props;

    const onChange = (event) => {
        const key = event.target.value;
        setEvmWAlletAddress(event.target.value);
    };
    
    return(
        <div className="relayPartBox">
            <label>ウォレットアドレス：</label>
            <select size='1' onChange={onChange}>
                <option key="" value="">-- ウォレットアドレスを選択してください --</option>
                { evmWalletAddresses.map((walletAddress) => (<option key={walletAddress} value={walletAddress}>{walletAddress}</option>)) }
            </select>        
        </div>
    );
};

// ＥＶＭウォレット関連の入力用のコンポーネント
const EVMWalletInput = (props) => {

    const { web3, setWeb3, setEvmWAlletAddress } = props;

    // ステート evmProviders にＥＶＭプロバイダの一覧をセットする。
    const [evmProviders, setEvmProviders] = useState(new Map());
    useEffect(() => {
        (async function () {
            setEvmProviders(await evmGetProviders());
        })();        
    }, []);

    // ステート evmWalletAddresses に選択可能なＥＶＭのウォレットアドレスの一覧をセットする。
    const [evmWalletAddresses, setEvmWalletAddresses] = useState([]);
    useEffect(() => {
        (async function () {
            setEvmWalletAddresses(await evmGetWalletAddresses(web3));
        })();        
    }, [web3]);


    return (
        <div style={horzBoxStyle}>
            <EVMWalletSelector evmProviders={evmProviders} setWeb3={setWeb3} />
            { web3 && <EVMAddressSelector evmWalletAddresses={evmWalletAddresses} setEvmWAlletAddress={setEvmWAlletAddress} /> }
        </div>
    );
};
