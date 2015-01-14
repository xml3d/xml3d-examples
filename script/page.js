
var CATEGORY_LIST = {
    unknown : { name : "???" },
    basic: { name: "Basics" },
    external : { name: "External References" },
    shader : { name: "Shaders" },
    xflow : { name: "Xflow" },
    ar : { name: "Augmented Reality"},
    ip : {name: "Image Processing"}
}

var EXAMPLE_LIST = [

    {cat: "basic", name: "Assets", href: "examples/assets/assets.html",
        info: "Demonstrates the use of assets to include 3D models in your scene."},
    {cat: "basic", name: "Recursive Assets", href: "examples/recursiveAsset/recursive.html",
        info: "Demonstrates the recursive embedding of assets to customize complex models."},
    {cat: "basic", name: "Directional Light", href: "examples/directionalLight/index.html",
        info: "Demonstrates the directional light shader."},
    {cat: "basic", name: "Spot Light", href: "examples/spotLight/index.html",
        info: "Demonstrates the spot light shader."},
    {cat: "basic", name: "CSS Transforms", href: "examples/cssTransform/css-transform.html",
        info: "Demonstrates the spot light shader."},
    {cat: "basic", name: "Video Texture", href: "examples/video/video.html",
        info: "Demonstrates video textures."},
    {cat: "basic", name: "Webcam Integration", href: "examples/webcam/webcam.html",
        info: "Demonstrates webcam as a source of a video texture."},
    {cat: "basic", name: "Canvas Resizing", href: "examples/canvasresizing/resizing.html",
        info: "Demonstrates dynamic canvas resizing through an attached jQuery UI widget."},
    {cat: "basic", name: "Line Strips Simple", href: "examples/lines/simple.html",
        info: "Demonstrates a simple line strip."},
    {cat: "basic", name: "Line Strips Large", href: "examples/lines/edf-vtk.html",
        info: "Demonstrates a larger line strip."},
    {cat: "basic", name: "Script Value", href: "examples/scriptValue/scriptValue.html",
        info: "Demonstrates efficient data update with TypedArrays and setScriptValue."},
    {cat: "basic", name: "XML3D Architecture Poster", href: "examples/poster/index.html",
        info: "Scene that uses a whole range of features of the XML3D architecture."},

    {cat: "external", name: "XML3D JSON Format", href: "examples/suzanne/suzanne.html",
        info: "Demonstrates the usage of external mesh data with XML3D JSON format."},
    {cat: "external", name: "MeshLab Format", href: "examples/meshlab/meshlab.html",
        info: "Demonstrates extending supported formats, here using MeshLab's JSON format"},
    {cat: "external", name: "OpenCTM Format", href: "examples/openctm/openctm.html",
        info: "Demonstrates extending supported formats, here using OpenCTM binary format"},
    {cat: "external", name: "XML Format", href: "examples/externalXml/externalXml.html",
        info: "Demonstrates the usage of external mesh data and shaders with XML files."},

    {cat: "shader", name: "Candle Emissive Map", href: "examples/candle/candle.html",
        info: "Demonstrates the usage of emmisive maps for the shading of a flame."},
    {cat: "shader", name: "Custom Shader: Eyelight", href: "examples/eyelight/eyelight.html",
        info: "Demonstrates the usage of custom shaders to implement an eyelight shader."},
    {cat: "shader", name: "Shader Overrides", href: "examples/shaderOverrides/index.html",
        info: "Demonstrates overriding of shader attributes in the mesh."},
    {cat: "shader", name: "shade.js: Animated shader", href: "examples/shade-tv/index.html",
        info: "Animated shader with shade.js."},

	{cat: "xflow", name: "Sequential Morphing", href: "examples/xflowSequentialMorph/xflow-morph.html",
        info: "Demonstrates mesh morphing with Xflow"},
    {cat: "xflow", name: "Facemorphing", href: "examples/facemorph/facemorph.html",
        info: "Demonstrates how to declare and use custom Xflow scripts to generate mesh data."},
    {cat: "xflow", name: "Wave Animation", href: "examples/xflowWave/xflow-wave.html",
        info: "Demonstrates how to declare and use custom Xflow scripts to create a wave animation"},

    {cat: "xflow", name: "Xflow Dataflows", href: "examples/xflowDataflow/xflow-dataflow.html",
        info: "Demonstrates Xflow Dataflows to reuse processing graphs."},
    {cat: "xflow", name: "Xflow Skinning", href: "examples/xflowSkin/xflow-skin.html",
        info: "Demonstrates Xflow Skinning."},
     {cat: "xflow", name: "Xflow Gangnam Style", href: "examples/gangnam/style.html",
        info: "Another Xflow Skinning Demonstration - Gangnam Style!"},

    {cat: "ar", name: "Simple AR", href: "examples/xflowAR/ar_simple_no_flip.html",
        info: "A simple augmented reality application with a teapot. Implemented with Xflow."},
    {cat: "ar", name: "Flying Teapot", href: "examples/xflowAR/ar_flying_teapot.html",
        info: "Augmented reality application with a teapot jumping between two markers."},

    {cat: "ip", name: "Pixel-Wise", href: "examples/xflowIP/pixel-wise.html",
        info: "Basic, pixel-wise image processing operators"},
    {cat: "ip", name: "Blending", href: "examples/xflowIP/blending.html",
        info: "Basic blending image processing operators"},
    {cat: "ip", name: "Spatial Filtering", href: "examples/xflowIP/spatial-filtering.html",
        info: "Spatial filtering image processing operators"},
    {cat: "ip", name: "Morphology", href: "examples/xflowIP/morphology.html",
        info: "Morphology image processing operators"},
    {cat: "ip", name: "Histogramm", href: "examples/xflowIP/histogramm.html",
        info: "Histogramm image processing operators"},
    {cat: "ip", name: "Fourier Transforms", href: "examples/xflowIP/fourier.html",
        info: "Image processing operators in Fourier space."}
]

