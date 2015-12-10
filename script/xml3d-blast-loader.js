(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var blast = require("blast");
var jpath = require("jpath");

var normal = (1 << 0);
var tangent = (1 << 1);
var texcoord = (1 << 2);
var color = (1 << 3);

function isLittleEndianArchitecture() {
    // DataView#getUint16 will read 1 on big-endian systems.
    return new DataView(new Uint16Array([256]).buffer).getUint16(0, true) === 256;
};

 function flipEndianessIfNecessary(typedArray, littleEndian) {
    if (littleEndian !== isLittleEndianArchitecture())
		throw "Fatal: Expected little endian data but got big endian data instead."
    return typedArray;
};

function decodeAssimpMesh(buffer, littleEndian) {
    var view = new DataView(buffer);
    var offset = 0;
    var vertexCount = view.getUint32(offset, littleEndian);
    offset += 4;
    var attribs = view.getUint8(offset);
    offset += 4;

    var mesh = {
        position: flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 3), littleEndian)
    };
    offset += vertexCount * 3 * mesh.position.BYTES_PER_ELEMENT;

    if (attribs & normal) {
        mesh.normal = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 3), littleEndian);
        offset += vertexCount * 3 * mesh.normal.BYTES_PER_ELEMENT;
    }
    if (attribs & tangent) {
        mesh.tangent = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 3), littleEndian);
        offset += vertexCount * 3 * mesh.tangent.BYTES_PER_ELEMENT;
    }
    if (attribs & texcoord) {
        mesh.texcoord = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 2), littleEndian);
        offset += vertexCount * 2 * mesh.texcoord.BYTES_PER_ELEMENT;
    }
    if (attribs & color) {
        mesh.color = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 4), littleEndian);
        offset += vertexCount * 4 * mesh.color.BYTES_PER_ELEMENT;
    }

    mesh.index = flipEndianessIfNecessary(new Uint32Array(buffer, offset), littleEndian);

    return mesh;
};

var BlastFormatHandler = function() {
    XML3D.resource.FormatHandler.call(this);
};

XML3D.createClass(BlastFormatHandler, XML3D.resource.FormatHandler);

BlastFormatHandler.prototype.isFormatSupported = function(response) {
    if (response.url.match(/\.blast/)) {
        return true;
    }
    return true;
};

BlastFormatHandler.prototype.getFormatData = function(response) {
    var xflowData = [];
    var streamReceiver = new blast.StreamReceiver({
        async: false
    });
	return new Promise(function(resolve, reject) {
		response.arrayBuffer().then(function(arrayBuffer) {
			var errorCallback = function(e) {
				throw new Error("BLAST loader could not parse the input buffer.");
			}
			streamReceiver.end(arrayBuffer);
			streamReceiver
				.on("error", errorCallback)
				.pipe(new blast.Dechunker({ async: false }))
				.on("error", errorCallback)
				.pipe(new blast.ValueDecoder({
					async: false,
					decodingSpecificationMap: {
						"http://localhost:9090/codecs/assimpMesh": decodeAssimpMesh
					}
				}))
				.on("error", errorCallback)
				.on("data", function (decodedData) {
					jpath.evaluate(decodedData.path, xflowData).forEach(function (result) {
						decodedData.metadata.forEach(function (pathTypeMap) {
							jpath.evaluate(pathTypeMap.path, decodedData.value).definedResults.forEach(function (result) {
								var xflowDataDescription = {
									type: pathTypeMap.type,
									value: result.value
								};
								if (result.isRoot)
									decodedData.value = xflowDataDescription;
								else
									result.value = xflowDataDescription;
							});
						});
						if (result.isRoot)
							xflowData = decodedData.value;
						else
							result.value = decodedData.value;
					});
				})
				.on("finish", function () {
					resolve(xflowData);
				});
		});
	});
    
};

BlastFormatHandler.prototype.getFragmentData = function (data, path) {
    if (!path)
        return data;
    return jpath.evaluate(path, data).definedResults.length > 0 ? jpath.evaluate(path, data).definedResults[0].value : null;
};

BlastFormatHandler.prototype.getAdapter = function(node, aspect, canvasId) {
	if (aspect === "data")
		return new BlastDataAdapter(node);
};

var blastFormatHandler = new BlastFormatHandler();
XML3D.resource.registerFormat(blastFormatHandler);

var BlastDataAdapter = function (data) {
    this._xflowDataNode = createXflowDataNode(data);
};

function createXflowDataNode (data) {
    var xflowDataNode = new Xflow.DataNode();

    Object.keys(data).forEach(function (attributeName) {
        var attribute = data[attributeName];
        if (attribute)
            xflowDataNode.appendChild(createInputNode(attributeName, attribute.type, attribute.value));
    });

    return xflowDataNode;
}

function createInputNode(name, type, typedArray) {
    var inputNode = new Xflow.InputNode();
    inputNode.name = name;
    inputNode.data = new Xflow.BufferEntry(Xflow.constants.DATA_TYPE.fromString(type), typedArray);
    return inputNode;
}

BlastDataAdapter.prototype.getXflowNode = function() {
    return this._xflowDataNode;
};

},{"blast":8,"jpath":79}],2:[function(require,module,exports){
"use strict";

function worker() {
    self.addEventListener("message", function (event) {
        downloadDecodingFunctionality(event.data.decodingSpecification);
        decodeData(event.data.buffer, event.data.littleEndian);
    });

    function downloadDecodingFunctionality(url) {
        self.module = {};
        self.module.exports = {};
        self.exports = self.module.exports;

        importScripts(url);
        var decodingFunction;
        if (typeof module.exports === "function")
            decodingFunction = self.module.exports;
        else if (typeof exports === "object")
            decodingFunction = self.module.exports.decode;
        else if (typeof decode === "function")
            decodingFunction = decode;
        else
            throw new Error("Could not find decoding function");
        self.decodingFunction = wrappDecodingFunction(decodingFunction);
    }

    function wrappDecodingFunction(decodingFunction) {
        var arity = decodingFunction.length;
        // Variable argument list means we consider this function to be async. and to expect
        // an ArrayBuffer, offset, length and endianness as parameter.
        if (arity === 0)
            return decodingFunction;
        // An arity of two means we have a sync. function taking a DataView and the endianness.
        if (arity === 2)
            return function (buffer, littleEndian, callback) {
                try {
                    var result = decodingFunction(buffer, littleEndian);
                    callback(null, result);
                } catch (e) {
                    callback(e, null);
                }
            };
        if (arity === 3)
            return  decodingFunction;

        new Error("Malformed decoding function");
    }

    function decodeData(buffer, littleEndian) {
        self.decodingFunction(buffer, littleEndian, function (error, result) {
            if (error)
                throw error;

            self.postMessage(result);
        });
    }
}

function DecodingWorkerPool(poolSize) {
    this._poolSize = poolSize || 4;
    this._pool = [];
    this._taskQueue = [];

    this._fillPool();
}

DecodingWorkerPool.prototype.scheduleTask = function (decodingTask, callback) {
    this._taskQueue.push({
        decodingTask: decodingTask,
        callback: callback
    });
    this._processQueue();
};

DecodingWorkerPool.prototype._processQueue = function () {
    if (this._pool.length === 0 || this._taskQueue.length === 0)
        return;

    var taskInfo = this._taskQueue.shift();
    var worker = this._pool.shift();
    var self = this;

    worker.onmessage = function (event) {
        self._pool.push(this);
        taskInfo.callback(null, event.data);
        self._processQueue();
    };

    worker.onerror = function (event) {
        self._pool.push(this);
        taskInfo.callback(event);
        event.preventDefault();
        self._processQueue();
    };

    worker.postMessage(taskInfo.decodingTask, [taskInfo.decodingTask.buffer]);
};

DecodingWorkerPool.prototype._fillPool = function () {
    for (var i = 0; i < this._poolSize; ++i)
        this._pool.push(this._createWorker());
};

DecodingWorkerPool.prototype._createWorker = function () {
    var str = worker.toString() + "\nworker();";
    return new Worker(URL.createObjectURL(new Blob([str], { type: "application/javascript"} )));
};

exports = module.exports = DecodingWorkerPool;

},{}],3:[function(require,module,exports){
"use strict";

var DecodingWorkerPool = require("./decoding_worker_pool");

var pool = new DecodingWorkerPool();
exports = module.exports = function (decodingSpecification, buffer, littleEndian, callback) {
    pool.scheduleTask({
        decodingSpecification: decodingSpecification,
        buffer: buffer,
        littleEndian: littleEndian
    }, callback)
};


},{"./decoding_worker_pool":2}],4:[function(require,module,exports){
// # Chunk

// A `chunk` is an independent part of a blast stream that can be processed by the client individually and without
// any information of other chunks in the stream except for the preamble.
// A `chunk` may contain multiple encodedValues from the original object.
// However, it will never contain partiall data such that another `chunk` is necessary to decode a value.

// ## Structure

// A chunk has the following binary structure.
//
// Octets 0--3: Overall chunks size (OCS).
// Octets 4--7: Header definition size (HS).
// Octets 8--8+<HS>: Definitions of the payload in this chunk.
// Octets: 9+<HS>--<OCS>: Payload.

// ### Header definition

// A chunks header definition is an array of key-value pairs.
// In JavaScript this simply maps to objects.
// The header definition of each chunk is encoded and can be decoded using the procedure
// specified in the preamble of the stream.
// Each definition is structured as follows:

// - path: A JPath specifying the original path of the value in the
// - offset: Byte offset from the beginning of the chunk's payload where the encoded data starts.
// - size: Byte length of the encoded data.
// - decodingSpecification: A URL that uniquely identifies the decoding procedure necessary to decode the data
// defined in this entry.
// - metadata: Possible metadata associated with this value.

// ### Payload

// A chunks payload is a flat `ArrayBuffer` of arbitrary size.
// It contains all encodedData specified in the header definitions.
// The size of each chunk's payload can be calculated as:
// <OCS>-9+<HS>.

// ### Signal End Of Stream

// A special chunk, the signal end of stream chunk, contains no payload and thus no header definitions.
// This chunk signals the receiver the end of the stream.
// It is therefore not valid to call a chunks toBuffer method if no payload was added beforehand.

"use strict";

var BlastError = require("./error");

// Constructs a new chunk that can be filled with data.
// A newly constructed chunk will have a payload of size 0 and a header definition size of 0.
// It is invalid to call toBuffer on a fresh chunk!
function Chunk() {
    this._headerDefinitions = [];

    this._payload = [];
    this._currentOffset = 0;
}

Object.defineProperties(Chunk.prototype, {
    payload: {
        get: function () {
          return this._payload;
        }
    },
    payloadSize: {
        get: function () {
            return this._currentOffset;
        }
    },
    headerDefinitions: {
        get: function () {
            return this._headerDefinitions;
        }
    }
});

//Adds the given payload to the chunk.
// A header definition entry will be generated with the given path, the decodingSpecification and metadata.
Chunk.prototype.add = function (encodedData) {
    if (!Array.isArray(encodedData.encodedValue))
        encodedData.encodedValue = [encodedData.encodedValue];

    encodedData.encodedValue = encodedData.encodedValue.map(function (typedArrayOrBuffer) {
         if (typedArrayOrBuffer.buffer)
            return typedArrayOrBuffer.buffer;

        return typedArrayOrBuffer;
    });

    var size = encodedData.encodedValue.reduce(function (currentSize, buffer) {
        return currentSize + length(buffer);
    }, 0);

    this._payload = this._payload.concat(encodedData.encodedValue);
    this._headerDefinitions.push({
        path: encodedData.path,
        offset: this._currentOffset,
        size: size,
        decodingSpecification: encodedData.decodingSpecification,
        metadata: encodedData.metadata
    });
    this._currentOffset += size;
};

function length(buffer) {
	return typeof buffer.byteLength !== "undefined" ? buffer.byteLength : buffer.length;
}

exports = module.exports = Chunk;


},{"./error":7}],5:[function(require,module,exports){
// # Chunker

// The `Chunker` represents the second step in the blast pipeline and is a NodeJS transform stream.
// It takes encodedData and transforms them into blast chunks.

"use strict"

var util = require("util");
var Transform = require("stream").Transform;

var Chunk = require("./chunk");
var callImmediate = require("./util/call_immediate");

// Constructs a Chunker.
// `chunkSize` may specify the size of a chunk in bytes.
// This size, however, is only a softlimit and chunks may contain more or less bytes depending on the size of
// individual values.
function Chunker(options) {
	Transform.call(this, {
		objectMode: true
	});

    this._chunk = new Chunk();

    options = options || {};
    this._chunkSize = options.chunkSize || (1 << 30);
    this._async = typeof options.async !== "undefined" ? options.async : true;
}

util.inherits(Chunker, Transform);

Chunker.prototype._transform = function (encodedData, _, callback) {
    callImmediate(this._appendToChunk.bind(this, encodedData, callback), this._async);
};

Chunker.prototype._appendToChunk = function (encodedData, callback) {
	this._chunk.add(encodedData);
    if (this._chunk.payloadSize > this._chunkSize) {
        this.push(this._chunk);
        this._chunk = new Chunk();
    }
    callback();
};

Chunker.prototype._flush = function (callback) {
    if (this._chunk.payloadSize > 0) {
        var self = this;
        callImmediate(function () {
            self.push(self._chunk);
            callback();
        }, this._async);
    } else {
        callback();
    }
};

exports = module.exports = Chunker;

},{"./chunk":4,"./util/call_immediate":16,"stream":61,"util":69}],6:[function(require,module,exports){
"use strict"

var util = require("util");
var Transform = require("stream").Transform;

var callImmediate = require("./util/call_immediate");

function Dechunker(options) {
    Transform.call(this, {
        objectMode: true
    });

    options = options || {};

    this._async = typeof options.async !== "undefined" ? options.async : true;
}

util.inherits(Dechunker, Transform);

Dechunker.prototype._transform = function (chunk, _, callback) {
    var self = this;
    callImmediate(function () {
        // Chunks generated by the chunker have an array of ArrayBuffers as payload.
        // Chunks received by the stream receiver, however, only have a single payload ArrayBuffer.
        if (!Array.isArray(chunk.payload))
            chunk.payload = [chunk.payload];

        chunk.headerDefinitions.forEach(function (headerDefinition) {
            var offset = headerDefinition.offset;
            var buffer = chunk.payload[0];

            // Find the buffer for the given offset
            var sizeOfPreviousBuffers = chunk.payload[0].byteLength;
            for (var i = 1; i < chunk.payload.length; ++i) {
                if (offset <= sizeOfPreviousBuffers + chunk.payload[i].byteLength) {
                    buffer = chunk.payload[i];
                    offset = offset - sizeOfPreviousBuffers;
                }
                sizeOfPreviousBuffers += chunk.payload[i].byteLength;
            }

            if (!buffer)
                return self.emit("eror", new Error("Could not find a buffer for the given offset!"));

            self.push({
                encodedValue: buffer.slice(offset, offset + headerDefinition.size),
                path: headerDefinition.path,
                decodingSpecification: headerDefinition.decodingSpecification,
                metadata: headerDefinition.metadata,
                littleEndian: chunk.littleEndian
            });
        });
        callback();
    }, this._async);
};

exports = module.exports = Dechunker;

},{"./util/call_immediate":16,"stream":61,"util":69}],7:[function(require,module,exports){
"use strict";

var util = require("util");

function BlastError(message, stackStartFunction) {
	this.message = message;
};

util.inherits(BlastError, Error);

BlastError.prototype.name = "Blast Error";

exports = module.exports = BlastError;

},{"util":69}],8:[function(require,module,exports){
"use strict";

exports.ObjectEncoder = require("./object_encoder");
exports.Chunker = require("./chunker");
exports.StreamGenerator = require("./stream_generator");
exports.StreamReceiver = require("./stream_receiver");
exports.Dechunker = require("./dechunker");
exports.ValueDecoder = require("./value_decoder");
exports.ObjectAssembler = require("./object_assembler");

exports.Preamble = require("./preamble");
exports.Chunk = require("./chunk");

exports.Error = require("./error");

exports.wrapSyncFunction = require("./util/wrap_sync_function");
exports.isLittleEndianArchitecture = require("./util/is_little_endian_architecture");

},{"./chunk":4,"./chunker":5,"./dechunker":6,"./error":7,"./object_assembler":10,"./object_encoder":11,"./preamble":12,"./stream_generator":14,"./stream_receiver":15,"./util/is_little_endian_architecture":17,"./util/wrap_sync_function":18,"./value_decoder":19}],9:[function(require,module,exports){
(function (__dirname){
"use strict";

var child = require("child_process");

exports = module.exports = function (decodingSpecification, buffer, littleEndian, callback) {
    var c = child.fork(__dirname + "/child_module");
    c.on("message", function (message) {
        switch (message.type) {
            case "result":
                callback(null, new Uint8Array(message.result).buffer);
                break;
            default:
                break;
        }
    });
    c.on("error", function (error) {
	    c.disconnect();
        callback(error);
    });

    c.send({
        decodingSpecification: decodingSpecification,
        buffer: buffer,
	    littleEndian: littleEndian
    });
};


}).call(this,"/..\\node_modules\\blast\\lib\\node")
},{"child_process":52}],10:[function(require,module,exports){
"use strict"

var util = require("util");
var Transform = require("stream").Transform;

var jpath = require("jpath");

var callImmediate = require("./util/call_immediate");

function ObjectAssembler(options) {
    Transform.call(this, {
        objectMode: true
    });

    this._decodedObject = {};
    options = options || {};

    this._async = typeof options.async !== "undefined" ? options.async : true;
}

util.inherits(ObjectAssembler, Transform);

ObjectAssembler.prototype._transform = function (decodedData, _, callback) {
    var self = this;
    callImmediate(function () {
        jpath.evaluate(decodedData.path, self._decodedObject).forEach(function (result) {
            if (result.isRoot)
                self._decodedObject = decodedData.value;
            else
                result.value = decodedData.value;
        });
        callback();
    }, this._async);
};

ObjectAssembler.prototype._flush = function (callback) {
    var self = this;
    callImmediate(function () {
        self.push(self._decodedObject);
        callback();
    }, this._async);
};

exports = module.exports = ObjectAssembler;

},{"./util/call_immediate":16,"jpath":38,"stream":61,"util":69}],11:[function(require,module,exports){
// # ObjectEncoder

// An `ObjectEncoder` is a NodeJS transform stream that transforms a given object using the specified encoders.
// Encoders are mapped to values using JPath expressions.
// ```javascript
// {
//		path: /selector
//		encoder: encoderForValueAtPath
// }
// ```
// An array of these mappings is passed to the write functions as the second argument.
// Only values that are selected by the JPath expressions are transformed.
// The path-encoder mapping can optionally include also metadata that is not encoded unconditionally
// forwarded through the stream.


// ## Encoder

// An encoder is an object that provides the following interface:

// - A function `encode` that given a value returns an `ArrayBuffer`.
// This function is called with two arguments, the value to encode and a boolean specifying if the resulting buffer
// should be in little-endian (`true`) or big-endian (`false`) format.
// Endiannes is specified with using a boolean that corresponds to the interface of the DataView in the
// TypedArray specification and can savely be passed as the second argument to all `DataView#get` and `DataView#set` methods.
// Optionally the function can take a third argument, a callback, in case the encoding is asynchronous.
// An `encode` function that takes three or a variable number of argument is considered to be asynchronous.
// The provided callback expects two parameters:
//
// 1. An error object in case anything went wrong.
// 2. The `ArrayBuffer` containing the encoded value.
//
// If the function is synchronous, errors shoud be reported by throwing an exception.
//
// - A property `decodingSpecification` that contains a URL that uniquely identifies the decoding procedure
// necessary to decode the original data from the `ArrayBuffer` returned by the `encode` function.
// This URL maybe queried for a decoding implementation at the client side using an HTTP-GET request
// with an accept-header: "application/javascript".

"use strict";

var util = require("util");
var Transform = require('stream').Transform;

var async = require("async");
var jpath = require("jpath");

var isLittleEndianArchitecture = require("./util/is_little_endian_architecture");
var wrapSyncFunction = require("./util/wrap_sync_function");
var callImmediate = require("./util/call_immediate");

// Creates an ObjectEncoder instance.
// If littleEndian is undefined the current system architecture's endianness will be used.
// The given value for littleEndian will be forwarded to all encoders.
function ObjectEncoder(options) {
	Transform.call(this, {
		objectMode: true
	});

    options = options || {};

    this._littleEndian = typeof options.littleEndian !== "undefined" ? options.littleEndian : isLittleEndianArchitecture();
    this._async = typeof options.async !== "undefined" ? options.async : true;
}

util.inherits(ObjectEncoder, Transform);

// Starts the encoding of the given object considering the given path encoder mappings.
// We do not start the encoding process directly, but delay encoding using setImmediate.
// Encoding will start as soon as the VM has retaken control and completed other pending operations.
// This is important to mimic the behavior of all NodeJS streams that are asynchronous.
// The user can now register event listeners after calling write/end without risking to
// miss events since the actual encoding will start as early as the users current control flow ends.
ObjectEncoder.prototype._transform = function (objectToEncode, selectorOptions, callback) {
    callImmediate(this._encode.bind(this, objectToEncode, selectorOptions, callback), this._async);
};

ObjectEncoder.prototype._encode = function (objectToEncode, selectorOptions, callback) {
    var self = this;
    var unmatchedParts = objectToEncode;
    var selectorOptionsCount = selectorOptions.length;
    var currentSelectorIdx = 0;
	async.eachSeries(selectorOptions, function (options, callback) {
		var results = jpath.evaluate(options.path, unmatchedParts)
		async.each(results.definedResults, function (result, callback) {
			var encoder = options.encoder;
			wrapSyncFunction(encoder.encode.bind(encoder))(result.value, self._littleEndian, function (error, encodedValue) {
				if (error)
					return self.emit("error", error);
				self.push({
                    encodedValue: encodedValue,
					path: result.path,
					decodingSpecification: encoder.decodingSpecification,
					metadata: options.metadata
				});
				callback();
			});
		}, callback);
        ++currentSelectorIdx;
        // Only evaluate unmatched part if there is another selector following
//        if (currentSelectorIdx < selectorOptionsCount)
//		    unmatchedParts = jpath.extractUncoveredParts(options.path, unmatchedParts);

	}, callback);
};

exports = module.exports = ObjectEncoder;

},{"./util/call_immediate":16,"./util/is_little_endian_architecture":17,"./util/wrap_sync_function":18,"async":21,"jpath":38,"stream":61,"util":69}],12:[function(require,module,exports){
// # Preamble

// The preamble of a blast octet stream comprises the following components:
//
// - Signature: A uint32 value equal to `0x626C7374` (ASCII encoded "blst").
// This signature value is for identification as well as endianness detection of the incoming stream.
// - Major Version: A uint8 value that specifies the major version of the incoming stream's format.
// - Minor Version: A uint8 value that specifies the minor version of the incoming stream;s format.
// - Header Decoding Specification: A NUL "\0" terminated ASCII encoded string that specifies the decoding procedure to
// encode a chunks header information.

"use strict";

var abops = require("abops");

var Preamble = {};

// ASCII blst
Object.defineProperties(Preamble, {
	/**
	 * The signature bytes that can be used to identify the octet stream and its endianness.
	 *
	 * @public
	 * @property signature
	 * @constant
	 * @type {uint32}
	 */
	signature: {
		get: function () {
			// ASCII blst
			return 0x626C7374;
		}
	},
	/**
	 * Minor version number
	 *
	 * Size: 1 Octets
	 * @public
	 * @property majorVersion
	 * @constant
	 * @type {int}
	 */
	majorVersion: {
		get: function () {
			return 0x00;
		}
	},
	/**
	 * Minor version number
	 *
	 * Size: 1 Octets
	 * @public
	 * @property minorVersion
	 * @constant
	 * @type {int}
	 */
	minorVersion: {
		get: function () {
			return 0x01;
		}
	}
});

/**
 * Constructs a blast preamble buffer containing the binary representation of the preamble in the given endianness.
 * This includes 4 octets signature bytes + 1 octet major version number + 1 octet minor version number + variable length
 * ASCII encoded NUL terminated URL for the header decoding specification.
 *
 *
 * @public
 * @function createPreambleBuffer
 * @param {string} headerDecodingSpecification A URL that uniquely identifies the decoding procedure to decode the header
 * information of the chunks in the stream.
 * @param {bool} [littleEndian = false] If true the buffer will be written in little-endian format.
 * @return {ArrayBuffer} An ArrayBuffer containing the preamble octet stream.
 */
Preamble.buffer = function (headerDecodingSpecification, littleEndian) {
	// The size of the buffer:
	// 4 octet signature + 1 octet minor version + 1 octet major version + HeaderDecoderURL as ascii + NULL byte
	var urlSize = abops.byteSizeForString(headerDecodingSpecification, "ascii") + 1;
	var bufferSize = 4 + 1 + 1 + urlSize;
	var bufferView = new DataView(new ArrayBuffer(bufferSize));
	var bufferOffset = 0;

	bufferView.setUint32(bufferOffset, Preamble.signature, littleEndian);
	bufferOffset += 4;

	bufferView.setUint8(bufferOffset, Preamble.majorVersion);
	bufferOffset += 1;

	bufferView.setUint8(bufferOffset, Preamble.minorVersion);
	bufferOffset += 1;

    abops.setCString(bufferView, bufferOffset, headerDecodingSpecification);

	return bufferView.buffer;
};

exports = module.exports = Preamble;

},{"abops":20}],13:[function(require,module,exports){
(function (process){
"use strict";

if (process.browser)
    exports = module.exports = require("./browser/run_external_decoding");
else
    exports = module.exports = require("./node/run_external_decoding");

}).call(this,require("+NscNm"))
},{"+NscNm":59,"./browser/run_external_decoding":3,"./node/run_external_decoding":9}],14:[function(require,module,exports){
(function (process,Buffer){
// # StreamGenerator

// Generates the final output stream that can be sent over the wire.
// It takes chunks as generated by the Chunker and calls their toBuffer method.
// This buffer is then emitted in the data event.
// It also generates the preamble of the stream.
// For convinience it differentiates between NodeJS and Browser environment.
// In NodeJS the buffers are NodeJS buffers that can be piped into a server's response object.

"use strict"

var util = require("util");
var Transform = require("stream").Transform;

var jsonCodec = require("blast-codecs").json;

var BlastError = require("./error");
var Preamble = require("./preamble");
var Chunk = require("./chunk");
var wrapSyncFunction = require("./util/wrap_sync_function");
var isLittleEndianArchitecture = require("./util/is_little_endian_architecture");
var callImmediate = require("./util/call_immediate");

function StreamGenerator(options) {
    Transform.call(this);

    this._writableState.objectMode = true;
    this._readableState.objectMode = false;

    options = options || {};

    this._headerEncoder = options.headerEncoder || {
		encode: wrapSyncFunction(jsonCodec.encode.bind(jsonCodec)),
		decodingSpecification: "http://www.blast-format.com/0.1/headerDecodingSpecification/"
	};
	this._littleEndian = typeof options.littleEndian !== "undefined" ? options.littleEndian : isLittleEndianArchitecture();
    this._async = typeof options.async !== "undefined" ? options.async : true;
}

util.inherits(StreamGenerator, Transform);

StreamGenerator.prototype._transform = function (chunk, _, callback) {
	if (!this._preamblePushed)
        callImmediate(this._pushPreamble.bind(this), this._async);
    callImmediate(this._encodeChunk.bind(this, chunk, callback), this._async);
};

StreamGenerator.prototype._pushPreamble = function () {
	this._pushBuffer(Preamble.buffer(this._headerEncoder.decodingSpecification, this._littleEndian));
	this._preamblePushed = true;
};

StreamGenerator.prototype._encodeChunk = function (chunk, callback) {
	var self = this;
    this._headerEncoder.encode(chunk.headerDefinitions, this._littleEndian, function (error, headerDefinitionsBuffer) {
        if (error)
            return self.emit("error", error);

        var headerSize = headerDefinitionsBuffer.byteLength;

        // The overall buffer contains not only the header and the payload,
        // but 4 bytes for the header size and 4 bytes for the overall chunk size;
        var overallChunkSize = 4 + 4 + headerSize + chunk.payloadSize;
        var sizeBuffer = new ArrayBuffer(8);
        var sizeView = new DataView(sizeBuffer);

        sizeView.setUint32(0, overallChunkSize, self._littleEndian);
        sizeView.setUint32(4, headerSize, self._littleEndian);
        self._pushBuffer(sizeBuffer);
        self._pushBuffer(headerDefinitionsBuffer);
        chunk.payload.forEach(self._pushBuffer.bind(self));
        callback();
    });
};

StreamGenerator.prototype._pushBuffer = function (buffer) {
	this.push(toBuffer(buffer));
};

StreamGenerator.prototype._flush = function (callback) {
    var self = this;
    callImmediate(function () {
        self._pushBuffer(new ArrayBuffer(4));
        callback();
    }, this._async);
};

function toBuffer(buffer) {
	if (process.browser) {
		if (buffer instanceof ArrayBuffer)
			return buffer;
		else
			return buffer.toArrayBuffer();
	}

	if (buffer instanceof ArrayBuffer)
		return new Buffer(new Uint8Array(buffer));
	else
		return buffer;

}

exports = module.exports = StreamGenerator;

}).call(this,require("+NscNm"),require("buffer").Buffer)
},{"+NscNm":59,"./chunk":4,"./error":7,"./preamble":12,"./util/call_immediate":16,"./util/is_little_endian_architecture":17,"./util/wrap_sync_function":18,"blast-codecs":25,"buffer":53,"stream":61,"util":69}],15:[function(require,module,exports){
"use strict";

var util = require("util");
var Transform = require("stream").Transform;

var abops = require("abops");
var jsonCodec = require("blast-codecs").json;

var BlastError = require("./error");
var Preamble = require("./preamble");
var wrapSyncFunction = require("./util/wrap_sync_function");
var isLittleEndianArchitecture = require("./util/is_little_endian_architecture");
var callImmediate = require("./util/call_immediate");

function StreamReceiver(options) {
	Transform.call(this);

	this._writableState.objectMode = false;
	this._readableState.objectMode = true;

	this._preambleReceived = false;
	this._lastChunkReceived = false;
	this._littleEndian = undefined;
	this._headerDecoder = jsonCodec;

	this._buffer = new ArrayBuffer(0);
	this._currentBufferOffset = 0;

    options = options || {};
    this._async = typeof options.async !== "undefined" ? options.async : true;
}

util.inherits(StreamReceiver, Transform);

StreamReceiver.prototype._transform = function (data, _, callback) {
    callImmediate(this._decode.bind(this, data, callback), this._async);
};

StreamReceiver.prototype._decode = function (dataBuffer, callback) {
	// We do not expect that `dataBuffer` is a complete chunk or preamble.
	// If we haven't received a preamble yet, we expect the first data to either be the complete or at least a part of
	// the preamble.
	this._buffer = abops.concat(this._buffer, dataBuffer);
	if (!this._preambleReceived) {
		var bytesRead = this._decodePreamble(new DataView(this._buffer));
		// If bytes were read we received a complete preamble.
		if (bytesRead !== 0) {
			this._preambleReceived = true;
			this._currentBufferOffset = bytesRead;
		}
	}

	// If the last chunk (Null Chunk) was already received there cannot be more data
	if (this._lastChunkReceived)
		return this.emit("error", new BlastError("Last chunk already received!"));

	// We can only start decoding a chunk if the preamble was already received and if at least 4 Bytes can be read to get the chunks size.
	if (!this._preambleReceived || this._currentBufferOffset + 4 > this._buffer.byteLength)
        return callback();

	// We try to decode chunks until nothing can be read or the buffer is empty.
	var bytesRead;
	do {
		bytesRead = this._decodeChunk(new DataView(this._buffer, this._currentBufferOffset));
		// This is save. If bytesRead is zero nothing happens.
		this._currentBufferOffset += bytesRead;
	} while (bytesRead > 0 && this._currentBufferOffset < this._buffer.byteLength && !this._lastChunkReceived);

	// Discard current buffer if read completely.
	if (this._currentBufferOffset === this._buffer.byteLength) {
		this._buffer = new ArrayBuffer(0);
		this._currentBufferOffset = 0;
	}
    callback();
};

StreamReceiver.prototype._decodePreamble = function (bufferView) {
	// We know that every preamble has to have at least
	// 4 Byte Signature + 2 Byte Version information + 5 Byte Header decoding specification and null byte.
	// We can assume 5 byte for the header decoding specification because a URL has to have at least 4 characters to be valid,
	// One character domain name plus a dot and min. two characters tld.
	if (bufferView.byteLength < 11)
		return 0;

	var signature = bufferView.getUint32(0);
	// If the signature byte does not match we flip endianness.
	if (signature === Preamble.signature)
		this._littleEndian = false;
	else if (flipEndiannessInt32(signature) === Preamble.signature)
		this._littleEndian = true;
	else
		return this.emit("error", new BlastError("Could not identify preamble! Signature bytes do not match!"));

	this._majorVersion = bufferView.getUint8(4);
	this._minorVersion = bufferView.getUint8(5);
	var offset = 6;
    this._headerDecodingSpecification = abops.getCString(bufferView, offset);
    // One byte for the NUL char
    offset += this._headerDecodingSpecification.length + 1;

	if (offset > 6)
		return offset;

	return 0;
};

function flipEndiannessInt32(n) {
	return ((n >> 24) & 0xff) | ((n << 8) & 0xff0000) | ((n >> 8) & 0xff00) | ((n << 24) & 0xff000000);
}

StreamReceiver.prototype._decodeChunk = function (bufferView) {
	var chunkSize = bufferView.getUint32(0, this._littleEndian);

	if (bufferView.byteLength < chunkSize)
		return 0;

	// Last chunk has size 0.
	if (chunkSize === 0) {
        this._lastChunkReceived = true;
        return 4;
    }

	var headerSize = bufferView.getUint32(4, this._littleEndian);
	var headerDefinitions = this._headerDecoder.decode(bufferView.buffer.slice(bufferView.byteOffset + 8, bufferView.byteOffset + 8 + headerSize));
	var payloadOffset = 8 + headerSize;

    // Adjust the offset such that we can share a single ArrayBuffer.
    headerDefinitions.forEach(function (definition) {
        definition.offset += bufferView.byteOffset + payloadOffset;
    });

    this.push({
        payload: bufferView.buffer,
        headerDefinitions: headerDefinitions,
        littleEndian: this._littleEndian
    });

	return chunkSize;
};


exports = module.exports = StreamReceiver;

},{"./error":7,"./preamble":12,"./util/call_immediate":16,"./util/is_little_endian_architecture":17,"./util/wrap_sync_function":18,"abops":20,"blast-codecs":25,"stream":61,"util":69}],16:[function(require,module,exports){
"use strict";

require("setimmediate");

exports = module.exports = function (fn, async) {
    if (async)
        setImmediate(fn);
    else
        fn();
};

},{"setimmediate":51}],17:[function(require,module,exports){
"use strict"

exports = module.exports = function () {
    // DataView#getUint16 will read 1 on big-endian systems.
    return new DataView(new Uint16Array([256]).buffer).getUint16(0, true) === 256;
};


},{}],18:[function(require,module,exports){
"use strict";

exports = module.exports = function (fn) {
    var arity = fn.length;
    // Variable argument list means we consider this function to be async.
    if (arity === 0)
        return fn;
    // An arity of two means we have a sync. function, so we wrap it.
    if (arity === 2)
        return function (dataOrBuffer, littleEndian, callback) {
            try {
                var result = fn(dataOrBuffer, littleEndian);
                callback(null, result);
            } catch (e) {
                callback(e, null);
            }
        };
    if (arity === 3)
        return fn;

    new Error("Malformed decoding function");
};

},{}],19:[function(require,module,exports){
"use strict"

var util = require("util");
var Transform = require("stream").Transform;

var runExternalDecoding = require("./run_external_decoding");
var wrapSyncFunction = require("./util/wrap_sync_function");
var callImmediate = require("./util/call_immediate");

function ValueDecoder(options) {
    Transform.call(this, {
        objectMode: true
    });
    options = options || {};
    this._decodingSpecificationMap = options.decodingSpecificationMap || {};
    this._async = typeof options.async !== "undefined" ? options.async : true;
}

util.inherits(ValueDecoder, Transform);

ValueDecoder.prototype._transform = function (encodedData, _, callback) {
    var self = this;
    callImmediate(function () {
        var decodeFunction = runExternalDecoding.bind(undefined, encodedData.decodingSpecification);

        var codec = self._decodingSpecificationMap[encodedData.decodingSpecification]
        if (codec)
            decodeFunction = wrapSyncFunction(codec.decode ? codec.decode : codec);
        decodeFunction(encodedData.encodedValue, encodedData.littleEndian, function (error, decodedValue) {
            if (error)
                return self.emit("error", error);

            self.push({
                value: decodedValue,
                path: encodedData.path,
                metadata: encodedData.metadata
            });
            callback();
        });
    }, this._async);
};

exports = module.exports = ValueDecoder;

},{"./run_external_decoding":13,"./util/call_immediate":16,"./util/wrap_sync_function":18,"stream":61,"util":69}],20:[function(require,module,exports){
"use strict";

/**
 * Returns a Uint8Array for the given ArrayBuffer.
 * If a ArrayBufferView or a DataView is given, the underlying buffer will be used and the set
 * offset and length will be respected.
 *
 * @private
 * @function toUint8Array
 * @param {ArrayBufferView|ArrayBuffer} arrayBuffer The ArrayBuffer or a view into an ArrayBuffer for which to create a Uint8Array view.
 * @returns {Uint8Array} A Uint8Array referencing the given ArrayBuffer.
 */
function toUint8Array(arrayBuffer, offset, length) {
	offset = +offset || 0;
	length = +length;
	if (typeof arrayBuffer.BYTES_PER_ELEMENT !== "undefined" || arrayBuffer instanceof DataView) {
		return new Uint8Array(arrayBuffer.buffer, offset + arrayBuffer.byteOffset, length || arrayBuffer.byteLength - offset);
	}
	else {
		return new Uint8Array(arrayBuffer, offset, length || arrayBuffer.byteLength - offset);
	}
}

/**
 * Concatenates a variable list of ArrayBuffers.
 * If one of the arguments is a DataView or an `ArrayBufferView` the underlying buffer will be used and
 * the set offset and length will be respected.
 *
 * @public
 * @function concat
 * @param {ArrayBuffer...|ArrayBufferView...} buffers A variable list of plain ArrayBuffers or ArrayBufferViews.
 * @returns {ArrayBuffer} A new ArrayBuffer as the result of concatenating the given buffers.
 */
exports.concat = function () {
	if (arguments.length === 1)
		return toUint8Array(arguments[0]).buffer;
	else
		var arrayBufferList = Array.prototype.slice.call(arguments);

    // Get a list of all buffers and their total size
    var totalSize = 0;
    var byteBuffers = arrayBufferList.map(function (arrayBuffer) {
        // If a `DataView` or a typed array was passed instead of a plain `ArrayBuffer`
        // the underlying buffer will be used instead.
        var byteBuffer = toUint8Array(arrayBuffer);
        totalSize += byteBuffer.length;
        return byteBuffer;
    }).filter(function (byteBuffer) {
            return byteBuffer.length > 0;
        });

    if (byteBuffers.length === 0)
        return new ArrayBuffer(0);

    if (byteBuffers.length === 1)
        return byteBuffers[0].buffer;

	// This will contain the final concatenated buffer.
    var concatBuffer = new Uint8Array(totalSize);

    var offset = 0;
    byteBuffers.forEach(function (byteBuffer) {
        concatBuffer.set(byteBuffer, offset);
        offset += byteBuffer.length;
    });

    return concatBuffer.buffer;
};

/**
 * Flips the endianness of the given TypedArray in-place.
 *
 * @public
 * @function flipEndianness
 * @param {Typed Array} typedArray The typed array for which the endianness should be flipped.
 */
exports.flipEndianness = function (typedArray) {
	// Uint8ClampedArray is a rather new part of the typed array specification and not fully supported by
	// all browsers.
	var Uint8ClampedArrayType;
	if (typeof Uint8ClampedArray === "undefined")
		Uint8ClampedArrayType = function dummy() {};
	else
		Uint8ClampedArrayType = Uint8ClampedArray;

	if (typedArray instanceof Int8Array || typedArray instanceof Uint8Array || typedArray instanceof Uint8ClampedArrayType)
        return typedArray;

    var byteArray = new Uint8Array(typedArray.buffer, typedArray.offset, typedArray.byteLength);
    for (var i = 0; i < typedArray.byteLength; i += typedArray.BYTES_PER_ELEMENT) {
        var leftIdx = i;
        var rightIdx = i + typedArray.BYTES_PER_ELEMENT - 1;
	    // Walk from left and right and swap bytes.
        while (leftIdx < rightIdx) {
            var tmp = byteArray[leftIdx];
            byteArray[leftIdx] = byteArray[rightIdx];
            byteArray[rightIdx] = tmp;
            ++leftIdx;
            --rightIdx;
        }
    }

    return typedArray;
};

// # String handling

// JavaScript string are UTF-16 encoded.
// To handle conversion into different unicode encodings, mainly UTF-8, we convert JavaScript string
// into an array of unicode code points that can easily converted into different encodings.

/**
 * Converts the given JavaScript string into an array of unicode code points.
 *
 * @private
 * @function stringToUnicodeCodePoints
 * @param {string} string The string to convert.
 * @returns {number[]} The array of unicode code points of the given string.
 */
function stringToUnicodeCodePoints(string) {
	var output = [];
	var	counter = 0;
	var length = string.length;
	var value;
	var extra;

	while (counter < length) {
		// JavaScripts String#charCodeAt function returns values less than 65536.
		// Higher code points are represented using so called surrogate pairs.
		// This means that we have to examine the next character to get the real unicode code point value.
		value = string.charCodeAt(counter++);
		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
			// High surrogate => there is a next character
			extra = string.charCodeAt(counter++);
			if ((extra & 0xFC00) == 0xDC00) {
				// Low surrogate
				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
			} else {
				// Unmatched surrogate; only append this code unit, in case the next
				// code unit is the high surrogate of a surrogate pair
				output.push(value);
				counter--;
			}
		} else {
			output.push(value);
		}
	}
	return output;
}

/**
 * Converts an array of unicode codepoints into a JavaScript string.
 *
 * @private
 * @function unicodeCodePointsToString
 * @param {number[]} codePoints An array of unicode code points.
 * @returns {string} The string represented by the given code points.
 */
function unicodeCodePointsToString(codePoints) {
	return codePoints.map(function(codePoint) {
		var output = '';
		if (codePoint > 0xFFFF) {
			codePoint -= 0x10000;
			output += String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
			codePoint = 0xDC00 | codePoint & 0x3FF;
		}
		output += String.fromCharCode(codePoint);
		return output;
	}).join('');
}

/**
 * Converts the given string into a series of of UTF-8 code units.
 *
 * @private
 * @function utf8encode
 * @param {string} string The string to encode.
 * @returns {number[]} An array of UTF-8 code units for the given string.
 */
function utf8encode(string) {
	var codePoints = stringToUnicodeCodePoints(string);

	// UTF-8 is a variable length encoding that actually supports up to six bytes per character.
	// However, these characters are in the private unicode range and can therefore never occur in JavaScript.
    var utf8CodeUnits = [];
    for (var idx = 0; idx < codePoints.length; ++idx) {
        var codePoint = codePoints[idx];
        if (codePoint < 0x0080)
            utf8CodeUnits.push(codePoint & 0xFF);
        else if (codePoint < 0x0800) {
            utf8CodeUnits.push(0xC0 + (codePoint >>> 6));
            utf8CodeUnits.push(0x80 + (codePoint & 0x3F));
        }
        else if (codePoint < 0x10000) {
            utf8CodeUnits.push(0xe0 + (codePoint >>> 12));
            utf8CodeUnits.push(0x80 + ((codePoint >>> 6) & 0x3f));
            utf8CodeUnits.push(0x80 + (codePoint & 0x3f));
        }
        else {
            utf8CodeUnits.push(0xf0 + (codePoint >>> 18));
            utf8CodeUnits.push(0x80 + ((codePoint >>> 12) & 0x3f));
            utf8CodeUnits.push(0x80 + ((codePoint >>> 6) & 0x3f));
            utf8CodeUnits.push(0x80 + (codePoint & 0x3f));
        }
    }
    return utf8CodeUnits;
}

/**
 * Decodes a given series of UTF-8 code units into a string.
 *
 * @private
 * @function utf8decode
 * @param {number[]} utf8CodeUnits The UTF-8 code units.
 * @returns {string} The decoded string.
 */
function utf8decode(utf8CodeUnits) {
	var codePoints =  [];
	var idx = 0;
	while (idx < utf8CodeUnits.length) {
		var codeUnit = utf8CodeUnits[idx];
		// We ignore five and six byte characters!
		if (codeUnit > 0xef && codeUnit < 0xf8) {
			codePoints.push((utf8CodeUnits[idx] - 0xf0 << 18) + (utf8CodeUnits[idx + 1] - 0x80 << 12) + (utf8CodeUnits[idx + 2] - 0x80 << 6) + (utf8CodeUnits[idx + 3] - 0x80));
			idx += 4;
		} else if (codeUnit > 0xdf && codeUnit < 0xf0) {
			codePoints.push((utf8CodeUnits[idx] - 0xe0 << 12) + (utf8CodeUnits[idx + 1] - 0x80 << 6) + (utf8CodeUnits[idx + 2] - 0x80));
			idx += 3;
		} else if (codeUnit > 0xbf && codeUnit < 0xe0) {
			codePoints.push((utf8CodeUnits[idx] - 0xc0 << 6) + (utf8CodeUnits[idx + 1] - 0x80));
			idx += 2;
		} else {
			codePoints.push(utf8CodeUnits[idx]);
			idx += 1;
		}
	}

	return unicodeCodePointsToString(codePoints);
}

/**
 * Returns the size in bytes needed to write the given string with the given encoding into a buffer.
 * Currently only ASCII and UTF-8 encoding is supported.
 *
 * @public
 * @function byteSizeForString
 * @param {string} string The string for which to calculate the size.
 * @param {string} [encoding = "UTF-8"] The encoding to use.
 * @returns {number} The size in bytes needed to store the given string in the given encoding.
 */
exports.byteSizeForString = function (string, encoding) {
	var codePoints = stringToUnicodeCodePoints(string);
	encoding = encoding ? encoding.toLowerCase() : "utf-8";

	switch (encoding) {
		case "ascii":
			return codePoints.length;
		case "utf8":
		case "utf-8":
			return codePoints.reduce(function (byteSize, codePoint) {
				return byteSize + (codePoint < 0x0080 ? 1 : (codePoint < 0x0800 ? 2 : (codePoint < 0x10000 ? 3 : 4)));
			}, 0);
	}
};

/**
 * Writes the given string using the given encoding at the specified offset into the buffer.
 * If littleEndian is true, multi-byte values will be written in littleEndian format.
 * Currently only ASCII and UTF-8 encoding is supported which makes endianness a non issue.
 *
 * @public
 * @function setString
 * @param {ArrayBuffer|TypedArray|DataView} arrayBuffer The buffer where the string should be written into.
 * @param {number} offset The offset in bytes at which the string should begin inside the buffer.
 * @param {string} string The string to write.
 * @param {string} [encoding = "UTF-8"] The encoding to use.
 * @param {boolean} [littleEndian = false] If true for multi byte characters will be written in little endian format.
 */
exports.setString = function (arrayBuffer, offset, string, encoding, littleEndian) {
    var bytes = toUint8Array(arrayBuffer, offset);
	encoding = encoding ? encoding.toLowerCase() : "utf-8";

	switch (encoding) {
		case "ascii":
			bytes.set(stringToUnicodeCodePoints(string).map(function (codePoint) { return codePoint % 128; }));
			break;
		case "utf8":
		case "utf-8":
			bytes.set(utf8encode(string));
			break;
	}
};

/**
 * Writes the given string into the given buffer at the chosen offset.
 * The string will be written using ASCII encoding and succeeded by a NUL byte.
 *
 * @public
 * @function setCString
 * @param {ArrayBufferView|ArrayBuffer} arrayBuffer The buffer to write to.
 * @param {number} offset The offset in bytes for the string to begin inside the buffer.
 * @param {string} string The string to write.
 */
exports.setCString = function(arrayBuffer, offset, string) {
    var lastCharacterIdx = offset + this.byteSizeForString(string, "ascii");
    this.setString(arrayBuffer, offset, string, "ascii");
    var bytes = toUint8Array(arrayBuffer, offset);
	bytes[lastCharacterIdx] = 0;
};

/**
 * Reads the given string from the given buffer starting at offset, reading length bytes, using the specified encoding.
 * If littleEndian is true, multi-byte values are expected to bew in littleEndian format.
 * Currently only ASCII and UTF-8 encoding is supported which makes endianness a non issue.
 *
 * @public
 * @function getString
 * @param {ArrayBufferView|ArrayBuffer} arrayBuffer The buffer to read from.
 * @param {number} offset The offset in bytes at which to start reading.
 * @param {number} length The number of bytes to read.
 * @param {string} encoding The encoding of the string.
 * @param {boolean} [littleEndian = false] If true multi-byte characters are expected to be in little endian format.
 * @return {string} The string read from the buffer.
 */
exports.getString = function (arrayBuffer, offset, length, encoding, littleEndian) {
	// Check if length is omitted and encoding is set.
	if (typeof length === "string") {
		encoding = length;
		length = undefined;
	}

	encoding = encoding ? encoding.toLowerCase() : "utf-8";

	var bytes = Array.prototype.slice.call(toUint8Array(arrayBuffer, offset, length));

	switch (encoding) {
		case "ascii":
			return String.fromCharCode.apply(null, bytes.map(function (byte) { return byte % 128; }));
		case "utf8":
		case "utf-8":
			return utf8decode(bytes);
	}
};

/**
 * Reads a NUL terminated ASCII encoded string from the given buffer starting at the given offset.
 *
 * @public
 * @function getCString
 * @param {ArrayBufferView|ArrayBuffer} arrayBuffer The buffer to read from.
 * @param {number} offset The offset in bytes to start reading.
 * @return {string} string The read string.
 */
exports.getCString = function (arrayBuffer, offset) {
	var bytes = toUint8Array(arrayBuffer, offset);

    var asciiCodeUnits = [];
    for (var idx = 0; idx < bytes.byteLength; ++idx) {
        var c = bytes[idx];
        if (c === 0x00)
            break;
	    asciiCodeUnits.push(c);
    }
    return String.fromCharCode.apply(null, asciiCodeUnits);
};

/**
 * Creates an ArrayBuffer filled with the given string.
 * The string will be ASCII encoded and succeeded by a NUL character.
 *
 * @param {string} string The string for which a buffer should be created.
 * @return {ArrayBuffer} An ArrayBuffer containing the given string.
 */
exports.bufferForCString = function (string) {
	// Add one byte for the NUL character
	var buffer = new ArrayBuffer(this.byteSizeForString(string, "ascii") + 1);
	this.setCString(buffer, 0, string);
	return buffer;
};

/**
 * Creates an ArrayBuffer filled with the given string using the given encoding.
 * If littleEndian is true, multi-byte values will be written in littleEndian format.
 * Currently only ASCII and UTF-8 encoding is supported which makes endianness a non issue.
 *
 * @public
 * @function bufferForString
 * @param {string} string The string to for which a buffer should be created.
 * @param {string} encoding The encoding to use.
 * @param {bool} [littleEndian = false] If true multi-byte characters will be written in little-endian format.
 * @returns {ArrayBuffer} An ArrayBuffer containing the given string.
 */
exports.bufferForString = function (string, encoding, littleEndian) {
	var buffer = new ArrayBuffer(this.byteSizeForString(string, encoding));
    this.setString(buffer, 0, string, encoding, littleEndian);
    return buffer;
};

},{}],21:[function(require,module,exports){
(function (process){
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require("+NscNm"))
},{"+NscNm":59}],22:[function(require,module,exports){
"use strict";

var flipEndianessIfNecessary = require("../util/flip_endianness_if_necessary");

var normal = (1 << 0);
var tangent = (1 << 1);
var texcoord = (1 << 2);
var color = (1 << 3);

exports.encode = function (mesh, littleEndian) {
    var vertexCount = mesh.position.length / 3.0;
    var attribs = 0;

    var buffers = [flipEndianessIfNecessary(mesh.position, littleEndian)];

    if (mesh.normal) {
        attribs |= normal;
        buffers.push(flipEndianessIfNecessary(mesh.normal, littleEndian))
    }
    if (mesh.tangent) {
        attribs |= tangent;
        buffers.push(flipEndianessIfNecessary(mesh.tangent, littleEndian));
    }
    if (mesh.texcoord) {
        attribs |= texcoord;
        buffers.push(flipEndianessIfNecessary(mesh.texcoord, littleEndian));
    }
    if (mesh.color) {
        attribs |= color;
        buffers.push(flipEndianessIfNecessary(mesh.color, littleEndian));
    }
    buffers.push(flipEndianessIfNecessary(mesh.index, littleEndian));

    // 3 bytes padding to align following buffer to 4 byte boundaries as neccessary.
    buffers.unshift(new ArrayBuffer(3));
    buffers.unshift(new Uint8Array([attribs]));

    buffers.unshift(flipEndianessIfNecessary(new Uint32Array([vertexCount]), littleEndian));

    return buffers;
};

exports.decode = function (buffer, littleEndian) {
    var view = new DataView(buffer);
    var offset = 0;
    var vertexCount = view.getUint32(offset, littleEndian);
    offset += 4;
    var attribs = view.getUint8(offset);
    offset += 4;

    var mesh = {
        position: flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 3), littleEndian)
    };
    offset += vertexCount * 3 * mesh.position.BYTES_PER_ELEMENT;

    if (attribs & normal) {
        mesh.normal = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 3), littleEndian);
        offset += vertexCount * 3 * mesh.normal.BYTES_PER_ELEMENT;
    }
    if (attribs & tangent) {
        mesh.tangent = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 3), littleEndian);
        offset += vertexCount * 3 * mesh.tangent.BYTES_PER_ELEMENT;
    }
    if (attribs & texcoord) {
        mesh.texcoord = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 2), littleEndian);
        offset += vertexCount * 2 * mesh.texcoord.BYTES_PER_ELEMENT;
    }
    if (attribs & color) {
        mesh.color = flipEndianessIfNecessary(new Float32Array(buffer, offset, vertexCount * 4), littleEndian);
        offset += vertexCount * 4 * mesh.color.BYTES_PER_ELEMENT;
    }

    mesh.index = flipEndianessIfNecessary(new Uint32Array(buffer, offset), littleEndian);

    return mesh;
};

},{"../util/flip_endianness_if_necessary":26}],23:[function(require,module,exports){
"use strict";

var abops = require("abops");

var isLittleEndianArchitecture = require("../util/is_little_endian_architecture");

// We use the first byte to encode the type of the typed array
exports.encode = function (typedArray, littleEndian) {
    var type = typedArray.BYTES_PER_ELEMENT;

    if (typedArray instanceof Float32Array || typedArray instanceof Float64Array)
        type |= (1 << 7);
    else if (typedArray instanceof Uint8Array || typedArray instanceof Uint16Array || typedArray instanceof Uint32Array)
        type |= (1 << 6);

    return abops.concat(new Uint8Array([type]), flipEndiannesIfNecessary(typedArray, littleEndian));
};

exports.decode = function (buffer, littleEndian) {
    var type = new DataView(buffer).getUint8(0);
    buffer = buffer.slice(1);
    var isUnsinged = !!(type & (1 << 6));
    var isFloatingPoint = !!(type & (1 << 7));
    var typedArray = null;
    switch (type & 0x0F) {
        case 1:
            typedArray = isUnsinged ? new Uint8Array(buffer) : new Int8Array(buffer);
            break;
        case 2:
            typedArray = isUnsinged ? new Uint16Array(buffer) : new Int16Array(buffer);
            break;
        case 4:
            typedArray = isUnsinged ? new Uint32Array(buffer) : (isFloatingPoint ? new Float32Array(buffer) : new Int32Array(buffer));
            break;
        case 8:
            typedArray = new Float64Array(buffer);
            break;
        default:
            throw new TypeError("Unexpected type encoding for buffer!");
    }

    return flipEndiannesIfNecessary(typedArray, littleEndian);
};

function flipEndiannesIfNecessary(typedArray, littleEndian) {
    if (littleEndian && !isLittleEndianArchitecture())
        return abops.flipEndianness(typedArray);
    return typedArray;
}

},{"../util/is_little_endian_architecture":27,"abops":28}],24:[function(require,module,exports){
// # JSON Codec

// This simple codec simply uses `JSON.stringify` and `JSON.parse` to encode and decode the given data.

"use strict";

var abops = require("abops");

/**
 * Encodes the given value using JSON.stringify.
 * This string representation will be written into an ArrayBuffer using UTF-8 encoding.
 * The second dummy parameter is only for compatibility with the core library that expects
 * encoders to provide a little-endian parameter to specify the format in which multi-byte values will
 * be written into a buffer.
 * Since we write UTF-8 encoded strings endianness is irrelevant.
 *
 * @public
 * @function encode
 * @param {Mixed} object The value to encode.
 * @returns {ArrayBuffer} An ArrayBuffer containing the UTF-8 encoded string representation of the given value.
 */
exports.encode = function (object, _) {
    return abops.bufferForString(JSON.stringify(object));
};

/**
 * Decodes the given DataView using JSON.parse.
 * It reads the UTF-8 encoded string referenced by the DataView and parses that string assuming that
 * it is a string serialization produced by JSON.stringify or something equivalent.
 *
 * @param {DataView} view The DataView that specifies the buffer and the range from which the string representation will be extracted.
 * @returns {Mixed}
 */
exports.decode = function (buffer, _) {
    return JSON.parse(abops.getString(buffer, 0, "utf-8"));
};

},{"abops":28}],25:[function(require,module,exports){
(function (process){
"use strict";

exports.json = require("./codecs/json");
exports.identity = require("./codecs/identity");
exports.assimpMesh = require("./codecs/assimp_mesh");

exports.isLittleEndianArchitecture = require("./util/is_little_endian_architecture");

if (!process.browser)
    exports.serveCodecs = require("./util/" + "append_routes");

}).call(this,require("+NscNm"))
},{"+NscNm":59,"./codecs/assimp_mesh":22,"./codecs/identity":23,"./codecs/json":24,"./util/is_little_endian_architecture":27}],26:[function(require,module,exports){
"use strict";

var abops = require("abops");
var isLittleEndianArchitecture = require("./is_little_endian_architecture");

exports = module.exports = function (typedArray, littleEndian) {
    if (littleEndian !== isLittleEndianArchitecture())
        return abops.flipEndianness(typedArray);
    return typedArray;
};

},{"./is_little_endian_architecture":27,"abops":28}],27:[function(require,module,exports){
module.exports=require(17)
},{}],28:[function(require,module,exports){
module.exports=require(20)
},{}],29:[function(require,module,exports){
"use strict";

var tokenize = require("./lexing");
var parse = require("./parsing");

var JPathInvalidEscapeSequenceError = require("./invalid_escape_sequence_error");
var JPathParsingError = require("./parsing_error");
var JPathSyntaxError = require("./syntax_error");

function highlightErroneousPart(expression, startIdx, endIdx) {
    var before = expression.substring(0, startIdx);
    var erroneousPart = expression.substring(startIdx, endIdx);
    var after = expression.substring(endIdx);
    return before + ">" + erroneousPart + "<" + after;
}

function compile(pathExpression) {
    try {
        return parse(tokenize(pathExpression));
    } catch (e) {
        if (e instanceof JPathInvalidEscapeSequenceError) {
            var startIdx = pathExpression.indexOf(e.invalidSequence);
            var endIdx = startIdx + e.invalidSequence.length;
            throw new JPathSyntaxError({
                reason: JPathSyntaxError.reasons.invalidEscapeSequence,
                startIdx: startIdx,
                endIdx: endIdx,
                actual: e.invalidSequence,
                expected: e.expected,
                message: "Invalid escape sequence: " + highlightErroneousPart(pathExpression, startIdx, endIdx) + "! Got: " + e.invalidSequence + ", expected: " + e.expected.join(" or ")
            });
        }
        if (e instanceof JPathParsingError) {
            var message = "";
            switch (e.reason) {
                case JPathParsingError.reasons.missingClosingBracket:
                    message = "Missing closing bracket: " + highlightErroneousPart(pathExpression, e.startIdx, e.endIdx);
                    break;
                case JPathParsingError.reasons.unmatchedClosingBracket:
                    message = "Missing opening bracket: " + highlightErroneousPart(pathExpression, e.startIdx, e.endIdx);
                    break;
                case JPathParsingError.reasons.missingClosingParentheses:
                    message = "Missing closing parentheses: " + highlightErroneousPart(pathExpression, e.startIdx, e.endIdx);
                    break;
                case JPathParsingError.reasons.unmatchedClosingParentheses:
                    message = "Missing opening parentheses: " + highlightErroneousPart(pathExpression, e.startIdx, e.endIdx);
                    break;
                case JPathParsingError.reasons.unexpectedToken:
                    message = "Unexpected Token: " + highlightErroneousPart(pathExpression, e.startIdx, e.endIdx);
                    break;
                case JPathParsingError.reasons.invalidExpression:
                    message = "Invalid expression: " + highlightErroneousPart(pathExpression, e.startIdx, e.endIdx);
                    break;
            }
            throw new JPathSyntaxError({
                reason: e.reason,
                startIdx: e.startIdx,
                endIdx: e.endIdx,
                actual: e.invalidSequence,
                expected: e.expected,
                message: message
            });
        }
        throw e;
    }
}

exports = module.exports = compile;

},{"./invalid_escape_sequence_error":39,"./lexing":41,"./parsing":42,"./parsing_error":43,"./syntax_error":49}],30:[function(require,module,exports){
"use strict";

var EvaluationResult = require("./evaluation_result");

function ConstantValueExpression(value) {
	this._value = [new EvaluationResult(value)];
}

ConstantValueExpression.prototype.evaluate = function (_) {
    return this._value;
};

exports = module.exports = ConstantValueExpression;

},{"./evaluation_result":37}],31:[function(require,module,exports){
"use strict";

var EvaluationResult = require("./evaluation_result");

function Context(root, current) {
	this._root = root;
	this._current = current ? current : [new EvaluationResult(this._root)];
}

Object.defineProperties(Context.prototype, {
	root: {
		get: function () {
			return this._root;
		}
	},
	current: {
		get: function () {
			return this._current;
		}
	}
});

exports = module.exports = Context;


},{"./evaluation_result":37}],32:[function(require,module,exports){
"use strict";

var evaluate = require("./evaluation");

exports = module.exports = function (path, object) {
    var coverageObject = {}; //createCoverageObject(object);

    var rootObjectMatched = false;
    var definedResults = evaluate(path, object).definedResults;
    for (var i = 0; i < definedResults.length; ++i) {
        var result =  definedResults[i];
        if (result.isRoot) {
            rootObjectMatched = true;
            break;
        }
        evaluate(result.path, coverageObject).forEach(function (result) {
            result.value = true;
        });
    }

    if (rootObjectMatched)
        return {};

    return extractUncoveredParts(object, coverageObject);
};

function extractUncoveredParts(object, coverage) {
    var uncovered = {};

    if (object.buffer && object.BYTES_PER_ELEMENT) {
        var coveredIndicesLength = coverage.filter(function (value) {
            return value;
        }).length;
        uncovered = new object.constructor(object.length - coveredIndicesLength);

        for (var idx = 0, uncoveredIdx = 0; idx < object.length; ++idx) {
            if (!coverage[idx])
                uncovered[uncoveredIdx++] = object[idx];
        }
    } else {
        if (Array.isArray(object))
            uncovered= [];

        Object.keys(object).forEach(function (key) {
            if (typeof coverage[key] === "object")
                uncovered[key] = extractUncoveredParts(object[key], coverage[key]);
            else if (!coverage[key])
                uncovered[key] = object[key];
            if ((typeof uncovered[key] === "object" && Object.keys(uncovered[key]).length === 0) || (Array.isArray(uncovered[key]) && uncovered[key].length === 0))
                delete uncovered[key];
        });
    }

    return uncovered;
}


},{"./evaluation":36}],33:[function(require,module,exports){
"use strict";

var EvaluationResult = require("./evaluation_result");

function DescentExpression() {}

DescentExpression.prototype.evaluate = function (context) {
	var x = Array.prototype.concat.apply([], context.current.filter(function (result) {
        return result.isDefined();
    }).map(function (result) {
            var descendants = [];
            Object.keys(result.value).forEach(function (key) {
                descendants.push(new EvaluationResult(result, key));
            });
            return descendants;
	}));
    return x;
};

exports = module.exports = DescentExpression;

},{"./evaluation_result":37}],34:[function(require,module,exports){
(function (process){
// # JPathError

// JPathError represents the base class of the error hierarchy.
// It takes a printable message and a constructor to build a stack trace.
// It inherits from node's generic Error class to allow for catch all handlers.

"use strict";

var util = require("util");

/**
 * Creates a JPathError.
 *
 * @private
 * @constructor
 * @type JPathError
 * @param {string} message Custom error message for logging.
 */
function JPathError(message) {
    Error.call(this);
    if (!process.browser)
        Error.captureStackTrace(this, this.constructor);
    // If no custom error message was defined use a generic one.
    this.message = (message && message.toString()) || "JPath Error";
}

// Inherit the default Error prototype.
util.inherits(JPathError, Error);

// Set a name for the error.
JPathError.prototype.name = "JPath Error";

exports = module.exports = JPathError;

}).call(this,require("+NscNm"))
},{"+NscNm":59,"util":69}],35:[function(require,module,exports){
// # Property name escaping

// In a JPath the characters `/, [, ], :, *` have special meanings, but are valid JSON property names.
// If one wants to access a property that contains such a character they have to be escaped.
// Escape sequences start with a tilde, `~` followed by a number in the range [1, 5].
// The single tilde character is escaped as a double tilde.

"use strict";

var JPathInvalidEscapeSequenceError = require("./invalid_escape_sequence_error");
var separatorTokenMapping = require("./separator_token_mapping");

var escapePrefix = "~";
var characterEscapeSequenceMap = {};
var escapeSequenceCharacterMap = {};
Object.keys(separatorTokenMapping).forEach(function (character) {
	characterEscapeSequenceMap[character] = escapePrefix + separatorTokenMapping[character];
	escapeSequenceCharacterMap[escapePrefix + separatorTokenMapping[character]] = character;
});


/**
 * Escapes the given property name.
 *
 * @param {string} propertyName The property name to escape.
 * @returns {string} The escaped property name.
 */
function escapePropertyName(propertyName) {
    // We iterate over the escape sequence table and replace every reserved character by its escape sequence.
    // It is important that a tilde is escaped first!
    // "~[" should be mapped to "~~~2".
    // If we would decode "~ ~" last, this would be decoded into "~~2" then into "~~~~2",
    // because of the global regex based replace.
    // We have to wrap the reservedCharacter into brackets to escape non valid regular expression characters.
    // We also have use a double backslash because of the `]` character.
	var escapedPropertyName = propertyName.replace(new RegExp(escapePrefix, "g"), escapePrefix + escapePrefix);
	return Object.keys(characterEscapeSequenceMap).reduce(function (propertyName, character) {
		return propertyName.replace(new RegExp("[\\" + character + "]", "g"), characterEscapeSequenceMap[character]);
	}, escapedPropertyName);
}

/**
 * Unescapes a given property name.
 *
 * @public
 * @function unescapePropertyName
 *
 * @param {string} escapedPropertyName The property name to unescape.
 * @returns {string} The unescaped property name.
 * @throws {JPathInvalidEscapeSequenceError} if escapedPropertyName contains an invalid escape sequence,
 * e.g. a tilde followed by a number not in the valid range [1, 5].
 */
function unescapePropertyName(escapedPropertyName) {
    // We iterate over the escapedPropertyName character by character and map every escape sequence back to their original value.
    var unescapedCharacters = [];
    var decodedChar ="";
    var idx = 0;
	var escapeSequences = Object.keys(escapeSequenceCharacterMap);
    while (idx < escapedPropertyName.length) {
        var currentChar = escapedPropertyName[idx];
        if (currentChar === escapePrefix) {
            var nextChar = escapedPropertyName[idx + 1];

            // A single `~` or a `~` followed by a number greater outside the interval [1, Object.keys(characterEscapeSequenceMap).length]
            // can never occur in a well escaped property name.
            var n = parseInt(nextChar, 10);
            if (nextChar !== escapePrefix && (isNaN(n) || !isFinite(n) || n < 0 || n > escapeSequences.length))
                throw new JPathInvalidEscapeSequenceError(escapePrefix + nextChar, escapeSequences);

			if (nextChar === escapePrefix)
				decodedChar = escapePrefix;
			else
				decodedChar = escapeSequenceCharacterMap[escapePrefix + nextChar];

            // Skip by two to not decode ~~1 into ~/.
            idx += 2;
        } else {
            decodedChar = currentChar;
            ++idx;
        }
        unescapedCharacters.push(decodedChar);
    }

    return unescapedCharacters.join("");
}

exports.escapePropertyName = escapePropertyName;
exports.unescapePropertyName = unescapePropertyName;

},{"./invalid_escape_sequence_error":39,"./separator_token_mapping":48}],36:[function(require,module,exports){
"use strict";

var compile = require("./compiling");
var Context = require("./context");

exports = module.exports = function (path, object) {
	var pathExpression = compile(path);
    return augmentArray(pathExpression.evaluate(new Context(object)));
};

function augmentArray(array) {
    Object.defineProperties(array, {
        definedResults: {
            get: function () {
                return this.filter(function (result) {
                    return result.isDefined();
                });
            }
        },
        values: {
            get: function () {
                return this.definedResults.map(function (result) {
                    return result.value;
                });
            }
        },
        paths: {
            get: function () {
                return this.definedResults.map(function (result) {
                    return result.path;
                });
            }
        }
    });
    return array;
}

},{"./compiling":29,"./context":31}],37:[function(require,module,exports){
"use strict";

var join = require("./joining");

function EvaluationResult(parent, propertyName, isArrayAccess) {
    if (!(parent instanceof EvaluationResult)) {
        Object.defineProperty(this, "value", {
            value: parent,
            writable: true
        });
        Object.defineProperty(this, "isRoot", {
            value: true
        });
        this._parent = null;
    } else {
        this._parent = parent;
    }

	this._propertyName = typeof propertyName !== "undefined" ? propertyName : "";
    this._isArrayAccess = isArrayAccess;
}

Object.defineProperties(EvaluationResult.prototype, {
	value: {
		get: function () {
            if (typeof this._parent.value !== "undefined")
                return this._parent.value[this._propertyName];
            else
                return undefined;
		},
		set: function (value) {
            if (!this._parent.value)
                this._parent.value = this._isArrayAccess ? [] : {};
			this._parent.value[this._propertyName] = value;
		}
	},
    path: {
        get: function() {
            if (this._parent)
                return join(this._parent.path, this._propertyName, this._isArrayAccess);
            else
                return this._propertyName;
        }
    }
});

EvaluationResult.prototype.isDefined = function () {
	return typeof this.value !== "undefined";
};

exports = module.exports = EvaluationResult;

},{"./joining":40}],38:[function(require,module,exports){
"use strict";

var escaping = require("./escaping");
exports.escapePropertyName = escaping.escapePropertyName;
exports.unescapePropertyName = escaping.unescapePropertyName;
exports.InvalidEscapeSequenceError = require("./invalid_escape_sequence_error");
exports.separtorTokenMapping = require("./separator_token_mapping");

exports.Token = require("./token");
exports.tokenize = require("./lexing");
exports.join = require("./joining");

exports.parse = require("./parsing");
exports.ParsingError = require("./parsing_error");

exports.ConstantValueExpression = require("./constant_value_expression");
exports.PropertyAccessExpression = require("./property_access_expression");
exports.RangeExpression = require("./range_expression");
exports.DescentExpression = require("./descent_expression");
exports.RecursiveDescentExpression = require("./recursive_descent_expression");
exports.PathExpression = require("./path_expression");

exports.evaluate = require("./evaluation");

exports.extractUncoveredParts = require("./coverage");

},{"./constant_value_expression":30,"./coverage":32,"./descent_expression":33,"./escaping":35,"./evaluation":36,"./invalid_escape_sequence_error":39,"./joining":40,"./lexing":41,"./parsing":42,"./parsing_error":43,"./path_expression":44,"./property_access_expression":45,"./range_expression":46,"./recursive_descent_expression":47,"./separator_token_mapping":48,"./token":50}],39:[function(require,module,exports){
// # InvalidEscapeSequenceError

// This class is only used internally.
// It is the error that is thrown by the `unescape` function, if an invalid escape sequence is found.
// It should be catched an rethrown as a syntax errors to carry more information.

"use strict";

var util = require("util");

var JPathError = require("./error");

/**
 * Constructs an InvalidEscapeSequenceError.
 *
 * @param {string} invalidSequence The sequence that is invalid
 * @param {number} startIdx The start index of the invalid sequence inside the string.
 * @constructor
 */
function InvalidEscapeSequenceError(invalidSequence, expected) {
    JPathError.call(this, "Invalid escape sequence found: " + invalidSequence);
    this.invalidSequence = invalidSequence;
    this.expected = expected;
}

exports = module.exports = InvalidEscapeSequenceError;

util.inherits(InvalidEscapeSequenceError, JPathError);

InvalidEscapeSequenceError.prototype.name = "InvalidEscapeSequenceError";

},{"./error":34,"util":69}],40:[function(require,module,exports){
"use strict";

var path = require("path");

exports = module.exports = function (parent, child, isArrayIndex) {
    if (isArrayIndex)
        child = "[" + child + "]";

    return path.join(parent, child);
};

},{"path":58}],41:[function(require,module,exports){
"use strict";

var unescapePropertyName = require("./escaping").unescapePropertyName;
var InvalidEscapeSequenceError = require("./invalid_escape_sequence_error");
var JPathSyntaxError = require("./syntax_error");
var Token = require("./token");
var separatorTokenMapping = require("./separator_token_mapping");

// Tokenizes the given pathExpression returning an array of tokens representing the token stream.
function tokenize(pathExpression) {
    if (pathExpression.length === 0)
        pathExpression = "/";

    var tokenStream = [];
    var currentCharIdx = 0;
    while (currentCharIdx < pathExpression.length){
        var currentChar = pathExpression[currentCharIdx];
		if (isTokenSeparationCharacter(currentChar)) {
			tokenStream.push(new Token(tokenForSeparationCharacter(currentChar), currentCharIdx, currentCharIdx + 1, currentChar));
			++currentCharIdx;
		} else {
			// literal
			// Read 'till first special character
			var literal = "";
			var literalStartIdx = currentCharIdx;
			do {
				literal += currentChar;
				++currentCharIdx;
				currentChar = pathExpression[currentCharIdx];
			} while (currentCharIdx < pathExpression.length && !isTokenSeparationCharacter(currentChar));

			tokenStream.push(new Token(Token.types.literal, literalStartIdx, currentCharIdx, unescapePropertyName(literal)));
        }
    }

    tokenStream.push(new Token(Token.types.eot, currentCharIdx, currentCharIdx));
    return tokenStream;
}

var tokenSeparationCharacters = Object.keys(separatorTokenMapping);

function isTokenSeparationCharacter(char) {
	return tokenSeparationCharacters.indexOf(char) !== -1;
}

function tokenForSeparationCharacter(char) {
	return separatorTokenMapping[char];
}

exports = module.exports = tokenize;

},{"./escaping":35,"./invalid_escape_sequence_error":39,"./separator_token_mapping":48,"./syntax_error":49,"./token":50}],42:[function(require,module,exports){
// # Parsing

"use strict";

var Token = require("./token");
var JPathParsingError = require("./parsing_error");

var ConstantValueExpression = require("./constant_value_expression");
var PropertyAccessExpression = require("./property_access_expression");
var PathExpression = require("./path_expression");
var RangeExpression = require("./range_expression");
var DescentExpression = require("./descent_expression");
var RecursiveDescentExpression = require("./recursive_descent_expression");

/**
 * Parses the given token stream.
 *
 * @public
 * @function parse
 *
 * @param {Token[]} tokenStream The token stream that should be parsed.
 * @returns {PathExpression} The parsed path expression.
 * @throws {JPathSyntaxError} if the given token stream contains any syntactical errors.
 */
function parse(tokenStream) {
	Object.defineProperty(tokenStream, "front", {
		get: function () {
			return this[0];
		}
	});
    var expression = parsePathExpression(tokenStream);

    if (tokenStream.front.type !== Token.types.eot)
        throw new JPathParsingError(JPathParsingError.reasons.unexpectedToken,
            tokenStream.front.startIdx,
            tokenStream.front.endIdx,
            Token.types.eot);

    return expression;
}

function parsePathExpression(tokenStream) {
	var expressions = [];
	var isAbsolutePath = false;

	// If we have a separator this is a absolute path expression.
	if (tokenStream.front.type === Token.types.separator) {
		isAbsolutePath = true;
		tokenStream.shift();
	}

	do {
		// Consume superfluous separator tokens.
		while (tokenStream.front.type === Token.types.separator)
			tokenStream.shift();

		if (tokenStream.front.type === Token.types.eot)
			break;

		// Parse path components as long as the next token afterwards is a separator.
		expressions.push(parsePathComponent(tokenStream));
	} while (tokenStream.front.type === Token.types.separator);

	return new PathExpression(expressions, isAbsolutePath);
}

function parsePathComponent(tokenStream) {
	if (tokenStream.front.type === Token.types.asterisk)
		return parseDescentExpression(tokenStream);

	if (tokenStream.front.type === Token.types.openBracket)
		return parseArrayAccessExpression(tokenStream);

	return new PropertyAccessExpression(parsePropertyNameExpression(tokenStream));
}

function parseDescentExpression(tokenStream) {
	tokenStream.shift();
	if (tokenStream.front.type !== Token.types.asterisk)
		return new DescentExpression();

	tokenStream.shift();
	return new RecursiveDescentExpression();
}

function parsePropertyNameExpression(tokenStream) {
	var left = parseNameExpression(tokenStream);
	if (tokenStream.front.type === Token.types.colon)
		return parseRangeExpression(left, tokenStream);

	return left;
}

function parseNameExpression(tokenStream) {
	if (tokenStream.front.type === Token.types.literal)
		return parseLiteral(tokenStream);
	else if (tokenStream.front.type === Token.types.openParentheses)
		return parseSubExpression(tokenStream);
	else
		throw new JPathParsingError(JPathParsingError.reasons.unexpectedToken,
			tokenStream.front.startIdx,
			tokenStream.front.endIdx,
			[Token.types.literal, Token.types.openParentheses]);
}

function parseLiteral(tokenStream) {
	return new ConstantValueExpression(tokenStream.shift().value);
}

function parseSubExpression(tokenStream) {
	var openParenthesesToken = tokenStream.shift();

    var expression = parsePathExpression(tokenStream);

	if (tokenStream.front.type !== Token.types.closeParentheses)
		throw new JPathParsingError(JPathParsingError.reasons.missingClosingParentheses,
			openParenthesesToken.startIdx,
			tokenStream.front.startIdx,
			Token.types.closeParentheses);

	tokenStream.shift();
	return expression;
}

function parseRangeExpression(left, tokenStream) {
	tokenStream.shift();
	var right = parseNameExpression(tokenStream);
	return new RangeExpression(left, right);
}

function parseArrayAccessExpression(tokenStream) {
	var openBracketToken = tokenStream.shift();

    var expression = new PropertyAccessExpression(parsePropertyNameExpression(tokenStream), true);

	if (tokenStream.front.type !== Token.types.closeBracket)
		throw new JPathParsingError(JPathParsingError.reasons.missingClosingBracket,
			openBracketToken.startIdx,
			tokenStream.front.startIdx,
			Token.types.closeBracket);

	tokenStream.shift();
	return expression;
}

exports = module.exports = parse;

},{"./constant_value_expression":30,"./descent_expression":33,"./parsing_error":43,"./path_expression":44,"./property_access_expression":45,"./range_expression":46,"./recursive_descent_expression":47,"./token":50}],43:[function(require,module,exports){
// # JPathSyntaxError

// This class represents syntactic errors in a JPath.
// Syntactic errors include unbalanced brackets, invalid escape sequences or invalid expressions in general.
// As all errors it inherits from the general JPath error.
// The reason for the syntax error should be one of the constants defined below.
// The start and end index should be chosen such that a substring call with those indices on the input string results
// in that part of the string that is responsible for the syntax error.

"use strict";

var util = require("util");

var JPathError = require("./error");

function JPathParsingError(reason, startIdx, endIdx, expectedTokens) {
    JPathError.call(this, "Parsing Error");
    this.reason = reason;
    this.startIdx = startIdx;
    this.endIdx = endIdx;
    this.expectedTokens = Array.isArray(expectedTokens) ? expectedTokens : [expectedTokens];
}

util.inherits(JPathParsingError, JPathError);

JPathParsingError.prototype.name = "JPathParsingError";

var reasons = {};

Object.defineProperty(JPathParsingError, "reasons", {
    value: reasons
});

Object.defineProperties(reasons, {
    missingClosingBracket: {
        value: 0
    },
    unmatchedClosingBracket: {
        value: 1
    },
	missingClosingParentheses: {
		value: 2
	},
	unmatchedClosingParentheses: {
		value: 3
	},
    unexpectedToken: {
        value: 4
    },
    invalidExpression: {
        value: 5
    }
});

exports = module.exports = JPathParsingError;

},{"./error":34,"util":69}],44:[function(require,module,exports){
"use strict";

var Context = require("./context");

function PathExpression(expressions, isAbsolutePath) {
	this._expressions = expressions;
	this._isAbsolutePath = isAbsolutePath;
}

PathExpression.prototype.evaluate = function (context) {
	if (this._isAbsolutePath)
		context = new Context(context.root);

	return this._expressions.reduce(function (context, expression) {
		return new Context(context.root, expression.evaluate(context));
	}, context).current;
};

exports = module.exports = PathExpression;

},{"./context":31}],45:[function(require,module,exports){
"use strict";

var EvaluationResult = require("./evaluation_result");

function PropertyAccessExpression(propertyNamesExpression, isArrayAccess) {
	this._isArrayAccess = isArrayAccess;
	this._propertyNamesExpression = propertyNamesExpression;
}

PropertyAccessExpression.prototype.evaluate = function (context) {
    var isArrayAccess = this._isArrayAccess;
	var propertyNameResults = this._propertyNamesExpression.evaluate(context);
	return Array.prototype.concat.apply([], propertyNameResults.map(function (propertyNameResult) {
		return context.current.map(function (result) {
			return new EvaluationResult(result, propertyNameResult.value, isArrayAccess);
		});
	}));
};

exports = module.exports = PropertyAccessExpression;

},{"./evaluation_result":37}],46:[function(require,module,exports){
"use strict";

var EvaluationResult = require("./evaluation_result");

function RangeExpression(leftExpression, rightExpression) {
	this._leftExpression = leftExpression;
	this._rightExpression = rightExpression;
}

RangeExpression.prototype.evaluate = function (context) {
	var leftPropertyNames = this._leftExpression.evaluate(context);
	var rightPropertyNames = this._rightExpression.evaluate(context);

	return makeRange(+leftPropertyNames[0].value, +rightPropertyNames[0].value);
};

function makeRange(left, right) {
	if (left > right) {
		var tmp = left;
		left = right;
		right = tmp;
	}

	var range = [];
	for	(var i = left; i < right; ++i)
		range.push(new EvaluationResult(i));

	return range;
}

exports = module.exports = RangeExpression;

},{"./evaluation_result":37}],47:[function(require,module,exports){
"use strict";

var EvaluationResult = require("./evaluation_result");

function RecursiveDescentExpression() {}

RecursiveDescentExpression.prototype.evaluate = function (context) {
	function findDescendants(result) {
        var object = result.value;
		var descendants = [];
		Object.keys(object).forEach(function (key) {
            if (typeof object[key] === "object") {
				descendants.push.apply(descendants, findDescendants(new EvaluationResult(result, key)));
                descendants.push(new EvaluationResult(result, key));
            }
        });
		return descendants;
	}

	return Array.prototype.concat.apply([], context.current.filter(function (result) {
        return result.isDefined() && typeof result.value === "object";
    }).map(function (result) {
		return findDescendants(result);
	}));
};

exports = module.exports = RecursiveDescentExpression;

},{"./evaluation_result":37}],48:[function(require,module,exports){
"use strict";

var tokenTypes = require("./token").types;

exports = module.exports = {
	"/": tokenTypes.separator,
	"[": tokenTypes.openBracket,
	"]": tokenTypes.closeBracket,
	"(": tokenTypes.openParentheses,
	")": tokenTypes.closeParentheses,
	"*": tokenTypes.asterisk,
	":": tokenTypes.colon
};
},{"./token":50}],49:[function(require,module,exports){
// # JPathSyntaxError

// This class represents syntactic errors in a JPath.
// Syntactic errors include unbalanced brackets, invalid escape sequences or invalid expressions in general.
// As all errors it inherits from the general JPath error.
// The reason for the syntax error should be one of the constants defined below.
// The start and end index should be chosen such that a substring call with those indices on the input string results
// in that part of the string that is responsible for the syntax error.

"use strict";

var util = require("util");

var JPathError = require("./error");
var JPathParsingError = require("./parsing_error");

function JPathSyntaxError(params) {
    JPathError.call(this, "Syntax error");
    this.reason = params.reason;
    this.startIdx = params.startIdx;
    this.endIdx = params.endIdx;
    this.actual = params.actual;
    this.expected = params.expected;
    this.message = params.message;
}

util.inherits(JPathSyntaxError, JPathError);

JPathSyntaxError.prototype.name = "JPathSyntaxError";

var reasons = util._extend({}, JPathParsingError.reasons);

Object.defineProperty(JPathSyntaxError, "reasons", {
    value: reasons
});

Object.defineProperty(reasons, "invalidEscapeSequence", {
    value: JPathParsingError.reasons.invalidExpression + 1
});

exports = module.exports = JPathSyntaxError;

},{"./error":34,"./parsing_error":43,"util":69}],50:[function(require,module,exports){
// # Token

// Represents a token as the result of the lexers scanning process.
// The startIdx and endIdx parameter are chosen to such that a call to String#substring(startIdx, endIdx) on the input stream would return the token's value.

"use strict";

// Constructs a token with the given token type, the tokens start and end index and its actual string value.
function Token(type, startIdx, endIdx, value) {
    this.type = type;
    this.startIdx = startIdx;
    this.endIdx = endIdx;
    this.value = value;
}

exports = module.exports = Token;

var tokenTypes = {};

Object.defineProperty(Token, "types", {
    value: tokenTypes
});

Object.defineProperties(tokenTypes, {
    // The token that separates two path components.
    separator: {
        value: 0
    },
    // Introduces an array index expression.
    openBracket: {
        value: 1
    },
    // Closes an array index expression or a sub expression.
    closeBracket: {
        value: 2
    },
	// Introduces either an array index expression or a sub expression.
	openParentheses: {
		value: 3
	},
	// Closes an array index expression or a sub expression.
	closeParentheses: {
		value: 4
	},
    // The token that represents a descent one level expression.
    asterisk: {
        value: 5
    },
    // The token used inside an array index expression to define a slice operation.
    colon: {
        value: 6
    },
    // The token for a literal.
	literal: {
        value: 11
    },
    // The token representing the end of transmission/tokenstream.
    eot: {
        value: 100
    }
});

},{}],51:[function(require,module,exports){
(function (process){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var setImmediate;

    function addFromSetImmediateArguments(args) {
        tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
        return nextHandle++;
    }

    // This function accepts the same arguments as setImmediate, but
    // returns a function that requires no arguments.
    function partiallyApplied(handler) {
        var args = [].slice.call(arguments, 1);
        return function() {
            if (typeof handler === "function") {
                handler.apply(undefined, args);
            } else {
                (new Function("" + handler))();
            }
        };
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    task();
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function installNextTickImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            process.nextTick(partiallyApplied(runIfPresent, handle));
            return handle;
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            global.postMessage(messagePrefix + handle, "*");
            return handle;
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            channel.port2.postMessage(handle);
            return handle;
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
            return handle;
        };
    }

    function installSetTimeoutImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
            return handle;
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(new Function("return this")()));

}).call(this,require("+NscNm"))
},{"+NscNm":59}],52:[function(require,module,exports){

},{}],53:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":54,"ieee754":55}],54:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],55:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],56:[function(require,module,exports){
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

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],57:[function(require,module,exports){
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

},{}],58:[function(require,module,exports){
(function (process){
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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("+NscNm"))
},{"+NscNm":59}],59:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

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
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],60:[function(require,module,exports){
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

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;
var inherits = require('inherits');
var setImmediate = require('process/browser.js').nextTick;
var Readable = require('./readable.js');
var Writable = require('./writable.js');

inherits(Duplex, Readable);

Duplex.prototype.write = Writable.prototype.write;
Duplex.prototype.end = Writable.prototype.end;
Duplex.prototype._write = Writable.prototype._write;

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  var self = this;
  setImmediate(function () {
    self.end();
  });
}

},{"./readable.js":64,"./writable.js":66,"inherits":57,"process/browser.js":62}],61:[function(require,module,exports){
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

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('./readable.js');
Stream.Writable = require('./writable.js');
Stream.Duplex = require('./duplex.js');
Stream.Transform = require('./transform.js');
Stream.PassThrough = require('./passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"./duplex.js":60,"./passthrough.js":63,"./readable.js":64,"./transform.js":65,"./writable.js":66,"events":56,"inherits":57}],62:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],63:[function(require,module,exports){
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

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./transform.js');
var inherits = require('inherits');
inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./transform.js":65,"inherits":57}],64:[function(require,module,exports){
(function (process){
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

module.exports = Readable;
Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;
var Stream = require('./index.js');
var Buffer = require('buffer').Buffer;
var setImmediate = require('process/browser.js').nextTick;
var StringDecoder;

var inherits = require('inherits');
inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || n === null) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode &&
      !er) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    setImmediate(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    setImmediate(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    setImmediate(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  // check for listeners before emit removes one-time listeners.
  var errListeners = EE.listenerCount(dest, 'error');
  function onerror(er) {
    unpipe();
    if (errListeners === 0 && EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  dest.once('error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    setImmediate(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      setImmediate(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, function (x) {
      return self.emit.apply(self, ev, x);
    });
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    setImmediate(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require("+NscNm"))
},{"+NscNm":59,"./index.js":61,"buffer":53,"events":56,"inherits":57,"process/browser.js":62,"string_decoder":67}],65:[function(require,module,exports){
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

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./duplex.js');
var inherits = require('inherits');
inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./duplex.js":60,"inherits":57}],66:[function(require,module,exports){
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

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;
Writable.WritableState = WritableState;

var isUint8Array = typeof Uint8Array !== 'undefined'
  ? function (x) { return x instanceof Uint8Array }
  : function (x) {
    return x && x.constructor && x.constructor.name === 'Uint8Array'
  }
;
var isArrayBuffer = typeof ArrayBuffer !== 'undefined'
  ? function (x) { return x instanceof ArrayBuffer }
  : function (x) {
    return x && x.constructor && x.constructor.name === 'ArrayBuffer'
  }
;

var inherits = require('inherits');
var Stream = require('./index.js');
var setImmediate = require('process/browser.js').nextTick;
var Buffer = require('buffer').Buffer;

inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];
}

function Writable(options) {
  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Stream.Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  setImmediate(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    setImmediate(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (!Buffer.isBuffer(chunk) && isUint8Array(chunk))
    chunk = new Buffer(chunk);
  if (isArrayBuffer(chunk) && typeof Uint8Array !== 'undefined')
    chunk = new Buffer(new Uint8Array(chunk));
  
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  state.needDrain = !ret;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    setImmediate(function() {
      cb(er);
    });
  else
    cb(er);

  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      setImmediate(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      setImmediate(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

},{"./index.js":61,"buffer":53,"inherits":57,"process/browser.js":62}],67:[function(require,module,exports){
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

var Buffer = require('buffer').Buffer;

function assertEncoding(encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  this.charBuffer = new Buffer(6);
  this.charReceived = 0;
  this.charLength = 0;
};


StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  var offset = 0;

  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var i = (buffer.length >= this.charLength - this.charReceived) ?
                this.charLength - this.charReceived :
                buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, offset, i);
    this.charReceived += (i - offset);
    offset = i;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (i == buffer.length) return charStr;

    // otherwise cut off the characters end from the beginning of this buffer
    buffer = buffer.slice(i, buffer.length);
    break;
  }

  var lenIncomplete = this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - lenIncomplete, end);
    this.charReceived = lenIncomplete;
    end -= lenIncomplete;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    this.charBuffer.write(charStr.charAt(charStr.length - 1), this.encoding);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }

  return i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 2;
  this.charLength = incomplete ? 2 : 0;
  return incomplete;
}

function base64DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 3;
  this.charLength = incomplete ? 3 : 0;
  return incomplete;
}

},{"buffer":53}],68:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],69:[function(require,module,exports){
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

}).call(this,require("+NscNm"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"+NscNm":59,"./support/isBuffer":68,"inherits":57}],70:[function(require,module,exports){
module.exports=require(29)
},{"./invalid_escape_sequence_error":80,"./lexing":82,"./parsing":83,"./parsing_error":84,"./syntax_error":90}],71:[function(require,module,exports){
module.exports=require(30)
},{"./evaluation_result":78}],72:[function(require,module,exports){
module.exports=require(31)
},{"./evaluation_result":78}],73:[function(require,module,exports){
module.exports=require(32)
},{"./evaluation":77}],74:[function(require,module,exports){
module.exports=require(33)
},{"./evaluation_result":78}],75:[function(require,module,exports){
module.exports=require(34)
},{"+NscNm":59,"util":69}],76:[function(require,module,exports){
module.exports=require(35)
},{"./invalid_escape_sequence_error":80,"./separator_token_mapping":89}],77:[function(require,module,exports){
module.exports=require(36)
},{"./compiling":70,"./context":72}],78:[function(require,module,exports){
module.exports=require(37)
},{"./joining":81}],79:[function(require,module,exports){
module.exports=require(38)
},{"./constant_value_expression":71,"./coverage":73,"./descent_expression":74,"./escaping":76,"./evaluation":77,"./invalid_escape_sequence_error":80,"./joining":81,"./lexing":82,"./parsing":83,"./parsing_error":84,"./path_expression":85,"./property_access_expression":86,"./range_expression":87,"./recursive_descent_expression":88,"./separator_token_mapping":89,"./token":91}],80:[function(require,module,exports){
module.exports=require(39)
},{"./error":75,"util":69}],81:[function(require,module,exports){
module.exports=require(40)
},{"path":58}],82:[function(require,module,exports){
module.exports=require(41)
},{"./escaping":76,"./invalid_escape_sequence_error":80,"./separator_token_mapping":89,"./syntax_error":90,"./token":91}],83:[function(require,module,exports){
module.exports=require(42)
},{"./constant_value_expression":71,"./descent_expression":74,"./parsing_error":84,"./path_expression":85,"./property_access_expression":86,"./range_expression":87,"./recursive_descent_expression":88,"./token":91}],84:[function(require,module,exports){
module.exports=require(43)
},{"./error":75,"util":69}],85:[function(require,module,exports){
module.exports=require(44)
},{"./context":72}],86:[function(require,module,exports){
module.exports=require(45)
},{"./evaluation_result":78}],87:[function(require,module,exports){
module.exports=require(46)
},{"./evaluation_result":78}],88:[function(require,module,exports){
module.exports=require(47)
},{"./evaluation_result":78}],89:[function(require,module,exports){
module.exports=require(48)
},{"./token":91}],90:[function(require,module,exports){
module.exports=require(49)
},{"./error":75,"./parsing_error":84,"util":69}],91:[function(require,module,exports){
module.exports=require(50)
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6XFxfcmVwb3NcXHdlYmdsXFx4bWwzZC1ibGFzdC1sb2FkZXJcXG5vZGVfbW9kdWxlc1xcZ3J1bnQtYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL2xpYi9sb2FkZXIuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9saWIvYnJvd3Nlci9kZWNvZGluZ193b3JrZXJfcG9vbC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9icm93c2VyL3J1bl9leHRlcm5hbF9kZWNvZGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9jaHVuay5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9jaHVua2VyLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL2RlY2h1bmtlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9ub2RlL3J1bl9leHRlcm5hbF9kZWNvZGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9vYmplY3RfYXNzZW1ibGVyLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL29iamVjdF9lbmNvZGVyLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3ByZWFtYmxlLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3J1bl9leHRlcm5hbF9kZWNvZGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9zdHJlYW1fZ2VuZXJhdG9yLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3N0cmVhbV9yZWNlaXZlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi91dGlsL2NhbGxfaW1tZWRpYXRlLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3V0aWwvaXNfbGl0dGxlX2VuZGlhbl9hcmNoaXRlY3R1cmUuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9saWIvdXRpbC93cmFwX3N5bmNfZnVuY3Rpb24uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9saWIvdmFsdWVfZGVjb2Rlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9hYm9wcy9saWIvYWJvcHMuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvYXN5bmMvbGliL2FzeW5jLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2JsYXN0LWNvZGVjcy9saWIvY29kZWNzL2Fzc2ltcF9tZXNoLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2JsYXN0LWNvZGVjcy9saWIvY29kZWNzL2lkZW50aXR5LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2JsYXN0LWNvZGVjcy9saWIvY29kZWNzL2pzb24uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvYmxhc3QtY29kZWNzL2xpYi9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9ibGFzdC1jb2RlY3MvbGliL3V0aWwvZmxpcF9lbmRpYW5uZXNzX2lmX25lY2Vzc2FyeS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvY29tcGlsaW5nLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9jb25zdGFudF92YWx1ZV9leHByZXNzaW9uLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9jb250ZXh0LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9jb3ZlcmFnZS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvZGVzY2VudF9leHByZXNzaW9uLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvZXNjYXBpbmcuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2V2YWx1YXRpb24uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2V2YWx1YXRpb25fcmVzdWx0LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvaW52YWxpZF9lc2NhcGVfc2VxdWVuY2VfZXJyb3IuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2pvaW5pbmcuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2xleGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcGFyc2luZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcGFyc2luZ19lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcGF0aF9leHByZXNzaW9uLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9wcm9wZXJ0eV9hY2Nlc3NfZXhwcmVzc2lvbi5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcmFuZ2VfZXhwcmVzc2lvbi5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcmVjdXJzaXZlX2Rlc2NlbnRfZXhwcmVzc2lvbi5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvc2VwYXJhdG9yX3Rva2VuX21hcHBpbmcuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL3N5bnRheF9lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvdG9rZW4uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvc2V0aW1tZWRpYXRlL3NldEltbWVkaWF0ZS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmVhbS1icm93c2VyaWZ5L2R1cGxleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmVhbS1icm93c2VyaWZ5L2luZGV4LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvc3RyZWFtLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmVhbS1icm93c2VyaWZ5L3Bhc3N0aHJvdWdoLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvc3RyZWFtLWJyb3dzZXJpZnkvcmVhZGFibGUuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9zdHJlYW0tYnJvd3NlcmlmeS90cmFuc2Zvcm0uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9zdHJlYW0tYnJvd3NlcmlmeS93cml0YWJsZS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmluZ19kZWNvZGVyL2luZGV4LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2g4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7OztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Y2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgYmxhc3QgPSByZXF1aXJlKFwiYmxhc3RcIik7XHJcbnZhciBqcGF0aCA9IHJlcXVpcmUoXCJqcGF0aFwiKTtcclxuXHJcbnZhciBub3JtYWwgPSAoMSA8PCAwKTtcclxudmFyIHRhbmdlbnQgPSAoMSA8PCAxKTtcclxudmFyIHRleGNvb3JkID0gKDEgPDwgMik7XHJcbnZhciBjb2xvciA9ICgxIDw8IDMpO1xyXG5cclxuZnVuY3Rpb24gaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUoKSB7XHJcbiAgICAvLyBEYXRhVmlldyNnZXRVaW50MTYgd2lsbCByZWFkIDEgb24gYmlnLWVuZGlhbiBzeXN0ZW1zLlxyXG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhuZXcgVWludDE2QXJyYXkoWzI1Nl0pLmJ1ZmZlcikuZ2V0VWludDE2KDAsIHRydWUpID09PSAyNTY7XHJcbn07XHJcblxyXG4gZnVuY3Rpb24gZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KHR5cGVkQXJyYXksIGxpdHRsZUVuZGlhbikge1xyXG4gICAgaWYgKGxpdHRsZUVuZGlhbiAhPT0gaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUoKSlcclxuXHRcdHRocm93IFwiRmF0YWw6IEV4cGVjdGVkIGxpdHRsZSBlbmRpYW4gZGF0YSBidXQgZ290IGJpZyBlbmRpYW4gZGF0YSBpbnN0ZWFkLlwiXHJcbiAgICByZXR1cm4gdHlwZWRBcnJheTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGRlY29kZUFzc2ltcE1lc2goYnVmZmVyLCBsaXR0bGVFbmRpYW4pIHtcclxuICAgIHZhciB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XHJcbiAgICB2YXIgb2Zmc2V0ID0gMDtcclxuICAgIHZhciB2ZXJ0ZXhDb3VudCA9IHZpZXcuZ2V0VWludDMyKG9mZnNldCwgbGl0dGxlRW5kaWFuKTtcclxuICAgIG9mZnNldCArPSA0O1xyXG4gICAgdmFyIGF0dHJpYnMgPSB2aWV3LmdldFVpbnQ4KG9mZnNldCk7XHJcbiAgICBvZmZzZXQgKz0gNDtcclxuXHJcbiAgICB2YXIgbWVzaCA9IHtcclxuICAgICAgICBwb3NpdGlvbjogZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLCBvZmZzZXQsIHZlcnRleENvdW50ICogMyksIGxpdHRsZUVuZGlhbilcclxuICAgIH07XHJcbiAgICBvZmZzZXQgKz0gdmVydGV4Q291bnQgKiAzICogbWVzaC5wb3NpdGlvbi5CWVRFU19QRVJfRUxFTUVOVDtcclxuXHJcbiAgICBpZiAoYXR0cmlicyAmIG5vcm1hbCkge1xyXG4gICAgICAgIG1lc2gubm9ybWFsID0gZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLCBvZmZzZXQsIHZlcnRleENvdW50ICogMyksIGxpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgb2Zmc2V0ICs9IHZlcnRleENvdW50ICogMyAqIG1lc2gubm9ybWFsLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgfVxyXG4gICAgaWYgKGF0dHJpYnMgJiB0YW5nZW50KSB7XHJcbiAgICAgICAgbWVzaC50YW5nZW50ID0gZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLCBvZmZzZXQsIHZlcnRleENvdW50ICogMyksIGxpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgb2Zmc2V0ICs9IHZlcnRleENvdW50ICogMyAqIG1lc2gudGFuZ2VudC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgIH1cclxuICAgIGlmIChhdHRyaWJzICYgdGV4Y29vcmQpIHtcclxuICAgICAgICBtZXNoLnRleGNvb3JkID0gZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLCBvZmZzZXQsIHZlcnRleENvdW50ICogMiksIGxpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgb2Zmc2V0ICs9IHZlcnRleENvdW50ICogMiAqIG1lc2gudGV4Y29vcmQuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICB9XHJcbiAgICBpZiAoYXR0cmlicyAmIGNvbG9yKSB7XHJcbiAgICAgICAgbWVzaC5jb2xvciA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDQpLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDQgKiBtZXNoLmNvbG9yLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgfVxyXG5cclxuICAgIG1lc2guaW5kZXggPSBmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IFVpbnQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0KSwgbGl0dGxlRW5kaWFuKTtcclxuXHJcbiAgICByZXR1cm4gbWVzaDtcclxufTtcclxuXHJcbnZhciBCbGFzdEZvcm1hdEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcclxuICAgIFhNTDNELnJlc291cmNlLkZvcm1hdEhhbmRsZXIuY2FsbCh0aGlzKTtcclxufTtcclxuXHJcblhNTDNELmNyZWF0ZUNsYXNzKEJsYXN0Rm9ybWF0SGFuZGxlciwgWE1MM0QucmVzb3VyY2UuRm9ybWF0SGFuZGxlcik7XHJcblxyXG5CbGFzdEZvcm1hdEhhbmRsZXIucHJvdG90eXBlLmlzRm9ybWF0U3VwcG9ydGVkID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgIGlmIChyZXNwb25zZS51cmwubWF0Y2goL1xcLmJsYXN0LykpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuQmxhc3RGb3JtYXRIYW5kbGVyLnByb3RvdHlwZS5nZXRGb3JtYXREYXRhID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcclxuICAgIHZhciB4Zmxvd0RhdGEgPSBbXTtcclxuICAgIHZhciBzdHJlYW1SZWNlaXZlciA9IG5ldyBibGFzdC5TdHJlYW1SZWNlaXZlcih7XHJcbiAgICAgICAgYXN5bmM6IGZhbHNlXHJcbiAgICB9KTtcclxuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRyZXNwb25zZS5hcnJheUJ1ZmZlcigpLnRoZW4oZnVuY3Rpb24oYXJyYXlCdWZmZXIpIHtcclxuXHRcdFx0dmFyIGVycm9yQ2FsbGJhY2sgPSBmdW5jdGlvbihlKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQkxBU1QgbG9hZGVyIGNvdWxkIG5vdCBwYXJzZSB0aGUgaW5wdXQgYnVmZmVyLlwiKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRzdHJlYW1SZWNlaXZlci5lbmQoYXJyYXlCdWZmZXIpO1xyXG5cdFx0XHRzdHJlYW1SZWNlaXZlclxyXG5cdFx0XHRcdC5vbihcImVycm9yXCIsIGVycm9yQ2FsbGJhY2spXHJcblx0XHRcdFx0LnBpcGUobmV3IGJsYXN0LkRlY2h1bmtlcih7IGFzeW5jOiBmYWxzZSB9KSlcclxuXHRcdFx0XHQub24oXCJlcnJvclwiLCBlcnJvckNhbGxiYWNrKVxyXG5cdFx0XHRcdC5waXBlKG5ldyBibGFzdC5WYWx1ZURlY29kZXIoe1xyXG5cdFx0XHRcdFx0YXN5bmM6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZGVjb2RpbmdTcGVjaWZpY2F0aW9uTWFwOiB7XHJcblx0XHRcdFx0XHRcdFwiaHR0cDovL2xvY2FsaG9zdDo5MDkwL2NvZGVjcy9hc3NpbXBNZXNoXCI6IGRlY29kZUFzc2ltcE1lc2hcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KSlcclxuXHRcdFx0XHQub24oXCJlcnJvclwiLCBlcnJvckNhbGxiYWNrKVxyXG5cdFx0XHRcdC5vbihcImRhdGFcIiwgZnVuY3Rpb24gKGRlY29kZWREYXRhKSB7XHJcblx0XHRcdFx0XHRqcGF0aC5ldmFsdWF0ZShkZWNvZGVkRGF0YS5wYXRoLCB4Zmxvd0RhdGEpLmZvckVhY2goZnVuY3Rpb24gKHJlc3VsdCkge1xyXG5cdFx0XHRcdFx0XHRkZWNvZGVkRGF0YS5tZXRhZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoVHlwZU1hcCkge1xyXG5cdFx0XHRcdFx0XHRcdGpwYXRoLmV2YWx1YXRlKHBhdGhUeXBlTWFwLnBhdGgsIGRlY29kZWREYXRhLnZhbHVlKS5kZWZpbmVkUmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhciB4Zmxvd0RhdGFEZXNjcmlwdGlvbiA9IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogcGF0aFR5cGVNYXAudHlwZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWU6IHJlc3VsdC52YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChyZXN1bHQuaXNSb290KVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRkZWNvZGVkRGF0YS52YWx1ZSA9IHhmbG93RGF0YURlc2NyaXB0aW9uO1xyXG5cdFx0XHRcdFx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXN1bHQudmFsdWUgPSB4Zmxvd0RhdGFEZXNjcmlwdGlvbjtcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdGlmIChyZXN1bHQuaXNSb290KVxyXG5cdFx0XHRcdFx0XHRcdHhmbG93RGF0YSA9IGRlY29kZWREYXRhLnZhbHVlO1xyXG5cdFx0XHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRcdFx0cmVzdWx0LnZhbHVlID0gZGVjb2RlZERhdGEudmFsdWU7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5vbihcImZpbmlzaFwiLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRyZXNvbHZlKHhmbG93RGF0YSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuICAgIFxyXG59O1xyXG5cclxuQmxhc3RGb3JtYXRIYW5kbGVyLnByb3RvdHlwZS5nZXRGcmFnbWVudERhdGEgPSBmdW5jdGlvbiAoZGF0YSwgcGF0aCkge1xyXG4gICAgaWYgKCFwYXRoKVxyXG4gICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgcmV0dXJuIGpwYXRoLmV2YWx1YXRlKHBhdGgsIGRhdGEpLmRlZmluZWRSZXN1bHRzLmxlbmd0aCA+IDAgPyBqcGF0aC5ldmFsdWF0ZShwYXRoLCBkYXRhKS5kZWZpbmVkUmVzdWx0c1swXS52YWx1ZSA6IG51bGw7XHJcbn07XHJcblxyXG5CbGFzdEZvcm1hdEhhbmRsZXIucHJvdG90eXBlLmdldEFkYXB0ZXIgPSBmdW5jdGlvbihub2RlLCBhc3BlY3QsIGNhbnZhc0lkKSB7XHJcblx0aWYgKGFzcGVjdCA9PT0gXCJkYXRhXCIpXHJcblx0XHRyZXR1cm4gbmV3IEJsYXN0RGF0YUFkYXB0ZXIobm9kZSk7XHJcbn07XHJcblxyXG52YXIgYmxhc3RGb3JtYXRIYW5kbGVyID0gbmV3IEJsYXN0Rm9ybWF0SGFuZGxlcigpO1xyXG5YTUwzRC5yZXNvdXJjZS5yZWdpc3RlckZvcm1hdChibGFzdEZvcm1hdEhhbmRsZXIpO1xyXG5cclxudmFyIEJsYXN0RGF0YUFkYXB0ZXIgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdGhpcy5feGZsb3dEYXRhTm9kZSA9IGNyZWF0ZVhmbG93RGF0YU5vZGUoZGF0YSk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVYZmxvd0RhdGFOb2RlIChkYXRhKSB7XHJcbiAgICB2YXIgeGZsb3dEYXRhTm9kZSA9IG5ldyBYZmxvdy5EYXRhTm9kZSgpO1xyXG5cclxuICAgIE9iamVjdC5rZXlzKGRhdGEpLmZvckVhY2goZnVuY3Rpb24gKGF0dHJpYnV0ZU5hbWUpIHtcclxuICAgICAgICB2YXIgYXR0cmlidXRlID0gZGF0YVthdHRyaWJ1dGVOYW1lXTtcclxuICAgICAgICBpZiAoYXR0cmlidXRlKVxyXG4gICAgICAgICAgICB4Zmxvd0RhdGFOb2RlLmFwcGVuZENoaWxkKGNyZWF0ZUlucHV0Tm9kZShhdHRyaWJ1dGVOYW1lLCBhdHRyaWJ1dGUudHlwZSwgYXR0cmlidXRlLnZhbHVlKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4geGZsb3dEYXRhTm9kZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlSW5wdXROb2RlKG5hbWUsIHR5cGUsIHR5cGVkQXJyYXkpIHtcclxuICAgIHZhciBpbnB1dE5vZGUgPSBuZXcgWGZsb3cuSW5wdXROb2RlKCk7XHJcbiAgICBpbnB1dE5vZGUubmFtZSA9IG5hbWU7XHJcbiAgICBpbnB1dE5vZGUuZGF0YSA9IG5ldyBYZmxvdy5CdWZmZXJFbnRyeShYZmxvdy5jb25zdGFudHMuREFUQV9UWVBFLmZyb21TdHJpbmcodHlwZSksIHR5cGVkQXJyYXkpO1xyXG4gICAgcmV0dXJuIGlucHV0Tm9kZTtcclxufVxyXG5cclxuQmxhc3REYXRhQWRhcHRlci5wcm90b3R5cGUuZ2V0WGZsb3dOb2RlID0gZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5feGZsb3dEYXRhTm9kZTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5mdW5jdGlvbiB3b3JrZXIoKSB7XHJcbiAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGRvd25sb2FkRGVjb2RpbmdGdW5jdGlvbmFsaXR5KGV2ZW50LmRhdGEuZGVjb2RpbmdTcGVjaWZpY2F0aW9uKTtcclxuICAgICAgICBkZWNvZGVEYXRhKGV2ZW50LmRhdGEuYnVmZmVyLCBldmVudC5kYXRhLmxpdHRsZUVuZGlhbik7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBkb3dubG9hZERlY29kaW5nRnVuY3Rpb25hbGl0eSh1cmwpIHtcclxuICAgICAgICBzZWxmLm1vZHVsZSA9IHt9O1xyXG4gICAgICAgIHNlbGYubW9kdWxlLmV4cG9ydHMgPSB7fTtcclxuICAgICAgICBzZWxmLmV4cG9ydHMgPSBzZWxmLm1vZHVsZS5leHBvcnRzO1xyXG5cclxuICAgICAgICBpbXBvcnRTY3JpcHRzKHVybCk7XHJcbiAgICAgICAgdmFyIGRlY29kaW5nRnVuY3Rpb247XHJcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgICBkZWNvZGluZ0Z1bmN0aW9uID0gc2VsZi5tb2R1bGUuZXhwb3J0cztcclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIilcclxuICAgICAgICAgICAgZGVjb2RpbmdGdW5jdGlvbiA9IHNlbGYubW9kdWxlLmV4cG9ydHMuZGVjb2RlO1xyXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBkZWNvZGUgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgICAgZGVjb2RpbmdGdW5jdGlvbiA9IGRlY29kZTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIGRlY29kaW5nIGZ1bmN0aW9uXCIpO1xyXG4gICAgICAgIHNlbGYuZGVjb2RpbmdGdW5jdGlvbiA9IHdyYXBwRGVjb2RpbmdGdW5jdGlvbihkZWNvZGluZ0Z1bmN0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB3cmFwcERlY29kaW5nRnVuY3Rpb24oZGVjb2RpbmdGdW5jdGlvbikge1xyXG4gICAgICAgIHZhciBhcml0eSA9IGRlY29kaW5nRnVuY3Rpb24ubGVuZ3RoO1xyXG4gICAgICAgIC8vIFZhcmlhYmxlIGFyZ3VtZW50IGxpc3QgbWVhbnMgd2UgY29uc2lkZXIgdGhpcyBmdW5jdGlvbiB0byBiZSBhc3luYy4gYW5kIHRvIGV4cGVjdFxyXG4gICAgICAgIC8vIGFuIEFycmF5QnVmZmVyLCBvZmZzZXQsIGxlbmd0aCBhbmQgZW5kaWFubmVzcyBhcyBwYXJhbWV0ZXIuXHJcbiAgICAgICAgaWYgKGFyaXR5ID09PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gZGVjb2RpbmdGdW5jdGlvbjtcclxuICAgICAgICAvLyBBbiBhcml0eSBvZiB0d28gbWVhbnMgd2UgaGF2ZSBhIHN5bmMuIGZ1bmN0aW9uIHRha2luZyBhIERhdGFWaWV3IGFuZCB0aGUgZW5kaWFubmVzcy5cclxuICAgICAgICBpZiAoYXJpdHkgPT09IDIpXHJcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoYnVmZmVyLCBsaXR0bGVFbmRpYW4sIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBkZWNvZGluZ0Z1bmN0aW9uKGJ1ZmZlciwgbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGUsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIGlmIChhcml0eSA9PT0gMylcclxuICAgICAgICAgICAgcmV0dXJuICBkZWNvZGluZ0Z1bmN0aW9uO1xyXG5cclxuICAgICAgICBuZXcgRXJyb3IoXCJNYWxmb3JtZWQgZGVjb2RpbmcgZnVuY3Rpb25cIik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVjb2RlRGF0YShidWZmZXIsIGxpdHRsZUVuZGlhbikge1xyXG4gICAgICAgIHNlbGYuZGVjb2RpbmdGdW5jdGlvbihidWZmZXIsIGxpdHRsZUVuZGlhbiwgZnVuY3Rpb24gKGVycm9yLCByZXN1bHQpIHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcblxyXG4gICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKHJlc3VsdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIERlY29kaW5nV29ya2VyUG9vbChwb29sU2l6ZSkge1xyXG4gICAgdGhpcy5fcG9vbFNpemUgPSBwb29sU2l6ZSB8fCA0O1xyXG4gICAgdGhpcy5fcG9vbCA9IFtdO1xyXG4gICAgdGhpcy5fdGFza1F1ZXVlID0gW107XHJcblxyXG4gICAgdGhpcy5fZmlsbFBvb2woKTtcclxufVxyXG5cclxuRGVjb2RpbmdXb3JrZXJQb29sLnByb3RvdHlwZS5zY2hlZHVsZVRhc2sgPSBmdW5jdGlvbiAoZGVjb2RpbmdUYXNrLCBjYWxsYmFjaykge1xyXG4gICAgdGhpcy5fdGFza1F1ZXVlLnB1c2goe1xyXG4gICAgICAgIGRlY29kaW5nVGFzazogZGVjb2RpbmdUYXNrLFxyXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLl9wcm9jZXNzUXVldWUoKTtcclxufTtcclxuXHJcbkRlY29kaW5nV29ya2VyUG9vbC5wcm90b3R5cGUuX3Byb2Nlc3NRdWV1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLl9wb29sLmxlbmd0aCA9PT0gMCB8fCB0aGlzLl90YXNrUXVldWUubGVuZ3RoID09PSAwKVxyXG4gICAgICAgIHJldHVybjtcclxuXHJcbiAgICB2YXIgdGFza0luZm8gPSB0aGlzLl90YXNrUXVldWUuc2hpZnQoKTtcclxuICAgIHZhciB3b3JrZXIgPSB0aGlzLl9wb29sLnNoaWZ0KCk7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgd29ya2VyLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHNlbGYuX3Bvb2wucHVzaCh0aGlzKTtcclxuICAgICAgICB0YXNrSW5mby5jYWxsYmFjayhudWxsLCBldmVudC5kYXRhKTtcclxuICAgICAgICBzZWxmLl9wcm9jZXNzUXVldWUoKTtcclxuICAgIH07XHJcblxyXG4gICAgd29ya2VyLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBzZWxmLl9wb29sLnB1c2godGhpcyk7XHJcbiAgICAgICAgdGFza0luZm8uY2FsbGJhY2soZXZlbnQpO1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgc2VsZi5fcHJvY2Vzc1F1ZXVlKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh0YXNrSW5mby5kZWNvZGluZ1Rhc2ssIFt0YXNrSW5mby5kZWNvZGluZ1Rhc2suYnVmZmVyXSk7XHJcbn07XHJcblxyXG5EZWNvZGluZ1dvcmtlclBvb2wucHJvdG90eXBlLl9maWxsUG9vbCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fcG9vbFNpemU7ICsraSlcclxuICAgICAgICB0aGlzLl9wb29sLnB1c2godGhpcy5fY3JlYXRlV29ya2VyKCkpO1xyXG59O1xyXG5cclxuRGVjb2RpbmdXb3JrZXJQb29sLnByb3RvdHlwZS5fY3JlYXRlV29ya2VyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHN0ciA9IHdvcmtlci50b1N0cmluZygpICsgXCJcXG53b3JrZXIoKTtcIjtcclxuICAgIHJldHVybiBuZXcgV29ya2VyKFVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW3N0cl0sIHsgdHlwZTogXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0XCJ9ICkpKTtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IERlY29kaW5nV29ya2VyUG9vbDtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgRGVjb2RpbmdXb3JrZXJQb29sID0gcmVxdWlyZShcIi4vZGVjb2Rpbmdfd29ya2VyX3Bvb2xcIik7XHJcblxyXG52YXIgcG9vbCA9IG5ldyBEZWNvZGluZ1dvcmtlclBvb2woKTtcclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGRlY29kaW5nU3BlY2lmaWNhdGlvbiwgYnVmZmVyLCBsaXR0bGVFbmRpYW4sIGNhbGxiYWNrKSB7XHJcbiAgICBwb29sLnNjaGVkdWxlVGFzayh7XHJcbiAgICAgICAgZGVjb2RpbmdTcGVjaWZpY2F0aW9uOiBkZWNvZGluZ1NwZWNpZmljYXRpb24sXHJcbiAgICAgICAgYnVmZmVyOiBidWZmZXIsXHJcbiAgICAgICAgbGl0dGxlRW5kaWFuOiBsaXR0bGVFbmRpYW5cclxuICAgIH0sIGNhbGxiYWNrKVxyXG59O1xyXG5cclxuIiwiLy8gIyBDaHVua1xyXG5cclxuLy8gQSBgY2h1bmtgIGlzIGFuIGluZGVwZW5kZW50IHBhcnQgb2YgYSBibGFzdCBzdHJlYW0gdGhhdCBjYW4gYmUgcHJvY2Vzc2VkIGJ5IHRoZSBjbGllbnQgaW5kaXZpZHVhbGx5IGFuZCB3aXRob3V0XHJcbi8vIGFueSBpbmZvcm1hdGlvbiBvZiBvdGhlciBjaHVua3MgaW4gdGhlIHN0cmVhbSBleGNlcHQgZm9yIHRoZSBwcmVhbWJsZS5cclxuLy8gQSBgY2h1bmtgIG1heSBjb250YWluIG11bHRpcGxlIGVuY29kZWRWYWx1ZXMgZnJvbSB0aGUgb3JpZ2luYWwgb2JqZWN0LlxyXG4vLyBIb3dldmVyLCBpdCB3aWxsIG5ldmVyIGNvbnRhaW4gcGFydGlhbGwgZGF0YSBzdWNoIHRoYXQgYW5vdGhlciBgY2h1bmtgIGlzIG5lY2Vzc2FyeSB0byBkZWNvZGUgYSB2YWx1ZS5cclxuXHJcbi8vICMjIFN0cnVjdHVyZVxyXG5cclxuLy8gQSBjaHVuayBoYXMgdGhlIGZvbGxvd2luZyBiaW5hcnkgc3RydWN0dXJlLlxyXG4vL1xyXG4vLyBPY3RldHMgMC0tMzogT3ZlcmFsbCBjaHVua3Mgc2l6ZSAoT0NTKS5cclxuLy8gT2N0ZXRzIDQtLTc6IEhlYWRlciBkZWZpbml0aW9uIHNpemUgKEhTKS5cclxuLy8gT2N0ZXRzIDgtLTgrPEhTPjogRGVmaW5pdGlvbnMgb2YgdGhlIHBheWxvYWQgaW4gdGhpcyBjaHVuay5cclxuLy8gT2N0ZXRzOiA5KzxIUz4tLTxPQ1M+OiBQYXlsb2FkLlxyXG5cclxuLy8gIyMjIEhlYWRlciBkZWZpbml0aW9uXHJcblxyXG4vLyBBIGNodW5rcyBoZWFkZXIgZGVmaW5pdGlvbiBpcyBhbiBhcnJheSBvZiBrZXktdmFsdWUgcGFpcnMuXHJcbi8vIEluIEphdmFTY3JpcHQgdGhpcyBzaW1wbHkgbWFwcyB0byBvYmplY3RzLlxyXG4vLyBUaGUgaGVhZGVyIGRlZmluaXRpb24gb2YgZWFjaCBjaHVuayBpcyBlbmNvZGVkIGFuZCBjYW4gYmUgZGVjb2RlZCB1c2luZyB0aGUgcHJvY2VkdXJlXHJcbi8vIHNwZWNpZmllZCBpbiB0aGUgcHJlYW1ibGUgb2YgdGhlIHN0cmVhbS5cclxuLy8gRWFjaCBkZWZpbml0aW9uIGlzIHN0cnVjdHVyZWQgYXMgZm9sbG93czpcclxuXHJcbi8vIC0gcGF0aDogQSBKUGF0aCBzcGVjaWZ5aW5nIHRoZSBvcmlnaW5hbCBwYXRoIG9mIHRoZSB2YWx1ZSBpbiB0aGVcclxuLy8gLSBvZmZzZXQ6IEJ5dGUgb2Zmc2V0IGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgY2h1bmsncyBwYXlsb2FkIHdoZXJlIHRoZSBlbmNvZGVkIGRhdGEgc3RhcnRzLlxyXG4vLyAtIHNpemU6IEJ5dGUgbGVuZ3RoIG9mIHRoZSBlbmNvZGVkIGRhdGEuXHJcbi8vIC0gZGVjb2RpbmdTcGVjaWZpY2F0aW9uOiBBIFVSTCB0aGF0IHVuaXF1ZWx5IGlkZW50aWZpZXMgdGhlIGRlY29kaW5nIHByb2NlZHVyZSBuZWNlc3NhcnkgdG8gZGVjb2RlIHRoZSBkYXRhXHJcbi8vIGRlZmluZWQgaW4gdGhpcyBlbnRyeS5cclxuLy8gLSBtZXRhZGF0YTogUG9zc2libGUgbWV0YWRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoaXMgdmFsdWUuXHJcblxyXG4vLyAjIyMgUGF5bG9hZFxyXG5cclxuLy8gQSBjaHVua3MgcGF5bG9hZCBpcyBhIGZsYXQgYEFycmF5QnVmZmVyYCBvZiBhcmJpdHJhcnkgc2l6ZS5cclxuLy8gSXQgY29udGFpbnMgYWxsIGVuY29kZWREYXRhIHNwZWNpZmllZCBpbiB0aGUgaGVhZGVyIGRlZmluaXRpb25zLlxyXG4vLyBUaGUgc2l6ZSBvZiBlYWNoIGNodW5rJ3MgcGF5bG9hZCBjYW4gYmUgY2FsY3VsYXRlZCBhczpcclxuLy8gPE9DUz4tOSs8SFM+LlxyXG5cclxuLy8gIyMjIFNpZ25hbCBFbmQgT2YgU3RyZWFtXHJcblxyXG4vLyBBIHNwZWNpYWwgY2h1bmssIHRoZSBzaWduYWwgZW5kIG9mIHN0cmVhbSBjaHVuaywgY29udGFpbnMgbm8gcGF5bG9hZCBhbmQgdGh1cyBubyBoZWFkZXIgZGVmaW5pdGlvbnMuXHJcbi8vIFRoaXMgY2h1bmsgc2lnbmFscyB0aGUgcmVjZWl2ZXIgdGhlIGVuZCBvZiB0aGUgc3RyZWFtLlxyXG4vLyBJdCBpcyB0aGVyZWZvcmUgbm90IHZhbGlkIHRvIGNhbGwgYSBjaHVua3MgdG9CdWZmZXIgbWV0aG9kIGlmIG5vIHBheWxvYWQgd2FzIGFkZGVkIGJlZm9yZWhhbmQuXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBCbGFzdEVycm9yID0gcmVxdWlyZShcIi4vZXJyb3JcIik7XHJcblxyXG4vLyBDb25zdHJ1Y3RzIGEgbmV3IGNodW5rIHRoYXQgY2FuIGJlIGZpbGxlZCB3aXRoIGRhdGEuXHJcbi8vIEEgbmV3bHkgY29uc3RydWN0ZWQgY2h1bmsgd2lsbCBoYXZlIGEgcGF5bG9hZCBvZiBzaXplIDAgYW5kIGEgaGVhZGVyIGRlZmluaXRpb24gc2l6ZSBvZiAwLlxyXG4vLyBJdCBpcyBpbnZhbGlkIHRvIGNhbGwgdG9CdWZmZXIgb24gYSBmcmVzaCBjaHVuayFcclxuZnVuY3Rpb24gQ2h1bmsoKSB7XHJcbiAgICB0aGlzLl9oZWFkZXJEZWZpbml0aW9ucyA9IFtdO1xyXG5cclxuICAgIHRoaXMuX3BheWxvYWQgPSBbXTtcclxuICAgIHRoaXMuX2N1cnJlbnRPZmZzZXQgPSAwO1xyXG59XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhDaHVuay5wcm90b3R5cGUsIHtcclxuICAgIHBheWxvYWQ6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLl9wYXlsb2FkO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBwYXlsb2FkU2l6ZToge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudE9mZnNldDtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgaGVhZGVyRGVmaW5pdGlvbnM6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hlYWRlckRlZmluaXRpb25zO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG4vL0FkZHMgdGhlIGdpdmVuIHBheWxvYWQgdG8gdGhlIGNodW5rLlxyXG4vLyBBIGhlYWRlciBkZWZpbml0aW9uIGVudHJ5IHdpbGwgYmUgZ2VuZXJhdGVkIHdpdGggdGhlIGdpdmVuIHBhdGgsIHRoZSBkZWNvZGluZ1NwZWNpZmljYXRpb24gYW5kIG1ldGFkYXRhLlxyXG5DaHVuay5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKGVuY29kZWREYXRhKSB7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZW5jb2RlZERhdGEuZW5jb2RlZFZhbHVlKSlcclxuICAgICAgICBlbmNvZGVkRGF0YS5lbmNvZGVkVmFsdWUgPSBbZW5jb2RlZERhdGEuZW5jb2RlZFZhbHVlXTtcclxuXHJcbiAgICBlbmNvZGVkRGF0YS5lbmNvZGVkVmFsdWUgPSBlbmNvZGVkRGF0YS5lbmNvZGVkVmFsdWUubWFwKGZ1bmN0aW9uICh0eXBlZEFycmF5T3JCdWZmZXIpIHtcclxuICAgICAgICAgaWYgKHR5cGVkQXJyYXlPckJ1ZmZlci5idWZmZXIpXHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlZEFycmF5T3JCdWZmZXIuYnVmZmVyO1xyXG5cclxuICAgICAgICByZXR1cm4gdHlwZWRBcnJheU9yQnVmZmVyO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdmFyIHNpemUgPSBlbmNvZGVkRGF0YS5lbmNvZGVkVmFsdWUucmVkdWNlKGZ1bmN0aW9uIChjdXJyZW50U2l6ZSwgYnVmZmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRTaXplICsgbGVuZ3RoKGJ1ZmZlcik7XHJcbiAgICB9LCAwKTtcclxuXHJcbiAgICB0aGlzLl9wYXlsb2FkID0gdGhpcy5fcGF5bG9hZC5jb25jYXQoZW5jb2RlZERhdGEuZW5jb2RlZFZhbHVlKTtcclxuICAgIHRoaXMuX2hlYWRlckRlZmluaXRpb25zLnB1c2goe1xyXG4gICAgICAgIHBhdGg6IGVuY29kZWREYXRhLnBhdGgsXHJcbiAgICAgICAgb2Zmc2V0OiB0aGlzLl9jdXJyZW50T2Zmc2V0LFxyXG4gICAgICAgIHNpemU6IHNpemUsXHJcbiAgICAgICAgZGVjb2RpbmdTcGVjaWZpY2F0aW9uOiBlbmNvZGVkRGF0YS5kZWNvZGluZ1NwZWNpZmljYXRpb24sXHJcbiAgICAgICAgbWV0YWRhdGE6IGVuY29kZWREYXRhLm1ldGFkYXRhXHJcbiAgICB9KTtcclxuICAgIHRoaXMuX2N1cnJlbnRPZmZzZXQgKz0gc2l6ZTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGxlbmd0aChidWZmZXIpIHtcclxuXHRyZXR1cm4gdHlwZW9mIGJ1ZmZlci5ieXRlTGVuZ3RoICE9PSBcInVuZGVmaW5lZFwiID8gYnVmZmVyLmJ5dGVMZW5ndGggOiBidWZmZXIubGVuZ3RoO1xyXG59XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBDaHVuaztcclxuXHJcbiIsIi8vICMgQ2h1bmtlclxyXG5cclxuLy8gVGhlIGBDaHVua2VyYCByZXByZXNlbnRzIHRoZSBzZWNvbmQgc3RlcCBpbiB0aGUgYmxhc3QgcGlwZWxpbmUgYW5kIGlzIGEgTm9kZUpTIHRyYW5zZm9ybSBzdHJlYW0uXHJcbi8vIEl0IHRha2VzIGVuY29kZWREYXRhIGFuZCB0cmFuc2Zvcm1zIHRoZW0gaW50byBibGFzdCBjaHVua3MuXHJcblxyXG5cInVzZSBzdHJpY3RcIlxyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xyXG5cclxudmFyIENodW5rID0gcmVxdWlyZShcIi4vY2h1bmtcIik7XHJcbnZhciBjYWxsSW1tZWRpYXRlID0gcmVxdWlyZShcIi4vdXRpbC9jYWxsX2ltbWVkaWF0ZVwiKTtcclxuXHJcbi8vIENvbnN0cnVjdHMgYSBDaHVua2VyLlxyXG4vLyBgY2h1bmtTaXplYCBtYXkgc3BlY2lmeSB0aGUgc2l6ZSBvZiBhIGNodW5rIGluIGJ5dGVzLlxyXG4vLyBUaGlzIHNpemUsIGhvd2V2ZXIsIGlzIG9ubHkgYSBzb2Z0bGltaXQgYW5kIGNodW5rcyBtYXkgY29udGFpbiBtb3JlIG9yIGxlc3MgYnl0ZXMgZGVwZW5kaW5nIG9uIHRoZSBzaXplIG9mXHJcbi8vIGluZGl2aWR1YWwgdmFsdWVzLlxyXG5mdW5jdGlvbiBDaHVua2VyKG9wdGlvbnMpIHtcclxuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzLCB7XHJcblx0XHRvYmplY3RNb2RlOiB0cnVlXHJcblx0fSk7XHJcblxyXG4gICAgdGhpcy5fY2h1bmsgPSBuZXcgQ2h1bmsoKTtcclxuXHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHRoaXMuX2NodW5rU2l6ZSA9IG9wdGlvbnMuY2h1bmtTaXplIHx8ICgxIDw8IDMwKTtcclxuICAgIHRoaXMuX2FzeW5jID0gdHlwZW9mIG9wdGlvbnMuYXN5bmMgIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhDaHVua2VyLCBUcmFuc2Zvcm0pO1xyXG5cclxuQ2h1bmtlci5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChlbmNvZGVkRGF0YSwgXywgY2FsbGJhY2spIHtcclxuICAgIGNhbGxJbW1lZGlhdGUodGhpcy5fYXBwZW5kVG9DaHVuay5iaW5kKHRoaXMsIGVuY29kZWREYXRhLCBjYWxsYmFjayksIHRoaXMuX2FzeW5jKTtcclxufTtcclxuXHJcbkNodW5rZXIucHJvdG90eXBlLl9hcHBlbmRUb0NodW5rID0gZnVuY3Rpb24gKGVuY29kZWREYXRhLCBjYWxsYmFjaykge1xyXG5cdHRoaXMuX2NodW5rLmFkZChlbmNvZGVkRGF0YSk7XHJcbiAgICBpZiAodGhpcy5fY2h1bmsucGF5bG9hZFNpemUgPiB0aGlzLl9jaHVua1NpemUpIHtcclxuICAgICAgICB0aGlzLnB1c2godGhpcy5fY2h1bmspO1xyXG4gICAgICAgIHRoaXMuX2NodW5rID0gbmV3IENodW5rKCk7XHJcbiAgICB9XHJcbiAgICBjYWxsYmFjaygpO1xyXG59O1xyXG5cclxuQ2h1bmtlci5wcm90b3R5cGUuX2ZsdXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICBpZiAodGhpcy5fY2h1bmsucGF5bG9hZFNpemUgPiAwKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGNhbGxJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZWxmLnB1c2goc2VsZi5fY2h1bmspO1xyXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgICAgIH0sIHRoaXMuX2FzeW5jKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2soKTtcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IENodW5rZXI7XHJcbiIsIlwidXNlIHN0cmljdFwiXHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xyXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZShcInN0cmVhbVwiKS5UcmFuc2Zvcm07XHJcblxyXG52YXIgY2FsbEltbWVkaWF0ZSA9IHJlcXVpcmUoXCIuL3V0aWwvY2FsbF9pbW1lZGlhdGVcIik7XHJcblxyXG5mdW5jdGlvbiBEZWNodW5rZXIob3B0aW9ucykge1xyXG4gICAgVHJhbnNmb3JtLmNhbGwodGhpcywge1xyXG4gICAgICAgIG9iamVjdE1vZGU6IHRydWVcclxuICAgIH0pO1xyXG5cclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG5cclxuICAgIHRoaXMuX2FzeW5jID0gdHlwZW9mIG9wdGlvbnMuYXN5bmMgIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhEZWNodW5rZXIsIFRyYW5zZm9ybSk7XHJcblxyXG5EZWNodW5rZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIF8sIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBjYWxsSW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvLyBDaHVua3MgZ2VuZXJhdGVkIGJ5IHRoZSBjaHVua2VyIGhhdmUgYW4gYXJyYXkgb2YgQXJyYXlCdWZmZXJzIGFzIHBheWxvYWQuXHJcbiAgICAgICAgLy8gQ2h1bmtzIHJlY2VpdmVkIGJ5IHRoZSBzdHJlYW0gcmVjZWl2ZXIsIGhvd2V2ZXIsIG9ubHkgaGF2ZSBhIHNpbmdsZSBwYXlsb2FkIEFycmF5QnVmZmVyLlxyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShjaHVuay5wYXlsb2FkKSlcclxuICAgICAgICAgICAgY2h1bmsucGF5bG9hZCA9IFtjaHVuay5wYXlsb2FkXTtcclxuXHJcbiAgICAgICAgY2h1bmsuaGVhZGVyRGVmaW5pdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyRGVmaW5pdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gaGVhZGVyRGVmaW5pdGlvbi5vZmZzZXQ7XHJcbiAgICAgICAgICAgIHZhciBidWZmZXIgPSBjaHVuay5wYXlsb2FkWzBdO1xyXG5cclxuICAgICAgICAgICAgLy8gRmluZCB0aGUgYnVmZmVyIGZvciB0aGUgZ2l2ZW4gb2Zmc2V0XHJcbiAgICAgICAgICAgIHZhciBzaXplT2ZQcmV2aW91c0J1ZmZlcnMgPSBjaHVuay5wYXlsb2FkWzBdLmJ5dGVMZW5ndGg7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgY2h1bmsucGF5bG9hZC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9mZnNldCA8PSBzaXplT2ZQcmV2aW91c0J1ZmZlcnMgKyBjaHVuay5wYXlsb2FkW2ldLmJ5dGVMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBjaHVuay5wYXlsb2FkW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IG9mZnNldCAtIHNpemVPZlByZXZpb3VzQnVmZmVycztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNpemVPZlByZXZpb3VzQnVmZmVycyArPSBjaHVuay5wYXlsb2FkW2ldLmJ5dGVMZW5ndGg7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghYnVmZmVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdChcImVyb3JcIiwgbmV3IEVycm9yKFwiQ291bGQgbm90IGZpbmQgYSBidWZmZXIgZm9yIHRoZSBnaXZlbiBvZmZzZXQhXCIpKTtcclxuXHJcbiAgICAgICAgICAgIHNlbGYucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBlbmNvZGVkVmFsdWU6IGJ1ZmZlci5zbGljZShvZmZzZXQsIG9mZnNldCArIGhlYWRlckRlZmluaXRpb24uc2l6ZSksXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBoZWFkZXJEZWZpbml0aW9uLnBhdGgsXHJcbiAgICAgICAgICAgICAgICBkZWNvZGluZ1NwZWNpZmljYXRpb246IGhlYWRlckRlZmluaXRpb24uZGVjb2RpbmdTcGVjaWZpY2F0aW9uLFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IGhlYWRlckRlZmluaXRpb24ubWV0YWRhdGEsXHJcbiAgICAgICAgICAgICAgICBsaXR0bGVFbmRpYW46IGNodW5rLmxpdHRsZUVuZGlhblxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gRGVjaHVua2VyO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XHJcblxyXG5mdW5jdGlvbiBCbGFzdEVycm9yKG1lc3NhZ2UsIHN0YWNrU3RhcnRGdW5jdGlvbikge1xyXG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XHJcbn07XHJcblxyXG51dGlsLmluaGVyaXRzKEJsYXN0RXJyb3IsIEVycm9yKTtcclxuXHJcbkJsYXN0RXJyb3IucHJvdG90eXBlLm5hbWUgPSBcIkJsYXN0IEVycm9yXCI7XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCbGFzdEVycm9yO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmV4cG9ydHMuT2JqZWN0RW5jb2RlciA9IHJlcXVpcmUoXCIuL29iamVjdF9lbmNvZGVyXCIpO1xyXG5leHBvcnRzLkNodW5rZXIgPSByZXF1aXJlKFwiLi9jaHVua2VyXCIpO1xyXG5leHBvcnRzLlN0cmVhbUdlbmVyYXRvciA9IHJlcXVpcmUoXCIuL3N0cmVhbV9nZW5lcmF0b3JcIik7XHJcbmV4cG9ydHMuU3RyZWFtUmVjZWl2ZXIgPSByZXF1aXJlKFwiLi9zdHJlYW1fcmVjZWl2ZXJcIik7XHJcbmV4cG9ydHMuRGVjaHVua2VyID0gcmVxdWlyZShcIi4vZGVjaHVua2VyXCIpO1xyXG5leHBvcnRzLlZhbHVlRGVjb2RlciA9IHJlcXVpcmUoXCIuL3ZhbHVlX2RlY29kZXJcIik7XHJcbmV4cG9ydHMuT2JqZWN0QXNzZW1ibGVyID0gcmVxdWlyZShcIi4vb2JqZWN0X2Fzc2VtYmxlclwiKTtcclxuXHJcbmV4cG9ydHMuUHJlYW1ibGUgPSByZXF1aXJlKFwiLi9wcmVhbWJsZVwiKTtcclxuZXhwb3J0cy5DaHVuayA9IHJlcXVpcmUoXCIuL2NodW5rXCIpO1xyXG5cclxuZXhwb3J0cy5FcnJvciA9IHJlcXVpcmUoXCIuL2Vycm9yXCIpO1xyXG5cclxuZXhwb3J0cy53cmFwU3luY0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbC93cmFwX3N5bmNfZnVuY3Rpb25cIik7XHJcbmV4cG9ydHMuaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUgPSByZXF1aXJlKFwiLi91dGlsL2lzX2xpdHRsZV9lbmRpYW5fYXJjaGl0ZWN0dXJlXCIpO1xyXG4iLCIoZnVuY3Rpb24gKF9fZGlybmFtZSl7XG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBjaGlsZCA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGRlY29kaW5nU3BlY2lmaWNhdGlvbiwgYnVmZmVyLCBsaXR0bGVFbmRpYW4sIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgYyA9IGNoaWxkLmZvcmsoX19kaXJuYW1lICsgXCIvY2hpbGRfbW9kdWxlXCIpO1xyXG4gICAgYy5vbihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwicmVzdWx0XCI6XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBuZXcgVWludDhBcnJheShtZXNzYWdlLnJlc3VsdCkuYnVmZmVyKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBjLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycm9yKSB7XHJcblx0ICAgIGMuZGlzY29ubmVjdCgpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGMuc2VuZCh7XHJcbiAgICAgICAgZGVjb2RpbmdTcGVjaWZpY2F0aW9uOiBkZWNvZGluZ1NwZWNpZmljYXRpb24sXHJcbiAgICAgICAgYnVmZmVyOiBidWZmZXIsXHJcblx0ICAgIGxpdHRsZUVuZGlhbjogbGl0dGxlRW5kaWFuXHJcbiAgICB9KTtcclxufTtcclxuXHJcblxufSkuY2FsbCh0aGlzLFwiLy4uXFxcXG5vZGVfbW9kdWxlc1xcXFxibGFzdFxcXFxsaWJcXFxcbm9kZVwiKSIsIlwidXNlIHN0cmljdFwiXHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xyXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZShcInN0cmVhbVwiKS5UcmFuc2Zvcm07XHJcblxyXG52YXIganBhdGggPSByZXF1aXJlKFwianBhdGhcIik7XHJcblxyXG52YXIgY2FsbEltbWVkaWF0ZSA9IHJlcXVpcmUoXCIuL3V0aWwvY2FsbF9pbW1lZGlhdGVcIik7XHJcblxyXG5mdW5jdGlvbiBPYmplY3RBc3NlbWJsZXIob3B0aW9ucykge1xyXG4gICAgVHJhbnNmb3JtLmNhbGwodGhpcywge1xyXG4gICAgICAgIG9iamVjdE1vZGU6IHRydWVcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuX2RlY29kZWRPYmplY3QgPSB7fTtcclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG5cclxuICAgIHRoaXMuX2FzeW5jID0gdHlwZW9mIG9wdGlvbnMuYXN5bmMgIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhPYmplY3RBc3NlbWJsZXIsIFRyYW5zZm9ybSk7XHJcblxyXG5PYmplY3RBc3NlbWJsZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZGVjb2RlZERhdGEsIF8sIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBjYWxsSW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBqcGF0aC5ldmFsdWF0ZShkZWNvZGVkRGF0YS5wYXRoLCBzZWxmLl9kZWNvZGVkT2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdC5pc1Jvb3QpXHJcbiAgICAgICAgICAgICAgICBzZWxmLl9kZWNvZGVkT2JqZWN0ID0gZGVjb2RlZERhdGEudmFsdWU7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IGRlY29kZWREYXRhLnZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICB9LCB0aGlzLl9hc3luYyk7XHJcbn07XHJcblxyXG5PYmplY3RBc3NlbWJsZXIucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgY2FsbEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2VsZi5wdXNoKHNlbGYuX2RlY29kZWRPYmplY3QpO1xyXG4gICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICB9LCB0aGlzLl9hc3luYyk7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBPYmplY3RBc3NlbWJsZXI7XHJcbiIsIi8vICMgT2JqZWN0RW5jb2RlclxyXG5cclxuLy8gQW4gYE9iamVjdEVuY29kZXJgIGlzIGEgTm9kZUpTIHRyYW5zZm9ybSBzdHJlYW0gdGhhdCB0cmFuc2Zvcm1zIGEgZ2l2ZW4gb2JqZWN0IHVzaW5nIHRoZSBzcGVjaWZpZWQgZW5jb2RlcnMuXHJcbi8vIEVuY29kZXJzIGFyZSBtYXBwZWQgdG8gdmFsdWVzIHVzaW5nIEpQYXRoIGV4cHJlc3Npb25zLlxyXG4vLyBgYGBqYXZhc2NyaXB0XHJcbi8vIHtcclxuLy9cdFx0cGF0aDogL3NlbGVjdG9yXHJcbi8vXHRcdGVuY29kZXI6IGVuY29kZXJGb3JWYWx1ZUF0UGF0aFxyXG4vLyB9XHJcbi8vIGBgYFxyXG4vLyBBbiBhcnJheSBvZiB0aGVzZSBtYXBwaW5ncyBpcyBwYXNzZWQgdG8gdGhlIHdyaXRlIGZ1bmN0aW9ucyBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50LlxyXG4vLyBPbmx5IHZhbHVlcyB0aGF0IGFyZSBzZWxlY3RlZCBieSB0aGUgSlBhdGggZXhwcmVzc2lvbnMgYXJlIHRyYW5zZm9ybWVkLlxyXG4vLyBUaGUgcGF0aC1lbmNvZGVyIG1hcHBpbmcgY2FuIG9wdGlvbmFsbHkgaW5jbHVkZSBhbHNvIG1ldGFkYXRhIHRoYXQgaXMgbm90IGVuY29kZWQgdW5jb25kaXRpb25hbGx5XHJcbi8vIGZvcndhcmRlZCB0aHJvdWdoIHRoZSBzdHJlYW0uXHJcblxyXG5cclxuLy8gIyMgRW5jb2RlclxyXG5cclxuLy8gQW4gZW5jb2RlciBpcyBhbiBvYmplY3QgdGhhdCBwcm92aWRlcyB0aGUgZm9sbG93aW5nIGludGVyZmFjZTpcclxuXHJcbi8vIC0gQSBmdW5jdGlvbiBgZW5jb2RlYCB0aGF0IGdpdmVuIGEgdmFsdWUgcmV0dXJucyBhbiBgQXJyYXlCdWZmZXJgLlxyXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHR3byBhcmd1bWVudHMsIHRoZSB2YWx1ZSB0byBlbmNvZGUgYW5kIGEgYm9vbGVhbiBzcGVjaWZ5aW5nIGlmIHRoZSByZXN1bHRpbmcgYnVmZmVyXHJcbi8vIHNob3VsZCBiZSBpbiBsaXR0bGUtZW5kaWFuIChgdHJ1ZWApIG9yIGJpZy1lbmRpYW4gKGBmYWxzZWApIGZvcm1hdC5cclxuLy8gRW5kaWFubmVzIGlzIHNwZWNpZmllZCB3aXRoIHVzaW5nIGEgYm9vbGVhbiB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBpbnRlcmZhY2Ugb2YgdGhlIERhdGFWaWV3IGluIHRoZVxyXG4vLyBUeXBlZEFycmF5IHNwZWNpZmljYXRpb24gYW5kIGNhbiBzYXZlbHkgYmUgcGFzc2VkIGFzIHRoZSBzZWNvbmQgYXJndW1lbnQgdG8gYWxsIGBEYXRhVmlldyNnZXRgIGFuZCBgRGF0YVZpZXcjc2V0YCBtZXRob2RzLlxyXG4vLyBPcHRpb25hbGx5IHRoZSBmdW5jdGlvbiBjYW4gdGFrZSBhIHRoaXJkIGFyZ3VtZW50LCBhIGNhbGxiYWNrLCBpbiBjYXNlIHRoZSBlbmNvZGluZyBpcyBhc3luY2hyb25vdXMuXHJcbi8vIEFuIGBlbmNvZGVgIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhyZWUgb3IgYSB2YXJpYWJsZSBudW1iZXIgb2YgYXJndW1lbnQgaXMgY29uc2lkZXJlZCB0byBiZSBhc3luY2hyb25vdXMuXHJcbi8vIFRoZSBwcm92aWRlZCBjYWxsYmFjayBleHBlY3RzIHR3byBwYXJhbWV0ZXJzOlxyXG4vL1xyXG4vLyAxLiBBbiBlcnJvciBvYmplY3QgaW4gY2FzZSBhbnl0aGluZyB3ZW50IHdyb25nLlxyXG4vLyAyLiBUaGUgYEFycmF5QnVmZmVyYCBjb250YWluaW5nIHRoZSBlbmNvZGVkIHZhbHVlLlxyXG4vL1xyXG4vLyBJZiB0aGUgZnVuY3Rpb24gaXMgc3luY2hyb25vdXMsIGVycm9ycyBzaG91ZCBiZSByZXBvcnRlZCBieSB0aHJvd2luZyBhbiBleGNlcHRpb24uXHJcbi8vXHJcbi8vIC0gQSBwcm9wZXJ0eSBgZGVjb2RpbmdTcGVjaWZpY2F0aW9uYCB0aGF0IGNvbnRhaW5zIGEgVVJMIHRoYXQgdW5pcXVlbHkgaWRlbnRpZmllcyB0aGUgZGVjb2RpbmcgcHJvY2VkdXJlXHJcbi8vIG5lY2Vzc2FyeSB0byBkZWNvZGUgdGhlIG9yaWdpbmFsIGRhdGEgZnJvbSB0aGUgYEFycmF5QnVmZmVyYCByZXR1cm5lZCBieSB0aGUgYGVuY29kZWAgZnVuY3Rpb24uXHJcbi8vIFRoaXMgVVJMIG1heWJlIHF1ZXJpZWQgZm9yIGEgZGVjb2RpbmcgaW1wbGVtZW50YXRpb24gYXQgdGhlIGNsaWVudCBzaWRlIHVzaW5nIGFuIEhUVFAtR0VUIHJlcXVlc3RcclxuLy8gd2l0aCBhbiBhY2NlcHQtaGVhZGVyOiBcImFwcGxpY2F0aW9uL2phdmFzY3JpcHRcIi5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJ3N0cmVhbScpLlRyYW5zZm9ybTtcclxuXHJcbnZhciBhc3luYyA9IHJlcXVpcmUoXCJhc3luY1wiKTtcclxudmFyIGpwYXRoID0gcmVxdWlyZShcImpwYXRoXCIpO1xyXG5cclxudmFyIGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlID0gcmVxdWlyZShcIi4vdXRpbC9pc19saXR0bGVfZW5kaWFuX2FyY2hpdGVjdHVyZVwiKTtcclxudmFyIHdyYXBTeW5jRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsL3dyYXBfc3luY19mdW5jdGlvblwiKTtcclxudmFyIGNhbGxJbW1lZGlhdGUgPSByZXF1aXJlKFwiLi91dGlsL2NhbGxfaW1tZWRpYXRlXCIpO1xyXG5cclxuLy8gQ3JlYXRlcyBhbiBPYmplY3RFbmNvZGVyIGluc3RhbmNlLlxyXG4vLyBJZiBsaXR0bGVFbmRpYW4gaXMgdW5kZWZpbmVkIHRoZSBjdXJyZW50IHN5c3RlbSBhcmNoaXRlY3R1cmUncyBlbmRpYW5uZXNzIHdpbGwgYmUgdXNlZC5cclxuLy8gVGhlIGdpdmVuIHZhbHVlIGZvciBsaXR0bGVFbmRpYW4gd2lsbCBiZSBmb3J3YXJkZWQgdG8gYWxsIGVuY29kZXJzLlxyXG5mdW5jdGlvbiBPYmplY3RFbmNvZGVyKG9wdGlvbnMpIHtcclxuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzLCB7XHJcblx0XHRvYmplY3RNb2RlOiB0cnVlXHJcblx0fSk7XHJcblxyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcblxyXG4gICAgdGhpcy5fbGl0dGxlRW5kaWFuID0gdHlwZW9mIG9wdGlvbnMubGl0dGxlRW5kaWFuICE9PSBcInVuZGVmaW5lZFwiID8gb3B0aW9ucy5saXR0bGVFbmRpYW4gOiBpc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSgpO1xyXG4gICAgdGhpcy5fYXN5bmMgPSB0eXBlb2Ygb3B0aW9ucy5hc3luYyAhPT0gXCJ1bmRlZmluZWRcIiA/IG9wdGlvbnMuYXN5bmMgOiB0cnVlO1xyXG59XHJcblxyXG51dGlsLmluaGVyaXRzKE9iamVjdEVuY29kZXIsIFRyYW5zZm9ybSk7XHJcblxyXG4vLyBTdGFydHMgdGhlIGVuY29kaW5nIG9mIHRoZSBnaXZlbiBvYmplY3QgY29uc2lkZXJpbmcgdGhlIGdpdmVuIHBhdGggZW5jb2RlciBtYXBwaW5ncy5cclxuLy8gV2UgZG8gbm90IHN0YXJ0IHRoZSBlbmNvZGluZyBwcm9jZXNzIGRpcmVjdGx5LCBidXQgZGVsYXkgZW5jb2RpbmcgdXNpbmcgc2V0SW1tZWRpYXRlLlxyXG4vLyBFbmNvZGluZyB3aWxsIHN0YXJ0IGFzIHNvb24gYXMgdGhlIFZNIGhhcyByZXRha2VuIGNvbnRyb2wgYW5kIGNvbXBsZXRlZCBvdGhlciBwZW5kaW5nIG9wZXJhdGlvbnMuXHJcbi8vIFRoaXMgaXMgaW1wb3J0YW50IHRvIG1pbWljIHRoZSBiZWhhdmlvciBvZiBhbGwgTm9kZUpTIHN0cmVhbXMgdGhhdCBhcmUgYXN5bmNocm9ub3VzLlxyXG4vLyBUaGUgdXNlciBjYW4gbm93IHJlZ2lzdGVyIGV2ZW50IGxpc3RlbmVycyBhZnRlciBjYWxsaW5nIHdyaXRlL2VuZCB3aXRob3V0IHJpc2tpbmcgdG9cclxuLy8gbWlzcyBldmVudHMgc2luY2UgdGhlIGFjdHVhbCBlbmNvZGluZyB3aWxsIHN0YXJ0IGFzIGVhcmx5IGFzIHRoZSB1c2VycyBjdXJyZW50IGNvbnRyb2wgZmxvdyBlbmRzLlxyXG5PYmplY3RFbmNvZGVyLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKG9iamVjdFRvRW5jb2RlLCBzZWxlY3Rvck9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcbiAgICBjYWxsSW1tZWRpYXRlKHRoaXMuX2VuY29kZS5iaW5kKHRoaXMsIG9iamVjdFRvRW5jb2RlLCBzZWxlY3Rvck9wdGlvbnMsIGNhbGxiYWNrKSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuT2JqZWN0RW5jb2Rlci5wcm90b3R5cGUuX2VuY29kZSA9IGZ1bmN0aW9uIChvYmplY3RUb0VuY29kZSwgc2VsZWN0b3JPcHRpb25zLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIHVubWF0Y2hlZFBhcnRzID0gb2JqZWN0VG9FbmNvZGU7XHJcbiAgICB2YXIgc2VsZWN0b3JPcHRpb25zQ291bnQgPSBzZWxlY3Rvck9wdGlvbnMubGVuZ3RoO1xyXG4gICAgdmFyIGN1cnJlbnRTZWxlY3RvcklkeCA9IDA7XHJcblx0YXN5bmMuZWFjaFNlcmllcyhzZWxlY3Rvck9wdGlvbnMsIGZ1bmN0aW9uIChvcHRpb25zLCBjYWxsYmFjaykge1xyXG5cdFx0dmFyIHJlc3VsdHMgPSBqcGF0aC5ldmFsdWF0ZShvcHRpb25zLnBhdGgsIHVubWF0Y2hlZFBhcnRzKVxyXG5cdFx0YXN5bmMuZWFjaChyZXN1bHRzLmRlZmluZWRSZXN1bHRzLCBmdW5jdGlvbiAocmVzdWx0LCBjYWxsYmFjaykge1xyXG5cdFx0XHR2YXIgZW5jb2RlciA9IG9wdGlvbnMuZW5jb2RlcjtcclxuXHRcdFx0d3JhcFN5bmNGdW5jdGlvbihlbmNvZGVyLmVuY29kZS5iaW5kKGVuY29kZXIpKShyZXN1bHQudmFsdWUsIHNlbGYuX2xpdHRsZUVuZGlhbiwgZnVuY3Rpb24gKGVycm9yLCBlbmNvZGVkVmFsdWUpIHtcclxuXHRcdFx0XHRpZiAoZXJyb3IpXHJcblx0XHRcdFx0XHRyZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdHNlbGYucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5jb2RlZFZhbHVlOiBlbmNvZGVkVmFsdWUsXHJcblx0XHRcdFx0XHRwYXRoOiByZXN1bHQucGF0aCxcclxuXHRcdFx0XHRcdGRlY29kaW5nU3BlY2lmaWNhdGlvbjogZW5jb2Rlci5kZWNvZGluZ1NwZWNpZmljYXRpb24sXHJcblx0XHRcdFx0XHRtZXRhZGF0YTogb3B0aW9ucy5tZXRhZGF0YVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNhbGxiYWNrKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSwgY2FsbGJhY2spO1xyXG4gICAgICAgICsrY3VycmVudFNlbGVjdG9ySWR4O1xyXG4gICAgICAgIC8vIE9ubHkgZXZhbHVhdGUgdW5tYXRjaGVkIHBhcnQgaWYgdGhlcmUgaXMgYW5vdGhlciBzZWxlY3RvciBmb2xsb3dpbmdcclxuLy8gICAgICAgIGlmIChjdXJyZW50U2VsZWN0b3JJZHggPCBzZWxlY3Rvck9wdGlvbnNDb3VudClcclxuLy9cdFx0ICAgIHVubWF0Y2hlZFBhcnRzID0ganBhdGguZXh0cmFjdFVuY292ZXJlZFBhcnRzKG9wdGlvbnMucGF0aCwgdW5tYXRjaGVkUGFydHMpO1xyXG5cclxuXHR9LCBjYWxsYmFjayk7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBPYmplY3RFbmNvZGVyO1xyXG4iLCIvLyAjIFByZWFtYmxlXHJcblxyXG4vLyBUaGUgcHJlYW1ibGUgb2YgYSBibGFzdCBvY3RldCBzdHJlYW0gY29tcHJpc2VzIHRoZSBmb2xsb3dpbmcgY29tcG9uZW50czpcclxuLy9cclxuLy8gLSBTaWduYXR1cmU6IEEgdWludDMyIHZhbHVlIGVxdWFsIHRvIGAweDYyNkM3Mzc0YCAoQVNDSUkgZW5jb2RlZCBcImJsc3RcIikuXHJcbi8vIFRoaXMgc2lnbmF0dXJlIHZhbHVlIGlzIGZvciBpZGVudGlmaWNhdGlvbiBhcyB3ZWxsIGFzIGVuZGlhbm5lc3MgZGV0ZWN0aW9uIG9mIHRoZSBpbmNvbWluZyBzdHJlYW0uXHJcbi8vIC0gTWFqb3IgVmVyc2lvbjogQSB1aW50OCB2YWx1ZSB0aGF0IHNwZWNpZmllcyB0aGUgbWFqb3IgdmVyc2lvbiBvZiB0aGUgaW5jb21pbmcgc3RyZWFtJ3MgZm9ybWF0LlxyXG4vLyAtIE1pbm9yIFZlcnNpb246IEEgdWludDggdmFsdWUgdGhhdCBzcGVjaWZpZXMgdGhlIG1pbm9yIHZlcnNpb24gb2YgdGhlIGluY29taW5nIHN0cmVhbTtzIGZvcm1hdC5cclxuLy8gLSBIZWFkZXIgRGVjb2RpbmcgU3BlY2lmaWNhdGlvbjogQSBOVUwgXCJcXDBcIiB0ZXJtaW5hdGVkIEFTQ0lJIGVuY29kZWQgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBkZWNvZGluZyBwcm9jZWR1cmUgdG9cclxuLy8gZW5jb2RlIGEgY2h1bmtzIGhlYWRlciBpbmZvcm1hdGlvbi5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGFib3BzID0gcmVxdWlyZShcImFib3BzXCIpO1xyXG5cclxudmFyIFByZWFtYmxlID0ge307XHJcblxyXG4vLyBBU0NJSSBibHN0XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFByZWFtYmxlLCB7XHJcblx0LyoqXHJcblx0ICogVGhlIHNpZ25hdHVyZSBieXRlcyB0aGF0IGNhbiBiZSB1c2VkIHRvIGlkZW50aWZ5IHRoZSBvY3RldCBzdHJlYW0gYW5kIGl0cyBlbmRpYW5uZXNzLlxyXG5cdCAqXHJcblx0ICogQHB1YmxpY1xyXG5cdCAqIEBwcm9wZXJ0eSBzaWduYXR1cmVcclxuXHQgKiBAY29uc3RhbnRcclxuXHQgKiBAdHlwZSB7dWludDMyfVxyXG5cdCAqL1xyXG5cdHNpZ25hdHVyZToge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdC8vIEFTQ0lJIGJsc3RcclxuXHRcdFx0cmV0dXJuIDB4NjI2QzczNzQ7XHJcblx0XHR9XHJcblx0fSxcclxuXHQvKipcclxuXHQgKiBNaW5vciB2ZXJzaW9uIG51bWJlclxyXG5cdCAqXHJcblx0ICogU2l6ZTogMSBPY3RldHNcclxuXHQgKiBAcHVibGljXHJcblx0ICogQHByb3BlcnR5IG1ham9yVmVyc2lvblxyXG5cdCAqIEBjb25zdGFudFxyXG5cdCAqIEB0eXBlIHtpbnR9XHJcblx0ICovXHJcblx0bWFqb3JWZXJzaW9uOiB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIDB4MDA7XHJcblx0XHR9XHJcblx0fSxcclxuXHQvKipcclxuXHQgKiBNaW5vciB2ZXJzaW9uIG51bWJlclxyXG5cdCAqXHJcblx0ICogU2l6ZTogMSBPY3RldHNcclxuXHQgKiBAcHVibGljXHJcblx0ICogQHByb3BlcnR5IG1pbm9yVmVyc2lvblxyXG5cdCAqIEBjb25zdGFudFxyXG5cdCAqIEB0eXBlIHtpbnR9XHJcblx0ICovXHJcblx0bWlub3JWZXJzaW9uOiB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIDB4MDE7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgYmxhc3QgcHJlYW1ibGUgYnVmZmVyIGNvbnRhaW5pbmcgdGhlIGJpbmFyeSByZXByZXNlbnRhdGlvbiBvZiB0aGUgcHJlYW1ibGUgaW4gdGhlIGdpdmVuIGVuZGlhbm5lc3MuXHJcbiAqIFRoaXMgaW5jbHVkZXMgNCBvY3RldHMgc2lnbmF0dXJlIGJ5dGVzICsgMSBvY3RldCBtYWpvciB2ZXJzaW9uIG51bWJlciArIDEgb2N0ZXQgbWlub3IgdmVyc2lvbiBudW1iZXIgKyB2YXJpYWJsZSBsZW5ndGhcclxuICogQVNDSUkgZW5jb2RlZCBOVUwgdGVybWluYXRlZCBVUkwgZm9yIHRoZSBoZWFkZXIgZGVjb2Rpbmcgc3BlY2lmaWNhdGlvbi5cclxuICpcclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gY3JlYXRlUHJlYW1ibGVCdWZmZXJcclxuICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlckRlY29kaW5nU3BlY2lmaWNhdGlvbiBBIFVSTCB0aGF0IHVuaXF1ZWx5IGlkZW50aWZpZXMgdGhlIGRlY29kaW5nIHByb2NlZHVyZSB0byBkZWNvZGUgdGhlIGhlYWRlclxyXG4gKiBpbmZvcm1hdGlvbiBvZiB0aGUgY2h1bmtzIGluIHRoZSBzdHJlYW0uXHJcbiAqIEBwYXJhbSB7Ym9vbH0gW2xpdHRsZUVuZGlhbiA9IGZhbHNlXSBJZiB0cnVlIHRoZSBidWZmZXIgd2lsbCBiZSB3cml0dGVuIGluIGxpdHRsZS1lbmRpYW4gZm9ybWF0LlxyXG4gKiBAcmV0dXJuIHtBcnJheUJ1ZmZlcn0gQW4gQXJyYXlCdWZmZXIgY29udGFpbmluZyB0aGUgcHJlYW1ibGUgb2N0ZXQgc3RyZWFtLlxyXG4gKi9cclxuUHJlYW1ibGUuYnVmZmVyID0gZnVuY3Rpb24gKGhlYWRlckRlY29kaW5nU3BlY2lmaWNhdGlvbiwgbGl0dGxlRW5kaWFuKSB7XHJcblx0Ly8gVGhlIHNpemUgb2YgdGhlIGJ1ZmZlcjpcclxuXHQvLyA0IG9jdGV0IHNpZ25hdHVyZSArIDEgb2N0ZXQgbWlub3IgdmVyc2lvbiArIDEgb2N0ZXQgbWFqb3IgdmVyc2lvbiArIEhlYWRlckRlY29kZXJVUkwgYXMgYXNjaWkgKyBOVUxMIGJ5dGVcclxuXHR2YXIgdXJsU2l6ZSA9IGFib3BzLmJ5dGVTaXplRm9yU3RyaW5nKGhlYWRlckRlY29kaW5nU3BlY2lmaWNhdGlvbiwgXCJhc2NpaVwiKSArIDE7XHJcblx0dmFyIGJ1ZmZlclNpemUgPSA0ICsgMSArIDEgKyB1cmxTaXplO1xyXG5cdHZhciBidWZmZXJWaWV3ID0gbmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcihidWZmZXJTaXplKSk7XHJcblx0dmFyIGJ1ZmZlck9mZnNldCA9IDA7XHJcblxyXG5cdGJ1ZmZlclZpZXcuc2V0VWludDMyKGJ1ZmZlck9mZnNldCwgUHJlYW1ibGUuc2lnbmF0dXJlLCBsaXR0bGVFbmRpYW4pO1xyXG5cdGJ1ZmZlck9mZnNldCArPSA0O1xyXG5cclxuXHRidWZmZXJWaWV3LnNldFVpbnQ4KGJ1ZmZlck9mZnNldCwgUHJlYW1ibGUubWFqb3JWZXJzaW9uKTtcclxuXHRidWZmZXJPZmZzZXQgKz0gMTtcclxuXHJcblx0YnVmZmVyVmlldy5zZXRVaW50OChidWZmZXJPZmZzZXQsIFByZWFtYmxlLm1pbm9yVmVyc2lvbik7XHJcblx0YnVmZmVyT2Zmc2V0ICs9IDE7XHJcblxyXG4gICAgYWJvcHMuc2V0Q1N0cmluZyhidWZmZXJWaWV3LCBidWZmZXJPZmZzZXQsIGhlYWRlckRlY29kaW5nU3BlY2lmaWNhdGlvbik7XHJcblxyXG5cdHJldHVybiBidWZmZXJWaWV3LmJ1ZmZlcjtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFByZWFtYmxlO1xyXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5pZiAocHJvY2Vzcy5icm93c2VyKVxyXG4gICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vYnJvd3Nlci9ydW5fZXh0ZXJuYWxfZGVjb2RpbmdcIik7XHJcbmVsc2VcclxuICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL25vZGUvcnVuX2V4dGVybmFsX2RlY29kaW5nXCIpO1xyXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpKSIsIihmdW5jdGlvbiAocHJvY2VzcyxCdWZmZXIpe1xuLy8gIyBTdHJlYW1HZW5lcmF0b3JcclxuXHJcbi8vIEdlbmVyYXRlcyB0aGUgZmluYWwgb3V0cHV0IHN0cmVhbSB0aGF0IGNhbiBiZSBzZW50IG92ZXIgdGhlIHdpcmUuXHJcbi8vIEl0IHRha2VzIGNodW5rcyBhcyBnZW5lcmF0ZWQgYnkgdGhlIENodW5rZXIgYW5kIGNhbGxzIHRoZWlyIHRvQnVmZmVyIG1ldGhvZC5cclxuLy8gVGhpcyBidWZmZXIgaXMgdGhlbiBlbWl0dGVkIGluIHRoZSBkYXRhIGV2ZW50LlxyXG4vLyBJdCBhbHNvIGdlbmVyYXRlcyB0aGUgcHJlYW1ibGUgb2YgdGhlIHN0cmVhbS5cclxuLy8gRm9yIGNvbnZpbmllbmNlIGl0IGRpZmZlcmVudGlhdGVzIGJldHdlZW4gTm9kZUpTIGFuZCBCcm93c2VyIGVudmlyb25tZW50LlxyXG4vLyBJbiBOb2RlSlMgdGhlIGJ1ZmZlcnMgYXJlIE5vZGVKUyBidWZmZXJzIHRoYXQgY2FuIGJlIHBpcGVkIGludG8gYSBzZXJ2ZXIncyByZXNwb25zZSBvYmplY3QuXHJcblxyXG5cInVzZSBzdHJpY3RcIlxyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xyXG5cclxudmFyIGpzb25Db2RlYyA9IHJlcXVpcmUoXCJibGFzdC1jb2RlY3NcIikuanNvbjtcclxuXHJcbnZhciBCbGFzdEVycm9yID0gcmVxdWlyZShcIi4vZXJyb3JcIik7XHJcbnZhciBQcmVhbWJsZSA9IHJlcXVpcmUoXCIuL3ByZWFtYmxlXCIpO1xyXG52YXIgQ2h1bmsgPSByZXF1aXJlKFwiLi9jaHVua1wiKTtcclxudmFyIHdyYXBTeW5jRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsL3dyYXBfc3luY19mdW5jdGlvblwiKTtcclxudmFyIGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlID0gcmVxdWlyZShcIi4vdXRpbC9pc19saXR0bGVfZW5kaWFuX2FyY2hpdGVjdHVyZVwiKTtcclxudmFyIGNhbGxJbW1lZGlhdGUgPSByZXF1aXJlKFwiLi91dGlsL2NhbGxfaW1tZWRpYXRlXCIpO1xyXG5cclxuZnVuY3Rpb24gU3RyZWFtR2VuZXJhdG9yKG9wdGlvbnMpIHtcclxuICAgIFRyYW5zZm9ybS5jYWxsKHRoaXMpO1xyXG5cclxuICAgIHRoaXMuX3dyaXRhYmxlU3RhdGUub2JqZWN0TW9kZSA9IHRydWU7XHJcbiAgICB0aGlzLl9yZWFkYWJsZVN0YXRlLm9iamVjdE1vZGUgPSBmYWxzZTtcclxuXHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuXHJcbiAgICB0aGlzLl9oZWFkZXJFbmNvZGVyID0gb3B0aW9ucy5oZWFkZXJFbmNvZGVyIHx8IHtcclxuXHRcdGVuY29kZTogd3JhcFN5bmNGdW5jdGlvbihqc29uQ29kZWMuZW5jb2RlLmJpbmQoanNvbkNvZGVjKSksXHJcblx0XHRkZWNvZGluZ1NwZWNpZmljYXRpb246IFwiaHR0cDovL3d3dy5ibGFzdC1mb3JtYXQuY29tLzAuMS9oZWFkZXJEZWNvZGluZ1NwZWNpZmljYXRpb24vXCJcclxuXHR9O1xyXG5cdHRoaXMuX2xpdHRsZUVuZGlhbiA9IHR5cGVvZiBvcHRpb25zLmxpdHRsZUVuZGlhbiAhPT0gXCJ1bmRlZmluZWRcIiA/IG9wdGlvbnMubGl0dGxlRW5kaWFuIDogaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUoKTtcclxuICAgIHRoaXMuX2FzeW5jID0gdHlwZW9mIG9wdGlvbnMuYXN5bmMgIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhTdHJlYW1HZW5lcmF0b3IsIFRyYW5zZm9ybSk7XHJcblxyXG5TdHJlYW1HZW5lcmF0b3IucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIF8sIGNhbGxiYWNrKSB7XHJcblx0aWYgKCF0aGlzLl9wcmVhbWJsZVB1c2hlZClcclxuICAgICAgICBjYWxsSW1tZWRpYXRlKHRoaXMuX3B1c2hQcmVhbWJsZS5iaW5kKHRoaXMpLCB0aGlzLl9hc3luYyk7XHJcbiAgICBjYWxsSW1tZWRpYXRlKHRoaXMuX2VuY29kZUNodW5rLmJpbmQodGhpcywgY2h1bmssIGNhbGxiYWNrKSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuU3RyZWFtR2VuZXJhdG9yLnByb3RvdHlwZS5fcHVzaFByZWFtYmxlID0gZnVuY3Rpb24gKCkge1xyXG5cdHRoaXMuX3B1c2hCdWZmZXIoUHJlYW1ibGUuYnVmZmVyKHRoaXMuX2hlYWRlckVuY29kZXIuZGVjb2RpbmdTcGVjaWZpY2F0aW9uLCB0aGlzLl9saXR0bGVFbmRpYW4pKTtcclxuXHR0aGlzLl9wcmVhbWJsZVB1c2hlZCA9IHRydWU7XHJcbn07XHJcblxyXG5TdHJlYW1HZW5lcmF0b3IucHJvdG90eXBlLl9lbmNvZGVDaHVuayA9IGZ1bmN0aW9uIChjaHVuaywgY2FsbGJhY2spIHtcclxuXHR2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB0aGlzLl9oZWFkZXJFbmNvZGVyLmVuY29kZShjaHVuay5oZWFkZXJEZWZpbml0aW9ucywgdGhpcy5fbGl0dGxlRW5kaWFuLCBmdW5jdGlvbiAoZXJyb3IsIGhlYWRlckRlZmluaXRpb25zQnVmZmVyKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKVxyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyb3IpO1xyXG5cclxuICAgICAgICB2YXIgaGVhZGVyU2l6ZSA9IGhlYWRlckRlZmluaXRpb25zQnVmZmVyLmJ5dGVMZW5ndGg7XHJcblxyXG4gICAgICAgIC8vIFRoZSBvdmVyYWxsIGJ1ZmZlciBjb250YWlucyBub3Qgb25seSB0aGUgaGVhZGVyIGFuZCB0aGUgcGF5bG9hZCxcclxuICAgICAgICAvLyBidXQgNCBieXRlcyBmb3IgdGhlIGhlYWRlciBzaXplIGFuZCA0IGJ5dGVzIGZvciB0aGUgb3ZlcmFsbCBjaHVuayBzaXplO1xyXG4gICAgICAgIHZhciBvdmVyYWxsQ2h1bmtTaXplID0gNCArIDQgKyBoZWFkZXJTaXplICsgY2h1bmsucGF5bG9hZFNpemU7XHJcbiAgICAgICAgdmFyIHNpemVCdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoOCk7XHJcbiAgICAgICAgdmFyIHNpemVWaWV3ID0gbmV3IERhdGFWaWV3KHNpemVCdWZmZXIpO1xyXG5cclxuICAgICAgICBzaXplVmlldy5zZXRVaW50MzIoMCwgb3ZlcmFsbENodW5rU2l6ZSwgc2VsZi5fbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICBzaXplVmlldy5zZXRVaW50MzIoNCwgaGVhZGVyU2l6ZSwgc2VsZi5fbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICBzZWxmLl9wdXNoQnVmZmVyKHNpemVCdWZmZXIpO1xyXG4gICAgICAgIHNlbGYuX3B1c2hCdWZmZXIoaGVhZGVyRGVmaW5pdGlvbnNCdWZmZXIpO1xyXG4gICAgICAgIGNodW5rLnBheWxvYWQuZm9yRWFjaChzZWxmLl9wdXNoQnVmZmVyLmJpbmQoc2VsZikpO1xyXG4gICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcblN0cmVhbUdlbmVyYXRvci5wcm90b3R5cGUuX3B1c2hCdWZmZXIgPSBmdW5jdGlvbiAoYnVmZmVyKSB7XHJcblx0dGhpcy5wdXNoKHRvQnVmZmVyKGJ1ZmZlcikpO1xyXG59O1xyXG5cclxuU3RyZWFtR2VuZXJhdG9yLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIGNhbGxJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNlbGYuX3B1c2hCdWZmZXIobmV3IEFycmF5QnVmZmVyKDQpKTtcclxuICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gdG9CdWZmZXIoYnVmZmVyKSB7XHJcblx0aWYgKHByb2Nlc3MuYnJvd3Nlcikge1xyXG5cdFx0aWYgKGJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKVxyXG5cdFx0XHRyZXR1cm4gYnVmZmVyO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHRyZXR1cm4gYnVmZmVyLnRvQXJyYXlCdWZmZXIoKTtcclxuXHR9XHJcblxyXG5cdGlmIChidWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcilcclxuXHRcdHJldHVybiBuZXcgQnVmZmVyKG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBidWZmZXI7XHJcblxyXG59XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1HZW5lcmF0b3I7XHJcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIrTnNjTm1cIikscmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIpIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xyXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZShcInN0cmVhbVwiKS5UcmFuc2Zvcm07XHJcblxyXG52YXIgYWJvcHMgPSByZXF1aXJlKFwiYWJvcHNcIik7XHJcbnZhciBqc29uQ29kZWMgPSByZXF1aXJlKFwiYmxhc3QtY29kZWNzXCIpLmpzb247XHJcblxyXG52YXIgQmxhc3RFcnJvciA9IHJlcXVpcmUoXCIuL2Vycm9yXCIpO1xyXG52YXIgUHJlYW1ibGUgPSByZXF1aXJlKFwiLi9wcmVhbWJsZVwiKTtcclxudmFyIHdyYXBTeW5jRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsL3dyYXBfc3luY19mdW5jdGlvblwiKTtcclxudmFyIGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlID0gcmVxdWlyZShcIi4vdXRpbC9pc19saXR0bGVfZW5kaWFuX2FyY2hpdGVjdHVyZVwiKTtcclxudmFyIGNhbGxJbW1lZGlhdGUgPSByZXF1aXJlKFwiLi91dGlsL2NhbGxfaW1tZWRpYXRlXCIpO1xyXG5cclxuZnVuY3Rpb24gU3RyZWFtUmVjZWl2ZXIob3B0aW9ucykge1xyXG5cdFRyYW5zZm9ybS5jYWxsKHRoaXMpO1xyXG5cclxuXHR0aGlzLl93cml0YWJsZVN0YXRlLm9iamVjdE1vZGUgPSBmYWxzZTtcclxuXHR0aGlzLl9yZWFkYWJsZVN0YXRlLm9iamVjdE1vZGUgPSB0cnVlO1xyXG5cclxuXHR0aGlzLl9wcmVhbWJsZVJlY2VpdmVkID0gZmFsc2U7XHJcblx0dGhpcy5fbGFzdENodW5rUmVjZWl2ZWQgPSBmYWxzZTtcclxuXHR0aGlzLl9saXR0bGVFbmRpYW4gPSB1bmRlZmluZWQ7XHJcblx0dGhpcy5faGVhZGVyRGVjb2RlciA9IGpzb25Db2RlYztcclxuXHJcblx0dGhpcy5fYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDApO1xyXG5cdHRoaXMuX2N1cnJlbnRCdWZmZXJPZmZzZXQgPSAwO1xyXG5cclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgdGhpcy5fYXN5bmMgPSB0eXBlb2Ygb3B0aW9ucy5hc3luYyAhPT0gXCJ1bmRlZmluZWRcIiA/IG9wdGlvbnMuYXN5bmMgOiB0cnVlO1xyXG59XHJcblxyXG51dGlsLmluaGVyaXRzKFN0cmVhbVJlY2VpdmVyLCBUcmFuc2Zvcm0pO1xyXG5cclxuU3RyZWFtUmVjZWl2ZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZGF0YSwgXywgY2FsbGJhY2spIHtcclxuICAgIGNhbGxJbW1lZGlhdGUodGhpcy5fZGVjb2RlLmJpbmQodGhpcywgZGF0YSwgY2FsbGJhY2spLCB0aGlzLl9hc3luYyk7XHJcbn07XHJcblxyXG5TdHJlYW1SZWNlaXZlci5wcm90b3R5cGUuX2RlY29kZSA9IGZ1bmN0aW9uIChkYXRhQnVmZmVyLCBjYWxsYmFjaykge1xyXG5cdC8vIFdlIGRvIG5vdCBleHBlY3QgdGhhdCBgZGF0YUJ1ZmZlcmAgaXMgYSBjb21wbGV0ZSBjaHVuayBvciBwcmVhbWJsZS5cclxuXHQvLyBJZiB3ZSBoYXZlbid0IHJlY2VpdmVkIGEgcHJlYW1ibGUgeWV0LCB3ZSBleHBlY3QgdGhlIGZpcnN0IGRhdGEgdG8gZWl0aGVyIGJlIHRoZSBjb21wbGV0ZSBvciBhdCBsZWFzdCBhIHBhcnQgb2ZcclxuXHQvLyB0aGUgcHJlYW1ibGUuXHJcblx0dGhpcy5fYnVmZmVyID0gYWJvcHMuY29uY2F0KHRoaXMuX2J1ZmZlciwgZGF0YUJ1ZmZlcik7XHJcblx0aWYgKCF0aGlzLl9wcmVhbWJsZVJlY2VpdmVkKSB7XHJcblx0XHR2YXIgYnl0ZXNSZWFkID0gdGhpcy5fZGVjb2RlUHJlYW1ibGUobmV3IERhdGFWaWV3KHRoaXMuX2J1ZmZlcikpO1xyXG5cdFx0Ly8gSWYgYnl0ZXMgd2VyZSByZWFkIHdlIHJlY2VpdmVkIGEgY29tcGxldGUgcHJlYW1ibGUuXHJcblx0XHRpZiAoYnl0ZXNSZWFkICE9PSAwKSB7XHJcblx0XHRcdHRoaXMuX3ByZWFtYmxlUmVjZWl2ZWQgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLl9jdXJyZW50QnVmZmVyT2Zmc2V0ID0gYnl0ZXNSZWFkO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gSWYgdGhlIGxhc3QgY2h1bmsgKE51bGwgQ2h1bmspIHdhcyBhbHJlYWR5IHJlY2VpdmVkIHRoZXJlIGNhbm5vdCBiZSBtb3JlIGRhdGFcclxuXHRpZiAodGhpcy5fbGFzdENodW5rUmVjZWl2ZWQpXHJcblx0XHRyZXR1cm4gdGhpcy5lbWl0KFwiZXJyb3JcIiwgbmV3IEJsYXN0RXJyb3IoXCJMYXN0IGNodW5rIGFscmVhZHkgcmVjZWl2ZWQhXCIpKTtcclxuXHJcblx0Ly8gV2UgY2FuIG9ubHkgc3RhcnQgZGVjb2RpbmcgYSBjaHVuayBpZiB0aGUgcHJlYW1ibGUgd2FzIGFscmVhZHkgcmVjZWl2ZWQgYW5kIGlmIGF0IGxlYXN0IDQgQnl0ZXMgY2FuIGJlIHJlYWQgdG8gZ2V0IHRoZSBjaHVua3Mgc2l6ZS5cclxuXHRpZiAoIXRoaXMuX3ByZWFtYmxlUmVjZWl2ZWQgfHwgdGhpcy5fY3VycmVudEJ1ZmZlck9mZnNldCArIDQgPiB0aGlzLl9idWZmZXIuYnl0ZUxlbmd0aClcclxuICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcclxuXHJcblx0Ly8gV2UgdHJ5IHRvIGRlY29kZSBjaHVua3MgdW50aWwgbm90aGluZyBjYW4gYmUgcmVhZCBvciB0aGUgYnVmZmVyIGlzIGVtcHR5LlxyXG5cdHZhciBieXRlc1JlYWQ7XHJcblx0ZG8ge1xyXG5cdFx0Ynl0ZXNSZWFkID0gdGhpcy5fZGVjb2RlQ2h1bmsobmV3IERhdGFWaWV3KHRoaXMuX2J1ZmZlciwgdGhpcy5fY3VycmVudEJ1ZmZlck9mZnNldCkpO1xyXG5cdFx0Ly8gVGhpcyBpcyBzYXZlLiBJZiBieXRlc1JlYWQgaXMgemVybyBub3RoaW5nIGhhcHBlbnMuXHJcblx0XHR0aGlzLl9jdXJyZW50QnVmZmVyT2Zmc2V0ICs9IGJ5dGVzUmVhZDtcclxuXHR9IHdoaWxlIChieXRlc1JlYWQgPiAwICYmIHRoaXMuX2N1cnJlbnRCdWZmZXJPZmZzZXQgPCB0aGlzLl9idWZmZXIuYnl0ZUxlbmd0aCAmJiAhdGhpcy5fbGFzdENodW5rUmVjZWl2ZWQpO1xyXG5cclxuXHQvLyBEaXNjYXJkIGN1cnJlbnQgYnVmZmVyIGlmIHJlYWQgY29tcGxldGVseS5cclxuXHRpZiAodGhpcy5fY3VycmVudEJ1ZmZlck9mZnNldCA9PT0gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGgpIHtcclxuXHRcdHRoaXMuX2J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigwKTtcclxuXHRcdHRoaXMuX2N1cnJlbnRCdWZmZXJPZmZzZXQgPSAwO1xyXG5cdH1cclxuICAgIGNhbGxiYWNrKCk7XHJcbn07XHJcblxyXG5TdHJlYW1SZWNlaXZlci5wcm90b3R5cGUuX2RlY29kZVByZWFtYmxlID0gZnVuY3Rpb24gKGJ1ZmZlclZpZXcpIHtcclxuXHQvLyBXZSBrbm93IHRoYXQgZXZlcnkgcHJlYW1ibGUgaGFzIHRvIGhhdmUgYXQgbGVhc3RcclxuXHQvLyA0IEJ5dGUgU2lnbmF0dXJlICsgMiBCeXRlIFZlcnNpb24gaW5mb3JtYXRpb24gKyA1IEJ5dGUgSGVhZGVyIGRlY29kaW5nIHNwZWNpZmljYXRpb24gYW5kIG51bGwgYnl0ZS5cclxuXHQvLyBXZSBjYW4gYXNzdW1lIDUgYnl0ZSBmb3IgdGhlIGhlYWRlciBkZWNvZGluZyBzcGVjaWZpY2F0aW9uIGJlY2F1c2UgYSBVUkwgaGFzIHRvIGhhdmUgYXQgbGVhc3QgNCBjaGFyYWN0ZXJzIHRvIGJlIHZhbGlkLFxyXG5cdC8vIE9uZSBjaGFyYWN0ZXIgZG9tYWluIG5hbWUgcGx1cyBhIGRvdCBhbmQgbWluLiB0d28gY2hhcmFjdGVycyB0bGQuXHJcblx0aWYgKGJ1ZmZlclZpZXcuYnl0ZUxlbmd0aCA8IDExKVxyXG5cdFx0cmV0dXJuIDA7XHJcblxyXG5cdHZhciBzaWduYXR1cmUgPSBidWZmZXJWaWV3LmdldFVpbnQzMigwKTtcclxuXHQvLyBJZiB0aGUgc2lnbmF0dXJlIGJ5dGUgZG9lcyBub3QgbWF0Y2ggd2UgZmxpcCBlbmRpYW5uZXNzLlxyXG5cdGlmIChzaWduYXR1cmUgPT09IFByZWFtYmxlLnNpZ25hdHVyZSlcclxuXHRcdHRoaXMuX2xpdHRsZUVuZGlhbiA9IGZhbHNlO1xyXG5cdGVsc2UgaWYgKGZsaXBFbmRpYW5uZXNzSW50MzIoc2lnbmF0dXJlKSA9PT0gUHJlYW1ibGUuc2lnbmF0dXJlKVxyXG5cdFx0dGhpcy5fbGl0dGxlRW5kaWFuID0gdHJ1ZTtcclxuXHRlbHNlXHJcblx0XHRyZXR1cm4gdGhpcy5lbWl0KFwiZXJyb3JcIiwgbmV3IEJsYXN0RXJyb3IoXCJDb3VsZCBub3QgaWRlbnRpZnkgcHJlYW1ibGUhIFNpZ25hdHVyZSBieXRlcyBkbyBub3QgbWF0Y2ghXCIpKTtcclxuXHJcblx0dGhpcy5fbWFqb3JWZXJzaW9uID0gYnVmZmVyVmlldy5nZXRVaW50OCg0KTtcclxuXHR0aGlzLl9taW5vclZlcnNpb24gPSBidWZmZXJWaWV3LmdldFVpbnQ4KDUpO1xyXG5cdHZhciBvZmZzZXQgPSA2O1xyXG4gICAgdGhpcy5faGVhZGVyRGVjb2RpbmdTcGVjaWZpY2F0aW9uID0gYWJvcHMuZ2V0Q1N0cmluZyhidWZmZXJWaWV3LCBvZmZzZXQpO1xyXG4gICAgLy8gT25lIGJ5dGUgZm9yIHRoZSBOVUwgY2hhclxyXG4gICAgb2Zmc2V0ICs9IHRoaXMuX2hlYWRlckRlY29kaW5nU3BlY2lmaWNhdGlvbi5sZW5ndGggKyAxO1xyXG5cclxuXHRpZiAob2Zmc2V0ID4gNilcclxuXHRcdHJldHVybiBvZmZzZXQ7XHJcblxyXG5cdHJldHVybiAwO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZmxpcEVuZGlhbm5lc3NJbnQzMihuKSB7XHJcblx0cmV0dXJuICgobiA+PiAyNCkgJiAweGZmKSB8ICgobiA8PCA4KSAmIDB4ZmYwMDAwKSB8ICgobiA+PiA4KSAmIDB4ZmYwMCkgfCAoKG4gPDwgMjQpICYgMHhmZjAwMDAwMCk7XHJcbn1cclxuXHJcblN0cmVhbVJlY2VpdmVyLnByb3RvdHlwZS5fZGVjb2RlQ2h1bmsgPSBmdW5jdGlvbiAoYnVmZmVyVmlldykge1xyXG5cdHZhciBjaHVua1NpemUgPSBidWZmZXJWaWV3LmdldFVpbnQzMigwLCB0aGlzLl9saXR0bGVFbmRpYW4pO1xyXG5cclxuXHRpZiAoYnVmZmVyVmlldy5ieXRlTGVuZ3RoIDwgY2h1bmtTaXplKVxyXG5cdFx0cmV0dXJuIDA7XHJcblxyXG5cdC8vIExhc3QgY2h1bmsgaGFzIHNpemUgMC5cclxuXHRpZiAoY2h1bmtTaXplID09PSAwKSB7XHJcbiAgICAgICAgdGhpcy5fbGFzdENodW5rUmVjZWl2ZWQgPSB0cnVlO1xyXG4gICAgICAgIHJldHVybiA0O1xyXG4gICAgfVxyXG5cclxuXHR2YXIgaGVhZGVyU2l6ZSA9IGJ1ZmZlclZpZXcuZ2V0VWludDMyKDQsIHRoaXMuX2xpdHRsZUVuZGlhbik7XHJcblx0dmFyIGhlYWRlckRlZmluaXRpb25zID0gdGhpcy5faGVhZGVyRGVjb2Rlci5kZWNvZGUoYnVmZmVyVmlldy5idWZmZXIuc2xpY2UoYnVmZmVyVmlldy5ieXRlT2Zmc2V0ICsgOCwgYnVmZmVyVmlldy5ieXRlT2Zmc2V0ICsgOCArIGhlYWRlclNpemUpKTtcclxuXHR2YXIgcGF5bG9hZE9mZnNldCA9IDggKyBoZWFkZXJTaXplO1xyXG5cclxuICAgIC8vIEFkanVzdCB0aGUgb2Zmc2V0IHN1Y2ggdGhhdCB3ZSBjYW4gc2hhcmUgYSBzaW5nbGUgQXJyYXlCdWZmZXIuXHJcbiAgICBoZWFkZXJEZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XHJcbiAgICAgICAgZGVmaW5pdGlvbi5vZmZzZXQgKz0gYnVmZmVyVmlldy5ieXRlT2Zmc2V0ICsgcGF5bG9hZE9mZnNldDtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucHVzaCh7XHJcbiAgICAgICAgcGF5bG9hZDogYnVmZmVyVmlldy5idWZmZXIsXHJcbiAgICAgICAgaGVhZGVyRGVmaW5pdGlvbnM6IGhlYWRlckRlZmluaXRpb25zLFxyXG4gICAgICAgIGxpdHRsZUVuZGlhbjogdGhpcy5fbGl0dGxlRW5kaWFuXHJcbiAgICB9KTtcclxuXHJcblx0cmV0dXJuIGNodW5rU2l6ZTtcclxufTtcclxuXHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1SZWNlaXZlcjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5yZXF1aXJlKFwic2V0aW1tZWRpYXRlXCIpO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuLCBhc3luYykge1xyXG4gICAgaWYgKGFzeW5jKVxyXG4gICAgICAgIHNldEltbWVkaWF0ZShmbik7XHJcbiAgICBlbHNlXHJcbiAgICAgICAgZm4oKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIERhdGFWaWV3I2dldFVpbnQxNiB3aWxsIHJlYWQgMSBvbiBiaWctZW5kaWFuIHN5c3RlbXMuXHJcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KG5ldyBVaW50MTZBcnJheShbMjU2XSkuYnVmZmVyKS5nZXRVaW50MTYoMCwgdHJ1ZSkgPT09IDI1NjtcclxufTtcclxuXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XHJcbiAgICB2YXIgYXJpdHkgPSBmbi5sZW5ndGg7XHJcbiAgICAvLyBWYXJpYWJsZSBhcmd1bWVudCBsaXN0IG1lYW5zIHdlIGNvbnNpZGVyIHRoaXMgZnVuY3Rpb24gdG8gYmUgYXN5bmMuXHJcbiAgICBpZiAoYXJpdHkgPT09IDApXHJcbiAgICAgICAgcmV0dXJuIGZuO1xyXG4gICAgLy8gQW4gYXJpdHkgb2YgdHdvIG1lYW5zIHdlIGhhdmUgYSBzeW5jLiBmdW5jdGlvbiwgc28gd2Ugd3JhcCBpdC5cclxuICAgIGlmIChhcml0eSA9PT0gMilcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGFPckJ1ZmZlciwgbGl0dGxlRW5kaWFuLCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGZuKGRhdGFPckJ1ZmZlciwgbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGUsIG51bGwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIGlmIChhcml0eSA9PT0gMylcclxuICAgICAgICByZXR1cm4gZm47XHJcblxyXG4gICAgbmV3IEVycm9yKFwiTWFsZm9ybWVkIGRlY29kaW5nIGZ1bmN0aW9uXCIpO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIlxyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xyXG5cclxudmFyIHJ1bkV4dGVybmFsRGVjb2RpbmcgPSByZXF1aXJlKFwiLi9ydW5fZXh0ZXJuYWxfZGVjb2RpbmdcIik7XHJcbnZhciB3cmFwU3luY0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbC93cmFwX3N5bmNfZnVuY3Rpb25cIik7XHJcbnZhciBjYWxsSW1tZWRpYXRlID0gcmVxdWlyZShcIi4vdXRpbC9jYWxsX2ltbWVkaWF0ZVwiKTtcclxuXHJcbmZ1bmN0aW9uIFZhbHVlRGVjb2RlcihvcHRpb25zKSB7XHJcbiAgICBUcmFuc2Zvcm0uY2FsbCh0aGlzLCB7XHJcbiAgICAgICAgb2JqZWN0TW9kZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHRoaXMuX2RlY29kaW5nU3BlY2lmaWNhdGlvbk1hcCA9IG9wdGlvbnMuZGVjb2RpbmdTcGVjaWZpY2F0aW9uTWFwIHx8IHt9O1xyXG4gICAgdGhpcy5fYXN5bmMgPSB0eXBlb2Ygb3B0aW9ucy5hc3luYyAhPT0gXCJ1bmRlZmluZWRcIiA/IG9wdGlvbnMuYXN5bmMgOiB0cnVlO1xyXG59XHJcblxyXG51dGlsLmluaGVyaXRzKFZhbHVlRGVjb2RlciwgVHJhbnNmb3JtKTtcclxuXHJcblZhbHVlRGVjb2Rlci5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChlbmNvZGVkRGF0YSwgXywgY2FsbGJhY2spIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIGNhbGxJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBkZWNvZGVGdW5jdGlvbiA9IHJ1bkV4dGVybmFsRGVjb2RpbmcuYmluZCh1bmRlZmluZWQsIGVuY29kZWREYXRhLmRlY29kaW5nU3BlY2lmaWNhdGlvbik7XHJcblxyXG4gICAgICAgIHZhciBjb2RlYyA9IHNlbGYuX2RlY29kaW5nU3BlY2lmaWNhdGlvbk1hcFtlbmNvZGVkRGF0YS5kZWNvZGluZ1NwZWNpZmljYXRpb25dXHJcbiAgICAgICAgaWYgKGNvZGVjKVxyXG4gICAgICAgICAgICBkZWNvZGVGdW5jdGlvbiA9IHdyYXBTeW5jRnVuY3Rpb24oY29kZWMuZGVjb2RlID8gY29kZWMuZGVjb2RlIDogY29kZWMpO1xyXG4gICAgICAgIGRlY29kZUZ1bmN0aW9uKGVuY29kZWREYXRhLmVuY29kZWRWYWx1ZSwgZW5jb2RlZERhdGEubGl0dGxlRW5kaWFuLCBmdW5jdGlvbiAoZXJyb3IsIGRlY29kZWRWYWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KFwiZXJyb3JcIiwgZXJyb3IpO1xyXG5cclxuICAgICAgICAgICAgc2VsZi5wdXNoKHtcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBkZWNvZGVkVmFsdWUsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBlbmNvZGVkRGF0YS5wYXRoLFxyXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IGVuY29kZWREYXRhLm1ldGFkYXRhXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVmFsdWVEZWNvZGVyO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgVWludDhBcnJheSBmb3IgdGhlIGdpdmVuIEFycmF5QnVmZmVyLlxyXG4gKiBJZiBhIEFycmF5QnVmZmVyVmlldyBvciBhIERhdGFWaWV3IGlzIGdpdmVuLCB0aGUgdW5kZXJseWluZyBidWZmZXIgd2lsbCBiZSB1c2VkIGFuZCB0aGUgc2V0XHJcbiAqIG9mZnNldCBhbmQgbGVuZ3RoIHdpbGwgYmUgcmVzcGVjdGVkLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZnVuY3Rpb24gdG9VaW50OEFycmF5XHJcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXJWaWV3fEFycmF5QnVmZmVyfSBhcnJheUJ1ZmZlciBUaGUgQXJyYXlCdWZmZXIgb3IgYSB2aWV3IGludG8gYW4gQXJyYXlCdWZmZXIgZm9yIHdoaWNoIHRvIGNyZWF0ZSBhIFVpbnQ4QXJyYXkgdmlldy5cclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IEEgVWludDhBcnJheSByZWZlcmVuY2luZyB0aGUgZ2l2ZW4gQXJyYXlCdWZmZXIuXHJcbiAqL1xyXG5mdW5jdGlvbiB0b1VpbnQ4QXJyYXkoYXJyYXlCdWZmZXIsIG9mZnNldCwgbGVuZ3RoKSB7XHJcblx0b2Zmc2V0ID0gK29mZnNldCB8fCAwO1xyXG5cdGxlbmd0aCA9ICtsZW5ndGg7XHJcblx0aWYgKHR5cGVvZiBhcnJheUJ1ZmZlci5CWVRFU19QRVJfRUxFTUVOVCAhPT0gXCJ1bmRlZmluZWRcIiB8fCBhcnJheUJ1ZmZlciBpbnN0YW5jZW9mIERhdGFWaWV3KSB7XHJcblx0XHRyZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIuYnVmZmVyLCBvZmZzZXQgKyBhcnJheUJ1ZmZlci5ieXRlT2Zmc2V0LCBsZW5ndGggfHwgYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aCAtIG9mZnNldCk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyLCBvZmZzZXQsIGxlbmd0aCB8fCBhcnJheUJ1ZmZlci5ieXRlTGVuZ3RoIC0gb2Zmc2V0KTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb25jYXRlbmF0ZXMgYSB2YXJpYWJsZSBsaXN0IG9mIEFycmF5QnVmZmVycy5cclxuICogSWYgb25lIG9mIHRoZSBhcmd1bWVudHMgaXMgYSBEYXRhVmlldyBvciBhbiBgQXJyYXlCdWZmZXJWaWV3YCB0aGUgdW5kZXJseWluZyBidWZmZXIgd2lsbCBiZSB1c2VkIGFuZFxyXG4gKiB0aGUgc2V0IG9mZnNldCBhbmQgbGVuZ3RoIHdpbGwgYmUgcmVzcGVjdGVkLlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqIEBmdW5jdGlvbiBjb25jYXRcclxuICogQHBhcmFtIHtBcnJheUJ1ZmZlci4uLnxBcnJheUJ1ZmZlclZpZXcuLi59IGJ1ZmZlcnMgQSB2YXJpYWJsZSBsaXN0IG9mIHBsYWluIEFycmF5QnVmZmVycyBvciBBcnJheUJ1ZmZlclZpZXdzLlxyXG4gKiBAcmV0dXJucyB7QXJyYXlCdWZmZXJ9IEEgbmV3IEFycmF5QnVmZmVyIGFzIHRoZSByZXN1bHQgb2YgY29uY2F0ZW5hdGluZyB0aGUgZ2l2ZW4gYnVmZmVycy5cclxuICovXHJcbmV4cG9ydHMuY29uY2F0ID0gZnVuY3Rpb24gKCkge1xyXG5cdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKVxyXG5cdFx0cmV0dXJuIHRvVWludDhBcnJheShhcmd1bWVudHNbMF0pLmJ1ZmZlcjtcclxuXHRlbHNlXHJcblx0XHR2YXIgYXJyYXlCdWZmZXJMaXN0ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuXHJcbiAgICAvLyBHZXQgYSBsaXN0IG9mIGFsbCBidWZmZXJzIGFuZCB0aGVpciB0b3RhbCBzaXplXHJcbiAgICB2YXIgdG90YWxTaXplID0gMDtcclxuICAgIHZhciBieXRlQnVmZmVycyA9IGFycmF5QnVmZmVyTGlzdC5tYXAoZnVuY3Rpb24gKGFycmF5QnVmZmVyKSB7XHJcbiAgICAgICAgLy8gSWYgYSBgRGF0YVZpZXdgIG9yIGEgdHlwZWQgYXJyYXkgd2FzIHBhc3NlZCBpbnN0ZWFkIG9mIGEgcGxhaW4gYEFycmF5QnVmZmVyYFxyXG4gICAgICAgIC8vIHRoZSB1bmRlcmx5aW5nIGJ1ZmZlciB3aWxsIGJlIHVzZWQgaW5zdGVhZC5cclxuICAgICAgICB2YXIgYnl0ZUJ1ZmZlciA9IHRvVWludDhBcnJheShhcnJheUJ1ZmZlcik7XHJcbiAgICAgICAgdG90YWxTaXplICs9IGJ5dGVCdWZmZXIubGVuZ3RoO1xyXG4gICAgICAgIHJldHVybiBieXRlQnVmZmVyO1xyXG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChieXRlQnVmZmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBieXRlQnVmZmVyLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgaWYgKGJ5dGVCdWZmZXJzLmxlbmd0aCA9PT0gMClcclxuICAgICAgICByZXR1cm4gbmV3IEFycmF5QnVmZmVyKDApO1xyXG5cclxuICAgIGlmIChieXRlQnVmZmVycy5sZW5ndGggPT09IDEpXHJcbiAgICAgICAgcmV0dXJuIGJ5dGVCdWZmZXJzWzBdLmJ1ZmZlcjtcclxuXHJcblx0Ly8gVGhpcyB3aWxsIGNvbnRhaW4gdGhlIGZpbmFsIGNvbmNhdGVuYXRlZCBidWZmZXIuXHJcbiAgICB2YXIgY29uY2F0QnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkodG90YWxTaXplKTtcclxuXHJcbiAgICB2YXIgb2Zmc2V0ID0gMDtcclxuICAgIGJ5dGVCdWZmZXJzLmZvckVhY2goZnVuY3Rpb24gKGJ5dGVCdWZmZXIpIHtcclxuICAgICAgICBjb25jYXRCdWZmZXIuc2V0KGJ5dGVCdWZmZXIsIG9mZnNldCk7XHJcbiAgICAgICAgb2Zmc2V0ICs9IGJ5dGVCdWZmZXIubGVuZ3RoO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNvbmNhdEJ1ZmZlci5idWZmZXI7XHJcbn07XHJcblxyXG4vKipcclxuICogRmxpcHMgdGhlIGVuZGlhbm5lc3Mgb2YgdGhlIGdpdmVuIFR5cGVkQXJyYXkgaW4tcGxhY2UuXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIGZsaXBFbmRpYW5uZXNzXHJcbiAqIEBwYXJhbSB7VHlwZWQgQXJyYXl9IHR5cGVkQXJyYXkgVGhlIHR5cGVkIGFycmF5IGZvciB3aGljaCB0aGUgZW5kaWFubmVzcyBzaG91bGQgYmUgZmxpcHBlZC5cclxuICovXHJcbmV4cG9ydHMuZmxpcEVuZGlhbm5lc3MgPSBmdW5jdGlvbiAodHlwZWRBcnJheSkge1xyXG5cdC8vIFVpbnQ4Q2xhbXBlZEFycmF5IGlzIGEgcmF0aGVyIG5ldyBwYXJ0IG9mIHRoZSB0eXBlZCBhcnJheSBzcGVjaWZpY2F0aW9uIGFuZCBub3QgZnVsbHkgc3VwcG9ydGVkIGJ5XHJcblx0Ly8gYWxsIGJyb3dzZXJzLlxyXG5cdHZhciBVaW50OENsYW1wZWRBcnJheVR5cGU7XHJcblx0aWYgKHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSA9PT0gXCJ1bmRlZmluZWRcIilcclxuXHRcdFVpbnQ4Q2xhbXBlZEFycmF5VHlwZSA9IGZ1bmN0aW9uIGR1bW15KCkge307XHJcblx0ZWxzZVxyXG5cdFx0VWludDhDbGFtcGVkQXJyYXlUeXBlID0gVWludDhDbGFtcGVkQXJyYXk7XHJcblxyXG5cdGlmICh0eXBlZEFycmF5IGluc3RhbmNlb2YgSW50OEFycmF5IHx8IHR5cGVkQXJyYXkgaW5zdGFuY2VvZiBVaW50OEFycmF5IHx8IHR5cGVkQXJyYXkgaW5zdGFuY2VvZiBVaW50OENsYW1wZWRBcnJheVR5cGUpXHJcbiAgICAgICAgcmV0dXJuIHR5cGVkQXJyYXk7XHJcblxyXG4gICAgdmFyIGJ5dGVBcnJheSA9IG5ldyBVaW50OEFycmF5KHR5cGVkQXJyYXkuYnVmZmVyLCB0eXBlZEFycmF5Lm9mZnNldCwgdHlwZWRBcnJheS5ieXRlTGVuZ3RoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZWRBcnJheS5ieXRlTGVuZ3RoOyBpICs9IHR5cGVkQXJyYXkuQllURVNfUEVSX0VMRU1FTlQpIHtcclxuICAgICAgICB2YXIgbGVmdElkeCA9IGk7XHJcbiAgICAgICAgdmFyIHJpZ2h0SWR4ID0gaSArIHR5cGVkQXJyYXkuQllURVNfUEVSX0VMRU1FTlQgLSAxO1xyXG5cdCAgICAvLyBXYWxrIGZyb20gbGVmdCBhbmQgcmlnaHQgYW5kIHN3YXAgYnl0ZXMuXHJcbiAgICAgICAgd2hpbGUgKGxlZnRJZHggPCByaWdodElkeCkge1xyXG4gICAgICAgICAgICB2YXIgdG1wID0gYnl0ZUFycmF5W2xlZnRJZHhdO1xyXG4gICAgICAgICAgICBieXRlQXJyYXlbbGVmdElkeF0gPSBieXRlQXJyYXlbcmlnaHRJZHhdO1xyXG4gICAgICAgICAgICBieXRlQXJyYXlbcmlnaHRJZHhdID0gdG1wO1xyXG4gICAgICAgICAgICArK2xlZnRJZHg7XHJcbiAgICAgICAgICAgIC0tcmlnaHRJZHg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0eXBlZEFycmF5O1xyXG59O1xyXG5cclxuLy8gIyBTdHJpbmcgaGFuZGxpbmdcclxuXHJcbi8vIEphdmFTY3JpcHQgc3RyaW5nIGFyZSBVVEYtMTYgZW5jb2RlZC5cclxuLy8gVG8gaGFuZGxlIGNvbnZlcnNpb24gaW50byBkaWZmZXJlbnQgdW5pY29kZSBlbmNvZGluZ3MsIG1haW5seSBVVEYtOCwgd2UgY29udmVydCBKYXZhU2NyaXB0IHN0cmluZ1xyXG4vLyBpbnRvIGFuIGFycmF5IG9mIHVuaWNvZGUgY29kZSBwb2ludHMgdGhhdCBjYW4gZWFzaWx5IGNvbnZlcnRlZCBpbnRvIGRpZmZlcmVudCBlbmNvZGluZ3MuXHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhlIGdpdmVuIEphdmFTY3JpcHQgc3RyaW5nIGludG8gYW4gYXJyYXkgb2YgdW5pY29kZSBjb2RlIHBvaW50cy5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQGZ1bmN0aW9uIHN0cmluZ1RvVW5pY29kZUNvZGVQb2ludHNcclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIGNvbnZlcnQuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJbXX0gVGhlIGFycmF5IG9mIHVuaWNvZGUgY29kZSBwb2ludHMgb2YgdGhlIGdpdmVuIHN0cmluZy5cclxuICovXHJcbmZ1bmN0aW9uIHN0cmluZ1RvVW5pY29kZUNvZGVQb2ludHMoc3RyaW5nKSB7XHJcblx0dmFyIG91dHB1dCA9IFtdO1xyXG5cdHZhclx0Y291bnRlciA9IDA7XHJcblx0dmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGg7XHJcblx0dmFyIHZhbHVlO1xyXG5cdHZhciBleHRyYTtcclxuXHJcblx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcclxuXHRcdC8vIEphdmFTY3JpcHRzIFN0cmluZyNjaGFyQ29kZUF0IGZ1bmN0aW9uIHJldHVybnMgdmFsdWVzIGxlc3MgdGhhbiA2NTUzNi5cclxuXHRcdC8vIEhpZ2hlciBjb2RlIHBvaW50cyBhcmUgcmVwcmVzZW50ZWQgdXNpbmcgc28gY2FsbGVkIHN1cnJvZ2F0ZSBwYWlycy5cclxuXHRcdC8vIFRoaXMgbWVhbnMgdGhhdCB3ZSBoYXZlIHRvIGV4YW1pbmUgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGdldCB0aGUgcmVhbCB1bmljb2RlIGNvZGUgcG9pbnQgdmFsdWUuXHJcblx0XHR2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XHJcblx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XHJcblx0XHRcdC8vIEhpZ2ggc3Vycm9nYXRlID0+IHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcclxuXHRcdFx0ZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xyXG5cdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHtcclxuXHRcdFx0XHQvLyBMb3cgc3Vycm9nYXRlXHJcblx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBVbm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGUgbmV4dFxyXG5cdFx0XHRcdC8vIGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpclxyXG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcclxuXHRcdFx0XHRjb3VudGVyLS07XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcclxuXHRcdH1cclxuXHR9XHJcblx0cmV0dXJuIG91dHB1dDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIGFuIGFycmF5IG9mIHVuaWNvZGUgY29kZXBvaW50cyBpbnRvIGEgSmF2YVNjcmlwdCBzdHJpbmcuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBmdW5jdGlvbiB1bmljb2RlQ29kZVBvaW50c1RvU3RyaW5nXHJcbiAqIEBwYXJhbSB7bnVtYmVyW119IGNvZGVQb2ludHMgQW4gYXJyYXkgb2YgdW5pY29kZSBjb2RlIHBvaW50cy5cclxuICogQHJldHVybnMge3N0cmluZ30gVGhlIHN0cmluZyByZXByZXNlbnRlZCBieSB0aGUgZ2l2ZW4gY29kZSBwb2ludHMuXHJcbiAqL1xyXG5mdW5jdGlvbiB1bmljb2RlQ29kZVBvaW50c1RvU3RyaW5nKGNvZGVQb2ludHMpIHtcclxuXHRyZXR1cm4gY29kZVBvaW50cy5tYXAoZnVuY3Rpb24oY29kZVBvaW50KSB7XHJcblx0XHR2YXIgb3V0cHV0ID0gJyc7XHJcblx0XHRpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XHJcblx0XHRcdGNvZGVQb2ludCAtPSAweDEwMDAwO1xyXG5cdFx0XHRvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xyXG5cdFx0XHRjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRjtcclxuXHRcdH1cclxuXHRcdG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGVQb2ludCk7XHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cdH0pLmpvaW4oJycpO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhlIGdpdmVuIHN0cmluZyBpbnRvIGEgc2VyaWVzIG9mIG9mIFVURi04IGNvZGUgdW5pdHMuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBmdW5jdGlvbiB1dGY4ZW5jb2RlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBlbmNvZGUuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJbXX0gQW4gYXJyYXkgb2YgVVRGLTggY29kZSB1bml0cyBmb3IgdGhlIGdpdmVuIHN0cmluZy5cclxuICovXHJcbmZ1bmN0aW9uIHV0ZjhlbmNvZGUoc3RyaW5nKSB7XHJcblx0dmFyIGNvZGVQb2ludHMgPSBzdHJpbmdUb1VuaWNvZGVDb2RlUG9pbnRzKHN0cmluZyk7XHJcblxyXG5cdC8vIFVURi04IGlzIGEgdmFyaWFibGUgbGVuZ3RoIGVuY29kaW5nIHRoYXQgYWN0dWFsbHkgc3VwcG9ydHMgdXAgdG8gc2l4IGJ5dGVzIHBlciBjaGFyYWN0ZXIuXHJcblx0Ly8gSG93ZXZlciwgdGhlc2UgY2hhcmFjdGVycyBhcmUgaW4gdGhlIHByaXZhdGUgdW5pY29kZSByYW5nZSBhbmQgY2FuIHRoZXJlZm9yZSBuZXZlciBvY2N1ciBpbiBKYXZhU2NyaXB0LlxyXG4gICAgdmFyIHV0ZjhDb2RlVW5pdHMgPSBbXTtcclxuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGNvZGVQb2ludHMubGVuZ3RoOyArK2lkeCkge1xyXG4gICAgICAgIHZhciBjb2RlUG9pbnQgPSBjb2RlUG9pbnRzW2lkeF07XHJcbiAgICAgICAgaWYgKGNvZGVQb2ludCA8IDB4MDA4MClcclxuICAgICAgICAgICAgdXRmOENvZGVVbml0cy5wdXNoKGNvZGVQb2ludCAmIDB4RkYpO1xyXG4gICAgICAgIGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MDgwMCkge1xyXG4gICAgICAgICAgICB1dGY4Q29kZVVuaXRzLnB1c2goMHhDMCArIChjb2RlUG9pbnQgPj4+IDYpKTtcclxuICAgICAgICAgICAgdXRmOENvZGVVbml0cy5wdXNoKDB4ODAgKyAoY29kZVBvaW50ICYgMHgzRikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaCgweGUwICsgKGNvZGVQb2ludCA+Pj4gMTIpKTtcclxuICAgICAgICAgICAgdXRmOENvZGVVbml0cy5wdXNoKDB4ODAgKyAoKGNvZGVQb2ludCA+Pj4gNikgJiAweDNmKSk7XHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaCgweDgwICsgKGNvZGVQb2ludCAmIDB4M2YpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaCgweGYwICsgKGNvZGVQb2ludCA+Pj4gMTgpKTtcclxuICAgICAgICAgICAgdXRmOENvZGVVbml0cy5wdXNoKDB4ODAgKyAoKGNvZGVQb2ludCA+Pj4gMTIpICYgMHgzZikpO1xyXG4gICAgICAgICAgICB1dGY4Q29kZVVuaXRzLnB1c2goMHg4MCArICgoY29kZVBvaW50ID4+PiA2KSAmIDB4M2YpKTtcclxuICAgICAgICAgICAgdXRmOENvZGVVbml0cy5wdXNoKDB4ODAgKyAoY29kZVBvaW50ICYgMHgzZikpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB1dGY4Q29kZVVuaXRzO1xyXG59XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIGdpdmVuIHNlcmllcyBvZiBVVEYtOCBjb2RlIHVuaXRzIGludG8gYSBzdHJpbmcuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBmdW5jdGlvbiB1dGY4ZGVjb2RlXHJcbiAqIEBwYXJhbSB7bnVtYmVyW119IHV0ZjhDb2RlVW5pdHMgVGhlIFVURi04IGNvZGUgdW5pdHMuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBkZWNvZGVkIHN0cmluZy5cclxuICovXHJcbmZ1bmN0aW9uIHV0ZjhkZWNvZGUodXRmOENvZGVVbml0cykge1xyXG5cdHZhciBjb2RlUG9pbnRzID0gIFtdO1xyXG5cdHZhciBpZHggPSAwO1xyXG5cdHdoaWxlIChpZHggPCB1dGY4Q29kZVVuaXRzLmxlbmd0aCkge1xyXG5cdFx0dmFyIGNvZGVVbml0ID0gdXRmOENvZGVVbml0c1tpZHhdO1xyXG5cdFx0Ly8gV2UgaWdub3JlIGZpdmUgYW5kIHNpeCBieXRlIGNoYXJhY3RlcnMhXHJcblx0XHRpZiAoY29kZVVuaXQgPiAweGVmICYmIGNvZGVVbml0IDwgMHhmOCkge1xyXG5cdFx0XHRjb2RlUG9pbnRzLnB1c2goKHV0ZjhDb2RlVW5pdHNbaWR4XSAtIDB4ZjAgPDwgMTgpICsgKHV0ZjhDb2RlVW5pdHNbaWR4ICsgMV0gLSAweDgwIDw8IDEyKSArICh1dGY4Q29kZVVuaXRzW2lkeCArIDJdIC0gMHg4MCA8PCA2KSArICh1dGY4Q29kZVVuaXRzW2lkeCArIDNdIC0gMHg4MCkpO1xyXG5cdFx0XHRpZHggKz0gNDtcclxuXHRcdH0gZWxzZSBpZiAoY29kZVVuaXQgPiAweGRmICYmIGNvZGVVbml0IDwgMHhmMCkge1xyXG5cdFx0XHRjb2RlUG9pbnRzLnB1c2goKHV0ZjhDb2RlVW5pdHNbaWR4XSAtIDB4ZTAgPDwgMTIpICsgKHV0ZjhDb2RlVW5pdHNbaWR4ICsgMV0gLSAweDgwIDw8IDYpICsgKHV0ZjhDb2RlVW5pdHNbaWR4ICsgMl0gLSAweDgwKSk7XHJcblx0XHRcdGlkeCArPSAzO1xyXG5cdFx0fSBlbHNlIGlmIChjb2RlVW5pdCA+IDB4YmYgJiYgY29kZVVuaXQgPCAweGUwKSB7XHJcblx0XHRcdGNvZGVQb2ludHMucHVzaCgodXRmOENvZGVVbml0c1tpZHhdIC0gMHhjMCA8PCA2KSArICh1dGY4Q29kZVVuaXRzW2lkeCArIDFdIC0gMHg4MCkpO1xyXG5cdFx0XHRpZHggKz0gMjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvZGVQb2ludHMucHVzaCh1dGY4Q29kZVVuaXRzW2lkeF0pO1xyXG5cdFx0XHRpZHggKz0gMTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiB1bmljb2RlQ29kZVBvaW50c1RvU3RyaW5nKGNvZGVQb2ludHMpO1xyXG59XHJcblxyXG4vKipcclxuICogUmV0dXJucyB0aGUgc2l6ZSBpbiBieXRlcyBuZWVkZWQgdG8gd3JpdGUgdGhlIGdpdmVuIHN0cmluZyB3aXRoIHRoZSBnaXZlbiBlbmNvZGluZyBpbnRvIGEgYnVmZmVyLlxyXG4gKiBDdXJyZW50bHkgb25seSBBU0NJSSBhbmQgVVRGLTggZW5jb2RpbmcgaXMgc3VwcG9ydGVkLlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqIEBmdW5jdGlvbiBieXRlU2l6ZUZvclN0cmluZ1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgZm9yIHdoaWNoIHRvIGNhbGN1bGF0ZSB0aGUgc2l6ZS5cclxuICogQHBhcmFtIHtzdHJpbmd9IFtlbmNvZGluZyA9IFwiVVRGLThcIl0gVGhlIGVuY29kaW5nIHRvIHVzZS5cclxuICogQHJldHVybnMge251bWJlcn0gVGhlIHNpemUgaW4gYnl0ZXMgbmVlZGVkIHRvIHN0b3JlIHRoZSBnaXZlbiBzdHJpbmcgaW4gdGhlIGdpdmVuIGVuY29kaW5nLlxyXG4gKi9cclxuZXhwb3J0cy5ieXRlU2l6ZUZvclN0cmluZyA9IGZ1bmN0aW9uIChzdHJpbmcsIGVuY29kaW5nKSB7XHJcblx0dmFyIGNvZGVQb2ludHMgPSBzdHJpbmdUb1VuaWNvZGVDb2RlUG9pbnRzKHN0cmluZyk7XHJcblx0ZW5jb2RpbmcgPSBlbmNvZGluZyA/IGVuY29kaW5nLnRvTG93ZXJDYXNlKCkgOiBcInV0Zi04XCI7XHJcblxyXG5cdHN3aXRjaCAoZW5jb2RpbmcpIHtcclxuXHRcdGNhc2UgXCJhc2NpaVwiOlxyXG5cdFx0XHRyZXR1cm4gY29kZVBvaW50cy5sZW5ndGg7XHJcblx0XHRjYXNlIFwidXRmOFwiOlxyXG5cdFx0Y2FzZSBcInV0Zi04XCI6XHJcblx0XHRcdHJldHVybiBjb2RlUG9pbnRzLnJlZHVjZShmdW5jdGlvbiAoYnl0ZVNpemUsIGNvZGVQb2ludCkge1xyXG5cdFx0XHRcdHJldHVybiBieXRlU2l6ZSArIChjb2RlUG9pbnQgPCAweDAwODAgPyAxIDogKGNvZGVQb2ludCA8IDB4MDgwMCA/IDIgOiAoY29kZVBvaW50IDwgMHgxMDAwMCA/IDMgOiA0KSkpO1xyXG5cdFx0XHR9LCAwKTtcclxuXHR9XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIHRoZSBnaXZlbiBzdHJpbmcgdXNpbmcgdGhlIGdpdmVuIGVuY29kaW5nIGF0IHRoZSBzcGVjaWZpZWQgb2Zmc2V0IGludG8gdGhlIGJ1ZmZlci5cclxuICogSWYgbGl0dGxlRW5kaWFuIGlzIHRydWUsIG11bHRpLWJ5dGUgdmFsdWVzIHdpbGwgYmUgd3JpdHRlbiBpbiBsaXR0bGVFbmRpYW4gZm9ybWF0LlxyXG4gKiBDdXJyZW50bHkgb25seSBBU0NJSSBhbmQgVVRGLTggZW5jb2RpbmcgaXMgc3VwcG9ydGVkIHdoaWNoIG1ha2VzIGVuZGlhbm5lc3MgYSBub24gaXNzdWUuXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIHNldFN0cmluZ1xyXG4gKiBAcGFyYW0ge0FycmF5QnVmZmVyfFR5cGVkQXJyYXl8RGF0YVZpZXd9IGFycmF5QnVmZmVyIFRoZSBidWZmZXIgd2hlcmUgdGhlIHN0cmluZyBzaG91bGQgYmUgd3JpdHRlbiBpbnRvLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IFRoZSBvZmZzZXQgaW4gYnl0ZXMgYXQgd2hpY2ggdGhlIHN0cmluZyBzaG91bGQgYmVnaW4gaW5zaWRlIHRoZSBidWZmZXIuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byB3cml0ZS5cclxuICogQHBhcmFtIHtzdHJpbmd9IFtlbmNvZGluZyA9IFwiVVRGLThcIl0gVGhlIGVuY29kaW5nIHRvIHVzZS5cclxuICogQHBhcmFtIHtib29sZWFufSBbbGl0dGxlRW5kaWFuID0gZmFsc2VdIElmIHRydWUgZm9yIG11bHRpIGJ5dGUgY2hhcmFjdGVycyB3aWxsIGJlIHdyaXR0ZW4gaW4gbGl0dGxlIGVuZGlhbiBmb3JtYXQuXHJcbiAqL1xyXG5leHBvcnRzLnNldFN0cmluZyA9IGZ1bmN0aW9uIChhcnJheUJ1ZmZlciwgb2Zmc2V0LCBzdHJpbmcsIGVuY29kaW5nLCBsaXR0bGVFbmRpYW4pIHtcclxuICAgIHZhciBieXRlcyA9IHRvVWludDhBcnJheShhcnJheUJ1ZmZlciwgb2Zmc2V0KTtcclxuXHRlbmNvZGluZyA9IGVuY29kaW5nID8gZW5jb2RpbmcudG9Mb3dlckNhc2UoKSA6IFwidXRmLThcIjtcclxuXHJcblx0c3dpdGNoIChlbmNvZGluZykge1xyXG5cdFx0Y2FzZSBcImFzY2lpXCI6XHJcblx0XHRcdGJ5dGVzLnNldChzdHJpbmdUb1VuaWNvZGVDb2RlUG9pbnRzKHN0cmluZykubWFwKGZ1bmN0aW9uIChjb2RlUG9pbnQpIHsgcmV0dXJuIGNvZGVQb2ludCAlIDEyODsgfSkpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgXCJ1dGY4XCI6XHJcblx0XHRjYXNlIFwidXRmLThcIjpcclxuXHRcdFx0Ynl0ZXMuc2V0KHV0ZjhlbmNvZGUoc3RyaW5nKSk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgdGhlIGdpdmVuIHN0cmluZyBpbnRvIHRoZSBnaXZlbiBidWZmZXIgYXQgdGhlIGNob3NlbiBvZmZzZXQuXHJcbiAqIFRoZSBzdHJpbmcgd2lsbCBiZSB3cml0dGVuIHVzaW5nIEFTQ0lJIGVuY29kaW5nIGFuZCBzdWNjZWVkZWQgYnkgYSBOVUwgYnl0ZS5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gc2V0Q1N0cmluZ1xyXG4gKiBAcGFyYW0ge0FycmF5QnVmZmVyVmlld3xBcnJheUJ1ZmZlcn0gYXJyYXlCdWZmZXIgVGhlIGJ1ZmZlciB0byB3cml0ZSB0by5cclxuICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCBUaGUgb2Zmc2V0IGluIGJ5dGVzIGZvciB0aGUgc3RyaW5nIHRvIGJlZ2luIGluc2lkZSB0aGUgYnVmZmVyLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gd3JpdGUuXHJcbiAqL1xyXG5leHBvcnRzLnNldENTdHJpbmcgPSBmdW5jdGlvbihhcnJheUJ1ZmZlciwgb2Zmc2V0LCBzdHJpbmcpIHtcclxuICAgIHZhciBsYXN0Q2hhcmFjdGVySWR4ID0gb2Zmc2V0ICsgdGhpcy5ieXRlU2l6ZUZvclN0cmluZyhzdHJpbmcsIFwiYXNjaWlcIik7XHJcbiAgICB0aGlzLnNldFN0cmluZyhhcnJheUJ1ZmZlciwgb2Zmc2V0LCBzdHJpbmcsIFwiYXNjaWlcIik7XHJcbiAgICB2YXIgYnl0ZXMgPSB0b1VpbnQ4QXJyYXkoYXJyYXlCdWZmZXIsIG9mZnNldCk7XHJcblx0Ynl0ZXNbbGFzdENoYXJhY3RlcklkeF0gPSAwO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIHRoZSBnaXZlbiBzdHJpbmcgZnJvbSB0aGUgZ2l2ZW4gYnVmZmVyIHN0YXJ0aW5nIGF0IG9mZnNldCwgcmVhZGluZyBsZW5ndGggYnl0ZXMsIHVzaW5nIHRoZSBzcGVjaWZpZWQgZW5jb2RpbmcuXHJcbiAqIElmIGxpdHRsZUVuZGlhbiBpcyB0cnVlLCBtdWx0aS1ieXRlIHZhbHVlcyBhcmUgZXhwZWN0ZWQgdG8gYmV3IGluIGxpdHRsZUVuZGlhbiBmb3JtYXQuXHJcbiAqIEN1cnJlbnRseSBvbmx5IEFTQ0lJIGFuZCBVVEYtOCBlbmNvZGluZyBpcyBzdXBwb3J0ZWQgd2hpY2ggbWFrZXMgZW5kaWFubmVzcyBhIG5vbiBpc3N1ZS5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gZ2V0U3RyaW5nXHJcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXJWaWV3fEFycmF5QnVmZmVyfSBhcnJheUJ1ZmZlciBUaGUgYnVmZmVyIHRvIHJlYWQgZnJvbS5cclxuICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCBUaGUgb2Zmc2V0IGluIGJ5dGVzIGF0IHdoaWNoIHRvIHN0YXJ0IHJlYWRpbmcuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBsZW5ndGggVGhlIG51bWJlciBvZiBieXRlcyB0byByZWFkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZW5jb2RpbmcgVGhlIGVuY29kaW5nIG9mIHRoZSBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2xpdHRsZUVuZGlhbiA9IGZhbHNlXSBJZiB0cnVlIG11bHRpLWJ5dGUgY2hhcmFjdGVycyBhcmUgZXhwZWN0ZWQgdG8gYmUgaW4gbGl0dGxlIGVuZGlhbiBmb3JtYXQuXHJcbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIHN0cmluZyByZWFkIGZyb20gdGhlIGJ1ZmZlci5cclxuICovXHJcbmV4cG9ydHMuZ2V0U3RyaW5nID0gZnVuY3Rpb24gKGFycmF5QnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcsIGxpdHRsZUVuZGlhbikge1xyXG5cdC8vIENoZWNrIGlmIGxlbmd0aCBpcyBvbWl0dGVkIGFuZCBlbmNvZGluZyBpcyBzZXQuXHJcblx0aWYgKHR5cGVvZiBsZW5ndGggPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdGVuY29kaW5nID0gbGVuZ3RoO1xyXG5cdFx0bGVuZ3RoID0gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0ZW5jb2RpbmcgPSBlbmNvZGluZyA/IGVuY29kaW5nLnRvTG93ZXJDYXNlKCkgOiBcInV0Zi04XCI7XHJcblxyXG5cdHZhciBieXRlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRvVWludDhBcnJheShhcnJheUJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgpKTtcclxuXHJcblx0c3dpdGNoIChlbmNvZGluZykge1xyXG5cdFx0Y2FzZSBcImFzY2lpXCI6XHJcblx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGJ5dGVzLm1hcChmdW5jdGlvbiAoYnl0ZSkgeyByZXR1cm4gYnl0ZSAlIDEyODsgfSkpO1xyXG5cdFx0Y2FzZSBcInV0ZjhcIjpcclxuXHRcdGNhc2UgXCJ1dGYtOFwiOlxyXG5cdFx0XHRyZXR1cm4gdXRmOGRlY29kZShieXRlcyk7XHJcblx0fVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgTlVMIHRlcm1pbmF0ZWQgQVNDSUkgZW5jb2RlZCBzdHJpbmcgZnJvbSB0aGUgZ2l2ZW4gYnVmZmVyIHN0YXJ0aW5nIGF0IHRoZSBnaXZlbiBvZmZzZXQuXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIGdldENTdHJpbmdcclxuICogQHBhcmFtIHtBcnJheUJ1ZmZlclZpZXd8QXJyYXlCdWZmZXJ9IGFycmF5QnVmZmVyIFRoZSBidWZmZXIgdG8gcmVhZCBmcm9tLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IFRoZSBvZmZzZXQgaW4gYnl0ZXMgdG8gc3RhcnQgcmVhZGluZy5cclxuICogQHJldHVybiB7c3RyaW5nfSBzdHJpbmcgVGhlIHJlYWQgc3RyaW5nLlxyXG4gKi9cclxuZXhwb3J0cy5nZXRDU3RyaW5nID0gZnVuY3Rpb24gKGFycmF5QnVmZmVyLCBvZmZzZXQpIHtcclxuXHR2YXIgYnl0ZXMgPSB0b1VpbnQ4QXJyYXkoYXJyYXlCdWZmZXIsIG9mZnNldCk7XHJcblxyXG4gICAgdmFyIGFzY2lpQ29kZVVuaXRzID0gW107XHJcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBieXRlcy5ieXRlTGVuZ3RoOyArK2lkeCkge1xyXG4gICAgICAgIHZhciBjID0gYnl0ZXNbaWR4XTtcclxuICAgICAgICBpZiAoYyA9PT0gMHgwMClcclxuICAgICAgICAgICAgYnJlYWs7XHJcblx0ICAgIGFzY2lpQ29kZVVuaXRzLnB1c2goYyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBhc2NpaUNvZGVVbml0cyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhbiBBcnJheUJ1ZmZlciBmaWxsZWQgd2l0aCB0aGUgZ2l2ZW4gc3RyaW5nLlxyXG4gKiBUaGUgc3RyaW5nIHdpbGwgYmUgQVNDSUkgZW5jb2RlZCBhbmQgc3VjY2VlZGVkIGJ5IGEgTlVMIGNoYXJhY3Rlci5cclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIGZvciB3aGljaCBhIGJ1ZmZlciBzaG91bGQgYmUgY3JlYXRlZC5cclxuICogQHJldHVybiB7QXJyYXlCdWZmZXJ9IEFuIEFycmF5QnVmZmVyIGNvbnRhaW5pbmcgdGhlIGdpdmVuIHN0cmluZy5cclxuICovXHJcbmV4cG9ydHMuYnVmZmVyRm9yQ1N0cmluZyA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcclxuXHQvLyBBZGQgb25lIGJ5dGUgZm9yIHRoZSBOVUwgY2hhcmFjdGVyXHJcblx0dmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcih0aGlzLmJ5dGVTaXplRm9yU3RyaW5nKHN0cmluZywgXCJhc2NpaVwiKSArIDEpO1xyXG5cdHRoaXMuc2V0Q1N0cmluZyhidWZmZXIsIDAsIHN0cmluZyk7XHJcblx0cmV0dXJuIGJ1ZmZlcjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGFuIEFycmF5QnVmZmVyIGZpbGxlZCB3aXRoIHRoZSBnaXZlbiBzdHJpbmcgdXNpbmcgdGhlIGdpdmVuIGVuY29kaW5nLlxyXG4gKiBJZiBsaXR0bGVFbmRpYW4gaXMgdHJ1ZSwgbXVsdGktYnl0ZSB2YWx1ZXMgd2lsbCBiZSB3cml0dGVuIGluIGxpdHRsZUVuZGlhbiBmb3JtYXQuXHJcbiAqIEN1cnJlbnRseSBvbmx5IEFTQ0lJIGFuZCBVVEYtOCBlbmNvZGluZyBpcyBzdXBwb3J0ZWQgd2hpY2ggbWFrZXMgZW5kaWFubmVzcyBhIG5vbiBpc3N1ZS5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gYnVmZmVyRm9yU3RyaW5nXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBmb3Igd2hpY2ggYSBidWZmZXIgc2hvdWxkIGJlIGNyZWF0ZWQuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBlbmNvZGluZyBUaGUgZW5jb2RpbmcgdG8gdXNlLlxyXG4gKiBAcGFyYW0ge2Jvb2x9IFtsaXR0bGVFbmRpYW4gPSBmYWxzZV0gSWYgdHJ1ZSBtdWx0aS1ieXRlIGNoYXJhY3RlcnMgd2lsbCBiZSB3cml0dGVuIGluIGxpdHRsZS1lbmRpYW4gZm9ybWF0LlxyXG4gKiBAcmV0dXJucyB7QXJyYXlCdWZmZXJ9IEFuIEFycmF5QnVmZmVyIGNvbnRhaW5pbmcgdGhlIGdpdmVuIHN0cmluZy5cclxuICovXHJcbmV4cG9ydHMuYnVmZmVyRm9yU3RyaW5nID0gZnVuY3Rpb24gKHN0cmluZywgZW5jb2RpbmcsIGxpdHRsZUVuZGlhbikge1xyXG5cdHZhciBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIodGhpcy5ieXRlU2l6ZUZvclN0cmluZyhzdHJpbmcsIGVuY29kaW5nKSk7XHJcbiAgICB0aGlzLnNldFN0cmluZyhidWZmZXIsIDAsIHN0cmluZywgZW5jb2RpbmcsIGxpdHRsZUVuZGlhbik7XHJcbiAgICByZXR1cm4gYnVmZmVyO1xyXG59O1xyXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLypnbG9iYWwgc2V0SW1tZWRpYXRlOiBmYWxzZSwgc2V0VGltZW91dDogZmFsc2UsIGNvbnNvbGU6IGZhbHNlICovXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGFzeW5jID0ge307XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHJvb3QsIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgcm9vdCA9IHRoaXM7XG4gICAgaWYgKHJvb3QgIT0gbnVsbCkge1xuICAgICAgcHJldmlvdXNfYXN5bmMgPSByb290LmFzeW5jO1xuICAgIH1cblxuICAgIGFzeW5jLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBwcmV2aW91c19hc3luYztcbiAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBvbmx5X29uY2UoZm4pIHtcbiAgICAgICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsYmFjayB3YXMgYWxyZWFkeSBjYWxsZWQuXCIpO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHJvb3QsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLy8vIGNyb3NzLWJyb3dzZXIgY29tcGF0aWJsaXR5IGZ1bmN0aW9ucyAvLy8vXG5cbiAgICB2YXIgX2VhY2ggPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLmZvckVhY2gpIHtcbiAgICAgICAgICAgIHJldHVybiBhcnIuZm9yRWFjaChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltpXSwgaSwgYXJyKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgX21hcCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yKSB7XG4gICAgICAgIGlmIChhcnIubWFwKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLm1hcChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yKHgsIGksIGEpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH07XG5cbiAgICB2YXIgX3JlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtZW1vKSB7XG4gICAgICAgIGlmIChhcnIucmVkdWNlKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLnJlZHVjZShpdGVyYXRvciwgbWVtbyk7XG4gICAgICAgIH1cbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgbWVtbyA9IGl0ZXJhdG9yKG1lbW8sIHgsIGksIGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcblxuICAgIHZhciBfa2V5cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGtleXMucHVzaChrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9O1xuXG4gICAgLy8vLyBleHBvcnRlZCBhc3luYyBtb2R1bGUgZnVuY3Rpb25zIC8vLy9cblxuICAgIC8vLy8gbmV4dFRpY2sgaW1wbGVtZW50YXRpb24gd2l0aCBicm93c2VyLWNvbXBhdGlibGUgZmFsbGJhY2sgLy8vL1xuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgIShwcm9jZXNzLm5leHRUaWNrKSkge1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5uZXh0VGljayA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhc3luYy5uZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgIC8vIG5vdCBhIGRpcmVjdCBhbGlhcyBmb3IgSUUxMCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYy5lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIG9ubHlfb25jZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaCA9IGFzeW5jLmVhY2g7XG5cbiAgICBhc3luYy5lYWNoU2VyaWVzID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIHZhciBpdGVyYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaXRlcmF0b3IoYXJyW2NvbXBsZXRlZF0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBpdGVyYXRlKCk7XG4gICAgfTtcbiAgICBhc3luYy5mb3JFYWNoU2VyaWVzID0gYXN5bmMuZWFjaFNlcmllcztcblxuICAgIGFzeW5jLmVhY2hMaW1pdCA9IGZ1bmN0aW9uIChhcnIsIGxpbWl0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGZuID0gX2VhY2hMaW1pdChsaW1pdCk7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIFthcnIsIGl0ZXJhdG9yLCBjYWxsYmFja10pO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaExpbWl0ID0gYXN5bmMuZWFjaExpbWl0O1xuXG4gICAgdmFyIF9lYWNoTGltaXQgPSBmdW5jdGlvbiAobGltaXQpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgaWYgKCFhcnIubGVuZ3RoIHx8IGxpbWl0IDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICAgICAgdmFyIHN0YXJ0ZWQgPSAwO1xuICAgICAgICAgICAgdmFyIHJ1bm5pbmcgPSAwO1xuXG4gICAgICAgICAgICAoZnVuY3Rpb24gcmVwbGVuaXNoICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHJ1bm5pbmcgPCBsaW1pdCAmJiBzdGFydGVkIDwgYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaXRlcmF0b3IoYXJyW3N0YXJ0ZWQgLSAxXSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxlbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG5cbiAgICB2YXIgZG9QYXJhbGxlbCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFthc3luYy5lYWNoXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgdmFyIGRvUGFyYWxsZWxMaW1pdCA9IGZ1bmN0aW9uKGxpbWl0LCBmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFtfZWFjaExpbWl0KGxpbWl0KV0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBkb1NlcmllcyA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFthc3luYy5lYWNoU2VyaWVzXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG5cblxuICAgIHZhciBfYXN5bmNNYXAgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIHJlc3VsdHNbeC5pbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5tYXAgPSBkb1BhcmFsbGVsKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwU2VyaWVzID0gZG9TZXJpZXMoX2FzeW5jTWFwKTtcbiAgICBhc3luYy5tYXBMaW1pdCA9IGZ1bmN0aW9uIChhcnIsIGxpbWl0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9tYXBMaW1pdChsaW1pdCkoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB2YXIgX21hcExpbWl0ID0gZnVuY3Rpb24obGltaXQpIHtcbiAgICAgICAgcmV0dXJuIGRvUGFyYWxsZWxMaW1pdChsaW1pdCwgX2FzeW5jTWFwKTtcbiAgICB9O1xuXG4gICAgLy8gcmVkdWNlIG9ubHkgaGFzIGEgc2VyaWVzIHZlcnNpb24sIGFzIGRvaW5nIHJlZHVjZSBpbiBwYXJhbGxlbCB3b24ndFxuICAgIC8vIHdvcmsgaW4gbWFueSBzaXR1YXRpb25zLlxuICAgIGFzeW5jLnJlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoU2VyaWVzKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihtZW1vLCB4LCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9IHY7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1lbW8pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGluamVjdCBhbGlhc1xuICAgIGFzeW5jLmluamVjdCA9IGFzeW5jLnJlZHVjZTtcbiAgICAvLyBmb2xkbCBhbGlhc1xuICAgIGFzeW5jLmZvbGRsID0gYXN5bmMucmVkdWNlO1xuXG4gICAgYXN5bmMucmVkdWNlUmlnaHQgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJldmVyc2VkID0gX21hcChhcnIsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfSkucmV2ZXJzZSgpO1xuICAgICAgICBhc3luYy5yZWR1Y2UocmV2ZXJzZWQsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICAvLyBmb2xkciBhbGlhc1xuICAgIGFzeW5jLmZvbGRyID0gYXN5bmMucmVkdWNlUmlnaHQ7XG5cbiAgICB2YXIgX2ZpbHRlciA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfbWFwKHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgICAgICAgICAgIH0pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmZpbHRlciA9IGRvUGFyYWxsZWwoX2ZpbHRlcik7XG4gICAgYXN5bmMuZmlsdGVyU2VyaWVzID0gZG9TZXJpZXMoX2ZpbHRlcik7XG4gICAgLy8gc2VsZWN0IGFsaWFzXG4gICAgYXN5bmMuc2VsZWN0ID0gYXN5bmMuZmlsdGVyO1xuICAgIGFzeW5jLnNlbGVjdFNlcmllcyA9IGFzeW5jLmZpbHRlclNlcmllcztcblxuICAgIHZhciBfcmVqZWN0ID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgudmFsdWUsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfbWFwKHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgICAgICAgICAgIH0pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLnJlamVjdCA9IGRvUGFyYWxsZWwoX3JlamVjdCk7XG4gICAgYXN5bmMucmVqZWN0U2VyaWVzID0gZG9TZXJpZXMoX3JlamVjdCk7XG5cbiAgICB2YXIgX2RldGVjdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKHgpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZGV0ZWN0ID0gZG9QYXJhbGxlbChfZGV0ZWN0KTtcbiAgICBhc3luYy5kZXRlY3RTZXJpZXMgPSBkb1NlcmllcyhfZGV0ZWN0KTtcblxuICAgIGFzeW5jLnNvbWUgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBhbnkgYWxpYXNcbiAgICBhc3luYy5hbnkgPSBhc3luYy5zb21lO1xuXG4gICAgYXN5bmMuZXZlcnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICghdikge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG1haW5fY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gYWxsIGFsaWFzXG4gICAgYXN5bmMuYWxsID0gYXN5bmMuZXZlcnk7XG5cbiAgICBhc3luYy5zb3J0QnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMubWFwKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAoZXJyLCBjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHt2YWx1ZTogeCwgY3JpdGVyaWE6IGNyaXRlcmlhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWEsIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgX21hcChyZXN1bHRzLnNvcnQoZm4pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5hdXRvID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICB2YXIga2V5cyA9IF9rZXlzKHRhc2tzKTtcbiAgICAgICAgaWYgKCFrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gW107XG4gICAgICAgIHZhciBhZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnVuc2hpZnQoZm4pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgcmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRhc2tDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF9lYWNoKGxpc3RlbmVycy5zbGljZSgwKSwgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGFkZExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfa2V5cyhyZXN1bHRzKS5sZW5ndGggPT09IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2VhY2goa2V5cywgZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gKHRhc2tzW2tdIGluc3RhbmNlb2YgRnVuY3Rpb24pID8gW3Rhc2tzW2tdXTogdGFza3Nba107XG4gICAgICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2VhY2goX2tleXMocmVzdWx0cyksIGZ1bmN0aW9uKHJrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gcmVzdWx0c1tya2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzYWZlUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3Agc3Vic2VxdWVudCBlcnJvcnMgaGl0dGluZyBjYWxsYmFjayBtdWx0aXBsZSB0aW1lc1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSh0YXNrQ29tcGxldGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIE1hdGguYWJzKHRhc2subGVuZ3RoIC0gMSkpIHx8IFtdO1xuICAgICAgICAgICAgdmFyIHJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy53YXRlcmZhbGwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICh0YXNrcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpIHtcbiAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCB0byB3YXRlcmZhbGwgbXVzdCBiZSBhbiBhcnJheSBvZiBmdW5jdGlvbnMnKTtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHdyYXBJdGVyYXRvciA9IGZ1bmN0aW9uIChpdGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHdyYXBJdGVyYXRvcihuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRvci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgd3JhcEl0ZXJhdG9yKGFzeW5jLml0ZXJhdG9yKHRhc2tzKSkoKTtcbiAgICB9O1xuXG4gICAgdmFyIF9wYXJhbGxlbCA9IGZ1bmN0aW9uKGVhY2hmbiwgdGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICh0YXNrcy5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpIHtcbiAgICAgICAgICAgIGVhY2hmbi5tYXAodGFza3MsIGZ1bmN0aW9uIChmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm4oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZXJyLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgIGVhY2hmbi5lYWNoKF9rZXlzKHRhc2tzKSwgZnVuY3Rpb24gKGssIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdGFza3Nba10oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMucGFyYWxsZWwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbCh7IG1hcDogYXN5bmMubWFwLCBlYWNoOiBhc3luYy5lYWNoIH0sIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsTGltaXQgPSBmdW5jdGlvbih0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbCh7IG1hcDogX21hcExpbWl0KGxpbWl0KSwgZWFjaDogX2VhY2hMaW1pdChsaW1pdCkgfSwgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VyaWVzID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAodGFza3MuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4gICAgICAgICAgICBhc3luYy5tYXBTZXJpZXModGFza3MsIGZ1bmN0aW9uIChmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm4oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZXJyLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgIGFzeW5jLmVhY2hTZXJpZXMoX2tleXModGFza3MpLCBmdW5jdGlvbiAoaywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB0YXNrc1trXShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5pdGVyYXRvciA9IGZ1bmN0aW9uICh0YXNrcykge1xuICAgICAgICB2YXIgbWFrZUNhbGxiYWNrID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0YXNrc1tpbmRleF0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLm5leHQoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmbi5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoaW5kZXggPCB0YXNrcy5sZW5ndGggLSAxKSA/IG1ha2VDYWxsYmFjayhpbmRleCArIDEpOiBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBmbjtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG1ha2VDYWxsYmFjaygwKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXBwbHkgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KFxuICAgICAgICAgICAgICAgIG51bGwsIGFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgX2NvbmNhdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByID0gW107XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYikge1xuICAgICAgICAgICAgZm4oeCwgZnVuY3Rpb24gKGVyciwgeSkge1xuICAgICAgICAgICAgICAgIHIgPSByLmNvbmNhdCh5IHx8IFtdKTtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcik7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuY29uY2F0ID0gZG9QYXJhbGxlbChfY29uY2F0KTtcbiAgICBhc3luYy5jb25jYXRTZXJpZXMgPSBkb1NlcmllcyhfY29uY2F0KTtcblxuICAgIGFzeW5jLndoaWxzdCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHRlc3QoKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFzeW5jLndoaWxzdCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvV2hpbHN0ID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGVzdCgpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy51bnRpbCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy51bnRpbCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvVW50aWwgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGVzdCgpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9VbnRpbChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLnF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgaWYgKGNvbmN1cnJlbmN5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfaW5zZXJ0KHEsIGRhdGEsIHBvcywgY2FsbGJhY2spIHtcbiAgICAgICAgICBpZihkYXRhLmNvbnN0cnVjdG9yICE9PSBBcnJheSkge1xuICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG51bGxcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBpZiAocG9zKSB7XG4gICAgICAgICAgICAgICAgcS50YXNrcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHEudGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChxLnNhdHVyYXRlZCAmJiBxLnRhc2tzLmxlbmd0aCA9PT0gY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHEucHJvY2Vzcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd29ya2VycyA9IDA7XG4gICAgICAgIHZhciBxID0ge1xuICAgICAgICAgICAgdGFza3M6IFtdLFxuICAgICAgICAgICAgY29uY3VycmVuY3k6IGNvbmN1cnJlbmN5LFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIGZhbHNlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5zaGlmdDogZnVuY3Rpb24gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgdHJ1ZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAod29ya2VycyA8IHEuY29uY3VycmVuY3kgJiYgcS50YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhc2sgPSBxLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxLmVtcHR5ICYmIHEudGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd29ya2VycyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcnMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5jYWxsYmFjay5hcHBseSh0YXNrLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHEuZHJhaW4gJiYgcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYiA9IG9ubHlfb25jZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyKHRhc2suZGF0YSwgY2IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JrZXJzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY2FyZ28gPSBmdW5jdGlvbiAod29ya2VyLCBwYXlsb2FkKSB7XG4gICAgICAgIHZhciB3b3JraW5nICAgICA9IGZhbHNlLFxuICAgICAgICAgICAgdGFza3MgICAgICAgPSBbXTtcblxuICAgICAgICB2YXIgY2FyZ28gPSB7XG4gICAgICAgICAgICB0YXNrczogdGFza3MsXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmKGRhdGEuY29uc3RydWN0b3IgIT09IEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhcmdvLnNhdHVyYXRlZCAmJiB0YXNrcy5sZW5ndGggPT09IHBheWxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmdvLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGNhcmdvLnByb2Nlc3MpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uIHByb2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmtpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNhcmdvLmRyYWluKSBjYXJnby5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHRzID0gdHlwZW9mIHBheWxvYWQgPT09ICdudW1iZXInXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyB0YXNrcy5zcGxpY2UoMCwgcGF5bG9hZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHRhc2tzLnNwbGljZSgwKTtcblxuICAgICAgICAgICAgICAgIHZhciBkcyA9IF9tYXAodHMsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXNrLmRhdGE7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZihjYXJnby5lbXB0eSkgY2FyZ28uZW1wdHkoKTtcbiAgICAgICAgICAgICAgICB3b3JraW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB3b3JrZXIoZHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2luZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICBfZWFjaCh0cywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jYWxsYmFjay5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcHJvY2VzcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JraW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY2FyZ287XG4gICAgfTtcblxuICAgIHZhciBfY29uc29sZV9mbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29uc29sZVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2VhY2goYXJncywgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlW25hbWVdKHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XSkpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgYXN5bmMubG9nID0gX2NvbnNvbGVfZm4oJ2xvZycpO1xuICAgIGFzeW5jLmRpciA9IF9jb25zb2xlX2ZuKCdkaXInKTtcbiAgICAvKmFzeW5jLmluZm8gPSBfY29uc29sZV9mbignaW5mbycpO1xuICAgIGFzeW5jLndhcm4gPSBfY29uc29sZV9mbignd2FybicpO1xuICAgIGFzeW5jLmVycm9yID0gX2NvbnNvbGVfZm4oJ2Vycm9yJyk7Ki9cblxuICAgIGFzeW5jLm1lbW9pemUgPSBmdW5jdGlvbiAoZm4sIGhhc2hlcikge1xuICAgICAgICB2YXIgbWVtbyA9IHt9O1xuICAgICAgICB2YXIgcXVldWVzID0ge307XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgaWYgKGtleSBpbiBtZW1vKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgbWVtb1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGtleSBpbiBxdWV1ZXMpIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldID0gW2NhbGxiYWNrXTtcbiAgICAgICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBtZW1vW2tleV0gPSBhcmd1bWVudHM7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxID0gcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBxLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgIHFbaV0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG1lbW9pemVkLm1lbW8gPSBtZW1vO1xuICAgICAgICBtZW1vaXplZC51bm1lbW9pemVkID0gZm47XG4gICAgICAgIHJldHVybiBtZW1vaXplZDtcbiAgICB9O1xuXG4gICAgYXN5bmMudW5tZW1vaXplID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKGZuLnVubWVtb2l6ZWQgfHwgZm4pLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBhc3luYy50aW1lcyA9IGZ1bmN0aW9uIChjb3VudCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjb3VudGVyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgY291bnRlci5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3luYy5tYXAoY291bnRlciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMudGltZXNTZXJpZXMgPSBmdW5jdGlvbiAoY291bnQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgY291bnRlciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGNvdW50ZXIucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN5bmMubWFwU2VyaWVzKGNvdW50ZXIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmNvbXBvc2UgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb25zLi4uICovKSB7XG4gICAgICAgIHZhciBmbnMgPSBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgYXN5bmMucmVkdWNlKGZucywgYXJncywgZnVuY3Rpb24gKG5ld2FyZ3MsIGZuLCBjYikge1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KHRoYXQsIG5ld2FyZ3MuY29uY2F0KFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnIgPSBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGNiKGVyciwgbmV4dGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1dKSlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhhdCwgW2Vycl0uY29uY2F0KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgX2FwcGx5RWFjaCA9IGZ1bmN0aW9uIChlYWNoZm4sIGZucyAvKmFyZ3MuLi4qLykge1xuICAgICAgICB2YXIgZ28gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzLmNvbmNhdChbY2JdKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICAgICAgICAgIHJldHVybiBnby5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBnbztcbiAgICAgICAgfVxuICAgIH07XG4gICAgYXN5bmMuYXBwbHlFYWNoID0gZG9QYXJhbGxlbChfYXBwbHlFYWNoKTtcbiAgICBhc3luYy5hcHBseUVhY2hTZXJpZXMgPSBkb1NlcmllcyhfYXBwbHlFYWNoKTtcblxuICAgIGFzeW5jLmZvcmV2ZXIgPSBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIGZ1bmN0aW9uIG5leHQoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIC8vIEFNRCAvIFJlcXVpcmVKU1xuICAgIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gTm9kZS5qc1xuICAgIGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXN5bmM7XG4gICAgfVxuICAgIC8vIGluY2x1ZGVkIGRpcmVjdGx5IHZpYSA8c2NyaXB0PiB0YWdcbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5hc3luYyA9IGFzeW5jO1xuICAgIH1cblxufSgpKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIrTnNjTm1cIikpIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5ID0gcmVxdWlyZShcIi4uL3V0aWwvZmxpcF9lbmRpYW5uZXNzX2lmX25lY2Vzc2FyeVwiKTtcclxuXHJcbnZhciBub3JtYWwgPSAoMSA8PCAwKTtcclxudmFyIHRhbmdlbnQgPSAoMSA8PCAxKTtcclxudmFyIHRleGNvb3JkID0gKDEgPDwgMik7XHJcbnZhciBjb2xvciA9ICgxIDw8IDMpO1xyXG5cclxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbiAobWVzaCwgbGl0dGxlRW5kaWFuKSB7XHJcbiAgICB2YXIgdmVydGV4Q291bnQgPSBtZXNoLnBvc2l0aW9uLmxlbmd0aCAvIDMuMDtcclxuICAgIHZhciBhdHRyaWJzID0gMDtcclxuXHJcbiAgICB2YXIgYnVmZmVycyA9IFtmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobWVzaC5wb3NpdGlvbiwgbGl0dGxlRW5kaWFuKV07XHJcblxyXG4gICAgaWYgKG1lc2gubm9ybWFsKSB7XHJcbiAgICAgICAgYXR0cmlicyB8PSBub3JtYWw7XHJcbiAgICAgICAgYnVmZmVycy5wdXNoKGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShtZXNoLm5vcm1hbCwgbGl0dGxlRW5kaWFuKSlcclxuICAgIH1cclxuICAgIGlmIChtZXNoLnRhbmdlbnQpIHtcclxuICAgICAgICBhdHRyaWJzIHw9IHRhbmdlbnQ7XHJcbiAgICAgICAgYnVmZmVycy5wdXNoKGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShtZXNoLnRhbmdlbnQsIGxpdHRsZUVuZGlhbikpO1xyXG4gICAgfVxyXG4gICAgaWYgKG1lc2gudGV4Y29vcmQpIHtcclxuICAgICAgICBhdHRyaWJzIHw9IHRleGNvb3JkO1xyXG4gICAgICAgIGJ1ZmZlcnMucHVzaChmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobWVzaC50ZXhjb29yZCwgbGl0dGxlRW5kaWFuKSk7XHJcbiAgICB9XHJcbiAgICBpZiAobWVzaC5jb2xvcikge1xyXG4gICAgICAgIGF0dHJpYnMgfD0gY29sb3I7XHJcbiAgICAgICAgYnVmZmVycy5wdXNoKGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShtZXNoLmNvbG9yLCBsaXR0bGVFbmRpYW4pKTtcclxuICAgIH1cclxuICAgIGJ1ZmZlcnMucHVzaChmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobWVzaC5pbmRleCwgbGl0dGxlRW5kaWFuKSk7XHJcblxyXG4gICAgLy8gMyBieXRlcyBwYWRkaW5nIHRvIGFsaWduIGZvbGxvd2luZyBidWZmZXIgdG8gNCBieXRlIGJvdW5kYXJpZXMgYXMgbmVjY2Vzc2FyeS5cclxuICAgIGJ1ZmZlcnMudW5zaGlmdChuZXcgQXJyYXlCdWZmZXIoMykpO1xyXG4gICAgYnVmZmVycy51bnNoaWZ0KG5ldyBVaW50OEFycmF5KFthdHRyaWJzXSkpO1xyXG5cclxuICAgIGJ1ZmZlcnMudW5zaGlmdChmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IFVpbnQzMkFycmF5KFt2ZXJ0ZXhDb3VudF0pLCBsaXR0bGVFbmRpYW4pKTtcclxuXHJcbiAgICByZXR1cm4gYnVmZmVycztcclxufTtcclxuXHJcbmV4cG9ydHMuZGVjb2RlID0gZnVuY3Rpb24gKGJ1ZmZlciwgbGl0dGxlRW5kaWFuKSB7XHJcbiAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xyXG4gICAgdmFyIG9mZnNldCA9IDA7XHJcbiAgICB2YXIgdmVydGV4Q291bnQgPSB2aWV3LmdldFVpbnQzMihvZmZzZXQsIGxpdHRsZUVuZGlhbik7XHJcbiAgICBvZmZzZXQgKz0gNDtcclxuICAgIHZhciBhdHRyaWJzID0gdmlldy5nZXRVaW50OChvZmZzZXQpO1xyXG4gICAgb2Zmc2V0ICs9IDQ7XHJcblxyXG4gICAgdmFyIG1lc2ggPSB7XHJcbiAgICAgICAgcG9zaXRpb246IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDMpLCBsaXR0bGVFbmRpYW4pXHJcbiAgICB9O1xyXG4gICAgb2Zmc2V0ICs9IHZlcnRleENvdW50ICogMyAqIG1lc2gucG9zaXRpb24uQllURVNfUEVSX0VMRU1FTlQ7XHJcblxyXG4gICAgaWYgKGF0dHJpYnMgJiBub3JtYWwpIHtcclxuICAgICAgICBtZXNoLm5vcm1hbCA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDMpLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDMgKiBtZXNoLm5vcm1hbC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgIH1cclxuICAgIGlmIChhdHRyaWJzICYgdGFuZ2VudCkge1xyXG4gICAgICAgIG1lc2gudGFuZ2VudCA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDMpLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDMgKiBtZXNoLnRhbmdlbnQuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICB9XHJcbiAgICBpZiAoYXR0cmlicyAmIHRleGNvb3JkKSB7XHJcbiAgICAgICAgbWVzaC50ZXhjb29yZCA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDIpLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDIgKiBtZXNoLnRleGNvb3JkLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgfVxyXG4gICAgaWYgKGF0dHJpYnMgJiBjb2xvcikge1xyXG4gICAgICAgIG1lc2guY29sb3IgPSBmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IEZsb2F0MzJBcnJheShidWZmZXIsIG9mZnNldCwgdmVydGV4Q291bnQgKiA0KSwgbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICBvZmZzZXQgKz0gdmVydGV4Q291bnQgKiA0ICogbWVzaC5jb2xvci5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgIH1cclxuXHJcbiAgICBtZXNoLmluZGV4ID0gZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBVaW50MzJBcnJheShidWZmZXIsIG9mZnNldCksIGxpdHRsZUVuZGlhbik7XHJcblxyXG4gICAgcmV0dXJuIG1lc2g7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGFib3BzID0gcmVxdWlyZShcImFib3BzXCIpO1xyXG5cclxudmFyIGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlID0gcmVxdWlyZShcIi4uL3V0aWwvaXNfbGl0dGxlX2VuZGlhbl9hcmNoaXRlY3R1cmVcIik7XHJcblxyXG4vLyBXZSB1c2UgdGhlIGZpcnN0IGJ5dGUgdG8gZW5jb2RlIHRoZSB0eXBlIG9mIHRoZSB0eXBlZCBhcnJheVxyXG5leHBvcnRzLmVuY29kZSA9IGZ1bmN0aW9uICh0eXBlZEFycmF5LCBsaXR0bGVFbmRpYW4pIHtcclxuICAgIHZhciB0eXBlID0gdHlwZWRBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcclxuXHJcbiAgICBpZiAodHlwZWRBcnJheSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSB8fCB0eXBlZEFycmF5IGluc3RhbmNlb2YgRmxvYXQ2NEFycmF5KVxyXG4gICAgICAgIHR5cGUgfD0gKDEgPDwgNyk7XHJcbiAgICBlbHNlIGlmICh0eXBlZEFycmF5IGluc3RhbmNlb2YgVWludDhBcnJheSB8fCB0eXBlZEFycmF5IGluc3RhbmNlb2YgVWludDE2QXJyYXkgfHwgdHlwZWRBcnJheSBpbnN0YW5jZW9mIFVpbnQzMkFycmF5KVxyXG4gICAgICAgIHR5cGUgfD0gKDEgPDwgNik7XHJcblxyXG4gICAgcmV0dXJuIGFib3BzLmNvbmNhdChuZXcgVWludDhBcnJheShbdHlwZV0pLCBmbGlwRW5kaWFubmVzSWZOZWNlc3NhcnkodHlwZWRBcnJheSwgbGl0dGxlRW5kaWFuKSk7XHJcbn07XHJcblxyXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uIChidWZmZXIsIGxpdHRsZUVuZGlhbikge1xyXG4gICAgdmFyIHR5cGUgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKS5nZXRVaW50OCgwKTtcclxuICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgxKTtcclxuICAgIHZhciBpc1Vuc2luZ2VkID0gISEodHlwZSAmICgxIDw8IDYpKTtcclxuICAgIHZhciBpc0Zsb2F0aW5nUG9pbnQgPSAhISh0eXBlICYgKDEgPDwgNykpO1xyXG4gICAgdmFyIHR5cGVkQXJyYXkgPSBudWxsO1xyXG4gICAgc3dpdGNoICh0eXBlICYgMHgwRikge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgdHlwZWRBcnJheSA9IGlzVW5zaW5nZWQgPyBuZXcgVWludDhBcnJheShidWZmZXIpIDogbmV3IEludDhBcnJheShidWZmZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgIHR5cGVkQXJyYXkgPSBpc1Vuc2luZ2VkID8gbmV3IFVpbnQxNkFycmF5KGJ1ZmZlcikgOiBuZXcgSW50MTZBcnJheShidWZmZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgIHR5cGVkQXJyYXkgPSBpc1Vuc2luZ2VkID8gbmV3IFVpbnQzMkFycmF5KGJ1ZmZlcikgOiAoaXNGbG9hdGluZ1BvaW50ID8gbmV3IEZsb2F0MzJBcnJheShidWZmZXIpIDogbmV3IEludDMyQXJyYXkoYnVmZmVyKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgODpcclxuICAgICAgICAgICAgdHlwZWRBcnJheSA9IG5ldyBGbG9hdDY0QXJyYXkoYnVmZmVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlVuZXhwZWN0ZWQgdHlwZSBlbmNvZGluZyBmb3IgYnVmZmVyIVwiKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmxpcEVuZGlhbm5lc0lmTmVjZXNzYXJ5KHR5cGVkQXJyYXksIGxpdHRsZUVuZGlhbik7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBmbGlwRW5kaWFubmVzSWZOZWNlc3NhcnkodHlwZWRBcnJheSwgbGl0dGxlRW5kaWFuKSB7XHJcbiAgICBpZiAobGl0dGxlRW5kaWFuICYmICFpc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSgpKVxyXG4gICAgICAgIHJldHVybiBhYm9wcy5mbGlwRW5kaWFubmVzcyh0eXBlZEFycmF5KTtcclxuICAgIHJldHVybiB0eXBlZEFycmF5O1xyXG59XHJcbiIsIi8vICMgSlNPTiBDb2RlY1xyXG5cclxuLy8gVGhpcyBzaW1wbGUgY29kZWMgc2ltcGx5IHVzZXMgYEpTT04uc3RyaW5naWZ5YCBhbmQgYEpTT04ucGFyc2VgIHRvIGVuY29kZSBhbmQgZGVjb2RlIHRoZSBnaXZlbiBkYXRhLlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgYWJvcHMgPSByZXF1aXJlKFwiYWJvcHNcIik7XHJcblxyXG4vKipcclxuICogRW5jb2RlcyB0aGUgZ2l2ZW4gdmFsdWUgdXNpbmcgSlNPTi5zdHJpbmdpZnkuXHJcbiAqIFRoaXMgc3RyaW5nIHJlcHJlc2VudGF0aW9uIHdpbGwgYmUgd3JpdHRlbiBpbnRvIGFuIEFycmF5QnVmZmVyIHVzaW5nIFVURi04IGVuY29kaW5nLlxyXG4gKiBUaGUgc2Vjb25kIGR1bW15IHBhcmFtZXRlciBpcyBvbmx5IGZvciBjb21wYXRpYmlsaXR5IHdpdGggdGhlIGNvcmUgbGlicmFyeSB0aGF0IGV4cGVjdHNcclxuICogZW5jb2RlcnMgdG8gcHJvdmlkZSBhIGxpdHRsZS1lbmRpYW4gcGFyYW1ldGVyIHRvIHNwZWNpZnkgdGhlIGZvcm1hdCBpbiB3aGljaCBtdWx0aS1ieXRlIHZhbHVlcyB3aWxsXHJcbiAqIGJlIHdyaXR0ZW4gaW50byBhIGJ1ZmZlci5cclxuICogU2luY2Ugd2Ugd3JpdGUgVVRGLTggZW5jb2RlZCBzdHJpbmdzIGVuZGlhbm5lc3MgaXMgaXJyZWxldmFudC5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gZW5jb2RlXHJcbiAqIEBwYXJhbSB7TWl4ZWR9IG9iamVjdCBUaGUgdmFsdWUgdG8gZW5jb2RlLlxyXG4gKiBAcmV0dXJucyB7QXJyYXlCdWZmZXJ9IEFuIEFycmF5QnVmZmVyIGNvbnRhaW5pbmcgdGhlIFVURi04IGVuY29kZWQgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiB2YWx1ZS5cclxuICovXHJcbmV4cG9ydHMuZW5jb2RlID0gZnVuY3Rpb24gKG9iamVjdCwgXykge1xyXG4gICAgcmV0dXJuIGFib3BzLmJ1ZmZlckZvclN0cmluZyhKU09OLnN0cmluZ2lmeShvYmplY3QpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWNvZGVzIHRoZSBnaXZlbiBEYXRhVmlldyB1c2luZyBKU09OLnBhcnNlLlxyXG4gKiBJdCByZWFkcyB0aGUgVVRGLTggZW5jb2RlZCBzdHJpbmcgcmVmZXJlbmNlZCBieSB0aGUgRGF0YVZpZXcgYW5kIHBhcnNlcyB0aGF0IHN0cmluZyBhc3N1bWluZyB0aGF0XHJcbiAqIGl0IGlzIGEgc3RyaW5nIHNlcmlhbGl6YXRpb24gcHJvZHVjZWQgYnkgSlNPTi5zdHJpbmdpZnkgb3Igc29tZXRoaW5nIGVxdWl2YWxlbnQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RGF0YVZpZXd9IHZpZXcgVGhlIERhdGFWaWV3IHRoYXQgc3BlY2lmaWVzIHRoZSBidWZmZXIgYW5kIHRoZSByYW5nZSBmcm9tIHdoaWNoIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gd2lsbCBiZSBleHRyYWN0ZWQuXHJcbiAqIEByZXR1cm5zIHtNaXhlZH1cclxuICovXHJcbmV4cG9ydHMuZGVjb2RlID0gZnVuY3Rpb24gKGJ1ZmZlciwgXykge1xyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UoYWJvcHMuZ2V0U3RyaW5nKGJ1ZmZlciwgMCwgXCJ1dGYtOFwiKSk7XHJcbn07XHJcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbmV4cG9ydHMuanNvbiA9IHJlcXVpcmUoXCIuL2NvZGVjcy9qc29uXCIpO1xyXG5leHBvcnRzLmlkZW50aXR5ID0gcmVxdWlyZShcIi4vY29kZWNzL2lkZW50aXR5XCIpO1xyXG5leHBvcnRzLmFzc2ltcE1lc2ggPSByZXF1aXJlKFwiLi9jb2RlY3MvYXNzaW1wX21lc2hcIik7XHJcblxyXG5leHBvcnRzLmlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlID0gcmVxdWlyZShcIi4vdXRpbC9pc19saXR0bGVfZW5kaWFuX2FyY2hpdGVjdHVyZVwiKTtcclxuXHJcbmlmICghcHJvY2Vzcy5icm93c2VyKVxyXG4gICAgZXhwb3J0cy5zZXJ2ZUNvZGVjcyA9IHJlcXVpcmUoXCIuL3V0aWwvXCIgKyBcImFwcGVuZF9yb3V0ZXNcIik7XHJcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIrTnNjTm1cIikpIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgYWJvcHMgPSByZXF1aXJlKFwiYWJvcHNcIik7XHJcbnZhciBpc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSA9IHJlcXVpcmUoXCIuL2lzX2xpdHRsZV9lbmRpYW5fYXJjaGl0ZWN0dXJlXCIpO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHR5cGVkQXJyYXksIGxpdHRsZUVuZGlhbikge1xyXG4gICAgaWYgKGxpdHRsZUVuZGlhbiAhPT0gaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUoKSlcclxuICAgICAgICByZXR1cm4gYWJvcHMuZmxpcEVuZGlhbm5lc3ModHlwZWRBcnJheSk7XHJcbiAgICByZXR1cm4gdHlwZWRBcnJheTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdG9rZW5pemUgPSByZXF1aXJlKFwiLi9sZXhpbmdcIik7XHJcbnZhciBwYXJzZSA9IHJlcXVpcmUoXCIuL3BhcnNpbmdcIik7XHJcblxyXG52YXIgSlBhdGhJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvciA9IHJlcXVpcmUoXCIuL2ludmFsaWRfZXNjYXBlX3NlcXVlbmNlX2Vycm9yXCIpO1xyXG52YXIgSlBhdGhQYXJzaW5nRXJyb3IgPSByZXF1aXJlKFwiLi9wYXJzaW5nX2Vycm9yXCIpO1xyXG52YXIgSlBhdGhTeW50YXhFcnJvciA9IHJlcXVpcmUoXCIuL3N5bnRheF9lcnJvclwiKTtcclxuXHJcbmZ1bmN0aW9uIGhpZ2hsaWdodEVycm9uZW91c1BhcnQoZXhwcmVzc2lvbiwgc3RhcnRJZHgsIGVuZElkeCkge1xyXG4gICAgdmFyIGJlZm9yZSA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKDAsIHN0YXJ0SWR4KTtcclxuICAgIHZhciBlcnJvbmVvdXNQYXJ0ID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcoc3RhcnRJZHgsIGVuZElkeCk7XHJcbiAgICB2YXIgYWZ0ZXIgPSBleHByZXNzaW9uLnN1YnN0cmluZyhlbmRJZHgpO1xyXG4gICAgcmV0dXJuIGJlZm9yZSArIFwiPlwiICsgZXJyb25lb3VzUGFydCArIFwiPFwiICsgYWZ0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbXBpbGUocGF0aEV4cHJlc3Npb24pIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlKHRva2VuaXplKHBhdGhFeHByZXNzaW9uKSk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBKUGF0aEludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yKSB7XHJcbiAgICAgICAgICAgIHZhciBzdGFydElkeCA9IHBhdGhFeHByZXNzaW9uLmluZGV4T2YoZS5pbnZhbGlkU2VxdWVuY2UpO1xyXG4gICAgICAgICAgICB2YXIgZW5kSWR4ID0gc3RhcnRJZHggKyBlLmludmFsaWRTZXF1ZW5jZS5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBKUGF0aFN5bnRheEVycm9yKHtcclxuICAgICAgICAgICAgICAgIHJlYXNvbjogSlBhdGhTeW50YXhFcnJvci5yZWFzb25zLmludmFsaWRFc2NhcGVTZXF1ZW5jZSxcclxuICAgICAgICAgICAgICAgIHN0YXJ0SWR4OiBzdGFydElkeCxcclxuICAgICAgICAgICAgICAgIGVuZElkeDogZW5kSWR4LFxyXG4gICAgICAgICAgICAgICAgYWN0dWFsOiBlLmludmFsaWRTZXF1ZW5jZSxcclxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBlLmV4cGVjdGVkLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZTogXCIgKyBoaWdobGlnaHRFcnJvbmVvdXNQYXJ0KHBhdGhFeHByZXNzaW9uLCBzdGFydElkeCwgZW5kSWR4KSArIFwiISBHb3Q6IFwiICsgZS5pbnZhbGlkU2VxdWVuY2UgKyBcIiwgZXhwZWN0ZWQ6IFwiICsgZS5leHBlY3RlZC5qb2luKFwiIG9yIFwiKVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBKUGF0aFBhcnNpbmdFcnJvcikge1xyXG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFwiXCI7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoZS5yZWFzb24pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy5taXNzaW5nQ2xvc2luZ0JyYWNrZXQ6XHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiTWlzc2luZyBjbG9zaW5nIGJyYWNrZXQ6IFwiICsgaGlnaGxpZ2h0RXJyb25lb3VzUGFydChwYXRoRXhwcmVzc2lvbiwgZS5zdGFydElkeCwgZS5lbmRJZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zLnVubWF0Y2hlZENsb3NpbmdCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIk1pc3Npbmcgb3BlbmluZyBicmFja2V0OiBcIiArIGhpZ2hsaWdodEVycm9uZW91c1BhcnQocGF0aEV4cHJlc3Npb24sIGUuc3RhcnRJZHgsIGUuZW5kSWR4KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy5taXNzaW5nQ2xvc2luZ1BhcmVudGhlc2VzOlxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIk1pc3NpbmcgY2xvc2luZyBwYXJlbnRoZXNlczogXCIgKyBoaWdobGlnaHRFcnJvbmVvdXNQYXJ0KHBhdGhFeHByZXNzaW9uLCBlLnN0YXJ0SWR4LCBlLmVuZElkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEpQYXRoUGFyc2luZ0Vycm9yLnJlYXNvbnMudW5tYXRjaGVkQ2xvc2luZ1BhcmVudGhlc2VzOlxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIk1pc3Npbmcgb3BlbmluZyBwYXJlbnRoZXNlczogXCIgKyBoaWdobGlnaHRFcnJvbmVvdXNQYXJ0KHBhdGhFeHByZXNzaW9uLCBlLnN0YXJ0SWR4LCBlLmVuZElkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEpQYXRoUGFyc2luZ0Vycm9yLnJlYXNvbnMudW5leHBlY3RlZFRva2VuOlxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIlVuZXhwZWN0ZWQgVG9rZW46IFwiICsgaGlnaGxpZ2h0RXJyb25lb3VzUGFydChwYXRoRXhwcmVzc2lvbiwgZS5zdGFydElkeCwgZS5lbmRJZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zLmludmFsaWRFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkludmFsaWQgZXhwcmVzc2lvbjogXCIgKyBoaWdobGlnaHRFcnJvbmVvdXNQYXJ0KHBhdGhFeHByZXNzaW9uLCBlLnN0YXJ0SWR4LCBlLmVuZElkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEpQYXRoU3ludGF4RXJyb3Ioe1xyXG4gICAgICAgICAgICAgICAgcmVhc29uOiBlLnJlYXNvbixcclxuICAgICAgICAgICAgICAgIHN0YXJ0SWR4OiBlLnN0YXJ0SWR4LFxyXG4gICAgICAgICAgICAgICAgZW5kSWR4OiBlLmVuZElkeCxcclxuICAgICAgICAgICAgICAgIGFjdHVhbDogZS5pbnZhbGlkU2VxdWVuY2UsXHJcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogZS5leHBlY3RlZCxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IGU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIEV2YWx1YXRpb25SZXN1bHQgPSByZXF1aXJlKFwiLi9ldmFsdWF0aW9uX3Jlc3VsdFwiKTtcclxuXHJcbmZ1bmN0aW9uIENvbnN0YW50VmFsdWVFeHByZXNzaW9uKHZhbHVlKSB7XHJcblx0dGhpcy5fdmFsdWUgPSBbbmV3IEV2YWx1YXRpb25SZXN1bHQodmFsdWUpXTtcclxufVxyXG5cclxuQ29uc3RhbnRWYWx1ZUV4cHJlc3Npb24ucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24gKF8pIHtcclxuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IENvbnN0YW50VmFsdWVFeHByZXNzaW9uO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBFdmFsdWF0aW9uUmVzdWx0ID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvbl9yZXN1bHRcIik7XHJcblxyXG5mdW5jdGlvbiBDb250ZXh0KHJvb3QsIGN1cnJlbnQpIHtcclxuXHR0aGlzLl9yb290ID0gcm9vdDtcclxuXHR0aGlzLl9jdXJyZW50ID0gY3VycmVudCA/IGN1cnJlbnQgOiBbbmV3IEV2YWx1YXRpb25SZXN1bHQodGhpcy5fcm9vdCldO1xyXG59XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhDb250ZXh0LnByb3RvdHlwZSwge1xyXG5cdHJvb3Q6IHtcclxuXHRcdGdldDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fcm9vdDtcclxuXHRcdH1cclxuXHR9LFxyXG5cdGN1cnJlbnQ6IHtcclxuXHRcdGdldDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fY3VycmVudDtcclxuXHRcdH1cclxuXHR9XHJcbn0pO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQ29udGV4dDtcclxuXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGV2YWx1YXRlID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvblwiKTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXRoLCBvYmplY3QpIHtcclxuICAgIHZhciBjb3ZlcmFnZU9iamVjdCA9IHt9OyAvL2NyZWF0ZUNvdmVyYWdlT2JqZWN0KG9iamVjdCk7XHJcblxyXG4gICAgdmFyIHJvb3RPYmplY3RNYXRjaGVkID0gZmFsc2U7XHJcbiAgICB2YXIgZGVmaW5lZFJlc3VsdHMgPSBldmFsdWF0ZShwYXRoLCBvYmplY3QpLmRlZmluZWRSZXN1bHRzO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkZWZpbmVkUmVzdWx0cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSAgZGVmaW5lZFJlc3VsdHNbaV07XHJcbiAgICAgICAgaWYgKHJlc3VsdC5pc1Jvb3QpIHtcclxuICAgICAgICAgICAgcm9vdE9iamVjdE1hdGNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgZXZhbHVhdGUocmVzdWx0LnBhdGgsIGNvdmVyYWdlT2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVzdWx0LnZhbHVlID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocm9vdE9iamVjdE1hdGNoZWQpXHJcbiAgICAgICAgcmV0dXJuIHt9O1xyXG5cclxuICAgIHJldHVybiBleHRyYWN0VW5jb3ZlcmVkUGFydHMob2JqZWN0LCBjb3ZlcmFnZU9iamVjdCk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0VW5jb3ZlcmVkUGFydHMob2JqZWN0LCBjb3ZlcmFnZSkge1xyXG4gICAgdmFyIHVuY292ZXJlZCA9IHt9O1xyXG5cclxuICAgIGlmIChvYmplY3QuYnVmZmVyICYmIG9iamVjdC5CWVRFU19QRVJfRUxFTUVOVCkge1xyXG4gICAgICAgIHZhciBjb3ZlcmVkSW5kaWNlc0xlbmd0aCA9IGNvdmVyYWdlLmZpbHRlcihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0pLmxlbmd0aDtcclxuICAgICAgICB1bmNvdmVyZWQgPSBuZXcgb2JqZWN0LmNvbnN0cnVjdG9yKG9iamVjdC5sZW5ndGggLSBjb3ZlcmVkSW5kaWNlc0xlbmd0aCk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGlkeCA9IDAsIHVuY292ZXJlZElkeCA9IDA7IGlkeCA8IG9iamVjdC5sZW5ndGg7ICsraWR4KSB7XHJcbiAgICAgICAgICAgIGlmICghY292ZXJhZ2VbaWR4XSlcclxuICAgICAgICAgICAgICAgIHVuY292ZXJlZFt1bmNvdmVyZWRJZHgrK10gPSBvYmplY3RbaWR4XTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkpXHJcbiAgICAgICAgICAgIHVuY292ZXJlZD0gW107XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKG9iamVjdCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY292ZXJhZ2Vba2V5XSA9PT0gXCJvYmplY3RcIilcclxuICAgICAgICAgICAgICAgIHVuY292ZXJlZFtrZXldID0gZXh0cmFjdFVuY292ZXJlZFBhcnRzKG9iamVjdFtrZXldLCBjb3ZlcmFnZVtrZXldKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAoIWNvdmVyYWdlW2tleV0pXHJcbiAgICAgICAgICAgICAgICB1bmNvdmVyZWRba2V5XSA9IG9iamVjdFtrZXldO1xyXG4gICAgICAgICAgICBpZiAoKHR5cGVvZiB1bmNvdmVyZWRba2V5XSA9PT0gXCJvYmplY3RcIiAmJiBPYmplY3Qua2V5cyh1bmNvdmVyZWRba2V5XSkubGVuZ3RoID09PSAwKSB8fCAoQXJyYXkuaXNBcnJheSh1bmNvdmVyZWRba2V5XSkgJiYgdW5jb3ZlcmVkW2tleV0ubGVuZ3RoID09PSAwKSlcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSB1bmNvdmVyZWRba2V5XTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdW5jb3ZlcmVkO1xyXG59XHJcblxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBFdmFsdWF0aW9uUmVzdWx0ID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvbl9yZXN1bHRcIik7XHJcblxyXG5mdW5jdGlvbiBEZXNjZW50RXhwcmVzc2lvbigpIHt9XHJcblxyXG5EZXNjZW50RXhwcmVzc2lvbi5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbiAoY29udGV4dCkge1xyXG5cdHZhciB4ID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgY29udGV4dC5jdXJyZW50LmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5pc0RlZmluZWQoKTtcclxuICAgIH0pLm1hcChmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHZhciBkZXNjZW5kYW50cyA9IFtdO1xyXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQudmFsdWUpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICAgICAgZGVzY2VuZGFudHMucHVzaChuZXcgRXZhbHVhdGlvblJlc3VsdChyZXN1bHQsIGtleSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGRlc2NlbmRhbnRzO1xyXG5cdH0pKTtcclxuICAgIHJldHVybiB4O1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gRGVzY2VudEV4cHJlc3Npb247XHJcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyAjIEpQYXRoRXJyb3JcclxuXHJcbi8vIEpQYXRoRXJyb3IgcmVwcmVzZW50cyB0aGUgYmFzZSBjbGFzcyBvZiB0aGUgZXJyb3IgaGllcmFyY2h5LlxyXG4vLyBJdCB0YWtlcyBhIHByaW50YWJsZSBtZXNzYWdlIGFuZCBhIGNvbnN0cnVjdG9yIHRvIGJ1aWxkIGEgc3RhY2sgdHJhY2UuXHJcbi8vIEl0IGluaGVyaXRzIGZyb20gbm9kZSdzIGdlbmVyaWMgRXJyb3IgY2xhc3MgdG8gYWxsb3cgZm9yIGNhdGNoIGFsbCBoYW5kbGVycy5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgSlBhdGhFcnJvci5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEB0eXBlIEpQYXRoRXJyb3JcclxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgQ3VzdG9tIGVycm9yIG1lc3NhZ2UgZm9yIGxvZ2dpbmcuXHJcbiAqL1xyXG5mdW5jdGlvbiBKUGF0aEVycm9yKG1lc3NhZ2UpIHtcclxuICAgIEVycm9yLmNhbGwodGhpcyk7XHJcbiAgICBpZiAoIXByb2Nlc3MuYnJvd3NlcilcclxuICAgICAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcclxuICAgIC8vIElmIG5vIGN1c3RvbSBlcnJvciBtZXNzYWdlIHdhcyBkZWZpbmVkIHVzZSBhIGdlbmVyaWMgb25lLlxyXG4gICAgdGhpcy5tZXNzYWdlID0gKG1lc3NhZ2UgJiYgbWVzc2FnZS50b1N0cmluZygpKSB8fCBcIkpQYXRoIEVycm9yXCI7XHJcbn1cclxuXHJcbi8vIEluaGVyaXQgdGhlIGRlZmF1bHQgRXJyb3IgcHJvdG90eXBlLlxyXG51dGlsLmluaGVyaXRzKEpQYXRoRXJyb3IsIEVycm9yKTtcclxuXHJcbi8vIFNldCBhIG5hbWUgZm9yIHRoZSBlcnJvci5cclxuSlBhdGhFcnJvci5wcm90b3R5cGUubmFtZSA9IFwiSlBhdGggRXJyb3JcIjtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEpQYXRoRXJyb3I7XHJcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIrTnNjTm1cIikpIiwiLy8gIyBQcm9wZXJ0eSBuYW1lIGVzY2FwaW5nXHJcblxyXG4vLyBJbiBhIEpQYXRoIHRoZSBjaGFyYWN0ZXJzIGAvLCBbLCBdLCA6LCAqYCBoYXZlIHNwZWNpYWwgbWVhbmluZ3MsIGJ1dCBhcmUgdmFsaWQgSlNPTiBwcm9wZXJ0eSBuYW1lcy5cclxuLy8gSWYgb25lIHdhbnRzIHRvIGFjY2VzcyBhIHByb3BlcnR5IHRoYXQgY29udGFpbnMgc3VjaCBhIGNoYXJhY3RlciB0aGV5IGhhdmUgdG8gYmUgZXNjYXBlZC5cclxuLy8gRXNjYXBlIHNlcXVlbmNlcyBzdGFydCB3aXRoIGEgdGlsZGUsIGB+YCBmb2xsb3dlZCBieSBhIG51bWJlciBpbiB0aGUgcmFuZ2UgWzEsIDVdLlxyXG4vLyBUaGUgc2luZ2xlIHRpbGRlIGNoYXJhY3RlciBpcyBlc2NhcGVkIGFzIGEgZG91YmxlIHRpbGRlLlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgSlBhdGhJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvciA9IHJlcXVpcmUoXCIuL2ludmFsaWRfZXNjYXBlX3NlcXVlbmNlX2Vycm9yXCIpO1xyXG52YXIgc2VwYXJhdG9yVG9rZW5NYXBwaW5nID0gcmVxdWlyZShcIi4vc2VwYXJhdG9yX3Rva2VuX21hcHBpbmdcIik7XHJcblxyXG52YXIgZXNjYXBlUHJlZml4ID0gXCJ+XCI7XHJcbnZhciBjaGFyYWN0ZXJFc2NhcGVTZXF1ZW5jZU1hcCA9IHt9O1xyXG52YXIgZXNjYXBlU2VxdWVuY2VDaGFyYWN0ZXJNYXAgPSB7fTtcclxuT2JqZWN0LmtleXMoc2VwYXJhdG9yVG9rZW5NYXBwaW5nKS5mb3JFYWNoKGZ1bmN0aW9uIChjaGFyYWN0ZXIpIHtcclxuXHRjaGFyYWN0ZXJFc2NhcGVTZXF1ZW5jZU1hcFtjaGFyYWN0ZXJdID0gZXNjYXBlUHJlZml4ICsgc2VwYXJhdG9yVG9rZW5NYXBwaW5nW2NoYXJhY3Rlcl07XHJcblx0ZXNjYXBlU2VxdWVuY2VDaGFyYWN0ZXJNYXBbZXNjYXBlUHJlZml4ICsgc2VwYXJhdG9yVG9rZW5NYXBwaW5nW2NoYXJhY3Rlcl1dID0gY2hhcmFjdGVyO1xyXG59KTtcclxuXHJcblxyXG4vKipcclxuICogRXNjYXBlcyB0aGUgZ2l2ZW4gcHJvcGVydHkgbmFtZS5cclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5TmFtZSBUaGUgcHJvcGVydHkgbmFtZSB0byBlc2NhcGUuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBlc2NhcGVkIHByb3BlcnR5IG5hbWUuXHJcbiAqL1xyXG5mdW5jdGlvbiBlc2NhcGVQcm9wZXJ0eU5hbWUocHJvcGVydHlOYW1lKSB7XHJcbiAgICAvLyBXZSBpdGVyYXRlIG92ZXIgdGhlIGVzY2FwZSBzZXF1ZW5jZSB0YWJsZSBhbmQgcmVwbGFjZSBldmVyeSByZXNlcnZlZCBjaGFyYWN0ZXIgYnkgaXRzIGVzY2FwZSBzZXF1ZW5jZS5cclxuICAgIC8vIEl0IGlzIGltcG9ydGFudCB0aGF0IGEgdGlsZGUgaXMgZXNjYXBlZCBmaXJzdCFcclxuICAgIC8vIFwifltcIiBzaG91bGQgYmUgbWFwcGVkIHRvIFwifn5+MlwiLlxyXG4gICAgLy8gSWYgd2Ugd291bGQgZGVjb2RlIFwifiB+XCIgbGFzdCwgdGhpcyB3b3VsZCBiZSBkZWNvZGVkIGludG8gXCJ+fjJcIiB0aGVuIGludG8gXCJ+fn5+MlwiLFxyXG4gICAgLy8gYmVjYXVzZSBvZiB0aGUgZ2xvYmFsIHJlZ2V4IGJhc2VkIHJlcGxhY2UuXHJcbiAgICAvLyBXZSBoYXZlIHRvIHdyYXAgdGhlIHJlc2VydmVkQ2hhcmFjdGVyIGludG8gYnJhY2tldHMgdG8gZXNjYXBlIG5vbiB2YWxpZCByZWd1bGFyIGV4cHJlc3Npb24gY2hhcmFjdGVycy5cclxuICAgIC8vIFdlIGFsc28gaGF2ZSB1c2UgYSBkb3VibGUgYmFja3NsYXNoIGJlY2F1c2Ugb2YgdGhlIGBdYCBjaGFyYWN0ZXIuXHJcblx0dmFyIGVzY2FwZWRQcm9wZXJ0eU5hbWUgPSBwcm9wZXJ0eU5hbWUucmVwbGFjZShuZXcgUmVnRXhwKGVzY2FwZVByZWZpeCwgXCJnXCIpLCBlc2NhcGVQcmVmaXggKyBlc2NhcGVQcmVmaXgpO1xyXG5cdHJldHVybiBPYmplY3Qua2V5cyhjaGFyYWN0ZXJFc2NhcGVTZXF1ZW5jZU1hcCkucmVkdWNlKGZ1bmN0aW9uIChwcm9wZXJ0eU5hbWUsIGNoYXJhY3Rlcikge1xyXG5cdFx0cmV0dXJuIHByb3BlcnR5TmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoXCJbXFxcXFwiICsgY2hhcmFjdGVyICsgXCJdXCIsIFwiZ1wiKSwgY2hhcmFjdGVyRXNjYXBlU2VxdWVuY2VNYXBbY2hhcmFjdGVyXSk7XHJcblx0fSwgZXNjYXBlZFByb3BlcnR5TmFtZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVbmVzY2FwZXMgYSBnaXZlbiBwcm9wZXJ0eSBuYW1lLlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqIEBmdW5jdGlvbiB1bmVzY2FwZVByb3BlcnR5TmFtZVxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZXNjYXBlZFByb3BlcnR5TmFtZSBUaGUgcHJvcGVydHkgbmFtZSB0byB1bmVzY2FwZS5cclxuICogQHJldHVybnMge3N0cmluZ30gVGhlIHVuZXNjYXBlZCBwcm9wZXJ0eSBuYW1lLlxyXG4gKiBAdGhyb3dzIHtKUGF0aEludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yfSBpZiBlc2NhcGVkUHJvcGVydHlOYW1lIGNvbnRhaW5zIGFuIGludmFsaWQgZXNjYXBlIHNlcXVlbmNlLFxyXG4gKiBlLmcuIGEgdGlsZGUgZm9sbG93ZWQgYnkgYSBudW1iZXIgbm90IGluIHRoZSB2YWxpZCByYW5nZSBbMSwgNV0uXHJcbiAqL1xyXG5mdW5jdGlvbiB1bmVzY2FwZVByb3BlcnR5TmFtZShlc2NhcGVkUHJvcGVydHlOYW1lKSB7XHJcbiAgICAvLyBXZSBpdGVyYXRlIG92ZXIgdGhlIGVzY2FwZWRQcm9wZXJ0eU5hbWUgY2hhcmFjdGVyIGJ5IGNoYXJhY3RlciBhbmQgbWFwIGV2ZXJ5IGVzY2FwZSBzZXF1ZW5jZSBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIHZhbHVlLlxyXG4gICAgdmFyIHVuZXNjYXBlZENoYXJhY3RlcnMgPSBbXTtcclxuICAgIHZhciBkZWNvZGVkQ2hhciA9XCJcIjtcclxuICAgIHZhciBpZHggPSAwO1xyXG5cdHZhciBlc2NhcGVTZXF1ZW5jZXMgPSBPYmplY3Qua2V5cyhlc2NhcGVTZXF1ZW5jZUNoYXJhY3Rlck1hcCk7XHJcbiAgICB3aGlsZSAoaWR4IDwgZXNjYXBlZFByb3BlcnR5TmFtZS5sZW5ndGgpIHtcclxuICAgICAgICB2YXIgY3VycmVudENoYXIgPSBlc2NhcGVkUHJvcGVydHlOYW1lW2lkeF07XHJcbiAgICAgICAgaWYgKGN1cnJlbnRDaGFyID09PSBlc2NhcGVQcmVmaXgpIHtcclxuICAgICAgICAgICAgdmFyIG5leHRDaGFyID0gZXNjYXBlZFByb3BlcnR5TmFtZVtpZHggKyAxXTtcclxuXHJcbiAgICAgICAgICAgIC8vIEEgc2luZ2xlIGB+YCBvciBhIGB+YCBmb2xsb3dlZCBieSBhIG51bWJlciBncmVhdGVyIG91dHNpZGUgdGhlIGludGVydmFsIFsxLCBPYmplY3Qua2V5cyhjaGFyYWN0ZXJFc2NhcGVTZXF1ZW5jZU1hcCkubGVuZ3RoXVxyXG4gICAgICAgICAgICAvLyBjYW4gbmV2ZXIgb2NjdXIgaW4gYSB3ZWxsIGVzY2FwZWQgcHJvcGVydHkgbmFtZS5cclxuICAgICAgICAgICAgdmFyIG4gPSBwYXJzZUludChuZXh0Q2hhciwgMTApO1xyXG4gICAgICAgICAgICBpZiAobmV4dENoYXIgIT09IGVzY2FwZVByZWZpeCAmJiAoaXNOYU4obikgfHwgIWlzRmluaXRlKG4pIHx8IG4gPCAwIHx8IG4gPiBlc2NhcGVTZXF1ZW5jZXMubGVuZ3RoKSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBKUGF0aEludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yKGVzY2FwZVByZWZpeCArIG5leHRDaGFyLCBlc2NhcGVTZXF1ZW5jZXMpO1xyXG5cclxuXHRcdFx0aWYgKG5leHRDaGFyID09PSBlc2NhcGVQcmVmaXgpXHJcblx0XHRcdFx0ZGVjb2RlZENoYXIgPSBlc2NhcGVQcmVmaXg7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRkZWNvZGVkQ2hhciA9IGVzY2FwZVNlcXVlbmNlQ2hhcmFjdGVyTWFwW2VzY2FwZVByZWZpeCArIG5leHRDaGFyXTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNraXAgYnkgdHdvIHRvIG5vdCBkZWNvZGUgfn4xIGludG8gfi8uXHJcbiAgICAgICAgICAgIGlkeCArPSAyO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRlY29kZWRDaGFyID0gY3VycmVudENoYXI7XHJcbiAgICAgICAgICAgICsraWR4O1xyXG4gICAgICAgIH1cclxuICAgICAgICB1bmVzY2FwZWRDaGFyYWN0ZXJzLnB1c2goZGVjb2RlZENoYXIpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB1bmVzY2FwZWRDaGFyYWN0ZXJzLmpvaW4oXCJcIik7XHJcbn1cclxuXHJcbmV4cG9ydHMuZXNjYXBlUHJvcGVydHlOYW1lID0gZXNjYXBlUHJvcGVydHlOYW1lO1xyXG5leHBvcnRzLnVuZXNjYXBlUHJvcGVydHlOYW1lID0gdW5lc2NhcGVQcm9wZXJ0eU5hbWU7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGNvbXBpbGUgPSByZXF1aXJlKFwiLi9jb21waWxpbmdcIik7XHJcbnZhciBDb250ZXh0ID0gcmVxdWlyZShcIi4vY29udGV4dFwiKTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXRoLCBvYmplY3QpIHtcclxuXHR2YXIgcGF0aEV4cHJlc3Npb24gPSBjb21waWxlKHBhdGgpO1xyXG4gICAgcmV0dXJuIGF1Z21lbnRBcnJheShwYXRoRXhwcmVzc2lvbi5ldmFsdWF0ZShuZXcgQ29udGV4dChvYmplY3QpKSk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBhdWdtZW50QXJyYXkoYXJyYXkpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGFycmF5LCB7XHJcbiAgICAgICAgZGVmaW5lZFJlc3VsdHM6IHtcclxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQuaXNEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdmFsdWVzOiB7XHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVmaW5lZFJlc3VsdHMubWFwKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHBhdGhzOiB7XHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVmaW5lZFJlc3VsdHMubWFwKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnBhdGg7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGFycmF5O1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGpvaW4gPSByZXF1aXJlKFwiLi9qb2luaW5nXCIpO1xyXG5cclxuZnVuY3Rpb24gRXZhbHVhdGlvblJlc3VsdChwYXJlbnQsIHByb3BlcnR5TmFtZSwgaXNBcnJheUFjY2Vzcykge1xyXG4gICAgaWYgKCEocGFyZW50IGluc3RhbmNlb2YgRXZhbHVhdGlvblJlc3VsdCkpIHtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJ2YWx1ZVwiLCB7XHJcbiAgICAgICAgICAgIHZhbHVlOiBwYXJlbnQsXHJcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiaXNSb290XCIsIHtcclxuICAgICAgICAgICAgdmFsdWU6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLl9wYXJlbnQgPSBudWxsO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB9XHJcblxyXG5cdHRoaXMuX3Byb3BlcnR5TmFtZSA9IHR5cGVvZiBwcm9wZXJ0eU5hbWUgIT09IFwidW5kZWZpbmVkXCIgPyBwcm9wZXJ0eU5hbWUgOiBcIlwiO1xyXG4gICAgdGhpcy5faXNBcnJheUFjY2VzcyA9IGlzQXJyYXlBY2Nlc3M7XHJcbn1cclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEV2YWx1YXRpb25SZXN1bHQucHJvdG90eXBlLCB7XHJcblx0dmFsdWU6IHtcclxuXHRcdGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX3BhcmVudC52YWx1ZSAhPT0gXCJ1bmRlZmluZWRcIilcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQudmFsdWVbdGhpcy5fcHJvcGVydHlOYW1lXTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdH0sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX3BhcmVudC52YWx1ZSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX3BhcmVudC52YWx1ZSA9IHRoaXMuX2lzQXJyYXlBY2Nlc3MgPyBbXSA6IHt9O1xyXG5cdFx0XHR0aGlzLl9wYXJlbnQudmFsdWVbdGhpcy5fcHJvcGVydHlOYW1lXSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cdH0sXHJcbiAgICBwYXRoOiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX3BhcmVudClcclxuICAgICAgICAgICAgICAgIHJldHVybiBqb2luKHRoaXMuX3BhcmVudC5wYXRoLCB0aGlzLl9wcm9wZXJ0eU5hbWUsIHRoaXMuX2lzQXJyYXlBY2Nlc3MpO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJvcGVydHlOYW1lO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG5FdmFsdWF0aW9uUmVzdWx0LnByb3RvdHlwZS5pc0RlZmluZWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIHR5cGVvZiB0aGlzLnZhbHVlICE9PSBcInVuZGVmaW5lZFwiO1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gRXZhbHVhdGlvblJlc3VsdDtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgZXNjYXBpbmcgPSByZXF1aXJlKFwiLi9lc2NhcGluZ1wiKTtcclxuZXhwb3J0cy5lc2NhcGVQcm9wZXJ0eU5hbWUgPSBlc2NhcGluZy5lc2NhcGVQcm9wZXJ0eU5hbWU7XHJcbmV4cG9ydHMudW5lc2NhcGVQcm9wZXJ0eU5hbWUgPSBlc2NhcGluZy51bmVzY2FwZVByb3BlcnR5TmFtZTtcclxuZXhwb3J0cy5JbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvciA9IHJlcXVpcmUoXCIuL2ludmFsaWRfZXNjYXBlX3NlcXVlbmNlX2Vycm9yXCIpO1xyXG5leHBvcnRzLnNlcGFydG9yVG9rZW5NYXBwaW5nID0gcmVxdWlyZShcIi4vc2VwYXJhdG9yX3Rva2VuX21hcHBpbmdcIik7XHJcblxyXG5leHBvcnRzLlRva2VuID0gcmVxdWlyZShcIi4vdG9rZW5cIik7XHJcbmV4cG9ydHMudG9rZW5pemUgPSByZXF1aXJlKFwiLi9sZXhpbmdcIik7XHJcbmV4cG9ydHMuam9pbiA9IHJlcXVpcmUoXCIuL2pvaW5pbmdcIik7XHJcblxyXG5leHBvcnRzLnBhcnNlID0gcmVxdWlyZShcIi4vcGFyc2luZ1wiKTtcclxuZXhwb3J0cy5QYXJzaW5nRXJyb3IgPSByZXF1aXJlKFwiLi9wYXJzaW5nX2Vycm9yXCIpO1xyXG5cclxuZXhwb3J0cy5Db25zdGFudFZhbHVlRXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL2NvbnN0YW50X3ZhbHVlX2V4cHJlc3Npb25cIik7XHJcbmV4cG9ydHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID0gcmVxdWlyZShcIi4vcHJvcGVydHlfYWNjZXNzX2V4cHJlc3Npb25cIik7XHJcbmV4cG9ydHMuUmFuZ2VFeHByZXNzaW9uID0gcmVxdWlyZShcIi4vcmFuZ2VfZXhwcmVzc2lvblwiKTtcclxuZXhwb3J0cy5EZXNjZW50RXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL2Rlc2NlbnRfZXhwcmVzc2lvblwiKTtcclxuZXhwb3J0cy5SZWN1cnNpdmVEZXNjZW50RXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL3JlY3Vyc2l2ZV9kZXNjZW50X2V4cHJlc3Npb25cIik7XHJcbmV4cG9ydHMuUGF0aEV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9wYXRoX2V4cHJlc3Npb25cIik7XHJcblxyXG5leHBvcnRzLmV2YWx1YXRlID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvblwiKTtcclxuXHJcbmV4cG9ydHMuZXh0cmFjdFVuY292ZXJlZFBhcnRzID0gcmVxdWlyZShcIi4vY292ZXJhZ2VcIik7XHJcbiIsIi8vICMgSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3JcclxuXHJcbi8vIFRoaXMgY2xhc3MgaXMgb25seSB1c2VkIGludGVybmFsbHkuXHJcbi8vIEl0IGlzIHRoZSBlcnJvciB0aGF0IGlzIHRocm93biBieSB0aGUgYHVuZXNjYXBlYCBmdW5jdGlvbiwgaWYgYW4gaW52YWxpZCBlc2NhcGUgc2VxdWVuY2UgaXMgZm91bmQuXHJcbi8vIEl0IHNob3VsZCBiZSBjYXRjaGVkIGFuIHJldGhyb3duIGFzIGEgc3ludGF4IGVycm9ycyB0byBjYXJyeSBtb3JlIGluZm9ybWF0aW9uLlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xyXG5cclxudmFyIEpQYXRoRXJyb3IgPSByZXF1aXJlKFwiLi9lcnJvclwiKTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGFuIEludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaW52YWxpZFNlcXVlbmNlIFRoZSBzZXF1ZW5jZSB0aGF0IGlzIGludmFsaWRcclxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0SWR4IFRoZSBzdGFydCBpbmRleCBvZiB0aGUgaW52YWxpZCBzZXF1ZW5jZSBpbnNpZGUgdGhlIHN0cmluZy5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvcihpbnZhbGlkU2VxdWVuY2UsIGV4cGVjdGVkKSB7XHJcbiAgICBKUGF0aEVycm9yLmNhbGwodGhpcywgXCJJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZSBmb3VuZDogXCIgKyBpbnZhbGlkU2VxdWVuY2UpO1xyXG4gICAgdGhpcy5pbnZhbGlkU2VxdWVuY2UgPSBpbnZhbGlkU2VxdWVuY2U7XHJcbiAgICB0aGlzLmV4cGVjdGVkID0gZXhwZWN0ZWQ7XHJcbn1cclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yO1xyXG5cclxudXRpbC5pbmhlcml0cyhJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvciwgSlBhdGhFcnJvcik7XHJcblxyXG5JbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvci5wcm90b3R5cGUubmFtZSA9IFwiSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3JcIjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGQsIGlzQXJyYXlJbmRleCkge1xyXG4gICAgaWYgKGlzQXJyYXlJbmRleClcclxuICAgICAgICBjaGlsZCA9IFwiW1wiICsgY2hpbGQgKyBcIl1cIjtcclxuXHJcbiAgICByZXR1cm4gcGF0aC5qb2luKHBhcmVudCwgY2hpbGQpO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciB1bmVzY2FwZVByb3BlcnR5TmFtZSA9IHJlcXVpcmUoXCIuL2VzY2FwaW5nXCIpLnVuZXNjYXBlUHJvcGVydHlOYW1lO1xyXG52YXIgSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3IgPSByZXF1aXJlKFwiLi9pbnZhbGlkX2VzY2FwZV9zZXF1ZW5jZV9lcnJvclwiKTtcclxudmFyIEpQYXRoU3ludGF4RXJyb3IgPSByZXF1aXJlKFwiLi9zeW50YXhfZXJyb3JcIik7XHJcbnZhciBUb2tlbiA9IHJlcXVpcmUoXCIuL3Rva2VuXCIpO1xyXG52YXIgc2VwYXJhdG9yVG9rZW5NYXBwaW5nID0gcmVxdWlyZShcIi4vc2VwYXJhdG9yX3Rva2VuX21hcHBpbmdcIik7XHJcblxyXG4vLyBUb2tlbml6ZXMgdGhlIGdpdmVuIHBhdGhFeHByZXNzaW9uIHJldHVybmluZyBhbiBhcnJheSBvZiB0b2tlbnMgcmVwcmVzZW50aW5nIHRoZSB0b2tlbiBzdHJlYW0uXHJcbmZ1bmN0aW9uIHRva2VuaXplKHBhdGhFeHByZXNzaW9uKSB7XHJcbiAgICBpZiAocGF0aEV4cHJlc3Npb24ubGVuZ3RoID09PSAwKVxyXG4gICAgICAgIHBhdGhFeHByZXNzaW9uID0gXCIvXCI7XHJcblxyXG4gICAgdmFyIHRva2VuU3RyZWFtID0gW107XHJcbiAgICB2YXIgY3VycmVudENoYXJJZHggPSAwO1xyXG4gICAgd2hpbGUgKGN1cnJlbnRDaGFySWR4IDwgcGF0aEV4cHJlc3Npb24ubGVuZ3RoKXtcclxuICAgICAgICB2YXIgY3VycmVudENoYXIgPSBwYXRoRXhwcmVzc2lvbltjdXJyZW50Q2hhcklkeF07XHJcblx0XHRpZiAoaXNUb2tlblNlcGFyYXRpb25DaGFyYWN0ZXIoY3VycmVudENoYXIpKSB7XHJcblx0XHRcdHRva2VuU3RyZWFtLnB1c2gobmV3IFRva2VuKHRva2VuRm9yU2VwYXJhdGlvbkNoYXJhY3RlcihjdXJyZW50Q2hhciksIGN1cnJlbnRDaGFySWR4LCBjdXJyZW50Q2hhcklkeCArIDEsIGN1cnJlbnRDaGFyKSk7XHJcblx0XHRcdCsrY3VycmVudENoYXJJZHg7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBsaXRlcmFsXHJcblx0XHRcdC8vIFJlYWQgJ3RpbGwgZmlyc3Qgc3BlY2lhbCBjaGFyYWN0ZXJcclxuXHRcdFx0dmFyIGxpdGVyYWwgPSBcIlwiO1xyXG5cdFx0XHR2YXIgbGl0ZXJhbFN0YXJ0SWR4ID0gY3VycmVudENoYXJJZHg7XHJcblx0XHRcdGRvIHtcclxuXHRcdFx0XHRsaXRlcmFsICs9IGN1cnJlbnRDaGFyO1xyXG5cdFx0XHRcdCsrY3VycmVudENoYXJJZHg7XHJcblx0XHRcdFx0Y3VycmVudENoYXIgPSBwYXRoRXhwcmVzc2lvbltjdXJyZW50Q2hhcklkeF07XHJcblx0XHRcdH0gd2hpbGUgKGN1cnJlbnRDaGFySWR4IDwgcGF0aEV4cHJlc3Npb24ubGVuZ3RoICYmICFpc1Rva2VuU2VwYXJhdGlvbkNoYXJhY3RlcihjdXJyZW50Q2hhcikpO1xyXG5cclxuXHRcdFx0dG9rZW5TdHJlYW0ucHVzaChuZXcgVG9rZW4oVG9rZW4udHlwZXMubGl0ZXJhbCwgbGl0ZXJhbFN0YXJ0SWR4LCBjdXJyZW50Q2hhcklkeCwgdW5lc2NhcGVQcm9wZXJ0eU5hbWUobGl0ZXJhbCkpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdG9rZW5TdHJlYW0ucHVzaChuZXcgVG9rZW4oVG9rZW4udHlwZXMuZW90LCBjdXJyZW50Q2hhcklkeCwgY3VycmVudENoYXJJZHgpKTtcclxuICAgIHJldHVybiB0b2tlblN0cmVhbTtcclxufVxyXG5cclxudmFyIHRva2VuU2VwYXJhdGlvbkNoYXJhY3RlcnMgPSBPYmplY3Qua2V5cyhzZXBhcmF0b3JUb2tlbk1hcHBpbmcpO1xyXG5cclxuZnVuY3Rpb24gaXNUb2tlblNlcGFyYXRpb25DaGFyYWN0ZXIoY2hhcikge1xyXG5cdHJldHVybiB0b2tlblNlcGFyYXRpb25DaGFyYWN0ZXJzLmluZGV4T2YoY2hhcikgIT09IC0xO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0b2tlbkZvclNlcGFyYXRpb25DaGFyYWN0ZXIoY2hhcikge1xyXG5cdHJldHVybiBzZXBhcmF0b3JUb2tlbk1hcHBpbmdbY2hhcl07XHJcbn1cclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHRva2VuaXplO1xyXG4iLCIvLyAjIFBhcnNpbmdcclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIFRva2VuID0gcmVxdWlyZShcIi4vdG9rZW5cIik7XHJcbnZhciBKUGF0aFBhcnNpbmdFcnJvciA9IHJlcXVpcmUoXCIuL3BhcnNpbmdfZXJyb3JcIik7XHJcblxyXG52YXIgQ29uc3RhbnRWYWx1ZUV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9jb25zdGFudF92YWx1ZV9leHByZXNzaW9uXCIpO1xyXG52YXIgUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID0gcmVxdWlyZShcIi4vcHJvcGVydHlfYWNjZXNzX2V4cHJlc3Npb25cIik7XHJcbnZhciBQYXRoRXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL3BhdGhfZXhwcmVzc2lvblwiKTtcclxudmFyIFJhbmdlRXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL3JhbmdlX2V4cHJlc3Npb25cIik7XHJcbnZhciBEZXNjZW50RXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL2Rlc2NlbnRfZXhwcmVzc2lvblwiKTtcclxudmFyIFJlY3Vyc2l2ZURlc2NlbnRFeHByZXNzaW9uID0gcmVxdWlyZShcIi4vcmVjdXJzaXZlX2Rlc2NlbnRfZXhwcmVzc2lvblwiKTtcclxuXHJcbi8qKlxyXG4gKiBQYXJzZXMgdGhlIGdpdmVuIHRva2VuIHN0cmVhbS5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gcGFyc2VcclxuICpcclxuICogQHBhcmFtIHtUb2tlbltdfSB0b2tlblN0cmVhbSBUaGUgdG9rZW4gc3RyZWFtIHRoYXQgc2hvdWxkIGJlIHBhcnNlZC5cclxuICogQHJldHVybnMge1BhdGhFeHByZXNzaW9ufSBUaGUgcGFyc2VkIHBhdGggZXhwcmVzc2lvbi5cclxuICogQHRocm93cyB7SlBhdGhTeW50YXhFcnJvcn0gaWYgdGhlIGdpdmVuIHRva2VuIHN0cmVhbSBjb250YWlucyBhbnkgc3ludGFjdGljYWwgZXJyb3JzLlxyXG4gKi9cclxuZnVuY3Rpb24gcGFyc2UodG9rZW5TdHJlYW0pIHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkodG9rZW5TdHJlYW0sIFwiZnJvbnRcIiwge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB0aGlzWzBdO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG4gICAgdmFyIGV4cHJlc3Npb24gPSBwYXJzZVBhdGhFeHByZXNzaW9uKHRva2VuU3RyZWFtKTtcclxuXHJcbiAgICBpZiAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSAhPT0gVG9rZW4udHlwZXMuZW90KVxyXG4gICAgICAgIHRocm93IG5ldyBKUGF0aFBhcnNpbmdFcnJvcihKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zLnVuZXhwZWN0ZWRUb2tlbixcclxuICAgICAgICAgICAgdG9rZW5TdHJlYW0uZnJvbnQuc3RhcnRJZHgsXHJcbiAgICAgICAgICAgIHRva2VuU3RyZWFtLmZyb250LmVuZElkeCxcclxuICAgICAgICAgICAgVG9rZW4udHlwZXMuZW90KTtcclxuXHJcbiAgICByZXR1cm4gZXhwcmVzc2lvbjtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VQYXRoRXhwcmVzc2lvbih0b2tlblN0cmVhbSkge1xyXG5cdHZhciBleHByZXNzaW9ucyA9IFtdO1xyXG5cdHZhciBpc0Fic29sdXRlUGF0aCA9IGZhbHNlO1xyXG5cclxuXHQvLyBJZiB3ZSBoYXZlIGEgc2VwYXJhdG9yIHRoaXMgaXMgYSBhYnNvbHV0ZSBwYXRoIGV4cHJlc3Npb24uXHJcblx0aWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgPT09IFRva2VuLnR5cGVzLnNlcGFyYXRvcikge1xyXG5cdFx0aXNBYnNvbHV0ZVBhdGggPSB0cnVlO1xyXG5cdFx0dG9rZW5TdHJlYW0uc2hpZnQoKTtcclxuXHR9XHJcblxyXG5cdGRvIHtcclxuXHRcdC8vIENvbnN1bWUgc3VwZXJmbHVvdXMgc2VwYXJhdG9yIHRva2Vucy5cclxuXHRcdHdoaWxlICh0b2tlblN0cmVhbS5mcm9udC50eXBlID09PSBUb2tlbi50eXBlcy5zZXBhcmF0b3IpXHJcblx0XHRcdHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblxyXG5cdFx0aWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgPT09IFRva2VuLnR5cGVzLmVvdClcclxuXHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0Ly8gUGFyc2UgcGF0aCBjb21wb25lbnRzIGFzIGxvbmcgYXMgdGhlIG5leHQgdG9rZW4gYWZ0ZXJ3YXJkcyBpcyBhIHNlcGFyYXRvci5cclxuXHRcdGV4cHJlc3Npb25zLnB1c2gocGFyc2VQYXRoQ29tcG9uZW50KHRva2VuU3RyZWFtKSk7XHJcblx0fSB3aGlsZSAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSA9PT0gVG9rZW4udHlwZXMuc2VwYXJhdG9yKTtcclxuXHJcblx0cmV0dXJuIG5ldyBQYXRoRXhwcmVzc2lvbihleHByZXNzaW9ucywgaXNBYnNvbHV0ZVBhdGgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZVBhdGhDb21wb25lbnQodG9rZW5TdHJlYW0pIHtcclxuXHRpZiAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSA9PT0gVG9rZW4udHlwZXMuYXN0ZXJpc2spXHJcblx0XHRyZXR1cm4gcGFyc2VEZXNjZW50RXhwcmVzc2lvbih0b2tlblN0cmVhbSk7XHJcblxyXG5cdGlmICh0b2tlblN0cmVhbS5mcm9udC50eXBlID09PSBUb2tlbi50eXBlcy5vcGVuQnJhY2tldClcclxuXHRcdHJldHVybiBwYXJzZUFycmF5QWNjZXNzRXhwcmVzc2lvbih0b2tlblN0cmVhbSk7XHJcblxyXG5cdHJldHVybiBuZXcgUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHBhcnNlUHJvcGVydHlOYW1lRXhwcmVzc2lvbih0b2tlblN0cmVhbSkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZURlc2NlbnRFeHByZXNzaW9uKHRva2VuU3RyZWFtKSB7XHJcblx0dG9rZW5TdHJlYW0uc2hpZnQoKTtcclxuXHRpZiAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSAhPT0gVG9rZW4udHlwZXMuYXN0ZXJpc2spXHJcblx0XHRyZXR1cm4gbmV3IERlc2NlbnRFeHByZXNzaW9uKCk7XHJcblxyXG5cdHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblx0cmV0dXJuIG5ldyBSZWN1cnNpdmVEZXNjZW50RXhwcmVzc2lvbigpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZVByb3BlcnR5TmFtZUV4cHJlc3Npb24odG9rZW5TdHJlYW0pIHtcclxuXHR2YXIgbGVmdCA9IHBhcnNlTmFtZUV4cHJlc3Npb24odG9rZW5TdHJlYW0pO1xyXG5cdGlmICh0b2tlblN0cmVhbS5mcm9udC50eXBlID09PSBUb2tlbi50eXBlcy5jb2xvbilcclxuXHRcdHJldHVybiBwYXJzZVJhbmdlRXhwcmVzc2lvbihsZWZ0LCB0b2tlblN0cmVhbSk7XHJcblxyXG5cdHJldHVybiBsZWZ0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZU5hbWVFeHByZXNzaW9uKHRva2VuU3RyZWFtKSB7XHJcblx0aWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgPT09IFRva2VuLnR5cGVzLmxpdGVyYWwpXHJcblx0XHRyZXR1cm4gcGFyc2VMaXRlcmFsKHRva2VuU3RyZWFtKTtcclxuXHRlbHNlIGlmICh0b2tlblN0cmVhbS5mcm9udC50eXBlID09PSBUb2tlbi50eXBlcy5vcGVuUGFyZW50aGVzZXMpXHJcblx0XHRyZXR1cm4gcGFyc2VTdWJFeHByZXNzaW9uKHRva2VuU3RyZWFtKTtcclxuXHRlbHNlXHJcblx0XHR0aHJvdyBuZXcgSlBhdGhQYXJzaW5nRXJyb3IoSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy51bmV4cGVjdGVkVG9rZW4sXHJcblx0XHRcdHRva2VuU3RyZWFtLmZyb250LnN0YXJ0SWR4LFxyXG5cdFx0XHR0b2tlblN0cmVhbS5mcm9udC5lbmRJZHgsXHJcblx0XHRcdFtUb2tlbi50eXBlcy5saXRlcmFsLCBUb2tlbi50eXBlcy5vcGVuUGFyZW50aGVzZXNdKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VMaXRlcmFsKHRva2VuU3RyZWFtKSB7XHJcblx0cmV0dXJuIG5ldyBDb25zdGFudFZhbHVlRXhwcmVzc2lvbih0b2tlblN0cmVhbS5zaGlmdCgpLnZhbHVlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VTdWJFeHByZXNzaW9uKHRva2VuU3RyZWFtKSB7XHJcblx0dmFyIG9wZW5QYXJlbnRoZXNlc1Rva2VuID0gdG9rZW5TdHJlYW0uc2hpZnQoKTtcclxuXHJcbiAgICB2YXIgZXhwcmVzc2lvbiA9IHBhcnNlUGF0aEV4cHJlc3Npb24odG9rZW5TdHJlYW0pO1xyXG5cclxuXHRpZiAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSAhPT0gVG9rZW4udHlwZXMuY2xvc2VQYXJlbnRoZXNlcylcclxuXHRcdHRocm93IG5ldyBKUGF0aFBhcnNpbmdFcnJvcihKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zLm1pc3NpbmdDbG9zaW5nUGFyZW50aGVzZXMsXHJcblx0XHRcdG9wZW5QYXJlbnRoZXNlc1Rva2VuLnN0YXJ0SWR4LFxyXG5cdFx0XHR0b2tlblN0cmVhbS5mcm9udC5zdGFydElkeCxcclxuXHRcdFx0VG9rZW4udHlwZXMuY2xvc2VQYXJlbnRoZXNlcyk7XHJcblxyXG5cdHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblx0cmV0dXJuIGV4cHJlc3Npb247XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlUmFuZ2VFeHByZXNzaW9uKGxlZnQsIHRva2VuU3RyZWFtKSB7XHJcblx0dG9rZW5TdHJlYW0uc2hpZnQoKTtcclxuXHR2YXIgcmlnaHQgPSBwYXJzZU5hbWVFeHByZXNzaW9uKHRva2VuU3RyZWFtKTtcclxuXHRyZXR1cm4gbmV3IFJhbmdlRXhwcmVzc2lvbihsZWZ0LCByaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlQXJyYXlBY2Nlc3NFeHByZXNzaW9uKHRva2VuU3RyZWFtKSB7XHJcblx0dmFyIG9wZW5CcmFja2V0VG9rZW4gPSB0b2tlblN0cmVhbS5zaGlmdCgpO1xyXG5cclxuICAgIHZhciBleHByZXNzaW9uID0gbmV3IFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihwYXJzZVByb3BlcnR5TmFtZUV4cHJlc3Npb24odG9rZW5TdHJlYW0pLCB0cnVlKTtcclxuXHJcblx0aWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgIT09IFRva2VuLnR5cGVzLmNsb3NlQnJhY2tldClcclxuXHRcdHRocm93IG5ldyBKUGF0aFBhcnNpbmdFcnJvcihKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zLm1pc3NpbmdDbG9zaW5nQnJhY2tldCxcclxuXHRcdFx0b3BlbkJyYWNrZXRUb2tlbi5zdGFydElkeCxcclxuXHRcdFx0dG9rZW5TdHJlYW0uZnJvbnQuc3RhcnRJZHgsXHJcblx0XHRcdFRva2VuLnR5cGVzLmNsb3NlQnJhY2tldCk7XHJcblxyXG5cdHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblx0cmV0dXJuIGV4cHJlc3Npb247XHJcbn1cclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHBhcnNlO1xyXG4iLCIvLyAjIEpQYXRoU3ludGF4RXJyb3JcclxuXHJcbi8vIFRoaXMgY2xhc3MgcmVwcmVzZW50cyBzeW50YWN0aWMgZXJyb3JzIGluIGEgSlBhdGguXHJcbi8vIFN5bnRhY3RpYyBlcnJvcnMgaW5jbHVkZSB1bmJhbGFuY2VkIGJyYWNrZXRzLCBpbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZXMgb3IgaW52YWxpZCBleHByZXNzaW9ucyBpbiBnZW5lcmFsLlxyXG4vLyBBcyBhbGwgZXJyb3JzIGl0IGluaGVyaXRzIGZyb20gdGhlIGdlbmVyYWwgSlBhdGggZXJyb3IuXHJcbi8vIFRoZSByZWFzb24gZm9yIHRoZSBzeW50YXggZXJyb3Igc2hvdWxkIGJlIG9uZSBvZiB0aGUgY29uc3RhbnRzIGRlZmluZWQgYmVsb3cuXHJcbi8vIFRoZSBzdGFydCBhbmQgZW5kIGluZGV4IHNob3VsZCBiZSBjaG9zZW4gc3VjaCB0aGF0IGEgc3Vic3RyaW5nIGNhbGwgd2l0aCB0aG9zZSBpbmRpY2VzIG9uIHRoZSBpbnB1dCBzdHJpbmcgcmVzdWx0c1xyXG4vLyBpbiB0aGF0IHBhcnQgb2YgdGhlIHN0cmluZyB0aGF0IGlzIHJlc3BvbnNpYmxlIGZvciB0aGUgc3ludGF4IGVycm9yLlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xyXG5cclxudmFyIEpQYXRoRXJyb3IgPSByZXF1aXJlKFwiLi9lcnJvclwiKTtcclxuXHJcbmZ1bmN0aW9uIEpQYXRoUGFyc2luZ0Vycm9yKHJlYXNvbiwgc3RhcnRJZHgsIGVuZElkeCwgZXhwZWN0ZWRUb2tlbnMpIHtcclxuICAgIEpQYXRoRXJyb3IuY2FsbCh0aGlzLCBcIlBhcnNpbmcgRXJyb3JcIik7XHJcbiAgICB0aGlzLnJlYXNvbiA9IHJlYXNvbjtcclxuICAgIHRoaXMuc3RhcnRJZHggPSBzdGFydElkeDtcclxuICAgIHRoaXMuZW5kSWR4ID0gZW5kSWR4O1xyXG4gICAgdGhpcy5leHBlY3RlZFRva2VucyA9IEFycmF5LmlzQXJyYXkoZXhwZWN0ZWRUb2tlbnMpID8gZXhwZWN0ZWRUb2tlbnMgOiBbZXhwZWN0ZWRUb2tlbnNdO1xyXG59XHJcblxyXG51dGlsLmluaGVyaXRzKEpQYXRoUGFyc2luZ0Vycm9yLCBKUGF0aEVycm9yKTtcclxuXHJcbkpQYXRoUGFyc2luZ0Vycm9yLnByb3RvdHlwZS5uYW1lID0gXCJKUGF0aFBhcnNpbmdFcnJvclwiO1xyXG5cclxudmFyIHJlYXNvbnMgPSB7fTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShKUGF0aFBhcnNpbmdFcnJvciwgXCJyZWFzb25zXCIsIHtcclxuICAgIHZhbHVlOiByZWFzb25zXHJcbn0pO1xyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMocmVhc29ucywge1xyXG4gICAgbWlzc2luZ0Nsb3NpbmdCcmFja2V0OiB7XHJcbiAgICAgICAgdmFsdWU6IDBcclxuICAgIH0sXHJcbiAgICB1bm1hdGNoZWRDbG9zaW5nQnJhY2tldDoge1xyXG4gICAgICAgIHZhbHVlOiAxXHJcbiAgICB9LFxyXG5cdG1pc3NpbmdDbG9zaW5nUGFyZW50aGVzZXM6IHtcclxuXHRcdHZhbHVlOiAyXHJcblx0fSxcclxuXHR1bm1hdGNoZWRDbG9zaW5nUGFyZW50aGVzZXM6IHtcclxuXHRcdHZhbHVlOiAzXHJcblx0fSxcclxuICAgIHVuZXhwZWN0ZWRUb2tlbjoge1xyXG4gICAgICAgIHZhbHVlOiA0XHJcbiAgICB9LFxyXG4gICAgaW52YWxpZEV4cHJlc3Npb246IHtcclxuICAgICAgICB2YWx1ZTogNVxyXG4gICAgfVxyXG59KTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEpQYXRoUGFyc2luZ0Vycm9yO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBDb250ZXh0ID0gcmVxdWlyZShcIi4vY29udGV4dFwiKTtcclxuXHJcbmZ1bmN0aW9uIFBhdGhFeHByZXNzaW9uKGV4cHJlc3Npb25zLCBpc0Fic29sdXRlUGF0aCkge1xyXG5cdHRoaXMuX2V4cHJlc3Npb25zID0gZXhwcmVzc2lvbnM7XHJcblx0dGhpcy5faXNBYnNvbHV0ZVBhdGggPSBpc0Fic29sdXRlUGF0aDtcclxufVxyXG5cclxuUGF0aEV4cHJlc3Npb24ucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24gKGNvbnRleHQpIHtcclxuXHRpZiAodGhpcy5faXNBYnNvbHV0ZVBhdGgpXHJcblx0XHRjb250ZXh0ID0gbmV3IENvbnRleHQoY29udGV4dC5yb290KTtcclxuXHJcblx0cmV0dXJuIHRoaXMuX2V4cHJlc3Npb25zLnJlZHVjZShmdW5jdGlvbiAoY29udGV4dCwgZXhwcmVzc2lvbikge1xyXG5cdFx0cmV0dXJuIG5ldyBDb250ZXh0KGNvbnRleHQucm9vdCwgZXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KSk7XHJcblx0fSwgY29udGV4dCkuY3VycmVudDtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFBhdGhFeHByZXNzaW9uO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBFdmFsdWF0aW9uUmVzdWx0ID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvbl9yZXN1bHRcIik7XHJcblxyXG5mdW5jdGlvbiBQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocHJvcGVydHlOYW1lc0V4cHJlc3Npb24sIGlzQXJyYXlBY2Nlc3MpIHtcclxuXHR0aGlzLl9pc0FycmF5QWNjZXNzID0gaXNBcnJheUFjY2VzcztcclxuXHR0aGlzLl9wcm9wZXJ0eU5hbWVzRXhwcmVzc2lvbiA9IHByb3BlcnR5TmFtZXNFeHByZXNzaW9uO1xyXG59XHJcblxyXG5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24gKGNvbnRleHQpIHtcclxuICAgIHZhciBpc0FycmF5QWNjZXNzID0gdGhpcy5faXNBcnJheUFjY2VzcztcclxuXHR2YXIgcHJvcGVydHlOYW1lUmVzdWx0cyA9IHRoaXMuX3Byb3BlcnR5TmFtZXNFeHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpO1xyXG5cdHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBwcm9wZXJ0eU5hbWVSZXN1bHRzLm1hcChmdW5jdGlvbiAocHJvcGVydHlOYW1lUmVzdWx0KSB7XHJcblx0XHRyZXR1cm4gY29udGV4dC5jdXJyZW50Lm1hcChmdW5jdGlvbiAocmVzdWx0KSB7XHJcblx0XHRcdHJldHVybiBuZXcgRXZhbHVhdGlvblJlc3VsdChyZXN1bHQsIHByb3BlcnR5TmFtZVJlc3VsdC52YWx1ZSwgaXNBcnJheUFjY2Vzcyk7XHJcblx0XHR9KTtcclxuXHR9KSk7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb247XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIEV2YWx1YXRpb25SZXN1bHQgPSByZXF1aXJlKFwiLi9ldmFsdWF0aW9uX3Jlc3VsdFwiKTtcclxuXHJcbmZ1bmN0aW9uIFJhbmdlRXhwcmVzc2lvbihsZWZ0RXhwcmVzc2lvbiwgcmlnaHRFeHByZXNzaW9uKSB7XHJcblx0dGhpcy5fbGVmdEV4cHJlc3Npb24gPSBsZWZ0RXhwcmVzc2lvbjtcclxuXHR0aGlzLl9yaWdodEV4cHJlc3Npb24gPSByaWdodEV4cHJlc3Npb247XHJcbn1cclxuXHJcblJhbmdlRXhwcmVzc2lvbi5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbiAoY29udGV4dCkge1xyXG5cdHZhciBsZWZ0UHJvcGVydHlOYW1lcyA9IHRoaXMuX2xlZnRFeHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpO1xyXG5cdHZhciByaWdodFByb3BlcnR5TmFtZXMgPSB0aGlzLl9yaWdodEV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCk7XHJcblxyXG5cdHJldHVybiBtYWtlUmFuZ2UoK2xlZnRQcm9wZXJ0eU5hbWVzWzBdLnZhbHVlLCArcmlnaHRQcm9wZXJ0eU5hbWVzWzBdLnZhbHVlKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIG1ha2VSYW5nZShsZWZ0LCByaWdodCkge1xyXG5cdGlmIChsZWZ0ID4gcmlnaHQpIHtcclxuXHRcdHZhciB0bXAgPSBsZWZ0O1xyXG5cdFx0bGVmdCA9IHJpZ2h0O1xyXG5cdFx0cmlnaHQgPSB0bXA7XHJcblx0fVxyXG5cclxuXHR2YXIgcmFuZ2UgPSBbXTtcclxuXHRmb3JcdCh2YXIgaSA9IGxlZnQ7IGkgPCByaWdodDsgKytpKVxyXG5cdFx0cmFuZ2UucHVzaChuZXcgRXZhbHVhdGlvblJlc3VsdChpKSk7XHJcblxyXG5cdHJldHVybiByYW5nZTtcclxufVxyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gUmFuZ2VFeHByZXNzaW9uO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBFdmFsdWF0aW9uUmVzdWx0ID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvbl9yZXN1bHRcIik7XHJcblxyXG5mdW5jdGlvbiBSZWN1cnNpdmVEZXNjZW50RXhwcmVzc2lvbigpIHt9XHJcblxyXG5SZWN1cnNpdmVEZXNjZW50RXhwcmVzc2lvbi5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbiAoY29udGV4dCkge1xyXG5cdGZ1bmN0aW9uIGZpbmREZXNjZW5kYW50cyhyZXN1bHQpIHtcclxuICAgICAgICB2YXIgb2JqZWN0ID0gcmVzdWx0LnZhbHVlO1xyXG5cdFx0dmFyIGRlc2NlbmRhbnRzID0gW107XHJcblx0XHRPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdFtrZXldID09PSBcIm9iamVjdFwiKSB7XHJcblx0XHRcdFx0ZGVzY2VuZGFudHMucHVzaC5hcHBseShkZXNjZW5kYW50cywgZmluZERlc2NlbmRhbnRzKG5ldyBFdmFsdWF0aW9uUmVzdWx0KHJlc3VsdCwga2V5KSkpO1xyXG4gICAgICAgICAgICAgICAgZGVzY2VuZGFudHMucHVzaChuZXcgRXZhbHVhdGlvblJlc3VsdChyZXN1bHQsIGtleSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblx0XHRyZXR1cm4gZGVzY2VuZGFudHM7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgY29udGV4dC5jdXJyZW50LmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5pc0RlZmluZWQoKSAmJiB0eXBlb2YgcmVzdWx0LnZhbHVlID09PSBcIm9iamVjdFwiO1xyXG4gICAgfSkubWFwKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuXHRcdHJldHVybiBmaW5kRGVzY2VuZGFudHMocmVzdWx0KTtcclxuXHR9KSk7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBSZWN1cnNpdmVEZXNjZW50RXhwcmVzc2lvbjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdG9rZW5UeXBlcyA9IHJlcXVpcmUoXCIuL3Rva2VuXCIpLnR5cGVzO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0ge1xyXG5cdFwiL1wiOiB0b2tlblR5cGVzLnNlcGFyYXRvcixcclxuXHRcIltcIjogdG9rZW5UeXBlcy5vcGVuQnJhY2tldCxcclxuXHRcIl1cIjogdG9rZW5UeXBlcy5jbG9zZUJyYWNrZXQsXHJcblx0XCIoXCI6IHRva2VuVHlwZXMub3BlblBhcmVudGhlc2VzLFxyXG5cdFwiKVwiOiB0b2tlblR5cGVzLmNsb3NlUGFyZW50aGVzZXMsXHJcblx0XCIqXCI6IHRva2VuVHlwZXMuYXN0ZXJpc2ssXHJcblx0XCI6XCI6IHRva2VuVHlwZXMuY29sb25cclxufTsiLCIvLyAjIEpQYXRoU3ludGF4RXJyb3JcclxuXHJcbi8vIFRoaXMgY2xhc3MgcmVwcmVzZW50cyBzeW50YWN0aWMgZXJyb3JzIGluIGEgSlBhdGguXHJcbi8vIFN5bnRhY3RpYyBlcnJvcnMgaW5jbHVkZSB1bmJhbGFuY2VkIGJyYWNrZXRzLCBpbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZXMgb3IgaW52YWxpZCBleHByZXNzaW9ucyBpbiBnZW5lcmFsLlxyXG4vLyBBcyBhbGwgZXJyb3JzIGl0IGluaGVyaXRzIGZyb20gdGhlIGdlbmVyYWwgSlBhdGggZXJyb3IuXHJcbi8vIFRoZSByZWFzb24gZm9yIHRoZSBzeW50YXggZXJyb3Igc2hvdWxkIGJlIG9uZSBvZiB0aGUgY29uc3RhbnRzIGRlZmluZWQgYmVsb3cuXHJcbi8vIFRoZSBzdGFydCBhbmQgZW5kIGluZGV4IHNob3VsZCBiZSBjaG9zZW4gc3VjaCB0aGF0IGEgc3Vic3RyaW5nIGNhbGwgd2l0aCB0aG9zZSBpbmRpY2VzIG9uIHRoZSBpbnB1dCBzdHJpbmcgcmVzdWx0c1xyXG4vLyBpbiB0aGF0IHBhcnQgb2YgdGhlIHN0cmluZyB0aGF0IGlzIHJlc3BvbnNpYmxlIGZvciB0aGUgc3ludGF4IGVycm9yLlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xyXG5cclxudmFyIEpQYXRoRXJyb3IgPSByZXF1aXJlKFwiLi9lcnJvclwiKTtcclxudmFyIEpQYXRoUGFyc2luZ0Vycm9yID0gcmVxdWlyZShcIi4vcGFyc2luZ19lcnJvclwiKTtcclxuXHJcbmZ1bmN0aW9uIEpQYXRoU3ludGF4RXJyb3IocGFyYW1zKSB7XHJcbiAgICBKUGF0aEVycm9yLmNhbGwodGhpcywgXCJTeW50YXggZXJyb3JcIik7XHJcbiAgICB0aGlzLnJlYXNvbiA9IHBhcmFtcy5yZWFzb247XHJcbiAgICB0aGlzLnN0YXJ0SWR4ID0gcGFyYW1zLnN0YXJ0SWR4O1xyXG4gICAgdGhpcy5lbmRJZHggPSBwYXJhbXMuZW5kSWR4O1xyXG4gICAgdGhpcy5hY3R1YWwgPSBwYXJhbXMuYWN0dWFsO1xyXG4gICAgdGhpcy5leHBlY3RlZCA9IHBhcmFtcy5leHBlY3RlZDtcclxuICAgIHRoaXMubWVzc2FnZSA9IHBhcmFtcy5tZXNzYWdlO1xyXG59XHJcblxyXG51dGlsLmluaGVyaXRzKEpQYXRoU3ludGF4RXJyb3IsIEpQYXRoRXJyb3IpO1xyXG5cclxuSlBhdGhTeW50YXhFcnJvci5wcm90b3R5cGUubmFtZSA9IFwiSlBhdGhTeW50YXhFcnJvclwiO1xyXG5cclxudmFyIHJlYXNvbnMgPSB1dGlsLl9leHRlbmQoe30sIEpQYXRoUGFyc2luZ0Vycm9yLnJlYXNvbnMpO1xyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEpQYXRoU3ludGF4RXJyb3IsIFwicmVhc29uc1wiLCB7XHJcbiAgICB2YWx1ZTogcmVhc29uc1xyXG59KTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZWFzb25zLCBcImludmFsaWRFc2NhcGVTZXF1ZW5jZVwiLCB7XHJcbiAgICB2YWx1ZTogSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy5pbnZhbGlkRXhwcmVzc2lvbiArIDFcclxufSk7XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBKUGF0aFN5bnRheEVycm9yO1xyXG4iLCIvLyAjIFRva2VuXHJcblxyXG4vLyBSZXByZXNlbnRzIGEgdG9rZW4gYXMgdGhlIHJlc3VsdCBvZiB0aGUgbGV4ZXJzIHNjYW5uaW5nIHByb2Nlc3MuXHJcbi8vIFRoZSBzdGFydElkeCBhbmQgZW5kSWR4IHBhcmFtZXRlciBhcmUgY2hvc2VuIHRvIHN1Y2ggdGhhdCBhIGNhbGwgdG8gU3RyaW5nI3N1YnN0cmluZyhzdGFydElkeCwgZW5kSWR4KSBvbiB0aGUgaW5wdXQgc3RyZWFtIHdvdWxkIHJldHVybiB0aGUgdG9rZW4ncyB2YWx1ZS5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxuLy8gQ29uc3RydWN0cyBhIHRva2VuIHdpdGggdGhlIGdpdmVuIHRva2VuIHR5cGUsIHRoZSB0b2tlbnMgc3RhcnQgYW5kIGVuZCBpbmRleCBhbmQgaXRzIGFjdHVhbCBzdHJpbmcgdmFsdWUuXHJcbmZ1bmN0aW9uIFRva2VuKHR5cGUsIHN0YXJ0SWR4LCBlbmRJZHgsIHZhbHVlKSB7XHJcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xyXG4gICAgdGhpcy5zdGFydElkeCA9IHN0YXJ0SWR4O1xyXG4gICAgdGhpcy5lbmRJZHggPSBlbmRJZHg7XHJcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFRva2VuO1xyXG5cclxudmFyIHRva2VuVHlwZXMgPSB7fTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShUb2tlbiwgXCJ0eXBlc1wiLCB7XHJcbiAgICB2YWx1ZTogdG9rZW5UeXBlc1xyXG59KTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRva2VuVHlwZXMsIHtcclxuICAgIC8vIFRoZSB0b2tlbiB0aGF0IHNlcGFyYXRlcyB0d28gcGF0aCBjb21wb25lbnRzLlxyXG4gICAgc2VwYXJhdG9yOiB7XHJcbiAgICAgICAgdmFsdWU6IDBcclxuICAgIH0sXHJcbiAgICAvLyBJbnRyb2R1Y2VzIGFuIGFycmF5IGluZGV4IGV4cHJlc3Npb24uXHJcbiAgICBvcGVuQnJhY2tldDoge1xyXG4gICAgICAgIHZhbHVlOiAxXHJcbiAgICB9LFxyXG4gICAgLy8gQ2xvc2VzIGFuIGFycmF5IGluZGV4IGV4cHJlc3Npb24gb3IgYSBzdWIgZXhwcmVzc2lvbi5cclxuICAgIGNsb3NlQnJhY2tldDoge1xyXG4gICAgICAgIHZhbHVlOiAyXHJcbiAgICB9LFxyXG5cdC8vIEludHJvZHVjZXMgZWl0aGVyIGFuIGFycmF5IGluZGV4IGV4cHJlc3Npb24gb3IgYSBzdWIgZXhwcmVzc2lvbi5cclxuXHRvcGVuUGFyZW50aGVzZXM6IHtcclxuXHRcdHZhbHVlOiAzXHJcblx0fSxcclxuXHQvLyBDbG9zZXMgYW4gYXJyYXkgaW5kZXggZXhwcmVzc2lvbiBvciBhIHN1YiBleHByZXNzaW9uLlxyXG5cdGNsb3NlUGFyZW50aGVzZXM6IHtcclxuXHRcdHZhbHVlOiA0XHJcblx0fSxcclxuICAgIC8vIFRoZSB0b2tlbiB0aGF0IHJlcHJlc2VudHMgYSBkZXNjZW50IG9uZSBsZXZlbCBleHByZXNzaW9uLlxyXG4gICAgYXN0ZXJpc2s6IHtcclxuICAgICAgICB2YWx1ZTogNVxyXG4gICAgfSxcclxuICAgIC8vIFRoZSB0b2tlbiB1c2VkIGluc2lkZSBhbiBhcnJheSBpbmRleCBleHByZXNzaW9uIHRvIGRlZmluZSBhIHNsaWNlIG9wZXJhdGlvbi5cclxuICAgIGNvbG9uOiB7XHJcbiAgICAgICAgdmFsdWU6IDZcclxuICAgIH0sXHJcbiAgICAvLyBUaGUgdG9rZW4gZm9yIGEgbGl0ZXJhbC5cclxuXHRsaXRlcmFsOiB7XHJcbiAgICAgICAgdmFsdWU6IDExXHJcbiAgICB9LFxyXG4gICAgLy8gVGhlIHRva2VuIHJlcHJlc2VudGluZyB0aGUgZW5kIG9mIHRyYW5zbWlzc2lvbi90b2tlbnN0cmVhbS5cclxuICAgIGVvdDoge1xyXG4gICAgICAgIHZhbHVlOiAxMDBcclxuICAgIH1cclxufSk7XHJcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4oZnVuY3Rpb24gKGdsb2JhbCwgdW5kZWZpbmVkKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBpZiAoZ2xvYmFsLnNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIG5leHRIYW5kbGUgPSAxOyAvLyBTcGVjIHNheXMgZ3JlYXRlciB0aGFuIHplcm9cbiAgICB2YXIgdGFza3NCeUhhbmRsZSA9IHt9O1xuICAgIHZhciBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSBmYWxzZTtcbiAgICB2YXIgZG9jID0gZ2xvYmFsLmRvY3VtZW50O1xuICAgIHZhciBzZXRJbW1lZGlhdGU7XG5cbiAgICBmdW5jdGlvbiBhZGRGcm9tU2V0SW1tZWRpYXRlQXJndW1lbnRzKGFyZ3MpIHtcbiAgICAgICAgdGFza3NCeUhhbmRsZVtuZXh0SGFuZGxlXSA9IHBhcnRpYWxseUFwcGxpZWQuYXBwbHkodW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIG5leHRIYW5kbGUrKztcbiAgICB9XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGFjY2VwdHMgdGhlIHNhbWUgYXJndW1lbnRzIGFzIHNldEltbWVkaWF0ZSwgYnV0XG4gICAgLy8gcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgcmVxdWlyZXMgbm8gYXJndW1lbnRzLlxuICAgIGZ1bmN0aW9uIHBhcnRpYWxseUFwcGxpZWQoaGFuZGxlcikge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIChuZXcgRnVuY3Rpb24oXCJcIiArIGhhbmRsZXIpKSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1bklmUHJlc2VudChoYW5kbGUpIHtcbiAgICAgICAgLy8gRnJvbSB0aGUgc3BlYzogXCJXYWl0IHVudGlsIGFueSBpbnZvY2F0aW9ucyBvZiB0aGlzIGFsZ29yaXRobSBzdGFydGVkIGJlZm9yZSB0aGlzIG9uZSBoYXZlIGNvbXBsZXRlZC5cIlxuICAgICAgICAvLyBTbyBpZiB3ZSdyZSBjdXJyZW50bHkgcnVubmluZyBhIHRhc2ssIHdlJ2xsIG5lZWQgdG8gZGVsYXkgdGhpcyBpbnZvY2F0aW9uLlxuICAgICAgICBpZiAoY3VycmVudGx5UnVubmluZ0FUYXNrKSB7XG4gICAgICAgICAgICAvLyBEZWxheSBieSBkb2luZyBhIHNldFRpbWVvdXQuIHNldEltbWVkaWF0ZSB3YXMgdHJpZWQgaW5zdGVhZCwgYnV0IGluIEZpcmVmb3ggNyBpdCBnZW5lcmF0ZWQgYVxuICAgICAgICAgICAgLy8gXCJ0b28gbXVjaCByZWN1cnNpb25cIiBlcnJvci5cbiAgICAgICAgICAgIHNldFRpbWVvdXQocGFydGlhbGx5QXBwbGllZChydW5JZlByZXNlbnQsIGhhbmRsZSksIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSB0YXNrc0J5SGFuZGxlW2hhbmRsZV07XG4gICAgICAgICAgICBpZiAodGFzaykge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IHRydWU7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdGFzaygpO1xuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW1tZWRpYXRlKGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFySW1tZWRpYXRlKGhhbmRsZSkge1xuICAgICAgICBkZWxldGUgdGFza3NCeUhhbmRsZVtoYW5kbGVdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxOZXh0VGlja0ltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBhZGRGcm9tU2V0SW1tZWRpYXRlQXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKHBhcnRpYWxseUFwcGxpZWQocnVuSWZQcmVzZW50LCBoYW5kbGUpKTtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGU7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuVXNlUG9zdE1lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFRoZSB0ZXN0IGFnYWluc3QgYGltcG9ydFNjcmlwdHNgIHByZXZlbnRzIHRoaXMgaW1wbGVtZW50YXRpb24gZnJvbSBiZWluZyBpbnN0YWxsZWQgaW5zaWRlIGEgd2ViIHdvcmtlcixcbiAgICAgICAgLy8gd2hlcmUgYGdsb2JhbC5wb3N0TWVzc2FnZWAgbWVhbnMgc29tZXRoaW5nIGNvbXBsZXRlbHkgZGlmZmVyZW50IGFuZCBjYW4ndCBiZSB1c2VkIGZvciB0aGlzIHB1cnBvc2UuXG4gICAgICAgIGlmIChnbG9iYWwucG9zdE1lc3NhZ2UgJiYgIWdsb2JhbC5pbXBvcnRTY3JpcHRzKSB7XG4gICAgICAgICAgICB2YXIgcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgb2xkT25NZXNzYWdlID0gZ2xvYmFsLm9ubWVzc2FnZTtcbiAgICAgICAgICAgIGdsb2JhbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzID0gZmFsc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZ2xvYmFsLnBvc3RNZXNzYWdlKFwiXCIsIFwiKlwiKTtcbiAgICAgICAgICAgIGdsb2JhbC5vbm1lc3NhZ2UgPSBvbGRPbk1lc3NhZ2U7XG4gICAgICAgICAgICByZXR1cm4gcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxQb3N0TWVzc2FnZUltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICAvLyBJbnN0YWxscyBhbiBldmVudCBoYW5kbGVyIG9uIGBnbG9iYWxgIGZvciB0aGUgYG1lc3NhZ2VgIGV2ZW50OiBzZWVcbiAgICAgICAgLy8gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9ET00vd2luZG93LnBvc3RNZXNzYWdlXG4gICAgICAgIC8vICogaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvY29tbXMuaHRtbCNjcm9zc0RvY3VtZW50TWVzc2FnZXNcblxuICAgICAgICB2YXIgbWVzc2FnZVByZWZpeCA9IFwic2V0SW1tZWRpYXRlJFwiICsgTWF0aC5yYW5kb20oKSArIFwiJFwiO1xuICAgICAgICB2YXIgb25HbG9iYWxNZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5zb3VyY2UgPT09IGdsb2JhbCAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBldmVudC5kYXRhID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0YS5pbmRleE9mKG1lc3NhZ2VQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcnVuSWZQcmVzZW50KCtldmVudC5kYXRhLnNsaWNlKG1lc3NhZ2VQcmVmaXgubGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgb25HbG9iYWxNZXNzYWdlLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnbG9iYWwuYXR0YWNoRXZlbnQoXCJvbm1lc3NhZ2VcIiwgb25HbG9iYWxNZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGFkZEZyb21TZXRJbW1lZGlhdGVBcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIGdsb2JhbC5wb3N0TWVzc2FnZShtZXNzYWdlUHJlZml4ICsgaGFuZGxlLCBcIipcIik7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxNZXNzYWdlQ2hhbm5lbEltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIHJ1bklmUHJlc2VudChoYW5kbGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGFkZEZyb21TZXRJbW1lZGlhdGVBcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoaGFuZGxlKTtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGU7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFJlYWR5U3RhdGVDaGFuZ2VJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgdmFyIGh0bWwgPSBkb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBhZGRGcm9tU2V0SW1tZWRpYXRlQXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSA8c2NyaXB0PiBlbGVtZW50OyBpdHMgcmVhZHlzdGF0ZWNoYW5nZSBldmVudCB3aWxsIGJlIGZpcmVkIGFzeW5jaHJvbm91c2x5IG9uY2UgaXQgaXMgaW5zZXJ0ZWRcbiAgICAgICAgICAgIC8vIGludG8gdGhlIGRvY3VtZW50LiBEbyBzbywgdGh1cyBxdWV1aW5nIHVwIHRoZSB0YXNrLiBSZW1lbWJlciB0byBjbGVhbiB1cCBvbmNlIGl0J3MgYmVlbiBjYWxsZWQuXG4gICAgICAgICAgICB2YXIgc2NyaXB0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgICAgICAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJ1bklmUHJlc2VudChoYW5kbGUpO1xuICAgICAgICAgICAgICAgIHNjcmlwdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBudWxsO1xuICAgICAgICAgICAgICAgIGh0bWwucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgICAgICAgICBzY3JpcHQgPSBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGh0bWwuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGU7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFNldFRpbWVvdXRJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gYWRkRnJvbVNldEltbWVkaWF0ZUFyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgICAgICAgICAgc2V0VGltZW91dChwYXJ0aWFsbHlBcHBsaWVkKHJ1bklmUHJlc2VudCwgaGFuZGxlKSwgMCk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIElmIHN1cHBvcnRlZCwgd2Ugc2hvdWxkIGF0dGFjaCB0byB0aGUgcHJvdG90eXBlIG9mIGdsb2JhbCwgc2luY2UgdGhhdCBpcyB3aGVyZSBzZXRUaW1lb3V0IGV0IGFsLiBsaXZlLlxuICAgIHZhciBhdHRhY2hUbyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsKTtcbiAgICBhdHRhY2hUbyA9IGF0dGFjaFRvICYmIGF0dGFjaFRvLnNldFRpbWVvdXQgPyBhdHRhY2hUbyA6IGdsb2JhbDtcblxuICAgIC8vIERvbid0IGdldCBmb29sZWQgYnkgZS5nLiBicm93c2VyaWZ5IGVudmlyb25tZW50cy5cbiAgICBpZiAoe30udG9TdHJpbmcuY2FsbChnbG9iYWwucHJvY2VzcykgPT09IFwiW29iamVjdCBwcm9jZXNzXVwiKSB7XG4gICAgICAgIC8vIEZvciBOb2RlLmpzIGJlZm9yZSAwLjlcbiAgICAgICAgaW5zdGFsbE5leHRUaWNrSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoY2FuVXNlUG9zdE1lc3NhZ2UoKSkge1xuICAgICAgICAvLyBGb3Igbm9uLUlFMTAgbW9kZXJuIGJyb3dzZXJzXG4gICAgICAgIGluc3RhbGxQb3N0TWVzc2FnZUltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGdsb2JhbC5NZXNzYWdlQ2hhbm5lbCkge1xuICAgICAgICAvLyBGb3Igd2ViIHdvcmtlcnMsIHdoZXJlIHN1cHBvcnRlZFxuICAgICAgICBpbnN0YWxsTWVzc2FnZUNoYW5uZWxJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChkb2MgJiYgXCJvbnJlYWR5c3RhdGVjaGFuZ2VcIiBpbiBkb2MuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKSkge1xuICAgICAgICAvLyBGb3IgSUUgNuKAkzhcbiAgICAgICAgaW5zdGFsbFJlYWR5U3RhdGVDaGFuZ2VJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgIGluc3RhbGxTZXRUaW1lb3V0SW1wbGVtZW50YXRpb24oKTtcbiAgICB9XG5cbiAgICBhdHRhY2hUby5zZXRJbW1lZGlhdGUgPSBzZXRJbW1lZGlhdGU7XG4gICAgYXR0YWNoVG8uY2xlYXJJbW1lZGlhdGUgPSBjbGVhckltbWVkaWF0ZTtcbn0obmV3IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSkpO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIitOc2NObVwiKSkiLG51bGwsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgQnVmZmVyLl91c2VUeXBlZEFycmF5c2A6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChjb21wYXRpYmxlIGRvd24gdG8gSUU2KVxuICovXG5CdWZmZXIuX3VzZVR5cGVkQXJyYXlzID0gKGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IGlmIGJyb3dzZXIgc3VwcG9ydHMgVHlwZWQgQXJyYXlzLiBTdXBwb3J0ZWQgYnJvd3NlcnMgYXJlIElFIDEwKywgRmlyZWZveCA0KyxcbiAgLy8gQ2hyb21lIDcrLCBTYWZhcmkgNS4xKywgT3BlcmEgMTEuNissIGlPUyA0LjIrLiBJZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGFkZGluZ1xuICAvLyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsIHRoZW4gdGhhdCdzIHRoZSBzYW1lIGFzIG5vIGBVaW50OEFycmF5YCBzdXBwb3J0XG4gIC8vIGJlY2F1c2Ugd2UgbmVlZCB0byBiZSBhYmxlIHRvIGFkZCBhbGwgdGhlIG5vZGUgQnVmZmVyIEFQSSBtZXRob2RzLiBUaGlzIGlzIGFuIGlzc3VlXG4gIC8vIGluIEZpcmVmb3ggNC0yOS4gTm93IGZpeGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzhcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpICYmXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgLy8gQ2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIFdvcmthcm91bmQ6IG5vZGUncyBiYXNlNjQgaW1wbGVtZW50YXRpb24gYWxsb3dzIGZvciBub24tcGFkZGVkIHN0cmluZ3NcbiAgLy8gd2hpbGUgYmFzZTY0LWpzIGRvZXMgbm90LlxuICBpZiAoZW5jb2RpbmcgPT09ICdiYXNlNjQnICYmIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgc3ViamVjdCA9IHN0cmluZ3RyaW0oc3ViamVjdClcbiAgICB3aGlsZSAoc3ViamVjdC5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgICBzdWJqZWN0ID0gc3ViamVjdCArICc9J1xuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdClcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpXG4gICAgbGVuZ3RoID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0Lmxlbmd0aCkgLy8gYXNzdW1lIHRoYXQgb2JqZWN0IGlzIGFycmF5LWxpa2VcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZHMgdG8gYmUgYSBudW1iZXIsIGFycmF5IG9yIHN0cmluZy4nKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgYnVmLl9zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgICAgZWxzZVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0W2ldXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbi8vIFNUQVRJQyBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT09IG51bGwgJiYgYiAhPT0gdW5kZWZpbmVkICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAvIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBhc3NlcnQoaXNBcnJheShsaXN0KSwgJ1VzYWdlOiBCdWZmZXIuY29uY2F0KGxpc3QsIFt0b3RhbExlbmd0aF0pXFxuJyArXG4gICAgICAnbGlzdCBzaG91bGQgYmUgYW4gQXJyYXkuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdG90YWxMZW5ndGggIT09ICdudW1iZXInKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuLy8gQlVGRkVSIElOU1RBTkNFIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIF9oZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGFzc2VydChzdHJMZW4gJSAyID09PSAwLCAnSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgYXNzZXJ0KCFpc05hTihieXRlKSwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gaSAqIDJcbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gX3V0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBfYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG4gIHN0YXJ0ID0gTnVtYmVyKHN0YXJ0KSB8fCAwXG4gIGVuZCA9IChlbmQgIT09IHVuZGVmaW5lZClcbiAgICA/IE51bWJlcihlbmQpXG4gICAgOiBlbmQgPSBzZWxmLmxlbmd0aFxuXG4gIC8vIEZhc3RwYXRoIGVtcHR5IHN0cmluZ3NcbiAgaWYgKGVuZCA9PT0gc3RhcnQpXG4gICAgcmV0dXJuICcnXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnc291cmNlRW5kIDwgc291cmNlU3RhcnQnKVxuICBhc3NlcnQodGFyZ2V0X3N0YXJ0ID49IDAgJiYgdGFyZ2V0X3N0YXJ0IDwgdGFyZ2V0Lmxlbmd0aCxcbiAgICAgICd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCBzb3VyY2UubGVuZ3RoLCAnc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gc291cmNlLmxlbmd0aCwgJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwIHx8ICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gX3V0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBfYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspXG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHJldHVybiBfYXNjaWlTbGljZShidWYsIHN0YXJ0LCBlbmQpXG59XG5cbmZ1bmN0aW9uIF9oZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2krMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gY2xhbXAoc3RhcnQsIGxlbiwgMClcbiAgZW5kID0gY2xhbXAoZW5kLCBsZW4sIGxlbilcblxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIHJldHVybiBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIHZhciBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQsIHRydWUpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0J1ZlxuICB9XG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgfSBlbHNlIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAyXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gICAgdmFsIHw9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKVxuICB9IGVsc2Uge1xuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDFdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDJdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgM11cbiAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldF0gPDwgMjQgPj4+IDApXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgdmFyIG5lZyA9IHRoaXNbb2Zmc2V0XSAmIDB4ODBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MTYoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDMyKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDAwMDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmZmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEZsb2F0IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRG91YmxlIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZilcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVyblxuXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmZmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmLCAtMHg4MClcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgdGhpcy53cml0ZVVJbnQ4KHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgdGhpcy53cml0ZVVJbnQ4KDB4ZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZiwgLTB4ODAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQxNihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MTYoYnVmLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MzIoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgMHhmZmZmZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHZhbHVlID0gdmFsdWUuY2hhckNvZGVBdCgwKVxuICB9XG5cbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHZhbHVlKSwgJ3ZhbHVlIGlzIG5vdCBhIG51bWJlcicpXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHRoaXMubGVuZ3RoLCAnc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gdGhpcy5sZW5ndGgsICdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICB0aGlzW2ldID0gdmFsdWVcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvdXQgPSBbXVxuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIG91dFtpXSA9IHRvSGV4KHRoaXNbaV0pXG4gICAgaWYgKGkgPT09IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMpIHtcbiAgICAgIG91dFtpICsgMV0gPSAnLi4uJ1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBvdXQuam9pbignICcpICsgJz4nXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKVxuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbi8vIHNsaWNlKHN0YXJ0LCBlbmQpXG5mdW5jdGlvbiBjbGFtcCAoaW5kZXgsIGxlbiwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInKSByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIGluZGV4ID0gfn5pbmRleDsgIC8vIENvZXJjZSB0byBpbnRlZ2VyLlxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgaW5kZXggKz0gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gY29lcmNlIChsZW5ndGgpIHtcbiAgLy8gQ29lcmNlIGxlbmd0aCB0byBhIG51bWJlciAocG9zc2libHkgTmFOKSwgcm91bmQgdXBcbiAgLy8gaW4gY2FzZSBpdCdzIGZyYWN0aW9uYWwgKGUuZy4gMTIzLjQ1NikgdGhlbiBkbyBhXG4gIC8vIGRvdWJsZSBuZWdhdGUgdG8gY29lcmNlIGEgTmFOIHRvIDAuIEVhc3ksIHJpZ2h0P1xuICBsZW5ndGggPSB+fk1hdGguY2VpbCgrbGVuZ3RoKVxuICByZXR1cm4gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGhcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBBcnJheV0nXG4gIH0pKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpXG4gICAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSlcbiAgICBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspXG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoc3RyKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIHBvc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKVxuICAgICAgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cblxuLypcbiAqIFdlIGhhdmUgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHZhbHVlIGlzIGEgdmFsaWQgaW50ZWdlci4gVGhpcyBtZWFucyB0aGF0IGl0XG4gKiBpcyBub24tbmVnYXRpdmUuIEl0IGhhcyBubyBmcmFjdGlvbmFsIGNvbXBvbmVudCBhbmQgdGhhdCBpdCBkb2VzIG5vdFxuICogZXhjZWVkIHRoZSBtYXhpbXVtIGFsbG93ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmdWludCAodmFsdWUsIG1heCkge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPj0gMCwgJ3NwZWNpZmllZCBhIG5lZ2F0aXZlIHZhbHVlIGZvciB3cml0aW5nIGFuIHVuc2lnbmVkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGlzIGxhcmdlciB0aGFuIG1heGltdW0gdmFsdWUgZm9yIHR5cGUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZnNpbnQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZklFRUU3NTQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxufVxuXG5mdW5jdGlvbiBhc3NlcnQgKHRlc3QsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0ZXN0KSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnRmFpbGVkIGFzc2VydGlvbicpXG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpKSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgZHVwbGV4IHN0cmVhbSBpcyBqdXN0IGEgc3RyZWFtIHRoYXQgaXMgYm90aCByZWFkYWJsZSBhbmQgd3JpdGFibGUuXG4vLyBTaW5jZSBKUyBkb2Vzbid0IGhhdmUgbXVsdGlwbGUgcHJvdG90eXBhbCBpbmhlcml0YW5jZSwgdGhpcyBjbGFzc1xuLy8gcHJvdG90eXBhbGx5IGluaGVyaXRzIGZyb20gUmVhZGFibGUsIGFuZCB0aGVuIHBhcmFzaXRpY2FsbHkgZnJvbVxuLy8gV3JpdGFibGUuXG5cbm1vZHVsZS5leHBvcnRzID0gRHVwbGV4O1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbnZhciBzZXRJbW1lZGlhdGUgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBSZWFkYWJsZSA9IHJlcXVpcmUoJy4vcmVhZGFibGUuanMnKTtcbnZhciBXcml0YWJsZSA9IHJlcXVpcmUoJy4vd3JpdGFibGUuanMnKTtcblxuaW5oZXJpdHMoRHVwbGV4LCBSZWFkYWJsZSk7XG5cbkR1cGxleC5wcm90b3R5cGUud3JpdGUgPSBXcml0YWJsZS5wcm90b3R5cGUud3JpdGU7XG5EdXBsZXgucHJvdG90eXBlLmVuZCA9IFdyaXRhYmxlLnByb3RvdHlwZS5lbmQ7XG5EdXBsZXgucHJvdG90eXBlLl93cml0ZSA9IFdyaXRhYmxlLnByb3RvdHlwZS5fd3JpdGU7XG5cbmZ1bmN0aW9uIER1cGxleChvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXgpKVxuICAgIHJldHVybiBuZXcgRHVwbGV4KG9wdGlvbnMpO1xuXG4gIFJlYWRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gIFdyaXRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZWFkYWJsZSA9PT0gZmFsc2UpXG4gICAgdGhpcy5yZWFkYWJsZSA9IGZhbHNlO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMud3JpdGFibGUgPT09IGZhbHNlKVxuICAgIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcblxuICB0aGlzLmFsbG93SGFsZk9wZW4gPSB0cnVlO1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmFsbG93SGFsZk9wZW4gPT09IGZhbHNlKVxuICAgIHRoaXMuYWxsb3dIYWxmT3BlbiA9IGZhbHNlO1xuXG4gIHRoaXMub25jZSgnZW5kJywgb25lbmQpO1xufVxuXG4vLyB0aGUgbm8taGFsZi1vcGVuIGVuZm9yY2VyXG5mdW5jdGlvbiBvbmVuZCgpIHtcbiAgLy8gaWYgd2UgYWxsb3cgaGFsZi1vcGVuIHN0YXRlLCBvciBpZiB0aGUgd3JpdGFibGUgc2lkZSBlbmRlZCxcbiAgLy8gdGhlbiB3ZSdyZSBvay5cbiAgaWYgKHRoaXMuYWxsb3dIYWxmT3BlbiB8fCB0aGlzLl93cml0YWJsZVN0YXRlLmVuZGVkKVxuICAgIHJldHVybjtcblxuICAvLyBubyBtb3JlIGRhdGEgY2FuIGJlIHdyaXR0ZW4uXG4gIC8vIEJ1dCBhbGxvdyBtb3JlIHdyaXRlcyB0byBoYXBwZW4gaW4gdGhpcyB0aWNrLlxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5lbmQoKTtcbiAgfSk7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmluaGVyaXRzKFN0cmVhbSwgRUUpO1xuU3RyZWFtLlJlYWRhYmxlID0gcmVxdWlyZSgnLi9yZWFkYWJsZS5qcycpO1xuU3RyZWFtLldyaXRhYmxlID0gcmVxdWlyZSgnLi93cml0YWJsZS5qcycpO1xuU3RyZWFtLkR1cGxleCA9IHJlcXVpcmUoJy4vZHVwbGV4LmpzJyk7XG5TdHJlYW0uVHJhbnNmb3JtID0gcmVxdWlyZSgnLi90cmFuc2Zvcm0uanMnKTtcblN0cmVhbS5QYXNzVGhyb3VnaCA9IHJlcXVpcmUoJy4vcGFzc3Rocm91Z2guanMnKTtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC40LnhcblN0cmVhbS5TdHJlYW0gPSBTdHJlYW07XG5cblxuXG4vLyBvbGQtc3R5bGUgc3RyZWFtcy4gIE5vdGUgdGhhdCB0aGUgcGlwZSBtZXRob2QgKHRoZSBvbmx5IHJlbGV2YW50XG4vLyBwYXJ0IG9mIHRoaXMgY2xhc3MpIGlzIG92ZXJyaWRkZW4gaW4gdGhlIFJlYWRhYmxlIGNsYXNzLlxuXG5mdW5jdGlvbiBTdHJlYW0oKSB7XG4gIEVFLmNhbGwodGhpcyk7XG59XG5cblN0cmVhbS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRlc3QsIG9wdGlvbnMpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXM7XG5cbiAgZnVuY3Rpb24gb25kYXRhKGNodW5rKSB7XG4gICAgaWYgKGRlc3Qud3JpdGFibGUpIHtcbiAgICAgIGlmIChmYWxzZSA9PT0gZGVzdC53cml0ZShjaHVuaykgJiYgc291cmNlLnBhdXNlKSB7XG4gICAgICAgIHNvdXJjZS5wYXVzZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNvdXJjZS5vbignZGF0YScsIG9uZGF0YSk7XG5cbiAgZnVuY3Rpb24gb25kcmFpbigpIHtcbiAgICBpZiAoc291cmNlLnJlYWRhYmxlICYmIHNvdXJjZS5yZXN1bWUpIHtcbiAgICAgIHNvdXJjZS5yZXN1bWUoKTtcbiAgICB9XG4gIH1cblxuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gIC8vIElmIHRoZSAnZW5kJyBvcHRpb24gaXMgbm90IHN1cHBsaWVkLCBkZXN0LmVuZCgpIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgLy8gc291cmNlIGdldHMgdGhlICdlbmQnIG9yICdjbG9zZScgZXZlbnRzLiAgT25seSBkZXN0LmVuZCgpIG9uY2UuXG4gIGlmICghZGVzdC5faXNTdGRpbyAmJiAoIW9wdGlvbnMgfHwgb3B0aW9ucy5lbmQgIT09IGZhbHNlKSkge1xuICAgIHNvdXJjZS5vbignZW5kJywgb25lbmQpO1xuICAgIHNvdXJjZS5vbignY2xvc2UnLCBvbmNsb3NlKTtcbiAgfVxuXG4gIHZhciBkaWRPbkVuZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBvbmVuZCgpIHtcbiAgICBpZiAoZGlkT25FbmQpIHJldHVybjtcbiAgICBkaWRPbkVuZCA9IHRydWU7XG5cbiAgICBkZXN0LmVuZCgpO1xuICB9XG5cblxuICBmdW5jdGlvbiBvbmNsb3NlKCkge1xuICAgIGlmIChkaWRPbkVuZCkgcmV0dXJuO1xuICAgIGRpZE9uRW5kID0gdHJ1ZTtcblxuICAgIGlmICh0eXBlb2YgZGVzdC5kZXN0cm95ID09PSAnZnVuY3Rpb24nKSBkZXN0LmRlc3Ryb3koKTtcbiAgfVxuXG4gIC8vIGRvbid0IGxlYXZlIGRhbmdsaW5nIHBpcGVzIHdoZW4gdGhlcmUgYXJlIGVycm9ycy5cbiAgZnVuY3Rpb24gb25lcnJvcihlcikge1xuICAgIGNsZWFudXAoKTtcbiAgICBpZiAoRUUubGlzdGVuZXJDb3VudCh0aGlzLCAnZXJyb3InKSA9PT0gMCkge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCBzdHJlYW0gZXJyb3IgaW4gcGlwZS5cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2Vycm9yJywgb25lcnJvcik7XG4gIGRlc3Qub24oJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgLy8gcmVtb3ZlIGFsbCB0aGUgZXZlbnQgbGlzdGVuZXJzIHRoYXQgd2VyZSBhZGRlZC5cbiAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2RhdGEnLCBvbmRhdGEpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25kcmFpbik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcblxuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIGNsZWFudXApO1xuXG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcbiAgfVxuXG4gIHNvdXJjZS5vbignZW5kJywgY2xlYW51cCk7XG4gIHNvdXJjZS5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0Lm9uKCdjbG9zZScsIGNsZWFudXApO1xuXG4gIGRlc3QuZW1pdCgncGlwZScsIHNvdXJjZSk7XG5cbiAgLy8gQWxsb3cgZm9yIHVuaXgtbGlrZSB1c2FnZTogQS5waXBlKEIpLnBpcGUoQylcbiAgcmV0dXJuIGRlc3Q7XG59O1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgcGFzc3Rocm91Z2ggc3RyZWFtLlxuLy8gYmFzaWNhbGx5IGp1c3QgdGhlIG1vc3QgbWluaW1hbCBzb3J0IG9mIFRyYW5zZm9ybSBzdHJlYW0uXG4vLyBFdmVyeSB3cml0dGVuIGNodW5rIGdldHMgb3V0cHV0IGFzLWlzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhc3NUaHJvdWdoO1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi90cmFuc2Zvcm0uanMnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5pbmhlcml0cyhQYXNzVGhyb3VnaCwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gUGFzc1Rocm91Z2gob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGFzc1Rocm91Z2gpKVxuICAgIHJldHVybiBuZXcgUGFzc1Rocm91Z2gob3B0aW9ucyk7XG5cbiAgVHJhbnNmb3JtLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cblBhc3NUaHJvdWdoLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBjYihudWxsLCBjaHVuayk7XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRhYmxlO1xuUmVhZGFibGUuUmVhZGFibGVTdGF0ZSA9IFJlYWRhYmxlU3RhdGU7XG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBTdHJlYW0gPSByZXF1aXJlKCcuL2luZGV4LmpzJyk7XG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xudmFyIHNldEltbWVkaWF0ZSA9IHJlcXVpcmUoJ3Byb2Nlc3MvYnJvd3Nlci5qcycpLm5leHRUaWNrO1xudmFyIFN0cmluZ0RlY29kZXI7XG5cbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5pbmhlcml0cyhSZWFkYWJsZSwgU3RyZWFtKTtcblxuZnVuY3Rpb24gUmVhZGFibGVTdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gdGhlIHBvaW50IGF0IHdoaWNoIGl0IHN0b3BzIGNhbGxpbmcgX3JlYWQoKSB0byBmaWxsIHRoZSBidWZmZXJcbiAgLy8gTm90ZTogMCBpcyBhIHZhbGlkIHZhbHVlLCBtZWFucyBcImRvbid0IGNhbGwgX3JlYWQgcHJlZW1wdGl2ZWx5IGV2ZXJcIlxuICB2YXIgaHdtID0gb3B0aW9ucy5oaWdoV2F0ZXJNYXJrO1xuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSAoaHdtIHx8IGh3bSA9PT0gMCkgPyBod20gOiAxNiAqIDEwMjQ7XG5cbiAgLy8gY2FzdCB0byBpbnRzLlxuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSB+fnRoaXMuaGlnaFdhdGVyTWFyaztcblxuICB0aGlzLmJ1ZmZlciA9IFtdO1xuICB0aGlzLmxlbmd0aCA9IDA7XG4gIHRoaXMucGlwZXMgPSBudWxsO1xuICB0aGlzLnBpcGVzQ291bnQgPSAwO1xuICB0aGlzLmZsb3dpbmcgPSBmYWxzZTtcbiAgdGhpcy5lbmRlZCA9IGZhbHNlO1xuICB0aGlzLmVuZEVtaXR0ZWQgPSBmYWxzZTtcbiAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG5cbiAgLy8gSW4gc3RyZWFtcyB0aGF0IG5ldmVyIGhhdmUgYW55IGRhdGEsIGFuZCBkbyBwdXNoKG51bGwpIHJpZ2h0IGF3YXksXG4gIC8vIHRoZSBjb25zdW1lciBjYW4gbWlzcyB0aGUgJ2VuZCcgZXZlbnQgaWYgdGhleSBkbyBzb21lIEkvTyBiZWZvcmVcbiAgLy8gY29uc3VtaW5nIHRoZSBzdHJlYW0uICBTbywgd2UgZG9uJ3QgZW1pdCgnZW5kJykgdW50aWwgc29tZSByZWFkaW5nXG4gIC8vIGhhcHBlbnMuXG4gIHRoaXMuY2FsbGVkUmVhZCA9IGZhbHNlO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWN1YXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIHdoZW5ldmVyIHdlIHJldHVybiBudWxsLCB0aGVuIHdlIHNldCBhIGZsYWcgdG8gc2F5XG4gIC8vIHRoYXQgd2UncmUgYXdhaXRpbmcgYSAncmVhZGFibGUnIGV2ZW50IGVtaXNzaW9uLlxuICB0aGlzLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLnJlYWRhYmxlTGlzdGVuaW5nID0gZmFsc2U7XG5cblxuICAvLyBvYmplY3Qgc3RyZWFtIGZsYWcuIFVzZWQgdG8gbWFrZSByZWFkKG4pIGlnbm9yZSBuIGFuZCB0b1xuICAvLyBtYWtlIGFsbCB0aGUgYnVmZmVyIG1lcmdpbmcgYW5kIGxlbmd0aCBjaGVja3MgZ28gYXdheVxuICB0aGlzLm9iamVjdE1vZGUgPSAhIW9wdGlvbnMub2JqZWN0TW9kZTtcblxuICAvLyBDcnlwdG8gaXMga2luZCBvZiBvbGQgYW5kIGNydXN0eS4gIEhpc3RvcmljYWxseSwgaXRzIGRlZmF1bHQgc3RyaW5nXG4gIC8vIGVuY29kaW5nIGlzICdiaW5hcnknIHNvIHdlIGhhdmUgdG8gbWFrZSB0aGlzIGNvbmZpZ3VyYWJsZS5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGluIHRoZSB1bml2ZXJzZSB1c2VzICd1dGY4JywgdGhvdWdoLlxuICB0aGlzLmRlZmF1bHRFbmNvZGluZyA9IG9wdGlvbnMuZGVmYXVsdEVuY29kaW5nIHx8ICd1dGY4JztcblxuICAvLyB3aGVuIHBpcGluZywgd2Ugb25seSBjYXJlIGFib3V0ICdyZWFkYWJsZScgZXZlbnRzIHRoYXQgaGFwcGVuXG4gIC8vIGFmdGVyIHJlYWQoKWluZyBhbGwgdGhlIGJ5dGVzIGFuZCBub3QgZ2V0dGluZyBhbnkgcHVzaGJhY2suXG4gIHRoaXMucmFuT3V0ID0gZmFsc2U7XG5cbiAgLy8gdGhlIG51bWJlciBvZiB3cml0ZXJzIHRoYXQgYXJlIGF3YWl0aW5nIGEgZHJhaW4gZXZlbnQgaW4gLnBpcGUoKXNcbiAgdGhpcy5hd2FpdERyYWluID0gMDtcblxuICAvLyBpZiB0cnVlLCBhIG1heWJlUmVhZE1vcmUgaGFzIGJlZW4gc2NoZWR1bGVkXG4gIHRoaXMucmVhZGluZ01vcmUgPSBmYWxzZTtcblxuICB0aGlzLmRlY29kZXIgPSBudWxsO1xuICB0aGlzLmVuY29kaW5nID0gbnVsbDtcbiAgaWYgKG9wdGlvbnMuZW5jb2RpbmcpIHtcbiAgICBpZiAoIVN0cmluZ0RlY29kZXIpXG4gICAgICBTdHJpbmdEZWNvZGVyID0gcmVxdWlyZSgnc3RyaW5nX2RlY29kZXInKS5TdHJpbmdEZWNvZGVyO1xuICAgIHRoaXMuZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKG9wdGlvbnMuZW5jb2RpbmcpO1xuICAgIHRoaXMuZW5jb2RpbmcgPSBvcHRpb25zLmVuY29kaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIFJlYWRhYmxlKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlYWRhYmxlKSlcbiAgICByZXR1cm4gbmV3IFJlYWRhYmxlKG9wdGlvbnMpO1xuXG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUgPSBuZXcgUmVhZGFibGVTdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyBsZWdhY3lcbiAgdGhpcy5yZWFkYWJsZSA9IHRydWU7XG5cbiAgU3RyZWFtLmNhbGwodGhpcyk7XG59XG5cbi8vIE1hbnVhbGx5IHNob3ZlIHNvbWV0aGluZyBpbnRvIHRoZSByZWFkKCkgYnVmZmVyLlxuLy8gVGhpcyByZXR1cm5zIHRydWUgaWYgdGhlIGhpZ2hXYXRlck1hcmsgaGFzIG5vdCBiZWVuIGhpdCB5ZXQsXG4vLyBzaW1pbGFyIHRvIGhvdyBXcml0YWJsZS53cml0ZSgpIHJldHVybnMgdHJ1ZSBpZiB5b3Ugc2hvdWxkXG4vLyB3cml0ZSgpIHNvbWUgbW9yZS5cblJlYWRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgaWYgKHR5cGVvZiBjaHVuayA9PT0gJ3N0cmluZycgJiYgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICBlbmNvZGluZyA9IGVuY29kaW5nIHx8IHN0YXRlLmRlZmF1bHRFbmNvZGluZztcbiAgICBpZiAoZW5jb2RpbmcgIT09IHN0YXRlLmVuY29kaW5nKSB7XG4gICAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmssIGVuY29kaW5nKTtcbiAgICAgIGVuY29kaW5nID0gJyc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgZmFsc2UpO1xufTtcblxuLy8gVW5zaGlmdCBzaG91bGQgKmFsd2F5cyogYmUgc29tZXRoaW5nIGRpcmVjdGx5IG91dCBvZiByZWFkKClcblJlYWRhYmxlLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24oY2h1bmspIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCAnJywgdHJ1ZSk7XG59O1xuXG5mdW5jdGlvbiByZWFkYWJsZUFkZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgYWRkVG9Gcm9udCkge1xuICB2YXIgZXIgPSBjaHVua0ludmFsaWQoc3RhdGUsIGNodW5rKTtcbiAgaWYgKGVyKSB7XG4gICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICB9IGVsc2UgaWYgKGNodW5rID09PSBudWxsIHx8IGNodW5rID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gICAgaWYgKCFzdGF0ZS5lbmRlZClcbiAgICAgIG9uRW9mQ2h1bmsoc3RyZWFtLCBzdGF0ZSk7XG4gIH0gZWxzZSBpZiAoc3RhdGUub2JqZWN0TW9kZSB8fCBjaHVuayAmJiBjaHVuay5sZW5ndGggPiAwKSB7XG4gICAgaWYgKHN0YXRlLmVuZGVkICYmICFhZGRUb0Zyb250KSB7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcignc3RyZWFtLnB1c2goKSBhZnRlciBFT0YnKTtcbiAgICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGUpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUuZW5kRW1pdHRlZCAmJiBhZGRUb0Zyb250KSB7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcignc3RyZWFtLnVuc2hpZnQoKSBhZnRlciBlbmQgZXZlbnQnKTtcbiAgICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhYWRkVG9Gcm9udCAmJiAhZW5jb2RpbmcpXG4gICAgICAgIGNodW5rID0gc3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgYnVmZmVyIGluZm8uXG4gICAgICBzdGF0ZS5sZW5ndGggKz0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG4gICAgICBpZiAoYWRkVG9Gcm9udCkge1xuICAgICAgICBzdGF0ZS5idWZmZXIudW5zaGlmdChjaHVuayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRlLm5lZWRSZWFkYWJsZSlcbiAgICAgICAgZW1pdFJlYWRhYmxlKHN0cmVhbSk7XG5cbiAgICAgIG1heWJlUmVhZE1vcmUoc3RyZWFtLCBzdGF0ZSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKCFhZGRUb0Zyb250KSB7XG4gICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIG5lZWRNb3JlRGF0YShzdGF0ZSk7XG59XG5cblxuXG4vLyBpZiBpdCdzIHBhc3QgdGhlIGhpZ2ggd2F0ZXIgbWFyaywgd2UgY2FuIHB1c2ggaW4gc29tZSBtb3JlLlxuLy8gQWxzbywgaWYgd2UgaGF2ZSBubyBkYXRhIHlldCwgd2UgY2FuIHN0YW5kIHNvbWVcbi8vIG1vcmUgYnl0ZXMuICBUaGlzIGlzIHRvIHdvcmsgYXJvdW5kIGNhc2VzIHdoZXJlIGh3bT0wLFxuLy8gc3VjaCBhcyB0aGUgcmVwbC4gIEFsc28sIGlmIHRoZSBwdXNoKCkgdHJpZ2dlcmVkIGFcbi8vIHJlYWRhYmxlIGV2ZW50LCBhbmQgdGhlIHVzZXIgY2FsbGVkIHJlYWQobGFyZ2VOdW1iZXIpIHN1Y2ggdGhhdFxuLy8gbmVlZFJlYWRhYmxlIHdhcyBzZXQsIHRoZW4gd2Ugb3VnaHQgdG8gcHVzaCBtb3JlLCBzbyB0aGF0IGFub3RoZXJcbi8vICdyZWFkYWJsZScgZXZlbnQgd2lsbCBiZSB0cmlnZ2VyZWQuXG5mdW5jdGlvbiBuZWVkTW9yZURhdGEoc3RhdGUpIHtcbiAgcmV0dXJuICFzdGF0ZS5lbmRlZCAmJlxuICAgICAgICAgKHN0YXRlLm5lZWRSZWFkYWJsZSB8fFxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcmsgfHxcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPT09IDApO1xufVxuXG4vLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cblJlYWRhYmxlLnByb3RvdHlwZS5zZXRFbmNvZGluZyA9IGZ1bmN0aW9uKGVuYykge1xuICBpZiAoIVN0cmluZ0RlY29kZXIpXG4gICAgU3RyaW5nRGVjb2RlciA9IHJlcXVpcmUoJ3N0cmluZ19kZWNvZGVyJykuU3RyaW5nRGVjb2RlcjtcbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5kZWNvZGVyID0gbmV3IFN0cmluZ0RlY29kZXIoZW5jKTtcbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5lbmNvZGluZyA9IGVuYztcbn07XG5cbi8vIERvbid0IHJhaXNlIHRoZSBod20gPiAxMjhNQlxudmFyIE1BWF9IV00gPSAweDgwMDAwMDtcbmZ1bmN0aW9uIHJvdW5kVXBUb05leHRQb3dlck9mMihuKSB7XG4gIGlmIChuID49IE1BWF9IV00pIHtcbiAgICBuID0gTUFYX0hXTTtcbiAgfSBlbHNlIHtcbiAgICAvLyBHZXQgdGhlIG5leHQgaGlnaGVzdCBwb3dlciBvZiAyXG4gICAgbi0tO1xuICAgIGZvciAodmFyIHAgPSAxOyBwIDwgMzI7IHAgPDw9IDEpIG4gfD0gbiA+PiBwO1xuICAgIG4rKztcbiAgfVxuICByZXR1cm4gbjtcbn1cblxuZnVuY3Rpb24gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmIHN0YXRlLmVuZGVkKVxuICAgIHJldHVybiAwO1xuXG4gIGlmIChzdGF0ZS5vYmplY3RNb2RlKVxuICAgIHJldHVybiBuID09PSAwID8gMCA6IDE7XG5cbiAgaWYgKGlzTmFOKG4pIHx8IG4gPT09IG51bGwpIHtcbiAgICAvLyBvbmx5IGZsb3cgb25lIGJ1ZmZlciBhdCBhIHRpbWVcbiAgICBpZiAoc3RhdGUuZmxvd2luZyAmJiBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgICAgcmV0dXJuIHN0YXRlLmJ1ZmZlclswXS5sZW5ndGg7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHN0YXRlLmxlbmd0aDtcbiAgfVxuXG4gIGlmIChuIDw9IDApXG4gICAgcmV0dXJuIDA7XG5cbiAgLy8gSWYgd2UncmUgYXNraW5nIGZvciBtb3JlIHRoYW4gdGhlIHRhcmdldCBidWZmZXIgbGV2ZWwsXG4gIC8vIHRoZW4gcmFpc2UgdGhlIHdhdGVyIG1hcmsuICBCdW1wIHVwIHRvIHRoZSBuZXh0IGhpZ2hlc3RcbiAgLy8gcG93ZXIgb2YgMiwgdG8gcHJldmVudCBpbmNyZWFzaW5nIGl0IGV4Y2Vzc2l2ZWx5IGluIHRpbnlcbiAgLy8gYW1vdW50cy5cbiAgaWYgKG4gPiBzdGF0ZS5oaWdoV2F0ZXJNYXJrKVxuICAgIHN0YXRlLmhpZ2hXYXRlck1hcmsgPSByb3VuZFVwVG9OZXh0UG93ZXJPZjIobik7XG5cbiAgLy8gZG9uJ3QgaGF2ZSB0aGF0IG11Y2guICByZXR1cm4gbnVsbCwgdW5sZXNzIHdlJ3ZlIGVuZGVkLlxuICBpZiAobiA+IHN0YXRlLmxlbmd0aCkge1xuICAgIGlmICghc3RhdGUuZW5kZWQpIHtcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBzdGF0ZS5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gbjtcbn1cblxuLy8geW91IGNhbiBvdmVycmlkZSBlaXRoZXIgdGhpcyBtZXRob2QsIG9yIHRoZSBhc3luYyBfcmVhZChuKSBiZWxvdy5cblJlYWRhYmxlLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICBzdGF0ZS5jYWxsZWRSZWFkID0gdHJ1ZTtcbiAgdmFyIG5PcmlnID0gbjtcblxuICBpZiAodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPiAwKVxuICAgIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuXG4gIC8vIGlmIHdlJ3JlIGRvaW5nIHJlYWQoMCkgdG8gdHJpZ2dlciBhIHJlYWRhYmxlIGV2ZW50LCBidXQgd2VcbiAgLy8gYWxyZWFkeSBoYXZlIGEgYnVuY2ggb2YgZGF0YSBpbiB0aGUgYnVmZmVyLCB0aGVuIGp1c3QgdHJpZ2dlclxuICAvLyB0aGUgJ3JlYWRhYmxlJyBldmVudCBhbmQgbW92ZSBvbi5cbiAgaWYgKG4gPT09IDAgJiZcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSAmJlxuICAgICAgKHN0YXRlLmxlbmd0aCA+PSBzdGF0ZS5oaWdoV2F0ZXJNYXJrIHx8IHN0YXRlLmVuZGVkKSkge1xuICAgIGVtaXRSZWFkYWJsZSh0aGlzKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIG4gPSBob3dNdWNoVG9SZWFkKG4sIHN0YXRlKTtcblxuICAvLyBpZiB3ZSd2ZSBlbmRlZCwgYW5kIHdlJ3JlIG5vdyBjbGVhciwgdGhlbiBmaW5pc2ggaXQgdXAuXG4gIGlmIChuID09PSAwICYmIHN0YXRlLmVuZGVkKSB7XG4gICAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICAgIGVuZFJlYWRhYmxlKHRoaXMpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gQWxsIHRoZSBhY3R1YWwgY2h1bmsgZ2VuZXJhdGlvbiBsb2dpYyBuZWVkcyB0byBiZVxuICAvLyAqYmVsb3cqIHRoZSBjYWxsIHRvIF9yZWFkLiAgVGhlIHJlYXNvbiBpcyB0aGF0IGluIGNlcnRhaW5cbiAgLy8gc3ludGhldGljIHN0cmVhbSBjYXNlcywgc3VjaCBhcyBwYXNzdGhyb3VnaCBzdHJlYW1zLCBfcmVhZFxuICAvLyBtYXkgYmUgYSBjb21wbGV0ZWx5IHN5bmNocm9ub3VzIG9wZXJhdGlvbiB3aGljaCBtYXkgY2hhbmdlXG4gIC8vIHRoZSBzdGF0ZSBvZiB0aGUgcmVhZCBidWZmZXIsIHByb3ZpZGluZyBlbm91Z2ggZGF0YSB3aGVuXG4gIC8vIGJlZm9yZSB0aGVyZSB3YXMgKm5vdCogZW5vdWdoLlxuICAvL1xuICAvLyBTbywgdGhlIHN0ZXBzIGFyZTpcbiAgLy8gMS4gRmlndXJlIG91dCB3aGF0IHRoZSBzdGF0ZSBvZiB0aGluZ3Mgd2lsbCBiZSBhZnRlciB3ZSBkb1xuICAvLyBhIHJlYWQgZnJvbSB0aGUgYnVmZmVyLlxuICAvL1xuICAvLyAyLiBJZiB0aGF0IHJlc3VsdGluZyBzdGF0ZSB3aWxsIHRyaWdnZXIgYSBfcmVhZCwgdGhlbiBjYWxsIF9yZWFkLlxuICAvLyBOb3RlIHRoYXQgdGhpcyBtYXkgYmUgYXN5bmNocm9ub3VzLCBvciBzeW5jaHJvbm91cy4gIFllcywgaXQgaXNcbiAgLy8gZGVlcGx5IHVnbHkgdG8gd3JpdGUgQVBJcyB0aGlzIHdheSwgYnV0IHRoYXQgc3RpbGwgZG9lc24ndCBtZWFuXG4gIC8vIHRoYXQgdGhlIFJlYWRhYmxlIGNsYXNzIHNob3VsZCBiZWhhdmUgaW1wcm9wZXJseSwgYXMgc3RyZWFtcyBhcmVcbiAgLy8gZGVzaWduZWQgdG8gYmUgc3luYy9hc3luYyBhZ25vc3RpYy5cbiAgLy8gVGFrZSBub3RlIGlmIHRoZSBfcmVhZCBjYWxsIGlzIHN5bmMgb3IgYXN5bmMgKGllLCBpZiB0aGUgcmVhZCBjYWxsXG4gIC8vIGhhcyByZXR1cm5lZCB5ZXQpLCBzbyB0aGF0IHdlIGtub3cgd2hldGhlciBvciBub3QgaXQncyBzYWZlIHRvIGVtaXRcbiAgLy8gJ3JlYWRhYmxlJyBldGMuXG4gIC8vXG4gIC8vIDMuIEFjdHVhbGx5IHB1bGwgdGhlIHJlcXVlc3RlZCBjaHVua3Mgb3V0IG9mIHRoZSBidWZmZXIgYW5kIHJldHVybi5cblxuICAvLyBpZiB3ZSBuZWVkIGEgcmVhZGFibGUgZXZlbnQsIHRoZW4gd2UgbmVlZCB0byBkbyBzb21lIHJlYWRpbmcuXG4gIHZhciBkb1JlYWQgPSBzdGF0ZS5uZWVkUmVhZGFibGU7XG5cbiAgLy8gaWYgd2UgY3VycmVudGx5IGhhdmUgbGVzcyB0aGFuIHRoZSBoaWdoV2F0ZXJNYXJrLCB0aGVuIGFsc28gcmVhZCBzb21lXG4gIGlmIChzdGF0ZS5sZW5ndGggLSBuIDw9IHN0YXRlLmhpZ2hXYXRlck1hcmspXG4gICAgZG9SZWFkID0gdHJ1ZTtcblxuICAvLyBob3dldmVyLCBpZiB3ZSd2ZSBlbmRlZCwgdGhlbiB0aGVyZSdzIG5vIHBvaW50LCBhbmQgaWYgd2UncmUgYWxyZWFkeVxuICAvLyByZWFkaW5nLCB0aGVuIGl0J3MgdW5uZWNlc3NhcnkuXG4gIGlmIChzdGF0ZS5lbmRlZCB8fCBzdGF0ZS5yZWFkaW5nKVxuICAgIGRvUmVhZCA9IGZhbHNlO1xuXG4gIGlmIChkb1JlYWQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gdHJ1ZTtcbiAgICBzdGF0ZS5zeW5jID0gdHJ1ZTtcbiAgICAvLyBpZiB0aGUgbGVuZ3RoIGlzIGN1cnJlbnRseSB6ZXJvLCB0aGVuIHdlICpuZWVkKiBhIHJlYWRhYmxlIGV2ZW50LlxuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIC8vIGNhbGwgaW50ZXJuYWwgcmVhZCBtZXRob2RcbiAgICB0aGlzLl9yZWFkKHN0YXRlLmhpZ2hXYXRlck1hcmspO1xuICAgIHN0YXRlLnN5bmMgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIElmIF9yZWFkIGNhbGxlZCBpdHMgY2FsbGJhY2sgc3luY2hyb25vdXNseSwgdGhlbiBgcmVhZGluZ2BcbiAgLy8gd2lsbCBiZSBmYWxzZSwgYW5kIHdlIG5lZWQgdG8gcmUtZXZhbHVhdGUgaG93IG11Y2ggZGF0YSB3ZVxuICAvLyBjYW4gcmV0dXJuIHRvIHRoZSB1c2VyLlxuICBpZiAoZG9SZWFkICYmICFzdGF0ZS5yZWFkaW5nKVxuICAgIG4gPSBob3dNdWNoVG9SZWFkKG5PcmlnLCBzdGF0ZSk7XG5cbiAgdmFyIHJldDtcbiAgaWYgKG4gPiAwKVxuICAgIHJldCA9IGZyb21MaXN0KG4sIHN0YXRlKTtcbiAgZWxzZVxuICAgIHJldCA9IG51bGw7XG5cbiAgaWYgKHJldCA9PT0gbnVsbCkge1xuICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgbiA9IDA7XG4gIH1cblxuICBzdGF0ZS5sZW5ndGggLT0gbjtcblxuICAvLyBJZiB3ZSBoYXZlIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlciwgdGhlbiB3ZSB3YW50IHRvIGtub3dcbiAgLy8gYXMgc29vbiBhcyB3ZSAqZG8qIGdldCBzb21ldGhpbmcgaW50byB0aGUgYnVmZmVyLlxuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmICFzdGF0ZS5lbmRlZClcbiAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuXG4gIC8vIElmIHdlIGhhcHBlbmVkIHRvIHJlYWQoKSBleGFjdGx5IHRoZSByZW1haW5pbmcgYW1vdW50IGluIHRoZVxuICAvLyBidWZmZXIsIGFuZCB0aGUgRU9GIGhhcyBiZWVuIHNlZW4gYXQgdGhpcyBwb2ludCwgdGhlbiBtYWtlIHN1cmVcbiAgLy8gdGhhdCB3ZSBlbWl0ICdlbmQnIG9uIHRoZSB2ZXJ5IG5leHQgdGljay5cbiAgaWYgKHN0YXRlLmVuZGVkICYmICFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICBlbmRSZWFkYWJsZSh0aGlzKTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gY2h1bmtJbnZhbGlkKHN0YXRlLCBjaHVuaykge1xuICB2YXIgZXIgPSBudWxsO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgJiZcbiAgICAgICdzdHJpbmcnICE9PSB0eXBlb2YgY2h1bmsgJiZcbiAgICAgIGNodW5rICE9PSBudWxsICYmXG4gICAgICBjaHVuayAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhc3RhdGUub2JqZWN0TW9kZSAmJlxuICAgICAgIWVyKSB7XG4gICAgZXIgPSBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG5vbi1zdHJpbmcvYnVmZmVyIGNodW5rJyk7XG4gIH1cbiAgcmV0dXJuIGVyO1xufVxuXG5cbmZ1bmN0aW9uIG9uRW9mQ2h1bmsoc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhc3RhdGUuZW5kZWQpIHtcbiAgICB2YXIgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLmVuZCgpO1xuICAgIGlmIChjaHVuayAmJiBjaHVuay5sZW5ndGgpIHtcbiAgICAgIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtcbiAgICAgIHN0YXRlLmxlbmd0aCArPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcbiAgICB9XG4gIH1cbiAgc3RhdGUuZW5kZWQgPSB0cnVlO1xuXG4gIC8vIGlmIHdlJ3ZlIGVuZGVkIGFuZCB3ZSBoYXZlIHNvbWUgZGF0YSBsZWZ0LCB0aGVuIGVtaXRcbiAgLy8gJ3JlYWRhYmxlJyBub3cgdG8gbWFrZSBzdXJlIGl0IGdldHMgcGlja2VkIHVwLlxuICBpZiAoc3RhdGUubGVuZ3RoID4gMClcbiAgICBlbWl0UmVhZGFibGUoc3RyZWFtKTtcbiAgZWxzZVxuICAgIGVuZFJlYWRhYmxlKHN0cmVhbSk7XG59XG5cbi8vIERvbid0IGVtaXQgcmVhZGFibGUgcmlnaHQgYXdheSBpbiBzeW5jIG1vZGUsIGJlY2F1c2UgdGhpcyBjYW4gdHJpZ2dlclxuLy8gYW5vdGhlciByZWFkKCkgY2FsbCA9PiBzdGFjayBvdmVyZmxvdy4gIFRoaXMgd2F5LCBpdCBtaWdodCB0cmlnZ2VyXG4vLyBhIG5leHRUaWNrIHJlY3Vyc2lvbiB3YXJuaW5nLCBidXQgdGhhdCdzIG5vdCBzbyBiYWQuXG5mdW5jdGlvbiBlbWl0UmVhZGFibGUoc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgc3RhdGUubmVlZFJlYWRhYmxlID0gZmFsc2U7XG4gIGlmIChzdGF0ZS5lbWl0dGVkUmVhZGFibGUpXG4gICAgcmV0dXJuO1xuXG4gIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IHRydWU7XG4gIGlmIChzdGF0ZS5zeW5jKVxuICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgIGVtaXRSZWFkYWJsZV8oc3RyZWFtKTtcbiAgICB9KTtcbiAgZWxzZVxuICAgIGVtaXRSZWFkYWJsZV8oc3RyZWFtKTtcbn1cblxuZnVuY3Rpb24gZW1pdFJlYWRhYmxlXyhzdHJlYW0pIHtcbiAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG59XG5cblxuLy8gYXQgdGhpcyBwb2ludCwgdGhlIHVzZXIgaGFzIHByZXN1bWFibHkgc2VlbiB0aGUgJ3JlYWRhYmxlJyBldmVudCxcbi8vIGFuZCBjYWxsZWQgcmVhZCgpIHRvIGNvbnN1bWUgc29tZSBkYXRhLiAgdGhhdCBtYXkgaGF2ZSB0cmlnZ2VyZWRcbi8vIGluIHR1cm4gYW5vdGhlciBfcmVhZChuKSBjYWxsLCBpbiB3aGljaCBjYXNlIHJlYWRpbmcgPSB0cnVlIGlmXG4vLyBpdCdzIGluIHByb2dyZXNzLlxuLy8gSG93ZXZlciwgaWYgd2UncmUgbm90IGVuZGVkLCBvciByZWFkaW5nLCBhbmQgdGhlIGxlbmd0aCA8IGh3bSxcbi8vIHRoZW4gZ28gYWhlYWQgYW5kIHRyeSB0byByZWFkIHNvbWUgbW9yZSBwcmVlbXB0aXZlbHkuXG5mdW5jdGlvbiBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKCFzdGF0ZS5yZWFkaW5nTW9yZSkge1xuICAgIHN0YXRlLnJlYWRpbmdNb3JlID0gdHJ1ZTtcbiAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICBtYXliZVJlYWRNb3JlXyhzdHJlYW0sIHN0YXRlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXliZVJlYWRNb3JlXyhzdHJlYW0sIHN0YXRlKSB7XG4gIHZhciBsZW4gPSBzdGF0ZS5sZW5ndGg7XG4gIHdoaWxlICghc3RhdGUucmVhZGluZyAmJiAhc3RhdGUuZmxvd2luZyAmJiAhc3RhdGUuZW5kZWQgJiZcbiAgICAgICAgIHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcmspIHtcbiAgICBzdHJlYW0ucmVhZCgwKTtcbiAgICBpZiAobGVuID09PSBzdGF0ZS5sZW5ndGgpXG4gICAgICAvLyBkaWRuJ3QgZ2V0IGFueSBkYXRhLCBzdG9wIHNwaW5uaW5nLlxuICAgICAgYnJlYWs7XG4gICAgZWxzZVxuICAgICAgbGVuID0gc3RhdGUubGVuZ3RoO1xuICB9XG4gIHN0YXRlLnJlYWRpbmdNb3JlID0gZmFsc2U7XG59XG5cbi8vIGFic3RyYWN0IG1ldGhvZC4gIHRvIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgaW1wbGVtZW50YXRpb24gY2xhc3Nlcy5cbi8vIGNhbGwgY2IoZXIsIGRhdGEpIHdoZXJlIGRhdGEgaXMgPD0gbiBpbiBsZW5ndGguXG4vLyBmb3IgdmlydHVhbCAobm9uLXN0cmluZywgbm9uLWJ1ZmZlcikgc3RyZWFtcywgXCJsZW5ndGhcIiBpcyBzb21ld2hhdFxuLy8gYXJiaXRyYXJ5LCBhbmQgcGVyaGFwcyBub3QgdmVyeSBtZWFuaW5nZnVsLlxuUmVhZGFibGUucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKSk7XG59O1xuXG5SZWFkYWJsZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRlc3QsIHBpcGVPcHRzKSB7XG4gIHZhciBzcmMgPSB0aGlzO1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIHN3aXRjaCAoc3RhdGUucGlwZXNDb3VudCkge1xuICAgIGNhc2UgMDpcbiAgICAgIHN0YXRlLnBpcGVzID0gZGVzdDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMTpcbiAgICAgIHN0YXRlLnBpcGVzID0gW3N0YXRlLnBpcGVzLCBkZXN0XTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBzdGF0ZS5waXBlcy5wdXNoKGRlc3QpO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgc3RhdGUucGlwZXNDb3VudCArPSAxO1xuXG4gIHZhciBkb0VuZCA9ICghcGlwZU9wdHMgfHwgcGlwZU9wdHMuZW5kICE9PSBmYWxzZSkgJiZcbiAgICAgICAgICAgICAgZGVzdCAhPT0gcHJvY2Vzcy5zdGRvdXQgJiZcbiAgICAgICAgICAgICAgZGVzdCAhPT0gcHJvY2Vzcy5zdGRlcnI7XG5cbiAgdmFyIGVuZEZuID0gZG9FbmQgPyBvbmVuZCA6IGNsZWFudXA7XG4gIGlmIChzdGF0ZS5lbmRFbWl0dGVkKVxuICAgIHNldEltbWVkaWF0ZShlbmRGbik7XG4gIGVsc2VcbiAgICBzcmMub25jZSgnZW5kJywgZW5kRm4pO1xuXG4gIGRlc3Qub24oJ3VucGlwZScsIG9udW5waXBlKTtcbiAgZnVuY3Rpb24gb251bnBpcGUocmVhZGFibGUpIHtcbiAgICBpZiAocmVhZGFibGUgIT09IHNyYykgcmV0dXJuO1xuICAgIGNsZWFudXAoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uZW5kKCkge1xuICAgIGRlc3QuZW5kKCk7XG4gIH1cblxuICAvLyB3aGVuIHRoZSBkZXN0IGRyYWlucywgaXQgcmVkdWNlcyB0aGUgYXdhaXREcmFpbiBjb3VudGVyXG4gIC8vIG9uIHRoZSBzb3VyY2UuICBUaGlzIHdvdWxkIGJlIG1vcmUgZWxlZ2FudCB3aXRoIGEgLm9uY2UoKVxuICAvLyBoYW5kbGVyIGluIGZsb3coKSwgYnV0IGFkZGluZyBhbmQgcmVtb3ZpbmcgcmVwZWF0ZWRseSBpc1xuICAvLyB0b28gc2xvdy5cbiAgdmFyIG9uZHJhaW4gPSBwaXBlT25EcmFpbihzcmMpO1xuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgLy8gY2xlYW51cCBldmVudCBoYW5kbGVycyBvbmNlIHRoZSBwaXBlIGlzIGJyb2tlblxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZmluaXNoJywgb25maW5pc2gpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25kcmFpbik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCd1bnBpcGUnLCBvbnVucGlwZSk7XG4gICAgc3JjLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbmVuZCk7XG4gICAgc3JjLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBjbGVhbnVwKTtcblxuICAgIC8vIGlmIHRoZSByZWFkZXIgaXMgd2FpdGluZyBmb3IgYSBkcmFpbiBldmVudCBmcm9tIHRoaXNcbiAgICAvLyBzcGVjaWZpYyB3cml0ZXIsIHRoZW4gaXQgd291bGQgY2F1c2UgaXQgdG8gbmV2ZXIgc3RhcnRcbiAgICAvLyBmbG93aW5nIGFnYWluLlxuICAgIC8vIFNvLCBpZiB0aGlzIGlzIGF3YWl0aW5nIGEgZHJhaW4sIHRoZW4gd2UganVzdCBjYWxsIGl0IG5vdy5cbiAgICAvLyBJZiB3ZSBkb24ndCBrbm93LCB0aGVuIGFzc3VtZSB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBvbmUuXG4gICAgaWYgKCFkZXN0Ll93cml0YWJsZVN0YXRlIHx8IGRlc3QuX3dyaXRhYmxlU3RhdGUubmVlZERyYWluKVxuICAgICAgb25kcmFpbigpO1xuICB9XG5cbiAgLy8gaWYgdGhlIGRlc3QgaGFzIGFuIGVycm9yLCB0aGVuIHN0b3AgcGlwaW5nIGludG8gaXQuXG4gIC8vIGhvd2V2ZXIsIGRvbid0IHN1cHByZXNzIHRoZSB0aHJvd2luZyBiZWhhdmlvciBmb3IgdGhpcy5cbiAgLy8gY2hlY2sgZm9yIGxpc3RlbmVycyBiZWZvcmUgZW1pdCByZW1vdmVzIG9uZS10aW1lIGxpc3RlbmVycy5cbiAgdmFyIGVyckxpc3RlbmVycyA9IEVFLmxpc3RlbmVyQ291bnQoZGVzdCwgJ2Vycm9yJyk7XG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICB1bnBpcGUoKTtcbiAgICBpZiAoZXJyTGlzdGVuZXJzID09PSAwICYmIEVFLmxpc3RlbmVyQ291bnQoZGVzdCwgJ2Vycm9yJykgPT09IDApXG4gICAgICBkZXN0LmVtaXQoJ2Vycm9yJywgZXIpO1xuICB9XG4gIGRlc3Qub25jZSgnZXJyb3InLCBvbmVycm9yKTtcblxuICAvLyBCb3RoIGNsb3NlIGFuZCBmaW5pc2ggc2hvdWxkIHRyaWdnZXIgdW5waXBlLCBidXQgb25seSBvbmNlLlxuICBmdW5jdGlvbiBvbmNsb3NlKCkge1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcbiAgICB1bnBpcGUoKTtcbiAgfVxuICBkZXN0Lm9uY2UoJ2Nsb3NlJywgb25jbG9zZSk7XG4gIGZ1bmN0aW9uIG9uZmluaXNoKCkge1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG4gICAgdW5waXBlKCk7XG4gIH1cbiAgZGVzdC5vbmNlKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG5cbiAgZnVuY3Rpb24gdW5waXBlKCkge1xuICAgIHNyYy51bnBpcGUoZGVzdCk7XG4gIH1cblxuICAvLyB0ZWxsIHRoZSBkZXN0IHRoYXQgaXQncyBiZWluZyBwaXBlZCB0b1xuICBkZXN0LmVtaXQoJ3BpcGUnLCBzcmMpO1xuXG4gIC8vIHN0YXJ0IHRoZSBmbG93IGlmIGl0IGhhc24ndCBiZWVuIHN0YXJ0ZWQgYWxyZWFkeS5cbiAgaWYgKCFzdGF0ZS5mbG93aW5nKSB7XG4gICAgLy8gdGhlIGhhbmRsZXIgdGhhdCB3YWl0cyBmb3IgcmVhZGFibGUgZXZlbnRzIGFmdGVyIGFsbFxuICAgIC8vIHRoZSBkYXRhIGdldHMgc3Vja2VkIG91dCBpbiBmbG93LlxuICAgIC8vIFRoaXMgd291bGQgYmUgZWFzaWVyIHRvIGZvbGxvdyB3aXRoIGEgLm9uY2UoKSBoYW5kbGVyXG4gICAgLy8gaW4gZmxvdygpLCBidXQgdGhhdCBpcyB0b28gc2xvdy5cbiAgICB0aGlzLm9uKCdyZWFkYWJsZScsIHBpcGVPblJlYWRhYmxlKTtcblxuICAgIHN0YXRlLmZsb3dpbmcgPSB0cnVlO1xuICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgIGZsb3coc3JjKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkZXN0O1xufTtcblxuZnVuY3Rpb24gcGlwZU9uRHJhaW4oc3JjKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVzdCA9IHRoaXM7XG4gICAgdmFyIHN0YXRlID0gc3JjLl9yZWFkYWJsZVN0YXRlO1xuICAgIHN0YXRlLmF3YWl0RHJhaW4tLTtcbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbiA9PT0gMClcbiAgICAgIGZsb3coc3JjKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZmxvdyhzcmMpIHtcbiAgdmFyIHN0YXRlID0gc3JjLl9yZWFkYWJsZVN0YXRlO1xuICB2YXIgY2h1bms7XG4gIHN0YXRlLmF3YWl0RHJhaW4gPSAwO1xuXG4gIGZ1bmN0aW9uIHdyaXRlKGRlc3QsIGksIGxpc3QpIHtcbiAgICB2YXIgd3JpdHRlbiA9IGRlc3Qud3JpdGUoY2h1bmspO1xuICAgIGlmIChmYWxzZSA9PT0gd3JpdHRlbikge1xuICAgICAgc3RhdGUuYXdhaXREcmFpbisrO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChzdGF0ZS5waXBlc0NvdW50ICYmIG51bGwgIT09IChjaHVuayA9IHNyYy5yZWFkKCkpKSB7XG5cbiAgICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSlcbiAgICAgIHdyaXRlKHN0YXRlLnBpcGVzLCAwLCBudWxsKTtcbiAgICBlbHNlXG4gICAgICBmb3JFYWNoKHN0YXRlLnBpcGVzLCB3cml0ZSk7XG5cbiAgICBzcmMuZW1pdCgnZGF0YScsIGNodW5rKTtcblxuICAgIC8vIGlmIGFueW9uZSBuZWVkcyBhIGRyYWluLCB0aGVuIHdlIGhhdmUgdG8gd2FpdCBmb3IgdGhhdC5cbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbiA+IDApXG4gICAgICByZXR1cm47XG4gIH1cblxuICAvLyBpZiBldmVyeSBkZXN0aW5hdGlvbiB3YXMgdW5waXBlZCwgZWl0aGVyIGJlZm9yZSBlbnRlcmluZyB0aGlzXG4gIC8vIGZ1bmN0aW9uLCBvciBpbiB0aGUgd2hpbGUgbG9vcCwgdGhlbiBzdG9wIGZsb3dpbmcuXG4gIC8vXG4gIC8vIE5COiBUaGlzIGlzIGEgcHJldHR5IHJhcmUgZWRnZSBjYXNlLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMCkge1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcblxuICAgIC8vIGlmIHRoZXJlIHdlcmUgZGF0YSBldmVudCBsaXN0ZW5lcnMgYWRkZWQsIHRoZW4gc3dpdGNoIHRvIG9sZCBtb2RlLlxuICAgIGlmIChFRS5saXN0ZW5lckNvdW50KHNyYywgJ2RhdGEnKSA+IDApXG4gICAgICBlbWl0RGF0YUV2ZW50cyhzcmMpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGF0IHRoaXMgcG9pbnQsIG5vIG9uZSBuZWVkZWQgYSBkcmFpbiwgc28gd2UganVzdCByYW4gb3V0IG9mIGRhdGFcbiAgLy8gb24gdGhlIG5leHQgcmVhZGFibGUgZXZlbnQsIHN0YXJ0IGl0IG92ZXIgYWdhaW4uXG4gIHN0YXRlLnJhbk91dCA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIHBpcGVPblJlYWRhYmxlKCkge1xuICBpZiAodGhpcy5fcmVhZGFibGVTdGF0ZS5yYW5PdXQpIHtcbiAgICB0aGlzLl9yZWFkYWJsZVN0YXRlLnJhbk91dCA9IGZhbHNlO1xuICAgIGZsb3codGhpcyk7XG4gIH1cbn1cblxuXG5SZWFkYWJsZS5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24oZGVzdCkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIC8vIGlmIHdlJ3JlIG5vdCBwaXBpbmcgYW55d2hlcmUsIHRoZW4gZG8gbm90aGluZy5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDApXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8ganVzdCBvbmUgZGVzdGluYXRpb24uICBtb3N0IGNvbW1vbiBjYXNlLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSkge1xuICAgIC8vIHBhc3NlZCBpbiBvbmUsIGJ1dCBpdCdzIG5vdCB0aGUgcmlnaHQgb25lLlxuICAgIGlmIChkZXN0ICYmIGRlc3QgIT09IHN0YXRlLnBpcGVzKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAoIWRlc3QpXG4gICAgICBkZXN0ID0gc3RhdGUucGlwZXM7XG5cbiAgICAvLyBnb3QgYSBtYXRjaC5cbiAgICBzdGF0ZS5waXBlcyA9IG51bGw7XG4gICAgc3RhdGUucGlwZXNDb3VudCA9IDA7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuICAgIGlmIChkZXN0KVxuICAgICAgZGVzdC5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNsb3cgY2FzZS4gbXVsdGlwbGUgcGlwZSBkZXN0aW5hdGlvbnMuXG5cbiAgaWYgKCFkZXN0KSB7XG4gICAgLy8gcmVtb3ZlIGFsbC5cbiAgICB2YXIgZGVzdHMgPSBzdGF0ZS5waXBlcztcbiAgICB2YXIgbGVuID0gc3RhdGUucGlwZXNDb3VudDtcbiAgICBzdGF0ZS5waXBlcyA9IG51bGw7XG4gICAgc3RhdGUucGlwZXNDb3VudCA9IDA7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGRlc3RzW2ldLmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gdHJ5IHRvIGZpbmQgdGhlIHJpZ2h0IG9uZS5cbiAgdmFyIGkgPSBpbmRleE9mKHN0YXRlLnBpcGVzLCBkZXN0KTtcbiAgaWYgKGkgPT09IC0xKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIHN0YXRlLnBpcGVzLnNwbGljZShpLCAxKTtcbiAgc3RhdGUucGlwZXNDb3VudCAtPSAxO1xuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSlcbiAgICBzdGF0ZS5waXBlcyA9IHN0YXRlLnBpcGVzWzBdO1xuXG4gIGRlc3QuZW1pdCgndW5waXBlJywgdGhpcyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBzZXQgdXAgZGF0YSBldmVudHMgaWYgdGhleSBhcmUgYXNrZWQgZm9yXG4vLyBFbnN1cmUgcmVhZGFibGUgbGlzdGVuZXJzIGV2ZW50dWFsbHkgZ2V0IHNvbWV0aGluZ1xuUmVhZGFibGUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXYsIGZuKSB7XG4gIHZhciByZXMgPSBTdHJlYW0ucHJvdG90eXBlLm9uLmNhbGwodGhpcywgZXYsIGZuKTtcblxuICBpZiAoZXYgPT09ICdkYXRhJyAmJiAhdGhpcy5fcmVhZGFibGVTdGF0ZS5mbG93aW5nKVxuICAgIGVtaXREYXRhRXZlbnRzKHRoaXMpO1xuXG4gIGlmIChldiA9PT0gJ3JlYWRhYmxlJyAmJiB0aGlzLnJlYWRhYmxlKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgICBpZiAoIXN0YXRlLnJlYWRhYmxlTGlzdGVuaW5nKSB7XG4gICAgICBzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZyA9IHRydWU7XG4gICAgICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgICBpZiAoIXN0YXRlLnJlYWRpbmcpIHtcbiAgICAgICAgdGhpcy5yZWFkKDApO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgZW1pdFJlYWRhYmxlKHRoaXMsIHN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcblJlYWRhYmxlLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IFJlYWRhYmxlLnByb3RvdHlwZS5vbjtcblxuLy8gcGF1c2UoKSBhbmQgcmVzdW1lKCkgYXJlIHJlbW5hbnRzIG9mIHRoZSBsZWdhY3kgcmVhZGFibGUgc3RyZWFtIEFQSVxuLy8gSWYgdGhlIHVzZXIgdXNlcyB0aGVtLCB0aGVuIHN3aXRjaCBpbnRvIG9sZCBtb2RlLlxuUmVhZGFibGUucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuICBlbWl0RGF0YUV2ZW50cyh0aGlzKTtcbiAgdGhpcy5yZWFkKDApO1xuICB0aGlzLmVtaXQoJ3Jlc3VtZScpO1xufTtcblxuUmVhZGFibGUucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gIGVtaXREYXRhRXZlbnRzKHRoaXMsIHRydWUpO1xuICB0aGlzLmVtaXQoJ3BhdXNlJyk7XG59O1xuXG5mdW5jdGlvbiBlbWl0RGF0YUV2ZW50cyhzdHJlYW0sIHN0YXJ0UGF1c2VkKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcblxuICBpZiAoc3RhdGUuZmxvd2luZykge1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3MvcmVhZGFibGUtc3RyZWFtL2lzc3Vlcy8xNlxuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHN3aXRjaCB0byBvbGQgbW9kZSBub3cuJyk7XG4gIH1cblxuICB2YXIgcGF1c2VkID0gc3RhcnRQYXVzZWQgfHwgZmFsc2U7XG4gIHZhciByZWFkYWJsZSA9IGZhbHNlO1xuXG4gIC8vIGNvbnZlcnQgdG8gYW4gb2xkLXN0eWxlIHN0cmVhbS5cbiAgc3RyZWFtLnJlYWRhYmxlID0gdHJ1ZTtcbiAgc3RyZWFtLnBpcGUgPSBTdHJlYW0ucHJvdG90eXBlLnBpcGU7XG4gIHN0cmVhbS5vbiA9IHN0cmVhbS5hZGRMaXN0ZW5lciA9IFN0cmVhbS5wcm90b3R5cGUub247XG5cbiAgc3RyZWFtLm9uKCdyZWFkYWJsZScsIGZ1bmN0aW9uKCkge1xuICAgIHJlYWRhYmxlID0gdHJ1ZTtcblxuICAgIHZhciBjO1xuICAgIHdoaWxlICghcGF1c2VkICYmIChudWxsICE9PSAoYyA9IHN0cmVhbS5yZWFkKCkpKSlcbiAgICAgIHN0cmVhbS5lbWl0KCdkYXRhJywgYyk7XG5cbiAgICBpZiAoYyA9PT0gbnVsbCkge1xuICAgICAgcmVhZGFibGUgPSBmYWxzZTtcbiAgICAgIHN0cmVhbS5fcmVhZGFibGVTdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgc3RyZWFtLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgcGF1c2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVtaXQoJ3BhdXNlJyk7XG4gIH07XG5cbiAgc3RyZWFtLnJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhdXNlZCA9IGZhbHNlO1xuICAgIGlmIChyZWFkYWJsZSlcbiAgICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG4gICAgICB9KTtcbiAgICBlbHNlXG4gICAgICB0aGlzLnJlYWQoMCk7XG4gICAgdGhpcy5lbWl0KCdyZXN1bWUnKTtcbiAgfTtcblxuICAvLyBub3cgbWFrZSBpdCBzdGFydCwganVzdCBpbiBjYXNlIGl0IGhhZG4ndCBhbHJlYWR5LlxuICBzdHJlYW0uZW1pdCgncmVhZGFibGUnKTtcbn1cblxuLy8gd3JhcCBhbiBvbGQtc3R5bGUgc3RyZWFtIGFzIHRoZSBhc3luYyBkYXRhIHNvdXJjZS5cbi8vIFRoaXMgaXMgKm5vdCogcGFydCBvZiB0aGUgcmVhZGFibGUgc3RyZWFtIGludGVyZmFjZS5cbi8vIEl0IGlzIGFuIHVnbHkgdW5mb3J0dW5hdGUgbWVzcyBvZiBoaXN0b3J5LlxuUmVhZGFibGUucHJvdG90eXBlLndyYXAgPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIHBhdXNlZCA9IGZhbHNlO1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgc3RyZWFtLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhc3RhdGUuZW5kZWQpIHtcbiAgICAgIHZhciBjaHVuayA9IHN0YXRlLmRlY29kZXIuZW5kKCk7XG4gICAgICBpZiAoY2h1bmsgJiYgY2h1bmsubGVuZ3RoKVxuICAgICAgICBzZWxmLnB1c2goY2h1bmspO1xuICAgIH1cblxuICAgIHNlbGYucHVzaChudWxsKTtcbiAgfSk7XG5cbiAgc3RyZWFtLm9uKCdkYXRhJywgZnVuY3Rpb24oY2h1bmspIHtcbiAgICBpZiAoc3RhdGUuZGVjb2RlcilcbiAgICAgIGNodW5rID0gc3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7XG4gICAgaWYgKCFjaHVuayB8fCAhc3RhdGUub2JqZWN0TW9kZSAmJiAhY2h1bmsubGVuZ3RoKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIHJldCA9IHNlbGYucHVzaChjaHVuayk7XG4gICAgaWYgKCFyZXQpIHtcbiAgICAgIHBhdXNlZCA9IHRydWU7XG4gICAgICBzdHJlYW0ucGF1c2UoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHByb3h5IGFsbCB0aGUgb3RoZXIgbWV0aG9kcy5cbiAgLy8gaW1wb3J0YW50IHdoZW4gd3JhcHBpbmcgZmlsdGVycyBhbmQgZHVwbGV4ZXMuXG4gIGZvciAodmFyIGkgaW4gc3RyZWFtKSB7XG4gICAgaWYgKHR5cGVvZiBzdHJlYW1baV0gPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgdHlwZW9mIHRoaXNbaV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzW2ldID0gZnVuY3Rpb24obWV0aG9kKSB7IHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbVttZXRob2RdLmFwcGx5KHN0cmVhbSwgYXJndW1lbnRzKTtcbiAgICAgIH19KGkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHByb3h5IGNlcnRhaW4gaW1wb3J0YW50IGV2ZW50cy5cbiAgdmFyIGV2ZW50cyA9IFsnZXJyb3InLCAnY2xvc2UnLCAnZGVzdHJveScsICdwYXVzZScsICdyZXN1bWUnXTtcbiAgZm9yRWFjaChldmVudHMsIGZ1bmN0aW9uKGV2KSB7XG4gICAgc3RyZWFtLm9uKGV2LCBmdW5jdGlvbiAoeCkge1xuICAgICAgcmV0dXJuIHNlbGYuZW1pdC5hcHBseShzZWxmLCBldiwgeCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHdoZW4gd2UgdHJ5IHRvIGNvbnN1bWUgc29tZSBtb3JlIGJ5dGVzLCBzaW1wbHkgdW5wYXVzZSB0aGVcbiAgLy8gdW5kZXJseWluZyBzdHJlYW0uXG4gIHNlbGYuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKHBhdXNlZCkge1xuICAgICAgcGF1c2VkID0gZmFsc2U7XG4gICAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufTtcblxuXG5cbi8vIGV4cG9zZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seS5cblJlYWRhYmxlLl9mcm9tTGlzdCA9IGZyb21MaXN0O1xuXG4vLyBQbHVjayBvZmYgbiBieXRlcyBmcm9tIGFuIGFycmF5IG9mIGJ1ZmZlcnMuXG4vLyBMZW5ndGggaXMgdGhlIGNvbWJpbmVkIGxlbmd0aHMgb2YgYWxsIHRoZSBidWZmZXJzIGluIHRoZSBsaXN0LlxuZnVuY3Rpb24gZnJvbUxpc3Qobiwgc3RhdGUpIHtcbiAgdmFyIGxpc3QgPSBzdGF0ZS5idWZmZXI7XG4gIHZhciBsZW5ndGggPSBzdGF0ZS5sZW5ndGg7XG4gIHZhciBzdHJpbmdNb2RlID0gISFzdGF0ZS5kZWNvZGVyO1xuICB2YXIgb2JqZWN0TW9kZSA9ICEhc3RhdGUub2JqZWN0TW9kZTtcbiAgdmFyIHJldDtcblxuICAvLyBub3RoaW5nIGluIHRoZSBsaXN0LCBkZWZpbml0ZWx5IGVtcHR5LlxuICBpZiAobGlzdC5sZW5ndGggPT09IDApXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgaWYgKGxlbmd0aCA9PT0gMClcbiAgICByZXQgPSBudWxsO1xuICBlbHNlIGlmIChvYmplY3RNb2RlKVxuICAgIHJldCA9IGxpc3Quc2hpZnQoKTtcbiAgZWxzZSBpZiAoIW4gfHwgbiA+PSBsZW5ndGgpIHtcbiAgICAvLyByZWFkIGl0IGFsbCwgdHJ1bmNhdGUgdGhlIGFycmF5LlxuICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgcmV0ID0gbGlzdC5qb2luKCcnKTtcbiAgICBlbHNlXG4gICAgICByZXQgPSBCdWZmZXIuY29uY2F0KGxpc3QsIGxlbmd0aCk7XG4gICAgbGlzdC5sZW5ndGggPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIHJlYWQganVzdCBzb21lIG9mIGl0LlxuICAgIGlmIChuIDwgbGlzdFswXS5sZW5ndGgpIHtcbiAgICAgIC8vIGp1c3QgdGFrZSBhIHBhcnQgb2YgdGhlIGZpcnN0IGxpc3QgaXRlbS5cbiAgICAgIC8vIHNsaWNlIGlzIHRoZSBzYW1lIGZvciBidWZmZXJzIGFuZCBzdHJpbmdzLlxuICAgICAgdmFyIGJ1ZiA9IGxpc3RbMF07XG4gICAgICByZXQgPSBidWYuc2xpY2UoMCwgbik7XG4gICAgICBsaXN0WzBdID0gYnVmLnNsaWNlKG4pO1xuICAgIH0gZWxzZSBpZiAobiA9PT0gbGlzdFswXS5sZW5ndGgpIHtcbiAgICAgIC8vIGZpcnN0IGxpc3QgaXMgYSBwZXJmZWN0IG1hdGNoXG4gICAgICByZXQgPSBsaXN0LnNoaWZ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNvbXBsZXggY2FzZS5cbiAgICAgIC8vIHdlIGhhdmUgZW5vdWdoIHRvIGNvdmVyIGl0LCBidXQgaXQgc3BhbnMgcGFzdCB0aGUgZmlyc3QgYnVmZmVyLlxuICAgICAgaWYgKHN0cmluZ01vZGUpXG4gICAgICAgIHJldCA9ICcnO1xuICAgICAgZWxzZVxuICAgICAgICByZXQgPSBuZXcgQnVmZmVyKG4pO1xuXG4gICAgICB2YXIgYyA9IDA7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbCAmJiBjIDwgbjsgaSsrKSB7XG4gICAgICAgIHZhciBidWYgPSBsaXN0WzBdO1xuICAgICAgICB2YXIgY3B5ID0gTWF0aC5taW4obiAtIGMsIGJ1Zi5sZW5ndGgpO1xuXG4gICAgICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgICAgIHJldCArPSBidWYuc2xpY2UoMCwgY3B5KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGJ1Zi5jb3B5KHJldCwgYywgMCwgY3B5KTtcblxuICAgICAgICBpZiAoY3B5IDwgYnVmLmxlbmd0aClcbiAgICAgICAgICBsaXN0WzBdID0gYnVmLnNsaWNlKGNweSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBsaXN0LnNoaWZ0KCk7XG5cbiAgICAgICAgYyArPSBjcHk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZW5kUmVhZGFibGUoc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcblxuICAvLyBJZiB3ZSBnZXQgaGVyZSBiZWZvcmUgY29uc3VtaW5nIGFsbCB0aGUgYnl0ZXMsIHRoZW4gdGhhdCBpcyBhXG4gIC8vIGJ1ZyBpbiBub2RlLiAgU2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgaWYgKHN0YXRlLmxlbmd0aCA+IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdlbmRSZWFkYWJsZSBjYWxsZWQgb24gbm9uLWVtcHR5IHN0cmVhbScpO1xuXG4gIGlmICghc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5jYWxsZWRSZWFkKSB7XG4gICAgc3RhdGUuZW5kZWQgPSB0cnVlO1xuICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgIC8vIENoZWNrIHRoYXQgd2UgZGlkbid0IGdldCBvbmUgbGFzdCB1bnNoaWZ0LlxuICAgICAgaWYgKCFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGF0ZS5lbmRFbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgc3RyZWFtLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIHN0cmVhbS5lbWl0KCdlbmQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JFYWNoICh4cywgZikge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGYoeHNbaV0sIGkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluZGV4T2YgKHhzLCB4KSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHhzW2ldID09PSB4KSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpKSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIHRyYW5zZm9ybSBzdHJlYW0gaXMgYSByZWFkYWJsZS93cml0YWJsZSBzdHJlYW0gd2hlcmUgeW91IGRvXG4vLyBzb21ldGhpbmcgd2l0aCB0aGUgZGF0YS4gIFNvbWV0aW1lcyBpdCdzIGNhbGxlZCBhIFwiZmlsdGVyXCIsXG4vLyBidXQgdGhhdCdzIG5vdCBhIGdyZWF0IG5hbWUgZm9yIGl0LCBzaW5jZSB0aGF0IGltcGxpZXMgYSB0aGluZyB3aGVyZVxuLy8gc29tZSBiaXRzIHBhc3MgdGhyb3VnaCwgYW5kIG90aGVycyBhcmUgc2ltcGx5IGlnbm9yZWQuICAoVGhhdCB3b3VsZFxuLy8gYmUgYSB2YWxpZCBleGFtcGxlIG9mIGEgdHJhbnNmb3JtLCBvZiBjb3Vyc2UuKVxuLy9cbi8vIFdoaWxlIHRoZSBvdXRwdXQgaXMgY2F1c2FsbHkgcmVsYXRlZCB0byB0aGUgaW5wdXQsIGl0J3Mgbm90IGFcbi8vIG5lY2Vzc2FyaWx5IHN5bW1ldHJpYyBvciBzeW5jaHJvbm91cyB0cmFuc2Zvcm1hdGlvbi4gIEZvciBleGFtcGxlLFxuLy8gYSB6bGliIHN0cmVhbSBtaWdodCB0YWtlIG11bHRpcGxlIHBsYWluLXRleHQgd3JpdGVzKCksIGFuZCB0aGVuXG4vLyBlbWl0IGEgc2luZ2xlIGNvbXByZXNzZWQgY2h1bmsgc29tZSB0aW1lIGluIHRoZSBmdXR1cmUuXG4vL1xuLy8gSGVyZSdzIGhvdyB0aGlzIHdvcmtzOlxuLy9cbi8vIFRoZSBUcmFuc2Zvcm0gc3RyZWFtIGhhcyBhbGwgdGhlIGFzcGVjdHMgb2YgdGhlIHJlYWRhYmxlIGFuZCB3cml0YWJsZVxuLy8gc3RyZWFtIGNsYXNzZXMuICBXaGVuIHlvdSB3cml0ZShjaHVuayksIHRoYXQgY2FsbHMgX3dyaXRlKGNodW5rLGNiKVxuLy8gaW50ZXJuYWxseSwgYW5kIHJldHVybnMgZmFsc2UgaWYgdGhlcmUncyBhIGxvdCBvZiBwZW5kaW5nIHdyaXRlc1xuLy8gYnVmZmVyZWQgdXAuICBXaGVuIHlvdSBjYWxsIHJlYWQoKSwgdGhhdCBjYWxscyBfcmVhZChuKSB1bnRpbFxuLy8gdGhlcmUncyBlbm91Z2ggcGVuZGluZyByZWFkYWJsZSBkYXRhIGJ1ZmZlcmVkIHVwLlxuLy9cbi8vIEluIGEgdHJhbnNmb3JtIHN0cmVhbSwgdGhlIHdyaXR0ZW4gZGF0YSBpcyBwbGFjZWQgaW4gYSBidWZmZXIuICBXaGVuXG4vLyBfcmVhZChuKSBpcyBjYWxsZWQsIGl0IHRyYW5zZm9ybXMgdGhlIHF1ZXVlZCB1cCBkYXRhLCBjYWxsaW5nIHRoZVxuLy8gYnVmZmVyZWQgX3dyaXRlIGNiJ3MgYXMgaXQgY29uc3VtZXMgY2h1bmtzLiAgSWYgY29uc3VtaW5nIGEgc2luZ2xlXG4vLyB3cml0dGVuIGNodW5rIHdvdWxkIHJlc3VsdCBpbiBtdWx0aXBsZSBvdXRwdXQgY2h1bmtzLCB0aGVuIHRoZSBmaXJzdFxuLy8gb3V0cHV0dGVkIGJpdCBjYWxscyB0aGUgcmVhZGNiLCBhbmQgc3Vic2VxdWVudCBjaHVua3MganVzdCBnbyBpbnRvXG4vLyB0aGUgcmVhZCBidWZmZXIsIGFuZCB3aWxsIGNhdXNlIGl0IHRvIGVtaXQgJ3JlYWRhYmxlJyBpZiBuZWNlc3NhcnkuXG4vL1xuLy8gVGhpcyB3YXksIGJhY2stcHJlc3N1cmUgaXMgYWN0dWFsbHkgZGV0ZXJtaW5lZCBieSB0aGUgcmVhZGluZyBzaWRlLFxuLy8gc2luY2UgX3JlYWQgaGFzIHRvIGJlIGNhbGxlZCB0byBzdGFydCBwcm9jZXNzaW5nIGEgbmV3IGNodW5rLiAgSG93ZXZlcixcbi8vIGEgcGF0aG9sb2dpY2FsIGluZmxhdGUgdHlwZSBvZiB0cmFuc2Zvcm0gY2FuIGNhdXNlIGV4Y2Vzc2l2ZSBidWZmZXJpbmdcbi8vIGhlcmUuICBGb3IgZXhhbXBsZSwgaW1hZ2luZSBhIHN0cmVhbSB3aGVyZSBldmVyeSBieXRlIG9mIGlucHV0IGlzXG4vLyBpbnRlcnByZXRlZCBhcyBhbiBpbnRlZ2VyIGZyb20gMC0yNTUsIGFuZCB0aGVuIHJlc3VsdHMgaW4gdGhhdCBtYW55XG4vLyBieXRlcyBvZiBvdXRwdXQuICBXcml0aW5nIHRoZSA0IGJ5dGVzIHtmZixmZixmZixmZn0gd291bGQgcmVzdWx0IGluXG4vLyAxa2Igb2YgZGF0YSBiZWluZyBvdXRwdXQuICBJbiB0aGlzIGNhc2UsIHlvdSBjb3VsZCB3cml0ZSBhIHZlcnkgc21hbGxcbi8vIGFtb3VudCBvZiBpbnB1dCwgYW5kIGVuZCB1cCB3aXRoIGEgdmVyeSBsYXJnZSBhbW91bnQgb2Ygb3V0cHV0LiAgSW5cbi8vIHN1Y2ggYSBwYXRob2xvZ2ljYWwgaW5mbGF0aW5nIG1lY2hhbmlzbSwgdGhlcmUnZCBiZSBubyB3YXkgdG8gdGVsbFxuLy8gdGhlIHN5c3RlbSB0byBzdG9wIGRvaW5nIHRoZSB0cmFuc2Zvcm0uICBBIHNpbmdsZSA0TUIgd3JpdGUgY291bGRcbi8vIGNhdXNlIHRoZSBzeXN0ZW0gdG8gcnVuIG91dCBvZiBtZW1vcnkuXG4vL1xuLy8gSG93ZXZlciwgZXZlbiBpbiBzdWNoIGEgcGF0aG9sb2dpY2FsIGNhc2UsIG9ubHkgYSBzaW5nbGUgd3JpdHRlbiBjaHVua1xuLy8gd291bGQgYmUgY29uc3VtZWQsIGFuZCB0aGVuIHRoZSByZXN0IHdvdWxkIHdhaXQgKHVuLXRyYW5zZm9ybWVkKSB1bnRpbFxuLy8gdGhlIHJlc3VsdHMgb2YgdGhlIHByZXZpb3VzIHRyYW5zZm9ybWVkIGNodW5rIHdlcmUgY29uc3VtZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xuXG52YXIgRHVwbGV4ID0gcmVxdWlyZSgnLi9kdXBsZXguanMnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5pbmhlcml0cyhUcmFuc2Zvcm0sIER1cGxleCk7XG5cblxuZnVuY3Rpb24gVHJhbnNmb3JtU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIHRoaXMuYWZ0ZXJUcmFuc2Zvcm0gPSBmdW5jdGlvbihlciwgZGF0YSkge1xuICAgIHJldHVybiBhZnRlclRyYW5zZm9ybShzdHJlYW0sIGVyLCBkYXRhKTtcbiAgfTtcblxuICB0aGlzLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgdGhpcy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcbiAgdGhpcy53cml0ZWNiID0gbnVsbDtcbiAgdGhpcy53cml0ZWNodW5rID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gYWZ0ZXJUcmFuc2Zvcm0oc3RyZWFtLCBlciwgZGF0YSkge1xuICB2YXIgdHMgPSBzdHJlYW0uX3RyYW5zZm9ybVN0YXRlO1xuICB0cy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcblxuICB2YXIgY2IgPSB0cy53cml0ZWNiO1xuXG4gIGlmICghY2IpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm8gd3JpdGVjYiBpbiBUcmFuc2Zvcm0gY2xhc3MnKSk7XG5cbiAgdHMud3JpdGVjaHVuayA9IG51bGw7XG4gIHRzLndyaXRlY2IgPSBudWxsO1xuXG4gIGlmIChkYXRhICE9PSBudWxsICYmIGRhdGEgIT09IHVuZGVmaW5lZClcbiAgICBzdHJlYW0ucHVzaChkYXRhKTtcblxuICBpZiAoY2IpXG4gICAgY2IoZXIpO1xuXG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgcnMucmVhZGluZyA9IGZhbHNlO1xuICBpZiAocnMubmVlZFJlYWRhYmxlIHx8IHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspIHtcbiAgICBzdHJlYW0uX3JlYWQocnMuaGlnaFdhdGVyTWFyayk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBUcmFuc2Zvcm0ob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVHJhbnNmb3JtKSlcbiAgICByZXR1cm4gbmV3IFRyYW5zZm9ybShvcHRpb25zKTtcblxuICBEdXBsZXguY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZSA9IG5ldyBUcmFuc2Zvcm1TdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyB3aGVuIHRoZSB3cml0YWJsZSBzaWRlIGZpbmlzaGVzLCB0aGVuIGZsdXNoIG91dCBhbnl0aGluZyByZW1haW5pbmcuXG4gIHZhciBzdHJlYW0gPSB0aGlzO1xuXG4gIC8vIHN0YXJ0IG91dCBhc2tpbmcgZm9yIGEgcmVhZGFibGUgZXZlbnQgb25jZSBkYXRhIGlzIHRyYW5zZm9ybWVkLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG5cbiAgLy8gd2UgaGF2ZSBpbXBsZW1lbnRlZCB0aGUgX3JlYWQgbWV0aG9kLCBhbmQgZG9uZSB0aGUgb3RoZXIgdGhpbmdzXG4gIC8vIHRoYXQgUmVhZGFibGUgd2FudHMgYmVmb3JlIHRoZSBmaXJzdCBfcmVhZCBjYWxsLCBzbyB1bnNldCB0aGVcbiAgLy8gc3luYyBndWFyZCBmbGFnLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLnN5bmMgPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2ZpbmlzaCcsIGZ1bmN0aW9uKCkge1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5fZmx1c2gpXG4gICAgICB0aGlzLl9mbHVzaChmdW5jdGlvbihlcikge1xuICAgICAgICBkb25lKHN0cmVhbSwgZXIpO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgZG9uZShzdHJlYW0pO1xuICB9KTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nKSB7XG4gIHRoaXMuX3RyYW5zZm9ybVN0YXRlLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgcmV0dXJuIER1cGxleC5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIGNodW5rLCBlbmNvZGluZyk7XG59O1xuXG4vLyBUaGlzIGlzIHRoZSBwYXJ0IHdoZXJlIHlvdSBkbyBzdHVmZiFcbi8vIG92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gaW4gaW1wbGVtZW50YXRpb24gY2xhc3Nlcy5cbi8vICdjaHVuaycgaXMgYW4gaW5wdXQgY2h1bmsuXG4vL1xuLy8gQ2FsbCBgcHVzaChuZXdDaHVuaylgIHRvIHBhc3MgYWxvbmcgdHJhbnNmb3JtZWQgb3V0cHV0XG4vLyB0byB0aGUgcmVhZGFibGUgc2lkZS4gIFlvdSBtYXkgY2FsbCAncHVzaCcgemVybyBvciBtb3JlIHRpbWVzLlxuLy9cbi8vIENhbGwgYGNiKGVycilgIHdoZW4geW91IGFyZSBkb25lIHdpdGggdGhpcyBjaHVuay4gIElmIHlvdSBwYXNzXG4vLyBhbiBlcnJvciwgdGhlbiB0aGF0J2xsIHB1dCB0aGUgaHVydCBvbiB0aGUgd2hvbGUgb3BlcmF0aW9uLiAgSWYgeW91XG4vLyBuZXZlciBjYWxsIGNiKCksIHRoZW4geW91J2xsIG5ldmVyIGdldCBhbm90aGVyIGNodW5rLlxuVHJhbnNmb3JtLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlO1xuICB0cy53cml0ZWNiID0gY2I7XG4gIHRzLndyaXRlY2h1bmsgPSBjaHVuaztcbiAgdHMud3JpdGVlbmNvZGluZyA9IGVuY29kaW5nO1xuICBpZiAoIXRzLnRyYW5zZm9ybWluZykge1xuICAgIHZhciBycyA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKHRzLm5lZWRUcmFuc2Zvcm0gfHxcbiAgICAgICAgcnMubmVlZFJlYWRhYmxlIHx8XG4gICAgICAgIHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspXG4gICAgICB0aGlzLl9yZWFkKHJzLmhpZ2hXYXRlck1hcmspO1xuICB9XG59O1xuXG4vLyBEb2Vzbid0IG1hdHRlciB3aGF0IHRoZSBhcmdzIGFyZSBoZXJlLlxuLy8gX3RyYW5zZm9ybSBkb2VzIGFsbCB0aGUgd29yay5cbi8vIFRoYXQgd2UgZ290IGhlcmUgbWVhbnMgdGhhdCB0aGUgcmVhZGFibGUgc2lkZSB3YW50cyBtb3JlIGRhdGEuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAodHMud3JpdGVjaHVuayAmJiB0cy53cml0ZWNiICYmICF0cy50cmFuc2Zvcm1pbmcpIHtcbiAgICB0cy50cmFuc2Zvcm1pbmcgPSB0cnVlO1xuICAgIHRoaXMuX3RyYW5zZm9ybSh0cy53cml0ZWNodW5rLCB0cy53cml0ZWVuY29kaW5nLCB0cy5hZnRlclRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gbWFyayB0aGF0IHdlIG5lZWQgYSB0cmFuc2Zvcm0sIHNvIHRoYXQgYW55IGRhdGEgdGhhdCBjb21lcyBpblxuICAgIC8vIHdpbGwgZ2V0IHByb2Nlc3NlZCwgbm93IHRoYXQgd2UndmUgYXNrZWQgZm9yIGl0LlxuICAgIHRzLm5lZWRUcmFuc2Zvcm0gPSB0cnVlO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGRvbmUoc3RyZWFtLCBlcikge1xuICBpZiAoZXIpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcblxuICAvLyBpZiB0aGVyZSdzIG5vdGhpbmcgaW4gdGhlIHdyaXRlIGJ1ZmZlciwgdGhlbiB0aGF0IG1lYW5zXG4gIC8vIHRoYXQgbm90aGluZyBtb3JlIHdpbGwgZXZlciBiZSBwcm92aWRlZFxuICB2YXIgd3MgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIHRzID0gc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAod3MubGVuZ3RoKVxuICAgIHRocm93IG5ldyBFcnJvcignY2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHdzLmxlbmd0aCAhPSAwJyk7XG5cbiAgaWYgKHRzLnRyYW5zZm9ybWluZylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxpbmcgdHJhbnNmb3JtIGRvbmUgd2hlbiBzdGlsbCB0cmFuc2Zvcm1pbmcnKTtcblxuICByZXR1cm4gc3RyZWFtLnB1c2gobnVsbCk7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gQSBiaXQgc2ltcGxlciB0aGFuIHJlYWRhYmxlIHN0cmVhbXMuXG4vLyBJbXBsZW1lbnQgYW4gYXN5bmMgLl93cml0ZShjaHVuaywgY2IpLCBhbmQgaXQnbGwgaGFuZGxlIGFsbFxuLy8gdGhlIGRyYWluIGV2ZW50IGVtaXNzaW9uIGFuZCBidWZmZXJpbmcuXG5cbm1vZHVsZS5leHBvcnRzID0gV3JpdGFibGU7XG5Xcml0YWJsZS5Xcml0YWJsZVN0YXRlID0gV3JpdGFibGVTdGF0ZTtcblxudmFyIGlzVWludDhBcnJheSA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJ1xuICA/IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4IGluc3RhbmNlb2YgVWludDhBcnJheSB9XG4gIDogZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4geCAmJiB4LmNvbnN0cnVjdG9yICYmIHguY29uc3RydWN0b3IubmFtZSA9PT0gJ1VpbnQ4QXJyYXknXG4gIH1cbjtcbnZhciBpc0FycmF5QnVmZmVyID0gdHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJ1xuICA/IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfVxuICA6IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC5jb25zdHJ1Y3RvciAmJiB4LmNvbnN0cnVjdG9yLm5hbWUgPT09ICdBcnJheUJ1ZmZlcidcbiAgfVxuO1xuXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xudmFyIFN0cmVhbSA9IHJlcXVpcmUoJy4vaW5kZXguanMnKTtcbnZhciBzZXRJbW1lZGlhdGUgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG5cbmluaGVyaXRzKFdyaXRhYmxlLCBTdHJlYW0pO1xuXG5mdW5jdGlvbiBXcml0ZVJlcShjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHRoaXMuY2h1bmsgPSBjaHVuaztcbiAgdGhpcy5lbmNvZGluZyA9IGVuY29kaW5nO1xuICB0aGlzLmNhbGxiYWNrID0gY2I7XG59XG5cbmZ1bmN0aW9uIFdyaXRhYmxlU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHRoZSBwb2ludCBhdCB3aGljaCB3cml0ZSgpIHN0YXJ0cyByZXR1cm5pbmcgZmFsc2VcbiAgLy8gTm90ZTogMCBpcyBhIHZhbGlkIHZhbHVlLCBtZWFucyB0aGF0IHdlIGFsd2F5cyByZXR1cm4gZmFsc2UgaWZcbiAgLy8gdGhlIGVudGlyZSBidWZmZXIgaXMgbm90IGZsdXNoZWQgaW1tZWRpYXRlbHkgb24gd3JpdGUoKVxuICB2YXIgaHdtID0gb3B0aW9ucy5oaWdoV2F0ZXJNYXJrO1xuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSAoaHdtIHx8IGh3bSA9PT0gMCkgPyBod20gOiAxNiAqIDEwMjQ7XG5cbiAgLy8gb2JqZWN0IHN0cmVhbSBmbGFnIHRvIGluZGljYXRlIHdoZXRoZXIgb3Igbm90IHRoaXMgc3RyZWFtXG4gIC8vIGNvbnRhaW5zIGJ1ZmZlcnMgb3Igb2JqZWN0cy5cbiAgdGhpcy5vYmplY3RNb2RlID0gISFvcHRpb25zLm9iamVjdE1vZGU7XG5cbiAgLy8gY2FzdCB0byBpbnRzLlxuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSB+fnRoaXMuaGlnaFdhdGVyTWFyaztcblxuICB0aGlzLm5lZWREcmFpbiA9IGZhbHNlO1xuICAvLyBhdCB0aGUgc3RhcnQgb2YgY2FsbGluZyBlbmQoKVxuICB0aGlzLmVuZGluZyA9IGZhbHNlO1xuICAvLyB3aGVuIGVuZCgpIGhhcyBiZWVuIGNhbGxlZCwgYW5kIHJldHVybmVkXG4gIHRoaXMuZW5kZWQgPSBmYWxzZTtcbiAgLy8gd2hlbiAnZmluaXNoJyBpcyBlbWl0dGVkXG4gIHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcblxuICAvLyBzaG91bGQgd2UgZGVjb2RlIHN0cmluZ3MgaW50byBidWZmZXJzIGJlZm9yZSBwYXNzaW5nIHRvIF93cml0ZT9cbiAgLy8gdGhpcyBpcyBoZXJlIHNvIHRoYXQgc29tZSBub2RlLWNvcmUgc3RyZWFtcyBjYW4gb3B0aW1pemUgc3RyaW5nXG4gIC8vIGhhbmRsaW5nIGF0IGEgbG93ZXIgbGV2ZWwuXG4gIHZhciBub0RlY29kZSA9IG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PT0gZmFsc2U7XG4gIHRoaXMuZGVjb2RlU3RyaW5ncyA9ICFub0RlY29kZTtcblxuICAvLyBDcnlwdG8gaXMga2luZCBvZiBvbGQgYW5kIGNydXN0eS4gIEhpc3RvcmljYWxseSwgaXRzIGRlZmF1bHQgc3RyaW5nXG4gIC8vIGVuY29kaW5nIGlzICdiaW5hcnknIHNvIHdlIGhhdmUgdG8gbWFrZSB0aGlzIGNvbmZpZ3VyYWJsZS5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGluIHRoZSB1bml2ZXJzZSB1c2VzICd1dGY4JywgdGhvdWdoLlxuICB0aGlzLmRlZmF1bHRFbmNvZGluZyA9IG9wdGlvbnMuZGVmYXVsdEVuY29kaW5nIHx8ICd1dGY4JztcblxuICAvLyBub3QgYW4gYWN0dWFsIGJ1ZmZlciB3ZSBrZWVwIHRyYWNrIG9mLCBidXQgYSBtZWFzdXJlbWVudFxuICAvLyBvZiBob3cgbXVjaCB3ZSdyZSB3YWl0aW5nIHRvIGdldCBwdXNoZWQgdG8gc29tZSB1bmRlcmx5aW5nXG4gIC8vIHNvY2tldCBvciBmaWxlLlxuICB0aGlzLmxlbmd0aCA9IDA7XG5cbiAgLy8gYSBmbGFnIHRvIHNlZSB3aGVuIHdlJ3JlIGluIHRoZSBtaWRkbGUgb2YgYSB3cml0ZS5cbiAgdGhpcy53cml0aW5nID0gZmFsc2U7XG5cbiAgLy8gYSBmbGFnIHRvIGJlIGFibGUgdG8gdGVsbCBpZiB0aGUgb253cml0ZSBjYiBpcyBjYWxsZWQgaW1tZWRpYXRlbHksXG4gIC8vIG9yIG9uIGEgbGF0ZXIgdGljay4gIFdlIHNldCB0aGlzIHRvIHRydWUgYXQgZmlyc3QsIGJlY3Vhc2UgYW55XG4gIC8vIGFjdGlvbnMgdGhhdCBzaG91bGRuJ3QgaGFwcGVuIHVudGlsIFwibGF0ZXJcIiBzaG91bGQgZ2VuZXJhbGx5IGFsc29cbiAgLy8gbm90IGhhcHBlbiBiZWZvcmUgdGhlIGZpcnN0IHdyaXRlIGNhbGwuXG4gIHRoaXMuc3luYyA9IHRydWU7XG5cbiAgLy8gYSBmbGFnIHRvIGtub3cgaWYgd2UncmUgcHJvY2Vzc2luZyBwcmV2aW91c2x5IGJ1ZmZlcmVkIGl0ZW1zLCB3aGljaFxuICAvLyBtYXkgY2FsbCB0aGUgX3dyaXRlKCkgY2FsbGJhY2sgaW4gdGhlIHNhbWUgdGljaywgc28gdGhhdCB3ZSBkb24ndFxuICAvLyBlbmQgdXAgaW4gYW4gb3ZlcmxhcHBlZCBvbndyaXRlIHNpdHVhdGlvbi5cbiAgdGhpcy5idWZmZXJQcm9jZXNzaW5nID0gZmFsc2U7XG5cbiAgLy8gdGhlIGNhbGxiYWNrIHRoYXQncyBwYXNzZWQgdG8gX3dyaXRlKGNodW5rLGNiKVxuICB0aGlzLm9ud3JpdGUgPSBmdW5jdGlvbihlcikge1xuICAgIG9ud3JpdGUoc3RyZWFtLCBlcik7XG4gIH07XG5cbiAgLy8gdGhlIGNhbGxiYWNrIHRoYXQgdGhlIHVzZXIgc3VwcGxpZXMgdG8gd3JpdGUoY2h1bmssZW5jb2RpbmcsY2IpXG4gIHRoaXMud3JpdGVjYiA9IG51bGw7XG5cbiAgLy8gdGhlIGFtb3VudCB0aGF0IGlzIGJlaW5nIHdyaXR0ZW4gd2hlbiBfd3JpdGUgaXMgY2FsbGVkLlxuICB0aGlzLndyaXRlbGVuID0gMDtcblxuICB0aGlzLmJ1ZmZlciA9IFtdO1xufVxuXG5mdW5jdGlvbiBXcml0YWJsZShvcHRpb25zKSB7XG4gIC8vIFdyaXRhYmxlIGN0b3IgaXMgYXBwbGllZCB0byBEdXBsZXhlcywgdGhvdWdoIHRoZXkncmUgbm90XG4gIC8vIGluc3RhbmNlb2YgV3JpdGFibGUsIHRoZXkncmUgaW5zdGFuY2VvZiBSZWFkYWJsZS5cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdyaXRhYmxlKSAmJiAhKHRoaXMgaW5zdGFuY2VvZiBTdHJlYW0uRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IFdyaXRhYmxlKG9wdGlvbnMpO1xuXG4gIHRoaXMuX3dyaXRhYmxlU3RhdGUgPSBuZXcgV3JpdGFibGVTdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyBsZWdhY3kuXG4gIHRoaXMud3JpdGFibGUgPSB0cnVlO1xuXG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xufVxuXG4vLyBPdGhlcndpc2UgcGVvcGxlIGNhbiBwaXBlIFdyaXRhYmxlIHN0cmVhbXMsIHdoaWNoIGlzIGp1c3Qgd3JvbmcuXG5Xcml0YWJsZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdDYW5ub3QgcGlwZS4gTm90IHJlYWRhYmxlLicpKTtcbn07XG5cblxuZnVuY3Rpb24gd3JpdGVBZnRlckVuZChzdHJlYW0sIHN0YXRlLCBjYikge1xuICB2YXIgZXIgPSBuZXcgRXJyb3IoJ3dyaXRlIGFmdGVyIGVuZCcpO1xuICAvLyBUT0RPOiBkZWZlciBlcnJvciBldmVudHMgY29uc2lzdGVudGx5IGV2ZXJ5d2hlcmUsIG5vdCBqdXN0IHRoZSBjYlxuICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICBjYihlcik7XG4gIH0pO1xufVxuXG4vLyBJZiB3ZSBnZXQgc29tZXRoaW5nIHRoYXQgaXMgbm90IGEgYnVmZmVyLCBzdHJpbmcsIG51bGwsIG9yIHVuZGVmaW5lZCxcbi8vIGFuZCB3ZSdyZSBub3QgaW4gb2JqZWN0TW9kZSwgdGhlbiB0aGF0J3MgYW4gZXJyb3IuXG4vLyBPdGhlcndpc2Ugc3RyZWFtIGNodW5rcyBhcmUgYWxsIGNvbnNpZGVyZWQgdG8gYmUgb2YgbGVuZ3RoPTEsIGFuZCB0aGVcbi8vIHdhdGVybWFya3MgZGV0ZXJtaW5lIGhvdyBtYW55IG9iamVjdHMgdG8ga2VlcCBpbiB0aGUgYnVmZmVyLCByYXRoZXIgdGhhblxuLy8gaG93IG1hbnkgYnl0ZXMgb3IgY2hhcmFjdGVycy5cbmZ1bmN0aW9uIHZhbGlkQ2h1bmsoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGNiKSB7XG4gIHZhciB2YWxpZCA9IHRydWU7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGNodW5rKSAmJlxuICAgICAgJ3N0cmluZycgIT09IHR5cGVvZiBjaHVuayAmJlxuICAgICAgY2h1bmsgIT09IG51bGwgJiZcbiAgICAgIGNodW5rICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgdmFyIGVyID0gbmV3IFR5cGVFcnJvcignSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuaycpO1xuICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICBjYihlcik7XG4gICAgfSk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHJldCA9IGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGVuY29kaW5nO1xuICAgIGVuY29kaW5nID0gbnVsbDtcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGNodW5rKSAmJiBpc1VpbnQ4QXJyYXkoY2h1bmspKVxuICAgIGNodW5rID0gbmV3IEJ1ZmZlcihjaHVuayk7XG4gIGlmIChpc0FycmF5QnVmZmVyKGNodW5rKSAmJiB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgY2h1bmsgPSBuZXcgQnVmZmVyKG5ldyBVaW50OEFycmF5KGNodW5rKSk7XG4gIFxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSlcbiAgICBlbmNvZGluZyA9ICdidWZmZXInO1xuICBlbHNlIGlmICghZW5jb2RpbmcpXG4gICAgZW5jb2RpbmcgPSBzdGF0ZS5kZWZhdWx0RW5jb2Rpbmc7XG5cbiAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJylcbiAgICBjYiA9IGZ1bmN0aW9uKCkge307XG5cbiAgaWYgKHN0YXRlLmVuZGVkKVxuICAgIHdyaXRlQWZ0ZXJFbmQodGhpcywgc3RhdGUsIGNiKTtcbiAgZWxzZSBpZiAodmFsaWRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssIGNiKSlcbiAgICByZXQgPSB3cml0ZU9yQnVmZmVyKHRoaXMsIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGNiKTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gZGVjb2RlQ2h1bmsoc3RhdGUsIGNodW5rLCBlbmNvZGluZykge1xuICBpZiAoIXN0YXRlLm9iamVjdE1vZGUgJiZcbiAgICAgIHN0YXRlLmRlY29kZVN0cmluZ3MgIT09IGZhbHNlICYmXG4gICAgICB0eXBlb2YgY2h1bmsgPT09ICdzdHJpbmcnKSB7XG4gICAgY2h1bmsgPSBuZXcgQnVmZmVyKGNodW5rLCBlbmNvZGluZyk7XG4gIH1cbiAgcmV0dXJuIGNodW5rO1xufVxuXG4vLyBpZiB3ZSdyZSBhbHJlYWR5IHdyaXRpbmcgc29tZXRoaW5nLCB0aGVuIGp1c3QgcHV0IHRoaXNcbi8vIGluIHRoZSBxdWV1ZSwgYW5kIHdhaXQgb3VyIHR1cm4uICBPdGhlcndpc2UsIGNhbGwgX3dyaXRlXG4vLyBJZiB3ZSByZXR1cm4gZmFsc2UsIHRoZW4gd2UgbmVlZCBhIGRyYWluIGV2ZW50LCBzbyBzZXQgdGhhdCBmbGFnLlxuZnVuY3Rpb24gd3JpdGVPckJ1ZmZlcihzdHJlYW0sIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNodW5rID0gZGVjb2RlQ2h1bmsoc3RhdGUsIGNodW5rLCBlbmNvZGluZyk7XG4gIHZhciBsZW4gPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcblxuICBzdGF0ZS5sZW5ndGggKz0gbGVuO1xuXG4gIHZhciByZXQgPSBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrO1xuICBzdGF0ZS5uZWVkRHJhaW4gPSAhcmV0O1xuXG4gIGlmIChzdGF0ZS53cml0aW5nKVxuICAgIHN0YXRlLmJ1ZmZlci5wdXNoKG5ldyBXcml0ZVJlcShjaHVuaywgZW5jb2RpbmcsIGNiKSk7XG4gIGVsc2VcbiAgICBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgc3RhdGUud3JpdGVsZW4gPSBsZW47XG4gIHN0YXRlLndyaXRlY2IgPSBjYjtcbiAgc3RhdGUud3JpdGluZyA9IHRydWU7XG4gIHN0YXRlLnN5bmMgPSB0cnVlO1xuICBzdHJlYW0uX3dyaXRlKGNodW5rLCBlbmNvZGluZywgc3RhdGUub253cml0ZSk7XG4gIHN0YXRlLnN5bmMgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gb253cml0ZUVycm9yKHN0cmVhbSwgc3RhdGUsIHN5bmMsIGVyLCBjYikge1xuICBpZiAoc3luYylcbiAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICBjYihlcik7XG4gICAgfSk7XG4gIGVsc2VcbiAgICBjYihlcik7XG5cbiAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpIHtcbiAgc3RhdGUud3JpdGluZyA9IGZhbHNlO1xuICBzdGF0ZS53cml0ZWNiID0gbnVsbDtcbiAgc3RhdGUubGVuZ3RoIC09IHN0YXRlLndyaXRlbGVuO1xuICBzdGF0ZS53cml0ZWxlbiA9IDA7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGUoc3RyZWFtLCBlcikge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBzeW5jID0gc3RhdGUuc3luYztcbiAgdmFyIGNiID0gc3RhdGUud3JpdGVjYjtcblxuICBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpO1xuXG4gIGlmIChlcilcbiAgICBvbndyaXRlRXJyb3Ioc3RyZWFtLCBzdGF0ZSwgc3luYywgZXIsIGNiKTtcbiAgZWxzZSB7XG4gICAgLy8gQ2hlY2sgaWYgd2UncmUgYWN0dWFsbHkgcmVhZHkgdG8gZmluaXNoLCBidXQgZG9uJ3QgZW1pdCB5ZXRcbiAgICB2YXIgZmluaXNoZWQgPSBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuXG4gICAgaWYgKCFmaW5pc2hlZCAmJiAhc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyAmJiBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgICAgY2xlYXJCdWZmZXIoc3RyZWFtLCBzdGF0ZSk7XG5cbiAgICBpZiAoc3luYykge1xuICAgICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYikge1xuICBpZiAoIWZpbmlzaGVkKVxuICAgIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKTtcbiAgY2IoKTtcbiAgaWYgKGZpbmlzaGVkKVxuICAgIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpO1xufVxuXG4vLyBNdXN0IGZvcmNlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBvbiBuZXh0VGljaywgc28gdGhhdCB3ZSBkb24ndFxuLy8gZW1pdCAnZHJhaW4nIGJlZm9yZSB0aGUgd3JpdGUoKSBjb25zdW1lciBnZXRzIHRoZSAnZmFsc2UnIHJldHVyblxuLy8gdmFsdWUsIGFuZCBoYXMgYSBjaGFuY2UgdG8gYXR0YWNoIGEgJ2RyYWluJyBsaXN0ZW5lci5cbmZ1bmN0aW9uIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgc3RhdGUubmVlZERyYWluKSB7XG4gICAgc3RhdGUubmVlZERyYWluID0gZmFsc2U7XG4gICAgc3RyZWFtLmVtaXQoJ2RyYWluJyk7XG4gIH1cbn1cblxuXG4vLyBpZiB0aGVyZSdzIHNvbWV0aGluZyBpbiB0aGUgYnVmZmVyIHdhaXRpbmcsIHRoZW4gcHJvY2VzcyBpdFxuZnVuY3Rpb24gY2xlYXJCdWZmZXIoc3RyZWFtLCBzdGF0ZSkge1xuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gdHJ1ZTtcblxuICBmb3IgKHZhciBjID0gMDsgYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGg7IGMrKykge1xuICAgIHZhciBlbnRyeSA9IHN0YXRlLmJ1ZmZlcltjXTtcbiAgICB2YXIgY2h1bmsgPSBlbnRyeS5jaHVuaztcbiAgICB2YXIgZW5jb2RpbmcgPSBlbnRyeS5lbmNvZGluZztcbiAgICB2YXIgY2IgPSBlbnRyeS5jYWxsYmFjaztcbiAgICB2YXIgbGVuID0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG5cbiAgICBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgICAvLyBpZiB3ZSBkaWRuJ3QgY2FsbCB0aGUgb253cml0ZSBpbW1lZGlhdGVseSwgdGhlblxuICAgIC8vIGl0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byB3YWl0IHVudGlsIGl0IGRvZXMuXG4gICAgLy8gYWxzbywgdGhhdCBtZWFucyB0aGF0IHRoZSBjaHVuayBhbmQgY2IgYXJlIGN1cnJlbnRseVxuICAgIC8vIGJlaW5nIHByb2Nlc3NlZCwgc28gbW92ZSB0aGUgYnVmZmVyIGNvdW50ZXIgcGFzdCB0aGVtLlxuICAgIGlmIChzdGF0ZS53cml0aW5nKSB7XG4gICAgICBjKys7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gZmFsc2U7XG4gIGlmIChjIDwgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICBzdGF0ZS5idWZmZXIgPSBzdGF0ZS5idWZmZXIuc2xpY2UoYyk7XG4gIGVsc2VcbiAgICBzdGF0ZS5idWZmZXIubGVuZ3RoID0gMDtcbn1cblxuV3JpdGFibGUucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2IobmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKSk7XG59O1xuXG5Xcml0YWJsZS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl93cml0YWJsZVN0YXRlO1xuXG4gIGlmICh0eXBlb2YgY2h1bmsgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGNodW5rO1xuICAgIGNodW5rID0gbnVsbDtcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBlbmNvZGluZztcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH1cblxuICBpZiAodHlwZW9mIGNodW5rICE9PSAndW5kZWZpbmVkJyAmJiBjaHVuayAhPT0gbnVsbClcbiAgICB0aGlzLndyaXRlKGNodW5rLCBlbmNvZGluZyk7XG5cbiAgLy8gaWdub3JlIHVubmVjZXNzYXJ5IGVuZCgpIGNhbGxzLlxuICBpZiAoIXN0YXRlLmVuZGluZyAmJiAhc3RhdGUuZmluaXNoZWQpXG4gICAgZW5kV3JpdGFibGUodGhpcywgc3RhdGUsIGNiKTtcbn07XG5cblxuZnVuY3Rpb24gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKSB7XG4gIHJldHVybiAoc3RhdGUuZW5kaW5nICYmXG4gICAgICAgICAgc3RhdGUubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgIXN0YXRlLmZpbmlzaGVkICYmXG4gICAgICAgICAgIXN0YXRlLndyaXRpbmcpO1xufVxuXG5mdW5jdGlvbiBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKSB7XG4gIHZhciBuZWVkID0gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKTtcbiAgaWYgKG5lZWQpIHtcbiAgICBzdGF0ZS5maW5pc2hlZCA9IHRydWU7XG4gICAgc3RyZWFtLmVtaXQoJ2ZpbmlzaCcpO1xuICB9XG4gIHJldHVybiBuZWVkO1xufVxuXG5mdW5jdGlvbiBlbmRXcml0YWJsZShzdHJlYW0sIHN0YXRlLCBjYikge1xuICBzdGF0ZS5lbmRpbmcgPSB0cnVlO1xuICBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKTtcbiAgaWYgKGNiKSB7XG4gICAgaWYgKHN0YXRlLmZpbmlzaGVkKVxuICAgICAgc2V0SW1tZWRpYXRlKGNiKTtcbiAgICBlbHNlXG4gICAgICBzdHJlYW0ub25jZSgnZmluaXNoJywgY2IpO1xuICB9XG4gIHN0YXRlLmVuZGVkID0gdHJ1ZTtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG5mdW5jdGlvbiBhc3NlcnRFbmNvZGluZyhlbmNvZGluZykge1xuICBpZiAoZW5jb2RpbmcgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKTtcbiAgfVxufVxuXG52YXIgU3RyaW5nRGVjb2RlciA9IGV4cG9ydHMuU3RyaW5nRGVjb2RlciA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gIHRoaXMuZW5jb2RpbmcgPSAoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1stX10vLCAnJyk7XG4gIGFzc2VydEVuY29kaW5nKGVuY29kaW5nKTtcbiAgc3dpdGNoICh0aGlzLmVuY29kaW5nKSB7XG4gICAgY2FzZSAndXRmOCc6XG4gICAgICAvLyBDRVNVLTggcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDMtYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDM7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIC8vIFVURi0xNiByZXByZXNlbnRzIGVhY2ggb2YgU3Vycm9nYXRlIFBhaXIgYnkgMi1ieXRlc1xuICAgICAgdGhpcy5zdXJyb2dhdGVTaXplID0gMjtcbiAgICAgIHRoaXMuZGV0ZWN0SW5jb21wbGV0ZUNoYXIgPSB1dGYxNkRldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIC8vIEJhc2UtNjQgc3RvcmVzIDMgYnl0ZXMgaW4gNCBjaGFycywgYW5kIHBhZHMgdGhlIHJlbWFpbmRlci5cbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDM7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gYmFzZTY0RGV0ZWN0SW5jb21wbGV0ZUNoYXI7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhpcy53cml0ZSA9IHBhc3NUaHJvdWdoV3JpdGU7XG4gICAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLmNoYXJCdWZmZXIgPSBuZXcgQnVmZmVyKDYpO1xuICB0aGlzLmNoYXJSZWNlaXZlZCA9IDA7XG4gIHRoaXMuY2hhckxlbmd0aCA9IDA7XG59O1xuXG5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBjaGFyU3RyID0gJyc7XG4gIHZhciBvZmZzZXQgPSAwO1xuXG4gIC8vIGlmIG91ciBsYXN0IHdyaXRlIGVuZGVkIHdpdGggYW4gaW5jb21wbGV0ZSBtdWx0aWJ5dGUgY2hhcmFjdGVyXG4gIHdoaWxlICh0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgcmVtYWluaW5nIGJ5dGVzIHRoaXMgYnVmZmVyIGhhcyB0byBvZmZlciBmb3IgdGhpcyBjaGFyXG4gICAgdmFyIGkgPSAoYnVmZmVyLmxlbmd0aCA+PSB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCkgP1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhckxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkIDpcbiAgICAgICAgICAgICAgICBidWZmZXIubGVuZ3RoO1xuXG4gICAgLy8gYWRkIHRoZSBuZXcgYnl0ZXMgdG8gdGhlIGNoYXIgYnVmZmVyXG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCB0aGlzLmNoYXJSZWNlaXZlZCwgb2Zmc2V0LCBpKTtcbiAgICB0aGlzLmNoYXJSZWNlaXZlZCArPSAoaSAtIG9mZnNldCk7XG4gICAgb2Zmc2V0ID0gaTtcblxuICAgIGlmICh0aGlzLmNoYXJSZWNlaXZlZCA8IHRoaXMuY2hhckxlbmd0aCkge1xuICAgICAgLy8gc3RpbGwgbm90IGVub3VnaCBjaGFycyBpbiB0aGlzIGJ1ZmZlcj8gd2FpdCBmb3IgbW9yZSAuLi5cbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICAvLyBnZXQgdGhlIGNoYXJhY3RlciB0aGF0IHdhcyBzcGxpdFxuICAgIGNoYXJTdHIgPSB0aGlzLmNoYXJCdWZmZXIuc2xpY2UoMCwgdGhpcy5jaGFyTGVuZ3RoKS50b1N0cmluZyh0aGlzLmVuY29kaW5nKTtcblxuICAgIC8vIGxlYWQgc3Vycm9nYXRlIChEODAwLURCRkYpIGlzIGFsc28gdGhlIGluY29tcGxldGUgY2hhcmFjdGVyXG4gICAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGNoYXJTdHIubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGNoYXJDb2RlID49IDB4RDgwMCAmJiBjaGFyQ29kZSA8PSAweERCRkYpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCArPSB0aGlzLnN1cnJvZ2F0ZVNpemU7XG4gICAgICBjaGFyU3RyID0gJyc7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgPSB0aGlzLmNoYXJMZW5ndGggPSAwO1xuXG4gICAgLy8gaWYgdGhlcmUgYXJlIG5vIG1vcmUgYnl0ZXMgaW4gdGhpcyBidWZmZXIsIGp1c3QgZW1pdCBvdXIgY2hhclxuICAgIGlmIChpID09IGJ1ZmZlci5sZW5ndGgpIHJldHVybiBjaGFyU3RyO1xuXG4gICAgLy8gb3RoZXJ3aXNlIGN1dCBvZmYgdGhlIGNoYXJhY3RlcnMgZW5kIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGlzIGJ1ZmZlclxuICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZShpLCBidWZmZXIubGVuZ3RoKTtcbiAgICBicmVhaztcbiAgfVxuXG4gIHZhciBsZW5JbmNvbXBsZXRlID0gdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhcihidWZmZXIpO1xuXG4gIHZhciBlbmQgPSBidWZmZXIubGVuZ3RoO1xuICBpZiAodGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgLy8gYnVmZmVyIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlciBieXRlcyB3ZSBnb3RcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGggLSBsZW5JbmNvbXBsZXRlLCBlbmQpO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkID0gbGVuSW5jb21wbGV0ZTtcbiAgICBlbmQgLT0gbGVuSW5jb21wbGV0ZTtcbiAgfVxuXG4gIGNoYXJTdHIgKz0gYnVmZmVyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcsIDAsIGVuZCk7XG5cbiAgdmFyIGVuZCA9IGNoYXJTdHIubGVuZ3RoIC0gMTtcbiAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGVuZCk7XG4gIC8vIGxlYWQgc3Vycm9nYXRlIChEODAwLURCRkYpIGlzIGFsc28gdGhlIGluY29tcGxldGUgY2hhcmFjdGVyXG4gIGlmIChjaGFyQ29kZSA+PSAweEQ4MDAgJiYgY2hhckNvZGUgPD0gMHhEQkZGKSB7XG4gICAgdmFyIHNpemUgPSB0aGlzLnN1cnJvZ2F0ZVNpemU7XG4gICAgdGhpcy5jaGFyTGVuZ3RoICs9IHNpemU7XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgKz0gc2l6ZTtcbiAgICB0aGlzLmNoYXJCdWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIHNpemUsIDAsIHNpemUpO1xuICAgIHRoaXMuY2hhckJ1ZmZlci53cml0ZShjaGFyU3RyLmNoYXJBdChjaGFyU3RyLmxlbmd0aCAtIDEpLCB0aGlzLmVuY29kaW5nKTtcbiAgICByZXR1cm4gY2hhclN0ci5zdWJzdHJpbmcoMCwgZW5kKTtcbiAgfVxuXG4gIC8vIG9yIGp1c3QgZW1pdCB0aGUgY2hhclN0clxuICByZXR1cm4gY2hhclN0cjtcbn07XG5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmRldGVjdEluY29tcGxldGVDaGFyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIC8vIGRldGVybWluZSBob3cgbWFueSBieXRlcyB3ZSBoYXZlIHRvIGNoZWNrIGF0IHRoZSBlbmQgb2YgdGhpcyBidWZmZXJcbiAgdmFyIGkgPSAoYnVmZmVyLmxlbmd0aCA+PSAzKSA/IDMgOiBidWZmZXIubGVuZ3RoO1xuXG4gIC8vIEZpZ3VyZSBvdXQgaWYgb25lIG9mIHRoZSBsYXN0IGkgYnl0ZXMgb2Ygb3VyIGJ1ZmZlciBhbm5vdW5jZXMgYW5cbiAgLy8gaW5jb21wbGV0ZSBjaGFyLlxuICBmb3IgKDsgaSA+IDA7IGktLSkge1xuICAgIHZhciBjID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSBpXTtcblxuICAgIC8vIFNlZSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1VURi04I0Rlc2NyaXB0aW9uXG5cbiAgICAvLyAxMTBYWFhYWFxuICAgIGlmIChpID09IDEgJiYgYyA+PiA1ID09IDB4MDYpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDI7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyAxMTEwWFhYWFxuICAgIGlmIChpIDw9IDIgJiYgYyA+PiA0ID09IDB4MEUpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDM7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyAxMTExMFhYWFxuICAgIGlmIChpIDw9IDMgJiYgYyA+PiAzID09IDB4MUUpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDQ7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaTtcbn07XG5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgcmVzID0gJyc7XG4gIGlmIChidWZmZXIgJiYgYnVmZmVyLmxlbmd0aClcbiAgICByZXMgPSB0aGlzLndyaXRlKGJ1ZmZlcik7XG5cbiAgaWYgKHRoaXMuY2hhclJlY2VpdmVkKSB7XG4gICAgdmFyIGNyID0gdGhpcy5jaGFyUmVjZWl2ZWQ7XG4gICAgdmFyIGJ1ZiA9IHRoaXMuY2hhckJ1ZmZlcjtcbiAgICB2YXIgZW5jID0gdGhpcy5lbmNvZGluZztcbiAgICByZXMgKz0gYnVmLnNsaWNlKDAsIGNyKS50b1N0cmluZyhlbmMpO1xuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIHBhc3NUaHJvdWdoV3JpdGUoYnVmZmVyKSB7XG4gIHJldHVybiBidWZmZXIudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG59XG5cbmZ1bmN0aW9uIHV0ZjE2RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHZhciBpbmNvbXBsZXRlID0gdGhpcy5jaGFyUmVjZWl2ZWQgPSBidWZmZXIubGVuZ3RoICUgMjtcbiAgdGhpcy5jaGFyTGVuZ3RoID0gaW5jb21wbGV0ZSA/IDIgOiAwO1xuICByZXR1cm4gaW5jb21wbGV0ZTtcbn1cblxuZnVuY3Rpb24gYmFzZTY0RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHZhciBpbmNvbXBsZXRlID0gdGhpcy5jaGFyUmVjZWl2ZWQgPSBidWZmZXIubGVuZ3RoICUgMztcbiAgdGhpcy5jaGFyTGVuZ3RoID0gaW5jb21wbGV0ZSA/IDMgOiAwO1xuICByZXR1cm4gaW5jb21wbGV0ZTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIrTnNjTm1cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
