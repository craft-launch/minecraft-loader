/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const path = require('path');
const nodeFetch = require('node-fetch');
const fs = require('fs');
const eventEmitter = require('events').EventEmitter;

const { extractAll, getFileHash, download, getPathLibraries, mirrors } = require('../../utils');
const forgePatcher = require('./forgePatcher');

module.exports = class index {
    constructor(options = {}) {
        this.options = options;
        this.versionMinecraft = this.options.loader.version;
        this.path = path.resolve(this.options.path);
        this.pathLibraries = path.resolve(this.path, 'libraries');
        this.pathVersions = path.resolve(this.path, 'versions');
        this.pathTemp = path.resolve(this.path, 'temp');
        this.on = eventEmitter.prototype.on;
        this.emit = eventEmitter.prototype.emit;
    }

    async donwloadInstaller(Loader) {
        let metaData = (await nodeFetch(Loader.metaData).then(res => res.json()))[this.versionMinecraft];
        let forgeURL = Loader.install
        if (!metaData) return { error: `Forge ${this.versionMinecraft} not found` };

        let build
        if (this.options.loader.build === 'latest') {
            let promotions = await nodeFetch(Loader.promotions).then(res => res.json());
            promotions = promotions.promos[`${this.versionMinecraft}-latest`];
            build = metaData.find(build => build.includes(promotions))
        } else if (this.options.loader.build === 'recommended') {
            let promotion = await nodeFetch(Loader.promotions).then(res => res.json());
            let promotions = promotion.promos[`${this.versionMinecraft}-recommended`];
            if (!promotions) promotions = promotion.promos[`${this.versionMinecraft}-latest`];
            build = metaData.find(build => build.includes(promotions))
        } else {
            build = this.options.loader.build;
        }

        metaData = metaData.filter(b => b === build)[0];
        if (!metaData) return { error: `Build ${build} not found` };

        forgeURL = forgeURL.replace(/\${version}/g, metaData);
        let urlMeta = Loader.meta.replace(/\${build}/g, metaData);

        let pathFolder = path.resolve(this.path, 'forge');
        let filePath = path.resolve(pathFolder, `forge-${metaData}-installer.jar`);
        let meta = await nodeFetch(urlMeta).then(res => res.json());

        if (!fs.existsSync(filePath)) {
            if (!fs.existsSync(pathFolder)) fs.mkdirSync(pathFolder, { recursive: true });
            let downloadForge = new download();

            downloadForge.on('progress', (downloaded, size, fileName) => {
                this.emit('progress', downloaded, size, fileName);
            });

            await downloadForge.downloadFile(forgeURL, pathFolder, `forge-${metaData}-installer.jar`);
        }

        let hashFileDownload = await getFileHash(filePath, 'md5');
        let hashFileOrigin = meta?.classifiers?.installer?.jar;

        if (hashFileDownload !== hashFileOrigin) {
            fs.rmSync(filePath);
            return { error: 'Invalid hash' };
        }
        return { filePath, metaData }
    }

    async extractProfile(pathInstaller) {
        let forgeJSON = {}

        await extractAll(pathInstaller, this.pathTemp, { $cherryPick: 'install_profile.json' });

        let file = fs.readFileSync(path.resolve(this.pathTemp, 'install_profile.json'));
        let forgeJsonOrigin = JSON.parse(file);


        if (!forgeJsonOrigin) return { error: { message: 'Invalid forge installer' } };
        if (forgeJsonOrigin.install) {
            forgeJSON.install = forgeJsonOrigin.install;
            forgeJSON.version = forgeJsonOrigin.versionInfo;
        } else {
            forgeJSON.install = forgeJsonOrigin;
            await extractAll(pathInstaller, this.pathTemp, { $cherryPick: path.basename(forgeJSON.install.json) })
            let file = fs.readFileSync(path.resolve(this.pathTemp, path.basename(forgeJSON.install.json)));
            forgeJSON.version = JSON.parse(file);
        }

        fs.rmSync(this.pathTemp, { recursive: true });
        return forgeJSON;
    }

    async extractUniversalJar(profile, pathInstaller) {
        let skipForgeFilter = true
        await extractAll(pathInstaller, this.pathTemp);


        if (profile.filePath) {
            let fileInfo = getPathLibraries(profile.path)
            this.emit('extract', `Extracting ${fileInfo.name}...`);

            let file = path.resolve(this.pathTemp, profile.filePath);
            let pathFileDest = path.resolve(this.pathLibraries, fileInfo.path)

            if (!fs.existsSync(pathFileDest)) fs.mkdirSync(pathFileDest, { recursive: true });
            fs.copyFileSync(file, `${pathFileDest}/${fileInfo.name}`);
        } else if (profile.path) {
            let fileInfo = getPathLibraries(profile.path)
            let listFile = fs.readdirSync(path.join(this.pathTemp, `maven/${fileInfo.path}`));

            await Promise.all(
                listFile.map(file => {
                    this.emit('extract', `Extracting ${file}...`);
                    let pathFile = path.resolve(this.pathTemp, `maven/${fileInfo.path}`, file)
                    let pathFileDest = path.resolve(this.pathLibraries, fileInfo.path)
                    if (!fs.existsSync(pathFileDest)) fs.mkdirSync(pathFileDest, { recursive: true });
                    fs.copyFileSync(pathFile, `${pathFileDest}/${file}`);
                })
            ); 
        } else {
            skipForgeFilter = false
        }

        if (profile.processors?.length) {
            let universalPath = profile.libraries.find(v => {
                return (v.name || '').startsWith('net.minecraftforge:forge')
            })

            let client = path.resolve(this.pathTemp, 'data/client.lzma');
            let fileInfo = getPathLibraries(profile.path || universalPath.name, '-clientdata' , '.lzma')
            let pathFile = path.resolve(this.pathLibraries, fileInfo.path)
            
            if (!fs.existsSync(pathFile)) fs.mkdirSync(pathFile, { recursive: true });
            fs.copyFileSync(client, `${pathFile}/${fileInfo.name}`);
            this.emit('extract', `Extracting ${fileInfo.name}...`);
        }

        fs.rmSync(this.pathTemp, { recursive: true });
        return skipForgeFilter
    }

    async downloadLibraries(profile, skipForgeFilter) {
        let { libraries } = profile.version;
        let files = [];
        let size = 0;

        if (profile.install.libraries) libraries = libraries.concat(profile.install.libraries);

        libraries = libraries.filter((library, index, self) => index === self.findIndex(t => t.name === library.name))

        let skipForge = [
            'net.minecraftforge:forge',
            'net.minecraftforge:minecraftforge:'
        ]

        for (let lib of libraries) {
            if (skipForgeFilter && skipForge.find(libs => lib.name.includes(libs))) continue
            if (lib.rules) continue
            let file = {}
            let libInfo = getPathLibraries(lib.name);
            let pathLib = path.resolve(this.pathLibraries, libInfo.path);
            let pathLibFile = path.resolve(pathLib, libInfo.name);

            if (!fs.existsSync(pathLibFile)) {
                let url
                let sizeFile = 0
                for (let mirror of mirrors) {
                    url = `${mirror}${libInfo.path}/${libInfo.name}`;
                    let response = await new download().checkURL(url);
                    if (response.status === 200) {
                        size += response.size;
                        sizeFile = response.size;
                        break
                    } else if (lib.downloads?.artifact) {
                        url = lib.downloads.artifact.url
                        size += lib.downloads.artifact.size;
                        sizeFile = lib.downloads.artifact.size;
                        break
                    } else {
                        url = null
                    }
                }
                
                if (!url) return { error: `Library ${lib.name} not found` };

                file = {
                    url: url,
                    folder: pathLib,
                    path: `${pathLib}/${libInfo.name}`,
                    name: libInfo.name,
                    size: sizeFile
                }
                files.push(file);                
            }
        }

        if (files.length > 0) {
            let downloader = new download();

            downloader.on("progress", (DL, totDL, file) => {
                this.emit("progress", DL, totDL, file);
            });

            await new Promise((ret) => {
                downloader.on("finish", ret);
                downloader.multiple(files, size, 10);
            });
        }
        return libraries
    }

    async patchForge(profile) {
        if (profile.processors?.length) {
            let patcher = new forgePatcher(this.options);
 
            
        } else {
            return true
        }
    }
}