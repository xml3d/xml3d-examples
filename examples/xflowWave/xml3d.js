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

@version: DEVELOPMENT SNAPSHOT (18.06.2012 14:25:56 MESZ) 
**/
					
/** @namespace **/
var XML3D = XML3D || {};

/** @define {string} */
XML3D.version = 'DEVELOPMENT SNAPSHOT (18.06.2012 14:25:56 MESZ)';
/** @const */
XML3D.xml3dNS = 'http://www.xml3d.org/2009/xml3d';
/** @const */
XML3D.xhtmlNS = 'http://www.w3.org/1999/xhtml';
/** @const */
XML3D.webglNS = 'http://www.xml3d.org/2009/xml3d/webgl';
XML3D._xml3d = document.createElementNS(XML3D.xml3dNS, "xml3d");
XML3D._native = !!XML3D._xml3d.style;
XML3D._parallel = XML3D._parallel != undefined ? XML3D._parallel : false;

XML3D.extend = function (a, b) {
    for ( var prop in b ) {
        if ( b[prop] === undefined ) {
            delete a[prop];
        } else if ( prop !== "constructor" || a !== window ) {
            a[prop] = b[prop];
        }
    }
    return a;
};

XML3D.createClass = function(ctor, parent, methods) {
    methods = methods || {};
    if (parent) {
        var F = function() {};
        F.prototype = parent.prototype;
        ctor.prototype = new F();
        ctor.prototype.constructor = ctor;
        ctor.superclass = parent.prototype;
    }
    for (var m in methods) {
        ctor.prototype[m] = methods[m];
    }
    return ctor;
};
(function() {
	var onload = function() {
	    
        var debug = XML3D.debug.setup();
        debug && XML3D.debug.logInfo("xml3d.js version: " + XML3D.version);
        
        // Find all the XML3D tags in the document
		var xml3ds = document.getElementsByTagNameNS(XML3D.xml3dNS, 'xml3d');
		xml3ds = Array.map(xml3ds, function(n) { return n; });

		debug && XML3D.debug.logInfo("Found " + xml3ds.length + " xml3d nodes...");

		if (xml3ds.length) {
			if (XML3D._native) {
				debug && XML3D.debug.logInfo("Using native implementation.");
				return;
			}
		}

		if (!(XML3D.webgl && XML3D.webgl.supported()))
		{
			debug && XML3D.debug.logWarning("Could not initialise WebGL, sorry :-(");

			for(var i = 0; i < xml3ds.length; i++)
			{
				// Place xml3dElement inside an invisible div
				var hideDiv      = document.createElementNS(XML3D.xhtmlNS, 'div');
				var xml3dElement = xml3ds[i];

				xml3dElement.parentNode.insertBefore(hideDiv, xml3dElement);
				hideDiv.appendChild(xml3dElement);
				hideDiv.style.display = "none";

				var infoDiv = document.createElementNS(XML3D.xhtmlNS, 'div');
				infoDiv.setAttribute("class", xml3dElement.getAttribute("class"));
				infoDiv.setAttribute("style", xml3dElement.getAttribute("style"));
				infoDiv.style.border = "2px solid red";
				infoDiv.style.color  = "red";
				infoDiv.style.padding = "10px";
				infoDiv.style.backgroundColor = "rgba(255, 0, 0, 0.3)";


				var width = xml3dElement.getAttribute("width");
				if( width !== null)
				{
					infoDiv.style.width = width;
				}

				var height = xml3dElement.getAttribute("height");
				if( height !== null)
				{
					infoDiv.style.height = height;
				}

				var hElement = document.createElement("h3");
				var hTxt     = document.createTextNode("Your browser doesn't appear to support XML3D.");
				hElement.appendChild (hTxt);

				var pElement = document.createElement("p");
				pElement.appendChild(document.createTextNode("Please visit "));
				var link = document.createElement("a");
				link.setAttribute("href", "http://www.xml3d.org");
				link.appendChild(document.createTextNode("http://www.xml3d.org"));
				pElement.appendChild(link);
				pElement.appendChild(document.createTextNode(" to get information about browsers supporting XML3D."));
				infoDiv.appendChild (hElement);
				infoDiv.appendChild (pElement);

				hideDiv.parentNode.insertBefore(infoDiv, hideDiv);
			}

			return;
		}

        XML3D.config.configure(xml3ds);
        try {
            XML3D.webgl.configure(xml3ds);
        } catch (e) {
            debug && XML3D.debug.logError(e);
        }

		var ready = (function(eventType) {
			var evt = null;
			if (document.createEvent) {
				evt = document.createEvent("Events");
				evt.initEvent(eventType, true, true);
				document.dispatchEvent(evt);
			} else if (document.createEventObject) {
				evt = document.createEventObject();
				document.fireEvent('on' + eventType, evt);
			}
		})('load');
	};
	var onunload = function() {
		if (XML3D.document)
			XML3D.document.onunload();
	};
	window.addEventListener('load', onload, false);
	window.addEventListener('unload', onunload, false);
	window.addEventListener('reload', onunload, false);

})();




// utils/misc.js
XML3D.util = XML3D.util || {};

