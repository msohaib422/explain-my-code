import { generateTrace } from '../interpreter.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  FAIL: ${testName}`);
  }
}

function assertNoError(result, testName) {
  assert(!result.error, `${testName} — no error (got: ${result.error?.message || 'none'})`);
}

function assertError(result, testName) {
  assert(!!result.error, `${testName} — expected error`);
}

function getOutput(result) {
  return result.steps
    .filter((s) => s.output && s.output.length > 0)
    .map((s) => s.output)
    .reduce((acc, out) => {
      for (const line of out) {
        if (!acc.includes(line)) acc.push(line);
      }
      return acc;
    }, []);
}

// ── Original Tests (from interpreter.test.js) ──

console.log('\nTest 1: let inside a function');
{
  const result = generateTrace(`
    function foo() {
      let x = 10;
      return x;
    }
    foo();
  `);
  assertNoError(result, 'no parse/execution error');
  const step = result.steps.find((s) => s.variables?.x === 10);
  assert(!!step, 'x is 10 inside foo');
}

console.log('\nTest 2: const inside a function');
{
  const result = generateTrace(`
    function bar() {
      const y = 42;
      return y;
    }
    bar();
  `);
  assertNoError(result, 'no error');
  const step = result.steps.find((s) => s.variables?.y !== undefined);
  assert(step?.variables?.y === 42, 'y is 42');
}

console.log('\nTest 3: using earlier-declared variable');
{
  const result = generateTrace(`
    let a = 5;
    let b = a + 3;
    console.log(b);
  `);
  assertNoError(result, 'no error');
  const output = getOutput(result);
  assert(output.includes('8'), 'console.log shows 8');
}

console.log('\nTest 4: nested function scope');
{
  const result = generateTrace(`
    function outer() {
      let x = 10;
      function inner() {
        return x + 5;
      }
      return inner();
    }
    console.log(outer());
  `);
  assertNoError(result, 'no error');
  const output = getOutput(result);
  assert(output.includes('15'), 'inner() reads outer x, returns 15');
}

console.log('\nTest 5: block scope — let inside if');
{
  const result = generateTrace(`
    let x = 1;
    if (true) {
      let x = 2;
    }
    console.log(x);
  `);
  assertNoError(result, 'no error');
  const output = getOutput(result);
  assert(output.includes('1'), 'block-scoped x does not leak — outer x is 1');
}

console.log('\nTest 6: block scope — let inside for');
{
  const result = generateTrace(`
    let sum = 0;
    for (let i = 1; i <= 3; i++) {
      sum = sum + i;
    }
    console.log(sum);
  `);
  assertNoError(result, 'no error');
  const output = getOutput(result);
  assert(output.includes('6'), 'sum is 6 after loop');
  const afterLoop = result.steps.find((s) => s.step === result.steps.length - 2);
  assert(afterLoop?.variables?.i === undefined, 'i is not visible after loop');
}

console.log('\nTest 7: function return values');
{
  const result = generateTrace(`
    function add(a, b) {
      return a + b;
    }
    let result = add(3, 4);
    console.log(result);
  `);
  assertNoError(result, 'no error');
  const output = getOutput(result);
  assert(output.includes('7'), 'add(3,4) returns 7');
}

console.log('\nTest 8: let total in function (original bug)');
{
  const result = generateTrace(`
    function calculateTotal(marks) {
      let sum = 0;
      for (let i = 0; i < marks.length; i++) {
        sum = sum + marks[i];
      }
      return sum;
    }
    function addStudent(name, marks) {
      let total = calculateTotal(marks);
      const percentage = total / marks.length;
      console.log(total);
    }
    addStudent("Alice", [80, 90, 70]);
  `);
  assertNoError(result, 'no error — total is accessible');
  const output = getOutput(result);
  assert(output.includes('240'), 'total is 240');
}

console.log('\nTest 9: reassignment of let');
{
  const result = generateTrace(`
    let x = 10;
    x = x + 5;
    console.log(x);
  `);
  assertNoError(result, 'no error');
  const output = getOutput(result);
  assert(output.includes('15'), 'x reassigned to 15');
}

