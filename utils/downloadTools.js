/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const fs = require('fs');
const path = require('path');
const eventEmitter = require('events').EventEmitter;

const minecraft = require('./minecraft');
const download = require('./download');

module.exports = class javaDownload {
    constructor(options = {}) {
        this.options = options;
        this.versionMinecraft = this.options.loader.version;
        this.path = path.resolve(this.options.path);
        this.on = eventEmitter.prototype.on;
        this.emit = eventEmitter.prototype.emit;
    }

    async downloadJava() {
        let files = []
        let size = 0

        let Minecraft = new minecraft(this.options);

        let version = await Minecraft.GetJsonMinecraft(this.versionMinecraft);
        let java = await Minecraft.GetJsonJava(version);

        for (let file of java.files) {
            if (fs.existsSync(path.resolve(this.path, file.path))) continue
            let pathFile = path.resolve(this.path, file.path);
            size += file.size;

            file = {
                url: file.url,
                folder: path.resolve(this.path, file.folder),
                path: pathFile,
                name: file.name,
                size: file.size
            }
            files.push(file);
        }

        if (files.length > 0) {
            let downloader = new download();

            downloader.on("progress", (DL, totDL, file) => {
                this.emit("progress", DL, totDL, file);
            });

            await new Promise((ret) => {
                downloader.on("finish", ret);
                downloader.multiple(files, size, 5);
            });
        }

        return {
            java: java,
            JSON: version
        }
    }

    async downloadMinecraftJar(Json) {
        let versionPath = path.resolve(this.pathVersions, this.versionMinecraft, this.versionMinecraft);
        let folder = path.resolve(this.pathVersions, this.versionMinecraft)

        if (!fs.existsSync(`${versionPath}.jar`)) {
            let downloadForge = new download();
            let url = Json.downloads.client.url;

            downloadForge.on('progress', (downloaded, size, fileName) => {
                this.emit('progress', downloaded, size, fileName);
            });

            await downloadForge.downloadFile(url, folder, `${this.versionMinecraft}.jar`);
        }
    }
}