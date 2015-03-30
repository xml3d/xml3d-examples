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

BlastFormatHandler.prototype.isFormatSupported = function(response, responseType, mimetype) {
    if (!(response instanceof ArrayBuffer))
        return false;
    return true;
};

BlastFormatHandler.prototype.getFormatData = function(response, responseType, mimetype, callback) {
    var xflowData = [];
    var streamReceiver = new blast.StreamReceiver({
        async: false
    });
    var errorCallback = callback.bind(undefined, false);
    streamReceiver.end(response);
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
            callback(true, xflowData);
        });
};

BlastFormatHandler.prototype.getFragmentData = function (data, path) {
    if (!path)
        return data;
    return jpath.evaluate(path, data).definedResults.length > 0 ? jpath.evaluate(path, data).definedResults[0].value : null;
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
    inputNode.data = new Xflow.data.BufferEntry(Xflow.constants.DATA_TYPE.fromString(type), typedArray);
    return inputNode;
}

BlastDataAdapter.prototype.getXflowNode = function() {
    return this._xflowDataNode;
};

var BlastFactory = function(){
    XML3D.resource.AdapterFactory.call(this, XML3D.data);
};

XML3D.createClass(BlastFactory, XML3D.resource.AdapterFactory);

BlastFactory.prototype.aspect = "data";
BlastFactory.prototype.createAdapter = function(mesh) {
    return new BlastDataAdapter(mesh);
};

XML3D.resource.addBinaryExtension('.blast');
XML3D.resource.addBinaryContentType('application/vnd.blast');
blastFormatHandler.registerFactoryClass(BlastFactory);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6XFxfcmVwb3NcXHdlYmdsXFx4bWwzZC1ibGFzdC1sb2FkZXJcXG5vZGVfbW9kdWxlc1xcZ3J1bnQtYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL2xpYi9sb2FkZXIuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9saWIvYnJvd3Nlci9kZWNvZGluZ193b3JrZXJfcG9vbC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9icm93c2VyL3J1bl9leHRlcm5hbF9kZWNvZGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9jaHVuay5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9jaHVua2VyLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL2RlY2h1bmtlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9ub2RlL3J1bl9leHRlcm5hbF9kZWNvZGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9vYmplY3RfYXNzZW1ibGVyLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL29iamVjdF9lbmNvZGVyLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3ByZWFtYmxlLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3J1bl9leHRlcm5hbF9kZWNvZGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi9zdHJlYW1fZ2VuZXJhdG9yLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3N0cmVhbV9yZWNlaXZlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L2xpYi91dGlsL2NhbGxfaW1tZWRpYXRlLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3QvbGliL3V0aWwvaXNfbGl0dGxlX2VuZGlhbl9hcmNoaXRlY3R1cmUuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9saWIvdXRpbC93cmFwX3N5bmNfZnVuY3Rpb24uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9saWIvdmFsdWVfZGVjb2Rlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9hYm9wcy9saWIvYWJvcHMuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvYXN5bmMvbGliL2FzeW5jLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2JsYXN0LWNvZGVjcy9saWIvY29kZWNzL2Fzc2ltcF9tZXNoLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2JsYXN0LWNvZGVjcy9saWIvY29kZWNzL2lkZW50aXR5LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2JsYXN0LWNvZGVjcy9saWIvY29kZWNzL2pzb24uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvYmxhc3QtY29kZWNzL2xpYi9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9ibGFzdC1jb2RlY3MvbGliL3V0aWwvZmxpcF9lbmRpYW5uZXNzX2lmX25lY2Vzc2FyeS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvY29tcGlsaW5nLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9jb25zdGFudF92YWx1ZV9leHByZXNzaW9uLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9jb250ZXh0LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9jb3ZlcmFnZS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvZGVzY2VudF9leHByZXNzaW9uLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvZXNjYXBpbmcuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2V2YWx1YXRpb24uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2V2YWx1YXRpb25fcmVzdWx0LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvaW52YWxpZF9lc2NhcGVfc2VxdWVuY2VfZXJyb3IuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2pvaW5pbmcuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL2xleGluZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcGFyc2luZy5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcGFyc2luZ19lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcGF0aF9leHByZXNzaW9uLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvYmxhc3Qvbm9kZV9tb2R1bGVzL2pwYXRoL2xpYi9wcm9wZXJ0eV9hY2Nlc3NfZXhwcmVzc2lvbi5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcmFuZ2VfZXhwcmVzc2lvbi5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvcmVjdXJzaXZlX2Rlc2NlbnRfZXhwcmVzc2lvbi5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvc2VwYXJhdG9yX3Rva2VuX21hcHBpbmcuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvanBhdGgvbGliL3N5bnRheF9lcnJvci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2JsYXN0L25vZGVfbW9kdWxlcy9qcGF0aC9saWIvdG9rZW4uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ibGFzdC9ub2RlX21vZHVsZXMvc2V0aW1tZWRpYXRlL3NldEltbWVkaWF0ZS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmVhbS1icm93c2VyaWZ5L2R1cGxleC5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmVhbS1icm93c2VyaWZ5L2luZGV4LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvc3RyZWFtLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmVhbS1icm93c2VyaWZ5L3Bhc3N0aHJvdWdoLmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvc3RyZWFtLWJyb3dzZXJpZnkvcmVhZGFibGUuanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9zdHJlYW0tYnJvd3NlcmlmeS90cmFuc2Zvcm0uanMiLCJEOi9fcmVwb3Mvd2ViZ2wveG1sM2QtYmxhc3QtbG9hZGVyL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9zdHJlYW0tYnJvd3NlcmlmeS93cml0YWJsZS5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmluZ19kZWNvZGVyL2luZGV4LmpzIiwiRDovX3JlcG9zL3dlYmdsL3htbDNkLWJsYXN0LWxvYWRlci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIkQ6L19yZXBvcy93ZWJnbC94bWwzZC1ibGFzdC1sb2FkZXIvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoOEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakxBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNybENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2NkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGJsYXN0ID0gcmVxdWlyZShcImJsYXN0XCIpO1xyXG52YXIganBhdGggPSByZXF1aXJlKFwianBhdGhcIik7XHJcblxyXG52YXIgbm9ybWFsID0gKDEgPDwgMCk7XHJcbnZhciB0YW5nZW50ID0gKDEgPDwgMSk7XHJcbnZhciB0ZXhjb29yZCA9ICgxIDw8IDIpO1xyXG52YXIgY29sb3IgPSAoMSA8PCAzKTtcclxuXHJcbmZ1bmN0aW9uIGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlKCkge1xyXG4gICAgLy8gRGF0YVZpZXcjZ2V0VWludDE2IHdpbGwgcmVhZCAxIG9uIGJpZy1lbmRpYW4gc3lzdGVtcy5cclxuICAgIHJldHVybiBuZXcgRGF0YVZpZXcobmV3IFVpbnQxNkFycmF5KFsyNTZdKS5idWZmZXIpLmdldFVpbnQxNigwLCB0cnVlKSA9PT0gMjU2O1xyXG59O1xyXG5cclxuIGZ1bmN0aW9uIGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeSh0eXBlZEFycmF5LCBsaXR0bGVFbmRpYW4pIHtcclxuICAgIGlmIChsaXR0bGVFbmRpYW4gIT09IGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlKCkpXHJcblx0XHR0aHJvdyBcIkZhdGFsOiBFeHBlY3RlZCBsaXR0bGUgZW5kaWFuIGRhdGEgYnV0IGdvdCBiaWcgZW5kaWFuIGRhdGEgaW5zdGVhZC5cIlxyXG4gICAgcmV0dXJuIHR5cGVkQXJyYXk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBkZWNvZGVBc3NpbXBNZXNoKGJ1ZmZlciwgbGl0dGxlRW5kaWFuKSB7XHJcbiAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xyXG4gICAgdmFyIG9mZnNldCA9IDA7XHJcbiAgICB2YXIgdmVydGV4Q291bnQgPSB2aWV3LmdldFVpbnQzMihvZmZzZXQsIGxpdHRsZUVuZGlhbik7XHJcbiAgICBvZmZzZXQgKz0gNDtcclxuICAgIHZhciBhdHRyaWJzID0gdmlldy5nZXRVaW50OChvZmZzZXQpO1xyXG4gICAgb2Zmc2V0ICs9IDQ7XHJcblxyXG4gICAgdmFyIG1lc2ggPSB7XHJcbiAgICAgICAgcG9zaXRpb246IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDMpLCBsaXR0bGVFbmRpYW4pXHJcbiAgICB9O1xyXG4gICAgb2Zmc2V0ICs9IHZlcnRleENvdW50ICogMyAqIG1lc2gucG9zaXRpb24uQllURVNfUEVSX0VMRU1FTlQ7XHJcblxyXG4gICAgaWYgKGF0dHJpYnMgJiBub3JtYWwpIHtcclxuICAgICAgICBtZXNoLm5vcm1hbCA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDMpLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDMgKiBtZXNoLm5vcm1hbC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgIH1cclxuICAgIGlmIChhdHRyaWJzICYgdGFuZ2VudCkge1xyXG4gICAgICAgIG1lc2gudGFuZ2VudCA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDMpLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDMgKiBtZXNoLnRhbmdlbnQuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICB9XHJcbiAgICBpZiAoYXR0cmlicyAmIHRleGNvb3JkKSB7XHJcbiAgICAgICAgbWVzaC50ZXhjb29yZCA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgb2Zmc2V0LCB2ZXJ0ZXhDb3VudCAqIDIpLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDIgKiBtZXNoLnRleGNvb3JkLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgfVxyXG4gICAgaWYgKGF0dHJpYnMgJiBjb2xvcikge1xyXG4gICAgICAgIG1lc2guY29sb3IgPSBmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IEZsb2F0MzJBcnJheShidWZmZXIsIG9mZnNldCwgdmVydGV4Q291bnQgKiA0KSwgbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICBvZmZzZXQgKz0gdmVydGV4Q291bnQgKiA0ICogbWVzaC5jb2xvci5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgIH1cclxuXHJcbiAgICBtZXNoLmluZGV4ID0gZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBVaW50MzJBcnJheShidWZmZXIsIG9mZnNldCksIGxpdHRsZUVuZGlhbik7XHJcblxyXG4gICAgcmV0dXJuIG1lc2g7XHJcbn07XHJcblxyXG52YXIgQmxhc3RGb3JtYXRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICBYTUwzRC5yZXNvdXJjZS5Gb3JtYXRIYW5kbGVyLmNhbGwodGhpcyk7XHJcbn07XHJcblxyXG5YTUwzRC5jcmVhdGVDbGFzcyhCbGFzdEZvcm1hdEhhbmRsZXIsIFhNTDNELnJlc291cmNlLkZvcm1hdEhhbmRsZXIpO1xyXG5cclxuQmxhc3RGb3JtYXRIYW5kbGVyLnByb3RvdHlwZS5pc0Zvcm1hdFN1cHBvcnRlZCA9IGZ1bmN0aW9uKHJlc3BvbnNlLCByZXNwb25zZVR5cGUsIG1pbWV0eXBlKSB7XHJcbiAgICBpZiAoIShyZXNwb25zZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSlcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbkJsYXN0Rm9ybWF0SGFuZGxlci5wcm90b3R5cGUuZ2V0Rm9ybWF0RGF0YSA9IGZ1bmN0aW9uKHJlc3BvbnNlLCByZXNwb25zZVR5cGUsIG1pbWV0eXBlLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHhmbG93RGF0YSA9IFtdO1xyXG4gICAgdmFyIHN0cmVhbVJlY2VpdmVyID0gbmV3IGJsYXN0LlN0cmVhbVJlY2VpdmVyKHtcclxuICAgICAgICBhc3luYzogZmFsc2VcclxuICAgIH0pO1xyXG4gICAgdmFyIGVycm9yQ2FsbGJhY2sgPSBjYWxsYmFjay5iaW5kKHVuZGVmaW5lZCwgZmFsc2UpO1xyXG4gICAgc3RyZWFtUmVjZWl2ZXIuZW5kKHJlc3BvbnNlKTtcclxuICAgIHN0cmVhbVJlY2VpdmVyXHJcbiAgICAgICAgLm9uKFwiZXJyb3JcIiwgZXJyb3JDYWxsYmFjaylcclxuICAgICAgICAucGlwZShuZXcgYmxhc3QuRGVjaHVua2VyKHsgYXN5bmM6IGZhbHNlIH0pKVxyXG4gICAgICAgIC5vbihcImVycm9yXCIsIGVycm9yQ2FsbGJhY2spXHJcbiAgICAgICAgLnBpcGUobmV3IGJsYXN0LlZhbHVlRGVjb2Rlcih7XHJcbiAgICAgICAgICAgIGFzeW5jOiBmYWxzZSxcclxuICAgICAgICAgICAgZGVjb2RpbmdTcGVjaWZpY2F0aW9uTWFwOiB7XHJcbiAgICAgICAgICAgICAgICBcImh0dHA6Ly9sb2NhbGhvc3Q6OTA5MC9jb2RlY3MvYXNzaW1wTWVzaFwiOiBkZWNvZGVBc3NpbXBNZXNoXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KSlcclxuICAgICAgICAub24oXCJlcnJvclwiLCBlcnJvckNhbGxiYWNrKVxyXG4gICAgICAgIC5vbihcImRhdGFcIiwgZnVuY3Rpb24gKGRlY29kZWREYXRhKSB7XHJcbiAgICAgICAgICAgIGpwYXRoLmV2YWx1YXRlKGRlY29kZWREYXRhLnBhdGgsIHhmbG93RGF0YSkuZm9yRWFjaChmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBkZWNvZGVkRGF0YS5tZXRhZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoVHlwZU1hcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGpwYXRoLmV2YWx1YXRlKHBhdGhUeXBlTWFwLnBhdGgsIGRlY29kZWREYXRhLnZhbHVlKS5kZWZpbmVkUmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHhmbG93RGF0YURlc2NyaXB0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogcGF0aFR5cGVNYXAudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiByZXN1bHQudmFsdWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5pc1Jvb3QpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNvZGVkRGF0YS52YWx1ZSA9IHhmbG93RGF0YURlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQudmFsdWUgPSB4Zmxvd0RhdGFEZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5pc1Jvb3QpXHJcbiAgICAgICAgICAgICAgICAgICAgeGZsb3dEYXRhID0gZGVjb2RlZERhdGEudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnZhbHVlID0gZGVjb2RlZERhdGEudmFsdWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLm9uKFwiZmluaXNoXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSwgeGZsb3dEYXRhKTtcclxuICAgICAgICB9KTtcclxufTtcclxuXHJcbkJsYXN0Rm9ybWF0SGFuZGxlci5wcm90b3R5cGUuZ2V0RnJhZ21lbnREYXRhID0gZnVuY3Rpb24gKGRhdGEsIHBhdGgpIHtcclxuICAgIGlmICghcGF0aClcclxuICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgIHJldHVybiBqcGF0aC5ldmFsdWF0ZShwYXRoLCBkYXRhKS5kZWZpbmVkUmVzdWx0cy5sZW5ndGggPiAwID8ganBhdGguZXZhbHVhdGUocGF0aCwgZGF0YSkuZGVmaW5lZFJlc3VsdHNbMF0udmFsdWUgOiBudWxsO1xyXG59O1xyXG5cclxudmFyIGJsYXN0Rm9ybWF0SGFuZGxlciA9IG5ldyBCbGFzdEZvcm1hdEhhbmRsZXIoKTtcclxuWE1MM0QucmVzb3VyY2UucmVnaXN0ZXJGb3JtYXQoYmxhc3RGb3JtYXRIYW5kbGVyKTtcclxuXHJcbnZhciBCbGFzdERhdGFBZGFwdGVyID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHRoaXMuX3hmbG93RGF0YU5vZGUgPSBjcmVhdGVYZmxvd0RhdGFOb2RlKGRhdGEpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlWGZsb3dEYXRhTm9kZSAoZGF0YSkge1xyXG4gICAgdmFyIHhmbG93RGF0YU5vZGUgPSBuZXcgWGZsb3cuRGF0YU5vZGUoKTtcclxuXHJcbiAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyaWJ1dGVOYW1lKSB7XHJcbiAgICAgICAgdmFyIGF0dHJpYnV0ZSA9IGRhdGFbYXR0cmlidXRlTmFtZV07XHJcbiAgICAgICAgaWYgKGF0dHJpYnV0ZSlcclxuICAgICAgICAgICAgeGZsb3dEYXRhTm9kZS5hcHBlbmRDaGlsZChjcmVhdGVJbnB1dE5vZGUoYXR0cmlidXRlTmFtZSwgYXR0cmlidXRlLnR5cGUsIGF0dHJpYnV0ZS52YWx1ZSkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHhmbG93RGF0YU5vZGU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUlucHV0Tm9kZShuYW1lLCB0eXBlLCB0eXBlZEFycmF5KSB7XHJcbiAgICB2YXIgaW5wdXROb2RlID0gbmV3IFhmbG93LklucHV0Tm9kZSgpO1xyXG4gICAgaW5wdXROb2RlLm5hbWUgPSBuYW1lO1xyXG4gICAgaW5wdXROb2RlLmRhdGEgPSBuZXcgWGZsb3cuQnVmZmVyRW50cnkoWGZsb3cuY29uc3RhbnRzLkRBVEFfVFlQRS5mcm9tU3RyaW5nKHR5cGUpLCB0eXBlZEFycmF5KTtcclxuICAgIHJldHVybiBpbnB1dE5vZGU7XHJcbn1cclxuXHJcbkJsYXN0RGF0YUFkYXB0ZXIucHJvdG90eXBlLmdldFhmbG93Tm9kZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3hmbG93RGF0YU5vZGU7XHJcbn07XHJcblxyXG52YXIgQmxhc3RGYWN0b3J5ID0gZnVuY3Rpb24oKXtcclxuICAgIFhNTDNELnJlc291cmNlLkFkYXB0ZXJGYWN0b3J5LmNhbGwodGhpcywgWE1MM0QuZGF0YSk7XHJcbn07XHJcblxyXG5YTUwzRC5jcmVhdGVDbGFzcyhCbGFzdEZhY3RvcnksIFhNTDNELnJlc291cmNlLkFkYXB0ZXJGYWN0b3J5KTtcclxuXHJcbkJsYXN0RmFjdG9yeS5wcm90b3R5cGUuYXNwZWN0ID0gXCJkYXRhXCI7XHJcbkJsYXN0RmFjdG9yeS5wcm90b3R5cGUuY3JlYXRlQWRhcHRlciA9IGZ1bmN0aW9uKG1lc2gpIHtcclxuICAgIHJldHVybiBuZXcgQmxhc3REYXRhQWRhcHRlcihtZXNoKTtcclxufTtcclxuXHJcblhNTDNELnJlc291cmNlLmFkZEJpbmFyeUV4dGVuc2lvbignLmJsYXN0Jyk7XHJcblhNTDNELnJlc291cmNlLmFkZEJpbmFyeUNvbnRlbnRUeXBlKCdhcHBsaWNhdGlvbi92bmQuYmxhc3QnKTtcclxuYmxhc3RGb3JtYXRIYW5kbGVyLnJlZ2lzdGVyRmFjdG9yeUNsYXNzKEJsYXN0RmFjdG9yeSk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuZnVuY3Rpb24gd29ya2VyKCkge1xyXG4gICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBkb3dubG9hZERlY29kaW5nRnVuY3Rpb25hbGl0eShldmVudC5kYXRhLmRlY29kaW5nU3BlY2lmaWNhdGlvbik7XHJcbiAgICAgICAgZGVjb2RlRGF0YShldmVudC5kYXRhLmJ1ZmZlciwgZXZlbnQuZGF0YS5saXR0bGVFbmRpYW4pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gZG93bmxvYWREZWNvZGluZ0Z1bmN0aW9uYWxpdHkodXJsKSB7XHJcbiAgICAgICAgc2VsZi5tb2R1bGUgPSB7fTtcclxuICAgICAgICBzZWxmLm1vZHVsZS5leHBvcnRzID0ge307XHJcbiAgICAgICAgc2VsZi5leHBvcnRzID0gc2VsZi5tb2R1bGUuZXhwb3J0cztcclxuXHJcbiAgICAgICAgaW1wb3J0U2NyaXB0cyh1cmwpO1xyXG4gICAgICAgIHZhciBkZWNvZGluZ0Z1bmN0aW9uO1xyXG4gICAgICAgIGlmICh0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgICAgZGVjb2RpbmdGdW5jdGlvbiA9IHNlbGYubW9kdWxlLmV4cG9ydHM7XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpXHJcbiAgICAgICAgICAgIGRlY29kaW5nRnVuY3Rpb24gPSBzZWxmLm1vZHVsZS5leHBvcnRzLmRlY29kZTtcclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgZGVjb2RlID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgICAgIGRlY29kaW5nRnVuY3Rpb24gPSBkZWNvZGU7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZmluZCBkZWNvZGluZyBmdW5jdGlvblwiKTtcclxuICAgICAgICBzZWxmLmRlY29kaW5nRnVuY3Rpb24gPSB3cmFwcERlY29kaW5nRnVuY3Rpb24oZGVjb2RpbmdGdW5jdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gd3JhcHBEZWNvZGluZ0Z1bmN0aW9uKGRlY29kaW5nRnVuY3Rpb24pIHtcclxuICAgICAgICB2YXIgYXJpdHkgPSBkZWNvZGluZ0Z1bmN0aW9uLmxlbmd0aDtcclxuICAgICAgICAvLyBWYXJpYWJsZSBhcmd1bWVudCBsaXN0IG1lYW5zIHdlIGNvbnNpZGVyIHRoaXMgZnVuY3Rpb24gdG8gYmUgYXN5bmMuIGFuZCB0byBleHBlY3RcclxuICAgICAgICAvLyBhbiBBcnJheUJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGggYW5kIGVuZGlhbm5lc3MgYXMgcGFyYW1ldGVyLlxyXG4gICAgICAgIGlmIChhcml0eSA9PT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIGRlY29kaW5nRnVuY3Rpb247XHJcbiAgICAgICAgLy8gQW4gYXJpdHkgb2YgdHdvIG1lYW5zIHdlIGhhdmUgYSBzeW5jLiBmdW5jdGlvbiB0YWtpbmcgYSBEYXRhVmlldyBhbmQgdGhlIGVuZGlhbm5lc3MuXHJcbiAgICAgICAgaWYgKGFyaXR5ID09PSAyKVxyXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGJ1ZmZlciwgbGl0dGxlRW5kaWFuLCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gZGVjb2RpbmdGdW5jdGlvbihidWZmZXIsIGxpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICBpZiAoYXJpdHkgPT09IDMpXHJcbiAgICAgICAgICAgIHJldHVybiAgZGVjb2RpbmdGdW5jdGlvbjtcclxuXHJcbiAgICAgICAgbmV3IEVycm9yKFwiTWFsZm9ybWVkIGRlY29kaW5nIGZ1bmN0aW9uXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlY29kZURhdGEoYnVmZmVyLCBsaXR0bGVFbmRpYW4pIHtcclxuICAgICAgICBzZWxmLmRlY29kaW5nRnVuY3Rpb24oYnVmZmVyLCBsaXR0bGVFbmRpYW4sIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcilcclxuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG5cclxuICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBEZWNvZGluZ1dvcmtlclBvb2wocG9vbFNpemUpIHtcclxuICAgIHRoaXMuX3Bvb2xTaXplID0gcG9vbFNpemUgfHwgNDtcclxuICAgIHRoaXMuX3Bvb2wgPSBbXTtcclxuICAgIHRoaXMuX3Rhc2tRdWV1ZSA9IFtdO1xyXG5cclxuICAgIHRoaXMuX2ZpbGxQb29sKCk7XHJcbn1cclxuXHJcbkRlY29kaW5nV29ya2VyUG9vbC5wcm90b3R5cGUuc2NoZWR1bGVUYXNrID0gZnVuY3Rpb24gKGRlY29kaW5nVGFzaywgY2FsbGJhY2spIHtcclxuICAgIHRoaXMuX3Rhc2tRdWV1ZS5wdXNoKHtcclxuICAgICAgICBkZWNvZGluZ1Rhc2s6IGRlY29kaW5nVGFzayxcclxuICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuICAgIH0pO1xyXG4gICAgdGhpcy5fcHJvY2Vzc1F1ZXVlKCk7XHJcbn07XHJcblxyXG5EZWNvZGluZ1dvcmtlclBvb2wucHJvdG90eXBlLl9wcm9jZXNzUXVldWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAodGhpcy5fcG9vbC5sZW5ndGggPT09IDAgfHwgdGhpcy5fdGFza1F1ZXVlLmxlbmd0aCA9PT0gMClcclxuICAgICAgICByZXR1cm47XHJcblxyXG4gICAgdmFyIHRhc2tJbmZvID0gdGhpcy5fdGFza1F1ZXVlLnNoaWZ0KCk7XHJcbiAgICB2YXIgd29ya2VyID0gdGhpcy5fcG9vbC5zaGlmdCgpO1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBzZWxmLl9wb29sLnB1c2godGhpcyk7XHJcbiAgICAgICAgdGFza0luZm8uY2FsbGJhY2sobnVsbCwgZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgc2VsZi5fcHJvY2Vzc1F1ZXVlKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHdvcmtlci5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgc2VsZi5fcG9vbC5wdXNoKHRoaXMpO1xyXG4gICAgICAgIHRhc2tJbmZvLmNhbGxiYWNrKGV2ZW50KTtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHNlbGYuX3Byb2Nlc3NRdWV1ZSgpO1xyXG4gICAgfTtcclxuXHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UodGFza0luZm8uZGVjb2RpbmdUYXNrLCBbdGFza0luZm8uZGVjb2RpbmdUYXNrLmJ1ZmZlcl0pO1xyXG59O1xyXG5cclxuRGVjb2RpbmdXb3JrZXJQb29sLnByb3RvdHlwZS5fZmlsbFBvb2wgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3Bvb2xTaXplOyArK2kpXHJcbiAgICAgICAgdGhpcy5fcG9vbC5wdXNoKHRoaXMuX2NyZWF0ZVdvcmtlcigpKTtcclxufTtcclxuXHJcbkRlY29kaW5nV29ya2VyUG9vbC5wcm90b3R5cGUuX2NyZWF0ZVdvcmtlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzdHIgPSB3b3JrZXIudG9TdHJpbmcoKSArIFwiXFxud29ya2VyKCk7XCI7XHJcbiAgICByZXR1cm4gbmV3IFdvcmtlcihVUkwuY3JlYXRlT2JqZWN0VVJMKG5ldyBCbG9iKFtzdHJdLCB7IHR5cGU6IFwiYXBwbGljYXRpb24vamF2YXNjcmlwdFwifSApKSk7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBEZWNvZGluZ1dvcmtlclBvb2w7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIERlY29kaW5nV29ya2VyUG9vbCA9IHJlcXVpcmUoXCIuL2RlY29kaW5nX3dvcmtlcl9wb29sXCIpO1xyXG5cclxudmFyIHBvb2wgPSBuZXcgRGVjb2RpbmdXb3JrZXJQb29sKCk7XHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChkZWNvZGluZ1NwZWNpZmljYXRpb24sIGJ1ZmZlciwgbGl0dGxlRW5kaWFuLCBjYWxsYmFjaykge1xyXG4gICAgcG9vbC5zY2hlZHVsZVRhc2soe1xyXG4gICAgICAgIGRlY29kaW5nU3BlY2lmaWNhdGlvbjogZGVjb2RpbmdTcGVjaWZpY2F0aW9uLFxyXG4gICAgICAgIGJ1ZmZlcjogYnVmZmVyLFxyXG4gICAgICAgIGxpdHRsZUVuZGlhbjogbGl0dGxlRW5kaWFuXHJcbiAgICB9LCBjYWxsYmFjaylcclxufTtcclxuXHJcbiIsIi8vICMgQ2h1bmtcclxuXHJcbi8vIEEgYGNodW5rYCBpcyBhbiBpbmRlcGVuZGVudCBwYXJ0IG9mIGEgYmxhc3Qgc3RyZWFtIHRoYXQgY2FuIGJlIHByb2Nlc3NlZCBieSB0aGUgY2xpZW50IGluZGl2aWR1YWxseSBhbmQgd2l0aG91dFxyXG4vLyBhbnkgaW5mb3JtYXRpb24gb2Ygb3RoZXIgY2h1bmtzIGluIHRoZSBzdHJlYW0gZXhjZXB0IGZvciB0aGUgcHJlYW1ibGUuXHJcbi8vIEEgYGNodW5rYCBtYXkgY29udGFpbiBtdWx0aXBsZSBlbmNvZGVkVmFsdWVzIGZyb20gdGhlIG9yaWdpbmFsIG9iamVjdC5cclxuLy8gSG93ZXZlciwgaXQgd2lsbCBuZXZlciBjb250YWluIHBhcnRpYWxsIGRhdGEgc3VjaCB0aGF0IGFub3RoZXIgYGNodW5rYCBpcyBuZWNlc3NhcnkgdG8gZGVjb2RlIGEgdmFsdWUuXHJcblxyXG4vLyAjIyBTdHJ1Y3R1cmVcclxuXHJcbi8vIEEgY2h1bmsgaGFzIHRoZSBmb2xsb3dpbmcgYmluYXJ5IHN0cnVjdHVyZS5cclxuLy9cclxuLy8gT2N0ZXRzIDAtLTM6IE92ZXJhbGwgY2h1bmtzIHNpemUgKE9DUykuXHJcbi8vIE9jdGV0cyA0LS03OiBIZWFkZXIgZGVmaW5pdGlvbiBzaXplIChIUykuXHJcbi8vIE9jdGV0cyA4LS04KzxIUz46IERlZmluaXRpb25zIG9mIHRoZSBwYXlsb2FkIGluIHRoaXMgY2h1bmsuXHJcbi8vIE9jdGV0czogOSs8SFM+LS08T0NTPjogUGF5bG9hZC5cclxuXHJcbi8vICMjIyBIZWFkZXIgZGVmaW5pdGlvblxyXG5cclxuLy8gQSBjaHVua3MgaGVhZGVyIGRlZmluaXRpb24gaXMgYW4gYXJyYXkgb2Yga2V5LXZhbHVlIHBhaXJzLlxyXG4vLyBJbiBKYXZhU2NyaXB0IHRoaXMgc2ltcGx5IG1hcHMgdG8gb2JqZWN0cy5cclxuLy8gVGhlIGhlYWRlciBkZWZpbml0aW9uIG9mIGVhY2ggY2h1bmsgaXMgZW5jb2RlZCBhbmQgY2FuIGJlIGRlY29kZWQgdXNpbmcgdGhlIHByb2NlZHVyZVxyXG4vLyBzcGVjaWZpZWQgaW4gdGhlIHByZWFtYmxlIG9mIHRoZSBzdHJlYW0uXHJcbi8vIEVhY2ggZGVmaW5pdGlvbiBpcyBzdHJ1Y3R1cmVkIGFzIGZvbGxvd3M6XHJcblxyXG4vLyAtIHBhdGg6IEEgSlBhdGggc3BlY2lmeWluZyB0aGUgb3JpZ2luYWwgcGF0aCBvZiB0aGUgdmFsdWUgaW4gdGhlXHJcbi8vIC0gb2Zmc2V0OiBCeXRlIG9mZnNldCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNodW5rJ3MgcGF5bG9hZCB3aGVyZSB0aGUgZW5jb2RlZCBkYXRhIHN0YXJ0cy5cclxuLy8gLSBzaXplOiBCeXRlIGxlbmd0aCBvZiB0aGUgZW5jb2RlZCBkYXRhLlxyXG4vLyAtIGRlY29kaW5nU3BlY2lmaWNhdGlvbjogQSBVUkwgdGhhdCB1bmlxdWVseSBpZGVudGlmaWVzIHRoZSBkZWNvZGluZyBwcm9jZWR1cmUgbmVjZXNzYXJ5IHRvIGRlY29kZSB0aGUgZGF0YVxyXG4vLyBkZWZpbmVkIGluIHRoaXMgZW50cnkuXHJcbi8vIC0gbWV0YWRhdGE6IFBvc3NpYmxlIG1ldGFkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHZhbHVlLlxyXG5cclxuLy8gIyMjIFBheWxvYWRcclxuXHJcbi8vIEEgY2h1bmtzIHBheWxvYWQgaXMgYSBmbGF0IGBBcnJheUJ1ZmZlcmAgb2YgYXJiaXRyYXJ5IHNpemUuXHJcbi8vIEl0IGNvbnRhaW5zIGFsbCBlbmNvZGVkRGF0YSBzcGVjaWZpZWQgaW4gdGhlIGhlYWRlciBkZWZpbml0aW9ucy5cclxuLy8gVGhlIHNpemUgb2YgZWFjaCBjaHVuaydzIHBheWxvYWQgY2FuIGJlIGNhbGN1bGF0ZWQgYXM6XHJcbi8vIDxPQ1M+LTkrPEhTPi5cclxuXHJcbi8vICMjIyBTaWduYWwgRW5kIE9mIFN0cmVhbVxyXG5cclxuLy8gQSBzcGVjaWFsIGNodW5rLCB0aGUgc2lnbmFsIGVuZCBvZiBzdHJlYW0gY2h1bmssIGNvbnRhaW5zIG5vIHBheWxvYWQgYW5kIHRodXMgbm8gaGVhZGVyIGRlZmluaXRpb25zLlxyXG4vLyBUaGlzIGNodW5rIHNpZ25hbHMgdGhlIHJlY2VpdmVyIHRoZSBlbmQgb2YgdGhlIHN0cmVhbS5cclxuLy8gSXQgaXMgdGhlcmVmb3JlIG5vdCB2YWxpZCB0byBjYWxsIGEgY2h1bmtzIHRvQnVmZmVyIG1ldGhvZCBpZiBubyBwYXlsb2FkIHdhcyBhZGRlZCBiZWZvcmVoYW5kLlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgQmxhc3RFcnJvciA9IHJlcXVpcmUoXCIuL2Vycm9yXCIpO1xyXG5cclxuLy8gQ29uc3RydWN0cyBhIG5ldyBjaHVuayB0aGF0IGNhbiBiZSBmaWxsZWQgd2l0aCBkYXRhLlxyXG4vLyBBIG5ld2x5IGNvbnN0cnVjdGVkIGNodW5rIHdpbGwgaGF2ZSBhIHBheWxvYWQgb2Ygc2l6ZSAwIGFuZCBhIGhlYWRlciBkZWZpbml0aW9uIHNpemUgb2YgMC5cclxuLy8gSXQgaXMgaW52YWxpZCB0byBjYWxsIHRvQnVmZmVyIG9uIGEgZnJlc2ggY2h1bmshXHJcbmZ1bmN0aW9uIENodW5rKCkge1xyXG4gICAgdGhpcy5faGVhZGVyRGVmaW5pdGlvbnMgPSBbXTtcclxuXHJcbiAgICB0aGlzLl9wYXlsb2FkID0gW107XHJcbiAgICB0aGlzLl9jdXJyZW50T2Zmc2V0ID0gMDtcclxufVxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQ2h1bmsucHJvdG90eXBlLCB7XHJcbiAgICBwYXlsb2FkOiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5fcGF5bG9hZDtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgcGF5bG9hZFNpemU6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRPZmZzZXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGhlYWRlckRlZmluaXRpb25zOiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9oZWFkZXJEZWZpbml0aW9ucztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuLy9BZGRzIHRoZSBnaXZlbiBwYXlsb2FkIHRvIHRoZSBjaHVuay5cclxuLy8gQSBoZWFkZXIgZGVmaW5pdGlvbiBlbnRyeSB3aWxsIGJlIGdlbmVyYXRlZCB3aXRoIHRoZSBnaXZlbiBwYXRoLCB0aGUgZGVjb2RpbmdTcGVjaWZpY2F0aW9uIGFuZCBtZXRhZGF0YS5cclxuQ2h1bmsucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChlbmNvZGVkRGF0YSkge1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGVuY29kZWREYXRhLmVuY29kZWRWYWx1ZSkpXHJcbiAgICAgICAgZW5jb2RlZERhdGEuZW5jb2RlZFZhbHVlID0gW2VuY29kZWREYXRhLmVuY29kZWRWYWx1ZV07XHJcblxyXG4gICAgZW5jb2RlZERhdGEuZW5jb2RlZFZhbHVlID0gZW5jb2RlZERhdGEuZW5jb2RlZFZhbHVlLm1hcChmdW5jdGlvbiAodHlwZWRBcnJheU9yQnVmZmVyKSB7XHJcbiAgICAgICAgIGlmICh0eXBlZEFycmF5T3JCdWZmZXIuYnVmZmVyKVxyXG4gICAgICAgICAgICByZXR1cm4gdHlwZWRBcnJheU9yQnVmZmVyLmJ1ZmZlcjtcclxuXHJcbiAgICAgICAgcmV0dXJuIHR5cGVkQXJyYXlPckJ1ZmZlcjtcclxuICAgIH0pO1xyXG5cclxuICAgIHZhciBzaXplID0gZW5jb2RlZERhdGEuZW5jb2RlZFZhbHVlLnJlZHVjZShmdW5jdGlvbiAoY3VycmVudFNpemUsIGJ1ZmZlcikge1xyXG4gICAgICAgIHJldHVybiBjdXJyZW50U2l6ZSArIGxlbmd0aChidWZmZXIpO1xyXG4gICAgfSwgMCk7XHJcblxyXG4gICAgdGhpcy5fcGF5bG9hZCA9IHRoaXMuX3BheWxvYWQuY29uY2F0KGVuY29kZWREYXRhLmVuY29kZWRWYWx1ZSk7XHJcbiAgICB0aGlzLl9oZWFkZXJEZWZpbml0aW9ucy5wdXNoKHtcclxuICAgICAgICBwYXRoOiBlbmNvZGVkRGF0YS5wYXRoLFxyXG4gICAgICAgIG9mZnNldDogdGhpcy5fY3VycmVudE9mZnNldCxcclxuICAgICAgICBzaXplOiBzaXplLFxyXG4gICAgICAgIGRlY29kaW5nU3BlY2lmaWNhdGlvbjogZW5jb2RlZERhdGEuZGVjb2RpbmdTcGVjaWZpY2F0aW9uLFxyXG4gICAgICAgIG1ldGFkYXRhOiBlbmNvZGVkRGF0YS5tZXRhZGF0YVxyXG4gICAgfSk7XHJcbiAgICB0aGlzLl9jdXJyZW50T2Zmc2V0ICs9IHNpemU7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBsZW5ndGgoYnVmZmVyKSB7XHJcblx0cmV0dXJuIHR5cGVvZiBidWZmZXIuYnl0ZUxlbmd0aCAhPT0gXCJ1bmRlZmluZWRcIiA/IGJ1ZmZlci5ieXRlTGVuZ3RoIDogYnVmZmVyLmxlbmd0aDtcclxufVxyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQ2h1bms7XHJcblxyXG4iLCIvLyAjIENodW5rZXJcclxuXHJcbi8vIFRoZSBgQ2h1bmtlcmAgcmVwcmVzZW50cyB0aGUgc2Vjb25kIHN0ZXAgaW4gdGhlIGJsYXN0IHBpcGVsaW5lIGFuZCBpcyBhIE5vZGVKUyB0cmFuc2Zvcm0gc3RyZWFtLlxyXG4vLyBJdCB0YWtlcyBlbmNvZGVkRGF0YSBhbmQgdHJhbnNmb3JtcyB0aGVtIGludG8gYmxhc3QgY2h1bmtzLlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XHJcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlRyYW5zZm9ybTtcclxuXHJcbnZhciBDaHVuayA9IHJlcXVpcmUoXCIuL2NodW5rXCIpO1xyXG52YXIgY2FsbEltbWVkaWF0ZSA9IHJlcXVpcmUoXCIuL3V0aWwvY2FsbF9pbW1lZGlhdGVcIik7XHJcblxyXG4vLyBDb25zdHJ1Y3RzIGEgQ2h1bmtlci5cclxuLy8gYGNodW5rU2l6ZWAgbWF5IHNwZWNpZnkgdGhlIHNpemUgb2YgYSBjaHVuayBpbiBieXRlcy5cclxuLy8gVGhpcyBzaXplLCBob3dldmVyLCBpcyBvbmx5IGEgc29mdGxpbWl0IGFuZCBjaHVua3MgbWF5IGNvbnRhaW4gbW9yZSBvciBsZXNzIGJ5dGVzIGRlcGVuZGluZyBvbiB0aGUgc2l6ZSBvZlxyXG4vLyBpbmRpdmlkdWFsIHZhbHVlcy5cclxuZnVuY3Rpb24gQ2h1bmtlcihvcHRpb25zKSB7XHJcblx0VHJhbnNmb3JtLmNhbGwodGhpcywge1xyXG5cdFx0b2JqZWN0TW9kZTogdHJ1ZVxyXG5cdH0pO1xyXG5cclxuICAgIHRoaXMuX2NodW5rID0gbmV3IENodW5rKCk7XHJcblxyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICB0aGlzLl9jaHVua1NpemUgPSBvcHRpb25zLmNodW5rU2l6ZSB8fCAoMSA8PCAzMCk7XHJcbiAgICB0aGlzLl9hc3luYyA9IHR5cGVvZiBvcHRpb25zLmFzeW5jICE9PSBcInVuZGVmaW5lZFwiID8gb3B0aW9ucy5hc3luYyA6IHRydWU7XHJcbn1cclxuXHJcbnV0aWwuaW5oZXJpdHMoQ2h1bmtlciwgVHJhbnNmb3JtKTtcclxuXHJcbkNodW5rZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZW5jb2RlZERhdGEsIF8sIGNhbGxiYWNrKSB7XHJcbiAgICBjYWxsSW1tZWRpYXRlKHRoaXMuX2FwcGVuZFRvQ2h1bmsuYmluZCh0aGlzLCBlbmNvZGVkRGF0YSwgY2FsbGJhY2spLCB0aGlzLl9hc3luYyk7XHJcbn07XHJcblxyXG5DaHVua2VyLnByb3RvdHlwZS5fYXBwZW5kVG9DaHVuayA9IGZ1bmN0aW9uIChlbmNvZGVkRGF0YSwgY2FsbGJhY2spIHtcclxuXHR0aGlzLl9jaHVuay5hZGQoZW5jb2RlZERhdGEpO1xyXG4gICAgaWYgKHRoaXMuX2NodW5rLnBheWxvYWRTaXplID4gdGhpcy5fY2h1bmtTaXplKSB7XHJcbiAgICAgICAgdGhpcy5wdXNoKHRoaXMuX2NodW5rKTtcclxuICAgICAgICB0aGlzLl9jaHVuayA9IG5ldyBDaHVuaygpO1xyXG4gICAgfVxyXG4gICAgY2FsbGJhY2soKTtcclxufTtcclxuXHJcbkNodW5rZXIucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgaWYgKHRoaXMuX2NodW5rLnBheWxvYWRTaXplID4gMCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBjYWxsSW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2VsZi5wdXNoKHNlbGYuX2NodW5rKTtcclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9LCB0aGlzLl9hc3luYyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBDaHVua2VyO1xyXG4iLCJcInVzZSBzdHJpY3RcIlxyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xyXG5cclxudmFyIGNhbGxJbW1lZGlhdGUgPSByZXF1aXJlKFwiLi91dGlsL2NhbGxfaW1tZWRpYXRlXCIpO1xyXG5cclxuZnVuY3Rpb24gRGVjaHVua2VyKG9wdGlvbnMpIHtcclxuICAgIFRyYW5zZm9ybS5jYWxsKHRoaXMsIHtcclxuICAgICAgICBvYmplY3RNb2RlOiB0cnVlXHJcbiAgICB9KTtcclxuXHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuXHJcbiAgICB0aGlzLl9hc3luYyA9IHR5cGVvZiBvcHRpb25zLmFzeW5jICE9PSBcInVuZGVmaW5lZFwiID8gb3B0aW9ucy5hc3luYyA6IHRydWU7XHJcbn1cclxuXHJcbnV0aWwuaW5oZXJpdHMoRGVjaHVua2VyLCBUcmFuc2Zvcm0pO1xyXG5cclxuRGVjaHVua2VyLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBfLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgY2FsbEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgLy8gQ2h1bmtzIGdlbmVyYXRlZCBieSB0aGUgY2h1bmtlciBoYXZlIGFuIGFycmF5IG9mIEFycmF5QnVmZmVycyBhcyBwYXlsb2FkLlxyXG4gICAgICAgIC8vIENodW5rcyByZWNlaXZlZCBieSB0aGUgc3RyZWFtIHJlY2VpdmVyLCBob3dldmVyLCBvbmx5IGhhdmUgYSBzaW5nbGUgcGF5bG9hZCBBcnJheUJ1ZmZlci5cclxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2h1bmsucGF5bG9hZCkpXHJcbiAgICAgICAgICAgIGNodW5rLnBheWxvYWQgPSBbY2h1bmsucGF5bG9hZF07XHJcblxyXG4gICAgICAgIGNodW5rLmhlYWRlckRlZmluaXRpb25zLmZvckVhY2goZnVuY3Rpb24gKGhlYWRlckRlZmluaXRpb24pIHtcclxuICAgICAgICAgICAgdmFyIG9mZnNldCA9IGhlYWRlckRlZmluaXRpb24ub2Zmc2V0O1xyXG4gICAgICAgICAgICB2YXIgYnVmZmVyID0gY2h1bmsucGF5bG9hZFswXTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGJ1ZmZlciBmb3IgdGhlIGdpdmVuIG9mZnNldFxyXG4gICAgICAgICAgICB2YXIgc2l6ZU9mUHJldmlvdXNCdWZmZXJzID0gY2h1bmsucGF5bG9hZFswXS5ieXRlTGVuZ3RoO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGNodW5rLnBheWxvYWQubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgPD0gc2l6ZU9mUHJldmlvdXNCdWZmZXJzICsgY2h1bmsucGF5bG9hZFtpXS5ieXRlTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gY2h1bmsucGF5bG9hZFtpXTtcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBvZmZzZXQgLSBzaXplT2ZQcmV2aW91c0J1ZmZlcnM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzaXplT2ZQcmV2aW91c0J1ZmZlcnMgKz0gY2h1bmsucGF5bG9hZFtpXS5ieXRlTGVuZ3RoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWJ1ZmZlcilcclxuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmVtaXQoXCJlcm9yXCIsIG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIGEgYnVmZmVyIGZvciB0aGUgZ2l2ZW4gb2Zmc2V0IVwiKSk7XHJcblxyXG4gICAgICAgICAgICBzZWxmLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgZW5jb2RlZFZhbHVlOiBidWZmZXIuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyBoZWFkZXJEZWZpbml0aW9uLnNpemUpLFxyXG4gICAgICAgICAgICAgICAgcGF0aDogaGVhZGVyRGVmaW5pdGlvbi5wYXRoLFxyXG4gICAgICAgICAgICAgICAgZGVjb2RpbmdTcGVjaWZpY2F0aW9uOiBoZWFkZXJEZWZpbml0aW9uLmRlY29kaW5nU3BlY2lmaWNhdGlvbixcclxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiBoZWFkZXJEZWZpbml0aW9uLm1ldGFkYXRhLFxyXG4gICAgICAgICAgICAgICAgbGl0dGxlRW5kaWFuOiBjaHVuay5saXR0bGVFbmRpYW5cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY2FsbGJhY2soKTtcclxuICAgIH0sIHRoaXMuX2FzeW5jKTtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IERlY2h1bmtlcjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCJ1dGlsXCIpO1xyXG5cclxuZnVuY3Rpb24gQmxhc3RFcnJvcihtZXNzYWdlLCBzdGFja1N0YXJ0RnVuY3Rpb24pIHtcclxuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG59O1xyXG5cclxudXRpbC5pbmhlcml0cyhCbGFzdEVycm9yLCBFcnJvcik7XHJcblxyXG5CbGFzdEVycm9yLnByb3RvdHlwZS5uYW1lID0gXCJCbGFzdCBFcnJvclwiO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQmxhc3RFcnJvcjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5leHBvcnRzLk9iamVjdEVuY29kZXIgPSByZXF1aXJlKFwiLi9vYmplY3RfZW5jb2RlclwiKTtcclxuZXhwb3J0cy5DaHVua2VyID0gcmVxdWlyZShcIi4vY2h1bmtlclwiKTtcclxuZXhwb3J0cy5TdHJlYW1HZW5lcmF0b3IgPSByZXF1aXJlKFwiLi9zdHJlYW1fZ2VuZXJhdG9yXCIpO1xyXG5leHBvcnRzLlN0cmVhbVJlY2VpdmVyID0gcmVxdWlyZShcIi4vc3RyZWFtX3JlY2VpdmVyXCIpO1xyXG5leHBvcnRzLkRlY2h1bmtlciA9IHJlcXVpcmUoXCIuL2RlY2h1bmtlclwiKTtcclxuZXhwb3J0cy5WYWx1ZURlY29kZXIgPSByZXF1aXJlKFwiLi92YWx1ZV9kZWNvZGVyXCIpO1xyXG5leHBvcnRzLk9iamVjdEFzc2VtYmxlciA9IHJlcXVpcmUoXCIuL29iamVjdF9hc3NlbWJsZXJcIik7XHJcblxyXG5leHBvcnRzLlByZWFtYmxlID0gcmVxdWlyZShcIi4vcHJlYW1ibGVcIik7XHJcbmV4cG9ydHMuQ2h1bmsgPSByZXF1aXJlKFwiLi9jaHVua1wiKTtcclxuXHJcbmV4cG9ydHMuRXJyb3IgPSByZXF1aXJlKFwiLi9lcnJvclwiKTtcclxuXHJcbmV4cG9ydHMud3JhcFN5bmNGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWwvd3JhcF9zeW5jX2Z1bmN0aW9uXCIpO1xyXG5leHBvcnRzLmlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlID0gcmVxdWlyZShcIi4vdXRpbC9pc19saXR0bGVfZW5kaWFuX2FyY2hpdGVjdHVyZVwiKTtcclxuIiwiKGZ1bmN0aW9uIChfX2Rpcm5hbWUpe1xuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgY2hpbGQgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChkZWNvZGluZ1NwZWNpZmljYXRpb24sIGJ1ZmZlciwgbGl0dGxlRW5kaWFuLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIGMgPSBjaGlsZC5mb3JrKF9fZGlybmFtZSArIFwiL2NoaWxkX21vZHVsZVwiKTtcclxuICAgIGMub24oXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICAgICAgc3dpdGNoIChtZXNzYWdlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcInJlc3VsdFwiOlxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgbmV3IFVpbnQ4QXJyYXkobWVzc2FnZS5yZXN1bHQpLmJ1ZmZlcik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgYy5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcnJvcikge1xyXG5cdCAgICBjLmRpc2Nvbm5lY3QoKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvcik7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjLnNlbmQoe1xyXG4gICAgICAgIGRlY29kaW5nU3BlY2lmaWNhdGlvbjogZGVjb2RpbmdTcGVjaWZpY2F0aW9uLFxyXG4gICAgICAgIGJ1ZmZlcjogYnVmZmVyLFxyXG5cdCAgICBsaXR0bGVFbmRpYW46IGxpdHRsZUVuZGlhblxyXG4gICAgfSk7XHJcbn07XHJcblxyXG5cbn0pLmNhbGwodGhpcyxcIi8uLlxcXFxub2RlX21vZHVsZXNcXFxcYmxhc3RcXFxcbGliXFxcXG5vZGVcIikiLCJcInVzZSBzdHJpY3RcIlxyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xyXG5cclxudmFyIGpwYXRoID0gcmVxdWlyZShcImpwYXRoXCIpO1xyXG5cclxudmFyIGNhbGxJbW1lZGlhdGUgPSByZXF1aXJlKFwiLi91dGlsL2NhbGxfaW1tZWRpYXRlXCIpO1xyXG5cclxuZnVuY3Rpb24gT2JqZWN0QXNzZW1ibGVyKG9wdGlvbnMpIHtcclxuICAgIFRyYW5zZm9ybS5jYWxsKHRoaXMsIHtcclxuICAgICAgICBvYmplY3RNb2RlOiB0cnVlXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLl9kZWNvZGVkT2JqZWN0ID0ge307XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuXHJcbiAgICB0aGlzLl9hc3luYyA9IHR5cGVvZiBvcHRpb25zLmFzeW5jICE9PSBcInVuZGVmaW5lZFwiID8gb3B0aW9ucy5hc3luYyA6IHRydWU7XHJcbn1cclxuXHJcbnV0aWwuaW5oZXJpdHMoT2JqZWN0QXNzZW1ibGVyLCBUcmFuc2Zvcm0pO1xyXG5cclxuT2JqZWN0QXNzZW1ibGVyLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGRlY29kZWREYXRhLCBfLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgY2FsbEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAganBhdGguZXZhbHVhdGUoZGVjb2RlZERhdGEucGF0aCwgc2VsZi5fZGVjb2RlZE9iamVjdCkuZm9yRWFjaChmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuaXNSb290KVxyXG4gICAgICAgICAgICAgICAgc2VsZi5fZGVjb2RlZE9iamVjdCA9IGRlY29kZWREYXRhLnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXN1bHQudmFsdWUgPSBkZWNvZGVkRGF0YS52YWx1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuT2JqZWN0QXNzZW1ibGVyLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIGNhbGxJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNlbGYucHVzaChzZWxmLl9kZWNvZGVkT2JqZWN0KTtcclxuICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gT2JqZWN0QXNzZW1ibGVyO1xyXG4iLCIvLyAjIE9iamVjdEVuY29kZXJcclxuXHJcbi8vIEFuIGBPYmplY3RFbmNvZGVyYCBpcyBhIE5vZGVKUyB0cmFuc2Zvcm0gc3RyZWFtIHRoYXQgdHJhbnNmb3JtcyBhIGdpdmVuIG9iamVjdCB1c2luZyB0aGUgc3BlY2lmaWVkIGVuY29kZXJzLlxyXG4vLyBFbmNvZGVycyBhcmUgbWFwcGVkIHRvIHZhbHVlcyB1c2luZyBKUGF0aCBleHByZXNzaW9ucy5cclxuLy8gYGBgamF2YXNjcmlwdFxyXG4vLyB7XHJcbi8vXHRcdHBhdGg6IC9zZWxlY3RvclxyXG4vL1x0XHRlbmNvZGVyOiBlbmNvZGVyRm9yVmFsdWVBdFBhdGhcclxuLy8gfVxyXG4vLyBgYGBcclxuLy8gQW4gYXJyYXkgb2YgdGhlc2UgbWFwcGluZ3MgaXMgcGFzc2VkIHRvIHRoZSB3cml0ZSBmdW5jdGlvbnMgYXMgdGhlIHNlY29uZCBhcmd1bWVudC5cclxuLy8gT25seSB2YWx1ZXMgdGhhdCBhcmUgc2VsZWN0ZWQgYnkgdGhlIEpQYXRoIGV4cHJlc3Npb25zIGFyZSB0cmFuc2Zvcm1lZC5cclxuLy8gVGhlIHBhdGgtZW5jb2RlciBtYXBwaW5nIGNhbiBvcHRpb25hbGx5IGluY2x1ZGUgYWxzbyBtZXRhZGF0YSB0aGF0IGlzIG5vdCBlbmNvZGVkIHVuY29uZGl0aW9uYWxseVxyXG4vLyBmb3J3YXJkZWQgdGhyb3VnaCB0aGUgc3RyZWFtLlxyXG5cclxuXHJcbi8vICMjIEVuY29kZXJcclxuXHJcbi8vIEFuIGVuY29kZXIgaXMgYW4gb2JqZWN0IHRoYXQgcHJvdmlkZXMgdGhlIGZvbGxvd2luZyBpbnRlcmZhY2U6XHJcblxyXG4vLyAtIEEgZnVuY3Rpb24gYGVuY29kZWAgdGhhdCBnaXZlbiBhIHZhbHVlIHJldHVybnMgYW4gYEFycmF5QnVmZmVyYC5cclxuLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCB0d28gYXJndW1lbnRzLCB0aGUgdmFsdWUgdG8gZW5jb2RlIGFuZCBhIGJvb2xlYW4gc3BlY2lmeWluZyBpZiB0aGUgcmVzdWx0aW5nIGJ1ZmZlclxyXG4vLyBzaG91bGQgYmUgaW4gbGl0dGxlLWVuZGlhbiAoYHRydWVgKSBvciBiaWctZW5kaWFuIChgZmFsc2VgKSBmb3JtYXQuXHJcbi8vIEVuZGlhbm5lcyBpcyBzcGVjaWZpZWQgd2l0aCB1c2luZyBhIGJvb2xlYW4gdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgaW50ZXJmYWNlIG9mIHRoZSBEYXRhVmlldyBpbiB0aGVcclxuLy8gVHlwZWRBcnJheSBzcGVjaWZpY2F0aW9uIGFuZCBjYW4gc2F2ZWx5IGJlIHBhc3NlZCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50IHRvIGFsbCBgRGF0YVZpZXcjZ2V0YCBhbmQgYERhdGFWaWV3I3NldGAgbWV0aG9kcy5cclxuLy8gT3B0aW9uYWxseSB0aGUgZnVuY3Rpb24gY2FuIHRha2UgYSB0aGlyZCBhcmd1bWVudCwgYSBjYWxsYmFjaywgaW4gY2FzZSB0aGUgZW5jb2RpbmcgaXMgYXN5bmNocm9ub3VzLlxyXG4vLyBBbiBgZW5jb2RlYCBmdW5jdGlvbiB0aGF0IHRha2VzIHRocmVlIG9yIGEgdmFyaWFibGUgbnVtYmVyIG9mIGFyZ3VtZW50IGlzIGNvbnNpZGVyZWQgdG8gYmUgYXN5bmNocm9ub3VzLlxyXG4vLyBUaGUgcHJvdmlkZWQgY2FsbGJhY2sgZXhwZWN0cyB0d28gcGFyYW1ldGVyczpcclxuLy9cclxuLy8gMS4gQW4gZXJyb3Igb2JqZWN0IGluIGNhc2UgYW55dGhpbmcgd2VudCB3cm9uZy5cclxuLy8gMi4gVGhlIGBBcnJheUJ1ZmZlcmAgY29udGFpbmluZyB0aGUgZW5jb2RlZCB2YWx1ZS5cclxuLy9cclxuLy8gSWYgdGhlIGZ1bmN0aW9uIGlzIHN5bmNocm9ub3VzLCBlcnJvcnMgc2hvdWQgYmUgcmVwb3J0ZWQgYnkgdGhyb3dpbmcgYW4gZXhjZXB0aW9uLlxyXG4vL1xyXG4vLyAtIEEgcHJvcGVydHkgYGRlY29kaW5nU3BlY2lmaWNhdGlvbmAgdGhhdCBjb250YWlucyBhIFVSTCB0aGF0IHVuaXF1ZWx5IGlkZW50aWZpZXMgdGhlIGRlY29kaW5nIHByb2NlZHVyZVxyXG4vLyBuZWNlc3NhcnkgdG8gZGVjb2RlIHRoZSBvcmlnaW5hbCBkYXRhIGZyb20gdGhlIGBBcnJheUJ1ZmZlcmAgcmV0dXJuZWQgYnkgdGhlIGBlbmNvZGVgIGZ1bmN0aW9uLlxyXG4vLyBUaGlzIFVSTCBtYXliZSBxdWVyaWVkIGZvciBhIGRlY29kaW5nIGltcGxlbWVudGF0aW9uIGF0IHRoZSBjbGllbnQgc2lkZSB1c2luZyBhbiBIVFRQLUdFVCByZXF1ZXN0XHJcbi8vIHdpdGggYW4gYWNjZXB0LWhlYWRlcjogXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0XCIuXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XHJcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCdzdHJlYW0nKS5UcmFuc2Zvcm07XHJcblxyXG52YXIgYXN5bmMgPSByZXF1aXJlKFwiYXN5bmNcIik7XHJcbnZhciBqcGF0aCA9IHJlcXVpcmUoXCJqcGF0aFwiKTtcclxuXHJcbnZhciBpc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSA9IHJlcXVpcmUoXCIuL3V0aWwvaXNfbGl0dGxlX2VuZGlhbl9hcmNoaXRlY3R1cmVcIik7XHJcbnZhciB3cmFwU3luY0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbC93cmFwX3N5bmNfZnVuY3Rpb25cIik7XHJcbnZhciBjYWxsSW1tZWRpYXRlID0gcmVxdWlyZShcIi4vdXRpbC9jYWxsX2ltbWVkaWF0ZVwiKTtcclxuXHJcbi8vIENyZWF0ZXMgYW4gT2JqZWN0RW5jb2RlciBpbnN0YW5jZS5cclxuLy8gSWYgbGl0dGxlRW5kaWFuIGlzIHVuZGVmaW5lZCB0aGUgY3VycmVudCBzeXN0ZW0gYXJjaGl0ZWN0dXJlJ3MgZW5kaWFubmVzcyB3aWxsIGJlIHVzZWQuXHJcbi8vIFRoZSBnaXZlbiB2YWx1ZSBmb3IgbGl0dGxlRW5kaWFuIHdpbGwgYmUgZm9yd2FyZGVkIHRvIGFsbCBlbmNvZGVycy5cclxuZnVuY3Rpb24gT2JqZWN0RW5jb2RlcihvcHRpb25zKSB7XHJcblx0VHJhbnNmb3JtLmNhbGwodGhpcywge1xyXG5cdFx0b2JqZWN0TW9kZTogdHJ1ZVxyXG5cdH0pO1xyXG5cclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG5cclxuICAgIHRoaXMuX2xpdHRsZUVuZGlhbiA9IHR5cGVvZiBvcHRpb25zLmxpdHRsZUVuZGlhbiAhPT0gXCJ1bmRlZmluZWRcIiA/IG9wdGlvbnMubGl0dGxlRW5kaWFuIDogaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUoKTtcclxuICAgIHRoaXMuX2FzeW5jID0gdHlwZW9mIG9wdGlvbnMuYXN5bmMgIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhPYmplY3RFbmNvZGVyLCBUcmFuc2Zvcm0pO1xyXG5cclxuLy8gU3RhcnRzIHRoZSBlbmNvZGluZyBvZiB0aGUgZ2l2ZW4gb2JqZWN0IGNvbnNpZGVyaW5nIHRoZSBnaXZlbiBwYXRoIGVuY29kZXIgbWFwcGluZ3MuXHJcbi8vIFdlIGRvIG5vdCBzdGFydCB0aGUgZW5jb2RpbmcgcHJvY2VzcyBkaXJlY3RseSwgYnV0IGRlbGF5IGVuY29kaW5nIHVzaW5nIHNldEltbWVkaWF0ZS5cclxuLy8gRW5jb2Rpbmcgd2lsbCBzdGFydCBhcyBzb29uIGFzIHRoZSBWTSBoYXMgcmV0YWtlbiBjb250cm9sIGFuZCBjb21wbGV0ZWQgb3RoZXIgcGVuZGluZyBvcGVyYXRpb25zLlxyXG4vLyBUaGlzIGlzIGltcG9ydGFudCB0byBtaW1pYyB0aGUgYmVoYXZpb3Igb2YgYWxsIE5vZGVKUyBzdHJlYW1zIHRoYXQgYXJlIGFzeW5jaHJvbm91cy5cclxuLy8gVGhlIHVzZXIgY2FuIG5vdyByZWdpc3RlciBldmVudCBsaXN0ZW5lcnMgYWZ0ZXIgY2FsbGluZyB3cml0ZS9lbmQgd2l0aG91dCByaXNraW5nIHRvXHJcbi8vIG1pc3MgZXZlbnRzIHNpbmNlIHRoZSBhY3R1YWwgZW5jb2Rpbmcgd2lsbCBzdGFydCBhcyBlYXJseSBhcyB0aGUgdXNlcnMgY3VycmVudCBjb250cm9sIGZsb3cgZW5kcy5cclxuT2JqZWN0RW5jb2Rlci5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChvYmplY3RUb0VuY29kZSwgc2VsZWN0b3JPcHRpb25zLCBjYWxsYmFjaykge1xyXG4gICAgY2FsbEltbWVkaWF0ZSh0aGlzLl9lbmNvZGUuYmluZCh0aGlzLCBvYmplY3RUb0VuY29kZSwgc2VsZWN0b3JPcHRpb25zLCBjYWxsYmFjayksIHRoaXMuX2FzeW5jKTtcclxufTtcclxuXHJcbk9iamVjdEVuY29kZXIucHJvdG90eXBlLl9lbmNvZGUgPSBmdW5jdGlvbiAob2JqZWN0VG9FbmNvZGUsIHNlbGVjdG9yT3B0aW9ucywgY2FsbGJhY2spIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciB1bm1hdGNoZWRQYXJ0cyA9IG9iamVjdFRvRW5jb2RlO1xyXG4gICAgdmFyIHNlbGVjdG9yT3B0aW9uc0NvdW50ID0gc2VsZWN0b3JPcHRpb25zLmxlbmd0aDtcclxuICAgIHZhciBjdXJyZW50U2VsZWN0b3JJZHggPSAwO1xyXG5cdGFzeW5jLmVhY2hTZXJpZXMoc2VsZWN0b3JPcHRpb25zLCBmdW5jdGlvbiAob3B0aW9ucywgY2FsbGJhY2spIHtcclxuXHRcdHZhciByZXN1bHRzID0ganBhdGguZXZhbHVhdGUob3B0aW9ucy5wYXRoLCB1bm1hdGNoZWRQYXJ0cylcclxuXHRcdGFzeW5jLmVhY2gocmVzdWx0cy5kZWZpbmVkUmVzdWx0cywgZnVuY3Rpb24gKHJlc3VsdCwgY2FsbGJhY2spIHtcclxuXHRcdFx0dmFyIGVuY29kZXIgPSBvcHRpb25zLmVuY29kZXI7XHJcblx0XHRcdHdyYXBTeW5jRnVuY3Rpb24oZW5jb2Rlci5lbmNvZGUuYmluZChlbmNvZGVyKSkocmVzdWx0LnZhbHVlLCBzZWxmLl9saXR0bGVFbmRpYW4sIGZ1bmN0aW9uIChlcnJvciwgZW5jb2RlZFZhbHVlKSB7XHJcblx0XHRcdFx0aWYgKGVycm9yKVxyXG5cdFx0XHRcdFx0cmV0dXJuIHNlbGYuZW1pdChcImVycm9yXCIsIGVycm9yKTtcclxuXHRcdFx0XHRzZWxmLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIGVuY29kZWRWYWx1ZTogZW5jb2RlZFZhbHVlLFxyXG5cdFx0XHRcdFx0cGF0aDogcmVzdWx0LnBhdGgsXHJcblx0XHRcdFx0XHRkZWNvZGluZ1NwZWNpZmljYXRpb246IGVuY29kZXIuZGVjb2RpbmdTcGVjaWZpY2F0aW9uLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IG9wdGlvbnMubWV0YWRhdGFcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sIGNhbGxiYWNrKTtcclxuICAgICAgICArK2N1cnJlbnRTZWxlY3RvcklkeDtcclxuICAgICAgICAvLyBPbmx5IGV2YWx1YXRlIHVubWF0Y2hlZCBwYXJ0IGlmIHRoZXJlIGlzIGFub3RoZXIgc2VsZWN0b3IgZm9sbG93aW5nXHJcbi8vICAgICAgICBpZiAoY3VycmVudFNlbGVjdG9ySWR4IDwgc2VsZWN0b3JPcHRpb25zQ291bnQpXHJcbi8vXHRcdCAgICB1bm1hdGNoZWRQYXJ0cyA9IGpwYXRoLmV4dHJhY3RVbmNvdmVyZWRQYXJ0cyhvcHRpb25zLnBhdGgsIHVubWF0Y2hlZFBhcnRzKTtcclxuXHJcblx0fSwgY2FsbGJhY2spO1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gT2JqZWN0RW5jb2RlcjtcclxuIiwiLy8gIyBQcmVhbWJsZVxyXG5cclxuLy8gVGhlIHByZWFtYmxlIG9mIGEgYmxhc3Qgb2N0ZXQgc3RyZWFtIGNvbXByaXNlcyB0aGUgZm9sbG93aW5nIGNvbXBvbmVudHM6XHJcbi8vXHJcbi8vIC0gU2lnbmF0dXJlOiBBIHVpbnQzMiB2YWx1ZSBlcXVhbCB0byBgMHg2MjZDNzM3NGAgKEFTQ0lJIGVuY29kZWQgXCJibHN0XCIpLlxyXG4vLyBUaGlzIHNpZ25hdHVyZSB2YWx1ZSBpcyBmb3IgaWRlbnRpZmljYXRpb24gYXMgd2VsbCBhcyBlbmRpYW5uZXNzIGRldGVjdGlvbiBvZiB0aGUgaW5jb21pbmcgc3RyZWFtLlxyXG4vLyAtIE1ham9yIFZlcnNpb246IEEgdWludDggdmFsdWUgdGhhdCBzcGVjaWZpZXMgdGhlIG1ham9yIHZlcnNpb24gb2YgdGhlIGluY29taW5nIHN0cmVhbSdzIGZvcm1hdC5cclxuLy8gLSBNaW5vciBWZXJzaW9uOiBBIHVpbnQ4IHZhbHVlIHRoYXQgc3BlY2lmaWVzIHRoZSBtaW5vciB2ZXJzaW9uIG9mIHRoZSBpbmNvbWluZyBzdHJlYW07cyBmb3JtYXQuXHJcbi8vIC0gSGVhZGVyIERlY29kaW5nIFNwZWNpZmljYXRpb246IEEgTlVMIFwiXFwwXCIgdGVybWluYXRlZCBBU0NJSSBlbmNvZGVkIHN0cmluZyB0aGF0IHNwZWNpZmllcyB0aGUgZGVjb2RpbmcgcHJvY2VkdXJlIHRvXHJcbi8vIGVuY29kZSBhIGNodW5rcyBoZWFkZXIgaW5mb3JtYXRpb24uXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBhYm9wcyA9IHJlcXVpcmUoXCJhYm9wc1wiKTtcclxuXHJcbnZhciBQcmVhbWJsZSA9IHt9O1xyXG5cclxuLy8gQVNDSUkgYmxzdFxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQcmVhbWJsZSwge1xyXG5cdC8qKlxyXG5cdCAqIFRoZSBzaWduYXR1cmUgYnl0ZXMgdGhhdCBjYW4gYmUgdXNlZCB0byBpZGVudGlmeSB0aGUgb2N0ZXQgc3RyZWFtIGFuZCBpdHMgZW5kaWFubmVzcy5cclxuXHQgKlxyXG5cdCAqIEBwdWJsaWNcclxuXHQgKiBAcHJvcGVydHkgc2lnbmF0dXJlXHJcblx0ICogQGNvbnN0YW50XHJcblx0ICogQHR5cGUge3VpbnQzMn1cclxuXHQgKi9cclxuXHRzaWduYXR1cmU6IHtcclxuXHRcdGdldDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHQvLyBBU0NJSSBibHN0XHJcblx0XHRcdHJldHVybiAweDYyNkM3Mzc0O1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0LyoqXHJcblx0ICogTWlub3IgdmVyc2lvbiBudW1iZXJcclxuXHQgKlxyXG5cdCAqIFNpemU6IDEgT2N0ZXRzXHJcblx0ICogQHB1YmxpY1xyXG5cdCAqIEBwcm9wZXJ0eSBtYWpvclZlcnNpb25cclxuXHQgKiBAY29uc3RhbnRcclxuXHQgKiBAdHlwZSB7aW50fVxyXG5cdCAqL1xyXG5cdG1ham9yVmVyc2lvbjoge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiAweDAwO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0LyoqXHJcblx0ICogTWlub3IgdmVyc2lvbiBudW1iZXJcclxuXHQgKlxyXG5cdCAqIFNpemU6IDEgT2N0ZXRzXHJcblx0ICogQHB1YmxpY1xyXG5cdCAqIEBwcm9wZXJ0eSBtaW5vclZlcnNpb25cclxuXHQgKiBAY29uc3RhbnRcclxuXHQgKiBAdHlwZSB7aW50fVxyXG5cdCAqL1xyXG5cdG1pbm9yVmVyc2lvbjoge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiAweDAxO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIGJsYXN0IHByZWFtYmxlIGJ1ZmZlciBjb250YWluaW5nIHRoZSBiaW5hcnkgcmVwcmVzZW50YXRpb24gb2YgdGhlIHByZWFtYmxlIGluIHRoZSBnaXZlbiBlbmRpYW5uZXNzLlxyXG4gKiBUaGlzIGluY2x1ZGVzIDQgb2N0ZXRzIHNpZ25hdHVyZSBieXRlcyArIDEgb2N0ZXQgbWFqb3IgdmVyc2lvbiBudW1iZXIgKyAxIG9jdGV0IG1pbm9yIHZlcnNpb24gbnVtYmVyICsgdmFyaWFibGUgbGVuZ3RoXHJcbiAqIEFTQ0lJIGVuY29kZWQgTlVMIHRlcm1pbmF0ZWQgVVJMIGZvciB0aGUgaGVhZGVyIGRlY29kaW5nIHNwZWNpZmljYXRpb24uXHJcbiAqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIGNyZWF0ZVByZWFtYmxlQnVmZmVyXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBoZWFkZXJEZWNvZGluZ1NwZWNpZmljYXRpb24gQSBVUkwgdGhhdCB1bmlxdWVseSBpZGVudGlmaWVzIHRoZSBkZWNvZGluZyBwcm9jZWR1cmUgdG8gZGVjb2RlIHRoZSBoZWFkZXJcclxuICogaW5mb3JtYXRpb24gb2YgdGhlIGNodW5rcyBpbiB0aGUgc3RyZWFtLlxyXG4gKiBAcGFyYW0ge2Jvb2x9IFtsaXR0bGVFbmRpYW4gPSBmYWxzZV0gSWYgdHJ1ZSB0aGUgYnVmZmVyIHdpbGwgYmUgd3JpdHRlbiBpbiBsaXR0bGUtZW5kaWFuIGZvcm1hdC5cclxuICogQHJldHVybiB7QXJyYXlCdWZmZXJ9IEFuIEFycmF5QnVmZmVyIGNvbnRhaW5pbmcgdGhlIHByZWFtYmxlIG9jdGV0IHN0cmVhbS5cclxuICovXHJcblByZWFtYmxlLmJ1ZmZlciA9IGZ1bmN0aW9uIChoZWFkZXJEZWNvZGluZ1NwZWNpZmljYXRpb24sIGxpdHRsZUVuZGlhbikge1xyXG5cdC8vIFRoZSBzaXplIG9mIHRoZSBidWZmZXI6XHJcblx0Ly8gNCBvY3RldCBzaWduYXR1cmUgKyAxIG9jdGV0IG1pbm9yIHZlcnNpb24gKyAxIG9jdGV0IG1ham9yIHZlcnNpb24gKyBIZWFkZXJEZWNvZGVyVVJMIGFzIGFzY2lpICsgTlVMTCBieXRlXHJcblx0dmFyIHVybFNpemUgPSBhYm9wcy5ieXRlU2l6ZUZvclN0cmluZyhoZWFkZXJEZWNvZGluZ1NwZWNpZmljYXRpb24sIFwiYXNjaWlcIikgKyAxO1xyXG5cdHZhciBidWZmZXJTaXplID0gNCArIDEgKyAxICsgdXJsU2l6ZTtcclxuXHR2YXIgYnVmZmVyVmlldyA9IG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIoYnVmZmVyU2l6ZSkpO1xyXG5cdHZhciBidWZmZXJPZmZzZXQgPSAwO1xyXG5cclxuXHRidWZmZXJWaWV3LnNldFVpbnQzMihidWZmZXJPZmZzZXQsIFByZWFtYmxlLnNpZ25hdHVyZSwgbGl0dGxlRW5kaWFuKTtcclxuXHRidWZmZXJPZmZzZXQgKz0gNDtcclxuXHJcblx0YnVmZmVyVmlldy5zZXRVaW50OChidWZmZXJPZmZzZXQsIFByZWFtYmxlLm1ham9yVmVyc2lvbik7XHJcblx0YnVmZmVyT2Zmc2V0ICs9IDE7XHJcblxyXG5cdGJ1ZmZlclZpZXcuc2V0VWludDgoYnVmZmVyT2Zmc2V0LCBQcmVhbWJsZS5taW5vclZlcnNpb24pO1xyXG5cdGJ1ZmZlck9mZnNldCArPSAxO1xyXG5cclxuICAgIGFib3BzLnNldENTdHJpbmcoYnVmZmVyVmlldywgYnVmZmVyT2Zmc2V0LCBoZWFkZXJEZWNvZGluZ1NwZWNpZmljYXRpb24pO1xyXG5cclxuXHRyZXR1cm4gYnVmZmVyVmlldy5idWZmZXI7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBQcmVhbWJsZTtcclxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcblwidXNlIHN0cmljdFwiO1xyXG5cclxuaWYgKHByb2Nlc3MuYnJvd3NlcilcclxuICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2Jyb3dzZXIvcnVuX2V4dGVybmFsX2RlY29kaW5nXCIpO1xyXG5lbHNlXHJcbiAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9ub2RlL3J1bl9leHRlcm5hbF9kZWNvZGluZ1wiKTtcclxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIitOc2NObVwiKSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsQnVmZmVyKXtcbi8vICMgU3RyZWFtR2VuZXJhdG9yXHJcblxyXG4vLyBHZW5lcmF0ZXMgdGhlIGZpbmFsIG91dHB1dCBzdHJlYW0gdGhhdCBjYW4gYmUgc2VudCBvdmVyIHRoZSB3aXJlLlxyXG4vLyBJdCB0YWtlcyBjaHVua3MgYXMgZ2VuZXJhdGVkIGJ5IHRoZSBDaHVua2VyIGFuZCBjYWxscyB0aGVpciB0b0J1ZmZlciBtZXRob2QuXHJcbi8vIFRoaXMgYnVmZmVyIGlzIHRoZW4gZW1pdHRlZCBpbiB0aGUgZGF0YSBldmVudC5cclxuLy8gSXQgYWxzbyBnZW5lcmF0ZXMgdGhlIHByZWFtYmxlIG9mIHRoZSBzdHJlYW0uXHJcbi8vIEZvciBjb252aW5pZW5jZSBpdCBkaWZmZXJlbnRpYXRlcyBiZXR3ZWVuIE5vZGVKUyBhbmQgQnJvd3NlciBlbnZpcm9ubWVudC5cclxuLy8gSW4gTm9kZUpTIHRoZSBidWZmZXJzIGFyZSBOb2RlSlMgYnVmZmVycyB0aGF0IGNhbiBiZSBwaXBlZCBpbnRvIGEgc2VydmVyJ3MgcmVzcG9uc2Ugb2JqZWN0LlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XHJcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlRyYW5zZm9ybTtcclxuXHJcbnZhciBqc29uQ29kZWMgPSByZXF1aXJlKFwiYmxhc3QtY29kZWNzXCIpLmpzb247XHJcblxyXG52YXIgQmxhc3RFcnJvciA9IHJlcXVpcmUoXCIuL2Vycm9yXCIpO1xyXG52YXIgUHJlYW1ibGUgPSByZXF1aXJlKFwiLi9wcmVhbWJsZVwiKTtcclxudmFyIENodW5rID0gcmVxdWlyZShcIi4vY2h1bmtcIik7XHJcbnZhciB3cmFwU3luY0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbC93cmFwX3N5bmNfZnVuY3Rpb25cIik7XHJcbnZhciBpc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSA9IHJlcXVpcmUoXCIuL3V0aWwvaXNfbGl0dGxlX2VuZGlhbl9hcmNoaXRlY3R1cmVcIik7XHJcbnZhciBjYWxsSW1tZWRpYXRlID0gcmVxdWlyZShcIi4vdXRpbC9jYWxsX2ltbWVkaWF0ZVwiKTtcclxuXHJcbmZ1bmN0aW9uIFN0cmVhbUdlbmVyYXRvcihvcHRpb25zKSB7XHJcbiAgICBUcmFuc2Zvcm0uY2FsbCh0aGlzKTtcclxuXHJcbiAgICB0aGlzLl93cml0YWJsZVN0YXRlLm9iamVjdE1vZGUgPSB0cnVlO1xyXG4gICAgdGhpcy5fcmVhZGFibGVTdGF0ZS5vYmplY3RNb2RlID0gZmFsc2U7XHJcblxyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcblxyXG4gICAgdGhpcy5faGVhZGVyRW5jb2RlciA9IG9wdGlvbnMuaGVhZGVyRW5jb2RlciB8fCB7XHJcblx0XHRlbmNvZGU6IHdyYXBTeW5jRnVuY3Rpb24oanNvbkNvZGVjLmVuY29kZS5iaW5kKGpzb25Db2RlYykpLFxyXG5cdFx0ZGVjb2RpbmdTcGVjaWZpY2F0aW9uOiBcImh0dHA6Ly93d3cuYmxhc3QtZm9ybWF0LmNvbS8wLjEvaGVhZGVyRGVjb2RpbmdTcGVjaWZpY2F0aW9uL1wiXHJcblx0fTtcclxuXHR0aGlzLl9saXR0bGVFbmRpYW4gPSB0eXBlb2Ygb3B0aW9ucy5saXR0bGVFbmRpYW4gIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmxpdHRsZUVuZGlhbiA6IGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlKCk7XHJcbiAgICB0aGlzLl9hc3luYyA9IHR5cGVvZiBvcHRpb25zLmFzeW5jICE9PSBcInVuZGVmaW5lZFwiID8gb3B0aW9ucy5hc3luYyA6IHRydWU7XHJcbn1cclxuXHJcbnV0aWwuaW5oZXJpdHMoU3RyZWFtR2VuZXJhdG9yLCBUcmFuc2Zvcm0pO1xyXG5cclxuU3RyZWFtR2VuZXJhdG9yLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBfLCBjYWxsYmFjaykge1xyXG5cdGlmICghdGhpcy5fcHJlYW1ibGVQdXNoZWQpXHJcbiAgICAgICAgY2FsbEltbWVkaWF0ZSh0aGlzLl9wdXNoUHJlYW1ibGUuYmluZCh0aGlzKSwgdGhpcy5fYXN5bmMpO1xyXG4gICAgY2FsbEltbWVkaWF0ZSh0aGlzLl9lbmNvZGVDaHVuay5iaW5kKHRoaXMsIGNodW5rLCBjYWxsYmFjayksIHRoaXMuX2FzeW5jKTtcclxufTtcclxuXHJcblN0cmVhbUdlbmVyYXRvci5wcm90b3R5cGUuX3B1c2hQcmVhbWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuXHR0aGlzLl9wdXNoQnVmZmVyKFByZWFtYmxlLmJ1ZmZlcih0aGlzLl9oZWFkZXJFbmNvZGVyLmRlY29kaW5nU3BlY2lmaWNhdGlvbiwgdGhpcy5fbGl0dGxlRW5kaWFuKSk7XHJcblx0dGhpcy5fcHJlYW1ibGVQdXNoZWQgPSB0cnVlO1xyXG59O1xyXG5cclxuU3RyZWFtR2VuZXJhdG9yLnByb3RvdHlwZS5fZW5jb2RlQ2h1bmsgPSBmdW5jdGlvbiAoY2h1bmssIGNhbGxiYWNrKSB7XHJcblx0dmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdGhpcy5faGVhZGVyRW5jb2Rlci5lbmNvZGUoY2h1bmsuaGVhZGVyRGVmaW5pdGlvbnMsIHRoaXMuX2xpdHRsZUVuZGlhbiwgZnVuY3Rpb24gKGVycm9yLCBoZWFkZXJEZWZpbml0aW9uc0J1ZmZlcikge1xyXG4gICAgICAgIGlmIChlcnJvcilcclxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdChcImVycm9yXCIsIGVycm9yKTtcclxuXHJcbiAgICAgICAgdmFyIGhlYWRlclNpemUgPSBoZWFkZXJEZWZpbml0aW9uc0J1ZmZlci5ieXRlTGVuZ3RoO1xyXG5cclxuICAgICAgICAvLyBUaGUgb3ZlcmFsbCBidWZmZXIgY29udGFpbnMgbm90IG9ubHkgdGhlIGhlYWRlciBhbmQgdGhlIHBheWxvYWQsXHJcbiAgICAgICAgLy8gYnV0IDQgYnl0ZXMgZm9yIHRoZSBoZWFkZXIgc2l6ZSBhbmQgNCBieXRlcyBmb3IgdGhlIG92ZXJhbGwgY2h1bmsgc2l6ZTtcclxuICAgICAgICB2YXIgb3ZlcmFsbENodW5rU2l6ZSA9IDQgKyA0ICsgaGVhZGVyU2l6ZSArIGNodW5rLnBheWxvYWRTaXplO1xyXG4gICAgICAgIHZhciBzaXplQnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDgpO1xyXG4gICAgICAgIHZhciBzaXplVmlldyA9IG5ldyBEYXRhVmlldyhzaXplQnVmZmVyKTtcclxuXHJcbiAgICAgICAgc2l6ZVZpZXcuc2V0VWludDMyKDAsIG92ZXJhbGxDaHVua1NpemUsIHNlbGYuX2xpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgc2l6ZVZpZXcuc2V0VWludDMyKDQsIGhlYWRlclNpemUsIHNlbGYuX2xpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgc2VsZi5fcHVzaEJ1ZmZlcihzaXplQnVmZmVyKTtcclxuICAgICAgICBzZWxmLl9wdXNoQnVmZmVyKGhlYWRlckRlZmluaXRpb25zQnVmZmVyKTtcclxuICAgICAgICBjaHVuay5wYXlsb2FkLmZvckVhY2goc2VsZi5fcHVzaEJ1ZmZlci5iaW5kKHNlbGYpKTtcclxuICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5TdHJlYW1HZW5lcmF0b3IucHJvdG90eXBlLl9wdXNoQnVmZmVyID0gZnVuY3Rpb24gKGJ1ZmZlcikge1xyXG5cdHRoaXMucHVzaCh0b0J1ZmZlcihidWZmZXIpKTtcclxufTtcclxuXHJcblN0cmVhbUdlbmVyYXRvci5wcm90b3R5cGUuX2ZsdXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBjYWxsSW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzZWxmLl9wdXNoQnVmZmVyKG5ldyBBcnJheUJ1ZmZlcig0KSk7XHJcbiAgICAgICAgY2FsbGJhY2soKTtcclxuICAgIH0sIHRoaXMuX2FzeW5jKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHRvQnVmZmVyKGJ1ZmZlcikge1xyXG5cdGlmIChwcm9jZXNzLmJyb3dzZXIpIHtcclxuXHRcdGlmIChidWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcilcclxuXHRcdFx0cmV0dXJuIGJ1ZmZlcjtcclxuXHRcdGVsc2VcclxuXHRcdFx0cmV0dXJuIGJ1ZmZlci50b0FycmF5QnVmZmVyKCk7XHJcblx0fVxyXG5cclxuXHRpZiAoYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpXHJcblx0XHRyZXR1cm4gbmV3IEJ1ZmZlcihuZXcgVWludDhBcnJheShidWZmZXIpKTtcclxuXHRlbHNlXHJcblx0XHRyZXR1cm4gYnVmZmVyO1xyXG5cclxufVxyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gU3RyZWFtR2VuZXJhdG9yO1xyXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpLHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuVHJhbnNmb3JtO1xyXG5cclxudmFyIGFib3BzID0gcmVxdWlyZShcImFib3BzXCIpO1xyXG52YXIganNvbkNvZGVjID0gcmVxdWlyZShcImJsYXN0LWNvZGVjc1wiKS5qc29uO1xyXG5cclxudmFyIEJsYXN0RXJyb3IgPSByZXF1aXJlKFwiLi9lcnJvclwiKTtcclxudmFyIFByZWFtYmxlID0gcmVxdWlyZShcIi4vcHJlYW1ibGVcIik7XHJcbnZhciB3cmFwU3luY0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbC93cmFwX3N5bmNfZnVuY3Rpb25cIik7XHJcbnZhciBpc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSA9IHJlcXVpcmUoXCIuL3V0aWwvaXNfbGl0dGxlX2VuZGlhbl9hcmNoaXRlY3R1cmVcIik7XHJcbnZhciBjYWxsSW1tZWRpYXRlID0gcmVxdWlyZShcIi4vdXRpbC9jYWxsX2ltbWVkaWF0ZVwiKTtcclxuXHJcbmZ1bmN0aW9uIFN0cmVhbVJlY2VpdmVyKG9wdGlvbnMpIHtcclxuXHRUcmFuc2Zvcm0uY2FsbCh0aGlzKTtcclxuXHJcblx0dGhpcy5fd3JpdGFibGVTdGF0ZS5vYmplY3RNb2RlID0gZmFsc2U7XHJcblx0dGhpcy5fcmVhZGFibGVTdGF0ZS5vYmplY3RNb2RlID0gdHJ1ZTtcclxuXHJcblx0dGhpcy5fcHJlYW1ibGVSZWNlaXZlZCA9IGZhbHNlO1xyXG5cdHRoaXMuX2xhc3RDaHVua1JlY2VpdmVkID0gZmFsc2U7XHJcblx0dGhpcy5fbGl0dGxlRW5kaWFuID0gdW5kZWZpbmVkO1xyXG5cdHRoaXMuX2hlYWRlckRlY29kZXIgPSBqc29uQ29kZWM7XHJcblxyXG5cdHRoaXMuX2J1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigwKTtcclxuXHR0aGlzLl9jdXJyZW50QnVmZmVyT2Zmc2V0ID0gMDtcclxuXHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHRoaXMuX2FzeW5jID0gdHlwZW9mIG9wdGlvbnMuYXN5bmMgIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhTdHJlYW1SZWNlaXZlciwgVHJhbnNmb3JtKTtcclxuXHJcblN0cmVhbVJlY2VpdmVyLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGRhdGEsIF8sIGNhbGxiYWNrKSB7XHJcbiAgICBjYWxsSW1tZWRpYXRlKHRoaXMuX2RlY29kZS5iaW5kKHRoaXMsIGRhdGEsIGNhbGxiYWNrKSwgdGhpcy5fYXN5bmMpO1xyXG59O1xyXG5cclxuU3RyZWFtUmVjZWl2ZXIucHJvdG90eXBlLl9kZWNvZGUgPSBmdW5jdGlvbiAoZGF0YUJ1ZmZlciwgY2FsbGJhY2spIHtcclxuXHQvLyBXZSBkbyBub3QgZXhwZWN0IHRoYXQgYGRhdGFCdWZmZXJgIGlzIGEgY29tcGxldGUgY2h1bmsgb3IgcHJlYW1ibGUuXHJcblx0Ly8gSWYgd2UgaGF2ZW4ndCByZWNlaXZlZCBhIHByZWFtYmxlIHlldCwgd2UgZXhwZWN0IHRoZSBmaXJzdCBkYXRhIHRvIGVpdGhlciBiZSB0aGUgY29tcGxldGUgb3IgYXQgbGVhc3QgYSBwYXJ0IG9mXHJcblx0Ly8gdGhlIHByZWFtYmxlLlxyXG5cdHRoaXMuX2J1ZmZlciA9IGFib3BzLmNvbmNhdCh0aGlzLl9idWZmZXIsIGRhdGFCdWZmZXIpO1xyXG5cdGlmICghdGhpcy5fcHJlYW1ibGVSZWNlaXZlZCkge1xyXG5cdFx0dmFyIGJ5dGVzUmVhZCA9IHRoaXMuX2RlY29kZVByZWFtYmxlKG5ldyBEYXRhVmlldyh0aGlzLl9idWZmZXIpKTtcclxuXHRcdC8vIElmIGJ5dGVzIHdlcmUgcmVhZCB3ZSByZWNlaXZlZCBhIGNvbXBsZXRlIHByZWFtYmxlLlxyXG5cdFx0aWYgKGJ5dGVzUmVhZCAhPT0gMCkge1xyXG5cdFx0XHR0aGlzLl9wcmVhbWJsZVJlY2VpdmVkID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5fY3VycmVudEJ1ZmZlck9mZnNldCA9IGJ5dGVzUmVhZDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIElmIHRoZSBsYXN0IGNodW5rIChOdWxsIENodW5rKSB3YXMgYWxyZWFkeSByZWNlaXZlZCB0aGVyZSBjYW5ub3QgYmUgbW9yZSBkYXRhXHJcblx0aWYgKHRoaXMuX2xhc3RDaHVua1JlY2VpdmVkKVxyXG5cdFx0cmV0dXJuIHRoaXMuZW1pdChcImVycm9yXCIsIG5ldyBCbGFzdEVycm9yKFwiTGFzdCBjaHVuayBhbHJlYWR5IHJlY2VpdmVkIVwiKSk7XHJcblxyXG5cdC8vIFdlIGNhbiBvbmx5IHN0YXJ0IGRlY29kaW5nIGEgY2h1bmsgaWYgdGhlIHByZWFtYmxlIHdhcyBhbHJlYWR5IHJlY2VpdmVkIGFuZCBpZiBhdCBsZWFzdCA0IEJ5dGVzIGNhbiBiZSByZWFkIHRvIGdldCB0aGUgY2h1bmtzIHNpemUuXHJcblx0aWYgKCF0aGlzLl9wcmVhbWJsZVJlY2VpdmVkIHx8IHRoaXMuX2N1cnJlbnRCdWZmZXJPZmZzZXQgKyA0ID4gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGgpXHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XHJcblxyXG5cdC8vIFdlIHRyeSB0byBkZWNvZGUgY2h1bmtzIHVudGlsIG5vdGhpbmcgY2FuIGJlIHJlYWQgb3IgdGhlIGJ1ZmZlciBpcyBlbXB0eS5cclxuXHR2YXIgYnl0ZXNSZWFkO1xyXG5cdGRvIHtcclxuXHRcdGJ5dGVzUmVhZCA9IHRoaXMuX2RlY29kZUNodW5rKG5ldyBEYXRhVmlldyh0aGlzLl9idWZmZXIsIHRoaXMuX2N1cnJlbnRCdWZmZXJPZmZzZXQpKTtcclxuXHRcdC8vIFRoaXMgaXMgc2F2ZS4gSWYgYnl0ZXNSZWFkIGlzIHplcm8gbm90aGluZyBoYXBwZW5zLlxyXG5cdFx0dGhpcy5fY3VycmVudEJ1ZmZlck9mZnNldCArPSBieXRlc1JlYWQ7XHJcblx0fSB3aGlsZSAoYnl0ZXNSZWFkID4gMCAmJiB0aGlzLl9jdXJyZW50QnVmZmVyT2Zmc2V0IDwgdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGggJiYgIXRoaXMuX2xhc3RDaHVua1JlY2VpdmVkKTtcclxuXHJcblx0Ly8gRGlzY2FyZCBjdXJyZW50IGJ1ZmZlciBpZiByZWFkIGNvbXBsZXRlbHkuXHJcblx0aWYgKHRoaXMuX2N1cnJlbnRCdWZmZXJPZmZzZXQgPT09IHRoaXMuX2J1ZmZlci5ieXRlTGVuZ3RoKSB7XHJcblx0XHR0aGlzLl9idWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoMCk7XHJcblx0XHR0aGlzLl9jdXJyZW50QnVmZmVyT2Zmc2V0ID0gMDtcclxuXHR9XHJcbiAgICBjYWxsYmFjaygpO1xyXG59O1xyXG5cclxuU3RyZWFtUmVjZWl2ZXIucHJvdG90eXBlLl9kZWNvZGVQcmVhbWJsZSA9IGZ1bmN0aW9uIChidWZmZXJWaWV3KSB7XHJcblx0Ly8gV2Uga25vdyB0aGF0IGV2ZXJ5IHByZWFtYmxlIGhhcyB0byBoYXZlIGF0IGxlYXN0XHJcblx0Ly8gNCBCeXRlIFNpZ25hdHVyZSArIDIgQnl0ZSBWZXJzaW9uIGluZm9ybWF0aW9uICsgNSBCeXRlIEhlYWRlciBkZWNvZGluZyBzcGVjaWZpY2F0aW9uIGFuZCBudWxsIGJ5dGUuXHJcblx0Ly8gV2UgY2FuIGFzc3VtZSA1IGJ5dGUgZm9yIHRoZSBoZWFkZXIgZGVjb2Rpbmcgc3BlY2lmaWNhdGlvbiBiZWNhdXNlIGEgVVJMIGhhcyB0byBoYXZlIGF0IGxlYXN0IDQgY2hhcmFjdGVycyB0byBiZSB2YWxpZCxcclxuXHQvLyBPbmUgY2hhcmFjdGVyIGRvbWFpbiBuYW1lIHBsdXMgYSBkb3QgYW5kIG1pbi4gdHdvIGNoYXJhY3RlcnMgdGxkLlxyXG5cdGlmIChidWZmZXJWaWV3LmJ5dGVMZW5ndGggPCAxMSlcclxuXHRcdHJldHVybiAwO1xyXG5cclxuXHR2YXIgc2lnbmF0dXJlID0gYnVmZmVyVmlldy5nZXRVaW50MzIoMCk7XHJcblx0Ly8gSWYgdGhlIHNpZ25hdHVyZSBieXRlIGRvZXMgbm90IG1hdGNoIHdlIGZsaXAgZW5kaWFubmVzcy5cclxuXHRpZiAoc2lnbmF0dXJlID09PSBQcmVhbWJsZS5zaWduYXR1cmUpXHJcblx0XHR0aGlzLl9saXR0bGVFbmRpYW4gPSBmYWxzZTtcclxuXHRlbHNlIGlmIChmbGlwRW5kaWFubmVzc0ludDMyKHNpZ25hdHVyZSkgPT09IFByZWFtYmxlLnNpZ25hdHVyZSlcclxuXHRcdHRoaXMuX2xpdHRsZUVuZGlhbiA9IHRydWU7XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIHRoaXMuZW1pdChcImVycm9yXCIsIG5ldyBCbGFzdEVycm9yKFwiQ291bGQgbm90IGlkZW50aWZ5IHByZWFtYmxlISBTaWduYXR1cmUgYnl0ZXMgZG8gbm90IG1hdGNoIVwiKSk7XHJcblxyXG5cdHRoaXMuX21ham9yVmVyc2lvbiA9IGJ1ZmZlclZpZXcuZ2V0VWludDgoNCk7XHJcblx0dGhpcy5fbWlub3JWZXJzaW9uID0gYnVmZmVyVmlldy5nZXRVaW50OCg1KTtcclxuXHR2YXIgb2Zmc2V0ID0gNjtcclxuICAgIHRoaXMuX2hlYWRlckRlY29kaW5nU3BlY2lmaWNhdGlvbiA9IGFib3BzLmdldENTdHJpbmcoYnVmZmVyVmlldywgb2Zmc2V0KTtcclxuICAgIC8vIE9uZSBieXRlIGZvciB0aGUgTlVMIGNoYXJcclxuICAgIG9mZnNldCArPSB0aGlzLl9oZWFkZXJEZWNvZGluZ1NwZWNpZmljYXRpb24ubGVuZ3RoICsgMTtcclxuXHJcblx0aWYgKG9mZnNldCA+IDYpXHJcblx0XHRyZXR1cm4gb2Zmc2V0O1xyXG5cclxuXHRyZXR1cm4gMDtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGZsaXBFbmRpYW5uZXNzSW50MzIobikge1xyXG5cdHJldHVybiAoKG4gPj4gMjQpICYgMHhmZikgfCAoKG4gPDwgOCkgJiAweGZmMDAwMCkgfCAoKG4gPj4gOCkgJiAweGZmMDApIHwgKChuIDw8IDI0KSAmIDB4ZmYwMDAwMDApO1xyXG59XHJcblxyXG5TdHJlYW1SZWNlaXZlci5wcm90b3R5cGUuX2RlY29kZUNodW5rID0gZnVuY3Rpb24gKGJ1ZmZlclZpZXcpIHtcclxuXHR2YXIgY2h1bmtTaXplID0gYnVmZmVyVmlldy5nZXRVaW50MzIoMCwgdGhpcy5fbGl0dGxlRW5kaWFuKTtcclxuXHJcblx0aWYgKGJ1ZmZlclZpZXcuYnl0ZUxlbmd0aCA8IGNodW5rU2l6ZSlcclxuXHRcdHJldHVybiAwO1xyXG5cclxuXHQvLyBMYXN0IGNodW5rIGhhcyBzaXplIDAuXHJcblx0aWYgKGNodW5rU2l6ZSA9PT0gMCkge1xyXG4gICAgICAgIHRoaXMuX2xhc3RDaHVua1JlY2VpdmVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gNDtcclxuICAgIH1cclxuXHJcblx0dmFyIGhlYWRlclNpemUgPSBidWZmZXJWaWV3LmdldFVpbnQzMig0LCB0aGlzLl9saXR0bGVFbmRpYW4pO1xyXG5cdHZhciBoZWFkZXJEZWZpbml0aW9ucyA9IHRoaXMuX2hlYWRlckRlY29kZXIuZGVjb2RlKGJ1ZmZlclZpZXcuYnVmZmVyLnNsaWNlKGJ1ZmZlclZpZXcuYnl0ZU9mZnNldCArIDgsIGJ1ZmZlclZpZXcuYnl0ZU9mZnNldCArIDggKyBoZWFkZXJTaXplKSk7XHJcblx0dmFyIHBheWxvYWRPZmZzZXQgPSA4ICsgaGVhZGVyU2l6ZTtcclxuXHJcbiAgICAvLyBBZGp1c3QgdGhlIG9mZnNldCBzdWNoIHRoYXQgd2UgY2FuIHNoYXJlIGEgc2luZ2xlIEFycmF5QnVmZmVyLlxyXG4gICAgaGVhZGVyRGVmaW5pdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xyXG4gICAgICAgIGRlZmluaXRpb24ub2Zmc2V0ICs9IGJ1ZmZlclZpZXcuYnl0ZU9mZnNldCArIHBheWxvYWRPZmZzZXQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnB1c2goe1xyXG4gICAgICAgIHBheWxvYWQ6IGJ1ZmZlclZpZXcuYnVmZmVyLFxyXG4gICAgICAgIGhlYWRlckRlZmluaXRpb25zOiBoZWFkZXJEZWZpbml0aW9ucyxcclxuICAgICAgICBsaXR0bGVFbmRpYW46IHRoaXMuX2xpdHRsZUVuZGlhblxyXG4gICAgfSk7XHJcblxyXG5cdHJldHVybiBjaHVua1NpemU7XHJcbn07XHJcblxyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gU3RyZWFtUmVjZWl2ZXI7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxucmVxdWlyZShcInNldGltbWVkaWF0ZVwiKTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChmbiwgYXN5bmMpIHtcclxuICAgIGlmIChhc3luYylcclxuICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xyXG4gICAgZWxzZVxyXG4gICAgICAgIGZuKCk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiXHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBEYXRhVmlldyNnZXRVaW50MTYgd2lsbCByZWFkIDEgb24gYmlnLWVuZGlhbiBzeXN0ZW1zLlxyXG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhuZXcgVWludDE2QXJyYXkoWzI1Nl0pLmJ1ZmZlcikuZ2V0VWludDE2KDAsIHRydWUpID09PSAyNTY7XHJcbn07XHJcblxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgdmFyIGFyaXR5ID0gZm4ubGVuZ3RoO1xyXG4gICAgLy8gVmFyaWFibGUgYXJndW1lbnQgbGlzdCBtZWFucyB3ZSBjb25zaWRlciB0aGlzIGZ1bmN0aW9uIHRvIGJlIGFzeW5jLlxyXG4gICAgaWYgKGFyaXR5ID09PSAwKVxyXG4gICAgICAgIHJldHVybiBmbjtcclxuICAgIC8vIEFuIGFyaXR5IG9mIHR3byBtZWFucyB3ZSBoYXZlIGEgc3luYy4gZnVuY3Rpb24sIHNvIHdlIHdyYXAgaXQuXHJcbiAgICBpZiAoYXJpdHkgPT09IDIpXHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhT3JCdWZmZXIsIGxpdHRsZUVuZGlhbiwgY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBmbihkYXRhT3JCdWZmZXIsIGxpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlLCBudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICBpZiAoYXJpdHkgPT09IDMpXHJcbiAgICAgICAgcmV0dXJuIGZuO1xyXG5cclxuICAgIG5ldyBFcnJvcihcIk1hbGZvcm1lZCBkZWNvZGluZyBmdW5jdGlvblwiKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XHJcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlRyYW5zZm9ybTtcclxuXHJcbnZhciBydW5FeHRlcm5hbERlY29kaW5nID0gcmVxdWlyZShcIi4vcnVuX2V4dGVybmFsX2RlY29kaW5nXCIpO1xyXG52YXIgd3JhcFN5bmNGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWwvd3JhcF9zeW5jX2Z1bmN0aW9uXCIpO1xyXG52YXIgY2FsbEltbWVkaWF0ZSA9IHJlcXVpcmUoXCIuL3V0aWwvY2FsbF9pbW1lZGlhdGVcIik7XHJcblxyXG5mdW5jdGlvbiBWYWx1ZURlY29kZXIob3B0aW9ucykge1xyXG4gICAgVHJhbnNmb3JtLmNhbGwodGhpcywge1xyXG4gICAgICAgIG9iamVjdE1vZGU6IHRydWVcclxuICAgIH0pO1xyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICB0aGlzLl9kZWNvZGluZ1NwZWNpZmljYXRpb25NYXAgPSBvcHRpb25zLmRlY29kaW5nU3BlY2lmaWNhdGlvbk1hcCB8fCB7fTtcclxuICAgIHRoaXMuX2FzeW5jID0gdHlwZW9mIG9wdGlvbnMuYXN5bmMgIT09IFwidW5kZWZpbmVkXCIgPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhWYWx1ZURlY29kZXIsIFRyYW5zZm9ybSk7XHJcblxyXG5WYWx1ZURlY29kZXIucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZW5jb2RlZERhdGEsIF8sIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBjYWxsSW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgZGVjb2RlRnVuY3Rpb24gPSBydW5FeHRlcm5hbERlY29kaW5nLmJpbmQodW5kZWZpbmVkLCBlbmNvZGVkRGF0YS5kZWNvZGluZ1NwZWNpZmljYXRpb24pO1xyXG5cclxuICAgICAgICB2YXIgY29kZWMgPSBzZWxmLl9kZWNvZGluZ1NwZWNpZmljYXRpb25NYXBbZW5jb2RlZERhdGEuZGVjb2RpbmdTcGVjaWZpY2F0aW9uXVxyXG4gICAgICAgIGlmIChjb2RlYylcclxuICAgICAgICAgICAgZGVjb2RlRnVuY3Rpb24gPSB3cmFwU3luY0Z1bmN0aW9uKGNvZGVjLmRlY29kZSA/IGNvZGVjLmRlY29kZSA6IGNvZGVjKTtcclxuICAgICAgICBkZWNvZGVGdW5jdGlvbihlbmNvZGVkRGF0YS5lbmNvZGVkVmFsdWUsIGVuY29kZWREYXRhLmxpdHRsZUVuZGlhbiwgZnVuY3Rpb24gKGVycm9yLCBkZWNvZGVkVmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdChcImVycm9yXCIsIGVycm9yKTtcclxuXHJcbiAgICAgICAgICAgIHNlbGYucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogZGVjb2RlZFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcGF0aDogZW5jb2RlZERhdGEucGF0aCxcclxuICAgICAgICAgICAgICAgIG1ldGFkYXRhOiBlbmNvZGVkRGF0YS5tZXRhZGF0YVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sIHRoaXMuX2FzeW5jKTtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFZhbHVlRGVjb2RlcjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vKipcclxuICogUmV0dXJucyBhIFVpbnQ4QXJyYXkgZm9yIHRoZSBnaXZlbiBBcnJheUJ1ZmZlci5cclxuICogSWYgYSBBcnJheUJ1ZmZlclZpZXcgb3IgYSBEYXRhVmlldyBpcyBnaXZlbiwgdGhlIHVuZGVybHlpbmcgYnVmZmVyIHdpbGwgYmUgdXNlZCBhbmQgdGhlIHNldFxyXG4gKiBvZmZzZXQgYW5kIGxlbmd0aCB3aWxsIGJlIHJlc3BlY3RlZC5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQGZ1bmN0aW9uIHRvVWludDhBcnJheVxyXG4gKiBAcGFyYW0ge0FycmF5QnVmZmVyVmlld3xBcnJheUJ1ZmZlcn0gYXJyYXlCdWZmZXIgVGhlIEFycmF5QnVmZmVyIG9yIGEgdmlldyBpbnRvIGFuIEFycmF5QnVmZmVyIGZvciB3aGljaCB0byBjcmVhdGUgYSBVaW50OEFycmF5IHZpZXcuXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBBIFVpbnQ4QXJyYXkgcmVmZXJlbmNpbmcgdGhlIGdpdmVuIEFycmF5QnVmZmVyLlxyXG4gKi9cclxuZnVuY3Rpb24gdG9VaW50OEFycmF5KGFycmF5QnVmZmVyLCBvZmZzZXQsIGxlbmd0aCkge1xyXG5cdG9mZnNldCA9ICtvZmZzZXQgfHwgMDtcclxuXHRsZW5ndGggPSArbGVuZ3RoO1xyXG5cdGlmICh0eXBlb2YgYXJyYXlCdWZmZXIuQllURVNfUEVSX0VMRU1FTlQgIT09IFwidW5kZWZpbmVkXCIgfHwgYXJyYXlCdWZmZXIgaW5zdGFuY2VvZiBEYXRhVmlldykge1xyXG5cdFx0cmV0dXJuIG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyLmJ1ZmZlciwgb2Zmc2V0ICsgYXJyYXlCdWZmZXIuYnl0ZU9mZnNldCwgbGVuZ3RoIHx8IGFycmF5QnVmZmVyLmJ5dGVMZW5ndGggLSBvZmZzZXQpO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBuZXcgVWludDhBcnJheShhcnJheUJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGggfHwgYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aCAtIG9mZnNldCk7XHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQ29uY2F0ZW5hdGVzIGEgdmFyaWFibGUgbGlzdCBvZiBBcnJheUJ1ZmZlcnMuXHJcbiAqIElmIG9uZSBvZiB0aGUgYXJndW1lbnRzIGlzIGEgRGF0YVZpZXcgb3IgYW4gYEFycmF5QnVmZmVyVmlld2AgdGhlIHVuZGVybHlpbmcgYnVmZmVyIHdpbGwgYmUgdXNlZCBhbmRcclxuICogdGhlIHNldCBvZmZzZXQgYW5kIGxlbmd0aCB3aWxsIGJlIHJlc3BlY3RlZC5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gY29uY2F0XHJcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXIuLi58QXJyYXlCdWZmZXJWaWV3Li4ufSBidWZmZXJzIEEgdmFyaWFibGUgbGlzdCBvZiBwbGFpbiBBcnJheUJ1ZmZlcnMgb3IgQXJyYXlCdWZmZXJWaWV3cy5cclxuICogQHJldHVybnMge0FycmF5QnVmZmVyfSBBIG5ldyBBcnJheUJ1ZmZlciBhcyB0aGUgcmVzdWx0IG9mIGNvbmNhdGVuYXRpbmcgdGhlIGdpdmVuIGJ1ZmZlcnMuXHJcbiAqL1xyXG5leHBvcnRzLmNvbmNhdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSlcclxuXHRcdHJldHVybiB0b1VpbnQ4QXJyYXkoYXJndW1lbnRzWzBdKS5idWZmZXI7XHJcblx0ZWxzZVxyXG5cdFx0dmFyIGFycmF5QnVmZmVyTGlzdCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcblxyXG4gICAgLy8gR2V0IGEgbGlzdCBvZiBhbGwgYnVmZmVycyBhbmQgdGhlaXIgdG90YWwgc2l6ZVxyXG4gICAgdmFyIHRvdGFsU2l6ZSA9IDA7XHJcbiAgICB2YXIgYnl0ZUJ1ZmZlcnMgPSBhcnJheUJ1ZmZlckxpc3QubWFwKGZ1bmN0aW9uIChhcnJheUJ1ZmZlcikge1xyXG4gICAgICAgIC8vIElmIGEgYERhdGFWaWV3YCBvciBhIHR5cGVkIGFycmF5IHdhcyBwYXNzZWQgaW5zdGVhZCBvZiBhIHBsYWluIGBBcnJheUJ1ZmZlcmBcclxuICAgICAgICAvLyB0aGUgdW5kZXJseWluZyBidWZmZXIgd2lsbCBiZSB1c2VkIGluc3RlYWQuXHJcbiAgICAgICAgdmFyIGJ5dGVCdWZmZXIgPSB0b1VpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpO1xyXG4gICAgICAgIHRvdGFsU2l6ZSArPSBieXRlQnVmZmVyLmxlbmd0aDtcclxuICAgICAgICByZXR1cm4gYnl0ZUJ1ZmZlcjtcclxuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoYnl0ZUJ1ZmZlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gYnl0ZUJ1ZmZlci5sZW5ndGggPiAwO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGlmIChieXRlQnVmZmVycy5sZW5ndGggPT09IDApXHJcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheUJ1ZmZlcigwKTtcclxuXHJcbiAgICBpZiAoYnl0ZUJ1ZmZlcnMubGVuZ3RoID09PSAxKVxyXG4gICAgICAgIHJldHVybiBieXRlQnVmZmVyc1swXS5idWZmZXI7XHJcblxyXG5cdC8vIFRoaXMgd2lsbCBjb250YWluIHRoZSBmaW5hbCBjb25jYXRlbmF0ZWQgYnVmZmVyLlxyXG4gICAgdmFyIGNvbmNhdEJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KHRvdGFsU2l6ZSk7XHJcblxyXG4gICAgdmFyIG9mZnNldCA9IDA7XHJcbiAgICBieXRlQnVmZmVycy5mb3JFYWNoKGZ1bmN0aW9uIChieXRlQnVmZmVyKSB7XHJcbiAgICAgICAgY29uY2F0QnVmZmVyLnNldChieXRlQnVmZmVyLCBvZmZzZXQpO1xyXG4gICAgICAgIG9mZnNldCArPSBieXRlQnVmZmVyLmxlbmd0aDtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjb25jYXRCdWZmZXIuYnVmZmVyO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZsaXBzIHRoZSBlbmRpYW5uZXNzIG9mIHRoZSBnaXZlbiBUeXBlZEFycmF5IGluLXBsYWNlLlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqIEBmdW5jdGlvbiBmbGlwRW5kaWFubmVzc1xyXG4gKiBAcGFyYW0ge1R5cGVkIEFycmF5fSB0eXBlZEFycmF5IFRoZSB0eXBlZCBhcnJheSBmb3Igd2hpY2ggdGhlIGVuZGlhbm5lc3Mgc2hvdWxkIGJlIGZsaXBwZWQuXHJcbiAqL1xyXG5leHBvcnRzLmZsaXBFbmRpYW5uZXNzID0gZnVuY3Rpb24gKHR5cGVkQXJyYXkpIHtcclxuXHQvLyBVaW50OENsYW1wZWRBcnJheSBpcyBhIHJhdGhlciBuZXcgcGFydCBvZiB0aGUgdHlwZWQgYXJyYXkgc3BlY2lmaWNhdGlvbiBhbmQgbm90IGZ1bGx5IHN1cHBvcnRlZCBieVxyXG5cdC8vIGFsbCBicm93c2Vycy5cclxuXHR2YXIgVWludDhDbGFtcGVkQXJyYXlUeXBlO1xyXG5cdGlmICh0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgPT09IFwidW5kZWZpbmVkXCIpXHJcblx0XHRVaW50OENsYW1wZWRBcnJheVR5cGUgPSBmdW5jdGlvbiBkdW1teSgpIHt9O1xyXG5cdGVsc2VcclxuXHRcdFVpbnQ4Q2xhbXBlZEFycmF5VHlwZSA9IFVpbnQ4Q2xhbXBlZEFycmF5O1xyXG5cclxuXHRpZiAodHlwZWRBcnJheSBpbnN0YW5jZW9mIEludDhBcnJheSB8fCB0eXBlZEFycmF5IGluc3RhbmNlb2YgVWludDhBcnJheSB8fCB0eXBlZEFycmF5IGluc3RhbmNlb2YgVWludDhDbGFtcGVkQXJyYXlUeXBlKVxyXG4gICAgICAgIHJldHVybiB0eXBlZEFycmF5O1xyXG5cclxuICAgIHZhciBieXRlQXJyYXkgPSBuZXcgVWludDhBcnJheSh0eXBlZEFycmF5LmJ1ZmZlciwgdHlwZWRBcnJheS5vZmZzZXQsIHR5cGVkQXJyYXkuYnl0ZUxlbmd0aCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGVkQXJyYXkuYnl0ZUxlbmd0aDsgaSArPSB0eXBlZEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UKSB7XHJcbiAgICAgICAgdmFyIGxlZnRJZHggPSBpO1xyXG4gICAgICAgIHZhciByaWdodElkeCA9IGkgKyB0eXBlZEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UIC0gMTtcclxuXHQgICAgLy8gV2FsayBmcm9tIGxlZnQgYW5kIHJpZ2h0IGFuZCBzd2FwIGJ5dGVzLlxyXG4gICAgICAgIHdoaWxlIChsZWZ0SWR4IDwgcmlnaHRJZHgpIHtcclxuICAgICAgICAgICAgdmFyIHRtcCA9IGJ5dGVBcnJheVtsZWZ0SWR4XTtcclxuICAgICAgICAgICAgYnl0ZUFycmF5W2xlZnRJZHhdID0gYnl0ZUFycmF5W3JpZ2h0SWR4XTtcclxuICAgICAgICAgICAgYnl0ZUFycmF5W3JpZ2h0SWR4XSA9IHRtcDtcclxuICAgICAgICAgICAgKytsZWZ0SWR4O1xyXG4gICAgICAgICAgICAtLXJpZ2h0SWR4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHlwZWRBcnJheTtcclxufTtcclxuXHJcbi8vICMgU3RyaW5nIGhhbmRsaW5nXHJcblxyXG4vLyBKYXZhU2NyaXB0IHN0cmluZyBhcmUgVVRGLTE2IGVuY29kZWQuXHJcbi8vIFRvIGhhbmRsZSBjb252ZXJzaW9uIGludG8gZGlmZmVyZW50IHVuaWNvZGUgZW5jb2RpbmdzLCBtYWlubHkgVVRGLTgsIHdlIGNvbnZlcnQgSmF2YVNjcmlwdCBzdHJpbmdcclxuLy8gaW50byBhbiBhcnJheSBvZiB1bmljb2RlIGNvZGUgcG9pbnRzIHRoYXQgY2FuIGVhc2lseSBjb252ZXJ0ZWQgaW50byBkaWZmZXJlbnQgZW5jb2RpbmdzLlxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoZSBnaXZlbiBKYXZhU2NyaXB0IHN0cmluZyBpbnRvIGFuIGFycmF5IG9mIHVuaWNvZGUgY29kZSBwb2ludHMuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBmdW5jdGlvbiBzdHJpbmdUb1VuaWNvZGVDb2RlUG9pbnRzXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBjb252ZXJ0LlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyW119IFRoZSBhcnJheSBvZiB1bmljb2RlIGNvZGUgcG9pbnRzIG9mIHRoZSBnaXZlbiBzdHJpbmcuXHJcbiAqL1xyXG5mdW5jdGlvbiBzdHJpbmdUb1VuaWNvZGVDb2RlUG9pbnRzKHN0cmluZykge1xyXG5cdHZhciBvdXRwdXQgPSBbXTtcclxuXHR2YXJcdGNvdW50ZXIgPSAwO1xyXG5cdHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xyXG5cdHZhciB2YWx1ZTtcclxuXHR2YXIgZXh0cmE7XHJcblxyXG5cdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XHJcblx0XHQvLyBKYXZhU2NyaXB0cyBTdHJpbmcjY2hhckNvZGVBdCBmdW5jdGlvbiByZXR1cm5zIHZhbHVlcyBsZXNzIHRoYW4gNjU1MzYuXHJcblx0XHQvLyBIaWdoZXIgY29kZSBwb2ludHMgYXJlIHJlcHJlc2VudGVkIHVzaW5nIHNvIGNhbGxlZCBzdXJyb2dhdGUgcGFpcnMuXHJcblx0XHQvLyBUaGlzIG1lYW5zIHRoYXQgd2UgaGF2ZSB0byBleGFtaW5lIHRoZSBuZXh0IGNoYXJhY3RlciB0byBnZXQgdGhlIHJlYWwgdW5pY29kZSBjb2RlIHBvaW50IHZhbHVlLlxyXG5cdFx0dmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xyXG5cdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xyXG5cdFx0XHQvLyBIaWdoIHN1cnJvZ2F0ZSA9PiB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXHJcblx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcclxuXHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7XHJcblx0XHRcdFx0Ly8gTG93IHN1cnJvZ2F0ZVxyXG5cdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gVW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlIG5leHRcclxuXHRcdFx0XHQvLyBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXJcclxuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XHJcblx0XHRcdFx0Y291bnRlci0tO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiBvdXRwdXQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyBhbiBhcnJheSBvZiB1bmljb2RlIGNvZGVwb2ludHMgaW50byBhIEphdmFTY3JpcHQgc3RyaW5nLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZnVuY3Rpb24gdW5pY29kZUNvZGVQb2ludHNUb1N0cmluZ1xyXG4gKiBAcGFyYW0ge251bWJlcltdfSBjb2RlUG9pbnRzIEFuIGFycmF5IG9mIHVuaWNvZGUgY29kZSBwb2ludHMuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBzdHJpbmcgcmVwcmVzZW50ZWQgYnkgdGhlIGdpdmVuIGNvZGUgcG9pbnRzLlxyXG4gKi9cclxuZnVuY3Rpb24gdW5pY29kZUNvZGVQb2ludHNUb1N0cmluZyhjb2RlUG9pbnRzKSB7XHJcblx0cmV0dXJuIGNvZGVQb2ludHMubWFwKGZ1bmN0aW9uKGNvZGVQb2ludCkge1xyXG5cdFx0dmFyIG91dHB1dCA9ICcnO1xyXG5cdFx0aWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xyXG5cdFx0XHRjb2RlUG9pbnQgLT0gMHgxMDAwMDtcclxuXHRcdFx0b3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcclxuXHRcdFx0Y29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkY7XHJcblx0XHR9XHJcblx0XHRvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQpO1xyXG5cdFx0cmV0dXJuIG91dHB1dDtcclxuXHR9KS5qb2luKCcnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoZSBnaXZlbiBzdHJpbmcgaW50byBhIHNlcmllcyBvZiBvZiBVVEYtOCBjb2RlIHVuaXRzLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZnVuY3Rpb24gdXRmOGVuY29kZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gZW5jb2RlLlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyW119IEFuIGFycmF5IG9mIFVURi04IGNvZGUgdW5pdHMgZm9yIHRoZSBnaXZlbiBzdHJpbmcuXHJcbiAqL1xyXG5mdW5jdGlvbiB1dGY4ZW5jb2RlKHN0cmluZykge1xyXG5cdHZhciBjb2RlUG9pbnRzID0gc3RyaW5nVG9Vbmljb2RlQ29kZVBvaW50cyhzdHJpbmcpO1xyXG5cclxuXHQvLyBVVEYtOCBpcyBhIHZhcmlhYmxlIGxlbmd0aCBlbmNvZGluZyB0aGF0IGFjdHVhbGx5IHN1cHBvcnRzIHVwIHRvIHNpeCBieXRlcyBwZXIgY2hhcmFjdGVyLlxyXG5cdC8vIEhvd2V2ZXIsIHRoZXNlIGNoYXJhY3RlcnMgYXJlIGluIHRoZSBwcml2YXRlIHVuaWNvZGUgcmFuZ2UgYW5kIGNhbiB0aGVyZWZvcmUgbmV2ZXIgb2NjdXIgaW4gSmF2YVNjcmlwdC5cclxuICAgIHZhciB1dGY4Q29kZVVuaXRzID0gW107XHJcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBjb2RlUG9pbnRzLmxlbmd0aDsgKytpZHgpIHtcclxuICAgICAgICB2YXIgY29kZVBvaW50ID0gY29kZVBvaW50c1tpZHhdO1xyXG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweDAwODApXHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaChjb2RlUG9pbnQgJiAweEZGKTtcclxuICAgICAgICBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDA4MDApIHtcclxuICAgICAgICAgICAgdXRmOENvZGVVbml0cy5wdXNoKDB4QzAgKyAoY29kZVBvaW50ID4+PiA2KSk7XHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaCgweDgwICsgKGNvZGVQb2ludCAmIDB4M0YpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xyXG4gICAgICAgICAgICB1dGY4Q29kZVVuaXRzLnB1c2goMHhlMCArIChjb2RlUG9pbnQgPj4+IDEyKSk7XHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaCgweDgwICsgKChjb2RlUG9pbnQgPj4+IDYpICYgMHgzZikpO1xyXG4gICAgICAgICAgICB1dGY4Q29kZVVuaXRzLnB1c2goMHg4MCArIChjb2RlUG9pbnQgJiAweDNmKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB1dGY4Q29kZVVuaXRzLnB1c2goMHhmMCArIChjb2RlUG9pbnQgPj4+IDE4KSk7XHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaCgweDgwICsgKChjb2RlUG9pbnQgPj4+IDEyKSAmIDB4M2YpKTtcclxuICAgICAgICAgICAgdXRmOENvZGVVbml0cy5wdXNoKDB4ODAgKyAoKGNvZGVQb2ludCA+Pj4gNikgJiAweDNmKSk7XHJcbiAgICAgICAgICAgIHV0ZjhDb2RlVW5pdHMucHVzaCgweDgwICsgKGNvZGVQb2ludCAmIDB4M2YpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdXRmOENvZGVVbml0cztcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY29kZXMgYSBnaXZlbiBzZXJpZXMgb2YgVVRGLTggY29kZSB1bml0cyBpbnRvIGEgc3RyaW5nLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZnVuY3Rpb24gdXRmOGRlY29kZVxyXG4gKiBAcGFyYW0ge251bWJlcltdfSB1dGY4Q29kZVVuaXRzIFRoZSBVVEYtOCBjb2RlIHVuaXRzLlxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZGVjb2RlZCBzdHJpbmcuXHJcbiAqL1xyXG5mdW5jdGlvbiB1dGY4ZGVjb2RlKHV0ZjhDb2RlVW5pdHMpIHtcclxuXHR2YXIgY29kZVBvaW50cyA9ICBbXTtcclxuXHR2YXIgaWR4ID0gMDtcclxuXHR3aGlsZSAoaWR4IDwgdXRmOENvZGVVbml0cy5sZW5ndGgpIHtcclxuXHRcdHZhciBjb2RlVW5pdCA9IHV0ZjhDb2RlVW5pdHNbaWR4XTtcclxuXHRcdC8vIFdlIGlnbm9yZSBmaXZlIGFuZCBzaXggYnl0ZSBjaGFyYWN0ZXJzIVxyXG5cdFx0aWYgKGNvZGVVbml0ID4gMHhlZiAmJiBjb2RlVW5pdCA8IDB4ZjgpIHtcclxuXHRcdFx0Y29kZVBvaW50cy5wdXNoKCh1dGY4Q29kZVVuaXRzW2lkeF0gLSAweGYwIDw8IDE4KSArICh1dGY4Q29kZVVuaXRzW2lkeCArIDFdIC0gMHg4MCA8PCAxMikgKyAodXRmOENvZGVVbml0c1tpZHggKyAyXSAtIDB4ODAgPDwgNikgKyAodXRmOENvZGVVbml0c1tpZHggKyAzXSAtIDB4ODApKTtcclxuXHRcdFx0aWR4ICs9IDQ7XHJcblx0XHR9IGVsc2UgaWYgKGNvZGVVbml0ID4gMHhkZiAmJiBjb2RlVW5pdCA8IDB4ZjApIHtcclxuXHRcdFx0Y29kZVBvaW50cy5wdXNoKCh1dGY4Q29kZVVuaXRzW2lkeF0gLSAweGUwIDw8IDEyKSArICh1dGY4Q29kZVVuaXRzW2lkeCArIDFdIC0gMHg4MCA8PCA2KSArICh1dGY4Q29kZVVuaXRzW2lkeCArIDJdIC0gMHg4MCkpO1xyXG5cdFx0XHRpZHggKz0gMztcclxuXHRcdH0gZWxzZSBpZiAoY29kZVVuaXQgPiAweGJmICYmIGNvZGVVbml0IDwgMHhlMCkge1xyXG5cdFx0XHRjb2RlUG9pbnRzLnB1c2goKHV0ZjhDb2RlVW5pdHNbaWR4XSAtIDB4YzAgPDwgNikgKyAodXRmOENvZGVVbml0c1tpZHggKyAxXSAtIDB4ODApKTtcclxuXHRcdFx0aWR4ICs9IDI7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb2RlUG9pbnRzLnB1c2godXRmOENvZGVVbml0c1tpZHhdKTtcclxuXHRcdFx0aWR4ICs9IDE7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdW5pY29kZUNvZGVQb2ludHNUb1N0cmluZyhjb2RlUG9pbnRzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIHNpemUgaW4gYnl0ZXMgbmVlZGVkIHRvIHdyaXRlIHRoZSBnaXZlbiBzdHJpbmcgd2l0aCB0aGUgZ2l2ZW4gZW5jb2RpbmcgaW50byBhIGJ1ZmZlci5cclxuICogQ3VycmVudGx5IG9ubHkgQVNDSUkgYW5kIFVURi04IGVuY29kaW5nIGlzIHN1cHBvcnRlZC5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gYnl0ZVNpemVGb3JTdHJpbmdcclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIGZvciB3aGljaCB0byBjYWxjdWxhdGUgdGhlIHNpemUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZW5jb2RpbmcgPSBcIlVURi04XCJdIFRoZSBlbmNvZGluZyB0byB1c2UuXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFRoZSBzaXplIGluIGJ5dGVzIG5lZWRlZCB0byBzdG9yZSB0aGUgZ2l2ZW4gc3RyaW5nIGluIHRoZSBnaXZlbiBlbmNvZGluZy5cclxuICovXHJcbmV4cG9ydHMuYnl0ZVNpemVGb3JTdHJpbmcgPSBmdW5jdGlvbiAoc3RyaW5nLCBlbmNvZGluZykge1xyXG5cdHZhciBjb2RlUG9pbnRzID0gc3RyaW5nVG9Vbmljb2RlQ29kZVBvaW50cyhzdHJpbmcpO1xyXG5cdGVuY29kaW5nID0gZW5jb2RpbmcgPyBlbmNvZGluZy50b0xvd2VyQ2FzZSgpIDogXCJ1dGYtOFwiO1xyXG5cclxuXHRzd2l0Y2ggKGVuY29kaW5nKSB7XHJcblx0XHRjYXNlIFwiYXNjaWlcIjpcclxuXHRcdFx0cmV0dXJuIGNvZGVQb2ludHMubGVuZ3RoO1xyXG5cdFx0Y2FzZSBcInV0ZjhcIjpcclxuXHRcdGNhc2UgXCJ1dGYtOFwiOlxyXG5cdFx0XHRyZXR1cm4gY29kZVBvaW50cy5yZWR1Y2UoZnVuY3Rpb24gKGJ5dGVTaXplLCBjb2RlUG9pbnQpIHtcclxuXHRcdFx0XHRyZXR1cm4gYnl0ZVNpemUgKyAoY29kZVBvaW50IDwgMHgwMDgwID8gMSA6IChjb2RlUG9pbnQgPCAweDA4MDAgPyAyIDogKGNvZGVQb2ludCA8IDB4MTAwMDAgPyAzIDogNCkpKTtcclxuXHRcdFx0fSwgMCk7XHJcblx0fVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyB0aGUgZ2l2ZW4gc3RyaW5nIHVzaW5nIHRoZSBnaXZlbiBlbmNvZGluZyBhdCB0aGUgc3BlY2lmaWVkIG9mZnNldCBpbnRvIHRoZSBidWZmZXIuXHJcbiAqIElmIGxpdHRsZUVuZGlhbiBpcyB0cnVlLCBtdWx0aS1ieXRlIHZhbHVlcyB3aWxsIGJlIHdyaXR0ZW4gaW4gbGl0dGxlRW5kaWFuIGZvcm1hdC5cclxuICogQ3VycmVudGx5IG9ubHkgQVNDSUkgYW5kIFVURi04IGVuY29kaW5nIGlzIHN1cHBvcnRlZCB3aGljaCBtYWtlcyBlbmRpYW5uZXNzIGEgbm9uIGlzc3VlLlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqIEBmdW5jdGlvbiBzZXRTdHJpbmdcclxuICogQHBhcmFtIHtBcnJheUJ1ZmZlcnxUeXBlZEFycmF5fERhdGFWaWV3fSBhcnJheUJ1ZmZlciBUaGUgYnVmZmVyIHdoZXJlIHRoZSBzdHJpbmcgc2hvdWxkIGJlIHdyaXR0ZW4gaW50by5cclxuICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCBUaGUgb2Zmc2V0IGluIGJ5dGVzIGF0IHdoaWNoIHRoZSBzdHJpbmcgc2hvdWxkIGJlZ2luIGluc2lkZSB0aGUgYnVmZmVyLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gd3JpdGUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZW5jb2RpbmcgPSBcIlVURi04XCJdIFRoZSBlbmNvZGluZyB0byB1c2UuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2xpdHRsZUVuZGlhbiA9IGZhbHNlXSBJZiB0cnVlIGZvciBtdWx0aSBieXRlIGNoYXJhY3RlcnMgd2lsbCBiZSB3cml0dGVuIGluIGxpdHRsZSBlbmRpYW4gZm9ybWF0LlxyXG4gKi9cclxuZXhwb3J0cy5zZXRTdHJpbmcgPSBmdW5jdGlvbiAoYXJyYXlCdWZmZXIsIG9mZnNldCwgc3RyaW5nLCBlbmNvZGluZywgbGl0dGxlRW5kaWFuKSB7XHJcbiAgICB2YXIgYnl0ZXMgPSB0b1VpbnQ4QXJyYXkoYXJyYXlCdWZmZXIsIG9mZnNldCk7XHJcblx0ZW5jb2RpbmcgPSBlbmNvZGluZyA/IGVuY29kaW5nLnRvTG93ZXJDYXNlKCkgOiBcInV0Zi04XCI7XHJcblxyXG5cdHN3aXRjaCAoZW5jb2RpbmcpIHtcclxuXHRcdGNhc2UgXCJhc2NpaVwiOlxyXG5cdFx0XHRieXRlcy5zZXQoc3RyaW5nVG9Vbmljb2RlQ29kZVBvaW50cyhzdHJpbmcpLm1hcChmdW5jdGlvbiAoY29kZVBvaW50KSB7IHJldHVybiBjb2RlUG9pbnQgJSAxMjg7IH0pKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIFwidXRmOFwiOlxyXG5cdFx0Y2FzZSBcInV0Zi04XCI6XHJcblx0XHRcdGJ5dGVzLnNldCh1dGY4ZW5jb2RlKHN0cmluZykpO1xyXG5cdFx0XHRicmVhaztcclxuXHR9XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIHRoZSBnaXZlbiBzdHJpbmcgaW50byB0aGUgZ2l2ZW4gYnVmZmVyIGF0IHRoZSBjaG9zZW4gb2Zmc2V0LlxyXG4gKiBUaGUgc3RyaW5nIHdpbGwgYmUgd3JpdHRlbiB1c2luZyBBU0NJSSBlbmNvZGluZyBhbmQgc3VjY2VlZGVkIGJ5IGEgTlVMIGJ5dGUuXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIHNldENTdHJpbmdcclxuICogQHBhcmFtIHtBcnJheUJ1ZmZlclZpZXd8QXJyYXlCdWZmZXJ9IGFycmF5QnVmZmVyIFRoZSBidWZmZXIgdG8gd3JpdGUgdG8uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgVGhlIG9mZnNldCBpbiBieXRlcyBmb3IgdGhlIHN0cmluZyB0byBiZWdpbiBpbnNpZGUgdGhlIGJ1ZmZlci5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIHdyaXRlLlxyXG4gKi9cclxuZXhwb3J0cy5zZXRDU3RyaW5nID0gZnVuY3Rpb24oYXJyYXlCdWZmZXIsIG9mZnNldCwgc3RyaW5nKSB7XHJcbiAgICB2YXIgbGFzdENoYXJhY3RlcklkeCA9IG9mZnNldCArIHRoaXMuYnl0ZVNpemVGb3JTdHJpbmcoc3RyaW5nLCBcImFzY2lpXCIpO1xyXG4gICAgdGhpcy5zZXRTdHJpbmcoYXJyYXlCdWZmZXIsIG9mZnNldCwgc3RyaW5nLCBcImFzY2lpXCIpO1xyXG4gICAgdmFyIGJ5dGVzID0gdG9VaW50OEFycmF5KGFycmF5QnVmZmVyLCBvZmZzZXQpO1xyXG5cdGJ5dGVzW2xhc3RDaGFyYWN0ZXJJZHhdID0gMDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyB0aGUgZ2l2ZW4gc3RyaW5nIGZyb20gdGhlIGdpdmVuIGJ1ZmZlciBzdGFydGluZyBhdCBvZmZzZXQsIHJlYWRpbmcgbGVuZ3RoIGJ5dGVzLCB1c2luZyB0aGUgc3BlY2lmaWVkIGVuY29kaW5nLlxyXG4gKiBJZiBsaXR0bGVFbmRpYW4gaXMgdHJ1ZSwgbXVsdGktYnl0ZSB2YWx1ZXMgYXJlIGV4cGVjdGVkIHRvIGJldyBpbiBsaXR0bGVFbmRpYW4gZm9ybWF0LlxyXG4gKiBDdXJyZW50bHkgb25seSBBU0NJSSBhbmQgVVRGLTggZW5jb2RpbmcgaXMgc3VwcG9ydGVkIHdoaWNoIG1ha2VzIGVuZGlhbm5lc3MgYSBub24gaXNzdWUuXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIGdldFN0cmluZ1xyXG4gKiBAcGFyYW0ge0FycmF5QnVmZmVyVmlld3xBcnJheUJ1ZmZlcn0gYXJyYXlCdWZmZXIgVGhlIGJ1ZmZlciB0byByZWFkIGZyb20uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgVGhlIG9mZnNldCBpbiBieXRlcyBhdCB3aGljaCB0byBzdGFydCByZWFkaW5nLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuZ3RoIFRoZSBudW1iZXIgb2YgYnl0ZXMgdG8gcmVhZC5cclxuICogQHBhcmFtIHtzdHJpbmd9IGVuY29kaW5nIFRoZSBlbmNvZGluZyBvZiB0aGUgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtsaXR0bGVFbmRpYW4gPSBmYWxzZV0gSWYgdHJ1ZSBtdWx0aS1ieXRlIGNoYXJhY3RlcnMgYXJlIGV4cGVjdGVkIHRvIGJlIGluIGxpdHRsZSBlbmRpYW4gZm9ybWF0LlxyXG4gKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBzdHJpbmcgcmVhZCBmcm9tIHRoZSBidWZmZXIuXHJcbiAqL1xyXG5leHBvcnRzLmdldFN0cmluZyA9IGZ1bmN0aW9uIChhcnJheUJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nLCBsaXR0bGVFbmRpYW4pIHtcclxuXHQvLyBDaGVjayBpZiBsZW5ndGggaXMgb21pdHRlZCBhbmQgZW5jb2RpbmcgaXMgc2V0LlxyXG5cdGlmICh0eXBlb2YgbGVuZ3RoID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRlbmNvZGluZyA9IGxlbmd0aDtcclxuXHRcdGxlbmd0aCA9IHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGVuY29kaW5nID0gZW5jb2RpbmcgPyBlbmNvZGluZy50b0xvd2VyQ2FzZSgpIDogXCJ1dGYtOFwiO1xyXG5cclxuXHR2YXIgYnl0ZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0b1VpbnQ4QXJyYXkoYXJyYXlCdWZmZXIsIG9mZnNldCwgbGVuZ3RoKSk7XHJcblxyXG5cdHN3aXRjaCAoZW5jb2RpbmcpIHtcclxuXHRcdGNhc2UgXCJhc2NpaVwiOlxyXG5cdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBieXRlcy5tYXAoZnVuY3Rpb24gKGJ5dGUpIHsgcmV0dXJuIGJ5dGUgJSAxMjg7IH0pKTtcclxuXHRcdGNhc2UgXCJ1dGY4XCI6XHJcblx0XHRjYXNlIFwidXRmLThcIjpcclxuXHRcdFx0cmV0dXJuIHV0ZjhkZWNvZGUoYnl0ZXMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIE5VTCB0ZXJtaW5hdGVkIEFTQ0lJIGVuY29kZWQgc3RyaW5nIGZyb20gdGhlIGdpdmVuIGJ1ZmZlciBzdGFydGluZyBhdCB0aGUgZ2l2ZW4gb2Zmc2V0LlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqIEBmdW5jdGlvbiBnZXRDU3RyaW5nXHJcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXJWaWV3fEFycmF5QnVmZmVyfSBhcnJheUJ1ZmZlciBUaGUgYnVmZmVyIHRvIHJlYWQgZnJvbS5cclxuICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCBUaGUgb2Zmc2V0IGluIGJ5dGVzIHRvIHN0YXJ0IHJlYWRpbmcuXHJcbiAqIEByZXR1cm4ge3N0cmluZ30gc3RyaW5nIFRoZSByZWFkIHN0cmluZy5cclxuICovXHJcbmV4cG9ydHMuZ2V0Q1N0cmluZyA9IGZ1bmN0aW9uIChhcnJheUJ1ZmZlciwgb2Zmc2V0KSB7XHJcblx0dmFyIGJ5dGVzID0gdG9VaW50OEFycmF5KGFycmF5QnVmZmVyLCBvZmZzZXQpO1xyXG5cclxuICAgIHZhciBhc2NpaUNvZGVVbml0cyA9IFtdO1xyXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgYnl0ZXMuYnl0ZUxlbmd0aDsgKytpZHgpIHtcclxuICAgICAgICB2YXIgYyA9IGJ5dGVzW2lkeF07XHJcbiAgICAgICAgaWYgKGMgPT09IDB4MDApXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cdCAgICBhc2NpaUNvZGVVbml0cy5wdXNoKGMpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgYXNjaWlDb2RlVW5pdHMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYW4gQXJyYXlCdWZmZXIgZmlsbGVkIHdpdGggdGhlIGdpdmVuIHN0cmluZy5cclxuICogVGhlIHN0cmluZyB3aWxsIGJlIEFTQ0lJIGVuY29kZWQgYW5kIHN1Y2NlZWRlZCBieSBhIE5VTCBjaGFyYWN0ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyBmb3Igd2hpY2ggYSBidWZmZXIgc2hvdWxkIGJlIGNyZWF0ZWQuXHJcbiAqIEByZXR1cm4ge0FycmF5QnVmZmVyfSBBbiBBcnJheUJ1ZmZlciBjb250YWluaW5nIHRoZSBnaXZlbiBzdHJpbmcuXHJcbiAqL1xyXG5leHBvcnRzLmJ1ZmZlckZvckNTdHJpbmcgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XHJcblx0Ly8gQWRkIG9uZSBieXRlIGZvciB0aGUgTlVMIGNoYXJhY3RlclxyXG5cdHZhciBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIodGhpcy5ieXRlU2l6ZUZvclN0cmluZyhzdHJpbmcsIFwiYXNjaWlcIikgKyAxKTtcclxuXHR0aGlzLnNldENTdHJpbmcoYnVmZmVyLCAwLCBzdHJpbmcpO1xyXG5cdHJldHVybiBidWZmZXI7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhbiBBcnJheUJ1ZmZlciBmaWxsZWQgd2l0aCB0aGUgZ2l2ZW4gc3RyaW5nIHVzaW5nIHRoZSBnaXZlbiBlbmNvZGluZy5cclxuICogSWYgbGl0dGxlRW5kaWFuIGlzIHRydWUsIG11bHRpLWJ5dGUgdmFsdWVzIHdpbGwgYmUgd3JpdHRlbiBpbiBsaXR0bGVFbmRpYW4gZm9ybWF0LlxyXG4gKiBDdXJyZW50bHkgb25seSBBU0NJSSBhbmQgVVRGLTggZW5jb2RpbmcgaXMgc3VwcG9ydGVkIHdoaWNoIG1ha2VzIGVuZGlhbm5lc3MgYSBub24gaXNzdWUuXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIGJ1ZmZlckZvclN0cmluZ1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gZm9yIHdoaWNoIGEgYnVmZmVyIHNob3VsZCBiZSBjcmVhdGVkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZW5jb2RpbmcgVGhlIGVuY29kaW5nIHRvIHVzZS5cclxuICogQHBhcmFtIHtib29sfSBbbGl0dGxlRW5kaWFuID0gZmFsc2VdIElmIHRydWUgbXVsdGktYnl0ZSBjaGFyYWN0ZXJzIHdpbGwgYmUgd3JpdHRlbiBpbiBsaXR0bGUtZW5kaWFuIGZvcm1hdC5cclxuICogQHJldHVybnMge0FycmF5QnVmZmVyfSBBbiBBcnJheUJ1ZmZlciBjb250YWluaW5nIHRoZSBnaXZlbiBzdHJpbmcuXHJcbiAqL1xyXG5leHBvcnRzLmJ1ZmZlckZvclN0cmluZyA9IGZ1bmN0aW9uIChzdHJpbmcsIGVuY29kaW5nLCBsaXR0bGVFbmRpYW4pIHtcclxuXHR2YXIgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKHRoaXMuYnl0ZVNpemVGb3JTdHJpbmcoc3RyaW5nLCBlbmNvZGluZykpO1xyXG4gICAgdGhpcy5zZXRTdHJpbmcoYnVmZmVyLCAwLCBzdHJpbmcsIGVuY29kaW5nLCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgcmV0dXJuIGJ1ZmZlcjtcclxufTtcclxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qZ2xvYmFsIHNldEltbWVkaWF0ZTogZmFsc2UsIHNldFRpbWVvdXQ6IGZhbHNlLCBjb25zb2xlOiBmYWxzZSAqL1xuKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBhc3luYyA9IHt9O1xuXG4gICAgLy8gZ2xvYmFsIG9uIHRoZSBzZXJ2ZXIsIHdpbmRvdyBpbiB0aGUgYnJvd3NlclxuICAgIHZhciByb290LCBwcmV2aW91c19hc3luYztcblxuICAgIHJvb3QgPSB0aGlzO1xuICAgIGlmIChyb290ICE9IG51bGwpIHtcbiAgICAgIHByZXZpb3VzX2FzeW5jID0gcm9vdC5hc3luYztcbiAgICB9XG5cbiAgICBhc3luYy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb290LmFzeW5jID0gcHJldmlvdXNfYXN5bmM7XG4gICAgICAgIHJldHVybiBhc3luYztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gb25seV9vbmNlKGZuKSB7XG4gICAgICAgIHZhciBjYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGNhbGxlZCkgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgd2FzIGFscmVhZHkgY2FsbGVkLlwiKTtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICBmbi5hcHBseShyb290LCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8vLyBjcm9zcy1icm93c2VyIGNvbXBhdGlibGl0eSBmdW5jdGlvbnMgLy8vL1xuXG4gICAgdmFyIF9lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IpIHtcbiAgICAgICAgaWYgKGFyci5mb3JFYWNoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLmZvckVhY2goaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihhcnJbaV0sIGksIGFycik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9tYXAgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLm1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5tYXAoaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvcih4LCBpLCBhKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9O1xuXG4gICAgdmFyIF9yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWVtbykge1xuICAgICAgICBpZiAoYXJyLnJlZHVjZSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pO1xuICAgICAgICB9XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIG1lbW8gPSBpdGVyYXRvcihtZW1vLCB4LCBpLCBhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG5cbiAgICB2YXIgX2tleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cykge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfTtcblxuICAgIC8vLy8gZXhwb3J0ZWQgYXN5bmMgbW9kdWxlIGZ1bmN0aW9ucyAvLy8vXG5cbiAgICAvLy8vIG5leHRUaWNrIGltcGxlbWVudGF0aW9uIHdpdGggYnJvd3Nlci1jb21wYXRpYmxlIGZhbGxiYWNrIC8vLy9cbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8ICEocHJvY2Vzcy5uZXh0VGljaykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFzeW5jLm5leHRUaWNrID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgLy8gbm90IGEgZGlyZWN0IGFsaWFzIGZvciBJRTEwIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBhc3luYy5uZXh0VGljaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICBfZWFjaChhcnIsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBvbmx5X29uY2UoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmZvckVhY2ggPSBhc3luYy5lYWNoO1xuXG4gICAgYXN5bmMuZWFjaFNlcmllcyA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICB2YXIgaXRlcmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltjb21wbGV0ZWRdLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaXRlcmF0ZSgpO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaFNlcmllcyA9IGFzeW5jLmVhY2hTZXJpZXM7XG5cbiAgICBhc3luYy5lYWNoTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBmbiA9IF9lYWNoTGltaXQobGltaXQpO1xuICAgICAgICBmbi5hcHBseShudWxsLCBbYXJyLCBpdGVyYXRvciwgY2FsbGJhY2tdKTtcbiAgICB9O1xuICAgIGFzeW5jLmZvckVhY2hMaW1pdCA9IGFzeW5jLmVhY2hMaW1pdDtcblxuICAgIHZhciBfZWFjaExpbWl0ID0gZnVuY3Rpb24gKGxpbWl0KSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIGlmICghYXJyLmxlbmd0aCB8fCBsaW1pdCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY29tcGxldGVkID0gMDtcbiAgICAgICAgICAgIHZhciBzdGFydGVkID0gMDtcbiAgICAgICAgICAgIHZhciBydW5uaW5nID0gMDtcblxuICAgICAgICAgICAgKGZ1bmN0aW9uIHJlcGxlbmlzaCAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlIChydW5uaW5nIDwgbGltaXQgJiYgc3RhcnRlZCA8IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBydW5uaW5nICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXJhdG9yKGFycltzdGFydGVkIC0gMV0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydW5uaW5nIC09IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH07XG4gICAgfTtcblxuXG4gICAgdmFyIGRvUGFyYWxsZWwgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbYXN5bmMuZWFjaF0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBkb1BhcmFsbGVsTGltaXQgPSBmdW5jdGlvbihsaW1pdCwgZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbX2VhY2hMaW1pdChsaW1pdCldLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZG9TZXJpZXMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbYXN5bmMuZWFjaFNlcmllc10uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG5cbiAgICB2YXIgX2FzeW5jTWFwID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgudmFsdWUsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzW3guaW5kZXhdID0gdjtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMubWFwID0gZG9QYXJhbGxlbChfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcFNlcmllcyA9IGRvU2VyaWVzKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfbWFwTGltaXQobGltaXQpKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdmFyIF9tYXBMaW1pdCA9IGZ1bmN0aW9uKGxpbWl0KSB7XG4gICAgICAgIHJldHVybiBkb1BhcmFsbGVsTGltaXQobGltaXQsIF9hc3luY01hcCk7XG4gICAgfTtcblxuICAgIC8vIHJlZHVjZSBvbmx5IGhhcyBhIHNlcmllcyB2ZXJzaW9uLCBhcyBkb2luZyByZWR1Y2UgaW4gcGFyYWxsZWwgd29uJ3RcbiAgICAvLyB3b3JrIGluIG1hbnkgc2l0dWF0aW9ucy5cbiAgICBhc3luYy5yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IobWVtbywgeCwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIG1lbW8gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBpbmplY3QgYWxpYXNcbiAgICBhc3luYy5pbmplY3QgPSBhc3luYy5yZWR1Y2U7XG4gICAgLy8gZm9sZGwgYWxpYXNcbiAgICBhc3luYy5mb2xkbCA9IGFzeW5jLnJlZHVjZTtcblxuICAgIGFzeW5jLnJlZHVjZVJpZ2h0ID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXZlcnNlZCA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH0pLnJldmVyc2UoKTtcbiAgICAgICAgYXN5bmMucmVkdWNlKHJldmVyc2VkLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgLy8gZm9sZHIgYWxpYXNcbiAgICBhc3luYy5mb2xkciA9IGFzeW5jLnJlZHVjZVJpZ2h0O1xuXG4gICAgdmFyIF9maWx0ZXIgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soX21hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5maWx0ZXIgPSBkb1BhcmFsbGVsKF9maWx0ZXIpO1xuICAgIGFzeW5jLmZpbHRlclNlcmllcyA9IGRvU2VyaWVzKF9maWx0ZXIpO1xuICAgIC8vIHNlbGVjdCBhbGlhc1xuICAgIGFzeW5jLnNlbGVjdCA9IGFzeW5jLmZpbHRlcjtcbiAgICBhc3luYy5zZWxlY3RTZXJpZXMgPSBhc3luYy5maWx0ZXJTZXJpZXM7XG5cbiAgICB2YXIgX3JlamVjdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICghdikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soX21hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5yZWplY3QgPSBkb1BhcmFsbGVsKF9yZWplY3QpO1xuICAgIGFzeW5jLnJlamVjdFNlcmllcyA9IGRvU2VyaWVzKF9yZWplY3QpO1xuXG4gICAgdmFyIF9kZXRlY3QgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayh4KTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjaygpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmRldGVjdCA9IGRvUGFyYWxsZWwoX2RldGVjdCk7XG4gICAgYXN5bmMuZGV0ZWN0U2VyaWVzID0gZG9TZXJpZXMoX2RldGVjdCk7XG5cbiAgICBhc3luYy5zb21lID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gYW55IGFsaWFzXG4gICAgYXN5bmMuYW55ID0gYXN5bmMuc29tZTtcblxuICAgIGFzeW5jLmV2ZXJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGFsbCBhbGlhc1xuICAgIGFzeW5jLmFsbCA9IGFzeW5jLmV2ZXJ5O1xuXG4gICAgYXN5bmMuc29ydEJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLm1hcChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKGVyciwgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7dmFsdWU6IHgsIGNyaXRlcmlhOiBjcml0ZXJpYX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhLCBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIF9tYXAocmVzdWx0cy5zb3J0KGZuKSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXV0byA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgdmFyIGtleXMgPSBfa2V5cyh0YXNrcyk7XG4gICAgICAgIGlmICgha2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHRzID0ge307XG5cbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICAgICAgICB2YXIgYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy51bnNoaWZ0KGZuKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0gPT09IGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciB0YXNrQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfZWFjaChsaXN0ZW5lcnMuc2xpY2UoMCksIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBhZGRMaXN0ZW5lcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX2tleXMocmVzdWx0cykubGVuZ3RoID09PSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIF9lYWNoKGtleXMsIGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICB2YXIgdGFzayA9ICh0YXNrc1trXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSA/IFt0YXNrc1trXV06IHRhc2tzW2tdO1xuICAgICAgICAgICAgdmFyIHRhc2tDYWxsYmFjayA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNhZmVSZXN1bHRzID0ge307XG4gICAgICAgICAgICAgICAgICAgIF9lYWNoKF9rZXlzKHJlc3VsdHMpLCBmdW5jdGlvbihya2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1tya2V5XSA9IHJlc3VsdHNbcmtleV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgc2FmZVJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICAvLyBzdG9wIHN1YnNlcXVlbnQgZXJyb3JzIGhpdHRpbmcgY2FsbGJhY2sgbXVsdGlwbGUgdGltZXNcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUodGFza0NvbXBsZXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIHJlcXVpcmVzID0gdGFzay5zbGljZSgwLCBNYXRoLmFicyh0YXNrLmxlbmd0aCAtIDEpKSB8fCBbXTtcbiAgICAgICAgICAgIHZhciByZWFkeSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3JlZHVjZShyZXF1aXJlcywgZnVuY3Rpb24gKGEsIHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChhICYmIHJlc3VsdHMuaGFzT3duUHJvcGVydHkoeCkpO1xuICAgICAgICAgICAgICAgIH0sIHRydWUpICYmICFyZXN1bHRzLmhhc093blByb3BlcnR5KGspO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChyZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgdGFza1t0YXNrLmxlbmd0aCAtIDFdKHRhc2tDYWxsYmFjaywgcmVzdWx0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMud2F0ZXJmYWxsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAodGFza3MuY29uc3RydWN0b3IgIT09IEFycmF5KSB7XG4gICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgdG8gd2F0ZXJmYWxsIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJyk7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB3cmFwSXRlcmF0b3IgPSBmdW5jdGlvbiAoaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh3cmFwSXRlcmF0b3IobmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0b3IuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHdyYXBJdGVyYXRvcihhc3luYy5pdGVyYXRvcih0YXNrcykpKCk7XG4gICAgfTtcblxuICAgIHZhciBfcGFyYWxsZWwgPSBmdW5jdGlvbihlYWNoZm4sIHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAodGFza3MuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4gICAgICAgICAgICBlYWNoZm4ubWFwKHRhc2tzLCBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGVyciwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0ge307XG4gICAgICAgICAgICBlYWNoZm4uZWFjaChfa2V5cyh0YXNrcyksIGZ1bmN0aW9uIChrLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHRhc2tzW2tdKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoeyBtYXA6IGFzeW5jLm1hcCwgZWFjaDogYXN5bmMuZWFjaCB9LCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5wYXJhbGxlbExpbWl0ID0gZnVuY3Rpb24odGFza3MsIGxpbWl0LCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoeyBtYXA6IF9tYXBMaW1pdChsaW1pdCksIGVhY2g6IF9lYWNoTGltaXQobGltaXQpIH0sIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnNlcmllcyA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgaWYgKHRhc2tzLmNvbnN0cnVjdG9yID09PSBBcnJheSkge1xuICAgICAgICAgICAgYXN5bmMubWFwU2VyaWVzKHRhc2tzLCBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGVyciwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0ge307XG4gICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKF9rZXlzKHRhc2tzKSwgZnVuY3Rpb24gKGssIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdGFza3Nba10oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuaXRlcmF0b3IgPSBmdW5jdGlvbiAodGFza3MpIHtcbiAgICAgICAgdmFyIG1ha2VDYWxsYmFjayA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3NbaW5kZXhdLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmbi5uZXh0KCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm4ubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGluZGV4IDwgdGFza3MubGVuZ3RoIC0gMSkgPyBtYWtlQ2FsbGJhY2soaW5kZXggKyAxKTogbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBtYWtlQ2FsbGJhY2soMCk7XG4gICAgfTtcblxuICAgIGFzeW5jLmFwcGx5ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShcbiAgICAgICAgICAgICAgICBudWxsLCBhcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIF9jb25jYXQgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGZuLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgciA9IFtdO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2IpIHtcbiAgICAgICAgICAgIGZuKHgsIGZ1bmN0aW9uIChlcnIsIHkpIHtcbiAgICAgICAgICAgICAgICByID0gci5jb25jYXQoeSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHIpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmNvbmNhdCA9IGRvUGFyYWxsZWwoX2NvbmNhdCk7XG4gICAgYXN5bmMuY29uY2F0U2VyaWVzID0gZG9TZXJpZXMoX2NvbmNhdCk7XG5cbiAgICBhc3luYy53aGlsc3QgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy53aGlsc3QodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1doaWxzdCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRlc3QoKSkge1xuICAgICAgICAgICAgICAgIGFzeW5jLmRvV2hpbHN0KGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMudW50aWwgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGVzdCgpKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXN5bmMudW50aWwodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1VudGlsID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRlc3QoKSkge1xuICAgICAgICAgICAgICAgIGFzeW5jLmRvVW50aWwoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5xdWV1ZSA9IGZ1bmN0aW9uICh3b3JrZXIsIGNvbmN1cnJlbmN5KSB7XG4gICAgICAgIGlmIChjb25jdXJyZW5jeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25jdXJyZW5jeSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gX2luc2VydChxLCBkYXRhLCBwb3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYoZGF0YS5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpIHtcbiAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2VhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICB2YXIgaXRlbSA9IHtcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHRhc2ssXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjazogdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nID8gY2FsbGJhY2sgOiBudWxsXG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgaWYgKHBvcykge1xuICAgICAgICAgICAgICAgIHEudGFza3MudW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxLnRhc2tzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAocS5zYXR1cmF0ZWQgJiYgcS50YXNrcy5sZW5ndGggPT09IGNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICBxLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHdvcmtlcnMgPSAwO1xuICAgICAgICB2YXIgcSA9IHtcbiAgICAgICAgICAgIHRhc2tzOiBbXSxcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5OiBjb25jdXJyZW5jeSxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCBmYWxzZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc2hpZnQ6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIHRydWUsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9jZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmtlcnMgPCBxLmNvbmN1cnJlbmN5ICYmIHEudGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YXNrID0gcS50YXNrcy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocS5lbXB0eSAmJiBxLnRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcS5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcnMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JrZXJzIC09IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suY2FsbGJhY2suYXBwbHkodGFzaywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxLmRyYWluICYmIHEudGFza3MubGVuZ3RoICsgd29ya2VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2IgPSBvbmx5X29uY2UobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcih0YXNrLmRhdGEsIGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEudGFza3MubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcblxuICAgIGFzeW5jLmNhcmdvID0gZnVuY3Rpb24gKHdvcmtlciwgcGF5bG9hZCkge1xuICAgICAgICB2YXIgd29ya2luZyAgICAgPSBmYWxzZSxcbiAgICAgICAgICAgIHRhc2tzICAgICAgID0gW107XG5cbiAgICAgICAgdmFyIGNhcmdvID0ge1xuICAgICAgICAgICAgdGFza3M6IHRhc2tzLFxuICAgICAgICAgICAgcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZihkYXRhLmNvbnN0cnVjdG9yICE9PSBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfZWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXJnby5zYXR1cmF0ZWQgJiYgdGFza3MubGVuZ3RoID09PSBwYXlsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJnby5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShjYXJnby5wcm9jZXNzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9jZXNzOiBmdW5jdGlvbiBwcm9jZXNzKCkge1xuICAgICAgICAgICAgICAgIGlmICh3b3JraW5nKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZihjYXJnby5kcmFpbikgY2FyZ28uZHJhaW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB0cyA9IHR5cGVvZiBwYXlsb2FkID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gdGFza3Muc3BsaWNlKDAsIHBheWxvYWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0YXNrcy5zcGxpY2UoMCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZHMgPSBfbWFwKHRzLCBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFzay5kYXRhO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYoY2FyZ28uZW1wdHkpIGNhcmdvLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgd29ya2luZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgd29ya2VyKGRzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtpbmcgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICAgICAgX2VhY2godHMsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuY2FsbGJhY2suYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFza3MubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2luZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNhcmdvO1xuICAgIH07XG5cbiAgICB2YXIgX2NvbnNvbGVfZm4gPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25zb2xlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGNvbnNvbGVbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lYWNoKGFyZ3MsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZVtuYW1lXSh4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfV0pKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIGFzeW5jLmxvZyA9IF9jb25zb2xlX2ZuKCdsb2cnKTtcbiAgICBhc3luYy5kaXIgPSBfY29uc29sZV9mbignZGlyJyk7XG4gICAgLyphc3luYy5pbmZvID0gX2NvbnNvbGVfZm4oJ2luZm8nKTtcbiAgICBhc3luYy53YXJuID0gX2NvbnNvbGVfZm4oJ3dhcm4nKTtcbiAgICBhc3luYy5lcnJvciA9IF9jb25zb2xlX2ZuKCdlcnJvcicpOyovXG5cbiAgICBhc3luYy5tZW1vaXplID0gZnVuY3Rpb24gKGZuLCBoYXNoZXIpIHtcbiAgICAgICAgdmFyIG1lbW8gPSB7fTtcbiAgICAgICAgdmFyIHF1ZXVlcyA9IHt9O1xuICAgICAgICBoYXNoZXIgPSBoYXNoZXIgfHwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9O1xuICAgICAgICB2YXIgbWVtb2l6ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIGlmIChrZXkgaW4gbWVtbykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIG1lbW9ba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChrZXkgaW4gcXVldWVzKSB7XG4gICAgICAgICAgICAgICAgcXVldWVzW2tleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XSA9IFtjYWxsYmFja107XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQoW2Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVtb1trZXldID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcSA9IHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICBxW2ldLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBtZW1vaXplZC5tZW1vID0gbWVtbztcbiAgICAgICAgbWVtb2l6ZWQudW5tZW1vaXplZCA9IGZuO1xuICAgICAgICByZXR1cm4gbWVtb2l6ZWQ7XG4gICAgfTtcblxuICAgIGFzeW5jLnVubWVtb2l6ZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIChmbi51bm1lbW9pemVkIHx8IGZuKS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgYXN5bmMudGltZXMgPSBmdW5jdGlvbiAoY291bnQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgY291bnRlciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGNvdW50ZXIucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN5bmMubWFwKGNvdW50ZXIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnRpbWVzU2VyaWVzID0gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBjb3VudGVyLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFzeW5jLm1hcFNlcmllcyhjb3VudGVyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5jb21wb3NlID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgICB2YXIgZm5zID0gQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIGFzeW5jLnJlZHVjZShmbnMsIGFyZ3MsIGZ1bmN0aW9uIChuZXdhcmdzLCBmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBjYihlcnIsIG5leHRhcmdzKTtcbiAgICAgICAgICAgICAgICB9XSkpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoYXQsIFtlcnJdLmNvbmNhdChyZXN1bHRzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIF9hcHBseUVhY2ggPSBmdW5jdGlvbiAoZWFjaGZuLCBmbnMgLyphcmdzLi4uKi8pIHtcbiAgICAgICAgdmFyIGdvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBlYWNoZm4oZm5zLCBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgYXJncy5jb25jYXQoW2NiXSkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGFzeW5jLmFwcGx5RWFjaCA9IGRvUGFyYWxsZWwoX2FwcGx5RWFjaCk7XG4gICAgYXN5bmMuYXBwbHlFYWNoU2VyaWVzID0gZG9TZXJpZXMoX2FwcGx5RWFjaCk7XG5cbiAgICBhc3luYy5mb3JldmVyID0gZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4obmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICAvLyBBTUQgLyBSZXF1aXJlSlNcbiAgICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBhc3luYztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIE5vZGUuanNcbiAgICBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGFzeW5jO1xuICAgIH1cbiAgICAvLyBpbmNsdWRlZCBkaXJlY3RseSB2aWEgPHNjcmlwdD4gdGFnXG4gICAgZWxzZSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBhc3luYztcbiAgICB9XG5cbn0oKSk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpKSIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeSA9IHJlcXVpcmUoXCIuLi91dGlsL2ZsaXBfZW5kaWFubmVzc19pZl9uZWNlc3NhcnlcIik7XHJcblxyXG52YXIgbm9ybWFsID0gKDEgPDwgMCk7XHJcbnZhciB0YW5nZW50ID0gKDEgPDwgMSk7XHJcbnZhciB0ZXhjb29yZCA9ICgxIDw8IDIpO1xyXG52YXIgY29sb3IgPSAoMSA8PCAzKTtcclxuXHJcbmV4cG9ydHMuZW5jb2RlID0gZnVuY3Rpb24gKG1lc2gsIGxpdHRsZUVuZGlhbikge1xyXG4gICAgdmFyIHZlcnRleENvdW50ID0gbWVzaC5wb3NpdGlvbi5sZW5ndGggLyAzLjA7XHJcbiAgICB2YXIgYXR0cmlicyA9IDA7XHJcblxyXG4gICAgdmFyIGJ1ZmZlcnMgPSBbZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG1lc2gucG9zaXRpb24sIGxpdHRsZUVuZGlhbildO1xyXG5cclxuICAgIGlmIChtZXNoLm5vcm1hbCkge1xyXG4gICAgICAgIGF0dHJpYnMgfD0gbm9ybWFsO1xyXG4gICAgICAgIGJ1ZmZlcnMucHVzaChmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobWVzaC5ub3JtYWwsIGxpdHRsZUVuZGlhbikpXHJcbiAgICB9XHJcbiAgICBpZiAobWVzaC50YW5nZW50KSB7XHJcbiAgICAgICAgYXR0cmlicyB8PSB0YW5nZW50O1xyXG4gICAgICAgIGJ1ZmZlcnMucHVzaChmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobWVzaC50YW5nZW50LCBsaXR0bGVFbmRpYW4pKTtcclxuICAgIH1cclxuICAgIGlmIChtZXNoLnRleGNvb3JkKSB7XHJcbiAgICAgICAgYXR0cmlicyB8PSB0ZXhjb29yZDtcclxuICAgICAgICBidWZmZXJzLnB1c2goZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG1lc2gudGV4Y29vcmQsIGxpdHRsZUVuZGlhbikpO1xyXG4gICAgfVxyXG4gICAgaWYgKG1lc2guY29sb3IpIHtcclxuICAgICAgICBhdHRyaWJzIHw9IGNvbG9yO1xyXG4gICAgICAgIGJ1ZmZlcnMucHVzaChmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobWVzaC5jb2xvciwgbGl0dGxlRW5kaWFuKSk7XHJcbiAgICB9XHJcbiAgICBidWZmZXJzLnB1c2goZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG1lc2guaW5kZXgsIGxpdHRsZUVuZGlhbikpO1xyXG5cclxuICAgIC8vIDMgYnl0ZXMgcGFkZGluZyB0byBhbGlnbiBmb2xsb3dpbmcgYnVmZmVyIHRvIDQgYnl0ZSBib3VuZGFyaWVzIGFzIG5lY2Nlc3NhcnkuXHJcbiAgICBidWZmZXJzLnVuc2hpZnQobmV3IEFycmF5QnVmZmVyKDMpKTtcclxuICAgIGJ1ZmZlcnMudW5zaGlmdChuZXcgVWludDhBcnJheShbYXR0cmlic10pKTtcclxuXHJcbiAgICBidWZmZXJzLnVuc2hpZnQoZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBVaW50MzJBcnJheShbdmVydGV4Q291bnRdKSwgbGl0dGxlRW5kaWFuKSk7XHJcblxyXG4gICAgcmV0dXJuIGJ1ZmZlcnM7XHJcbn07XHJcblxyXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uIChidWZmZXIsIGxpdHRsZUVuZGlhbikge1xyXG4gICAgdmFyIHZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcclxuICAgIHZhciBvZmZzZXQgPSAwO1xyXG4gICAgdmFyIHZlcnRleENvdW50ID0gdmlldy5nZXRVaW50MzIob2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xyXG4gICAgb2Zmc2V0ICs9IDQ7XHJcbiAgICB2YXIgYXR0cmlicyA9IHZpZXcuZ2V0VWludDgob2Zmc2V0KTtcclxuICAgIG9mZnNldCArPSA0O1xyXG5cclxuICAgIHZhciBtZXNoID0ge1xyXG4gICAgICAgIHBvc2l0aW9uOiBmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IEZsb2F0MzJBcnJheShidWZmZXIsIG9mZnNldCwgdmVydGV4Q291bnQgKiAzKSwgbGl0dGxlRW5kaWFuKVxyXG4gICAgfTtcclxuICAgIG9mZnNldCArPSB2ZXJ0ZXhDb3VudCAqIDMgKiBtZXNoLnBvc2l0aW9uLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG5cclxuICAgIGlmIChhdHRyaWJzICYgbm9ybWFsKSB7XHJcbiAgICAgICAgbWVzaC5ub3JtYWwgPSBmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IEZsb2F0MzJBcnJheShidWZmZXIsIG9mZnNldCwgdmVydGV4Q291bnQgKiAzKSwgbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICBvZmZzZXQgKz0gdmVydGV4Q291bnQgKiAzICogbWVzaC5ub3JtYWwuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICB9XHJcbiAgICBpZiAoYXR0cmlicyAmIHRhbmdlbnQpIHtcclxuICAgICAgICBtZXNoLnRhbmdlbnQgPSBmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IEZsb2F0MzJBcnJheShidWZmZXIsIG9mZnNldCwgdmVydGV4Q291bnQgKiAzKSwgbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICBvZmZzZXQgKz0gdmVydGV4Q291bnQgKiAzICogbWVzaC50YW5nZW50LkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgfVxyXG4gICAgaWYgKGF0dHJpYnMgJiB0ZXhjb29yZCkge1xyXG4gICAgICAgIG1lc2gudGV4Y29vcmQgPSBmbGlwRW5kaWFuZXNzSWZOZWNlc3NhcnkobmV3IEZsb2F0MzJBcnJheShidWZmZXIsIG9mZnNldCwgdmVydGV4Q291bnQgKiAyKSwgbGl0dGxlRW5kaWFuKTtcclxuICAgICAgICBvZmZzZXQgKz0gdmVydGV4Q291bnQgKiAyICogbWVzaC50ZXhjb29yZC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgIH1cclxuICAgIGlmIChhdHRyaWJzICYgY29sb3IpIHtcclxuICAgICAgICBtZXNoLmNvbG9yID0gZmxpcEVuZGlhbmVzc0lmTmVjZXNzYXJ5KG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLCBvZmZzZXQsIHZlcnRleENvdW50ICogNCksIGxpdHRsZUVuZGlhbik7XHJcbiAgICAgICAgb2Zmc2V0ICs9IHZlcnRleENvdW50ICogNCAqIG1lc2guY29sb3IuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICB9XHJcblxyXG4gICAgbWVzaC5pbmRleCA9IGZsaXBFbmRpYW5lc3NJZk5lY2Vzc2FyeShuZXcgVWludDMyQXJyYXkoYnVmZmVyLCBvZmZzZXQpLCBsaXR0bGVFbmRpYW4pO1xyXG5cclxuICAgIHJldHVybiBtZXNoO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBhYm9wcyA9IHJlcXVpcmUoXCJhYm9wc1wiKTtcclxuXHJcbnZhciBpc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSA9IHJlcXVpcmUoXCIuLi91dGlsL2lzX2xpdHRsZV9lbmRpYW5fYXJjaGl0ZWN0dXJlXCIpO1xyXG5cclxuLy8gV2UgdXNlIHRoZSBmaXJzdCBieXRlIHRvIGVuY29kZSB0aGUgdHlwZSBvZiB0aGUgdHlwZWQgYXJyYXlcclxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbiAodHlwZWRBcnJheSwgbGl0dGxlRW5kaWFuKSB7XHJcbiAgICB2YXIgdHlwZSA9IHR5cGVkQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XHJcblxyXG4gICAgaWYgKHR5cGVkQXJyYXkgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkgfHwgdHlwZWRBcnJheSBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSlcclxuICAgICAgICB0eXBlIHw9ICgxIDw8IDcpO1xyXG4gICAgZWxzZSBpZiAodHlwZWRBcnJheSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgfHwgdHlwZWRBcnJheSBpbnN0YW5jZW9mIFVpbnQxNkFycmF5IHx8IHR5cGVkQXJyYXkgaW5zdGFuY2VvZiBVaW50MzJBcnJheSlcclxuICAgICAgICB0eXBlIHw9ICgxIDw8IDYpO1xyXG5cclxuICAgIHJldHVybiBhYm9wcy5jb25jYXQobmV3IFVpbnQ4QXJyYXkoW3R5cGVdKSwgZmxpcEVuZGlhbm5lc0lmTmVjZXNzYXJ5KHR5cGVkQXJyYXksIGxpdHRsZUVuZGlhbikpO1xyXG59O1xyXG5cclxuZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbiAoYnVmZmVyLCBsaXR0bGVFbmRpYW4pIHtcclxuICAgIHZhciB0eXBlID0gbmV3IERhdGFWaWV3KGJ1ZmZlcikuZ2V0VWludDgoMCk7XHJcbiAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoMSk7XHJcbiAgICB2YXIgaXNVbnNpbmdlZCA9ICEhKHR5cGUgJiAoMSA8PCA2KSk7XHJcbiAgICB2YXIgaXNGbG9hdGluZ1BvaW50ID0gISEodHlwZSAmICgxIDw8IDcpKTtcclxuICAgIHZhciB0eXBlZEFycmF5ID0gbnVsbDtcclxuICAgIHN3aXRjaCAodHlwZSAmIDB4MEYpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIHR5cGVkQXJyYXkgPSBpc1Vuc2luZ2VkID8gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSA6IG5ldyBJbnQ4QXJyYXkoYnVmZmVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICB0eXBlZEFycmF5ID0gaXNVbnNpbmdlZCA/IG5ldyBVaW50MTZBcnJheShidWZmZXIpIDogbmV3IEludDE2QXJyYXkoYnVmZmVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICB0eXBlZEFycmF5ID0gaXNVbnNpbmdlZCA/IG5ldyBVaW50MzJBcnJheShidWZmZXIpIDogKGlzRmxvYXRpbmdQb2ludCA/IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyKSA6IG5ldyBJbnQzMkFycmF5KGJ1ZmZlcikpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDg6XHJcbiAgICAgICAgICAgIHR5cGVkQXJyYXkgPSBuZXcgRmxvYXQ2NEFycmF5KGJ1ZmZlcik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJVbmV4cGVjdGVkIHR5cGUgZW5jb2RpbmcgZm9yIGJ1ZmZlciFcIik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZsaXBFbmRpYW5uZXNJZk5lY2Vzc2FyeSh0eXBlZEFycmF5LCBsaXR0bGVFbmRpYW4pO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZmxpcEVuZGlhbm5lc0lmTmVjZXNzYXJ5KHR5cGVkQXJyYXksIGxpdHRsZUVuZGlhbikge1xyXG4gICAgaWYgKGxpdHRsZUVuZGlhbiAmJiAhaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUoKSlcclxuICAgICAgICByZXR1cm4gYWJvcHMuZmxpcEVuZGlhbm5lc3ModHlwZWRBcnJheSk7XHJcbiAgICByZXR1cm4gdHlwZWRBcnJheTtcclxufVxyXG4iLCIvLyAjIEpTT04gQ29kZWNcclxuXHJcbi8vIFRoaXMgc2ltcGxlIGNvZGVjIHNpbXBseSB1c2VzIGBKU09OLnN0cmluZ2lmeWAgYW5kIGBKU09OLnBhcnNlYCB0byBlbmNvZGUgYW5kIGRlY29kZSB0aGUgZ2l2ZW4gZGF0YS5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGFib3BzID0gcmVxdWlyZShcImFib3BzXCIpO1xyXG5cclxuLyoqXHJcbiAqIEVuY29kZXMgdGhlIGdpdmVuIHZhbHVlIHVzaW5nIEpTT04uc3RyaW5naWZ5LlxyXG4gKiBUaGlzIHN0cmluZyByZXByZXNlbnRhdGlvbiB3aWxsIGJlIHdyaXR0ZW4gaW50byBhbiBBcnJheUJ1ZmZlciB1c2luZyBVVEYtOCBlbmNvZGluZy5cclxuICogVGhlIHNlY29uZCBkdW1teSBwYXJhbWV0ZXIgaXMgb25seSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIHRoZSBjb3JlIGxpYnJhcnkgdGhhdCBleHBlY3RzXHJcbiAqIGVuY29kZXJzIHRvIHByb3ZpZGUgYSBsaXR0bGUtZW5kaWFuIHBhcmFtZXRlciB0byBzcGVjaWZ5IHRoZSBmb3JtYXQgaW4gd2hpY2ggbXVsdGktYnl0ZSB2YWx1ZXMgd2lsbFxyXG4gKiBiZSB3cml0dGVuIGludG8gYSBidWZmZXIuXHJcbiAqIFNpbmNlIHdlIHdyaXRlIFVURi04IGVuY29kZWQgc3RyaW5ncyBlbmRpYW5uZXNzIGlzIGlycmVsZXZhbnQuXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIGVuY29kZVxyXG4gKiBAcGFyYW0ge01peGVkfSBvYmplY3QgVGhlIHZhbHVlIHRvIGVuY29kZS5cclxuICogQHJldHVybnMge0FycmF5QnVmZmVyfSBBbiBBcnJheUJ1ZmZlciBjb250YWluaW5nIHRoZSBVVEYtOCBlbmNvZGVkIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gdmFsdWUuXHJcbiAqL1xyXG5leHBvcnRzLmVuY29kZSA9IGZ1bmN0aW9uIChvYmplY3QsIF8pIHtcclxuICAgIHJldHVybiBhYm9wcy5idWZmZXJGb3JTdHJpbmcoSlNPTi5zdHJpbmdpZnkob2JqZWN0KSk7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVjb2RlcyB0aGUgZ2l2ZW4gRGF0YVZpZXcgdXNpbmcgSlNPTi5wYXJzZS5cclxuICogSXQgcmVhZHMgdGhlIFVURi04IGVuY29kZWQgc3RyaW5nIHJlZmVyZW5jZWQgYnkgdGhlIERhdGFWaWV3IGFuZCBwYXJzZXMgdGhhdCBzdHJpbmcgYXNzdW1pbmcgdGhhdFxyXG4gKiBpdCBpcyBhIHN0cmluZyBzZXJpYWxpemF0aW9uIHByb2R1Y2VkIGJ5IEpTT04uc3RyaW5naWZ5IG9yIHNvbWV0aGluZyBlcXVpdmFsZW50LlxyXG4gKlxyXG4gKiBAcGFyYW0ge0RhdGFWaWV3fSB2aWV3IFRoZSBEYXRhVmlldyB0aGF0IHNwZWNpZmllcyB0aGUgYnVmZmVyIGFuZCB0aGUgcmFuZ2UgZnJvbSB3aGljaCB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIHdpbGwgYmUgZXh0cmFjdGVkLlxyXG4gKiBAcmV0dXJucyB7TWl4ZWR9XHJcbiAqL1xyXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uIChidWZmZXIsIF8pIHtcclxuICAgIHJldHVybiBKU09OLnBhcnNlKGFib3BzLmdldFN0cmluZyhidWZmZXIsIDAsIFwidXRmLThcIikpO1xyXG59O1xyXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5leHBvcnRzLmpzb24gPSByZXF1aXJlKFwiLi9jb2RlY3MvanNvblwiKTtcclxuZXhwb3J0cy5pZGVudGl0eSA9IHJlcXVpcmUoXCIuL2NvZGVjcy9pZGVudGl0eVwiKTtcclxuZXhwb3J0cy5hc3NpbXBNZXNoID0gcmVxdWlyZShcIi4vY29kZWNzL2Fzc2ltcF9tZXNoXCIpO1xyXG5cclxuZXhwb3J0cy5pc0xpdHRsZUVuZGlhbkFyY2hpdGVjdHVyZSA9IHJlcXVpcmUoXCIuL3V0aWwvaXNfbGl0dGxlX2VuZGlhbl9hcmNoaXRlY3R1cmVcIik7XHJcblxyXG5pZiAoIXByb2Nlc3MuYnJvd3NlcilcclxuICAgIGV4cG9ydHMuc2VydmVDb2RlY3MgPSByZXF1aXJlKFwiLi91dGlsL1wiICsgXCJhcHBlbmRfcm91dGVzXCIpO1xyXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpKSIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGFib3BzID0gcmVxdWlyZShcImFib3BzXCIpO1xyXG52YXIgaXNMaXR0bGVFbmRpYW5BcmNoaXRlY3R1cmUgPSByZXF1aXJlKFwiLi9pc19saXR0bGVfZW5kaWFuX2FyY2hpdGVjdHVyZVwiKTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0eXBlZEFycmF5LCBsaXR0bGVFbmRpYW4pIHtcclxuICAgIGlmIChsaXR0bGVFbmRpYW4gIT09IGlzTGl0dGxlRW5kaWFuQXJjaGl0ZWN0dXJlKCkpXHJcbiAgICAgICAgcmV0dXJuIGFib3BzLmZsaXBFbmRpYW5uZXNzKHR5cGVkQXJyYXkpO1xyXG4gICAgcmV0dXJuIHR5cGVkQXJyYXk7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHRva2VuaXplID0gcmVxdWlyZShcIi4vbGV4aW5nXCIpO1xyXG52YXIgcGFyc2UgPSByZXF1aXJlKFwiLi9wYXJzaW5nXCIpO1xyXG5cclxudmFyIEpQYXRoSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3IgPSByZXF1aXJlKFwiLi9pbnZhbGlkX2VzY2FwZV9zZXF1ZW5jZV9lcnJvclwiKTtcclxudmFyIEpQYXRoUGFyc2luZ0Vycm9yID0gcmVxdWlyZShcIi4vcGFyc2luZ19lcnJvclwiKTtcclxudmFyIEpQYXRoU3ludGF4RXJyb3IgPSByZXF1aXJlKFwiLi9zeW50YXhfZXJyb3JcIik7XHJcblxyXG5mdW5jdGlvbiBoaWdobGlnaHRFcnJvbmVvdXNQYXJ0KGV4cHJlc3Npb24sIHN0YXJ0SWR4LCBlbmRJZHgpIHtcclxuICAgIHZhciBiZWZvcmUgPSBleHByZXNzaW9uLnN1YnN0cmluZygwLCBzdGFydElkeCk7XHJcbiAgICB2YXIgZXJyb25lb3VzUGFydCA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKHN0YXJ0SWR4LCBlbmRJZHgpO1xyXG4gICAgdmFyIGFmdGVyID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcoZW5kSWR4KTtcclxuICAgIHJldHVybiBiZWZvcmUgKyBcIj5cIiArIGVycm9uZW91c1BhcnQgKyBcIjxcIiArIGFmdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21waWxlKHBhdGhFeHByZXNzaW9uKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBwYXJzZSh0b2tlbml6ZShwYXRoRXhwcmVzc2lvbikpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGlmIChlIGluc3RhbmNlb2YgSlBhdGhJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvcikge1xyXG4gICAgICAgICAgICB2YXIgc3RhcnRJZHggPSBwYXRoRXhwcmVzc2lvbi5pbmRleE9mKGUuaW52YWxpZFNlcXVlbmNlKTtcclxuICAgICAgICAgICAgdmFyIGVuZElkeCA9IHN0YXJ0SWR4ICsgZS5pbnZhbGlkU2VxdWVuY2UubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgSlBhdGhTeW50YXhFcnJvcih7XHJcbiAgICAgICAgICAgICAgICByZWFzb246IEpQYXRoU3ludGF4RXJyb3IucmVhc29ucy5pbnZhbGlkRXNjYXBlU2VxdWVuY2UsXHJcbiAgICAgICAgICAgICAgICBzdGFydElkeDogc3RhcnRJZHgsXHJcbiAgICAgICAgICAgICAgICBlbmRJZHg6IGVuZElkeCxcclxuICAgICAgICAgICAgICAgIGFjdHVhbDogZS5pbnZhbGlkU2VxdWVuY2UsXHJcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogZS5leHBlY3RlZCxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiSW52YWxpZCBlc2NhcGUgc2VxdWVuY2U6IFwiICsgaGlnaGxpZ2h0RXJyb25lb3VzUGFydChwYXRoRXhwcmVzc2lvbiwgc3RhcnRJZHgsIGVuZElkeCkgKyBcIiEgR290OiBcIiArIGUuaW52YWxpZFNlcXVlbmNlICsgXCIsIGV4cGVjdGVkOiBcIiArIGUuZXhwZWN0ZWQuam9pbihcIiBvciBcIilcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlIGluc3RhbmNlb2YgSlBhdGhQYXJzaW5nRXJyb3IpIHtcclxuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIlwiO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGUucmVhc29uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEpQYXRoUGFyc2luZ0Vycm9yLnJlYXNvbnMubWlzc2luZ0Nsb3NpbmdCcmFja2V0OlxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIk1pc3NpbmcgY2xvc2luZyBicmFja2V0OiBcIiArIGhpZ2hsaWdodEVycm9uZW91c1BhcnQocGF0aEV4cHJlc3Npb24sIGUuc3RhcnRJZHgsIGUuZW5kSWR4KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy51bm1hdGNoZWRDbG9zaW5nQnJhY2tldDpcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gXCJNaXNzaW5nIG9wZW5pbmcgYnJhY2tldDogXCIgKyBoaWdobGlnaHRFcnJvbmVvdXNQYXJ0KHBhdGhFeHByZXNzaW9uLCBlLnN0YXJ0SWR4LCBlLmVuZElkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEpQYXRoUGFyc2luZ0Vycm9yLnJlYXNvbnMubWlzc2luZ0Nsb3NpbmdQYXJlbnRoZXNlczpcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gXCJNaXNzaW5nIGNsb3NpbmcgcGFyZW50aGVzZXM6IFwiICsgaGlnaGxpZ2h0RXJyb25lb3VzUGFydChwYXRoRXhwcmVzc2lvbiwgZS5zdGFydElkeCwgZS5lbmRJZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zLnVubWF0Y2hlZENsb3NpbmdQYXJlbnRoZXNlczpcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gXCJNaXNzaW5nIG9wZW5pbmcgcGFyZW50aGVzZXM6IFwiICsgaGlnaGxpZ2h0RXJyb25lb3VzUGFydChwYXRoRXhwcmVzc2lvbiwgZS5zdGFydElkeCwgZS5lbmRJZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zLnVuZXhwZWN0ZWRUb2tlbjpcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gXCJVbmV4cGVjdGVkIFRva2VuOiBcIiArIGhpZ2hsaWdodEVycm9uZW91c1BhcnQocGF0aEV4cHJlc3Npb24sIGUuc3RhcnRJZHgsIGUuZW5kSWR4KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy5pbnZhbGlkRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gXCJJbnZhbGlkIGV4cHJlc3Npb246IFwiICsgaGlnaGxpZ2h0RXJyb25lb3VzUGFydChwYXRoRXhwcmVzc2lvbiwgZS5zdGFydElkeCwgZS5lbmRJZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBKUGF0aFN5bnRheEVycm9yKHtcclxuICAgICAgICAgICAgICAgIHJlYXNvbjogZS5yZWFzb24sXHJcbiAgICAgICAgICAgICAgICBzdGFydElkeDogZS5zdGFydElkeCxcclxuICAgICAgICAgICAgICAgIGVuZElkeDogZS5lbmRJZHgsXHJcbiAgICAgICAgICAgICAgICBhY3R1YWw6IGUuaW52YWxpZFNlcXVlbmNlLFxyXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGUuZXhwZWN0ZWQsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBjb21waWxlO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBFdmFsdWF0aW9uUmVzdWx0ID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvbl9yZXN1bHRcIik7XHJcblxyXG5mdW5jdGlvbiBDb25zdGFudFZhbHVlRXhwcmVzc2lvbih2YWx1ZSkge1xyXG5cdHRoaXMuX3ZhbHVlID0gW25ldyBFdmFsdWF0aW9uUmVzdWx0KHZhbHVlKV07XHJcbn1cclxuXHJcbkNvbnN0YW50VmFsdWVFeHByZXNzaW9uLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uIChfKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudFZhbHVlRXhwcmVzc2lvbjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgRXZhbHVhdGlvblJlc3VsdCA9IHJlcXVpcmUoXCIuL2V2YWx1YXRpb25fcmVzdWx0XCIpO1xyXG5cclxuZnVuY3Rpb24gQ29udGV4dChyb290LCBjdXJyZW50KSB7XHJcblx0dGhpcy5fcm9vdCA9IHJvb3Q7XHJcblx0dGhpcy5fY3VycmVudCA9IGN1cnJlbnQgPyBjdXJyZW50IDogW25ldyBFdmFsdWF0aW9uUmVzdWx0KHRoaXMuX3Jvb3QpXTtcclxufVxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQ29udGV4dC5wcm90b3R5cGUsIHtcclxuXHRyb290OiB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuX3Jvb3Q7XHJcblx0XHR9XHJcblx0fSxcclxuXHRjdXJyZW50OiB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuX2N1cnJlbnQ7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IENvbnRleHQ7XHJcblxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBldmFsdWF0ZSA9IHJlcXVpcmUoXCIuL2V2YWx1YXRpb25cIik7XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGF0aCwgb2JqZWN0KSB7XHJcbiAgICB2YXIgY292ZXJhZ2VPYmplY3QgPSB7fTsgLy9jcmVhdGVDb3ZlcmFnZU9iamVjdChvYmplY3QpO1xyXG5cclxuICAgIHZhciByb290T2JqZWN0TWF0Y2hlZCA9IGZhbHNlO1xyXG4gICAgdmFyIGRlZmluZWRSZXN1bHRzID0gZXZhbHVhdGUocGF0aCwgb2JqZWN0KS5kZWZpbmVkUmVzdWx0cztcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGVmaW5lZFJlc3VsdHMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gIGRlZmluZWRSZXN1bHRzW2ldO1xyXG4gICAgICAgIGlmIChyZXN1bHQuaXNSb290KSB7XHJcbiAgICAgICAgICAgIHJvb3RPYmplY3RNYXRjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGV2YWx1YXRlKHJlc3VsdC5wYXRoLCBjb3ZlcmFnZU9iamVjdCkuZm9yRWFjaChmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJvb3RPYmplY3RNYXRjaGVkKVxyXG4gICAgICAgIHJldHVybiB7fTtcclxuXHJcbiAgICByZXR1cm4gZXh0cmFjdFVuY292ZXJlZFBhcnRzKG9iamVjdCwgY292ZXJhZ2VPYmplY3QpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFVuY292ZXJlZFBhcnRzKG9iamVjdCwgY292ZXJhZ2UpIHtcclxuICAgIHZhciB1bmNvdmVyZWQgPSB7fTtcclxuXHJcbiAgICBpZiAob2JqZWN0LmJ1ZmZlciAmJiBvYmplY3QuQllURVNfUEVSX0VMRU1FTlQpIHtcclxuICAgICAgICB2YXIgY292ZXJlZEluZGljZXNMZW5ndGggPSBjb3ZlcmFnZS5maWx0ZXIoZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9KS5sZW5ndGg7XHJcbiAgICAgICAgdW5jb3ZlcmVkID0gbmV3IG9iamVjdC5jb25zdHJ1Y3RvcihvYmplY3QubGVuZ3RoIC0gY292ZXJlZEluZGljZXNMZW5ndGgpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpZHggPSAwLCB1bmNvdmVyZWRJZHggPSAwOyBpZHggPCBvYmplY3QubGVuZ3RoOyArK2lkeCkge1xyXG4gICAgICAgICAgICBpZiAoIWNvdmVyYWdlW2lkeF0pXHJcbiAgICAgICAgICAgICAgICB1bmNvdmVyZWRbdW5jb3ZlcmVkSWR4KytdID0gb2JqZWN0W2lkeF07XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3QpKVxyXG4gICAgICAgICAgICB1bmNvdmVyZWQ9IFtdO1xyXG5cclxuICAgICAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvdmVyYWdlW2tleV0gPT09IFwib2JqZWN0XCIpXHJcbiAgICAgICAgICAgICAgICB1bmNvdmVyZWRba2V5XSA9IGV4dHJhY3RVbmNvdmVyZWRQYXJ0cyhvYmplY3Rba2V5XSwgY292ZXJhZ2Vba2V5XSk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKCFjb3ZlcmFnZVtrZXldKVxyXG4gICAgICAgICAgICAgICAgdW5jb3ZlcmVkW2tleV0gPSBvYmplY3Rba2V5XTtcclxuICAgICAgICAgICAgaWYgKCh0eXBlb2YgdW5jb3ZlcmVkW2tleV0gPT09IFwib2JqZWN0XCIgJiYgT2JqZWN0LmtleXModW5jb3ZlcmVkW2tleV0pLmxlbmd0aCA9PT0gMCkgfHwgKEFycmF5LmlzQXJyYXkodW5jb3ZlcmVkW2tleV0pICYmIHVuY292ZXJlZFtrZXldLmxlbmd0aCA9PT0gMCkpXHJcbiAgICAgICAgICAgICAgICBkZWxldGUgdW5jb3ZlcmVkW2tleV07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVuY292ZXJlZDtcclxufVxyXG5cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgRXZhbHVhdGlvblJlc3VsdCA9IHJlcXVpcmUoXCIuL2V2YWx1YXRpb25fcmVzdWx0XCIpO1xyXG5cclxuZnVuY3Rpb24gRGVzY2VudEV4cHJlc3Npb24oKSB7fVxyXG5cclxuRGVzY2VudEV4cHJlc3Npb24ucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24gKGNvbnRleHQpIHtcclxuXHR2YXIgeCA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGNvbnRleHQuY3VycmVudC5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgIHJldHVybiByZXN1bHQuaXNEZWZpbmVkKCk7XHJcbiAgICB9KS5tYXAoZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICB2YXIgZGVzY2VuZGFudHMgPSBbXTtcclxuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LnZhbHVlKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgICAgIGRlc2NlbmRhbnRzLnB1c2gobmV3IEV2YWx1YXRpb25SZXN1bHQocmVzdWx0LCBrZXkpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiBkZXNjZW5kYW50cztcclxuXHR9KSk7XHJcbiAgICByZXR1cm4geDtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IERlc2NlbnRFeHByZXNzaW9uO1xyXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gIyBKUGF0aEVycm9yXHJcblxyXG4vLyBKUGF0aEVycm9yIHJlcHJlc2VudHMgdGhlIGJhc2UgY2xhc3Mgb2YgdGhlIGVycm9yIGhpZXJhcmNoeS5cclxuLy8gSXQgdGFrZXMgYSBwcmludGFibGUgbWVzc2FnZSBhbmQgYSBjb25zdHJ1Y3RvciB0byBidWlsZCBhIHN0YWNrIHRyYWNlLlxyXG4vLyBJdCBpbmhlcml0cyBmcm9tIG5vZGUncyBnZW5lcmljIEVycm9yIGNsYXNzIHRvIGFsbG93IGZvciBjYXRjaCBhbGwgaGFuZGxlcnMuXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIEpQYXRoRXJyb3IuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAdHlwZSBKUGF0aEVycm9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIEN1c3RvbSBlcnJvciBtZXNzYWdlIGZvciBsb2dnaW5nLlxyXG4gKi9cclxuZnVuY3Rpb24gSlBhdGhFcnJvcihtZXNzYWdlKSB7XHJcbiAgICBFcnJvci5jYWxsKHRoaXMpO1xyXG4gICAgaWYgKCFwcm9jZXNzLmJyb3dzZXIpXHJcbiAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XHJcbiAgICAvLyBJZiBubyBjdXN0b20gZXJyb3IgbWVzc2FnZSB3YXMgZGVmaW5lZCB1c2UgYSBnZW5lcmljIG9uZS5cclxuICAgIHRoaXMubWVzc2FnZSA9IChtZXNzYWdlICYmIG1lc3NhZ2UudG9TdHJpbmcoKSkgfHwgXCJKUGF0aCBFcnJvclwiO1xyXG59XHJcblxyXG4vLyBJbmhlcml0IHRoZSBkZWZhdWx0IEVycm9yIHByb3RvdHlwZS5cclxudXRpbC5pbmhlcml0cyhKUGF0aEVycm9yLCBFcnJvcik7XHJcblxyXG4vLyBTZXQgYSBuYW1lIGZvciB0aGUgZXJyb3IuXHJcbkpQYXRoRXJyb3IucHJvdG90eXBlLm5hbWUgPSBcIkpQYXRoIEVycm9yXCI7XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBKUGF0aEVycm9yO1xyXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpKSIsIi8vICMgUHJvcGVydHkgbmFtZSBlc2NhcGluZ1xyXG5cclxuLy8gSW4gYSBKUGF0aCB0aGUgY2hhcmFjdGVycyBgLywgWywgXSwgOiwgKmAgaGF2ZSBzcGVjaWFsIG1lYW5pbmdzLCBidXQgYXJlIHZhbGlkIEpTT04gcHJvcGVydHkgbmFtZXMuXHJcbi8vIElmIG9uZSB3YW50cyB0byBhY2Nlc3MgYSBwcm9wZXJ0eSB0aGF0IGNvbnRhaW5zIHN1Y2ggYSBjaGFyYWN0ZXIgdGhleSBoYXZlIHRvIGJlIGVzY2FwZWQuXHJcbi8vIEVzY2FwZSBzZXF1ZW5jZXMgc3RhcnQgd2l0aCBhIHRpbGRlLCBgfmAgZm9sbG93ZWQgYnkgYSBudW1iZXIgaW4gdGhlIHJhbmdlIFsxLCA1XS5cclxuLy8gVGhlIHNpbmdsZSB0aWxkZSBjaGFyYWN0ZXIgaXMgZXNjYXBlZCBhcyBhIGRvdWJsZSB0aWxkZS5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIEpQYXRoSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3IgPSByZXF1aXJlKFwiLi9pbnZhbGlkX2VzY2FwZV9zZXF1ZW5jZV9lcnJvclwiKTtcclxudmFyIHNlcGFyYXRvclRva2VuTWFwcGluZyA9IHJlcXVpcmUoXCIuL3NlcGFyYXRvcl90b2tlbl9tYXBwaW5nXCIpO1xyXG5cclxudmFyIGVzY2FwZVByZWZpeCA9IFwiflwiO1xyXG52YXIgY2hhcmFjdGVyRXNjYXBlU2VxdWVuY2VNYXAgPSB7fTtcclxudmFyIGVzY2FwZVNlcXVlbmNlQ2hhcmFjdGVyTWFwID0ge307XHJcbk9iamVjdC5rZXlzKHNlcGFyYXRvclRva2VuTWFwcGluZykuZm9yRWFjaChmdW5jdGlvbiAoY2hhcmFjdGVyKSB7XHJcblx0Y2hhcmFjdGVyRXNjYXBlU2VxdWVuY2VNYXBbY2hhcmFjdGVyXSA9IGVzY2FwZVByZWZpeCArIHNlcGFyYXRvclRva2VuTWFwcGluZ1tjaGFyYWN0ZXJdO1xyXG5cdGVzY2FwZVNlcXVlbmNlQ2hhcmFjdGVyTWFwW2VzY2FwZVByZWZpeCArIHNlcGFyYXRvclRva2VuTWFwcGluZ1tjaGFyYWN0ZXJdXSA9IGNoYXJhY3RlcjtcclxufSk7XHJcblxyXG5cclxuLyoqXHJcbiAqIEVzY2FwZXMgdGhlIGdpdmVuIHByb3BlcnR5IG5hbWUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eU5hbWUgVGhlIHByb3BlcnR5IG5hbWUgdG8gZXNjYXBlLlxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZXNjYXBlZCBwcm9wZXJ0eSBuYW1lLlxyXG4gKi9cclxuZnVuY3Rpb24gZXNjYXBlUHJvcGVydHlOYW1lKHByb3BlcnR5TmFtZSkge1xyXG4gICAgLy8gV2UgaXRlcmF0ZSBvdmVyIHRoZSBlc2NhcGUgc2VxdWVuY2UgdGFibGUgYW5kIHJlcGxhY2UgZXZlcnkgcmVzZXJ2ZWQgY2hhcmFjdGVyIGJ5IGl0cyBlc2NhcGUgc2VxdWVuY2UuXHJcbiAgICAvLyBJdCBpcyBpbXBvcnRhbnQgdGhhdCBhIHRpbGRlIGlzIGVzY2FwZWQgZmlyc3QhXHJcbiAgICAvLyBcIn5bXCIgc2hvdWxkIGJlIG1hcHBlZCB0byBcIn5+fjJcIi5cclxuICAgIC8vIElmIHdlIHdvdWxkIGRlY29kZSBcIn4gflwiIGxhc3QsIHRoaXMgd291bGQgYmUgZGVjb2RlZCBpbnRvIFwifn4yXCIgdGhlbiBpbnRvIFwifn5+fjJcIixcclxuICAgIC8vIGJlY2F1c2Ugb2YgdGhlIGdsb2JhbCByZWdleCBiYXNlZCByZXBsYWNlLlxyXG4gICAgLy8gV2UgaGF2ZSB0byB3cmFwIHRoZSByZXNlcnZlZENoYXJhY3RlciBpbnRvIGJyYWNrZXRzIHRvIGVzY2FwZSBub24gdmFsaWQgcmVndWxhciBleHByZXNzaW9uIGNoYXJhY3RlcnMuXHJcbiAgICAvLyBXZSBhbHNvIGhhdmUgdXNlIGEgZG91YmxlIGJhY2tzbGFzaCBiZWNhdXNlIG9mIHRoZSBgXWAgY2hhcmFjdGVyLlxyXG5cdHZhciBlc2NhcGVkUHJvcGVydHlOYW1lID0gcHJvcGVydHlOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cChlc2NhcGVQcmVmaXgsIFwiZ1wiKSwgZXNjYXBlUHJlZml4ICsgZXNjYXBlUHJlZml4KTtcclxuXHRyZXR1cm4gT2JqZWN0LmtleXMoY2hhcmFjdGVyRXNjYXBlU2VxdWVuY2VNYXApLnJlZHVjZShmdW5jdGlvbiAocHJvcGVydHlOYW1lLCBjaGFyYWN0ZXIpIHtcclxuXHRcdHJldHVybiBwcm9wZXJ0eU5hbWUucmVwbGFjZShuZXcgUmVnRXhwKFwiW1xcXFxcIiArIGNoYXJhY3RlciArIFwiXVwiLCBcImdcIiksIGNoYXJhY3RlckVzY2FwZVNlcXVlbmNlTWFwW2NoYXJhY3Rlcl0pO1xyXG5cdH0sIGVzY2FwZWRQcm9wZXJ0eU5hbWUpO1xyXG59XHJcblxyXG4vKipcclxuICogVW5lc2NhcGVzIGEgZ2l2ZW4gcHJvcGVydHkgbmFtZS5cclxuICpcclxuICogQHB1YmxpY1xyXG4gKiBAZnVuY3Rpb24gdW5lc2NhcGVQcm9wZXJ0eU5hbWVcclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IGVzY2FwZWRQcm9wZXJ0eU5hbWUgVGhlIHByb3BlcnR5IG5hbWUgdG8gdW5lc2NhcGUuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB1bmVzY2FwZWQgcHJvcGVydHkgbmFtZS5cclxuICogQHRocm93cyB7SlBhdGhJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvcn0gaWYgZXNjYXBlZFByb3BlcnR5TmFtZSBjb250YWlucyBhbiBpbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZSxcclxuICogZS5nLiBhIHRpbGRlIGZvbGxvd2VkIGJ5IGEgbnVtYmVyIG5vdCBpbiB0aGUgdmFsaWQgcmFuZ2UgWzEsIDVdLlxyXG4gKi9cclxuZnVuY3Rpb24gdW5lc2NhcGVQcm9wZXJ0eU5hbWUoZXNjYXBlZFByb3BlcnR5TmFtZSkge1xyXG4gICAgLy8gV2UgaXRlcmF0ZSBvdmVyIHRoZSBlc2NhcGVkUHJvcGVydHlOYW1lIGNoYXJhY3RlciBieSBjaGFyYWN0ZXIgYW5kIG1hcCBldmVyeSBlc2NhcGUgc2VxdWVuY2UgYmFjayB0byB0aGVpciBvcmlnaW5hbCB2YWx1ZS5cclxuICAgIHZhciB1bmVzY2FwZWRDaGFyYWN0ZXJzID0gW107XHJcbiAgICB2YXIgZGVjb2RlZENoYXIgPVwiXCI7XHJcbiAgICB2YXIgaWR4ID0gMDtcclxuXHR2YXIgZXNjYXBlU2VxdWVuY2VzID0gT2JqZWN0LmtleXMoZXNjYXBlU2VxdWVuY2VDaGFyYWN0ZXJNYXApO1xyXG4gICAgd2hpbGUgKGlkeCA8IGVzY2FwZWRQcm9wZXJ0eU5hbWUubGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRDaGFyID0gZXNjYXBlZFByb3BlcnR5TmFtZVtpZHhdO1xyXG4gICAgICAgIGlmIChjdXJyZW50Q2hhciA9PT0gZXNjYXBlUHJlZml4KSB7XHJcbiAgICAgICAgICAgIHZhciBuZXh0Q2hhciA9IGVzY2FwZWRQcm9wZXJ0eU5hbWVbaWR4ICsgMV07XHJcblxyXG4gICAgICAgICAgICAvLyBBIHNpbmdsZSBgfmAgb3IgYSBgfmAgZm9sbG93ZWQgYnkgYSBudW1iZXIgZ3JlYXRlciBvdXRzaWRlIHRoZSBpbnRlcnZhbCBbMSwgT2JqZWN0LmtleXMoY2hhcmFjdGVyRXNjYXBlU2VxdWVuY2VNYXApLmxlbmd0aF1cclxuICAgICAgICAgICAgLy8gY2FuIG5ldmVyIG9jY3VyIGluIGEgd2VsbCBlc2NhcGVkIHByb3BlcnR5IG5hbWUuXHJcbiAgICAgICAgICAgIHZhciBuID0gcGFyc2VJbnQobmV4dENoYXIsIDEwKTtcclxuICAgICAgICAgICAgaWYgKG5leHRDaGFyICE9PSBlc2NhcGVQcmVmaXggJiYgKGlzTmFOKG4pIHx8ICFpc0Zpbml0ZShuKSB8fCBuIDwgMCB8fCBuID4gZXNjYXBlU2VxdWVuY2VzLmxlbmd0aCkpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgSlBhdGhJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvcihlc2NhcGVQcmVmaXggKyBuZXh0Q2hhciwgZXNjYXBlU2VxdWVuY2VzKTtcclxuXHJcblx0XHRcdGlmIChuZXh0Q2hhciA9PT0gZXNjYXBlUHJlZml4KVxyXG5cdFx0XHRcdGRlY29kZWRDaGFyID0gZXNjYXBlUHJlZml4O1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0ZGVjb2RlZENoYXIgPSBlc2NhcGVTZXF1ZW5jZUNoYXJhY3Rlck1hcFtlc2NhcGVQcmVmaXggKyBuZXh0Q2hhcl07XHJcblxyXG4gICAgICAgICAgICAvLyBTa2lwIGJ5IHR3byB0byBub3QgZGVjb2RlIH5+MSBpbnRvIH4vLlxyXG4gICAgICAgICAgICBpZHggKz0gMjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkZWNvZGVkQ2hhciA9IGN1cnJlbnRDaGFyO1xyXG4gICAgICAgICAgICArK2lkeDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdW5lc2NhcGVkQ2hhcmFjdGVycy5wdXNoKGRlY29kZWRDaGFyKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdW5lc2NhcGVkQ2hhcmFjdGVycy5qb2luKFwiXCIpO1xyXG59XHJcblxyXG5leHBvcnRzLmVzY2FwZVByb3BlcnR5TmFtZSA9IGVzY2FwZVByb3BlcnR5TmFtZTtcclxuZXhwb3J0cy51bmVzY2FwZVByb3BlcnR5TmFtZSA9IHVuZXNjYXBlUHJvcGVydHlOYW1lO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBjb21waWxlID0gcmVxdWlyZShcIi4vY29tcGlsaW5nXCIpO1xyXG52YXIgQ29udGV4dCA9IHJlcXVpcmUoXCIuL2NvbnRleHRcIik7XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGF0aCwgb2JqZWN0KSB7XHJcblx0dmFyIHBhdGhFeHByZXNzaW9uID0gY29tcGlsZShwYXRoKTtcclxuICAgIHJldHVybiBhdWdtZW50QXJyYXkocGF0aEV4cHJlc3Npb24uZXZhbHVhdGUobmV3IENvbnRleHQob2JqZWN0KSkpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gYXVnbWVudEFycmF5KGFycmF5KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhhcnJheSwge1xyXG4gICAgICAgIGRlZmluZWRSZXN1bHRzOiB7XHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LmlzRGVmaW5lZCgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHZhbHVlczoge1xyXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlZmluZWRSZXN1bHRzLm1hcChmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwYXRoczoge1xyXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlZmluZWRSZXN1bHRzLm1hcChmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5wYXRoO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBhcnJheTtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBqb2luID0gcmVxdWlyZShcIi4vam9pbmluZ1wiKTtcclxuXHJcbmZ1bmN0aW9uIEV2YWx1YXRpb25SZXN1bHQocGFyZW50LCBwcm9wZXJ0eU5hbWUsIGlzQXJyYXlBY2Nlc3MpIHtcclxuICAgIGlmICghKHBhcmVudCBpbnN0YW5jZW9mIEV2YWx1YXRpb25SZXN1bHQpKSB7XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwidmFsdWVcIiwge1xyXG4gICAgICAgICAgICB2YWx1ZTogcGFyZW50LFxyXG4gICAgICAgICAgICB3cml0YWJsZTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImlzUm9vdFwiLCB7XHJcbiAgICAgICAgICAgIHZhbHVlOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xyXG4gICAgfVxyXG5cclxuXHR0aGlzLl9wcm9wZXJ0eU5hbWUgPSB0eXBlb2YgcHJvcGVydHlOYW1lICE9PSBcInVuZGVmaW5lZFwiID8gcHJvcGVydHlOYW1lIDogXCJcIjtcclxuICAgIHRoaXMuX2lzQXJyYXlBY2Nlc3MgPSBpc0FycmF5QWNjZXNzO1xyXG59XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhFdmFsdWF0aW9uUmVzdWx0LnByb3RvdHlwZSwge1xyXG5cdHZhbHVlOiB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9wYXJlbnQudmFsdWUgIT09IFwidW5kZWZpbmVkXCIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGFyZW50LnZhbHVlW3RoaXMuX3Byb3BlcnR5TmFtZV07XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9wYXJlbnQudmFsdWUpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wYXJlbnQudmFsdWUgPSB0aGlzLl9pc0FycmF5QWNjZXNzID8gW10gOiB7fTtcclxuXHRcdFx0dGhpcy5fcGFyZW50LnZhbHVlW3RoaXMuX3Byb3BlcnR5TmFtZV0gPSB2YWx1ZTtcclxuXHRcdH1cclxuXHR9LFxyXG4gICAgcGF0aDoge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9wYXJlbnQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gam9pbih0aGlzLl9wYXJlbnQucGF0aCwgdGhpcy5fcHJvcGVydHlOYW1lLCB0aGlzLl9pc0FycmF5QWNjZXNzKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Byb3BlcnR5TmFtZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuRXZhbHVhdGlvblJlc3VsdC5wcm90b3R5cGUuaXNEZWZpbmVkID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiB0eXBlb2YgdGhpcy52YWx1ZSAhPT0gXCJ1bmRlZmluZWRcIjtcclxufTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEV2YWx1YXRpb25SZXN1bHQ7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGVzY2FwaW5nID0gcmVxdWlyZShcIi4vZXNjYXBpbmdcIik7XHJcbmV4cG9ydHMuZXNjYXBlUHJvcGVydHlOYW1lID0gZXNjYXBpbmcuZXNjYXBlUHJvcGVydHlOYW1lO1xyXG5leHBvcnRzLnVuZXNjYXBlUHJvcGVydHlOYW1lID0gZXNjYXBpbmcudW5lc2NhcGVQcm9wZXJ0eU5hbWU7XHJcbmV4cG9ydHMuSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3IgPSByZXF1aXJlKFwiLi9pbnZhbGlkX2VzY2FwZV9zZXF1ZW5jZV9lcnJvclwiKTtcclxuZXhwb3J0cy5zZXBhcnRvclRva2VuTWFwcGluZyA9IHJlcXVpcmUoXCIuL3NlcGFyYXRvcl90b2tlbl9tYXBwaW5nXCIpO1xyXG5cclxuZXhwb3J0cy5Ub2tlbiA9IHJlcXVpcmUoXCIuL3Rva2VuXCIpO1xyXG5leHBvcnRzLnRva2VuaXplID0gcmVxdWlyZShcIi4vbGV4aW5nXCIpO1xyXG5leHBvcnRzLmpvaW4gPSByZXF1aXJlKFwiLi9qb2luaW5nXCIpO1xyXG5cclxuZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoXCIuL3BhcnNpbmdcIik7XHJcbmV4cG9ydHMuUGFyc2luZ0Vycm9yID0gcmVxdWlyZShcIi4vcGFyc2luZ19lcnJvclwiKTtcclxuXHJcbmV4cG9ydHMuQ29uc3RhbnRWYWx1ZUV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9jb25zdGFudF92YWx1ZV9leHByZXNzaW9uXCIpO1xyXG5leHBvcnRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL3Byb3BlcnR5X2FjY2Vzc19leHByZXNzaW9uXCIpO1xyXG5leHBvcnRzLlJhbmdlRXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL3JhbmdlX2V4cHJlc3Npb25cIik7XHJcbmV4cG9ydHMuRGVzY2VudEV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9kZXNjZW50X2V4cHJlc3Npb25cIik7XHJcbmV4cG9ydHMuUmVjdXJzaXZlRGVzY2VudEV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9yZWN1cnNpdmVfZGVzY2VudF9leHByZXNzaW9uXCIpO1xyXG5leHBvcnRzLlBhdGhFeHByZXNzaW9uID0gcmVxdWlyZShcIi4vcGF0aF9leHByZXNzaW9uXCIpO1xyXG5cclxuZXhwb3J0cy5ldmFsdWF0ZSA9IHJlcXVpcmUoXCIuL2V2YWx1YXRpb25cIik7XHJcblxyXG5leHBvcnRzLmV4dHJhY3RVbmNvdmVyZWRQYXJ0cyA9IHJlcXVpcmUoXCIuL2NvdmVyYWdlXCIpO1xyXG4iLCIvLyAjIEludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yXHJcblxyXG4vLyBUaGlzIGNsYXNzIGlzIG9ubHkgdXNlZCBpbnRlcm5hbGx5LlxyXG4vLyBJdCBpcyB0aGUgZXJyb3IgdGhhdCBpcyB0aHJvd24gYnkgdGhlIGB1bmVzY2FwZWAgZnVuY3Rpb24sIGlmIGFuIGludmFsaWQgZXNjYXBlIHNlcXVlbmNlIGlzIGZvdW5kLlxyXG4vLyBJdCBzaG91bGQgYmUgY2F0Y2hlZCBhbiByZXRocm93biBhcyBhIHN5bnRheCBlcnJvcnMgdG8gY2FycnkgbW9yZSBpbmZvcm1hdGlvbi5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxuXHJcbnZhciBKUGF0aEVycm9yID0gcmVxdWlyZShcIi4vZXJyb3JcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhbiBJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvci5cclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IGludmFsaWRTZXF1ZW5jZSBUaGUgc2VxdWVuY2UgdGhhdCBpcyBpbnZhbGlkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydElkeCBUaGUgc3RhcnQgaW5kZXggb2YgdGhlIGludmFsaWQgc2VxdWVuY2UgaW5zaWRlIHRoZSBzdHJpbmcuXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3IoaW52YWxpZFNlcXVlbmNlLCBleHBlY3RlZCkge1xyXG4gICAgSlBhdGhFcnJvci5jYWxsKHRoaXMsIFwiSW52YWxpZCBlc2NhcGUgc2VxdWVuY2UgZm91bmQ6IFwiICsgaW52YWxpZFNlcXVlbmNlKTtcclxuICAgIHRoaXMuaW52YWxpZFNlcXVlbmNlID0gaW52YWxpZFNlcXVlbmNlO1xyXG4gICAgdGhpcy5leHBlY3RlZCA9IGV4cGVjdGVkO1xyXG59XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBJbnZhbGlkRXNjYXBlU2VxdWVuY2VFcnJvcjtcclxuXHJcbnV0aWwuaW5oZXJpdHMoSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3IsIEpQYXRoRXJyb3IpO1xyXG5cclxuSW52YWxpZEVzY2FwZVNlcXVlbmNlRXJyb3IucHJvdG90eXBlLm5hbWUgPSBcIkludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yXCI7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkLCBpc0FycmF5SW5kZXgpIHtcclxuICAgIGlmIChpc0FycmF5SW5kZXgpXHJcbiAgICAgICAgY2hpbGQgPSBcIltcIiArIGNoaWxkICsgXCJdXCI7XHJcblxyXG4gICAgcmV0dXJuIHBhdGguam9pbihwYXJlbnQsIGNoaWxkKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgdW5lc2NhcGVQcm9wZXJ0eU5hbWUgPSByZXF1aXJlKFwiLi9lc2NhcGluZ1wiKS51bmVzY2FwZVByb3BlcnR5TmFtZTtcclxudmFyIEludmFsaWRFc2NhcGVTZXF1ZW5jZUVycm9yID0gcmVxdWlyZShcIi4vaW52YWxpZF9lc2NhcGVfc2VxdWVuY2VfZXJyb3JcIik7XHJcbnZhciBKUGF0aFN5bnRheEVycm9yID0gcmVxdWlyZShcIi4vc3ludGF4X2Vycm9yXCIpO1xyXG52YXIgVG9rZW4gPSByZXF1aXJlKFwiLi90b2tlblwiKTtcclxudmFyIHNlcGFyYXRvclRva2VuTWFwcGluZyA9IHJlcXVpcmUoXCIuL3NlcGFyYXRvcl90b2tlbl9tYXBwaW5nXCIpO1xyXG5cclxuLy8gVG9rZW5pemVzIHRoZSBnaXZlbiBwYXRoRXhwcmVzc2lvbiByZXR1cm5pbmcgYW4gYXJyYXkgb2YgdG9rZW5zIHJlcHJlc2VudGluZyB0aGUgdG9rZW4gc3RyZWFtLlxyXG5mdW5jdGlvbiB0b2tlbml6ZShwYXRoRXhwcmVzc2lvbikge1xyXG4gICAgaWYgKHBhdGhFeHByZXNzaW9uLmxlbmd0aCA9PT0gMClcclxuICAgICAgICBwYXRoRXhwcmVzc2lvbiA9IFwiL1wiO1xyXG5cclxuICAgIHZhciB0b2tlblN0cmVhbSA9IFtdO1xyXG4gICAgdmFyIGN1cnJlbnRDaGFySWR4ID0gMDtcclxuICAgIHdoaWxlIChjdXJyZW50Q2hhcklkeCA8IHBhdGhFeHByZXNzaW9uLmxlbmd0aCl7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRDaGFyID0gcGF0aEV4cHJlc3Npb25bY3VycmVudENoYXJJZHhdO1xyXG5cdFx0aWYgKGlzVG9rZW5TZXBhcmF0aW9uQ2hhcmFjdGVyKGN1cnJlbnRDaGFyKSkge1xyXG5cdFx0XHR0b2tlblN0cmVhbS5wdXNoKG5ldyBUb2tlbih0b2tlbkZvclNlcGFyYXRpb25DaGFyYWN0ZXIoY3VycmVudENoYXIpLCBjdXJyZW50Q2hhcklkeCwgY3VycmVudENoYXJJZHggKyAxLCBjdXJyZW50Q2hhcikpO1xyXG5cdFx0XHQrK2N1cnJlbnRDaGFySWR4O1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gbGl0ZXJhbFxyXG5cdFx0XHQvLyBSZWFkICd0aWxsIGZpcnN0IHNwZWNpYWwgY2hhcmFjdGVyXHJcblx0XHRcdHZhciBsaXRlcmFsID0gXCJcIjtcclxuXHRcdFx0dmFyIGxpdGVyYWxTdGFydElkeCA9IGN1cnJlbnRDaGFySWR4O1xyXG5cdFx0XHRkbyB7XHJcblx0XHRcdFx0bGl0ZXJhbCArPSBjdXJyZW50Q2hhcjtcclxuXHRcdFx0XHQrK2N1cnJlbnRDaGFySWR4O1xyXG5cdFx0XHRcdGN1cnJlbnRDaGFyID0gcGF0aEV4cHJlc3Npb25bY3VycmVudENoYXJJZHhdO1xyXG5cdFx0XHR9IHdoaWxlIChjdXJyZW50Q2hhcklkeCA8IHBhdGhFeHByZXNzaW9uLmxlbmd0aCAmJiAhaXNUb2tlblNlcGFyYXRpb25DaGFyYWN0ZXIoY3VycmVudENoYXIpKTtcclxuXHJcblx0XHRcdHRva2VuU3RyZWFtLnB1c2gobmV3IFRva2VuKFRva2VuLnR5cGVzLmxpdGVyYWwsIGxpdGVyYWxTdGFydElkeCwgY3VycmVudENoYXJJZHgsIHVuZXNjYXBlUHJvcGVydHlOYW1lKGxpdGVyYWwpKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRva2VuU3RyZWFtLnB1c2gobmV3IFRva2VuKFRva2VuLnR5cGVzLmVvdCwgY3VycmVudENoYXJJZHgsIGN1cnJlbnRDaGFySWR4KSk7XHJcbiAgICByZXR1cm4gdG9rZW5TdHJlYW07XHJcbn1cclxuXHJcbnZhciB0b2tlblNlcGFyYXRpb25DaGFyYWN0ZXJzID0gT2JqZWN0LmtleXMoc2VwYXJhdG9yVG9rZW5NYXBwaW5nKTtcclxuXHJcbmZ1bmN0aW9uIGlzVG9rZW5TZXBhcmF0aW9uQ2hhcmFjdGVyKGNoYXIpIHtcclxuXHRyZXR1cm4gdG9rZW5TZXBhcmF0aW9uQ2hhcmFjdGVycy5pbmRleE9mKGNoYXIpICE9PSAtMTtcclxufVxyXG5cclxuZnVuY3Rpb24gdG9rZW5Gb3JTZXBhcmF0aW9uQ2hhcmFjdGVyKGNoYXIpIHtcclxuXHRyZXR1cm4gc2VwYXJhdG9yVG9rZW5NYXBwaW5nW2NoYXJdO1xyXG59XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB0b2tlbml6ZTtcclxuIiwiLy8gIyBQYXJzaW5nXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBUb2tlbiA9IHJlcXVpcmUoXCIuL3Rva2VuXCIpO1xyXG52YXIgSlBhdGhQYXJzaW5nRXJyb3IgPSByZXF1aXJlKFwiLi9wYXJzaW5nX2Vycm9yXCIpO1xyXG5cclxudmFyIENvbnN0YW50VmFsdWVFeHByZXNzaW9uID0gcmVxdWlyZShcIi4vY29uc3RhbnRfdmFsdWVfZXhwcmVzc2lvblwiKTtcclxudmFyIFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL3Byb3BlcnR5X2FjY2Vzc19leHByZXNzaW9uXCIpO1xyXG52YXIgUGF0aEV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9wYXRoX2V4cHJlc3Npb25cIik7XHJcbnZhciBSYW5nZUV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9yYW5nZV9leHByZXNzaW9uXCIpO1xyXG52YXIgRGVzY2VudEV4cHJlc3Npb24gPSByZXF1aXJlKFwiLi9kZXNjZW50X2V4cHJlc3Npb25cIik7XHJcbnZhciBSZWN1cnNpdmVEZXNjZW50RXhwcmVzc2lvbiA9IHJlcXVpcmUoXCIuL3JlY3Vyc2l2ZV9kZXNjZW50X2V4cHJlc3Npb25cIik7XHJcblxyXG4vKipcclxuICogUGFyc2VzIHRoZSBnaXZlbiB0b2tlbiBzdHJlYW0uXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICogQGZ1bmN0aW9uIHBhcnNlXHJcbiAqXHJcbiAqIEBwYXJhbSB7VG9rZW5bXX0gdG9rZW5TdHJlYW0gVGhlIHRva2VuIHN0cmVhbSB0aGF0IHNob3VsZCBiZSBwYXJzZWQuXHJcbiAqIEByZXR1cm5zIHtQYXRoRXhwcmVzc2lvbn0gVGhlIHBhcnNlZCBwYXRoIGV4cHJlc3Npb24uXHJcbiAqIEB0aHJvd3Mge0pQYXRoU3ludGF4RXJyb3J9IGlmIHRoZSBnaXZlbiB0b2tlbiBzdHJlYW0gY29udGFpbnMgYW55IHN5bnRhY3RpY2FsIGVycm9ycy5cclxuICovXHJcbmZ1bmN0aW9uIHBhcnNlKHRva2VuU3RyZWFtKSB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRva2VuU3RyZWFtLCBcImZyb250XCIsIHtcclxuXHRcdGdldDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpc1swXTtcclxuXHRcdH1cclxuXHR9KTtcclxuICAgIHZhciBleHByZXNzaW9uID0gcGFyc2VQYXRoRXhwcmVzc2lvbih0b2tlblN0cmVhbSk7XHJcblxyXG4gICAgaWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgIT09IFRva2VuLnR5cGVzLmVvdClcclxuICAgICAgICB0aHJvdyBuZXcgSlBhdGhQYXJzaW5nRXJyb3IoSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy51bmV4cGVjdGVkVG9rZW4sXHJcbiAgICAgICAgICAgIHRva2VuU3RyZWFtLmZyb250LnN0YXJ0SWR4LFxyXG4gICAgICAgICAgICB0b2tlblN0cmVhbS5mcm9udC5lbmRJZHgsXHJcbiAgICAgICAgICAgIFRva2VuLnR5cGVzLmVvdCk7XHJcblxyXG4gICAgcmV0dXJuIGV4cHJlc3Npb247XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlUGF0aEV4cHJlc3Npb24odG9rZW5TdHJlYW0pIHtcclxuXHR2YXIgZXhwcmVzc2lvbnMgPSBbXTtcclxuXHR2YXIgaXNBYnNvbHV0ZVBhdGggPSBmYWxzZTtcclxuXHJcblx0Ly8gSWYgd2UgaGF2ZSBhIHNlcGFyYXRvciB0aGlzIGlzIGEgYWJzb2x1dGUgcGF0aCBleHByZXNzaW9uLlxyXG5cdGlmICh0b2tlblN0cmVhbS5mcm9udC50eXBlID09PSBUb2tlbi50eXBlcy5zZXBhcmF0b3IpIHtcclxuXHRcdGlzQWJzb2x1dGVQYXRoID0gdHJ1ZTtcclxuXHRcdHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblx0fVxyXG5cclxuXHRkbyB7XHJcblx0XHQvLyBDb25zdW1lIHN1cGVyZmx1b3VzIHNlcGFyYXRvciB0b2tlbnMuXHJcblx0XHR3aGlsZSAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSA9PT0gVG9rZW4udHlwZXMuc2VwYXJhdG9yKVxyXG5cdFx0XHR0b2tlblN0cmVhbS5zaGlmdCgpO1xyXG5cclxuXHRcdGlmICh0b2tlblN0cmVhbS5mcm9udC50eXBlID09PSBUb2tlbi50eXBlcy5lb3QpXHJcblx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdC8vIFBhcnNlIHBhdGggY29tcG9uZW50cyBhcyBsb25nIGFzIHRoZSBuZXh0IHRva2VuIGFmdGVyd2FyZHMgaXMgYSBzZXBhcmF0b3IuXHJcblx0XHRleHByZXNzaW9ucy5wdXNoKHBhcnNlUGF0aENvbXBvbmVudCh0b2tlblN0cmVhbSkpO1xyXG5cdH0gd2hpbGUgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgPT09IFRva2VuLnR5cGVzLnNlcGFyYXRvcik7XHJcblxyXG5cdHJldHVybiBuZXcgUGF0aEV4cHJlc3Npb24oZXhwcmVzc2lvbnMsIGlzQWJzb2x1dGVQYXRoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VQYXRoQ29tcG9uZW50KHRva2VuU3RyZWFtKSB7XHJcblx0aWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgPT09IFRva2VuLnR5cGVzLmFzdGVyaXNrKVxyXG5cdFx0cmV0dXJuIHBhcnNlRGVzY2VudEV4cHJlc3Npb24odG9rZW5TdHJlYW0pO1xyXG5cclxuXHRpZiAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSA9PT0gVG9rZW4udHlwZXMub3BlbkJyYWNrZXQpXHJcblx0XHRyZXR1cm4gcGFyc2VBcnJheUFjY2Vzc0V4cHJlc3Npb24odG9rZW5TdHJlYW0pO1xyXG5cclxuXHRyZXR1cm4gbmV3IFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihwYXJzZVByb3BlcnR5TmFtZUV4cHJlc3Npb24odG9rZW5TdHJlYW0pKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VEZXNjZW50RXhwcmVzc2lvbih0b2tlblN0cmVhbSkge1xyXG5cdHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblx0aWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgIT09IFRva2VuLnR5cGVzLmFzdGVyaXNrKVxyXG5cdFx0cmV0dXJuIG5ldyBEZXNjZW50RXhwcmVzc2lvbigpO1xyXG5cclxuXHR0b2tlblN0cmVhbS5zaGlmdCgpO1xyXG5cdHJldHVybiBuZXcgUmVjdXJzaXZlRGVzY2VudEV4cHJlc3Npb24oKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VQcm9wZXJ0eU5hbWVFeHByZXNzaW9uKHRva2VuU3RyZWFtKSB7XHJcblx0dmFyIGxlZnQgPSBwYXJzZU5hbWVFeHByZXNzaW9uKHRva2VuU3RyZWFtKTtcclxuXHRpZiAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSA9PT0gVG9rZW4udHlwZXMuY29sb24pXHJcblx0XHRyZXR1cm4gcGFyc2VSYW5nZUV4cHJlc3Npb24obGVmdCwgdG9rZW5TdHJlYW0pO1xyXG5cclxuXHRyZXR1cm4gbGVmdDtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VOYW1lRXhwcmVzc2lvbih0b2tlblN0cmVhbSkge1xyXG5cdGlmICh0b2tlblN0cmVhbS5mcm9udC50eXBlID09PSBUb2tlbi50eXBlcy5saXRlcmFsKVxyXG5cdFx0cmV0dXJuIHBhcnNlTGl0ZXJhbCh0b2tlblN0cmVhbSk7XHJcblx0ZWxzZSBpZiAodG9rZW5TdHJlYW0uZnJvbnQudHlwZSA9PT0gVG9rZW4udHlwZXMub3BlblBhcmVudGhlc2VzKVxyXG5cdFx0cmV0dXJuIHBhcnNlU3ViRXhwcmVzc2lvbih0b2tlblN0cmVhbSk7XHJcblx0ZWxzZVxyXG5cdFx0dGhyb3cgbmV3IEpQYXRoUGFyc2luZ0Vycm9yKEpQYXRoUGFyc2luZ0Vycm9yLnJlYXNvbnMudW5leHBlY3RlZFRva2VuLFxyXG5cdFx0XHR0b2tlblN0cmVhbS5mcm9udC5zdGFydElkeCxcclxuXHRcdFx0dG9rZW5TdHJlYW0uZnJvbnQuZW5kSWR4LFxyXG5cdFx0XHRbVG9rZW4udHlwZXMubGl0ZXJhbCwgVG9rZW4udHlwZXMub3BlblBhcmVudGhlc2VzXSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlTGl0ZXJhbCh0b2tlblN0cmVhbSkge1xyXG5cdHJldHVybiBuZXcgQ29uc3RhbnRWYWx1ZUV4cHJlc3Npb24odG9rZW5TdHJlYW0uc2hpZnQoKS52YWx1ZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlU3ViRXhwcmVzc2lvbih0b2tlblN0cmVhbSkge1xyXG5cdHZhciBvcGVuUGFyZW50aGVzZXNUb2tlbiA9IHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblxyXG4gICAgdmFyIGV4cHJlc3Npb24gPSBwYXJzZVBhdGhFeHByZXNzaW9uKHRva2VuU3RyZWFtKTtcclxuXHJcblx0aWYgKHRva2VuU3RyZWFtLmZyb250LnR5cGUgIT09IFRva2VuLnR5cGVzLmNsb3NlUGFyZW50aGVzZXMpXHJcblx0XHR0aHJvdyBuZXcgSlBhdGhQYXJzaW5nRXJyb3IoSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy5taXNzaW5nQ2xvc2luZ1BhcmVudGhlc2VzLFxyXG5cdFx0XHRvcGVuUGFyZW50aGVzZXNUb2tlbi5zdGFydElkeCxcclxuXHRcdFx0dG9rZW5TdHJlYW0uZnJvbnQuc3RhcnRJZHgsXHJcblx0XHRcdFRva2VuLnR5cGVzLmNsb3NlUGFyZW50aGVzZXMpO1xyXG5cclxuXHR0b2tlblN0cmVhbS5zaGlmdCgpO1xyXG5cdHJldHVybiBleHByZXNzaW9uO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZVJhbmdlRXhwcmVzc2lvbihsZWZ0LCB0b2tlblN0cmVhbSkge1xyXG5cdHRva2VuU3RyZWFtLnNoaWZ0KCk7XHJcblx0dmFyIHJpZ2h0ID0gcGFyc2VOYW1lRXhwcmVzc2lvbih0b2tlblN0cmVhbSk7XHJcblx0cmV0dXJuIG5ldyBSYW5nZUV4cHJlc3Npb24obGVmdCwgcmlnaHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZUFycmF5QWNjZXNzRXhwcmVzc2lvbih0b2tlblN0cmVhbSkge1xyXG5cdHZhciBvcGVuQnJhY2tldFRva2VuID0gdG9rZW5TdHJlYW0uc2hpZnQoKTtcclxuXHJcbiAgICB2YXIgZXhwcmVzc2lvbiA9IG5ldyBQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocGFyc2VQcm9wZXJ0eU5hbWVFeHByZXNzaW9uKHRva2VuU3RyZWFtKSwgdHJ1ZSk7XHJcblxyXG5cdGlmICh0b2tlblN0cmVhbS5mcm9udC50eXBlICE9PSBUb2tlbi50eXBlcy5jbG9zZUJyYWNrZXQpXHJcblx0XHR0aHJvdyBuZXcgSlBhdGhQYXJzaW5nRXJyb3IoSlBhdGhQYXJzaW5nRXJyb3IucmVhc29ucy5taXNzaW5nQ2xvc2luZ0JyYWNrZXQsXHJcblx0XHRcdG9wZW5CcmFja2V0VG9rZW4uc3RhcnRJZHgsXHJcblx0XHRcdHRva2VuU3RyZWFtLmZyb250LnN0YXJ0SWR4LFxyXG5cdFx0XHRUb2tlbi50eXBlcy5jbG9zZUJyYWNrZXQpO1xyXG5cclxuXHR0b2tlblN0cmVhbS5zaGlmdCgpO1xyXG5cdHJldHVybiBleHByZXNzaW9uO1xyXG59XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBwYXJzZTtcclxuIiwiLy8gIyBKUGF0aFN5bnRheEVycm9yXHJcblxyXG4vLyBUaGlzIGNsYXNzIHJlcHJlc2VudHMgc3ludGFjdGljIGVycm9ycyBpbiBhIEpQYXRoLlxyXG4vLyBTeW50YWN0aWMgZXJyb3JzIGluY2x1ZGUgdW5iYWxhbmNlZCBicmFja2V0cywgaW52YWxpZCBlc2NhcGUgc2VxdWVuY2VzIG9yIGludmFsaWQgZXhwcmVzc2lvbnMgaW4gZ2VuZXJhbC5cclxuLy8gQXMgYWxsIGVycm9ycyBpdCBpbmhlcml0cyBmcm9tIHRoZSBnZW5lcmFsIEpQYXRoIGVycm9yLlxyXG4vLyBUaGUgcmVhc29uIGZvciB0aGUgc3ludGF4IGVycm9yIHNob3VsZCBiZSBvbmUgb2YgdGhlIGNvbnN0YW50cyBkZWZpbmVkIGJlbG93LlxyXG4vLyBUaGUgc3RhcnQgYW5kIGVuZCBpbmRleCBzaG91bGQgYmUgY2hvc2VuIHN1Y2ggdGhhdCBhIHN1YnN0cmluZyBjYWxsIHdpdGggdGhvc2UgaW5kaWNlcyBvbiB0aGUgaW5wdXQgc3RyaW5nIHJlc3VsdHNcclxuLy8gaW4gdGhhdCBwYXJ0IG9mIHRoZSBzdHJpbmcgdGhhdCBpcyByZXNwb25zaWJsZSBmb3IgdGhlIHN5bnRheCBlcnJvci5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxuXHJcbnZhciBKUGF0aEVycm9yID0gcmVxdWlyZShcIi4vZXJyb3JcIik7XHJcblxyXG5mdW5jdGlvbiBKUGF0aFBhcnNpbmdFcnJvcihyZWFzb24sIHN0YXJ0SWR4LCBlbmRJZHgsIGV4cGVjdGVkVG9rZW5zKSB7XHJcbiAgICBKUGF0aEVycm9yLmNhbGwodGhpcywgXCJQYXJzaW5nIEVycm9yXCIpO1xyXG4gICAgdGhpcy5yZWFzb24gPSByZWFzb247XHJcbiAgICB0aGlzLnN0YXJ0SWR4ID0gc3RhcnRJZHg7XHJcbiAgICB0aGlzLmVuZElkeCA9IGVuZElkeDtcclxuICAgIHRoaXMuZXhwZWN0ZWRUb2tlbnMgPSBBcnJheS5pc0FycmF5KGV4cGVjdGVkVG9rZW5zKSA/IGV4cGVjdGVkVG9rZW5zIDogW2V4cGVjdGVkVG9rZW5zXTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhKUGF0aFBhcnNpbmdFcnJvciwgSlBhdGhFcnJvcik7XHJcblxyXG5KUGF0aFBhcnNpbmdFcnJvci5wcm90b3R5cGUubmFtZSA9IFwiSlBhdGhQYXJzaW5nRXJyb3JcIjtcclxuXHJcbnZhciByZWFzb25zID0ge307XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoSlBhdGhQYXJzaW5nRXJyb3IsIFwicmVhc29uc1wiLCB7XHJcbiAgICB2YWx1ZTogcmVhc29uc1xyXG59KTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHJlYXNvbnMsIHtcclxuICAgIG1pc3NpbmdDbG9zaW5nQnJhY2tldDoge1xyXG4gICAgICAgIHZhbHVlOiAwXHJcbiAgICB9LFxyXG4gICAgdW5tYXRjaGVkQ2xvc2luZ0JyYWNrZXQ6IHtcclxuICAgICAgICB2YWx1ZTogMVxyXG4gICAgfSxcclxuXHRtaXNzaW5nQ2xvc2luZ1BhcmVudGhlc2VzOiB7XHJcblx0XHR2YWx1ZTogMlxyXG5cdH0sXHJcblx0dW5tYXRjaGVkQ2xvc2luZ1BhcmVudGhlc2VzOiB7XHJcblx0XHR2YWx1ZTogM1xyXG5cdH0sXHJcbiAgICB1bmV4cGVjdGVkVG9rZW46IHtcclxuICAgICAgICB2YWx1ZTogNFxyXG4gICAgfSxcclxuICAgIGludmFsaWRFeHByZXNzaW9uOiB7XHJcbiAgICAgICAgdmFsdWU6IDVcclxuICAgIH1cclxufSk7XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBKUGF0aFBhcnNpbmdFcnJvcjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgQ29udGV4dCA9IHJlcXVpcmUoXCIuL2NvbnRleHRcIik7XHJcblxyXG5mdW5jdGlvbiBQYXRoRXhwcmVzc2lvbihleHByZXNzaW9ucywgaXNBYnNvbHV0ZVBhdGgpIHtcclxuXHR0aGlzLl9leHByZXNzaW9ucyA9IGV4cHJlc3Npb25zO1xyXG5cdHRoaXMuX2lzQWJzb2x1dGVQYXRoID0gaXNBYnNvbHV0ZVBhdGg7XHJcbn1cclxuXHJcblBhdGhFeHByZXNzaW9uLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uIChjb250ZXh0KSB7XHJcblx0aWYgKHRoaXMuX2lzQWJzb2x1dGVQYXRoKVxyXG5cdFx0Y29udGV4dCA9IG5ldyBDb250ZXh0KGNvbnRleHQucm9vdCk7XHJcblxyXG5cdHJldHVybiB0aGlzLl9leHByZXNzaW9ucy5yZWR1Y2UoZnVuY3Rpb24gKGNvbnRleHQsIGV4cHJlc3Npb24pIHtcclxuXHRcdHJldHVybiBuZXcgQ29udGV4dChjb250ZXh0LnJvb3QsIGV4cHJlc3Npb24uZXZhbHVhdGUoY29udGV4dCkpO1xyXG5cdH0sIGNvbnRleHQpLmN1cnJlbnQ7XHJcbn07XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBQYXRoRXhwcmVzc2lvbjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgRXZhbHVhdGlvblJlc3VsdCA9IHJlcXVpcmUoXCIuL2V2YWx1YXRpb25fcmVzdWx0XCIpO1xyXG5cclxuZnVuY3Rpb24gUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHByb3BlcnR5TmFtZXNFeHByZXNzaW9uLCBpc0FycmF5QWNjZXNzKSB7XHJcblx0dGhpcy5faXNBcnJheUFjY2VzcyA9IGlzQXJyYXlBY2Nlc3M7XHJcblx0dGhpcy5fcHJvcGVydHlOYW1lc0V4cHJlc3Npb24gPSBwcm9wZXJ0eU5hbWVzRXhwcmVzc2lvbjtcclxufVxyXG5cclxuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uIChjb250ZXh0KSB7XHJcbiAgICB2YXIgaXNBcnJheUFjY2VzcyA9IHRoaXMuX2lzQXJyYXlBY2Nlc3M7XHJcblx0dmFyIHByb3BlcnR5TmFtZVJlc3VsdHMgPSB0aGlzLl9wcm9wZXJ0eU5hbWVzRXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KTtcclxuXHRyZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgcHJvcGVydHlOYW1lUmVzdWx0cy5tYXAoZnVuY3Rpb24gKHByb3BlcnR5TmFtZVJlc3VsdCkge1xyXG5cdFx0cmV0dXJuIGNvbnRleHQuY3VycmVudC5tYXAoZnVuY3Rpb24gKHJlc3VsdCkge1xyXG5cdFx0XHRyZXR1cm4gbmV3IEV2YWx1YXRpb25SZXN1bHQocmVzdWx0LCBwcm9wZXJ0eU5hbWVSZXN1bHQudmFsdWUsIGlzQXJyYXlBY2Nlc3MpO1xyXG5cdFx0fSk7XHJcblx0fSkpO1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBFdmFsdWF0aW9uUmVzdWx0ID0gcmVxdWlyZShcIi4vZXZhbHVhdGlvbl9yZXN1bHRcIik7XHJcblxyXG5mdW5jdGlvbiBSYW5nZUV4cHJlc3Npb24obGVmdEV4cHJlc3Npb24sIHJpZ2h0RXhwcmVzc2lvbikge1xyXG5cdHRoaXMuX2xlZnRFeHByZXNzaW9uID0gbGVmdEV4cHJlc3Npb247XHJcblx0dGhpcy5fcmlnaHRFeHByZXNzaW9uID0gcmlnaHRFeHByZXNzaW9uO1xyXG59XHJcblxyXG5SYW5nZUV4cHJlc3Npb24ucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24gKGNvbnRleHQpIHtcclxuXHR2YXIgbGVmdFByb3BlcnR5TmFtZXMgPSB0aGlzLl9sZWZ0RXhwcmVzc2lvbi5ldmFsdWF0ZShjb250ZXh0KTtcclxuXHR2YXIgcmlnaHRQcm9wZXJ0eU5hbWVzID0gdGhpcy5fcmlnaHRFeHByZXNzaW9uLmV2YWx1YXRlKGNvbnRleHQpO1xyXG5cclxuXHRyZXR1cm4gbWFrZVJhbmdlKCtsZWZ0UHJvcGVydHlOYW1lc1swXS52YWx1ZSwgK3JpZ2h0UHJvcGVydHlOYW1lc1swXS52YWx1ZSk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBtYWtlUmFuZ2UobGVmdCwgcmlnaHQpIHtcclxuXHRpZiAobGVmdCA+IHJpZ2h0KSB7XHJcblx0XHR2YXIgdG1wID0gbGVmdDtcclxuXHRcdGxlZnQgPSByaWdodDtcclxuXHRcdHJpZ2h0ID0gdG1wO1xyXG5cdH1cclxuXHJcblx0dmFyIHJhbmdlID0gW107XHJcblx0Zm9yXHQodmFyIGkgPSBsZWZ0OyBpIDwgcmlnaHQ7ICsraSlcclxuXHRcdHJhbmdlLnB1c2gobmV3IEV2YWx1YXRpb25SZXN1bHQoaSkpO1xyXG5cclxuXHRyZXR1cm4gcmFuZ2U7XHJcbn1cclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFJhbmdlRXhwcmVzc2lvbjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgRXZhbHVhdGlvblJlc3VsdCA9IHJlcXVpcmUoXCIuL2V2YWx1YXRpb25fcmVzdWx0XCIpO1xyXG5cclxuZnVuY3Rpb24gUmVjdXJzaXZlRGVzY2VudEV4cHJlc3Npb24oKSB7fVxyXG5cclxuUmVjdXJzaXZlRGVzY2VudEV4cHJlc3Npb24ucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24gKGNvbnRleHQpIHtcclxuXHRmdW5jdGlvbiBmaW5kRGVzY2VuZGFudHMocmVzdWx0KSB7XHJcbiAgICAgICAgdmFyIG9iamVjdCA9IHJlc3VsdC52YWx1ZTtcclxuXHRcdHZhciBkZXNjZW5kYW50cyA9IFtdO1xyXG5cdFx0T2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3Rba2V5XSA9PT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdGRlc2NlbmRhbnRzLnB1c2guYXBwbHkoZGVzY2VuZGFudHMsIGZpbmREZXNjZW5kYW50cyhuZXcgRXZhbHVhdGlvblJlc3VsdChyZXN1bHQsIGtleSkpKTtcclxuICAgICAgICAgICAgICAgIGRlc2NlbmRhbnRzLnB1c2gobmV3IEV2YWx1YXRpb25SZXN1bHQocmVzdWx0LCBrZXkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cdFx0cmV0dXJuIGRlc2NlbmRhbnRzO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGNvbnRleHQuY3VycmVudC5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgIHJldHVybiByZXN1bHQuaXNEZWZpbmVkKCkgJiYgdHlwZW9mIHJlc3VsdC52YWx1ZSA9PT0gXCJvYmplY3RcIjtcclxuICAgIH0pLm1hcChmdW5jdGlvbiAocmVzdWx0KSB7XHJcblx0XHRyZXR1cm4gZmluZERlc2NlbmRhbnRzKHJlc3VsdCk7XHJcblx0fSkpO1xyXG59O1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gUmVjdXJzaXZlRGVzY2VudEV4cHJlc3Npb247XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHRva2VuVHlwZXMgPSByZXF1aXJlKFwiLi90b2tlblwiKS50eXBlcztcclxuXHJcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRcIi9cIjogdG9rZW5UeXBlcy5zZXBhcmF0b3IsXHJcblx0XCJbXCI6IHRva2VuVHlwZXMub3BlbkJyYWNrZXQsXHJcblx0XCJdXCI6IHRva2VuVHlwZXMuY2xvc2VCcmFja2V0LFxyXG5cdFwiKFwiOiB0b2tlblR5cGVzLm9wZW5QYXJlbnRoZXNlcyxcclxuXHRcIilcIjogdG9rZW5UeXBlcy5jbG9zZVBhcmVudGhlc2VzLFxyXG5cdFwiKlwiOiB0b2tlblR5cGVzLmFzdGVyaXNrLFxyXG5cdFwiOlwiOiB0b2tlblR5cGVzLmNvbG9uXHJcbn07IiwiLy8gIyBKUGF0aFN5bnRheEVycm9yXHJcblxyXG4vLyBUaGlzIGNsYXNzIHJlcHJlc2VudHMgc3ludGFjdGljIGVycm9ycyBpbiBhIEpQYXRoLlxyXG4vLyBTeW50YWN0aWMgZXJyb3JzIGluY2x1ZGUgdW5iYWxhbmNlZCBicmFja2V0cywgaW52YWxpZCBlc2NhcGUgc2VxdWVuY2VzIG9yIGludmFsaWQgZXhwcmVzc2lvbnMgaW4gZ2VuZXJhbC5cclxuLy8gQXMgYWxsIGVycm9ycyBpdCBpbmhlcml0cyBmcm9tIHRoZSBnZW5lcmFsIEpQYXRoIGVycm9yLlxyXG4vLyBUaGUgcmVhc29uIGZvciB0aGUgc3ludGF4IGVycm9yIHNob3VsZCBiZSBvbmUgb2YgdGhlIGNvbnN0YW50cyBkZWZpbmVkIGJlbG93LlxyXG4vLyBUaGUgc3RhcnQgYW5kIGVuZCBpbmRleCBzaG91bGQgYmUgY2hvc2VuIHN1Y2ggdGhhdCBhIHN1YnN0cmluZyBjYWxsIHdpdGggdGhvc2UgaW5kaWNlcyBvbiB0aGUgaW5wdXQgc3RyaW5nIHJlc3VsdHNcclxuLy8gaW4gdGhhdCBwYXJ0IG9mIHRoZSBzdHJpbmcgdGhhdCBpcyByZXNwb25zaWJsZSBmb3IgdGhlIHN5bnRheCBlcnJvci5cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxuXHJcbnZhciBKUGF0aEVycm9yID0gcmVxdWlyZShcIi4vZXJyb3JcIik7XHJcbnZhciBKUGF0aFBhcnNpbmdFcnJvciA9IHJlcXVpcmUoXCIuL3BhcnNpbmdfZXJyb3JcIik7XHJcblxyXG5mdW5jdGlvbiBKUGF0aFN5bnRheEVycm9yKHBhcmFtcykge1xyXG4gICAgSlBhdGhFcnJvci5jYWxsKHRoaXMsIFwiU3ludGF4IGVycm9yXCIpO1xyXG4gICAgdGhpcy5yZWFzb24gPSBwYXJhbXMucmVhc29uO1xyXG4gICAgdGhpcy5zdGFydElkeCA9IHBhcmFtcy5zdGFydElkeDtcclxuICAgIHRoaXMuZW5kSWR4ID0gcGFyYW1zLmVuZElkeDtcclxuICAgIHRoaXMuYWN0dWFsID0gcGFyYW1zLmFjdHVhbDtcclxuICAgIHRoaXMuZXhwZWN0ZWQgPSBwYXJhbXMuZXhwZWN0ZWQ7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSBwYXJhbXMubWVzc2FnZTtcclxufVxyXG5cclxudXRpbC5pbmhlcml0cyhKUGF0aFN5bnRheEVycm9yLCBKUGF0aEVycm9yKTtcclxuXHJcbkpQYXRoU3ludGF4RXJyb3IucHJvdG90eXBlLm5hbWUgPSBcIkpQYXRoU3ludGF4RXJyb3JcIjtcclxuXHJcbnZhciByZWFzb25zID0gdXRpbC5fZXh0ZW5kKHt9LCBKUGF0aFBhcnNpbmdFcnJvci5yZWFzb25zKTtcclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShKUGF0aFN5bnRheEVycm9yLCBcInJlYXNvbnNcIiwge1xyXG4gICAgdmFsdWU6IHJlYXNvbnNcclxufSk7XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocmVhc29ucywgXCJpbnZhbGlkRXNjYXBlU2VxdWVuY2VcIiwge1xyXG4gICAgdmFsdWU6IEpQYXRoUGFyc2luZ0Vycm9yLnJlYXNvbnMuaW52YWxpZEV4cHJlc3Npb24gKyAxXHJcbn0pO1xyXG5cclxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gSlBhdGhTeW50YXhFcnJvcjtcclxuIiwiLy8gIyBUb2tlblxyXG5cclxuLy8gUmVwcmVzZW50cyBhIHRva2VuIGFzIHRoZSByZXN1bHQgb2YgdGhlIGxleGVycyBzY2FubmluZyBwcm9jZXNzLlxyXG4vLyBUaGUgc3RhcnRJZHggYW5kIGVuZElkeCBwYXJhbWV0ZXIgYXJlIGNob3NlbiB0byBzdWNoIHRoYXQgYSBjYWxsIHRvIFN0cmluZyNzdWJzdHJpbmcoc3RhcnRJZHgsIGVuZElkeCkgb24gdGhlIGlucHV0IHN0cmVhbSB3b3VsZCByZXR1cm4gdGhlIHRva2VuJ3MgdmFsdWUuXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbi8vIENvbnN0cnVjdHMgYSB0b2tlbiB3aXRoIHRoZSBnaXZlbiB0b2tlbiB0eXBlLCB0aGUgdG9rZW5zIHN0YXJ0IGFuZCBlbmQgaW5kZXggYW5kIGl0cyBhY3R1YWwgc3RyaW5nIHZhbHVlLlxyXG5mdW5jdGlvbiBUb2tlbih0eXBlLCBzdGFydElkeCwgZW5kSWR4LCB2YWx1ZSkge1xyXG4gICAgdGhpcy50eXBlID0gdHlwZTtcclxuICAgIHRoaXMuc3RhcnRJZHggPSBzdGFydElkeDtcclxuICAgIHRoaXMuZW5kSWR4ID0gZW5kSWR4O1xyXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUb2tlbjtcclxuXHJcbnZhciB0b2tlblR5cGVzID0ge307XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVG9rZW4sIFwidHlwZXNcIiwge1xyXG4gICAgdmFsdWU6IHRva2VuVHlwZXNcclxufSk7XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyh0b2tlblR5cGVzLCB7XHJcbiAgICAvLyBUaGUgdG9rZW4gdGhhdCBzZXBhcmF0ZXMgdHdvIHBhdGggY29tcG9uZW50cy5cclxuICAgIHNlcGFyYXRvcjoge1xyXG4gICAgICAgIHZhbHVlOiAwXHJcbiAgICB9LFxyXG4gICAgLy8gSW50cm9kdWNlcyBhbiBhcnJheSBpbmRleCBleHByZXNzaW9uLlxyXG4gICAgb3BlbkJyYWNrZXQ6IHtcclxuICAgICAgICB2YWx1ZTogMVxyXG4gICAgfSxcclxuICAgIC8vIENsb3NlcyBhbiBhcnJheSBpbmRleCBleHByZXNzaW9uIG9yIGEgc3ViIGV4cHJlc3Npb24uXHJcbiAgICBjbG9zZUJyYWNrZXQ6IHtcclxuICAgICAgICB2YWx1ZTogMlxyXG4gICAgfSxcclxuXHQvLyBJbnRyb2R1Y2VzIGVpdGhlciBhbiBhcnJheSBpbmRleCBleHByZXNzaW9uIG9yIGEgc3ViIGV4cHJlc3Npb24uXHJcblx0b3BlblBhcmVudGhlc2VzOiB7XHJcblx0XHR2YWx1ZTogM1xyXG5cdH0sXHJcblx0Ly8gQ2xvc2VzIGFuIGFycmF5IGluZGV4IGV4cHJlc3Npb24gb3IgYSBzdWIgZXhwcmVzc2lvbi5cclxuXHRjbG9zZVBhcmVudGhlc2VzOiB7XHJcblx0XHR2YWx1ZTogNFxyXG5cdH0sXHJcbiAgICAvLyBUaGUgdG9rZW4gdGhhdCByZXByZXNlbnRzIGEgZGVzY2VudCBvbmUgbGV2ZWwgZXhwcmVzc2lvbi5cclxuICAgIGFzdGVyaXNrOiB7XHJcbiAgICAgICAgdmFsdWU6IDVcclxuICAgIH0sXHJcbiAgICAvLyBUaGUgdG9rZW4gdXNlZCBpbnNpZGUgYW4gYXJyYXkgaW5kZXggZXhwcmVzc2lvbiB0byBkZWZpbmUgYSBzbGljZSBvcGVyYXRpb24uXHJcbiAgICBjb2xvbjoge1xyXG4gICAgICAgIHZhbHVlOiA2XHJcbiAgICB9LFxyXG4gICAgLy8gVGhlIHRva2VuIGZvciBhIGxpdGVyYWwuXHJcblx0bGl0ZXJhbDoge1xyXG4gICAgICAgIHZhbHVlOiAxMVxyXG4gICAgfSxcclxuICAgIC8vIFRoZSB0b2tlbiByZXByZXNlbnRpbmcgdGhlIGVuZCBvZiB0cmFuc21pc3Npb24vdG9rZW5zdHJlYW0uXHJcbiAgICBlb3Q6IHtcclxuICAgICAgICB2YWx1ZTogMTAwXHJcbiAgICB9XHJcbn0pO1xyXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuKGZ1bmN0aW9uIChnbG9iYWwsIHVuZGVmaW5lZCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgaWYgKGdsb2JhbC5zZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBuZXh0SGFuZGxlID0gMTsgLy8gU3BlYyBzYXlzIGdyZWF0ZXIgdGhhbiB6ZXJvXG4gICAgdmFyIHRhc2tzQnlIYW5kbGUgPSB7fTtcbiAgICB2YXIgY3VycmVudGx5UnVubmluZ0FUYXNrID0gZmFsc2U7XG4gICAgdmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbiAgICB2YXIgc2V0SW1tZWRpYXRlO1xuXG4gICAgZnVuY3Rpb24gYWRkRnJvbVNldEltbWVkaWF0ZUFyZ3VtZW50cyhhcmdzKSB7XG4gICAgICAgIHRhc2tzQnlIYW5kbGVbbmV4dEhhbmRsZV0gPSBwYXJ0aWFsbHlBcHBsaWVkLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICAgIHJldHVybiBuZXh0SGFuZGxlKys7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBhY2NlcHRzIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBzZXRJbW1lZGlhdGUsIGJ1dFxuICAgIC8vIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHJlcXVpcmVzIG5vIGFyZ3VtZW50cy5cbiAgICBmdW5jdGlvbiBwYXJ0aWFsbHlBcHBsaWVkKGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlci5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAobmV3IEZ1bmN0aW9uKFwiXCIgKyBoYW5kbGVyKSkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBydW5JZlByZXNlbnQoaGFuZGxlKSB7XG4gICAgICAgIC8vIEZyb20gdGhlIHNwZWM6IFwiV2FpdCB1bnRpbCBhbnkgaW52b2NhdGlvbnMgb2YgdGhpcyBhbGdvcml0aG0gc3RhcnRlZCBiZWZvcmUgdGhpcyBvbmUgaGF2ZSBjb21wbGV0ZWQuXCJcbiAgICAgICAgLy8gU28gaWYgd2UncmUgY3VycmVudGx5IHJ1bm5pbmcgYSB0YXNrLCB3ZSdsbCBuZWVkIHRvIGRlbGF5IHRoaXMgaW52b2NhdGlvbi5cbiAgICAgICAgaWYgKGN1cnJlbnRseVJ1bm5pbmdBVGFzaykge1xuICAgICAgICAgICAgLy8gRGVsYXkgYnkgZG9pbmcgYSBzZXRUaW1lb3V0LiBzZXRJbW1lZGlhdGUgd2FzIHRyaWVkIGluc3RlYWQsIGJ1dCBpbiBGaXJlZm94IDcgaXQgZ2VuZXJhdGVkIGFcbiAgICAgICAgICAgIC8vIFwidG9vIG11Y2ggcmVjdXJzaW9uXCIgZXJyb3IuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHBhcnRpYWxseUFwcGxpZWQocnVuSWZQcmVzZW50LCBoYW5kbGUpLCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gdGFza3NCeUhhbmRsZVtoYW5kbGVdO1xuICAgICAgICAgICAgaWYgKHRhc2spIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2soKTtcbiAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckltbWVkaWF0ZShoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhckltbWVkaWF0ZShoYW5kbGUpIHtcbiAgICAgICAgZGVsZXRlIHRhc2tzQnlIYW5kbGVbaGFuZGxlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsTmV4dFRpY2tJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gYWRkRnJvbVNldEltbWVkaWF0ZUFyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhwYXJ0aWFsbHlBcHBsaWVkKHJ1bklmUHJlc2VudCwgaGFuZGxlKSk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhblVzZVBvc3RNZXNzYWdlKCkge1xuICAgICAgICAvLyBUaGUgdGVzdCBhZ2FpbnN0IGBpbXBvcnRTY3JpcHRzYCBwcmV2ZW50cyB0aGlzIGltcGxlbWVudGF0aW9uIGZyb20gYmVpbmcgaW5zdGFsbGVkIGluc2lkZSBhIHdlYiB3b3JrZXIsXG4gICAgICAgIC8vIHdoZXJlIGBnbG9iYWwucG9zdE1lc3NhZ2VgIG1lYW5zIHNvbWV0aGluZyBjb21wbGV0ZWx5IGRpZmZlcmVudCBhbmQgY2FuJ3QgYmUgdXNlZCBmb3IgdGhpcyBwdXJwb3NlLlxuICAgICAgICBpZiAoZ2xvYmFsLnBvc3RNZXNzYWdlICYmICFnbG9iYWwuaW1wb3J0U2NyaXB0cykge1xuICAgICAgICAgICAgdmFyIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXMgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIG9sZE9uTWVzc2FnZSA9IGdsb2JhbC5vbm1lc3NhZ2U7XG4gICAgICAgICAgICBnbG9iYWwub25tZXNzYWdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cyA9IGZhbHNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGdsb2JhbC5wb3N0TWVzc2FnZShcIlwiLCBcIipcIik7XG4gICAgICAgICAgICBnbG9iYWwub25tZXNzYWdlID0gb2xkT25NZXNzYWdlO1xuICAgICAgICAgICAgcmV0dXJuIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsUG9zdE1lc3NhZ2VJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgLy8gSW5zdGFsbHMgYW4gZXZlbnQgaGFuZGxlciBvbiBgZ2xvYmFsYCBmb3IgdGhlIGBtZXNzYWdlYCBldmVudDogc2VlXG4gICAgICAgIC8vICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vRE9NL3dpbmRvdy5wb3N0TWVzc2FnZVxuICAgICAgICAvLyAqIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL2NvbW1zLmh0bWwjY3Jvc3NEb2N1bWVudE1lc3NhZ2VzXG5cbiAgICAgICAgdmFyIG1lc3NhZ2VQcmVmaXggPSBcInNldEltbWVkaWF0ZSRcIiArIE1hdGgucmFuZG9tKCkgKyBcIiRcIjtcbiAgICAgICAgdmFyIG9uR2xvYmFsTWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQuc291cmNlID09PSBnbG9iYWwgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgZXZlbnQuZGF0YSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEuaW5kZXhPZihtZXNzYWdlUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJ1bklmUHJlc2VudCgrZXZlbnQuZGF0YS5zbGljZShtZXNzYWdlUHJlZml4Lmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG9uR2xvYmFsTWVzc2FnZSwgZmFsc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2xvYmFsLmF0dGFjaEV2ZW50KFwib25tZXNzYWdlXCIsIG9uR2xvYmFsTWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBhZGRGcm9tU2V0SW1tZWRpYXRlQXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBnbG9iYWwucG9zdE1lc3NhZ2UobWVzc2FnZVByZWZpeCArIGhhbmRsZSwgXCIqXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsTWVzc2FnZUNoYW5uZWxJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBydW5JZlByZXNlbnQoaGFuZGxlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBhZGRGcm9tU2V0SW1tZWRpYXRlQXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKGhhbmRsZSk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxSZWFkeVN0YXRlQ2hhbmdlSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHZhciBodG1sID0gZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gYWRkRnJvbVNldEltbWVkaWF0ZUFyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgPHNjcmlwdD4gZWxlbWVudDsgaXRzIHJlYWR5c3RhdGVjaGFuZ2UgZXZlbnQgd2lsbCBiZSBmaXJlZCBhc3luY2hyb25vdXNseSBvbmNlIGl0IGlzIGluc2VydGVkXG4gICAgICAgICAgICAvLyBpbnRvIHRoZSBkb2N1bWVudC4gRG8gc28sIHRodXMgcXVldWluZyB1cCB0aGUgdGFzay4gUmVtZW1iZXIgdG8gY2xlYW4gdXAgb25jZSBpdCdzIGJlZW4gY2FsbGVkLlxuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgICAgICAgICAgc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBydW5JZlByZXNlbnQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBodG1sLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICAgICAgICAgICAgc2NyaXB0ID0gbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBodG1sLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxTZXRUaW1lb3V0SW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGFkZEZyb21TZXRJbW1lZGlhdGVBcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocGFydGlhbGx5QXBwbGllZChydW5JZlByZXNlbnQsIGhhbmRsZSksIDApO1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBJZiBzdXBwb3J0ZWQsIHdlIHNob3VsZCBhdHRhY2ggdG8gdGhlIHByb3RvdHlwZSBvZiBnbG9iYWwsIHNpbmNlIHRoYXQgaXMgd2hlcmUgc2V0VGltZW91dCBldCBhbC4gbGl2ZS5cbiAgICB2YXIgYXR0YWNoVG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKGdsb2JhbCk7XG4gICAgYXR0YWNoVG8gPSBhdHRhY2hUbyAmJiBhdHRhY2hUby5zZXRUaW1lb3V0ID8gYXR0YWNoVG8gOiBnbG9iYWw7XG5cbiAgICAvLyBEb24ndCBnZXQgZm9vbGVkIGJ5IGUuZy4gYnJvd3NlcmlmeSBlbnZpcm9ubWVudHMuXG4gICAgaWYgKHt9LnRvU3RyaW5nLmNhbGwoZ2xvYmFsLnByb2Nlc3MpID09PSBcIltvYmplY3QgcHJvY2Vzc11cIikge1xuICAgICAgICAvLyBGb3IgTm9kZS5qcyBiZWZvcmUgMC45XG4gICAgICAgIGluc3RhbGxOZXh0VGlja0ltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGNhblVzZVBvc3RNZXNzYWdlKCkpIHtcbiAgICAgICAgLy8gRm9yIG5vbi1JRTEwIG1vZGVybiBicm93c2Vyc1xuICAgICAgICBpbnN0YWxsUG9zdE1lc3NhZ2VJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChnbG9iYWwuTWVzc2FnZUNoYW5uZWwpIHtcbiAgICAgICAgLy8gRm9yIHdlYiB3b3JrZXJzLCB3aGVyZSBzdXBwb3J0ZWRcbiAgICAgICAgaW5zdGFsbE1lc3NhZ2VDaGFubmVsSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoZG9jICYmIFwib25yZWFkeXN0YXRlY2hhbmdlXCIgaW4gZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIikpIHtcbiAgICAgICAgLy8gRm9yIElFIDbigJM4XG4gICAgICAgIGluc3RhbGxSZWFkeVN0YXRlQ2hhbmdlSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICBpbnN0YWxsU2V0VGltZW91dEltcGxlbWVudGF0aW9uKCk7XG4gICAgfVxuXG4gICAgYXR0YWNoVG8uc2V0SW1tZWRpYXRlID0gc2V0SW1tZWRpYXRlO1xuICAgIGF0dGFjaFRvLmNsZWFySW1tZWRpYXRlID0gY2xlYXJJbW1lZGlhdGU7XG59KG5ldyBGdW5jdGlvbihcInJldHVybiB0aGlzXCIpKCkpKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIrTnNjTm1cIikpIixudWxsLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDAsXG4gICAgICBkID0gaXNMRSA/IC0xIDogMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGMsXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApLFxuICAgICAgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpLFxuICAgICAgZCA9IGlzTEUgPyAxIDogLTEsXG4gICAgICBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwO1xuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpO1xuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwO1xuICAgIGUgPSBlTWF4O1xuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKTtcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS07XG4gICAgICBjICo9IDI7XG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrO1xuICAgICAgYyAvPSAyO1xuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDA7XG4gICAgICBlID0gZU1heDtcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gZSArIGVCaWFzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gMDtcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KTtcblxuICBlID0gKGUgPDwgbUxlbikgfCBtO1xuICBlTGVuICs9IG1MZW47XG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCk7XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4O1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIitOc2NObVwiKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIGR1cGxleCBzdHJlYW0gaXMganVzdCBhIHN0cmVhbSB0aGF0IGlzIGJvdGggcmVhZGFibGUgYW5kIHdyaXRhYmxlLlxuLy8gU2luY2UgSlMgZG9lc24ndCBoYXZlIG11bHRpcGxlIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UsIHRoaXMgY2xhc3Ncbi8vIHByb3RvdHlwYWxseSBpbmhlcml0cyBmcm9tIFJlYWRhYmxlLCBhbmQgdGhlbiBwYXJhc2l0aWNhbGx5IGZyb21cbi8vIFdyaXRhYmxlLlxuXG5tb2R1bGUuZXhwb3J0cyA9IER1cGxleDtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG52YXIgc2V0SW1tZWRpYXRlID0gcmVxdWlyZSgncHJvY2Vzcy9icm93c2VyLmpzJykubmV4dFRpY2s7XG52YXIgUmVhZGFibGUgPSByZXF1aXJlKCcuL3JlYWRhYmxlLmpzJyk7XG52YXIgV3JpdGFibGUgPSByZXF1aXJlKCcuL3dyaXRhYmxlLmpzJyk7XG5cbmluaGVyaXRzKER1cGxleCwgUmVhZGFibGUpO1xuXG5EdXBsZXgucHJvdG90eXBlLndyaXRlID0gV3JpdGFibGUucHJvdG90eXBlLndyaXRlO1xuRHVwbGV4LnByb3RvdHlwZS5lbmQgPSBXcml0YWJsZS5wcm90b3R5cGUuZW5kO1xuRHVwbGV4LnByb3RvdHlwZS5fd3JpdGUgPSBXcml0YWJsZS5wcm90b3R5cGUuX3dyaXRlO1xuXG5mdW5jdGlvbiBEdXBsZXgob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IER1cGxleChvcHRpb25zKTtcblxuICBSZWFkYWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICBXcml0YWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMucmVhZGFibGUgPT09IGZhbHNlKVxuICAgIHRoaXMucmVhZGFibGUgPSBmYWxzZTtcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLndyaXRhYmxlID09PSBmYWxzZSlcbiAgICB0aGlzLndyaXRhYmxlID0gZmFsc2U7XG5cbiAgdGhpcy5hbGxvd0hhbGZPcGVuID0gdHJ1ZTtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5hbGxvd0hhbGZPcGVuID09PSBmYWxzZSlcbiAgICB0aGlzLmFsbG93SGFsZk9wZW4gPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2VuZCcsIG9uZW5kKTtcbn1cblxuLy8gdGhlIG5vLWhhbGYtb3BlbiBlbmZvcmNlclxuZnVuY3Rpb24gb25lbmQoKSB7XG4gIC8vIGlmIHdlIGFsbG93IGhhbGYtb3BlbiBzdGF0ZSwgb3IgaWYgdGhlIHdyaXRhYmxlIHNpZGUgZW5kZWQsXG4gIC8vIHRoZW4gd2UncmUgb2suXG4gIGlmICh0aGlzLmFsbG93SGFsZk9wZW4gfHwgdGhpcy5fd3JpdGFibGVTdGF0ZS5lbmRlZClcbiAgICByZXR1cm47XG5cbiAgLy8gbm8gbW9yZSBkYXRhIGNhbiBiZSB3cml0dGVuLlxuICAvLyBCdXQgYWxsb3cgbW9yZSB3cml0ZXMgdG8gaGFwcGVuIGluIHRoaXMgdGljay5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuZW5kKCk7XG4gIH0pO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtO1xuXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5pbmhlcml0cyhTdHJlYW0sIEVFKTtcblN0cmVhbS5SZWFkYWJsZSA9IHJlcXVpcmUoJy4vcmVhZGFibGUuanMnKTtcblN0cmVhbS5Xcml0YWJsZSA9IHJlcXVpcmUoJy4vd3JpdGFibGUuanMnKTtcblN0cmVhbS5EdXBsZXggPSByZXF1aXJlKCcuL2R1cGxleC5qcycpO1xuU3RyZWFtLlRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vdHJhbnNmb3JtLmpzJyk7XG5TdHJlYW0uUGFzc1Rocm91Z2ggPSByZXF1aXJlKCcuL3Bhc3N0aHJvdWdoLmpzJyk7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuNC54XG5TdHJlYW0uU3RyZWFtID0gU3RyZWFtO1xuXG5cblxuLy8gb2xkLXN0eWxlIHN0cmVhbXMuICBOb3RlIHRoYXQgdGhlIHBpcGUgbWV0aG9kICh0aGUgb25seSByZWxldmFudFxuLy8gcGFydCBvZiB0aGlzIGNsYXNzKSBpcyBvdmVycmlkZGVuIGluIHRoZSBSZWFkYWJsZSBjbGFzcy5cblxuZnVuY3Rpb24gU3RyZWFtKCkge1xuICBFRS5jYWxsKHRoaXMpO1xufVxuXG5TdHJlYW0ucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBvcHRpb25zKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzO1xuXG4gIGZ1bmN0aW9uIG9uZGF0YShjaHVuaykge1xuICAgIGlmIChkZXN0LndyaXRhYmxlKSB7XG4gICAgICBpZiAoZmFsc2UgPT09IGRlc3Qud3JpdGUoY2h1bmspICYmIHNvdXJjZS5wYXVzZSkge1xuICAgICAgICBzb3VyY2UucGF1c2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2RhdGEnLCBvbmRhdGEpO1xuXG4gIGZ1bmN0aW9uIG9uZHJhaW4oKSB7XG4gICAgaWYgKHNvdXJjZS5yZWFkYWJsZSAmJiBzb3VyY2UucmVzdW1lKSB7XG4gICAgICBzb3VyY2UucmVzdW1lKCk7XG4gICAgfVxuICB9XG5cbiAgZGVzdC5vbignZHJhaW4nLCBvbmRyYWluKTtcblxuICAvLyBJZiB0aGUgJ2VuZCcgb3B0aW9uIGlzIG5vdCBzdXBwbGllZCwgZGVzdC5lbmQoKSB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gIC8vIHNvdXJjZSBnZXRzIHRoZSAnZW5kJyBvciAnY2xvc2UnIGV2ZW50cy4gIE9ubHkgZGVzdC5lbmQoKSBvbmNlLlxuICBpZiAoIWRlc3QuX2lzU3RkaW8gJiYgKCFvcHRpb25zIHx8IG9wdGlvbnMuZW5kICE9PSBmYWxzZSkpIHtcbiAgICBzb3VyY2Uub24oJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2Uub24oJ2Nsb3NlJywgb25jbG9zZSk7XG4gIH1cblxuICB2YXIgZGlkT25FbmQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgaWYgKGRpZE9uRW5kKSByZXR1cm47XG4gICAgZGlkT25FbmQgPSB0cnVlO1xuXG4gICAgZGVzdC5lbmQoKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICBpZiAoZGlkT25FbmQpIHJldHVybjtcbiAgICBkaWRPbkVuZCA9IHRydWU7XG5cbiAgICBpZiAodHlwZW9mIGRlc3QuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykgZGVzdC5kZXN0cm95KCk7XG4gIH1cblxuICAvLyBkb24ndCBsZWF2ZSBkYW5nbGluZyBwaXBlcyB3aGVuIHRoZXJlIGFyZSBlcnJvcnMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICBjbGVhbnVwKCk7XG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQodGhpcywgJ2Vycm9yJykgPT09IDApIHtcbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgc3RyZWFtIGVycm9yIGluIHBpcGUuXG4gICAgfVxuICB9XG5cbiAgc291cmNlLm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuICBkZXN0Lm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuXG4gIC8vIHJlbW92ZSBhbGwgdGhlIGV2ZW50IGxpc3RlbmVycyB0aGF0IHdlcmUgYWRkZWQuXG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdkYXRhJywgb25kYXRhKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbmVuZCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIGNsZWFudXApO1xuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcblxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgY2xlYW51cCk7XG4gIH1cblxuICBzb3VyY2Uub24oJ2VuZCcsIGNsZWFudXApO1xuICBzb3VyY2Uub24oJ2Nsb3NlJywgY2xlYW51cCk7XG5cbiAgZGVzdC5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0LmVtaXQoJ3BpcGUnLCBzb3VyY2UpO1xuXG4gIC8vIEFsbG93IGZvciB1bml4LWxpa2UgdXNhZ2U6IEEucGlwZShCKS5waXBlKEMpXG4gIHJldHVybiBkZXN0O1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIHBhc3N0aHJvdWdoIHN0cmVhbS5cbi8vIGJhc2ljYWxseSBqdXN0IHRoZSBtb3N0IG1pbmltYWwgc29ydCBvZiBUcmFuc2Zvcm0gc3RyZWFtLlxuLy8gRXZlcnkgd3JpdHRlbiBjaHVuayBnZXRzIG91dHB1dCBhcy1pcy5cblxubW9kdWxlLmV4cG9ydHMgPSBQYXNzVGhyb3VnaDtcblxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vdHJhbnNmb3JtLmpzJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuaW5oZXJpdHMoUGFzc1Rocm91Z2gsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIFBhc3NUaHJvdWdoKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhc3NUaHJvdWdoKSlcbiAgICByZXR1cm4gbmV3IFBhc3NUaHJvdWdoKG9wdGlvbnMpO1xuXG4gIFRyYW5zZm9ybS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5QYXNzVGhyb3VnaC5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2IobnVsbCwgY2h1bmspO1xufTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFkYWJsZTtcblJlYWRhYmxlLlJlYWRhYmxlU3RhdGUgPSBSZWFkYWJsZVN0YXRlO1xuXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgU3RyZWFtID0gcmVxdWlyZSgnLi9pbmRleC5qcycpO1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbnZhciBzZXRJbW1lZGlhdGUgPSByZXF1aXJlKCdwcm9jZXNzL2Jyb3dzZXIuanMnKS5uZXh0VGljaztcbnZhciBTdHJpbmdEZWNvZGVyO1xuXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuaW5oZXJpdHMoUmVhZGFibGUsIFN0cmVhbSk7XG5cbmZ1bmN0aW9uIFJlYWRhYmxlU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHRoZSBwb2ludCBhdCB3aGljaCBpdCBzdG9wcyBjYWxsaW5nIF9yZWFkKCkgdG8gZmlsbCB0aGUgYnVmZmVyXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgXCJkb24ndCBjYWxsIF9yZWFkIHByZWVtcHRpdmVseSBldmVyXCJcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogMTYgKiAxMDI0O1xuXG4gIC8vIGNhc3QgdG8gaW50cy5cbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gfn50aGlzLmhpZ2hXYXRlck1hcms7XG5cbiAgdGhpcy5idWZmZXIgPSBbXTtcbiAgdGhpcy5sZW5ndGggPSAwO1xuICB0aGlzLnBpcGVzID0gbnVsbDtcbiAgdGhpcy5waXBlc0NvdW50ID0gMDtcbiAgdGhpcy5mbG93aW5nID0gZmFsc2U7XG4gIHRoaXMuZW5kZWQgPSBmYWxzZTtcbiAgdGhpcy5lbmRFbWl0dGVkID0gZmFsc2U7XG4gIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuXG4gIC8vIEluIHN0cmVhbXMgdGhhdCBuZXZlciBoYXZlIGFueSBkYXRhLCBhbmQgZG8gcHVzaChudWxsKSByaWdodCBhd2F5LFxuICAvLyB0aGUgY29uc3VtZXIgY2FuIG1pc3MgdGhlICdlbmQnIGV2ZW50IGlmIHRoZXkgZG8gc29tZSBJL08gYmVmb3JlXG4gIC8vIGNvbnN1bWluZyB0aGUgc3RyZWFtLiAgU28sIHdlIGRvbid0IGVtaXQoJ2VuZCcpIHVudGlsIHNvbWUgcmVhZGluZ1xuICAvLyBoYXBwZW5zLlxuICB0aGlzLmNhbGxlZFJlYWQgPSBmYWxzZTtcblxuICAvLyBhIGZsYWcgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIHRoZSBvbndyaXRlIGNiIGlzIGNhbGxlZCBpbW1lZGlhdGVseSxcbiAgLy8gb3Igb24gYSBsYXRlciB0aWNrLiAgV2Ugc2V0IHRoaXMgdG8gdHJ1ZSBhdCBmaXJzdCwgYmVjdWFzZSBhbnlcbiAgLy8gYWN0aW9ucyB0aGF0IHNob3VsZG4ndCBoYXBwZW4gdW50aWwgXCJsYXRlclwiIHNob3VsZCBnZW5lcmFsbHkgYWxzb1xuICAvLyBub3QgaGFwcGVuIGJlZm9yZSB0aGUgZmlyc3Qgd3JpdGUgY2FsbC5cbiAgdGhpcy5zeW5jID0gdHJ1ZTtcblxuICAvLyB3aGVuZXZlciB3ZSByZXR1cm4gbnVsbCwgdGhlbiB3ZSBzZXQgYSBmbGFnIHRvIHNheVxuICAvLyB0aGF0IHdlJ3JlIGF3YWl0aW5nIGEgJ3JlYWRhYmxlJyBldmVudCBlbWlzc2lvbi5cbiAgdGhpcy5uZWVkUmVhZGFibGUgPSBmYWxzZTtcbiAgdGhpcy5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcbiAgdGhpcy5yZWFkYWJsZUxpc3RlbmluZyA9IGZhbHNlO1xuXG5cbiAgLy8gb2JqZWN0IHN0cmVhbSBmbGFnLiBVc2VkIHRvIG1ha2UgcmVhZChuKSBpZ25vcmUgbiBhbmQgdG9cbiAgLy8gbWFrZSBhbGwgdGhlIGJ1ZmZlciBtZXJnaW5nIGFuZCBsZW5ndGggY2hlY2tzIGdvIGF3YXlcbiAgdGhpcy5vYmplY3RNb2RlID0gISFvcHRpb25zLm9iamVjdE1vZGU7XG5cbiAgLy8gQ3J5cHRvIGlzIGtpbmQgb2Ygb2xkIGFuZCBjcnVzdHkuICBIaXN0b3JpY2FsbHksIGl0cyBkZWZhdWx0IHN0cmluZ1xuICAvLyBlbmNvZGluZyBpcyAnYmluYXJ5JyBzbyB3ZSBoYXZlIHRvIG1ha2UgdGhpcyBjb25maWd1cmFibGUuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiB0aGUgdW5pdmVyc2UgdXNlcyAndXRmOCcsIHRob3VnaC5cbiAgdGhpcy5kZWZhdWx0RW5jb2RpbmcgPSBvcHRpb25zLmRlZmF1bHRFbmNvZGluZyB8fCAndXRmOCc7XG5cbiAgLy8gd2hlbiBwaXBpbmcsIHdlIG9ubHkgY2FyZSBhYm91dCAncmVhZGFibGUnIGV2ZW50cyB0aGF0IGhhcHBlblxuICAvLyBhZnRlciByZWFkKClpbmcgYWxsIHRoZSBieXRlcyBhbmQgbm90IGdldHRpbmcgYW55IHB1c2hiYWNrLlxuICB0aGlzLnJhbk91dCA9IGZhbHNlO1xuXG4gIC8vIHRoZSBudW1iZXIgb2Ygd3JpdGVycyB0aGF0IGFyZSBhd2FpdGluZyBhIGRyYWluIGV2ZW50IGluIC5waXBlKClzXG4gIHRoaXMuYXdhaXREcmFpbiA9IDA7XG5cbiAgLy8gaWYgdHJ1ZSwgYSBtYXliZVJlYWRNb3JlIGhhcyBiZWVuIHNjaGVkdWxlZFxuICB0aGlzLnJlYWRpbmdNb3JlID0gZmFsc2U7XG5cbiAgdGhpcy5kZWNvZGVyID0gbnVsbDtcbiAgdGhpcy5lbmNvZGluZyA9IG51bGw7XG4gIGlmIChvcHRpb25zLmVuY29kaW5nKSB7XG4gICAgaWYgKCFTdHJpbmdEZWNvZGVyKVxuICAgICAgU3RyaW5nRGVjb2RlciA9IHJlcXVpcmUoJ3N0cmluZ19kZWNvZGVyJykuU3RyaW5nRGVjb2RlcjtcbiAgICB0aGlzLmRlY29kZXIgPSBuZXcgU3RyaW5nRGVjb2RlcihvcHRpb25zLmVuY29kaW5nKTtcbiAgICB0aGlzLmVuY29kaW5nID0gb3B0aW9ucy5lbmNvZGluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBSZWFkYWJsZShvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSZWFkYWJsZSkpXG4gICAgcmV0dXJuIG5ldyBSZWFkYWJsZShvcHRpb25zKTtcblxuICB0aGlzLl9yZWFkYWJsZVN0YXRlID0gbmV3IFJlYWRhYmxlU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gbGVnYWN5XG4gIHRoaXMucmVhZGFibGUgPSB0cnVlO1xuXG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xufVxuXG4vLyBNYW51YWxseSBzaG92ZSBzb21ldGhpbmcgaW50byB0aGUgcmVhZCgpIGJ1ZmZlci5cbi8vIFRoaXMgcmV0dXJucyB0cnVlIGlmIHRoZSBoaWdoV2F0ZXJNYXJrIGhhcyBub3QgYmVlbiBoaXQgeWV0LFxuLy8gc2ltaWxhciB0byBob3cgV3JpdGFibGUud3JpdGUoKSByZXR1cm5zIHRydWUgaWYgeW91IHNob3VsZFxuLy8gd3JpdGUoKSBzb21lIG1vcmUuXG5SZWFkYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZykge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIGlmICh0eXBlb2YgY2h1bmsgPT09ICdzdHJpbmcnICYmICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgZW5jb2RpbmcgPSBlbmNvZGluZyB8fCBzdGF0ZS5kZWZhdWx0RW5jb2Rpbmc7XG4gICAgaWYgKGVuY29kaW5nICE9PSBzdGF0ZS5lbmNvZGluZykge1xuICAgICAgY2h1bmsgPSBuZXcgQnVmZmVyKGNodW5rLCBlbmNvZGluZyk7XG4gICAgICBlbmNvZGluZyA9ICcnO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGZhbHNlKTtcbn07XG5cbi8vIFVuc2hpZnQgc2hvdWxkICphbHdheXMqIGJlIHNvbWV0aGluZyBkaXJlY3RseSBvdXQgb2YgcmVhZCgpXG5SZWFkYWJsZS5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uKGNodW5rKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgJycsIHRydWUpO1xufTtcblxuZnVuY3Rpb24gcmVhZGFibGVBZGRDaHVuayhzdHJlYW0sIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGFkZFRvRnJvbnQpIHtcbiAgdmFyIGVyID0gY2h1bmtJbnZhbGlkKHN0YXRlLCBjaHVuayk7XG4gIGlmIChlcikge1xuICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgfSBlbHNlIGlmIChjaHVuayA9PT0gbnVsbCB8fCBjaHVuayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICAgIGlmICghc3RhdGUuZW5kZWQpXG4gICAgICBvbkVvZkNodW5rKHN0cmVhbSwgc3RhdGUpO1xuICB9IGVsc2UgaWYgKHN0YXRlLm9iamVjdE1vZGUgfHwgY2h1bmsgJiYgY2h1bmsubGVuZ3RoID4gMCkge1xuICAgIGlmIChzdGF0ZS5lbmRlZCAmJiAhYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS5wdXNoKCkgYWZ0ZXIgRU9GJyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmVuZEVtaXR0ZWQgJiYgYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS51bnNoaWZ0KCkgYWZ0ZXIgZW5kIGV2ZW50Jyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIWFkZFRvRnJvbnQgJiYgIWVuY29kaW5nKVxuICAgICAgICBjaHVuayA9IHN0YXRlLmRlY29kZXIud3JpdGUoY2h1bmspO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIGJ1ZmZlciBpbmZvLlxuICAgICAgc3RhdGUubGVuZ3RoICs9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuICAgICAgaWYgKGFkZFRvRnJvbnQpIHtcbiAgICAgICAgc3RhdGUuYnVmZmVyLnVuc2hpZnQoY2h1bmspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5idWZmZXIucHVzaChjaHVuayk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5uZWVkUmVhZGFibGUpXG4gICAgICAgIGVtaXRSZWFkYWJsZShzdHJlYW0pO1xuXG4gICAgICBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICghYWRkVG9Gcm9udCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBuZWVkTW9yZURhdGEoc3RhdGUpO1xufVxuXG5cblxuLy8gaWYgaXQncyBwYXN0IHRoZSBoaWdoIHdhdGVyIG1hcmssIHdlIGNhbiBwdXNoIGluIHNvbWUgbW9yZS5cbi8vIEFsc28sIGlmIHdlIGhhdmUgbm8gZGF0YSB5ZXQsIHdlIGNhbiBzdGFuZCBzb21lXG4vLyBtb3JlIGJ5dGVzLiAgVGhpcyBpcyB0byB3b3JrIGFyb3VuZCBjYXNlcyB3aGVyZSBod209MCxcbi8vIHN1Y2ggYXMgdGhlIHJlcGwuICBBbHNvLCBpZiB0aGUgcHVzaCgpIHRyaWdnZXJlZCBhXG4vLyByZWFkYWJsZSBldmVudCwgYW5kIHRoZSB1c2VyIGNhbGxlZCByZWFkKGxhcmdlTnVtYmVyKSBzdWNoIHRoYXRcbi8vIG5lZWRSZWFkYWJsZSB3YXMgc2V0LCB0aGVuIHdlIG91Z2h0IHRvIHB1c2ggbW9yZSwgc28gdGhhdCBhbm90aGVyXG4vLyAncmVhZGFibGUnIGV2ZW50IHdpbGwgYmUgdHJpZ2dlcmVkLlxuZnVuY3Rpb24gbmVlZE1vcmVEYXRhKHN0YXRlKSB7XG4gIHJldHVybiAhc3RhdGUuZW5kZWQgJiZcbiAgICAgICAgIChzdGF0ZS5uZWVkUmVhZGFibGUgfHxcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrIHx8XG4gICAgICAgICAgc3RhdGUubGVuZ3RoID09PSAwKTtcbn1cblxuLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG5SZWFkYWJsZS5wcm90b3R5cGUuc2V0RW5jb2RpbmcgPSBmdW5jdGlvbihlbmMpIHtcbiAgaWYgKCFTdHJpbmdEZWNvZGVyKVxuICAgIFN0cmluZ0RlY29kZXIgPSByZXF1aXJlKCdzdHJpbmdfZGVjb2RlcicpLlN0cmluZ0RlY29kZXI7XG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKGVuYyk7XG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuZW5jb2RpbmcgPSBlbmM7XG59O1xuXG4vLyBEb24ndCByYWlzZSB0aGUgaHdtID4gMTI4TUJcbnZhciBNQVhfSFdNID0gMHg4MDAwMDA7XG5mdW5jdGlvbiByb3VuZFVwVG9OZXh0UG93ZXJPZjIobikge1xuICBpZiAobiA+PSBNQVhfSFdNKSB7XG4gICAgbiA9IE1BWF9IV007XG4gIH0gZWxzZSB7XG4gICAgLy8gR2V0IHRoZSBuZXh0IGhpZ2hlc3QgcG93ZXIgb2YgMlxuICAgIG4tLTtcbiAgICBmb3IgKHZhciBwID0gMTsgcCA8IDMyOyBwIDw8PSAxKSBuIHw9IG4gPj4gcDtcbiAgICBuKys7XG4gIH1cbiAgcmV0dXJuIG47XG59XG5cbmZ1bmN0aW9uIGhvd011Y2hUb1JlYWQobiwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiBzdGF0ZS5lbmRlZClcbiAgICByZXR1cm4gMDtcblxuICBpZiAoc3RhdGUub2JqZWN0TW9kZSlcbiAgICByZXR1cm4gbiA9PT0gMCA/IDAgOiAxO1xuXG4gIGlmIChpc05hTihuKSB8fCBuID09PSBudWxsKSB7XG4gICAgLy8gb25seSBmbG93IG9uZSBidWZmZXIgYXQgYSB0aW1lXG4gICAgaWYgKHN0YXRlLmZsb3dpbmcgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICAgIHJldHVybiBzdGF0ZS5idWZmZXJbMF0ubGVuZ3RoO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBzdGF0ZS5sZW5ndGg7XG4gIH1cblxuICBpZiAobiA8PSAwKVxuICAgIHJldHVybiAwO1xuXG4gIC8vIElmIHdlJ3JlIGFza2luZyBmb3IgbW9yZSB0aGFuIHRoZSB0YXJnZXQgYnVmZmVyIGxldmVsLFxuICAvLyB0aGVuIHJhaXNlIHRoZSB3YXRlciBtYXJrLiAgQnVtcCB1cCB0byB0aGUgbmV4dCBoaWdoZXN0XG4gIC8vIHBvd2VyIG9mIDIsIHRvIHByZXZlbnQgaW5jcmVhc2luZyBpdCBleGNlc3NpdmVseSBpbiB0aW55XG4gIC8vIGFtb3VudHMuXG4gIGlmIChuID4gc3RhdGUuaGlnaFdhdGVyTWFyaylcbiAgICBzdGF0ZS5oaWdoV2F0ZXJNYXJrID0gcm91bmRVcFRvTmV4dFBvd2VyT2YyKG4pO1xuXG4gIC8vIGRvbid0IGhhdmUgdGhhdCBtdWNoLiAgcmV0dXJuIG51bGwsIHVubGVzcyB3ZSd2ZSBlbmRlZC5cbiAgaWYgKG4gPiBzdGF0ZS5sZW5ndGgpIHtcbiAgICBpZiAoIXN0YXRlLmVuZGVkKSB7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gc3RhdGUubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIG47XG59XG5cbi8vIHlvdSBjYW4gb3ZlcnJpZGUgZWl0aGVyIHRoaXMgbWV0aG9kLCBvciB0aGUgYXN5bmMgX3JlYWQobikgYmVsb3cuXG5SZWFkYWJsZS5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgc3RhdGUuY2FsbGVkUmVhZCA9IHRydWU7XG4gIHZhciBuT3JpZyA9IG47XG5cbiAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuID4gMClcbiAgICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcblxuICAvLyBpZiB3ZSdyZSBkb2luZyByZWFkKDApIHRvIHRyaWdnZXIgYSByZWFkYWJsZSBldmVudCwgYnV0IHdlXG4gIC8vIGFscmVhZHkgaGF2ZSBhIGJ1bmNoIG9mIGRhdGEgaW4gdGhlIGJ1ZmZlciwgdGhlbiBqdXN0IHRyaWdnZXJcbiAgLy8gdGhlICdyZWFkYWJsZScgZXZlbnQgYW5kIG1vdmUgb24uXG4gIGlmIChuID09PSAwICYmXG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgJiZcbiAgICAgIChzdGF0ZS5sZW5ndGggPj0gc3RhdGUuaGlnaFdhdGVyTWFyayB8fCBzdGF0ZS5lbmRlZCkpIHtcbiAgICBlbWl0UmVhZGFibGUodGhpcyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBuID0gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSk7XG5cbiAgLy8gaWYgd2UndmUgZW5kZWQsIGFuZCB3ZSdyZSBub3cgY2xlYXIsIHRoZW4gZmluaXNoIGl0IHVwLlxuICBpZiAobiA9PT0gMCAmJiBzdGF0ZS5lbmRlZCkge1xuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgICBlbmRSZWFkYWJsZSh0aGlzKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEFsbCB0aGUgYWN0dWFsIGNodW5rIGdlbmVyYXRpb24gbG9naWMgbmVlZHMgdG8gYmVcbiAgLy8gKmJlbG93KiB0aGUgY2FsbCB0byBfcmVhZC4gIFRoZSByZWFzb24gaXMgdGhhdCBpbiBjZXJ0YWluXG4gIC8vIHN5bnRoZXRpYyBzdHJlYW0gY2FzZXMsIHN1Y2ggYXMgcGFzc3Rocm91Z2ggc3RyZWFtcywgX3JlYWRcbiAgLy8gbWF5IGJlIGEgY29tcGxldGVseSBzeW5jaHJvbm91cyBvcGVyYXRpb24gd2hpY2ggbWF5IGNoYW5nZVxuICAvLyB0aGUgc3RhdGUgb2YgdGhlIHJlYWQgYnVmZmVyLCBwcm92aWRpbmcgZW5vdWdoIGRhdGEgd2hlblxuICAvLyBiZWZvcmUgdGhlcmUgd2FzICpub3QqIGVub3VnaC5cbiAgLy9cbiAgLy8gU28sIHRoZSBzdGVwcyBhcmU6XG4gIC8vIDEuIEZpZ3VyZSBvdXQgd2hhdCB0aGUgc3RhdGUgb2YgdGhpbmdzIHdpbGwgYmUgYWZ0ZXIgd2UgZG9cbiAgLy8gYSByZWFkIGZyb20gdGhlIGJ1ZmZlci5cbiAgLy9cbiAgLy8gMi4gSWYgdGhhdCByZXN1bHRpbmcgc3RhdGUgd2lsbCB0cmlnZ2VyIGEgX3JlYWQsIHRoZW4gY2FsbCBfcmVhZC5cbiAgLy8gTm90ZSB0aGF0IHRoaXMgbWF5IGJlIGFzeW5jaHJvbm91cywgb3Igc3luY2hyb25vdXMuICBZZXMsIGl0IGlzXG4gIC8vIGRlZXBseSB1Z2x5IHRvIHdyaXRlIEFQSXMgdGhpcyB3YXksIGJ1dCB0aGF0IHN0aWxsIGRvZXNuJ3QgbWVhblxuICAvLyB0aGF0IHRoZSBSZWFkYWJsZSBjbGFzcyBzaG91bGQgYmVoYXZlIGltcHJvcGVybHksIGFzIHN0cmVhbXMgYXJlXG4gIC8vIGRlc2lnbmVkIHRvIGJlIHN5bmMvYXN5bmMgYWdub3N0aWMuXG4gIC8vIFRha2Ugbm90ZSBpZiB0aGUgX3JlYWQgY2FsbCBpcyBzeW5jIG9yIGFzeW5jIChpZSwgaWYgdGhlIHJlYWQgY2FsbFxuICAvLyBoYXMgcmV0dXJuZWQgeWV0KSwgc28gdGhhdCB3ZSBrbm93IHdoZXRoZXIgb3Igbm90IGl0J3Mgc2FmZSB0byBlbWl0XG4gIC8vICdyZWFkYWJsZScgZXRjLlxuICAvL1xuICAvLyAzLiBBY3R1YWxseSBwdWxsIHRoZSByZXF1ZXN0ZWQgY2h1bmtzIG91dCBvZiB0aGUgYnVmZmVyIGFuZCByZXR1cm4uXG5cbiAgLy8gaWYgd2UgbmVlZCBhIHJlYWRhYmxlIGV2ZW50LCB0aGVuIHdlIG5lZWQgdG8gZG8gc29tZSByZWFkaW5nLlxuICB2YXIgZG9SZWFkID0gc3RhdGUubmVlZFJlYWRhYmxlO1xuXG4gIC8vIGlmIHdlIGN1cnJlbnRseSBoYXZlIGxlc3MgdGhhbiB0aGUgaGlnaFdhdGVyTWFyaywgdGhlbiBhbHNvIHJlYWQgc29tZVxuICBpZiAoc3RhdGUubGVuZ3RoIC0gbiA8PSBzdGF0ZS5oaWdoV2F0ZXJNYXJrKVxuICAgIGRvUmVhZCA9IHRydWU7XG5cbiAgLy8gaG93ZXZlciwgaWYgd2UndmUgZW5kZWQsIHRoZW4gdGhlcmUncyBubyBwb2ludCwgYW5kIGlmIHdlJ3JlIGFscmVhZHlcbiAgLy8gcmVhZGluZywgdGhlbiBpdCdzIHVubmVjZXNzYXJ5LlxuICBpZiAoc3RhdGUuZW5kZWQgfHwgc3RhdGUucmVhZGluZylcbiAgICBkb1JlYWQgPSBmYWxzZTtcblxuICBpZiAoZG9SZWFkKSB7XG4gICAgc3RhdGUucmVhZGluZyA9IHRydWU7XG4gICAgc3RhdGUuc3luYyA9IHRydWU7XG4gICAgLy8gaWYgdGhlIGxlbmd0aCBpcyBjdXJyZW50bHkgemVybywgdGhlbiB3ZSAqbmVlZCogYSByZWFkYWJsZSBldmVudC5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID09PSAwKVxuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAvLyBjYWxsIGludGVybmFsIHJlYWQgbWV0aG9kXG4gICAgdGhpcy5fcmVhZChzdGF0ZS5oaWdoV2F0ZXJNYXJrKTtcbiAgICBzdGF0ZS5zeW5jID0gZmFsc2U7XG4gIH1cblxuICAvLyBJZiBfcmVhZCBjYWxsZWQgaXRzIGNhbGxiYWNrIHN5bmNocm9ub3VzbHksIHRoZW4gYHJlYWRpbmdgXG4gIC8vIHdpbGwgYmUgZmFsc2UsIGFuZCB3ZSBuZWVkIHRvIHJlLWV2YWx1YXRlIGhvdyBtdWNoIGRhdGEgd2VcbiAgLy8gY2FuIHJldHVybiB0byB0aGUgdXNlci5cbiAgaWYgKGRvUmVhZCAmJiAhc3RhdGUucmVhZGluZylcbiAgICBuID0gaG93TXVjaFRvUmVhZChuT3JpZywgc3RhdGUpO1xuXG4gIHZhciByZXQ7XG4gIGlmIChuID4gMClcbiAgICByZXQgPSBmcm9tTGlzdChuLCBzdGF0ZSk7XG4gIGVsc2VcbiAgICByZXQgPSBudWxsO1xuXG4gIGlmIChyZXQgPT09IG51bGwpIHtcbiAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIG4gPSAwO1xuICB9XG5cbiAgc3RhdGUubGVuZ3RoIC09IG47XG5cbiAgLy8gSWYgd2UgaGF2ZSBub3RoaW5nIGluIHRoZSBidWZmZXIsIHRoZW4gd2Ugd2FudCB0byBrbm93XG4gIC8vIGFzIHNvb24gYXMgd2UgKmRvKiBnZXQgc29tZXRoaW5nIGludG8gdGhlIGJ1ZmZlci5cbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiAhc3RhdGUuZW5kZWQpXG4gICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcblxuICAvLyBJZiB3ZSBoYXBwZW5lZCB0byByZWFkKCkgZXhhY3RseSB0aGUgcmVtYWluaW5nIGFtb3VudCBpbiB0aGVcbiAgLy8gYnVmZmVyLCBhbmQgdGhlIEVPRiBoYXMgYmVlbiBzZWVuIGF0IHRoaXMgcG9pbnQsIHRoZW4gbWFrZSBzdXJlXG4gIC8vIHRoYXQgd2UgZW1pdCAnZW5kJyBvbiB0aGUgdmVyeSBuZXh0IHRpY2suXG4gIGlmIChzdGF0ZS5lbmRlZCAmJiAhc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgZW5kUmVhZGFibGUodGhpcyk7XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGNodW5rSW52YWxpZChzdGF0ZSwgY2h1bmspIHtcbiAgdmFyIGVyID0gbnVsbDtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoY2h1bmspICYmXG4gICAgICAnc3RyaW5nJyAhPT0gdHlwZW9mIGNodW5rICYmXG4gICAgICBjaHVuayAhPT0gbnVsbCAmJlxuICAgICAgY2h1bmsgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgIXN0YXRlLm9iamVjdE1vZGUgJiZcbiAgICAgICFlcikge1xuICAgIGVyID0gbmV3IFR5cGVFcnJvcignSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuaycpO1xuICB9XG4gIHJldHVybiBlcjtcbn1cblxuXG5mdW5jdGlvbiBvbkVvZkNodW5rKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIXN0YXRlLmVuZGVkKSB7XG4gICAgdmFyIGNodW5rID0gc3RhdGUuZGVjb2Rlci5lbmQoKTtcbiAgICBpZiAoY2h1bmsgJiYgY2h1bmsubGVuZ3RoKSB7XG4gICAgICBzdGF0ZS5idWZmZXIucHVzaChjaHVuayk7XG4gICAgICBzdGF0ZS5sZW5ndGggKz0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG4gICAgfVxuICB9XG4gIHN0YXRlLmVuZGVkID0gdHJ1ZTtcblxuICAvLyBpZiB3ZSd2ZSBlbmRlZCBhbmQgd2UgaGF2ZSBzb21lIGRhdGEgbGVmdCwgdGhlbiBlbWl0XG4gIC8vICdyZWFkYWJsZScgbm93IHRvIG1ha2Ugc3VyZSBpdCBnZXRzIHBpY2tlZCB1cC5cbiAgaWYgKHN0YXRlLmxlbmd0aCA+IDApXG4gICAgZW1pdFJlYWRhYmxlKHN0cmVhbSk7XG4gIGVsc2VcbiAgICBlbmRSZWFkYWJsZShzdHJlYW0pO1xufVxuXG4vLyBEb24ndCBlbWl0IHJlYWRhYmxlIHJpZ2h0IGF3YXkgaW4gc3luYyBtb2RlLCBiZWNhdXNlIHRoaXMgY2FuIHRyaWdnZXJcbi8vIGFub3RoZXIgcmVhZCgpIGNhbGwgPT4gc3RhY2sgb3ZlcmZsb3cuICBUaGlzIHdheSwgaXQgbWlnaHQgdHJpZ2dlclxuLy8gYSBuZXh0VGljayByZWN1cnNpb24gd2FybmluZywgYnV0IHRoYXQncyBub3Qgc28gYmFkLlxuZnVuY3Rpb24gZW1pdFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHN0YXRlLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICBpZiAoc3RhdGUuZW1pdHRlZFJlYWRhYmxlKVxuICAgIHJldHVybjtcblxuICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSB0cnVlO1xuICBpZiAoc3RhdGUuc3luYylcbiAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0UmVhZGFibGVfKHN0cmVhbSk7XG4gICAgfSk7XG4gIGVsc2VcbiAgICBlbWl0UmVhZGFibGVfKHN0cmVhbSk7XG59XG5cbmZ1bmN0aW9uIGVtaXRSZWFkYWJsZV8oc3RyZWFtKSB7XG4gIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xufVxuXG5cbi8vIGF0IHRoaXMgcG9pbnQsIHRoZSB1c2VyIGhhcyBwcmVzdW1hYmx5IHNlZW4gdGhlICdyZWFkYWJsZScgZXZlbnQsXG4vLyBhbmQgY2FsbGVkIHJlYWQoKSB0byBjb25zdW1lIHNvbWUgZGF0YS4gIHRoYXQgbWF5IGhhdmUgdHJpZ2dlcmVkXG4vLyBpbiB0dXJuIGFub3RoZXIgX3JlYWQobikgY2FsbCwgaW4gd2hpY2ggY2FzZSByZWFkaW5nID0gdHJ1ZSBpZlxuLy8gaXQncyBpbiBwcm9ncmVzcy5cbi8vIEhvd2V2ZXIsIGlmIHdlJ3JlIG5vdCBlbmRlZCwgb3IgcmVhZGluZywgYW5kIHRoZSBsZW5ndGggPCBod20sXG4vLyB0aGVuIGdvIGFoZWFkIGFuZCB0cnkgdG8gcmVhZCBzb21lIG1vcmUgcHJlZW1wdGl2ZWx5LlxuZnVuY3Rpb24gbWF5YmVSZWFkTW9yZShzdHJlYW0sIHN0YXRlKSB7XG4gIGlmICghc3RhdGUucmVhZGluZ01vcmUpIHtcbiAgICBzdGF0ZS5yZWFkaW5nTW9yZSA9IHRydWU7XG4gICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbGVuID0gc3RhdGUubGVuZ3RoO1xuICB3aGlsZSAoIXN0YXRlLnJlYWRpbmcgJiYgIXN0YXRlLmZsb3dpbmcgJiYgIXN0YXRlLmVuZGVkICYmXG4gICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrKSB7XG4gICAgc3RyZWFtLnJlYWQoMCk7XG4gICAgaWYgKGxlbiA9PT0gc3RhdGUubGVuZ3RoKVxuICAgICAgLy8gZGlkbid0IGdldCBhbnkgZGF0YSwgc3RvcCBzcGlubmluZy5cbiAgICAgIGJyZWFrO1xuICAgIGVsc2VcbiAgICAgIGxlbiA9IHN0YXRlLmxlbmd0aDtcbiAgfVxuICBzdGF0ZS5yZWFkaW5nTW9yZSA9IGZhbHNlO1xufVxuXG4vLyBhYnN0cmFjdCBtZXRob2QuICB0byBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGNsYXNzZXMuXG4vLyBjYWxsIGNiKGVyLCBkYXRhKSB3aGVyZSBkYXRhIGlzIDw9IG4gaW4gbGVuZ3RoLlxuLy8gZm9yIHZpcnR1YWwgKG5vbi1zdHJpbmcsIG5vbi1idWZmZXIpIHN0cmVhbXMsIFwibGVuZ3RoXCIgaXMgc29tZXdoYXRcbi8vIGFyYml0cmFyeSwgYW5kIHBlcmhhcHMgbm90IHZlcnkgbWVhbmluZ2Z1bC5cblJlYWRhYmxlLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xufTtcblxuUmVhZGFibGUucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBwaXBlT3B0cykge1xuICB2YXIgc3JjID0gdGhpcztcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICBzd2l0Y2ggKHN0YXRlLnBpcGVzQ291bnQpIHtcbiAgICBjYXNlIDA6XG4gICAgICBzdGF0ZS5waXBlcyA9IGRlc3Q7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzdGF0ZS5waXBlcyA9IFtzdGF0ZS5waXBlcywgZGVzdF07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgc3RhdGUucGlwZXMucHVzaChkZXN0KTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHN0YXRlLnBpcGVzQ291bnQgKz0gMTtcblxuICB2YXIgZG9FbmQgPSAoIXBpcGVPcHRzIHx8IHBpcGVPcHRzLmVuZCAhPT0gZmFsc2UpICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3Rkb3V0ICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3RkZXJyO1xuXG4gIHZhciBlbmRGbiA9IGRvRW5kID8gb25lbmQgOiBjbGVhbnVwO1xuICBpZiAoc3RhdGUuZW5kRW1pdHRlZClcbiAgICBzZXRJbW1lZGlhdGUoZW5kRm4pO1xuICBlbHNlXG4gICAgc3JjLm9uY2UoJ2VuZCcsIGVuZEZuKTtcblxuICBkZXN0Lm9uKCd1bnBpcGUnLCBvbnVucGlwZSk7XG4gIGZ1bmN0aW9uIG9udW5waXBlKHJlYWRhYmxlKSB7XG4gICAgaWYgKHJlYWRhYmxlICE9PSBzcmMpIHJldHVybjtcbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbmVuZCgpIHtcbiAgICBkZXN0LmVuZCgpO1xuICB9XG5cbiAgLy8gd2hlbiB0aGUgZGVzdCBkcmFpbnMsIGl0IHJlZHVjZXMgdGhlIGF3YWl0RHJhaW4gY291bnRlclxuICAvLyBvbiB0aGUgc291cmNlLiAgVGhpcyB3b3VsZCBiZSBtb3JlIGVsZWdhbnQgd2l0aCBhIC5vbmNlKClcbiAgLy8gaGFuZGxlciBpbiBmbG93KCksIGJ1dCBhZGRpbmcgYW5kIHJlbW92aW5nIHJlcGVhdGVkbHkgaXNcbiAgLy8gdG9vIHNsb3cuXG4gIHZhciBvbmRyYWluID0gcGlwZU9uRHJhaW4oc3JjKTtcbiAgZGVzdC5vbignZHJhaW4nLCBvbmRyYWluKTtcblxuICBmdW5jdGlvbiBjbGVhbnVwKCkge1xuICAgIC8vIGNsZWFudXAgZXZlbnQgaGFuZGxlcnMgb25jZSB0aGUgcGlwZSBpcyBicm9rZW5cbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcigndW5waXBlJywgb251bnBpcGUpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgb25lbmQpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG5cbiAgICAvLyBpZiB0aGUgcmVhZGVyIGlzIHdhaXRpbmcgZm9yIGEgZHJhaW4gZXZlbnQgZnJvbSB0aGlzXG4gICAgLy8gc3BlY2lmaWMgd3JpdGVyLCB0aGVuIGl0IHdvdWxkIGNhdXNlIGl0IHRvIG5ldmVyIHN0YXJ0XG4gICAgLy8gZmxvd2luZyBhZ2Fpbi5cbiAgICAvLyBTbywgaWYgdGhpcyBpcyBhd2FpdGluZyBhIGRyYWluLCB0aGVuIHdlIGp1c3QgY2FsbCBpdCBub3cuXG4gICAgLy8gSWYgd2UgZG9uJ3Qga25vdywgdGhlbiBhc3N1bWUgdGhhdCB3ZSBhcmUgd2FpdGluZyBmb3Igb25lLlxuICAgIGlmICghZGVzdC5fd3JpdGFibGVTdGF0ZSB8fCBkZXN0Ll93cml0YWJsZVN0YXRlLm5lZWREcmFpbilcbiAgICAgIG9uZHJhaW4oKTtcbiAgfVxuXG4gIC8vIGlmIHRoZSBkZXN0IGhhcyBhbiBlcnJvciwgdGhlbiBzdG9wIHBpcGluZyBpbnRvIGl0LlxuICAvLyBob3dldmVyLCBkb24ndCBzdXBwcmVzcyB0aGUgdGhyb3dpbmcgYmVoYXZpb3IgZm9yIHRoaXMuXG4gIC8vIGNoZWNrIGZvciBsaXN0ZW5lcnMgYmVmb3JlIGVtaXQgcmVtb3ZlcyBvbmUtdGltZSBsaXN0ZW5lcnMuXG4gIHZhciBlcnJMaXN0ZW5lcnMgPSBFRS5saXN0ZW5lckNvdW50KGRlc3QsICdlcnJvcicpO1xuICBmdW5jdGlvbiBvbmVycm9yKGVyKSB7XG4gICAgdW5waXBlKCk7XG4gICAgaWYgKGVyckxpc3RlbmVycyA9PT0gMCAmJiBFRS5saXN0ZW5lckNvdW50KGRlc3QsICdlcnJvcicpID09PSAwKVxuICAgICAgZGVzdC5lbWl0KCdlcnJvcicsIGVyKTtcbiAgfVxuICBkZXN0Lm9uY2UoJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgLy8gQm90aCBjbG9zZSBhbmQgZmluaXNoIHNob3VsZCB0cmlnZ2VyIHVucGlwZSwgYnV0IG9ubHkgb25jZS5cbiAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG4gICAgdW5waXBlKCk7XG4gIH1cbiAgZGVzdC5vbmNlKCdjbG9zZScsIG9uY2xvc2UpO1xuICBmdW5jdGlvbiBvbmZpbmlzaCgpIHtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuICAgIHVucGlwZSgpO1xuICB9XG4gIGRlc3Qub25jZSgnZmluaXNoJywgb25maW5pc2gpO1xuXG4gIGZ1bmN0aW9uIHVucGlwZSgpIHtcbiAgICBzcmMudW5waXBlKGRlc3QpO1xuICB9XG5cbiAgLy8gdGVsbCB0aGUgZGVzdCB0aGF0IGl0J3MgYmVpbmcgcGlwZWQgdG9cbiAgZGVzdC5lbWl0KCdwaXBlJywgc3JjKTtcblxuICAvLyBzdGFydCB0aGUgZmxvdyBpZiBpdCBoYXNuJ3QgYmVlbiBzdGFydGVkIGFscmVhZHkuXG4gIGlmICghc3RhdGUuZmxvd2luZykge1xuICAgIC8vIHRoZSBoYW5kbGVyIHRoYXQgd2FpdHMgZm9yIHJlYWRhYmxlIGV2ZW50cyBhZnRlciBhbGxcbiAgICAvLyB0aGUgZGF0YSBnZXRzIHN1Y2tlZCBvdXQgaW4gZmxvdy5cbiAgICAvLyBUaGlzIHdvdWxkIGJlIGVhc2llciB0byBmb2xsb3cgd2l0aCBhIC5vbmNlKCkgaGFuZGxlclxuICAgIC8vIGluIGZsb3coKSwgYnV0IHRoYXQgaXMgdG9vIHNsb3cuXG4gICAgdGhpcy5vbigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG5cbiAgICBzdGF0ZS5mbG93aW5nID0gdHJ1ZTtcbiAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICBmbG93KHNyYyk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZGVzdDtcbn07XG5cbmZ1bmN0aW9uIHBpcGVPbkRyYWluKHNyYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlc3QgPSB0aGlzO1xuICAgIHZhciBzdGF0ZSA9IHNyYy5fcmVhZGFibGVTdGF0ZTtcbiAgICBzdGF0ZS5hd2FpdERyYWluLS07XG4gICAgaWYgKHN0YXRlLmF3YWl0RHJhaW4gPT09IDApXG4gICAgICBmbG93KHNyYyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGZsb3coc3JjKSB7XG4gIHZhciBzdGF0ZSA9IHNyYy5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIGNodW5rO1xuICBzdGF0ZS5hd2FpdERyYWluID0gMDtcblxuICBmdW5jdGlvbiB3cml0ZShkZXN0LCBpLCBsaXN0KSB7XG4gICAgdmFyIHdyaXR0ZW4gPSBkZXN0LndyaXRlKGNodW5rKTtcbiAgICBpZiAoZmFsc2UgPT09IHdyaXR0ZW4pIHtcbiAgICAgIHN0YXRlLmF3YWl0RHJhaW4rKztcbiAgICB9XG4gIH1cblxuICB3aGlsZSAoc3RhdGUucGlwZXNDb3VudCAmJiBudWxsICE9PSAoY2h1bmsgPSBzcmMucmVhZCgpKSkge1xuXG4gICAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpXG4gICAgICB3cml0ZShzdGF0ZS5waXBlcywgMCwgbnVsbCk7XG4gICAgZWxzZVxuICAgICAgZm9yRWFjaChzdGF0ZS5waXBlcywgd3JpdGUpO1xuXG4gICAgc3JjLmVtaXQoJ2RhdGEnLCBjaHVuayk7XG5cbiAgICAvLyBpZiBhbnlvbmUgbmVlZHMgYSBkcmFpbiwgdGhlbiB3ZSBoYXZlIHRvIHdhaXQgZm9yIHRoYXQuXG4gICAgaWYgKHN0YXRlLmF3YWl0RHJhaW4gPiAwKVxuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaWYgZXZlcnkgZGVzdGluYXRpb24gd2FzIHVucGlwZWQsIGVpdGhlciBiZWZvcmUgZW50ZXJpbmcgdGhpc1xuICAvLyBmdW5jdGlvbiwgb3IgaW4gdGhlIHdoaWxlIGxvb3AsIHRoZW4gc3RvcCBmbG93aW5nLlxuICAvL1xuICAvLyBOQjogVGhpcyBpcyBhIHByZXR0eSByYXJlIGVkZ2UgY2FzZS5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDApIHtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG5cbiAgICAvLyBpZiB0aGVyZSB3ZXJlIGRhdGEgZXZlbnQgbGlzdGVuZXJzIGFkZGVkLCB0aGVuIHN3aXRjaCB0byBvbGQgbW9kZS5cbiAgICBpZiAoRUUubGlzdGVuZXJDb3VudChzcmMsICdkYXRhJykgPiAwKVxuICAgICAgZW1pdERhdGFFdmVudHMoc3JjKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBhdCB0aGlzIHBvaW50LCBubyBvbmUgbmVlZGVkIGEgZHJhaW4sIHNvIHdlIGp1c3QgcmFuIG91dCBvZiBkYXRhXG4gIC8vIG9uIHRoZSBuZXh0IHJlYWRhYmxlIGV2ZW50LCBzdGFydCBpdCBvdmVyIGFnYWluLlxuICBzdGF0ZS5yYW5PdXQgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBwaXBlT25SZWFkYWJsZSgpIHtcbiAgaWYgKHRoaXMuX3JlYWRhYmxlU3RhdGUucmFuT3V0KSB7XG4gICAgdGhpcy5fcmVhZGFibGVTdGF0ZS5yYW5PdXQgPSBmYWxzZTtcbiAgICBmbG93KHRoaXMpO1xuICB9XG59XG5cblxuUmVhZGFibGUucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uKGRlc3QpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICAvLyBpZiB3ZSdyZSBub3QgcGlwaW5nIGFueXdoZXJlLCB0aGVuIGRvIG5vdGhpbmcuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAwKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIGp1c3Qgb25lIGRlc3RpbmF0aW9uLiAgbW9zdCBjb21tb24gY2FzZS5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpIHtcbiAgICAvLyBwYXNzZWQgaW4gb25lLCBidXQgaXQncyBub3QgdGhlIHJpZ2h0IG9uZS5cbiAgICBpZiAoZGVzdCAmJiBkZXN0ICE9PSBzdGF0ZS5waXBlcylcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKCFkZXN0KVxuICAgICAgZGVzdCA9IHN0YXRlLnBpcGVzO1xuXG4gICAgLy8gZ290IGEgbWF0Y2guXG4gICAgc3RhdGUucGlwZXMgPSBudWxsO1xuICAgIHN0YXRlLnBpcGVzQ291bnQgPSAwO1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcbiAgICBpZiAoZGVzdClcbiAgICAgIGRlc3QuZW1pdCgndW5waXBlJywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBzbG93IGNhc2UuIG11bHRpcGxlIHBpcGUgZGVzdGluYXRpb25zLlxuXG4gIGlmICghZGVzdCkge1xuICAgIC8vIHJlbW92ZSBhbGwuXG4gICAgdmFyIGRlc3RzID0gc3RhdGUucGlwZXM7XG4gICAgdmFyIGxlbiA9IHN0YXRlLnBpcGVzQ291bnQ7XG4gICAgc3RhdGUucGlwZXMgPSBudWxsO1xuICAgIHN0YXRlLnBpcGVzQ291bnQgPSAwO1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBkZXN0c1tpXS5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHRyeSB0byBmaW5kIHRoZSByaWdodCBvbmUuXG4gIHZhciBpID0gaW5kZXhPZihzdGF0ZS5waXBlcywgZGVzdCk7XG4gIGlmIChpID09PSAtMSlcbiAgICByZXR1cm4gdGhpcztcblxuICBzdGF0ZS5waXBlcy5zcGxpY2UoaSwgMSk7XG4gIHN0YXRlLnBpcGVzQ291bnQgLT0gMTtcbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpXG4gICAgc3RhdGUucGlwZXMgPSBzdGF0ZS5waXBlc1swXTtcblxuICBkZXN0LmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gc2V0IHVwIGRhdGEgZXZlbnRzIGlmIHRoZXkgYXJlIGFza2VkIGZvclxuLy8gRW5zdXJlIHJlYWRhYmxlIGxpc3RlbmVycyBldmVudHVhbGx5IGdldCBzb21ldGhpbmdcblJlYWRhYmxlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2LCBmbikge1xuICB2YXIgcmVzID0gU3RyZWFtLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIGV2LCBmbik7XG5cbiAgaWYgKGV2ID09PSAnZGF0YScgJiYgIXRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZylcbiAgICBlbWl0RGF0YUV2ZW50cyh0aGlzKTtcblxuICBpZiAoZXYgPT09ICdyZWFkYWJsZScgJiYgdGhpcy5yZWFkYWJsZSkge1xuICAgIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKCFzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZykge1xuICAgICAgc3RhdGUucmVhZGFibGVMaXN0ZW5pbmcgPSB0cnVlO1xuICAgICAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgaWYgKCFzdGF0ZS5yZWFkaW5nKSB7XG4gICAgICAgIHRoaXMucmVhZCgwKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGVuZ3RoKSB7XG4gICAgICAgIGVtaXRSZWFkYWJsZSh0aGlzLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5SZWFkYWJsZS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBSZWFkYWJsZS5wcm90b3R5cGUub247XG5cbi8vIHBhdXNlKCkgYW5kIHJlc3VtZSgpIGFyZSByZW1uYW50cyBvZiB0aGUgbGVnYWN5IHJlYWRhYmxlIHN0cmVhbSBBUElcbi8vIElmIHRoZSB1c2VyIHVzZXMgdGhlbSwgdGhlbiBzd2l0Y2ggaW50byBvbGQgbW9kZS5cblJlYWRhYmxlLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgZW1pdERhdGFFdmVudHModGhpcyk7XG4gIHRoaXMucmVhZCgwKTtcbiAgdGhpcy5lbWl0KCdyZXN1bWUnKTtcbn07XG5cblJlYWRhYmxlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICBlbWl0RGF0YUV2ZW50cyh0aGlzLCB0cnVlKTtcbiAgdGhpcy5lbWl0KCdwYXVzZScpO1xufTtcblxuZnVuY3Rpb24gZW1pdERhdGFFdmVudHMoc3RyZWFtLCBzdGFydFBhdXNlZCkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cbiAgaWYgKHN0YXRlLmZsb3dpbmcpIHtcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL3JlYWRhYmxlLXN0cmVhbS9pc3N1ZXMvMTZcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBzd2l0Y2ggdG8gb2xkIG1vZGUgbm93LicpO1xuICB9XG5cbiAgdmFyIHBhdXNlZCA9IHN0YXJ0UGF1c2VkIHx8IGZhbHNlO1xuICB2YXIgcmVhZGFibGUgPSBmYWxzZTtcblxuICAvLyBjb252ZXJ0IHRvIGFuIG9sZC1zdHlsZSBzdHJlYW0uXG4gIHN0cmVhbS5yZWFkYWJsZSA9IHRydWU7XG4gIHN0cmVhbS5waXBlID0gU3RyZWFtLnByb3RvdHlwZS5waXBlO1xuICBzdHJlYW0ub24gPSBzdHJlYW0uYWRkTGlzdGVuZXIgPSBTdHJlYW0ucHJvdG90eXBlLm9uO1xuXG4gIHN0cmVhbS5vbigncmVhZGFibGUnLCBmdW5jdGlvbigpIHtcbiAgICByZWFkYWJsZSA9IHRydWU7XG5cbiAgICB2YXIgYztcbiAgICB3aGlsZSAoIXBhdXNlZCAmJiAobnVsbCAhPT0gKGMgPSBzdHJlYW0ucmVhZCgpKSkpXG4gICAgICBzdHJlYW0uZW1pdCgnZGF0YScsIGMpO1xuXG4gICAgaWYgKGMgPT09IG51bGwpIHtcbiAgICAgIHJlYWRhYmxlID0gZmFsc2U7XG4gICAgICBzdHJlYW0uX3JlYWRhYmxlU3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHN0cmVhbS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhdXNlZCA9IHRydWU7XG4gICAgdGhpcy5lbWl0KCdwYXVzZScpO1xuICB9O1xuXG4gIHN0cmVhbS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgICBwYXVzZWQgPSBmYWxzZTtcbiAgICBpZiAocmVhZGFibGUpXG4gICAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgdGhpcy5yZWFkKDApO1xuICAgIHRoaXMuZW1pdCgncmVzdW1lJyk7XG4gIH07XG5cbiAgLy8gbm93IG1ha2UgaXQgc3RhcnQsIGp1c3QgaW4gY2FzZSBpdCBoYWRuJ3QgYWxyZWFkeS5cbiAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG59XG5cbi8vIHdyYXAgYW4gb2xkLXN0eWxlIHN0cmVhbSBhcyB0aGUgYXN5bmMgZGF0YSBzb3VyY2UuXG4vLyBUaGlzIGlzICpub3QqIHBhcnQgb2YgdGhlIHJlYWRhYmxlIHN0cmVhbSBpbnRlcmZhY2UuXG4vLyBJdCBpcyBhbiB1Z2x5IHVuZm9ydHVuYXRlIG1lc3Mgb2YgaGlzdG9yeS5cblJlYWRhYmxlLnByb3RvdHlwZS53cmFwID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHZhciBwYXVzZWQgPSBmYWxzZTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHN0cmVhbS5vbignZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIXN0YXRlLmVuZGVkKSB7XG4gICAgICB2YXIgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLmVuZCgpO1xuICAgICAgaWYgKGNodW5rICYmIGNodW5rLmxlbmd0aClcbiAgICAgICAgc2VsZi5wdXNoKGNodW5rKTtcbiAgICB9XG5cbiAgICBzZWxmLnB1c2gobnVsbCk7XG4gIH0pO1xuXG4gIHN0cmVhbS5vbignZGF0YScsIGZ1bmN0aW9uKGNodW5rKSB7XG4gICAgaWYgKHN0YXRlLmRlY29kZXIpXG4gICAgICBjaHVuayA9IHN0YXRlLmRlY29kZXIud3JpdGUoY2h1bmspO1xuICAgIGlmICghY2h1bmsgfHwgIXN0YXRlLm9iamVjdE1vZGUgJiYgIWNodW5rLmxlbmd0aClcbiAgICAgIHJldHVybjtcblxuICAgIHZhciByZXQgPSBzZWxmLnB1c2goY2h1bmspO1xuICAgIGlmICghcmV0KSB7XG4gICAgICBwYXVzZWQgPSB0cnVlO1xuICAgICAgc3RyZWFtLnBhdXNlKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBwcm94eSBhbGwgdGhlIG90aGVyIG1ldGhvZHMuXG4gIC8vIGltcG9ydGFudCB3aGVuIHdyYXBwaW5nIGZpbHRlcnMgYW5kIGR1cGxleGVzLlxuICBmb3IgKHZhciBpIGluIHN0cmVhbSkge1xuICAgIGlmICh0eXBlb2Ygc3RyZWFtW2ldID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgIHR5cGVvZiB0aGlzW2ldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpc1tpXSA9IGZ1bmN0aW9uKG1ldGhvZCkgeyByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1bbWV0aG9kXS5hcHBseShzdHJlYW0sIGFyZ3VtZW50cyk7XG4gICAgICB9fShpKTtcbiAgICB9XG4gIH1cblxuICAvLyBwcm94eSBjZXJ0YWluIGltcG9ydGFudCBldmVudHMuXG4gIHZhciBldmVudHMgPSBbJ2Vycm9yJywgJ2Nsb3NlJywgJ2Rlc3Ryb3knLCAncGF1c2UnLCAncmVzdW1lJ107XG4gIGZvckVhY2goZXZlbnRzLCBmdW5jdGlvbihldikge1xuICAgIHN0cmVhbS5vbihldiwgZnVuY3Rpb24gKHgpIHtcbiAgICAgIHJldHVybiBzZWxmLmVtaXQuYXBwbHkoc2VsZiwgZXYsIHgpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyB3aGVuIHdlIHRyeSB0byBjb25zdW1lIHNvbWUgbW9yZSBieXRlcywgc2ltcGx5IHVucGF1c2UgdGhlXG4gIC8vIHVuZGVybHlpbmcgc3RyZWFtLlxuICBzZWxmLl9yZWFkID0gZnVuY3Rpb24obikge1xuICAgIGlmIChwYXVzZWQpIHtcbiAgICAgIHBhdXNlZCA9IGZhbHNlO1xuICAgICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn07XG5cblxuXG4vLyBleHBvc2VkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkuXG5SZWFkYWJsZS5fZnJvbUxpc3QgPSBmcm9tTGlzdDtcblxuLy8gUGx1Y2sgb2ZmIG4gYnl0ZXMgZnJvbSBhbiBhcnJheSBvZiBidWZmZXJzLlxuLy8gTGVuZ3RoIGlzIHRoZSBjb21iaW5lZCBsZW5ndGhzIG9mIGFsbCB0aGUgYnVmZmVycyBpbiB0aGUgbGlzdC5cbmZ1bmN0aW9uIGZyb21MaXN0KG4sIHN0YXRlKSB7XG4gIHZhciBsaXN0ID0gc3RhdGUuYnVmZmVyO1xuICB2YXIgbGVuZ3RoID0gc3RhdGUubGVuZ3RoO1xuICB2YXIgc3RyaW5nTW9kZSA9ICEhc3RhdGUuZGVjb2RlcjtcbiAgdmFyIG9iamVjdE1vZGUgPSAhIXN0YXRlLm9iamVjdE1vZGU7XG4gIHZhciByZXQ7XG5cbiAgLy8gbm90aGluZyBpbiB0aGUgbGlzdCwgZGVmaW5pdGVseSBlbXB0eS5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiBudWxsO1xuXG4gIGlmIChsZW5ndGggPT09IDApXG4gICAgcmV0ID0gbnVsbDtcbiAgZWxzZSBpZiAob2JqZWN0TW9kZSlcbiAgICByZXQgPSBsaXN0LnNoaWZ0KCk7XG4gIGVsc2UgaWYgKCFuIHx8IG4gPj0gbGVuZ3RoKSB7XG4gICAgLy8gcmVhZCBpdCBhbGwsIHRydW5jYXRlIHRoZSBhcnJheS5cbiAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgIHJldCA9IGxpc3Quam9pbignJyk7XG4gICAgZWxzZVxuICAgICAgcmV0ID0gQnVmZmVyLmNvbmNhdChsaXN0LCBsZW5ndGgpO1xuICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgfSBlbHNlIHtcbiAgICAvLyByZWFkIGp1c3Qgc29tZSBvZiBpdC5cbiAgICBpZiAobiA8IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBqdXN0IHRha2UgYSBwYXJ0IG9mIHRoZSBmaXJzdCBsaXN0IGl0ZW0uXG4gICAgICAvLyBzbGljZSBpcyB0aGUgc2FtZSBmb3IgYnVmZmVycyBhbmQgc3RyaW5ncy5cbiAgICAgIHZhciBidWYgPSBsaXN0WzBdO1xuICAgICAgcmV0ID0gYnVmLnNsaWNlKDAsIG4pO1xuICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShuKTtcbiAgICB9IGVsc2UgaWYgKG4gPT09IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBmaXJzdCBsaXN0IGlzIGEgcGVyZmVjdCBtYXRjaFxuICAgICAgcmV0ID0gbGlzdC5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb21wbGV4IGNhc2UuXG4gICAgICAvLyB3ZSBoYXZlIGVub3VnaCB0byBjb3ZlciBpdCwgYnV0IGl0IHNwYW5zIHBhc3QgdGhlIGZpcnN0IGJ1ZmZlci5cbiAgICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgICByZXQgPSAnJztcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0ID0gbmV3IEJ1ZmZlcihuKTtcblxuICAgICAgdmFyIGMgPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGwgJiYgYyA8IG47IGkrKykge1xuICAgICAgICB2YXIgYnVmID0gbGlzdFswXTtcbiAgICAgICAgdmFyIGNweSA9IE1hdGgubWluKG4gLSBjLCBidWYubGVuZ3RoKTtcblxuICAgICAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgICAgICByZXQgKz0gYnVmLnNsaWNlKDAsIGNweSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBidWYuY29weShyZXQsIGMsIDAsIGNweSk7XG5cbiAgICAgICAgaWYgKGNweSA8IGJ1Zi5sZW5ndGgpXG4gICAgICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShjcHkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuXG4gICAgICAgIGMgKz0gY3B5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGVuZFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cbiAgLy8gSWYgd2UgZ2V0IGhlcmUgYmVmb3JlIGNvbnN1bWluZyBhbGwgdGhlIGJ5dGVzLCB0aGVuIHRoYXQgaXMgYVxuICAvLyBidWcgaW4gbm9kZS4gIFNob3VsZCBuZXZlciBoYXBwZW4uXG4gIGlmIChzdGF0ZS5sZW5ndGggPiAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZW5kUmVhZGFibGUgY2FsbGVkIG9uIG5vbi1lbXB0eSBzdHJlYW0nKTtcblxuICBpZiAoIXN0YXRlLmVuZEVtaXR0ZWQgJiYgc3RhdGUuY2FsbGVkUmVhZCkge1xuICAgIHN0YXRlLmVuZGVkID0gdHJ1ZTtcbiAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAvLyBDaGVjayB0aGF0IHdlIGRpZG4ndCBnZXQgb25lIGxhc3QgdW5zaGlmdC5cbiAgICAgIGlmICghc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc3RhdGUuZW5kRW1pdHRlZCA9IHRydWU7XG4gICAgICAgIHN0cmVhbS5yZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgICBzdHJlYW0uZW1pdCgnZW5kJyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZm9yRWFjaCAoeHMsIGYpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmKHhzW2ldLCBpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbmRleE9mICh4cywgeCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmICh4c1tpXSA9PT0geCkgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIitOc2NObVwiKSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gYSB0cmFuc2Zvcm0gc3RyZWFtIGlzIGEgcmVhZGFibGUvd3JpdGFibGUgc3RyZWFtIHdoZXJlIHlvdSBkb1xuLy8gc29tZXRoaW5nIHdpdGggdGhlIGRhdGEuICBTb21ldGltZXMgaXQncyBjYWxsZWQgYSBcImZpbHRlclwiLFxuLy8gYnV0IHRoYXQncyBub3QgYSBncmVhdCBuYW1lIGZvciBpdCwgc2luY2UgdGhhdCBpbXBsaWVzIGEgdGhpbmcgd2hlcmVcbi8vIHNvbWUgYml0cyBwYXNzIHRocm91Z2gsIGFuZCBvdGhlcnMgYXJlIHNpbXBseSBpZ25vcmVkLiAgKFRoYXQgd291bGRcbi8vIGJlIGEgdmFsaWQgZXhhbXBsZSBvZiBhIHRyYW5zZm9ybSwgb2YgY291cnNlLilcbi8vXG4vLyBXaGlsZSB0aGUgb3V0cHV0IGlzIGNhdXNhbGx5IHJlbGF0ZWQgdG8gdGhlIGlucHV0LCBpdCdzIG5vdCBhXG4vLyBuZWNlc3NhcmlseSBzeW1tZXRyaWMgb3Igc3luY2hyb25vdXMgdHJhbnNmb3JtYXRpb24uICBGb3IgZXhhbXBsZSxcbi8vIGEgemxpYiBzdHJlYW0gbWlnaHQgdGFrZSBtdWx0aXBsZSBwbGFpbi10ZXh0IHdyaXRlcygpLCBhbmQgdGhlblxuLy8gZW1pdCBhIHNpbmdsZSBjb21wcmVzc2VkIGNodW5rIHNvbWUgdGltZSBpbiB0aGUgZnV0dXJlLlxuLy9cbi8vIEhlcmUncyBob3cgdGhpcyB3b3Jrczpcbi8vXG4vLyBUaGUgVHJhbnNmb3JtIHN0cmVhbSBoYXMgYWxsIHRoZSBhc3BlY3RzIG9mIHRoZSByZWFkYWJsZSBhbmQgd3JpdGFibGVcbi8vIHN0cmVhbSBjbGFzc2VzLiAgV2hlbiB5b3Ugd3JpdGUoY2h1bmspLCB0aGF0IGNhbGxzIF93cml0ZShjaHVuayxjYilcbi8vIGludGVybmFsbHksIGFuZCByZXR1cm5zIGZhbHNlIGlmIHRoZXJlJ3MgYSBsb3Qgb2YgcGVuZGluZyB3cml0ZXNcbi8vIGJ1ZmZlcmVkIHVwLiAgV2hlbiB5b3UgY2FsbCByZWFkKCksIHRoYXQgY2FsbHMgX3JlYWQobikgdW50aWxcbi8vIHRoZXJlJ3MgZW5vdWdoIHBlbmRpbmcgcmVhZGFibGUgZGF0YSBidWZmZXJlZCB1cC5cbi8vXG4vLyBJbiBhIHRyYW5zZm9ybSBzdHJlYW0sIHRoZSB3cml0dGVuIGRhdGEgaXMgcGxhY2VkIGluIGEgYnVmZmVyLiAgV2hlblxuLy8gX3JlYWQobikgaXMgY2FsbGVkLCBpdCB0cmFuc2Zvcm1zIHRoZSBxdWV1ZWQgdXAgZGF0YSwgY2FsbGluZyB0aGVcbi8vIGJ1ZmZlcmVkIF93cml0ZSBjYidzIGFzIGl0IGNvbnN1bWVzIGNodW5rcy4gIElmIGNvbnN1bWluZyBhIHNpbmdsZVxuLy8gd3JpdHRlbiBjaHVuayB3b3VsZCByZXN1bHQgaW4gbXVsdGlwbGUgb3V0cHV0IGNodW5rcywgdGhlbiB0aGUgZmlyc3Rcbi8vIG91dHB1dHRlZCBiaXQgY2FsbHMgdGhlIHJlYWRjYiwgYW5kIHN1YnNlcXVlbnQgY2h1bmtzIGp1c3QgZ28gaW50b1xuLy8gdGhlIHJlYWQgYnVmZmVyLCBhbmQgd2lsbCBjYXVzZSBpdCB0byBlbWl0ICdyZWFkYWJsZScgaWYgbmVjZXNzYXJ5LlxuLy9cbi8vIFRoaXMgd2F5LCBiYWNrLXByZXNzdXJlIGlzIGFjdHVhbGx5IGRldGVybWluZWQgYnkgdGhlIHJlYWRpbmcgc2lkZSxcbi8vIHNpbmNlIF9yZWFkIGhhcyB0byBiZSBjYWxsZWQgdG8gc3RhcnQgcHJvY2Vzc2luZyBhIG5ldyBjaHVuay4gIEhvd2V2ZXIsXG4vLyBhIHBhdGhvbG9naWNhbCBpbmZsYXRlIHR5cGUgb2YgdHJhbnNmb3JtIGNhbiBjYXVzZSBleGNlc3NpdmUgYnVmZmVyaW5nXG4vLyBoZXJlLiAgRm9yIGV4YW1wbGUsIGltYWdpbmUgYSBzdHJlYW0gd2hlcmUgZXZlcnkgYnl0ZSBvZiBpbnB1dCBpc1xuLy8gaW50ZXJwcmV0ZWQgYXMgYW4gaW50ZWdlciBmcm9tIDAtMjU1LCBhbmQgdGhlbiByZXN1bHRzIGluIHRoYXQgbWFueVxuLy8gYnl0ZXMgb2Ygb3V0cHV0LiAgV3JpdGluZyB0aGUgNCBieXRlcyB7ZmYsZmYsZmYsZmZ9IHdvdWxkIHJlc3VsdCBpblxuLy8gMWtiIG9mIGRhdGEgYmVpbmcgb3V0cHV0LiAgSW4gdGhpcyBjYXNlLCB5b3UgY291bGQgd3JpdGUgYSB2ZXJ5IHNtYWxsXG4vLyBhbW91bnQgb2YgaW5wdXQsIGFuZCBlbmQgdXAgd2l0aCBhIHZlcnkgbGFyZ2UgYW1vdW50IG9mIG91dHB1dC4gIEluXG4vLyBzdWNoIGEgcGF0aG9sb2dpY2FsIGluZmxhdGluZyBtZWNoYW5pc20sIHRoZXJlJ2QgYmUgbm8gd2F5IHRvIHRlbGxcbi8vIHRoZSBzeXN0ZW0gdG8gc3RvcCBkb2luZyB0aGUgdHJhbnNmb3JtLiAgQSBzaW5nbGUgNE1CIHdyaXRlIGNvdWxkXG4vLyBjYXVzZSB0aGUgc3lzdGVtIHRvIHJ1biBvdXQgb2YgbWVtb3J5LlxuLy9cbi8vIEhvd2V2ZXIsIGV2ZW4gaW4gc3VjaCBhIHBhdGhvbG9naWNhbCBjYXNlLCBvbmx5IGEgc2luZ2xlIHdyaXR0ZW4gY2h1bmtcbi8vIHdvdWxkIGJlIGNvbnN1bWVkLCBhbmQgdGhlbiB0aGUgcmVzdCB3b3VsZCB3YWl0ICh1bi10cmFuc2Zvcm1lZCkgdW50aWxcbi8vIHRoZSByZXN1bHRzIG9mIHRoZSBwcmV2aW91cyB0cmFuc2Zvcm1lZCBjaHVuayB3ZXJlIGNvbnN1bWVkLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcblxudmFyIER1cGxleCA9IHJlcXVpcmUoJy4vZHVwbGV4LmpzJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuaW5oZXJpdHMoVHJhbnNmb3JtLCBEdXBsZXgpO1xuXG5cbmZ1bmN0aW9uIFRyYW5zZm9ybVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICB0aGlzLmFmdGVyVHJhbnNmb3JtID0gZnVuY3Rpb24oZXIsIGRhdGEpIHtcbiAgICByZXR1cm4gYWZ0ZXJUcmFuc2Zvcm0oc3RyZWFtLCBlciwgZGF0YSk7XG4gIH07XG5cbiAgdGhpcy5uZWVkVHJhbnNmb3JtID0gZmFsc2U7XG4gIHRoaXMudHJhbnNmb3JtaW5nID0gZmFsc2U7XG4gIHRoaXMud3JpdGVjYiA9IG51bGw7XG4gIHRoaXMud3JpdGVjaHVuayA9IG51bGw7XG59XG5cbmZ1bmN0aW9uIGFmdGVyVHJhbnNmb3JtKHN0cmVhbSwgZXIsIGRhdGEpIHtcbiAgdmFyIHRzID0gc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZTtcbiAgdHMudHJhbnNmb3JtaW5nID0gZmFsc2U7XG5cbiAgdmFyIGNiID0gdHMud3JpdGVjYjtcblxuICBpZiAoIWNiKVxuICAgIHJldHVybiBzdHJlYW0uZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ25vIHdyaXRlY2IgaW4gVHJhbnNmb3JtIGNsYXNzJykpO1xuXG4gIHRzLndyaXRlY2h1bmsgPSBudWxsO1xuICB0cy53cml0ZWNiID0gbnVsbDtcblxuICBpZiAoZGF0YSAhPT0gbnVsbCAmJiBkYXRhICE9PSB1bmRlZmluZWQpXG4gICAgc3RyZWFtLnB1c2goZGF0YSk7XG5cbiAgaWYgKGNiKVxuICAgIGNiKGVyKTtcblxuICB2YXIgcnMgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHJzLnJlYWRpbmcgPSBmYWxzZTtcbiAgaWYgKHJzLm5lZWRSZWFkYWJsZSB8fCBycy5sZW5ndGggPCBycy5oaWdoV2F0ZXJNYXJrKSB7XG4gICAgc3RyZWFtLl9yZWFkKHJzLmhpZ2hXYXRlck1hcmspO1xuICB9XG59XG5cblxuZnVuY3Rpb24gVHJhbnNmb3JtKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFRyYW5zZm9ybSkpXG4gICAgcmV0dXJuIG5ldyBUcmFuc2Zvcm0ob3B0aW9ucyk7XG5cbiAgRHVwbGV4LmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgdmFyIHRzID0gdGhpcy5fdHJhbnNmb3JtU3RhdGUgPSBuZXcgVHJhbnNmb3JtU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gd2hlbiB0aGUgd3JpdGFibGUgc2lkZSBmaW5pc2hlcywgdGhlbiBmbHVzaCBvdXQgYW55dGhpbmcgcmVtYWluaW5nLlxuICB2YXIgc3RyZWFtID0gdGhpcztcblxuICAvLyBzdGFydCBvdXQgYXNraW5nIGZvciBhIHJlYWRhYmxlIGV2ZW50IG9uY2UgZGF0YSBpcyB0cmFuc2Zvcm1lZC5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuXG4gIC8vIHdlIGhhdmUgaW1wbGVtZW50ZWQgdGhlIF9yZWFkIG1ldGhvZCwgYW5kIGRvbmUgdGhlIG90aGVyIHRoaW5nc1xuICAvLyB0aGF0IFJlYWRhYmxlIHdhbnRzIGJlZm9yZSB0aGUgZmlyc3QgX3JlYWQgY2FsbCwgc28gdW5zZXQgdGhlXG4gIC8vIHN5bmMgZ3VhcmQgZmxhZy5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5zeW5jID0gZmFsc2U7XG5cbiAgdGhpcy5vbmNlKCdmaW5pc2gnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXMuX2ZsdXNoKVxuICAgICAgdGhpcy5fZmx1c2goZnVuY3Rpb24oZXIpIHtcbiAgICAgICAgZG9uZShzdHJlYW0sIGVyKTtcbiAgICAgIH0pO1xuICAgIGVsc2VcbiAgICAgIGRvbmUoc3RyZWFtKTtcbiAgfSk7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZykge1xuICB0aGlzLl90cmFuc2Zvcm1TdGF0ZS5uZWVkVHJhbnNmb3JtID0gZmFsc2U7XG4gIHJldHVybiBEdXBsZXgucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCBjaHVuaywgZW5jb2RpbmcpO1xufTtcblxuLy8gVGhpcyBpcyB0aGUgcGFydCB3aGVyZSB5b3UgZG8gc3R1ZmYhXG4vLyBvdmVycmlkZSB0aGlzIGZ1bmN0aW9uIGluIGltcGxlbWVudGF0aW9uIGNsYXNzZXMuXG4vLyAnY2h1bmsnIGlzIGFuIGlucHV0IGNodW5rLlxuLy9cbi8vIENhbGwgYHB1c2gobmV3Q2h1bmspYCB0byBwYXNzIGFsb25nIHRyYW5zZm9ybWVkIG91dHB1dFxuLy8gdG8gdGhlIHJlYWRhYmxlIHNpZGUuICBZb3UgbWF5IGNhbGwgJ3B1c2gnIHplcm8gb3IgbW9yZSB0aW1lcy5cbi8vXG4vLyBDYWxsIGBjYihlcnIpYCB3aGVuIHlvdSBhcmUgZG9uZSB3aXRoIHRoaXMgY2h1bmsuICBJZiB5b3UgcGFzc1xuLy8gYW4gZXJyb3IsIHRoZW4gdGhhdCdsbCBwdXQgdGhlIGh1cnQgb24gdGhlIHdob2xlIG9wZXJhdGlvbi4gIElmIHlvdVxuLy8gbmV2ZXIgY2FsbCBjYigpLCB0aGVuIHlvdSdsbCBuZXZlciBnZXQgYW5vdGhlciBjaHVuay5cblRyYW5zZm9ybS5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZTtcbiAgdHMud3JpdGVjYiA9IGNiO1xuICB0cy53cml0ZWNodW5rID0gY2h1bms7XG4gIHRzLndyaXRlZW5jb2RpbmcgPSBlbmNvZGluZztcbiAgaWYgKCF0cy50cmFuc2Zvcm1pbmcpIHtcbiAgICB2YXIgcnMgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICAgIGlmICh0cy5uZWVkVHJhbnNmb3JtIHx8XG4gICAgICAgIHJzLm5lZWRSZWFkYWJsZSB8fFxuICAgICAgICBycy5sZW5ndGggPCBycy5oaWdoV2F0ZXJNYXJrKVxuICAgICAgdGhpcy5fcmVhZChycy5oaWdoV2F0ZXJNYXJrKTtcbiAgfVxufTtcblxuLy8gRG9lc24ndCBtYXR0ZXIgd2hhdCB0aGUgYXJncyBhcmUgaGVyZS5cbi8vIF90cmFuc2Zvcm0gZG9lcyBhbGwgdGhlIHdvcmsuXG4vLyBUaGF0IHdlIGdvdCBoZXJlIG1lYW5zIHRoYXQgdGhlIHJlYWRhYmxlIHNpZGUgd2FudHMgbW9yZSBkYXRhLlxuVHJhbnNmb3JtLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdmFyIHRzID0gdGhpcy5fdHJhbnNmb3JtU3RhdGU7XG5cbiAgaWYgKHRzLndyaXRlY2h1bmsgJiYgdHMud3JpdGVjYiAmJiAhdHMudHJhbnNmb3JtaW5nKSB7XG4gICAgdHMudHJhbnNmb3JtaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl90cmFuc2Zvcm0odHMud3JpdGVjaHVuaywgdHMud3JpdGVlbmNvZGluZywgdHMuYWZ0ZXJUcmFuc2Zvcm0pO1xuICB9IGVsc2Uge1xuICAgIC8vIG1hcmsgdGhhdCB3ZSBuZWVkIGEgdHJhbnNmb3JtLCBzbyB0aGF0IGFueSBkYXRhIHRoYXQgY29tZXMgaW5cbiAgICAvLyB3aWxsIGdldCBwcm9jZXNzZWQsIG5vdyB0aGF0IHdlJ3ZlIGFza2VkIGZvciBpdC5cbiAgICB0cy5uZWVkVHJhbnNmb3JtID0gdHJ1ZTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBkb25lKHN0cmVhbSwgZXIpIHtcbiAgaWYgKGVyKVxuICAgIHJldHVybiBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG5cbiAgLy8gaWYgdGhlcmUncyBub3RoaW5nIGluIHRoZSB3cml0ZSBidWZmZXIsIHRoZW4gdGhhdCBtZWFuc1xuICAvLyB0aGF0IG5vdGhpbmcgbW9yZSB3aWxsIGV2ZXIgYmUgcHJvdmlkZWRcbiAgdmFyIHdzID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuICB2YXIgcnMgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHZhciB0cyA9IHN0cmVhbS5fdHJhbnNmb3JtU3RhdGU7XG5cbiAgaWYgKHdzLmxlbmd0aClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxpbmcgdHJhbnNmb3JtIGRvbmUgd2hlbiB3cy5sZW5ndGggIT0gMCcpO1xuXG4gIGlmICh0cy50cmFuc2Zvcm1pbmcpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gc3RpbGwgdHJhbnNmb3JtaW5nJyk7XG5cbiAgcmV0dXJuIHN0cmVhbS5wdXNoKG51bGwpO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIEEgYml0IHNpbXBsZXIgdGhhbiByZWFkYWJsZSBzdHJlYW1zLlxuLy8gSW1wbGVtZW50IGFuIGFzeW5jIC5fd3JpdGUoY2h1bmssIGNiKSwgYW5kIGl0J2xsIGhhbmRsZSBhbGxcbi8vIHRoZSBkcmFpbiBldmVudCBlbWlzc2lvbiBhbmQgYnVmZmVyaW5nLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyaXRhYmxlO1xuV3JpdGFibGUuV3JpdGFibGVTdGF0ZSA9IFdyaXRhYmxlU3RhdGU7XG5cbnZhciBpc1VpbnQ4QXJyYXkgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCdcbiAgPyBmdW5jdGlvbiAoeCkgeyByZXR1cm4geCBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgfVxuICA6IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC5jb25zdHJ1Y3RvciAmJiB4LmNvbnN0cnVjdG9yLm5hbWUgPT09ICdVaW50OEFycmF5J1xuICB9XG47XG52YXIgaXNBcnJheUJ1ZmZlciA9IHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCdcbiAgPyBmdW5jdGlvbiAoeCkgeyByZXR1cm4geCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIH1cbiAgOiBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiB4ICYmIHguY29uc3RydWN0b3IgJiYgeC5jb25zdHJ1Y3Rvci5uYW1lID09PSAnQXJyYXlCdWZmZXInXG4gIH1cbjtcblxudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbnZhciBTdHJlYW0gPSByZXF1aXJlKCcuL2luZGV4LmpzJyk7XG52YXIgc2V0SW1tZWRpYXRlID0gcmVxdWlyZSgncHJvY2Vzcy9icm93c2VyLmpzJykubmV4dFRpY2s7XG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG5pbmhlcml0cyhXcml0YWJsZSwgU3RyZWFtKTtcblxuZnVuY3Rpb24gV3JpdGVSZXEoY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB0aGlzLmNodW5rID0gY2h1bms7XG4gIHRoaXMuZW5jb2RpbmcgPSBlbmNvZGluZztcbiAgdGhpcy5jYWxsYmFjayA9IGNiO1xufVxuXG5mdW5jdGlvbiBXcml0YWJsZVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyB0aGUgcG9pbnQgYXQgd2hpY2ggd3JpdGUoKSBzdGFydHMgcmV0dXJuaW5nIGZhbHNlXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgdGhhdCB3ZSBhbHdheXMgcmV0dXJuIGZhbHNlIGlmXG4gIC8vIHRoZSBlbnRpcmUgYnVmZmVyIGlzIG5vdCBmbHVzaGVkIGltbWVkaWF0ZWx5IG9uIHdyaXRlKClcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogMTYgKiAxMDI0O1xuXG4gIC8vIG9iamVjdCBzdHJlYW0gZmxhZyB0byBpbmRpY2F0ZSB3aGV0aGVyIG9yIG5vdCB0aGlzIHN0cmVhbVxuICAvLyBjb250YWlucyBidWZmZXJzIG9yIG9iamVjdHMuXG4gIHRoaXMub2JqZWN0TW9kZSA9ICEhb3B0aW9ucy5vYmplY3RNb2RlO1xuXG4gIC8vIGNhc3QgdG8gaW50cy5cbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gfn50aGlzLmhpZ2hXYXRlck1hcms7XG5cbiAgdGhpcy5uZWVkRHJhaW4gPSBmYWxzZTtcbiAgLy8gYXQgdGhlIHN0YXJ0IG9mIGNhbGxpbmcgZW5kKClcbiAgdGhpcy5lbmRpbmcgPSBmYWxzZTtcbiAgLy8gd2hlbiBlbmQoKSBoYXMgYmVlbiBjYWxsZWQsIGFuZCByZXR1cm5lZFxuICB0aGlzLmVuZGVkID0gZmFsc2U7XG4gIC8vIHdoZW4gJ2ZpbmlzaCcgaXMgZW1pdHRlZFxuICB0aGlzLmZpbmlzaGVkID0gZmFsc2U7XG5cbiAgLy8gc2hvdWxkIHdlIGRlY29kZSBzdHJpbmdzIGludG8gYnVmZmVycyBiZWZvcmUgcGFzc2luZyB0byBfd3JpdGU/XG4gIC8vIHRoaXMgaXMgaGVyZSBzbyB0aGF0IHNvbWUgbm9kZS1jb3JlIHN0cmVhbXMgY2FuIG9wdGltaXplIHN0cmluZ1xuICAvLyBoYW5kbGluZyBhdCBhIGxvd2VyIGxldmVsLlxuICB2YXIgbm9EZWNvZGUgPSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPT09IGZhbHNlO1xuICB0aGlzLmRlY29kZVN0cmluZ3MgPSAhbm9EZWNvZGU7XG5cbiAgLy8gQ3J5cHRvIGlzIGtpbmQgb2Ygb2xkIGFuZCBjcnVzdHkuICBIaXN0b3JpY2FsbHksIGl0cyBkZWZhdWx0IHN0cmluZ1xuICAvLyBlbmNvZGluZyBpcyAnYmluYXJ5JyBzbyB3ZSBoYXZlIHRvIG1ha2UgdGhpcyBjb25maWd1cmFibGUuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiB0aGUgdW5pdmVyc2UgdXNlcyAndXRmOCcsIHRob3VnaC5cbiAgdGhpcy5kZWZhdWx0RW5jb2RpbmcgPSBvcHRpb25zLmRlZmF1bHRFbmNvZGluZyB8fCAndXRmOCc7XG5cbiAgLy8gbm90IGFuIGFjdHVhbCBidWZmZXIgd2Uga2VlcCB0cmFjayBvZiwgYnV0IGEgbWVhc3VyZW1lbnRcbiAgLy8gb2YgaG93IG11Y2ggd2UncmUgd2FpdGluZyB0byBnZXQgcHVzaGVkIHRvIHNvbWUgdW5kZXJseWluZ1xuICAvLyBzb2NrZXQgb3IgZmlsZS5cbiAgdGhpcy5sZW5ndGggPSAwO1xuXG4gIC8vIGEgZmxhZyB0byBzZWUgd2hlbiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGEgd3JpdGUuXG4gIHRoaXMud3JpdGluZyA9IGZhbHNlO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWN1YXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIGEgZmxhZyB0byBrbm93IGlmIHdlJ3JlIHByb2Nlc3NpbmcgcHJldmlvdXNseSBidWZmZXJlZCBpdGVtcywgd2hpY2hcbiAgLy8gbWF5IGNhbGwgdGhlIF93cml0ZSgpIGNhbGxiYWNrIGluIHRoZSBzYW1lIHRpY2ssIHNvIHRoYXQgd2UgZG9uJ3RcbiAgLy8gZW5kIHVwIGluIGFuIG92ZXJsYXBwZWQgb253cml0ZSBzaXR1YXRpb24uXG4gIHRoaXMuYnVmZmVyUHJvY2Vzc2luZyA9IGZhbHNlO1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0J3MgcGFzc2VkIHRvIF93cml0ZShjaHVuayxjYilcbiAgdGhpcy5vbndyaXRlID0gZnVuY3Rpb24oZXIpIHtcbiAgICBvbndyaXRlKHN0cmVhbSwgZXIpO1xuICB9O1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0IHRoZSB1c2VyIHN1cHBsaWVzIHRvIHdyaXRlKGNodW5rLGVuY29kaW5nLGNiKVxuICB0aGlzLndyaXRlY2IgPSBudWxsO1xuXG4gIC8vIHRoZSBhbW91bnQgdGhhdCBpcyBiZWluZyB3cml0dGVuIHdoZW4gX3dyaXRlIGlzIGNhbGxlZC5cbiAgdGhpcy53cml0ZWxlbiA9IDA7XG5cbiAgdGhpcy5idWZmZXIgPSBbXTtcbn1cblxuZnVuY3Rpb24gV3JpdGFibGUob3B0aW9ucykge1xuICAvLyBXcml0YWJsZSBjdG9yIGlzIGFwcGxpZWQgdG8gRHVwbGV4ZXMsIHRob3VnaCB0aGV5J3JlIG5vdFxuICAvLyBpbnN0YW5jZW9mIFdyaXRhYmxlLCB0aGV5J3JlIGluc3RhbmNlb2YgUmVhZGFibGUuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXcml0YWJsZSkgJiYgISh0aGlzIGluc3RhbmNlb2YgU3RyZWFtLkR1cGxleCkpXG4gICAgcmV0dXJuIG5ldyBXcml0YWJsZShvcHRpb25zKTtcblxuICB0aGlzLl93cml0YWJsZVN0YXRlID0gbmV3IFdyaXRhYmxlU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gbGVnYWN5LlxuICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcblxuICBTdHJlYW0uY2FsbCh0aGlzKTtcbn1cblxuLy8gT3RoZXJ3aXNlIHBlb3BsZSBjYW4gcGlwZSBXcml0YWJsZSBzdHJlYW1zLCB3aGljaCBpcyBqdXN0IHdyb25nLlxuV3JpdGFibGUucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignQ2Fubm90IHBpcGUuIE5vdCByZWFkYWJsZS4nKSk7XG59O1xuXG5cbmZ1bmN0aW9uIHdyaXRlQWZ0ZXJFbmQoc3RyZWFtLCBzdGF0ZSwgY2IpIHtcbiAgdmFyIGVyID0gbmV3IEVycm9yKCd3cml0ZSBhZnRlciBlbmQnKTtcbiAgLy8gVE9ETzogZGVmZXIgZXJyb3IgZXZlbnRzIGNvbnNpc3RlbnRseSBldmVyeXdoZXJlLCBub3QganVzdCB0aGUgY2JcbiAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgY2IoZXIpO1xuICB9KTtcbn1cblxuLy8gSWYgd2UgZ2V0IHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhIGJ1ZmZlciwgc3RyaW5nLCBudWxsLCBvciB1bmRlZmluZWQsXG4vLyBhbmQgd2UncmUgbm90IGluIG9iamVjdE1vZGUsIHRoZW4gdGhhdCdzIGFuIGVycm9yLlxuLy8gT3RoZXJ3aXNlIHN0cmVhbSBjaHVua3MgYXJlIGFsbCBjb25zaWRlcmVkIHRvIGJlIG9mIGxlbmd0aD0xLCBhbmQgdGhlXG4vLyB3YXRlcm1hcmtzIGRldGVybWluZSBob3cgbWFueSBvYmplY3RzIHRvIGtlZXAgaW4gdGhlIGJ1ZmZlciwgcmF0aGVyIHRoYW5cbi8vIGhvdyBtYW55IGJ5dGVzIG9yIGNoYXJhY3RlcnMuXG5mdW5jdGlvbiB2YWxpZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBjYikge1xuICB2YXIgdmFsaWQgPSB0cnVlO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgJiZcbiAgICAgICdzdHJpbmcnICE9PSB0eXBlb2YgY2h1bmsgJiZcbiAgICAgIGNodW5rICE9PSBudWxsICYmXG4gICAgICBjaHVuayAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhc3RhdGUub2JqZWN0TW9kZSkge1xuICAgIHZhciBlciA9IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsnKTtcbiAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgY2IoZXIpO1xuICAgIH0pO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHZhbGlkO1xufVxuXG5Xcml0YWJsZS5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG4gIHZhciByZXQgPSBmYWxzZTtcblxuICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBlbmNvZGluZztcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgJiYgaXNVaW50OEFycmF5KGNodW5rKSlcbiAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmspO1xuICBpZiAoaXNBcnJheUJ1ZmZlcihjaHVuaykgJiYgdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgIGNodW5rID0gbmV3IEJ1ZmZlcihuZXcgVWludDhBcnJheShjaHVuaykpO1xuICBcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpXG4gICAgZW5jb2RpbmcgPSAnYnVmZmVyJztcbiAgZWxzZSBpZiAoIWVuY29kaW5nKVxuICAgIGVuY29kaW5nID0gc3RhdGUuZGVmYXVsdEVuY29kaW5nO1xuXG4gIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpXG4gICAgY2IgPSBmdW5jdGlvbigpIHt9O1xuXG4gIGlmIChzdGF0ZS5lbmRlZClcbiAgICB3cml0ZUFmdGVyRW5kKHRoaXMsIHN0YXRlLCBjYik7XG4gIGVsc2UgaWYgKHZhbGlkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCBjYikpXG4gICAgcmV0ID0gd3JpdGVPckJ1ZmZlcih0aGlzLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGRlY29kZUNodW5rKHN0YXRlLCBjaHVuaywgZW5jb2RpbmcpIHtcbiAgaWYgKCFzdGF0ZS5vYmplY3RNb2RlICYmXG4gICAgICBzdGF0ZS5kZWNvZGVTdHJpbmdzICE9PSBmYWxzZSAmJlxuICAgICAgdHlwZW9mIGNodW5rID09PSAnc3RyaW5nJykge1xuICAgIGNodW5rID0gbmV3IEJ1ZmZlcihjaHVuaywgZW5jb2RpbmcpO1xuICB9XG4gIHJldHVybiBjaHVuaztcbn1cblxuLy8gaWYgd2UncmUgYWxyZWFkeSB3cml0aW5nIHNvbWV0aGluZywgdGhlbiBqdXN0IHB1dCB0aGlzXG4vLyBpbiB0aGUgcXVldWUsIGFuZCB3YWl0IG91ciB0dXJuLiAgT3RoZXJ3aXNlLCBjYWxsIF93cml0ZVxuLy8gSWYgd2UgcmV0dXJuIGZhbHNlLCB0aGVuIHdlIG5lZWQgYSBkcmFpbiBldmVudCwgc28gc2V0IHRoYXQgZmxhZy5cbmZ1bmN0aW9uIHdyaXRlT3JCdWZmZXIoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBjaHVuayA9IGRlY29kZUNodW5rKHN0YXRlLCBjaHVuaywgZW5jb2RpbmcpO1xuICB2YXIgbGVuID0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG5cbiAgc3RhdGUubGVuZ3RoICs9IGxlbjtcblxuICB2YXIgcmV0ID0gc3RhdGUubGVuZ3RoIDwgc3RhdGUuaGlnaFdhdGVyTWFyaztcbiAgc3RhdGUubmVlZERyYWluID0gIXJldDtcblxuICBpZiAoc3RhdGUud3JpdGluZylcbiAgICBzdGF0ZS5idWZmZXIucHVzaChuZXcgV3JpdGVSZXEoY2h1bmssIGVuY29kaW5nLCBjYikpO1xuICBlbHNlXG4gICAgZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgbGVuLCBjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHN0YXRlLndyaXRlbGVuID0gbGVuO1xuICBzdGF0ZS53cml0ZWNiID0gY2I7XG4gIHN0YXRlLndyaXRpbmcgPSB0cnVlO1xuICBzdGF0ZS5zeW5jID0gdHJ1ZTtcbiAgc3RyZWFtLl93cml0ZShjaHVuaywgZW5jb2RpbmcsIHN0YXRlLm9ud3JpdGUpO1xuICBzdGF0ZS5zeW5jID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGVFcnJvcihzdHJlYW0sIHN0YXRlLCBzeW5jLCBlciwgY2IpIHtcbiAgaWYgKHN5bmMpXG4gICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgY2IoZXIpO1xuICAgIH0pO1xuICBlbHNlXG4gICAgY2IoZXIpO1xuXG4gIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbn1cblxuZnVuY3Rpb24gb253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKSB7XG4gIHN0YXRlLndyaXRpbmcgPSBmYWxzZTtcbiAgc3RhdGUud3JpdGVjYiA9IG51bGw7XG4gIHN0YXRlLmxlbmd0aCAtPSBzdGF0ZS53cml0ZWxlbjtcbiAgc3RhdGUud3JpdGVsZW4gPSAwO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlKHN0cmVhbSwgZXIpIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuICB2YXIgc3luYyA9IHN0YXRlLnN5bmM7XG4gIHZhciBjYiA9IHN0YXRlLndyaXRlY2I7XG5cbiAgb253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKTtcblxuICBpZiAoZXIpXG4gICAgb253cml0ZUVycm9yKHN0cmVhbSwgc3RhdGUsIHN5bmMsIGVyLCBjYik7XG4gIGVsc2Uge1xuICAgIC8vIENoZWNrIGlmIHdlJ3JlIGFjdHVhbGx5IHJlYWR5IHRvIGZpbmlzaCwgYnV0IGRvbid0IGVtaXQgeWV0XG4gICAgdmFyIGZpbmlzaGVkID0gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKTtcblxuICAgIGlmICghZmluaXNoZWQgJiYgIXN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICAgIGNsZWFyQnVmZmVyKHN0cmVhbSwgc3RhdGUpO1xuXG4gICAgaWYgKHN5bmMpIHtcbiAgICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFmdGVyV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmluaXNoZWQsIGNiKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpIHtcbiAgaWYgKCFmaW5pc2hlZClcbiAgICBvbndyaXRlRHJhaW4oc3RyZWFtLCBzdGF0ZSk7XG4gIGNiKCk7XG4gIGlmIChmaW5pc2hlZClcbiAgICBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKTtcbn1cblxuLy8gTXVzdCBmb3JjZSBjYWxsYmFjayB0byBiZSBjYWxsZWQgb24gbmV4dFRpY2ssIHNvIHRoYXQgd2UgZG9uJ3Rcbi8vIGVtaXQgJ2RyYWluJyBiZWZvcmUgdGhlIHdyaXRlKCkgY29uc3VtZXIgZ2V0cyB0aGUgJ2ZhbHNlJyByZXR1cm5cbi8vIHZhbHVlLCBhbmQgaGFzIGEgY2hhbmNlIHRvIGF0dGFjaCBhICdkcmFpbicgbGlzdGVuZXIuXG5mdW5jdGlvbiBvbndyaXRlRHJhaW4oc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmIHN0YXRlLm5lZWREcmFpbikge1xuICAgIHN0YXRlLm5lZWREcmFpbiA9IGZhbHNlO1xuICAgIHN0cmVhbS5lbWl0KCdkcmFpbicpO1xuICB9XG59XG5cblxuLy8gaWYgdGhlcmUncyBzb21ldGhpbmcgaW4gdGhlIGJ1ZmZlciB3YWl0aW5nLCB0aGVuIHByb2Nlc3MgaXRcbmZ1bmN0aW9uIGNsZWFyQnVmZmVyKHN0cmVhbSwgc3RhdGUpIHtcbiAgc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyA9IHRydWU7XG5cbiAgZm9yICh2YXIgYyA9IDA7IGMgPCBzdGF0ZS5idWZmZXIubGVuZ3RoOyBjKyspIHtcbiAgICB2YXIgZW50cnkgPSBzdGF0ZS5idWZmZXJbY107XG4gICAgdmFyIGNodW5rID0gZW50cnkuY2h1bms7XG4gICAgdmFyIGVuY29kaW5nID0gZW50cnkuZW5jb2Rpbmc7XG4gICAgdmFyIGNiID0gZW50cnkuY2FsbGJhY2s7XG4gICAgdmFyIGxlbiA9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuXG4gICAgZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gICAgLy8gaWYgd2UgZGlkbid0IGNhbGwgdGhlIG9ud3JpdGUgaW1tZWRpYXRlbHksIHRoZW5cbiAgICAvLyBpdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gd2FpdCB1bnRpbCBpdCBkb2VzLlxuICAgIC8vIGFsc28sIHRoYXQgbWVhbnMgdGhhdCB0aGUgY2h1bmsgYW5kIGNiIGFyZSBjdXJyZW50bHlcbiAgICAvLyBiZWluZyBwcm9jZXNzZWQsIHNvIG1vdmUgdGhlIGJ1ZmZlciBjb3VudGVyIHBhc3QgdGhlbS5cbiAgICBpZiAoc3RhdGUud3JpdGluZykge1xuICAgICAgYysrO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyA9IGZhbHNlO1xuICBpZiAoYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgc3RhdGUuYnVmZmVyID0gc3RhdGUuYnVmZmVyLnNsaWNlKGMpO1xuICBlbHNlXG4gICAgc3RhdGUuYnVmZmVyLmxlbmd0aCA9IDA7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNiKG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xufTtcblxuV3JpdGFibGUucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fd3JpdGFibGVTdGF0ZTtcblxuICBpZiAodHlwZW9mIGNodW5rID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBjaHVuaztcbiAgICBjaHVuayA9IG51bGw7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gZW5jb2Rpbmc7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjaHVuayAhPT0gJ3VuZGVmaW5lZCcgJiYgY2h1bmsgIT09IG51bGwpXG4gICAgdGhpcy53cml0ZShjaHVuaywgZW5jb2RpbmcpO1xuXG4gIC8vIGlnbm9yZSB1bm5lY2Vzc2FyeSBlbmQoKSBjYWxscy5cbiAgaWYgKCFzdGF0ZS5lbmRpbmcgJiYgIXN0YXRlLmZpbmlzaGVkKVxuICAgIGVuZFdyaXRhYmxlKHRoaXMsIHN0YXRlLCBjYik7XG59O1xuXG5cbmZ1bmN0aW9uIG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSkge1xuICByZXR1cm4gKHN0YXRlLmVuZGluZyAmJlxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICFzdGF0ZS5maW5pc2hlZCAmJlxuICAgICAgICAgICFzdGF0ZS53cml0aW5nKTtcbn1cblxuZnVuY3Rpb24gZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbmVlZCA9IG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSk7XG4gIGlmIChuZWVkKSB7XG4gICAgc3RhdGUuZmluaXNoZWQgPSB0cnVlO1xuICAgIHN0cmVhbS5lbWl0KCdmaW5pc2gnKTtcbiAgfVxuICByZXR1cm4gbmVlZDtcbn1cblxuZnVuY3Rpb24gZW5kV3JpdGFibGUoc3RyZWFtLCBzdGF0ZSwgY2IpIHtcbiAgc3RhdGUuZW5kaW5nID0gdHJ1ZTtcbiAgZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSk7XG4gIGlmIChjYikge1xuICAgIGlmIChzdGF0ZS5maW5pc2hlZClcbiAgICAgIHNldEltbWVkaWF0ZShjYik7XG4gICAgZWxzZVxuICAgICAgc3RyZWFtLm9uY2UoJ2ZpbmlzaCcsIGNiKTtcbiAgfVxuICBzdGF0ZS5lbmRlZCA9IHRydWU7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcblxuZnVuY3Rpb24gYXNzZXJ0RW5jb2RpbmcoZW5jb2RpbmcpIHtcbiAgaWYgKGVuY29kaW5nICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZyk7XG4gIH1cbn1cblxudmFyIFN0cmluZ0RlY29kZXIgPSBleHBvcnRzLlN0cmluZ0RlY29kZXIgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICB0aGlzLmVuY29kaW5nID0gKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bLV9dLywgJycpO1xuICBhc3NlcnRFbmNvZGluZyhlbmNvZGluZyk7XG4gIHN3aXRjaCAodGhpcy5lbmNvZGluZykge1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgLy8gQ0VTVS04IHJlcHJlc2VudHMgZWFjaCBvZiBTdXJyb2dhdGUgUGFpciBieSAzLWJ5dGVzXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICAvLyBVVEYtMTYgcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDItYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDI7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gdXRmMTZEZXRlY3RJbmNvbXBsZXRlQ2hhcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAvLyBCYXNlLTY0IHN0b3JlcyAzIGJ5dGVzIGluIDQgY2hhcnMsIGFuZCBwYWRzIHRoZSByZW1haW5kZXIuXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMud3JpdGUgPSBwYXNzVGhyb3VnaFdyaXRlO1xuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5jaGFyQnVmZmVyID0gbmV3IEJ1ZmZlcig2KTtcbiAgdGhpcy5jaGFyUmVjZWl2ZWQgPSAwO1xuICB0aGlzLmNoYXJMZW5ndGggPSAwO1xufTtcblxuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgY2hhclN0ciA9ICcnO1xuICB2YXIgb2Zmc2V0ID0gMDtcblxuICAvLyBpZiBvdXIgbGFzdCB3cml0ZSBlbmRlZCB3aXRoIGFuIGluY29tcGxldGUgbXVsdGlieXRlIGNoYXJhY3RlclxuICB3aGlsZSAodGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgLy8gZGV0ZXJtaW5lIGhvdyBtYW55IHJlbWFpbmluZyBieXRlcyB0aGlzIGJ1ZmZlciBoYXMgdG8gb2ZmZXIgZm9yIHRoaXMgY2hhclxuICAgIHZhciBpID0gKGJ1ZmZlci5sZW5ndGggPj0gdGhpcy5jaGFyTGVuZ3RoIC0gdGhpcy5jaGFyUmVjZWl2ZWQpID9cbiAgICAgICAgICAgICAgICB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCA6XG4gICAgICAgICAgICAgICAgYnVmZmVyLmxlbmd0aDtcblxuICAgIC8vIGFkZCB0aGUgbmV3IGJ5dGVzIHRvIHRoZSBjaGFyIGJ1ZmZlclxuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgdGhpcy5jaGFyUmVjZWl2ZWQsIG9mZnNldCwgaSk7XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgKz0gKGkgLSBvZmZzZXQpO1xuICAgIG9mZnNldCA9IGk7XG5cbiAgICBpZiAodGhpcy5jaGFyUmVjZWl2ZWQgPCB0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAgIC8vIHN0aWxsIG5vdCBlbm91Z2ggY2hhcnMgaW4gdGhpcyBidWZmZXI/IHdhaXQgZm9yIG1vcmUgLi4uXG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHRoZSBjaGFyYWN0ZXIgdGhhdCB3YXMgc3BsaXRcbiAgICBjaGFyU3RyID0gdGhpcy5jaGFyQnVmZmVyLnNsaWNlKDAsIHRoaXMuY2hhckxlbmd0aCkudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG5cbiAgICAvLyBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICAgIHZhciBjaGFyQ29kZSA9IGNoYXJTdHIuY2hhckNvZGVBdChjaGFyU3RyLmxlbmd0aCAtIDEpO1xuICAgIGlmIChjaGFyQ29kZSA+PSAweEQ4MDAgJiYgY2hhckNvZGUgPD0gMHhEQkZGKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggKz0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgICAgY2hhclN0ciA9ICcnO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRoaXMuY2hhclJlY2VpdmVkID0gdGhpcy5jaGFyTGVuZ3RoID0gMDtcblxuICAgIC8vIGlmIHRoZXJlIGFyZSBubyBtb3JlIGJ5dGVzIGluIHRoaXMgYnVmZmVyLCBqdXN0IGVtaXQgb3VyIGNoYXJcbiAgICBpZiAoaSA9PSBidWZmZXIubGVuZ3RoKSByZXR1cm4gY2hhclN0cjtcblxuICAgIC8vIG90aGVyd2lzZSBjdXQgb2ZmIHRoZSBjaGFyYWN0ZXJzIGVuZCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhpcyBidWZmZXJcbiAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoaSwgYnVmZmVyLmxlbmd0aCk7XG4gICAgYnJlYWs7XG4gIH1cblxuICB2YXIgbGVuSW5jb21wbGV0ZSA9IHRoaXMuZGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKTtcblxuICB2YXIgZW5kID0gYnVmZmVyLmxlbmd0aDtcbiAgaWYgKHRoaXMuY2hhckxlbmd0aCkge1xuICAgIC8vIGJ1ZmZlciB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXIgYnl0ZXMgd2UgZ290XG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoIC0gbGVuSW5jb21wbGV0ZSwgZW5kKTtcbiAgICB0aGlzLmNoYXJSZWNlaXZlZCA9IGxlbkluY29tcGxldGU7XG4gICAgZW5kIC09IGxlbkluY29tcGxldGU7XG4gIH1cblxuICBjaGFyU3RyICs9IGJ1ZmZlci50b1N0cmluZyh0aGlzLmVuY29kaW5nLCAwLCBlbmQpO1xuXG4gIHZhciBlbmQgPSBjaGFyU3RyLmxlbmd0aCAtIDE7XG4gIHZhciBjaGFyQ29kZSA9IGNoYXJTdHIuY2hhckNvZGVBdChlbmQpO1xuICAvLyBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICBpZiAoY2hhckNvZGUgPj0gMHhEODAwICYmIGNoYXJDb2RlIDw9IDB4REJGRikge1xuICAgIHZhciBzaXplID0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgIHRoaXMuY2hhckxlbmd0aCArPSBzaXplO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkICs9IHNpemU7XG4gICAgdGhpcy5jaGFyQnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCBzaXplLCAwLCBzaXplKTtcbiAgICB0aGlzLmNoYXJCdWZmZXIud3JpdGUoY2hhclN0ci5jaGFyQXQoY2hhclN0ci5sZW5ndGggLSAxKSwgdGhpcy5lbmNvZGluZyk7XG4gICAgcmV0dXJuIGNoYXJTdHIuc3Vic3RyaW5nKDAsIGVuZCk7XG4gIH1cblxuICAvLyBvciBqdXN0IGVtaXQgdGhlIGNoYXJTdHJcbiAgcmV0dXJuIGNoYXJTdHI7XG59O1xuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgYnl0ZXMgd2UgaGF2ZSB0byBjaGVjayBhdCB0aGUgZW5kIG9mIHRoaXMgYnVmZmVyXG4gIHZhciBpID0gKGJ1ZmZlci5sZW5ndGggPj0gMykgPyAzIDogYnVmZmVyLmxlbmd0aDtcblxuICAvLyBGaWd1cmUgb3V0IGlmIG9uZSBvZiB0aGUgbGFzdCBpIGJ5dGVzIG9mIG91ciBidWZmZXIgYW5ub3VuY2VzIGFuXG4gIC8vIGluY29tcGxldGUgY2hhci5cbiAgZm9yICg7IGkgPiAwOyBpLS0pIHtcbiAgICB2YXIgYyA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gaV07XG5cbiAgICAvLyBTZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9VVEYtOCNEZXNjcmlwdGlvblxuXG4gICAgLy8gMTEwWFhYWFhcbiAgICBpZiAoaSA9PSAxICYmIGMgPj4gNSA9PSAweDA2KSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMFhYWFhcbiAgICBpZiAoaSA8PSAyICYmIGMgPj4gNCA9PSAweDBFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMTBYWFhcbiAgICBpZiAoaSA8PSAzICYmIGMgPj4gMyA9PSAweDFFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSA0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGk7XG59O1xuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdmFyIHJlcyA9ICcnO1xuICBpZiAoYnVmZmVyICYmIGJ1ZmZlci5sZW5ndGgpXG4gICAgcmVzID0gdGhpcy53cml0ZShidWZmZXIpO1xuXG4gIGlmICh0aGlzLmNoYXJSZWNlaXZlZCkge1xuICAgIHZhciBjciA9IHRoaXMuY2hhclJlY2VpdmVkO1xuICAgIHZhciBidWYgPSB0aGlzLmNoYXJCdWZmZXI7XG4gICAgdmFyIGVuYyA9IHRoaXMuZW5jb2Rpbmc7XG4gICAgcmVzICs9IGJ1Zi5zbGljZSgwLCBjcikudG9TdHJpbmcoZW5jKTtcbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBwYXNzVGhyb3VnaFdyaXRlKGJ1ZmZlcikge1xuICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcpO1xufVxuXG5mdW5jdGlvbiB1dGYxNkRldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcikge1xuICB2YXIgaW5jb21wbGV0ZSA9IHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDI7XG4gIHRoaXMuY2hhckxlbmd0aCA9IGluY29tcGxldGUgPyAyIDogMDtcbiAgcmV0dXJuIGluY29tcGxldGU7XG59XG5cbmZ1bmN0aW9uIGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcikge1xuICB2YXIgaW5jb21wbGV0ZSA9IHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDM7XG4gIHRoaXMuY2hhckxlbmd0aCA9IGluY29tcGxldGUgPyAzIDogMDtcbiAgcmV0dXJuIGluY29tcGxldGU7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiXX0=
