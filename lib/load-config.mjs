if ('window' in globalThis) { // Browser
    var { default: { uniqueID, adminWalletPassword, peerURL, chainID, domain } } = await import('../etc/config.json', { assert: { type: 'json' } });

} else if ('process' in globalThis) { //Node.js
    var fs = await import('node:fs');
    var path = await import('node:path');
    var { default: package_root } = await import('./get-package-root-path.js');
    var configJSON = fs.readFileSync(path.join(package_root, 'etc', 'config.json'), 'utf8');
    var { uniqueID, adminWalletPassword, peerURL, proxy, CA, chainID, domain } = JSON.parse(configJSON);
}

export { uniqueID, adminWalletPassword, peerURL, proxy, CA, chainID, domain };
