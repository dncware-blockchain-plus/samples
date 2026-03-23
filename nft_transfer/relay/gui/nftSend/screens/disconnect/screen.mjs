'use strict';

// 画面のID
export const id = 'disconnect';

// 画面の表示スタイル
export const displayStyle = 'flex';

// コンポーネントの定義
export const components = {
    disconnectSrc: (await import('../../../common/components/disconnectSrc/component.mjs')).default
};
