const CODE_PATTERNS = {
  variableDecl: /^\s*(let|const|var)\s+(\w+)\s*=\s*(.+)$/,
  simpleAssign: /^\s*(\w+)\s*=\s*(.+)$/,
  plusAssign: /^\s*(\w+)\s*\+=\s*(.+)$/,
  minusAssign: /^\s*(\w+)\s*-=\s*(.+)$/,
  mulAssign: /^\s*(\w+)\s*\*=\s*(.+)$/,
  divAssign: /^\s*(\w+)\s*\/=\s*(.+)$/,
  modAssign: /^\s*(\w+)\s*%=\s*(.+)$/,
  incUpdate: /^\s*(\w+)\+\+$/,
  decUpdate: /^\s*(\w+)\-\-$/,
  preInc: /^\s*\+\+(\w+)/,
  preDec: /^\s*\-\-(\w+)/,
  consoleLog: /^\s*console\.\w+\s*\((.+)\)\s*;?\s*$/,
  ifStatement: /^\s*if\s*\((.+)\)/,
  elseIfStatement: /^\s*else\s+if\s*\((.+)\)/,
  elseStatement: /^\s*else\s*\{?\s*$/,
  forLoop: /^\s*for\s*\(/,
  whileLoop: /^\s*while\s*\((.+)\)/,
  funcDecl: /^\s*function\s+(\w+)\s*\(([^)]*)\)/,
  returnStmt: /^\s*return\s*(.+?)\s*;?\s*$/,
  returnEmpty: /^\s*return\s*;?\s*$/,
  funcCall: /^\s*(\w+)\s*\(([^)]*)\)\s*;?\s*$/,
  methodCall: /^\s*(\w+(?:\.\w+)*)\s*\(([^)]*)\)\s*;?\s*$/,
  classDecl: /^\s*class\s+(\w+)/,
  arrowFunc: /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/,
  tryStmt: /^\s*try\s*\{/,
  catchStmt: /^\s*catch\s*\(/,
  throwStmt: /^\s*throw\s+/,
};

function getSourceLine(source, line) {
  const lines = source.split('\n');
  if (line < 1 || line > lines.length) return '';
  return lines[line - 1];
}

function trimSource(src) {
  return src.replace(/^\s+/, '').replace(/\s+$/, '');
}

function formatVal(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'function') return '[Function]';
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.map((v) => formatVal(v)).join(', ');
    return items.length > 60 ? `[${items.slice(0, 57)}...]` : `[${items}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    const preview = keys.slice(0, 3).map((k) => `${k}: ${formatVal(val[k])}`).join(', ');
    return keys.length > 3 ? `{ ${preview}, ... }` : `{ ${preview} }`;
  }
  return String(val);
}

function getChangedVars(prevVars, currVars) {
  if (!prevVars) return [];
  const changed = [];
  for (const [key, val] of Object.entries(currVars)) {
    if (key.startsWith('_')) continue;
    const prev = prevVars[key];
    if (prev === undefined && val !== undefined) {
      changed.push({ name: key, type: 'created', newVal: val });
    } else if (prev !== undefined && val !== undefined) {
      try {
        if (JSON.stringify(prev) !== JSON.stringify(val)) {
          changed.push({ name: key, type: 'changed', oldVal: prev, newVal: val });
        }
      } catch {
        changed.push({ name: key, type: 'changed', oldVal: prev, newVal: val });
      }
    }
  }
  return changed;
}



function explainVariableDecl(step, source, _prevStep) {
  const src = trimSource(getSourceLine(source, step.line));
  const match = src.match(CODE_PATTERNS.variableDecl);
  if (!match) return null;
  const [, kind, name] = match;
  const val = step.variables[name];
  if (val !== undefined) {
    return `The program declares a ${kind} variable called \`${name}\` and assigns it the value ${formatVal(val)}.`;
  }
  return `The program declares a ${kind} variable called \`${name}\`.`;
}

