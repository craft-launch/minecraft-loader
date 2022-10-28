const loader = require('./utils/loader');
const Forge = require('./utils/forge');


class index {
    constructor(options = {}) {
        this.options = options;
    }

    async download() {
        let Loader = loader.Loader(this.options.loader.type);
        if (Loader.error) return Loader;
        let json = await this[Object.entries(Loader)[0][0]](Loader)

        return json;
    }

    async forge(Loader) {
        let forge = new Forge(this.options);
        let pathInstaller = await forge.downloadInstaller(Loader);
        if (pathInstaller.error) return pathInstaller;
        
        let installProfile = await forge.installProfile(pathInstaller);
        return installProfile;
    }

    async fabric(Loader) {}

}

module.exports = index;