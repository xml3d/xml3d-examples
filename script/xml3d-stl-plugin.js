(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var STLReader = require("stl-reader");
var assert = require("assert");

var STLFormatHandler = function () {
    XML3D.resource.FormatHandler.call(this);
};
XML3D.createClass(STLFormatHandler, XML3D.resource.FormatHandler);

STLFormatHandler.prototype.isFormatSupported = function (response) {
    if (response.headers.has("Content-Type")) {
        var ct = response.headers.get("Content-Type");
        if (ct.match(/vnd\.ms-pki.?stl/i) || ct.match(/application\/sla/i)) {
            return true;
        }
    }
    return !!response.url.match(/\.stl\W/i);
};

STLFormatHandler.prototype.getFormatData = function (response) {
    return response.arrayBuffer().then(function(buffer) {
        var body = new STLReader().read(buffer);
        assert(body);
        return createXflowNode(body.vertices, body.normals);
    });
};

STLFormatHandler.prototype.getAdapter = function(xflowNode, aspect, canvasId) {
    return new STLDataAdapter(xflowNode);
};

XML3D.resource.registerFormatHandler(new STLFormatHandler());

function createXflowNode(positions, normals) {
    assert(positions, "No positions found");
    assert(normals, "No normals found");
    assert(normals.length == positions.length, "Normals and position have the same size");

    var node = new Xflow.DataNode();

    var inputNode = new Xflow.InputNode();
    inputNode.data = new Xflow.BufferEntry(Xflow.constants.DATA_TYPE.FLOAT3, positions);
    inputNode.name = "position";
    node.appendChild(inputNode);

    inputNode = new Xflow.InputNode();
    inputNode.data = new Xflow.BufferEntry(Xflow.constants.DATA_TYPE.FLOAT3, normals);
    inputNode.name = "normal";
    node.appendChild(inputNode);
    return node;
}

/**
 * @implements IDataAdapter
 */
var STLDataAdapter = function (xflowNode) {
    this.xflowDataNode = xflowNode;
};

STLDataAdapter.prototype.getXflowNode = function () {
    return this.xflowDataNode;
};
},{"assert":2,"stl-reader":8}],2:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":10}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
/**
  DataStream reads scalars, arrays and structs of data from an ArrayBuffer.
  It's like a file-like DataView on steroids.

  @param {ArrayBuffer} arrayBuffer ArrayBuffer to read from.
  @param {?Number} byteOffset Offset from arrayBuffer beginning for the DataStream.
  @param {?Boolean} endianness DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN (the default).
  */
DataStream = function(arrayBuffer, byteOffset, endianness) {
  this._byteOffset = byteOffset || 0;
  if (arrayBuffer instanceof ArrayBuffer) {
    this.buffer = arrayBuffer;
  } else if (typeof arrayBuffer == "object") {
    this.dataView = arrayBuffer;
    if (byteOffset) {
      this._byteOffset += byteOffset;
    }
  } else {
    this.buffer = new ArrayBuffer(arrayBuffer || 1);
  }
  this.position = 0;
  this.endianness = endianness == null ? DataStream.LITTLE_ENDIAN : endianness;
};
DataStream.prototype = {};

/* Fix for Opera 12 not defining BYTES_PER_ELEMENT in typed array prototypes. */
if (Uint8Array.prototype.BYTES_PER_ELEMENT === undefined) {
    Uint8Array.prototype.BYTES_PER_ELEMENT = Uint8Array.BYTES_PER_ELEMENT; 
    Int8Array.prototype.BYTES_PER_ELEMENT = Int8Array.BYTES_PER_ELEMENT; 
    Uint8ClampedArray.prototype.BYTES_PER_ELEMENT = Uint8ClampedArray.BYTES_PER_ELEMENT; 
    Uint16Array.prototype.BYTES_PER_ELEMENT = Uint16Array.BYTES_PER_ELEMENT; 
    Int16Array.prototype.BYTES_PER_ELEMENT = Int16Array.BYTES_PER_ELEMENT; 
    Uint32Array.prototype.BYTES_PER_ELEMENT = Uint32Array.BYTES_PER_ELEMENT; 
    Int32Array.prototype.BYTES_PER_ELEMENT = Int32Array.BYTES_PER_ELEMENT; 
    Float64Array.prototype.BYTES_PER_ELEMENT = Float64Array.BYTES_PER_ELEMENT; 
}

/**
  Saves the DataStream contents to the given filename.
  Uses Chrome's anchor download property to initiate download.

  @param {string} filename Filename to save as.
  @return {null}
  */
DataStream.prototype.save = function(filename) {
  var blob = new Blob(this.buffer);
  var URL = (window.webkitURL || window.URL);
  if (URL && URL.createObjectURL) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', filename);
      a.click();
      URL.revokeObjectURL(url);
  } else {
      throw("DataStream.save: Can't create object URL.");
  }
};

/**
  Big-endian const to use as default endianness.
  @type {boolean}
  */
DataStream.BIG_ENDIAN = false;

/**
  Little-endian const to use as default endianness.
  @type {boolean}
  */
DataStream.LITTLE_ENDIAN = true;

/**
  Whether to extend DataStream buffer when trying to write beyond its size.
  If set, the buffer is reallocated to twice its current size until the
  requested write fits the buffer.
  @type {boolean}
  */
DataStream.prototype._dynamicSize = true;
Object.defineProperty(DataStream.prototype, 'dynamicSize',
  { get: function() {
      return this._dynamicSize;
    },
    set: function(v) {
      if (!v) {
        this._trimAlloc();
      }
      this._dynamicSize = v;
    } });

/**
  Virtual byte length of the DataStream backing buffer.
  Updated to be max of original buffer size and last written size.
  If dynamicSize is false is set to buffer size.
  @type {number}
  */
DataStream.prototype._byteLength = 0;

/**
  Returns the byte length of the DataStream object.
  @type {number}
  */
Object.defineProperty(DataStream.prototype, 'byteLength',
  { get: function() {
    return this._byteLength - this._byteOffset;
  }});

/**
  Set/get the backing ArrayBuffer of the DataStream object.
  The setter updates the DataView to point to the new buffer.
  @type {Object}
  */
Object.defineProperty(DataStream.prototype, 'buffer',
  { get: function() {
      this._trimAlloc();
      return this._buffer;
    },
    set: function(v) {
      this._buffer = v;
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._buffer.byteLength;
    } });

/**
  Set/get the byteOffset of the DataStream object.
  The setter updates the DataView to point to the new byteOffset.
  @type {number}
  */