function explainAssignment(step, source, prevStep) {
  const src = trimSource(getSourceLine(source, step.line));
  const changes = getChangedVars(prevStep?.variables, step.variables);
  if (changes.length === 0) {
    if (src.includes('++')) {
      const m = src.match(CODE_PATTERNS.incUpdate) || src.match(CODE_PATTERNS.preInc);
      if (m) {
        const name = m[1];
        const val = step.variables[name];
        return `\`${src.trim()}\` increases \`${name}\` by 1. The new value of \`${name}\` is ${formatVal(val)}.`;
      }
    }
    if (src.includes('--')) {
      const m = src.match(CODE_PATTERNS.decUpdate) || src.match(CODE_PATTERNS.preDec);
      if (m) {
        const name = m[1];
        const val = step.variables[name];
        return `\`${src.trim()}\` decreases \`${name}\` by 1. The new value of \`${name}\` is ${formatVal(val)}.`;
      }
    }
    return `The statement \`${src.trim()}\` executes.`;
  }
  const ch = changes[0];
  if (ch.type === 'created') {
    return `The assignment creates \`${ch.name}\` with the value ${formatVal(ch.newVal)}.`;
  }
  let op = 'is assigned';
  if (src.includes('+=')) op = 'adds to';
  else if (src.includes('-=')) op = 'subtracts from';
  else if (src.includes('*=')) op = 'multiplies';
  else if (src.includes('/=')) op = 'divides';
  else if (src.includes('%=')) op = 'takes the modulus of';

  if (op === 'is assigned') {
    return `\`${ch.name}\` changes from ${formatVal(ch.oldVal)} to ${formatVal(ch.newVal)}.`;
  }
  return `\`${ch.name}\` changes from ${formatVal(ch.oldVal)} to ${formatVal(ch.newVal)}.`;
}

function explainConsoleLog(step, source) {
  const src = trimSource(getSourceLine(source, step.line));
  const match = src.match(CODE_PATTERNS.consoleLog);
  if (!match) return `The program prints output to the console.`;
  const expr = match[1].trim();
  const lastOutput = step.output.length > 0 ? step.output[step.output.length - 1] : null;
  if (lastOutput !== null) {
    return `\`console.log(${expr})\` prints ${formatVal(lastOutput)} to the console.`;
  }
  return `The program executes \`console.log(${expr})\`.`;
}

function explainIfStatement(step, source) {
  const src = trimSource(getSourceLine(source, step.line));
  const info = step.info;
  const isTrue = info && info.includes('true');
  const condMatch = src.match(/^\s*if\s*\((.+)\)/);
  const condExpr = condMatch ? condMatch[1].trim() : 'condition';
  if (isTrue) {
    return `The condition \`${condExpr}\` is checked. It evaluates to \`true\`, so the program enters the \`if\` block.`;
  }
  return `The condition \`${condExpr}\` is checked. It evaluates to \`false\`, so the \`if\` block is skipped.`;
}

function explainElseIf(step, source) {
  const src = trimSource(getSourceLine(source, step.line));
  const info = step.info;
  const isTrue = info && info.includes('true');
  const condMatch = src.match(/^\s*else\s+if\s*\((.+)\)/);
  const condExpr = condMatch ? condMatch[1].trim() : 'condition';
  if (isTrue) {
    return `The \`else if\` condition \`${condExpr}\` evaluates to \`true\`, so this branch executes.`;
  }
  return `The \`else if\` condition \`${condExpr}\` evaluates to \`false\`, so this branch is skipped.`;
}

function explainElse(_step, _source) {
  return `The previous condition was false, so the \`else\` block executes.`;
}

function explainForLoop(step, _source) {
  const li = step.loopInfo;
  if (!li) return `The \`for\` loop begins.`;
  if (li.condition === false || li.condition === 0) {
    return `The loop condition is now false, so the \`for\` loop stops.`;
  }
  return `\`for\` loop iteration ${li.iteration}: the loop condition is true, so the loop body executes.`;
}

function explainWhileLoop(step, source) {
  const li = step.loopInfo;
  const src = trimSource(getSourceLine(source, step.line));
  const condMatch = src.match(CODE_PATTERNS.whileLoop);
  const condExpr = condMatch ? condMatch[1].trim() : 'condition';
  if (!li) return `The \`while\` loop begins.`;
  if (!li.condition) {
    return `The \`while\` condition \`${condExpr}\` is false, so the loop stops.`;
  }
  if (li.iteration === 1) {
    return `The \`while\` condition \`${condExpr}\` is checked. It is true, so the loop body runs for the first time.`;
  }
  return `\`while\` loop iteration ${li.iteration}: the condition \`${condExpr}\` is still true, so the loop continues.`;
}

function explainFuncDecl(step, source) {
  const src = trimSource(getSourceLine(source, step.line));
  const match = src.match(CODE_PATTERNS.funcDecl);
  if (!match) return `A function is defined.`;
  const [, name, params] = match;
  return `The function \`${name}\` is defined${params.trim() ? ` with parameters: \`${params.trim()}\`` : ''}.`;
}

function explainFuncCall(step, _source) {
  const fc = step.functionCall;
  if (!fc) return null;
  const paramStr = Object.entries(fc.params)
    .map(([k, v]) => `\`${k}\` = ${formatVal(v)}`)
    .join(', ');
  const depth = step.callStack.length;
  if (depth > 1) {
    return `\`${fc.name}(${Object.values(fc.args).map(formatVal).join(', ')})\` is called. The function receives ${paramStr}.`;
  }
  return `\`${fc.name}(${Object.values(fc.args).map(formatVal).join(', ')})\` is called. Execution enters the function.`;
}

