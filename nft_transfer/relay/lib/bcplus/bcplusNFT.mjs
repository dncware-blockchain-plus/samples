'use strict';

// 他のファイルからのインポート
import { dbcpCallContract } from './bcplusUtil.mjs';


// NFTリスティングでのチャンクサイズ
const nftListChunkSize = 50;


// 指定したNFTコントラクトとトークンオーナーの組み合わせについて、ＮＦＴのトークンのリストを取得する関数
export async function bcplusNftListTokens(rpc, unlockedWallet, nftListContractId, nftId, owner) {

    // チャンクごとに取得したトークンリストのリスト
    const chunks = [];

    try {

        // 最初のチャンクのトークンと、２個目のチャンクの始点と、トークンの総数を取得する。
        const {
            tokens: firstTokens,
            nextStart: secondStart,
            numToken
        } = await dbcpCallContract(rpc, unlockedWallet, nftListContractId, {
            nftId,
            owner,
            start: 0,
            chunkSize: nftListChunkSize
        }, {
            readmode: 'fast'
        });

        // 最初のチャンクのトークンをチャンクのリストに追加する。
        chunks.push(firstTokens);

        // ２個目以降のチャンクがある場合、
        if(secondStart) {

            // ２個目以降のチャンクの取得のためのリクエストを発行する。
            const promisses = [];
            for(let start = secondStart; start < numToken; ) {
                const end = Math.min(numToken, start + nftListChunkSize);
                const promiss = dbcpCallContract(rpc, unlockedWallet, nftListContractId, {
                    nftId,
                    owner,
                    start,
                    chunkSize: nftListChunkSize
                }, {
                    readmode: 'fast'
                });
                promisses.push(promiss);
                start = end;
            }
            // 発行したリクエストの処理完了を待ち、チャンクごとのトークンリストを取得する。
            const results = await Promise.all(promisses);

            // 取得したチャンクからトークンリストを抽出する。
            for(const result of results) {
                chunks.push(result.tokens);
            }
        }

    } catch(e) {
        console.log(String(e));
    }

    // チャンクごとのトークンリストを連結することで、トークンのリストを作って返す。
    const tokens = chunks.flat();
    return tokens;
}
