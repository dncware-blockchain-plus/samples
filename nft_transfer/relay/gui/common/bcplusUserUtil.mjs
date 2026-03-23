'use strict';

// 他のファイルからのインポート
import { getLocalStorage, setLocalStorage } from './localStorage.mjs';
import { unlockedWallet } from './bcplusUnlockedWallet.mjs';
import { dbcpConnect, dbcpGetUserList, dbcpGetWalletUser } from '../../lib/bcplus/bcplusUtil.mjs';
import { getChainInfo } from '../../lib/common/defsUtil.mjs';


// 指定したチェーンについて、選択可能なユーザのリストを取得する関数
export async function getUserList(chainInfoId) {

    // ウォレットまたはチェーン情報のIDが指定されていない場合は、空のリストを返す。
    if(!unlockedWallet || !chainInfoId) {
        return [];
    }

    // 指定されたチェーンの情報を取得する。
    const chainInfo = await getChainInfo(chainInfoId);

    // BC+のRPCノードに接続する。
    const rpc = await dbcpConnect(chainInfo.urls, chainInfo.chainId, unlockedWallet);

    // ユーザのリストを取得して返す。
    const users = await dbcpGetUserList(rpc, unlockedWallet, {});
    return users;
}

// 転送元ユーザの設定を更新する関数
export async function updateSrcUserId() {
    
    // 現在選択されている転送元のチェーンを取得する。
    const chainInfoId = getLocalStorage('srcChainInfoId');

    // 指定されたチェーンの情報を取得する。
    const chainInfo = await getChainInfo(chainInfoId);

    // BC+のRPCノードに接続する。
    const rpc = await dbcpConnect(chainInfo.urls, chainInfo.chainId, unlockedWallet);

    // ウォレットに関連付けられたユーザのIDを取得する。
    const user = await dbcpGetWalletUser(rpc, unlockedWallet);
    const userId = user[0];

    // ユーザのIDをローカルストレージに保存する。
    setLocalStorage('srcUserId', userId);
}
