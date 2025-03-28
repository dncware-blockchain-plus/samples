//
// ＲＳＡの公開鍵のデコード用の関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Types.sol";
import "./Primitives.sol";
import "./Utils.sol";


library Pubkey {

    // ASN1 形式のデータのパーザの状態
    struct ASN1Input {
        bytes           buf;
        uint            pos;
    }

    // ASN1 形式のデータ項目
    struct ASN1Item {
        uint8           tag;
        bytes           value;
    }


    // asn1 形式のデータから１バイト読み込む関数
    function asn1GetByte(ASN1Input memory input) private pure returns(uint8) {
        return (uint8)(input.buf[input.pos ++]);
    }

    // asn1 形式のデータからデータ長を読み取る関数
    function asn1GetLength(ASN1Input memory input) private pure returns(uint) {
        uint length = (uint)(asn1GetByte(input));
        if((length & 0x80) != 0) {
            uint numBytes = length & 0x7F;
            length = 0;
            for(uint i = 0; i < numBytes; i ++) {
                length = (length << 8) | (uint)(asn1GetByte(input));
            }
        }
        return length;        
    }

    // asn1 形式のデータから値１個を読み取る関数
    function asn1GetValue(ASN1Input memory input) private pure returns(ASN1Item memory) {
        ASN1Item memory item;
        item.tag = asn1GetByte(input);
        uint length = asn1GetLength(input);
        item.value = Primitives.bytesSlice(input.buf, input.pos, input.pos + length);
        input.pos += length;
        return item;
    }

    // asn1 形式のデータからシーケンス１個を読み取る関数
    function asn1GetSequences(ASN1Input memory input) private pure returns(ASN1Item[] memory) {
        ASN1Item memory sequence = asn1GetValue(input);
        ASN1Item[] memory items = new ASN1Item[](2);        // ２項目で決め打ち
        uint itemNo = 0;
        ASN1Input memory seqInput;
        seqInput.buf = sequence.value;
        seqInput.pos = 0;
        while(seqInput.pos < seqInput.buf.length) {
            require(itemNo < items.length, "asn1GetSequences(): items is full");
            items[itemNo] = asn1GetValue(seqInput);
            itemNo ++;
        }
        require(itemNo == items.length, "asn1GetSequences(): items is not filled");
        return items;
    }

    // asn1 形式のデータをデコードする関数
    function asn1Parse(bytes memory buffer) private pure returns(ASN1Item[] memory) {
        ASN1Input memory input;
        input.buf = buffer;
        input.pos = 0;
        return asn1GetSequences(input);
    }


    // 公開鍵のバイナリをデコードして、exponent と modulus を抽出する関数
    function parsePublicKey(bytes memory pubkey) public pure returns(bytes memory, bytes memory) {

        // asn1 形式のデータとしてデコードして、exponent と modulus を抽出する
        Pubkey.ASN1Item[] memory items = asn1Parse(pubkey);
        require(items.length == 2, "Number of ASN1 items is not 2");
        bytes memory modulus = items[0].value;
        bytes memory exponent = items[1].value;
        
        // 先頭に余分なバイト 0x00 がついている場合があるので、取り除く
        if(modulus[0] == 0) {
            modulus = Primitives.bytesSlice(modulus, 1, modulus.length);
        }

        // 抽出結果を返す
        return (modulus, exponent);
    }


    // 公開鍵をデコードする関数
    function importPublicKeyFromRsaPem(string memory pem) pure private returns(bytes memory) {

        // PEM文字列の長さを測る
        uint pemLen = Utils.strlen(pem);

        // PEMヘッダーとフッターを削除
        string memory pemHeader = "-----BEGIN RSA PUBLIC KEY-----";
        string memory pemFooter = "-----END RSA PUBLIC KEY-----";
        require(Primitives.checkSubstring(pem, pemHeader, 0) && Primitives.checkSubstring(pem, pemFooter, pemLen - Utils.strlen(pemFooter)), "INVALID PEM KEY");
        string memory stripped = Primitives.substring(pem, Utils.strlen(pemHeader), pemLen - Utils.strlen(pemFooter));

        // 改行文字を削除
        string memory base64 = Primitives.removeNewline(stripped);

        // base64 エンコードされた公開鍵をデコード
        bytes memory pubkey = Primitives.decodeBase64(base64);
        return pubkey;
    }

    // ピアごとの公開鍵を取得する関数
    function getPublicKeys(Types.Peer[] memory peers) pure public returns(Types.PublicKeyData[] memory) {
        Types.PublicKeyData[] memory pubkeys = new  Types.PublicKeyData[](peers.length);
        for(uint peerNo = 0; peerNo < peers.length; peerNo ++) {
            Types.Peer memory peer = peers[peerNo];
            Types.PublicKeyData memory keyData;
            keyData.peerId = peer.id;
            uint keyNo = 0;
            if(Utils.strlen(peer.pubkey) > 0) {
                keyData.keys[keyNo ++] = importPublicKeyFromRsaPem(peer.pubkey);
            }
            if(Utils.strlen(peer.pubkey2) > 0) {
                 keyData.keys[keyNo ++] = importPublicKeyFromRsaPem(peer.pubkey2);
            }
            pubkeys[peerNo] = keyData;
        }
        return pubkeys;
    }
}
