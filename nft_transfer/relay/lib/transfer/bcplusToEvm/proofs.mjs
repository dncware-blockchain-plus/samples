'use strict';

// BC+のAPIの読み込み
import * as dbcpApi from 'dncware-blockchain-api';

// 他のファイルからのインポート
import { decodeBase64 } from '../primitives.mjs';


// peerscnf を EVM に渡す形式に変換する関数
export function convertPeerscnfForEVM(peerscnf) {
    const evmPeerscnf = { ...peerscnf };

    // マッピングが渡せないので、配列に変換する
    evmPeerscnf.peers = Array.from(peerscnf.peers.values());

    return evmPeerscnf;
}

// transaction を EVM に渡す形式に変換する関数
function convertTransactionForEVM(transaction) {
    const members = [
        'blkno', 'time', 'txid', 'addr', 'caller', 'callee', 'status',
        'txno', 'caller_txno', 'argstr', 'valuestr', 'subtxs', 'steps',
        'disclosed_to', 'related_to', 'pack'
    ];
    const evmTransaction = members.map(key => {
        let value = transaction[key]
        if(!value) {
            if((key === 'addr') || (key === 'txid')) {
                value = '';
            } else if(key === 'pack') {
                value = new Uint8Array(0);
            }
        }
        return value;
    });
    return evmTransaction;
}

// argstr をデコードして、文字列の配列に変換する関数
function decodeArgsForEVM(argstr) {
    return Object.values(JSON.parse(argstr));
}

// proof を EVM に渡す形式に変換する関数
function convertProofForEVM(proof) {
    return proof.map(p => p.map(q => (q === null) ? [] : Array.from(q)));
}

// rootinfo を EVM に渡す形式に変換する関数
function convertRootinfoForEVM(rootinfo) {
    if(rootinfo) {
        return rootinfo.map(elem => (
            (typeof(elem) === 'number') ? { num: elem, arr: [] } : { num: 0, arr: elem }
        ));
    } else {        // undefined の場合は、空の配列を返す。
        return [];
    }
}

// sigs を EVM に渡す形式に変換する関数
function convertSigsForEVM(sigs) {
    if(sigs) {
        return sigs.map(sig => ({ origin: sig[0], signature: sig[1] }))
    } else {        // undefined の場合は、空の配列を返す。
        return [];
    }
}

// blkproof を EVM に渡す形式に変換する関数
function convertBlkproofForEVM(blkproof) {
    if(blkproof) {
        return convertProofForEVM(blkproof);
    } else {        // undefined の場合は、空の配列を返す。
        return [];
    }
}

// blkinfo を EVM に渡す形式に変換する関数
function convertBlkinfoForEVM(blkinfo) {
    if(blkinfo) {
        return blkinfo.map(elem => (typeof(elem) === 'string') ?  { num: 0, str: elem } : { num: elem, str: '' });
    } else {// undefined の場合は、空の配列を返す。
        return [];
    }
}

// blockSPV を EVM に渡す形式に変換する関数
function convertBlockSPVForEVM(blockSPV) {
    const rootinfo = convertRootinfoForEVM(blockSPV.rootinfo);
    const sigs = convertSigsForEVM(blockSPV.sigs);
    const blkproof = convertBlkproofForEVM(blockSPV.blkproof);
    const blkinfo = convertBlkinfoForEVM(blockSPV.blkinfo);
    return { V: blockSPV.V, rootinfo, sigs, blkproof, blkinfo };
}

// 署名１個を EVM に渡す形式に変換する関数
export function convertASignatureForEVM(sig) {
    return {
        peerId: sig[0],
        signature: decodeBase64(sig[1])
    };
}

// base64 でエンコードされたトランザクションプルーフをデコードする関数
function decodeTransactionProof(proof64) {
    const proof = proof64.map(p => p.map(x => x ? decodeBase64(x) : null));
    return proof;
}

// トランザクションの情報を取得する関数
async function getTransactionData(rpc, txno) {
    let succeeded = false;

    let txHash = null;
    let proof = null;
    let blockNo = null;
    let blockHash = null;

    // いずれかのピアからの応答が得られるまで繰り返す。
    const sockets = rpc.sockets.values();
    const chainID = rpc.chainID;
    for(const socket of sockets) {

        // トランザクションハッシュを取得する
        const txResp = await dbcpApi.fetchTxHash(socket, txno);
        if(txResp.status !== 'ok') {
            continue;
        }
        txHash = decodeBase64(txResp.hash64);

        // トランザクションのSPVを取得
        const { proof: proof64, blockref } = await dbcpApi.fetchTxSPV(socket, txno);
        blockNo = blockref.no;
        blockHash = decodeBase64(blockref.hash);

        // base64 でエンコードされたトランザクションプルーフをデコードする。
        proof = decodeTransactionProof(proof64);        

        succeeded = true;
        break;
    }

    return {
        txHash,
        proof,
        blockNo,
        blockHash
    };
}

