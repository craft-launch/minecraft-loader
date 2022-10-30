const fs = require('fs');
const path = require('path');

const { checkNetworkStatus } = require('./utils/utils');
const loader = require('./utils/loader');
const Forge = require('./utils/forge');


class index {
    constructor(options = {}) {
        this.options = options;
    }

    async download() {
        let networkStatus = await checkNetworkStatus(this.options.timeout);
        if (!networkStatus) return { error: { message: 'Network error' } };
        let Loader = loader.Loader(this.options.loader.type);
        if (Loader.error) return Loader;
        let json = await this[Object.entries(Loader)[0][0]](Loader)
        return json;
    }

    async forge(Loader) {
        let forge = new Forge(this.options);
        let forgeInstaller = await forge.downloadInstaller(Loader);
        if (forgeInstaller.error) return forgeInstaller;

        let installProfile = await forge.installProfile(forgeInstaller.filePath);
        if (installProfile.error) return installProfile;

        let versionFolder = path.resolve(this.options.path, 'versions', `forge-${forgeInstaller.metaData}`);
        if (!fs.existsSync(versionFolder)) fs.mkdirSync(versionFolder, { recursive: true });

        let forgeJSONPath = path.resolve(versionFolder, `forge-${forgeInstaller.metaData}.json`);
        fs.writeFileSync(forgeJSONPath, JSON.stringify(installProfile, null, 4));

        let forgeJarPath = forge.jarPathInstall(installProfile, forgeInstaller.filePath);

        return forgeJarPath;
    }

    async fabric(Loader) {}

}

module.exports = index;