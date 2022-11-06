/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

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

    async patcher() {
        let { processors } = profile;
        
        for (let key in processors) {
            if (Object.prototype.hasOwnProperty.call(processors, key)) {
                let processor = processors[key];
                if (processor?.sides && !(processor?.sides || []).includes('client')) {
                    continue;
                }
                let jar = getPathLibraries(processor.jar)
                let filePath = path.resolve(this.pathLibraries, jar.path, jar.name)

                let args = processor.args.map(arg => this.setArgument(arg)).map(arg => this.computePath(arg));
                let classPaths = processor.classpath.map(cp => {
                    let classPath = getPathLibraries(cp)
                    return `"${path.join(this.pathLibraries, `${classPath.path}/${classPath.name}`)}"`
                });
                let mainClass = await this.readJarManifest(filePath, 'Main-Class');
                }
            }
    }
    
    setArgument(arg) {
        let finalArg = arg.replace('{', '').replace('}', '');
        
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
        .replace('{MINECRAFT_JAR}', `"${path.resolve(this.pathVersions, this.versionMinecraft, `${this.versionMinecraft}.jar`)}"`)
        .replace('{MINECRAFT_VERSION}', `"${path.resolve(this.pathVersions, this.versionMinecraft, `${this.versionMinecraft}.json`)}"`)
        .replace('{INSTALLER}', `"${this.pathLibraries}"`)
        .replace('{LIBRARY_DIR}', `"${this.pathLibraries}"`);
    }

    computePath() {
        if (arg[0] === '[') {
            let libMCP = getPathLibraries(arg.replace('[', '').replace(']', ''))
            return `"${path.join(librariesPath, `${libMCP.path}/${libMCP.name}`)}"`;
        }
        return arg;
    }
    
    async readJarManifest(jarPath, property) {
        let { extraction: list } = await extractAll(jarPath, pathExtract, {
            toStdout: true,
            $cherryPick: 'META-INF/MANIFEST.MF'
        });
      
        if (list.info.has(property)) return list.info.get(property);
        return null;
    }
}