var CURRENT = null;
var CURRENT_CAT = null;

function initPage(){

    var url = window.location.href;
    for(var i in EXAMPLE_LIST){
        if(url.indexOf(EXAMPLE_LIST[i].href) != -1){
            CURRENT = EXAMPLE_LIST[i];
        }
    }
    if(CURRENT)
        CURRENT_CAT = CATEGORY_LIST[CURRENT.cat] || CATEGORY_LIST.unknown;

    window.LINK_PREFIX = "";
    if(CURRENT){
        var idx = 0
        while( (idx = CURRENT.href.indexOf("/", idx)) != -1){
            idx++; window.LINK_PREFIX += "../";
        }
    }
    var statsScript = $('<script type="text/javascript" src="../../script/stats.js">');
    $("head").append(statsScript);

    var overall = $("#overall");
    var inner = $('<div id="inner" class="inner-wrap">');
    overall.append(inner);

    var navbar = $('<nav id="nav-bar" class="tab-bar">');
    var navbarCenter = $('<section id="navbar-middle" class="middle tab-bar-section"><h1>' + (CURRENT ? CURRENT.name : "XML3D Examples") + '</h1></section>');
    navbar.append(navbarCenter);

    var right = $('<section id="navbar-right" class="right"></section>');
    navbar.append(right);

    if (window.Stats) {
        var stats = new Stats();
        stats.setMode(0); // 0: fps, 1: ms
        //this.$el.hide();
        right.append(stats.domElement);
        var loop = function () {
            stats.update();
            requestAnimationFrame(loop);
        }
        loop();
    }

    inner.append(navbar);



    var breadcrumb = $('<ul class="breadcrumbs right">');
    breadcrumb.append($('<li><a href="../../index.html">XML3D Examples</a>'));
    inner.append(breadcrumb);

    var content = $("#content");
    content.addClass("main-section");
    inner.append(content);

    if(window.PAGE_INDEX) {
        $(document.body).css("overflow", "auto");
        buildIndex();
    } else {
        overall.addClass("off-canvas-wrap");
        overall.attr("data-offcanvas", "");
        $(document.body).css("overflow", "hidden");
        buildNavigation();
        if(CURRENT_CAT)
            breadcrumb.append($('<li><a href="../../index.html">' + CURRENT_CAT.name + '</a>'));
        if(CURRENT)
            breadcrumb.append($('<li class="current"><a href=/' + CURRENT.href + '>' + CURRENT.name + '</a>'));

    }

    document.title = "XML3D: " + (CURRENT ? CURRENT.name : "Index");

    //stats();
    //buildSocialLinks();
    //addGitHubRibbon();
    $(document).foundation();
    var minWidthQuery = window.matchMedia( "(min-width: 1024px)" );
    minWidthQuery.addListener(handleScreenSize);
    handleScreenSize(minWidthQuery);
}

