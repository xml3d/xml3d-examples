(function () {

    var MeshLabFormatHandler = function () {
        XML3D.resource.FormatHandler.call(this);
    };
    XML3D.createClass(MeshLabFormatHandler, XML3D.resource.FormatHandler);

    MeshLabFormatHandler.prototype.isFormatSupported = function (response) {
        if (response.headers.has("Content-Type")) {
            return response.headers.get("Content-Type") === "application/json";
        }
        return response.url.match(/\.json/);
    };

    MeshLabFormatHandler.prototype.getFormatData = function (response) {
         return response.json().then(function(data) {
             if (data.comment != "Generated by MeshLab JSON Exporter")
                 throw new Error("Unknown JSON format: " + data.comment);
             if (data.version != "0.1.0")
                 throw new Error("Unknown MeshLab JSON version: " + data.version);

             return data;
         });
    };

    MeshLabFormatHandler.prototype.getFragmentData = function(data, fragment) {
        return data;
    };

    MeshLabFormatHandler.prototype.getAdapter = function(data, aspect, canvasId) {
        if (aspect === "data") {
            return new MeshLabJSONDataAdapter(data);
        }
    };

    XML3D.resource.registerFormatHandler(new MeshLabFormatHandler());


    var TYPED_ARRAY_MAP = {
        "float32": Float32Array,
        "uint32": Uint32Array
    };
    var BUFFER_TYPE_TABLE = {};
    BUFFER_TYPE_TABLE['float32'] = {
        1: Xflow.constants.DATA_TYPE.FLOAT,
        2: Xflow.constants.DATA_TYPE.FLOAT2,
        3: Xflow.constants.DATA_TYPE.FLOAT3,
        4: Xflow.constants.DATA_TYPE.FLOAT4
    };
    BUFFER_TYPE_TABLE['uint32'] = {
        1: Xflow.constants.DATA_TYPE.INT,
        4: Xflow.constants.DATA_TYPE.INT4
    };

    function createXflowBuffer(data) {
        if (!data)
            return null;

        // This is a hack for the vertex colors, because the predefined shaders
        // use 3-tuple colors in float 0-1 format. This should be solved in
        // Xflow soon
        if (data.name == 'color_buffer' && data.type == 'uint8' && data.size == 4) {
            var v = data.values;
            var count = v.length / 4;
            var newValue = new Float32Array(count * 3);
            for (var i = 0; i < count; i++) {
                var offset = i * 4;
                newValue[i * 3] = v[offset] / 255;
                newValue[i * 3 + 1] = v[offset + 1] / 255;
                newValue[i * 3 + 2] = v[offset + 2] / 255;
            }
            data.type = 'float32';
            data.size = 3;
            data.values = newValue;
        }
        var type = data.type || data.indexType;
        if (TYPED_ARRAY_MAP[type]) {
            var v = new (TYPED_ARRAY_MAP[type])(data.values || data.indices);
            var bufferType = BUFFER_TYPE_TABLE[type][data.size || 1];
            if (bufferType) {
                var buffer = new Xflow.BufferEntry(bufferType, v);
                return buffer;
            }
        }
        return null;
    }

    function findSourceInArray(source, vertices) {
        for (var i = 0; i < vertices.length; i++) {
            if (vertices[i].name == source)
                return vertices[i];
        }
        return null;
    }

    function createXflowNode(jsonData) {
        var node = new Xflow.DataNode();
        if (jsonData.mapping.length) {
            var attributes = jsonData.mapping[0].attributes;
            for (var i in attributes) {
                var attributeMapping = attributes[i];
                var source = attributeMapping.source;
                var name = attributeMapping.semantic;
                var buffer = createXflowBuffer(findSourceInArray(source, jsonData.vertices));
                if (buffer) {
                    var inputNode = new Xflow.InputNode();
                    inputNode.data = buffer;
                    inputNode.name = name;
                    node.appendChild(inputNode);
                }
            }
            var primitives = jsonData.mapping[0].primitives;
            var primbuffer = createXflowBuffer(findSourceInArray(primitives, jsonData.connectivity));
            if (primbuffer) {
                var inputNode = new Xflow.InputNode();
                inputNode.data = primbuffer;
                inputNode.name = "index";
                node.appendChild(inputNode);
            }
        } else {
            // probably points
            for (var i = 0; i < jsonData.vertices.length; i++) {
                var entry = jsonData.vertices[i];
                if (entry.name == "normal_buffer")
                    continue;
                var buffer = createXflowBuffer(entry);
                if (buffer) {
                    var buffPos = entry.name.indexOf("_buffer");
                    var name = buffPos > 0 ? entry.name.substring(0, buffPos) : entry.name;
                    var inputNode = new Xflow.InputNode();
                    inputNode.data = buffer;
                    inputNode.name = name;
                    node.appendChild(inputNode);
                }
            }
        }
        return node;
    }

    /**
     * @implements IDataAdapter
     */
    var MeshLabJSONDataAdapter = function (data) {
        this.xflowDataNode = createXflowNode(data);
    };

    MeshLabJSONDataAdapter.prototype.getXflowNode = function () {
        return this.xflowDataNode;
    };


}());
