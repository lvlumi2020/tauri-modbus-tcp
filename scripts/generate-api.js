const { generateApi } = require('swagger-typescript-api');
const path = require('path');
const config = require('../config.json');

async function generate() {
    try {
        await generateApi({
            name: 'api.ts',
            output: path.resolve(__dirname, '../src/api'),
            url: config.openapi.url,
            httpClientType: 'axios',
            generateClient: true,
            generateRouteTypes: true,
            generateResponses: true,
            extractRequestParams: true,
            extractRequestBody: true
        });

        console.log('API generate success！');
    } catch (error) {
        console.error('API generate failed', error);
        process.exit(1);
    }
}

generate();