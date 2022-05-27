function calc(obj, type) {
    if (type === '+') {
        return plus(obj.a, obj.b);
    }
    if (type === '-') {
        return minus(obj.a, obj.b);
    }
    if (type === '*') {
        return multiply(obj.a, obj.b);
    }
    if (type === '/') {
        return divide(obj.a, obj.b);
    }
    if (type === 'mod') {
        return mod(obj.a, obj.b);
    }
}

function plus(a, b) {
    return a + b;
}
function minus(a, b) {
    return a - b;
}
function multiply(a, b) {
    return a * b;
}
function divide(a, b) {
    return a / b;
}
function mod(a, b) {
    return a % b;
}

module.exports = calc;
