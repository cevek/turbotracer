import {execSync, spawnSync} from 'child_process';
import {mkdirSync} from 'fs';
import {tmpdir} from 'os';
import {openHTML} from './openHTML';
import {parseTurboFiles} from './parseTurboFiles';
import {removeTurboFiles} from './utils';

const chromeLocation = require('chrome-location') as string;
const url = process.argv[process.argv.length - 1];
if (url.includes('turbotracer')) throw new Error('You need to specify url');
const turbodir = tmpdir() + '/turbotracer/';
try {
    mkdirSync(turbodir);
} catch (e) {}

console.log(chromeLocation);
removeTurboFiles(turbodir);
const output = execSync(
    `"${chromeLocation}" --js-flags="--trace-turbo --allow-natives-syntax --trace-turbo-path=${turbodir}"  --user-data-dir=${turbodir} --profile-directory="turbotracer" --no-sandbox ` +
        url,
);
console.log(output.toString());

const files = parseTurboFiles(turbodir, '');

// writeFileSync('data.json', JSON.stringify(files, null, 2));

openHTML(files);
removeTurboFiles(turbodir);
removeTurboFiles('./');
