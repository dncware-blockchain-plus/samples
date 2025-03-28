const chainsStore = 'chains';
const srcDstTableStore = 'srcDstTable';


// 標準モジュールの読み込み
const fs = require('fs');

// BC+との通信用のユーティリティを読み込む。
const { dbcpConnect, dbcpCallContract } = require('../../relay/lib/bcplus/bcplusUtil');
const { dbcpLoadAndDecodeWallet } = require('../../relay/lib/bcplus/nodeJsBCPlusWallet.js');

// 定義情報のユーティリティ関数を読み込む。
const { loadDefs } = require('../../relay/lib/common/defsUtil.js');


// チェーン情報をセットする関数
async function setChainInfo(rpc, uw, defs, selfChainInfoId, domainName) {
    
    // キーバリューストアの名前を取得する。
    const chainsStoreFullName = `${chainsStore}@${domainName}`;

    // キーバリューストアを空にする。
    await dbcpCallContract(rpc, uw, chainsStoreFullName, {
        cmd: 'deleteAll'
    });

    // チェーン情報のレコードの各々について、
    for(const chainInfo of defs.chainDef) {

        // セットする値を準備する。
        const value = chainInfo;

        // キーを準備する。
        const key = String(['chain', chainInfo.id]);

        // キーバリューストアをコントラクトとして呼び出して、値をセットする。
        await dbcpCallContract(rpc, uw, chainsStoreFullName, {
            cmd: 'set',
            key,
            value
        });
    }

    // 設定先のチェーン自体のチェーン情報のIDをセットする。
    await dbcpCallContract(rpc, uw, chainsStoreFullName, {
        cmd: 'set',
        key: 'chainInfoId',
        value: selfChainInfoId
    });
}

// 転送元と転送先の情報をセットする関数
async function setSrcDstTable(rpc, uw, domainName, defs) {
    
    // キーバリューストアの名前を取得する。
    const srcDstTableStoreFullName = `${srcDstTableStore}@${domainName}`;
    
    // キーバリューストアを空にする。
    await dbcpCallContract(rpc, uw, srcDstTableStoreFullName, {
        cmd: 'deleteAll'
    });

    // 転送元と転送先のペアの各々について、
    for(const srcDstInfo of defs.srcDstData) {

        // セットする値を準備する。
        var value = srcDstInfo;

        // キーを準備する。
        const key = String(['byNFTPair', srcDstInfo.srcChainInfoId, srcDstInfo.srcNFTId, srcDstInfo.dstChainInfoId]);

        // キーバリューストアをコントラクトとして呼び出して、値をセットする。
        await dbcpCallContract(rpc, uw, srcDstTableStoreFullName, {
            cmd: 'set',
            key,
            value
        });
    }
}

// テーブルをセットする関数
async function setTables() {

    // 転送元のチェーンの情報を取得する。
    const defs = await loadDefs();

    // ウォレットをロード・デコードする。
    const uw = await dbcpLoadAndDecodeWallet();

    // type が "BC+" のチェーンの各々について
    for(const chainInfo of defs.chainDef) {
        if(chainInfo.type === 'BC+') {

            // BC+に接続する。
            const rpc = await dbcpConnect(chainInfo.urls, chainInfo.chainId);

            // チェーン情報をセットする。
            await setChainInfo(rpc, uw, defs, chainInfo.id, chainInfo.domain);

            // 転送元と転送先の情報をセットする。
            await setSrcDstTable(rpc, uw, chainInfo.domain, defs);
        }
    }
}


(async function(){

    try {
        await setTables();
    } catch(e) {
        console.log(e.message);
    }    

})();
