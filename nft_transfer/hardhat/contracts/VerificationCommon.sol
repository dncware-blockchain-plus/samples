//
// 署名検証に関わる関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Types.sol";
import "./Primitives.sol";
import "./Pubkey.sol";

// ライブラリをインポート
import "@openzeppelin/contracts/utils/cryptography/RSA.sol";


library VerificationCommon {


   // 署名を検証する関数
    function verifySignature(bytes memory pubkey, bytes memory signature, bytes32 digest) private view returns(bool) {

        // 公開鍵から modolus と exponent を取り出す。
        (bytes memory modulus, bytes memory exponent) = Pubkey.parsePublicKey(pubkey);

        // プリミティブ pkcs1Sha256() で署名を検証する。
        return RSA.pkcs1Sha256(digest, signature, exponent, modulus);
    }

    // 指定ピアについて署名を検証する関数
    function verifySignatureForOrigin(Types.PublicKeyData[] memory pubkeys, string memory pid, bytes32 digest, bytes memory signature) public view returns(bool) {

        // 指定ピアの秘密鍵のリストを取得する。
        bytes[2] memory peerPubKeys;
        uint peerNo;
        for(peerNo = 0; peerNo < pubkeys.length; peerNo ++) {
            if(Primitives.compareStrings(pubkeys[peerNo].peerId, pid)) {
                peerPubKeys = pubkeys[peerNo].keys;
                break;
            }
        }
        if(peerNo >= pubkeys.length) {
            return false;
        }

        // リスト中の秘密鍵の各々について、検証を試みる。
        // どれか一つで署名が検証できたら、検証成功。
        for(uint keyNo = 0; keyNo < peerPubKeys.length; keyNo ++) {
            if(verifySignature(peerPubKeys[keyNo], signature, digest)) {
                return true;
            }
        }
        return false;    
    }
}
