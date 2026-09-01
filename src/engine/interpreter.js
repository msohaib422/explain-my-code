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
  callStack.push({ name: 'global', scope: env, args: [] });

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

  if (typeof window !== 'undefined') {
    env._vars['window'] = window;
    env._vars['document'] = document;
    env._vars['alert'] = window.alert;
    env._vars['prompt'] = window.prompt;
    env._vars['confirm'] = window.confirm;
  }

  // Controlled setTimeout / clearTimeout — execute synchronously for educational interpreter
  env._vars['setTimeout'] = (fn, ms) => {
    if (typeof fn === 'function') fn();
    return 0;
  };
  env._vars['setInterval'] = (fn, ms) => {
    if (typeof fn === 'function') fn();
    return 0;
  };
  env._vars['clearTimeout'] = () => {};
  env._vars['clearInterval'] = () => {};

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
        callStack.push({ name: funcObj.name || 'callback', scope: cbScope, args: cbArgs });
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
    const scopeToRecord = recordScope || env;
    collectVisibleVars(scopeToRecord, vars);

    steps.push({
      step: stepCount++,
      line: line || 0,
      variables: { ...vars },
      callStack: callStack.map((f) => ({ name: f.name, args: f.args || [] })),
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
        callStack: callStack.map((f) => ({ name: f.name, args: f.args || [] })),
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
      isGenerator: node.generator || false,
      isAsync: node.async || false,
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

      // Use the prototype which has methods already set up (on the prototype chain)
      Object.setPrototypeOf(instance, constructorFn.prototype);

      if (classObj.constructor) {
        const consScope = createScope(classObj.constructor.scope, className);
        defineVar('this', instance, consScope);

        // Provide super() for the constructor
        if (superClass) {
          defineVar('super', { parentConstructor: superClass }, consScope);
        }

        for (let i = 0; i < classObj.constructor.node.params.length; i++) {
          convertParam(classObj.constructor.node.params[i], args[i], consScope);
        }
        consScope._isFuncScope = true;
        callStack.push({ name: className, scope: consScope, args });
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
        callStack.push({ name, scope: methodScope, args: mArgs });
        const prevLen = callStack.length;
        execNode(method.node.body, methodScope, true);
        if (callStack.length >= prevLen) callStack.pop();
        return methodScope._returnValue;
      };
    }

    // Set up prototype with methods on the PROTOTYPE CHAIN (not per-instance)
    if (superClass) {
      constructorFn.prototype = Object.create(superClass.prototype);
    } else {
      constructorFn.prototype = Object.create(Object.prototype);
    }
    constructorFn.prototype.constructor = constructorFn;

    // Add methods to the prototype so they're shared across instances
    for (const [name, method] of Object.entries(classObj.methods)) {
      constructorFn.prototype[name] = function (...mArgs) {
        const methodScope = createScope(method.scope, name);
        defineVar('this', this, methodScope);
        for (let i = 0; i < method.node.params.length; i++) {
          defineVar(method.node.params[i].name, mArgs[i], methodScope);
        }
        methodScope._isFuncScope = true;

        // If this method calls super.method(), we need the parent method
        if (superClass && superClass.prototype && typeof superClass.prototype[name] === 'function') {
          const superObj = {
            [name]: superClass.prototype[name],
          };
          defineVar('super', superObj, methodScope);
        }

        callStack.push({ name, scope: methodScope, args: mArgs });
        const prevLen = callStack.length;
        execNode(method.node.body, methodScope, true);
        if (callStack.length >= prevLen) callStack.pop();
        return methodScope._returnValue;
      };
    }

    // Store class metadata for reference
    constructorFn.__classObj__ = classObj;

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

    let s = scope;
    while (s) {
      if (s._isFuncScope) {
        s._returnValue = value;
        return '__return__';
      }
      s = s._parent;
    }
    scope._returnValue = value;
    return '__return__';
  }

  // ---- Generator helpers ----
  // Converts the generator body into a flat instruction list (like bytecode).
  // Each .next() call advances through instructions until a yield is hit.

  function createGeneratorObject(funcObj, args, callerScope) {
    const genScope = createScope(funcObj.scope, funcObj.name || 'generator');
    for (let i = 0; i < funcObj.node.params.length; i++) {
      convertParam(funcObj.node.params[i], args[i], genScope);
    }
    genScope._isFuncScope = true;

    const bodyStmts = funcObj.node.body.type === 'BlockStatement'
      ? funcObj.node.body.body
      : [funcObj.node.body];

    // Flatten the generator body into linear instructions
    const instructions = [];
    function emit(stmt) {
      if (!stmt) return;
      switch (stmt.type) {
        case 'VariableDeclaration':
          instructions.push({ type: 'exec', stmt });
          break;
        case 'ExpressionStatement':
          instructions.push({ type: 'exec', stmt });
          break;
        case 'ReturnStatement':
          instructions.push({ type: 'exec', stmt });
          break;
        case 'BreakStatement':
          instructions.push({ type: 'break' });
          break;
        case 'ContinueStatement':
          instructions.push({ type: 'continue' });
          break;
        case 'BlockStatement':
          for (const inner of stmt.body) emit(inner);
          break;
        case 'IfStatement': {
          instructions.push({ type: 'if-test', test: stmt.test });
          const jumpIdx = instructions.length;
          instructions.push({ type: 'placeholder' });
          emit(stmt.consequent);
          if (stmt.alternate) {
            const endJump = instructions.length;
            instructions.push({ type: 'placeholder' });
            instructions[jumpIdx] = { type: 'if-false-jump', target: instructions.length };
            emit(stmt.alternate);
            instructions[endJump] = { type: 'jump', target: instructions.length };
          } else {
            instructions[jumpIdx] = { type: 'if-false-jump', target: instructions.length };
          }
          break;
        }
        case 'WhileStatement': {
          const testPos = instructions.length;
          const falseJumpPos = testPos + 1;
          instructions.push({ type: 'loop-test', test: stmt.test, line: stmt.loc?.start.line || 0 });
          instructions.push({ type: 'placeholder' }); // falseJump slot
          emit(stmt.body);
          instructions.push({ type: 'jump', target: testPos });
          instructions[falseJumpPos] = { type: 'if-false-jump', target: instructions.length };
          break;
        }
        case 'ForStatement': {
          if (stmt.init) {
            if (stmt.init.type === 'VariableDeclaration') {
              instructions.push({ type: 'for-init', init: stmt.init });
            } else {
              instructions.push({ type: 'for-init-expr', init: stmt.init });
            }
          }
          const testPos = instructions.length;
          const falseJumpPos = testPos + 1;
          instructions.push({ type: 'loop-test', test: stmt.test, line: stmt.loc?.start.line || 0 });
          instructions.push({ type: 'placeholder' });
          emit(stmt.body);
          if (stmt.update) {
            instructions.push({ type: 'for-update', update: stmt.update });
          }
          instructions.push({ type: 'jump', target: testPos });
          instructions[falseJumpPos] = { type: 'if-false-jump', target: instructions.length };
          break;
        }
        case 'ForOfStatement': {
          instructions.push({ type: 'for-of-init', stmt });
          const loopStart = instructions.length;
          instructions.push({ type: 'for-of-next' });
          const falseJumpPos = instructions.length;
          instructions.push({ type: 'placeholder' });
          emit(stmt.body);
          instructions.push({ type: 'jump', target: loopStart });
          instructions[falseJumpPos] = { type: 'if-false-jump', target: instructions.length };
          break;
        }
        case 'TryStatement': {
          instructions.push({ type: 'try', stmt });
          break;
        }
        default:
          instructions.push({ type: 'exec', stmt });
          break;
      }
    }
    for (const stmt of bodyStmts) emit(stmt);
    instructions.push({ type: 'done' });

    let ip = 0;
    let done = false;
    let yieldResult = undefined;

    // for-of state
    let _forOfIter = null;
    let _forOfScope = null;
    let _forOfVarName = null;

    const generator = {
      _type: 'generator',
      next(val) {
        if (done) return { value: undefined, done: true };
        try {
          yieldResult = undefined;
          while (ip < instructions.length && !yieldResult) {
            const instr = instructions[ip];
            switch (instr.type) {
              case 'exec': {
                const stmt = instr.stmt;
                if (stmt.type === 'VariableDeclaration') {
                  for (const decl of stmt.declarations) {
                    const value = decl.init ? evalExpr(decl.init, genScope) : undefined;
                    if (decl.id.type === 'Identifier') {
                      defineVar(decl.id.name, value, genScope);
                    } else if (decl.id.type === 'ArrayPattern') {
                      execArrayPattern(decl.id.elements, value, genScope);
                    } else if (decl.id.type === 'ObjectPattern') {
                      execObjectPattern(decl.id.properties, value, genScope);
                    }
                  }
                  record(stmt.loc?.start.line || 0, {}, genScope);
                } else if (stmt.type === 'ExpressionStatement') {
                  const result = evalExpr(stmt.expression, genScope);
                  if (result && typeof result === 'object' && result.__yield__) {
                    ip++;
                    yieldResult = { value: result.__yield__, done: false };
                    break;
                  }
                } else if (stmt.type === 'ReturnStatement') {
                  const value = stmt.argument ? evalExpr(stmt.argument, genScope) : undefined;
                  genScope._returnValue = value;
                  record(stmt.loc?.start.line || 0, { returnValue: value }, genScope);
                  done = true;
                  return { value, done: true };
                } else {
                  execNode(stmt, genScope);
                }
                ip++;
                break;
              }
              case 'loop-test': {
                const testVal = evalExpr(instr.test, genScope);
                record(instr.line || 0, { loopInfo: { iteration: 1, condition: testVal } }, genScope);
                if (!testVal) {
                  // Jump past the loop body to the if-false-jump
                  ip = ip + 1; // skip to the if-false-jump instruction
                } else {
                  ip = ip + 2; // skip both loop-test and if-false-jump placeholder
                }
                break;
              }
              case 'if-false-jump': {
                ip = instr.target;
                break;
              }
              case 'jump': {
                ip = instr.target;
                break;
              }
              case 'for-init': {
                const init = instr.init;
                for (const decl of init.declarations) {
                  defineVar(decl.id.name, undefined, genScope);
                  const val = decl.init ? evalExpr(decl.init, genScope) : undefined;
                  setVar(decl.id.name, val, genScope);
                }
                ip++;
                break;
              }
              case 'for-init-expr': {
                evalExpr(instr.init, genScope);
                ip++;
                break;
              }
              case 'for-update': {
                evalExpr(instr.update, genScope);
                ip++;
                break;
              }
              case 'for-of-init': {
                const stmt = instr.stmt;
                const iterable = evalExpr(stmt.right, genScope);
                _forOfIter = iterable ? iterable[Symbol.iterator]() : null;
                _forOfVarName = null;
                if (stmt.left.type === 'VariableDeclaration') {
                  _forOfVarName = stmt.left.declarations[0].id.name;
                }
                ip++;
                break;
              }
              case 'for-of-next': {
                if (!_forOfIter) {
                  // Skip to end of for-of
                  for (let j = ip + 1; j < instructions.length; j++) {
                    if (instructions[j].type === 'if-false-jump') {
                      ip = instructions[j].target;
                      break;
                    }
                  }
                  break;
                }
                const next = _forOfIter.next();
                if (next.done) {
                  for (let j = ip + 1; j < instructions.length; j++) {
                    if (instructions[j].type === 'if-false-jump') {
                      ip = instructions[j].target;
                      break;
                    }
                  }
                } else {
                  if (_forOfVarName) {
                    defineVar(_forOfVarName, next.value, genScope);
                  }
                  ip++;
                }
                break;
              }
              case 'try': {
                try {
                  execNode(instr.stmt.block, genScope);
                } catch (e) {
                  if (instr.stmt.handler) {
                    const catchScope = createScope(genScope, 'catch');
                    if (instr.stmt.handler.param) {
                      defineVar(instr.stmt.handler.param.name, e, catchScope);
                    }
                    execNode(instr.stmt.handler.body, catchScope);
                  }
                }
                if (instr.stmt.finalizer) {
                  execNode(instr.stmt.finalizer, genScope);
                }
                ip++;
                break;
              }
              case 'break': {
                done = true;
                return { value: undefined, done: true };
              }
              case 'continue': {
                done = true;
                return { value: undefined, done: true };
              }
              case 'done': {
                done = true;
                return { value: undefined, done: true };
              }
              default:
                ip++;
                break;
            }
          }
          if (yieldResult) return yieldResult;
          done = true;
          return { value: undefined, done: true };
        } catch (e) {
          done = true;
          if (e instanceof ExecutionError) {
            error = { message: e.message, line: e.line || 0 };
          } else {
            error = { message: e.message || 'Generator error', line: 0 };
          }
          return { value: undefined, done: true };
        }
      },
      return(val) {
        done = true;
        return { value: val, done: true };
      },
      throw(err) {
        done = true;
        throw err;
      },
      [Symbol.iterator]() {
        return this;
      },
    };

    return generator;
  }

  // ---- Promise helpers ----

  function createInterpreterPromise(executorFn) {
    const promise = {
      _type: 'promise',
      _state: 'pending',
      _value: undefined,
      _reason: undefined,
      _thenCallbacks: [],
      _catchCallbacks: [],
      _finallyCallbacks: [],

      then(onFulfilled, onRejected) {
        const child = createInterpreterPromise(() => {});
        child._parent = this;

        const fulfill = (val) => {
          try {
            if (typeof onFulfilled === 'function') {
              const result = onFulfilled(val);
              if (result && typeof result === 'object' && result._type === 'promise') {
                result.then(
                  (v) => { child._resolve(v); },
                  (r) => { child._reject(r); }
                );
              } else {
                child._resolve(result);
              }
            } else {
              child._resolve(val);
            }
          } catch (e) {
            child._reject(e);
          }
        };

        const reject = (reason) => {
          try {
            if (typeof onRejected === 'function') {
              const result = onRejected(reason);
              if (result && typeof result === 'object' && result._type === 'promise') {
                result.then(
                  (v) => { child._resolve(v); },
                  (r) => { child._reject(r); }
                );
              } else {
                child._resolve(result);
              }
            } else {
              child._reject(reason);
            }
          } catch (e) {
            child._reject(e);
          }
        };

        if (this._state === 'fulfilled') {
          fulfill(this._value);
        } else if (this._state === 'rejected') {
          reject(this._reason);
        } else {
          this._thenCallbacks.push({ fulfill, reject });
        }

        return child;
      },

      catch(onRejected) {
        return this.then(undefined, onRejected);
      },

      finally(onFinally) {
        return this.then(
          (val) => {
            if (typeof onFinally === 'function') onFinally();
            return val;
          },
          (reason) => {
            if (typeof onFinally === 'function') onFinally();
            throw reason;
          }
        );
      },

      _resolve(value) {
        if (this._state !== 'pending') return;

        // Resolve thenables
        if (value && typeof value === 'object' && typeof value.then === 'function') {
          try {
            value.then(
              (v) => this._resolve(v),
              (r) => this._reject(r)
            );
          } catch (e) {
            this._reject(e);
          }
          return;
        }

        this._state = 'fulfilled';
        this._value = value;
        for (const cb of this._thenCallbacks) {
          cb.fulfill(value);
        }
        this._thenCallbacks = [];
      },

      _reject(reason) {
        if (this._state !== 'pending') return;
        this._state = 'rejected';
        this._reason = reason;
        for (const cb of this._thenCallbacks) {
          cb.reject(reason);
        }
        this._thenCallbacks = [];
      },
    };

    // Execute the executor
    try {
      executorFn(
        (value) => promise._resolve(value),
        (reason) => promise._reject(reason)
      );
    } catch (e) {
      promise._reject(e);
    }

    return promise;
  }

  function createInterpreterPromiseResolve(value) {
    if (value && typeof value === 'object' && value._type === 'promise') {
      return value;
    }
    const p = createInterpreterPromise(() => {});
    p._state = 'fulfilled';
    p._value = value;
    return p;
  }

  function createInterpreterPromiseReject(reason) {
    const p = createInterpreterPromise(() => {});
    p._state = 'rejected';
    p._reason = reason;
    return p;
  }

  function createInterpreterPromiseAll(iterable) {
    return createInterpreterPromise((resolve, reject) => {
      const values = [];
      let remaining = 0;
      let resolved = false;

      const items = Array.isArray(iterable) ? iterable : Array.from(iterable);
      if (items.length === 0) {
        resolve([]);
        return;
      }

      remaining = items.length;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && typeof item === 'object' && item._type === 'promise') {
          item.then(
            (val) => {
              values[i] = val;
              remaining--;
              if (remaining === 0 && !resolved) {
                resolved = true;
                resolve(values);
              }
            },
            (reason) => {
              if (!resolved) {
                resolved = true;
                reject(reason);
              }
            }
          );
        } else {
          values[i] = item;
          remaining--;
          if (remaining === 0 && !resolved) {
            resolved = true;
            resolve(values);
          }
        }
      }
    });
  }

  function createInterpreterPromiseRace(iterable) {
    return createInterpreterPromise((resolve, reject) => {
      let settled = false;
      const items = Array.isArray(iterable) ? iterable : Array.from(iterable);
      for (const item of items) {
        if (item && typeof item === 'object' && item._type === 'promise') {
          item.then(
            (val) => { if (!settled) { settled = true; resolve(val); } },
            (reason) => { if (!settled) { settled = true; reject(reason); } }
          );
        } else {
          if (!settled) { settled = true; resolve(item); }
        }
      }
    });
  }

  function createInterpreterPromiseAny(iterable) {
    return createInterpreterPromise((resolve, reject) => {
      let settled = false;
      const errors = [];
      let remaining = 0;
      const items = Array.isArray(iterable) ? iterable : Array.from(iterable);
      if (items.length === 0) {
        reject(new AggregateError([], 'All promises were rejected'));
        return;
      }
      remaining = items.length;
      for (const item of items) {
        if (item && typeof item === 'object' && item._type === 'promise') {
          item.then(
            (val) => { if (!settled) { settled = true; resolve(val); } },
            (reason) => {
              errors.push(reason);
              remaining--;
              if (remaining === 0 && !settled) {
                settled = true;
                reject(new AggregateError(errors, 'All promises were rejected'));
              }
            }
          );
        } else {
          if (!settled) { settled = true; resolve(item); }
        }
      }
    });
  }

  function createInterpreterPromiseAllSettled(iterable) {
    return createInterpreterPromise((resolve) => {
      const results = [];
      let remaining = 0;
      let resolved = false;
      const items = Array.isArray(iterable) ? iterable : Array.from(iterable);
      if (items.length === 0) {
        resolve([]);
        return;
      }
      remaining = items.length;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && typeof item === 'object' && item._type === 'promise') {
          item.then(
            (val) => {
              results[i] = { status: 'fulfilled', value: val };
              remaining--;
              if (remaining === 0 && !resolved) {
                resolved = true;
                resolve(results);
              }
            },
            (reason) => {
              results[i] = { status: 'rejected', reason };
              remaining--;
              if (remaining === 0 && !resolved) {
                resolved = true;
                resolve(results);
              }
            }
          );
        } else {
          results[i] = { status: 'fulfilled', value: item };
          remaining--;
          if (remaining === 0 && !resolved) {
            resolved = true;
            resolve(results);
          }
        }
      }
    });
  }

  // ---- Async/Await support ----

  function callInterpreterFunction(funcObj, args, thisVal) {
    const funcScope = createScope(funcObj.scope, funcObj.name || 'anonymous');

    if (thisVal !== undefined) {
      defineVar('this', thisVal, funcScope);
    }

    const params = funcObj.node.params || [];
    for (let i = 0; i < params.length; i++) {
      convertParam(params[i], args[i], funcScope);
    }
    funcScope._isFuncScope = true;
    callStack.push({ name: funcObj.name || 'anonymous', scope: funcScope, args });

    const paramNames = params
      .filter((p) => p.type === 'Identifier')
      .map((p) => p.name);
    const paramValues = {};
    paramNames.forEach((n, i) => {
      paramValues[n] = args[i];
    });

    if (funcObj.node.body.type === 'BlockStatement') {
      execNode(funcObj.node.body, funcScope, true);
    } else {
      funcScope._returnValue = evalExpr(funcObj.node.body, funcScope);
    }

    if (callStack.length > 0) callStack.pop();
    return funcScope._returnValue;
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
          const superInfo = getVar('super', scope);
          if (!superInfo || !superInfo.parentConstructor) {
            throw new ExecutionError(
              "ReferenceError: 'super' is not available in this context",
              node.loc?.start.line
            );
          }
          const args = evalArgs(node.arguments, scope);
          const instance = getVar('this', scope);
          if (instance) {
            // Call parent constructor and copy properties
            const parentInstance = callInterpreterFunction(
              superInfo.parentConstructor.__classObj__?.constructor || (() => {}),
              args,
              instance
            );
            // Inherit properties from parent constructor
            if (parentInstance) {
              for (const key of Object.keys(parentInstance)) {
                if (key !== '_class' && !(key in instance)) {
                  instance[key] = parentInstance[key];
                }
              }
            }
          } else {
            callInterpreterFunction(
              superInfo.parentConstructor.__classObj__?.constructor || (() => {}),
              args
            );
          }
          return undefined;
        }

        if (callee.type === 'MemberExpression') {
          const propName = callee.computed
            ? evalExpr(callee.property, scope)
            : callee.property.name;

          if (!callee.computed) {
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

          // Check super.method() pattern
          if (callee.object.type === 'Identifier' && callee.object.name === 'super') {
            const superObj = getVar('super', scope);
            if (superObj && superObj[propName]) {
              funcObj = superObj[propName];
              memberObj = getVar('this', scope);
              thisVal = memberObj;
              funcName = `super.${propName}`;
            }
          }

          if (!funcObj) {
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
          }
        } else if (callee.type === 'Identifier') {
          funcName = callee.name;
          funcObj = getVar(funcName, scope);
        } else if (callee.type === 'CallExpression') {
          funcObj = evalExpr(callee, scope);
          funcName = '(IIFE)';
        } else {
          funcObj = evalExpr(callee, scope);
          funcName = '(expression)';
        }

        // Built-in type method interception
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

          // Object methods
          if (memberObj === Object && builtins.OBJECT_METHODS[propName]) {
            const args = evalArgs(node.arguments, scope);
            const nativeArgs = args.map((arg) => convertCallback(arg));
            try {
              return builtins.OBJECT_METHODS[propName](...nativeArgs);
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

          // Handle generator functions
          if (funcObj.isGenerator) {
            return createGeneratorObject(funcObj, args, scope);
          }

          const funcScope = createScope(funcObj.scope, funcName);

          if (thisVal !== undefined) {
            defineVar('this', thisVal, funcScope);
          }

          const params = funcObj.node.params || [];
          for (let i = 0; i < params.length; i++) {
            convertParam(params[i], args[i], funcScope);
          }

          funcScope._isFuncScope = true;
          callStack.push({ name: funcName, scope: funcScope, args });

          const paramNames = params
            .filter((p) => p.type === 'Identifier')
            .map((p) => p.name);
          const paramValues = {};
          paramNames.forEach((n, i) => {
            paramValues[n] = args[i];
          });

          record(node.loc?.start.line || 0, {
            functionCall: { name: funcName, params: paramValues, args },
          }, funcScope);

          const prevLen = callStack.length;
          const result = execNode(funcObj.node.body, funcScope, true);

          if (result !== '__return__' && callStack.length >= prevLen) {
            callStack.pop();
          }

          // If async function, wrap result in a promise
          if (funcObj.isAsync) {
            return createInterpreterPromiseResolve(funcScope._returnValue);
          }

          return funcScope._returnValue;
        }

        // Handle native functions
        if (typeof funcObj === 'function') {
          const args = evalArgs(node.arguments, scope);
          const nativeArgs = args.map((arg) => convertCallback(arg));
          if (callee.type === 'MemberExpression' && memberObj !== undefined && memberObj !== null) {
            return funcObj.call(memberObj, ...nativeArgs);
          }
          return funcObj(...nativeArgs);
        }

        // Handle interpreter internal functions (Promise, etc.)
        if (funcObj && typeof funcObj === 'object' && funcObj._type === 'interpreter-function') {
          const args = evalArgs(node.arguments, scope);
          const nativeArgs = args.map((arg) => convertCallback(arg));
          if (callee.type === 'MemberExpression' && memberObj !== undefined && memberObj !== null) {
            return funcObj.fn.call(memberObj, ...nativeArgs);
          }
          return funcObj.fn(...nativeArgs);
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
          if (prop.type === 'SpreadElement') {
            const spreadVal = evalExpr(prop.argument, scope);
            if (spreadVal && typeof spreadVal === 'object') {
              Object.assign(obj, spreadVal);
            }
          } else {
            const key =
              prop.key.type === 'Identifier'
                ? prop.key.name
                : evalExpr(prop.key, scope);
            obj[key] = evalExpr(prop.value, scope);
          }
        }
        return obj;
      }

      case 'ArrowFunctionExpression': {
        return {
          type: 'function',
          name: 'arrow',
          node: { params: node.params, body: node.body },
          scope,
          isGenerator: false,
          isAsync: node.async || false,
        };
      }

      case 'FunctionExpression': {
        return {
          type: 'function',
          name: node.id ? node.id.name : 'anonymous',
          node: { params: node.params, body: node.body },
          scope,
          isGenerator: node.generator || false,
          isAsync: node.async || false,
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

        // If it's an interpreter promise, handle it properly
        if (innerVal && typeof innerVal === 'object' && innerVal._type === 'promise') {
          if (innerVal._state === 'fulfilled') return innerVal._value;
          if (innerVal._state === 'rejected') throw innerVal._reason;
          let resolved = undefined;
          innerVal.then((v) => { resolved = v; }, (r) => { throw r; });
          return resolved;
        }

        // If it's a native promise-like (thenable), handle it
        if (innerVal && typeof innerVal === 'object' && typeof innerVal.then === 'function') {
          let resolved = undefined;
          innerVal.then((v) => { resolved = v; }, () => {});
          return resolved;
        }

        return innerVal;
      }

      case 'YieldExpression': {
        const value = node.argument ? evalExpr(node.argument, scope) : undefined;
        return { __yield__: value };
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

        // For user-defined class constructors, call via the constructorFn
        if (constructorFunc.__classObj__) {
          return constructorFunc(...nativeArgs);
        }

        // For native constructors (Date, Map, Set, Promise, RegExp, Error, etc.)
        if (constructorName === 'Promise') {
          // Use our interpreter Promise
          const executor = nativeArgs[0];
          return createInterpreterPromise((resolve, reject) => {
            if (typeof executor === 'function') {
              try {
                executor(resolve, reject);
              } catch (e) {
                reject(e);
              }
            }
          });
        }

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
    let current = scope;
    while (current) {
      if (name in current._vars) {
        current._vars[name] = value;
        return;
      }
      current = current._parent;
    }
    scope._vars[name] = value;
  }

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
    if (scope._parent) collectVisibleVars(scope._parent, result);
    for (const [key, value] of Object.entries(scope._vars)) {
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
  if (typeof val === 'object' && val !== null && val._type === 'promise') return '[Promise]';
  if (typeof val === 'object' && val !== null && val._type === 'generator') return '[Generator]';
  if (typeof val === 'object' && Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
