const loaderDownloader = require('../index');

let opt = {
    path: './.MC',
    timeout: 10000,
    loader: {
        type: 'forge',
        version: '1.5.2',
        build: 'latest',
        config: false
    }
}

let loader = new loaderDownloader(opt);

loader.install();

loader.on('error', err => {
    console.log(err);
});

loader.on('json', json => {
    console.log(json);
});

loader.on('progress', (progress, size, element) => {
    console.log(`Downloading ${element} ${Math.round((progress / size) * 100)}%`);
});

loader.on('end', () => {
    console.log('end');
});

loader.on('download', download => {
    console.log(download);
});

loader.on('extract', extract => {
    console.log(extract);
});

loader.on('patch', patch => {
    console.log(patch);
});