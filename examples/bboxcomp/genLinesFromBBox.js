/**
 *  This Xflow operator takes a bounding box in the form [minPoint,maxPoint] and generates the
 *  vertices needed to draw the lines of a box using linestrips.
 */
Xflow.registerOperator("xflow.genLinesFromBBox", {
    outputs: [  {type: 'float3', name: 'position', customAlloc: true, array: true},
        {type: 'int', name: 'vertexCount', array: true, customAlloc: true}],
    params: [  {type: 'float3', source: 'bbox', array: true}
    ],

    alloc: function(sizes, bbox) {
        sizes['position'] = 28;
        sizes['vertexCount'] = 6;
    },
    evaluate: (function() {
        var i = 0;
        var pos;

        var setLine = function(vec) {
            pos.set(vec.data, i);
            i+=3;
        };

        return function(position, vertexCount, bbox, info) {
            i = 0;
            pos = position;
            var min = new XML3D.Vec3(bbox[0], bbox[1], bbox[2]);
            var max = new XML3D.Vec3(bbox[3], bbox[4], bbox[5]);
            var sx = max.sub(min).mul(new XML3D.Vec3(1, 0, 0));
            var sy = max.sub(min).mul(new XML3D.Vec3(0, 1, 0));
            var sz = max.sub(min).mul(new XML3D.Vec3(0, 0, 1));
            var p;

            //Front face
            setLine(p = max);
            setLine(p = p.sub(sy));
            setLine(p = p.sub(sx));
            setLine(p = p.add(sy));
            setLine(p = p.add(sx));
            vertexCount[0] = 5;

            //Back face
            setLine(p = min);
            setLine(p = p.add(sx));
            setLine(p = p.add(sy));
            setLine(p = p.sub(sx));
            setLine(p = p.sub(sy));
            vertexCount[1] = 5;

            //Connecting lines
            setLine(max);
            setLine(max.sub(sz));
            vertexCount[2] = 2;
            setLine(p = max.sub(sx));
            setLine(p.sub(sz));
            vertexCount[3] = 2;
            setLine(min);
            setLine(p = min.add(sz));
            vertexCount[4] = 2;
            setLine(p = min.add(sx));
            setLine(p.add(sz));
            vertexCount[5] = 2;
        }
    })()

});
