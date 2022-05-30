import {calc} from './calc';
const obj: {a: number; b: number} = {a: 1e10, b: 1e10};

function test(type: string) {
    // obj[type] = 1; // to change map
    let r!: number;
    for (let i = 0; i < 1e4; i++) {
        r = calc(obj, type);
    }
    return r;
}

// const test = new Function('a', 'b', 'a + b');

const map = new Map([
    [1, 2],
    [3, 4],
    [5, 6],
]);
function testSum() {
    let sum = 0;
    for (let i = 0; i < 1e3; i++) {
        for (const item of map) {
            sum += item[0];
        }
        sum += test('+') + test('-') + test('*') + test('/') + test('mod') + test('>');
    }
    return sum;
}

function foo(o: {int: number}) {
    let sum = 0;
    for (let i = 0; i < 1e9; i++) {
        // let int1 = 1 << 30; // ок 4 байта
        sum = i === -1 ? 1 : s(o.int, 1);
    }
    return sum;
}
// %OptimizeFunctionOnNextCall(testSum);

const o = {int: 1e10};
function s(a: number, b: number) {
    return a - b;
}

// console.log(foo(o));
// %DebugPrint(1e10);
// foo(o);
// foo(o);
testSum();
testSum();
