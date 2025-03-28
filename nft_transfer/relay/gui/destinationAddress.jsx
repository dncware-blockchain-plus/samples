// 転送先アドレスの指定用のコンポーネント
const DestinationAddressInput = (props) => {
    
    const { dstAddress, setDstAddress, walletAddress } = props;

    const onChangeAddress = (e) => {
        setDstAddress(e.target.value);
    };

    const onClickSetWalletAddressAsDestination = () => {
        setDstAddress(walletAddress);
    };

    return(
        <div style={horzBoxStyle}>
            <div style={horzBoxStyle} className="relayPartBox">
                <label>転送先アドレス：</label>
                <input type="text" value={dstAddress} onChange={onChangeAddress} />
            </div>
            { walletAddress && (
                <div style={horzBoxStyle} className="relayPartBox">
                    <button onClick={onClickSetWalletAddressAsDestination}>ウォレットアドレスを転送先にする</button>
                </div>
            )}
        </div>
    );
};
