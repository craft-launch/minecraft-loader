const crypto = require('crypto');
const nodeFetch = require('node-fetch');
const { extractFull } = require('node-7z');
const { path7za } = require('7zip-bin');
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

async function getPathLibraries(main) {
    let libSplit = main.split(':')
    let libName = `${libSplit[1]}-${libSplit[2]}.jar`
    let pathLib = `${libSplit[0].replace(/\./g, '/')}/${libSplit[1]}/${libSplit[2]}`
    return {
        path: pathLib,
        name: libName
    };
}


async function extractAll(source, destination, args = {}, funcs = {}) {
    const extraction = extractFull(source, destination, {
        ...args,
        yes: true,
        $bin: path7za,
        $spawnOptions: { shell: true }
    });

    let extractedParentDir = null;
    await new Promise((resolve, reject) => {
        if (funcs.progress) {
            extraction.on('progress', ({ percent }) => {
                funcs.progress(percent);
            });
        }
        extraction.on('data', data => {
            if (!extractedParentDir) {
                [extractedParentDir] = data.file.split('/');
            }
        });
        extraction.on('end', () => {
            funcs.end?.();
            resolve(extractedParentDir);
        });
    });
    return { extraction };
};

module.exports = {
    getFileHash: getFileHash,
    checkNetworkStatus: checkNetworkStatus,
    getPathLibraries: getPathLibraries,
    extractAll: extractAll
}