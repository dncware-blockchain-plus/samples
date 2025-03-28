// リストから文字列を選択するためのコンポーネント
const StringSelector = (props) => {

    const { setSelection, options } = props;
    // setSelection(val):
    //   選択対象を変更する関数
    //   val: 選択対象の値
    // options:
    //   { value, text } の配列。
    //     value: 項目の値
    //     text: 表示テキスト

    const onChangeSelection = (e) => {
        setSelection(e.target.value);
    };

    const style = {
        height: 'auto',
        lineHeight: 'normal',
        padding: '0'
    };

    return(
        <select onChange={onChangeSelection} size="1" style={style}>
            { options.map((option) => (
                <option value={option.value} key={option.value}>
                    {option.text}
                </option>
            ))}
        </select>
    );
};