Object.defineProperty(DataStream.prototype, 'byteOffset',
  { get: function() {
      return this._byteOffset;
    },
    set: function(v) {
      this._byteOffset = v;
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._buffer.byteLength;
    } });

/**
  Set/get the backing DataView of the DataStream object.
  The setter updates the buffer and byteOffset to point to the DataView values.
  @type {Object}
  */
Object.defineProperty(DataStream.prototype, 'dataView',
  { get: function() {
      return this._dataView;
    },
    set: function(v) {
      this._byteOffset = v.byteOffset;
      this._buffer = v.buffer;
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._byteOffset + v.byteLength;
    } });

/**
  Internal function to resize the DataStream buffer when required.
  @param {number} extra Number of bytes to add to the buffer allocation.
  @return {null}
  */
DataStream.prototype._realloc = function(extra) {
  if (!this._dynamicSize) {
    return;
  }
  var req = this._byteOffset + this.position + extra;
  var blen = this._buffer.byteLength;
  if (req <= blen) {
    if (req > this._byteLength) {
      this._byteLength = req;
    }
    return;
  }
  if (blen < 1) {
    blen = 1;
  }
  while (req > blen) {
    blen *= 2;
  }
  var buf = new ArrayBuffer(blen);
  var src = new Uint8Array(this._buffer);
  var dst = new Uint8Array(buf, 0, src.length);
  dst.set(src);
  this.buffer = buf;
  this._byteLength = req;
};

/**
  Internal function to trim the DataStream buffer when required.
  Used for stripping out the extra bytes from the backing buffer when
  the virtual byteLength is smaller than the buffer byteLength (happens after
  growing the buffer with writes and not filling the extra space completely).

  @return {null}
  */
DataStream.prototype._trimAlloc = function() {
  if (this._byteLength == this._buffer.byteLength) {
    return;
  }
  var buf = new ArrayBuffer(this._byteLength);
  var dst = new Uint8Array(buf);
  var src = new Uint8Array(this._buffer, 0, dst.length);
  dst.set(src);
  this.buffer = buf;
};

/**
  Sets the DataStream read/write position to given position.
  Clamps between 0 and DataStream length.

  @param {number} pos Position to seek to.
  @return {null}
  */
DataStream.prototype.seek = function(pos) {
  var npos = Math.max(0, Math.min(this.byteLength, pos));
  this.position = (isNaN(npos) || !isFinite(npos)) ? 0 : npos;
};

/**
  Returns true if the DataStream seek pointer is at the end of buffer and
  there's no more data to read.

  @return {boolean} True if the seek pointer is at the end of the buffer.
  */
DataStream.prototype.isEof = function() {
  return (this.position >= this.byteLength);
};

/**
  Maps an Int32Array into the DataStream buffer, swizzling it to native
  endianness in-place. The current offset from the start of the buffer needs to
  be a multiple of element size, just like with typed array views.

  Nice for quickly reading in data. Warning: potentially modifies the buffer
  contents.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Int32Array to the DataStream backing buffer.
  */
DataStream.prototype.mapInt32Array = function(length, e) {
  this._realloc(length * 4);
  var arr = new Int32Array(this._buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 4;
  return arr;
};

/**
  Maps an Int16Array into the DataStream buffer, swizzling it to native
  endianness in-place. The current offset from the start of the buffer needs to
  be a multiple of element size, just like with typed array views.

  Nice for quickly reading in data. Warning: potentially modifies the buffer
  contents.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Int16Array to the DataStream backing buffer.
  */
DataStream.prototype.mapInt16Array = function(length, e) {
  this._realloc(length * 2);
  var arr = new Int16Array(this._buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 2;
  return arr;
};

/**
  Maps an Int8Array into the DataStream buffer.

  Nice for quickly reading in data.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Int8Array to the DataStream backing buffer.
  */
DataStream.prototype.mapInt8Array = function(length) {
  this._realloc(length * 1);
  var arr = new Int8Array(this._buffer, this.byteOffset+this.position, length);
  this.position += length * 1;
  return arr;
};

/**
  Maps a Uint32Array into the DataStream buffer, swizzling it to native
  endianness in-place. The current offset from the start of the buffer needs to
  be a multiple of element size, just like with typed array views.

  Nice for quickly reading in data. Warning: potentially modifies the buffer
  contents.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Uint32Array to the DataStream backing buffer.
  */
DataStream.prototype.mapUint32Array = function(length, e) {
  this._realloc(length * 4);
  var arr = new Uint32Array(this._buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 4;
  return arr;
};

/**
  Maps a Uint16Array into the DataStream buffer, swizzling it to native
  endianness in-place. The current offset from the start of the buffer needs to
  be a multiple of element size, just like with typed array views.

  Nice for quickly reading in data. Warning: potentially modifies the buffer
  contents.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Uint16Array to the DataStream backing buffer.
  */
DataStream.prototype.mapUint16Array = function(length, e) {
  this._realloc(length * 2);
  var arr = new Uint16Array(this._buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 2;
  return arr;
};

/**
  Maps a Uint8Array into the DataStream buffer.

  Nice for quickly reading in data.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Uint8Array to the DataStream backing buffer.
  */
DataStream.prototype.mapUint8Array = function(length) {
  this._realloc(length * 1);
  var arr = new Uint8Array(this._buffer, this.byteOffset+this.position, length);
  this.position += length * 1;
  return arr;
};

/**
  Maps a Float64Array into the DataStream buffer, swizzling it to native
  endianness in-place. The current offset from the start of the buffer needs to
  be a multiple of element size, just like with typed array views.

  Nice for quickly reading in data. Warning: potentially modifies the buffer
  contents.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Float64Array to the DataStream backing buffer.
  */
DataStream.prototype.mapFloat64Array = function(length, e) {
  this._realloc(length * 8);
  var arr = new Float64Array(this._buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 8;
  return arr;
};

/**
  Maps a Float32Array into the DataStream buffer, swizzling it to native
  endianness in-place. The current offset from the start of the buffer needs to
  be a multiple of element size, just like with typed array views.

  Nice for quickly reading in data. Warning: potentially modifies the buffer
  contents.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} Float32Array to the DataStream backing buffer.
  */
DataStream.prototype.mapFloat32Array = function(length, e) {
  this._realloc(length * 4);
  var arr = new Float32Array(this._buffer, this.byteOffset+this.position, length);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += length * 4;
  return arr;
};

/**
  Reads an Int32Array of desired length and endianness from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Int32Array.
 */
DataStream.prototype.readInt32Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 4) : length;
  var arr = new Int32Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += arr.byteLength;
  return arr;
};

/**
  Reads an Int16Array of desired length and endianness from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Int16Array.
 */
DataStream.prototype.readInt16Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 2) : length;
  var arr = new Int16Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += arr.byteLength;
  return arr;
};

/**
  Reads an Int8Array of desired length from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Int8Array.
 */
DataStream.prototype.readInt8Array = function(length) {
  length = length == null ? (this.byteLength-this.position) : length;
  var arr = new Int8Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  this.position += arr.byteLength;
  return arr;
};

/**
  Reads a Uint32Array of desired length and endianness from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Uint32Array.
 */
DataStream.prototype.readUint32Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 4) : length;
  var arr = new Uint32Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += arr.byteLength;
  return arr;
};

