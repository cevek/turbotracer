#!/usr/bin/env node

const filename = process.argv[process.argv.length - 1];
if (filename.startsWith('http')) {
    require('./dist/web');
} else {
    require('./dist/index');
}
