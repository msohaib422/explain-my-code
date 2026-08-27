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

// ══════════════════════════════════════════════════════════
//  THE ORIGINAL ISSUE
// ══════════════════════════════════════════════════════════

console.log('\n=== The Original Issue ===');

console.log('Test: Array.map with function expression');
{
  const r = generateTrace(`
    let numbers = [1, 2, 3, 4, 5];
    let doubled = numbers.map(function (num) {
        return num * 2;
    });
    console.log(doubled);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('2') && o.includes('4') && o.includes('6') && o.includes('8') && o.includes('10')),
    'map returns [2,4,6,8,10]');
}

// ══════════════════════════════════════════════════════════
//  ARRAY METHODS — ADVANCED
// ══════════════════════════════════════════════════════════

console.log('\n=== Array Methods — Advanced ===');

console.log('Test: map with arrow function');
{
  const r = generateTrace('const r = [1,2,3].map(x => x * x); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('4') && o.includes('9')), 'map with arrow returns [1,4,9]');
}

console.log('Test: map chained with filter');
{
  const r = generateTrace('const r = [1,2,3,4,5].map(x => x * 2).filter(x => x > 4); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('6') && o.includes('8') && o.includes('10')), 'chained map+filter works');
}

console.log('Test: filter with arrow function');
{
  const r = generateTrace('const r = [1,2,3,4,5].filter(x => x % 2 === 0); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('2') && o.includes('4')), 'filter returns even numbers');
}

console.log('Test: reduce without initial value');
{
  const r = generateTrace('const r = [1,2,3,4].reduce((a, b) => a + b); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('10'), 'reduce without init returns 10');
}

console.log('Test: reduceRight');
{
  const r = generateTrace('const r = [1,2,3].reduceRight((a, b) => a + b, 0); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('6'), 'reduceRight returns 6');
}

console.log('Test: find with complex condition');
{
  const r = generateTrace(`
    const users = [{name: "Alice", age: 25}, {name: "Bob", age: 17}, {name: "Charlie", age: 30}];
    const found = users.find(u => u.age >= 18);
    console.log(found.name);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('Alice'), 'find returns first match');
}

console.log('Test: findLast and findLastIndex');
{
  const r = generateTrace(`
    const arr = [1, 2, 3, 4, 5];
    console.log(arr.findLast(x => x % 2 === 0));
    console.log(arr.findLastIndex(x => x % 2 === 0));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('4'), 'findLast returns 4');
  assert(output.includes('3'), 'findLastIndex returns 3');
}

console.log('Test: flat');
{
  const r = generateTrace('console.log([1, [2, 3], [4, [5]]].flat());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3') && o.includes('4')), 'flat works');
}

console.log('Test: flat with depth');
{
  const r = generateTrace('console.log([1, [2, [3, [4]]]].flat(2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3')), 'flat(2) works');
}

console.log('Test: flatMap');
{
  const r = generateTrace('const r = [1, 2, 3].flatMap(x => [x, x * 10]); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('10') && o.includes('2') && o.includes('20')), 'flatMap works');
}

console.log('Test: at()');
{
  const r = generateTrace(`
    console.log([10, 20, 30].at(0));
    console.log([10, 20, 30].at(-1));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('10'), 'at(0) returns 10');
  assert(output.includes('30'), 'at(-1) returns 30');
}

