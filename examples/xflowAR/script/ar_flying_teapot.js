WEBCAM=true;

window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  =
    navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;


// Application configuration

function setupApp() {
    // setup video element to be streamed into canvas
    var ardata = document.getElementById('arBase');
    var background = document.getElementById('background');
    var bgCtx = null;

    var ballXfm = document.getElementById('t_teapot_ar');
    var ballLocalXfm = document.getElementById('t_teapot_local');

    var lastTime = Date.now();
    var dir = 1;
    var matrices = [];

    var m3x3 = math.mat3.create();
    var dir = math.vec3.create();
    var p1 = math.vec3.create();
    var p2 = math.vec3.create();
    var tv = math.vec3.create();
    var upVector = math.vec3.create();
    var quat1 = math.quat4.create();
    var quat2 = math.quat4.create();
    var aa = math.quat4.create();
    var axis = new XML3DVec3();
    var matrixIndex = [0,0]; // index of two matrices for interpolation

    var observer = new XML3DDataObserver(function (records, observer) {
        var transforms = records[0].result.getValue("transforms");
        var flipvideo = records[0].result.getValue("flipvideo");
        var visibilities = records[0].result.getValue("visibilities");
        if (transforms) {
            while (matrices.length < visibilities.length) {
                matrices.push(math.mat4.create());
            }

            var now = Date.now();
            var deltaTime = now - lastTime;
            lastTime = now;

            var animCycleTime = 1000*2;
            var tmp = lastTime % animCycleTime;
            var f = tmp == 0.0 ? 1.0 : tmp / animCycleTime;

            var f1 = 1-Math.abs((f*2)-1);


//            if (f > 1) {
//                dir = -dir;
//                var last = visibilities.length-1;
//            }
//            var last = Math.min(last, visibilities.legnth-1);
//            var bounce = Math.max(0, f > 0.5 ? f-0.9 : 0.1-f);
//            if (dir < 0)
//                f = 1-f;

            var visibilities = visibilities;
            var mi = 0;
            for (var i = 0; i < transforms.length/16; ++i) {
                var j = i * 16;
                if (visibilities[i]) {
                    if (mi < 2) // we need only two positions for interpolation
                        matrixIndex[mi++] = i;
                    for (var k = 0; k < 16; ++k) {
                        matrices[i][k] = transforms[j+k];
                    }
                }
            }

            var m1 = matrices[matrixIndex[0]];
            var m2 = matrices[matrixIndex[1]];

            math.mat4.toMat3(m1, m3x3);
            math.quat4.fromRotationMatrix(m3x3, quat1);

            math.mat4.toMat3(m2, m3x3);
            math.quat4.fromRotationMatrix(m3x3, quat2);

            var quat = quat1;
            math.quat4.slerp(quat1, quat2, f1, quat);

            dir[0] = m1[12]-m2[12];
            dir[1] = m1[13]-m2[13];
            dir[2] = m1[14]-m2[14];
            var dirLen = math.vec3.length(dir);
            math.quat4.toAngleAxis(quat, aa);

            p1[0] = m1[12];
            p1[1] = m1[13];
            p1[2] = m1[14];

            p2[0] = m2[12];
            p2[1] = m2[13];
            p2[2] = m2[14];

            upVector[0] = 0;
            upVector[1] = 1;
            upVector[0] = 0;

            math.mat3.multiplyVec3(m1, upVector);

            tv[0] = p2[0] + dir[0]*f1;
            tv[1] = p2[1] + dir[1]*f1;
            tv[2] = p2[2] + dir[2]*f1;

            var height = Math.sin(f1*Math.PI)*Math.max(dirLen, 200);

            ballLocalXfm.translation.set(0, 0, height);

            if (!(isNaN(aa[0]) || isNaN(aa[1]) || isNaN(aa[2]) || isNaN(aa[3]))) {
                axis.x = aa[0];
                axis.y = aa[1];
                axis.z = aa[2];

                ballXfm.rotation.setAxisAngle(axis, -aa[3]);
                ballXfm.translation.set(tv[0], tv[1], tv[2]);
            }
        }
        if (flipvideo) {
            var data = Xflow.toImageData(flipvideo);
            var width = data.width;
            var height = data.height;

            // Setup background canvas
            if (width != background.width || height != background.height || !bgCtx) {
                background.width = width;
                background.height = height;
                bgCtx = background.getContext('2d');
            }
            bgCtx.putImageData(data, 0, 0);
        }
    });
    observer.observe(ardata, {names: ["flipvideo", "transforms", "visibilities"]});

    var observer = new XML3DDataObserver(function (records, observer) {
        var threshold = records[0].result.getValue("threshold");
        document.getElementById("thresholdView").innerHTML = threshold[0];
    });
    observer.observe(ardata, {names: ["threshold"]});
}

window.onload = function() {
    setupApp();
}
