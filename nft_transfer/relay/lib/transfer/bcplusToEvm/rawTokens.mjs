'use strict';

// 他のファイルからのインポート
import { getChainInfo } from '../../common/defsUtil.mjs';
import { dbcpConnect } from '../../bcplus/bcplusUtil.mjs';
import { bcplusNftListTokens } from '../../bcplus/bcplusNFT.mjs';


// NFTリスティング用のコントラクト
const nftListContractName = 'listNFT';


// 転送元チェーン・NFTコレクション・トークンオーナーの組み合わせの各々について、
// BC+上のトークンのリストを格納したオブジェクト
// （三階層のオブジェクトであり、
// 　第一階層のキーが転送元チェーン情報ID、
// 　第二階層のキーが転送元NFTのコントラクトID、
//   第三階層のキーがトークンのオーナーのユーザーID、
// 　値がトークンのリスト）
const rawTokenListMap = {};


// 指定した転送元チェーン・NFTコレクション・トークンオーナーの組み合わせについて、
// BC+上のトークンのリストを取得する関数
export async function bcpGetRawTokenList(unlockedWallet, srcChainInfoId, srcNFTId, srcUserId, options = {}) {

    // オプションを取得する。
    const {
        update = false      // リストを更新するかどうか
    } = options;

    // リストを更新する場合は、BC+上のトークンのリストを取得して更新する。
    if(update) {
        await bcpUpdateRawTokenLists(unlockedWallet, srcChainInfoId, srcNFTId, srcUserId);
    }

    // 指定した転送元チェーン・NFTコレクション・トークンオーナーの組み合わせに対応するリストを返す。
    return rawTokenListMap[srcChainInfoId]?.[srcNFTId]?.[srcUserId] || [];
}

// 指定した転送元チェーン・NFTコレクション・トークンオーナーの組み合わせについて、
// BC+上のトークンのリストを更新する関数
export async function bcpUpdateRawTokenLists(unlockedWallet, srcChainInfoId, srcNFTId, srcUserId) {

    // 転送元チェーンに接続する。
    const srcChainInfo = await getChainInfo(srcChainInfoId);
    const rpc = await dbcpConnect(srcChainInfo.urls, srcChainInfo.chainId, unlockedWallet);

    // NFTリスティング用のコントラクトについて、ドメイン名付きのコントラクト名を作る。
    const nftListContractFullName = nftListContractName + '@' + srcChainInfo.domain;

    // チャンクごとのトークンリストを連結して、トークンのリストを作る。
    const rawTokens = await bcplusNftListTokens(rpc, unlockedWallet, nftListContractFullName, srcNFTId, srcUserId);

    // 転送元チェーン・NFTコレクション・トークンオーナーの組み合わせに対応するリストを保存する。
    if(!(srcChainInfo.id in rawTokenListMap)) {
        rawTokenListMap[srcChainInfo.id] = {};
    }
    if(!(srcNFTId in rawTokenListMap[srcChainInfo.id])) {
        rawTokenListMap[srcChainInfo.id][srcNFTId] = {};
    }
    rawTokenListMap[srcChainInfo.id][srcNFTId][srcUserId] = rawTokens;
}
