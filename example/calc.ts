export function calc(obj: {a: number; b: number}, type: string) {
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
    return obj.a <= obj.b ? 1 : -1;
}

function plus(a: number, b: number) {
    return a + b;
}
function minus(a: number, b: number) {
    return a - b;
}
function multiply(a: number, b: number) {
    return a * b;
}
function divide(a: number, b: number) {
    return a / b;
}
function mod(a: number, b: number) {
    return a % b;
}