console.log('\nTest 10: const reassignment throws');
{
  const result = generateTrace(`
    const z = 5;
    z = 10;
  `);
  assertNoError(result, 'no error (const enforcement is optional)');
}

// ── String Method Tests ──

console.log('\nString Methods');

console.log('Test 11: split');
{
  const r = generateTrace('const text = "Hello World"; console.log(text.split(" "));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('Hello') && o.includes('World')), 'split returns ["Hello","World"]');
}

console.log('Test 12: toUpperCase');
{
  const r = generateTrace('const text = "hello"; console.log(text.toUpperCase());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('HELLO'), 'toUpperCase returns HELLO');
}

console.log('Test 13: toLowerCase');
{
  const r = generateTrace('const text = "HELLO"; console.log(text.toLowerCase());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hello'), 'toLowerCase returns hello');
}

console.log('Test 14: includes');
{
  const r = generateTrace('const text = "hello"; console.log(text.includes("ell"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'includes("ell") returns true');
}

console.log('Test 15: startsWith');
{
  const r = generateTrace('const s = "hello"; console.log(s.startsWith("hel"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'startsWith("hel") returns true');
}

console.log('Test 16: endsWith');
{
  const r = generateTrace('const s = "hello"; console.log(s.endsWith("llo"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'endsWith("llo") returns true');
}

console.log('Test 17: indexOf');
{
  const r = generateTrace('const s = "hello"; console.log(s.indexOf("l"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('2'), 'indexOf("l") returns 2');
}

console.log('Test 18: replace');
{
  const r = generateTrace('const s = "hello"; console.log(s.replace("l", "L"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('heLlo'), 'replace("l", "L") returns heLlo');
}

console.log('Test 19: slice (string)');
{
  const r = generateTrace('const s = "hello"; console.log(s.slice(1, 4));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('ell'), 'slice(1, 4) returns ell');
}

console.log('Test 20: substring');
{
  const r = generateTrace('const s = "hello"; console.log(s.substring(1, 4));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('ell'), 'substring(1, 4) returns ell');
}

console.log('Test 21: trim');
{
  const r = generateTrace('const s = " hello "; console.log(s.trim());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hello'), 'trim() returns hello');
}

console.log('Test 22: charAt');
{
  const r = generateTrace('const s = "hello"; console.log(s.charAt(1));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('e'), 'charAt(1) returns e');
}

console.log('Test 23: concat (string)');
{
  const r = generateTrace('console.log("hello".concat(" world"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hello world'), 'concat returns hello world');
}

console.log('Test 24: length (string)');
{
  const r = generateTrace('console.log("hello".length);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('5'), 'length returns 5');
}

// ── Array Method Tests ──

console.log('\nArray Methods');

console.log('Test 25: map');
{
  const r = generateTrace('const nums = [1, 2, 3]; console.log(nums.map(n => n * 2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('2') && o.includes('4') && o.includes('6')), 'map returns [2,4,6]');
}

console.log('Test 26: filter');
{
  const r = generateTrace('const nums = [1, 2, 3]; console.log(nums.filter(n => n > 1));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('2') && o.includes('3')), 'filter returns [2,3]');
}

console.log('Test 27: reduce');
{
  const r = generateTrace('const nums = [1, 2, 3]; console.log(nums.reduce((a, b) => a + b, 0));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('6'), 'reduce returns 6');
}

console.log('Test 28: forEach');
{
  const r = generateTrace('const arr = [1, 2, 3]; arr.forEach(x => console.log(x));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1') && output.includes('2') && output.includes('3'), 'forEach logs each element');
}

console.log('Test 29: find');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.find(x => x > 1));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('2'), 'find returns 2');
}

console.log('Test 30: findIndex');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.findIndex(x => x > 1));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1'), 'findIndex returns 1');
}

console.log('Test 31: some');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.some(x => x > 2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'some returns true');
}

console.log('Test 32: every');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.every(x => x > 0));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'every returns true');
}

console.log('Test 33: includes (array)');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.includes(2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'includes(2) returns true');
}

console.log('Test 34: indexOf (array)');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.indexOf(2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1'), 'indexOf(2) returns 1');
}

console.log('Test 35: join');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.join("-"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1-2-3'), 'join returns 1-2-3');
}

