const crypto = require('crypto');
const nodeFetch = require('node-fetch');
const admZip = require('adm-zip');
const fs = require('fs');

const download = require('./download');
const minecraft = require('./minecraft');
const downloadTools = require('./downloadTools');

class utils {
    async getFileHash(filePath, algorithm = 'sha1') {
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

    async checkNetworkStatus(timeout = 10000) {
        const networkStatus = await nodeFetch('https://google.com', { timeout }).then(() => true).catch(() => false);
        return networkStatus;
    }

    getPathLibraries(main, nativeString, forceExt) {
        let libSplit = main.split(':')
        let fileName = libSplit[3] ? `${libSplit[2]}-${libSplit[3]}` : libSplit[2];
        let finalFileName = fileName.includes('@') ? fileName.replace('@', '.') : `${fileName}${nativeString || ''}${forceExt || '.jar'}`;
        let pathLib = `${libSplit[0].replace(/\./g, '/')}/${libSplit[1]}/${libSplit[2].split('@')[0]}`
        return {
            path: pathLib,
            name: `${libSplit[1]}-${finalFileName}`
        };
    }

    async extractAll(source, destination, veryfy = null) {
        if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });

        let zip = new admZip(source);
        let entries = zip.getEntries();

        return new Promise(resolve => {
            for (let entry of entries) {
                if (entry.isDirectory) {
                    if (entry.entryName.startsWith("META-INF")) continue;
                    fs.mkdirSync(`${destination}/${entry.entryName}`, { recursive: true, mode: 0o777 });
                    continue
                }

                if (entry.entryName.startsWith("META-INF")) {
                    if (veryfy !== entry.entryName) continue;
                    let data = zip.readFile(entry).toString();
                    veryfy = data.split('Main-Class: ')[1].split('\r\n')[0];
                    continue;
                }

                zip.extractEntryTo(entry, destination, true, true);
            }
            resolve(veryfy);
        });
    }

    loader(type) {
        if (type === 'forge') {
            return {
                metaData: 'https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json',
                meta: 'https://files.minecraftforge.net/net/minecraftforge/forge/${build}/meta.json',
                promotions: 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json',
                install: 'https://maven.minecraftforge.net/net/minecraftforge/forge/${version}/forge-${version}-installer.jar'

            }
        } else if (type === 'fabric') {
            return {
                metaData: 'https://meta.fabricmc.net/v2/versions',
                json: 'https://meta.fabricmc.net/v2/versions/loader/${version}/${build}/profile/json'
            }
        } else if (type === 'quilt') {
            return {
                metaData: 'https://meta.quiltmc.org/v3/versions',
                json: 'https://meta.quiltmc.org/v3/versions/loader/${version}/${build}/profile/json'
            }
        }
    }
}

let utilsInstance = new utils();

let mirrors = [
    "https://maven.minecraftforge.net",
    "https://maven.creeperhost.net",
    "https://libraries.minecraft.net"
]

module.exports = {
    getFileHash: utilsInstance.getFileHash,
    checkNetworkStatus: utilsInstance.checkNetworkStatus,
    getPathLibraries: utilsInstance.getPathLibraries,
    extractAll: utilsInstance.extractAll,
    loader: utilsInstance.loader,
    download: download,
    mirrors: mirrors,
    minecraft: minecraft,
    downloadTools: downloadTools
}