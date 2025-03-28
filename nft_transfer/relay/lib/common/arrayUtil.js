// オブジェクトのリストの重複排除を行う関数
function removeRedundantObjectInArray(array) {
    return Array.from(new Set(array.map(obj => JSON.stringify(obj)))).map(str => JSON.parse(str));
}
