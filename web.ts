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
console.log(turbodir);
removeTurboFiles(turbodir);
console.log(
    execSync(
        `open -a Google\\ Chrome --new -W --args --js-flags="--trace-turbo --allow-natives-syntax --trace-turbo-path=${turbodir}"  --user-data-dir="/Users/cody/Downloads/chrome/" --profile-directory="turbotracer" --no-sandbox ` +
            url,
    ).toString(),
);

const files = parseTurboFiles(turbodir, '');

// writeFileSync('data.json', JSON.stringify(files, null, 2));

if (files.length === 0) {
    console.log('Nothing to ouput: no one function has been optimized');
} else {
    openHTML(files);
}
// writeFileSync('test.html', htmlContent);

// console.log(JSON.stringify(files, null, 2));
// removeTurboFiles(turbodir);