/**
  Reads a Uint16Array of desired length and endianness from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Uint16Array.
 */
DataStream.prototype.readUint16Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 2) : length;
  var arr = new Uint16Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += arr.byteLength;
  return arr;
};

/**
  Reads a Uint8Array of desired length from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Uint8Array.
 */
DataStream.prototype.readUint8Array = function(length) {
  length = length == null ? (this.byteLength-this.position) : length;
  var arr = new Uint8Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  this.position += arr.byteLength;
  return arr;
};

/**
  Reads a Float64Array of desired length and endianness from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Float64Array.
 */
DataStream.prototype.readFloat64Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 8) : length;
  var arr = new Float64Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += arr.byteLength;
  return arr;
};

/**
  Reads a Float32Array of desired length and endianness from the DataStream.

  @param {number} length Number of elements to map.
  @param {?boolean} e Endianness of the data to read.
  @return {Object} The read Float32Array.
 */
DataStream.prototype.readFloat32Array = function(length, e) {
  length = length == null ? (this.byteLength-this.position / 4) : length;
  var arr = new Float32Array(length);
  DataStream.memcpy(arr.buffer, 0,
                    this.buffer, this.byteOffset+this.position,
                    length*arr.BYTES_PER_ELEMENT);
  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
  this.position += arr.byteLength;
  return arr;
};

/**
  Writes an Int32Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeInt32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  if (arr instanceof Int32Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapInt32Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeInt32(arr[i], e);
    }
  }
};

/**
  Writes an Int16Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeInt16Array = function(arr, e) {
  this._realloc(arr.length * 2);
  if (arr instanceof Int16Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapInt16Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeInt16(arr[i], e);
    }
  }
};

/**
  Writes an Int8Array to the DataStream.

  @param {Object} arr The array to write.
 */
DataStream.prototype.writeInt8Array = function(arr) {
  this._realloc(arr.length * 1);
  if (arr instanceof Int8Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapInt8Array(arr.length);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeInt8(arr[i]);
    }
  }
};

/**
  Writes a Uint32Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeUint32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  if (arr instanceof Uint32Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapUint32Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeUint32(arr[i], e);
    }
  }
};

/**
  Writes a Uint16Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeUint16Array = function(arr, e) {
  this._realloc(arr.length * 2);
  if (arr instanceof Uint16Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapUint16Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeUint16(arr[i], e);
    }
  }
};

/**
  Writes a Uint8Array to the DataStream.

  @param {Object} arr The array to write.
 */
DataStream.prototype.writeUint8Array = function(arr) {
  this._realloc(arr.length * 1);
  if (arr instanceof Uint8Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapUint8Array(arr.length);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeUint8(arr[i]);
    }
  }
};

/**
  Writes a Float64Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeFloat64Array = function(arr, e) {
  this._realloc(arr.length * 8);
  if (arr instanceof Float64Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapFloat64Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeFloat64(arr[i], e);
    }
  }
};

/**
  Writes a Float32Array of specified endianness to the DataStream.

  @param {Object} arr The array to write.
  @param {?boolean} e Endianness of the data to write.
 */
DataStream.prototype.writeFloat32Array = function(arr, e) {
  this._realloc(arr.length * 4);
  if (arr instanceof Float32Array &&
      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT == 0) {
    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
                      arr.buffer, 0,
                      arr.byteLength);
    this.mapFloat32Array(arr.length, e);
  } else {
    for (var i=0; i<arr.length; i++) {
      this.writeFloat32(arr[i], e);
    }
  }
};


/**
  Reads a 32-bit int from the DataStream with the desired endianness.

  @param {?boolean} e Endianness of the number.
  @return {number} The read number.
 */
DataStream.prototype.readInt32 = function(e) {
  var v = this._dataView.getInt32(this.position, e == null ? this.endianness : e);
  this.position += 4;
  return v;
};

/**
  Reads a 16-bit int from the DataStream with the desired endianness.

  @param {?boolean} e Endianness of the number.
  @return {number} The read number.
 */
DataStream.prototype.readInt16 = function(e) {
  var v = this._dataView.getInt16(this.position, e == null ? this.endianness : e);
  this.position += 2;
  return v;
};

/**
  Reads an 8-bit int from the DataStream.

  @return {number} The read number.
 */
DataStream.prototype.readInt8 = function() {
  var v = this._dataView.getInt8(this.position);
  this.position += 1;
  return v;
};

/**
  Reads a 32-bit unsigned int from the DataStream with the desired endianness.

  @param {?boolean} e Endianness of the number.
  @return {number} The read number.
 */
DataStream.prototype.readUint32 = function(e) {
  var v = this._dataView.getUint32(this.position, e == null ? this.endianness : e);
  this.position += 4;
  return v;
};

/**
  Reads a 16-bit unsigned int from the DataStream with the desired endianness.

  @param {?boolean} e Endianness of the number.
  @return {number} The read number.
 */
DataStream.prototype.readUint16 = function(e) {
  var v = this._dataView.getUint16(this.position, e == null ? this.endianness : e);
  this.position += 2;
  return v;
};

/**
  Reads an 8-bit unsigned int from the DataStream.

  @return {number} The read number.
 */
DataStream.prototype.readUint8 = function() {
  var v = this._dataView.getUint8(this.position);
  this.position += 1;
  return v;
};

/**
  Reads a 32-bit float from the DataStream with the desired endianness.

  @param {?boolean} e Endianness of the number.
  @return {number} The read number.
 */
DataStream.prototype.readFloat32 = function(e) {
  var v = this._dataView.getFloat32(this.position, e == null ? this.endianness : e);
  this.position += 4;
  return v;
};

/**
  Reads a 64-bit float from the DataStream with the desired endianness.

  @param {?boolean} e Endianness of the number.
  @return {number} The read number.
 */
