Xflow.registerOperator("grayscale", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'} ],
    evaluate: function(output, input) {
        var s = input.data;
        var d = output.data;
        for (var i = 0; i < s.length; i += 4) {
			// HSI Intensity for the RGB
			d[i] = d[i + 1] = d[i + 2] = (s[i] + s[i + 1] + s[i + 2]) / 3;
            d[i + 3] = s[i + 3];

            // One may use CIE luminance (instead of averaging) for the RGB, too, as 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        return true;
    }
});

Xflow.registerOperator("complement", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'} ],
    evaluate: function(output, input) {
        var s = input.data;
        var d = output.data;

        for (var i = 0; i < s.length; i += 4) {
            d[i] = 255 - s[i];
            d[i + 1] = 255 - s[i + 1];
            d[i + 2] = 255 - s[i + 2];
            d[i + 3] = s[i + 3];
        }

        return true;
    }
});

Xflow.registerOperator("dim", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'float', source : 'ratio'}],
    evaluate: function(output, input, ratio) {
        var s = input.data;
        var d = output.data;

        for (var i = 0; i < s.length; i += 4) {
            d[i] = ratio[0] * s[i];
            d[i + 1] = ratio[0] * s[i + 1];
            d[i + 2] = ratio[0] * s[i + 2];
            d[i + 3] = s[i + 3];
        }

        return true;
    }
});

Xflow.registerOperator("threshold", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'threshold'}],
    evaluate: function(output, input, threshold) {
        var s = input.data;
        var d = output.data;

        for (var i = 0; i < s.length; i += 4) {
            d[i] = d[i + 1] = d[i + 2] = ((s[i] >= threshold[0]) ? 255 : 0);
            d[i + 3] = s[i + 3];
        }

        return true;
    }
});

function convolve(output, input, filter){
	var width = input.width;
	var height = input.height;

	var s = input.data;
	var d = output.data;

	var filterWidth = Math.sqrt(filter.length);		// width/height of the square filter
	var len = Math.floor(filterWidth / 2);			// half of the width/height of the square filter

	for (var j = 0; j < height; j++)
		for (var i = 0; i < width; i++) {
			var offset = (j * width + i) * 4;
			var r = 0, g = 0, b = 0;
			for (var l = -len; l <= len; l++)
				for (var k = -len; k <= len; k++)
					if (j + l >= 0 && j + l < height && i + k >= 0 && i + k < width) {
						var neighborOffset = ((j + l) * width + (k + i)) * 4;
						filterOffset = (l + len) * filterWidth + (k + len);
						r += s[neighborOffset] * filter[filterOffset];
						g += s[neighborOffset + 1] * filter[filterOffset];
						b += s[neighborOffset + 2] * filter[filterOffset];
					}

			d[offset] = r;
			d[offset + 1] = g;
			d[offset + 2] = b;
			d[offset + 3] = s[offset + 3];
		}

	return true;
}


function convolveParallel(index, input, filter){
    var m = index[0], n = index[1];

    var filterWidth = Math.sqrt(filter.length);		// width/height of the square filter
    var len = Math.floor(filterWidth / 2);			// half of the width/height of the square filter

    var shape = input.getShape();
    var width = shape[0];
    var height = shape[1];

    var result = [0,0,0,255], x, y, weight;

    for (var l = -len; l <= len; l++)
        for (var k = -len; k <= len; k++)
            if (n + l >= 0 && n + l < height && m + k >= 0 && m + k < width) {
                x = m + k;
                y = n + l;
                weight = filter[(l + len) * filterWidth + (k + len) ];

                result[0] += input[x][y][0] * weight;
                result[1] += input[x][y][1] * weight;
                result[2] += input[x][y][2] * weight;
            }

    return result;
}



Xflow.registerOperator("convolve", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'float', source : 'filter', array: true}],
    evaluate: convolve,
    evaluate_parallel: convolveParallel
});

function gaussian(x,y, sigma) {
	return Math.pow(Math.E, -(Math.pow(x, 2) + Math.pow(y, 2)) / (2 * Math.pow(sigma, 2)));
}

