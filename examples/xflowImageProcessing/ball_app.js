WEBCAM=true;

window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  =
    navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;

var reqAnimFrame = (function(){
    return  window.requestAnimationFrame   ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(f, fps){
            window.setTimeout(f, 1000 / fps);
        };
})();

/**
 * creates a unique id
 *
 * @return {string} unique id
 */
var createUniqueId = (function(prefix) {
    var id = 0;
    return function () {
        do {
            var newid = prefix + id++;
        } while (document.getElementById(newid));
        return newid;
    };
})("uid");

var getTransform = function(obj) {
    return XMOT.util.getOrCreateTransform(obj, createUniqueId());
}

math.mat4.tween = function(m1,m2,t,dst) {
    dst = (dst == null) ? m1 : dst;
    for (var i=0; i<dst.length; i++)
        dst[i] = m1[i]*t + m2[i]*(1-t);
    return dst;
}

// Application configuration

function setupApp() {
    // setup video element to be streamed into canvas
    var ardata = document.getElementById('ardata');
    var background = document.getElementById('background');
    var bgCtx = null;

    var ballXfm = getTransform(document.getElementById('Teapot'));

    var tmpCanvas = null
    var tmpCtx = null;

    if (WEBCAM) {
        // mirror video
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = 640;
        tmpCanvas.height = 480;
    }

    var video = document.getElementsByTagName("video")[0];
    video.width = 640;
    video.height = 480;
    video.loop = true;
    video.volume = 0;
    video.autoplay = false;
    video.controls = false;

    document.getElementById("Start").onclick = function(ev) {
        video.play();
    }
    document.getElementById("Stop").onclick = function(ev) {
        video.pause();
    }

    // Setup debug canvas

    var display = document.getElementById("Display");
    var debugCanvas = document.createElement('canvas');
    debugCanvas.style.position = "absolute";
    debugCanvas.style.top = "10px";
    debugCanvas.style.left = "650px";
    debugCanvas.width = 640;
    debugCanvas.height = 480;
    debugCanvas.id = 'debugCanvas';
    display.appendChild(debugCanvas);

    document.getElementById("Debug").onchange = function(ev) {
        if (document.getElementById("Debug").checked) {
            window.DEBUG = true;
            document.getElementById('debugCanvas').style.display = '';
        } else {
            window.DEBUG = false;
            document.getElementById('debugCanvas').style.display = 'none';
        }
    }

    // Initialize webcam
    if (WEBCAM && navigator.getUserMedia) {
        navigator.getUserMedia(
            {video: true, audio: true}, function(stream) {
                XML3D.debug.logInfo("Accessing WebCam");
                video.autoplay = true;
                video.src = window.URL.createObjectURL(stream);
            }, function (e) {
                XML3D.debug.logError("Cannot access WebCam");
                video.src = "tests/output_4.ogg";
            });
    } else {
        video.src = "tests/output_4.ogg";
    }

    var lastTime = Date.now();
    var dir = 1;
    var matrices = [];

    ardata.addOutputFieldListener(['arvideo', 'transforms', 'visibilities'], function(values) {
        if (values.transforms) {
            var visibilities = values.visibilities;

            while (matrices.length < values.visibilities.length) {
                matrices.push(math.mat4.create());
            }

            var now = Date.now();
            var deltaTime = now - lastTime;
            lastTime = now;

            var animCycleTime = 800;
            var tmp = lastTime % animCycleTime;
            var f = tmp == 0.0 ? 1.0 : tmp / animCycleTime;

            if (f > 1) {
                dir = -dir;
                var last = visibilities.length-1;
            }
            var last = Math.min(last, visibilities.legnth-1);
            var bounce = Math.max(0, f > 0.5 ? f-0.9 : 0.1-f);
            if (dir < 0)
                f = 1-f;

            var visibilities = values.visibilities;
            for (var i = 0; i < values.transforms.length/16; ++i) {
                var j = i * 16;
                if (visibilities[i]) {
                    for (var k = 0; k < 16; ++k) {
                        matrices[i][k] = values.transforms[j+k];
                    }
                }
            }

            var m1 = matrices[0];
            var m2 = matrices[1];

            var dist = math.vec3.createFrom(
                m1[12]-m2[12],
                m1[13]-m2[13],
                m1[14]-m2[14]);
            var distLen = math.vec3.length(dist);


//            var m3x3 = math.mat4.toMat3(m1);
//            var quat = math.quat4.fromRotationMatrix(m3x3);
//            var aa = math.quat4.toAngleAxis(quat);
//            var t1 = math.vec3.createFrom(m1[12], m1[13], m1[14]);
//
//            var m3x3 = math.mat4.toMat3(m2);
//            var quat = math.quat4.fromRotationMatrix(m3x3);
//            var aa = math.quat4.toAngleAxis(quat);
//            var t2 = math.vec3.createFrom(m2[12], m2[13], m2[14]);
//            var dest = math.vec3.create();
//            math.vec3.lerp(t1, t2, f, dest);

            var dest = math.mat4.create();
            math.mat4.tween(m1, m2, f, dest);

            var m3x3 = math.mat4.toMat3(dest);
            var quat = math.quat4.fromRotationMatrix(m3x3);
            var aa = math.quat4.toAngleAxis(quat);
            var tt = math.vec3.createFrom(m1[12], m1[13], m1[14]);


            tt[0] = tt[0] + Math.sin(f*Math.pi/distLen);
            tt[1] = tt[1];
            tt[2] = tt[2];

            if (!(isNaN(aa[0]) || isNaN(aa[1]) || isNaN(aa[2]) || isNaN(aa[3]))) {
                ballXfm.rotation.setAxisAngle(new XML3DVec3(aa[0], aa[1], aa[2]), -aa[3]);
                ballXfm.translation.set(new XML3DVec3(tt[0], tt[1], tt[2]));
            }
        }
        if (values.arvideo) {
            var data = Xflow.toImageData(values.arvideo);
            var width = data.width;
            var height = data.height;

            // Setup background canvas
            if (width != background.width || height != background.height || !bgCtx) {
                background.width = width;
                background.height = height;
                bgCtx = background.getContext('2d');
                if (WEBCAM) {
                    // flip image so we see it as a mirror
                    bgCtx.translate(width, 0);
                    bgCtx.scale(-1, 1);
                    // painting will be done via temporary canvas
                } else {
                    // Paint camera picture on background
                    bgCtx.putImageData(data, 0, 0);
                }
            }

            // Mirror picture
            if (WEBCAM) {
                if (width != tmpCanvas.width || height != tmpCanvas.height || !tmpCtx) {
                    tmpCanvas.width = width;
                    tmpCanvas.height = height;
                    tmpCtx = tmpCanvas.getContext('2d');
                }
                tmpCtx.putImageData(data, 0, 0);
                // Paint camera picture on background
                bgCtx.drawImage(tmpCanvas, 0, 0);
            }
        }
    });

}

window.onload = function() {
    setupApp();
}
