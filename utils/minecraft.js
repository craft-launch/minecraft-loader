/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0/
 */

const os = require("os");
const nodeFetch = require("node-fetch");
 
module.exports = class minecraft {
    async GetJsonJava(jsonversion) {
        let version
        let files = [];
        let javaVersionsJson = await nodeFetch("https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json").then(res => res.json())
        
        if (!jsonversion.javaVersion) jsonversion = "jre-legacy"
        else jsonversion = jsonversion.javaVersion.component

        if (os.platform() == "win32") {
            let arch = { x64: "windows-x64", ia32: "windows-x86" }
            version = `jre-${javaVersionsJson[`${arch[os.arch()]}`][jsonversion][0].version.name}`
            javaVersionsJson = Object.entries((await nodeFetch(javaVersionsJson[`${arch[os.arch()]}`][jsonversion][0].manifest.url).then(res => res.json())).files)
        } else if (os.platform() == "darwin") {
            let arch = { x64: "mac-os", arm64: "mac-os-arm64" }
            version = `jre-${javaVersionsJson[`${arch[os.arch()]}`][jsonversion][0].version.name}`
            javaVersionsJson = Object.entries((await nodeFetch(javaVersionsJson[`${arch[os.arch()]}`][jsonversion][0].manifest.url).then(res => res.json())).files)   
        } else if (os.platform() == "linux") {
            let arch = { x64: "linux", ia32: "linux-i386" }
            version = `jre-${javaVersionsJson[`${arch[os.arch()]}`][jsonversion][0].version.name}`
            javaVersionsJson = Object.entries((await nodeFetch(javaVersionsJson[`${arch[os.arch()]}`][jsonversion][0].manifest.url).then(res => res.json())).files)
        } else return console.log("OS not supported");
    
        let java = javaVersionsJson.find(file => file[0].endsWith(process.platform == "win32" ? "bin/javaw.exe" : "bin/java"))[0];
        let toDelete = java.replace(process.platform == "win32" ? "bin/javaw.exe" : "bin/java", "");
        
        for (let [path, info] of javaVersionsJson) {
            if (info.type == "directory") continue;
            if (!info.downloads) continue;
            let file = {};
            file.path = `runtime/${version}/${path.replace(toDelete, "")}`;
            file.folder = file.path.split("/").slice(0, -1).join("/");
            file.name = file.path.split("/").slice(-1)[0];
            file.size = info.downloads.raw.size;
            file.url = info.downloads.raw.url;
            files.push(file);
            console.log(path)
        }
        return { files: files, version: version };
    }

    async GetJsonMinecraft(version) {
        let data = await nodeFetch(`https://launchermeta.mojang.com/mc/game/version_manifest_v2.json?_t=${new Date().toISOString()}`);
        data = await data.json();
        data = data.versions.find(v => v.id === version);
        data = await nodeFetch(data.url);
        data = await data.json();
        return data;
    }
}