Xflow.registerOperator("gaussian", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
        {type: 'int', source : 'size'},
        {type: 'float', source : 'sigma'}],
    evaluate: function(output, input, size, sigma) {
        var size = size[0];
        var filter = new Float32Array(size * size);

        var len = Math.floor(size / 2);

        var sum = 0;
        for (var j = -len; j <= len; j++)
            for (var i = -len; i <= len; i++) {
                var offset = (j + len) * size + (i + len);
                filter[offset] = gaussian(i, j, sigma[0]);
                sum += filter[offset];
            }

        for (var i = 0; i < filter.length; i++)
            filter[i] /= sum;

        convolve(output, input, filter);

        return true;
    }
});


Xflow.registerOperator("gaussianKernel", {
    outputs: [ {type: 'float', name : 'output', customAlloc: true} ],
    params:  [ {type: 'int', source : 'size'},
			   {type: 'float', source : 'sigma'}],
    alloc: function(sizes, size, sigma)
    {
        var length = size[0] * size[0];
        sizes['output'] = length;
    },
    evaluate: function(output, size, sigma) {
		var size = size[0];
		var len = Math.floor(size / 2);

		var sum = 0;
		for (var j = -len; j <= len; j++)
			for (var i = -len; i <= len; i++) {
				var offset = (j + len) * size + (i + len);
                output[offset] = gaussian(i, j, sigma[0]);
				sum += output[offset];
			}

		for (var i = 0; i < output.length; i++)
            output[i] /= sum;
        return true;
    }
});

Xflow.registerOperator("mask", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input1'} ],
    params:  [ {type: 'texture', source : 'input1'},
			   {type: 'texture', source : 'input2'},
			   {type: 'float', source : 'weight'}],
    evaluate: function (output, input1, input2, weight) {
		var s1 = input1.data;
		var s2 = input2.data;
		var d = output.data;
		var k = weight[0];

		for (var i = 0; i < s1.length; i += 4) {
			d[i] = s1[i] + k * s2[i];
			d[i + 1] = s1[i + 1] + k * s2[i + 1];
			d[i + 2] = s1[i + 2] + k * s2[i + 2];
			d[i + 3] = 255;
		}

		return true;
	}
});

Xflow.registerOperator("laplacian", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'}],
    evaluate: function(output, input) {
		var filter = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
		var weight = [1];

		convolve(output, input, filter);

        return true;
    }
});

function euclideanDist(point1, point2) {
	var sum = 0;

	for (var i = 0; i < point1.length; i++)
		sum += Math.pow(point1[i] - point2[i], 2);

	return Math.sqrt(sum);
}


Xflow.registerOperator("colorSliced", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'color'},
			   {type: 'float', source : 'radius'}],
    evaluate: function(output, input, color, radius) {
		var s = input.data;
		var d = output.data;

		for (var i = 0; i < s.length; i += 4) {
			if (euclideanDist([s[i], s[i + 1], s[i + 2]], color) < radius[0]) {
				d[i] = s[i];
				d[i + 1] = s[i + 1];
				d[i + 2] = s[i + 2];
			} else
				d[i] = d[i + 1] = d[i + 2] = 255;

			d[i + 3] = s[i + 3];
		}

        return true;
    }
});

Xflow.registerOperator("averaging", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'size'}],
    evaluate: function(output, input, size) {
		var filter = new Float32Array(size[0] * size[0]);

		for (var i = 0; i < filter.length; i++)
			filter[i] = 1 / filter.length;

		convolve(output, input, filter);

        return true;
    }
});

Xflow.registerOperator("median", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'size'}],
    evaluate: function(output, input, size) {
		var width = input.width;
		var height = input.height;

		var s = input.data;
		var d = output.data;

		filterWidth = size[0];						// width/height of the square filter
		len = Math.floor(filterWidth / 2);			// half of the width/height of the square filter

		for (var j = 0; j < height; j++)
			for (var i = 0; i < width; i++) {
				var offset = (j * width + i) * 4;
				var neighborsR = new Array();
				var neighborsG = new Array();
				var neighborsB = new Array();
				for (var l = -len; l <= len; l++)
					for (var k = -len; k <= len; k++)
						if (j + l >= 0 && j + l < height && i + k >= 0 && i + k < width) {
							var neighborOffset = ((j + l) * width + (k + i)) * 4;
							neighborsR.push(s[neighborOffset]);
							neighborsG.push(s[neighborOffset + 1]);
							neighborsB.push(s[neighborOffset + 2]);
						}
				neighborsR.sort(function(a, b) {return a - b});
				neighborsB.sort(function(a, b) {return a - b});
				neighborsG.sort(function(a, b) {return a - b});
				d[offset] = neighborsR[Math.floor(neighborsR.length / 2)];
				d[offset + 1] = neighborsG[Math.floor(neighborsG.length / 2)];
				d[offset + 2] = neighborsB[Math.floor(neighborsB.length / 2)];
				d[offset + 3] = s[offset + 3];
			}

		return true;
    }
});

