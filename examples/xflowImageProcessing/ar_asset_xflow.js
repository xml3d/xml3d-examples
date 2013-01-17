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

var modelNames = ["Engineer", "Heavy", "Sniper", "Medic", "Scout"];

var docAnims = {
    "keyEngineer" : 4.41667,
    "keyHeavy" : 5.29167,
    "keySniper" : 3.375,
    "keyMedic" : 3.16667,
    "keyScout" : 6.04167
}

// Animation configuration

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

// Application configuration

function setupApp() {
    // setup video element to be streamed into canvas
    var ardata = document.getElementById('ardata');
    var background = document.getElementById('background');
    var bgContext = null;

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
                video.autoplay = true;
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
//    if (WEBCAM)
//    {
//        // mirror video
//        mirrorCanvas = document.createElement('canvas');
//        mirrorCanvas.width = 640;
//        mirrorCanvas.height = 480;
//        mirrorCanvas.style.position = "absolute";
//        mirrorCanvas.style.top = "10px";
//
//        mirrorCtx = mirrorCanvas.getContext('2d');
//
//        mirrorCtx.translate(mirrorCanvas.width, 0);
//        mirrorCtx.scale(-1, 1);
//        video.style.display = "none";
//
//        display.insertBefore(mirrorCanvas, display.firstChild);
//    }

    var debugCanvas = document.createElement('canvas');
    debugCanvas.style.position = "absolute";
    debugCanvas.style.top = "10px";
    debugCanvas.style.left = "650px";
    debugCanvas.width = 640;
    debugCanvas.height = 480;
    debugCanvas.id = 'debugCanvas';
    display.appendChild(debugCanvas);

    var view = document.getElementById("View");

    //var engineer = document.getElementById("Scout");
    //var objectXfm = getTransform(engineer);
    //    var objectXfm = document.getElementById("ObjectXfm");


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
            //var transform = getTransform(element);
            var transform = null;
            return {
                name: name,
                element: element,
                transform: transform,
                setVisible : function (value) {
                    element.setAttribute("visible", value ? true : false);
                },
                isVisible : function() {
                    return element.getAttribute("visible") == "true";
                }
            };})();
    }

    var videoField = WEBCAM ? 'flipvideo' : 'arvideo';

    ardata.addOutputFieldListener([videoField, 'transform', 'visibility'], function(values) {
        if (values[videoField]) {
            var data = Xflow.toImageData(values[videoField]);

            // Paint camera picture on background
            var width = data.width;
            var height = data.height;
            if (width != background.width || height != background.height || !bgContext) {
                background.width = width;
                background.height = height;
                bgContext = background.getContext('2d');
            }
            bgContext.putImageData(data, 0, 0);
        }

        if (values.visibility) {
            var visibility = values.visibility;
            for (var i = 0; i < visibility.length; ++i) {

                if (!objects[i]) {
                    if (i >= models.length)
                        continue;
                    //var j = i % models.length;
                    var j = i;
                    var model = models[j];
                    objects[i] = {model: model};
                    console.log("object["+i+"] model["+j+"] name="+model.name);
                }

                objects[i].model.setVisible(visibility[i]);
            }
        }

        if (!values.transform)
            return;

        var transform = values.transform;


        for (var i in objects)
            objects[i].model.setVisible(false);

        for (var i = 0; i < visibility.length; ++i) {

            if (!objects[i]) {
                if (i >= models.length)
                    continue;
                //var j = i % models.length;
                var j = i;
                var model = models[j];
                objects[i] = {model: model};
                console.log("object["+i+"] model["+j+"] name="+model.name);
            }

            objects[i].model.setVisible(visibility[i]);
            if (!visibility[i])
                continue;

            var mi = 16*i;
            if (WEBCAM) {
                var m4x4 = math.mat4.createFrom(
                    transform[mi+0],
                    transform[mi+1],
                    transform[mi+2],
                    transform[mi+3],
                    transform[mi+4],
                    transform[mi+5],
                    transform[mi+6],
                    transform[mi+7],
                    transform[mi+8],
                    transform[mi+9],
                    transform[mi+10],
                    transform[mi+11],
                    transform[mi+12],
                    transform[mi+13],
                    transform[mi+14],
                    transform[mi+15]
                );
            } else {
                var m4x4 = math.mat4.createFrom(
                    transform[mi+0],
                   -transform[mi+1],
                   -transform[mi+2],
                    transform[mi+3],
                   -transform[mi+4],
                    transform[mi+5],
                    transform[mi+6],
                    transform[mi+7],
                   -transform[mi+8],
                    transform[mi+9],
                    transform[mi+10],
                    transform[mi+11],
                   -transform[mi+12],
                    transform[mi+13],
                    transform[mi+14],
                    transform[mi+15]
                );
            }
            var m3x3 = math.mat4.toMat3(m4x4);
            var quat = math.quat4.fromRotationMatrix(m3x3);
            var aa = math.quat4.toAngleAxis(quat);

            if (isNaN(aa[0]) || isNaN(aa[1]) || isNaN(aa[2]) || isNaN(aa[3]))
                continue;

            var modelXfm = objects[i].model.transform;
            modelXfm.rotation.setAxisAngle(new XML3DVec3(aa[0], aa[1], aa[2]), -aa[3]);
            modelXfm.translation.set(new XML3DVec3(m4x4[12], m4x4[13], m4x4[14]));
//            console.log('M4x4')
//            console.log(m4x4)
//            console.log('LM')
//            console.log(objects[i].model.element.getLocalMatrix()._data)
            console.log('DONE');
        }
    });

}

window.onload = function() {
    setupApp();
    setupAnim();
}
