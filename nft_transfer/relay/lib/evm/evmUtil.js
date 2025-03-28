// コントラクトデータのトップレベル URL
const contractsBase = '/evm-contracts';

// ERC721コントラクトの情報を格納したファイルの相対パス
const erc721ContractRelPath =  'sampleToken.sol/SampleToken.json';


// node.js の場合は、必要な関数をエクスポートする。
if(typeof(window) === 'undefined')  {

    const { fetchJSON } = require('../common/fetchUtil.js');
    global.fetchJSON = fetchJSON;
}


// EVMプロバイダの一覧を取得する関数。
async function evmGetProviders() {
    const providers = await Web3.requestEIP6963Providers();
    return providers;
}

// EVMプロバイダを選択して、Web3 のオブジェクトを生成する関数
async function evmSelectProvider(evmProvider) {

    // evmProvider が null でない場合は、とりあえず Web3 のオブジェクトを作る。
    var web3 = null;
    if(evmProvider) {
        web3 = new Web3(evmProvider);

        // アカウント情報を要求し、失敗した場合は Web3 のオブジェクトを廃棄する。
        const accounts = await web3.eth.requestAccounts();
        if(accounts.length <= 0) {
            web3 = null;
        }
    }

    // 生成した Web3 のオブジェクトを返す。
    return web3;
}

// EVMのウォレットアドレスの一覧を取得する関数
async function evmGetWalletAddresses(web3) {
    const addresses = web3 ? await web3.eth.getAccounts() : [];
    return addresses;
}

// コントラクトの ABI を読み込む関数
async function loadContractABI(contractRelPath) {
    const contractURL = `${contractsBase}/${contractRelPath}`;
    const contractData = await fetchJSON(contractURL);
    return contractData.abi;
}

// コントラクトのインスタンスのラッパを作成する関数
async function evmMakeContractWrapper(web3, evmWalletAddress, contractAddress, contractRelPath) {

    // コントラクトの ABI
    const contractABI = await loadContractABI(contractRelPath);

    // コントラクトのインスタンスを作る。
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    // ラッパを作って返す。
    contractWrapper = {
        contract: contract,
        walletAddress: evmWalletAddress
    };
    return contractWrapper;
}

// ERC721コントラクトのインスタンスのラッパを作成する関数
async function evmMakeERC721ContractWrapper(web3, evmWalletAddress, nftAddress) {
    return await evmMakeContractWrapper(web3, evmWalletAddress, nftAddress, erc721ContractRelPath);
}

// トランザクションを send する関数
// （※ asyncとなっていないがPromiseを返すので注意）
function evmSend(contractWrapper, methodName, args) {
    return contractWrapper.contract.methods[methodName](...args).send({from: contractWrapper.walletAddress});
}

// トランザクションを call する関数
// （※ asyncとなっていないがPromiseを返すので注意）
function evmCall(contractWrapper, methodName, args) {
    return contractWrapper.contract.methods[methodName](...args).call();
}

// カスタムチェーンを登録する関数
async function evmAddChain(web3, dstChainInfo) {
    const params = {
        chainId: dstChainInfo.chainId,
        chainName: dstChainInfo.id,
        nativeCurrency: {
            name: dstChainInfo.nativeCurrency,
            symbol: dstChainInfo.nativeCurrency,
            decimals: 20
        },
        rpcUrls: dstChainInfo.urls
    };
    await web3.currentProvider.request({
        method: 'wallet_addEthereumChain',
        params: [params]
    });
}

// 登録したカスタムチェーンを選択する関数
async function evmSwitchChain(web3, dstChainInfo) {
    const chainIdHex = '0x' + parseInt(dstChainInfo.chainId).toString(16);
    const params = {
        chainId: chainIdHex
    };
    await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [params]
    });
}

// 接続先のチェーンを選択する関数
async function evmSelectChain(web3, dstChainInfo) {

    // 登録済みかもしれないので、とりあえず、チェーンＩＤを指定してチェーンに接続してみる。
    try {
        await evmSwitchChain(web3, dstChainInfo);
    } catch(e) {

        // 接続できなかった場合は、カスタムチェーンとして登録した上で、登録したチェーンを選択する。
        await evmAddChain(web3, dstChainInfo);
        await evmSwitchChain(web3, dstChainInfo);
    }
}


// node.js の場合は、関数をエクスポートする。
if(typeof(window) === 'undefined')  {
    module.exports = {
        evmGetProviders,
        evmSelectProvider,
        evmGetWalletAddresses,
        loadContractABI,
        evmMakeContractWrapper,
        evmMakeERC721ContractWrapper,
        evmSend,
        evmCall,
        evmAddChain,
        evmSwitchChain,
        evmSelectChain
    }
}