function createImageDataFloat32(w, h) {
	return {width: w, height: h, data: new Float32Array(w * h * 4)};
};

Xflow.registerOperator("sobel", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'}],
    evaluate: function(output, input) {
		var filterX = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
		var filterY = [-1, 0, 1, -2, 0, 2, -1, 0, 1];

		var dx = createImageDataFloat32(input.width, input.height);
		var dy = createImageDataFloat32(input.width, input.height);

		convolve(dx, input, filterX);
		convolve(dy, input, filterY);

		d = output.data;

		for (var i = 0; i < input.data.length; i += 4) {
			d[i] = (Math.abs(dx.data[i]) + Math.abs(dy.data[i])) / 2;
			d[i + 1] = (Math.abs(dx.data[i + 1]) + Math.abs(dy.data[i + 1])) / 2;;
			d[i + 2] = (Math.abs(dx.data[i + 2]) + Math.abs(dy.data[i + 2])) / 2;;
			d[i + 3] = 255;
		}

        return true;
    }
});

Xflow.registerOperator("colorMatrix", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'type'},
			   {type: 'float', source : 'values'}],
    evaluate: function(output, input, type, values) {
		s = input.data;
		d = output.data;
		var t = new Array(16);		// transformation matrix

		switch (type[0]) {
			case 0:
				t = values;
			case 1:		// saturate
				var v = values[0];
                XML3D.math.mat4.identity(t);
				t[0] = 0.213 + 0.787 * v; t[1] = 0.715 - 0.715 * v; t[2] = 0.072 - 0.072 * v;
				t[4] = 0.213 - 0.213 * v; t[5] = 0.715 + 0.285 * v; t[6] = 0.072 - 0.072 * v;
				t[8] = 0.213 - 0.213 * v; t[9] = 0.715 - 0.715 * v; t[10] = 0.072 + 0.928 * v;
				break;
			case 2:		// luminace to alpha
                XML3D.math.mat4.identity(t);
				t[0] = t[5] = t[10] = t[15] = 0;
				t[12] = 0.2125; t[13] = 0.7154; t[14] = 0.0721;
				break;
			default:
                XML3D.math.mat4.identity(t);
		}

        var newColor = XML3D.math.vec4.create();
        var color = XML3D.math.vec4.create();
        for (var i = 0; i < s.length; i += 4) {
            XML3D.math.vec4.set(color, s[i], s[i+1], s[i+2], s[i+3]);
            XML3D.math.vec4.transformMat4(newColor, color, t);
			d[i] = newColor[0];
			d[i + 1] = newColor[1];
			d[i + 2] = newColor[2];
			d[i + 3] = newColor[3];
		}

        return true;
    }
});

function premultiply(input) {		// Alpha premultiplication
	var output = createImageDataFloat32(input.width, input.height);
	var s = input.data;
	var d = output.data;

	for (var i = 0; i < s.length; i += 4) {
		d[i + 3] = s[i + 3] / 255;
		d[i] = s[i] * d[i + 3] / 255;
		d[i + 1] = s[i + 1] * d[i + 3] / 255;
		d[i + 2] = s[i + 2] * d[i + 3] / 255;
	}

	return output;
}

function depremultiply(input) {
	var output = createImageDataFloat32(input.width, input.height);
	var s = input.data;
	var d = output.data;

	for (var i = 0; i < s.length; i += 4) {
		d[i] = s[i] / s[i + 3] * 255;
		d[i + 1] = s[i + 1] / s[i + 3] * 255;
		d[i + 2] = s[i + 2] / s[i + 3] * 255;
		d[i + 3] = s[i + 3] * 255;
	}

	return output;
}

