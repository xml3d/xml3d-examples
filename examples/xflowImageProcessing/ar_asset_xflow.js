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

// Animation configuration

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

function updateAnim() {
    var diff = Date.now() - lastTime;
    lastTime = Date.now();
    mytime += diff / 1200;
    for (var id in docAnims) {
        var maxValue = docAnims[id];
        var value = mytime % maxValue;
        var el = document.getElementById(id);
        if (!el)
            continue;
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
    var bgCtx = null;

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

    ardata.addOutputFieldListener(['arvideo'], function(values) {
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
    setupAnim();
}
