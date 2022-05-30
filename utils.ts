import {readdirSync, unlinkSync} from 'fs';

export function fixFileNameForSorting(b: string) {
    return b.replace(/^(.*?)(\d+).json/, (_, x: string, y: string) => {
        return x + y.padStart(10, '_') + '.json';
    });
}

export function removeTurboFiles(dir: string) {
    const files = readdirSync(dir);
    files
        .filter((f) => f.startsWith('turbo-') || f.startsWith('isolate-'))
        .map((file) => dir + file)
        .forEach((f) => {
            unlinkSync(f);
        });
}

export function getOrCreate<K, V, K2 extends K, V2 extends V>(map: Map<K, V>, key: K2, factory: () => V2) {
    const value = map.get(key);
    if (value === undefined) {
        const newValue = factory();
        map.set(key, newValue);
        return newValue;
    }
    return value;
}

export function unescapeCSVField(str: string) {
    return str.replace(/\\(x[a-fA-F\d]{2}|u[a-fA-F\d]{4}|\\|r|n|t|f|b)/g, (_, v: string) => {
        const next = v[0];
        if (next === 'u' || next === 'x') {
            return String.fromCharCode(parseInt(v.substring(1), 16));
        }
        if (next === 'r') return '\r';
        if (next === 'n') return '\n';
        if (next === 't') return '\t';
        if (next === 'f') return '\f';
        if (next === 'b') return '\b';
        if (next === '\\') return '\\';
        throw new Error('impossible');
    });
}
