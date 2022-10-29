const loaderDownloader = require('../index');


async function main() {
    let loader = new loaderDownloader({
        path: './.MC',
        timeout: 5000,
        loader: {
            type: 'forge',
            version: '1.12.2',
            build: '1.12.2-14.23.5.2838'
        }
    });

    console.log(await loader.download());
}

main();