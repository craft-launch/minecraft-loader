/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const fs = require('fs');
const axios = require('axios');
const eventEmitter = require('events').EventEmitter;

module.exports = class download {
    constructor() {
        this.on = eventEmitter.prototype.on;
        this.emit = eventEmitter.prototype.emit;
    }

    async downloadFile(url, path, fileName) {
        if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
        const writer = fs.createWriteStream(path + '/' + fileName);
        const response = await axios.get(url, { responseType: 'stream' });
        const size = response.headers['content-length'];
        let downloaded = 0;
        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                downloaded += chunk.length;
                this.emit('progress', downloaded, size);
                writer.write(chunk);
            });

            response.data.on('end', () => {
                writer.end();
                resolve();
            });

            response.data.on('error', (err) => {
                this.emit('error', err);
                reject(err);
            });
        })
    }

    async downloadFileMultiple(files, size, limit = 1) {
        let completed = 0;
        let downloaded = 0;
        let queued = 0;

        let start = new Date().getTime();
        let before = 0;
        let speeds = [];

        let estimated = setInterval(() => {
            let duration = (new Date().getTime() - start) / 1000;
            let loaded = (downloaded - before) * 8;
            if (speeds.length >= 5) speeds = speeds.slice(1);
            speeds.push((loaded / duration) / 8);
            let speed = 0;
            for (let s of speeds) speed += s;
            speed /= speeds.length;
            this.emit("speed", speed);
            let time = (size - downloaded) / (speed);
            this.emit("estimated", time);
            start = new Date().getTime();
            before = downloaded;
        }, 500);

        const downloadNext = async() => {
            if (queued < files.length) {
                let file = files[queued];
                queued++;
                if (!fs.existsSync(file.foler)) fs.mkdirSync(file.folder, { recursive: true });
                const writer = fs.createWriteStream(file.folder + '/' + file.name);
                const response = await axios.get(file.url, { responseType: 'stream' });
                response.data.on('data', (chunk) => {
                    downloaded += chunk.length;
                    this.emit('progress', downloaded, size);
                    writer.write(chunk);
                });

                response.data.on('end', () => {
                    writer.end();
                    completed++;
                    downloadNext();
                });

                response.data.on('error', (err) => {
                    this.emit('error', err);
                });
            }
        };

        while (queued < limit) {
            downloadNext();
        }

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (completed === files.length) {
                    clearInterval(estimated);
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    checkURL(url) {
        console.log(url);
        return new Promise(async(resolve, reject) => {
            await axios.head(url, { responseType: 'stream' }).then(response => {
                resolve({
                    size: parseInt(response.headers['content-length']),
                    status: response.status
                });
            }).catch(err => {
                reject(err);
            });
        });
    }
}