import * as acorn from 'acorn';

const MAX_STEPS = 5000;
const MAX_LOOP_ITERATIONS = 1000;
const MAX_RECURSION = 100;

class ExecutionError extends Error {
  constructor(message, line, column) {
    super(message);
    this.name = 'ExecutionError';
    this.line = line;
    this.column = column;
  }
}

export function parseCode(source) {
  try {
    const ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true,
      allowReturnOutsideFunction: true,
    });
    return { ast, error: null };
  } catch (e) {
    return {
      ast: null,
      error: {
        message: e.message.replace(/\s*\(\d+:\d+\)$/, ''),
        line: e.loc?.line || 0,
        column: e.loc?.column || 0,
      },
    };
  }
}

export function generateTrace(source) {
  const { ast, error: parseError } = parseCode(source);
  if (parseError) {
    return { steps: [], error: parseError };
  }

  const steps = [];
  const callStack = [];
  let stepCount = 0;
  let error = null;
  let accumulatedOutput = [];

  const env = createScope(null, 'global');
  callStack.push({ name: 'global', scope: env });

  // Register known browser/JS globals so Identifier lookup finds them
  const knownGlobals = {
    JSON, Math, console, Array, Object, String, Number, Boolean,
    Date, RegExp, Error, RangeError, TypeError, SyntaxError,
    parseInt, parseFloat, isNaN, isFinite,
    Map, Set, Promise, Symbol, WeakMap, WeakSet,
    encodeURI, decodeURI, encodeURIComponent, decodeURIComponent,
    escape, unescape,
  };
  for (const [name, value] of Object.entries(knownGlobals)) {
    if (!(name in env._vars)) {
      env._vars[name] = value;
    }
  }

  // Browser-only globals (safe fallbacks for Node.js testing)
  if (typeof window !== 'undefined') {
    env._vars['window'] = window;
    env._vars['alert'] = window.alert;
    env._vars['prompt'] = window.prompt;
    env._vars['confirm'] = window.confirm;
    env._vars['setTimeout'] = window.setTimeout;
    env._vars['setInterval'] = window.setInterval;
    env._vars['clearTimeout'] = window.clearTimeout;
    env._vars['clearInterval'] = window.clearInterval;
  } else {
    env._vars['setTimeout'] = (fn, ms) => 0;
    env._vars['setInterval'] = (fn, ms) => 0;
    env._vars['clearTimeout'] = () => {};
    env._vars['clearInterval'] = () => {};
    env._vars['alert'] = (msg) => {};
    env._vars['prompt'] = (msg, def) => def || '';
    env._vars['confirm'] = (msg) => true;
  }
  // Primitives and special values
  env._vars['undefined'] = undefined;
  env._vars['NaN'] = NaN;
  env._vars['Infinity'] = Infinity;
  env._vars['null'] = null;
  env._vars['true'] = true;
  env._vars['false'] = false;

  const globalVarNames = new Set(Object.keys(env._vars));
  const userDefinedVars = new Set();

  function record(line, extras = {}, recordScope = null) {
    if (error) return false;
    if (stepCount >= MAX_STEPS) {
      error = {
        message: `Execution limit reached (${MAX_STEPS} steps). Possible infinite loop.`,
        line: line || 0,
      };
      return false;
    }

    if (extras.output) {
      accumulatedOutput = [...extras.output];
    }

    const vars = {};
    // Collect from the current execution scope (function scope, not global)
    const scopeToRecord = recordScope || env;
    collectVisibleVars(scopeToRecord, vars);

    steps.push({
      step: stepCount++,
      line: line || 0,
      variables: { ...vars },
      callStack: callStack.map((f) => f.name),
      output: [...accumulatedOutput],
      scope: callStack.length > 0 ? callStack[callStack.length - 1].name : 'global',
      status: 'running',
      info: extras.info || null,
      loopInfo: extras.loopInfo || null,
      functionCall: extras.functionCall || null,
      returnValue: extras.returnValue !== undefined ? extras.returnValue : undefined,
    });
    return true;
  }

  try {
    for (const node of ast.body) {
      const result = execNode(node, env);
      if (result === false || error) break;
    }
  } catch (e) {
    if (e instanceof ExecutionError) {
      error = { message: e.message, line: e.line || 0 };
    } else {
      error = { message: e.message || 'Unknown execution error', line: 0 };
    }
  }

  if (!error && stepCount > 0) {
    const lastStep = steps[steps.length - 1];
    if (lastStep && lastStep.status === 'running') {
      steps.push({
        step: stepCount,
        line: lastStep.line,
        variables: { ...lastStep.variables },
        callStack: callStack.map((f) => f.name),
        output: [...accumulatedOutput],
        scope: 'global',
        status: 'completed',
        info: null,
        loopInfo: null,
        functionCall: null,
        returnValue: undefined,
      });
    }
  }

  return { steps, error };

  function execNode(node, scope, useExistingScope = false) {
    if (!node) return true;

    switch (node.type) {
      case 'VariableDeclaration':
        return execVarDecl(node, scope);
      case 'ExpressionStatement':
        return execExprStmt(node, scope);
      case 'BlockStatement':
        return execBlock(node, scope, useExistingScope);
      case 'IfStatement':
        return execIf(node, scope);
      case 'ForStatement':
        return execFor(node, scope);
      case 'WhileStatement':
        return execWhile(node, scope);
      case 'FunctionDeclaration':
        return execFuncDecl(node, scope);
      case 'ReturnStatement':
        return execReturn(node, scope);
      case 'BreakStatement':
        return '__break__';
      case 'ContinueStatement':
        return '__continue__';
      case 'EmptyStatement':
        return true;
      default:
        return true;
    }
  }

  function execVarDecl(node, scope) {
    for (const decl of node.declarations) {
      const name = decl.id.name;
      defineVar(name, undefined, scope);
      const value = decl.init ? evalExpr(decl.init, scope) : undefined;
      setVar(name, value, scope);
    }
    return record(node.loc?.start.line || 0, {}, scope);
  }

  function execExprStmt(node, scope) {
    const result = evalExpr(node.expression, scope);
    if (result === '__return__') return '__return__';
    return record(node.loc?.start.line || 0, {}, scope);
  }

  function execBlock(node, scope, useExistingScope = false) {
    // Function bodies reuse the function scope; other blocks get a child scope
    const blockScope = useExistingScope ? scope : createScope(scope, scope._name || 'block');
    for (const stmt of node.body) {
      const result = execNode(stmt, blockScope);
      if (
        result === '__return__' ||
        result === '__break__' ||
        result === '__continue__' ||
        result === false
      ) {
        return result;
      }
      if (error) return false;
    }
    return true;
  }

  function execIf(node, scope) {
    const line = node.loc?.start.line || 0;
    const testVal = evalExpr(node.test, scope);
    if (!record(line, { info: `Condition: ${JSON.stringify(testVal)}` }, scope)) return false;

    if (testVal) {
      return execNode(node.consequent, scope);
    } else if (node.alternate) {
      return execNode(node.alternate, scope);
    }
    return true;
  }

  function execFor(node, scope) {
    const line = node.loc?.start.line || 0;
    const forScope = createScope(scope, 'for-loop');

    if (node.init) {
      if (node.init.type === 'VariableDeclaration') {
        for (const decl of node.init.declarations) {
          const name = decl.id.name;
          defineVar(name, undefined, forScope);
          const value = decl.init ? evalExpr(decl.init, forScope) : undefined;
          setVar(name, value, forScope);
        }
        record(line, {}, forScope);
      } else {
        evalExpr(node.init, forScope);
      }
    }

    let iteration = 0;
    while (true) {
      iteration++;
      if (iteration > MAX_LOOP_ITERATIONS) {
        error = {
          message: `Loop exceeded ${MAX_LOOP_ITERATIONS} iterations. Possible infinite loop.`,
          line,
        };
        return false;
      }

      const testVal = node.test ? evalExpr(node.test, forScope) : true;
      if (!record(line, { loopInfo: { iteration, condition: testVal } }, forScope)) return false;
      if (!testVal) break;

      const result = execNode(node.body, forScope);
      if (result === '__return__' || result === false) return result;
      if (result === '__break__') break;
      // __continue__ falls through to update

      if (node.update) {
        evalExpr(node.update, forScope);
      }
    }
    return true;
  }

  function execWhile(node, scope) {
    const line = node.loc?.start.line || 0;
    let iteration = 0;

    while (true) {
      iteration++;
      if (iteration > MAX_LOOP_ITERATIONS) {
        error = {
          message: `Loop exceeded ${MAX_LOOP_ITERATIONS} iterations. Possible infinite loop.`,
          line,
        };
        return false;
      }

      const testVal = evalExpr(node.test, scope);
      if (!record(line, { loopInfo: { iteration, condition: testVal } }, scope)) return false;
      if (!testVal) break;

      const result = execNode(node.body, scope);
      if (result === '__return__' || result === false) return result;
      if (result === '__break__') break;
      if (result === '__continue__') continue;
    }
    return true;
  }

  function execFuncDecl(node, scope) {
    const funcObj = {
      type: 'function',
      name: node.id.name,
      node,
      scope,
    };
    defineVar(node.id.name, funcObj, scope);
    return record(node.loc?.start.line || 0, {}, scope);
  }

  function execReturn(node, scope) {
    const line = node.loc?.start.line || 0;
    const value = node.argument ? evalExpr(node.argument, scope) : undefined;
    if (!record(line, { returnValue: value }, scope)) return false;

    if (callStack.length > 1) {
      callStack.pop();
    }

    // Walk up to the function scope and set _returnValue there.
    // execReturn may be called from a deeply nested block scope (e.g. inside an if),
    // but CallExpression reads _returnValue from the function scope.
    let s = scope;
    while (s) {
      if (s._isFuncScope) {
        s._returnValue = value;
        return '__return__';
      }
      s = s._parent;
    }
    // Fallback: set on current scope (shouldn't normally reach here)
    scope._returnValue = value;
    return '__return__';
  }

  function evalExpr(node, scope) {
    if (!node) return undefined;

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier': {
        if (node.name === 'undefined') return undefined;
        const val = getVar(node.name, scope);
        if (val === undefined) {
          throw new ExecutionError(
            `'${node.name}' is not defined`,
            node.loc?.start.line,
            node.loc?.start.column
          );
        }
        return val;
      }

      case 'AssignmentExpression': {
        const val = evalExpr(node.right, scope);
        const left = node.left;
        if (left.type === 'Identifier') {
          if (node.operator === '=') {
            setVar(left.name, val, scope);
          } else {
            const cur = getVar(left.name, scope);
            let newVal;
            switch (node.operator) {
              case '+=': newVal = cur + val; break;
              case '-=': newVal = cur - val; break;
              case '*=': newVal = cur * val; break;
              case '/=': newVal = cur / val; break;
              case '%=': newVal = cur % val; break;
              default: newVal = val;
            }
            setVar(left.name, newVal, scope);
          }
        }
        return val;
      }

      case 'BinaryExpression': {
        const left = evalExpr(node.left, scope);
        const right = evalExpr(node.right, scope);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '===': return left === right;
          case '!==': return left !== right;
          case '==': return left == right;
          case '!=': return left != right;
          case '<': return left < right;
          case '>': return left > right;
          case '<=': return left <= right;
          case '>=': return left >= right;
          case '&&': return left && right;
          case '||': return left || right;
          case '**': return left ** right;
          default: return undefined;
        }
      }

      case 'UnaryExpression': {
        const arg = evalExpr(node.argument, scope);
        switch (node.operator) {
          case '-': return -arg;
          case '+': return +arg;
          case '!': return !arg;
          case '~': return ~arg;
          case 'typeof': return typeof arg;
          case 'void': return undefined;
          default: return arg;
        }
      }

      case 'UpdateExpression': {
        const name = node.argument.name;
        const cur = getVar(name, scope);
        if (node.operator === '++') {
          setVar(name, cur + 1, scope);
          return node.prefix ? cur + 1 : cur;
        } else {
          setVar(name, cur - 1, scope);
          return node.prefix ? cur - 1 : cur;
        }
      }

      case 'CallExpression': {
        const callee = node.callee;
        let funcName = '';
        let funcObj = null;

        // Check for built-in objects (console, Math, etc.) before evaluating
        if (callee.type === 'MemberExpression') {
          const objName = callee.object.type === 'Identifier' ? callee.object.name : null;
          const propName = callee.computed
            ? null
            : callee.property.name;

          // Handle console.log, console.warn, console.error
          if (objName === 'console' && propName) {
            const args = node.arguments.map((a) => evalExpr(a, scope));
            const line = node.loc?.start.line || 0;
            if (propName === 'log' || propName === 'warn' || propName === 'error') {
              const outputStr = args.map(formatValue).join(' ');
              accumulatedOutput = [...accumulatedOutput, outputStr];
              record(line, { output: accumulatedOutput }, scope);
            }
            return undefined;
          }

          // Handle Math.xxx
          if (objName === 'Math' && propName) {
            const args = node.arguments.map((a) => evalExpr(a, scope));
            if (typeof Math[propName] === 'function') {
              return Math[propName](...args);
            }
          }

          // Fall through to general MemberExpression evaluation
          const obj = evalExpr(callee.object, scope);
          const prop = callee.computed
            ? evalExpr(callee.property, scope)
            : callee.property.name;
          funcName = `${objName || obj}.${prop}`;
          funcObj = obj?.[prop];
        } else if (callee.type === 'Identifier') {
          funcName = callee.name;
          funcObj = getVar(funcName, scope);
        }

        // Handle user-defined functions
        if (funcObj && funcObj.type === 'function') {
          if (callStack.length >= MAX_RECURSION) {
            throw new ExecutionError(
              `Maximum recursion depth (${MAX_RECURSION}) exceeded`,
              node.loc?.start.line
            );
          }

          const args = node.arguments.map((a) => evalExpr(a, scope));
          const funcScope = createScope(funcObj.scope, funcName);

          for (let i = 0; i < funcObj.node.params.length; i++) {
            defineVar(funcObj.node.params[i].name, args[i], funcScope);
          }

          funcScope._isFuncScope = true;
          callStack.push({ name: funcName, scope: funcScope });

          const paramNames = funcObj.node.params.map((p) => p.name);
          const paramValues = {};
          paramNames.forEach((n, i) => {
            paramValues[n] = args[i];
          });

          record(node.loc?.start.line || 0, {
            functionCall: { name: funcName, params: paramValues, args },
          }, scope);

          const prevLen = callStack.length;
          const result = execNode(funcObj.node.body, funcScope, true);

          // Pop from call stack if return didn't already pop
          if (result !== '__return__' && callStack.length >= prevLen) {
            callStack.pop();
          }

          return funcScope._returnValue;
        }

        // Handle built-in functions stored as native
        if (typeof funcObj === 'function') {
          const args = node.arguments.map((a) => evalExpr(a, scope));
          return funcObj(...args);
        }

        throw new ExecutionError(
          `'${funcName}' is not a function`,
          node.loc?.start.line
        );
      }

      case 'ArrayExpression':
        return node.elements.map((e) => (e ? evalExpr(e, scope) : null));

      case 'MemberExpression': {
        const obj = evalExpr(node.object, scope);
        if (obj === undefined || obj === null) {
          throw new ExecutionError(
            `Cannot read properties of ${obj}`,
            node.loc?.start.line
          );
        }
        const prop = node.computed
          ? evalExpr(node.property, scope)
          : node.property.name;
        return obj[prop];
      }

      case 'ConditionalExpression': {
        const test = evalExpr(node.test, scope);
        return test
          ? evalExpr(node.consequent, scope)
          : evalExpr(node.alternate, scope);
      }

      case 'LogicalExpression': {
        const left = evalExpr(node.left, scope);
        if (node.operator === '&&') return left && evalExpr(node.right, scope);
        if (node.operator === '||') return left || evalExpr(node.right, scope);
        if (node.operator === '??') return left ?? evalExpr(node.right, scope);
        return undefined;
      }

      case 'ObjectExpression': {
        const obj = {};
        for (const prop of node.properties) {
          const key =
            prop.key.type === 'Identifier'
              ? prop.key.name
              : evalExpr(prop.key, scope);
          obj[key] = evalExpr(prop.value, scope);
        }
        return obj;
      }

      case 'ArrowFunctionExpression': {
        return {
          type: 'function',
          name: 'arrow',
          node: { params: node.params, body: node.body },
          scope,
        };
      }

      case 'TemplateLiteral': {
        let result = '';
        for (let i = 0; i < node.quasis.length; i++) {
          result += node.quasis[i].value.cooked;
          if (i < node.expressions.length) {
            result += String(evalExpr(node.expressions[i], scope));
          }
        }
        return result;
      }

      case 'SequenceExpression': {
        let val;
        for (const expr of node.expressions) {
          val = evalExpr(expr, scope);
        }
        return val;
      }

      case 'NewExpression': {
        throw new ExecutionError(
          `'new' is not supported in this interpreter`,
          node.loc?.start.line
        );
      }

      default:
        return undefined;
    }
  }

  function createScope(parent, name) {
    return { _parent: parent, _name: name, _vars: {}, _returnValue: undefined };
  }

  function setVar(name, value, scope) {
    // Assignment expressions must update the variable where it was originally declared.
    // Walk up the scope chain to find the existing binding and update it there.
    let current = scope;
    while (current) {
      if (name in current._vars) {
        current._vars[name] = value;
        return;
      }
      current = current._parent;
    }
    // Variable not found — create in current scope (non-strict mode behavior)
    scope._vars[name] = value;
  }

  // defineVar always creates a new binding in the given scope (no parent walk).
  // Used by let/const declarations and function parameter registration.
  function defineVar(name, value, scope) {
    scope._vars[name] = value;
    userDefinedVars.add(name);
  }

  function getVar(name, scope) {
    if (name in scope._vars) return scope._vars[name];
    if (scope._parent) return getVar(name, scope._parent);
    return undefined;
  }

  function collectVisibleVars(scope, result) {
    // Collect from outermost to innermost so innermost wins
    if (scope._parent) collectVisibleVars(scope._parent, result);
    for (const [key, value] of Object.entries(scope._vars)) {
      // Don't include internal properties or native globals
      if (key.startsWith('_')) continue;
      if (globalVarNames.has(key) && !userDefinedVars.has(key)) continue;
      result[key] = value;
    }
  }


}

function formatValue(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return val;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object' && Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
