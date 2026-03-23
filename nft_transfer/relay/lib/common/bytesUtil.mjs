'use strict';


// 16進文字列をBase64エンコードする関数（ブラウザ用）
export function convertHexToBase64(hexString) {
    if(hexString.indexOf('0x') !== 0) {
        throw 'invalid hex string';
    }
    const uint8Array = hexStringToBytes(hexString.slice(2)); // '0x'を除去
    return encodeBase64(uint8Array);
}

// Uint8ArrayをBase64エンコードする関数（ブラウザ用）
export function encodeBase64(uint8Array) {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

// BigInt を Uint8Array に変換する関数（ブラウザ用）
export function bigIntToUint8Array(value) {
    if (value === 0n) {
        return new Uint8Array([]);
    }
    
    const hex = value.toString(16);
    const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex;
    const bytes = new Uint8Array(paddedHex.length / 2);
    
    for (let i = 0; i < paddedHex.length; i += 2) {
        bytes[i / 2] = parseInt(paddedHex.substr(i, 2), 16);
    }
    
    return bytes;
}

// 16進文字列をUint8Arrayに変換するヘルパー関数
export function hexStringToBytes(hexString) {
    if (hexString.length % 2 !== 0) {
        throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
}
