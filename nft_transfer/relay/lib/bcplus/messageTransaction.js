// メッセージのトランザクションを列挙する関数
async function bcpEnumerateMessageTransactions(rpc, uw, srcChainInfo) {

    // 全トランザクションを列挙する。

    let allTransactions = [];

    var before_txno = undefined;
    while(true) {
        var res = await dbcpCallContract(rpc, uw, 'c1query', {
            type: 'transactions',
            before_txno,
            caller: srcChainInfo.nftSender,
            callee: srcChainInfo.messageEventId,
            status: 'ok',
            details: [ 'argstr' ]
        })

        allTransactions = allTransactions.concat(res.list);

        if(res.more == null)
            break;
        before_txno = res.more;
    }

    // ステータスが ok のトランザクションのみを抽出して返す。

    transactions = allTransactions.filter(transaction => (transaction.status === 'ok'));
    return transactions;
}
