'use strict';

// 他のファイルからのインポート
import { fetchJSON } from './fetchUtil.mjs';


// 定義情報
let defs = null;


// 定義情報を読み込む関数
async function loadDefs() {

    // チェーン情報を読み込む
    const chainDef = await fetchJSON('/defs/chains.json');

    // 転送元と転送先のテーブルを読み込む。
    const srcDstData = await fetchJSON('/defs/nft_transfer/src-dst.json');

    // 支払連携に関する設定を読み込む。
    const paymentConfig = await fetchJSON('/defs/payment_relay/config.json');

    // チェーン情報をIDで見つけるためのマップを作る。
    let chainInfoMap = {};
    for(const chainInfo of chainDef) {
        chainInfoMap[chainInfo.id] = chainInfo;
    }

    // 読み込んだ定義情報をひとまとめにして返す。
    const defs = {
        chainDef,
        chainInfoMap,
        nftTransfer: {
            srcDstData
        },
        paymentRelay: {
            config: paymentConfig
        }
    };
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

// 定義情報を取得する関数
export async function getDefs() {

    // 定義情報がロード済みであれば、それを返す。
    if(defs) {
        return defs;
    }

    // 定義情報を読み込む
    defs = await loadDefs();
    if(!defs) {
        return null;
    }

    // 読み込んだ定義情報を返す。
    return defs;
}

// チェーン情報を取得する関数
export async function getChainInfo(chainInfoId) {

    // 定義情報を読み込む
    const defs = await getDefs();
    if(!defs) {
        return null;
    }

    // IDでチェーン情報を見つける。
    return findChainInfo(defs, chainInfoId);
}

// 転送元と転送先の情報を取得する関数
export async function getSrcDstData() {
    // 定義情報を取得する
    const defs = await getDefs();
    if(!defs) {
        return null;
    }

    // 転送元と転送先のデータを返す。
    return defs.nftTransfer.srcDstData;
}

// 支払連携の設定情報を取得する関数
export async function getPaymentRelayConfig() {

    // 定義情報を取得する
    const defs = await getDefs();
    if(!defs) {
        return null;
    }

    // 支払連携の設定情報を返す。
    return defs.paymentRelay.config;
}

// BC+のチェーン情報のIDの一覧を取得する関数
export async function getBcplusChainInfoIds() {

    // 定義情報を取得する
    const defs = await getDefs();
    if(!defs) {
        return [];
    }
    
    // チェーンの一覧を取得する。
    const chainDef = defs.chainDef;

    // BC+のチェーン情報のIDの一覧を抽出して返す。
    const bcplusChainInfoIds = chainDef.filter(chain => chain.type === 'BC+').map(chain => chain.id);
    return bcplusChainInfoIds;
}
