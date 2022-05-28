import {calc} from './calc';
const obj: {a: number; b: number} = {a: 1, b: 2};

function test2(type: string) {
    // obj[type] = 1; // to change map
    let r!: number;
    for (let i = 0; i < 1e4; i++) {
        r = calc(obj, type);
    }
    return r;
}

const test = new Function('a', 'b', 'a + b');

const map = new Map([
    [1, 2],
    [3, 4],
    [5, 6],
]);
function testSum() {
    let sum = 0;
    for (let i = 0; i < 1e6; i++) {
        for (const item of map) {
            sum += item[0];
        }
        // sum += test('+') + test('-') + test('*') + test('/') + test('mod');
    }
    return sum;
}
// %OptimizeFunctionOnNextCall(testSum);
testSum();
testSum();
testSum();
