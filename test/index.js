const loaderDownloader = require('../index');


async function main() {
    let loader = new loaderDownloader({
        loader: {
            type: 'forge',
            version: '1.19.2',
            build: '1.19.2-43.1.43'
        }
    });

    console.log(await loader.download());

}

main();