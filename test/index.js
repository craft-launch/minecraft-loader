const loaderDownloader = require('../index');


async function main() {
    let loader = new loaderDownloader({
        path: './.MC',
        timeout: 5 * 1000,
        loader: {
            type: 'forge',
            version: '1.19.2',
            build: 'latest'
            // build: '1.12.2-14.23.5.2838'
        }
    });

    await loader.download()
}

main();