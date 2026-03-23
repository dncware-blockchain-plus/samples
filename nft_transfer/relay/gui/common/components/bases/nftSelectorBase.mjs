'use strict';

// 他のファイルからのインポート
import { makeNftNameMap } from '../../nftNameMap.mjs';
import { removeRedundantObjectInArray } from '../../../../lib/common/arrayUtil.mjs';
import { Mutex } from '../../../../lib/mutex/mutex.mjs';


// 経過時間の更新周期(msec)
const durationUpdatePeriod = 1000;

// 状態IDを状態の表示名に変換するマップ
const stateNameMap = {
    alive: '',
    cmdPending: '転送待ち',
    reserved: '転送予約済み',
    receptionPending: '受領待ち',
    failed: '転送失敗',
    transfered: '転送済み'
};


// 画面のコンポーネントの定義
import { ScreenComponentBase } from '../../../../lib/screen/screenManager.mjs'
export class NftSelectorScreenComponentBase extends ScreenComponentBase {
    constructor() {
        super();

        // 選択されたトークンのIDのリスト
        this.selectedTokenIds = [];

        // トークン一覧の表示を前回更新したときのトークンリスト
        this.lastUpdateTokens = [];

        // トークン一覧の表の行についての情報をまとめるためのオブジェクト
        // キーがトークンのID、値がトークンの情報
        this.rowInfoMap = {};

        // 排他制御用のMutexインスタンス
        this.mutex = new Mutex();

        // 定期的な画面の更新のためのタイマーID
        this.periodicalUpdateIntervalId = null;

        // 「転送予約済み」以降の状態の（burnedされた）トークンのみを表示するかどうか
        this.onlyBurned = false;

        // トークンをリストするオブジェクト
        this.tokenLister = null;
    }

    // インスタンスの初期化
    // （コンストラクタでは、asyncが使えないため、initメソッドを設けている）
    async init(screen) {
        super.init(screen);
        
        // HTMLを読み込む。
        this.html = await this.getHTML(this.getComponentUrl());

        // 転送元が更新された場合に本コンポーネントも更新されるように、コールバック関数を設定する。
        const components = window.screens.main.components;
        const updateProc = () => this.update({
            reload: true
        });
        components.srcSelector.updateCallbacks.push(updateProc);
    }

    // component.mjs の URL を取得する関数
    // ※ サブクラスでのオーバーライド対象
    getComponentUrl() {
        return null;
    }

    // 画面を表示する際に呼びだされる関数
    async onShow() {

        // 定期的な処理を開始する。
        this.startPeriodicalProcess();

        // 表示を更新する
        await this.update({
            reload: true
        });
    }

    // 画面を非表示にする際に呼びだされる関数
    async onHide() {

        // 定期的な処理を停止する。
        this.stopPeriodicalProcess();
    }

    // 画面の更新を行う関数
    async update(options = {}) {

        // オプション：
        // - reload: トークンのリストの元となる情報を再取得するかどうか

        // この関数の呼び出しでは、排他制御を行うためにMutexを使用する。
        await this.mutex.runExclusive(async () => {

            // トークン一覧の表示を更新する。
            await this.updateNftSelector(options);

            await super.update();
        });
    }

    // トークン一覧の表示を更新する関数
    async updateNftSelector(options = {}) {
    
        // オプションを取得する。
        const {
            reload = true // トークンのリストの元となる情報を再取得するかどうか
        } = options;

        // トークンのリストを更新する。
        await this.tokenLister.remakeTokenList({
            onlyBurned: this.onlyBurned,
            reload
        });

        // トークンの一覧を取得する。
        const tokens = this.tokenLister.getTokens();
    
        // トークンリストが変化した場合は、トークン一覧の表を作り直し、
        // 前回のトークンリストを更新する。
        if(JSON.stringify(tokens) !== JSON.stringify(this.lastUpdateTokens)) {
            await this.rebuildTokenList(tokens);
            this.lastUpdateTokens = tokens;
        }
    
        // 表示を更新する。
        await this.updateDisplayForAllTokens();
    }

