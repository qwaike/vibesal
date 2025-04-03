const https = require('https');
const fs = require('fs');
const path = require('path');

const VERSION = '0.156.1';
const BASE_URL = `https://unpkg.com/three@${VERSION}`;

const files = [
    '/build/three.module.js',
    '/examples/jsm/controls/PointerLockControls.js',
    '/examples/jsm/loaders/GLTFLoader.js'
];

function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', err => {
            fs.unlink(outputPath, () => reject(err));
        });
    });
}

async function downloadDependencies() {
    for (const file of files) {
        const url = `${BASE_URL}${file}`;
        const outputPath = path.join(__dirname, 'lib', file.replace('/examples/jsm/', 'addons/'));
        
        // Create directory if it doesn't exist
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        console.log(`Downloading ${url}...`);
        await downloadFile(url, outputPath);
        console.log(`Downloaded to ${outputPath}`);
    }
}

downloadDependencies().catch(console.error); 