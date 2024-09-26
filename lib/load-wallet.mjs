if ('window' in globalThis) { // Browser
    var loadWallet = async function(filename) {
        var { default: wallet } = await import('../etc/' + filename, { assert: { type: 'json' } });
        return JSON.stringify(wallet);
    };

} else if ('process' in globalThis) { //Node.js
    var fs = await import('node:fs');
    var path = await import('node:path');
    var { default: package_root } = await import('./get-package-root-path.js');
    var loadWallet = async function(filename) {
        return fs.readFileSync(path.join(package_root, 'etc', filename), 'utf8');
    };
}

var adminWalletJSON = await loadWallet('admin-wallet.json');

export { loadWallet, adminWalletJSON };
