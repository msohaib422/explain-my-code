export const examples = [
  {
    name: "Variables",
    description: "Basic variable assignment and updates",
    code: `let x = 10;
x = x + 5;
console.log(x);`
  },
  {
    name: "If / Else",
    description: "Conditional branching",
    code: `let age = 20;
if (age >= 18) {
  console.log("Adult");
} else {
  console.log("Minor");
}`
  },
  {
    name: "For Loop",
    description: "Iterating with a for loop",
    code: `for (let i = 0; i < 3; i++) {
  console.log(i);
}`
  },
  {
    name: "While Loop",
    description: "Looping with a while statement",
    code: `let count = 0;
while (count < 4) {
  console.log(count);
  count = count + 1;
}`
  },
  {
    name: "Function Call",
    description: "Defining and calling functions",
    code: `function greet(name) {
  return "Hello, " + name;
}

let msg = greet("Alice");
console.log(msg);`
  },
  {
    name: "Array Traversal",
    description: "Looping through an array",
    code: `let numbers = [10, 20, 30];
let sum = 0;

for (let i = 0; i < numbers.length; i++) {
  sum = sum + numbers[i];
}

console.log(sum);`
  },
  {
    name: "Factorial (Recursion)",
    description: "Recursive factorial function",
    code: `function factorial(n) {
  if (n === 1) return 1;
  return n * factorial(n - 1);
}

let result = factorial(5);
console.log(result);`
  },
  {
    name: "Nested Loops",
    description: "Loops inside loops",
    code: `for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    console.log(i * j);
  }
}`
  },
  {
    name: "Fibonacci",
    description: "Fibonacci sequence with recursion",
    code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

for (let i = 0; i < 6; i++) {
  console.log(fibonacci(i));
}`
  }
];