DataStream.prototype.readFloat64 = function(e) {
  var v = this._dataView.getFloat64(this.position, e == null ? this.endianness : e);
  this.position += 8;
  return v;
};


/**
  Writes a 32-bit int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeInt32 = function(v, e) {
  this._realloc(4);
  this._dataView.setInt32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

/**
  Writes a 16-bit int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeInt16 = function(v, e) {
  this._realloc(2);
  this._dataView.setInt16(this.position, v, e == null ? this.endianness : e);
  this.position += 2;
};

/**
  Writes an 8-bit int to the DataStream.

  @param {number} v Number to write.
 */
DataStream.prototype.writeInt8 = function(v) {
  this._realloc(1);
  this._dataView.setInt8(this.position, v);
  this.position += 1;
};

/**
  Writes a 32-bit unsigned int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeUint32 = function(v, e) {
  this._realloc(4);
  this._dataView.setUint32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

/**
  Writes a 16-bit unsigned int to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeUint16 = function(v, e) {
  this._realloc(2);
  this._dataView.setUint16(this.position, v, e == null ? this.endianness : e);
  this.position += 2;
};

/**
  Writes an 8-bit unsigned  int to the DataStream.

  @param {number} v Number to write.
 */
DataStream.prototype.writeUint8 = function(v) {
  this._realloc(1);
  this._dataView.setUint8(this.position, v);
  this.position += 1;
};

/**
  Writes a 32-bit float to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeFloat32 = function(v, e) {
  this._realloc(4);
  this._dataView.setFloat32(this.position, v, e == null ? this.endianness : e);
  this.position += 4;
};

/**
  Writes a 64-bit float to the DataStream with the desired endianness.

  @param {number} v Number to write.
  @param {?boolean} e Endianness of the number.
 */
DataStream.prototype.writeFloat64 = function(v, e) {
  this._realloc(8);
  this._dataView.setFloat64(this.position, v, e == null ? this.endianness : e);
  this.position += 8;
};

/**
  Native endianness. Either DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN
  depending on the platform endianness.

  @type {boolean}
 */
DataStream.endianness = new Int8Array(new Int16Array([1]).buffer)[0] > 0;

/**
  Copies byteLength bytes from the src buffer at srcOffset to the
  dst buffer at dstOffset.

  @param {Object} dst Destination ArrayBuffer to write to.
  @param {number} dstOffset Offset to the destination ArrayBuffer.
  @param {Object} src Source ArrayBuffer to read from.
  @param {number} srcOffset Offset to the source ArrayBuffer.
  @param {number} byteLength Number of bytes to copy.
 */
DataStream.memcpy = function(dst, dstOffset, src, srcOffset, byteLength) {
  var dstU8 = new Uint8Array(dst, dstOffset, byteLength);
  var srcU8 = new Uint8Array(src, srcOffset, byteLength);
  dstU8.set(srcU8);
};

/**
  Converts array to native endianness in-place.

  @param {Object} array Typed array to convert.
  @param {boolean} arrayIsLittleEndian True if the data in the array is
                                       little-endian. Set false for big-endian.
  @return {Object} The converted typed array.
 */
DataStream.arrayToNative = function(array, arrayIsLittleEndian) {
  if (arrayIsLittleEndian == this.endianness) {
    return array;
  } else {
    return this.flipArrayEndianness(array);
  }
};

/**
  Converts native endianness array to desired endianness in-place.

  @param {Object} array Typed array to convert.
  @param {boolean} littleEndian True if the converted array should be
                                little-endian. Set false for big-endian.
  @return {Object} The converted typed array.
 */
DataStream.nativeToEndian = function(array, littleEndian) {
  if (this.endianness == littleEndian) {
    return array;
  } else {
    return this.flipArrayEndianness(array);
  }
};

/**
  Flips typed array endianness in-place.

  @param {Object} array Typed array to flip.
  @return {Object} The converted typed array.
 */
DataStream.flipArrayEndianness = function(array) {
  var u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (var i=0; i<array.byteLength; i+=array.BYTES_PER_ELEMENT) {
    for (var j=i+array.BYTES_PER_ELEMENT-1, k=i; j>k; j--, k++) {
      var tmp = u8[k];
      u8[k] = u8[j];
      u8[j] = tmp;
    }
  }
  return array;
};

/**
  Creates an array from an array of character codes.
  Uses String.fromCharCode on the character codes and concats the results into a string.

  @param {array} array Array of character codes.
  @return {string} String created from the character codes.
**/
DataStream.createStringFromArray = function(array) {
  var str = "";
  for (var i=0; i<array.length; i++) {
    str += String.fromCharCode(array[i]);
  }
  return str;
};

/**
  Seek position where DataStream#readStruct ran into a problem.
  Useful for debugging struct parsing.

  @type {number}
 */
DataStream.prototype.failurePosition = 0;

/**
  Reads a struct of data from the DataStream. The struct is defined as
  a flat array of [name, type]-pairs. See the example below:

  ds.readStruct([
    'headerTag', 'uint32', // Uint32 in DataStream endianness.
    'headerTag2', 'uint32be', // Big-endian Uint32.
    'headerTag3', 'uint32le', // Little-endian Uint32.
    'array', ['[]', 'uint32', 16], // Uint32Array of length 16.
    'array2Length', 'uint32',
    'array2', ['[]', 'uint32', 'array2Length'] // Uint32Array of length array2Length
  ]);

  The possible values for the type are as follows:

  // Number types

  // Unsuffixed number types use DataStream endianness.
  // To explicitly specify endianness, suffix the type with
  // 'le' for little-endian or 'be' for big-endian,
  // e.g. 'int32be' for big-endian int32.

  'uint8' -- 8-bit unsigned int
  'uint16' -- 16-bit unsigned int
  'uint32' -- 32-bit unsigned int
  'int8' -- 8-bit int
  'int16' -- 16-bit int
  'int32' -- 32-bit int
  'float32' -- 32-bit float
  'float64' -- 64-bit float

  // String types
  'cstring' -- ASCII string terminated by a zero byte.
  'string:N' -- ASCII string of length N, where N is a literal integer.
  'string:variableName' -- ASCII string of length $variableName,
    where 'variableName' is a previously parsed number in the current struct.
  'string,CHARSET:N' -- String of byteLength N encoded with given CHARSET.
  'u16string:N' -- UCS-2 string of length N in DataStream endianness.
  'u16stringle:N' -- UCS-2 string of length N in little-endian.
  'u16stringbe:N' -- UCS-2 string of length N in big-endian.

  // Complex types
  [name, type, name_2, type_2, ..., name_N, type_N] -- Struct
  function(dataStream, struct) {} -- Callback function to read and return data.
  {get: function(dataStream, struct) {},
   set: function(dataStream, struct) {}}
  -- Getter/setter functions to read and return data, handy for using the same
     struct definition for reading and writing structs.
  ['[]', type, length] -- Array of given type and length. The length can be either
                        a number, a string that references a previously-read
                        field, or a callback function(struct, dataStream, type){}.
                        If length is '*', reads in as many elements as it can.

  @param {Object} structDefinition Struct definition object.
  @return {Object} The read struct. Null if failed to read struct.
 */
