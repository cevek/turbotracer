import {readdirSync, readFileSync} from 'fs';
import {TurboJSON} from './turbo';
import {
    InlinedFun,
    NativeCall,
    Fun,
    FunVersion,
    FileObj,
    LFileObj,
    SourceId,
    Inlining,
    InliningId,
    Pos,
    RootFun,
    RootFunVersion,
    Source,
} from './types';
import {fixFileNameForSorting, getOrCreate} from './utils';
const fetch = require('sync-fetch');

export function parseTurboFiles(dir: string, currentDir: string) {
    const turboFiles = readdirSync(dir)
        .filter((f) => f.startsWith('turbo-') && f.endsWith('.json'))
        .sort((a, b) => (fixFileNameForSorting(a) < fixFileNameForSorting(b) ? -1 : 1))
        .map((file) => dir + file);
    const fileMap = new Map<string, LFileObj>();

    console.log(turboFiles);
    for (const turboFile of turboFiles) {
        // console.log(turboFile);
        const turboJSON = JSON.parse(readFileSync(turboFile, 'utf8')) as TurboJSON;

        const sources = new Map<SourceId, Source>();
        for (const _id in turboJSON.sources) {
            const id = _id as SourceId;
            const sourceJSON = turboJSON.sources[id];
            // const globalId = source.sourceName + '---' + id;
            // funMap.set(globalId, {name: source.functionName, start: source.startPosition, end: source.endPosition});
            getOrCreate(fileMap, sourceJSON.sourceName, () => {
                let code = Buffer.alloc(0);
                console.log(sourceJSON.sourceName);
                try {
                    if (sourceJSON.sourceName.startsWith('http')) {
                        const script = fetch(sourceJSON.sourceName).text();
                        // console.log(script);
                        code = Buffer.from(script);
                    } else {
                        code = Buffer.from(readFileSync(sourceJSON.sourceName, 'utf8'));
                    }
                } catch (e) {}
                return {
                    code: code,
                    functions: new Map<number, RootFun>(),
                };
            });
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
            inlinings
                .get(String(inliningJSON.inliningPosition.inliningId) as InliningId)!
                .inlinings.set(inliningJSON.inliningPosition.scriptOffset as Pos, inlining);
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
                (n) => n.opcode === 'Call' && !n.label.match(/StackGuard|js-call|ThrowAccessedUninitializedVariable/),
            ) ?? [];
        for (const call of calls) {
            if (call.sourcePosition) {
                const inlining = inlinings.get(String(call.sourcePosition.inliningId) as InliningId)!;
                const pos = call.sourcePosition.scriptOffset as Pos;
                getOrCreate(inlining.nativeCalls, pos, () => []).push(call.label);
            }
        }
    }

    function transformInliningMap(map: Map<Pos, Inlining>): InlinedFun[] {
        return (
            [...map]
                // .filter(([_, inlining]) => {
                //     return fileMap.get(inlining.source.fileName)!.code !== '';
                // })
                .map<InlinedFun>(([pos, inlining]) => ({
                    pos: pos,
                    name: inlining.source.name,
                    source: {
                        start: inlining.source.start,
                        end: inlining.source.end,
                        uri: inlining.source.fileName.replace(currentDir, ''),
                    },
                    nativeCalls: transformNativeCallsMap(inlining.nativeCalls),
                    inlinedFuns: transformInliningMap(inlining.inlinings),
                }))
        );
    }
    function transformNativeCallsMap(map: Map<Pos, string[]>): NativeCall[] {
        return [...map].map<NativeCall>(([pos, reasons]) => ({
            pos: pos,
            reasons: reasons,
        }));
    }

    const files: FileObj[] = [];
    for (const [filename, fileObj] of fileMap) {
        const functions: Fun[] = [];
        // if (fileObj.code === '') continue;
        for (const [, fun] of fileObj.functions) {
            const versions: FunVersion[] = [];
            for (const version of fun.versions) {
                versions.push({
                    id: version.id,
                    deoptReason: version.deoptReason,
                    inlinedFuns: transformInliningMap(version.inlinedFuns),
                    nativeCalls: transformNativeCallsMap(version.nativeCalls),
                });
            }
            functions.push({
                name: fun.name,
                optimized: fun.optimized,
                source: fun.source,
                versions: versions,
                root: fun.root,
            });
        }
        files.push({uri: filename.replace(currentDir, ''), code: fileObj.code.toString(), functions: functions});
    }

    return files;
}