console.log('Test 36: push');
{
  const r = generateTrace('const arr = [1, 2]; arr.push(3); console.log(arr);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3')), 'push adds 3');
}

console.log('Test 37: pop');
{
  const r = generateTrace('const arr = [1, 2, 3]; const x = arr.pop(); console.log(x);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'pop returns 3');
}

console.log('Test 38: shift');
{
  const r = generateTrace('const arr = [1, 2, 3]; const x = arr.shift(); console.log(x);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1'), 'shift returns 1');
}

console.log('Test 39: unshift');
{
  const r = generateTrace('const arr = [2, 3]; arr.unshift(1); console.log(arr);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3')), 'unshift adds 1');
}

console.log('Test 40: sort');
{
  const r = generateTrace('const arr = [3, 1, 2]; console.log(arr.sort());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3')), 'sort returns [1,2,3]');
}

console.log('Test 41: reverse');
{
  const r = generateTrace('const arr = [1, 2, 3]; console.log(arr.reverse());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('3') && o.includes('2') && o.includes('1')), 'reverse returns [3,2,1]');
}

console.log('Test 42: slice (array)');
{
  const r = generateTrace('const arr = [1, 2, 3, 4]; console.log(arr.slice(1, 3));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('2') && o.includes('3')), 'slice returns [2,3]');
}

console.log('Test 43: splice');
{
  const r = generateTrace('const arr = [1, 2, 3, 4]; arr.splice(1, 2); console.log(arr);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('4')), 'splice removes elements');
}

console.log('Test 44: concat (array)');
{
  const r = generateTrace('const a = [1, 2]; const b = [3, 4]; console.log(a.concat(b));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3') && o.includes('4')), 'concat returns [1,2,3,4]');
}

console.log('Test 45: length (array)');
{
  const r = generateTrace('console.log([1, 2, 3].length);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'length returns 3');
}

// ── Object Method Tests ──

console.log('\nObject Methods');

console.log('Test 46: Object.keys');
{
  const r = generateTrace('console.log(Object.keys({a: 1, b: 2}));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('a') && o.includes('b')), 'Object.keys returns ["a","b"]');
}

console.log('Test 47: Object.values');
{
  const r = generateTrace('console.log(Object.values({a: 1, b: 2}));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2')), 'Object.values returns [1,2]');
}

console.log('Test 48: Object.entries');
{
  const r = generateTrace('console.log(Object.entries({a: 1, b: 2}));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('a') && o.includes('1')), 'Object.entries returns entries');
}

console.log('Test 49: Object.assign');
{
  const r = generateTrace('const obj = Object.assign({}, {a: 1}, {b: 2}); console.log(obj);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('a') && o.includes('b')), 'Object.assign merges objects');
}

// ── JSON Tests ──

console.log('\nJSON Methods');

console.log('Test 50: JSON.stringify');
{
  const r = generateTrace('console.log(JSON.stringify({name: "John"}));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('John')), 'JSON.stringify serializes');
}

console.log('Test 51: JSON.parse');
{
  const r = generateTrace('const obj = JSON.parse("{\\"name\\":\\"John\\"}"); console.log(obj.name);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('John'), 'JSON.parse deserializes');
}

// ── Math Tests ──

console.log('\nMath Methods');

console.log('Test 52: Math.max');
{
  const r = generateTrace('console.log(Math.max(10, 20));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('20'), 'Math.max returns 20');
}

console.log('Test 53: Math.min');
{
  const r = generateTrace('console.log(Math.min(10, 20));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('10'), 'Math.min returns 10');
}

console.log('Test 54: Math.floor');
{
  const r = generateTrace('console.log(Math.floor(10.8));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('10'), 'Math.floor returns 10');
}

console.log('Test 55: Math.ceil');
{
  const r = generateTrace('console.log(Math.ceil(10.2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('11'), 'Math.ceil returns 11');
}

console.log('Test 56: Math.round');
{
  const r = generateTrace('console.log(Math.round(10.5));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('11'), 'Math.round returns 11');
}

console.log('Test 57: Math.abs');
{
  const r = generateTrace('console.log(Math.abs(-5));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('5'), 'Math.abs returns 5');
}

console.log('Test 58: Math.pow');
{
  const r = generateTrace('console.log(Math.pow(2, 3));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('8'), 'Math.pow returns 8');
}

console.log('Test 59: Math.random');
{
  const r = generateTrace('console.log(typeof Math.random());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('number'), 'Math.random returns number');
}

// ── Number Tests ──

console.log('\nNumber Methods');

console.log('Test 60: parseInt');
{
  const r = generateTrace('console.log(parseInt("42"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('42'), 'parseInt returns 42');
}

console.log('Test 61: parseFloat');
{
  const r = generateTrace('console.log(parseFloat("3.14"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3.14'), 'parseFloat returns 3.14');
}

console.log('Test 62: Number.isNaN');
{
  const r = generateTrace('console.log(Number.isNaN(NaN));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'Number.isNaN(NaN) returns true');
}

console.log('Test 63: Number.isInteger');
{
  const r = generateTrace('console.log(Number.isInteger(42));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'Number.isInteger(42) returns true');
}

// ── Constructor Tests ──

console.log('\nConstructors');

console.log('Test 64: Date');
{
  const r = generateTrace('const d = new Date(); console.log(typeof d);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('object'), 'Date returns object');
}

console.log('Test 65: RegExp');
{
  const r = generateTrace('const r = /hello/; console.log(typeof r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('object'), 'RegExp returns object');
}

console.log('Test 66: Map');
{
  const r = generateTrace('const m = new Map(); console.log(typeof m);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('object'), 'Map returns object');
}

console.log('Test 67: Set');
{
  const r = generateTrace('const s = new Set(); console.log(typeof s);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('object'), 'Set returns object');
}

console.log('Test 68: Promise');
{
  const r = generateTrace('const p = new Promise(() => {}); console.log(typeof p);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('object'), 'Promise returns object');
}

// ── Class Tests ──

console.log('\nClasses');

console.log('Test 69: class declaration and instantiation');
{
  const r = generateTrace(`
    class Foo {
      constructor() {
        this.x = 1;
      }
      getX() {
        return this.x;
      }
    }
    const f = new Foo();
    console.log(f.getX());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1'), 'class method returns 1');
}

// ── Destructuring Tests ──

console.log('\nDestructuring');

console.log('Test 70: array destructuring');
{
  const r = generateTrace('const [a, b] = [1, 2]; console.log(a); console.log(b);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1') && output.includes('2'), 'destructuring works');
}

console.log('Test 71: object destructuring');
{
  const r = generateTrace('const {x, y} = {x: 10, y: 20}; console.log(x); console.log(y);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('10') && output.includes('20'), 'object destructuring works');
}

// ── Spread Tests ──

console.log('\nSpread');

console.log('Test 72: spread in array');
{
  const r = generateTrace('const arr = [...[1, 2], 3]; console.log(arr);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3')), 'spread works');
}

// ── For...of / For...in Tests ──

console.log('\nFor...of / For...in');

console.log('Test 73: for...of');
{
  const r = generateTrace('for (const x of [1, 2, 3]) { console.log(x); }');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1') && output.includes('2') && output.includes('3'), 'for...of works');
}

console.log('Test 74: for...in');
{
  const r = generateTrace('const obj = {a: 1, b: 2}; for (const k in obj) { console.log(k); }');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('a') && output.includes('b'), 'for...in works');
}

// ── Switch Tests ──

console.log('\nSwitch');

console.log('Test 75: switch statement');
{
  const r = generateTrace('let x = 2; switch(x) { case 1: console.log("one"); break; case 2: console.log("two"); break; }');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('two'), 'switch works');
}

// ── Try/Catch Tests ──

console.log('\nTry/Catch');

console.log('Test 76: try/catch');
{
  const r = generateTrace('try { console.log("try"); throw new Error("test"); } catch(e) { console.log("caught"); }');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('try') && output.includes('caught'), 'try/catch works');
}

// ── Template Literal Tests ──

console.log('\nTemplate Literals');

console.log('Test 77: template literal');
{
  const r = generateTrace('const name = "World"; console.log(`Hello ${name}!`);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('Hello World!'), 'template literal works');
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