function assign(output, input) {		// Assign input image to output iamge, pixel-wise
	var s = input.data;
	var d = output.data;
	for (var i = 0; i < s.length; i++)
		d[i] = s[i];
}

/* ALL the blend operators below, first premultiplies the input images, and finally de-premultiplies the result. */
Xflow.registerOperator("blendNormal", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input1'} ],
    params:  [ {type: 'texture', source : 'input1'},
			   {type: 'texture', source : 'input2'}],
    evaluate: function (output, input1, input2) {
		var s1 = (premultiply(input1)).data;
		var s2 = (premultiply(input2)).data;
		var intermediate = createImageDataFloat32(input1.width, input1.height);		// for storing blending result
		var inter = intermediate.data;

		for (var i = 0; i < s1.length; i += 4) {
			inter[i] = (1 - s1[i + 3]) * s2[i] + s1[i];
			inter[i + 1] = (1 - s1[i + 3]) * s2[i + 1] + s1[i + 1];
			inter[i + 2] = (1 - s1[i + 3]) * s2[i + 2] + s1[i + 2];
			inter[i + 3] = 1 - (1 - s1[i + 3]) * (1 - s2[i + 3]);
		}

		assign(output, depremultiply(intermediate));

		return true;
	}
});

Xflow.registerOperator("blendMultiply", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input1'} ],
    params:  [ {type: 'texture', source : 'input1'},
			   {type: 'texture', source : 'input2'}],
    evaluate: function (output, input1, input2) {
		var s1 = (premultiply(input1)).data;
		var s2 = (premultiply(input2)).data;
		var intermediate = createImageDataFloat32(input1.width, input1.height);		// for storing blending result
		var inter = intermediate.data;

		for (var i = 0; i < s1.length; i += 4) {
			inter[i] = (1 - s1[i + 3]) * s2[i] + (1 - s2[i + 3]) * s1[i] + s1[i] * s2[i];
			inter[i + 1] = (1 - s1[i + 3]) * s2[i + 1] + (1 - s2[i + 3]) * s1[i + 1] + s1[i + 1] * s2[i + 1];
			inter[i + 2] = (1 - s1[i + 3]) * s2[i + 2] + (1 - s2[i + 3]) * s1[i + 2] + s1[i + 2] * s2[i + 2];
			inter[i + 3] = 1 - (1 - s1[i + 3]) * (1 - s2[i + 3]);
		}

		assign(output, depremultiply(intermediate));

		return true;
	}
});

Xflow.registerOperator("blendScreen", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input1'} ],
    params:  [ {type: 'texture', source : 'input1'},
			   {type: 'texture', source : 'input2'}],
    evaluate: function (output, input1, input2) {
		var s1 = (premultiply(input1)).data;
		var s2 = (premultiply(input2)).data;
		var intermediate = createImageDataFloat32(input1.width, input1.height);		// for storing blending result
		var inter = intermediate.data;

		for (var i = 0; i < s1.length; i += 4) {
			inter[i] = s1[i] + s2[i] - s1[i] * s2[i];
			inter[i + 1] = s1[i + 1] + s2[i + 1] - s1[i + 1] * s2[i + 1];
			inter[i + 2] = s1[i + 2] + s2[i + 2] - s1[i + 2] * s2[i + 2];
			inter[i + 3] = 1 - (1 - s1[i + 3]) * (1 - s2[i + 3]);
		}

		assign(output, depremultiply(intermediate));

		return true;
	}
});

Xflow.registerOperator("blendDarken", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input1'} ],
    params:  [ {type: 'texture', source : 'input1'},
			   {type: 'texture', source : 'input2'}],
    evaluate: function (output, input1, input2) {
		var s1 = (premultiply(input1)).data;
		var s2 = (premultiply(input2)).data;
		var intermediate = createImageDataFloat32(input1.width, input1.height);		// for storing blending result
		var inter = intermediate.data;

		for (var i = 0; i < s1.length; i += 4) {
			inter[i] = Math.min((1 - s1[i + 3]) * s2[i] + s1[i], (1 - s2[i + 3]) * s1[i] + s2[i]);
			inter[i + 1] = Math.min((1 - s1[i + 3]) * s2[i + 1] + s1[i + 1], (1 - s2[i + 3]) * s1[i + 1] + s2[i + 1]);
			inter[i + 2] = Math.min((1 - s1[i + 3]) * s2[i + 2] + s1[i + 2], (1 - s2[i + 3]) * s1[i + 2] + s2[i + 2]);
			inter[i + 3] = 1 - (1 - s1[i + 3]) * (1 - s2[i + 3]);
		}

		assign(output, depremultiply(intermediate));

		return true;
	}
});

