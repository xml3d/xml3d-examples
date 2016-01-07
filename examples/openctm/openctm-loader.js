(function() {

	var hasWebWorkerSupport = !!window.Worker;

	var OpenCTMFormatHandler = function() {
		XML3D.resource.FormatHandler.call(this);
		if (hasWebWorkerSupport) {
			this.worker = new Worker("openctm-worker.js");
			this.callbackMap = [];
			this.worker.addEventListener("error", function (error) {
				XML3D.debug.logError("[OpenCTMFormatHandler] Failed to process OpenCTM file: " + error.message);
				if (error.id)
					self.callbackMap[error.id](false);
			});
			var self = this;
			this.worker.addEventListener("message", function (event) {
				var message = event.data;
				switch (message.type) {
					case "file":
						self.callbackMap[message.id].resolve(message);
						break;
					default:
						XML3D.debug.logError("[OpenCTMFormatHandler] Unrecognized message received: " + message.type);
						self.callbackMap[message.id].reject(false);
						break;
				}
			})
		}
	};

	XML3D.createClass(OpenCTMFormatHandler, XML3D.resource.FormatHandler);

	OpenCTMFormatHandler.prototype.isFormatSupported = function(response) {
		return response.url.match(/\.ctm/);
	};

	function getFormatDataWebWorker(response) {
		var that = this;
		return new Promise(function(resolve, reject) {
			response.arrayBuffer().then(function(arrayBuffer) {
				var id = that.callbackMap.push({resolve:resolve, reject:reject}) - 1;
				that.worker.postMessage({
					type: "decodeFile",
					id: id,
					stream: arrayBuffer
				}, [arrayBuffer]);
			});
		});
	}

	function getFormatDataSynchronously(response) {
		return response.arrayBuffer().then(function(arrayBuffer) {
			var stream = new CTM.Stream(arrayBuffer);
			var file = new CTM.File(stream);
			return file.body;
		});
	}

	if (hasWebWorkerSupport)
		OpenCTMFormatHandler.prototype.getFormatData = getFormatDataWebWorker;
	else
		OpenCTMFormatHandler.prototype.getFormatData = getFormatDataSynchronously;

	function createXflowDataNode (file) {
		var xflowDataNode = new Xflow.DataNode();
		xflowDataNode.appendChild(createInputNode("index", "int", file.indices));
		xflowDataNode.appendChild(createInputNode("position", "float3", file.vertices));
		if (file.normals)
			xflowDataNode.appendChild(createInputNode("normal", "float3", file.normals));
		else
			xflowDataNode.appendChild(createInputNode("normal", "float3", CTM.calcSmoothNormals(file.indices, file.vertices)));

		if (file.uvMaps)
			xflowDataNode.appendChild(createInputNode("texcoord", "float2", file.uvMaps[0].uv));

		return xflowDataNode;
	}
	
	function createInputNode(name, type, typedArray) {
		var inputNode = new Xflow.InputNode();
		inputNode.name = name;
		inputNode.data = new Xflow.BufferEntry(Xflow.constants.DATA_TYPE.fromString(type), typedArray);
		return inputNode;
	}

	OpenCTMFormatHandler.prototype.getAdapter = function(data, aspect, canvasId) {
		if (aspect === "data") {
			return new OpenCTMDataAdapter(data);
		}
	};

	XML3D.resource.registerFormatHandler(new OpenCTMFormatHandler());

	/**
	 * @implements IDataAdapter
	 */
	var OpenCTMDataAdapter = function (data) {
		this._xflowDataNode = createXflowDataNode(data);
	};

	OpenCTMDataAdapter.prototype.getXflowNode = function() {
		return this._xflowDataNode;
	};

}());