XML3D.util.getStyle = function(oElm, strCssRule) {
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

window.requestAnimFrame = (function(f,fps){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(){
              window.setTimeout(f, 1000 / fps);
            };
  })();// Add convienent array methods if non-existant
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
    doLog : function(msg, logType) {
        var params = XML3D.debug.params;
        if (params.xml3d_nolog || logType < XML3D.debug.loglevel) {
            return;
        }

        if (window.console) {
            switch (logType) {
            case XML3D.debug.INFO:
                window.console.info(msg);
                break;
            case XML3D.debug.WARNING:
                window.console.warn(msg);
                break;
            case XML3D.debug.ERROR:
                window.console.error(msg);
                break;
            case XML3D.debug.EXCEPTION:
                window.console.debug(msg);
                break;
            case XML3D.debug.DEBUG:
                window.console.debug(msg);
                break;
            default:
                break;
            }
        }
    },
    logDebug : function(msg) {
        XML3D.debug.doLog(msg, XML3D.debug.DEBUG);
    },
    logInfo : function(msg) {
        XML3D.debug.doLog(msg, XML3D.debug.INFO);
    },
    logWarning : function(msg) {
        XML3D.debug.doLog(msg, XML3D.debug.WARNING);
    },
    logError : function(msg) {
        XML3D.debug.doLog(msg, XML3D.debug.ERROR);
    },
    logException : function(msg) {
        XML3D.debug.doLog(msg, XML3D.debug.EXCEPTION);
    },
    assert : function(c, msg) {
        if (!c) {
            XML3D.debug.doLog("Assertion failed in "
                    + XML3D.debug.assert.caller.name + ': ' + msg,
                    XML3D.debug.WARNING);
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
    this.fragment = result[5] || null;
};

// Restore the URI to it's stringy glory.
XML3D.URI.prototype.toString = function() {
    var str = "";
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
XML3D.URIResolver.resolve = function(uri, document) {
    if (typeof uri == 'string')
        uri = new XML3D.URI(uri);
    document = document || window.document;

    if (uri.scheme == 'urn')
    {
        XML3D.debug.logInfo("++ Found URN." + uri);
        return null;
    }

    if (!uri.path && uri.fragment) { // local uri
        return document.getElementById(uri.fragment);
    }

    XML3D.debug.logWarning("++ Can't resolve URI: " + uri.toString());
    // TODO Resolve intra-document references
    return null;
};/*jslint white: false, onevar: false, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true, sub: true, nomen: false */

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

/* EOF *//* 
 * glMatrix.js - High performance matrix and vector operations for WebGL
 * version 0.9.5
 */
 
/*
 * Copyright (c) 2010 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

var glMatrixArrayType;
// Fallback for systems that don't support WebGL
if(typeof Float32Array != 'undefined') {
	glMatrixArrayType = Float32Array;
} else {
	glMatrixArrayType = Array;
}

/*
 * vec3 - 3 Dimensional Vector
 */
var vec3 = {};

/*
 * vec3.create
 * Creates a new instance of a vec3 using the default array type
 * Any javascript array containing at least 3 numeric elements can serve as a vec3
 *
 * Params:
 * vec - Optional, vec3 containing values to initialize with
 *
 * Returns:
 * New vec3
 */
vec3.create = function(vec) {
	var dest = new glMatrixArrayType(3);
	
	if(vec) {
		dest[0] = vec[0];
		dest[1] = vec[1];
		dest[2] = vec[2];
	}
	
	return dest;
};

/*
 * vec3.set
 * Copies the values of one vec3 to another
 *
 * Params:
 * vec - vec3 containing values to copy
 * dest - vec3 receiving copied values
 *
 * Returns:
 * dest
 */
vec3.set = function(vec, dest) {
	dest[0] = vec[0];
	dest[1] = vec[1];
	dest[2] = vec[2];
	
	return dest;
};

/*
 * vec3.add
 * Performs a vector addition
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.add = function(vec, vec2, dest) {
	if(!dest || vec == dest) {
		vec[0] += vec2[0];
		vec[1] += vec2[1];
		vec[2] += vec2[2];
		return vec;
	}
	
	dest[0] = vec[0] + vec2[0];
	dest[1] = vec[1] + vec2[1];
	dest[2] = vec[2] + vec2[2];
	return dest;
};

/*
 * vec3.subtract
 * Performs a vector subtraction
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.subtract = function(vec, vec2, dest) {
	if(!dest || vec == dest) {
		vec[0] -= vec2[0];
		vec[1] -= vec2[1];
		vec[2] -= vec2[2];
		return vec;
	}
	
	dest[0] = vec[0] - vec2[0];
	dest[1] = vec[1] - vec2[1];
	dest[2] = vec[2] - vec2[2];
	return dest;
};

/*
 * vec3.negate
 * Negates the components of a vec3
 *
 * Params:
 * vec - vec3 to negate
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.negate = function(vec, dest) {
	if(!dest) { dest = vec; }
	
	dest[0] = -vec[0];
	dest[1] = -vec[1];
	dest[2] = -vec[2];
	return dest;
};

/*
 * vec3.scale
 * Multiplies the components of a vec3 by a scalar value
 *
 * Params:
 * vec - vec3 to scale
 * val - Numeric value to scale by
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.scale = function(vec, val, dest) {
	if(!dest || vec == dest) {
		vec[0] *= val;
		vec[1] *= val;
		vec[2] *= val;
		return vec;
	}
	
	dest[0] = vec[0]*val;
	dest[1] = vec[1]*val;
	dest[2] = vec[2]*val;
	return dest;
};

/*
 * vec3.normalize
 * Generates a unit vector of the same direction as the provided vec3
 * If vector length is 0, returns [0, 0, 0]
 *
 * Params:
 * vec - vec3 to normalize
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.normalize = function(vec, dest) {
	if(!dest) { dest = vec; }
	
	var x = vec[0], y = vec[1], z = vec[2];
	var len = Math.sqrt(x*x + y*y + z*z);
	
	if (!len) {
		dest[0] = 0;
		dest[1] = 0;
		dest[2] = 0;
		return dest;
	} else if (len == 1) {
		dest[0] = x;
		dest[1] = y;
		dest[2] = z;
		return dest;
	}
	
	len = 1 / len;
	dest[0] = x*len;
	dest[1] = y*len;
	dest[2] = z*len;
	return dest;
};

/*
 * vec3.cross
 * Generates the cross product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.cross = function(vec, vec2, dest){
	if(!dest) { dest = vec; }
	
	var x = vec[0], y = vec[1], z = vec[2];
	var x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];
	
	dest[0] = y*z2 - z*y2;
	dest[1] = z*x2 - x*z2;
	dest[2] = x*y2 - y*x2;
	return dest;
};

/*
 * vec3.length
 * Caclulates the length of a vec3
 *
 * Params:
 * vec - vec3 to calculate length of
 *
 * Returns:
 * Length of vec
 */
vec3.length = function(vec){
	var x = vec[0], y = vec[1], z = vec[2];
	return Math.sqrt(x*x + y*y + z*z);
};

/*
 * vec3.dot
 * Caclulates the dot product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 *
 * Returns:
 * Dot product of vec and vec2
 */
vec3.dot = function(vec, vec2){
	return vec[0]*vec2[0] + vec[1]*vec2[1] + vec[2]*vec2[2];
};

/*
 * vec3.direction
 * Generates a unit vector pointing from one vector to another
 *
 * Params:
 * vec - origin vec3
 * vec2 - vec3 to point to
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.direction = function(vec, vec2, dest) {
	if(!dest) { dest = vec; }
	
	var x = vec[0] - vec2[0];
	var y = vec[1] - vec2[1];
	var z = vec[2] - vec2[2];
	
	var len = Math.sqrt(x*x + y*y + z*z);
	if (!len) { 
		dest[0] = 0; 
		dest[1] = 0; 
		dest[2] = 0;
		return dest; 
	}
	
	len = 1 / len;
	dest[0] = x * len; 
	dest[1] = y * len; 
	dest[2] = z * len;
	return dest; 
};

/*
 * vec3.lerp
 * Performs a linear interpolation between two vec3
 *
 * Params:
 * vec - vec3, first vector
 * vec2 - vec3, second vector
 * lerp - interpolation amount between the two inputs
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.lerp = function(vec, vec2, lerp, dest){
    if(!dest) { dest = vec; }
    
    dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
    dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
    dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);
    
    return dest;
}

/*
 * vec3.str
 * Returns a string representation of a vector
 *
 * Params:
 * vec - vec3 to represent as a string
 *
 * Returns:
 * string representation of vec
 */
vec3.str = function(vec) {
	return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']'; 
};

/*
 * mat3 - 3x3 Matrix
 */
var mat3 = {};

/*
 * mat3.create
 * Creates a new instance of a mat3 using the default array type
 * Any javascript array containing at least 9 numeric elements can serve as a mat3
 *
 * Params:
 * mat - Optional, mat3 containing values to initialize with
 *
 * Returns:
 * New mat3
 */
mat3.create = function(mat) {
	var dest = new glMatrixArrayType(9);
	
	if(mat) {
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		dest[8] = mat[8];
		dest[9] = mat[9];
	}
	
	return dest;
};

/*
 * mat3.set
 * Copies the values of one mat3 to another
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - mat3 receiving copied values
 *
 * Returns:
 * dest
 */
mat3.set = function(mat, dest) {
	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[3];
	dest[4] = mat[4];
	dest[5] = mat[5];
	dest[6] = mat[6];
	dest[7] = mat[7];
	dest[8] = mat[8];
	return dest;
};

/*
 * mat3.identity
 * Sets a mat3 to an identity matrix
 *
 * Params:
 * dest - mat3 to set
 *
 * Returns:
 * dest
 */
mat3.identity = function(dest) {
	dest[0] = 1;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 1;
	dest[5] = 0;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = 1;
	return dest;
};

/*
 * mat4.transpose
 * Transposes a mat3 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat3 to transpose
 * dest - Optional, mat3 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat3.transpose = function(mat, dest) {
	// If we are transposing ourselves we can skip a few steps but have to cache some values
	if(!dest || mat == dest) { 
		var a01 = mat[1], a02 = mat[2];
		var a12 = mat[5];
		
        mat[1] = mat[3];
        mat[2] = mat[6];
        mat[3] = a01;
        mat[5] = mat[7];
        mat[6] = a02;
        mat[7] = a12;
		return mat;
	}
	
	dest[0] = mat[0];
	dest[1] = mat[3];
	dest[2] = mat[6];
	dest[3] = mat[1];
	dest[4] = mat[4];
	dest[5] = mat[7];
	dest[6] = mat[2];
	dest[7] = mat[5];
	dest[8] = mat[8];
	return dest;
};

/*
 * mat3.toMat4
 * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat3.toMat4 = function(mat, dest) {
	if(!dest) { dest = mat4.create(); }
	
	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = 0;

	dest[4] = mat[3];
	dest[5] = mat[4];
	dest[6] = mat[5];
	dest[7] = 0;

	dest[8] = mat[6];
	dest[9] = mat[7];
	dest[10] = mat[8];
	dest[11] = 0;

	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;
	
	return dest;
}

/*
 * mat3.str
 * Returns a string representation of a mat3
 *
 * Params:
 * mat - mat3 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat3.str = function(mat) {
	return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + 
		', ' + mat[3] + ', '+ mat[4] + ', ' + mat[5] + 
		', ' + mat[6] + ', ' + mat[7] + ', '+ mat[8] + ']';
};

/*
 * mat4 - 4x4 Matrix
 */
var mat4 = {};

/*
 * mat4.create
 * Creates a new instance of a mat4 using the default array type
 * Any javascript array containing at least 16 numeric elements can serve as a mat4
 *
 * Params:
 * mat - Optional, mat4 containing values to initialize with
 *
 * Returns:
 * New mat4
 */
mat4.create = function(mat) {
	var dest = new glMatrixArrayType(16);
	
	if(mat) {
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		dest[8] = mat[8];
		dest[9] = mat[9];
		dest[10] = mat[10];
		dest[11] = mat[11];
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}
	
	return dest;
};

/*
 * mat4.set
 * Copies the values of one mat4 to another
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - mat4 receiving copied values
 *
 * Returns:
 * dest
 */
mat4.set = function(mat, dest) {
	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[3];
	dest[4] = mat[4];
	dest[5] = mat[5];
	dest[6] = mat[6];
	dest[7] = mat[7];
	dest[8] = mat[8];
	dest[9] = mat[9];
	dest[10] = mat[10];
	dest[11] = mat[11];
	dest[12] = mat[12];
	dest[13] = mat[13];
	dest[14] = mat[14];
	dest[15] = mat[15];
	return dest;
};

/*
 * mat4.identity
 * Sets a mat4 to an identity matrix
 *
 * Params:
 * dest - mat4 to set
 *
 * Returns:
 * dest
 */
mat4.identity = function(dest) {
	dest[0] = 1;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 0;
	dest[5] = 1;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = 0;
	dest[9] = 0;
	dest[10] = 1;
	dest[11] = 0;
	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;
	return dest;
};

/*
 * mat4.transpose
 * Transposes a mat4 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat4 to transpose
 * dest - Optional, mat4 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.transpose = function(mat, dest) {
	// If we are transposing ourselves we can skip a few steps but have to cache some values
	if(!dest || mat == dest) { 
		var a01 = mat[1], a02 = mat[2], a03 = mat[3];
		var a12 = mat[6], a13 = mat[7];
		var a23 = mat[11];
		
		mat[1] = mat[4];
		mat[2] = mat[8];
		mat[3] = mat[12];
		mat[4] = a01;
		mat[6] = mat[9];
		mat[7] = mat[13];
		mat[8] = a02;
		mat[9] = a12;
		mat[11] = mat[14];
		mat[12] = a03;
		mat[13] = a13;
		mat[14] = a23;
		return mat;
	}
	
	dest[0] = mat[0];
	dest[1] = mat[4];
	dest[2] = mat[8];
	dest[3] = mat[12];
	dest[4] = mat[1];
	dest[5] = mat[5];
	dest[6] = mat[9];
	dest[7] = mat[13];
	dest[8] = mat[2];
	dest[9] = mat[6];
	dest[10] = mat[10];
	dest[11] = mat[14];
	dest[12] = mat[3];
	dest[13] = mat[7];
	dest[14] = mat[11];
	dest[15] = mat[15];
	return dest;
};

/*
 * mat4.determinant
 * Calculates the determinant of a mat4
 *
 * Params:
 * mat - mat4 to calculate determinant of
 *
 * Returns:
 * determinant of mat
 */
mat4.determinant = function(mat) {
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

	return	a30*a21*a12*a03 - a20*a31*a12*a03 - a30*a11*a22*a03 + a10*a31*a22*a03 +
			a20*a11*a32*a03 - a10*a21*a32*a03 - a30*a21*a02*a13 + a20*a31*a02*a13 +
			a30*a01*a22*a13 - a00*a31*a22*a13 - a20*a01*a32*a13 + a00*a21*a32*a13 +
			a30*a11*a02*a23 - a10*a31*a02*a23 - a30*a01*a12*a23 + a00*a31*a12*a23 +
			a10*a01*a32*a23 - a00*a11*a32*a23 - a20*a11*a02*a33 + a10*a21*a02*a33 +
			a20*a01*a12*a33 - a00*a21*a12*a33 - a10*a01*a22*a33 + a00*a11*a22*a33;
};

/*
 * mat4.inverse
 * Calculates the inverse matrix of a mat4
 *
 * Params:
 * mat - mat4 to calculate inverse of
 * dest - Optional, mat4 receiving inverse matrix. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.inverse = function(mat, dest) {
	if(!dest) { dest = mat; }
	
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
	
	var b00 = a00*a11 - a01*a10;
	var b01 = a00*a12 - a02*a10;
	var b02 = a00*a13 - a03*a10;
	var b03 = a01*a12 - a02*a11;
	var b04 = a01*a13 - a03*a11;
	var b05 = a02*a13 - a03*a12;
	var b06 = a20*a31 - a21*a30;
	var b07 = a20*a32 - a22*a30;
	var b08 = a20*a33 - a23*a30;
	var b09 = a21*a32 - a22*a31;
	var b10 = a21*a33 - a23*a31;
	var b11 = a22*a33 - a23*a32;
	
	// Calculate the determinant (inlined to avoid double-caching)
	var invDet = 1/(b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);
	
	dest[0] = (a11*b11 - a12*b10 + a13*b09)*invDet;
	dest[1] = (-a01*b11 + a02*b10 - a03*b09)*invDet;
	dest[2] = (a31*b05 - a32*b04 + a33*b03)*invDet;
	dest[3] = (-a21*b05 + a22*b04 - a23*b03)*invDet;
	dest[4] = (-a10*b11 + a12*b08 - a13*b07)*invDet;
	dest[5] = (a00*b11 - a02*b08 + a03*b07)*invDet;
	dest[6] = (-a30*b05 + a32*b02 - a33*b01)*invDet;
	dest[7] = (a20*b05 - a22*b02 + a23*b01)*invDet;
	dest[8] = (a10*b10 - a11*b08 + a13*b06)*invDet;
	dest[9] = (-a00*b10 + a01*b08 - a03*b06)*invDet;
	dest[10] = (a30*b04 - a31*b02 + a33*b00)*invDet;
	dest[11] = (-a20*b04 + a21*b02 - a23*b00)*invDet;
	dest[12] = (-a10*b09 + a11*b07 - a12*b06)*invDet;
	dest[13] = (a00*b09 - a01*b07 + a02*b06)*invDet;
	dest[14] = (-a30*b03 + a31*b01 - a32*b00)*invDet;
	dest[15] = (a20*b03 - a21*b01 + a22*b00)*invDet;
	
	return dest;
};

/*
 * mat4.toRotationMat
 * Copies the upper 3x3 elements of a mat4 into another mat4
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat4 otherwise
 */
mat4.toRotationMat = function(mat, dest) {
	if(!dest) { dest = mat4.create(); }
	
	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[3];
	dest[4] = mat[4];
	dest[5] = mat[5];
	dest[6] = mat[6];
	dest[7] = mat[7];
	dest[8] = mat[8];
	dest[9] = mat[9];
	dest[10] = mat[10];
	dest[11] = mat[11];
	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;
	
	return dest;
};

/*
 * mat4.toMat3
 * Copies the upper 3x3 elements of a mat4 into a mat3
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat3 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toMat3 = function(mat, dest) {
	if(!dest) { dest = mat3.create(); }
	
	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[4];
	dest[4] = mat[5];
	dest[5] = mat[6];
	dest[6] = mat[8];
	dest[7] = mat[9];
	dest[8] = mat[10];
	
	return dest;
};

/*
 * mat4.toInverseMat3
 * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
 * The resulting matrix is useful for calculating transformed normals
 *
 * Params:
 * mat - mat4 containing values to invert and copy
 * dest - Optional, mat3 receiving values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toInverseMat3 = function(mat, dest) {
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10];
	
	var b01 = a22*a11-a12*a21;
	var b11 = -a22*a10+a12*a20;
	var b21 = a21*a10-a11*a20;
		
	var d = a00*b01 + a01*b11 + a02*b21;
	if (!d) { return null; }
	var id = 1/d;
	
	if(!dest) { dest = mat3.create(); }
	
	dest[0] = b01*id;
	dest[1] = (-a22*a01 + a02*a21)*id;
	dest[2] = (a12*a01 - a02*a11)*id;
	dest[3] = b11*id;
	dest[4] = (a22*a00 - a02*a20)*id;
	dest[5] = (-a12*a00 + a02*a10)*id;
	dest[6] = b21*id;
	dest[7] = (-a21*a00 + a01*a20)*id;
	dest[8] = (a11*a00 - a01*a10)*id;
	
	return dest;
};

/*
 * mat4.multiply
 * Performs a matrix multiplication
 *
 * Params:
 * mat - mat4, first operand
 * mat2 - mat4, second operand
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.multiply = function(mat, mat2, dest) {
	if(!dest) { dest = mat }
	
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
	
	var b00 = mat2[0], b01 = mat2[1], b02 = mat2[2], b03 = mat2[3];
	var b10 = mat2[4], b11 = mat2[5], b12 = mat2[6], b13 = mat2[7];
	var b20 = mat2[8], b21 = mat2[9], b22 = mat2[10], b23 = mat2[11];
	var b30 = mat2[12], b31 = mat2[13], b32 = mat2[14], b33 = mat2[15];
	
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

/*
 * mat4.multiplyVec3
 * Transforms a vec3 with the given matrix
 * 4th vector component is implicitly '1'
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec3 = function(mat, vec, dest) {
	if(!dest) { dest = vec }
	
	var x = vec[0], y = vec[1], z = vec[2];
	
	dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
	dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
	dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
	
	return dest;
};

/*
 * mat4.multiplyVec4
 * Transforms a vec4 with the given matrix
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec4 to transform
 * dest - Optional, vec4 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec4 = function(mat, vec, dest) {
	if(!dest) { dest = vec }
	
	var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
	
	dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12]*w;
	dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13]*w;
	dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14]*w;
	dest[3] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15]*w;
	
	return dest;
};

/*
 * mat4.translate
 * Translates a matrix by the given vector
 *
 * Params:
 * mat - mat4 to translate
 * vec - vec3 specifying the translation
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.translate = function(mat, vec, dest) {
	var x = vec[0], y = vec[1], z = vec[2];
	
	if(!dest || mat == dest) {
		mat[12] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
		mat[13] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
		mat[14] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
		mat[15] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15];
		return mat;
	}
	
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	
	dest[0] = a00;
	dest[1] = a01;
	dest[2] = a02;
	dest[3] = a03;
	dest[4] = a10;
	dest[5] = a11;
	dest[6] = a12;
	dest[7] = a13;
	dest[8] = a20;
	dest[9] = a21;
	dest[10] = a22;
	dest[11] = a23;
	
	dest[12] = a00*x + a10*y + a20*z + mat[12];
	dest[13] = a01*x + a11*y + a21*z + mat[13];
	dest[14] = a02*x + a12*y + a22*z + mat[14];
	dest[15] = a03*x + a13*y + a23*z + mat[15];
	return dest;
};

/*
 * mat4.scale
 * Scales a matrix by the given vector
 *
 * Params:
 * mat - mat4 to scale
 * vec - vec3 specifying the scale for each axis
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.scale = function(mat, vec, dest) {
	var x = vec[0], y = vec[1], z = vec[2];
	
	if(!dest || mat == dest) {
		mat[0] *= x;
		mat[1] *= x;
		mat[2] *= x;
		mat[3] *= x;
		mat[4] *= y;
		mat[5] *= y;
		mat[6] *= y;
		mat[7] *= y;
		mat[8] *= z;
		mat[9] *= z;
		mat[10] *= z;
		mat[11] *= z;
		return mat;
	}
	
	dest[0] = mat[0]*x;
	dest[1] = mat[1]*x;
	dest[2] = mat[2]*x;
	dest[3] = mat[3]*x;
	dest[4] = mat[4]*y;
	dest[5] = mat[5]*y;
	dest[6] = mat[6]*y;
	dest[7] = mat[7]*y;
	dest[8] = mat[8]*z;
	dest[9] = mat[9]*z;
	dest[10] = mat[10]*z;
	dest[11] = mat[11]*z;
	dest[12] = mat[12];
	dest[13] = mat[13];
	dest[14] = mat[14];
	dest[15] = mat[15];
	return dest;
};

/*
 * mat4.rotate
 * Rotates a matrix by the given angle around the specified axis
 * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * axis - vec3 representing the axis to rotate around 
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotate = function(mat, angle, axis, dest) {
	var x = axis[0], y = axis[1], z = axis[2];
	var len = Math.sqrt(x*x + y*y + z*z);
	if (!len) { return null; }
	if (len != 1) {
		len = 1 / len;
		x *= len; 
		y *= len; 
		z *= len;
	}
	
	var s = Math.sin(angle);
	var c = Math.cos(angle);
	var t = 1-c;
	
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	
	// Construct the elements of the rotation matrix
	var b00 = x*x*t + c, b01 = y*x*t + z*s, b02 = z*x*t - y*s;
	var b10 = x*y*t - z*s, b11 = y*y*t + c, b12 = z*y*t + x*s;
	var b20 = x*z*t + y*s, b21 = y*z*t - x*s, b22 = z*z*t + c;
	
	if(!dest) { 
		dest = mat 
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}
	
	// Perform rotation-specific matrix multiplication
	dest[0] = a00*b00 + a10*b01 + a20*b02;
	dest[1] = a01*b00 + a11*b01 + a21*b02;
	dest[2] = a02*b00 + a12*b01 + a22*b02;
	dest[3] = a03*b00 + a13*b01 + a23*b02;
	
	dest[4] = a00*b10 + a10*b11 + a20*b12;
	dest[5] = a01*b10 + a11*b11 + a21*b12;
	dest[6] = a02*b10 + a12*b11 + a22*b12;
	dest[7] = a03*b10 + a13*b11 + a23*b12;
	
	dest[8] = a00*b20 + a10*b21 + a20*b22;
	dest[9] = a01*b20 + a11*b21 + a21*b22;
	dest[10] = a02*b20 + a12*b21 + a22*b22;
	dest[11] = a03*b20 + a13*b21 + a23*b22;
	return dest;
};

/*
 * mat4.rotateX
 * Rotates a matrix by the given angle around the X axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateX = function(mat, angle, dest) {
	var s = Math.sin(angle);
	var c = Math.cos(angle);
	
	// Cache the matrix values (makes for huge speed increases!)
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

	if(!dest) { 
		dest = mat 
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}
	
	// Perform axis-specific matrix multiplication
	dest[4] = a10*c + a20*s;
	dest[5] = a11*c + a21*s;
	dest[6] = a12*c + a22*s;
	dest[7] = a13*c + a23*s;
	
	dest[8] = a10*-s + a20*c;
	dest[9] = a11*-s + a21*c;
	dest[10] = a12*-s + a22*c;
	dest[11] = a13*-s + a23*c;
	return dest;
};

/*
 * mat4.rotateY
 * Rotates a matrix by the given angle around the Y axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateY = function(mat, angle, dest) {
	var s = Math.sin(angle);
	var c = Math.cos(angle);
	
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	
	if(!dest) { 
		dest = mat 
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}
	
	// Perform axis-specific matrix multiplication
	dest[0] = a00*c + a20*-s;
	dest[1] = a01*c + a21*-s;
	dest[2] = a02*c + a22*-s;
	dest[3] = a03*c + a23*-s;
	
	dest[8] = a00*s + a20*c;
	dest[9] = a01*s + a21*c;
	dest[10] = a02*s + a22*c;
	dest[11] = a03*s + a23*c;
	return dest;
};

/*
 * mat4.rotateZ
 * Rotates a matrix by the given angle around the Z axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateZ = function(mat, angle, dest) {
	var s = Math.sin(angle);
	var c = Math.cos(angle);
	
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	
	if(!dest) { 
		dest = mat 
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
		dest[8] = mat[8];
		dest[9] = mat[9];
		dest[10] = mat[10];
		dest[11] = mat[11];
		
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}
	
	// Perform axis-specific matrix multiplication
	dest[0] = a00*c + a10*s;
	dest[1] = a01*c + a11*s;
	dest[2] = a02*c + a12*s;
	dest[3] = a03*c + a13*s;
	
	dest[4] = a00*-s + a10*c;
	dest[5] = a01*-s + a11*c;
	dest[6] = a02*-s + a12*c;
	dest[7] = a03*-s + a13*c;
	
	return dest;
};

/*
 * mat4.frustum
 * Generates a frustum matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.frustum = function(left, right, bottom, top, near, far, dest) {
	if(!dest) { dest = mat4.create(); }
	var rl = (right - left);
	var tb = (top - bottom);
	var fn = (far - near);
	dest[0] = (near*2) / rl;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 0;
	dest[5] = (near*2) / tb;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = (right + left) / rl;
	dest[9] = (top + bottom) / tb;
	dest[10] = -(far + near) / fn;
	dest[11] = -1;
	dest[12] = 0;
	dest[13] = 0;
	dest[14] = -(far*near*2) / fn;
	dest[15] = 0;
	return dest;
};

/*
 * mat4.perspective
 * Generates a perspective projection matrix with the given bounds
 *
 * Params:
 * fovy - scalar, vertical field of view
 * aspect - scalar, aspect ratio. typically viewport width/height
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.perspective = function(fovy, aspect, near, far, dest) {
	var top = near*Math.tan(fovy*Math.PI / 360.0);
	var right = top*aspect;
	return mat4.frustum(-right, right, -top, top, near, far, dest);
};

/*
 * mat4.ortho
 * Generates a orthogonal projection matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.ortho = function(left, right, bottom, top, near, far, dest) {
	if(!dest) { dest = mat4.create(); }
	var rl = (right - left);
	var tb = (top - bottom);
	var fn = (far - near);
	dest[0] = 2 / rl;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 0;
	dest[5] = 2 / tb;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = 0;
	dest[9] = 0;
	dest[10] = -2 / fn;
	dest[11] = 0;
	dest[12] = -(left + right) / rl;
	dest[13] = -(top + bottom) / tb;
	dest[14] = -(far + near) / fn;
	dest[15] = 1;
	return dest;
};

/*
 * mat4.ortho
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * Params:
 * eye - vec3, position of the viewer
 * center - vec3, point the viewer is looking at
 * up - vec3 pointing "up"
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.lookAt = function(eye, center, up, dest) {
	if(!dest) { dest = mat4.create(); }
	
	var eyex = eye[0],
		eyey = eye[1],
		eyez = eye[2],
		upx = up[0],
		upy = up[1],
		upz = up[2],
		centerx = center[0],
		centery = center[1],
		centerz = center[2];

	if (eyex == centerx && eyey == centery && eyez == centerz) {
		return mat4.identity(dest);
	}
	
	var z0,z1,z2,x0,x1,x2,y0,y1,y2,len;
	
	//vec3.direction(eye, center, z);
	z0 = eyex - center[0];
	z1 = eyey - center[1];
	z2 = eyez - center[2];
	
	// normalize (no check needed for 0 because of early return)
	len = 1/Math.sqrt(z0*z0 + z1*z1 + z2*z2);
	z0 *= len;
	z1 *= len;
	z2 *= len;
	
	//vec3.normalize(vec3.cross(up, z, x));
	x0 = upy*z2 - upz*z1;
	x1 = upz*z0 - upx*z2;
	x2 = upx*z1 - upy*z0;
	len = Math.sqrt(x0*x0 + x1*x1 + x2*x2);
	if (!len) {
		x0 = 0;
		x1 = 0;
		x2 = 0;
	} else {
		len = 1/len;
		x0 *= len;
		x1 *= len;
		x2 *= len;
	};
	
	//vec3.normalize(vec3.cross(z, x, y));
	y0 = z1*x2 - z2*x1;
	y1 = z2*x0 - z0*x2;
	y2 = z0*x1 - z1*x0;
	
	len = Math.sqrt(y0*y0 + y1*y1 + y2*y2);
	if (!len) {
		y0 = 0;
		y1 = 0;
		y2 = 0;
	} else {
		len = 1/len;
		y0 *= len;
		y1 *= len;
		y2 *= len;
	}
	
	dest[0] = x0;
	dest[1] = y0;
	dest[2] = z0;
	dest[3] = 0;
	dest[4] = x1;
	dest[5] = y1;
	dest[6] = z1;
	dest[7] = 0;
	dest[8] = x2;
	dest[9] = y2;
	dest[10] = z2;
	dest[11] = 0;
	dest[12] = -(x0*eyex + x1*eyey + x2*eyez);
	dest[13] = -(y0*eyex + y1*eyey + y2*eyez);
	dest[14] = -(z0*eyex + z1*eyey + z2*eyez);
	dest[15] = 1;
	
	return dest;
};

/*
 * mat4.str
 * Returns a string representation of a mat4
 *
 * Params:
 * mat - mat4 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat4.str = function(mat) {
	return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + 
		', '+ mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] + 
		', '+ mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] + 
		', '+ mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
};

/*
 * quat4 - Quaternions 
 */
var quat4 = {};

/*
 * quat4.create
 * Creates a new instance of a quat4 using the default array type
 * Any javascript array containing at least 4 numeric elements can serve as a quat4
 *
 * Params:
 * quat - Optional, quat4 containing values to initialize with
 *
 * Returns:
 * New quat4
 */
quat4.create = function(quat) {
	var dest = new glMatrixArrayType(4);
	
	if(quat) {
		dest[0] = quat[0];
		dest[1] = quat[1];
		dest[2] = quat[2];
		dest[3] = quat[3];
	}
	
	return dest;
};

/*
 * quat4.set
 * Copies the values of one quat4 to another
 *
 * Params:
 * quat - quat4 containing values to copy
 * dest - quat4 receiving copied values
 *
 * Returns:
 * dest
 */
quat4.set = function(quat, dest) {
	dest[0] = quat[0];
	dest[1] = quat[1];
	dest[2] = quat[2];
	dest[3] = quat[3];
	
	return dest;
};

/*
 * quat4.calculateW
 * Calculates the W component of a quat4 from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length. 
 * Any existing W component will be ignored. 
 *
 * Params:
 * quat - quat4 to calculate W component of
 * dest - Optional, quat4 receiving calculated values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.calculateW = function(quat, dest) {
	var x = quat[0], y = quat[1], z = quat[2];

	if(!dest || quat == dest) {
		quat[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
		return quat;
	}
	dest[0] = x;
	dest[1] = y;
	dest[2] = z;
	dest[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
	return dest;
}

/*
 * quat4.inverse
 * Calculates the inverse of a quat4
 *
 * Params:
 * quat - quat4 to calculate inverse of
 * dest - Optional, quat4 receiving inverse values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.inverse = function(quat, dest) {
	if(!dest || quat == dest) {
		quat[0] *= -1;
		quat[1] *= -1;
		quat[2] *= -1;
		return quat;
	}
	dest[0] = -quat[0];
	dest[1] = -quat[1];
	dest[2] = -quat[2];
	dest[3] = quat[3];
	return dest;
}

/*
 * quat4.length
 * Calculates the length of a quat4
 *
 * Params:
 * quat - quat4 to calculate length of
 *
 * Returns:
 * Length of quat
 */
quat4.length = function(quat) {
	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
	return Math.sqrt(x*x + y*y + z*z + w*w);
}

/*
 * quat4.normalize
 * Generates a unit quaternion of the same direction as the provided quat4
 * If quaternion length is 0, returns [0, 0, 0, 0]
 *
 * Params:
 * quat - quat4 to normalize
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.normalize = function(quat, dest) {
	if(!dest) { dest = quat; }
	
	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
	var len = Math.sqrt(x*x + y*y + z*z + w*w);
	if(len == 0) {
		dest[0] = 0;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		return dest;
	}
	len = 1/len;
	dest[0] = x * len;
	dest[1] = y * len;
	dest[2] = z * len;
	dest[3] = w * len;
	
	return dest;
}

/*
 * quat4.multiply
 * Performs a quaternion multiplication
 *
 * Params:
 * quat - quat4, first operand
 * quat2 - quat4, second operand
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.multiply = function(quat, quat2, dest) {
	if(!dest) { dest = quat; }
	
	var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3];
	var qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];
	
	dest[0] = qax*qbw + qaw*qbx + qay*qbz - qaz*qby;
	dest[1] = qay*qbw + qaw*qby + qaz*qbx - qax*qbz;
	dest[2] = qaz*qbw + qaw*qbz + qax*qby - qay*qbx;
	dest[3] = qaw*qbw - qax*qbx - qay*qby - qaz*qbz;
	
	return dest;
}

/*
 * quat4.multiplyVec3
 * Transforms a vec3 with the given quaternion
 *
 * Params:
 * quat - quat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
quat4.multiplyVec3 = function(quat, vec, dest) {
	if(!dest) { dest = vec; }
	
	var x = vec[0], y = vec[1], z = vec[2];
	var qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3];

	// calculate quat * vec
	var ix = qw*x + qy*z - qz*y;
	var iy = qw*y + qz*x - qx*z;
	var iz = qw*z + qx*y - qy*x;
	var iw = -qx*x - qy*y - qz*z;
	
	// calculate result * inverse quat
	dest[0] = ix*qw + iw*-qx + iy*-qz - iz*-qy;
	dest[1] = iy*qw + iw*-qy + iz*-qx - ix*-qz;
	dest[2] = iz*qw + iw*-qz + ix*-qy - iy*-qx;
	
	return dest;
}

/*
 * quat4.toMat3
 * Calculates a 3x3 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat3 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat3 otherwise
 */
quat4.toMat3 = function(quat, dest) {
	if(!dest) { dest = mat3.create(); }
	
	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

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

	dest[0] = 1 - (yy + zz);
	dest[1] = xy - wz;
	dest[2] = xz + wy;

	dest[3] = xy + wz;
	dest[4] = 1 - (xx + zz);
	dest[5] = yz - wx;

	dest[6] = xz - wy;
	dest[7] = yz + wx;
	dest[8] = 1 - (xx + yy);
	
	return dest;
}

/*
 * quat4.toMat4
 * Calculates a 4x4 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat4 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
quat4.toMat4 = function(quat, dest) {
	if(!dest) { dest = mat4.create(); }
	
	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

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

	dest[0] = 1 - (yy + zz);
	dest[1] = xy - wz;
	dest[2] = xz + wy;
	dest[3] = 0;

	dest[4] = xy + wz;
	dest[5] = 1 - (xx + zz);
	dest[6] = yz - wx;
	dest[7] = 0;

	dest[8] = xz - wy;
	dest[9] = yz + wx;
	dest[10] = 1 - (xx + yy);
	dest[11] = 0;

	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;
	
	return dest;
}

/*
 * quat4.slerp
 * Performs a spherical linear interpolation between two quat4
 *
 * Params:
 * quat - quat4, first quaternion
 * quat2 - quat4, second quaternion
 * slerp - interpolation amount between the two inputs
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.slerp = function(quat, quat2, slerp, dest) {
    if(!dest) { dest = quat; }
    
	var cosHalfTheta =  quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
	
	if (Math.abs(cosHalfTheta) >= 1.0){
	    if(dest != quat) {
		    dest[0] = quat[0];
		    dest[1] = quat[1];
		    dest[2] = quat[2];
		    dest[3] = quat[3];
		}
		return dest;
	}
	
	var halfTheta = Math.acos(cosHalfTheta);
	var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);

	if (Math.abs(sinHalfTheta) < 0.001){
		dest[0] = (quat[0]*0.5 + quat2[0]*0.5);
		dest[1] = (quat[1]*0.5 + quat2[1]*0.5);
		dest[2] = (quat[2]*0.5 + quat2[2]*0.5);
		dest[3] = (quat[3]*0.5 + quat2[3]*0.5);
		return dest;
	}
	
	var ratioA = Math.sin((1 - slerp)*halfTheta) / sinHalfTheta;
	var ratioB = Math.sin(slerp*halfTheta) / sinHalfTheta; 
	
	dest[0] = (quat[0]*ratioA + quat2[0]*ratioB);
	dest[1] = (quat[1]*ratioA + quat2[1]*ratioB);
	dest[2] = (quat[2]*ratioA + quat2[2]*ratioB);
	dest[3] = (quat[3]*ratioA + quat2[3]*ratioB);
	
	return dest;
}


/*
 * quat4.str
 * Returns a string representation of a quaternion
 *
 * Params:
 * quat - quat4 to represent as a string
 *
 * Returns:
 * string representation of quat
 */
quat4.str = function(quat) {
	return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']'; 
};

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

        if (typeof x == 'object' && x._data) {
            this._data[0] = x._data[0];
            this._data[1] = x._data[1];
            this._data[2] = x._data[2];
        } else {
            this._data[0] = x || 0;
            this._data[1] = y || 0;
            this._data[2] = z || 0;
        }

        this._callback = typeof cb == 'function' ? cb : 0;

    }, p = XML3DVec3.prototype;

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
     * The set method copies the values from other.
     * @param {XML3DVec3} other The other vector
     */
    p.set = function(other,y,z) {
        if(arguments.length == 1) {
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
(function($) {
    // Is native?
    if($) return;

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
     * @param {number=} x The x value (optional). Default: 0.
     * @param {number=} y The y value (optional). Default: 0.
     * @param {number=} z The z value (optional). Default: 0.
     * @param {function(XML3DVec3=)=} cb Called, if value has changed.
     *                                   Has this as first parameter.
     */
    var XML3DRotation = function(axis, angle, cb) {
        var that = this;
        this._data = new Float32Array(4);

        /** @private */
        this._callback = typeof cb == 'function' ? cb : 0;

        /** @private */
        var vec_cb = function() {
            that._updateQuaternion();
            if (that._callback)
                that._callback(that);
        };

        if (axis instanceof XML3DRotation) {
            this._axis = new window.XML3DVec3(0, 0, 1, vec_cb);
            this._angle = 0;
            this.setAxisAngle(axis.axis, axis.angle);
        } else {
            this._axis = axis ? new window.XML3DVec3(axis.x, axis.y, axis.z, vec_cb) : new window.XML3DVec3(0, 0, 1, vec_cb);
            /** @private */
            this._angle = angle || 0;
            this._updateQuaternion();
        }

    }, p = XML3DRotation.prototype;

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
            quat4.set([ 0, 0, 0, 1 ], this._data);
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
        var dest = quat4.create(), result = new XML3DRotation();
        quat4.slerp(this._data, rot1._data, t, dest);
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
     * The set method copies the values from other.
     * @param {XML3DRotation} other The other rotation
     */
    p.set = function(other) {
        this.setAxisAngle(other.axis, other.angle);
    };

    /**
     * Returns a XML3DMatrix that describes this 3D rotation in a 
     * 4x4 matrix representation.
     * @return {XML3DMatrix} Rotation matrix
     */
    p.toMatrix = function() {
      var q = quat4.create(this._data);
      // FIXME: We have to inverse the rotation to get the same
      // result as CSSMatrix::rotateAxisAngle
      // Not sure why this is, could you have a look at it? - Chris
      q[3] = -q[3];
      
      var m = new window.XML3DMatrix();
      quat4.toMat4(q, m._data);
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
        var dest = vec3.create(), result = new window.XML3DVec3();
        quat4.multiplyVec3(this._data, inputVector._data, result._data);
        return result;
    };
    
    /**
     * Replaces the existing rotation with the quaternion representation passed
     * as argument
     * @private
     * @param {Array} quat
     */
    p._setQuaternion = function(quat) {
        var s = Math.sqrt(1 - quat[3] * quat[3]);
        if (s < 0.001 || isNaN(s)) {
            this._axis._data[0] = 0;
            this._axis._data[1] = 0;
            this._axis._data[2] = 1;
            this._angle = 0;
        } else {
            s = 1 / s;
            this._axis._data[0] = quat[0] * s;
            this._axis._data[1] = quat[1] * s;
            this._axis._data[2] = quat[2] * s;
            this._angle = 2 * Math.acos(quat[3]);
        }
        this._data = quat4.create(quat);
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
        var result = new XML3DRotation(), q = quat4.create();
        quat4.multiply(this._data,rot1._data, q);
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

    XML3D.XML3DRotation = XML3DRotation;
    window.XML3DRotation = XML3DRotation;

}(XML3D._native));// box.js
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
(function($) {
    // Is native?
    if($) return;

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
            this._data = new Float32Array(arguments);
            this._callback = typeof cb == 'function' ? cb : 0;
        } else if (typeof m11 == 'object' && arguments.length == 1) {
            this._data = new Float32Array(m11._data);
        } else{
            this._data = new Float32Array( [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
                    0, 0, 0, 0, 1 ]);
            this._callback = typeof m11 == 'function' ? m11 : 0;
        }
    }, p = XML3DMatrix.prototype;

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
        mat4.multiply(this._data, secondMatrix._data, result._data);
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
        mat4.inverse(this._data, result._data);
        if (isNaN(result._data[0]))
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
            mat4.rotateZ(this._data, rotX, r._data);
            return r;    
        }
        mat4.rotateZ(this._data, rotZ, r._data);
        mat4.rotateY(r._data, rotY);
        mat4.rotateX(r._data, rotX);
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
        mat4.rotate(this._data, angle, [ x, y, z ], result._data);
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
        mat4.scale(this._data, [ scaleX, scaleY, scaleZ ], result._data);
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
        mat4.translate(this._data, [x,y,z], result._data);
        return result;
    };

    XML3D.XML3DMatrix = XML3DMatrix;
    if (!window.XML3DMatrix)
        window.XML3DMatrix = XML3DMatrix;

}(XML3D._native));
// ray.js
(function($) {
    // Is native?
    if($) return;

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

    }, p = XML3DRay.prototype;
    
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
//-----------------------------------------------------------------------------
// Adapter and Adapter factory
//-----------------------------------------------------------------------------

XML3D.data = XML3D.data || {};

XML3D.data.Adapter = function(factory, node) {
    this.factory = factory; // optional
    this.node = node; // optional
};

XML3D.data.Adapter.prototype.init = function() {
    // Init is called by the factory after adding the adapter to the node
};

XML3D.data.Adapter.prototype.notifyChanged = function(e) {
    // Notification from the data structure. e is of type
    // XML3D.Notification.
};
XML3D.data.Adapter.prototype.isAdapterFor = function(aType) {
    return false; // Needs to be overwritten
};

XML3D.data.AdapterFactory = function() {
};

XML3D.data.AdapterFactory.prototype.getAdapter = function(node, atype) {
    if (!node || node._configured === undefined)
        return null;
    var elemHandler = node._configured;
    var realType = atype || this.name;
    var adapter = elemHandler.adapters[realType];
    if(adapter !== undefined)
        return adapter;

    // No adapter found, try to create one
    adapter = this.createAdapter(node);
    if (adapter) {
        elemHandler.adapters[realType] = adapter;
        adapter.init();
    }
    return adapter;
};

XML3D.data.AdapterFactory.prototype.createAdapter = function(node) {
    return null;
};
(function() {

    var events = {
            NODE_INSERTED: 0,
            VALUE_MODIFIED:  1,
            NODE_REMOVED: 2,
            DANGLING_REFERENCE: 3,
            VALID_REFERENCE: 4,
            THIS_REMOVED: 5
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
  events.NotificationWrapper = function(evt, type) {
      this.wrapped = evt;
      this.type = type;
  };
  var NWp = events.NotificationWrapper.prototype;

  NWp.toString = function() {
      return "NotificationWrapper (type:" + this.type + ", wrapped: "+ this.wrapped +")";
  };

  events.ReferenceNotification = function(element, attribute, uri) {
      this.relatedNode = element;
      this.attrName = attribute;
      this.value = null;

      if (typeof uri == 'string') {
          uri = new XML3D.URI(uri);
      }
      if (uri && uri.valid) {
          if(uri.scheme == 'urn') {
              this.type = events.VALID_REFERENCE;
          } else {
              this.value = XML3D.URIResolver.resolve(uri);
              XML3D.debug.logDebug("Resolved node: #" + uri.fragment);
              this.type = this.value ? events.VALID_REFERENCE : events.DANGLING_REFERENCE;
          }
      } else {
          this.type = events.DANGLING_REFERENCE;
      }
  };
  var RNp = events.ReferenceNotification.prototype;

  RNp.toString = function() {
      return "ReferenceNotification (type:" + this.type + ", value: "+ this.value +")";
  };


  XML3D.createClass(events.NotificationWrapper, events.Notification);

  XML3D.events = XML3D.events || {};
  XML3D.extend(XML3D.events, events);

}());XML3D.config = XML3D.config || {};

XML3D.config.isXML3DElement = function(e) {
    return (e.nodeType === Node.ELEMENT_NODE && (e.namespaceURI == XML3D.xml3dNS));
};

XML3D.config.element = function(element, selfmonitoring) {
    if (element._configured === undefined && XML3D.config.isXML3DElement(element)) {
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
            while(n) {
                XML3D.config.element(n);
                n = n.nextElementSibling;
            }
            return n;
        }
    }
};

XML3D.config.configure = function(element, selfmonitoring) {
    if (Array.isArray(element))
    {
        Array.forEach(element, XML3D.config.element);
    }
    XML3D.config.element(element, selfmonitoring);
};
// dom.js

(function($) {
    if($) return;
        var doc = {};
        var nativeGetElementById = document.getElementById;
        doc.getElementById = function(id) {
            var elem = nativeGetElementById.call(this, id);
            if(elem) {
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
            var r = nativeCreateElementNS.call(this,ns,name);
            if(ns == XML3D.xml3dNS) {
                XML3D.config.element(r, true);
            }
            return r;
        };
        XML3D.extend(window.document,doc);
    
}(XML3D._native));

/*
 * Workaround for DOMAttrModified issues in WebKit based browsers:
 * https://bugs.webkit.org/show_bug.cgi?id=8191
 */
if(navigator.userAgent.indexOf("WebKit") != -1)
{
    var attrModifiedWorks = false;
    var listener = function(){ attrModifiedWorks = true; };
    document.documentElement.addEventListener("DOMAttrModified", listener, false);
    document.documentElement.setAttribute("___TEST___", true);
    document.documentElement.removeAttribute("___TEST___", true);
    document.documentElement.removeEventListener("DOMAttrModified", listener, false);

    if (!attrModifiedWorks)
    {
        Element.prototype.__setAttribute = HTMLElement.prototype.setAttribute;

        Element.prototype.setAttribute = function(attrName, newVal)
        {
            var prevVal = this.getAttribute(attrName);
            this.__setAttribute(attrName, newVal);
            newVal = this.getAttribute(attrName);
            //if (newVal != prevVal)
            {
                var evt = document.createEvent("MutationEvent");
                evt.initMutationEvent(
                        "DOMAttrModified",
                        true,
                        false,
                        this,
                        prevVal || "",
                        newVal || "",
                        attrName,
                        (prevVal == null) ? evt.ADDITION : evt.MODIFICATION
                );
                this.dispatchEvent(evt);
            }
        };

        Element.prototype.__removeAttribute = HTMLElement.prototype.removeAttribute;
        Element.prototype.removeAttribute = function(attrName)
        {
            var prevVal = this.getAttribute(attrName);
            this.__removeAttribute(attrName);
            var evt = document.createEvent("MutationEvent");
            evt.initMutationEvent(
                    "DOMAttrModified",
                    true,
                    false,
                    this,
                    prevVal,
                    "",
                    attrName,
                    evt.REMOVAL
            );
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
            notified = handler.setFromAttribute(e.newValue);
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
            }
        }
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
        }
        parentHandler.notify(n);
    }

    handler.ElementHandler = function(elem, monitor) {
        if (elem) {
            this.element = elem;
            this.handlers = {};
            this.adapters = {};

            if(monitor) {
                elem.addEventListener('DOMNodeRemoved', nodeRemoved, true);
                elem.addEventListener('DOMNodeInserted', nodeInserted, true);
                elem.addEventListener('DOMAttrModified', attrModified, false);
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
                    Object.defineProperty(a, prop, v.desc);
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
                XML3D.debug.logError(e);
            }
        }
    };

    handler.ElementHandler.prototype.addOpposite =  function(evt) {
        (this.opposites || (this.opposites = [])).push(evt);
    };

    handler.ElementHandler.prototype.removeOpposite =  function(evt) {
        for(var o in this.opposites) {
            var oi = this.opposites[o];
            if(oi.relatedNode === evt.relatedNode) {
                this.opposites.splice(o,1);
                return;
            }
        }
    };

    handler.ElementHandler.prototype.notifyOpposite = function(evt) {
        if(evt.value && evt.value._configured) {
            evt.value._configured.addOpposite(evt);
        }
    };

    /*
     * Get called, if the related node gets removed from the DOM
     */
    handler.ElementHandler.prototype.remove = function(evt) {
        //console.log("Remove " + this);
        if (this.opposites) {
            for(var o in this.opposites) {
                var oi = this.opposites[o];
                if(oi.relatedNode._configured) {
                    var r = new events.ReferenceNotification(oi.relatedNode, oi.attrName);
                    oi.relatedNode._configured.notify(r);
                }
            }
        }
        for(var h in this.handlers) {
            var handler = this.handlers[h];
            if(handler.remove)
                handler.remove();
        }

    };

    handler.ElementHandler.prototype.resolve = function(attrName) {
        var uri = new XML3D.URI(this.element[attrName]);
        if (uri.valid && uri.fragment) {
            return XML3D.URIResolver.resolve(uri);
        }
        return null;
    };

    handler.ElementHandler.prototype.toString = function() {
        return "ElementHandler ("+this.element.nodeName + ", id: "+this.element.id+")";
    };

    var delegateProperties = ["clientHeight", "clientLeft", "clientTop", "clientWidth",
                              "offsetHeight", "offsetLeft", "offsetTop", "offsetWidth"];
    function delegateProp(name, elem, canvas) {
        Object.defineProperty(elem, name, {
            get : function() {
                return canvas[name];
            }
        });
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


    handler.ReferenceHandler = function(elem, id) {
        this.setFromAttribute = function(value) {
            var evt = new events.ReferenceNotification(elem, id, value);
            elem._configured.notify(evt);
            elem._configured.notifyOpposite(evt);
            return true; // Already notified
        };
        this.remove = function() {
            var evt = new events.ReferenceNotification(elem, id, elem.getAttribute(id));
            if(evt.type == events.VALID_REFERENCE && evt.value._configured) {
                evt.value._configured.removeOpposite(evt);
            }
        };
        this.desc = {
            get : function() {
                return this.getAttribute(id) || "";
            },
            set : function(value) {
                this.setAttribute(id, value);
            }
        };
        elem._configured.notifyOpposite(new events.ReferenceNotification(elem, id, elem.getAttribute(id)));
    };

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
                return eval("c = function onclick(event){\n  " + this.getAttribute(id) + "\n}");
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

    var tmpX = vec3.create();
    var tmpY = vec3.create();
    var tmpZ = vec3.create();

    quat4.setFromMat3 = function(m, dest) {
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

    quat4.setFromBasis = function(X,Y,Z,dest) {
        var lx = 1.0 / vec3.length(X);
        var ly = 1.0 / vec3.length(Y);
        var lz = 1.0 / vec3.length(Z);
        var m = mat3.create();
        m[0] = X[0] * lx;
        m[1] = Y[0] * ly;
        m[2] = Z[0] * lz;
        m[3] = X[1] * lx;
        m[4] = Y[1] * ly;
        m[5] = Z[1] * lz;
        m[6] = X[2] * lx;
        m[7] = Y[2] * ly;
        m[8] = Z[2] * lz;
        quat4.setFromMat3(m,dest);
    };

    methods.viewSetDirection = function(direction) {
        direction = direction || new window.XML3DVec3(0,0,-1);
        direction = direction.normalize();

        var up = this.orientation.rotateVec3(new window.XML3DVec3(0,1,0));
        up = up.normalize();

        vec3.cross(direction._data,up._data,tmpX);
        if(!vec3.length(tmpX)) {
                tmpX = this.orientation.rotateVec3(new window.XML3DVec3(1,0,0))._data;
        }
        vec3.cross(tmpX,direction._data,tmpY);
        vec3.negate(direction._data,tmpZ);

        var q = quat4.create();
        quat4.setFromBasis(tmpX, tmpY, tmpZ, q);
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
            if (adapters[adapter].xml3dGenerateRay) {
                return adapters[adapter].xml3dGenerateRay(x, y);
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

    methods.dataGetOutputFieldNames = function() {
        XML3D.debug.logError(this.nodeName + "::getOutputFieldNames is not implemeted yet.");
        return null;
    };

    methods.dataGetResult = function() {
        XML3D.debug.logError(this.nodeName + "::getResult is not implemeted yet.");
        return null;
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
XML3D.DataFieldType["int"] = 5;
XML3D.DataFieldType[5] = "int";
XML3D.DataFieldType["bool"] = 6;
XML3D.DataFieldType[6] = "bool";
XML3D.DataFieldType["texture"] = 7;
XML3D.DataFieldType[7] = "texture";
XML3D.DataFieldType["video"] = 8;
XML3D.DataFieldType[8] = "video";

XML3D.classInfo = {};

/**
 * Properties and methods for <xml3d>
 **/
XML3D.classInfo['xml3d'] = {
	id : {a: XML3D.StringAttributeHandler},
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
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for data
	map : {a: XML3D.StringAttributeHandler},
	expose : {a: XML3D.StringAttributeHandler},
	getResult : {m: XML3D.methods.dataGetResult},
	getOutputFieldNames : {m: XML3D.methods.dataGetOutputFieldNames},
	src : {a: XML3D.ReferenceHandler},
	proto : {a: XML3D.ReferenceHandler},
	script : {a: XML3D.ReferenceHandler},
	_term: undefined
};
/**
 * Properties and methods for <defs>
 **/
XML3D.classInfo['defs'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for defs
	_term: undefined
};
/**
 * Properties and methods for <group>
 **/
XML3D.classInfo['group'] = {
	id : {a: XML3D.StringAttributeHandler},
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
	id : {a: XML3D.StringAttributeHandler},
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
	getWorldMatrix : {m: XML3D.methods.XML3DGraphTypeGetWorldMatrix},
	getBoundingBox : {m: XML3D.methods.meshGetBoundingBox},
	src : {a: XML3D.ReferenceHandler},
	_term: undefined
};
/**
 * Properties and methods for <transform>
 **/
XML3D.classInfo['transform'] = {
	id : {a: XML3D.StringAttributeHandler},
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
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for shader
	script : {a: XML3D.ReferenceHandler},
	src : {a: XML3D.ReferenceHandler},
	_term: undefined
};
/**
 * Properties and methods for <light>
 **/
XML3D.classInfo['light'] = {
	id : {a: XML3D.StringAttributeHandler},
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
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for lightshader
	script : {a: XML3D.ReferenceHandler},
	src : {a: XML3D.ReferenceHandler},
	_term: undefined
};
/**
 * Properties and methods for <script>
 **/
XML3D.classInfo['script'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for script
	value : {a: XML3D.StringAttributeHandler},
	src : {a: XML3D.StringAttributeHandler},
	type : {a: XML3D.StringAttributeHandler},
	_term: undefined
};
/**
 * Properties and methods for <float>
 **/
XML3D.classInfo['float'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.FloatArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <float2>
 **/
XML3D.classInfo['float2'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float2
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.Float2ArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <float3>
 **/
XML3D.classInfo['float3'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float3
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.Float3ArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <float4>
 **/
XML3D.classInfo['float4'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float4
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.Float4ArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <float4x4>
 **/
XML3D.classInfo['float4x4'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for float4x4
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.Float4x4ArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <int>
 **/
XML3D.classInfo['int'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for int
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.IntArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <int4>
 **/
XML3D.classInfo['int4'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for int4
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.IntArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <bool>
 **/
XML3D.classInfo['bool'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for bool
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	value : {a: XML3D.BoolArrayValueHandler},
	_term: undefined
};
/**
 * Properties and methods for <texture>
 **/
XML3D.classInfo['texture'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for texture
	name : {a: XML3D.StringAttributeHandler},
	replaceby : {a: XML3D.StringAttributeHandler},
	seqnr : {a: XML3D.FloatAttributeHandler, params: 0.0},
	type : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.TextureTypes, d: 0}},
	filterMin : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.FilterTypes, d: 2}},
	filterMag : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.FilterTypes, d: 2}},
	filterMip : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.FilterTypes, d: 1}},
	wrapS : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.WrapTypes, d: 0}},
	wrapT : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.WrapTypes, d: 0}},
	wrapU : {a: XML3D.EnumAttributeHandler, params: {e: XML3D.WrapTypes, d: 0}},
	borderColor : {a: XML3D.StringAttributeHandler},
	_term: undefined
};
/**
 * Properties and methods for <img>
 **/
XML3D.classInfo['img'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for img
	src : {a: XML3D.StringAttributeHandler},
	_term: undefined
};
/**
 * Properties and methods for <video>
 **/
XML3D.classInfo['video'] = {
	id : {a: XML3D.StringAttributeHandler},
    className : {a: XML3D.StringAttributeHandler, id: 'class'},
    // TODO: Handle style for video
	src : {a: XML3D.StringAttributeHandler},
	_term: undefined
};
/**
 * Properties and methods for <view>
 **/
XML3D.classInfo['view'] = {
	id : {a: XML3D.StringAttributeHandler},
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
	_term: undefined
};
/* END GENERATED */
XML3D.data = XML3D.data || {};

(function() {

    /**
     * ProviderEntry is an interface for entries in the ProcessTable
     * @constructor
     */
    var ProviderEntry = function(table) {
        this.consumers = new Array();
        this.table = table;
    };
    ProviderEntry.prototype.getValue = function() {
    };
    ProviderEntry.prototype.getTupleSize = function() {
    };
    /**
     * @param consumer
     */
    ProviderEntry.prototype.registerConsumer = function(consumer) {
        var length = this.consumers.length;
        for ( var i = 0; i < length; i++) {
            if (this.consumers[i] == consumer) {
                XML3D.debug.logWarning("Consumer " + consumer + " is already registered");
                return;
            }
        }
        this.consumers.push(consumer);
    };

    ProviderEntry.prototype.notifyTable = function() {
        this.table.notifyDataChanged();
    };

    /**
     * @param consumer
     */
    ProviderEntry.prototype.unregisterConsumer = function(consumer) {
        var length = this.consumers.length;
        for ( var i = 0; i < length; i++) {
            if (this.consumers[i] == consumer) {
                this.consumers.splice(i,1);
                return;
            }
        }
        XML3D.debug.logWarning("Consumer " + consumer + " has never been registered");
    };

    ProviderEntry.prototype.notifyDataChanged = function(e) {
        var length = this.consumers.length;
        for ( var i = 0; i < length; i++) {
            this.consumers[i].notifyDataChanged(this);
        }
    };

    /**
     * @constructor
     * @extends ProviderEntry
     */
    var Sequence = function(entry1, entry2) {
        ProviderEntry.call(this);
        this.data = [];

        this.push = function(entry) {
            var key = entry.key;
            if (key === undefined)
                throw "No key in entry for sequence";
            var length = this.data.length;
            for ( var i = 0; i < length; i++) {
                if (this.data[i].key == key) {
                    this.data.splice(i, 1, entry);
                    return;
                }
            }
            this.data.push(entry);
            this.data.sort(function(a, b) {
                return a.key - b.key;
            });
        };

        this.interpolate = function(t, interp) {
            if (t <= this.data[0].key)
                return this.data[0].value;
            if (t >= this.data[this.data.length - 1])
                return this.data[this.data.length - 1].value;
            for ( var i = 0; i < this.data.length - 1; ++i)
                if (this.data[i].key < t && t <= this.data[i + 1].key) {
                    return interp(this.data[i].value, this.data[i + 1].value, (t - this.data[i].key) / (this.data[i + 1].key - this.data[i].key));
                }
        };

        this.getValue = function() {
            return this;
        };

        this.push(entry1);
        this.push(entry2);
    };
    XML3D.createClass(Sequence, ProviderEntry);

    /**
     * @constructor
     */
    var ProcessTable = function(handler, names, callback) {
        this.handler = handler;
        this.fieldNames = names;
        this.cb = callback;
        /**
         * Contains named ProviderEntries
         * @type {Object.<string, ProviderEntry>}
         */
        this.providers = {};

        this.setFieldNames = function(names) {
            this.fieldNames = names;
            this.providers = null;
            this.providers = {};
            this.open();
        };

        this.open = function() {
            for ( var a in this.providers) {
                this.providers[a].unregisterConsumer(this);
            }
        };

        this.register = function() {
            for ( var a in this.providers) {
                this.providers[a].registerConsumer(this);
            }

        };

        this.close = function() {
            this.register();
            this.notifyDataChanged();
        };

        this.notifyDataChanged = function(provider) {
            if (this.cb)
                this.cb.call(this.handler, this.providers, provider);
        };

        this.toString = function() {
            var result = "ProcessTable(";
            result += this.fieldNames.join(" ");
            result += ")";
            return result;
        };
    };

    /**
     * Class ScriptOutput is a single, named output of a script.
     * It's the entry in the provider map of a ProcessTable
     *
     * @constructor
     * @extends ProviderEntry
     */
    var ScriptOutput = function(table, script, name) {
        ProviderEntry.call(this, table);
        this.script = script;
        this.name = name;
        this.data = {}; // Attached user data
        this.script.registerOutput(this);

        this.getValue = function(cb) {
            return this.script.getValue(this.name, cb);
        };

        this.getTupleSize = function() {
            return this.script.getTupleSize(this.name);
        };

        this.toString = function() {
            return this.name + ": " + this.script.toString();
        };
    };
    XML3D.createClass(ScriptOutput, ProviderEntry);

    // Exports
    XML3D.data['ProcessTable'] = ProcessTable;
    XML3D.data['ScriptOutput'] = ScriptOutput;
    XML3D.data['Sequence'] = Sequence;
    XML3D.data['ProviderEntry'] = ProviderEntry;

}());XML3D.data = XML3D.data || {};


(function() {

/**
 * Constructor of XML3D.data.DataAdapter
 * The DataAdapter implements the DataCollector concept and serves as basis of all DataAdapter classes.
 * In general, a DataAdapter is associated with an element node which uses generic data and should be
 * instantiated via XML3D.data.XML3DDataAdapterFactory to ensure proper functionality.
 *
 * @extends XML3D.data.Adapter
 * @constructor
 *
 * @param factory
 * @param node
 */
XML3D.data.DataAdapter = function(factory, node)
{
	XML3D.data.Adapter.call(this, factory, node);

	this.cachedOutputs = null;
	this.nameMap = {};

	/* Creates DataAdapter instances for the node's children and registers
	 * itself as observer in those children instances. This approach is needed
	 * for being notified about changes in the child elements. If the data of
	 * a children is changed, the whole parent element must be considered as
	 * changed.
	 */

	this.buildMap = function() {
	    var map = this.node.map;
        if(map) {
            var entries = map.split(/\s+/);
            for(var i = 0; i< entries.length; i++) {
                var entry = entries[i].split(/\s*:=\s*/);
                this.nameMap[entry[1]] = entry[0];
            }
        }
	};
};
XML3D.data.DataAdapter.prototype             = new XML3D.data.Adapter();
XML3D.data.DataAdapter.prototype.constructor = XML3D.data.DataAdapter;

/**
 *
 * @param aType
 * @returns
 */
XML3D.data.DataAdapter.prototype.isAdapterFor = function(aType)
{
	return aType == XML3D.data.XML3DDataAdapterFactory.prototype;
};

XML3D.data.DataAdapter.prototype.init = function()
{
    var xflow = this.resolveScript();
    if(xflow)
        this.scriptInstance = new XML3D.data.ScriptInstance(this, xflow);

    this.buildMap();
};

/**
 * The notifyChanged() method is called by the XML3D data structure to notify the DataAdapter about
 * data changes (DOM mustation events) in its associating node. When this method is called, all observers
 * of the DataAdapter are notified about data changes via their notifyDataChanged() method.
 *
 * @param e  notification of type XML3D.Notification
 */
XML3D.data.DataAdapter.prototype.notifyChanged = function(e)
{
    XML3D.debug.logWarning("not handled change in data adapter: " + e);
};

XML3D.data.DataAdapter.prototype.getInputs = function() {
    if (this.cachedInputs)
        return this.cachedInputs;

    var result = {};
    this.forEachChildAdapter(function(adapter) {
        var other = adapter.getOutputs();
        for (var output in other) {
            var inTable = result[output];
            var newEntry = other[output];

            if(inTable) {
                if (inTable instanceof XML3D.data.Sequence) {
                    // There is already a sequence, merging will be done
                    // in Sequence
                    inTable.push(newEntry);
                } else {
                    if (inTable.key != newEntry.key) {
                        // Two different keys: create a sequence
                        result[output] = new XML3D.data.Sequence(inTable, newEntry);
                    }
                    else {
                        // Two different keys: overwrite
                        result[output] = newEntry;
                    }
                };
            } else
                result[output] = other[output];
        };
    });
    this.cachedInputs = result;
    return result;
};

XML3D.data.DataAdapter.prototype.getOutputs = function() {
    var result = {};

    // All inputs get propagated as outputs, but
    var inputs = this.getInputs();
    for(var input in inputs) {
        result[input] = inputs[input];
    }

    // if they get overridden by a script output
    var xflow = this.resolveScript();
    if(xflow && xflow.outputs) {
        var outputs = xflow.outputs;
        for ( var i = 0; i < outputs.length; i++) {
            result[outputs[i].name] = { script: this.scriptInstance, scriptOutputName: outputs[i].name };
        }
    }

    // At the end we apply renaming
    for(var output in result) {
        var newName = this.nameMap[output];
        if(newName) {
            result[newName] = result[output];
            delete result[output];
        }
    }
    return result;
};

XML3D.data.DataAdapter.prototype.resolveScript = function() {
    if (this.xflow === undefined) {
        var script = this.node.script;
        if(script) {
            var pos = script.indexOf("urn:xml3d:xflow:");
            var urnfrag = "";
            if (pos === 0) {
                urnfrag = script.substring(16, script.length);
                this.xflow = XML3D.xflow.getScript(urnfrag);
                if(typeof this.xflow !== 'object') {
                    XML3D.debug.logError("No xflow script registered with name: " + urnfrag);
                    this.xflow = null;
                }
            } else {
                var sn = XML3D.URIResolver.resolve(script, this.node.ownerDocument);
                if(sn && sn.textContent) {
                    pos = sn.textContent.indexOf("urn:xml3d:xflow:");
                    if (pos=== 0) {
                        urnfrag =  sn.textContent.substring(16, sn.textContent.length);
                        this.xflow = XML3D.xflow.getScript(urnfrag);
                        if(typeof this.xflow !== 'object') {
                            XML3D.debug.logError("No xflow script registered with name: " + urnfrag);
                            this.xflow = null;
                        }
                    }
                }
            }
        }
        this.xflow = this.xflow || null;
    }

    return this.xflow;
};

XML3D.data.DataAdapter.prototype.requestDataOnce = function(table) {
    this.requestOutputData(table);
    return table.providers;
};

XML3D.data.DataAdapter.prototype.requestData = function(table) {
    table.open();
    this.requestOutputData(table);
    table.close();
    return table.providers;
};

/**
 * @param handler
 * @param nameArray
 * @param table {XML3D.data.ProcessTable}
 * @param callback
 * @returns
 */
XML3D.data.DataAdapter.prototype.requestInputData = function(table) {
    this.forEachChildAdapter(function(adapter) {
        adapter.requestOutputData(table);
    });
    return table;
};

/**
 * @param handler
 * @param nameArray
 * @param table {XML3D.data.ProcessTable}
 * @param callback
 * @returns
 */
XML3D.data.DataAdapter.prototype.requestOutputData = function(table) {
    this.populateProcessTable(table);
    return table.providers;
};

/**
 * Calls parameter func for each child element. This includes the child
 * elements of a referenced data element, if src is defined
 * @param func The function to call
 */
XML3D.data.DataAdapter.prototype.forEachChildAdapter = function(func) {
    var node = this.node;
    if (node.src) {
        var srcElement = XML3D.URIResolver.resolve(node.src,node.ownerDocument);
        if (srcElement) {
            var da = this.factory.getAdapter(srcElement, XML3D.data.XML3DDataAdapterFactory.prototype);
            if (da)
                func(da);
        }
    } else {
        for (var child = this.node.firstElementChild; child !== null; child = child.nextElementSibling) {
            var ca = this.factory.getAdapter(child, XML3D.data.XML3DDataAdapterFactory.prototype);
            if(ca)
                func(ca);
        }
    }
};


XML3D.data.DataAdapter.prototype.populateProcessTable = function(table) {

    var outputs = this.getOutputs();
    var fields = table.fieldNames;
    for(var i = 0; i < fields.length; i++){
        var field = fields[i];
        var provider = outputs[field];
        if(provider) {
            if(provider.script) {
                var scriptProvider = new XML3D.data.ScriptOutput(table, provider.script, provider.scriptOutputName);
                table.providers[field] = scriptProvider;
            } else {
                table.providers[field] = provider;
            }
        } else {
            // No error here: requested field might be optional. Consumer
            // has to decide.
            //XML3D.debug.logDebug("Did not find requested input: " + field)
        }
    }

};

/**
 * Returns String representation of this DataAdapter
 */
XML3D.data.DataAdapter.prototype.toString = function()
{
	return "XML3D.data.DataAdapter";
};

}());
// data/values.js
(function() {
    "use strict";

    var tupleTable = {};
    tupleTable['float']    = 1;
    tupleTable['int']      = 1;
    tupleTable['bool']     = 1;
    tupleTable['float2']   = 2;
    tupleTable['float3']   = 3;
    tupleTable['float4']   = 4;
    tupleTable['int4']     = 4;
    tupleTable['float4x4'] = 16;

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
        XML3D.data.ProviderEntry.call(this);
        this.init = function()
        {
            this.value = this.node.value;
            this.key = this.node.seqnr;
            this.tupleSize = tupleTable[this.node.localName];
        };
        this.data = {};
    };
    XML3D.createClass(ValueDataAdapter, XML3D.data.DataAdapter);
    XML3D.extend(ValueDataAdapter.prototype, XML3D.data.ProviderEntry.prototype);

    ValueDataAdapter.prototype.getValue = function(wantParallelArray) {
    	//if (wantParallelArray && !(this.value instanceof ParallelArray)) {
    	//	this.value = new ParallelArray(this.value).partition(this.tupleSize);
    	//}
        return this.value;
    };
    
    ValueDataAdapter.prototype.getTupleSize = function() {
        return this.tupleSize;
    };

    ValueDataAdapter.prototype.getOutputs = function() {
        var result = {};
        result[this.node.name] = this;
        return result;
    };

    ValueDataAdapter.prototype.populateProcessTable = function(table) {
        var fields = table.fieldNames;
        for(var i = 0; i < fields.length; i++){
            if(fields[i] == this.node.name) {
                table.providers[fields[i]] = this;
                return;
            }
        }
    };

    /**
     * No data is cached, thus just need to inform all the
     * consumers.
     */
    ValueDataAdapter.prototype.notifyChanged = function(e)
    {
    	this.value = this.node.value;
        this.notifyDataChanged(this);
    };

    /**
     * Returns String representation of this DataAdapter
     */
    ValueDataAdapter.prototype.toString = function()
    {
        return "XML3D.data.ValueDataAdapter";
    };

    // Export
    XML3D.data.ValueDataAdapter = ValueDataAdapter;

}());// data/script.js

(function() {
    "use strict";
    var ScriptInstance = function(data, script) {
        this.data = data;
        this.script = script;
        this.result = {};
        this.needsEvaluation = true;
        this.outputListener = new Array();
        this.tables = new Array();

        this.getValue = function(name,cb) {
            if(this.needsEvaluation)
                this.evaluate();
            if(cb instanceof Function)
                cb();
            return this.result[name];
        };

        this.getTupleSize = function(name) {
            for(var i = 0; i < this.script.outputs.length; i++) {
                if(this.script.outputs[i].name == name)
                    return this.script.outputs[i].tupleSize;
            };
        };

        this.dataChanged = function(dataTable, entries) {
            this.needsEvaluation = true;
            var args = [];
            this.script.params.forEach(function(param){
                var arg = dataTable[param];
                if (!arg) {
                    XML3D.debug.logInfo("Missing input in xflow script: " + param);
                    args.push(undefined);
                }
                else {
                    //console.log("Add argument " + param + ": " + arg);
                	args.push(arg.getValue(XML3D._parallel));
                }
            });
            this.args = args;
            this.markOutputs(true);
            this.notifyTables();
            this.markOutputs(false);
        };

        this.evaluate = function() {
            this.result = null;
            this.result = {};
            try {
                var ok = false;
                if (XML3D._parallel) {
                    XML3D.debug.logDebug("Evaluate " + this.script.name + " on " + this.data.node.id + " using RiverTrail");
                    ok = this.script.evaluate_parallel.apply(this,this.args);
                } else {
                    XML3D.debug.logDebug("Evaluate " + this.script.name + " on " + this.data.node.id);
                    ok = this.script.evaluate.apply(this,this.args);
                }
                //console.dir(this.result);
            } catch (e) {
                XML3D.debug.logError("Failed to evaluate xflow script: " + e);
            }
            this.needsEvaluation = false;
        };

        this.registerOutput = function(output) {
            var length = this.outputListener.length;
            for(var i = 0; i < length; i++)
            {
                if(this.outputListener[i] == output)
                {
                    XML3D.debug.logWarning("Observer " + output + " is already registered");
                    return;
                }
            }
            this.outputListener.push(output);
            this.registerTable(output.table);
        };

        this.markOutputs = function(flag) {
            var length = this.outputListener.length;
            for(var i = 0; i < length; i++)
            {
                this.outputListener[i].dirty = flag;
            }
        };

        this.registerTable = function(table) {
            var length = this.tables.length;
            for(var i = 0; i < length; i++)
            {
                if(this.tables[i] == table)
                {
                    return;
                }
            }
            this.tables.push(table);
        };

        this.notifyTables = function() {
            var length = this.tables.length;
            for(var i = 0; i < length; i++)
            {
                this.tables[i].notifyDataChanged(this);
            }
        };

        // This script instance is a consumer itself
        //console.log("Creating Table for "+ this.script.name + " ScriptInstance of " + this.data.node.id);
        this.table = new XML3D.data.ProcessTable(this, this.script.params, this.dataChanged);
        this.data.requestInputData(this.table);
        //console.log("Table for "+ this.script.name + " ScriptInstance of " + this.data.node.id + ": ");
        //console.dir(this.table);
        this.table.close();

    };

    ScriptInstance.prototype.toString = function() {
        return "ScriptInstance("+this.data.node.id+"/"+this.script.name+")";
    };

    XML3D.data.ScriptInstance = ScriptInstance;
}());
// data/texture.js
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

    var TextureDataAdapter = function(factory, node)
    {
        XML3D.data.DataAdapter.call(this, factory, node);
        XML3D.data.ProviderEntry.call(this);
        this.table = new XML3D.data.ProcessTable(this, ["image"]);
    };
    XML3D.createClass(TextureDataAdapter, XML3D.data.DataAdapter);
    XML3D.extend(TextureDataAdapter.prototype, XML3D.data.ProviderEntry.prototype);


    TextureDataAdapter.prototype.init = function() {
        var node = this.node;

        var options = ({
            //isDepth          : false,
            //depthMode        : gl.LUMINANCE,
            //depthCompareMode : gl.COMPARE_R_TO_TEXTURE,
            //depthCompareFunc : gl.LEQUAL,
            //flipY            : true,
            //premultiplyAlpha : false,
            //onload           : null
            wrapS            : clampToGL(node.wrapS),
            wrapT            : clampToGL(node.wrapT),
            minFilter        : filterToGL(node.filterMin),
            magFilter        : filterToGL(node.filterMag),
            generateMipmap   : false
        });

        // TODO: automatically set generateMipmap to true when mipmap dependent filters are used
        if (node.getAttribute("mipmap") == "true")
            options.generateMipmap = true;

        var ca = this.factory.getAdapter(node.firstElementChild, XML3D.data.XML3DDataAdapterFactory.prototype);
        if (ca.requestOutputData) {
            var dt = ca.requestOutputData(this.table);
            options.imageAdapter = dt.image;
        }
        else
            options.imageAdapter = ca;
        this.value = options;
    };

    TextureDataAdapter.prototype.getOutputs = function() {
        var result = {};
        result[this.node.name] = this;
        return result;
    };

    TextureDataAdapter.prototype.getValue = function() {
        return this.value;
    };

    /**
     * Returns String representation of this TextureDataAdapter
     */
    TextureDataAdapter.prototype.toString = function()
    {
        return "XML3D.data.TextureDataAdapter";
    };

    // Export
    XML3D.data.TextureDataAdapter = TextureDataAdapter;

}());// data/sink.js
(function() {
    "use strict";

    /**
     * Class    XML3D.data.SinkDataAdapter
     * extends: XML3D.data.DataAdapter
     *
     * SinkDataAdapter represents the sink in the data hierarchy (no parents).
     *
     * @author  Benjamin Friedrich
     * @version 10/2010  1.0
     */

    /**
     * Constructor of XML3D.data.SinkDataAdapter
     *
     * @augments XML3D.data.DataAdapter
     * @constructor
     *
     * @param factory
     * @param node
     *
     */
    var SinkDataAdapter = function(factory, node)
    {
        XML3D.data.DataAdapter.call(this, factory, node);
    };
    XML3D.createClass(SinkDataAdapter, XML3D.data.DataAdapter);

    /**
     * Indicates whether this DataAdapter is a SinkAdapter (has no parent DataAdapter).
     *
     * @returns true if this DataAdapter is a SinkAdapter, otherwise false.
     */
    SinkDataAdapter.prototype.isSinkAdapter = function()
    {
        return true;
    };

    /**
     * Returns String representation of this DataAdapter
     */
    SinkDataAdapter.prototype.toString = function()
    {
        return "XML3D.data.SinkDataAdapter";
    };

    // Export
    XML3D.data.SinkDataAdapter = SinkDataAdapter;

    var ImgDataAdapter = function(factory, node)
    {
        XML3D.data.DataAdapter.call(this, factory, node);
        XML3D.data.ProviderEntry.call(this);
        this.image = null;
    };
    XML3D.createClass(ImgDataAdapter, XML3D.data.DataAdapter);
    XML3D.extend(ImgDataAdapter.prototype, XML3D.data.ProviderEntry.prototype);


    var createImage = function(src, cb, obj) {
        var image = new Image();
        image.onload = function(e) {
            cb.call(obj,e);
        };
        image.src = src;
        return image;
    };

    ImgDataAdapter.prototype.getValue = function(cb, obj) {
        if(!this.image)
        {
            this.image = createImage(this.node.src, cb, obj || this);
        }
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

    // Export
    XML3D.data.ImgDataAdapter = ImgDataAdapter;

}());// data/factory.js
(function() {
    "use strict";
    
    /**
     * Class XML3D.webgl.XML3DDataAdapterFactory
     * extends: XML3D.data.AdapterFactory
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
     * Constructor of XML3D.webgl.XML3DDataAdapterFactory
     *
     * @augments XML3D.data.AdapterFactory
     * @constructor
     *
     * @param handler
     */
    var XML3DDataAdapterFactory = function(handler)
    {
        XML3D.data.AdapterFactory.call(this);
        this.handler = handler;
    };
    XML3D.createClass(XML3DDataAdapterFactory, XML3D.data.AdapterFactory);

    /**
     * Returns a DataAdapter instance associated with the given node. If there is already a DataAdapter created for this node,
     * this instance is returned, otherwise a new one is created.
     *
     * @param   node  element node which uses generic data. The supported elements are listed in the class description above.
     * @returns DataAdapter instance
     */
    XML3DDataAdapterFactory.prototype.getAdapter = function(node)
    {
        return XML3D.data.AdapterFactory.prototype.getAdapter.call(this, node, XML3D.data.XML3DDataAdapterFactory.prototype);
    };

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
    reg['img']         = data.ImgDataAdapter;
    reg['texture']     = data.TextureDataAdapter;
    reg['data']        = data.DataAdapter;

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

    
}());// Create global symbol XML3D.webgl
XML3D.webgl = XML3D.webgl || {};
XML3D.webgl.MAXFPS = 30;

/**
 * Creates the CanvasHandler.
 *
 * The Handler is the interface between the renderer, canvas and SpiderGL
 * elements. It responds to user interaction with the scene and manages
 * redrawing of the canvas.
 * The canvas handler also manages the rendering loop including triggering
 * of redraws.
 */
(function() {

    /**
     * CanvasHandler class.
     * Own the GL context. Registers and handles the events that happen on the canvas element.
     * This includes context lost events.
     *
     * @param canvas
     *            the HTML Canvas element that this handler will be responsible
     *            for
     * @param xml3dElem
     *            the root xml3d node, containing the XML3D scene structure
     */
    function CanvasHandler(canvas, xml3dElem) {
        this.canvas = canvas;
        this.xml3dElem = xml3dElem;

        // TODO: Safe creation and what happens if this fails?
        this.gl = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});

        this.needDraw = true;
        this.needPickingDraw = true;
        this._pickingDisabled = false;
        this._lastPickedObj = null;
        this.mouseMovePickingEnabled = false;
        this.isDragging = false;
        this.timeNow = Date.now() / 1000.0;
        this.postProcessShaders = [];

        // TODO: Do we need this?
        this.canvasInfo = {
            id : canvas.id,
            mouseButtonsDown : [ false, false ]
        };

        // Register listeners on canvas
        this.registerCanvasListeners();

        // This function is called at regular intervals by requestAnimFrame to
        // determine if a redraw
        // is needed
        var handler = this;
        this._tick = function() {
            if (handler.update())
                handler.draw();

            window.requestAnimFrame(handler._tick, XML3D.webgl.MAXFPS);
        };

        this.redraw = function(reason, forcePickingRedraw) {
            forcePickingRedraw = forcePickingRedraw === undefined ? true : forcePickingRedraw;
            if (this.needDraw !== undefined) {
                this.needDraw = true;
                this.needPickingDraw = this.needPickingDraw || forcePickingRedraw;
            } else {
                // This is a callback from a texture, don't need to redraw the
                // picking buffers
                handler.needDraw = true;
            }
        };

        // Create renderer
        this.renderer = new XML3D.webgl.Renderer(this, canvas.clientWidth, canvas.clientHeight);
    }

    CanvasHandler.prototype.registerCanvasListeners = function() {
        var handler = this;
        var canvas = this.canvas;
        canvas.addEventListener("mousedown", function(e) {
            handler.mouseDown(e);
        }, false);
        canvas.addEventListener("mouseup", function(e) {
            handler.mouseUp(e);
        }, false);
        canvas.addEventListener("mousemove", function(e) {
            handler.mouseMove(e);
        }, false);
        canvas.addEventListener("click", function(e) {
            handler.click(e);
        }, false);
        canvas.addEventListener("dblclick", function(e) {
            handler.click(e, true);
        }, false);
        canvas.addEventListener("mousewheel", function(e) {
            handler.mouseWheel(e);
        }, false);
        canvas.addEventListener("DOMMouseScroll", function(e) {
            handler.mouseWheel(e);
        }, false);
        canvas.addEventListener("mouseout", function(e) {
            handler.mouseOut(e);
        }, false);

        // Block the right-click context menu on the canvas unless it's explicitly toggled
	    var cm = this.xml3dElem.getAttribute("contextmenu");
	    if (!cm || cm == "false") {
	    	this.canvas.addEventListener("contextmenu", function(e) {XML3D.webgl.stopEvent(e);}, false);
	    }
    };

    // TODO: Should move to renderer, but is triggered from here
    CanvasHandler.prototype.start = function() {
        var gl = this.gl;

        gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);

        this._tick();
    };

    // TODO: Connect resize listener with this function
    CanvasHandler.prototype.resize = function(gl, width, height) {
        if (width < 1 || height < 1)
            return false;

        this.renderer.resize(width, height);

        return true;
    };

    // Binds the picking buffer and passes the request for a picking pass to the
    // renderer
    CanvasHandler.prototype.renderPick = function(screenX, screenY) {
        if (this._pickingDisabled)
            return;
        this.renderer.renderPickingPass(screenX, this.canvas.height - screenY, this.needPickingDraw);
        this.needPickingDraw = false;
    };

    // Binds the normal picking buffer and passes the request for picked object
    // normals to the renderer
    CanvasHandler.prototype.renderPickedNormals = function(pickedObj, screenX, screenY) {
        if (!pickedObj || this._pickingDisabled)
            return;
        this.renderer.renderPickedNormals(pickedObj, screenX, this.canvas.height - screenY);
    };

    // Uses gluUnProject() to transform the 2D screen point to a 3D ray
    // returns an XML3DRay
    // TODO: Move this to Renderer and/or XML3DAdapter
    CanvasHandler.prototype.generateRay = function(screenX, screenY) {

        // setup input to unproject
        var viewport = new Array();
        viewport[0] = 0;
        viewport[1] = 0;
        viewport[2] = this.renderer.width;
        viewport[3] = this.renderer.height;

        // get view and projection matrix arrays
        var viewMat = this.renderer.camera.viewMatrix;
        var projMat = this.renderer.camera.getProjectionMatrix(viewport[2] / viewport[3]);

        var ray = new window.XML3DRay();

        var nearHit = new Array();
        var farHit = new Array();

        // do unprojections
        if (false === GLU.unProject(screenX, screenY, 0, viewMat, projMat, viewport, nearHit)) {
            return ray;
        }

        if (false === GLU.unProject(screenX, screenY, 1, viewMat, projMat, viewport, farHit)) {
            return ray;
        }

        // calculate ray

        ray.origin = this.renderer.currentView.position;
        ray.direction = new window.XML3DVec3(farHit[0] - nearHit[0], farHit[1] - nearHit[1], farHit[2] - nearHit[2]);
        ray.direction = ray.direction.normalize();

        return ray;
    };

    // This function is called by _tick() at regular intervals to determine if a
    // redraw of the scene is required
    CanvasHandler.prototype.update = function() {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('update', true, true, null);
        this.xml3dElem.dispatchEvent(event);

        return this.needDraw;
    };

    /**
     * Called by _tick() to redraw the scene if needed
     *
     * @param gl
     * @return
     */
    CanvasHandler.prototype.draw = function() {
        try {

            var start = Date.now();
            var stats = this.renderer.render(this.gl);
            var end = Date.now();

            this.needDraw = false;
            this.dispatchFrameDrawnEvent(start, end, stats);

        } catch (e) {
            XML3D.debug.logException(e);
            throw e;
        }

    };

    /**
     * Initalizes an DOM MouseEvent, picks the scene and sends the event to the
     * hit object, if one was hit.
     *
     * It dispatches it on two ways: calling dispatchEvent() on the target
     * element and going through the tree up to the root xml3d element invoking
     * all on[type] attribute code.
     *
     * @param type
     *            the type string according to the W3 DOM MouseEvent
     * @param button
     *            which mouse button is pressed, if any
     * @param x
     *            the screen x-coordinate
     * @param y
     *            the screen y-coordinate
     * @param event
     *            the W3 DOM MouseEvent, if present (currently not when
     *            SpiderGL's blur event occurs)
     * @param target
     *            the element to which the event is to be dispatched. If
     *            this is not given, the currentPickObj will be taken or the
     *            xml3d element, if no hit occured.
     *
     */
    CanvasHandler.prototype.dispatchMouseEvent = function(type, button, x, y, event, target) {
        // init event
        if (event === null || event === undefined) {
            event = document.createEvent("MouseEvents");
            event.initMouseEvent(type,
            // canBubble, cancelable, view, detail
            true, true, window, 0,
            // screenX, screenY, clientX, clientY
            0, 0, x, y,
            // ctrl, alt, shift, meta, button
            false, false, false, false, button,
            // relatedTarget
            null);
        }

        // Copy event to avoid DOM dispatch errors (cannot dispatch event more
        // than once)
        var evt = this.copyMouseEvent(event);
        this.initExtendedMouseEvent(evt, x, y);

        // find event target
        var tar = null;
        if (target !== undefined && target !== null)
            tar = target;
        else if (this.xml3dElem.currentPickObj)
            tar = this.xml3dElem.currentPickObj;
        else
            tar = this.xml3dElem;

        tar.dispatchEvent(evt);

        // Dispatch a copy to the XML3D node (canvas)
        tar = this.xml3dElem;
        tar.dispatchEvent(evt);
    };

    /**
     * Creates an DOM mouse event based on the given event and returns it
     *
     * @param event
     *            the event to copy
     * @return the new event
     */
    CanvasHandler.prototype.copyMouseEvent = function(event) {
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

        return evt;
    };

    /**
     * Adds position and normal attributes to the given event.
     *
     * @param event
     * @param x
     * @param y
     * @return
     */
    CanvasHandler.prototype.initExtendedMouseEvent = function(event, x, y) {

        var handler = this;
        var xml3dElem = this.xml3dElem;

        event.__defineGetter__("normal", function() {
            handler.renderPickedNormals(xml3dElem.currentPickObj, x, y);
            var v = xml3dElem.currentPickNormal.v;
            return new window.XML3DVec3(v[0], v[1], v[2]);
        });
        event.__defineGetter__("position", function() {
            return xml3dElem.currentPickPos;
        });
    };

    /**
     * This method is called each time a mouseUp event is triggered on the
     * canvas
     *
     * @param gl
     * @param button
     * @param x
     * @param y
     * @return
     */
    CanvasHandler.prototype.mouseUp = function(evt) {
        this.canvasInfo.mouseButtonsDown[evt.button] = false;
        var pos = this.getMousePosition(evt);

        if (this.isDragging) {
            this.needPickingDraw = true;
            this.isDragging = false;
        }

        this.renderPick(pos.x, pos.y);
        this.dispatchMouseEvent("mouseup", evt.button, pos.x, pos.y, evt);

        return false; // don't redraw
    };

    /**
     * This method is called each time a mouseDown event is triggered on the
     * canvas
     *
     * @param gl
     * @param button
     * @param x
     * @param y
     * @return
     */
    CanvasHandler.prototype.mouseDown = function(evt) {
        this.canvasInfo.mouseButtonsDown[evt.button] = true;
        var pos = this.getMousePosition(evt);
        this.renderPick(pos.x, pos.y);

        this.dispatchMouseEvent("mousedown", evt.button, pos.x, pos.y, evt);

        return false; // don't redraw
    };

    /**
     * This method is called each time a click event is triggered on the canvas
     *
     * @param gl
     * @param button
     * @param x
     * @param y
     * @return
     */
    CanvasHandler.prototype.click = function(evt, isdbl) {
        var pos = this.getMousePosition(evt);
        if (this.isDragging) {
            this.needPickingDraw = true;
            return;
        }
        if (isdbl == true)
            this.dispatchMouseEvent("dblclick", evt.button, pos.x, pos.y, evt);
        else
            this.dispatchMouseEvent("click", evt.button, pos.x, pos.y, evt);

        return false; // don't redraw
    };

    /**
     * This method is called each time a mouseMove event is triggered on the
     * canvas.
     *
     * This method also triggers mouseover and mouseout events of objects in the
     * scene.
     *
     * @param gl
     * @param x
     * @param y
     * @return
     */
    CanvasHandler.prototype.mouseMove = function(evt) {
        var pos = this.getMousePosition(evt);

        if (this.canvasInfo.mouseButtonsDown[0]) {
            this.isDragging = true;
        }

        // Call any global mousemove methods
        this.dispatchMouseEvent("mousemove", 0, pos.x, pos.y, evt, this.xml3dElem);

        if (!this.mouseMovePickingEnabled)
            return;

        this.renderPick(pos.x, pos.y);
        var curObj = null;
        if (this.xml3dElem.currentPickObj)
            curObj = this.xml3dElem.currentPickObj;

        // trigger mouseover and mouseout
        if (curObj !== this._lastPickedObj) {
            if (this._lastPickedObj) {
                // The mouse has left the last object
                this.dispatchMouseEvent("mouseout", 0, pos.x, pos.y, null, this._lastPickedObj);
            }
            if (curObj) {
                // The mouse is now over a different object, so call the new
                // object's mouseover method
                this.dispatchMouseEvent("mouseover", 0, pos.x, pos.y);
            }

            this._lastPickedObj = curObj;
        }

        return false; // don't redraw
    };

    /**
     * This method is called each time the mouse leaves the canvas
     *
     * @param gl
     * @return
     */
    CanvasHandler.prototype.mouseOut = function(evt) {
        var pos = this.getMousePosition(evt);
        this.dispatchMouseEvent("mouseout", 0, pos.x, pos.y, evt, this.xml3dElem);

        return false; // don't redraw
    };

    CanvasHandler.prototype.mouseWheel = function(evt) {
        var pos = this.getMousePosition(evt);
        // note: mousewheel type not defined in DOM!
        this.dispatchMouseEvent("mousewheel", 0, pos.x, pos.y, evt, this.xml3dElem);

        return false; // don't redraw
    };

    /**
     * Dispatches a FrameDrawnEvent to listeners
     *
     * @param start
     * @param end
     * @param numObjDrawn
     * @return
     */
    CanvasHandler.prototype.dispatchFrameDrawnEvent = function(start, end, stats) {
        var event = document.createEvent('CustomEvent');
        var data = {
        		timeStart : start,
        		timeEnd : end,
        		renderTimeInMilliseconds : end - start,
        		numberOfObjectsDrawn : stats[0],
        		numberOfTrianglesDrawn : Math.floor(stats[1])
        };
        event.initCustomEvent('framedrawn', true, true, data);

        this.xml3dElem.dispatchEvent(event);
    };

    // Destroys the renderer associated with this Handler
    CanvasHandler.prototype.shutdown = function(scene) {
        var gl = this.gl;

        if (this.renderer) {
            this.renderer.dispose();
        }
    };

    CanvasHandler.prototype.getMousePosition = function(evt) {
        var rct = this.canvas.getBoundingClientRect();
        return {
            x : (evt.clientX - rct.left),
            y : (evt.clientY - rct.top)
        };
    };

    CanvasHandler.prototype.setMouseMovePicking = function(isEnabled) {
        this.mouseMovePickingEnabled = isEnabled;
    };

    XML3D.webgl.CanvasHandler = CanvasHandler;
})();

