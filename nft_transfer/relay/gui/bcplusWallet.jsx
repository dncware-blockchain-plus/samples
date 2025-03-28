// BC+のウォレット指定用コンポーネント
const BCPlusWalletInput = (props) => {

    const { unlockedWallet, setUnlockedWallet } = props;

    const [bcplusWallet, setBcplusWallet] = useState(null);
    const [bcplusPassword, setBcplusPassword] = useState('');
    useEffect(() => {
            (async function () {
                setUnlockedWallet(await dbcpDecodeWallet(bcplusWallet, bcplusPassword));
            })();        
        }, [
            bcplusWallet, bcplusPassword
        ]
    );

    const onChangePassword = (e) => {
        setBcplusPassword(e.target.value);
    };

    // 横並びの<div>のスタイル
    const horzBoxStyle = {
        display: 'flex'
    };
    // 中央寄せの<div>のスタイル
    const centeringStyle = {
        justifyContent: 'center',
        alignItems: 'center'
    };

    return(
        <div style={horzBoxStyle}>
            <div style={horzBoxStyle} className="relayPartBox">
                <label>ＢＣ＋用ウォレット： </label><FileSelector setFile={setBcplusWallet} />
            </div>
            <div style={centeringStyle} className="relayPartBox">
                { unlockedWallet ? (
                    <img src="icons/unlocked.png" height="24" alt="ロック解除済み" />
                ) : (
                    <img src="icons/locked.png" height="24" alt="ロック未解除" />
                ) }
            </div>
            { bcplusWallet && (
                <div style={horzBoxStyle} className="relayPartBox">
                    <label>パスワード：</label><input type="password" onChange={onChangePassword} />
                </div>
            )}
        </div>
    );
};
