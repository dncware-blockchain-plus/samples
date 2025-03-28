let fetchJSON = null;


// node.js の場合とブラウザで実装を切り替える。

// node.js の場合
if(typeof(window) === 'undefined')  {

    // JSON ファイルを指定 URL から読み込む関数
    fetchJSON = async function (relPathFromRelay) {
        const path = require('path');
        const fs = require('fs');
        const relPath = path.join('../relay', relPathFromRelay);
        const data = JSON.parse(fs.readFileSync(relPath, 'utf-8'));
        return data;
    }

// ブラウザの場合
} else {

    // JSON ファイルを指定 URL から読み込む関数
    fetchJSON = async function (url) {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    }
}




// node.js の場合は、関数をエクスポートする。
if(typeof(window) === 'undefined')  {
    module.exports = {
        fetchJSON
    };
}
