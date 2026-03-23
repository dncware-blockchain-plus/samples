'use strict';

// 画面のID
export const id = 'main';

// 画面の表示スタイル
export const displayStyle = 'flex';

// コンポーネントの定義
export const components = {
    bcplusWallet: (await import('../../../common/components/bcplusWallet/component.mjs')).default,
    srcSelector: (await import('./components/srcSelector/component.mjs')).default,
    nftSelector: (await import('./components/nftSelector/component.mjs')).default,
    dstAddrInput: (await import('./components/dstAddrInput/component.mjs')).default,
    dstSelector: (await import('./components/dstSelector/component.mjs')).default,
    transferButton: (await import('./components/transferButton/component.mjs')).default
};
