const nodeFetch = require('node-fetch');
const loader = require('./utils/loader');

class index {
    constructor(options = {}) {
        this.options = options;
    }

    async download() {
        let Loader = loader.Loader(this.options.loader.type);
        if(Loader.error) return Loader.error.message;
        let json = await this[Object.entries(Loader)[0][0]](Loader)

        
        return json;
    }

    async forge(Loader) {
        let metaData = await nodeFetch(Loader[Object.entries(Loader)[0][0]].metaData).then(res => res.json());
        if (metaData[this.options.loader.version].filter(build => build.version === this.options.loader.build)) {
            let meta = await nodeFetch(Loader[Object.entries(Loader)[0][0]].meta.replace('${version}', this.options.loader.build)).then(res => res.json());
            return meta;
        }
    }
    async fabric(Loader) {}
}

module.exports = index;