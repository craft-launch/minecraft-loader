const crypto = require('crypto');
const fs = require('fs');


async function getFileHash(filePath, algorithm = 'sha1') {
    let shasum = crypto.createHash(algorithm);

    let file = fs.ReadStream(filePath);
    file.on('data', data => {
        shasum.update(data);
    });

    let hash = await new Promise(resolve => {
        file.on('end', () => {
            resolve(shasum.digest('hex'));
        });
    });
    return hash;
};

async function checkNetworkStatus(timeout = 10000) {
    const networkStatus = await nodeFetch('https://google.com', { timeout }).then(() => true).catch(() => false);
    return networkStatus;
}


module.exports = {
    getFileHash: getFileHash,
    checkNetworkStatus: checkNetworkStatus
}