
var CATEGORY_LIST = {
    unknown : { name : "???" },
    base : { name: "Basic Functionality" },
    shader : { name: "Shaders" }

}

var EXAMPLE_LIST = [
    {cat: "base", name: "Simple Mesh", href: "simple-mesh.xhtml", info: "Very basic test showing a simple rectangular mesh"},
    {cat: "base", name: "Simple Mesh2", href: "simple-mesh.xhtml", info: "Very basic test showing a simple rectangular mesh"},
    {cat: "base", name: "Simple Mesh3", href: "simple-mesh.xhtml", info: "Very basic test showing a simple rectangular mesh"},
    {cat: "shader", name: "Flat Shader", href: "simple-mesh.xhtml", info: "Very basic test showing a simple rectangular mesh"},
    {cat: "shader", name: "Phong Shader", href: "simple-mesh.xhtml", info: "Very basic test showing a simple rectangular mesh"}
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

    if(window.PAGE_INDEX)
        buildIndex();

    buildNavigation();

    var header = $('<div id="header" ><h1><a href="index.xhtml" >XML3D Examples</a></h1><h2></h2><h3></h3></div>')
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
        navi.height(navi.hasClass("hidden") ? 43 : $(window).height() - 8);
    }

    navi.find("h4").click(function(){
        navi.toggleClass("hidden");
        adjustNavi();
    });
    $(window).bind('resize', adjustNavi);
    adjustNavi();

    var inner = $('<div class="inner"></div>');
    navi.append(inner);
    var naviList = buildTestList();
    inner.append(naviList);

    naviList.prepend($('<li><a href="index.xhtml">Index</a></li>'))

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
            list.append($('<li><a href="' + entry.href + '">' + entry.name + '</a><span class="info">' +
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