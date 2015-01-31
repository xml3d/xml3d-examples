Xflow.registerOperator("xflow.calculateTangents", {
    outputs: [{type: 'float4', name: 'result', customAlloc: true}],
    params: [{type: 'int', source: 'index'}, {type: 'float3', source: 'position'}, {
        type: 'float3', source: 'normal'
    }, {type: 'float2', source: 'texcoord'}],
    alloc: function (sizes, index, position) {
        sizes['result'] = position.length / 3;
    },
    evaluate: function (result, index, position, normal, texcoord) {
        var tan1 = new Float32Array(position.length);
        var tan2 = new Float32Array(position.length);
        var triangleCount = index.length / 3;
        var vertexCount = position.length / 3;

        for (var a = 0; a < triangleCount; a++) {
            var i1 = index[a * 3];
            var i2 = index[a * 3 + 1];
            var i3 = index[a * 3 + 2];

            var vo1 = i1 * 3, to = i1 * 2;
            var v1x = position[vo1];
            var v1y = position[vo1 + 1];
            var v1z = position[vo1 + 2];
            var w1x = texcoord[to];
            var w1y = texcoord[to + 1];

            var vo2 = i2 * 3;
            to = i2 * 2;
            var v2x = position[vo2];
            var v2y = position[vo2 + 1];
            var v2z = position[vo2 + 2];
            var w2x = texcoord[to];
            var w2y = texcoord[to + 1];

            var vo3 = i3 * 3;
            to = i3 * 2;
            var v3x = position[vo3];
            var v3y = position[vo3 + 1];
            var v3z = position[vo3 + 2];
            var w3x = texcoord[to];
            var w3y = texcoord[to + 1];


            var x1 = v2x - v1x;
            var x2 = v3x - v1x;
            var y1 = v2y - v1y;
            var y2 = v3y - v1y;
            var z1 = v2z - v1z;
            var z2 = v3z - v1z;

            var s1 = w2x - w1x;
            var s2 = w3x - w1x;
            var t1 = w2y - w1y;
            var t2 = w3y - w1y;

            var r = 1 / (s1 * t2 - s2 * t1);
            var sdirx = (t2 * x1 - t1 * x2) * r;
            var sdiry = (t2 * y1 - t1 * y2) * r;
            var sdirz = (t2 * z1 - t1 * z2) * r;

            var tdirx = (s1 * x2 - s2 * x1) * r;
            var tdiry = (s1 * y2 - s2 * y1) * r;
            var tdirz = (s1 * z2 - s2 * z1) * r;

            tan1[vo1] += sdirx;
            tan1[vo1 + 1] += sdiry;
            tan1[vo1 + 2] += sdirz;

            tan1[vo2] += sdirx;
            tan1[vo2 + 1] += sdiry;
            tan1[vo2 + 2] += sdirz;

            tan1[vo3] += sdirx;
            tan1[vo3 + 1] += sdiry;
            tan1[vo3 + 2] += sdirz;

            tan2[vo1] += tdirx;
            tan2[vo1 + 1] += tdiry;
            tan2[vo1 + 2] += tdirz;

            tan2[vo2] += tdirx;
            tan2[vo2 + 1] += tdiry;
            tan2[vo2 + 2] += tdirz;

            tan2[vo3] += tdirx;
            tan2[vo3 + 1] += tdiry;
            tan2[vo3 + 2] += tdirz;
        }

        for (a = 0; a < vertexCount; a++) {
            var vo = a * 3;
            var nx = normal[vo], ny = normal[vo + 1], nz = normal[vo + 2], tan1x = tan1[vo], tan1y = tan1[vo + 1], tan1z = tan1[vo + 2], tan2x = tan2[vo], tan2y = tan2[vo + 1], tan2z = tan2[vo + 2];

            var ndott = nx * tan1x + ny * tan1y + nz * tan1z;

            // Gram-Schmidt orthogonalize
            var rx = tan1x - nx * ndott;
            var ry = tan1y - ny * ndott;
            var rz = tan1z - nz * ndott;

            var len = rx * rx + ry * ry + rz * rz;
            if (len > 0) {
                len = 1 / Math.sqrt(len);
                rx = rx * len;
                ry = ry * len;
                rz = rz * len;
            }

            result[a * 4] = rx;
            result[a * 4 + 1] = ry;
            result[a * 4 + 2] = rz;
            result[a * 4 + 3] = 0.0; // TODO: Handedness
        }
    }
});
