if ('window' in globalThis) { // Browser
    var api = await import('/node_modules/dncware-blockchain-api/dist/dncware-blockchain-browser-api.mjs');

} else if ('process' in globalThis) { //Node.js
    var api = await import('dncware-blockchain-api');
    var { proxy, CA } = await import('./load-config.mjs');
    if (proxy || CA) {
        if (proxy) {
            var { HttpsProxyAgent } = await import('https-proxy-agent');
            var agent = new HttpsProxyAgent(proxy, { keepAlive: true });
        }
        if (CA) {
            var fs = await import('node:fs');
            var path = await import('node:path');
            var { default: package_root } = await import('./get-package-root-path.js');
            var ca = fs.readFileSync(path.resolve(package_root, 'etc', CA));
        }
        var old_rpc_connect = api.RPC.prototype.connect;
        api.RPC.prototype.connect = function(url, options = {}) {
            return old_rpc_connect.call(this, url, Object.assign({ agent, ca }, options));
        };
    }
}

export { api };
