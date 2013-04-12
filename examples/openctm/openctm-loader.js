(function() {

    var OpenCTMFormatHandler = function() {
        XML3D.base.BinaryFormatHandler.call(this);
    }
    XML3D.createClass(OpenCTMFormatHandler, XML3D.base.BinaryFormatHandler);

    OpenCTMFormatHandler.prototype.isFormatSupported = function(response, responseType, mimetype) {
        if (!(response instanceof ArrayBuffer))
            return false;

        var stream = new CTM.Stream(response);
        var header;
        try {
            header = new CTM.FileHeader(stream);
        } catch (e) {
            return false; // not a OpenCTM stream
        }
        return true;
    }

    var openctmFormatHandler = new OpenCTMFormatHandler();
    XML3D.base.registerFormat(openctmFormatHandler);

    // TODO this should be moved to Xflow.TYPED_ARRAY_MAP
    var TYPED_ARRAY_MAP = {
        "int" : Int32Array,
        "int4" : Int32Array,
        "float" : Float32Array,
        "float2" : Float32Array,
        "float3" : Float32Array,
        "float4" : Float32Array,
        "float4x4" : Float32Array,
        "bool" : Uint8Array,
        "byte" : Int8Array,
        "ubyte" : Uint8Array
    };

    function createXflowBuffer(dataNode, name, type, size, key) {
        if (size == 0)
            return null;
        var typeId = Xflow.DATA_TYPE_MAP[type];
        var tupleSize = Xflow.DATA_TYPE_TUPLE_SIZE[typeId];

        var v = new (TYPED_ARRAY_MAP[type])(size * tupleSize);
        var buffer = new Xflow.BufferEntry(typeId, v);

        var inputNode = XML3D.data.xflowGraph.createInputNode();
        inputNode.data = buffer;
        inputNode.name = name;
        //inputNode.key = key;
        dataNode.appendChild(inputNode);
        return buffer.getValue();
    }

    // OpenCTM

    function loadOpenCTM(data)
    {
        if (!data instanceof ArrayBuffer)
            throw new Error("ArrayBuffer required");

        var stream = new CTM.Stream(data);
        var header;
        try {
            header = new CTM.FileHeader(stream);
        } catch (e) {
            throw new Error("not a OpenCTM stream");
        }

        var indexSize = 3 * header.triangleCount;
        var normalSize = header.vertexCount;
        var positionSize = header.vertexCount;
        var texcoordSize = (header.uvMapCount > 0 ? header.vertexCount : 0);

        var node = XML3D.data.xflowGraph.createDataNode();

        var index = createXflowBuffer(node, 'index', 'int', indexSize);
        var normal = createXflowBuffer(node, 'normal', 'float3', normalSize);
        var position = createXflowBuffer(node, 'position', 'float3', positionSize);
        var texcoord = createXflowBuffer(node, 'texcoord', 'float2', texcoordSize);

        //stream.setPosition(0);
        stream = new CTM.Stream(data);
        var file = new CTM.File(stream);

        //if (file.header.hasNormals());

        for (var i = 0; i < file.body.indices.length; ++i) {
            index[i] = file.body.indices[i];
        }
        for (var i = 0; i < file.body.vertices.length; ++i) {
            position[i] = file.body.vertices[i];
        }

        if (file.body.normals) {
            for (var i = 0; i < file.body.normals.length; ++i) {
                normal[i] = file.body.normals[i];
            }
        } else {
            for (var i = 0; i < normal.length / 3; ++i) {
                normal[i * 3 + 0] = 1;
                normal[i * 3 + 1] = 0;
                normal[i * 3 + 2] = 0;
            }
        }
        if (file.body.uvMaps) {
            var uvMap = file.body.uvMaps[0];
            for (var i = 0; i < uvMap.uv.length; ++i) {
                texcoord[i] = uvMap.uv[i];
            }
        }

        return node;
    }

    /**
     * @implements IDataAdapter
     */
    var OpenCTMDataAdapter = function(openctmData) {
        try {
            this.xflowDataNode = loadOpenCTM(openctmData);
        } catch (e) {
            XML3D.debug.logError("Failed to process OpenCTM JSON json file: " + e);
        }
    }

    OpenCTMDataAdapter.prototype.getXflowNode = function() {
        return this.xflowDataNode;
    }

    /**
     * @constructor
     * @implements {XML3D.base.IFactory}
     */
    var OpenCTMFactory = function(){
        XML3D.base.AdapterFactory.call(this, XML3D.data);
    };
    XML3D.createClass(OpenCTMFactory, XML3D.base.AdapterFactory);

    OpenCTMFactory.prototype.aspect = XML3D.data;
    OpenCTMFactory.prototype.createAdapter = function(data) {
        return new OpenCTMDataAdapter(data);
    }

    XML3D.base.resourceManager.addBinaryExtension('.ctm');
    openctmFormatHandler.registerFactoryClass(OpenCTMFactory);

}());
