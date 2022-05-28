import {spawnSync} from 'child_process';
import {writeFileSync} from 'fs';
import {openHTML} from './openHTML';
import {parseTurboFiles} from './parseTurboFiles';
import {removeTurboFiles} from './utils';

const turbodir = './';
removeTurboFiles(turbodir);
const filename = process.argv[process.argv.length - 1];
const userParams = process.argv.filter((arg) => arg.startsWith('-'));
if (filename.includes('turbotracer')) throw new Error('You need to specify js file');
const args = ['--trace-turbo', '--log-code', ...userParams, filename];
// console.log(args);
const {stdout, stderr} = spawnSync('node', args);
console.log(stdout.toString());
console.error(stderr.toString());

const files = parseTurboFiles(turbodir, process.cwd());

// writeFileSync('data.json', JSON.stringify(files, null, 2));

openHTML(files);
removeTurboFiles(turbodir);
