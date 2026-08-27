export function createBuiltins(convertCallback) {

const ARRAY_METHODS = {
  map(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    const result = [];
    for (let i = 0; i < this.length; i++) {
      if (i in this) result.push(fn.call(thisArg, this[i], i, this));
      else result.push(undefined);
    }
    return result;
  },

  filter(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    const result = [];
    for (let i = 0; i < this.length; i++) {
      if (i in this && fn.call(thisArg, this[i], i, this)) result.push(this[i]);
    }
    return result;
  },

  reduce(fn, initialValue) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    const len = this.length;
    if (len === 0 && arguments.length < 2) throw new TypeError('Reduce of empty array with no initial value');
    let i = 0;
    let acc = arguments.length >= 2 ? initialValue : this[i++];
    for (; i < len; i++) {
      if (i in this) acc = fn(acc, this[i], i, this);
    }
    return acc;
  },

  reduceRight(fn, initialValue) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    const len = this.length;
    if (len === 0 && arguments.length < 2) throw new TypeError('Reduce of empty array with no initial value');
    let i = len - 1;
    let acc = arguments.length >= 2 ? initialValue : this[i--];
    for (; i >= 0; i--) {
      if (i in this) acc = fn(acc, this[i], i, this);
    }
    return acc;
  },

  forEach(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    for (let i = 0; i < this.length; i++) {
      if (i in this) fn.call(thisArg, this[i], i, this);
    }
  },

  find(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    for (let i = 0; i < this.length; i++) {
      if (i in this && fn.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  },

  findIndex(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    for (let i = 0; i < this.length; i++) {
      if (i in this && fn.call(thisArg, this[i], i, this)) return i;
    }
    return -1;
  },

  findLast(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    for (let i = this.length - 1; i >= 0; i--) {
      if (i in this && fn.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  },

  findLastIndex(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    for (let i = this.length - 1; i >= 0; i--) {
      if (i in this && fn.call(thisArg, this[i], i, this)) return i;
    }
    return -1;
  },

  some(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    for (let i = 0; i < this.length; i++) {
      if (i in this && fn.call(thisArg, this[i], i, this)) return true;
    }
    return false;
  },

  every(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    for (let i = 0; i < this.length; i++) {
      if (i in this && !fn.call(thisArg, this[i], i, this)) return false;
    }
    return true;
  },

  includes(value, fromIndex) {
    const len = this.length;
    let i = Math.max(0, fromIndex != null ? Math.trunc(fromIndex) : 0);
    for (; i < len; i++) {
      if (i in this && Object.is(this[i], value)) return true;
    }
    return false;
  },

  indexOf(value, fromIndex) {
    const len = this.length;
    let i = Math.max(0, fromIndex != null ? Math.trunc(fromIndex) : 0);
    for (; i < len; i++) {
      if (i in this && Object.is(this[i], value)) return i;
    }
    return -1;
  },

  lastIndexOf(value, fromIndex) {
    const len = this.length;
    let i = fromIndex != null ? Math.min(Math.trunc(fromIndex), len - 1) : len - 1;
    for (; i >= 0; i--) {
      if (i in this && Object.is(this[i], value)) return i;
    }
    return -1;
  },

  join(separator) {
    const sep = separator === undefined ? ',' : String(separator);
    let result = '';
    for (let i = 0; i < this.length; i++) {
      if (i > 0) result += sep;
      if (i in this) {
        const val = this[i];
        result += val === null || val === undefined ? '' : String(val);
      }
    }
    return result;
  },

  slice(start, end) {
    const len = this.length;
    let s = start == null ? 0 : Math.max(0, start < 0 ? len + start : Math.min(start, len));
    let e = end == null ? len : Math.max(0, end < 0 ? len + end : Math.min(end, len));
    const result = [];
    for (let i = s; i < e; i++) {
      result.push(this[i]);
    }
    return result;
  },

  splice(start, deleteCount) {
    const len = this.length;
    let s = start == null ? 0 : Math.max(0, start < 0 ? len + start : Math.min(start, len));
    let dc = deleteCount == null ? len - s : Math.max(0, Math.min(deleteCount, len - s));
    const items = Array.prototype.slice.call(arguments, 2);
    const removed = [];
    for (let i = s; i < s + dc; i++) {
      removed.push(this[i]);
    }
    const remaining = [];
    for (let i = 0; i < this.length; i++) {
      if (i < s || i >= s + dc) remaining.push(this[i]);
    }
    const result = [];
    for (let i = 0; i < s; i++) result.push(this[i]);
    for (let i = 0; i < items.length; i++) result.push(items[i]);
    for (let i = s + dc; i < this.length; i++) result.push(this[i]);
    for (let i = 0; i < result.length; i++) this[i] = result[i];
    this.length = result.length;
    return removed;
  },

  concat() {
    const result = Array.from(this);
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];
      if (Array.isArray(arg)) {
        for (let j = 0; j < arg.length; j++) result.push(arg[j]);
      } else {
        result.push(arg);
      }
    }
    return result;
  },

  flat(depth) {
    const d = depth === undefined ? 1 : Math.max(0, Math.trunc(depth));
    const result = [];
    const flatHelper = (arr, currentDepth) => {
      for (let i = 0; i < arr.length; i++) {
        if (i in arr) {
          if (Array.isArray(arr[i]) && currentDepth < d) {
            flatHelper(arr[i], currentDepth + 1);
          } else {
            result.push(arr[i]);
          }
        }
      }
    };
    flatHelper(this, 0);
    return result;
  },

  flatMap(fn, thisArg) {
    if (typeof fn !== 'function') throw new TypeError(`${this} is not a function`);
    const result = [];
    for (let i = 0; i < this.length; i++) {
      if (i in this) {
        const mapped = fn.call(thisArg, this[i], i, this);
        if (Array.isArray(mapped)) {
          for (let j = 0; j < mapped.length; j++) result.push(mapped[j]);
        } else {
          result.push(mapped);
        }
      }
    }
    return result;
  },

  reverse() {
    let left = 0;
    let right = this.length - 1;
    while (left < right) {
      const tmp = this[left];
      this[left] = this[right];
      this[right] = tmp;
      left++;
      right--;
    }
    return this;
  },

  sort(compareFn) {
    if (compareFn !== undefined && typeof compareFn !== 'function') {
      throw new TypeError(`${compareFn} is not a function`);
    }
    if (compareFn) {
      Array.prototype.sort.call(this, (a, b) => compareFn(a, b));
    } else {
      Array.prototype.sort.call(this);
    }
    return this;
  },

  fill(value, start, end) {
    const len = this.length;
    const s = start == null ? 0 : Math.max(0, start < 0 ? len + start : Math.min(start, len));
    const e = end == null ? len : Math.max(0, end < 0 ? len + end : Math.min(end, len));
    for (let i = s; i < e; i++) this[i] = value;
    return this;
  },

  at(index) {
    const len = this.length;
    const i = index < 0 ? len + index : index;
    return this[i];
  },

  keys() {
    const result = [];
    for (let i = 0; i < this.length; i++) result.push(i);
    return result[Symbol.iterator] ? result : result;
  },

  values() {
    const result = [];
    for (let i = 0; i < this.length; i++) result.push(this[i]);
    return result;
  },

  entries() {
    const result = [];
    for (let i = 0; i < this.length; i++) result.push([i, this[i]]);
    return result;
  },

  copyWithin(target, start, end) {
    const len = this.length;
    const t = target < 0 ? Math.max(len + target, 0) : Math.min(target, len);
    const s = start == null ? 0 : start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
    const e = end == null ? len : end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
    const count = Math.min(e - s, len - t);
    for (let i = 0; i < count; i++) {
      this[t + i] = this[s + i];
    }
    return this;
  },

  with(index, value) {
    const result = Array.from(this);
    const i = index < 0 ? result.length + index : index;
    result[i] = value;
    return result;
  },

  indexOf: Array.prototype.indexOf,
  includes: Array.prototype.includes,

  pop() {
    if (this.length === 0) return undefined;
    const last = this[this.length - 1];
    this.length--;
    return last;
  },

  push() {
    for (let i = 0; i < arguments.length; i++) {
      this[this.length] = arguments[i];
    }
    return this.length;
  },

  shift() {
    if (this.length === 0) return undefined;
    const first = this[0];
    for (let i = 1; i < this.length; i++) {
      this[i - 1] = this[i];
    }
    this.length--;
    return first;
  },

  unshift() {
    for (let i = this.length - 1; i >= 0; i--) {
      this[i + arguments.length] = this[i];
    }
    for (let i = 0; i < arguments.length; i++) {
      this[i] = arguments[i];
    }
    return this.length;
  },

  isArray: Array.isArray,
  from(arrayLike, mapFn, thisArg) {
    const result = [];
    const arr = arrayLike || [];
    for (let i = 0; i < arr.length; i++) {
      result.push(mapFn ? mapFn.call(thisArg, arr[i], i) : arr[i]);
    }
    return result;
  },
  of() {
    return Array.from(arguments);
  },
};


const STRING_METHODS = {
  trim() { return this.trim(); },
  trimStart() { return this.trimStart(); },
  trimEnd() { return this.trimEnd(); },
  toUpperCase() { return this.toUpperCase(); },
  toLowerCase() { return this.toLowerCase(); },
  charAt(index) { return this.charAt(index); },
  charCodeAt(index) { return this.charCodeAt(index); },
  codePointAt(index) { return this.codePointAt(index); },
  includes(searchStr, position) { return this.includes(searchStr, position); },
  startsWith(searchStr, position) { return this.startsWith(searchStr, position); },
  endsWith(searchStr, endPosition) { return this.endsWith(searchStr, endPosition); },
  indexOf(searchStr, position) { return this.indexOf(searchStr, position); },
  lastIndexOf(searchStr, position) { return this.lastIndexOf(searchStr, position); },
  slice(start, end) { return this.slice(start, end); },
  substring(start, end) { return this.substring(start, end); },
  split(separator, limit) {
    const sep = separator === undefined ? ',' : separator;
    const result = this.split(sep, limit);
    return result;
  },
  replace(searchValue, replaceValue) {
    if (searchValue instanceof RegExp) {
      return this.replace(searchValue, replaceValue);
    }
    return this.replace(searchValue, replaceValue);
  },
  replaceAll(searchValue, replaceValue) {
    if (typeof searchValue === 'string') {
      return this.split(searchValue).join(replaceValue);
    }
    return this.replaceAll(searchValue, replaceValue);
  },
  repeat(count) { return this.repeat(count); },
  padStart(targetLength, padString) { return this.padStart(targetLength, padString); },
  padEnd(targetLength, padString) { return this.padEnd(targetLength, padString); },
  normalize(form) { return this.normalize(form); },
  at(index) {
    const len = this.length;
    const i = index < 0 ? len + index : index;
    return this[i];
  },
  concat() {
    let result = this;
    for (let i = 0; i < arguments.length; i++) {
      result += arguments[i];
    }
    return result;
  },
  localeCompare(that) { return this.localeCompare(that); },
  match(regexp) { return this.match(regexp); },
  matchAll(regexp) { return this.matchAll(regexp); },
  search(regexp) { return this.search(regexp); },
  valueOf() { return this; },
  toString() { return this; },
  length: { get() { return this.length; } },
};


const OBJECT_METHODS = {
  keys(obj) {
    if (obj === null || obj === undefined) throw new TypeError(`Cannot convert undefined or null to object`);
    return Object.keys(obj);
  },
  values(obj) {
    if (obj === null || obj === undefined) throw new TypeError(`Cannot convert undefined or null to object`);
    return Object.values(obj);
  },
  entries(obj) {
    if (obj === null || obj === undefined) throw new TypeError(`Cannot convert undefined or null to object`);
    return Object.entries(obj);
  },
  assign(target) {
    if (target === null || target === undefined) throw new TypeError('Cannot convert undefined or null to object');
    const result = Object(target);
    for (let i = 1; i < arguments.length; i++) {
      const source = arguments[i];
      if (source !== null && source !== undefined) {
        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            result[key] = source[key];
          }
        }
      }
    }
    return result;
  },
  hasOwn(obj, prop) {
    if (obj === null || obj === undefined) throw new TypeError('Cannot convert undefined or null to object');
    return Object.prototype.hasOwnProperty.call(obj, prop);
  },
  is(value1, value2) { return Object.is(value1, value2); },
  freeze(obj) { return Object.freeze(obj); },
  seal(obj) { return Object.seal(obj); },
  fromEntries(iterable) {
    const result = {};
    for (const [key, value] of iterable) {
      result[key] = value;
    }
    return result;
  },
  create(proto, propertiesObject) {
    if (proto === null || typeof proto === 'object') {
      const result = Object.create(proto);
      if (propertiesObject) {
        Object.defineProperties(result, propertiesObject);
      }
      return result;
    }
    throw new TypeError('Object prototype may only be an Object or null');
  },
  defineProperty(obj, prop, descriptor) {
    Object.defineProperty(obj, prop, descriptor);
    return obj;
  },
  getOwnPropertyDescriptor(obj, prop) {
    return Object.getOwnPropertyDescriptor(obj, prop);
  },
  getPrototypeOf(obj) {
    return Object.getPrototypeOf(obj);
  },
  setPrototypeOf(obj, proto) {
    Object.setPrototypeOf(obj, proto);
    return obj;
  },
  isFrozen(obj) { return Object.isFrozen(obj); },
  isSealed(obj) { return Object.isSealed(obj); },
  isExtensible(obj) { return Object.isExtensible(obj); },
  preventExtensions(obj) { return Object.preventExtensions(obj); },
  propertyIsEnumerable(obj, prop) {
    return Object.prototype.propertyIsEnumerable.call(obj, prop);
  },
  toLocaleString(obj) { return obj.toLocaleString(); },
  valueOf(obj) { return Object.prototype.valueOf.call(obj); },
  toString(obj) { return Object.prototype.toString.call(obj); },
  groupBy(items, callback) {
    const result = {};
    for (const item of items) {
      const key = callback(item);
      if (!result[key]) result[key] = [];
      result[key].push(item);
    }
    return result;
  },
};


