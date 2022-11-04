/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const path = require('path');
const fs = require('fs');
const eventEmitter = require('events').EventEmitter;

const { checkNetworkStatus, loader } = require('./utils');
const Forge = require('./loader/forge');

class index {
    constructor(options = {}) {
        this.options = options;
        this.path = path.resolve(this.options.path);
        this.pathLibraries = path.resolve(this.path, 'libraries');
        this.pathVersions = path.resolve(this.path, 'versions');
        this.pathTemp = path.resolve(this.path, 'temp');
        this.on = eventEmitter.prototype.on;
        this.emit = eventEmitter.prototype.emit;
    }

    async install() {
        let networkStatus = await checkNetworkStatus(this.options.timeout);
        if (!networkStatus) return this.emit('error', { error: 'Network error' });

        let Loader = loader(this.options.loader.type);
        if (!Loader) return this.emit('error', { error: `Loader ${this.options.loader.type} not found` });

        if (this.options.loader.type === 'forge') {
            let forge = await this.forge(Loader);
            this.emit('json', forge);
        } else if (this.options.loader.type === 'fabric') {
            let fabric = await this.fabric(Loader);
            this.emit('json', fabric);
        }
    }

    async forge(Loader) {
        let forge = new Forge(this.options);

        // set event
        forge.on('progress', (progress, size, element) => {
            this.emit('progress', progress, size, element);
        });

        forge.on('extract', (element) => {
            this.emit('extract', element);
        });

        // download installer
        let installer = await forge.donwloadInstaller(Loader);
        if (installer.error) return this.emit('error', installer);

        // extract install profile
        let profile = await forge.extractProfile(installer.filePath);
        if (profile.error) return this.emit('error', profile);
        let destination = path.resolve(this.pathVersions, profile.version.id)
        if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
        fs.writeFileSync(path.resolve(destination, `${profile.version.id}.json`), JSON.stringify(profile.version));

        // extract universal jar
        let universal = await forge.extractUniversalJar(profile.install, installer.filePath);
        if (universal.error) return this.emit('error', universal);

        // download libraries
        let libraries = await forge.downloadLibraries(profile, universal);
        if (libraries.error) return this.emit('error', libraries);
        
    }

    async fabric(Loader) {}
}

module.exports = index;