const nodeFetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const { getFileHash, getPathLibraries, extractAll } = require('./utils');

module.exports = class index {
    constructor(options = {}) {
        this.options = options;
    }

    async downloadInstaller(Loader) {
        let metaData = (await nodeFetch(Loader[Object.entries(Loader)[0][0]].metaData).then(res => res.json()))[this.options.loader.version];
        let forgeURL = Loader[Object.entries(Loader)[0][0]].install
        if (!metaData) return { error: { message: 'Invalid version' } };

        let build
        if (this.options.loader.build === 'latest') {
            let promotions = await nodeFetch(Loader[Object.entries(Loader)[0][0]].promotions).then(res => res.json());
            promotions = promotions.promos[`${this.options.loader.version}-latest`];
            build = metaData.find(build => build.includes(promotions))
        } else if (this.options.loader.build === 'recommended') {
            let promotion = await nodeFetch(Loader[Object.entries(Loader)[0][0]].promotions).then(res => res.json());
            let promotions = promotion.promos[`${this.options.loader.version}-recommended`];
            if (!promotions) promotions = promotion.promos[`${this.options.loader.version}-latest`];
            build = metaData.find(build => build.includes(promotions))
        } else {
            build = this.options.loader.build;
        }

        metaData = metaData.filter(b => b === build)[0];
        if (!metaData) return { error: { message: 'Invalid build' } };

        forgeURL = forgeURL.replace(/\${version}/g, metaData);
        let urlMeta = Loader[Object.entries(Loader)[0][0]].meta.replace(/\${build}/g, metaData);

        let pathFolder = path.resolve(this.options.path, 'forge');
        let filePath = path.resolve(pathFolder, `forge-${metaData}-installer.jar`);
        let meta = await nodeFetch(urlMeta).then(res => res.json());

        if (!fs.existsSync(filePath)) {
            let forge = await nodeFetch(forgeURL)
            if (forge.status !== 200) return { error: { message: 'Invalid forge installer' } };
            forge = await forge.buffer();
            if (!fs.existsSync(pathFolder)) fs.mkdirSync(pathFolder, { recursive: true });
            fs.writeFileSync(filePath, forge);
        }

        let hashFileDownload = await getFileHash(filePath, 'md5');
        let hashFileOrigin = meta?.classifiers?.installer?.jar;

        if (hashFileDownload !== hashFileOrigin) {
            fs.rmSync(filePath);
            return { error: { message: 'Invalid hash' } };
        } 
        return { filePath, metaData }
    }

    async installProfile(pathInstaller) {
        let forgeJSON = {}
        let pathExtract = path.resolve(this.options.path, 'temp');

        await extractAll(pathInstaller, pathExtract, { $cherryPick: 'install_profile.json' });

        let file = fs.readFileSync(path.resolve(pathExtract, 'install_profile.json'));
        let forgeJsonOrigin = JSON.parse(file);
      
        
        if (!forgeJsonOrigin) return { error: { message: 'Invalid forge installer' } };
        if (forgeJsonOrigin.install) {
            forgeJSON.install = forgeJsonOrigin.install;
            forgeJSON.version = forgeJsonOrigin.versionInfo;
        } else {
            forgeJSON.install = forgeJsonOrigin;
            await extractAll(pathInstaller, pathExtract, { $cherryPick: path.basename(forgeJSON.install.json) })
            let file = fs.readFileSync(path.resolve(pathExtract, path.basename(forgeJSON.install.json)));
            forgeJSON.version = JSON.parse(file);
        }

        fs.rmSync(pathExtract, { recursive: true });
        return forgeJSON;
    }

    async jarPathInstall(forgeJSON, pathInstaller) {
        let pathExtract = path.resolve(this.options.path, 'temp');
        let skipForgeFilter = true

        if (forgeJSON.install.filePath) {
            let fileInfo = getPathLibraries(forgeJSON.install.path)
            await extractAll(pathInstaller, pathExtract, { $cherryPick: forgeJSON.install.filePath });

            let file = path.resolve(pathExtract, forgeJSON.install.filePath);
            let pathFileDest = path.resolve(this.options.path, 'libraries', fileInfo.path)

            if (!fs.existsSync(pathFileDest)) fs.mkdirSync(pathFileDest, { recursive: true });
            fs.copyFileSync(file, `${pathFileDest}/${fileInfo.name}`);

            fs.rmSync(pathExtract, { recursive: true });
            return skipForgeFilter;
        } else if (forgeJSON.install.path) {
            let fileInfo = getPathLibraries(forgeJSON.install.path)
            await extractAll(pathInstaller, pathExtract, { $cherryPick: `maven/${fileInfo.path}` });
            let listFile = fs.readdirSync(path.join(pathExtract, `maven/${fileInfo.path}`));

            await Promise.all(
                listFile.map(file => {
                    let pathFile = path.resolve(pathExtract, `maven/${fileInfo.path}`, file)
                    let pathFileDest = path.resolve(this.options.path, 'libraries', fileInfo.path)
                    if (!fs.existsSync(pathFileDest)) fs.mkdirSync(pathFileDest, { recursive: true });
                    fs.copyFileSync(pathFile, `${pathFileDest}/${file}`);
                })
            );

            fs.rmSync(pathExtract, { recursive: true });
            return skipForgeFilter;
        } else {
            skipForgeFilter = false
            return skipForgeFilter;
        }
    }

    async installLibraries(forgeJSON, skipForgeFilter) {
        let { libraries } = forgeJSON.version;

        if (forgeJSON.install.libraries) libraries = libraries.concat(forgeJSON.install.libraries);

        libraries = libraries.filter((library, index, self) => index === self.findIndex(t => t.name === library.name))

        let skipForge = [
            'net.minecraftforge:forge',
            'net.minecraftforge:minecraftforge:'
        ]

        let mirror = [
            "https://maven.minecraftforge.net/",
            "https://maven.creeperhost.net/"
        ]

        for (let lib of libraries) {
            if (skipForgeFilter && skipForge.find(libs => lib.name.includes(libs))) continue
            let libInfo = getPathLibraries(lib.name);
            let pathLib = path.resolve(this.options.path, 'libraries', libInfo.path);
            let pathLibFile = path.resolve(pathLib, libInfo.name);

            if (!fs.existsSync(pathLib)) fs.mkdirSync(pathLib, { recursive: true });

            if (!fs.existsSync(pathLibFile)) {
                console.log(`Downloading ${libInfo.name}...`);
                let url = `${mirror[0]}${libInfo.path}/${libInfo.name}`;
                let libFile = await nodeFetch(url);
                if (libFile.status !== 200) {
                    url = `${mirror[1]}${libInfo.path}/${libInfo.name}`;
                    libFile = await nodeFetch(url);
                    if (libFile.status !== 200) {
                        if (lib.downloads?.artifact?.url) {
                            url = lib.downloads.artifact.url;
                            libFile = await nodeFetch(url);
                            if (libFile.status !== 200) continue;
                        } else continue;
                    }
                }
                libFile = await libFile.buffer();
                fs.writeFileSync(pathLibFile, libFile);
            }
            
        }
        return libraries
    }

    async patching(forgeJSON, pathInstaller) {
        let pathExtract = path.resolve(this.options.path, 'temp');

        if (forgeJSON.install.processors?.length) {
            await extractAll(pathInstaller, pathExtract, { $cherryPick: `data/client.lzma` });

            let universalPath = forgeJSON.install.libraries.find(v =>
                (v.name || '').startsWith('net.minecraftforge:forge')
            )

            let client = path.resolve(pathExtract, 'data/client.lzma');
            let fileInfo = getPathLibraries(forgeJSON.install.path || universalPath.name, '-clientdata' , '.lzma')
            let librariesPath = path.resolve(this.options.path, 'libraries')

            if (!fs.existsSync(`${librariesPath}/${fileInfo.path}`)) fs.mkdirSync(`${librariesPath}/${fileInfo.path}`, { recursive: true });
            fs.copyFileSync(client, `${librariesPath}/${fileInfo.path}/${fileInfo.name}`);

            let { processors } = forgeJSON.install;

            for (let key in processors) {
                if (Object.prototype.hasOwnProperty.call(processors, key)) {
                    let processor = processors[key];
                    if (processor?.sides && !(processor?.sides || []).includes('client')) {
                        continue;
                    }
                    let jar = getPathLibraries(processor.jar)
                    let filePath = path.resolve(librariesPath, jar.path, jar.name)

                    let args = processor.args.map(arg => {
                        let finalArg = arg.replace('{', '').replace('}', '');
                        if (forgeJSON.install.data[finalArg]) {
                            if (finalArg === 'BINPATCH') {
                                let clientdata = getPathLibraries(forgeJSON.install.path || universalPath.name)
                                return `"${path
                                    .join(librariesPath, `${clientdata.path}/${clientdata.name}`)
                                    .replace('.jar', '-clientdata.lzma')}"`;
                            }
                            return forgeJSON.install.data[finalArg].client;
                        }
                        return arg
                            .replace('{SIDE}', `client`)
                            .replace('{ROOT}', `"${path.dirname(path.resolve(this.options.path, 'forge'))}"`)
                            .replace('{MINECRAFT_JAR}', `"${path.resolve(this.options.path, 'versions', '1.19.2', '1.19.2.jar')}"`)
                            .replace('{MINECRAFT_VERSION}', `"${path.resolve(this.options.path, 'versions', '1.19.2', '1.19.2.json')}"`)
                            .replace('{INSTALLER}', `"${librariesPath}"`)
                            .replace('{LIBRARY_DIR}', `"${librariesPath}"`);
                    }).map(arg => {
                        if (arg[0] === '[') {
                            let libMCP = getPathLibraries(arg.replace('[', '').replace(']', ''))
                            return `"${path.join(librariesPath, `${libMCP.path}/${libMCP.name}`)}"`;
                        }
                        return arg;
                    })

                    const classPaths = processor.classpath.map(cp => {
                        let classPath = getPathLibraries(cp)
                        return `"${path.join(librariesPath, `${classPath.path}/${classPath.name}`)}"`
                    });

                    const readJarManifest = async (jarPath, property) => {
                        const { extraction: list } = await extractAll(jarPath, '.', {
                            toStdout: true,
                            $cherryPick: 'META-INF/MANIFEST.MF'
                        });
                      
                        if (list.info.has(property)) return list.info.get(property);
                        return null;
                      };

                    const mainClass = await readJarManifest(filePath, 'Main-Class');

                    await new Promise(resolve => {
                        const ps = spawn(
                            `"C:\\Users\\Luuxis\\Desktop\\Minecraft\\Minecraft Launcher\\runtime\\java-runtime-gamma\\windows-x64\\java-runtime-gamma\\bin\\java.exe"`,
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

            fs.rmSync(pathExtract, { recursive: true });
        }
    }
}