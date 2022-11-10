/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const spawn = require('child_process').spawn;
const path = require('path');

const { getPathLibraries, extractAll } = require('../../utils');

const eventEmitter = require('events').EventEmitter;

 
module.exports = class forgePatcher {
    constructor(options) {
        this.options = options;
        this.path = path.resolve(this.options.path);
        this.pathLibraries = path.resolve(this.path, 'libraries');
        this.pathVersions = path.resolve(this.path, 'versions');
        this.pathTemp = path.resolve(this.path, 'temp');
        this.versionMinecraft = this.options.loader.version;
        this.on = eventEmitter.prototype.on;
        this.emit = eventEmitter.prototype.emit;
    }

    async patcher(profile, config) {
        let { processors } = profile;
        
        for (let key in processors) {
            if (Object.prototype.hasOwnProperty.call(processors, key)) {
                let processor = processors[key];
                if (processor?.sides && !(processor?.sides || []).includes('client')) {
                    continue;
                }
                let jar = getPathLibraries(processor.jar)
                let filePath = path.resolve(this.pathLibraries, jar.path, jar.name)

                let args = processor.args.map(arg => this.setArgument(arg, profile, config)).map(arg => this.computePath(arg));
                let classPaths = processor.classpath.map(cp => {
                    let classPath = getPathLibraries(cp)
                    return `"${path.join(this.pathLibraries, `${classPath.path}/${classPath.name}`)}"`
                });
                let mainClass = await this.readJarManifest(filePath, 'Main-Class');

                await new Promise(resolve => {
                    const ps = spawn(
                        config.java,
                        [
                            '-classpath',
                            [`"${filePath}"`, ...classPaths].join(path.delimiter),
                            mainClass,
                            ...args
                        ],{ shell: true }
                    );
                    
                    ps.stdout.on('data', data => {
                        console.log(data.toString());
                    });
                    
                    ps.stderr.on('data', data => {
                        console.error(`ps stderr: ${data}`);
                    });
                    
                    ps.on('close', code => {
                        if (code !== 0) {
                            console.log(`process exited with code ${code}`);
                            resolve();
                        }
                        resolve();
                    });
                });
            }
        }
    }
    
    setArgument(arg, profile, config) {
        let finalArg = arg.replace('{', '').replace('}', '');
        let universalPath = profile.libraries.find(v =>
            (v.name || '').startsWith('net.minecraftforge:forge')
        )
        
        if (profile.data[finalArg]) {
            if (finalArg === 'BINPATCH') {
                let clientdata = getPathLibraries(profile.path || universalPath.name)
                return `"${path
                    .join(this.pathLibraries, `${clientdata.path}/${clientdata.name}`)
                    .replace('.jar', '-clientdata.lzma')}"`;
            }
            return profile.data[finalArg].client;
        }
        
        return arg
        .replace('{SIDE}', `client`)
        .replace('{ROOT}', `"${path.dirname(path.resolve(this.options.path, 'forge'))}"`)
        .replace('{MINECRAFT_JAR}', `"${config.minecraft}"`)
        .replace('{MINECRAFT_VERSION}', `"${config.minecraftJson}"`)
        .replace('{INSTALLER}', `"${this.pathLibraries}"`)
        .replace('{LIBRARY_DIR}', `"${this.pathLibraries}"`);
    }

    computePath(arg) {
        if (arg[0] === '[') {
            let libMCP = getPathLibraries(arg.replace('[', '').replace(']', ''))
            return `"${path.join(this.pathLibraries, `${libMCP.path}/${libMCP.name}`)}"`;
        }
        return arg;
    }
    
    async readJarManifest(jarPath, property) {
        let { extraction } = await extractAll(jarPath, this.pathTemp, {
            toStdout: true,
            $cherryPick: 'META-INF/MANIFEST.MF'
        });
      
        if (extraction.info.has(property)) return extraction.info.get(property);
        return null;
    }
}

