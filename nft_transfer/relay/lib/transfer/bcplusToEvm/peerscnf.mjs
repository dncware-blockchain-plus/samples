'use strict';

// 他のファイルからのインポート
import { getPeerscnfUpdates, convertPeerscnfForEVM, convertASignatureForEVM } from './proofs.mjs';
import { evmCall, evmSend } from '../../evm/evmUtil.mjs';



// EVM に転送済みの最新のピア構成の更新番号を取得する関数
export async function getLatestFetchedV(receiverContractWrapper) {
    return Number(await evmCall(receiverContractWrapper, 'getLatestFetchedV', []));
}

// 指定された更新番号への更新元の peerscnf の更新番号を取得する関数
async function getBaseV(receiverContractWrapper, V) {
    return Number(await evmCall(receiverContractWrapper, 'getBaseV', [V]));
}

// 指定された更新番号の peerscnf への更新を行う関数
export async function updatePeerscnf(rpc, uw, receiverContractWrapper, V) {

    // ブロックのSPVが要求する peerscnf への更新元のピア構成の番号、またはブロックのSPVが要求する peerscnf そのもののピア構成の番号を取得する。
    const baseV = await getBaseV(receiverContractWrapper, V);

    // peerscnf の更新情報を取得する。
    const peerscnfUpdates = await getPeerscnfUpdates(rpc, baseV, V);

    // peerscnf の更新情報を１個ずつ、検証・適用する。
    let oldV = baseV; // 更新元の更新番号
    for (const newcnf of peerscnfUpdates) {

        // 引数を EVM に渡す形式に変換する。
        const newcnfForEVM = convertPeerscnfForEVM(newcnf.peerscnf);
        const signaturesForEVM = newcnf.signatures.map(sig => convertASignatureForEVM(sig));

        // peerscnf の更新の検証・適用をリクエストする。
        const res = await evmSend(receiverContractWrapper, 'receiveAPeerscnfUpdate', [
            oldV, newcnfForEVM, signaturesForEVM
        ]);

        // 更新元の更新番号を更新する。
        oldV = newcnf.peerscnf.V;
    }
}
