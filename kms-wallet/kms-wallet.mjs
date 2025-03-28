import { KMSClient, GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import * as crypto from "crypto";

function decodeBase64url(x) {
    return Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
export async function importPublicData_r({ KeyId, region }) {
    var client = new KMSClient({ region });
    var command = new GetPublicKeyCommand({ KeyId });
    var response = await client.send(command);
    var keyobj = crypto.createPublicKey({ key: response.PublicKey, format: 'der', type: 'spki' });
    var jwk = keyobj.export({ format: 'jwk' });
    return decodeBase64url(jwk.n);
}
export async function signSignature_r({ KeyId, region }, Message) {
    var client = new KMSClient({ region });
    var command = new SignCommand({ KeyId, Message, MessageType: 'RAW', SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256' });
    var response = await client.send(command);
    return response.Signature;
}
