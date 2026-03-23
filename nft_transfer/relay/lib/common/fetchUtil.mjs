'use strict';

// ブラウザの場合は同じサイト上から、node.js の場合はファイルシステムから、相対パスでファイルを取得する関数
export let wrappedFetch = null;


// node.js の場合とブラウザで実装を切り替える。

// node.js の場合
if(typeof(window) === 'undefined')  {

    // ファイルを指定 URL から読み込む関数
    wrappedFetch = async function (relPathFromRelay) {
        const path = await import('path');
        const fs = await import('fs');
        const relPath = path.join('../relay', relPathFromRelay);
        const data = fs.readFileSync(relPath, 'utf-8');
        return data;
    }

// ブラウザの場合
} else {

    // ファイルを指定 URL から読み込む関数
    wrappedFetch = async function (url) {
        const response = await fetch(url);
        const data = await response.text();
        return data;
    }
}


// JSONファイルを読み込んでデコードする関数
export async function fetchJSON(relPath) {
    const jsonData = await wrappedFetch(relPath);
    return JSON.parse(jsonData);
}
