//
// ブロックSPVの検証に関わる関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Types.sol";
import "./Primitives.sol";
import "./Utils.sol";
import "./VerificationCommon.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";


library BlockSPV {

    // 整数と文字列が混じった配列の内容をJSON化する関数
    function encodeIntStrArrayInJSON(Types.IntOrString[] memory arr) private pure returns (string memory) {

        string memory jsonStr = "[";
        for(uint i = 0; i < arr.length; i ++) {
            if(i != 0) {
                jsonStr = Utils.concatenateString(jsonStr, ',');
            }
            Types.IntOrString memory a = arr[i];
            if(Utils.strlen(a.str) == 0) {
                jsonStr = Utils.concatenateString(jsonStr, Utils.intToString(a.num)); // a の中身は num
            } else {
                jsonStr = Utils.concatenateString(jsonStr, "\""); // a の中身は str
                jsonStr = Utils.concatenateString(jsonStr, a.str);
                jsonStr = Utils.concatenateString(jsonStr, "\"");
            }
        }
        jsonStr = Utils.concatenateString(jsonStr, ']');
        return jsonStr;
    }

    // ３２ビットの整数値を bytes にリトルエンディアンで書き込む関数
    function writeUint32LE(bytes memory bin, uint pos, uint32 val) private pure returns(uint) {
        require(pos + 4 <= bin.length, "Out of bounds");
        bin[pos] = bytes1(uint8(val));
        bin[pos + 1] = bytes1(uint8(val >> 8));
        bin[pos + 2] = bytes1(uint8(val >> 16));
        bin[pos + 3] = bytes1(uint8(val >> 24));
        return pos + 4;
    }

    // 指定されたバイト列を書き込む関数
    function writeBytes(bytes memory bin, uint pos, bytes memory data) private pure returns(uint) {
        for(uint i = 0; i < data.length; i ++) {
            bin[pos] = data[i];
            pos ++;
        }
        return pos;
    }

    // uint8array のリストをバイト列に変換する関数
    function composeUint8Arrays(bytes[] memory arr) private pure returns(bytes memory) {

        // 変換後のバイト数を算出
        uint size = (arr.length + 1) * 4;
        for(uint i = 0; i < arr.length; i ++) {
            size += arr[i].length;
        }

        // 変換結果を格納するバッファを確保
        bytes memory bin = new bytes(size);

        // リスト中の配列の各々の長さをヘッダ情報としてエンコード
        uint pos = 0;
        pos = writeUint32LE(bin, pos, (uint32)(arr.length));
        for(uint i = 0; i < arr.length; i ++) {
            pos = writeUint32LE(bin, pos, (uint32)(arr[i].length));
        }

        // 指定された配列の中身を書き込む
        for(uint i = 0; i < arr.length; i ++) {
            pos = writeBytes(bin, pos, arr[i]);
        }

        // 変換結果を返す。
        return bin;
    }
    

    // rootinfo をバイト列にエンコードする関数
    function encodeRootinfo(Types.RootElem[] memory rootinfo, uint blockNo, bytes memory blockHash) private pure returns(bytes memory) {
        //
        // rootinfo にブロック番号・ハッシュをセットする。
        //
        uint rootinfoLen = rootinfo.length;
        Types.RootElem[] memory tmpRootinfo = new Types.RootElem[](rootinfoLen);
        for(uint rootElemNo = 0; rootElemNo < rootinfoLen; rootElemNo ++) {
            tmpRootinfo[rootElemNo] = rootinfo[rootElemNo];
        }
        tmpRootinfo[1].num = blockNo;
        tmpRootinfo[1].arr = new bytes(0);
        tmpRootinfo[4].num = 0;
        tmpRootinfo[4].arr = blockHash;

        //
        // rootinfo をバイト列にエンコードする。
        //

        // stream,arr の長さを計算する。
        uint streamLen = 3;
        uint arrLen = 1;
        for(uint i = 0; i < rootinfoLen; i ++) {
            Types.RootElem memory a = tmpRootinfo[i];
            streamLen ++;
            streamLen += 2;
            if(a.arr.length > 0) { // a の中身は uint8[]
                arrLen ++;
            }
        }

        // stream,arr を確保し、バイト列へのエンコードを行う。
        Types.IntOrString[] memory stream = new Types.IntOrString[](streamLen);
        bytes[] memory arr = new bytes[](arrLen);
        uint streamPos = 0;
        uint arrPos = 1;
        stream[streamPos].num = 2;
        stream[streamPos].str = "";
        streamPos ++;
        stream[streamPos].num = 7;
        stream[streamPos].str = "";
        streamPos ++;
        for(uint i = 0; i < tmpRootinfo.length; i ++) {
            Types.RootElem memory a = tmpRootinfo[i];
            stream[streamPos].num = 0;
            stream[streamPos].str = Utils.uintToString(i);
            streamPos ++;
            if(a.arr.length <= 0) { // a の中身は uint
                stream[streamPos].num = 7;
                stream[streamPos].str = "";
                streamPos ++;
                stream[streamPos].num = (int)(a.num);
                stream[streamPos].str = "";
                streamPos ++;
            } else {                // a の中身は bytes
                stream[streamPos].num = 17;
                stream[streamPos].str = "";
                streamPos ++;
                stream[streamPos].num = - (int)(arrPos);
                stream[streamPos].str = "";
                streamPos ++;
                arr[arrPos ++] = a.arr;
            }
        }
        stream[streamPos].num = 0;
        stream[streamPos].str = "";
        streamPos ++;
        require(streamPos == streamLen, "Error: streamPos != streamLen");
        string memory streamStr = encodeIntStrArrayInJSON(stream);
        arr[0] = Primitives.encodeUTF8(streamStr);
        return composeUint8Arrays(arr);
    }

    // 当該ブロックが最新のピア構成の開始ブロック以降の場合に、ブロックのSPVを検証する関数
    function verifySPV2sigs(
        uint blockNo, bytes memory blockHash, Types.BlockSPV memory blockSPV,
        Types.Peerscnf memory peerscnf, Types.PublicKeyData[] memory pubkeys
    ) private view returns (bool) {

        // SPVの内容を取り出す。
        Types.RootElem[] memory   rootinfo = blockSPV.rootinfo;
        Types.Sig[] memory        sigs = blockSPV.sigs;
        uint                      V = blockSPV.V;

        // ピア構成の番号と、署名の数を確認
        if((peerscnf.V != V) || (sigs.length < peerscnf.NF)) {
            return false;
        }

        // rootinfo をバイト列にエンコードする。
        bytes memory bin = encodeRootinfo(rootinfo, blockNo, blockHash);

        // バイト列の SHA256 ダイジェストを算出する。
        bytes32 digest = sha256(bin);

        //
        // rootinfo のエンコード結果を、署名すべてと照合し、
        // 全ての署名について検証が成功した場合に、ＳＰＶの検証が成功したと判定する。
        //
        for(uint sigNo = 0; sigNo < sigs.length; sigNo ++) {
            Types.Sig memory sig = sigs[sigNo];
            if(!VerificationCommon.verifySignatureForOrigin(pubkeys, sig.origin, digest, sig.signature)) {
                return false;
            }
        }
        return true;
    }

    // 当該ブロックが最新のピア構成の開始ブロックより前の場合に、ブロックのSPVを検証する関数
    function verifySPV2chain(uint blockNo, bytes memory blockHash, Types.BlockSPV memory blockSPV, Types.Peerscnf memory peerscnf) private pure returns (bool) {
        bytes[] memory q;

        // SPVの内容を取り出す。
        bytes[][] memory blkproof = blockSPV.blkproof;
        Types.IntOrString[] memory blkinfo = blockSPV.blkinfo;

        // blkinfo の写しにブロック番号をセット
        Types.IntOrString[] memory tmpBlkinfo = new Types.IntOrString[](blkinfo.length);
        tmpBlkinfo[0].num = (int)(blockNo);
        tmpBlkinfo[0].str = "";
        for(uint i = 1; i < blkinfo.length; i ++) {
            tmpBlkinfo[i] = blkinfo[i];
        }

        // blkproof[0],blkinfo,blockHash の整合性を確認
        q = Utils.duplicateBytesArray(blkproof[0]);
        string memory blkinfoStr = encodeIntStrArrayInJSON(tmpBlkinfo);

        bytes memory blkinfoBytes = Primitives.encodeUTF8(Utils.concatenateString(blkinfoStr, ";"));
        bytes[] memory blkinfoBytesArray = new bytes[](1);
        blkinfoBytesArray[0] = blkinfoBytes;
        q[0] = Utils.calcSHA256ForConcatenated(blkinfoBytesArray);
        bytes memory h = Utils.calcSHA256ForConcatenated(q);
        if(!Primitives.compareBytes(h, blockHash)) {
            console.log("Block hashes does not match.");
            return false;
        }

        // blkproof の第二要素以降から求めたハッシュ値と peerscnf 中のハッシュ値が一致することを確認
        for(uint i = 1; i < blkproof.length; i ++) {
            q = Utils.duplicateBytesArray(blkproof[i]);
            int pos = Utils.findEmpty(q);
            if(pos < 0) {
                console.log("Block proof is invalid.");
                return false;
            }
            q[(uint)(pos)] = h;
            h = Utils.calcSHA256ForConcatenated(q);
        }
        bytes memory hash = Primitives.decodeBase64(peerscnf.hash64);
        if(!Primitives.compareBytes(h, hash)) {
            console.log("Block proof is inconsitent with the hash in peerscnf.");
            return false;
        }
        return true;        
    }

    // ブロックSPVを検証する関数
    function verifyBlockSPV(
        uint blockNo, bytes memory blockHash, Types.BlockSPV memory blockSPV,
        Types.Peerscnf memory peerscnf, Types.PublicKeyData[] memory pubkeys
    ) view public returns (bool) {

        // peerscnf が最新のピア構成を反映していることを確認する。
        require(blockSPV.V <= peerscnf.V, "verifyBlockSPV(): blockSPV is newer than peerscnf");

        // 当該ブロックが最新のピア構成の開始ブロック以降の場合と、そうでない場合で分岐。
        if((blockSPV.sigs.length > 0) && (blockSPV.rootinfo.length > 0) && (blockSPV.V == peerscnf.V)) {
            return verifySPV2sigs(blockNo, blockHash,  blockSPV, peerscnf, pubkeys);
        } else if((blockSPV.blkinfo.length > 0) && (blockSPV.blkproof.length > 0)) {
            return verifySPV2chain(blockNo, blockHash, blockSPV, peerscnf);
        } else {
            revert("verifyBlockSPV(): Block SPV is invalid");
        }
    }
}
