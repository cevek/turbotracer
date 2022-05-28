import {readdirSync, unlinkSync} from 'fs';

export function fixFileNameForSorting(b: string) {
    return b.replace(/^(.*?)(\d+).json/, (_, x: string, y: string) => {
        return x + y.padStart(10, '_') + '.json';
    });
}

export function removeTurboFiles(dir: string) {
    const files = readdirSync(dir);
    files
        .filter((f) => f.startsWith('turbo-'))
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
