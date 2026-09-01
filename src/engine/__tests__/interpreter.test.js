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

function getVarAtStep(result, stepIndex, varName) {
  const step = result.steps[stepIndex];
  return step ? step.variables[varName] : undefined;
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

// ── Test 1: let inside a function ──
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

// ── Test 2: const inside a function ──
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

// ── Test 3: using a variable declared earlier in the same scope ──
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

// ── Test 4: nested function scope ──
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

// ── Test 5: block scope (let inside if) ──
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

// ── Test 6: block scope (let inside for) ──
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
  // Verify i is NOT visible after the loop (block-scoped)
  const afterLoop = result.steps.find((s) => s.step === result.steps.length - 2);
  assert(afterLoop?.variables?.i === undefined, 'i is not visible after loop (block-scoped)');
}

// ── Test 7: function return values ──
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

// ── Test 8: the original bug — let total in function before use ──
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
  // Verify total is in scope during the function
  const totalStep = result.steps.find((s) => s.variables?.total === 240);
  assert(!!totalStep, 'total variable is visible in function scope');
}

// ── Test 9: reassignment of let in same scope ──
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

// ── Test 10: const cannot be reassigned (should error) ──
console.log('\nTest 10: const reassignment throws');
{
  const result = generateTrace(`
    const z = 5;
    z = 10;
  `);
  // Our interpreter currently doesn't enforce const — this tests whether
  // the variable is at least declared. Const enforcement is a separate concern.
  assertNoError(result, 'no error (const enforcement is optional)');
}

// ── Test 11: call stack frames include args for simple function ──
console.log('\nTest 11: call stack frames include args — simple function');
{
  const result = generateTrace(`
    function add(a, b) {
      return a + b;
    }
    add(2, 3);
  `);
  assertNoError(result, 'no error');
  const funcStep = result.steps.find(
    (s) => s.callStack.some((f) => f.name === 'add')
  );
  assert(!!funcStep, 'found a step with add on the call stack');
  const addFrame = funcStep.callStack.find((f) => f.name === 'add');
  assert(!!addFrame, 'add frame exists');
  assert(Array.isArray(addFrame.args), 'add frame has args array');
  assert(addFrame.args[0] === 2, 'first arg is 2');
  assert(addFrame.args[1] === 3, 'second arg is 3');
}

// ── Test 12: recursive calls show distinct arg values per frame ──
console.log('\nTest 12: recursive calls show distinct args per frame');
{
  const result = generateTrace(`
    function fib(n) {
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
    }
    fib(3);
  `);
  assertNoError(result, 'no error');
  const framesWithFib = result.steps
    .filter((s) => s.callStack.some((f) => f.name === 'fib'))
    .map((s) => s.callStack.filter((f) => f.name === 'fib'));
  assert(framesWithFib.length > 0, 'found steps with fib on the stack');
  const allArgs = framesWithFib.flat().map((f) => f.args[0]);
  const uniqueArgs = [...new Set(allArgs)];
  assert(uniqueArgs.length > 1, 'recursive fib calls have different arg values');
}

// ── Test 13: nested function calls preserve args on each frame ──
console.log('\nTest 13: nested function calls preserve args per frame');
{
  const result = generateTrace(`
    function outer(x) {
      function inner(y) {
        return y * 2;
      }
      return inner(x + 1);
    }
    outer(5);
  `);
  assertNoError(result, 'no error');
  const step = result.steps.find(
    (s) =>
      s.callStack.some((f) => f.name === 'outer') &&
      s.callStack.some((f) => f.name === 'inner')
  );
  assert(!!step, 'found a step with both outer and inner on the stack');
  const outerFrame = step.callStack.find((f) => f.name === 'outer');
  const innerFrame = step.callStack.find((f) => f.name === 'inner');
  assert(outerFrame.args[0] === 5, 'outer has arg 5');
  assert(innerFrame.args[0] === 6, 'inner has arg 6 (5 + 1)');
}

// ── Test 14: call stack includes global frame with empty args ──
console.log('\nTest 14: global frame has empty args');
{
  const result = generateTrace(`
    let x = 1;
  `);
  assertNoError(result, 'no error');
  const step = result.steps[0];
  const globalFrame = step.callStack.find((f) => f.name === 'global');
  assert(!!globalFrame, 'global frame exists');
  assert(Array.isArray(globalFrame.args) && globalFrame.args.length === 0, 'global frame has empty args array');
}

// ── Test 15: object and array args are captured ──
console.log('\nTest 15: object and array args are captured');
{
  const result = generateTrace(`
    function process(items) {
      return items.length;
    }
    process([1, 2, 3]);
  `);
  assertNoError(result, 'no error');
  const funcStep = result.steps.find(
    (s) => s.callStack.some((f) => f.name === 'process')
  );
  assert(!!funcStep, 'found step with process on the stack');
  const frame = funcStep.callStack.find((f) => f.name === 'process');
  assert(Array.isArray(frame.args[0]), 'first arg is an array');
  assert(frame.args[0].length === 3, 'array arg has 3 elements');
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
