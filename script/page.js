
var CATEGORY_LIST = {
    unknown : { name : "???" },
    basic: { name: "Basics" },
    external : { name: "External References" },
    shader : { name: "Shaders" },
    xflow : { name: "Xflow" }


}

var EXAMPLE_LIST = [
    {cat: "basic", name: "Directional Light", href: "examples/directionalLight/index.xhtml",
        info: "Demonstrates the directional light shader."},
    {cat: "basic", name: "Spot Light", href: "examples/spotLight/index.xhtml",
        info: "Demonstrates the spot light shader."},
    {cat: "basic", name: "CSS Transforms", href: "examples/cssTransform/css-transform.xhtml",
        info: "Demonstrates the spot light shader."},

    {cat: "external", name: "XML3D JSON Format", href: "examples/suzanne/suzanne.xhtml",
        info: "Demonstrates the usage of external mesh data with XML3D JSON format."},
    {cat: "external", name: "MeshLab Format", href: "examples/meshlab/meshlab.xhtml",
        info: "Demonstrates extending supported formats, here using MeshLab's JSON format"},
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
        info: "Demonstrates how to declare and use custom Xflow scripts to create a wave animation"}

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





$(function(){
    initPage();
});
