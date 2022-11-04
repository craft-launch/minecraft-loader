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
                size: response.headers.get('content-length'),
                status: response.status
            };
        }
        else return false;
    }
}