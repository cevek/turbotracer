import {readdirSync, readFileSync} from 'fs';
import {getSourceMapJSON} from './sourcemap';
import {TurboJSON} from './turbo';
import {
    FileObj,
    Fun,
    InlinedFun,
    Inlining,
    InliningId,
    LFileObj,
    NativeCall,
    Pos,
    RootFun,
    RootFunVersion,
    Source,
    SourceId,
} from './types';
import {fixFileNameForSorting, getOrCreate, unescapeCSVField} from './utils';
const fetch = require('sync-fetch');

function readUri(uri: string) {
    let code = '';
    try {
        if (uri.startsWith('http')) {
            code = fetch(uri).text();
        } else {
            code = readFileSync(uri, 'utf8');
        }
    } catch (e) {}
    return code;
}
export function parseTurboFiles(dir: string, currentDir: string) {
    const filesContentMap = new Map<string, string>();
    const allFiles = readdirSync(dir);
    const turboFiles = allFiles
        .filter((f) => f.startsWith('turbo-') && f.endsWith('.json'))
        .sort((a, b) => (fixFileNameForSorting(a) < fixFileNameForSorting(b) ? -1 : 1))
        .map((file) => dir + file);
    const fileMap = new Map<string, LFileObj>();

    const isolateFiles = allFiles.filter((f) => f.startsWith('isolate-'));
    for (const isolateFile of isolateFiles) {
        const content = readFileSync(isolateFile, 'utf-8');
        for (const [_, fileName, data] of content.matchAll(/^script-source,\d+,(.*?),(.*?)$/gm)) {
            // console.log(fileName);
            filesContentMap.set(fileName, unescapeCSVField(data));
        }
    }

    function getOrCreateFile(uri: string, isOriginal: boolean): LFileObj {
        return getOrCreate(fileMap, uri, () => {
            let code = filesContentMap.get(uri) ?? '';
            const file: LFileObj = {
                code: code,
                functions: new Map<number, RootFun>(),
                sourceMapJSON: null, //getSourceMapJSON(uri, code, readUri),
                isOriginal: isOriginal,
            };
            return file;
        });
    }

    const allPossibleReasons = new Set<string>();

    for (const turboFile of turboFiles) {
        // console.log(turboFile);
        try {
            const turboJSON = JSON.parse(readFileSync(turboFile, 'utf8')) as TurboJSON;

            const sources = new Map<SourceId, Source>();
            for (const _id in turboJSON.sources) {
                const id = _id as SourceId;
                const sourceJSON = turboJSON.sources[id];
                if (sourceJSON.sourceName === '') {
                    sourceJSON.sourceName = 'eval_' + Math.random().toString(33).substring(3, 8);
                    fileMap.set(sourceJSON.sourceName, {
                        code: ('\n' + sourceJSON.sourceText).padStart(sourceJSON.endPosition, ' '),
                        functions: new Map(),
                        isOriginal: true,
                        sourceMapJSON: null,
                    });
                } else {
                    // const globalId = source.sourceName + '---' + id;
                    // funMap.set(globalId, {name: source.functionName, start: source.startPosition, end: source.endPosition});
                    getOrCreateFile(sourceJSON.sourceName, true);
                }
                const source: Source = {
                    start: sourceJSON.startPosition,
                    end: sourceJSON.endPosition,
                    name: sourceJSON.functionName,
                    fileName: sourceJSON.sourceName,
                };
                sources.set(id, source);
            }
            const inlinings = new Map<InliningId, Inlining>();
            const rootInlining: Inlining = {
                inlinings: new Map(),
                nativeCalls: new Map(),
                source: sources.get('-1' as SourceId)!,
            };
            inlinings.set('-1' as InliningId, rootInlining);
            for (const inliningId in turboJSON.inlinings) {
                const inliningJSON = turboJSON.inlinings[inliningId];
                const inlining: Inlining = {
                    source: sources.get(String(inliningJSON.sourceId) as SourceId)!,
                    inlinings: new Map(),
                    nativeCalls: new Map(),
                };
                inlinings.set(inliningId as InliningId, inlining);

                const parent = inlinings.get(String(inliningJSON.inliningPosition.inliningId) as InliningId)!;
                parent.inlinings.set(inliningJSON.inliningPosition.scriptOffset as Pos, inlining);
            }

            const rootFun = getOrCreate(
                fileMap.get(rootInlining.source.fileName)!.functions,
                rootInlining.source.start,
                () => ({
                    name: rootInlining.source.name,
                    optimized: true,
                    source: {start: rootInlining.source.start, end: rootInlining.source.end},
                    versions: [] as RootFunVersion[],
                    root:
                        rootInlining.source.start === 0 &&
                        rootInlining.source.end === fileMap.get(rootInlining.source.fileName)!.code.length,
                }),
            );

            const disassemblyPhase = turboJSON?.phases?.find((p) => p.name === 'disassembly');
            const fnId = (disassemblyPhase?.data as never as string).match(
                /^kind = TURBOFAN\nstack_slots = \d+\ncompiler = turbofan\naddress = (.*?)\n/,
            )?.[1];

            rootFun.versions.push({
                id: fnId ?? '',
                deoptReason: '',
                inlinedFuns: rootInlining.inlinings,
                nativeCalls: rootInlining.nativeCalls,
            });

            const lastPhase = turboJSON?.phases?.find((p) => p.name === 'V8.TFDecompressionOptimization');
            //Code:CreateShallowObjectLiteral
            const calls =
                lastPhase?.data?.nodes?.filter(
                    (n) =>
                        n.opcode === 'Call' &&
                        !n.label.match(
                            /ObjectDefineProperty|ReflectDefineProperty|ConstructForwardVarargs|ThrowTypeError|FastNewObject|CreateDataProperty|ThrowSuperAlreadyCalledError|AsyncFunctionAwaitUncaught|ThrowIteratorResultNotAnObject|Abort|NewRestArgumentsElements|StringIndexOf|CreateObjectWithoutProperties|ArrayIsArray|CreateShallowArrayLiteral|DateCurrentTime|JsonParse|CallWithSpread|FastNewClosure|CopyFastSmiOrObjectElements|StackGuard|js-call|ThrowAccessedUninitializedVariable|OrderedHashTableHealIndex|ReThrow|Trampoline|GrowArrayElements|FindOrderedHashMapEntry|LoadGlobal|DefineClass|RejectPromise|PerformPromiseThen|CreateObjectLiteral|FulfillPromise|CreateEmptyArrayLiteral|StringCharCodeAt|StringAdd_CheckNone|StringSubstring|StringPrototypeLastIndexOf|FastNewFunctionContextFunction|ConstructStub/,
                        ),
                ) ?? [];
            for (const call of calls) {
                if (call.sourcePosition) {
                    const inlining = inlinings.get(String(call.sourcePosition.inliningId) as InliningId)!;
                    const pos = call.sourcePosition.scriptOffset as Pos;
                    const reason = call.label
                        .replace('Call[', '')
                        .replace('Code:', '')
                        .replace(' Descriptor', '')
                        .replace(/:r.*?\]$/, '');
                    allPossibleReasons.add(reason);
                    getOrCreate(inlining.nativeCalls, pos, () => []).push(reason);
                }
            }
        } catch (err) {
            console.error('Skip parsing ' + turboFile + ': ' + (err as Error).message);
        }
    }

    function transformInliningMap(map: Map<Pos, Inlining>): InlinedFun[] {
        return [...map]
            .filter(([_, inlining]) => {
                const exists = fileMap.get(inlining.source.fileName)!.code !== '';
                if (!exists) {
                    console.log('Cannot find file: ' + inlining.source.fileName);
                }
                return exists && !inlining.source.fileName.includes('node:');
            })
            .map<InlinedFun>(([pos, inlining]) => ({
                type: 'InlinedFun',
                pos: pos,
                name: inlining.source.fileName.startsWith('eval_') ? inlining.source.fileName : inlining.source.name,
                source: {
                    start: inlining.source.start,
                    end: inlining.source.end,
                    uri: inlining.source.fileName.replace(currentDir, ''),
                },
                points: sortByPos([
                    ...transformNativeCallsMap(inlining.nativeCalls),
                    ...transformInliningMap(inlining.inlinings),
                ]),
            }));
    }
    function transformNativeCallsMap(map: Map<Pos, string[]>): NativeCall[] {
        return [...map].map<NativeCall>(([pos, reasons]) => ({
            type: 'NativeCall',
            pos: pos,
            reasons: reasons,
        }));
    }

    const files: FileObj[] = [];
    for (const [filename, fileObj] of fileMap) {
        if (fileObj.code === '') {
            console.log('Cannot find file: ' + filename);
            continue;
        }
        if (filename.includes('node:')) continue;
        const points: FileObj['points'] = [];
        for (const [, fun] of fileObj.functions) {
            const point: Fun = {
                type: 'Fun',
                reasons: fun.versions.map((v) => v.deoptReason),
                pos: fun.source.start,
                source: {start: fun.source.start, end: fun.source.end},
                optimizationCount: fun.versions.length,
                optimized: true,
                name: fun.name,
            };
            points.push(point);
            const lastFunVersion = fun.versions[fun.versions.length - 1];
            points.push(...transformInliningMap(lastFunVersion.inlinedFuns));
            points.push(...transformNativeCallsMap(lastFunVersion.nativeCalls));
        }
        files.push({
            uri: filename.replace(currentDir, ''),
            code: fileObj.code.toString(),
            points: sortByPos(points),
            sourceMapJSON: fileObj.sourceMapJSON,
        });
    }
    // console.log('allPossibleReasons', [...allPossibleReasons]);
    return files;
}

function sortByPos<T extends {pos: number}>(points: T[]) {
    return points.sort((a, b) => {
        return a.pos < b.pos ? -1 : 1;
    });
}
