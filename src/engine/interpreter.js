import * as acorn from 'acorn';
import { createBuiltins } from './builtins.js';

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

const DOM_GLOBALS = new Set(['document', 'window', 'navigator', 'location', 'history', 'screen', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'FormData', 'Headers', 'Request', 'Response', 'URL', 'URLSearchParams', 'Blob', 'File', 'FileReader', 'ImageData', 'CanvasRenderingContext2D', 'HTMLCanvasElement', 'Event', 'CustomEvent', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName', 'createElement', 'createTextNode', 'createDocumentFragment']);

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
    env._vars['document'] = document;
    env._vars['alert'] = window.alert;
    env._vars['prompt'] = window.prompt;
    env._vars['confirm'] = window.confirm;
    env._vars['setTimeout'] = window.setTimeout;
    env._vars['setInterval'] = window.setInterval;
    env._vars['clearTimeout'] = window.clearTimeout;
    env._vars['clearInterval'] = window.clearInterval;
    env._vars['requestAnimationFrame'] = window.requestAnimationFrame;
    env._vars['cancelAnimationFrame'] = window.cancelAnimationFrame;
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
  const NOT_FOUND = Symbol('NOT_FOUND');

  function evalArgs(args, scope) {
    const result = [];
    for (const arg of args) {
      if (arg.type === 'SpreadElement') {
        const spreadVal = evalExpr(arg.argument, scope);
        if (Array.isArray(spreadVal)) {
          result.push(...spreadVal);
        } else if (spreadVal && typeof spreadVal[Symbol.iterator] === 'function') {
          result.push(...spreadVal);
        } else {
          result.push(spreadVal);
        }
      } else {
        result.push(evalExpr(arg, scope));
      }
    }
    return result;
  }

  function convertParam(param, argVal, scope) {
    if (param.type === 'Identifier') {
      defineVar(param.name, argVal, scope);
    } else if (param.type === 'ArrayPattern') {
      execArrayPattern(param.elements, argVal, scope);
    } else if (param.type === 'ObjectPattern') {
      execObjectPattern(param.properties, argVal, scope);
    } else if (param.type === 'AssignmentPattern') {
      const resolved = argVal !== undefined ? argVal : evalExpr(param.right, scope);
      convertParam(param.left, resolved, scope);
    } else if (param.type === 'RestElement') {
      if (param.argument.type === 'Identifier') {
        defineVar(param.argument.name, argVal, scope);
      }
    }
  }

  function convertCallback(funcObj) {
    if (funcObj && typeof funcObj === 'object' && funcObj.type === 'function') {
      return (...cbArgs) => {
        const cbScope = createScope(funcObj.scope, funcObj.name || 'callback');
        for (let i = 0; i < funcObj.node.params.length; i++) {
          convertParam(funcObj.node.params[i], cbArgs[i], cbScope);
        }
        cbScope._isFuncScope = true;
        if (funcObj._thisValue !== undefined) {
          defineVar('this', funcObj._thisValue, cbScope);
        }
        callStack.push({ name: funcObj.name || 'callback', scope: cbScope });
        const prevLen = callStack.length;
        if (funcObj.node.body.type === 'BlockStatement') {
          execNode(funcObj.node.body, cbScope, true);
        } else {
          cbScope._returnValue = evalExpr(funcObj.node.body, cbScope);
        }
        if (callStack.length >= prevLen) callStack.pop();
        return cbScope._returnValue;
      };
    }
    return funcObj;
  }

  const builtins = createBuiltins(convertCallback);

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
      case 'ForInStatement':
        return execForIn(node, scope);
      case 'ForOfStatement':
        return execForOf(node, scope);
      case 'WhileStatement':
        return execWhile(node, scope);
      case 'FunctionDeclaration':
        return execFuncDecl(node, scope);
      case 'ClassDeclaration':
        return execClassDecl(node, scope);
      case 'ReturnStatement':
        return execReturn(node, scope);
      case 'BreakStatement':
        return '__break__';
      case 'ContinueStatement':
        return '__continue__';
      case 'TryStatement':
        return execTry(node, scope);
      case 'ThrowStatement': {
        const thrownVal = evalExpr(node.argument, scope);
        throw thrownVal instanceof Error ? thrownVal : new Error(String(thrownVal));
      }
      case 'SwitchStatement':
        return execSwitch(node, scope);
      case 'EmptyStatement':
        return true;
      default:
        return true;
    }
  }

  function execVarDecl(node, scope) {
    for (const decl of node.declarations) {
      const value = decl.init ? evalExpr(decl.init, scope) : undefined;
      if (decl.id.type === 'Identifier') {
        defineVar(decl.id.name, value, scope);
      } else if (decl.id.type === 'ArrayPattern') {
        execArrayPattern(decl.id.elements, value, scope);
      } else if (decl.id.type === 'ObjectPattern') {
        execObjectPattern(decl.id.properties, value, scope);
      }
    }
    return record(node.loc?.start.line || 0, {}, scope);
  }

  function execArrayPattern(elements, value, scope) {
    if (!Array.isArray(value)) value = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (!el) continue;
      const itemValue = i < value.length ? value[i] : undefined;
      if (el.type === 'Identifier') {
        defineVar(el.name, itemValue, scope);
      } else if (el.type === 'ArrayPattern') {
        execArrayPattern(el.elements, itemValue, scope);
      } else if (el.type === 'ObjectPattern') {
        execObjectPattern(el.properties, itemValue, scope);
      } else if (el.type === 'AssignmentPattern') {
        const resolved = itemValue !== undefined ? itemValue : evalExpr(el.right, scope);
        if (el.left.type === 'Identifier') {
          defineVar(el.left.name, resolved, scope);
        }
      } else if (el.type === 'RestElement') {
        const restValue = value.slice(i);
        if (el.argument.type === 'Identifier') {
          defineVar(el.argument.name, restValue, scope);
        }
      }
    }
  }

  function execObjectPattern(properties, value, scope) {
    if (value === null || value === undefined) value = {};
    for (const prop of properties) {
      if (prop.type === 'RestElement') {
        const remaining = { ...value };
        for (const p of properties) {
          if (p.type === 'Property') {
            const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
            delete remaining[key];
          }
        }
        if (prop.argument.type === 'Identifier') {
          defineVar(prop.argument.name, remaining, scope);
        }
        continue;
      }
      const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
      const itemValue = value[key];
      if (prop.value.type === 'Identifier') {
        defineVar(prop.value.name, itemValue, scope);
      } else if (prop.value.type === 'AssignmentPattern') {
        const resolved = itemValue !== undefined ? itemValue : evalExpr(prop.value.right, scope);
        if (prop.value.left.type === 'Identifier') {
          defineVar(prop.value.left.name, resolved, scope);
        }
      } else if (prop.value.type === 'ArrayPattern') {
        execArrayPattern(prop.value.elements, itemValue, scope);
      } else if (prop.value.type === 'ObjectPattern') {
        execObjectPattern(prop.value.properties, itemValue, scope);
      }
    }
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
    const isLet = node.init && node.init.type === 'VariableDeclaration' && node.init.kind === 'let';

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

      let bodyScope = forScope;
      if (isLet && node.init) {
        bodyScope = createScope(forScope, 'for-loop-iter');
        for (const decl of node.init.declarations) {
          defineVar(decl.id.name, forScope._vars[decl.id.name], bodyScope);
        }
      }

      const result = execNode(node.body, bodyScope);
      if (result === '__return__' || result === false) return result;
      if (result === '__break__') break;

      if (node.update) {
        evalExpr(node.update, forScope);
      }
    }
    return true;
  }

  function execForIn(node, scope) {
    const line = node.loc?.start.line || 0;
    const obj = evalExpr(node.right, scope);
    if (obj === null || obj === undefined) return true;
    const keys = Object.keys(obj);
    let iteration = 0;

    for (const key of keys) {
      iteration++;
      if (iteration > MAX_LOOP_ITERATIONS) {
        error = { message: `Loop exceeded ${MAX_LOOP_ITERATIONS} iterations.`, line };
        return false;
      }

      const loopScope = createScope(scope, 'for-in-loop');
      if (node.left.type === 'VariableDeclaration') {
        const decl = node.left.declarations[0];
        if (decl.id.type === 'Identifier') {
          defineVar(decl.id.name, key, loopScope);
        }
      } else if (node.left.type === 'Identifier') {
        setVar(node.left.name, key, scope);
      }

      record(line, { loopInfo: { iteration, condition: key } }, loopScope);
      const result = execNode(node.body, loopScope);
      if (result === '__return__' || result === '__break__' || result === false) {
        if (result === '__break__') break;
        return result;
      }
    }
    return true;
  }

  function execForOf(node, scope) {
    const line = node.loc?.start.line || 0;
    const iterable = evalExpr(node.right, scope);
    if (iterable === null || iterable === undefined) return true;
    let iteration = 0;

    if (typeof iterable[Symbol.iterator] !== 'function') {
      throw new ExecutionError(`${typeof iterable} is not iterable`, line);
    }

    for (const item of iterable) {
      iteration++;
      if (iteration > MAX_LOOP_ITERATIONS) {
        error = { message: `Loop exceeded ${MAX_LOOP_ITERATIONS} iterations.`, line };
        return false;
      }

      const loopScope = createScope(scope, 'for-of-loop');
      if (node.left.type === 'VariableDeclaration') {
        const decl = node.left.declarations[0];
        if (decl.id.type === 'Identifier') {
          defineVar(decl.id.name, item, loopScope);
        } else if (decl.id.type === 'ArrayPattern') {
          execArrayPattern(decl.id.elements, item, loopScope);
        } else if (decl.id.type === 'ObjectPattern') {
          execObjectPattern(decl.id.properties, item, loopScope);
        }
      } else if (node.left.type === 'Identifier') {
        setVar(node.left.name, item, scope);
      }

      record(line, { loopInfo: { iteration, condition: item } }, loopScope);
      const result = execNode(node.body, loopScope);
      if (result === '__return__' || result === '__break__' || result === false) {
        if (result === '__break__') break;
        return result;
      }
    }
    return true;
  }

  function execTry(node, scope) {
    const line = node.loc?.start.line || 0;
    const tryScope = createScope(scope, 'try');
    let thrownError = undefined;

    try {
      const result = execNode(node.block, tryScope);
      if (result === '__return__' || result === '__break__' || result === '__continue__') {
        return result;
      }
    } catch (e) {
      thrownError = e;
    }

    if (thrownError && node.handler) {
      const catchScope = createScope(scope, 'catch');
      if (node.handler.param && node.handler.param.type === 'Identifier') {
        defineVar(node.handler.param.name, thrownError, catchScope);
      }
      const result = execNode(node.handler.body, catchScope);
      if (result === '__return__' || result === '__break__' || result === '__continue__') {
        return result;
      }
    } else if (thrownError && !node.handler) {
      throw thrownError;
    }

    if (node.finalizer) {
      const result = execNode(node.finalizer, scope);
      if (result === '__return__' || result === '__break__' || result === '__continue__') {
        return result;
      }
    }

    return true;
  }

  function execSwitch(node, scope) {
    const line = node.loc?.start.line || 0;
    const discriminant = evalExpr(node.discriminant, scope);
    let matched = false;
    let result = true;

    for (const switchCase of node.cases) {
      if (!matched) {
        if (switchCase.test === null) {
          matched = true;
        } else {
          const testVal = evalExpr(switchCase.test, scope);
          if (testVal === discriminant) {
            matched = true;
          }
        }
      }

      if (matched) {
        for (const stmt of switchCase.consequent) {
          result = execNode(stmt, scope);
          if (result === '__break__') return true;
          if (result === '__return__' || result === false) return result;
        }
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

  function execClassDecl(node, scope) {
    const className = node.id.name;
    const superClass = node.superClass ? evalExpr(node.superClass, scope) : null;

    const classObj = {
      type: 'class',
      name: className,
      superClass,
      methods: {},
      staticMethods: {},
      constructor: null,
    };

    for (const method of node.body.body) {
      if (method.kind === 'constructor') {
        classObj.constructor = {
          type: 'function',
          name: className,
          node: { params: method.value.params, body: method.value.body },
          scope,
        };
      } else if (method.static) {
        classObj.staticMethods[method.key.name] = {
          type: 'function',
          name: method.key.name,
          node: method.value,
          scope,
        };
      } else {
        classObj.methods[method.key.name] = {
          type: 'function',
          name: method.key.name,
          node: method.value,
          scope,
        };
      }
    }

    // Create a constructor function that builds instances
    const constructorFn = function (...args) {
      const instance = { _class: className };
      const proto = {};

      for (const [name, method] of Object.entries(classObj.methods)) {
        proto[name] = function (...mArgs) {
          const methodScope = createScope(method.scope, name);
          defineVar('this', instance, methodScope);
          for (let i = 0; i < method.node.params.length; i++) {
            defineVar(method.node.params[i].name, mArgs[i], methodScope);
          }
          methodScope._isFuncScope = true;
          callStack.push({ name, scope: methodScope });
          const prevLen = callStack.length;
          execNode(method.node.body, methodScope, true);
          if (callStack.length >= prevLen) callStack.pop();
          return methodScope._returnValue;
        };
      }

      Object.setPrototypeOf(instance, proto);

      if (classObj.constructor) {
        const consScope = createScope(classObj.constructor.scope, className);
        defineVar('this', instance, consScope);
        if (classObj.superClass) {
          defineVar('__super__', { parentConstructor: classObj.superClass }, consScope);
        }
        for (let i = 0; i < classObj.constructor.node.params.length; i++) {
          convertParam(classObj.constructor.node.params[i], args[i], consScope);
        }
        consScope._isFuncScope = true;
        callStack.push({ name: className, scope: consScope });
        const prevLen = callStack.length;
        execNode(classObj.constructor.node.body, consScope, true);
        if (callStack.length >= prevLen) callStack.pop();
      }

      return instance;
    };

    // Set up static methods
    for (const [name, method] of Object.entries(classObj.staticMethods)) {
      constructorFn[name] = function (...mArgs) {
        const methodScope = createScope(method.scope, name);
        for (let i = 0; i < method.node.params.length; i++) {
          defineVar(method.node.params[i].name, mArgs[i], methodScope);
        }
        methodScope._isFuncScope = true;
        callStack.push({ name, scope: methodScope });
        const prevLen = callStack.length;
        execNode(method.node.body, methodScope, true);
        if (callStack.length >= prevLen) callStack.pop();
        return methodScope._returnValue;
      };
    }

    // Set up prototype for instanceof checks
    constructorFn.prototype = Object.create(superClass ? superClass.prototype : Object.prototype);
    constructorFn.prototype.constructor = constructorFn;

    defineVar(className, constructorFn, scope);
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
        const val = getVarRaw(node.name, scope);
        if (val === NOT_FOUND) {
          let hint = '';
          if (DOM_GLOBALS.has(node.name)) {
            hint = `\nRuntime: Non-DOM JavaScript environment.\nExplanation: '${node.name}' is a Browser DOM API and is unavailable in this execution environment.`;
          }
          throw new ExecutionError(
            `'${node.name}' is not defined${hint}`,
            node.loc?.start.line,
            node.loc?.start.column
          );
        }
        return val === NOT_FOUND ? undefined : val;
      }

      case 'ThisExpression': {
        const thisVal = getVar('this', scope);
        if (thisVal === undefined) {
          throw new ExecutionError(
            "TypeError: 'this' is not defined in this context",
            node.loc?.start.line,
            node.loc?.start.column
          );
        }
        return thisVal;
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
        } else if (left.type === 'MemberExpression') {
          const obj = evalExpr(left.object, scope);
          const prop = left.computed ? evalExpr(left.property, scope) : left.property.name;
          if (node.operator === '=') {
            obj[prop] = val;
          } else {
            const cur = obj[prop];
            let newVal;
            switch (node.operator) {
              case '+=': newVal = cur + val; break;
              case '-=': newVal = cur - val; break;
              case '*=': newVal = cur * val; break;
              case '/=': newVal = cur / val; break;
              case '%=': newVal = cur % val; break;
              default: newVal = val;
            }
            obj[prop] = newVal;
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
          case 'in':
            if (right == null) {
              throw new ExecutionError(
                `TypeError: Cannot use 'in' operator to search for '${left}' in ${right}`,
                node.loc?.start.line
              );
            }
            return left in Object(right);
          case 'instanceof':
            if (typeof right !== 'function') {
              throw new ExecutionError(
                `TypeError: Right-hand side of 'instanceof' is not callable`,
                node.loc?.start.line
              );
            }
            return left instanceof right;
          default: return undefined;
        }
      }

      case 'UnaryExpression': {
        if (node.operator === 'typeof') {
          try {
            const argVal = evalExpr(node.argument, scope);
            return typeof argVal;
          } catch (e) {
            if (e instanceof ExecutionError && e.message.includes('is not defined')) {
              return 'undefined';
            }
            throw e;
          }
        }
        const arg = evalExpr(node.argument, scope);
        switch (node.operator) {
          case '-': return -arg;
          case '+': return +arg;
          case '!': return !arg;
          case '~': return ~arg;
          case 'delete':
            if (node.argument.type === 'MemberExpression') {
              const obj = evalExpr(node.argument.object, scope);
              const prop = node.argument.computed
                ? evalExpr(node.argument.property, scope)
                : node.argument.property.name;
              return delete obj[prop];
            }
            return true;
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
        let memberObj = undefined;
        let thisVal = undefined;

        if (callee.type === 'Super') {
          const superInfo = getVar('__super__', scope);
          if (!superInfo || !superInfo.parentConstructor) {
            throw new ExecutionError(
              "ReferenceError: 'super' is not available in this context",
              node.loc?.start.line
            );
          }
          const args = evalArgs(node.arguments, scope);
          const instance = getVar('this', scope);
          if (instance) {
            Object.assign(instance, superInfo.parentConstructor(...args));
          } else {
            superInfo.parentConstructor(...args);
          }
          return undefined;
        }

        if (callee.type === 'MemberExpression') {
          const propName = callee.computed
            ? evalExpr(callee.property, scope)
            : callee.property.name;

          if (!callee.computed) {
            // Intercept console methods — accumulate output
            const objName = callee.object.type === 'Identifier' ? callee.object.name : null;
          if (objName === 'console') {
            const args = evalArgs(node.arguments, scope);
              const line = node.loc?.start.line || 0;
              if (['log', 'warn', 'error', 'info', 'debug'].includes(propName)) {
                const outputStr = args.map(formatValue).join(' ');
                accumulatedOutput = [...accumulatedOutput, outputStr];
                record(line, { output: accumulatedOutput }, scope);
              }
              return undefined;
            }
          }

          // Evaluate object FIRST to capture `this`
          memberObj = evalExpr(callee.object, scope);
          thisVal = memberObj;

          if (memberObj === undefined || memberObj === null) {
            throw new ExecutionError(
              `TypeError: Cannot read properties of ${memberObj === null ? 'null' : 'undefined'} (reading '${propName}')`,
              node.loc?.start.line
            );
          }

          funcName = `${callee.object.type === 'Identifier' ? callee.object.name : '??'}.${propName}`;
          funcObj = memberObj?.[propName];
        } else if (callee.type === 'Identifier') {
          funcName = callee.name;
          funcObj = getVar(funcName, scope);
        } else if (callee.type === 'CallExpression') {
          // IIFE: (function(){})() or (()=>{})()
          funcObj = evalExpr(callee, scope);
          funcName = '(IIFE)';
        } else {
          funcObj = evalExpr(callee, scope);
          funcName = '(expression)';
        }

        // --- Built-in type method interception ---
        if (callee.type === 'MemberExpression' && memberObj !== undefined && memberObj !== null) {
          const propName = callee.computed
            ? evalExpr(callee.property, scope)
            : callee.property.name;

          // Array methods
          if (Array.isArray(memberObj) && builtins.ARRAY_METHODS[propName]) {
            const args = evalArgs(node.arguments, scope);
            const nativeArgs = args.map((arg) => convertCallback(arg));
            try {
              return builtins.ARRAY_METHODS[propName].apply(memberObj, nativeArgs);
            } catch (e) {
              throw new ExecutionError(
                `TypeError: ${e.message}`,
                node.loc?.start.line
              );
            }
          }
          // String methods
          if (typeof memberObj === 'string' && builtins.STRING_METHODS[propName]) {
            const args = evalArgs(node.arguments, scope);
            const nativeArgs = args.map((arg) => convertCallback(arg));
            try {
              return builtins.STRING_METHODS[propName].apply(memberObj, nativeArgs);
            } catch (e) {
              throw new ExecutionError(
                `TypeError: ${e.message}`,
                node.loc?.start.line
              );
            }
          }
        }

        // Handle user-defined functions
        if (funcObj && funcObj.type === 'function') {
          if (callStack.length >= MAX_RECURSION) {
            throw new ExecutionError(
              `Maximum recursion depth (${MAX_RECURSION}) exceeded`,
              node.loc?.start.line
            );
          }

          const args = evalArgs(node.arguments, scope);
          const funcScope = createScope(funcObj.scope, funcName);

          // Set `this` — for method calls, this is the object; for plain calls, this is undefined
          if (thisVal !== undefined) {
            defineVar('this', thisVal, funcScope);
          }

          // Support destructured params (ArrayPattern, ObjectPattern, etc.)
          const params = funcObj.node.params || [];
          for (let i = 0; i < params.length; i++) {
            convertParam(params[i], args[i], funcScope);
          }

          funcScope._isFuncScope = true;
          callStack.push({ name: funcName, scope: funcScope });

          // Record function call info
          const paramNames = params
            .filter((p) => p.type === 'Identifier')
            .map((p) => p.name);
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

        // Handle built-in/native functions
        if (typeof funcObj === 'function') {
          const args = evalArgs(node.arguments, scope);
          const nativeArgs = args.map((arg) => convertCallback(arg));
          if (callee.type === 'MemberExpression' && memberObj !== undefined && memberObj !== null) {
            return funcObj.call(memberObj, ...nativeArgs);
          }
          return funcObj(...nativeArgs);
        }

        if (funcObj !== undefined && funcObj !== null && typeof funcObj !== 'function') {
          throw new ExecutionError(
            `TypeError: ${funcName} is not a function (typeof: ${typeof funcObj})`,
            node.loc?.start.line
          );
        }

        throw new ExecutionError(
          `ReferenceError: ${funcName} is not a function`,
          node.loc?.start.line
        );
      }

      case 'ArrayExpression': {
        const result = [];
        for (const el of node.elements) {
          if (!el) {
            result.push(null);
          } else if (el.type === 'SpreadElement') {
            const spreadVal = evalExpr(el.argument, scope);
            if (Array.isArray(spreadVal)) {
              result.push(...spreadVal);
            } else if (spreadVal && typeof spreadVal[Symbol.iterator] === 'function') {
              result.push(...spreadVal);
            } else {
              result.push(spreadVal);
            }
          } else {
            result.push(evalExpr(el, scope));
          }
        }
        return result;
      }

      case 'ChainExpression': {
        return evalExpr(node.expression, scope);
      }

      case 'MemberExpression': {
        const obj = evalExpr(node.object, scope);
        if (obj === undefined || obj === null) {
          if (node.optional) return undefined;
          const objName = node.object.type === 'Identifier' ? node.object.name : 'value';
          throw new ExecutionError(
            `TypeError: Cannot read properties of ${obj === null ? 'null' : 'undefined'} (reading '${node.computed ? evalExpr(node.property, scope) : node.property.name}'), object: ${objName}`,
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

      case 'FunctionExpression': {
        return {
          type: 'function',
          name: node.id ? node.id.name : 'anonymous',
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

      case 'AwaitExpression': {
        const innerVal = evalExpr(node.argument, scope);
        if (innerVal && typeof innerVal === 'object' && typeof innerVal.then === 'function') {
          let resolved = undefined;
          innerVal.then((v) => { resolved = v; }, () => {});
          return resolved;
        }
        return innerVal;
      }

      case 'NewExpression': {
        let constructorFunc = null;
        let constructorName = '';
        if (node.callee.type === 'Identifier') {
          constructorName = node.callee.name;
          constructorFunc = getVar(constructorName, scope);
        } else if (node.callee.type === 'MemberExpression') {
          const obj = evalExpr(node.callee.object, scope);
          const prop = node.callee.computed
            ? evalExpr(node.callee.property, scope)
            : node.callee.property.name;
          constructorName = `${constructorName || obj}.${prop}`;
          constructorFunc = obj?.[prop];
        } else {
          constructorFunc = evalExpr(node.callee, scope);
        }

        if (typeof constructorFunc !== 'function') {
          throw new ExecutionError(
            `'${constructorName}' is not a constructor`,
            node.loc?.start.line
          );
        }

        const args = evalArgs(node.arguments, scope);
        const nativeArgs = args.map((arg) => convertCallback(arg));

        // For user-defined class constructors, create a plain object and run the constructor
        if (constructorFunc.type === 'function') {
          const instance = {};
          const funcScope = createScope(constructorFunc.scope, constructorName);
          defineVar('this', instance, funcScope);
          for (let i = 0; i < constructorFunc.node.params.length; i++) {
            defineVar(constructorFunc.node.params[i].name, nativeArgs[i], funcScope);
          }
          funcScope._isFuncScope = true;
          callStack.push({ name: constructorName, scope: funcScope });
          execNode(constructorFunc.node.body, funcScope, true);
          if (callStack.length > 1) callStack.pop();
          return instance;
        }

        // For native constructors (Date, Map, Set, Promise, RegExp, Error, etc.)
        return new constructorFunc(...nativeArgs);
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

  function getVarRaw(name, scope) {
    if (name in scope._vars) return scope._vars[name];
    if (scope._parent) return getVarRaw(name, scope._parent);
    return NOT_FOUND;
  }

  function getVar(name, scope) {
    const val = getVarRaw(name, scope);
    if (val === NOT_FOUND) return undefined;
    return val;
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
