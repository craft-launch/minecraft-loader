function Loader(type) {
    switch (type) {
        case 'forge':
            return {
                forge: {
                    metaData: 'https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json',
                    meta: 'https://files.minecraftforge.net/net/minecraftforge/forge/${build}/meta.json',
                    promotions: 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json',
                    install: 'https://maven.minecraftforge.net/net/minecraftforge/forge/${version}/forge-${version}-installer.jar',
                }
            }
            break;
        case 'fabric':
            return {
                fabric: {
                    metaData: 'https://meta.fabricmc.net/v2/versions/game'
                }
            }
            break;
        default:
            return {
                error: {
                    message: 'Invalid loader type'
                }
            }
            break;
    }
}

module.exports = {
    Loader: Loader
}