// TODO: Move to a good place
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
// Utility functions
(function() {

    var minmax = new Float32Array(6);

    XML3D.webgl.calculateBoundingBox = function(positions, index) {
        var bbox = new window.XML3DBox();

        if (!positions || positions.length < 3)
            return bbox;

        if (index) {
            var i0 = index[0]*3;
            minmax[0] = positions[i0];
            minmax[1] = positions[i0 + 1];
            minmax[2] = positions[i0 + 2];
            minmax[3] = positions[i0];
            minmax[4] = positions[i0 + 1];
            minmax[5] = positions[i0 + 2];

            for ( var i = 1; i < index.length; i++) {
                var i1 = index[i] * 3;
                var p1 = positions[i1];
                var p2 = positions[i1 + 1];
                var p3 = positions[i1 + 2];

                if (p1 < minmax[0])
                    minmax[0] = p1;
                if (p2 < minmax[1])
                    minmax[1] = p2;
                if (p3 < minmax[2])
                    minmax[2] = p3;
                if (p1 > minmax[3])
                    minmax[3] = p1;
                if (p2 > minmax[4])
                    minmax[4] = p2;
                if (p3 > minmax[5])
                    minmax[5] = p3;
            }
        } else {
            minmax[0] = positions[0];
            minmax[1] = positions[1];
            minmax[2] = positions[2];
            minmax[3] = positions[0];
            minmax[4] = positions[1];
            minmax[5] = positions[2];

            for ( var i = 3; i < positions.length; i += 3) {
                if (positions[i] < minmax[0])
                    minmax[0] = positions[i];
                if (positions[i + 1] < minmax[1])
                    minmax[1] = positions[i + 1];
                if (positions[i + 2] < minmax[2])
                    minmax[2] = positions[i + 2];
                if (positions[i] > minmax[3])
                    minmax[3] = positions[i];
                if (positions[i + 1] > minmax[4])
                    minmax[4] = positions[i + 1];
                if (positions[i + 2] > minmax[5])
                    minmax[5] = positions[i + 2];
            }
        }
        bbox.min.set(minmax[0], minmax[1], minmax[2]);
        bbox.max.set(minmax[3], minmax[4], minmax[5]);
        return bbox;
    };

    var absMat = mat4.create();

    XML3D.webgl.transformAABB = function(bbox, gmatrix) {
        if (bbox.isEmpty())
            return;

        var min = bbox.min._data;
        var max = bbox.max._data;

        var center = vec3.scale(vec3.add(min, max, vec3.create()), 0.5);
        var extend = vec3.scale(vec3.subtract(max, min, vec3.create()), 0.5);

        mat4.toRotationMat(gmatrix, absMat);
        for ( var i = 0; i < 16; i++) {
            absMat[i] = Math.abs(absMat[i]);
        }
        mat4.multiplyVec3(absMat, extend);
        mat4.multiplyVec3(gmatrix, center);

        vec3.add(center, extend, bbox.max._data);
        vec3.subtract(center, extend, bbox.min._data);
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

})();
﻿(function() {

    /**********************************************
     * Class XML3D.webgl.XML3DShaderManager
     *
     * The XML3DShaderManager is an abstraction between the renderer and WebGL. It handles the creation and management
     * of all shaders used in the scene, including internal shaders (eg. picking shader).
     *
     **********************************************/
    var TEXTURE_STATE = {
            INVALID: -1,
            UNLOADED: 0,
            LOADED: 1,
            VALID: 2
    };
    
    var TextureInfo = function(opt) {
        opt = opt || {};
        this.status = TEXTURE_STATE.INVALID;
        this.onload = opt.onload;
    };
    
    TextureInfo.prototype.createEmpty = function(gl, unit, image) {
        this.status = TEXTURE_STATE.UNLOADED;
        this.handle =  gl.createTexture();
        this.unit = unit;
        this.image = image;
    };
    
    TextureInfo.prototype.setLoaded = function() {
        if(this.status != TEXTURE_STATE.UNLOADED)
            XML3D.debug.logError("Trying to set Texture with state " + this.status + " to 'loaded'" );
        this.status = TEXTURE_STATE.LOADED; 
        if(this.onload)
            this.onload.call(this);
    };
    
    TextureInfo.prototype.setOptions = function(opt) {
        this.options = opt;
    };
    
    var InvalidTexture = function() {
        this.status = TEXTURE_STATE.INVALID;
    };

    
    var XML3DShaderManager = function(gl, renderer, dataFactory, factory) {
    	this.gl = gl;
    	this.renderer = renderer;
    	this.dataFactory = dataFactory;
    	this.factory = factory;
    	this.currentProgram = null;
    	this.shaders = {};
    
    	//Always create a default flat shader as a fallback for error handling
    	var fallbackShader = this.getStandardShaderProgram("urn:xml3d:shader:flat");
    	fallbackShader.hasTransparency = false;
    	this.bindShader(fallbackShader);
    	this.setUniform(gl, fallbackShader.uniforms["diffuseColor"], [1, 0, 0]);
    	this.unbindShader(fallbackShader);
    	this.shaders["defaultShader"] = fallbackShader;
    
    	//Create picking shaders
    	this.shaders["picking"] = this.getStandardShaderProgram("urn:xml3d:shader:picking");
    	this.shaders["pickedNormals"] = this.getStandardShaderProgram("urn:xml3d:shader:pickedNormals");
    };

    XML3DShaderManager.prototype.createShader = function(shaderAdapter, lights) {
    	//This method is 'suboptimal', but will be replaced with the new modular shader system
    	var shader = null;
    	var shaderId = "defaultShader";
    	var shaderNode = null;
    
    	if (shaderAdapter) {
    		shaderNode = shaderAdapter.node;
    		shaderId = shaderNode.id;
    	}
    
        shader = this.shaders[shaderId];
    
        if (shader)
            return shaderId;
    
        var sources = {vs:null, fs:null};
        var flags = {hasTextures : false, hasTransparency : false, hasVColors : false};
    
        if (shaderAdapter) {
        	var dataTable = shaderAdapter.requestData(["transparency", "diffuseTexture", "specularTexture", "useVertexColor"]);
    	    if (dataTable.transparency) {
    	        flags.hasTransparency = dataTable.transparency.value[0] > 0;
    	    }
    	    flags.hasTextures = dataTable.diffuseTexture !== undefined;
    	    flags.hasVColors = dataTable.useVertexColor && dataTable.useVertexColor.value[0] == true;
        }
    
    	if (shaderNode && shaderNode.hasAttribute("script"))
    	{
    		var scriptURL = shaderNode.getAttribute("script");
    		if (new XML3D.URI(scriptURL).scheme == "urn") {
    			//Internal shader
    			this.getStandardShaderSource(scriptURL, sources, shaderAdapter, lights, flags);
                shader = this.createShaderFromSources(sources);
    		} else {
    			//User-provided shader
    			var vsScript = XML3D.URIResolver.resolve(scriptURL+ "-vs");
    			var fsScript = XML3D.URIResolver.resolve(scriptURL+ "-fs");
    			if (vsScript && fsScript) {
    				sources.vs = vsScript.textContent;
    				sources.fs = fsScript.textContent;
    			}
    
                shader = this.createShaderFromSources(sources);
    		}
    		shader.hasTransparency = flags.hasTransparency;
    		this.shaders[shaderId] = shader;
    	} else {
    		// Create the default flat shader
    		shader = this.shaders["defaultShader"];
    		shaderId = "defaultShader";
    	}
    
    	if (shaderAdapter) {
    		var texturesCreated = this.createTextures(shader, shaderAdapter);
    		if (!texturesCreated) {
    			this.destroyShader(shader);
    			shaderId = "defaultShader";
    		}
    		else {
    			//Set all uniform variables
    			var nameArray = [];
    			for (var name in shader.uniforms) {
    				nameArray.push(name);
    			}
    			var dataTable = shaderAdapter.requestData(nameArray);
    			this.setUniformVariables(shader, dataTable);
    		}
    	}
    
       return shaderId;
    };
    
    XML3DShaderManager.prototype.getStandardShaderSource = function(scriptURL, sources, shaderAdapter, lights, flags) {
    	//Need to check for textures to decide which internal shader to use
    
    	if (scriptURL == "urn:xml3d:shader:phong" && flags.hasTextures)
    		scriptURL = "urn:xml3d:shader:texturedphong";
    	else if (scriptURL == "urn:xml3d:shader:diffuse" && flags.hasTextures)
    		scriptURL = "urn:xml3d:shader:textureddiffuse";
    
    	if (flags.hasVColors)
    		scriptURL += "vcolor";
    
    	switch (scriptURL) {
    	case "urn:xml3d:shader:phong":
    	case "urn:xml3d:shader:texturedphong":
    	case "urn:xml3d:shader:phongvcolor":
    	case "urn:xml3d:shader:diffuse":
    	case "urn:xml3d:shader:textureddiffuse":
    	case "urn:xml3d:shader:diffusevcolor":
    		// Workaround for lack of dynamic loops on ATI cards below the HD 5000 line
    		var tail = g_shaders[scriptURL].fragment;
    		var maxLights = "";
    		maxLights += "#define MAX_POINTLIGHTS " + lights.point.length.toString() + "\n";
    		maxLights += "#define MAX_DIRECTIONALLIGHTS " + lights.directional.length.toString() + "\n";
    
    		var frag = maxLights + tail;
    		sources.vs = g_shaders[scriptURL].vertex;
    		sources.fs = frag;
    		break;
    	default:
    		if (g_shaders[scriptURL]){
    			sources.vs = g_shaders[scriptURL].vertex;
    			sources.fs = g_shaders[scriptURL].fragment;
    		}
    	}
    };
    
    XML3DShaderManager.prototype.getStandardShaderProgram = function(name) {
    	var sources = {};
    
    	if (!g_shaders[name]) {
    		XML3D.debug.logError("Unknown shader: "+name+". Using flat shader instead.");
    	} else {
    		sources.vs = g_shaders[name].vertex;
    		sources.fs = g_shaders[name].fragment;
    	}
    
    	var shaderProgram = this.createShaderFromSources(sources);
    
    	return shaderProgram;
    };
    
    XML3DShaderManager.prototype.createShaderFromSources = function(sources) {
    	var gl = this.gl;
    
    	if (!sources.vs || !sources.fs) {
    		return this.shaders["defaultShader"];
    	}
    
    	var prg = gl.createProgram();
    
    	var vShader = this.compileShader(gl.VERTEX_SHADER, sources.vs);
    	var fShader = this.compileShader(gl.FRAGMENT_SHADER, sources.fs);
    
    	if (vShader === null || fShader === null) {
    		//Use a default flat shader instead
    		return this.shaders["defaultShader"];
    	}
    
    	//Link shader program
    	gl.attachShader(prg, vShader);
    	gl.attachShader(prg, fShader);
    	gl.linkProgram(prg);
    
    	if (gl.getProgramParameter(prg, gl.LINK_STATUS) == 0) {
    		var errorString = "Shader linking failed: \n";
    		errorString += gl.getProgramInfoLog(prg);
    		errorString += "\n--------\n";
    		XML3D.debug.logError(errorString);
    		gl.getError();
    
    		return this.shaders["defaultShaders"];
    	}
    
    	var programObject = {
    			attributes 	: {},
    			uniforms 	: {},
    			samplers	: {},
    			handle		: prg,
    			vSource		: sources.vs,
    			fSource		: sources.fs
    	};
    
    	gl.useProgram(prg);
    
    	//Tally shader attributes
    	var numAttributes = gl.getProgramParameter(prg, gl.ACTIVE_ATTRIBUTES);
    	for (var i=0; i<numAttributes; i++) {
    		var att = gl.getActiveAttrib(prg, i);
    		if (!att) continue;
    		var attInfo = {};
    		attInfo.name = att.name;
    		attInfo.size = att.size;
    		attInfo.glType = att.type;
    		attInfo.location = gl.getAttribLocation(prg, att.name);
    		programObject.attributes[att.name] = attInfo;
    	}
    
    	//Tally shader uniforms and samplers
    	var texCount = 0;
    	var numUniforms = gl.getProgramParameter(prg, gl.ACTIVE_UNIFORMS);
    	for (var i=0; i<numUniforms; i++) {
    		var uni = gl.getActiveUniform(prg, i);
    		if (!uni) continue;
    		var uniInfo = {};
    		uniInfo.name = uni.name;
    		uniInfo.size = uni.size;
    		uniInfo.glType = uni.type;
    		uniInfo.location = gl.getUniformLocation(prg, uni.name);
    
    		if (uni.type == gl.SAMPLER_2D || uni.type == gl.SAMPLER_CUBE) {
    			uniInfo.texUnit = texCount;
    			programObject.samplers[uni.name] = uniInfo;
    			texCount++;
    		}
    		else
    			programObject.uniforms[uni.name] = uniInfo;
    	}
    
    	this.setStandardUniforms(programObject);
    	programObject.changes = [];
    	return programObject;
    };
    
    XML3DShaderManager.prototype.compileShader = function(type, shaderSource) {
    	var gl = this.gl;
    
    	var shd = gl.createShader(type);
    	gl.shaderSource(shd, shaderSource);
    	gl.compileShader(shd);
    
    	if (gl.getShaderParameter(shd, gl.COMPILE_STATUS) == 0) {
    		var errorString = "";
    		if (type == gl.VERTEX_SHADER)
    			errorString = "Vertex shader failed to compile: \n";
    		else
    			errorString = "Fragment shader failed to compile: \n";
    
    		errorString += gl.getShaderInfoLog(shd) + "\n--------\n";
    		XML3D.debug.logError(errorString);
    		gl.getError();
    
    		return null;
    	}
    
    	return shd;
    };
    
    
    XML3DShaderManager.prototype.recompileShader = function(shaderAdapter, lights) {
    	var shaderName = shaderAdapter.node.id;
    	var shader = this.shaders[shaderName];
    	if (shader) {
    		this.destroyShader(shader);
    		delete this.shaders[shaderName];
    		this.createShader(shaderAdapter, lights);
    	}
    };
    
    XML3DShaderManager.prototype.shaderDataChanged = function(shaderId, attrName, newValue, textureName) {
    	var shader = this.shaders[shaderId];
    
    	//Store the change, it will be applied the next time the shader is bound
    	if (attrName == "src") {
    		//A texture source was changed
    		if (textureName) {
    			var sampler = shader.samplers[textureName];
    			if (sampler)
    				this.replaceTexture(sampler, newValue);
    		} else
    			XML3D.debug.logError("Couldn't apply change because of a missing texture name");
    
    	} else {
    		if (attrName == "transparency")
    			shader.hasTransparency = newValue > 0;
    
    		shader.changes.push({
    			type : "uniform",
    			name : attrName,
    			newValue : newValue
    		});
    	}
    
    };
    
    
    XML3DShaderManager.prototype.setStandardUniforms = function(sp) {
    
    	var gl = this.gl;
    
    	var uniform = null;
    
    	//Diffuse color
    	uniform = sp.uniforms.diffuseColor;
    	if (uniform) {
    		this.setUniform(gl, uniform, [1.0, 1.0, 1.0]);
    	}
    
    	//Emissive color
    	uniform = sp.uniforms.emissiveColor;
    	if (uniform) {
    		this.setUniform(gl, uniform, [0.0, 0.0, 0.0]);
    	}
    
    	//Specular color
    	uniform = sp.uniforms.specularColor;
    	if (uniform) {
    		this.setUniform(gl, uniform, [0.0, 0.0, 0.0]);
    	}
    	uniform = sp.uniforms.useSpecularTexture;
    	if(uniform) {
            this.setUniform(gl, sp.uniforms.useSpecularTexture, 0);
        }
        
    
    	//Shininess
    	uniform = sp.uniforms.shininess;
    	if (uniform) {
    		this.setUniform(gl, uniform, 0.2);
    	}
    
    	//Transparency
    	uniform = sp.uniforms.transparency;
    	if (uniform) {
    		this.setUniform(gl, uniform, 0.0);
    	}
    
    
    	//XML3D.webgl.checkError(this.gl);
    };
    
    XML3DShaderManager.prototype.getShaderById = function(shaderId) {
    	var sp = this.shaders[shaderId];
    	if (!sp) {
    		var shaderAdapter = this.factory.getAdapter(document.getElementById(shaderId));
    		if (shaderAdapter) {
    			//This must be a shader we haven't created yet (maybe it was just added or
    			//was not assigned to a group until now
    			this.createShader(shaderAdapter, this.renderer.lights);
    			if (this.shaders[shaderId])
    				return this.shaders[shaderId];
    		}
    
    		XML3D.debug.logError("Could not find the shader [ "+shaderId+" ]");
    		sp = this.shaders["default"];
    	}
    	return sp;
    };
    
    XML3DShaderManager.prototype.setUniformVariables = function(shader, uniforms) {
    	this.bindShader(shader);
    
    	for (var name in uniforms) {
    		var u = uniforms[name];
    
    		if (u.value)
    			u = u.value;
    		if (u.clean)
    			continue;
    		if (u.length == 1)
    			u = u[0]; // Either a single float, int or bool
    
    		if (shader.uniforms[name]) {
    			this.setUniform(this.gl, shader.uniforms[name], u);
    		}
    	}
    
    };
    
    XML3DShaderManager.prototype.bindShader = function(shader) {
        var sp = (typeof shader == typeof "") ? this.getShaderById(shader) : shader;
    
        if (this.currentProgram != sp.handle) {
            this.currentProgram = sp.handle;
            this.gl.useProgram(sp.handle);
        }
    
        var samplers = sp.samplers;
    	for (var tex in samplers) {
    		this.bindTexture(samplers[tex]);
            if(tex == "specularTexture" && sp.uniforms.useSpecularTexture) {
                this.setUniform(this.gl, sp.uniforms.useSpecularTexture, 1);
            }
    	}
    };
    
    XML3DShaderManager.prototype.updateShader = function(sp) {
        this.bindShader(sp);
        //Apply any changes encountered since the last time this shader was rendered
        for (var i=0, l = sp.changes.length; i<l; i++) {
            var change = sp.changes[i];
            if (change.type == "uniform" && sp.uniforms[change.name]) {
                this.setUniform(this.gl, sp.uniforms[change.name], change.newValue);
            }
        }
        sp.changes = [];
    };
    
    XML3DShaderManager.prototype.unbindShader = function(shader) {
        // TODO: unbind samplers (if any)
    	var sp = (typeof shader == typeof "") ? this.getShaderById(shader) : shader;
    	var samplers = sp.samplers;
    	for (var tex in samplers) {
    		this.unbindTexture(samplers[tex]);
    	}
    
    	this.currentProgram = null;
    	this.gl.useProgram(null);
    };
    
    var rc = window.WebGLRenderingContext;
    XML3DShaderManager.prototype.setUniform = function(gl, u, value) {
    	switch (u.glType) {
            case rc.BOOL:
            case rc.INT:
            case rc.SAMPLER_2D:
                gl.uniform1i(u.location, value); break;
    
    		case 35671: 														//gl.BOOL_VEC2
    		case 35667:	gl.uniform2iv(u.location, value); break;				//gl.INT_VEC2
    
    		case 35672:															//gl.BOOL_VEC3
    		case 35668:	gl.uniform3iv(u.location, value); break;				//gl.INT_VEC3
    
    		case 35673:															//gl.BOOL_VEC4
    		case 35669:	gl.uniform4iv(u.location, value); break;				//gl.INT_VEC4
    
    		case 5126:	gl.uniform1f(u.location, value); break;					//gl.FLOAT
    		case 35664:	gl.uniform2fv(u.location, value); break;				//gl.FLOAT_VEC2
    		case 35665:	gl.uniform3fv(u.location, value); break;				//gl.FLOAT_VEC3
    		case 35666:	gl.uniform4fv(u.location, value); break;				//gl.FLOAT_VEC4
    
    		case 35674: gl.uniformMatrix2fv(u.location, gl.FALSE, value); break;//gl.FLOAT_MAT2
    		case 35675: gl.uniformMatrix3fv(u.location, gl.FALSE, value); break;//gl.FLOAT_MAT3
    		case 35676: gl.uniformMatrix4fv(u.location, gl.FALSE, value); break;//gl.FLOAT_MAT4
    
    		default:
    			XML3D.debug.logError("Unknown uniform type "+u.glType);
    			break;
    	}
    };
    
    XML3DShaderManager.prototype.setGLContext = function(gl) {
    	this.gl = gl;
    };
    
    XML3DShaderManager.prototype.destroyShader = function(shader) {
    	for (var tex in shader.samplers) {
    		this.destroyTexture(shader.samplers[tex]);
    	}
    
    	this.gl.deleteProgram(shader.handle);
    };
    
    XML3DShaderManager.prototype.createTextures = function(shader, shaderAdapter) {
    	var texUnit = 0;
    	var nameArray = [];
    
    	for (var name in shader.samplers) {
    		nameArray.push(name);
    	}
    	var dataTable = shaderAdapter.requestData(nameArray);
    
    	for (var name in shader.samplers) {
    	    var sampler = shader.samplers[name];
            var texture = dataTable[name];
            
            if (!texture) {
    			//XML3D.debug.logWarning("Can't find required texture with name='"+name+"'. Using default shader instead.");
    			sampler.info = new InvalidTexture();
    			continue;
    		}

    		var dtopt = dataTable[name].getValue();
    		if(dtopt.imageAdapter && dtopt.imageAdapter.getValue)
    		{
    		    var renderer = this.renderer;
    		    sampler.info = new TextureInfo({
    		        onload : function() {
    		            renderer.requestRedraw.call(renderer, "Texture loaded");
    		        }
    		    });
    		    sampler.info.createEmpty(this.gl, texUnit++, dtopt.imageAdapter.getValue(sampler.info.setLoaded, sampler.info));
    		    sampler.info.setOptions({
                    isDepth          : false,
                    minFilter        : dtopt.minFilter,
                    magFilter        : dtopt.magFilter,
                    wrapS            : dtopt.wrapS,
                    wrapT            : dtopt.wrapT,
                    generateMipmap   : dtopt.generateMipmap,
                    flipY            : true,
                    premultiplyAlpha : true
    		    });
    		} else {
    		    sampler.info = new InvalidTexture();
    		    XML3D.debug.logWarning("No image found for texture: " + name);
    		}
    	}
    
    	return true;
    };
    
    XML3DShaderManager.prototype.replaceTexture = function(texture, newTextureSrc) {
    	this.destroyTexture(texture);
    	var tex = this.gl.createTexture();
    	var info = this.loadImage(newTextureSrc);
    	info.handle = tex;
    
    	//Copy old values into the new info object
    	var texInfo = texture.info;
    	info.format = texInfo.format;
    	info.glType = texInfo.glType;
    	texture.info = info;
    };
    
    XML3DShaderManager.prototype.createTex2DFromData = function(internalFormat, width, height,
    		sourceFormat, sourceType, texels, opt) {
    	var gl = this.gl;
    	var info = {};
    	if (!texels) {
    		if (sourceType == gl.FLOAT) {
    			texels = new Float32Array(width * height * 4);
    		}
    		else {
    			texels = new Uint8Array(width * height * 4);
    		}
    	}
    
    	var handle = gl.createTexture();
    	gl.bindTexture(gl.TEXTURE_2D, handle);
    
    	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opt.wrapS);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opt.wrapT);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opt.minFilter);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opt.magFilter);
    
    	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, sourceFormat, sourceType, texels);
    
    	if (opt.isDepth) {
    		gl.texParameteri(gl.TEXTURE_2D, gl.DEPTH_TEXTURE_MODE,   opt.depthMode);
    		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, opt.depthCompareMode);
    		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, opt.depthCompareFunc);
    	}
    	if (opt.generateMipmap) {
    		gl.generateMipmap(gl.TEXTURE_2D);
    	}
    
    	gl.bindTexture(gl.TEXTURE_2D, null);
    
    	info.handle = handle;
    	info.options = opt;
    	info.status = TEXTURE_STATE.VALID;
    	info.glType = gl.TEXTURE_2D;
    	info.format = internalFormat;
    
    	return info;
    };
    
    XML3DShaderManager.prototype.createTex2DFromImage = function(info) {
    	var gl = this.gl;
    	var opt = info.options;
    	var image = info.image;
    	
    	gl.bindTexture(gl.TEXTURE_2D, info.handle);
    
    	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opt.wrapS);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opt.wrapT);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opt.minFilter);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opt.magFilter);
    
    	if (!this.isPowerOfTwo(image.width) || !this.isPowerOfTwo(image.height)) {
    	    // Scale up the texture to the next highest power of two dimensions.
    	    var canvas = document.createElement("canvas");
    	    canvas.width = this.nextHighestPowerOfTwo(image.width);
    	    canvas.height = this.nextHighestPowerOfTwo(image.height);
    	    var ctx = canvas.getContext("2d");
    	    ctx.drawImage(image, 0, 0, canvas.width, canvas.height); //stretch to fit
    	    //ctx.drawImage(image, 0, 0, image.width, image.height); //centered with transparent padding around edges
    	    image = canvas;
    	}
    
    	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    	if (opt.generateMipmap) {
    		gl.generateMipmap(gl.TEXTURE_2D);
    	}
    
    	gl.bindTexture(gl.TEXTURE_2D, null);
    
    	info.status = TEXTURE_STATE.VALID;
    	info.glType = gl.TEXTURE_2D;
    	info.format = gl.RGBA;
    
    	return info;
    };
    
    XML3DShaderManager.prototype.bindTexture = function(tex) {
    	var info = tex.info;
    
    	switch(info.status) {
    	    case TEXTURE_STATE.VALID:
                this.gl.activeTexture(this.gl.TEXTURE0 + info.unit);
                this.gl.bindTexture(info.glType, info.handle);
                // Should not be here, since the texunit is static
                this.setUniform(this.gl, tex, info.unit);
                break;
    	    case TEXTURE_STATE.LOADED:
    	        console.dir("Creating '"+ tex.name + "' from " + info.image.src);
    	        console.dir(info);
    	        this.createTex2DFromImage(info);
    	        this.bindTexture(tex);
    	        break;
    	};
    };
    
    XML3DShaderManager.prototype.unbindTexture = function(tex) {
    	this.gl.activeTexture(this.gl.TEXTURE0 + tex.info.texUnit);
    	this.gl.bindTexture(tex.info.glType, null);
    };
    
    XML3DShaderManager.prototype.destroyTexture = function(tex) {
    	if (tex.info && tex.info.handle)
    		this.gl.deleteTexture(tex.info.handle);
    };
    
    XML3DShaderManager.prototype.isPowerOfTwo = function(dimension) {
        return (dimension & (dimension - 1)) == 0;
    };
    
    XML3DShaderManager.prototype.nextHighestPowerOfTwo = function(x) {
        --x;
        for (var i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    };
    XML3D.webgl.XML3DShaderManager = XML3DShaderManager;
}());/*******************************************
 * Class XML3D.webgl.XML3DBufferHandler
 *
 * The XML3DBufferHandler is an abstraction layer between the renderer and WebGL. It handles all operations
 * on Framebuffer Objects but doesn't store any of these internally. FBOs are returned and expected as a
 * 'struct' containing the following information:
 *
 * 		handle			: The WebGL handle returned when gl.createFramebuffer() is called
 * 		valid			: A flag indicating whether this FBO is complete
 * 		width			: Width of this FBO
 * 		height			: Height of this FBO
 * 		colorTarget
 * 		depthTarget
 * 		stencilTarget	: The targets that will be rendered to, can be either a RenderBuffer or Texture2D contained
 * 						  in another 'struct' with fields "handle" and "isTexture"
 *
 * @author Christian Schlinkmann
 *******************************************/

