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

module.exports = {
    getFileHash: getFileHash
}