Xflow.registerOperator("blendLighten", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input1'} ],
    params:  [ {type: 'texture', source : 'input1'},
			   {type: 'texture', source : 'input2'}],
    evaluate: function (output, input1, input2, type) {
		var s1 = (premultiply(input1)).data;
		var s2 = (premultiply(input2)).data;
		var intermediate = createImageDataFloat32(input1.width, input1.height);		// for storing blending result
		var inter = intermediate.data;

		for (var i = 0; i < s1.length; i += 4) {
			inter[i] = Math.max((1 - s1[i + 3]) * s2[i] + s1[i], (1 - s2[i + 3]) * s1[i] + s2[i]);
			inter[i + 1] = Math.max((1 - s1[i + 3]) * s2[i + 1] + s1[i + 1], (1 - s2[i + 3]) * s1[i + 1] + s2[i + 1]);
			inter[i + 2] = Math.max((1 - s1[i + 3]) * s2[i + 2] + s1[i + 2], (1 - s2[i + 3]) * s1[i + 2] + s2[i + 2]);
			inter[i + 3] = 1 - (1 - s1[i + 3]) * (1 - s2[i + 3]);
		}

		assign(output, depremultiply(intermediate));

		return true;
	}
});

Xflow.registerOperator("erode", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'filter'}],
    evaluate: function(output, input, filter) {
	var width = input.width;
	var height = input.height;

	var s = input.data;
	var d = output.data;

	filterWidth = Math.sqrt(filter.length);		// width/height of the square filter
	len = Math.floor(filterWidth / 2);			// half of the width/height of the square filter

	for (var j = 0; j < height; j++)
		for (var i = 0; i < width; i++) {
			var offset = (j * width + i) * 4;
			var minR = 255, minG = 255, minB = 255, minA = 255;
			for (var l = -len; l <= len; l++)
				for (var k = -len; k <= len; k++)
					if (j + l >= 0 && j + l < height && i + k >= 0 && i + k < width) {
						var neighborOffset = ((j + l) * width + (k + i)) * 4;
						filterOffset = (l + len) * filterWidth + (k + len);
						minR = (filter[filterOffset] == 1) ? Math.min(minR, s[neighborOffset]) : minR;
						minG = (filter[filterOffset] == 1) ? Math.min(minG, s[neighborOffset + 1]) : minG;
						minB = (filter[filterOffset] == 1) ? Math.min(minB, s[neighborOffset + 2]) : minB;
						minA = (filter[filterOffset] == 1) ? Math.min(minA, s[neighborOffset + 3]) : minA;
					}
			d[offset] = minR;
			d[offset + 1] = minG;
			d[offset + 2] = minB;
			d[offset + 3] = minA;
		}

	return true;
}
});

Xflow.registerOperator("dilate", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'filter'}],
    evaluate: function(output, input, filter) {
	var width = input.width;
	var height = input.height;

	var s = input.data;
	var d = output.data;

	filterWidth = Math.sqrt(filter.length);		// width/height of the square filter
	len = Math.floor(filterWidth / 2);			// half of the width/height of the square filter

	for (var j = 0; j < height; j++)
		for (var i = 0; i < width; i++) {
			var offset = (j * width + i) * 4;
			var maxR = 0, maxG = 0, maxB = 0, maxA = 0;
			for (var l = -len; l <= len; l++)
				for (var k = -len; k <= len; k++)
					if (j + l >= 0 && j + l < height && i + k >= 0 && i + k < width) {
						var neighborOffset = ((j + l) * width + (k + i)) * 4;
						filterOffset = (l + len) * filterWidth + (k + len);
						maxR = (filter[filterOffset] == 1) ? Math.max(maxR, s[neighborOffset]) : maxR;
						maxG = (filter[filterOffset] == 1) ? Math.max(maxG, s[neighborOffset + 1]) : maxG;
						maxB = (filter[filterOffset] == 1) ? Math.max(maxB, s[neighborOffset + 2]) : maxB;
						maxA = (filter[filterOffset] == 1) ? Math.max(maxA, s[neighborOffset + 3]) : maxA;
					}
			d[offset] = maxR;
			d[offset + 1] = maxG;
			d[offset + 2] = maxB;
			d[offset + 3] = maxA;
		}

	return true;
}
});


