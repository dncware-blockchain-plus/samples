'use strict';

// 他のファイルからのインポート
import { getChainInfo } from '../../lib/common/defsUtil.mjs';
import { evmMakeERC721ContractWrapper, evmConnect, evmCall } from '../../lib/evm/evmUtil.mjs';


// EVM互換チェーン上のNFTコレクションの表示名を取得するためのマップを作る関数
export async function makeEvmNftNameMap(nftAddrs, chainInfoId) {

    // デフォルトでは、アドレスをそのまま表示名とする。
    const selectableNFTNameMap = {};
    for (const addr of nftAddrs) {
        selectableNFTNameMap[addr] = addr;
    }

    try {
        // チェーンのIDが指定されていない場合は、マップの作製を中断する。
        if(!chainInfoId) {
            throw new Error('Chain info ID is not specified.');
        }

        // チェーン情報を取得する。
        const chainInfo = await getChainInfo(chainInfoId);

        // EVMウォレットのアドレス（※実際には使わない値なのでnullを設定する。）
        const evmWalletAddress = null;
        
        // 指定されたチェーンに接続する。
        const web3 = evmConnect(chainInfo.urls);

        // ＮＦＴのＩＤの候補の各々について、
        for(const nftAddr of nftAddrs) {

            // ＮＦＴの表示名が得られる場合は、マップに追加する。
            try {
                const nftContractWrapper = await evmMakeERC721ContractWrapper(web3, evmWalletAddress, nftAddr);
                const nftName = await evmCall(nftContractWrapper, 'name', []);
                selectableNFTNameMap[nftAddr] = `${nftName} - ${nftAddr}`;
            } catch(e) {
            }
        }
    } catch(e) {
    }

    // 作ったマップを返す。
    return selectableNFTNameMap;
}