DataStream.prototype.readStruct = function(structDefinition) {
  var struct = {}, t, v, n;
  var p = this.position;
  for (var i=0; i<structDefinition.length; i+=2) {
    t = structDefinition[i+1];
    v = this.readType(t, struct);
    if (v == null) {
      if (this.failurePosition == 0) {
        this.failurePosition = this.position;
      }
      this.position = p;
      return null;
    }
    struct[structDefinition[i]] = v;
  }
  return struct;
};

/**
  Read UCS-2 string of desired length and endianness from the DataStream.

  @param {number} length The length of the string to read.
  @param {boolean} endianness The endianness of the string data in the DataStream.
  @return {string} The read string.
 */
DataStream.prototype.readUCS2String = function(length, endianness) {
  return DataStream.createStringFromArray(this.readUint16Array(length, endianness));
};

/**
  Write a UCS-2 string of desired endianness to the DataStream. The
  lengthOverride argument lets you define the number of characters to write.
  If the string is shorter than lengthOverride, the extra space is padded with
  zeroes.

  @param {string} str The string to write.
  @param {?boolean} endianness The endianness to use for the written string data.
  @param {?number} lengthOverride The number of characters to write.
 */
DataStream.prototype.writeUCS2String = function(str, endianness, lengthOverride) {
  if (lengthOverride == null) {
    lengthOverride = str.length;
  }
  for (var i = 0; i < str.length && i < lengthOverride; i++) {
    this.writeUint16(str.charCodeAt(i), endianness);
  }
  for (; i<lengthOverride; i++) {
    this.writeUint16(0);
  }
};

/**
  Read a string of desired length and encoding from the DataStream.

  @param {number} length The length of the string to read in bytes.
  @param {?string} encoding The encoding of the string data in the DataStream.
                            Defaults to ASCII.
  @return {string} The read string.
 */
DataStream.prototype.readString = function(length, encoding) {
  if (encoding == null || encoding == "ASCII") {
    return DataStream.createStringFromArray(this.mapUint8Array(length == null ? this.byteLength-this.position : length));
  } else {
    return (new TextDecoder(encoding)).decode(this.mapUint8Array(length));
  }
};

/**
  Writes a string of desired length and encoding to the DataStream.

  @param {string} s The string to write.
  @param {?string} encoding The encoding for the written string data.
                            Defaults to ASCII.
  @param {?number} length The number of characters to write.
 */
DataStream.prototype.writeString = function(s, encoding, length) {
  if (encoding == null || encoding == "ASCII") {
    if (length != null) {
      var i = 0;
      var len = Math.min(s.length, length);
      for (i=0; i<len; i++) {
        this.writeUint8(s.charCodeAt(i));
      }
      for (; i<length; i++) {
        this.writeUint8(0);
      }
    } else {
      for (var i=0; i<s.length; i++) {
        this.writeUint8(s.charCodeAt(i));
      }
    }
  } else {
    this.writeUint8Array((new TextEncoder(encoding)).encode(s.substring(0, length)));
  }
};


/**
  Read null-terminated string of desired length from the DataStream. Truncates
  the returned string so that the null byte is not a part of it.

  @param {?number} length The length of the string to read.
  @return {string} The read string.
 */
DataStream.prototype.readCString = function(length) {
  var blen = this.byteLength-this.position;
  var u8 = new Uint8Array(this._buffer, this._byteOffset + this.position);
  var len = blen;
  if (length != null) {
    len = Math.min(length, blen);
  }
  for (var i = 0; i < len && u8[i] != 0; i++); // find first zero byte
  var s = DataStream.createStringFromArray(this.mapUint8Array(i));
  if (length != null) {
    this.position += len-i;
  } else if (i != blen) {
    this.position += 1; // trailing zero if not at end of buffer
  }
  return s;
};

/**
  Writes a null-terminated string to DataStream and zero-pads it to length
  bytes. If length is not given, writes the string followed by a zero.
  If string is longer than length, the written part of the string does not have
  a trailing zero.

  @param {string} s The string to write.
  @param {?number} length The number of characters to write.
 */
DataStream.prototype.writeCString = function(s, length) {
  if (length != null) {
    var i = 0;
    var len = Math.min(s.length, length);
    for (i=0; i<len; i++) {
      this.writeUint8(s.charCodeAt(i));
    }
    for (; i<length; i++) {
      this.writeUint8(0);
    }
  } else {
    for (var i=0; i<s.length; i++) {
      this.writeUint8(s.charCodeAt(i));
    }
    this.writeUint8(0);
  }
};

/**
  Reads an object of type t from the DataStream, passing struct as the thus-far
  read struct to possible callbacks that refer to it. Used by readStruct for
  reading in the values, so the type is one of the readStruct types.

  @param {Object} t Type of the object to read.
  @param {?Object} struct Struct to refer to when resolving length references
                          and for calling callbacks.
  @return {?Object} Returns the object on successful read, null on unsuccessful.
 */
