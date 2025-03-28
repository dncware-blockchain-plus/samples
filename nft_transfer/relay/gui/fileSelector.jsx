// ファイル読み込み用のコンポーネント
const FileSelector = (props) => {

    const { setFile } = props;

    const onFileChange = (fileSelEvent) => {
        const file = fileSelEvent.target.files[0];
        const reader = new FileReader();

        reader.onload = (fileLoadEvent) => {
            const content = fileLoadEvent.target.result;
            try {
                setFile(content);
            } catch(error) {
                alert('This JSON file is corrupt.');
                setFile(null);
            }
        };

        if(file) {
            reader.readAsText(file);
        }
    };

    return(
        <input type="file" accept=".json" onChange={onFileChange} />
    );
}