XML3D.webgl.MAX_PICK_BUFFER_WIDTH = 512;
XML3D.webgl.MAX_PICK_BUFFER_HEIGHT = 512;

/**
 * @constructor
 */
XML3D.webgl.XML3DBufferHandler = function(gl, renderer, shaderManager) {
	this.renderer = renderer;
	this.gl = gl;
	this.shaderManager = shaderManager;
};

XML3D.webgl.XML3DBufferHandler.prototype.createPickingBuffer = function(width, height) {
	var gl = this.gl;
	var scale = 1.0;

	var hDiff = height - XML3D.webgl.MAX_PICK_BUFFER_HEIGHT;
	var wDiff = width - XML3D.webgl.MAX_PICK_BUFFER_WIDTH;

	if (hDiff > 0 || wDiff > 0) {
		if (hDiff > wDiff) {
			scale = XML3D.webgl.MAX_PICK_BUFFER_HEIGHT / height;
		} else {
			scale = XML3D.webgl.MAX_PICK_BUFFER_WIDTH / width;
		}
	}

	width = Math.floor(width * scale);
	height = Math.floor(height * scale);

	return this.createFrameBuffer(width, height, gl.RGBA, gl.DEPTH_COMPONENT16, null, { depthAsRenderbuffer : true }, scale );
};

