'use strict';

// 他のファイルからのインポート
import { makeBcplusNftNameMap } from './bcplusNftNameMap.mjs';
import { makeEvmNftNameMap } from './evmNftNameMap.mjs';
import { getChainInfo } from '../../lib/common/defsUtil.mjs';
import { removeRedundantObjectInArray } from '../../lib/common/arrayUtil.mjs';


// NFTコレクションの表示名を取得するためのマップを作る関数
// 
// 引数：
//  nftChainPairs: {chainInfoId, nftAddrOrId}  の配列
export async function makeNftNameMap(nftChainPairs) {

    // チェーン情報IDのリストを作る。
    const chainInfoIds = removeRedundantObjectInArray(nftChainPairs.map(pair => pair.chainInfoId));

    // チェーンごとにNFTコレクションをグループ化する。
    const chainToNfts = Object.fromEntries(
        chainInfoIds.map(chainInfoId => [
            chainInfoId,
            nftChainPairs.filter(pair => pair.chainInfoId === chainInfoId).map(pair => pair.nftAddrOrId)
        ])
    );

    // チェーンごとにNFTコレクションの表示名マップを作成し、合成する。
    const chainToNftNameMapEntries = (await Promise.all(
        Object.entries(chainToNfts).map(async ([chainInfoId, nftAddrsOrIds]) => {
            const nftNameMap = await makeNftNameMapForChain(chainInfoId, nftAddrsOrIds);
            return Object.entries(nftNameMap);
        })
    )).flat();
    const nftNameMap = Object.fromEntries(chainToNftNameMapEntries);

    // 完成したマップを返す。
    return nftNameMap;
}

// 指定されたチェーンのNFTコレクションの表示名マップを作る関数
async function makeNftNameMapForChain(chainInfoId, nftAddrsOrIds) {

    // チェーンのIDが指定されていない場合は、空のマップを返す。
    if(!chainInfoId) {
        return {};
    }

    // チェーン情報を取得する。
    const chainInfo = await getChainInfo(chainInfoId);

    // チェーンがBC+かEVM互換チェーンかで場合分けする。
    if(chainInfo.type === 'BC+') {
        return makeBcplusNftNameMap(nftAddrsOrIds, chainInfoId);
    } else if(chainInfo.type === 'EVM') {
        return makeEvmNftNameMap(nftAddrsOrIds, chainInfoId);
    } else {
        throw new Error(`${chainInfoId}: Unsupported chain type: ${chainInfo.type}`);
    }
}
