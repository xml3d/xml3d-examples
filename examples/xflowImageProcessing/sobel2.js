var request = null;
var value = null;

window.onload = function() {

    var canvas = document.createElement('canvas');
    var context = null;
    document.body.appendChild(canvas);

    var g = document.getElementById('images');
    g.addOutputFieldListener('gauss', function(values) {
        var data = Xflow.toImageData(values.gauss);

        var width = data.width;
        var height = data.height;
        if (width != canvas.width || height != canvas.height || context == null) {
            canvas.width = width;
            canvas.height = height;
            context = canvas.getContext('2d');
        }

        context.putImageData(data, 0, 0);
    });

//    request = XML3D.base.callAdapterFunc(g, {
//        getComputeRequest : [["grayscale"], function(request, response) {
//            console.log("request");
//        }
//        ]});
//    value = request[0].getResult().getOutputData('grayscale');
//    console.log(value);
//    console.log(value.isLoading && value.isLoading());
};
