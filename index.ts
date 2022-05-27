import {spawnSync} from 'child_process';
import {readdirSync, readFileSync} from 'fs';
import {TurboJSON} from './turbo';
import {File, Fun, FunVersion, InlinedFun, NativeCall} from './types';
import {fixFileNameForSorting, getOrCreate, removeTurboFiles} from './utils';

removeTurboFiles();

const args = ['--trace-turbo', ...process.argv.slice(-1)];
console.log(args);
const {stdout, stderr} = spawnSync('node', args);
console.log(stdout.toString());
console.error(stderr.toString());

const turboFiles = readdirSync('./')
    .filter((f) => f.startsWith('turbo-') && f.endsWith('.json'))
    .sort((a, b) => (fixFileNameForSorting(a) < fixFileNameForSorting(b) ? -1 : 1));

type FileObj = {code: string; functions: Map<number, RootFun>};

type RootFun = {
    name: string;
    source: {start: number; end: number};
    optimized: boolean;
    versions: RootFunVersion[];
    root: boolean;
};
type RootFunVersion = {
    deoptReason: string;
    nativeCalls: Map<Pos, string[]>;
    inlinedFuns: Map<Pos, Inlining>;
};
const fileMap = new Map<string, FileObj>();
// const funMap = new Map<string, {name: string; start: number; end: number}>();

type Pos = number & {brand: 'Pos'};
type SourceId = string & {brand: 'SourceId'};
type InliningId = string & {brand: 'InliningId'};
type Source = {
    name: string;
    start: number;
    end: number;
    fileName: string;
};
type Inlining = {
    source: Source;
    nativeCalls: Map<Pos, string[]>;
    inlinings: Map<Pos, Inlining>;
};
for (const turboFile of turboFiles) {
    console.log(turboFile);
    const turboJSON = JSON.parse(readFileSync(turboFile, 'utf8')) as TurboJSON;

    const sources = new Map<SourceId, Source>();
    for (const _id in turboJSON.sources) {
        const id = _id as SourceId;
        const sourceJSON = turboJSON.sources[id];
        // const globalId = source.sourceName + '---' + id;
        // funMap.set(globalId, {name: source.functionName, start: source.startPosition, end: source.endPosition});
        getOrCreate(fileMap, sourceJSON.sourceName, () => ({
            code: readFileSync(sourceJSON.sourceName, 'utf8'),
            functions: new Map<number, RootFun>(),
        }));
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
    rootFun.versions.push({
        deoptReason: '',
        inlinedFuns: rootInlining.inlinings,
        nativeCalls: rootInlining.nativeCalls,
    });

    const phase = turboJSON?.phases?.find((p) => p.name === 'V8.TFDecompressionOptimization');
    const calls = phase?.data?.nodes?.filter((n) => n.opcode === 'Call' && !n.label.match(/StackGuard|js-call/)) ?? [];
    for (const call of calls) {
        if (call.sourcePosition) {
            const inlining = inlinings.get(String(call.sourcePosition.inliningId) as InliningId)!;
            const pos = call.sourcePosition.scriptOffset as Pos;
            getOrCreate(inlining.nativeCalls, pos, () => []).push(call.label);
        }
    }
}

function transformInliningMap(map: Map<Pos, Inlining>): InlinedFun[] {
    return [...map].map<InlinedFun>(([pos, inlining]) => ({
        pos: pos,
        name: inlining.source.name,
        source: {
            start: inlining.source.start,
            end: inlining.source.end,
            uri: inlining.source.fileName,
        },
        nativeCalls: transformNativeCallsMap(inlining.nativeCalls),
        inlinedFuns: transformInliningMap(inlining.inlinings),
    }));
}
function transformNativeCallsMap(map: Map<Pos, string[]>): NativeCall[] {
    return [...map].map<NativeCall>(([pos, reasons]) => ({
        pos: pos,
        reasons: reasons,
    }));
}

const files: File[] = [];
for (const [filename, fileObj] of fileMap) {
    const functions: Fun[] = [];
    for (const [, fun] of fileObj.functions) {
        const versions: FunVersion[] = [];
        for (const version of fun.versions) {
            versions.push({
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
    files.push({uri: filename, code: fileObj.code, functions: functions});
}

console.log(JSON.stringify(files));
// console.log(JSON.stringify(files, null, 2));
// removeTurboFiles();
