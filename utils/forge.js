const nodeFetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

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
        let forge = await nodeFetch(forgeURL).then(res => res.buffer());
        let pathFolder = path.resolve(this.options.path, 'forge');
        let filePath = path.resolve(pathFolder, `forge-${metaData}-installer.jar`);
        if (!fs.existsSync(pathFolder)) fs.mkdirSync(pathFolder, { recursive: true });
        fs.writeFileSync(filePath, forge);

        let hash = await this.getFileHash(filePath, 'md5');
        console.log(hash);
        return filePath;
    }

    async getFileHash(filePath, algorithm = 'sha1') {
        const shasum = crypto.createHash(algorithm);
        
        const s = fs.ReadStream(filePath);
        s.on('data', data => {
            shasum.update(data);
        });
        const hash = await new Promise(resolve => {
            s.on('end', () => {
                resolve(shasum.digest('hex'));
            });
        });
        return hash;
    };
}