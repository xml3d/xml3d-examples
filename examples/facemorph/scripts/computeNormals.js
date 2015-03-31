
Xflow.registerOperator("xflow.computeNormals", {
    outputs: [{type: 'float3', name: 'normal'}],
    params:  [{type: 'float3', source: 'position'}, {type: 'int', source: 'index'}],

    evaluate: function(normal, position, index) {
        for (var i = 0; i < normal.length; i++) normal[i] = 0;
        var e1 = e2 = norm = [0,0,0];
        var v1 = v2 = v3 = [0,0,0];
        var ind;

        for (var i=0; i < index.length; i+=3) {
            ind = index[i] * 3;
            v1 = [position[ind], position[ind+1], position[ind+2]];
            ind = index[i+1] * 3;
            v2 = [position[ind], position[ind+1], position[ind+2]];
            ind = index[i+2] * 3;
            v3 = [position[ind], position[ind+1], position[ind+2]];

            var x = v3[0] - v1[0]; var y = v3[1] - v1[1]; var z = v3[2] - v1[2];
            var x2 = v2[0] - v1[0]; var y2 = v2[1] - v1[1]; var z2 = v2[2] - v1[2];

            //Cross product
            norm[0] = y*z2 - z*y2;
            norm[1] = z*x2 - x*z2;
            norm[2] = x*y2 - y*x2;

            for (var j=0; j<3; ++j) {
                ind = index[i+j]*3;
                normal[ind] += norm[0];
                normal[ind+1] += norm[1];
                normal[ind+2] += norm[2];
            }
            //No need to normalize the result since it's normalized in the vertex shader
        }

    }
});