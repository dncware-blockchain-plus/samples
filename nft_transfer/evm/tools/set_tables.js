const chainDefFn = '../defs/chains.json';
const srcDstDefFn = '../defs/src-dst.json'

// NFT受領コントラクトの情報を格納したファイルの相対パス
const nftReceiverContractRelPath = 'nftReceiver.sol/NFTReceiver.json';


// 標準モジュールの読み込み
const fs = require('fs');

// 定義情報のユーティリティ関数を読み込む。
const { loadDefs } = require('../../relay/lib/common/defsUtil.js');

// EVM のユーティリティ関数をインポート
const { evmMakeContractWrapper, evmSend } = require('../../relay/lib/evm/evmUtil.js');
const { loadPrivateKey, evmNodeJsConnect, dumpStringLog } = require('../../relay/lib/evm/nodeJsEvmUtil.js');


// チェーン情報のテーブルを NFT 受領コントラクトにセットする関数
async function setChainInfoTbl(nftReceiverContractWrapper, chainDef) {
    const args = chainDef.map(chainInfo => [chainInfo.id, chainInfo.type, chainInfo.chainId]);
    const receipt = await evmSend(nftReceiverContractWrapper, 'setChainInfoTbl', [args]);
    dumpStringLog(nftReceiverContractWrapper, receipt.logs);
}

// 転送元と転送先のペアのテーブルを NFT 受領コントラクトにセットする関数
async function setSrcDstTbl(nftReceiverContractWrapper, srcDstData) {
    const args = srcDstData.map(srcDstInfo => [
        srcDstInfo.srcChainInfoId,
        srcDstInfo.srcNFTId,
        srcDstInfo.dstChainInfoId,
        srcDstInfo.dstNFTAddr        
    ]);
    const receipt = await evmSend(nftReceiverContractWrapper, 'setSrcDstTbl', [args]);
    dumpStringLog(nftReceiverContractWrapper, receipt.logs);
}

// チェーン情報のIDをセットする関数
async function setChainInfoId(nftReceiverContractWrapper, chainInfoId) {
    const receipt = await evmSend(nftReceiverContractWrapper, 'setChainInfoId', [chainInfoId]);
    dumpStringLog(nftReceiverContractWrapper, receipt.logs);
}

// テーブルをセットする関数
async function setTables() {

    // 秘密鍵をロードする。
    const privateKeyData = loadPrivateKey();

    // 転送元のチェーンの情報を取得する。
    const defs = await loadDefs();

    // type が "EVM" のチェーンの各々について
    for(const chainInfo of defs.chainDef) {
        if(chainInfo.type === 'EVM') {

            // 該当する NFT 受領コントラクトのアドレスを取得する。
            // NFT 受領コントラクトが定義されていないチェーンについては、何も行わない。
            const nftReceiver = chainInfo.nftReceiver;
            if(nftReceiver) {

                try {

                    // 転送先のチェーンに接続する。
                    const web3 = evmNodeJsConnect(chainInfo.urls);

                    // NFT 受領コントラクトのインスタンスのラッパを作成する。
                    const nftReceiverContractWrapper = await evmMakeContractWrapper(web3, privateKeyData.address, nftReceiver, nftReceiverContractRelPath);

                    // チェーン情報のテーブルを NFT 受領コントラクトにセットする。
                    await setChainInfoTbl(nftReceiverContractWrapper, chainDef);

                    // 転送元と転送先のペアのテーブルを NFT 受領コントラクトにセットする。
                    await setSrcDstTbl(nftReceiverContractWrapper, srcDstData);

                    // チェーン情報のIDをセットする。
                    await setChainInfoId(nftReceiverContractWrapper, chainInfo.id);

                } catch(e) {
                    console.error(e);
                }
            }
        }
    }
}


(async function(){

    try {
        await setTables();
    } catch(e) {
        console.log(e.message);
    }
})();