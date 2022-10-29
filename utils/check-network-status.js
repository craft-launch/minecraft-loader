const nodeFetch = require('node-fetch');

// check network status
module.exports = checkNetworkStatus = async() => {
    const timeout = 10000;
    const networkStatus = await nodeFetch('https://google.com', { timeout }).then(() => true).catch(() => false);
    return networkStatus;
}