XML3D.webgl.XML3DBufferHandler.prototype.createShadowBuffer = function() {
	//TODO: this
};

XML3D.webgl.XML3DBufferHandler.prototype.createFrameBuffer = function(width, height, colorFormat, depthFormat, stencilFormat, options, scale) {

	var gl = this.gl;
	options = this.fillOptions(options);

	var handle = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, handle);

	//Create targets
	var colorTarget = { handle : null, isTexture : false };
	if (colorFormat) {
		var colorTargets = [];
		if (options.colorAsRenderbuffer) {
			var ct = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, ct);
			gl.renderbufferStorage(gl.RENDERBUFFER, colorFormat, width, height);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);

			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, ct);

			colorTarget.handle = ct;
			colorTarget.isTexture = false;
		} else {
			//opt.generateMipmap = opt.generateColorsMipmap;
			var ctex = this.shaderManager.createTex2DFromData(colorFormat, width, height, gl.RGBA,
					gl.UNSIGNED_BYTE, null, options);

			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ctex.handle, 0);

			colorTarget.handle = handle;
			colorTarget.isTexture = true;
		}
	}

	var depthTarget = { handle : null, isTexture : false };
	if (depthFormat) {
		options.isDepth = true;
		if (options.depthAsRenderbuffer) {
			var dt = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, dt);
			gl.renderbufferStorage(gl.RENDERBUFFER, depthFormat, width, height);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);

			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dt);

			depthTarget.handle = dt;
			depthTarget.isTexture = false;
		} else {
			//opt.generateMipmap = opt.generateDepthMipmap;
			var dtex = this.shaderManager.createTex2DFromData(depthFormat, width, height,
									gl.DEPTH_COMPONENT, gl.FLOAT, null, options);

			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dtex.handle, 0);

			depthTarget.handle = dtex.handle;
			depthTarget.isTexture = true;
		}
	}

	var stencilTarget = { handle : null, isTexture : false };
	if (stencilFormat) {
		options.isDepth = false;
		if (options.stencilAsRenderbuffer) {
			var st = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, st);
			gl.renderbufferStorage(gl.RENDERBUFFER, stencilFormat, width, height);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);

			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, st);

			stencilTarget.handle = st;
			stencilTarget.isTexture = false;
		}
		else {
			//opt.generateMipmap = opt.generateStencilMipmap;
			var stex = this.shaderManager.createTex2DFromData(stencilFormat, width, height,
									gl.STENCIL_COMPONENT, gl.UNSIGNED_BYTE, null, options);

			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.TEXTURE_2D, stex.handle, 0);

			stencilTarget.handle = stex.handle;
			stencilTarget.isTexture = true;
		}
	}

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

	var fbo = {};
	fbo.handle = handle;
	fbo.valid = (fbStatus == gl.FRAMEBUFFER_COMPLETE);
	fbo.width = width;
	fbo.height = height;
	fbo.colorTarget = colorTarget;
	fbo.depthTarget = depthTarget;
	fbo.stencilTarget = stencilTarget;
	fbo.scale = scale;

	return fbo;
};

XML3D.webgl.XML3DBufferHandler.prototype.destroyFrameBuffer = function(fbo) {
	if (!fbo.handle)
		return;

	var gl = this.gl;
	gl.deleteFramebuffer(fbo.handle);

	if(fbo.colorTarget !== null) {
		if (fbo.colorTarget.isTexture)
			gl.deleteTexture(fbo.colorTarget.handle);
		else
			gl.deleteRenderBuffer(fbo.colorTarget.handle);
	}
	if(fbo.depthTarget !== null) {
		if (fbo.depthTarget.isTexture)
			gl.deleteTexture(fbo.depthTarget.handle);
		else
			gl.deleteRenderBuffer(fbo.depthTarget.handle);
	}
	if(fbo.stencilTarget !== null) {
		if (fbo.stencilTarget.isTexture)
			gl.deleteTexture(fbo.stencilTarget.handle);
		else
			gl.deleteRenderBuffer(fbo.stencilTarget.handle);
	}

};

XML3D.webgl.XML3DBufferHandler.prototype.fillOptions = function(options) {
	var gl = this.gl;
	var opt =  {
		wrapS             	  : gl.CLAMP_TO_EDGE,
		wrapT                 : gl.CLAMP_TO_EDGE,
		minFilter             : gl.NEAREST,
		magFilter             : gl.NEAREST,
		depthMode             : gl.LUMINANCE,
		depthCompareMode      : gl.COMPARE_R_TO_TEXTURE,
		depthCompareFunc      : gl.LEQUAL,
		colorsAsRenderbuffer  : false,
		depthAsRenderbuffer   : false,
		stencilAsRenderbuffer : false,
		isDepth               : false
	};

	for (var item in options) {
		opt[item] = options[item];
	}
	return opt;
};



// renderer/renderer.js

(function() {
    var canvas = document.createElement("canvas");
    XML3D.webgl.supported = function() {
        try {
            return !!(window.WebGLRenderingContext && (canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    };


XML3D.webgl.configure = function(xml3ds) {
	var handlers = {};
	for(var i in xml3ds) {
		// Creates a HTML <canvas> using the style of the <xml3d> Element
		var canvas = XML3D.webgl.createCanvas(xml3ds[i], i);
		// Creates the CanvasHandler for the <canvas>  Element
		var canvasHandler = new XML3D.webgl.CanvasHandler(canvas, xml3ds[i]);
		canvasHandler.start();
		handlers[i] = canvasHandler;
	}
};


XML3D.webgl.checkError = function(gl, text)
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
		XML3D.debug.logError(msg);
	}
};

/**
 * Constructor for the Renderer.
 * 
 * The renderer is responsible for drawing the scene and determining which object was
 * picked when the user clicks on elements of the canvas.
 */
XML3D.webgl.Renderer = function(handler, width, height) {
	this.handler = handler;
	this.currentView = null;
	this.xml3dNode = handler.xml3dElem;
	this.factory = new XML3D.webgl.XML3DRenderAdapterFactory(handler, this);
	this.dataFactory = new XML3D.data.XML3DDataAdapterFactory(handler);
	this.shaderManager = new XML3D.webgl.XML3DShaderManager(handler.gl, this, this.dataFactory, this.factory);
	this.bufferHandler = new XML3D.webgl.XML3DBufferHandler(handler.gl, this, this.shaderManager);
	this.camera = this.initCamera();
	this.width = width;
	this.height = height;
	this.fbos = this.initFrameBuffers(handler.gl);
	
	//Light information is needed to create shaders, so process them first
	this.lights = {
	        changed: true,
	        point: { length: 0, adapter: [], intensity: [], position: [], attenuation: [], visibility: [] },
	        directional: { length: 0, adapter: [], intensity: [], direction: [], attenuation: [], visibility: [] }
	};
	this.drawableObjects = new Array();
	this.recursiveBuildScene(this.drawableObjects, this.xml3dNode, true, mat4.identity(mat4.create()), null);
	this.processShaders(this.drawableObjects);
};

/**
 * Represents a drawable object in the scene.
 * 
 * This object holds references to a mesh and shader stored in their respective managers, or in the 
 * case of XFlow a local instance of these objects, since XFlow may be applied differently to different 
 * instances of the same <data> element. It also holds the current transformation matrix for the object,
 * a flag to indicate visibility (not visible = will not be rendered), and a callback function to be used by
 * any adapters associated with this object (eg. the mesh adapter) to propagate changes (eg. when the 
 * parent group's shader is changed).
 */
 
XML3D.webgl.Renderer.drawableObject = function() {
	this.mesh = null;
	this.shader = null;
	this.transform = null;
	this.visible = true;
	this.meshNode = null;
	var me = this;
	
	// A getter for this particular drawableObject. Rather than storing a reference to the drawableObject 
	// mesh adapters will store a reference to this function and call it when they need to apply a change.
	// This is just an arbitrary separation to aid in development.
	this.getObject = function() {
		return me;
	};
};

XML3D.webgl.Renderer.prototype.initCamera = function() {
	var avLink = this.xml3dNode.activeView;
	var av = null;
	if (avLink != "")
		av = XML3D.URIResolver.resolve(avLink);

	if (av == null)
	{
		av =  document.evaluate('.//xml3d:view[1]', this.xml3dNode, function() {
			return XML3D.xml3dNS;
		}, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
		if (av == null)
			XML3D.debug.logError("No view defined.");
		this.currentView = av;
		return this.factory.getAdapter(av);
	}
	this.currentView = av;
	return this.factory.getAdapter(av);
};

XML3D.webgl.Renderer.prototype.processShaders = function(objects) {
    for (var i=0, l=objects.length; i < l; i++) {
		var obj = objects[i];
		var groupAdapter = this.factory.getAdapter(obj.meshNode.parentNode);
		var shader = groupAdapter ? groupAdapter.getShader() : null;
		var shaderName = this.shaderManager.createShader(shader, this.lights);
		obj.shader = shaderName;
	}
};

XML3D.webgl.Renderer.prototype.recursiveBuildScene = function(scene, currentNode, visible, transform, parentShader) {
	var adapter = this.factory.getAdapter(currentNode);
	var downstreamShader = parentShader;
	var downstreamTransform = transform;
	
	switch(currentNode.nodeName) {
	case "group":
		adapter.parentVisible = visible;
		visible = visible && currentNode.visible;
		if (currentNode.hasAttribute("onmousemove") || currentNode.hasAttribute("onmouseout"))
			this.handler.setMouseMovePicking(true);	
		
		var shader = adapter.getShader();
		downstreamShader = shader ? shader : parentShader;	
		adapter.parentTransform = transform;
		adapter.parentShader = parentShader;
		adapter.isVisible = visible;
		downstreamTransform = adapter.applyTransformMatrix(mat4.identity(mat4.create()));
		break;	

	case "mesh":
	    if (currentNode.hasAttribute("onmousemove") || currentNode.hasAttribute("onmouseout"))
			this.handler.setMouseMovePicking(true);	
		
		var meshAdapter = this.factory.getAdapter(currentNode);
		if (!meshAdapter)
			break; //TODO: error handling
		
		adapter.parentVisible = visible;
		
		// Add a new drawable object to the scene
		var newObject = new XML3D.webgl.Renderer.drawableObject();
		newObject.meshNode = currentNode;
		newObject.visible = visible && currentNode.visible;
		
		// Defer creation of the shaders until after the entire scene is processed, this is
		// to ensure all lights and other shader information is available
		newObject.shader = null;
		newObject.transform = transform; 
		adapter.registerCallback(newObject.getObject);
		meshAdapter.createMesh();
		
		scene.push(newObject);
		break;
		
	case "light":
		adapter.transform = transform;
		adapter.visible = visible && currentNode.visible;
		adapter.addLight(this.lights);
        break;
	
	case "view":
		adapter.parentTransform = transform;
		adapter.updateViewMatrix();
		break;
	default:
		break;
	}

	var child = currentNode.firstElementChild;
	while (child) {
		this.recursiveBuildScene(scene, child, visible, downstreamTransform, downstreamShader);
		child = child.nextSibling;
	}
};

XML3D.webgl.Renderer.prototype.initFrameBuffers = function(gl) {
	var fbos = {};
	
	fbos.picking = this.bufferHandler.createPickingBuffer(this.width, this.height);
	if (!fbos.picking.valid)
		this.handler._pickingDisabled = true;
	
	return fbos;
};

XML3D.webgl.Renderer.prototype.getGLContext = function() {
	return this.handler.gl;
};

XML3D.webgl.Renderer.prototype.recompileShader = function(shaderAdapter) {
	this.shaderManager.recompileShader(shaderAdapter, this.lights);
	this.handler.redraw("A shader was recompiled");
};

XML3D.webgl.Renderer.prototype.shaderDataChanged = function(shaderId, attrName, newValue, texName) {
	this.shaderManager.shaderDataChanged(shaderId, attrName, newValue, texName);
	
	if (attrName != "src")
		this.handler.redraw("A shader parameter was changed");
};

XML3D.webgl.Renderer.prototype.removeDrawableObject = function(obj) {
	var index = this.drawableObjects.indexOf(obj);
	this.drawableObjects.splice(index, 1);
};

/**
 * Propogates a change in the WebGL context to everyone who needs to know
 **/
XML3D.webgl.Renderer.prototype.setGLContext = function(gl) {
	this.shaderManager.setGLContext(gl);
	this.meshManager.setGLContext(gl);
};

XML3D.webgl.Renderer.prototype.resizeCanvas = function (width, height) {
	this.width = width;
	this.height = height;
};

XML3D.webgl.Renderer.prototype.activeViewChanged = function () {
	this._projMatrix = null;
	this._viewMatrix = null;
	this.camera = this.initCamera();
	this.requestRedraw("Active view changed", true);
};

XML3D.webgl.Renderer.prototype.requestRedraw = function(reason, forcePickingRedraw) {
	this.handler.redraw(reason, forcePickingRedraw);
};

XML3D.webgl.Renderer.prototype.sceneTreeAddition = function(evt) {
	var target = evt.wrapped.target;
	var adapter = this.factory.getAdapter(target);
	
	//If no adapter is found the added node must be a text node, or something else 
	//we're not interested in
	if (!adapter)
		return; 
	
	var transform = mat4.identity(mat4.create());
	var visible = true;
	var shader = null;	
	if (adapter.getShader)
		shader = adapter.getShader();
	
	var currentNode = evt.wrapped.target;
	var didListener = false;
	adapter.isValid = true;

	//Traverse parent group nodes to build any inherited shader and transform elements
	while (currentNode.parentElement) {	
		currentNode = currentNode.parentElement;
		if (currentNode.nodeName == "group") {		
			var parentAdapter = this.factory.getAdapter(currentNode);	
			transform = parentAdapter.applyTransformMatrix(transform);
			if (!shader)
				shader = parentAdapter.getShader();
			if (currentNode.getAttribute("visible") == "false")
				visible = false;
		} else {
			break; //End of nested groups
		}
	}
	//Build any new objects and add them to the scene
	var newObjects = new Array();
	this.recursiveBuildScene(newObjects, evt.wrapped.target, visible, transform, shader);
	this.processShaders(newObjects);	
	this.drawableObjects = this.drawableObjects.concat(newObjects);
	
	this.requestRedraw("A node was added.");	
};

XML3D.webgl.Renderer.prototype.sceneTreeRemoval = function (evt) {
	var currentNode = evt.wrapped.target;
	var adapter = this.factory.getAdapter(currentNode);
	if (adapter && adapter.destroy)
		adapter.destroy();

	this.requestRedraw("A node was removed.");

};

XML3D.webgl.Renderer.prototype.render = function() {
	var gl = this.handler.gl;
	var sp = null;	

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
	gl.viewport(0, 0, this.width, this.height);
    gl.enable(gl.DEPTH_TEST);
	
    // Check if we still don't have a camera.
    if (!this.camera)
        return [0, 0];
	
	var xform = {};
	xform.view = this.camera.viewMatrix;  
	xform.proj = this.camera.getProjectionMatrix(this.width / this.height); 
	
	var stats = { objCount : 0, triCount : 0 };

	//Sort objects by shader/transparency
	var opaqueObjects = {};
	var transparentObjects = [];
	this.sortObjects(this.drawableObjects, opaqueObjects, transparentObjects, xform);	
	
	//Render opaque objects
	for (var shaderName in opaqueObjects) {
		var objectArray = opaqueObjects[shaderName];		
		this.drawObjects(objectArray, shaderName, xform, this.lights, stats);
	}
	
	if (transparentObjects.length > 0) {	
		//Render transparent objects
		//gl.depthMask(gl.FALSE);
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		for (var k=0; k < transparentObjects.length; k++) {
			var objectArray = [transparentObjects[k]];
			this.drawObjects(objectArray, objectArray[0].shader, xform, this.lights, stats);
		}
		gl.disable(gl.BLEND);
		//gl.depthMask(gl.TRUE);
	}

	return [stats.objCount, stats.triCount]; 
};

XML3D.webgl.Renderer.prototype.sortObjects = function(sourceObjectArray, opaque, transparent, xform, backToFront) {
	var tempArray = [];
	for (var i = 0, l = sourceObjectArray.length; i < l; i++) {
		var obj = sourceObjectArray[i];
		var shaderName = obj.shader;
		var shader = this.shaderManager.getShaderById(shaderName);
		
		if (shader.hasTransparency) {
			//Transparent objects will be drawn front to back so there's no sense in sorting them
			//by shader
			tempArray.push(obj);
		} else {
			opaque[shaderName] = opaque[shaderName] || [];
			opaque[shaderName].push(obj);
		}
	}
	
	//Sort transparent objects from front to back
	var tlength = tempArray.length;
	if (tlength > 1) {
		for (i = 0; i < tlength; i++) {
			var obj = tempArray[i];
			var trafo = obj.transform;
			var center = obj.mesh.bbox.center()._data;
			center = mat4.multiplyVec4(trafo, quat4.create([center[0], center[1], center[2], 1.0]));
			center = mat4.multiplyVec4(xform.view, quat4.create([center[0], center[1], center[2], 1.0]));
			tempArray[i] = [ obj, center[3] ];
		}
		
		if (backToFront) {
			tempArray.sort(function(a, b) {
				return a[1] - b[1];
			});
		} else {
			tempArray.sort(function(a, b) {
				return b[1] - a[1];
			});
		}
		//TODO: Can we do this better?
		for (var i=0; i < tlength; i++) {
			transparent[i] = tempArray[i][0];
		}
	} else if (tlength == 1) {
		transparent[0] = tempArray[0];
	}

};

var tmpModelView = mat4.create();
var tmpModelViewProjection = mat4.create();

XML3D.webgl.Renderer.prototype.drawObjects = function(objectArray, shaderId, xform, lights, stats) {
	var objCount = 0;
	var triCount = 0;
	var parameters = {};
	
	if(lights.changed) {
	    parameters["pointLightPosition[0]"] = lights.point.position;
        parameters["pointLightAttenuation[0]"] = lights.point.attenuation;
	    parameters["pointLightVisibility[0]"] = lights.point.visibility;
	    parameters["pointLightIntensity[0]"] = lights.point.intensity;
        parameters["directionalLightDirection[0]"] = lights.directional.direction;
        parameters["directionalLightVisibility[0]"] = lights.directional.visibility;
        parameters["directionalLightIntensity[0]"] = lights.directional.intensity;
	}

	shaderId = shaderId || objectArray[0].shader || "defaultShader";
	var shader = this.shaderManager.getShaderById(shaderId);
    this.shaderManager.bindShader(shader);
    this.shaderManager.updateShader(shader);

    parameters["viewMatrix"] = this.camera.viewMatrix;

	for (var i = 0, n = objectArray.length; i < n; i++) {
		var obj = objectArray[i];
		var transform = obj.transform;
		var mesh = obj.mesh;
		
		if (!(obj.visible && mesh.valid))
			continue;
		
		xform.model = transform;
		xform.modelView = mat4.multiply(this.camera.viewMatrix, xform.model, tmpModelView);
        parameters["modelMatrix"] = xform.model;
		parameters["modelViewMatrix"] = xform.modelView;
		parameters["modelViewProjectionMatrix"] = mat4.multiply(this.camera.projMatrix, xform.modelView, tmpModelViewProjection);
		parameters["normalMatrix"] = this.camera.getNormalMatrix(xform.modelView);
		
		this.shaderManager.setUniformVariables(shader, parameters);
		triCount += this.drawObject(shader, mesh);
		objCount++;
	}
	
	stats.objCount += objCount;
	stats.triCount += triCount;
	
};


XML3D.webgl.Renderer.prototype.drawObject = function(shader, meshInfo) { 
	var sAttributes = shader.attributes;
	var gl = this.handler.gl;
	var triCount = 0;
    var vbos = meshInfo.vbos;

	var numBins = meshInfo.isIndexed ? vbos.index.length : vbos.position.length;
	
	for (var i = 0; i < numBins; i++) {
	//Bind vertex buffers
		for (var name in sAttributes) {
			var shaderAttribute = sAttributes[name];
			var vbo;
			
			if (!vbos[name]) {
				XML3D.debug.logWarning("Missing required mesh data [ "+name+" ], the object may not render correctly.");
				continue;
			}
			
			if (vbos[name].length > 1)
				vbo = vbos[name][i];
			else
				vbo = vbos[name][0];

			gl.enableVertexAttribArray(shaderAttribute.location);		
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			
            //TODO: handle changes to data node through renderer.applyChangeToObject system
			/*if (dataTable[name] && dataTable[name].forcedUpdate) {
				gl.bufferData(gl.ARRAY_BUFFER, dataTable[name].data, gl.STATIC_DRAW);
				dataTable[name].forcedUpdate = false;
			}*/    
			
			gl.vertexAttribPointer(shaderAttribute.location, vbo.tupleSize, vbo.glType, false, 0, 0);
		}
		
	//Draw the object
		if (meshInfo.isIndexed) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbos.index[i]);
			
			if (meshInfo.segments) {
				//This is a segmented mesh (eg. a collection of disjunct line strips)
				var offset = 0;
				var sd = meshInfo.segments.value;
				for (var j = 0; j < sd.length; j++) {
					gl.drawElements(meshInfo.glType, sd[j], gl.UNSIGNED_SHORT, offset);
					offset += sd[j] * 2; //GL size for UNSIGNED_SHORT is 2 bytes
				}
			} else {
				gl.drawElements(meshInfo.glType, vbos.index[i].length, gl.UNSIGNED_SHORT, 0);
			}
			
			triCount = vbos.index[i].length / 3;
		} else {
			if (meshInfo.size) {
				var offset = 0;
				var sd = meshInfo.size.data;
				for (var j = 0; j < sd.length; j++) {
					gl.drawArrays(meshInfo.glType, offset, sd[j]);
					offset += sd[j] * 2; //GL size for UNSIGNED_SHORT is 2 bytes
				}
			} else {
				gl.drawArrays(meshInfo.glType, 0, vbos.position[i].length);
			}
			triCount = vbos.position[i].length / 3;
		}
		
	//Unbind vertex buffers
		for (var name in sAttributes) {
			var shaderAttribute = sAttributes[name];
			
			gl.disableVertexAttribArray(shaderAttribute.location);
		}
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
	return triCount;
};


/**
 * Render the scene using the picking shader and determine which object, if any, was picked
 * 
 * @param x
 * @param y
 * @param needPickingDraw
 * @return
 */
XML3D.webgl.Renderer.prototype.renderPickingPass = function(x, y, needPickingDraw) {
		if (x<0 || y<0 || x>=this.width || y>=this.height)
			return;
		var gl = this.handler.gl;
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos.picking.handle);
		
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.BLEND);
		
		if (needPickingDraw ) {
			var volumeMax = new window.XML3DVec3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE)._data;
			var volumeMin = new window.XML3DVec3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)._data;
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

			var xform = {};
			xform.view = this.camera.viewMatrix;
			xform.proj = this.camera.getProjectionMatrix(this.width / this.height);

			for (var i = 0; i < this.drawableObjects.length; i++) {
				var obj = this.drawableObjects[i];
				var trafo = obj.transform;
				this.adjustMinMax(obj.mesh.bbox, volumeMin, volumeMax, trafo);
			}
			
			this.bbMin = volumeMin;
			this.bbMax = volumeMax;
			
			var shader = this.shaderManager.getShaderById("picking");
			this.shaderManager.bindShader(shader);
			var parameters = {min : volumeMin, max : volumeMax};
			
			for (var j = 0, n = this.drawableObjects.length; j < n; j++) {
				var obj = this.drawableObjects[j];
				var transform = obj.transform;
				var mesh = obj.mesh;
				
				if (mesh.isValid == false)
					continue;
				xform.model = transform;
				xform.modelView = this.camera.getModelViewMatrix(xform.model);

				parameters.id = 1.0 - (1+j) / 255.0;
				parameters.modelMatrix = transform;
				parameters.modelViewProjectionMatrix = this.camera.getModelViewProjectionMatrix(xform.modelView);
				
				this.shaderManager.setUniformVariables(shader, parameters);
				this.drawObject(shader, mesh);
			}
			this.shaderManager.unbindShader(shader);
		}
		
		this.readPixels(false, x, y);			
		gl.disable(gl.DEPTH_TEST);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * Render the picked object using the normal picking shader and return the normal at
 * the point where the object was clicked.
 * 
 * @param pickedObj
 * @param screenX
 * @param screenY
 * @return
 */
