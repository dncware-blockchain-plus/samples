'use strict';


// 指定された範囲の数の配列を作る関数
function range(x, y) {
    if(y === undefined) {
        return [...Array(x).keys()];
    } else {
        const numbers = [...Array(y).keys()];
        return numbers.slice(x);
    }
}

// base64 をデコードする関数
export function decodeBase64(base64) {
    const decodedStr = atob(base64);
    const array = range(decodedStr.length).map(pos => decodedStr.charCodeAt(pos));
    return new Uint8Array(array);
}

// 配列の中身を sort uniq する関数
export function sortAndUniq(arr) {
    const wrk = [...arr];
    wrk.sort((a, b) => a - b);
    return wrk.filter((value, index, self) => self.indexOf(value) === index);
}
