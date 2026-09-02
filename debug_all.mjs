import { generateTrace } from './src/engine/interpreter.js';

const examples = [
  {
    name: "Variables",
    code: `let x = 10;
x = x + 5;
console.log(x);`
  },
  {
    name: "If / Else",
    code: `let age = 20;
if (age >= 18) {
  console.log("Adult");
} else {
  console.log("Minor");
}`
  },
  {
    name: "For Loop",
    code: `for (let i = 0; i < 3; i++) {
  console.log(i);
}`
  },
  {
    name: "While Loop",
    code: `let count = 0;
while (count < 4) {
  console.log(count);
  count = count + 1;
}`
  },
  {
    name: "Function Call",
    code: `function greet(name) {
  return "Hello, " + name;
}

let msg = greet("Alice");
console.log(msg);`
  },
  {
    name: "Array Traversal",
    code: `let numbers = [10, 20, 30];
let sum = 0;

for (let i = 0; i < numbers.length; i++) {
  sum = sum + numbers[i];
}

console.log(sum);`
  },
  {
    name: "Factorial (Recursion)",
    code: `function factorial(n) {
  if (n === 1) return 1;
  return n * factorial(n - 1);
}

let result = factorial(5);
console.log(result);`
  },
  {
    name: "Nested Loops",
    code: `for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    console.log(i * j);
  }
}`
  },
  {
    name: "Fibonacci",
    code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

for (let i = 0; i < 6; i++) {
  console.log(fibonacci(i));
}`
  }
];

let allPass = true;
for (const ex of examples) {
  const { steps, error } = generateTrace(ex.code);
  if (error) {
    console.log(`FAIL [${ex.name}]: ${error.message} (line ${error.line})`);
    allPass = false;
  } else {
    const lastStep = steps[steps.length - 1];
    console.log(`PASS [${ex.name}]: ${steps.length} steps, output: ${JSON.stringify(lastStep?.output)}`);
  }
}
console.log(allPass ? "\nAll examples pass!" : "\nSome examples FAILED!");