XML3D.webgl.Renderer.prototype.renderPickedNormals = function(pickedObj, screenX, screenY) {
	var gl = this.handler.gl;
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos.picking.handle);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.BLEND);
	
	var transform = pickedObj.transform;
	var mesh = pickedObj.mesh;
	
	var shader = this.shaderManager.getShaderById("pickedNormals");
	this.shaderManager.bindShader(shader);
	
	var xform = {};
	xform.model = transform;
	xform.modelView = this.camera.getModelViewMatrix(xform.model);
	
	var parameters = {
		modelViewMatrix : transform,
		modelViewProjectionMatrix : this.camera.getModelViewProjectionMatrix(xform.modelView),
		normalMatrix : this.camera.getNormalMatrix(xform.modelView)
	};

	this.shaderManager.setUniformVariables(shader, parameters);
	this.drawObject(shader, mesh);
	
	this.shaderManager.unbindShader(shader);
	this.readPixels(true, screenX, screenY);
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	this.handler.needPickingDraw = true;

};

/**
 * Reads pixels from the screenbuffer to determine picked object or normals.
 * 
 * @param normals
 * 			How the read pixel data will be interpreted.
 * @return
 */
XML3D.webgl.Renderer.prototype.readPixels = function(normals, screenX, screenY) {
	//XML3D.webgl.checkError(gl, "Before readpixels");
	var data = new Uint8Array(8);
	var scale = this.fbos.picking.scale;
	var x = screenX * scale;
	var y = screenY * scale;
	var gl = this.handler.gl;
	
	try {
		gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);
		
		var vec = vec3.create();
		vec[0] = data[0] / 255;
		vec[1] = data[1] / 255;
		vec[2] = data[2] / 255;
		
		if(normals) {
			vec = vec3.subtract(vec3.scale(vec,2.0), vec3.create([1,1,1]));
			this.xml3dNode.currentPickNormal = vec;
		} else {		
			var objId = 255 - data[3] - 1;
			if (objId >= 0 && data[3] > 0) {
			    var tmp = vec3.subtract(this.bbMax, this.bbMin, vec3.create());
			    vec = vec3.create([ vec[0]*tmp[0], vec[1]*tmp[1], vec[2]*tmp[2] ]);
			    vec3.add(vec, this.bbMin, vec);

				var pickedObj = this.drawableObjects[objId];
				this.xml3dNode.currentPickPos = vec;
				this.xml3dNode.currentPickObj = pickedObj.meshNode;
			} else {
				this.xml3dNode.currentPickPos = null;
				this.xml3dNode.currentPickObj = null;	
			}
	}
	} catch(e) {XML3D.debug.logError(e);}
	
};

//Helper to expand an axis aligned bounding box around another object's bounding box
XML3D.webgl.Renderer.prototype.adjustMinMax = function(bbox, min, max, trafo) {
    var bbmin = vec3.create();
    var bbmax = vec3.create();
	mat4.multiplyVec3(trafo, bbox.min._data, bbmin);
	mat4.multiplyVec3(trafo, bbox.max._data, bbmax);

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


/**
 * Walks through the drawable objects and destroys each shape and shader
 * @return
 */
XML3D.webgl.Renderer.prototype.dispose = function() {
	for ( var i = 0, n = this.drawableObjects.length; i < n; i++) {
		var shape = this.drawableObjects[i][1];
		var shader = this.drawableObjects[i][2];
		shape.dispose();
		if (shader)
			shader.dispose();
	}
};

/**
 * Requests a redraw from the handler
 * @return
 */
XML3D.webgl.Renderer.prototype.notifyDataChanged = function() {
	this.handler.redraw("Unspecified data change.");
};

// TODO: Move all these stuff to a good place

XML3D.webgl.RenderAdapter = function(factory, node) {
	XML3D.data.Adapter.call(this, factory, node);
};
XML3D.webgl.RenderAdapter.prototype = new XML3D.data.Adapter();
XML3D.webgl.RenderAdapter.prototype.constructor = XML3D.webgl.RenderAdapter;

XML3D.webgl.RenderAdapter.prototype.isAdapterFor = function(protoType) {
	return protoType == XML3D.webgl.Renderer.prototype;
};

XML3D.webgl.RenderAdapter.prototype.getShader = function() {
	return null;
};

XML3D.webgl.RenderAdapter.prototype.applyTransformMatrix = function(
		transform) {
	return transform;
};


//Adapter for <defs>
XML3D.webgl.XML3DDefsRenderAdapter = function(factory, node) {
	XML3D.webgl.RenderAdapter.call(this, factory, node);
};
XML3D.webgl.XML3DDefsRenderAdapter.prototype = new XML3D.webgl.RenderAdapter();
XML3D.webgl.XML3DDefsRenderAdapter.prototype.constructor = XML3D.webgl.XML3DDefsRenderAdapter;
XML3D.webgl.XML3DDefsRenderAdapter.prototype.notifyChanged = function(evt) {
	
};

//Adapter for <img>
XML3D.webgl.XML3DImgRenderAdapter = function(factory, node) {
	XML3D.webgl.RenderAdapter.call(this, factory, node);
	this.textureAdapter = factory.getAdapter(node.parentNode);
};
XML3D.webgl.XML3DImgRenderAdapter.prototype = new XML3D.webgl.RenderAdapter();
XML3D.webgl.XML3DImgRenderAdapter.prototype.constructor = XML3D.webgl.XML3DImgRenderAdapter;
XML3D.webgl.XML3DImgRenderAdapter.prototype.notifyChanged = function(evt) {
	this.textureAdapter.notifyChanged(evt);
};

// Adapter for <lightshader>
XML3D.webgl.XML3DLightShaderRenderAdapter = function(factory, node) {
	XML3D.webgl.RenderAdapter.call(this, factory, node);
    this.dataAdapter = factory.renderer.dataFactory.getAdapter(this.node);
    this.table = new XML3D.data.ProcessTable(this, []);
};
XML3D.webgl.XML3DLightShaderRenderAdapter.prototype = new XML3D.webgl.RenderAdapter();
XML3D.webgl.XML3DLightShaderRenderAdapter.prototype.constructor = XML3D.webgl.XML3DLightShaderRenderAdapter;

var LIGHT_DEFAULT_INTENSITY = vec3.create([1,1,1]);
var LIGHT_DEFAULT_ATTENUATION = vec3.create([0,0,1]);

XML3D.webgl.XML3DLightShaderRenderAdapter.prototype.fillPointLight = function(point, pos, i) {
    this.table.setFieldNames(["intensity","attenuation"]);
    var dataTable = this.dataAdapter.requestDataOnce(this.table);
    var dpos = pos*3;
    var intensity = dataTable.intensity ? dataTable.intensity.getValue() : LIGHT_DEFAULT_INTENSITY;
    var attenuation = dataTable.attenuation ? dataTable.attenuation.getValue() : LIGHT_DEFAULT_ATTENUATION;

    point.intensity[dpos] = intensity[0]*i;
    point.intensity[dpos+1] = intensity[1]*i;
    point.intensity[dpos+2] = intensity[2]*i;

    point.attenuation[dpos] = attenuation[0];
    point.attenuation[dpos+1] = attenuation[1];
    point.attenuation[dpos+2] = attenuation[2];
};

XML3D.webgl.XML3DLightShaderRenderAdapter.prototype.fillDirectionalLight = function(directional, pos, i) {
    this.table.setFieldNames(["intensity"]);
    var dataTable = this.dataAdapter.requestDataOnce(this.table);
    var dpos = pos*3;
    var intensity = dataTable.intensity ? dataTable.intensity.getValue() : LIGHT_DEFAULT_INTENSITY;

    directional.intensity[dpos] = intensity[0]*i;
    directional.intensity[dpos+1] = intensity[1]*i;
    directional.intensity[dpos+2] = intensity[2]*i;
};

})();






// Adapter for <xml3d>
(function() {
	var XML3DCanvasRenderAdapter = function(factory, node) {
		XML3D.webgl.RenderAdapter.call(this, factory, node);
		this.factory = factory;
	    this.processListeners();
	};
	XML3D.createClass(XML3DCanvasRenderAdapter, XML3D.webgl.RenderAdapter);
	
	XML3DCanvasRenderAdapter.prototype.notifyChanged = function(evt) {
		if (evt.type == 0) {
			this.factory.renderer.sceneTreeAddition(evt);
		} else if (evt.type == 2) {
			this.factory.renderer.sceneTreeRemoval(evt);
		}
		
		var target = evt.internalType || evt.attrName || evt.wrapped.attrName;
		
		if (target == "activeView") {
			this.factory.renderer.activeViewChanged();
		}
	};
	
	XML3DCanvasRenderAdapter.prototype.processListeners  = function() {
	    var attributes = this.node.attributes;
	    for (var index in attributes) {
	        var att = attributes[index];
	        if (!att.name)
	            continue;
	
	        var type = att.name;
	        if (type.match(/onmouse/) || type == "onclick" || type == "ondblclick") {
	            var eventType = type.substring(2);
	            this.node.addEventListener(eventType, new Function("evt", att.value), false);
	        }
	    }
	};
	
	XML3DCanvasRenderAdapter.prototype.getElementByPoint = function(x, y, hitPoint, hitNormal) { 
			this.factory.handler.renderPick(x, y);
			if(hitPoint && this.node.currentPickPos)
			{
				XML3D.copyVector(hitPoint, this.node.currentPickPos);
			}
			
			if(hitNormal && this.node.currentPickObj)
			{
				this.factory.handler.renderPickedNormals(this.node.currentPickObj, x, y);
				XML3D.copyVector(hitNormal, this.node.currentPickNormal);
			}
			
			if(this.node.currentPickObj)
				return this.node.currentPickObj;
			else
				return null; 
	};
	
	XML3DCanvasRenderAdapter.prototype.generateRay = function(x, y) {
		
		var glY = this.factory.handler.getCanvasHeight() - y - 1; 
		return this.factory.handler.generateRay(x, glY); 		
	}; 
	XML3D.webgl.XML3DCanvasRenderAdapter = XML3DCanvasRenderAdapter;

}());﻿// Adapter for <transform>
(function() {

	var XML3DTransformRenderAdapter = function(factory, node) {
		XML3D.webgl.RenderAdapter.call(this, factory, node);
		this.isValid = true;
		this.needsUpdate = true;
	};

	XML3D.createClass(XML3DTransformRenderAdapter, XML3D.webgl.RenderAdapter);
	var p = XML3DTransformRenderAdapter.prototype;

	var IDENT_MAT = mat4.identity(mat4.create());

	p.init = function() {
	    // Create all matrices, no valid values yet
	    this.matrix = mat4.create();
	    this.transform = {
	            translate              : mat4.create(),
	            scale                  : mat4.create(),
	            scaleOrientationInv    : mat4.create(),
	            center                 : mat4.create(),
                centerInverse          : mat4.create()
	            //rotation               : mat4.create()
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

        mat4.translate(IDENT_MAT,transVec, transform.translate);
        mat4.translate(IDENT_MAT,centerVec, transform.center);
        mat4.translate(IDENT_MAT,vec3.negate(centerVec), transform.centerInverse);
        mat4.scale(IDENT_MAT, s, transform.scale);
        mat4.inverse(so, transform.scaleOrientationInv);

        // M = T * C
        mat4.multiply(transform.translate,transform.center, this.matrix);
        // M = T * C * R
        mat4.multiply(this.matrix, rot);
        // M = T * C * R * SO
        mat4.multiply(this.matrix, so);
        // M = T * C * R * SO * S
        mat4.multiply(this.matrix, transform.scale);
        // M = T * C * R * SO * S * -SO
        mat4.multiply(this.matrix, transform.scaleOrientationInv);
        // M = T * C * R * SO * S * -SO * C
        mat4.multiply(this.matrix, transform.centerInverse);

        this.needsUpdate = false;
	};

	p.getMatrix = function() {
	    this.needsUpdate && this.updateMatrix();
	    return this.matrix;
	};


	p.notifyChanged = function(e) {
		if (e.type == 1) {
			this.needsUpdate = true;
			this.factory.renderer.requestRedraw("Transformation changed.", true);
		} else if (e.type == 2) {
			this.dispose();
		}

		var opposites = this.node._configured.opposites;
		if (opposites) {
			for (var i=0, length = opposites.length; i<length; i++) {
				var adapter = this.factory.getAdapter(opposites[i].relatedNode);
				if (adapter && adapter.notifyChanged)
					adapter.notifyChanged(e);
			}
		}

	};
	p.dispose = function() {
		this.isValid = false;
	};
	// Export to XML3D.webgl namespace
	XML3D.webgl.XML3DTransformRenderAdapter = XML3DTransformRenderAdapter;

}());// Adapter for <view>
(function() {
    var XML3DViewRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);
        this.zFar = 100000;
        this.zNear = 0.1;
        this.parentTransform = null;
        this.viewMatrix = null;
        this.projMatrix = null;
        this.updateViewMatrix();
    };
    XML3D.createClass(XML3DViewRenderAdapter, XML3D.webgl.RenderAdapter);
    var p = XML3DViewRenderAdapter.prototype;

    p.updateViewMatrix = function() {
            var pos = this.node.position._data;
            var orient = this.node.orientation;
            var v = mat4.multiply(mat4.translate(mat4.identity(mat4.create()), pos), orient.toMatrix()._data); 
            
            var p = this.factory.getAdapter(this.node.parentNode);
            this.parentTransform = p.applyTransformMatrix(mat4.identity(mat4.create()));

            if (this.parentTransform) {
                v = mat4.multiply(this.parentTransform, v, mat4.create());
            }
            this.viewMatrix = mat4.inverse(v);
    };

    p.getProjectionMatrix = function(aspect) {
        if (this.projMatrix == null) {
            var fovy = this.node.fieldOfView;
            var zfar = this.zFar;
            var znear = this.zNear;
            var f = 1 / Math.tan(fovy / 2);
            this.projMatrix = mat4.create([ f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (znear + zfar) / (znear - zfar), -1, 0, 0,
                   2 * znear * zfar / (znear - zfar), 0 ]);
            
        }
        return this.projMatrix;
    };

    /* Interface method */
    p.getViewMatrix = function() {
        var m = new window.XML3DMatrix();
        m._data.set(this.viewMatrix);
        return m;
    };

    p.getModelViewMatrix = function(model) {
        return mat4.multiply(this.viewMatrix, model, mat4.create());
    };

    p.getNormalMatrix = function(modelViewMatrix) {
        return mat3.transpose(mat4.toInverseMat3(modelViewMatrix));
    };

    p.getModelViewProjectionMatrix = function(modelViewMatrix) {
        return mat4.multiply(this.projMatrix, modelViewMatrix, mat4.create());
    };

    p.notifyChanged = function(evt) {
    	var target = evt.internalType || evt.attrName || evt.wrapped.attrName;

        switch (target) {
        case "parenttransform":
        	this.parentTransform = evt.newValue;
            this.updateViewMatrix();
        break;
        
        case "orientation":
        case "position":
        	 this.updateViewMatrix();
        break;
        
        case "fieldOfView":
        	 this.projMatrix = null;
        break;
        
        default:
            XML3D.debug.logWarning("Unhandled event in view adapter for parameter " + target);
        break;
        }
 
        this.factory.handler.redraw("View changed");
    };

    // Export to XML3D.webgl namespace
    XML3D.webgl.XML3DViewRenderAdapter = XML3DViewRenderAdapter;

}());
// Adapter for <shader>
(function() {
	
	var XML3DShaderRenderAdapter = function(factory, node) {
		XML3D.webgl.RenderAdapter.call(this, factory, node);
		this.renderer = this.factory.renderer;
		
		this.dataAdapter = this.renderer.dataFactory.getAdapter(this.node);
		this.table = new XML3D.data.ProcessTable(this, [], this.dataChanged);
	};
	
	XML3D.createClass(XML3DShaderRenderAdapter, XML3D.webgl.RenderAdapter);
	var p = XML3DShaderRenderAdapter.prototype;
	
	p.notifyChanged = function(evt) {
		if (evt.type == 0) {
			this.factory.renderer.sceneTreeAddition(evt);
			return;
		} else if (evt.type == 2) {
			this.factory.renderer.sceneTreeRemoval(evt);
			return;
		} else if (evt.type == 5) {
			var target = evt.wrapped.target;
			if (target && target.nodeName == "texture") {
				// A texture was removed completely, so this shader has to be recompiled 
				this.renderer.recompileShader(this);
			}
			return;
		}
		
		var target = evt.internalType || evt.attrName || evt.wrapped.attrName;
		
		switch (target) {
		case "script":
			this.renderer.recompileShader(this);
			break;
		
		case "src":
			//A texture was changed
			var texNode = evt.wrapped.relatedNode;
			
			//Firefox assigns the relatedNode differently in this case, so we have to check for this
			if (texNode.ownerElement)
				texNode = texNode.ownerElement;
			
			texNode = texNode.parentNode;
			
			var texName = texNode.name;
			this.renderer.shaderDataChanged(this.node.id, target, evt.wrapped.newValue, texName);
			break;

		default:
			XML3D.debug.logWarning("Unhandled mutation event in shader adapter for parameter '"+target+"'");
			break;
		
		}
		
	};
	
	p.requestData = function(parameters) {
	    this.table.setFieldNames(parameters);
	    //console.log("Request from shader: " + parameters);
	    return this.dataAdapter.requestDataOnce(this.table);
	};
	
	p.notifyDataChanged = function(evt) {
		if (!evt.wrapped)
			return; 
		
		var targetName = evt.wrapped.currentTarget.name || evt.wrapped.relatedNode.name;
		
		if (!targetName)
			return; //Likely a change to a texture, this is handled through notifyChanged
		
		var dataTable = this.requestData([targetName]);
		var newValue = dataTable[targetName].value;
		if (newValue.length < 2)
			newValue = newValue[0];
		
		this.renderer.shaderDataChanged(this.node.id, targetName, newValue);
	};
	
	p.destroy = function() {
		Array.forEach(this.textures, function(t) {
			t.adapter.destroy();
		});
	};

	p.bindSamplers = function() {	
		var mustRebuildShader = false;
		
		for (var name in this.textures) {
			var tex = this.textures[name];
			if (tex.adapter.node != null)
				tex.adapter.bind(tex.info.texUnit);
			else {
				mustRebuildShader = true;
				break;
			}
		}
		
		//A texture must have been removed since the last render pass, so to be safe we should rebuild the shader
		//to try to avoid missing sampler errors in GL
		if (mustRebuildShader) {
			delete this.textures[name];
			this.destroy();
			this.enable();
		}
	};

	//Build an instance of the local shader with the given XFlow declarations and body
	p.getXFlowShader = function(declarations, body) {
		/*if (new XML3D.URI(this.program.scriptURL).scheme != "urn") {
			XML3D.debug.logWarning("XFlow scripts cannot be used in conjunction with custom shaders yet, sorry!");
			return null;
		}*/
		
		if (this.xflowBuilt) {
			return this.program;
		}
		
		var vertex = this.program.vSource;
		var fragment = this.program.fSource;
		
		vertex = declarations + vertex;
		var cutPoint = vertex.indexOf('~');
		
		var bodyCut1 = vertex.substring(0, cutPoint+1);
		var bodyCut2 = vertex.substring(cutPoint+3);
		
		vertex = bodyCut1 +"\n"+ body + bodyCut2;
		
		var sources = {};
		sources.vs = vertex;
		sources.fs = fragment;
		this.xflowBuilt = true;
		
		return this.createShaderProgram(sources);
		
	};
	
	// Export to XML3D.webgl namespace
	XML3D.webgl.XML3DShaderRenderAdapter = XML3DShaderRenderAdapter;

}());
//Adapter for <texture>
(function() {

	var XML3DTextureRenderAdapter = function(factory, node) {
		XML3D.webgl.RenderAdapter.call(this, factory, node);
		this.gl = factory.renderer.handler.gl;
		this.factory = factory;
		this.node = node;
		this.dataAdapter = factory.renderer.dataFactory.getAdapter(this.node);
	};
	
	XML3D.createClass(XML3DTextureRenderAdapter, XML3D.webgl.RenderAdapter);
	XML3DTextureRenderAdapter.prototype.notifyChanged = function(evt) {
		var shaderAdapter = this.factory.getAdapter(this.node.parentElement);
		if (shaderAdapter)
			shaderAdapter.notifyChanged(evt);
	};
	
	XML3DTextureRenderAdapter.prototype.getDataTable = function() {
		return this.dataAdapter.createDataTable();
	};
	
	XML3DTextureRenderAdapter.prototype.destroy = function() {
		if (!this.info || this.info.handle === null)
			return;
		
		this.gl.deleteTexture(this.info.handle);
		this.info = null;
		this.bind = function(texUnit) { return; };
		this.unbind = function(texUnit) { return; };
	};
	
	XML3DTextureRenderAdapter.prototype.dispose = function(evt) {
		//TODO: tell renderer to dispose
	};
	
	XML3D.webgl.XML3DTextureRenderAdapter = XML3DTextureRenderAdapter;
}());
XML3D.webgl.MAX_MESH_INDEX_COUNT = 65535;

