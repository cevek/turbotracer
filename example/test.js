const calc = require('./calc');
const obj = {};
obj.a = 1;
obj.b = 2;

function test(type) {
    // obj[type] = 1; // to change map
    let r;
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

testSum();
testSum();
testSum();
