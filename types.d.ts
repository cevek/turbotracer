export type FileObj = {
    uri: string;
    code: string;
    functions: Fun[];
};
export type FunVersion = {
    id: string;
    deoptReason: string;
    nativeCalls: NativeCall[];
    inlinedFuns: InlinedFun[];
};
export type Fun = {
    name: string;
    source: {start: number; end: number};
    optimized: boolean;
    versions: FunVersion[];
    root: boolean;
};
export type NativeCall = {
    reasons: string[];
    pos: number;
};
export type InlinedFun = {
    name: string;
    pos: number;
    source: {uri: string; start: number; end: number};
    nativeCalls: NativeCall[];
    inlinedFuns: InlinedFun[];
};

export type LFileObj = {
    code: Buffer;
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