/* Implements the Erode morphology operators with a square mask of arbitrary size */
Xflow.registerOperator("squareErode", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'size'}],
    evaluate: function(output, input, size) {
	var width = input.width;
	var height = input.height;

	var s = input.data;
	var d = output.data;

	var size = size[0];				// width/height of the square filter
	var len = Math.floor(size / 2);	// half of the width/height of the square filter

	for (var j = 0; j < height; j++)
		for (var i = 0; i < width; i++) {
			var offset = (j * width + i) * 4;
			var R = 255, G = 255, B = 255, A = 255;
			for (var l = -len; l <= len; l++)
				for (var k = -len; k <= len; k++)
					if (j + l >= 0 && j + l < height && i + k >= 0 && i + k < width) {
						var neighborOffset = ((j + l) * width + (k + i)) * 4;
						R = Math.min(R, s[neighborOffset]);
						G = Math.min(G, s[neighborOffset + 1]);
						B = Math.min(B, s[neighborOffset + 2]);
						A = Math.min(A, s[neighborOffset + 3]);
					}
			d[offset] = R;
			d[offset + 1] = G;
			d[offset + 2] = B;
			d[offset + 3] = A;
		}

	return true;
}
});

/* Implements the Dilate morphology operators with a square mask of arbitrary size */
Xflow.registerOperator("squareDilate", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'},
			   {type: 'int', source : 'size'}],
    evaluate: function(output, input, size) {
	var width = input.width;
	var height = input.height;

	var s = input.data;
	var d = output.data;

	var size = size[0];				// width/height of the square filter
	var len = Math.floor(size / 2);	// half of the width/height of the square filter

	for (var j = 0; j < height; j++)
		for (var i = 0; i < width; i++) {
			var offset = (j * width + i) * 4;
			var R = 0, G = 0, B = 0, A = 0;
			for (var l = -len; l <= len; l++)
				for (var k = -len; k <= len; k++)
					if (j + l >= 0 && j + l < height && i + k >= 0 && i + k < width) {
						var neighborOffset = ((j + l) * width + (k + i)) * 4;
						R = Math.max(R, s[neighborOffset]);
						G = Math.max(G, s[neighborOffset + 1]);
						B = Math.max(B, s[neighborOffset + 2]);
						A = Math.max(A, s[neighborOffset + 3]);
					}
			d[offset] = R;
			d[offset + 1] = G;
			d[offset + 2] = B;
			d[offset + 3] = A;
		}

	return true;
}
});


Xflow.registerOperator("equalizedHistogram", {
    outputs: [ {type: 'texture', name : 'output', sizeof: 'input'} ],
    params:  [ {type: 'texture', source : 'input'} ],
    evaluate: function(output, input) {
        var s = input.data;
        var d = output.data;

		var N = input.width * input.height;

		var pr = new Array(256);		// stores the histogram of the input image
		var t = new Array(256);			// stores the transform
		for (var i = 0; i < pr.length; i++)
			pr[i] = t[i] = 0;

		// calculating the histogram values of the input image
		for (var i = 0; i < s.length; i += 4)
			pr[Math.floor(s[i])]++;

		for (var i = 0; i < pr.length; i++)
			pr[i] /= N;

		// transforming the image with the histogram equalization transform
		for (var i = 0; i < t.length; i++)
			for (var j = 0; j <= i; j++)
				t[i] = t[i] + pr[j];

		for (var i = 0; i < t.length; i++)
			t[i] = Math.floor(255 * t[i]);

		// generating the output image, equal channels for grayscale output
		for (var i = 0; i < s.length; i += 4) {
			d[i] = d[i + 1] = d[i + 2] = t[Math.floor(s[i])];
			d[i + 3] = s[i + 3];
		}

        return true;
    }
});
