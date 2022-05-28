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
export function unescapeCSVField(string: string) {
    let nextPos = string.indexOf('\\');
    if (nextPos === -1) return string;

    let result = string.substring(0, nextPos);
    // Escape sequences of the form \x00 and \u0000;
    let endPos = string.length;
    let pos = 0;
    while (nextPos !== -1) {
        let escapeIdentifier = string.charAt(nextPos + 1);
        pos = nextPos + 2;
        if (escapeIdentifier == 'n') {
            result += '\n';
            nextPos = pos;
        } else {
            if (escapeIdentifier == 'x') {
                // \x00 ascii range escapes consume 2 chars.
                nextPos = pos + 2;
            } else {
                // \u0000 unicode range escapes consume 4 chars.
                nextPos = pos + 4;
            }
            // Convert the selected escape sequence to a single character.
            let escapeChars = string.substring(pos, nextPos);
            result += String.fromCharCode(parseInt(escapeChars, 16));
        }

        // Continue looking for the next escape sequence.
        pos = nextPos;
        nextPos = string.indexOf('\\', pos);
        // If there are no more escape sequences consume the rest of the string.
        if (nextPos === -1) {
            result += string.substr(pos);
        } else if (pos != nextPos) {
            result += string.substring(pos, nextPos);
        }
    }
    return result;
}
