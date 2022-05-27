export type File = {
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