function explainReturn(step, source) {
  const src = trimSource(getSourceLine(source, step.line));
  const val = step.returnValue;
  if (val === undefined) {
    if (CODE_PATTERNS.returnEmpty.test(src)) {
      return `The function returns \`undefined\` (no return value).`;
    }
    return `The function returns \`undefined\`.`;
  }
  return `The function returns ${formatVal(val)}.`;
}

function explainClassDecl(step, source) {
  const src = trimSource(getSourceLine(source, step.line));
  const match = src.match(CODE_PATTERNS.classDecl);
  const name = match ? match[1] : 'the class';
  return `The class \`${name}\` is defined.`;
}

function explainCompleted(step, _source) {
  const outputs = step.output;
  if (outputs.length > 0) {
    return `Execution is complete. The program produced ${outputs.length} line(s) of console output.`;
  }
  return `Execution is complete. The program finished running.`;
}

export function generateExplanation(source, currentStep, prevStep, _trace) {
  if (!currentStep) return null;

  const src = trimSource(getSourceLine(source, currentStep.line));
  const isCompleted = currentStep.status === 'completed';

  if (isCompleted) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainCompleted(currentStep, source),
      type: 'completed',
    };
  }

  if (currentStep.returnValue !== undefined) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainReturn(currentStep, source),
      type: 'return',
    };
  }

  if (currentStep.functionCall) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainFuncCall(currentStep, source),
      type: 'function-call',
    };
  }

  if (currentStep.loopInfo) {
    const isFor = CODE_PATTERNS.forLoop.test(src);
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: isFor
        ? explainForLoop(currentStep, source)
        : explainWhileLoop(currentStep, source),
      type: 'loop',
    };
  }

  if (CODE_PATTERNS.forLoop.test(src) && !currentStep.loopInfo) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: `The \`for\` loop begins. The loop variable is initialized.`,
      type: 'loop',
    };
  }

  if (CODE_PATTERNS.whileLoop.test(src) && !currentStep.loopInfo) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: `The \`while\` loop begins. The condition is about to be checked.`,
      type: 'loop',
    };
  }

  if (currentStep.info && src.match(/^\s*if\s*\(/)) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainIfStatement(currentStep, source),
      type: 'condition',
    };
  }

  if (currentStep.info && src.match(/^\s*else\s+if\s*\(/)) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainElseIf(currentStep, source),
      type: 'condition',
    };
  }

  if (CODE_PATTERNS.elseStatement.test(src)) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainElse(currentStep, source),
      type: 'condition',
    };
  }

  if (CODE_PATTERNS.variableDecl.test(src)) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainVariableDecl(currentStep, source, prevStep),
      type: 'variable',
    };
  }

  if (CODE_PATTERNS.funcDecl.test(src)) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainFuncDecl(currentStep, source),
      type: 'function-decl',
    };
  }

  if (CODE_PATTERNS.classDecl.test(src)) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainClassDecl(currentStep, source),
      type: 'class',
    };
  }

  if (CODE_PATTERNS.consoleLog.test(src)) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainConsoleLog(currentStep, source),
      type: 'console',
    };
  }

  if (
    CODE_PATTERNS.simpleAssign.test(src) ||
    CODE_PATTERNS.plusAssign.test(src) ||
    CODE_PATTERNS.minusAssign.test(src) ||
    CODE_PATTERNS.mulAssign.test(src) ||
    CODE_PATTERNS.divAssign.test(src) ||
    CODE_PATTERNS.modAssign.test(src) ||
    CODE_PATTERNS.incUpdate.test(src) ||
    CODE_PATTERNS.decUpdate.test(src) ||
    CODE_PATTERNS.preInc.test(src) ||
    CODE_PATTERNS.preDec.test(src)
  ) {
    return {
      sourceLine: getSourceLine(source, currentStep.line),
      lineNumber: currentStep.line,
      explanation: explainAssignment(currentStep, source, prevStep),
      type: 'assignment',
    };
  }

  return {
    sourceLine: getSourceLine(source, currentStep.line),
    lineNumber: currentStep.line,
    explanation: `The program executes: \`${src || '...'}\`.`,
    type: 'statement',
  };
}

export function generateAllExplanations(source, trace) {
  if (!trace || !trace.steps || trace.steps.length === 0) return [];
  const explanations = [];
  for (let i = 0; i < trace.steps.length; i++) {
    const prev = i > 0 ? trace.steps[i - 1] : null;
    explanations.push(generateExplanation(source, trace.steps[i], prev, trace));
  }
  return explanations;
}
