/*! shade.js v0.2.0 | (c) 2013-2015 DFKI GmbH and contributors, www.dfki.de | https://raw.githubusercontent.com/xml3d/shade.js/master/LICENSE */!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Shade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports=require("./lib");


},{"./lib":5}],2:[function(require,module,exports){
function availableExpressions(e){function t(e){var t=new Set;return walkes(e,{Identifier:function(){return new Set(this.name)},Literal:function(){return new Set},BinaryExpression:function(e){var n=JSON.stringify(this);if(t.add(n),n in i)return i[n].variables;var r=e(this.right),s=e(this.left),a=Set.union(s,r);return i[n]={expression:this,variables:a},a}}),t}var i={},n=worklist(e,function(e,n){if(this.type||!this.astNode)return e;var r=this.kill=this.kill||findAssignments(this.astNode),s=this.generate=this.generate||t(this.astNode),a=new Set(e.values().filter(function(e){var t=i[e].variables;return!Set.intersect(t,r).size}));return Set.union(a,s)},{direction:"forward",merge:worklist.merge(Set.intersect)});return e[2].forEach(function(e){var t=n.get(e);n.set(e,new Set(t.values().map(function(e){return i[e].expression})))}),n}function findAssignments(e){var t=new Set;return walkes(e,{AssignmentExpression:function(e){"Identifier"===this.left.type&&t.add(this.left.name),e(this.right)},VariableDeclarator:function(e){t.add(this.id.name),this.init&&e(this.init)}}),t}var walkes=require("walkes"),worklist=require("../"),Set=require("../set");module.exports=availableExpressions;


},{"../":5,"../set":7,"walkes":98}],3:[function(require,module,exports){
exports.liveVariables=require("./livevariables"),exports.availableExpressions=require("./availableexpressions");


},{"./availableexpressions":2,"./livevariables":4}],4:[function(require,module,exports){
function liveVariables(i){return worklist(i,function(i){if(this.type||!this.astNode)return i;var t=this.kill=this.kill||findAssignments(this.astNode),n=this.generate=this.generate||findVariables(this.astNode);return Set.union(Set.minus(i,t),n)},{direction:"backward"})}function findAssignments(i){var t=new Set;return walkes(i,{AssignmentExpression:function(i){"Identifier"===this.left.type&&t.add(this.left.name),i(this.right)},FunctionDeclaration:function(){},FunctionExpression:function(){},VariableDeclarator:function(i){t.add(this.id.name),this.init&&i(this.init)}}),t}function findVariables(i){var t=new Set;return walkes(i,{AssignmentExpression:function(i){"Identifier"!==this.left.type&&i(this.left),i(this.right)},FunctionDeclaration:function(){},FunctionExpression:function(){},Identifier:function(){t.add(this.name)},MemberExpression:function(i){i(this.object)},Property:function(i){i(this.value)},VariableDeclarator:function(i){i(this.init)}}),t}var walkes=require("walkes"),worklist=require("../"),Set=require("../set");module.exports=liveVariables;


},{"../":5,"../set":7,"walkes":98}],5:[function(require,module,exports){
function worklist(e,r,t){t=t||{};var s=t.direction||"forward",u=t.merge||worklist.merge(Set.union),o=t.equals||Set.equals,n=new Queue;if("forward"===s){n.push(e[0]);var i=worklist.predecessors,l=worklist.successors}else{n.push(e[1]);var i=worklist.successors,l=worklist.predecessors}for(var c=t.start||new Set,p=new Map;n.length;){var a=n.shift(),w=i(a).map(function(e){return p.get(e)}),f=w.length?u(w):c,k=p.get(a),d=r.call(a,f,n,k);(!d||d instanceof Set)&&(d={output:d,enqueue:!0}),p.set(a,d.output),!d.enqueue||k&&o(d.output,k)||l(a).forEach(n.push.bind(n))}return p}var Queue=require("./queue"),Set=require("./set"),exports=module.exports=worklist;exports.Queue=Queue,exports.Set=Set,exports.examples=require("./examples"),worklist.predecessors=function(e){return e.prev},worklist.successors=function(e){return e.next},worklist.merge=function(e){return function(r){return 1==r.length?new Set(r[0]):r.reduce(e)}};


},{"./examples":3,"./queue":6,"./set":7}],6:[function(require,module,exports){
function Queue(){var e=[];return e.__proto__=Queue.prototype,e}module.exports=Queue,Queue.prototype=Object.create(Array.prototype),Queue.prototype.push=function(e){var t=this.indexOf(e);-1!=t&&this.splice(t,1),Array.prototype.push.call(this,e)};


},{}],7:[function(require,module,exports){
function Set(t){this._values=[],Array.isArray(t)?t.forEach(this.add.bind(this)):t instanceof Set&&t._values.forEach(this.add.bind(this))}module.exports=Set,Object.defineProperty(Set.prototype,"size",{enumerable:!1,configurable:!1,get:function(){return this._values.length}}),Set.prototype._i=function(t){return this._values.indexOf(t)},Set.prototype.add=function(t){this.has(t)||this._values.push(t)},Set.prototype.has=function(t){return!!~this._i(t)},Set.prototype["delete"]=function(t){var e=this._i(t);~e&&this._values.splice(e,1)},Set.prototype.values=function(){return[].concat(this._values)},["some","map","every","filter","forEach"].forEach(function(t){Set.prototype[t]=function(){return Array.prototype[t].apply(this._values,arguments)}}),Set.prototype.first=function(){return this._values[0]},Set.intersect=function(t,e){if(!t&&e)return new Set(e);if(!e&&t)return new Set(t);var n=new Set;return t.forEach(function(t){e.has(t)&&n.add(t)}),n},Set.union=function(t,e){if(!t&&e)return new Set(e);var n=new Set(t);return e&&e.forEach(n.add.bind(n)),n},Set.equals=function(t,e){return t.size!=e.size?!1:t.every(function(t){return e.has(t)})},Set.minus=function(t,e){var n=new Set(t);return e.forEach(n["delete"].bind(n)),n};


},{}],8:[function(require,module,exports){
"use strict";require("./is-implemented")()||Object.defineProperty(require("es5-ext/global"),"Map",{value:require("./polyfill"),configurable:!0,enumerable:!1,writable:!0});


},{"./is-implemented":9,"./polyfill":74,"es5-ext/global":34}],9:[function(require,module,exports){
"use strict";module.exports=function(){var e,t,n;if("function"!=typeof Map)return!1;try{e=new Map([["raz","one"],["dwa","two"],["trzy","three"]])}catch(o){return!1}return 3!==e.size?!1:"function"!=typeof e.clear?!1:"function"!=typeof e["delete"]?!1:"function"!=typeof e.entries?!1:"function"!=typeof e.forEach?!1:"function"!=typeof e.get?!1:"function"!=typeof e.has?!1:"function"!=typeof e.keys?!1:"function"!=typeof e.set?!1:"function"!=typeof e.values?!1:(t=e.entries(),n=t.next(),n.done!==!1?!1:n.value?"raz"!==n.value[0]?!1:"one"!==n.value[1]?!1:!0:!1)};


},{}],10:[function(require,module,exports){
"use strict";module.exports=function(){return"undefined"==typeof Map?!1:"[object Map]"===Object.prototype.toString.call(Map.prototype)}();


},{}],11:[function(require,module,exports){
"use strict";module.exports=require("es5-ext/object/primitive-set")("key","value","key+value");


},{"es5-ext/object/primitive-set":48}],12:[function(require,module,exports){
"use strict";var setPrototypeOf=require("es5-ext/object/set-prototype-of"),d=require("d"),Iterator=require("es6-iterator"),toStringTagSymbol=require("es6-symbol").toStringTag,kinds=require("./iterator-kinds"),defineProperties=Object.defineProperties,unBind=Iterator.prototype._unBind,MapIterator;MapIterator=module.exports=function(t,e){return this instanceof MapIterator?(Iterator.call(this,t.__mapKeysData__,t),e&&kinds[e]||(e="key+value"),void defineProperties(this,{__kind__:d("",e),__values__:d("w",t.__mapValuesData__)})):new MapIterator(t,e)},setPrototypeOf&&setPrototypeOf(MapIterator,Iterator),MapIterator.prototype=Object.create(Iterator.prototype,{constructor:d(MapIterator),_resolve:d(function(t){return"value"===this.__kind__?this.__values__[t]:"key"===this.__kind__?this.__list__[t]:[this.__list__[t],this.__values__[t]]}),_unBind:d(function(){this.__values__=null,unBind.call(this)}),toString:d(function(){return"[object Map Iterator]"})}),Object.defineProperty(MapIterator.prototype,toStringTagSymbol,d("c","Map Iterator"));


},{"./iterator-kinds":11,"d":14,"es5-ext/object/set-prototype-of":49,"es6-iterator":61,"es6-symbol":70}],13:[function(require,module,exports){
"use strict";var copy=require("es5-ext/object/copy"),map=require("es5-ext/object/map"),callable=require("es5-ext/object/valid-callable"),validValue=require("es5-ext/object/valid-value"),bind=Function.prototype.bind,defineProperty=Object.defineProperty,hasOwnProperty=Object.prototype.hasOwnProperty,define;define=function(e,t,r){var a,i=validValue(t)&&callable(t.value);return a=copy(t),delete a.writable,delete a.value,a.get=function(){return hasOwnProperty.call(this,e)?i:(t.value=bind.call(i,null==r?this:this[r]),defineProperty(this,e,t),this[e])},a},module.exports=function(e){var t=arguments[1];return map(e,function(e,r){return define(r,e,t)})};


},{"es5-ext/object/copy":19,"es5-ext/object/map":25,"es5-ext/object/valid-callable":27,"es5-ext/object/valid-value":28}],14:[function(require,module,exports){
"use strict";var assign=require("es5-ext/object/assign"),normalizeOpts=require("es5-ext/object/normalize-options"),isCallable=require("es5-ext/object/is-callable"),contains=require("es5-ext/string/#/contains"),d;d=module.exports=function(e,l){var n,a,s,i,t;return arguments.length<2||"string"!=typeof e?(i=l,l=e,e=null):i=arguments[2],null==e?(n=s=!0,a=!1):(n=contains.call(e,"c"),a=contains.call(e,"e"),s=contains.call(e,"w")),t={value:l,configurable:n,enumerable:a,writable:s},i?assign(normalizeOpts(i),t):t},d.gs=function(e,l,n){var a,s,i,t;return"string"!=typeof e?(i=n,n=l,l=e,e=null):i=arguments[3],null==l?l=void 0:isCallable(l)?null==n?n=void 0:isCallable(n)||(i=n,n=void 0):(i=l,l=n=void 0),null==e?(a=!0,s=!1):(a=contains.call(e,"c"),s=contains.call(e,"e")),t={get:l,set:n,configurable:a,enumerable:s},i?assign(normalizeOpts(i),t):t};


},{"es5-ext/object/assign":16,"es5-ext/object/is-callable":21,"es5-ext/object/normalize-options":26,"es5-ext/string/#/contains":29}],15:[function(require,module,exports){
"use strict";var isCallable=require("./is-callable"),callable=require("./valid-callable"),value=require("./valid-value"),call=Function.prototype.call,keys=Object.keys,propertyIsEnumerable=Object.prototype.propertyIsEnumerable;module.exports=function(e,l){return function(r,a){var t,u=arguments[2],c=arguments[3];return r=Object(value(r)),callable(a),t=keys(r),c&&t.sort(isCallable(c)?c.bind(r):void 0),t[e](function(e,t){return propertyIsEnumerable.call(r,e)?call.call(a,u,r[e],e,r,t):l})}};


},{"./is-callable":21,"./valid-callable":27,"./valid-value":28}],16:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Object.assign:require("./shim");


},{"./is-implemented":17,"./shim":18}],17:[function(require,module,exports){
"use strict";module.exports=function(){var r,t=Object.assign;return"function"!=typeof t?!1:(r={foo:"raz"},t(r,{bar:"dwa"},{trzy:"trzy"}),r.foo+r.bar+r.trzy==="razdwatrzy")};


},{}],18:[function(require,module,exports){
"use strict";var keys=require("../keys"),value=require("../valid-value"),max=Math.max;module.exports=function(e,r){var a,t,u,i=max(arguments.length,2);for(e=Object(value(e)),u=function(t){try{e[t]=r[t]}catch(u){a||(a=u)}},t=1;i>t;++t)r=arguments[t],keys(r).forEach(u);if(void 0!==a)throw a;return e};


},{"../keys":22,"../valid-value":28}],19:[function(require,module,exports){
"use strict";var assign=require("./assign"),value=require("./valid-value");module.exports=function(e){var r=Object(value(e));return r!==e?r:assign({},e)};


},{"./assign":16,"./valid-value":28}],20:[function(require,module,exports){
"use strict";module.exports=require("./_iterate")("forEach");


},{"./_iterate":15}],21:[function(require,module,exports){
"use strict";module.exports=function(t){return"function"==typeof t};


},{}],22:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Object.keys:require("./shim");


},{"./is-implemented":23,"./shim":24}],23:[function(require,module,exports){
"use strict";module.exports=function(){try{return Object.keys("primitive"),!0}catch(t){return!1}};


},{}],24:[function(require,module,exports){
"use strict";var keys=Object.keys;module.exports=function(e){return keys(null==e?e:Object(e))};


},{}],25:[function(require,module,exports){
"use strict";var callable=require("./valid-callable"),forEach=require("./for-each"),call=Function.prototype.call;module.exports=function(l,a){var r={},c=arguments[2];return callable(a),forEach(l,function(l,e,o,t){r[e]=call.call(a,c,l,e,o,t)}),r};


},{"./for-each":20,"./valid-callable":27}],26:[function(require,module,exports){
"use strict";var forEach=Array.prototype.forEach,create=Object.create,process=function(r,e){var c;for(c in r)e[c]=r[c]};module.exports=function(r){var e=create(null);return forEach.call(arguments,function(r){null!=r&&process(Object(r),e)}),e};


},{}],27:[function(require,module,exports){
"use strict";module.exports=function(t){if("function"!=typeof t)throw new TypeError(t+" is not a function");return t};


},{}],28:[function(require,module,exports){
"use strict";module.exports=function(n){if(null==n)throw new TypeError("Cannot use null or undefined");return n};


},{}],29:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?String.prototype.contains:require("./shim");


},{"./is-implemented":30,"./shim":31}],30:[function(require,module,exports){
"use strict";var str="razdwatrzy";module.exports=function(){return"function"!=typeof str.contains?!1:str.contains("dwa")===!0&&str.contains("foo")===!1};


},{}],31:[function(require,module,exports){
"use strict";var indexOf=String.prototype.indexOf;module.exports=function(t){return indexOf.call(this,t,arguments[1])>-1};


},{}],32:[function(require,module,exports){
"use strict";var value=require("../../object/valid-value");module.exports=function(){return value(this).length=0,this};


},{"../../object/valid-value":53}],33:[function(require,module,exports){
"use strict";var toPosInt=require("../../number/to-pos-integer"),value=require("../../object/valid-value"),indexOf=Array.prototype.indexOf,hasOwnProperty=Object.prototype.hasOwnProperty,abs=Math.abs,floor=Math.floor;module.exports=function(t){var r,e,o,s;if(t===t)return indexOf.apply(this,arguments);for(e=toPosInt(value(this).length),o=arguments[1],o=isNaN(o)?0:o>=0?floor(o):toPosInt(this.length)-floor(abs(o)),r=o;e>r;++r)if(hasOwnProperty.call(this,r)&&(s=this[r],s!==s))return r;return-1};


},{"../../number/to-pos-integer":39,"../../object/valid-value":53}],34:[function(require,module,exports){
"use strict";module.exports=new Function("return this")();


},{}],35:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Math.sign:require("./shim");


},{"./is-implemented":36,"./shim":37}],36:[function(require,module,exports){
"use strict";module.exports=function(){var t=Math.sign;return"function"!=typeof t?!1:1===t(10)&&-1===t(-20)};


},{}],37:[function(require,module,exports){
"use strict";module.exports=function(e){return e=Number(e),isNaN(e)||0===e?e:e>0?1:-1};


},{}],38:[function(require,module,exports){
"use strict";var sign=require("../math/sign"),abs=Math.abs,floor=Math.floor;module.exports=function(r){return isNaN(r)?0:(r=Number(r),0!==r&&isFinite(r)?sign(r)*floor(abs(r)):r)};


},{"../math/sign":35}],39:[function(require,module,exports){
"use strict";var toInteger=require("./to-integer"),max=Math.max;module.exports=function(e){return max(0,toInteger(e))};


},{"./to-integer":38}],40:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Object.assign:require("./shim");


},{"./is-implemented":41,"./shim":42}],41:[function(require,module,exports){
"use strict";module.exports=function(){var r,t=Object.assign;return"function"!=typeof t?!1:(r={foo:"raz"},t(r,{bar:"dwa"},{trzy:"trzy"}),r.foo+r.bar+r.trzy==="razdwatrzy")};


},{}],42:[function(require,module,exports){
"use strict";var keys=require("../keys"),value=require("../valid-value"),max=Math.max;module.exports=function(e,r){var a,t,u,i=max(arguments.length,2);for(e=Object(value(e)),u=function(t){try{e[t]=r[t]}catch(u){a||(a=u)}},t=1;i>t;++t)r=arguments[t],keys(r).forEach(u);if(void 0!==a)throw a;return e};


},{"../keys":45,"../valid-value":53}],43:[function(require,module,exports){
"use strict";var create=Object.create,shim;require("./set-prototype-of/is-implemented")()||(shim=require("./set-prototype-of/shim")),module.exports=function(){var e,r,t;return shim?1!==shim.level?create:(e={},r={},t={configurable:!1,enumerable:!1,writable:!0,value:void 0},Object.getOwnPropertyNames(Object.prototype).forEach(function(e){return"__proto__"===e?void(r[e]={configurable:!0,enumerable:!1,writable:!0,value:void 0}):void(r[e]=t)}),Object.defineProperties(e,r),Object.defineProperty(shim,"nullPolyfill",{configurable:!1,enumerable:!1,writable:!1,value:e}),function(r,t){return create(null===r?e:r,t)}):create}();


},{"./set-prototype-of/is-implemented":50,"./set-prototype-of/shim":51}],44:[function(require,module,exports){
"use strict";var map={"function":!0,object:!0};module.exports=function(t){return null!=t&&map[typeof t]||!1};


},{}],45:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Object.keys:require("./shim");


},{"./is-implemented":46,"./shim":47}],46:[function(require,module,exports){
"use strict";module.exports=function(){try{return Object.keys("primitive"),!0}catch(t){return!1}};


},{}],47:[function(require,module,exports){
"use strict";var keys=Object.keys;module.exports=function(e){return keys(null==e?e:Object(e))};


},{}],48:[function(require,module,exports){
"use strict";var forEach=Array.prototype.forEach,create=Object.create;module.exports=function(r){var e=create(null);return forEach.call(arguments,function(r){e[r]=!0}),e};


},{}],49:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Object.setPrototypeOf:require("./shim");


},{"./is-implemented":50,"./shim":51}],50:[function(require,module,exports){
"use strict";var create=Object.create,getPrototypeOf=Object.getPrototypeOf,x={};module.exports=function(){var t=Object.setPrototypeOf,e=arguments[0]||create;return"function"!=typeof t?!1:getPrototypeOf(t(e(null),x))===x};


},{}],51:[function(require,module,exports){
"use strict";var isObject=require("../is-object"),value=require("../valid-value"),isPrototypeOf=Object.prototype.isPrototypeOf,defineProperty=Object.defineProperty,nullDesc={configurable:!0,enumerable:!1,writable:!0,value:void 0},validate;validate=function(e,t){if(value(e),null===t||isObject(t))return e;throw new TypeError("Prototype must be null or an object")},module.exports=function(e){var t,l;return e?(2===e.level?e.set?(l=e.set,t=function(e,t){return l.call(validate(e,t),t),e}):t=function(e,t){return validate(e,t).__proto__=t,e}:t=function r(e,t){var l;return validate(e,t),l=isPrototypeOf.call(r.nullPolyfill,e),l&&delete r.nullPolyfill.__proto__,null===t&&(t=r.nullPolyfill),e.__proto__=t,l&&defineProperty(r.nullPolyfill,"__proto__",nullDesc),e},Object.defineProperty(t,"level",{configurable:!1,enumerable:!1,writable:!1,value:e.level})):null}(function(){var e,t=Object.create(null),l={},r=Object.getOwnPropertyDescriptor(Object.prototype,"__proto__");if(r){try{e=r.set,e.call(t,l)}catch(o){}if(Object.getPrototypeOf(t)===l)return{set:e,level:2}}return t.__proto__=l,Object.getPrototypeOf(t)===l?{level:2}:(t={},t.__proto__=l,Object.getPrototypeOf(t)===l?{level:1}:!1)}()),require("../create");


},{"../create":43,"../is-object":44,"../valid-value":53}],52:[function(require,module,exports){
"use strict";module.exports=function(t){if("function"!=typeof t)throw new TypeError(t+" is not a function");return t};


},{}],53:[function(require,module,exports){
"use strict";module.exports=function(n){if(null==n)throw new TypeError("Cannot use null or undefined");return n};


},{}],54:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?String.prototype.contains:require("./shim");


},{"./is-implemented":55,"./shim":56}],55:[function(require,module,exports){
"use strict";var str="razdwatrzy";module.exports=function(){return"function"!=typeof str.contains?!1:str.contains("dwa")===!0&&str.contains("foo")===!1};


},{}],56:[function(require,module,exports){
"use strict";var indexOf=String.prototype.indexOf;module.exports=function(t){return indexOf.call(this,t,arguments[1])>-1};


},{}],57:[function(require,module,exports){
"use strict";var toString=Object.prototype.toString,id=toString.call("");module.exports=function(t){return"string"==typeof t||t&&"object"==typeof t&&(t instanceof String||toString.call(t)===id)||!1};


},{}],58:[function(require,module,exports){
"use strict";var setPrototypeOf=require("es5-ext/object/set-prototype-of"),contains=require("es5-ext/string/#/contains"),d=require("d"),Iterator=require("./"),defineProperty=Object.defineProperty,ArrayIterator;ArrayIterator=module.exports=function(t,r){return this instanceof ArrayIterator?(Iterator.call(this,t),r=r?contains.call(r,"key+value")?"key+value":contains.call(r,"key")?"key":"value":"value",void defineProperty(this,"__kind__",d("",r))):new ArrayIterator(t,r)},setPrototypeOf&&setPrototypeOf(ArrayIterator,Iterator),ArrayIterator.prototype=Object.create(Iterator.prototype,{constructor:d(ArrayIterator),_resolve:d(function(t){return"value"===this.__kind__?this.__list__[t]:"key+value"===this.__kind__?[t,this.__list__[t]]:t}),toString:d(function(){return"[object Array Iterator]"})});


},{"./":61,"d":14,"es5-ext/object/set-prototype-of":49,"es5-ext/string/#/contains":54}],59:[function(require,module,exports){
"use strict";var callable=require("es5-ext/object/valid-callable"),isString=require("es5-ext/string/is-string"),get=require("./get"),isArray=Array.isArray,call=Function.prototype.call;module.exports=function(r,e){var l,t,a,i,n,c,s,o,u=arguments[2];if(isArray(r)?l="array":isString(r)?l="string":r=get(r),callable(e),a=function(){i=!0},"array"===l)return void r.some(function(r){return call.call(e,u,r,a),i?!0:void 0});if("string"!==l)for(t=r.next();!t.done;){if(call.call(e,u,t.value,a),i)return;t=r.next()}else for(c=r.length,n=0;c>n&&(s=r[n],c>n+1&&(o=s.charCodeAt(0),o>=55296&&56319>=o&&(s+=r[++n])),call.call(e,u,s,a),!i);++n);};


},{"./get":60,"es5-ext/object/valid-callable":52,"es5-ext/string/is-string":57}],60:[function(require,module,exports){
"use strict";var isString=require("es5-ext/string/is-string"),ArrayIterator=require("./array"),StringIterator=require("./string"),iterable=require("./valid-iterable"),iteratorSymbol=require("es6-symbol").iterator;module.exports=function(r){return"function"==typeof iterable(r)[iteratorSymbol]?r[iteratorSymbol]():isString(r)?new StringIterator(r):new ArrayIterator(r)};


},{"./array":58,"./string":68,"./valid-iterable":69,"es5-ext/string/is-string":57,"es6-symbol":63}],61:[function(require,module,exports){
"use strict";var clear=require("es5-ext/array/#/clear"),assign=require("es5-ext/object/assign"),callable=require("es5-ext/object/valid-callable"),value=require("es5-ext/object/valid-value"),d=require("d"),autoBind=require("d/auto-bind"),Symbol=require("es6-symbol"),defineProperty=Object.defineProperty,defineProperties=Object.defineProperties,Iterator;module.exports=Iterator=function(e,t){return this instanceof Iterator?(defineProperties(this,{__list__:d("w",value(e)),__context__:d("w",t),__nextIndex__:d("w",0)}),void(t&&(callable(t.on),t.on("_add",this._onAdd),t.on("_delete",this._onDelete),t.on("_clear",this._onClear)))):new Iterator(e,t)},defineProperties(Iterator.prototype,assign({constructor:d(Iterator),_next:d(function(){var e;if(this.__list__)return this.__redo__&&(e=this.__redo__.shift(),void 0!==e)?e:this.__nextIndex__<this.__list__.length?this.__nextIndex__++:void this._unBind()}),next:d(function(){return this._createResult(this._next())}),_createResult:d(function(e){return void 0===e?{done:!0,value:void 0}:{done:!1,value:this._resolve(e)}}),_resolve:d(function(e){return this.__list__[e]}),_unBind:d(function(){this.__list__=null,delete this.__redo__,this.__context__&&(this.__context__.off("_add",this._onAdd),this.__context__.off("_delete",this._onDelete),this.__context__.off("_clear",this._onClear),this.__context__=null)}),toString:d(function(){return"[object Iterator]"})},autoBind({_onAdd:d(function(e){if(!(e>=this.__nextIndex__)){if(++this.__nextIndex__,!this.__redo__)return void defineProperty(this,"__redo__",d("c",[e]));this.__redo__.forEach(function(t,_){t>=e&&(this.__redo__[_]=++t)},this),this.__redo__.push(e)}}),_onDelete:d(function(e){var t;e>=this.__nextIndex__||(--this.__nextIndex__,this.__redo__&&(t=this.__redo__.indexOf(e),-1!==t&&this.__redo__.splice(t,1),this.__redo__.forEach(function(t,_){t>e&&(this.__redo__[_]=--t)},this)))}),_onClear:d(function(){this.__redo__&&clear.call(this.__redo__),this.__nextIndex__=0})}))),defineProperty(Iterator.prototype,Symbol.iterator,d(function(){return this})),defineProperty(Iterator.prototype,Symbol.toStringTag,d("","Iterator"));


},{"d":14,"d/auto-bind":13,"es5-ext/array/#/clear":32,"es5-ext/object/assign":40,"es5-ext/object/valid-callable":52,"es5-ext/object/valid-value":53,"es6-symbol":63}],62:[function(require,module,exports){
"use strict";var isString=require("es5-ext/string/is-string"),iteratorSymbol=require("es6-symbol").iterator,isArray=Array.isArray;module.exports=function(r){return null==r?!1:isArray(r)?!0:isString(r)?!0:"function"==typeof r[iteratorSymbol]};


},{"es5-ext/string/is-string":57,"es6-symbol":63}],63:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Symbol:require("./polyfill");


},{"./is-implemented":64,"./polyfill":66}],64:[function(require,module,exports){
"use strict";module.exports=function(){var t;if("function"!=typeof Symbol)return!1;t=Symbol("test symbol");try{String(t)}catch(o){return!1}return"symbol"==typeof Symbol.iterator?!0:"object"!=typeof Symbol.isConcatSpreadable?!1:"object"!=typeof Symbol.iterator?!1:"object"!=typeof Symbol.toPrimitive?!1:"object"!=typeof Symbol.toStringTag?!1:"object"!=typeof Symbol.unscopables?!1:!0};


},{}],65:[function(require,module,exports){
"use strict";module.exports=function(t){return t&&("symbol"==typeof t||"Symbol"===t["@@toStringTag"])||!1};


},{}],66:[function(require,module,exports){
"use strict";var d=require("d"),validateSymbol=require("./validate-symbol"),create=Object.create,defineProperties=Object.defineProperties,defineProperty=Object.defineProperty,objPrototype=Object.prototype,Symbol,HiddenSymbol,globalSymbols=create(null),generateName=function(){var e=create(null);return function(o){for(var t,r=0;e[o+(r||"")];)++r;return o+=r||"",e[o]=!0,t="@@"+o,defineProperty(objPrototype,t,d.gs(null,function(e){defineProperty(this,t,d(e))})),t}}();HiddenSymbol=function e(o){if(this instanceof HiddenSymbol)throw new TypeError("TypeError: Symbol is not a constructor");return e(o)},module.exports=Symbol=function o(e){var t;if(this instanceof o)throw new TypeError("TypeError: Symbol is not a constructor");return t=create(HiddenSymbol.prototype),e=void 0===e?"":String(e),defineProperties(t,{__description__:d("",e),__name__:d("",generateName(e))})},defineProperties(Symbol,{"for":d(function(e){return globalSymbols[e]?globalSymbols[e]:globalSymbols[e]=Symbol(String(e))}),keyFor:d(function(e){var o;validateSymbol(e);for(o in globalSymbols)if(globalSymbols[o]===e)return o}),hasInstance:d("",Symbol("hasInstance")),isConcatSpreadable:d("",Symbol("isConcatSpreadable")),iterator:d("",Symbol("iterator")),match:d("",Symbol("match")),replace:d("",Symbol("replace")),search:d("",Symbol("search")),species:d("",Symbol("species")),split:d("",Symbol("split")),toPrimitive:d("",Symbol("toPrimitive")),toStringTag:d("",Symbol("toStringTag")),unscopables:d("",Symbol("unscopables"))}),defineProperties(HiddenSymbol.prototype,{constructor:d(Symbol),toString:d("",function(){return this.__name__})}),defineProperties(Symbol.prototype,{toString:d(function(){return"Symbol ("+validateSymbol(this).__description__+")"}),valueOf:d(function(){return validateSymbol(this)})}),defineProperty(Symbol.prototype,Symbol.toPrimitive,d("",function(){return validateSymbol(this)})),defineProperty(Symbol.prototype,Symbol.toStringTag,d("c","Symbol")),defineProperty(HiddenSymbol.prototype,Symbol.toPrimitive,d("c",Symbol.prototype[Symbol.toPrimitive])),defineProperty(HiddenSymbol.prototype,Symbol.toStringTag,d("c",Symbol.prototype[Symbol.toStringTag]));


},{"./validate-symbol":67,"d":14}],67:[function(require,module,exports){
"use strict";var isSymbol=require("./is-symbol");module.exports=function(r){if(!isSymbol(r))throw new TypeError(r+" is not a symbol");return r};


},{"./is-symbol":65}],68:[function(require,module,exports){
"use strict";var setPrototypeOf=require("es5-ext/object/set-prototype-of"),d=require("d"),Iterator=require("./"),defineProperty=Object.defineProperty,StringIterator;StringIterator=module.exports=function(t){return this instanceof StringIterator?(t=String(t),Iterator.call(this,t),void defineProperty(this,"__length__",d("",t.length))):new StringIterator(t)},setPrototypeOf&&setPrototypeOf(StringIterator,Iterator),StringIterator.prototype=Object.create(Iterator.prototype,{constructor:d(StringIterator),_next:d(function(){return this.__list__?this.__nextIndex__<this.__length__?this.__nextIndex__++:void this._unBind():void 0}),_resolve:d(function(t){var e,r=this.__list__[t];return this.__nextIndex__===this.__length__?r:(e=r.charCodeAt(0),e>=55296&&56319>=e?r+this.__list__[this.__nextIndex__++]:r)}),toString:d(function(){return"[object String Iterator]"})});


},{"./":61,"d":14,"es5-ext/object/set-prototype-of":49}],69:[function(require,module,exports){
"use strict";var isIterable=require("./is-iterable");module.exports=function(e){if(!isIterable(e))throw new TypeError(e+" is not iterable");return e};


},{"./is-iterable":62}],70:[function(require,module,exports){
"use strict";module.exports=require("./is-implemented")()?Symbol:require("./polyfill");


},{"./is-implemented":71,"./polyfill":72}],71:[function(require,module,exports){
"use strict";module.exports=function(){var t;if("function"!=typeof Symbol)return!1;t=Symbol("test symbol");try{String(t)}catch(o){return!1}return"symbol"==typeof Symbol.iterator?!0:"object"!=typeof Symbol.isConcatSpreadable?!1:"object"!=typeof Symbol.isRegExp?!1:"object"!=typeof Symbol.iterator?!1:"object"!=typeof Symbol.toPrimitive?!1:"object"!=typeof Symbol.toStringTag?!1:"object"!=typeof Symbol.unscopables?!1:!0};


},{}],72:[function(require,module,exports){
"use strict";var d=require("d"),create=Object.create,defineProperties=Object.defineProperties,generateName,Symbol;generateName=function(){var e=create(null);return function(t){for(var o=0;e[t+(o||"")];)++o;return t+=o||"",e[t]=!0,"@@"+t}}(),module.exports=Symbol=function(e){var t;if(this instanceof Symbol)throw new TypeError("TypeError: Symbol is not a constructor");return t=create(Symbol.prototype),e=void 0===e?"":String(e),defineProperties(t,{__description__:d("",e),__name__:d("",generateName(e))})},Object.defineProperties(Symbol,{create:d("",Symbol("create")),hasInstance:d("",Symbol("hasInstance")),isConcatSpreadable:d("",Symbol("isConcatSpreadable")),isRegExp:d("",Symbol("isRegExp")),iterator:d("",Symbol("iterator")),toPrimitive:d("",Symbol("toPrimitive")),toStringTag:d("",Symbol("toStringTag")),unscopables:d("",Symbol("unscopables"))}),defineProperties(Symbol.prototype,{properToString:d(function(){return"Symbol ("+this.__description__+")"}),toString:d("",function(){return this.__name__})}),Object.defineProperty(Symbol.prototype,Symbol.toPrimitive,d("",function(e){throw new TypeError("Conversion of symbol objects is not allowed")})),Object.defineProperty(Symbol.prototype,Symbol.toStringTag,d("c","Symbol"));


},{"d":14}],73:[function(require,module,exports){
"use strict";var d=require("d"),callable=require("es5-ext/object/valid-callable"),apply=Function.prototype.apply,call=Function.prototype.call,create=Object.create,defineProperty=Object.defineProperty,defineProperties=Object.defineProperties,hasOwnProperty=Object.prototype.hasOwnProperty,descriptor={configurable:!0,enumerable:!1,writable:!0},on,once,off,emit,methods,descriptors,base;on=function(e,t){var r;return callable(t),hasOwnProperty.call(this,"__ee__")?r=this.__ee__:(r=descriptor.value=create(null),defineProperty(this,"__ee__",descriptor),descriptor.value=null),r[e]?"object"==typeof r[e]?r[e].push(t):r[e]=[r[e],t]:r[e]=t,this},once=function(e,t){var r,l;return callable(t),l=this,on.call(this,e,r=function(){off.call(l,e,r),apply.call(t,this,arguments)}),r.__eeOnceListener__=t,this},off=function(e,t){var r,l,s,o;if(callable(t),!hasOwnProperty.call(this,"__ee__"))return this;if(r=this.__ee__,!r[e])return this;if(l=r[e],"object"==typeof l)for(o=0;s=l[o];++o)(s===t||s.__eeOnceListener__===t)&&(2===l.length?r[e]=l[o?0:1]:l.splice(o,1));else(l===t||l.__eeOnceListener__===t)&&delete r[e];return this},emit=function(e){var t,r,l,s,o;if(hasOwnProperty.call(this,"__ee__")&&(s=this.__ee__[e]))if("object"==typeof s){for(r=arguments.length,o=new Array(r-1),t=1;r>t;++t)o[t-1]=arguments[t];for(s=s.slice(),t=0;l=s[t];++t)apply.call(l,this,o)}else switch(arguments.length){case 1:call.call(s,this);break;case 2:call.call(s,this,arguments[1]);break;case 3:call.call(s,this,arguments[1],arguments[2]);break;default:for(r=arguments.length,o=new Array(r-1),t=1;r>t;++t)o[t-1]=arguments[t];apply.call(s,this,o)}},methods={on:on,once:once,off:off,emit:emit},descriptors={on:d(on),once:d(once),off:d(off),emit:d(emit)},base=defineProperties({},descriptors),module.exports=exports=function(e){return null==e?create(base):defineProperties(Object(e),descriptors)},exports.methods=methods;


},{"d":14,"es5-ext/object/valid-callable":52}],74:[function(require,module,exports){
"use strict";var clear=require("es5-ext/array/#/clear"),eIndexOf=require("es5-ext/array/#/e-index-of"),setPrototypeOf=require("es5-ext/object/set-prototype-of"),callable=require("es5-ext/object/valid-callable"),validValue=require("es5-ext/object/valid-value"),d=require("d"),ee=require("event-emitter"),Symbol=require("es6-symbol"),iterator=require("es6-iterator/valid-iterable"),forOf=require("es6-iterator/for-of"),Iterator=require("./lib/iterator"),isNative=require("./is-native-implemented"),call=Function.prototype.call,defineProperties=Object.defineProperties,MapPoly;module.exports=MapPoly=function(){var e,t,a=arguments[0];if(!(this instanceof MapPoly))return new MapPoly(a);if(void 0!==this.__mapKeysData__)throw new TypeError(this+" cannot be reinitialized");null!=a&&iterator(a),defineProperties(this,{__mapKeysData__:d("c",e=[]),__mapValuesData__:d("c",t=[])}),a&&forOf(a,function(a){var r=validValue(a)[0];a=a[1],-1===eIndexOf.call(e,r)&&(e.push(r),t.push(a))},this)},isNative&&(setPrototypeOf&&setPrototypeOf(MapPoly,Map),MapPoly.prototype=Object.create(Map.prototype,{constructor:d(MapPoly)})),ee(defineProperties(MapPoly.prototype,{clear:d(function(){this.__mapKeysData__.length&&(clear.call(this.__mapKeysData__),clear.call(this.__mapValuesData__),this.emit("_clear"))}),"delete":d(function(e){var t=eIndexOf.call(this.__mapKeysData__,e);return-1===t?!1:(this.__mapKeysData__.splice(t,1),this.__mapValuesData__.splice(t,1),this.emit("_delete",t,e),!0)}),entries:d(function(){return new Iterator(this,"key+value")}),forEach:d(function(e){var t,a,r=arguments[1];for(callable(e),t=this.entries(),a=t._next();void 0!==a;)call.call(e,r,this.__mapValuesData__[a],this.__mapKeysData__[a],this),a=t._next()}),get:d(function(e){var t=eIndexOf.call(this.__mapKeysData__,e);if(-1!==t)return this.__mapValuesData__[t]}),has:d(function(e){return-1!==eIndexOf.call(this.__mapKeysData__,e)}),keys:d(function(){return new Iterator(this,"key")}),set:d(function(e,t){var a,r=eIndexOf.call(this.__mapKeysData__,e);return-1===r&&(r=this.__mapKeysData__.push(e)-1,a=!0),this.__mapValuesData__[r]=t,a&&this.emit("_add",r,e),this}),size:d.gs(function(){return this.__mapKeysData__.length}),values:d(function(){return new Iterator(this,"value")}),toString:d(function(){return"[object Map]"})})),Object.defineProperty(MapPoly.prototype,Symbol.iterator,d(function(){return this.entries()})),Object.defineProperty(MapPoly.prototype,Symbol.toStringTag,d("c","Map"));


},{"./is-native-implemented":10,"./lib/iterator":12,"d":14,"es5-ext/array/#/clear":32,"es5-ext/array/#/e-index-of":33,"es5-ext/object/set-prototype-of":49,"es5-ext/object/valid-callable":52,"es5-ext/object/valid-value":53,"es6-iterator/for-of":59,"es6-iterator/valid-iterable":69,"es6-symbol":70,"event-emitter":73}],75:[function(require,module,exports){
(function(e){!function(){"use strict";function t(e){return F.Expression.hasOwnProperty(e.type)}function n(e){return F.Statement.hasOwnProperty(e.type)}function r(){return{indent:null,base:null,parse:null,comment:!1,format:{indent:{style:"    ",base:0,adjustMultilineComment:!1},newline:"\n",space:" ",json:!1,renumber:!1,hexadecimal:!1,quotes:"single",escapeless:!1,compact:!1,parentheses:!0,semicolons:!0,safeConcatenation:!1,preserveBlankLines:!1},moz:{comprehensionExpressionStartsWithAssignment:!1,starlessGenerator:!1},sourceMap:null,sourceMapRoot:null,sourceMapWithCode:!1,directive:!1,raw:!0,verbatim:null,sourceCode:null}}function i(e,t){var n="";for(t|=0;t>0;t>>>=1,e+=e)1&t&&(n+=e);return n}function s(e){return/[\r\n]/g.test(e)}function o(e){var t=e.length;return t&&U.code.isLineTerminator(e.charCodeAt(t-1))}function a(e,t){var n;for(n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);return e}function u(e,t){function n(e){return"object"==typeof e&&e instanceof Object&&!(e instanceof RegExp)}var r,i;for(r in t)t.hasOwnProperty(r)&&(i=t[r],n(i)?n(e[r])?u(e[r],i):e[r]=u({},i):e[r]=i);return e}function p(e){var t,n,r,i,s;if(e!==e)throw new Error("Numeric literal whose value is NaN");if(0>e||0===e&&0>1/e)throw new Error("Numeric literal whose value is negative");if(e===1/0)return H?"null":Y?"1e400":"1e+400";if(t=""+e,!Y||t.length<3)return t;for(n=t.indexOf("."),H||48!==t.charCodeAt(0)||1!==n||(n=0,t=t.slice(1)),r=t,t=t.replace("e+","e"),i=0,(s=r.indexOf("e"))>0&&(i=+r.slice(s+1),r=r.slice(0,s)),n>=0&&(i-=r.length-n-1,r=+(r.slice(0,n)+r.slice(n+1))+""),s=0;48===r.charCodeAt(r.length+s-1);)--s;return 0!==s&&(i-=s,r=r.slice(0,s)),0!==i&&(r+="e"+i),(r.length<t.length||X&&e>1e12&&Math.floor(e)===e&&(r="0x"+e.toString(16)).length<t.length)&&+r===e&&(t=r),t}function c(e,t){return 8232===(-2&e)?(t?"u":"\\u")+(8232===e?"2028":"2029"):10===e||13===e?(t?"":"\\")+(10===e?"n":"r"):String.fromCharCode(e)}function h(e){var t,n,r,i,s,o,a,u;if(n=e.toString(),e.source){if(t=n.match(/\/([^/]*)$/),!t)return n;for(r=t[1],n="",a=!1,u=!1,i=0,s=e.source.length;s>i;++i)o=e.source.charCodeAt(i),u?(n+=c(o,u),u=!1):(a?93===o&&(a=!1):47===o?n+="\\":91===o&&(a=!0),n+=c(o,u),u=92===o);return"/"+n+"/"+r}return n}function l(e,t){var n;return 8===e?"\\b":12===e?"\\f":9===e?"\\t":(n=e.toString(16).toUpperCase(),H||e>255?"\\u"+"0000".slice(n.length)+n:0!==e||U.code.isDecimalDigit(t)?11===e?"\\x0B":"\\x"+"00".slice(n.length)+n:"\\0")}function g(e){if(92===e)return"\\\\";if(10===e)return"\\n";if(13===e)return"\\r";if(8232===e)return"\\u2028";if(8233===e)return"\\u2029";throw new Error("Incorrectly classified character")}function f(e){var t,n,r,i;for(i="double"===$?'"':"'",t=0,n=e.length;n>t;++t){if(r=e.charCodeAt(t),39===r){i='"';break}if(34===r){i="'";break}92===r&&++t}return i+e+i}function m(e){var t,n,r,i,s,o="",a=0,u=0;for(t=0,n=e.length;n>t;++t){if(r=e.charCodeAt(t),39===r)++a;else if(34===r)++u;else if(47===r&&H)o+="\\";else{if(U.code.isLineTerminator(r)||92===r){o+=g(r);continue}if(H&&32>r||!(H||_||r>=32&&126>=r)){o+=l(r,e.charCodeAt(t+1));continue}}o+=String.fromCharCode(r)}if(i=!("double"===$||"auto"===$&&a>u),s=i?"'":'"',!(i?a:u))return s+o+s;for(e=o,o=s,t=0,n=e.length;n>t;++t)r=e.charCodeAt(t),(39===r&&i||34===r&&!i)&&(o+="\\"),o+=String.fromCharCode(r);return o+s}function d(e){var t,n,r,i="";for(t=0,n=e.length;n>t;++t)r=e[t],i+=K(r)?d(r):r;return i}function y(e,t){if(!se)return K(e)?d(e):e;if(null==t){if(e instanceof j)return e;t={}}return null==t.loc?new j(null,null,se,e,t.name||null):new j(t.loc.start.line,t.loc.start.column,se===!0?t.loc.source||null:se,e,t.name||null)}function S(){return Q?Q:" "}function x(e,t){var n,r,i,s;return n=y(e).toString(),0===n.length?[t]:(r=y(t).toString(),0===r.length?[e]:(i=n.charCodeAt(n.length-1),s=r.charCodeAt(0),(43===i||45===i)&&i===s||U.code.isIdentifierPart(i)&&U.code.isIdentifierPart(s)||47===i&&105===s?[e,S(),t]:U.code.isWhiteSpace(i)||U.code.isLineTerminator(i)||U.code.isWhiteSpace(s)||U.code.isLineTerminator(s)?[e,t]:[e,Q,t]))}function b(e){return[V,e]}function v(e){var t;t=V,V+=G,e(V),V=t}function E(e){var t;for(t=e.length-1;t>=0&&!U.code.isLineTerminator(e.charCodeAt(t));--t);return e.length-1-t}function C(e,t){var n,r,i,s,o,a,u,p;for(n=e.split(/\r\n|[\r\n]/),a=Number.MAX_VALUE,r=1,i=n.length;i>r;++r){for(s=n[r],o=0;o<s.length&&U.code.isWhiteSpace(s.charCodeAt(o));)++o;a>o&&(a=o)}for("undefined"!=typeof t?(u=V,"*"===n[1][a]&&(t+=" "),V=t):(1&a&&--a,u=V),r=1,i=n.length;i>r;++r)p=y(b(n[r].slice(a))),n[r]=se?p.join(""):p;return V=u,n.join("\n")}function A(e,t){if("Line"===e.type){if(o(e.value))return"//"+e.value;var n="//"+e.value;return ae||(n+="\n"),n}return re.format.indent.adjustMultilineComment&&/[\n\r]/.test(e.value)?C("/*"+e.value+"*/",t):"/*"+e.value+"*/"}function w(e,t){var n,r,s,a,u,p,c,h,l,g,f,m,d,S;if(e.leadingComments&&e.leadingComments.length>0){if(a=t,ae){for(s=e.leadingComments[0],t=[],h=s.extendedRange,l=s.range,f=oe.substring(h[0],l[0]),S=(f.match(/\n/g)||[]).length,S>0?(t.push(i("\n",S)),t.push(b(A(s)))):(t.push(f),t.push(A(s))),g=l,n=1,r=e.leadingComments.length;r>n;n++)s=e.leadingComments[n],l=s.range,m=oe.substring(g[1],l[0]),S=(m.match(/\n/g)||[]).length,t.push(i("\n",S)),t.push(b(A(s))),g=l;d=oe.substring(l[1],h[1]),S=(d.match(/\n/g)||[]).length,t.push(i("\n",S))}else for(s=e.leadingComments[0],t=[],te&&e.type===O.Program&&0===e.body.length&&t.push("\n"),t.push(A(s)),o(y(t).toString())||t.push("\n"),n=1,r=e.leadingComments.length;r>n;++n)s=e.leadingComments[n],c=[A(s)],o(y(c).toString())||c.push("\n"),t.push(b(c));t.push(b(a))}if(e.trailingComments)if(ae)s=e.trailingComments[0],h=s.extendedRange,l=s.range,f=oe.substring(h[0],l[0]),S=(f.match(/\n/g)||[]).length,S>0?(t.push(i("\n",S)),t.push(b(A(s)))):(t.push(f),t.push(A(s)));else for(u=!o(y(t).toString()),p=i(" ",E(y([V,t,G]).toString())),n=0,r=e.trailingComments.length;r>n;++n)s=e.trailingComments[n],u?(t=0===n?[t,G]:[t,p],t.push(A(s,p))):t=[t,b(A(s))],n===r-1||o(y(t).toString())||(t=[t,"\n"]);return t}function q(e,t,n){var r,i=0;for(r=e;t>r;r++)"\n"===oe[r]&&i++;for(r=1;i>r;r++)n.push(J)}function k(e,t,n){return n>t?["(",e,")"]:e}function B(e){var t,n,r;for(r=e.split(/\r\n|\n/),t=1,n=r.length;n>t;t++)r[t]=J+V+r[t];return r}function P(e,t){var n,r,i;return n=e[re.verbatim],"string"==typeof n?r=k(B(n),W.Sequence,t):(r=B(n.content),i=null!=n.precedence?n.precedence:W.Sequence,r=k(r,i,t)),y(r,e)}function F(){}function I(e){return y(e.name,e)}function L(e,t){return e.async?"async"+(t?S():Q):""}function M(e){var t=e.generator&&!re.moz.starlessGenerator;return t?"*"+Q:""}function T(e){var t=e.value;return t.async?L(t,!e.computed):M(t)?"*":""}function R(e){var r;if(r=new F,n(e))return r.generateStatement(e,Ee);if(t(e))return r.generateExpression(e,W.Sequence,Se);throw new Error("Unknown node type: "+e.type)}function D(t,n){var s,o,a=r();return null!=n?("string"==typeof n.indent&&(a.format.indent.style=n.indent),"number"==typeof n.base&&(a.format.indent.base=n.base),n=u(a,n),G=n.format.indent.style,V="string"==typeof n.base?n.base:i(G,n.format.indent.base)):(n=a,G=n.format.indent.style,V=i(G,n.format.indent.base)),H=n.format.json,Y=n.format.renumber,X=H?!1:n.format.hexadecimal,$=H?"double":n.format.quotes,_=n.format.escapeless,J=n.format.newline,Q=n.format.space,n.format.compact&&(J=Q=G=V=""),Z=n.format.parentheses,ee=n.format.semicolons,te=n.format.safeConcatenation,ne=n.directive,ie=H?null:n.parse,se=n.sourceMap,oe=n.sourceCode,ae=n.format.preserveBlankLines&&null!==oe,re=n,se&&(j=exports.browser?e.sourceMap.SourceNode:require("source-map").SourceNode),s=R(t),se?(o=s.toStringWithSourceMap({file:n.file,sourceRoot:n.sourceMapRoot}),n.sourceContent&&o.map.setSourceContent(n.sourceMap,n.sourceContent),n.sourceMapWithCode?o:o.map.toString()):(o={code:s.toString(),map:null},n.sourceMapWithCode?o:o.code)}var O,W,N,j,z,U,K,V,G,H,Y,X,$,_,J,Q,Z,ee,te,ne,re,ie,se,oe,ae,ue,pe;z=require("estraverse"),U=require("esutils"),O=z.Syntax,W={Sequence:0,Yield:1,Await:1,Assignment:1,Conditional:2,ArrowFunction:2,LogicalOR:3,LogicalAND:4,BitwiseOR:5,BitwiseXOR:6,BitwiseAND:7,Equality:8,Relational:9,BitwiseSHIFT:10,Additive:11,Multiplicative:12,Unary:13,Postfix:14,Call:15,New:16,TaggedTemplate:17,Member:18,Primary:19},N={"||":W.LogicalOR,"&&":W.LogicalAND,"|":W.BitwiseOR,"^":W.BitwiseXOR,"&":W.BitwiseAND,"==":W.Equality,"!=":W.Equality,"===":W.Equality,"!==":W.Equality,is:W.Equality,isnt:W.Equality,"<":W.Relational,">":W.Relational,"<=":W.Relational,">=":W.Relational,"in":W.Relational,"instanceof":W.Relational,"<<":W.BitwiseSHIFT,">>":W.BitwiseSHIFT,">>>":W.BitwiseSHIFT,"+":W.Additive,"-":W.Additive,"*":W.Multiplicative,"%":W.Multiplicative,"/":W.Multiplicative};var ce=1,he=2,le=4,ge=8,fe=16,me=32,de=he|le,ye=ce|he,Se=ce|he|le,xe=ce,be=le,ve=ce|le,Ee=ce,Ce=ce|me,Ae=0,we=ce|fe,qe=ce|ge;K=Array.isArray,K||(K=function(e){return"[object Array]"===Object.prototype.toString.call(e)}),F.prototype.maybeBlock=function(e,t){var n,r,i=this;return r=!re.comment||!e.leadingComments,e.type===O.BlockStatement&&r?[Q,this.generateStatement(e,t)]:e.type===O.EmptyStatement&&r?";":(v(function(){n=[J,b(i.generateStatement(e,t))]}),n)},F.prototype.maybeBlockSuffix=function(e,t){var n=o(y(t).toString());return e.type!==O.BlockStatement||re.comment&&e.leadingComments||n?n?[t,V]:[t,J,V]:[t,Q]},F.prototype.generatePattern=function(e,t,n){return e.type===O.Identifier?I(e):this.generateExpression(e,t,n)},F.prototype.generateFunctionParams=function(e){var t,n,r,i;if(i=!1,e.type!==O.ArrowFunctionExpression||e.rest||e.defaults&&0!==e.defaults.length||1!==e.params.length||e.params[0].type!==O.Identifier){for(r=e.type===O.ArrowFunctionExpression?[L(e,!1)]:[],r.push("("),e.defaults&&(i=!0),t=0,n=e.params.length;n>t;++t)i&&e.defaults[t]?r.push(this.generateAssignment(e.params[t],e.defaults[t],"=",W.Assignment,Se)):r.push(this.generatePattern(e.params[t],W.Assignment,Se)),n>t+1&&r.push(","+Q);e.rest&&(e.params.length&&r.push(","+Q),r.push("..."),r.push(I(e.rest))),r.push(")")}else r=[L(e,!0),I(e.params[0])];return r},F.prototype.generateFunctionBody=function(e){var t,n;return t=this.generateFunctionParams(e),e.type===O.ArrowFunctionExpression&&(t.push(Q),t.push("=>")),e.expression?(t.push(Q),n=this.generateExpression(e.body,W.Assignment,Se),"{"===n.toString().charAt(0)&&(n=["(",n,")"]),t.push(n)):t.push(this.maybeBlock(e.body,qe)),t},F.prototype.generateIterationForStatement=function(e,t,n){var r=["for"+Q+"("],i=this;return v(function(){t.left.type===O.VariableDeclaration?v(function(){r.push(t.left.kind+S()),r.push(i.generateStatement(t.left.declarations[0],Ae))}):r.push(i.generateExpression(t.left,W.Call,Se)),r=x(r,e),r=[x(r,i.generateExpression(t.right,W.Sequence,Se)),")"]}),r.push(this.maybeBlock(t.body,n)),r},F.prototype.generatePropertyKey=function(e,t){var n=[];return t&&n.push("["),n.push(this.generateExpression(e,W.Sequence,Se)),t&&n.push("]"),n},F.prototype.generateAssignment=function(e,t,n,r,i){return W.Assignment<r&&(i|=ce),k([this.generateExpression(e,W.Call,i),Q+n+Q,this.generateExpression(t,W.Assignment,i)],W.Assignment,r)},F.prototype.semicolon=function(e){return!ee&&e&me?"":";"},F.Statement={BlockStatement:function(e,t){var n,r,i=["{",J],s=this;return v(function(){0===e.body.length&&ae&&(n=e.range,n[1]-n[0]>2&&(r=oe.substring(n[0]+1,n[1]-1),"\n"===r[0]&&(i=["{"]),i.push(r)));var a,u,p,c;for(c=Ee,t&ge&&(c|=fe),a=0,u=e.body.length;u>a;++a)ae&&(0===a&&(e.body[0].leadingComments&&(n=e.body[0].leadingComments[0].extendedRange,r=oe.substring(n[0],n[1]),"\n"===r[0]&&(i=["{"])),e.body[0].leadingComments||q(e.range[0],e.body[0].range[0],i)),a>0&&(e.body[a-1].trailingComments||e.body[a].leadingComments||q(e.body[a-1].range[1],e.body[a].range[0],i))),a===u-1&&(c|=me),p=e.body[a].leadingComments&&ae?s.generateStatement(e.body[a],c):b(s.generateStatement(e.body[a],c)),i.push(p),o(y(p).toString())||(ae&&u-1>a?e.body[a+1].leadingComments||i.push(J):i.push(J)),ae&&a===u-1&&(e.body[a].trailingComments||q(e.body[a].range[1],e.range[1],i))}),i.push(b("}")),i},BreakStatement:function(e,t){return e.label?"break "+e.label.name+this.semicolon(t):"break"+this.semicolon(t)},ContinueStatement:function(e,t){return e.label?"continue "+e.label.name+this.semicolon(t):"continue"+this.semicolon(t)},ClassBody:function(e,t){var n=["{",J],r=this;return v(function(t){var i,s;for(i=0,s=e.body.length;s>i;++i)n.push(t),n.push(r.generateExpression(e.body[i],W.Sequence,Se)),s>i+1&&n.push(J)}),o(y(n).toString())||n.push(J),n.push(V),n.push("}"),n},ClassDeclaration:function(e,t){var n,r;return n=["class "+e.id.name],e.superClass&&(r=x("extends",this.generateExpression(e.superClass,W.Assignment,Se)),n=x(n,r)),n.push(Q),n.push(this.generateStatement(e.body,Ce)),n},DirectiveStatement:function(e,t){return re.raw&&e.raw?e.raw+this.semicolon(t):f(e.directive)+this.semicolon(t)},DoWhileStatement:function(e,t){var n=x("do",this.maybeBlock(e.body,Ee));return n=this.maybeBlockSuffix(e.body,n),x(n,["while"+Q+"(",this.generateExpression(e.test,W.Sequence,Se),")"+this.semicolon(t)])},CatchClause:function(e,t){var n,r=this;return v(function(){var t;n=["catch"+Q+"(",r.generateExpression(e.param,W.Sequence,Se),")"],e.guard&&(t=r.generateExpression(e.guard,W.Sequence,Se),n.splice(2,0," if ",t))}),n.push(this.maybeBlock(e.body,Ee)),n},DebuggerStatement:function(e,t){return"debugger"+this.semicolon(t)},EmptyStatement:function(e,t){return";"},ExportDeclaration:function(e,t){var r,i=["export"],s=this;return r=t&me?Ce:Ee,e["default"]?(i=x(i,"default"),i=n(e.declaration)?x(i,this.generateStatement(e.declaration,r)):x(i,this.generateExpression(e.declaration,W.Assignment,Se)+this.semicolon(t))):e.declaration?x(i,this.generateStatement(e.declaration,r)):(e.specifiers&&(0===e.specifiers.length?i=x(i,"{"+Q+"}"):e.specifiers[0].type===O.ExportBatchSpecifier?i=x(i,this.generateExpression(e.specifiers[0],W.Sequence,Se)):(i=x(i,"{"),v(function(t){var n,r;for(i.push(J),n=0,r=e.specifiers.length;r>n;++n)i.push(t),i.push(s.generateExpression(e.specifiers[n],W.Sequence,Se)),r>n+1&&i.push(","+J)}),o(y(i).toString())||i.push(J),i.push(V+"}")),e.source?i=x(i,["from"+Q,this.generateExpression(e.source,W.Sequence,Se),this.semicolon(t)]):i.push(this.semicolon(t))),i)},ExpressionStatement:function(e,t){function n(e){var t;return"class"!==e.slice(0,5)?!1:(t=e.charCodeAt(5),123===t||U.code.isWhiteSpace(t)||U.code.isLineTerminator(t))}function r(e){var t;return"function"!==e.slice(0,8)?!1:(t=e.charCodeAt(8),40===t||U.code.isWhiteSpace(t)||42===t||U.code.isLineTerminator(t))}function i(e){var t,n,r;if("async"!==e.slice(0,5))return!1;if(!U.code.isWhiteSpace(e.charCodeAt(5)))return!1;for(n=6,r=e.length;r>n&&U.code.isWhiteSpace(e.charCodeAt(n));++n);return n===r?!1:"function"!==e.slice(n,n+8)?!1:(t=e.charCodeAt(n+8),40===t||U.code.isWhiteSpace(t)||42===t||U.code.isLineTerminator(t))}var s,o;return s=[this.generateExpression(e.expression,W.Sequence,Se)],o=y(s).toString(),123===o.charCodeAt(0)||n(o)||r(o)||i(o)||ne&&t&fe&&e.expression.type===O.Literal&&"string"==typeof e.expression.value?s=["(",s,")"+this.semicolon(t)]:s.push(this.semicolon(t)),s},ImportDeclaration:function(e,t){var n,r,i=this;return 0===e.specifiers.length?["import",Q,this.generateExpression(e.source,W.Sequence,Se),this.semicolon(t)]:(n=["import"],r=0,e.specifiers[r].type===O.ImportDefaultSpecifier&&(n=x(n,[this.generateExpression(e.specifiers[r],W.Sequence,Se)]),++r),e.specifiers[r]&&(0!==r&&n.push(","),e.specifiers[r].type===O.ImportNamespaceSpecifier?n=x(n,[Q,this.generateExpression(e.specifiers[r],W.Sequence,Se)]):(n.push(Q+"{"),e.specifiers.length-r===1?(n.push(Q),n.push(this.generateExpression(e.specifiers[r],W.Sequence,Se)),n.push(Q+"}"+Q)):(v(function(t){var s,o;for(n.push(J),s=r,o=e.specifiers.length;o>s;++s)n.push(t),n.push(i.generateExpression(e.specifiers[s],W.Sequence,Se)),o>s+1&&n.push(","+J)}),o(y(n).toString())||n.push(J),n.push(V+"}"+Q)))),n=x(n,["from"+Q,this.generateExpression(e.source,W.Sequence,Se),this.semicolon(t)]))},VariableDeclarator:function(e,t){var n=t&ce?Se:de;return e.init?[this.generateExpression(e.id,W.Assignment,n),Q,"=",Q,this.generateExpression(e.init,W.Assignment,n)]:this.generatePattern(e.id,W.Assignment,n)},VariableDeclaration:function(e,t){function n(){for(o=e.declarations[0],re.comment&&o.leadingComments?(r.push("\n"),r.push(b(u.generateStatement(o,a)))):(r.push(S()),r.push(u.generateStatement(o,a))),i=1,s=e.declarations.length;s>i;++i)o=e.declarations[i],re.comment&&o.leadingComments?(r.push(","+J),r.push(b(u.generateStatement(o,a)))):(r.push(","+Q),r.push(u.generateStatement(o,a)))}var r,i,s,o,a,u=this;return r=[e.kind],a=t&ce?Ee:Ae,e.declarations.length>1?v(n):n(),r.push(this.semicolon(t)),r},ThrowStatement:function(e,t){return[x("throw",this.generateExpression(e.argument,W.Sequence,Se)),this.semicolon(t)]},TryStatement:function(e,t){var n,r,i,s;if(n=["try",this.maybeBlock(e.block,Ee)],n=this.maybeBlockSuffix(e.block,n),e.handlers)for(r=0,i=e.handlers.length;i>r;++r)n=x(n,this.generateStatement(e.handlers[r],Ee)),(e.finalizer||r+1!==i)&&(n=this.maybeBlockSuffix(e.handlers[r].body,n));else{for(s=e.guardedHandlers||[],r=0,i=s.length;i>r;++r)n=x(n,this.generateStatement(s[r],Ee)),(e.finalizer||r+1!==i)&&(n=this.maybeBlockSuffix(s[r].body,n));if(e.handler)if(K(e.handler))for(r=0,i=e.handler.length;i>r;++r)n=x(n,this.generateStatement(e.handler[r],Ee)),(e.finalizer||r+1!==i)&&(n=this.maybeBlockSuffix(e.handler[r].body,n));else n=x(n,this.generateStatement(e.handler,Ee)),e.finalizer&&(n=this.maybeBlockSuffix(e.handler.body,n))}return e.finalizer&&(n=x(n,["finally",this.maybeBlock(e.finalizer,Ee)])),n},SwitchStatement:function(e,t){var n,r,i,s,a,u=this;if(v(function(){n=["switch"+Q+"(",u.generateExpression(e.discriminant,W.Sequence,Se),")"+Q+"{"+J]}),e.cases)for(a=Ee,i=0,s=e.cases.length;s>i;++i)i===s-1&&(a|=me),r=b(this.generateStatement(e.cases[i],a)),n.push(r),o(y(r).toString())||n.push(J);return n.push(b("}")),n},SwitchCase:function(e,t){var n,r,i,s,a,u=this;return v(function(){for(n=e.test?[x("case",u.generateExpression(e.test,W.Sequence,Se)),":"]:["default:"],i=0,s=e.consequent.length,s&&e.consequent[0].type===O.BlockStatement&&(r=u.maybeBlock(e.consequent[0],Ee),n.push(r),i=1),i===s||o(y(n).toString())||n.push(J),a=Ee;s>i;++i)i===s-1&&t&me&&(a|=me),r=b(u.generateStatement(e.consequent[i],a)),n.push(r),i+1===s||o(y(r).toString())||n.push(J)}),n},IfStatement:function(e,t){var n,r,i,s=this;return v(function(){n=["if"+Q+"(",s.generateExpression(e.test,W.Sequence,Se),")"]}),i=t&me,r=Ee,i&&(r|=me),e.alternate?(n.push(this.maybeBlock(e.consequent,Ee)),n=this.maybeBlockSuffix(e.consequent,n),n=e.alternate.type===O.IfStatement?x(n,["else ",this.generateStatement(e.alternate,r)]):x(n,x("else",this.maybeBlock(e.alternate,r)))):n.push(this.maybeBlock(e.consequent,r)),n},ForStatement:function(e,t){var n,r=this;return v(function(){n=["for"+Q+"("],e.init?e.init.type===O.VariableDeclaration?n.push(r.generateStatement(e.init,Ae)):(n.push(r.generateExpression(e.init,W.Sequence,de)),n.push(";")):n.push(";"),e.test?(n.push(Q),n.push(r.generateExpression(e.test,W.Sequence,Se)),n.push(";")):n.push(";"),e.update?(n.push(Q),n.push(r.generateExpression(e.update,W.Sequence,Se)),n.push(")")):n.push(")")}),n.push(this.maybeBlock(e.body,t&me?Ce:Ee)),n},ForInStatement:function(e,t){return this.generateIterationForStatement("in",e,t&me?Ce:Ee)},ForOfStatement:function(e,t){return this.generateIterationForStatement("of",e,t&me?Ce:Ee)},LabeledStatement:function(e,t){return[e.label.name+":",this.maybeBlock(e.body,t&me?Ce:Ee)]},Program:function(e,t){var n,r,i,s,a;for(s=e.body.length,n=[te&&s>0?"\n":""],a=we,i=0;s>i;++i)te||i!==s-1||(a|=me),ae&&(0===i&&(e.body[0].leadingComments||q(e.range[0],e.body[i].range[0],n)),i>0&&(e.body[i-1].trailingComments||e.body[i].leadingComments||q(e.body[i-1].range[1],e.body[i].range[0],n))),r=b(this.generateStatement(e.body[i],a)),n.push(r),s>i+1&&!o(y(r).toString())&&(ae?e.body[i+1].leadingComments||n.push(J):n.push(J)),ae&&i===s-1&&(e.body[i].trailingComments||q(e.body[i].range[1],e.range[1],n));return n},FunctionDeclaration:function(e,t){return[L(e,!0),"function",M(e)||S(),I(e.id),this.generateFunctionBody(e)]},ReturnStatement:function(e,t){return e.argument?[x("return",this.generateExpression(e.argument,W.Sequence,Se)),this.semicolon(t)]:["return"+this.semicolon(t)]},WhileStatement:function(e,t){var n,r=this;return v(function(){n=["while"+Q+"(",r.generateExpression(e.test,W.Sequence,Se),")"]}),n.push(this.maybeBlock(e.body,t&me?Ce:Ee)),n},WithStatement:function(e,t){var n,r=this;return v(function(){n=["with"+Q+"(",r.generateExpression(e.object,W.Sequence,Se),")"]}),n.push(this.maybeBlock(e.body,t&me?Ce:Ee)),n}},a(F.prototype,F.Statement),F.Expression={SequenceExpression:function(e,t,n){var r,i,s;for(W.Sequence<t&&(n|=ce),r=[],i=0,s=e.expressions.length;s>i;++i)r.push(this.generateExpression(e.expressions[i],W.Assignment,n)),s>i+1&&r.push(","+Q);return k(r,W.Sequence,t)},AssignmentExpression:function(e,t,n){return this.generateAssignment(e.left,e.right,e.operator,t,n)},ArrowFunctionExpression:function(e,t,n){return k(this.generateFunctionBody(e),W.ArrowFunction,t)},ConditionalExpression:function(e,t,n){return W.Conditional<t&&(n|=ce),k([this.generateExpression(e.test,W.LogicalOR,n),Q+"?"+Q,this.generateExpression(e.consequent,W.Assignment,n),Q+":"+Q,this.generateExpression(e.alternate,W.Assignment,n)],W.Conditional,t)},LogicalExpression:function(e,t,n){return this.BinaryExpression(e,t,n)},BinaryExpression:function(e,t,n){var r,i,s,o;return i=N[e.operator],t>i&&(n|=ce),s=this.generateExpression(e.left,i,n),o=s.toString(),r=47===o.charCodeAt(o.length-1)&&U.code.isIdentifierPart(e.operator.charCodeAt(0))?[s,S(),e.operator]:x(s,e.operator),s=this.generateExpression(e.right,i+1,n),"/"===e.operator&&"/"===s.toString().charAt(0)||"<"===e.operator.slice(-1)&&"!--"===s.toString().slice(0,3)?(r.push(S()),r.push(s)):r=x(r,s),"in"!==e.operator||n&ce?k(r,i,t):["(",r,")"]},CallExpression:function(e,t,n){var r,i,s;for(r=[this.generateExpression(e.callee,W.Call,ye)],r.push("("),i=0,s=e.arguments.length;s>i;++i)r.push(this.generateExpression(e.arguments[i],W.Assignment,Se)),s>i+1&&r.push(","+Q);return r.push(")"),n&he?k(r,W.Call,t):["(",r,")"]},NewExpression:function(e,t,n){var r,i,s,o,a;if(i=e.arguments.length,a=n&le&&!Z&&0===i?ve:xe,r=x("new",this.generateExpression(e.callee,W.New,a)),!(n&le)||Z||i>0){for(r.push("("),s=0,o=i;o>s;++s)r.push(this.generateExpression(e.arguments[s],W.Assignment,Se)),o>s+1&&r.push(","+Q);r.push(")")}return k(r,W.New,t)},MemberExpression:function(e,t,n){var r,i;return r=[this.generateExpression(e.object,W.Call,n&he?ye:xe)],e.computed?(r.push("["),r.push(this.generateExpression(e.property,W.Sequence,n&he?Se:ve)),r.push("]")):(e.object.type===O.Literal&&"number"==typeof e.object.value&&(i=y(r).toString(),i.indexOf(".")<0&&!/[eExX]/.test(i)&&U.code.isDecimalDigit(i.charCodeAt(i.length-1))&&!(i.length>=2&&48===i.charCodeAt(0))&&r.push(".")),r.push("."),r.push(I(e.property))),k(r,W.Member,t)},UnaryExpression:function(e,t,n){var r,i,s,o,a;return i=this.generateExpression(e.argument,W.Unary,Se),""===Q?r=x(e.operator,i):(r=[e.operator],e.operator.length>2?r=x(r,i):(o=y(r).toString(),a=o.charCodeAt(o.length-1),s=i.toString().charCodeAt(0),(43===a||45===a)&&a===s||U.code.isIdentifierPart(a)&&U.code.isIdentifierPart(s)?(r.push(S()),r.push(i)):r.push(i))),k(r,W.Unary,t)},YieldExpression:function(e,t,n){var r;return r=e.delegate?"yield*":"yield",e.argument&&(r=x(r,this.generateExpression(e.argument,W.Yield,Se))),k(r,W.Yield,t)},AwaitExpression:function(e,t,n){var r=x(e.delegate?"await*":"await",this.generateExpression(e.argument,W.Await,Se));return k(r,W.Await,t)},UpdateExpression:function(e,t,n){return e.prefix?k([e.operator,this.generateExpression(e.argument,W.Unary,Se)],W.Unary,t):k([this.generateExpression(e.argument,W.Postfix,Se),e.operator],W.Postfix,t)},FunctionExpression:function(e,t,n){var r=[L(e,!0),"function"];return e.id?(r.push(M(e)||S()),r.push(I(e.id))):r.push(M(e)||Q),r.push(this.generateFunctionBody(e)),r},ExportBatchSpecifier:function(e,t,n){return"*"},ArrayPattern:function(e,t,n){return this.ArrayExpression(e,t,n)},ArrayExpression:function(e,t,n){var r,i,s=this;return e.elements.length?(i=e.elements.length>1,r=["[",i?J:""],v(function(t){var n,o;for(n=0,o=e.elements.length;o>n;++n)e.elements[n]?(r.push(i?t:""),r.push(s.generateExpression(e.elements[n],W.Assignment,Se))):(i&&r.push(t),n+1===o&&r.push(",")),o>n+1&&r.push(","+(i?J:Q))}),i&&!o(y(r).toString())&&r.push(J),r.push(i?V:""),r.push("]"),r):"[]"},ClassExpression:function(e,t,n){var r,i;return r=["class"],e.id&&(r=x(r,this.generateExpression(e.id,W.Sequence,Se))),e.superClass&&(i=x("extends",this.generateExpression(e.superClass,W.Assignment,Se)),r=x(r,i)),r.push(Q),r.push(this.generateStatement(e.body,Ce)),r},MethodDefinition:function(e,t,n){var r,i;return r=e["static"]?["static"+Q]:[],i="get"===e.kind||"set"===e.kind?[x(e.kind,this.generatePropertyKey(e.key,e.computed)),this.generateFunctionBody(e.value)]:[T(e),this.generatePropertyKey(e.key,e.computed),this.generateFunctionBody(e.value)],x(r,i)},Property:function(e,t,n){return"get"===e.kind||"set"===e.kind?[e.kind,S(),this.generatePropertyKey(e.key,e.computed),this.generateFunctionBody(e.value)]:e.shorthand?this.generatePropertyKey(e.key,e.computed):e.method?[T(e),this.generatePropertyKey(e.key,e.computed),this.generateFunctionBody(e.value)]:[this.generatePropertyKey(e.key,e.computed),":"+Q,this.generateExpression(e.value,W.Assignment,Se)]},ObjectExpression:function(e,t,n){var r,i,a,u=this;return e.properties.length?(r=e.properties.length>1,v(function(){a=u.generateExpression(e.properties[0],W.Sequence,Se)}),r||s(y(a).toString())?(v(function(t){var n,s;if(i=["{",J,t,a],r)for(i.push(","+J),n=1,s=e.properties.length;s>n;++n)i.push(t),i.push(u.generateExpression(e.properties[n],W.Sequence,Se)),s>n+1&&i.push(","+J)}),o(y(i).toString())||i.push(J),i.push(V),i.push("}"),i):["{",Q,a,Q,"}"]):"{}"},ObjectPattern:function(e,t,n){var r,i,s,a,u,p=this;if(!e.properties.length)return"{}";if(a=!1,1===e.properties.length)u=e.properties[0],u.value.type!==O.Identifier&&(a=!0);else for(i=0,s=e.properties.length;s>i;++i)if(u=e.properties[i],!u.shorthand){a=!0;break}return r=["{",a?J:""],v(function(t){var n,i;for(n=0,i=e.properties.length;i>n;++n)r.push(a?t:""),r.push(p.generateExpression(e.properties[n],W.Sequence,Se)),i>n+1&&r.push(","+(a?J:Q))}),a&&!o(y(r).toString())&&r.push(J),r.push(a?V:""),r.push("}"),r},ThisExpression:function(e,t,n){return"this"},Identifier:function(e,t,n){return I(e)},ImportDefaultSpecifier:function(e,t,n){return I(e.id)},ImportNamespaceSpecifier:function(e,t,n){var r=["*"];return e.id&&r.push(Q+"as"+S()+I(e.id)),r},ImportSpecifier:function(e,t,n){return this.ExportSpecifier(e,t,n)},ExportSpecifier:function(e,t,n){var r=[e.id.name];return e.name&&r.push(S()+"as"+S()+I(e.name)),r},Literal:function(e,t,n){var r;if(e.hasOwnProperty("raw")&&ie&&re.raw)try{if(r=ie(e.raw).body[0].expression,r.type===O.Literal&&r.value===e.value)return e.raw}catch(i){}return null===e.value?"null":"string"==typeof e.value?m(e.value):"number"==typeof e.value?p(e.value):"boolean"==typeof e.value?e.value?"true":"false":h(e.value)},GeneratorExpression:function(e,t,n){return this.ComprehensionExpression(e,t,n)},ComprehensionExpression:function(e,t,n){var r,i,s,o,a=this;return r=e.type===O.GeneratorExpression?["("]:["["],re.moz.comprehensionExpressionStartsWithAssignment&&(o=this.generateExpression(e.body,W.Assignment,Se),r.push(o)),e.blocks&&v(function(){for(i=0,s=e.blocks.length;s>i;++i)o=a.generateExpression(e.blocks[i],W.Sequence,Se),i>0||re.moz.comprehensionExpressionStartsWithAssignment?r=x(r,o):r.push(o)}),e.filter&&(r=x(r,"if"+Q),o=this.generateExpression(e.filter,W.Sequence,Se),r=x(r,["(",o,")"])),re.moz.comprehensionExpressionStartsWithAssignment||(o=this.generateExpression(e.body,W.Assignment,Se),r=x(r,o)),r.push(e.type===O.GeneratorExpression?")":"]"),r},ComprehensionBlock:function(e,t,n){var r;return r=e.left.type===O.VariableDeclaration?[e.left.kind,S(),this.generateStatement(e.left.declarations[0],Ae)]:this.generateExpression(e.left,W.Call,Se),r=x(r,e.of?"of":"in"),r=x(r,this.generateExpression(e.right,W.Sequence,Se)),["for"+Q+"(",r,")"]},SpreadElement:function(e,t,n){return["...",this.generateExpression(e.argument,W.Assignment,Se)]},TaggedTemplateExpression:function(e,t,n){var r=ye;n&he||(r=xe);var i=[this.generateExpression(e.tag,W.Call,r),this.generateExpression(e.quasi,W.Primary,be)];return k(i,W.TaggedTemplate,t)},TemplateElement:function(e,t,n){return e.value.raw},TemplateLiteral:function(e,t,n){var r,i,s;for(r=["`"],i=0,s=e.quasis.length;s>i;++i)r.push(this.generateExpression(e.quasis[i],W.Primary,Se)),s>i+1&&(r.push("${"+Q),r.push(this.generateExpression(e.expressions[i],W.Sequence,Se)),r.push(Q+"}"));return r.push("`"),r},ModuleSpecifier:function(e,t,n){return this.Literal(e,t,n)}},a(F.prototype,F.Expression),F.prototype.generateExpression=function(e,t,n){var r,i;return i=e.type||O.Property,re.verbatim&&e.hasOwnProperty(re.verbatim)?P(e,t):(r=this[i](e,t,n),re.comment&&(r=w(e,r)),y(r,e))},F.prototype.generateStatement=function(e,t){var n,r;return n=this[e.type](e,t),re.comment&&(n=w(e,n)),r=y(n).toString(),e.type!==O.Program||te||""!==J||"\n"!==r.charAt(r.length-1)||(n=se?y(n).replaceRight(/\s+$/,""):r.replace(/\s+$/,"")),y(n,e)},ue={indent:{style:"",base:0},renumber:!0,hexadecimal:!0,quotes:"auto",escapeless:!0,compact:!0,parentheses:!1,semicolons:!1},pe=r().format,exports.version=require("./package.json").version,exports.generate=D,exports.attachComments=z.attachComments,exports.Precedence=u({},W),exports.browser=!1,exports.FORMAT_MINIFY=ue,exports.FORMAT_DEFAULTS=pe}()}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});


},{"./package.json":86,"estraverse":76,"esutils":80,"source-map":81}],76:[function(require,module,exports){
!function(e,t){"use strict";"function"==typeof define&&define.amd?define(["exports"],t):t("undefined"!=typeof exports?exports:e.estraverse={})}(this,function e(t){"use strict";function n(){}function r(e){var t,n,i={};for(t in e)e.hasOwnProperty(t)&&(n=e[t],"object"==typeof n&&null!==n?i[t]=r(n):i[t]=n);return i}function i(e){var t,n={};for(t in e)e.hasOwnProperty(t)&&(n[t]=e[t]);return n}function o(e,t){var n,r,i,o;for(r=e.length,i=0;r;)n=r>>>1,o=i+n,t(e[o])?r=n:(i=o+1,r-=n+1);return i}function s(e,t){var n,r,i,o;for(r=e.length,i=0;r;)n=r>>>1,o=i+n,t(e[o])?(i=o+1,r-=n+1):r=n;return i}function a(e,t){var n,r,i,o=b(t);for(r=0,i=o.length;i>r;r+=1)n=o[r],e[n]=t[n];return e}function l(e,t){this.parent=e,this.key=t}function p(e,t,n,r){this.node=e,this.path=t,this.wrap=n,this.ref=r}function u(){}function c(e){return null==e?!1:"object"==typeof e&&"string"==typeof e.type}function f(e,t){return(e===x.ObjectExpression||e===x.ObjectPattern)&&"properties"===t}function h(e,t){var n=new u;return n.traverse(e,t)}function m(e,t){var n=new u;return n.replace(e,t)}function d(e,t){var n;return n=o(t,function(t){return t.range[0]>e.range[0]}),e.extendedRange=[e.range[0],e.range[1]],n!==t.length&&(e.extendedRange[1]=t[n].range[0]),n-=1,n>=0&&(e.extendedRange[0]=t[n].range[1]),e}function y(e,t,n){var i,o,s,a,l=[];if(!e.range)throw new Error("attachComments needs range information");if(!n.length){if(t.length){for(s=0,o=t.length;o>s;s+=1)i=r(t[s]),i.extendedRange=[0,e.range[0]],l.push(i);e.leadingComments=l}return e}for(s=0,o=t.length;o>s;s+=1)l.push(d(r(t[s]),n));return a=0,h(e,{enter:function(e){for(var t;a<l.length&&(t=l[a],!(t.extendedRange[1]>e.range[0]));)t.extendedRange[1]===e.range[0]?(e.leadingComments||(e.leadingComments=[]),e.leadingComments.push(t),l.splice(a,1)):a+=1;return a===l.length?_.Break:l[a].extendedRange[0]>e.range[1]?_.Skip:void 0}}),a=0,h(e,{leave:function(e){for(var t;a<l.length&&(t=l[a],!(e.range[1]<t.extendedRange[0]));)e.range[1]===t.extendedRange[0]?(e.trailingComments||(e.trailingComments=[]),e.trailingComments.push(t),l.splice(a,1)):a+=1;return a===l.length?_.Break:l[a].extendedRange[0]>e.range[1]?_.Skip:void 0}}),e}var x,g,_,S,E,b,v,w,k;return g=Array.isArray,g||(g=function(e){return"[object Array]"===Object.prototype.toString.call(e)}),n(i),n(s),E=Object.create||function(){function e(){}return function(t){return e.prototype=t,new e}}(),b=Object.keys||function(e){var t,n=[];for(t in e)n.push(t);return n},x={AssignmentExpression:"AssignmentExpression",ArrayExpression:"ArrayExpression",ArrayPattern:"ArrayPattern",ArrowFunctionExpression:"ArrowFunctionExpression",AwaitExpression:"AwaitExpression",BlockStatement:"BlockStatement",BinaryExpression:"BinaryExpression",BreakStatement:"BreakStatement",CallExpression:"CallExpression",CatchClause:"CatchClause",ClassBody:"ClassBody",ClassDeclaration:"ClassDeclaration",ClassExpression:"ClassExpression",ComprehensionBlock:"ComprehensionBlock",ComprehensionExpression:"ComprehensionExpression",ConditionalExpression:"ConditionalExpression",ContinueStatement:"ContinueStatement",DebuggerStatement:"DebuggerStatement",DirectiveStatement:"DirectiveStatement",DoWhileStatement:"DoWhileStatement",EmptyStatement:"EmptyStatement",ExportBatchSpecifier:"ExportBatchSpecifier",ExportDeclaration:"ExportDeclaration",ExportSpecifier:"ExportSpecifier",ExpressionStatement:"ExpressionStatement",ForStatement:"ForStatement",ForInStatement:"ForInStatement",ForOfStatement:"ForOfStatement",FunctionDeclaration:"FunctionDeclaration",FunctionExpression:"FunctionExpression",GeneratorExpression:"GeneratorExpression",Identifier:"Identifier",IfStatement:"IfStatement",ImportDeclaration:"ImportDeclaration",ImportDefaultSpecifier:"ImportDefaultSpecifier",ImportNamespaceSpecifier:"ImportNamespaceSpecifier",ImportSpecifier:"ImportSpecifier",Literal:"Literal",LabeledStatement:"LabeledStatement",LogicalExpression:"LogicalExpression",MemberExpression:"MemberExpression",MethodDefinition:"MethodDefinition",ModuleSpecifier:"ModuleSpecifier",NewExpression:"NewExpression",ObjectExpression:"ObjectExpression",ObjectPattern:"ObjectPattern",Program:"Program",Property:"Property",ReturnStatement:"ReturnStatement",SequenceExpression:"SequenceExpression",SpreadElement:"SpreadElement",SwitchStatement:"SwitchStatement",SwitchCase:"SwitchCase",TaggedTemplateExpression:"TaggedTemplateExpression",TemplateElement:"TemplateElement",TemplateLiteral:"TemplateLiteral",ThisExpression:"ThisExpression",ThrowStatement:"ThrowStatement",TryStatement:"TryStatement",UnaryExpression:"UnaryExpression",UpdateExpression:"UpdateExpression",VariableDeclaration:"VariableDeclaration",VariableDeclarator:"VariableDeclarator",WhileStatement:"WhileStatement",WithStatement:"WithStatement",YieldExpression:"YieldExpression"},S={AssignmentExpression:["left","right"],ArrayExpression:["elements"],ArrayPattern:["elements"],ArrowFunctionExpression:["params","defaults","rest","body"],AwaitExpression:["argument"],BlockStatement:["body"],BinaryExpression:["left","right"],BreakStatement:["label"],CallExpression:["callee","arguments"],CatchClause:["param","body"],ClassBody:["body"],ClassDeclaration:["id","body","superClass"],ClassExpression:["id","body","superClass"],ComprehensionBlock:["left","right"],ComprehensionExpression:["blocks","filter","body"],ConditionalExpression:["test","consequent","alternate"],ContinueStatement:["label"],DebuggerStatement:[],DirectiveStatement:[],DoWhileStatement:["body","test"],EmptyStatement:[],ExportBatchSpecifier:[],ExportDeclaration:["declaration","specifiers","source"],ExportSpecifier:["id","name"],ExpressionStatement:["expression"],ForStatement:["init","test","update","body"],ForInStatement:["left","right","body"],ForOfStatement:["left","right","body"],FunctionDeclaration:["id","params","defaults","rest","body"],FunctionExpression:["id","params","defaults","rest","body"],GeneratorExpression:["blocks","filter","body"],Identifier:[],IfStatement:["test","consequent","alternate"],ImportDeclaration:["specifiers","source"],ImportDefaultSpecifier:["id"],ImportNamespaceSpecifier:["id"],ImportSpecifier:["id","name"],Literal:[],LabeledStatement:["label","body"],LogicalExpression:["left","right"],MemberExpression:["object","property"],MethodDefinition:["key","value"],ModuleSpecifier:[],NewExpression:["callee","arguments"],ObjectExpression:["properties"],ObjectPattern:["properties"],Program:["body"],Property:["key","value"],ReturnStatement:["argument"],SequenceExpression:["expressions"],SpreadElement:["argument"],SwitchStatement:["discriminant","cases"],SwitchCase:["test","consequent"],TaggedTemplateExpression:["tag","quasi"],TemplateElement:[],TemplateLiteral:["quasis","expressions"],ThisExpression:[],ThrowStatement:["argument"],TryStatement:["block","handlers","handler","guardedHandlers","finalizer"],UnaryExpression:["argument"],UpdateExpression:["argument"],VariableDeclaration:["declarations"],VariableDeclarator:["id","init"],WhileStatement:["test","body"],WithStatement:["object","body"],YieldExpression:["argument"]},v={},w={},k={},_={Break:v,Skip:w,Remove:k},l.prototype.replace=function(e){this.parent[this.key]=e},l.prototype.remove=function(){return g(this.parent)?(this.parent.splice(this.key,1),!0):(this.replace(null),!1)},u.prototype.path=function(){function e(e,t){if(g(t))for(r=0,i=t.length;i>r;++r)e.push(t[r]);else e.push(t)}var t,n,r,i,o,s;if(!this.__current.path)return null;for(o=[],t=2,n=this.__leavelist.length;n>t;++t)s=this.__leavelist[t],e(o,s.path);return e(o,this.__current.path),o},u.prototype.type=function(){var e=this.current();return e.type||this.__current.wrap},u.prototype.parents=function(){var e,t,n;for(n=[],e=1,t=this.__leavelist.length;t>e;++e)n.push(this.__leavelist[e].node);return n},u.prototype.current=function(){return this.__current.node},u.prototype.__execute=function(e,t){var n,r;return r=void 0,n=this.__current,this.__current=t,this.__state=null,e&&(r=e.call(this,t.node,this.__leavelist[this.__leavelist.length-1].node)),this.__current=n,r},u.prototype.notify=function(e){this.__state=e},u.prototype.skip=function(){this.notify(w)},u.prototype["break"]=function(){this.notify(v)},u.prototype.remove=function(){this.notify(k)},u.prototype.__initialize=function(e,t){this.visitor=t,this.root=e,this.__worklist=[],this.__leavelist=[],this.__current=null,this.__state=null,this.__fallback="iteration"===t.fallback,this.__keys=S,t.keys&&(this.__keys=a(E(this.__keys),t.keys))},u.prototype.traverse=function(e,t){var n,r,i,o,s,a,l,u,h,m,d,y;for(this.__initialize(e,t),y={},n=this.__worklist,r=this.__leavelist,n.push(new p(e,null,null,null)),r.push(new p(null,null,null,null));n.length;)if(i=n.pop(),i!==y){if(i.node){if(a=this.__execute(t.enter,i),this.__state===v||a===v)return;if(n.push(y),r.push(i),this.__state===w||a===w)continue;if(o=i.node,s=i.wrap||o.type,m=this.__keys[s],!m){if(!this.__fallback)throw new Error("Unknown node type "+s+".");m=b(o)}for(u=m.length;(u-=1)>=0;)if(l=m[u],d=o[l])if(g(d)){for(h=d.length;(h-=1)>=0;)if(d[h]){if(f(s,m[u]))i=new p(d[h],[l,h],"Property",null);else{if(!c(d[h]))continue;i=new p(d[h],[l,h],null,null)}n.push(i)}}else c(d)&&n.push(new p(d,l,null,null))}}else if(i=r.pop(),a=this.__execute(t.leave,i),this.__state===v||a===v)return},u.prototype.replace=function(e,t){function n(e){var t,n,i,o;if(e.ref.remove())for(n=e.ref.key,o=e.ref.parent,t=r.length;t--;)if(i=r[t],i.ref&&i.ref.parent===o){if(i.ref.key<n)break;--i.ref.key}}var r,i,o,s,a,u,h,m,d,y,x,_,S;for(this.__initialize(e,t),x={},r=this.__worklist,i=this.__leavelist,_={root:e},u=new p(e,null,null,new l(_,"root")),r.push(u),i.push(u);r.length;)if(u=r.pop(),u!==x){if(a=this.__execute(t.enter,u),void 0!==a&&a!==v&&a!==w&&a!==k&&(u.ref.replace(a),u.node=a),(this.__state===k||a===k)&&(n(u),u.node=null),this.__state===v||a===v)return _.root;if(o=u.node,o&&(r.push(x),i.push(u),this.__state!==w&&a!==w)){if(s=u.wrap||o.type,d=this.__keys[s],!d){if(!this.__fallback)throw new Error("Unknown node type "+s+".");d=b(o)}for(h=d.length;(h-=1)>=0;)if(S=d[h],y=o[S])if(g(y)){for(m=y.length;(m-=1)>=0;)if(y[m]){if(f(s,d[h]))u=new p(y[m],[S,m],"Property",new l(y,m));else{if(!c(y[m]))continue;u=new p(y[m],[S,m],null,new l(y,m))}r.push(u)}}else c(y)&&r.push(new p(y,S,null,new l(o,S)))}}else if(u=i.pop(),a=this.__execute(t.leave,u),void 0!==a&&a!==v&&a!==w&&a!==k&&u.ref.replace(a),(this.__state===k||a===k)&&n(u),this.__state===v||a===v)return _.root;return _.root},t.version="1.8.1-dev",t.Syntax=x,t.traverse=h,t.replace=m,t.attachComments=y,t.VisitorKeys=S,t.VisitorOption=_,t.Controller=u,t.cloneEnvironment=function(){return e({})},t});


},{}],77:[function(require,module,exports){
!function(){"use strict";function e(e){if(null==e)return!1;switch(e.type){case"ArrayExpression":case"AssignmentExpression":case"BinaryExpression":case"CallExpression":case"ConditionalExpression":case"FunctionExpression":case"Identifier":case"Literal":case"LogicalExpression":case"MemberExpression":case"NewExpression":case"ObjectExpression":case"SequenceExpression":case"ThisExpression":case"UnaryExpression":case"UpdateExpression":return!0}return!1}function t(e){if(null==e)return!1;switch(e.type){case"DoWhileStatement":case"ForInStatement":case"ForStatement":case"WhileStatement":return!0}return!1}function n(e){if(null==e)return!1;switch(e.type){case"BlockStatement":case"BreakStatement":case"ContinueStatement":case"DebuggerStatement":case"DoWhileStatement":case"EmptyStatement":case"ExpressionStatement":case"ForInStatement":case"ForStatement":case"IfStatement":case"LabeledStatement":case"ReturnStatement":case"SwitchStatement":case"ThrowStatement":case"TryStatement":case"VariableDeclaration":case"WhileStatement":case"WithStatement":return!0}return!1}function a(e){return n(e)||null!=e&&"FunctionDeclaration"===e.type}function s(e){switch(e.type){case"IfStatement":return null!=e.alternate?e.alternate:e.consequent;case"LabeledStatement":case"ForStatement":case"ForInStatement":case"WhileStatement":case"WithStatement":return e.body}return null}function r(e){var t;if("IfStatement"!==e.type)return!1;if(null==e.alternate)return!1;t=e.consequent;do{if("IfStatement"===t.type&&null==t.alternate)return!0;t=s(t)}while(t);return!1}module.exports={isExpression:e,isStatement:n,isIterationStatement:t,isSourceElement:a,isProblematicIfStatement:r,trailingStatement:s}}();


},{}],78:[function(require,module,exports){
/*
  Copyright (C) 2013-2014 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2014 Ivan Nikulin <ifaaan@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function () {
    'use strict';

    var Regex, NON_ASCII_WHITESPACES;

    // See `tools/generate-identifier-regex.js`.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
        NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
    };

    function isDecimalDigit(ch) {
        return (ch >= 48 && ch <= 57);   // 0..9
    }

    function isHexDigit(ch) {
        return isDecimalDigit(ch) ||    // 0..9
            (97 <= ch && ch <= 102) ||  // a..f
            (65 <= ch && ch <= 70);     // A..F
    }

    function isOctalDigit(ch) {
        return (ch >= 48 && ch <= 55);   // 0..7
    }

    // 7.2 White Space

    NON_ASCII_WHITESPACES = [
        0x1680, 0x180E,
        0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A,
        0x202F, 0x205F,
        0x3000,
        0xFEFF
    ];

    function isWhiteSpace(ch) {
        return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
            (ch >= 0x1680 && NON_ASCII_WHITESPACES.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch >= 97 && ch <= 122) ||     // a..z
            (ch >= 65 && ch <= 90) ||         // A..Z
            (ch === 36) || (ch === 95) ||     // $ (dollar) and _ (underscore)
            (ch === 92) ||                    // \ (backslash)
            ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
    }

    function isIdentifierPart(ch) {
        return (ch >= 97 && ch <= 122) ||     // a..z
            (ch >= 65 && ch <= 90) ||         // A..Z
            (ch >= 48 && ch <= 57) ||         // 0..9
            (ch === 36) || (ch === 95) ||     // $ (dollar) and _ (underscore)
            (ch === 92) ||                    // \ (backslash)
            ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
    }

    module.exports = {
        isDecimalDigit: isDecimalDigit,
        isHexDigit: isHexDigit,
        isOctalDigit: isOctalDigit,
        isWhiteSpace: isWhiteSpace,
        isLineTerminator: isLineTerminator,
        isIdentifierStart: isIdentifierStart,
        isIdentifierPart: isIdentifierPart
    };
}());
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],79:[function(require,module,exports){
!function(){"use strict";function e(e){switch(e){case"implements":case"interface":case"package":case"private":case"protected":case"public":case"static":case"let":return!0;default:return!1}}function r(e,r){return r||"yield"!==e?t(e,r):!1}function t(r,t){if(t&&e(r))return!0;switch(r.length){case 2:return"if"===r||"in"===r||"do"===r;case 3:return"var"===r||"for"===r||"new"===r||"try"===r;case 4:return"this"===r||"else"===r||"case"===r||"void"===r||"with"===r||"enum"===r;case 5:return"while"===r||"break"===r||"catch"===r||"throw"===r||"const"===r||"yield"===r||"class"===r||"super"===r;case 6:return"return"===r||"typeof"===r||"delete"===r||"switch"===r||"export"===r||"import"===r;case 7:return"default"===r||"finally"===r||"extends"===r;case 8:return"function"===r||"continue"===r||"debugger"===r;case 10:return"instanceof"===r;default:return!1}}function n(e,t){return"null"===e||"true"===e||"false"===e||r(e,t)}function i(e,r){return"null"===e||"true"===e||"false"===e||t(e,r)}function u(e){return"eval"===e||"arguments"===e}function s(e){var r,t,n;if(0===e.length)return!1;if(n=e.charCodeAt(0),!o.isIdentifierStart(n)||92===n)return!1;for(r=1,t=e.length;t>r;++r)if(n=e.charCodeAt(r),!o.isIdentifierPart(n)||92===n)return!1;return!0}function c(e,r){return s(e)&&!n(e,r)}function a(e,r){return s(e)&&!i(e,r)}var o=require("./code");module.exports={isKeywordES5:r,isKeywordES6:t,isReservedWordES5:n,isReservedWordES6:i,isRestrictedWord:u,isIdentifierName:s,isIdentifierES5:c,isIdentifierES6:a}}();


},{"./code":78}],80:[function(require,module,exports){
!function(){"use strict";exports.ast=require("./ast"),exports.code=require("./code"),exports.keyword=require("./keyword")}();


},{"./ast":77,"./code":78,"./keyword":79}],81:[function(require,module,exports){
exports.SourceMapGenerator=require("./source-map/source-map-generator").SourceMapGenerator,exports.SourceMapConsumer=require("./source-map/source-map-consumer").SourceMapConsumer,exports.SourceNode=require("./source-map/source-node").SourceNode;


},{"./source-map/source-map-consumer":82,"./source-map/source-map-generator":83,"./source-map/source-node":84}],82:[function(require,module,exports){
if("function"!=typeof define)var define=require("amdefine")(module,require);define(function(e,n,r){function t(e){var n=e;"string"==typeof e&&(n=JSON.parse(e.replace(/^\)\]\}'/,"")));var r=i.getArg(n,"version"),t=i.getArg(n,"sources"),o=i.getArg(n,"names",[]),s=i.getArg(n,"sourceRoot",null),l=i.getArg(n,"sourcesContent",null),u=i.getArg(n,"mappings"),g=i.getArg(n,"file",null);if(r!=this._version)throw new Error("Unsupported version: "+r);t=t.map(i.normalize),this._names=a.fromArray(o,!0),this._sources=a.fromArray(t,!0),this.sourceRoot=s,this.sourcesContent=l,this._mappings=u,this.file=g}var i=e("./util"),o=e("./binary-search"),a=e("./array-set").ArraySet,s=e("./base64-vlq");t.fromSourceMap=function(e){var n=Object.create(t.prototype);return n._names=a.fromArray(e._names.toArray(),!0),n._sources=a.fromArray(e._sources.toArray(),!0),n.sourceRoot=e._sourceRoot,n.sourcesContent=e._generateSourcesContent(n._sources.toArray(),n.sourceRoot),n.file=e._file,n.__generatedMappings=e._mappings.toArray().slice(),n.__originalMappings=e._mappings.toArray().slice().sort(i.compareByOriginalPositions),n},t.prototype._version=3,Object.defineProperty(t.prototype,"sources",{get:function(){return this._sources.toArray().map(function(e){return null!=this.sourceRoot?i.join(this.sourceRoot,e):e},this)}}),t.prototype.__generatedMappings=null,Object.defineProperty(t.prototype,"_generatedMappings",{get:function(){return this.__generatedMappings||(this.__generatedMappings=[],this.__originalMappings=[],this._parseMappings(this._mappings,this.sourceRoot)),this.__generatedMappings}}),t.prototype.__originalMappings=null,Object.defineProperty(t.prototype,"_originalMappings",{get:function(){return this.__originalMappings||(this.__generatedMappings=[],this.__originalMappings=[],this._parseMappings(this._mappings,this.sourceRoot)),this.__originalMappings}}),t.prototype._nextCharIsMappingSeparator=function(e){var n=e.charAt(0);return";"===n||","===n},t.prototype._parseMappings=function(e,n){for(var r,t=1,o=0,a=0,l=0,u=0,g=0,p=e,c={};p.length>0;)if(";"===p.charAt(0))t++,p=p.slice(1),o=0;else if(","===p.charAt(0))p=p.slice(1);else{if(r={},r.generatedLine=t,s.decode(p,c),r.generatedColumn=o+c.value,o=r.generatedColumn,p=c.rest,p.length>0&&!this._nextCharIsMappingSeparator(p)){if(s.decode(p,c),r.source=this._sources.at(u+c.value),u+=c.value,p=c.rest,0===p.length||this._nextCharIsMappingSeparator(p))throw new Error("Found a source, but no line and column");if(s.decode(p,c),r.originalLine=a+c.value,a=r.originalLine,r.originalLine+=1,p=c.rest,0===p.length||this._nextCharIsMappingSeparator(p))throw new Error("Found a source and line, but no column");s.decode(p,c),r.originalColumn=l+c.value,l=r.originalColumn,p=c.rest,p.length>0&&!this._nextCharIsMappingSeparator(p)&&(s.decode(p,c),r.name=this._names.at(g+c.value),g+=c.value,p=c.rest)}this.__generatedMappings.push(r),"number"==typeof r.originalLine&&this.__originalMappings.push(r)}this.__generatedMappings.sort(i.compareByGeneratedPositions),this.__originalMappings.sort(i.compareByOriginalPositions)},t.prototype._findMapping=function(e,n,r,t,i){if(e[r]<=0)throw new TypeError("Line must be greater than or equal to 1, got "+e[r]);if(e[t]<0)throw new TypeError("Column must be greater than or equal to 0, got "+e[t]);return o.search(e,n,i)},t.prototype.computeColumnSpans=function(){for(var e=0;e<this._generatedMappings.length;++e){var n=this._generatedMappings[e];if(e+1<this._generatedMappings.length){var r=this._generatedMappings[e+1];if(n.generatedLine===r.generatedLine){n.lastGeneratedColumn=r.generatedColumn-1;continue}}n.lastGeneratedColumn=1/0}},t.prototype.originalPositionFor=function(e){var n={generatedLine:i.getArg(e,"line"),generatedColumn:i.getArg(e,"column")},r=this._findMapping(n,this._generatedMappings,"generatedLine","generatedColumn",i.compareByGeneratedPositions);if(r>=0){var t=this._generatedMappings[r];if(t.generatedLine===n.generatedLine){var o=i.getArg(t,"source",null);return null!=o&&null!=this.sourceRoot&&(o=i.join(this.sourceRoot,o)),{source:o,line:i.getArg(t,"originalLine",null),column:i.getArg(t,"originalColumn",null),name:i.getArg(t,"name",null)}}}return{source:null,line:null,column:null,name:null}},t.prototype.sourceContentFor=function(e){if(!this.sourcesContent)return null;if(null!=this.sourceRoot&&(e=i.relative(this.sourceRoot,e)),this._sources.has(e))return this.sourcesContent[this._sources.indexOf(e)];var n;if(null!=this.sourceRoot&&(n=i.urlParse(this.sourceRoot))){var r=e.replace(/^file:\/\//,"");if("file"==n.scheme&&this._sources.has(r))return this.sourcesContent[this._sources.indexOf(r)];if((!n.path||"/"==n.path)&&this._sources.has("/"+e))return this.sourcesContent[this._sources.indexOf("/"+e)]}throw new Error('"'+e+'" is not in the SourceMap.')},t.prototype.generatedPositionFor=function(e){var n={source:i.getArg(e,"source"),originalLine:i.getArg(e,"line"),originalColumn:i.getArg(e,"column")};null!=this.sourceRoot&&(n.source=i.relative(this.sourceRoot,n.source));var r=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",i.compareByOriginalPositions);if(r>=0){var t=this._originalMappings[r];return{line:i.getArg(t,"generatedLine",null),column:i.getArg(t,"generatedColumn",null),lastColumn:i.getArg(t,"lastGeneratedColumn",null)}}return{line:null,column:null,lastColumn:null}},t.prototype.allGeneratedPositionsFor=function(e){var n={source:i.getArg(e,"source"),originalLine:i.getArg(e,"line"),originalColumn:1/0};null!=this.sourceRoot&&(n.source=i.relative(this.sourceRoot,n.source));var r=[],t=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",i.compareByOriginalPositions);if(t>=0)for(var o=this._originalMappings[t];o&&o.originalLine===n.originalLine;)r.push({line:i.getArg(o,"generatedLine",null),column:i.getArg(o,"generatedColumn",null),lastColumn:i.getArg(o,"lastGeneratedColumn",null)}),o=this._originalMappings[--t];return r.reverse()},t.GENERATED_ORDER=1,t.ORIGINAL_ORDER=2,t.prototype.eachMapping=function(e,n,r){var o,a=n||null,s=r||t.GENERATED_ORDER;switch(s){case t.GENERATED_ORDER:o=this._generatedMappings;break;case t.ORIGINAL_ORDER:o=this._originalMappings;break;default:throw new Error("Unknown order of iteration.")}var l=this.sourceRoot;o.map(function(e){var n=e.source;return null!=n&&null!=l&&(n=i.join(l,n)),{source:n,generatedLine:e.generatedLine,generatedColumn:e.generatedColumn,originalLine:e.originalLine,originalColumn:e.originalColumn,name:e.name}}).forEach(e,a)},n.SourceMapConsumer=t});


},{"amdefine":85}],83:[function(require,module,exports){
if("function"!=typeof define)var define=require("amdefine")(module,require);define(function(e,n,o){function t(e){e||(e={}),this._file=r.getArg(e,"file",null),this._sourceRoot=r.getArg(e,"sourceRoot",null),this._skipValidation=r.getArg(e,"skipValidation",!1),this._sources=new s,this._names=new s,this._mappings=new l,this._sourcesContents=null}var i=e("./base64-vlq"),r=e("./util"),s=e("./array-set").ArraySet,l=e("./mapping-list").MappingList;t.prototype._version=3,t.fromSourceMap=function(e){var n=e.sourceRoot,o=new t({file:e.file,sourceRoot:n});return e.eachMapping(function(e){var t={generated:{line:e.generatedLine,column:e.generatedColumn}};null!=e.source&&(t.source=e.source,null!=n&&(t.source=r.relative(n,t.source)),t.original={line:e.originalLine,column:e.originalColumn},null!=e.name&&(t.name=e.name)),o.addMapping(t)}),e.sources.forEach(function(n){var t=e.sourceContentFor(n);null!=t&&o.setSourceContent(n,t)}),o},t.prototype.addMapping=function(e){var n=r.getArg(e,"generated"),o=r.getArg(e,"original",null),t=r.getArg(e,"source",null),i=r.getArg(e,"name",null);this._skipValidation||this._validateMapping(n,o,t,i),null==t||this._sources.has(t)||this._sources.add(t),null==i||this._names.has(i)||this._names.add(i),this._mappings.add({generatedLine:n.line,generatedColumn:n.column,originalLine:null!=o&&o.line,originalColumn:null!=o&&o.column,source:t,name:i})},t.prototype.setSourceContent=function(e,n){var o=e;null!=this._sourceRoot&&(o=r.relative(this._sourceRoot,o)),null!=n?(this._sourcesContents||(this._sourcesContents={}),this._sourcesContents[r.toSetString(o)]=n):this._sourcesContents&&(delete this._sourcesContents[r.toSetString(o)],0===Object.keys(this._sourcesContents).length&&(this._sourcesContents=null))},t.prototype.applySourceMap=function(e,n,o){var t=n;if(null==n){if(null==e.file)throw new Error('SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map\'s "file" property. Both were omitted.');t=e.file}var i=this._sourceRoot;null!=i&&(t=r.relative(i,t));var l=new s,u=new s;this._mappings.unsortedForEach(function(n){if(n.source===t&&null!=n.originalLine){var s=e.originalPositionFor({line:n.originalLine,column:n.originalColumn});null!=s.source&&(n.source=s.source,null!=o&&(n.source=r.join(o,n.source)),null!=i&&(n.source=r.relative(i,n.source)),n.originalLine=s.line,n.originalColumn=s.column,null!=s.name&&(n.name=s.name))}var a=n.source;null==a||l.has(a)||l.add(a);var c=n.name;null==c||u.has(c)||u.add(c)},this),this._sources=l,this._names=u,e.sources.forEach(function(n){var t=e.sourceContentFor(n);null!=t&&(null!=o&&(n=r.join(o,n)),null!=i&&(n=r.relative(i,n)),this.setSourceContent(n,t))},this)},t.prototype._validateMapping=function(e,n,o,t){if(!(e&&"line"in e&&"column"in e&&e.line>0&&e.column>=0&&!n&&!o&&!t||e&&"line"in e&&"column"in e&&n&&"line"in n&&"column"in n&&e.line>0&&e.column>=0&&n.line>0&&n.column>=0&&o))throw new Error("Invalid mapping: "+JSON.stringify({generated:e,source:o,original:n,name:t}))},t.prototype._serializeMappings=function(){for(var e,n=0,o=1,t=0,s=0,l=0,u=0,a="",c=this._mappings.toArray(),p=0,g=c.length;g>p;p++){if(e=c[p],e.generatedLine!==o)for(n=0;e.generatedLine!==o;)a+=";",o++;else if(p>0){if(!r.compareByGeneratedPositions(e,c[p-1]))continue;a+=","}a+=i.encode(e.generatedColumn-n),n=e.generatedColumn,null!=e.source&&(a+=i.encode(this._sources.indexOf(e.source)-u),u=this._sources.indexOf(e.source),a+=i.encode(e.originalLine-1-s),s=e.originalLine-1,a+=i.encode(e.originalColumn-t),t=e.originalColumn,null!=e.name&&(a+=i.encode(this._names.indexOf(e.name)-l),l=this._names.indexOf(e.name)))}return a},t.prototype._generateSourcesContent=function(e,n){return e.map(function(e){if(!this._sourcesContents)return null;null!=n&&(e=r.relative(n,e));var o=r.toSetString(e);return Object.prototype.hasOwnProperty.call(this._sourcesContents,o)?this._sourcesContents[o]:null},this)},t.prototype.toJSON=function(){var e={version:this._version,sources:this._sources.toArray(),names:this._names.toArray(),mappings:this._serializeMappings()};return null!=this._file&&(e.file=this._file),null!=this._sourceRoot&&(e.sourceRoot=this._sourceRoot),this._sourcesContents&&(e.sourcesContent=this._generateSourcesContent(e.sources,e.sourceRoot)),e},t.prototype.toString=function(){return JSON.stringify(this)},n.SourceMapGenerator=t});


},{"amdefine":85}],84:[function(require,module,exports){
if("function"!=typeof define)var define=require("amdefine")(module,require);define(function(n,e,t){function r(n,e,t,r,o){this.children=[],this.sourceContents={},this.line=null==n?null:n,this.column=null==e?null:e,this.source=null==t?null:t,this.name=null==o?null:o,this[s]=!0,null!=r&&this.add(r)}var o=n("./source-map-generator").SourceMapGenerator,i=n("./util"),l=/(\r?\n)/,u=10,s="$$$isSourceNode$$$";r.fromStringWithSourceMap=function(n,e,t){function o(n,e){if(null===n||void 0===n.source)u.add(e);else{var o=t?i.join(t,n.source):n.source;u.add(new r(n.originalLine,n.originalColumn,o,e,n.name))}}var u=new r,s=n.split(l),c=function(){var n=s.shift(),e=s.shift()||"";return n+e},a=1,h=0,d=null;return e.eachMapping(function(n){if(null!==d){if(!(a<n.generatedLine)){var e=s[0],t=e.substr(0,n.generatedColumn-h);return s[0]=e.substr(n.generatedColumn-h),h=n.generatedColumn,o(d,t),void(d=n)}var t="";o(d,c()),a++,h=0}for(;a<n.generatedLine;)u.add(c()),a++;if(h<n.generatedColumn){var e=s[0];u.add(e.substr(0,n.generatedColumn)),s[0]=e.substr(n.generatedColumn),h=n.generatedColumn}d=n},this),s.length>0&&(d&&o(d,c()),u.add(s.join(""))),e.sources.forEach(function(n){var r=e.sourceContentFor(n);null!=r&&(null!=t&&(n=i.join(t,n)),u.setSourceContent(n,r))}),u},r.prototype.add=function(n){if(Array.isArray(n))n.forEach(function(n){this.add(n)},this);else{if(!n[s]&&"string"!=typeof n)throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+n);n&&this.children.push(n)}return this},r.prototype.prepend=function(n){if(Array.isArray(n))for(var e=n.length-1;e>=0;e--)this.prepend(n[e]);else{if(!n[s]&&"string"!=typeof n)throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+n);this.children.unshift(n)}return this},r.prototype.walk=function(n){for(var e,t=0,r=this.children.length;r>t;t++)e=this.children[t],e[s]?e.walk(n):""!==e&&n(e,{source:this.source,line:this.line,column:this.column,name:this.name})},r.prototype.join=function(n){var e,t,r=this.children.length;if(r>0){for(e=[],t=0;r-1>t;t++)e.push(this.children[t]),e.push(n);e.push(this.children[t]),this.children=e}return this},r.prototype.replaceRight=function(n,e){var t=this.children[this.children.length-1];return t[s]?t.replaceRight(n,e):"string"==typeof t?this.children[this.children.length-1]=t.replace(n,e):this.children.push("".replace(n,e)),this},r.prototype.setSourceContent=function(n,e){this.sourceContents[i.toSetString(n)]=e},r.prototype.walkSourceContents=function(n){for(var e=0,t=this.children.length;t>e;e++)this.children[e][s]&&this.children[e].walkSourceContents(n);for(var r=Object.keys(this.sourceContents),e=0,t=r.length;t>e;e++)n(i.fromSetString(r[e]),this.sourceContents[r[e]])},r.prototype.toString=function(){var n="";return this.walk(function(e){n+=e}),n},r.prototype.toStringWithSourceMap=function(n){var e={code:"",line:1,column:0},t=new o(n),r=!1,i=null,l=null,s=null,c=null;return this.walk(function(n,o){e.code+=n,null!==o.source&&null!==o.line&&null!==o.column?((i!==o.source||l!==o.line||s!==o.column||c!==o.name)&&t.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:e.line,column:e.column},name:o.name}),i=o.source,l=o.line,s=o.column,c=o.name,r=!0):r&&(t.addMapping({generated:{line:e.line,column:e.column}}),i=null,r=!1);for(var a=0,h=n.length;h>a;a++)n.charCodeAt(a)===u?(e.line++,e.column=0,a+1===h?(i=null,r=!1):r&&t.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:e.line,column:e.column},name:o.name})):e.column++}),this.walkSourceContents(function(n,e){t.setSourceContent(n,e)}),{code:e.code,map:t}},e.SourceNode=r});


},{"amdefine":85}],85:[function(require,module,exports){
(function(r,e){"use strict";function n(n,t){function i(r){var e,n;for(e=0;r[e];e+=1)if(n=r[e],"."===n)r.splice(e,1),e-=1;else if(".."===n){if(1===e&&(".."===r[2]||".."===r[0]))break;e>0&&(r.splice(e-1,2),e-=2)}}function o(r,e){var n;return r&&"."===r.charAt(0)&&e&&(n=e.split("/"),n=n.slice(0,n.length-1),n=n.concat(r.split("/")),i(n),r=n.join("/")),r}function u(r){return function(e){return o(e,r)}}function f(r){function e(e){d[r]=e}return e.fromText=function(r,e){throw new Error("amdefine does not implement load.fromText")},e}function l(r,i,o){var u,f,l,a;if(r)f=d[r]={},l={id:r,uri:e,exports:f},u=s(t,f,l,r);else{if(m)throw new Error("amdefine with no module ID cannot be called more than once per file.");m=!0,f=n.exports,l=n,u=s(t,f,l,n.id)}i&&(i=i.map(function(r){return u(r)})),a="function"==typeof o?o.apply(l.exports,i):o,void 0!==a&&(l.exports=a,r&&(d[r]=l.exports))}function a(r,e,n){Array.isArray(r)?(n=e,e=r,r=void 0):"string"!=typeof r&&(n=r,r=e=void 0),e&&!Array.isArray(e)&&(n=e,e=void 0),e||(e=["require","exports","module"]),r?p[r]=[r,e,n]:l(r,e,n)}var s,c,p={},d={},m=!1,x=require("path");return s=function(e,n,t,i){function u(o,u){return"string"==typeof o?c(e,n,t,o,i):(o=o.map(function(r){return c(e,n,t,r,i)}),void(u&&r.nextTick(function(){u.apply(null,o)})))}return u.toUrl=function(r){return 0===r.indexOf(".")?o(r,x.dirname(t.filename)):r},u},t=t||function(){return n.require.apply(n,arguments)},c=function(r,e,n,t,i){var a,m,x=t.indexOf("!"),y=t;if(-1===x){if(t=o(t,i),"require"===t)return s(r,e,n,i);if("exports"===t)return e;if("module"===t)return n;if(d.hasOwnProperty(t))return d[t];if(p[t])return l.apply(null,p[t]),d[t];if(r)return r(y);throw new Error("No module with ID: "+t)}return a=t.substring(0,x),t=t.substring(x+1,t.length),m=c(r,e,n,a,i),t=m.normalize?m.normalize(t,u(i)):o(t,i),d[t]?d[t]:(m.load(t,s(r,e,n,i),f(t),{}),d[t])},a.require=function(r){return d[r]?d[r]:p[r]?(l.apply(null,p[r]),d[r]):void 0},a.amd={},a}module.exports=n}).call(this,require("_process"),"/node_modules\\escodegen\\node_modules\\source-map\\node_modules\\amdefine\\amdefine.js");


},{"_process":95,"path":94}],86:[function(require,module,exports){
module.exports={
  "name": "escodegen",
  "description": "ECMAScript code generator",
  "homepage": "http://github.com/estools/escodegen",
  "main": "escodegen.js",
  "bin": {
    "esgenerate": "./bin/esgenerate.js",
    "escodegen": "./bin/escodegen.js"
  },
  "files": [
    "LICENSE.BSD",
    "LICENSE.source-map",
    "README.md",
    "bin",
    "escodegen.js",
    "package.json"
  ],
  "version": "1.6.1",
  "engines": {
    "node": ">=0.10.0"
  },
  "maintainers": [
    {
      "name": "Yusuke Suzuki",
      "email": "utatane.tea@gmail.com",
      "url": "http://github.com/Constellation"
    }
  ],
  "repository": {
    "type": "git",
    "url": "http://github.com/estools/escodegen.git"
  },
  "dependencies": {
    "estraverse": "^1.9.1",
    "esutils": "^1.1.6",
    "esprima": "^1.2.2",
    "optionator": "^0.5.0",
    "source-map": "~0.1.40"
  },
  "optionalDependencies": {
    "source-map": "~0.1.40"
  },
  "devDependencies": {
    "acorn-6to5": "^0.11.1-25",
    "bluebird": "^2.3.11",
    "bower-registry-client": "^0.2.1",
    "chai": "^1.10.0",
    "commonjs-everywhere": "^0.9.7",
    "esprima-moz": "*",
    "gulp": "^3.8.10",
    "gulp-eslint": "^0.2.0",
    "gulp-mocha": "^2.0.0",
    "semver": "^4.1.0"
  },
  "licenses": [
    {
      "type": "BSD",
      "url": "http://github.com/estools/escodegen/raw/master/LICENSE.BSD"
    }
  ],
  "scripts": {
    "test": "gulp travis",
    "unit-test": "gulp test",
    "lint": "gulp lint",
    "release": "node tools/release.js",
    "build-min": "cjsify -ma path: tools/entry-point.js > escodegen.browser.min.js",
    "build": "cjsify -a path: tools/entry-point.js > escodegen.browser.js"
  },
  "readme": "## Escodegen\n[![npm version](https://badge.fury.io/js/escodegen.svg)](http://badge.fury.io/js/escodegen)\n[![Build Status](https://secure.travis-ci.org/estools/escodegen.svg)](http://travis-ci.org/estools/escodegen)\n[![Dependency Status](https://david-dm.org/estools/escodegen.svg)](https://david-dm.org/estools/escodegen)\n[![devDependency Status](https://david-dm.org/estools/escodegen/dev-status.svg)](https://david-dm.org/estools/escodegen#info=devDependencies)\n\nEscodegen ([escodegen](http://github.com/estools/escodegen)) is an\n[ECMAScript](http://www.ecma-international.org/publications/standards/Ecma-262.htm)\n(also popularly known as [JavaScript](http://en.wikipedia.org/wiki/JavaScript))\ncode generator from [Mozilla's Parser API](https://developer.mozilla.org/en/SpiderMonkey/Parser_API)\nAST. See the [online generator](https://estools.github.io/escodegen/demo/index.html)\nfor a demo.\n\n\n### Install\n\nEscodegen can be used in a web browser:\n\n    <script src=\"escodegen.browser.js\"></script>\n\nescodegen.browser.js can be found in tagged revisions on GitHub.\n\nOr in a Node.js application via npm:\n\n    npm install escodegen\n\n### Usage\n\nA simple example: the program\n\n    escodegen.generate({\n        type: 'BinaryExpression',\n        operator: '+',\n        left: { type: 'Literal', value: 40 },\n        right: { type: 'Literal', value: 2 }\n    });\n\nproduces the string `'40 + 2'`.\n\nSee the [API page](https://github.com/estools/escodegen/wiki/API) for\noptions. To run the tests, execute `npm test` in the root directory.\n\n### Building browser bundle / minified browser bundle\n\nAt first, execute `npm install` to install the all dev dependencies.\nAfter that,\n\n    npm run-script build\n\nwill generate `escodegen.browser.js`, which can be used in browser environments.\n\nAnd,\n\n    npm run-script build-min\n\nwill generate the minified file `escodegen.browser.min.js`.\n\n### License\n\n#### Escodegen\n\nCopyright (C) 2012 [Yusuke Suzuki](http://github.com/Constellation)\n (twitter: [@Constellation](http://twitter.com/Constellation)) and other contributors.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n  * Redistributions of source code must retain the above copyright\n    notice, this list of conditions and the following disclaimer.\n\n  * Redistributions in binary form must reproduce the above copyright\n    notice, this list of conditions and the following disclaimer in the\n    documentation and/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\"\nAND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\nIMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE\nARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY\nDIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\nLOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\nON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\nTHIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\n#### source-map\n\nSourceNodeMocks has a limited interface of mozilla/source-map SourceNode implementations.\n\nCopyright (c) 2009-2011, Mozilla Foundation and contributors\nAll rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n* Redistributions of source code must retain the above copyright notice, this\n  list of conditions and the following disclaimer.\n\n* Redistributions in binary form must reproduce the above copyright notice,\n  this list of conditions and the following disclaimer in the documentation\n  and/or other materials provided with the distribution.\n\n* Neither the names of the Mozilla Foundation nor the names of project\n  contributors may be used to endorse or promote products derived from this\n  software without specific prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\" AND\nANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\nWARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\nFOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\nDAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\nCAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\nOR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n",
  "readmeFilename": "README.md",
  "bugs": {
    "url": "https://github.com/estools/escodegen/issues"
  },
  "_id": "escodegen@1.6.1",
  "dist": {
    "shasum": "36de133aa267ddf9ba875ff49e3cda4978d5bb7e"
  },
  "_from": "escodegen@1.6.1",
  "_resolved": "https://registry.npmjs.org/escodegen/-/escodegen-1.6.1.tgz"
}

},{}],87:[function(require,module,exports){
module.exports=require("./lib");


},{"./lib":89}],88:[function(require,module,exports){
function dot(e,t){t=t||{};for(var n=t.counter||0,r=t.source,a=[],o=e[2],l=0;l<o.length;l++){var p=o[l],s=p.label||p.type;if(!s&&r&&p.astNode.range){var u=p.astNode,c=u.range,d="";"SwitchCase"==u.type?u.test?(c=[c[0],u.test.range[1]],d=":"):(c=[c[0],c[0]],d="default:"):"ForInStatement"==u.type?(c=[c[0],u.right.range[1]],d=")"):"CatchClause"==u.type&&(c=[c[0],u.param.range[1]],d=")"),s=r.slice(c[0],c[1]).replace(/\n/g,"\\n").replace(/\t/g,"    ").replace(/"/g,'\\"')+d}!s&&p.astNode&&(s=p.astNode.type),a.push("n"+(n+l)+' [label="'+s+'"'),~["entry","exit"].indexOf(p.type)&&a.push(', style="rounded"'),a.push("]\n")}for(var l=0;l<o.length;l++){var p=o[l];["normal","true","false","exception"].forEach(function(e){var t=p[e];t&&(a.push("n"+(n+l)+" -> n"+(n+o.indexOf(t))+" ["),"exception"===e?a.push('color="red", label="exception"'):~["true","false"].indexOf(e)&&a.push('label="'+e+'"'),a.push("]\n"))})}return void 0!==t.counter&&(t.counter+=o.length),a.join("")}module.exports=dot;


},{}],89:[function(require,module,exports){
function ControlFlowGraph(t,e){function n(t){return p[p.length-1]}function i(t){!d&&s(t)&&t.cfg.connect(n(this),"exception")}function s(t){if("object"!=typeof t||"FunctionExpression"===t.type)return!1;if(t.type&&~throwTypes.indexOf(t.type))return!0;var e=t;return Object.keys(e).some(function(t){var n=e[t];return n instanceof Array?n.some(s):"object"==typeof n&&n?s(n):!1})}function c(t,e){for(var n=t.cfg.parent;!~e.indexOf(n.type)&&n.cfg.parent;)n=n.cfg.parent;return~e.indexOf(n.type)?n:null}function o(){i(this),this.cfg.connect(a(this))}function r(t){switch(t.type){case"BreakStatement":var e=c(t,breakTargets);return e?a(e):g;case"ContinueStatement":var e=c(t,continueTargets);switch(e.type){case"ForStatement":return e.update&&e.update.cfg||e.test&&e.test.cfg||r(e.body);case"ForInStatement":return e.cfg;case"DoWhileStatement":case"WhileStatement":return e.test.cfg}case"BlockStatement":case"Program":return t.body.length&&r(t.body[0])||a(t);case"DoWhileStatement":return r(t.body);case"EmptyStatement":return a(t);case"ForStatement":return t.init&&t.init.cfg||t.test&&t.test.cfg||r(t.body);case"FunctionDeclaration":return a(t);case"IfStatement":return t.test.cfg;case"SwitchStatement":return r(t.cases[0]);case"TryStatement":return r(t.block);case"WhileStatement":return t.test.cfg;default:return t.cfg}}function a(t){if(t.cfg.nextSibling)return t.cfg.nextSibling;var e=t.cfg.parent;if(!e)return g;switch(e.type){case"DoWhileStatement":return e.test.cfg;case"ForStatement":return e.update&&e.update.cfg||e.test&&e.test.cfg||r(e.body);case"ForInStatement":return e.cfg;case"TryStatement":return e.finalizer&&t!==e.finalizer&&r(e.finalizer)||a(e);case"SwitchCase":if(!e.cfg.nextSibling)return a(e);for(var n=e.cfg.nextSibling.astNode;!n.consequent.length&&n.cfg.nextSibling;)n=n.cfg.nextSibling.astNode;return n.consequent.length&&r(n.consequent[0])||a(e.parent);case"WhileStatement":return e.test.cfg;default:return a(e)}}function h(t){walker(t,{"default":function(){var t=l.length?l[l.length-1]:void 0;f(this,t),"FunctionDeclaration"==this.type||~this.type.indexOf("Expression")||(l.push(this),walker.checkProps.apply(this,arguments),l.pop())}})}function f(t,e){t.cfg||Object.defineProperty(t,"cfg",{value:new FlowNode(t,e),configurable:!0})}function u(t){function e(t,e){for(var n=t.length-1;n>=0;n--){var i=t[n];n<t.length-1&&(i.cfg.nextSibling=r(t[n+1])),e(i)}}function n(t){e(this.body,t)}walker(t,{BlockStatement:n,Program:n,FunctionDeclaration:function(){},FunctionExpression:function(){},SwitchCase:function(t){e(this.consequent,t)},SwitchStatement:function(t){e(this.cases,t)}})}e=e||{};var l=[],g=new FlowNode(void 0,void 0,"exit"),p=[g],d=!!e.omitExceptions;h(t),u(t),walker(t,{CatchClause:function(t){this.cfg.connect(r(this.body)),t(this.body)},DoWhileStatement:function(t){i(this.test),this.test.cfg.connect(r(this.body),"true").connect(a(this),"false"),t(this.body)},ExpressionStatement:o,FunctionDeclaration:function(){},ForStatement:function(t){this.test?(i(this.test),this.test.cfg.connect(r(this.body),"true").connect(a(this),"false"),this.update&&this.update.cfg.connect(this.test.cfg)):this.update&&this.update.cfg.connect(r(this.body)),this.update&&i(this.update),this.init&&(i(this.init),this.init.cfg.connect(this.test&&this.test.cfg||r(this.body))),t(this.body)},ForInStatement:function(t){i(this),this.cfg.connect(r(this.body),"true").connect(a(this),"false"),t(this.body)},IfStatement:function(t){t(this.consequent),i(this.test),this.test.cfg.connect(r(this.consequent),"true"),this.alternate?(t(this.alternate),this.test.cfg.connect(r(this.alternate),"false")):this.test.cfg.connect(a(this),"false")},ReturnStatement:function(){i(this),this.cfg.connect(g)},SwitchCase:function(t){if(this.test){for(var e=this;!e.consequent.length&&e.cfg.nextSibling;)e=e.cfg.nextSibling.astNode;this.cfg.connect(e.consequent.length&&r(e.consequent[0])||a(this.cfg.parent),"true"),this.cfg.connect(a(this),"false")}else this.cfg.connect(this.consequent.length&&r(this.consequent[0])||a(this.cfg.parent));this.consequent.forEach(t)},SwitchStatement:function(t){this.cfg.connect(this.cases[0].cfg),this.cases.forEach(t)},ThrowStatement:function(){this.cfg.connect(n(this),"exception")},TryStatement:function(t){var e=this.handlers[0]&&this.handlers[0].cfg||r(this.finalizer);p.push(e),t(this.block),p.pop(),this.handlers.length&&t(this.handlers[0]),this.finalizer&&t(this.finalizer)},VariableDeclaration:o,WhileStatement:function(t){i(this.test),this.test.cfg.connect(r(this.body),"true").connect(a(this),"false"),t(this.body)}});var S=new FlowNode(t,void 0,"entry");S.normal=r(t),walker(t,{"default":function(){this.cfg&&("ExpressionStatement"===this.type&&(this.cfg.astNode=this.expression),delete this.cfg,walker.checkProps.apply(this,arguments))}});for(var m=[],y=[S];y.length;){var b=y.pop();m.push(b),b.next=[],["exception","false","true","normal"].forEach(function(t){var e=b[t];e&&(~b.next.indexOf(e)||b.next.push(e),~e.prev.indexOf(b)||e.prev.push(b),~y.indexOf(e)||e.next||y.push(e))})}return[S,g,m]}function FlowNode(t,e,n){this.astNode=t,this.parent=e,this.type=n,this.prev=[]}var walker=require("walkes");module.exports=ControlFlowGraph,module.exports.dot=require("./dot"),FlowNode.prototype.connect=function(t,e){return this[e||"normal"]=t,this};var continueTargets=["ForStatement","ForInStatement","DoWhileStatement","WhileStatement"],breakTargets=continueTargets.concat(["SwitchStatement"]),throwTypes=["AssignmentExpression","BinaryExpression","CallExpression","MemberExpression","NewExpression","UnaryExpression"];


},{"./dot":88,"walkes":98}],90:[function(require,module,exports){
/*
  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
  Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwErrorTolerant: true,
throwError: true, generateStatement: true, peek: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseUnaryExpression: true,
parseStatement: true, parseSourceElement: true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        FnExprTokens,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        SyntaxTreeDelegate,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        delegate,
        lookahead,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8,
        RegularExpression: 9
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';
    TokenName[Token.RegularExpression] = 'RegularExpression';

    // A function following one of those tokens is an expression.
    FnExprTokens = ['(', '{', '[', 'in', 'typeof', 'instanceof', 'new',
                    'return', 'case', 'delete', 'throw', 'void',
                    // assignment operators
                    '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=',
                    '&=', '|=', '^=', ',',
                    // binary/unary operators
                    '+', '-', '*', '/', '%', '++', '--', '<<', '>>', '>>>', '&',
                    '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=',
                    '<=', '<', '>', '!=', '!=='];

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
        NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        /* istanbul ignore if */
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function isDecimalDigit(ch) {
        return (ch >= 48 && ch <= 57);   // 0..9
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
            (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
            (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
            (ch >= 0x61 && ch <= 0x7A) ||         // a..z
            (ch === 0x5C) ||                      // \ (backslash)
            ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
    }

    function isIdentifierPart(ch) {
        return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
            (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
            (ch >= 0x61 && ch <= 0x7A) ||         // a..z
            (ch >= 0x30 && ch <= 0x39) ||         // 0..9
            (ch === 0x5C) ||                      // \ (backslash)
            ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        default:
            return false;
        }
    }

    function isStrictModeReservedWord(id) {
        switch (id) {
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        default:
            return false;
        }
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        // 'const' is specialized as Keyword in V8.
        // 'yield' and 'let' are for compatiblity with SpiderMonkey and ES.next.
        // Some others are from future reserved words.

        switch (id.length) {
        case 2:
            return (id === 'if') || (id === 'in') || (id === 'do');
        case 3:
            return (id === 'var') || (id === 'for') || (id === 'new') ||
                (id === 'try') || (id === 'let');
        case 4:
            return (id === 'this') || (id === 'else') || (id === 'case') ||
                (id === 'void') || (id === 'with') || (id === 'enum');
        case 5:
            return (id === 'while') || (id === 'break') || (id === 'catch') ||
                (id === 'throw') || (id === 'const') || (id === 'yield') ||
                (id === 'class') || (id === 'super');
        case 6:
            return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
                (id === 'switch') || (id === 'export') || (id === 'import');
        case 7:
            return (id === 'default') || (id === 'finally') || (id === 'extends');
        case 8:
            return (id === 'function') || (id === 'continue') || (id === 'debugger');
        case 10:
            return (id === 'instanceof');
        default:
            return false;
        }
    }

    // 7.4 Comments

    function addComment(type, value, start, end, loc) {
        var comment, attacher;

        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (state.lastCommentStart >= start) {
            return;
        }
        state.lastCommentStart = start;

        comment = {
            type: type,
            value: value
        };
        if (extra.range) {
            comment.range = [start, end];
        }
        if (extra.loc) {
            comment.loc = loc;
        }
        extra.comments.push(comment);
        if (extra.attachComment) {
            extra.leadingComments.push(comment);
            extra.trailingComments.push(comment);
        }
    }

    function skipSingleLineComment(offset) {
        var start, loc, ch, comment;

        start = index - offset;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart - offset
            }
        };

        while (index < length) {
            ch = source.charCodeAt(index);
            ++index;
            if (isLineTerminator(ch)) {
                if (extra.comments) {
                    comment = source.slice(start + offset, index - 1);
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    addComment('Line', comment, start, index - 1, loc);
                }
                if (ch === 13 && source.charCodeAt(index) === 10) {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
                return;
            }
        }

        if (extra.comments) {
            comment = source.slice(start + offset, index);
            loc.end = {
                line: lineNumber,
                column: index - lineStart
            };
            addComment('Line', comment, start, index, loc);
        }
    }

    function skipMultiLineComment() {
        var start, loc, ch, comment;

        if (extra.comments) {
            start = index - 2;
            loc = {
                start: {
                    line: lineNumber,
                    column: index - lineStart - 2
                }
            };
        }

        while (index < length) {
            ch = source.charCodeAt(index);
            if (isLineTerminator(ch)) {
                if (ch === 0x0D && source.charCodeAt(index + 1) === 0x0A) {
                    ++index;
                }
                ++lineNumber;
                ++index;
                lineStart = index;
                if (index >= length) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            } else if (ch === 0x2A) {
                // Block comment ends with '*/'.
                if (source.charCodeAt(index + 1) === 0x2F) {
                    ++index;
                    ++index;
                    if (extra.comments) {
                        comment = source.slice(start + 2, index - 2);
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        addComment('Block', comment, start, index, loc);
                    }
                    return;
                }
                ++index;
            } else {
                ++index;
            }
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    function skipComment() {
        var ch, start;

        start = (index === 0);
        while (index < length) {
            ch = source.charCodeAt(index);

            if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
                start = true;
            } else if (ch === 0x2F) { // U+002F is '/'
                ch = source.charCodeAt(index + 1);
                if (ch === 0x2F) {
                    ++index;
                    ++index;
                    skipSingleLineComment(2);
                    start = true;
                } else if (ch === 0x2A) {  // U+002A is '*'
                    ++index;
                    ++index;
                    skipMultiLineComment();
                } else {
                    break;
                }
            } else if (start && ch === 0x2D) { // U+002D is '-'
                // U+003E is '>'
                if ((source.charCodeAt(index + 1) === 0x2D) && (source.charCodeAt(index + 2) === 0x3E)) {
                    // '-->' is a single-line comment
                    index += 3;
                    skipSingleLineComment(3);
                } else {
                    break;
                }
            } else if (ch === 0x3C) { // U+003C is '<'
                if (source.slice(index + 1, index + 4) === '!--') {
                    ++index; // `<`
                    ++index; // `!`
                    ++index; // `-`
                    ++index; // `-`
                    skipSingleLineComment(4);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function getEscapedIdentifier() {
        var ch, id;

        ch = source.charCodeAt(index++);
        id = String.fromCharCode(ch);

        // '\u' (U+005C, U+0075) denotes an escaped character.
        if (ch === 0x5C) {
            if (source.charCodeAt(index) !== 0x75) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            ++index;
            ch = scanHexEscape('u');
            if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            id = ch;
        }

        while (index < length) {
            ch = source.charCodeAt(index);
            if (!isIdentifierPart(ch)) {
                break;
            }
            ++index;
            id += String.fromCharCode(ch);

            // '\u' (U+005C, U+0075) denotes an escaped character.
            if (ch === 0x5C) {
                id = id.substr(0, id.length - 1);
                if (source.charCodeAt(index) !== 0x75) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
                ++index;
                ch = scanHexEscape('u');
                if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
                id += ch;
            }
        }

        return id;
    }

    function getIdentifier() {
        var start, ch;

        start = index++;
        while (index < length) {
            ch = source.charCodeAt(index);
            if (ch === 0x5C) {
                // Blackslash (U+005C) marks Unicode escape sequence.
                index = start;
                return getEscapedIdentifier();
            }
            if (isIdentifierPart(ch)) {
                ++index;
            } else {
                break;
            }
        }

        return source.slice(start, index);
    }

    function scanIdentifier() {
        var start, id, type;

        start = index;

        // Backslash (U+005C) starts an escaped character.
        id = (source.charCodeAt(index) === 0x5C) ? getEscapedIdentifier() : getIdentifier();

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            type = Token.Identifier;
        } else if (isKeyword(id)) {
            type = Token.Keyword;
        } else if (id === 'null') {
            type = Token.NullLiteral;
        } else if (id === 'true' || id === 'false') {
            type = Token.BooleanLiteral;
        } else {
            type = Token.Identifier;
        }

        return {
            type: type,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }


    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            code = source.charCodeAt(index),
            code2,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        switch (code) {

        // Check for most common single-character punctuators.
        case 0x2E:  // . dot
        case 0x28:  // ( open bracket
        case 0x29:  // ) close bracket
        case 0x3B:  // ; semicolon
        case 0x2C:  // , comma
        case 0x7B:  // { open curly brace
        case 0x7D:  // } close curly brace
        case 0x5B:  // [
        case 0x5D:  // ]
        case 0x3A:  // :
        case 0x3F:  // ?
        case 0x7E:  // ~
            ++index;
            if (extra.tokenize) {
                if (code === 0x28) {
                    extra.openParenToken = extra.tokens.length;
                } else if (code === 0x7B) {
                    extra.openCurlyToken = extra.tokens.length;
                }
            }
            return {
                type: Token.Punctuator,
                value: String.fromCharCode(code),
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };

        default:
            code2 = source.charCodeAt(index + 1);

            // '=' (U+003D) marks an assignment or comparison operator.
            if (code2 === 0x3D) {
                switch (code) {
                case 0x2B:  // +
                case 0x2D:  // -
                case 0x2F:  // /
                case 0x3C:  // <
                case 0x3E:  // >
                case 0x5E:  // ^
                case 0x7C:  // |
                case 0x25:  // %
                case 0x26:  // &
                case 0x2A:  // *
                    index += 2;
                    return {
                        type: Token.Punctuator,
                        value: String.fromCharCode(code) + String.fromCharCode(code2),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        start: start,
                        end: index
                    };

                case 0x21: // !
                case 0x3D: // =
                    index += 2;

                    // !== and ===
                    if (source.charCodeAt(index) === 0x3D) {
                        ++index;
                    }
                    return {
                        type: Token.Punctuator,
                        value: source.slice(start, index),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        start: start,
                        end: index
                    };
                }
            }
        }

        // 4-character punctuator: >>>=

        ch4 = source.substr(index, 4);

        if (ch4 === '>>>=') {
            index += 4;
            return {
                type: Token.Punctuator,
                value: ch4,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        // 3-character punctuators: === !== >>> <<= >>=

        ch3 = ch4.substr(0, 3);

        if (ch3 === '>>>' || ch3 === '<<=' || ch3 === '>>=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: ch3,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        // Other 2-character punctuators: ++ -- << >> && ||
        ch2 = ch3.substr(0, 2);

        if ((ch1 === ch2[1] && ('+-<>&|'.indexOf(ch1) >= 0)) || ch2 === '=>') {
            index += 2;
            return {
                type: Token.Punctuator,
                value: ch2,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        // 1-character punctuators: < > = ! + - * % & | ^ /
        if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    // 7.8.3 Numeric Literals

    function scanHexLiteral(start) {
        var number = '';

        while (index < length) {
            if (!isHexDigit(source[index])) {
                break;
            }
            number += source[index++];
        }

        if (number.length === 0) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        if (isIdentifierStart(source.charCodeAt(index))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt('0x' + number, 16),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function scanOctalLiteral(start) {
        var number = '0' + source[index++];
        while (index < length) {
            if (!isOctalDigit(source[index])) {
                break;
            }
            number += source[index++];
        }

        if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt(number, 8),
            octal: true,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function isImplicitOctalLiteral() {
        var i, ch;

        // Implicit octal, unless there is a non-octal digit.
        // (Annex B.1.1 on Numeric Literals)
        for (i = index + 1; i < length; ++i) {
            ch = source[i];
            if (ch === '8' || ch === '9') {
                return false;
            }
            if (!isOctalDigit(ch)) {
                return true;
            }
        }

        return true;
    }

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    ++index;
                    return scanHexLiteral(start);
                }
                if (isOctalDigit(ch)) {
                    if (isImplicitOctalLiteral()) {
                        return scanOctalLiteral(start);
                    }
                }
            }

            while (isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
            }
            ch = source[index];
        }

        if (ch === '.') {
            number += source[index++];
            while (isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
            }
            ch = source[index];
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }
            if (isDecimalDigit(source.charCodeAt(index))) {
                while (isDecimalDigit(source.charCodeAt(index))) {
                    number += source[index++];
                }
            } else {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (isIdentifierStart(source.charCodeAt(index))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false, startLineNumber, startLineStart;
        startLineNumber = lineNumber;
        startLineStart = lineStart;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
                    switch (ch) {
                    case 'u':
                    case 'x':
                        restore = index;
                        unescaped = scanHexEscape(ch);
                        if (unescaped) {
                            str += unescaped;
                        } else {
                            index = restore;
                            str += ch;
                        }
                        break;
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\x0B';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++]);

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                    lineStart = index;
                }
            } else if (isLineTerminator(ch.charCodeAt(0))) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            startLineNumber: startLineNumber,
            startLineStart: startLineStart,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function testRegExp(pattern, flags) {
        var value;
        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }
        return value;
    }

    function scanRegExpBody() {
        var ch, str, classMarker, terminated, body;

        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        classMarker = false;
        terminated = false;
        while (index < length) {
            ch = source[index++];
            str += ch;
            if (ch === '\\') {
                ch = source[index++];
                // ECMA-262 7.8.5
                if (isLineTerminator(ch.charCodeAt(0))) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
                str += ch;
            } else if (isLineTerminator(ch.charCodeAt(0))) {
                throwError({}, Messages.UnterminatedRegExp);
            } else if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        body = str.substr(1, str.length - 2);
        return {
            value: body,
            literal: str
        };
    }

    function scanRegExpFlags() {
        var ch, str, flags, restore;

        str = '';
        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch.charCodeAt(0))) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        for (str += '\\u'; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                    throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
                } else {
                    str += '\\';
                    throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        return {
            value: flags,
            literal: str
        };
    }

    function scanRegExp() {
        var start, body, flags, pattern, value;

        lookahead = null;
        skipComment();
        start = index;

        body = scanRegExpBody();
        flags = scanRegExpFlags();
        value = testRegExp(body.value, flags.value);

        if (extra.tokenize) {
            return {
                type: Token.RegularExpression,
                value: value,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        return {
            literal: body.literal + flags.literal,
            value: value,
            start: start,
            end: index
        };
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        /* istanbul ignore next */
        if (!extra.tokenize) {
            // Pop the previous token, which is likely '/' or '/='
            if (extra.tokens.length > 0) {
                token = extra.tokens[extra.tokens.length - 1];
                if (token.range[0] === pos && token.type === 'Punctuator') {
                    if (token.value === '/' || token.value === '/=') {
                        extra.tokens.pop();
                    }
                }
            }

            extra.tokens.push({
                type: 'RegularExpression',
                value: regex.literal,
                range: [pos, index],
                loc: loc
            });
        }

        return regex;
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advanceSlash() {
        var prevToken,
            checkToken;
        // Using the following algorithm:
        // https://github.com/mozilla/sweet.js/wiki/design
        prevToken = extra.tokens[extra.tokens.length - 1];
        if (!prevToken) {
            // Nothing before that: it cannot be a division.
            return collectRegex();
        }
        if (prevToken.type === 'Punctuator') {
            if (prevToken.value === ']') {
                return scanPunctuator();
            }
            if (prevToken.value === ')') {
                checkToken = extra.tokens[extra.openParenToken - 1];
                if (checkToken &&
                        checkToken.type === 'Keyword' &&
                        (checkToken.value === 'if' ||
                         checkToken.value === 'while' ||
                         checkToken.value === 'for' ||
                         checkToken.value === 'with')) {
                    return collectRegex();
                }
                return scanPunctuator();
            }
            if (prevToken.value === '}') {
                // Dividing a function by anything makes little sense,
                // but we have to check for that.
                if (extra.tokens[extra.openCurlyToken - 3] &&
                        extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
                    // Anonymous function.
                    checkToken = extra.tokens[extra.openCurlyToken - 4];
                    if (!checkToken) {
                        return scanPunctuator();
                    }
                } else if (extra.tokens[extra.openCurlyToken - 4] &&
                        extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
                    // Named function.
                    checkToken = extra.tokens[extra.openCurlyToken - 5];
                    if (!checkToken) {
                        return collectRegex();
                    }
                } else {
                    return scanPunctuator();
                }
                // checkToken determines whether the function is
                // a declaration or an expression.
                if (FnExprTokens.indexOf(checkToken.value) >= 0) {
                    // It is an expression.
                    return scanPunctuator();
                }
                // It is a declaration.
                return collectRegex();
            }
            return collectRegex();
        }
        if (prevToken.type === 'Keyword' && prevToken.value !== 'this') {
            return collectRegex();
        }
        return scanPunctuator();
    }

    function advance() {
        var ch;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: index,
                end: index
            };
        }

        ch = source.charCodeAt(index);

        if (isIdentifierStart(ch)) {
            return scanIdentifier();
        }

        // Very common: ( and ) and ;
        if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
            return scanPunctuator();
        }

        // String literal starts with single quote (U+0027) or double quote (U+0022).
        if (ch === 0x27 || ch === 0x22) {
            return scanStringLiteral();
        }


        // Dot (.) U+002E can also start a floating-point number, hence the need
        // to check the next character.
        if (ch === 0x2E) {
            if (isDecimalDigit(source.charCodeAt(index + 1))) {
                return scanNumericLiteral();
            }
            return scanPunctuator();
        }

        if (isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        // Slash (/) U+002F can also start a regex.
        if (extra.tokenize && ch === 0x2F) {
            return advanceSlash();
        }

        return scanPunctuator();
    }

    function collectToken() {
        var loc, token, range, value;

        skipComment();
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            value = source.slice(token.start, token.end);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: [token.start, token.end],
                loc: loc
            });
        }

        return token;
    }

    function lex() {
        var token;

        token = lookahead;
        index = token.end;
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;

        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();

        index = token.end;
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;

        return token;
    }

    function peek() {
        var pos, line, start;

        pos = index;
        line = lineNumber;
        start = lineStart;
        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
        index = pos;
        lineNumber = line;
        lineStart = start;
    }

    function Position(line, column) {
        this.line = line;
        this.column = column;
    }

    function SourceLocation(startLine, startColumn, line, column) {
        this.start = new Position(startLine, startColumn);
        this.end = new Position(line, column);
    }

    SyntaxTreeDelegate = {

        name: 'SyntaxTree',

        processComment: function (node) {
            var lastChild, trailingComments;

            if (node.type === Syntax.Program) {
                if (node.body.length > 0) {
                    return;
                }
            }

            if (extra.trailingComments.length > 0) {
                if (extra.trailingComments[0].range[0] >= node.range[1]) {
                    trailingComments = extra.trailingComments;
                    extra.trailingComments = [];
                } else {
                    extra.trailingComments.length = 0;
                }
            } else {
                if (extra.bottomRightStack.length > 0 &&
                        extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments &&
                        extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments[0].range[0] >= node.range[1]) {
                    trailingComments = extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
                    delete extra.bottomRightStack[extra.bottomRightStack.length - 1].trailingComments;
                }
            }

            // Eating the stack.
            while (extra.bottomRightStack.length > 0 && extra.bottomRightStack[extra.bottomRightStack.length - 1].range[0] >= node.range[0]) {
                lastChild = extra.bottomRightStack.pop();
            }

            if (lastChild) {
                if (lastChild.leadingComments && lastChild.leadingComments[lastChild.leadingComments.length - 1].range[1] <= node.range[0]) {
                    node.leadingComments = lastChild.leadingComments;
                    delete lastChild.leadingComments;
                }
            } else if (extra.leadingComments.length > 0 && extra.leadingComments[extra.leadingComments.length - 1].range[1] <= node.range[0]) {
                node.leadingComments = extra.leadingComments;
                extra.leadingComments = [];
            }


            if (trailingComments) {
                node.trailingComments = trailingComments;
            }

            extra.bottomRightStack.push(node);
        },

        markEnd: function (node, startToken) {
            if (extra.range) {
                node.range = [startToken.start, index];
            }
            if (extra.loc) {
                node.loc = new SourceLocation(
                    startToken.startLineNumber === undefined ?  startToken.lineNumber : startToken.startLineNumber,
                    startToken.start - (startToken.startLineStart === undefined ?  startToken.lineStart : startToken.startLineStart),
                    lineNumber,
                    index - lineStart
                );
                this.postProcess(node);
            }

            if (extra.attachComment) {
                this.processComment(node);
            }
            return node;
        },

        postProcess: function (node) {
            if (extra.source) {
                node.loc.source = extra.source;
            }
            return node;
        },

        createArrayExpression: function (elements) {
            return {
                type: Syntax.ArrayExpression,
                elements: elements
            };
        },

        createAssignmentExpression: function (operator, left, right) {
            return {
                type: Syntax.AssignmentExpression,
                operator: operator,
                left: left,
                right: right
            };
        },

        createBinaryExpression: function (operator, left, right) {
            var type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression :
                        Syntax.BinaryExpression;
            return {
                type: type,
                operator: operator,
                left: left,
                right: right
            };
        },

        createBlockStatement: function (body) {
            return {
                type: Syntax.BlockStatement,
                body: body
            };
        },

        createBreakStatement: function (label) {
            return {
                type: Syntax.BreakStatement,
                label: label
            };
        },

        createCallExpression: function (callee, args) {
            return {
                type: Syntax.CallExpression,
                callee: callee,
                'arguments': args
            };
        },

        createCatchClause: function (param, body) {
            return {
                type: Syntax.CatchClause,
                param: param,
                body: body
            };
        },

        createConditionalExpression: function (test, consequent, alternate) {
            return {
                type: Syntax.ConditionalExpression,
                test: test,
                consequent: consequent,
                alternate: alternate
            };
        },

        createContinueStatement: function (label) {
            return {
                type: Syntax.ContinueStatement,
                label: label
            };
        },

        createDebuggerStatement: function () {
            return {
                type: Syntax.DebuggerStatement
            };
        },

        createDoWhileStatement: function (body, test) {
            return {
                type: Syntax.DoWhileStatement,
                body: body,
                test: test
            };
        },

        createEmptyStatement: function () {
            return {
                type: Syntax.EmptyStatement
            };
        },

        createExpressionStatement: function (expression) {
            return {
                type: Syntax.ExpressionStatement,
                expression: expression
            };
        },

        createForStatement: function (init, test, update, body) {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        },

        createForInStatement: function (left, right, body) {
            return {
                type: Syntax.ForInStatement,
                left: left,
                right: right,
                body: body,
                each: false
            };
        },

        createFunctionDeclaration: function (id, params, defaults, body) {
            return {
                type: Syntax.FunctionDeclaration,
                id: id,
                params: params,
                defaults: defaults,
                body: body,
                rest: null,
                generator: false,
                expression: false
            };
        },

        createFunctionExpression: function (id, params, defaults, body) {
            return {
                type: Syntax.FunctionExpression,
                id: id,
                params: params,
                defaults: defaults,
                body: body,
                rest: null,
                generator: false,
                expression: false
            };
        },

        createIdentifier: function (name) {
            return {
                type: Syntax.Identifier,
                name: name
            };
        },

        createIfStatement: function (test, consequent, alternate) {
            return {
                type: Syntax.IfStatement,
                test: test,
                consequent: consequent,
                alternate: alternate
            };
        },

        createLabeledStatement: function (label, body) {
            return {
                type: Syntax.LabeledStatement,
                label: label,
                body: body
            };
        },

        createLiteral: function (token) {
            return {
                type: Syntax.Literal,
                value: token.value,
                raw: source.slice(token.start, token.end)
            };
        },

        createMemberExpression: function (accessor, object, property) {
            return {
                type: Syntax.MemberExpression,
                computed: accessor === '[',
                object: object,
                property: property
            };
        },

        createNewExpression: function (callee, args) {
            return {
                type: Syntax.NewExpression,
                callee: callee,
                'arguments': args
            };
        },

        createObjectExpression: function (properties) {
            return {
                type: Syntax.ObjectExpression,
                properties: properties
            };
        },

        createPostfixExpression: function (operator, argument) {
            return {
                type: Syntax.UpdateExpression,
                operator: operator,
                argument: argument,
                prefix: false
            };
        },

        createProgram: function (body) {
            return {
                type: Syntax.Program,
                body: body
            };
        },

        createProperty: function (kind, key, value) {
            return {
                type: Syntax.Property,
                key: key,
                value: value,
                kind: kind
            };
        },

        createReturnStatement: function (argument) {
            return {
                type: Syntax.ReturnStatement,
                argument: argument
            };
        },

        createSequenceExpression: function (expressions) {
            return {
                type: Syntax.SequenceExpression,
                expressions: expressions
            };
        },

        createSwitchCase: function (test, consequent) {
            return {
                type: Syntax.SwitchCase,
                test: test,
                consequent: consequent
            };
        },

        createSwitchStatement: function (discriminant, cases) {
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant,
                cases: cases
            };
        },

        createThisExpression: function () {
            return {
                type: Syntax.ThisExpression
            };
        },

        createThrowStatement: function (argument) {
            return {
                type: Syntax.ThrowStatement,
                argument: argument
            };
        },

        createTryStatement: function (block, guardedHandlers, handlers, finalizer) {
            return {
                type: Syntax.TryStatement,
                block: block,
                guardedHandlers: guardedHandlers,
                handlers: handlers,
                finalizer: finalizer
            };
        },

        createUnaryExpression: function (operator, argument) {
            if (operator === '++' || operator === '--') {
                return {
                    type: Syntax.UpdateExpression,
                    operator: operator,
                    argument: argument,
                    prefix: true
                };
            }
            return {
                type: Syntax.UnaryExpression,
                operator: operator,
                argument: argument,
                prefix: true
            };
        },

        createVariableDeclaration: function (declarations, kind) {
            return {
                type: Syntax.VariableDeclaration,
                declarations: declarations,
                kind: kind
            };
        },

        createVariableDeclarator: function (id, init) {
            return {
                type: Syntax.VariableDeclarator,
                id: id,
                init: init
            };
        },

        createWhileStatement: function (test, body) {
            return {
                type: Syntax.WhileStatement,
                test: test,
                body: body
            };
        },

        createWithStatement: function (object, body) {
            return {
                type: Syntax.WithStatement,
                object: object,
                body: body
            };
        }
    };

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    assert(index < args.length, 'Message reference must be in range');
                    return args[index];
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.start;
            error.lineNumber = token.lineNumber;
            error.column = token.start - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        error.description = msg;
        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        return lookahead.type === Token.Punctuator && lookahead.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        return lookahead.type === Token.Keyword && lookahead.value === keyword;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var op;

        if (lookahead.type !== Token.Punctuator) {
            return false;
        }
        op = lookahead.value;
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var line, oldIndex = index, oldLineNumber = lineNumber,
            oldLineStart = lineStart, oldLookahead = lookahead;

        // Catch the very common case first: immediately a semicolon (U+003B).
        if (source.charCodeAt(index) === 0x3B || match(';')) {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            index = oldIndex;
            lineNumber = oldLineNumber;
            lineStart = oldLineStart;
            lookahead = oldLookahead;
            return;
        }

        if (lookahead.type !== Token.EOF && !match('}')) {
            throwUnexpected(lookahead);
        }
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [], startToken;

        startToken = lookahead;
        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        lex();

        return delegate.markEnd(delegate.createArrayExpression(elements), startToken);
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(param, first) {
        var previousStrict, body, startToken;

        previousStrict = strict;
        startToken = lookahead;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            throwErrorTolerant(first, Messages.StrictParamName);
        }
        strict = previousStrict;
        return delegate.markEnd(delegate.createFunctionExpression(null, param, [], body), startToken);
    }

    function parseObjectPropertyKey() {
        var token, startToken;

        startToken = lookahead;
        token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return delegate.markEnd(delegate.createLiteral(token), startToken);
        }

        return delegate.markEnd(delegate.createIdentifier(token.value), startToken);
    }

    function parseObjectProperty() {
        var token, key, id, value, param, startToken;

        token = lookahead;
        startToken = lookahead;

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                value = parsePropertyFunction([]);
                return delegate.markEnd(delegate.createProperty('get', key, value), startToken);
            }
            if (token.value === 'set' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead;
                if (token.type !== Token.Identifier) {
                    expect(')');
                    throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                    value = parsePropertyFunction([]);
                } else {
                    param = [ parseVariableIdentifier() ];
                    expect(')');
                    value = parsePropertyFunction(param, token);
                }
                return delegate.markEnd(delegate.createProperty('set', key, value), startToken);
            }
            expect(':');
            value = parseAssignmentExpression();
            return delegate.markEnd(delegate.createProperty('init', id, value), startToken);
        }
        if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpected(token);
        } else {
            key = parseObjectPropertyKey();
            expect(':');
            value = parseAssignmentExpression();
            return delegate.markEnd(delegate.createProperty('init', key, value), startToken);
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, key, kind, map = {}, toString = String, startToken;

        startToken = lookahead;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;

            key = '$' + name;
            if (Object.prototype.hasOwnProperty.call(map, key)) {
                if (map[key] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[key] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[key] |= kind;
            } else {
                map[key] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return delegate.markEnd(delegate.createObjectExpression(properties), startToken);
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        expr = parseExpression();

        expect(')');

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var type, token, expr, startToken;

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        type = lookahead.type;
        startToken = lookahead;

        if (type === Token.Identifier) {
            expr =  delegate.createIdentifier(lex().value);
        } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && lookahead.octal) {
                throwErrorTolerant(lookahead, Messages.StrictOctalLiteral);
            }
            expr = delegate.createLiteral(lex());
        } else if (type === Token.Keyword) {
            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
            if (matchKeyword('this')) {
                lex();
                expr = delegate.createThisExpression();
            } else {
                throwUnexpected(lex());
            }
        } else if (type === Token.BooleanLiteral) {
            token = lex();
            token.value = (token.value === 'true');
            expr = delegate.createLiteral(token);
        } else if (type === Token.NullLiteral) {
            token = lex();
            token.value = null;
            expr = delegate.createLiteral(token);
        } else if (match('/') || match('/=')) {
            if (typeof extra.tokens !== 'undefined') {
                expr = delegate.createLiteral(collectRegex());
            } else {
                expr = delegate.createLiteral(scanRegExp());
            }
            peek();
        } else {
            throwUnexpected(lex());
        }

        return delegate.markEnd(expr, startToken);
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token, startToken;

        startToken = lookahead;
        token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        return delegate.markEnd(delegate.createIdentifier(token.value), startToken);
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var callee, args, startToken;

        startToken = lookahead;
        expectKeyword('new');
        callee = parseLeftHandSideExpression();
        args = match('(') ? parseArguments() : [];

        return delegate.markEnd(delegate.createNewExpression(callee, args), startToken);
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr, args, property, startToken, previousAllowIn = state.allowIn;

        startToken = lookahead;
        state.allowIn = true;
        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        for (;;) {
            if (match('.')) {
                property = parseNonComputedMember();
                expr = delegate.createMemberExpression('.', expr, property);
            } else if (match('(')) {
                args = parseArguments();
                expr = delegate.createCallExpression(expr, args);
            } else if (match('[')) {
                property = parseComputedMember();
                expr = delegate.createMemberExpression('[', expr, property);
            } else {
                break;
            }
            delegate.markEnd(expr, startToken);
        }
        state.allowIn = previousAllowIn;

        return expr;
    }

    function parseLeftHandSideExpression() {
        var expr, property, startToken;
        assert(state.allowIn, 'callee of new expression always allow in keyword.');

        startToken = lookahead;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                property = parseComputedMember();
                expr = delegate.createMemberExpression('[', expr, property);
            } else {
                property = parseNonComputedMember();
                expr = delegate.createMemberExpression('.', expr, property);
            }
            delegate.markEnd(expr, startToken);
        }
        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr, token, startToken = lookahead;

        expr = parseLeftHandSideExpressionAllowCall();

        if (lookahead.type === Token.Punctuator) {
            if ((match('++') || match('--')) && !peekLineTerminator()) {
                // 11.3.1, 11.3.2
                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                    throwErrorTolerant({}, Messages.StrictLHSPostfix);
                }

                if (!isLeftHandSide(expr)) {
                    throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                }

                token = lex();
                expr = delegate.markEnd(delegate.createPostfixExpression(token.value, expr), startToken);
            }
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr, startToken;

        if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
            expr = parsePostfixExpression();
        } else if (match('++') || match('--')) {
            startToken = lookahead;
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            expr = delegate.createUnaryExpression(token.value, expr);
            expr = delegate.markEnd(expr, startToken);
        } else if (match('+') || match('-') || match('~') || match('!')) {
            startToken = lookahead;
            token = lex();
            expr = parseUnaryExpression();
            expr = delegate.createUnaryExpression(token.value, expr);
            expr = delegate.markEnd(expr, startToken);
        } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            startToken = lookahead;
            token = lex();
            expr = parseUnaryExpression();
            expr = delegate.createUnaryExpression(token.value, expr);
            expr = delegate.markEnd(expr, startToken);
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
        } else {
            expr = parsePostfixExpression();
        }

        return expr;
    }

    function binaryPrecedence(token, allowIn) {
        var prec = 0;

        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return 0;
        }

        switch (token.value) {
        case '||':
            prec = 1;
            break;

        case '&&':
            prec = 2;
            break;

        case '|':
            prec = 3;
            break;

        case '^':
            prec = 4;
            break;

        case '&':
            prec = 5;
            break;

        case '==':
        case '!=':
        case '===':
        case '!==':
            prec = 6;
            break;

        case '<':
        case '>':
        case '<=':
        case '>=':
        case 'instanceof':
            prec = 7;
            break;

        case 'in':
            prec = allowIn ? 7 : 0;
            break;

        case '<<':
        case '>>':
        case '>>>':
            prec = 8;
            break;

        case '+':
        case '-':
            prec = 9;
            break;

        case '*':
        case '/':
        case '%':
            prec = 11;
            break;

        default:
            break;
        }

        return prec;
    }

    // 11.5 Multiplicative Operators
    // 11.6 Additive Operators
    // 11.7 Bitwise Shift Operators
    // 11.8 Relational Operators
    // 11.9 Equality Operators
    // 11.10 Binary Bitwise Operators
    // 11.11 Binary Logical Operators

    function parseBinaryExpression() {
        var marker, markers, expr, token, prec, stack, right, operator, left, i;

        marker = lookahead;
        left = parseUnaryExpression();

        token = lookahead;
        prec = binaryPrecedence(token, state.allowIn);
        if (prec === 0) {
            return left;
        }
        token.prec = prec;
        lex();

        markers = [marker, lookahead];
        right = parseUnaryExpression();

        stack = [left, token, right];

        while ((prec = binaryPrecedence(lookahead, state.allowIn)) > 0) {

            // Reduce: make a binary expression from the three topmost entries.
            while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
                right = stack.pop();
                operator = stack.pop().value;
                left = stack.pop();
                expr = delegate.createBinaryExpression(operator, left, right);
                markers.pop();
                marker = markers[markers.length - 1];
                delegate.markEnd(expr, marker);
                stack.push(expr);
            }

            // Shift.
            token = lex();
            token.prec = prec;
            stack.push(token);
            markers.push(lookahead);
            expr = parseUnaryExpression();
            stack.push(expr);
        }

        // Final reduce to clean-up the stack.
        i = stack.length - 1;
        expr = stack[i];
        markers.pop();
        while (i > 1) {
            expr = delegate.createBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
            i -= 2;
            marker = markers.pop();
            delegate.markEnd(expr, marker);
        }

        return expr;
    }


    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent, alternate, startToken;

        startToken = lookahead;

        expr = parseBinaryExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');
            alternate = parseAssignmentExpression();

            expr = delegate.createConditionalExpression(expr, consequent, alternate);
            delegate.markEnd(expr, startToken);
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function parseAssignmentExpression() {
        var token, left, right, node, startToken;

        token = lookahead;
        startToken = lookahead;

        node = left = parseConditionalExpression();

        if (matchAssign()) {
            // LeftHandSideExpression
            if (!isLeftHandSide(left)) {
                throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
            }

            // 11.13.1
            if (strict && left.type === Syntax.Identifier && isRestrictedWord(left.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            token = lex();
            right = parseAssignmentExpression();
            node = delegate.markEnd(delegate.createAssignmentExpression(token.value, left, right), startToken);
        }

        return node;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr, startToken = lookahead;

        expr = parseAssignmentExpression();

        if (match(',')) {
            expr = delegate.createSequenceExpression([ expr ]);

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expr.expressions.push(parseAssignmentExpression());
            }

            delegate.markEnd(expr, startToken);
        }

        return expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block, startToken;

        startToken = lookahead;
        expect('{');

        block = parseStatementList();

        expect('}');

        return delegate.markEnd(delegate.createBlockStatement(block), startToken);
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token, startToken;

        startToken = lookahead;
        token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return delegate.markEnd(delegate.createIdentifier(token.value), startToken);
    }

    function parseVariableDeclaration(kind) {
        var init = null, id, startToken;

        startToken = lookahead;
        id = parseVariableIdentifier();

        // 12.2.1
        if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return delegate.markEnd(delegate.createVariableDeclarator(id, init), startToken);
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return delegate.createVariableDeclaration(declarations, 'var');
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations, startToken;

        startToken = lookahead;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return delegate.markEnd(delegate.createVariableDeclaration(declarations, kind), startToken);
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');
        return delegate.createEmptyStatement();
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();
        consumeSemicolon();
        return delegate.createExpressionStatement(expr);
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return delegate.createIfStatement(test, consequent, alternate);
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return delegate.createDoWhileStatement(body, test);
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return delegate.createWhileStatement(test, body);
    }

    function parseForVariableDeclaration() {
        var token, declarations, startToken;

        startToken = lookahead;
        token = lex();
        declarations = parseVariableDeclarationList();

        return delegate.markEnd(delegate.createVariableDeclaration(declarations, token.value), startToken);
    }

    function parseForStatement() {
        var init, test, update, left, right, body, oldInIteration, previousAllowIn = state.allowIn;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = previousAllowIn;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = previousAllowIn;

                if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isLeftHandSide(init)) {
                        throwErrorTolerant({}, Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return (typeof left === 'undefined') ?
                delegate.createForStatement(init, test, update, body) :
                delegate.createForInStatement(left, right, body);
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var label = null, key;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source.charCodeAt(index) === 0x3B) {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return delegate.createContinueStatement(null);
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return delegate.createContinueStatement(null);
        }

        if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();

            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return delegate.createContinueStatement(label);
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var label = null, key;

        expectKeyword('break');

        // Catch the very common case first: immediately a semicolon (U+003B).
        if (source.charCodeAt(index) === 0x3B) {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return delegate.createBreakStatement(null);
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return delegate.createBreakStatement(null);
        }

        if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();

            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return delegate.createBreakStatement(label);
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source.charCodeAt(index) === 0x20) {
            if (isIdentifierStart(source.charCodeAt(index + 1))) {
                argument = parseExpression();
                consumeSemicolon();
                return delegate.createReturnStatement(argument);
            }
        }

        if (peekLineTerminator()) {
            return delegate.createReturnStatement(null);
        }

        if (!match(';')) {
            if (!match('}') && lookahead.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return delegate.createReturnStatement(argument);
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            // TODO(ikarienator): Should we update the test cases instead?
            skipComment();
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return delegate.createWithStatement(object, body);
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test, consequent = [], statement, startToken;

        startToken = lookahead;
        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            consequent.push(statement);
        }

        return delegate.markEnd(delegate.createSwitchCase(test, consequent), startToken);
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        cases = [];

        if (match('}')) {
            lex();
            return delegate.createSwitchStatement(discriminant, cases);
        }

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return delegate.createSwitchStatement(discriminant, cases);
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return delegate.createThrowStatement(argument);
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param, body, startToken;

        startToken = lookahead;
        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpected(lookahead);
        }

        param = parseVariableIdentifier();
        // 12.14.1
        if (strict && isRestrictedWord(param.name)) {
            throwErrorTolerant({}, Messages.StrictCatchVariable);
        }

        expect(')');
        body = parseBlock();
        return delegate.markEnd(delegate.createCatchClause(param, body), startToken);
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return delegate.createTryStatement(block, [], handlers, finalizer);
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return delegate.createDebuggerStatement();
    }

    // 12 Statements

    function parseStatement() {
        var type = lookahead.type,
            expr,
            labeledBody,
            key,
            startToken;

        if (type === Token.EOF) {
            throwUnexpected(lookahead);
        }

        if (type === Token.Punctuator && lookahead.value === '{') {
            return parseBlock();
        }

        startToken = lookahead;

        if (type === Token.Punctuator) {
            switch (lookahead.value) {
            case ';':
                return delegate.markEnd(parseEmptyStatement(), startToken);
            case '(':
                return delegate.markEnd(parseExpressionStatement(), startToken);
            default:
                break;
            }
        }

        if (type === Token.Keyword) {
            switch (lookahead.value) {
            case 'break':
                return delegate.markEnd(parseBreakStatement(), startToken);
            case 'continue':
                return delegate.markEnd(parseContinueStatement(), startToken);
            case 'debugger':
                return delegate.markEnd(parseDebuggerStatement(), startToken);
            case 'do':
                return delegate.markEnd(parseDoWhileStatement(), startToken);
            case 'for':
                return delegate.markEnd(parseForStatement(), startToken);
            case 'function':
                return delegate.markEnd(parseFunctionDeclaration(), startToken);
            case 'if':
                return delegate.markEnd(parseIfStatement(), startToken);
            case 'return':
                return delegate.markEnd(parseReturnStatement(), startToken);
            case 'switch':
                return delegate.markEnd(parseSwitchStatement(), startToken);
            case 'throw':
                return delegate.markEnd(parseThrowStatement(), startToken);
            case 'try':
                return delegate.markEnd(parseTryStatement(), startToken);
            case 'var':
                return delegate.markEnd(parseVariableStatement(), startToken);
            case 'while':
                return delegate.markEnd(parseWhileStatement(), startToken);
            case 'with':
                return delegate.markEnd(parseWithStatement(), startToken);
            default:
                break;
            }
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            key = '$' + expr.name;
            if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[key] = true;
            labeledBody = parseStatement();
            delete state.labelSet[key];
            return delegate.markEnd(delegate.createLabeledStatement(expr, labeledBody), startToken);
        }

        consumeSemicolon();

        return delegate.markEnd(delegate.createExpressionStatement(expr), startToken);
    }

    // 13 Function Definition

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, startToken;

        startToken = lookahead;
        expect('{');

        while (index < length) {
            if (lookahead.type !== Token.StringLiteral) {
                break;
            }
            token = lookahead;

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = source.slice(token.start + 1, token.end - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;

        return delegate.markEnd(delegate.createBlockStatement(sourceElements), startToken);
    }

    function parseParams(firstRestricted) {
        var param, params = [], token, stricted, paramSet, key, message;
        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead;
                param = parseVariableIdentifier();
                key = '$' + token.value;
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, key)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, key)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[key] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return {
            params: params,
            stricted: stricted,
            firstRestricted: firstRestricted,
            message: message
        };
    }

    function parseFunctionDeclaration() {
        var id, params = [], body, token, stricted, tmp, firstRestricted, message, previousStrict, startToken;

        startToken = lookahead;

        expectKeyword('function');
        token = lookahead;
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        tmp = parseParams(firstRestricted);
        params = tmp.params;
        stricted = tmp.stricted;
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return delegate.markEnd(delegate.createFunctionDeclaration(id, params, [], body), startToken);
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, tmp, params = [], body, previousStrict, startToken;

        startToken = lookahead;
        expectKeyword('function');

        if (!match('(')) {
            token = lookahead;
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        tmp = parseParams(firstRestricted);
        params = tmp.params;
        stricted = tmp.stricted;
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return delegate.markEnd(delegate.createFunctionExpression(id, params, [], body), startToken);
    }

    // 14 Program

    function parseSourceElement() {
        if (lookahead.type === Token.Keyword) {
            switch (lookahead.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(lookahead.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (lookahead.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead;
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = source.slice(token.start + 1, token.end - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            /* istanbul ignore if */
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var body, startToken;

        skipComment();
        peek();
        startToken = lookahead;
        strict = false;

        body = parseSourceElements();
        return delegate.markEnd(delegate.createProgram(body), startToken);
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function tokenize(code, options) {
        var toString,
            token,
            tokens;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        delegate = SyntaxTreeDelegate;
        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        lookahead = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false,
            lastCommentStart: -1
        };

        extra = {};

        // Options matching.
        options = options || {};

        // Of course we collect tokens here.
        options.tokens = true;
        extra.tokens = [];
        extra.tokenize = true;
        // The following two fields are necessary to compute the Regex tokens.
        extra.openParenToken = -1;
        extra.openCurlyToken = -1;

        extra.range = (typeof options.range === 'boolean') && options.range;
        extra.loc = (typeof options.loc === 'boolean') && options.loc;

        if (typeof options.comment === 'boolean' && options.comment) {
            extra.comments = [];
        }
        if (typeof options.tolerant === 'boolean' && options.tolerant) {
            extra.errors = [];
        }

        try {
            peek();
            if (lookahead.type === Token.EOF) {
                return extra.tokens;
            }

            token = lex();
            while (lookahead.type !== Token.EOF) {
                try {
                    token = lex();
                } catch (lexError) {
                    token = lookahead;
                    if (extra.errors) {
                        extra.errors.push(lexError);
                        // We have to break on the first error
                        // to avoid infinite loops.
                        break;
                    } else {
                        throw lexError;
                    }
                }
            }

            filterTokenLocation();
            tokens = extra.tokens;
            if (typeof extra.comments !== 'undefined') {
                tokens.comments = extra.comments;
            }
            if (typeof extra.errors !== 'undefined') {
                tokens.errors = extra.errors;
            }
        } catch (e) {
            throw e;
        } finally {
            extra = {};
        }
        return tokens;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        delegate = SyntaxTreeDelegate;
        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        lookahead = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false,
            lastCommentStart: -1
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.attachComment = (typeof options.attachComment === 'boolean') && options.attachComment;

            if (extra.loc && options.source !== null && options.source !== undefined) {
                extra.source = toString(options.source);
            }

            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
            if (extra.attachComment) {
                extra.range = true;
                extra.comments = [];
                extra.bottomRightStack = [];
                extra.trailingComments = [];
                extra.leadingComments = [];
            }
        }

        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
        } catch (e) {
            throw e;
        } finally {
            extra = {};
        }

        return program;
    }

    // Sync with *.json manifests.
    exports.version = '1.2.5';

    exports.tokenize = tokenize;

    exports.parse = parse;

    // Deep copy.
   /* istanbul ignore next */
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],91:[function(require,module,exports){
!function(e,t){"use strict";"function"==typeof define&&define.amd?define(["exports"],t):t("undefined"!=typeof exports?exports:e.estraverse={})}(this,function(e){"use strict";function t(){}function n(e){var t,r,i={};for(t in e)e.hasOwnProperty(t)&&(r=e[t],"object"==typeof r&&null!==r?i[t]=n(r):i[t]=r);return i}function r(e){var t,n={};for(t in e)e.hasOwnProperty(t)&&(n[t]=e[t]);return n}function i(e,t){var n,r,i,s;for(r=e.length,i=0;r;)n=r>>>1,s=i+n,t(e[s])?r=n:(i=s+1,r-=n+1);return i}function s(e,t){var n,r,i,s;for(r=e.length,i=0;r;)n=r>>>1,s=i+n,t(e[s])?(i=s+1,r-=n+1):r=n;return i}function o(e,t){this.parent=e,this.key=t}function a(e,t,n,r){this.node=e,this.path=t,this.wrap=n,this.ref=r}function l(){}function p(e,t){var n=new l;return n.traverse(e,t)}function u(e,t){var n=new l;return n.replace(e,t)}function h(e,t){var n;return n=i(t,function(t){return t.range[0]>e.range[0]}),e.extendedRange=[e.range[0],e.range[1]],n!==t.length&&(e.extendedRange[1]=t[n].range[0]),n-=1,n>=0&&(e.extendedRange[0]=t[n].range[1]),e}function c(e,t,r){var i,s,o,a,l=[];if(!e.range)throw new Error("attachComments needs range information");if(!r.length){if(t.length){for(o=0,s=t.length;s>o;o+=1)i=n(t[o]),i.extendedRange=[0,e.range[0]],l.push(i);e.leadingComments=l}return e}for(o=0,s=t.length;s>o;o+=1)l.push(h(n(t[o]),r));return a=0,p(e,{enter:function(e){for(var t;a<l.length&&(t=l[a],!(t.extendedRange[1]>e.range[0]));)t.extendedRange[1]===e.range[0]?(e.leadingComments||(e.leadingComments=[]),e.leadingComments.push(t),l.splice(a,1)):a+=1;return a===l.length?f.Break:l[a].extendedRange[0]>e.range[1]?f.Skip:void 0}}),a=0,p(e,{leave:function(e){for(var t;a<l.length&&(t=l[a],!(e.range[1]<t.extendedRange[0]));)e.range[1]===t.extendedRange[0]?(e.trailingComments||(e.trailingComments=[]),e.trailingComments.push(t),l.splice(a,1)):a+=1;return a===l.length?f.Break:l[a].extendedRange[0]>e.range[1]?f.Skip:void 0}}),e}var m,d,f,g,x,_;m={AssignmentExpression:"AssignmentExpression",ArrayExpression:"ArrayExpression",ArrowFunctionExpression:"ArrowFunctionExpression",BlockStatement:"BlockStatement",BinaryExpression:"BinaryExpression",BreakStatement:"BreakStatement",CallExpression:"CallExpression",CatchClause:"CatchClause",ClassBody:"ClassBody",ClassDeclaration:"ClassDeclaration",ClassExpression:"ClassExpression",ConditionalExpression:"ConditionalExpression",ContinueStatement:"ContinueStatement",DebuggerStatement:"DebuggerStatement",DirectiveStatement:"DirectiveStatement",DoWhileStatement:"DoWhileStatement",EmptyStatement:"EmptyStatement",ExpressionStatement:"ExpressionStatement",ForStatement:"ForStatement",ForInStatement:"ForInStatement",FunctionDeclaration:"FunctionDeclaration",FunctionExpression:"FunctionExpression",Identifier:"Identifier",IfStatement:"IfStatement",Literal:"Literal",LabeledStatement:"LabeledStatement",LogicalExpression:"LogicalExpression",MemberExpression:"MemberExpression",MethodDefinition:"MethodDefinition",NewExpression:"NewExpression",ObjectExpression:"ObjectExpression",Program:"Program",Property:"Property",ReturnStatement:"ReturnStatement",SequenceExpression:"SequenceExpression",SwitchStatement:"SwitchStatement",SwitchCase:"SwitchCase",ThisExpression:"ThisExpression",ThrowStatement:"ThrowStatement",TryStatement:"TryStatement",UnaryExpression:"UnaryExpression",UpdateExpression:"UpdateExpression",VariableDeclaration:"VariableDeclaration",VariableDeclarator:"VariableDeclarator",WhileStatement:"WhileStatement",WithStatement:"WithStatement",YieldExpression:"YieldExpression"},d=Array.isArray,d||(d=function(e){return"[object Array]"===Object.prototype.toString.call(e)}),t(r),t(s),g={AssignmentExpression:["left","right"],ArrayExpression:["elements"],ArrowFunctionExpression:["params","body"],BlockStatement:["body"],BinaryExpression:["left","right"],BreakStatement:["label"],CallExpression:["callee","arguments"],CatchClause:["param","body"],ClassBody:["body"],ClassDeclaration:["id","body","superClass"],ClassExpression:["id","body","superClass"],ConditionalExpression:["test","consequent","alternate"],ContinueStatement:["label"],DebuggerStatement:[],DirectiveStatement:[],DoWhileStatement:["body","test"],EmptyStatement:[],ExpressionStatement:["expression"],ForStatement:["init","test","update","body"],ForInStatement:["left","right","body"],FunctionDeclaration:["id","params","body"],FunctionExpression:["id","params","body"],Identifier:[],IfStatement:["test","consequent","alternate"],Literal:[],LabeledStatement:["label","body"],LogicalExpression:["left","right"],MemberExpression:["object","property"],MethodDefinition:["key","value"],NewExpression:["callee","arguments"],ObjectExpression:["properties"],Program:["body"],Property:["key","value"],ReturnStatement:["argument"],SequenceExpression:["expressions"],SwitchStatement:["discriminant","cases"],SwitchCase:["test","consequent"],ThisExpression:[],ThrowStatement:["argument"],TryStatement:["block","handlers","handler","guardedHandlers","finalizer"],UnaryExpression:["argument"],UpdateExpression:["argument"],VariableDeclaration:["declarations"],VariableDeclarator:["id","init"],WhileStatement:["test","body"],WithStatement:["object","body"],YieldExpression:["argument"]},x={},_={},f={Break:x,Skip:_},o.prototype.replace=function(e){this.parent[this.key]=e},l.prototype.path=function(){function e(e,t){if(d(t))for(r=0,i=t.length;i>r;++r)e.push(t[r]);else e.push(t)}var t,n,r,i,s,o;if(!this.__current.path)return null;for(s=[],t=2,n=this.__leavelist.length;n>t;++t)o=this.__leavelist[t],e(s,o.path);return e(s,this.__current.path),s},l.prototype.parents=function(){var e,t,n;for(n=[],e=1,t=this.__leavelist.length;t>e;++e)n.push(this.__leavelist[e].node);return n},l.prototype.current=function(){return this.__current.node},l.prototype.__execute=function(e,t){var n,r;return r=void 0,n=this.__current,this.__current=t,this.__state=null,e&&(r=e.call(this,t.node,this.__leavelist[this.__leavelist.length-1].node)),this.__current=n,r},l.prototype.notify=function(e){this.__state=e},l.prototype.skip=function(){this.notify(_)},l.prototype["break"]=function(){this.notify(x)},l.prototype.__initialize=function(e,t){this.visitor=t,this.root=e,this.__worklist=[],this.__leavelist=[],this.__current=null,this.__state=null},l.prototype.traverse=function(e,t){var n,r,i,s,o,l,p,u,h,c,f,y;for(this.__initialize(e,t),y={},n=this.__worklist,r=this.__leavelist,n.push(new a(e,null,null,null)),r.push(new a(null,null,null,null));n.length;)if(i=n.pop(),i!==y){if(i.node){if(l=this.__execute(t.enter,i),this.__state===x||l===x)return;if(n.push(y),r.push(i),this.__state===_||l===_)continue;for(s=i.node,o=i.wrap||s.type,c=g[o],u=c.length;(u-=1)>=0;)if(p=c[u],f=s[p])if(d(f))for(h=f.length;(h-=1)>=0;)f[h]&&(i=o===m.ObjectExpression&&"properties"===c[u]?new a(f[h],[p,h],"Property",null):new a(f[h],[p,h],null,null),n.push(i));else n.push(new a(f,p,null,null))}}else if(i=r.pop(),l=this.__execute(t.leave,i),this.__state===x||l===x)return},l.prototype.replace=function(e,t){var n,r,i,s,l,p,u,h,c,f,y,S,E;for(this.__initialize(e,t),y={},n=this.__worklist,r=this.__leavelist,S={root:e},p=new a(e,null,null,new o(S,"root")),n.push(p),r.push(p);n.length;)if(p=n.pop(),p!==y){if(l=this.__execute(t.enter,p),void 0!==l&&l!==x&&l!==_&&(p.ref.replace(l),p.node=l),this.__state===x||l===x)return S.root;if(i=p.node,i&&(n.push(y),r.push(p),this.__state!==_&&l!==_))for(s=p.wrap||i.type,c=g[s],u=c.length;(u-=1)>=0;)if(E=c[u],f=i[E])if(d(f))for(h=f.length;(h-=1)>=0;)f[h]&&(p=s===m.ObjectExpression&&"properties"===c[u]?new a(f[h],[E,h],"Property",new o(f,h)):new a(f[h],[E,h],null,new o(f,h)),n.push(p));else n.push(new a(f,E,null,new o(i,E)))}else if(p=r.pop(),l=this.__execute(t.leave,p),void 0!==l&&l!==x&&l!==_&&p.ref.replace(l),this.__state===x||l===x)return S.root;return S.root},e.version="1.3.2",e.Syntax=m,e.traverse=p,e.replace=u,e.attachComments=c,e.VisitorKeys=g,e.VisitorOption=f,e.Controller=l});


},{}],92:[function(require,module,exports){
function replacer(t,e){return util.isUndefined(e)?""+e:!util.isNumber(e)||!isNaN(e)&&isFinite(e)?util.isFunction(e)||util.isRegExp(e)?e.toString():e:e.toString()}function truncate(t,e){return util.isString(t)?t.length<e?t:t.slice(0,e):t}function getMessage(t){return truncate(JSON.stringify(t.actual,replacer),128)+" "+t.operator+" "+truncate(JSON.stringify(t.expected,replacer),128)}function fail(t,e,r,i,s){throw new assert.AssertionError({message:r,actual:t,expected:e,operator:i,stackStartFunction:s})}function ok(t,e){t||fail(t,!0,e,"==",assert.ok)}function _deepEqual(t,e){if(t===e)return!0;if(util.isBuffer(t)&&util.isBuffer(e)){if(t.length!=e.length)return!1;for(var r=0;r<t.length;r++)if(t[r]!==e[r])return!1;return!0}return util.isDate(t)&&util.isDate(e)?t.getTime()===e.getTime():util.isRegExp(t)&&util.isRegExp(e)?t.source===e.source&&t.global===e.global&&t.multiline===e.multiline&&t.lastIndex===e.lastIndex&&t.ignoreCase===e.ignoreCase:util.isObject(t)||util.isObject(e)?objEquiv(t,e):t==e}function isArguments(t){return"[object Arguments]"==Object.prototype.toString.call(t)}function objEquiv(t,e){if(util.isNullOrUndefined(t)||util.isNullOrUndefined(e))return!1;if(t.prototype!==e.prototype)return!1;if(isArguments(t))return isArguments(e)?(t=pSlice.call(t),e=pSlice.call(e),_deepEqual(t,e)):!1;try{var r,i,s=objectKeys(t),n=objectKeys(e)}catch(a){return!1}if(s.length!=n.length)return!1;for(s.sort(),n.sort(),i=s.length-1;i>=0;i--)if(s[i]!=n[i])return!1;for(i=s.length-1;i>=0;i--)if(r=s[i],!_deepEqual(t[r],e[r]))return!1;return!0}function expectedException(t,e){return t&&e?"[object RegExp]"==Object.prototype.toString.call(e)?e.test(t):t instanceof e?!0:e.call({},t)===!0?!0:!1:!1}function _throws(t,e,r,i){var s;util.isString(r)&&(i=r,r=null);try{e()}catch(n){s=n}if(i=(r&&r.name?" ("+r.name+").":".")+(i?" "+i:"."),t&&!s&&fail(s,r,"Missing expected exception"+i),!t&&expectedException(s,r)&&fail(s,r,"Got unwanted exception"+i),t&&s&&r&&!expectedException(s,r)||!t&&s)throw s}var util=require("util/"),pSlice=Array.prototype.slice,hasOwn=Object.prototype.hasOwnProperty,assert=module.exports=ok;assert.AssertionError=function(t){this.name="AssertionError",this.actual=t.actual,this.expected=t.expected,this.operator=t.operator,t.message?(this.message=t.message,this.generatedMessage=!1):(this.message=getMessage(this),this.generatedMessage=!0);var e=t.stackStartFunction||fail;if(Error.captureStackTrace)Error.captureStackTrace(this,e);else{var r=new Error;if(r.stack){var i=r.stack,s=e.name,n=i.indexOf("\n"+s);if(n>=0){var a=i.indexOf("\n",n+1);i=i.substring(a+1)}this.stack=i}}},util.inherits(assert.AssertionError,Error),assert.fail=fail,assert.ok=ok,assert.equal=function(t,e,r){t!=e&&fail(t,e,r,"==",assert.equal)},assert.notEqual=function(t,e,r){t==e&&fail(t,e,r,"!=",assert.notEqual)},assert.deepEqual=function(t,e,r){_deepEqual(t,e)||fail(t,e,r,"deepEqual",assert.deepEqual)},assert.notDeepEqual=function(t,e,r){_deepEqual(t,e)&&fail(t,e,r,"notDeepEqual",assert.notDeepEqual)},assert.strictEqual=function(t,e,r){t!==e&&fail(t,e,r,"===",assert.strictEqual)},assert.notStrictEqual=function(t,e,r){t===e&&fail(t,e,r,"!==",assert.notStrictEqual)},assert["throws"]=function(t,e,r){_throws.apply(this,[!0].concat(pSlice.call(arguments)))},assert.doesNotThrow=function(t,e){_throws.apply(this,[!1].concat(pSlice.call(arguments)))},assert.ifError=function(t){if(t)throw t};var objectKeys=Object.keys||function(t){var e=[];for(var r in t)hasOwn.call(t,r)&&e.push(r);return e};


},{"util/":97}],93:[function(require,module,exports){
"function"==typeof Object.create?module.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:module.exports=function(t,e){t.super_=e;var o=function(){};o.prototype=e.prototype,t.prototype=new o,t.prototype.constructor=t};


},{}],94:[function(require,module,exports){
(function(r){function t(r,t){for(var e=0,n=r.length-1;n>=0;n--){var s=r[n];"."===s?r.splice(n,1):".."===s?(r.splice(n,1),e++):e&&(r.splice(n,1),e--)}if(t)for(;e--;e)r.unshift("..");return r}function e(r,t){if(r.filter)return r.filter(t);for(var e=[],n=0;n<r.length;n++)t(r[n],n,r)&&e.push(r[n]);return e}var n=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/,s=function(r){return n.exec(r).slice(1)};exports.resolve=function(){for(var n="",s=!1,o=arguments.length-1;o>=-1&&!s;o--){var i=o>=0?arguments[o]:r.cwd();if("string"!=typeof i)throw new TypeError("Arguments to path.resolve must be strings");i&&(n=i+"/"+n,s="/"===i.charAt(0))}return n=t(e(n.split("/"),function(r){return!!r}),!s).join("/"),(s?"/":"")+n||"."},exports.normalize=function(r){var n=exports.isAbsolute(r),s="/"===o(r,-1);return r=t(e(r.split("/"),function(r){return!!r}),!n).join("/"),r||n||(r="."),r&&s&&(r+="/"),(n?"/":"")+r},exports.isAbsolute=function(r){return"/"===r.charAt(0)},exports.join=function(){var r=Array.prototype.slice.call(arguments,0);return exports.normalize(e(r,function(r,t){if("string"!=typeof r)throw new TypeError("Arguments to path.join must be strings");return r}).join("/"))},exports.relative=function(r,t){function e(r){for(var t=0;t<r.length&&""===r[t];t++);for(var e=r.length-1;e>=0&&""===r[e];e--);return t>e?[]:r.slice(t,e-t+1)}r=exports.resolve(r).substr(1),t=exports.resolve(t).substr(1);for(var n=e(r.split("/")),s=e(t.split("/")),o=Math.min(n.length,s.length),i=o,u=0;o>u;u++)if(n[u]!==s[u]){i=u;break}for(var l=[],u=i;u<n.length;u++)l.push("..");return l=l.concat(s.slice(i)),l.join("/")},exports.sep="/",exports.delimiter=":",exports.dirname=function(r){var t=s(r),e=t[0],n=t[1];return e||n?(n&&(n=n.substr(0,n.length-1)),e+n):"."},exports.basename=function(r,t){var e=s(r)[2];return t&&e.substr(-1*t.length)===t&&(e=e.substr(0,e.length-t.length)),e},exports.extname=function(r){return s(r)[3]};var o="b"==="ab".substr(-1)?function(r,t,e){return r.substr(t,e)}:function(r,t,e){return 0>t&&(t=r.length+t),r.substr(t,e)}}).call(this,require("_process"));


},{"_process":95}],95:[function(require,module,exports){
function noop(){}var process=module.exports={};process.nextTick=function(){var o="undefined"!=typeof window&&window.setImmediate,e="undefined"!=typeof window&&window.postMessage&&window.addEventListener;if(o)return function(o){return window.setImmediate(o)};if(e){var s=[];return window.addEventListener("message",function(o){var e=o.source;if((e===window||null===e)&&"process-tick"===o.data&&(o.stopPropagation(),s.length>0)){var n=s.shift();n()}},!0),function(o){s.push(o),window.postMessage("process-tick","*")}}return function(o){setTimeout(o,0)}}(),process.title="browser",process.browser=!0,process.env={},process.argv=[],process.on=noop,process.addListener=noop,process.once=noop,process.off=noop,process.removeListener=noop,process.removeAllListeners=noop,process.emit=noop,process.binding=function(o){throw new Error("process.binding is not supported")},process.cwd=function(){return"/"},process.chdir=function(o){throw new Error("process.chdir is not supported")};


},{}],96:[function(require,module,exports){
module.exports=function(o){return o&&"object"==typeof o&&"function"==typeof o.copy&&"function"==typeof o.fill&&"function"==typeof o.readUInt8};


},{}],97:[function(require,module,exports){
(function(e,t){function r(e,t){var r={seen:[],stylize:o};return arguments.length>=3&&(r.depth=arguments[2]),arguments.length>=4&&(r.colors=arguments[3]),g(t)?r.showHidden=t:t&&exports._extend(r,t),b(r.showHidden)&&(r.showHidden=!1),b(r.depth)&&(r.depth=2),b(r.colors)&&(r.colors=!1),b(r.customInspect)&&(r.customInspect=!0),r.colors&&(r.stylize=n),s(r,e,r.depth)}function n(e,t){var n=r.styles[t];return n?"["+r.colors[n][0]+"m"+e+"["+r.colors[n][1]+"m":e}function o(e,t){return e}function i(e){var t={};return e.forEach(function(e,r){t[e]=!0}),t}function s(e,t,r){if(e.customInspect&&t&&w(t.inspect)&&t.inspect!==exports.inspect&&(!t.constructor||t.constructor.prototype!==t)){var n=t.inspect(r,e);return x(n)||(n=s(e,n,r)),n}var o=u(e,t);if(o)return o;var g=Object.keys(t),y=i(g);if(e.showHidden&&(g=Object.getOwnPropertyNames(t)),j(t)&&(g.indexOf("message")>=0||g.indexOf("description")>=0))return c(t);if(0===g.length){if(w(t)){var d=t.name?": "+t.name:"";return e.stylize("[Function"+d+"]","special")}if(v(t))return e.stylize(RegExp.prototype.toString.call(t),"regexp");if(S(t))return e.stylize(Date.prototype.toString.call(t),"date");if(j(t))return c(t)}var m="",h=!1,b=["{","}"];if(f(t)&&(h=!0,b=["[","]"]),w(t)){var O=t.name?": "+t.name:"";m=" [Function"+O+"]"}if(v(t)&&(m=" "+RegExp.prototype.toString.call(t)),S(t)&&(m=" "+Date.prototype.toUTCString.call(t)),j(t)&&(m=" "+c(t)),0===g.length&&(!h||0==t.length))return b[0]+m+b[1];if(0>r)return v(t)?e.stylize(RegExp.prototype.toString.call(t),"regexp"):e.stylize("[Object]","special");e.seen.push(t);var z;return z=h?l(e,t,r,y,g):g.map(function(n){return p(e,t,r,y,n,h)}),e.seen.pop(),a(z,m,b)}function u(e,t){if(b(t))return e.stylize("undefined","undefined");if(x(t)){var r="'"+JSON.stringify(t).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return e.stylize(r,"string")}return m(t)?e.stylize(""+t,"number"):g(t)?e.stylize(""+t,"boolean"):y(t)?e.stylize("null","null"):void 0}function c(e){return"["+Error.prototype.toString.call(e)+"]"}function l(e,t,r,n,o){for(var i=[],s=0,u=t.length;u>s;++s)A(t,String(s))?i.push(p(e,t,r,n,String(s),!0)):i.push("");return o.forEach(function(o){o.match(/^\d+$/)||i.push(p(e,t,r,n,o,!0))}),i}function p(e,t,r,n,o,i){var u,c,l;if(l=Object.getOwnPropertyDescriptor(t,o)||{value:t[o]},l.get?c=l.set?e.stylize("[Getter/Setter]","special"):e.stylize("[Getter]","special"):l.set&&(c=e.stylize("[Setter]","special")),A(n,o)||(u="["+o+"]"),c||(e.seen.indexOf(l.value)<0?(c=y(r)?s(e,l.value,null):s(e,l.value,r-1),c.indexOf("\n")>-1&&(c=i?c.split("\n").map(function(e){return"  "+e}).join("\n").substr(2):"\n"+c.split("\n").map(function(e){return"   "+e}).join("\n"))):c=e.stylize("[Circular]","special")),b(u)){if(i&&o.match(/^\d+$/))return c;u=JSON.stringify(""+o),u.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(u=u.substr(1,u.length-2),u=e.stylize(u,"name")):(u=u.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),u=e.stylize(u,"string"))}return u+": "+c}function a(e,t,r){var n=0,o=e.reduce(function(e,t){return n++,t.indexOf("\n")>=0&&n++,e+t.replace(/\u001b\[\d\d?m/g,"").length+1},0);return o>60?r[0]+(""===t?"":t+"\n ")+" "+e.join(",\n  ")+" "+r[1]:r[0]+t+" "+e.join(", ")+" "+r[1]}function f(e){return Array.isArray(e)}function g(e){return"boolean"==typeof e}function y(e){return null===e}function d(e){return null==e}function m(e){return"number"==typeof e}function x(e){return"string"==typeof e}function h(e){return"symbol"==typeof e}function b(e){return void 0===e}function v(e){return O(e)&&"[object RegExp]"===E(e)}function O(e){return"object"==typeof e&&null!==e}function S(e){return O(e)&&"[object Date]"===E(e)}function j(e){return O(e)&&("[object Error]"===E(e)||e instanceof Error)}function w(e){return"function"==typeof e}function z(e){return null===e||"boolean"==typeof e||"number"==typeof e||"string"==typeof e||"symbol"==typeof e||"undefined"==typeof e}function E(e){return Object.prototype.toString.call(e)}function D(e){return 10>e?"0"+e.toString(10):e.toString(10)}function N(){var e=new Date,t=[D(e.getHours()),D(e.getMinutes()),D(e.getSeconds())].join(":");return[e.getDate(),H[e.getMonth()],t].join(" ")}function A(e,t){return Object.prototype.hasOwnProperty.call(e,t)}var J=/%[sdj%]/g;exports.format=function(e){if(!x(e)){for(var t=[],n=0;n<arguments.length;n++)t.push(r(arguments[n]));return t.join(" ")}for(var n=1,o=arguments,i=o.length,s=String(e).replace(J,function(e){if("%%"===e)return"%";if(n>=i)return e;switch(e){case"%s":return String(o[n++]);case"%d":return Number(o[n++]);case"%j":try{return JSON.stringify(o[n++])}catch(t){return"[Circular]"}default:return e}}),u=o[n];i>n;u=o[++n])s+=y(u)||!O(u)?" "+u:" "+r(u);return s},exports.deprecate=function(r,n){function o(){if(!i){if(e.throwDeprecation)throw new Error(n);e.traceDeprecation?console.trace(n):console.error(n),i=!0}return r.apply(this,arguments)}if(b(t.process))return function(){return exports.deprecate(r,n).apply(this,arguments)};if(e.noDeprecation===!0)return r;var i=!1;return o};var R,_={};exports.debuglog=function(t){if(b(R)&&(R=e.env.NODE_DEBUG||""),t=t.toUpperCase(),!_[t])if(new RegExp("\\b"+t+"\\b","i").test(R)){var r=e.pid;_[t]=function(){var e=exports.format.apply(exports,arguments);console.error("%s %d: %s",t,r,e)}}else _[t]=function(){};return _[t]},exports.inspect=r,r.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},r.styles={special:"cyan",number:"yellow","boolean":"yellow",undefined:"grey","null":"bold",string:"green",date:"magenta",regexp:"red"},exports.isArray=f,exports.isBoolean=g,exports.isNull=y,exports.isNullOrUndefined=d,exports.isNumber=m,exports.isString=x,exports.isSymbol=h,exports.isUndefined=b,exports.isRegExp=v,exports.isObject=O,exports.isDate=S,exports.isError=j,exports.isFunction=w,exports.isPrimitive=z,exports.isBuffer=require("./support/isBuffer");var H=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];exports.log=function(){console.log("%s - %s",N(),exports.format.apply(exports,arguments))},exports.inherits=require("inherits"),exports._extend=function(e,t){if(!t||!O(t))return e;for(var r=Object.keys(t),n=r.length;n--;)e[r[n]]=t[r[n]];return e}}).call(this,require("_process"),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});


},{"./support/isBuffer":96,"_process":95,"inherits":93}],98:[function(require,module,exports){
module.exports=require("./lib");


},{"./lib":99}],99:[function(require,module,exports){
function walker(r,e,t){function c(){throw c}var n,a=function(r){if(!r||"object"!=typeof r||!r.type)return r;if(void 0!==t&&r.range&&(r.range[0]>t||r.range[1]<t))return r;var n=e[r.type]||e["default"]||checkProps;return n.call(r,a,c)};try{n=a(r)}catch(o){if(o!==c)throw o}return n}function checkProps(r){var e=this,t={};return Object.keys(e).forEach(function(c){var n=e[c],a=n;a=Array.isArray(n)?n.map(r):r(n),t[c]=a}),t}module.exports=walker,walker.checkProps=checkProps;


},{}],100:[function(require,module,exports){
!function(e){function t(e,t){var n=new Map;return n.set("global",e),f.replace(e,{enter:function(e){if(e.type==y.FunctionDeclaration){var r=e.id.name,i=t.getScope(),a=new d(e);i.declareVariable(r),i.updateTypeInfo(r,a);var o=new p(e,i,{name:r});n.set(o.str(),e),t.pushScope(o)}},leave:function(e){var n;return e.type==y.FunctionDeclaration&&(t.popScope(),n={type:y.EmptyStatement}),n}}),e.body=e.body.filter(function(e){return e.type!=y.EmptyStatement}),n}function n(e,t){for(var n in t.derivedFunctions)e.body.push(t.derivedFunctions[n].ast);f.traverse(e,{enter:function(e){e.type==y.CallExpression&&e.extra&&e.extra.newName&&(e.callee.name=e.extra.newName)}})}function r(e,t){for(var n=0;n<e.length;n++){var r=g(e[n]);n<t.length?(r.setFromExtra(t[n].getExtra()),r.setDynamicValue()):r.setType(m.TYPES.UNDEFINED)}}function i(e){var t=new p(e,null,{name:"global"});return t.registerGlobals(),t}function a(e,t){var n=t.inject&&t.inject["this"]||null;e.declareVariable("this"),e.updateTypeInfo("this",h.getThisTypeInfo(n))}var o=require("../base/context.js"),s=require("../base/common.js"),u=require("../base/index.js"),c=require("./../base/annotation.js"),l=require("assert"),f=require("estraverse"),p=require("./typeinference/registry/").InferenceScope,h=require("./typeinference/registry/system.js"),m=require("../interfaces.js"),y=(require("escodegen"),s.Syntax),d=c.FunctionAnnotation,g=c.ANNO,v=function(e,n,r){o.call(this,e,r),l.equal(e.type,y.Program),this.analysis=n,this.root.globalParameters={};var s=i(e);a(s,r),this.pushScope(s),this.functionMap=t(e,this),this.derivedFunctions={},this.constants=null};u.createClass(v,o,{analyse:function(){return this.analysis.call(this,this.root,this.options)},getTypeInfo:function(e){return s.getTypeInfo(e,this.getScope(),this.constants,!0)},setConstants:function(e){this.constants=e},callFunction:function(e,t,n){var r=this.createSignatureFromNameAndArguments(e,t),i=this.getFunctionInformationBySignature(r);return i?i:this.createFunctionInformationFor(e,t,n)},createSignatureFromNameAndArguments:function(e,t){return t.reduce(function(e,t){return e+t.getTypeString()},e)},getFunctionInformationBySignature:function(e){if(this.derivedFunctions.hasOwnProperty(e)){var t=this.derivedFunctions[e];return t.info}return null},createFunctionInformationFor:function(e,t,n){var r,i,a;if(n=n||{},this.functionMap.has(e))return r=this.functionMap.get(e),a=n.name||this.getSafeUniqueName(e.replace(/\./g,"_")),i={},i.ast=this.analyseFunction(JSON.parse(JSON.stringify(r)),t),i.info=i.ast.extra.returnInfo,i.info.newName=i.ast.id.name=a,this.derivedFunctions[this.createSignatureFromNameAndArguments(e,t)]=i,i.info;throw new Error("Could not resolve function "+e)},analyseFunction:function(e,t){var n=new p(e,this.getScope(),{name:e.id.name}),i=new d(e);return r(e.params,t),n.declareParameters(e.params),this.pushScope(n),e.body=this.analysis.call(this,e.body,this.options),i.setReturnInfo(n.getReturnInfo()),this.popScope(),e},getResult:function(){return n(this.root,this),this.root},declareVariables:function(e,t){var n=this.getScope(),r=this;if(e.type==y.VariableDeclaration){var i=e.declarations;i.forEach(function(e){var t=g(e);if(e.id.type!=y.Identifier)throw new Error("Dynamic variable names are not yet supported");var i=e.id.name;if(n.declareVariable(i,!0,t),e.init){var a=g(e.init);n.updateTypeInfo(i,a,e),e.init.type==y.AssignmentExpression&&r.declareVariables(e.init,!0)}else t.setType(m.TYPES.UNDEFINED)})}else if(e.type==y.AssignmentExpression&&t){var a=g(e.right);if(e.left.type!=y.Identifier)throw new Error("Dynamic variable names are not yet supported");var o=e.left.name;n.declareVariable(o,!0,g(e)),n.updateTypeInfo(o,a,e),e.right.type==y.AssignmentExpression&&r.declareVariables(e.right,!0)}return!0},injectCall:function(e,t){if(this.functionMap.has(e)){var n=t[0];if(n&&n.extra){var r=new c.Annotation({},n.extra);this.getScope().updateTypeInfo("_env",r)}var i=e.substr(e.indexOf(".")+1);this.root.globalParameters[e]=t,this.callFunction(e,t.map(function(e){return g(e)}),{name:i})}}}),e.exports=v}(module);


},{"../base/common.js":132,"../base/context.js":133,"../base/index.js":135,"../interfaces.js":168,"./../base/annotation.js":130,"./typeinference/registry/":112,"./typeinference/registry/system.js":118,"assert":92,"escodegen":75,"estraverse":91}],101:[function(require,module,exports){
!function(e){var r=require("./sanitizer/sanitizer.js"),n=require("../resolve/resolve.js"),s=require("./constants/staticTransformer.js"),t=require("./uniformExpressions/uniformAnalysis.js"),i=require("./validator.js"),a=require("./semantics/semantics.js"),o=require("./analysiscontext.js"),c=require("./typeinference/typeinference.js"),l=require("../generate/space/transform.js").SpaceTransformer,u=require("./../base/annotation.js"),m=(require("escodegen"),u.ANNO,function(e,u,m){m=m||{},u=u||{};var f;try{e=m.implementation?n.resolveClosuresPreTypeInference(e,m.implementation,u,m):e,e=m.sanitize?r.sanitize(e,m):e;var p=new o(e,function(e,r){return e=c.infer(e,this,r),e=s.transform(e,r),e=m.extractUniformExpressions?t.extract(e,m):e,e=m.semanticAnalysis?a(e,m):e},m);p.analyse(),m.entry&&p.injectCall(m.entry,m.inject&&m.inject[m.entry]||[]),e=p.getResult(),e=m.implementation?n.resolveClosuresPostTypeInference(e,m.implementation,u,m):e,e=m.validate?i.validate(e):e,m.transformSpaces&&(u.spaceInfo=l.transformAast(e,m))}catch(j){if(m.throwOnError)throw j;f=j}return{ast:e,error:f}});e.analyze=m}(exports);


},{"../generate/space/transform.js":165,"../resolve/resolve.js":172,"./../base/annotation.js":130,"./analysiscontext.js":100,"./constants/staticTransformer.js":103,"./sanitizer/sanitizer.js":105,"./semantics/semantics.js":107,"./typeinference/typeinference.js":124,"./uniformExpressions/uniformAnalysis.js":126,"./validator.js":129,"escodegen":75}],102:[function(require,module,exports){
!function(r){function t(r){if(r.type===n.Literal){var e=void 0!==r.raw?r.raw:r.value,f=parseFloat(e);if(!isNaN(f))return f;switch(e=r.value){case"true":return!0;case"false":return!1;case"null":return null;default:return e}}if(r.type==n.MemberExpression||r.type==n.CallExpression||r.type==n.Identifier||r.type==n.NewExpression||r.type==n.LogicalExpression)return o(r).getStaticValue();if(r.type===n.UnaryExpression){if("typeof"==r.operator)return o(r).getStaticValue();if(i.hasOwnProperty(r.operator))return i[r.operator](t(r.argument));u.throwError(r,"Unknown unary operator: "+r.operator)}if(r.type===n.BinaryExpression){if(a.hasOwnProperty(r.operator))return a[r.operator](t(r.left),t(r.right));u.throwError(r,"Unknown binary operator: "+r.operator)}u.throwError(r,"Evaluating static value for node type: "+r.type)}function e(r){var t=o(r);return t.isNullOrUndefined()?!1:t.isObject()||this.isFunction()?!0:t.hasStaticValue()?!!t.getStaticValue():void 0}var n=require("estraverse").Syntax,o=require("../../base/annotation.js").ANNO,u=require("../../interfaces.js"),i={"!":function(r){return!r},"-":function(r){return-r},"+":function(r){return+r},"typeof":function(r){return typeof r},"void":function(r){return void r},"delete":function(r){return!0}},a={"+":function(r,t){return r+t},"-":function(r,t){return r-t},"/":function(r,t){return r/t},"*":function(r,t){return r*t},"%":function(r,t){return r%t},"==":function(r,t){return r==t},"!=":function(r,t){return r!=t},"===":function(r,t){return r===t},"!==":function(r,t){return r!==t},"<":function(r,t){return t>r},"<=":function(r,t){return t>=r},">":function(r,t){return r>t},">=":function(r,t){return r>=t}};exports.getStaticValue=t,exports.getStaticTruthValue=e}(exports);


},{"../../base/annotation.js":130,"../../interfaces.js":168,"estraverse":91}],103:[function(require,module,exports){
!function(e){function t(e){return e.hasStaticValue()&&!(e.isObject()||e.isNullOrUndefined())}function r(e){return e.hasStaticValue()&&e.isVector()}function n(e,t){return e===f.Identifier?-1!==E.indexOf(t):-1!==x.indexOf(e)}function a(e){var t,r,n=e.getStaticValue(),a=[];switch(e.getKind()){case l.OBJECT_KINDS.FLOAT2:t=2,r="Vec2";break;case l.OBJECT_KINDS.FLOAT3:t=3,r="Vec3";break;case l.OBJECT_KINDS.FLOAT4:t=4,r="Vec4";break;default:throw new Error("Internal error in static transformation. Unknown kind: "+e.getKind())}for(var s=!0,o=0;t-1>o&&s;++o)s=s&&n[o]==n[o+1];for(t=s?1:t,o=0;t>o;++o)a.push(i(n[o]));var u={type:f.NewExpression,callee:{type:f.Identifier,name:r},arguments:a};return p(u).copy(e),u}function i(e){var t=0>e,r={type:f.Literal,value:t?-e:e};if(p(r).setType(l.TYPES.NUMBER),!t)return r;var n={type:f.UnaryExpression,operator:"-",argument:r};return p(n).setType(l.TYPES.NUMBER),n}function s(e){var t=e.getStaticValue(),r=0>t,n={type:f.Literal,value:r?-t:t,extra:{}};return u.extend(n.extra,e.getExtra()),r&&(n.extra.staticValue=-t,n={type:f.UnaryExpression,operator:"-",argument:n,extra:{}},u.extend(n.extra,e.getExtra())),n}var o=require("../../base/common.js"),l=require("../../interfaces.js"),u=require("../../base/index.js"),c=require("estraverse"),f=o.Syntax,p=(l.TYPES,o.ANNO),h=e.transform=function(e,t){var r=new d(t);return r.transform(e)},d=function(e){e=e||{},this.foldConstants=void 0!==e.foldConstants?e.foldConstants:!0,this.controller=new c.Controller};d.prototype={transform:function(e){var t=this;return this.controller.replace(e,{enter:function(e,r){var a=p(e);if(a.isValid()){switch(e.type){case f.IfStatement:return t.handleIfStatement(e);case f.ConditionalExpression:return t.handleConditionalExpression(e);case f.LogicalExpression:return t.handleLogicalExpression(e);case f.AssignmentExpression:return t.handleAssignmentExpression(e);case f.VariableDeclarator:return t.handleVariableDeclarator(e);case f.NewExpression:return t.handleNewExpression(e);case f.VariableDeclaration:return t.handleVariableDeclaration(e)}return t.foldConstants&&n(e.type,r.type)?t.foldConstantExpression(e):void 0}}})},handleIfStatement:function(e){var t=p(e.test);if(t.hasStaticValue()||t.canObject()){this.controller.skip();var r=t.getStaticTruthValue();if(r===!0)return h(e.consequent);if(r===!1)return e.alternate?this.transform(e.alternate):{type:f.EmptyStatement}}},handleConditionalExpression:function(e){var t=p(e.test);if(t.hasStaticValue()||t.canObject()){this.controller.skip();var r=t.getStaticTruthValue();return r===!0?this.transform(e.consequent):this.transform(e.alternate)}},handleLogicalExpression:function(e){var t=p(e.left),r=p(e.right),n=t.getStaticTruthValue(),a=r.getStaticTruthValue();if("||"===e.operator){if(n===!1)return e.right;if(n===!0)return e.left;if(a===!1)return e.left}else if("&&"===e.operator){if(n===!1)return e.left;if(n===!0)return e.right;if(a===!0)return e.left;if(a===!1)return{type:f.Literal,value:"false",extra:{type:"boolean"}}}},handleAssignmentExpression:function(e){return e.right=this.foldConstantExpression(e.right),e},handleNewExpression:function(e){var r=e.arguments,n=[];return r.forEach(function(e){var r=p(e);t(r)?n.push(s(r)):n.push(e)}),e.arguments=n,e},handleVariableDeclaration:function(e){var t=e.declarations,r=[];return t.forEach(function(e){var t=p(e);t.isUndefined()||r.push(e)}),e.declarations=r,e},handleVariableDeclarator:function(e){return e.init?(e.init=this.foldConstantExpression(e.init),e):void 0},foldConstantExpression:function(e){var n=p(e);if(this.foldConstants){if(t(n))return s(n);if(r(n))return a(n)}return e}};var x=[f.BinaryExpression,f.UnaryExpression,f.MemberExpression],E=[f.BinaryExpression,f.ReturnStatement,f.CallExpression]}(exports);


},{"../../base/common.js":132,"../../base/index.js":135,"../../interfaces.js":168,"estraverse":91}],104:[function(require,module,exports){
!function(e){function r(e,r){var a,n;for(var t in e)for(a=0;a<r[t].length;a++)n=r[t][a],-1==e[t].indexOf(n)&&e[t].push(n)}function a(e,r,n){if(-1==r.indexOf(e)){if(n&&n.hasOwnProperty(e)){var t=n[e];return void t.forEach(function(e){a(e,r,n)})}r.push(e)}}var n=require("estraverse"),t=require("./../base/scope.js"),s=n.Syntax,o={normalizedCoords:["coords"],height:["coords"],width:["coords"]},i=function(e,c,l,m){var u=new t(c,null,{name:"global"}),p=[u],h={shaderParameters:[],systemParameters:[]};m=m||{};var d=null,v=new n.Controller;return v.traverse(c,{enter:function(a){var n,o=a.type;switch(o){case s.FunctionDeclaration:var u=p[p.length-1];u.declareVariable(a.id.name,!1),n=new t(a,u,{name:a.id.name}),p.push(n),n.str()==e?-1!=l&&a.params.length>l&&(d=a.params[l].name):v.skip();break;case s.CallExpression:var f=a.arguments.reduce(function(e,r,a){return r.name&&r.name==d?a:e},-1);n=p[p.length-1];var b=n.getVariableIdentifier(a.callee.name);b&&!m[b]&&(m[b]=!0,r(h,i(b,c,f,m)))}},leave:function(e){var r=e.type;switch(r){case s.FunctionDeclaration:p.pop(),d=null;break;case s.MemberExpression:var n=e.property.name;d&&e.object.name==d?a(n,h.shaderParameters):e.object.type==s.ThisExpression?a(n,h.systemParameters,o):"_env"==e.object.name&&a(n,h.shaderParameters)}}}),h};e.extractParameters=function(e,r){r=r||{};var a=r.context||"global.shade",n=r.param||0;return i(a,e,n)}}(exports);


},{"./../base/scope.js":136,"estraverse":91}],105:[function(require,module,exports){
!function(e){var t=require("estraverse"),i=(require("assert"),require("../../base/index.js")),r=(require("./../../base/common.js"),require("../../interfaces.js")),n=require("./statement-split-traverser"),s=t.Syntax,a=t.VisitorOption,o=function(e){this.declarationStack=[]};i.extend(o.prototype,{execute:function(e){return t.replace(e,{enter:this.enterNode.bind(this),leave:this.exitNode.bind(this)}),e},enterNode:function(e,t){switch(e.type){case s.FunctionExpression:case s.FunctionDeclaration:case s.Program:this.declarationStack.push([]);break;case s.VariableDeclarator:this.addDeclaredIdentifier(e.id.name)}},exitNode:function(e,t){switch(e.type){case s.FunctionExpression:case s.FunctionDeclaration:case s.Program:return this.addTopDeclaration(e,t);case s.VariableDeclaration:return this.removeMidCodeDeclaration(e,t)}},removeMidCodeDeclaration:function(e,t){var i,r=t.type==s.ForStatement&&t.init==e;i=r?{type:s.SequenceExpression,expressions:[],loc:e.loc}:{type:s.BlockStatement,body:[],loc:e.loc};for(var n=e.declarations,a=0;a<n.length;++a){var o=n[a];if(o.init){var p={type:s.AssignmentExpression,operator:"=",left:o.id,right:o.init,loc:o.loc};if(r)i.expressions.push(p);else{var l={type:s.ExpressionStatement,expression:p,loc:o.loc};i.body.push(l)}}}return r&&1==i.expressions.length?i.expressions[0]:i},addTopDeclaration:function(e,t){var i=this.declarationStack.pop();if(i.length>0){for(var r={type:s.VariableDeclaration,declarations:[],kind:"var"},n=0;n<i.length;++n)r.declarations[n]={type:s.VariableDeclarator,id:{type:s.Identifier,name:i[n]},init:null};e.type==s.Program?e.body.unshift(r):e.body.body&&e.body.body.unshift(r)}return e},addDeclaredIdentifier:function(e){var t=this.declarationStack[this.declarationStack.length-1];-1==t.indexOf(e)&&t.push(e)}});var p=function(e){n.call(this,e),this.skipExtraction.forInitUpdate=!0,this.statementIdentifierInfo={}};i.createClass(p,n,{onGatherSplitInfo:function(){this.statementIdentifierInfo={}},statementSplitEnter:function(e,t){switch(e.type){case s.FunctionExpression:return a.Skip;case s.Identifier:return this.identifierEnter(e,t);case s.AssignmentExpression:case s.UpdateExpression:return this.assignmentEnter(e,t)}},statementSplitExit:function(e,t){switch(e.type){case s.AssignmentExpression:case s.UpdateExpression:return this.assignmentExit(e,t)}},identifierEnter:function(e,t){if(t.type!=s.MemberExpression&&(t.type!=s.AssignmentExpression||t.left!=e)){var i=e.name;this.statementIdentifierInfo[i]||(this.statementIdentifierInfo[i]={reads:[],lastWrite:null}),this.statementIdentifierInfo[i].reads.push(e)}},assignmentEnter:function(e,t){if(t.type!=s.ExpressionStatement){if((e.left||e.argument).type!=s.Identifier)throw r.throwError(e,"We only support nested assignments for simple identifiers, not objects or arrays.");if(e.type==s.UpdateExpression){var i=!e.prefix;e={type:s.AssignmentExpression,operator:"=",left:{type:s.Identifier,name:e.argument.name,loc:e.argument.loc},right:{type:s.BinaryExpression,operator:"++"==e.operator?"+":"-",left:{type:s.Identifier,name:e.argument.name,loc:e.argument.loc},right:{type:s.Literal,value:1}},loc:e.loc,_usePrevValue:i}}else if(e.type==s.AssignmentExpression&&"="!=e.operator){var n=e.operator.substr(0,e.operator.length-1);e.operator="=",e.right={type:s.BinaryExpression,operator:n,left:{type:s.Identifier,name:e.left.name,loc:e.right.loc},right:e.right,loc:e.right.loc}}var a=e.left.name,o=this.statementIdentifierInfo[a];return o&&o.reads.length>0&&(e._preIdentifierWriter=o.lastWrite),e}},assignmentExit:function(e,t){if(t.type!=s.ExpressionStatement){var i=e._usePrevValue;delete e._usePrevValue;var r=e.left.name;this.statementIdentifierInfo[r]||(this.statementIdentifierInfo[r]={reads:[],lastWrite:null});var n=this.statementIdentifierInfo[r],a={type:s.Identifier,name:r,loc:e.loc};if(i||void 0!==e._preIdentifierWriter&&e._preIdentifierWriter==n.lastWrite){var o=this.getFreeName();if(n.lastWrite)n.lastWrite.left.name=o;else{var p={type:s.AssignmentExpression,left:{type:s.Identifier,name:o},right:{type:s.Identifier,name:r},operator:"="};this.assignmentsToBePrepended.unshift(p)}for(var l=0;l<n.reads.length;++l)n.reads[l].name=o}return n.reads=[],delete e._preIdentifierWriter,n.lastWrite=e,i?a.name=o:this.statementIdentifierInfo[r].reads.push(a),this.assignmentsToBePrepended.push(e),a}}}),e.sanitize=function(e,t){var i=new o(t),r=new p(t);return e=i.execute(e),e=r.execute(e)}}(exports);


},{"../../base/index.js":135,"../../interfaces.js":168,"./../../base/common.js":132,"./statement-split-traverser":106,"assert":92,"estraverse":91}],106:[function(require,module,exports){
!function(e){var t=require("estraverse"),n=(require("assert"),require("../../base/index.js")),r=(require("./../../base/common.js"),require("../../interfaces.js")),s=(require("../../base/typeinfo.js").TypeInfo,require("../../base/annotation.js").ANNO),i=r.TYPES,a=r.OBJECT_KINDS,p=t.Syntax,o=function(e){e=e||{},this.scopes=[],this.preContinueStatements=[],this.currentStatementTmpUsed=[],this.assignmentsToBePrepended=[],this.skipExtraction={forInitUpdate:!1}};n.extend(o.prototype,{execute:function(e){return t.replace(e,{enter:this.enterNode.bind(this),leave:this.exitNode.bind(this)}),e},gatherStatmentSplitInfo:function(e){return this.currentStatementTmpUsed=[],this.assignmentsToBePrepended=[],this.onGatherSplitInfo(),t.replace(e,{enter:this.statementSplitEnter.bind(this),leave:this.statementSplitExit.bind(this)})},statementSplitEnter:function(e){},statementSplitExit:function(e){},onGatherSplitInfo:function(){},isRedundant:function(e){var n=!0;return t.traverse(e,{enter:function(e){switch(e.type){case p.AssignmentExpression:case p.UpdateExpression:case p.FunctionExpression:case p.FunctionDeclaration:case p.CallExpression:n=!1,this["break"]()}}}),n},pushScope:function(){var e={declared:[],tmpDeclared:[],tmpDeclaredTypes:[]};return this.scopes.push(e),e},popScope:function(){return this.scopes.pop()},getScope:function(){return this.scopes[this.scopes.length-1]},addPreContinueStatements:function(e){var t=this.preContinueStatements[this.preContinueStatements.length-1];t.push.apply(t,e)},getPreContinueStatements:function(){return this.preContinueStatements[this.preContinueStatements.length-1]},enterNode:function(e,t){switch(e.type){case p.FunctionExpression:case p.FunctionDeclaration:case p.Program:var n=this.pushScope();if(e.params)for(var r=0;r<e.params.length;++r)n.declared.push(e.params[r].name);break;case p.VariableDeclarator:this.addDeclaredIdentifier(e.id.name);break;case p.ContinueStatement:return this.extendContinueStatement(e);case p.ExpressionStatement:return this.performStatementSplit(e,[{pre:!0}]);case p.IfStatement:return this.performStatementSplit(e,[{prop:"test",pre:!0}]);case p.ReturnStatement:if(e.argument)return this.performStatementSplit(e,[{prop:"argument",pre:!0}]);break;case p.WhileStatement:return this.performStatementSplit(e,[{prop:"test",pre:!0,post:!0}],"body");case p.ForStatement:var s=[];return this.skipExtraction.forInitUpdate||s.push({prop:"init",pre:!0,extract:!0}),s.push({prop:"test",pre:!0,post:!0}),this.skipExtraction.forInitUpdate||s.push({prop:"update",post:!0,extract:!0}),this.performStatementSplit(e,s,"body");case p.DoWhileStatement:return this.performStatementSplit(e,[{prop:"test",post:!0}],"body")}},exitNode:function(e,t){switch(e.type){case p.FunctionExpression:case p.FunctionDeclaration:return this.addTmpDeclaration(e);case p.Program:return this.removeRedundantBlocks(e,"body"),this.addTmpDeclaration(e);case p.BlockStatement:return this.removeRedundantBlocks(e,"body");case p.SwitchCase:return this.removeRedundantBlocks(e,"consequent");case p.ContinueStatement:delete e._extended;break;case p.WhileStatement:case p.ForStatement:case p.DoWhileStatement:e._preContinueStacked&&(delete e._preContinueStacked,this.preContinueStatements.pop())}},addDeclaredIdentifier:function(e){var t=this.getScope().declared;-1==t.indexOf(e)&&t.push(e)},isNameDeclared:function(e,t){for(var n=this.scopes.length;n--;)if(-1!=this.scopes[n].declared.indexOf(e))return!0;return t&&-1!=this.getScope().tmpDeclared.indexOf(e)?!0:!1},getFreeName:function(e,t){var n,r=0,s=void 0===e,i=this._getTypedPrefix(e,t);do n=i+r++;while(this.isNameDeclared(n,s)||-1!=this.currentStatementTmpUsed.indexOf(n));this.currentStatementTmpUsed.push(n);var a=this.getScope();return-1==a.tmpDeclared.indexOf(n)&&(a.tmpDeclared.push(n),a.tmpDeclaredTypes.push({type:e,kind:t})),n},getStatementTmpUsedCount:function(){return this.currentStatementTmpUsed.length},reduceStatementTmpUsed:function(e){this.currentStatementTmpUsed.length=e},removeStatementTmpUsedAfter:function(e){var t=this.currentStatementTmpUsed.indexOf(e);if(-1!=t){t++;var n=this.currentStatementTmpUsed.length-t;this.currentStatementTmpUsed.splice(t,n)}},_getTypedPrefix:function(e,t){if(void 0===e)return"_tmp";switch(e){case i.BOOLEAN:return"_boolTmp";case i.NUMBER:return"_numTmp";case i.INT:return"_intTmp";case i.STRING:return"_stringTmp";case i.OBJECT:switch(t){case a.FLOAT2:return"_vec2Tmp";case a.FLOAT3:return"_vec3Tmp";case a.FLOAT4:return"_vec4Tmp";case a.MATRIX3:return"_mat3Tmp";case a.MATRIX4:return"_mat4Tmp"}}},performStatementSplit:function(e,t,n){n&&!e._preContinueStacked&&(this.preContinueStatements.push([]),e._preContinueStacked=!0);for(var r=e,s=e,i=t.length;i--;){var a=t[i].prop,o=r;if(a&&(o=r[a]),a&&t[i].extract?(this.onGatherSplitInfo(),this.currentStatementTmpUsed=[],this.assignmentsToBePrepended=o?[o]:[],r[a]=null):(o=this.gatherStatmentSplitInfo(o),a?r[a]=o:s=o),this.assignmentsToBePrepended.length>0&&(t[i].pre&&(s=this.getSplittedStatementBlock(this.assignmentsToBePrepended,s)),t[i].post)){var c=r[n],d=this.getSplittedStatementBlock(this.assignmentsToBePrepended);c&&c.type==p.BlockStatement?c.body.push(d):(c&&d.body.unshift(c),r[n]=d),this.addPreContinueStatements(this.assignmentsToBePrepended)}}return s},extendContinueStatement:function(e){if(!e._extended){e._extended=!0;var t=this.getPreContinueStatements();return 0==t.length?e:this.getSplittedStatementBlock(t,e)}},getSplittedStatementBlock:function(e,t){for(var r={type:p.BlockStatement,body:[],loc:t&&t.loc},s=0;s<e.length;++s){var i=n.deepExtend({},e[s]);r.body.push({type:p.ExpressionStatement,expression:i,loc:i.loc})}return!t||t.type==p.ExpressionStatement&&this.isRedundant(t)||r.body.push(t),r},removeRedundantBlocks:function(e,t){for(var n=e[t],r=n.length;r--;)if(n[r].type==p.BlockStatement){var s=[r,1];s.push.apply(s,n[r].body),n.splice.apply(n,s)}return e},addTmpDeclaration:function(e){var t=this.getScope().tmpDeclared,n=this.getScope().tmpDeclaredTypes;if(0!=t.length){var r;r=e.type==p.Program?e.body:e.body.body;var i=null;r[0].type==p.VariableDeclaration?i=r[0]:(i={type:p.VariableDeclaration,declarations:[],kind:"var"},r.unshift(i));for(var a=0;a<t.length;++a){var o={type:p.VariableDeclarator,id:{type:p.Identifier,name:t[a]},init:null};void 0!==n[a].type&&s(o).setType(n[a].type,n[a].kind),i.declarations.push(o)}this.popScope()}}}),module.exports=o}(module);


},{"../../base/annotation.js":130,"../../base/index.js":135,"../../base/typeinfo.js":137,"../../interfaces.js":168,"./../../base/common.js":132,"assert":92,"estraverse":91}],107:[function(require,module,exports){
!function(e){function t(e,t){var i=y(e,{omitExceptions:!0});return f(i,n,{direction:"backward",start:new b,merge:f.merge(r)}),e}function n(e){if(this.type||!this.astNode)return e;var t=this.kill=this.kill||h.findVariableAssignments(this.astNode),n=this.generate=this.generate||i(this.astNode,t),a=this.generatedSemantics=this.generatedSemantics||o(this.astNode),s=null;if(n&&n.deps.size){var u=e.filter(function(e){return e.name==n.def});u.length&&(s=new b,n.deps.forEach(function(e){var t={name:e,type:u[0].type};s.add(t)}))}var c=new b;return t.forEach(function(t){c=new b(e.filter(function(e){return e.name==t}))}),r(b.minus(e,c),r(s,a))}function r(e,t){var n=function(e,t){return{name:e.name,type:e.type!=t.type?w.UNKNOWN:e.type}};if(!e&&t)return new b(t);var r=new b(e);return t&&t.forEach(function(t){var i=t.name,a=e.filter(function(e){return e.name==i});a.length?a[0].type!==t.type&&(r.add(n(t,a[0])),r["delete"](a[0])):r.add(t)}),r}function i(e,t){var n=t.size;if(0==n)return null;if(n>1)throw new Error("Code not sanitized, found multiple definitions in one statement");return{def:t.values()[0],deps:a(e)}}function a(e){var t=new b;return e||e.type?(l(e,{AssignmentExpression:function(e){e(this.right)},VariableDeclarator:function(e){e(this.init)},Identifier:function(){t.add(this.name)},NewExpression:function(){},MemberExpression:function(){this.object.type==g.Identifier&&this.property.type==g.Identifier&&t.add(this.object.name+"."+this.property.name)},CallExpression:function(){if(this.callee.type==g.MemberExpression){var e=this.callee;if(x.hasOwnProperty(e.object.name)){var n=x[e.object.name];if(n.hasOwnProperty(e.property.name)){var r=n[e.property.name];return void(t=r(this.arguments,t))}}else if(E.hasOwnProperty(e.property.name))return r=E[e.property.name],void(t=r(e,this.arguments,t));console.log("Unhandled: ",d.generate(this))}}}),t):t}function s(e){switch(e.type){case g.Identifier:return e.name;case g.MemberExpression:return e.object.name+"."+e.property.name;default:return console.error("No name for",d.generate(e)),"?"}}function o(e){var t=new b;return l(e,{CallExpression:function(e){if(this.callee.type==g.MemberExpression&&u(this.callee.object)){var n=this.callee.property.name;switch(n){case"diffuse":case"phong":c(w.COLOR,this.arguments[0],t),c(w.NORMAL,this.arguments[1],t)}e(this.callee)}else e(this.callee),e(this.arguments)}}),t}function u(e){return e?e.type==g.NewExpression?e.callee.type==g.Identifier&&"Shade"===e.callee.name:e.type==g.CallExpression&&e.callee.type==g.MemberExpression?u(e.callee.object):!1:!1}function c(e,t,n){l(t,{Identifier:function(){v(this).setSemantic(e),p(n,{name:this.name,type:e})},MemberExpression:function(){this.object.type==g.Identifier&&this.property.type==g.Identifier&&(v(this).setSemantic(e),p(n,{name:s(this),type:e}))}})}function p(e,t){var n=e.filter(function(e){return e.name==t.name});n.length?n[0].type!==t.type&&(e.add({name:t.name,type:w.UNKNOWN}),e["delete"](n[0])):e.add(t)}var l=require("walkes"),f=require("analyses"),m=require("../../base/common.js"),d=require("escodegen"),h=require("./../settools.js"),y=require("esgraph"),g=m.Syntax,b=f.Set,v=m.ANNO,w={COLOR:"color",NORMAL:"normal",UNKNOWN:"unknown"},N={mix:function(e,t){return t=b.union(t,a(e[0])),t=b.union(t,a(e[1]))}},E={normalize:function(e,t,n){return n.add(s(e.object)),n},mul:function(e,t,n){return n.add(s(e.object)),n=b.union(n,a(t[0]))}},x={Math:N};t.Semantic=w,e.exports=t}(module);


},{"../../base/common.js":132,"./../settools.js":108,"analyses":1,"escodegen":75,"esgraph":87,"walkes":98}],108:[function(require,module,exports){
var Set=require("analyses").Set,walk=require("estraverse"),codegen=require("escodegen"),Syntax=walk.Syntax,Tools={getSetLabels:function(e){return e?e.size?"Set: {"+e.values().map(function(e){return e.label}).join(", ")+"}":"Set: {}":"Set: null"},printMap:function(e,t,a){a=a||JSON.stringify;for(var n in t[2]){var r=t[2][n];r.label||r.type||!r.astNode?console.log(r.label||r.type,a(e.get(r))):console.log(codegen.generate(r.astNode),a(e.get(r)))}},findVariableAssignments:function(e,t){var a=new Set;return walk.traverse(e,{leave:function(e,n){switch(e.type){case Syntax.AssignmentExpression:e.left.type==Syntax.Identifier&&a.add(e.left.name);break;case Syntax.VariableDeclarator:e.id.type!=Syntax.Identifier||t&&!e.init||a.add(e.id.name);break;case Syntax.UpdateExpression:e.argument.type==Syntax.Identifier&&a.add(e.argument.name)}}}),a}};module.exports=Tools;


},{"analyses":1,"escodegen":75,"estraverse":91}],109:[function(require,module,exports){
!function(e){function t(e,t){var r=V(e.body,{omitExceptions:!0});R=!0,M=!0,F=t||{};var n=b(r,i,{direction:"backward",start:null,merge:b.merge(c)}),a=n.get(r[0]),o={},s={transferPointOk:R,transferNormalOk:M,transferArgs:[]},p={};a.forEach(function(e){var t=e.split(";"),r=t[0],n=1*t[1];return T.getSpaceFromSpaceVector(n)==x.RESULT?void(p[r]=!0):(o[r]||(o[r]=[]),void o[r].push(n))});for(var l=0;l<e.params.length;++l){var f=e.params[l].name;s.transferArgs.push(p[f])}return F[e.id.name]=s,o}function r(e,t,r){e.spaceInfo||(e.spaceInfo={}),e.spaceInfo[t]=r}function n(e,t,n){var i=n&&n.filter(function(e){return T.getSpaceFromSpaceVector(e)!=x.RESULT});r(e,t,i)}function i(e){if(this.type||!this.astNode)return e;var t=this.kill=this.kill||w.findVariableAssignments(this.astNode,!0),i=this.generate=this.generate||l(this.astNode,t),o=new A,p=null,f=null;if(r(this.astNode,"transferSpaces",null),r(this.astNode,"hasSpaceOverrides",i.dependencies.spaceOverrides.length>0),i.def){var d=i.def;r(this.astNode,"def",d),f=a(e,d)}else f=new A([j.OBJECT]),this.astNode.type==I.ReturnStatement&&(f.add(j.RESULT_NORMAL),f.add(j.RESULT_POINT));return n(this.astNode,"transferSpaces",f),p=s(o,i.dependencies,f),n(this.astNode,"finalSpaces",p&&p.size>0?p:null),e=new A(e.filter(function(e){return!t.has(e.split(";")[0])})),c(e,o)}function a(e,t){var r=new A(e.filter(function(e){return e.split(";")[0]==t}).map(function(e){return 1*e.split(";")[1]}));return 0==r.size&&r.add(j.OBJECT),r}function o(e,t){var r=T.getVectorFromSpaceVector(e);return r==N.NONE||r==N.NORMAL&&!t.normalSpaceViolation||r==N.POINT&&!t.pointSpaceViolation}function s(e,t,r){var n=new A;t.toObjectSet.forEach(function(t){e.add(t+";"+j.OBJECT)}),r.forEach(function(r){var i=T.getSpaceFromSpaceVector(r),a=o(r,t);if(i!=x.OBJECT&&t.hasDirectVec3SpaceOverride()){if(i!=x.RESULT)throw new Error("Detection of repeated space conversion. Not supported!");a=!1}n.add(r),a||i!=x.RESULT||(T.getVectorFromSpaceVector(r)==N.NORMAL?M=!1:R=!1),r=a?r:j.OBJECT,t.propagateSet.forEach(function(t){e.add(t+";"+r)})});for(var i=t.spaceOverrides,a=0;a<i.length;++a)s(e,i[a].dependencies,new A([i[a].space]));return n}function c(e,t){var r=e?new A(e):new A;return t&&t.forEach(function(e){r.add(e)}),r}function p(){this.normalSpaceViolation=!1,this.pointSpaceViolation=!1,this.propagateSet=new A,this.toObjectSet=new A,this.spaceOverrides=[]}function l(e,t){var n={def:null,dependencies:new p};if(!e&&!e.type)return n;var i=t.size;if(i>1)throw new Error("Code not sanitized, found multiple definitions in one statement");1==i&&(n.def=t.values()[0]);var a=e.extra&&e.extra.kind==k.FLOAT3;return a?(h(e,n.dependencies),r(e,"propagateSet",n.dependencies.propagateSet.values()),r(e,"normalSpaceViolation",n.dependencies.normalSpaceViolation),r(e,"pointSpaceViolation",n.dependencies.pointSpaceViolation)):u(e,n.dependencies),n}function f(e){var t=e.callee;if(t.type==I.MemberExpression&&t.object.type==I.Identifier&&"Space"==t.object.name){var r=0;switch(t.property.name){case"transformPoint":r=N.POINT;break;case"transformDirection":r=N.NORMAL}if(r<<=3){var n=e.arguments[0];if(n.type!=I.MemberExpression||n.object.type!=I.Identifier||"Space"!=n.object.name||n.property.type!=I.Identifier)throw new Error("The first argument of '"+t.property+"' must be a Space enum value.");switch(n.property.name){case"VIEW":r+=x.VIEW;break;case"WORLD":r+=x.WORLD}return r}}return null}function d(e,t,n){var i=f(e);if(i){var a=new p;return h(e.arguments[1],a),t.addSpaceOverride(i,n,a),r(e,"spaceOverride",i),r(e,"propagateSet",a.propagateSet.values()),r(e,"normalSpaceViolation",a.normalSpaceViolation),r(e,"pointSpaceViolation",a.pointSpaceViolation),!0}return!1}function u(e,t){O(e,{VariableDeclaration:function(){},Identifier:function(){this.extra.kind==k.FLOAT3&&t.toObjectSet.add(this.name)},MemberExpression:function(e){if(this.extra.kind==k.FLOAT3){if(this.object.type==I.Identifier&&this.property.type==I.Identifier)if(this.object.extra.global)t.propagateSet.add("env."+this.property.name);else if("uexp"!==this.object.name)throw new Error("Member Access of non 'env' object in space equation - not supported: "+y.generate(this))}else e(this.object),e(this.property)},CallExpression:function(e){d(this,t,!0)||(e(this.callee),this.arguments.map(e))}})}function h(e,t){O(e,{VariableDeclaration:function(){},AssignmentExpression:function(e){e(this.right)},Identifier:function(){this.extra.kind==k.FLOAT3&&(t.propagateSet.add(this.name),r(this,"propagate",!0))},NewExpression:function(e){"Vec3"==this.callee&&v(this.arguments,e,t,!1)},MemberExpression:function(e){if(this.extra.kind==k.FLOAT3){if(this.object.type==I.Identifier&&this.property.type==I.Identifier){if(this.object.extra.global)t.propagateSet.add("env."+this.property.name);else if("uexp"!==this.object.name)throw new Error("Member Access of non 'env' object in space equation - not supported.");r(this,"propagate",!0)}}else e(this.object),e(this.property)},CallExpression:function(e){if(!d(this,t,!1)){if(this.callee.type==I.MemberExpression){t.pointSpaceViolation=!0;var r=this.callee.object,n=r.extra.kind,i=this.callee.property.name,a=this.arguments;if(C[n]&&C[n][i])return void C[n][i](r,a,e,t);q&&console.log("Unhandled: ",y.generate(this))}else if(this.callee.type==I.Identifier){var o=this.callee.name,s=F&&F[o];if(s){s.transferPointOk||(t.pointSpaceViolation=!0),s.transferNormalOk||(t.normalSpaceViolation=!0);for(var c=s.transferArgs.length;c--;)s.transferArgs[c]?e(this.arguments[c]):u(this.arguments[c],t);return}}t.pointSpaceViolation=!0,t.normalSpaceViolation=!0,u(this,t)}}})}function m(e,t,r,n){v(t,r,n,!0),r(e)}function S(e,t,r,n){v(t,r,n,!1),r(e)}function v(e,t,r,n){return n||0!=e.length?e.length>1?void(r.normalSpaceViolation=!0):void(1==e.length&&(e[0].extra.kind==k.FLOAT3?t(e[0]):n&&g(e[0].extra.type)?u(e[0],r):r.normalSpaceViolation=!0)):void(r.normalSpaceViolation=!0)}function g(e){return e==L.NUMBER||e==L.INT}var O=require("walkes"),b=require("analyses"),E=require("../base/common.js"),V=require("esgraph"),y=require("escodegen"),w=require("./settools.js"),T=require("./../interfaces.js"),x=T.SpaceType,N=T.VectorType,j=T.SpaceVectorType,I=E.Syntax,A=b.Set,L=T.TYPES,k=T.OBJECT_KINDS,R=!0,M=!0,F=null,q=!1;p.prototype.addSpaceOverride=function(e,t,r){this.spaceOverrides.push({space:e,fromObjectSpace:t,dependencies:r})},p.prototype.hasDirectVec3SpaceOverride=function(){for(var e=this.spaceOverrides.length;e--;)if(!this.spaceOverrides[e].fromObjectSpace)return!0;return!1};var C={float3:{add:S,sub:S,cross:S,mul:m,div:m,normalize:m}};e.exports={analyze:t}}(module);


},{"../base/common.js":132,"./../interfaces.js":168,"./settools.js":108,"analyses":1,"escodegen":75,"esgraph":87,"walkes":98}],110:[function(require,module,exports){
!function(e){var t=require("../../base/common.js"),n=require("../../interfaces.js"),r=require("../constants/evaluator.js"),i=require("estraverse"),a=require("../../base/errors.js"),o=require("escodegen"),s=t.Syntax,c=n.TYPES,l=t.ANNO,u=a.generateErrorInformation,p=a.ERROR_TYPES,f=!1,d={ArrayExpression:function(e,t,n){var r=l(e),i=n.getTypeInfo(e.elements),a=l({});r.setType(c.ARRAY),i.forEach(function(t,n){n?a.setCommonType(a,t)||r.setInvalid(u(e,p.SHADEJS_ERROR,"shade.js does not support inhomogenous arrays: [",i.map(function(e){return e.getTypeString()}).join(", "),"]")):a.copy(t)})},Literal:function(e){var t=void 0!==e.raw?e.raw:e.value,n=l(e),i=parseFloat(t);isNaN(i)?"true"===t||"false"===t?n.setType(c.BOOLEAN):"null"===t?n.setType(c.NULL):n.setType(c.STRING):-1==t.toString().indexOf(".")?n.setType(c.INT):n.setType(c.NUMBER),n.isNull()||n.setStaticValue(r.getStaticValue(e))},ExpressionStatement:function(e){var t=l(e),n=l(e.expression);t.copy(n)},ReturnStatement:function(e,t,n){var r=l(e),i=n.getTypeInfo(e.argument);i?r.copy(i):r.setType(c.UNDEFINED),n.getScope().updateReturnInfo(r)},NewExpression:function(e,t,n){var r,i=l(e);i.setDynamicValue();var a=n.getScope(),o=a.getBindingByName(e.callee.name);if(o&&o.hasConstructor()){var s=o.getConstructor(),c=n.getTypeInfo(e.arguments);try{var f=s.evaluate(i,c,a);i.setFromExtra(f)}catch(d){return void i.setInvalid(d)}if(s.computeStaticValue)try{r=s.computeStaticValue(i,n.getTypeInfo(e.arguments),a),void 0!==r&&i.setStaticValue(r)}catch(d){i.setDynamicValue()}}else i.setInvalid(u(e,p.REFERENCE_ERROR,e.callee.name,"is not defined"))},UnaryExpression:function(e,t,n){var i=l(e),a=n.getTypeInfo(e.argument),o=e.operator;switch(o){case"!":if(i.setType(c.BOOLEAN),a.canObject())return void i.setStaticValue(!1);break;case"+":case"-":a.canInt()?i.setType(c.INT):a.canNumber()?i.setType(c.NUMBER):i.setInvalid(u(e,p.NAN_ERROR));break;case"typeof":return i.setType(c.STRING),void(a.isValid()&&i.setStaticValue(a.getJavaScriptTypeString()));case"~":case"void":case"delete":default:i.setInvalid(u(e,p.SHADEJS_ERROR,o,"is not supported."))}a.hasStaticValue()?i.setStaticValue(r.getStaticValue(e)):i.setDynamicValue()},Identifier:function(e){"undefined"===e.name&&l(e).setType(c.UNDEFINED)},BinaryExpression:function(e,t,n){var i,a=n.getTypeInfo(e.left),s=n.getTypeInfo(e.right),f=l(e),d=e.operator;if(!a.isValid()||!s.isValid())return void f.setInvalid();switch(d){case"+":case"-":case"*":case"/":case"%":if(a.canInt()&&s.canInt())"/"==d?f.setType(c.NUMBER):f.setType(c.INT);else if(a.canInt()&&s.isNumber()||s.canInt()&&a.isNumber())f.setType(c.NUMBER);else if(a.isNumber()&&s.isNumber())f.setType(c.NUMBER);else if(a.isInt()&&s.isNull()||s.isInt()&&a.isNull())f.setType(c.INT);else if(a.isNumber()&&s.isNull()||s.isNumber()&&a.isNull())f.setType(c.NUMBER);else{var y="";a.isNullOrUndefined()?y=o.generate(e.left)+" is undefined":s.isNullOrUndefined()&&(y=o.generate(e.right)+" is undefined"),f.setInvalid(u(e,p.NAN_ERROR,y))}break;case"===":case"!==":if(f.setType(c.BOOLEAN),a.isUndefined()||s.isUndefined())return i=a.isUndefined()&&s.isUndefined(),void f.setStaticValue("==="==d?i:!i);break;case"==":case"!=":case">":case"<":case">=":case"<=":if(f.setType(c.BOOLEAN),a.isUndefined()||s.isUndefined())return i=a.isUndefined()&&s.isUndefined(),void f.setStaticValue("!="==d?!i:i);break;default:return void f.setInvalid(u(e,p.SHADEJS_ERROR,d,"is not supported."))}a.hasStaticValue()&&s.hasStaticValue()?f.setStaticValue(r.getStaticValue(e)):f.setDynamicValue()},UpdateExpression:function(e,t,n){var r=n.getTypeInfo(e.argument),i=l(e);if(r.canNumber()){if(i.copy(r),e.prefix&&r.hasStaticValue())if("++"==e.operator)i.setStaticValue(r.getStaticValue()+1);else{if("--"!=e.operator)throw new Error("Operator not supported: "+e.operator);i.setStaticValue(r.getStaticValue()-1)}}else i.setInvalid(u(e,p.NAN_ERROR))},AssignmentExpression:function(e,t,n){var r=n.getTypeInfo(e.right),i=l(e);if(i.copy(r),i.setDynamicValue(),i.clearUniformDependencies(),e.left.type==s.Identifier&&!n.inDeclaration()&&r.isValid()){var a=e.left.name,o=n.getScope();o.updateTypeInfo(a,r,e)}},MemberExpression:function(e,r,i){var a=i.getTypeInfo(e),o=i.getTypeInfo(e.object),s=l(e.property),f=i.getScope();if(!o.isValid())return void a.setInvalid();if(e.computed){if(o.isArray()){var d=i.getTypeInfo(e.property);d.canNumber()||n.throwError(e,"Expected 'int' or 'number' type for array accessor");var y=o.getArrayElementType();return void a.setType(y.type,y.kind)}return void a.setInvalid(u(e,p.SHADEJS_ERROR,"no array access to object yet"))}var v=e.property.name,E=t.getObjectReferenceFromNode(e.object,f);if(E||n.throwError(e,"ReferenceError: "+e.object.name+" is not defined. Context: "+f.str()),!E.isValid()||E.getType()==c.UNDEFINED)return void a.setInvalid(u(e,p.TYPE_ERROR,"Cannot read property '"+v+"' of undefined"));if(E.getType()!=c.OBJECT)return void a.setType(c.UNDEFINED);var g=f.getObjectInfoFor(E);if(!g)return void a.setInvalid(u(e,p.SHADEJS_ERROR,"Internal: Incomplete registration for object:",E.getTypeString(),",",JSON.stringify(e.object)));if(o.copy(E),!g.hasOwnProperty(v))return a.setType(c.UNDEFINED),void s.setType(c.UNDEFINED);var I=g[v];s.setFromExtra(I),a.copy(s)},CallExpression:function(e,t,r){var i,a,d=l(e),y=r.getScope(),v=r.getTypeInfo(e.arguments);if(!v.every(function(e){return e.isValid()}))return void d.setInvalid(u(e,p.SHADEJS_ERROR,"Not all arguments types of call expression could be evaluated"));if(d.setDynamicValue(),e.callee.type==s.MemberExpression){var E=r.getTypeInfo(e.callee);if(!E.isValid())return void d.setInvalid();var g=e.callee.object,I=e.callee.property.name,R=r.getTypeInfo(g);R||n.throwError(e,"Internal: No object info for: "+g);var T=y.getObjectInfoFor(R);if(T||n.throwError(e,"Internal Error: No object registered for: "+R.getTypeString()+JSON.stringify(e.object)),!E.isFunction())return void(T.hasOwnProperty(I)?d.setInvalid(u(e,p.TYPE_ERROR,"Property '"+I+"' of object #<"+R.getTypeString()+"> is not a function")):d.setInvalid(u(e,p.TYPE_ERROR,(g.type==s.ThisExpression?"'this'":R.getTypeString())+" has no method '"+I+"'")));if(!T.hasOwnProperty(I))return void d.setType(c.UNDEFINED);var N=T[I];"function"!=typeof N.evaluate&&n.throwError(e,"Internal: no handler registered for '"+I+"'");try{i=N.evaluate(d,v,y,R,r),d.setFromExtra(i)}catch(S){return void d.setInvalid(u(e,S.message))}return"function"!=typeof N.computeStaticValue?void(f&&console.warn("No static evaluation exists for function",o.generate(e))):(a=N.computeStaticValue(d,v,y,R,r),void(void 0!==a&&d.setStaticValue(a)))}if(e.callee.type!=s.Identifier)d.setInvalid(u(e,p.SHADEJS_ERROR,"Internal:","Unhandled CallExpression",e.callee.type));else{var m=e.callee.name,V=y.getBindingByName(m);if(!V)return void d.setInvalid(u(e,p.REFERENCE_ERROR,m,"is not defined"));if(!V.isFunction())return void d.setInvalid(u(e,p.TYPE_ERROR,V.getTypeString(),"is not a function"));try{i=r.callFunction(y.getVariableIdentifier(m),v),i&&d.setFromExtra(i)}catch(S){d.setInvalid(u(e,p.SHADEJS_ERROR,"Failure in function call: ",S.message))}}},VariableDeclarator:function(e,t,n){var r=e.init?n.getTypeInfo(e.init):null,i=l(e);r&&(l(e.init).copy(r),i.copy(r))},VariableDeclaration:function(e,t,n){n.setInDeclaration(!1)},LogicalExpression:function(e,t,n){var r=n.getTypeInfo(e.left),i=n.getTypeInfo(e.right),a=l(e),o=r.getStaticTruthValue(),s=i.getStaticTruthValue(),f=e.operator;if("||"===f){if(o===!1)return void a.copy(i);if(o===!0)return void a.copy(r);if(s===!1)return void a.copy(r)}else if("&&"===f){if(o===!1)return void a.copy(r);if(o===!0)return void a.copy(i);if(s===!0)return void a.copy(r);if(s===!1)return a.setType(c.BOOLEAN),void a.setStaticValue(!1)}a.setCommonType(r,i)||a.setInvalid(u(e,p.SHADEJS_ERROR,"Can't evaluate polymorphic logical expression"))},ConditionalExpression:function(e,t,n){var r=n.getTypeInfo(e.consequent),i=n.getTypeInfo(e.alternate),a=n.getTypeInfo(e.test),o=l(e),s=a.getStaticTruthValue();s===!0?o.copy(r):s===!1?o.copy(i):o.setCommonType(r,i)?o.setDynamicValue():o.setInvalid(u(e,p.SHADEJS_ERROR,"Can't evaluate polymorphic conditional expression"))}};e.annotateRight=function(e,t,n){if(!t)throw Error("No node to analyze");var r=new i.Controller;e.setConstants(n||null),r.traverse(t,{enter:function(t){t.type==s.VariableDeclaration&&e.setInDeclaration(!0)},leave:function(t,n){return d.hasOwnProperty(t.type)?d[t.type].call(this,t,n,e):null}}),e.setConstants(null)}}(exports);


},{"../../base/common.js":132,"../../base/errors.js":134,"../../interfaces.js":168,"../constants/evaluator.js":102,"escodegen":75,"estraverse":91}],111:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),n=t.TYPES,r=t.OBJECT_KINDS,u=require("./tools.js"),O={mul:{type:n.FUNCTION,evaluate:function(){return{type:n.OBJECT,kind:r.COLOR_CLOSURE}}},add:{type:n.FUNCTION,evaluate:function(){return{type:n.OBJECT,kind:r.COLOR_CLOSURE}}}};u.extend(e,{id:"ColorClosure",kind:r.COLOR_CLOSURE,object:{constructor:null,"static":null},instance:O})}(exports);


},{"../../../interfaces.js":168,"./tools.js":120}],112:[function(require,module,exports){
!function(e){var r=require("../../../base/scope.js"),t=require("../../../base/index.js"),s={Shade:require("./shade.js"),Space:require("./space.js"),Math:require("./math.js"),Vec2:require("./vec2.js"),Vec3:require("./vec3.js"),Color:require("./vec3.js"),Vec4:require("./vec4.js"),Mat3:require("./mat3.js"),Mat4:require("./mat4.js"),Texture:require("./texture.js"),ColorClosure:require("./colorclosure.js")},i={name:"TypeInference",getByName:function(e){var r=s[e];return r||null},getInstanceForKind:function(e){for(var r in s)if(s[r].kind==e)return s[r].instance;return null}},c=function(e,s,c){c=c||{},t.extend(c,{registry:i}),r.call(this,e,s,c)};t.createClass(c,r,{registerGlobals:function(){this.registerObject("Math",s.Math),this.registerObject("Color",s.Color),this.registerObject("Vec2",s.Vec2),this.registerObject("Vec3",s.Vec3),this.registerObject("Vec4",s.Vec4),this.registerObject("Texture",s.Texture),this.registerObject("Shade",s.Shade),this.registerObject("Space",s.Space),this.registerObject("Mat3",s.Mat3),this.registerObject("Mat4",s.Mat4),this.declareVariable("_env")}}),exports.InferenceScope=c}(exports);


},{"../../../base/index.js":135,"../../../base/scope.js":136,"./colorclosure.js":111,"./mat3.js":113,"./mat4.js":114,"./math.js":115,"./shade.js":116,"./space.js":117,"./texture.js":119,"./vec2.js":121,"./vec3.js":122,"./vec4.js":123}],113:[function(require,module,exports){
!function(t){var a=require("../../../interfaces.js"),e=a.TYPES,c=a.OBJECT_KINDS,n=require("./tools.js"),u={type:e.OBJECT,kind:c.MATRIX3,evaluate:n.Mat.matConstructorEvaluate.bind(null,"Mat3")},l={},o={col:{type:e.FUNCTION,evaluate:n.Mat.colEvaluate.bind(null,"Mat3")}};n.Mat.attachMatMethods(o,"Mat3",["add","sub","mul","div"]),n.Vec.attachVecMethods(o,"Mat3",3,3,["mulVec"]),n.extend(t,{id:"Mat3",kind:c.MATRIX3,object:{constructor:u,"static":l},instance:o})}(exports);


},{"../../../interfaces.js":168,"./tools.js":120}],114:[function(require,module,exports){
!function(t){var a=require("../../../interfaces.js"),e=a.TYPES,c=a.OBJECT_KINDS,n=require("./tools.js"),u={type:e.OBJECT,kind:c.MATRIX4,evaluate:n.Mat.matConstructorEvaluate.bind(null,"Mat4")},l={},o={col:{type:e.FUNCTION,evaluate:n.Mat.colEvaluate.bind(null,"Mat4")}};n.Mat.attachMatMethods(o,"Mat4",["add","sub","mul","div"]),n.Vec.attachVecMethods(o,"Mat4",4,4,["mulVec"]),n.extend(t,{id:"Mat4",kind:c.MATRIX4,object:{constructor:u,"static":l},instance:o})}(exports);


},{"../../../interfaces.js":168,"./tools.js":120}],115:[function(require,module,exports){
!function(t){var e=require("../../../interfaces.js"),a=e.TYPES,n=require("../../../base/index.js"),r=require("./tools.js"),o=function(){},u=function(t){return function(e,a){if(r.allArgumentsAreStatic(a)){var n=a.map(function(t){return t.getStaticValue()});return Math[t].apply(null,n)}}},c=function(t,e,n){return function(r,o,u){if(-1!=e&&(!o||o.length!=e))throw new Error("Invalid number of parameters for Math."+t+", expected "+e);o.forEach(function(e,a){if(!e.canNumber()&&!e.isVector())throw new Error("Parameter "+a+" has invalid type for Math."+t+", expected 'number', but got "+e.getType())});var c={type:n||o[0].isVector()?a.OBJECT:a.NUMBER};return o[0].isVector()&&(c.kind=o[0].getKind()),c}},i={random:{type:a.FUNCTION,evaluate:function(t,e){if(e.length)throw new Error("Math.random has no parameters.");return{type:a.NUMBER}},computeStaticValue:o},abs:{type:a.FUNCTION,evaluate:function(t,a){r.checkParamCount(t.node,"Math.abs",[1],a.length);var n={};return a[0].canNumber()?n.type=a[0].getType():a[0].isVector()?(n.type=a[0].getType(),n.kind=a[0].getKind()):e.throwError(t.node,"InvalidType for Math.abs"),n},computeStaticValue:u("abs")},clamp:{type:a.FUNCTION,evaluate:function(t,n){if(r.checkParamCount(t.node,"Math.clamp",[3],n.length),n[1].canNumber()&&n[2].canNumber()){var o={};return n[0].canNumber()?o.type=a.NUMBER:n[0].isVector()&&(o.type=n[0].getType(),o.kind=n[0].getKind()),o}e.throwError(t.node,"Math.clamp not supported with argument types: "+n.map(function(t){return t.getTypeString()}).join(", "))},computeStaticValue:u("clamp")},smoothstep:{type:a.FUNCTION,evaluate:function(t,n,o){return r.checkParamCount(t.node,"Math.smoothstep",[3],n.length),n.every(function(t){return t.canNumber()})?{type:a.NUMBER}:n.every(function(t){return t.isVector()})?(n[0].equals(n[1])&&n[1].equals(n[2])||e.throwError(t.node,"Math.smoothstep: All arguments have to have the same type: "+n.map(function(t){return t.getTypeString()}).join(", ")),{type:a.OBJECT,kind:n[0].getKind()}):void e.throwError(t.node,"Math.smoothstep not supported with argument types: "+n.map(function(t){return t.getTypeString()}).join(", "))},computeStaticValue:u("smoothstep")},step:{type:a.FUNCTION,evaluate:function(t,n,o){return r.checkParamCount(t.node,"Shade.step",[2],n.length),r.allArgumentsCanNumber(n)?{type:a.NUMBER}:void e.throwError(t.node,"Shade.step not supported with argument types: "+n.map(function(t){return t.getTypeString()}).join(", "))},computeStaticValue:u("step")},fract:{type:a.FUNCTION,evaluate:r.Vec.anyVecArgumentEvaluate.bind(null,"fract"),computeStaticValue:u("fract")},mix:{type:a.FUNCTION,evaluate:function(t,a,o){r.checkParamCount(t.node,"Math.mix",[3],a.length);var u=r.Vec.checkAnyVecArgument(t.node,"Math.mix",a[0]),c={};return n.extend(c,r.Vec.getType(u)),a[1].equals(a[0])||e.throwError(t.node,"Math.mix types of first two arguments do no match: got "+a[0].getTypeString()+" and "+a[1].getTypeString()),a[2].canNumber()||e.throwError(t.node,"Math.mix third argument is not a number."),c},computeStaticValue:u("mix")},saturate:{type:a.FUNCTION,evaluate:function(t,n,o){r.checkParamCount(t.node,"Shade.saturate",[1],n.length);var u={type:a.NUMBER},c=n[0];return c.canNumber()||e.throwError(t.node,"Math.saturate not supported with argument type: "+c.getTypeString()),u},computeStaticValue:u("saturate")}},p=["E","PI","LN2","LOG2E","LOG10E","PI","SQRT1_2","SQRT2"],h=["acos","asin","atan","cos","exp","log","round","sin","sqrt","tan","ceil","floor"],m=[],s=["atan2","pow"],l=["max","min"];p.forEach(function(t){i[t]={type:a.NUMBER,staticValue:Math[t]}}),h.forEach(function(t){i[t]={type:a.FUNCTION,evaluate:c(t,1),computeStaticValue:u(t)}}),s.forEach(function(t){i[t]={type:a.FUNCTION,evaluate:c(t,2),computeStaticValue:u(t)}}),m.forEach(function(t){i[t]={type:a.FUNCTION,evaluate:c(t,1,a.INT),computeStaticValue:u(t)}}),l.forEach(function(t){i[t]={type:a.FUNCTION,evaluate:c(t,-1),computeStaticValue:u(t)}}),n.extend(t,{id:"Math",object:{constructor:null,"static":i,staticValue:Math},instance:i})}(exports);


},{"../../../base/index.js":135,"../../../interfaces.js":168,"./tools.js":120}],116:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),n=t.TYPES,r=t.OBJECT_KINDS,o=require("../../../base/index.js"),a=require("../../../base/annotation.js"),i=({type:n.OBJECT,kind:r.COLOR_CLOSURE,evaluate:function(e,t){if(t.length>0)throw new Error("Shade constructor expects no parameters.");return{type:n.OBJECT,kind:r.COLOR_CLOSURE}}},{});Object.keys(t.ColorClosures).forEach(function(e){var o=t.ColorClosures[e].input;i[e]={type:n.FUNCTION,name:e,evaluate:function(i,u){for(var s=0;s<o.length;s++)if(new a.Annotation({},o[s]),s>=u.length){if(void 0!=o[s].defaultValue)continue;t.throwError(i.node,"Argument "+(s+1)+" of Shade."+e+" is required but not given.")}else switch(o[s].semantic){case t.SEMANTICS.COLOR:u[s].canColor()||t.throwError(i.node,"Argument "+(s+1)+" of Shade."+e+" must evaluate to a color, found "+u[s].getTypeString());break;case t.SEMANTICS.NORMAL:u[s].canNormal()||t.throwError(i.node,"Argument "+(s+1)+" of Shade."+e+" must evaluate to a normal, found "+u[s].getTypeString())}return{type:n.OBJECT,kind:r.COLOR_CLOSURE}}}}),i.mix={type:n.FUNCTION,name:"mix",evaluate:function(){return{type:n.OBJECT,kind:r.COLOR_CLOSURE}}},o.extend(e,{id:"Shade",kind:r.COLOR_CLOSURE,object:{constructor:null,"static":i},instance:i})}(exports);


},{"../../../base/annotation.js":130,"../../../base/index.js":135,"../../../interfaces.js":168}],117:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),r=t.TYPES,n=t.OBJECT_KINDS;Base=require("../../../base/index.js"),Tools=require("./tools.js");var a={transformDirection:{type:r.FUNCTION,evaluate:function(e,t,a,o,i){if(2!=t.length)throw new Error("transformDirection expects 2 parameters.");return{type:r.OBJECT,kind:n.FLOAT3}}},transformPoint:{type:r.FUNCTION,evaluate:function(e,t,a,o,i){if(2!=t.length)throw new Error("transformPoint expects 2 parameters.");return{type:r.OBJECT,kind:n.FLOAT3}}},VIEW:{type:r.NUMBER},WORLD:{type:r.NUMBER}};Base.extend(e,{id:"Space",object:{constructor:null,"static":a,staticValue:Math},instance:a})}(exports);


},{"../../../base/index.js":135,"../../../interfaces.js":168,"./tools.js":120}],118:[function(require,module,exports){
!function(e){function t(e){return function(t,n){i.checkParamCount(t.node,e,[1],n.length);var o=n[0];return o.canNumber()?{type:o.getType()}:o.isVector()?{type:d.OBJECT,kind:o.getKind()}:void r.throwError(t.node,"IllegalArgumentError: first argument of this."+e+" is of type: "+o.getTypeString())}}var r=require("../../../interfaces.js"),n=require("../../../base/index.js"),o=require("../../../base/annotation.js"),i=require("./tools.js"),d=r.TYPES,a=r.OBJECT_KINDS,s=o.ANNO,u={normalizedCoords:{type:d.OBJECT,kind:a.FLOAT3,derived:!0},height:{type:d.INT,derived:!0},width:{type:d.INT,derived:!0}},y={fwidth:{type:d.FUNCTION,evaluate:t("fwidth")},dx:{type:d.FUNCTION,evaluate:t("dx")},dy:{type:d.FUNCTION,evaluate:t("dy")}};e.getThisTypeInfo=function(e){e=e||{type:d.OBJECT,kind:a.ANY,info:{}};var t=s({},e),r=t.getNodeInfo();r||(r={},t.setNodeInfo(r)),r.hasOwnProperty("coords")&&n.extend(r,u);for(var o in y)r.hasOwnProperty(o)&&n.extend(r[o],y[o]);return t}}(exports);


},{"../../../base/annotation.js":130,"../../../base/index.js":135,"../../../interfaces.js":168,"./tools.js":120}],119:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),r=t.TYPES,o=t.OBJECT_KINDS,n=require("./tools.js"),i={type:r.OBJECT,kind:o.TEXTURE,evaluate:function(e,r,o){t.throwError(e.node,"Construction of Textures is not supported.")}},s={},c={width:{type:r.INT},height:{type:r.INT}};n.Vec.attachVecMethods(c,"Texture",4,2,["sample2D"]),n.extend(e,{id:"Texture",kind:o.TEXTURE,object:{constructor:i,"static":s},instance:c})}(exports);


},{"../../../interfaces.js":168,"./tools.js":120}],120:[function(require,module,exports){
!function(e){var t=require("../../../base/index.js"),n=require("../../../interfaces.js"),r=n.TYPES,a=n.OBJECT_KINDS,u=require("../../../base/vec.js"),o=function(e){return e.every(function(e){return e.hasStaticValue()})};e.allArgumentsCanNumber=function(e){return e.every(function(e){return e.canNumber()})},e.checkParamCount=function(e,t,r,a){-1==r.indexOf(a)&&n.throwError(e,"Invalid number of parameters for "+t+", expected "+r.join(" or ")+", found: "+a)},e.singleAccessor=function(t,n,a,u){return{type:r.FUNCTION,evaluate:function(o,c,i,l){e.checkParamCount(o.node,t,a,c.length);var s=c.length?n:{type:r.NUMBER};return u&&l.hasStaticValue()&&c.every(function(e){return e.hasStaticValue()})&&(s.staticValue=u(l.getStaticValue(),c)),s}}},e.extend=t.extend;var c={TYPES:{1:{type:r.NUMBER},2:{type:r.OBJECT,kind:a.FLOAT2},3:{type:r.OBJECT,kind:a.FLOAT3},4:{type:r.OBJECT,kind:a.FLOAT4}},getType:function(e){return c.TYPES[e]},getStaticValue:function(e,t,n,r,a){if(a.hasStaticValue()&&o(n)){var u=a.getStaticValue(),c=n.map(function(e){return e.getStaticValue()}),i=u[e];if(i)return i.apply(u,c)}},checkAnyVecArgument:function(e,t,r){var u;return r.canNumber()?u=1:r.isOfKind(a.FLOAT2)?u=2:r.isOfKind(a.FLOAT3)?u=3:r.isOfKind(a.FLOAT4)?u=4:n.throwError(e,"Invalid parameter for "+t+", type '"+r.getTypeString()+"' is not supported"),u},checkVecArguments:function(t,r,u,o,c,i){u=u||0==r;for(var l=[],s=u?0:1;r>=s;++s)l.push(s+o);if(e.checkParamCount(c.node,t,l,i.length),!(u&&i.length-o==0||i.length-o==1&&i[0].canNumber())){for(var f=0,s=o;r>f&&s<i.length;++s){var g,v=i[s];v.canNumber()?g=1:v.isOfKind(a.FLOAT2)?g=2:v.isOfKind(a.FLOAT3)?g=3:v.isOfKind(a.FLOAT4)?g=4:v.isOfKind(a.MATRIX3)?g=9:v.isOfKind(a.MATRIX4)?g=16:n.throwError(c.node,"Invalid parameter for "+t+", type '"+v.getTypeString()+"' is not supported"),f+=g}r>f?n.throwError(c.node,"Invalid parameters for "+t+", expected "+r+" scalar values, got "+f):s<i.length&&n.throwError(c.node,"Invalid parameters for "+t+", too many parameters")}},vecEvaluate:function(e,n,r,a,u,o,i,l){c.checkVecArguments(e+"."+n,a,!1,0,u,o);var s={};return t.extend(s,c.getType(r)),s},anyVecArgumentEvaluate:function(n,r,a,u,o){e.checkParamCount(r.node,n,[1],a.length);var i=a[0],l={},s=c.checkAnyVecArgument(r.node,n,i);return t.extend(l,c.getType(s)),l},optionalZeroEvaluate:function(e,n,r,a,u,o,i,l,s){var f=e+"."+n,g={};return 0==i.length?t.extend(g,c.getType(a)):(c.checkVecArguments(f,u,!0,0,o,i),t.extend(g,c.getType(r))),g},swizzleEvaluate:function(e,t,n,r,a,u,o,i){return r?c.optionalZeroEvaluate(e,n,t,n.length,n.length,a,u,o,i):c.vecEvaluate(e,n,n.length,0,a,u,o,i)},swizzleOperatorEvaluate:function(e,t,n,r,a,u,o,i){return c.vecEvaluate(e,n+r,t,n.length,a,u,o,i)},getSwizzleEvaluate:function(e,t,n,a){return{type:r.FUNCTION,evaluate:c.swizzleEvaluate.bind(null,e,t,n,a),computeStaticValue:c.getStaticValue.bind(null,n)}},getSwizzleOperatorEvaluate:function(e,t,n,a){return{type:r.FUNCTION,evaluate:c.swizzleOperatorEvaluate.bind(null,e,t,n,a),computeStaticValue:c.getStaticValue.bind(null,n+a)}},attachSwizzles:function(e,t,n){for(var r=0;r<u.swizzleSets.length;++r)for(var a=1;4>=a;++a)for(var o=Math.pow(n,a),i=0;o>i;++i){for(var l=i,s="",f=[],g=n>=a,v=0;a>v;++v){var p=l%n;l=Math.floor(l/n),s+=u.swizzleSets[r][p],f[p]?g=!1:f[p]=!0}if(e[s]=c.getSwizzleEvaluate(t,n,s,g),g)for(var d in u.swizzleOperators)e[s+d]=c.getSwizzleOperatorEvaluate(t,n,s,d)}},attachVecMethods:function(e,t,n,a,u){for(var o=0;o<u.length;++o){var i=u[o];e[i]={type:r.FUNCTION,evaluate:c.vecEvaluate.bind(null,t,i,n,a)}}},getStaticValueFromConstructor:function(e,t){var r=[],a=!0;if(t.forEach(function(e){a=a&&e.hasStaticValue(),a&&r.push(e.getStaticValue())}),a){var u=new n[e];return n[e].apply(u,r),u}return void 0},constructorEvaluate:function(e,t,n,r,a){return c.checkVecArguments(e,t,!0,0,n,r),c.getType(t)},constructorComputeStaticValue:function(e,t,n,r){return c.getStaticValueFromConstructor(e,n)}},i={TYPES:{Mat3:{type:{type:r.OBJECT,kind:a.MATRIX3},cols:3,rows:3},Mat4:{type:{type:r.OBJECT,kind:a.MATRIX4},cols:4,rows:4}},getType:function(e){return i.TYPES[e].type},getVecSize:function(e){return i.TYPES[e].cols*i.TYPES[e].rows},checkMatArguments:function(e,t,r,u,o){if(1!=o.length||!o[0].isOfKind(a.MATRIX3)&&!o[0].isOfKind(a.MATRIX4)){for(var l=0;l<o.length;++l)(o[l].isOfKind(a.MATRIX3)||o[l].isOfKind(a.MATRIX4))&&n.throwError(u.node,"Invalid parameter for "+e+": Constructing Matrix from Matrix can only take one argument");c.checkVecArguments(e,i.getVecSize(t),r,0,u,o)}},matEvaluate:function(e,n,r,a,u,o){i.checkMatArguments(e+"."+n,e,!1,r,a);var c={};return t.extend(c,i.getType(e)),c},matConstructorEvaluate:function(e,t,n,r){return i.checkMatArguments(e,e,!0,t,n),c.getConstructorTypeInfo(e,i.getVecSize(e),i.getType(e),t,n)},attachMatMethods:function(e,t,n){for(var a=0;a<n.length;++a){var u=n[a];e[u]={type:r.FUNCTION,evaluate:i.matEvaluate.bind(null,t,u)}}},colEvaluate:function(r,a,u,o,l){var s=r+".col",f={},g=(i.TYPES[r].cols,i.TYPES[r].rows);return u.length>1?(c.checkVecArguments(s,g,!0,1,a,u),t.extend(f,i.getType(r))):(e.checkParamCount(a.node,s,[1],u.length),t.extend(f,c.getType(g))),u[0].canNumber()||n.throwError(a.node,"Invalid parameter for "+s+", first parameter must be a number."),f}};e.Vec=c,e.Mat=i,e.allArgumentsAreStatic=o}(exports);


},{"../../../base/index.js":135,"../../../base/vec.js":138,"../../../interfaces.js":168}],121:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),c=t.TYPES,a=t.OBJECT_KINDS,o=require("./tools.js"),l={type:c.OBJECT,kind:a.FLOAT2,evaluate:o.Vec.constructorEvaluate.bind(null,"Vec2",2),computeStaticValue:o.Vec.constructorComputeStaticValue.bind(null,"Vec2")},n={},V={length:{type:c.FUNCTION,evaluate:o.Vec.optionalZeroEvaluate.bind(null,"Vec2","length",2,1,1)}};o.Vec.attachSwizzles(V,"Vec2",2),o.Vec.attachVecMethods(V,"Vec2",2,2,["add","sub","mul","div","mod","reflect"]),o.Vec.attachVecMethods(V,"Vec2",1,2,["dot"]),o.Vec.attachVecMethods(V,"Vec2",2,0,["normalize","flip"]),o.extend(e,{id:"Vec2",kind:a.FLOAT2,object:{constructor:l,"static":n},instance:V})}(exports);


},{"../../../interfaces.js":168,"./tools.js":120}],122:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),c=t.TYPES,r=t.OBJECT_KINDS,a=require("./tools.js"),o={type:c.OBJECT,kind:r.FLOAT3,evaluate:a.Vec.constructorEvaluate.bind(null,"Vec3",3),computeStaticValue:a.Vec.constructorComputeStaticValue.bind(null,"Vec3")},n={},u={length:{type:c.FUNCTION,evaluate:a.Vec.optionalZeroEvaluate.bind(null,"Vec3","length",3,1,1)}};a.Vec.attachSwizzles(u,"Vec3",3),a.Vec.attachVecMethods(u,"Vec3",3,3,["add","sub","mul","div","mod","reflect","cross"]),a.Vec.attachVecMethods(u,"Vec3",1,3,["dot"]),a.Vec.attachVecMethods(u,"Vec3",3,0,["normalize","flip"]),u.refract={type:c.FUNCTION,evaluate:function(e,o,n){o.length<2&&t.throwError(e.node,"Not enough parameters for refract.");var l=o.pop();l&&l.canNumber()||t.throwError(e.node,"Invalid parameter for refract, expected a number got "+l.getTypeString()),a.Vec.checkVecArguments(u+".refract",3,!1,0,e,o);var i={type:c.OBJECT,kind:r.FLOAT3};return i}},a.extend(e,{id:"Vec3",kind:r.FLOAT3,object:{constructor:o,"static":n},instance:u})}(exports);


},{"../../../interfaces.js":168,"./tools.js":120}],123:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),c=t.TYPES,a=t.OBJECT_KINDS,o=require("./tools.js"),l={type:c.OBJECT,kind:a.FLOAT4,evaluate:o.Vec.constructorEvaluate.bind(null,"Vec4",4),computeStaticValue:o.Vec.constructorComputeStaticValue.bind(null,"Vec4")},n={},V={length:{type:c.FUNCTION,evaluate:o.Vec.optionalZeroEvaluate.bind(null,"Vec4","length",4,1,1)}};o.Vec.attachSwizzles(V,"Vec4",4),o.Vec.attachVecMethods(V,"Vec4",4,4,["add","sub","mul","div","mod","reflect"]),o.Vec.attachVecMethods(V,"Vec4",1,4,["dot"]),o.Vec.attachVecMethods(V,"Vec4",4,0,["normalize","flip"]),o.extend(e,{id:"Vec4",kind:a.FLOAT4,object:{constructor:l,"static":n},instance:V})}(exports);


},{"../../../interfaces.js":168,"./tools.js":120}],124:[function(require,module,exports){
!function(e){function t(e,t,r){var n,a,s,o=new d;return r=r?r.values():[],h(e,{AssignmentExpression:function(c){if(this.left.type!=p.Identifier&&l.throwError(e,"Can't find constant for computed left expression"),a=this.left.name,t.has(a)&&(n=m(this.right),n.hasStaticValue()))switch(this.operator){case"=":o.add({name:a,constant:f.copyStaticValue(n)});break;case"-=":case"+=":case"*=":case"/=":if(s=r.filter(function(e){return e.name==a}),s.length){var u,h=s[0].constant;switch(this.operator){case"+=":u=h+f.copyStaticValue(n);break;case"-=":u=h-f.copyStaticValue(n);break;case"*=":u=h*f.copyStaticValue(n);break;case"/=":u=h/f.copyStaticValue(n)}o.add({name:a,constant:u})}break;default:i(!this.operator)}c(this.right)},VariableDeclarator:function(e){a=this.id.name,this.init&&t.has(a)&&(n=m(this.init),n.hasStaticValue()&&o.add({name:a,constant:f.copyStaticValue(n)})),e(this.init)},UpdateExpression:function(e){if(this.argument.type==p.Identifier&&(a=this.argument.name,n=m(this),n.hasStaticValue())){var t=f.copyStaticValue(n);this.prefix||(t="--"==this.operator?--t:++t),o.add({name:a,constant:t})}}}),o}var i=require("assert"),r=require("esgraph"),n=require("analyses"),a=require("../../base/common.js"),s=(require("../../base/context.js"),require("../../base/index.js")),o=(require("escodegen"),require("./infer_expression.js").annotateRight),c=(require("./registry/").InferenceScope,require("./registry/system.js"),require("./../../base/annotation.js")),u=(require("estraverse"),require("../settools.js")),l=require("../../interfaces.js"),h=require("walkes"),f=(require("../validator"),require("../../base/typeinfo.js").TypeInfo),p=a.Syntax,d=n.Set,m=(c.FunctionAnnotation,c.ANNO),y=function(e,t,i){i=i||{},this.context=t,this.propagateConstants=i.propagateConstants||!1};s.extend(y.prototype,{inferBody:function(e,i){var a=r(e,{omitExceptions:!0}),s=this.context,c=this.propagateConstants;return n(a,function(e){if(!this.astNode||this.type)return e;if(c&&(this.kill=this.kill||u.findVariableAssignments(this.astNode,!0)),o(s,this.astNode,c?e:null),this.decl=this.decl||s.declareVariables(this.astNode),!c)return e;var i=null,r=null;if(this.kill.size){r=t(this.astNode,this.kill,c?e:null);var n=this;i=new d(e.filter(function(e){return!n.kill.some(function(t){return e.name==t})}))}var a=d.union(i||e,r);return a},{direction:"forward",merge:n.merge(function(e,t){if(!e&&!t)return null;var i=d.intersect(e,t);return i})}),e}});var g=function(e,t,i){i=i||{};var r=new y(e,t,i),n=r.inferBody(e,i);return n};e.infer=g}(exports);


},{"../../base/common.js":132,"../../base/context.js":133,"../../base/index.js":135,"../../base/typeinfo.js":137,"../../interfaces.js":168,"../settools.js":108,"../validator":129,"./../../base/annotation.js":130,"./infer_expression.js":110,"./registry/":112,"./registry/system.js":118,"analyses":1,"assert":92,"escodegen":75,"esgraph":87,"estraverse":91,"walkes":98}],125:[function(require,module,exports){
!function(e){function n(e){var n={};return e&&e.forEach(function(e){n[e.name]={dependencies:e.dependencies,costs:e.costs}}),n}function r(e){for(var n=!0,r=!1,s=0;s<e.length&&n;s++){var i=e[s].isUniformExpression();n=n&&(i||e[s].hasStaticValue()),r=r||i}return n&&r}function s(e){var n=null;if(r(e)){n=[];for(var s=0;s<e.length;s++)e[s].isUniformExpression()&&(n=n.concat(e[s].getUniformDependencies()))}return n}var i=require("estraverse"),t=require("./../../base/common.js"),o=require("../../interfaces.js"),a=(require("escodegen"),require("analyses").Set),f=require("../../base/asttools.js"),c=i.Syntax,m=t.ANNO,p=["Math","Shade"];e.generateUniformExpressions=function(e,r){var t=n(r);i.traverse(e,{leave:function(e,n){var r=m(e);switch(r.clearUniformDependencies(),e.type){case c.MemberExpression:var i=m(e.property);i.getSource()==o.SOURCES.UNIFORM&&(r.setUniformDependencies(e.property.name),r.setUniformCosts(0));break;case c.Identifier:if(!f.isVariableReference(e,n))return;if(n.type==c.AssignmentExpression&&n.left==e)return;if(t.hasOwnProperty(e.name)){var a=t[e.name];r.setUniformDependencies(a.dependencies),r.setUniformCosts(a.costs)}break;case c.BinaryExpression:var U=m(e.left),d=m(e.right);U.canUniformExpression()&&d.canUniformExpression()&&(r.setUniformDependencies(U.getUniformDependencies(),d.getUniformDependencies()),r.setUniformCosts(U.getUniformCosts()+d.getUniformCosts()+2));break;case c.UnaryExpression:var u=m(e.argument);u.isUniformExpression()&&(r.setUniformDependencies(u.getUniformDependencies()),r.setUniformCosts(u.getUniformCosts()+1));break;case c.CallExpression:if(e.callee.type==c.MemberExpression){var g=e.callee.object,l=e.arguments.map(function(e){return m(e)});if(g.name&&~p.indexOf(g.name)){var v=s(l);if(v){r.setUniformDependencies(v);var x=l.reduce(function(e,n){return e+n.getUniformCosts()},1);r.setUniformCosts(x)}}else{var E=m(g);if(E.isUniformExpression()){var v=s(l);if(v||0==l.length){r.setUniformDependencies(v,E.getUniformDependencies());var x=l.reduce(function(e,n){return e+n.getUniformCosts()},1);r.setUniformCosts(x)}}}}break;case c.NewExpression:if(e.callee.type==c.Identifier){var l=e.arguments.map(function(e){return m(e)}),v=s(l);if(v){r.setUniformDependencies(v);var x=l.reduce(function(e,n){return e+n.getUniformCosts()},1);r.setUniformCosts(x)}}}}});var U=new a;switch(e.type){case c.AssignmentExpression:var d=m(e.right);d.isUniformExpression()&&U.add({name:e.left.name,dependencies:d.getUniformDependencies(),costs:d.getUniformCosts()});break;case c.VariableDeclaration:e.declarations.forEach(function(e){if(e.init){var n=m(e.init);n.isUniformExpression()&&U.add({name:e.id.name,dependencies:n.getUniformDependencies(),costs:n.getUniformCosts()})}})}return U}}(exports);


},{"../../base/asttools.js":131,"../../interfaces.js":168,"./../../base/common.js":132,"analyses":1,"escodegen":75,"estraverse":91}],126:[function(require,module,exports){
!function(r){function t(r,t){this.root=r,this.opt=t||{}}var e=require("../../base/common.js"),n=require("esgraph"),i=require("analyses"),o=require("./evaluator.js"),s=require("./uniformTransformer.js"),a=require("../settools.js"),u=require("assert"),f=i.Set,l=e.Syntax;t.prototype={analyzeBody:function(r){var t=n(r,{omitExceptions:!0});i(t,function(r){if(!this.astNode||this.type)return r;var t=o.generateUniformExpressions(this.astNode,r);this.kill=this.kill||a.findVariableAssignments(this.astNode,!0);var e=r;if(this.kill.size){var n=this;e=new f(r.filter(function(r){return!n.kill.some(function(t){return r.name==t})}))}var i=f.union(e,t);return i},{direction:"forward",merge:i.merge(function(r,t){return r||t?f.intersect(r,t):null})})},transform:function(){var r=s.transform(this.root,this.opt);return r}},r.extract=function(r,e){u(r.type==l.Program||r.type==l.BlockStatement);var n=new t(r,e);return n.analyzeBody(r.type==l.Program?r.body:r),n.transform()}}(exports);


},{"../../base/common.js":132,"../settools.js":108,"./evaluator.js":125,"./uniformTransformer.js":128,"analyses":1,"assert":92,"esgraph":87}],127:[function(require,module,exports){
!function(e){function r(e){switch(e){case c.FLOAT2:return"Shade.Vec2";case c.FLOAT3:return"Shade.Vec3";case c.FLOAT4:return"Shade.Vec4";case c.MATRIX3:return"Shade.Mat3";case c.MATRIX4:return"Shade.Mat4";default:throw"Unsupported object kind in uniform expression argument: "+e}}function t(e){return e.callee.type===i.MemberExpression&&e.callee.object.type===i.Identifier&&"Math"===e.callee.object.name}function n(e){if(!t(e))return!1;var r=s(e.arguments[0]);return r.isVector()}var a=require("estraverse"),i=a.Syntax,s=require("../../base/annotation.js").ANNO,o=require("../../interfaces.js"),c=(o.TYPES,o.OBJECT_KINDS),p=function(e,t,a,o){if(e.type==i.MemberExpression){var c=s(e.object);if(e.object.type==i.Identifier&&c.isUniformExpression()&&a.hasOwnProperty(e.object.name)&&(e.object=a[e.object.name].code),c.isGlobal()&&e.property.type==i.Identifier){var p=s(e.property);if(p.isObject()){var u=r(p.getKind());return{type:i.NewExpression,callee:{type:i.Identifier,name:u},arguments:[e]}}if(t==e||t.type!=i.MemberExpression)return{type:i.MemberExpression,computed:!0,object:e,property:{type:i.Literal,value:0}}}}if(e.type==i.CallExpression&&n(e)&&(e.callee.object.name="Math"),e.type==i.Identifier){if(~[i.MemberExpression,i.FunctionDeclaration,i.VariableDeclarator].indexOf(t.type))return;if(t.type==i.NewExpression&&t.callee==e)return;if(t.type==i.AssignmentExpression&&t.left==e)return;if(a.hasOwnProperty(e.name)){var l=a[e.name].code;return l}}if(e.type==i.NewExpression&&e.callee.type==i.Identifier){var f=e.callee.name;switch(f){case"Vec2":case"Vec3":case"Vec4":e.callee.name="Shade."+f}}if(e.type==i.ReturnStatement){var m=s(e.argument);if(m.isObject())return e.argument={type:i.CallExpression,callee:{type:i.MemberExpression,object:e.argument,property:{type:i.Identifier,name:"_toFloatArray"}},arguments:[]},e}};e.transformUniformSetter=function(e,r){return a.replace(e,{leave:function(e,t){return p(e,t,r,this)}})}}(exports);


},{"../../base/annotation.js":130,"../../interfaces.js":168,"estraverse":91}],128:[function(require,module,exports){
!function(e){function r(e,r){return e.length!=r.length?!1:(e.forEach(function(e){return-1==r.indexOf(e)?!1:void 0}),!0)}function n(e,r){var n=r.getUniformCosts();return n>0}var i=require("estraverse"),t=require("./../../base/common.js"),o=require("escodegen"),s=require("./uniformSetterTransformation.js"),f=t.ANNO,a=i.Syntax,u=function(e){e=e||{};var r=e.uniformCounter||1;this.getCounter=function(){return r++},this.uniformExpressions={},this.activeUniformVariables={}};u.prototype={transform:function(e){var r=this;return i.replace(e,{enter:function(e){var i=f(e);if(i.isUniformExpression()&&n(e,i))return r.generateUniformExpression(e);if(e.type==a.AssignmentExpression||e.type==a.VariableDeclarator&&e.init){var t=f(e.right||e.init),o=e.left||e.id;t.isUniformExpression()&&o.type==a.Identifier&&(r.activeUniformVariables[o.name]={code:s.transformUniformSetter(e.right||e.init,r.activeUniformVariables),dependencies:t.getUniformDependencies()})}}})},getUniformExpression:function(e){for(var n in this.uniformExpressions){var i=this.uniformExpressions[n];if(e.code==i.code&&r(e.dependencies,i.dependencies))return n}return""},generateUniformExpression:function(e){var r=f(e),n={code:o.generate(s.transformUniformSetter(e,this.activeUniformVariables)),dependencies:r.getUniformDependencies()},i=this.getUniformExpression(n);i||(i="u"+this.getCounter(),this.uniformExpressions[i]=n);var t={type:a.MemberExpression,object:{type:a.Identifier,name:"uexp"},property:{type:a.Identifier,name:i}};return f(t).copy(r),t}},e.transform=function(e,r){var n=new u(r),i=n.transform(e);return r.uniformExpressions=n.uniformExpressions,i}}(exports);


},{"./../../base/common.js":132,"./uniformSetterTransformation.js":127,"escodegen":75,"estraverse":91}],129:[function(require,module,exports){
!function(e){var r=require("./../base/common.js"),t=require("../interfaces.js"),i=require("estraverse"),o=r.Syntax,n=t.TYPES,a=r.ANNO,s=function(e){var r,i=a(e);if(!i.isValid()){var s=i.getError(),c=new Error(s.message);throw c.loc=s.loc,c}if(e.type==o.VariableDeclarator&&(e.init&&(r=a(e.init),i.copy(r)),(i.getType()==n.ANY||i.isNullOrUndefined())&&t.throwError(e,"No type could be calculated for ")),e.type==o.AssignmentExpression)r=a(e.right),i.copy(r),i.clearUniformDependencies(),(i.getType()==n.ANY||i.isNullOrUndefined())&&t.throwError(e,"No type could be calculated for ");else if(e.type==o.ExpressionStatement){var l=a(e.expression);i.copy(l)}};e.validate=function(e){return i.replace(e,{leave:s})}}(exports);


},{"../interfaces.js":168,"./../base/common.js":132,"estraverse":91}],130:[function(require,module,exports){
!function(t){var e=require("../interfaces.js"),n=(require("estraverse").Syntax,require("./index.js")),r=require("./typeinfo.js").TypeInfo,a=e.TYPES,i=(e.OBJECT_KINDS,function(t,e){r.call(this,t,e)});n.createClass(i,r,{setCall:function(t){var e=this.getExtra();e.evaluate=t},getCall:function(){return this.getExtra().evaluate},clearCall:function(){var t=this.getExtra();delete t.evaluate}});var s=function(t,e){i.call(this,t,e),this.setType(a.FUNCTION)};n.createClass(s,i,{getReturnInfo:function(){return this.getExtra().returnInfo},setReturnInfo:function(t){this.getExtra().returnInfo=t},isUsed:function(){return!!this.getExtra().used},setUsed:function(t){this.getExtra().used=t}}),t.Annotation=i,t.FunctionAnnotation=s,t.ANNO=function(t,e){return new i(t,e)}}(exports);


},{"../interfaces.js":168,"./index.js":135,"./typeinfo.js":137,"estraverse":91}],131:[function(require,module,exports){
!function(e){var r=require("./common.js").Syntax,n=function(e,n){return e.type==r.Identifier&&!(n.type==r.MemberExpression&&n.property==e||n.type==r.FunctionDeclaration||n.type==r.NewExpression&&n.callee==e||n.type==r.CallExpression&&n.callee==e)},t=function(e,t){return n(e,t)&&t.type!=r.VariableDeclarator};e.isVariableReference=t,e.isVariableName=n}(exports);


},{"./common.js":132}],132:[function(require,module,exports){
!function(e){var r=require("../base/annotation.js").ANNO,n=require("estraverse"),t=require("./errors.js"),i=n.Syntax;e.createTypeInfo=function(e,n){if(Array.isArray(e))return e.map(function(e){return n.createTypeInfo(e)});var t=r(e);if(e.type==i.Identifier||e.type==i.ThisExpression){var a=e.type==i.Identifier?e.name:"this",o=n.getBindingByName(a);if(o)return t.copy(o),o}return t},e.getTypeInfo=function a(e,n,o,f){if(!e)return null;if(f=void 0==f?!1:f,Array.isArray(e))return e.map(function(e){return a(e,n,o,f)});var s;if(e.type==i.Identifier){var u=e.name;if("undefined"==u)return r(e);if(s=n.getBindingByName(u),void 0==s&&f)return r(e).setInvalid(t.generateErrorInformation(e,t.ERROR_TYPES.REFERENCE_ERROR,u,"is not defined")),r(e);if(s){var y=r(e,s.getExtra());if(y.setDynamicValue(),s.setDynamicValue(),o&&!s.isNullOrUndefined()){var c=o.filter(function(e){return e.name==u});c.length&&(s.setStaticValue(c[0].constant),y.setStaticValue(c[0].constant))}return s}}else e.type==i.ThisExpression&&(s=n.getBindingByName("this"));return s||r(e)},e.Syntax=i,e.VisitorOption=n.VisitorOption,e.ANNO=r,e.getObjectReferenceFromNode=e.getTypeInfo}(exports);


},{"../base/annotation.js":130,"./errors.js":134,"estraverse":91}],133:[function(require,module,exports){
!function(t){var e=function(t,e){this.options=e||{},this.root=t,this.mainFunction=e.mainFunction||"global.shade",this.scopeStack=e.scope?[e.scope]:[],this.blockedNames=e.blockedNames||[],this.usedNames=[],this.declaration=!1};e.prototype={getScope:function(){return this.scopeStack[this.scopeStack.length-1]},pushScope:function(t){return this.scopeStack.push(t)},popScope:function(){return this.scopeStack.pop()},inMainFunction:function(){return this.getScope().str()==this.mainFunction},setInDeclaration:function(t){this.declaration=t},inDeclaration:function(){return this.declaration},getSafeName:function(t){for(var e=0,n=t;-1!=this.blockedNames.indexOf(n);)n=t+e++;return n},getSafeUniqueName:function(t){for(var e=1,n=t;-1!=this.usedNames.indexOf(n)||-1!=this.blockedNames.indexOf(n);)n=t+e++;return this.usedNames.push(n),n}},t.exports=e}(module);


},{}],134:[function(require,module,exports){
!function(){var r=require("escodegen"),e={};e.generateErrorInformation=function(e,o,R){var n=Array.prototype.slice.call(arguments).splice(2),E=e.loc,t="";return t+=r.generate(e),E&&E.start.line&&(t+=" (Line "+E.start.line+")"),R=n.length?n.join(" ")+": ":"",{message:o+": "+R+t,loc:E}},e.ERROR_TYPES={TYPE_ERROR:"TypeError",REFERENCE_ERROR:"ReferenceError",NAN_ERROR:"NotANumberError",SHADEJS_ERROR:"ShadeJSError"},module.exports=e}(module);


},{"escodegen":75}],135:[function(require,module,exports){
!function(e){e.extend=function(e,t){for(var r in t){var o=t.__lookupGetter__(r),n=t.__lookupSetter__(r);o||n?(o&&e.__defineGetter__(r,o),n&&e.__defineSetter__(r,n)):void 0===t[r]?delete e[r]:("constructor"!==r||e!==window)&&(e[r]=t[r])}return e},e.deepExtend=function(t,r){for(var o in r){var n,p=r[o],i=t[o];Array.isArray(p)?(n=i||[],e.deepExtend(n,p)):"object"==typeof p&&null!==p?(n=i||{},e.deepExtend(n,p)):n=p,t[o]=n}return t},e.shallowExtend=function(e,t){for(var r in t)e[r]=t[r];return e},e.createClass=function(e,t,r){if(r=r||{},t){var o=function(){};o.prototype=t.prototype,e.prototype=new o,e.prototype.constructor=e,e.superclass=t.prototype}for(var n in r)e.prototype[n]=r[n];return e}}(exports);


},{}],136:[function(require,module,exports){
!function(t){var e=require("./index.js"),i=require("../interfaces.js"),n=i.TYPES,r=require("./annotation.js").Annotation,o=require("./typeinfo.js").TypeInfo,s=require("estraverse").Syntax,a=require("./errors.js"),u=function(t,e){if(o.call(this,t),this.node.ref){if(!e[this.node.ref])throw Error("No object has been registered for: "+this.node.ref);this.globalObject=e[this.node.ref].object,this.globalObject&&this.setType(n.OBJECT)}};e.createClass(u,o,{hasConstructor:function(){return!!this.getConstructor()},getConstructor:function(){return this.globalObject&&this.globalObject.constructor},isInitialized:function(){return this.node.initialized},setInitialized:function(t){this.node.initialized=t},hasStaticValue:function(){return this.globalObject?!0:o.prototype.hasStaticValue.call(this)},getStaticValue:function(){if(!this.hasStaticValue())throw new Error("Node has no static value: "+this.node);return this.globalObject?this.globalObject.staticValue:o.prototype.getStaticValue.call(this)},isGlobal:function(){return this.node.info&&this.node.info._global||o.prototype.isGlobal.call(this)},getType:function(){return this.globalObject?n.OBJECT:o.prototype.getType.call(this)},getStaticProperties:function(){return this.globalObject?this.globalObject["static"]:null},getInfoForSignature:function(t){var e=this.getExtra();return e.signatures?e.signatures[t]:null},setInfoForSignature:function(t,e){var i=this.getExtra();return i.signatures||(i.signatures={}),i.signatures[t]=e}});var c=function(t,i,n){n=n||{},this.parent=i||n.parent||null,this.registry=n.registry||(i?i.registery:{}),this.scope=t.scope=t.scope||{},this.scope.bindings=this.scope.bindings||{},n.bindings&&e.extend(this.scope.bindings,n.bindings),this.scope.name=n.name||t.name||"<anonymous>"};e.extend(c.prototype,{setRegistry:function(t){this.registry=t},getName:function(){return this.scope.name},getRootContext:function(){return this.parent?this.parent.getRootContext():this},getBindings:function(){return this.scope.bindings},updateReturnInfo:function(t){this.scope.returnInfo=t.getExtra()},getReturnInfo:function(){return this.scope.returnInfo||{type:n.UNDEFINED}},getBindingByName:function(t){var e=this.getBindings(),i=e[t];return void 0!==i?new u(i,this.registry):this.parent?this.parent.getBindingByName(t):void 0},getContextForName:function(t){var e=this.getBindings();return void 0!==e[t]?this:this.parent?this.parent.getContextForName(t):null},getVariableIdentifier:function(t){var e=this.getContextForName(t);return e?e.str()+"."+t:null},declareVariable:function(t,e,i){var r=this.getBindings();if(e=void 0==e?!0:e,r[t]){if(e)throw new Error(t+" was already declared in this scope.");return!1}var o={initialized:!1,initPosition:i,extra:{type:n.UNDEFINED}};return r[t]=o,!0},updateTypeInfo:function(t,e,i){var n=this.getBindingByName(t);if(!n){if(i)return void e.setInvalid(a.generateErrorInformation(i,a.ERROR_TYPES.REFERENCE_ERROR,t,"is not defined"));throw new Error("Reference error: "+t+" is not defined.")}if(n.isInitialized()&&n.getType()!==e.getType()){if(i)return void e.setInvalid(a.generateErrorInformation(i,a.ERROR_TYPES.SHADEJS_ERROR,t,"may not change it's type"));throw new Error("Variable may not change it's type: "+t)}n.isInitialized()||n.node.initPosition&&n.node.initPosition.copy(e),n.copy(e),n.setDynamicValue(),n.setInitialized(!e.isUndefined())},registerObject:function(t,e){this.registry[e.id]=e;var i=this.getBindings();i[t]={extra:{type:n.OBJECT},ref:e.id}},declareParameters:function(t){for(var e=this.getBindings(),i=0;i<t.length;i++){var s=t[i],a=new r(s),u={extra:{type:n.UNDEFINED}},c=new o(u);c.copy(a),e[s.name]=u}},str:function(){for(var t=this,e=[];t;)e.unshift(t.getName()),t=t.parent;return e.join(".")},getAllBindings:function(){var t=Object.keys(this.getBindings());if(this.parent)for(var e=this.parent.getAllBindings(),i=0;i<e.length;i++)-1!==t.indexOf(e[i])&&t.push(e[i]);return t},createTypeInfo:function(t){var e=new r(t);if(t.type==s.Identifier){var i=t.name,n=this.getBindingByName(i);if(n)return e.copy(n),n}return e},getObjectInfoFor:function(t){if(!t.isObject())return null;var e=t.getStaticProperties();return e?e:t.isOfKind(i.OBJECT_KINDS.ANY)?t.getNodeInfo():this.registry&&this.registry.getInstanceForKind(t.getKind())||null}}),t.exports=c}(module);


},{"../interfaces.js":168,"./annotation.js":130,"./errors.js":134,"./index.js":135,"./typeinfo.js":137,"estraverse":91}],137:[function(require,module,exports){
!function(t){var e=require("../interfaces.js"),i=require("estraverse").Syntax,n=require("./index.js"),r=require("analyses").Set,s=e.TYPES,a=e.OBJECT_KINDS,u=function(t,e){this.node=t,this.node.extra=this.node.extra||{},e&&n.shallowExtend(this.node.extra,e)};u.createForContext=function(t,e){var n=new u(t);if(n.getType()!==s.ANY)return n;if(t.type==i.Identifier){var r=t.name,a=e.getBindingByName(r);a&&n.copy(a)}return n},u.copyStaticValue=function(t,i){if(i=i||t.getStaticValue(),!t.isObject())return i;switch(t.getKind()){case a.FLOAT2:return new e.Vec2(i);case a.FLOAT3:return new e.Vec3(i);case a.FLOAT4:return new e.Vec4(i);case a.MATRIX3:return new e.Mat3(i);case a.MATRIX4:return new e.Mat4(i);default:throw new Error("Can't copy static value of kind: "+t.getKind())}},u.prototype={getExtra:function(){return this.node.extra},getType:function(){var t=this.getExtra();return void 0!=t.type?t.type:s.ANY},setKind:function(t){var e=this.getExtra();e.kind=t},getKind:function(){return this.isObject()?this.getExtra().kind||a.ANY:null},getUserData:function(){var t=this.getExtra();return t.userData||(t.userData={}),t.userData},getArrayElementType:function(){if(!this.isArray())throw new Error("Called getArrayElementType on "+this.getType());return this.getExtra().elements},isOfKind:function(t){return this.isObject()?this.getKind()==t:!1},setType:function(t,e){var i=this.getExtra();i.type=t,e&&this.setKind(e),this.isValid()&&this.clearError()},setInvalid:function(t){this.setType(s.INVALID),t&&this.setError(t)},isOfType:function(t){return this.getType()==t},equals:function(t){return this.getType()==t.getType()&&this.getKind()==t.getKind()},isInt:function(){return this.isOfType(s.INT)},isNumber:function(){return this.isOfType(s.NUMBER)},isValid:function(){return!this.isOfType(s.INVALID)},isNullOrUndefined:function(){return this.isNull()||this.isUndefined()},isNull:function(){return this.isOfType(s.NULL)},isUndefined:function(){return this.isOfType(s.UNDEFINED)},isBool:function(){return this.isOfType(s.BOOLEAN)},isString:function(){return this.isOfType(s.STRING)},isArray:function(){return this.isOfType(s.ARRAY)},isFunction:function(){return this.isOfType(s.FUNCTION)},isObject:function(){return this.isOfType(s.OBJECT)},isVector:function(){return this.isObject()&&this.isOfKind(a.FLOAT2)||this.isOfKind(a.FLOAT3)||this.isOfKind(a.FLOAT4)},isGlobal:function(){return!!this.getExtra().global},setGlobal:function(t){var e=this.getExtra();e.global=t},isOutput:function(){return!!this.getExtra().output},setOutput:function(t){var e=this.getExtra();e.output=t},canNumber:function(){return this.isNumber()||this.isInt()||this.isBool()},canInt:function(){return this.isInt()||this.isBool()},canObject:function(){return this.isObject()||this.isArray()||this.isFunction()},setCommonType:function(t,e){return t.equals(e)?(this.copy(t),!0):t.canNumber()&&e.canNumber()?(this.setType(s.NUMBER),!0):!1},hasStaticValue:function(){var t=this.getExtra();return this.isNullOrUndefined()?!0:t.hasOwnProperty("staticValue")},setStaticValue:function(t){var e=this.getExtra();if(this.isNullOrUndefined())throw new Error("Null and undefined have predefined values.");e.staticValue=t},canUniformExpression:function(){return this.hasStaticValue()||this.isUniformExpression()},isUniformExpression:function(){var t=this.getExtra();return t.hasOwnProperty("uniformDependencies")},setUniformDependencies:function(){var t=this.getExtra(),e=new r,i=Array.prototype.slice.call(arguments);i.forEach(function(t){Array.isArray(t)?e=r.union(e,t):e.add(t)}),t.uniformDependencies=e.values()},getUniformDependencies:function(){var t=this.getExtra();return t.uniformDependencies||[]},getUniformCosts:function(){var t=this.getExtra();return 0|t.uniformCosts},setUniformCosts:function(t){var e=this.getExtra();e.uniformCosts=t},clearUniformDependencies:function(){var t=this.getExtra();delete t.uniformDependencies},getStaticValue:function(){if(!this.hasStaticValue())throw new Error("Node has no static value: "+this.node);return this.isNull()?null:this.isUndefined()?void 0:this.getExtra().staticValue},setDynamicValue:function(){delete this.getExtra().staticValue},setCall:function(t){var e=this.getExtra();e.evaluate=t},getCall:function(){return this.getExtra().evaluate},clearCall:function(){var t=this.getExtra();delete t.evaluate},copy:function(t){this.setFromExtra(t.getExtra())},str:function(){var t=this.getExtra();return JSON.stringify(t,null,1)},canNormal:function(){return this.isObject()&&(this.isOfKind(a.NORMAL)||this.isOfKind(a.FLOAT3))},canColor:function(){return this.isObject()&&(this.isOfKind(a.FLOAT4)||this.isOfKind(a.FLOAT3))},hasError:function(){return null!=this.getError()},getError:function(){var t=this.getExtra();return t.error},setError:function(t){var e=this.getExtra();e.error=t},clearError:function(){var t=this.getExtra();t.error=null},setFromExtra:function(t){n.shallowExtend(this.node.extra,t),void 0!=t.staticValue&&this.setStaticValue(u.copyStaticValue(this,t.staticValue))},getNodeInfo:function(){return this.isObject()?this.getExtra().info:void 0},setNodeInfo:function(t){if(!this.isObject())throw new Error("Only objects may have a node info");this.getExtra().info=t},getTypeString:function(){return this.isObject()?this.isOfKind(a.ANY)?"Object":"Object #<"+this.getKind()+">":this.getType()},getJavaScriptTypeString:function(){switch(this.getType()){case s.INT:case s.FLOAT:case s.NUMBER:return"number";case s.OBJECT:case s.ARRAY:return"object";case s.STRING:return"string";case s.UNDEFINED:return"undefined";default:return"?"+this.getType()}},setSource:function(t){var e=this.getExtra();e.source=t},getSource:function(){return this.getExtra().source},getStaticProperties:function(){return null},isDerived:function(){return 1==this.getExtra().derived},getStaticTruthValue:function(){return this.isNullOrUndefined()?!1:this.canObject()?!0:this.hasStaticValue()?!!this.getStaticValue():void 0},setSemantic:function(t){this.getExtra().semantic=t},getSemantic:function(t){return this.getExtra().semantic}},t.TypeInfo=u}(exports);


},{"../interfaces.js":168,"./index.js":135,"analyses":1,"estraverse":91}],138:[function(require,module,exports){
!function(e){e.swizzleToIndex=function(e){switch(e){case"x":case"r":case"s":return 0;case"y":case"g":case"t":return 1;case"z":case"b":case"p":return 2;case"w":case"a":case"q":return 3}throw new Error("Unknown swizzle key: '"+e+"'")},e.indexToSwizzle=function(e){switch(e){case 0:return"x";case 1:return"y";case 2:return"z";case 3:return"w"}throw new Error("Unknown swizzle index: '"+e+"'")},e.swizzleSets=[["x","y","z","w"],["r","g","b","a"],["s","t","p","q"]],e.swizzleOperators={Add:"+",Sub:"-",Mul:"*",Div:"/"}}(exports);


},{}],139:[function(require,module,exports){
!function(r){function n(r){var n=Math[r];return function(r){for(var t=r.length,a=new Float32Array(t);t--;)a[t]=n(r[t]);return a}}var t=["acos","asin","atan","cos","exp","log","round","sin","sqrt","tan","ceil","floor"],a={mix:function(r,n,t){var a,o=r.length,e=new Float32Array(o);if(Array.isArray(t)&&t.length>=o)for(;o--;){var t=t[o];e[o]=r[o]*(1-t)+n[o]*t}else for(a=1-t;o--;)e[o]=r[o]*a+n[o]*t;return e},step:function(r,n){for(var t=r.length,a=new Float32Array(t);t--;){var o=r[t],e=n[t];a[t]=o>=e?0:1}return a},smoothstep:function(r,n,t){for(var a=r.length,o=new Float32Array(a);a--;){var e=r[a],f=n[a],l=t[a],c=Math.clamp((l-e)/(f-e),0,1);o[a]=c*c*(3-2*c)}return o}};t.forEach(function(r){a[r]=n(r)}),r.VecMath=a}(exports);


},{}],140:[function(require,module,exports){
!function(r){r.extend=function(r){var n=r.vec2,t=r.vec3,a=r.vec4,c=(r.mat2,r.mat3),e=r.mat4;n.setLength=function(r,t,a){var c=n.length(t);c&&n.scale(r,t,a/c)},t.setLength=function(r,n,a){var c=t.length(n);c&&t.scale(r,n,a/c)},a.setLength=function(r,n,t){var c=a.length(n);c&&a.scale(r,n,t/c)},n.copyArray=function(r,t,a){var c=2*a;n.set(r,t[c],t[c+1])},t.copyArray=function(r,n,a){var c=3*a;t.set(r,n[c],n[c+1],n[c+2])},a.copyArray=function(r,n,t){var c=4*t;a.set(r,n[c],n[c+1],n[c+2],n[c+3])},c.copyArray=function(r,n,t){for(var a=9,c=a*t;a--;)r[a]=n[c+a]},e.copyArray=function(r,n,t){for(var a=16,c=a*t;a--;)r[a]=n[c+a]},n.pasteArray=function(r,n,t){var a=2*n;r[a]=t[0],r[a+1]=t[1]},t.pasteArray=function(r,n,t){var a=3*n;r[a]=t[0],r[a+1]=t[1],r[a+2]=t[2]},a.pasteArray=function(r,n,t){var a=3*n;r[a]=t[0],r[a+1]=t[1],r[a+2]=t[2],r[a+3]=t[3]},c.pasteArray=function(r,n,t){for(var a=9,c=a*n;a--;)r[c+a]=t[a]},e.pasteArray=function(r,n,t){for(var a=16,c=a*n;a--;)r[c+a]=t[a]}}}(exports);


},{}],141:[function(require,module,exports){
!function(t){"use strict";var n={};"undefined"==typeof exports?"function"==typeof define&&"object"==typeof define.amd&&define.amd?(n.exports={},define(function(){return n.exports})):n.exports="undefined"!=typeof window?window:t:n.exports=exports,function(t){if(!n)var n=1e-6;if(!r)var r="undefined"!=typeof Float32Array?Float32Array:Array;if(!e)var e=Math.random;var a={};a.setMatrixArrayType=function(t){r=t},"undefined"!=typeof t&&(t.glMatrix=a);var u=Math.PI/180;a.toRadian=function(t){return t*u};var o={};o.create=function(){var t=new r(2);return t[0]=0,t[1]=0,t},o.clone=function(t){var n=new r(2);return n[0]=t[0],n[1]=t[1],n},o.fromValues=function(t,n){var e=new r(2);return e[0]=t,e[1]=n,e},o.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t},o.set=function(t,n,r){return t[0]=n,t[1]=r,t},o.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t},o.subtract=function(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t},o.sub=o.subtract,o.multiply=function(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t},o.mul=o.multiply,o.divide=function(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t},o.div=o.divide,o.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t},o.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t},o.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t},o.scaleAndAdd=function(t,n,r,e){return t[0]=n[0]+r[0]*e,t[1]=n[1]+r[1]*e,t},o.distance=function(t,n){var r=n[0]-t[0],e=n[1]-t[1];return Math.sqrt(r*r+e*e)},o.dist=o.distance,o.squaredDistance=function(t,n){var r=n[0]-t[0],e=n[1]-t[1];return r*r+e*e},o.sqrDist=o.squaredDistance,o.length=function(t){var n=t[0],r=t[1];return Math.sqrt(n*n+r*r)},o.len=o.length,o.squaredLength=function(t){var n=t[0],r=t[1];return n*n+r*r},o.sqrLen=o.squaredLength,o.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t},o.normalize=function(t,n){var r=n[0],e=n[1],a=r*r+e*e;return a>0&&(a=1/Math.sqrt(a),t[0]=n[0]*a,t[1]=n[1]*a),t},o.dot=function(t,n){return t[0]*n[0]+t[1]*n[1]},o.cross=function(t,n,r){var e=n[0]*r[1]-n[1]*r[0];return t[0]=t[1]=0,t[2]=e,t},o.lerp=function(t,n,r,e){var a=n[0],u=n[1];return t[0]=a+e*(r[0]-a),t[1]=u+e*(r[1]-u),t},o.random=function(t,n){n=n||1;var r=2*e()*Math.PI;return t[0]=Math.cos(r)*n,t[1]=Math.sin(r)*n,t},o.transformMat2=function(t,n,r){var e=n[0],a=n[1];return t[0]=r[0]*e+r[2]*a,t[1]=r[1]*e+r[3]*a,t},o.transformMat2d=function(t,n,r){var e=n[0],a=n[1];return t[0]=r[0]*e+r[2]*a+r[4],t[1]=r[1]*e+r[3]*a+r[5],t},o.transformMat3=function(t,n,r){var e=n[0],a=n[1];return t[0]=r[0]*e+r[3]*a+r[6],t[1]=r[1]*e+r[4]*a+r[7],t},o.transformMat4=function(t,n,r){var e=n[0],a=n[1];return t[0]=r[0]*e+r[4]*a+r[12],t[1]=r[1]*e+r[5]*a+r[13],t},o.forEach=function(){var t=o.create();return function(n,r,e,a,u,o){var i,c;for(r||(r=2),e||(e=0),c=a?Math.min(a*r+e,n.length):n.length,i=e;c>i;i+=r)t[0]=n[i],t[1]=n[i+1],u(t,t,o),n[i]=t[0],n[i+1]=t[1];return n}}(),o.str=function(t){return"vec2("+t[0]+", "+t[1]+")"},"undefined"!=typeof t&&(t.vec2=o);var i={};i.create=function(){var t=new r(3);return t[0]=0,t[1]=0,t[2]=0,t},i.clone=function(t){var n=new r(3);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n},i.fromValues=function(t,n,e){var a=new r(3);return a[0]=t,a[1]=n,a[2]=e,a},i.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t},i.set=function(t,n,r,e){return t[0]=n,t[1]=r,t[2]=e,t},i.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t},i.subtract=function(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t},i.sub=i.subtract,i.multiply=function(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t[2]=n[2]*r[2],t},i.mul=i.multiply,i.divide=function(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t[2]=n[2]/r[2],t},i.div=i.divide,i.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t[2]=Math.min(n[2],r[2]),t},i.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t[2]=Math.max(n[2],r[2]),t},i.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t},i.scaleAndAdd=function(t,n,r,e){return t[0]=n[0]+r[0]*e,t[1]=n[1]+r[1]*e,t[2]=n[2]+r[2]*e,t},i.distance=function(t,n){var r=n[0]-t[0],e=n[1]-t[1],a=n[2]-t[2];return Math.sqrt(r*r+e*e+a*a)},i.dist=i.distance,i.squaredDistance=function(t,n){var r=n[0]-t[0],e=n[1]-t[1],a=n[2]-t[2];return r*r+e*e+a*a},i.sqrDist=i.squaredDistance,i.length=function(t){var n=t[0],r=t[1],e=t[2];return Math.sqrt(n*n+r*r+e*e)},i.len=i.length,i.squaredLength=function(t){var n=t[0],r=t[1],e=t[2];return n*n+r*r+e*e},i.sqrLen=i.squaredLength,i.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t},i.normalize=function(t,n){var r=n[0],e=n[1],a=n[2],u=r*r+e*e+a*a;return u>0&&(u=1/Math.sqrt(u),t[0]=n[0]*u,t[1]=n[1]*u,t[2]=n[2]*u),t},i.dot=function(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]},i.cross=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=r[0],i=r[1],c=r[2];return t[0]=a*c-u*i,t[1]=u*o-e*c,t[2]=e*i-a*o,t},i.lerp=function(t,n,r,e){var a=n[0],u=n[1],o=n[2];return t[0]=a+e*(r[0]-a),t[1]=u+e*(r[1]-u),t[2]=o+e*(r[2]-o),t},i.random=function(t,n){n=n||1;var r=2*e()*Math.PI,a=2*e()-1,u=Math.sqrt(1-a*a)*n;return t[0]=Math.cos(r)*u,t[1]=Math.sin(r)*u,t[2]=a*n,t},i.transformMat4=function(t,n,r){var e=n[0],a=n[1],u=n[2];return t[0]=r[0]*e+r[4]*a+r[8]*u+r[12],t[1]=r[1]*e+r[5]*a+r[9]*u+r[13],t[2]=r[2]*e+r[6]*a+r[10]*u+r[14],t},i.transformMat3=function(t,n,r){var e=n[0],a=n[1],u=n[2];return t[0]=e*r[0]+a*r[3]+u*r[6],t[1]=e*r[1]+a*r[4]+u*r[7],t[2]=e*r[2]+a*r[5]+u*r[8],t},i.transformQuat=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=r[0],i=r[1],c=r[2],f=r[3],s=f*e+i*u-c*a,h=f*a+c*e-o*u,v=f*u+o*a-i*e,M=-o*e-i*a-c*u;return t[0]=s*f+M*-o+h*-c-v*-i,t[1]=h*f+M*-i+v*-o-s*-c,t[2]=v*f+M*-c+s*-i-h*-o,t},i.rotateX=function(t,n,r,e){var a=[],u=[];return a[0]=n[0]-r[0],a[1]=n[1]-r[1],a[2]=n[2]-r[2],u[0]=a[0],u[1]=a[1]*Math.cos(e)-a[2]*Math.sin(e),u[2]=a[1]*Math.sin(e)+a[2]*Math.cos(e),t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},i.rotateY=function(t,n,r,e){var a=[],u=[];return a[0]=n[0]-r[0],a[1]=n[1]-r[1],a[2]=n[2]-r[2],u[0]=a[2]*Math.sin(e)+a[0]*Math.cos(e),u[1]=a[1],u[2]=a[2]*Math.cos(e)-a[0]*Math.sin(e),t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},i.rotateZ=function(t,n,r,e){var a=[],u=[];return a[0]=n[0]-r[0],a[1]=n[1]-r[1],a[2]=n[2]-r[2],u[0]=a[0]*Math.cos(e)-a[1]*Math.sin(e),u[1]=a[0]*Math.sin(e)+a[1]*Math.cos(e),u[2]=a[2],t[0]=u[0]+r[0],t[1]=u[1]+r[1],t[2]=u[2]+r[2],t},i.forEach=function(){var t=i.create();return function(n,r,e,a,u,o){var i,c;for(r||(r=3),e||(e=0),c=a?Math.min(a*r+e,n.length):n.length,i=e;c>i;i+=r)t[0]=n[i],t[1]=n[i+1],t[2]=n[i+2],u(t,t,o),n[i]=t[0],n[i+1]=t[1],n[i+2]=t[2];return n}}(),i.str=function(t){return"vec3("+t[0]+", "+t[1]+", "+t[2]+")"},"undefined"!=typeof t&&(t.vec3=i);var c={};c.create=function(){var t=new r(4);return t[0]=0,t[1]=0,t[2]=0,t[3]=0,t},c.clone=function(t){var n=new r(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n},c.fromValues=function(t,n,e,a){var u=new r(4);return u[0]=t,u[1]=n,u[2]=e,u[3]=a,u},c.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t},c.set=function(t,n,r,e,a){return t[0]=n,t[1]=r,t[2]=e,t[3]=a,t},c.add=function(t,n,r){return t[0]=n[0]+r[0],t[1]=n[1]+r[1],t[2]=n[2]+r[2],t[3]=n[3]+r[3],t},c.subtract=function(t,n,r){return t[0]=n[0]-r[0],t[1]=n[1]-r[1],t[2]=n[2]-r[2],t[3]=n[3]-r[3],t},c.sub=c.subtract,c.multiply=function(t,n,r){return t[0]=n[0]*r[0],t[1]=n[1]*r[1],t[2]=n[2]*r[2],t[3]=n[3]*r[3],t},c.mul=c.multiply,c.divide=function(t,n,r){return t[0]=n[0]/r[0],t[1]=n[1]/r[1],t[2]=n[2]/r[2],t[3]=n[3]/r[3],t},c.div=c.divide,c.min=function(t,n,r){return t[0]=Math.min(n[0],r[0]),t[1]=Math.min(n[1],r[1]),t[2]=Math.min(n[2],r[2]),t[3]=Math.min(n[3],r[3]),t},c.max=function(t,n,r){return t[0]=Math.max(n[0],r[0]),t[1]=Math.max(n[1],r[1]),t[2]=Math.max(n[2],r[2]),t[3]=Math.max(n[3],r[3]),t},c.scale=function(t,n,r){return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t},c.scaleAndAdd=function(t,n,r,e){return t[0]=n[0]+r[0]*e,t[1]=n[1]+r[1]*e,t[2]=n[2]+r[2]*e,t[3]=n[3]+r[3]*e,t},c.distance=function(t,n){var r=n[0]-t[0],e=n[1]-t[1],a=n[2]-t[2],u=n[3]-t[3];return Math.sqrt(r*r+e*e+a*a+u*u)},c.dist=c.distance,c.squaredDistance=function(t,n){var r=n[0]-t[0],e=n[1]-t[1],a=n[2]-t[2],u=n[3]-t[3];return r*r+e*e+a*a+u*u},c.sqrDist=c.squaredDistance,c.length=function(t){var n=t[0],r=t[1],e=t[2],a=t[3];return Math.sqrt(n*n+r*r+e*e+a*a)},c.len=c.length,c.squaredLength=function(t){var n=t[0],r=t[1],e=t[2],a=t[3];return n*n+r*r+e*e+a*a},c.sqrLen=c.squaredLength,c.negate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=-n[3],t},c.normalize=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=r*r+e*e+a*a+u*u;return o>0&&(o=1/Math.sqrt(o),t[0]=n[0]*o,t[1]=n[1]*o,t[2]=n[2]*o,t[3]=n[3]*o),t},c.dot=function(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]+t[3]*n[3]},c.lerp=function(t,n,r,e){var a=n[0],u=n[1],o=n[2],i=n[3];return t[0]=a+e*(r[0]-a),t[1]=u+e*(r[1]-u),t[2]=o+e*(r[2]-o),t[3]=i+e*(r[3]-i),t},c.random=function(t,n){return n=n||1,t[0]=e(),t[1]=e(),t[2]=e(),t[3]=e(),c.normalize(t,t),c.scale(t,t,n),t},c.transformMat4=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3];return t[0]=r[0]*e+r[4]*a+r[8]*u+r[12]*o,t[1]=r[1]*e+r[5]*a+r[9]*u+r[13]*o,t[2]=r[2]*e+r[6]*a+r[10]*u+r[14]*o,t[3]=r[3]*e+r[7]*a+r[11]*u+r[15]*o,t},c.transformQuat=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=r[0],i=r[1],c=r[2],f=r[3],s=f*e+i*u-c*a,h=f*a+c*e-o*u,v=f*u+o*a-i*e,M=-o*e-i*a-c*u;return t[0]=s*f+M*-o+h*-c-v*-i,t[1]=h*f+M*-i+v*-o-s*-c,t[2]=v*f+M*-c+s*-i-h*-o,t},c.forEach=function(){var t=c.create();return function(n,r,e,a,u,o){var i,c;for(r||(r=4),e||(e=0),c=a?Math.min(a*r+e,n.length):n.length,i=e;c>i;i+=r)t[0]=n[i],t[1]=n[i+1],t[2]=n[i+2],t[3]=n[i+3],u(t,t,o),n[i]=t[0],n[i+1]=t[1],n[i+2]=t[2],n[i+3]=t[3];return n}}(),c.str=function(t){return"vec4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"},"undefined"!=typeof t&&(t.vec4=c);var f={};f.create=function(){var t=new r(4);return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t},f.clone=function(t){var n=new r(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n},f.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t},f.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t},f.transpose=function(t,n){if(t===n){var r=n[1];t[1]=n[2],t[2]=r}else t[0]=n[0],t[1]=n[2],t[2]=n[1],t[3]=n[3];return t},f.invert=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=r*u-a*e;return o?(o=1/o,t[0]=u*o,t[1]=-e*o,t[2]=-a*o,t[3]=r*o,t):null},f.adjoint=function(t,n){var r=n[0];return t[0]=n[3],t[1]=-n[1],t[2]=-n[2],t[3]=r,t},f.determinant=function(t){return t[0]*t[3]-t[2]*t[1]},f.multiply=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=r[0],c=r[1],f=r[2],s=r[3];return t[0]=e*i+u*c,t[1]=a*i+o*c,t[2]=e*f+u*s,t[3]=a*f+o*s,t},f.mul=f.multiply,f.rotate=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=Math.sin(r),c=Math.cos(r);return t[0]=e*c+u*i,t[1]=a*c+o*i,t[2]=e*-i+u*c,t[3]=a*-i+o*c,t},f.scale=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=r[0],c=r[1];return t[0]=e*i,t[1]=a*i,t[2]=u*c,t[3]=o*c,t},f.str=function(t){return"mat2("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"},f.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2))},f.LDU=function(t,n,r,e){return t[2]=e[2]/e[0],r[0]=e[0],r[1]=e[1],r[3]=e[3]-t[2]*r[1],[t,n,r]},"undefined"!=typeof t&&(t.mat2=f);var s={};s.create=function(){var t=new r(6);return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t},s.clone=function(t){var n=new r(6);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n},s.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t},s.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t},s.invert=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=n[4],i=n[5],c=r*u-e*a;return c?(c=1/c,t[0]=u*c,t[1]=-e*c,t[2]=-a*c,t[3]=r*c,t[4]=(a*i-u*o)*c,t[5]=(e*o-r*i)*c,t):null},s.determinant=function(t){return t[0]*t[3]-t[1]*t[2]},s.multiply=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=r[0],s=r[1],h=r[2],v=r[3],M=r[4],l=r[5];return t[0]=e*f+u*s,t[1]=a*f+o*s,t[2]=e*h+u*v,t[3]=a*h+o*v,t[4]=e*M+u*l+i,t[5]=a*M+o*l+c,t},s.mul=s.multiply,s.rotate=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=Math.sin(r),s=Math.cos(r);return t[0]=e*s+u*f,t[1]=a*s+o*f,t[2]=e*-f+u*s,t[3]=a*-f+o*s,t[4]=i,t[5]=c,t},s.scale=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=r[0],s=r[1];return t[0]=e*f,t[1]=a*f,t[2]=u*s,t[3]=o*s,t[4]=i,t[5]=c,t},s.translate=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=r[0],s=r[1];return t[0]=e,t[1]=a,t[2]=u,t[3]=o,t[4]=e*f+u*s+i,t[5]=a*f+o*s+c,t},s.str=function(t){return"mat2d("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+")"},s.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+1)},"undefined"!=typeof t&&(t.mat2d=s);var h={};h.create=function(){var t=new r(9);return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},h.fromMat4=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[4],t[4]=n[5],t[5]=n[6],t[6]=n[8],t[7]=n[9],t[8]=n[10],t},h.clone=function(t){var n=new r(9);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n},h.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t},h.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t},h.transpose=function(t,n){if(t===n){var r=n[1],e=n[2],a=n[5];t[1]=n[3],t[2]=n[6],t[3]=r,t[5]=n[7],t[6]=e,t[7]=a}else t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8];return t},h.invert=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=n[4],i=n[5],c=n[6],f=n[7],s=n[8],h=s*o-i*f,v=-s*u+i*c,M=f*u-o*c,l=r*h+e*v+a*M;return l?(l=1/l,t[0]=h*l,t[1]=(-s*e+a*f)*l,t[2]=(i*e-a*o)*l,t[3]=v*l,t[4]=(s*r-a*c)*l,t[5]=(-i*r+a*u)*l,t[6]=M*l,t[7]=(-f*r+e*c)*l,t[8]=(o*r-e*u)*l,t):null},h.adjoint=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=n[4],i=n[5],c=n[6],f=n[7],s=n[8];return t[0]=o*s-i*f,t[1]=a*f-e*s,t[2]=e*i-a*o,t[3]=i*c-u*s,t[4]=r*s-a*c,t[5]=a*u-r*i,t[6]=u*f-o*c,t[7]=e*c-r*f,t[8]=r*o-e*u,t},h.determinant=function(t){var n=t[0],r=t[1],e=t[2],a=t[3],u=t[4],o=t[5],i=t[6],c=t[7],f=t[8];return n*(f*u-o*c)+r*(-f*a+o*i)+e*(c*a-u*i)},h.multiply=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=n[6],s=n[7],h=n[8],v=r[0],M=r[1],l=r[2],d=r[3],m=r[4],p=r[5],w=r[6],y=r[7],q=r[8];return t[0]=v*e+M*o+l*f,t[1]=v*a+M*i+l*s,t[2]=v*u+M*c+l*h,t[3]=d*e+m*o+p*f,t[4]=d*a+m*i+p*s,t[5]=d*u+m*c+p*h,t[6]=w*e+y*o+q*f,t[7]=w*a+y*i+q*s,t[8]=w*u+y*c+q*h,t},h.mul=h.multiply,h.translate=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=n[6],s=n[7],h=n[8],v=r[0],M=r[1];return t[0]=e,t[1]=a,t[2]=u,t[3]=o,t[4]=i,t[5]=c,t[6]=v*e+M*o+f,t[7]=v*a+M*i+s,t[8]=v*u+M*c+h,t},h.rotate=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=n[6],s=n[7],h=n[8],v=Math.sin(r),M=Math.cos(r);return t[0]=M*e+v*o,t[1]=M*a+v*i,t[2]=M*u+v*c,t[3]=M*o-v*e,t[4]=M*i-v*a,t[5]=M*c-v*u,t[6]=f,t[7]=s,t[8]=h,t},h.scale=function(t,n,r){var e=r[0],a=r[1];return t[0]=e*n[0],t[1]=e*n[1],t[2]=e*n[2],t[3]=a*n[3],t[4]=a*n[4],t[5]=a*n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t},h.fromMat2d=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=0,t[3]=n[2],t[4]=n[3],t[5]=0,t[6]=n[4],t[7]=n[5],t[8]=1,t},h.fromQuat=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=r+r,i=e+e,c=a+a,f=r*o,s=e*o,h=e*i,v=a*o,M=a*i,l=a*c,d=u*o,m=u*i,p=u*c;return t[0]=1-h-l,t[3]=s-p,t[6]=v+m,t[1]=s+p,t[4]=1-f-l,t[7]=M-d,t[2]=v-m,t[5]=M+d,t[8]=1-f-h,t},h.normalFromMat4=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=n[4],i=n[5],c=n[6],f=n[7],s=n[8],h=n[9],v=n[10],M=n[11],l=n[12],d=n[13],m=n[14],p=n[15],w=r*i-e*o,y=r*c-a*o,q=r*f-u*o,g=e*c-a*i,x=e*f-u*i,b=a*f-u*c,A=s*d-h*l,L=s*m-v*l,D=s*p-M*l,z=h*m-v*d,V=h*p-M*d,j=v*p-M*m,I=w*j-y*V+q*z+g*D-x*L+b*A;return I?(I=1/I,t[0]=(i*j-c*V+f*z)*I,t[1]=(c*D-o*j-f*L)*I,t[2]=(o*V-i*D+f*A)*I,t[3]=(a*V-e*j-u*z)*I,t[4]=(r*j-a*D+u*L)*I,t[5]=(e*D-r*V-u*A)*I,t[6]=(d*b-m*x+p*g)*I,t[7]=(m*q-l*b-p*y)*I,t[8]=(l*x-d*q+p*w)*I,t):null},h.str=function(t){return"mat3("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+")"},h.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2))},"undefined"!=typeof t&&(t.mat3=h);var v={};v.create=function(){var t=new r(16);return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},v.clone=function(t){var n=new r(16);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n[9]=t[9],n[10]=t[10],n[11]=t[11],n[12]=t[12],n[13]=t[13],n[14]=t[14],n[15]=t[15],n},v.copy=function(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t},v.identity=function(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},v.transpose=function(t,n){if(t===n){var r=n[1],e=n[2],a=n[3],u=n[6],o=n[7],i=n[11];t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=r,t[6]=n[9],t[7]=n[13],t[8]=e,t[9]=u,t[11]=n[14],t[12]=a,t[13]=o,t[14]=i}else t[0]=n[0],t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=n[1],t[5]=n[5],t[6]=n[9],t[7]=n[13],t[8]=n[2],t[9]=n[6],t[10]=n[10],t[11]=n[14],t[12]=n[3],t[13]=n[7],t[14]=n[11],t[15]=n[15];return t},v.invert=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=n[4],i=n[5],c=n[6],f=n[7],s=n[8],h=n[9],v=n[10],M=n[11],l=n[12],d=n[13],m=n[14],p=n[15],w=r*i-e*o,y=r*c-a*o,q=r*f-u*o,g=e*c-a*i,x=e*f-u*i,b=a*f-u*c,A=s*d-h*l,L=s*m-v*l,D=s*p-M*l,z=h*m-v*d,V=h*p-M*d,j=v*p-M*m,I=w*j-y*V+q*z+g*D-x*L+b*A;return I?(I=1/I,t[0]=(i*j-c*V+f*z)*I,t[1]=(a*V-e*j-u*z)*I,t[2]=(d*b-m*x+p*g)*I,t[3]=(v*x-h*b-M*g)*I,t[4]=(c*D-o*j-f*L)*I,t[5]=(r*j-a*D+u*L)*I,t[6]=(m*q-l*b-p*y)*I,t[7]=(s*b-v*q+M*y)*I,t[8]=(o*V-i*D+f*A)*I,t[9]=(e*D-r*V-u*A)*I,t[10]=(l*x-d*q+p*w)*I,t[11]=(h*q-s*x-M*w)*I,t[12]=(i*L-o*z-c*A)*I,t[13]=(r*z-e*L+a*A)*I,t[14]=(d*y-l*g-m*w)*I,t[15]=(s*g-h*y+v*w)*I,t):null},v.adjoint=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=n[4],i=n[5],c=n[6],f=n[7],s=n[8],h=n[9],v=n[10],M=n[11],l=n[12],d=n[13],m=n[14],p=n[15];return t[0]=i*(v*p-M*m)-h*(c*p-f*m)+d*(c*M-f*v),t[1]=-(e*(v*p-M*m)-h*(a*p-u*m)+d*(a*M-u*v)),t[2]=e*(c*p-f*m)-i*(a*p-u*m)+d*(a*f-u*c),t[3]=-(e*(c*M-f*v)-i*(a*M-u*v)+h*(a*f-u*c)),t[4]=-(o*(v*p-M*m)-s*(c*p-f*m)+l*(c*M-f*v)),t[5]=r*(v*p-M*m)-s*(a*p-u*m)+l*(a*M-u*v),t[6]=-(r*(c*p-f*m)-o*(a*p-u*m)+l*(a*f-u*c)),t[7]=r*(c*M-f*v)-o*(a*M-u*v)+s*(a*f-u*c),t[8]=o*(h*p-M*d)-s*(i*p-f*d)+l*(i*M-f*h),t[9]=-(r*(h*p-M*d)-s*(e*p-u*d)+l*(e*M-u*h)),t[10]=r*(i*p-f*d)-o*(e*p-u*d)+l*(e*f-u*i),t[11]=-(r*(i*M-f*h)-o*(e*M-u*h)+s*(e*f-u*i)),t[12]=-(o*(h*m-v*d)-s*(i*m-c*d)+l*(i*v-c*h)),t[13]=r*(h*m-v*d)-s*(e*m-a*d)+l*(e*v-a*h),t[14]=-(r*(i*m-c*d)-o*(e*m-a*d)+l*(e*c-a*i)),t[15]=r*(i*v-c*h)-o*(e*v-a*h)+s*(e*c-a*i),t},v.determinant=function(t){var n=t[0],r=t[1],e=t[2],a=t[3],u=t[4],o=t[5],i=t[6],c=t[7],f=t[8],s=t[9],h=t[10],v=t[11],M=t[12],l=t[13],d=t[14],m=t[15],p=n*o-r*u,w=n*i-e*u,y=n*c-a*u,q=r*i-e*o,g=r*c-a*o,x=e*c-a*i,b=f*l-s*M,A=f*d-h*M,L=f*m-v*M,D=s*d-h*l,z=s*m-v*l,V=h*m-v*d;return p*V-w*z+y*D+q*L-g*A+x*b},v.multiply=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=n[6],s=n[7],h=n[8],v=n[9],M=n[10],l=n[11],d=n[12],m=n[13],p=n[14],w=n[15],y=r[0],q=r[1],g=r[2],x=r[3];return t[0]=y*e+q*i+g*h+x*d,t[1]=y*a+q*c+g*v+x*m,t[2]=y*u+q*f+g*M+x*p,t[3]=y*o+q*s+g*l+x*w,y=r[4],q=r[5],g=r[6],x=r[7],t[4]=y*e+q*i+g*h+x*d,t[5]=y*a+q*c+g*v+x*m,t[6]=y*u+q*f+g*M+x*p,t[7]=y*o+q*s+g*l+x*w,y=r[8],q=r[9],g=r[10],x=r[11],t[8]=y*e+q*i+g*h+x*d,t[9]=y*a+q*c+g*v+x*m,t[10]=y*u+q*f+g*M+x*p,t[11]=y*o+q*s+g*l+x*w,y=r[12],q=r[13],g=r[14],x=r[15],t[12]=y*e+q*i+g*h+x*d,t[13]=y*a+q*c+g*v+x*m,t[14]=y*u+q*f+g*M+x*p,t[15]=y*o+q*s+g*l+x*w,t},v.mul=v.multiply,v.translate=function(t,n,r){var e,a,u,o,i,c,f,s,h,v,M,l,d=r[0],m=r[1],p=r[2];return n===t?(t[12]=n[0]*d+n[4]*m+n[8]*p+n[12],t[13]=n[1]*d+n[5]*m+n[9]*p+n[13],t[14]=n[2]*d+n[6]*m+n[10]*p+n[14],t[15]=n[3]*d+n[7]*m+n[11]*p+n[15]):(e=n[0],a=n[1],u=n[2],o=n[3],i=n[4],c=n[5],f=n[6],s=n[7],h=n[8],v=n[9],M=n[10],l=n[11],t[0]=e,t[1]=a,t[2]=u,t[3]=o,t[4]=i,t[5]=c,t[6]=f,t[7]=s,t[8]=h,t[9]=v,t[10]=M,t[11]=l,t[12]=e*d+i*m+h*p+n[12],t[13]=a*d+c*m+v*p+n[13],t[14]=u*d+f*m+M*p+n[14],t[15]=o*d+s*m+l*p+n[15]),t},v.scale=function(t,n,r){var e=r[0],a=r[1],u=r[2];return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t[3]=n[3]*e,t[4]=n[4]*a,t[5]=n[5]*a,t[6]=n[6]*a,t[7]=n[7]*a,t[8]=n[8]*u,t[9]=n[9]*u,t[10]=n[10]*u,t[11]=n[11]*u,t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t},v.rotate=function(t,r,e,a){var u,o,i,c,f,s,h,v,M,l,d,m,p,w,y,q,g,x,b,A,L,D,z,V,j=a[0],I=a[1],P=a[2],Q=Math.sqrt(j*j+I*I+P*P);return Math.abs(Q)<n?null:(Q=1/Q,j*=Q,I*=Q,P*=Q,u=Math.sin(e),o=Math.cos(e),i=1-o,c=r[0],f=r[1],s=r[2],h=r[3],v=r[4],M=r[5],l=r[6],d=r[7],m=r[8],p=r[9],w=r[10],y=r[11],q=j*j*i+o,g=I*j*i+P*u,x=P*j*i-I*u,b=j*I*i-P*u,A=I*I*i+o,L=P*I*i+j*u,D=j*P*i+I*u,z=I*P*i-j*u,V=P*P*i+o,t[0]=c*q+v*g+m*x,t[1]=f*q+M*g+p*x,t[2]=s*q+l*g+w*x,t[3]=h*q+d*g+y*x,t[4]=c*b+v*A+m*L,t[5]=f*b+M*A+p*L,t[6]=s*b+l*A+w*L,t[7]=h*b+d*A+y*L,t[8]=c*D+v*z+m*V,t[9]=f*D+M*z+p*V,t[10]=s*D+l*z+w*V,t[11]=h*D+d*z+y*V,r!==t&&(t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15]),t)},v.rotateX=function(t,n,r){var e=Math.sin(r),a=Math.cos(r),u=n[4],o=n[5],i=n[6],c=n[7],f=n[8],s=n[9],h=n[10],v=n[11];return n!==t&&(t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]),t[4]=u*a+f*e,t[5]=o*a+s*e,t[6]=i*a+h*e,t[7]=c*a+v*e,t[8]=f*a-u*e,t[9]=s*a-o*e,t[10]=h*a-i*e,t[11]=v*a-c*e,t},v.rotateY=function(t,n,r){var e=Math.sin(r),a=Math.cos(r),u=n[0],o=n[1],i=n[2],c=n[3],f=n[8],s=n[9],h=n[10],v=n[11];return n!==t&&(t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]),t[0]=u*a-f*e,t[1]=o*a-s*e,t[2]=i*a-h*e,t[3]=c*a-v*e,t[8]=u*e+f*a,t[9]=o*e+s*a,t[10]=i*e+h*a,t[11]=c*e+v*a,t},v.rotateZ=function(t,n,r){var e=Math.sin(r),a=Math.cos(r),u=n[0],o=n[1],i=n[2],c=n[3],f=n[4],s=n[5],h=n[6],v=n[7];return n!==t&&(t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]),t[0]=u*a+f*e,t[1]=o*a+s*e,t[2]=i*a+h*e,t[3]=c*a+v*e,t[4]=f*a-u*e,t[5]=s*a-o*e,t[6]=h*a-i*e,t[7]=v*a-c*e,t},v.fromRotationTranslation=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=e+e,c=a+a,f=u+u,s=e*i,h=e*c,v=e*f,M=a*c,l=a*f,d=u*f,m=o*i,p=o*c,w=o*f;return t[0]=1-(M+d),t[1]=h+w,t[2]=v-p,t[3]=0,t[4]=h-w,t[5]=1-(s+d),t[6]=l+m,t[7]=0,t[8]=v+p,t[9]=l-m,t[10]=1-(s+M),t[11]=0,t[12]=r[0],t[13]=r[1],t[14]=r[2],t[15]=1,t},v.fromQuat=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=r+r,i=e+e,c=a+a,f=r*o,s=e*o,h=e*i,v=a*o,M=a*i,l=a*c,d=u*o,m=u*i,p=u*c;return t[0]=1-h-l,t[1]=s+p,t[2]=v-m,t[3]=0,t[4]=s-p,t[5]=1-f-l,t[6]=M+d,t[7]=0,t[8]=v+m,t[9]=M-d,t[10]=1-f-h,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},v.frustum=function(t,n,r,e,a,u,o){var i=1/(r-n),c=1/(a-e),f=1/(u-o);return t[0]=2*u*i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=2*u*c,t[6]=0,t[7]=0,t[8]=(r+n)*i,t[9]=(a+e)*c,t[10]=(o+u)*f,t[11]=-1,t[12]=0,t[13]=0,t[14]=o*u*2*f,t[15]=0,t},v.perspective=function(t,n,r,e,a){var u=1/Math.tan(n/2),o=1/(e-a);return t[0]=u/r,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=u,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=(a+e)*o,t[11]=-1,t[12]=0,t[13]=0,t[14]=2*a*e*o,t[15]=0,t},v.ortho=function(t,n,r,e,a,u,o){var i=1/(n-r),c=1/(e-a),f=1/(u-o);return t[0]=-2*i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*c,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*f,t[11]=0,t[12]=(n+r)*i,t[13]=(a+e)*c,t[14]=(o+u)*f,t[15]=1,t},v.lookAt=function(t,r,e,a){var u,o,i,c,f,s,h,M,l,d,m=r[0],p=r[1],w=r[2],y=a[0],q=a[1],g=a[2],x=e[0],b=e[1],A=e[2];return Math.abs(m-x)<n&&Math.abs(p-b)<n&&Math.abs(w-A)<n?v.identity(t):(h=m-x,M=p-b,l=w-A,d=1/Math.sqrt(h*h+M*M+l*l),h*=d,M*=d,l*=d,u=q*l-g*M,o=g*h-y*l,i=y*M-q*h,d=Math.sqrt(u*u+o*o+i*i),d?(d=1/d,u*=d,o*=d,i*=d):(u=0,o=0,i=0),c=M*i-l*o,f=l*u-h*i,s=h*o-M*u,d=Math.sqrt(c*c+f*f+s*s),d?(d=1/d,c*=d,f*=d,s*=d):(c=0,f=0,s=0),t[0]=u,t[1]=c,t[2]=h,t[3]=0,t[4]=o,t[5]=f,t[6]=M,t[7]=0,t[8]=i,t[9]=s,t[10]=l,t[11]=0,t[12]=-(u*m+o*p+i*w),t[13]=-(c*m+f*p+s*w),t[14]=-(h*m+M*p+l*w),t[15]=1,t)},v.str=function(t){return"mat4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+", "+t[9]+", "+t[10]+", "+t[11]+", "+t[12]+", "+t[13]+", "+t[14]+", "+t[15]+")"},v.frob=function(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2)+Math.pow(t[9],2)+Math.pow(t[10],2)+Math.pow(t[11],2)+Math.pow(t[12],2)+Math.pow(t[13],2)+Math.pow(t[14],2)+Math.pow(t[15],2))},"undefined"!=typeof t&&(t.mat4=v);var M={};M.create=function(){var t=new r(4);return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t},M.rotationTo=function(){var t=i.create(),n=i.fromValues(1,0,0),r=i.fromValues(0,1,0);return function(e,a,u){var o=i.dot(a,u);return-.999999>o?(i.cross(t,n,a),i.length(t)<1e-6&&i.cross(t,r,a),i.normalize(t,t),M.setAxisAngle(e,t,Math.PI),e):o>.999999?(e[0]=0,e[1]=0,e[2]=0,e[3]=1,e):(i.cross(t,a,u),e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=1+o,M.normalize(e,e))}}(),M.setAxes=function(){var t=h.create();return function(n,r,e,a){return t[0]=e[0],t[3]=e[1],t[6]=e[2],t[1]=a[0],t[4]=a[1],t[7]=a[2],t[2]=-r[0],t[5]=-r[1],t[8]=-r[2],M.normalize(n,M.fromMat3(n,t))}}(),M.clone=c.clone,M.fromValues=c.fromValues,M.copy=c.copy,M.set=c.set,M.identity=function(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t},M.setAxisAngle=function(t,n,r){r=.5*r;var e=Math.sin(r);return t[0]=e*n[0],t[1]=e*n[1],t[2]=e*n[2],t[3]=Math.cos(r),t},M.add=c.add,M.multiply=function(t,n,r){var e=n[0],a=n[1],u=n[2],o=n[3],i=r[0],c=r[1],f=r[2],s=r[3];return t[0]=e*s+o*i+a*f-u*c,t[1]=a*s+o*c+u*i-e*f,t[2]=u*s+o*f+e*c-a*i,t[3]=o*s-e*i-a*c-u*f,t},M.mul=M.multiply,M.scale=c.scale,M.rotateX=function(t,n,r){r*=.5;var e=n[0],a=n[1],u=n[2],o=n[3],i=Math.sin(r),c=Math.cos(r);return t[0]=e*c+o*i,t[1]=a*c+u*i,t[2]=u*c-a*i,t[3]=o*c-e*i,t},M.rotateY=function(t,n,r){r*=.5;var e=n[0],a=n[1],u=n[2],o=n[3],i=Math.sin(r),c=Math.cos(r);return t[0]=e*c-u*i,t[1]=a*c+o*i,t[2]=u*c+e*i,t[3]=o*c-a*i,t},M.rotateZ=function(t,n,r){r*=.5;var e=n[0],a=n[1],u=n[2],o=n[3],i=Math.sin(r),c=Math.cos(r);return t[0]=e*c+a*i,t[1]=a*c-e*i,t[2]=u*c+o*i,t[3]=o*c-u*i,t},M.calculateW=function(t,n){var r=n[0],e=n[1],a=n[2];return t[0]=r,t[1]=e,t[2]=a,t[3]=-Math.sqrt(Math.abs(1-r*r-e*e-a*a)),t},M.dot=c.dot,M.lerp=c.lerp,M.slerp=function(t,n,r,e){var a,u,o,i,c,f=n[0],s=n[1],h=n[2],v=n[3],M=r[0],l=r[1],d=r[2],m=r[3];return u=f*M+s*l+h*d+v*m,0>u&&(u=-u,M=-M,l=-l,d=-d,m=-m),1-u>1e-6?(a=Math.acos(u),o=Math.sin(a),i=Math.sin((1-e)*a)/o,c=Math.sin(e*a)/o):(i=1-e,c=e),t[0]=i*f+c*M,t[1]=i*s+c*l,t[2]=i*h+c*d,t[3]=i*v+c*m,t},M.invert=function(t,n){var r=n[0],e=n[1],a=n[2],u=n[3],o=r*r+e*e+a*a+u*u,i=o?1/o:0;return t[0]=-r*i,t[1]=-e*i,t[2]=-a*i,t[3]=u*i,t},M.conjugate=function(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=n[3],t},M.length=c.length,M.len=M.length,M.squaredLength=c.squaredLength,M.sqrLen=M.squaredLength,M.normalize=c.normalize,M.fromMat3=function(t,n){var r,e=n[0]+n[4]+n[8];if(e>0)r=Math.sqrt(e+1),t[3]=.5*r,r=.5/r,t[0]=(n[7]-n[5])*r,t[1]=(n[2]-n[6])*r,t[2]=(n[3]-n[1])*r;else{var a=0;n[4]>n[0]&&(a=1),n[8]>n[3*a+a]&&(a=2);var u=(a+1)%3,o=(a+2)%3;r=Math.sqrt(n[3*a+a]-n[3*u+u]-n[3*o+o]+1),t[a]=.5*r,r=.5/r,t[3]=(n[3*o+u]-n[3*u+o])*r,t[u]=(n[3*u+a]+n[3*a+u])*r,t[o]=(n[3*o+a]+n[3*a+o])*r}return t},M.str=function(t){return"quat("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"},"undefined"!=typeof t&&(t.quat=M)}(n.exports)}(this);


},{}],142:[function(require,module,exports){
!function(e){function r(e){if(isNaN(e))throw Error("Internal: Expression generated NaN!");var r=""+e;return-1==r.indexOf(".")&&-1==r.indexOf("e")&&(r+=".0"),r}var t=require("../../base/common.js"),s=require("../../interfaces.js"),n=t.Syntax,i=function(e,t){this.controller=e,this.controller.generateFloat=this.controller.generateFloat||r,this.options=t||{}};i.prototype={binary:function(e){var r=this.expression(e);switch(e.type){case n.BinaryExpression:case n.LogicalExpression:case n.AssignmentExpression:case n.ConditionalExpression:r="( "+r+" )"}return r},arguments:function(e){var r="(";return e.forEach(function(t,s){r+=this.expression(t),s<e.length-1&&(r+=", ")},this),r+")"},literal:function(e,r){var e=e||{},t=void 0!==e.staticValue?e.staticValue:r;return e.type==s.TYPES.NUMBER?this.controller.generateFloat(t):t},expression:function(e){if(!e)return"";var r="";switch(e.type){case n.NewExpression:r=this.controller.type(e.extra,{constructor:!0}),r+=this.arguments(e.arguments);break;case n.Literal:r=this.literal(e.extra,e.value);break;case n.Identifier:r=e.name;break;case n.AssignmentExpression:case n.BinaryExpression:case n.LogicalExpression:r+=this.binary(e.left),r+=" "+e.operator+" ",r+=this.binary(e.right);break;case n.UnaryExpression:r=e.operator,r+=this.binary(e.argument);break;case n.CallExpression:r=this.expression(e.callee),r+=this.arguments(e.arguments);break;case n.MemberExpression:r=this.binary(e.object),r+=e.computed?"[":".",r+=this.expression(e.property),e.computed&&(r+="]");break;case n.ConditionalExpression:r=this.expression(e.test),r+=" ? ",r+=this.expression(e.consequent),r+=" : ",r+=this.expression(e.alternate);break;case n.UpdateExpression:r="",e.isPrefix&&(r+=e.operator),r+=this.expression(e.argument),e.isPrefix||(r+=e.operator);break;case n.ExpressionStatement:r=this.expression(e.expression);break;default:r="<unhandled: "+e.type+">"}return r},statement:function(e){var r="unhandled statement";switch(e.type){case n.ReturnStatement:var t=e.argument;r="return"+(t?" "+this.expression(e.argument):"")+";"}return r}},e.ExpressionHandler=i}(exports);


},{"../../base/common.js":132,"../../interfaces.js":168}],143:[function(require,module,exports){
!function(e){var r=require("../../base/index.js"),t=require("escodegen"),n=require("../simple-statement/simple-statement.js"),i=require("./transform.js").GLMatrixTransformer,s=function(){};r.extend(s.prototype,{compile:function(e,r){r=r||{},e=n.simplifyStatements(e,r),e=(new i).transform(e);var s=t.generate(e,r);return s}}),e.GLMatrixCompiler=s}(exports);


},{"../../base/index.js":135,"../simple-statement/simple-statement.js":161,"./transform.js":144,"escodegen":75}],144:[function(require,module,exports){
!function(e){function r(e,r){var n=[];t(n,"vec2"),t(n,"vec3"),t(n,"vec4"),t(n,"mat3"),t(n,"mat4");var a={type:A.VariableDeclaration,kind:"var",declarations:n};return e.body.body.unshift(a),e}function t(e,r){e.push({type:A.VariableDeclarator,id:{type:A.Identifier,name:r},init:{type:A.MemberExpression,computed:!1,object:{type:A.MemberExpression,computed:!1,object:{type:A.Identifier,name:"Shade"},property:{type:A.Identifier,name:"Math"}},property:{type:A.Identifier,name:r}}})}function n(e,r){var t=j(e),n=f(t.getKind());return n?(e.init=m(n,"create",[]),e):void 0}function a(e,r){if(e.callee.type==A.MemberExpression){var t=j(e),n=j(e.callee.object),a=e.callee.property.name,c=f(n.getKind());if(t.getType()!=w.OBJECT&&c){var s,o=i(a);if(void 0!==o)s=d(e.callee.object,o);else{var u=b(c,a),p=[e.callee.object];p.push.apply(p,e.arguments),s=m(c,u,p)}return j(s).copy(j(e)),s}}}function i(e){switch(e){case"x":return 0;case"y":return 1;case"z":return 2;case"w":return 3}return void 0}function c(e,r){var t=j(e);return t.getType()==w.OBJECT?e.right.type==A.NewExpression?s(e,r):e.right.type==A.CallExpression&&e.right.callee.type==A.MemberExpression&&f(j(e.right.callee.object).getKind())?o(e,r):u(e,r):void 0}function s(e,r){for(var t=j(e),n=f(t.getKind()),a=[e.left],i=e.right.arguments,c=0;c<i.length;++c)l(a,i[c]);1==a.length&&a.push({type:A.Literal,value:0,raw:"0"});for(var s=1+h(t);a.length<s;)a.push(v.deepExtend({},a[a.length-1]));var o=m(n,"set",a);return j(o).copy(j(e)),o}function o(e,r){var t=j(e.right.callee.object),n=(f(t.getKind()),e.right.callee.property.name);return g(t.getKind(),n,e.left,e.right.callee.object,e.right.arguments)}function u(e,r){var t=j(e),n=f(t.getKind()),a=[];return p(e.left)?(a.push(e.left.object),a.push(e.left.property),a.push(e.right),m(n,"pasteArray",a)):(a.push(e.left),p(e.right)?(a.push(e.right.object),a.push(e.right.property),m(n,"copyArray",a)):(a.push(e.right),m(n,"copy",a)))}function p(e){return e.type==A.MemberExpression&&j(e.object).isArray()}function l(e,r){var t=h(j(r));if(1==t)return void e.push(r);for(var n=0;t>n;++n)e.push(d(r,n))}function h(e){var r=e.getType(),t=e.getKind();if(r==w.NUMBER||r==w.INT)return 1;switch(t){case E.FLOAT2:return 2;case E.FLOAT3:return 3;case E.FLOAT4:return 4;case E.MATRIX3:return 9;case E.MATRIX4:return 16}}function f(e){switch(e){case E.FLOAT2:return"vec2";case E.FLOAT3:return"vec3";case E.FLOAT4:return"vec4";case E.MATRIX3:return"mat3";case E.MATRIX4:return"mat4"}return null}function y(e,r){return{type:A.MemberExpression,object:{type:A.Identifier,name:e},property:{type:A.Identifier,name:r}}}function m(e,r,t){return{type:A.CallExpression,callee:y(e,r),arguments:t}}function d(e,r){return{type:A.MemberExpression,object:e,computed:!0,property:{type:A.Literal,value:r,raw:r}}}function b(e,r){switch(r){case"dot":return"dot";case"length":return"length"}throw new Error("Unknown glMatrix method with scalar output: '"+r+"'")}function g(e,r,t,n,a){var i,c=e,s=!1;switch(r){case"add":i="add";break;case"sub":i="sub";break;case"mul":i="mul";break;case"div":i="div";break;case"max":i="max";break;case"min":i="min";break;case"length":i="setLength";break;case"normalize":i="normalize";break;case"mulVec":switch(e){case E.MATRIX3:c=E.FLOAT3,i="transformMat3";break;case E.MATRIX4:c=E.FLOAT4,i="transformMat4"}s=!0;break;default:throw new Error("Unknown glMatrix method with object output: '"+r+"'")}var o=[t];s||o.push(n),o.push.apply(o,a),s&&o.push(n);var u=f(c);return m(u,i,o)}var v=require("../../base/index.js"),x=require("../../base/common.js"),T=require("./../../interfaces.js"),w=T.TYPES,E=T.OBJECT_KINDS,M=(require("analyses"),require("../tools.js"),require("assert"),require("estraverse")),A=M.Syntax,j=x.ANNO,I=function(){};v.extend(I.prototype,{transform:function(e){return this.replace(e)},replace:function(e){var t=new M.Controller;return t.replace(e,{enter:function(e,r){},leave:function(e,t){switch(e.type){case A.VariableDeclarator:return n(e,t);case A.CallExpression:return a(e,t);case A.AssignmentExpression:return c(e);case A.FunctionDeclaration:case A.FunctionDeclaration:return r(e,t)}}})}}),e.GLMatrixTransformer=I}(exports);


},{"../../base/common.js":132,"../../base/index.js":135,"../tools.js":166,"./../../interfaces.js":168,"analyses":1,"assert":92,"estraverse":91}],145:[function(require,module,exports){
!function(r){var e=require("../../base/index.js"),n=require("./transform.js").GLASTTransformer,a=require("./glsl-generate.js").generate,t=function(){};e.extend(t.prototype,{compileFragmentShader:function(r,e){e=e||{};var t=new n(r,"global.shade",!1,e),o=t.transform(r);e.headers=o.headers;var s=a(o.program,!1,e);return{source:s,uniformSetter:o.uniformSetter}},compileVertexShader:function(r,e){e=e||{};var t=new n(r,"global.main",!0,e),o=t.transform(r);e.headers=o.headers;var s=a(o.program,!0,e);return{source:s,uniformSetter:o.uniformSetter}}}),r.GLSLCompiler=t}(exports);


},{"../../base/index.js":135,"./glsl-generate.js":146,"./transform.js":158}],146:[function(require,module,exports){
!function(e){function n(e,t){if(!e)return"?";switch(t=t||{},e.type){case g.OBJECT:switch(e.kind){case S.FLOAT4:return"vec4";case S.FLOAT3:return"vec3";case S.FLOAT2:return"vec2";case S.TEXTURE:return"sampler2D";case S.MATRIX3:return"mat3";case S.MATRIX4:return"mat4";case S.COLOR_CLOSURE:return"vec4";default:return"<undefined>"}case g.ARRAY:return n(e.elements,t);case g.UNDEFINED:if(t.allowUndefined)return"void";throw new Error("Could not determine type");case g.NUMBER:return"float";case g.BOOLEAN:return"bool";case g.INT:return"int";default:return e.type}}function t(){var e=[];e.push.apply(e,arguments);var n="";return e.appendLine=function(e){e?this.push(n+e):this.push("")},e.changeIndention=function(e){for(;e>0;)n+="    ",e--;0>e&&(n=n.substr(0,n.length+4*e))},e.append=function(e){this[this.length-1]=this[this.length-1]+e},e}function r(e,n){if(n)for(var t in n){var r=n[t];if(!x[r.type])throw Error("Internal: InlineFunction of type '"+r.type+"' not available!");var a=x[r.type](r.name,r.details);e.push.apply(e,a)}}function a(e,n,t,s){var p=!1;l.traverse(e,{enter:function(d){try{var l=d.type;switch(l){case h.Program:T(s).forEach(function(e){n.push(e)}),r(n,m(e).getUserData().internalFunctions),i(n,d);break;case h.FunctionDeclaration:return s.newLines&&n.appendLine(),"main"==d.id.name&&(p=!0),n.appendLine(o(d)+" {"),void n.changeIndention(1);case h.ReturnStatement:return void n.appendLine(E.statement(d));case h.VariableDeclarator:var f=u(d,p,t,s);return void n.appendLine(f);case h.AssignmentExpression:case h.ExpressionStatement:return n.appendLine(E.expression(d)+";"),v.Skip;case h.IfStatement:return n.appendLine("if("+E.expression(d.test,s)+") {"),n.changeIndention(1),a(d.consequent,n,s),n.changeIndention(-1),d.alternate&&(n.appendLine("} else {"),n.changeIndention(1),a(d.alternate,n,s),n.changeIndention(-1)),n.appendLine("}"),v.Skip;case h.ForStatement:return n.appendLine("for ("+c(d.init,s)+"; "+E.expression(d.test,s)+"; "+E.expression(d.update,s)+") {"),n.changeIndention(1),a(d.body,n,s),n.changeIndention(-1),n.appendLine("}"),v.Skip;case h.ContinueStatement:return void n.appendLine("continue;");case h.BreakStatement:return void n.appendLine("break;")}}catch(g){throw g}},leave:function(e){var t=e.type;switch(t){case h.Program:break;case h.FunctionDeclaration:n.changeIndention(-1),n.appendLine("}")}}})}function i(e,n){var t=!0;l.traverse(n,{enter:function(n){if(n.type==h.FunctionDeclaration){if("main"==n.id.name)return;t&&(t=!1,e.appendLine("// Forward declarations")),e.appendLine(o(n)+";")}}}),t||e.appendLine("")}function o(e){var t=new p(e),r=[n(t.getReturnInfo(),{allowUndefined:!0})];if(r.push(e.id.name,"("),e.params&&e.params.length){var a=[];e.params.forEach(function(e){a.push(n(e.extra)+" "+e.name)}),r.push(a.join(", "))}else r.push("void");return r.push(")"),r.join(" ")}function s(e){return e&&void 0!==e.staticValue?e.staticValue:""}function u(e,t,r,a){var i=t?null:y(e.extra,r),o=i?i+" ":"";return o+=n(e.extra)+" "+e.id.name,e.extra.elements&&(o+="["+(e.extra.staticSize?e.extra.staticSize:"0")+"]"),e.init&&(o+=" = "+E.expression(e.init)),e.init||i!=I.Storage.CONST||(o+=" = "+s(e.extra)),o+";"}function c(e,t){if(!e)return"";if(e.type==h.VariableDeclaration){var r=e.declarations.reduce(function(e,t){var r=n(t.extra)+" "+t.id.name;return t.init&&(r+=" = "+E.expression(t.init)),e+r},"");return r}return e.type==h.AssignmentExpression?n(e.extra)+" "+E.expression(e.left)+" = "+E.expression(e.right):void d.throwError(e,"Internal error in GLSL::handleInlineDeclaration, found "+e.type)}var p=require("./../../base/annotation.js").FunctionAnnotation,d=require("./../../interfaces.js"),l=require("estraverse"),f=require("../base/expression-handler.js").ExpressionHandler,h=l.Syntax,v=l.VisitorOption,m=require("../../base/annotation.js").ANNO,g=d.TYPES,S=d.OBJECT_KINDS,L=d.SOURCES,x={MatCol:function(e,n){var t=n.matType,r=n.colType;return[t+" "+e+"("+t+" mat, int idx, "+r+" value){","  "+t+" result = "+t+"(mat);","  result[idx] = value;","  return result;","}"]}},I={Storage:{CONST:"const",UNIFORM:"uniform",VARYING:"varying",ATTRIBUTE:"attribute"}},E=new f({type:n}),T=function(e){if(1==e.omitHeader)return[];var n=["// Generated by shade.js"];e.headers&&(n=n.concat(e.headers));var t=e.floatPrecision||"highp";return n.push("precision "+t+" float;"),n.push(""),n},y=function(e,n){if(!e.source)return null;if(e.source==L.VERTEX)return n&&!e.output?I.Storage.ATTRIBUTE:I.Storage.VARYING;if(e.source==L.UNIFORM)return I.Storage.UNIFORM;if(e.source==L.CONSTANT)return I.Storage.CONST;throw new Error("toGLSLSource: Unhandled type: "+e.source)},O=function(e,n,r){r=r||{};var i=t();return a(e,i,n,r),i.join("\n")};exports.generate=O}(exports);


},{"../../base/annotation.js":130,"../base/expression-handler.js":142,"./../../base/annotation.js":130,"./../../interfaces.js":168,"estraverse":91}],147:[function(require,module,exports){
!function(e){var r=require("../../../base/scope.js"),t=require("../../../base/context.js"),s=require("../../../base/index.js"),i=require("../../../interfaces.js"),a=require("../../../base/typeinfo.js").TypeInfo,n=require("../../../base/common.js"),c=i.TYPES,o=i.OBJECT_KINDS,u={Shade:require("./shade.js"),Space:require("./space.js"),Math:require("./math.js"),System:require("./system.js"),Vec2:require("./vec2.js"),Vec3:require("./vec3.js"),Color:require("./vec3.js"),Vec4:require("./vec4.js"),Mat3:require("./mat3.js"),Mat4:require("./mat4.js"),Texture:require("./texture.js")},h={name:"GLSLTransformRegistry",getByName:function(e){var r=u[e];return r||null},getInstanceForKind:function(e){for(var r in u)if(u[r].kind==e)return u[r].instance;return null}},l=function(e,r,s,i){i.mainFunction=r,t.call(this,e,i),this.usedParameters={shader:{},system:{},uexp:{}},this.uniformExpressions=i.uniformExpressions||{},this.vertexShader=s,this.systemParameters={},this.blockedNames=[],this.topDeclarations=[],this.internalFunctions={},this.idNameMap={},this.headers=[],this.globalParameters=e.globalParameters&&e.globalParameters[r]&&e.globalParameters[r][0]?e.globalParameters[r][0].extra.info:{}};s.createClass(l,t,{createScope:function(e,r,t){return new g(e,r,{name:t})},getTypeInfo:function(e){return n.getTypeInfo(e,this.getScope())},addHeader:function(e){-1==this.headers.indexOf(e)&&this.headers.push(e)}});var g=function(e,t,s){r.call(this,e,t,s),this.setRegistry(h)};s.createClass(g,r,{registerGlobals:function(){this.registerObject("Math",u.Math),this.registerObject("Color",u.Color),this.registerObject("Vec2",u.Vec2),this.registerObject("Vec3",u.Vec3),this.registerObject("Vec4",u.Vec4),this.registerObject("Texture",u.Texture),this.registerObject("Shade",u.Shade),this.registerObject("Mat3",u.Mat3),this.registerObject("Mat4",u.Mat4),this.registerObject("Space",u.Space),this.declareVariable("gl_FragCoord",!1),this.updateTypeInfo("gl_FragCoord",new a({extra:{type:c.OBJECT,kind:o.FLOAT3}}))}}),e.GLTransformScope=g,e.GLTransformContext=l}(exports);


},{"../../../base/common.js":132,"../../../base/context.js":133,"../../../base/index.js":135,"../../../base/scope.js":136,"../../../base/typeinfo.js":137,"../../../interfaces.js":168,"./mat3.js":148,"./mat4.js":149,"./math.js":150,"./shade.js":151,"./space.js":152,"./system.js":153,"./texture.js":154,"./vec2.js":155,"./vec3.js":156,"./vec4.js":157}],148:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),a=(require("estraverse").Syntax,require("../../tools.js")),r=(require("../../../base/annotation.js").ANNO,t.TYPES,t.OBJECT_KINDS),n={col:{callExp:a.Mat.generateColCall.bind(null,"Mat3")}};a.Mat.attachOperators(n,"Mat3",{add:"+",sub:"-",mul:"*",div:"/"}),a.Vec.attachOperators(n,3,{mulVec:"*"}),a.extend(e,{id:"Mat3",kind:r.MATRIX3,object:{constructor:a.Vec.generateConstructor,"static":{}},instance:n})}(exports);


},{"../../../base/annotation.js":130,"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],149:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),a=(require("estraverse").Syntax,require("../../tools.js")),r=(require("../../../base/annotation.js").ANNO,t.TYPES,t.OBJECT_KINDS),n={col:{callExp:a.Mat.generateColCall.bind(null,"Mat4")}};a.Mat.attachOperators(n,"Mat4",{add:"+",sub:"-",mul:"*",div:"/"}),a.Vec.attachOperators(n,4,{mulVec:"*"}),a.extend(e,{id:"Mat4",kind:r.MATRIX4,object:{constructor:a.Vec.generateConstructor,"static":{}},instance:n})}(exports);


},{"../../../base/annotation.js":130,"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],150:[function(require,module,exports){
!function(a){var e=require("../../../interfaces.js"),l=require("estraverse").Syntax,t=require("../../tools.js"),r=["E","PI","LN2","LOG2E","LOG10E","PI","SQRT1_2","SQRT2"],n=function(a){return a.extra.type=e.TYPES.NUMBER,a.callee=t.removeMemberFromExpression(a.callee),a},c=function(a){return a=a||{},function(r,n){r.type!==l.CallExpression&&e.throwError(r,"Internal Error in Math object");for(var c=0;c<n.length;c++)n[c].isInt()&&(r.arguments[c]=t.castToFloat(r.arguments[c]));if(r.callee=t.removeMemberFromExpression(r.callee),a.name&&(r.callee.name=a.name),a.arguments)for(var p=0;p<a.arguments.length;++p)"undefined"!=typeof a.arguments[p]&&(r.arguments[p]=a.arguments[p]);return r}},p={abs:{callExp:c()},acos:{callExp:c()},asin:{callExp:c()},atan:{callExp:c()},atan2:{callExp:c({name:"atan"})},ceil:{callExp:n},cos:{callExp:c()},exp:{callExp:c()},floor:{callExp:c()},log:{callExp:c()},max:{callExp:c()},min:{callExp:c()},pow:{callExp:c()},round:{callExp:c()},sin:{callExp:c()},sqrt:{callExp:c()},tan:{callExp:c()},clamp:{callExp:c()},saturate:{callExp:c({name:"clamp",arguments:[void 0,{type:l.Literal,value:0,extra:{type:e.TYPES.NUMBER,staticValue:0}},{type:l.Literal,value:1,extra:{type:e.TYPES.NUMBER,staticValue:1}}]})},smoothstep:{callExp:c()},step:{callExp:c()},fract:{callExp:c()},mix:{callExp:c()}};r.forEach(function(a){p[a]={property:function(){return{type:l.Literal,value:Math[a],extra:{type:e.TYPES.NUMBER}}}}}),t.extend(a,{id:"Math",object:{constructor:null,"static":p},instance:p})}(exports);


},{"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],151:[function(require,module,exports){
!function(e){var r=require("../../../interfaces.js"),t=(require("estraverse").Syntax,require("../../tools.js")),n={mix:{callExp:function(e,r){return e.callee=t.removeMemberFromExpression(e.callee),e}}};t.extend(e,{id:"Shade",kind:r.OBJECT_KINDS.COLOR_CLOSURE,object:{constructor:t.Vec.generateConstructor,"static":n},instance:n})}(exports);


},{"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],152:[function(require,module,exports){
!function(e){function t(e,t){switch((e.type!=n.MemberExpression||e.object.type!=n.Identifier||"Space"!=e.object.name||e.property.type!=n.Identifier)&&r.throwError(e,"We only support Space enums for the first argument of transformDirection and transformPoint"),e.property.name){case"VIEW":return t?"modelViewMatrixN":"modelViewMatrix";case"WORLD":return t?"modelMatrixN":"modelMatrix";default:r.throwError(e,"Unknown Space Type: '"+e.property.name+"'")}}var r=require("../../../interfaces.js"),n=require("estraverse").Syntax,a=require("../../tools.js"),s=require("../../../base/annotation.js").ANNO,o=r.TYPES,i=r.OBJECT_KINDS,p={transformDirection:{callExp:function(e,r,p,y){var m=t(e.arguments[0],!0),c={type:n.BinaryExpression,operator:"*",left:{type:n.Identifier,name:m},right:e.arguments[1]};s(c).setType(o.OBJECT,i.FLOAT3),s(c.left).setType(o.OBJECT,i.MATRIX3),s(c.right).setType(o.OBJECT,i.FLOAT3);var u=a.getNameForSystem(m);return y.usedParameters.system[u]=y.systemParameters[m],c}},transformPoint:{callExp:function(e,r,p,y){var m=t(e.arguments[0],!1),c={type:n.MemberExpression,object:{type:n.BinaryExpression,operator:"*",left:{type:n.Identifier,name:m},right:{type:n.CallExpression,callee:{type:n.Identifier,name:"vec4"},arguments:[e.arguments[1],{type:n.Literal,value:1,raw:1}]}},property:{type:n.Identifier,name:"xyz"}};s(c).setType(o.OBJECT,i.FLOAT3),s(c.object).setType(o.OBJECT,i.FLOAT4),s(c.object.left).setType(o.OBJECT,i.MATRIX4),s(c.object.right).setType(o.OBJECT,i.FLOAT4),s(c.object.right.arguments[1]).setType(o.NUMBER);var u=a.getNameForSystem(m);return y.usedParameters.system[u]=y.systemParameters[m],c}},VIEW:{property:function(e){return e}},WORLD:{property:function(e){return e}}};a.extend(e,{id:"Space",object:{constructor:null,"static":p},instance:p})}(exports);


},{"../../../base/annotation.js":130,"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],153:[function(require,module,exports){
!function(e){var r=require("../../../interfaces.js"),t=require("../../tools.js"),o=require("estraverse").Syntax,n=(r.TYPES,r.OBJECT_KINDS,{});n.CANVAS_DIMENSIONS="coords",n.DERIVATE_EXTENSION="#extension GL_OES_standard_derivatives : enable";var a=({type:r.TYPES.OBJECT,kind:r.OBJECT_KINDS.FLOAT3,source:r.SOURCES.UNIFORM},{coords:{property:function(e){return e.property.name="gl_FragCoord",e.property}},normalizedCoords:{property:function(e,a,s,m){var p=t.getNameForSystem(n.CANVAS_DIMENSIONS),i=m.systemParameters[n.CANVAS_DIMENSIONS];return i||r.throwError(e,"Internal Error: No canavas dimensions defined"),m.usedParameters.system[p]=i,{type:o.NewExpression,callee:{type:o.Identifier,name:"Vec3"},arguments:[{type:o.BinaryExpression,left:{type:o.MemberExpression,object:{type:o.Identifier,name:"gl_FragCoord"},property:{type:o.Identifier,name:"xyz"}},right:{type:o.Identifier,name:t.getNameForSystem(n.CANVAS_DIMENSIONS)},operator:"/",extra:{type:r.TYPES.OBJECT,kind:r.OBJECT_KINDS.FLOAT3}}],extra:{type:r.TYPES.OBJECT,kind:r.OBJECT_KINDS.FLOAT3}}}},height:{property:function(e,r,o,a){var s=t.getNameForSystem(n.CANVAS_DIMENSIONS);return a.usedParameters.system[s]=a.systemParameters[n.CANVAS_DIMENSIONS],e.property.name=s+".y",e.property}},width:{property:function(e,r,o,a){var s=t.getNameForSystem(n.CANVAS_DIMENSIONS);return a.usedParameters.system[s]=a.systemParameters[n.CANVAS_DIMENSIONS],e.property.name=s+".x",e.property}},fwidth:{property:function(e,r,o,a){return a.addHeader(n.DERIVATE_EXTENSION),t.removeMemberFromExpression(e)}},dx:{property:function(e,r,o,a){a.addHeader(n.DERIVATE_EXTENSION);var s=t.removeMemberFromExpression(e);return s.name="dFdx",s}},dy:{property:function(e,r,o,a){a.addHeader(n.DERIVATE_EXTENSION);var s=(t.removeMemberFromExpression(e),t.removeMemberFromExpression(e));return s.name="dFdy",s}}});t.extend(e,{id:"System",object:{constructor:null,"static":a},instance:null,derivedParameters:a})}(exports);


},{"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],154:[function(require,module,exports){
!function(e){var r=require("../../../interfaces.js"),t=(require("estraverse").Syntax,require("../../tools.js")),n=(require("../../../base/annotation.js").ANNO,r.TYPES,r.OBJECT_KINDS),a={sample2D:{callExp:t.Vec.createFunctionCall.bind(null,"texture2D",2)},width:{property:function(e,t,n,a){var i=e.object.name;return e.property.name=i+"_width",a.usedParameters.shader[i+"_width"]={type:r.TYPES.INT,kind:r.OBJECT_KINDS.INT,source:r.SOURCES.UNIFORM},e.property}},height:{property:function(e,t,n,a){var i=e.object.name;return e.property.name=i+"_height",a.usedParameters.shader[i+"_height"]={type:r.TYPES.INT,kind:r.OBJECT_KINDS.INT,source:r.SOURCES.UNIFORM},e.property}}};t.extend(e,{id:"Texture",kind:n.TEXTURE,object:{constructor:null,"static":{}},instance:a})}(exports);


},{"../../../base/annotation.js":130,"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],155:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),l=(require("estraverse").Syntax,require("../../tools.js")),c=(require("../../../base/annotation.js").ANNO,t.TYPES,t.OBJECT_KINDS),a={normalize:{callExp:l.Vec.createFunctionCall.bind(null,"normalize",0)},flip:{callExp:l.Vec.createFunctionCall.bind(null,"-",0)},dot:{callExp:l.Vec.createFunctionCall.bind(null,"dot",2)},reflect:{callExp:l.Vec.createFunctionCall.bind(null,"reflect",2)},length:{callExp:l.Vec.generateLengthCall}};l.Vec.attachSwizzles(a,2,l.Vec.createSwizzle,l.Vec.createSwizzleOperator),l.Vec.attachOperators(a,2,{add:"+",sub:"-",mul:"*",div:"/",mod:"%"}),l.extend(e,{id:"Vec2",kind:c.FLOAT2,object:{constructor:l.Vec.generateConstructor,"static":{}},instance:a})}(exports);


},{"../../../base/annotation.js":130,"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],156:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),c=(require("estraverse").Syntax,require("../../tools.js")),l=require("../../../base/annotation.js").ANNO,a=t.TYPES,n=t.OBJECT_KINDS,r={normalize:{callExp:c.Vec.createFunctionCall.bind(null,"normalize",0)},flip:{callExp:c.Vec.createFunctionCall.bind(null,"-",0)},dot:{callExp:c.Vec.createFunctionCall.bind(null,"dot",3)},reflect:{callExp:c.Vec.createFunctionCall.bind(null,"reflect",3)},refract:{callExp:function(e,t,n){var r=e.arguments.pop(),i=c.Vec.createFunctionCall("refract",3,e,t,n);return l(r).setType(a.NUMBER),i.arguments.push(r),i}},length:{callExp:c.Vec.generateLengthCall},cross:{callExp:c.Vec.createFunctionCall.bind(null,"cross",3)}};c.Vec.attachSwizzles(r,3,c.Vec.createSwizzle,c.Vec.createSwizzleOperator),c.Vec.attachOperators(r,3,{add:"+",sub:"-",mul:"*",div:"/",mod:"%"}),c.extend(e,{id:"Vec3",kind:n.FLOAT3,object:{constructor:c.Vec.generateConstructor,"static":{}},instance:r})}(exports);


},{"../../../base/annotation.js":130,"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],157:[function(require,module,exports){
!function(e){var t=require("../../../interfaces.js"),l=(require("estraverse").Syntax,require("../../tools.js")),c=(require("../../../base/annotation.js").ANNO,t.TYPES,t.OBJECT_KINDS),a={normalize:{callExp:l.Vec.createFunctionCall.bind(null,"normalize",0)},flip:{callExp:l.Vec.createFunctionCall.bind(null,"-",0)},dot:{callExp:l.Vec.createFunctionCall.bind(null,"dot",4)},reflect:{callExp:l.Vec.createFunctionCall.bind(null,"reflect",4)},length:{callExp:l.Vec.generateLengthCall}};l.Vec.attachSwizzles(a,4,l.Vec.createSwizzle,l.Vec.createSwizzleOperator),l.Vec.attachOperators(a,4,{add:"+",sub:"-",mul:"*",div:"/",mod:"%"}),l.extend(e,{id:"Vec4",kind:c.FLOAT4,object:{constructor:l.Vec.generateConstructor,"static":{}},instance:a})}(exports);


},{"../../../base/annotation.js":130,"../../../interfaces.js":168,"../../tools.js":166,"estraverse":91}],158:[function(require,module,exports){
!function(e){function r(e){var r,t,n,a,i,o=new Map;for(r in e)for(n=e[r].dependencies,i=n.length;i--;)a=n[i],o.has(a)?t=o.get(a):(t=new x,o.set(a,t)),t.add(r);return o}function t(e,r,t){var n;return n=t.vertexShader?"gl_Position":void 0!==r?"gl_FragData["+r+"]":"gl_FragColor",{type:h.AssignmentExpression,operator:"=",left:{type:h.Identifier,name:n},right:e}}function n(e){switch(e.type){case h.Identifier:return e.name;case h.MemberExpression:return n(e.object)+"."+n(e.property);case h.NewExpression:return n(e.callee);default:return"unknown("+e.type+")"}}function a(e,r){var t,n=b(e);if(n.isUniformExpression()&&n.getSource()!=u.SOURCES.UNIFORM){var a=e.property.name;if(r.usedParameters.uexp.hasOwnProperty(a))return t=r.usedParameters.uexp[a],{type:h.Identifier,name:a,extra:t};if(t={},!r.uniformExpressions.hasOwnProperty(a))throw new Error("Internal: No information about uniform expression available: "+u.toJavaScript(e));return t.setter=i(n,r.uniformExpressions[a]),t.type=n.getType(),n.isObject()&&(t.kind=n.getKind()),t.source=u.SOURCES.UNIFORM,t.dependencies=n.getUniformDependencies(),r.usedParameters.uexp[a]=t,{type:h.Identifier,name:a,extra:t}}}function i(e,r){var t=r.code;e.isObject()&&(t="("+r.code+")._toFloatArray()");var n="return "+t+";";return new Function("env",n)}function o(e,r,t){var n,a;switch(t.type){case h.BlockStatement:n=t.body;break;default:throw new Error("Internal: addDeclaration to "+t.type)}n.length&&n[0].type==h.VariableDeclaration?a=n[0]:(a={type:h.VariableDeclaration,kind:"var",declarations:[]},n.unshift(a));var i={type:h.VariableDeclarator,id:{type:h.Identifier,name:e},init:null};b(i).copy(r),a.declarations.push(i)}var s=require("../../base/index.js"),c=require("../../base/common.js"),p=require("../../base/annotation.js").FunctionAnnotation,u=require("./../../interfaces.js"),l=u.TYPES,f=require("analyses"),y=require("../tools.js"),m=require("./registry/system.js"),d=require("assert"),g=require("./registry/").GLTransformContext,v=require("estraverse"),h=v.Syntax,b=c.ANNO,x=f.Set,E=function(e,r,t,n){this.context=new g(e,r,t,n)};s.extend(E.prototype,{registerThisObject:function(e){var r=e.getBindingByName("this");if(r&&r.isObject()){var t=r.getNodeInfo();for(var n in t){var a=b({},t[n]);a.isDerived()||this.context.blockedNames.push(y.getNameForSystem(n))}for(var i in m.derivedParameters)t.hasOwnProperty(i)&&s.deepExtend(t[i],m.derivedParameters[i]);s.extend(this.context.systemParameters,t)}},createUniformSetterFunction:function(e){var t=r(e.uexp);return function(r,n,a,i){var o,s,c,p,l,f,m;if(r&&a.envBase)for(o=r.length,s=a.envBase,c=a.envOverride;o--;){if(p=r[o],t.has(p))for(m=t.get(p).values(),f=m.length;f--;){var d=m[f],g=e.uexp[d],v=g.setter.call(u,a.envBase);i(d,v)}l=y.getNameForGlobal(r[o]),e.shader[l]&&(i(l,c&&void 0!==c[p]?c[p]:s[p]),e.shader[l].kind===u.OBJECT_KINDS.TEXTURE&&(i(l+"_width",c&&void 0!==c[p]?c[p].width:s[p]&&s[p][0].width||0),i(l+"_height",c&&void 0!==c[p]?c[p].height:s[p]&&s[p][0].height||0)))}if(n&&a.sysBase)for(o=n.length,s=a.sysBase;o--;)p=n[o],l=y.getNameForSystem(n[o]),i(l,s[p])}},transform:function(){var e,r,t=this.context,n=t.root,a=t.createScope(this.context.root,null,"global");a.registerGlobals(),t.pushScope(a),this.registerThisObject(a);for(e in t.globalParameters)t.blockedNames.push(y.getNameForGlobal(e));this.replace(n);var i=t.usedParameters;for(var o in i)for(e in i[o])r=I(e,i[o][e]),r&&n.body.unshift(r);var s=this.createUniformSetterFunction(i),c=b(n).getUserData();return c.internalFunctions=t.internalFunctions,{program:n,uniformSetter:s,headers:t.headers}},replace:function(e){var r=new v.Controller,t=this.context;return e=r.replace(e,{enter:function(e,r){switch(e.type){case h.Identifier:return S(e,r,t);case h.IfStatement:return M(e);case h.FunctionDeclaration:return U(e,t)}},leave:function(e,r){switch(e.type){case h.MemberExpression:return O(e,r,t);case h.NewExpression:return j(e,t);case h.LogicalExpression:return R(e);case h.CallExpression:return F(e,r,t);case h.UnaryExpression:return w(e);case h.FunctionDeclaration:return D(e,t);case h.ReturnStatement:return N(e,t);case h.BinaryExpression:return P(e,r,t)}}})}});var I=function(e,r){var t={type:h.Identifier,name:e},n=b(t);if(n.setFromExtra(r),!(n.isNullOrUndefined()||n.isDerived()||n.isFunction()||n.isOfType(l.ARRAY)&&0==r.staticSize)){var a={type:h.VariableDeclaration,declarations:[{type:h.VariableDeclarator,id:t,init:null}],kind:"var"},i=b(a.declarations[0]);return i.copy(n),a}},S=function(e,r,t){var n=t.blockedNames,a=t.idNameMap;if(r.type==h.MemberExpression)return e;var i=e.name;if(a[i])return e.name=a[i],e;var o=y.generateFreeName(i,n);return a[i]=o,e.name=o,e},w=function(e){if("!"==e.operator){var r=b(e.argument);switch(r.getType()){case l.INT:case l.NUMBER:return{type:h.BinaryExpression,operator:"==",left:e.argument,right:{type:h.Literal,value:0,extra:{type:r.getType()}}}}}},N=function(e,r){var n,a=r.getScope();if(r.inMainFunction()){if(e.argument){var i=b(e.argument);return i.isArray()?(r.addHeader("#extension GL_EXT_draw_buffers : require"),n={type:h.BlockStatement,body:[]},e.argument.elements.forEach(function(e,i){n.body.push(t(y.castToVec4(e,a),i,r))})):n=t(y.castToVec4(e.argument,a),void 0,r),{type:h.BlockStatement,body:[n,{type:h.ReturnStatement}]}}return{type:h.ExpressionStatement,expression:{type:h.Identifier,name:"discard"}}}},T=function(e){var r=new p(e);r.setReturnInfo({type:l.UNDEFINED}),e.params=[],e.id.name="main"},F=function(e,r,t){var a=t.getScope();if(e.arguments=e.arguments.filter(function(e){return!b(e).isUndefined()}),e.callee.type==h.MemberExpression){var i=c.getTypeInfo(e.callee,a);i&&i.isFunction()||u.throwError(e,"Something went wrong in type inference, "+e.callee.object.name);var o=e.callee.object,s=e.callee.property.name,p=c.getTypeInfo(o,a);p||u.throwError(e,"Internal: No type info for: "+o);var l=a.getObjectInfoFor(p);if(l||u.throwError(e,"Internal Error: No object registered for: "+p.getTypeString()+", "+n(e.callee.object)+", "+e.callee.object.type),l.hasOwnProperty(s)){var f=l[s];if("function"==typeof f.callExp){var y=c.createTypeInfo(e.arguments,a);return f.callExp(e,y,r,t)}}}},j=function(e,r){var t=r.getScope(),n=t.getBindingByName(e.callee.name);if(n&&n.hasConstructor()){var a=n.getConstructor();return a(e)}throw new Error("ReferenceError: "+e.callee.name+" is not defined")},O=function(e,r,t){var n,i,o=e.property.name,s=t.getScope();if(e.computed)return B(e,r,t);if(b(e).isUniformExpression()){var p=a(e,t);if(p)return p}var l=c.getTypeInfo(e.object,s);l&&l.isObject()||u.throwError(e,"Internal Error: Object of Member expression is no object.");var f=s.getObjectInfoFor(l);if(f||u.throwError(e,"Internal Error: No object registered for: "+l.getTypeString()+JSON.stringify(e.object)),f.hasOwnProperty(o)){var m=f[o];if("function"==typeof m.property)return m.property(e,r,s,t)}var d=t.usedParameters;return l.isGlobal()?(n=y.getNameForGlobal(o),d.shader.hasOwnProperty(n)||(d.shader[n]=t.globalParameters[o]),i={type:h.Identifier,name:n},b(i).copy(b(e)),i):e.object.type==h.ThisExpression?(n=y.getNameForSystem(o),d.system.hasOwnProperty(n)||(d.system[n]=t.systemParameters[o]),i={type:h.Identifier,name:n},b(i).copy(b(e)),i):void 0},B=function(e,r,t){var n=t.getTypeInfo(e.object);n.isArray()||u.throwError(e,"In shade.js, [] access is only allowed on arrays.");var a=t.getTypeInfo(e.property);return a.canInt()||(e.property={type:h.CallExpression,callee:{type:"Identifier",name:"int"},arguments:[e.property]},b(e.property).setType(l.INT)),e},P=function(e,r,t){var n=t.getTypeInfo(e.left),a=t.getTypeInfo(e.right);return n.isNumber()&&a.isInt()?e.right=y.castToFloat(e.right):a.isNumber()&&n.isInt()&&(e.left=y.castToFloat(e.left)),"%"==e.operator?y.binaryExpression2FunctionCall(e,"mod"):e},U=function(e,r){var t=r.createScope(e,r.getScope(),e.id.name);r.pushScope(t);var n=[];return e.params.forEach(function(r){if(b(r).isUndefined()){var a=t.getBindingByName(r.name);a.isUndefined()||o(r.name,a,e.body)}else n.push(r)}),e.params=n,e},D=function(e,r){var t=r.inMainFunction();return r.popScope(),t?T(e):void 0},M=function(e){var r=b(e.test);switch(d(!r.hasStaticValue(),"Static value in IfStatement test"),d(!r.isObject(),"Object in IfStatement test"),r.getType()){case l.INT:case l.NUMBER:e.test={type:h.BinaryExpression,operator:"!=",left:e.test,right:{type:h.Literal,value:0,extra:{type:r.getType()}}}}},R=function(e){var r=b(e.left),t=b(e.right);if((!r.isBool()||!t.isBool())&&r.canNumber()){var n=e.left;return{type:h.ConditionalExpression,test:{type:h.BinaryExpression,operator:"==",left:n,right:{type:h.Literal,value:r.isNumber()?0:r.isInt()?0:"false",extra:{type:r.getType(),staticValue:r.isNumber()?0:r.isInt()?0:"false"}},extra:{type:l.BOOLEAN}},consequent:e.right,alternate:n}}};e.GLASTTransformer=E}(exports);


},{"../../base/annotation.js":130,"../../base/common.js":132,"../../base/index.js":135,"../tools.js":166,"./../../interfaces.js":168,"./registry/":147,"./registry/system.js":153,"analyses":1,"assert":92,"estraverse":91}],159:[function(require,module,exports){
!function(e){function r(e){for(var r=[],t=g?3:2,n=0;n<e.args.length-t;++n)r.push({type:u.VariableDeclarator,id:{type:u.Identifier,name:"cc"+e.id+"Arg"+n},init:null});return{type:u.VariableDeclaration,kind:"var",declarations:r}}function t(e,r){return{type:u.CallExpression,callee:{type:u.MemberExpression,object:{type:u.Identifier,name:I+e},property:{type:u.Identifier,name:r}},arguments:[]}}function n(e,r){for(var t=m;t<r.textureCount;++t)e.push({type:u.ExpressionStatement,expression:{type:u.AssignmentExpression,operator:"=",left:{type:u.Identifier,name:I+t},right:{type:u.CallExpression,callee:{type:u.MemberExpression,object:{type:u.MemberExpression,object:{type:u.Identifier,name:"env"},property:{type:u.Identifier,name:h+t}},property:{type:u.Identifier,name:"sample2D"}},arguments:[{type:u.Identifier,name:x}]}}})}function a(e,r){for(var t=r.id,n=g?3:2,a=r.args,i=n;i<a.length;++i){var s=a[i];if(!b[s.storeType])throw new Error("StoreType '"+s.storeType+"' not supported in light pass shader");var o=b[s.storeType](s);e.push({type:u.ExpressionStatement,expression:{type:u.AssignmentExpression,operator:"=",left:{type:u.Identifier,name:"cc"+t+"Arg"+(i-n)},right:o}})}}function i(e,r){for(var t=g?3:2,n=[],a=r.argIndices,i=0;i<a.length;++i)n.push({type:u.Identifier,name:"cc"+e+"Arg"+(a[i]-t)});return n}function s(e){for(var r={type:u.NewExpression,callee:{type:u.Identifier,name:"Shade"},arguments:[]},t=e.colorClosures,n=0;n<t.length;++n){var a=i(e.id,t[n]);r={type:u.CallExpression,callee:{type:u.MemberExpression,object:r,property:{type:u.Identifier,name:t[n].name}},arguments:a}}return{type:u.ReturnStatement,argument:r}}function o(e){var t=[];return t.push(r(e)),n(t,e),a(t,e),t.push(s(e)),{type:u.IfStatement,test:{type:u.BinaryExpression,operator:"==",left:{type:u.Identifier,name:"ccId"},right:{type:u.Literal,value:e.id}},consequent:{type:u.BlockStatement,body:t},alternate:null}}var p=(require("../../base/common.js"),require("esprima")),l=require("./../../interfaces.js"),c=(l.TYPES,l.OBJECT_KINDS,require("../../analyze/analyze.js")),y=require("estraverse"),u=y.Syntax,d=require("./light-pass-template").LightPassTemplate,f=require("../../resolve/xml3d-glsl-deferred/color-closure-signature.js").ArgStorageType,m=2,g=!0,x="texcoord",h="deferred",I="deferred",b={};b[f.FLOAT]=function(e){var r;switch(e.componentIdx){case 0:r="x";break;case 1:r="y";break;case 2:r="z";break;case 3:r="w"}return t(e.texIdx,r)},b[f.FLOAT2]=function(e){var r;switch(e.componentIdx){case 0:r="xy";break;case 1:r="yz";break;case 2:r="zw"}return t(e.texIdx,r)},b[f.FLOAT3]=function(e){var r;switch(e.componentIdx){case 0:r="xyz";break;case 1:r="yzw"}return t(e.texIdx,r)},b[f.FLOAT4]=function(e){return t(e.texIdx,"xyzw")},e.generateLightPassAst=function(e){var r;try{r=p.parse(d.toString(),{raw:!0})}catch(t){return console.error("Error in parsing of lightPass template",t),null}for(var n=r.body[0].body,a=[],i=0;i<e.length;++i)-1==a.indexOf(e[i].id)&&(a.push(e[i].id),n.body.push(o(e[i])));return r},e.generateLightPassAast=function(r,t){var n=e.generateLightPassAst(r);if(!n)return null;var a={};a.entry="global.shade",a.validate=!0,a.throwOnError=!0,a.implementation="xml3d-glsl-forward",a.inject=t,a.lightLoopNoSpaceTransform=!0,a.lightLoopPositionArg={type:u.Identifier,name:"position"},a.lightLoopAmbientArg={type:u.Identifier,name:"ambientIntensity"};var i=c.analyze(n,{},a).ast;return i}}(exports);


},{"../../analyze/analyze.js":101,"../../base/common.js":132,"../../resolve/xml3d-glsl-deferred/color-closure-signature.js":173,"./../../interfaces.js":168,"./light-pass-template":160,"esprima":90,"estraverse":91}],160:[function(require,module,exports){
!function(e){e.LightPassTemplate=function(e){var r=this.normalizedCoords.xy(),s=e.deferred0.sample2D(r),a=e.deferred1.sample2D(r);s.x(),s.yzw(),a.x()}}(exports);


},{}],161:[function(require,module,exports){
!function(e){function t(e){switch(e){case y.FLOAT2:return"Vec2";case y.FLOAT3:return"Vec3";case y.FLOAT4:return"Vec4";case y.MATRIX3:return"Mat3";case y.MATRIX4:return"Mat4"}throw new Error("Unknown Kind '"+e+"', no callee available.")}function r(e,t){var r=t.swizzle;if(1==r.length)return i(e,r);var n={type:v.NewExpression,callee:{type:v.Identifier,name:"Vec"+r.length},arguments:[]};x(n).setType(m.OBJECT,u(r.length));for(var s=0;s<r.length;++s){var a=r[s];n.arguments.push(i(e,a))}return n}function n(e,r,n){var c=x(e).getKind(),o={type:v.NewExpression,callee:{type:v.Identifier,name:t(c)},arguments:[]};x(o).copy(x(e));for(var u=p(c),l=n.swizzle,d=[],f=0;f<l.length;++f)d[s(l[f])]=f;for(var f=0;u>f;++f){var g;void 0==d[f]?g=i(e,a(f)):(g=1==l.length?r:i(r,a(d[f])),n.swizzleOperator&&(g={type:v.BinaryExpression,operator:n.swizzleOperator,left:i(e,a(f)),right:g},x(g).copy(x(g.left)))),o.arguments.push(g)}return o}function s(e){switch(e){case"x":case"r":case"s":return 0;case"y":case"g":case"t":return 1;case"z":case"b":case"p":return 2;case"w":case"a":case"q":return 3}throw new Error("Unknown Swizzle Component '"+e+"'")}function a(e){switch(e){case 0:return"x";case 1:return"y";case 2:return"z";case 3:return"w"}}function i(e,t){t=a(s(t));var r={type:v.CallExpression,callee:{type:v.MemberExpression,object:e,property:{type:v.Identifier,name:t}},arguments:[]};return x(r).setType(m.NUMBER),x(r.callee).setType(m.FUNCTION),r}function c(e){return e.type!=v.AssignmentExpression?!1:e.left.type==v.MemberExpression&&x(e.left.object).isArray()?!1:!0}function o(e,t){if(e.callee.type!=v.MemberExpression)return!1;var r=x(e.callee.object).getKind();if(r==y.ANY)return!1;var n=p(r),s=l(n,e.callee.property.name,t);if(!s)return!1;for(var a=t.argIndex,i=0,c=[];a<e.arguments.length&&s>i;){var o=e.arguments[a];c.push(o),i+=p(x(o).getKind()),a++}return t.extractArgs=!0,0==i&&(t.extractArgs=!1),i==s&&1==c.length&&(t.extractArgs=!1),t.args=c,t}function p(e){switch(e){case y.FLOAT2:return 2;case y.FLOAT3:return 3;case y.FLOAT4:return 4;case y.MATRIX3:return 9;case y.MATRIX4:return 16;default:return 1}}function u(e){switch(e){case 2:return y.FLOAT2;case 3:return y.FLOAT3;case 4:return y.FLOAT4;case 9:return y.MATRIX3;case 16:return y.MATRIX4}throw new Error("Unknown Object Count '"+e+"', no kind available.")}function l(e,t,r){var n=0,s=0;switch(t){case"add":case"sub":case"mul":case"div":case"mod":case"reflect":case"cross":case"dot":n=e;break;case"length":n=1;break;case"normalize":case"flip":n=0;break;case"mulVec":n=16==e?4:3;break;case"col":n=16==e?4:3,s=1;break;default:var a=t.match(/^([xyzwrgbastpq]{1,4})(Add|Sub|Mul|Div)?$/);if(a)switch(n=a[1].length,r.swizzle=a[1],a[2]){case"Add":r.swizzleOperator="+";break;case"Sub":r.swizzleOperator="-";break;case"Mul":r.swizzleOperator="*";break;case"Div":r.swizzleOperator="/"}}return!r.swizzle&&1>=n?0:(n>1?(r.type=m.OBJECT,r.kind=u(n)):r.type=m.NUMBER,r.argIndex=s,n)}var d=require("estraverse"),f=(require("assert"),require("../../base/index.js")),g=(require("./../../base/common.js"),require("../../interfaces.js")),h=(require("../../base/typeinfo.js").TypeInfo,require("../../analyze/sanitizer/statement-split-traverser")),m=g.TYPES,y=g.OBJECT_KINDS,x=require("../../base/annotation.js").ANNO,v=d.Syntax,b=d.VisitorOption,w=function(e){this.scopeStack=[]};f.extend(w.prototype,{execute:function(e){return d.replace(e,{enter:this.enterNode.bind(this),leave:this.exitNode.bind(this)}),e},enterNode:function(e,t){switch(e.type){case v.FunctionExpression:case v.FunctionDeclaration:this.pushScope(e),this.findArgAssignments(e.body);break;case v.Program:this.pushScope(e);break;case v.VariableDeclarator:this.addDeclaredIdentifier(e.id.name)}},exitNode:function(e,t){switch(e.type){case v.Identifier:return this.resolveIdentifier(e,t);case v.FunctionExpression:case v.FunctionDeclaration:case v.Program:return this.resolveScope(e,t)}},pushScope:function(e){var t={declared:[],args:{}},r=e.params;if(r)for(var n=0;n<r.length;++n)t.args[r[n].name]={name:r[n].name,replace:null,extra:f.deepExtend({},r[n].extra)},t.declared.push(r[n].name);this.scopeStack.push(t)},resolveScope:function(e,t){var r=this.scopeStack.pop(),n=[];for(var s in r.args)r.args[s].replace&&n.push(r.args[s]);return this.addTopDeclaration(e,n),e},getScope:function(){return this.scopeStack[this.scopeStack.length-1]},findArgAssignments:function(e){d.traverse(e,{enter:this.assignmentSearchEnter.bind(this)})},assignmentSearchEnter:function(e,t){switch(e.type){case v.Program:case v.FunctionDeclaration:case v.FunctionExpression:return b.Skip}if(e.type==v.AssignmentExpression&&e.left.type==v.Identifier){if(x(e).getType()!=m.OBJECT)return b.Skip;var r=this.getScope(),n=e.left.name;if(r.args[n]&&!r.args[n].replace){var s=this.getFreeVarName("_dest_"+n);this.addDeclaredIdentifier(s),r.args[n].replace=s}return b.Skip}},resolveIdentifier:function(e,t){if(t.type!=v.FunctionDeclaration&&t.type!=v.FunctionExpression){var r=this.getScope(),n=r.args[e.name];return n&&n.replace&&(e.name=n.replace),e}},getFreeVarName:function(e){for(var t=e,r=0;this.isVarDeclared(t);)r++,t=e+r;return t},isVarDeclared:function(e){for(var t=this.scopeStack.length;t--;)if(-1!=this.scopeStack[t].declared.indexOf(e))return!0;return!1},addTopDeclaration:function(e,t){if(t.length>0){for(var r=[],n=[],s=0;s<t.length;++s){var a={type:v.VariableDeclarator,id:{type:v.Identifier,name:t[s].replace},extra:t[s].extra,init:null},i={type:v.ExpressionStatement,expression:{type:v.AssignmentExpression,operator:"=",left:{type:v.Identifier,name:t[s].replace},right:{type:v.Identifier,name:t[s].name}}},c=x(a);x(i.expression).copy(c),x(i.expression.left).copy(c),x(i.expression.right).copy(c),r.push(a),n.push(i)}var o;e.type==v.Program?o=e.body:e.body.body&&(o=e.body.body),0==o.length||o[0].type!=v.VariableDeclaration?o.unshift({type:v.VariableDeclaration,declarations:r,kind:"var"}):o[0].declarations.push.apply(o[0].declarations,r);for(var p=0;p<o.length&&o[p].type==v.VariableDeclaration;)p++;n.unshift(p,0),o.splice.apply(o,n)}return e},addDeclaredIdentifier:function(e){var t=this.getScope();-1==t.declared.indexOf(e)&&t.declared.push(e)}});var E=function(){h.call(this)};f.createClass(E,h,{statementSplitEnter:function(e,t){switch(e.type){case v.FunctionExpression:return b.Skip;case v.CallExpression:case v.NewExpression:case v.MemberExpression:return void(e._usedIndex=this.getStatementTmpUsedCount())}},statementSplitExit:function(e,t){switch(e.type){case v.CallExpression:case v.NewExpression:return this.callExit(e,t);case v.MemberExpression:return this.memberExit(e,t)}},memberExit:function(e,t){var r=x(e),n=r.getType(),s=r.getKind(),a=e._usedIndex;if(delete e._usedIndex,(t.type!=v.AssignmentExpression||t.left!=e)&&!c(t)&&e.computed&&x(e.object).getType()==m.ARRAY&&this.isObjectResult(n,s)){this.reduceStatementTmpUsed(a);var i=this.addAssignment(n,s,e);return i}},callExit:function(e,r){var n=x(e),s=n.getType(),a=n.getKind(),i=e._usedIndex;if(delete e._usedIndex,e.type==v.CallExpression){var o=this.getObjectArgsInfo(e);if(o){if(o.extractArgs){var p=o.type,u=o.kind,l={type:v.NewExpression,callee:{type:v.Identifier,name:t(u)},arguments:o.args};x(l).setType(p,u);var d=this.addAssignment(p,u,l);e.arguments.splice(o.argIndex,o.args.length,d)}o.swizzle&&(e=this.convertToSwizzle(e.callee.object,e.arguments,o))}}if(!this.isObjectResult(s,a))return e;if(c(r))return e;this.reduceStatementTmpUsed(i);var f=this.addAssignment(s,a,e);return f},convertToSwizzle:function(e,t,s){return 0==t.length?r(e,s):n(e,t[0],s)},addAssignment:function(e,t,r){var n=this.getFreeName(e,t),s={type:v.AssignmentExpression,operator:"=",left:{type:v.Identifier,name:n},right:r};x(s).copy(x(r)),x(s.left).copy(x(r)),this.assignmentsToBePrepended.push(s);var a={type:v.Identifier,name:n};return x(a).copy(x(r)),a},isObjectResult:function(e,t){return e==m.OBJECT},getObjectArgsInfo:function(e){var t={type:null,kind:null,argIndex:0,args:null,extractArgs:!1,swizzle:null,swizzleOperator:null};return o(e,t)?t:!1}}),e.simplifyStatements=function(e,t){var r=new w(t);e=r.execute(e);var n=new E(t);return e=n.execute(e)}}(exports);


},{"../../analyze/sanitizer/statement-split-traverser":106,"../../base/annotation.js":130,"../../base/index.js":135,"../../base/typeinfo.js":137,"../../interfaces.js":168,"./../../base/common.js":132,"assert":92,"estraverse":91}],162:[function(require,module,exports){
!function(e){function t(e,t){for(var a=e.entries.length;a--;)for(var r=e.entries[a],n=r.outputInfo.length;n--;){var i=r.outputInfo[n];if(i.isFinal()){var p=I(i.name,t);t.transferInputNameMap[a+"_"+n]={name:p,finalOutput:!0},t.outputNameMap[i.finalOutputIndex]={name:p,type:i.type}}}}function a(e,t){for(var a={type:h.BlockStatement,body:[]},r=0;r<e.entries.length;++r){var n=e.entries[r],i={outputMap:f(n,r,t),inputMap:y(n,t),temporaryMap:{}};p(a.body,n,i,t)}return a}function r(e,t){var a=[];if(t.mode==S.GLSL_VS)a.push({type:h.Identifier,name:t.envName});else{for(var r=0;r<t.outputNameMap.length;++r){var n=t.outputNameMap[r].name;a.push({type:h.Identifier,name:n})}for(var r=0;r<t.directInputNameMap.length;++r){var n=t.directInputNameMap[r].name;a.push({type:h.Identifier,name:n})}}var p=e;if(t.mode==S.JS_ITERATE){var u=I("maxIter",t);a.push({type:h.Identifier,name:u}),p={type:h.BlockStatement,body:[{type:h.VariableDeclaration,kind:"var",declarations:[{type:h.VariableDeclarator,id:{type:h.Identifier,name:t.iterateIdentifier},init:{type:h.Identifier,name:u}}]},{type:h.WhileStatement,test:{type:h.UpdateExpression,operator:"--",argument:{type:h.Identifier,name:t.iterateIdentifier}},body:e}]}}return i(p,t),{type:h.Program,body:[{type:h.FunctionDeclaration,id:{type:h.Identifier,name:"main"},params:a,defaults:[],body:p}]}}function n(e,t){var a=[];if(t.mode==S.GLSL_VS){for(var r={},n={},i={},p=0;p<t.outputNameMap.length;++p){var u=t.outputNameMap[p],o=b.deepExtend({},u.type);o.source="vertex",o.output=!0,r[u.name]=o,n[u.name]=p}for(var p=0;p<t.directInputNameMap.length;++p){var u=t.directInputNameMap[p];if(u){var o=b.deepExtend({},u.type);o.source=u.iterate?"vertex":"uniform",r[u.name]=o,i[u.name]=p}}var s={extra:{type:"object",kind:"any",global:!0,info:r}};a.push(s),e.outputIndices=n,e.inputIndices=i}else{for(var p=0;p<t.outputNameMap.length;++p)a.push({extra:{type:"array",elements:b.deepExtend({},t.outputNameMap[p].type)}});for(var p=0;p<t.directInputNameMap.length;++p){var o=b.deepExtend({},t.directInputNameMap[p].type);t.directInputNameMap[p].arrayAccess||(o={type:"array",elements:o}),a.push({extra:o})}a.push({extra:{type:"int"}})}e.argTypes=a}function i(e,t){if(0!=t.declareNames.length){for(var a={type:h.VariableDeclaration,kind:"var",declarations:[]},r=0;r<t.declareNames.length;++r){var n=t.declareNames[r];a.declarations.push({type:h.VariableDeclarator,id:{type:h.Identifier,name:n},init:null})}e.body.unshift(a)}}function p(e,t,a,r){var n=N.replace(t.ast.body,{leave:function(e,t){switch(e.type){case h.Identifier:return u(e,t,a,r);case h.VariableDeclarator:return o(e,t,a,r);case h.BlockStatement:return s(e,t,a,r);case h.ReturnStatement:return m(e,t,a,r)}}});e.push.apply(e,n.body)}function u(e,t,a,r){return t.type==h.Property&&t.key==e||t.type==h.VariableDeclarator?void 0:a.temporaryMap[e.name]?a.temporaryMap[e.name]:a.inputMap[e.name]?a.inputMap[e.name]:void 0}function o(e,t,a,r){var n=e.id.name,i=I(n,r);r.declareNames.push(i),a.temporaryMap[n]={type:h.Identifier,name:i}}function s(e,t,a,r){for(var n=e.body.length;n--;)e.body[n].type==h.VariableDeclaration&&e.body.splice(n,1);return e}function m(e,t,a,r){if(e.argument.type!=h.ObjectExpression){var n;for(n in a.outputMap)break;return d(n,e.argument,a)}for(var i={type:h.BlockStatement,body:[]},p=e.argument.properties,u=null,o=0;o<p.length;++o){var s=p[o],n=s.key.name||s.key.value;"_glPosition"==n?r.mode==S.GLSL_VS&&(u=s.value):i.body.push(d(n,s.value,a))}return u&&i.body.push({type:h.ReturnStatement,argument:u}),i}function d(e,t,a){return{type:h.ExpressionStatement,expression:{type:h.AssignmentExpression,operator:"=",left:b.deepExtend({},a.outputMap[e]),right:t}}}function y(e,t){for(var a={},r=e.inputInfo,n=e.ast.params,i=0;i<r.length;++i){var p=r[i],u=n[i].name;a[u]=c(u,p,t)}return a}function c(e,t,a){var r,n=!1;if(t.isTransferInput()){var i=a.transferInputNameMap[t.getTransferInputKey()];r=i.name,n=!i.finalOutput}else{var p=t.directInputIndex;if(!a.directInputNameMap[p]){var u=t.type;t.arrayAccess&&(u={type:"array",elements:u,staticSize:t.arraySize}),a.directInputNameMap[p]={name:I(e,a),type:u,iterate:t.iterate,arrayAccess:t.arrayAccess}}r=a.directInputNameMap[p].name}var o={type:h.Identifier,name:r};return n||(o=v(o,t.arrayAccess,t.iterate,a)),o}function f(e,t,a){for(var r={},n=e.outputInfo,i=0;i<n.length;++i){var p=n[i],u=n[i].name;r[u]=l(u,p,t,i,a)}return r}function l(e,t,a,r,n){var i,p;t.isFinal()?(p=!0,i=n.outputNameMap[t.finalOutputIndex].name):(i=I(e,n),n.transferInputNameMap[a+"_"+r]={name:i,finalOutput:!1},n.declareNames.push(i));var u={type:h.Identifier,name:i};return p&&(u=v(u,!1,!0,n)),u}function v(e,t,a,r){return r.mode!=S.JS_ITERATE||t?r.mode==S.GLSL_VS?{type:h.MemberExpression,object:{type:h.Identifier,name:r.envName},property:e}:void 0:{type:h.MemberExpression,computed:!0,object:e,property:a?{type:h.Identifier,name:r.iterateIdentifier}:{type:h.Literal,value:0,raw:"0"}}}function I(e,t){for(var a=e,r=1;-1!=t.blockedNames.indexOf(a);)a=e+"_"+ ++r;return t.blockedNames.push(a),a}var N=require("estraverse"),b=(require("assert"),require("../../base/index.js")),M=(require("./../../base/common.js"),require("../../interfaces.js")),h=(require("../../base/typeinfo.js").TypeInfo,require("../../analyze/sanitizer/statement-split-traverser"),M.TYPES,M.OBJECT_KINDS,require("../../base/annotation.js").ANNO,N.Syntax),S=(N.VisitorOption,{JS_ITERATE:1,JS_NO_ITERATE:2,GLSL_VS:3}),x=function(){};b.extend(x.prototype,{execute:function(e,i){var p={iterateIdentifier:null,envName:null,blockedNames:[],transferInputNameMap:{},outputNameMap:[],directInputNameMap:[],mode:i,declareNames:[]};t(e,p),p.iterateIdentifier=I("i",p),p.mode==S.GLSL_VS&&(p.envName=I("env",p));var u=a(e,p);u=r(u,p);var o={ast:u,argTypes:null};return n(o,p),o}}),e.connectSnippets=function(e,t){var a=new x;return a.execute(e,t.mode||S.JS_ITERATE)},e.MODE=S}(exports);


},{"../../analyze/sanitizer/statement-split-traverser":106,"../../base/annotation.js":130,"../../base/index.js":135,"../../base/typeinfo.js":137,"../../interfaces.js":168,"./../../base/common.js":132,"assert":92,"estraverse":91}],163:[function(require,module,exports){
!function(t){var n=(require("estraverse"),require("assert"),require("../../base/index.js")),e=(require("./../../base/common.js"),function(){this.entries=[]});n.extend(e.prototype,{addEntry:function(t){this.entries.push(t)}});var i=function(t){this.inputInfo=[],this.outputInfo=[],this.ast=t||null};n.extend(i.prototype,{setAst:function(t){this.ast=t},addVertexInput:function(t,n){var e=new r(t,!0,!1);e.setDirectInput(n),this.inputInfo.push(e)},addUniformInput:function(t,n){var e=new r(t,!1,!1);e.setDirectInput(n),this.inputInfo.push(e)},addUniformArray:function(t,n,e){var i=new r(t,!1,!0);i.setDirectInput(n,e),this.inputInfo.push(i)},addTransferInput:function(t,n,e){var i=new r(t,!0,!1);i.setTransferInput(n,e),this.inputInfo.push(i)},addLostOutput:function(t,n){var e=new s(t,n);this.outputInfo.push(e)},addFinalOutput:function(t,n,e){var i=new s(t,n);i.setFinalOutputIndex(e),this.outputInfo.push(i)}});var r=function(t,n,e){this.type=t,this.iterate=n,this.arrayAccess=e,this.transferOperatorIndex=void 0,this.transferOutputIndex=void 0,this.directInputIndex=void 0,this.arraySize=void 0};n.extend(r.prototype,{setDirectInput:function(t,n){this.transferOperatorIndex=this.transferOutputIndex=void 0,this.directInputIndex=t,this.arraySize=n},setTransferInput:function(t,n){this.transferOperatorIndex=t,this.transferOutputIndex=n,this.directInputIndex=void 0},isTransferInput:function(){return void 0!==this.transferOperatorIndex},getTransferInputKey:function(){return this.transferOperatorIndex+"_"+this.transferOutputIndex}});var s=function(t,n){this.type=t,this.name=n,this.finalOutputIndex=void 0};n.extend(s.prototype,{setFinalOutputIndex:function(t){this.finalOutputIndex=t},isFinal:function(){return void 0!==this.finalOutputIndex}}),t.SnippetList=e,t.SnippetEntry=i}(exports);


},{"../../base/index.js":135,"./../../base/common.js":132,"assert":92,"estraverse":91}],164:[function(require,module,exports){
!function(e){var r=require("../../base/common.js"),t=require("./../../interfaces.js"),n=t.TYPES,a=t.OBJECT_KINDS,c=t.SpaceType,o=t.VectorType,p=require("estraverse"),i=p.Syntax,s=r.ANNO;e.getSpaceTransformCall=function(e,r){var t={type:i.CallExpression,callee:this.getSpaceConvertFunction(r),arguments:[this.getSpaceConvertArg(r),e]};return t},e.getSpaceConvertFunction=function(e){var r,c=t.getVectorFromSpaceVector(e);switch(c){case o.POINT:r="transformPoint";break;case o.NORMAL:r="transformDirection"}var p={type:i.MemberExpression,object:{type:i.Identifier,name:"Space"},property:{type:i.Identifier,name:r}};return s(p).setType(n.FUNCTION),s(p.object).setType(n.OBJECT,a.ANY),p},e.getSpaceConvertArg=function(e){var r,n=t.getSpaceFromSpaceVector(e);switch(n){case c.VIEW:r="VIEW";break;case c.WORLD:r="WORLD"}return{type:i.MemberExpression,object:{type:i.Identifier,name:"Space"},property:{type:i.Identifier,name:r}}}}(exports);


},{"../../base/common.js":132,"./../../interfaces.js":168,"estraverse":91}],165:[function(require,module,exports){
!function(e){function a(e){return e.spaceInfo||{}}var n=require("../../base/index.js"),r=require("../../base/common.js"),t=(require("../../base/annotation.js").FunctionAnnotation,require("../../base/typeinfo.js").TypeInfo,require("./../../interfaces.js")),i=(require("esgraph"),t.TYPES),s=t.OBJECT_KINDS,o=require("../../analyze/space_analyzer.js"),p=t.SpaceVectorType,c=(t.SpaceType,t.VectorType),f=require("./space-transform-tools.js"),l=require("estraverse"),u=l.Syntax,h=r.ANNO,d=function(e){this.mainId=e};n.extend(d.prototype,{transformAast:function(e,a){return a=a||{},this.root=e,this.functionSpaceInfo={},this.functionTranfserInfo={},this.globalIdentifiers=this.getGlobalIdentifiers(e),this.envSpaces={},this.transformFunctions(e),this.updateGlobalObject(e,this.envSpaces),this.envSpaces},transformFunctions:function(e){var a=this;return e=l.replace(e,{enter:function(e,n){switch(e.type){case u.FunctionDeclaration:a.replaceFunctionInvocations(e.body),a.extractSpaceTransforms(e),this.skip()}}})},replaceFunctionInvocations:function(e){var a=this;l.replace(e,{enter:function(e,n){if(e.type==u.CallExpression&&e.callee.type==u.Identifier&&a.functionSpaceInfo[e.callee.name]){for(var r=a.functionSpaceInfo[e.callee.name],t=e.arguments,i=[],s=0;s<r.length;++s){var o=r[s];o.space?i.push(f.getSpaceTransformCall(t[o.idx],o.space)):void 0!==t[o.idx]&&i.push(t[o.idx])}e.arguments=i}}})},extractSpaceTransforms:function(e){var n=this;this.usedIdentifiers=this.getUsedIdentifiers(e);var r=o.analyze(e,this.functionTranfserInfo),t={},i=[];this.extractEnvSpaces(r,t),this.initFunctionHeader(e,r,t,i),e.body=l.replace(e.body,{enter:function(e,r){if(e.type==u.ExpressionStatement){var s=n.duplicateSpaceStatement(e,t,i);if(s)return this.skip(),s}else a(e).hasSpaceOverrides&&(n.resolveSpaceUsage(e,p.OBJECT,t),this.skip())}}),this.addDeclarations(e,i),this.cleanUpDeclarations(e)},extractEnvSpaces:function(e,a){for(var n in e)if(0==n.indexOf("env."))for(var r=n.substr(4),t=e[n].length;t--;){var i=e[n][t],s=this.getSpaceName(n,i);this.envSpaces[r]||(this.envSpaces[r]=[]),this.envSpaces[r].some(function(e){return e.space==i})||this.envSpaces[r].push({name:s.split(".")[1],space:i}),a[n]||(a[n]={}),a[n][i]=this.getSpaceName(n,i)}},initFunctionHeader:function(e,a,n,r){for(var t=[],i=[],s=0;s<e.params.length;++s){var o=e.params[s],c=o.name;if(a[c]){for(var f=a[c].length,l=!1;f--;){var d=a[c][f];if(d!=p.OBJECT){n[c]||(n[c]={}),n[c][d]=this.getSpaceName(c,d);var v={type:u.Identifier,name:n[c][d]};h(v).copy(h(o)),t.push(v),i.push({idx:s,space:d})}else l=!0,t.push(o),i.push({idx:s})}l||r.push(c)}else t.push(o),i.push({idx:s})}e.params=t,this.functionSpaceInfo[e.id.name]=i},duplicateSpaceStatement:function(e,n,r){var t=[],i=e.expression,s=a(i),o={};if(!s.finalSpaces)return void(n[s.def]=o);if(s.finalSpaces.forEach(function(e){var a=JSON.parse(JSON.stringify(i));if(e==p.OBJECT||this.isSpacePropagrationPossible(s,e)?this.resolveSpaceUsage(a,e,n):(this.resolveSpaceUsage(a,p.OBJECT,n),a.right=f.getSpaceTransformCall(a.right,e)),t.push({type:u.ExpressionStatement,expression:a}),e!=p.OBJECT){var c=this.getSpaceName(s.def,e);-1==r.indexOf(c)&&r.push(c),o[e]=c,a.left.name=c}}.bind(this)),n[s.def]=o,0!=t.length){if(1==t.length)return t[0];var c={type:u.BlockStatement,body:t};return c}},addDeclarations:function(e,a){for(var n=e.params.length;n--;){var r=a.indexOf(e.params[n].name);-1!=r&&a.splice(r,1)}if(a.length>0){for(var t={type:u.VariableDeclaration,kind:"var",declarations:[]},n=a.length;n--;){var o=a[n],p={type:u.VariableDeclarator,id:{type:u.Identifier,name:o},init:null};h(p).setType(i.OBJECT,s.FLOAT3),t.declarations.push(p)}e.body.body.unshift(t)}},isSpacePropagrationPossible:function(e,a){if(0==e.propagateSet.length)return!1;var n=t.getVectorFromSpaceVector(a);return n==c.NORMAL&&e.normalSpaceViolation?!1:n==c.POINT&&e.pointSpaceViolation?!1:!0},resolveSpaceUsage:function(e,n,r){var t=this;return e=l.replace(e,{enter:function(e,i){switch(e.type){case u.Identifier:n!=p.OBJECT&&a(e).propagate&&(e.name=r[e.name][n]);break;case u.MemberExpression:if(n!=p.OBJECT&&a(e).propagate){var s="env."+e.property.name,o=r[s][n],c=o.split(".");e.property.name=c[1]}break;case u.CallExpression:var f=a(e);if(f.spaceOverride&&t.isSpacePropagrationPossible(f,f.spaceOverride)){var l=t.resolveSpaceUsage(e.arguments[1],f.spaceOverride,r);return this.skip(),l}}}})},getSpaceName:function(e,a){if(a==p.OBJECT)return e;var n=!1;switch(0==e.indexOf("env.")&&(n=!0,e=e.substr(4)),a){case p.VIEW_POINT:e+="_vps";break;case p.WORLD_POINT:e+="_wps";break;case p.VIEW_NORMAL:e+="_vns";break;case p.WORLD_NORMAL:e+="_wns"}for(var r=e,t=2;-1!=(n?this.globalIdentifiers:this.usedIdentifiers).indexOf(r);)r=e+t++;return n&&(r="env."+r),r},getUsedIdentifiers:function(e){var a=[];return l.traverse(e,{enter:function(e,n){if(e.type==u.Identifier){if(n.type==u.MemberExpression&&n.property==e)return;-1==a.indexOf(e.name)&&a.push(e.name)}}}),a},getGlobalIdentifiers:function(e){var a=[];return l.traverse(e,{enter:function(e,n){e.type==u.MemberExpression&&e.object.extra.global&&-1==a.indexOf(e.property.name)&&a.push(e.property.name)}}),a},cleanUpDeclarations:function(e){for(var a=[],n=e.body.body,r=n.length;r--;)n[r].type==u.VariableDeclaration&&(a.push.apply(a,n[r].declarations),n.splice(r,1));var t=this.getUsedIdentifiers(e.body),i={type:u.VariableDeclaration,kind:"var",declarations:[]};for(r=a.length;r--;)-1!=t.indexOf(a[r].id.name)&&i.declarations.push(a[r]);i.declarations.length>0&&n.unshift(i)},updateGlobalObject:function(e,a){if(e.globalParameters){var r;for(var t in e.globalParameters)for(var i=e.globalParameters[t],s=i.length;s--;)i[s].extra.global&&(r=i[s].extra);if(r){var o={};for(var p in r.info){var c=r.info[p];if(a[p])for(var f=a[p],s=0;s<f.length;++s){var u=n.deepExtend({},c);o[f[s].name]=u}else o[p]=c}r.info=o,l.traverse(e,{enter:function(e,a){if(e.extra&&e.extra.global&&(e.extra.info=o),e.scope&&e.scope.bindings)for(var n in e.scope.bindings)e.scope.bindings[n].extra.global&&(e.scope.bindings[n].extra.info=o)}})}}}}),e.SpaceTransformer=new d}(exports);


},{"../../analyze/space_analyzer.js":109,"../../base/annotation.js":130,"../../base/common.js":132,"../../base/index.js":135,"../../base/typeinfo.js":137,"./../../interfaces.js":168,"./space-transform-tools.js":164,"esgraph":87,"estraverse":91}],166:[function(require,module,exports){
!function(e){var r=require("estraverse").Syntax,t=require("../base/index.js"),n=require("../base/annotation.js").ANNO,a=require("../base/typeinfo.js").TypeInfo,o=require("../interfaces.js"),i=require("../base/vec.js"),l=o.TYPES,s=o.OBJECT_KINDS;e.removeMemberFromExpression=function(e){return{type:r.Identifier,name:e.property.name}},e.generateFreeName=function(e,r){for(var t=e.replace(/_+/g,"_"),n=1;-1!=r.indexOf(t);)t=(e+"_"+ ++n).replace(/_+/g,"_");return r.push(t),t},e.getInternalFunctionName=function(r,t,n,a){if(!r.internalFunctions[t]){var o=e.generateFreeName(t,r.blockedNames);r.internalFunctions[t]={name:o,type:n,details:a}}return r.internalFunctions[t].name},e.binaryExpression2FunctionCall=function(t,n){return t.right=e.castToFloat(t.right),t.left=e.castToFloat(t.left),{type:r.CallExpression,callee:{type:r.Identifier,name:n},arguments:[t.left,t.right],extra:{type:l.NUMBER}}};var c={getVecArgs:function(e){if(0==e.length){var r=[{type:"Literal",value:"0"}];return n(r[0]).setType(l.NUMBER),r}return e},generateVecFromArgs:function(e,t){if(1==e)return t[0];if(0==t.length&&(t=c.getVecArgs(t)),1==t.length&&n(t[0]).isOfKind(s["FLOAT"+e]))return t[0];var a={type:r.NewExpression,callee:{type:r.Identifier,name:"Vec"+e},arguments:t};return n(a).setType(l.OBJECT,s["FLOAT"+e]),n(a.callee).setType(l.FUNCTION),a},createSwizzle:function(e,t,a,o,l){if(0==o.length)return a.callee.extra=a.extra,a.callee;for(var s=1==t.length,p=s?a.arguments[0]:c.generateVecFromArgs(t.length,a.arguments),u={type:r.NewExpression,callee:{type:r.Identifier,name:"Vec"+e},arguments:[]},g=[],f=0;f<t.length;++f){var y=i.swizzleToIndex(t.charAt(f));g[y]=f}for(var f=0;e>f;++f)void 0!==g[f]?u.arguments[f]=s?p:{type:r.MemberExpression,object:p,property:{type:r.Identifier,name:i.indexToSwizzle(g[f])}}:u.arguments[f]={type:r.MemberExpression,object:a.callee.object,property:{type:r.Identifier,name:i.indexToSwizzle(f)}};return n(u).copy(n(a)),u},createSwizzleOperator:function(e,t,a,o,l,s){for(var p=1==t.length,u=p?o.arguments[0]:c.generateVecFromArgs(t.length,o.arguments),g={type:r.NewExpression,callee:{type:r.Identifier,name:"Vec"+e},arguments:[]},f=[],y=0;y<t.length;++y){var m=i.swizzleToIndex(t.charAt(y));f[m]=y}for(var y=0;e>y;++y){var v={type:r.MemberExpression,object:o.callee.object,property:{type:r.Identifier,name:i.indexToSwizzle(y)}};void 0!==f[y]?g.arguments[y]={type:r.BinaryExpression,operator:a,left:v,right:p?u:{type:r.MemberExpression,object:u,property:{type:r.Identifier,name:i.indexToSwizzle(f[y])}}}:g.arguments[y]=v}return n(g).copy(n(o)),g},attachSwizzles:function(e,r,t,n){for(var a=0;a<i.swizzleSets.length;++a)for(var o=1;4>=o;++o)for(var l=Math.pow(r,o),s=0;l>s;++s){for(var c=s,p="",u=[],g=r>=o,f=0;o>f;++f){var y=c%r;c=Math.floor(c/r),p+=i.swizzleSets[a][y],u[y]?g=!1:u[y]=!0}if(e[p]={callExp:t.bind(null,r,p)},g&&n)for(var m in i.swizzleOperators){var v=i.swizzleOperators[m];e[p+m]={callExp:n.bind(null,r,p,v)}}}},createOperator:function(e,t,a,o,i){var l=c.generateVecFromArgs(e,a.arguments),s={type:r.BinaryExpression,operator:t,left:a.callee.object,right:l};return n(s).copy(n(a)),s},attachOperators:function(e,r,t){for(var n in t){var a=t[n];e[n]={callExp:c.createOperator.bind(null,r,a)}}},createFunctionCall:function(e,t,a,o,i){var l={type:r.CallExpression,callee:{type:r.Identifier,name:e},arguments:[a.callee.object]};if(t){var s=c.generateVecFromArgs(t,a.arguments);l.arguments.push(s)}return n(l).copy(n(a)),l},generateLengthCall:function(e,t,a){if(0==t.length)return c.createFunctionCall("length",0,e,t,a);var o={type:r.BinaryExpression,operator:"*",left:e.callee.object,right:{type:r.BinaryExpression,operator:"/",left:e.arguments[0],right:c.createFunctionCall("length",0,e,t,a)}};return n(o.right).setType(l.NUMBER),n(o).copy(n(e)),o},generateConstructor:function(e){e.arguments=c.getVecArgs(e.arguments)}},p={TYPES:{Mat3:{kind:s.MATRIX3,colKind:s.FLOAT3,colCount:3,glslType:"mat3"},Mat4:{kind:s.MATRIX4,colKind:s.FLOAT4,colCount:4,glslType:"mat3"}},generateMatFromArgs:function(e,t){if(0==t.length&&(t=c.getVecArgs(t)),1==t.length&&n(t[0]).isOfKind(p.TYPES[e].kind))return t[0];var a={type:r.NewExpression,callee:{type:r.Identifier,name:e},arguments:t};return n(a).setType(l.OBJECT,p.TYPES[e].kind),n(a.callee).setType(l.FUNCTION),a},createOperator:function(e,t,a,o,i){var l=p.generateMatFromArgs(e,a.arguments),s={type:r.BinaryExpression,operator:t,left:a.callee.object,right:l};return n(s).copy(n(a)),s},attachOperators:function(e,r,t){for(var n in t){var a=t[n];e[n]={callExp:p.createOperator.bind(null,r,a)}}},generateColCall:function(t,a,o,i,s){var c={type:r.MemberExpression,object:a.callee.object,property:a.arguments[0],computed:!0};if(n(c).setType(l.OBJECT,p.TYPES[t].colKind),1==o.length)return c;var u="_"+t+"_col",g=e.getInternalFunctionName(s,u,"MatCol",{colType:"vec"+p.TYPES[t].colCount,matType:p.TYPES[t].glslType}),f={type:r.CallExpression,callee:{type:r.Identifier,name:g},arguments:[a.callee.object,a.arguments[0],a.arguments[1]]};return n(f).copy(n(a)),f}};e.Vec=c,e.Mat=p,e.castToFloat=function(e){var t=n(e);return t.isNumber()?e:{type:r.CallExpression,callee:{type:r.Identifier,name:"float"},arguments:[e]}},e.getNameForSystem=function(e){return e},e.getNameForGlobal=function(e){var r="_env_"+e;return r.replace(/_+/g,"_")},e.castToVec4=function(e,t){var n=a.createForContext(e,t);return n.isOfKind(s.FLOAT4)||n.isOfKind(s.COLOR_CLOSURE)?e:n.isOfKind(s.FLOAT3)?{type:r.CallExpression,callee:{type:r.Identifier,name:"vec4"},arguments:[e,{type:r.Literal,value:1,extra:{type:l.NUMBER}}]}:void o.throwError(e,"Can't cast from '"+n.getTypeString()+"' to vec4")},e.extend=t.extend,e.createClass=t.createClass}(exports);


},{"../base/annotation.js":130,"../base/index.js":135,"../base/typeinfo.js":137,"../base/vec.js":138,"../interfaces.js":168,"estraverse":91}],167:[function(require,module,exports){
!function(e){require("es6-map/implement");var r=require("esprima"),t=require("escodegen"),n=require("./analyze/parameters.js"),i=require("./interfaces.js"),a=(require("./analyze/typeinference/typeinference.js"),require("./analyze/sanitizer/sanitizer.js")),s=require("./base/index.js"),o=require("./generate/glsl/compiler.js").GLSLCompiler,p=require("./generate/glmatrix/compiler.js").GLMatrixCompiler,c=require("./generate/light-pass/light-pass-generator.js"),l=require("./resolve/resolve.js"),u=require("./generate/space/transform.js").SpaceTransformer,g=(require("./analyze/validator.js"),require("./analyze/analyze.js")),d=i.SpaceVectorType,h=(i.SpaceType,i.VectorType,require("./generate/snippets/snippet-list.js").SnippetList),S=require("./generate/snippets/snippet-list.js").SnippetEntry,m=require("./generate/snippets/snippet-connector"),f=require("./contrib/gl-matrix.js");require("./contrib/gl-matrix-extend.js").extend(f);var y=function(){this.ast=null,this.aast=null,this.result=null,this.processingData={}};s.extend(y.prototype,{setAst:function(e){this.ast=e},parse:function(r,t){t=t||{},this.ast=e.parse(r,t)},analyze:function(e,r,t){return t=t||{},t.entry=t.entry||"global.shade",t.validate=void 0!==t.validate?t.validate:!0,t.throwOnError=void 0!==t.throwOnError?t.throwOnError:!0,t.implementation=r,t.inject=e,this.aast=g.analyze(this.ast,this.processingData,t).ast,this.aast},getProcessingData:function(e){return this.processingData[e]},compileFragmentShader:function(r){return this.result=e.compileFragmentShader(this.aast,r),this.result}}),s.extend(e,{parse:function(e,t){return"function"==typeof e&&(e=e.toString()),"string"==typeof e?r.parse(e,{raw:!0,loc:t.loc||!1}):e},extractParameters:function(e,r){return n.extractParameters(e,r)},getSanitizedAst:function(e,r){var t=this.parse(e,r);return a.sanitize(t,r)},parseAndInferenceExpression:function(r,t){return t=t||{},t.entry=t.entry||"global.shade",t.validate=void 0!==t.validate?t.validate:!0,t.throwOnError=void 0!==t.throwOnError?t.throwOnError:!0,r=e.parse(r,t),g.analyze(r,{},t).ast},analyze:function(r,t){return t=t||{},r=e.parse(r,t),g.analyze(r,{},t)},resolveClosures:function(e,r,t,n){return n=n||{},t=t||{},l.resolveClosuresPreTypeInference(e,r,t,n)},resolveSpaces:function(e,r){return r=r||{},u.transformAast(e,r)},getLightPassAast:function(e,r,t){return c.generateLightPassAast(e,r)},compileFragmentShader:function(e,r){return(new o).compileFragmentShader(e,r)},toJavaScript:function(e,r){return t.generate(e,r)},getSnippetAst:function(e){var r;return"function"==typeof e?(e="METHOD="+e.toString(),r=this.getSanitizedAst(e,{}).body[0].expression.right):r=this.getSanitizedAst(s.deepExtend({},e),{}),r},compileJsProgram:function(e,r,t){var n=m.connectSnippets(e,{mode:t?m.MODE.JS_ITERATE:m.MODE.JS_NO_ITERATE}),i=this.parseAndInferenceExpression(n.ast,{entry:"global.main",validate:!0,inject:{"this":r,"global.main":n.argTypes}}),a=(new p).compile(i,{});return{code:a}},compileVertexShader:function(e,r){var t=m.connectSnippets(e,{mode:m.MODE.GLSL_VS}),n=this.parseAndInferenceExpression(t.ast,{entry:"global.main",validate:!0,inject:{"this":r,"global.main":t.argTypes}}),i={};for(var a in t.inputIndices)i["_env_"+a]=t.inputIndices[a];var s=(new o).compileVertexShader(n,{});return{code:s.source,inputIndices:i}},TYPES:i.TYPES,OBJECT_KINDS:i.OBJECT_KINDS,SOURCES:i.SOURCES,SPACE_VECTOR_TYPES:d,Vec2:i.Vec2,Vec3:i.Vec3,Vec4:i.Vec4,Texture:i.Texture,Color:i.Color,Mat3:i.Mat3,Mat4:i.Mat4,WorkingSet:y,SnippetList:h,SnippetEntry:S,Math:f}),e.version="0.1.0"}(exports);


},{"./analyze/analyze.js":101,"./analyze/parameters.js":104,"./analyze/sanitizer/sanitizer.js":105,"./analyze/typeinference/typeinference.js":124,"./analyze/validator.js":129,"./base/index.js":135,"./contrib/gl-matrix-extend.js":140,"./contrib/gl-matrix.js":141,"./generate/glmatrix/compiler.js":143,"./generate/glsl/compiler.js":145,"./generate/light-pass/light-pass-generator.js":159,"./generate/snippets/snippet-connector":162,"./generate/snippets/snippet-list.js":163,"./generate/space/transform.js":165,"./interfaces.js":168,"./resolve/resolve.js":172,"es6-map/implement":8,"escodegen":75,"esprima":90}],168:[function(require,module,exports){
!function(ns){function isArray(t){return t instanceof Array||t instanceof Float32Array||t instanceof Float64Array||t instanceof Int16Array||t instanceof Int32Array||t instanceof Int8Array}function constructFromMatrix(t,e,n){if(n.length>1)for(var r=0;r<n.length;++r)if(n[r]instanceof Mat3||n[r]instanceof Mat4||n[r]instanceof Array)throw"Constructing Matrix from Matrix can only take one argument";if(n.length<1)return!1;if(1==n.length){var s=n[0],i=0;if(s instanceof Mat3)i=3;else if(s instanceof Mat4)i=4;else{if(!isArray(s))return!1;i=16==s.length?4:3}for(var a=0;e>a;a++)for(var o=0;e>o;o++){var c=a*e+o;if(i>o&&i>a){var u=a*i+o;t[c]=s[u]}else t[c]=o==a?1:0}return!0}}function fillVector(t,e,n){var r=!1;if(0==n.length){for(var s=0;e>s;++s)t[s]=0;return void(r&&(t[3]=1))}if(1==n.length&&!isNaN(n[0])){for(var s=0;e>s;++s)t[s]=n[0];return void(r&&(t[3]=1))}for(var i=0,s=0;e>i&&s<n.length;++s){var a=n[s],o=0;if(isNaN(a))if(a instanceof Vec2)o=2;else if(a instanceof Vec3)o=3;else if(a instanceof Vec4)o=4;else if(a instanceof Mat3)o=9;else if(a instanceof Mat4)o=16;else{if(!(Array.isArray(a)||"object"==typeof a&&"BYTES_PER_ELEMENT"in a))return!1;o=a.length}else o=1;if(1==o)t[i++]=a||0;else for(var c=0;e>i&&o>c;++c)t[i++]=a[c]}if(s<n.length)throw new Error("Too many arguments for "+(r?"Color":"Vec"+e)+".");if(e>i){if(!r||3!=i)throw new Error("Not enough arguments for "+(r?"Color":"Vec"+e)+".");t[3]=1}}function addSwizzles(prototype,vecCount,maskCount,withSetter){for(var max=Math.pow(vecCount,maskCount),i=0;max>i;++i){for(var indices=[],keys=["","",""],val=i,args=[],setterArgs=[],generateSetter=withSetter,j=0;maskCount>j;++j){var idx=val%vecCount;indices.push(idx),generateSetter&&(void 0===setterArgs[idx]?setterArgs[idx]="other["+j+"]":generateSetter=!1);for(var k=0;k<SWIZZLE_KEYS.length;++k)keys[k]+=SWIZZLE_KEYS[k][idx];val=Math.floor(val/vecCount),args.push("this["+idx+"]")}var funcArgs="",body="  return getVec"+maskCount+"("+args.join(", ")+");\n";if(generateSetter){for(var assignSetters=[],j=0;vecCount>j;++j)void 0===setterArgs[j]?assignSetters[j]="this["+j+"]":assignSetters[j]=setterArgs[j];switch(maskCount){case 2:funcArgs="x, y";break;case 3:funcArgs="x, y, z";break;case 4:funcArgs="x, y, z, w"}body="  if(arguments.length == 0)\n  "+body+"  else{\n    var other=getVec"+maskCount+".apply(null, arguments);\n    return getVec"+vecCount+"("+assignSetters.join(", ")+");\n  }\n"}var functionCode="function("+funcArgs+"){\n"+body+"}";try{for(var result=eval("("+functionCode+")"),j=0;j<keys.length;++j)prototype[keys[j]]=result}catch(e){throw console.error("Error Compiling Code:\n"+functionCode),e}generateSetter&&(addSwizzleOperator(prototype,vecCount,maskCount,keys,"Add","+",setterArgs),addSwizzleOperator(prototype,vecCount,maskCount,keys,"Sub","-",setterArgs),addSwizzleOperator(prototype,vecCount,maskCount,keys,"Mul","*",setterArgs),addSwizzleOperator(prototype,vecCount,maskCount,keys,"Div","/",setterArgs))}}function addSwizzleOperator(prototype,vecCount,maskCount,keys,methodName,operator,setterArgs){for(var assignSetters=[],j=0;vecCount>j;++j){var prefix="this["+j+"]";void 0===setterArgs[j]?assignSetters[j]=prefix:assignSetters[j]=prefix+" "+operator+" "+setterArgs[j]}var body="   var other=getVec"+maskCount+".apply(null, arguments);\n   return getVec"+vecCount+"("+assignSetters.join(", ")+");\n",functionCode="function(){\n"+body+"}";try{for(var result=eval("("+functionCode+")"),j=0;j<keys.length;++j)prototype[keys[j]+methodName]=result}catch(e){throw console.error("Error Compiling Code:\n"+functionCode),e}}function getVec2(){if(arguments[0]instanceof Vec2)return arguments[0];var t=new Vec2;return Vec2.apply(t,arguments),t}function getVec3(){if(arguments[0]instanceof Vec3)return arguments[0];var t=new Vec3;return Vec3.apply(t,arguments),t}function getVec4(){if(arguments[0]instanceof Vec4)return arguments[0];var t=new Vec4;return Vec4.apply(t,arguments),t}function getMat3(){if(arguments[0]instanceof Mat3)return arguments[0];var t=new Mat3;return Mat3.apply(t,arguments),t}function getMat4(){if(arguments[0]instanceof Mat4)return arguments[0];var t=new Mat4;return Mat4.apply(t,arguments),t}var Base=require("./base/index.js"),CodeGen=require("escodegen"),VecMath=require("./base/vecmath.js").VecMath,Types=ns.TYPES={ANY:"any",INT:"int",NUMBER:"number",BOOLEAN:"boolean",OBJECT:"object",ARRAY:"array",NULL:"null",UNDEFINED:"undefined",FUNCTION:"function",STRING:"string",INVALID:"invalid"},Kinds=ns.OBJECT_KINDS={ANY:"any",FLOAT2:"float2",FLOAT3:"float3",FLOAT4:"float4",NORMAL:"normal",MATRIX3:"matrix3",MATRIX4:"matrix4",TEXTURE:"texture",COLOR_CLOSURE:"color_closure"},Semantics=ns.SEMANTICS={COLOR:"color",NORMAL:"normal",SCALAR_0_TO_1:"scalar0To1",UNKNOWN:"unknown"},SpaceType=ns.SpaceType={OBJECT:0,VIEW:1,WORLD:2,RESULT:5},VectorType=ns.VectorType={NONE:0,POINT:1,NORMAL:2};ns.SpaceVectorType={OBJECT:SpaceType.OBJECT,VIEW_POINT:SpaceType.VIEW+(VectorType.POINT<<3),WORLD_POINT:SpaceType.WORLD+(VectorType.POINT<<3),VIEW_NORMAL:SpaceType.VIEW+(VectorType.NORMAL<<3),WORLD_NORMAL:SpaceType.WORLD+(VectorType.NORMAL<<3),RESULT_POINT:SpaceType.RESULT+(VectorType.POINT<<3),RESULT_NORMAL:SpaceType.RESULT+(VectorType.NORMAL<<3)},ns.getVectorFromSpaceVector=function(t){return t>>3},ns.getSpaceFromSpaceVector=function(t){return t%8},ns.SOURCES={UNIFORM:"uniform",VERTEX:"vertex",CONSTANT:"constant"},ns.ColorClosures={emissive:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.COLOR}]},diffuse:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.COLOR},{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0}]},phong:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.COLOR},{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0}]},cookTorrance:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.COLOR},{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0}]},ward:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.COLOR},{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0}]},scatter:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.COLOR},{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0}]},reflect:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:1}]},refract:{input:[{type:Types.OBJECT,kind:Kinds.FLOAT3,semantic:Semantics.NORMAL},{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:1},{type:Types.NUMBER,semantic:Semantics.UNKNOWN,defaultValue:1}]},transparent:{input:[{type:Types.NUMBER,semantic:Semantics.SCALAR_0_TO_1,defaultValue:0}]}};var SWIZZLE_KEYS=[["x","y","z","w"],["r","g","b","a"],["s","t","p","q"]],Vec2=function(t,e){fillVector(this,2,arguments)};Vec2.prototype._toFloatArray=function(){for(var t=new Float32Array(2),e=2;e--;)t[e]=this[e];return t},Vec2.prototype.add=function(t,e){var n=getVec2.apply(null,arguments);return new Vec2(this[0]+n[0],this[1]+n[1])},Vec2.prototype.sub=function(t,e){var n=getVec2.apply(null,arguments);return new Vec2(this[0]-n[0],this[1]-n[1])},Vec2.prototype.mul=function(t,e){var n=getVec2.apply(null,arguments);return new Vec2(this[0]*n[0],this[1]*n[1])},Vec2.prototype.div=function(t,e){var n=getVec2.apply(null,arguments);return new Vec2(this[0]/n[0],this[1]/n[1])},Vec2.prototype.mod=function(t,e){var n=getVec2.apply(null,arguments);return new Vec2(this[0]%n[0],this[1]%n[1])},Vec2.prototype.dot=function(t,e){var n=getVec2.apply(null,arguments);return this[0]*n[0]+this[1]*n[1]},Vec2.prototype.abs=function(){return new Vec2(Math.abs(this[0]),Math.abs(this[1]))},Vec2.prototype.length=function(t){return 0==arguments.length?Math.sqrt(this.dot(this)):this.mul(t/this.length())},Vec2.prototype.normalize=function(){return this.length(1)},Vec2.prototype.xy=Vec2.prototype.rg=Vec2.prototype.st=function(t,e){return 0==arguments.length?this:getVec2.apply(null,arguments)},Vec2.prototype.x=Vec2.prototype.r=Vec2.prototype.s=function(t){return 0==arguments.length?this[0]:this.xy(t,this[1])},Vec2.prototype.y=Vec2.prototype.g=Vec2.prototype.t=function(t){return 0==arguments.length?this[1]:this.xy(this[0],t)},addSwizzles(Vec2.prototype,2,2,!0),addSwizzles(Vec2.prototype,2,3,!1),addSwizzles(Vec2.prototype,2,4,!1);var Vec3=function(t,e,n){fillVector(this,3,arguments)};Vec3.prototype._toFloatArray=function(){for(var t=new Float32Array(3),e=3;e--;)t[e]=this[e];return t},Vec3.prototype.add=function(t,e,n){var r=getVec3.apply(null,arguments);return new Vec3(this[0]+r[0],this[1]+r[1],this[2]+r[2])},Vec3.prototype.sub=function(t,e,n){var r=getVec3.apply(null,arguments);return new Vec3(this[0]-r[0],this[1]-r[1],this[2]-r[2])},Vec3.prototype.mul=function(t,e,n){var r=getVec3.apply(null,arguments);return new Vec3(this[0]*r[0],this[1]*r[1],this[2]*r[2])},Vec3.prototype.div=function(t,e,n){var r=getVec3.apply(null,arguments);return new Vec3(this[0]/r[0],this[1]/r[1],this[2]/r[2])},Vec3.prototype.mod=function(t,e,n){var r=getVec3.apply(null,arguments);return new Vec3(this[0]%r[0],this[1]%r[1],this[2]%r[2])},Vec3.prototype.abs=function(){return new Vec3(Math.abs(this[0]),Math.abs(this[1]),Math.abs(this[2]))},Vec3.prototype.dot=function(t,e,n){var r=getVec3.apply(null,arguments);return this[0]*r[0]+this[1]*r[1]+this[2]*r[2]},Vec3.prototype.cross=function(t,e,n){var r=getVec3.apply(null,arguments),t=this[1]*r[2]-r[1]*this[2],e=this[2]*r[0]-r[2]*this[0],n=this[0]*r[1]-r[0]*this[1];return new Vec3(t,e,n)},Vec3.prototype.length=function(t){return 0==arguments.length?Math.sqrt(this.dot(this)):this.mul(t/this.length())},Vec3.prototype.normalize=function(){return this.length(1)},Vec3.prototype.xyz=Vec3.prototype.rgb=Vec3.prototype.stp=function(t,e,n){return 0==arguments.length?this:new Vec3(t,e,n)},Vec3.prototype.x=Vec3.prototype.r=Vec3.prototype.s=function(t){return 0==arguments.length?this[0]:new Vec3(t,this[1],this[2])},Vec3.prototype.y=Vec3.prototype.g=Vec3.prototype.t=function(t){return 0==arguments.length?this[1]:new Vec3(this[0],t,this[2])},Vec3.prototype.z=Vec3.prototype.b=Vec3.prototype.p=function(t){return 0==arguments.length?this[2]:new Vec3(this[0],this[1],t)},addSwizzles(Vec3.prototype,3,2,!0),addSwizzles(Vec3.prototype,3,3,!0),addSwizzles(Vec3.prototype,3,4,!1);var Vec4=function(t,e,n,r){fillVector(this,4,arguments)};Vec4.prototype._toFloatArray=function(){for(var t=new Float32Array(4),e=4;e--;)t[e]=this[e];return t},Vec4.prototype.add=function(t,e,n,r){var s=getVec4.apply(null,arguments);return new Vec4(this[0]+s[0],this[1]+s[1],this[2]+s[2],this[3]+s[3])},Vec4.prototype.sub=function(t,e,n,r){var s=getVec4.apply(null,arguments);return new Vec4(this[0]-s[0],this[1]-s[1],this[2]-s[2],this[3]-s[3])},Vec4.prototype.mul=function(t,e,n,r){var s=getVec4.apply(null,arguments);return new Vec4(this[0]*s[0],this[1]*s[1],this[2]*s[2],this[3]*s[3])},Vec4.prototype.div=function(t,e,n,r){var s=getVec4.apply(null,arguments);return new Vec4(this[0]/s[0],this[1]/s[1],this[2]/s[2],this[3]/s[3])},Vec4.prototype.mod=function(t,e,n,r){var s=getVec4.apply(null,arguments);return new Vec4(this[0]%s[0],this[1]%s[1],this[2]%s[2],this[3]%s[3])},Vec4.prototype.abs=function(){return new Vec4(Math.abs(this[0]),Math.abs(this[1]),Math.abs(this[2]),Math.abs(this[3]))},Vec4.prototype.dot=function(t,e,n,r){var s=getVec4.apply(null,arguments);return this[0]*s[0]+this[1]*s[1]+this[2]*s[2]+this[3]*s[3]},Vec4.prototype.length=function(t){return 0==arguments.length?Math.sqrt(this.dot(this)):this.mul(t/this.length())},Vec4.prototype.normalize=function(){return this.length(1)},Vec4.prototype.xyzw=Vec4.prototype.rgba=Vec4.prototype.stpq=function(t,e,n,r){return 0==arguments.length?this:getVec4.apply(null,arguments)},Vec4.prototype.x=Vec4.prototype.r=Vec4.prototype.s=function(t){return 0==arguments.length?this[0]:getVec4(t,this[1],this[2],this[3])},Vec4.prototype.y=Vec4.prototype.g=Vec4.prototype.t=function(t){return 0==arguments.length?this[1]:getVec4(this[0],t,this[2],this[3])},Vec4.prototype.z=Vec4.prototype.b=Vec4.prototype.p=function(t){return 0==arguments.length?this[2]:getVec4(this[0],this[1],t,this[3])},Vec4.prototype.w=Vec4.prototype.a=Vec4.prototype.q=function(t){return 0==arguments.length?this[3]:getVec4(this[0],this[1],this[2],t)},addSwizzles(Vec4.prototype,4,2,!0),addSwizzles(Vec4.prototype,4,3,!0),addSwizzles(Vec4.prototype,4,4,!0);var Color=Vec4,Mat3=function(t,e,n,r,s,i,a,o,c){constructFromMatrix(this,3,arguments)||fillVector(this,9,arguments)};Mat3.prototype._toFloatArray=function(){for(var t=new Float32Array(9),e=9;e--;)t[e]=this[e];return t},Mat3.prototype.add=function(t,e,n,r,s,i,a,o,c){var u=getMat3.apply(null,arguments);return new Mat3(this[0]+u[0],this[1]+u[1],this[2]+u[2],this[3]+u[3],this[4]+u[4],this[5]+u[5],this[6]+u[6],this[7]+u[7],this[8]+u[8])},Mat3.prototype.sub=function(t,e,n,r,s,i,a,o,c){var u=getMat3.apply(null,arguments);return new Mat3(this[0]-u[0],this[1]-u[1],this[2]-u[2],this[3]-u[3],this[4]-u[4],this[5]-u[5],this[6]-u[6],this[7]-u[7],this[8]-u[8])},Mat3.prototype.mul=function(t,e,n,r,s,i,a,o,c){return getMat3.apply(null,arguments),null},Mat3.prototype.div=function(t,e,n,r,s,i,a,o,c){var u=getMat3.apply(null,arguments);return new Mat3(this[0]/u[0],this[1]/u[1],this[2]/u[2],this[3]/u[3],this[4]/u[4],this[5]/u[5],this[6]/u[6],this[7]/u[7],this[8]/u[8])},Mat3.prototype.col=function(t,e,n,r){if(1==arguments.length)return new Vec3(this[3*t+0],this[3*t+1],this[3*t+2]);var s=getVec3.apply(null,Array.prototype.slice.call(arguments,1)),i=new Mat3(this);i[3*t+0]=s[0],i[3*t+1]=s[1],i[3*t+2]=s[2]},Mat3.prototype.mulVec=function(t,e,n){var r=getVec3.apply(null,arguments);return new Vec3(r.dot(this[0],this[1],this[2]),r.dot(this[3],this[4],this[5]),r.dot(this[6],this[7],this[8]))};var Mat4=function(t,e,n,r,s,i,a,o,c,u,p,h,l,y,g,f){constructFromMatrix(this,4,arguments)||fillVector(this,16,arguments)};Mat4.prototype._toFloatArray=function(){for(var t=new Float32Array(16),e=16;e--;)t[e]=this[e];return t},Mat4.prototype.add=function(t,e,n,r,s,i,a,o,c,u,p,h,l,y,g,f){var V=getMat4.apply(null,arguments);return new Mat3(this[0]+V[0],this[1]+V[1],this[2]+V[2],this[3]+V[3],this[4]+V[4],this[5]+V[5],this[6]+V[6],this[7]+V[7],this[8]+V[8],this[9]+V[9],this[10]+V[10],this[11]+V[11],this[12]+V[12],this[13]+V[13],this[14]+V[14],this[15]+V[15])},Mat4.prototype.sub=function(t,e,n,r,s,i,a,o,c,u,p,h,l,y,g,f){var V=getMat4.apply(null,arguments);return new Mat3(this[0]-V[0],this[1]-V[1],this[2]-V[2],this[3]-V[3],this[4]-V[4],this[5]-V[5],this[6]-V[6],this[7]-V[7],this[8]-V[8],this[9]-V[9],this[10]-V[10],this[11]-V[11],this[12]-V[12],this[13]-V[13],this[14]-V[14],this[15]-V[15])},Mat4.prototype.mul=function(t,e,n,r,s,i,a,o,c,u,p,h,l,y,g,f){return getMat4.apply(null,arguments),null},Mat4.prototype.div=function(t,e,n,r,s,i,a,o,c,u,p,h,l,y,g,f){var V=getMat4.apply(null,arguments);return new Mat3(this[0]/V[0],this[1]/V[1],this[2]/V[2],this[3]/V[3],this[4]/V[4],this[5]/V[5],this[6]/V[6],this[7]/V[7],this[8]/V[8],this[9]/V[9],this[10]/V[10],this[11]/V[11],this[12]/V[12],this[13]/V[13],this[14]/V[14],this[15]/V[15])},Mat4.prototype.col=function(t,e,n,r,s){if(1==arguments.length)return new Vec4(this[4*t+0],this[4*t+1],this[4*t+2],this[4*t+3]);var i=getVec4.apply(null,Array.prototype.slice.call(arguments,1)),a=new Mat4(this);a[4*t+0]=i[0],a[4*t+1]=i[1],a[4*t+2]=i[2],a[4*t+3]=i[3]},Mat4.prototype.mulVec=function(t,e,n,r){var s=getVec4.apply(null,arguments);return new Vec4(s.dot(this[0],this[1],this[2],this[3]),s.dot(this[4],this[5],this[6],this[7]),s.dot(this[8],this[9],this[10],this[11]),s.dot(this[12],this[13],this[14],this[15]))};var Texture=function(t){this.image=t};Texture.prototype.sample2D=function(t,e){return new Vec4(0,0,0,0)};var Shade={};Math.clamp=function(t,e,n){return Math.min(Math.max(t,e),n)},Math.smoothstep=function(t,e,n){var r=Math.clamp((n-t)/(e-t),0,1);return r*r*(3-2*r)},Math.step=function(t,e){return t>e?0:1},Math.fract=function(t){return t-Math.floor(t)},Math.mix=function(t,e,n){var r="number"==typeof t,s="number"==typeof n;return r&&s?t*(1-n)+e*n:s?t.mul(1-n).add(e.mul(n)):t.mul(n.mul(-1).add(1)).add(e.mul(n))},Math.saturate=function(t){return Math.clamp(t,0,1)},ns.throwError=function(t,e){var n=t&&t.loc;n&&n.start.line&&(e="Line "+n.start.line+": "+e),e+=": "+CodeGen.generate(t);var r=new Error(e);throw r.loc=n,r},ns.toJavaScript=function(t){return CodeGen.generate(t)},ns.Vec2=Vec2,ns.Vec3=Vec3,ns.Vec4=Vec4,ns.Mat3=Mat3,ns.Mat4=Mat4,ns.Color=Color,ns.Shade=Shade,ns.VecMath=VecMath}(exports);


},{"./base/index.js":135,"./base/vecmath.js":139,"escodegen":75}],169:[function(require,module,exports){
(function (ns) {

    var Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../interfaces.js"),
        ANNO = require("./../base/annotation.js").ANNO;

    function handleCallExpression(node) {
        var callee = ANNO(node.callee);
        // console.log("Call", node.callee.property, callee.getTypeString(), node.callee.object)
        if(callee.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            ANNO(node).copy(callee);
        }
    }

    function handleMemberExpression(node) {
        var object = ANNO(node.object);
        var result = ANNO(node);
        if (node.object.name == "Shade" || object.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            var closureName = node.property.name;
            if (!Shade.ColorClosures.hasOwnProperty(closureName)) {
                return;
            };
            result.setType(Shade.TYPES.OBJECT, Shade.OBJECT_KINDS.COLOR_CLOSURE);
        }
    }

    ns.markColorClosures = function(programAast){
        Traversal.traverse(programAast, {
            leave: function(node, parent){
                 switch (node.type) {
                    case Syntax.CallExpression:
                        return handleCallExpression(node);
                    case Syntax.MemberExpression:
                        return handleMemberExpression(node);
                }
            }
        });
    }

}(exports));

},{"../interfaces.js":168,"./../base/annotation.js":130,"esprima":90,"estraverse":91}],170:[function(require,module,exports){
/**
 * Simple replacer that collects all closure calls of a color closure expression and passes them to the
 * provided callback
 * @type {exports}
 */

var Traversal = require('estraverse');
var ANNO = require("../base/annotation.js").ANNO;
var Shade = require("../interfaces.js");

var Syntax = Traversal.Syntax;

function isColorClosure(node) {
    if (node.type !== Syntax.CallExpression) {
        return false;
    }
    return ANNO(node).isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE);
}

function handleCallExpression(node, colorClosureList) {
    var callee = ANNO(node.callee);
    // console.log("Call", node.callee.property, callee.getTypeString(), node.callee.object)
    if (callee.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
        colorClosureList.push({name: node.callee.property.name, args: node.arguments});
    }
}

function getClosureList(closureExpression) {
    // console.log(JSON.stringify(closureExpression, null, " "))
    var colorClosureList = [];
    Traversal.traverse(closureExpression, {
        leave: function (node) {
            if (node.type == Syntax.CallExpression) {
                return handleCallExpression(node, colorClosureList);
            }
        }
    });
    colorClosureList.sort(function (a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    });
    return colorClosureList;
}

function handleColorClosure(closureExpression, replacer) {
    var list = getClosureList(closureExpression);
    return replacer(list);
}

var replace = function (ast, replacer) {
    return Traversal.replace(ast, {
        enter: function (node) {
            if (isColorClosure(node)) {
                this.skip();
                return handleColorClosure(node, replacer)
            }
        }
    });
};


module.exports = replace;

},{"../base/annotation.js":130,"../interfaces.js":168,"estraverse":91}],171:[function(require,module,exports){
(function (ns) {

    var Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima');

    var Shade = require("../interfaces.js"),
    SpaceVectorType = Shade.SpaceVectorType,
    Types = Shade.TYPES,
    Kinds = Shade.OBJECT_KINDS;

    ns.getDefaultValue = function(ccInputDefinition){
        if(ccInputDefinition.defaultValue == undefined)
            throw new Error("ColorClosure input has not default value!");

        if(ccInputDefinition.type == Types.NUMBER || ccInputDefinition.type == Types.INT){
            var result = {
                type: Syntax.Literal,
                value: ccInputDefinition.defaultValue
            }
            return result;
        }
        else{
            throw new Error("Currentlty don't support default values of type " + ccInputDefinition.type + " and kind " + ccInputDefinition.kind);
        }
    }

}(exports));

},{"../interfaces.js":168,"esprima":90,"estraverse":91}],172:[function(require,module,exports){
var assert = require("assert");
var ColorClosureMarker = require("./colorclosure-marker.js");

var c_implementations = {};

var registerLightingImplementation = function (name, obj) {
    c_implementations[name] = obj;
};

var resolveClosuresPreTypeInference = function (aast, implementationName, processingData, opt) {
    if (!implementationName) {
        return aast;
    }
    try {
        var resolverImpl = c_implementations[implementationName];
        assert(resolverImpl, "Implementation not found: " + implementationName);
        if (resolverImpl.resolvePreTypeInference) {
            ColorClosureMarker.markColorClosures(aast);
            return resolverImpl.resolvePreTypeInference(aast, processingData, opt);
        } else
            return aast;
    } catch (e) {
        console.error(e);
    }
    return aast;
};

var resolveClosuresPostTypeInference = function (aast, implementationName, processingData, opt) {
    if (!implementationName) {
        return aast;
    }
    try {
        var resolverImpl = c_implementations[implementationName];
        if (resolverImpl.resolvePostTypeInference)
            return resolverImpl.resolvePostTypeInference(aast, processingData, opt); else
            return aast;
    } catch (e) {
        console.error(e);
    }
    return aast;
};

registerLightingImplementation("xml3d-glsl-forward", require("./xml3d-glsl-forward"));
registerLightingImplementation("xml3d-glsl-deferred", require("./xml3d-glsl-deferred"));

module.exports = {
  registerLightingImplementation: registerLightingImplementation,
  resolveClosuresPreTypeInference: resolveClosuresPreTypeInference,
  resolveClosuresPostTypeInference: resolveClosuresPostTypeInference
};

},{"./colorclosure-marker.js":169,"./xml3d-glsl-deferred":174,"./xml3d-glsl-forward":176,"assert":92}],173:[function(require,module,exports){
(function (ns) {

    var Base = require("../../base/index.js"),
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        ANNO = require("./../../base/annotation.js").ANNO,
        DeferredInfo = require("./xml3d-deferred.js");

    var Shade = require("../../interfaces.js"),
        SpaceVectorType = Shade.SpaceVectorType,
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;

    var SpaceTransformTools = require("../../generate/space/space-transform-tools.js"),
        ColorClosureTools = require("../colorclosure-tools.js");

    var ADD_POSITION_TO_ARGS = true;

    var ArgStorageType = ns.ArgStorageType = {
        FLOAT : 'float',
        FLOAT_BYTE: 'floatByte',
        FLOAT_UBYTE: 'floatUByte',
        FLOAT2: 'float2',
        FLOAT3: 'float3',
        FLOAT3_NORMAL: 'float3Normal',
        FLOAT4: 'float4'
    }

    var AMBIENT_DEFINITION = {type: Types.NUMBER, semantic: Shade.SEMANTICS.SCALAR_0_TO_1, defaultValue: 0 };


    ns.ColorClosureSignature = function(){
        this.id = 0;
        this.textureCount = 0;
        this.args = [];
        this.colorClosures = [];
    };
    Base.extend(ns.ColorClosureSignature.prototype, {
        construct: function(returnAast, scope){
            var closureInfo = collectClosureInfo(returnAast);
            var argAast = gatherClosureArgs(this, closureInfo, scope);
            var textures = allocateArgumentsToTextures(this);
            this.id = getSignatureId(this);
            argAast[0].value = this.id; // Set ID for shader id assignment
            return generateAast(textures, argAast);
        }
    });

    // Basic ColorClosureSignature Createion

    function addColorClosure(ccSig, colorClosureName, argIndices, envIndices){
        ccSig.colorClosures.push({
            name: colorClosureName,
            argIndices: argIndices,
            envIndices: envIndices
        });
    }

    function addArgument(ccSig, type, kind, storeType){
        var id = ccSig.args.length;
        ccSig.args.push({
            id: id,
            type: type,
            kind: kind,
            storeType: storeType,
            texIdx: undefined,
            componentIdx: undefined,
            bitIdx: undefined
        });
        return id;
    }

    // Argument Collection

    function collectClosureInfo(returnAast){
        var result = [];
        Traversal.traverse(returnAast, {
                leave: function(node, parent){
                    switch (node.type) {
                        case Syntax.CallExpression:
                            if(node.callee.type == Syntax.MemberExpression
                               && ANNO(node.callee.object).isOfKind(Kinds.COLOR_CLOSURE))
                            {
                                result.push({
                                    name: node.callee.property.name,
                                    args: node.arguments
                                });
                            }
                    }
                }
            });
        result.sort(function(a,b){return a.name < b.name ? -1 : a.name > b.name ? 1 : 0});
        return result;
    }

    function gatherClosureArgs(ccSig, closureInfo, scope){
        var argCache = {}, argAast = [];

        // Add argument for signature id;
        getCachedArgument(ccSig, {type: Types.INT}, {type: "Literal", value: "ID_UNSPECIFIED"}, argCache, argAast);
        if(ADD_POSITION_TO_ARGS)
            addPositionArgument(ccSig, argCache, argAast);
        var ambientValue = { type: Syntax.LogicalExpression, operator : "||",
                        left: getEnvAccess("ambientIntensity", AMBIENT_DEFINITION),
                        right: ColorClosureTools.getDefaultValue(AMBIENT_DEFINITION) };

        getCachedArgument(ccSig, AMBIENT_DEFINITION, ambientValue, argCache, argAast);

        for(var i = 0; i < closureInfo.length; ++i){
            var cInfo = closureInfo[i];
            var closureDefinition = Shade.ColorClosures[cInfo.name];
            if(!closureDefinition)
                throw new Error("Unknown Color closure '" + cInfo.name + "'");
            var argIndices = [], value;
            for(var j = 0; j < closureDefinition.input.length; ++j){
                var inputDefinition = closureDefinition.input[j];
                if(j < cInfo.args.length)
                    value = cInfo.args[j];
                else
                    value = ColorClosureTools.getDefaultValue(inputDefinition);
                var space = DeferredInfo[cInfo.name] && DeferredInfo[cInfo.name].inputSpaces[j];
                argIndices.push(getCachedArgument(ccSig, inputDefinition, value, argCache, argAast, space));
            }
            var envIndices = {};
            for(var property in closureDefinition.env){
                var envDefinition = closureDefinition.env[property];
                // TODO: Determine if env property is undefined and use defaultValue in this case;
                value = { type: Syntax.LogicalExpression, operator : "||",
                        left: getEnvAccess(property, envDefinition),
                        right: ColorClosureTools.getDefaultValue(envDefinition) };
                envIndices[property] = getCachedArgument(ccSig, envDefinition, value, argCache, argAast);
            }
            addColorClosure(ccSig, cInfo.name, argIndices, envIndices);
       }
       return argAast;
    }

    function addPositionArgument(ccSig, argCache, argAast){
        var positionLookup = { type: Syntax.MemberExpression,
            object: { type: Syntax.Identifier, name: "_env"},
            property: { type: Syntax.Identifier, name: "position"}
        }
        // ANNO(positionLookup).setType(Types.OBJECT, Kinds.FLOAT3);
        // ANNO(positionLookup.object).setType(Types.OBJECT, Kinds.ANY);
        // ANNO(positionLookup.object).setGlobal(true);
        getCachedArgument(ccSig, {type: Types.OBJECT, kind: Kinds.FLOAT3}, positionLookup, argCache, argAast,
            SpaceVectorType.VIEW_POINT);
    }

    function getCachedArgument(ccSig, inputDefinition, inputAast, argCache, argAast, space){
        space = space || SpaceVectorType.OBJECT;
        inputAast = space ? SpaceTransformTools.getSpaceTransformCall(inputAast, space) : inputAast;
        var keyAast = Base.deepExtend({}, inputAast);
        cleanAast(keyAast);
        var storageType = getStorageType(inputDefinition);
        var key = storageType + ";" + JSON.stringify(keyAast);
        if(argCache[key] === undefined){
            var argId = addArgument(ccSig, inputDefinition.type, inputDefinition.kind, storageType);
            argCache[key] = argId;
            argAast.push(inputAast);
        }
        return argCache[key];
    }
    /* Remove all range properties from the aast */
    function cleanAast(aast){
        for(var i in aast){
            if(i == "range" || i == "loc"){
                delete aast[i];
            }
            else if(typeof aast[i] == "object"){
                cleanAast(aast[i]);
            }
        }
    }

    function getStorageType(closureInputType){
        if(closureInputType.type == Types.NUMBER || closureInputType.type == Types.INT){
            return ArgStorageType.FLOAT;
        }
        else if(closureInputType.type == Types.OBJECT){
            switch(closureInputType.kind){
                case Kinds.FLOAT2: return ArgStorageType.FLOAT2;
                case Kinds.FLOAT3: return ArgStorageType.FLOAT3;
                case Kinds.FLOAT4: return ArgStorageType.FLOAT4;
                default:
                    throw new Error("Deferred input of this kind not supported: " + closureInputType.kind);
            };
        }
        else{
            throw new Error("Deferred input of this type not supported: " + closureInputType.type);
        }
    }

    function getEnvAccess(property, definition){
        var result = {
            type: Syntax.MemberExpression,
            object: {type: Syntax.Identifier, name: "_env" },
            property: {type: Syntax.Identifier, name: property }
        }
        // ANNO(result).setType(definition.type, definition.kind);
        // var objAnno = ANNO(result.object);
        // objAnno.setType(Types.OBJECT, Kinds.ANY);
        // objAnno.setGlobal(true);
        return result;
    }


    // Argument Allocation


    function allocateArgumentsToTextures(ccSig){
        var argCopy = ccSig.args.slice( ADD_POSITION_TO_ARGS ? 3 : 2);
        argCopy.sort(function(a, b){
            return getStorageSize(a.storeType) - getStorageSize(b.storeType);
        });
        argCopy.push(ccSig.args[ADD_POSITION_TO_ARGS ? 2 : 1]); // Ambient comes third.
        if(ADD_POSITION_TO_ARGS)
            argCopy.push(ccSig.args[1]); // POSITION comes second.
        argCopy.push(ccSig.args[0]); // ID argument always comes first (and thus: last in this array)
        var textures = [];
        var i = argCopy.length;
        while(i--){
            var arg = argCopy[i];
            assignTextureSlot(arg, textures);
        }
        ccSig.textureCount = textures.length;
        return textures;
    }
    function assignTextureSlot(arg, textures){
        var size = getStorageSize(arg.storeType);
        for(var i = 0; i < textures.length; i++){
            var tex = textures[i];
            if(size < 32){
                throw new Error("We currently don't support storing of values smaller than 32 bit");
            }
            else if(tex.usedComponents + size / 32 <= 4){
                arg.texIdx = i;
                arg.componentIdx = tex.usedComponents;
                arg.bitIdx = 0;
                tex.usedComponents += size / 32;
                tex.usedBits = 0;
                tex.storedArgs.push(arg);
                return;
            }
        }
        arg.texIdx = textures.length;
        arg.componentIdx = 0;
        arg.bitIdx = 0;
        if(size < 32){
            throw new Error("We currently don't support storing of values smaller than 32 bit");
        }
        else{
            textures.push({
                usedComponents: size / 32,
                usedBits: 0,
                storedArgs: [arg]
            });
        }
    }

    function getStorageSize(storeType){
        switch(storeType){
            case ArgStorageType.FLOAT: return 32;
            case ArgStorageType.FLOAT_BYTE: return 8;
            case ArgStorageType.FLOAT_UBYTE: return 8;
            case ArgStorageType.FLOAT2: return 64;
            case ArgStorageType.FLOAT3: return 96;
            case ArgStorageType.FLOAT3_NORMAL: return 24;
            case ArgStorageType.FLOAT4: return 128;
        }
    }

    // Get ColorClosureSignature ID

    var c_SignatureNextId = 0;
    var c_SignatureIDCache = {};

    ns.ColorClosureSignature.clearIdCache = function(){
        c_SignatureNextId = 0;
        c_SignatureIDCache = {};
    }

    function getSignatureId(ccSig){
        var key = "";
        for(var i = 0; i < ccSig.args.length; ++i){
            var arg = ccSig.args[i];
            key += getArgumentKey(arg) + ";"
        }
        for(i = 0; i < ccSig.colorClosures.length; ++i){
            var closure = ccSig.colorClosures[i];
            key += closure.name + "," + closure.argIndices.join(",");
            for(var prop in closure.envIndices){
                key += "," + prop + ">" + closure.envIndices[i];
            }
        }
        if(c_SignatureIDCache[key] === undefined){
            c_SignatureIDCache[key] = c_SignatureNextId;
            c_SignatureNextId++;
        }
        return c_SignatureIDCache[key];
    }

    function getArgumentKey(arg){
        return arg.type + "," + arg.kind + "," + arg.storeType + "," + arg.texIdx + ","
            + arg.componentIdx + "," + arg.bitIdx;
    }

    // Aast generation

    function generateAast(textures, argAast){
        var arrayExpression = { type: Syntax.ArrayExpression, elements: []};
        for(var i = 0; i < textures.length; ++i){
            var vectorExpression = generateVectorAast(textures[i], argAast);
            arrayExpression.elements.push(vectorExpression);
        }
        // ANNO(arrayExpression).setType(Types.ARRAY);

        var returnStatement = {type: Syntax.ReturnStatement, argument: arrayExpression};
        return returnStatement;
    }

    function generateVectorAast(texture, argAast){
        var vecArgs = [];
        for(var i = 0; i < texture.storedArgs.length; ++i){
            var arg = texture.storedArgs[i];
            var size = getStorageSize(arg.storeType);
            if(size < 32){
                throw new Error("We currently don't support storing of values smaller than 32 bit");
            }
            else{
                vecArgs.push(argAast[arg.id]);
            }
        }
        for(i = texture.usedComponents; i < 4; ++i){
            var zeroLiteral = { type: Syntax.Literal, value: "0" };
            // ANNO(zeroLiteral).setType(Types.INT);
            vecArgs.push(zeroLiteral);
        }
        var result = { type: Syntax.NewExpression, callee: { type: Syntax.Identifier, name: "Vec4"}, arguments: vecArgs};
        // ANNO(result).setType(Types.OBJECT, Kinds.FLOAT4);
        return result;
    }


}(exports));

},{"../../base/index.js":135,"../../generate/space/space-transform-tools.js":164,"../../interfaces.js":168,"../colorclosure-tools.js":171,"./../../base/annotation.js":130,"./xml3d-deferred.js":175,"estraverse":91}],174:[function(require,module,exports){
(function (ns) {

    var Closures = require("./xml3d-deferred.js"),
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../../interfaces.js"),
        ANNO = require("./../../base/annotation.js").ANNO,
        sanitizer = require("./../../analyze/sanitizer/sanitizer.js"),
        ColorClosureSignature = require("./color-closure-signature.js").ColorClosureSignature;


    ns.resolvePreTypeInference = function (aast, processData, opt) {
        var state = {
            colorClosureSignatures: [],
            inMain: false
        };
        var globalScrope = aast.scope;
        aast = Traversal.replace(aast, {
            enter: function(node, parent){
                switch(node.type){
                    case Syntax.FunctionDeclaration:
                        // TODO: Properly determine if we are in main function
                        if(node.id.name == "shade")
                            state.inMain = true;
                        else
                            this.skip();
                        break;
                }
            },
            leave: function(node, parent){
                switch(node.type){
                    case Syntax.FunctionDeclaration:
                        // TODO: Properly determine if we are in main function
                        if(node.id.name == "shade")
                            state.inMain = false;
                        break;
                    case Syntax.ReturnStatement:
                        if(state.inMain){
                            var signature = new ColorClosureSignature();
                            var replacement = signature.construct(node, globalScrope);
                            state.colorClosureSignatures.push(signature);
                            return replacement;
                        }
                }
            }
        })

        processData['colorClosureSignatures'] = state.colorClosureSignatures;

        return aast;
    }

}(exports));

},{"../../interfaces.js":168,"./../../analyze/sanitizer/sanitizer.js":105,"./../../base/annotation.js":130,"./color-closure-signature.js":173,"./xml3d-deferred.js":175,"esprima":90,"estraverse":91}],175:[function(require,module,exports){
(function (ns) {

        var Shade = require("../../interfaces.js"),
            SpaceVectorType = Shade.SpaceVectorType;

        ns.emissive = {
            inputSpaces: [
                SpaceVectorType.OBJECT
            ]
        }

        ns.diffuse = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.phong = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.cookTorrance = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT,
                SpaceVectorType.OBJECT
            ]
        }

        ns.ward = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT,
                SpaceVectorType.OBJECT
            ]
        }

        ns.scatter = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.reflect = {
            inputSpaces: [
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.refract = {
            inputSpaces: [
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT,
                SpaceVectorType.OBJECT
            ]
        }

}(exports));

},{"../../interfaces.js":168}],176:[function(require,module,exports){
(function (ns) {

    var assert = require("assert");
    var ClosuresImpl = require("./xml3d-forward.js"),
        LightLoop = require("./light-loop.js").LightLoop,
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../../interfaces.js"),
        ANNO = require("./../../base/annotation.js").ANNO,
        sanitizer = require("./../../analyze/sanitizer/sanitizer.js");
    var replacer = require("../colorclosure-replacer.js");

    var SpaceTransformTools = require("../../generate/space/space-transform-tools.js"),
        ColorClosureTools = require("../colorclosure-tools.js");



    function containsClosure(arr, name) {
        return arr.some(function (func) {
            return func.id.name == name;
        });
    }

    function getInjectAddition(destName, functionName, inputPre, ccName, colorClosureIndex ){
        var args = [];
        for(var i = 0; i < inputPre.length; ++i){
            args.push({ type: Syntax.Identifier, name: inputPre[i]});
        }
        var inputsCnt = Shade.ColorClosures[ccName].input.length;
        for(var i = 0; i < inputsCnt; ++i){
            args.push({ type: Syntax.Identifier, name: getColorClosureInputArg(colorClosureIndex, i)});
        }
        return {
            type: Syntax.ExpressionStatement,
            expression: { type: Syntax.AssignmentExpression,
                operator: "=",
                left: { type: Syntax.Identifier, name: destName},
                right: { type: Syntax.CallExpression,
                    callee: { type: Syntax.MemberExpression,
                        object: {type: Syntax.Identifier, name: destName},
                        property: {type: Syntax.Identifier, name: "add"}
                    },
                    arguments: [{ type: Syntax.CallExpression,
                        callee: {type: Syntax.Identifier, name: functionName},
                        arguments: args
                    }]
              }}
        };
    }

    function getColorClosureInject(ccName, functionMember, state){
        if(!ClosuresImpl[ccName])
            console.error("No implementation available for ColorClosure '" + ccName + "'" );
        if(!ClosuresImpl[ccName][functionMember])
            return null;
        var functionName = ccName + "_" + functionMember;
        if (!containsClosure(state.newFunctions, functionName)){
            var closureImplementation = ClosuresImpl[ccName][functionMember];
            try {
                var closureAST = parser.parse(closureImplementation.toString(), { raw: true });
                closureAST = sanitizer.sanitize(closureAST);
                closureAST.body[0].id.name = functionName;
                state.newFunctions.push(closureAST.body[0]);
            } catch (e) {
                console.error("Error in analysis of closure '", ccName + ">" + functionMember, "'", e);
                return;
            }
        }
        return functionName;
    }


    function injectBrdfEntry(ccNames, state){
        var result = {
            type: Syntax.BlockStatement,
            body: []
        };
        for(var i = 0; i < ccNames.length; ++i){
            var fName, ccName = ccNames[i];
            if(fName = getColorClosureInject(ccName, "getDiffuse", state)){
                result.body.push(getInjectAddition("kd", fName, ["L", "V"], ccName, i));
            }
            if(fName = getColorClosureInject(ccName, "getSpecular", state)){
                result.body.push(getInjectAddition("ks", fName, ["L", "V"], ccName, i));
            }
        }
        return result;
    }

    function injectAmbientEntry(ccNames, state){
        var result = {
            type: Syntax.BlockStatement,
            body: []
        };
        for(var i = 0; i < ccNames.length; ++i){
            var fName, ccName = ccNames[i];
            if(fName = getColorClosureInject(ccName, "getAmbient", state)){
                result.body.push(getInjectAddition("ambientColor", fName, ["ambientIntensity"], ccName, i));
            }
        }
        return result;
    }

    function injectEmissiveEntry(ccNames, state) {
        var result = {
            type: Syntax.BlockStatement,
            body: []
        };
        for(var i = 0; i < ccNames.length; ++i){
            var fName, ccName = ccNames[i];
            if(fName = getColorClosureInject(ccName, "getEmissive", state)){
                result.body.push(getInjectAddition("emissiveColor", fName, [], ccName, i));
            }
        }
        return result;
    }

    function injectRefractReflectEntry(ccNames, state){
        var result = {
            type: Syntax.BlockStatement,
            body: []
        };
        for(var i = 0; i < ccNames.length; ++i){
            var fName, ccName = ccNames[i];
            if(fName = getColorClosureInject(ccName, "getRefract", state)){
                result.body.push(getInjectAddition("refractColor", fName, ["position"], ccName, i));
            }
            if(fName = getColorClosureInject(ccName, "getReflect", state)){
                result.body.push(getInjectAddition("reflectColor", fName, ["position"], ccName, i));
            }
        }
        return result;
    }

    function injectTransparency(ccNames, state) {
        var result = {
            type: Syntax.BlockStatement,
            body: []
        };
        state.isTransparent = true;
        for(var i = 0; i < ccNames.length; ++i){
            var fName, ccName = ccNames[i];
            if(fName = getColorClosureInject(ccName, "getTransparency", state)) {
                result.body.push(getInjectAddition("transparency", fName, ["position"], ccName, i));
            }
        }
        // if no transparency closure force opaque
        if (result.body.length === 0) {
            result.body.push({
                type: Syntax.ExpressionStatement,
                expression: {
                    type: Syntax.AssignmentExpression,
                    operator: "=",
                    left: {type: Syntax.Identifier, name: "transparency"},
                    right: {type: Syntax.Identifier, name: "opaque"}
                }
            });
            state.isTransparent = false;
        }

        return result;
    }

    function injectColorClosureCalls(lightLoopFunction, ccNames, state){
        var result = Traversal.replace(lightLoopFunction.body, {
            enter: function(node, parent){
                if(node.type == Syntax.ExpressionStatement && node.expression.type == Syntax.Literal){
                    switch(node.expression.value){
                        case "BRDF_ENTRY": return injectBrdfEntry(ccNames, state);
                        case "AMBIENT_ENTRY": return injectAmbientEntry(ccNames, state);
                        case "EMISSIVE_ENTRY": return injectEmissiveEntry(ccNames, state);
                        case "REFRACT_REFLECT_ENTRY": return injectRefractReflectEntry(ccNames, state);
                        case "TRANSPARENCY": return injectTransparency(ccNames, state);
                    };

                }
            }
        });
        return result;
    }

    function getColorClosureInputArg(ccIndex, inputIndex){
        return "_cc" + ccIndex + "Input" + inputIndex;
    }

    function createLightLoopFunction(lightLoopFunctionName, ccNames, state){
        try {
            var lightLoopAst = parser.parse(LightLoop.toString(), { raw: true });
        } catch (e) {
            console.error("Error in analysis of the lightLoop", e);
            return;
        }
        var functionAast = lightLoopAst.body[0];
        functionAast.id.name = lightLoopFunctionName;

        for(var i = 0; i < ccNames.length; ++i){
            var ccName = ccNames[i];
            var ccInput = Shade.ColorClosures[ccName].input;
            for(var j = 0; j < ccInput.length; ++j){
                functionAast.params.push({
                    type: Syntax.Identifier,
                    name: getColorClosureInputArg(i,j)
                });
            }
        }
        injectColorClosureCalls(functionAast, ccNames, state);

        lightLoopAst = sanitizer.sanitize(lightLoopAst);
        return lightLoopAst.body[0];
    }

    function getLightLoopFunction(colorClosureList, state){
        var ccNames = [];
        for(var i = 0; i < colorClosureList.length; ++i)
            ccNames.push(colorClosureList[i].name);
        var lightLoopFunctionName = "lightLoop_" + ccNames.join("_");
        if (!containsClosure(state.newFunctions, lightLoopFunctionName)){
            state.newFunctions.push(createLightLoopFunction(lightLoopFunctionName, ccNames, state));
        }
        return lightLoopFunctionName;
    }



    function generateLightLoopCall(lightLoopFunction, colorClosureList, state){
        var args = [];

        var posArg = state.positionArg;
        if(!state.noSpaceTransform)
            posArg = SpaceTransformTools.getSpaceTransformCall(posArg, Shade.SpaceVectorType.VIEW_POINT);
        args.push(posArg)
        args.push(state.ambientArg);
        for(var i = 0; i < colorClosureList.length; ++i){
            var ccEntry = colorClosureList[i];
            var ccInput = Shade.ColorClosures[ccEntry.name].input;
            for(var j = 0; j < ccInput.length; ++j){
                var arg = ccEntry.args[j];
                if(!arg)
                    arg = ColorClosureTools.getDefaultValue(ccInput[j]);
                if(ccInput[j].semantic == Shade.SEMANTICS.NORMAL && !state.noSpaceTransform)
                    arg = SpaceTransformTools.getSpaceTransformCall(arg, Shade.SpaceVectorType.VIEW_NORMAL);
                args.push(arg);
            }
        }
        return {
            type: Syntax.CallExpression,
            callee: {type: Syntax.Identifier, name: lightLoopFunction},
            arguments: args
        };
    }

    function handleReturnStatement(returnAast, state){
        var list = getClosureList(returnAast, state);
        if(list.length == 0)
            return;

        returnAast.argument = lighLoopCall;
    }


    function getEnvParameter(property){
        return { type: Syntax.MemberExpression,
                object: { type: Syntax.Identifier, name: "_env" },
                property: { type: Syntax.Identifier, name: property}};
    }

    ns.resolvePreTypeInference = function (ast, processData, opt) {
        var state = {
            positionArg: opt && opt.lightLoopPositionArg || null,
            ambientArg: opt && opt.lightLoopAmbientArg || null,
            noSpaceTransform: opt && opt.lightLoopNoSpaceTransform || false,
            program: ast,
            newFunctions: []
        }
        if(!state.positionArg)
            state.positionArg = getEnvParameter("position");
        if(!state.ambientArg)
            state.ambientArg = { type: Syntax.LogicalExpression, operator: "||",
                                 left: getEnvParameter("ambientIntensity"),
                                 right: {type: Syntax.Literal, value: 0} };

        ast = replacer(ast, function(closures) {
            assert(closures.length);
            var lightLoopFunction = getLightLoopFunction(closures, state);
            var lighLoopCall = generateLightLoopCall(lightLoopFunction, closures, state);
            //console.log("here", arguments);
            return lighLoopCall;
        });

        state.newFunctions.forEach(function(newFunction) {
            state.program.body.unshift(newFunction);
        })

        processData["isTransparent"] = !!state.isTransparent;

        return ast;
    }

}(exports));

},{"../../generate/space/space-transform-tools.js":164,"../../interfaces.js":168,"../colorclosure-replacer.js":170,"../colorclosure-tools.js":171,"./../../analyze/sanitizer/sanitizer.js":105,"./../../base/annotation.js":130,"./light-loop.js":177,"./xml3d-forward.js":178,"assert":92,"esprima":90,"estraverse":91}],177:[function(require,module,exports){
/**
 * Created with JetBrains WebStorm.
 * User: lachsen
 * Date: 12/17/13
 * Time: 1:21 PM
 * To change this template use File | Settings | File Templates.
 */
(function (ns) {

ns.LightLoop = function LightLoop(position, ambientIntensity){
    var V = position.flip().normalize(), dist, atten;
    var kdComplete = new Vec3(0,0,0), ksComplete = new Vec3(0,0,0);
    if (this.MAX_POINTLIGHTS)
    for (var i = 0; i < this.MAX_POINTLIGHTS; i++) {
        if (!this.pointLightOn[i])
            continue;

        var L = this.viewMatrix.mulVec(this.pointLightPosition[i], 1.0).xyz();
        L = L.sub(position);
        dist = L.length();
        L = L.normalize();

        var kd = new Vec3(0,0,0), ks = new Vec3(0,0,0);
        "BRDF_ENTRY";

        atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);
        kd = kd.mul(this.pointLightIntensity[i]).mul(atten);
        ks = ks.mul(this.pointLightIntensity[i]).mul(atten);
        kdComplete = kdComplete.add(kd);
        ksComplete = ksComplete.add(ks);
    }
    if (this.MAX_DIRECTIONALLIGHTS)
    for (i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
        if (!this.directionalLightOn[i])
            continue;

        L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
        L = L.flip().normalize();

        var kd = new Vec3(0,0,0), ks = new Vec3(0,0,0);
        "BRDF_ENTRY";

        kd = kd.mul(this.directionalLightIntensity[i]);
        ks = ks.mul(this.directionalLightIntensity[i]);
        kdComplete = kdComplete.add(kd);
        ksComplete = ksComplete.add(ks);
    }
    if (this.MAX_SPOTLIGHTS)
    for (i = 0; i < this.MAX_SPOTLIGHTS; i++) {
        if (this.spotLightOn[i]) {
            L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
            L = L.sub(position);
            dist = L.length();
            L = L.normalize();

            var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
            var angle = L.dot(lDirection);
            if(angle > this.spotLightCosFalloffAngle[i]) {
                var kd = new Vec3(0,0,0), ks = new Vec3(0,0,0);
                "BRDF_ENTRY";

                var c = 1.0;
                if (this.spotLightShadowMap && this.spotLightCastShadow[i]) {
                    var wpos = this.viewInverseMatrix.mulVec(position, 1.0).xyz();

                    var lsPos = this.spotLightMatrix[i].mulVec(new Vec4(wpos, 1));
                    var perspectiveDivPos = lsPos.xyz().div(lsPos.w()).mul(0.5).add(0.5);
                    var lsDepth = perspectiveDivPos.z() - this.spotLightShadowBias[i];

                    var lightuv = perspectiveDivPos.xy();
                    var bitShift = new Vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );

                    var depth = this.spotLightShadowMap[i].sample2D(lightuv).dot(bitShift);
                    if(lsDepth >= depth) {
                        c = 0.0;
                    }
                    /*var texSize = Math.max(this.width, this.height) * 2;
                    var texelSize = 1 / texSize;
                    var f = Math.fract(lightuv.mul(texSize).add(0.5));
                    var centroidUV = Math.floor(lightuv.mul(texSize).add(0.5));
                    centroidUV = centroidUV.div(texSize);

                    var lb = this.spotLightShadowMap[i].sample2D(centroidUV).dot(bitShift);
                    if (lb >= lsDepth)
                        lb = 1.0;
                    else
                        lb = 0.0;

                    var lt = this.spotLightShadowMap[i].sample2D(centroidUV.add(new Vec2(0.0, 1.0).mul(texelSize))).dot(bitShift);
                    if (lt >= lsDepth)
                        lt = 1.0;
                    else
                        lt = 0.0;

                    var rb = this.spotLightShadowMap[i].sample2D(centroidUV.add(new Vec2(1.0, 0.0).mul(texelSize))).dot(bitShift);
                    if (rb >= lsDepth)
                        rb = 1.0;
                    else
                        rb = 0.0;

                    var rt = this.spotLightShadowMap[i].sample2D(centroidUV.add(new Vec2(1.0, 1.0).mul(texelSize))).dot(bitShift);
                    if (rt >= lsDepth)
                        rt = 1.0;
                    else
                        rt = 0.0;

                    var a = Math.mix(lb, lt, f.y());
                    var b = Math.mix(rb, rt, f.y());
                    c = Math.mix(a, b, f.x());*/
                }

                var softness = 1.0;
                if(angle < this.spotLightCosSoftFalloffAngle[i])
                    softness = (angle - this.spotLightCosFalloffAngle[i]) /
                        (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

                atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
                kd = kd.mul(this.spotLightIntensity[i]).mul(atten * softness * c);
                ks = ks.mul(this.spotLightIntensity[i]).mul(atten * softness * c);
                kdComplete = kdComplete.add(kd);
                ksComplete = ksComplete.add(ks);
            }
        }
    }
    var ambientColor = new Vec3(0,0,0);
    "AMBIENT_ENTRY";
    kdComplete = kdComplete.add(ambientColor);
    var emissiveColor = new Vec3(0, 0, 0);
    "EMISSIVE_ENTRY"
    /*if (this.ssaoMap) {
        kdComplete = kdComplete.mul(1 - this.ssaoMap.sample2D(this.normalizedCoords).r());
    } */
    var refractColor = new Vec3(0, 0, 0);
    var reflectColor = new Vec3(0, 0, 0);
    "REFRACT_REFLECT_ENTRY"
    var opaque = new Vec3(1, 1, 1);
    var transparency = new Vec3(0, 0, 0);
    "TRANSPARENCY"
    return new Vec4(Math.pow(new Vec3(emissiveColor.add(kdComplete.add(ksComplete)).add(refractColor).add(reflectColor)), new Vec3(1/2.2)), transparency.x());
}

}(exports));

},{}],178:[function(require,module,exports){
(function (ns) {

        ns.emissive = {
            getEmissive: function getEmissive(color){
                return color;
            }
        };

        ns.diffuse = {
            getDiffuse: function getDiffuse(L, V, color, N, roughness){
                // If a roughness is defined we use Oren Nayar brdf.
                var a, b, NdotV, thetaOut, phiOut, thetaIn;
                var cosPhiDiff, alpha, beta;
                var NdotL = Math.saturate(N.dot(L));

                // Lambertian reflection is constant over the hemisphere.
                var brdf = 1.0;

                if (roughness > 0) {
                    a = 1.0 - (roughness * roughness) / (2 * (roughness * roughness + 0.33));
                    b = 0.45 * (roughness * roughness) / (roughness * roughness + 0.09);
                    NdotV = N.dot(V);
                    thetaOut = Math.acos(NdotV);
                    phiOut = V.sub(N.mul(NdotV)).normalize();
                    thetaIn = Math.acos(NdotL);
                    cosPhiDiff = phiOut.dot(L.sub(N.mul(NdotL)).normalize());
                    alpha = Math.max(thetaOut, thetaIn);
                    beta = Math.min(thetaOut, thetaIn);
                    brdf = (a + b * Math.saturate(cosPhiDiff) * Math.sin(alpha) * Math.tan(beta));
                }
                brdf *= NdotL;
                return color.mul(brdf);
            },

            getAmbient: function getAmbient(ambientIntensity, color, N, roughness){
                return color.mul(ambientIntensity);
            }
        };

        ns.phong = {
            getSpecular: function getSpecular(L, V, color, N, shininess){
                var R = L.reflect(N).normalize();
                var eyeVector = V.flip();
                return color.mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0));
            }
        };

        ns.cookTorrance = {
            getSpecular: function getSpecular(L, V, color, N, ior, roughness){
                var R0 = Math.pow((1 - ior) / (1 + ior), 2);
                var H = V.add(L).normalize(),
                    NdotH = N.dot(H),
                    NdotL = Math.saturate(N.dot(L)),
                    HdotN = H.dot(N),
                    HdotL = H.dot(L),
                    HdotV = H.dot(V),
                    NdotV = N.dot(V);

                // Beckmann distribution
                var alpha = Math.acos(NdotH),
                    numerator = Math.exp(-Math.pow(Math.tan(alpha) / roughness, 2)),
                    denominator = Math.pow(roughness, 2) * Math.pow(NdotH, 4),
                    d =  Math.max(0, numerator / denominator);

                // Geometric attenuation
                var G1 = 2 * HdotN * NdotV / HdotV,
                    G2 = 2 * HdotN * NdotL / HdotV,
                    g =  Math.min(1, Math.max(0, Math.min(G1, G2))),
                    f = Math.max(0, R0 + (1 - R0) * Math.pow(1 - NdotH, 5));

                var brdf = d * g * f / (Math.PI * NdotV);
                return color.mul(brdf);
            }
        };

        ns.ward = {
            getSpecular: function getSpecular(L, V, color, N, T, ax, ay){
                var H = L.add(V).normalize();
                var B = N.cross(T).normalize();
                var NdotV = Math.saturate(N.dot(V));
                var NdotL = Math.saturate(N.dot(L)) + 0.001;
                var NdotH = N.dot(H) + 0.001;
                var HdotT = H.dot(T);
                var HdotB = H.dot(B);

                var first = 1 / (4 * Math.PI * ax * ay * Math.sqrt(NdotL * NdotV));
                var beta = -(Math.pow(HdotT / ax, 2) + Math.pow(HdotB / ay, 2)) / (NdotH * NdotH);
                var second = Math.exp(beta);
                var brdf = Math.max(0, first * second) * NdotL;

                return color.mul(brdf);
            }
        };

        ns.scatter = {
            getSpecular: function getSpecular(L, V, color, N, wrap, scatterWidth){
                var NdotL = Math.saturate(N.dot(L));

                var NdotLWrap = (NdotL + wrap) / (1 + wrap);
                var scatter = Math.smoothstep(0.0, scatterWidth, NdotLWrap) * Math.smoothstep(scatterWidth * 2.0, scatterWidth, NdotLWrap);

                return color.mul(scatter);
            }
        };

        ns.reflect = {
            getReflect: function getReflect(position, N, factor) {
                N = this.viewInverseMatrix.mulVec(N, 0).xyz();
                var I = this.viewInverseMatrix.mulVec(position, 1.0).xyz().sub(this.cameraPosition).normalize();
                var reflection3D = I.reflect(N).normalize();
                var reflection2D = new Vec2((Math.atan2(-reflection3D.z(), reflection3D.x()) + Math.PI) / (2 * Math.PI), (Math.asin(reflection3D.y()) + Math.PI / 2.0) / Math.PI);
                return Math.pow(this.environment.sample2D(reflection2D).rgb(), new Vec3(2.2)).mul(factor);
            }
        };

        ns.refract = {
            getRefract: function getRefract(position, N, eta, factor) {
                N = this.viewInverseMatrix.mulVec(N, 0).xyz();
                var I = this.viewInverseMatrix.mulVec(position, 1.0).xyz().sub(this.cameraPosition).normalize();
                var refraction3D = I.refract(N, eta).normalize();
                var refraction2D = new Vec2((Math.atan2(-refraction3D.z(), refraction3D.x()) + Math.PI) / (2 * Math.PI), (Math.asin(refraction3D.y()) + Math.PI / 2.0) / Math.PI);
                return Math.pow(this.environment.sample2D(refraction2D).rgb(), new Vec3(2.2)).mul(factor);
            }
        };

        ns.transparent = {
            getTransparency: function getTransparency(position, alpha) {
                return new Vec3(alpha);
            }
        };

}(exports));

},{}]},{},[167])(167)
});