const MATH_METHODS = {
  abs(x) { return Math.abs(x); },
  ceil(x) { return Math.ceil(x); },
  floor(x) { return Math.floor(x); },
  round(x) { return Math.round(x); },
  trunc(x) { return Math.trunc(x); },
  sign(x) { return Math.sign(x); },
  max() { return Math.max.apply(null, arguments); },
  min() { return Math.min.apply(null, arguments); },
  pow(x, y) { return Math.pow(x, y); },
  sqrt(x) { return Math.sqrt(x); },
  cbrt(x) { return Math.cbrt(x); },
  exp(x) { return Math.exp(x); },
  log(x) { return Math.log(x); },
  log2(x) { return Math.log2(x); },
  log10(x) { return Math.log10(x); },
  sin(x) { return Math.sin(x); },
  cos(x) { return Math.cos(x); },
  tan(x) { return Math.tan(x); },
  asin(x) { return Math.asin(x); },
  acos(x) { return Math.acos(x); },
  atan(x) { return Math.atan(x); },
  atan2(y, x) { return Math.atan2(y, x); },
  random() { return Math.random(); },
  imul(x, y) { return Math.imul(x, y); },
  fround(x) { return Math.fround(x); },
  hypot() { return Math.hypot.apply(null, arguments); },
  clz32(x) { return Math.clz32(x); },
  E: Math.E,
  LN10: Math.LN10,
  LN2: Math.LN2,
  LOG10E: Math.LOG10E,
  LOG2E: Math.LOG2E,
  PI: Math.PI,
  SQRT1_2: Math.SQRT1_2,
  SQRT2: Math.SQRT2,
};


