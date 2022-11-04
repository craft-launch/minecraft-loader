/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const fs = require('fs');
const path = require('path');
const nodeFetch = require('node-fetch');
const eventEmitter = require('events').EventEmitter;

module.exports = class download {
    constructor() {
        this.on = eventEmitter.prototype.on;
        this.emit = eventEmitter.prototype.emit;
    }

    async downloadFile(url, destination, fileName) {
        let filePath = path.resolve(destination, fileName);
        let file = fs.createWriteStream(filePath);
        let response = await nodeFetch(url);
        let size = response.headers.get('content-length');
        let downloaded = 0;

        if (!response.ok) return response

        return new Promise(resolve => {
            response.body.pipe(file);

            response.body.on('data', chunk => {
                downloaded += chunk.length;
                this.emit('progress', downloaded, size, fileName);
            });
            response.body.on('end', () => {
                let status = response.status;
                resolve(status);
            });
        });
    }

    async checkURL(url) {
        let response = await nodeFetch(url, { method: 'HEAD' });
        if (response.status === 200) {
            return {
                size: parseInt(response.headers.get('content-length')),
                status: response.status
            };
        } else return false;
    }

    async start(url) {
        let size = await nodeFetch(url, { method: "HEAD" }).then(res => parseInt(res.headers.get("content-length")));
        this.emit("progress", 0, size);
        let res = await nodeFetch(url);

        let data = Buffer.allocUnsafe(size);
        let downloaded = 0;

        res.body.on('data', (chunk) => {
            data.fill(chunk, downloaded, downloaded + chunk.length);
            downloaded += chunk.length;
            this.emit("progress", downloaded, size);
        });

        let start = new Date().getTime();
        let before = 0;

        let speeds = [];

        let interval = setInterval(() => {
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
        }, 1000);

        res.body.on('end', () => {
            clearInterval(interval);
            this.emit("finish", data);
        });
    }

    multiple(files, totalsize, limit = 1) {
        let fileName
        this.emit("progress", 0, totalsize, fileName);

        let complete = 0;
        let queued = 0;
        let i = 0;

        let start = new Date().getTime();
        let before = 0;
        let downloaded = 0;

        let speeds = [];

        let interval = setInterval(() => {
            let duration = (new Date().getTime() - start) / 1000;
            let loaded = (downloaded - before) * 8;
            if (speeds.length >= 5) speeds = speeds.slice(1);
            speeds.push((loaded / duration) / 8);
            let speed = 0;
            for (let s of speeds) speed += s;
            speed /= speeds.length;
            this.emit("speed", speed);
            let time = (totalsize - downloaded) / (speed);
            this.emit("estimated", time);
            start = new Date().getTime();
            before = downloaded;
        }, 1000);

        let progressInterval = setInterval(() => {
            this.emit("progress", downloaded, totalsize, fileName);
        }, 100);

        queue();

        let finish = this.finish;

        function queue() {
            if (complete == files.length) {
                clearInterval(interval);
                clearInterval(progressInterval);
                if (finish) finish();
                return;
            }

            while (queued < limit) {
                if (i == files.length) break;
                download();
            }
        }

        async function download() {
            let file = files[i++];
            fileName = file.name
            queued++;

            if (!fs.existsSync(file.folder)) fs.mkdirSync(file.folder, { recursive: true, mode: 0o777 });
            let flag = fs.openSync(file.path, "w", 0o777);
            let position = 0;

            let res = await nodeFetch(file.url);
            res.body.on('data', (chunk) => {
                downloaded += chunk.length;
                position += chunk.length;
                fs.writeSync(flag, chunk, 0, chunk.length, position - chunk.length, (e) => { if (e) throw e });
            });

            res.body.on('end', () => {
                fs.closeSync(flag);
                complete += 1
                queued -= 1
                queue();
            });
        }
    }
}