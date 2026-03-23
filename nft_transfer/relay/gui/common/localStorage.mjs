'use strict';

// ローカルストレージのキーのプレフィックス
let prefix = null;


// ローカルストレージのキーのプレフィックスをセットする関数
export function setLocalStoragePrefix(newPrefix) {
    prefix = newPrefix;
}

// ローカルストレージにデータをセットする関数
export function setLocalStorage(key, value) {
    try {
        const fullKey = `${prefix}.${key}`;
        localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (error) {
        console.error(`ローカルストレージへの保存エラー: ${error}`);
    }
}

// ローカルストレージからデータを取得する関数
export function getLocalStorage(key, defaultValue = null) {
    try {
        const fullKey = `${prefix}.${key}`;
        const value = localStorage.getItem(fullKey);
        if (value !== null) {
            return JSON.parse(value);
        } else {
            return defaultValue;
        }
    } catch (error) {
        console.error(`ローカルストレージからの取得エラー: ${error}`);
        return defaultValue;
    }
}
