'use strict';


// 画面のクラス
export class Screen {
    constructor(module) {
    
        // とりあえず属性だけ記憶して、実際の初期化は init で行う。
        this.id = module.id;
        this.displayStyle = module.displayStyle;
        this.components = module.components;
        this.html = module.html;
    }

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init() {

        // 画面を登録
        window.screens[this.id] = this;

        // 各コンポーネントを初期化する。
        for(const component of Object.values(this.components)) {
            await component.init(this);
        }

        // 各コンポーネントのHTMLを結合して、画面のHTMLを作る。
        let screenHTML = '';
        for(const component of Object.values(this.components)) {
            screenHTML += await component.html;
        }

        // 画面のdivを生成してドキュメントボディに挿入
        const elementId = getScreenElementId(this.id);
        const screenHolder = document.body;
        const screenElement = document.createElement('div');
        screenElement.id = elementId;
        screenElement.style.display = 'none';
        screenElement.className = 'screen';
        screenElement.innerHTML = screenHTML;
        screenHolder.appendChild(screenElement);

        // 各コンポーネントについて、実体化後のコールバック関数を呼び出す。
        for(const component of Object.values(this.components)) {
            await component.onReady();
        }
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // 画面の機能実装用のコンポーネントの各々について、
        // 画面を表示する際に呼びだされる関数を呼び出す。
        for(const component of Object.values(this.components)) {
            if(component.onShow) {
                await component.onShow();
            }
        }
    }

    // 画面を非表示にする際に呼びだされる関数
    async onHide() {

        // 画面の機能実装用のコンポーネントの各々について、
        // 画面を非表示にする際に呼びだされる関数を呼び出す。
        for(const component of Object.values(this.components)) {
            if(component.onHide) {
                await component.onHide();
            }
        }
    }
}

// 画面の機能実装用のコンポーネントの基本クラス
export class ScreenComponentBase {

    // コンストラクタ
    constructor() {

        // 画面更新時に呼び出すコールバック関数
        this.updateCallbacks = [];
    }

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {

        // コンポーネントを含む画面を記憶する。
        this.screen = screen;
    }

    // 実体化後のコールバック関数
    async onReady() {
        // デフォルトでは何もしない
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // 画面を更新する。
        await this.update();
    }

    // 画面を非表示にする際に呼びだされる関数
    async onHide() {
    }

    // 画面の更新を行う関数
    async update() {

        // 表示が更新された際のコールバックが設定されている場合は呼び出す。
        for(const updateCallback of this.updateCallbacks) {
            await updateCallback();
        }
    }

    // コンポーネントのHTMLを取得する関数
    // （componentURL は import.meta.url で取得する。 ）
    async getHTML(componentURL) {

        // コンポーネントのURLからコンポーネント名を取得する。
        // コンポーネントURLは */(コンポーネント名)/component.mjs の形式であることを前提とする。
        const urlParts = componentURL.split('/');
        const componentName = urlParts[urlParts.length - 2];

        // コンポーネントのHTMLファイルを読み込む。
        const htmlURL = new URL('./component.html', componentURL);
        const response = await fetch(htmlURL);
        if (!response.ok) {
            throw new Error(`Failed to fetch HTML for ${componentURL}: ${response.statusText}`);
        }
        const rawHTML = await response.text();

        // HTML の中の '(components)' を window.screens.${id}.components に、
        // '(thisComponent)' を window.screens.${id}.components.(コンポーネント名) に置き換える
        const html = rawHTML
            .replace(/\(thisScreen\)/g, `window.screens.${this.screen.id}.components`)
            .replace(/\(thisComponent\)/g, `window.screens.${this.screen.id}.components.${componentName}`)
            ;

        // 取得したHTMLを返す。
        return html;
    }
}


// 画面を登録するオブジェクト
window.screens = {};


// 現在の画面
let currentScreenId = null;


// 指定したモジュールで定義された画面を登録する関数
export async function registerScreen(module) {

    // Screen クラスのインスタンスを生成
    const screen = new Screen(module);

    // 初期化を行う
    await screen.init();
}

// 指定したIDの画面を表示する関数
export function showScreen(screenId) {

    // screenIdが指定されていない場合はエラー
    if(!screenId) {
        throw new Error('screenId is required');
    }

    // 画面が登録されていない場合はエラー
    if(!(window.screens[screenId])) {
        throw new Error(`Screen not found: ${screenId}`);
    }

    // 元の画面を非表示にする際の関数を呼ぶ
    if(currentScreenId && window.screens[currentScreenId].onHide) {
        window.screens[currentScreenId].onHide();
    }

    // 画面の表示・非表示を切り替える
    for(const curScreenId of Object.keys(window.screens)) {
        const elementId = getScreenElementId(curScreenId);
        const screenElement = document.getElementById(elementId);
        if (curScreenId === screenId) {
            screenElement.style.display = window.screens[curScreenId].displayStyle;
        } else {
            screenElement.style.display = 'none';
        }
    };

    // 現在の画面を記憶する
    currentScreenId = screenId;

    // 新しい画面を表示する際のコールバック関数を呼ぶ
    if(window.screens[currentScreenId].onShow) {
        window.screens[currentScreenId].onShow();
    }
}

// スクリーンIDから要素のIDを取得する関数
export function getScreenElementId(screenId) {
    return `screen-${screenId}`;
}
