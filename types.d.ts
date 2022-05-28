import {SourceMapConsumer} from 'source-map-js';

export type FileObj = {
    uri: string;
    code: string;
    points: (Fun | NativeCall | InlinedFun)[];
    sourceMapJSON: {} | null;
};
export type Fun = {
    type: 'Fun';
    pos: number;
    optimizationCount: number;
    deoptReasons: string[];
    optimized: boolean;
    source: {start: number; end: number};
    name: string;
};
export type NativeCall = {
    type: 'NativeCall';
    reasons: string[];
    pos: number;
};
export type InlinedFun = {
    type: 'InlinedFun';
    points: (NativeCall | InlinedFun)[];
    name: string;
    pos: number;
    source: {uri: string; start: number; end: number};
};

export type LFileObj = {
    code: string;
    sourceMapJSON: {} | null;
    isOriginal: boolean;
    functions: Map<number, RootFun>;
};

export type RootFun = {
    name: string;
    source: {start: number; end: number};
    optimized: boolean;
    versions: RootFunVersion[];
    root: boolean;
};
export type RootFunVersion = {
    deoptReason: string;
    nativeCalls: Map<Pos, string[]>;
    inlinedFuns: Map<Pos, Inlining>;
    id: string;
};
// const funMap = new Map<string, {name: string; start: number; end: number}>();

export type Pos = number & {brand: 'Pos'};
export type SourceId = string & {brand: 'SourceId'};
export type InliningId = string & {brand: 'InliningId'};
export type Source = {
    name: string;
    start: number;
    end: number;
    fileName: string;
};
export type Inlining = {
    source: Source;
    nativeCalls: Map<Pos, string[]>;
    inlinings: Map<Pos, Inlining>;
};
