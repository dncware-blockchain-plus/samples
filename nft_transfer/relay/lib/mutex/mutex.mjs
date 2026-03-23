'use strict';

/**
 * 排他制御用のMutexクラス
 * 非同期処理において、複数の処理が同時に実行されることを防ぐためのクラス
 * JavaScriptのPromiseベースで実装されており、await/asyncパターンで使用できる
 */
export class Mutex {

    constructor() {
        // ロック状態を管理するフラグ
        this._locked = false;
        // ロック待ちの処理を管理するキュー（Promise resolverの配列）
        this._queue = [];
    }

    /**
     * ロックを取得する
     * 既にロックされている場合は、キューに追加されて待機状態になる
     * ロックが解放されるまで処理がブロックされる
     * @returns {Promise<void>} ロックが取得できた時点で解決されるPromise
     */
    async lock() {
        // 新しいチケット（Promise）を作成し、そのresolverをキューに追加
        const ticket = new Promise(resolve => this._queue.push(resolve));
        
        // 現在ロックされていない場合は、即座にロックを取得
        if (!this._locked) {
            this._locked = true;
            this._queue.shift()(); // 最初の呼び出し（自分自身）を実行
        }
        
        // チケットが解決されるまで待機（ロック取得まで待機）
        await ticket;
    }

    /**
     * ロックを解放する
     * キューに待機中の処理がある場合は、次の処理にロックを渡す
     * キューが空の場合は、ロック状態を解除する
     */
    unlock() {
        if (this._queue.length > 0) {
            // キューに待機中の処理がある場合、次の処理を実行
            this._queue.shift()(); // 次の呼び出しを実行
        } else {
            // キューが空の場合、ロック状態を解除
            this._locked = false;
        }
    }

    /**
     * 排他制御を行いながら処理を実行する
     * ロックの取得から解放まで自動的に行い、例外が発生してもロックが確実に解放される
     * @param {Function} callback 排他制御下で実行したい処理（async関数推奨）
     * @returns {Promise<any>} callbackの戻り値をそのまま返す
     * @example
     * const mutex = new Mutex();
     * const result = await mutex.runExclusive(async () => {
     *     // クリティカルセクション（排他制御が必要な処理）
     *     return await someAsyncOperation();
     * });
     */
    async runExclusive(callback) {
        await this.lock(); // ロックを取得
        try {
            return await callback(); // 処理を実行
        } finally {
            this.unlock(); // 例外が発生してもロックを確実に解放
        }
    }
}
