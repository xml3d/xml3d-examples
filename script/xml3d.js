/**
Copyright (c) 2010-2012
              DFKI - German Research Center for Artificial Intelligence
              www.dfki.de

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
 so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

@version: DEVELOPMENT SNAPSHOT (09.08.2013 09:38:48 MESZ)
**/
/** @namespace * */
var XML3D = XML3D || {};

/** @define {string} */
XML3D.version = 'DEVELOPMENT SNAPSHOT (09.08.2013 09:38:48 MESZ)';
/** @const */
XML3D.xml3dNS = 'http://www.xml3d.org/2009/xml3d';
/** @const */
XML3D.xhtmlNS = 'http://www.w3.org/1999/xhtml';
/** @const */
XML3D.webglNS = 'http://www.xml3d.org/2009/xml3d/webgl';
XML3D._xml3d = document.createElementNS(XML3D.xml3dNS, "xml3d");
XML3D._native = !!XML3D._xml3d.style;
XML3D._parallel = XML3D._parallel != undefined ? XML3D._parallel : false;

XML3D.createElement = function(tagName) {
    return document.createElementNS(XML3D.xml3dNS, tagName);
};

XML3D.extend = function(a, b) {
    for ( var prop in b) {
        var g = b.__lookupGetter__(prop), s = b.__lookupSetter__(prop);
        if (g||s) {
            if (g) {
                a.__defineGetter__(prop, g);
            }
            if (s) {
                a.__defineSetter__(prop, s);
            }
        } else {
            if (b[prop] === undefined) {
                delete a[prop];
            } else if (prop !== "constructor" || a !== window) {
                a[prop] = b[prop];
            }
        }
    }
    return a;
};

/**
 * Returns true if ctor is a superclass of subclassCtor.
 * @param ctor
 * @param subclassCtor
 * @return {Boolean}
 */
XML3D.isSuperclassOf = function(ctor, subclassCtor) {
    while (subclassCtor && subclassCtor.superclass) {
        if (subclassCtor.superclass === ctor.prototype)
            return true;
        subclassCtor = subclassCtor.superclass.constructor;
    }
    return false;
}

/**
 *
 * @param {Object} ctor Constructor
 * @param {Object} parent Parent class
 * @param {Object=} methods Methods to add to the class
 * @return {Object!}
 */
XML3D.createClass = function(ctor, parent, methods) {
    methods = methods || {};
    if (parent) {
        /** @constructor */
        var F = function() {
        };
        F.prototype = parent.prototype;
        ctor.prototype = new F();
        ctor.prototype.constructor = ctor;
        ctor.superclass = parent.prototype;
    }
    ctor.isSuperclassOf = XML3D.isSuperclassOf.bind(ctor, ctor);
    for ( var m in methods) {
        ctor.prototype[m] = methods[m];
    }
    return ctor;
};

(function() {
    function displayWebGLNotSupportedInfo(xml3dElement) {

        // Place xml3dElement inside an invisible div
        var hideDiv = document.createElementNS(XML3D.xhtmlNS, 'div');

        xml3dElement.parentNode.insertBefore(hideDiv, xml3dElement);
        hideDiv.appendChild(xml3dElement);
        hideDiv.style.display = "none";

        var infoDiv = document.createElementNS(XML3D.xhtmlNS, 'div');
        infoDiv.setAttribute("class", xml3dElement.getAttribute("class"));
        infoDiv.setAttribute("style", xml3dElement.getAttribute("style"));
        infoDiv.style.border = "2px solid red";
        infoDiv.style.color = "red";
        infoDiv.style.padding = "10px";
        infoDiv.style.backgroundColor = "rgba(255, 0, 0, 0.3)";

        var width = xml3dElement.getAttribute("width");
        if (width !== null) {
            infoDiv.style.width = width;
        }

        var height = xml3dElement.getAttribute("height");
        if (height !== null) {
            infoDiv.style.height = height;
        }

        var hElement = document.createElement("h3");
        var hTxt = document.createTextNode("Your browser doesn't appear to support XML3D.");
        hElement.appendChild(hTxt);

        var pElement = document.createElement("p");
        pElement.appendChild(document.createTextNode("Please visit "));
        var link = document.createElement("a");
        link.setAttribute("href", "http://www.xml3d.org");
        link.appendChild(document.createTextNode("http://www.xml3d.org"));
        pElement.appendChild(link);
        pElement.appendChild(document.createTextNode(" to get information about browsers supporting XML3D."));
        infoDiv.appendChild(hElement);
        infoDiv.appendChild(pElement);

        hideDiv.parentNode.insertBefore(infoDiv, hideDiv);
    };

    /*  a list of elements that are currently initialized. More specifically,
     *  they're currently in a call to the method below.
     *
     *  Why?
     *  In webgl we actually reattach the xml3d element in the DOM. Thus, when
     *  we're in the middle of working on a onNodeInserted event, there will probably
     *  come right another event which we actually don't care for.
     *  So we use this list to keep track of which elements are currently initializing.
     */
    var curXML3DInitElements = [];

    /**
     * @param {Element} xml3dElement
     */
    function initXML3DElement(xml3dElement) {

        if (XML3D._native)
            return;

        if(-1 < curXML3DInitElements.indexOf(xml3dElement))
            return;

        curXML3DInitElements.push(xml3dElement);

        var debug = XML3D.debug.setup();

        if (!(XML3D.webgl && XML3D.webgl.supported())) {
            debug && XML3D.debug.logWarning("Could not initialise WebGL, sorry :-(");
            displayWebGLNotSupportedInfo(xml3dElement);
            curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
            return;
        }

        try {
            XML3D.config.configure(xml3dElement);
        } catch (e) {
            debug && XML3D.debug.logException(e);
            curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
            return;
        }
        try {
            XML3D.webgl.configure(xml3dElement);
        } catch (e) {
            debug && XML3D.debug.logException(e);
            curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
            return;
        }

        // initialize all attached adapters
        XML3D.base.sendAdapterEvent(xml3dElement, {onConfigured : []});

        curXML3DInitElements.splice(curXML3DInitElements.indexOf(xml3dElement), 1);
    };

    /**
     * @param {Element} xml3dElement
     */
    function destroyXML3DElement(xml3dElement)
    {
        if(-1 < curXML3DInitElements.indexOf(xml3dElement))
            return;

        xml3dElement._configured = undefined;

        if(!xml3dElement.parentNode)
            return; // already removed

        var canvas = xml3dElement.parentNode.previousElementSibling;

        var grandParentNode = xml3dElement.parentNode.parentNode;
        if(!grandParentNode)
            return; // subtree containing canvas is not attached, can't remove it

        if(!canvas || canvas.tagName !== "canvas")
            return; // an element we didn't create, skip deletion

        grandParentNode.removeChild(xml3dElement.parentNode);
        grandParentNode.removeChild(canvas);
    };

    /**
     * @param {Event} evt
     */
    function onNodeInserted(evt) {

        if(evt.target.tagName === "xml3d") {
            initXML3DElement(evt.target);
        }
    };

    /**
     * @param {Event} evt
     */
    function onNodeRemoved(evt) {

        if(evt.target.tagName === "xml3d") {
            destroyXML3DElement(evt.target);
        }
    };

    function onLoad() {

        XML3D.css.init();

        var debug = XML3D.debug.setup();
        debug && XML3D.debug.logInfo("xml3d.js version: " + XML3D.version);

        /**
         * Find all the XML3D tags in the document
         * @type {NodeList}
         */
        var xml3ds = document.querySelectorAll("xml3d");

        debug && XML3D.debug.logInfo("Found " + xml3ds.length + " xml3d nodes...");

        if (xml3ds.length && XML3D._native) {
            debug && XML3D.debug.logInfo("Using native implementation.");
            return;
        }

        XML3D.xhtml = (document.xmlEncoding != null);

        for(var i = 0; i < xml3ds.length; i++) {
            initXML3DElement(xml3ds[i]);
        }
    };

    function onUnload() {
        if (XML3D.document)
            XML3D.document.onunload();
    };

    window.addEventListener('DOMContentLoaded', onLoad, false);
    window.addEventListener('unload', onUnload, false);
    window.addEventListener('reload', onUnload, false);
    document.addEventListener('DOMNodeInserted', onNodeInserted, false);
    document.addEventListener('DOMNodeRemoved', onNodeRemoved, false);

})();
// utils/misc.js

XML3D.setParameter = function(elementId, fieldName, value) {
    var e = document.getElementById(elementId);
    if (e) {
        var fields = e.childNodes;
        for (var i = 0; i < fields.length; i++) {
              var field = fields[i];
              if (field.nodeType === Node.ELEMENT_NODE && (field.name == fieldName)) {
                  if (typeof value === 'string')
                      {
                          while ( field.hasChildNodes() ) field.removeChild( field.lastChild );
                          field.appendChild(document.createTextNode(value));
                          return true;
                      }
              }
            }
    }
    return false;
};

window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(f, fps){
              window.setTimeout(f, 1000 / fps);
            };
  })();

(function() {

    if(!XML3D.util)
        XML3D.util = {};

    var u = XML3D.util;

    /**
     * Dispatch HTML event
     *
     * @param {Object} target    element or document
     * @param {string} eventType standard event type e.g. load, click
     */
    u.dispatchEvent = function(target, eventType) {
        var evt = null;
        if (document.createEvent) {
            evt = document.createEvent("Events");
            evt.initEvent(eventType, true, true);
            target.dispatchEvent(evt);
        } else if (document.createEventObject) {
            evt = document.createEventObject();
            target.fireEvent('on' + eventType, evt);
        }
    };

    /**
     *
     * Dispatch custom HTML event
     *
     * @param {Object} target element or document.
     * @param {string} eventType custom event type.
     * @param {boolean} canBubble Whether the event propagates upward. Sets the value for the bubbles property.
     * @param {boolean} cancelable Whether the event is cancelable and so preventDefault can be called. Sets the value
     *                  for the cancelable property.
     * @param {Object} detail A user-defined object that can contain additional information about the event.
     *                        This parameter can be of any type, or null. This value is returned in the detail property of the event.
     */
    u.dispatchCustomEvent = function(target, eventType, canBubble, cancelable, detail) {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventType, canBubble, cancelable, detail);
        target.dispatchEvent(event);
    };

    u.getStyle = function(oElm, strCssRule) {
        var strValue = "";
        if (document.defaultView && document.defaultView.getComputedStyle) {
            strValue = document.defaultView.getComputedStyle(oElm, "")
                    .getPropertyValue(strCssRule);
        } else if (oElm.currentStyle) {
            strCssRule = strCssRule.replace(/\-(\w)/g, function(strMatch, p1) {
                return p1.toUpperCase();
            });
            strValue = oElm.currentStyle[strCssRule];
        }

        return strValue;
    };

    /** Evaluates the given XPath expression in the given xml3d element on
     *  xml3d elements and returns the result.
     *
     * @param {!Object} xml3d the xml3d element on which to evaluate the expression
     * @param {!Object} xpathExpr the XPath expression to be evaluated
     *
     * @return {XPathResult} the result of the evaluation
     */
    u.evaluateXPathExpr = function(xml3d, xpathExpr)
    {
        return document.evaluate(
            xpathExpr, xml3d,
            function() {return XML3D.xml3dNS;},
            XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    };

    var __autoCreatedViewId = 0;
    /**
     * Returns the active view element corresponding to the given xml3d element.
     *
     * @param {!Object} xml3d
     * @return {Object} the active view element
     */
    u.getOrCreateActiveView = function(xml3d)
    {
        // try to resolve reference
        var ref = xml3d.activeView;
        if(ref)
        {
            var v = XML3D.URIResolver.resolveLocal(ref);
            if(!v)
                throw "XML3D Error: xml3d references view that is not defined: '" + ref + "'.";

            return v;
        }

        // didn't succeed, so now try to just take the first view
        var firstView;
        if(XML3D.xhtml){
            firstView = XML3D.util.evaluateXPathExpr(
                xml3d, './/xml3d:view[1]').singleNodeValue;
        }
        else{
            firstView = xml3d.getElementsByTagName("view")[0];
        }


        if(firstView)
        {
            // if it has an id, set it as active
            if(firstView.id && firstView.id.length > 0)
                xml3d.activeView = "#" + firstView.id;

            return firstView;
        }

        // didn't find any: create new one
        XML3D.debug.logWarning("xml3d element has no view defined: creating one.");

        var vid = "xml3d.autocreatedview_" + __autoCreatedViewId++;
        var v = XML3D.createElement("view");
        v.setAttribute("id", vid);

        xml3d.appendChild(v);
        xml3d.setAttribute("activeView", "#" + vid);

        return v;
    };
}());
// Add convienent array methods if non-existant
if (!Array.forEach) {
    Array.forEach = function(array, fun, thisp) {
        var len = array.length;
        for ( var i = 0; i < len; i++) {
            if (i in array) {
                fun.call(thisp, array[i], i, array);
            }
        }
    };
}
if (!Array.map) {
    Array.map = function(array, fun, thisp) {
        var len = array.length;
        var res = [];
        for ( var i = 0; i < len; i++) {
            if (i in array) {
                res[i] = fun.call(thisp, array[i], i, array);
            }
        }
        return res;
    };
}
if (!Array.filter) {
    Array.filter = function(array, fun, thisp) {
        var len = array.length;
        var res = [];
        for ( var i = 0; i < len; i++) {
            if (i in array) {
                var val = array[i];
                if (fun.call(thisp, val, i, array)) {
                    res.push(val);
                }
            }
        }
        return res;
    };
}

if (!Array.erase) {
    Array.erase = function(array, object) {
        var erased = false;
        var idx = -1;
        while( (idx = array.indexOf(object) ) != -1){
            array.splice(idx, 1);
            erased = true;
        }
        return erased;
    };
}

if (!Array.set) {
    Array.set = function(array, offset, value) {
        for (var i=0; i < value.length; i++)
            array[offset+i] = value[i];
    };
}

if (!Array.isArray) {
    Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) == '[object Array]';
    };
}
XML3D.debug = {
    ALL : 0,
    DEBUG: 1,
    INFO : 2,
    WARNING : 3,
    ERROR : 4,
    EXCEPTION : 5,
    params : {},
    isSetup : false,
    loglevel : 4,
    loglevels : {
        all : 0,
        debug : 1,
        info : 2,
        warning : 3,
        error : 4,
        exception : 5
    },

    setup : function() {
        var debug = XML3D.debug;
        if (!debug.isSetup) {
            var p = window.location.search.substr(1).split('&');
            p.forEach(function(e, i, a) {
              var keyVal = e.split('=');
              debug.params[keyVal[0].toLowerCase()] = decodeURIComponent(keyVal[1]);
            });
            debug.loglevel = debug.loglevels[debug.params.xml3d_loglevel] ||
                             debug.params.xml3d_loglevel ||
                             debug.loglevels.error;

            XML3D.debug.isSetup = true;
        }
        return !XML3D.debug.params.xml3d_nolog;
    },
    doLog : function(logType, args) {
        var params = XML3D.debug.params;
        if (params.xml3d_nolog || logType < XML3D.debug.loglevel) {
            return;
        }
        args = Array.prototype.slice.call(args);
        if (window.console) {
            switch (logType) {
            case XML3D.debug.INFO:
                window.console.info.apply(window.console, args);
                break;
            case XML3D.debug.WARNING:
                window.console.warn.apply(window.console, args);
                break;
            case XML3D.debug.ERROR:
                window.console.error.apply(window.console, args);
                break;
            case XML3D.debug.EXCEPTION:
                window.console.error(XML3D.debug.printStackTrace({e: args[0], guess: true}).join('\n'));
                break;
            case XML3D.debug.DEBUG:
                window.console.debug.apply(window.console, args);
                break;
            default:
                break;
            }
        }
    },
    logDebug : function() {
        XML3D.debug.doLog(XML3D.debug.DEBUG, arguments);
    },
    logInfo : function() {
        XML3D.debug.doLog(XML3D.debug.INFO, arguments);
    },
    logWarning : function() {
        XML3D.debug.doLog(XML3D.debug.WARNING, arguments);
    },
    logError : function() {
        XML3D.debug.doLog(XML3D.debug.ERROR, arguments);
    },
    logException : function() {
        XML3D.debug.doLog(XML3D.debug.EXCEPTION, arguments);
    },
    assert : function(c, msg) {
        if (!c) {
            XML3D.debug.doLog(XML3D.debug.WARNING, ["Assertion failed in "
                    + XML3D.debug.assert.caller.name, msg ]);
        }
    },
    trace  : function(msg, logType) {
        logType = logType !== undefined ? logType : XML3D.debug.ERROR;
        if(window.console.trace) {
            if (msg) {
                XML3D.debug.doLog(logType, [msg]);
            }
            window.console.trace();
        } else {
            var stack = XML3D.debug.printStackTrace();
            msg && stack.splice(0,0,msg);
            XML3D.debug.doLog(logType, stack);
        }
    }
};
/**
 * Class URI
 * @constructor
 * @param {string} str The URI as string
 */
XML3D.URI = function(str) {
    str = str || "";
    if (str.indexOf("blob:") == 0) {
        // Based on http://www.w3.org/TR/FileAPI/#url
        var parser = /^(?:([^:\/?\#]+):)?([^\#]*)(?:\#(.*))?/;
        var result = str.match(parser);
        /**  @type {boolean} */
        this.valid = result != null;
        /**  @type {?string} */
        this.scheme = result[1] || null;
        /**  @type {?string} */
        this.authority = null;
        /**  @type {?string} */
        this.path = null;
        /**  @type {?string} */
        this.query = null;
        /**  @type {?string} */
        this.opaqueString = result[2] || null;
        /**  @type {?string} */
        this.fragment = result[3] || null;
    } else {
        // Based on the regex in RFC2396 Appendix B.
        var parser = /^(?:([^:\/?\#]+):)?(?:\/\/([^\/?\#]*))?([^?\#]*)(?:\?([^\#]*))?(?:\#(.*))?/;
        var result = str.match(parser);
        /**  @type {boolean} */
        this.valid = result != null;
        /**  @type {?string} */
        this.scheme = result[1] || null;
        /**  @type {?string} */
        this.authority = result[2] || null;
        /**  @type {?string} */
        this.path = result[3] || null;
        /**  @type {?string} */
        this.query = result[4] || null;
        /**  @type {?string} */
        this.opaqueString = null;
        /**  @type {?string} */
        this.fragment = result[5] || null;
    }
};

/**
 * @return {boolean} true if URI is relative to current document
 */
XML3D.URI.prototype.isLocal = function(){
    return this.scheme != "blob" && !this.authority && !this.path;
}

/**
 * @return {boolean} true if URI is absolute
 */
XML3D.URI.prototype.isAbsolute = function(){
    return this.scheme != null;
}

/**
 * Get absolute URI relative to the provided document uri
 * @param {string} docUri uri of document from which this uri originates
 * @returns {XML3D.URI}
 */
XML3D.URI.prototype.getAbsoluteURI = function(docUri){
    if (!this.valid || this.isAbsolute()) {
        return this;
    }

    var docUriObj = new XML3D.URI(docUri);

    if(this.path){
        if(this.path.indexOf("/") == 0){
            docUriObj.path = this.path;
        }
        else {
            docUriObj.path = docUriObj.path.substr(0,docUriObj.path.lastIndexOf("/")+1) + this.path;
        }
        docUriObj.query = this.query;
    }
    else if(this.query){
        docUriObj.query = this.query;
    }
    docUriObj.fragment = this.fragment;

    return docUriObj;
}

// Restore the URI to it's stringy glory.
XML3D.URI.prototype.toString = function() {
    var str = "";
    if  (this.scheme == "blob") {
        str = "blob:" + this.opaqueString;
        if (this.fragment) {
            str += "#" + this.fragment;
        }
        return str;
    }
    if (this.scheme) {
        str += this.scheme + ":";
    }
    if (this.authority) {
        str += "//" + this.authority;
    }
    if (this.path) {
        str += this.path;
    }
    if (this.query) {
        str += "?" + this.query;
    }
    if (this.fragment) {
        str += "#" + this.fragment;
    }
    return str;
};

// Restore the URI to it's stringy glory minus the fragment
XML3D.URI.prototype.toStringWithoutFragment = function() {
    var str = "";
    if  (this.scheme == "blob") {
        str = "blob:" + this.opaqueString;
        return str;
    }
    if (this.scheme) {
        str += this.scheme + ":";
    }
    if (this.authority) {
        str += "//" + this.authority;
    }
    if (this.path) {
        str += this.path;
    }
    if (this.query) {
        str += "?" + this.query;
    }
    return str;
};

/**
 * Class URIResolver
 * @constructor
 */
XML3D.URIResolver = function() {
};

/**
 * Resolve a local URI to an element
 * @param {(string|XML3D.URI)} uri Element to resolve
 * @param {Document=} document Base document to use
 * @return {Element} The resolved element or null if it could not be resolved
 */
XML3D.URIResolver.resolveLocal = function(uri, document) {
    if (typeof uri == 'string')
        uri = new XML3D.URI(uri);
    document = document || window.document;

    if (uri.scheme == 'urn' || uri.scheme == "blob")
    {
        return null;
    }

    if (!uri.path && uri.fragment) { // local uri
        return document.getElementById(uri.fragment);
    }
    return null;
};



/**
 * @deprecated
 */
XML3D.URIResolver.resolve = function(uri, document) {
    XML3D.debug.logWarning("You are using deprecated XML3D.URIResolver.resolve. Use XML3D.URIResolver.resolveLocal instead.");
    return XML3D.URIResolver.resolveLocal(uri, document);
};
(function(){


XML3D.css = {};

XML3D.css.TRANSFORM_PROPERTY = null;

XML3D.css.init = function(){
    if('transform' in document.body.style)
        XML3D.css.TRANSFORM_PROPERTY = 'transform'
    else if('WebkitTransform' in document.body.style)
        XML3D.css.TRANSFORM_PROPERTY = '-webkit-transform'
    else if('MozTransform' in document.body.style)
        XML3D.css.TRANSFORM_PROPERTY = '-moz-transform'
    else
        XML3D.debug.logWarning("No supported transform css property found");

}

XML3D.css.getInlinePropertyValue = function(node, property)
{
    var styleValue = node.getAttribute('style');
    if(styleValue) {
        var pattern    = new RegExp( property + "\s*:([^;]+)", "i");
        var result = pattern.exec(styleValue);
        if(result)
            return result[1].trim();
    }
    return null;
}

XML3D.css.getPropertyValue = function(node, property)
{
    var value = this.getInlinePropertyValue(node, property);
    if(value)
        return value;

    var style = window.getComputedStyle(node);
    return style.getPropertyValue(property);
}

XML3D.css.getCSSMatrix = function(node){
    if(!XML3D.css.TRANSFORM_PROPERTY || !XML3D.css.CSSMatrix)
        return null;

    var style = null;

    if(XML3D.css.TRANSFORM_PROPERTY != "transform")
        style = XML3D.css.getInlinePropertyValue(node, "transform");

    if(!style)
        style = XML3D.css.getPropertyValue(node, XML3D.css.TRANSFORM_PROPERTY);

    if(!style || style == "none")
        return null;

    var result = null;
    try{
        result = new XML3D.css.CSSMatrix(style);
    }
    catch(e){
        XML3D.debug.logError("Error parsing transform property: " + style);
    }
    return result;

}




}());
/**
 *  class FirminCSSMatrix
 *
 *  The [[FirminCSSMatrix]] class is a concrete implementation of the
 *  `CSSMatrix` interface defined in the [CSS 2D Transforms][2d] and
 *  [CSS 3D Transforms][3d] Module specifications.
 *
 *  [2d]: http://www.w3.org/TR/css3-2d-transforms/
 *  [3d]: http://www.w3.org/TR/css3-3d-transforms/
 *
 *  The implementation was largely copied from the `WebKitCSSMatrix` class, and
 *  the supparting maths libraries in the [WebKit][webkit] project. This is one
 *  reason why much of the code looks more like C++ than JavaScript.
 *
 *  [webkit]: http://webkit.org/
 *
 *  Its API is a superset of that provided by `WebKitCSSMatrix`, largely
 *  because various pieces of supporting code have been added as instance
 *  methods rather than pollute the global namespace. Examples of these include
 *  [[FirminCSSMatrix#isAffine]], [[FirminCSSMatrix#isIdentityOrTranslation]]
 *  and [[FirminCSSMatrix#adjoint]].
 **/

/**
 *  new FirminCSSMatrix(domstr)
 *  - domstr (String): a string representation of a 2D or 3D transform matrix
 *    in the form given by the CSS transform property, i.e. just like the
 *    output from [[FirminCSSMatrix#toString]].
 *
 *  @constructor
 **/
var FirminCSSMatrix = function(domstr) {
    this.m11 = this.m22 = this.m33 = this.m44 = 1;

    this.m12 = this.m13 = this.m14 =
    this.m21 =            this.m23 = this.m24 =
    this.m31 = this.m32 =            this.m34 =
    this.m41 = this.m42 = this.m43            = 0;

    if (typeof domstr == "string") {
        this.setMatrixValue(domstr);
    }
};

/**
 *  FirminCSSMatrix.displayName = "FirminCSSMatrix"
 **/
FirminCSSMatrix.displayName = "FirminCSSMatrix";

/**
 *  FirminCSSMatrix.degreesToRadians(angle) -> Number
 *  - angle (Number): an angle in degrees.
 *
 *  Converts angles in degrees, which are used by the external API, to angles
 *  in radians used in internal calculations.
 **/
FirminCSSMatrix.degreesToRadians = function(angle) {
    return angle * Math.PI / 180;
};

/**
 *  FirminCSSMatrix.determinant2x2(a, b, c, d) -> Number
 *  - a (Number): top-left value of the matrix.
 *  - b (Number): top-right value of the matrix.
 *  - c (Number): bottom-left value of the matrix.
 *  - d (Number): bottom-right value of the matrix.
 *
 *  Calculates the determinant of a 2x2 matrix.
 **/
FirminCSSMatrix.determinant2x2 = function(a, b, c, d) {
    return a * d - b * c;
};

/**
 *  FirminCSSMatrix.determinant3x3(matrix) -> Number
 *  - a1 (Number): matrix value in position [1, 1].
 *  - a2 (Number): matrix value in position [1, 2].
 *  - a3 (Number): matrix value in position [1, 3].
 *  - b1 (Number): matrix value in position [2, 1].
 *  - b2 (Number): matrix value in position [2, 2].
 *  - b3 (Number): matrix value in position [2, 3].
 *  - c1 (Number): matrix value in position [3, 1].
 *  - c2 (Number): matrix value in position [3, 2].
 *  - c3 (Number): matrix value in position [3, 3].
 *
 *  Calculates the determinant of a 3x3 matrix.
 **/
FirminCSSMatrix.determinant3x3 = function(a1, a2, a3, b1, b2, b3, c1, c2, c3) {
    var determinant2x2 = FirminCSSMatrix.determinant2x2;
    return a1 * determinant2x2(b2, b3, c2, c3) -
    b1 * determinant2x2(a2, a3, c2, c3) +
    c1 * determinant2x2(a2, a3, b2, b3);
};

/**
 *  FirminCSSMatrix.determinant4x4(matrix) -> Number
 *  - matrix (FirminCSSMatrix): the matrix to calculate the determinant of.
 *
 *  Calculates the determinant of a 4x4 matrix.
 **/
FirminCSSMatrix.determinant4x4 = function(m) {
    var determinant3x3 = FirminCSSMatrix.determinant3x3,

        // Assign to individual variable names to aid selecting correct elements
    a1 = m.m11, b1 = m.m21, c1 = m.m31, d1 = m.m41,
    a2 = m.m12, b2 = m.m22, c2 = m.m32, d2 = m.m42,
    a3 = m.m13, b3 = m.m23, c3 = m.m33, d3 = m.m43,
    a4 = m.m14, b4 = m.m24, c4 = m.m34, d4 = m.m44;

    return a1 * determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) -
    b1 * determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) +
    c1 * determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) -
    d1 * determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
};

/**
 * FirminCSSMatrix.toMatrixString(transformValue) -> String
 * - transformValue (String): `el.style.WebkitTransform`-style string (like `rotate(18rad) translate3d(50px, 100px, 10px)`)
 *
 * Tranforms a `el.style.WebkitTransform`-style string
 * (like `rotate(18rad) translate3d(50px, 100px, 10px)`)
 * into a `getComputedStyle(el)`-style matrix string
 * (like `matrix3d(0.6603167082440828, -0.7509872467716737, 0, 0, 0.7509872467716737, 0.6603167082440828, 0, 0, 0, 0, 1, 0, 108.11456008937151, 28.482308485824596, 10, 1)`)
 **/
FirminCSSMatrix.toMatrixString = function (transformValue) {
    var rgx = {
        functionSignature: /(\w+)\([^\)]+\)/ig,
        nameAndArguments: /(\w+)\(([^\)]+)\)/i,
        units: /([-\+]?[0-9]+[\.0-9]*)(deg|rad|grad|px|%)*/
    };
    var transformStatements = transformValue.match(/(\w+)\([^\)]+\)/ig);
    var onlyMatrices = transformStatements && transformStatements.every(function (t) { return (/^matrix/).test(t) });
    if (!transformStatements || onlyMatrices) return transformValue;

    var values = function (o) { return o.value };
    var cssFunctionToJsFunction = {
        matrix: function (m, o) {
            var m2 = new FirminCSSMatrix(o.unparsed);

            return m.multiply(m2)
        },
        matrix3d: function (m, o) {
            var m2 = new FirminCSSMatrix(o.unparsed);

            return m.multiply(m2)
        },

        perspective: function (m, o) {
            var m2 = new FirminCSSMatrix();
            m2.m34 -= 1 / o.value[0].value;

            return m.multiply(m2);
        },

        rotate: function (m, o) {
            return m.rotate.apply(m, o.value.map(values))
        },
        rotate3d: function (m, o) {
            return m.rotateAxisAngle.apply(m, o.value.map(values))
        },
        rotateX: function (m, o) {
            return m.rotate.apply(m, [o.value[0].value, 0, 0]);
        },
        rotateY: function (m, o) {
            return m.rotate.apply(m, [0, o.value[0].value, 0]);
        },
        rotateZ: function (m, o) {
            return m.rotate.apply(m, [0, 0, o.value[0].value]);
        },

        scale: function (m, o) {
            return m.scale.apply(m, o.value.map(values));
        },
        scale3d: function (m, o) {
            return m.scale.apply(m, o.value.map(values));
        },
        scaleX: function (m, o) {
            return m.scale.apply(m, o.value.map(values));
        },
        scaleY: function (m, o) {
            return m.scale.apply(m, [0, o.value[0].value, 0]);
        },
        scaleZ: function (m, o) {
            return m.scale.apply(m, [0, 0, o.value[0].value]);
        },

        skew: function (m, o) {
            var mX = new FirminCSSMatrix('skewX(' + o.value[0].unparsed + ')');
            var mY = new FirminCSSMatrix('skewY(' + o.value[1].unparsed + ')');
            var sM = 'matrix(1.00000, '+ mY.b +', '+ mX.c +', 1.000000, 0.000000, 0.000000)';
            var m2 = new FirminCSSMatrix(sM);

            return m.multiply(m2);
        },
        skewX: function (m, o) {
            return m.skewX.apply(m, [o.value[0].value]);
        },
        skewY: function (m, o) {
            return m.skewY.apply(m, [o.value[0].value]);
        },

        translate: function (m, o) {
            return m.translate.apply(m, o.value.map(values));
        },
        translate3d: function (m, o) {
            return m.translate.apply(m, o.value.map(values));
        },
        translateX: function (m, o) {
            return m.translate.apply(m, [o.value[0].value, 0, 0]);
        },
        translateY: function (m, o) {
            return m.translate.apply(m, [0, o.value[0].value, 0]);
        },
        translateZ: function (m, o) {
            return m.translate.apply(m, [0, 0, o.value[0].value]);
        }
    };
    var parseTransformStatement = function (str) {
        var pair = str.match(rgx.nameAndArguments).slice(1);

        return {
            key: pair[0],
            value: pair[1].split(/, ?/).map(function (value) {
                var parts = value.match(/([-\+]?[0-9]+[\.0-9]*)(deg|rad|grad|px|%)*/) || [];

                return {
                    value: parseFloat(parts[1]),
                    units: parts[2],
                    unparsed: value
                };
            }),
            unparsed: str
        };
    };

    var transformOperations = transformStatements.map(parseTransformStatement);
    var startingMatrix = new FirminCSSMatrix();
    var transformedMatrix = transformOperations.reduce(function (matrix, operation) {
        // convert to degrees b/c all CSSMatrix methods expect degrees
        operation.value = operation.value.map(function (operation) {
            if (operation.units == 'rad') {
                operation.value = operation.value * (180 / Math.PI);
                operation.units = 'deg';
            }
            else if (operation.units == 'grad') {
                operation.value = operation.value / (400 / 360); // 400 gradians in 360 degrees
                operation.units = 'deg'
            }

            return operation;
        });

        var jsFunction = cssFunctionToJsFunction[operation.key];
        var result = jsFunction(matrix, operation);

        return result || matrix;
    }, startingMatrix);

    return transformedMatrix.toString();
};

/**
 *  FirminCSSMatrix#a -> Number
 *  The first 2D vector value.
 **/

/**
 *  FirminCSSMatrix#b -> Number
 *  The second 2D vector value.
 **/

/**
 *  FirminCSSMatrix#c -> Number
 *  The third 2D vector value.
 **/

/**
 *  FirminCSSMatrix#d -> Number
 *  The fourth 2D vector value.
 **/

/**
 *  FirminCSSMatrix#e -> Number
 *  The fifth 2D vector value.
 **/

/**
 *  FirminCSSMatrix#f -> Number
 *  The sixth 2D vector value.
 **/

/**
 *  FirminCSSMatrix#m11 -> Number
 *  The 3D matrix value in the first row and first column.
 **/

/**
 *  FirminCSSMatrix#m12 -> Number
 *  The 3D matrix value in the first row and second column.
 **/

/**
 *  FirminCSSMatrix#m13 -> Number
 *  The 3D matrix value in the first row and third column.
 **/

/**
 *  FirminCSSMatrix#m14 -> Number
 *  The 3D matrix value in the first row and fourth column.
 **/

/**
 *  FirminCSSMatrix#m21 -> Number
 *  The 3D matrix value in the second row and first column.
 **/

/**
 *  FirminCSSMatrix#m22 -> Number
 *  The 3D matrix value in the second row and second column.
 **/

/**
 *  FirminCSSMatrix#m23 -> Number
 *  The 3D matrix value in the second row and third column.
 **/

/**
 *  FirminCSSMatrix#m24 -> Number
 *  The 3D matrix value in the second row and fourth column.
 **/

/**
 *  FirminCSSMatrix#m31 -> Number
 *  The 3D matrix value in the third row and first column.
 **/

/**
 *  FirminCSSMatrix#m32 -> Number
 *  The 3D matrix value in the third row and second column.
 **/

/**
 *  FirminCSSMatrix#m33 -> Number
 *  The 3D matrix value in the third row and third column.
 **/

/**
 *  FirminCSSMatrix#m34 -> Number
 *  The 3D matrix value in the third row and fourth column.
 **/

/**
 *  FirminCSSMatrix#m41 -> Number
 *  The 3D matrix value in the fourth row and first column.
 **/

/**
 *  FirminCSSMatrix#m42 -> Number
 *  The 3D matrix value in the fourth row and second column.
 **/

/**
 *  FirminCSSMatrix#m43 -> Number
 *  The 3D matrix value in the fourth row and third column.
 **/

/**
 *  FirminCSSMatrix#m44 -> Number
 *  The 3D matrix value in the fourth row and fourth column.
 **/

[["m11", "a"],
    ["m12", "b"],
    ["m21", "c"],
    ["m22", "d"],
    ["m41", "e"],
    ["m42", "f"]].forEach(function(pair) {
    var key3d = pair[0], key2d = pair[1];

    Object.defineProperty(FirminCSSMatrix.prototype, key2d, {
        set: function(val) {
            this[key3d] = val;
        },

        get: function() {
            return this[key3d];
        },
        enumerable : true,
        configurable : true
    });
});

/**
 *  FirminCSSMatrix#isAffine() -> Boolean
 *
 *  Determines whether the matrix is affine.
 **/
FirminCSSMatrix.prototype.isAffine = function() {
    return this.m13 === 0 && this.m14 === 0 &&
    this.m23 === 0 && this.m24 === 0 &&
    this.m31 === 0 && this.m32 === 0 &&
    this.m33 === 1 && this.m34 === 0 &&
    this.m43 === 0 && this.m44 === 1;
};

/**
 *  FirminCSSMatrix#multiply(otherMatrix) -> FirminCSSMatrix
 *  - otherMatrix (FirminCSSMatrix): the matrix to multiply this one by.
 *
 *  Multiplies the matrix by a given matrix and returns the result.
 **/
FirminCSSMatrix.prototype.multiply = function(otherMatrix) {
    if (!otherMatrix) return null;

    var a = otherMatrix,
    b = this,
    c = new FirminCSSMatrix();

    c.m11 = a.m11 * b.m11 + a.m12 * b.m21 + a.m13 * b.m31 + a.m14 * b.m41;
    c.m12 = a.m11 * b.m12 + a.m12 * b.m22 + a.m13 * b.m32 + a.m14 * b.m42;
    c.m13 = a.m11 * b.m13 + a.m12 * b.m23 + a.m13 * b.m33 + a.m14 * b.m43;
    c.m14 = a.m11 * b.m14 + a.m12 * b.m24 + a.m13 * b.m34 + a.m14 * b.m44;

    c.m21 = a.m21 * b.m11 + a.m22 * b.m21 + a.m23 * b.m31 + a.m24 * b.m41;
    c.m22 = a.m21 * b.m12 + a.m22 * b.m22 + a.m23 * b.m32 + a.m24 * b.m42;
    c.m23 = a.m21 * b.m13 + a.m22 * b.m23 + a.m23 * b.m33 + a.m24 * b.m43;
    c.m24 = a.m21 * b.m14 + a.m22 * b.m24 + a.m23 * b.m34 + a.m24 * b.m44;

    c.m31 = a.m31 * b.m11 + a.m32 * b.m21 + a.m33 * b.m31 + a.m34 * b.m41;
    c.m32 = a.m31 * b.m12 + a.m32 * b.m22 + a.m33 * b.m32 + a.m34 * b.m42;
    c.m33 = a.m31 * b.m13 + a.m32 * b.m23 + a.m33 * b.m33 + a.m34 * b.m43;
    c.m34 = a.m31 * b.m14 + a.m32 * b.m24 + a.m33 * b.m34 + a.m34 * b.m44;

    c.m41 = a.m41 * b.m11 + a.m42 * b.m21 + a.m43 * b.m31 + a.m44 * b.m41;
    c.m42 = a.m41 * b.m12 + a.m42 * b.m22 + a.m43 * b.m32 + a.m44 * b.m42;
    c.m43 = a.m41 * b.m13 + a.m42 * b.m23 + a.m43 * b.m33 + a.m44 * b.m43;
    c.m44 = a.m41 * b.m14 + a.m42 * b.m24 + a.m43 * b.m34 + a.m44 * b.m44;

    return c;
};

/**
 *  FirminCSSMatrix#isIdentityOrTranslation() -> Boolean
 *
 *  Returns whether the matrix is the identity matrix or a translation matrix.
 **/
FirminCSSMatrix.prototype.isIdentityOrTranslation = function() {
    var t = this;
    return t.m11 === 1 && t.m12 === 0 && t.m13 === 0 && t.m14 === 0 &&
    t.m21 === 0 && t.m22 === 1 && t.m23 === 0 && t.m24 === 0 &&
    t.m31 === 0 && t.m31 === 0 && t.m33 === 1 && t.m34 === 0 &&
        /* m41, m42 and m43 are the translation points */   t.m44 === 1;
};

/**
 *  FirminCSSMatrix#adjoint() -> FirminCSSMatrix
 *
 *  Returns the adjoint matrix.
 **/
FirminCSSMatrix.prototype.adjoint = function() {
    var result = new FirminCSSMatrix(), t = this,
    determinant3x3 = FirminCSSMatrix.determinant3x3,

    a1 = t.m11, b1 = t.m12, c1 = t.m13, d1 = t.m14,
    a2 = t.m21, b2 = t.m22, c2 = t.m23, d2 = t.m24,
    a3 = t.m31, b3 = t.m32, c3 = t.m33, d3 = t.m34,
    a4 = t.m41, b4 = t.m42, c4 = t.m43, d4 = t.m44;

    // Row column labeling reversed since we transpose rows & columns
    result.m11 =  determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    result.m21 = -determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    result.m31 =  determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    result.m41 = -determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

    result.m12 = -determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    result.m22 =  determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    result.m32 = -determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    result.m42 =  determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

    result.m13 =  determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    result.m23 = -determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    result.m33 =  determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    result.m43 = -determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

    result.m14 = -determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    result.m24 =  determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    result.m34 = -determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    result.m44 =  determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);

    return result;
};

/**
 *  FirminCSSMatrix#inverse() -> FirminCSSMatrix | null
 *
 *  If the matrix is invertible, returns its inverse, otherwise returns null.
 **/
FirminCSSMatrix.prototype.inverse = function() {
    var inv, det, result, i, j;

    if (this.isIdentityOrTranslation()) {
        inv = new FirminCSSMatrix();

        if (!(this.m41 === 0 && this.m42 === 0 && this.m43 === 0)) {
            inv.m41 = -this.m41;
            inv.m42 = -this.m42;
            inv.m43 = -this.m43;
        }

        return inv;
    }

    // Calculate the adjoint matrix
    result = this.adjoint();

    // Calculate the 4x4 determinant
    det = FirminCSSMatrix.determinant4x4(this);

    // If the determinant is zero, then the inverse matrix is not unique
    if (Math.abs(det) < 1e-8) return null;

    // Scale the adjoint matrix to get the inverse
    for (i = 1; i < 5; i++) {
        for (j = 1; j < 5; j++) {
            result[("m" + i) + j] /= det;
        }
    }

    return result;
};

/**
 *  FirminCSSMatrix#rotate(rotX, rotY, rotZ) -> FirminCSSMatrix
 *  - rotX (Number): the rotation around the x axis.
 *  - rotY (Number): the rotation around the y axis. If undefined, the x
 *    component is used.
 *  - rotZ (Number): the rotation around the z axis. If undefined, the x
 *    component is used.
 *
 *  Returns the result of rotating the matrix by a given vector.
 *
 *  If only the first argument is provided, the matrix is only rotated about
 *  the z axis.
 **/
FirminCSSMatrix.prototype.rotate = function(rx, ry, rz) {
    var degreesToRadians = FirminCSSMatrix.degreesToRadians;

    if (typeof rx != "number" || isNaN(rx)) rx = 0;

    if ((typeof ry != "number" || isNaN(ry)) &&
    (typeof rz != "number" || isNaN(rz))) {
        rz = rx;
        rx = 0;
        ry = 0;
    }

    if (typeof ry != "number" || isNaN(ry)) ry = 0;
    if (typeof rz != "number" || isNaN(rz)) rz = 0;

    rx = degreesToRadians(rx);
    ry = degreesToRadians(ry);
    rz = degreesToRadians(rz);

    var tx = new FirminCSSMatrix(),
    ty = new FirminCSSMatrix(),
    tz = new FirminCSSMatrix(),
    sinA, cosA, sinA2;

    rz /= 2;
    sinA = Math.sin(rz);
    cosA = Math.cos(rz);
    sinA2 = sinA * sinA;

    // Matrices are identity outside the assigned values
    tz.m11 = tz.m22 = 1 - 2 * sinA2;
    tz.m12 = tz.m21 = 2 * sinA * cosA;
    tz.m21 *= -1;

    ry /= 2;
    sinA  = Math.sin(ry);
    cosA  = Math.cos(ry);
    sinA2 = sinA * sinA;

    ty.m11 = ty.m33 = 1 - 2 * sinA2;
    ty.m13 = ty.m31 = 2 * sinA * cosA;
    ty.m13 *= -1;

    rx /= 2;
    sinA = Math.sin(rx);
    cosA = Math.cos(rx);
    sinA2 = sinA * sinA;

    tx.m22 = tx.m33 = 1 - 2 * sinA2;
    tx.m23 = tx.m32 = 2 * sinA * cosA;
    tx.m32 *= -1;

    var isIdentity = (this.toString() === (new FirminCSSMatrix).toString());

    return (isIdentity)
    ? tz.multiply(ty).multiply(tx)
    : this.multiply(tx).multiply(ty).multiply(tz);
};

/**
 *  FirminCSSMatrix#rotateAxisAngle(rotX, rotY, rotZ, angle) -> FirminCSSMatrix
 *  - rotX (Number): the rotation around the x axis.
 *  - rotY (Number): the rotation around the y axis. If undefined, the x
 *    component is used.
 *  - rotZ (Number): the rotation around the z axis. If undefined, the x
 *    component is used.
 *  - angle (Number): the angle of rotation about the axis vector, in degrees.
 *
 *  Returns the result of rotating the matrix around a given vector by a given
 *  angle.
 *
 *  If the given vector is the origin vector then the matrix is rotated by the
 *  given angle around the z axis.
 **/
FirminCSSMatrix.prototype.rotateAxisAngle = function(x, y, z, a) {
    if (typeof x != "number" || isNaN(x)) x = 0;
    if (typeof y != "number" || isNaN(y)) y = 0;
    if (typeof z != "number" || isNaN(z)) z = 0;
    if (typeof a != "number" || isNaN(a)) a = 0;
    if (x === 0 && y === 0 && z === 0) z = 1;

    var t   = new FirminCSSMatrix(),
    len = Math.sqrt(x * x + y * y + z * z),
    cosA, sinA, sinA2, csA, x2, y2, z2;

    a     = (FirminCSSMatrix.degreesToRadians(a) || 0) / 2;
    cosA  = Math.cos(a);
    sinA  = Math.sin(a);
    sinA2 = sinA * sinA;

    // Bad vector, use something sensible
    if (len === 0) {
        x = 0;
        y = 0;
        z = 1;
    } else if (len !== 1) {
        x /= len;
        y /= len;
        z /= len;
    }

    // Optimise cases where axis is along major axis
    if (x === 1 && y === 0 && z === 0) {
        t.m22 = t.m33 = 1 - 2 * sinA2;
        t.m23 = t.m32 = 2 * cosA * sinA;
        t.m32 *= -1;
    } else if (x === 0 && y === 1 && z === 0) {
        t.m11 = t.m33 = 1 - 2 * sinA2;
        t.m13 = t.m31 = 2 * cosA * sinA;
        t.m13 *= -1;
    } else if (x === 0 && y === 0 && z === 1) {
        t.m11 = t.m22 = 1 - 2 * sinA2;
        t.m12 = t.m21 = 2 * cosA * sinA;
        t.m21 *= -1;
    } else {
        csA = sinA * cosA;
        x2  = x * x;
        y2  = y * y;
        z2  = z * z;

        t.m11 = 1 - 2 * (y2 + z2) * sinA2;
        t.m12 = 2 * (x * y * sinA2 + z * csA);
        t.m13 = 2 * (x * z * sinA2 - y * csA);
        t.m21 = 2 * (y * x * sinA2 - z * csA);
        t.m22 = 1 - 2 * (z2 + x2) * sinA2;
        t.m23 = 2 * (y * z * sinA2 + x * csA);
        t.m31 = 2 * (z * x * sinA2 + y * csA);
        t.m32 = 2 * (z * y * sinA2 - x * csA);
        t.m33 = 1 - 2 * (x2 + y2) * sinA2;
    }

    return this.multiply(t);
};

/**
 *  FirminCSSMatrix#scale(scaleX, scaleY, scaleZ) -> FirminCSSMatrix
 *  - scaleX (Number): the scaling factor in the x axis.
 *  - scaleY (Number): the scaling factor in the y axis. If undefined, the x
 *    component is used.
 *  - scaleZ (Number): the scaling factor in the z axis. If undefined, 1 is
 *    used.
 *
 *  Returns the result of scaling the matrix by a given vector.
 **/
FirminCSSMatrix.prototype.scale = function(scaleX, scaleY, scaleZ) {
    var transform = new FirminCSSMatrix();

    if (typeof scaleX != "number" || isNaN(scaleX)) scaleX = 1;
    if (typeof scaleY != "number" || isNaN(scaleY)) scaleY = scaleX;
    if (typeof scaleZ != "number" || isNaN(scaleZ)) scaleZ = 1;

    transform.m11 = scaleX;
    transform.m22 = scaleY;
    transform.m33 = scaleZ;

    return this.multiply(transform);
};

/**
 *  FirminCSSMatrix#skewX(skewX) -> FirminCSSMatrix
 *  - skewX (Number): the scaling factor in the x axis.
 *
 *  Returns the result of skewing the matrix by a given vector.
 **/
FirminCSSMatrix.prototype.skewX = function(degrees) {
    var radians = FirminCSSMatrix.degreesToRadians(degrees);
    var transform = new FirminCSSMatrix();

    transform.c = Math.tan(radians);

    return this.multiply(transform);
};

/**
 *  FirminCSSMatrix#skewY(skewY) -> FirminCSSMatrix
 *  - skewY (Number): the scaling factor in the x axis.
 *
 *  Returns the result of skewing the matrix by a given vector.
 **/
FirminCSSMatrix.prototype.skewY = function(degrees) {
    var radians = FirminCSSMatrix.degreesToRadians(degrees);
    var transform = new FirminCSSMatrix();

    transform.b = Math.tan(radians);

    return this.multiply(transform);
};

/**
 *  FirminCSSMatrix#translate(x, y, z) -> FirminCSSMatrix
 *  - x (Number): the x component of the vector.
 *  - y (Number): the y component of the vector.
 *  - z (Number): the z component of the vector. If undefined, 0 is used.
 *
 *  Returns the result of translating the matrix by a given vector.
 **/
FirminCSSMatrix.prototype.translate = function(x, y, z) {
    var t = new FirminCSSMatrix();

    if (typeof x != "number" || isNaN(x)) x = 0;
    if (typeof y != "number" || isNaN(y)) y = 0;
    if (typeof z != "number" || isNaN(z)) z = 0;

    t.m41 = x;
    t.m42 = y;
    t.m43 = z;

    return this.multiply(t);
};

/**
 *  FirminCSSMatrix#setMatrixValue(domstr) -> undefined
 *  - domstr (String): a string representation of a 2D or 3D transform matrix
 *    in the form given by the CSS transform property, i.e. just like the
 *    output from [[FirminCSSMatrix#toString]].
 *
 *  Sets the matrix values using a string representation, such as that produced
 *  by the [[FirminCSSMatrix#toString]] method.
 **/
FirminCSSMatrix.prototype.setMatrixValue = function(domstr) {
    domstr = FirminCSSMatrix.toMatrixString(domstr.trim());
    var mstr   = domstr.match(/^matrix(3d)?\(\s*(.+)\s*\)$/),
    is3d, chunks, len, points, i, chunk;

    if (!mstr) return;

    is3d   = !!mstr[1];
    chunks = mstr[2].split(/\s*,\s*/);
    len    = chunks.length;
    points = new Array(len);

    if ((is3d && len !== 16) || !(is3d || len === 6)) return;

    for (i = 0; i < len; i++) {
        chunk = chunks[i];
        if (chunk.match(/^-?\d+(\.\d+)?$/)) {
            points[i] = parseFloat(chunk);
        } else return;
    }

    for (i = 0; i < len; i++) {
        var point = is3d ?
        ("m" + (Math.floor(i / 4) + 1)) + (i % 4 + 1) :
        String.fromCharCode(i + 97); // ASCII char 97 == 'a'
        this[point] = points[i];
    }
};

/**
 *  FirminCSSMatrix#toString() -> String
 *
 *  Returns a string representation of the matrix.
 **/
FirminCSSMatrix.prototype.toString = function() {
    var self = this, points, prefix;

    if (this.isAffine()) {
        prefix = "matrix(";
        points = ["a", "b", "c", "d", "e", "f"];
    } else {
        prefix = "matrix3d(";
        points = ["m11", "m12", "m13", "m14",
            "m21", "m22", "m23", "m24",
            "m31", "m32", "m33", "m34",
            "m41", "m42", "m43", "m44"];
    }

    return prefix + points.map(function(p) {
        return self[p].toFixed(6);
    }).join(", ") + ")";
};

XML3D.css.CSSMatrix = FirminCSSMatrix;


XML3D.css.convertCssToMat4 = function(cssMatrix, m){
    var matrix = m || XML3D.math.mat4.create();
    matrix[0] = cssMatrix.m11;
    matrix[1] = cssMatrix.m12;
    matrix[2] = cssMatrix.m13;
    matrix[3] = cssMatrix.m14;
    matrix[4] = cssMatrix.m21;
    matrix[5] = cssMatrix.m22;
    matrix[6] = cssMatrix.m23;
    matrix[7] = cssMatrix.m24;
    matrix[8] = cssMatrix.m31;
    matrix[9] = cssMatrix.m32;
    matrix[10] = cssMatrix.m33;
    matrix[11] = cssMatrix.m34;
    matrix[12] = cssMatrix.m41;
    matrix[13] = cssMatrix.m42;
    matrix[14] = cssMatrix.m43;
    matrix[15] = cssMatrix.m44;
    return matrix;
}

// gl-matrix namespace
XML3D.math = {};
/*jslint white: false, onevar: false, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true, sub: true, nomen: false */

/**
* This file contains code that may be under the following license:
*
* SGI FREE SOFTWARE LICENSE B (Version 2.0, Sept. 18, 2008)
* Copyright (C) 1991-2000 Silicon Graphics, Inc. All Rights Reserved.
*
* See http://oss.sgi.com/projects/FreeB/ for more information.
*
* All code in this file which is NOT under the SGI FREE SOFTWARE LICENSE B
* is free and unencumbered software released into the public domain.
*
* Anyone is free to copy, modify, publish, use, compile, sell, or
* distribute this software, either in source code form or as a compiled
* binary, for any purpose, commercial or non-commercial, and by any
* means.
*
* In jurisdictions that recognize copyright laws, the author or authors
* of this software dedicate any and all copyright interest in the
* software to the public domain. We make this dedication for the benefit
* of the public at large and to the detriment of our heirs and
* successors. We intend this dedication to be an overt act of
* relinquishment in perpetuity of all present and future rights to this
* software under copyright law.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
* OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
* ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*/

/** @type {Object} */
var GLU = {};

(function($) {
    /**
* Unproject a screen point.
*
* @param {number} winX the window point for the x value.
* @param {number} winY the window point for the y value.
* @param {number} winZ the window point for the z value.
* @param {Array.<number>} model the model-view matrix.
* @param {Array.<number>} proj the projection matrix.
* @param {Array.<number>} view the viewport coordinate array.
* @param {Array.<number>} objPos the model point result.
* @return {boolean} true if the unproject operation was successful, false otherwise.
*/
    $.unProject = function(winX, winY, winZ, model, proj, view, objPos) {

        /** @type {Array.<number>} */
        var inp = [
            winX,
            winY,
            winZ,
            1.0
        ];

        /** @type {Array.<number>} */
        var finalMatrix = [];

        $.multMatrices(model, proj, finalMatrix);
        if (!$.invertMatrix(finalMatrix, finalMatrix)) {
            return (false);
        }

        /* Map x and y from window coordinates */
        inp[0] = (inp[0] - view[0]) / view[2];
        inp[1] = (inp[1] - view[1]) / view[3];

        /* Map to range -1 to 1 */
        inp[0] = inp[0] * 2 - 1;
        inp[1] = inp[1] * 2 - 1;
        inp[2] = inp[2] * 2 - 1;

        /** @type {Array.<number>} */
        var out = [];

        $.multMatrixVec(finalMatrix, inp, out);

        if (out[3] === 0.0) {
            return false;
        }

        out[0] /= out[3];
        out[1] /= out[3];
        out[2] /= out[3];

        objPos[0] = out[0];
        objPos[1] = out[1];
        objPos[2] = out[2];

        return true;
    };

    /**
* Multiply the matrix by the specified vector.
*
* @param {Array.<number>} matrix the matrix.
* @param {Array.<number>} inp the vector.
* @param {Array.<number>} out the output.
*/
    $.multMatrixVec = function(matrix, inp, out) {
        for (var i = 0; i < 4; i = i + 1) {
            out[i] =
                inp[0] * matrix[0 * 4 + i] +
                inp[1] * matrix[1 * 4 + i] +
                inp[2] * matrix[2 * 4 + i] +
                inp[3] * matrix[3 * 4 + i];
        }
    };

    /**
* Multiply the specified matrices.
*
* @param {Array.<number>} a the first matrix.
* @param {Array.<number>} b the second matrix.
* @param {Array.<number>} r the result.
*/
    $.multMatrices = function(a, b, r) {
        for (var i = 0; i < 4; i = i + 1) {
            for (var j = 0; j < 4; j = j + 1) {
                r[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
    };

    /**
* Invert a matrix.
*
* @param {Array.<number>} m the matrix.
* @param {Array.<number>} invOut the inverted output.
* @return {boolean} true if successful, false otherwise.
*/
    $.invertMatrix = function(m, invOut) {
        /** @type {Array.<number>} */
        var inv = [];

        inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
            m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
        inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
            m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
        inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
            m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
        inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
            m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
        inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
            m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
        inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
            m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
        inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
            m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
        inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
            m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
        inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
            m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
        inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
            m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
        inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
            m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
        inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
            m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
        inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
            m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
        inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
            m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
        inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
            m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
        inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
            m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

        /** @type {number} */
        var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

        if (det === 0) {
            return false;
        }

        det = 1.0 / det;

        for (var i = 0; i < 16; i = i + 1) {
            invOut[i] = inv[i] * det;
        }

        return true;
    };

}(GLU));

/* EOF *//**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.2.0
 */

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


(function(_global) {
  "use strict";

  var shim = {};
  shim.exports = _global;

  (function(exports) {
    /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


if(!GLMAT_EPSILON) {
    var GLMAT_EPSILON = 0.000001;
}

if(!GLMAT_ARRAY_TYPE) {
    var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
}

if(!GLMAT_RANDOM) {
    var GLMAT_RANDOM = Math.random;
}

/**
 * @class Common utilities
 * @name glMatrix
 */
var glMatrix = {};

/**
 * Sets the type of array used when creating new vectors and matricies
 *
 * @param {Type} type Array type, such as Float32Array or Array
 */
glMatrix.setMatrixArrayType = function(type) {
    GLMAT_ARRAY_TYPE = type;
}

if(typeof(exports) !== 'undefined') {
    exports.glMatrix = glMatrix;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2 Dimensional Vector
 * @name vec2
 */

var vec2 = {};

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
vec2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = 0;
    out[1] = 0;
    return out;
};

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */
vec2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */
vec2.fromValues = function(x, y) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */
vec2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
vec2.set = function(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

/**
 * Alias for {@link vec2.subtract}
 * @function
 */
vec2.sub = vec2.subtract;

/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

/**
 * Alias for {@link vec2.multiply}
 * @function
 */
vec2.mul = vec2.multiply;

/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
};

/**
 * Alias for {@link vec2.divide}
 * @function
 */
vec2.div = vec2.divide;

/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
};

/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
};

/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */
vec2.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
};

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */
vec2.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */
vec2.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.distance}
 * @function
 */
vec2.dist = vec2.distance;

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec2.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */
vec2.sqrDist = vec2.squaredDistance;

/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */
vec2.length = function (a) {
    var x = a[0],
        y = a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.length}
 * @function
 */
vec2.len = vec2.length;

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec2.squaredLength = function (a) {
    var x = a[0],
        y = a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */
vec2.sqrLen = vec2.squaredLength;

/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */
vec2.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
};

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
vec2.normalize = function(out, a) {
    var x = a[0],
        y = a[1];
    var len = x*x + y*y;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
vec2.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */
vec2.cross = function(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
};

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec2} out
 */
vec2.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */
vec2.random = function (out, scale) {
    scale = scale || 1.0;
    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    out[0] = Math.cos(r) * scale;
    out[1] = Math.sin(r) * scale;
    return out;
};

/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
};

/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2d = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
};

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat3 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat4 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
};

/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec2.forEach = (function() {
    var vec = vec2.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 2;
        }

        if(!offset) {
            offset = 0;
        }

        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1];
        }

        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec2} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec2.str = function (a) {
    return 'vec2(' + a[0] + ', ' + a[1] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec2 = vec2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3 Dimensional Vector
 * @name vec3
 */

var vec3 = {};

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
vec3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
};

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
vec3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
vec3.fromValues = function(x, y, z) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
vec3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
vec3.set = function(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

/**
 * Alias for {@link vec3.subtract}
 * @function
 */
vec3.sub = vec3.subtract;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

/**
 * Alias for {@link vec3.multiply}
 * @function
 */
vec3.mul = vec3.multiply;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
};

/**
 * Alias for {@link vec3.divide}
 * @function
 */
vec3.div = vec3.divide;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
};

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
};

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
vec3.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
};

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
vec3.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
vec3.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.distance}
 * @function
 */
vec3.dist = vec3.distance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec3.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */
vec3.sqrDist = vec3.squaredDistance;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
vec3.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.length}
 * @function
 */
vec3.len = vec3.length;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec3.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */
vec3.sqrLen = vec3.squaredLength;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
vec3.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
};

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
vec3.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    var len = x*x + y*y + z*z;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
vec3.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.cross = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
vec3.random = function (out, scale) {
    scale = scale || 1.0;

    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    var z = (GLMAT_RANDOM() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;

    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale;
    return out;
};

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return out;
};

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat3 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
};

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
vec3.transformQuat = function(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec3.forEach = (function() {
    var vec = vec3.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 3;
        }

        if(!offset) {
            offset = 0;
        }

        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
        }

        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec3} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec3.str = function (a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec3 = vec3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4 Dimensional Vector
 * @name vec4
 */

var vec4 = {};

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
vec4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
};

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {vec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */
vec4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */
vec4.fromValues = function(x, y, z, w) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the source vector
 * @returns {vec4} out
 */
vec4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */
vec4.set = function(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link vec4.subtract}
 * @function
 */
vec4.sub = vec4.subtract;

/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
};

/**
 * Alias for {@link vec4.multiply}
 * @function
 */
vec4.mul = vec4.multiply;

/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
};

/**
 * Alias for {@link vec4.divide}
 * @function
 */
vec4.div = vec4.divide;

/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
};

/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
};

/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */
vec4.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */
vec4.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} distance between a and b
 */
vec4.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.distance}
 * @function
 */
vec4.dist = vec4.distance;

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec4.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */
vec4.sqrDist = vec4.squaredDistance;

/**
 * Calculates the length of a vec4
 *
 * @param {vec4} a vector to calculate length of
 * @returns {Number} length of a
 */
vec4.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.length}
 * @function
 */
vec4.len = vec4.length;

/**
 * Calculates the squared length of a vec4
 *
 * @param {vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec4.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */
vec4.sqrLen = vec4.squaredLength;

/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to negate
 * @returns {vec4} out
 */
vec4.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
};

/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to normalize
 * @returns {vec4} out
 */
vec4.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
        out[3] = a[3] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} dot product of a and b
 */
vec4.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec4} out
 */
vec4.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */
vec4.random = function (out, scale) {
    scale = scale || 1.0;

    //TODO: This is a pretty awful way of doing this. Find something better.
    out[0] = GLMAT_RANDOM();
    out[1] = GLMAT_RANDOM();
    out[2] = GLMAT_RANDOM();
    out[3] = GLMAT_RANDOM();
    vec4.normalize(out, out);
    vec4.scale(out, out, scale);
    return out;
};

/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec4} out
 */
vec4.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
};

/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec4} out
 */
vec4.transformQuat = function(out, a, q) {
    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec4.forEach = (function() {
    var vec = vec4.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 4;
        }

        if(!offset) {
            offset = 0;
        }

        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
        }

        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec4} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec4.str = function (a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec4 = vec4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x2 Matrix
 * @name mat2
 */

var mat2 = {};

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */
mat2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {mat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */
mat2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */
mat2.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a1 = a[1];
        out[1] = a[2];
        out[2] = a1;
    } else {
        out[0] = a[0];
        out[1] = a[2];
        out[2] = a[1];
        out[3] = a[3];
    }

    return out;
};

/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

        // Calculate the determinant
        det = a0 * a3 - a2 * a1;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] =  a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] =  a0 * det;

    return out;
};

/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.adjoint = function(out, a) {
    // Caching this value is nessecary if out == a
    var a0 = a[0];
    out[0] =  a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] =  a0;

    return out;
};

/**
 * Calculates the determinant of a mat2
 *
 * @param {mat2} a the source matrix
 * @returns {Number} determinant of a
 */
mat2.determinant = function (a) {
    return a[0] * a[3] - a[2] * a[1];
};

/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a0 * b0 + a1 * b2;
    out[1] = a0 * b1 + a1 * b3;
    out[2] = a2 * b0 + a3 * b2;
    out[3] = a2 * b1 + a3 * b3;
    return out;
};

/**
 * Alias for {@link mat2.multiply}
 * @function
 */
mat2.mul = mat2.multiply;

/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */
mat2.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a1 * s;
    out[1] = a0 * -s + a1 * c;
    out[2] = a2 *  c + a3 * s;
    out[3] = a2 * -s + a3 * c;
    return out;
};

/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/
mat2.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v1;
    out[2] = a2 * v0;
    out[3] = a3 * v1;
    return out;
};

/**
 * Returns a string representation of a mat2
 *
 * @param {mat2} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2.str = function (a) {
    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.mat2 = mat2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x3 Matrix
 * @name mat2d
 *
 * @description
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, b,
 *  c, d,
 *  tx,ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, b, 0
 *  c, d, 0
 *  tx,ty,1]
 * </pre>
 * The last column is ignored so the array is shorter and operations are faster.
 */

var mat2d = {};

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.create = function() {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {mat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */
mat2d.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.invert = function(out, a) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
        atx = a[4], aty = a[5];

    var det = aa * ad - ab * ac;
    if(!det){
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
};

/**
 * Calculates the determinant of a mat2d
 *
 * @param {mat2d} a the source matrix
 * @returns {Number} determinant of a
 */
mat2d.determinant = function (a) {
    return a[0] * a[3] - a[1] * a[2];
};

/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.multiply = function (out, a, b) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
        atx = a[4], aty = a[5],
        ba = b[0], bb = b[1], bc = b[2], bd = b[3],
        btx = b[4], bty = b[5];

    out[0] = aa*ba + ab*bc;
    out[1] = aa*bb + ab*bd;
    out[2] = ac*ba + ad*bc;
    out[3] = ac*bb + ad*bd;
    out[4] = ba*atx + bc*aty + btx;
    out[5] = bb*atx + bd*aty + bty;
    return out;
};

/**
 * Alias for {@link mat2d.multiply}
 * @function
 */
mat2d.mul = mat2d.multiply;


/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */
mat2d.rotate = function (out, a, rad) {
    var aa = a[0],
        ab = a[1],
        ac = a[2],
        ad = a[3],
        atx = a[4],
        aty = a[5],
        st = Math.sin(rad),
        ct = Math.cos(rad);

    out[0] = aa*ct + ab*st;
    out[1] = -aa*st + ab*ct;
    out[2] = ac*ct + ad*st;
    out[3] = -ac*st + ct*ad;
    out[4] = ct*atx + st*aty;
    out[5] = ct*aty - st*atx;
    return out;
};

/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/
mat2d.scale = function(out, a, v) {
    var vx = v[0], vy = v[1];
    out[0] = a[0] * vx;
    out[1] = a[1] * vy;
    out[2] = a[2] * vx;
    out[3] = a[3] * vy;
    out[4] = a[4] * vx;
    out[5] = a[5] * vy;
    return out;
};

/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/
mat2d.translate = function(out, a, v) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4] + v[0];
    out[5] = a[5] + v[1];
    return out;
};

/**
 * Returns a string representation of a mat2d
 *
 * @param {mat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2d.str = function (a) {
    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.mat2d = mat2d;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3x3 Matrix
 * @name mat3
 */

var mat3 = {};

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
mat3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {mat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */
mat3.fromMat4 = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
};

/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {mat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */
mat3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
mat3.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a12 = a[5];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a01;
        out[5] = a[7];
        out[6] = a02;
        out[7] = a12;
    } else {
        out[0] = a[0];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a[1];
        out[4] = a[4];
        out[5] = a[7];
        out[6] = a[2];
        out[7] = a[5];
        out[8] = a[8];
    }

    return out;
};

/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
};

/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    out[0] = (a11 * a22 - a12 * a21);
    out[1] = (a02 * a21 - a01 * a22);
    out[2] = (a01 * a12 - a02 * a11);
    out[3] = (a12 * a20 - a10 * a22);
    out[4] = (a00 * a22 - a02 * a20);
    out[5] = (a02 * a10 - a00 * a12);
    out[6] = (a10 * a21 - a11 * a20);
    out[7] = (a01 * a20 - a00 * a21);
    out[8] = (a00 * a11 - a01 * a10);
    return out;
};

/**
 * Calculates the determinant of a mat3
 *
 * @param {mat3} a the source matrix
 * @returns {Number} determinant of a
 */
mat3.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
};

/**
 * Alias for {@link mat3.multiply}
 * @function
 */
mat3.mul = mat3.multiply;

/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */
mat3.translate = function(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],
        x = v[0], y = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
};

/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
mat3.rotate = function (out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        s = Math.sin(rad),
        c = Math.cos(rad);

    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;

    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
};

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/
mat3.scale = function(out, a, v) {
    var x = v[0], y = v[1];

    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];

    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];

    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat2d} a the matrix to copy
 * @returns {mat3} out
 **/
mat3.fromMat2d = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;

    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;

    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
};

/**
* Calculates a 3x3 matrix from the given quaternion
*
* @param {mat3} out mat3 receiving operation result
* @param {quat} q Quaternion to create matrix from
*
* @returns {mat3} out
*/
mat3.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[3] = xy + wz;
    out[6] = xz - wy;

    out[1] = xy - wz;
    out[4] = 1 - (xx + zz);
    out[7] = yz + wx;

    out[2] = xz + wy;
    out[5] = yz - wx;
    out[8] = 1 - (xx + yy);

    return out;
};

/**
* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
*
* @param {mat3} out mat3 receiving operation result
* @param {mat4} a Mat4 to derive the normal matrix from
*
* @returns {mat3} out
*/
mat3.normalFromMat4 = function (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
};

/**
 * Returns a string representation of a mat3
 *
 * @param {mat3} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat3.str = function (a) {
    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' +
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.mat3 = mat3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4x4 Matrix
 * @name mat4
 */

var mat4 = {};

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
mat4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
mat4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
mat4.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }

    return out;
};

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
mat4.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/**
 * Alias for {@link mat4.multiply}
 * @function
 */
mat4.mul = mat4.multiply;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.translate = function (out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
mat4.scale = function(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
mat4.rotate = function (out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < GLMAT_EPSILON) { return null; }

    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateX = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateY = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateZ = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
mat4.fromRotationTranslation = function (out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;

    return out;
};

/**
* Calculates a 4x4 matrix from the given quaternion
*
* @param {mat4} out mat4 receiving operation result
* @param {quat} q Quaternion to create matrix from
*
* @returns {mat4} out
*/
mat4.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;

    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;

    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.frustum = function (out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.perspective = function (out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.ortho = function (out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
mat4.lookAt = function (out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < GLMAT_EPSILON &&
        Math.abs(eyey - centery) < GLMAT_EPSILON &&
        Math.abs(eyez - centerz) < GLMAT_EPSILON) {
        return mat4.identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat4.str = function (a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.mat4 = mat4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class Quaternion
 * @name quat
 */

var quat = {};

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
quat.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */
quat.rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(out, a, b) {
        var dot = vec3.dot(a, b);
        if (dot < -0.999999) {
            vec3.cross(tmpvec3, xUnitVec3, a);
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(tmpvec3, yUnitVec3, a);
            vec3.normalize(tmpvec3, tmpvec3);
            quat.setAxisAngle(out, tmpvec3, Math.PI);
            return out;
        } else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(tmpvec3, a, b);
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return quat.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {vec3} view  the vector representing the viewing direction
 * @param {vec3} right the vector representing the local "right" direction
 * @param {vec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */
quat.setAxes = (function() {
    var matr = mat3.create();

    return function(out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = view[0];
        matr[5] = view[1];
        matr[8] = view[2];

        return quat.normalize(out, quat.fromMat3(out, matr));
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */
quat.clone = vec4.clone;

/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */
quat.fromValues = vec4.fromValues;

/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the source quaternion
 * @returns {quat} out
 * @function
 */
quat.copy = vec4.copy;

/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */
quat.set = vec4.set;

/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */
quat.identity = function(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/
quat.setAxisAngle = function(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 * @function
 */
quat.add = vec4.add;

/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 */
quat.multiply = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 */
quat.mul = quat.multiply;

/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */
quat.scale = vec4.scale;

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateX = function (out, a, rad) {
    rad *= 0.5;

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateY = function (out, a, rad) {
    rad *= 0.5;

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateZ = function (out, a, rad) {
    rad *= 0.5;

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate W component of
 * @returns {quat} out
 */
quat.calculateW = function (out, a) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */
quat.dot = vec4.dot;

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 * @function
 */
quat.lerp = vec4.lerp;

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 */
quat.slerp = function (out, a, b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;

    return out;
};

/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate inverse of
 * @returns {quat} out
 */
quat.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;

    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate conjugate of
 * @returns {quat} out
 */
quat.conjugate = function (out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {quat} a vector to calculate length of
 * @returns {Number} length of a
 * @function
 */
quat.length = vec4.length;

/**
 * Alias for {@link quat.length}
 * @function
 */
quat.len = quat.length;

/**
 * Calculates the squared length of a quat
 *
 * @param {quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */
quat.squaredLength = vec4.squaredLength;

/**
 * Alias for {@link quat.squaredLength}
 * @function
 */
quat.sqrLen = quat.squaredLength;

/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */
quat.normalize = vec4.normalize;

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
quat.fromMat3 = (function() {
    // benchmarks:
    //    http://jsperf.com/typed-array-access-speed
    //    http://jsperf.com/conversion-of-3x3-matrix-to-quaternion

    var s_iNext = (typeof(Int8Array) !== 'undefined' ? new Int8Array([1,2,0]) : [1,2,0]);

    return function(out, m) {
        // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
        // article "Quaternion Calculus and Fast Animation".
        var fTrace = m[0] + m[4] + m[8];
        var fRoot;

        if ( fTrace > 0.0 ) {
            // |w| > 1/2, may as well choose w > 1/2
            fRoot = Math.sqrt(fTrace + 1.0);  // 2w
            out[3] = 0.5 * fRoot;
            fRoot = 0.5/fRoot;  // 1/(4w)
            out[0] = (m[7]-m[5])*fRoot;
            out[1] = (m[2]-m[6])*fRoot;
            out[2] = (m[3]-m[1])*fRoot;
        } else {
            // |w| <= 1/2
            var i = 0;
            if ( m[4] > m[0] )
              i = 1;
            if ( m[8] > m[i*3+i] )
              i = 2;
            var j = s_iNext[i];
            var k = s_iNext[j];

            fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
            out[i] = 0.5 * fRoot;
            fRoot = 0.5 / fRoot;
            out[3] = (m[k*3+j] - m[j*3+k]) * fRoot;
            out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
            out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
        }

        return out;
    };
})();

/**
 * Returns a string representation of a quatenion
 *
 * @param {quat} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
quat.str = function (a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.quat = quat;
}
;



  })(shim.exports);
})(XML3D.math);// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Oyvind Sean Kinsey http://kinsey.no/blog (2010)
//                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)

(function() {
    /**
     * Main function giving a function stack trace with a forced or passed in
     * Error
     *
     * @cfg {Error} e The error to create a stacktrace from (optional)
     * @cfg {Boolean} guess If we should try to resolve the names of anonymous
     * functions
     * @return {Array} of Strings with functions, lines, files, and arguments
     * where possible
     */
    function printStackTrace(options) {
        options = options || {
            guess : true
        };
        var ex = options.e || null, guess = !!options.guess;
        var p = new printStackTrace.implementation(), result = p.run(ex);
        return (guess) ? p.guessAnonymousFunctions(result) : result;
    }

    printStackTrace.implementation = function() {};

    printStackTrace.implementation.prototype = {
        /**
         * @param {Error} ex The error to create a stacktrace from (optional)
         * @param {String} mode Forced mode (optional, mostly for unit tests)
         */
        run : function(ex, mode) {
            ex = ex || this.createException();
            // examine exception properties w/o debugger
            // for (var prop in ex) {alert("Ex['" + prop + "']=" + ex[prop]);}
            mode = mode || this.mode(ex);
            if (mode === 'other') {
                return this.other(arguments.callee);
            } else {
                return this[mode](ex);
            }
        },

        createException : function() {
            try {
                this.undef();
            } catch (e) {
                return e;
            }
        },

        /**
         * Mode could differ for different exception, e.g. exceptions in Chrome
         * may or may not have arguments or stack.
         *
         * @return {String} mode of operation for the exception
         */
        mode : function(e) {
            if (e['arguments'] && e.stack) {
                return 'chrome';
            } else if (e.stack && e.sourceURL) {
                return 'safari';
            } else if (typeof e.message === 'string' && typeof window !== 'undefined' && window.opera) {
                // e.message.indexOf("Backtrace:") > -1 -> opera
                // !e.stacktrace -> opera
                if (!e.stacktrace) {
                    return 'opera9'; // use e.message
                }
                // 'opera#sourceloc' in e -> opera9, opera10a
                if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
                    return 'opera9'; // use e.message
                }
                // e.stacktrace && !e.stack -> opera10a
                if (!e.stack) {
                    return 'opera10a'; // use e.stacktrace
                }
                // e.stacktrace && e.stack -> opera10b
                if (e.stacktrace.indexOf("called from line") < 0) {
                    return 'opera10b'; // use e.stacktrace, format differs from
                                        // 'opera10a'
                }
                // e.stacktrace && e.stack -> opera11
                return 'opera11'; // use e.stacktrace, format differs from
                                    // 'opera10a', 'opera10b'
            } else if (e.stack) {
                return 'firefox';
            }
            return 'other';
        },

        /**
         * Given a context, function name, and callback function, overwrite it
         * so that it calls printStackTrace() first with a callback and then
         * runs the rest of the body.
         *
         * @param {Object} context of execution (e.g. window)
         * @param {String} functionName to instrument
         * @param {Function} function to call with a stack trace on invocation
         */
        instrumentFunction : function(context, functionName, callback) {
            context = context || window;
            var original = context[functionName];
            context[functionName] = function instrumented() {
                callback.call(this, printStackTrace().slice(4));
                return context[functionName]._instrumented.apply(this, arguments);
            };
            context[functionName]._instrumented = original;
        },

        /**
         * Given a context and function name of a function that has been
         * instrumented, revert the function to it's original (non-instrumented)
         * state.
         *
         * @param {Object} context of execution (e.g. window)
         * @param {String} functionName to de-instrument
         */
        deinstrumentFunction : function(context, functionName) {
            if (context[functionName].constructor === Function && context[functionName]._instrumented
                    && context[functionName]._instrumented.constructor === Function) {
                context[functionName] = context[functionName]._instrumented;
            }
        },

        /**
         * Given an Error object, return a formatted Array based on Chrome's
         * stack string.
         *
         * @param e - Error object to inspect
         * @return Array<String> of function calls, files and line numbers
         */
        chrome : function(e) {
            var stack = (e.stack + '\n').replace(/^\S[^\(]+?[\n$]/gm, '').replace(/^\s+(at eval )?at\s+/gm, '').replace(/^([^\(]+?)([\n$])/gm,
                    '{anonymous}()@$1$2').replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}()@$1').split('\n');
            stack.pop();
            return stack;
        },

        /**
         * Given an Error object, return a formatted Array based on Safari's
         * stack string.
         *
         * @param e - Error object to inspect
         * @return Array<String> of function calls, files and line numbers
         */
        safari : function(e) {
            return e.stack.replace(/\[native code\]\n/m, '').replace(/^@/gm, '{anonymous}()@').split('\n');
        },

        /**
         * Given an Error object, return a formatted Array based on Firefox's
         * stack string.
         *
         * @param e - Error object to inspect
         * @return Array<String> of function calls, files and line numbers
         */
        firefox : function(e) {
            return e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^[\(@]/gm, '{anonymous}()@').split('\n');
        },

        opera11 : function(e) {
            var ANON = '{anonymous}', lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
            var lines = e.stacktrace.split('\n'), result = [];

            for ( var i = 0, len = lines.length; i < len; i += 2) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    var location = match[4] + ':' + match[1] + ':' + match[2];
                    var fnName = match[3] || "global code";
                    fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
                    result.push(fnName + '@' + location + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
                }
            }

            return result;
        },

        opera10b : function(e) {
            // "<anonymous function: run>([arguments not
            // available])@file://localhost/G:/js/stacktrace.js:27\n" +
            // "printStackTrace([arguments not
            // available])@file://localhost/G:/js/stacktrace.js:18\n" +
            // "@file://localhost/G:/js/test/functional/testcase1.html:15"
            var lineRE = /^(.*)@(.+):(\d+)$/;
            var lines = e.stacktrace.split('\n'), result = [];

            for ( var i = 0, len = lines.length; i < len; i++) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    var fnName = match[1] ? (match[1] + '()') : "global code";
                    result.push(fnName + '@' + match[2] + ':' + match[3]);
                }
            }

            return result;
        },

        /**
         * Given an Error object, return a formatted Array based on Opera 10's
         * stacktrace string.
         *
         * @param e - Error object to inspect
         * @return Array<String> of function calls, files and line numbers
         */
        opera10a : function(e) {
            // " Line 27 of linked script
            // file://localhost/G:/js/stacktrace.js\n"
            // " Line 11 of inline#1 script in
            // file://localhost/G:/js/test/functional/testcase1.html: In
            // function foo\n"
            var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
            var lines = e.stacktrace.split('\n'), result = [];

            for ( var i = 0, len = lines.length; i < len; i += 2) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    var fnName = match[3] || ANON;
                    result.push(fnName + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
                }
            }

            return result;
        },

        // Opera 7.x-9.2x only!
        opera9 : function(e) {
            // " Line 43 of linked script
            // file://localhost/G:/js/stacktrace.js\n"
            // " Line 7 of inline#1 script in
            // file://localhost/G:/js/test/functional/testcase1.html\n"
            var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
            var lines = e.message.split('\n'), result = [];

            for ( var i = 2, len = lines.length; i < len; i += 2) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    result.push(ANON + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
                }
            }

            return result;
        },

        // Safari 5-, IE 9-, and others
        other : function(curr) {
            var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
            while (curr && curr['arguments'] && stack.length < maxStackSize) {
                fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
                args = Array.prototype.slice.call(curr['arguments'] || []);
                stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
                curr = curr.caller;
            }
            return stack;
        },

        /**
         * Given arguments array as a String, subsituting type names for
         * non-string types.
         *
         * @param {Arguments} args
         * @return {Array} of Strings with stringified arguments
         */
        stringifyArguments : function(args) {
            var result = [];
            var slice = Array.prototype.slice;
            for ( var i = 0; i < args.length; ++i) {
                var arg = args[i];
                if (arg === undefined) {
                    result[i] = 'undefined';
                } else if (arg === null) {
                    result[i] = 'null';
                } else if (arg.constructor) {
                    if (arg.constructor === Array) {
                        if (arg.length < 3) {
                            result[i] = '[' + this.stringifyArguments(arg) + ']';
                        } else {
                            result[i] = '[' + this.stringifyArguments(slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(slice.call(arg, -1)) + ']';
                        }
                    } else if (arg.constructor === Object) {
                        result[i] = '#object';
                    } else if (arg.constructor === Function) {
                        result[i] = '#function';
                    } else if (arg.constructor === String) {
                        result[i] = '"' + arg + '"';
                    } else if (arg.constructor === Number) {
                        result[i] = arg;
                    }
                }
            }
            return result.join(',');
        },

        sourceCache : {},

        /**
         * @return the text from a given URL
         */
        ajax : function(url) {
            var req = this.createXMLHTTPObject();
            if (req) {
                try {
                    req.open('GET', url, false);
                    // req.overrideMimeType('text/plain');
                    // req.overrideMimeType('text/javascript');
                    req.send(null);
                    // return req.status == 200 ? req.responseText : '';
                    return req.responseText;
                } catch (e) {
                }
            }
            return '';
        },

        /**
         * Try XHR methods in order and store XHR factory.
         *
         * @return <Function> XHR function or equivalent
         */
        createXMLHTTPObject : function() {
            var xmlhttp, XMLHttpFactories = [ function() {
                return new XMLHttpRequest();
            }, function() {
                return new ActiveXObject('Msxml2.XMLHTTP');
            }, function() {
                return new ActiveXObject('Msxml3.XMLHTTP');
            }, function() {
                return new ActiveXObject('Microsoft.XMLHTTP');
            } ];
            for ( var i = 0; i < XMLHttpFactories.length; i++) {
                try {
                    xmlhttp = XMLHttpFactories[i]();
                    // Use memoization to cache the factory
                    this.createXMLHTTPObject = XMLHttpFactories[i];
                    return xmlhttp;
                } catch (e) {
                }
            }
        },

        /**
         * Given a URL, check if it is in the same domain (so we can get the
         * source via Ajax).
         *
         * @param url <String> source url
         * @return False if we need a cross-domain request
         */
        isSameDomain : function(url) {
            return typeof location !== "undefined" && url.indexOf(location.hostname) !== -1; // location
                                                                                                // may
                                                                                                // not
                                                                                                // be
                                                                                                // defined,
                                                                                                // e.g.
                                                                                                // when
                                                                                                // running
                                                                                                // from
                                                                                                // nodejs.
        },

        /**
         * Get source code from given URL if in the same domain.
         *
         * @param url <String> JS source URL
         * @return <Array> Array of source code lines
         */
        getSource : function(url) {
            // TODO reuse source from script tags?
            if (!(url in this.sourceCache)) {
                this.sourceCache[url] = this.ajax(url).split('\n');
            }
            return this.sourceCache[url];
        },

        guessAnonymousFunctions : function(stack) {
            for ( var i = 0; i < stack.length; ++i) {
                var reStack = /\{anonymous\}\(.*\)@(.*)/, reRef = /^(.*?)(?::(\d+))(?::(\d+))?(?: -- .+)?$/, frame = stack[i], ref = reStack.exec(frame);

                if (ref) {
                    var m = reRef.exec(ref[1]);
                    if (m) { // If falsey, we did not get any file/line
                                // information
                        var file = m[1], lineno = m[2], charno = m[3] || 0;
                        if (file && this.isSameDomain(file) && lineno) {
                            var functionName = this.guessAnonymousFunction(file, lineno, charno);
                            stack[i] = frame.replace('{anonymous}', functionName);
                        }
                    }
                }
            }
            return stack;
        },

        guessAnonymousFunction : function(url, lineNo, charNo) {
            var ret;
            try {
                ret = this.findFunctionName(this.getSource(url), lineNo);
            } catch (e) {
                ret = 'getSource failed with url: ' + url + ', exception: ' + e.toString();
            }
            return ret;
        },

        findFunctionName : function(source, lineNo) {
            // FIXME findFunctionName fails for compressed source
            // (more than one function on the same line)
            // TODO use captured args
            // function {name}({args}) m[1]=name m[2]=args
            var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
            // {name} = function ({args}) TODO args capture
            // /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
            var reFunctionExpression = /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function\b/;
            // {name} = eval()
            var reFunctionEvaluation = /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
            // Walk backwards in the source lines until we find
            // the line which matches one of the patterns above
            var code = "", line, maxLines = Math.min(lineNo, 20), m, commentPos;
            for ( var i = 0; i < maxLines; ++i) {
                // lineNo is 1-based, source[] is 0-based
                line = source[lineNo - i - 1];
                commentPos = line.indexOf('//');
                if (commentPos >= 0) {
                    line = line.substr(0, commentPos);
                }
                // TODO check other types of comments? Commented code may lead to false positive
                if (line) {
                    code = line + code;
                    m = reFunctionExpression.exec(code);
                    if (m && m[1]) {
                        return m[1];
                    }
                    m = reFunctionDeclaration.exec(code);
                    if (m && m[1]) {
                        //return m[1] + "(" + (m[2] || "") + ")";
                        return m[1];
                    }
                    m = reFunctionEvaluation.exec(code);
                    if (m && m[1]) {
                        return m[1];
                    }
                }
            }
            return '(?)';
        }
    };
    XML3D.debug.printStackTrace = printStackTrace;
}());(function (ns) {

    /**
     * @author mrdoob / http://mrdoob.com/
     */

    var EventDispatcher = function () {
    }

    EventDispatcher.prototype = {

        constructor: EventDispatcher,

        addEventListener: function (type, listener) {

            if (this._listeners === undefined) this._listeners = {};

            var listeners = this._listeners;

            if (listeners[ type ] === undefined) {

                listeners[ type ] = [];

            }

            if (listeners[ type ].indexOf(listener) === -1) {

                listeners[ type ].push(listener);

            }

        },

        hasEventListener: function (type, listener) {

            if (this._listeners === undefined) return false;

            var listeners = this._listeners;

            if (listeners[ type ] !== undefined && listeners[ type ].indexOf(listener) !== -1) {

                return true;

            }

            return false;

        },

        removeEventListener: function (type, listener) {

            if (this._listeners === undefined) return;

            var listeners = this._listeners;
            var index = listeners[ type ].indexOf(listener);

            if (index !== -1) {

                listeners[ type ].splice(index, 1);

            }

        },

        dispatchEvent: function (event) {

            if (this._listeners === undefined) return;

            var listeners = this._listeners;
            var listenerArray = listeners[ event.type ];

            if (listenerArray !== undefined) {

                event.target = this;

                for (var i = 0, l = listenerArray.length; i < l; i++) {

                    listenerArray[ i ].call(this, event);

                }

            }

        }

    };
    ns.EventDispatcher = EventDispatcher;

}(XML3D.util));(function (window) {

  var StateMachine = {

    //---------------------------------------------------------------------------

    VERSION: "2.2.0",

    //---------------------------------------------------------------------------

    Result: {
      SUCCEEDED:    1, // the event transitioned successfully from one state to another
      NOTRANSITION: 2, // the event was successfull but no state transition was necessary
      CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback
      ASYNC:        4 // the event is asynchronous and the caller is in control of when the transition occurs
    },

    Error: {
      INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
      PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
      INVALID_CALLBACK:   300 // caller provided callback function threw an exception
    },

    WILDCARD: '*',
    ASYNC: 'async',

    //---------------------------------------------------------------------------

    create: function(cfg, target) {

      var initial   = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
      var fsm       = target || cfg.target  || {};
      var events    = cfg.events || [];
      var callbacks = cfg.callbacks || {};
      var map       = {};

      var add = function(e) {
        var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
        map[e.name] = map[e.name] || {};
        for (var n = 0 ; n < from.length ; n++)
          map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
      };

      if (initial) {
        initial.event = initial.event || 'startup';
        add({ name: initial.event, from: 'none', to: initial.state });
      }

      for(var n = 0 ; n < events.length ; n++)
        add(events[n]);

      for(var name in map) {
        if (map.hasOwnProperty(name))
          fsm[name] = StateMachine.buildEvent(name, map[name]);
      }

      for(var name in callbacks) {
        if (callbacks.hasOwnProperty(name))
          fsm[name] = callbacks[name]
      }

      fsm.current = 'none';
      fsm.is      = function(state) { return this.current == state; };
      fsm.can     = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
      fsm.cannot  = function(event) { return !this.can(event); };
      fsm.error   = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)

      if (initial && !initial.defer)
        fsm[initial.event]();

      return fsm;

    },

    //===========================================================================

    doCallback: function(fsm, func, name, from, to, args) {
      if (func) {
        try {
          return func.apply(fsm, [name, from, to].concat(args));
        }
        catch(e) {
          return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
        }
      }
    },

    beforeEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
    afterEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
    leaveState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
    enterState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },
    changeState: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onchangestate'],                       name, from, to, args); },


    buildEvent: function(name, map) {
      return function() {

        var from  = this.current;
        var to    = map[from] || map[StateMachine.WILDCARD] || from;
        var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array

        if (this.transition)
          return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");

        if (this.cannot(name))
          return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);

        if (false === StateMachine.beforeEvent(this, name, from, to, args))
          return StateMachine.Result.CANCELLED;

        if (from === to) {
          StateMachine.afterEvent(this, name, from, to, args);
          return StateMachine.Result.NOTRANSITION;
        }

        // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
        var fsm = this;
        this.transition = function() {
          fsm.transition = null; // this method should only ever be called once
          fsm.current = to;
          StateMachine.enterState( fsm, name, from, to, args);
          StateMachine.changeState(fsm, name, from, to, args);
          StateMachine.afterEvent( fsm, name, from, to, args);
        };
        this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
          fsm.transition = null;
          StateMachine.afterEvent(fsm, name, from, to, args);
        }

        var leave = StateMachine.leaveState(this, name, from, to, args);
        if (false === leave) {
          this.transition = null;
          return StateMachine.Result.CANCELLED;
        }
        else if ("async" === leave) {
          return StateMachine.Result.ASYNC;
        }
        else {
          if (this.transition)
            this.transition(); // in case user manually called transition() but forgot to return ASYNC
          return StateMachine.Result.SUCCEEDED;
        }

      };
    }

  }; // StateMachine

  //===========================================================================

  /*if ("function" === typeof define) {
    define(function(require) { return StateMachine; });
  }
  else {*/
    window.StateMachine = StateMachine;
  /*}*/

}(this));

// Ported from Stefan Gustavson's java implementation
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.
//
// Sean McCullough banksean@gmail.com

/**
 * You can pass in a random number generator object if you like.
 * It is assumed to have a random() method.
 */
var SimplexNoise = function(r) {
	if (r == undefined) r = Math;
  this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0], 
                                 [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1], 
                                 [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]]; 
  this.p = [];
  for (var i=0; i<256; i++) {
	  this.p[i] = Math.floor(r.random()*256);
  }
  // To remove the need for index wrapping, double the permutation table length 
  this.perm = []; 
  for(var i=0; i<512; i++) {
		this.perm[i]=this.p[i & 255];
	} 

  // A lookup table to traverse the simplex around a given point in 4D. 
  // Details can be found where this table is used, in the 4D noise method. 
  this.simplex = [ 
    [0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0], 
    [0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0], 
    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0], 
    [1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0], 
    [1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0], 
    [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0], 
    [2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0], 
    [2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]; 
};

SimplexNoise.prototype.dot = function(g, x, y) { 
	return g[0]*x + g[1]*y;
};

SimplexNoise.prototype.noise = function(xin, yin) { 
  var n0, n1, n2; // Noise contributions from the three corners 
  // Skew the input space to determine which simplex cell we're in 
  var F2 = 0.5*(Math.sqrt(3.0)-1.0); 
  var s = (xin+yin)*F2; // Hairy factor for 2D 
  var i = Math.floor(xin+s); 
  var j = Math.floor(yin+s); 
  var G2 = (3.0-Math.sqrt(3.0))/6.0; 
  var t = (i+j)*G2; 
  var X0 = i-t; // Unskew the cell origin back to (x,y) space 
  var Y0 = j-t; 
  var x0 = xin-X0; // The x,y distances from the cell origin 
  var y0 = yin-Y0; 
  // For the 2D case, the simplex shape is an equilateral triangle. 
  // Determine which simplex we are in. 
  var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords 
  if(x0>y0) {i1=1; j1=0;} // lower triangle, XY order: (0,0)->(1,0)->(1,1) 
  else {i1=0; j1=1;}      // upper triangle, YX order: (0,0)->(0,1)->(1,1) 
  // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and 
  // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where 
  // c = (3-sqrt(3))/6 
  var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords 
  var y1 = y0 - j1 + G2; 
  var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords 
  var y2 = y0 - 1.0 + 2.0 * G2; 
  // Work out the hashed gradient indices of the three simplex corners 
  var ii = i & 255; 
  var jj = j & 255; 
  var gi0 = this.perm[ii+this.perm[jj]] % 12; 
  var gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12; 
  var gi2 = this.perm[ii+1+this.perm[jj+1]] % 12; 
  // Calculate the contribution from the three corners 
  var t0 = 0.5 - x0*x0-y0*y0; 
  if(t0<0) n0 = 0.0; 
  else { 
    t0 *= t0; 
    n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);  // (x,y) of grad3 used for 2D gradient 
  } 
  var t1 = 0.5 - x1*x1-y1*y1; 
  if(t1<0) n1 = 0.0; 
  else { 
    t1 *= t1; 
    n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1); 
  }
  var t2 = 0.5 - x2*x2-y2*y2; 
  if(t2<0) n2 = 0.0; 
  else { 
    t2 *= t2; 
    n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2); 
  } 
  // Add contributions from each corner to get the final noise value. 
  // The result is scaled to return values in the interval [-1,1]. 
  return 70.0 * (n0 + n1 + n2); 
};

// 3D simplex noise 
SimplexNoise.prototype.noise3d = function(xin, yin, zin) { 
  var n0, n1, n2, n3; // Noise contributions from the four corners 
  // Skew the input space to determine which simplex cell we're in 
  var F3 = 1.0/3.0; 
  var s = (xin+yin+zin)*F3; // Very nice and simple skew factor for 3D 
  var i = Math.floor(xin+s); 
  var j = Math.floor(yin+s); 
  var k = Math.floor(zin+s); 
  var G3 = 1.0/6.0; // Very nice and simple unskew factor, too 
  var t = (i+j+k)*G3; 
  var X0 = i-t; // Unskew the cell origin back to (x,y,z) space 
  var Y0 = j-t; 
  var Z0 = k-t; 
  var x0 = xin-X0; // The x,y,z distances from the cell origin 
  var y0 = yin-Y0; 
  var z0 = zin-Z0; 
  // For the 3D case, the simplex shape is a slightly irregular tetrahedron. 
  // Determine which simplex we are in. 
  var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords 
  var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords 
  if(x0>=y0) { 
    if(y0>=z0) 
      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order 
      else if(x0>=z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order 
      else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } // Z X Y order 
    } 
  else { // x0<y0 
    if(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order 
    else if(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order 
    else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order 
  } 
  // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z), 
  // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and 
  // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where 
  // c = 1/6.
  var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords 
  var y1 = y0 - j1 + G3; 
  var z1 = z0 - k1 + G3; 
  var x2 = x0 - i2 + 2.0*G3; // Offsets for third corner in (x,y,z) coords 
  var y2 = y0 - j2 + 2.0*G3; 
  var z2 = z0 - k2 + 2.0*G3; 
  var x3 = x0 - 1.0 + 3.0*G3; // Offsets for last corner in (x,y,z) coords 
  var y3 = y0 - 1.0 + 3.0*G3; 
  var z3 = z0 - 1.0 + 3.0*G3; 
  // Work out the hashed gradient indices of the four simplex corners 
  var ii = i & 255; 
  var jj = j & 255; 
  var kk = k & 255; 
  var gi0 = this.perm[ii+this.perm[jj+this.perm[kk]]] % 12; 
  var gi1 = this.perm[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]] % 12; 
  var gi2 = this.perm[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]] % 12; 
  var gi3 = this.perm[ii+1+this.perm[jj+1+this.perm[kk+1]]] % 12; 
  // Calculate the contribution from the four corners 
  var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0; 
  if(t0<0) n0 = 0.0; 
  else { 
    t0 *= t0; 
    n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0); 
  }
  var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1; 
  if(t1<0) n1 = 0.0; 
  else { 
    t1 *= t1; 
    n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1); 
  } 
  var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2; 
  if(t2<0) n2 = 0.0; 
  else { 
    t2 *= t2; 
    n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2); 
  } 
  var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3; 
  if(t3<0) n3 = 0.0; 
  else { 
    t3 *= t3; 
    n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3); 
  } 
  // Add contributions from each corner to get the final noise value. 
  // The result is scaled to stay just inside [-1,1] 
  return 32.0*(n0 + n1 + n2 + n3); 
};(function (math) {

    /**
     * @class An axis aligned bounding box in the style of glMatrix
     * @name bbox
     */
    var bbox = {};

    /**
     * Creates a new, empty bounding box
     *
     * @returns {bbox} a new empty bounding box
     */
    bbox.create = function () {
        var out = new Float32Array(6);
        out[0] = Number.MAX_VALUE;
        out[1] = Number.MAX_VALUE;
        out[2] = Number.MAX_VALUE;
        out[3] = -Number.MAX_VALUE;
        out[4] = -Number.MAX_VALUE;
        out[5] = -Number.MAX_VALUE;
        return out;
    };

    bbox.clone = function (a) {
        var out = new Float32Array(6);
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[4] = a[4];
        out[5] = a[5];
        return out;
    };

    bbox.copy = function (out, a) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[4] = a[4];
        out[5] = a[5];
        return out;
    };

    bbox.copyMin = function (target, source) {
        target[0] = source[0];
        target[1] = source[1];
        target[2] = source[2];
        return target;
    };

    bbox.copyMax = function (target, source) {
        target[0] = source[3];
        target[1] = source[4];
        target[2] = source[5];
        return target;
    };

    bbox.extendWithBox = function (target, other) {
        for (var i = 0; i < 3; i++) {
            target[i] = Math.min(other[i], target[i]);
            target[i + 3] = Math.max(other[i + 3], target[i + 3]);
        }
        return target;
    };

    bbox.empty = function (b) {
        b[0] = Number.MAX_VALUE;
        b[1] = Number.MAX_VALUE;
        b[2] = Number.MAX_VALUE;
        b[3] = -Number.MAX_VALUE;
        b[4] = -Number.MAX_VALUE;
        b[5] = -Number.MAX_VALUE;
        return b;
    };

    bbox.isEmpty = function (b) {
        return (b[0] > b[3] || b[1] > b[4] || b[2] > b[5]);
    };

    bbox.center = function (target, b) {
        target[0] = (b[0] + b[3]) * 0.5;
        target[1] = (b[1] + b[4]) * 0.5;
        target[2] = (b[2] + b[5]) * 0.5;
        return target;
    }

    bbox.size = function (target, b) {
        target[0] = b[3] - b[0];
        target[1] = b[4] - b[1];
        target[2] = b[5] - b[2];
        return target;
    };

    bbox.halfSize = function (target, b) {
        target[0] = (b[3] - b[0]) * 0.5;
        target[1] = (b[4] - b[1]) * 0.5;
        target[2] = (b[5] - b[2]) * 0.5;
        return target;
    };

    bbox.transform = function (out, mat, box) {
        if (box[0] > box[3] || box[1] > box[4] || box[2] > box[5]) {
            bbox.copy(out, box); // an empty box remains empty
            return;
        }
        box = bbox.clone(box);

        if (mat[3] == 0 && mat[7] == 0 && mat[11] == 0 && mat[15] == 1) {

            for (var i = 0; i < 3; i++) {
                out[i] = out[i + 3] = mat[12 + i];

                for (var j = 0; j < 3; j++) {
                    var a, b;

                    a = mat[j * 4 + i] * box[j];
                    b = mat[j * 4 + i] * box[j + 3];

                    if (a < b) {
                        out[i] += a;
                        out[i + 3] += b;
                    }
                    else {
                        out[i] += b;
                        out[i + 3] += a;
                    }
                }
            }
            return out;
        }
        throw new Error("Matrix is not affine");
    };

    bbox.transform2 = (function () {
        var absMat = XML3D.math.mat4.create();
        var center = XML3D.math.vec3.create();
        var extend = XML3D.math.vec3.create();

        return function (out, mat, box) {

            bbox.center(center, box);
            bbox.halfSize(extend, box);

            XML3D.math.mat4.copy(absMat, mat);
            absMat.set([0, 0, 0, 1], 12);
            for (var i = 0; i < 16; i++) {
                absMat[i] = Math.abs(absMat[i]);
            }

            XML3D.math.vec3.transformMat4(extend, extend, absMat);
            XML3D.math.vec3.transformMat4(center, center, mat);

            out[0] = center[0] - extend[0];
            out[1] = center[1] - extend[1];
            out[2] = center[2] - extend[2];
            out[3] = center[0] + extend[0];
            out[4] = center[1] + extend[1];
            out[5] = center[2] + extend[2];

            return out;
        }
    }());

    bbox.longestSide = function (b) {
        var x = Math.abs(b[3] - b[0]);
        var y = Math.abs(b[4] - b[1]);
        var z = Math.abs(b[5] - b[2]);
        return Math.max(x, Math.max(y, z));
    };

    bbox.asXML3DBox = function (bb) {
        var result = new window.XML3DBox();
        result.min._data[0] = bb[0];
        result.min._data[1] = bb[1];
        result.min._data[2] = bb[2];
        result.max._data[0] = bb[3];
        result.max._data[1] = bb[4];
        result.max._data[2] = bb[5];
        return result;
    };

    bbox.str = function (a) {
        return 'bbox(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
            a[4] + ', ' + a[5] + ')';
    };


    math.bbox = bbox;
    math.EMPTY_BOX = bbox.create();


}(XML3D.math)
    )
;
// XML3DVec3

(function($) {
    // Is native?
    if($) return;

    /**
     * Configure array properties
     *  @private
     *  @this {XML3DVec3}
     *  @param {number} index Array index
     */
    function prop(index) {
        return {
            get : function() {
                return this._data[index];
            },
            set : function(val) {
                this._data[index] = val;
                // Value changed
                if (this._callback)
                    this._callback(this);
        },
        configurable : false,
        enumerable : false
        };
    };

    /**
     * Creates an instance of XML3DVec3. XML3DVec3 represents a
     * three-dimensional vector as a 3-tuple floating point values.
     * @constructor
     * @this {XML3DVec3}
     * @param {number=} x The x value (optional). Default: 0.
     * @param {number=} y The y value (optional). Default: 0.
     * @param {number=} z The z value (optional). Default: 0.
     * @param {function(XML3DVec3=)=} cb Called, if value has changed.
     *                                Has this as first parameter.
     */
    var XML3DVec3 = function(x, y, z, cb) {
        /** @private */
        this._data = new Float32Array(3);

        if(x !== undefined && x !== null) {
            this.set(x,y,z);
        }

        this._callback = typeof cb == 'function' ? cb : 0;

    }, p = XML3DVec3.prototype;

    /**
     * The set method copies the values from other.
     * @param {Object|number} other another XML3DVec3, Float32Array or a number. In the last case the other args are considered, too.
     * @param {number=} y
     * @param {number=} z
     */
    p.set = function(other,y,z) {
        if(other.length && other.length >= 3) {
            this._data[0] = other[0];
            this._data[1] = other[1];
            this._data[2] = other[2];
        }
        else if(other._data && other._data.length && other._data.length === 3) {
            this._data[0] = other._data[0];
            this._data[1] = other._data[1];
            this._data[2] = other._data[2];
        } else if(arguments.length == 3) {
            this._data[0] = other;
            this._data[1] = y;
            this._data[2] = z;
        }
        if (this._callback)
            this._callback(this);
    };

    /** @type {number} */
    Object.defineProperty(p, "x", prop(0));
    /** @type {number} */
    Object.defineProperty(p, "y", prop(1));
    /** @type {number} */
    Object.defineProperty(p, "z", prop(2));

    /**
     * String representation of the XML3DVec3.
     * @override
     * @this {XML3DVec3}
     * @return {string} Human-readable representation of this XML3DVec3.
     */
    p.toString = function() {
        return "[object XML3DVec3]";
    };

    /**
     * Returns the component-wise addition of this vector with a second vector
     * passed as parameter. Result is a newly created vector. This is not
     * modified.
     * @param {XML3DVec3} that The vector to add
     * @return {XML3DVec3} The new vector with the result of the addition
     */
    p.add = function(that) {
        if (that._data)
            return new XML3DVec3(this._data[0] + that._data[0], this._data[1]
                    + that._data[1], this._data[2] + that._data[2]);
        return new XML3DVec3(this._data[0] + that.x, this._data[1] + that.y,
                this._data[2] + that.z);
    };

    /**
     * Returns the component-wise subtraction of this vector with a second
     * vector passed as parameter. Result is a newly created vector. This is not
     * modified.
     * @param {XML3DVec3} that The vector to subtract
     * @return {XML3DVec3} The new vector with the result of the subtraction
     */
    p.subtract = function(that) {
        if (that._data)
            return new XML3DVec3(this._data[0] - that._data[0], this._data[1]
                    - that._data[1], this._data[2] - that._data[2]);
        return new XML3DVec3(this._data[0] - that.x, this._data[1] - that.y,
                this._data[2] - that.z);
    };

    /**
     * Returns the length of this vector.
     * @return {number} The length of this vector
     */
    p.length = function() {
        return Math.sqrt((this._data[0] * this._data[0])
                + (this._data[1] * this._data[1])
                + (this._data[2] * this._data[2]));
    };

    /**
     * The setVec3Value method replaces the existing vector with one computed
     * from parsing the passed string.
     * @param {string} str The string to parse
     * @throws {Error} If passed string can not be parsed
     */
    p.setVec3Value = function(str) {
        var m = /^\s*(\S+)\s+(\S+)\s+(\S+)\s*$/.exec(str);
        if (!m) // TODO Throw DOMException
            throw Error("Wrong format for XML3DVec3::setVec3Value");
        this._data[0] = +m[1];
        this._data[1] = +m[2];
        this._data[2] = +m[3];
        if (this._callback)
            this._callback(this);
    };

    /**
     * Returns the component-wise multiplication of this vector with a second
     * vector passed as parameter. Result is a newly created vector. This is not
     * modified.
     * @param {XML3DVec3} that The vector to multiply
     * @return {XML3DVec3} The new vector with the result of the multiplication
     */
    p.multiply = function(that) {
        if (that._data)
            return new XML3DVec3(this._data[0] * that._data[0], this._data[1]
                    * that._data[1], this._data[2] * that._data[2]);
        return new XML3DVec3(this._data[0] * that.x, this._data[1] * that.y,
                this._data[2] * that.z);
    };

    /**
     * Returns the component-wise multiplication of this vector with a factor
     * passed as parameter. Result is a newly created vector. This is not
     * modified.
     * @param {number} fac The factor for the multiplication
     * @return {XML3DVec3} The new and scaled vector
     */
    p.scale = function(fac) {
        return new XML3DVec3(this._data[0] * fac, this._data[1] * fac,
                this._data[2] * fac);
    };

    /**
     * Returns the cross product of this vector with a second vector passed as
     * parameter. Result is a newly created vector. This is not modified.
     * @param {XML3DVec3} that The second vector
     * @return {XML3DVec3} The new vector with the result of the cross product
     */
    p.cross = function(that) {
        if (that._data)
            return new XML3DVec3(this._data[1] * that._data[2] - this._data[2]
                    * that._data[1], this._data[2] * that._data[0]
                    - this._data[0] * that._data[2], this._data[0]
                    * that._data[1] - this._data[1] * that._data[0]);

        return new XML3DVec3(this._data[1] * that.z - this._data[2] * that.y,
                this._data[2] * that.x - this._data[0] * that.z, this._data[0]
                        * that.y - this._data[1] * that.x);
    };

    /**
     * Returns the component wise multiplication by -1 of this vector. Result is
     * a newly created vector. This is not modified.
     * @return {XML3DVec3} The new and negated vector
     */
    p.negate = function() {
        return new XML3DVec3(-this._data[0], -this._data[1], -this._data[2]);
    };

    /**
     * Returns the dot product of this vector with a second vector passed as
     * parameter. This is not modified.
     * @param {XML3DVec3} that The second vector
     * @return {number} The result of the dot product
     */
    p.dot = function(that) {
        return (this._data[0] * that.x + this._data[1] * that.y + this._data[2]
                * that.z);
    };

    /**
     * Returns the normalized version of this vector. Result is a newly created
     * vector. This is not modified.
     * @return {XML3DVec3} The new and normalized vector
     * @throws {Error} If length of this vector is zero
     */
    p.normalize = function() {
        var n = this.length();
        if (n)
            n = 1.0 / n;
        else
            throw new Error();

        return new XML3DVec3(this._data[0] * n, this._data[1] * n,
                this._data[2] * n);
    };

    XML3D.XML3DVec3 = XML3DVec3;
    window.XML3DVec3 = XML3DVec3;

}(XML3D._native));
// rotation.js
(function(isNative) {

    if(isNative) return;

    function orthogonal(v) {
        if ((Math.abs(v._data[1]) >= 0.9*Math.abs(v._data[0])) && (Math.abs(v._data[2]) >= 0.9*Math.abs(v._data[0])))
            return new window.XML3DVec3(0.0, -v._data[2], v._data[1]);
          else
            if ((Math.abs(v._data[0]) >= 0.9*Math.abs(v._data[1])) && (Math.abs(v._data[2]) >= 0.9*Math.abs(v._data[1])))
              return new window.XML3DVec3(-v._data[2], 0.0, v._data[0]);
            else
              return new window.XML3DVec3(-v._data[1], v._data[0], 0.0);
    }

    /**
     * Creates an instance of XML3DRotation. XML3DRotation represents a
     * three-dimensional vector as a 3-tuple floating point values.
     * @constructor
     * @this {XML3DRotation}
     * @param {XML3DVec3=} axis
     * @param {number=} angle
     * @param {function(XML3DVec3=)=} cb Called, if value has changed.
     *                                   Has this as first parameter.
     */
    var XML3DRotation = function(axis, angle, cb) {
        var that = this;
        this._data = new Float32Array(4);

        var vec_cb = function() {
            that._updateQuaternion();
            if (that._callback)
                that._callback(that);
        };

        /** @private */
        this._axis = new window.XML3DVec3(0, 0, 1, vec_cb);
        /** @private */
        this._angle = 0;

        this._updateQuaternion();

        if(axis !== undefined && axis !== null) {
            this.set(axis, angle);
        }

        /** @private */
        this._callback = typeof cb == 'function' ? cb : 0;
    };

    var p = XML3DRotation.prototype;

    /**
     * The set method copies the values from other.
     * @param {Object} other another XML3DRotation, Float32Array or XML3DVec3. In the last case the 2nd argument is considered.
     * @param {number=} angle
     */
    p.set = function(other, angle) {
        if(other.axis && other.angle !== undefined) {
            this.setAxisAngle(other.axis, other.angle);
        } else if(other.length && other.length >= 4) {
            this._setQuaternion(other);
        } else if(other._data && other._data.length && other._data.length === 3) {
            this.setAxisAngle(other, angle);
        } else {
            XML3D.debug.logError("XML3DRotation.set(): invalid argument given. Expect XML3DRotation or Float32Array.");
        }
    };

    /** @type {number} */
    Object.defineProperty(p, "axis", {
        /** @this {XML3DRotation} * */
        get : function() {
            return this._axis;
        },
        set : function() {
            throw Error("Can't set axis. XML3DRotation::axis is readonly.");
        },
        configurable : false,
        enumerable : false
    });

    /** @type {number} */
    Object.defineProperty(p, "angle", {
        /** @this {XML3DRotation} * */
        get : function() {
            return this._angle;
        },
        set : function(angle) {
            this._angle = angle;
            this._updateQuaternion();
            if (this._callback)
                this._callback(this);
    },
    configurable : false,
    enumerable : false
    });

    /**
     * String representation of the XML3DRotation.
     * @override
     * @this {XML3DRotation}
     * @return {string} Human-readable representation of this XML3DRotation.
     */
    p.toString = function() {
        return "[object XML3DRotation]";
    };

    /**
     * Replaces the existing rotation with the axis-angle representation passed
     * as argument
     */
    p.setAxisAngle = function(axis, angle) {
        if (typeof axis != 'object' || isNaN(angle)) {
            throw new Error("Illegal axis and/or angle values: " + "( axis="
                    + axis + " angle=" + angle + " )");
        }

        // TODO: slice?
        this._axis._data[0] = axis._data[0];
        this._axis._data[1] = axis._data[1];
        this._axis._data[2] = axis._data[2];
        this._angle = angle;
        this._updateQuaternion();
        if (this._callback)
            this._callback(this);
    };

    /**
     * Replaces the existing rotation with one computed from the two vectors
     * passed as arguments. {XML3DVec} from First vector {XML3DVec} from Second
     * vector
     */
    p.setRotation = function(from, to) {
        var a = from.normalize();
        var b = to.normalize();

        var axis = a.cross(b);
        if (!axis.length()) {
            // from and to are parallel
            axis = orthogonal(a);
        };
        // This function will also callback
        this.setAxisAngle(axis, Math.acos(a.dot(b)));
    };

    p._updateQuaternion = function() {
        var l = this._axis.length();
        if (l > 0.00001) {
            var s = Math.sin(this._angle / 2) / l;
            this._data[0] = this._axis.x * s;
            this._data[1] = this._axis.y * s;
            this._data[2] = this._axis.z * s;
            this._data[3] = Math.cos(this._angle / 2);
        } else {
            XML3D.math.quat.set(this._data, 0, 0, 0, 1);
        }
    };

    /**
     * Replaces the existing matrix with one computed from parsing the passed
     * string.
     * @param str String to parse
     */
    p.setAxisAngleValue = function(str) {
        var m = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/.exec(str);
        if (!m)
            throw new Error("Could not parse AxisAngle string: " + str);

        // This function will also callback
        this.setAxisAngle(new window.XML3DVec3(+m[1], +m[2], +m[3]), +m[4]);
    };

    /**
     * Linear interpolation of this rotation rot0 with the passed rotation rot1
     * with factor t. The result is (1-t)rot0 + t rot1. Typically realized with
     * a spherical linear interpolation based on quaternions.
     * @param {XML3DRotation} rot1 the passed rotation
     * @param {number} t the factor
     */
    p.interpolate = function(rot1, t) {
        var dest = XML3D.math.quat.create(), result = new XML3DRotation();
        XML3D.math.quat.slerp(dest, this._data, rot1._data, t);
        result._setQuaternion(dest);
        return result;
    };

    /**
     * Replaces the existing rotation with the quaternion representation passed
     * as argument
     * @param {XML3DVec3} vector
     * @param {number} w
     */
    p.setQuaternion = function(vector, scalar) {
        this._setQuaternion( [ vector.x, vector.y, vector.z, scalar ]);
    };

    /**
     * Returns a XML3DMatrix that describes this 3D rotation in a
     * 4x4 matrix representation.
     * @return {XML3DMatrix} Rotation matrix
     */
    p.toMatrix = function() {
        var q = XML3D.math.quat.copy(XML3D.math.quat.create(), this._data);
        var m = new window.XML3DMatrix();
        XML3D.math.mat4.fromRotationTranslation(m._data, q, [0, 0, 0]);
        return m;
    };

    /**
     * Rotates the vector passed as parameter with this rotation
     * representation. The result is returned as new vector instance.
     * Neither this nor the inputVector are changed.
     * 4x4 matrix representation.
     * @param {XML3DVec3} inputVector
     * @return {XML3DVec3} The rotated vector
     */
    p.rotateVec3 = function(inputVector) {
        var result = new window.XML3DVec3();
        XML3D.math.vec3.transformQuat(result._data, inputVector._data, this._data)
        return result;
    };

    /**
     * Replaces the existing rotation with the quaternion representation passed
     * as argument
     * @private
     * @param {Array} quat
     */
    p._setQuaternion = function(q) {
        var s = Math.sqrt(1 - q[3] * q[3]);
        if (s < 0.001 || isNaN(s)) {
            this._axis._data[0] = 0;
            this._axis._data[1] = 0;
            this._axis._data[2] = 1;
            this._angle = 0;
        } else {
            s = 1 / s;
            this._axis._data[0] = q[0] * s;
            this._axis._data[1] = q[1] * s;
            this._axis._data[2] = q[2] * s;
            this._angle = 2 * Math.acos(q[3]);
        }
        this._data = XML3D.math.quat.copy(XML3D.math.quat.create(), q);
        if (this._callback)
            this._callback(this);
    };

    /**
     * Multiplies this rotation with the passed rotation. This rotation is not
     * changed.
     *
     * @param {XML3DRotation} rot1
     * @return {XML3DVec3} The result
     */
    p.multiply = function(rot1) {
        var result = new XML3DRotation(), q = XML3D.math.quat.create();
        XML3D.math.quat.multiply(q, this._data, rot1._data);
        result._setQuaternion(q);
        return result;
    };

    /**
     * Returns the normalized version of this rotation. Result is a newly
     * created vector. This is not modified.
     */
    p.normalize = function(that) {
        var na = this._axis.normalize();
        return new XML3DRotation(na, this._angle);
    };

    /**
     * Returns the quaternion, that underlies this rotation.
     *
     * @return {Float32Array}
     */
    p.getQuaternion = function() {
        return XML3D.math.quat.copy(XML3D.math.quat.create(), this._data);
    };

    /**
     * Set this rotation based on the given base vectors.
     *
     * @param {XML3DVec3} xAxis
     * @param {XML3DVec3} yAxis
     * @param {XML3DVec3} zAxis
     */
    p.setFromBasis = function(xAxis, yAxis, zAxis) {
        var q = XML3D.math.quat.create();
        XML3D.math.quat.setFromBasis(xAxis._data, yAxis._data, zAxis._data, q);
        this._setQuaternion(q);
    };

    XML3D.XML3DRotation = XML3DRotation;
    window.XML3DRotation = XML3DRotation;

}(XML3D._native));
// box.js
(function($) {
    // Is native?
    if($) return;

    /**
     * Creates an instance of XML3DBox. XML3DBox represents an axis-aligned box,
     * described by two vectors min and max.
     * @constructor
     * @param {XML3DVec3=} min The smaller point of the box. Default: (0,0,0)
     * @param {XML3DVec3=} max The biggest point of the box. Default: (0,0,0) 
     */
    var XML3DBox = function(min, max, cb) {
        var that = this;

        /** anonymous callback to inform this instance * */
        var vec_cb = function() {
            if (that._callback)
                that._callback(that);
        };

        /**
         * @private
         * @type {XML3DVec3}
         */
        this._min = new window.XML3DVec3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, vec_cb);
        /**
         * @private
         * @type {XML3DVec3}
         */
        this._max = new window.XML3DVec3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, vec_cb);

        // Copy constructor
        if (min && min.min) {
            this._min.set(min.min);
            this._max.set(min.max);
        } else {
            if (min)
                this._min.set(min);
            if (max)
                this._max.set(max);
        }

        /** @private * */
        this._callback = typeof cb == 'function' ? cb : 0;

    };

    /** @type {XML3DVec3} */
    Object.defineProperty(XML3DBox.prototype, "min", {
        /** @this {XML3DBox} **/
        get : function() { return this._min; },
        set : function() { throw Error("XML3DBox::min is readonly."); },
        configurable : false,
        enumerable : false
    });

    /** @type {XML3DVec3} */
    Object.defineProperty(XML3DBox.prototype, "max", {
        /** @this {XML3DBox} **/
        get : function() { return this._max; },
        set : function() { throw Error("XML3DBox::max is readonly."); },
        configurable : false,
        enumerable : false
    });

    /**
     * Calculates the size of the Box in each dimension
     * @return {XML3DVec3} Size of the Box
     */
    XML3DBox.prototype.size = function() {
        var v = this._max.subtract(this._min);
        if (v.x < 0)
            v.x = 0;
        if (v.y < 0)
            v.y = 0;
        if (v.z < 0)
            v.z = 0;

        return v;
    };

    /**
     * Calculates the center of the Box
     * @returns {XML3DVec3} that is the center of the box
     */
    XML3DBox.prototype.center = function() {
        return this._min.add(this._max).scale(0.5);
    };

    /**
     * Set Box empty Sets min's components to Number.MAX_VALUE and max'
     * components to -Number.MAX_VALUE.
     */
    XML3DBox.prototype.makeEmpty = function() {
        this._min = new window.XML3DVec3(Number.MAX_VALUE, Number.MAX_VALUE,
                Number.MAX_VALUE);
        this._max = new window.XML3DVec3(-Number.MAX_VALUE, -Number.MAX_VALUE,
                -Number.MAX_VALUE);
        if (this._callback)
            this._callback(this);
    };

    /**
     * Test, if this Box is empty
     * @returns {boolean} 'true', if box is empty
     */
    XML3DBox.prototype.isEmpty = function() {
        return (this._min.x > this._max.x || this._min.y > this._max.y || this._min.z > this._max.z);
    };
    
    /**
     * String representation of the XML3DBox.
     * @override
     * @return {string} Human-readable representation of this XML3DBox.
     */
    XML3DBox.prototype.toString = function() {
        return "[object XML3DBox]";
    };

    /**
     * The set method copies the values from other.
     * @param {XML3DBox} other The other box
     */
    XML3DBox.prototype.set = function(other) {
        this._min.set(other.min);
        this._max.set(other.max);
        if (this._callback)
            this._callback(this);
    };
    
    /** updates the min or max accoring to the given point or bounding box. 
    * 
    * @param that the object used for extension, which can be a XML3DVec3 or XML3DBox
    */
    XML3DBox.prototype.extend = function(that)
    {
        if (!that)
            return;

        var min, max;
        if(that.constructor === window.XML3DBox)
        {
            min = that.min;
            max = that.max;
        }
        else if(that.constructor === window.XML3DVec3)
        {
            min = that;
            max = that;
        }
        else
            return;

        if(min.x < this._min.x)
            this._min.x = min.x;
        if(min.y < this._min.y)
            this._min.y = min.y;
        if(min.z < this._min.z)
            this._min.z = min.z;

        if(max.x > this._max.x)
            this._max.x = max.x;
        if(max.y > this._max.y)
            this._max.y = max.y;
        if(max.z > this._max.z)
            this._max.z = max.z;
    };

    // Export
    XML3D.XML3DBox = XML3DBox;
    window.XML3DBox = XML3DBox;

}(XML3D._native));
// matrix.js
(function(isNative) {

    if(isNative) return;

    /**
     * Configure array properties
     * @private
     * @this {XML3DMatrix}
     * @param {number} index Array index
     */
    function prop(index) {
        return {
            get : function() {
                return this._data[index];
            },
            set : function(val) {
                this._data[index] = val;
                if (this._callback)
                    this._callback(this);
            },
            configurable : false,
            enumerable : false
        };
    }
    ;

    /**
     * Creates an instance of XML3DMatrix. XML3DMatrix represents a represents a
     * 4x4 homogeneous matrix.
     * @constructor
     * @param {number=} m11 Represents the value in the 1st column of the 1st
     *            row.
     * @param {number=} m12 Represents the value in the 2st column of the 1st
     *            row.
     * @param {number=} m13 Represents the value in the 3st column of the 1st
     *            row.
     * @param {number=} m14 Represents the value in the 4st column of the 1st
     *            row.
     * @param {number=} m21 Represents the value in the 1st column of the 2st
     *            row.
     * @param {number=} m22 Represents the value in the 2st column of the 2st
     *            row.
     * @param {number=} m23 Represents the value in the 3st column of the 2st
     *            row.
     * @param {number=} m24 Represents the value in the 4st column of the 2st
     *            row.
     * @param {number=} m31 Represents the value in the 1st column of the 3st
     *            row.
     * @param {number=} m32 Represents the value in the 2st column of the 3st
     *            row.
     * @param {number=} m33 Represents the value in the 3st column of the 3st
     *            row.
     * @param {number=} m34 Represents the value in the 4st column of the 3st
     *            row.
     * @param {number=} m41 Represents the value in the 1st column of the 4st
     *            row.
     * @param {number=} m42 Represents the value in the 2st column of the 4st
     *            row.
     * @param {number=} m43 Represents the value in the 3st column of the 4st
     *            row.
     * @param {number=} m44 Represents the value in the 4st column of the 4st
     *            row.
     */
    var XML3DMatrix = function(m11, m12, m13, m14, m21, m22, m23, m24, m31,
            m32, m33, m34, m41, m42, m43, m44, cb) {
        /** @private */
        if (typeof m11 == 'number' && arguments.length >= 16) {
            this.set(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44);
            this._callback = typeof cb == 'function' ? cb : 0;
        } else if (typeof m11 == 'object' && arguments.length == 1) {
            this.set(m11);
        } else{
            this._data = new Float32Array( [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
                    0, 0, 0, 0, 1 ]);
            this._callback = typeof m11 == 'function' ? m11 : 0;
        }
    };
    var p = XML3DMatrix.prototype;

    /** @type {number} */
    Object.defineProperty(p, "m11", prop(0));
    /** @type {number} */
    Object.defineProperty(p, "m12", prop(1));
    /** @type {number} */
    Object.defineProperty(p, "m13", prop(2));
    /** @type {number} */
    Object.defineProperty(p, "m14", prop(3));
    /** @type {number} */
    Object.defineProperty(p, "m21", prop(4));
    /** @type {number} */
    Object.defineProperty(p, "m22", prop(5));
    /** @type {number} */
    Object.defineProperty(p, "m23", prop(6));
    /** @type {number} */
    Object.defineProperty(p, "m24", prop(7));
    /** @type {number} */
    Object.defineProperty(p, "m31", prop(8));
    /** @type {number} */
    Object.defineProperty(p, "m32", prop(9));
    /** @type {number} */
    Object.defineProperty(p, "m33", prop(10));
    /** @type {number} */
    Object.defineProperty(p, "m34", prop(11));
    /** @type {number} */
    Object.defineProperty(p, "m41", prop(12));
    /** @type {number} */
    Object.defineProperty(p, "m42", prop(13));
    /** @type {number} */
    Object.defineProperty(p, "m43", prop(14));
    /** @type {number} */
    Object.defineProperty(p, "m44", prop(15));

    /**
     * Set the value of the matrix.
     *
     * @param {Object} m11 another XML3DMatrix, Float32Array or a number. In the last case the remaining arguments are considered.
     * @param {number=} m12
     * @param {number=} m13
     * @param {number=} m14
     * @param {number=} m21
     * @param {number=} m22
     * @param {number=} m23
     * @param {number=} m24
     * @param {number=} m31
     * @param {number=} m32
     * @param {number=} m33
     * @param {number=} m34
     * @param {number=} m41
     * @param {number=} m42
     * @param {number=} m43
     * @param {number=} m44
     */
    p.set = function(m11, m12, m13, m14, m21, m22, m23, m24, m31,
            m32, m33, m34, m41, m42, m43, m44) {

        if (typeof m11 == 'number' && arguments.length >= 16) {
            this._data = new Float32Array(arguments);
            return;
        }

        if(m11._data && m11._data.length && m11._data.length === 16) {
            this._data = new Float32Array(m11._data);
            return;
        }

        if(m11.length && m11.length >= 16) {
            this._data = new Float32Array(m11);
            return;
        }

        XML3D.debug.logError("XML3DMatrix.set(): invalid parameter(s). Expect XML3DMatrix, Float32Array or 16 numbers.");
    };

    /**
     * String representation of the XML3DBox.
     * @override
     * @return {string} Human-readable representation of this XML3DBox.
     */
    p.toString = function() {
        return "[object XML3DMatrix]";
    };

    p.setMatrixValue = function(str) {
        var m = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/
                .exec(str);

        if (!m)
            throw {
                code : DOMException.SYNTAX_ERR,
                message : "SYNTAX_ERR: DOM Exception 12"
            };

        if (m.length != 17) // m[0] is the whole string, the rest is the actual
            // result
            throw {
                code : DOMException.SYNTAX_ERR,
                message : "Illegal number of elements: " + (m.length - 1)
                        + "expected: 16"
            };

        this._data = new Float32Array(m.slice(1));
        if (this._callback)
            this._callback(this);
    };

    /**
     * Multiply returns a new construct which is the result of this matrix
     * multiplied by the argument which can be any of: XML3DMatrix, XML3DVec3,
     * XML3DRotation. This matrix is not modified.
     * @param {XML3DMatrix} secondMatrix Matrix to multiply with
     * @return {XML3DMatrix} New matrix with the result
     */
    p.multiply = function(secondMatrix) {
        var result = new XML3DMatrix();
        XML3D.math.mat4.multiply(result._data, this._data, secondMatrix._data);
        return result;
    };

    /**
     * Inverse returns a new matrix which is the inverse of this matrix. This
     * matrix is not modified.
     * @return {XML3DMatrix} Inverted matrix
     * @throws DOMException when the matrix cannot be inverted.
     */
    p.inverse = function() {
        var result = new XML3DMatrix();
        result._data = XML3D.math.mat4.invert(result._data, this._data);
        if (result._data == null || isNaN(result._data[0]))
            throw new Error("Trying to invert matrix that is not invertable.");
        return result;
    };

    /**
     * This method returns a new matrix which is this matrix multiplied by each
     * of 3 rotations about the major axes. If the y and z components are
     * undefined, the x value is used to rotate the object about the z axis.
     * Rotation values are in RADIANS. This matrix is not modified.
     *
     * @returns {XML3DMatrix} new rotated matrix
     */
    p.rotate = function(rotX, rotY, rotZ) {
        var r = new XML3DMatrix();
        if(rotY === undefined && rotZ === undefined) {
            XML3D.math.mat4.rotateZ(r._data, this._data, rotX);
            return r;
        }
        XML3D.math.mat4.rotateZ(r._data, this._data, rotZ);
        XML3D.math.mat4.rotateY(r._data, r._data, rotY);
        XML3D.math.mat4.rotateX(r._data, r._data, rotX);
        return r;
    };

    /**
     * RotateAxisAngle returns a new matrix which is this matrix multiplied by a
     * rotation matrix with the given XML3DRotation. This matrix is not
     * modified.
     *
     * @param {number} x x-component of the rotation axis
     * @param {number} y y-component of the rotation axis
     * @param {number} z z-component of the rotation axis
     * @param {number} angle angle in radians
     * @returns {XML3DMatrix} The result of the rotation in a new matrix
     */
    p.rotateAxisAngle = function(x, y, z, angle) {
        var result = new XML3DMatrix();
        XML3D.math.mat4.rotate(result._data, this._data, angle, [ x, y, z ]);
        return result;
    };

    /**
     * Scale returns a new matrix which is this matrix multiplied by a scale
     * matrix containing the passed values. If the z component is undefined a 1
     * is used in its place. If the y component is undefined the x component
     * value is used in its place. This matrix is not modified.
     *
     * @param {number} scaleX scale factor in x direction
     * @param {number=} scaleY scale factor in y direction. Optional. If
     *            undefined the scaleX value is used in its place
     * @param {number=} scaleZ scale factor in z direction. Optional. If
     *            undefined 1 is used.
     * @returns {XML3DMatrix} The result of the rotation in a new matrix
     */
    p.scale = function(scaleX, scaleY, scaleZ) {
        var result = new XML3DMatrix();
        if (!scaleZ)
            scaleZ = 1;
        if (!scaleY)
            scaleY = scaleX;
        XML3D.math.mat4.scale(result._data, this._data, [ scaleX, scaleY, scaleZ ]);
        return result;
    };

    /**
     * Translate returns a new matrix which is this matrix multiplied by a
     * translation matrix containing the passed values. This matrix is not
     * modified.
     * @param {number} x Translation in x direction
     * @param {number} y Translation in y direction
     * @param {number} z Translation in z direction
     * @returns {XML3DMatrix} The (new) resulting matrix
      */
    p.translate = function(x, y, z) {
        var result = new XML3DMatrix();
        XML3D.math.mat4.translate(result._data, this._data, [x, y, z]);
        return result;
    };

    XML3D.XML3DMatrix = XML3DMatrix;
    if (!window.XML3DMatrix)
        window.XML3DMatrix = XML3DMatrix;

}(XML3D._native));
// ray.js
(function(isNative) {

    if(isNative)
        return;
    
    /** returns an XML3DRay that has an origin and a direction.
    * 
    * If the arguments are not given, the ray's origin is (0,0,0) and 
    * points down the negative z-axis.  
    *   
    *  @param {XML3DVec3=} origin (optional) the origin of the ray
    *  @param {XML3DVec3=} direction (optional) the direction of the ray   
    */
    var XML3DRay = function(origin, direction, cb) {
        var that = this;

        var vec_cb = function() {
            if (that._callback)
                that._callback(that);
        };

        /** @private */
        this._origin = new window.XML3DVec3(0, 0, 0, vec_cb);
        this._direction = new window.XML3DVec3(0, 0, -1, vec_cb);

        if (origin && origin.origin) {
            this.set(origin, direction);
        } else {
            if (origin) {
                this._origin.set(origin);
            }
            if (direction) {
                this._direction.set(direction);
            }
        }
        /** @private * */
        this._callback = typeof cb == 'function' ? cb : 0;

    }; 
    var p = XML3DRay.prototype;
    
    /** @type {XML3DVec3} */
    Object.defineProperty(p, "origin", {
        /** @this {XML3DRay} * */
        get : function() { return this._origin; },
        set : function() { throw Error("Can't set axis. XML3DRay::origin is readonly."); },
        configurable : false,
        enumerable : false
    });

    /** @type {XML3DVec3} */
    Object.defineProperty(p, "direction", {
        /** @this {XML3DRay} * */
        get : function() { return this._direction; },
        set : function() { throw Error("Can't set axis. XML3DRay::origin is readonly."); },
        configurable : false,
        enumerable : false
    });
    
    /**
     * The set method copies the values from other.
     * @param {XML3DRay} other The other ray
     */
    p.set = function(other) {
        this._origin.set(other.origin);
        this._direction.set(other.direction);
        if (this._callback)
            this._callback(this);
    };

    /**
     * String representation of the XML3DRay.
     * @override
     * @return {string} Human-readable representation of this XML3DRay.
     */
    p.toString = function() {
        return "[object XML3DRay]";
    };

    // Export
    XML3D.XML3DRay = XML3DRay;
    window.XML3DRay = XML3DRay;

}(XML3D._native));
// box.js
(function($) {
    // Is native?
    if($) return;

    var c_XflowObserverList = [];

    var XML3DDataObserver = function(callback){
        this.callback = callback;
        this.observed = [];
    }
    window.XML3DDataObserver = XML3DDataObserver;

    XML3DDataObserver.prototype.observe = function(node, options){
        if(this.observed.length == 0)
            c_XflowObserverList.push(this);
        var dataAdapter = XML3D.base.resourceManager.getAdapter(node, XML3D.data);
        if(dataAdapter){

            var entry = {
                node: node,
                changed: false,
                request: null
            };

            var names = options && options['names'];
            var typeOfNames = Object.prototype.toString.call(names).slice(8, -1);
            if (typeOfNames === "String") {
                names = [names];
            }

            entry.request = dataAdapter.getComputeRequest(names, function(request, changeType){
                entry.changed = true;
            });
            // Fetch result to synchronize Xflow structures and connect to callbacks
            // TODO: Find an option to connect request to callback structure without computing result
            entry.request.getResult();

            this.observed.push(entry);
        }

    }

    XML3DDataObserver.prototype.disconnect = function(){
        for(var i = 0; i < this.observed.length; ++i){
            this.observed[i].request.clear();
        }
        this.observed = [];
        var i = c_XflowObserverList.length;
        while(i--){
            if(c_XflowObserverList[i] == this)
                c_XflowObserverList.splice(i, 1);
        }
    }


    XML3D.updateXflowObserver = function(){
        for(var i = 0; i < c_XflowObserverList.length; ++i){
            var observer = c_XflowObserverList[i];
            var records = [];
            for(var j = 0; j < observer.observed.length; ++j){
                var entry = observer.observed[j];
                if(entry.changed){
                    entry.changed = false;
                    var result = entry.request.getResult();
                    var dataResult = new XML3DDataResult(result);
                    records.push( new XML3DDataRecord(entry.node, dataResult));
                }
            }
            if(records.length > 0 && observer.callback){
                observer.callback(records, observer);
            }
        }
    }

    var XML3DDataRecord = function(target, result){
        this.target = target;
        this.result = result;
    }
    window.XML3DDataRecord = XML3DDataRecord;


    var XML3DDataResult = function(result){
        this._entries = {};
        constructDataResult(this, result);
    }
    window.XML3DDataResult = XML3DDataResult;

    XML3DDataResult.prototype.getValue = function(name) {
        if (this._entries[name])
            return this._entries[name].value;
        return null;
    }

    XML3DDataResult.prototype.getType = function(name) {
        if (this._entries[name])
            return this._entries[name].type;
        return null;
    }

    XML3DDataResult.prototype.getNames = function(){
        var result = [];
        for(var name in this._entries){
            result.push(name);
        }
        return result;
    }

    XML3DDataResult.FLOAT  = 0;
    XML3DDataResult.FLOAT2 = 1;
    XML3DDataResult.FLOAT3 = 2;
    XML3DDataResult.FLOAT4 = 3;
    XML3DDataResult.FLOAT4X4 = 4;
    XML3DDataResult.INT = 10;
    XML3DDataResult.INT4 = 11;
    XML3DDataResult.BOOL = 20;
    XML3DDataResult.TEXTURE = 30;
    XML3DDataResult.BYTE = 40;
    XML3DDataResult.UBYTE = 50;


    function constructDataResult(dataResult, result){
        for(var i = 0; i < result.outputNames.length; ++i){
            var name = result.outputNames[i];
            var entry = result.getOutputData(name);
            var value = entry && entry.getValue();
            if (value !== null) {
                var type = getXML3DDataType(entry.type);
                dataResult._entries[name] = { type: type, value: value};
            }
        }
    }

    function getXML3DDataType(type){
        switch(type){
            case Xflow.DATA_TYPE.FLOAT : return XML3DDataResult.FLOAT;
            case Xflow.DATA_TYPE.FLOAT2 : return XML3DDataResult.FLOAT2;
            case Xflow.DATA_TYPE.FLOAT3 : return XML3DDataResult.FLOAT3;
            case Xflow.DATA_TYPE.FLOAT4 : return XML3DDataResult.FLOAT4;
            case Xflow.DATA_TYPE.FLOAT4X4 : return XML3DDataResult.FLOAT4X4;
            case Xflow.DATA_TYPE.INT : return XML3DDataResult.INT;
            case Xflow.DATA_TYPE.INT4 : return XML3DDataResult.INT4;
            case Xflow.DATA_TYPE.BOOL : return XML3DDataResult.BOOL;
            case Xflow.DATA_TYPE.TEXTURE : return XML3DDataResult.TEXTURE;
            case Xflow.DATA_TYPE.BYTE : return XML3DDataResult.BYTE;
            case Xflow.DATA_TYPE.UBYTE : return XML3DDataResult.UBYTE;
            default: throw new Error("WHAT IS THIS I DON'T EVEN...");
        }
    }

    var XML3DDataChannelInfo = function(type, origin, originalName, seqLength, seqMinKey, seqMaxKey){
        this.type = getXML3DDataType(type);
        this.origin = origin;
        this.originalName = originalName;
        this.seqLength = seqLength;
        this.seqMinKey = seqMinKey;
        this.seqMaxKey = seqMaxKey;
    }
    window.XML3DDataChannelInfo = XML3DDataChannelInfo;

    XML3DDataChannelInfo.ORIGIN_CHILD = 1;
    XML3DDataChannelInfo.ORIGIN_COMPUTE = 2;
    XML3DDataChannelInfo.ORIGIN_PROTO = 3;



}(XML3D._native));
//-----------------------------------------------------------------------------
// Adapter and Adapter factory
//-----------------------------------------------------------------------------
(function(XML3D) {

    XML3D.base = {
        toString: function() {
            return "base";
        }
    };

    /**
     * A normal adapter that doesn't need to be connected to a DOM node
     * @constructor
     * @param {XML3D.base.AdapterFactory} factory - the factory this adapter was created from
     */
    XML3D.base.Adapter = function(factory) {
        this.factory = factory;
    };

    /**
     * Connect an adapterHandle to a certain key.
     * This will enable the ConnectedAdapterNotifcations for notifyChanged.
     * @param {string} key - the key that will also be provided in connectAdapterChanged callback
     * @param {XML3D.base.AdapterHandle} adapterHandle handle of adapter to be added
     */
    XML3D.base.Adapter.prototype.connectAdapterHandle = function(key, adapterHandle) {
        if (!this.connectedAdapterHandles) {
            this.connectedAdapterHandles = {};
            this._bindedAdapterHandleCallback = adapterHandleCallback.bind(this);
        }

        this.disconnectAdapterHandle(key);

        if (adapterHandle) {
            this.connectedAdapterHandles[key] = adapterHandle;
            this.connectedAdapterHandles[key].addListener(this._bindedAdapterHandleCallback);
        }
        else
            delete this.connectedAdapterHandles[key];

    };

    /**
     * Disconnects the adapter handle from the given key.
     * @param {string} key - the key that was provided when this adapter handle was connected
     */
    XML3D.base.Adapter.prototype.disconnectAdapterHandle = function(key) {
        if (this.connectedAdapterHandles && this.connectedAdapterHandles[key]) {
            this.connectedAdapterHandles[key].removeListener(this._bindedAdapterHandleCallback);
            delete this.connectedAdapterHandles[key];
        }
    };

    /**
     * Disconnects all adapter handles.
     */
    XML3D.base.Adapter.prototype.clearAdapterHandles = function() {
        for (var i in this.connectedAdapterHandles) {
            this.connectedAdapterHandles[i].removeListener(this._bindedAdapterHandleCallback);
        }

        this.connectedAdapterHandles = {};
    };

    /**
     * Get the connected AdapterHandle of a certain key.
     * This will only return AdapterHandles previously added via connectAdapterHandle
     * @param {string} key
     * @return {?XML3D.base.AdapterHandle} the adapter of that key, or null if not available
     */
    XML3D.base.Adapter.prototype.getConnectedAdapterHandle = function(key) {
        return this.connectedAdapterHandles && this.connectedAdapterHandles[key];
    };

    /**
     * Get the connected adapter of a certain key.
     * This will only return adapters of AdapterHandles previously added via connectAdapter
     * @param {string} key
     * @return {?XML3D.base.Adapter} the adapter of that key, or null if not available
     */
    XML3D.base.Adapter.prototype.getConnectedAdapter = function(key) {
        var handle = this.getConnectedAdapterHandle(key);
        return handle && handle.getAdapter();
    };

    /**
     * This function is called, when the adapater is detached from the node.
     * At this point, the adapater should disconnect from any other adapter and prepare to be properly garbage collected
     */
    XML3D.base.Adapter.prototype.onDispose = function() {
    }


    /**
     * Internal function that converts an AdapterHandleNotification to a ConnectedAdapterNotification
     * @private
     * @param {XML3D.events.AdapterHandleNotification} evt
     */
    function adapterHandleCallback(evt) {
        for (var key in this.connectedAdapterHandles) {
            if (this.connectedAdapterHandles[key] == evt.adapterHandle) {
                var subEvent = new XML3D.events.ConnectedAdapterNotification(evt, key)
                this.notifyChanged(subEvent);
            }
        }
    };


    /**
     * An Adapter connected to a DOMNode (possibly of an external document)
     * @constructor
     * @param {XML3D.base.AdapterFactory} factory the AdapterFactory this adapter was created from
     * @param {Object} node - DOM node of this Adapter
     */
    XML3D.base.NodeAdapter = function(factory, node) {
        XML3D.base.Adapter.call(this, factory)
        this.node = node;
    };
    XML3D.createClass(XML3D.base.NodeAdapter, XML3D.base.Adapter);

    /**
     * called by the factory after adding the adapter to the node
     */
    XML3D.base.NodeAdapter.prototype.init = function() {
    };

    /**
     * Notifiction due to a change in DOM, related adapters and so on.
     * @param {XML3D.events.Notification} e
     */
    XML3D.base.NodeAdapter.prototype.notifyChanged = function(e) {

    };

    /**
     * @param {string|XML3D.URI} uri Uri to referred adapterHandle
     * @returns an AdapterHandle to the referred Adapter of the same aspect and canvasId
     */
    XML3D.base.NodeAdapter.prototype.getAdapterHandle = function(uri) {
        return XML3D.base.resourceManager.getAdapterHandle(this.node.ownerDocument, uri,
            this.factory.aspect, this.factory.canvasId);
    };
    /**
     * notifies all adapter that refer to this adapter through AdapterHandles.
     * @param {number?} type The type of change
     */
    XML3D.base.NodeAdapter.prototype.notifyOppositeAdapters = function(type) {
        type = type || XML3D.events.ADAPTER_HANDLE_CHANGED;
        return XML3D.base.resourceManager.notifyNodeAdapterChange(this.node,
            this.factory.aspect, this.factory.canvasId, type);
    };

    /**
     * Depth-first traversal over element hierarchy
     * @param {function(NodeAdapter)} callback
     */
    XML3D.base.NodeAdapter.prototype.traverse = function(callback) {
        callback(this);
        var child = this.node.firstElementChild;
        while (child) {
            var adapter = this.factory.getAdapter(child);
            adapter && adapter.traverse(callback);
            child = child.nextElementSibling;
        }
    }


    /**
     * @interface
     */
    XML3D.base.IFactory = function() {
    };

    /** @type {string} */
    XML3D.base.IFactory.prototype.aspect;


    /**
     * An adapter factory is responsible for creating adapter from a certain data source.
     * Note that any AdapterFactory is registered with XML3D.base.resourceManager
     * @constructor
     * @implements {XML3D.base.IFactory}
     * @param {Object} aspect The aspect this factory serves (e.g. XML3D.data or XML3D.webgl)
     * @param {string|Array.<string>} mimetypes The mimetype this factory is compatible to
     * @param {number} canvasId The id of the corresponding canvas handler. 0, if not dependent on any CanvasHandler
     */
    XML3D.base.AdapterFactory = function(aspect, mimetypes, canvasId) {
        this.aspect = aspect;
        this.canvasId = canvasId || 0;
        this.mimetypes = typeof mimetypes == "string" ? [ mimetypes] : mimetypes;

        XML3D.base.registerFactory(this);
    };

    /**
     * Implemented by subclass
     * Create adapter from an object (node in case of an xml, and object in case of json)
     * @param {object} obj
     * @returns {?XML3D.base.Adapter} created adapter or null if no adapter can be created
     */
    XML3D.base.AdapterFactory.prototype.createAdapter = function(obj) {
        return null;
    };

    /**
     * Checks if the adapter factory supports specified mimetype. Can be overridden by subclass.
     * @param {String} mimetype
     * @return {Boolean} true if the adapter factory supports specified mimetype
     */
    XML3D.base.AdapterFactory.prototype.supportsMimetype = function(mimetype) {
        return this.mimetypes.indexOf(mimetype) != -1;
    };

    /**
     * A NodeAdaperFactory is a AdapterFactory, that works specifically for DOM nodes / elements.
     * @constructor
     * @implements {XML3D.base.AdapterFactory}
     * @param {Object} aspect The aspect this factory serves (e.g. XML3D.data or XML3D.webgl)
     * @param {number} canvasId The id of the corresponding canvas handler. 0, if not dependent on any CanvasHandler
     */
    XML3D.base.NodeAdapterFactory = function(aspect, canvasId) {
        XML3D.base.AdapterFactory.call(this, aspect, ["text/xml", "application/xml"], canvasId);
    };
    XML3D.createClass(XML3D.base.NodeAdapterFactory, XML3D.base.AdapterFactory);

    /**
     * This function first checks, if an adapter has been already created for the corresponding node
     * If yes, this adapter is returned, otherwise, a new adapter is created and returned.
     * @param {Object} node
     * @returns {XML3D.base.Adapter} The adapter of the node
     */
    XML3D.base.NodeAdapterFactory.prototype.getAdapter = function(node) {
        if (!node || node._configured === undefined)
            return null;
        var elemHandler = node._configured;
        var key = this.aspect + "_" + this.canvasId;
        var adapter = elemHandler.adapters[key];
        if (adapter !== undefined)
            return adapter;

        // No adapter found, try to create one
        adapter = this.createAdapter(node);
        if (adapter) {
            elemHandler.adapters[key] = adapter;
            adapter.init();
        }
        return adapter;
    };

    /**
     * This function sends single or multiple adapter functions by calling functions
     * specified in funcs parameter for each adapter associated with the node.
     *
     * funcs parameter is used as a dictionary where each key is used as name of a
     * adapter function to call, and corresponding value is a list of arguments
     * (i.e. must be an array). For example sendAdapterEvent(node, {method : [1,2,3]})
     * will call function 'method' with arguments 1,2,3 for each adapter of the node.
     *
     * @param {Object} node
     * @param {Object} funcs
     * @return {Array} array of all returned values
     */
    XML3D.base.callAdapterFunc = function(node, funcs) {
        var result = [];
        if (!node || node._configured === undefined)
            return result;
        var adapters = node._configured.adapters;
        for (var adapter in adapters) {
            for (var func in funcs) {
                var adapterObject = adapters[adapter];
                var eventHandler = adapterObject[func];
                if (eventHandler) {
                    result.push(eventHandler.apply(adapterObject, funcs[func]));
                }
            }
        }
        return result;
    };

    /**
     * This function sends single or multiple adapter events by calling functions
     * specified in events parameter for each adapter associated with the node.
     *
     * events parameter is used as a dictionary where each key is used as name of a
     * adapter function to call, and corresponding value is a list of arguments
     * (i.e. must be an array). For example sendAdapterEvent(node, {method : [1,2,3]})
     * will call function 'method' with arguments 1,2,3 for each adapter of the node.
     *
     * @param {Object} node
     * @param {Object} events
     * @return {Boolean} false if node is not configured.
     */
    XML3D.base.sendAdapterEvent = function(node, events) {
        if (!node || node._configured === undefined)
            return false;
        var adapters = node._configured.adapters;
        for (var adapter in adapters) {
            for (var event in events) {
                var eventHandler = adapters[adapter][event];
                if (eventHandler) {
                    eventHandler.apply(adapters[adapter], events[event]);
                }
            }
        }
        return true;
    };

}(window.XML3D));
(function(XML3D) {

    "use strict";

    /**
     * An adapter handle is a connection piece for an adapter that is referred through a uri (e.g. id reference)
     * AdapterHandles are always fetched from the XML3D.base.resourceManager
     * @constructor
     */
    var AdapterHandle = function(url) {
        this.url = url;
        this.adapter = null;
        this.listeners = [];
        this.status = 0; // STATUS.LOADING
    };

    /**
     * Enumaeration of states for the adapter handle
     * @enum {number}
     */
    AdapterHandle.STATUS = {
        LOADING: 0,
        NOT_FOUND: 1,
        READY: 2
    };

    /**
     * @returns {Boolean} true iff an adapter is available
     */
    AdapterHandle.prototype.hasAdapter = function() {
        return this.adapter != null;
    };

    /**
     * @returns {?XML3D.base.Adapter} the adapter connected to the handle. Can be null
     */
    AdapterHandle.prototype.getAdapter = function() {
        return this.adapter;
    };

    /**
     * Note: this function should only be called by XML3D.base.resourceManager
     * @param {XML3D.base.Adapter} adapter The adapter connected to the AdapterHandler
     * @param {AdapterHandle.STATUS} status
     */
    AdapterHandle.prototype.setAdapter = function(adapter, status) {
        this.adapter = adapter;
        this.status = status;
        this.notifyListeners(XML3D.events.ADAPTER_HANDLE_CHANGED);
    };

    /**
     * This function is called to notify all listeners of this AdapterHandle about some change.
     * @param {number} type A type number with the type of change (usually XML3D.events.ADAPTER_HANDLE_CHANGED)
     */
    AdapterHandle.prototype.notifyListeners = function(type) {
        var event = new XML3D.events.AdapterHandleNotification(this, type);
        var i = this.listeners.length;
        while (i--) {
            this.listeners[i](event);
        }
    }

    /**
     * Add a listener to the AdapterHandle that is notified about changes.
     * Listeners cannot be inserted twice.
     * @param {Function} listener - Function to be called when something concering the adapter changes
     */
    AdapterHandle.prototype.addListener = function(listener) {
        var idx = this.listeners.indexOf(listener);
        if (idx == -1)
            this.listeners.push(listener);
    };

    /**
     * Remove a listener from the AdapterHandle
     * @param {Function} listener
     */
    AdapterHandle.prototype.removeListener = function(listener) {
        var idx = this.listeners.indexOf(listener);
        if (idx != -1)
            this.listeners.splice(idx, 1);
    };

    // Export
    XML3D.base.AdapterHandle = AdapterHandle;

}(window.XML3D));(function() {
    "use strict";

    var c_cachedDocuments = {};
    var c_factories = {};
    var c_cachedAdapterHandles = {};
    var c_canvasIdCounters = {};
    var c_formatHandlers = [];

    var c_binaryContentTypes = ["application/octet-stream", "text/plain; charset=x-user-defined"];
    var c_binaryExtensions = [".bin", ".bson"];

    /**
     * Register a factory with the resource manager
     * @param {XML3D.base.AdapterFactory} factory - the factory to be registered
     */
    XML3D.base.registerFactory = function(factory) {
        var canvasId = factory.canvasId;
        if (!c_factories[canvasId])
            c_factories[canvasId] = [];
        c_factories[canvasId].push(factory);
    };

    XML3D.base.registerFormat = function(formatHandler) {
        if (formatHandler)
            c_formatHandlers.push(formatHandler);
    }

    XML3D.base.findFormat = function(response, responseType, mimetype) {
        for (var i = 0; i < c_formatHandlers.length; ++i) {
            var formatHandler = c_formatHandlers[i];
            if (c_formatHandlers[i].isFormatSupported(response, responseType, mimetype)) {
                return formatHandler;
            }
        }
        return null;
    }

    /**
     * @constructor
     */
    var ResourceManager = function() {
    };

    function getCounterObject(canvasId) {
        return c_canvasIdCounters[canvasId];
    }

    function getOrCreateCounterObject(canvasId) {
        var counterObject = c_canvasIdCounters[canvasId];
        if (!counterObject) {
            counterObject = {counter: 0, listeners: new Array()};
            c_canvasIdCounters[canvasId] = counterObject;
        }
        return counterObject;
    }

    function notifyLoadCompleteListeners(counterObject) {
        var listeners = counterObject.listeners;
        counterObject.listeners = new Array();
        var i = listeners.length;
        while (i--) {
            listeners[i](this);
        }
    }

    function loadComplete(canvasId, url) {
        // notify all load complete listeners
        var counterObject = getCounterObject(canvasId);
        if (counterObject) {
            XML3D.debug.assert(counterObject.counter > 0, "counter must be > 0");
            counterObject.counter--;
            if (counterObject.counter == 0) {
                notifyLoadCompleteListeners(counterObject);
            }
        }
    }

    /*
     * Register listener that will be fired when all resources for specified canvasId are loaded.
     * Listener is fired only once.
     *
     * @param {number} canvasId
     * @param {EventListener} listener
     */
    ResourceManager.prototype.addLoadCompleteListener = function(canvasId, listener) {
        var counterObject = getCounterObject(canvasId);

        // when counter is 0 we can fire event immediately
        if (counterObject === undefined || counterObject.counter == 0) {
            listener(canvasId);
            return;
        }

        var idx = counterObject.listeners.indexOf(listener);
        if (idx == -1) {
            counterObject.listeners.push(listener);
        }
    };

    ResourceManager.prototype.removeLoadCompleteListener = function(canvasId, listener) {
        var counterObject = getCounterObject(canvasId);
        if (counterObject) {
            var idx = counterObject.listeners.indexOf(listener);
            if (idx != -1)
                counterObject.listeners.splice(idx, 1);
        }
    };


    function stringEndsWithSuffix(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    ResourceManager.prototype.addBinaryContentType = function(type) {
        if (c_binaryContentTypes.indexOf(type) == -1)
            c_binaryContentTypes.push(type);
    };

    ResourceManager.prototype.removeBinaryContentType = function(type) {
        var idx = c_binaryContentTypes.indexOf(type);
        if (idx != -1)
            c_binaryContentTypes.splice(idx, 1);
    };

    function isBinaryContentType(contentType) {
        for (var i in c_binaryContentTypes) {
            if (contentType == c_binaryContentTypes[i]) {
                return true;
            }
        }
        return false;
    }

    ResourceManager.prototype.addBinaryExtension = function(extension) {
        if (c_binaryExtensions.indexOf(extension) == -1)
            c_binaryExtensions.push(extension);
    };

    ResourceManager.prototype.removeBinaryExtension = function(extension) {
        var idx = c_binaryExtensions.indexOf(extension);
        if (idx != -1)
            c_binaryExtensions.splice(idx, 1);
    };

    function isBinaryExtension(url) {
        for (var i in c_binaryExtensions) {
            if (stringEndsWithSuffix(url, c_binaryExtensions[i]))
                return true;
        }
        return false;
    }

    /**
     * Load a document via XMLHttpRequest
     * @private
     * @param {string} url URL of the document
     */
    function loadDocument(url) {
        var xmlHttp = null;
        try {
            xmlHttp = new XMLHttpRequest();
        } catch (e) {
            xmlHttp = null;
        }
        if (xmlHttp) {
            xmlHttp._url = url;
            xmlHttp._contentChecked = false;
            xmlHttp.open('GET', url, true);
            if (isBinaryExtension(url))
                xmlHttp.responseType = "arraybuffer";

            xmlHttp.onreadystatechange = function() {
                if (xmlHttp._aborted) // This check is possibly not needed
                    return;
                // check compatibility between content and request mode
                if (!xmlHttp._contentChecked &&
                    // 2 - HEADERS_RECEIVED, 3 - LOADING, 4 - DONE
                    ((xmlHttp.readyState == 2 || xmlHttp.readyState == 3 || xmlHttp.readyState == 4) &&
                        xmlHttp.status == 200)) {
                    xmlHttp._contentChecked = true; // we check only once
                    // check if we need to change request mode
                    var contentType = xmlHttp.getResponseHeader("content-type");
                    if (contentType) {
                        var binaryContent = isBinaryContentType(contentType);
                        var binaryRequest = (xmlHttp.responseType == "arraybuffer");
                        // When content is not the same as request, we need to repeat request
                        if (binaryContent != binaryRequest) {
                            xmlHttp._aborted = true;
                            var cb = xmlHttp.onreadystatechange;
                            xmlHttp.onreadystatechange = null;
                            var url = xmlHttp._url;
                            xmlHttp.abort();

                            // Note: We do not recycle XMLHttpRequest !
                            //       This does work only when responseType is changed to "arraybuffer",
                            //       however the size of the xmlHttp.response buffer is then wrong !
                            //       It does not work at all (at least in Chrome) when we use overrideMimeType
                            //       with "text/plain; charset=x-user-defined" argument.
                            //       The latter mode require creation of the fresh XMLHttpRequest.

                            xmlHttp = new XMLHttpRequest();
                            xmlHttp._url = url;
                            xmlHttp._contentChecked = true;
                            xmlHttp.open('GET', url, true);
                            if (binaryContent)
                                xmlHttp.responseType = "arraybuffer";
                            xmlHttp.onreadystatechange = cb;
                            xmlHttp.send(null);
                            return;
                        }
                    }
                }
                // Request mode and content type are compatible here (both binary or both text)
                if (xmlHttp.readyState == 4) {
                    if (xmlHttp.status == 200) {
                        XML3D.debug.logDebug("Loaded: " + xmlHttp._url);
                        XML3D.xmlHttpCallback && XML3D.xmlHttpCallback(xmlHttp);
                        processResponse(xmlHttp);
                    }
                    else {
                        XML3D.debug.logError("Could not load external document '" + xmlHttp._url +
                            "': " + xmlHttp.status + " - " + xmlHttp.statusText);
                        invalidateDocumentHandles(xmlHttp._url);
                    }
                }
            };
            xmlHttp.send(null);
        }
    };

    /**
     * Process response of ajax request from loadDocument()
     * @private
     * @param {XMLHttpRequest} httpRequest
     */
    function processResponse(httpRequest) {
        var mimetype = httpRequest.getResponseHeader("content-type");
        setDocumentData(httpRequest, httpRequest._url, mimetype);
        updateDocumentHandles(httpRequest._url);
    };

    /**
     * Initialize data of a received document
     * @private
     * @param {XMLHttpRequest} httpRequest The XMLHttpRequest of the loaded document
     * @param {string} url URL of the loaded document
     * @param {string} mimetype The mimetype of the loaded document
     */
    function setDocumentData(httpRequest, url, mimetype) {
        var docCache = c_cachedDocuments[url];
        docCache.mimetype = mimetype;

        var cleanedMimetype = mimetype;

        if (mimetype.indexOf(';') > 0)
            cleanedMimetype = mimetype.substr(0, mimetype.indexOf(';'));

        var response = null;
        if (httpRequest.responseType == "arraybuffer") {
            response = httpRequest.response;
        } else if (cleanedMimetype == "application/json") {
            response = JSON.parse(httpRequest.responseText);
        } else if (cleanedMimetype == "application/xml" || cleanedMimetype == "text/xml") {
            response = httpRequest.responseXML;
            if (!response) {
                XML3D.debug.logError("Invalid external XML document '" + httpRequest._url +
                    "': XML Syntax error");
                return;
            }
        } else if (cleanedMimetype == "application/octet-stream" || mimetype == "text/plain; charset=x-user-defined") {
            XML3D.debug.logError("Possibly wrong loading of resource " + url + ". Mimetype is " + mimetype + " but response is not an ArrayBuffer");
            response = httpRequest.response;
        } else {
            XML3D.debug.logError("Unidentified response type (response = '" + httpRequest.response + "', responseType = '" + httpRequest.responseType + "')");
            response = httpRequest.response;
        }

        var formatHandler = XML3D.base.findFormat(response, httpRequest.responseType, cleanedMimetype);
        if (!formatHandler) {
            XML3D.debug.logError("No format handler for resource (response = '" + response + "', responseType = '" + httpRequest.responseType + "')");
            return;
        }
        docCache.format = formatHandler;
        docCache.response = formatHandler.getFormatData(response, httpRequest.responseType, cleanedMimetype);
    }

    /**
     * Update all existing handles of a received document
     * @param {string} url The URL of the document
     */
    function updateDocumentHandles(url) {
        var docCache = c_cachedDocuments[url];
        var fragments = docCache.fragments;
        docCache.fragments = [];
        for (var i = 0; i < fragments.length; ++i) {
            updateExternalHandles(url, fragments[i]);
        }
    }

    /**
     * Invalidate all handles of a document, that could not be loaded.
     * @param {string} url The URL of the document
     */
    function invalidateDocumentHandles(url) {
        var docCache = c_cachedDocuments[url];
        var fragments = docCache.fragments;
        docCache.fragments = [];
        for (var i = 0; i < fragments.length; ++i) {
            var fullUrl = url + (fragments[i] ? "#" + fragments[i] : "");
            invalidateHandles(fullUrl);
        }
    }

    /**
     * Update all handles of a part from an external document
     * @param {string} url The URL of the document
     * @param {string} fragment Fragment without pound key which defines the part of the document
     */
    function updateExternalHandles(url, fragment) {

        var response = c_cachedDocuments[url].response;
        var mimetype = c_cachedDocuments[url].mimetype;
        var format = c_cachedDocuments[url].format;

        var fullUrl = url + (fragment ? "#" + fragment : "");
        if (!response) {
            // In the case the loaded document is not supported we still need to decrement counter object
            invalidateHandles(fullUrl);
            return;
        }

        // get part of the resource represented by the fragment
        var data = format.getFragmentData(response, fragment);

        if (data) {
            updateMissingHandles(fullUrl, format, data);
        }
        else {
            invalidateHandles(fullUrl);
        }
    }


    /**
     * Update all AdapterHandles without adapters of a certain url
     * @param {string} url The complete url + fragment
     * @param {FormatHandler} formatHandler Format handler
     * @param {Object} data Data of the document corresponding to the url. Possibily a DOM element
     */
    function updateMissingHandles(url, formatHandler, data) {
        for (var adapterType in c_cachedAdapterHandles[url]) {
            for (var canvasId in c_cachedAdapterHandles[url][adapterType]) {
                var handle = c_cachedAdapterHandles[url][adapterType][canvasId];
                if (!handle.hasAdapter()) {
                    updateHandle(handle, adapterType, canvasId, formatHandler, data);
                    loadComplete(canvasId, url);
                }
            }
        }
    }

    /**
     * Invalidate all AdapterHandles without adapters of a certain url
     * @param {string} url The complete url + fragment
     */
    function invalidateHandles(url) {
        for (var adapterType in c_cachedAdapterHandles[url]) {
            for (var canvasId in c_cachedAdapterHandles[url][adapterType]) {
                var handle = c_cachedAdapterHandles[url][adapterType][canvasId];
                handle.setAdapter(null, XML3D.base.AdapterHandle.STATUS.NOT_FOUND);
                loadComplete(canvasId, url);
            }
        }
    }

    /**
     * Update a specific AdapterHandle with the provided data.
     * Internally an adapter will be created with 'data' and added to 'handle'
     * All other argument are required to finde the correct factory
     * @param {XML3D.base.AdapterHandle} handle The AdapterHandle to be updated
     * @param {Object} adapterType The type / aspect of the adapter (e.g. XML3D.data or XML3D.webgl)
     * @param {number} canvasId Id of corresponding canvas handler. 0 if not dependent of canvas handler
     * @param {FormatHandler} format Format handler of the corresponding document
     * @param {Object} data Data for this handle. Possibily a DOM element
     */
    function updateHandle(handle, adapterType, canvasId, format, data) {

        var factory = format.getFactory(adapterType, canvasId);

        if(!factory) {
            XML3D.debug.logError("Format does not support adapterType " + adapterType);
            return;
        }

        var adapter = factory.getAdapter ? factory.getAdapter(data) : factory.createAdapter(data);
        if (adapter) {
            handle.setAdapter(adapter, XML3D.base.AdapterHandle.STATUS.READY);
        }


    }

    /**
     * Remove the adapter of all AdapterHandles corresponding to the given URL.
     * This is called e.g. when a node is remove from the document, or an id changes
     * @param {string} url The URL of all AdapterHandles to be cleared.
     */
    function clearHandles(url) {
        for (var adapterType in c_cachedAdapterHandles[url]) {
            for (var canvasId in c_cachedAdapterHandles[url][adapterType]) {
                var handle = c_cachedAdapterHandles[url][adapterType][canvasId];
                if (handle.hasAdapter()) {
                    handle.setAdapter(null, XML3D.base.AdapterHandle.STATUS.NOT_FOUND);
                }
            }
        }
    }

    /**
     * Get any adapter, internal or external.
     * This function will trigger the loading of documents, if required.
     * An AdapterHandle will be always be returned, expect when an invalid (empty) uri is passed.
     *
     * @param {Document} baseDocument - the document from which to look up the reference
     * @param {XML3D.URI} uri - The URI used to find the referred AdapterHandle. Can be relative
     * @param {Object} adapterType The type of adapter required (e.g. XML3D.data or XML3D.webgl)
     * @param {number} canvasId Id of canvashandle this adapter depends on, 0 if not depending on any canvashandler
     * @returns {?XML3D.base.AdapterHandle} The requested AdapterHandler. Note: might be null
     */
    ResourceManager.prototype.getAdapterHandle = function(baseDocument, uri, adapterType, canvasId) {
        if (!uri)
            return null;

        if (typeof uri == "string") uri = new XML3D.URI(uri);

        canvasId = canvasId || 0;
        if (baseDocument != document || !uri.isLocal()) {
            uri = uri.getAbsoluteURI(baseDocument.documentURI);
        }

        if (!c_cachedAdapterHandles[uri])
            c_cachedAdapterHandles[uri] = {};

        if (!c_cachedAdapterHandles[uri][adapterType]) {
            c_cachedAdapterHandles[uri][adapterType] = {};
        }

        var handle = c_cachedAdapterHandles[uri][adapterType][canvasId];
        if (handle)
            return handle;

        var handle = new XML3D.base.AdapterHandle(uri);
        c_cachedAdapterHandles[uri][adapterType][canvasId] = handle;

        if (uri.isLocal()) {
            var node = XML3D.URIResolver.resolveLocal(uri);
            if (node)
                updateHandle(handle, adapterType, canvasId, XML3D.base.xml3dFormatHandler, node);
            else
                handle.setAdapter(null, XML3D.base.AdapterHandle.STATUS.NOT_FOUND);
        }
        else {
            var counterObject = getOrCreateCounterObject(canvasId);
            counterObject.counter++;

            var docURI = uri.toStringWithoutFragment();
            var docData = c_cachedDocuments[docURI];
            if (docData && docData.response) {
                updateExternalHandles(docURI, uri.fragment);
            } else {
                if (!docData) {
                    loadDocument(docURI);
                    c_cachedDocuments[docURI] = docData = {
                        fragments: []
                    };
                }
                docData.fragments.push(uri.fragment);
            }
        }
        return handle;
    };

    /**
     * Get any adapter, internal or external.
     *
     * @param node
     * @param adapterType
     * @param canvasId
     * @return {XML3D.base.Adapter?}
     */
    ResourceManager.prototype.getAdapter = function(node, adapterType, canvasId) {
        var factory = XML3D.base.xml3dFormatHandler.getFactory(adapterType, canvasId);
        if (factory) {
            return factory.getAdapter(node);
        }
        return null;
    }

    /**
     * This function is called when an id of an element changes or if that element is now reachable
     * or not reachable anymore. It will update all AdapterHandles connected to the element.
     * @param {Element} node Element of which id has changed
     * @param {string} previousId Previous id of element
     * @param {string} newId New id of element
     */
    ResourceManager.prototype.notifyNodeIdChange = function(node, previousId, newId) {
        var parent = node;
        while (parent.parentNode) parent = parent.parentNode;
        if (parent != window.document)
            return;

        // clear cached adapters of previous id"
        if (previousId) {
            clearHandles("#" + previousId);
        }
        if (newId) {
            updateMissingHandles("#" + newId, XML3D.base.xml3dFormatHandler, node);
        }
    }

    /**
     * This function is called to notify an AdapterHandler about a change (can be triggered through adapters)
     * Note that this function only works with nodes inside window.document
     * @param {Element} element Element of AdapterHandler. Must be from window.document
     * @param {Object} adapterType Type/Aspect of AdapterHandler (e.g. XML3D.data or XML3D.webgl)
     * @param {number} canvasId CanvasHandler id of AdapterHandler, 0 if not depending on CanvasHandler
     * @param {number} type Type of Notification. Usually XML3D.events.ADAPTER_HANDLE_CHANGED
     */
    ResourceManager.prototype.notifyNodeAdapterChange = function(element, adapterType, canvasId, type) {
        canvasId = canvasId || 0;
        var uri = "#" + element.id;
        if (c_cachedAdapterHandles[uri] && c_cachedAdapterHandles[uri][adapterType] &&
            c_cachedAdapterHandles[uri][adapterType][canvasId]) {
            c_cachedAdapterHandles[uri][adapterType][canvasId].notifyListeners(type);
        }
    }


    /**
     * Load data via XMLHttpRequest
     * @private
     * @param {string} url URL of the document
     * @param {function(object)} loadListener Gets the response of the XHR
     * @param {function(XMLHttpRequest)} errorListener Get the XHR object for further analyzis
     */
    ResourceManager.prototype.loadData = function(url, loadListener, errorListener) {
        var xmlHttp = null;
        try {
            xmlHttp = new XMLHttpRequest();
        } catch (e) {
            xmlHttp = null;
        }
        if (xmlHttp) {
            xmlHttp._url = url;
            xmlHttp._contentChecked = false;
            xmlHttp.open('GET', url, true);
            if (isBinaryExtension(url))
                xmlHttp.responseType = "arraybuffer";

            xmlHttp.onreadystatechange = function() {
                if (xmlHttp._aborted) // This check is possibly not needed
                    return;
                // check compatibility between content and request mode
                if (!xmlHttp._contentChecked &&
                    // 2 - HEADERS_RECEIVED, 3 - LOADING, 4 - DONE
                    ((xmlHttp.readyState == 2 || xmlHttp.readyState == 3 || xmlHttp.readyState == 4) &&
                        xmlHttp.status == 200)) {
                    xmlHttp._contentChecked = true; // we check only once
                    // check if we need to change request mode
                    var contentType = xmlHttp.getResponseHeader("content-type");
                    if (contentType) {
                        var binaryContent = isBinaryContentType(contentType);
                        var binaryRequest = (xmlHttp.responseType == "arraybuffer");
                        // When content is not the same as request, we need to repeat request
                        if (binaryContent != binaryRequest) {
                            xmlHttp._aborted = true;
                            var cb = xmlHttp.onreadystatechange;
                            xmlHttp.onreadystatechange = null;
                            var url = xmlHttp._url;
                            xmlHttp.abort();

                            // Note: We do not recycle XMLHttpRequest !
                            //       This does work only when responseType is changed to "arraybuffer",
                            //       however the size of the xmlHttp.response buffer is then wrong !
                            //       It does not work at all (at least in Chrome) when we use overrideMimeType
                            //       with "text/plain; charset=x-user-defined" argument.
                            //       The latter mode require creation of the fresh XMLHttpRequest.

                            xmlHttp = new XMLHttpRequest();
                            xmlHttp._url = url;
                            xmlHttp._contentChecked = true;
                            xmlHttp.open('GET', url, true);
                            if (binaryContent)
                                xmlHttp.responseType = "arraybuffer";
                            xmlHttp.onreadystatechange = cb;
                            xmlHttp.send(null);
                            return;
                        }
                    }
                }
                // Request mode and content type are compatible here (both binary or both text)
                if (xmlHttp.readyState == 4) {
                    if (xmlHttp.status == 200) {
                        XML3D.debug.logDebug("Loaded: " + xmlHttp._url);

                        var mimetype = xmlHttp.getResponseHeader("content-type");
                        var response = null;

                        if (xmlHttp.responseType == "arraybuffer") {
                            response = xmlHttp.response;
                        } else if (mimetype == "application/json") {
                            response = JSON.parse(xmlHttp.responseText);
                        } else if (mimetype == "application/xml" || mimetype == "text/xml") {
                            response = xmlHttp.responseXML;
                        } else if (mimetype == "application/octet-stream" || mimetype == "text/plain; charset=x-user-defined") {
                            XML3D.debug.logError("Possibly wrong loading of resource " + url + ". Mimetype is " + mimetype + " but response is not an ArrayBuffer");
                            response = xmlHttp.responseText; // FIXME is this correct ?
                        }
                        if (loadListener)
                            loadListener(response);
                    }
                    else {
                        XML3D.debug.logError("Could not load external document '" + xmlHttp._url +
                            "': " + xmlHttp.status + " - " + xmlHttp.statusText);
                        if (errorListener)
                            errorListener(xmlHttp);
                    }
                }
            };
            xmlHttp.send(null);
        }
    };

    /**
     * This function is called to load an Image.
     *
     * @param {string} uri Image URI
     * @param {function(Event, HTMLImageElement)} loadListener Function called when image was successfully loaded.
     *                                It will be called with event as the first and image as the second parameter.
     * @param {function(Event, HTMLImageElement)} errorListener Function called when image could not be loaded.
     *                                 It will be called with event as the first and image as the second parameter.
     * @return {HTMLImageElement}
     */
    ResourceManager.prototype.getImage = function(uri, loadListener, errorListener) {
        // we use canvasId 0 to represent images loaded in a document
        getOrCreateCounterObject(0).counter++;

        var image = new Image();
        image.onload = function(e) {
            loadComplete(0, uri);
            loadListener(e, image);
        };
        image.onerror = function(e) {
            loadComplete(0, uri);
            errorListener(e, image);
        };
        image.crossOrigin = "anonymous";

        image.src = uri; // here loading starts
        return image;
    }


    /**
     * This function is called to load a Video.
     *
     * @param {string} uri Video URI
     * @param {boolean} autoplay
     * @param {Object} listeners  Dictionary of all listeners to register with video element.
     *                            Listeners will be called with event as the first and video as the second parameter.
     * @return {HTMLVideoElement}
     */
    ResourceManager.prototype.getVideo = function(uri, autoplay, listeners) {
        // we use canvasId 0 to represent videos loaded in a document
        getOrCreateCounterObject(0).counter++;

        var video = document.createElement("video");

        function loadCompleteCallback(event) {
            loadComplete(0, uri);
        }

        video.addEventListener("canplay", loadCompleteCallback, true);
        video.addEventListener("error", loadCompleteCallback, true);
        video.crossorigin = "anonymous";
        video.autoplay = autoplay;

        function createCallback(listener) {
            return function(event) {
                listener(event, video);
            };
        }

        for (var eventName in listeners) {
            video.addEventListener(eventName, createCallback(listeners[eventName]), true);
        }

        video.src = uri; // here loading starts
        return video;
    }

    XML3D.base.resourceManager = new ResourceManager();

})();
(function() {

    /**
     * A format handler is provide functionality for detecting format of resources
     * and providing format-specific services.
     * FormatHandlers are registered with XML3D.base.registerFormat() function.
     * @constructor
     */
    var FormatHandler = function() {
        this.factoryClasses = {}; // a map from an aspect name to a factory class
        this.factoryCache = {}; // maps unique keys (aspect + "_" + canvasId) to the factory instance
    };

    FormatHandler.prototype.registerFactoryClass = function(factoryClass) {
        if (!factoryClass.prototype.aspect || !XML3D.isSuperclassOf(XML3D.base.AdapterFactory, factoryClass))
            throw new Error("factoryClass must be a subclass of XML3D.base.AdapterFactory");
        this.factoryClasses[factoryClass.prototype.aspect] = factoryClass;
    }

    FormatHandler.prototype.getFactoryClassByAspect = function(aspect) {
        return this.factoryClasses[aspect];
    }

    FormatHandler.prototype.getFactory = function(aspect, canvasId) {
        canvasId = canvasId || 0;
        var key = aspect + "_" + canvasId;
        var factory = this.factoryCache[key];
        if (!factory) {
            var factoryClass = this.getFactoryClassByAspect(aspect);
            if (!factoryClass)
                return null;
            factory = new factoryClass(canvasId);
            this.factoryCache[key] = factory;
        }
        return factory;
    }

    /**
     * Returns true if response data format is supported.
     * response, responseType, and mimetype values are returned by XMLHttpRequest.
     * Data type of the response is one of ArrayBuffer, Blob, Document, String, Object.
     * responseType is one of "", "arraybuffer", "blob", "document", "json", "text"
     *
     * @override
     * @param {Object} response
     * @param {string} responseType
     * @param {string} mimetype
     * @return {Boolean}
     */
    FormatHandler.prototype.isFormatSupported = function(response, responseType, mimetype) {
        return false;
    }

    /**
     * Converts response data to format data.
     * Default implementation returns value of response.
     *
     * @override
     * @param {Object} response
     * @param {string} responseType
     * @param {string} mimetype
     * @return {Object}
     */
    FormatHandler.prototype.getFormatData = function(response, responseType, mimetype) {
        return response;
    }

    /**
     * Extracts data for a fragment from document data and fragment reference.
     *
     * @override
     * @param {Object} documentData
     * @param {string} fragment Fragment without pound key which defines the part of the document
     * @return {*}
     */
    FormatHandler.prototype.getFragmentData = function(documentData, fragment) {
        if (!fragment)
            return documentData;
        return null;
    }

    /**
     * XMLFormatHandler supports all XML and HTML-based documents.
     * @constructor
     * @extends FormatHandler
     */
    var XMLFormatHandler = function() {
        FormatHandler.call(this);
    }
    XML3D.createClass(XMLFormatHandler, FormatHandler);

    XMLFormatHandler.prototype.isFormatSupported = function(response, responseType, mimetype) {
        return response && response.nodeType === 9 && (mimetype === "application/xml" || mimetype === "text/xml");
    }

    XMLFormatHandler.prototype.getFormatData = function(response, responseType, mimetype) {
        return response;
    }

    XMLFormatHandler.prototype.getFragmentData = function(documentData, fragment) {
        return documentData.querySelectorAll("*[id=" + fragment + "]")[0];
    }


    /**
     *
     * @constructor
     * @extends FormatHandler
     */
    var XML3DFormatHandler = function() {
        XMLFormatHandler.call(this);
    }
    XML3D.createClass(XML3DFormatHandler, XMLFormatHandler);

    XML3DFormatHandler.prototype.isFormatSupported = function(response, responseType, mimetype) {
        var supported = XMLFormatHandler.prototype.isFormatSupported.call(this, response, responseType, mimetype);
        // FIXME add check by searching for 'xml3d' tags in the document
        return supported;
    }

    XML3DFormatHandler.prototype.getFormatData = function(response, responseType) {
        // Configure all xml3d elements:
        var xml3dElements = response.querySelectorAll("xml3d");
        for (var i = 0; i < xml3dElements.length; ++i) {
            XML3D.config.element(xml3dElements[i]);
        }

        return response;
    }

    /**
     * @constructor
     * @extends FormatHandler
     */
    var JSONFormatHandler = function() {
        FormatHandler.call(this);
    }
    XML3D.createClass(JSONFormatHandler, FormatHandler);

    JSONFormatHandler.prototype.isFormatSupported = function(response, responseType, mimetype) {
        return mimetype === "application/json";
    }

    JSONFormatHandler.prototype.getFormatData = function(response, responseType, mimetype) {
        return response;
    }

    /**
     * @constructor
     * @extends FormatHandler
     */
    var BinaryFormatHandler = function() {
        FormatHandler.call(this);
    }
    XML3D.createClass(BinaryFormatHandler, FormatHandler);

    // Exports
    XML3D.base.JSONFormatHandler = JSONFormatHandler;
    XML3D.base.BinaryFormatHandler = BinaryFormatHandler;
    XML3D.base.XMLFormatHandler = XMLFormatHandler;
    XML3D.base.XML3DFormatHandler = XML3DFormatHandler;
    XML3D.base.xml3dFormatHandler = new XML3DFormatHandler();
    XML3D.base.FormatHandler = FormatHandler;

    XML3D.base.registerFormat(XML3D.base.xml3dFormatHandler);

}());
(function() {

    /**
     * Types of change events
     * @enum {number}
     */
  var events = {
          NODE_INSERTED: 0,
          VALUE_MODIFIED:  1,
          NODE_REMOVED: 2,
          DANGLING_REFERENCE: 3,
          VALID_REFERENCE: 4,
          THIS_REMOVED: 5,
          ADAPTER_HANDLE_CHANGED: 6,
          ADAPTER_VALUE_CHANGED: 7
  };

  //-----------------------------------------------------------------------------
  //Class Notification
  //-----------------------------------------------------------------------------
  events.Notification = function(type) {
      this.type = type;
  };
  var Np = events.Notification.prototype;
  Np.toString = function() {
    return "Notification (type:" + this.type + ")";
  };
  //-----------------------------------------------------------------------------
  events.NotificationWrapper = function(evt, type) {
      this.wrapped = evt;
      this.type = type;
  };
  XML3D.createClass(events.NotificationWrapper, events.Notification);
  var NWp = events.NotificationWrapper.prototype;
  NWp.toString = function() {
      return "NotificationWrapper (type:" + this.type + ", wrapped: "+ this.wrapped +")";
  };

  //-----------------------------------------------------------------------------

    /**
     * @param {AdapterHandle} handle
     * @param {int} type
     * @constructor
     */
    events.AdapterHandleNotification = function (handle, type) {
        this.adapterHandle = handle;
        this.type = type;
    };
    XML3D.createClass(events.AdapterHandleNotification, events.Notification);
    events.AdapterHandleNotification.prototype.toString = function () {
        return "AdapterHandleNotification (type:" + this.type + ")";
    };
    //-----------------------------------------------------------------------------

  events.ConnectedAdapterNotification = function(adapterHandleNotification, key) {
    this.adapter = adapterHandleNotification.adapterHandle.getAdapter();
    this.key = key;
    this.url = adapterHandleNotification.adapterHandle.url;
    this.type = adapterHandleNotification.type;
    this.handleStatus = adapterHandleNotification.adapterHandle.status;
  };
  XML3D.createClass(events.ConnectedAdapterNotification, events.Notification);
  events.ConnectedAdapterNotification.prototype.toString = function() {
    return "ConnectedAdapterNotification (type:" + this.type + ", key: " + this.key + ")";
  };

  XML3D.events = XML3D.events || {};
  XML3D.extend(XML3D.events, events);

}());
XML3D.config = XML3D.config || {};

XML3D.config.isXML3DElement = function(e) {
    return (e.nodeType === Node.ELEMENT_NODE && (e.namespaceURI == XML3D.xml3dNS));
};

/**
 * @param {Element} element
 * @param {boolean=} selfmonitoring: whether to register listeners on element for node 
 *                  addition/removal and attribute modification. This property is propagated
 *                  to children. 
 * @return {undefined}
 */
XML3D.config.element = function(element, selfmonitoring) {
    if (element._configured === undefined ) {//&& XML3D.config.isXML3DElement(element)
        var classInfo = XML3D.classInfo[element.localName];
        if (classInfo === undefined) {
            XML3D.debug.logInfo("Unrecognised element " + element.localName);
        } else {
            element._configured = element.localName == "xml3d" ?
                      new XML3D.XML3DHandler(element)
                    : new XML3D.ElementHandler(element,selfmonitoring);
            element._configured.registerAttributes(classInfo);
            // Fix difference in Firefox (undefined) and Chrome (null)
            if (element.style == undefined)
                element.style = null;
            var n = element.firstElementChild;

            XML3D.base.resourceManager.notifyNodeIdChange(element, null, element.getAttribute("id"));

            while(n) {
                XML3D.config.element(n, selfmonitoring);
                n = n.nextElementSibling;
            }
        }
    }
};

/**
 * @param {Element} element
 * @param {boolean=} selfmonitoring: whether to register listeners on element for node 
 *                  addition/removal and attribute modification. This property is propagated
 *                  to children. 
 * @return {undefined}
 */
XML3D.config.configure = function(element, selfmonitoring) {
    if (Array.isArray(element)) {
        Array.forEach(element, function(el) {
            XML3D.config.element(el, selfmonitoring); 
        });
    } else {
        XML3D.config.element(element, selfmonitoring);
    }
};
// dom.js

(function($) {
    if ($)
        return;
    var doc = {};
    var nativeGetElementById = document.getElementById;
    doc.getElementById = function(id) {
        var elem = nativeGetElementById.call(this, id);
        if (elem) {
            return elem;
        } else {
            var elems = this.getElementsByTagName("*");
            for ( var i = 0; i < elems.length; i++) {
                var node = elems[i];
                if (node.getAttribute("id") === id) {
                    return node;
                }
            }
        }
        return null;
    };
    var nativeCreateElementNS = document.createElementNS;
    doc.createElementNS = function(ns, name) {
        var r = nativeCreateElementNS.call(this, ns, name);
        if (ns == XML3D.xml3dNS || XML3D.classInfo[name.toLowerCase()]) {
            XML3D.config.element(r, true);
        }
        return r;
    };
    var nativeCreateElement = document.createElement;
    doc.createElement = function(name) {
        var r = nativeCreateElement.call(this, name);
        if (XML3D.classInfo[name.toLowerCase()] ) {
            XML3D.config.element(r, true);
        }
        return r;
    };

    XML3D.extend(window.document, doc);

}(XML3D._native));

/*
 * Workaround for DOMAttrModified issues in WebKit based browsers:
 * https://bugs.webkit.org/show_bug.cgi?id=8191
 */
if (navigator.userAgent.indexOf("WebKit") != -1) {
    var attrModifiedWorks = false;
    var listener = function() {
        attrModifiedWorks = true;
    };
    document.documentElement.addEventListener("DOMAttrModified", listener, false);
    document.documentElement.setAttribute("___TEST___", true);
    document.documentElement.removeAttribute("___TEST___");
    document.documentElement.removeEventListener("DOMAttrModified", listener, false);

    if (!attrModifiedWorks) {
        Element.prototype.__setAttribute = HTMLElement.prototype.setAttribute;

        Element.prototype.setAttribute = function(attrName, newVal) {
            var prevVal = this.getAttribute(attrName);
            this.__setAttribute(attrName, newVal);
            newVal = this.getAttribute(attrName);

            // if (newVal != prevVal)
            {
                var evt = document.createEvent("MutationEvent");
                evt.initMutationEvent("DOMAttrModified", true, false, this, prevVal || "", newVal || "", attrName, (prevVal == null) ? MutationEvent.ADDITION
                        : MutationEvent.MODIFICATION);
                this.dispatchEvent(evt);
            }
        };

        Element.prototype.__removeAttribute = HTMLElement.prototype.removeAttribute;
        Element.prototype.removeAttribute = function(attrName) {
            var prevVal = this.getAttribute(attrName);
            this.__removeAttribute(attrName);
            var evt = document.createEvent("MutationEvent");
            evt.initMutationEvent("DOMAttrModified", true, false, this, prevVal, "", attrName, MutationEvent.REMOVAL);
            this.dispatchEvent(evt);
        };
    }
}

(function() {

    var handler = {}, events = XML3D.events;

    function attrModified(e) {

        var eh = e.target._configured;
        var handler = eh && eh.handlers[e.attrName];
        if(!handler)
            return;

        var notified = false;
        if (handler.setFromAttribute) {
            notified = handler.setFromAttribute(e.newValue, e.prevValue);
        }
        if (!notified) {
            var n = new events.NotificationWrapper(e);
            n.type = events.VALUE_MODIFIED;
            eh.notify(n);
        }
    };

    function nodeRemoved(e) {
        var parent = e.relatedNode,
        removedChild = e.target,
        parentHandler = parent._configured;

        if(!parentHandler)
            return;

        var n = new events.NotificationWrapper(e);

        if (removedChild.nodeType == Node.TEXT_NODE && parentHandler.handlers.value) {
            n.type = events.VALUE_MODIFIED;
            parentHandler.handlers.value.resetValue();
        } else {
            n.type = events.NODE_REMOVED;
            parentHandler.notify(n);
            if(removedChild._configured) {
                n.type = events.THIS_REMOVED;
                removeRecursive(removedChild,n);
                notifyNodeIdChangeRecursive(removedChild);
            }
        }
        // TODO: Quick fix, solve issue of self monitoring elements better
        //Quick fix for ghost element bug

        // Dynamically generated objects are self-monitoring, means listening for their own changes.
        // Once added to the scene, they should stop, otherwise multiple events are received that lead
        // i.e. to multiple draw objects per mesh.
        // Now the first event handler stops propagation of the event, but this can have strange side-FX,
        // if i.e. nodes are monitored from outside.
        e.stopPropagation();
    }

    function removeRecursive(element, evt) {
        if(element._configured) {
            element._configured.notify(evt);
            element._configured.remove(evt);
        }
        var n = element.firstElementChild;
        while(n) {
            removeRecursive(n,evt);
            n = n.nextElementSibling;
        }
    }

    function notifyNodeIdChangeRecursive(element){
        // We call this here in addition to nodeRemovedFromDocument, since the later is not supported by Firefox
        // TODO: Remove this function call once DOMNodeRemoveFromDocument is supported by all major browsers
        XML3D.base.resourceManager.notifyNodeIdChange(element, element.id, null);

        var n = element.firstElementChild;
        while(n) {
            notifyNodeIdChangeRecursive(n);
            n = n.nextElementSibling;
        }
    }


    function nodeInserted(e) {
        var parent = e.relatedNode,
        insertedChild = e.target,
        parentHandler = parent._configured;

        if(!parentHandler || e.currentTarget === insertedChild)
            return;

        var n = new events.NotificationWrapper(e);

        if (insertedChild.nodeType == Node.TEXT_NODE && parentHandler.handlers.value) {
            n.type = events.VALUE_MODIFIED;
            parentHandler.handlers.value.resetValue();
        } else {
            XML3D.config.element(insertedChild);
            n.type = events.NODE_INSERTED;
            addRecursive(insertedChild);
        }
        parentHandler.notify(n);
        // TODO: Quick fix, solve issue of self monitoring elements better
        e.stopPropagation();
    }

    // TODO: Remove this function once DOMNodeInsertedIntoDocument is supported by all major browsers
    function addRecursive(element){
        var n = element.firstElementChild;
        while(n) {
            addRecursive(n);
            n = n.nextElementSibling;
        }
        // We call this here in addition to nodeInsertedIntoDocument, since the later is not supported by Firefox

        XML3D.base.resourceManager.notifyNodeIdChange(element, null, element.id);
    }

    function nodeInsertedIntoDocument(e){
        var node = e.target;
        XML3D.base.resourceManager.notifyNodeIdChange(node, null, node.id);
    }

    function nodeRemovedFromDocument(e){
        var node = e.target;
        XML3D.base.resourceManager.notifyNodeIdChange(node, node.id, null);
    }

    handler.ElementHandler = function(elem, monitor) {
        if (elem) {
            this.element = elem;
            this.handlers = {};
            this.adapters = {};

            if(monitor) {
                elem.addEventListener('DOMNodeRemoved', nodeRemoved, true);
                elem.addEventListener('DOMNodeInserted', nodeInserted, true);
                elem.addEventListener('DOMNodeInsertedIntoDocument', nodeInsertedIntoDocument, true);
                elem.addEventListener('DOMNodeRemovedFromDocument', nodeRemovedFromDocument, true);
                elem.addEventListener('DOMAttrModified', attrModified, true);
                this.monitoring = true;
            }
        }
    };

    handler.ElementHandler.prototype.registerAttributes = function(b) {
        var a = this.element;
        for ( var prop in b) {
            if (b[prop] === undefined) {
                delete a[prop];
            } else {
                if (b[prop].a !== undefined) {
                    var attrName = b[prop].id || prop;
                    var v = new b[prop].a(a, attrName, b[prop].params);
                    this.handlers[attrName] = v;
                    try {
                        Object.defineProperty(a, prop, v.desc);
                    } catch (e) {
                        XML3D.debug.logWarning("Can't configure " + a.nodeName + "::" + prop);
                    }
                } else if (b[prop].m !== undefined) {
                    a[prop] = b[prop].m;
                } else
                    XML3D.debug.logError("Can't configure " + a.nodeName + "::" + prop);
            }
        }
        return a;
    };


    handler.ElementHandler.prototype.registerMixed = function() {
        this.element.addEventListener('DOMCharacterDataModified', this, false);
    };

    handler.ElementHandler.prototype.handleEvent = function(e) {

        XML3D.debug.logDebug(e.type + " at " + e.currentTarget.localName + "/" + e.target);
        var n = new events.NotificationWrapper(e);

        switch (e.type) {
            case "DOMCharacterDataModified":
                n.type = events.VALUE_MODIFIED;
                this.handlers.value.resetValue();
                this.notify(n);
                break;
        };
    };


    /**
     * @param evt
     */
    handler.ElementHandler.prototype.notify =  function(evt) {
        var adapters = this.adapters;
        for(var a in adapters) {
            try {
                adapters[a].notifyChanged(evt);
            } catch (e) {
                XML3D.debug.logException(e);
            }
        }
    };

    /*
     * Get called, if the related node gets removed from the DOM
     */
    handler.ElementHandler.prototype.remove = function(evt) {
        //console.log("Remove " + this);
        for(var h in this.adapters) {
            var adapter = this.adapters[h];
            if(adapter.onDispose)
                adapter.onDispose();
            if(adapter.clearAdapterHandles)
                adapter.clearAdapterHandles();
        }
        this.adapters = {};
        for(var h in this.handlers) {
            var handler = this.handlers[h];
            if(handler.remove)
                handler.remove();
        }

    };

    handler.ElementHandler.prototype.toString = function() {
        return "ElementHandler ("+this.element.nodeName + ", id: "+this.element.id+")";
    };

    var delegateProperties = ["clientHeight", "clientLeft", "clientTop", "clientWidth",
        "offsetHeight", "offsetLeft", "offsetTop", "offsetWidth"];
    function delegateProp(name, elem, canvas) {
        var desc = {
            get : function() {
                return canvas[name];
            }
        };
        try {
            Object.defineProperty(elem, name, desc);
        } catch (e){
            XML3D.debug.logWarning("Can't configure " + elem.nodeName + "::" + name);
        };
    }

    handler.XML3DHandler = function(elem) {
        handler.ElementHandler.call(this, elem, true);
        var c = document.createElement("canvas");
        c.width = 800;
        c.height = 600;
        this.canvas = c;

        for(var i in delegateProperties) {
            delegateProp(delegateProperties[i], elem, c);
        }

        elem.getBoundingClientRect = function() {
            return c.getBoundingClientRect();
        };
    };

    XML3D.createClass(handler.XML3DHandler, handler.ElementHandler);

    // Export to xml3d namespace
    XML3D.extend(XML3D, handler);

}());
(function() {

    var string2bool = function(string) {
        switch (string.toLowerCase()) {
        case "true":
        case "1":
            return true;
        case "false":
        case "0":
            return false;
        default:
            return Boolean(string);
        }
    }, handler = {}, events = XML3D.events;

    var AttributeHandler = function(elem) {
        this.setter = function(e) {
        };
    };

    handler.IDHandler = function(elem, id) {
        this.setFromAttribute = function(value, prevValue) {
            XML3D.base.resourceManager.notifyNodeIdChange(elem, prevValue, value);
        }
        this.desc = {
            get : function() {
                return this.getAttribute(id) || "";
            },
            set : function(value) {
                this.setAttribute(id, value);
            }
        };
    };

    handler.StringAttributeHandler = function(elem, id) {
        this.desc = {
            get : function() {
                return this.getAttribute(id) || "";
            },
            set : function(value) {
                this.setAttribute(id, value);
            }
        };
    };

    // TODO: remove reference handler in webgl generator and remove this line
    handler.ReferenceHandler = handler.StringAttributeHandler;


    handler.EnumAttributeHandler = function(elem, id, p) {
        AttributeHandler.call(this, elem);
        var current = p.d;

        this.setFromAttribute = function(v) {
            var value = v.toLowerCase();
            current = (value && p.e[value] !== undefined) ? p.e[value] : p.d;
            return false;
        };
        if (elem.hasAttribute(id))
            this.setFromAttribute(elem.getAttribute(id));

        this.desc = {
            get : function() {
                return p.e[current];
            },
            set : function(v) {
                    // Attribute is set to whatever comes in
                this.setAttribute(id, v);
                var value = typeof v == 'string' ? v.toLowerCase() : undefined;
                if (value && p.e[value] !== undefined)
                    current = p.e[value];
                else
                    current = p.d;
            }
        };
    };
    handler.EnumAttributeHandler.prototype = new AttributeHandler();
    handler.EnumAttributeHandler.prototype.constructor = handler.EnumAttributeHandler;

    handler.EventAttributeHandler = function(elem, id) {
        AttributeHandler.call(this, elem);
        var f = null;
        this.setFromAttribute = function(value) {
            f = null;
            return false;
        };
        this.desc = {
            get : function() {
                if (f)
                    return f;
                if (!this.hasAttribute(id) || f === undefined)
                    return null;
                return eval("crx = function onclick(event){\n  " + this.getAttribute(id) + "\n}");
            },
            set : function(value) {
                f = (typeof value == 'function') ? value : undefined;
                this._configured.notify( {
                    attrName : id,
                    relatedNode : elem
                });
            }
        };
    };
    handler.EventAttributeHandler.prototype = new AttributeHandler();
    handler.EventAttributeHandler.prototype.constructor = handler.EventAttributeHandler;

    handler.IntAttributeHandler = function(elem, id, defaultValue) {
        var current = defaultValue;

        this.setFromAttribute = function(value) {
            var v = value.match(/^\d+/);
            current = v ? +v[0] : defaultValue;
            if(elem._configured.canvas)
                elem._configured.canvas[id] = current;
            return false;
        };
        if (elem.hasAttribute(id))
            this.setFromAttribute(elem.getAttribute(id));

        this.desc = {
            get : function() {
                return current;
            },
            set : function(value) {
                var v = +value;
                current = isNaN(v) ? defaultValue : Math.floor(v);
                this.setAttribute(id, current + '');
            }
        };
    };
    handler.IntAttributeHandler.prototype = new AttributeHandler();
    handler.IntAttributeHandler.prototype.constructor = handler.IntAttributeHandler;

    handler.FloatAttributeHandler = function(elem, id, defaultValue) {
        var current = defaultValue;

        this.setFromAttribute = function(value) {
            var v = +value;
            current = isNaN(v) ? defaultValue : v;
            return false;
        };
        if (elem.hasAttribute(id))
            this.setFromAttribute(elem.getAttribute(id));

        this.desc = {
            get : function() {
                return current;
            },
            set : function(value) {
                var v = +value;
                current = isNaN(v) ? defaultValue : v;
                this.setAttribute(id, current + '');
            }
        };
    };

    handler.BoolAttributeHandler = function(elem, id, defaultValue) {
        var current = defaultValue;

        this.setFromAttribute = function(value) {
            current = string2bool(value + '');
            return false;
        };
        if (elem.hasAttribute(id))
            this.setFromAttribute(elem.getAttribute(id));

        this.desc = {
            get : function() {
                return current;
            },
            set : function(value) {
                current = Boolean(value);
                this.setAttribute(id, current + '');
            }
        };
    };

    handler.XML3DVec3AttributeHandler = function(elem, id, d) {
        var v = null;
        var that = this;
        var changed = function(value) {
            elem.setAttribute(id, value.x + " " + value.y + " " + value.z);
        };

        this.setFromAttribute = function(value) {
            if (!v) {
                v = new window.XML3DVec3(0, 0, 0, changed);
            }
            var m = /^\s*(\S+)\s+(\S+)\s+(\S+)\s*$/.exec(value);
            if (!m) {
                v._data.set(d);
            } else {
                v._data[0] = m[1];
                v._data[1] = m[2];
                v._data[2] = m[3];
            }
            return false;
        };

        this.desc = {
            get : function() {
                if (!v) {
                    if (this.hasAttribute(id))
                        that.setFromAttribute(this.getAttribute(id));
                    else
                        v = new window.XML3DVec3(d[0], d[1], d[2], changed);
                }
                return v;
            },
            set : function(value) {
                throw Error("Can't set " + elem.nodeName + "::" + id + ": it's readonly");
            }
        };
    };

    handler.XML3DRotationAttributeHandler = function(elem, id, d) {
        var v = null;
        var that = this;
        var changed = function(v) {
            elem.setAttribute(id, v.axis.x + " " + v.axis.y + " " + v.axis.z + " " + v.angle);
        };

        this.setFromAttribute = function(value) {
            if (!v) {
                v = new window.XML3DRotation(null, null, changed);
            }
            var m = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/.exec(value);
            if (!m) {
                v._axis._data[0] = d[0];
                v._axis._data[1] = d[1];
                v._axis._data[2] = d[2];
                v._angle = d[3];
                v._updateQuaternion();
            } else {
                v._axis._data[0] = +m[1];
                v._axis._data[1] = +m[2];
                v._axis._data[2] = +m[3];
                v._angle = +m[4];
                v._updateQuaternion();
            }
            return false;
        };

        this.desc = {
            get : function() {
                if (!v) {
                    if (this.hasAttribute(id))
                        that.setFromAttribute(this.getAttribute(id));
                    else
                        v = new window.XML3DRotation(new window.XML3DVec3(d[0], d[1], d[2]), d[3], changed);
                }
                return v;
            },
            set : function(value) {
                throw Error("Can't set " + elem.nodeName + "::" + id + ": it's readonly");
            }
        };
    };

    var mixedContent = function(elem, ta, handler) {
        elem._configured.registerMixed();
        return {
            get : function() {
                if (!ta.value) {
                    ta.value = handler.parse(elem);
                }
                return ta.value;
            },
            set : function(value) {
                // Throw error?
            throw Error("Can't set " + elem.nodeName + "::value: it's readonly");
        }
        };
    };

    var getContent = function(elem) {
        var str = "";
        var k = elem.firstChild;
        while (k) {
            str += k.nodeType == 3 ? k.textContent : " ";
            k = k.nextSibling;
        }
        return str;
    };

    handler.FloatArrayValueHandler = function(elem, id) {
        var ta = {};
        this.desc = mixedContent(elem, ta, this);
        this.resetValue = function() { ta.value = null; };
    };

    handler.FloatArrayValueHandler.prototype.parse = function(elem) {
        var exp = /([+\-0-9eE\.]+)/g;
        var str = getContent(elem);
        var m = str.match(exp);
        return m ? new Float32Array(m) : new Float32Array();
    };

    handler.Float2ArrayValueHandler = handler.FloatArrayValueHandler;
    handler.Float3ArrayValueHandler = handler.FloatArrayValueHandler;
    handler.Float4ArrayValueHandler = handler.FloatArrayValueHandler;
    handler.Float4x4ArrayValueHandler = handler.FloatArrayValueHandler;

    handler.IntArrayValueHandler = function(elem, id) {
        var ta = {};
        this.desc = mixedContent(elem, ta, this);
        this.resetValue = function() { ta.value = null; };
    };
    handler.IntArrayValueHandler.prototype.parse = function(elem) {
        var exp = /([+\-0-9]+)/g;
        var str = getContent(elem);
        var m = str.match(exp);
        return m ? new Int32Array(m) : new Int32Array();
    };

    handler.BoolArrayValueHandler = function(elem, id) {
        var ta = {};
        this.desc = mixedContent(elem, ta, this);
        this.resetValue = function() { ta.value = null; };
    };
    handler.BoolArrayValueHandler.prototype.parse = function(elem) {
        var exp = /(true|false|0|1)/ig;
        var str = getContent(elem);
        var m = str.match(exp);
        if (!m)
            return new Uint8Array();
        m = Array.map(m, string2bool);
        return m ? new Uint8Array(m) : new Uint8Array();
    };

    handler.CanvasStyleHandler = function(e, id, d) {
        var canvas = e._configured.canvas;
        this.desc = {};
        this.desc.get = function() { return canvas.style; };
        this.desc.set = function(value) {};
        this.setFromAttribute = function(value) {
            canvas.setAttribute(id, value);
        };
        if (e.hasAttribute(id))
            this.setFromAttribute(e.getAttribute(id));
    };

    handler.CanvasClassHandler = function(e, id) {
        var canvas = e._configured.canvas;
        canvas.className = "_xml3d"; // Class name always defined for xml3d canvas
        this.desc = {};
        this.desc.get = function() { return canvas.className; };
        this.desc.set = function(value) { canvas.className = value; };
        this.setFromAttribute = function(value) {
            canvas.setAttribute(id, value + " _xml3d");
        };
        if (e.hasAttribute(id))
            this.setFromAttribute(e.getAttribute(id));
    };

    // Export to xml3d namespace
    XML3D.extend(XML3D, handler);

}());
// methods.js
XML3D.methods = XML3D.methods || {};

new (function() {

    var methods = {};

    methods.xml3dCreateXML3DVec3 = function() {
        return new window.XML3DVec3();
    };

    methods.xml3dCreateXML3DRay = function() {
        return new window.XML3DRay();
    };

    methods.xml3dGetElementByRay = function() {
        XML3D.debug.logError(this.nodeName + "::getElementByRay is not implemeted yet.");
        return null;
    };

    methods.xml3dCreateXML3DMatrix = function() {
        return new window.XML3DMatrix();
    };

    methods.xml3dCreateXML3DRotation = function() {
        return new window.XML3DRotation();
    };

    methods.viewGetDirection = function() {
        return this.orientation.rotateVec3(new window.XML3DVec3(0, 0, -1));
    };

    methods.viewSetPosition = function(pos) {
        this.position = pos;
    };

    var tmpX = XML3D.math.vec3.create();
    var tmpY = XML3D.math.vec3.create();
    var tmpZ = XML3D.math.vec3.create();

    XML3D.math.quat.setFromMat3 = function(m, dest) {
        var tr = m[0] + m[4] + m[8];

        if (tr > 0) {
            var s = Math.sqrt(tr + 1.0) * 2; // s=4*dest[3]
            dest[0] = (m[7] - m[5]) / s;
            dest[1] = (m[2] - m[6]) / s;
            dest[2] = (m[3] - m[1]) / s;
            dest[3] = 0.25 * s;
        } else if ((m[0] > m[4]) & (m[0] > m[8])) {
            var s = Math.sqrt(1.0 + m[0] - m[4] - m[8]) * 2; // s=4*qx
            dest[3] = (m[7] - m[5]) / s;
            dest[0] = 0.25 * s;
            dest[1] = (m[1] + m[3]) / s;
            dest[2] = (m[2] + m[6]) / s;
        } else if (m[4] > m[8]) {
            var s = Math.sqrt(1.0 + m[4] - m[0] - m[8]) * 2; // s=4*qy
            dest[3] = (m[2] - m[6]) / s;
            dest[0] = (m[1] + m[3]) / s;
            dest[1] = 0.25 * s;
            dest[2] = (m[5] + m[7]) / s;
        } else {
            var s = Math.sqrt(1.0 + m[8] - m[0] - m[4]) * 2; // s=4*qz
            dest[3] = (m[3] - m[1]) / s;
            dest[0] = (m[2] + m[6]) / s;
            dest[1] = (m[5] + m[7]) / s;
            dest[2] = 0.25 * s;
        }
    };

    XML3D.math.quat.setFromBasis = function(X,Y,Z,dest) {
        var lx = 1.0 / XML3D.math.vec3.length(X);
        var ly = 1.0 / XML3D.math.vec3.length(Y);
        var lz = 1.0 / XML3D.math.vec3.length(Z);
        var m = XML3D.math.mat3.create();
        m[0] = X[0] * lx;
        m[1] = Y[0] * ly;
        m[2] = Z[0] * lz;
        m[3] = X[1] * lx;
        m[4] = Y[1] * ly;
        m[5] = Z[1] * lz;
        m[6] = X[2] * lx;
        m[7] = Y[2] * ly;
        m[8] = Z[2] * lz;
        XML3D.math.quat.setFromMat3(m,dest);
    };

    methods.viewSetDirection = function(direction) {
        direction = direction || new window.XML3DVec3(0,0,-1);
        direction = direction.normalize();

        var up = this.orientation.rotateVec3(new window.XML3DVec3(0,1,0));
        up = up.normalize();

        XML3D.math.vec3.cross(tmpX,direction._data,up._data);
        if(!XML3D.math.vec3.length(tmpX)) {
                tmpX = this.orientation.rotateVec3(new window.XML3DVec3(1,0,0))._data;
        }
        XML3D.math.vec3.cross(tmpY,tmpX,direction._data);
        XML3D.math.vec3.negate(tmpZ,direction._data);

        var q = XML3D.math.quat.create();
        XML3D.math.quat.setFromBasis(tmpX, tmpY, tmpZ, q);
        this.orientation._setQuaternion(q);
    };

    methods.viewSetUpVector = function(up) {
        up = up || new window.XML3DVec3(0,1,0);
        up = up.normalize();

        var r = new window.XML3DRotation();
        r.setRotation(new window.XML3DVec3(0,1,0),up);
        r = this.orientation.multiply(r);
        r = r.normalize();
        this.orientation.set(r);
    };

    methods.viewGetUpVector = function() {
        return this.orientation.rotateVec3(new window.XML3DVec3(0, 1, 0));
    };

    methods.viewLookAt = function(point) {
        this.setDirection(point.subtract(this.position));
    };

    methods.viewGetViewMatrix = function() {
        var adapters = this._configured.adapters || {};
        for ( var adapter in adapters) {
            if (adapters[adapter].getViewMatrix) {
                return adapters[adapter].getViewMatrix();
            }
        }
        // Fallback implementation
        var p = this.position;
        var r = this.orientation;
        var a = r.axis;
        return new window.XML3DMatrix().translate(p.x, p.y, p.z).rotateAxisAngle(a.x, a.y, a.z, r.angle).inverse();
    };

    methods.xml3dGetElementByPoint = function(x, y, hitPoint, hitNormal) {
        var adapters = this._configured.adapters || {};
        for (var adapter in adapters) {
            if (adapters[adapter].getElementByPoint) {
                return adapters[adapter].getElementByPoint(x, y, hitPoint, hitNormal);
            }
        }
        return null;
    };

    methods.xml3dGenerateRay = function(x, y) {
        var adapters = this._configured.adapters || {};
        for (var adapter in adapters) {
            if (adapters[adapter].generateRay) {
                return adapters[adapter].generateRay(x, y);
            }
        }
        return new window.XML3DRay();
    };

    methods.groupGetLocalMatrix = function() {
        var adapters = this._configured.adapters || {};
        for ( var adapter in adapters) {
            if (adapters[adapter].getLocalMatrix) {
                return adapters[adapter].getLocalMatrix();
            }
        }
        return new window.XML3DMatrix();
    };

    /**
     * return the bounding box that is the bounding box of all children.
     */
    methods.groupGetBoundingBox = function() {
        var adapters = this._configured.adapters || {};
        for (var adapter in adapters) {
            if (adapters[adapter].getBoundingBox) {
                return adapters[adapter].getBoundingBox();
            }
        }
        return new window.XML3DBox();
    };
    methods.xml3dGetBoundingBox = methods.groupGetBoundingBox;

    /**
     * returns the bounding box of this mesh in world space.
     */
    methods.meshGetBoundingBox = function() {
        var adapters = this._configured.adapters || {};
        for (var adapter in adapters) {
            if (adapters[adapter].getBoundingBox) {
                return adapters[adapter].getBoundingBox();
            }
        }
        return new window.XML3DBox();
    };

    methods.XML3DGraphTypeGetWorldMatrix = function() {
        var adapters = this._configured.adapters || {};
        for (var adapter in adapters) {
            if (adapters[adapter].getWorldMatrix) {
                return adapters[adapter].getWorldMatrix();
            }
        }
        return new window.XML3DMatrix();
    };

    methods.videoPlay = function() {
        XML3D.base.sendAdapterEvent(this, {play: []});
    };

    methods.videoPause = function() {
        XML3D.base.sendAdapterEvent(this, {pause: []});
    };

    methods.XML3DNestedDataContainerTypeGetOutputNames =
    methods.XML3DShaderProviderTypeGetOutputNames =
    methods.meshGetOutputNames = function() {
        var dataAdapter = XML3D.base.resourceManager.getAdapter(this, XML3D.data);
        if(dataAdapter){
            return dataAdapter.getOutputNames();
        }
        return null;
    };

    methods.XML3DNestedDataContainerTypeGetResult =
    methods.XML3DShaderProviderTypeGetResult =
    methods.meshGetResult = function(filter) {

        var dataAdapter = XML3D.base.resourceManager.getAdapter(this, XML3D.data);
        if(dataAdapter){
            var result = dataAdapter.getComputeResult(filter);
            if(!result) return null;
            return new window.XML3DDataResult(result);
        }
        return null;
    };

    methods.XML3DNestedDataContainerTypeGetOutputChannelInfo =
    methods.XML3DShaderProviderTypeGetOutputChannelInfo =
    methods.meshGetOutputChannelInfo = function(name){
        var dataAdapter = XML3D.base.resourceManager.getAdapter(this, XML3D.data);
        if(dataAdapter){
            var result = dataAdapter.getOutputChannelInfo(name);
            if(!result) return null;
            return new window.XML3DDataChannelInfo(result.type, result.origin, result.originalName,
                result.seqLength, result.seqMinKey, result.seqMaxKey);
        }
        return null;
    }

    methods.XML3DNestedDataContainerTypeGetComputeInfo =
    methods.XML3DShaderProviderTypeGetComputeInfo =
    methods.meshGetComputeInfo = function(){
        XML3D.debug.logError(this.nodeName + "::getComputeInfo is not implemeted yet.");
        return null;
    }

    methods.XML3DNestedDataContainerTypeGetProtoInfo =
    methods.XML3DShaderProviderTypeGetProtoInfo =
    methods.meshGetProtoInfo = function(){
        XML3D.debug.logError(this.nodeName + "::getProtoInfo is not implemeted yet.");
        return null;
    }

    methods.XML3DNestedDataContainerTypeIsOutputConnected =
    methods.XML3DShaderProviderTypeIsOutputConnected =
    methods.meshIsOutputConnected = function(){
        XML3D.debug.logError(this.nodeName + "::isOutputConnected is not implemeted yet.");
        return false;
    }


    function createValues(result, names) {
        var values = {};
        for (var i in names) {
            var name = names[i];
            var data = result.getOutputData(name) && result.getOutputData(name).getValue();
            if (data)
                values[name] = data;
        }
        return values;
    };

    /** Register data listener for data fields specified by names.
     *
     * @param names   single name or array of names that are monitored.
     * @param callback function that is called when selected data are changed.
     * @return {Boolean}
     */
    methods.dataAddOutputFieldListener = function(names, callback) {
        if (!names)
            return false;

        // check if names is a single string, and convert it to array then
        var typeOfNames = Object.prototype.toString.call(names).slice(8, -1);
        if (typeOfNames === "String") {
            names = [names];
        }
        if (names.length == 0)
            return false;

        var request = XML3D.base.callAdapterFunc(this, {
            getComputeRequest : [names, function(request, changeType) {
                callback(createValues(request.getResult(), names));
            }
            ]});
        if (request.length == 0)
            return false;
        var result = request[0].getResult();
        var values = createValues(result, names);
        if (Object.keys(values).length)
            callback(values);
        return true;
    };

    XML3D.scriptValueLabel = "[value set by script]";


    methods.XML3DDataSourceTypeSetScriptValue = function(data){
        var configData = this._configured;

        if(!configData)
            return;

        if(this.textContent != XML3D.scriptValueLabel)
            this.textContent = XML3D.scriptValueLabel;
        configData.scriptValue = data;

        var dataAdapter = XML3D.base.resourceManager.getAdapter(this, XML3D.data);
        if(dataAdapter)
            dataAdapter.setScriptValue(data);


    };

    // Export to xml3d namespace
    XML3D.extend(XML3D.methods, methods);
});
/* START GENERATED: All following code is generated from the specification. Do not edit manually */
// MeshTypes
XML3D.MeshTypes = {};
XML3D.MeshTypes["triangles"] = 0;
XML3D.MeshTypes[0] = "triangles";
XML3D.MeshTypes["trianglestrips"] = 1;
XML3D.MeshTypes[1] = "trianglestrips";
XML3D.MeshTypes["lines"] = 2;
XML3D.MeshTypes[2] = "lines";
XML3D.MeshTypes["linestrips"] = 3;
XML3D.MeshTypes[3] = "linestrips";
XML3D.MeshTypes["points"] = 4;
XML3D.MeshTypes[4] = "points";
// TextureTypes
XML3D.TextureTypes = {};
XML3D.TextureTypes["2d"] = 0;
XML3D.TextureTypes[0] = "2d";
XML3D.TextureTypes["1d"] = 1;
XML3D.TextureTypes[1] = "1d";
XML3D.TextureTypes["3d"] = 2;
XML3D.TextureTypes[2] = "3d";
// FilterTypes
XML3D.FilterTypes = {};
XML3D.FilterTypes["none"] = 0;
XML3D.FilterTypes[0] = "none";
XML3D.FilterTypes["nearest"] = 1;
XML3D.FilterTypes[1] = "nearest";
XML3D.FilterTypes["linear"] = 2;
XML3D.FilterTypes[2] = "linear";
// WrapTypes
XML3D.WrapTypes = {};
XML3D.WrapTypes["clamp"] = 0;
XML3D.WrapTypes[0] = "clamp";
XML3D.WrapTypes["repeat"] = 1;
XML3D.WrapTypes[1] = "repeat";
XML3D.WrapTypes["border"] = 2;
XML3D.WrapTypes[2] = "border";
// DataFieldType
XML3D.DataFieldType = {};
XML3D.DataFieldType["float "] = 0;
XML3D.DataFieldType[0] = "float ";
XML3D.DataFieldType["float2 "] = 1;
XML3D.DataFieldType[1] = "float2 ";
XML3D.DataFieldType["float3"] = 2;
XML3D.DataFieldType[2] = "float3";
XML3D.DataFieldType["float4"] = 3;
XML3D.DataFieldType[3] = "float4";
XML3D.DataFieldType["float4x4"] = 4;
XML3D.DataFieldType[4] = "float4x4";
XML3D.DataFieldType["int"] = 10;
XML3D.DataFieldType[10] = "int";
XML3D.DataFieldType["int4"] = 11;
XML3D.DataFieldType[11] = "int4";
XML3D.DataFieldType["bool"] = 20;
XML3D.DataFieldType[20] = "bool";
XML3D.DataFieldType["texture"] = 30;
XML3D.DataFieldType[30] = "texture";
// DataChannelOrigin
XML3D.DataChannelOrigin = {};
XML3D.DataChannelOrigin["origin_value "] = 0;
XML3D.DataChannelOrigin[0] = "origin_value ";
XML3D.DataChannelOrigin["origin_child"] = 1;
XML3D.DataChannelOrigin[1] = "origin_child";
XML3D.DataChannelOrigin["origin_source"] = 2;
XML3D.DataChannelOrigin[2] = "origin_source";
XML3D.DataChannelOrigin["origin_compute"] = 3;
XML3D.DataChannelOrigin[3] = "origin_compute";
XML3D.DataChannelOrigin["origin_proto"] = 4;
XML3D.DataChannelOrigin[4] = "origin_proto";

XML3D.classInfo = {};

/**
 * Properties and methods for <xml3d>
 **/
XML3D.classInfo['xml3d'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.CanvasClassHandler, id: 'class'},
    style : {a: XML3D.CanvasStyleHandler},
    onclick : {a: XML3D.EventAttributeHandler},
    ondblclick : {a: XML3D.EventAttributeHandler},
    onmousedown : {a: XML3D.EventAttributeHandler},
    onmouseup : {a: XML3D.EventAttributeHandler},
    onmouseover : {a: XML3D.EventAttributeHandler},
    onmousemove : {a: XML3D.EventAttributeHandler},
    onmouseout : {a: XML3D.EventAttributeHandler},
    onkeypress : {a: XML3D.EventAttributeHandler},
    onkeydown : {a: XML3D.EventAttributeHandler},
    onkeyup : {a: XML3D.EventAttributeHandler},
    height : {a: XML3D.IntAttributeHandler, params: 600},
    width : {a: XML3D.IntAttributeHandler, params: 800},
    createXML3DVec3 : {m: XML3D.methods.xml3dCreateXML3DVec3},
    createXML3DRotation : {m: XML3D.methods.xml3dCreateXML3DRotation},
    createXML3DMatrix : {m: XML3D.methods.xml3dCreateXML3DMatrix},
    createXML3DRay : {m: XML3D.methods.xml3dCreateXML3DRay},
    getElementByPoint : {m: XML3D.methods.xml3dGetElementByPoint},
    generateRay : {m: XML3D.methods.xml3dGenerateRay},
    getElementByRay : {m: XML3D.methods.xml3dGetElementByRay},
    getBoundingBox : {m: XML3D.methods.xml3dGetBoundingBox},
    activeView : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <data>
 **/
XML3D.classInfo['data'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for data
    compute : {a: XML3D.StringAttributeHandler},
    filter : {a: XML3D.StringAttributeHandler},
    getOutputNames : {m: XML3D.methods.XML3DNestedDataContainerTypeGetOutputNames},
    getOutputChannelInfo : {m: XML3D.methods.XML3DNestedDataContainerTypeGetOutputChannelInfo},
    getComputeInfo : {m: XML3D.methods.XML3DNestedDataContainerTypeGetComputeInfo},
    getProtoInfo : {m: XML3D.methods.XML3DNestedDataContainerTypeGetProtoInfo},
    isOutputConnected : {m: XML3D.methods.XML3DNestedDataContainerTypeIsOutputConnected},
    getResult : {m: XML3D.methods.XML3DNestedDataContainerTypeGetResult},
    src : {a: XML3D.ReferenceHandler},
    proto : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <defs>
 **/
XML3D.classInfo['defs'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for defs
    _term: undefined
};
/**
 * Properties and methods for <group>
 **/
XML3D.classInfo['group'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for group
    onclick : {a: XML3D.EventAttributeHandler},
    ondblclick : {a: XML3D.EventAttributeHandler},
    onmousedown : {a: XML3D.EventAttributeHandler},
    onmouseup : {a: XML3D.EventAttributeHandler},
    onmouseover : {a: XML3D.EventAttributeHandler},
    onmousemove : {a: XML3D.EventAttributeHandler},
    onmouseout : {a: XML3D.EventAttributeHandler},
    onkeypress : {a: XML3D.EventAttributeHandler},
    onkeydown : {a: XML3D.EventAttributeHandler},
    onkeyup : {a: XML3D.EventAttributeHandler},
    visible : {a: XML3D.BoolAttributeHandler, params: true},
    getWorldMatrix : {m: XML3D.methods.XML3DGraphTypeGetWorldMatrix},
    getLocalMatrix : {m: XML3D.methods.groupGetLocalMatrix},
    getBoundingBox : {m: XML3D.methods.groupGetBoundingBox},
    transform : {a: XML3D.ReferenceHandler},
    shader : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <mesh>
 **/
XML3D.classInfo['mesh'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for mesh
    onclick : {a: XML3D.EventAttributeHandler},
    ondblclick : {a: XML3D.EventAttributeHandler},
    onmousedown : {a: XML3D.EventAttributeHandler},
    onmouseup : {a: XML3D.EventAttributeHandler},
    onmouseover : {a: XML3D.EventAttributeHandler},
    onmousemove : {a: XML3D.EventAttributeHandler},
    onmouseout : {a: XML3D.EventAttributeHandler},
    onkeypress : {a: XML3D.EventAttributeHandler},
    onkeydown : {a: XML3D.EventAttributeHandler},
    onkeyup : {a: XML3D.EventAttributeHandler},
    visible : {a: XML3D.BoolAttributeHandler, params: true},
    type : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.MeshTypes, d: 0}},
    compute : {a: XML3D.StringAttributeHandler},
    getWorldMatrix : {m: XML3D.methods.XML3DGraphTypeGetWorldMatrix},
    getBoundingBox : {m: XML3D.methods.meshGetBoundingBox},
    getOutputNames : {m: XML3D.methods.meshGetOutputNames},
    getOutputChannelInfo : {m: XML3D.methods.meshGetOutputChannelInfo},
    getComputeInfo : {m: XML3D.methods.meshGetComputeInfo},
    getProtoInfo : {m: XML3D.methods.meshGetProtoInfo},
    isOutputConnected : {m: XML3D.methods.meshIsOutputConnected},
    getResult : {m: XML3D.methods.meshGetResult},
    src : {a: XML3D.ReferenceHandler},
    proto : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <transform>
 **/
XML3D.classInfo['transform'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for transform
    translation : {a: XML3D.XML3DVec3AttributeHandler, params: [0, 0, 0]},
    scale : {a: XML3D.XML3DVec3AttributeHandler, params: [1, 1, 1]},
    rotation : {a: XML3D.XML3DRotationAttributeHandler, params: [0, 0, 1, 0]},
    center : {a: XML3D.XML3DVec3AttributeHandler, params: [0, 0, 0]},
    scaleOrientation : {a: XML3D.XML3DRotationAttributeHandler, params: [0, 0, 1, 0]},
    _term: undefined
};
/**
 * Properties and methods for <shader>
 **/
XML3D.classInfo['shader'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for shader
    compute : {a: XML3D.StringAttributeHandler},
    getOutputNames : {m: XML3D.methods.XML3DShaderProviderTypeGetOutputNames},
    getOutputChannelInfo : {m: XML3D.methods.XML3DShaderProviderTypeGetOutputChannelInfo},
    getComputeInfo : {m: XML3D.methods.XML3DShaderProviderTypeGetComputeInfo},
    getProtoInfo : {m: XML3D.methods.XML3DShaderProviderTypeGetProtoInfo},
    isOutputConnected : {m: XML3D.methods.XML3DShaderProviderTypeIsOutputConnected},
    getResult : {m: XML3D.methods.XML3DShaderProviderTypeGetResult},
    script : {a: XML3D.ReferenceHandler},
    src : {a: XML3D.ReferenceHandler},
    proto : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <light>
 **/
XML3D.classInfo['light'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for light
    onclick : {a: XML3D.EventAttributeHandler},
    ondblclick : {a: XML3D.EventAttributeHandler},
    onmousedown : {a: XML3D.EventAttributeHandler},
    onmouseup : {a: XML3D.EventAttributeHandler},
    onmouseover : {a: XML3D.EventAttributeHandler},
    onmousemove : {a: XML3D.EventAttributeHandler},
    onmouseout : {a: XML3D.EventAttributeHandler},
    onkeypress : {a: XML3D.EventAttributeHandler},
    onkeydown : {a: XML3D.EventAttributeHandler},
    onkeyup : {a: XML3D.EventAttributeHandler},
    visible : {a: XML3D.BoolAttributeHandler, params: true},
    global : {a: XML3D.BoolAttributeHandler, params: false},
    intensity : {a: XML3D.FloatAttributeHandler, params: 1},
    getWorldMatrix : {m: XML3D.methods.XML3DGraphTypeGetWorldMatrix},
    shader : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <lightshader>
 **/
XML3D.classInfo['lightshader'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for lightshader
    compute : {a: XML3D.StringAttributeHandler},
    getOutputNames : {m: XML3D.methods.XML3DShaderProviderTypeGetOutputNames},
    getOutputChannelInfo : {m: XML3D.methods.XML3DShaderProviderTypeGetOutputChannelInfo},
    getComputeInfo : {m: XML3D.methods.XML3DShaderProviderTypeGetComputeInfo},
    getProtoInfo : {m: XML3D.methods.XML3DShaderProviderTypeGetProtoInfo},
    isOutputConnected : {m: XML3D.methods.XML3DShaderProviderTypeIsOutputConnected},
    getResult : {m: XML3D.methods.XML3DShaderProviderTypeGetResult},
    script : {a: XML3D.ReferenceHandler},
    src : {a: XML3D.ReferenceHandler},
    proto : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <script>
 **/
XML3D.classInfo['script'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for script
    value : {a: XML3D.StringAttributeHandler},
    src : {a: XML3D.StringAttributeHandler},
    type : {a: XML3D.StringAttributeHandler},
    _term: undefined
};
/**
 * Properties and methods for <proto>
 **/
XML3D.classInfo['proto'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for proto
    compute : {a: XML3D.StringAttributeHandler},
    filter : {a: XML3D.StringAttributeHandler},
    getOutputNames : {m: XML3D.methods.XML3DNestedDataContainerTypeGetOutputNames},
    getOutputChannelInfo : {m: XML3D.methods.XML3DNestedDataContainerTypeGetOutputChannelInfo},
    getComputeInfo : {m: XML3D.methods.XML3DNestedDataContainerTypeGetComputeInfo},
    getProtoInfo : {m: XML3D.methods.XML3DNestedDataContainerTypeGetProtoInfo},
    isOutputConnected : {m: XML3D.methods.XML3DNestedDataContainerTypeIsOutputConnected},
    getResult : {m: XML3D.methods.XML3DNestedDataContainerTypeGetResult},
    src : {a: XML3D.ReferenceHandler},
    proto : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/**
 * Properties and methods for <float>
 **/
XML3D.classInfo['float'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.FloatArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <float2>
 **/
XML3D.classInfo['float2'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float2
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.Float2ArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <float3>
 **/
XML3D.classInfo['float3'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float3
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.Float3ArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <float4>
 **/
XML3D.classInfo['float4'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float4
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.Float4ArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <float4x4>
 **/
XML3D.classInfo['float4x4'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float4x4
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.Float4x4ArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <int>
 **/
XML3D.classInfo['int'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for int
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.IntArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <int4>
 **/
XML3D.classInfo['int4'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for int4
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.IntArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <bool>
 **/
XML3D.classInfo['bool'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for bool
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    value : {a: XML3D.BoolArrayValueHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <texture>
 **/
XML3D.classInfo['texture'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for texture
    name : {a: XML3D.StringAttributeHandler},
    param : {a: XML3D.BoolAttributeHandler, params: false},
    key : {a: XML3D.FloatAttributeHandler, params: 0.0},
    type : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.TextureTypes, d: 0}},
    filterMin : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.FilterTypes, d: 2}},
    filterMag : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.FilterTypes, d: 2}},
    filterMip : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.FilterTypes, d: 1}},
    wrapS : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.WrapTypes, d: 0}},
    wrapT : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.WrapTypes, d: 0}},
    wrapU : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.WrapTypes, d: 0}},
    borderColor : {a: XML3D.StringAttributeHandler},
    setScriptValue : {m: XML3D.methods.XML3DDataSourceTypeSetScriptValue},
    _term: undefined
};
/**
 * Properties and methods for <img>
 **/
XML3D.classInfo['img'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for img
    src : {a: XML3D.StringAttributeHandler},
    _term: undefined
};
/**
 * Properties and methods for <video>
 **/
XML3D.classInfo['video'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for video
    src : {a: XML3D.StringAttributeHandler},
    autoplay : {a: XML3D.BoolAttributeHandler, params: false},
    play : {m: XML3D.methods.videoPlay},
    pause : {m: XML3D.methods.videoPause},
    _term: undefined
};
/**
 * Properties and methods for <view>
 **/
XML3D.classInfo['view'] = {
    id : {a: XML3D.IDHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for view
    onclick : {a: XML3D.EventAttributeHandler},
    ondblclick : {a: XML3D.EventAttributeHandler},
    onmousedown : {a: XML3D.EventAttributeHandler},
    onmouseup : {a: XML3D.EventAttributeHandler},
    onmouseover : {a: XML3D.EventAttributeHandler},
    onmousemove : {a: XML3D.EventAttributeHandler},
    onmouseout : {a: XML3D.EventAttributeHandler},
    onkeypress : {a: XML3D.EventAttributeHandler},
    onkeydown : {a: XML3D.EventAttributeHandler},
    onkeyup : {a: XML3D.EventAttributeHandler},
    visible : {a: XML3D.BoolAttributeHandler, params: true},
    position : {a: XML3D.XML3DVec3AttributeHandler, params: [0, 0, 0]},
    orientation : {a: XML3D.XML3DRotationAttributeHandler, params: [0, 0, 1, 0]},
    fieldOfView : {a: XML3D.FloatAttributeHandler, params: 0.785398},
    getWorldMatrix : {m: XML3D.methods.XML3DGraphTypeGetWorldMatrix},
    setDirection : {m: XML3D.methods.viewSetDirection},
    setUpVector : {m: XML3D.methods.viewSetUpVector},
    lookAt : {m: XML3D.methods.viewLookAt},
    getDirection : {m: XML3D.methods.viewGetDirection},
    getUpVector : {m: XML3D.methods.viewGetUpVector},
    getViewMatrix : {m: XML3D.methods.viewGetViewMatrix},
    perspective : {a: XML3D.ReferenceHandler},
    _term: undefined
};
/* END GENERATED */
window=this;
var Xflow = {};

(function(){
    Xflow.EPSILON = 0.000001;

    /**
     * Type of DataEntry
     * @enum
     */
    Xflow.DATA_TYPE = {
        UNKNOWN: 0,
        FLOAT: 1,
        FLOAT2 : 2,
        FLOAT3 : 3,
        FLOAT4 : 4,
        FLOAT4X4 : 10,
        INT : 20,
        INT4 : 21,
        BOOL: 30,
        TEXTURE: 40,
        BYTE : 50,
        UBYTE : 60
    }

    Xflow.DATA_TYPE_MAP = {
        'float' : Xflow.DATA_TYPE.FLOAT,
        'float2' : Xflow.DATA_TYPE.FLOAT2,
        'float3' : Xflow.DATA_TYPE.FLOAT3,
        'float4' : Xflow.DATA_TYPE.FLOAT4,
        'float4x4' : Xflow.DATA_TYPE.FLOAT4X4,
        'int' : Xflow.DATA_TYPE.INT,
        'int4' : Xflow.DATA_TYPE.INT4,
        'bool' : Xflow.DATA_TYPE.BOOL,
        'texture' : Xflow.DATA_TYPE.TEXTURE,
        'byte' : Xflow.DATA_TYPE.BYTE,
        'ubyte' : Xflow.DATA_TYPE.UBYTE
    }



    Xflow.DATA_TYPE_TUPLE_SIZE = {};
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.FLOAT] = 1;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.FLOAT2] = 2;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.FLOAT3] = 3;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.FLOAT4] = 4;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.FLOAT4X4] = 16;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.INT] = 1;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.INT4] = 4;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.BOOL] = 1;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.TEXTURE] = 1;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.BYTE] = 1;
    Xflow.DATA_TYPE_TUPLE_SIZE[Xflow.DATA_TYPE.UBYTE] = 1;



    Xflow.TYPED_ARRAY_MAP = {};
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.FLOAT] = Float32Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.FLOAT2] = Float32Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.FLOAT3] = Float32Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.FLOAT4] = Float32Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.FLOAT4X4] = Float32Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.INT] = Int32Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.INT4] = Int32Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.BOOL] = Int8Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.BYTE] = Int8Array;
    Xflow.TYPED_ARRAY_MAP[Xflow.DATA_TYPE.UBYTE] = Uint8Array;


    Xflow.getTypeName = function(type){
        for(var i in Xflow.DATA_TYPE_MAP){
            if(Xflow.DATA_TYPE_MAP[i] == type){
                return i;
            }
        }
    }

    /**
     * @enum {number}
     */
    Xflow.TEX_FILTER_TYPE = {
        NEAREST: 0x2600,
        LINEAR: 0x2601,
        MIPMAP_NEAREST: 0x2700,
        MIPMAP_LINEAR: 0x2701

    };
    /**
     * @enum {number}
     */
    Xflow.TEX_WRAP_TYPE = {
        CLAMP: 0x812F,
        REPEAT: 0x2901
    };
    /**
     * @enum {number}
     */
    Xflow.TEX_TYPE = {
        TEXTURE_2D: 0x0DE1
    };

    Xflow.SHADER_CONSTANT_KEY = {
        WORLD_TRANSFORM: 1,
        VIEW_TRANSFORM: 2,
        SCREEN_TRANSFORM: 3,
        WORLD_TRANSFORM_NORMAL: 4,
        VIEW_TRANSFORM_NORMAL: 5,
        SCREEN_TRANSFORM_NORMAL: 6,
        OBJECT_ID: 7
    }

    Xflow.VS_ATTRIB_TYPE = {
        FLOAT: 1,
        FLOAT2: 2,
        FLOAT3: 3,
        FLOAT3_VIEW_POINT: 101,
        FLOAT3_WORLD_POINT: 102,
        FLOAT3_VIEW_NORMAL: 103,
        FLOAT3_WORLD_NORMAL: 104,
        FLOAT4 : 4,
        FLOAT4X4 : 10,
        INT: 20,
        INT4: 21,
        BOOL: 30,
        TEXTURE: 40
    }


    /**
     * Filter Type of DataNode
     * KEEP - Keep only the provided names
     * REMOVE - Remove provided names (ignores name mapping)
     * RENAME - Only apply name mapping
     * @enum
     */
    Xflow.DATA_FILTER_TYPE = {
        RENAME: 0,
        KEEP: 1,
        REMOVE: 2
    }


    /**
     * @enum {number}
     */
    Xflow.DATA_ENTRY_STATE = {
        CHANGED_NEW: 1,
        LOAD_START: 2,
        LOAD_END: 3,
        CHANGED_VALUE: 4,
        CHANGED_SIZE: 5,
        CHANGED_REMOVED: 6
    };

    Xflow.RESULT_TYPE = {
        COMPUTE: 0,
        VS: 1
    }


    /**
     * Type of Modification, used internally only
     * @private
     * @enum
     */
    Xflow.RESULT_STATE = {
        NONE: 0,
        CHANGED_DATA_VALUE: 1,
        CHANGED_DATA_SIZE: 2,
        CHANGED_STRUCTURE: 3,
        LOAD_START: 4,
        LOAD_END: 5,
        IMAGE_LOAD_START: 6,
        IMAGE_LOAD_END: 7
    };


    /**
     * Type of Sequence access - used by operators
     * @private
     * @enum
     */
    Xflow.SEQUENCE = {
        NO_ACCESS: 0,
        PREV_BUFFER: 1,
        NEXT_BUFFER: 2,
        LINEAR_WEIGHT: 3
    }

    /**
     * Type of Information Extraction - used by operators
     * @private
     * @enum
     */
    Xflow.EXTRACT = {
        NO_EXTRAC: 0,
        TEX_WIDTH: 1,
        TEX_HEIGHT: 2
    };

    Xflow.ORIGIN = {
        CHILD: 1,
        COMPUTE: 2,
        PROTO: 3
    };

    /**
     * Types of platforms to perform computation on
     * @type {Object}
     */
    Xflow.PLATFORM = {
        JAVASCRIPT: 0,
        GLSL: 1
    }

    Xflow.PROCESS_STATE = {
        MODIFIED: 0,
        LOADING: 1,
        NEEDS_VALIDATION: 2,
        INVALID: 3,
        UNPROCESSED: 4,
        PROCESSED: 5
    }



    /* Tools */

    /**
     *
     * @param {Object} ctor Constructor
     * @param {Object} parent Parent class
     * @param {Object=} methods Methods to add to the class
     * @returns {Object}
     */
    Xflow.createClass = function(ctor, parent, methods) {
        methods = methods || {};
        if (parent) {
            /** @constructor */
            var F = function() {
            };
            F.prototype = parent.prototype;
            ctor.prototype = new F();
            ctor.prototype.constructor = ctor;
            ctor.superclass = parent.prototype;
        }
        for ( var m in methods) {
            ctor.prototype[m] = methods[m];
        }
        return ctor;
    };


    var c_listedCallbacks = [];
    var c_listedCallbacksData = [];
    Xflow._listCallback = function(object, data){
        var index;
        if(( index = c_listedCallbacks.indexOf(object)) == -1){
            index = c_listedCallbacks.length;
            c_listedCallbacks.push(object);
        }
        var prevData = c_listedCallbacksData[index];
        if(!prevData || prevData < data){
            c_listedCallbacksData[index] = data;
        }
    }

    Xflow._callListedCallback = function(){
        if(c_listedCallbacks.length){
            for(var i = 0; i < c_listedCallbacks.length; ++i)
                c_listedCallbacks[i]._onListedCallback(c_listedCallbacksData[i]);
            c_listedCallbacks = [];
            c_listedCallbacksData = [];
        }
    }
}());





(function(){


//----------------------------------------------------------------------------------------------------------------------
// Xflow.SamplerConfig
//----------------------------------------------------------------------------------------------------------------------


/**
 * @constructor
 */
Xflow.SamplerConfig = function(){
    this.minFilter = 0;
    this.magFilter = 0;
    this.mipFilter = 0;
    this.wrapS = 0;
    this.wrapT = 0;
    this.wrapU = 0;
    this.textureType = 0;
    this.colorR = 0;
    this.colorG = 0;
    this.colorB = 0;
    this.generateMipMap = 0;
};
Xflow.SamplerConfig.prototype.setDefaults = function() {
    // FIXME Generate this from the spec ?
    this.minFilter = Xflow.TEX_FILTER_TYPE.LINEAR;
    this.magFilter = Xflow.TEX_FILTER_TYPE.LINEAR;
    this.mipFilter = Xflow.TEX_FILTER_TYPE.NEAREST;
    this.wrapS = Xflow.TEX_WRAP_TYPE.CLAMP;
    this.wrapT = Xflow.TEX_WRAP_TYPE.CLAMP;
    this.wrapU = Xflow.TEX_WRAP_TYPE.CLAMP;
    this.textureType = Xflow.TEX_TYPE.TEXTURE_2D;
    this.colorR = 0;
    this.colorG = 0;
    this.colorB = 0;
    this.generateMipMap = 0;
};
Xflow.SamplerConfig.prototype.set = function(other) {
    this.minFilter = other.minFilter;
    this.magFilter = other.magFilter;
    this.mipFilter = other.mipFilter;
    this.wrapS = other.wrapS;
    this.wrapT = other.wrapT;
    this.wrapU = other.wrapU;
    this.textureType = other.textureType;
    this.colorR = other.colorR;
    this.colorG = other.colorG;
    this.colorB = other.colorB;
    this.generateMipMap = other.generateMipMap;
};
var SamplerConfig = Xflow.SamplerConfig;


//----------------------------------------------------------------------------------------------------------------------
// Xflow.DataEntry
//----------------------------------------------------------------------------------------------------------------------


/**
 * @constructor
 * @param {Xflow.DATA_TYPE} type Type of DataEntry
 */
Xflow.DataEntry = function(type){
    this._type = type;
    this._listeners = [];
    this.userData = {};
};
var DataEntry = Xflow.DataEntry;

Object.defineProperty(DataEntry.prototype, "type", {
    /** @param {Xflow.DATA_TYPE} v */
    set: function(v){
        throw new Error("type is read-only");
    },
    /** @return {Xflow.DATA_TYPE} */
    get: function(){ return this._type; }
});

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataEntry.prototype.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataEntry.prototype.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

DataEntry.prototype._notifyChanged = function(){
    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
}

//----------------------------------------------------------------------------------------------------------------------
// Xflow.BufferEntry
//----------------------------------------------------------------------------------------------------------------------

/**
 * @constructor
 * @extends {Xflow.DataEntry}
 * @param {Xflow.DATA_TYPE} type
 * @param {Object} value
 */
Xflow.BufferEntry = function(type, value){
    Xflow.DataEntry.call(this, type);
    this._value = value;
    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_NEW);
};
Xflow.createClass(Xflow.BufferEntry, Xflow.DataEntry);
var BufferEntry = Xflow.BufferEntry;


/** @param {Object} v */
BufferEntry.prototype.setValue = function(v){
    this._setValue(v);
    Xflow._callListedCallback();
}

BufferEntry.prototype._setValue = function(v){
    var newSize = (this._value ? this._value.length : 0) != (v ? v.length : 0);
    this._value = v;
    notifyListeners(this, newSize ? Xflow.DATA_ENTRY_STATE.CHANGED_SIZE : Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
}

/** @return {Object} */
BufferEntry.prototype.getValue = function(){
    return this._value;
};

/** @return {Object} */
BufferEntry.prototype.getLength = function(){
    return this._value ? this._value.length : 0;
};


BufferEntry.prototype.getTupleSize = function() {
    if (!this._tupleSize) {
        this._tupleSize = Xflow.DATA_TYPE_TUPLE_SIZE[this._type];
    }
    return this._tupleSize;
};

/**
 * @return {number}
 */
BufferEntry.prototype.getIterateCount = function(){
    return this.getLength() / this.getTupleSize();
};

BufferEntry.prototype.isEmpty = function(){
    return !this._value;
};


//----------------------------------------------------------------------------------------------------------------------
// Xflow.TextureEntry
//----------------------------------------------------------------------------------------------------------------------

var tmpCanvas = null;
var tmpContext = null;

/** Xflow.toImageData converts ImageData-like objects to real ImageData
 *
 * @param imageData
 * @return {*}
 */
Xflow.toImageData = function(imageData) {
    if (imageData instanceof ImageData)
        return imageData;
    if (!imageData.data)
        throw new Error("no data property");
    if (!imageData.width)
        throw new Error("no width property");
    if (!imageData.height)
        throw new Error("no height property");
    if (!tmpContext) {
        tmpCanvas = document.createElement('canvas');
        tmpContext = tmpCanvas.getContext('2d');
    }
    var newImageData = tmpContext.createImageData(imageData.width, imageData.height);
    for (var i = 0; i < imageData.data.length; ++i) {
        var v = imageData.data[i];
        if (v > 255)
            v = 255;
        if (v < 0)
            v = 0;
        newImageData.data[i] = v;
    }
    return newImageData;
};


// TextureEntry data conversion order
// image -> canvas -> context -> -> imageData
// Note: don't use TextureEntry's width and height properties, they are deprecated and cause issues with video loading
// Instead use getWidth and getHeight methods

/**
 * @constructor
 * @extends {Xflow.DataEntry}
 * @param {Object} image
 */
Xflow.TextureEntry = function(image){
    Xflow.DataEntry.call(this, Xflow.DATA_TYPE.TEXTURE);
    this._samplerConfig = new SamplerConfig();
    this._formatType = null; // null | 'ImageData' | 'number' | 'float32' | 'float64'
    this._loading = false;
    this._updateImage(image);

    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_NEW);
};
Xflow.createClass(Xflow.TextureEntry, Xflow.DataEntry);
var TextureEntry = Xflow.TextureEntry;

TextureEntry.prototype.isLoading = function() {
    var image = this._image;
    if (!image)
        return false;
    var nodeName = image.nodeName.toLowerCase();
    if (nodeName == 'img')
        return !image.complete;
    if (nodeName == 'canvas')
        return this._image.width <= 0 || this._image.height <= 0;
    if (nodeName == 'video')
        // readyState == 0 is HAVE_NOTHING
        return image.readyState == 0 || this._image.videoWidth <= 0 || this._image.videoHeight <= 0;
    return false;
};

TextureEntry.prototype._updateImage = function(image) {
    this._image = image;
    this._context = null;
    this._imageData = null;
    if (this._image) {
        var nodeName = this._image.nodeName.toLowerCase();
        if (nodeName == 'video') {
            this.width = this._image.videoWidth;
            this.height = this._image.videoHeight;
        } else {
            this.width = this._image.width;
            this.height = this._image.height;
        }
        if (nodeName == 'canvas') {
            this._canvas = this._image;
            this._copyImageToCtx = false;
        } else {
            this._canvas = null;
            this._copyImageToCtx = true;
        }
    } else {
        this.width = 0;
        this.height = 0;
        this._canvas = null;
    }
};

/** Create new image
 *
 * @param width
 * @param height
 * @param formatType
 * @param samplerConfig
 * @return {Image|Canvas}
 */
TextureEntry.prototype._createImage = function(width, height, formatType, samplerConfig) {
    if (!this._image || this.getWidth() != width || this.getHeight() != height || this._formatType != formatType) {
        if (!width || !height)
            throw new Error("Width or height is not specified");
        // create dummy image
        var img = document.createElement('canvas');
        img.width = width;
        img.height = height;
        img.complete = true;

        this._formatType = formatType;
        if (!samplerConfig) {
            samplerConfig = new Xflow.SamplerConfig();
            samplerConfig.setDefaults();
        }
        this._samplerConfig.set(samplerConfig);
        this._setImage(img);
    } else {
        this._notifyChanged();
    }
    return this._image;
};

/** @param {Object} v */
TextureEntry.prototype.setImage = function(v) {
    this._setImage(v);
    Xflow._callListedCallback();
};

TextureEntry.prototype._setImage = function(v) {
    this._updateImage(v);
    var loading = this.isLoading();
    if(loading){
        this._loading = true;
        notifyListeners(this, Xflow.DATA_ENTRY_STATE.LOAD_START);
    }
    else if(this._loading){
        this._loading = false;
        notifyListeners(this, Xflow.DATA_ENTRY_STATE.LOAD_END);
    }
    else
        notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
}


TextureEntry.prototype.getFormatType = function() {
    return this._formatType;
};

TextureEntry.prototype.getWidth = function() {
    if (!this._image)
        return 0;
    return this._image.videoWidth || this._image.width || 0;
};

TextureEntry.prototype.getHeight = function() {
    if (!this._image)
        return 0;
    return this._image.videoHeight || this._image.height || 0;
};

TextureEntry.prototype._flush = function() {
    if (this._imageData) {
        if (this._imageData instanceof ImageData) {
            this._context.putImageData(this._imageData, 0, 0);
            this._imageData = null;
        } else {
            var imageData = Xflow.toImageData(this._imageData);
            this._context.putImageData(imageData, 0, 0);
            this._imageData = null;
        }
    }
    if (this._canvas) {
        this._canvas.complete = true; // for compatibility with img element
        this._image = this._canvas;
    }
};

/** @return {Object} */
TextureEntry.prototype.getImage = function() {
    this._flush();
    return this._image;
};

TextureEntry.prototype.getCanvas = function() {
    if (!this._canvas) {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this.getWidth();
        this._canvas.height = this.getHeight();
        this._canvas.complete = false; // for compatibility with img element
    } else
        this._flush();
    return this._canvas;
};

TextureEntry.prototype.getFilledCanvas = function() {
    var canvas = this.getCanvas();
    this._context = canvas.getContext("2d");
    if (!this._context)
        throw new Error("Could not create 2D context.");
    if (this._copyImageToCtx) {
        this._context.drawImage(this._image, 0, 0);
        this._copyImageToCtx = false;
    }
    return canvas;
};

TextureEntry.prototype.getContext2D = function() {
    if (!this._context) {
        this.getFilledCanvas(); // will implicitly create context for filled canvas
    } else
        this._flush();
    return this._context;
};




/** @return {ImageData} */
TextureEntry.prototype.getValue = function() {
    if (!this._image)
        return null;
    if (!this._imageData && !this.isLoading()) {
        var ctx = this.getContext2D();
        this._imageData = ctx.getImageData(0, 0, this.getWidth(), this.getHeight());
        if (this._formatType == 'float32') {
            this._imageData = {
                data : new Float32Array(this._imageData.data),
                width : this._imageData.width,
                height : this._imageData.height
            };
        } else if (this._formatType == 'float64') {
            this._imageData = {
                data : new Float64Array(this._imageData.data),
                width : this._imageData.width,
                height : this._imageData.height
            };
        }
    }
    return this._imageData;
};

/** @return {SamplerConfig} */
TextureEntry.prototype.getSamplerConfig = function(){
    return this._samplerConfig;
};

/** @return {number} */
TextureEntry.prototype.getLength = function(){
    return 1;
};
TextureEntry.prototype.isEmpty = function(){
    return !this._image
};


    /** @return {number} */
TextureEntry.prototype.getIterateCount = function() {
    return 1;
};

//TextureEntry.prototype.finish = function() {
//    if (this._imageData && this._context) {
//        if (this._imageData instanceof ImageData) {
//            // Do we need to do this always ?
//            // Better mark canvas dirty !
//            this._context.putImageData(this._imageData, 0, 0);
//            this._imageData = null;
//        } else {
//            // FIXME What to do here ?
//        }
//    }
//    if (this._canvas) {
//        this._canvas.complete = true; // for compatibility with img element
//        this._image = this._canvas;
//    }
//};

//----------------------------------------------------------------------------------------------------------------------
// Xflow.ImageDataTextureEntry
//----------------------------------------------------------------------------------------------------------------------


Xflow.ImageDataTextureEntry = function(imageData){
    Xflow.DataEntry.call(this, Xflow.DATA_TYPE.TEXTURE);
    this._samplerConfig = new SamplerConfig();
    this._imageData = null;
    this._formatType = null;
    this._updateImageData(imageData);

    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_NEW);
};
Xflow.createClass(Xflow.ImageDataTextureEntry, Xflow.DataEntry);
var ImageDataTextureEntry = Xflow.ImageDataTextureEntry;

ImageDataTextureEntry.prototype.isLoading = function() {
    return !this._imageData;
};

ImageDataTextureEntry.prototype._updateImageData = function(imageData) {
    this._formatType = null;
    this._imageData = imageData;
};

/** Create new image
 *
 * @param width
 * @param height
 * @param formatType
 * @param samplerConfig
 * @return {Image|Canvas}
 */
ImageDataTextureEntry.prototype._createImage = function(width, height, formatType, samplerConfig) {
    if (!this._image || this.getWidth() != width || this.getHeight() != height || this._formatType != formatType) {
        if (!width || !height)
            throw new Error("Width or height is not specified");
        this._formatType = formatType;
        if (!samplerConfig) {
            samplerConfig = new Xflow.SamplerConfig();
            samplerConfig.setDefaults();
        }
        this._samplerConfig.set(samplerConfig);

        var imageData = {
            width: width,
            height: height,
            data: null
        };
        if(formatType == 'float64'){
            imageData.data = new Float64Array(width*height*4);
        }
        else if(formatType == 'float32'){
            imageData.data = new Float32Array(width*height*4);
        }
        else {
            // FIXME: We should allocate Uint8ClampedArray here instead
            // But Uint8ClampedArray can't be allocated in Chrome inside a Web Worker
            // See bug: http://code.google.com/p/chromium/issues/detail?id=176479
            // As a work around, we allocate Int16Array which results in correct clamping outside of web worker
            if(Uint8Array == Uint8ClampedArray)
                imageData.data = new Int16Array(width*height*4);
            else
                imageData.data = new Uint8ClampedArray(width*height*4);
        }
        this._imageData = imageData;
    }
    this._notifyChanged();
};

/** @param {Object} v */
ImageDataTextureEntry.prototype.setImageData = function(v) {
    this._updateImageData(v);
    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
    Xflow._callListedCallback();
};

ImageDataTextureEntry.prototype.getWidth = function() {
    return this._imageData && this._imageData.width || 0;
};

ImageDataTextureEntry.prototype.getHeight = function() {
    return this._imageData && this._imageData.height || 0;
};

/** @return {ImageData} */
ImageDataTextureEntry.prototype.getValue = function() {
    return this._imageData;
};

/** @return {SamplerConfig} */
ImageDataTextureEntry.prototype.getSamplerConfig = function(){
    return this._samplerConfig;
};

/** @return {number} */
ImageDataTextureEntry.prototype.getLength = function(){
    return 1;
};
ImageDataTextureEntry.prototype.isEmpty = function(){
    return !this._imageData
};

ImageDataTextureEntry.prototype.getFormatType = function() {
    return this._formatType;
};


/** @return {number} */
ImageDataTextureEntry.prototype.getIterateCount = function() {
    return 1;
};

//----------------------------------------------------------------------------------------------------------------------
// Xflow.DataChangeNotifier
//----------------------------------------------------------------------------------------------------------------------



Xflow.DataChangeNotifier = {
    _listeners: []
}
var DataChangeNotifier = Xflow.DataChangeNotifier;

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataChangeNotifier.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataChangeNotifier.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

/**
 * @param {Xflow.DataEntry} dataEntry
 * @param {Xflow.DATA_ENTRY_STATE} notification
 */
function notifyListeners(dataEntry, notification){
    for(var i = 0; i < DataChangeNotifier._listeners.length; ++i){
        DataChangeNotifier._listeners[i](dataEntry, notification);
    }
    for(var i = 0; i < dataEntry._listeners.length; ++i){
        dataEntry._listeners[i](dataEntry, notification);
    }
}

}());
(function(){


//----------------------------------------------------------------------------------------------------------------------
// Xflow.Graph
//----------------------------------------------------------------------------------------------------------------------

/**
 * The Xflow graph includes the whole dataflow graph
 * @constructor
 */
Xflow.Graph = function(){
    this._nodes = [];
};
var Graph = Xflow.Graph;



/**
 * @return {Xflow.InputNode}
 */
Graph.prototype.createInputNode = function(){
    var node = new Xflow.InputNode(this);
    this._nodes.push(node);
    return node;
};

/**
 * @return {Xflow.DataNode}
 */
Graph.prototype.createDataNode = function(protoNode){
    var node = new Xflow.DataNode(this, protoNode);
    this._nodes.push(node);
    return node;
};


//----------------------------------------------------------------------------------------------------------------------
// Xflow.GraphNode
//----------------------------------------------------------------------------------------------------------------------

/**
 * @constructor
 * @param {Xflow.Graph} graph
 */
Xflow.GraphNode = function(graph){
    this._graph = graph;
    this._parents = [];
};
var GraphNode = Xflow.GraphNode;



//----------------------------------------------------------------------------------------------------------------------
// Xflow.InputNode
//----------------------------------------------------------------------------------------------------------------------

/**
 * @constructor
 * @param {Xflow.Graph} graph
 * @extends {Xflow.GraphNode}
 */
Xflow.InputNode = function(graph){
    Xflow.GraphNode.call(this, graph);
    this._name = "";
    this._key = 0;
    this._data = null;
    this._paramName = null;
    this._paramGlobal = false;
    this._dataListener = this.onDataChange.bind(this);
};
Xflow.createClass(Xflow.InputNode, Xflow.GraphNode);
var InputNode = Xflow.InputNode;

InputNode.prototype.onDataChange = function(newValue, notification) {
    var downNote;
    switch(notification){
        case Xflow.DATA_ENTRY_STATE.CHANGED_VALUE: downNote = Xflow.RESULT_STATE.CHANGED_DATA_VALUE; break;
        case Xflow.DATA_ENTRY_STATE.LOAD_START: downNote = Xflow.RESULT_STATE.IMAGE_LOAD_START; break;
        case Xflow.DATA_ENTRY_STATE.LOAD_END: downNote = Xflow.RESULT_STATE.IMAGE_LOAD_START; break;
        default: downNote = Xflow.RESULT_STATE.CHANGED_DATA_SIZE; break;
    }
    notifyParentsOnChanged(this,downNote);
};

Object.defineProperty(InputNode.prototype, "name", {
    /** @param {string} v */
    set: function(v){
        this._name = v;
        notifyParentsOnChanged(this, Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {string} */
    get: function(){ return this._name; }
});
Object.defineProperty(InputNode.prototype, "key", {
    /** @param {number} v */
    set: function(v){
        this._key = v;
        notifyParentsOnChanged(this, Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {number} */
    get: function(){ return this._key; }
});
Object.defineProperty(InputNode.prototype, "paramName", {
    /** @param {string} v */
    set: function(v){
        this._paramName = v;
        notifyParentsOnChanged(this, Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {string} */
    get: function(){ return this._paramName; }
});
Object.defineProperty(InputNode.prototype, "paramGlobal", {
    /** @param {boolean} v */
    set: function(v){
        this._paramGlobal = v;
        notifyParentsOnChanged(this, Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {boolean} */
    get: function(){ return this._paramGlobal; }
});
Object.defineProperty(InputNode.prototype, "data", {
    /** @param {Object} v */
    set: function(v){
        var prevDataLoading = false;
        if(this._data) {
            prevDataLoading = this._data._loading;
            this._data.removeListener(this._dataListener);
        }
        this._data = v;
        if(this._data)
            this._data.addListener(this._dataListener);
        if(prevDataLoading != this._data._loading){
            notifyParentsOnChanged(this, this._data._loading ? Xflow.RESULT_STATE.IMAGE_LOAD_START :
                Xflow.RESULT_STATE.IMAGE_LOAD_END);
        }
        Xflow._callListedCallback();
    },
    /** @return {Object} */
    get: function(){ return this._data; }
});


Xflow.createBufferInputNode = function(type, name, size){
    if (size == 0)
        return null;
    var typeId = Xflow.DATA_TYPE_MAP[type];
    var tupleSize = Xflow.DATA_TYPE_TUPLE_SIZE[typeId];
    var arrayType = Xflow.TYPED_ARRAY_MAP[typeId];

    var v = new (arrayType)(size * tupleSize);
    var buffer = new Xflow.BufferEntry(typeId, v);

    var inputNode = XML3D.data.xflowGraph.createInputNode();
    inputNode.data = buffer;
    inputNode.name = name;
    return inputNode;
};

//----------------------------------------------------------------------------------------------------------------------
// Xflow.DataNode
//----------------------------------------------------------------------------------------------------------------------

var c_xflowNodeId = 0;
function getXflowNodeId(){
    return ++c_xflowNodeId;
}

/**
 * @constructor
 * @extends {Xflow.GraphNode}
 */
Xflow.DataNode = function(graph, protoNode){
    Xflow.GraphNode.call(this, graph);

    this._loading = false;
    this._subTreeLoading = false;
    this._imageLoading = false;

    this.id = getXflowNodeId();
    this._isProtoNode = protoNode;
    this._children = [];
    this._sourceNode = null;
    this._protoNode = null;

    this._filterType = 0;
    this._filterMapping = new Xflow.OrderMapping(this);

    this._computeOperator = "";
    this._computeInputMapping = new Xflow.OrderMapping(this);
    this._computeOutputMapping = new Xflow.OrderMapping(this);

    this._channelNode = new Xflow.ChannelNode(this);
    this._listeners = [];

};
Xflow.createClass(Xflow.DataNode, Xflow.GraphNode);
var DataNode = Xflow.DataNode;


/**
 * @constructor
 * @param {Xflow.DataNode} owner
 */
Xflow.Mapping = function(owner){
    this._owner = owner;
};


/**
 * @constructor
 * @extends {Xflow.Mapping}
 * @param {Xflow.DataNode} owner
 */
Xflow.OrderMapping = function(owner){
    Xflow.Mapping.call(this, owner);
    this._names = [];
};
Xflow.createClass(Xflow.OrderMapping, Xflow.Mapping);

/**
 * @constructor
 * @extends {Xflow.Mapping}
 * @param {Xflow.DataNode} owner
 */
Xflow.NameMapping = function(owner){
    Xflow.Mapping.call(this, owner);
    this._destNames = [];
    this._srcNames = [];

};
Xflow.createClass(Xflow.NameMapping, Xflow.Mapping);


Object.defineProperty(DataNode.prototype, "sourceNode", {
    /** @param {?Xflow.DataNode} v */
    set: function(v){
        if(this._sourceNode) removeParent(this, this._sourceNode);
        this._sourceNode = v;
        if(this._sourceNode) addParent(this, this._sourceNode);
        if(!updateNodeLoading(this))
            this.notify(Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {?Xflow.DataNode} */
    get: function(){ return this._sourceNode; }
});
Object.defineProperty(DataNode.prototype, "protoNode", {
    /** @param {?Xflow.DataNode} v */
    set: function(v){
        if(this._protoNode) removeParent(this, this._protoNode);
        this._protoNode = v;
        if(this._protoNode) addParent(this, this._protoNode);
        if(!updateNodeLoading(this))
            this.notify(Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {?Xflow.DataNode} */
    get: function(){ return this._protoNode; }
});

DataNode.prototype.setLoading = function(loading){
    if(this._loading != loading){
        this._loading = loading;
        updateSubtreeLoading(this);
        Xflow._callListedCallback();
    }
}


Object.defineProperty(DataNode.prototype, "filterType", {
    /** @param {Xflow.DATA_FILTER_TYPE} v */
    set: function(v){
        this._filterType = v;
        this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {Xflow.DATA_FILTER_TYPE} */
    get: function(){ return this._filterType; }
});

Object.defineProperty(DataNode.prototype, "filterMapping", {
    /** @param {Xflow.Mapping} v */
    set: function(v){ throw new Error("filterMapping is readonly!");
    },
    /** @return {Xflow.Mapping} */
    get: function(){ return this._filterMapping; }
});

Object.defineProperty(DataNode.prototype, "computeOperator", {
    /** @param {string} v */
    set: function(v){
        this._computeOperator = v;
        this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        Xflow._callListedCallback();
    },
    /** @return {string} */
    get: function(){ return this._computeOperator; }
});
Object.defineProperty(DataNode.prototype, "computeInputMapping", {
    /** @param {Xflow.Mapping} v */
    set: function(v){ throw new Error("computeInputMapping is readonly!");
    },
    /** @return {Xflow.Mapping} */
    get: function(){ return this._computeInputMapping; }
});
Object.defineProperty(DataNode.prototype, "computeOutputMapping", {
    /** @param {Xflow.Mapping} v */
    set: function(v){ throw new Error("computeOutputMapping is readonly!");
    },
    /** @return {Xflow.Mapping} */
    get: function(){ return this._computeOutputMapping; }
});

DataNode.prototype.isProtoNode = function(){
    return this._isProtoNode;
}

/**
 * @param {Xflow.GraphNode} child
 */
DataNode.prototype.appendChild = function(child){
    this._children.push(child);
    addParent(this, child);
    if(!updateNodeLoading(this))
        this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    Xflow._callListedCallback();
};
/**
 * @param {Xflow.GraphNode} child
 */
DataNode.prototype.removeChild = function(child){
    Array.erase(this._children, child);
    removeParent(this, child);
    if(!updateNodeLoading(this))
        this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    Xflow._callListedCallback();
};
/**
 * @param {Xflow.GraphNode} child
 * @param {Xflow.GraphNode} beforeNode
 */
DataNode.prototype.insertBefore = function(child, beforeNode){
    var idx = this._children.indexOf(beforeNode);
    if(idx == -1)
        this._children.push(child);
    else
        this._children.splice(idx, 0, child);
    addParent(this, child);
    if(!updateNodeLoading(this))
        this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    Xflow._callListedCallback();
};
/**
 * remove all children of the DataNode
 */
DataNode.prototype.clearChildren = function(){
    for(var i =0; i < this._children.length; ++i){
        removeParent(this, this._children[i]);
    }
    this._children = [];
    if(!updateNodeLoading(this))
        this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    Xflow._callListedCallback();
};

/**
 * Detach this DataNode from all connections, including source- and proto-node references
 */
DataNode.prototype.detachFromParents = function(){
    for(var i =0; i < this._parents.length; ++i){
        var parent = this._parents[i];
        if(parent._sourceNode == this)
            parent.sourceNode = null;
        else if(parent._protoNode == this){
            parent.protoNode = null;
        }
        else{
            parent.removeChild(this);
        }
    }
    this._children = [];
};

/**
 * @const
 */
var filterParser = /^([A-Za-z\s]*)\(([^()]+)\)$/;

/**
 * Set filter by string
 * @param {string} filterString
 */
DataNode.prototype.setFilter = function(filterString){
    filterString = filterString || "";
    var newType = Xflow.DATA_FILTER_TYPE.RENAME;
    var newMapping = null;
    if(filterString){
        var result = filterString.trim().match(filterParser);
        if(result){
            var type = result[1].trim();
            switch(type){
                case "keep": newType = Xflow.DATA_FILTER_TYPE.KEEP; break;
                case "remove": newType = Xflow.DATA_FILTER_TYPE.REMOVE; break;
                case "rename": newType = Xflow.DATA_FILTER_TYPE.RENAME; break;
                default:
                    XML3D.debug.logError("Unknown filter type:" + type);
            }
            newMapping = Xflow.Mapping.parse(result[2], this);
        }
        else{
            XML3D.debug.logError("Could not parse filter '" + filterString + "'");
        }
    }
    if(!newMapping){
        newMapping = new Xflow.OrderMapping(this);
    }
    removeMappingOwner(this._filterMapping);
    this._filterMapping = newMapping;
    this._filterType = newType;
    this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    Xflow._callListedCallback();
};

var computeParser = /^(([^=]+)\=)?([^(]+)\(([^()]*)\)$/;
var bracketsParser = /^\(([^()]*)\)$/;

/**
 * Set compute by string
 * @param {string} computeString
 */
DataNode.prototype.setCompute = function(computeString){
    computeString = computeString || "";
    var newOperator = "";
    var inputMapping = null, outputMapping = null;
    var result = computeString.trim().match(computeParser);
    if(result){
        var output = result[2] ? result[2].trim() : "";
        newOperator = result[3].trim();
        var input = result[4] ? result[4].trim() : "";
        if(result = output.match(bracketsParser)){
            output = result[1];
        }
        inputMapping = Xflow.Mapping.parse(input, this);
        outputMapping = Xflow.Mapping.parse(output, this);
    }
    if(!inputMapping) inputMapping = new Xflow.OrderMapping(this);
    if(!outputMapping) outputMapping = new Xflow.OrderMapping(this);
    removeMappingOwner(this._computeInputMapping);
    removeMappingOwner(this._computeOutputMapping);
    this._computeInputMapping = inputMapping;
    this._computeOutputMapping = outputMapping;
    this._computeOperator = newOperator;
    this.notify( Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    Xflow._callListedCallback();
}
/**
 * Notifies DataNode about a change. Notification will be forwarded to parents, if necessary
 * @param {Xflow.RESULT_STATE} changeType
 * @param {GraphNode} senderNode
 */
DataNode.prototype.notify = function(changeType, senderNode){
    if(changeType == Xflow.RESULT_STATE.CHANGED_STRUCTURE ||
       changeType == Xflow.RESULT_STATE.LOAD_START ||
       changeType == Xflow.RESULT_STATE.LOAD_END )
    {
        this._channelNode.setStructureOutOfSync();

        if(changeType == Xflow.RESULT_STATE.CHANGED_STRUCTURE)
            notifyParentsOnChanged(this, changeType);
        else
            updateSubtreeLoading(this);
    }
    else if(changeType == Xflow.RESULT_STATE.CHANGED_DATA_VALUE ||
        changeType == Xflow.RESULT_STATE.CHANGED_DATA_SIZE ||
        changeType == Xflow.RESULT_STATE.IMAGE_LOAD_START ||
        changeType == Xflow.RESULT_STATE.IMAGE_LOAD_END)
    {
        if(changeType == Xflow.RESULT_STATE.IMAGE_LOAD_START ||
           changeType == Xflow.RESULT_STATE.IMAGE_LOAD_END )
            updateImageLoading(this);
        senderNode && this._channelNode.notifyDataChange(senderNode, changeType);
    }
    for(var i = 0; i < this._listeners.length; ++i)
        this._listeners[i](changeType);
};

DataNode.prototype.addListener = function(listener){
    this._listeners.push(listener)
}
DataNode.prototype.removeListener = function(listener){
    Array.erase(this._listeners, listener);
}

DataNode.prototype.getOutputNames = function(){
    return getForwardNode(this)._channelNode.getOutputNames();
}

DataNode.prototype.getOutputChannelInfo = function(name){
    return getForwardNode(this)._channelNode.getOutputChannelInfo(name);
}
DataNode.prototype.getParamNames = function(){
    return getForwardNode(this)._channelNode.getParamNames();
}

DataNode.prototype._getResult = function(type, filter){
    return getForwardNode(this)._channelNode.getResult(type, filter);
}

DataNode.prototype._getForwardNode = function(){
    return getForwardNode(this);
}

function getForwardNode(dataNode){
    if(!dataNode._filterMapping.isEmpty()  || dataNode._computeOperator || dataNode._protoNode)
        return dataNode;
    if(dataNode._sourceNode && dataNode._children.length == 0)
        return getForwardNode(dataNode._sourceNode);
    if(dataNode._children.length == 1 && dataNode._children[0] instanceof DataNode)
        return getForwardNode(dataNode._children[0]);
    return dataNode;
}

function updateNodeLoading(node){
    updateImageLoading(node);
    return updateSubtreeLoading(node);
}

function updateImageLoading(node){
    var imageLoading = false;
    for(var i = 0; !imageLoading && i < node._children.length; ++i){
        var child = node._children[i];
        imageLoading = child instanceof Xflow.DataNode ? child._imageLoading :
                child._data && child._data.isLoading && child._data.isLoading();
    }
    if(imageLoading != node._imageLoading){
        node._imageLoading = imageLoading;
        for(var i = 0; i < node._parents.length; ++i)
            node._parents[i].notify(imageLoading ? Xflow.RESULT_STATE.IMAGE_LOAD_START :
            Xflow.RESULT_STATE.IMAGE_LOAD_END);
    }
}
function updateSubtreeLoading(node){
    var subtreeLoading = node._loading;
    for(var i = 0; !subtreeLoading && i < node._children.length; ++i){
        var child = node._children[i];
        subtreeLoading = child instanceof Xflow.DataNode ? child._subTreeLoading : false;
    }
    if(subtreeLoading != node._subTreeLoading){
        node._subTreeLoading = subtreeLoading;
        for(var i = 0; i < node._parents.length; ++i)
            node._parents[i].notify(subtreeLoading ? Xflow.RESULT_STATE.LOAD_START :
                Xflow.RESULT_STATE.LOAD_END);
        return true;
    }
    return false;
}


//----------------------------------------------------------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------------------------------------------------------


/**
 * @private
 * @param {Xflow.DataNode} parent
 * @param {Xflow.GraphNode} child
 */
function addParent(parent, child){
    child._parents.push(parent);
}

/**
 * @private
 * @param {Xflow.DataNode} parent
 * @param {Xflow.GraphNode} child
 */
function removeParent(parent, child){
    Array.erase(child._parents, parent);
}

/**
 * Notify all parent nodes about a change
 * @param {Xflow.GraphNode} node
 * @param {number|Xflow.RESULT_STATE} changeType
 * @private
 */
function notifyParentsOnChanged(node, changeType){
    for(var i = 0; i < node._parents.length; ++i){
        node._parents[i].notify(changeType, node);
    }
};

/**
 * Remove owner from mapping, small helper function
 * @param {Xflow.Mapping} mapping
 * @private
 */
function removeMappingOwner(mapping){
    if(mapping)
        mapping._owner = null;
};


})();
(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.Mapping
//----------------------------------------------------------------------------------------------------------------------

var Mapping = Xflow.Mapping;

Mapping.parse = function(string, dataNode){
    string = string.trim()
    var results = string.trim().match(orderMappingParser);
    if(results)
        return OrderMapping.parse(string, dataNode);
    results = string.trim().match(nameMappingParser);
    if(results)
        return NameMapping.parse(results[1], dataNode);
    XML3D.debug.logError("Cannot parse name mapping '" + string + "'");
    return null;
}


//----------------------------------------------------------------------------------------------------------------------
// Xflow.OrderMapping
//----------------------------------------------------------------------------------------------------------------------


/**
 * OrderMapping implementation
 */

var OrderMapping = Xflow.OrderMapping;


OrderMapping.parse = function(string, dataNode){
    var mapping = new Xflow.OrderMapping(dataNode)
    var token = string.split(",");
    for(var i = 0; i < token.length; i++){
        mapping._names.push(token[i].trim());
    }
    return mapping;
}


Object.defineProperty(OrderMapping.prototype, "length", {
    set: function(v){ throw new Error("length is read-only");
    },
    get: function(){ return this._name.length; }
});

OrderMapping.prototype.getName = function(idx){
    return this._names[idx];
};

OrderMapping.prototype.clear = function(){
    this._names = [];
    mappingNotifyOwner(this);
};

OrderMapping.prototype.setName = function(index, name){
    this._names[index] = name;
    mappingNotifyOwner(this);
};

OrderMapping.prototype.removeName = function(index){
    this._names.splice(index);
    mappingNotifyOwner(this);
};

OrderMapping.prototype.isEmpty = function(){
    return this._names.length == 0;
}

var orderMappingParser = /^([^:,{}]+)(,[^:{},]+)*$/;

OrderMapping.prototype.applyFilterOnChannelMap = function(destMap, sourceMap, destSubstitution, srcSubstitution, filterType, callback){
    for(var i in sourceMap.map){
        var idx = this._names.indexOf(i);
        if(filterType == Xflow.DATA_FILTER_TYPE.RENAME ||
            ( filterType == Xflow.DATA_FILTER_TYPE.KEEP && idx != -1) ||
            (filterType == Xflow.DATA_FILTER_TYPE.REMOVE && idx == -1))
            callback(destMap, i, sourceMap, i, destSubstitution, srcSubstitution);
    }
};
OrderMapping.prototype.getScriptInputName = function(index, destName){
    if(this._names[index])
        return this._names[index];
    else
        return null;
};
OrderMapping.prototype.getScriptOutputName = function(index, srcName){
    if(this._names[index])
        return this._names[index];
    else
        return null;
};
OrderMapping.prototype.getScriptOutputNameInv = function(destName, operatorOutputs){
    var index = this._names.indexOf(destName);
    if(index == -1)
        return null;
    return operatorOutputs[index].name;
};

OrderMapping.prototype.applyScriptOutputOnMap = function(destMap, sourceMap){
    var index = 0;
    for(var i in sourceMap){
        if(index < this._names.length){
            destMap[this._names[index]] = sourceMap[i];
            ++index;
        }
        else
            break;
    }
};
OrderMapping.prototype.getRenameSrcName = function(name){
    return name;
}


OrderMapping.prototype.filterNameset = function(nameset, filterType)
{
    if(filterType == Xflow.DATA_FILTER_TYPE.RENAME)
        return nameset.splice();
    else {
        var keep = (filterType == Xflow.DATA_FILTER_TYPE.KEEP);
        var result = [];
        for(var i in nameset){
            var idx = this._names.indexOf(nameset[i]);
            if( (keep && idx!= -1) || (!keep && idx == -1) )
                result.push(nameset[i]);
        }
        return result;
    }
}

//----------------------------------------------------------------------------------------------------------------------
// Xflow.NameMapping
//----------------------------------------------------------------------------------------------------------------------


/**
 * NameMapping implementation
 */

var NameMapping = Xflow.NameMapping;


NameMapping.parse = function(string, dataNode)
{
    var mapping = new Xflow.NameMapping(dataNode)
    var token = string.split(",");
    for(var i = 0; i < token.length; i++){
        var pair = token[i].split(":");
        var dest = pair[0].trim(); var src = pair[1].trim();
        mapping.setNamePair(dest, src);
    }
    return mapping;
}

Object.defineProperty(NameMapping.prototype, "length", {
    set: function(v){ throw new Error("length is read-only");
    },
    get: function(){ return this._srcNames.length; }
});

NameMapping.prototype.getDestName = function(idx){
    return this._destNames[idx];
};
NameMapping.prototype.getSrcName = function(idx){
    return this._srcNames[idx];
};

NameMapping.prototype.getSrcNameFromDestName = function(destName){
    var idx = this._destNames.indexOf(destName);
    return idx == -1 ? null : this._srcNames[idx];
};
NameMapping.prototype.getDestNameFromSrcName = function(srcName){
    var idx = this._srcNames.indexOf(srcName);
    return idx == -1 ? null : this._destNames[idx];
};

NameMapping.prototype.clear = function(){
    this._srcNames = [];
    this._destNames = [];
    mappingNotifyOwner(this);
};

NameMapping.prototype.setNamePair = function(destName, srcName){
    var idx = this._destNames.indexOf(destName);
    if(idx != -1){
        this._destNames.splice(idx,1);
        this._srcNames.splice(idx,1);
    }
    this._destNames.push(destName);
    this._srcNames.push(srcName);
    mappingNotifyOwner(this);
};

NameMapping.prototype.removeNamePair = function(destName){
    var idx = this._destNames.indexOf(destName);
    if(idx != -1){
        this._destNames.splice(idx,1);
        this._srcNames.splice(idx,1);
    }
    mappingNotifyOwner(this);
};

NameMapping.prototype.isEmpty = function(){
    return this._destNames.length == 0;
}


var nameMappingParser = /^\{(([^:,{}]+:[^:{},]+)(,[^:{},]+:[^:},]+)*)\}$/;


NameMapping.prototype.filterNameset = function(nameset, filterType)
{

}

NameMapping.prototype.applyFilterOnChannelMap = function(destMap, sourceMap, destSubstitution, srcSubstitution, filterType, callback)
{
    if(filterType == Xflow.DATA_FILTER_TYPE.REMOVE){
        for(var i in sourceMap.map)
            if(this._srcNames.indexOf(i) == -1)
                callback(destMap, i, sourceMap, i, destSubstitution, srcSubstitution);
    }
    else{
        if(filterType == Xflow.DATA_FILTER_TYPE.RENAME){
            for(var i in sourceMap.map)
                if(this._srcNames.indexOf(i) == -1)
                    callback(destMap, i, sourceMap, i, destSubstitution, srcSubstitution);
        }
        for(var i in this._destNames){
            callback(destMap, this._destNames[i], sourceMap, this._srcNames[i], destSubstitution, srcSubstitution);
        }
    }
};

NameMapping.prototype.getRenameSrcName = function(name){
    return this.getSrcNameFromDestName(name) || name;
}

NameMapping.prototype.getScriptInputName= function(index, destName){
    return this.getSrcNameFromDestName(destName);
}
NameMapping.prototype.getScriptOutputName = function(index, srcName){
    return this.getDestNameFromSrcName(srcName);
}

NameMapping.prototype.getScriptOutputNameInv = function(destName, operatorOutputs){
    var index = this._destNames.indexOf(destName);
    if(index == -1)
        return null;
    return this._srcNames[index];
};

NameMapping.prototype.applyScriptOutputOnMap= function(destMap, sourceMap){
    for(var i in this._destNames){
        var destName = this._destNames[i], srcName = this._srcNames[i];
        destMap[destName] = sourceMap[srcName];
    }
}


//----------------------------------------------------------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------------------------------------------------------


function mappingNotifyOwner(mapping){
    if(mapping._owner)
        mapping._owner.notify(Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    Xflow._callListedCallback();
};

})();
(function(){

/**
 * @constructor
 * @param {Xflow.DataNode} dataNode
 * @param {Array.<string>} filter
 */
var Request = function(dataNode, filter, callback){
    this._dataNode = dataNode;
    this._filter = filter ? filter.slice().sort() : null;
    this._listener = callback;
    this._result = null;
    this._dataNodeListener = this._onDataNodeChange.bind(this);
    this._dataNode.addListener(this._dataNodeListener);
};
Xflow.Request = Request;

Object.defineProperty(Request.prototype, "dataNode", {
    set: function(v){
       throw new Error("dataNode is readonly");
    },
    get: function(){ return this._dataNode; }
});

Object.defineProperty(Request.prototype, "filter", {
    set: function(v){
        throw new Error("filter is read-only");
    },
    get: function(){ return this._filter; }
});

/**
 * Call this function, whenever the request is not required anymore.
 */
Request.prototype.clear = function(){
    this._listener = null;
    if(this._result) this._result.removeListener(this.callback);
    this._dataNode.removeListener(this._dataNodeListener);
};

Request.prototype._onListedCallback = function(data){
    this._listener && this._listener(this, data)
};

function swapResultRequest(request, newResult){
    if(request._result) request._result._removeRequest(request);
    request._result = newResult
    if(newResult) newResult._addRequest(request);
    return newResult;
}

/**
 * @param {Xflow.Request} request
 * @param {Xflow.RESULT_STATE} notification
 */
function notifyListeners(request, notification){
    Xflow._listCallback(request, notification);
};

/**
 * @param {Xflow.RESULT_STATE} notification
 */
Request.prototype._onDataNodeChange = function(notification){
    notifyListeners(this, notification);
}

/**
 * @constructor
 * @extends {Xflow.Request}
 * @param {Xflow.DataNode} dataNode
 * @param {Array.<string>} filter
 * @param {function} callback
 */
var ComputeRequest = function(dataNode, filter, callback){
    Xflow.Request.call(this, dataNode, filter, callback);
};
Xflow.createClass(ComputeRequest, Xflow.Request);
Xflow.ComputeRequest = ComputeRequest;

ComputeRequest.prototype.getResult = function(){
    return swapResultRequest(this, this._dataNode._getResult(Xflow.RESULT_TYPE.COMPUTE, this._filter));
}

ComputeRequest.prototype._onResultChanged = function(notification){
    this._onDataNodeChange(notification);
}


var c_vsConnectNodeCount = {},
    c_vsConnectNodeCache = {};

/**
 * @constructor
 * @extends {Xflow.Request}
 * @param {Xflow.DataNode} dataNode
 * @param {Xflow.VSConfig} vsConfig
 */
var VertexShaderRequest = function(dataNode, vsConfig, callback){
    var filter = vsConfig.getFilter();
    Xflow.Request.call(this, dataNode, filter, callback);
    this._vsConfig = vsConfig;
    this._vsConnectNode = getVsConnectNode(dataNode, vsConfig);
};
Xflow.createClass(VertexShaderRequest, Xflow.Request);
Xflow.VertexShaderRequest = VertexShaderRequest;

VertexShaderRequest.prototype.getResult = function(){
    return swapResultRequest(this, this._vsConnectNode._getResult(Xflow.RESULT_TYPE.VS, this._filter));
}

VertexShaderRequest.prototype._onDataNodeChange = function(notification){
    if(notification == Xflow.RESULT_STATE.CHANGED_STRUCTURE){
        var newVSConnectedNode = getVsConnectNode(this._dataNode, this._vsConfig);
        if(newVSConnectedNode != this._vsConnectNode){
            clearVsConnectNode(this._vsConnectNode, this._dataNode, this._vsConfig);
            this._vsConnectNode = newVSConnectedNode;
        }
    }
    Request.prototype._onDataNodeChange.call(this, notification);
}

VertexShaderRequest.prototype._onResultChanged = function(result, notification){
    this._onDataNodeChange(notification);
}

function getVsConnectNode(dataNode, vsConfig){
    var forwardNode = dataNode._getForwardNode();

    var key = getDataNodeShaderKey(dataNode, vsConfig);
    var connectNode;
    if(!(connectNode = c_vsConnectNodeCache[key])){
        var graph = dataNode._graph;
        connectNode = graph.createDataNode(false);
        connectNode.appendChild(dataNode);

        var operator = vsConfig.getOperator();
        connectNode.computeOperator = operator;
        vsConfig.setInputMapping(connectNode._computeInputMapping);
        vsConfig.setOutputMapping(connectNode._computeOutputMapping);

        c_vsConnectNodeCache[key] = connectNode;
        c_vsConnectNodeCount[connectNode.id] = 1;
    }
    else{
        c_vsConnectNodeCount[connectNode.id]++;
    }

    return connectNode;
}

function clearVsConnectNode(connectNode, dataNode, vsConfig){
    c_vsConnectNodeCount[connectNode.id]--;
    if(!c_vsConnectNodeCount[connectNode.id]){
        var key = getDataNodeShaderKey(dataNode, vsConfig);
        c_vsConnectNodeCache[key] = null;
        connectNode.clearChildren();
    }
}


function getDataNodeShaderKey(dataNode, vsConfig){
    return dataNode.id + "|" + vsConfig.getKey();
}

})();
(function(){

/**
 * @constructor
 * @param {Xflow.DataNode} dataNode
 * @param {Array.<string>} filter
 */
Xflow.Result = function(){
    this.loading = false;
    this.valid = false;
    this._listeners = [];
    this._requests = [];
};
var Result = Xflow.Result;

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype._addRequest = function(request){
    this._requests.push(request);
};

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype._removeRequest = function(request){
    Array.erase(this._requests, request);
};


Result.prototype._notifyChanged = function(state){
    this.valid = false;
    for(var i = 0; i < this._requests.length; ++i){
        this._requests[i]._onResultChanged(state);
    }
    Xflow._listCallback(this, state);
}

Result.prototype._onListedCallback = function(state){
    for(var i = 0; i < this._listeners.length; ++i){
        this._listeners[i](this, state);
    }
}



/**
 * @constructor
 * @extends {Xflow.Result}
 */
Xflow.ComputeResult = function(){
    Xflow.Result.call(this);
    this._outputNames = [];
    /** @type {Object.<string,DataEntry>} */
    this._dataEntries = {};
};
Xflow.createClass(Xflow.ComputeResult, Xflow.Result);
var ComputeResult = Xflow.ComputeResult;

Object.defineProperty(ComputeResult.prototype, "outputNames", {
    set: function(v){
        throw new Error("outputNames is readonly");
    },
    get: function(){ return this._outputNames; }
});

ComputeResult.prototype.getOutputData = function(name){
    return this._dataEntries[name];
};

/**
 * @returns {Object.<string,DataEntry>}
 */
ComputeResult.prototype.getOutputMap = function() {
    return this._dataEntries;
};



    /**
 * @constructor
 * @extends {Xflow.Result}
 */
Xflow.VertexShaderResult = function(){
    Xflow.Result.call(this);
    this._shaderInputNames = null;
    this._program = null;
    this._programData = null;
    this._shaderInputNames = null;

};
Xflow.createClass(Xflow.VertexShaderResult, Xflow.Result);
var VertexShaderResult = Xflow.VertexShaderResult;

Object.defineProperty(VertexShaderResult.prototype, "shaderInputNames", {
    set: function(v){
        throw new Error("shaderInputNames is readonly");
    },
    get: function(){ return this._shaderInputNames; }
});

VertexShaderResult.prototype.getShaderInputData = function(name){
    return this._programData.getDataEntry(this._program._inputIndices[name].index);
};

VertexShaderResult.prototype.isShaderInputUniform = function(name){
    return this._program._inputIndices[name].uniform;
}

VertexShaderResult.prototype.getGLSLCode = function(){
    return this._program._glslCode;
}



})();
(function(){


Xflow.shaderConstant = {}
Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.OBJECT_ID] = "objectID";
Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.SCREEN_TRANSFORM] = "screenTransform";
Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.SCREEN_TRANSFORM_NORMAL] = "screenTransformNormal";
Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM] = "viewTransform";
Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM_NORMAL] = "viewTransformNormal";
Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM] = "worldTransform";
Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM_NORMAL] = "worldTransformNormal";

Xflow.setShaderConstant = function(type, name){
    Xflow.shaderConstant[type] = name;
}


Xflow.VSConfig = function(){
    this._blockedNames = [];
    this._attributes = [];
};
    
    
Xflow.VSConfig.prototype.addAttribute = function(type, inputName, outputName, optional){
    this._attributes.push({
        type: type,
        inputName: inputName,
        outputName: outputName,
        optional: optional
    });
}

Xflow.VSConfig.prototype.getAttributeCount = function(){
    return this._attributes.length;
}


Xflow.VSConfig.prototype.getAttribute = function(i){
    return this._attributes[i];
}

Xflow.VSConfig.prototype.addBlockedName = function(name){
    this._blockedNames.push(name);
}

Xflow.VSConfig.prototype.getBlockedNames = function(){
    return this._blockedNames;
}

Xflow.VSConfig.prototype.getFilter = function(){
    var result = [];
    for(var i = 0; i < this._attributes.length; ++i)
        result.push(this._attributes[i].outputName);
    return result;
}
Xflow.VSConfig.prototype.getKey = function(){
    var key = this._blockedNames.join(";");

    for(var i=0; i< this._attributes.length; ++i){
        key += ";" + this._attributes.type + "," + this._attributes.inputName + "," + this._attributes.outputName
            + "," + this._attributes.optional;
    }
    return key;
}

var c_vs_operator_cache = {};

function getXflowTypeFromGLSLType(glslType){
    switch(glslType){
        case Xflow.VS_ATTRIB_TYPE.FLOAT3_VIEW_NORMAL:
        case Xflow.VS_ATTRIB_TYPE.FLOAT3_VIEW_POINT:
        case Xflow.VS_ATTRIB_TYPE.FLOAT3_WORLD_NORMAL:
        case Xflow.VS_ATTRIB_TYPE.FLOAT3_WORLD_POINT: return Xflow.DATA_TYPE.FLOAT3;
        default: return glslType;
    }
}

Xflow.VSConfig.prototype.getOperator = function(){
    var key = this.getKey();
    if(c_vs_operator_cache[key])
        return c_vs_operator_cache[key];

    var outputs = [], params = [], glslCode = "\t// VS Connector\n";

    var inputAdded = {};

    for(var i = 0; i < this._attributes.length; ++i){
        var attr = this._attributes[i];
        var type = Xflow.getTypeName(getXflowTypeFromGLSLType(attr.type));
        outputs.push( { type: type, name: attr.outputName} );
        if(!inputAdded[attr.inputName]){
            params.push({ type: type, source: attr.inputName, optional: attr.optional} );
            inputAdded[attr.inputName] = true;
        }
        var line = "\t#O{" + attr.outputName + "} = ";
        switch(attr.type){
            case Xflow.VS_ATTRIB_TYPE.FLOAT3_VIEW_NORMAL:
                line += "( #G{" + Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM_NORMAL] + "} "
                    + "* vec4( #I{" + attr.inputName + "} , 0.0)).xyz;"; break;
            case Xflow.VS_ATTRIB_TYPE.FLOAT3_VIEW_POINT:
                line += "( #G{" + Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM] + "} "
                    + "* vec4( #I{" + attr.inputName + "} , 1.0)).xyz;"; break;
            case Xflow.VS_ATTRIB_TYPE.FLOAT3_WORLD_NORMAL:
                line += "( #G{" + Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM_NORMAL] + "} "
                    + "* vec4( #I{" + attr.inputName + "} , 0.0)).xyz;"; break;
            case Xflow.VS_ATTRIB_TYPE.FLOAT3_WORLD_POINT:
                line += "( #G{" + Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM] + "} "
                    + "* vec4( #I{" + attr.inputName + "} , 1.0)).xyz;"; break;
            default:
                line += "#I{" + attr.inputName + "};";
        }
        glslCode += line + "\n";
    }

    glslCode += "\tgl_Position = #G{" + Xflow.shaderConstant[Xflow.SHADER_CONSTANT_KEY.SCREEN_TRANSFORM]
             + "} * vec4(#I{position}, 1.0);\n";

    var operator = Xflow.initAnonymousOperator({
        outputs: outputs,
        params:  params,
        evaluate_glsl: glslCode,
        blockedNames: this._blockedNames
    });

    c_vs_operator_cache[key] = operator;

    return operator;
}

Xflow.VSConfig.prototype.setInputMapping = function(orderMapping){
    var inputAdded = {};
    for(var i = 0; i < this._attributes.length; ++i){
        var name = this._attributes[i].inputName;
        if(!inputAdded[name]){
            orderMapping.setName(i, name);
            inputAdded[name] = true;
        }

    }
}
Xflow.VSConfig.prototype.setOutputMapping = function(orderMapping){
    for(var i = 0; i < this._attributes.length; ++i){
        orderMapping.setName(i, this._attributes[i].outputName);
    }
}



}());(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.DataSlot
//----------------------------------------------------------------------------------------------------------------------

    /**
     * @contructuor
     * @param {Xflow.DataEntry} value
     * @param {number=} key
     */
    Xflow.DataSlot = function(dataEntry, key){
        this.key = key || 0;
        this.dataEntry = dataEntry;
        this.parentChannels = [];

    }
    Xflow.DataSlot.prototype.addChannel = function(channel){
        this.parentChannels.push(channel);
    }
    Xflow.DataSlot.prototype.removeChannel = function(channel){
        var idx = this.parentChannels.indexOf(channel);
        if(idx != -1) this.parentChannels.splice(idx, 1);
    }

    Xflow.DataSlot.prototype.setDataEntry = function(dataEntry, changeType){
        this.dataEntry = dataEntry;
        var state = changeType !== Xflow.RESULT_STATE.CHANGED_DATA_VALUE ? Xflow.DATA_ENTRY_STATE.CHANGED_VALUE :
            Xflow.DATA_ENTRY_STATE.CHANGED_SIZE;
        this.notifyOnChange(state);
    }

    Xflow.DataSlot.prototype.notifyOnChange = function(state){
        for(var i = 0; i < this.parentChannels.length; ++i){
            this.parentChannels[i].notifyOnChange(state);
        }
    }

//----------------------------------------------------------------------------------------------------------------------
// Xflow.ChannelMap
//----------------------------------------------------------------------------------------------------------------------

    /**
     * @constructor
     */
    Xflow.ChannelMap = function(){
        this.map = {};
    }
    var ChannelMap = Xflow.ChannelMap;


    ChannelMap.prototype.getNames = function()
    {
        var result = [];
        for(var name in this.map){
            result.push(name);
        }
        return result;
    }


    ChannelMap.prototype.getChannel = function(name, substitution)
    {
        if(!this.map[name])
            return null;

        var entry = this.map[name];
        var key = getEntryKey(entry, substitution);
        return entry.channels[key] ? entry.channels[key].channel : null;
    }

    ChannelMap.prototype.getProtoNames = function(name){
        if(!this.map[name])
            return null;
        return this.map[name].protoNames;
    }

    ChannelMap.prototype.mergeProtoNames = function(otherChannelMap){
        for(var name in otherChannelMap.map){
            this.addProtoNames(name, otherChannelMap.getProtoNames(name));
        }
    }
    ChannelMap.prototype.addProtoNames = function(name, protoNames){

        var entry = getEntry(this.map, name);
        Xflow.nameset.add(entry.protoNames, protoNames);
    }


    ChannelMap.prototype.merge = function(otherChannelMap, substitution){
        for(var name in otherChannelMap.map){
            this.addChannel(name, otherChannelMap.getChannel(name, substitution), substitution);
        }
    }

    ChannelMap.prototype.addChannel = function(name, channel, substitution){
        var entry = getEntry(this.map, name);
        mergeChannelsIntoMapEntry(this, entry, channel, substitution);
    }


    ChannelMap.prototype.addDataEntry = function(name, dataSlot, paramName, substitution)
    {
        var entry = getEntry(this.map, name);
        if(paramName && substitution){
            if(substitution.map[paramName]){
                mergeChannelsIntoMapEntry(this, entry, substitution.map[paramName], substitution);
                return;
            }else{
                // TODO: at this point we use default values - we need to show an error, if a default values does not exists.
            }
        }
        mergeDataSlotIntoMapEntry(this, entry, dataSlot, substitution);
    }

    ChannelMap.prototype.addOutputDataSlot = function(name, dataSlot, creatorNode, substitution){
        var entry = getEntry(this.map, name);
        var channel = mergeDataSlotIntoMapEntry(this, entry, dataSlot, substitution);
        channel.creatorProcessNode = creatorNode;
    }

    ChannelMap.prototype.markAsDone = function(substitution){
        for(var name in this.map){
            var entry = this.map[name];
            var entryKey = getEntryKey(entry, substitution);
            entry.channels[entryKey].done = true;
        }
    }

    ChannelMap.prototype.clearSubstitution = function(substitution){
        for(var name in this.map){
            var entry = this.map[name];
            var entryKey = getEntryKey(entry, substitution);
            var channel = entry.channels[entryKey] && entry.channels[entryKey].channel;
            if(channel){
                if(channel.map == this){
                    channel.useCount--;
                    if(channel.useCount == 0)
                        channel.clear();
                }
                if(channel.useCount == 0){
                    delete entry.channels[entryKey];
                }
            }

        }
    }

    ChannelMap.prototype.clearAll = function(){
        for(var name in this.map){
            var entry = this.map[name];
            for(var key in entry.channels){
                var channel = entry.channels[key].channel;
                if(channel && channel.map == this)
                    channel.clear();
            }
        }
        this.map = {};
    }

    Xflow.ChannelMap.Entry = function(){
        this.protoNames = [];
        this.origins = 0;
        this.channels = {};
    };

    function getEntry(map, name){
        if(!map[name])
            map[name] = new Xflow.ChannelMap.Entry();
        return map[name];
    }

    function getEntryKey(entry, substitution){
        if(substitution && entry.protoNames.length > 0){
            return substitution.getKey(entry.protoNames);
        }
        else
            return 0;
    }

    function mergeChannelsIntoMapEntry(map, entry, newChannel, substitution){
        var entryKey = getEntryKey(entry, substitution);
        if(!entry.channels[entryKey])
            entry.channels[entryKey] = {done: false, channel: null};
        var channelEntry = entry.channels[entryKey];
        if(channelEntry.done){
            if(channelEntry.channel.map == this)
                channelEntry.useCount++;
            return;
        }

        var finalChannel = mergeChannelIntoChannel(map, entry.channel, newChannel);
        channelEntry.channel = finalChannel;
    }

    function mergeChannelIntoChannel(map, currentChannel, newChannel){
        if(!currentChannel) return newChannel;
        if(!currentChannel.willMergeWithChannel(newChannel))
            return newChannel;
        currentChannel = getMapOwnedChannel(map, currentChannel);
        currentChannel.addChannelEntries(newChannel);
        return currentChannel;
    }


    function mergeDataSlotIntoMapEntry(map, entry, dataSlot, substitution){
        var entryKey = getEntryKey(entry, substitution);
        if(!entry.channels[entryKey])
            entry.channels[entryKey] = {done: false, channel: null};
        var channelEntry = entry.channels[entryKey];
        if(channelEntry.done){
            if(channelEntry.channel.map == this)
                channelEntry.useCount++;
            return channelEntry.channel;
        }
        var finalChannel = mergeDataSlotIntoChannel(map, channelEntry.channel, dataSlot);
        channelEntry.channel = finalChannel;
        return finalChannel;
    }

    function mergeDataSlotIntoChannel(map, currentChannel, dataSlot){
        if(!currentChannel)
            return new Xflow.Channel(map, dataSlot);
        if(!currentChannel.willMergeWithDataSlot(dataSlot))
            return new Xflow.Channel(map, dataSlot);
        currentChannel = getMapOwnedChannel(map, currentChannel);
        currentChannel.addDataSlot(dataSlot);
        return currentChannel;
    }


    function getMapOwnedChannel(map, channel){
        if(channel.map != map){
            var newChannel = new Xflow.Channel(map);
            newChannel.addChannelEntries(channel);
            newChannel.creatorProcessNode = channel.creatorProcessNode;
            return newChannel
        }
        return channel;
    }


//----------------------------------------------------------------------------------------------------------------------
// Xflow.Channel
//----------------------------------------------------------------------------------------------------------------------


    /**
     * @constructor
     * @param {Xflow.ChannelMap} map Owner of the channel
     * @param {Xflow.DataSlot=} dataEntry Optional DataEntry added to the channel
     */
    Xflow.Channel = function(map, dataSlot){
        this.entries = [];
        this.map = map;
        this.id = generateChannelId();
        this.listeners = [];
        this.useCount = 1;
        this.creatorProcessNode = null;

        if(dataSlot){
            this.addDataSlot(dataSlot);
        }
    }
    var Channel = Xflow.Channel;

    Channel.prototype.addDataSlot = function(dataSlot){
        dataSlot.addChannel(this);
        for(var i = 0; i < this.entries.length; ++i){
            var entry = this.entries[i];
            if(entry.key >= dataSlot.key - Xflow.EPSILON ){
                if(Math.abs(entry.key - dataSlot.key) <= Xflow.EPSILON){
                    entry.removeChannel(this);
                    this.entries.splice(i, 1, dataSlot);
                }
                else{
                    this.entries.splice(i, 0, dataSlot);
                }
                break;
            }
        }
        this.entries.push(dataSlot);
    };

    Channel.prototype.getSequenceLength = function(){
        return this.entries.length;
    }
    Channel.prototype.getSequenceMinKey = function(){
        return this.entries[0].key;
    }
    Channel.prototype.getSequenceMaxKey = function(){
        return this.entries[this.entries.length - 1].key;
    }

    Channel.prototype.getType = function(){
        if(this.entries.length == 0)
            return Xflow.DATA_TYPE.UNKNOWN;
        else
            return this.entries[0].dataEntry._type;
    }

    Channel.prototype.addChannelEntries = function(otherChannel){
        for(var i = 0; i < otherChannel.entries.length; ++i){
            var slot = otherChannel.entries[i];
            this.addDataSlot(slot);
        }
    }

    Channel.prototype.getDataEntry = function(sequenceAccessType, sequenceKey){
        if(this.entries.length == 0)
            return null;
        if(!sequenceAccessType)
            return this.entries[0].dataEntry;

        var i = 0, max = this.entries.length;
        while(i < max && this.entries[i].key < sequenceKey) ++i;
        if(sequenceAccessType == Xflow.SEQUENCE.PREV_BUFFER){
            return this.entries[i ? i -1 : 0].dataEntry;
        }
        else if(sequenceAccessType == Xflow.SEQUENCE.NEXT_BUFFER){
            return this.entries[i < max ? i : max - 1].dataEntry;
        }
        else if(sequenceAccessType == Xflow.SEQUENCE.LINEAR_WEIGHT){
            var weight1 = this.entries[i ? i - 1 : 0].key;
            var weight2 = this.entries[i < max ? i : max - 1].key;
            var value = new Float32Array(1);
            value[0] = weight2 == weight1 ? 0 : (sequenceKey - weight1) / (weight2 - weight1);
            // TODO: Check if repeated BufferEntry and Float32Array allocation is a serious bottleneck
            return new Xflow.BufferEntry(Xflow.DATA_TYPE.FLOAT, value);
        }
        return null;
    };


    Channel.prototype.willMergeWithChannel = function(otherChannel){
        if(this.entries.length != otherChannel.entries.length) return true;
        if(this.getType() != otherChannel.getType())
            return false;
        for(var i = 0; i < this.entries.length; i++){
            if(Math.abs(this.entries[i].key - otherChannel.entries[i].key) > Xflow.EPSILON)
                return true;
        }
        return false;
    }
    Channel.prototype.willMergeWithDataSlot = function(dataSlot){
        if(this.entries.length > 1) return true;
        if(this.getType() != dataSlot.dataEntry._type) return false;
        if(Math.abs(this.entries[0].key - dataSlot.key) > Xflow.EPSILON)
            return true;
        return false;
    }

    Channel.prototype.notifyOnChange = function(state){
        for(var i = 0; i < this.listeners.length; i++){
            this.listeners[i].onXflowChannelChange(this, state);
        }
    }

    Channel.prototype.addListener = function(processNode){
        this.listeners.push(processNode);
    }
    Channel.prototype.removeListener = function(processNode){
        var idx = this.listeners.indexOf(processNode);
        if(idx != -1) this.listeners.splice(idx, 1);
    }

    Channel.prototype.clear = function(){
        for(var i = 0; i < this.entries.length; ++i){
            this.entries[i].removeChannel(this);
        }
    }

    var c_channelKeyIdx = 0;
    function generateChannelId(){
        return ++c_channelKeyIdx;
    }



//----------------------------------------------------------------------------------------------------------------------
// Xflow.Substitution
//----------------------------------------------------------------------------------------------------------------------

    Xflow.Substitution = function(channelMap, substitution, subtreeProtoNames){
        this.map = {};
        if(substitution && subtreeProtoNames){
            for(var i = 0; i < subtreeProtoNames.length; ++i){
                var name = subtreeProtoNames[i];
                this.map[name] = substitution.map[name];
            }
        }
        for(var name in channelMap.map){
            this.map[name] = channelMap.getChannel(name, substitution);
        }
    }
    var Substitution = Xflow.Substitution;

    Substitution.prototype.getKey = function(nameFilter){
        var result = [];
        if(nameFilter){
            for(var i = 0; i < nameFilter.length; ++i){
                var channel = this.map[nameFilter[i]];
                result[i] = nameFilter[i] + ">" + (channel && channel.id || "X" );
            }
        }
        else{
            var i = 0;
            for(var name in this.map){
                var channel = this.map[name];
                result[i++] = name + ">" + (channel && channel.id || "X" );
            }
        }
        return result.length > 0 ? result.join(";") : 0;
    }

})();

(function(){


//----------------------------------------------------------------------------------------------------------------------
// Xflow.ChannelNode
//----------------------------------------------------------------------------------------------------------------------

    /**
     * @constructor
     * @extends {Xflow.GraphNode}
     */
    Xflow.ChannelNode = function(dataNode){
        this.owner = dataNode;
        this.loading = false;
        this.inputSlots = {};
        this.inputChannels = new Xflow.ChannelMap();
        this.protoInputChannels = new Xflow.ChannelMap();
        this.finalOutputChannels = new Xflow.ChannelMap();

        this.operator = null;
        this.protoNames = [];
        this.subtreeProtoNames = [];
        this.operatorProtoNames = [];
        this.emptySubstitutionNode = null;
        this.processNodes = {};
        this.requestNodes = {};

        // State:
        this.outOfSync = true; // true if ChannelNode is not synchronized for no substitution
    };
    var ChannelNode = Xflow.ChannelNode;

    ChannelNode.prototype.synchronize = function(){
        if(this.outOfSync){
            synchronizeChildren(this, this.owner);
            setInputProtoNames(this);
            setOperatorProtoNames(this);
            setProtoInputProtoNames(this);
            setFinalOutputProtoNames(this);
            this.outOfSync = false;
        }
    }

    ChannelNode.prototype.getSubstitutionNode = function(substitution){
        this.synchronize();
        if(!substitution){
            if(!this.emptySubstitutionNode)
                this.emptySubstitutionNode = new Xflow.SubstitutionNode(this, null);

            return this.emptySubstitutionNode;
        }
        else{
            return new Xflow.SubstitutionNode(this, substitution);
        }
    }

    ChannelNode.prototype.getProcessNode = function(substitution){
        if(!this.operator)
            return null;

        var key = substitution ? substitution.getKey(this.operatorProtoNames) : 0;
        if(!this.processNodes[key])
            this.processNodes[key] = new Xflow.ProcessNode(this, this.operator, substitution);

        this.processNodes[key].useCount++;
        return this.processNodes[key];
    }

    ChannelNode.prototype.clearProcessNode = function(substitution){
        if(!this.operator)
            return;
        var key = substitution ? substitution.getKey(this.operatorProtoNames) : 0;
        var procNode = this.processNodes[key];
        if(procNode){
            procNode.useCount--;
            if(procNode.useCount == 0)
                delete this.processNodes[key];
        }
    }

    ChannelNode.prototype.notifyDataChange = function(inputNode, changeType){
        var key = inputNode._name + ";" + inputNode._key;
        if(this.inputSlots[key])
            this.inputSlots[key].setDataEntry(inputNode._data, changeType);
    }


    ChannelNode.prototype.setStructureOutOfSync = function()
    {
        if(!this.outOfSync){
            this.outOfSync = true;
            this.inputChannels.clearAll();
            this.protoInputChannels.clearAll();
            this.finalOutputChannels.clearAll();
            if(this.emptySubstitutionNode)
                this.emptySubstitutionNode.clear();
            this.emptySubstitutionNode = null;

            for(var key in this.requestNodes){
                this.requestNodes[key].setStructureOutOfSync();
            }

        }
    }

    ChannelNode.prototype.getOutputNames = function(){
        this.synchronize();
        this.getSubstitutionNode(null); // create emptySubstitutionNode if not available
        return this.finalOutputChannels.getNames();
    }


    ChannelNode.prototype.getParamNames = function(){
        this.synchronize();
        this.getSubstitutionNode(null); // create emptySubstitutionNode if not available
        return this.protoNames;
    }

    ChannelNode.prototype.getResult = function(type, filter)
    {
        this.synchronize();
        this.getSubstitutionNode(null); // create emptySubstitutionNode if not available

        var key = filter ? filter.join(";") : "[null]";
        if(!this.requestNodes[key]){
            this.requestNodes[key] = new Xflow.RequestNode(this, filter);
        }
        return this.requestNodes[key].getResult(type);
    }


    ChannelNode.prototype.getOutputChannelInfo = function(name){
        this.synchronize();
        this.getSubstitutionNode(null); // create emptySubstitutionNode if not available

        var channel = this.finalOutputChannels.getChannel(name);
        if(!channel)
            return null;
        var result = {
            type: channel.getType(),
            seqLength: channel.getSequenceLength(),
            seqMinKey: channel.getSequenceMinKey(),
            seqMaxKey: channel.getSequenceMaxKey(),
            origin: 0,
            originalName: ""
        }
        var preFilterName = this.owner._filterMapping.getRenameSrcName(name);
        var dataEntry = channel.getDataEntry();
        if(this.owner._protoNode){
            var protoInputChannel = this.protoInputChannels.getChannel(preFilterName);
            if(!protoInputChannel || dataEntry != protoInputChannel.getDataEntry()){
                result.origin = Xflow.ORIGIN.PROTO;
                result.originalName = preFilterName;
                return result;
            }
        }
        if(this.operator){
            var inputChannel = this.inputChannels.getChannel(preFilterName);
            if(!inputChannel || dataEntry != inputChannel.getDataEntry()){
                result.origin = Xflow.ORIGIN.COMPUTE;
                result.originalName = this.owner._computeOutputMapping.getScriptOutputNameInv(preFilterName, this.operator.outputs);
                return result;
            }
        }
        result.origin = Xflow.ORIGIN.CHILD;
        result.originalName = preFilterName;
        return result;
    }

    function synchronizeChildren(channelNode, dataNode){
        channelNode.loading = dataNode._subTreeLoading;
        if(dataNode._sourceNode){
            dataNode._sourceNode._channelNode.synchronize();
        }
        else{
            var child;
            for(var i = 0; i < dataNode._children.length; ++i){
                if((child = dataNode._children[i]._channelNode) && !dataNode._children[i].isProtoNode()){
                    child.synchronize();
                }
            }
        }
    }

    function setInputProtoNames(channelNode){
        var owner = channelNode.owner, child;
        if(owner._sourceNode){
            channelNode.inputChannels.mergeProtoNames(owner._sourceNode._channelNode.finalOutputChannels);
        }
        else{
            for(var i = 0; i < owner._children.length; ++i){
                if((child = owner._children[i]._channelNode)  && !owner._children[i].isProtoNode()){
                    channelNode.inputChannels.mergeProtoNames(child.finalOutputChannels);
                    Xflow.nameset.add(channelNode.protoNames, child.protoNames);
                    Xflow.nameset.add(channelNode.subtreeProtoNames, child.subtreeProtoNames);
                }
            }
            for(var i = 0; i < owner._children.length; ++i){
                if((child = owner._children[i]) && !child._channelNode){
                    if(child._paramName){
                        channelNode.inputChannels.addProtoNames(child._name, child._paramName);
                        Xflow.nameset.add(channelNode.protoNames, child._paramName);
                        if(child._paramGlobal){
                            Xflow.nameset.add(channelNode.subtreeProtoNames, child._paramName);
                        }
                    }
                    var key = child._name + ";" + child._key;
                    channelNode.inputSlots[key] = new Xflow.DataSlot(child._data, child._key);

                }
            }
        }
    }

    function setOperatorProtoNames(channelNode){
        if(typeof channelNode.owner._computeOperator == "string"){
            var operatorName = channelNode.owner._computeOperator;
            channelNode.operator = operatorName && Xflow.getOperator(operatorName);
        }
        else{
            channelNode.operator = channelNode.owner._computeOperator;
        }

        if(channelNode.operator){
            var operator = channelNode.operator, inputMapping = channelNode.owner._computeInputMapping;
            for(var i = 0; i < operator.params.length; ++i){
                var dataName = inputMapping.getScriptInputName(i, operator.params[i].source);
                if(dataName){
                    Xflow.nameset.add(channelNode.operatorProtoNames, channelNode.inputChannels.getProtoNames(dataName));
                }
            }
        }
    }

    function setProtoInputProtoNames(channelNode){
        var dataNode = channelNode.owner;
        channelNode.protoInputChannels.mergeProtoNames(channelNode.inputChannels);
        var operator = channelNode.operator;
        if(operator){
            for(var i = 0; i < operator.outputs.length; ++i){
                var name = operator.outputs[i].name;
                var destName = dataNode._computeOutputMapping.getScriptOutputName(i, name);
                channelNode.protoInputChannels.addProtoNames(destName, channelNode.operatorProtoNames);
            }
        }
    }

    function setFinalOutputProtoNames(channelNode){
        var dataNode = channelNode.owner;
        dataNode._filterMapping.applyFilterOnChannelMap(channelNode.finalOutputChannels, channelNode.protoInputChannels,
            null, null, dataNode._filterType, setChannelMapProtoName);

        if(dataNode._protoNode){
            var protoChannelNode = dataNode._protoNode._channelNode;
            Xflow.nameset.add(channelNode.protoNames, protoChannelNode.subtreeProtoNames);
            Xflow.nameset.add(channelNode.subtreeProtoNames, protoChannelNode.subtreeProtoNames);

            var protoOutput = protoChannelNode.finalOutputChannels;
            dataNode._filterMapping.applyFilterOnChannelMap(channelNode.finalOutputChannels, protoOutput,
                channelNode.protoNames, null, dataNode._filterType, setChannelMapProtoProtoName);
        }
    }

    function setChannelMapProtoName(destMap, destName, srcMap, srcName){
        var protoNames = srcMap.getProtoNames(srcName);
        destMap.addProtoNames(destName, protoNames);
    }

    function setChannelMapProtoProtoName(destMap, destName, srcMap, srcName, protoNames){
        destMap.addProtoNames(destName, protoNames);
    }

//----------------------------------------------------------------------------------------------------------------------
// Xflow.SubstitutionNode
//----------------------------------------------------------------------------------------------------------------------

    /**
     * @constructor
     * @extends {Xflow.GraphNode}
     */
    Xflow.SubstitutionNode = function(channelNode, substitution){
        this.owner = channelNode;
        this.substitution = substitution;
        this.childSubNodes = [];
        this.processNode = null;
        this.protoSubNode = null;

        constructSubNode(this, channelNode, substitution);
    };
    var SubstitutionNode = Xflow.SubstitutionNode;

    SubstitutionNode.prototype.clear = function(){
        if(this.substitution){
            clearSubstitution(this.owner, this.substitution);
            for(var i = 0; i < this.childSubNodes.length; ++i){
                this.childSubNodes[i].clear();
            }
        }
        if(this.protoSubNode){
            this.protoSubNode.clear();
        }
        if(this.processNode){
            this.owner.clearProcessNode(this.substitution);
        }
    }


    function constructSubNode(subNode, channelNode, substitution){
        setSubNodeChildren(subNode, channelNode.owner, substitution);
        setSubNodeInputChannels(channelNode, substitution);
        setSubNodeProcessNode(subNode, channelNode, substitution);
        setSubNodeProtoInputChannels(subNode, channelNode, substitution);
        setSubNodeFinalOutputChannels(subNode, channelNode, substitution);
        markChannelsAsDone(channelNode, substitution);
    }

    function setSubNodeChildren(subNode, dataNode, substitution){
        if(dataNode._sourceNode)
            subNode.childSubNodes.push(dataNode._sourceNode._channelNode.getSubstitutionNode(substitution));
        else{
            var child;
            for(var i = 0; i < dataNode._children.length; ++i){
                if((child = dataNode._children[i]._channelNode) && !dataNode._children[i].isProtoNode() ){
                    subNode.childSubNodes.push(child.getSubstitutionNode(substitution));
                }
            }
        }
    }

    function setSubNodeInputChannels(channelNode, substitution){
        var owner = channelNode.owner, child;
        if(owner._sourceNode){
            channelNode.inputChannels.merge(owner._sourceNode._channelNode.finalOutputChannels, substitution);
        }
        else{
            for(var i = 0; i < owner._children.length; ++i){
                if((child = owner._children[i]._channelNode) && !owner._children[i].isProtoNode()){
                    channelNode.inputChannels.merge(child.finalOutputChannels, substitution);
                }
            }
            for(var i = 0; i < owner._children.length; ++i){
                if((child = owner._children[i]) && !child._channelNode){
                    var key = child._name + ";" + child._key;
                    channelNode.inputChannels.addDataEntry(child._name, channelNode.inputSlots[key],
                        child._paramName, substitution);
                }
            }
        }
    }

    function setSubNodeProcessNode(subNode, channelNode, substitution)
    {
        subNode.processNode = channelNode.getProcessNode(substitution);
    }

    function setSubNodeProtoInputChannels(subNode, channelNode, substitution){
        mergeOperatorOutput(subNode, channelNode, substitution);

        var dataNode = channelNode.owner;
        if(dataNode._protoNode){
            var subSubstitution = new Xflow.Substitution(channelNode.protoInputChannels, substitution, channelNode.subtreeProtoNames);
            subNode.protoSubNode = dataNode._protoNode._channelNode.getSubstitutionNode(subSubstitution);
        }
    }

    function mergeOperatorOutput(subNode, channelNode, substitution){
        var dataNode = channelNode.owner;
        channelNode.protoInputChannels.merge(channelNode.inputChannels, substitution);
        var procNode = subNode.processNode;
        if(procNode){
            var index = 0;
            for(var name in procNode.outputDataSlots){
                var destName = dataNode._computeOutputMapping.getScriptOutputName(index, name);
                if(destName){
                    channelNode.protoInputChannels.addOutputDataSlot(destName, procNode.outputDataSlots[name],
                        procNode, substitution);
                }
                index++;
            }
        }
    }

    function setSubNodeFinalOutputChannels(subNode, channelNode, substitution){
        var dataNode = channelNode.owner;
        dataNode._filterMapping.applyFilterOnChannelMap(channelNode.finalOutputChannels, channelNode.protoInputChannels,
            substitution, substitution, dataNode._filterType, setChannelMapChannel);

        if(subNode.protoSubNode){
            var protoChannelNode = subNode.protoSubNode.owner;
            var protoOutput = protoChannelNode.finalOutputChannels;
            dataNode._filterMapping.applyFilterOnChannelMap(channelNode.finalOutputChannels, protoOutput,
                substitution, subNode.protoSubNode.substitution, dataNode._filterType, setChannelMapChannel);
        }
    }

    function setChannelMapChannel(destMap, destName, srcMap, srcName, destSub, srcSub){
        var channel = srcMap.getChannel(srcName, srcSub);
        destMap.addChannel(destName, channel, destSub);
    }

    function markChannelsAsDone(channelNode, substitution){
        channelNode.inputChannels.markAsDone(substitution);
        channelNode.protoInputChannels.markAsDone(substitution);
        channelNode.finalOutputChannels.markAsDone(substitution);
    }



    function clearSubstitution(channelNode, substitution){
        channelNode.inputChannels.clearSubstitution(substitution);
        channelNode.protoInputChannels.clearSubstitution(substitution);
        channelNode.finalOutputChannels.clearSubstitution(substitution);
    }

})();

(function(){


//----------------------------------------------------------------------------------------------------------------------
// Xflow.ProcessNode
//----------------------------------------------------------------------------------------------------------------------

/**
 * @constructor
 * @extends {Xflow.GraphNode}
 */
Xflow.ProcessNode = function(channelNode, operator, substitution){
    this.owner = channelNode;
    this.operator = operator;
    this.inputChannels = {};
    this.outputDataSlots = {};
    this.status = Xflow.PROCESS_STATE.MODIFIED;
    this.useCount = 0;

    this.children = [];
    this.descendants = [];
    this.executers = [];
    constructProcessNode(this, channelNode, operator, substitution);
};
var ProcessNode = Xflow.ProcessNode;

ProcessNode.prototype.onXflowChannelChange = function(channel, state){
    if(state == Xflow.DATA_ENTRY_STATE.CHANGED_VALUE &&
        this.status > Xflow.PROCESS_STATE.UNPROCESSED)
        this.status = Xflow.PROCESS_STATE.UNPROCESSED;
    else
        this.status = Xflow.PROCESS_STATE.MODIFIED;
    for(var name in this.outputDataSlots){
        this.outputDataSlots[name].notifyOnChange(state);
    }
}

ProcessNode.prototype.clear = function(){
    for(var name in this.inputChannels){
        this.inputChannels[name].removeListener(this);
    }
}

ProcessNode.prototype.updateState = function(){
    if(this.status == Xflow.PROCESS_STATE.MODIFIED){
        this.status = Xflow.PROCESS_STATE.UNPROCESSED

        if(this.owner.loading)
            this.status = Xflow.PROCESS_STATE.LOADING;
        else{
            for(var i = 0; i < this.children.length; ++i){
                this.status = Math.min(this.status, this.children[i].updateState());
            }
            if(this.status > Xflow.PROCESS_STATE.LOADING && isInputLoading(this.operator, this.inputChannels))
                this.status = Xflow.PROCESS_STATE.LOADING;

            if(this.status > Xflow.PROCESS_STATE.INVALID &&
                !checkInput(this.operator, this.owner.owner._computeInputMapping, this.inputChannels))
                this.status = Xflow.PROCESS_STATE.INVALID;
        }
    }
    return this.status;
}

ProcessNode.prototype.process = function(){
    // TODO: Fix this with respect to states
    if(this.status == Xflow.PROCESS_STATE.UNPROCESSED){

        var executer = getOrCreateExecuter(this, Xflow.PLATFORM.JAVASCRIPT);
        executer.run();

        this.status = Xflow.PROCESS_STATE.PROCESSED;
    }
}

function constructProcessNode(processNode, channelNode, operator, substitution){
    var dataNode = channelNode.owner;
    synchronizeInputChannels(processNode, channelNode, dataNode, substitution);
    synchronizeChildren(processNode.children, processNode.descendants, processNode.inputChannels);
    synchronizeOutput(processNode.operator, processNode.outputDataSlots);
}

function synchronizeInputChannels(processNode, channelNode, dataNode, substitution){
    var operator = processNode.operator, inputMapping = dataNode._computeInputMapping;
    for(var i = 0; i < operator.params.length; ++i){
        var sourceName = operator.params[i].source;
        var dataName = inputMapping.getScriptInputName(i, sourceName);
        if(dataName){
            var channel = channelNode.inputChannels.getChannel(dataName, substitution);
            if(channel) channel.addListener(processNode);
            processNode.inputChannels[sourceName] = channel;
        }
    }
}

function isInputLoading(operator, inputChannels){
    for(var i in operator.params){
        var entry = operator.params[i];
        var channel = inputChannels[entry.source];
        if(!channel) continue;
        var dataEntry = channel.getDataEntry();
        if(!dataEntry) continue;
        if(dataEntry.isLoading && dataEntry.isLoading()) return true;
    }
    return false;
}

function checkInput(operator, inputMapping, inputChannels){
    for(var i in operator.params){
        var entry = operator.params[i];
        var dataName = inputMapping.getScriptInputName(i, entry.source);
        if(!entry.optional && !dataName){
            XML3D.debug.logError("Xflow: operator " + operator.name + ": Missing input argument for "
                + entry.source);
            return false;
        }
        if(dataName){
            var channel = inputChannels[entry.source];
            if(!channel){
                XML3D.debug.logError("Xflow: operator " + operator.name + ": Input of name '" + dataName +
                    "' not found. Used for parameter " + entry.source);
                return false;
            }
            var dataEntry = channel.getDataEntry();

            if(!channel.creatorProcessNode){
                if(!entry.optional && (!dataEntry || dataEntry.isEmpty())){
                    XML3D.debug.logError("Xflow: operator " + operator.name + ": Input for " + entry.source +
                        ' contains no data.');
                    return false;
                }
            }
            if(dataEntry && dataEntry.type != entry.type){
                XML3D.debug.logError("Xflow: operator " + operator.name + ": Input for " + entry.source +
                    " has wrong type. Expected: " + Xflow.getTypeName(entry.type)
                    + ", but got: " +  Xflow.getTypeName(dataEntry.type) );
                return false;
            }
        }
    }
    return true;
}

function synchronizeChildren(children, descendants, inputChannels){
    var channel, idx;
    for(var name in inputChannels){
        channel = inputChannels[name];
        if(channel && channel.creatorProcessNode){
            Xflow.utils.setAdd(children, channel.creatorProcessNode);
            Xflow.utils.setAdd(descendants, channel.creatorProcessNode.descendants);
        }
    }
    Xflow.utils.setRemove(children, descendants);
    Xflow.utils.setAdd(descendants, children);
}

function synchronizeOutput(operator, outputs){
    for(var i in operator.outputs){
        var d = operator.outputs[i];

        var entry;
        var type = d.type;
        if(type != Xflow.DATA_TYPE.TEXTURE){
            entry = new Xflow.BufferEntry(type, null);
        }
        else{
            entry = window.document ? new Xflow.TextureEntry(null) : new Xflow.ImageDataTextureEntry(null);
        }
        outputs[d.name] = new Xflow.DataSlot(entry, 0);
    }
}

function getOrCreateExecuter(node, platform){
    if(!node.executers[platform]){
        node.executers[platform] = new Xflow.Executer(node, platform);
    }
    return node.executers[platform];

}


//----------------------------------------------------------------------------------------------------------------------
// Xflow.RequestNode
//----------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @param channelNode
 * @param filter
 */
Xflow.RequestNode = function(channelNode, filter){
    this.owner = channelNode;
    this.filter = filter;
    this.results = {};

    this.status = Xflow.PROCESS_STATE.MODIFIED;

    this.channels = {};
    this.children = [];

    this.executers = [];

    this.outOfSync = true;
}
var RequestNode = Xflow.RequestNode;

RequestNode.prototype.synchronize = function(){
    if(this.outOfSync){
        this.outOfSync = false;
        synchronizeRequestChannels(this, this.owner);
        synchronizeChildren(this.children, [], this.channels);
    }
}

RequestNode.prototype.updateState = function(){
    this.synchronize();
    if(this.status == Xflow.PROCESS_STATE.MODIFIED){
        this.status = Xflow.PROCESS_STATE.UNPROCESSED

        if(this.owner.loading)
            this.status = Xflow.PROCESS_STATE.LOADING;
        else{
            for(var i = 0; i < this.children.length; ++i){
                this.status = Math.min(this.status, this.children[i].updateState());
            }
        }
    }
    return this.status;
}

RequestNode.prototype.isReady = function(){
    this.updateState();
    return this.status >= Xflow.PROCESS_STATE.UNPROCESSED;
}

RequestNode.prototype.getResult = function(resultType){
    this.updateState();


    if(this.status == Xflow.PROCESS_STATE.UNPROCESSED){
        if(resultType == Xflow.RESULT_TYPE.COMPUTE){
            var executer = getOrCreateExecuter(this, Xflow.PLATFORM.JAVASCRIPT);
            executer.run();
        }
        this.status = Xflow.PROCESS_STATE.PROCESSED;
    }
    var result = null;
    if(resultType == Xflow.RESULT_TYPE.COMPUTE){
        result = getRequestComputeResult(this);
    }else if(resultType == Xflow.RESULT_TYPE.VS){
        result = getRequestVSResult(this);
    }
    result.loading = (this.status == Xflow.PROCESS_STATE.LOADING);
    return result;
}

RequestNode.prototype.setStructureOutOfSync = function(){
    this.outOfSync = true;
    this.status = Xflow.PROCESS_STATE.MODIFIED;
    for(var type in this.results){
        this.results[type]._notifyChanged(Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    }
    for(var name in this.channels){
        this.channels[name].removeListener(this);
    }
    this.channels = [];
    this.children = [];
    this.executers = [];
}

RequestNode.prototype.onXflowChannelChange = function(channel, state){
    this.status = Xflow.PROCESS_STATE.MODIFIED;
    var notifyState = (state == Xflow.DATA_ENTRY_STATE.CHANGED_VALUE ? Xflow.RESULT_STATE.CHANGED_DATA_VALUE
            : Xflow.RESULT_STATE.CHANGED_DATA_SIZE);

    for(var type in this.results){
        this.results[type]._notifyChanged(notifyState);
    }
}

function synchronizeRequestChannels(requestNode, channelNode){
    var names = requestNode.filter;
    if(!names){
        names = [];
        for(var name in channelNode.finalOutputChannels.map){
            names.push(name);
        }
    }

    for(var i = 0; i < names.length; ++i){
        var name = names[i];
        var channel = channelNode.finalOutputChannels.getChannel(name);
        if(channel){
            requestNode.channels[name] = channel;
            channel.addListener(requestNode);
        }

    }
}

function getRequestComputeResult(requestNode)
{
    if(!requestNode.results[Xflow.RESULT_TYPE.COMPUTE])
        requestNode.results[Xflow.RESULT_TYPE.COMPUTE] = new Xflow.ComputeResult();
    var result = requestNode.results[Xflow.RESULT_TYPE.COMPUTE];
    result._dataEntries = {}; result._outputNames = [];
    for(var name in requestNode.channels){
        var entry = requestNode.channels[name].getDataEntry();
        result._dataEntries[name] = entry && !entry.isEmpty() ? entry : null;
        result._outputNames.push(name);
    }
    return result;
}

function getRequestVSResult(requestNode)
{
    var executer = getOrCreateExecuter(requestNode, Xflow.PLATFORM.GLSL);
    if(!requestNode.results[Xflow.RESULT_TYPE.VS])
        requestNode.results[Xflow.RESULT_TYPE.VS] = new Xflow.VertexShaderResult();
    var result = requestNode.results[Xflow.RESULT_TYPE.VS];

    var program = executer.getVertexShader();
    result._program = program;
    result._programData = executer.programData;
    result._shaderInputNames = Object.keys(program._inputIndices);

    result._dataEntries = {}; result._outputNames = [];
    for(var name in requestNode.channels){
        var entry = requestNode.channels[name].getDataEntry();
        result._dataEntries[name] = entry && !entry.isEmpty() ? entry : null;
        result._outputNames.push(name);
    }
    return result;
}



})();

(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.Executer
//----------------------------------------------------------------------------------------------------------------------

    Xflow.Executer = function(ownerNode, platform){

        this.platform = platform;
        this.mergedNodes = [];
        this.subNodes = [];
        this.unprocessedDataNames = [];

        this.operatorList =  new Xflow.OperatorList(platform);
        this.programData =  new Xflow.ProgramData();

        this.program = null;

        constructExecuter(this, ownerNode);
    }

    Xflow.Executer.prototype.run = function(){
        runSubNodes(this);
        updateIterateState(this);

        this.program = Xflow.createProgram(this.operatorList);

        if(this.program){
            this.operatorList.allocateOutput(this.programData);
            this.program.run(this.programData);
        }
    }

    Xflow.Executer.prototype.getVertexShader = function(){
        runSubNodes(this);
        updateIterateState(this);

        this.program = Xflow.createProgram(this.operatorList);

        return this.program;
    }


    function constructExecuter(executer, ownerNode){
        var cData = {
            blockedNodes: [],
            doneNodes: [],
            constructionOrder: [],
            inputSlots: {},
            finalOutput: null,
            firstOperator: null
        }
        initRequestNode(cData, executer, ownerNode);

        constructPreScan(cData, ownerNode, executer.platform);

        setConstructionOrderAndSubNodes(cData, executer, ownerNode);

        constructFromData(executer, cData);
    }

    function initRequestNode(cData, executer, ownerNode){
        if(ownerNode instanceof Xflow.RequestNode){
            cData.finalOutput = {};
            var filter = ownerNode.filter || ownerNode.owner.finalOutputChannels.getNames();
            for(var i = 0; i < filter.length; ++i){
                var name = filter[i];
                var channel = ownerNode.owner.finalOutputChannels.getChannel(name);
                if(channel && channel.creatorProcessNode)
                    cData.finalOutput[name] = channel.getDataEntry();
            }
            Xflow.nameset.add(executer.unprocessedDataNames, filter);
        }
    }

    function constructPreScan(cData, node, platform){
        if(cData.blockedNodes.indexOf(node) != -1)
            return;

        if(node.operator){
            if(!canOperatorMerge(cData, node.operator, platform)){
                blockSubtree(cData, node);
                return;
            }
            else{
                if(!cData.firstOperator) cData.firstOperator = node.operator;
                var mapping = node.operator.mapping;
                for(var i = 0; i < mapping.length; ++i){
                    if(mapping[i].sequence){
                        blockInput(cData, node, mapping[i].source);
                        blockInput(cData, node, mapping[i].keySource);
                    }
                    else if(mapping[i].array){
                        // TODO: Check for other things that cancel merging
                        blockInput(cData, node, mapping[i].source);
                    }
                }
            }
        }
        for(var i = 0; i < node.children.length; ++i){
            constructPreScan(cData, node.children[i], platform);
        }
    }

    function canOperatorMerge(cData, operator, platform){
        // TODO: Detect merge support
        return !cData.firstOperator ||
            (platform == Xflow.PLATFORM.GLSL && cData.firstOperator.evaluate_glsl && operator.evaluate_glsl);
    }

    function blockSubtree(cData, node){
        if(cData.blockedNodes.indexOf(node) != -1)
            return;

        cData.blockedNodes.push(node);
        for(var i = 0; i < node.children.length; ++i){
            blockSubtree(cData, node.children[i]);
        }
    }

    function blockInput(cData, node, inputName){
        var channel = node.inputChannels[inputName];
        if(channel && channel.creatorProcessNode){
            blockSubtree(cData, channel.creatorProcessNode);
        }
    }

    function setConstructionOrderAndSubNodes(cData, executer, node){
        if(cData.doneNodes.indexOf(node) != -1)
            return;

        cData.doneNodes.push(node);

        if(cData.blockedNodes.indexOf(node) != -1){
            executer.subNodes.push(node);
        }
        else{
            for(var i = 0; i < node.children.length; ++i){
                setConstructionOrderAndSubNodes(cData, executer, node.children[i]);
            }

            if(node.operator){
                cData.constructionOrder.push(node);
            }
        }
    }

    function constructFromData(executer, cData){

        for(var i = 0; i < cData.constructionOrder.length; ++i){
            var node = cData.constructionOrder[i];
            var currentIdx = i;

            var entry = new Xflow.OperatorEntry(node.operator);

            constructInputConnection(executer, entry, cData, node);

            constructOutputConnection(executer, entry, cData, node);

            executer.programData.operatorData.push({});
            executer.operatorList.addEntry(entry);
            executer.mergedNodes.push(node);

        }

        constructLostOutput(executer, cData);
    }

    function constructInputConnection(executer, entry, cData, node){
        var mapping = node.operator.mapping;
        for(var j = 0; j < mapping.length; ++j){
            var channel = node.inputChannels[mapping[j].source];
            var operatorIndex;
            if(channel && channel.creatorProcessNode && (operatorIndex =
                executer.mergedNodes.indexOf(channel.creatorProcessNode) ) != -1 )
            {
                // it's transfer input
                var outputIndex = getOperatorOutputIndex(channel.creatorProcessNode, channel);
                entry.setTransferInput(j, operatorIndex, outputIndex);
                if(!executer.operatorList.entries[operatorIndex].isFinalOutput(outputIndex))
                    executer.operatorList.entries[operatorIndex].setTransferOutput(outputIndex);
                continue;
            }

            var mappedInputName = node.owner.owner._computeInputMapping.getScriptInputName(mapping[j].paramIdx,
                mapping[j].source);

            var connection = new Xflow.ProgramInputConnection();
            connection.channel = channel;
            connection.arrayAccess = mapping[j].array || false;
            connection.sequenceAccessType = mapping[j].sequence || 0;
            if(connection.sequenceAccessType)
                connection.sequenceKeySourceChannel = node.inputChannels[mapping[j].keySource];

            var connectionKey = connection.getKey();
            var inputSlotIdx = cData.inputSlots[connectionKey];
            if(channel && inputSlotIdx != undefined){
                // Direct input already exists
                entry.setDirectInput(j, inputSlotIdx, mappedInputName);
            }
            else{
                // new direct input
                inputSlotIdx = executer.programData.inputs.length;
                cData.inputSlots[connectionKey] = inputSlotIdx;
                executer.programData.inputs.push(connection);
                entry.setDirectInput(j, inputSlotIdx, mappedInputName);
            }
        }
    }

    function constructOutputConnection(executer, entry, cData, node){
        var outputs = node.operator.outputs;
        for(var i = 0; i < outputs.length; ++i){
            var slot = node.outputDataSlots[outputs[i].name];
            var finalOutputName = getFinalOutputName(slot, cData);
            if(finalOutputName){
                var index =  executer.programData.outputs.length;
                executer.programData.outputs.push(slot);
                entry.setFinalOutput(i, index);
                if(finalOutputName !== true){
                    Xflow.nameset.remove(executer.unprocessedDataNames, finalOutputName);
                }
            }
        }
    }


    function getOperatorOutputIndex(processNode, channel){
        var outputs = processNode.operator.outputs;
        for(var i = 0; i < outputs.length; ++i){
            if(channel.getDataEntry() == processNode.outputDataSlots[outputs[i].name].dataEntry){
                return i;
            }
        }
        return null;
    }

    function getFinalOutputName(dataSlot, cData){
        if(!cData.finalOutput)
            return true;
        for(var name in cData.finalOutput){
            if(cData.finalOutput[name] == dataSlot.dataEntry){
                return name;
            }
        }
        return false;
    }

    function constructLostOutput(executor, cData){
        for(var i = 0; i < cData.constructionOrder.length; ++i){
            var node = cData.constructionOrder[i];
            var entry = executor.operatorList.entries[i];

            var outputs = node.operator.outputs;
            for(var j = 0; j < outputs.length; ++j){
                if(!entry.isFinalOutput(j) && ! entry.isTransferOutput(j)){
                    var index = executor.programData.outputs.length;
                    executor.programData.outputs.push(node.outputDataSlots[outputs[j].name]);
                    entry.setLostOutput(j, index);
                }
            }
        }
    }


    function updateIterateState(executer){
        var inputs = executer.programData.inputs;
        for(var i = 0; i < executer.programData.inputs.length; ++i){
            var entry = executer.programData.getDataEntry(i);
            var iterateCount = entry ? entry.getIterateCount ? entry.getIterateCount() : 1 : 0;
            if(!inputs[i].arrayAccess && iterateCount != 1)
                executer.operatorList.setInputIterate(i, true);
            else
                executer.operatorList.setInputIterate(i, false);
            if(inputs[i].arrayAccess && platformRequiresArraySize(executer. platform)){
                executer.operatorList.setInputSize(i, iterateCount);
            }
        }
    }

    function platformRequiresArraySize(platform){
        return platform == Xflow.PLATFORM.GLSL;
    }


    function runSubNodes(executer){
        for(var i = 0; i < executer.subNodes.length; ++i){
            executer.subNodes[i].process();
        }
    }

})();(function(){



Xflow.utils = {};


Xflow.utils.setAdd = function(setArray, setToAdd){
    if(setToAdd.length !== undefined){
        for(var i = 0; i < setToAdd.length; ++i){
            if(setArray.indexOf(setToAdd[i]) == -1)
                setArray.push(setToAdd[i]);
        }
    }
    else{
        if(setArray.indexOf(setToAdd) == -1)
            setArray.push(setToAdd);
    }
}
Xflow.utils.setRemove = function(setArray, setToRemove){
    var idx;
    if(setToRemove.length !== undefined){
        for(var i = 0; i < setToRemove.length; ++i){
            if( (idx = setArray.indexOf(setToRemove[i])) != -1)
                setArray.splice(idx,1);
        }
    }
    else{
        if( (idx = setArray.indexOf(setToRemove)) != -1)
            setArray.splice(idx,1);
    }
}

/**
 * Nameset Utilities for Xflow
 */
Xflow.nameset = {};

Xflow.nameset.add = function(nameSet, toAdd){
    if(!toAdd) return;
    if(typeof toAdd == "string"){
        if(nameSet.indexOf(toAdd) == -1)
            nameSet.push(toAdd);
    }
    else{
        for(var i = 0; i < toAdd.length; ++i){
            if(nameSet.indexOf(toAdd[i]) == -1)
                nameSet.push(toAdd[i]);
        }
    }
}

Xflow.nameset.remove = function(nameSet, toRemove){
    if(!toRemove) return;
    if(typeof toRemove == "string"){
        var removeIdx = nameSet.indexOf(toRemove);
        if(removeIdx != -1)
            nameSet.splice(removeIdx, 1);
    }
    else{
        for(var i = 0; i < toRemove.length; ++i){
            var removeIdx = nameSet.indexOf(toRemove[i]);
            if(removeIdx != -1)
                nameSet.splice(removeIdx, 1);
        }
    }
}

Xflow.nameset.intersection = function(nameSetA, nameSetB){
    var result = [];
    var i = nameSetA.length;
    while(i--){
        if(nameSetB.indexOf(nameSetA[i]) == -1){
            nameSetA.splice(i,1);
        }
    }
}


Xflow.utils.binarySearch = function(keys, key, maxIndex){
    var min = 0, max = maxIndex - 1;
    while(min <= max){
        var i = Math.floor((min + max) / 2);
        if(keys[i] == key){
            return i;
        }
        else if(keys[i] < key)
            min = i + 1;
        else
            max = i - 1;
    }
    return max;
}


})();
(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.registerOperator && Xflow.getOperator
//----------------------------------------------------------------------------------------------------------------------

var operators = {};

Xflow.registerOperator = function(name, data){
    var actualName = name;
    initOperator(data);
    operators[actualName] = data;
    data.name = actualName;
};

Xflow.initAnonymousOperator = function(data){
    initOperator(data);
    data.name = "Anonymous Operator";
    return data;
}

Xflow.getOperator = function(name){
    if (name && !operators[name])
    {
        XML3D.debug.logError("Unknown operator: '" + name+"'");
        return null;
    }
    return operators[name];
};

function initOperator(operator){
    var indexMap = {};
    // Init types of outputs and params
    for(var i= 0; i < operator.outputs.length; ++i){
        operator.outputs[i].type = Xflow.DATA_TYPE_MAP[operator.outputs[i].type];
    }
    for(var i= 0; i < operator.params.length; ++i){
        operator.params[i].type = Xflow.DATA_TYPE_MAP[operator.params[i].type];
        indexMap[operator.params[i].source] = i;
    }
    if(!operator.mapping)
        operator.mapping = operator.params;

    // Init interTypes of mapping
    for(var i = 0; i < operator.mapping.length; ++i){
        var mapping = operator.mapping[i];
        var paramIdx = indexMap[mapping.source];
        mapping.paramIdx = paramIdx;
        var type = operator.params[paramIdx].type;
        if(mapping.sequence)
            mapping.keyParamIdx = indexMap[mapping.keySource];
        if(mapping.sequence == Xflow.SEQUENCE.LINEAR_WEIGHT)
            type = Xflow.DATA_TYPE.FLOAT;
        mapping.internalType = type;
        mapping.name = mapping.name || mapping.source;
    }
}


//----------------------------------------------------------------------------------------------------------------------
// Xflow.DataNode Extension
//----------------------------------------------------------------------------------------------------------------------

var DataNode = Xflow.DataNode;

function prepareInputs(operator, inputChannels, operatorInput){
    for(var i in operator.mapping){
        var mapping = operator.mapping[i];
        var sourceName = mapping.source;
        var channel = inputChannels[sourceName];
        var keyValue = 0;
        if(mapping.sequence){
            var keyName = mapping.keySource;
            var keyChannel = inputChannels[keyName];
            var keyEntry =  keyChannel ? keyChannel.getDataEntry() : null;
            keyValue = keyEntry && keyEntry._value ? keyEntry._value[0] : 0;
        }
        operatorInput.push(channel ? channel.getDataEntry(mapping.sequence, keyValue) : null);
    }
}

function inputIsIterating(inputInfo, dataEntry){
    return !inputInfo.array && dataEntry && dataEntry.getIterateCount() > 1;
}

function getIterateCount(operator, inputData, operatorData){
    var minCnt = -1;
    if(operatorData){
        operatorData.iterateKey = "";
        operatorData.iterFlag = {};
    }
    for(var i in operator.mapping){
        var inputInfo = operator.mapping[i];
        var dataEntry = inputData[i];
        if(!inputIsIterating(inputInfo, dataEntry)){
            if(operatorData) operatorData.iterateKey += "a";
            continue;
        }
        if(operatorData){
            operatorData.iterateKey += "i";
            operatorData.iterFlag[i] = true;
        }
        var cnt = dataEntry.getIterateCount();
        minCnt = minCnt == -1 ? cnt : Math.min(cnt, minCnt);
    }
    minCnt = minCnt == -1 ? 1 : minCnt;
    if(operatorData) operatorData.iterateCount = minCnt;
    return minCnt;
}

var c_FunctionPattern = /function\s+([^(]*)\(([^)]*)\)\s*\{([\s\S]*)\}/;

function parseFunction(func){
    var result = {};
    var matches = func.toString().match(c_FunctionPattern);
    if(!matches){
        XML3D.debug.logError("Xflow Internal: Could not parse function: " + func);
        return null;
    }
    result.args = matches[2].split(",");
    for(var i in result.args) result.args[i] = result.args[i].trim();
    result.body = matches[3];
    return result;
}

var c_bracketPattern = /([a-zA-Z_$][\w$]*)(\[)/;

function replaceArrayAccess(code, args, operator, operatorData){
    var result = "";
    var index = 0, bracketIndex = code.indexOf("[", index);
    while(bracketIndex != -1){
        var key = code.substr(index).match(c_bracketPattern)[1];

        var argIdx = args.indexOf(key);
        var addIndex = false, tupleCnt = 0;
        if(argIdx != -1){
            if(argIdx < operator.outputs.length){
                addIndex = true;
                tupleCnt = Xflow.DATA_TYPE_TUPLE_SIZE[[operator.outputs[argIdx].type]];
            }
            else{
                var i = argIdx - operator.outputs.length;
                addIndex = operatorData.iterFlag[i];
                tupleCnt = Xflow.DATA_TYPE_TUPLE_SIZE[operator.mapping[i].internalType];
            }
        }

        result += code.substring(index, bracketIndex) + "["
        if(addIndex){
            result += tupleCnt + "*__xflowI + ";
        }
        index = bracketIndex + 1;
        bracketIndex = code.indexOf("[", index);
    }
    result +=  code.substring(index);
    return result;
}

var c_VarPattern = /var\s+(.)+[;\n]/;
var c_InnerVarPattern = /[^=,\s]+\s*(=[^,]+)?(,)?/;
function createOperatorInlineLoop(operator, operatorData){

    var code = "function (";
    var funcData = parseFunction(operator.evaluate_core);
    code += funcData.args.join(",") + ",__xflowMax) {\n";
    code += "    var __xflowI = __xflowMax\n" +
        "    while(__xflowI--){\n";

    var body = funcData.body;
    body = replaceArrayAccess(body, funcData.args, operator, operatorData);
    code += body + "\n  }\n}";

    var inlineFunc = eval("(" + code + ")");
    return inlineFunc;
}

var c_sizes = {};

function allocateOutput(operator, inputData, output, operatorData){
    if(operator.alloc){
        var args = [c_sizes];
        addInputToArgs(args, inputData);
        operator.alloc.apply(operatorData, args);
    }

    for(var i in operator.outputs){
        var d = operator.outputs[i];
        var entry = output[d.name].dataEntry;

        if (entry.type == Xflow.DATA_TYPE.TEXTURE) {
            // texture entry
            if (d.customAlloc)
            {
                var texParams = c_sizes[d.name];
                var newWidth = texParams.imageFormat.width;
                var newHeight = texParams.imageFormat.height;
                var newFormatType = texParams.imageFormat.type;
                var newSamplerConfig = texParams.samplerConfig;
                entry._createImage(newWidth, newHeight, newFormatType, newSamplerConfig);
            } else if (d.sizeof) {
                var srcEntry = null;
                for (var j in operator.mapping) {
                    if (operator.mapping[j].source == d.sizeof) {
                        srcEntry = inputData[operator.mapping[j].paramIdx];
                        break;
                    }
                }
                if (srcEntry) {
                    var newWidth = Math.max(srcEntry.getWidth(), 1);
                    var newHeight = Math.max(srcEntry.getHeight(), 1);
                    var newFormatType = d.formatType || srcEntry.getFormatType();
                    var newSamplerConfig = d.samplerConfig || srcEntry.getSamplerConfig();
                    entry._createImage(newWidth, newHeight, newFormatType, newSamplerConfig);
                }
                else
                    throw new Error("Unknown texture input parameter '" + d.sizeof+"' in operator '"+operator.name+"'");
            } else
                throw new Error("Cannot create texture. Use customAlloc or sizeof parameter attribute");
        } else {
            // buffer entry
            var size = (d.customAlloc ? c_sizes[d.name] : operatorData.iterateCount) * entry.getTupleSize();

            if( !entry._value || entry._value.length != size){
                switch(entry.type){
                    case Xflow.DATA_TYPE.FLOAT:
                    case Xflow.DATA_TYPE.FLOAT2:
                    case Xflow.DATA_TYPE.FLOAT3:
                    case Xflow.DATA_TYPE.FLOAT4:
                    case Xflow.DATA_TYPE.FLOAT4X4: entry.setValue(new Float32Array(size)); break;
                    case Xflow.DATA_TYPE.INT:
                    case Xflow.DATA_TYPE.INT4:
                    case Xflow.DATA_TYPE.BOOL: entry.setValue(new Int32Array(size)); break;
                    default: XML3D.debug.logWarning("Could not allocate output buffer of TYPE: " + entry.type);
                }
            }
            else{
                entry._notifyChanged();
            }
        }
    }
}

function assembleFunctionArgs(operator, inputData, outputData){
    var args = [];
    for(var i in operator.outputs){
        var d = operator.outputs[i];
        var entry = outputData[d.name].dataEntry;
        var value = entry ? entry.getValue() : null;
        args.push(value);
    }
    addInputToArgs(args, inputData);
    return args;
}

function addInputToArgs(args, inputData){
    for(var i = 0; i < inputData.length; ++i){
        var entry = inputData[i];
        var value = entry ? entry.getValue() : null;
        args.push(value);
    }
}

function applyDefaultOperation(operator, inputData, outputData, operatorData){
    var args = assembleFunctionArgs(operator, inputData, outputData);
    args.push(operatorData);
    operator.evaluate.apply(operatorData, args);
}

function applyCoreOperation(operator, inputData, outputData, operatorData){
    var args = assembleFunctionArgs(operator, inputData, outputData);
    args.push(operatorData.iterateCount);

    var key = operatorData.iterateKey;
    if(!operator._inlineLoop) operator._inlineLoop = {};
    if(!operator._inlineLoop[key]){
        operator._inlineLoop[key] = createOperatorInlineLoop(operator, operatorData);
    }
    operator._inlineLoop[key].apply(operatorData, args);
}

if(window.ParallelArray){
    var createParallelArray = (function() {
        function F(args) {
            return ParallelArray.apply(this, args);
        }
        F.prototype = ParallelArray.prototype;

        return function() {
            return new F(arguments);
        }
    })();
}

function riverTrailAvailable(){
    return window.ParallelArray && window.RiverTrail && window.RiverTrail.compiler;
}


function applyParallelOperator(operator, inputData, outputData, operatorData){
    var args = [];
    // Compute Output image size:
    var size = [];
    args.push(size);
    args.push(operator.evaluate_parallel);
    for(var i = 0; i < operator.mapping.length; ++i){
        var entry = inputData[i];
        var value = null;
        if(entry){
            if(operator.mapping[i].internalType == Xflow.DATA_TYPE.TEXTURE){
                if(size.length == 0){
                    size[0] = inputData[i].getHeight();
                    size[1] = inputData[i].getWidth();
                }
                else{
                    size[0] = Math.min(size[0], inputData[i].getHeight());
                    size[1] = Math.min(size[1], inputData[i].getWidth());
                }
                value = new ParallelArray(inputData[i].getFilledCanvas());
            }
            else{
                value = new ParallelArray(inputData[i].getValue());
            }
        }
        args.push(value);
    }
    var result = createParallelArray.apply(this, args);
    result.materialize();
    var outputName = operator.outputs[0].name;
    var outputDataEntry = outputData[outputName].dataEntry;

    window.RiverTrail.compiler.openCLContext.writeToContext2D(outputDataEntry.getContext2D(),
        result.data, outputDataEntry.getWidth(), outputDataEntry.getHeight());

    var value = outputDataEntry.getValue();
    return value;
}


Xflow.ProcessNode.prototype.applyOperator = function(){
    if(!this._operatorData)
        this._operatorData = {
            iterateKey: null,
            iterFlag: {},
            iterateCount: 0
        }
    var inputData = [];
    prepareInputs(this.operator, this.inputChannels, inputData);
    var count = getIterateCount(this.operator, inputData, this._operatorData);

    if( this.operator.evaluate_parallel && riverTrailAvailable() ){
        allocateOutput(this.operator, inputData, this.outputDataSlots, this._operatorData);
        applyParallelOperator(this.operator, inputData, this.outputDataSlots, this._operatorData);
    }
    else if(this.operator.evaluate_core){
        allocateOutput(this.operator, inputData, this.outputDataSlots, this._operatorData);
        applyCoreOperation(this.operator, inputData, this.outputDataSlots, this._operatorData);
    }
    else{
        allocateOutput(this.operator, inputData, this.outputDataSlots, this._operatorData);
        applyDefaultOperation(this.operator, inputData, this.outputDataSlots, this._operatorData);
    }
    for (var i in this.outputDataSlots) {
        var entry = this.outputDataSlots[i].dataEntry;
        if (entry.finish)
            entry.finish();
    }
}

})();
(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.OperatorList
//----------------------------------------------------------------------------------------------------------------------

    Xflow.OperatorEntry = function(operator){
        this.index = 0;
        this.operator = operator;
        this.inputInfo = [];
        this.outputInfo = [];
    }
    Xflow.OperatorEntry.prototype.isTransferInput = function(mappingIndex){
        return this.inputInfo[mappingIndex].operatorIndex !== undefined;
    }
    Xflow.OperatorEntry.prototype.getTransferInputOperatorIndex = function(mappingIndex){
        return this.inputInfo[mappingIndex].operatorIndex;
    }
    Xflow.OperatorEntry.prototype.getTransferInputOutputIndex = function(mappingIndex){
        return this.inputInfo[mappingIndex].outputIndex;
    }

    Xflow.OperatorEntry.prototype.getTransferInputId = function(mappingIdx){
        var info = this.inputInfo[mappingIdx];
        return info.operatorIndex + "_" + info.outputIndex;
    }
    Xflow.OperatorEntry.prototype.getTransferOutputId = function(outputIndex){
        return this.index + "_" + outputIndex;
    }

    Xflow.OperatorEntry.prototype.getInputMappingName = function(mappingIdx){
        return this.inputInfo[mappingIdx].mappedName;
    }
    Xflow.OperatorEntry.prototype.getDirectInputIndex = function(mappingIdx){
        return this.inputInfo[mappingIdx].inputIndex;
    }

    Xflow.OperatorEntry.prototype.getOutputIndex = function(operatorOutputIdx){
        return this.outputInfo[operatorOutputIdx].finalOut || this.outputInfo[operatorOutputIdx].lost || 0;
    }


    Xflow.OperatorEntry.prototype.isFinalOutput = function(outputIndex){
        return this.outputInfo[outputIndex] && this.outputInfo[outputIndex].finalOut !== undefined;
    }
    Xflow.OperatorEntry.prototype.isTransferOutput = function(outputIndex){
        return this.outputInfo[outputIndex] && this.outputInfo[outputIndex].transfer;
    }
    Xflow.OperatorEntry.prototype.isLostOutput = function(outputIndex){
        return this.outputInfo[outputIndex] && this.outputInfo[outputIndex].lost !== undefined;
    }


    Xflow.OperatorEntry.prototype.setTransferInput = function(mappingIndex, operatorIndex, outputIndex){
        this.inputInfo[mappingIndex] = { operatorIndex: operatorIndex, outputIndex: outputIndex};
    }

    Xflow.OperatorEntry.prototype.setDirectInput = function(mappingIndex, inputIndex, mappedName){
        this.inputInfo[mappingIndex] = { inputIndex: inputIndex, mappedName: mappedName };
    }

    Xflow.OperatorEntry.prototype.setFinalOutput = function(operatorOutputIndex, globalOutputIndex){
        this.outputInfo[operatorOutputIndex] = { finalOut : globalOutputIndex };
    }
    Xflow.OperatorEntry.prototype.setTransferOutput = function(operatorOutputIndex){
        this.outputInfo[operatorOutputIndex] = { transfer: true };
    }
    Xflow.OperatorEntry.prototype.setLostOutput = function(operatorOutputIndex, globalOutputIndex){
        this.outputInfo[operatorOutputIndex] = { lost: globalOutputIndex};
    }

    Xflow.OperatorEntry.prototype.getKey = function(){
        var key = this.operator.name + "*O";
        for(var i = 0; i <this.outputInfo.length; ++i){
            var info = this.outputInfo[i];
            key += "*" + ( info.transfer ? "_" : info.finalOut || (info.lost + "?"));
        }
        key += + "*I";
        for(var i = 0; i <this.inputInfo.length; ++i){
            var info = this.inputInfo[i];
            key += "*" + (info.inputIndex ? info.inputInfo : info.operatorIndex + ">" + info.outputIndex);
        }
        return key;
    }

    Xflow.OperatorList = function(platform){
        this.platform = platform
        this.entries = [];
        this.inputInfo = {};
    }

    Xflow.OperatorList.prototype.addEntry = function(entry){
        entry.index = this.entries.length;
        this.entries.push(entry);
    }

    Xflow.OperatorList.prototype.getKey = function(){
        var keys = [];
        for(var i = 0; i < this.entries.length; ++i){
            keys.push(this.entries[i].getKey());
        }
        var result = this.platform + ">" + keys.join("!") + "|";
        for(var i in this.inputInfo){
            result += i + ">" + (this.inputInfo[i].iterate || false) + "x" + (this.inputInfo[i].size || 0);
        }
        return result;
    }

    Xflow.OperatorList.prototype.setInputIterate = function(inputIndex, value){
        if(!this.inputInfo[inputIndex]) this.inputInfo[inputIndex] = {};
        this.inputInfo[inputIndex].iterate = value;
    }
    Xflow.OperatorList.prototype.setInputSize = function(inputIndex, size){
        if(!this.inputInfo[inputIndex]) this.inputInfo[inputIndex] = {};
        this.inputInfo[inputIndex].size = size;
    }


    Xflow.OperatorList.prototype.isInputIterate = function(inputIndex){
        return this.inputInfo[inputIndex] && this.inputInfo[inputIndex].iterate;
    }
    Xflow.OperatorList.prototype.getInputSize = function(inputIndex){
        return this.inputInfo[inputIndex] && this.inputInfo[inputIndex].size || 0;
    }

    Xflow.OperatorList.prototype.getIterateCount = function(programData){
        var count = -1;
        for(var i = 0; i < programData.inputs.length; ++i){
            if(this.isInputIterate(i)){
                var dataEntry = programData.getDataEntry(i);
                if(dataEntry && dataEntry.getIterateCount){
                    var size = dataEntry.getIterateCount();
                    count = count < 0 ? size : Math.min(size, count);
                }
            }
        }
        return count < 0 ? 1 : count;
    }

    var c_sizes = {};

    Xflow.OperatorList.prototype.allocateOutput = function(programData){
        for(var i = 0; i < this.entries.length; ++i){
            var entry = this.entries[i];
            var operator = entry.operator;
            var operatorData = programData.operatorData[i]
            if(operator.alloc){
                var args = [c_sizes];
                addInputToArgs(args, entry, programData);
                operator.alloc.apply(operatorData, args);
            }
            var iterateCount = this.getIterateCount(programData);
            for(var j = 0; j < operator.outputs.length; ++j){
                var d = operator.outputs[i];
                var dataEntry = programData.outputs[entry.getOutputIndex(j)].dataEntry;


                if (dataEntry.type == Xflow.DATA_TYPE.TEXTURE) {
                    // texture entry
                    if (d.customAlloc)
                    {
                        var texParams = c_sizes[d.name];
                        var newWidth = texParams.imageFormat.width;
                        var newHeight = texParams.imageFormat.height;
                        var newFormatType = texParams.imageFormat.type;
                        var newSamplerConfig = texParams.samplerConfig;
                        dataEntry._createImage(newWidth, newHeight, newFormatType, newSamplerConfig);
                    } else if (d.sizeof) {
                        var srcEntry = null;
                        for(var k = 0; k < operator.mapping.length; ++k){
                            if (operator.mapping[j].source == d.sizeof) {
                                srcEntry = programData.getDataEntry(entry.getDirectInputIndex(k));
                                break;
                            }
                        }
                        if (srcEntry) {
                            var newWidth = Math.max(srcEntry.getWidth(), 1);
                            var newHeight = Math.max(srcEntry.getHeight(), 1);
                            var newFormatType = d.formatType || srcEntry.getFormatType();
                            var newSamplerConfig = d.samplerConfig || srcEntry.getSamplerConfig();
                            dataEntry._createImage(newWidth, newHeight, newFormatType, newSamplerConfig);
                        }
                        else
                            throw new Error("Unknown texture input parameter '" + d.sizeof+"' in operator '"+operator.name+"'");
                    } else
                        throw new Error("Cannot create texture. Use customAlloc or sizeof parameter attribute");
                } else {

                    var size = (d.customAlloc ? c_sizes[d.name] : iterateCount) * dataEntry.getTupleSize();

                    if( !dataEntry._value || dataEntry._value.length != size){
                        switch(dataEntry.type){
                            case Xflow.DATA_TYPE.FLOAT:
                            case Xflow.DATA_TYPE.FLOAT2:
                            case Xflow.DATA_TYPE.FLOAT3:
                            case Xflow.DATA_TYPE.FLOAT4:
                            case Xflow.DATA_TYPE.FLOAT4X4: dataEntry.setValue(new Float32Array(size)); break;
                            case Xflow.DATA_TYPE.INT:
                            case Xflow.DATA_TYPE.INT4:
                            case Xflow.DATA_TYPE.BOOL: dataEntry.setValue(new Int32Array(size)); break;
                            default: XML3D.debug.logWarning("Could not allocate output buffer of TYPE: " + dataEntry.type);
                        }
                    }
                    else{
                        dataEntry._notifyChanged();
                    }
                }
            }
        }
    }

    /*
    Xflow.OperatorList.prototype.checkInput = function(programData){
        for(var i = 0; i < this.entries.length; ++i){
            var entry = this.entries[i];
            var mapping = entry.operator.mapping;
            for(var j = 0; j < mapping.length; ++j){
                if(entry.isTransferInput(j)){
                    var outputType = this.entries[entry.getTransferInputOperatorIndex(j)].operator.outputs[
                        entry.getTransferInputOutputIndex(j)].type;

                    if(outputType != entry.type){
                        XML3D.debug.logError("Xflow: operator " + entry.operator.name + ": Input for " + entry.source +
                            " has wrong type. Expected: " + Xflow.getTypeName(entry.type)
                            + ", but got: " +  Xflow.getTypeName(outputType) );
                        return false;
                    }

                }
                else{
                    var mappingName = entry.getInputMappingName(j);
                    if(!entry.optional && !mappingName){
                        XML3D.debug.logError("Xflow: operator " + entry.operator.name + ": Missing input argument for "
                            + entry.source);
                        return false;
                    }
                    if(mappingName){
                        var channel = programData.getChannel(entry.getDirectInputIndex(j));
                        if(!channel){
                            XML3D.debug.logError("Xflow: operator " + entry.operator.name + ": Input of name '" + mappingName +
                                "' not found. Used for parameter " + entry.source);
                            return false;
                        }
                        var dataEntry = channel.getDataEntry();
                        if(!entry.optional && (!dataEntry || dataEntry.getLength() == 0)){
                            XML3D.debug.logError("Xflow: operator " + entry.operator.name + ": Input for " + entry.source +
                                ' contains no data.');
                            return false;
                        }
                        if(dataEntry && dataEntry.type != entry.type){
                            XML3D.debug.logError("Xflow: operator " + entry.operator.name + ": Input for " + entry.source +
                                " has wrong type. Expected: " + Xflow.getTypeName(entry.type)
                                + ", but got: " +  Xflow.getTypeName(dataEntry.type) );
                            return false;
                        }
                    }
                }
            }
        }
    }
    */




    Xflow.ProgramData = function(){
        this.inputs = [];
        this.outputs = [];
        this.operatorData = [];
    }

    Xflow.ProgramData.prototype.getChannel = function(index){
        return this.inputs[index].channel;
    }

    Xflow.ProgramData.prototype.getDataEntry = function(index){
        var entry = this.inputs[index];
        var channel = entry.channel;
        if(!channel) return null;
        var key = 0;
        if(entry.sequenceKeySourceChannel){
            var keyDataEntry = entry.sequenceKeySourceChannel.getDataEntry();
            key = keyDataEntry && keyDataEntry._value ? keyDataEntry._value[0] : 0;
        }

        return channel.getDataEntry(entry.sequenceAccessType, key);
    }

    Xflow.ProgramInputConnection = function(){
        this.channel = null;
        this.arrayAccess = false;
        this.sequenceAccessType = Xflow.SEQUENCE.NO_ACCESS;
        this.sequenceKeySourceChannel = null;
    }

    Xflow.ProgramInputConnection.prototype.getKey = function(){
        return (this.channel ? this.channel.id : "NULL") + ";" + this.arrayAccess + ";" + this.sequenceAccessType + ";" +
        ( this.sequenceKeySourceChannel ? this.sequenceKeySourceChannel.id : "");
    }


    var c_program_cache = {};

    Xflow.createProgram = function(operatorList){
        if(operatorList.entries.length == 0)
            return null;

        var key = operatorList.getKey();
        if(!c_program_cache[key]){
            if(operatorList.platform == Xflow.PLATFORM.GLSL){
                c_program_cache[key] = new Xflow.VSProgram(operatorList);
            }
            else if(operatorList.entries.length == 1)
                c_program_cache[key] = new Xflow.SingleProgram(operatorList);
            else
                XML3D.debug.logError("Could not create program from operatorList");
        }
        return c_program_cache[key];
    }



    Xflow.SingleProgram = function(operatorList){
        this.list = operatorList;
        this.entry = operatorList.entries[0];
        this.operator = this.entry.operator;
        this._inlineLoop = null;
    }

    Xflow.SingleProgram.prototype.run = function(programData){
        var operatorData = prepareOperatorData(this.list, 0, programData);

        if(this.operator.evaluate_core){
            applyCoreOperation(this, programData, operatorData);
        }
        else{
            applyDefaultOperation(this.entry, programData, operatorData);
        }
    }

    function applyDefaultOperation(entry, programData, operatorData){
        var args = assembleFunctionArgs(entry, programData);
        args.push(operatorData);
        entry.operator.evaluate.apply(operatorData, args);
    }

    function applyCoreOperation(program, programData, operatorData){
        var args = assembleFunctionArgs(program.entry, programData);
        args.push(operatorData.iterateCount);

        if(!program._inlineLoop){
            program._inlineLoop = createOperatorInlineLoop(program.operator, operatorData);
        }
        program._inlineLoop.apply(operatorData, args);
    }

    var c_VarPattern = /var\s+(.)+[;\n]/;
    var c_InnerVarPattern = /[^=,\s]+\s*(=[^,]+)?(,)?/;
    function createOperatorInlineLoop(operator, operatorData){

        var code = "function (";
        var funcData = parseFunction(operator.evaluate_core);
        code += funcData.args.join(",") + ",__xflowMax) {\n";
        code += "    var __xflowI = __xflowMax\n" +
            "    while(__xflowI--){\n";

        var body = funcData.body;
        body = replaceArrayAccess(body, funcData.args, operator, operatorData);
        code += body + "\n  }\n}";

        var inlineFunc = eval("(" + code + ")");
        return inlineFunc;
    }

    var c_FunctionPattern = /function\s+([^(]*)\(([^)]*)\)\s*\{([\s\S]*)\}/;

    function parseFunction(func){
        var result = {};
        var matches = func.toString().match(c_FunctionPattern);
        if(!matches){
            XML3D.debug.logError("Xflow Internal: Could not parse function: " + func);
            return null;
        }
        result.args = matches[2].split(",");
        for(var i in result.args) result.args[i] = result.args[i].trim();
        result.body = matches[3];
        return result;
    }

    var c_bracketPattern = /([a-zA-Z_$][\w$]*)(\[)/;

    function replaceArrayAccess(code, args, operator, operatorData){
        var result = "";
        var index = 0, bracketIndex = code.indexOf("[", index);
        while(bracketIndex != -1){
            var key = code.substr(index).match(c_bracketPattern)[1];

            var argIdx = args.indexOf(key);
            var addIndex = false, tupleCnt = 0;
            if(argIdx != -1){
                if(argIdx < operator.outputs.length){
                    addIndex = true;
                    tupleCnt = Xflow.DATA_TYPE_TUPLE_SIZE[[operator.outputs[argIdx].type]];
                }
                else{
                    var i = argIdx - operator.outputs.length;
                    addIndex = operatorData.iterFlag[i];
                    tupleCnt = Xflow.DATA_TYPE_TUPLE_SIZE[operator.mapping[i].internalType];
                }
            }

            result += code.substring(index, bracketIndex) + "["
            if(addIndex){
                result += tupleCnt + "*__xflowI + ";
            }
            index = bracketIndex + 1;
            bracketIndex = code.indexOf("[", index);
        }
        result +=  code.substring(index);
        return result;
    }


    function prepareOperatorData(list, idx, programData){
        var data = programData.operatorData[0];
        var entry = list.entries[idx];
        var mapping = entry.operator.mapping;
        data.iterFlag = {};
        for(var i = 0; i < mapping.length; ++i){
            var doIterate = (entry.isTransferInput(i) || list.isInputIterate(entry.getDirectInputIndex(i)));
            data.iterFlag[i] = doIterate;
        }
        data.iterateCount = list.getIterateCount(programData);
        return data;
    }

    function assembleFunctionArgs(entry, programData){
        var args = [];
        var outputs = entry.operator.outputs;
        for(var i = 0; i < outputs.length; ++i){
            var d = outputs[i];
            var dataEntry = programData.outputs[entry.getOutputIndex(i)].dataEntry;
            args.push(dataEntry ? dataEntry.getValue() : null);
        }
        addInputToArgs(args, entry, programData);
        return args;
    }

    function addInputToArgs(args, entry, programData){
        var mapping = entry.operator.mapping;
        for(var i = 0; i < mapping.length; ++i){
            var mapEntry = mapping[i];
            var dataEntry = programData.getDataEntry(entry.getDirectInputIndex(i));
            args.push(dataEntry ? dataEntry.getValue() : null);
        }
    }


}());(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.OperatorList
//----------------------------------------------------------------------------------------------------------------------


    Xflow.VSProgram = function(operatorList){
        this.list = operatorList;

        this._glslCode = null;
        this._shaderInputNames = [];
        this._shaderOutputNames = [];
        this._inputIndices = {};
        constructVS(this);
    }


    function constructVS(program){
        var operatorList = program.list, entries = operatorList.entries;

        var usedNames = [],
            directInputNames = {},
            transferNames = {};

        for(var i = 0; i < entries.length; ++i){
            if(entries[i].blockedNames){
                Xflow.nameset.add(usedNames, entries[i].blockedNames);
            }
        }

        var code = "#version 140 \n\n";
        code += "// GLOBALS\n"
        // Start with Globals
        for(var type in Xflow.shaderConstant){
            var name = Xflow.shaderConstant[type];
            code += "uniform " + (type == Xflow.SHADER_CONSTANT_KEY.OBJECT_ID ? 'float' : 'mat4')  +
                    " " + name + ";\n";
            Xflow.nameset.add(usedNames, name);
        }
        code += "\n";
        code += "// OUTPUT\n"
        // First: collect output names
        for( var i = 0; i < entries.length; ++i){
            var entry = entries[i], operator = entry.operator;
            for(var j = 0; j < operator.outputs.length; ++j){
                if(entry.isFinalOutput(j)){
                    var name = operator.outputs[j].name;
                    code += "out " + getGLSLType(operator.outputs[j].type) + " " + name + ";\n";
                    Xflow.nameset.add(usedNames, name);
                    Xflow.nameset.add(program._shaderOutputNames, name);
                    transferNames[entry.getTransferOutputId(j)] = name;
                }
            }
        }
        code += "\n";
        code += "// INPUT\n"
        // Second: collect input names
        for(var i = 0; i < entries.length; ++i){
            var entry = entries[i], operator = entry.operator;
            for(var j = 0; j < operator.mapping.length; ++j){
                if(!entry.isTransferInput(j) && !directInputNames[entry.getDirectInputIndex(j)]){
                    var mapEntry = operator.mapping[j];
                    var name = getFreeName(mapEntry.name, usedNames), inputIndex = entry.getDirectInputIndex(j),
                        uniform = !operatorList.isInputIterate(inputIndex);
                    program._inputIndices[name] = { index: inputIndex, uniform: uniform };
                    Xflow.nameset.add(program._shaderInputNames, name);
                    directInputNames[inputIndex] = name;

                    code += (uniform ? "uniform " : "in ") + getGLSLType(mapEntry.internalType) + " " + name;

                    if(mapEntry.array)
                        code += "[" + operatorList.getInputSize(inputIndex) + "]"

                    code += ";\n";
                }
            }
        }

        // Start main
        code += "\n// CODE\n"
        code += "void main(void){\n";

        // Create Code
        for(var i = 0; i < entries.length; ++i){
            var entry = entries[i], operator = entry.operator;
            // Declare transfer output names
            for(var j = 0; j < operator.outputs.length; ++j){
                if(!entry.isFinalOutput(j)){
                    var name = getFreeName(operator.outputs[j].name, usedNames);
                    transferNames[entry.getTransferOutputId(j)] = name;
                    code += "\t" + getGLSLType(operator.outputs[j].type) + " " + name + ";\n";
                }
            }
            // Take Code Fragment
            var codeFragment = operator.evaluate_glsl, index;
            while((index = codeFragment.indexOf("#I{")) != -1){
                var end = codeFragment.indexOf("}",index);
                var mappingIndex = getMappingIndex(operator, codeFragment.substring(index+3,end));
                var replaceName = entry.isTransferInput(mappingIndex) ?
                    transferNames[entry.getTransferInputId(mappingIndex)] :
                    directInputNames[entry.getDirectInputIndex(mappingIndex)];
                codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
            }
            while((index = codeFragment.indexOf("#O{")) != -1){
                var end = codeFragment.indexOf("}",index);
                var outputIndex = getOutputIndex(operator, codeFragment.substring(index+3,end));
                var replaceName = transferNames[entry.getTransferOutputId(outputIndex)];
                codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
            }
            var localNames = [];
            while((index = codeFragment.indexOf("#L{")) != -1){
                var end = codeFragment.indexOf("}",index);
                var key = codeFragment.substring(index+3,end);
                if(!localNames[key]){
                    localNames[key] = getFreeName(key, usedNames);
                }
                var replaceName = localNames[key];
                codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
            }
            while((index = codeFragment.indexOf("#G{")) != -1){
                var end = codeFragment.indexOf("}",index);
                var replaceName = codeFragment.substring(index+3,end);
                codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
            }
            code += codeFragment + "\n";
        }
        code += "}\n";

        program._glslCode = code;
    }

    function getFreeName(name, usedNames){
        var result = name, i = 1;
        while(usedNames.indexOf(result) != -1){
            result = name + "_" + (++i);
        }
        Xflow.nameset.add(usedNames, result);
        return result;
    }

    function getMappingIndex(operator, name){
        for(var i = 0; i < operator.mapping.length; ++i){
            if(operator.mapping[i].name == name)
                return i;
        }
        throw new Error("Invalid input name '" + name  + "' inside of code fragment" );
    }

    function getOutputIndex(operator, name){
        for(var i = 0; i < operator.outputs.length; ++i){
            if(operator.outputs[i].name == name)
                return i;
        }
    }

    function getGLSLType(xflowType){
        switch(xflowType){
            case Xflow.DATA_TYPE.BOOL : return 'bool';
            case Xflow.DATA_TYPE.BYTE : return 'uint';
            case Xflow.DATA_TYPE.FLOAT : return 'float';
            case Xflow.DATA_TYPE.FLOAT2 : return 'vec2';
            case Xflow.DATA_TYPE.FLOAT3 : return 'vec3';
            case Xflow.DATA_TYPE.FLOAT4 : return 'vec4';
            case Xflow.DATA_TYPE.FLOAT4X4 : return 'mat4';
            case Xflow.DATA_TYPE.INT : return 'int';
            case Xflow.DATA_TYPE.INT4 : return 'ivec4';
        }
        throw new Error("Type not supported for GLSL " + Xflow.getTypeName(xflowType) );
    }


}());Xflow.registerOperator("xflow.morph", {
    outputs: [{type: 'float3', name: 'result'}],
    params:  [
        { type: 'float3', source: 'value' },
        { type: 'float3', source: 'valueAdd'},
        { type: 'float', source: 'weight'}
    ],
    evaluate: function(result, value, valueAdd, weight, info) {
        for(var i = 0; i < info.iterateCount; i++){
            var w = weight[info.iterFlag[2] ? i : 0];
            result[3*i] = value[ info.iterFlag[0] ? 3*i : 0] + w * valueAdd[info.iterFlag[1] ? 3*i : 0];
            result[3*i+1] = value[ info.iterFlag[0] ? 3*i+1 : 1] + w * valueAdd[info.iterFlag[1] ? 3*i+1 : 1];
            result[3*i+2] = value[ info.iterFlag[0] ? 3*i+2 : 2] + w * valueAdd[info.iterFlag[1] ? 3*i+2 : 2];
        }
        return true;
    },
    evaluate_core: function(result, value, valueAdd, weight){
        result[0] = value[0] + weight[0] * valueAdd[0];
        result[1] = value[1] + weight[0] * valueAdd[1];
        result[2] = value[2] + weight[0] * valueAdd[2];
    },
    evaluate_glsl:
        "\t// xflow.morph \n" +
        "\t#O{result} = #I{value} + vec3(#I{weight}) * #I{valueAdd};\n"
});Xflow.registerOperator("xflow.sub", {
    outputs: [  {type: 'float3', name: 'result'}],
    params:  [  {type: 'float3', source: 'value1'},
                {type: 'float3', source: 'value2'}],
    evaluate: function(result, value1, value2, info) {
        throw "Not used!";

        for(var i = 0; i< info.iterateCount*3; i++)
            result[i] = value1[i] - value2[i];

        return true;
    },

    evaluate_core: function(result, value1, value2){
        result[0] = value1[0] - value2[0];
        result[1] = value1[1] - value2[1];
        result[2] = value1[2] - value2[2];
    }
});Xflow.registerOperator("xflow.normalize", {
    outputs: [  {type: 'float3', name: 'result'}],
    params:  [  {type: 'float3', source: 'value'}],
    evaluate: function(result, value, info) {
        for(var i = 0; i < info.iterateCount; i++) {
            var offset = 3*i;
            var x = value[offset];
            var y = value[offset+1];
            var z = value[offset+2];
            var l = 1.0/Math.sqrt(x*x+y*y+z*z);
            result[offset] = x*l;
            result[offset+1] = y*l;
            result[offset+2] = z*l;
        }
    }
});
Xflow.registerOperator("xflow.lerpSeq", {
    outputs: [  {type: 'float3', name: 'result'}],
    params:  [  {type: 'float3', source: 'sequence'},
        {type: 'float', source: 'key'}],
    mapping: [  {source: 'sequence', sequence: Xflow.SEQUENCE.PREV_BUFFER, keySource: 'key'},
        {source: 'sequence', sequence: Xflow.SEQUENCE.NEXT_BUFFER, keySource: 'key'},
        {source: 'sequence', sequence: Xflow.SEQUENCE.LINEAR_WEIGHT, keySource: 'key'}],
    evaluate_core: function(result, value1, value2, weight){
        var invWeight = 1 - weight[0];
        result[0] = invWeight*value1[0] + weight[0]*value2[0];
        result[1] = invWeight*value1[1] + weight[0]*value2[1];
        result[2] = invWeight*value1[2] + weight[0]*value2[2];
    },
    evaluate_parallel: function(sequence, weight, info) {
        /*
         var me = this;
         this.result.result = sequence.interpolate(weight[0], function(v1,v2,t) {
         if (!me.tmp || me.tmp.length != v1.length)
         me.tmp = new Float32Array(v1.length);
         var result = me.tmp;
         var it = 1.0 - t;

         for(var i = 0; i < v1.length; i++) {
         result[i] = v1[i] * it + v2[i] * t;
         };
         return result;
         });
         */
        return true;
    }
});

Xflow.registerOperator("xflow.lerpKeys", {
    outputs: [  {type: 'float3', name: 'result'}],
    params:  [  {type: 'float', source: 'keys', array: true},
        {type: 'float3', source: 'values', array: true},
        {type: 'float', source: 'key'}],
    alloc: function(sizes, keys, values, key)
    {
        sizes['result'] = 3;
    },
    evaluate: function(result, keys, values, key) {
        var maxIdx = Math.min(keys.length, Math.floor(values.length / 3));
        var idx = Xflow.utils.binarySearch(keys, key[0], maxIdx);

        if(idx < 0 || idx == maxIdx - 1){
            idx = Math.max(0,idx);
            result[0] = values[3*idx];
            result[1] = values[3*idx+1];
            result[2] = values[3*idx+2];
        }
        else{
            var weight = (key[0] - keys[idx]) / (keys[idx+1] - keys[idx]);
            var invWeight = 1 - weight;
            result[0] = invWeight*values[3*idx] + weight*values[3*idx + 3];
            result[1] = invWeight*values[3*idx+1] + weight*values[3*idx + 4];
            result[2] = invWeight*values[3*idx+2] + weight*values[3*idx + 5];
        }
    }
});





Xflow.registerOperator("xflow.slerpSeq", {
    outputs: [  {type: 'float4', name: 'result'}],
    params:  [  {type: 'float4', source: 'sequence'},
                {type: 'float', source: 'key'}],
    mapping: [  {source: 'sequence', sequence: Xflow.SEQUENCE.PREV_BUFFER, keySource: 'key'},
                {source: 'sequence', sequence: Xflow.SEQUENCE.NEXT_BUFFER, keySource: 'key'},
                {source: 'sequence', sequence: Xflow.SEQUENCE.LINEAR_WEIGHT, keySource: 'key'}],
    evaluate: function(result, value1, value2, weight, info) {
        for(var i = 0; i < info.iterateCount; ++i){
            XML3D.math.quat.slerpOffset(  value1,info.iterFlag[0] ? i*4 : 0,
                                          value2,info.iterFlag[1] ? i*4 : 0,
                                          weight[0],
                                          result, i*4, true);
        }
    },

    evaluate_parallel: function(sequence, weight) {
        /*
        var me = this;
        this.result.result = sequence.interpolate(weight[0], function(v1,v2,t) {
            var count = v1.length;
            if (!me.tmp || me.tmp.length != count)
                me.tmp = new Float32Array(count);
            var result = me.tmp;
            for(var i = 0; i < count / 4; i++) {
                var offset = i*4;
                XML3D.math.quat.slerpOffset(v1,v2,offset,t,result, true);
            };
            return result;
        });
        */
        return true;
    }
});


Xflow.registerOperator("xflow.slerpKeys", {
    outputs: [  {type: 'float4', name: 'result'}],
    params:  [  {type: 'float', source: 'keys', array: true},
        {type: 'float4', source: 'values', array: true},
        {type: 'float', source: 'key'}],
    alloc: function(sizes, keys, values, key)
    {
        sizes['result'] = 4;
    },
    evaluate: function(result, keys, values, key) {
        var maxIdx = Math.min(keys.length, Math.floor(values.length / 4));
        var idx = Xflow.utils.binarySearch(keys, key[0], maxIdx);

        if(idx < 0 || idx == maxIdx - 1){
            idx = Math.max(0,idx);
            result[0] = values[4*idx];
            result[1] = values[4*idx+1];
            result[2] = values[4*idx+2];
            result[3] = values[4*idx+3];
        }
        else{
            var weight = (key[0] - keys[idx]) / (keys[idx+1] - keys[idx]);
            XML3D.math.quat.slerpOffset(  values, idx*4,
                values,(idx+1)*4, weight,
                result, 0, true);
        }
    }
});Xflow.registerOperator("xflow.createTransform", {
    outputs: [  {type: 'float4x4', name: 'result'}],
    params:  [  {type: 'float3', source: 'translation', optional: true},
                {type: 'float4', source: 'rotation', optional: true},
                {type: 'float3', source: 'scale', optional: true},
                {type: 'float3', source: 'center', optional: true},
                {type: 'float4', source: 'scaleOrientation', optional: true}],
    evaluate: function(result, translation,rotation,scale,center,scaleOrientation, info) {
        for(var i = 0; i < info.iterateCount; i++) {
            XML3D.math.mat4.makeTransformXflow(
                translation ? translation.subarray(info.iterFlag[0] ? i*3 : 0) : null,
                rotation ? rotation.subarray(info.iterFlag[1] ? i*4 : 0) : null,
                scale ? scale.subarray(info.iterFlag[2] ? i*3 : 0) : null,
                center ? center.subarray(info.iterFlag[3] ? i*3 : 0) : null,
                scaleOrientation ? scaleOrientation.subarray(info.iterFlag[4] ? i*4 : 0) : null,
                result.subarray(i*16)
            )
        }
        return true;
    }
    /*
    evaluate_parallel: function( translation,rotation,scale,center,scaleOrientation) {
    	 var count = translation ? translation.length / 3 :
            rotation ? rotation.length / 4 :
            scale ? scale.length / 3 :
            center ? center.length / 3 :
            scaleOrientation ? scaleOrientation / 4: 0;
    	if(!count)
            throw ("createTransform: No input found");

        if (!this.elementalFunc) {
	        this.elementalFunc = function(index, translation,rotation) {
	            var off4 = index * 4;
	            var off3 = index * 3;
	            var dest = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

	            //Translation
	            dest[12] = translation[off3+0];
	            dest[13] = translation[off3+1];
	            dest[14] = translation[off3+2];

	            //Rotation to matrix
	            var x = rotation[off4+1], y = rotation[off4+2], z = rotation[off4+3], w = -rotation[off4];

	            var x2 = x + x;
	            var y2 = y + y;
	            var z2 = z + z;

	            var xx = x*x2;
	            var xy = x*y2;
	            var xz = x*z2;

	            var yy = y*y2;
	            var yz = y*z2;
	            var zz = z*z2;

	            var wx = w*x2;
	            var wy = w*y2;
	            var wz = w*z2;

	            var rotMat = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1];
	            rotMat[0] = 1 - (yy + zz);
	            rotMat[1] = xy - wz;
	            rotMat[2] = xz + wy;
	            rotMat[3] = 0;

	            rotMat[4] = xy + wz;
	            rotMat[5] = 1 - (xx + zz);
	            rotMat[6] = yz - wx;
	            rotMat[7] = 0;

	            rotMat[8] = xz - wy;
	            rotMat[9] = yz + wx;
	            rotMat[10] = 1 - (xx + yy);
	            rotMat[11] = 0;

	            //Combine translation and rotation (is the kernel faster if we cache the matrix values?)
	            var a00 = dest[0], a01 = dest[1], a02 = dest[2], a03 = dest[3];
	            var a10 = dest[4], a11 = dest[5], a12 = dest[6], a13 = dest[7];
	            var a20 = dest[8], a21 = dest[9], a22 = dest[10], a23 = dest[11];
	            var a30 = dest[12], a31 = dest[13], a32 = dest[14], a33 = dest[15];

	            var b00 = rotMat[0], b01 = rotMat[1], b02 = rotMat[2], b03 = rotMat[3];
	            var b10 = rotMat[4], b11 = rotMat[5], b12 = rotMat[6], b13 = rotMat[7];
	            var b20 = rotMat[8], b21 = rotMat[9], b22 = rotMat[10], b23 = rotMat[11];
	            var b30 = rotMat[12], b31 = rotMat[13], b32 = rotMat[14], b33 = rotMat[15];

	            dest[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
	            dest[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
	            dest[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
	            dest[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
	            dest[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
	            dest[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
	            dest[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
	            dest[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
	            dest[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
	            dest[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
	            dest[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
	            dest[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
	            dest[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
	            dest[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
	            dest[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
	            dest[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;

	            return dest;
	        };
        }

        var tmp = new ParallelArray(
                count,
                this.elementalFunc,
                translation,
                rotation
        );
        this.result.result = tmp.flatten();

        return true;
    }
     */
});Xflow.registerOperator("xflow.createTransformInv", {
    outputs: [  {type: 'float4x4', name: 'result'}],
    params:  [  {type: 'float3', source: 'translation', optional: true},
                {type: 'float4', source: 'rotation', optional: true},
                {type: 'float3', source: 'scale', optional: true},
                {type: 'float3', source: 'center', optional: true},
                {type: 'float4', source: 'scaleOrientation', optional: true}],
    evaluate: function(result, translation,rotation,scale,center,scaleOrientation, info) {
        for(var i = 0; i < info.iterateCount; i++) {
            XML3D.math.mat4.makeTransformInvXflow(
                translation ? translation.subarray(info.iterFlag[0] ? i*3 : 0) : null,
                rotation ? rotation.subarray(info.iterFlag[1] ? i*4 : 0) : null,
                scale ? scale.subarray(info.iterFlag[2] ? i*3 : 0) : null,
                center ? center.subarray(info.iterFlag[3] ? i*3 : 0) : null,
                scaleOrientation ? scaleOrientation.subarray(info.iterFlag[4] ? i*4 : 0) : null,
                result.subarray(i*16)
            )
        }
    },
    evaluate_parallel: function( translation,rotation,scale,center,scaleOrientation) {

        //this.parallel_data = new ParallelArray(result).partition(16);
        /*
    	var count = translation ? translation.length / 3 :
            rotation ? rotation.length / 4 :
            scale ? scale.length / 3 :
            center ? center.length / 3 :
            scaleOrientation ? scaleOrientation / 4: 0;
    	if(!count)
            throw ("createTransform: No input found");

        if (!this.elementalFunc) {
	        this.elementalFunc = function(index, translation,rotation) {
	            var off4 = index * 4;
	            var off3 = index * 3;
	            var dest = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

	            //Translation
	            dest[12] = translation[off3+0];
	            dest[13] = translation[off3+1];
	            dest[14] = translation[off3+2];

	            //Rotation to matrix
	            var x = rotation[off4+1], y = rotation[off4+2], z = rotation[off4+3], w = -rotation[off4];

	            var x2 = x + x;
	            var y2 = y + y;
	            var z2 = z + z;

	            var xx = x*x2;
	            var xy = x*y2;
	            var xz = x*z2;

	            var yy = y*y2;
	            var yz = y*z2;
	            var zz = z*z2;

	            var wx = w*x2;
	            var wy = w*y2;
	            var wz = w*z2;

	            var rotMat = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1];
	            rotMat[0] = 1 - (yy + zz);
	            rotMat[1] = xy - wz;
	            rotMat[2] = xz + wy;
	            rotMat[3] = 0;

	            rotMat[4] = xy + wz;
	            rotMat[5] = 1 - (xx + zz);
	            rotMat[6] = yz - wx;
	            rotMat[7] = 0;

	            rotMat[8] = xz - wy;
	            rotMat[9] = yz + wx;
	            rotMat[10] = 1 - (xx + yy);
	            rotMat[11] = 0;

	            //Combine translation and rotation (is the kernel faster if we cache the matrix values?)
	            var a00 = dest[0], a01 = dest[1], a02 = dest[2], a03 = dest[3];
	            var a10 = dest[4], a11 = dest[5], a12 = dest[6], a13 = dest[7];
	            var a20 = dest[8], a21 = dest[9], a22 = dest[10], a23 = dest[11];
	            var a30 = dest[12], a31 = dest[13], a32 = dest[14], a33 = dest[15];

	            var b00 = rotMat[0], b01 = rotMat[1], b02 = rotMat[2], b03 = rotMat[3];
	            var b10 = rotMat[4], b11 = rotMat[5], b12 = rotMat[6], b13 = rotMat[7];
	            var b20 = rotMat[8], b21 = rotMat[9], b22 = rotMat[10], b23 = rotMat[11];
	            var b30 = rotMat[12], b31 = rotMat[13], b32 = rotMat[14], b33 = rotMat[15];

	            dest[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
	            dest[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
	            dest[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
	            dest[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
	            dest[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
	            dest[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
	            dest[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
	            dest[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
	            dest[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
	            dest[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
	            dest[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
	            dest[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
	            dest[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
	            dest[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
	            dest[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
	            dest[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;

	            return dest;
	        };
        }

        var tmp = new ParallelArray(
                count,
                this.elementalFunc,
                translation,
                rotation
        );
        this.result.result = tmp.flatten();
	*/
        return true;
    }
});Xflow.registerOperator("xflow.mul", {
    outputs: [  {type: 'float4x4', name: 'result'}],
    params:  [  {type: 'float4x4', source: 'value1'},
                {type: 'float4x4', source: 'value2'}],
    evaluate: function(result, value1, value2, info) {
        for(var i = 0; i < info.iterateCount; i++)
        {
            XML3D.math.mat4.multiplyOffset(result, i*16,
                value1,  info.iterFlag[0] ? i*16 : 0,
                value2, info.iterFlag[0] ? i*16 : 0);
        }
    },



    evaluate_parallel: function(value1, value2) {
        /*if (!this.tmp) {
             this.tmp = new Float32Array(value1.length);
        }
        var result = this.tmp;
        var count = value1.length;
        for(var i = 0; i < count; i++)
        {
            var offset = i*16;
            XML3D.math.mat4.multiplyOffset(result, offset, value1, offset, value2, offset);
        }
        //this.parallel_data = new ParallelArray(result).partition(16);
        this.result.result = result;


        if (!this.elementalFunc) {
            this.elementalFunc = function(index, value1, value2) {
                var mo = index*16;

                var a00 = value2[mo+0], a01 = value2[mo+1], a02 = value2[mo+2], a03 = value2[mo+3];
                var a10 = value2[mo+4], a11 = value2[mo+5], a12 = value2[mo+6], a13 = value2[mo+7];
                var a20 = value2[mo+8], a21 = value2[mo+9], a22 = value2[mo+10], a23 = value2[mo+11];
                var a30 = value2[mo+12], a31 = value2[mo+13], a32 = value2[mo+14], a33 = value2[mo+15];

                var b00 = value1[mo+0], b01 = value1[mo+1], b02 = value1[mo+2], b03 = value1[mo+3];
                var b10 = value1[mo+4], b11 = value1[mo+5], b12 = value1[mo+6], b13 = value1[mo+7];
                var b20 = value1[mo+8], b21 = value1[mo+9], b22 = value1[mo+10], b23 = value1[mo+11];
                var b30 = value1[mo+12], b31 = value1[mo+13], b32 = value1[mo+14], b33 = value1[mo+15];

                var dest = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
                dest[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
                dest[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
                dest[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
                dest[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
                dest[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
                dest[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
                dest[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
                dest[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
                dest[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
                dest[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
                dest[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
                dest[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
                dest[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
                dest[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
                dest[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
                dest[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;
                return dest;
            };
        }

        var numMatrices = value1.length/16;

        var tmp = new ParallelArray(
                numMatrices,
                this.elementalFunc,
                value1,
                value2
        );

        this.result.result = tmp.flatten();
         */
        return true;
    }
});Xflow.registerOperator("xflow.skinDirection", {
    outputs: [  {type: 'float3', name: 'result' }],
    params:  [  {type: 'float3', source: 'dir' },
                {type: 'int4', source: 'boneIdx' },
                {type: 'float4', source: 'boneWeight' },
                {type: 'float4x4', source: 'boneXform', array: true } ],
    evaluate: function(result, dir,boneIdx,boneWeight,boneXform, info) {
        var r = XML3D.math.vec3.create();
        var tmp =  XML3D.math.vec3.create();

        for(var i = 0; i< info.iterateCount;++i) {
            var offset = i*3;
            r[0] = r[1] = r[2] = +0;
            for(var j = 0; j < 4; j++) {
                var weight = boneWeight[info.iterFlag[2] ? i*4+j : j];
                if (weight) {
                    var mo = boneIdx[info.iterFlag[1] ? i*4+j : j]*16;

                    XML3D.math.mat4.multiplyOffsetDirection(boneXform, mo, dir, offset, tmp);
                    XML3D.math.vec3.scale(tmp, tmp, weight);
                    XML3D.math.vec3.add(r, r, tmp);
                }
            }
            XML3D.math.vec3.normalize(r, r);
            result[offset] = r[0];
            result[offset+1] = r[1];
            result[offset+2] = r[2];
        }
    },

    evaluate_parallel: function(dir, boneIndex, boneWeight, boneXform) {
        /*
        if (!this.elementalFunc) {
            this.elementalFunc = function(index, direction, boneIndex, boneWeight, boneXform) {
                var r = [0,0,0];
                var off4 = index*4;
                var off3 = index*3;

                var x = direction[off3], y = direction[off3+1], z = direction[off3+2];

                for (var j=0; j < 4; j++) {
                    var weight = boneWeight[off4+j];
                    if (weight > 0) {
                        var mo = boneIndex[off4+j] * 16;

                        //Multiply dir with boneXform
                        r[0] += (boneXform[mo+0]*x + boneXform[mo+4]*y + boneXform[mo+8]*z) * weight;
                        r[1] += (boneXform[mo+1]*x + boneXform[mo+5]*y + boneXform[mo+9]*z) * weight;
                        r[2] += (boneXform[mo+2]*x + boneXform[mo+6]*y + boneXform[mo+10]*z) * weight;
                    }
                }
                return r;
            };
        }
        var numVertices = dir.length / 3;
        var result = new ParallelArray(
                numVertices,
                this.elementalFunc,
                dir,
                boneIndex,
                boneWeight,
                boneXform
        );

        this.result.result = result;
        */
        return true;
    }
});Xflow.registerOperator("xflow.skinPosition", {
    outputs: [  {type: 'float3', name: 'result' }],
    params:  [  {type: 'float3', source: 'pos' },
                {type: 'int4', source: 'boneIdx' },
                {type: 'float4', source: 'boneWeight' },
                {type: 'float4x4', source: 'boneXform', array: true } ],
    evaluate: function(result, pos,boneIdx,boneWeight,boneXform, info) {
        var r = XML3D.math.vec3.create();
        var tmp =  XML3D.math.vec3.create();

        for(var i = 0; i< info.iterateCount;++i) {
            var offset = i*3;
            r[0] = r[1] = r[2] = +0;
            for(var j = 0; j < 4; j++) {
                var weight = boneWeight[info.iterFlag[2] ? i*4+j : j];
                if (weight) {
                    var mo = boneIdx[info.iterFlag[1] ? i*4+j : j]*16;

                    XML3D.math.mat4.multiplyOffsetVec3(boneXform, mo, pos, offset, tmp);
                    XML3D.math.vec3.scale(tmp, tmp, weight);
                    XML3D.math.vec3.add(r, r, tmp);
                }
            }
            result[offset] = r[0];
            result[offset+1] = r[1];
            result[offset+2] = r[2];
        }
    },

    evaluate_parallel: function(pos, boneIndex, boneWeight, boneXform, info) {
        /*
        if (!this.elementalFunc) {
            this.elementalFunc = function(index, position, boneIndex, boneWeight, boneXform) {
                var r = [0,0,0];
                var off4 = index*4;
                var off3 = index*3;

                var x = position[off3], y = position[off3+1], z = position[off3+2];

                for (var j=0; j < 4; j++) {
                    var weight = boneWeight[off4+j];
                    if (weight > 0) {
                        var mo = boneIndex[off4+j] * 16;

                        //Multiply pos with boneXform
                        r[0] += (boneXform[mo+0]*x + boneXform[mo+4]*y + boneXform[mo+8]*z + boneXform[mo+12]) * weight;
                        r[1] += (boneXform[mo+1]*x + boneXform[mo+5]*y + boneXform[mo+9]*z + boneXform[mo+13]) * weight;
                        r[2] += (boneXform[mo+2]*x + boneXform[mo+6]*y + boneXform[mo+10]*z + boneXform[mo+14]) * weight;
                    }
                }
                return r;
            };
        }
        var numVertices = pos.length / 3;
        var result = new ParallelArray(
                numVertices,
                this.elementalFunc,
                pos,
                boneIndex,
                boneWeight,
                boneXform
        );

        this.result.result = result;
        */
        return true;
    }
});Xflow.registerOperator("xflow.forwardKinematics", {
    outputs: [  {type: 'float4x4',  name: 'result', customAlloc: true}],
    params:  [  {type: 'int',       source: 'parent', array: true },
                {type: 'float4x4',  source: 'xform', array: true }],
    alloc: function(sizes, parent, xform)
    {
        var length = Math.min(parent.length, xform.length / 16);
        sizes['result'] = length;
    },
    evaluate: function(result, parent,xform, info) {

        var boneCount = result.length / 16;

        var computed = [];
        //For each bone do:
        for(var i = 0; i < boneCount;){
            if(!computed[i]) {
                var p = parent[i];
                if(p >= 0){
                    //This bone has a parent bone
                    if(!computed[p]){
                        //The parent bone's transformation matrix hasn't been computed yet
                        while(parent[p] >= 0 && !computed[parent[p]]) p = parent[p];

                        if(parent[p] >= 0)
                            XML3D.math.mat4.multiplyOffset(result, p*16, xform, p*16, result, parent[p]*16);
                        else
                            for(var j = 0; j < 16; j++) {
                                result[p*16+j] = xform[p*16+j];
                            }
                        computed[p] = true;
                        continue;
                    }
                    else {
                        XML3D.math.mat4.multiplyOffset(result, i*16, xform, i*16, result,  p*16);
                    }
                }
                else{
                    for(var j = 0; j < 16; j++) {
                        result[i*16+j] = xform[i*16+j];
                    }
                }
                computed[i] = true;
            }
            i++;
        }
    },

    evaluate_parallel: function(parent, xform) {

          /*
           if (!this.parallel_data) {
              this.parallel_data = new ParallelArray(xform.data).partition(16);
          }
        var elementalFunc = function(index, parent,xform) {
            var result = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
            var xf = xform.get(index);

            for(var j = 0; j < 16; j++) {
                result[j] = xf.get(j);
            }

            var p = parent.get(index);

            while (p[0] >= 0) {
                //Multiply the current bone matrix with its parent
                xf = xform.get(p[0]);
                var a00 = xf.get(0), a01 = xf.get(1), a02 = xf.get(2), a03 = xf.get(3);
                var a10 = xf.get(4), a11 = xf.get(5), a12 = xf.get(6), a13 = xf.get(7);
                var a20 = xf.get(8), a21 = xf.get(9), a22 = xf.get(10), a23 = xf.get(11);
                var a30 = xf.get(12), a31 = xf.get(13), a32 = xf.get(14), a33 = xf.get(15);

                var b00 = result[0], b01 = result[1], b02 = result[2], b03 = result[3];
                var b10 = result[4], b11 = result[5], b12 = result[6], b13 = result[7];
                var b20 = result[8], b21 = result[9], b22 = result[10], b23 = result[11];
                var b30 = result[12], b31 = result[13], b32 = result[14], b33 = result[15];

                result[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
                result[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
                result[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
                result[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
                result[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
                result[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
                result[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
                result[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
                result[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
                result[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
                result[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
                result[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
                result[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
                result[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
                result[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
                result[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;
                p = parent.get(p[0]);
            }

            return result;
        };

        this.parallel_data = this.parallel_data.combine(
                1,
                low_precision(elementalFunc),
                parent,
                xform
        );
        this.result.result = this.parallel_data;
        */

        return true;
    }
});Xflow.registerOperator("xflow.forwardKinematicsInv", {
    outputs: [  {type: 'float4x4',  name: 'result', customAlloc: true}],
    params:  [  {type: 'int',       source: 'parent', array: true },
                {type: 'float4x4',  source: 'xform', array: true }],
    alloc: function(sizes, parent, xform)
    {
        var length = Math.min(parent.length, xform.length / 16);
        sizes['result'] = length;
    },
    evaluate: function(result, parent,xform, info) {
        var boneCount = xform.length / 16;

        var computed = [];
        //For each bone do:
        for(var i = 0; i < boneCount;){
            if(!computed[i]) {
                var p = parent[i];
                if(p >= 0){
                    //This bone has a parent bone
                    if(!computed[p]){
                        //The parent bone's transformation matrix hasn't been computed yet
                        while(parent[p] >= 0 && !computed[parent[p]]) p = parent[p];
                        //The current bone has a parent and its transform hasn't been computed yet

                        if(parent[p] >= 0)
                            XML3D.math.mat4.multiplyOffset(result, p*16, result, parent[p]*16, xform, p*16);
                        else
                            for(var j = 0; j < 16; j++) {
                                result[p*16+j] = xform[p*16+j];
                            }
                        computed[p] = true;
                        continue;

                    }
                    else {
                        XML3D.math.mat4.multiplyOffset(result, i*16,  result,  p*16, xform, i*16);
                    }
                }
                else{
                    for(var j = 0; j < 16; j++) {
                        result[i*16+j] = xform[i*16+j];
                    }
                }
                computed[i] = true;
            }
            i++;
        }
    }
});Xflow.registerOperator("xflow.flipNormal", {
    outputs: [  {type: 'float3', name: 'result'}],
    params:  [  {type: 'float3', source: 'value'}],
    evaluate: function(result, value, info) {
        for(var i = 0; i<info.iterateCount*3; i++)
            result[i] = -value[i];
    }
});Xflow.registerOperator("xflow.createIGIndex", {
    outputs:[
        //{type:'int', name:'index', customAlloc:true },
        {type:'float2', name:'texcoord', customAlloc:true }
    ],
    params:[
        {type:'int', source:'vertexCount', optional:false},
        {type:'texture', source:'positionTex', optional: false}
    ],
    alloc:function (sizes, vertexCount, image) {
        sizes['texcoord'] = image.width * image.height;
        //sizes['index'] = vertexCount[0];
    },
    evaluate:function (texcoord, vertexCount, image, info) {
        // tex coords
        var halfPixel = {
            x: 0.5 / image.width,
            y: 0.5 / image.height
        };
        var i = 0;
        for (var y = 0, ylength = image.height; y < ylength; y++)
        {
            for (var x = 0, xlength = image.width; x < xlength; x++)
            {
                texcoord[i++] = (x / xlength) + halfPixel.x;
                texcoord[i++] = 1 - ((y / ylength) + halfPixel.y);
            }
        }

        // index creation
        /*for(var i = 0; i < vertexCount[0]; i++) {
            index[i] = i;
        }*/
        return true;
    }
});// Additional methods in glMatrix style


XML3D.math.vec3.reciprocal = function(vec, dest) {
    if(!dest) { dest = vec; }

    dest[0] = 1 / vec[0];
    dest[1] = 1 / vec[1];
    dest[2] = 1 / vec[2];
    return dest;
};

XML3D.math.mat4.multiplyOffsetVec3 = function(mat, matOffset, vec, vecOffset, dest) {
    if(!dest) { dest = vec; }
    if(!vecOffset) { vecOffset = 0; }

    var x = vec[vecOffset+0], y = vec[vecOffset+1], z = vec[vecOffset+2];

    dest[0] = mat[matOffset+0]*x + mat[matOffset+4]*y + mat[matOffset+8]*z + mat[matOffset+12];
    dest[1] = mat[matOffset+1]*x + mat[matOffset+5]*y + mat[matOffset+9]*z + mat[matOffset+13];
    dest[2] = mat[matOffset+2]*x + mat[matOffset+6]*y + mat[matOffset+10]*z + mat[matOffset+14];

    return dest;
};



XML3D.math.mat4.multiplyOffsetDirection = function(mat, matOffset, vec, vecOffset, dest) {
    if(!dest) { dest = vec; }
    if(!vecOffset) { vecOffset = 0; }

    var x = vec[vecOffset+0], y = vec[vecOffset+1], z = vec[vecOffset+2], w;

    dest[0] = mat[matOffset+0]*x + mat[matOffset+4]*y + mat[matOffset+8]*z;
    dest[1] = mat[matOffset+1]*x + mat[matOffset+5]*y + mat[matOffset+9]*z;
    dest[2] = mat[matOffset+2]*x + mat[matOffset+6]*y + mat[matOffset+10]*z;

    return dest;
};

var IDENT_MAT = XML3D.math.mat4.identity(XML3D.math.mat4.create());
var TMP_MATRIX = XML3D.math.mat4.create();
var TMP_VEC = XML3D.math.vec3.create();

XML3D.math.mat4.makeTransformXflow = function(translation,rotation,scale,center,scaleOrientation,dest){
    XML3D.math.mat4.identity(dest);
    if(translation) XML3D.math.mat4.translate(dest, dest, translation);
    if(center) XML3D.math.mat4.translate(dest, dest, center);
    if(rotation){
        XML3D.math.mat4.fromRotationTranslation(TMP_MATRIX, [rotation[0],rotation[1],rotation[2],rotation[3]], [0,0,0]);
        XML3D.math.mat4.multiply(dest, dest, TMP_MATRIX);
    }
    if(scaleOrientation){
        XML3D.math.mat4.fromRotationTranslation(TMP_MATRIX, [scaleOrientation[0], scaleOrientation[1],scaleOrientation[2],scaleOrientation[3]], [0,0,0]);
        XML3D.math.mat4.multiply(dest, dest, TMP_MATRIX);
    }
    if(scale) XML3D.math.mat4.scale(dest, dest, scale);
    if(scaleOrientation){
        XML3D.math.mat4.fromRotationTranslation(TMP_MATRIX, [scaleOrientation[0], scaleOrientation[1],scaleOrientation[2],-scaleOrientation[3]], [0,0,0]);
        XML3D.math.mat4.multiply(dest, dest, TMP_MATRIX);
    }
    if(center){
        XML3D.math.mat4.translate(dest, dest, XML3D.math.vec3.negate(TMP_VEC, center));
    }
};

XML3D.math.mat4.makeTransformInvXflow = function(translation,rotation,scale,center,scaleOrientation,dest){
    XML3D.math.mat4.identity(dest);
    if(center){
        XML3D.math.mat4.translate(dest, dest, center);
    }
    if(scaleOrientation){
        XML3D.math.mat4.fromRotationTranslation(TMP_MATRIX, [scaleOrientation[0],scaleOrientation[1],scaleOrientation[2],scaleOrientation[3]], [0,0,0])
        XML3D.math.mat4.multiply(dest, dest, TMP_MATRIX);
    }
    if(scale) XML3D.math.mat4.scale(dest, dest, XML3D.math.vec3.reciprocal(scale, TMP_VEC) );
    if(scaleOrientation){
        XML3D.math.mat4.fromRotationTranslation(TMP_MATRIX, [scaleOrientation[0], scaleOrientation[1],scaleOrientation[2],-scaleOrientation[3]], [0,0,0])
        XML3D.math.mat4.multiply(dest, dest, TMP_MATRIX);
    }
    if(rotation){
        XML3D.math.mat4.fromRotationTranslation(TMP_MATRIX, [rotation[0],rotation[1],rotation[2],-rotation[3]], [0,0,0])
        XML3D.math.mat4.multiply(dest, dest, TMP_MATRIX);
    }
    if(center) XML3D.math.mat4.translate(dest, dest, XML3D.math.vec3.negate(TMP_VEC, center) );
    if(translation) XML3D.math.mat4.translate(dest, dest, XML3D.math.vec3.negate(TMP_VEC, translation) );
};

/*
mat4.makeTransformInvOffset = function(translation,rotation,scale,center,scaleOrientation,offset,dest) {
    var mo = offset*16;
    var vo = offset*3;
    var qo = offset*4;

    dest[mo+0] = 1;
    dest[mo+1] = 0;
    dest[mo+2] = 0;
    dest[mo+3] = 0;
    dest[mo+4] = 0;
    dest[mo+5] = 1;
    dest[mo+6] = 0;
    dest[mo+7] = 0;
    dest[mo+8] = 0;
    dest[mo+9] = 0;
    dest[mo+10] = 1;
    dest[mo+11] = 0;
    dest[mo+12] = -translation[vo];
    dest[mo+13] = -translation[vo+1];
    dest[mo+14] = -translation[vo+2];
    dest[mo+15] = 1;

    if (rotation) {
        var rotM = XML3D.math.quat.toMat4([rotation[qo+1],rotation[qo+2],rotation[qo+3],rotation[qo]]);
        XML3D.math.mat4.multiplyOffset(dest, mo,  rotM, 0,  dest, mo);
    }
};

XML3D.math.mat4.makeTransformOffset = function(translation,rotation,scale,center,scaleOrientation,offset,dest) {
    var mo = offset*16;
    var vo = offset*3;
    var qo = offset*4;

    dest[mo+0] = 1;
    dest[mo+1] = 0;
    dest[mo+2] = 0;
    dest[mo+3] = 0;
    dest[mo+4] = 0;
    dest[mo+5] = 1;
    dest[mo+6] = 0;
    dest[mo+7] = 0;
    dest[mo+8] = 0;
    dest[mo+9] = 0;
    dest[mo+10] = 1;
    dest[mo+11] = 0;
    dest[mo+12] = translation[vo];
    dest[mo+13] = translation[vo+1];
    dest[mo+14] = translation[vo+2];
    dest[mo+15] = 1;

    if (rotation) {
        var rotM = XML3D.math.quat.toMat4([rotation[qo+1],rotation[qo+2],rotation[qo+3],-rotation[qo]]);
        XML3D.math.mat4.multiplyOffset(dest, mo,  rotM, 0,  dest, mo);
    }
};
*/
XML3D.math.mat4.multiplyOffset = function(dest, destOffset, mat, offset1, mat2, offset2) {
    var a00 = mat2[offset2+0], a01 = mat2[offset2+1], a02 = mat2[offset2+2], a03 = mat2[offset2+3];
    var a10 = mat2[offset2+4], a11 = mat2[offset2+5], a12 = mat2[offset2+6], a13 = mat2[offset2+7];
    var a20 = mat2[offset2+8], a21 = mat2[offset2+9], a22 = mat2[offset2+10], a23 = mat2[offset2+11];
    var a30 = mat2[offset2+12], a31 = mat2[offset2+13], a32 = mat2[offset2+14], a33 = mat2[offset2+15];

    var b00 = mat[offset1+0], b01 = mat[offset1+1], b02 = mat[offset1+2], b03 = mat[offset1+3];
    var b10 = mat[offset1+4], b11 = mat[offset1+5], b12 = mat[offset1+6], b13 = mat[offset1+7];
    var b20 = mat[offset1+8], b21 = mat[offset1+9], b22 = mat[offset1+10], b23 = mat[offset1+11];
    var b30 = mat[offset1+12], b31 = mat[offset1+13], b32 = mat[offset1+14], b33 = mat[offset1+15];

    dest[destOffset+0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
    dest[destOffset+1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
    dest[destOffset+2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
    dest[destOffset+3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
    dest[destOffset+4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
    dest[destOffset+5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
    dest[destOffset+6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
    dest[destOffset+7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
    dest[destOffset+8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
    dest[destOffset+9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
    dest[destOffset+10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
    dest[destOffset+11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
    dest[destOffset+12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
    dest[destOffset+13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
    dest[destOffset+14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
    dest[destOffset+15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;
};

XML3D.math.quat.slerpOffset = function(quat, offset1, quat2, offset2, t, dest, destOffset, shortest) {
    if(!dest) { dest = quat; }

    var ix1 = offset1, iy1 = offset1+1, iz1 = offset1+2, iw1 = offset1+3;
    var ix2 = offset2, iy2 = offset2+1, iz2 = offset2+2, iw2 = offset2+3;
    var ixd = destOffset, iyd = destOffset+1, izd = destOffset+2, iwd = destOffset+3;

    var cosAngle =  quat[ix1]*quat2[ix2] + quat[iy1]*quat2[iy2] + quat[iz1]*quat2[iz2] + quat[iw1]*quat2[iw2];

    var c1, c2;

    // Linear interpolation for close orientations
    if ((1.0 - Math.abs(cosAngle)) < 0.01)
      {
        c1 = 1.0 - t;
        c2 = t;
      }
    else
      {
        // Spherical interpolation
        var angle    = Math.acos(Math.abs(cosAngle));
        var sinAngle = Math.sin(angle);
        c1 = Math.sin(angle * (1.0 - t)) / sinAngle;
        c2 = Math.sin(angle * t) / sinAngle;
      }

    // Use the shortest path
    if (shortest && (cosAngle < 0.0))
      c1 = -c1;

    dest[ixd] = c1*quat[ix1] + c2*quat2[ix2];
    dest[iyd] = c1*quat[iy1] + c2*quat2[iy2];
    dest[izd] = c1*quat[iz1] + c2*quat2[iz2];
    dest[iwd] = c1*quat[iw1] + c2*quat2[iw2];
};Xflow.registerOperator("xflow.noiseImage", {
    outputs: [ {type: 'texture', name : 'image', customAlloc: true} ],
    params:  [ {type: 'int', source: 'width'},
               {type: 'int', source:'height'},
               {type: 'float2', source: 'scale'},
               {type: 'float', source: 'minFreq'},
               {type: 'float', source: 'maxFreq'} ],
    alloc: function(sizes, width, height, scale, minFreq, maxFreq) {
        var samplerConfig = new Xflow.SamplerConfig;
        samplerConfig.setDefaults();
        sizes['image'] = {
            imageFormat : {width: width[0], height :height[0]},
            samplerConfig : samplerConfig
        };
    },
    evaluate: function(image, width, height, scale, minFreq, maxFreq) {
        width = width[0];
        height = height[0];
        minFreq = minFreq[0];
        maxFreq = maxFreq[0];

        var id = image;
        var pix = id.data;
        this.noise = this.noise || new SimplexNoise();
        var noise = this.noise;

        var useTurbulence = minFreq != 0.0 && maxFreq != 0.0 && minFreq < maxFreq;

        var snoise = function(x,y) {
            return noise.noise(x, y); // noise.noise returns values in range [-1,1]
            //return 2.0 * noise.noise(x, y) - 1.0; // this code is for noise value in range [0,1]
        };

        var turbulence = function(minFreq, maxFreq, s, t) {
            var value = 0;
            for (var f = minFreq; f < maxFreq; f *= 2)
            {
                value += Math.abs(snoise(s * f, t * f))/f;
            }
            return value;
        };

        for (var y = 0; y < height; ++y)
        {
            var t = y / height * scale[1];
            var invWidth = 1.0 / width;

            for (var x = 0; x < width; ++x)
            {
                var s = x * invWidth * scale[0];
                var v = useTurbulence ? turbulence(minFreq, maxFreq, s, t) : snoise(s, t);
                var offset = (x * width + y) * 4;
                pix[offset] =  Math.floor(v * 255);
                pix[offset+1] = Math.floor(v * 255);
                pix[offset+2] = Math.floor(v * 255);
                pix[offset+3] = 255;
            }
        }

        /* Fill with green color
        for (var y = 0; y < height; ++y)
        {
            for (var x = 0; x < width; ++x)
            {
                var offset = (x * width + y) * 4;
                pix[offset] =  0
                pix[offset+1] = 255;
                pix[offset+2] = 0;
                pix[offset+3] = 255;
            }
        }
        */

        return true;
    }
});
// Code portions from http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
(function() {
    Xflow.Filters = {};

    var tmpCanvas = null;
    var tmpCtx = null;

    Xflow.Filters.createImageData = function(w,h) {
        if (!tmpCanvas)
            tmpCanvas = document.createElement('canvas');
        if (!tmpCtx)
            tmpCtx = tmpCanvas.getContext('2d');
        return tmpCtx.createImageData(w, h);
    };

    Xflow.Filters.createImageDataFloat32 = function(w, h) {
        return {width: w, height: h, data: new Float32Array(w * h * 4)};
    };

    Xflow.Filters.grayscale = function(inpixels, outpixels, args) {
            var s = inpixels.data;
            var d = outpixels.data;
            for (var i=0; i<s.length; i+=4) {
                var r = s[i];
                var g = s[i+1];
                var b = s[i+2];
                var a = s[i+3];
                // CIE luminance for the RGB
                // The human eye is bad at seeing red and blue, so we de-emphasize them.
                var v = 0.2126*r + 0.7152*g + 0.0722*b;
                d[i] = d[i+1] = d[i+2] = v
                d[i+3] = a;
            }
            return inpixels;
    };

    Xflow.Filters.convolute = function(inpixels, outpixels, weights, opaque) {
            var side = Math.round(Math.sqrt(weights.length));
            var halfSide = Math.floor(side/2);
            var src = inpixels.data;
            var sw = inpixels.width;
            var sh = inpixels.height;
            // pad output by the convolution matrix
            var w = sw;
            var h = sh;
            var dst = outpixels.data;
            // go through the destination image pixels
            var alphaFac = opaque ? 1 : 0;
            for (var y=0; y<h; y++) {
                for (var x=0; x<w; x++) {
                    var sy = y;
                    var sx = x;
                    var dstOff = (y*w+x)*4;
                    // calculate the weighed sum of the source image pixels that
                    // fall under the convolution matrix
                    var r=0, g=0, b=0, a=0;
                    for (var cy=0; cy<side; cy++) {
                        for (var cx=0; cx<side; cx++) {
                            var scy = sy + cy - halfSide;
                            var scx = sx + cx - halfSide;
                            if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                                var srcOff = (scy*sw+scx)*4;
                                var wt = weights[cy*side+cx];
                                r += src[srcOff] * wt;
                                g += src[srcOff+1] * wt;
                                b += src[srcOff+2] * wt;
                                a += src[srcOff+3] * wt;
                            }
                        }
                    }
                    dst[dstOff] = r;
                    dst[dstOff+1] = g;
                    dst[dstOff+2] = b;
                    dst[dstOff+3] = a + alphaFac*(255-a);
                }
            }
            return outpixels;
        };
/*
    Xflow.Filters.convoluteFloat32 = function(pixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side / 2);

        var src = pixels.data;
        var sw = pixels.width;
        var sh = pixels.height;

        var w = sw;
        var h = sh;
        var output = {
            width: w, height: h, data: new Float32Array(w * h * 4)
        };
        var dst = output.data;

        var alphaFac = opaque ? 1 : 0;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y * w + x) * 4;
                var r = 0, g = 0, b = 0, a = 0;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                        var scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                        var srcOff = (scy * sw + scx) * 4;
                        var wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                        a += src[srcOff + 3] * wt;
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }
*/
}());

function float4(x,y,z,w) {
    var v = new Float32Array(4);
    switch (arguments.length) {
        case 0:
            v[0] = 0;
            v[1] = 0;
            v[2] = 0;
            v[3] = 0;
            break;
        case 1:
            v[0] = x;
            v[1] = x;
            v[2] = x;
            v[3] = x;
            break;
        case 2:
            v[0] = x;
            v[1] = y;
            v[2] = 0;
            v[3] = 0;
            break;
        case 3:
            v[0] = x;
            v[1] = y;
            v[2] = z;
            v[3] = 0;
            break;
        default:
            v[0] = x;
            v[1] = y;
            v[2] = z;
            v[3] = w;
    }
    return v;
}

function hypot(a, b)
{
    return Math.sqrt(a*a + b*b);
}

function hypot4(a, b)
{
    return float4(hypot(a[0], b[0]),
                  hypot(a[1], b[1]),
                  hypot(a[2], b[2]),
                  hypot(a[3], b[3]));
}

function hypot4To(r, a, b)
{
    r[0] = hypot(a[0], b[0]);
    r[1] = hypot(a[1], b[1]);
    r[2] = hypot(a[2], b[2]);
    r[3] = hypot(a[3], b[3]);
}

function getTexel2D(imagedata, x, y) {
    var offset = (y * imagedata.width + x) * 4;
    var data = imagedata.data;
    var color = new Float32Array(4);
    color[0] = data[offset] / 255.0;
    color[1] = data[offset+1] / 255.0;
    color[2] = data[offset+2] / 255.0;
    color[3] = data[offset+3] / 255.0;
    return color;
}

function getTexel2DTo(color, imagedata, x, y) {
    var offset = (y * imagedata.width + x) * 4;
    var data = imagedata.data;
    color[0] = data[offset] / 255.0;
    color[1] = data[offset+1] / 255.0;
    color[2] = data[offset+2] / 255.0;
    color[3] = data[offset+3] / 255.0;
    return color;
}

function setTexel2D(imagedata, x, y, color) {
    var offset = (y * imagedata.width + x) * 4;
    var data = imagedata.data;
    data[offset] = color[0] * 255.0 ;
    data[offset+1] = color[1] * 255.0;
    data[offset+2] = color[2] * 255.0;
    data[offset+3] = color[3] * 255.0;
}

Xflow.registerOperator("xflow.sobelImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image'} ],
    params:  [ {type: 'texture', source : 'image'} ],
    evaluate: function(result, image) {
        var width = image.width;
        var height = image.height;

        // Sobel filter, AnySL method
        var gx = float4(0.0);
        var gy = float4(0.0);
        var i00 = float4();
        var i00 = float4();
        var i10 = float4();
        var i20 = float4();
        var i01 = float4();
        var i11 = float4();
        var i21 = float4();
        var i02 = float4();
        var i12 = float4();
        var i22 = float4();
        var color = float4();

        for (var y = 0; y < height; ++y)
        {
            for (var x = 0; x < width; ++x)
            {
                /* Read each texel component and calculate the filtered value using neighbouring texel components */
                if ( x >= 1 && x < (width-1) && y >= 1 && y < height - 1)
                {
                    getTexel2DTo(i00, image, x-1, y-1);
                    getTexel2DTo(i10, image, x, y-1);
                    getTexel2DTo(i20, image, x+1, y-1);
                    getTexel2DTo(i01, image, x-1, y);
                    getTexel2DTo(i11, image, x, y);
                    getTexel2DTo(i21, image, x+1, y);
                    getTexel2DTo(i02, image, x-1, y+1);
                    getTexel2DTo(i12, image, x, y+1);
                    getTexel2DTo(i22, image, x+1, y+1);

                    gx[0] = i00[0] + 2 * i10[0] + i20[0] - i02[0]  - 2 * i12[0] - i22[0];
                    gx[1] = i00[1] + 2 * i10[1] + i20[1] - i02[1]  - 2 * i12[1] - i22[1];
                    gx[2] = i00[2] + 2 * i10[2] + i20[2] - i02[2]  - 2 * i12[2] - i22[2];

                    gy[0] = i00[0] - i20[0]  + 2*i01[0] - 2*i21[0] + i02[0]  -  i22[0];
                    gy[1] = i00[1] - i20[1]  + 2*i01[1] - 2*i21[1] + i02[1]  -  i22[1];
                    gy[2] = i00[2] - i20[2]  + 2*i01[2] - 2*i21[2] + i02[2]  -  i22[2];

                    /* taking root of sums of squares of Gx and Gy */
                    hypot4To(color, gx, gy);
                    color[0]/=2;
                    color[1]/=2;
                    color[2]/=2;
                    color[3]=1.0;
                    setTexel2D(result, x, y, color);
                }
            }
        }



// Sobel filter with separate steps
//
//        var vertical = Xflow.Filters.createImageDataFloat32(width, height);
//        Xflow.Filters.convolute(result, vertical,
//            [ -1, 0, 1,
//              -2, 0, 2,
//              -1, 0, 1 ]);
//        var horizontal = Xflow.Filters.createImageDataFloat32(width, height);
//        Xflow.Filters.convolute(result, horizontal,
//            [ -1, -2, -1,
//               0,  0,  0,
//               1,  2,  1 ]);
//
//        for (var i=0; i<result.data.length; i+=4) {
//            // make the vertical gradient red
//            var v = Math.abs(vertical.data[i]);
//            result.data[i] = v;
//            // make the horizontal gradient green
//            var h = Math.abs(horizontal.data[i]);
//            result.data[i+1] = h;
//            // and mix in some blue for aesthetics
//            result.data[i+2] = (v+h)/4;
//            result.data[i+3] = 255; // opaque alpha
//        }

        /* Copy image
        var destpix = result.data;
        var srcpix = image.data;

        for (var y = 0; y < height; ++y)
        {
            for (var x = 0; x < width; ++x)
            {
                var offset = (y * width + x) * 4;
                destpix[offset] =  srcpix[offset];
                destpix[offset+1] = srcpix[offset+1];
                destpix[offset+2] = srcpix[offset+2];
                destpix[offset+3] = srcpix[offset+3];
            }
        }
        */
        return true;
    }
});
Xflow.registerOperator("xflow.grayscaleImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image'} ],
    params:  [ {type: 'texture', source : 'image'} ],
    evaluate: function(result, image) {
        var width = image.width;
        var height = image.height;

        var s = image.data;
        var d = result.data;
        for (var i = 0; i < s.length; i += 4) {
            var r = s[i];
            var g = s[i + 1];
            var b = s[i + 2];
            var a = s[i + 3];
            // CIE luminance for the RGB
            // The human eye is bad at seeing red and blue, so we de-emphasize them.
            var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v
            d[i + 3] = a;
        }
        return true;
    }
});
Xflow.registerOperator("xflow.sepiaImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image'} ],
    params:  [ {type: 'texture', source : 'image'} ],
    evaluate: function(result, image) {
        var s = image.data;
        var d = result.data;
        var r = 0, g = 0, b = 0;
        for(var i = 0 ; i < s.length; i += 4) {
            r = (s[i] * 0.393 + s[i+1] * 0.769 + s[i+2] * 0.189);
            g = (s[i] * 0.349 + s[i+1] * 0.686 + s[i+2] * 0.168);
            b = (s[i] * 0.272 + s[i+1] * 0.534 + s[i+2] * 0.131);
            if (r>255) r = 255;
            if (g>255) g = 255;
            if (b>255) b = 255;
            if (r<0) r = 0;
            if (g<0) g = 0;
            if (b<0) b = 0;
            d[i] = r;
            d[i+1] = g;
            d[i+2] = b;
            d[i+3] = 255;
        }
        return true;
    },
    evaluate_parallel: function(index, image){
        var x = index[0], y = index[1];
        var r = (image[x][y][0] * 0.393 + image[x][y][1] * 0.769 + image[x][y][2] * 0.189);
        var g = (image[x][y][0] * 0.349 + image[x][y][1] * 0.686 + image[x][y][2] * 0.168);
        var b = (image[x][y][0] * 0.272 + image[x][y][1] * 0.534 + image[x][y][2] * 0.131);
        if (r>255) r = 255;
        if (g>255) g = 255;
        if (b>255) b = 255;
        if (r<0) r = 0;
        if (g<0) g = 0;
        if (b<0) b = 0;
        return [r,g,b,255];
    }
});
Xflow.registerOperator("xflow.clampImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image', formatType: 'ImageData'} ],
    params:  [ {type: 'texture', source : 'image'},
               {type: 'float', source : 'min'},
               {type: 'float', source : 'max'}
             ],
    evaluate: function(result, image, min, max) {
        var inpix = image.data;
        var outpix = result.data;
        var minv = min[0];
        var maxv = max[0];
        var len = image.data.length;
        for (var i = 0 ; i < len; i++) {
            var val = inpix[i];
            if (val < minv) val = minv;
            if (val > maxv) val = maxv;
            outpix[i] = val;
        }
        return true;
    }
});
// Code portions from http://www.html5rocks.com/en/tutorials/canvas/imagefilters/

(function() {

    function convolute(inpixels, outpixels, weights, opaque) {
        var side = Math.round(Math.sqrt(weights.length));
        var halfSide = Math.floor(side/2);
        var src = inpixels.data;
        var sw = inpixels.width;
        var sh = inpixels.height;
        // pad output by the convolution matrix
        var w = sw;
        var h = sh;
        var dst = outpixels.data;
        // go through the destination image pixels
        var alphaFac = opaque ? 1 : 0;
        for (var y=0; y<h; y++) {
            for (var x=0; x<w; x++) {
                var sy = y;
                var sx = x;
                var dstOff = (y*w+x)*4;
                // calculate the weighed sum of the source image pixels that
                // fall under the convolution matrix
                var r=0, g=0, b=0, a=0;
                for (var cy=0; cy<side; cy++) {
                    for (var cx=0; cx<side; cx++) {
                        var scy = sy + cy - halfSide;
                        var scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            var srcOff = (scy*sw+scx)*4;
                            var wt = weights[cy*side+cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff+1] * wt;
                            b += src[srcOff+2] * wt;
                            a += src[srcOff+3] * wt;
                        }
                    }
                }
                dst[dstOff] = r;
                dst[dstOff+1] = g;
                dst[dstOff+2] = b;
                dst[dstOff+3] = a + alphaFac*(255-a);
            }
        }
        return outpixels;
    };

    Xflow.registerOperator("xflow.convoluteImage", {
        outputs: [ {type: 'texture', name : 'result', sizeof : 'image'} ],
        params:  [
            {type: 'texture', source : 'image'},
            {type: 'float', source : 'kernel'}
        ],
        evaluate: function(result, image, kernel) {
            convolute(image, result, kernel, true);
            return true;
        }
    });

    Xflow.registerOperator("xflow.convoluteImageToFloat", {
        outputs: [ {type: 'texture', name : 'result', sizeof: 'image', formatType : 'float32'} ],
        params:  [
            {type: 'texture', source : 'image'},
            {type: 'float', source : 'kernel'}
        ],
        evaluate: function(result, image, kernel) {
            convolute(image, result, kernel, true);
            return true;
        }
    });

})();
// Based on: http://web.archive.org/web/20100310063925/http://dem.ocracy.org/libero/photobooth/

Xflow.registerOperator("xflow.funMirrorImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image'} ],
    params:  [ {type: 'texture', source : 'image'},
               {type: 'float', source : 'time'} ],
    evaluate: function(result, image, time) {
        var width = result.width;
        var height = result.height;
        var time = time[0];

        var s = image.data;
        var d = result.data;

        for (var y = 0; y < height; ++y) {
            for (var x = 0; x < width; ++x) {

                /*original coordinates*/
                // [0.0 ,1.0] x [0.0, 1.0]
                var coordX = x / width;
                var coordY = y / height;

                // [-1.0 ,1.0] x [-1.0, 1.0]
                var normCoordX = 2.0 * coordX - 1.0;
                var normCoordY = 2.0 * coordY - 1.0;

                /*go to polar coordinates*/
                var r = Math.sqrt(normCoordX*normCoordX + normCoordY*normCoordY); // length(normCoord)
                var phi = Math.atan2(normCoordY, normCoordX);

                /*squeeze and vary it over time*/
                r = Math.pow(r, 1.0/1.8) * time;

                /*back to cartesian coordinates*/
                normCoordX = r * Math.cos(phi);
                normCoordY = r * Math.sin(phi);
                // [0.0 ,1.0] x [0.0, 1.0]
                coordX = normCoordX / 2.0 + 0.5;
                coordY = normCoordY / 2.0 + 0.5;

                var sX = Math.round(coordX * width);
                var sY = Math.round(coordY * height);

                var i = (sY * width + sX)*4;
                var r = s[i];
                var g = s[i + 1];
                var b = s[i + 2];
                var a = s[i + 3];

                /*color the fragment with calculated texture*/
                var i = (y * width + x)*4;
                d[i] = r;
                d[i + 1] = g;
                d[i + 2] = b;
                d[i + 3] = a;
            }
        }
        return true;
    }
});
// Based on http://kodemongki.blogspot.de/2011/06/kameraku-custom-shader-effects-example.html
Xflow.registerOperator("xflow.popartImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image'} ],
    params:  [ {type: 'texture', source : 'image'},
        {type: 'float', source : 'time'} ],
    evaluate: function(result, image, time) {
        var width = image.width;
        var height = image.height;

        var s = image.data;
        var d = result.data;
        for (var i = 0; i < s.length; i += 4) {
            var r = s[i] / 255;
            var g = s[i + 1] / 255;
            var b = s[i + 2] / 255;
            var a = s[i + 3] / 255;

            var y = 0.3 * r + 0.59 * g + 0.11 * b;
            y = y < 0.3 ? 0.0 : (y < 0.6 ? 0.5 : 1.0);
            if (y == 0.5) {
                d[i]   = 0.8 * 255;
                d[i+1] = 0;
                d[i+2] = 0;
            } else if (y == 1.0) {
                d[i]   = 0.9 * 255;
                d[i+1] = 0.9 * 255;
                d[i+2] = 0;
            } else {
                d[i] = 0;
                d[i+1] = 0;
                d[i+2] = 0;
            }
            d[i+3] = s[i+3];
        }
        return true;
    }
});
Xflow.registerOperator("xflow.magnitudeImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image1'} ],
    params:  [
        {type: 'texture', source : 'image1'},
        {type: 'texture', source : 'image2'}
    ],
    evaluate: function(result, image1, image2) {
        var inpix1 = image1.data;
        var inpix2 = image2.data;
        var outpix = result.data;

        var len = inpix1.length;
        for (var i = 0 ; i < len; i+=1) {
            var val1 = inpix1[i];
            var val2 = inpix2[i];
            outpix[i] = Math.sqrt(val1*val1 + val2*val2);
        }
        return true;
    }
});
Xflow.registerOperator("xflow.flipVerticalImage", {
    outputs: [ {type: 'texture', name : 'result', sizeof : 'image'} ],
    params:  [ {type: 'texture', source : 'image'} ],
    evaluate: function(result, image) {
        var width = image.width;
        var height = image.height;

        var destpix = result.data;
        var srcpix = image.data;

        for (var y = 0; y < height; ++y) {
            for (var x = 0; x < width; ++x) {
                var rowOffset = y * width;
                var srcOffset = (rowOffset + x) * 4;
                var dstOffset = (rowOffset + ((width-1) - x)) * 4;
                destpix[dstOffset] =  srcpix[srcOffset];
                destpix[dstOffset+1] = srcpix[srcOffset+1];
                destpix[dstOffset+2] = srcpix[srcOffset+2];
                destpix[dstOffset+3] = srcpix[srcOffset+3];
            }
        }
        return true;
    }
});
Xflow.registerOperator("xflow.selectTransform", {
    outputs: [ {type: 'float4x4', name : 'result', customAlloc: true} ],
    params:  [ {type: 'int', source : 'index'},
               {type: 'float4x4', source: 'transform'} ],
    alloc: function(sizes, index, transform) {
        sizes['result'] = 1;
    },
    evaluate: function(result, index, transform) {
        var i = 16 * index[0];
        if (i < transform.length && i+15 < transform.length) {
            result[0] = transform[i+0];
            result[1] = transform[i+1];
            result[2] = transform[i+2];
            result[3] = transform[i+3];
            result[4] = transform[i+4];
            result[5] = transform[i+5];
            result[6] = transform[i+6];
            result[7] = transform[i+7];
            result[8] = transform[i+8];
            result[9] = transform[i+9];
            result[10] = transform[i+10];
            result[11] = transform[i+11];
            result[12] = transform[i+12];
            result[13] = transform[i+13];
            result[14] = transform[i+14];
            result[15] = transform[i+15];
        } else {
            result[0] = 1;
            result[1] = 0;
            result[2] = 0;
            result[3] = 0;
            result[4] = 0;
            result[5] = 1;
            result[6] = 0;
            result[7] = 0;
            result[8] = 0;
            result[9] = 0;
            result[10] = 1;
            result[11] = 0;
            result[12] = 0;
            result[13] = 0;
            result[14] = 0;
            result[15] = 1;
        }
    }
});
Xflow.registerOperator("xflow.selectBool", {
    outputs: [ {type: 'bool', name : 'result', customAlloc: true} ],
    params:  [ {type: 'int', source : 'index'},
               {type: 'bool', source: 'value'} ],
    alloc: function(sizes, index, value) {
        sizes['result'] = 1;
    },
    evaluate: function(result, index, value) {
        var i = index[0];
        if (i < value.length) {
            result[0] = value[i];
        } else {
            result[0] = false;
        }
    }
});
(function(){

var c_CubePositions =  [
    [-1,-1,-1], [1,-1,-1], [-1,1,-1], [1,1,-1], // front
    [-1,-1,-1], [-1,-1,1], [-1,1,-1], [-1,1,1], // left
    [-1,-1,-1], [1,-1,-1], [-1,-1,1], [1,-1,1], // top
    [1,-1,-1], [1,1,-1], [1,-1,1], [1,1,1],     // right
    [-1,1,-1], [1,1,-1], [-1,1,1], [1,1,1],     // bottom
    [-1,-1,1], [1,-1,1], [-1,1,1], [1,1,1]      // back
];
var c_CubeNormals =  [
    [0,0,-1], [0,0,-1], [0,0,-1], [0,0,-1], // front
    [-1,0,0], [-1,0,0], [-1,0,0], [-1,0,0], // left
    [0,-1,0], [0,-1,0], [0,-1,0], [0,-1,0], // top
    [1,0,0], [1,0,0], [1,0,0], [1,0,0],     // right
    [0,1,0], [0,1,0], [0,1,0], [0,1,0],     // bottom
    [0,0,1], [0,0,1], [0,0,1], [0,0,1]      // back
];
var c_CubeIndex = [
    [0,1,2,1,2,3],
    [4,5,6,5,6,7],
    [8,9,10,9,10,11],
    [12,13,14,13,14,15],
    [16,17,18,17,18,19],
    [20,21,22,21,22,23]
]

/**
 * Grid Generation
 */
Xflow.registerOperator("xflow.debug.createSkinCubes", {
    outputs: [	{type: 'int', name: 'index', customAlloc: true},
                {type: 'float3', name: 'position', customAlloc: true},
				{type: 'float3', name: 'normal', customAlloc: true},
				{type: 'int4', name: 'boneIndices', customAlloc: true},
				{type: 'float4', name: 'boneWeights', customAlloc: true}],
    params:  [{type: 'float4x4', source: 'bindTransforms', array: true},
              {type: 'float', source: 'size', array: true, optional: true}],
    alloc: function(sizes, bindTransforms)
    {
        var s = bindTransforms.length / 16;
        sizes['position'] = s * 4 * 6;
        sizes['normal'] = s * 4 * 6;
        sizes['boneIndices'] = s * 4 * 6;
        sizes['boneWeights'] = s * 4 * 6;
        sizes['index'] = s * 6 * 6;
    },
    evaluate: function(index, position, normal, boneIdx, boneWeight, bindTransforms, size) {
		var cubeCount = bindTransforms.length / 16;
		var size = (size && size[0] || 1) / 2;

        var tmpPosition = XML3D.math.vec3.create(),
            tmpNormal = XML3D.math.vec3.create();

		for(var i = 0; i < cubeCount; ++i){
            for(var j = 0; j < 6; ++j){
                for(var k = 0; k < 4; k++){
                    var localIdx = j*4+ k, globalIdx = i*6*4 + localIdx;

                    XML3D.math.vec3.copy(tmpPosition, c_CubePositions[localIdx]);
                    XML3D.math.vec3.scale(tmpPosition, tmpPosition, size);
                    XML3D.math.mat4.multiplyOffsetVec3(bindTransforms, i*16, tmpPosition, 0);
                    XML3D.math.vec3.copy(tmpNormal, c_CubeNormals[localIdx]);
                    XML3D.math.mat4.multiplyOffsetDirection(bindTransforms, i*16, tmpNormal, 0);

                    position[globalIdx*3+0] = tmpPosition[0];
                    position[globalIdx*3+1] = tmpPosition[1];
                    position[globalIdx*3+2] = tmpPosition[2];
                    normal[globalIdx*3+0] = tmpNormal[0];
                    normal[globalIdx*3+1] = tmpNormal[1];
                    normal[globalIdx*3+2] = tmpNormal[2];
                    boneIdx[globalIdx*4+0] = i;
                    boneIdx[globalIdx*4+1] = boneIdx[globalIdx*4+2] = boneIdx[globalIdx*4+3]= 0;
                    boneWeight[globalIdx*4+0] = 1;
                    boneWeight[globalIdx*4+1] = boneWeight[globalIdx*4+2] = boneWeight[globalIdx*4+3]= 0;
                }
                var globalIndexIdx = i*6*6 + j*6;
                for(var k = 0; k < 6; ++k){
                    index[globalIndexIdx+k] = i*6*4 + c_CubeIndex[j][k];
                }
            }
		}
		// We are done!
		position = position;
	}
});

}());XML3D.data = {
    toString : function() {
        return "data";
    }
};
XML3D.data = XML3D.data || {};

(function() {


XML3D.data.xflowGraph = new Xflow.Graph();

/**
 * @interface
 */
var IDataAdapter = function() {
};
IDataAdapter.prototype.getOutputs = function() {
};
IDataAdapter.prototype.addParentAdapter = function(adapter) {
};

/**
 * Constructor of XML3D.data.DataAdapter The DataAdapter implements the
 * DataCollector concept and serves as basis of all DataAdapter classes. In
 * general, a DataAdapter is associated with an element node which uses
 * generic data and should be instantiated via
 * XML3D.data.XML3DDataAdapterFactory to ensure proper functionality.
 *
 * @extends XML3D.base.Adapter
 * @implements IDataAdapter
 * @constructor
 *
 * @param factory
 * @param node
 */
XML3D.data.DataAdapter = function(factory, node) {
    XML3D.base.NodeAdapter.call(this, factory, node);

    // Node handles for src and proto
    this.handles = {};
    this.xflowDataNode = null;
};
XML3D.createClass(XML3D.data.DataAdapter, XML3D.base.NodeAdapter);

XML3D.data.DataAdapter.prototype.init = function() {
    //var xflow = this.resolveScript();
    //if (xflow)
    //    this.scriptInstance = new XML3D.data.ScriptInstance(this, xflow);

    var protoNode = (this.node.localName == "proto");
    this.xflowDataNode = XML3D.data.xflowGraph.createDataNode(protoNode);

    this.updateHandle("src");
    this.updateHandle("proto");
    this.xflowDataNode.setFilter(this.node.getAttribute("filter"));
    this.xflowDataNode.setCompute(this.node.getAttribute("compute"));
    recursiveDataAdapterConstruction(this);

};

function recursiveDataAdapterConstruction(adapter){
    for ( var child = adapter.node.firstElementChild; child !== null; child = child.nextElementSibling) {
        var subadapter = adapter.factory.getAdapter(child);
        if(subadapter){
            adapter.xflowDataNode.appendChild(subadapter.getXflowNode());
        }
    }
}

XML3D.data.DataAdapter.prototype.getXflowNode = function(){
    return this.xflowDataNode;
}

XML3D.data.DataAdapter.prototype.getComputeRequest = function(filter, callback){
    return new Xflow.ComputeRequest(this.xflowDataNode, filter, callback);
}

XML3D.data.DataAdapter.prototype.getComputeResult = function(filter)
{
    var result = this.xflowDataNode._getResult(Xflow.RESULT_TYPE.COMPUTE, filter);
    return result;
}

XML3D.data.DataAdapter.prototype.getOutputNames = function()
{
    return this.xflowDataNode.getOutputNames();
}

XML3D.data.DataAdapter.prototype.getOutputChannelInfo = function(name)
{
    return this.xflowDataNode.getOutputChannelInfo(name);
}

/**
 * The notifyChanged() method is called by the XML3D data structure to
 * notify the DataAdapter about data changes (DOM mustation events) in its
 * associating node. When this method is called, all observers of the
 * DataAdapter are notified about data changes via their notifyDataChanged()
 * method.
 *
 * @param evt notification of type XML3D.Notification
 */
XML3D.data.DataAdapter.prototype.notifyChanged = function(evt) {
    if(evt.type == XML3D.events.ADAPTER_HANDLE_CHANGED){
        this.connectedAdapterChanged(evt.key, evt.adapter);
        if(evt.handleStatus == XML3D.base.AdapterHandle.STATUS.NOT_FOUND){
            XML3D.debug.logError("Could not find <data> element of url '" + evt.url + "' for " + evt.key);
        }
        return;
    }
    else if (evt.type == XML3D.events.NODE_INSERTED) {
        var insertedNode = evt.wrapped.target;
        var insertedXflowNode = this.factory.getAdapter(insertedNode).getXflowNode();
        var sibling = insertedNode, followUpAdapter = null;
        do{
            sibling = sibling.nextSibling;
        }while(sibling && !(followUpAdapter = this.factory.getAdapter(sibling)))
        if(followUpAdapter)
            this.xflowDataNode.insertBefore(insertedXflowNode, followUpAdapter.getXflowNode());
        else
            this.xflowDataNode.appendChild(insertedXflowNode);
        return;
    }
    else if (evt.type == XML3D.events.NODE_REMOVED) {
        var removedXflowNode = this.factory.getAdapter(evt.wrapped.target).getXflowNode();
        this.xflowDataNode.removeChild(removedXflowNode);
        return;
    } else if (evt.type == XML3D.events.VALUE_MODIFIED) {
        var attr = evt.wrapped.attrName;
        if(attr == "filter"){
            this.xflowDataNode.setFilter(this.node.getAttribute(attr))
        }
        else if(attr == "compute"){
            this.xflowDataNode.setCompute(this.node.getAttribute(attr))
        }
        else if(attr == "src" || attr == "proto"){
            this.updateHandle(attr);
        }
        return;
    } else if (evt.type == XML3D.events.THIS_REMOVED) {
        this.clearAdapterHandles();
    }
};

function updateLoadState(dataAdpater){
    var loading = false;
    var handle = dataAdpater.getAdapterHandle(dataAdpater.node.getAttribute("src"));
    if(handle && handle.status == XML3D.base.AdapterHandle.STATUS.LOADING){
        loading = true;
    }
    var handle = dataAdpater.getAdapterHandle(dataAdpater.node.getAttribute("proto"));
    if(handle && handle.status == XML3D.base.AdapterHandle.STATUS.LOADING){
        loading = true;
    }
    dataAdpater.xflowDataNode.setLoading(loading);
}

XML3D.data.DataAdapter.prototype.updateHandle = function(attributeName) {
    var adapterHandle = this.getAdapterHandle(this.node.getAttribute(attributeName));
    if(adapterHandle && adapterHandle.status == XML3D.base.AdapterHandle.STATUS.NOT_FOUND){
        XML3D.debug.logError("Could not find <data> element of url '" + adapterHandle.url + "' for " + attributeName);
    }

    this.connectAdapterHandle(attributeName, adapterHandle);
    this.connectedAdapterChanged(attributeName, adapterHandle ? adapterHandle.getAdapter() : null);
    updateLoadState(this);
};

XML3D.data.DataAdapter.prototype.connectedAdapterChanged = function(key, adapter) {
    if(key == "src"){
        this.xflowDataNode.sourceNode = adapter ? adapter.getXflowNode() : null;
    }
    if(key == "proto"){
        this.xflowDataNode.protoNode = adapter ? adapter.getXflowNode() : null;
    }
    updateLoadState(this);
};
/**
 * Returns String representation of this DataAdapter
 */
XML3D.data.DataAdapter.prototype.toString = function() {
    return "XML3D.data.DataAdapter";
};

}());
// data/values.js
(function() {
    "use strict";

    var BUFFER_TYPE_TABLE = {};
    BUFFER_TYPE_TABLE['float']    = Xflow.DATA_TYPE.FLOAT;
    BUFFER_TYPE_TABLE['int']      = Xflow.DATA_TYPE.INT;
    BUFFER_TYPE_TABLE['byte']     = Xflow.DATA_TYPE.BYTE;
    BUFFER_TYPE_TABLE['ubyte']    = Xflow.DATA_TYPE.UBYTE;
    BUFFER_TYPE_TABLE['bool']     = Xflow.DATA_TYPE.BOOL;
    BUFFER_TYPE_TABLE['float2']   = Xflow.DATA_TYPE.FLOAT2;
    BUFFER_TYPE_TABLE['float3']   = Xflow.DATA_TYPE.FLOAT3;
    BUFFER_TYPE_TABLE['float4']   = Xflow.DATA_TYPE.FLOAT4;
    BUFFER_TYPE_TABLE['int4']     = Xflow.DATA_TYPE.INT4;
    BUFFER_TYPE_TABLE['float4x4'] = Xflow.DATA_TYPE.FLOAT4X4;
    XML3D.data.BUFFER_TYPE_TABLE = BUFFER_TYPE_TABLE;
    /**
     * Constructor of XML3D.data.ValueDataAdapter
     *
     * @extends XML3D.data.DataAdapter
     * @extends XML3D.data.ProviderEntry
     * @constructor
     *
     * @param factory
     * @param {Element} node
     */
    var ValueDataAdapter = function(factory, node)
    {
        XML3D.data.DataAdapter.call(this, factory, node);
        this.xflowInputNode = null;
    };
    XML3D.createClass(ValueDataAdapter, XML3D.base.NodeAdapter);

    ValueDataAdapter.prototype.init = function()
    {
        var config = this.node._configured, value;
        if(this.node.textContent == XML3D.scriptValueLabel){
            value = config.scriptValue;
        }
        else{
            delete config.scriptValue;
            value = this.node.value;
        }

        var type = BUFFER_TYPE_TABLE[this.node.localName];
        var buffer = new Xflow.BufferEntry(type, value);

        this.xflowInputNode = XML3D.data.xflowGraph.createInputNode();
        this.xflowInputNode.name = this.node.name;
        this.xflowInputNode.data = buffer;
        this.xflowInputNode.key = this.node.key;
        this.xflowInputNode.paramName = this.node.param ? this.node.name : null;
    }

    ValueDataAdapter.prototype.getXflowNode = function(){
        return this.xflowInputNode;
    }

    /**
     *
     */
    ValueDataAdapter.prototype.notifyChanged = function(evt)
    {
        if(evt.type == XML3D.events.VALUE_MODIFIED){
            var attr = evt.wrapped.attrName;
            if(!attr){
                delete this.node._configured.scriptValue;
                this.xflowInputNode.data.setValue(this.node.value);
            }
            else if(attr == "name"){
                this.xflowInputNode.name = this.node.name;
            }
            else if(attr == "key"){
                this.xflowInputNode.key = this.node.key;
            }
            else if(attr == "param"){
                this.xflowInputNode.paramName = this.node.param ? this.node.name : null;
            }
        }
    };

    ValueDataAdapter.prototype.setScriptValue = function(value){
        // TODO: Add Type check
        this.xflowInputNode.data.setValue(value);
    }

    /**
     * Returns String representation of this DataAdapter
     */
    ValueDataAdapter.prototype.toString = function()
    {
        return "XML3D.data.ValueDataAdapter";
    };

    // Export
    XML3D.data.ValueDataAdapter = ValueDataAdapter;

}());// data/texture.js
(function() {
    "use strict";

    var clampToGL = function(modeStr) {
        if (modeStr == "clamp")
            return WebGLRenderingContext.CLAMP_TO_EDGE;
        if (modeStr == "repeat")
            return WebGLRenderingContext.REPEAT;
        return WebGLRenderingContext.CLAMP_TO_EDGE;
    };

    var filterToGL = function(modeStr) {
        if (modeStr == "nearest")
            return WebGLRenderingContext.NEAREST;
        if (modeStr == "linear")
            return WebGLRenderingContext.LINEAR;
        if (modeStr == "mipmap_linear")
            return WebGLRenderingContext.LINEAR_MIPMAP_NEAREST;
        if (modeStr == "mipmap_nearest")
            return WebGLRenderingContext.NEAREST_MIPMAP_NEAREST;
        return WebGLRenderingContext.LINEAR;
    };

    var TextureDataAdapter = function(factory, node) {
        XML3D.data.DataAdapter.call(this, factory, node);
    };
    XML3D.createClass(TextureDataAdapter, XML3D.base.NodeAdapter);

    TextureDataAdapter.prototype.init = function() {
        this.xflowInputNode = this.createXflowNode();
        this.xflowInputNode.data = this.createTextureEntry();
    };

    TextureDataAdapter.prototype.createTextureEntry = function() {
        var node = this.node;
        var entry = new Xflow.TextureEntry(null);
        var config = entry.getSamplerConfig();
        config.wrapS = clampToGL(node.wrapS);
        config.wrapT = clampToGL(node.wrapT);
        config.minFilter = filterToGL(node.filterMin);
        config.magFilter = filterToGL(node.filterMin);
        config.textureType = Xflow.TEX_TYPE.TEXTURE_2D;

        var imageAdapter = this.factory.getAdapter(this.node.firstElementChild, XML3D.data.XML3DDataAdapterFactory.prototype);
        if(imageAdapter) {
            imageAdapter.setTextureEntry(entry);
        }
        return entry;
    };

    TextureDataAdapter.prototype.createXflowNode = function() {
        var xnode = XML3D.data.xflowGraph.createInputNode();
        xnode.name = this.node.name;
        xnode.paramName = this.node.param ? this.node.name : null;
        xnode.key = this.node.key;
        return xnode;
    };

    TextureDataAdapter.prototype.setScriptValue = function(value){
        XML3D.debug.logError("Texture currently does not support setScriptValue()");
    }

    TextureDataAdapter.prototype.getOutputs = function() {
        var result = {};
        result[this.node.name] = this;
        return result;
    };

    TextureDataAdapter.prototype.getValue = function() {
        return this.value;
    };

    TextureDataAdapter.prototype.notifyChanged = function(evt)
    {
        if(evt.type == XML3D.events.VALUE_MODIFIED){
            var attr = evt.wrapped.attrName;
            if(attr == "name"){
                this.xflowInputNode.name = this.node.name;
            }
            else if(attr == "key"){
                this.xflowInputNode.key = this.node.key;
            }
            else if(attr == "param"){
                this.xflowInputNode.paramName = this.node.param ? this.node.name : null;
            }
        }
    };

    /**
     * @return {Element}
     */
    TextureDataAdapter.prototype.getXflowNode = function() {
        return this.xflowInputNode;
    };

    /**
     * Returns String representation of this TextureDataAdapter
     */
    TextureDataAdapter.prototype.toString = function() {
        return "XML3D.data.TextureDataAdapter";
    };

    // Export
    XML3D.data.TextureDataAdapter = TextureDataAdapter;

}());// data/sink.js
(function() {
    "use strict";

    /**
     * SinkDataAdapter represents the sink in the data hierarchy (no parents).
     * Class XML3D.data.SinkDataAdapter
     * @constructor
     * @extends {XML3D.data.DataAdapter}
     * @param factory
     * @param node
     */
    var SinkDataAdapter = function(factory, node) {
        XML3D.data.DataAdapter.call(this, factory, node);
    };
    XML3D.createClass(SinkDataAdapter, XML3D.data.DataAdapter);

    /**
     * Indicates whether this DataAdapter is a SinkAdapter (has no parent
     * DataAdapter).
     *
     * @returns true if this DataAdapter is a SinkAdapter, otherwise false.
     */
    SinkDataAdapter.prototype.isSinkAdapter = function() {
        return true;
    };

    /**
     * Returns String representation of this DataAdapter
     */
    SinkDataAdapter.prototype.toString = function() {
        return "XML3D.data.SinkDataAdapter";
    };

    // Export
    XML3D.data.SinkDataAdapter = SinkDataAdapter;

    var ImgDataAdapter = function(factory, node) {
        XML3D.base.NodeAdapter.call(this, factory, node);
        this.textureEntry = null;
        this.image = null;
        if (node.src)
            this.createImageFromURL(node.src);
    };
    XML3D.createClass(ImgDataAdapter, XML3D.base.NodeAdapter);

    /**
     * Creates a new image object
     *
     * @param {string} url
     */
    ImgDataAdapter.prototype.createImageFromURL = function(url) {
        var that = this;
        var uri = new XML3D.URI(url).getAbsoluteURI(this.node.ownerDocument.documentURI);
        var onload = function (e, image) {
            if (that.textureEntry) {
                that.textureEntry.setImage(image);
            }
        };
        var onerror = function (e, image) {
            XML3D.debug.logError("Could not load image URI="+image.src);
        };
        this.image = XML3D.base.resourceManager.getImage(uri, onload, onerror);
    };

    /**
     * @param {Xflow.TextureEntry} entry
     */
    ImgDataAdapter.prototype.setTextureEntry = function(entry) {
        this.textureEntry = entry;
        if (this.image) {
            this.textureEntry.setImage(this.image);
        }
    };

    ImgDataAdapter.prototype.notifyChanged = function(evt) {
        if (evt.type == XML3D.events.VALUE_MODIFIED) {
            var attr = evt.wrapped.attrName;
            if(attr == "src"){
                this.createImageFromURL(this.node.src);
            }
        };
    };

    ImgDataAdapter.prototype.getValue = function(cb, obj) {
        return this.image;
    };

    ImgDataAdapter.prototype.getOutputs = function() {
        var result = {};
        result['image'] = this;
        return result;
    };

    ImgDataAdapter.prototype.resolveScript = function() {
        return null;
    };

    var VideoDataAdapter = function(factory, node) {
        XML3D.data.DataAdapter.call(this, factory, node);
        this.textureEntry = null;
        this.video = null;
        this._ticking = false;
        this._boundTick = this._tick.bind(this);
        if (node.src)
            this.createVideoFromURL(node.src);
    };
    XML3D.createClass(VideoDataAdapter, XML3D.base.NodeAdapter);

    /**
     * Creates a new video object
     *
     * @param {string} url
     */
    VideoDataAdapter.prototype.createVideoFromURL = function(url) {
        var that = this;
        var uri = new XML3D.URI(url).getAbsoluteURI(this.node.ownerDocument.documentURI);
        this.video = XML3D.base.resourceManager.getVideo(uri, this.node.autoplay,
            {
                canplay : function(event, video) {
                    XML3D.util.dispatchCustomEvent(that.node, 'canplay', true, true, null);
                    that._startVideoRefresh();
                },
                ended : function(event, video) {
                    XML3D.util.dispatchCustomEvent(that.node, 'ended', true, true, null);
                },
                load : function(event, video) {
                    XML3D.util.dispatchEvent(that.node, 'load');
                },
                error : function(event, video) {
                    XML3D.util.dispatchCustomEvent(that.node, 'error', true, true, null);
                    XML3D.debug.logError("Could not load video URI="+video.src);
                }
            }
        );
        if (this.textureEntry)
            this.textureEntry.setImage(this.video);
    };

    VideoDataAdapter.prototype.play = function() {
        if (this.video)
            this.video.play();
    };

    VideoDataAdapter.prototype.pause = function() {
        if (this.video)
            this.video.pause();
    };

    VideoDataAdapter.prototype._startVideoRefresh = function() {
        if (!this._ticking)
            this._tick();
    };

    VideoDataAdapter.prototype._tick = function() {
        this._ticking = true;
        window.requestAnimFrame(this._boundTick, XML3D.webgl.MAXFPS);
        // FIXME Do this only when currentTime is changed (what about webcam ?)
        if (this.textureEntry) {
            this.textureEntry.setImage(this.video);
        }
    };

    /**
     * @param {Xflow.TextureEntry} entry
     */
    VideoDataAdapter.prototype.setTextureEntry = function(entry) {
        this.textureEntry = entry;
        if (this.video) {
            this.textureEntry.setImage(this.video);
        }
    };

    VideoDataAdapter.prototype.notifyChanged = function(evt) {
        if (evt.type == XML3D.events.VALUE_MODIFIED) {
            var attr = evt.wrapped.attrName;
            if(attr == "src"){
                this.createVideoFromURL(this.node.src);
            }
        };
    };

    VideoDataAdapter.prototype.getValue = function(cb, obj) {
        return this.video;
    };

    VideoDataAdapter.prototype.getOutputs = function() {
        var result = {};
        result['video'] = this;
        return result;
    };

    /** IFrameDataAdapter **/

     var IFrameDataAdapter = function(factory, node) {
        XML3D.base.NodeAdapter.call(this, factory, node);
        this.textureEntry = null;
        this.image = null;
        this.createImageFromIFrame(node);
    };
    XML3D.createClass(IFrameDataAdapter, XML3D.base.NodeAdapter);

    /**
     * Creates a new iframe object
     *
     * @param {string} url
     */
    IFrameDataAdapter.prototype.createImageFromIFrame = function(node) {
        var canvas = document.createElement("canvas");
        canvas.width = node.getAttribute("width");
        canvas.height = node.getAttribute("height");
        canvas.complete = false;
        // canvas.addEventListener("mousemove",mouseMoved,false);
        // canvas.addEventListener("mousedown",click, false);
        document.body.appendChild(canvas);

        var newIFrame = document.createElement("iframe");
        newIFrame.id = "newIFrame";
        newIFrame.setAttribute("scrolling", "no");
        newIFrame.width = node.getAttribute("width");
        newIFrame.height = node.getAttribute("height");
        newIFrame.style.position = "absolute";
        newIFrame.style.left = (-newIFrame.width - 8) + "px";
        document.body.appendChild(newIFrame);

        newIFrame.addEventListener("load", function() {
            fireEvent();
        }, true);
        newIFrame.src = node.src;

        var that = this;

        function fireEvent() {
            var data = {
                _iframe : newIFrame,
                _canvas : canvas
            };
            var evt = document.createEvent("CustomEvent");
            evt.initCustomEvent("XML3D_XML3DINIT", true, false, data);
            document.dispatchEvent(evt);

            data._canvas.complete = true;
            if (that.textureEntry) {
                that.textureEntry.setImage(canvas);
            }
        }
        ;

        // function mouseMoved () {
        // console.log("mouse moved!");
        // };

        // function click () {
        // console.log("click!");
        // }

        this.image = canvas;
    };

    /**
     * @param {Xflow.TextureEntry} entry
     */
    IFrameDataAdapter.prototype.setTextureEntry = function(entry) {
        this.textureEntry = entry;
        if (this.image) {
            this.textureEntry.setImage(this.image);
        }
    };

    // Export
    XML3D.data.IFrameDataAdapter = IFrameDataAdapter;
    XML3D.data.ImgDataAdapter = ImgDataAdapter;
    XML3D.data.VideoDataAdapter = VideoDataAdapter;

}());// data/factory.js
(function() {
    "use strict";

    /**
     * Class XML3D.webgl.XML3DDataAdapterFactory
     * extends: XML3D.base.AdapterFactory
     *
     * XML3DDataAdapterFactory creates DataAdapter instances for elements using generic data (<mesh>, <data>, <float>,...).
     * Additionally, it manages all DataAdapter instances so that for each node there is always just one DataAdapter. When
     * it creates a DataAdapter, it calls its init method. Currently, the following elements are supported:
     *
     * <ul>
     *      <li>mesh</li>
     *      <li>shader</li>
     *      <li>lightshader</li>
     *      <li>float</li>
     *      <li>float2</li>
     *      <li>float3</li>
     *      <li>float4</li>
     *      <li>int</li>
     *      <li>bool</li>
     *      <li>texture</li>
     *      <li>data</li>
     * </ul>
     *
     * @author Kristian Sons
     * @author Benjamin Friedrich
     *
     * @version  10/2010  1.0
     */

    /**
     * Constructor of XML3DDataAdapterFactory
     *
     * @constructor
     * @implements {XML3D.base.IFactory}
     * @extends XML3D.base.AdapterFactory
     *
     * @param {XML3D.webgl.CanvasHandler} handler
     */
    var XML3DDataAdapterFactory = function()
    {
        XML3D.base.NodeAdapterFactory.call(this, XML3D.data);
    };
    XML3D.createClass(XML3DDataAdapterFactory, XML3D.base.NodeAdapterFactory);
    XML3DDataAdapterFactory.prototype.aspect = XML3D.data;

    var data = XML3D.data, reg = {};

    reg['mesh']        = data.SinkDataAdapter;
    reg['shader']      = data.SinkDataAdapter;
    reg['lightshader'] = data.SinkDataAdapter;
    reg['float']       = data.ValueDataAdapter;
    reg['float2']      = data.ValueDataAdapter;
    reg['float3']      = data.ValueDataAdapter;
    reg['float4']      = data.ValueDataAdapter;
    reg['float4x4']    = data.ValueDataAdapter;
    reg['int']         = data.ValueDataAdapter;
    reg['int4']        = data.ValueDataAdapter;
    reg['bool']        = data.ValueDataAdapter;
    reg['byte']        = data.ValueDataAdapter;
    reg['ubyte']        = data.ValueDataAdapter;
    reg['img']         = data.ImgDataAdapter;
    reg['texture']     = data.TextureDataAdapter;
    reg['data']        = data.DataAdapter;
    reg['proto']       = data.DataAdapter;
    reg['iframe']      = data.IFrameDataAdapter;
    reg['video']       = data.VideoDataAdapter;

   /**
     * Creates a DataAdapter associated with the given node.
     *
     * @param node
     *            element node which uses generic data. The supported elements
     *            are listed in the class description above.
     * @returns DataAdapter instance
     */
    XML3DDataAdapterFactory.prototype.createAdapter = function(node)
    {
        //XML3D.debug.logDebug("Creating adapter: " + node.localName);
        var adapterContructor = reg[node.localName];
        if(adapterContructor !== undefined) {
            return new adapterContructor(this, node);
        }
        XML3D.debug.logWarning("Not supported as data element: " + node.localName);
        return null;
    };

    // Export
    XML3D.data.XML3DDataAdapterFactory = XML3DDataAdapterFactory;
    XML3D.base.xml3dFormatHandler.registerFactoryClass(XML3DDataAdapterFactory);
}());// data/adapter/json/factory.js
(function() {

    var XML3DJSONFormatHandler = function() {
        XML3D.base.JSONFormatHandler.call(this);
    }
    XML3D.createClass(XML3DJSONFormatHandler, XML3D.base.JSONFormatHandler);

    XML3DJSONFormatHandler.prototype.isFormatSupported = function(response, responseType, mimetype) {
        return mimetype === "application/json" && response.format == "xml3d-json" && response.version == "0.4.0";
    }

    var xml3dJsonFormatHandler = new XML3DJSONFormatHandler();
    XML3D.base.registerFormat(xml3dJsonFormatHandler);


    var empty = function() {};

    var TYPED_ARRAY_MAP = {
        "int" : Int32Array,
        "int4" : Int32Array,
        "float" : Float32Array,
        "float2" : Float32Array,
        "float3" : Float32Array,
        "float4" : Float32Array,
        "float4x4" : Float32Array,
        "bool" : Uint8Array,
        "byte" : Int8Array,
        "ubyte" : Uint8Array
    };

    var isLittleEndian = (function () {
        var buf = new ArrayBuffer(4);
        var dv = new DataView(buf);
        var view = new Int32Array(buf);
        view[0] = 0x01020304;
        var littleEndian = (dv.getInt32(0, true) === 0x01020304);
        return function () { return littleEndian; }
    })();

    function realTypeOf(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
    }

    function createXflowValue(dataNode, dataType, name, key, value) {
        var v = new (TYPED_ARRAY_MAP[dataType])(value);
        var type = XML3D.data.BUFFER_TYPE_TABLE[dataType];
        var buffer = new Xflow.BufferEntry(type, v);

        var inputNode = XML3D.data.xflowGraph.createInputNode();
        inputNode.data = buffer;
        inputNode.name = name;
        inputNode.key = key;
        dataNode.appendChild(inputNode);
    }

    function createXflowValueFromBuffer(dataNode, dataType, name, key, arrayBuffer, byteOffset, byteLength) {
        var ArrayType = TYPED_ARRAY_MAP[dataType];
        var v = new (ArrayType)(arrayBuffer, byteOffset, byteLength/ArrayType.BYTES_PER_ELEMENT);
        var type = XML3D.data.BUFFER_TYPE_TABLE[dataType];
        var buffer = new Xflow.BufferEntry(type, v);

        var inputNode = XML3D.data.xflowGraph.createInputNode();
        inputNode.data = buffer;
        inputNode.name = name;
        inputNode.key = key;
        dataNode.appendChild(inputNode);
    }

    function createXflowInputs(dataNode, name, jsonData){
        var v = null;

        if (!TYPED_ARRAY_MAP[jsonData.type])
            return;

        for(var i = 0; i < jsonData.seq.length; ++i) {
            var entry = jsonData.seq[i];
            var value = entry.value;
            var key = entry.key;

            if (realTypeOf(value) === 'Object' && value.url) {
                if (!isLittleEndian()) {
                    // FIXME add big-endian -> little-endian conversion
                    throw new Error("Big-endian binary data are not supported yet");
                }
                XML3D.base.resourceManager.loadData(value.url, function (arrayBuffer) {
                    createXflowValueFromBuffer(dataNode, jsonData.type, name, key, arrayBuffer, value.byteOffset, value.byteLength);
                }, null);
            } else {
                createXflowValue(dataNode, jsonData.type, name, key, value);
            }
        }
    }

    function createXflowNode(jsonData){
        if (jsonData.format != "xml3d-json")
            throw new Error("Unknown JSON format: " + jsonData.format);
        if (jsonData.version != "0.4.0")
            throw new Error("Unknown JSON version: " + jsonData.version);

        var node = XML3D.data.xflowGraph.createDataNode();

        var entries = jsonData.data;
        for(var name in entries) {
            createXflowInputs(node, name, entries[name]);
        }
        return node;
    }

    /**
     * @implements IDataAdapter
     */
    var JSONDataAdapter = function(jsonData) {
        this.json = jsonData;
        try{
            this.xflowDataNode = createXflowNode(jsonData);
        } catch (e) {
            XML3D.debug.logException(e, "Failed to process XML3D json file");
        }

    };

    JSONDataAdapter.prototype.getXflowNode = function(){
        return this.xflowDataNode;
    }

    /**
     * @constructor
     * @implements {XML3D.base.IFactory}
     */
    var JSONFactory = function()
    {
        XML3D.base.AdapterFactory.call(this, XML3D.data);
    };
    XML3D.createClass(JSONFactory, XML3D.base.AdapterFactory);


    JSONFactory.prototype.aspect = XML3D.data;

    JSONFactory.prototype.createAdapter = function(data) {
        return new JSONDataAdapter(data);
    }

    xml3dJsonFormatHandler.registerFactoryClass(JSONFactory);
}());
// data/adapter/binary/factory.js
(function() {

    var empty = function() {};

    var TYPED_ARRAY_MAP = {
        "int" : Int32Array,
        "int4" : Int32Array,
        "float" : Float32Array,
        "float2" : Float32Array,
        "float3" : Float32Array,
        "float4" : Float32Array,
        "float4x4" : Float32Array,
        "bool" : Uint8Array,
        "byte" : Int8Array,
        "ubyte" : Uint8Array
    };

    function createXflowInput(dataNode, name, type, data) {
        var v = null;

        if (!TYPED_ARRAY_MAP[type])
            return;

        var v = new (TYPED_ARRAY_MAP[type])(data);
        var type = XML3D.data.BUFFER_TYPE_TABLE[type];
        var buffer = new Xflow.BufferEntry(type, v);

        var inputNode = XML3D.data.xflowGraph.createInputNode();
        inputNode.data = buffer;
        inputNode.name = name;
        dataNode.appendChild(inputNode);
    }

    function createXflowNode(data) {
        if (!data instanceof ArrayBuffer && !data instanceof ArrayBufferView)
            throw new Error("Unknown binary type: " + typeof data);

        var node = XML3D.data.xflowGraph.createDataNode();
        createXflowInput(node, "data", "ubyte", data);
        return node;
    }

    /**
     * @implements IDataAdapter
     */
    var BinaryDataAdapter = function(data) {
        this.data = data;
        try {
            this.xflowDataNode = createXflowNode(data);
        } catch (e) {
            XML3D.debug.logException(e, "Failed to process binary file");
        }
    };

    BinaryDataAdapter.prototype.getXflowNode = function(){
        return this.xflowDataNode;
    }

    /**
     * @constructor
     * @implements {XML3D.base.IFactory}
     */
    var BinaryFactory = function()
    {
        XML3D.base.AdapterFactory.call(this, XML3D.data,
            ["application/octet-stream", "text/plain; charset=x-user-defined"]);
    };

    XML3D.createClass(BinaryFactory, XML3D.base.AdapterFactory);

    BinaryFactory.prototype.createAdapter = function(data) {
        return new BinaryDataAdapter(data);
    }

    var binaryFactoryInstance = new BinaryFactory();
}());
XML3D.webgl = {
    toString: function () {
        return "webgl";
    },
    supported: (function() {
        var canvas = document.createElement("canvas");

        return function () {
            try {
                return !!(window.WebGLRenderingContext && (canvas.getContext('experimental-webgl')));
            } catch (e) {
                return false;
            }
        };
    }()),
    MAX_PICK_BUFFER_DIMENSION : 512
};

/**
 *
 * @constructor
 * @param {XML3D.webgl.Renderer} renderer
 */
XML3D.webgl.DataChangeListener = function(renderer) {
    this.requestRedraw = renderer.requestRedraw;
    Xflow.DataChangeNotifier.addListener(this.dataEntryChanged);
};

/**
 *
 * @param {Xflow.DataEntry} entry
 * @param {Xflow.DATA_ENTRY_STATE} notification
 */
XML3D.webgl.DataChangeListener.prototype.dataEntryChanged = function(entry, notification) {
    if(entry.userData.webglData){
        for(var i in entry.userData.webglData){
            entry.userData.webglData[i].changed = notification;
        }
    }

    //TODO: Decide if we need a picking buffer redraw too
    //this.requestRedraw("Data changed", false);
};

XML3D.webgl.getXflowEntryWebGlData = function(entry, canvasId){
    if(!entry) return null;
    if(!entry.userData.webglData)
        entry.userData.webglData = {};
    if(!entry.userData.webglData[canvasId])
        entry.userData.webglData[canvasId] = {
            changed : Xflow.DATA_ENTRY_STATE.CHANGED_NEW
        };
    return entry.userData.webglData[canvasId];
}// Create global symbol XML3D.webgl
XML3D.webgl.MAXFPS = 30;

(function() {

    var CONTEXT_OPTIONS = {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        stencil: true,
        preserveDrawingBuffer: true
    };

    /**
     *
     * @param {Element|Array.<Element>} xml3ds
     */
    XML3D.webgl.configure = function(xml3ds) {

        if(!(xml3ds instanceof Array))
            xml3ds = [xml3ds];

        var handlers = {};
        for(var i in xml3ds) {
            // Creates a HTML <canvas> using the style of the <xml3d> Element
            var canvas = XML3D.webgl.createCanvas(xml3ds[i], i);
            // Creates the CanvasHandler for the <canvas>  Element
            var canvasHandler = new XML3D.webgl.CanvasHandler(canvas, xml3ds[i]);
            handlers[i] = canvasHandler;
            window.requestAnimFrame(canvasHandler.tick, XML3D.webgl.MAXFPS);
        }
    };

    var globalCanvasId = 0;

    XML3D.webgl.handlers = [];

    // Events
    XML3D.webgl.events =  {
        available : []
    };

    /**
     * CanvasHandler class.
     * Registers and handles the events that happen on the canvas element.
     * This includes context lost events.
     *
     * @param {HTMLCanvasElement} canvas
     *            the HTML Canvas element that this handler will be responsible
     *            for
     * @param xml3dElem
     *            the root xml3d node, containing the XML3D scene structure
     */
    function CanvasHandler(canvas, xml3dElem) {
        this.canvas = canvas;
        this.xml3dElem = xml3dElem;

        this.id = ++globalCanvasId; // global canvas id starts at 1
        XML3D.webgl.handlers[this.id] = this;

        this._pickingDisabled = false;
        this.lastPickObj = null;
        this.timeNow = Date.now() / 1000.0;

        this.lastKnownDimensions = {width : canvas.width, height : canvas.height};

        var context = this.getContextForCanvas(canvas);
        if (context) {
            this.initialize(context);
        }

    }

    /**
     *
     * @param {HTMLCanvasElement!} canvas
     */
    CanvasHandler.prototype.getContextForCanvas = function(canvas) {
        try {
            return canvas.getContext('experimental-webgl', CONTEXT_OPTIONS);
        } catch (e) {
            return null;
        }
    }

    /**
     *
     * @param {WebGLRenderingContext!} renderingContext
     */
    CanvasHandler.prototype.initialize = function(renderingContext) {
        // Register listeners on canvas
        this.registerCanvasListeners();

        // This function is called at regular intervals by requestAnimFrame to
        // determine if a redraw
        // is needed
        var that = this;
        this.tick = function() {

            XML3D.updateXflowObserver();

            if (that.canvasSizeChanged() || that.renderer.needsRedraw()) {
                that.dispatchUpdateEvent();
                that.draw();
            }

            window.requestAnimFrame(that.tick, XML3D.webgl.MAXFPS);
        };

        var context = new XML3D.webgl.GLContext(renderingContext, this.id, this.canvas.clientWidth, this.canvas.clientHeight);
        var scene = new XML3D.webgl.GLScene(context);
        var factory = XML3D.base.xml3dFormatHandler.getFactory(XML3D.webgl, this.id);
        factory.setScene(scene);
        // Create renderer
        /** @type XML3D.webgl.IRenderer */
        this.renderer = XML3D.webgl.rendererFactory.createRenderer(context, scene, this.canvas);
        factory.setRenderer(this.renderer);

        var xml3dAdapter = factory.getAdapter(this.xml3dElem);
        xml3dAdapter.traverse(function(){});

        scene.rootNode.setVisible(true);


    }

    /*
    CanvasHandler.prototype.redraw = function(reason, forcePickingRedraw) {
        //XML3D.debug.logDebug("Request redraw:", reason);
        forcePickingRedraw = (forcePickingRedraw === undefined) ? true : forcePickingRedraw;
        if (this.needDraw !== undefined) {
            this.needDraw = true;
            this.needPickingDraw = this.needPickingDraw || forcePickingRedraw;
        } else {
            // This is a callback from a texture, don't need to redraw the
            // picking buffers
            handler.needDraw = true;
        }
    };   */

    /**
     * Binds the picking buffer and passes the request for a picking pass to the
     * renderer
     *
     * @param {number} canvasX
     * @param {number} canvasY
     * @return {Drawable|null} newly picked object
     */
    CanvasHandler.prototype.getPickObjectByPoint = function(canvasX, canvasY) {
        if (this._pickingDisabled)
            return null;
        return this.renderer.getRenderObjectFromPickingBuffer(canvasX, canvasY);
    };

    /**
     * @param {number} canvasX
     * @param {number} canvasY
     * @return {vec3|null} The world space normal on the object's surface at the given coordinates
     */
    CanvasHandler.prototype.getWorldSpaceNormalByPoint = function(canvasX, canvasY) {
        return this.renderer.getWorldSpaceNormalByPoint(canvasX, canvasY);
    };

    /**
     * @param {number} canvasX
     * @param {number} canvasY
     * @return {vec3|null} The world space position on the object's surface at the given coordinates
     */
    CanvasHandler.prototype.getWorldSpacePositionByPoint = function(canvasX, canvasY) {
	    return this.renderer.getWorldSpacePositionByPoint(canvasX, canvasY);
    };

    CanvasHandler.prototype.canvasSizeChanged = function() {
        var canvas = this.canvas;
        if (canvas.clientWidth !== this.lastKnownDimensions.width ||
            canvas.clientHeight !== this.lastKnownDimensions.height) {

            this.lastKnownDimensions.width = canvas.width = canvas.clientWidth;
            this.lastKnownDimensions.height = canvas.height = canvas.clientHeight;
            this.renderer.handleResizeEvent(canvas.width, canvas.height);
            return true;
        }
        return false;
    };

    /**
     * The update event can be used by user to sync actions
     * with rendering
     */
    CanvasHandler.prototype.dispatchUpdateEvent = function() {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('update', true, true, null);
        this.xml3dElem.dispatchEvent(event);
    };

    /**
     * Called by tick() to redraw the scene if needed
     */
    CanvasHandler.prototype.draw = function() {
        try {
            var start = Date.now();

            var stats = this.renderer.renderToCanvas();
            var end = Date.now();
            this.dispatchFrameDrawnEvent(start, end, stats);

        } catch (e) {
            XML3D.debug.logException(e);
        }

    };


    CanvasHandler.prototype.registerCanvasListeners = function() {
        var handler = this;

        XML3D.webgl.events.available.forEach( function(name) {
            handler.canvas.addEventListener(name, function(e) {
                handler[name] && handler[name].call(handler, e);
                e.stopPropagation();
            });
        });

        // Block the right-click context menu on the canvas unless it's explicitly toggled
        var cm = this.xml3dElem.getAttribute("contextmenu");
        if (!cm || cm == "false") {
            this.canvas.addEventListener("contextmenu", function(e) {XML3D.webgl.stopEvent(e);}, false);
        }
    };


    /**
     * Dispatches a FrameDrawnEvent to listeners
     *
     * @param start
     * @param end
     * @param stats
     * @return
     */
    CanvasHandler.prototype.dispatchFrameDrawnEvent = function(start, end, stats) {
        stats = stats || {
            count: {
                primitives: 0,
                objects: 0
            }
        };

        var event = document.createEvent('CustomEvent');

        var data = {
                timeStart : start,
                timeEnd : end,
                renderTimeInMilliseconds : end - start,
                count : stats.count
        };
        event.initCustomEvent('framedrawn', true, true, data);

        this.xml3dElem.dispatchEvent(event);
    };

    // Destroys the renderer associated with this Handler
    CanvasHandler.prototype.shutdown = function(scene) {
        if (this.renderer) {
            this.renderer.dispose();
        }
    };

    XML3D.webgl.CanvasHandler = CanvasHandler;
})();

XML3D.webgl.createCanvas = function(xml3dElement, index) {

    var parent = xml3dElement.parentNode;
    // Place xml3dElement inside an invisble div
    var hideDiv = parent.ownerDocument.createElement('div');
    hideDiv.style.display = "none";
    parent.insertBefore(hideDiv, xml3dElement);
    hideDiv.appendChild(xml3dElement);

    // Create canvas and append it where the xml3d element was before
    var canvas = xml3dElement._configured.canvas;
    parent.insertBefore(canvas, hideDiv);

    var style = canvas.ownerDocument.defaultView.getComputedStyle(xml3dElement);
    if (!canvas.style.backgroundColor) {
        var bgcolor = style.getPropertyValue("background-color");
        if (bgcolor && bgcolor != "transparent")
            canvas.style.backgroundColor = bgcolor;
    }
    // Need to be set for correct canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    return canvas;
};


XML3D.webgl.stopEvent = function(ev) {
    if (ev.preventDefault)
        ev.preventDefault();
    if (ev.stopPropagation)
        ev.stopPropagation();
    ev.returnValue = false;
};
(function () {

    var module = XML3D.webgl;

    if (!('ontouchstart' in window)) {
        XML3D.extend(module.CanvasHandler.prototype, {
            hasTouchEvents:function () {
                return false;
            }
        });
        return;
    }

    module.events.available.push("touchstart", "touchmove", "touchend", "touchcancel");

    XML3D.extend(module.CanvasHandler.prototype, {

        hasTouchEvents:function () {
            return true;
        },

        copyTouchEvent:function (event, options) {
            var touchEventData = this.copyTouchEventData(event, options);
            var touchEvent = this.createTouchEvent(touchEventData);
            return touchEvent;
        },


        copyTouchEventData:function (event, options) {
            var touchEventData = {
                type:options.type || event.type,
                timeStamp:Date.now(),
                bubbles:event.bubbles,
                cancelable:event.cancelable,
                detail:event.detail,
                screenX:event.screenX,
                screenY:event.screenY,
                pageX:event.pageX,
                pageY:event.pageY,
                clientX:event.clientX,
                clientY:event.clientY,
                ctrlKey:event.ctrlKey,
                altKey:event.altKey,
                shiftKey:event.shiftKey,
                metaKey:event.metaKey,
                scale:event.scale,
                rotation:event.rotation,
                view:event.view,
                touches:event.touches,
                changedTouches:event.changedTouches,
                targetTouches:event.targetTouches
            };
            return touchEventData;
        },

        createTouchEvent:function (data) {
            var touchEvent;

            try {
                touchEvent = document.createEvent('TouchEvent');
            } catch (e) {
                XML3D.debug.logWarning("Create Touch Event failed, creating UI instead");
                touchEvent = document.createEvent('UIEvent');
            }

            if (touchEvent && touchEvent.initTouchEvent) {
                if (touchEvent.initTouchEvent.length == 0) { //chrome
                    touchEvent.initTouchEvent(data.touches, data.targetTouches, data.changedTouches,
                        data.type, data.view, data.screenX, data.screenY, data.clientX, data.clientY);
                } else if ( touchEvent.initTouchEvent.length == 12 ) { //firefox
                    touchEvent.initTouchEvent(data.type, data.bubbles, data.cancelable, data.view,
                        data.detail, data.ctrlKey, data.altKey, data.shiftKey, data.metaKey, data.touches,
                        data.targetTouches,	data.changedTouches);
                } else { //iOS length = 18
                    touchEvent.initTouchEvent(data.type, data.bubbles, data.cancelable, data.view,
                        data.detail, data.screenX, data.screenY, data.pageX, data.pageY, data.ctrlKey,
                        data.altKey, data.shiftKey, data.metaKey, data.touches, data.targetTouches,
                        data.changedTouches, data.scale, data.rotation);
                }
            }
            return touchEvent;
        },

        /**
         * @param {TouchEvent} evt
         * @param {object?} opt
         */
        dispatchTouchEventOnPickedObject:function (evt, opt) {
            opt = opt || {};
            var touchEvent = this.copyTouchEvent(evt, opt);
            touchEvent.preventDefault = function () { evt.preventDefault(); }
            this.xml3dElem.dispatchEvent(touchEvent);
        },

        touchstart:function (evt) {
            this.dispatchTouchEventOnPickedObject(evt);
        },

        touchend:function (evt) {
            this.dispatchTouchEventOnPickedObject(evt);
        },

        touchmove:function (evt) {
            this.dispatchTouchEventOnPickedObject(evt);
        },

        touchcancel:function (evt) {
            this.dispatchTouchEventOnPickedObject(evt);
        }

    });


}());(function () {

    var module = XML3D.webgl;

    module.events.available.push("click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout", "mousewheel");

    XML3D.extend(module.CanvasHandler.prototype, {
        /**
         * @param {MouseEvent} event  The original event
         * @param {Element} target  target to dispatch on
         * @param {object}     opt    Options
         */
        dispatchMouseEvent:function (event, target, opt) {
            opt = opt || {};
            target = target || this.xml3dElem;
            var x = opt.x !== undefined ? opt.x : event.clientX;
            var y = opt.y !== undefined ? opt.y : event.clientY;
            var noCopy = opt.noCopy || false;

            // Copy event to avoid DOM dispatch errors (cannot dispatch event more
            // than once)
            event = noCopy ? event : this.copyMouseEvent(event);
            this.initExtendedMouseEvent(event, x, y);

            target.dispatchEvent(event);
        },

        /**
         * @param {MouseEvent} event the event to copy
         * @return {MouseEvent} the new event
         */
        copyMouseEvent:function (event) {
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent(event.type,
                // canBubble, cancelable, view, detail
                event.bubbles, event.cancelable, event.view, event.detail,
                // screenX, screenY, clientX, clientY
                event.screenX, event.screenY, event.clientX, event.clientY,
                // ctrl, alt, shift, meta, button
                event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.button,
                // relatedTarget
                event.relatedTarget);
            if (event.dataTransfer)
                evt.data = {url:event.dataTransfer.getData("URL"), text:event.dataTransfer.getData("Text")};
            // override preventDefault to actually prevent the default of the original event
            evt.preventDefault = function(){
                event.preventDefault();
            };
            return evt;
        },

        createMouseEvent:function (type, opts) {
            opts = opts || {};
            var event = document.createEvent("MouseEvents");
            event.initMouseEvent(type,
                opts.canBubble !== undefined ? opts.canBubble : true,
                opts.cancelable !== undefined ? opts.cancelable : true,
                opts.view || window,
                opts.detail != undefined ? opts.detail : 0,
                opts.screenX != undefined ? opts.screenX : 0,
                opts.screenY != undefined ? opts.screenY : 0,
                opts.clientX != undefined ? opts.clientX : 0,
                opts.clientY != undefined ? opts.clientY : 0,
                opts.ctrl != undefined ? opts.ctrl : false,
                opts.alt != undefined ? opts.alt : false,
                opts.shift != undefined ? opts.shift : false,
                opts.meta != undefined ? opts.meta : false,
                opts.button != undefined ? opts.button : 0,
                opts.relatedTarget);
            return event;
        },

        /**
         * Adds position and normal attributes to the given event.
         *
         * @param {Event} event
         * @param {number} x
         * @param {number} y
         * @return {XML3DVec3}
         */
        initExtendedMouseEvent:function (event, x, y) {

            var handler = this;
            var xml3dElem = this.xml3dElem;

            (function () {
                var cachedPosition = undefined;
                var cachedNormal = undefined;

                event.__defineGetter__("normal", function () {
                    if (cachedNormal !== undefined) return cachedNormal;
                    var norm = (handler.getWorldSpaceNormalByPoint(x, y));
                    cachedNormal = norm ? new window.XML3DVec3(norm[0], norm[1], norm[2]) : null;
                    return cachedNormal;
                });
                event.__defineGetter__("position", function () {
                    if (!cachedPosition) {
                        var pos = handler.getWorldSpacePositionByPoint(x, y);
                        cachedPosition = pos ? new window.XML3DVec3(pos[0], pos[1], pos[2]) : null;
                    }
                    return cachedPosition;
                });

            })();


        },

        setMouseMovePicking:function (isEnabled) {
        },

        /**
         * @param {MouseEvent} evt
         * @param {object?} opt
         */
        dispatchMouseEventOnPickedObject:function (evt, opt) {
            opt = opt || {};
            var pos = this.getMousePosition(evt);

            var picked = null;
            if (!opt.omitUpdate)
                picked = this.getPickObjectByPoint(pos.x, pos.y);

            this.dispatchMouseEvent(evt, picked && picked.node, pos);
        },

        getMousePosition:function (evt) {
            var rct = this.canvas.getBoundingClientRect();
            return {
                x:(evt.clientX - rct.left),
                y:(evt.clientY - rct.top)
            };
        },


        /**
         * @param {MouseEvent} evt
         */
        mouseup:function (evt) {
            this.dispatchMouseEventOnPickedObject(evt);
        },

        /**
         * @param {MouseEvent} evt
         */
        mousedown:function (evt) {
            this.dispatchMouseEventOnPickedObject(evt);
        },


        /**
         * @param {MouseEvent} evt
         */
        click:function (evt) {
            // Click follows always 'mouseup' => no update of pick object needed
            this.dispatchMouseEventOnPickedObject(evt, { omitUpdate:true });
        },

        /**
         * @param {MouseEvent} evt
         */
        dblclick:function (evt) {
            // Click follows always 'mouseup' => no update of pick object needed
            this.dispatchMouseEventOnPickedObject(evt, { omitUpdate:true });
        },

        /**
         * This method is called each time a mouseMove event is triggered on the
         * canvas.
         *
         * This method also triggers mouseover and mouseout events of objects in the
         * scene.
         *
         * @param {MouseEvent} evt
         */
        mousemove:function (evt) {
            var pos = this.getMousePosition(evt);
            this.dispatchMouseEventOnPickedObject(evt);
            var curObj = this.renderer.pickedObject ? this.renderer.pickedObject.node : null;

            // trigger mouseover and mouseout
            if (curObj !== this.lastPickObj) {
                if (this.lastPickObj) {
                    // The mouse has left the last object
                    this.dispatchMouseEvent(this.createMouseEvent("mouseout", {
                        clientX:pos.x,
                        clientY:pos.y,
                        button:evt.button
                    }), this.lastPickObj);
                    if (!curObj) { // Nothing picked, this means we enter the xml3d canvas
                        this.dispatchMouseEvent(this.createMouseEvent("mouseover", {
                            clientX:pos.x,
                            clientY:pos.y,
                            button:evt.button
                        }), this.xml3dElem);
                    }
                }
                if (curObj) {
                    // The mouse is now over a different object, so call the new
                    // object's mouseover method
                    this.dispatchMouseEvent(this.createMouseEvent("mouseover", {
                        clientX:pos.x,
                        clientY:pos.y,
                        button:evt.button
                    }), curObj);
                    if (!this.lastPickObj) { // Nothing was picked before, this means we leave the xml3d canvas
                        this.dispatchMouseEvent(this.createMouseEvent("mouseout", {
                            clientX:pos.x,
                            clientY:pos.y,
                            button:evt.button
                        }), this.xml3dElem);
                    }
                }

                this.lastPickObj = curObj;
            }
        },

        /**
         * @param {MouseEvent} evt
         */
        mouseout:function (evt) {
            var pos = this.getMousePosition(evt);
            this.dispatchMouseEvent(evt, this.lastPickObj, pos);
        },

        /**
         * @param {MouseEvent} evt
         */
        mouseover:function (evt) {
            var pos = this.getMousePosition(evt);
            this.dispatchMouseEventOnPickedObject(evt);
        },

        /**
         * @param {MouseEvent} evt
         */
        mousewheel:function (evt) {
            var pos = this.getMousePosition(evt);
            // note: mousewheel type is not W3C standard, used in WebKit!
            this.dispatchMouseEventOnPickedObject(evt);
        }

    });

}());// Utility functions
(function(webgl) {

    webgl.checkError = function(gl, text)
    {
        var error = gl.getError();
        if (error !== gl.NO_ERROR) {
            var textErr = ""+error;
            switch (error) {
            case 1280: textErr = "1280 ( GL_INVALID_ENUM )"; break;
            case 1281: textErr = "1281 ( GL_INVALID_VALUE )"; break;
            case 1282: textErr = "1282 ( GL_INVALID_OPERATION )"; break;
            case 1283: textErr = "1283 ( GL_STACK_OVERFLOW )"; break;
            case 1284: textErr = "1284 ( GL_STACK_UNDERFLOW )"; break;
            case 1285: textErr = "1285 ( GL_OUT_OF_MEMORY )"; break;
            }
            var msg = "GL error " + textErr + " occured.";
            if (text !== undefined)
                msg += " " + text;
            XML3D.debug.trace(msg);
        }
    };

    /**
     * Calculate bounding box from psoitions and optional indices
     * TODO: Remove FloatArray creation
     * @param {Float32Array} positions
     * @param {Int16Array|null} index
     * @returns {Float32Array}
     */
    webgl.calculateBoundingBox = function(positions, index) {
        var bbox = new XML3D.math.bbox.create();

        if (!positions || positions.length < 3)
            return bbox;

        if (index) {
            var i0 = index[0]*3;
            bbox[0] = positions[i0];
            bbox[1] = positions[i0 + 1];
            bbox[2] = positions[i0 + 2];
            bbox[3] = positions[i0];
            bbox[4] = positions[i0 + 1];
            bbox[5] = positions[i0 + 2];

            for ( var i = 1; i < index.length; i++) {
                var i1 = index[i] * 3;
                var p1 = positions[i1];
                var p2 = positions[i1 + 1];
                var p3 = positions[i1 + 2];

                if (p1 < bbox[0])
                    bbox[0] = p1;
                if (p2 < bbox[1])
                    bbox[1] = p2;
                if (p3 < bbox[2])
                    bbox[2] = p3;
                if (p1 > bbox[3])
                    bbox[3] = p1;
                if (p2 > bbox[4])
                    bbox[4] = p2;
                if (p3 > bbox[5])
                    bbox[5] = p3;
            }
        } else {
            bbox[0] = positions[0];
            bbox[1] = positions[1];
            bbox[2] = positions[2];
            bbox[3] = positions[0];
            bbox[4] = positions[1];
            bbox[5] = positions[2];

            for ( var i = 3; i < positions.length; i += 3) {
                if (positions[i] < bbox[0])
                    bbox[0] = positions[i];
                if (positions[i + 1] < bbox[1])
                    bbox[1] = positions[i + 1];
                if (positions[i + 2] < bbox[2])
                    bbox[2] = positions[i + 2];
                if (positions[i] > bbox[3])
                    bbox[3] = positions[i];
                if (positions[i + 1] > bbox[4])
                    bbox[4] = positions[i + 1];
                if (positions[i + 2] > bbox[5])
                    bbox[5] = positions[i + 2];
            }
        }
        return bbox;
    };

    var absMat = XML3D.math.mat4.create();

    var transformAABB = function(bbox, gmatrix) {
        if (bbox.isEmpty())
            return;

        var min = bbox.min._data;
        var max = bbox.max._data;

        var center = XML3D.math.vec3.scale(XML3D.math.vec3.create(), XML3D.math.vec3.add(XML3D.math.vec3.create(), min, max), 0.5);
        var extend = XML3D.math.vec3.scale(XML3D.math.vec3.create(), XML3D.math.vec3.subtract(XML3D.math.vec3.create(), max, min), 0.5);

        XML3D.math.mat4.copy(absMat, gmatrix);
        absMat.set([0, 0, 0, 1], 12)
        for ( var i = 0; i < 16; i++) {
            absMat[i] = Math.abs(absMat[i]);
        }

        XML3D.math.vec3.transformMat4(extend, extend, absMat);
        XML3D.math.vec3.transformMat4(center, center, gmatrix);

        XML3D.math.vec3.add(bbox.max._data, center, extend);
        XML3D.math.vec3.subtract(bbox.min._data, center, extend);
    };

    /**
     * Splits mesh data into smaller chunks. WebGL only supports 65,535 indices, meshes of greater size are
     * automatically split by this function. Supports splitting indices, positions, texcoords and colors.
     * NOTE: The dataTable parameter is modified to hold the newly split mesh data.
     *
     * @param dataTable the source data table to be split
     * @param maxIndexCount the desired chunk size
     * @return
     */
    XML3D.webgl.splitMesh = function(dataTable, maxIndexCount) {
        var verticesPerPolygon = 3;
        var colorStride = 3;
        maxIndexCount = Math.floor(maxIndexCount / 3) * 3;

        //See which data is in the supplied dataTable
        var positionSource = dataTable.position.data;
        var indexSource = dataTable.index ? dataTable.index.data : undefined;
        var normalSource = dataTable.normal ? dataTable.normal.data : undefined;
        var texcoordSource = dataTable.texcoord ? dataTable.texcoord.data : undefined;
        var colorSource = dataTable.color ? dataTable.color.data : undefined;

        var vertexStride = dataTable.position.tupleSize;
        var texcoordStride = dataTable.texcoord ? dataTable.texcoord.tupleSize : undefined;
        var currentIndexSize = indexSource.length;

        if (indexSource) {
            var boundaryList = [];

            var lastBinSize = currentIndexSize % maxIndexCount;
            var numBins = Math.ceil(currentIndexSize / maxIndexCount);
            var bins = new Array();

            //Create the bins
            for (var i = 0; i < numBins; i++) {
                bins[i] = {};
                bins[i].index = new Uint16Array(maxIndexCount);
                bins[i].index.nextFreeSlot = 0;
                bins[i].position = new Float32Array(maxIndexCount*vertexStride);

                if (normalSource)
                    bins[i].normal = new Float32Array(maxIndexCount*vertexStride);
                if (texcoordSource)
                    bins[i].texcoord = new Float32Array(maxIndexCount*texcoordStride);
                if (colorSource)
                    bins[i].color = new Float32Array(maxIndexCount*colorStride);
            }

            //Iterate over the index buffer and sort the polygons into bins
            for (var i = 0; i < indexSource.length; i += verticesPerPolygon) {
                var consistentBin = true;
                var targetBin = Math.floor(indexSource[i] / maxIndexCount);

                if (bins[targetBin].index.nextFreeSlot + verticesPerPolygon > maxIndexCount)
                    consistentBin = false;

                //See if this polygon spans more than one bin
                for (j = 1; j < verticesPerPolygon; j++) {
                    if (Math.floor(indexSource[i + j] / maxIndexCount) != targetBin) {
                        consistentBin = false;
                        break;
                    }
                }

                //We need to place this polygon in a separate pass
                if (!consistentBin) {
                    boundaryList.push(i);
                    continue;
                }

                var indexTransform = maxIndexCount * targetBin;

                //Distribute the indices and vertex data into the appropriate bin
                for (var j = 0; j < verticesPerPolygon; j++) {
                    var oldIndex = indexSource[i+j];
                    var newIndex = oldIndex - indexTransform;

                    var bin = bins[targetBin];
                    bin.index[bin.index.nextFreeSlot] = newIndex;
                    bin.index.nextFreeSlot++;

                    var vertIndex = oldIndex * vertexStride;
                    var position = [];
                    for (var k = 0; k < vertexStride; k++) {
                        position[k] = positionSource[vertIndex+k];
                    }
                    bin.position.set(position, newIndex*vertexStride);

                    if(normalSource) {
                        var normal = [];
                        for (var k = 0; k < vertexStride; k++) {
                            normal[k] = normalSource[vertIndex+k];
                        }
                        bin.normal.set(normal, newIndex*vertexStride);
                    }

                    var texIndex = oldIndex * texcoordStride;
                    if (texcoordSource) {
                        var texcoord = [];
                        for (var k = 0; k < texcoordStride; k++) {
                            texcoord[k] = texcoordSource[texIndex+k];
                        }
                        bin.texcoord.set(texcoord, newIndex*texcoordStride);
                    }

                    if(colorSource) {
                        var color = [];
                        for (var k = 0; k < colorStride; k++) {
                            color[k] = colorSource[vertIndex+k];
                        }
                        bin.color.set(color, newIndex*colorStride);
                    }

                }
            }

            //Insert boundary items into bins
            var targetBin = 0;
            for (var i = 0; i < boundaryList.length; i++) {
                while(bins[targetBin].index.nextFreeSlot + verticesPerPolygon > maxIndexCount) {
                    targetBin++;
                    if (targetBin >= bins.length) {
                        //We need to create a new bin
                        bins[targetBin] = {};
                        bins[targetBin].index = new Uint16Array(maxIndexCount);
                        bins[targetBin].index.nextFreeSlot = 0;
                        bins[targetBin].position = new Float32Array(maxIndexCount*vertexStride);

                        if (normalSource)
                            bins[targetBin].normal = new Float32Array(maxIndexCount*vertexStride);
                        if (texcoordSource)
                            bins[targetBin].texcoord = new Float32Array(maxIndexCount*texcoordStride);
                        if (colorSource)
                            bins[targetBin].color = new Float32Array(maxIndexCount*colorStride);
                        break;
                    }
                }

                //Distribute polygon into the appropriate bin
                for (var j = 0; j < verticesPerPolygon; j++) {
                    var bin = bins[targetBin];

                    var oldIndex = indexSource[boundaryList[i] + j];
                    var newIndex = bin.index.nextFreeSlot;

                    bin.index[newIndex] = newIndex;
                    bin.index.nextFreeSlot++;

                    var position = [];
                    for (var k = 0; k < vertexStride; k++) {
                        position[k] = positionSource[oldIndex*vertexStride+k];
                    }
                    bin.position.set(position, newIndex*vertexStride);

                    if(normalSource) {
                        var normal = [];
                        for (var k = 0; k < vertexStride; k++) {
                            normal[k] = normalSource[oldIndex*vertexStride+k];
                        }
                        bin.normal.set(normal, newIndex*vertexStride);
                    }

                    if (texcoordSource) {
                        var texcoord = [];
                        for (var k = 0; k < texcoordStride; k++) {
                            texcoord[k] = texcoordSource[oldIndex*texcoordStride+k];
                        }
                        bin.texcoord.set(texcoord, newIndex*texcoordStride);
                    }

                    if(colorSource) {
                        var color = [];
                        for (var k = 0; k < vertexStride; k++) {
                            color[k] = colorSource[oldIndex*colorStride+k];
                        }
                        bin.color.set(color, newIndex*colorStride);
                    }

                }
            }

            //Prepare dataTable for the split mesh data
            dataTable.index = [];
            dataTable.position = [];
            if (normalSource)
                dataTable.normal = [];
            if (texcoordSource)
                dataTable.texcoord = [];
            if (colorSource)
                dataTable.color = [];

            //Populate the dataTable with the bins
            for (var i = 0; i < bins.length; i++) {
                if (bins[i].index.nextFreeSlot > 0) {
                    dataTable.index[i] = { data : bins[i].index, tupleSize : vertexStride };
                    dataTable.position[i] = { data : bins[i].position, tupleSize : vertexStride };
                    if (normalSource)
                        dataTable.normal[i] = { data : bins[i].normal, tupleSize : vertexStride };
                    if (texcoordSource)
                        dataTable.texcoord[i] = { data : bins[i].texcoord, tupleSize : texcoordStride };
                    if (colorSource)
                        dataTable.color[i] = { data : bins[i].color, tupleSize : colorStride };
                }
            }

        }


    };

    /** for every component of v1 and v2 applies f, i.e. f(v1[.],v2[.]),
     *  and returns it.
     *
     *  @param {vec3} v1
     *  @param {vec3} v2
     *  @param {function(number, number):number} f
     *  @return {vec3} the mapped vector
     */
    function mapVec(v1, v2, f)
    {
        var vec = XML3D.math.vec3.create();
        vec[0] = f(v1[0], v2[0]);
        vec[1] = f(v1[1], v2[1]);
        vec[2] = f(v1[2], v2[2]);

        return vec;
    };

    /**
     * @param {XML3D.webgl.BoundingBox} bbox
     * @param {vec3} min
     * @param {vec3} max
     * @param {mat4} trafo
     */
    XML3D.webgl.adjustMinMax = function(bbox, min, max, trafo) {
        var xfmmin = XML3D.math.vec3.create();
        var xfmmax = XML3D.math.vec3.create();
        XML3D.math.vec3.transformMat4(xfmmin, bbox.min, trafo);
        XML3D.math.vec3.transformMat4(xfmmax, bbox.max, trafo);

        /* bounding box is axis-aligned, but through transformation
         * min and max values might be shuffled (image e.g. a rotation (0, 1, 0, 1.57),
         * here min's and max' x and z values are swapped). So we
         * order them now.
         */
        var bbmin = mapVec(xfmmin, xfmmax, Math.min);
        var bbmax = mapVec(xfmmin, xfmmax, Math.max);

        if (bbmin[0] < min[0])
            min[0] = bbmin[0];
        if (bbmin[1] < min[1])
            min[1] = bbmin[1];
        if (bbmin[2] < min[2])
            min[2] = bbmin[2];
        if (bbmax[0] > max[0])
            max[0] = bbmax[0];
        if (bbmax[1] > max[1])
            max[1] = bbmax[1];
        if (bbmax[2] > max[2])
            max[2] = bbmax[2];
    };

    /** Calculate the offset of the given element and return it.
     *
     *  @param {Object} element
     *  @return {{top:number, left:number}} the offset
     *
     *  This code is taken from http://javascript.info/tutorial/coordinates .
     *  We don't want to do it with the offsetParent way, because the xml3d
     *  element is actually invisible and thus offsetParent will return null
     *  at least in WebKit. Also it's slow. So we use getBoundingClientRect().
     *  However it returns the box relative to the window, not the document.
     *  Thus, we need to incorporate the scroll factor. And because IE is so
     *  awesome some workarounds have to be done and the code gets complicated.
     */
    function calculateOffset(element)
    {
        var box = element.getBoundingClientRect();
        var body = document.body;
        var docElem = document.documentElement;

        // get scroll factor (every browser except IE supports page offsets)
        var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
        var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

        // the document (`html` or `body`) can be shifted from left-upper corner in IE. Get the shift.
        var clientTop = docElem.clientTop || body.clientTop || 0;
        var clientLeft = docElem.clientLeft || body.clientLeft || 0;

        var top  = box.top +  scrollTop - clientTop;
        var left = box.left + scrollLeft - clientLeft;

        // for Firefox an additional rounding is sometimes required
        return {top: Math.round(top), left: Math.round(left)};
    }

    /** Convert a given mouse page position to be relative to the given target element.
     *  Most probably the page position are the MouseEvent's pageX and pageY attributes.
     *
     *  @param {!Object} xml3dEl the xml3d element to which the coords need to be translated
     *  @param {!number} pageX the x-coordinate relative to the page
     *  @param {!number} pageY the y-coordinate relative to the page
     *  @return {{x: number, y: number}} the converted coordinates
     */
    webgl.convertPageCoords = function(xml3dEl, pageX, pageY)
    {
        var off = calculateOffset(xml3dEl);

        return {x: pageX - off.left, y: pageY - off.top};
    };

    /**
     * Convert the given y-coordinate on the canvas to a y-coordinate appropriate in
     * the GL context. The y-coordinate gets turned upside-down. The lowest possible
     * canvas coordinate is 0, so we need to subtract 1 from the height, too.
     *
     * @param {HTMLCanvasElement} canvas
     * @param {number} y
     * @return {number} the converted y-coordinate
     */
    webgl.canvasToGlY = function(canvas, y) {
        return canvas.height - y - 1;
    }

    webgl.FRAGMENT_HEADER = [
        "#ifdef GL_FRAGMENT_PRECISION_HIGH",
        "precision highp float;",
        "#else",
        "precision mediump float;",
        "#endif // GL_FRAGMENT_PRECISION_HIGH",
        "\n"
    ].join("\n");

    webgl.addFragmentShaderHeader = function(fragmentShaderSource) {
        return webgl.FRAGMENT_HEADER + fragmentShaderSource;
    };

    /**
     * Set uniforms for active program
     * @param gl
     * @param u
     * @param value
     * @param {boolean=} transposed
     */
    webgl.setUniform = function(gl, u, value, transposed) {

        switch (u.glType) {
            case 35670: //gl.BOOL
            case 5124:  //gl.INT
            case 35678: //gl.SAMPLER_2D
                if (value.length !== undefined) {
                    gl.uniform1iv(u.location, value);
                } else {
                    gl.uniform1i(u.location, value);
                }
                break;

            case 35671: // gl.BOOL_VEC2
            case 35667:
                gl.uniform2iv(u.location, value);
                break; // gl.INT_VEC2

            case 35672: // gl.BOOL_VEC3
            case 35668:
                gl.uniform3iv(u.location, value);
                break; // gl.INT_VEC3

            case 35673: // gl.BOOL_VEC4
            case 35669:
                gl.uniform4iv(u.location, value);
                break; // gl.INT_VEC4

            case 5126:
                if (value.length != null)
                    gl.uniform1fv(u.location, value);
                else
                    gl.uniform1f(u.location, value);
                break; // gl.FLOAT
            case 35664:
                gl.uniform2fv(u.location, value);
                break; // gl.FLOAT_VEC2
            case 35665:
                gl.uniform3fv(u.location, value);
                break; // gl.FLOAT_VEC3
            case 35666:
                gl.uniform4fv(u.location, value);
                break; // gl.FLOAT_VEC4

            case 35674:
                gl.uniformMatrix2fv(u.location, transposed || false, value);
                break;// gl.FLOAT_MAT2
            case 35675:
                gl.uniformMatrix3fv(u.location, transposed || false, value);
                break;// gl.FLOAT_MAT3
            case 35676:
                gl.uniformMatrix4fv(u.location, transposed || false, value);
                break;// gl.FLOAT_MAT4

            default:
                XML3D.debug.logError("Unknown uniform type " + u.glType);
                break;
        }
    };

})(XML3D.webgl);
(function(webgl){

    var Pager = function() {
        /** @type Array<Float32Array> */
        this.pages = [];
        /** @type number */
        this.nextOffset = 0;
        /** @type Array<*> */
        this.freeEntries = [];
        // Add a first page
        this.addPage();
    };

    XML3D.createClass(Pager, XML3D.util.EventDispatcher, {
        addPage : function() {
            var page = new Float32Array(Pager.PAGE_SIZE);
            this.pages.push(page);
            this.nextOffset = 0;
            XML3D.debug.logInfo("adding page", this.pages.length);
        },

        getPageEntry : function(size) {
            if(!size)
                throw new Error("No size given for page entry");
            return this.reusePageEntry(size) || this.createPageEntry(size);
        },

        /**
         * @param {number} size Requested size in number of floats
         * @returns {{ page: Float32Array, offset: number, size: number }}
         */
        reusePageEntry : function(size) {
            var sameSizeEntries = this.freeEntries[size];
            if(sameSizeEntries && sameSizeEntries.length) {
                return sameSizeEntries.pop();
            }
            return null;
        },

        /**
         * @param {number} size  Size in number of floats
         * @returns {{ page: Float32Array, offset: number, size: number }}
         */
        createPageEntry : function(size) {
            if (this.nextOffset + size > Pager.PAGE_SIZE) {
                this.addPage();
                return this.getPageEntry(size);
            }
            var page = this.pages[this.pages.length-1];
            var localOffset = this.nextOffset;
            this.nextOffset += size;
            return { page: page, offset: localOffset, size: size };
        },

        /**
         *
         * @param {{ page: Float32Array, offset: number, size: number }} entryInfo
         */
        freePageEntry : function(entryInfo) {
            var sameSizeEntries = this.freeEntries[entryInfo.size];
            if(!sameSizeEntries) {
                sameSizeEntries = this.freeEntries[entryInfo.size] = [];
            }
            sameSizeEntries.push(entryInfo);
        }
    });
    Pager.PAGE_SIZE = 1<<12;

    webgl.Pager = Pager;

}(XML3D.webgl));(function() {
    /** @const */
    var WORLD_MATRIX_OFFSET = 0;

    /**
     * @constructor
     * @param {Scene} scene
     * @param {Object} pageEntry
     * @param {Object} opt
     */
    var RenderNode = function(type, scene, pageEntry, opt) {
        opt = opt || {};

        this.scene = scene;
        this.type = type;
        this.name = opt.name || "";
        this.page = pageEntry.page;
        this.offset = pageEntry.offset;
        this.entrySize = pageEntry.size;
        this.localVisible = opt.visible;
        this.visible = this.localVisible !== undefined ? this.localVisible : opt.parent ? opt.parent.isVisible() : true;
        this.transformDirty = true;
        this.children = [];
        this.setParent(opt.parent || scene.rootNode);
    };

    XML3D.extend(RenderNode.prototype, {

        getChildren: function() {
            return this.children;
        },

        getParent: function() {
            return this.parent;
        },

        setParent: function(parent) {
            this.parent = parent;
            if (parent && parent.addChild) {
                parent.addChild(this);
            }
        },
        traverse: function(callback) {
            callback(this);
            this.children.forEach(function(child){
                child.traverse(callback);
            })
        },

        getWorldMatrix: function(dest) {
            if (this.transformDirty) {
                this.parent.getWorldMatrix(dest);
                this.updateWorldMatrix(dest);
            }
            var o = this.offset + WORLD_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                dest[i] = this.page[o];
            }
        },

        setWorldMatrix: function(source) {
            var o = this.offset + WORLD_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                this.page[o] = source[i];
            }
            this.transformDirty = false;
            if (this.setBoundingBoxDirty) {
                this.setBoundingBoxDirty();
            }
        },

        isVisible: function() {
            return this.visible;
        },

        setTransformDirty: function() {
            this.transformDirty = true;
        },

        setLocalVisible: function(newVal) {
            this.localVisible = newVal;
            if (this.parent.isVisible()) {
                // if parent is not visible this group is also invisible
                this.setVisible(newVal);
            }
        },

        setVisible: function(newVal) {
            var downstream = newVal;
            if (this.localVisible === false) {
                downstream = false;
            }
            this.visible = downstream;
            this.children.forEach(function(obj) {
                obj.setVisible(downstream);
            });
        },

        remove: function() {
            this.parent.removeChild(this);
            this.scene.freePageEntry({ page: this.page, offset: this.offset, size: this.entrySize });
        }

    });

    XML3D.webgl.RenderNode = RenderNode;
})();
(function (webgl) {
    /**
     * @interface
     */
    var IRenderObject = function() {};
    IRenderObject.prototype.getModelViewMatrix = function() {};
    IRenderObject.prototype.getModelViewProjectionMatrix = function() {};
    IRenderObject.prototype.getNormalMatrix = function() {};
    IRenderObject.prototype.getObjectSpaceBoundingBox = function() {};
    IRenderObject.prototype.getWorldSpaceBoundingBox = function() {};
    IRenderObject.prototype.updateWorldSpaceMatrices = function() {};
    IRenderObject.prototype.isVisible = function() {};
    IRenderObject.prototype.setTransformDirty = function() {};
    IRenderObject.prototype.setShader = function() {};
    IRenderObject.prototype.hasTransparency = function() {};

    // Entry:
    /** @const */
    var WORLD_MATRIX_OFFSET = 0;
    /** @const */
    var OBJECT_BB_OFFSET = WORLD_MATRIX_OFFSET + 16;
    /** @const */
    var WORLD_BB_OFFSET = OBJECT_BB_OFFSET + 6;
    /** @const */
    var MODELVIEW_MATRIX_OFFSET = WORLD_BB_OFFSET + 6;
    /** @const */
    var MODELVIEWPROJECTION_MATRIX_OFFSET = MODELVIEW_MATRIX_OFFSET + 16;
    /** @const */
    var NORMAL_MATRIX_OFFSET = MODELVIEWPROJECTION_MATRIX_OFFSET + 16;
    /** @const */
    var ENTRY_SIZE = NORMAL_MATRIX_OFFSET + 16;

    //noinspection JSClosureCompilerSyntax,JSClosureCompilerSyntax
    /**
     * Represents a renderable object in the scene.
     * The RenderObject has these responsibilities:
     *  1. Keep track of the transformation hierarchy and bounding boxes
     *  2. Connect the DrawableClosure with the ShaderClosure
     *
     *  The {@link DrawableClosure} is a DrawableObject plus it's data
     *  The {@link ShaderClosure} is a ProgramObject plus it's data
     *  The concrete ShaderClosure can vary per DrawableObject and change
     *  due to scene or object changes. Thus we have to keep track of the
     *  related {@link IShaderComposer}.
     *
     * @constructor
     * @implements {IRenderObject}
     * @param {Scene} scene
     * @param {Object} pageEntry
     * @param {Object} opt
     */
    var RenderObject = function (scene, pageEntry, opt) {
        XML3D.webgl.RenderNode.call(this, webgl.Scene.NODE_TYPE.OBJECT, scene, pageEntry, opt);
        opt = opt || {};

        /**
         * Keep reference to DOM Element need e.g. for picking
         * @type {Element}
         */
        this.node = opt.node;

        /**
         * Object related data
         * @type {{data: Xflow.DataNode|null, type: string}}
         */
        this.object = opt.object || { data: null, type: "triangles" };

        /**
         * Can we rely on current WorldMatrix?
         * @type {boolean}
         */
        this.transformDirty = true;

        /**
         * Can we rely on current Bounding Boxes?
         * @type {boolean}
         */
        this.boundingBoxDirty = true;

        /**
         * The drawable closure transforms object data and type into
         * a drawable entity
         * @type {DrawableClosure}
         */
        this.drawable = this.createDrawable();

        this.shader = opt.shader || {};
        // Set start values;
        this.initialize();
    };
    RenderObject.ENTRY_SIZE = ENTRY_SIZE;

    RenderObject.IDENTITY_MATRIX = XML3D.math.mat4.create();

    XML3D.createClass(RenderObject, XML3D.webgl.RenderNode, {
        createDrawable: function () {
            var result = this.scene.createDrawable(this);
            if (result) {
                var that = this;
                result.addEventListener(webgl.Scene.EVENT_TYPE.DRAWABLE_STATE_CHANGED, function (evt) {
                    if (evt.newState === webgl.DrawableClosure.READY_STATE.COMPLETE) {
                        that.scene.moveFromQueueToReady(that);
                    }
                    else if (evt.newState === webgl.DrawableClosure.READY_STATE.INCOMPLETE &&
                        evt.oldState === webgl.DrawableClosure.READY_STATE.COMPLETE) {
                        that.scene.moveFromReadyToQueue(that);
                    }
                });
            }
            return result;
        },
        initialize: function () {
            this.setObjectSpaceBoundingBox(XML3D.math.EMPTY_BOX);

            /** {Object?} **/
            this.override = null;
        },
        setType: function(type) {
            this.object.type = type;
            // TODO: this.typeChangedEvent
        },
        getType: function() {
            return this.object.type;
        },
        getDataNode: function() {
            return this.object ? this.object.data : null;
        },

        dispose :function () {
            this.scene.remove(this);
        },

        refreshShaderProgram: function() {
            this.program = this.shader.composer.getShaderAfterStructureChanged(this.program, this.scene, this.override || {});
        },

        getModelViewMatrix: function(target) {
            var o = this.offset + MODELVIEW_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                target[i] = this.page[o];
            }
        },

        getNormalMatrix: function(target) {
            var o = this.offset + NORMAL_MATRIX_OFFSET;
            target[0] = this.page[o];
            target[1] = this.page[o+1];
            target[2] = this.page[o+2];
            target[3] = this.page[o+4];
            target[4] = this.page[o+5];
            target[5] = this.page[o+6];
            target[6] = this.page[o+8];
            target[7] = this.page[o+9];
            target[8] = this.page[o+10];
        },

        getModelViewProjectionMatrix: function(dest) {
            var o = this.offset + MODELVIEWPROJECTION_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                dest[i] = this.page[o];
            }
        },

        updateWorldSpaceMatrices: function(view, projection) {
            if (this.transformDirty) {
                this.updateWorldMatrix();
            }
            this.updateModelViewMatrix(view);
            this.updateNormalMatrix();
            this.updateModelViewProjectionMatrix(projection);
        },

        updateWorldMatrix: (function() {
            var tmp_mat = XML3D.math.mat4.create();
            return function() {
                this.parent.getWorldMatrix(tmp_mat);
                this.setWorldMatrix(tmp_mat);
                this.updateWorldSpaceBoundingBox();
                this.transformDirty = false;
            }
        })(),

        /** Relies on an up-to-date transform matrix **/
        updateModelViewMatrix: function(view) {
            if (this.transformDirty) {
                this.updateWorldMatrix();
            }
            var page = this.page;
            var offset = this.offset;
            XML3D.math.mat4.multiplyOffset(page, offset+MODELVIEW_MATRIX_OFFSET, page, offset+WORLD_MATRIX_OFFSET,  view, 0);
        },

        /** Relies on an up-to-date view matrix **/
        updateNormalMatrix: (function() {
            var c_tmpMatrix = XML3D.math.mat4.create();
            return function () {
                this.getModelViewMatrix(c_tmpMatrix);
                var normalMatrix = XML3D.math.mat4.invert(c_tmpMatrix, c_tmpMatrix);
                normalMatrix = normalMatrix ? XML3D.math.mat4.transpose(normalMatrix, normalMatrix) : RenderObject.IDENTITY_MATRIX;
                var o = this.offset + NORMAL_MATRIX_OFFSET;
                for(var i = 0; i < 16; i++, o++) {
                    this.page[o] = normalMatrix[i];
                }
            }
        })(),

        /** Relies on an up-to-date view matrix **/
        updateModelViewProjectionMatrix: function(projection) {
            var page = this.page;
            var offset = this.offset;
            XML3D.math.mat4.multiplyOffset(page, offset+MODELVIEWPROJECTION_MATRIX_OFFSET, page, offset+MODELVIEW_MATRIX_OFFSET,  projection, 0);
        },

        /*
         * @param {Xflow.Result} result
         */
        setOverride: function(result) {
            this.override = null;
            if(!result.outputNames.length) {
                return;
            }

            var prog = this.program;
            var overrides = {};
            for(var name in prog.uniforms) {
                var entry = result.getOutputData(name);
                if (entry && entry.getValue()) {
                    overrides[name] = entry.getValue();
                }
            }
            if (Object.keys(overrides).length > 0) {
                this.override = overrides;
            }
            XML3D.debug.logInfo("Shader attribute override", result, this.override);
        },

        setTransformDirty: function() {
            this.transformDirty = true;
            this.scene.requestRedraw("Transformation changed");
        },
        /**
         * @param {AdapterHandleNotification} notification
         */
        shaderHandleCallback: function(notification) {
            XML3D.debug.assert(notification.type == XML3D.events.ADAPTER_HANDLE_CHANGED);
            this.updateShaderFromHandle(notification.adapterHandle);
        },


        createProgram: function(composer, objectData) {
            this.program = composer.getShaderClosure(this.scene, objectData);
            this.setOverride(objectData);
        },

        createShaderForDrawable: function (shaderInfo, drawable) {
            var composer = this.scene.shaderFactory.createComposerForShaderInfo(shaderInfo);
            composer.addEventListener(webgl.ShaderComposerFactory.EVENT_TYPE.MATERIAL_STRUCTURE_CHANGED, this.refreshShaderProgram.bind(this));

            var that = this;
            var objectRequest = drawable.getRequest(composer.getRequestFields(), function (req, state) {
                that.createProgram(composer, req.getResult());
            });

            this.createProgram(composer, objectRequest.getResult());

            return {
                composer: composer
            }
        },

        setShader: function(newHandle) {

            // If we don't have a drawable, we don't need a shader
            // This is for testing purposes and won't occur during normal
            // run
            if(!this.drawable)
                return;

            var oldHandle = this.shader.handle;

            if(oldHandle == newHandle)
                return;

            if (oldHandle) {
                oldHandle.removeListener(this.shaderHandleCallback.bind(this));
            }
            if (newHandle) {
                newHandle.addListener(this.shaderHandleCallback.bind(this));
            }
            this.updateShaderFromHandle(newHandle);

            this.shader.handle = newHandle;
            // TODO this.materialChanged();
        },

        /**
         *
         * @param {AdapterHandle|null} handle
         */
        updateShaderFromHandle: function(handle) {
            var shaderInfo = null;

            if(handle) {
                switch (handle.status) {
                    case XML3D.base.AdapterHandle.STATUS.NOT_FOUND:
                        XML3D.debug.logWarning("Shader not found.", handle.url, this.name);
                        break;
                    case XML3D.base.AdapterHandle.STATUS.LOADING:
                        break;
                    case XML3D.base.AdapterHandle.STATUS.READY:
                        shaderInfo = handle.getAdapter().getShaderInfo();
                }
            }

            this.shader = this.createShaderForDrawable(shaderInfo, this.drawable);
            // Request the attributes required for shader from the drawable (e.g. normal, color etc)
            this.drawable.setAttributeRequest(this.shader.composer.getShaderAttributes());
        },

        setObjectSpaceBoundingBox: function(box) {
            var o = this.offset + OBJECT_BB_OFFSET;
            this.page[o] =   box[0];
            this.page[o+1] = box[1];
            this.page[o+2] = box[2];
            this.page[o+3] = box[3];
            this.page[o+4] = box[4];
            this.page[o+5] = box[5];
            this.setBoundingBoxDirty();
        },

        getObjectSpaceBoundingBox: function(box) {
            var o = this.offset + OBJECT_BB_OFFSET;
            box[0] = this.page[o];
            box[1] = this.page[o+1];
            box[2] = this.page[o+2];
            box[3] = this.page[o+3];
            box[4] = this.page[o+4];
            box[5] = this.page[o+5];
        },

        setBoundingBoxDirty: function() {
            this.boundingBoxDirty = true;
            this.parent.setBoundingBoxDirty();
        },

        setWorldSpaceBoundingBox: function(bbox) {
            var o = this.offset + WORLD_BB_OFFSET;
            this.page[o] = bbox[0];
            this.page[o+1] = bbox[1];
            this.page[o+2] = bbox[2];
            this.page[o+3] = bbox[3];
            this.page[o+4] = bbox[4];
            this.page[o+5] = bbox[5];
        },

        getWorldSpaceBoundingBox: function(bbox) {
            if (this.boundingBoxDirty) {
                this.updateWorldSpaceBoundingBox();
            }
            var o = this.offset + WORLD_BB_OFFSET;
            bbox[0] = this.page[o];
            bbox[1] = this.page[o+1];
            bbox[2] = this.page[o+2];
            bbox[3] = this.page[o+3];
            bbox[4] = this.page[o+4];
            bbox[5] = this.page[o+5];

        },

        updateWorldSpaceBoundingBox: (function() {
            var c_box = new XML3D.math.bbox.create();

            return function() {
                this.getObjectSpaceBoundingBox(c_box);
                this.setWorldSpaceBoundingBox(c_box);
                this.boundingBoxDirty = false;
            }
        })(),

        setLocalVisible: function(newVal) {
            this.localVisible = newVal;
            if (this.parent.isVisible()) {
                // if parent is not visible this group is also invisible
                this.setVisible(newVal);
                this.setBoundingBoxDirty();
            }
        },

        getProgram: function() {
            return this.shader.composer.getProgram();
        },

        hasTransparency : function() {
            return this.program ? this.program.hasTransparency() : false;
        },

        updateForRendering: function() {
            this.setShader(this.parent.getShaderHandle());
            this.drawable.update();
        }

    });


    // Export
    webgl.RenderObject = RenderObject;

}(XML3D.webgl));
(function(webgl){

    /** @const */
    var BBOX_ANNOTATION_FILTER = ["boundingBox"];

    /**
     * A RenderMesh is a RenderObject with some mesh-specific behaviors.
     * It handles all primitive types also known by GL: triangles, lines, points, etc.
     * @param {Scene} scene
     * @param {Object} pageEntry
     * @param {Object} opt
     * @constructor
     */
    var RenderMesh = function(scene, pageEntry, opt) {
        webgl.RenderObject.call(this, scene, pageEntry, opt);

        /**
         * Can we take an annotated bounding box or do we have to
         * calculate it from the drawable?
         * @type {boolean}
         */
        this.boundingBoxAnnotated = false;

        if (this.object.data) {
            // Bounding Box annotated
            this.annotatedBoundingBoxRequest = new Xflow.ComputeRequest(this.object.data, BBOX_ANNOTATION_FILTER, this.boundingBoxAnnotationChanged.bind(this));
            this.boundingBoxAnnotationChanged(this.annotatedBoundingBoxRequest);
        }
    };
    // No additional entries for RenderMeshes
    RenderMesh.ENTRY_SIZE = webgl.RenderObject.ENTRY_SIZE;


    XML3D.createClass(RenderMesh, webgl.RenderObject, {
        boundingBoxAnnotationChanged: function(request){
            var result = request.getResult();
            var bboxData = result.getOutputData(BBOX_ANNOTATION_FILTER[0]);
            if(bboxData) {
                var bboxVal = bboxData.getValue();
                this.setObjectSpaceBoundingBox(bboxVal);
                this.boundingBoxAnnotated = true;
            } else {
                this.boundingBoxAnnotated = false;
            }
            // Check for drawable only necessary for tests
            this.drawable && this.drawable.setBoundingBoxRequired(!this.boundingBoxAnnotated);
        }
    });

    // Export
    webgl.RenderMesh = RenderMesh;


}(XML3D.webgl));
(function(webgl) {
    /** @const */
    var WORLD_MATRIX_OFFSET = 0;
    /** @const */
    var LOCAL_MATRIX_OFFSET = WORLD_MATRIX_OFFSET + 16;
    /** @const */
    var WORLD_BB_OFFSET = LOCAL_MATRIX_OFFSET + 16;
    /** @const */
    var ENTRY_SIZE = WORLD_BB_OFFSET + 6;


    /**
     *
     * @constructor
     * @extends {RenderNode}
     */
    var RenderGroup = function(scene, pageEntry, opt) {
        webgl.RenderNode.call(this, webgl.Scene.NODE_TYPE.GROUP, scene, pageEntry, opt);
        opt = opt || {};
        this.shaderHandle = opt.shaderHandle || null;
        this.boundingBoxDirty = false;
        this.setWorldSpaceBoundingBox(XML3D.math.EMPTY_BOX);
    };
    RenderGroup.ENTRY_SIZE = ENTRY_SIZE;

    XML3D.createClass(RenderGroup, webgl.RenderNode);
    XML3D.extend(RenderGroup.prototype, {
        getLocalMatrix: function(dest) {
            var o = this.offset + LOCAL_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                dest[i] = this.page[o];
            }
        },

        setLocalMatrix: function(source) {
            var o = this.offset + LOCAL_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                this.page[o] = source[i];
            }
            this.setTransformDirty();
            this.setBoundingBoxDirty();
        },

        getWorldSpaceBoundingBox: function(bbox) {
            if (this.boundingBoxDirty) {
                this.updateWorldSpaceBoundingBox();
            }
            var o = this.offset + WORLD_BB_OFFSET;
            bbox[0] = this.page[o];
            bbox[1] = this.page[o+1];
            bbox[2] = this.page[o+2];
            bbox[3] = this.page[o+3];
            bbox[4] = this.page[o+4];
            bbox[5] = this.page[o+5];
        },

        setWorldSpaceBoundingBox: function(bbox) {
            var o = this.offset + WORLD_BB_OFFSET;
            this.page[o] = bbox[0];
            this.page[o+1] = bbox[1];
            this.page[o+2] = bbox[2];
            this.page[o+3] = bbox[3];
            this.page[o+4] = bbox[4];
            this.page[o+5] = bbox[5];
        },



    updateWorldSpaceBoundingBox: (function() {
            var local_mat = XML3D.math.mat4.create();
            var childBB = XML3D.math.bbox.create();

            return function() {
                var localBB = XML3D.math.bbox.create();

                for(var i = 0, j = this.children.length; i < j; i++) {
                    var obj = this.children[i];
                    if (obj.isVisible()) {
                        obj.getWorldSpaceBoundingBox(childBB);
                        XML3D.math.bbox.extendWithBox(localBB, childBB);
                    }
                }

                this.getLocalMatrix(local_mat);
                XML3D.math.bbox.transform(localBB, local_mat, localBB);
                this.setWorldSpaceBoundingBox(localBB);
                this.boundingBoxDirty = false;
            }
        })(),

        addChild: function(child) {
            this.children.push(child);
            this.setBoundingBoxDirty();
            this.scene.dispatchEvent({type : webgl.Scene.EVENT_TYPE.SCENE_STRUCTURE_CHANGED, newChild: child});
        },

        removeChild: function(child) {
            this.children.splice(this.children.indexOf(child), 1);
            this.scene.dispatchEvent({type : webgl.Scene.EVENT_TYPE.SCENE_STRUCTURE_CHANGED, removedChild: child});
        },

        getChildren: function() {
            return this.children;
        },

        updateWorldMatrix: function(source) {
            var page = this.page;
            var offset = this.offset;
            XML3D.math.mat4.multiplyOffset(page, offset+WORLD_MATRIX_OFFSET, page, offset+LOCAL_MATRIX_OFFSET,  source, 0);
            this.transformDirty = false;
        },

        setTransformDirty: function() {
            if (this.transformDirty) {
                //We can be sure all child nodes are already set to transformDirty from here
                //return;
            }
            this.transformDirty = true;
            this.children.forEach(function(obj) {
                obj.setTransformDirty();
            });
        },

        setLocalShaderHandle: function(newHandle) {
            this.shaderHandle = undefined;
            if (newHandle === undefined) {
                // Shader was removed, we need to propagate the parent shader down
                this.setShader(this.parent.getShaderHandle());
            } else {
                this.setShader(newHandle);
            }
            this.shaderHandle = newHandle;
        },

        setShader: function(newHandle) {
            if (this.shaderHandle !== undefined) {
                // Local shader overrides anything coming from upstream
                return;
            }
            this.children.forEach(function(obj) {
                obj.setShader(newHandle);
            });
        },

        getShaderHandle: function() {
            if (!this.shaderHandle) {
                return this.parent.getShaderHandle();
            }
            return this.shaderHandle;
        },

        setBoundingBoxDirty: function() {
            this.boundingBoxDirty = true;
            if (this.parent) {
                this.parent.setBoundingBoxDirty();
            }
        },

        setLocalVisible: function(newVal) {
            this.localVisible = newVal;
            if (this.parent.isVisible()) {
                // if parent is not visible this group is also invisible
                this.setVisible(newVal);
                this.setBoundingBoxDirty();
            }
        }

    });

    // Export
    webgl.RenderGroup = RenderGroup;

})(XML3D.webgl);
(function(webgl) {

    /** @const */
    var XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION = XML3D.math.vec3.fromValues(0,0,-1);
    /** @const */
    var XML3D_SPOTLIGHT_DEFAULT_DIRECTION = XML3D.math.vec3.fromValues(0,0,1);

    /** @const */
    var LIGHT_DEFAULT_INTENSITY = XML3D.math.vec3.fromValues(1,1,1);
    /** @const */
    var LIGHT_DEFAULT_ATTENUATION = XML3D.math.vec3.fromValues(0,0,1);
    /** @const */
    var SPOTLIGHT_DEFAULT_FALLOFFANGLE = Math.PI / 4.0;
    /** @const */
    var SPOTLIGHT_DEFAULT_SOFTNESS = 0.0;

    /** @const */
    var LIGHT_PARAMETERS = ["intensity", "attenuation", "softness", "falloffAngle"];

    /** @const */
    var ENTRY_SIZE = 16;

    /**
     * @constructor
     * @param {Scene} scene
     * @param {Object} pageEntry
     * @param {Object} opt
     * @extends {RenderNode}
     */
    var RenderLight = function(scene, pageEntry, opt) {
        XML3D.webgl.RenderNode.call(this, webgl.Scene.NODE_TYPE.LIGHT ,scene, pageEntry, opt);
        opt = opt || {};
        var light = opt.light || {};
        this.light = {
            type : light.type || "directional",
            data : light.data
        }
        this.intensity   = XML3D.math.vec3.clone(LIGHT_DEFAULT_INTENSITY);
        this.position    = XML3D.math.vec3.fromValues(0,0,0);
        this.direction   = XML3D.math.vec3.clone(XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION);
        this.attenuation = XML3D.math.vec3.clone(LIGHT_DEFAULT_ATTENUATION);

        if (this.light.data) {
            // Bounding Box annotated
            this.lightParameterRequest = new Xflow.ComputeRequest(
                this.light.data, LIGHT_PARAMETERS, this.lightParametersChanged.bind(this));
            this.lightParametersChanged(this.lightParameterRequest, null);
        } else {
            XML3D.debug.logWarning("External light shaders not supported yet"); // TODO
        }

        this.localIntensity = opt.localIntensity !== undefined ? opt.localIntensity : 1.0;
        this.addLightToScene();
    };
    RenderLight.ENTRY_SIZE = ENTRY_SIZE;

    XML3D.createClass(RenderLight, webgl.RenderNode);
    XML3D.extend(RenderLight.prototype, {

        addLightToScene : function() {
            var lightEntry = this.scene.lights[this.light.type];
            if (Array.isArray(lightEntry)) {
                lightEntry.push(this);
                this.updateWorldMatrix(); // Implicitly fills light position/direction
                this.lightStructureChanged();
            } else {
                XML3D.debug.logError("Unsupported light shader script: urn:xml3d:lightshader:" + this.light.type);
            }
        },
        removeLightFromScene : function() {
            var container = this.scene.lights[this.light.type];
            if (Array.isArray(container)) {
                container = container.splice(this);
                this.lightStructureChanged();
            }
        },
        lightParametersChanged: function(request, changeType) {
            // console.log("Light parameters have changed", arguments);
            var result = request.getResult();
            if (result) {
                var entry = result.getOutputData("intensity");
                entry && XML3D.math.vec3.copy(this.intensity, entry.getValue());
                entry = result.getOutputData("attenuation");
                entry && XML3D.math.vec3.copy(this.attenuation, entry.getValue());
                changeType && this.lightValueChanged();
            }
        },
        lightValueChanged: function() {
            this.scene.dispatchEvent({ type: webgl.Scene.EVENT_TYPE.LIGHT_VALUE_CHANGED, light: this });
        },
        lightStructureChanged: function() {
            this.scene.dispatchEvent({ type: webgl.Scene.EVENT_TYPE.LIGHT_STRUCTURE_CHANGED, light: this });
        },
        getLightData: function(target, offset) {
            var off3 = offset*3;
            ["position", "direction", "attenuation"].forEach( function(name) {
                if(target[name]) {
                    target[name][off3+0] = this[name][0];
                    target[name][off3+1] = this[name][1];
                    target[name][off3+2] = this[name][2];
                }
            }, this);
            if (target["intensity"]) {
                target["intensity"][off3+0] = this.intensity[0] * this.localIntensity;
                target["intensity"][off3+1] = this.intensity[1] * this.localIntensity;
                target["intensity"][off3+2] = this.intensity[2] * this.localIntensity;
            }
            if (target["on"]) {
                target["on"][offset] = this.visible;
            }
            var result;
            var data;
            if (target["softness"]) {
                target["softness"][offset] = SPOTLIGHT_DEFAULT_SOFTNESS;
                if (this.light.data) {
                    result = this.lightParameterRequest.getResult();
                    data = result.getOutputData("softness");
                    target["softness"][offset] = data ? data.getValue()[0] : SPOTLIGHT_DEFAULT_SOFTNESS;
                }
            }
            if (target["falloffAngle"]) {
                target["falloffAngle"][offset] = SPOTLIGHT_DEFAULT_FALLOFFANGLE;
                if (this.light.data) {
                    result = this.lightParameterRequest.getResult();
                    data = result.getOutputData("falloffAngle");
                    target["falloffAngle"][offset] = data ? data.getValue()[0] : SPOTLIGHT_DEFAULT_FALLOFFANGLE;
                }
            }
        },

        setTransformDirty: function() {
            this.updateWorldMatrix();
        },

        updateWorldMatrix: (function() {
            var tmp_mat = XML3D.math.mat4.create();
            return function() {
                this.parent.getWorldMatrix(tmp_mat);
                this.setWorldMatrix(tmp_mat);
                this.updateLightTransformData(tmp_mat);
            }
        })(),

        updateLightTransformData: function(transform) {
            switch (this.light.type) {
                case "directional":
                    XML3D.math.vec3.copy(this.direction, this.applyTransformDir(XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION, transform));
                    break;
                case "spot":
                    XML3D.math.vec3.copy(this.direction, this.applyTransformDir(XML3D_SPOTLIGHT_DEFAULT_DIRECTION, transform));
                    XML3D.math.vec3.copy(this.position, this.applyTransform([0,0,0], transform));
                    break;
                case "point":
                    XML3D.math.vec3.copy(this.position, this.applyTransform([0,0,0], transform));
            }
            this.lightValueChanged();
        },

        applyTransform: function(vec, transform) { // TODO: closure
            var newVec = XML3D.math.vec4.transformMat4(XML3D.math.vec4.create(), [vec[0], vec[1], vec[2], 1], transform);
            return [newVec[0]/newVec[3], newVec[1]/newVec[3], newVec[2]/newVec[3]];
        },

        applyTransformDir: function(vec, transform) { // TODO: closure
            var newVec = XML3D.math.vec4.transformMat4(XML3D.math.vec4.create(), [vec[0], vec[1], vec[2], 0], transform);
            return [newVec[0], newVec[1], newVec[2]];
        },

        setLocalVisible: function(newVal) {
            this.localVisible = newVal;
            if (newVal === false) {
                this.visible = false;
                this.lightValueChanged();
            } else {
                this.setVisible(this.parent.isVisible());
            }
        },

        setVisible: function(newVal) {
            if (this.localVisible !== false) {
                this.visible = newVal;
                this.lightValueChanged();
            }
        },

        setLocalIntensity: function(intensity) {
            this.localIntensity = intensity;
            this.lightValueChanged();
        },

        setLightType: function(type) {
            type = type || "directional";
            if(type != this.light.type) {
                this.removeLightFromScene();
                this.light.type = type;
                this.addLightToScene();
            }
        },
        remove: function() {
            this.parent.removeChild(this);
            this.removeLightFromScene();
        },

        getWorldSpaceBoundingBox: function(bbox) {
            XML3D.math.bbox.empty(bbox);
        }

    });

    webgl.RenderLight = RenderLight;


})(XML3D.webgl);
(function(webgl) {
    /** @const */
    var VIEW_MATRIX_OFFSET = 0;
    /** @const */
    var PROJECTION_MATRIX_OFFSET = 16;
    /** @const */
    var ENTRY_SIZE = PROJECTION_MATRIX_OFFSET + 16;

    /**
     *
     * @constructor
     * @extends {RenderNode}
     */
    var RenderView = function(scene, pageEntry, opt) {
        XML3D.webgl.RenderNode.call(this, webgl.Scene.NODE_TYPE.VIEW, scene, pageEntry, opt);
        opt = opt || {};
        this.position = opt.position || XML3D.math.vec3.create();
        this.orientation = opt.orientation || XML3D.math.mat4.create();
        this.fieldOfView = opt.fieldOfView !== undefined ? opt.fieldOfView : 0.78;
        this.worldSpacePosition = XML3D.math.vec3.create();
        this.projectionAdapter = opt.projectionAdapter;
        this.viewDirty = true;
        this.projectionDirty = true;
    };
    RenderView.ENTRY_SIZE = ENTRY_SIZE;

    XML3D.createClass(RenderView, XML3D.webgl.RenderNode);
    XML3D.extend(RenderView.prototype, {
        updateViewMatrix: (function() {
            var tmp_mat4 = XML3D.math.mat4.create();
            var tmp_parent = XML3D.math.mat4.create();

            return function (source) {
                XML3D.math.mat4.identity(tmp_mat4);
                tmp_mat4[12] = this.position[0];
                tmp_mat4[13] = this.position[1];
                tmp_mat4[14] = this.position[2];
                // tmp = T * O
                XML3D.math.mat4.multiply(tmp_mat4, tmp_mat4, this.orientation);
                this.parent.getWorldMatrix(tmp_parent);
                XML3D.math.mat4.multiply(tmp_mat4, tmp_parent, tmp_mat4);
                XML3D.math.vec3.set(this.worldSpacePosition, tmp_mat4[12], tmp_mat4[13], tmp_mat4[14]);
                XML3D.math.mat4.invert(tmp_mat4, tmp_mat4);
                this.setViewMatrix(tmp_mat4);
            }
        })(),

        updateProjectionMatrix: (function() {
            var tmp = XML3D.math.mat4.create();

            return function(aspect) {
                if (this.projectionAdapter) {
                    this.setProjectionMatrix(this.projectionAdapter.getMatrix("perspective"));
                    return;
                }
                var clipPlane = this.getClippingPlanes();
                var f = 1 / Math.tan(this.fieldOfView / 2);

                tmp[0] = f / aspect;
                tmp[1] = 0;
                tmp[2] = 0;
                tmp[3] = 0;
                tmp[4] = 0;
                tmp[5] = f;
                tmp[6] = 0;
                tmp[7] = 0;
                tmp[8] = 0;
                tmp[9] = 0;
                tmp[10] = (clipPlane.near + clipPlane.far) / (clipPlane.near - clipPlane.far);
                tmp[11] = -1;
                tmp[12] = 0;
                tmp[13] = 0;
                tmp[14] = 2 * clipPlane.near * clipPlane.far / (clipPlane.near - clipPlane.far);
                tmp[15] = 0;

                this.setProjectionMatrix(tmp);
            }
        })(),

        getClippingPlanes: (function() {
            var t_mat = XML3D.math.mat4.create();
            var bb = new XML3D.math.bbox.create();

            return function() {
                this.scene.getBoundingBox(bb);
                if (XML3D.math.bbox.isEmpty(bb)) {
                    return { near: 1, far: 10 };
                };

                this.getViewMatrix(t_mat);
                XML3D.math.bbox.transform(bb, t_mat, bb);

                var bounds = { zMin: bb[2], zMax: bb[5] };
                var length = XML3D.math.bbox.longestSide(bb);

                // Expand the view frustum a bit to ensure 2D objects parallel to the camera are rendered
                bounds.zMin -= length * 0.005;
                bounds.zMax += length * 0.005;
                //console.log(bounds);

                return {near: Math.max(-bounds.zMax, 0.01*length), far: -bounds.zMin};
            }
        })(),

        setViewMatrix: function(source) {
            var o = this.offset + VIEW_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                this.page[o] = source[i];
            }
            this.viewDirty = false;
        },

        setProjectionMatrix: function(source) {
            var o = this.offset + PROJECTION_MATRIX_OFFSET;
            for(var i = 0; i < 16; i++, o++) {
                this.page[o] = source[i];
            }
            this.projectionDirty = false;
        },

        setProjectionAdapter: function(projAdapter) {
            this.projectionAdapter = projAdapter;
            this.setProjectionDirty();
        },

        setTransformDirty: function() {
            this.viewDirty = true;
            this.setProjectionDirty();
            this.scene.requestRedraw("Transformation changed");
        },

        setProjectionDirty: function() {
            this.projectionDirty = true;
        },

        updatePosition: function(newPos) {
            this.setTransformDirty();
            this.position = newPos;
        },

        updateOrientation: function(newOrientation) {
            this.setTransformDirty();
            this.orientation = newOrientation;
        },

        updateFieldOfView: function(newFov) {
            this.setTransformDirty();
            this.fieldOfView = newFov;
        },

        getViewMatrix: function(dest) {
                if (this.viewDirty) {
                    this.updateViewMatrix();
                }
                var o = this.offset + VIEW_MATRIX_OFFSET;
                for(var i = 0; i < 16; i++, o++) {
                    dest[i] = this.page[o];
                }
        },

        getProjectionMatrix: function(dest, aspect) {
                if (this.projectionDirty) {
                    this.updateProjectionMatrix(aspect);
                }
                var o = this.offset + PROJECTION_MATRIX_OFFSET;
                for(var i = 0; i < 16; i++, o++) {
                    dest[i] = this.page[o];
                }
        },

        getWorldSpacePosition: function() {
            return this.worldSpacePosition;
        },

        getWorldSpaceBoundingBox: function(bbox) {
            XML3D.math.bbox.empty(bbox);
        }
    });

    // Export
    webgl.RenderView = RenderView;

})(XML3D.webgl);
(function (webgl) {

    /**
     *
     * @constructor
     * @extends Pager
     */
    var Scene = function () {
        webgl.Pager.call(this);

        this.boundingBox = new XML3D.math.bbox.create();
        this.lights = {
            queue: [],
            point: [],
            directional: [],
            spot: [],
            length: function () {
                return this.point.length + this.directional.length + this.spot.length;
            }
        };
        this.shaderInfos = [];
        /** @type RenderView */
        this.activeView = null;
        this.rootNode = this.createRootNode();
    };
    XML3D.createClass(Scene, webgl.Pager);

    Scene.NODE_TYPE = {
        GROUP:  "group",
        OBJECT: "object",
        LIGHT:  "light",
        VIEW:   "view"
    };

    Scene.EVENT_TYPE = {
        VIEW_CHANGED: "view_changed",
        LIGHT_STRUCTURE_CHANGED: "light_structure_changed",
        LIGHT_VALUE_CHANGED: "light_value_changed",
        SCENE_STRUCTURE_CHANGED: "scene_structure_changed",
        DRAWABLE_STATE_CHANGED: "drawable_state_changed"
    };


    var empty = function () {
    };

    XML3D.extend(Scene.prototype, {
        /**
         * @returns {RenderView}
         */
        getActiveView: function () {
            return this.activeView;
        },
        /**
         * @param {RenderView} view
         */
        setActiveView: function (view) {
            if(view != this.activeView) {
                if(!view)
                    throw new Error("Active view must not be null");
                this.activeView = view;
                this.dispatchEvent({type: Scene.EVENT_TYPE.VIEW_CHANGED, newView: this.activeView });
            }
        },
        /**
         *
         * @param opt
         * @returns {webgl.RenderMesh}
         */
        createRenderMesh: function (opt) {
            var pageEntry = this.getPageEntry(webgl.RenderMesh.ENTRY_SIZE);
            var renderObject = new webgl.RenderMesh(this, pageEntry, opt);
            return renderObject;
        },
        /**
         * @param opt
         * @returns {webgl.RenderObject}
         * @deprecated
         */
        createRenderObject: function (opt) {
            var pageEntry = this.getPageEntry(webgl.RenderObject.ENTRY_SIZE);
            var renderObject = new webgl.RenderObject(this, pageEntry, opt);
            return renderObject;
        },

        createRenderGroup: function (opt) {
            var pageEntry = this.getPageEntry(webgl.RenderGroup.ENTRY_SIZE);
            return new webgl.RenderGroup(this, pageEntry, opt);
        },

        createRenderView: function (opt) {
            var pageEntry = this.getPageEntry(webgl.RenderView.ENTRY_SIZE);
            return new webgl.RenderView(this, pageEntry, opt);
        },

        createRenderLight: function (opt) {
            var pageEntry = this.getPageEntry(webgl.RenderLight.ENTRY_SIZE);
            var renderLight = new webgl.RenderLight(this, pageEntry, opt);
            return renderLight;
        },
        createShaderInfo: function (opt) {
            return new webgl.ShaderInfo(this, opt);
        },

        createRootNode: function () {
            var pageEntry = this.getPageEntry(webgl.RenderGroup.ENTRY_SIZE);
            var root = new webgl.RenderGroup(this, pageEntry, {});
            root.setWorldMatrix(XML3D.math.mat4.create());
            root.setLocalMatrix(XML3D.math.mat4.create());
            root.transformDirty = false;
            root.shaderDirty = false;
            root.visible = true;
            root.shaderHandle = new XML3D.base.AdapterHandle("not_found");
            root.shaderHandle.status = XML3D.base.AdapterHandle.STATUS.NOT_FOUND;
            return root;
        },
        updateBoundingBox: function () {
            if (this.rootNode.boundingBoxDirty) {
                // TODO: There should always be an active view
                this.activeView && this.activeView.setProjectionDirty();
            }
            this.rootNode.getWorldSpaceBoundingBox(this.boundingBox);
        },
        getBoundingBox: function (bb) {
            this.updateBoundingBox();
            XML3D.math.bbox.copy(bb, this.boundingBox);
        },
        createDrawable: function(obj) {
            throw new Error("Scene::createDrawable not implemented");
        },
        requestRedraw: function(reason) {
            throw new Error("Scene::requestRedraw not implemented");
        },
        traverse: function(callback) {
            this.rootNode.traverse(callback);
        }
    });


    webgl.Scene = Scene;

})(XML3D.webgl);
(function(webgl){

    var getUniqueId = (function(){
        var c_counter = 0;
        return function() {
              return c_counter++;
        }
    }());

    /**
     * @param {XML3D.webgl.Scene} scene
     * @param {Object} opt
     * @constructor
     */
    var ShaderInfo = function(scene, opt) {
        opt = opt || {};
        this.id = getUniqueId();
        this.scene = scene;
        this.data = opt.data;
        /** @type XML3D.URI */
        this.script = opt.script;
        this.scene.shaderInfos.push(this);
    };

    XML3D.extend(ShaderInfo.prototype, {
        setScript: function(script) {
            if(this.script != script) {
                this.script = script;
                this.scriptChangedEvent();
            }
        },
        getScript: function() {
            return this.script;
        },
        getData: function() {
            return this.data;
        },
        scriptChangedEvent: function() {

        }
    });

    webgl.ShaderInfo = ShaderInfo;

}(XML3D.webgl));(function(webgl){

    /**
     * Contex that includes all GL related resources / handlers
     * @param {WebGLRenderingContext} gl
     * @param {number} id
     * @param {number} width
     * @param {number} height
     * @constructor
     */
    var GLContext = function(gl, id, width, height) {
        this.gl = gl;
        this.id = id;
        this.canvasTarget = new XML3D.webgl.GLCanvasTarget(this, width, height);
        this.programFactory = new XML3D.webgl.ProgramFactory(this);
        this.stats = {
            materials: 0,
            meshes: 0
        };
    };
    XML3D.extend(GLContext.prototype, {
        getXflowEntryWebGlData: function (entry) {
            return XML3D.webgl.getXflowEntryWebGlData(entry, this.id);
        },
        requestRedraw: function(reason) {
            //handler.redraw(reason, forcePicking);
        },
        handleResizeEvent: function(width, height) {
            this.canvasTarget = new XML3D.webgl.GLCanvasTarget(this, width, height);
        },
        getStatistics: function() {
            return this.stats;
        }
    });

    webgl.GLContext = GLContext;

}(XML3D.webgl));
(function(webgl) {

    //noinspection JSValidateJSDoc
    /**
     * @param {WebGLRenderingContext} gl
     * @constructor
     */
    var GLTexture = function(gl) {
        Xflow.SamplerConfig.call(this);
        this.setDefaults();
        this.gl = gl;
        this.handle = null;
    };
    XML3D.createClass(GLTexture, Xflow.SamplerConfig);

    GLTexture.State = {
        NONE :    "none",
        LOADING : "loading",
        READY :   "ready",
        ERROR :   "error"
    };


    var getOrCreateFallbackTexture = (function () {

        var c_fallbackTexture = null;

        return function (gl) {
            if (!c_fallbackTexture) {
                c_fallbackTexture = new GLTexture(gl);
                var size = 16;
                var texels = new Uint8Array(size * size * 3);
                for (var i = 0; i < texels.length; i++) {
                    texels[i] = 128;
                }
                c_fallbackTexture.createTex2DFromData(gl.RGB, size, size, gl.RGB, gl.UNSIGNED_BYTE, {
                    texels: texels,
                    wrapS: gl.REPEAT,
                    wrapT: gl.REPEAT,
                    minFilter: gl.LINEAR,
                    magFilter: gl.LINEAR
                });
            }
            return c_fallbackTexture;
        }
    }());

    var isPowerOfTwo = function(dimension) {
        return (dimension & (dimension - 1)) == 0;
    };
    var nextHighestPowerOfTwo = function(x) {
        --x;
        for ( var i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    };

    /**
     * Scale up the texture to the next highest power of two dimensions.
     * @returns {HTMLCanvasElement}
     */
    var scaleImage = function (image, width, height) {
        var canvas = document.createElement("canvas");
        canvas.width = nextHighestPowerOfTwo(width);
        canvas.height = nextHighestPowerOfTwo(height);

        var context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    };

    /**
     * @param {Image|HTMLVideoElement} img
     * @returns {boolean}
     */
    var isLoaded = function (img) {
        return img.complete || img.readyState;
    };

    XML3D.extend(GLTexture.prototype, {
        /**
         * @param {Xflow.TextureEntry} textureEntry
         */
        updateFromTextureEntry : function(textureEntry) {
            var img = textureEntry.getImage();
            if(img) {
                if(!this.handle) {
                    this.handle = this.gl.createTexture();
                }
                this.set(textureEntry.getSamplerConfig());
                if(isLoaded(img)) {
                    this.updateTex2DFromImage(img);
                } else {
                    this.loads();
                }
            } else {
                this.failed();
            }
        },
        /**
         * We need to scale texture when one of the wrap modes is not CLAMP_TO_EDGE and
         * one of the texture dimensions is not power of two.
         * Otherwise rendered texture will be just black.
         * @param {number} width
         * @param {number} height
         * @returns {boolean}
         */
        needsScale: function(width, height) {
            return (this.wrapS != this.gl.CLAMP_TO_EDGE || this.wrapT != this.gl.CLAMP_TO_EDGE) &&
            (!isPowerOfTwo(width) || !isPowerOfTwo(height))
        },

        /**
         * @param {Image|HTMLVideoElement} image
         */
        updateTex2DFromImage : function(image) {
            var gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, this.handle);

            var width = image.videoWidth || image.width;
            var height = image.videoHeight || image.height;

            if(this.needsScale(width, height)) {
                image = scaleImage(image, width, height);
            }
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);

            if (this.generateMipMap) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            gl.bindTexture(gl.TEXTURE_2D, null);

            this.created();
        },
        bind : function(unit) {
            if (this.canBind()) {
                this.gl.activeTexture(this.gl.TEXTURE0 + unit);
                this.gl.bindTexture(this.textureType, this.handle);
            } else {
                getOrCreateFallbackTexture(this.gl).bind(unit);
            }
        },
        unbind : function(unit) {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            this.gl.bindTexture(this.textureType, null);
        },
        destroy : function() {
            this.gl.deleteTexture(this.handle);
        },
        canBind : function() {
            return this.current == GLTexture.State.READY;
        },
        createTex2DFromData: function(internalFormat, width, height, sourceFormat, sourceType, opt) {
            var gl = this.gl;

            var opt = opt || {};
            var texels = opt.texels;

            if (!texels) {
                if (sourceType == gl.FLOAT) {
                    texels = new Float32Array(width * height * 4);
                } else {
                    texels = new Uint8Array(width * height * 4);
                }
            }

            this.handle = gl.createTexture();
            this.textureType = gl.TEXTURE_2D;
            gl.bindTexture(gl.TEXTURE_2D, this.handle);

            // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opt.wrapS);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opt.wrapT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opt.minFilter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opt.magFilter);

            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, sourceFormat, sourceType, texels);

            if (opt.isDepth) {
                gl.texParameteri(gl.TEXTURE_2D, gl.DEPTH_TEXTURE_MODE, opt.depthMode);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, opt.depthCompareMode);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, opt.depthCompareFunc);
            }
            if (opt.generateMipmap) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }

            gl.bindTexture(gl.TEXTURE_2D, null);
            this.created();
        }

    });

    window.StateMachine.create({
        target: GLTexture.prototype,
        initial: GLTexture.State.NONE,
        events: [
            { name:'created', from: '*',    to: GLTexture.State.READY   },
            { name:'failed',  from: '*',    to: GLTexture.State.ERROR   },
            { name:'loads',   from: '*',    to: GLTexture.State.LOADING }
        ]
    });


    webgl.GLTexture = GLTexture;

}(XML3D.webgl));(function (webgl) {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} type
     * @param {string} shaderSource
     * @returns {WebGLShader|null}
     */
    var createWebGLShaderFromSource = function (gl, type, shaderSource) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) {
            var errorString = "";
            if (type == gl.VERTEX_SHADER)
                errorString = "Vertex shader failed to compile: \n";
            else
                errorString = "Fragment shader failed to compile: \n";

            errorString += gl.getShaderInfoLog(shader) + "\n--------\n";
            XML3D.debug.logError(errorString);
            gl.getError();
            return null;
        }
        return shader;
    };

    var createProgramFromSources = function (gl, vertexSources, fragmentSources) {
        var shd = null;
        var shaders = [ ];
        for (var s in vertexSources) {
            var src = vertexSources[s];
            shd = createWebGLShaderFromSource(gl, gl.VERTEX_SHADER, src);
            shaders.push(shd);
        }
        for (var s in fragmentSources) {
            var src = fragmentSources[s];
            shd = createWebGLShaderFromSource(gl, gl.FRAGMENT_SHADER, src);
            shaders.push(shd);
        }
        return createProgramFromShaders(gl, shaders);
    }

    var createProgramFromShaders = function (gl, shaders) {
        var program = gl.createProgram();
        for (var s in shaders) {
            var shader = shaders[s];
            gl.attachShader(program, shader);
        }
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS) == 0) {
            var errorString = "Shader linking failed: \n";
            errorString += gl.getProgramInfoLog(program);
            errorString += "\n--------\n";
            XML3D.debug.logError(errorString);
            gl.getError();
            return null;
        }
        return program;
    }

    var tally = function (gl, handle, programObject) {
        // Tally shader attributes
        var numAttributes = gl.getProgramParameter(handle, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < numAttributes; i++) {
            var att = gl.getActiveAttrib(handle, i);
            if (!att)
                continue;
            var attInfo = {};
            attInfo.name = att.name;
            attInfo.size = att.size;
            attInfo.glType = att.type;
            attInfo.location = gl.getAttribLocation(handle, att.name);
            programObject.attributes[att.name] = attInfo;
        }


        // Tally shader uniforms and samplers
        var numUniforms = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < numUniforms; i++) {
            var uni = gl.getActiveUniform(handle, i);
            if (!uni)
                continue;
            var uniInfo = {};
            uniInfo.name = uni.name;
            uniInfo.size = uni.size;
            uniInfo.glType = uni.type;
            uniInfo.location = gl.getUniformLocation(handle, uni.name);

            var name = uniInfo.name;
            // Need to discuss how to sort out the consequences of doing this in the renderer first --Chris
            if (name.substring(name.length - 3) == "[0]") {
                name = name.substring(0, name.length - 3); // Remove [0]
            }

            if (uni.type == gl.SAMPLER_2D || uni.type == gl.SAMPLER_CUBE) {
                uniInfo.unit = programObject.nextTextureUnit();
                uniInfo.texture = new XML3D.webgl.GLTexture(gl);
                webgl.setUniform(gl, uniInfo, uniInfo.unit);
                programObject.samplers[name] = uniInfo;
            } else
                programObject.uniforms[name] = uniInfo;
        }

    };

    var uniqueObjectId = (function() {
        var c_counter = 0;
        return function() {
            return c_counter++;
        }
    }());

    /**
     * @constructor
     * @param {WebGLRenderingContext} gl
     * @param {{ fragment: string, vertex: string }} sources
     */
    var ProgramObject = function (gl, sources) {
        this.gl = gl;
        this.sources = sources;

        this.id = uniqueObjectId();
        this.attributes = {};
        this.uniforms = {};
        this.samplers = {};
        this.needsLights = true;
        this.handle = null;


        var maxTextureUnit = 0;
        this.nextTextureUnit = function () {
            return maxTextureUnit++;
        }

        this.create();
    };

    XML3D.extend(ProgramObject.prototype, {
        create: function () {
            XML3D.debug.logDebug("Create shader program: ", this.id);
            this.handle = createProgramFromSources(this.gl, [this.sources.vertex], [this.sources.fragment]);
            if (!this.handle)
                return;
            this.bind();
            tally(this.gl, this.handle, this);
        },
        bind: function () {
            if (!this.handle) {
                XML3D.debug.logError("Trying to bind invalid GLProgram.");
            }
            this.gl.useProgram(this.handle);
            for(var s in this.samplers) {
                var sampler = this.samplers[s];
                sampler.texture.bind(sampler.unit);
            }
        },
        unbind: function () {
            //this.gl.useProgram(null);
        },
        isValid: function() {
            return !!this.handle;
        },
        setUniformVariables: function(uniforms) {
            for ( var name in uniforms) {
                if (this.uniforms[name]) {
                    var value = uniforms[name];
                    webgl.setUniform(this.gl, this.uniforms[name], value);
                }
            }
        }
    });

    webgl.GLProgramObject = ProgramObject;

}(XML3D.webgl));(function (webgl) {

    /**
     * @interface
     */
    var IRenderTarget = function() {
    };
    IRenderTarget.prototype.bind = function(){};
    IRenderTarget.prototype.unbind = function(){};
    IRenderTarget.prototype.getWidth = function(){};
    IRenderTarget.prototype.getHeight = function(){};
    IRenderTarget.prototype.getScale = function(){};
    IRenderTarget.prototype.resize = function(width, height){};

    /**
     * Wrapper to handle screen context as render target
     * @param {XML3D.webgl.context} context
     * @constructor
     * @implements IRenderTarget
     */
    var GLCanvasTarget = function(context, width, height) {
        this.context = context;
        this.width = width;
        this.height = height;
    };

    var empty = function(){};

    XML3D.extend(GLCanvasTarget.prototype, {
        getWidth: function() { return this.width; },
        getHeight: function() { return this.height; },
        getScale: function() { return 1; },
        bind: empty,
        unbind: empty,
        resize: empty
    });

    /**
     * @param context
     * @param opt
     * @constructor
     * @implements IRenderTarget
     */
    var GLRenderTarget = function (context, opt) {
        this.context = context;
        this.width = opt.width || 800;
        this.height = opt.height || 600;
        this.scale = opt.scale || 1;
        this.opt = this.fillOptions(opt);
        this.handle = null;
        this.colorTarget = { handle: null, isTexture: false };
        this.depthTarget = { handle: null, isTexture: false };
        this.stencilTarget = { handle: null, isTexture: false };
        this.valid = false;
    };

    XML3D.extend(GLRenderTarget.prototype, {
        getWidth: function() {
            return this.width;
        },
        getHeight: function() {
            return this.height;
        },
        getScale: function() {
            return this.scale;
        },
        bind: function () {
            var created = false;
            if (!this.handle) {
                this.createFrameBuffer(this.opt.colorFormat, this.opt.depthFormat, this.opt.stencilFormat);
                created = true;
            }
            if (this.valid) {
                var gl = this.context.gl;
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
                // Set default viewport
                created && gl.viewport(0, 0, this.width, this.height);
            }
        },
        unbind: function () {
            var gl = this.context.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        },
        resize: function(width, height) {
            this.dispose();
            this.width = width;
            this.height = height;
            this.bind();
        },
        createFrameBuffer: function (colorFormat, depthFormat, stencilFormat) {
            var gl = this.context.gl;

            this.handle = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
            colorFormat && this.createColorTarget(colorFormat);
            depthFormat && this.createDepthTarget(depthFormat);
            stencilFormat && this.createStencilTarget(stencilFormat);
            this.checkStatus();
        },
        createColorTarget: function (colorFormat) {
            var gl = this.context.gl;
            if (this.opt.colorAsRenderbuffer) {
                var ct = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, ct);
                gl.renderbufferStorage(gl.RENDERBUFFER, colorFormat, this.width, this.height);
                gl.bindRenderbuffer(gl.RENDERBUFFER, null);

                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, ct);

                this.colorTarget = {
                    handle: ct,
                    isTexture: false
                };
            } else {
                //opt.generateMipmap = opt.generateColorsMipmap;
                var ctex = new XML3D.webgl.GLTexture(gl);
                ctex.createTex2DFromData(colorFormat, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.opt);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ctex.handle, 0);
                this.colorTarget = {
                    handle: ctex,
                    isTexture: true
                };
            }
        },
        createDepthTarget: function (depthFormat) {
            var gl = this.context.gl;
            this.opt.isDepth = true;
            if (this.opt.depthAsRenderbuffer) {
                var dt = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, dt);
                gl.renderbufferStorage(gl.RENDERBUFFER, depthFormat, this.width, this.height);
                gl.bindRenderbuffer(gl.RENDERBUFFER, null);

                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dt);

                this.depthTarget = {
                    handle: dt,
                    isTexture: false
                }
            } else {
                //opt.generateMipmap = opt.generateDepthMipmap;
                var dtex = new XML3D.webgl.GLTexture(gl);
                dtex.createTex2DFromData(depthFormat, this.width, this.height, gl.DEPTH_COMPONENT, gl.FLOAT, this.opt);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dtex.handle, 0);

                this.depthTarget = {
                    handle: dtex,
                    isTexture: true
                }
            }
        },
        createStencilTarget: function (stencilFormat) {
            var gl = this.context.gl;
            if (this.opt.stencilAsRenderbuffer) {
                var st = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, st);
                gl.renderbufferStorage(gl.RENDERBUFFER, stencilFormat, this.width, this.height);
                gl.bindRenderbuffer(gl.RENDERBUFFER, null);

                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, st);

                this.stencilTarget = {
                    handle: st,
                    isTexture: false
                }
            }
            else {
                //opt.generateMipmap = opt.generateStencilMipmap;
                var stex = new XML3D.webgl.GLTexture(gl);
                stex.createTex2DFromData(stencilFormat, this.width, this.height, gl.STENCIL_COMPONENT, gl.UNSIGNED_BYTE, this.opt);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.TEXTURE_2D, stex.handle, 0);

                this.stencilTarget = {
                    handle: stex,
                    isTexture: true
                }
            }
        },
        checkStatus: function () {
            var gl = this.context.gl;

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
            //Finalize framebuffer creation
            var fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

            switch (fbStatus) {
                case gl.FRAMEBUFFER_COMPLETE:
                    break;
                case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                    XML3D.debug.logError("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                    break;
                case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                    XML3D.debug.logError("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                    break;
                case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                    XML3D.debug.logError("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                    break;
                case gl.FRAMEBUFFER_UNSUPPORTED:
                    XML3D.debug.logError("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
                    break;
                default:
                    XML3D.debug.logError("Incomplete framebuffer: " + fbStatus);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            this.valid = (fbStatus == gl.FRAMEBUFFER_COMPLETE);
            return this.valid;
        },
        fillOptions: function (options) {
            var gl = this.context.gl;
            var opt = {
                wrapS: gl.CLAMP_TO_EDGE,
                wrapT: gl.CLAMP_TO_EDGE,
                minFilter: gl.NEAREST,
                magFilter: gl.NEAREST,
                depthMode: gl.LUMINANCE,
                depthCompareMode: gl.COMPARE_R_TO_TEXTURE,
                depthCompareFunc: gl.LEQUAL,
                colorsAsRenderbuffer: false,
                depthAsRenderbuffer: false,
                stencilAsRenderbuffer: false,
                isDepth: false
            };

            for (var item in options) {
                opt[item] = options[item];
            }
            return opt;
        },
        dispose: function () {
            if (!this.handle)
                return;

            var gl = this.context.gl;
            gl.deleteFramebuffer(this.handle);

            if (this.colorTarget !== null) {
                if (this.colorTarget.isTexture)
                    this.colorTarget.handle.dispose();
                else
                    gl.deleteRenderBuffer(this.colorTarget.handle);
            }
            if (this.depthTarget !== null) {
                if (this.depthTarget.isTexture)
                    this.depthTarget.handle.dispose();
                else
                    gl.deleteRenderBuffer(this.depthTarget.handle);
            }
            if (this.stencilTarget !== null) {
                if (this.stencilTarget.isTexture)
                    this.stencilTarget.handle.dispose();
                else
                    gl.deleteRenderBuffer(this.stencilTarget.handle);
            }
        }
    });

    var GLScaledRenderTarget = function(context, maxDimension, opt) {
          GLRenderTarget.call(this, context, opt);
          this.scaleToMaxDimension(maxDimension);
    };

    XML3D.createClass(GLScaledRenderTarget, GLRenderTarget);
    XML3D.extend(GLScaledRenderTarget.prototype, {
        scaleToMaxDimension: function(maxDimension) {
            var hDiff = this.height - maxDimension;
            var wDiff = this.width - maxDimension;

            if (hDiff > 0 || wDiff > 0) {
                var scale;
                if (hDiff > wDiff) {
                    scale = maxDimension / this.height;
                } else {
                    scale = maxDimension / this.width;
                }
                this.width = Math.floor(this.width * scale);
                this.height = Math.floor(this.height * scale);
                this.scale = scale;
            }
        }
    });

    webgl.GLCanvasTarget = GLCanvasTarget;
    webgl.GLRenderTarget = GLRenderTarget;
    webgl.GLScaledRenderTarget = GLScaledRenderTarget;


}(XML3D.webgl));(function (webgl) {

    /**
     * @param {string} typeName
     */
    var getGLTypeFromString = function (typeName) {
        var GL = window.WebGLRenderingContext;
        if (typeName && typeName.toLoweGLase)
            typeName = typeName.toLowerCase();
        switch (typeName) {
            case "triangles":
                return GL.TRIANGLES;
            case "tristrips":
                return GL.TRIANGLE_STRIP;
            case "points":
                return GL.POINTS;
            case "lines":
                return GL.LINES;
            case "linestrips":
                return GL.LINE_STRIP;
            default:
                throw new Error("Unknown primitive type: " + typeName);
        }
    };

    /**
     *
     * @param context
     * @param type
     * @constructor
     */
    var GLMesh = function (context, type) {
        this.context = context;
        this.glType = getGLTypeFromString(type);
        this.buffers = {};
        this.isIndexed = false;
        this.vertexCount = null;
        this.context.getStatistics().meshes++;
    };

    XML3D.extend(GLMesh.prototype, {
        setBuffer: function (name, buffer) {
            this.buffers[name] = buffer;
            this.isIndexed = this.isIndexed || name == "index";
        },
        setVertexCount: function (vertexCount) {
            this.vertexCount = vertexCount;
        },
        /**
         * @returns {number}
         */
        getElementCount: function () {
            try {
                return this.buffers.index.length;
            } catch (e) {
                //XML3D.debug.logError("Could not calculate element count.", e);
                return 0;
            }
        },
        /**
         * @returns {number}
         */
        getVertexCount: function () {
            try {
                return (this.vertexCount != null ? this.vertexCount : this.buffers.position.length / 3);
            } catch (e) {
                //XML3D.debug.logError("Could not calculate vertex count.", e);
                return 0;
            }
        },
        /**
         * @param {XML3D.webgl.GLProgram} program
         * @returns {number}
         */
        draw: function (program) {
            var gl = this.context.gl,
                sAttributes = program.attributes,
                buffers = this.buffers,
                triCount = 0;

            //Bind vertex buffers
            for (var name in sAttributes) {
                var shaderAttribute = sAttributes[name];
                var buffer = buffers[name];
                if (!buffer) {
                    continue;
                }
                gl.enableVertexAttribArray(shaderAttribute.location);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.vertexAttribPointer(shaderAttribute.location, buffer.tupleSize, buffer.glType, false, 0, 0);
            }

            //Draw the object
            if (this.isIndexed) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);

                if (this.segments) {
                    //This is a segmented mesh (eg. a collection of disjunct line strips)
                    var offset = 0;
                    var sd = this.segments.value;
                    for (var j = 0; j < sd.length; j++) {
                        gl.drawElements(this.glType, sd[j], gl.UNSIGNED_SHORT, offset);
                        offset += sd[j] * 2; //GL size for UNSIGNED_SHORT is 2 bytes
                    }
                } else {
                    gl.drawElements(this.glType, this.getElementCount(), gl.UNSIGNED_SHORT, 0);
                }
                triCount = this.getElementCount() / 3;
            } else {
                if (this.size) {
                    var offset = 0;
                    var sd = this.size.data;
                    for (var j = 0; j < sd.length; j++) {
                        gl.drawArrays(this.glType, offset, sd[j]);
                        offset += sd[j] * 2; //GL size for UNSIGNED_SHORT is 2 bytes
                    }
                } else {
                    // console.log("drawArrays: " + mesh.getVertexCount());
                    gl.drawArrays(this.glType, 0, this.getVertexCount());
                }
                triCount = buffers.position ? buffers.position.length / 3 : 0;
            }

            //Unbind vertex buffers
            for (var name in sAttributes) {
                var shaderAttribute = sAttributes[name];
                gl.disableVertexAttribArray(shaderAttribute.location);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

            return triCount;
        }


    });

    webgl.GLMesh = GLMesh;


}(XML3D.webgl));
(function (webgl) {
    /**
     * @interface
     */
    var IRenderer = function () {

    };

    IRenderer.prototype.renderToCanvas = function () {
    };
    IRenderer.prototype.handleResizeEvent = function (width, height) {
    };
    IRenderer.prototype.requestRedraw = function (reason) {
    };
    IRenderer.prototype.needsRedraw = function () {
    };
    IRenderer.prototype.getWorldSpaceNormalByPoint = function (obj, x, y) {
    };
    IRenderer.prototype.getWorldSpacePositionByPoint = function (obj, x, y) {
    };
    IRenderer.prototype.getRenderObjectFromPickingBuffer = function (x, y) {
    };
    IRenderer.prototype.generateRay = function (x, y) {
    };
    IRenderer.prototype.dispose = function () {
    };

    /**
     * @implements {IRenderer}
     * @constructor
     */
    var GLRenderer = function (context, scene, canvas) {
        this.context = context;
        this.scene = scene;
        this.canvas = canvas;
        this.width = canvas.clientWidth;
        this.height = canvas.clientHeight;

        /** @type {XML3D.webgl.RenderObject} */
        this.pickedObject = null;

        this.needsDraw = true;
        this.needsPickingDraw = true;
        this.context.requestRedraw = this.requestRedraw.bind(this);


        this.initGL();
        this.changeListener = new XML3D.webgl.DataChangeListener(this);

        this.createRenderPasses(context);
    };

    // Just to satisfy jslint
    GLRenderer.prototype.generateRay = function() {};

    XML3D.extend(GLRenderer.prototype, {
        initGL: function () {
            var gl = this.context.gl;

            gl.clearColor(0, 0, 0, 0);
            gl.clearDepth(1);
            gl.clearStencil(0);

            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);

            gl.frontFace(gl.CCW);
            gl.cullFace(gl.BACK);
            gl.disable(gl.CULL_FACE);

            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.BLEND);

            gl.viewport(0, 0, this.width, this.height);

            gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);

        },
        handleResizeEvent: function (width, height) {
            this.width = width;
            this.height = height;
            this.context.handleResizeEvent(width, height);
            this.createRenderPasses(this.context);
            this.scene.handleResizeEvent(width, height);
            this.needsDraw = this.needsPickingDraw = true;
        },
        createRenderPasses: function (context) {
            this.mainPass = new webgl.ForwardRenderPass(context);
            var pickingTarget = this.createPickingTarget();
            this.pickObjectPass = new webgl.PickObjectRenderPass(context, { target: pickingTarget });
            this.pickPositionPass = new webgl.PickPositionRenderPass(context, { target: pickingTarget });
            this.pickNormalPass = new webgl.PickNormalRenderPass(context, { target: pickingTarget });
        },
        requestRedraw: function (reason) {
            XML3D.debug.logDebug("Request redraw because:", reason);
            this.needsDraw = true;
            this.needsPickingDraw = true;
        },
        getWorldSpaceNormalByPoint: function (x, y, object) {
            var obj = object || this.pickedObject;
            if (!obj)
                return null;
            y = webgl.canvasToGlY(this.canvas, y);
            this.pickNormalPass.renderObject(obj);
            return this.pickNormalPass.readNormalFromPickingBuffer(x, y);
        },
        getWorldSpacePositionByPoint: function (x, y, object) {
            var obj = object || this.pickedObject;
            if (!obj)
                return null;
            y = webgl.canvasToGlY(this.canvas, y);
            this.pickPositionPass.renderObject(obj);
            return this.pickPositionPass.readPositionFromPickingBuffer(x, y);
        },

        needsRedraw: function () {
            return this.needsDraw;
        },
        renderToCanvas: function () {
            this.prepareRendering();
            var stats = this.mainPass.renderScene(this.scene);
            XML3D.debug.logDebug("Rendered to Canvas");
            this.needsDraw = false;
            return stats;
        },
        getRenderObjectFromPickingBuffer: function (x, y) {
            y = webgl.canvasToGlY(this.canvas, y);
            if(this.needsPickingDraw) {
                this.prepareRendering();
                this.pickObjectPass.renderScene(this.scene);
                this.needsPickingDraw = false;
            }
            this.pickedObject = this.pickObjectPass.getRenderObjectFromPickingBuffer(x, y, this.scene);
            return this.pickedObject;
        },
        prepareRendering: function () {
            this.scene.update();
        },
        createPickingTarget: function () {
            var gl = this.context.gl;

            var target = new webgl.GLScaledRenderTarget(this.context, webgl.MAX_PICK_BUFFER_DIMENSION, {
                width: this.width,
                height: this.height,
                colorFormat: gl.RGBA,
                depthFormat: gl.DEPTH_COMPONENT16,
                stencilFormat: null,
                depthAsRenderbuffer: true
            });
            return target;
        },
        /**
         * Uses gluUnProject() to transform the 2D screen point to a 3D ray.
         * Not tested!!
         *
         * @param {number} canvasX
         * @param {number} canvasY
         */
        generateRay: (function () {

            var c_viewMatrix = XML3D.math.mat4.create();
            var c_projectionMatrix = XML3D.math.mat4.create();

            return function (canvasX, canvasY) {

                var glY = XML3D.webgl.canvasToGlY(this.canvas, canvasY);

                // setup input to unproject
                var viewport = new Array();
                viewport[0] = 0;
                viewport[1] = 0;
                viewport[2] = this.width;
                viewport[3] = this.height;

                // get view and projection matrix arrays
                var view = this.scene.getActiveView();
                view.getViewMatrix(c_viewMatrix);
                view.getProjectionMatrix(c_projectionMatrix, viewport[2] / viewport[3]);

                var ray = new window.XML3DRay();

                var nearHit = new Array();
                var farHit = new Array();

                // do unprojections
                if (false === GLU.unProject(canvasX, glY, 0, c_viewMatrix, c_projectionMatrix, viewport, nearHit)) {
                    return ray;
                }

                if (false === GLU.unProject(canvasX, glY, 1, c_viewMatrix, c_projectionMatrix, viewport, farHit)) {
                    return ray;
                }

                // calculate ray
                XML3D.math.mat4.invert(c_viewMatrix, c_viewMatrix);
                var viewPos = new window.XML3DVec3(c_viewMatrix[12], c_viewMatrix[13], c_viewMatrix[14]);

                ray.origin.set(viewPos);
                ray.direction.set(farHit[0] - nearHit[0], farHit[1] - nearHit[1], farHit[2] - nearHit[2]);
                ray.direction.set(ray.direction.normalize());

                return ray;
            }
        }()),
        dispose: function () {
            this.scene.clear();
        }

    })

    webgl.GLRenderer = GLRenderer;

}(XML3D.webgl));
(function (webgl) {

    var StateMachine = window.StateMachine;

    /**
     *
     * @param {GLContext} context
     * @extends {Scene}
     * @constructor
     */
    var GLScene = function (context) {
        webgl.Scene.call(this);
        this.context = context;
        this.shaderFactory = new webgl.ShaderComposerFactory(context);
        this.drawableFactory = new webgl.DrawableFactory(context);
        this.firstOpaqueIndex = 0;
        this.ready = [];
        this.queue = [];
        this.addListeners();
    };
    var EVENT_TYPE = webgl.Scene.EVENT_TYPE;

    XML3D.createClass(GLScene, webgl.Scene);


    XML3D.extend(GLScene.prototype, {
        remove: function (obj) {
            var index = this.queue.indexOf(obj);
            if (index != -1) {
                this.queue.splice(index, 1);
            }
            index = this.ready.indexOf(obj);
            if (index != -1) {
                this.ready.splice(index, 1);
                if (index < this.firstOpaqueIndex)
                    this.firstOpaqueIndex--;
            }
        },
        clear: function () {
            this.ready = [];
            this.queue = [];
        },
        moveFromQueueToReady: function (obj) {
            var index = this.queue.indexOf(obj);
            if (index != -1) {
                this.queue.splice(index, 1);
                if (obj.hasTransparency()) {
                    this.ready.unshift(obj);
                    this.firstOpaqueIndex++;
                }
                else {
                    this.ready.push(obj);
                }
            }
        },
        moveFromReadyToQueue: function (obj) {
            var index = this.ready.indexOf(obj);
            if (index != -1) {
                this.ready.splice(index, 1);
                if (index < this.firstOpaqueIndex)
                    this.firstOpaqueIndex--;
                this.queue.push(obj);
            }
        },
        update: function () {
            this.updateObjectsForRendering();
            this.updateShaders();
        },

        updateShaders: function() {
            this.shaderFactory.update(this);
        },

        updateObjectsForRendering: function () {
            var that = this;
            this.forEach(function(obj) {
                obj.updateForRendering();
            });
        },
        forEach: function (func, that) {
            this.queue.slice().forEach(func, that);
            this.ready.slice().forEach(func, that);
        },
        updateReadyObjectsFromActiveView: (function () {
            var c_viewMat_tmp = XML3D.math.mat4.create();
            var c_projMat_tmp = XML3D.math.mat4.create();

            return function (aspectRatio) {
                this.getActiveView().getViewMatrix(c_viewMat_tmp);

                this.ready.forEach(function (obj) {
                    obj.updateModelViewMatrix(c_viewMat_tmp);
                    obj.updateNormalMatrix();
                });

                this.updateBoundingBox();
                this.getActiveView().getProjectionMatrix(c_projMat_tmp, aspectRatio);

                this.ready.forEach(function (obj) {
                    obj.updateModelViewProjectionMatrix(c_projMat_tmp);
                });
            }
        }()),
        addListeners: function() {
            this.addEventListener( EVENT_TYPE.SCENE_STRUCTURE_CHANGED, function(event){
                if(event.newChild !== undefined) {
                    this.addChildEvent(event.newChild);
                } else if (event.removedChild !== undefined) {
                    this.removeChildEvent(event.removedChild);
                }
            });
            this.addEventListener( EVENT_TYPE.VIEW_CHANGED, function(event){
                this.context.requestRedraw("Active view changed.");
            });
            this.addEventListener( EVENT_TYPE.LIGHT_STRUCTURE_CHANGED, function(event){
                this.shaderFactory.setLightStructureDirty();
            });
            this.addEventListener( EVENT_TYPE.LIGHT_VALUE_CHANGED, function(event){
                this.shaderFactory.setLightValueChanged();
                this.context.requestRedraw("Light value changed.");
            });
        },
        addChildEvent: function(child) {
            if(child.type == webgl.Scene.NODE_TYPE.OBJECT) {
                this.queue.push(child);
                this.context.requestRedraw("Object was added to scene.");
            }
        },
        removeChildEvent: function(child) {
            if(child.type == webgl.Scene.NODE_TYPE.OBJECT) {
                this.remove(child);
                child.dispose();
                this.context.requestRedraw("Object was removed from scene.");
            }
        },
        handleResizeEvent: function(width, height) {
            this.getActiveView().setProjectionDirty();
        },
        createDrawable: function(obj) {
            return this.drawableFactory.createDrawable(obj);
        },
        requestRedraw: function(reason) {
            return this.context.requestRedraw(reason);
        }
    });
    webgl.GLScene = GLScene;

}(XML3D.webgl));
(function (webgl) {

    /**
     * @contructor
     */
    var BaseRenderPass = function(context, opt) {
        opt = opt || {};
        this.context = context;
        this.target = opt.target || context.canvasTarget;
    };

    XML3D.extend(BaseRenderPass.prototype, {
        /**
         * Reads pixels from the pass's target
         *
         * @param {number} glX OpenGL Coordinate in the target
         * @param {number} glY OpenGL Coordinate in the target
         * @returns {Uint8Array} pixel data
         */
        readPixelDataFromBuffer : (function() {
            var c_data = new Uint8Array(8);

            return function (glX, glY) {
                var gl = this.context.gl;
                var scale = this.target.getScale();
                var x = glX * scale;
                var y = glY * scale;

                this.target.bind();
                try {
                    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, c_data);
                    this.target.unbind();
                    return c_data;
                } catch (e) {
                    XML3D.debug.logException(e);
                    this.target.unbind();
                    return null;
                }
            }
        }())
    });

    webgl.BaseRenderPass = BaseRenderPass;

}(XML3D.webgl));(function (webgl) {

    /**
     *
     * @constructor
     */
    var ForwardRenderPass = function (context, opt) {
        webgl.BaseRenderPass.call(this, context, opt);
    };
    XML3D.createClass(ForwardRenderPass, webgl.BaseRenderPass);

    XML3D.extend(ForwardRenderPass.prototype, {
        renderScene: (function () {

            return function (scene) {
                var gl = this.context.gl,
                    target = this.target;

                target.bind();
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
                gl.viewport(0, 0, target.getWidth(), target.getHeight());
                gl.enable(gl.DEPTH_TEST);

                scene.updateReadyObjectsFromActiveView(target.getWidth() / target.getHeight());

                var count = { objects: 0, primitives: 0 };
                //Sort objects by shader/transparency
                var opaqueObjects = [];
                var transparentObjects = [];
                this.sortObjects(scene.ready, scene.firstOpaqueIndex, opaqueObjects, transparentObjects);

                //Render opaque objects
                for (var program in opaqueObjects) {
                    this.renderObjectsToActiveBuffer(opaqueObjects[program], scene, { transparent: false, stats: count });
                }

                //Render transparent objects
                for (var k = 0; k < transparentObjects.length; k++) {
                    var objectArray = [transparentObjects[k]];
                    this.renderObjectsToActiveBuffer(objectArray, scene, { transparent: true, stats: count });
                }
                scene.lights.changed = false;
                return { count: count };
            }
        }()),
        sortObjects: (function () {
            var c_tmpModelMatrix = XML3D.math.mat4.create();
            var c_bbox = XML3D.math.bbox.create();
            var c_center = XML3D.math.vec3.create();

            return function (sourceObjectArray, firstOpaque, opaque, transparent) {
                var tempArray = [], obj;
                for (var i = 0, l = sourceObjectArray.length; i < l; i++) {
                    obj = sourceObjectArray[i];
                    if (i < firstOpaque) {
                        tempArray.push(obj);
                    } else {
                        opaque[obj.program.id] = opaque[obj.program.id] || [];
                        opaque[obj.program.id].push(obj);
                    }
                }

                //Sort transparent objects from back to front
                var tlength = tempArray.length;
                if (tlength > 1) {
                    for (i = 0; i < tlength; i++) {
                        obj = tempArray[i];

                        obj.getObjectSpaceBoundingBox(c_bbox);
                        XML3D.math.bbox.center(c_center, c_bbox);

                        obj.getWorldMatrix(c_tmpModelMatrix);
                        var center = XML3D.math.vec3.transformMat4(c_center, c_center, c_tmpModelMatrix);
                        tempArray[i] = [ obj, center[2] ];
                    }

                    tempArray.sort(function (a, b) {
                        return a[1] - b[1];
                    });

                    for (i = 0; i < tlength; i++) {
                        transparent[i] = tempArray[i][0];
                    }
                } else if (tlength == 1) {
                    transparent[0] = tempArray[0];
                }
                //console.log("Sorted: " + transparent.length);
            }
        }()),
        renderObjectsToActiveBuffer: (function () {

            var c_viewMat_tmp = XML3D.math.mat4.create();
            var c_projMat_tmp = XML3D.math.mat4.create();
            var tmpModelMatrix = XML3D.math.mat4.create();
            var tmpModelView = XML3D.math.mat4.create();
            var tmpModelViewProjection = XML3D.math.mat4.create();
            var tmpNormalMatrix = XML3D.math.mat3.create();

            return function (objectArray, scene, opts) {
                var objCount = 0;
                var primitiveCount = 0;
                var parameters = {};
                var stats = opts.stats || {};
                var transparent = opts.transparent === true || false;
                var gl = this.context.gl;

                if (objectArray.length == 0) {
                    return;
                }

                if (transparent) {
                    gl.enable(gl.BLEND);
                    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                }

                // At this point, we have to gurantee (via FSM), that the RenderObject has a valid shader
                var program = objectArray[0].program;

                program.bind();
                //this.shaderManager.updateActiveShader(shader);
                scene.getActiveView().getViewMatrix(c_viewMat_tmp);
                scene.getActiveView().getProjectionMatrix(c_projMat_tmp, this.width / this.height);

                parameters["viewMatrix"] = c_viewMat_tmp;
                parameters["projectionMatrix"] = c_projMat_tmp;
                //parameters["cameraPosition"] = this.camera.getWorldSpacePosition();
                parameters["screenWidth"] = this.target.width;

                //Set global data that is shared between all objects using this shader
                program.setUniformVariables(parameters);
                parameters = {};

                for (var i = 0, n = objectArray.length; i < n; i++) {
                    var obj = objectArray[i];
                    if (!obj.isVisible())
                        continue;

                    var mesh = obj.mesh;
                    XML3D.debug.assert(mesh, "We need a mesh at his point.");

                    obj.getWorldMatrix(tmpModelMatrix);
                    parameters["modelMatrix"] = tmpModelMatrix;

                    obj.getModelViewMatrix(tmpModelView);
                    parameters["modelViewMatrix"] = tmpModelView;

                    obj.getModelViewProjectionMatrix(tmpModelViewProjection);
                    parameters["modelViewProjectionMatrix"] = tmpModelViewProjection;

                    obj.getNormalMatrix(tmpNormalMatrix);
                    parameters["normalMatrix"] = tmpNormalMatrix;

                    program.setUniformVariables(parameters);
                    if (obj.override !== null) {
                        program.setUniformVariableOverride(obj.override);
                    }

                    primitiveCount += mesh.draw(program);
                    objCount++;

                    if (obj.override !== null) {
                        //TODO variable needs to be set back to the proper value instead of the default one
                        program.undoUniformVariableOverride(obj.override);
                    }
                    if (transparent) {
                        gl.disable(gl.BLEND);
                    }

                }

                stats.objects += objCount;
                stats.primitives += primitiveCount;
                return stats;
            }
        }())

    });


    webgl.ForwardRenderPass = ForwardRenderPass;

}(XML3D.webgl));
(function (webgl) {


    /**
     *
     * @param {XML3D.webgl.GLContext} context
     * @param {number} width
     * @param {number} height
     * @constructor
     */
    var PickObjectRenderPass = function (context, opt) {
        webgl.BaseRenderPass.call(this, context, opt);
        this.program = context.programFactory.getPickingObjectIdProgram();
        var gl = this.context.gl;
        this.clearBits = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT;
    };
    XML3D.createClass(PickObjectRenderPass, webgl.BaseRenderPass);

    XML3D.extend(PickObjectRenderPass.prototype, {
        renderScene: (function () {

            var c_mvp = XML3D.math.mat4.create();

            return function (scene) {
                var gl = this.context.gl;
                this.target.bind();

                gl.enable(gl.DEPTH_TEST);
                gl.disable(gl.CULL_FACE);
                gl.disable(gl.BLEND);

                gl.viewport(0, 0, this.target.getWidth(), this.target.getHeight());
                gl.clear(this.clearBits);

                scene.updateReadyObjectsFromActiveView(this.target.getWidth() / this.target.getHeight());


                this.program.bind();
                var objects = scene.ready;

                for (var j = 0, n = objects.length; j < n; j++) {
                    var obj = objects[j];
                    var mesh = obj.mesh;

                    if (!obj.isVisible())
                        continue;

                    var parameters = {};

                    obj.getModelViewProjectionMatrix(c_mvp);

                    var objId = j + 1;
                    var c1 = objId & 255;
                    objId = objId >> 8;
                    var c2 = objId & 255;
                    objId = objId >> 8;
                    var c3 = objId & 255;

                    parameters.id = [c3 / 255.0, c2 / 255.0, c1 / 255.0];
                    parameters.modelViewProjectionMatrix = c_mvp;

                    this.program.setUniformVariables(parameters);
                    mesh.draw(this.program);
                }
                this.program.unbind();
                this.target.unbind();
            };
        }()),

        /**
         * Reads pixels from the screenbuffer to determine picked object or normals.
         *
         * @param {number} x Screen Coordinate of color buffer
         * @param {number} y Screen Coordinate of color buffer
         * @param {XML3D.webgl.GLScene} scene Scene
         * @returns {XML3D.webgl.RenderObject|null} Picked Object
         */
        getRenderObjectFromPickingBuffer: function (x, y, scene) {
            var data = this.readPixelDataFromBuffer(x, y);

            if (!data)
                return null;

            var result = null;
            var objId = data[0] * 65536 + data[1] * 256 + data[2];

            if (objId > 0) {
                var pickedObj = scene.ready[objId - 1];
                result = pickedObj;
            }
            return result;
        }
    });

    webgl.PickObjectRenderPass = PickObjectRenderPass;

}(XML3D.webgl));(function(webgl){

    var PickPositionRenderPass = function(context, opt) {
        webgl.BaseRenderPass.call(this, context, opt);
        this.program = context.programFactory.getPickingPositionProgram();
        this.objectBoundingBox = XML3D.math.bbox.create();
    };
    XML3D.createClass(PickPositionRenderPass, webgl.BaseRenderPass, {

        renderObject: (function() {

            var c_modelMatrix = XML3D.math.mat4.create();
            var c_modelViewProjectionMatrix = XML3D.math.mat4.create();

            return function(obj) {
                var gl = this.context.gl;

                this.target.bind();
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
                gl.enable(gl.DEPTH_TEST);
                gl.disable(gl.CULL_FACE);
                gl.disable(gl.BLEND);

                obj.getWorldMatrix(c_modelMatrix);

                obj.getObjectSpaceBoundingBox(this.objectBoundingBox);
                XML3D.math.bbox.transform(this.objectBoundingBox, c_modelMatrix, this.objectBoundingBox);

                this.program.bind();
                obj.getModelViewProjectionMatrix(c_modelViewProjectionMatrix);

                var parameters = {
                    bbox : this.objectBoundingBox,
                    modelMatrix : c_modelMatrix,
                    modelViewProjectionMatrix : c_modelViewProjectionMatrix
                };

                this.program.setUniformVariables(parameters);
                obj.mesh.draw(this.program);

                this.program.unbind();
                this.target.unbind();
            };
        }()),

        readPositionFromPickingBuffer: (function() {

            var c_vec3 = XML3D.math.vec3.create();

            return function(x,y) {
                var data = this.readPixelDataFromBuffer(x, y);
                if(data){

                    c_vec3[0] = data[0] / 255;
                    c_vec3[1] = data[1] / 255;
                    c_vec3[2] = data[2] / 255;

                    var size = XML3D.math.bbox.size(XML3D.math.vec3.create(), this.objectBoundingBox);
                    size = XML3D.math.vec3.mul(size, c_vec3, size);
                    XML3D.math.vec3.add(size, this.objectBoundingBox, size);
                    return size;
                }
                else{
                    return null;
                }
            }
        }())
    });

    webgl.PickPositionRenderPass = PickPositionRenderPass;

}(XML3D.webgl));(function (webgl) {

    var PickNormalRenderPass = function (context, opt) {
        webgl.BaseRenderPass.call(this, context, opt);
        this.program = context.programFactory.getPickingNormalProgram();
    };

    XML3D.createClass(PickNormalRenderPass, webgl.BaseRenderPass, {
        renderObject: (function () {

            var c_modelViewProjectionMatrix = XML3D.math.mat4.create();
            var c_worldMatrix = XML3D.math.mat4.create();
            var c_normalMatrix3 = XML3D.math.mat3.create();

            return function (object) {
                var gl = this.context.gl;
                this.target.bind();

                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
                gl.enable(gl.DEPTH_TEST);
                gl.disable(gl.CULL_FACE);
                gl.disable(gl.BLEND);

                object.getModelViewProjectionMatrix(c_modelViewProjectionMatrix);
                object.getWorldMatrix(c_worldMatrix);

                if (XML3D.math.mat4.invert(c_worldMatrix, c_worldMatrix)) {
                    XML3D.math.mat3.fromMat4(c_normalMatrix3, c_worldMatrix);
                    XML3D.math.mat3.transpose(c_normalMatrix3, c_normalMatrix3);
                } else {
                    XML3D.math.mat3.identity(c_normalMatrix3);
                }

                var program = this.program;
                program.bind();

                var parameters = {
                    modelViewProjectionMatrix: c_modelViewProjectionMatrix,
                    normalMatrix: c_normalMatrix3
                };
                program.setUniformVariables(parameters);
                object.mesh.draw(program);

                program.unbind();
                this.target.unbind();
            }
        }()),
        /**
         * Read normal from picking buffer
         * @param {number} glX OpenGL Coordinate of color buffer
         * @param {number} glY OpenGL Coordinate of color buffer
         * @returns {Object} Vector with normal data
         */
        readNormalFromPickingBuffer: (function () {
            var c_pickVector = XML3D.math.vec3.create();
            var c_one = XML3D.math.vec3.fromValues(1, 1, 1);

            return function (glX, glY) {
                var data = this.readPixelDataFromBuffer(glX, glY);
                if (!data) {
                    return null;
                }
                c_pickVector[0] = data[0] / 254;
                c_pickVector[1] = data[1] / 254;
                c_pickVector[2] = data[2] / 254;

                // TODO: Optimize (2 Float arrays created)
                return XML3D.math.vec3.subtract(XML3D.math.vec3.create(), XML3D.math.vec3.scale(XML3D.math.vec3.create(), c_pickVector, 2.0), c_one);
            }
        }())
    });


    webgl.PickNormalRenderPass = PickNormalRenderPass;

}(XML3D.webgl));(function (webgl) {

    var ProgramFactory = function (context) {
        this.context = context;
        this.programs = {
            fallback: null,
            picking: {
                id: null,
                normal: null,
                position: null
            }
        }
    };

    XML3D.extend(ProgramFactory.prototype, {

        getProgramByName: function (name) {
            var scriptDescriptor = XML3D.shaders.getScript(name);
            if (!scriptDescriptor || !scriptDescriptor.vertex) {
                XML3D.debug.logError("Unknown shader: ", name);
                return null;
            }
            var descriptor = new webgl.ShaderDescriptor();
            XML3D.extend(descriptor, scriptDescriptor);
            descriptor.fragment = XML3D.webgl.addFragmentShaderHeader(descriptor.fragment);
            var shader = new webgl.ShaderClosure(this.context, descriptor);
            shader.createSources({}, null, null);
            shader.compile();
            return shader;
        },
        getFallbackProgram: function () {
            if (!this.programs.fallback) {
                var descriptor = new webgl.ShaderDescriptor();
                XML3D.extend(descriptor, XML3D.shaders.getScript("matte"));
                descriptor.fragment = XML3D.webgl.addFragmentShaderHeader(descriptor.fragment);
                var shader = new webgl.ShaderClosure(this.context, descriptor, function() { return {diffuseColor:[1,0,0]} });
                shader.createSources({}, null, null);
                shader.compile();
                this.programs.fallback = shader;
                this.programs.fallback.bind();
                this.programs.fallback.setUniformVariables({diffuseColor : [ 1, 0, 0 ]});
                this.programs.fallback.unbind();
            }
            return this.programs.fallback;
        },
        getPickingObjectIdProgram: function () {
            var picking = this.programs.picking;
            if (!picking.id) {
                picking.id = this.getProgramByName("pickobjectid");
            }
            return picking.id;
        },
        getPickingPositionProgram: function () {
            var picking = this.programs.picking;
            if (!picking.position) {
                picking.position = this.getProgramByName("pickedposition");
            }
            return picking.position;
        },
        getPickingNormalProgram: function () {
            var picking = this.programs.picking;
            if (!picking.normal) {
                picking.normal = this.getProgramByName("pickedNormals");
            }
            return picking.normal;
        }

    });

    webgl.ProgramFactory = ProgramFactory;

}(XML3D.webgl));(function(webgl){

    /**
     * @param {GLContext} context
     * @constructor
     */
    var DrawableFactory = function(context) {
        this.context = context;

    };

    XML3D.extend(DrawableFactory.prototype, {
        createDrawable: function(obj) {
            XML3D.debug.logDebug("DrawableFactory::createDrawable", obj);
            var result = new webgl.MeshClosure(this.context, obj.getType(), obj.getDataNode(), { boundingBoxChanged: obj.setObjectSpaceBoundingBox.bind(obj)});
            obj.mesh = result.getMesh();
            return result;
        }
    });

    webgl.DrawableFactory = DrawableFactory;


}(XML3D.webgl));
(function (webgl) {

    /**
     * @interface
     */
    var IShaderComposer = function () {
    };

    /**
     * @enum
     */
    IShaderComposer.UpdateState = {
        SHADER_UPDATED: 1,
        SHADER_COMPILED: 2,
        SHADER_UNCHANGED: 3
    };

    IShaderComposer.State = {
        OK: 1,
        NO_SCRIPT: 2,
        NO_PROGRAM: 3
    };

    /**
     * @param {XML3D.webgl.scene} scene
     * @returns {IShaderComposer.UpdateState}
     */
    IShaderComposer.prototype.update = function (scene, opt) {
        return IShaderComposer.UpdateState.SHADER_UNCHANGED;
    };

    //TODO Do we still need this?
    /**
     * @returns {boolean}
     */
    IShaderComposer.prototype.isValid = function () {
        return false;
    };

    /**
     *
     * @returns XML3D.webgl.ShaderClosure|null
     */
    IShaderComposer.prototype.getShaderClosure = function (scene) {
        return null;
    };

    /**
     * @param {XML3D.webgl.GLContext} context
     * @constructor
     */
    var ShaderComposerFactory = function (context) {
        this.context = context;
        /** @type {Object.<number, IShaderComposer>} */
        this.composers = {};
        this.needsCompileCheck = true;
        this.defaultComposer = new DefaultComposer(context);
    };

    ShaderComposerFactory.EVENT_TYPE = {
        MATERIAL_STRUCTURE_CHANGED: "material_structure_changed"
    };

    XML3D.extend(ShaderComposerFactory.prototype, {
        /**
         *
         * @param {XML3D.webgl.ShaderInfo} shaderInfo
         * @returns {IShaderComposer}
         */
        createComposerForShaderInfo: function (shaderInfo) {
            if (!shaderInfo) {
                return this.defaultComposer;
            }
            var result = this.composers[shaderInfo.id];
            if (!result) {
                result = new MaterialShaderComposer(this.context, shaderInfo);
                this.composers[shaderInfo.id] = result;
                this.context.getStatistics().materials++;
            }
            return result;
        },
        getDefaultComposer: function () {
            return this.defaultComposer;
        },
        getTemplateById: function (id) {
            return this.composers[id];
        },
        update: function (scene) {
            for (var i in this.composers) {
                this.composers[i].update(scene, { evaluateShader: this.needsCompileCheck, updateLightValues: this.lightValuesDirty });
            }
            this.needsCompileCheck = this.lightValuesDirty = false;
        },
        setLightStructureDirty: function() {
            XML3D.debug.logWarning("Light structure changes not yet supported.");
            this.needsCompileCheck = true;
        },
        setLightValueChanged: function() {
            this.lightValuesDirty = true;
        }

    });

    webgl.ShaderComposerFactory = ShaderComposerFactory;

    /**
     * @implements IShaderComposer
     * @constructor
     */
    var DefaultComposer = function (context) {
        this.context = context;
    };

    XML3D.createClass(DefaultComposer, XML3D.util.EventDispatcher, {
        update: function () {
        },
        isValid: function () {
            return true;
        },
        getShaderClosure: function () {
            return this.context.programFactory.getFallbackProgram();
        },
        getShaderAttributes: function() {
            return {color: null, normal: null /* for picking */};
        },
        getRequestFields: function() {
            return ["diffuseColor", "useVertexColor"];
        }

    });

    /**
     * @param {string} path
     * @returns {*}
     */
    var getShaderDescriptor = function (path) {
        var shaderName = path.substring(path.lastIndexOf(':') + 1);
        return XML3D.shaders.getScript(shaderName);
    };


    var ShaderDescriptor = function() {
        this.uniforms = {};
        this.samplers = {};
        this.attributes = {};
        this.name = "";
        this.fragment = "";
        this.vertex =  "";
    };
    ShaderDescriptor.prototype.addDirectives = function() {};
    ShaderDescriptor.prototype.hasTransparency = function() { return false; };

    webgl.ShaderDescriptor = ShaderDescriptor;


    /**
     * @implements {IShaderComposer}
     * @constructor
     */
    var MaterialShaderComposer = function (context, shaderInfo) {
        this.context = context;
        this.shaderClosures = [];
        this.obsoleteClosures = [];
        this.descriptor = new ShaderDescriptor();
        this.dataChanged = false;
        this.structureChanged = false;
        this.setShaderInfo(shaderInfo);
    };

    XML3D.createClass(MaterialShaderComposer, XML3D.util.EventDispatcher, {
        /**
         *
         * @param {XML3D.webgl.ShaderInfo} shaderInfo
         */
        setShaderInfo: function (shaderInfo) {
            var shaderScriptURI = shaderInfo.getScript();
            this.setShaderScript(shaderScriptURI);

            var that = this;
            if (this.descriptor) {
                this.request = new Xflow.ComputeRequest(shaderInfo.getData(), this.getRequestFields(), function (request, changeType) {
                    that.dataChanged = true;
                    that.context.requestRedraw("Shader data changed");
                });
                //TODO Build this into the XML3D.webgl.getScript function? It's needed everywhere anyway...
                this.descriptor.fragment = XML3D.webgl.addFragmentShaderHeader(this.descriptor.fragment);
                this.structureChanged = true;
            }
        },

        setShaderScript: function (uri) {
            // Pesimistic approach
            this.state = IShaderComposer.State.NO_SCRIPT;

            if (!uri) {
                XML3D.debug.logError("Shader has no script attached: ", this.adapter.node);
                return;
            }
            if (uri.scheme != "urn") {
                XML3D.debug.logError("Shader script reference should start with an URN: ", this.adapter.node);
                return;
            }
            var descriptor = getShaderDescriptor(uri.path);
            if (!descriptor) {
                XML3D.debug.logError("No Shader registered for urn:", uri);
                return;
            }

            XML3D.extend(this.descriptor, descriptor);
            this.state = IShaderComposer.State.OK;
        },

        getRequestFields: function () {
            return Object.keys(this.descriptor.uniforms).concat(Object.keys(this.descriptor.samplers));
        },

        /**
         * Get the attributes required by the shader
         * @returns {Object<string, *>}
         */
        getShaderAttributes: function () {
            return this.descriptor.attributes;
        },


        update: function (scene, opt) {
            opt = opt || {};
            var that = this;

            if(!this.shaderClosures.length)
                return;

            if(opt.evaluateShader || this.structureChanged) {
                this.handleShaderStructureChanged(scene);
                this.dataChanged = true;
                opt.updateLightValues = true;
            }

            if (opt.updateShaderData || this.dataChanged) {
                var result = this.request.getResult();
                this.shaderClosures.forEach(function(shader) {
                    that.updateClosureFromComputeResult(shader, result, opt);
                });
                this.dataChanged = false;
            }

            if (opt.updateLightValues) {
                var lightParameters = this.createLightParameters(scene.lights);
                this.shaderClosures.forEach(function(shader) {
                    that.updateClosureFromLightParameters(shader, lightParameters);
                });
            }
        },

        /**
         * @param {webgl.ShaderClosure} shaderClosure
         * @param {Xflow.ComputeResult} result
         * @param {Object?} opt
         */
        updateClosureFromComputeResult: function (shaderClosure, result, opt) {
            if (!result.getOutputMap) {
                return;
            }
            shaderClosure.bind();
            shaderClosure.updateUniformsFromComputeResult(result, opt);
            shaderClosure.updateSamplersFromComputeResult(result, opt);
            //shaderClosure.descriptor.parametersChanged(result.getOutputMap());
        },

        updateClosureFromLightParameters: function (shaderClosure, lightParameters) {
            shaderClosure.bind();
            shaderClosure.setUniformVariables(lightParameters);
        },

        createLightParameters: function(lights) {
            var parameters = {};
            var pointLightData = { position: [], attenuation: [], intensity: [], on: [] };
            lights.point.forEach(function(light, index) {
                light.getLightData(pointLightData, index);
            });
            parameters["pointLightPosition"] = pointLightData.position;
            parameters["pointLightAttenuation"] = pointLightData.attenuation;
            parameters["pointLightIntensity"] = pointLightData.intensity;
            parameters["pointLightOn"] = pointLightData.on;

            var directionalLightData = { direction: [], intensity: [], on: [] };
            lights.directional.forEach(function(light, index) {
                light.getLightData(directionalLightData, index);
            });
            parameters["directionalLightDirection"] = directionalLightData.direction;
            parameters["directionalLightIntensity"] = directionalLightData.intensity;
            parameters["directionalLightOn"] = directionalLightData.on;

            var spotLightData = { position: [], attenuation: [], direction: [], intensity: [], on: [], softness: [], falloffAngle: [] };
            lights.spot.forEach(function(light, index) {
                light.getLightData(spotLightData, index);
            });
            parameters["spotLightAttenuation"] = spotLightData.attenuation;
            parameters["spotLightPosition"] = spotLightData.position;
            parameters["spotLightIntensity"] = spotLightData.intensity;
            parameters["spotLightDirection"] = spotLightData.direction;
            parameters["spotLightOn"] = spotLightData.on;
            parameters["spotLightSoftness"] = spotLightData.softness;
            parameters["spotLightCosFalloffAngle"] = spotLightData.falloffAngle.map(Math.cos);

            var softFalloffAngle = spotLightData.softness.slice();
            for (var i = 0; i < softFalloffAngle.length; i++)
                softFalloffAngle[i] = softFalloffAngle[i] * (1.0 - spotLightData.softness[i]);
            parameters["spotLightCosSoftFalloffAngle"] = softFalloffAngle.map(Math.cos);

            return parameters;
        },

        getShaderClosure: function (scene, objectData, opt) {
            var shaderData = this.request.getResult();
            var shader = new webgl.ShaderClosure(this.context, this.descriptor, this.getShaderParameters.bind(this));
            shader.createSources(scene, shaderData, objectData);
            for (var i=0; i < this.shaderClosures.length; i++) {
                if (this.shaderClosures[i].equals(shader))
                    return this.shaderClosures[i];
            }
            this.initializeShaderClosure(shader, scene, objectData);
            return shader;
        },

        initializeShaderClosure: function(shaderClosure, scene, objectData) {
            shaderClosure.compile();
            var result = this.request.getResult();
            //TODO Merge compute results
            this.updateClosureFromComputeResult(shaderClosure, result, {force : true});
            //this.updateClosureFromComputeResult(shaderClosure, objectData, {force : true});
            this.updateClosureFromLightParameters(shaderClosure, this.createLightParameters(scene.lights));
            this.shaderClosures.push(shaderClosure);
        },

        handleShaderStructureChanged: function(scene) {
            this.obsoleteClosures = this.shaderClosures.splice(0);
            this.shaderClosures = [];
            this.dispatchEvent({type: webgl.ShaderComposerFactory.EVENT_TYPE.MATERIAL_STRUCTURE_CHANGED});
            this.structureChanged = false;
            this.obsoleteClosures = [];
        },

        getShaderAfterStructureChanged: function(shaderClosure, scene, objectData) {
            var index = this.obsoleteClosures.indexOf(shaderClosure);
            if (index >= 0) {
                var newShader = new webgl.ShaderClosure(this.context, this.descriptor, this.getShaderParameters.bind(this));
                var shaderData = this.request.getResult();
                newShader.createSources(scene, shaderData, objectData);
                if (newShader.equals(shaderClosure)) {
                    this.shaderClosures.push(shaderClosure);
                } else {
                    newShader.compile();
                    this.updateClosureFromComputeResult(newShader, objectData, {force:true});
                    this.shaderClosures.push(newShader);
                    return newShader;
                }
            } else {
                XML3D.debug.logWarning("After structure change the shader was not found in list of obsolete closures");
            }
            return shaderClosure;
        },

        isValid: function () {
            return true;
        },

        getShaderParameters: function() {
            return this.request.getResult().getOutputMap();
        }

    });


}(XML3D.webgl));
(function (webgl) {

    /**
     * A ShaderClosure connects a mesh-specific GLProgram with it's Xflow data
     * @param {GLContext} context
     * @param descriptor
     * @param dataCallback
     * @constructor
     */
    var ShaderClosure = function(context, descriptor, dataCallback) {
        this.descriptor = descriptor;
        this.getShaderParameters = dataCallback || function(){ {} };
        this.source = {};

        /**
         * @private
         * @type {GLProgramObject|null}
         */
        this.program = null;

        this.context = context;
        this.id = "";
        this.isTransparent = false;
    };

    Object.defineProperties(ShaderClosure.prototype, {
            attributes: {
                writeable: false,
                get: function() {
                    return this.program ? this.program.attributes : {}
                }
            },
            uniforms: {
                writeable: false,
                get: function() {
                    return this.program ? this.program.uniforms : {}
                }
            },
            samplers: {
                writeable: false,
                get: function() {
                    return this.program ? this.program.samplers : {}
                }
            }
        }
    );
    XML3D.extend(ShaderClosure.prototype, {

        equals: function(that) {
            return this.source.vertex === that.source.vertex && this.source.fragment === that.source.fragment;
        },

        hasTransparency: function() {
            return this.isTransparent;
        },

        compile: function () {
            if (!this.source.fragment)
                return;
            if (!this.source.vertex)
                return;

            var programObject = new XML3D.webgl.GLProgramObject(this.context.gl, this.source);
            if (programObject.isValid()) {
                programObject.setUniformVariables(this.descriptor.uniforms);
            }
            this.program = programObject;
            this.id = programObject.id;
        },

        bind: function() {
            this.program.bind();
        },

        unbind: function() {
            this.program.unbind();
        },

        setUniformVariables: function(uniforms) {
            this.program.setUniformVariables(uniforms);
        },

        isValid: function() {
            return this.program.isValid();
        },

        createSources: function(scene, shaderData, objectData) {
            var directives = [];
            //TODO add object data to directives
            this.descriptor.addDirectives(directives, scene.lights || {}, shaderData ? shaderData.getOutputMap() : {});
            this.source = {
                fragment: this.addDirectivesToSource(directives, this.descriptor.fragment),
                vertex: this.addDirectivesToSource(directives, this.descriptor.vertex)
            };
        },

        convertToJSArray: function(value) {
            var jsArray = [value.length];
            for (var i=0; i<value.length; i++) {
                jsArray[i] = value[i];
            }
            return jsArray;
        },

        /**
         * @param {Xflow.data.ComputeResult} result
         * @param {Object?} options
         */
        updateUniformsFromComputeResult: function (result, options) {
            var dataMap = result.getOutputMap();
            var uniforms = this.program.uniforms;

            var opt = options || {};
            var force = opt.force || false;

            for (var name in uniforms) {
                var entry = dataMap[name];
                if (!entry)
                    continue;

                var webglData = this.context.getXflowEntryWebGlData(entry);
                if (force || webglData.changed) {
                    if (uniforms[name].glType === this.context.gl.BOOL) {
                        //TODO Can we get Xflow to return boolean arrays as normal JS arrays? WebGL doesn't accept Uint8Arrays here...
                        //TODO Alternatively we could set boolean uniforms using uniform1fv together with Float32Arrays, which apparently works too
                        webgl.setUniform(this.context.gl, uniforms[name], this.convertToJSArray(entry.getValue()));
                    } else {
                        webgl.setUniform(this.context.gl, uniforms[name], entry.getValue());
                    }
                    webglData.changed = 0;
                }
            }
            this.isTransparent = this.descriptor.hasTransparency(dataMap);
        },

        /**
         *
         * @param {Xflow.data.ComputeResult} result
         * @param {Object} options
         */
        updateSamplersFromComputeResult: function (result, options) {
            var samplers = this.program.samplers;

            var opt = options || {};
            var force = opt.force || false;

            for (var name in samplers) {
                var sampler = samplers[name];
                var entry = result.getOutputData(name);

                if (!entry) {
                    sampler.texture.failed();
                    continue;
                }

                var webglData = this.context.getXflowEntryWebGlData(entry);

                if (force || webglData.changed) {
                    sampler.texture.updateFromTextureEntry(entry);
                    webglData.changed = 0;
                }
            }
        },

        addDirectivesToSource: function (directives, source) {
            var header = "";
            directives.forEach(function (v) {
                header += "#define " + v + "\n";
            });
            return header + "\n" + source;
        },

        setUniformVariableOverride: function(override) {
            this.program.setUniformVariables(override);
        },

        undoUniformVariableOverride: function(override) {
            var previousValues = {};
            var shaderData = this.getShaderParameters();
            for (var name in override) {
                var value = shaderData[name] ? shaderData[name] : this.descriptor.uniforms[name];
                previousValues[name] = value.getValue ? value.getValue() : value;
            }
            this.program.setUniformVariables(previousValues);
        }
});

    webgl.ShaderClosure = ShaderClosure;

}(XML3D.webgl));
(function (webgl) {

    var DrawableClosure = function (context, type) {
        this.context = context;
        this._type = type;
        this._valid = false;
    };

    DrawableClosure.TYPES = {
        MESH: "mesh",
        VOLUME: "volume"
    };

    DrawableClosure.READY_STATE = {
        COMPLETE: "complete",
        INCOMPLETE: "incomplete"
    };

    XML3D.createClass(DrawableClosure, XML3D.util.EventDispatcher, {
        getType: function () {
            return this._type;
        },
        isValid: function () {
            return this._valid;
        }
    });

    webgl.DrawableClosure = DrawableClosure;

}(XML3D.webgl));(function (webgl) {

    var CHANGE_STATE = {
        NOTHING_CHANGED : 0,
        TYPE_STRUCTURE_CHANGED : 1,
        TYPE_DATA_CHANGED : 2,
        TYPE_CHANGED: 3,
        ATTRIBUTE_STRUCTURE_CHANGED : 8,
        ATTRIBUTE_DATA_CHANGED : 16,
        ATTRIBUTE_CHANGED: 24
    };

    var READY_STATE = webgl.DrawableClosure.READY_STATE;


    var MESH_PARAMETERS = {};
    MESH_PARAMETERS[WebGLRenderingContext.TRIANGLES] = { position: { required: true }, index: true };
    MESH_PARAMETERS[WebGLRenderingContext.LINE_STRIP] = { position: { required: true }, index: true };
    MESH_PARAMETERS[WebGLRenderingContext.LINES] = { position: { required: true }, index: true };
    MESH_PARAMETERS[WebGLRenderingContext.POINTS] = { position: { required: true }, index: true };

    var TYPE_FILTER = {};
    for (var param in MESH_PARAMETERS) {
        TYPE_FILTER[param] = Object.keys(MESH_PARAMETERS[param]);
    }


    var getGLTypeFromArray = function(array) {
        var GL = window.WebGLRenderingContext;
        if (array instanceof Int8Array)
            return GL.BYTE;
        if (array instanceof Uint8Array)
            return GL.UNSIGNED_BYTE;
        if (array instanceof Int16Array)
            return GL.SHORT;
        if (array instanceof Uint16Array)
            return GL.UNSIGNED_SHORT;
        if (array instanceof Int32Array)
            return GL.INT;
        if (array instanceof Uint32Array)
            return GL.UNSIGNED_INT;
        if (array instanceof Float32Array)
            return GL.FLOAT;
        return GL.FLOAT;
    };
    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} type
     * @param {Object} data
     */
    var createBuffer = function(gl, type, data) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(type, buffer);
        gl.bufferData(type, data, gl.STATIC_DRAW);
        buffer.length = data.length;
        buffer.glType = getGLTypeFromArray(data);
        return buffer;
    };

    /**
     *
     * @param {webgl.GLContext} context
     * @param {string} type
     * @param {Xflow.DataNode} data
     * @extends {DrawableClosure}
     * @constructor
     */
    var MeshClosure = function (context, type, data, opt) {
        webgl.DrawableClosure.call(this, context, webgl.DrawableClosure.TYPES.MESH);
        opt = opt || {};
        this.mesh = new webgl.GLMesh(context, type);
        this.data = data;

        /**
         * Attributes required to create the GLMesh
         * @type {Xflow.ComputeRequest}
         */
        this.typeRequest = null;

        /**
         * Are all attributes required by drawable available?
         * @type {boolean}
         */
        this.typeDataValid = false;

        /**
         * Attributes required for the attached shader
         * @type {Xflow.ComputeRequest}
         */
        this.attributeRequest = null;

        /**
         * Are all attributes required by shader available?
         * @type {boolean}
         */
        this.attributeDataValid = true;

        /**
         * Bitfield that records the changes reported by Xflow
         * @private
         * @type {number}
         */
        this.changeState = CHANGE_STATE.TYPE_STRUCTURE_CHANGED;

        /**
         * Do we have to calculate the bounding box of this mesh?
         * @type {boolean}
         */
        this.boundingBoxRequired = true;

        /**
         * Callback if bounding box has changed. Gets only called if
         * this.boundingBoxRequired is true.
         * @type {*|function(Float32Array)}
         */
        this.boundingBoxChanged = opt.boundingBoxChanged || function() {};

        this.initialize();
    };

    XML3D.createClass(MeshClosure, webgl.DrawableClosure, {
        initialize: function () {
            var typeFilter = TYPE_FILTER[this.getMeshType()];
            if (!typeFilter) {
                XML3D.debug.logError("Unsupported Mesh request: ", this.mesh);
                this.typeDataValid = false;
                return;
            }
            this.typeRequest = new Xflow.ComputeRequest(this.data, typeFilter, this.typeDataChanged.bind(this));
            this.typeDataChanged(this.typeRequest, Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        },
        setBoundingBoxRequired: function(required) {
            this.boundingBoxRequired = required;
            this.calculateBoundingBox();
        },
        calculateBoundingBox: (function() {
            var c_empty = XML3D.math.bbox.create();

            return function() {
                if(!this.boundingBoxRequired)
                    return;

                // compute bounding box from positions and indices, if present
                var dataResult = this.typeRequest.getResult();
                var positionEntry = dataResult.getOutputData("position");
                if(!positionEntry)   {
                    this.boundingBoxChanged(c_empty);
                    return;
                }
                var indexEntry = dataResult.getOutputData("index");
                this.boundingBoxChanged(XML3D.webgl.calculateBoundingBox(positionEntry.getValue(), indexEntry ? indexEntry.getValue() : null));
            }
        }()),
        /**
         *
         * @param {Xflow.ComputeRequest} request
         * @param {Xflow.RESULT_STATE} state
         */
        typeDataChanged: function (request, state) {
            this.changeState |= state == Xflow.RESULT_STATE.CHANGED_STRUCTURE ? CHANGE_STATE.TYPE_STRUCTURE_CHANGED : CHANGE_STATE.TYPE_DATA_CHANGED;
            this.context.requestRedraw("Mesh Type Data Change");
            XML3D.debug.logInfo("MeshClosure: Type data changed", request, state, this.changeState);
        },
        getMesh: function () {
            return this.mesh;
        },
        getMeshType: function () {
            return this.mesh.glType;
        },
        update: function () {

            if(this.changeState === CHANGE_STATE.NOTHING_CHANGED) {
                return;
            }
            XML3D.debug.logDebug("Update mesh closure", this.changeState);

            var oldValid = this.attributeDataValid && this.typeDataValid;

            if (this.changeState & CHANGE_STATE.TYPE_CHANGED) {
                this.updateTypeData();
            }
            if (this.changeState & CHANGE_STATE.ATTRIBUTE_CHANGED) {
                this.updateAttributeData();
            }

            var newValid = this.attributeDataValid && this.typeDataValid;

            if(oldValid != newValid) {
                this.dispatchEvent({
                    type: webgl.Scene.EVENT_TYPE.DRAWABLE_STATE_CHANGED,
                    newState: newValid ? READY_STATE.COMPLETE : READY_STATE.INCOMPLETE,
                    oldState: oldValid ? READY_STATE.COMPLETE : READY_STATE.INCOMPLETE
                });
            }


            this.changeState = CHANGE_STATE.NOTHING_CHANGED;
        },
        /**
         * @param {Object<string,*>} attributes
         * @param {Xflow.ComputeResult} dataResult
         * @param {function(string)} missingCB
         * @returns boolean true, if all required attributes were set
         */
        updateMeshFromResult: function (attributes, dataResult, missingCB) {
            var complete = true;
            for (var name in attributes) {
                var param = attributes[name] || {};
                var entry = dataResult.getOutputData(name);
                if (!entry || !entry.getValue()) {
                    if (param.required) {
                        // If required and loading has finished, give a call
                        dataResult.loading || missingCB(name);
                        complete = false;
                    }
                    continue;
                }
                if (name == "vertexCount") {
                    continue;
                }
                switch (entry.type) {
                    case Xflow.DATA_TYPE.TEXTURE:
                        XML3D.debug.logError("Texture as mesh parameter is not yet supported");
                        break;
                    default:
                        this.handleBuffer(name, param, entry, this.mesh);
                }
            }
            return complete;
        },
        updateAttributeData: function() {
            if (!this.attributeDataValid && !(this.changeState & CHANGE_STATE.ATTRIBUTE_STRUCTURE_CHANGED)) {
                return; // if only the data has changed, it can't get valid after update
            }
            var dataResult = this.attributeRequest.getResult();
            var attributes = this.attributes;
            var complete = this.updateMeshFromResult(attributes, dataResult, function(name) {
                XML3D.debug.logError("Required shader attribute", name, "is missing for mesh");
            });

            this.attributeDataValid = complete;
        },

        updateTypeData: function () {
            if (!this.typeDataValid && !(this.changeState & CHANGE_STATE.TYPE_STRUCTURE_CHANGED)) {
                return; // only if structure has changed, it can't get valid after update
            }
            var dataResult = this.typeRequest.getResult();
            var meshParams = MESH_PARAMETERS[this.getMeshType()];
            XML3D.debug.assert(meshParams, "At this point, we need parameters for the type");

            var vertexCount = 0;
            var complete = this.updateMeshFromResult(meshParams, dataResult, function(name) {
                XML3D.debug.logError("Required mesh attribute ", name, "is missing for mesh");
            });

            this.calculateBoundingBox();
            var entry = dataResult.getOutputData("vertexCount");
            this.mesh.setVertexCount(entry && entry.getValue() ? entry.getValue()[0] : null);
            this.typeDataValid = complete;
        },
        /**
         * @param {string} name
         * @param {Object} attr
         * @param {Xflow.BufferEntry} entry
         * @param {GLMesh} mesh
         */
        handleBuffer: function (name, attr, entry, mesh) {
            var webglData = XML3D.webgl.getXflowEntryWebGlData(entry, this.context.id);
            var buffer = webglData.buffer;
            var gl = this.context.gl;

            switch (webglData.changed) {
                case Xflow.DATA_ENTRY_STATE.CHANGED_VALUE:
                    var bufferType = name == "index" ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;

                    gl.bindBuffer(bufferType, buffer);
                    gl.bufferSubData(bufferType, 0, entry.getValue());
                    break;
                case Xflow.DATA_ENTRY_STATE.CHANGED_NEW:
                case Xflow.DATA_ENTRY_STATE.CHANGED_SIZE:
                    if (name == "index") {
                        buffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(entry.getValue()));
                    } else {
                        buffer = createBuffer(gl, gl.ARRAY_BUFFER, entry.getValue());
                    }
                    buffer.tupleSize = entry.getTupleSize();
                    webglData.buffer = buffer;
                    break;
            }
            // In every case, set the buffer, because other meshes might have already
            // performed one or more of the tasks above
            mesh.setBuffer(name, buffer);

            webglData.changed = 0;
        },
        /**
         *
         * @param {Object.<string, *>} attributes
         */
        setAttributeRequest: function(attributes) {
            this.attributes = attributes;
            this.attributeRequest = new Xflow.ComputeRequest(this.data, Object.keys(attributes), this.attributeDataChanged.bind(this));
            this.attributeDataChanged(this.attributeRequest, Xflow.RESULT_STATE.CHANGED_STRUCTURE);
        },
        /**
         * @param {Xflow.ComputeRequest} request
         * @param {Xflow.RESULT_STATE} state
         */
        attributeDataChanged: function (request, state) {
            this.changeState |= state == Xflow.RESULT_STATE.CHANGED_STRUCTURE ? CHANGE_STATE.ATTRIBUTE_STRUCTURE_CHANGED : CHANGE_STATE.ATTRIBUTE_DATA_CHANGED;
            this.context.requestRedraw("Mesh Attribute Data Changed");
            XML3D.debug.logInfo("MeshClosure: Attribute data changed", request, state, this.changeState);
        },

        /**
         * Returns a compute request for custom mesh parameters
         * @param {Array.<string>} filter
         * @param {function(Xflow.ComputeRequest, Xflow.RESULT_STATE)} callback
         */
        getRequest: function(filter, callback) {
            return new Xflow.ComputeRequest(this.data, filter, callback);
        }
    });

    webgl.MeshClosure = MeshClosure;

}(XML3D.webgl));
// renderer/renderer.js
(function (webgl) {

    webgl.renderers = [];

    var RendererFactory = function () {
        this.createRenderer = function (context, scene, canvas) {
            return new webgl.GLRenderer(context, scene, canvas);
        }
    };
    webgl.rendererFactory = new RendererFactory();

})(XML3D.webgl);






(function() {

    XML3D.webgl.RenderAdapter = function(factory, node) {
        XML3D.base.NodeAdapter.call(this, factory, node);
    };
    XML3D.createClass(XML3D.webgl.RenderAdapter, XML3D.base.NodeAdapter);

    XML3D.webgl.RenderAdapter.prototype.getShader = function() {
        return null;
    };

    XML3D.webgl.RenderAdapter.prototype.getAdapterHandle = function(uri) {
        return XML3D.base.resourceManager.getAdapterHandle(this.node.ownerDocument, uri,
            XML3D.webgl, this.factory.canvasId);
    };

    XML3D.webgl.RenderAdapter.prototype.getParentRenderAdapter = function() {
        return this.factory.getAdapter(this.node.parentElement, XML3D.webgl.RenderAdapter);
    };

    /**
     * @param element
     */
    XML3D.webgl.RenderAdapter.prototype.initElement = function(element) {
        this.factory.getAdapter(element);
        this.initChildElements(element);
    };

    /**
     * @param element
     */
    XML3D.webgl.RenderAdapter.prototype.initChildElements = function(element) {
        this.traverse(this.factory.getAdapter);
    };


    XML3D.webgl.RenderAdapter.prototype.applyTransformMatrix = function(transform) {
        return transform;
    };

    XML3D.webgl.RenderAdapter.prototype.getScene = function() {
        return this.factory.renderer.scene;
    };

    /**
     * @param {Array.<string>} customAttributes
     */
    XML3D.webgl.RenderAdapter.prototype.initializeEventAttributes = function(customAttributes) {
        var attributes = this.node.attributes;
        customAttributes = customAttributes || [];

        for (var index in attributes) {
            var att = attributes[index];
            if (!att.name)
                continue;

            var type = att.name;
            if (type.substring(2,0) == "on")  {
                var eventType = type.substring(2);
                if (XML3D.webgl.events.available.indexOf(eventType) != -1 || customAttributes.indexOf(eventType) != -1) {
                    this.node.addEventListener(eventType, new Function("event", att.value), false);
                }
            }
        }
    };
})();
(function(webgl) {

    var TransformableAdapter = function(factory, node) {
        webgl.RenderAdapter.call(this, factory, node);
        this.renderNode = null;
    };
    XML3D.createClass(TransformableAdapter, webgl.RenderAdapter);

    XML3D.extend(TransformableAdapter.prototype, {
        onConfigured : function() {},
        getRenderNode : function() {
            if (!this.renderNode) {
                this.renderNode = this.createRenderNode ? this.createRenderNode() : null;
            }
            return this.renderNode;
        }
    })
    webgl.TransformableAdapter = TransformableAdapter;
})(XML3D.webgl);(function() {
    //Adapter for <defs>
    XML3D.webgl.DefsRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
    };
    XML3D.createClass(XML3D.webgl.DefsRenderAdapter, XML3D.webgl.RenderAdapter);
})();
// Adapter for <xml3d>
(function() {
    var XML3DRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
        this.initializeEventAttributes(["load"]);
    };
    XML3D.createClass(XML3DRenderAdapter, XML3D.webgl.RenderAdapter);

    XML3D.extend(XML3DRenderAdapter.prototype, {
        updateActiveViewAdapter: function () {
            var href = this.node.getAttribute("activeView");
            if(href) {
                this.connectAdapterHandle("activeView", this.getAdapterHandle(href));
            } else {
                this.disconnectAdapterHandle("activeView");
            }
        },
        setViewAdapter: function(adapter) {
            adapter = adapter || this.getConnectedAdapter("activeView");
            if(!(adapter && adapter.getRenderNode)) {
                var viewElement = XML3D.util.getOrCreateActiveView(this.node);
                adapter = this.factory.getAdapter(viewElement);
            }
            this.factory.getScene().setActiveView(adapter.getRenderNode());
        },
        dispose: function() {
            this.clearAdapterHandles();
        }
    })

    XML3DRenderAdapter.prototype.notifyChanged = function(evt) {

        switch(evt.type) {
            case XML3D.events.ADAPTER_HANDLE_CHANGED:
                this.setViewAdapter(evt.adapter);
                return;
            case XML3D.events.NODE_INSERTED:
                this.initElement(evt.wrapped.target);
                this.initChildElements(evt.wrapped.target);
                return;
            case XML3D.events.NODE_REMOVED:
                // Handled in removed node
                return;
        }

        var target = evt.internalType || evt.attrName || evt.wrapped.attrName;

        if (target == "activeView") {
            this.updateActiveViewAdapter();
            this.setViewAdapter();
        }
    };

    /* Interface methods */

    /*
     * This function is called when scene DOM is loaded and all adapters are attached
     */
    XML3DRenderAdapter.prototype.onConfigured = function() {
        this.updateActiveViewAdapter();
        this.setViewAdapter();

        // emit load event when all resources currently loading are completed
        var callback = (function (node, nodeCanvasId) {
            var counter = 2; // we fire load event when callback is called twice

            function handler(canvasId) {
                counter--;
                if (counter == 0) {
                    XML3D.util.dispatchEvent(node, 'load');
                }
            }

            return handler;
        })(this.node, this.factory.canvasId);

        // register callback for canvasId == 0 i.e. global resources
        XML3D.base.resourceManager.addLoadCompleteListener(0, callback);
        // register callback for canvasId of this node
        XML3D.base.resourceManager.addLoadCompleteListener(this.factory.canvasId, callback);
    }

    XML3DRenderAdapter.prototype.getBoundingBox = function() {
        var bbox = new window.XML3DBox();
        Array.prototype.forEach.call(this.node.childNodes, function(c) {
            if(c.getBoundingBox)
                bbox.extend(c.getBoundingBox());
        });
        return bbox;
    };

    XML3DRenderAdapter.prototype.getElementByPoint = function(x, y, hitPoint, hitNormal) {
        var relativeMousePos = XML3D.webgl.convertPageCoords(this.node, x, y);

        var relX = relativeMousePos.x;
        var relY = relativeMousePos.y;

        var renderer = this.factory.getRenderer();
        var object = renderer.getRenderObjectFromPickingBuffer(relX, relY);
        if(object){
            if(hitPoint){
                var vec = renderer.getWorldSpacePositionByPoint(relX, relY, object);
                hitPoint.set(vec[0],vec[1],vec[2]);
            }
            if(hitNormal){
                var vec = renderer.getWorldSpaceNormalByPoint(relX, relY, object);
                hitNormal.set(vec[0],vec[1],vec[2]);
            }
        }
        else{
            if(hitPoint) hitPoint.set(NaN, NaN, NaN);
            if(hitNormal) hitNormal.set(NaN, NaN, NaN);
        }
        return object ? object.node : null;
    };

    XML3DRenderAdapter.prototype.generateRay = function(x, y) {
        var relativeMousePos = XML3D.webgl.convertPageCoords(this.node, x, y);
        return this.factory.getRenderer().generateRay(relativeMousePos.x, relativeMousePos.y);
    };
    XML3D.webgl.XML3DRenderAdapter = XML3DRenderAdapter;

}());// Adapter for <transform>
(function() {

    var TransformRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
        this.isValid = true;
		this.needsUpdate = true;
    };

    XML3D.createClass(TransformRenderAdapter, XML3D.webgl.RenderAdapter);
    var p = TransformRenderAdapter.prototype;

	var IDENT_MAT = XML3D.math.mat4.identity(XML3D.math.mat4.create());

	p.init = function() {
	    // Create all matrices, no valid values yet
	    this.matrix = XML3D.math.mat4.create();
	    this.transform = {
	            translate              : XML3D.math.mat4.create(),
	            scale                  : XML3D.math.mat4.create(),
	            scaleOrientationInv    : XML3D.math.mat4.create(),
	            center                 : XML3D.math.mat4.create(),
                centerInverse          : XML3D.math.mat4.create()
	            //rotation               : XML3D.math.mat4.create()
	    };
        this.needsUpdate = true;
	};

	p.updateMatrix = function() {
        var n = this.node,
            transform = this.transform,
            transVec = n.translation._data,
            centerVec = n.center._data,
            s = n.scale._data,
            so = n.scaleOrientation.toMatrix()._data,
            rot = n.rotation.toMatrix()._data;

        XML3D.math.mat4.translate(transform.translate, IDENT_MAT, transVec);
        XML3D.math.mat4.translate(transform.center, IDENT_MAT, centerVec);
        XML3D.math.mat4.translate(transform.centerInverse, IDENT_MAT, XML3D.math.vec3.negate(centerVec, centerVec));
        XML3D.math.mat4.scale(transform.scale, IDENT_MAT, s);
        XML3D.math.mat4.invert(transform.scaleOrientationInv, so);

        // M = T * C
        XML3D.math.mat4.multiply(this.matrix, transform.translate, transform.center);
        // M = T * C * R
        XML3D.math.mat4.multiply(this.matrix, this.matrix, rot);
        // M = T * C * R * SO
        XML3D.math.mat4.multiply(this.matrix, this.matrix, so);
        // M = T * C * R * SO * S
        XML3D.math.mat4.multiply(this.matrix, this.matrix, transform.scale);
        // M = T * C * R * SO * S * -SO
        XML3D.math.mat4.multiply(this.matrix, this.matrix, transform.scaleOrientationInv);
        // M = T * C * R * SO * S * -SO * -C
        XML3D.math.mat4.multiply(this.matrix, this.matrix, transform.centerInverse);

        this.needsUpdate = false;
    };

	p.getMatrix = function() {
	    this.needsUpdate && this.updateMatrix();
	    return this.matrix;
	};


    p.notifyChanged = function(e) {
        if (e.type == 1) {
			this.needsUpdate = true;
        } else if (e.type == 2) {
            this.dispose();
        }
        this.notifyOppositeAdapters();
    };
    p.dispose = function() {
        this.isValid = false;
    };
    // Export to XML3D.webgl namespace
    XML3D.webgl.TransformRenderAdapter = TransformRenderAdapter;








    var DataRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
    };
    XML3D.createClass(DataRenderAdapter, XML3D.webgl.RenderAdapter);
    var p = DataRenderAdapter.prototype;

    p.init = function() {
        // Create all matrices, no valid values yet
        this.dataAdapter = XML3D.base.resourceManager.getAdapter(this.node, XML3D.data);
        this.matrixReady = {};
        this.matrices = {};
        this.requests = {};
    };

    p.updateMatrix = function(type) {

        createRequest(this, type);

        this.matrices[type] = XML3D.math.mat4.create();

        var dataResult =  this.requests[type].getResult();
        var transformData = (dataResult.getOutputData(type) && dataResult.getOutputData(type).getValue());
        if(!transformData){
            XML3D.math.mat4.identity(this.matrices[type]);
            return;
        }
        for(var i = 0; i < 16; ++i){
            this.matrices[type][i] = transformData[i];
        }
        this.matrixReady[type] = true;
    };

    p.getMatrix = function(type) {
        !this.matrixReady[type] && this.updateMatrix(type);
        return this.matrices[type];
    };

    p.dataChanged = function(request, changeType){
        for(var type in this.requests){
            if(this.requests[type] == request)
                delete this.matrixReady[type];
        }
        this.notifyOppositeAdapters();
    }

    function createRequest(adapter, key){
        if(!adapter.requests[key]){
            var that = adapter;
            adapter.requests[key] = adapter.dataAdapter.getComputeRequest([key],
                function(request, changeType) {
                    that.dataChanged(request, changeType);
                }
            );
        }
    }

    // Export to XML3D.webgl namespace
    XML3D.webgl.DataRenderAdapter = DataRenderAdapter;

}());


// Adapter for <view>
(function() {
    var ViewRenderAdapter = function(factory, node) {
        XML3D.webgl.TransformableAdapter.call(this, factory, node);
        connectProjectionAdapter(this);
        this.createRenderNode();
    };
    XML3D.createClass(ViewRenderAdapter, XML3D.webgl.TransformableAdapter);
    var p = ViewRenderAdapter.prototype;

    p.createRenderNode = function() {
        var parent = this.factory.getAdapter(this.node.parentElement, XML3D.webgl.RenderAdapter);
        var parentNode = parent.getRenderNode ? parent.getRenderNode() : this.factory.renderer.scene.createRootNode();

        this.renderNode = this.factory.renderer.scene.createRenderView({
            position : this.node.position._data,
            orientation : this.node.orientation.toMatrix()._data,
            fieldOfView : this.node.fieldOfView,
            parent : parentNode,
            projectionAdapter : this.getConnectedAdapter("perspective")
        });
    };

    /* Interface method */
    p.getViewMatrix = function() {
        var m = new window.XML3DMatrix();
        this.renderNode.getViewMatrix(m._data);
        return m;
    };

    /**
     * returns the inverse of the view matrix, since now we
     * want to go world2view and not view2world
     * @return {window.XML3DMatrix}
     */
    p.getWorldMatrix = function() {
        var m = new window.XML3DMatrix();
        this.renderNode.getViewMatrix(m._data);
        XML3D.math.mat4.invert(m._data, m._data);
        return m;
    };

    p.notifyChanged = function (evt) {
        switch (evt.type) {
            case XML3D.events.THIS_REMOVED:
                this.dispose();
                break;
            case XML3D.events.VALUE_MODIFIED:
                var target = evt.wrapped.attrName;

                switch (target) {
                    case "orientation":
                        this.renderNode.updateOrientation(this.node.orientation.toMatrix()._data);
                        break;
                    case "position":
                        this.renderNode.updatePosition(this.node.position._data);
                        break;
                    case "fieldOfView":
                        this.renderNode.updateFieldOfView(this.node.fieldOfView);
                        break;
                    default:
                        XML3D.debug.logWarning("Unhandled value changed event in view adapter for attribute:" + target);
                }
                break;
            case XML3D.events.ADAPTER_HANDLE_CHANGED:
                switch (evt.key) {
                    case "perspective":
                        connectProjectionAdapter(this);
                        this.renderNode.setProjectionAdapter(this.getConnectedAdapter("perspective"));
                        break;

                    default:
                        XML3D.debug.logWarning("Unhandled adapter handle changed event in view adapter for parameter " + target);
                        break;
                }
        }
        this.factory.getRenderer().requestRedraw("View changed");
    };

    function connectProjectionAdapter(adapter){
        var href = adapter.node.getAttribute("perspective");
        if(href) {
            adapter.connectAdapterHandle("perspective", adapter.getAdapterHandle(href));
        } else {
            adapter.disconnectAdapterHandle("perspective");
        }
    }

    p.dispose = function() {
        this.getRenderNode().remove();
        this.clearAdapterHandles();
    }

    // Export to XML3D.webgl namespace
    XML3D.webgl.ViewRenderAdapter = ViewRenderAdapter;

}());
// Adapter for <shader>
(function (webgl) {

    /**
     * @param factory
     * @param {Element} node
     * @extends RenderAdapter
     * @constructor
     */
    var ShaderRenderAdapter = function (factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
        this.dataAdapter = XML3D.base.resourceManager.getAdapter(this.node, XML3D.data);
        /** @type webgl.ShaderInfo **/
        this.shaderInfo = this.createShaderInfo();
        this.templateId = this.shaderInfo.id;
    };

    XML3D.createClass(ShaderRenderAdapter, XML3D.webgl.RenderAdapter);
    XML3D.extend(ShaderRenderAdapter.prototype, {
        createShaderInfo: function () {
            return this.getScene().createShaderInfo({
                script: this.getShaderScriptURI(),
                data: this.getDataAdapter().getXflowNode()
            });
        },
        getShaderInfo: function () {
            return this.shaderInfo;
        },
        getShaderScriptURI: function () {
            return new XML3D.URI(this.node.getAttribute("script"));
        },
        getDataAdapter: function () {
            return this.dataAdapter;
        },
        notifyChanged: function (evt) {
            switch (evt.type) {
                case XML3D.events.NODE_INSERTED:
                case XML3D.events.NODE_REMOVED:
                    return;    // Not handled here
                case XML3D.events.THIS_REMOVED:
                    this.dispose();
                    return;
            }

            var target = evt.internalType || evt.attrName || evt.wrapped.attrName;

            switch (target) {
                case "script":
                    this.getShaderInfo().setScriptURI(this.getShaderScriptURI());
                    break;
                case "id":
                    this.notifyOppositeAdapters();
                    break;
                default:
                    XML3D.debug.logWarning("Unhandled mutation event in shader adapter for parameter '" + target + "'");
                    break;

            }
        },
        dispose: function () {

        }
    });

    // Export to XML3D.webgl namespace
    webgl.ShaderRenderAdapter = ShaderRenderAdapter;

}(XML3D.webgl));
(function() {
    //Adapter for <img>
    XML3D.webgl.ImgRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
        this.textureAdapter = factory.getAdapter(node.parentNode);
    };
    XML3D.createClass(XML3D.webgl.ImgRenderAdapter, XML3D.webgl.RenderAdapter);

    XML3D.webgl.ImgRenderAdapter.prototype.notifyChanged = function(evt) {
        this.textureAdapter.notifyChanged(evt);
    };
})();
//Adapter for <texture>
(function() {

    var TextureRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
        this.dataAdapter = XML3D.base.resourceManager.getAdapter(this.node, XML3D.data);
    };

    XML3D.createClass(TextureRenderAdapter, XML3D.webgl.RenderAdapter);

    TextureRenderAdapter.prototype.notifyChanged = function(evt) {
        var shaderAdapter = this.factory.getAdapter(this.node.parentElement);
        if (shaderAdapter)
            shaderAdapter.notifyChanged(evt);
    };

    TextureRenderAdapter.prototype.getDataTable = function() {
        return this.dataAdapter.createDataTable();
    };

    TextureRenderAdapter.prototype.destroy = function() {

    };

    TextureRenderAdapter.prototype.dispose = function(evt) {
        //TODO: tell renderer to dispose
    };

    XML3D.webgl.TextureRenderAdapter = TextureRenderAdapter;
}());
XML3D.webgl.MAX_MESH_INDEX_COUNT = 65535;

//Adapter for <mesh>
(function (webgl) {

    /**
     * @constructor
     */
    var MeshRenderAdapter = function (factory, node) {
        webgl.TransformableAdapter.call(this, factory, node);

        this.initializeEventAttributes();
        this.createRenderNode();
    };

    XML3D.createClass(MeshRenderAdapter, webgl.TransformableAdapter, {

        createRenderNode: function () {
            var dataAdapter = XML3D.base.resourceManager.getAdapter(this.node, XML3D.data);

            var parent = this.getParentRenderAdapter();
            var parentNode = parent.getRenderNode && parent.getRenderNode();

            this.renderNode = this.getScene().createRenderMesh({
                parent: parentNode,
                node: this.node,
                object: {
                    data: dataAdapter.getXflowNode(),
                    type: this.getMeshType()
                },
                name: this.node.id,
                visible: !this.node.visible ? false : undefined
            });
        var bbox = XML3D.math.bbox.create();
        this.renderNode.setObjectSpaceBoundingBox(bbox);

        },

        getMeshType: function() {
            return this.node.hasAttribute("type") ? this.node.getAttribute("type") : "triangles";
        },

        /**
         * @param {XML3D.events.Notification} evt
         */
        notifyChanged: function (evt) {
            switch(evt.type) {
                case XML3D.events.ADAPTER_HANDLE_CHANGED:
                    if (evt.key == "shader") {
                        this.updateShader(evt.adapter);
                        if (evt.handleStatus == XML3D.base.AdapterHandle.STATUS.NOT_FOUND) {
                            XML3D.debug.logWarning("Missing shader with id '" + evt.url + "', falling back to default shader.");
                        }
                    }
                    return;
                case  XML3D.events.NODE_INSERTED:
                    return;
                case XML3D.events.THIS_REMOVED:
                    this.dispose();
                    return;
                case XML3D.events.NODE_REMOVED:
                    // this.createPerObjectData();
                    return;
                case XML3D.events.VALUE_MODIFIED:
                    this.valueChanged(evt.wrapped);
            }
        },
        /**
         * @param {MutationEvent} evt
         */
        valueChanged: function(evt) {
            var target = evt.attrName;

            switch (target) {
                case "visible":
                    this.renderNode.setLocalVisible(evt.newValue === "true");
                    break;

                case "src":
                    // Handled by data component
                    break;

                case "type":
                    this.renderNode.setType(evt.newValue);
                    break;

                default:
                    XML3D.debug.logWarning("Unhandled mutation event in mesh adapter for parameter '" + target + "'", evt);
                    break;
            }

        },
        dispose: function () {
            this.getRenderNode().remove();
            this.clearAdapterHandles();
        }
    });



    // Interface methods

    XML3D.extend(MeshRenderAdapter.prototype, {
        /**
         * @return {window.XML3DBox}
         */
        getBoundingBox: function () {
            if (this.renderNode) {
            var bbox = new XML3D.math.bbox.create();
            this.renderNode.getObjectSpaceBoundingBox(bbox);
            return XML3D.math.bbox.asXML3DBox(bbox);
            }

            return new window.XML3DBox();
        },

        /**
         * @return {window.XML3DMatrix}
         */
        getWorldMatrix: function () {
            var m = new window.XML3DMatrix(),
                obj = this.renderNode;
            if (obj) {
                obj.getWorldMatrix(m._data);
            }
            return m;
        }
    });

    // Export to XML3D.webgl namespace
    webgl.MeshRenderAdapter = MeshRenderAdapter;

}(XML3D.webgl));
// Adapter for <group>
(function() {

    var GroupRenderAdapter = function(factory, node) {
        XML3D.webgl.TransformableAdapter.call(this, factory, node);
        this.initializeEventAttributes();
        this.factory = factory;
        this.updateTransformAdapter();
        this.createRenderNode();
    };

    XML3D.createClass(GroupRenderAdapter, XML3D.webgl.TransformableAdapter);

    var p = GroupRenderAdapter.prototype;

    p.createRenderNode = function() {
        //TODO: Shouldn't have to go through the renderer...
        var parent = this.getParentRenderAdapter();
        var parentNode = parent.getRenderNode && parent.getRenderNode();
        this.renderNode = this.getScene().createRenderGroup({
            parent: parentNode,
            shaderHandle: this.getShaderHandle(),
            visible: this.node.visible,
            name: this.node.id
        });
        this.updateLocalMatrix();
        var bbox = XML3D.math.bbox.create();
        this.renderNode.setWorldSpaceBoundingBox(bbox);
    };

    p.updateLocalMatrix = (function () {
        var IDENTITY = XML3D.math.mat4.create();
        return function () {
            var result = IDENTITY;
            var cssMatrix = XML3D.css.getCSSMatrix(this.node);
            if (cssMatrix) {
                result = XML3D.css.convertCssToMat4(cssMatrix);
            } else {
                var handle = this.getConnectedAdapter("transform");
                if (handle) {
                    result = handle.getMatrix("transform");
                }
            }
            this.renderNode.setLocalMatrix(result);
        };
    }());

    p.updateTransformAdapter = function() {
        var transformHref = this.node.transform;
        this.connectAdapterHandle("transform", this.getAdapterHandle(transformHref));
    };

    p.notifyChanged = function(evt) {
        if (evt.type !== XML3D.events.VALUE_MODIFIED) {
            return this.handleConnectedAdapterEvent(evt);
        }
        var target = evt.attrName || evt.wrapped.attrName;

        switch (target) {
        case "shader":
            this.disconnectAdapterHandle("shader");
            this.renderNode.setLocalShaderHandle(this.getShaderHandle());
            this.factory.renderer.requestRedraw("Group shader changed.");
            break;

        case "transform":
            //This group is now linked to a different transform node. We need to notify all
            //of its children with the new transformation matrix
            this.updateTransformAdapter();
            this.updateLocalMatrix();
            break;

        case "visible":
            this.renderNode.setLocalVisible(evt.wrapped.newValue === "true");
            this.factory.renderer.requestRedraw("Group visibility changed.");
            break;

        default:
            XML3D.debug.logWarning("Unhandled mutation event in group adapter for parameter '"+target+"'");
            break;
        };
    };

    p.handleConnectedAdapterEvent = function(evt) {
        switch(evt.type) {
            case XML3D.events.NODE_INSERTED:
                this.initElement(evt.wrapped.target);
                this.initChildElements(evt.wrapped.target);
                break;
            case XML3D.events.THIS_REMOVED:
                this.dispose();
                break;
            case XML3D.events.ADAPTER_HANDLE_CHANGED:
                if (evt.key === "transform") {
                    this.updateTransformAdapter();
                    this.updateLocalMatrix();
                } else if (evt.key === "shader") {
                    var handle = this.getShaderHandle();
                    this.renderNode.setLocalShaderHandle(handle);
                }
                break;
            default:
                XML3D.debug.logWarning("Unhandled connected adapter event for "+evt.key+" in shader adapter");
        }
    };

    p.getShaderHandle = function()
    {
        var shaderHref = this.node.shader;
        if(shaderHref == "")
        {
            var styleValue = this.node.getAttribute('style');
            if(styleValue) {
                var pattern    = /shader\s*:\s*url\s*\(\s*(\S+)\s*\)/i;
                var result = pattern.exec(styleValue);
                if(result)
                    shaderHref = result[1];
            }
        }
        if(shaderHref) {
            this.connectAdapterHandle("shader", this.getAdapterHandle(shaderHref));
            return this.getConnectedAdapterHandle("shader");
        }
    };

    p.dispose = function() {
        // Dispose all children as well
        this.traverse(function(adapter) {
            if (adapter && adapter.destroy)
                adapter.dispose();
        });
        this.getRenderNode().remove();
        this.clearAdapterHandles();
    };

    /* Interface methods */
    p.getBoundingBox = function() {
        var bbox = XML3D.math.bbox.create();
        this.renderNode.getWorldSpaceBoundingBox(bbox);
        return XML3D.math.bbox.asXML3DBox(bbox);
    };

    p.getLocalMatrix = function() {
        var m = new window.XML3DMatrix();
        this.renderNode.getLocalMatrix(m._data);
        return m;
    };

    var tmpIdMat = XML3D.math.mat4.create();

    p.getWorldMatrix = function() {
        var m = new window.XML3DMatrix();
        this.renderNode.getWorldMatrix(m._data);
        return m;
    };

    XML3D.webgl.GroupRenderAdapter = GroupRenderAdapter;
}());
(function (webgl) {

    /**
     * Adapter for <lightshader>
     * @constructor
     * @param {RenderAdapterFactory} factory
     * @param {Element} node
     */
    var LightShaderRenderAdapter = function (factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
        this.dataAdapter = XML3D.base.resourceManager.getAdapter(this.node, XML3D.data);
    };
    XML3D.createClass(LightShaderRenderAdapter, webgl.RenderAdapter, {
        getDataNode: function () {
            return this.dataAdapter.getXflowNode();
        },
        getLightType: function () {
            var script = this.node.getAttribute("script");
            if (script.indexOf("urn:xml3d:lightshader:") === 0) {
                return script.substring(22, script.length);
            } else {
                XML3D.debug.logError("Unsupported light type " + script);
                return null;
            }
        },
        notifyChanged: function (evt) {
            switch (evt.type) {
                case XML3D.events.THIS_REMOVED:
                    this.notifyOppositeAdapters();
                    break;
                case XML3D.events.VALUE_MODIFIED:
                    this.notifyOppositeAdapters(XML3D.events.ADAPTER_VALUE_CHANGED);
                    break;
            }
        }
    });

    // Export
    webgl.LightShaderRenderAdapter = LightShaderRenderAdapter;

})(XML3D.webgl);
(function(webgl) {

    /**
     * Adapter for <light>
     * @constructor
     * @param {RenderAdapterFactory} factory
     * @param {Element} node
     */
    var LightRenderAdapter = function(factory, node) {
        webgl.TransformableAdapter.call(this, factory, node);
        this.updateLightShader();
        this.createRenderNode();
    };
    XML3D.createClass(LightRenderAdapter, webgl.TransformableAdapter);

    LightRenderAdapter.prototype.createRenderNode = function () {
        var parentAdapter = this.getParentRenderAdapter();
        var parentNode = parentAdapter.getRenderNode && parentAdapter.getRenderNode();
        var lightShader = this.getLightShader();
        this.renderNode = this.factory.getScene().createRenderLight({
            light: {
                type: lightShader ? lightShader.getLightType() : null,
                data: lightShader ? lightShader.getDataNode() : null
            },
            parent: parentNode,
            shader: lightShader,
            visible: !this.node.visible ? false : undefined,
            localIntensity: this.node.intensity
        });
    };

    LightRenderAdapter.prototype.notifyChanged = function(evt) {
        switch (evt.type) {
            case XML3D.events.NODE_REMOVED:
                return;
            case XML3D.events.THIS_REMOVED:
                this.dispose();
                return;
            case XML3D.events.ADAPTER_HANDLE_CHANGED:
            if (evt.key == "shader") {
                //The lightshader was destroyed, so this light is now invalid
                this.renderNode.remove();
                return;
            }
                break;
            case XML3D.events.VALUE_MODIFIED:
                this.valueModified(evt.wrapped.attrName, evt.wrapped.newValue);
                break;
            case XML3D.events.ADAPTER_VALUE_CHANGED:
                this.renderNode.setLightType(evt.adapter.getLightType());
        }
    };

    LightRenderAdapter.prototype.valueModified = function(name, newValue) {
        switch(name) {
        case "visible":
            this.renderNode.setLocalVisible(newValue === "true");
            break;
        case "intensity":
            this.renderNode.setLocalIntensity(newValue);
            break;
        case "shader":
            this.renderNode.remove();
            this.updateLightShader();
            this.createRenderNode();
            break;
        }
    };

    LightRenderAdapter.prototype.updateLightShader = function(){
        var shaderHref = this.node.shader;
        if(!shaderHref)
        {
            var styleValue = this.node.getAttribute('style');
            if(styleValue){
                var pattern    = /shader\s*:\s*url\s*\(\s*(\S+)\s*\)/i;
                var result = pattern.exec(styleValue);
                if (result)
                    shaderHref = result[1];
            }
        }
        this.connectAdapterHandle("shader", this.getAdapterHandle(shaderHref));
    };

    /**
     *
     */
    LightRenderAdapter.prototype.getLightShader = function() {
        return this.getConnectedAdapter("shader");
    };

    LightRenderAdapter.prototype.dispose = function() {
        this.getRenderNode().remove();
        this.clearAdapterHandles();
    };

    /**
     * @return {XML3DMatrix}
     */
    LightRenderAdapter.prototype.getWorldMatrix = function() {
        var m = new window.XML3DMatrix();
        this.renderNode.getWorldMatrix(m._data);
        return m;
    };

    // Export to XML3D.webgl namespace
    webgl.LightRenderAdapter = LightRenderAdapter;

}(XML3D.webgl));// adapter/factory.js

(function() {
    /**
     * @constructor
     * @implements {XML3D.base.IFactory}
     * @extends XML3D.base.AdapterFactory
     * @param {XML3D.webgl.CanvasHandler} handler
     * @param {XML3D.webgl.Renderer} renderer
     */
    var RenderAdapterFactory = function(canvasId) {
        XML3D.base.NodeAdapterFactory.call(this, XML3D.webgl, canvasId);
        this.type = "RenderAdapterFactory";
    };
    XML3D.createClass(RenderAdapterFactory, XML3D.base.NodeAdapterFactory);
    RenderAdapterFactory.prototype.aspect = XML3D.webgl;
    XML3D.base.xml3dFormatHandler.registerFactoryClass(RenderAdapterFactory);

    var ns = XML3D.webgl,
        registry = {
            xml3d:          ns.XML3DRenderAdapter,
            view:           ns.ViewRenderAdapter,
            defs:           ns.DefsRenderAdapter,
            mesh:           ns.MeshRenderAdapter,
            data:           ns.DataRenderAdapter,
            transform:      ns.TransformRenderAdapter,
            shader:         ns.ShaderRenderAdapter,
            texture:        ns.TextureRenderAdapter,
            group:          ns.GroupRenderAdapter,
            img:            ns.ImgRenderAdapter,
            light:          ns.LightRenderAdapter,
            lightshader:    ns.LightShaderRenderAdapter

    };

    /**
     * @param node
     * @return {XML3D.base.Adapter|null}
     */
    RenderAdapterFactory.prototype.createAdapter = function(node) {
        var adapterConstructor = registry[node.localName];
        if(adapterConstructor !== undefined) {
            return new adapterConstructor(this, node);
        }
        return null;
    };

    RenderAdapterFactory.prototype.setScene = function(scene) {
        this.scene = scene;
    }

    RenderAdapterFactory.prototype.getScene = function() {
        return this.scene;
    }

    RenderAdapterFactory.prototype.setRenderer = function(renderer) {
        this.renderer = renderer;
    }

    RenderAdapterFactory.prototype.getRenderer = function() {
        return this.renderer;
    }

    // Export
    XML3D.webgl.RenderAdapterFactory = RenderAdapterFactory;
}());// renderer/shaders/base.js
(function() {
    "use strict";
     var shaders = {};
     var scripts = {};
     
     shaders.register = function(name, script) {
         scripts[name] = script;
         script.name = name;
     };
    
     shaders.getScript = function(script) {
         return scripts[script];
     };
     
     XML3D.shaders = shaders;
})();

XML3D.shaders.register("matte", {

    vertex: [
        "attribute vec3 position;",
        "attribute vec3 color;",

        "varying vec3 fragVertexColor;",

        "uniform mat4 modelViewProjectionMatrix;",

        "void main(void) {",
        "   fragVertexColor = color;",
        "   gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n"),

    fragment: [
        "uniform vec3 diffuseColor;",
        "uniform bool useVertexColor;",

        "varying vec3 fragVertexColor;",

        "void main(void) {",
        "    vec3 color = diffuseColor;",
        "    if (useVertexColor)",
        "       color *=  fragVertexColor;",
        "    gl_FragColor = vec4(diffuseColor, 1.0);",
        "}"
    ].join("\n"),

    uniforms: {
        diffuseColor : [1.0, 1.0, 1.0],
        useVertexColor: false
    },
    attributes: {
        color: null
    }
});

XML3D.shaders.register("flat", XML3D.shaders.getScript("matte"));
XML3D.shaders.register("diffuse", {

    vertex : [
        "attribute vec3 position;",
        "attribute vec3 normal;",
        "attribute vec3 color;",
        "attribute vec2 texcoord;",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragEyeVector;",
        "varying vec2 fragTexCoord;",
        "varying vec3 fragVertexColor;",

        "uniform mat4 modelViewProjectionMatrix;",
        "uniform mat4 modelViewMatrix;",
        "uniform mat3 normalMatrix;",
        "uniform vec3 eyePosition;",

        "void main(void) {",
        "    vec3 pos = position;",
        "    vec3 norm = normal;",

        "    gl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);",
        "    fragNormal = normalize(normalMatrix * norm);",
        "    fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;",
        "    fragEyeVector = normalize(fragVertexPosition);",
        "    fragTexCoord = texcoord;",
        "    fragVertexColor = color;",
        "}"
    ].join("\n"),

    fragment : [
        "uniform float ambientIntensity;",
        "uniform vec3 diffuseColor;",
        "uniform vec3 emissiveColor;",
        "uniform float transparency;",
        "uniform mat4 viewMatrix;",
        "uniform bool useVertexColor;",

        "#if HAS_EMISSIVETEXTURE",
        "uniform sampler2D emissiveTexture;",
        "#endif",
        "#if HAS_DIFFUSETEXTURE",
        "uniform sampler2D diffuseTexture;",
        "#endif",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragEyeVector;",
        "varying vec2 fragTexCoord;",
        "varying vec3 fragVertexColor;",

        "#if MAX_POINTLIGHTS > 0",
        "uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS];",
        "uniform vec3 pointLightPosition[MAX_POINTLIGHTS];",
        "uniform vec3 pointLightIntensity[MAX_POINTLIGHTS];",
        "uniform bool pointLightOn[MAX_POINTLIGHTS];",
        "#endif",

        "#if MAX_DIRECTIONALLIGHTS > 0",
        "uniform vec3 directionalLightDirection[MAX_DIRECTIONALLIGHTS];",
        "uniform vec3 directionalLightIntensity[MAX_DIRECTIONALLIGHTS];",
        "uniform bool directionalLightOn[MAX_DIRECTIONALLIGHTS];",
        "#endif",

        "#if MAX_SPOTLIGHTS > 0",
        "uniform vec3 spotLightAttenuation[MAX_SPOTLIGHTS];",
        "uniform vec3 spotLightPosition[MAX_SPOTLIGHTS];",
        "uniform vec3 spotLightIntensity[MAX_SPOTLIGHTS];",
        "uniform bool spotLightOn[MAX_SPOTLIGHTS];",
        "uniform vec3 spotLightDirection[MAX_SPOTLIGHTS];",
        "uniform float spotLightCosFalloffAngle[MAX_SPOTLIGHTS];",
        "uniform float spotLightCosSoftFalloffAngle[MAX_SPOTLIGHTS];",
        "uniform float spotLightSoftness[MAX_SPOTLIGHTS];",
        "#endif",

        "void main(void) {",
        "  float alpha =  max(0.0, 1.0 - transparency);",
        "  vec3 objDiffuse = diffuseColor;",
        "  if(useVertexColor)",
        "    objDiffuse *= fragVertexColor;",
        "  #if HAS_DIFFUSETEXTURE",
        "    vec4 texDiffuse = texture2D(diffuseTexture, fragTexCoord);",
        "    alpha *= texDiffuse.a;",
        "    objDiffuse *= texDiffuse.rgb;",
        "  #endif",
        "  if (alpha < 0.05) discard;",

        "  #if HAS_EMISSIVETEXTURE",
        "    vec3 color = emissiveColor * texture2D(emissiveTexture, fragTexCoord).rgb + (ambientIntensity * objDiffuse);",
        "  #else",
        "    vec3 color = emissiveColor + (ambientIntensity * objDiffuse);",
        "  #endif",

        "  #if MAX_POINTLIGHTS > 0",
        "    for (int i=0; i<MAX_POINTLIGHTS; i++) {",
        "      if (!pointLightOn[i])",
        "         continue;",
        "      vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
        "      vec3 L = lPosition.xyz - fragVertexPosition;",
        "      float dist = length(L);",
        "      L = normalize(L);",
        "      float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);",
        "      vec3 Idiff = pointLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);",
        "      color = color + atten*Idiff;",
        "    }",
        "  #endif",

        "#if MAX_DIRECTIONALLIGHTS > 0",
        "  for (int i=0; i<MAX_DIRECTIONALLIGHTS; i++) {",
        "      if (!directionalLightOn[i])",
        "         continue;",
        "    vec4 lDirection = viewMatrix * vec4(directionalLightDirection[i], 0.0);",
        "    vec3 L =  normalize(-lDirection.xyz);",
        "    vec3 Idiff = directionalLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);",
        "    color = color + Idiff;",
        "  }",
        "#endif",

        "#if MAX_SPOTLIGHTS > 0",
        "  for (int i=0; i<MAX_SPOTLIGHTS; i++) {",
        "      if (!spotLightOn[i])",
        "         continue;",
        "    vec4 lPosition = viewMatrix * vec4( spotLightPosition[ i ], 1.0 );",
        "    vec3 L = lPosition.xyz - fragVertexPosition;",
        "    float dist = length(L);",
        "    L = normalize(L);",
        "    float atten = 1.0 / (spotLightAttenuation[i].x + spotLightAttenuation[i].y * dist + spotLightAttenuation[i].z * dist * dist);",
        "    vec3 Idiff = spotLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);",
        "    float spot = 0.0;",
        "    vec4 lDirection = viewMatrix * vec4(spotLightDirection[i], 0.0);",
        "    vec3 D = normalize(lDirection.xyz);",
        "    float angle = dot(L, D);",
        "    if(angle > spotLightCosFalloffAngle[i]) {",
        "       float softness = 1.0;",
        "       if (angle < spotLightCosSoftFalloffAngle[i])",
        "           softness = (angle - spotLightCosFalloffAngle[i]) /  (spotLightCosSoftFalloffAngle[i] -  spotLightCosFalloffAngle[i]);",
        "       color += atten * softness * Idiff;",
        "    }",
        "  }",
        "#endif",

        "  gl_FragColor = vec4(color, alpha);",
        "}"
    ].join("\n"),

    addDirectives: function(directives, lights, params) {
        var pointLights = lights.point ? lights.point.length : 0;
        var directionalLights = lights.directional ? lights.directional.length : 0;
        var spotLights = lights.spot ? lights.spot.length : 0;
        directives.push("MAX_POINTLIGHTS " + pointLights);
        directives.push("MAX_DIRECTIONALLIGHTS " + directionalLights);
        directives.push("MAX_SPOTLIGHTS " + spotLights);
        directives.push("HAS_DIFFUSETEXTURE " + ('diffuseTexture' in params ? "1" : "0"));
        directives.push("HAS_EMISSIVETEXTURE " + ('emissiveTexture' in params ? "1" : "0"));
    },
    hasTransparency: function(params) {
        return params.transparency && params.transparency.getValue()[0] > 0.001;
    },
    uniforms: {
        diffuseColor    : [1.0, 1.0, 1.0],
        emissiveColor   : [0.0, 0.0, 0.0],
        transparency    : 0.0,
        ambientIntensity: 0.0,
        useVertexColor : false
    },
    samplers: {
        diffuseTexture : null,
        emissiveTexture : null
    },
    attributes: {
        normal : {
            required: true
        },
        texcoord: null,
        color: null
    }
});
XML3D.shaders.register("phong", {

    vertex : [
        "attribute vec3 position;",
        "attribute vec3 normal;",
        "attribute vec3 color;",
        "attribute vec2 texcoord;",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragEyeVector;",
        "varying vec2 fragTexCoord;",
        "varying vec3 fragVertexColor;",

        "uniform mat4 modelViewProjectionMatrix;",
        "uniform mat4 modelViewMatrix;",
        "uniform mat3 normalMatrix;",
        "uniform vec3 eyePosition;",

        "void main(void) {",
        "    vec3 pos = position;",
        "    vec3 norm = normal;",

        "    gl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);",
        "    fragNormal = normalize(normalMatrix * norm);",
        "    fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;",
        "    fragEyeVector = normalize(fragVertexPosition);",
        "    fragTexCoord = texcoord;",
        "    fragVertexColor = color;",
        "}"
    ].join("\n"),

    fragment : [
        "uniform float ambientIntensity;",
        "uniform vec3 diffuseColor;",
        "uniform vec3 emissiveColor;",
        "uniform float shininess;",
        "uniform vec3 specularColor;",
        "uniform float transparency;",
        "uniform mat4 viewMatrix;",
        "uniform bool useVertexColor;",

        "#if HAS_EMISSIVETEXTURE",
        "uniform sampler2D emissiveTexture;",
        "#endif",
        "#if HAS_DIFFUSETEXTURE",
        "uniform sampler2D diffuseTexture;",
        "#endif",
        "#if HAS_SPECULARTEXTURE",
        "uniform sampler2D specularTexture;",
        "#endif",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragEyeVector;",
        "varying vec2 fragTexCoord;",
        "varying vec3 fragVertexColor;",

        "#if MAX_POINTLIGHTS > 0",
        "uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS];",
        "uniform vec3 pointLightPosition[MAX_POINTLIGHTS];",
        "uniform vec3 pointLightIntensity[MAX_POINTLIGHTS];",
        "uniform bool pointLightOn[MAX_POINTLIGHTS];",
        "#endif",

        "#if MAX_DIRECTIONALLIGHTS > 0",
        "uniform vec3 directionalLightDirection[MAX_DIRECTIONALLIGHTS];",
        "uniform vec3 directionalLightIntensity[MAX_DIRECTIONALLIGHTS];",
        "uniform bool directionalLightOn[MAX_DIRECTIONALLIGHTS];",
        "#endif",

        "#if MAX_SPOTLIGHTS > 0",
        "uniform vec3 spotLightAttenuation[MAX_SPOTLIGHTS];",
        "uniform vec3 spotLightPosition[MAX_SPOTLIGHTS];",
        "uniform vec3 spotLightIntensity[MAX_SPOTLIGHTS];",
        "uniform bool spotLightOn[MAX_SPOTLIGHTS];",
        "uniform vec3 spotLightDirection[MAX_SPOTLIGHTS];",
        "uniform float spotLightCosFalloffAngle[MAX_SPOTLIGHTS];",
        "uniform float spotLightCosSoftFalloffAngle[MAX_SPOTLIGHTS];",
        "uniform float spotLightSoftness[MAX_SPOTLIGHTS];",
        "#endif",

        "void main(void) {",
        "  float alpha =  max(0.0, 1.0 - transparency);",
        "  vec3 objDiffuse = diffuseColor;",
        "  if(useVertexColor)",
        "    objDiffuse *= fragVertexColor;",
        "  #if HAS_DIFFUSETEXTURE",
        "    vec4 texDiffuse = texture2D(diffuseTexture, fragTexCoord);",
        "    alpha *= texDiffuse.a;",
        "    objDiffuse *= texDiffuse.rgb;",
        "  #endif",
        "  if (alpha < 0.05) discard;",
        "  #if HAS_EMISSIVETEXTURE",
        "    vec3 color = emissiveColor * texture2D(emissiveTexture, fragTexCoord).rgb + (ambientIntensity * objDiffuse);",
        "  #else",
        "    vec3 color = emissiveColor + (ambientIntensity * objDiffuse);",
        "  #endif",
        "  vec3 objSpecular = specularColor;",
        "  #if HAS_SPECULARTEXTURE",
        "    objSpecular = objSpecular * texture2D(specularTexture, fragTexCoord).rgb;",
        "  #endif",

        "#if MAX_POINTLIGHTS > 0",
        "  for (int i=0; i<MAX_POINTLIGHTS; i++) {",
        "    if(!pointLightOn[i])",
        "      continue;",
        "    vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
        "    vec3 L = lPosition.xyz - fragVertexPosition;",
        "    float dist = length(L);",
        "    L = normalize(L);",
        "    vec3 R = normalize(reflect(L,fragNormal));",
        "    float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);",
        "    vec3 Idiff = pointLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);",
        "    vec3 Ispec = pointLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);",
        "    color = color + (atten*(Idiff + Ispec));",
        "  }",
        "#endif",

        "#if MAX_DIRECTIONALLIGHTS > 0",
        "  for (int i=0; i<MAX_DIRECTIONALLIGHTS; i++) {",
        "    if(!directionalLightOn[i])",
        "      continue;",
        "    vec4 lDirection = viewMatrix * vec4(directionalLightDirection[i], 0.0);",
        "    vec3 L =  normalize(-lDirection.xyz);",
        "    vec3 R = normalize(reflect(L,fragNormal));",
        "    vec3 Idiff = directionalLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);",
        "    vec3 Ispec = directionalLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);",
        "    color = color + ((Idiff + Ispec));",
        "  }",
        "#endif",

        "#if MAX_SPOTLIGHTS > 0",
        "  for (int i=0; i<MAX_SPOTLIGHTS; i++) {",
        "    if(!spotLightOn[i])",
        "      continue;",
        "    vec4 lPosition = viewMatrix * vec4( spotLightPosition[ i ], 1.0 );",
        "    vec3 L = lPosition.xyz - fragVertexPosition;",
        "    float dist = length(L);",
        "    L = normalize(L);",
        "    vec3 R = normalize(reflect(L,fragNormal));",
        "    float atten = 1.0 / (spotLightAttenuation[i].x + spotLightAttenuation[i].y * dist + spotLightAttenuation[i].z * dist * dist);",
        "    vec3 Idiff = spotLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);",
        "    vec3 Ispec = spotLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);",
        "    float spot = 0.0;",
        "    vec4 lDirection = viewMatrix * vec4(spotLightDirection[i], 0.0);",
        "    vec3 D = normalize(lDirection.xyz);",
        "    float angle = dot(L, D);",
        "    if(angle > spotLightCosFalloffAngle[i]) {",
        "       float softness = 1.0;",
        "       if (angle < spotLightCosSoftFalloffAngle[i])",
        "           softness = (angle - spotLightCosFalloffAngle[i]) /  (spotLightCosSoftFalloffAngle[i] -  spotLightCosFalloffAngle[i]);",
        "       color += atten*softness*(Idiff + Ispec);",
        "    }",
        "  }",
        "#endif",

        "  gl_FragColor = vec4(color, alpha);",
        "}"
    ].join("\n"),

    addDirectives: function(directives, lights, params) {
        var pointLights = lights.point ? lights.point.length : 0;
        var directionalLights = lights.directional ? lights.directional.length : 0;
        var spotLights = lights.spot ? lights.spot.length : 0;
        directives.push("MAX_POINTLIGHTS " + pointLights);
        directives.push("MAX_DIRECTIONALLIGHTS " + directionalLights);
        directives.push("MAX_SPOTLIGHTS " + spotLights);
        directives.push("HAS_DIFFUSETEXTURE " + ('diffuseTexture' in params ? "1" : "0"));
        directives.push("HAS_SPECULARTEXTURE " + ('specularTexture' in params ? "1" : "0"));
        directives.push("HAS_EMISSIVETEXTURE " + ('emissiveTexture' in params ? "1" : "0"));
    },
    hasTransparency: function(params) {
        return params.transparency && params.transparency.getValue()[0] > 0.001;
    },
    uniforms: {
        diffuseColor    : [1.0, 1.0, 1.0],
        emissiveColor   : [0.0, 0.0, 0.0],
        specularColor   : [0.0, 0.0, 0.0],
        transparency    : 0.0,
        shininess       : 0.2,
        ambientIntensity: 0.0,
        useVertexColor : false
    },

    samplers: {
        diffuseTexture : null,
        emissiveTexture : null,
        specularTexture : null
    },

    attributes: {
        normal : {
            required: true
        },
        texcoord: null,
        color: null
    }
});
XML3D.shaders.register("point", {

    vertex : [
        "attribute vec3 position;",
        "attribute vec3 color;",
        "attribute vec2 texcoord;",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragEyeVector;",
        "varying vec2 fragTexCoord;",
        "varying vec3 fragVertexColor;",

        "uniform mat4 modelViewProjectionMatrix;",
        "uniform mat4 modelViewMatrix;",
        "uniform mat4 projectionMatrix;",
        "uniform mat3 normalMatrix;",
        "uniform vec3 eyePosition;",
        "uniform float screenWidth;",
        "uniform float pointSize;",

        "void main(void) {",
        "    vec3 pos = position;",

        "    gl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);",
        "    fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;",
        "    fragEyeVector = normalize(fragVertexPosition);",
        "    fragTexCoord = texcoord;",
        "    fragVertexColor = color;",
        "    vec4 pos2 = vec4(fragVertexPosition, 1.0); pos2.x += pointSize;",
        "    gl_PointSize = distance( gl_Position.xy, (projectionMatrix * pos2).xy ) * screenWidth / gl_Position.w;",
        "}"
    ].join("\n"),

    fragment : [
        "uniform vec3 diffuseColor;",
        "uniform float transparency;",
        "uniform mat4 viewMatrix;",
        "uniform bool useVertexColor;",
        "uniform vec2 texCoordOffset;",
        "uniform vec2 texCoordSize;",

        "#if HAS_DIFFUSETEXTURE",
        "uniform sampler2D diffuseTexture;",
        "#endif",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragEyeVector;",
        "varying vec2 fragTexCoord;",
        "varying vec3 fragVertexColor;",

        "void main(void) {",
        "  float alpha =  max(0.0, 1.0 - transparency);",
        "  vec3 objDiffuse = diffuseColor;",
        "  if(useVertexColor)",
        "    objDiffuse *= fragVertexColor;",
        "  #if HAS_DIFFUSETEXTURE",
        "    vec2 texCoord = fragTexCoord + texCoordOffset + gl_PointCoord*texCoordSize;",
        "    texCoord.y = 1.0 - texCoord.y;",
        "    vec4 texDiffuse = texture2D(diffuseTexture, texCoord);",
        "    alpha *= texDiffuse.a;",
        "    objDiffuse *= texDiffuse.rgb;",
        "  #endif",
        "  if (alpha < 0.05) discard;",
        "  gl_FragColor = vec4(objDiffuse, alpha);",
        "}"
    ].join("\n"),
    addDirectives: function(directives, lights, params) {
        directives.push("HAS_DIFFUSETEXTURE " + ('diffuseTexture' in params ? "1" : "0"));
    },
    hasTransparency: function(params) {
        return params.transparency && params.transparency.getValue()[0] > 0.001;
    },
    uniforms: {
        diffuseColor: [1.0, 1.0, 1.0],
        texCoordOffset: [0, 0],
        texCoordSize: [1, 1],
        transparency: 0.0,
        useVertexColor: false,
        pointSize: 1.0
    },
    samplers: {
        diffuseTexture: null
    },
    attributes: {
        texcoord: null,
        color: null
    }
});
XML3D.shaders.register("pickobjectid", {
    vertex : [
        "attribute vec3 position;",
        "uniform mat4 modelViewProjectionMatrix;",

        "void main(void) {",
        "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n"),

    fragment : [
        "uniform vec3 id;",

        "void main(void) {",
        "    gl_FragColor = vec4(id, 0.0);",
        "}"
    ].join("\n"),

    uniforms : {}
});

XML3D.shaders.register("pickedposition", {
    vertex : [
        "attribute vec3 position;",
        "uniform mat4 modelMatrix;",
        "uniform mat4 modelViewProjectionMatrix;",
        "uniform vec3 bbox[2];",  // min = bbox[0], max = bbox[1]

        "varying vec3 worldCoord;",

        "void main(void) {",
        "    worldCoord = (modelMatrix * vec4(position, 1.0)).xyz;",
        "    vec3 diff = bbox[1] - bbox[0];",
        "    worldCoord = worldCoord - bbox[0];",
        "    worldCoord = worldCoord / diff;",
        "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n"),

    fragment : [
        "varying vec3 worldCoord;",

        "void main(void) {",
        "    gl_FragColor = vec4(worldCoord, 1.0);",
        "}"
    ].join("\n"),

    uniforms : {}
});


XML3D.shaders.register("pickedNormals", {
    vertex : [
        "attribute vec3 position;",
        "attribute vec3 normal;",
        "uniform mat4 modelViewProjectionMatrix;",
        "uniform mat3 normalMatrix;",

        "varying vec3 fragNormal;",

        "void main(void) {",
        "    fragNormal = normalize(normalMatrix * normal);",
        "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n"),

    fragment : [
        "varying vec3 fragNormal;",

        "void main(void) {",
        "    gl_FragColor = vec4((fragNormal+1.0)/2.0 * (254.0 / 255.0), 1.0);",
        "}"
    ].join("\n"),

    uniforms : {}
});