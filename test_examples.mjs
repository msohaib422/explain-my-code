import { generateTrace } from './src/engine/interpreter.js';

// Test all 10 examples
import { examples } from './src/examples/index.js';

for (let i = 0; i < examples.length; i++) {
  const ex = examples[i];
  console.log(`\n=== Example ${i+1}: ${ex.name} ===`);
  try {
    const { steps, error } = generateTrace(ex.code);
    if (error) {
      console.log(`  ERROR: ${error.message} (line ${error.line})`);
    } else {
      console.log(`  Steps: ${steps.length}, last status: ${steps[steps.length-1]?.status}`);
      console.log(`  Output: ${JSON.stringify(steps[steps.length-1]?.output)}`);
    }
  } catch (e) {
    console.log(`  EXCEPTION: ${e.message}`);
  }
}
