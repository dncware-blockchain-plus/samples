'use strict';

// 画面のID
export const id = 'main';

// 画面の表示スタイル
export const displayStyle = 'flex';

// コンポーネントの定義
export const components = {
    evmWalletSelector: (await import('../../../common/components/evmWalletSelector/component.mjs')).default,
    srcSelector: (await import('./components/srcSelector/component.mjs')).default,
    nftSelector: (await import('./components/nftSelector/component.mjs')).default,
    transferButton: (await import('./components/transferButton/component.mjs')).default
};
