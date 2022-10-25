const nodeFetch = require('node-fetch');
const loader = require('./utils/loader');
const fs = require('fs');

class index {
    constructor(options = {}) {
        this.options = options;
    }

    async download() {
        let Loader = loader.Loader(this.options.loader.type);
        if(Loader.error) return Loader;
        let json = await this[Object.entries(Loader)[0][0]](Loader)

        return json;
    }

    async forge(Loader) {
        let metaData = (await nodeFetch(Loader[Object.entries(Loader)[0][0]].metaData).then(res => res.json()))[this.options.loader.version];
        let forgeURL = Loader[Object.entries(Loader)[0][0]].install
        if(!metaData) return {error: {message: 'Invalid version'}};

        metaData = metaData.filter(build => build === this.options.loader.build)[0];
        if(!metaData) return {error: {message: 'Invalid build'}};

        forgeURL = forgeURL.replace(/\${version}/g, metaData);
        
        return forgeURL;
    }

    async fabric(Loader) {}

}

module.exports = index;