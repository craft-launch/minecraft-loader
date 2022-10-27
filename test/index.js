const loaderDownloader = require('../index');


async function main() {
    let loader = new loaderDownloader({
        path: './.MC',
        loader: {
            type: 'forge',
            version: '1.12.2',
            build: 'latest'
        }
    });

    console.log(await loader.download());

}

main();