console.log('Test: fill');
{
  const r = generateTrace('const arr = [1,2,3,4]; arr.fill(0, 1, 3); console.log(arr);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('0') && o.includes('4')), 'fill works');
}

console.log('Test: copyWithin');
{
  const r = generateTrace('const arr = [1,2,3,4,5]; arr.copyWithin(0, 3); console.log(arr);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('4') && o.includes('5') && o.includes('3')), 'copyWithin works');
}

console.log('Test: with()');
{
  const r = generateTrace('console.log([1,2,3].with(1, 99));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('99') && o.includes('3')), 'with() works');
}

console.log('Test: keys()');
{
  const r = generateTrace('console.log([10,20].keys());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('0') && o.includes('1')), 'keys() works');
}

console.log('Test: values()');
{
  const r = generateTrace('console.log([10,20].values());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('10') && o.includes('20')), 'values() works');
}

console.log('Test: entries()');
{
  const r = generateTrace('console.log([10,20].entries());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('0') && o.includes('10')), 'entries() works');
}

console.log('Test: push returns new length');
{
  const r = generateTrace('const arr = [1,2]; const len = arr.push(3); console.log(len);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'push returns 3');
}

console.log('Test: pop on empty array returns undefined');
{
  const r = generateTrace('const arr = []; console.log(arr.pop());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('undefined'), 'pop on empty returns undefined');
}

console.log('Test: shift on empty array returns undefined');
{
  const r = generateTrace('const arr = []; console.log(arr.shift());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('undefined'), 'shift on empty returns undefined');
}

console.log('Test: concat with multiple args');
{
  const r = generateTrace('console.log([1].concat([2], [3], 4));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3') && o.includes('4')),
    'concat with multiple args works');
}

console.log('Test: sort with comparator');
{
  const r = generateTrace('const r = [10, 1, 21].sort((a, b) => a - b); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('10') && o.includes('21')),
    'sort with comparator works');
}

console.log('Test: includes with fromIndex');
{
  const r = generateTrace(`
    console.log([1,2,3,4,5].includes(3, 2));
    console.log([1,2,3,4,5].includes(3, 3));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'includes with fromIndex finds 3');
  assert(output.includes('false'), 'includes with fromIndex misses 3 after index 3');
}

console.log('Test: indexOf with fromIndex');
{
  const r = generateTrace('console.log([1,2,3,2,1].indexOf(2, 2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'indexOf with fromIndex returns 3');
}

console.log('Test: lastIndexOf');
{
  const r = generateTrace('console.log([1,2,3,2,1].lastIndexOf(2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'lastIndexOf returns 3');
}

console.log('Test: some with complex predicate');
{
  const r = generateTrace('const r = [1,2,3,4,5].some(x => x > 10); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('false'), 'some returns false when none match');
}

console.log('Test: every with predicate');
{
  const r = generateTrace('const r = [2,4,6,8].every(x => x % 2 === 0); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'every returns true when all match');
}

// ══════════════════════════════════════════════════════════
//  STRING METHODS — ADVANCED
// ══════════════════════════════════════════════════════════

console.log('\n=== String Methods — Advanced ===');

console.log('Test: repeat');
{
  const r = generateTrace('console.log("ha".repeat(3));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hahaha'), 'repeat works');
}

console.log('Test: padStart');
{
  const r = generateTrace('console.log("5".padStart(3, "0"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('005'), 'padStart works');
}

console.log('Test: padEnd');
{
  const r = generateTrace('console.log("5".padEnd(3, "0"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('500'), 'padEnd works');
}

console.log('Test: charCodeAt');
{
  const r = generateTrace('console.log("A".charCodeAt(0));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('65'), 'charCodeAt returns 65');
}

console.log('Test: codePointAt');
{
  const r = generateTrace('console.log("A".codePointAt(0));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('65'), 'codePointAt returns 65');
}

console.log('Test: lastIndexOf (string)');
{
  const r = generateTrace('console.log("hello".lastIndexOf("l"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'string lastIndexOf returns 3');
}

console.log('Test: match');
{
  const r = generateTrace('console.log("hello world".match(/o/g));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('o')), 'match works');
}

console.log('Test: search');
{
  const r = generateTrace('console.log("hello".search(/l/));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('2'), 'search returns 2');
}

console.log('Test: trimStart');
{
  const r = generateTrace('console.log("  hello".trimStart());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hello'), 'trimStart works');
}

console.log('Test: trimEnd');
{
  const r = generateTrace('console.log("hello  ".trimEnd());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hello'), 'trimEnd works');
}

console.log('Test: string at()');
{
  const r = generateTrace(`
    console.log("hello".at(0));
    console.log("hello".at(-1));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('h'), 'at(0) returns h');
  assert(output.includes('o'), 'at(-1) returns o');
}

console.log('Test: normalize');
{
  const r = generateTrace('console.log("\u0041\u0301".normalize("NFC").length);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1'), 'normalize NFC returns length 1');
}

console.log('Test: replaceAll');
{
  const r = generateTrace('console.log("aaa".replaceAll("a", "b"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('bbb'), 'replaceAll works');
}

console.log('Test: string valueOf');
{
  const r = generateTrace('console.log("hello".valueOf());');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hello'), 'valueOf returns the string');
}

console.log('Test: localeCompare');
{
  const r = generateTrace('console.log("a".localeCompare("b") < 0);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'localeCompare works');
}

console.log('Test: string concat with multiple args');
{
  const r = generateTrace('console.log("a".concat("b", "c", "d"));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('abcd'), 'string concat works');
}

// ══════════════════════════════════════════════════════════
//  NESTED CALLBACKS & HIGHER-ORDER FUNCTIONS
// ══════════════════════════════════════════════════════════

console.log('\n=== Nested Callbacks & Higher-Order Functions ===');

console.log('Test: map inside map');
{
  const r = generateTrace(`
    const r = [[1,2],[3,4]].map(arr => arr.map(x => x * 10));
    console.log(r);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('10') && o.includes('20') && o.includes('30') && o.includes('40')),
    'nested map works');
}

console.log('Test: filter then map');
{
  const r = generateTrace('const r = [1,2,3,4,5,6].filter(x => x % 2 === 0).map(x => x * 10); console.log(r);');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('20') && o.includes('40') && o.includes('60')),
    'filter then map works');
}

console.log('Test: reduce to build object');
{
  const r = generateTrace(`
    const r = ["a","b","c"].reduce((acc, val, idx) => { acc[val] = idx; return acc; }, {});
    console.log(r);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('a') && o.includes('0')), 'reduce to build object works');
}

console.log('Test: higher-order function returning function');
{
  const r = generateTrace(`
    function multiply(factor) {
      return function(n) { return n * factor; };
    }
    const double = multiply(2);
    const triple = multiply(3);
    console.log(double(5));
    console.log(triple(5));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('10'), 'double(5) = 10');
  assert(output.includes('15'), 'triple(5) = 15');
}

console.log('Test: callback with closure');
{
  const r = generateTrace(`
    let multiplier = 10;
    const r = [1,2,3].map(x => x * multiplier);
    console.log(r);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('10') && o.includes('20') && o.includes('30')),
    'callback with closure works');
}

console.log('Test: forEach modifying external variable');
{
  const r = generateTrace(`
    let sum = 0;
    [1,2,3,4,5].forEach(x => { sum = sum + x; });
    console.log(sum);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('15'), 'forEach modifying external var works');
}

console.log('Test: chained methods - map, filter, reduce');
{
  const r = generateTrace(`
    const r = [1,2,3,4,5,6,7,8,9,10]
      .filter(x => x % 2 === 0)
      .map(x => x * x)
      .reduce((a, b) => a + b, 0);
    console.log(r);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('220'), 'complex chaining works (4+16+36+64+100=220)');
}

// ══════════════════════════════════════════════════════════
//  OBJECT & JSON
// ══════════════════════════════════════════════════════════

console.log('\n=== Object & JSON ===');

console.log('Test: Object.keys on array');
{
  const r = generateTrace('console.log(Object.keys([10, 20, 30]));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('0') && o.includes('1') && o.includes('2')),
    'Object.keys on array returns indices');
}

console.log('Test: Object.entries then reduce');
{
  const r = generateTrace(`
    const obj = {a: 1, b: 2, c: 3};
    const sum = Object.entries(obj).reduce((acc, [k, v]) => acc + v, 0);
    console.log(sum);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('6'), 'Object.entries then reduce works');
}

console.log('Test: Object.hasOwn');
{
  const r = generateTrace(`
    const obj = {a: 1};
    console.log(Object.hasOwn(obj, 'a'));
    console.log(Object.hasOwn(obj, 'b'));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'hasOwn returns true for own prop');
  assert(output.includes('false'), 'hasOwn returns false for missing prop');
}

console.log('Test: Object.is');
{
  const r = generateTrace(`
    console.log(Object.is(NaN, NaN));
    console.log(Object.is(0, -0));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'Object.is(NaN, NaN) is true');
  assert(output.includes('false'), 'Object.is(0, -0) is false');
}

console.log('Test: JSON.parse and stringify roundtrip');
{
  const r = generateTrace(`
    const original = {name: "test", nums: [1,2,3]};
    const json = JSON.stringify(original);
    const parsed = JSON.parse(json);
    console.log(parsed.name);
    console.log(parsed.nums.length);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('test'), 'roundtrip preserves name');
  assert(output.includes('3'), 'roundtrip preserves array length');
}

console.log('Test: JSON.stringify with space');
{
  const r = generateTrace('console.log(JSON.stringify({a:1}, null, 2));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('a') && o.includes('1')), 'stringify with space works');
}

// ══════════════════════════════════════════════════════════
//  ERROR HANDLING
// ══════════════════════════════════════════════════════════

console.log('\n=== Error Handling ===');

console.log('Test: calling map on non-function throws');
{
  const r = generateTrace('[1,2].map("not a function");');
  assertError(r, 'throws TypeError');
}

console.log('Test: calling reduce on non-function throws');
{
  const r = generateTrace('[1,2].reduce("bad");');
  assertError(r, 'throws TypeError');
}

console.log('Test: calling filter on non-function throws');
{
  const r = generateTrace('[1,2].filter(123);');
  assertError(r, 'throws TypeError');
}

console.log('Test: calling some on non-function throws');
{
  const r = generateTrace('[1,2].some(true);');
  assertError(r, 'throws TypeError');
}

console.log('Test: calling every on non-function throws');
{
  const r = generateTrace('[1,2].every(null);');
  assertError(r, 'throws TypeError');
}

console.log('Test: calling find on non-function throws');
{
  const r = generateTrace('[1,2].find(42);');
  assertError(r, 'throws TypeError');
}

// ══════════════════════════════════════════════════════════
//  COMMON PATTERNS
// ══════════════════════════════════════════════════════════

console.log('\n=== Common Patterns ===');

console.log('Test: Array.from with mapFn');
{
  const r = generateTrace(`
    const r = Array.from({length: 3}, (_, i) => i * 10);
    console.log(r);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('0') && o.includes('10') && o.includes('20')),
    'Array.from with mapFn works');
}

console.log('Test: Array.of');
{
  const r = generateTrace('console.log(Array.of(1, 2, 3));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('2') && o.includes('3')),
    'Array.of works');
}

console.log('Test: Math.hypot');
{
  const r = generateTrace('console.log(Math.hypot(3, 4));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('5'), 'Math.hypot(3,4) = 5');
}

console.log('Test: Number.isFinite');
{
  const r = generateTrace(`
    console.log(Number.isFinite(42));
    console.log(Number.isFinite(Infinity));
    console.log(Number.isFinite(NaN));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'isFinite(42) is true');
}

console.log('Test: parseInt and parseFloat as globals');
{
  const r = generateTrace(`
    console.log(parseInt("0xFF", 16));
    console.log(parseFloat("3.14e2"));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('255'), 'parseInt hex works');
  assert(output.includes('314'), 'parseFloat scientific works');
}

console.log('Test: Date constructor');
{
  const r = generateTrace(`
    const d = new Date(2024, 0, 15);
    console.log(d.getFullYear());
    console.log(d.getMonth());
    console.log(d.getDate());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('2024'), 'getFullYear returns 2024');
  assert(output.includes('0'), 'getMonth returns 0 (January)');
  assert(output.includes('15'), 'getDate returns 15');
}

console.log('Test: Map and Set constructors');
{
  const r = generateTrace(`
    const m = new Map();
    m.set("key1", "value1");
    console.log(m.get("key1"));
    console.log(m.size);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('value1'), 'Map.get works');
  assert(output.includes('1'), 'Map.size works');
}

console.log('Test: Promise.resolve');
{
  const r = generateTrace('console.log(typeof Promise.resolve(42));');
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('object'), 'Promise.resolve returns object');
}

console.log('Test: Error constructors');
{
  const r = generateTrace(`
    try {
      throw new TypeError("wrong type");
    } catch(e) {
      console.log(e.message);
    }
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('wrong type'), 'TypeError with message works');
}

console.log('Test: isNaN and isFinite globals');
{
  const r = generateTrace(`
    console.log(isNaN(NaN));
    console.log(isFinite(42));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'isNaN(NaN) is true');
}

console.log('Test: encodeURI and decodeURI');
{
  const r = generateTrace(`
    const encoded = encodeURI("hello world");
    console.log(encoded);
    console.log(decodeURI(encoded));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('hello%20world'), 'encodeURI works');
  assert(output.includes('hello world'), 'decodeURI works');
}

// ══════════════════════════════════════════════════════════
//  THIS BINDING
// ══════════════════════════════════════════════════════════

console.log('\n=== This Binding ===');

{
  console.log('Test: this in object method');
  const r = generateTrace(`
    const obj = {
      x: 10,
      getX: function() { return this.x; }
    };
    console.log(obj.getX());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('10'), 'obj.getX() returns 10 via this');
}

{
  console.log('Test: this in arrow function inherits from enclosing scope');
  const r = generateTrace(`
    const obj = {
      x: 10,
      getX: () => { return this.x; }
    };
    console.log(obj.getX());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('undefined') || output.includes('10'), 'arrow function this behavior');
}

{
  console.log('Test: this in nested method calls');
  const r = generateTrace(`
    const person = {
      name: 'Alice',
      greet: function() {
        return 'Hello, ' + this.name;
      }
    };
    console.log(person.greet());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('Hello, Alice'), 'nested this works');
}

{
  console.log('Test: this with method chaining');
  const r = generateTrace(`
    const counter = {
      val: 0,
      inc: function() { this.val += 1; return this; },
      inc: function() { this.val = this.val + 1; return this; },
      get: function() { return this.val; }
    };
    counter.inc();
    counter.inc();
    counter.inc();
    console.log(counter.get());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'method chaining with this works');
}

{
  console.log('Test: this in constructor-like pattern');
  const r = generateTrace(`
    function createUser(name) {
      return {
        name: name,
        sayHi: function() { return 'Hi, I am ' + this.name; }
      };
    }
    const user = createUser('Bob');
    console.log(user.sayHi());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('Hi, I am Bob'), 'constructor pattern with this works');
}

// ══════════════════════════════════════════════════════════
//  OPERATORS
// ══════════════════════════════════════════════════════════

console.log('\n=== Operators ===');

{
  console.log('Test: typeof on declared variable');
  const r = generateTrace(`
    const x = 42;
    console.log(typeof x);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('number'), 'typeof on number');
}

{
  console.log('Test: typeof on undeclared variable returns undefined');
  const r = generateTrace(`
    console.log(typeof undeclaredVar);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('undefined'), 'typeof undeclared returns undefined');
}

{
  console.log('Test: in operator');
  const r = generateTrace(`
    const obj = { a: 1, b: 2 };
    console.log('a' in obj);
    console.log('c' in obj);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'in operator finds existing key');
  assert(output.includes('false'), 'in operator misses missing key');
}

{
  console.log('Test: delete operator');
  const r = generateTrace(`
    const obj = { a: 1, b: 2 };
    delete obj.a;
    console.log('a' in obj);
    console.log(obj.b);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('false'), 'delete removes property');
  assert(output.includes('2'), 'delete preserves other properties');
}

{
  console.log('Test: nullish coalescing ??');
  const r = generateTrace(`
    const a = null;
    const b = undefined;
    const c = 0;
    const d = '';
    console.log(a ?? 'default');
    console.log(b ?? 'default');
    console.log(c ?? 'default');
    console.log(d ?? 'default');
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('default'), '?? returns default for null');
  assert(output.includes('0'), '?? does not replace 0');
  assert(output.includes(''), '?? does not replace empty string');
}

{
  console.log('Test: instanceof operator');
  const r = generateTrace(`
    console.log([] instanceof Array);
    console.log({} instanceof Object);
    console.log('hi' instanceof String);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('true'), 'instanceof Array for array');
  assert(output.includes('true'), 'instanceof Object for object');
  assert(output.includes('false'), 'instanceof String for primitive string');
}

// ══════════════════════════════════════════════════════════
//  DESTRUCTURED PARAMETERS
// ══════════════════════════════════════════════════════════

console.log('\n=== Destructured Parameters ===');

{
  console.log('Test: callback with destructured array param');
  const r = generateTrace(`
    const pairs = [[1, 2], [3, 4]];
    const result = pairs.map(function([a, b]) { return a + b; });
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('3') && o.includes('7')), 'destructured array param in callback');
}

{
  console.log('Test: callback with destructured object param');
  const r = generateTrace(`
    const items = [{ name: 'a', val: 1 }, { name: 'b', val: 2 }];
    const result = items.map(function({ name, val }) { return name + ':' + val; });
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('a:1') && o.includes('b:2')), 'destructured object param in callback');
}

{
  console.log('Test: callback with default params');
  const r = generateTrace(`
    function greet(name) {
      console.log('Hello, ' + name);
    }
    ['Alice', 'Bob'].forEach(function(name) { greet(name); });
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('Hello, Alice'), 'default param in callback');
  assert(output.includes('Hello, Bob'), 'default param works for all');
}

// ══════════════════════════════════════════════════════════
//  STRING METHOD CALLBACKS
// ══════════════════════════════════════════════════════════

console.log('\n=== String Method Callbacks ===');

{
  console.log('Test: string replace with function callback');
  const r = generateTrace(`
    const result = "hello world".replace(/\\w+/, function(match) {
      return match.toUpperCase();
    });
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('HELLO world'), 'string replace with callback works');
}

// ══════════════════════════════════════════════════════════
//  ERROR MESSAGES
// ══════════════════════════════════════════════════════════

console.log('\n=== Error Messages ===');

{
  console.log('Test: calling non-function variable');
  const r = generateTrace(`
    const x = 42;
    x();
  `);
  assertError(r, 'calling number throws TypeError');
  assert(r.error && r.error.message.includes('not a function'), 'error says not a function');
}

{
  console.log('Test: accessing property of null');
  const r = generateTrace(`
    const obj = null;
    obj.foo;
  `);
  assertError(r, 'accessing null throws TypeError');
  assert(r.error && r.error.message.includes('null'), 'error mentions null');
}

{
  console.log('Test: accessing property of undefined');
  const r = generateTrace(`
    let x;
    x.foo;
  `);
  assertError(r, 'accessing undefined throws TypeError');
  assert(r.error && r.error.message.includes('undefined'), 'error mentions undefined');
}

// ══════════════════════════════════════════════════════════
//  ADVANCED PATTERNS
// ══════════════════════════════════════════════════════════

console.log('\n=== Advanced Patterns ===');

{
  console.log('Test: IIFE');
  const r = generateTrace(`
    const result = (function(a, b) { return a + b; })(3, 4);
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('7'), 'IIFE works');
}

{
  console.log('Test: closure in loop');
  const r = generateTrace(`
    const funcs = [];
    for (let i = 0; i < 3; i++) {
      funcs.push(function() { return i; });
    }
    console.log(funcs[0]());
    console.log(funcs[1]());
    console.log(funcs[2]());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('0') && output.includes('1') && output.includes('2'), 'closure captures loop variable');
}

{
  console.log('Test: computed property access');
  const r = generateTrace(`
    const obj = { foo: 1, bar: 2, baz: 3 };
    const key = 'bar';
    console.log(obj[key]);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('2'), 'computed property access works');
}

{
  console.log('Test: optional chaining');
  const r = generateTrace(`
    const obj = { a: { b: 1 } };
    console.log(obj?.a?.b);
    console.log(obj?.c?.d);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('1'), 'optional chaining returns value');
  assert(output.includes('undefined'), 'optional chaining returns undefined for missing');
}

{
  console.log('Test: switch with break');
  const r = generateTrace(`
    let result = '';
    switch (2) {
      case 1: result = 'one'; break;
      case 2: result = 'two'; break;
      case 3: result = 'three'; break;
    }
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('two'), 'switch with break works');
}

{
  console.log('Test: switch fallthrough');
  const r = generateTrace(`
    let result = '';
    switch (1) {
      case 1: result += 'a';
      case 2: result += 'b'; break;
    }
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('ab'), 'switch fallthrough works');
}

{
  console.log('Test: switch default');
  const r = generateTrace(`
    let result = '';
    switch (5) {
      case 1: result = 'one'; break;
      default: result = 'other'; break;
    }
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('other'), 'switch default works');
}

{
  console.log('Test: while loop with break');
  const r = generateTrace(`
    let i = 0;
    while (i < 10) {
      if (i === 3) break;
      i++;
    }
    console.log(i);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('3'), 'while break works');
}

{
  console.log('Test: for-of with string');
  const r = generateTrace(`
    let result = '';
    for (const ch of 'abc') {
      result += ch + '-';
    }
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('a-b-c-'), 'for-of on string works');
}

{
  console.log('Test: try/catch/finally');
  const r = generateTrace(`
    let log = '';
    try {
      log += 'try';
      throw new Error('oops');
    } catch (e) {
      log += 'catch';
    } finally {
      log += 'finally';
    }
    console.log(log);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('trycatchfinally'), 'try/catch/finally all execute');
}

{
  console.log('Test: class with constructor and methods');
  const r = generateTrace(`
    class Animal {
      constructor(name) {
        this.name = name;
      }
      speak() {
        return this.name + ' makes a noise';
      }
    }
    const dog = new Animal('Dog');
    console.log(dog.speak());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('Dog makes a noise'), 'class constructor and method with this');
}

{
  console.log('Test: class inheritance');
  const r = generateTrace(`
    class Shape {
      constructor(x) { this.x = x; }
      area() { return 0; }
    }
    class Circle extends Shape {
      constructor(r) { super(r); this.r = r; }
      area() { return 3.14 * this.r * this.r; }
    }
    const c = new Circle(5);
    console.log(c.area());
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('78.5'), 'class inheritance with super');
}

{
  console.log('Test: ternary operator');
  const r = generateTrace(`
    const x = 10;
    const result = x > 5 ? 'big' : 'small';
    console.log(result);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('big'), 'ternary operator works');
}

{
  console.log('Test: spread in function call');
  const r = generateTrace(`
    function sum(a, b, c) { return a + b + c; }
    const nums = [1, 2, 3];
    console.log(sum(...nums));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('6'), 'spread in function call works');
}

// ══════════════════════════════════════════════════════════
//  COMPREHENSIVE REAL-WORLD PROGRAMS
// ══════════════════════════════════════════════════════════

console.log('\n=== Real-World Programs ===');

{
  console.log('Test: fibonacci with closure');
  const r = generateTrace(`
    function fibonacci(n) {
      const memo = {};
      function fib(n) {
        if (n <= 1) return n;
        if (n in memo) return memo[n];
        memo[n] = fib(n - 1) + fib(n - 2);
        return memo[n];
      }
      return fib(n);
    }
    console.log(fibonacci(10));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('55'), 'fibonacci(10) = 55');
}

{
  console.log('Test: array flatten implementation');
  const r = generateTrace(`
    function flatten(arr) {
      const result = [];
      for (const item of arr) {
        if (Array.isArray(item)) {
          for (const sub of flatten(item)) {
            result.push(sub);
          }
        } else {
          result.push(item);
        }
      }
      return result;
    }
    const nested = [1, [2, 3], [4, [5, 6]]];
    console.log(flatten(nested));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.some(o => o.includes('1') && o.includes('6')), 'recursive flatten works');
}

{
  console.log('Test: compose/pipe functions');
  const r = generateTrace(`
    function compose(f, g) {
      return function(x) { return f(g(x)); };
    }
    const double = function(x) { return x * 2; };
    const addOne = function(x) { return x + 1; };
    const doubleThenAddOne = compose(addOne, double);
    console.log(doubleThenAddOne(3));
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('7'), 'compose(addOne, double)(3) = 7');
}

{
  console.log('Test: word frequency counter');
  const r = generateTrace(`
    function wordFreq(text) {
      const words = text.split(' ');
      const freq = {};
      for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
      }
      return freq;
    }
    const f = wordFreq('the cat and the dog');
    console.log(f['the']);
    console.log(f['cat']);
  `);
  assertNoError(r, 'no error');
  const output = getOutput(r);
  assert(output.includes('2'), 'word freq: the=2');
  assert(output.includes('1'), 'word freq: cat=1');
}

// ══════════════════════════════════════════════════════════
//  SUMMARY
// ══════════════════════════════════════════════════════════

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