const NUMBER_METHODS = {
  isFinite(value) { return Number.isFinite(value); },
  isInteger(value) { return Number.isInteger(value); },
  isNaN(value) { return Number.isNaN(value); },
  isSafeInteger(value) { return Number.isSafeInteger(value); },
  parseFloat(string) { return Number.parseFloat(string); },
  parseInt(string, radix) { return Number.parseInt(string, radix); },
  NaN: Number.NaN,
  MAX_VALUE: Number.MAX_VALUE,
  MIN_VALUE: Number.MIN_VALUE,
  MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
  NEGATIVE_INFINITY: Number.NEGATIVE_INFINITY,
  POSITIVE_INFINITY: Number.POSITIVE_INFINITY,
};


const JSON_METHODS = {
  parse(text, reviver) {
    if (reviver) {
      return JSON.parse(text, (key, value) => {
        const result = reviver(key, value);
        return result !== undefined ? result : value;
      });
    }
    return JSON.parse(text);
  },
  stringify(value, replacer, space) {
    return JSON.stringify(value, replacer, space);
  },
};

const CONSOLE_METHODS = {
  log() {
    const args = Array.from(arguments).map(v => typeof v === 'string' ? v : JSON.stringify(v));
    return args.join(' ');
  },
  warn() { return CONSOLE_METHODS.log.apply(this, arguments); },
  error() { return CONSOLE_METHODS.log.apply(this, arguments); },
  info() { return CONSOLE_METHODS.log.apply(this, arguments); },
  debug() { return CONSOLE_METHODS.log.apply(this, arguments); },
  table(data, columns) {
    return JSON.stringify(data, null, 2);
  },
  dir(obj) { return JSON.stringify(obj, null, 2); },
  time() {},
  timeEnd() {},
  timeLog() {},
  clear() {},
  count() {},
  countReset() {},
  group() {},
  groupEnd() {},
  assert() {},
  trace() {},
  dirxml() {},
};


