var g = {a0: 1};
function sum(a, b) {return a + b}
var foo = (i) => {
    if (i < 2e2) return sum(foo(i + 1), g.a0);
    return i;
};
for (let j = 0; j < 1e2; j++) {
    // g['a' + j] = j;
    for (let i = 0; i < 1e5; i++) {
        foo(0);
        foo(1);
    }
}

// var g = {};
// function foo(g) {
//     if (g.g1 > 0) g.g1 = 1;
//     return g.g1;
// }

// let r = 0;
// for (let j = 0; j < 6; j++) {
//     for (let i = 0; i <= j; i++) {
//         g['g' + i] = Math.floor(Math.random() * 100);
//     }
//     for (let i = 0; i < 1e5; i++) {
//         r = i === -1 ? 1 : foo(g);
//     }
// }
// console.log(r);