// ブロックのSPVを取得する関数
async function getBlockSPV(rpc, blockNo, V, verbose) {
    let blockSPV = null;

    // いずれかのピアからの応答が得られるまで繰り返す。
    const sockets = rpc.sockets.values();
    const chainID = rpc.chainID;
    for(const socket of sockets) {

        // base64 でエンコードされた SPV を取得する。
        const blockSPV64 = await dbcpApi.fetchBlockSPV(socket, blockNo, V);
        if(verbose) console.log(`blockSPV64=${JSON.stringify(blockSPV64, null, 2)}`);

        // base64 でエンコードされていない SPV への変換を開始
        const curBlockSPV = {};

        // base64 でエンコードされた rootinfo があれば、デコードして変換結果にセットする。
        if(blockSPV64.rootinfo) {
            const rootinfo64 = blockSPV64.rootinfo;
            curBlockSPV.rootinfo = rootinfo64.map(x => (typeof x === 'number') ? x : decodeBase64(x));
        }

        // base64 でエンコードされた sigs があれば、デコードして変換結果にセットする。
        if(blockSPV64.sigs) {
            const sigs64 = blockSPV64.sigs;
            curBlockSPV.sigs = sigs64.map(sig => {
                const [origin, signature64] = sig;
                return [origin, decodeBase64(signature64)];
            });
        }

        // V があればコピーする。
        if(blockSPV64.V) {
            curBlockSPV.V = blockSPV64.V;
        }

        // base64 でエンコードされたプルーフがあれば、デコードして変換結果にセットする。
        if(blockSPV64.blkproof) {
            const blkproof64 = blockSPV64.blkproof;
            curBlockSPV.blkproof = blkproof64.map(p => p.map(x => x ? decodeBase64(x) : null));
        }

        // blkinfo があれば、コピーする。
        if(blockSPV64.blkinfo) {
            curBlockSPV.blkinfo = blockSPV64.blkinfo;
        }

        // ブロックSPVが取得できたのでループを抜ける。
        blockSPV = curBlockSPV;
        break;
    }

    // base64 でエンコードされていない SPV を返す。
    return blockSPV;
}

// トランザクションの検証に必要な情報を取得する関数
export async function getTransactionProofs(rpc, tx, latestFetchedV) {

    const { txHash, proof, blockNo, blockHash } = await getTransactionData(rpc, tx.txno);

    const blockSPV = await getBlockSPV(rpc, blockNo, latestFetchedV);
    const V = blockSPV.V;

    const evmTransaction = convertTransactionForEVM(tx);
    const txArgs = decodeArgsForEVM(tx.argstr);
    const evmProof = convertProofForEVM(proof);
    const evmBlockSPV = convertBlockSPVForEVM(blockSPV);
    
    const txProof =  [
        evmTransaction,             // transaction
        txArgs,                     // txArgs
        txHash,                     // txHash
        evmProof,                   // proof
        blockNo,                    // blockNo
        blockHash,                  // blockHash
        evmBlockSPV                 // blockSPV
    ];

    return {
        txProof,
        V
    };
}

// 指定された更新番号の peerscnf を取得する関数
async function getPeerscnfAndSignatures(rpc, V) {
    let peerscnf = null;
    let signatures = null;

    // いずれかのピアからの応答が得られるまで繰り返す。
    const sockets = rpc.sockets.values();
    for(const socket of sockets) {
        try {
            const { cnfstr, signatures: curSignatures } = await dbcpApi.fetchCnfstr(socket, V);
            peerscnf = await dbcpApi.loadPeersCnf(cnfstr);
            signatures = curSignatures;
            break;
        } catch(error) {
        }
    }

    return { peerscnf, signatures };
}

// peerscnf の更新情報を取得する関数
export async function getPeerscnfUpdates(rpc, baseV, V) {
    const peerscnfUpdates = [];
    let lastV = baseV;
    while(lastV < V) {
        const { peerscnf, signatures } = await getPeerscnfAndSignatures(rpc, lastV + 1);
        peerscnfUpdates.push({ peerscnf, signatures });
        lastV = peerscnf.V;
    }
    return peerscnfUpdates;
}
