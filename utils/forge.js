const nodeFetch = require('node-fetch');
const Seven = require('node-7z');
const sevenPath = require('7zip-bin').path7za;
const path = require('path');
const fs = require('fs');

const { getFileHash, getPathLibraries } = require('./utils');

module.exports = class index {
    constructor(options = {}) {
        this.options = options;
    }

    async downloadInstaller(Loader) {
        let metaData = (await nodeFetch(Loader[Object.entries(Loader)[0][0]].metaData).then(res => res.json()))[this.options.loader.version];
        let forgeURL = Loader[Object.entries(Loader)[0][0]].install
        if (!metaData) return { error: { message: 'Invalid version' } };

        let build
        if (this.options.loader.build === 'latest') {
            let promotions = await nodeFetch(Loader[Object.entries(Loader)[0][0]].promotions).then(res => res.json());
            promotions = promotions.promos[`${this.options.loader.version}-latest`];
            build = metaData.find(build => build.includes(promotions))
        } else if (this.options.loader.build === 'recommended') {
            let promotion = await nodeFetch(Loader[Object.entries(Loader)[0][0]].promotions).then(res => res.json());
            let promotions = promotion.promos[`${this.options.loader.version}-recommended`];
            if (!promotions) promotions = promotion.promos[`${this.options.loader.version}-latest`];
            build = metaData.find(build => build.includes(promotions))
        } else {
            build = this.options.loader.build;
        }

        metaData = metaData.filter(b => b === build)[0];
        if (!metaData) return { error: { message: 'Invalid build' } };

        forgeURL = forgeURL.replace(/\${version}/g, metaData);
        let urlMeta = Loader[Object.entries(Loader)[0][0]].meta.replace(/\${build}/g, metaData);

        let pathFolder = path.resolve(this.options.path, 'forge');
        let filePath = path.resolve(pathFolder, `forge-${metaData}-installer.jar`);
        let meta = await nodeFetch(urlMeta).then(res => res.json());

        if (!fs.existsSync(filePath)) {
            let forge = await nodeFetch(forgeURL)
            if (forge.status !== 200) return { error: { message: 'Invalid forge installer' } };
            forge = await forge.buffer();
            if (!fs.existsSync(pathFolder)) fs.mkdirSync(pathFolder, { recursive: true });
            fs.writeFileSync(filePath, forge);
        }

        let hashFileDownload = await getFileHash(filePath, 'md5');
        let hashFileOrigin = meta?.classifiers?.installer?.jar;

        if (hashFileDownload !== hashFileOrigin) {
            fs.rmSync(filePath);
            return { error: { message: 'Invalid hash' } };
        } 
        return { filePath, metaData }
    }

    async installProfile(pathInstaller) {
        let forgeJSON = {}
        let pathExtract = path.resolve(this.options.path, 'temp');
        
        let forgeJsonOrigin = await new Promise(resolve => {
            Seven.extractFull(pathInstaller, pathExtract, {
                $bin: sevenPath,
                recursive: true,
                $cherryPick: 'install_profile.json'
            }).on('end', () => {
                let file = fs.readFileSync(path.resolve(pathExtract, 'install_profile.json'));
                fs.rmSync(pathExtract, { recursive: true });
                resolve(JSON.parse(file));
            });
        })
        
        if(!forgeJsonOrigin) return { error: { message: 'Invalid forge installer' } };
        if (forgeJsonOrigin.install) {
            forgeJSON.install = forgeJsonOrigin.install;
            forgeJSON.version = forgeJsonOrigin.versionInfo;
        } else {
            forgeJSON.install = forgeJsonOrigin;
        }

        return forgeJSON;
    }

    async jarPathInstall(forgeJSON, pathInstaller) {
        let pathExtract = path.resolve(this.options.path, 'temp');

        if(forgeJSON.install.filePath) {
            let forgeJarPath = await new Promise(resolve => {
                Seven.extractFull(pathInstaller, pathExtract, {
                    $bin: sevenPath,
                    recursive: true,
                    $cherryPick: forgeJSON.install.filePath
                }).on('end', async() => {
                    let fileInfo = await getPathLibraries(forgeJSON.install.path)
                    let file = fs.readFileSync(path.resolve(pathExtract, forgeJSON.install.filePath));
                    let pathFile = path.resolve(this.options.path, fileInfo.path)

                    fs.rmSync(pathExtract, { recursive: true });
                    if(!fs.existsSync(pathFile)) fs.mkdirSync(pathFile, { recursive: true });
                    
                    fs.writeFileSync(path.resolve(pathFile, fileInfo.name), file);
                    resolve(fileInfo);
                });
            })
            return forgeJarPath;
        } else if (forgeJSON.install.path) {

        }
    }
}