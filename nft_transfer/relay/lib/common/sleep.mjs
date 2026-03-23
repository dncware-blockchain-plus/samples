'use strict';


// 指定時間だけスリーブする関数
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
