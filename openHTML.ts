import {writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {FileObj} from './types';
const open = require('open');

export function openHTML(files: FileObj[]) {
    if (files.length === 0) {
        console.log('Nothing to output: no one function has been optimized');
        return;
    }
    const tempfile = tmpdir() + '/turbotracer.html';
    const htmlContent = `
<!doctype html>
<html mol_view_root>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<link href="https://opt.js.hyoo.ru/hyoo/js/opt/logo/logo.svg" rel="icon" />
	</head>
	<body mol_view_root>
		<div mol_view_root="$hyoo_js_opt"></div>
		<script src="https://opt.js.hyoo.ru/web.js" charset="utf-8"></script>
		<script>$hyoo_js_opt.Root(0).data(\n${JSON.stringify(files, null, 2)}\n)</script></body>`;

    writeFileSync(tempfile, htmlContent);
    open(tempfile, {app: 'chrome'});
}
