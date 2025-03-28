//
// 型定義をまとめたライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;


library Types {

    // ピア
    struct Peer {
        string          id;
        bool            authority;
        string          host;
        uint            port;
        string          pubkey;
        string          pubkey2;
        string          url;
    }

    // peersconf.cnf
    struct Cnf {
        uint            minor_version;
        uint            blkno;
        string          hash64;
        uint            V;
        uint            N;
        uint            F;
        uint            B;
        uint            max_block_txids;
        uint            maxlen_pack;
        uint            relative_blkseq_cleansing;
        string          v4hash64;
    }

    // peersconf
    struct Peerscnf {
        uint            V;
        uint            NF;
        string          cnfstr;
        Cnf             cnf;
        uint            blkno;
        string          hash64;
        Peer[]          peers;          // マッピングを Javascript から渡すことができないので配列として実装
        string []       pids;
        string []       authorities;
    }

    // トランザクション
    struct Transaction {
        uint            blkno;
        uint64          time;
        string          txid;
        string          addr;
        string          caller;
        string          callee;
        string          status;
        uint            txno;
        uint            caller_txno;
        string          argstr;
        string          valuestr;
        uint            subtxs;
        uint            steps;
        string[]        disclosed_to;
        string[]        related_to;
        string[]        cur_disclosed_to;
        bytes           pack;
    }

    // トランザクションの引数
    struct TxArgs {
        string          messageType;
        string          dstChainInfoId;
        string          srcNFTId;
        string          orgTokenId;
        string          orgOwner;
        string          tokenURI;
        string          dstNFTAddr;
        string          dstWalletAddr;
    }

    // rootinfo の要素
    struct RootElem {
        uint            num;        // arr.length == 0 なら num の方が有効
        bytes           arr;        // arr.length != 0 なら arr の方が有効
    }

    // ピアごとのブロックの署名
    struct Sig {
        string          origin;
        bytes           signature;
    }

    // int または string を入れる構造体
    struct IntOrString {
        int             num;        // str の長さが０なら num が有効
        string          str;        // str の長さが０より大きいなら str が有効
    }

    // ブロックSPV
    struct BlockSPV {
        uint            V;
        RootElem[]      rootinfo;
        Sig[]           sigs;
        bytes[][]       blkproof;
        IntOrString[]   blkinfo;
    }


    // 公開鍵のデータ
    struct PublicKeyData {
        string          peerId;
        bytes[2]        keys;
    }


    // 署名１個
    struct SignatureData {
        string          peerId;
        bytes           signature;
    }
}