//Adapter for <mesh>
(function() {
    var noDrawableObject = function() {
        XML3D.debug.logError("Mesh adapter has no callback to its mesh object!");
    },
    rc = window.WebGLRenderingContext;

    var staticAttributes = ["index", "position", "normal", "color", "texcoord", "size"];

    var XML3DMeshRenderAdapter = function(factory, node) {
        XML3D.webgl.RenderAdapter.call(this, factory, node);

        this.processListeners();
        this.dataAdapter = factory.renderer.dataFactory.getAdapter(this.node);
        //this.dataAdapter.registerConsumer(this);
        this.parentVisible = true;
        this.table = new XML3D.data.ProcessTable(this, staticAttributes, this.dataChanged);
        this.getMyDrawableObject = noDrawableObject;
        this.needsInit = true;
    };

    XML3D.createClass(XML3DMeshRenderAdapter, XML3D.webgl.RenderAdapter);

    var p = XML3DMeshRenderAdapter.prototype;

    p.processListeners  = function() {
        var attributes = this.node.attributes;
        for (var index in attributes) {
            var att = attributes[index];
            if (!att.name)
                continue;

            var type = att.name;
            if (type.match(/onmouse/) || type == "onclick" || type == "ondblclick") {
                var eventType = type.substring(2);
                this.node.addEventListener(eventType,  new Function("evt", att.value), false);
            }
        }
    };

    p.registerCallback = function(callback) {
        if (callback instanceof Function)
            this.getMyDrawableObject = callback;
    };

    p.notifyChanged = function(evt) {
        if (evt.type == 0)
            // Node insertion is handled by the CanvasRenderAdapter
            return;
        else if (evt.type == 2)
            return this.factory.renderer.sceneTreeRemoval(evt);

        var target = evt.internalType || evt.attrName || evt.wrapped.attrName;

        switch (target) {
            case "parenttransform":
                this.getMyDrawableObject().transform = evt.newValue;
                break;

            case "parentshader":
                var newShaderId = evt.newValue ? evt.newValue.node.id : "defaultShader";
                this.getMyDrawableObject().shader = newShaderId;
                break;

            case "parentvisible":
                this.getMyDrawableObject().visible = evt.newValue && this.node.visible;
                break;

            case "visible":
                this.getMyDrawableObject().visible = (evt.wrapped.newValue == "true") && this.node.parentNode.visible;
                break;

            case "src":
                this.dispose(evt);
                this.createMesh();
                break;

            case "type":
                var newGLType = this.getGLTypeFromString(evt.wrapped.newValue);
                this.getMyDrawableObject().mesh.glType = newGLType;
                break;

            default:
                XML3D.debug.logWarning("Unhandled mutation event in mesh adapter for parameter '"+target+"'");
                break;
        }

    };

    p.notifyDataChanged = function(evt) {
         //TODO: fix object form
        //this.passChangeToObject(evt);
    };


    var getGLTypeFromArray = function(array) {
        if (array instanceof Int8Array)
            return rc.BYTE;
        if (array instanceof Uint8Array)
            return rc.UNSIGNED_BYTE;
        if (array instanceof Int16Array)
            return rc.SHORT;
        if (array instanceof Uint16Array)
            return rc.UNSIGNED_SHORT;
        if (array instanceof Int32Array)
            return rc.INT;
        if (array instanceof Uint32Array)
            return rc.UNSIGNED_INT;
        if (array instanceof Float32Array)
            return rc.FLOAT;
        return rc.FLOAT;
    };

    function getGLTypeFromString(typeName) {
        if (typeName && typeName.toLowerCase)
            typeName = typeName.toLowerCase();
        switch (typeName) {
        case "triangles":
            return rc.TRIANGLES;
        case "tristrips":
            return rc.TRIANGLE_STRIP;
        case "points":
            return rc.POINTS;
        case "lines":
            return rc.LINES;
        case "linestrips":
            return rc.LINE_STRIP;
        default:
            return rc.TRIANGLES;
        }
    };

    var createBuffer = function(gl, type, data) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(type, buffer);
        gl.bufferData(type, data, gl.STATIC_DRAW);
        buffer.length = data.length;
        buffer.glType = getGLTypeFromArray(data);
        return buffer;
    };

    p.createMesh = function() {
        this.dataAdapter.requestData(this.table);
    };

    function check(entry) {
        return !!(entry && entry.getValue());
    }

    function createMeshInfo(type) {
        return {
            vbos : {},
            isIndexed: false,
            glType: getGLTypeFromString(type),
            bbox : new XML3DBox()
        };
    }

    p.dataChanged = function(dataTable) {
        var init = this.needsInit;
        var gl = this.factory.renderer.getGLContext();
        var obj = this.getMyDrawableObject();

        console.timeEnd("xflow");
        //console.time("Mesh data changed");

        var foundValidPositions = false;

        var meshInfo = obj.mesh || createMeshInfo(this.node.type);

        for ( var attr in dataTable) {
            var entry = dataTable[attr];

            if(!(entry.dirty || init))
                continue;

            //console.log(attr);

            switch(attr) {
                case "index":
                    var indexBuffer = entry.data.buffer;
                    if (!indexBuffer || entry.dirty) {
                        indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(entry.getValue()));
                        indexBuffer.tupleSize = entry.getTupleSize();
                        entry.data.buffer = indexBuffer;
                    } else {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
                    }
                    meshInfo.vbos.index = [];
                    meshInfo.vbos.index[0] = indexBuffer;
                    meshInfo.isIndexed = true;
                    break;
                case "position":
                    foundValidPositions = check(dataTable.position);
                    // Fallthrough
                default:
                    var attrBuffer = entry.data.buffer;
                    var v = entry.getValue();
                    if (!attrBuffer) {
                        attrBuffer = v.data ? createBuffer(gl, gl.ARRAY_BUFFER, v.data) : createBuffer(gl, gl.ARRAY_BUFFER, v);
                        attrBuffer.tupleSize = entry.getTupleSize();
                        entry.data.buffer = attrBuffer;
                    } else {
                        if (v.data)
                            v = v.data;
                        gl.bindBuffer(gl.ARRAY_BUFFER, attrBuffer);
                        gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
                    }
                    // Set it in everycase, because buffer might be created by other mesh consumer
                    meshInfo.vbos[attr] = [];
                    meshInfo.vbos[attr][0] = attrBuffer;
                }
        }

        if(init && !foundValidPositions) {
            XML3D.debug.logError("Mesh " + this.node.id + " has no data for required attribute 'position'.");
            obj.mesh.valid = false;
            return;
        } else if(foundValidPositions) {
            // We have positons, let's calc a bounding box
            var positions = dataTable.position.getValue();
            if (positions.data)
                positions = positions.data;
            this.bbox = XML3D.webgl.calculateBoundingBox(positions,dataTable.index ? dataTable.index.getValue() : null);
        }

        this.needsInit = false;
        meshInfo.valid = true;
        meshInfo.bbox.set(this.bbox);
        obj.mesh = meshInfo;

        //console.timeEnd("Mesh data changed");
        this.factory.renderer.requestRedraw("Mesh data changed.", false);
    };

    // Disposes of all GL buffers but does not destroy the mesh
    p.dispose = function(gl) {
        if (!gl)
            gl = this.factory.renderer.getGLContext();
        var myObject = this.getMyDrawableObject();
        var vbos = myObject.mesh.vbos;

        for (var vbo in vbos) {
            var buffer = vbos[vbo];
            for (var i = 0; i < buffer.length; i++) {
                gl.deleteBuffer(buffer[i]);
            }
        }

        myObject.mesh.valid = false;
    };

    // Disposes of all GL buffers and destroys the mesh (along with its DrawableObject)
    // This should only be called if the mesh node is removed from the scene tree
    p.destroy = function(gl) {
        if (!gl)
            gl = this.factory.renderer.getGLContext();
        if (this.getMyDrawableObject == noDrawableObject) {
            return; //This mesh either has no GL data or was already deleted
        }
        this.dispose(gl);
        this.factory.renderer.removeDrawableObject(this.getMyDrawableObject());
        this.getMyDrawableObject = noDrawableObject;
    };

    p.getBoundingBox = function() {
        return this.bbox;
    };




    // Export to XML3D.webgl namespace
    XML3D.webgl.XML3DMeshRenderAdapter = XML3DMeshRenderAdapter;

}());// Adapter for <group>
(function() {
	
	var XML3DGroupRenderAdapter = function(factory, node) {
	    XML3D.webgl.RenderAdapter.call(this, factory, node);
	    this.processListeners();
	    this.factory = factory;
	    this.parentTransform = null;
	    this.parentShader = null;
	    this.parentVisible = true;
	    this.isValid = true;
	    this.updateTransformAdapter();
	};

	XML3D.createClass(XML3DGroupRenderAdapter, XML3D.webgl.RenderAdapter);

	var p = XML3DGroupRenderAdapter.prototype;

	p.applyTransformMatrix = function(
			transform) {
		var ret = transform;

		if (this.parentTransform !== null)
			ret = mat4.multiply(this.parentTransform, ret,  mat4.create());

		if (this.transformAdapter)
			ret = mat4.multiply(ret, this.transformAdapter.getMatrix(),mat4.create());

		return ret;
	};
	
    p.updateTransformAdapter = function() {
        this.transformAdapter = null;
        var tNode = this.node.transform;
        if (tNode) {
            tNode = XML3D.URIResolver.resolve(tNode);
            if (tNode)
                this.transformAdapter = this.factory.getAdapter(tNode);
        }
    };

	p.processListeners  = function() {
	    var attributes = this.node.attributes;
	    for (var index in attributes) {
	        var att = attributes[index];
	        if (!att.name)
	            continue;

	        var type = att.name;
	        if (type.match(/onmouse/) || type == "onclick" || type == "ondblclick") {
	            var eventType = type.substring(2);
	            this.node.addEventListener(eventType, new Function("evt", att.value), false);
	        }
	    }
	};

	p.notifyChanged = function(evt) {
		if (evt.type == 0) {
			this.factory.renderer.sceneTreeAddition(evt);
			return;
		}
		else if (evt.type == 2) {
			this.factory.renderer.sceneTreeRemoval(evt);
			return;
		} else if (evt.type == 5) {
			return;
		}
		
		var target = evt.internalType || evt.attrName || evt.wrapped.attrName;
		
		switch (target) {
		case "shader":
			//Update this group node's shader then propagate the change down to its children
			var downstreamValue = this.getShader();
			if (!downstreamValue) {
				//This node's shader was removed, pass down the parent shader instead
				downstreamValue = this.parentShader;
			}
	        evt.internalType = "parentshader";
	        evt.newValue = downstreamValue;
	        this.notifyChildren(evt);

	        this.factory.renderer.requestRedraw("Group shader changed.", false);
	        break;
	        
		case "parentshader":
			this.parentShader = null;		
			if (!this.getShader()) { // This node's shader would override parent shaders
				this.notifyChildren(evt);
			}
			this.parentShader = evt.newValue;
			break;
			
		case "translation":
		case "rotation":
		case "scale":
			//This group adapter's transform node was changed
			var downstreamValue = this.transformAdapter.getMatrix();
			if (this.parentTransform)
				downstreamValue = mat4.multiply(this.parentTransform, downstreamValue, mat4.create());
			
			evt.internalType = "parenttransform";
			evt.newValue = downstreamValue;
			this.notifyChildren(evt);
			delete evt.internalType;
			delete evt.newValue;
			break;
			
		case "transform":
			//This group is now linked to a different transform node. We need to notify all
			//of its children with the new transformation matrix
			this.updateTransformAdapter(this);

			var downstreamValue;
			if (this.transformAdapter)
				downstreamValue = this.transformAdapter.getMatrix();
			else if (this.parentTransform)
				downstreamValue = mat4.identity(mat4.create());
			else
				downstreamValue = null;

			if(this.parentTransform)
				downstreamValue = mat4.multiply(this.parentTransform, downstreamValue, mat4.create());

	        evt.internalType = "parenttransform";
	        evt.newValue = downstreamValue;
	        
	        this.notifyChildren(evt);
	        delete evt.internalType;
            delete evt.newValue;
			this.factory.renderer.requestRedraw("Group transform changed.", true);
			break;
		
		//TODO: this will change once the wrapped events are sent to all listeners of a node
		case "parenttransform":  
			var parentValue = downstreamValue = evt.newValue;
			this.parentTransform = evt.newValue;
			
			if (this.transformAdapter)
				downstreamValue = mat4.multiply(parentValue, this.transformAdapter.getMatrix(), mat4.create());
			
			evt.newValue = downstreamValue;
			this.notifyChildren(evt);
			// Reset event value
			evt.newValue = parentValue;
            break;
			
		case "visible":
			//TODO: improve visibility handling
			//If this node is set visible=false then it overrides the parent node 
			if (this.parentVisible == false)
				break;
			else {
				evt.internalType = "parentvisible";
				evt.newValue = evt.wrapped.newValue == "true";
				this.notifyChildren(evt);
				delete evt.internalType;
	            delete evt.newValue;
				this.factory.renderer.requestRedraw("Group visibility changed.", true);	
			}
			break;
		
		case "parentvisible":
			this.parentVisible = evt.newValue;
			//If this node is set visible=false then it overrides the parent node 
			if (this.node.visible == false)
				break;
			else
				this.notifyChildren(evt);
			
			break;
			
		default:
			XML3D.debug.logWarning("Unhandled mutation event in group adapter for parameter '"+target+"'");
			break;
		};

	};


	p.notifyChildren = function(evt) {
		var child = this.node.firstElementChild;
		while (child) {
			var adapter = this.factory.getAdapter(child);
			adapter.notifyChanged(evt);
			child = child.nextElementSibling;
		}
	};

	p.getShader = function()
	{
		var shader = this.node.shader;

		// if no shader attribute is specified, try to get a shader from the style attribute
		if(shader == "")
		{
			var styleValue = this.node.getAttribute('style');
			if(styleValue) {		
				var pattern    = /shader\s*:\s*url\s*\(\s*(\S+)\s*\)/i;
				var result = pattern.exec(styleValue);
				if (result)
					shader = XML3D.URIResolver.resolve(result[1]);
			}
		} else {
			shader = XML3D.URIResolver.resolve(shader);
		}
		
		shader = this.factory.getAdapter(shader);
		
		return shader || this.parentShader;	
	};

	p.destroy = function() {
		var child = this.node.firstElementChild;
		while (child) {
			var adapter = this.factory.getAdapter(child);
			if (adapter && adapter.destroy)
				adapter.destroy();
			child = child.nextElementSibling;
		}
		
		this.isValid = false;
	};

	/* Interface methods */
	p.getBoundingBox = function() {
	    var bbox = new window.XML3DBox();
	    Array.prototype.forEach.call(this.node.childNodes, function(c) {
	        if(c.getBoundingBox)
	            bbox.extend(c.getBoundingBox());
	    });
	    if (this.transformAdapter) {
	        XML3D.webgl.transformAABB(bbox, this.transformAdapter.getMatrix());
	    }
	    return bbox;
    };
  
    p.getLocalMatrix = function() {
        var m = new window.XML3DMatrix();
        if (this.transformAdapter !== null)
            m._data.set(this.transformAdapter.getMatrix());
        return m;
    };
    
    p.getWorldMatrix = function() {
        var m = new window.XML3DMatrix();
        if (this.parentTransform)
            m._data.set(this.parentTransform);
        if (this.transformAdapter)
            mat4.multiply(m._data, this.transformAdapter.getMatrix());
        return m;
    };

	XML3D.webgl.XML3DGroupRenderAdapter = XML3DGroupRenderAdapter;
}());
// Adapter for <light>
(function() {

	var XML3DLightRenderAdapter = function(factory, node) {
		XML3D.webgl.RenderAdapter.call(this, factory, node);
		
		this.visible = true;
		this.position = null;
		this.transform = null;
		this.lightShader = null;

		this.isValid = true;
	};
	XML3D.createClass(XML3DLightRenderAdapter, XML3D.webgl.RenderAdapter);
	
	XML3DLightRenderAdapter.prototype.notifyChanged = function(evt) {
		var target = evt.internalType || evt.wrapped.attrName;
		
		switch(target) {
		case "visible":
			this.visible = (evt.wrapped.newValue == "true") && this.node.parentNode.visible;
			break;
		case "parentvisible":
			this.visible = evt.newValue && this.node.visible;
			break;
		case "intensity":
			// TODO: Inform light struct
			break;
		case "parenttransform":
			this.transform = evt.newValue;
			break;
		}
		
		this.factory.handler.redraw("Light attribute changed.");	
	};
	
	var XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION = vec3.create([0,0,-1]), tmpDirection = vec3.create();
	
	XML3DLightRenderAdapter.prototype.addLight = function(lights) {
	    var shader = this.getLightShader();
	    if(!shader)
	        return;
	    var script = shader.node.script;
	    var pos = script.indexOf("urn:xml3d:lightshader:");
	    if(pos === 0) {
	        var urnfrag = script.substring(22, script.length);
	        switch(urnfrag) {
	            case "point":
	                var point = lights.point;
	                var dlen = point.length*3;
                    point.adapter[point.length] = this;
                    // Set shader specific parameters
                    shader.fillPointLight(point, point.length,this.node.intensity);
                    // Set instance specific parameters
                    if (this.transform) {
                        var t = this.transform;
                        var pos = mat4.multiplyVec4(t, quat4.create([0,0,0,1]));
                        point.position[dlen] = pos[0]/pos[3];
                        point.position[dlen+1] = pos[1]/pos[3];
                        point.position[dlen+2] =  pos[2]/pos[3];
                    } else {
                        point.position[dlen] = 0;
                        point.position[dlen+1] = 0;
                        point.position[dlen+2] = 0;
                    }
                    point.visibility[dlen] = 1;
                    point.visibility[dlen+1] = 1;
                    point.visibility[dlen+2] = 1;
	                point.length++;
                    break;
	            case "directional":
	                var directional = lights.directional;
	                var dlen = directional.length*3;
	                directional.adapter[directional.length] = this;
	                shader.fillDirectionalLight(directional, directional.length,this.node.intensity);
                    if (this.transform) {
                        var t = this.transform;
                        mat4.multiplyVec3(t, XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION, tmpDirection);
                        directional.direction[dlen] = tmpDirection[0];
                        directional.direction[dlen+1] = tmpDirection[1];
                        directional.direction[dlen+2] =  tmpDirection[2];
                    } else {
                        directional.direction[dlen] = XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION[0];
                        directional.direction[dlen+1] = XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION[1];
                        directional.direction[dlen+2] = XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION[2];
                    }

	                directional.visibility[dlen] = 1;
	                directional.visibility[dlen+1] = 1;
	                directional.visibility[dlen+2] = 1;
	                directional.length++;
	                break;
                default:
                    XML3D.debug.logWarning("Unsupported lightshader type: " + script);
	        }
	    }
	};
	
	XML3DLightRenderAdapter.prototype.getLightShader = function() {
		if (!this.lightShader) {
			var shaderLink = this.node.shader;
			var shader = null;
			if (shaderLink != "")
				shader = XML3D.URIResolver.resolve(shaderLink);
			// if no shader attribute is specified, try to get a shader from the style attribute
			if(shader == null)
			{
				var styleValue = this.node.getAttribute('style');
				if(!styleValue)
					return null;
				var pattern    = /shader\s*:\s*url\s*\(\s*(\S+)\s*\)/i;
				var result = pattern.exec(styleValue);
				if (result)
					shader = this.node.xml3ddocument.resolve(result[1]);
			}
			this.lightShader = this.factory.getAdapter(shader);
		}
		return this.lightShader;
	};
	XML3DLightRenderAdapter.prototype.dispose = function() {
		this.isValid = false;
	};

	// Export to XML3D.webgl namespace
	XML3D.webgl.XML3DLightRenderAdapter = XML3DLightRenderAdapter;

}());// adapter/factory.js

(function() {
    var XML3DRenderAdapterFactory = function(handler, renderer) {
        XML3D.data.AdapterFactory.call(this);
        this.handler = handler;
        this.renderer = renderer;
        this.name = "XML3DRenderAdapterFactory";
    };
    XML3D.createClass(XML3DRenderAdapterFactory, XML3D.data.AdapterFactory);
        
    var gl = XML3D.webgl,
        reg = {
            xml3d:          gl.XML3DCanvasRenderAdapter,
            view:           gl.XML3DViewRenderAdapter,
            defs:           gl.XML3DDefsRenderAdapter,
            mesh:           gl.XML3DMeshRenderAdapter,
            transform:      gl.XML3DTransformRenderAdapter,
            shader:         gl.XML3DShaderRenderAdapter,
            texture:        gl.XML3DTextureRenderAdapter,
            group:          gl.XML3DGroupRenderAdapter,
            img:            gl.XML3DImgRenderAdapter,
            light:          gl.XML3DLightRenderAdapter,
            lightshader:    gl.XML3DLightShaderRenderAdapter
            
    };
    
    XML3DRenderAdapterFactory.prototype.createAdapter = function(node) {
        var adapterContructor = reg[node.localName];
        if(adapterContructor !== undefined) {
            return new adapterContructor(this, node);
        }
        return null;
    };

    
    // Export
    XML3D.webgl.XML3DRenderAdapterFactory = XML3DRenderAdapterFactory;
}());
var g_shaders = {};

g_shaders["urn:xml3d:shader:matte"] = g_shaders["urn:xml3d:shader:flat"] = {
	vertex :
			 "attribute vec3 position;"
			+ "uniform mat4 modelViewProjectionMatrix;"
			+ "void main(void) {"
			+"    vec3 pos = position;\n\n //~"
			
			+ "    \ngl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);"
			+ "}",
	fragment :
			"#ifdef GL_ES\n"
			+"precision highp float;\n"
			+"#endif\n\n"
		    + "uniform vec3 diffuseColor;"
			+ "void main(void) {\n"
			+ "    gl_FragColor = vec4(diffuseColor.x, diffuseColor.y, diffuseColor.z, 1.0);"
			+ "}"
};
g_shaders["urn:xml3d:shader:mattevcolor"] = g_shaders["urn:xml3d:shader:flatvcolor"] = {
		vertex :
				 "attribute vec3 position;"
				+ "attribute vec3 color;"
				+ "varying vec3 fragVertexColor;"
				+ "uniform mat4 modelViewProjectionMatrix;"
				+ "void main(void) {"
				+"    vec3 pos = position;\n\n //~"

				+ "    \nfragVertexColor = color;"
				+ "    gl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);"
				+ "}",
		fragment :
				"#ifdef GL_ES\n"
				+"precision highp float;\n"
				+"#endif\n\n"
			    + "uniform vec3 diffuseColor;"
				+ "varying vec3 fragVertexColor;"
				+ "void main(void) {"
				+ "    gl_FragColor = vec4(fragVertexColor, 1.0);"
				+ "}"
	};

g_shaders["urn:xml3d:shader:diffuse"] = {
		vertex :

		"attribute vec3 position;\n"
		+"attribute vec3 normal;\n"

		+"varying vec3 fragNormal;\n"
		+"varying vec3 fragVertexPosition;\n"
		+"varying vec3 fragEyeVector;\n"

		+"uniform mat4 modelViewProjectionMatrix;\n"
		+"uniform mat4 modelViewMatrix;\n"
		+"uniform mat3 normalMatrix;\n"
		+"uniform vec3 eyePosition;\n"

		+"void main(void) {\n"
		+"    vec3 pos = position;\n"
		+"    vec3 norm = normal;\n\n //~"
		
		+"	  \ngl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);\n"
		+"	  fragNormal = normalize(normalMatrix * norm);\n"
		+"	  fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;\n"
		+"	  fragEyeVector = normalize(fragVertexPosition);\n"
		+"}\n",

	fragment:
	// NOTE: Any changes to this area must be carried over to the substring calculations in
	// XML3D.webgl.Renderer.prototype.getStandardShaderProgram
			"#ifdef GL_ES\n"
			+"precision highp float;\n"
			+"#endif\n\n"
			+"// const int MAX_POINTLIGHTS = 0; \n"
	// ------------------------------------------------------------------------------------
			+"uniform vec3 diffuseColor;\n"
			+"uniform vec3 emissiveColor;\n"

			+"varying vec3 fragNormal;\n"
			+"varying vec3 fragVertexPosition;\n"
			+"varying vec3 fragEyeVector;\n"

			+"uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightPosition[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightIntensity[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightVisibility[MAX_POINTLIGHTS+1];\n"

			+"void main(void) {\n"
			+"  vec3 color = emissiveColor;\n"
			+"	if (MAX_POINTLIGHTS < 1) {\n"
			+"      vec3 normal = fragNormal;\n"
			+"      vec3 eye = fragEyeVector;\n"
			+"      float diffuse = max(0.0, dot(normal, -eye)) ;\n"
			+"      diffuse += max(0.0, dot(normal, eye));\n"
			+"      color = color + diffuse*diffuseColor;\n"
			+"	} else {\n"
			+"		for (int i=0; i<MAX_POINTLIGHTS; i++) {\n"
			+"			vec3 L = pointLightPosition[i] - fragVertexPosition;\n"
		 	+"      	vec3 N = fragNormal;\n"
			+"			float dist = length(L);\n"
		 	+"      	L = normalize(L);\n"
			+"			float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);\n"
			+"			vec3 Idiff = pointLightIntensity[i] * max(dot(N,L),0.0) * diffuseColor ;\n"
			+"			color = color + (atten*Idiff) * pointLightVisibility[i];\n"
			+"		}\n"
			+"  }\n"
			+"	gl_FragColor = vec4(color, 1.0);\n"
			+"}"
};


g_shaders["urn:xml3d:shader:textureddiffuse"] = {
		vertex :

		"attribute vec2 texcoord;\n"
		+"attribute vec3 position;\n"
		+"attribute vec3 normal;\n"

		+"varying vec3 fragNormal;\n"
		+"varying vec3 fragVertexPosition;\n"
		+"varying vec3 fragEyeVector;\n"
		+"varying vec2 fragTexCoord;\n"

		+"uniform mat4 modelViewProjectionMatrix;\n"
		+"uniform mat4 modelViewMatrix;\n"
		+"uniform mat3 normalMatrix;\n"
		+"uniform vec3 eyePosition;\n"

		+"void main(void) {\n"
		+"    vec2 tex = texcoord;\n"
		+"    vec3 pos = position;\n"
		+"    vec3 norm = normal;\n\n //~"
		
		+"	  \ngl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);\n"
		+"	  fragNormal = normalize(normalMatrix * norm);\n"
		+"	  fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;\n"
		+"	  fragEyeVector = normalize(fragVertexPosition);\n"
		+"    fragTexCoord = tex;\n"
		+"}\n",

	fragment:
	// NOTE: Any changes to this area must be carried over to the substring calculations in
	// XML3D.webgl.Renderer.prototype.getStandardShaderProgram
			"#ifdef GL_ES\n"
			+"precision highp float;\n"
			+"#endif\n\n"
			+"// const int MAX_POINTLIGHTS = 0; \n"
	// ------------------------------------------------------------------------------------
			+"uniform vec3 diffuseColor;\n"
			+"uniform sampler2D diffuseTexture;"
			+"uniform vec3 emissiveColor;\n"

			+"varying vec3 fragNormal;\n"
			+"varying vec3 fragVertexPosition;\n"
			+"varying vec3 fragEyeVector;\n"
			+"varying vec2 fragTexCoord;\n"

			+"uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightPosition[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightIntensity[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightVisibility[MAX_POINTLIGHTS+1];\n"

			+"void main(void) {\n"
			+"  vec3 color = emissiveColor;\n"
			+"	if (MAX_POINTLIGHTS < 1) {\n"
			+"      vec3 normal = fragNormal;\n"
			+"      vec3 eye = fragEyeVector;\n"
			+"      float diffuse = max(0.0, dot(normal, -eye)) ;\n"
			+"      diffuse += max(0.0, dot(normal, eye));\n"
			+"      color = color + diffuse*texture2D(diffuseTexture, fragTexCoord).xyz;\n"
			+"	} else {\n"
			+"      vec4 texDiffuse = texture2D(diffuseTexture, fragTexCoord);\n"
			+"		for (int i=0; i<MAX_POINTLIGHTS; i++) {\n"
			+"			vec3 L = lPosition.xyz - fragVertexPosition;\n"
		 	+"      	vec3 N = fragNormal;\n"
			+"			float dist = length(L);\n"
		 	+"      	L = normalize(L);\n"
			+"			float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);\n"
			+"			vec3 Idiff = pointLightIntensity[i] * max(dot(N,L),0.0) * texDiffuse.xyz;\n"
			+"			color = color + (atten*Idiff) * pointLightVisibility[i];\n"
			+"		}\n"
			+"  }\n"
			+"	gl_FragColor = vec4(color, 1.0);\n"
			+"}"
};


g_shaders["urn:xml3d:shader:diffusevcolor"] = {
		vertex :

		"attribute vec3 position;\n"
		+"attribute vec3 normal;\n"
		+"attribute vec3 color;\n"

		+"varying vec3 fragNormal;\n"
		+"varying vec3 fragVertexPosition;\n"
		+"varying vec3 fragEyeVector;\n"
		+"varying vec3 fragVertexColor;\n"

		+"uniform mat4 modelViewProjectionMatrix;\n"
		+"uniform mat4 modelViewMatrix;\n"
		+"uniform mat3 normalMatrix;\n"
		+"uniform vec3 eyePosition;\n"

		+"void main(void) {\n"
		+"    vec3 pos = position;\n"
		+"    vec3 norm = normal;\n\n //~"
		
		+"	  \ngl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);\n"
		+"	  fragNormal = normalize(normalMatrix * norm);\n"
		+"	  fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;\n"
		+"	  fragEyeVector = normalize(fragVertexPosition);\n"
		+"	  fragVertexColor = color;\n"
		+"}\n",

	fragment:
	// NOTE: Any changes to this area must be carried over to the substring calculations in
	// XML3D.webgl.Renderer.prototype.getStandardShaderProgram
			"#ifdef GL_ES\n"
			+"precision highp float;\n"
			+"#endif\n\n"
			+"// const int MAX_POINTLIGHTS = 0; \n"
	// ------------------------------------------------------------------------------------
			+"uniform vec3 diffuseColor;\n"
			+"uniform vec3 emissiveColor;\n"

			+"varying vec3 fragNormal;\n"
			+"varying vec3 fragVertexPosition;\n"
			+"varying vec3 fragEyeVector;\n"
			+"varying vec3 fragVertexColor;\n"

			+"uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightPosition[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightIntensity[MAX_POINTLIGHTS+1];\n"
			+"uniform vec3 pointLightVisibility[MAX_POINTLIGHTS+1];\n"

			+"void main(void) {\n"
			+"  vec3 color = emissiveColor;\n"
			+"	if (MAX_POINTLIGHTS < 1) {\n"
			+"      vec3 normal = fragNormal;\n"
			+"      vec3 eye = fragEyeVector;\n"
			+"      float diffuse = max(0.0, dot(normal, -eye)) ;\n"
			+"      diffuse += max(0.0, dot(normal, eye));\n"
			+"      color = color + diffuse*fragVertexColor;\n"
			+"	} else {\n"
			+"		for (int i=0; i<MAX_POINTLIGHTS; i++) {\n"
			+"			vec3 L = pointLightPosition[i] - fragVertexPosition;\n"
		 	+"      	vec3 N = fragNormal;\n"
			+"			float dist = length(L);\n"
		 	+"      	L = normalize(L);\n"
			+"			float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);\n"
			+"			vec3 Idiff = pointLightIntensity[i] * max(dot(N,L),0.0) * fragVertexColor ;\n"
			+"			color = color + (atten*Idiff) * pointLightVisibility[i];\n"
			+"		}\n"
			+"  }\n"
			+"	gl_FragColor = vec4(color, 1.0);\n"
			+"}"
};




g_shaders["urn:xml3d:shader:phongvcolor"] = {
		vertex :

			"attribute vec3 position;\n"
			+"attribute vec3 normal;\n"
			+"attribute vec3 color;\n"

			+"varying vec3 fragNormal;\n"
			+"varying vec3 fragVertexPosition;\n"
			+"varying vec3 fragEyeVector;\n"
			+"varying vec3 fragVertexColor;\n"

			+"uniform mat4 modelViewProjectionMatrix;\n"
			+"uniform mat4 modelViewMatrix;\n"
			+"uniform mat3 normalMatrix;\n"
			+"uniform vec3 eyePosition;\n"

			+"void main(void) {\n"
			+"    vec3 pos = position;\n"
			+"    vec3 norm = normal;\n\n //~"
			
			+"	  \ngl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);\n"
			+"	  fragNormal = normalize(normalMatrix * norm);\n"
			+"	  fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;\n"
			+"	  fragEyeVector = normalize(fragVertexPosition);\n"
			+ "   fragVertexColor = color;\n"
			+"}\n",

		fragment:
		// NOTE: Any changes to this area must be carried over to the substring calculations in
		// XML3D.webgl.Renderer.prototype.getStandardShaderProgram
				"#ifdef GL_ES\n"
				+"precision highp float;\n"
				+"#endif\n\n"
				+"// const int MAX_POINTLIGHTS = 0; \n"
		// ------------------------------------------------------------------------------------
				+"uniform float ambientIntensity;\n"
				+"uniform vec3 diffuseColor;\n"
				+"uniform vec3 emissiveColor;\n"
				+"uniform float shininess;\n"
				+"uniform vec3 specularColor;\n"
				+"uniform float transparency;\n"
				+"uniform float lightOn;\n"

				+"varying vec3 fragNormal;\n"
				+"varying vec3 fragVertexPosition;\n"
				+"varying vec3 fragEyeVector;\n"
				+"varying vec3 fragVertexColor;\n"
				+"#if MAX_POINTLIGHTS > 0\n"
				+"uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS+1];\n"
				+"uniform vec3 pointLightPosition[MAX_POINTLIGHTS+1];\n"
				+"uniform vec3 pointLightIntensity[MAX_POINTLIGHTS+1];\n"
				+"uniform vec3 pointLightVisibility[MAX_POINTLIGHTS+1];\n"
				+"#endif\n"
				
				+"void main(void) {\n"
				+"  if (transparency > 0.95) discard;\n"
				+"  vec3 color = emissiveColor;\n"
				+"#if MAX_POINTLIGHTS < 1\n"
				+"      vec3 light = -normalize(fragVertexPosition);\n"
				+"      vec3 normal = fragNormal;\n"
				+"      vec3 eye = fragEyeVector;\n"
				+"      vec3 lightEye = normalize(light-eye);\n"
				+"      float diffuse = max(0.0, dot(normal, -eye)) ;\n"
				+"      diffuse += max(0.0, dot(normal, eye));\n"
				+"      float specular = pow(max(0.0, dot(normal, lightEye)), shininess*128.0);\n"
				+"      specular += pow(max(0.0, dot(normal, -lightEye)), shininess*128.0);\n"
				+"      color += diffuse*fragVertexColor + specular*specularColor;\n"
				+"#else\n"
				+"		for (int i=0; i<MAX_POINTLIGHTS; i++) {\n"
				+"			vec3 L = pointLightPosition[i] - fragVertexPosition;\n"
			 	+"      	vec3 N = fragNormal;\n"
			 	+"			vec3 E = fragEyeVector;\n"
				+"			float dist = length(L);\n"
			 	+"      	L = normalize(L);\n"
				+"			vec3 R = normalize(reflect(L,N));\n"

				+"			float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);\n"
				+"			vec3 Idiff = pointLightIntensity[i] * max(dot(N,L),0.0) * fragVertexColor ;\n"
				+"			vec3 Ispec = specularColor * pow(max(dot(R,E),0.0), shininess*128.0) * pointLightIntensity[i];\n"
				+"			color += (atten*(Idiff + Ispec))*pointLightVisibility[i];\n"
				+"      }\n"
				+"#endif\n"
				+"	gl_FragColor = vec4(color, max(0.0, 1.0 - transparency));\n"
				+"}"
	};

