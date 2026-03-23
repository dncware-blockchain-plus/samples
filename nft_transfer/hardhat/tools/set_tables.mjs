// set_tables.js
//
// このスクリプトは、NFT 受領コントラクトにチェーン情報のテーブルと転送元と転送先のペアのテーブルをセットするためのものです。
// 
// 用法：
//   node set_tables.js [chainInfoId]*
'use strict';

// NFT受領コントラクトの情報を格納したファイルの相対パス
const nftReceiverContractRelPath = 'receiver/nftReceiver.sol/NFTReceiver.json';


// 定義情報のユーティリティ関数を読み込む。
import { getDefs } from '../../relay/lib/common/defsUtil.mjs';

// EVM のユーティリティ関数をインポート
import { evmMakeContractWrapper, evmConnect } from '../../relay/lib/evm/evmUtil.mjs';
import { loadPrivateKeys, evmSignAndSend, dumpStringLog } from '../../relay/lib/evm/nodeJsEvmUtil.mjs';


// チェーン情報のIDのセットをコマンドライン引数から取得する。
const chainInfoIds = process.argv.length > 2 ? process.argv.slice(2) : null;


// チェーン情報のテーブルを NFT 受領コントラクトにセットする関数
async function setChainInfoTbl(contractWrapper, privateKey, chainDef) {
    const args = chainDef.map(chainInfo => [chainInfo.id, chainInfo.type, chainInfo.chainId]);
    const receipt = await evmSignAndSend(contractWrapper, 'setChainInfoTbl', [args], privateKey);
    dumpStringLog(contractWrapper, receipt.logs);
}

// 転送元と転送先のペアのテーブルを NFT 受領コントラクトにセットする関数
async function setSrcDstTblToReceiver(chainInfoId, nftReceiverContractWrapper, privateKey, srcDstData) {
    const args = srcDstData
        .filter(srcDstInfo => srcDstInfo.dstChainInfoId === chainInfoId)
        .map(srcDstInfo => [
            srcDstInfo.srcChainInfoId,
            srcDstInfo.srcNFTId,
            srcDstInfo.dstChainInfoId,
            srcDstInfo.dstNFTAddr        
        ]);
    const receipt = await evmSignAndSend(nftReceiverContractWrapper, 'setSrcDstTbl', [args], privateKey);
    dumpStringLog(nftReceiverContractWrapper, receipt.logs);
}

// チェーン情報のIDをセットする関数
async function setChainInfoId(nftReceiverContractWrapper, privateKey, chainInfoId) {
    const receipt = await evmSignAndSend(nftReceiverContractWrapper, 'setChainInfoId', [chainInfoId], privateKey);
    dumpStringLog(nftReceiverContractWrapper, receipt.logs);
}

// NFT受領コントラクトがあれば、それにテーブルをセットする関数
async function setTableToReceiver(defs, chainInfo, privateKey, address) {

    // 該当する NFT 受領コントラクトのアドレスを取得する。
    // NFT 受領コントラクトが定義されていないチェーンについては、何も行わない。
    const nftReceiver = chainInfo.nftReceiver;
    if(nftReceiver) {

        try {

            // 転送先のチェーンに接続する。
            const web3 = evmConnect(chainInfo.urls);

            // NFT 受領コントラクトのインスタンスのラッパを作成する。
            const nftReceiverContractWrapper = await evmMakeContractWrapper(web3, address, nftReceiver, nftReceiverContractRelPath);

            // チェーン情報のテーブルを NFT 受領コントラクトにセットする。
            console.log('    Setting chain info table...');
            await setChainInfoTbl(nftReceiverContractWrapper, privateKey, defs.chainDef);
            console.log('    done');

            // 転送元と転送先のペアのテーブルを NFT 受領コントラクトにセットする。
            console.log('    Setting src-dst table...');
            await setSrcDstTblToReceiver(chainInfo.id, nftReceiverContractWrapper, privateKey, defs.nftTransfer.srcDstData);
            console.log('    done');

            // チェーン情報のIDをセットする。
            console.log('    Setting chain info ID...');
            await setChainInfoId(nftReceiverContractWrapper, privateKey, chainInfo.id);
            console.log('    done');

        } catch(e) {
            console.error(e);
        }
    }
}

// テーブルをセットする関数
async function setTables() {

    // 秘密鍵をロードする。
    const privateKeys = loadPrivateKeys();

    // 転送元のチェーンの情報を取得する。
    const defs = await getDefs();

    // type が "EVM" のチェーンの各々について
    for(const chainInfo of defs.chainDef) {
        if(chainInfo.type === 'EVM') {

            // チェーン情報のIDがコマンドライン引数で指定されている場合は、指定されたIDと一致するチェーン情報のみを処理する。
            if(!chainInfoIds || chainInfoIds.includes(chainInfo.id)) {

                // テーブルをセットするチェーンのIDを表示する。
                console.log(`Setting tables for chain: ${chainInfo.id}`);

                // チェーンに対応する秘密鍵を取得する。
                const { privateKey, address } = privateKeys[chainInfo.id];

                // NFT受領コントラクトがあれば、それにテーブルをセットする。
                console.log('  Setting tables for receiver...');
                await setTableToReceiver(defs, chainInfo, privateKey, address);
                console.log('  done');
            }
        }
    }
}


try {
    await setTables();
} catch(e) {
    console.log(e.message);
}