DataStream.prototype.readType = function(t, struct) {
  if (typeof t == "function") {
    return t(this, struct);
  } else if (typeof t == "object" && !(t instanceof Array)) {
    return t.get(this, struct);
  } else if (t instanceof Array && t.length != 3) {
    return this.readStruct(t, struct);
  }
  var v = null;
  var lengthOverride = null;
  var charset = "ASCII";
  var pos = this.position;
  var len;
  if (typeof t == 'string' && /:/.test(t)) {
    var tp = t.split(":");
    t = tp[0];
    len = tp[1];

    // allow length to be previously parsed variable
    // e.g. 'string:fieldLength', if `fieldLength` has
    // been parsed previously.
    if (struct[len] != null) {
      lengthOverride = parseInt(struct[len]);
    } else {
      // assume literal integer e.g., 'string:4'
      lengthOverride = parseInt(tp[1]);
    }
  }
  if (typeof t == 'string' && /,/.test(t)) {
    var tp = t.split(",");
    t = tp[0];
    charset = parseInt(tp[1]);
  }
  switch(t) {

    case 'uint8':
      v = this.readUint8(); break;
    case 'int8':
      v = this.readInt8(); break;

    case 'uint16':
      v = this.readUint16(this.endianness); break;
    case 'int16':
      v = this.readInt16(this.endianness); break;
    case 'uint32':
      v = this.readUint32(this.endianness); break;
    case 'int32':
      v = this.readInt32(this.endianness); break;
    case 'float32':
      v = this.readFloat32(this.endianness); break;
    case 'float64':
      v = this.readFloat64(this.endianness); break;

    case 'uint16be':
      v = this.readUint16(DataStream.BIG_ENDIAN); break;
    case 'int16be':
      v = this.readInt16(DataStream.BIG_ENDIAN); break;
    case 'uint32be':
      v = this.readUint32(DataStream.BIG_ENDIAN); break;
    case 'int32be':
      v = this.readInt32(DataStream.BIG_ENDIAN); break;
    case 'float32be':
      v = this.readFloat32(DataStream.BIG_ENDIAN); break;
    case 'float64be':
      v = this.readFloat64(DataStream.BIG_ENDIAN); break;

    case 'uint16le':
      v = this.readUint16(DataStream.LITTLE_ENDIAN); break;
    case 'int16le':
      v = this.readInt16(DataStream.LITTLE_ENDIAN); break;
    case 'uint32le':
      v = this.readUint32(DataStream.LITTLE_ENDIAN); break;
    case 'int32le':
      v = this.readInt32(DataStream.LITTLE_ENDIAN); break;
    case 'float32le':
      v = this.readFloat32(DataStream.LITTLE_ENDIAN); break;
    case 'float64le':
      v = this.readFloat64(DataStream.LITTLE_ENDIAN); break;

    case 'cstring':
      v = this.readCString(lengthOverride); break;

    case 'string':
      v = this.readString(lengthOverride, charset); break;

    case 'u16string':
      v = this.readUCS2String(lengthOverride, this.endianness); break;

    case 'u16stringle':
      v = this.readUCS2String(lengthOverride, DataStream.LITTLE_ENDIAN); break;

    case 'u16stringbe':
      v = this.readUCS2String(lengthOverride, DataStream.BIG_ENDIAN); break;

    default:
      if (t.length == 3) {
        var ta = t[1];
        var len = t[2];
        var length = 0;
        if (typeof len == 'function') {
          length = len(struct, this, t);
        } else if (typeof len == 'string' && struct[len] != null) {
          length = parseInt(struct[len]);
        } else {
          length = parseInt(len);
        }
        if (typeof ta == "string") {
          var tap = ta.replace(/(le|be)$/, '');
          var endianness = null;
          if (/le$/.test(ta)) {
            endianness = DataStream.LITTLE_ENDIAN;
          } else if (/be$/.test(ta)) {
            endianness = DataStream.BIG_ENDIAN;
          }
          if (len == '*') {
            length = null;
          }
          switch(tap) {
            case 'uint8':
              v = this.readUint8Array(length); break;
            case 'uint16':
              v = this.readUint16Array(length, endianness); break;
            case 'uint32':
              v = this.readUint32Array(length, endianness); break;
            case 'int8':
              v = this.readInt8Array(length); break;
            case 'int16':
              v = this.readInt16Array(length, endianness); break;
            case 'int32':
              v = this.readInt32Array(length, endianness); break;
            case 'float32':
              v = this.readFloat32Array(length, endianness); break;
            case 'float64':
              v = this.readFloat64Array(length, endianness); break;
            case 'cstring':
            case 'utf16string':
            case 'string':
              if (length == null) {
                v = [];
                while (!this.isEof()) {
                  var u = this.readType(ta, struct);
                  if (u == null) break;
                  v.push(u);
                }
              } else {
                v = new Array(length);
                for (var i=0; i<length; i++) {
                  v[i] = this.readType(ta, struct);
                }
              }
              break;
          }
        } else {
          if (len == '*') {
            v = [];
            this.buffer;
            while (true) {
              var p = this.position;
              try {
                var o = this.readType(ta, struct);
                if (o == null) {
                  this.position = p;
                  break;
                }
                v.push(o);
              } catch(e) {
                this.position = p;
                break;
              }
            }
          } else {
            v = new Array(length);
            for (var i=0; i<length; i++) {
              var u = this.readType(ta, struct);
              if (u == null) return null;
              v[i] = u;
            }
          }
        }
        break;
      }
  }
  if (lengthOverride != null) {
    this.position = pos + lengthOverride;
  }
  return v;
};

/**
  Writes a struct to the DataStream. Takes a structDefinition that gives the
  types and a struct object that gives the values. Refer to readStruct for the
  structure of structDefinition.

  @param {Object} structDefinition Type definition of the struct.
  @param {Object} struct The struct data object.
  */
DataStream.prototype.writeStruct = function(structDefinition, struct) {
  for (var i = 0; i < structDefinition.length; i+=2) {
    var t = structDefinition[i+1];
    this.writeType(t, struct[structDefinition[i]], struct);
  }
};

/**
  Writes object v of type t to the DataStream.

  @param {Object} t Type of data to write.
  @param {Object} v Value of data to write.
  @param {Object} struct Struct to pass to write callback functions.
  */
