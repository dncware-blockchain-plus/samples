'use strict';

import { evmMakeContractWrapperWithABI, evmCall, evmSend } from './evmUtil.mjs';
import { evmTokenAbi } from './evmTokenAbi.mjs';


// 指定ウォレットが指定NFTコントラクトで保有するトークンのリストを取得する関数
export async function evmGetTokens(web3, walletAddress, nftAddr) {

    // ウォレットアドレスまたはNFTコントラクトのアドレスが指定されていない場合は、空リストを返す。
    if (!walletAddress || !nftAddr) {
        return [];
    }

    // NFTコントラクトのインスタンスのラッパを作成する。
    const nftContractWrapper = await evmMakeContractWrapperWithABI(web3, walletAddress, nftAddr, evmTokenAbi);

    // 保有トークン数を取得する。
    const numTokens = Number(await evmCall(nftContractWrapper, 'balanceOf', [walletAddress]));

    // トークンIDとトークンURLを取得して、トークン番号とまとめたオブジェクトのリストを作って返す。
    const tokenIndices = [...Array(numTokens).keys()];
    const tokens = await Promise.all(
        tokenIndices.map(
            async index => {
                const tokenId = await evmCall(nftContractWrapper, 'tokenOfOwnerByIndex', [walletAddress, index]);
                const tokenURI = await evmCall(nftContractWrapper, 'tokenURI', [tokenId]);
                let tokenOrigin = undefined;
                try {
                    tokenOrigin = await evmCall(nftContractWrapper, 'getTokenOrigin', [tokenId]);
                } catch(err) {
                    // getTokenOrigin関数が存在しない場合は無視して tokenOrigin = undefined のままにする。                     
                }
                const tokenIdStr = tokenId.toString();
                return { index, id: tokenIdStr, uri: tokenURI, origin: tokenOrigin };
            }
        )
    );
    return tokens;
}

// 指定アドレスに、指定のトークンを移転する許可を与える関数
export async function approveTransfer(web3, walletAddress, nftAddr, approveeAddr, tokenId) {

    // NFTコントラクトのインスタンスのラッパを作成する。
    const nftContractWrapper = await evmMakeContractWrapperWithABI(web3, walletAddress, nftAddr, evmTokenAbi);

    // approveメソッドを呼び出す。
    const receipt = await evmSend(nftContractWrapper, 'approve', [
        approveeAddr, tokenId
    ]);
}