const ARRAY_STATIC = {
  isArray(x) { return Array.isArray(x); },
  from(arrayLike, mapFn, thisArg) {
    const result = [];
    const arr = arrayLike || [];
    for (let i = 0; i < arr.length; i++) {
      result.push(mapFn ? mapFn.call(thisArg, arr[i], i) : arr[i]);
    }
    return result;
  },
  of() { return Array.from(arguments); },
};


const PROMISE_METHODS = {
  resolve(value) { return Promise.resolve(value); },
  reject(reason) { return Promise.reject(reason); },
  all(iterable) { return Promise.all(iterable); },
  race(iterable) { return Promise.race(iterable); },
  any(iterable) { return Promise.any(iterable); },
  allSettled(iterable) { return Promise.allSettled(iterable); },
};


const REGEXP_METHODS = {
  escape(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },
};


const GLOBAL_EXCEPTIONS = {
  Error,
  TypeError,
  RangeError,
  SyntaxError,
  ReferenceError,
  URIError,
  EvalError,
};


return {
  ARRAY_METHODS,
  STRING_METHODS,
  OBJECT_METHODS,
  MATH_METHODS,
  NUMBER_METHODS,
  JSON_METHODS,
  CONSOLE_METHODS,
  ARRAY_STATIC,
  PROMISE_METHODS,
  REGEXP_METHODS,
  GLOBAL_EXCEPTIONS,

  ARRAY_STATIC_METHODS: {
    isArray: ARRAY_STATIC.isArray,
    from: ARRAY_STATIC.from,
    of: ARRAY_STATIC.of,
  },

  STRING_STATIC: {
    fromCharCode: String.fromCharCode,
    fromCodePoint: String.fromCodePoint,
    raw: String.raw,
  },

  getBuiltinMethod(obj, methodName) {
    if (Array.isArray(obj) && ARRAY_METHODS[methodName]) {
      return ARRAY_METHODS[methodName];
    }
    if (typeof obj === 'string' && STRING_METHODS[methodName]) {
      return STRING_METHODS[methodName];
    }
    return null;
  },
};
}
