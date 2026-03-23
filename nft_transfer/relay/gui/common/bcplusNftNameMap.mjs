'use strict';

// 他のファイルからのインポート
import { getChainInfo } from '../../lib/common/defsUtil.mjs';
import { dbcpConnect, dbcpCallContract } from '../../lib/bcplus/bcplusUtil.mjs';
import { unlockedWallet } from './bcplusUnlockedWallet.mjs';


// BC+上のNFTコレクションの表示名を取得するためのマップを作る関数
export async function makeBcplusNftNameMap(nftIds, chainInfoId) {

    // デフォルトでは、IDをそのまま表示名とする。
    const selectableNFTNameMap = {};
    for (const id of nftIds) {
        selectableNFTNameMap[id] = id;
    }

    try {
        // チェーンのIDが指定されていない場合は、マップの作製を中断する。
        if(!chainInfoId) {
            throw new Error('Chain info ID is not specified.');
        }

        // チェーン情報を取得する。
        const chainInfo = await getChainInfo(chainInfoId);
        
        // 指定されたチェーンに接続する。
        const rpc = await dbcpConnect(chainInfo.urls, chainInfoId, unlockedWallet);

        // ＮＦＴのＩＤの候補の各々について、
        for(const nftId of nftIds) {

            // ＮＦＴの表示名が得られる場合は、マップに追加する。
            try {
                const resp = await dbcpCallContract(
                    rpc, unlockedWallet, nftId, {
                        method: 'name',
                        params: []
                    },
                    {}
                );
                if(resp.status !== 'ok') {
                    throw new Error(`Failed to get NFT name for ID ${nftId}: ${resp.error}`);
                }
                const nftName = resp.value;
                selectableNFTNameMap[nftId] = `${nftName} - ${nftId}`;
            } catch(e) {
            }
        }
    } catch(e) {
    }

    // 作ったマップを返す。
    return selectableNFTNameMap;
}
