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

/* Setup animation */
var mytime = 0;
var lastTime = Date.now();

var modelNames = ["Heavy", "Sniper", "Medic", "Engineer", "Scout"];

var docAnims = {
    "keyHeavy" : 5.29167,
    "keySniper" : 3.375,
    "keyMedic" : 3.16667,
    "keyEngineer" : 4.41667,
    "keyScout" : 6.04167
}

//function get

function updateAnim() {
    var diff = Date.now() - lastTime;
    lastTime = Date.now();
    mytime += diff / 1200;
    for (var id in docAnims) {
        var maxValue = docAnims[id];
        var value = mytime % maxValue;
        var el = document.getElementById(id);
        el.removeChild(el.firstChild);
        el.appendChild(document.createTextNode(value));
        //$("#" + id).text(value);
    }
    reqAnimFrame(updateAnim);
}
function setupAnim() {
    reqAnimFrame(updateAnim);
}

function setupAR() {
    //var video = document.createElement('video');
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
    document.getElementById("Debug").onchange = function(ev) {
        if (document.getElementById("Debug").checked) {
            window.DEBUG = true;
            document.getElementById('debugCanvas').style.display = '';
        } else {
            window.DEBUG = false;
            document.getElementById('debugCanvas').style.display = 'none';
        }
    }

    if (WEBCAM && navigator.getUserMedia) {
        navigator.getUserMedia(
            {video: true, audio: true}, function(stream) {
                XML3D.debug.logInfo("Accessing WebCam");
                video.src = window.URL.createObjectURL(stream);
            }, function (e) {
                XML3D.debug.logError("Cannot access WebCam");
                video.src = "tests/output_4.ogg";
            });
    } else {
        video.src = "tests/output_4.ogg";
    }

    if (!video.parentNode) {
        document.body.appendChild(video);
    }

    var canvas = document.createElement('canvas'); // canvas to draw our video on
    canvas.width = 640;
    canvas.height = 480;

    var ctx = canvas.getContext('2d');

    var display = document.getElementById("Display");
    var mirrorCanvas = null;
    var mirrorCtx = null;
    if (WEBCAM)
    {
        // mirror video
        mirrorCanvas = document.createElement('canvas');
        mirrorCanvas.width = 640;
        mirrorCanvas.height = 480;
        mirrorCanvas.style.position = "absolute";
        mirrorCanvas.style.top = "10px";

        mirrorCtx = mirrorCanvas.getContext('2d');

        mirrorCtx.translate(mirrorCanvas.width, 0);
        mirrorCtx.scale(-1, 1);
        video.style.display = "none";

        display.insertBefore(mirrorCanvas, display.firstChild);
    }

    var debugCanvas = document.createElement('canvas');
    debugCanvas.style.position = "absolute";
    debugCanvas.style.top = "10px";
    debugCanvas.style.left = "650px";
    debugCanvas.width = 640;
    debugCanvas.height = 480;
    debugCanvas.id = 'debugCanvas';
    display.appendChild(debugCanvas);

    var raster = new NyARRgbRaster_Canvas2D(canvas); // create reader for the video canvas
    var param = new FLARParam(640,480); // create new Param for the canvas [~camera params]

    var resultMat = new NyARTransMatResult(); // store matrices we get in this temp matrix

    var detector = new FLARMultiIdMarkerDetector(param, 80); // marker size is 80 [transform matrix units]
    detector.setContinueMode(true);
    var view = document.getElementById("View");

    //var engineer = document.getElementById("Scout");
    //var objectXfm = getTransform(engineer);
    //    var objectXfm = document.getElementById("ObjectXfm");

    // view.position
    var viewMat = math.mat4.create();
    param.copyCameraMatrix(viewMat, 100, 10000);
    var projMat = param.getProjectionMatrix(100, 10000);
    var fovyAndAspect = param.getFovyAndAspect();
    document.viewMat = viewMat;

    var times = [];
    var pastResults = {};
    var lastTime = 0;
    var objects = {}; // one object per marker
    var models = [];
    for (var i in modelNames) {
        models[i] = (function () {
            var name = modelNames[i];
            var element = document.getElementById(name);
            element.setAttribute("visible", false);
            var transform = getTransform(element);
            return {
                name: name,
                element: element,
                transform: transform,
                setVisible : function (value) {
                    element.setAttribute("visible", value);
                },
                isVisible : function() {
                    return element.getAttribute("visible") == "true";
                }
            };})();
    }

    function processFrame() {
        reqAnimFrame(processFrame, XML3D.webgl.MAXFPS);
        if (video.paused) return;
        if (window.paused) return;
        if (video.currentTime == lastTime) return;
        lastTime = video.currentTime;

        ctx.drawImage(video, 0,0,640,480); // draw video to canvas
        if (mirrorCtx) {
            mirrorCtx.drawImage(video, 0, 0, 640, 480);
        }
        var dt = new Date().getTime();

        canvas.changed = true;

        //videoTex.material.textures.Texture0.changed = true;
        //videoTex.material.textures.Texture0.upload();

        var t = new Date();

        // detect markers from the canvas (using the raster reader we created for it)
        // use 170 as threshold value (0-255)
        var detected = detector.detectMarkerLite(raster, 110); // 110

        for (var idx = 0; idx<detected; idx++) {
            var id = detector.getIdMarkerData(idx);
            var currId;
            // read back id marker data byte by byte (welcome to javaism)
            if (id.packetLength > 4) {
                currId = -1;
            } else {
                currId = 0;
                for (var i = 0; i < id.packetLength; i++ ) {
                    currId = (currId << 8) | id.getPacketData(i);
                    //console.log("id[", i, "]=", id.getPacketData(i));
                }
            }
            //console.log("[add] : ID = " + currId);
            if (!pastResults[currId]) {
                pastResults[currId] = {};
            }

            // get the transform matrix for the marker
            // getTransformMatrix copies it to resultMat
            detector.getTransformMatrix(idx, resultMat);
//            document.resultMat = Object.asCopy(resultMat);

            pastResults[currId].age = 0;
            pastResults[currId].transform = Object.asCopy(resultMat);
            if (idx == 0)
                times.push(new Date()-t);
        }

        /* document.objectXfm = objectXfm; */

        for (var i in pastResults) {
            var r = pastResults[i];
            if (r.age > 5)
                delete pastResults[i];
            r.age++;
        }

        for (var i in objects)
            objects[i].model.setVisible(false);
        for (var i in pastResults) {
            if (!objects[i]) {
                var j = i % models.length;
                var model = models[j];
                objects[i] = {model: model};
                console.log("object["+i+"] model["+j+"] name="+model.name);
            }
            objects[i].model.setVisible(true);

            var xfm = pastResults[i].transform;
            var m4x4 = math.mat4.createFrom(
                xfm.m00, -xfm.m10, xfm.m20, 0,
                xfm.m01, -xfm.m11, xfm.m21, 0,
                -xfm.m02, xfm.m12, -xfm.m22, 0,
                xfm.m03, -xfm.m13, xfm.m23, 1
            );

            var m3x3 = math.mat4.toMat3(m4x4);
            var quat = math.quat4.fromRotationMatrix(m3x3);
            /* DEBUG
             document.transform = pastResults[i].transform;
             document.m = m4x4;
             document.q = quat;
             */

            var aa = math.quat4.toAngleAxis(quat);
            var modelXfm = objects[i].model.transform;
            if (WEBCAM) {
                modelXfm.rotation.setAxisAngle(new XML3DVec3(aa[0], -aa[1], aa[2]), aa[3]);
                modelXfm.translation.set(new XML3DVec3(-m4x4[12], m4x4[13], -m4x4[14]));
            } else {
                modelXfm.rotation.setAxisAngle(new XML3DVec3(aa[0], aa[1], -aa[2]), aa[3]);
                modelXfm.translation.set(new XML3DVec3(m4x4[12], m4x4[13], -m4x4[14]));
            }
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

        if (detected == 0) times.push(new Date()-t);
        if (times.length > 100) {
            if (window.console) {
                //console.log(times.reduce(function(s,i){return s+i;})/times.length);
            }

            times.splice(0);
        }
    }
    processFrame();
}

window.onload = function() {
    setupAR();
    setupAnim();
}
