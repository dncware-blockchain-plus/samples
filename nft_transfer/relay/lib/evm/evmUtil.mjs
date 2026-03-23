'use strict';

// ライブラリのインポート
import Web3 from 'web3';

// 他のファイルからのインポート
import { fetchJSON } from '../common/fetchUtil.mjs';


// コントラクトデータのトップレベル URL
const contractsBase = '/evm-contracts';

// ERC721コントラクトの情報を格納したファイルの相対パス
const erc721ContractRelPath =  'common/sampleToken.sol/SampleToken.json';

// コントラクトの ABI のキャッシュ
const contractABICache = {};


// 指定URLのEVMチェーンに接続する関数
export function evmConnect(chainUrls) {
    const web3 = new Web3(chainUrls[0]);
    return web3;
}

// EVMチェーンへの接続のための WebSocket を閉じる関数
export function evmDisconnect(web3) {
    const provider = web3.currentProvider;
    if(provider && provider.disconnect) {
        try {
            provider.disconnect();
        } catch(disconnectError) {
        }
    }
}

// コントラクトの ABI を読み込む関数
export async function loadContractABI(contractRelPath) {

    // キャッシュにあればそれを返す。
    if(contractABICache[contractRelPath]) {
        return contractABICache[contractRelPath];
    }

    // キャッシュになければ読み込んでキャッシュに入れてから返す。
    const contractURL = `${contractsBase}/${contractRelPath}`;
    const contractData = await fetchJSON(contractURL);
    const abi = contractData.abi;
    contractABICache[contractRelPath] = abi;
    return abi;
}

// 指定ABIでコントラクトのインスタンスのラッパを作成する関数
export async function evmMakeContractWrapperWithABI(web3, evmWalletAddress, contractAddress, contractABI) {
   // コントラクトのインスタンスを作る。
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    // ラッパを作って返す。
    const contractWrapper = {
        contract: contract,
        contractAddress,
        walletAddress: evmWalletAddress,
        web3
    };
    return contractWrapper;
}

// コントラクトのインスタンスのラッパを作成する関数
export async function evmMakeContractWrapper(web3, evmWalletAddress, contractAddress, contractRelPath) {

    // コントラクトの ABI
    const contractABI = await loadContractABI(contractRelPath);

    // コントラクトのインスタンスのラッパを作成して返す。
    return await evmMakeContractWrapperWithABI(web3, evmWalletAddress, contractAddress, contractABI);
}

// ERC721コントラクトのインスタンスのラッパを作成する関数
export async function evmMakeERC721ContractWrapper(web3, evmWalletAddress, nftAddress) {
    return await evmMakeContractWrapper(web3, evmWalletAddress, nftAddress, erc721ContractRelPath);
}

// トランザクションを send する関数
// （※ asyncとなっていないがPromiseを返すので注意）
export function evmSend(contractWrapper, methodName, args, options = {}) {
    return contractWrapper.contract.methods[methodName](...args).send({from: contractWrapper.walletAddress});
}

// トランザクションを call する関数
// （※ asyncとなっていないがPromiseを返すので注意）
export function evmCall(contractWrapper, methodName, args) {
    return contractWrapper.contract.methods[methodName](...args).call();
}

// 関数呼び出しのデータをエンコードする関数
export function evmEncodeCallData(contractWrapper, methodName, args) {
    return contractWrapper.contract.methods[methodName](...args).encodeABI();
}

// uint256値をBase64エンコードする関数
export function encodeUint256InBase64(value) {
    const bn = BigInt(value);
    let hex = bn.toString(16);
    if(hex.length % 2 === 1) {
        hex = '0' + hex;
    }
    const byteLength = hex.length / 2;
    const byteArray = new Uint8Array(32);
    for(let i = 0; i < byteLength; i++) {
        byteArray[32 - byteLength + i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    const base64 = btoa(String.fromCharCode(...byteArray));
    return base64;
}

// Base64エンコードされたuint256値をデコードする関数
export function decodeUint256FromBase64(base64) {
    const byteString = atob(base64);
    let hex = '';
    for(let i = 0; i < byteString.length; i++) {
        const byte = byteString.charCodeAt(i);
        let byteHex = byte.toString(16);
        if(byteHex.length % 2 === 1) {
            byteHex = '0' + byteHex;
        }
        hex += byteHex;
    }
    const bn = BigInt('0x' + hex);
    return bn.toString();
}