DataStream.prototype.writeType = function(t, v, struct) {
  if (typeof t == "function") {
    return t(this, v);
  } else if (typeof t == "object" && !(t instanceof Array)) {
    return t.set(this, v, struct);
  }
  var lengthOverride = null;
  var charset = "ASCII";
  var pos = this.position;
  if (typeof(t) == 'string' && /:/.test(t)) {
    var tp = t.split(":");
    t = tp[0];
    lengthOverride = parseInt(tp[1]);
  }
  if (typeof t == 'string' && /,/.test(t)) {
    var tp = t.split(",");
    t = tp[0];
    charset = parseInt(tp[1]);
  }

  switch(t) {
    case 'uint8':
      this.writeUint8(v);
      break;
    case 'int8':
      this.writeInt8(v);
      break;

    case 'uint16':
      this.writeUint16(v, this.endianness);
      break;
    case 'int16':
      this.writeInt16(v, this.endianness);
      break;
    case 'uint32':
      this.writeUint32(v, this.endianness);
      break;
    case 'int32':
      this.writeInt32(v, this.endianness);
      break;
    case 'float32':
      this.writeFloat32(v, this.endianness);
      break;
    case 'float64':
      this.writeFloat64(v, this.endianness);
      break;

    case 'uint16be':
      this.writeUint16(v, DataStream.BIG_ENDIAN);
      break;
    case 'int16be':
      this.writeInt16(v, DataStream.BIG_ENDIAN);
      break;
    case 'uint32be':
      this.writeUint32(v, DataStream.BIG_ENDIAN);
      break;
    case 'int32be':
      this.writeInt32(v, DataStream.BIG_ENDIAN);
      break;
    case 'float32be':
      this.writeFloat32(v, DataStream.BIG_ENDIAN);
      break;
    case 'float64be':
      this.writeFloat64(v, DataStream.BIG_ENDIAN);
      break;

    case 'uint16le':
      this.writeUint16(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'int16le':
      this.writeInt16(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'uint32le':
      this.writeUint32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'int32le':
      this.writeInt32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'float32le':
      this.writeFloat32(v, DataStream.LITTLE_ENDIAN);
      break;
    case 'float64le':
      this.writeFloat64(v, DataStream.LITTLE_ENDIAN);
      break;

    case 'cstring':
      this.writeCString(v, lengthOverride);
      break;

    case 'string':
      this.writeString(v, charset, lengthOverride);
      break;

    case 'u16string':
      this.writeUCS2String(v, this.endianness, lengthOverride);
      break;

    case 'u16stringle':
      this.writeUCS2String(v, DataStream.LITTLE_ENDIAN, lengthOverride);
      break;

    case 'u16stringbe':
      this.writeUCS2String(v, DataStream.BIG_ENDIAN, lengthOverride);
      break;

    default:
      if (t.length == 3) {
        var ta = t[1];
        for (var i=0; i<v.length; i++) {
          this.writeType(ta, v[i]);
        }
        break;
      } else {
        this.writeStruct(t, v);
        break;
      }
  }
  if (lengthOverride != null) {
    this.position = pos;
    this._realloc(lengthOverride);
    this.position = pos + lengthOverride;
  }
};

// Export DataStream for amd environments
if (typeof define === 'function' && define.amd) {
    define('DataStream', [], function() {
      return DataStream;
    });
  }
  
// Export DataStream for CommonJS
if (typeof module === 'object' && module && module.exports) {
  module.exports = DataStream;
}


},{}],6:[function(require,module,exports){

;(function() {

  var StlAsciiReader = (function() {

    var StlAsciiReader = function(options) {
    };

    /* Number of lines per facet in the STL file */
    var LINES_PER_FACET = 7;

    /* Number of floating point values in a triangle */
    var NUM_FLOATS_IN_TRI = 18;

    /**
     * Split line into words
     *
     * @param {String} line containing words
     * @returns {Array} containing the words
     */
    function splitLineIntoWords(line) {

      var lineWords = line.trim().split(' ');

      for (var i = lineWords.length-1; i >= 0; i--) {
        if (lineWords[i].length === 0) {
          lineWords.splice(i, 1);
        }
      }

      return lineWords;
    }

    /**
     * Read a vector
     *
     * @param {String} line containing the vector
     * @param {Number} idx index of word from where to read
     * @returns {Array} containing the vertex coordinates
     */
    function readVector(line, idx) {

      var lineWords = splitLineIntoWords(line);
      var vector = [];

      for (var i = 0; i< 3; i++) {
        vector.push(parseFloat(lineWords[idx+i]));
      }

      return vector;
    }

    /**
     * Read a single vertex
     *
     * @param {String} line containing the vertex
     * @returns {Array} containing the vertex coordinates
     */
    function readVertex(line) {

      return readVector(line, 1);
    }

    /**
     * Read a single normal
     *
     * @param {String} line containing the normal
     * @returns {Array} contaning the normal coordinates
     */
    function readNormal(line) {

      return readVector(line, 2);
    }

    /**
     * Read a single facet
     *
     * @param {Array} lines of the STL file
     * @param {Number} idx the index at which the facet starts
     * @returns {Object} an object with the normal and the verts
     */
    function readFacet(lines, idx) {

      var facet = {};
      facet.normal = readNormal(lines[idx]);
      facet.verts = [];
      facet.verts.push(readVertex(lines[idx+2]));
      facet.verts.push(readVertex(lines[idx+3]));
      facet.verts.push(readVertex(lines[idx+4]));

      return facet;
    }

    /**
     * Converts the facets into a Float32Array with interleaved vertex and
     * normal data.
     *
     * @param {Object} facet the facet object with the vertices and normal
     * @param {Float32Array} vn the interleaved vertex normal data to be populated
     * @param {Float32Array} v the vertex data to be populated
     * @param {Float32Array} n the normal data to be populated
     * @param {Number} idx the index at which to insert the facet data
     */
    function pushFacetIntoFloat32Array(facet, vn, v, n, idx) {

      var normal = facet.normal;
      for (var j = 0; j < 3; j++) {
        for (var k = 0; k < 3; k++) {
          vn[idx+j*6+k] = facet.verts[j][k];
          v[idx/2+j*3+k] = facet.verts[j][k];
        }

        // copy the normal after each vertex
        for (k = 0; k < 3; k++) {
          vn[idx+j*6+3+k] = facet.normal[k];
          n[idx/2+j*3+k] = facet.normal[k];
        }
      }
    }

    /**
     * Read the STL solid
     *
     * @param {Array} lines the lines of the STL file
     * @param {Float32Array} vn the interleaved vertex normal data to be populated
     * @param {Float32Array} v the vertex data to be populated
     * @param {Float32Array} n the normal data to be populated
     */
    function readSolid(lines, vn, v, n) {

      var facetCount = 0;

      for (var i = 0; i< lines.length; i++) {
        var lineWords = lines[i].trim().split(' ');
        if (lineWords[0] == 'facet') {
          var facet = readFacet(lines, i);

          pushFacetIntoFloat32Array(facet, vn, v, n, facetCount*NUM_FLOATS_IN_TRI);
          facetCount += 1;

          // skip to the next facet
          i += 6;
        }
      }
    }

    /**
     * Reads the triangle vertices of an ASCII STL file into a Float32Array
     *
     * @param  {string} fileData The file data as a string
     * @return {Float23Array} contains interleaved vertex normal data
     */
    StlAsciiReader.prototype.read = function(fileData) {

      var lines = fileData.split('\n');

      var numTriangles = parseInt(lines.length/LINES_PER_FACET);
      var vn = new Float32Array(numTriangles*NUM_FLOATS_IN_TRI);
      var v = new Float32Array(numTriangles*NUM_FLOATS_IN_TRI/2);
      var n = new Float32Array(numTriangles*NUM_FLOATS_IN_TRI/2);

      readSolid(lines, vn, v, n);
      return {
        vn: vn,
        vertices: v,
        normals: n
      };
    };

    return StlAsciiReader;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = StlAsciiReader;
  }

  if (typeof window !== 'undefined') {
    window.StlAsciiReader = StlAsciiReader;
  }

})();

},{}],7:[function(require,module,exports){

;(function() {

  var StlBinaryReader = (function() {

    var StlBinaryReader = function(options) {
    };

    /* Header size is 80 bytes */
    var HEADER_SIZE = 80;

    /**
     * Reads the binary STL header
     *
     * @param  {DataStream} ds the file DataStream object
     */
    function readHeader(ds) {
      ds.readUint8Array(HEADER_SIZE);
    }

    /**
     * Copy a vert/normal into an existing array
     *
     * @param {Float32Array} vec the vector to copy
     * @param {Float32Array} arr the array to copy into
     * @param {number} idx the index from which to start copying
     */
    function readVec3IntoArray(vec, arr, idx) {

      for (var i = 0; i< 3; i++) {
        arr[idx + i] = vec[i];
      }
    }

    /**
     * Read each individual triangle
     *
     * @param {DataStream} ds the file DataStream object
     * @param {Float32Array} vn the array to read the triangle data into
     * @param {Float32Array} v the array to read the vertices into
     * @param {Float32Array} n the array to read the normals into
     * @param {number} idx the index in the array from where to start
     */
    function readTriangle(ds, vn, v, n, idx) {

      var normal = ds.readFloat32Array(3);
      for (var i = 0; i<3; i++) {

        var vert = ds.readFloat32Array(3);

        readVec3IntoArray(vert, vn, idx + i*6);
        readVec3IntoArray(vert, v, idx/2 + i*3);

        readVec3IntoArray(normal, vn, idx + i*6 + 3);
        readVec3IntoArray(normal, n, idx/2 + i*3);
      }

      ds.readUint16();
    }

    /**
     * Reads the binary STL triangles
     *
     * @param  {DataStream} ds the file DataStream object
     * @returns {Float32Array} the typed array with the interleaved data.
     */
    function readTriangles(ds) {

      var numTri = ds.readUint32();
      var vn = new Float32Array(numTri*3*3*2);
      var v = new Float32Array(numTri*3*3);
      var n = new Float32Array(numTri*3*3);

      for (var i = 0; i< numTri; i++) {
        readTriangle(ds, vn, v, n, i*3*3*2);
      }

      return {
        vn: vn,
        vertices: v,
        normals: n
      };
    }

    /**
     * Reads the triangle vertices of a binary STL file into a Float32Array
     *
     * @param  {DataStream} ds The file data as a DataStream object
     * @returns {Float23Array} contains interleaved vertex normal data
     */
    StlBinaryReader.prototype.read = function(ds) {

      readHeader(ds);
      return readTriangles(ds);
    };

    return StlBinaryReader;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = StlBinaryReader;
  }

  if (typeof window !== 'undefined') {
    window.StlBinaryReader = StlBinaryReader;
  }

})();

},{}],8:[function(require,module,exports){

;(function() {

  var StlReader = (function() {

    if (typeof DataStream === 'undefined') {
      DataStream = require('./DataStream.js/DataStream.js');
    }

    if (typeof StlAsciiReader === 'undefined') {
      StlAsciiReader = require('./stl-ascii-reader.js');
    }

    if (typeof StlBinaryReader === 'undefined') {
      StlBinaryReader = require('./stl-binary-reader.js');
    }

    var StlReader = function(options) {
    };

    /* Header size is 80 bytes */
    var HEADER_SIZE = 80;

    /* Triangle count size is a 4 byte integer */
    var TRI_COUNT_SIZE = 4;

    /* Per-triangle data size is 50 bytes - 4 vectors (normal plus three
      vertices) each with three 4 byte floats plus an additional 2 byte
      attribute count at the end */
    var PER_TRI_SIZE = 4*(4*3)+2;

    /**
     * Check if the file is too small to be a valid STL file.
     *
     * @param {DataStream} ds the file data as a DataStream
     * @returns {Boolean} true if the file is too small to be valid
     */
    function isTooSmallToBeValid(ds) {
      ds.seek(0);
      if (ds.byteLength < HEADER_SIZE + TRI_COUNT_SIZE) {
        return true;
      }

      return false;
    }

    /**
     * Check if the file is a binary STL file.
     *
     * @param {DataStream} ds the file data as a DataStream
     * @returns {Boolean} true if the file is a binary STL file
     */
    function isBinary(ds) {
      ds.seek(0);

      var fileSize = ds.byteLength;

      var skipHeader = ds.readUint8Array(HEADER_SIZE);
      var numTriangles = ds.readUint32();

      if (fileSize == HEADER_SIZE + TRI_COUNT_SIZE + numTriangles*PER_TRI_SIZE) {

        return true;
      }

      return false;
    }

    /**
     * Checks if the ArrayBuffer is valid - that is, the data could
     * theoretically be an STL file
     *
     * @param  {ArrayBuffer} fileData The file as an ArrayBuffer
     * @return {DataStream} the DataStream for the file is valid else null
     */
    function checkValidity(fileData) {

      if (!fileData) {
        return null;
      }

      if (fileData.byteLength === 0) {
        return null;
      }

      var ds = new DataStream(fileData);

      if (isTooSmallToBeValid(ds)) {
        return null;
      }

      return ds;
    }

    /**
     * Reads the triangle vertices of an STL file into a Float32Array. The
     * type of the file - binary/ASCII - is automatically determined and
     * the file is appropriately parsed.
     *
     * @param  {ArrayBuffer} fileData The file as an ArrayBuffer
     * @param {Object} returns an object with vn, vertices amd normals properties
     */
    StlReader.prototype.read = function(fileData) {

      var ds = checkValidity(fileData);

      if (!ds) {
        return null;
      }

      var reader;
      if (isBinary(ds)) {

        reader = new StlBinaryReader();
        ds.seek(0);
        return reader.read(ds);
      } else {

        reader = new StlAsciiReader();
        ds.seek(0);
        return reader.read(ds.readString());
      }
    };

    return StlReader;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = StlReader;
  }

  if (typeof window !== 'undefined') {
    window.StlReader = StlReader;
  }

})();

},{"./DataStream.js/DataStream.js":5,"./stl-ascii-reader.js":6,"./stl-binary-reader.js":7}],9:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],10:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":9,"_process":4,"inherits":3}]},{},[1]);
