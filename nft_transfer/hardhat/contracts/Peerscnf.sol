//
// peerscnf に関わる関数を実装したライブラリ
//

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// 他のファイルの内容をインポート
import "./Types.sol";
import "./Primitives.sol";
import "./Utils.sol";
import "./VerificationCommon.sol";
import "./Pubkey.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";


library Peerscnf {

    // 構成１でのオーソリティピアが、構成２でのピア一覧に含まれていることを確認する関数
    function CheckAuthorityPeersInclusion(Types.Peerscnf memory peerscnf1, Types.Peerscnf memory peerscnf2) private pure returns(bool) {
        for(uint peerNo1 = 0; peerNo1 < peerscnf1.authorities.length; peerNo1 ++) {
            if(!Utils.isStringInArray(peerscnf1.authorities[peerNo1], peerscnf2.pids)) {
                return false;
            }
        }
        return true;
    }

    // cnfstr が peerscnf の内容と一致していることを確認する関数
    function verifyConfstr(Types.Peerscnf memory peerscnf) private pure returns(bool) {

        // peers の JSON 化を行う
        string memory peersStr = "[";
        for(uint peerNo = 0; peerNo < peerscnf.peers.length; peerNo ++) {
            Types.Peer memory peer = peerscnf.peers[peerNo];
            if(peerNo > 0) {
                peersStr = Utils.concatenateString(peersStr, ",");
            }
            peersStr = string(abi.encodePacked(
                peersStr,
                '{"id":"', peer.id,
                '","authority":', Utils.boolToString(peer.authority),
                ',"host":"', peer.host,
                '","port":', Utils.uintToString(peer.port),
                ',"pubkey":"', Primitives.encodeNewLines(peer.pubkey),
                '","pubkey2":"', Primitives.encodeNewLines(peer.pubkey2),
                '","url":"', peer.url,
                '"}'                
            ));
        }
        peersStr = Utils.concatenateString(peersStr, "]");

        // 全体の JSON 化を行う
        Types.Cnf memory cnf = peerscnf.cnf;
        string memory cnfstr = string(abi.encodePacked(
            '{"blkno":', Utils.uintToString(cnf.blkno),
            ',"hash64":"', cnf.hash64,
            '","minor_version":', Utils.uintToString(cnf.minor_version),
            ',"V":', Utils.uintToString(cnf.V),
            ',"N":', Utils.uintToString(cnf.N),
            ',"F":', Utils.uintToString(cnf.F),
            ',"B":', Utils.uintToString(cnf.B),
            ',"max_block_txids":', Utils.uintToString(cnf.max_block_txids),
            ',"maxlen_pack":', Utils.uintToString(cnf.maxlen_pack),
            ',"relative_blkseq_cleansing":', Utils.uintToString(cnf.relative_blkseq_cleansing),
            ',"v4hash64":"', cnf.v4hash64,
            '","peers":', peersStr,
            '}'
        ));

        // JSON 化の結果と cnfstr が一致するか否か確認する。
        return(Primitives.compareStrings(cnfstr, peerscnf.cnfstr));
    }

    // peerscnf の更新を検証する関数
    function verifyAPeerscnfUpdate(
        Types.Peerscnf memory oldcnf, Types.Peerscnf memory newcnf, Types.SignatureData[] memory signatures
    ) view public returns(bool) {

        // ピア構成の番号の順序を確認する。
        if(oldcnf.V >= newcnf.V) {
            console.log('invalid version order');
            return false;
        }

        // 新しい構成でのオーソリティピアが、古い構成でのピア一覧に含まれていることを確認する。
        if(!CheckAuthorityPeersInclusion(newcnf, oldcnf)) {
            console.log('unexpected new authority');
            return false;            
        }

        // 古い構成でのオーソリティピアが、新しい構成でのピア一覧に含まれていることを確認する。
        if(!CheckAuthorityPeersInclusion(oldcnf, newcnf)) {
            console.log('unexpected old authority');
            return false;            
        }

        // 古いピア構成について、ピアの公開鍵のリストを取得する。    
        Types.PublicKeyData[] memory oldPubkeys = Pubkey.getPublicKeys(oldcnf.peers);

        // 新しい cnfstr が newcnf の内容と一致していることを確認する。
        if(!verifyConfstr(newcnf)) {
            console.log('confstr does not match the peerscnf');
            return false;
        }

        // 新旧のピア構成情報のペアを署名対象としてバイナリ化する。
        bytes memory cnfbin = abi.encodePacked(oldcnf.cnfstr, newcnf.cnfstr);

        // バイナリ化の結果の SHA256 ダイジェストを算出する。
        bytes32 cnfDigest = sha256(cnfbin);

        // 新旧のピア構成で、署名が検証できるピアを数える
        uint oldMatched = 0;
        uint newMatched = 0;
        for(uint sigNo = 0; sigNo < signatures.length; sigNo ++) {
            Types.SignatureData memory sigData = signatures[sigNo];
            string memory pid = sigData.peerId;
            bytes memory signature = sigData.signature;
            if(VerificationCommon.verifySignatureForOrigin(oldPubkeys, pid, cnfDigest, signature)) {
                if(Utils.isStringInArray(pid, oldcnf.authorities)) {
                    oldMatched ++;
                }
                if(Utils.isStringInArray(pid, newcnf.authorities)) {
                    newMatched ++;
                }
            }
        }

        // 署名が検証できるピアの数が十分であるか否かを確認する。
        if((oldMatched < oldcnf.NF) || (newMatched < newcnf.NF)) {
            console.log('insufficient signatures');
            return false;
        }
        return true;
    }
}
