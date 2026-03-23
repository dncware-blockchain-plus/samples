'use strict';

// 他のファイルからのインポート
import { getChainInfo } from '../../lib/common/defsUtil.mjs';
import { dbcpConnect, dbcpCallContract } from '../../lib/bcplus/bcplusUtil.mjs';


// 代理設定ができているか確認する関数
// （代理設定が行われている場合は元のＥＶＭウォレットのアドレスを、行われていない場合は null を返す。）
export async function checkProxySettings(unlockedWallet, bcplusChainInfoId) {
    let evmWalletAddress = null;

    // BC+のチェーンが選択されており、かつアンロックされたウォレットが存在する場合は、代理設定ができているか確認する。
    if(unlockedWallet && bcplusChainInfoId) {

        // 選択されたBC+のチェーンのチェーン情報を取得する。
        const chainInfo = await getChainInfo(bcplusChainInfoId);

        // 選択されたチェーンに接続する。
        const rpc = await dbcpConnect(chainInfo.urls, chainInfo.chainId, unlockedWallet);

        // ウォレットに対応するユーザIDを取得する。
        const { user } = await dbcpCallContract(
            rpc, unlockedWallet, 'c1query', {
                type: 'a_wallet'
            }
        );

        // ユーザIDに対応付けられたウォレットIDの一覧を取得する。
        const { wallets } = await dbcpCallContract(
            rpc, unlockedWallet, 'c1query', {
                type: 'a_user',
                id: user[0]
            }
        );

        // 代理設定が行われたEVMウォレットアドレスがあれば取得する。
        // 代理設定が行われたEVMウォレットアドレスが得られた場合、代理設定ができていると判定。
        const evmWalletAddresses = wallets.filter(walletId => walletId.startsWith('0x'));
        if(evmWalletAddresses.length >= 1) {
            evmWalletAddress = evmWalletAddresses[0];
        }
    }

    // 代理設定が行われている場合は元のＥＶＭウォレットのアドレスを、
    // 行われていない場合は null を返す。
    return evmWalletAddress;
}
