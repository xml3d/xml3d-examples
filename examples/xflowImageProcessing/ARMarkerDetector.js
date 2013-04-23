(function() {

var ar = null;

function drawImageData(imageData) {
    if (!ar.scaleCanvas)
        ar.scaleCanvas = document.createElement('canvas');

    if (ar.scaleCanvas.width != imageData.width || ar.scaleCanvas.height != imageData.height) {
        ar.scaleCanvas.width = imageData.width;
        ar.scaleCanvas.height = imageData.height;
        ar.scaleContext = ar.scaleCanvas.getContext('2d');
    }

    ar.scaleContext.putImageData(imageData, 0, 0);

    if (!ar.canvas) {
        ar.canvas = document.createElement('canvas');
        ar.canvas.width = 640;
        ar.canvas.height = 480;
        ar.context = ar.canvas.getContext('2d');
    }

    ar.context.drawImage(ar.scaleCanvas, 0, 0, ar.canvas.width, ar.canvas.height);
    ar.canvas.changed = true;
}

function initARToolkit(imageData) {
    ar = {};

    drawImageData(imageData);
    ar.raster = new NyARRgbRaster_Canvas2D(ar.canvas); // create reader for the video canvas
    ar.param = new FLARParam(ar.canvas.width,ar.canvas.height); // create new Param for the canvas [~camera params]

    // view.position
    var viewMat = math.mat4.create();
    var zNear = 0.1;
    var zFar = 100000.0;
    ar.param.copyCameraMatrix(viewMat, zNear, zFar);
    var projMat = ar.param.getProjectionMatrix(zNear, zFar);
    //var fovyAndAspect = ar.param.getFovyAndAspect();

    ar.perspective = projMat;

    ar.resultMat = new NyARTransMatResult(); // store matrices we get in this temp matrix

    ar.detector = new FLARMultiIdMarkerDetector(ar.param, 80); // marker size is 80 [transform matrix units]
    ar.detector.setContinueMode(true);
}

Xflow.registerOperator("ARMarkerDetector", {
    outputs: [ {type: 'float4x4', name : 'transform', customAlloc: true},
               {type: 'bool', name: 'visibility', customAlloc: true},
               {type: 'float4x4', name : 'perspective', customAlloc: true}
             ],
    params:  [ {type: 'texture', source : 'image'},
               {type: 'int', source: 'markers'},
               {type: 'int', source: 'threshold'},
               {type: 'bool', source: 'noflip', optional: true}
             ],
    alloc: function(sizes, image, markers) {
        var len = markers.length;
        sizes['transform'] = len;
        sizes['visibility'] = len;
        sizes['perspective'] = 1;
    },
    evaluate: function(transform, visibility, perspective, image, markers, threshold, noflip) {

        if (!ar) {
            initARToolkit(image);
        } else {
            drawImageData(image);
        }

        var raster = ar.raster;

        for (var i = 0; i < 16; ++i) {
            perspective[i]  = ar.perspective[i];
        }

        // detect markers from the canvas (using the raster reader we created for it)
        // use 170 as threshold value (0-255)
        var detected = ar.detector.detectMarkerLite(raster, threshold[0]); // 110 / 170

        for (var i = 0; i < transform.length; ++i) {
            visibility[i] = false;
            // set matrix to identity
            var mi = 16*i;

            transform[mi+0]  = 1;
            transform[mi+1]  = 0;
            transform[mi+2]  = 0;
            transform[mi+3]  = 0;
            transform[mi+4]  = 0;
            transform[mi+5]  = 1;
            transform[mi+6]  = 0;
            transform[mi+7]  = 0;
            transform[mi+8]  = 0;
            transform[mi+9]  = 0;
            transform[mi+10] = 1;
            transform[mi+11] = 0;
            transform[mi+12] = 0;
            transform[mi+13] = 0;
            transform[mi+14] = 0;
            transform[mi+15] = 1;
        }

        for (var idx = 0; idx < detected; idx++) {
            var id = ar.detector.getIdMarkerData(idx);
            var currId;
            // read back id marker data byte by byte (welcome to javaism)
            if (id.packetLength > 4) {
                currId = -1;
            } else {
                currId = 0;
                for (var i = 0; i < id.packetLength; i++) {
                    currId = (currId << 8) | id.getPacketData(i);
                    //console.log("id[", i, "]=", id.getPacketData(i));
                }
            }
            //console.log("[add] : ID = " + currId);

            var outputIndex = -1;

            for (var i = 0; i < markers.length; ++i) {
                if (markers[i] == currId) {
                    outputIndex = i;
                    break;
                }
            }

            visibility[outputIndex] = true;

            // get the transform matrix for the marker
            // getTransformMatrix copies it to resultMat
            ar.detector.getTransformMatrix(idx, ar.resultMat);

            var mi = 16*i;
            var xfm = ar.resultMat;

            var webcamFlipped = true;
            if (noflip && noflip[0])
                webcamFlipped = false;


            if (webcamFlipped) {
                // webcam (we show mirrored picture on the screen)
                transform[mi+0]  = +xfm.m00;
                transform[mi+1]  = +xfm.m10;
                transform[mi+2]  = +xfm.m20;
                transform[mi+3]  = 0;
                transform[mi+4]  = -xfm.m01;
                transform[mi+5]  = -xfm.m11;
                transform[mi+6]  = -xfm.m21;
                transform[mi+7]  = 0;
                transform[mi+8]  = -xfm.m02;
                transform[mi+9]  = -xfm.m12;
                transform[mi+10] = -xfm.m22;
                transform[mi+11] = 0;
                transform[mi+12] = -xfm.m03;
                transform[mi+13] = -xfm.m13;
                transform[mi+14] = -xfm.m23;
                transform[mi+15] = 1;
            } else {
                // no webcam (we show as is)
                transform[mi+0]  = +xfm.m00;
                transform[mi+1]  = -xfm.m10;
                transform[mi+2]  = -xfm.m20;
                transform[mi+3]  = 0;
                transform[mi+4]  = +xfm.m01;
                transform[mi+5]  = -xfm.m11;
                transform[mi+6]  = -xfm.m21;
                transform[mi+7]  = 0;
                transform[mi+8]  = +xfm.m02;
                transform[mi+9]  = -xfm.m12;
                transform[mi+10] = -xfm.m22;
                transform[mi+11] = 0;
                transform[mi+12] = +xfm.m03;
                transform[mi+13] = -xfm.m13;
                transform[mi+14] = -xfm.m23;
                transform[mi+15] = 1;
            }


            // original
//            var m4x4 = math.mat4.createFrom(
//                xfm.m00, -xfm.m10, xfm.m20, 0,
//                xfm.m01, -xfm.m11, xfm.m21, 0,
//                -xfm.m02, xfm.m12, -xfm.m22, 0,
//                xfm.m03, -xfm.m13, xfm.m23, 1
//            );
//            var m3x3 = math.mat4.toMat3(m4x4);
//            var quat = math.quat4.fromRotationMatrix(m3x3);
        }

//         {m00 -m10  m20 0
//          m01 -m11  m21 0
//         -m02  m12 -m22 0
//          <m03> <-m13>  <m23> 1}
        /*
         cm[0] = mat.m00;
         cm[1] = -mat.m10;
         cm[2] = mat.m20;
         cm[3] = 0;
         cm[4] = mat.m01;
         cm[5] = -mat.m11;
         cm[6] = mat.m21;
         cm[7] = 0;
         cm[8] = -mat.m02;
         cm[9] = mat.m12;
         cm[10] = -mat.m22;
         cm[11] = 0;
         cm[12] = mat.m03; // Translation X
         cm[13] = -mat.m13; // Translation Y
         cm[14] = mat.m23; // Translation Z
         cm[15] = 1;
         */

        return true;
    }
});

})();
