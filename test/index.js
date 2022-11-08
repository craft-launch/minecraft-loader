const loaderDownloader = require('../index');

let opt = {
    path: './.MC',
    timeout: 10000,
    autoClean: false,
    loader: {
        type: 'forge',
        version: '1.19.2',
        build: 'latest',
        config: false
    }
}

let loader = new loaderDownloader(opt);

loader.install();

loader.on('json', json => {
    // console.log(json);
});

loader.on('extract', extract => {
    console.log(extract);
});

loader.on('progress', (progress, size, element) => {
    console.log(`Downloading ${element} ${Math.round((progress / size) * 100)}%`);
});

loader.on('patch', patch => {
    console.log(patch);
});

loader.on('error', err => {
    console.log(err);
});