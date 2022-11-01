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

async function getPathLibraries(main, nativeString, forceExt) {
    let libSplit = main.split(':')
    let fileName = libSplit[3] ? `${libSplit[2]}-${libSplit[3]}` : libSplit[2];
    let finalFileName = fileName.includes('@') ? fileName.replace('@', '.') : `${fileName}${nativeString || ''}${forceExt || '.jar'}`;
    let pathLib = `${libSplit[0].replace(/\./g, '/')}/${libSplit[1]}/${libSplit[2]}`
    return {
        path: pathLib,
        name: `${libSplit[1]}-${finalFileName}`
    };
}


async function extractAll(source, destination, args = {}, funcs = {}) {
    if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
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

class eventEmitter {
    on(event, func) {
        this[event] = func;
    }

    emit(event, ...args) {
        if (this[event]) this[event](...args);
    }
}

module.exports = {
    getFileHash: getFileHash,
    checkNetworkStatus: checkNetworkStatus,
    getPathLibraries: getPathLibraries,
    extractAll: extractAll,
    eventEmitter: new eventEmitter
}