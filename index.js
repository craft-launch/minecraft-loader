const nodeFetch = require('node-fetch');
const loader = require('./utils/loader');
const fs = require('fs');

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

        return forgeURL;
    }

    async fabric(Loader) {}

}

module.exports = index;