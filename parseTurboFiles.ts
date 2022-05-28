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
import {fixFileNameForSorting, getOrCreate} from './utils';
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
    const turboFiles = readdirSync(dir)
        .filter((f) => f.startsWith('turbo-') && f.endsWith('.json'))
        .sort((a, b) => (fixFileNameForSorting(a) < fixFileNameForSorting(b) ? -1 : 1))
        .map((file) => dir + file);
    const fileMap = new Map<string, LFileObj>();

    function getOrCreateFile(uri: string, isOriginal: boolean): LFileObj {
        return getOrCreate(fileMap, uri, () => {
            let code = readUri(uri);
            const file: LFileObj = {
                code: code,
                functions: new Map<number, RootFun>(),
                sourceMapJSON: null, //getSourceMapJSON(uri, code, readUri),
                isOriginal: isOriginal,
            };
            return file;
        });
    }

    for (const turboFile of turboFiles) {
        // console.log(turboFile);
        try {
            const turboJSON = JSON.parse(readFileSync(turboFile, 'utf8')) as TurboJSON;

            const sources = new Map<SourceId, Source>();
            for (const _id in turboJSON.sources) {
                const id = _id as SourceId;
                const sourceJSON = turboJSON.sources[id];
                // const globalId = source.sourceName + '---' + id;
                // funMap.set(globalId, {name: source.functionName, start: source.startPosition, end: source.endPosition});
                getOrCreateFile(sourceJSON.sourceName, true);
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
            const calls =
                lastPhase?.data?.nodes?.filter(
                    (n) =>
                        n.opcode === 'Call' && !n.label.match(/StackGuard|js-call|ThrowAccessedUninitializedVariable/),
                ) ?? [];
            for (const call of calls) {
                if (call.sourcePosition) {
                    const inlining = inlinings.get(String(call.sourcePosition.inliningId) as InliningId)!;
                    const pos = call.sourcePosition.scriptOffset as Pos;
                    getOrCreate(inlining.nativeCalls, pos, () => []).push(call.label);
                }
            }
        } catch (err) {
            console.error('Skip parsing ' + turboFile + ': ' + (err as Error).stack);
        }
    }

    function transformInliningMap(map: Map<Pos, Inlining>): InlinedFun[] {
        return [...map]
            .filter(([_, inlining]) => {
                return fileMap.get(inlining.source.fileName)!.code !== '';
            })
            .map<InlinedFun>(([pos, inlining]) => ({
                type: 'InlinedFun',
                pos: pos,
                name: inlining.source.name,
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
        if (fileObj.code === '') continue;
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

    return files;
}

function sortByPos<T extends {pos: number}>(points: T[]) {
    return points.sort((a, b) => {
        return a.pos < b.pos ? -1 : 1;
    });
}
