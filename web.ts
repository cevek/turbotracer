import {execSync, spawnSync} from 'child_process';
import {mkdirSync} from 'fs';
import {tmpdir} from 'os';
import {openHTML} from './openHTML';
import {parseTurboFiles} from './parseTurboFiles';
import {removeTurboFiles} from './utils';

const url = process.argv[process.argv.length - 1];
if (url.includes('turbotracer')) throw new Error('You need to specify url');
const turbodir = tmpdir() + '/turbo/';
try {
    mkdirSync(turbodir);
} catch (e) {}

removeTurboFiles(turbodir);
let output;
if (process.platform === 'win32') {
    output = execSync(
        `chrome.exe --js-flags="--trace-turbo --allow-natives-syntax --trace-turbo-path=${turbodir}"  --user-data-dir=${turbodir}" --profile-directory="turbotracer" --no-sandbox ` +
            url,
    );
} else if (process.platform === 'linux') {
    output = execSync(
        `google-chrome --js-flags="--trace-turbo --allow-natives-syntax --trace-turbo-path=${turbodir}"  --user-data-dir=${turbodir}" --profile-directory="turbotracer" --no-sandbox ` +
            url,
    );
} else if (process.platform === 'darwin') {
    output = execSync(
        `open -a Google\\ Chrome --new -W --args --js-flags="--trace-turbo --allow-natives-syntax --trace-turbo-path=${turbodir}"  --user-data-dir=${turbodir} --profile-directory="turbotracer" --no-sandbox ` +
            url,
    );
} else {
    throw new Error('Your platform is not supported');
}
console.log(output.toString());

const files = parseTurboFiles(turbodir, '');

// writeFileSync('data.json', JSON.stringify(files, null, 2));

if (files.length === 0) {
    console.log('Nothing to ouput: no one function has been optimized');
} else {
    openHTML(files);
}

removeTurboFiles(turbodir);