g_shaders["urn:xml3d:shader:picking"] = {
		vertex:

		"attribute vec3 position;\n"
		+ "uniform mat4 modelMatrix;\n"
		+ "uniform mat4 modelViewProjectionMatrix;\n"
		+ "uniform vec3 min;\n"
		+ "uniform vec3 max;\n"

		+ "varying vec3 worldCoord;\n"
		+ "void main(void) {\n"
		+ "    worldCoord = (modelMatrix * vec4(position, 1.0)).xyz;\n"
		+ "    vec3 diff = max - min;\n"
		+ "    worldCoord = worldCoord - min;\n"
		+ "    worldCoord = worldCoord / diff;"
		+ "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);\n"
		+ "}" ,

		fragment:


		"#ifdef GL_ES\n"
		+"precision highp float;\n"
		+"#endif\n\n"
		+"uniform float id;"
		+ "varying vec3 worldCoord;\n"

		+ "void main(void) {\n"
		+ "    gl_FragColor = vec4(worldCoord, id);\n"
		+ "}\n"
	};

g_shaders["urn:xml3d:shader:pickedNormals"] = {
		vertex:

		"attribute vec3 position;\n"
		+ "attribute vec3 normal;\n"
		+ "uniform mat4 modelViewMatrix;\n"
		+ "uniform mat4 modelViewProjectionMatrix;\n"
		+ "uniform mat3 normalMatrix;\n"

		+ "varying vec3 fragNormal;\n"
		
		+ "void main(void) {\n"
		+ "	   fragNormal = normalize(normalMatrix * normal);\n"
		+ "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);\n"
		+ "}" ,

		fragment:


		"#ifdef GL_ES\n"
		+"precision highp float;\n"
		+"#endif\n\n"
		
		+ "varying vec3 fragNormal;\n"

		+ "void main(void) {\n"
		+ "    gl_FragColor = vec4((fragNormal+1.0)/2.0, 1.0);\n"
		+ "}\n"
	};
g_shaders["urn:xml3d:shader:phong"] = {
        vertex :

        "attribute vec3 position;\n"
        +"attribute vec3 normal;\n"

        +"varying vec3 fragNormal;\n"
        +"varying vec3 fragVertexPosition;\n"
        +"varying vec3 fragEyeVector;\n"

        +"uniform mat4 modelViewProjectionMatrix;\n"
        +"uniform mat4 modelViewMatrix;\n"
        +"uniform mat3 normalMatrix;\n"

        +"void main(void) {\n"
        +"    vec3 pos = position;\n"
        +"    vec3 norm = normal;\n\n //~"

        +"    \ngl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);\n"
        +"    fragNormal = normalize(normalMatrix * norm);\n"
        +"    fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;\n"
        +"    fragEyeVector = normalize(fragVertexPosition);\n"
        +"}\n",

    fragment:
    // NOTE: Any changes to this area must be carried over to the substring calculations in
    // XML3D.webgl.Renderer.prototype.getStandardShaderProgram
            "#ifdef GL_ES\n"
            +"precision highp float;\n"
            +"#endif\n\n"
    // ------------------------------------------------------------------------------------
            +"uniform float ambientIntensity;\n"
            +"uniform vec3 diffuseColor;\n"
            +"uniform vec3 emissiveColor;\n"
            +"uniform float shininess;\n"
            +"uniform vec3 specularColor;\n"
            +"uniform float transparency;\n"
            +"uniform mat4 viewMatrix;\n"

            +"varying vec3 fragNormal;\n"
            +"varying vec3 fragVertexPosition;\n"
            +"varying vec3 fragEyeVector;\n"

            +"#if MAX_POINTLIGHTS > 0\n"
            +"uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS+1];\n"
            +"uniform vec3 pointLightPosition[MAX_POINTLIGHTS+1];\n"
            +"uniform vec3 pointLightIntensity[MAX_POINTLIGHTS+1];\n"
            +"uniform vec3 pointLightVisibility[MAX_POINTLIGHTS+1];\n"
            +"#endif\n"

            +"#if MAX_DIRECTIONALLIGHTS > 0\n"
            +"uniform vec3 directionalLightDirection[MAX_DIRECTIONALLIGHTS+1];\n"
            +"uniform vec3 directionalLightIntensity[MAX_DIRECTIONALLIGHTS+1];\n"
            +"uniform vec3 directionalLightVisibility[MAX_DIRECTIONALLIGHTS+1];\n"
            +"#endif\n"

            +"void main(void) {\n"
            +"  if (transparency > 0.95) discard;\n"
            +"  vec3 color = diffuseColor * ambientIntensity + emissiveColor;\n"

            +"#if MAX_POINTLIGHTS > 0\n"
            +"  for (int i=0; i<MAX_POINTLIGHTS; i++) {\n"
            +"    vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );"
            +"    vec3 L = lPosition.xyz - fragVertexPosition;\n"
            +"    float dist = length(L);\n"
            +"    L = normalize(L);\n"
            +"    vec3 R = normalize(reflect(L,fragNormal));\n"
            +"    float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);\n"
            +"    vec3 Idiff = pointLightIntensity[i] * max(dot(fragNormal,L),0.0) * diffuseColor ;\n"
            +"    vec3 Ispec = specularColor * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0) * pointLightIntensity[i];\n"
            +"    color = color + (atten*(Idiff + Ispec)) * pointLightVisibility[i];\n"
            +"  }\n"
            +"#endif\n"

            +"#if MAX_DIRECTIONALLIGHTS > 0\n"
            +"  for (int i=0; i<MAX_DIRECTIONALLIGHTS; i++) {\n"
            +"    vec4 lDirection = viewMatrix * vec4(directionalLightDirection[i], 0.0);"
            +"    vec3 L =  normalize(lDirection.xyz);\n"
            +"    vec3 R = normalize(reflect(L,fragNormal));\n"
            +"    vec3 Idiff = directionalLightIntensity[i] * diffuseColor  * max(dot(fragNormal,L),0.0);\n"
            +"    vec3 Ispec = directionalLightIntensity[i] * specularColor * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);\n"
            +"    color = color + ((Idiff + Ispec));// * directionalLightVisibility[i];\n"
            +"  }\n"
            +"#endif\n"

            +"  gl_FragColor = vec4(color, max(0.0, 1.0 - transparency));\n"
            +"}"
};

g_shaders["urn:xml3d:shader:texturedphong"] = {
        vertex :

        "attribute vec3 position;\n"
        +"attribute vec3 normal;\n"
        +"attribute vec2 texcoord;\n"

        +"varying vec3 fragNormal;\n"
        +"varying vec3 fragVertexPosition;\n"
        +"varying vec3 fragEyeVector;\n"
        +"varying vec2 fragTexCoord;\n"

        +"uniform mat4 modelViewProjectionMatrix;\n"
        +"uniform mat4 modelViewMatrix;\n"
        +"uniform mat3 normalMatrix;\n"

        +"void main(void) {\n"
        +"    vec2 tex = texcoord;\n"
        +"    vec3 pos = position;\n"
        +"    vec3 norm = normal;\n\n //~"

        +"    \ngl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);\n"
        +"    fragNormal = normalize(normalMatrix * norm);\n"
        +"    fragVertexPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;\n"
        +"    fragEyeVector = normalize(fragVertexPosition);\n"
        +"    fragTexCoord = tex;\n"
        +"}\n",

    fragment:
        // NOTE: Any changes to this area must be carried over to the substring calculations in
        // XML3D.webgl.Renderer.prototype.getStandardShaderProgram
            "#ifdef GL_ES\n"
            +"precision highp float;\n"
            +"#endif\n\n"
            +"// const int MAX_POINTLIGHTS = 0; \n"
        // ------------------------------------------------------------------------------------
            +"uniform float ambientIntensity;\n"
            +"uniform vec3 diffuseColor;\n"
            +"uniform vec3 emissiveColor;\n"
            +"uniform float shininess;\n"
            +"uniform vec3 specularColor;\n"
            +"uniform float transparency;\n"
            +"uniform float lightOn;\n"
            +"uniform sampler2D diffuseTexture;\n"
            +"uniform mat4 viewMatrix;\n"

            +"uniform sampler2D specularTexture;\n"
            +"uniform bool useSpecularTexture;\n"

            +"varying vec3 fragNormal;\n"
            +"varying vec3 fragVertexPosition;\n"
            +"varying vec3 fragEyeVector;\n"
            +"varying vec2 fragTexCoord;\n"

            +"#if MAX_POINTLIGHTS > 0\n"
            +"uniform vec3 pointLightAttenuation[MAX_POINTLIGHTS+1];\n"
            +"uniform vec3 pointLightPosition[MAX_POINTLIGHTS+1];\n"
            +"uniform vec3 pointLightIntensity[MAX_POINTLIGHTS+1];\n"
            +"uniform vec3 pointLightVisibility[MAX_POINTLIGHTS+1];\n"
            +"#endif\n"

            +"#if MAX_DIRECTIONALLIGHTS > 0\n"
            +"uniform vec3 directionalLightDirection[MAX_DIRECTIONALLIGHTS+1];\n"
            +"uniform vec3 directionalLightIntensity[MAX_DIRECTIONALLIGHTS+1];\n"
            +"uniform vec3 directionalLightVisibility[MAX_DIRECTIONALLIGHTS+1];\n"
            +"#endif\n"

            +"void main(void) {\n"
            +"  vec4 texDiffuse = texture2D(diffuseTexture, fragTexCoord);\n"
            +"  vec3 objDiffuse = diffuseColor * texDiffuse.xyz;\n"
            +"  vec3 objSpecular = specularColor;\n"
            +"  if(useSpecularTexture)\n"
            +"    objSpecular = objSpecular * texture2D(specularTexture, fragTexCoord).xyz;\n"
            +"  vec3 color = objDiffuse * ambientIntensity + emissiveColor;\n"

            +"#if MAX_POINTLIGHTS > 0\n"
            +"  for (int i=0; i<MAX_POINTLIGHTS; i++) {\n"
            +"    vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );"
            +"    vec3 L = lPosition.xyz - fragVertexPosition;\n"
            +"    float dist = length(L);\n"
            +"    L = normalize(L);\n"
            +"    vec3 R = normalize(reflect(L,fragNormal));\n"
            +"    float atten = 1.0 / (pointLightAttenuation[i].x + pointLightAttenuation[i].y * dist + pointLightAttenuation[i].z * dist * dist);\n"
            +"    vec3 Idiff = pointLightIntensity[i] * objDiffuse * max(dot(fragNormal,L),0.0);\n"
            +"    vec3 Ispec = pointLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);\n"
            +"    color = color + (atten*(Idiff + Ispec));// * pointLightVisibility[i];\n"
            +"  }\n"
            +"#endif\n"

            +"#if MAX_DIRECTIONALLIGHTS > 0\n"
            +"  for (int i=0; i<MAX_DIRECTIONALLIGHTS; i++) {\n"
            +"    vec4 lDirection = viewMatrix * vec4(directionalLightDirection[i], 0.0);"
            +"    vec3 L =  normalize(lDirection.xyz);\n"
            +"    vec3 R = normalize(reflect(L,fragNormal));\n"
            +"    vec3 Idiff = directionalLightIntensity[i] * objDiffuse  * max(dot(fragNormal,L),0.0);\n"
            +"    vec3 Ispec = directionalLightIntensity[i] * objSpecular * pow(max(dot(R,fragEyeVector),0.0), shininess*128.0);\n"
            +"    color = color + ((Idiff + Ispec));// * directionalLightVisibility[i];\n"
            +"  }\n"
            +"#endif\n"

            +"  float alpha = texDiffuse.w * max(0.0, 1.0 - transparency);\n"
            +"  if (alpha < 0.05) discard;\n"
            +"  gl_FragColor = vec4(color, alpha);\n"
            +"}"
};// data/xflow/base.js
(function() {
    "use strict";
     var xflow = {};
     var scripts = {};
     
     xflow.register = function(name, script) {
         scripts[name] = script;
         script.name = name;
     };
    
     xflow.getScript = function(script) {
         return scripts[script];
     };
     
     XML3D.xflow = xflow;
})();

XML3D.xflow.register("morph3", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['value','valueAdd','weight'],
    evaluate: function(value, valueAdd, weight) {
        if(!(value && valueAdd && weight))
            throw "Xflow::morph3: Not all parameters are set";
        
        if(value.length != valueAdd.length)
            throw "Xflow::morph3: Input arrays differ in size";
        if (!this.tmp || this.tmp.length != value.length)
            this.tmp = new Float32Array(value.length);
            
        var result = this.tmp;
        for(var i = 0; i<value.length; i++)
            result[i] = value[i] + weight[0] * valueAdd[i];
        
        this.result.result = result;
        return true;
    },
    
    evaluate_parallel: function(value, valueAdd, weight) {
        if(!(value && valueAdd && weight))
            throw "Xflow::morph3: Not all parameters are set";
        
        if(value.length != valueAdd.length)
            throw "Xflow::morph3: Input arrays differ in size";
        if (!this.tmp || this.tmp.length != value.length)
            this.tmp = new Float32Array(value.length);
            
        var result = this.tmp;
        for(var i = 0; i<value.length; i++)
            result[i] = value[i] + weight[0] * valueAdd[i];
        
        this.result.result = result;
        return true;
    }
});XML3D.xflow.register("sub3", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['value1','value2'],
    evaluate: function(value1, value2) {
        if(!(value1 && value2))
            throw "Xflow::sub3: Not all parameters are set";
        
        if(value1.length != value1.length)
            throw "Xflow::sub3: Input arrays differ in size";
        
        if (!this.tmp || this.tmp.length != value1.length)
            this.tmp = new Float32Array(value1.length);
            
        var result = this.tmp;
        for(var i = 0; i<value1.length; i++)
            result[i] = value1[i] - value2[i];
        
        this.result.result = result;
        return true;
    }
});XML3D.xflow.register("normalize3", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['value'],
    evaluate: function(value) {
        if(!value)
            throw "Xflow::normalize: Not input";
        
        if (!this.tmp || this.tmp.length != value.length)
            this.tmp = new Float32Array(value.length);
            
        var result = this.tmp;
        for(var i = 0; i<value.length/3; i++) {
            var offset = 3*i;
            var x = value[offset];
            var y = value[offset+1];
            var z = value[offset+2];
            var l = 1.0/Math.sqrt(x*x+y*y+z*z);
            result[offset] = x*l;
            result[offset+1] = y*l;
            result[offset+2] = z*l;
        }
        this.result.result = result;
        return true;
    }
});XML3D.xflow.register("lerp3Seq", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['sequence','weight'],
    evaluate: function(sequence, weight) {
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
        return true;
    },
    
    evaluate_parallel: function(sequence, weight) {
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
        return true;
    }
});XML3D.xflow.register("slerpSeq", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['sequence','weight'],
    evaluate: function(sequence, weight) {
        var me = this;
        this.result.result = sequence.interpolate(weight[0], function(v1,v2,t) {
            var count = v1.length;
            if (!me.tmp || me.tmp.length != count)
                me.tmp = new Float32Array(count);
            var result = me.tmp;
            for(var i = 0; i < count / 4; i++) {
                var offset = i*4;
                quat4.slerpOffset(v1,v2,offset,t,result, true);
            };
            return result;
        });
        return true;
    },

    evaluate_parallel: function(sequence, weight) {
        var me = this;
        this.result.result = sequence.interpolate(weight[0], function(v1,v2,t) {
            var count = v1.length;
            if (!me.tmp || me.tmp.length != count)
                me.tmp = new Float32Array(count);
            var result = me.tmp;
            for(var i = 0; i < count / 4; i++) {
                var offset = i*4;
                quat4.slerpOffset(v1,v2,offset,t,result, true);
            };
            return result;
        });
        return true;
    }
});XML3D.xflow.register("createTransform", {
    outputs: [{name: 'result', tupleSize: '16'}],
    params:  ['translation','rotation','scale','center','scaleOrientation'],
    evaluate: function(translation,rotation,scale,center,scaleOrientation) {
        rotation = rotation.data ? rotation.data[0].getValue() : rotation;
        var count = translation ? translation.length / 3 :
                    rotation ? rotation.length / 4 :
                    scale ? scale.length / 3 :
                    center ? center.length / 3 :
                    scaleOrientation ? scaleOrientation / 4 : 0;
        if(!count)
            throw ("createTransform: No input found");
        if (!this.tmp || this.tmp.length != count*16) {
         	this.tmp = new Float32Array(count * 16);
        }
          
        var result = this.tmp;
        for(var i = 0; i < count; i++) {
            mat4.makeTransformOffset(translation,rotation,scale,center,scaleOrientation,i,result);
        }
        this.result.result = result;
        return true;
    },
    evaluate_parallel: function( translation,rotation,scale,center,scaleOrientation) {
    	var count = translation ? translation.length / 3 :
            rotation ? rotation.length / 4 :
            scale ? scale.length / 3 :
            center ? center.length / 3 :
            scaleOrientation ? scaleOrientation / 4: 0;
    	
    	if (!this.tmp || this.tmp.length != count*16) {
       	  	this.tmp = new Float32Array(count * 16);
        }
        
        var result = this.tmp;
        for(var i = 0; i < count; i++) {
            mat4.makeTransformOffset(translation,rotation,scale,center,scaleOrientation,i,result);
        }
        this.result.result = result;
        
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
});XML3D.xflow.register("mul4x4", {
    outputs: [{name: 'result', tupleSize: '16'}],
    params:  ['value1','value2'],
    evaluate: function(value1, value2) {
        if(!(value1 && value2))
            throw "Xflow::mul4x4: Not all parameters are set";

        if(value1.length != value1.length)
            throw "Xflow::mul4x4: Input arrays differ in size";

        if (!this.tmp || this.tmp.length != value1.length)
            this.tmp = new Float32Array(value1.length);
            
        var result = this.tmp;
        var count = value1.length / 16;
        for(var i = 0; i < count; i++)
        {
            var offset = i*16;
            mat4.multiplyOffset(result, offset, value1, offset, value2, offset);
        }
        this.result.result = result;
        return true;
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
            mat4.multiplyOffset(result, offset, value1, offset, value2, offset);
        }
        //this.parallel_data = new ParallelArray(result).partition(16);
        this.result.result = result;*/
        
        
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
        
        return true;
    }
});XML3D.xflow.register("skinDirection", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['dir','boneIdx','boneWeight','boneXform'],
    evaluate: function(dir,boneIdx,boneWeight,boneXform) {
        var count = dir.length / 3;
        if (!this.tmp || this.tmp.length != dir.length)
            this.tmp = new Float32Array(dir.length);
            
        var result = this.tmp;

        var m = mat4.create();
        var r = vec3.create();
        var tmp = vec3.create();

        for(var i = 0; i<count;i++) {
            var offset = i*3;
            r[0] = r[1] = r[2] = +0;

            for(var j = 0; j < 4; j++) {
                var weight = boneWeight[i*4+j];
                if (weight) {
                    var mo = boneIdx[i*4+j]*16;

                    mat4.multiplyOffsetDirection(boneXform, mo, dir, offset, tmp);
                    vec3.scale(tmp, weight);
                    vec3.add(r, tmp);
                }
            }
            result[offset] = r[0];
            result[offset+1] = r[1];
            result[offset+2] = r[2];
        }
        this.result.result = result;
        return true;
    },

    evaluate_parallel: function(dir, boneIndex, boneWeight, boneXform) {
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
        return true;
    }
});XML3D.xflow.register("skinPosition", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['pos','boneIdx','boneWeight','boneXform'],
    evaluate: function(pos,boneIdx,boneWeight,boneXform) {
        var count = pos.length / 3;
        if (!this.tmp || this.tmp.length != pos.length)
            this.tmp = new Float32Array(pos.length);
            
        var result = this.tmp;

        var m = mat4.create();
        var r = vec3.create();
        var tmp =  vec3.create();

        for(var i = 0; i<count;i++) {
            var offset = i*3;
            r[0] = r[1] = r[2] = +0;
            for(var j = 0; j < 4; j++) {
                var weight = boneWeight[i*4+j];
                if (weight) {
                    var mo = boneIdx[i*4+j]*16;

                    mat4.multiplyOffsetVec3(boneXform, mo, pos, offset, tmp);
                    vec3.scale(tmp, weight);
                    vec3.add(r, tmp);
                }
            }
            result[offset] = r[0];
            result[offset+1] = r[1];
            result[offset+2] = r[2];
        }
        this.result.result = result;
        return true;
    },
    
    evaluate_parallel: function(pos, boneIndex, boneWeight, boneXform) {
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
        return true;
    }
});XML3D.xflow.register("skinning", {
    outputs: [{name: 'pos', tupleSize: '3'}, {name: 'dir', tupleSize:'3'}],
    params:  ['pos','dir','boneIdx','boneWeight','boneXform'],
    evaluate: function(pos,dir,boneIdx,boneWeight,boneXform) {
        var count = pos.length / 3;
        if (!this.tmpp || this.tmpp.length != pos.length) {
            this.tmpp = new Float32Array(pos.length);
            this.tmpd = new Float32Array(dir.length);
        }
            
        var resd = this.tmpp;
        var resp = this.tmpd;

        var m = mat4.create();
        var rd = vec3.create();
        var rp = vec3.create();
        
        var tmpd = vec3.create();
        var tmpp = vec3.create();

        for(var i = 0; i<count;i++) {
            var offset = i*3;
            rd[0] = rd[1] = rd[2] = +0;
            rp[0] = rp[1] = rp[2] = +0;
            for(var j = 0; j < 4; j++) {
                var weight = boneWeight[i*4+j];
                if (weight) {
                    var mo = boneIdx[i*4+j]*16;

                    mat4.multiplyOffsetVec3(boneXform, mo, pos, offset, tmpp);
                    vec3.scale(tmpp, weight);
                    vec3.add(rp, tmpp);
                    
                    mat4.multiplyOffsetDirection(boneXform, mo, dir, offset, tmpd);
                    vec3.scale(tmpd, weight);
                    vec3.add(rd, tmpd);
                }
            }
            resp[offset] = rp[0];
            resp[offset+1] = rp[1];
            resp[offset+2] = rp[2];
            resd[offset] = rd[0];
            resd[offset+1] = rd[1];
            resd[offset+2] = rd[2];
        }
        this.result.pos = resp;
        this.result.dir = resd;
        return true;
    },

    evaluate_parallel: function(pos, dir, boneIndex, boneWeight, boneXform) {
        if (!this.elementalFunc) {
            this.elementalFunc = function(index, pos, dir, boneIndex, boneWeight, boneXform) {
                var rp = [0,0,0];
                var rd = [0,0,0];
                var off4 = index*4;
                var off3 = index*3;

                var xp = pos[off3], yp = pos[off3+1], zp = pos[off3+2]; 
                var xd = dir[off3], yd = dir[off3+1], zd = dir[off3+2]; 
                
                for (var j=0; j < 4; j++) {
                    var weight = boneWeight[off4+j];
                    if (weight > 0) {
                        var mo = boneIndex[off4+j] * 16;
                        
                        rp[0] += (boneXform[mo+0]*xp + boneXform[mo+4]*yp + boneXform[mo+8]*zp + boneXform[mo+12]) * weight;
                        rp[1] += (boneXform[mo+1]*xp + boneXform[mo+5]*yp + boneXform[mo+9]*zp + boneXform[mo+13]) * weight; 
                        rp[2] += (boneXform[mo+2]*xp + boneXform[mo+6]*yp + boneXform[mo+10]*zp + boneXform[mo+14]) * weight;
    
                        rd[0] += (boneXform[mo+0]*xd + boneXform[mo+4]*yd + boneXform[mo+8]*zd) * weight;
                        rd[1] += (boneXform[mo+1]*xd + boneXform[mo+5]*yd + boneXform[mo+9]*zd) * weight; 
                        rd[2] += (boneXform[mo+2]*xd + boneXform[mo+6]*yd + boneXform[mo+10]*zd) * weight;
                    }
                }
                
                return {position : rp, direction : rd};
            };
        }

        var numVertices = pos.length / 3;
        
        var tmp = new ParallelArray(
                numVertices,
                this.elementalFunc,
                pos,
                dir,
                boneIndex,
                boneWeight,
                boneXform
        );
        var result = tmp.unzip();
        this.result.pos = result.position;
        this.result.dir = result.direction;
        return true;
    }
});XML3D.xflow.register("flattenBoneTransform", {
    outputs: [{name: 'result', tupleSize: '16'}],
    params:  ['parent','xform'],
    evaluate: function(parent,xform) {

        var boneCount = xform.length / 16;
        if (!this.tmp || this.tmp.length != xform.length)
            this.tmp = new Float32Array(xform.length);
            
        var result = this.tmp;
        var computed = [];

        //For each bone do:
        for(var i = 0; i < boneCount;){
            if(!computed[i]) {
                var p = parent[i];
                if(p >= 0){
                    //This bone has a parent bone
                    if(!computed[p]){
                        //The parent bone's transformation matrix hasn't been computed yet
                        while(parent[p] >= 0 && !computed[parent[p]]) {
                            //The current bone has a parent and its transform hasn't been computed yet
                            p = parent[p];

                            if(parent[p] >= 0)    
                                mat4.multiplyOffset(result, p*16, xform, p*16, result, parent[p]*16);
                            else
                                for(var j = 0; j < 16; j++) {
                                    result[p*16+j] = xform[p*16+j];
                                }
                            computed[p] = true;
                        }
                    }
                    else {
                        mat4.multiplyOffset(result, i*16, xform, i*16, result,  p*16);
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

        this.result.result = result;
        return true;
    },
 
    evaluate_parallel: function(parent, xform) {         
          if (!this.tmp || this.tmp.length != xform.length) {
              this.tmp = new Float32Array(xform.length);
          }
          
          var boneCount = xform.length / 16;
          var result = this.tmp;
          var xf = xform.data || xform;
          var computed = [];

          //For each bone do:
          for(var i = 0; i < boneCount;){
              if(!computed[i]) {
                  var p = parent[i];
                  if(p >= 0){
                      //This bone has a parent bone
                      if(!computed[p]){
                          //The parent bone's transformation matrix hasn't been computed yet
                          while(parent[p] >= 0 && !computed[parent[p]]) {
                              //The current bone has a parent and its transform hasn't been computed yet
                              p = parent[p];

                              if(parent[p] >= 0)    
                                  mat4.multiplyOffset(result, p*16, xf, p*16, result, parent[p]*16);
                              else
                                  for(var j = 0; j < 16; j++) {
                                      result[p*16+j] = xf[p*16+j];
                                  }
                              computed[p] = true;
                          }
                      }
                      else {
                          mat4.multiplyOffset(result, i*16, xf, i*16, result,  p*16);
                      }
                  }
                  else{
                      for(var j = 0; j < 16; j++) {
                          result[i*16+j] = xf[i*16+j];
                      }
                  }
                  computed[i] = true;
              }
              i++;
          }
          this.result.result = result;
        
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
});XML3D.xflow.register("flipNormal", {
    outputs: [{name: 'result', tupleSize: '3'}],
    params:  ['value'],
    evaluate: function(value) {
        if(!value)
            throw "Xflow::flipNormal: Not all parameters are set";
        
        if (!this.tmp || this.tmp.length != value.length)
            this.tmp = new Float32Array(value.length);
        
        var result = this.tmp;
        for(var i = 0; i<value.length; i++)
            result[i] = -value[i];
        
        this.result.result = result;
        return true;
    }
});// Additional methods in glMatrix style

mat4.multiplyOffsetVec3 = function(mat, matOffset, vec, vecOffset, dest) {
    if(!dest) { dest = vec; }
    if(!vecOffset) { vecOffset = 0; }

    var x = vec[vecOffset+0], y = vec[vecOffset+1], z = vec[vecOffset+2];

    dest[0] = mat[matOffset+0]*x + mat[matOffset+4]*y + mat[matOffset+8]*z + mat[matOffset+12];
    dest[1] = mat[matOffset+1]*x + mat[matOffset+5]*y + mat[matOffset+9]*z + mat[matOffset+13];
    dest[2] = mat[matOffset+2]*x + mat[matOffset+6]*y + mat[matOffset+10]*z + mat[matOffset+14];

    return dest;
};



mat4.multiplyOffsetDirection = function(mat, matOffset, vec, vecOffset, dest) {
    if(!dest) { dest = vec; }
    if(!vecOffset) { vecOffset = 0; }

    var x = vec[vecOffset+0], y = vec[vecOffset+1], z = vec[vecOffset+2], w;

    dest[0] = mat[matOffset+0]*x + mat[matOffset+4]*y + mat[matOffset+8]*z;
    dest[1] = mat[matOffset+1]*x + mat[matOffset+5]*y + mat[matOffset+9]*z;
    dest[2] = mat[matOffset+2]*x + mat[matOffset+6]*y + mat[matOffset+10]*z;

    return dest;
};

mat4.makeTransformOffset = function(translation,rotation,scale,center,scaleOrientation,offset,dest) {
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
        var rotM = quat4.toMat4([rotation[qo+1],rotation[qo+2],rotation[qo+3],-rotation[qo]]);
        mat4.multiplyOffset(dest, mo,  rotM, 0,  dest, mo);
    }
};

mat4.multiplyOffset = function(dest, destOffset, mat, offset1, mat2, offset2) {
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

quat4.slerpOffset = function(quat, quat2, offset, t, dest, shortest) {
    if(!dest) { dest = quat; }

    var ix = offset, iy = offset+1, iz = offset+2, iw = offset+3;

    var cosAngle =  quat[ix]*quat2[ix] + quat[iy]*quat2[iy] + quat[iz]*quat2[iz] + quat[iw]*quat2[iw];

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

    dest[ix] = c1*quat[ix] + c2*quat2[ix];
    dest[iy] = c1*quat[iy] + c2*quat2[iy];
    dest[iz] = c1*quat[iz] + c2*quat2[iz];
    dest[iw] = c1*quat[iw] + c2*quat2[iw];
};
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
};XML3D.xflow.register("noiseImage", {
    outputs: [{name: 'image', tupleSize: '1'}],
    params:  ['width','height','scale','minFreq','maxFreq'],
    evaluate: function(width,height,scale,minFreq,maxFreq) {
        var img = document.createElement('canvas');
        width = width[0];
        height = height[0];
        minFreq = minFreq[0];
        maxFreq = maxFreq[0];
        
        img.width =  width;
        img.height = height;
        var ctx = img.getContext("2d");
        if(!ctx)
            throw("Could not create 2D context.");
        
        var id = ctx.getImageData(0, 0, width, height); 
        var pix = id.data;
        this.noise = this.noise || new SimplexNoise();
        var noise = this.noise;
        
        var useTurbulence = minFreq != 0.0 && maxFreq != 0.0 && minFreq < maxFreq;

        var snoise = function(x,y) {
            return 2.0 * noise.noise(x, y) - 1.0;
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
        
        ctx.putImageData(id, 0, 0);
        //console.log(img);
        this.image = img;
        return true;
    }
});