'use strict';

// 画面のID
export const id = 'connect';

// 画面の表示スタイル
export const displayStyle = 'flex';

// コンポーネントの定義
export const components = {
    chainSelector: (await import('../../../common/components/chainSelector/component.mjs')).default,
    qrCodeDisplaySrc: (await import('../../../common/components/qrCodeDisplaySrc/component.mjs')).default
};