    // トークン一覧の表を作り直す関数
    async rebuildTokenList(tokens) {

        // 転送先のNFTコレクションのチェーン情報IDとアドレスのペアのリストを作成する。
        const dstNftChainPairs = removeRedundantObjectInArray(
            tokens
            .filter(token => token.dstNFTAddrOrId && token.dstChainInfoId)
            .map(token => ({
                chainInfoId: token.dstChainInfoId,
                nftAddrOrId: token.dstNFTAddrOrId
            }))
        );

        // 転送先NFTコレクションの表示名を取得するためのマップを作る。
        const dstNFTNameMap = await makeNftNameMap(
            dstNftChainPairs
        );

        // トークンのリストを表示する要素を取得する。
        const tbody = document.getElementById('token-list');

        // トークンのリストをクリアする。
        tbody.innerHTML = '';

        // トークン一覧の表の行についての情報をまとめるためのオブジェクトを空にする。
        this.rowInfoMap = {};

        // 各トークンについて、
        for(const token of tokens) {

            // 選択済みであるか否かを確認する。
            const selected = this.isTokenSelected(token.id);

            // 表の行を作成する。
            const row = document.createElement('tr');

            // 選択用のチェックボックスのセルを作成する。
            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selected;
            checkbox.onchange = () => {
                if(checkbox.checked) {
                    // チェックボックスがオンになった場合は、選択済みのトークンのIDに追加する。
                    this.selectedTokenIds.push(token.id);
                } else {
                    // チェックボックスがオフになった場合は、選択済みのトークンのIDから削除する。
                    this.selectedTokenIds = this.selectedTokenIds.filter(id => id !== token.id);
                }
                // 表示を更新する。
                this.update({
                    reload: false
                });
            };
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);

            // トークンのIDのセルを作成する。
            const idCell = document.createElement('td');
            idCell.textContent = token.id;
            row.appendChild(idCell);

            // トークンのURIのセルを作成する。
            const uriCell = document.createElement('td');
            uriCell.textContent = token.uri;
            row.appendChild(uriCell);

            // トークンの状態のセルを作成する。
            const stateCell = document.createElement('td');
            stateCell.textContent = stateNameMap[token.state];
            row.appendChild(stateCell);

            // 経過時間のセルを作成する。
            const durationCell = document.createElement('td');
            durationCell.textContent = ''; // とりあえず空にしておき、後でセットする。
            row.appendChild(durationCell);

            // 転送先チェーンの情報のセルを作成する。
            const dstChainCell = document.createElement('td');
            dstChainCell.textContent = token.dstChainInfoId;
            row.appendChild(dstChainCell);

            // 転送先NFTコレクションのセルを作成する。
            const dstNFTCell = document.createElement('td');
            dstNFTCell.textContent = dstNFTNameMap[token.dstNFTAddrOrId] || token.dstNFTAddrOrId;
            row.appendChild(dstNFTCell);

            // 転送先アドレスまたは転送先ユーザIDのセルを作成する。
            const dstAddrCell = document.createElement('td');
            dstAddrCell.textContent = token.dstWalletAddrOrUserId;
            row.appendChild(dstAddrCell);

            // 表の行を表に追加する。
            tbody.appendChild(row);

            // トークン一覧の表の行についての情報をまとめて、保存する。
            const rowInfo = {
                checkboxCell,
                checkbox,
                idCell,
                uriCell,
                stateCell,
                durationCell,
                dstChainCell,
                dstNFTCell,
                dstAddrCell
            };
            this.rowInfoMap[token.id] = rowInfo;
        }
    }


    // トークン一覧の動的に変化する表示をすべてのトークンについて更新する関数
    async updateDisplayForAllTokens() {

        // トークンの一覧を取得する。
        const tokens = this.tokenLister.getTokens();

        // 各トークンについて、
        for(const token of tokens) {

            // トークンの動的に変化するパラメータを取得する。
            const { tokenCellClassName, durationString } = await this.getDynamicTokenParameters(token);

            // トークン一覧の表の行についての情報を取得する。
            const rowInfo = this.rowInfoMap[token.id];

            // 現在のトークンの状態が alive の場合は、チェックボックスを表示する。
            // 他の場合は、チェックボックスを表示しない。
            const showCheckbox = this.shouldShowCheckboxForToken(token);
            rowInfo.checkbox.style.display = showCheckbox ? 'table-cell' : 'none';

            // 状態の表示を更新する。
            rowInfo.stateCell.textContent = stateNameMap[token.state];

            // 経過時間の表示を更新する。
            rowInfo.durationCell.textContent = durationString;

            // セルの表示スタイルを更新する。
            rowInfo.checkboxCell.className = tokenCellClassName;
            rowInfo.idCell.className = tokenCellClassName;
            rowInfo.uriCell.className = tokenCellClassName;
            rowInfo.stateCell.className = tokenCellClassName;
            rowInfo.durationCell.className = tokenCellClassName;
            rowInfo.dstChainCell.className = tokenCellClassName;
            rowInfo.dstNFTCell.className = tokenCellClassName;
            rowInfo.dstAddrCell.className = tokenCellClassName;
        }
    }

    // トークンの動的に変化するパラメータを取得する関数
    async getDynamicTokenParameters(token) {

        // 現在時刻を取得する。
        const currentTime = (new Date()).getTime();

        // 選択済みであるか否かを確認する。
        const selected = this.isTokenSelected(token.id);

        // トークンの状態に応じたスタイルを指定するクラス名を特定する。
        const tokenCellClassName = `token_${token.state}_${selected ? 'selected' : 'unselected'}`;

        // 経過時間の文字列表現を作成する。
        // 転送待ち,転送予約済み,受領待ちの場合は、その状態になってからの経過時間を表示する。
        // それ以外の場合は、空文字列を返す。
        let durationString = '';
        if(token.state === 'cmdPending') {
            durationString = this.makeDurationString(currentTime, token.getPendingForSendingSince());
        } else if(token.state === 'reserved') {
            durationString = this.makeDurationString(currentTime, token.reservedForSendingSince);
        } else if(token.state === 'receptionPending') {
            const pendingForReceptionSince = await token.getPendingForReceptionSince();
            durationString = await this.makeDurationString(currentTime, pendingForReceptionSince);
        }

        // 取得したパラメータをオブジェクトにまとめて返す。
        return {
            selected,
            tokenCellClassName,
            durationString
        };
    }

    // トークンが選択されているか否かを確認する関数
    isTokenSelected(tokenId) {
        return this.selectedTokenIds.includes(tokenId);
    }

    // 現在時刻とトークンの転送予約時刻から経過時間を計算する関数
    makeDurationString(currentTime, tokenTime) {

        // 現在時刻とトークンの転送予約時刻のどちらかが指定されていない場合は、空文字列を返す。
        let durationString = '';
        if(currentTime && tokenTime) {

            // 経過秒数を算出する。
            const durationSec = Math.floor((currentTime - tokenTime) / 1000);

            // １分、１時間、１日あたりの秒数
            const secPerMin = 60;
            const secPerHour = secPerMin * 60;
            const secPerDay = secPerHour * 24;

            // １日を超えている場合は、日数の文字列表現を返す。
            if(durationSec >= secPerDay) {
                durationString = String(Math.floor(durationSec / secPerDay)) + '日';
            
            // １時間を超えている場合は、時間数の文字列表現を返す。
            } else if(durationSec >= secPerHour) {
                durationString = String(Math.floor(durationSec / secPerHour)) + '時間';
                
            // １分を超えている場合は、分数の文字列表現を返す。
            } else if(durationSec >= secPerMin) {
                durationString = String(Math.floor(durationSec / secPerMin)) + '分';

            // １分未満の場合は、秒数の文字列表現を返す。
            } else {
                durationString = String(durationSec) + '秒';
            }
        }
        return durationString;
    };

    // すべてのトークンの選択を解除する関数
    clearTokenSelection() {

        // 選択済みのトークンのIDを空にする。
        this.selectedTokenIds = [];

        // 表示を更新する。
        this.update({
            reload: false
        });
    }

    // 定期的な処理を行う関数
    async periodicalProcess() {
        await this.update({
                reload: true
        });
    }

    // 定期的な処理を開始する関数
    startPeriodicalProcess() {
        this.periodicalUpdateIntervalId = setInterval(async () => {
            await this.periodicalProcess();
        }, durationUpdatePeriod);
    }

    // 定期的な処理を停止する関数
    stopPeriodicalProcess() {
        if(this.periodicalUpdateIntervalId) {
            clearInterval(this.periodicalUpdateIntervalId);
            this.periodicalUpdateIntervalId = null;
        }
    }

    // 指定トークンについてチェックボックスを表示すべきか否かを判定する関数
    // ※ サブクラスでのオーバーライド対象
    shouldShowCheckboxForToken(token) {
        return false;
    }

}
