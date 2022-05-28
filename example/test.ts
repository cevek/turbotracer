import {calc} from './calc';
const obj: {a: number; b: number} = {a: 1, b: 2};

function test(type: string) {
    // obj[type] = 1; // to change map
    let r!: number;
    for (let i = 0; i < 1e4; i++) {
        r = calc(obj, type);
    }
    return r;
}

function testSum() {
    let sum = 0;
    for (let i = 0; i < 1e4; i++) {
        sum += test('+') + test('-') + test('*') + test('/') + test('mod');
    }
    return sum;
}
// %OptimizeFunctionOnNextCall(testSum);
testSum();
testSum();
testSum();
