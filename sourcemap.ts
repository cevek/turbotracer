import {dirname, resolve} from 'path';

export function getSourceMapJSON(fileName: string, source: string, readUri: (uri: string) => string) {
    var sourceMappingURL = retrieveSourceMapURL(source);

    if (!sourceMappingURL) return null;

    // Read the contents of the source map
    var sourceMapData: string;
    if (reSourceMap.test(sourceMappingURL)) {
        // Support source map URL as a data url
        var rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(',') + 1);
        sourceMapData = Buffer.from(rawData, 'base64').toString();
        sourceMappingURL = source;
    } else {
        // Support source map URLs relative to the source URL
        // console.log(sourceMappingURL);
        sourceMappingURL = supportRelativeURL(fileName, sourceMappingURL);
        // console.log(sourceMappingURL);
        sourceMapData = readUri(sourceMappingURL);
    }
    const sourcemapJSON = JSON.parse(sourceMapData);
    if (!sourcemapJSON.sourcesContent) {
        sourcemapJSON.sourcesContent = sourcemapJSON.sources.map((sourceUri: string) =>
            readUri(supportRelativeURL(fileName, sourceUri)),
        );
    }
    return sourcemapJSON;
    // var smc = new SourceMapConsumer(json);
    // return smc;
}
function retrieveSourceMapURL(fileData: string) {
    var re =
        /(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/gm;
    // Keep executing the search to find the *last* sourceMappingURL to avoid
    // picking up sourceMappingURLs from comments, strings, etc.
    var lastMatch, match;
    while ((match = re.exec(fileData))) lastMatch = match;
    if (!lastMatch) return null;
    return lastMatch[1];
}

var reSourceMap = /^data:application\/json[^,]+base64,/;

function supportRelativeURL(file: string, url: string) {
    if (!file) return url;
    var dir = dirname(file);
    var match = /^\w+:\/\/[^\/]*/.exec(dir);
    var protocol = match ? match[0] : '';
    var startPath = dir.slice(protocol.length);
    if (protocol && /^\/\w\:/.test(startPath)) {
        // handle file:///C:/ paths
        protocol += '/';
        return protocol + resolve(dir.slice(protocol.length), url).replace(/\\/g, '/');
    }
    return protocol + resolve(dir.slice(protocol.length), url);
}
