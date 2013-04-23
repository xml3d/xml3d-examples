
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
    {cat: "basic", name: "Directional Light", href: "examples/directionalLight/index.xhtml",
        info: "Demonstrates the directional light shader."},
    {cat: "basic", name: "Spot Light", href: "examples/spotLight/index.xhtml",
        info: "Demonstrates the spot light shader."},
    {cat: "basic", name: "CSS Transforms", href: "examples/cssTransform/css-transform.xhtml",
        info: "Demonstrates the spot light shader."},
    {cat: "basic", name: "Video Texture", href: "examples/video/video.xhtml",
        info: "Demonstrates video textures."},
    {cat: "basic", name: "Webcam Integration", href: "examples/webcam/webcam.xhtml",
        info: "Demonstrates webcam as a source of a video texture."},
    {cat: "basic", name: "Canvas Resizing", href: "examples/canvasresizing/resizing.xhtml",
        info: "Demonstrates dynamic canvas resizing through an attached jQuery UI widget."},

    {cat: "external", name: "XML3D JSON Format", href: "examples/suzanne/suzanne.xhtml",
        info: "Demonstrates the usage of external mesh data with XML3D JSON format."},
    {cat: "external", name: "MeshLab Format", href: "examples/meshlab/meshlab.xhtml",
        info: "Demonstrates extending supported formats, here using MeshLab's JSON format"},
    {cat: "external", name: "OpenCTM Format", href: "examples/openctm/openctm.xhtml",
        info: "Demonstrates extending supported formats, here using OpenCTM binary format"},
    {cat: "external", name: "XML Format", href: "examples/externalXml/externalXml.xhtml",
        info: "Demonstrates the usage of external mesh data and shaders with XML files."},

    {cat: "shader", name: "Candle Emissive Map", href: "examples/candle/candle.xhtml",
        info: "Demonstrates the usage of emmisive maps for the shading of a flame."},
    {cat: "shader", name: "Custom Shader: Eyelight", href: "examples/eyelight/eyelight.xhtml",
        info: "Demonstrates the usage of custom shaders to implement an eyelight shader."},
    {cat: "xflow", name: "Sequential Morphing", href: "examples/xflowSequentialMorph/xflow-morph.xhtml",
        info: "Demonstrates mesh morphing with Xflow"},
    {cat: "xflow", name: "Facemorphing", href: "examples/facemorph/facemorph.xhtml",
        info: "Demonstrates how to declare and use custom Xflow scripts to generate mesh data."},
    {cat: "xflow", name: "Wave Animation", href: "examples/xflowWave/xflow-wave.xhtml",
        info: "Demonstrates how to declare and use custom Xflow scripts to create a wave animation"},

    {cat: "xflow", name: "Xflow Prototypes", href: "examples/xflowPrototypes/xflow-prototypes.xhtml",
        info: "Demonstrates Xflow Prototypes."},
    {cat: "xflow", name: "Xflow Skinning", href: "examples/xflowSkin/xflow-skin.xhtml",
        info: "Demonstrates Xflow Skinning."},
     {cat: "xflow", name: "Xflow Gangnam Style", href: "examples/gangnam/style.xhtml",
        info: "Another Xflow Skinning Demonstration - Gangnam Style!"},
     /*{cat: "xflow", name: "Xflow Keyframe Animation", href: "examples/xflowTransforms/xflow-transforms.xhtml",
        info: "Demonstrates Xflow to animate transformations."},*/

    {cat: "ar", name: "Simple AR", href: "examples/xflowAR/ar_simple_no_flip.xhtml",
        info: "A simple augmented reality application with a teapot. Implemented with Xflow."},
    {cat: "ar", name: "Flying Teapot", href: "examples/xflowAR/ar_flying_teapot.xhtml",
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

    if(window.PAGE_INDEX){
        buildIndex();
    }


    buildNavigation();

    var header = $('<div id="header" ><h1><a href="'+ LINK_PREFIX + 'index.xhtml" >XML3D Examples</a></h1><h2></h2><h3></h3></div>')
    $(document.body).prepend(header);
    var footer = $('<div id="footer" ></div>')
    $(document.body).append(footer);

    if(CURRENT_CAT)
        header.find("h2").text( CURRENT_CAT.name);
    else
        header.find("h2").hide();
    if(CURRENT)
        header.find("h3").text( CURRENT.name);
    else
        header.find("h3").hide();

    document.title = "XML3D: " + (CURRENT ? CURRENT.name : "Index");

    //buildSocialLinks();
    //addGitHubRibbon();
}

function buildIndex(){
    var content = $("#content");
    var container = $('<div id="start" ></div>');
    var list = buildTestList();
    container.append(list);
    content.append(container);
}

function buildNavigation(){
    var navi = $('<div id="navigation" ></div>');
    navi.append($("<h4>Navigation</h4>"));

    function adjustNavi(){
        navi.height($(document.body).hasClass("navi_hidden") ? 43 : $(window).height() - 8);
    }

    navi.find("h4").click(function(){
        $(document.body).toggleClass("navi_hidden");
        adjustNavi();
    });
    $(window).bind('resize', adjustNavi);
    adjustNavi();

    var inner = $('<div class="inner"></div>');
    navi.append(inner);
    var naviList = buildTestList();
    inner.append(naviList);

    naviList.prepend($('<li><a href="' + LINK_PREFIX + 'index.xhtml">Index</a></li>'));

    $(document.body).prepend(navi);
}

function buildTestList(){
    var naviList = $('<ul class="main" ></ul>');

    for(var i in CATEGORY_LIST)
        CATEGORY_LIST[i].examples = [];

    for(var i in EXAMPLE_LIST){
        (CATEGORY_LIST[EXAMPLE_LIST[i].cat] || CATEGORY_LIST.unknown).examples.push(EXAMPLE_LIST[i]);
    }

    for(var catId in CATEGORY_LIST){
        var cat = CATEGORY_LIST[catId];
        if(cat.examples.length == 0)
            continue;
        var header = $('<li><h5>' + cat.name + '</h5></li>');
        var list = $('<ul class="sub" ></ul>');
        for(var i in cat.examples){
            var entry = cat.examples[i];
            list.append($('<li><a href="' + LINK_PREFIX + entry.href + '">' + entry.name + '</a><span class="info">' +
                ( entry.info || "" ) + '</span></li>'))

        }
        header.append(list);
        naviList.append(header);
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



$(function(){
    initPage();
});