function handleScreenSize(minScreenSizeQuery) {
    if (window.PAGE_INDEX)
        return;

    if (minScreenSizeQuery.matches) {
        $("#overall").addClass("offcanvas-overlap");
        $("#nav-bar > .left-small").remove();
        $("#inner > .exit-off-canvas").remove();
    } else {
        $("#overall").removeClass("offcanvas-overlap");
        // add offscreen toggle button on small screens
        $("#nav-bar").append($('<section class="left-small"><a class="left-off-canvas-toggle menu-icon" href="#"><span></span></a></section>'));
        $("#inner").append($('<a class="exit-off-canvas"></a>'));
    }
}

function buildIndex() {
    var content = $("#content");
    var container = $('<div id="start" ></div>');
    var list = buildTestList();
    list.removeClass("off-canvas-list");
    container.append(list);
    content.append(container);
}

function buildNavigation() {

    var navi = $('<aside class="left-off-canvas-menu">');
    var naviList = buildTestList();
    navi.append(naviList);

    naviList.prepend($('<li><label>Examples</label></li><li><a href="' + LINK_PREFIX + 'index.html">Index</a></li>'));

    $("#inner").append(navi);
}

function buildTestList() {
    var naviList = $('<ul class="off-canvas-list" ></ul>');

    for(var i in CATEGORY_LIST)
        CATEGORY_LIST[i].examples = [];

    for(var i in EXAMPLE_LIST){
        (CATEGORY_LIST[EXAMPLE_LIST[i].cat] || CATEGORY_LIST.unknown).examples.push(EXAMPLE_LIST[i]);
    }

    for(var catId in CATEGORY_LIST){
        var cat = CATEGORY_LIST[catId];
        if(cat.examples.length == 0)
            continue;
        var header = $('<li><label>' + cat.name + '</label></li>');
        naviList.append(header);
        for(var i in cat.examples){
            var entry = cat.examples[i];
            naviList.append($('<li><a href="' + LINK_PREFIX + entry.href + '">' + entry.name + '</a><span class="info">' + ( entry.info || "" ) + '</span></li>'));
        }
    }

    return naviList;
}

function buildSocialLinks(){
    if(navigator.onLine){
        var url = encodeURIComponent(document.URL);
        var socialButtons = $('<div class="socialButtons" ></div>');
        $("#content").append(socialButtons);

        var twitter = '<a href="https://twitter.com/share" class="twitter-share-button" data-hashtags="xml3d">Tweet</a>' +
            '<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>';
        socialButtons.append($(twitter));

        var facebook = '<iframe src="//www.facebook.com/plugins/like.php?href=' + url + '&amp;send=false&amp;layout=standard&amp;width=450&amp;show_faces=false&amp;font&amp;colorscheme=light&amp;action=like&amp;height=35" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:450px; height:35px;" allowTransparency="true"></iframe>';
        socialButtons.append($(facebook));
    }
}

function addGitHubRibbon() {
    if(navigator.onLine){
        var code = '<a href="https://github.com/xml3d/xml3d-examples/"><img class="ribbon" src="https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png" alt="Fork me on GitHub"/></a>'
        $('body').append(code);
    }
}

function shouldShowStats() {
    var params = [],
        p = window.location.search.substr(1).split('&');
    p.forEach(function(e, i, a) {
        var keyVal = e.split('=');
        params[keyVal[0].toLowerCase()] = decodeURIComponent(keyVal[1]);
    });
    return params.hasOwnProperty("stats");
}

function stats() {
    if(window.agility && shouldShowStats()) {
       var xml3d = document.querySelector("xml3d");
        var message = $$({
            model: {
                objects: 0,
                primitives: 0
            },
            view: {
                format: '<ul><li><span>Objects: </span><span data-bind="objects"></span></li><li><span>Primitives: </span><span data-bind="primitives"></span></li></ul>'
            },
            controller: {}
        });
        $$.document.prepend(message, "#content");
       xml3d && xml3d.addEventListener("framedrawn", function(e) {
           message.model.set(e.detail.count);
       })
    }

}



$(function(){
    initPage();
});
