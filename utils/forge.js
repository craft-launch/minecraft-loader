const nodeFetch = require('node-fetch');
const Seven = require('node-7z');
const sevenPath = require('7zip-bin').path7za;
const path = require('path');
const fs = require('fs');

const { getFileHash } = require('./utils');

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
        let forge = await nodeFetch(forgeURL).then(res => res.buffer());
        let meta = await nodeFetch(urlMeta).then(res => res.json());

        let pathFolder = path.resolve(this.options.path, 'forge');
        let filePath = path.resolve(pathFolder, `forge-${metaData}-installer.jar`);
        if (!fs.existsSync(pathFolder)) fs.mkdirSync(pathFolder, { recursive: true });
        fs.writeFileSync(filePath, forge);

        let hashFileDownload = await getFileHash(filePath, 'md5');
        let hashFileOrigin = meta?.classifiers?.installer?.jar;
        if (hashFileDownload === hashFileOrigin) return { filePath, metaData };
        else return { error: { message: 'Invalid hash' } };
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

        if (forgeJsonOrigin.install) {
            forgeJSON.install = forgeJsonOrigin.install;
            forgeJSON.version = forgeJsonOrigin.versionInfo;
        } else {
            forgeJSON.install = forgeJsonOrigin;
        }

        return forgeJSON;
    }
}