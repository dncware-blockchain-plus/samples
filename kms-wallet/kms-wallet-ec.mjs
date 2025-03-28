import { KMSClient, GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import * as crypto from "crypto";
import { default as asn1 } from "asn1.js";
var ECDerSignature = asn1.define('ECDerSignature', function() {
    this.seq().obj(
        this.key('r').int(),
        this.key('s').int()
    );
});

function decodeBase64url(x) {
    return Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
export async function importPublicData_e({ KeyId, region }) {
    var client = new KMSClient({ region });
    var command = new GetPublicKeyCommand({ KeyId });
    var response = await client.send(command);
    var keyobj = crypto.createPublicKey({ key: response.PublicKey, format: 'der', type: 'spki' });
    var jwk = keyobj.export({ format: 'jwk' });
    return Buffer.concat([decodeBase64url(jwk.x), decodeBase64url(jwk.y)]);
}
export async function signSignature_e({ KeyId, region }, Message) {
    var client = new KMSClient({ region });
    var command = new SignCommand({ KeyId, Message, MessageType: 'RAW', SigningAlgorithm: 'ECDSA_SHA_256' });
    var response = await client.send(command);
    var { r, s } = ECDerSignature.decode(Buffer.from(response.Signature), 'der');
    return Buffer.concat([r.toBuffer('be', 32), s.toBuffer('be', 32)]);
}
