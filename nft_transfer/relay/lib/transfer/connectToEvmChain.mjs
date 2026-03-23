'use strict';

// 他のファイルからのインポート
import { getChainInfo } from '../common/defsUtil.mjs';
import { evmConnect } from '../evm/evmUtil.mjs';

// EVMチェーンに接続する関数
export async function connectToEvmChain(dstChainInfoId) {

    // チェーン情報を取得する。
    const chainInfo = await getChainInfo(dstChainInfoId);
            
    // チェーンに接続する。
    const web3 = evmConnect(chainInfo.urls);

    // Web3 のオブジェクトを返す。
    return web3;
}
