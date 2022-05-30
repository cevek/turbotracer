import {calc} from './calc';
const obj: {a: number; b: number} = {a: 1.1, b: 1.1};

function test(type: string) {
    // obj[type as never] = 1 as never; // to change map
    // obj.a = Math.random();
    obj.a = 1;
    let r!: number;
    for (let i = 0; i < 1e4; i++) {
        r = calc(obj, type);
    }
    return r;
}

function test2(map: number[]) {
    let sum = 0;
    for (const item of map) {
        sum += item;
    }
    return sum;
}
// const test = new Function('a', 'b', 'a + b');

const map = Array(1000).fill(0);
var p = Promise.resolve();
function testSum(map: number[]) {
    let sum = 0;
    for (let i = 0; i < map.length; i++) {
        const item = map[i];
    // for (const item of map) {
        sum += item;
        // await 1;
    }
    // sum += test('+');
    // sum += test('+') + test('-') + test('*') + test('/') + test('mod') + test('>');
    return sum;
}

// function foo(o: {int: number}) {
//     let sum = 0;
//     for (let i = 0; i < 1e9; i++) {
//         // let int1 = 1 << 30; // ок 4 байта
//         sum = i === -1 ? 1 : s(o.int, 1);
//     }
//     return sum;
// }
// %OptimizeFunctionOnNextCall(testSum);

// const o = {int: 1e10};
// function s(a: number, b: number) {
//     return a - b;
// }

// console.log(foo(o));
// %DebugPrint(1e10);
// foo(o);
// foo(o);
console.log(testSum(map));
for (let i = 0; i < 1e3; i++) {
    testSum(map);
}
testSum(map);
testSum(map);
