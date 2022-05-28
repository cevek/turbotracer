import {spawnSync} from 'child_process';
import {openHTML} from './openHTML';
import {parseTurboFiles} from './parseTurboFiles';
import {removeTurboFiles} from './utils';

const turbodir = './';
removeTurboFiles(turbodir);
const filename = process.argv[process.argv.length - 1];
const userParams = process.argv.filter((arg) => arg.startsWith('-'));
if (filename.includes('turbotracer')) throw new Error('You need to specify js file');
const args = ['--trace-turbo', ...userParams, filename];
// console.log(args);
const {stdout, stderr} = spawnSync('node', args);
console.log(stdout.toString());
console.error(stderr.toString());

const files = parseTurboFiles(turbodir, process.cwd());

// writeFileSync('data.json', JSON.stringify(files, null, 2));

if (files.length === 0) {
    console.log('Nothing to ouput: no one function has been optimized');
} else {
    openHTML(files);
}
// writeFileSync('test.html', htmlContent);

// console.log(JSON.stringify(files, null, 2));
removeTurboFiles(turbodir);
