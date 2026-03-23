// set_tables.mjs - BC+チェーンにチェーン情報と転送元・転送先情報のテーブルをセットするスクリプト
// 
// 使用法１：node set_tables.mjs
//    - 定義されているBC+チェーンすべてについて、チェーン情報と転送元・転送先情報のテーブルをセットする。
// 使用法２：node set_tables.mjs <chainInfoId> <rpcURL>
//    - 指定されたチェーン情報IDのBC+チェーンに、指定されたRPC-URLで接続し、チェーン情報と転送元・転送先情報のテーブルをセットする。

'use strict';

// BC+との通信用のユーティリティを読み込む。
import { dbcpConnect, dbcpCallContract } from '../../relay/lib/bcplus/bcplusUtil.mjs';
import { dbcpLoadAndDecodeWallet } from '../../relay/lib/bcplus/nodeJsBCPlusWallet.mjs';


// チェーン情報をセットするキーバリューストアの名前
const chainsStore = 'chains';

// 転送元と転送先の情報をセットするキーバリューストアの名前
const srcDstTableStore = 'srcDstTable';


// 定義情報のユーティリティ関数を読み込む。
import { getDefs, getChainInfo } from '../../relay/lib/common/defsUtil.mjs';


// キーバリューストアに値をセットする関数
async function setValueToStore(rpc, uw, storeFullName, key, value) {
    await dbcpCallContract(rpc, uw, storeFullName, {
        cmd: 'set',
        key,
        value
    });
}

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
        await setValueToStore(rpc, uw, chainsStoreFullName, key, value);
    }

    // 設定先のチェーン自体のチェーン情報のIDをセットする。
    await setValueToStore(rpc, uw, chainsStoreFullName, 'chainInfoId', selfChainInfoId);
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
    for(const srcDstInfo of defs.nftTransfer.srcDstData) {

        // BC+側のNFTのIDを取得する。
        const nftId = srcDstInfo.srcNFTId || srcDstInfo.dstNFTId;

        // キーを準備する。
        const key = String(['byNFTPair', srcDstInfo.srcChainInfoId, nftId, srcDstInfo.dstChainInfoId]);

        // キーバリューストアをコントラクトとして呼び出して、値をセットする。
        await setValueToStore(rpc, uw, srcDstTableStoreFullName, key, srcDstInfo);
    }
}

// chainInfoで指定されたBC+チェーンに接続し、チェーン情報と転送元・転送先情報のテーブルをセットする関数
async function setTablesForSpecifiedBCPlusChain(defs, chainInfo, uw) {

    // BC+に接続する。
    const rpc = await dbcpConnect(chainInfo.urls, chainInfo.chainId, uw);

    // チェーン情報をセットする。
    await setChainInfo(rpc, uw, defs, chainInfo.id, chainInfo.domain);

    // 転送元と転送先の情報をセットする。
    await setSrcDstTable(rpc, uw, chainInfo.domain, defs);
}

// 定義されているBC+のチェーンすべてについて、チェーン情報と転送元・転送先情報のテーブルをセットする関数
async function setTablesForAllBCPlusChains(defs, uw) {

    // type が "BC+" のチェーンの各々について
    // チェーン情報と転送元・転送先情報のテーブルをセットする。
    for (const chainInfo of defs.chainDef) {
        if (chainInfo.type === 'BC+') {
            await setTablesForSpecifiedBCPlusChain(defs, chainInfo, uw);
        }
    }
}

// 指定されたチェーン情報IDのBC+チェーンに、指定されたRPC-URLで接続する関数
export async function setTablesToBCPlusChainWithChainInfoIdAndURL(defs, chainInfoId, url, uw) {

    // 指定されたチェーン情報IDのチェーン情報を取得する。
    const chainInfo = await getChainInfo(chainInfoId);

    // URLを上書きしたチェーン情報を作成する。
    const modifiedChainInfo = {
        ...chainInfo,
        urls: [url]
    };

    // 作成したチェーン情報に基づいて、チェーン情報と転送元・転送先情報のテーブルをセットする。
    await setTablesForSpecifiedBCPlusChain(defs, modifiedChainInfo, uw);
}

// 使用法を出力する関数
function printUsage() {
    console.log('Usage:');
    console.log('  node set_tables.mjs');
    console.log('    - Set chain info and src/dst table for all defined BC+ chains.');
    console.log('  node set_tables.mjs <chainInfoId> <rpcURL>');
    console.log('    - Set chain info and src/dst table for the specified BC+ chain with the given RPC URL.');
}


try {

    // 転送元のチェーンの情報を取得する。
    const defs = await getDefs();

    // ウォレットをロード・デコードする。
    const uw = await dbcpLoadAndDecodeWallet();

    // コマンドライン引数を取得し、使用法１か使用法２での処理を行う。
    const args = process.argv.slice(2);
    if(args.length === 0) {
        // 使用法１：node set_tables.mjs
        // 定義されているBC+チェーンすべてについて、チェーン情報と転送元・転送先情報のテーブルをセットする。
        await setTablesForAllBCPlusChains(defs, uw);
    } else if(args.length === 2) {
        // 使用法２：node set_tables.mjs <chainInfoId> <rpcURL>
        // 指定されたチェーン情報IDのBC+チェーンに、指定されたRPC-URLで接続し、チェーン情報と転送元・転送先情報のテーブルをセットする。
        const chainInfoId = args[0];
        const rpcURL = args[1];
        await setTablesToBCPlusChainWithChainInfoIdAndURL(defs, chainInfoId, rpcURL, uw);
    } else {
        printUsage();
    }
    
} catch(e) {
    console.log(e.message);
}    
