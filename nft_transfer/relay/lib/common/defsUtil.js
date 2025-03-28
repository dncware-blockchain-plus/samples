// node.js の場合は、必要な関数をエクスポートする。
if(typeof(window) === 'undefined')  {

    const { fetchJSON } = require('./fetchUtil.js');
    global.fetchJSON = fetchJSON;
}


// 定義情報を読み込む関数
async function loadDefs() {

    // チェーン情報を読み込む
    chainDef = await fetchJSON('/defs/chains.json');

    // 転送元と転送先のテーブルを読み込む。
    srcDstData = await fetchJSON('/defs/src-dst.json');

    // チェーン情報をIDで見つけるためのマップを作る。
    var chainInfoMap = {};
    for(const chainInfo of chainDef) {
        chainInfoMap[chainInfo.id] = chainInfo;
    }

    // 読み込んだ定義情報をひとまとめにして返す。
    const defs = { chainDef, srcDstData, chainInfoMap }
    return defs;
}

// IDでチェーン情報を見つける関数
function findChainInfo(defs, chainInfoId) {
    const chainInfo = defs.chainInfoMap[chainInfoId];
    if(chainInfo === undefined) {
        throw new Error(`ERROR: Undefined chain: ${chainInfoId}`);
    }
    return chainInfo;
}


// node.js の場合は、関数をエクスポートする。
if(typeof(window) === 'undefined')  {
    module.exports = {
        loadDefs,
        findChainInfo
    };
}
