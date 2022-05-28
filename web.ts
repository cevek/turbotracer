import {execSync, spawnSync} from 'child_process';
import {mkdirSync} from 'fs';
import {tmpdir} from 'os';
import {chromeLocation} from './chromeLocations';
import {openHTML} from './openHTML';
import {parseTurboFiles} from './parseTurboFiles';
import {removeTurboFiles} from './utils';

const chromeLoc = chromeLocation();
const url = process.argv[process.argv.length - 1];
if (!chromeLoc) {
    console.log('Chrome is not found in your system');
    process.exit();
}
if (url.includes('turbotracer')) throw new Error('You need to specify url');
const profileDir = tmpdir() + '/turbotracer/';
try {
    mkdirSync(profileDir);
} catch (e) {}

// console.log(chromeLocation);
removeTurboFiles('./');
const output = execSync(
    `"${chromeLoc}" --js-flags="--trace-turbo --log-code --allow-natives-syntax"  --user-data-dir=${profileDir} --profile-directory="turbotracer" --no-sandbox "${url}"`,
);
console.log(output.toString());

const files = parseTurboFiles('./', '');

// writeFileSync('data.json', JSON.stringify(files, null, 2));

openHTML(files);
removeTurboFiles('./');
