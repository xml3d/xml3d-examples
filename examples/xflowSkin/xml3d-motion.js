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

@version: 0.1.1 
**/
					
/** @namespace **/
var XMOT = XMOT || {};

/** @define {string} */
XMOT.version = '0.1.1';

(function() {

    /**
     * A MotionFactory.
     * @interface
     */
    var MotionFactory = function() {};
    var m = MotionFactory.prototype;

    /**
     * Creates a Moveable out of the given object
     * @param {Object} object base for the Moveable
     * @param {Constraint} constraint Constrain movement
     * @return {Moveable} created Moveable
     */
    m.createMoveable = function(object, constraint){};

    /**
     * Creates an Animatable out of the given object
     * @param {Object} object base for the Animatable
     * @param {Constraint} constraint Constrain movement
     * @return {Animatable} created Animatable
     */
    m.createAnimatable = function(object, constraint){};

    /**
     * Creates a KeyframeAnimation
     * @param {string} name name
     * @param {string} type "Position" or "Orientation"
     * @param {Object} element KeyframeAnimation, keyframes and corresponding positions or orientations
     * @param {{duration: number, loop: number, delay: number, easing: Function, callback: Function}=} opt options
     * @return {Animation} created KeyFrameAnimation
     */
    m.createKeyframeAnimation = function(name, type, element, opt){};

    /**
     * Creates a ParameterAnimation
     * @param {string} name name
     * @param {Object} element ParameterAnimation, keys and corresponding parameters
     * @param {{duration: number, loop: number, delay: number, easing: Function, callback: Function}=} opt options
     * @return {Animation} created ParameterAnimation
     */
    m.createParameterAnimation = function(name, element, opt){};


    /**
     * A Moveable.
     * @interface
     */
    var Moveable = function() {};
    var p = Moveable.prototype;

    /**
     * Sets the absolute position of the Moveable in local space.
     * @param {Array.<number>} position position as 3d vector in local space
     * @return {Moveable} the Moveable
     */
    p.setPosition = function(position){};

    /**
     * Sets the absolute orientation of the Movebale in local space.
     * @param {Array.<number>} orientation orientation as quaternion in local space
     * @return {Moveable} the Moveable
     */
    p.setOrientation = function(orientation){};

    /**
     * Sets a new scale factor
     * @param {Array.<number>} scale scale factor
     */
    p.setScale = function(scale){};

    /**
     * Gets the current position
     * @return {Array.<number>} position
     */
    p.getPosition = function(){};

    /**
     * Gets the current orientation as quaternion
     * @return {Array.<number>} orientation
     */
    p.getOrientation = function(){};

    /**
     * Gets the current scale factor
     * @return {number} scale factor
     */
    p.getScale = function(){};

    /**
     * Translate the Moveable by a given Vector.
     * @param {Array.<number>} translation 3d Vector
     * @return {Moveable} the Moveable
     */
    p.translate = function(translation){};

    /**
     * Rotates the Moveable by a given Quaternion.
     * @param {Array.<number>} rotation Quaternion
     * @return {Moveable} the Moveable
     */
    p.rotate = function(rotation){};

    /**
     * Scales the moveable by a given vector
     * @param{Array.<number>} factor scale factor
     * @return {Moveable} the Moveable
     */
    p.scale = function(factor){};

    /**
     * Interpolated translation over time to position in local space.
     * The animation is put into a fifo-queue and will be eventually executed.
     * @param {Array.<number>|undefined} position local space Vector
     * @param {Array.<number>|undefined} orientation orientation Quaternion
     * @param {number} time when to reach the position, in milliseconds
     * @param {{delay: number, easing: Function, queueing: Boolean, callback: Function}=} opt options
     * @return {Moveable} the Moveable
     */
    p.moveTo = function(position, orientation, time, opt){};

    /**
     * Returns true if a movement is currently in progress
     * @return {Boolean}
     */
    p.movementInProgress = function(){};

    /**
     * Stops the current movement and cancels every queued movement.
     * @return {Moveable} the Moveable
     */
    p.stop = function(){};

    /**
     * Sets a constraint for the Moveable. The constraint is checked
     * @param {Constraint} constraint Set a constraint to the Moveable
     */
    p.setContraint = function(constraint){};


    /**
     * An Animatable
     * @extends Moveable
     * @interface
     */
    var Animatable = function(){};
    var a = Animatable.prototype;

    /**
     * Add an Animation to the Animatable
     * @param {Animation} animation Animation
     * @param {{duration: number, loop: number, delay: number, easing: Function, callback: Function}=} opt options
     * @return {Animatable} the Animatable
     */
    a.addAnimation = function(animation, opt){};

    /**
     * Starts an animation
     * @param {string} name animation, that will be started
     * @param {{duration: number, loop: number, delay: number, easing: Function, callback: Function}=} opt options
     * @return {number} id id of the animation
     */
    a.startAnimation = function(name, opt){};

    /**
     * Stops an animation
     * @param {string} id Animation ID
     * @return {Animatable} the Animatable
     */
    a.stopAnimation = function(id){};


    /**
     * An Animation
     * @interface
     */
    var Animation = function(){};
    var k = Animation.prototype;

    /**
     * Sets the state of the animatable at time x of the animation
     * @param {Animatable} animatable
     * @param {number} currentTime
     * @param {number} startTime
     * @param {number} endTime
     * @param {Function=} easing
     */
    k.applyAnimation = function(animatable, currentTime, startTime, endTime, easing){};

	/**
	 * Set Options
	 * @param {{duration: number, loop: number, delay: number, easing: Function, callback: Function}} opt options
	 */
	k.setOptions = function(opt){};

	/**
	 * Gets the value of an option, the option can be requested by its name
	 * @return {{duration: number, loop: number, delay: number, easing: Function, callback: Function}} opt options the requested option value
	 */
	k.getOptions = function(){};


	/**
     * A Constraint
     * @interface
     */
    var Constraint = function(){};
    var c = Constraint.prototype;

    /**
     * Checks if a rotation operation is valid.
     * @param {Array.<number>} newRotation Quaternion, absolute Orientation
     * @param {Moveable} moveable Moveable
     * @return {boolean} returns true if the operation is valid, false otherwise
     */
    c.constrainRotation = function(newRotation, moveable){};

    /**
     * Checks if a translation operation is valid.
     * @param {Array.<number>} newTranslation 3d Vector representing the absolute position in local space
     * @param {Moveable} moveable Moveable
     * @return {boolean} returns true if the operation is valid, false otherwise
     */
    c.constrainTranslation = function(newTranslation, moveable){};

}());/**
 * @author sole / http://soledadpenades.com
 * @author mr.doob / http://mrdoob.com
 * @author Robert Eisele / http://www.xarg.org
 * @author Philippe / http://philippe.elsass.me
 * @author Robert Penner / http://www.robertpenner.com/easing_terms_of_use.html
 * @author Paul Lewis / http://www.aerotwist.com/
 * @author lechecacharro
 * @author Josh Faul / http://jocafa.com/
 * @author egraether / http://egraether.com/
 */

var TWEEN = TWEEN || ( function () {

	var _tweens = [];

	return {

		REVISION: '6',

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function ( tween ) {

			_tweens.push( tween );

		},

		remove: function ( tween ) {

			var i = _tweens.indexOf( tween );

			if ( i !== -1 ) {

				_tweens.splice( i, 1 );

			}

		},

		update: function ( time ) {

			var i = 0;
			var num_tweens = _tweens.length;
			var time = time !== undefined ? time : Date.now();

			while ( i < num_tweens ) {

				if ( _tweens[ i ].update( time ) ) {

					i ++;

				} else {

					_tweens.splice( i, 1 );
					num_tweens --;

				}

			}

		}

	};

} )();

TWEEN.Tween = function ( object ) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _duration = 1000;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTween = null;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;

	this.to = function ( properties, duration ) {

		if ( duration !== null ) {

			_duration = duration;

		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function ( time ) {

		TWEEN.add( this );

		_startTime = time !== undefined ? time : Date.now();
		_startTime += _delayTime;

		for ( var property in _valuesEnd ) {

			// This prevents the engine from interpolating null values
			if ( _object[ property ] === null ) {

				continue;

			}

			// check if an Array was provided as property value
			if ( _valuesEnd[ property ] instanceof Array ) {

				if ( _valuesEnd[ property ].length === 0 ) {

					continue;

				}

				// create a local copy of the Array with the start value at the front
				_valuesEnd[ property ] = [ _object[ property ] ].concat( _valuesEnd[ property ] );

			}

			_valuesStart[ property ] = _object[ property ];

		}

		return this;

	};

	this.stop = function () {

		TWEEN.remove( this );
		return this;

	};

	this.delay = function ( amount ) {

		_delayTime = amount;
		return this;

	};

	this.easing = function ( easing ) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function ( interpolation ) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function ( chainedTween ) {

		_chainedTween = chainedTween;
		return this;

	};

	this.onUpdate = function ( onUpdateCallback ) {

		_onUpdateCallback = onUpdateCallback;
		return this;

	};

	this.onComplete = function ( onCompleteCallback ) {

		_onCompleteCallback = onCompleteCallback;
		return this;

	};

	this.update = function ( time ) {

		if ( time < _startTime ) {

			return true;

		}

		var elapsed = ( time - _startTime ) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		var value = _easingFunction( elapsed );

		for ( var property in _valuesStart ) {

			var start = _valuesStart[ property ];
			var end = _valuesEnd[ property ];

			if ( end instanceof Array ) {

				_object[ property ] = _interpolationFunction( end, value );

			} else {

				_object[ property ] = start + ( end - start ) * value;

			}

		}

		if ( _onUpdateCallback !== null ) {

			_onUpdateCallback.call( _object, value );

		}

		if ( elapsed == 1 ) {

			if ( _onCompleteCallback !== null ) {

				_onCompleteCallback.call( _object );

			}

			if ( _chainedTween !== null ) {

				_chainedTween.start();

			}

			return false;

		}

		return true;

	};

};

TWEEN.Easing = {

	Linear: {

		None: function ( k ) {

			return k;

		}

	},

	Quadratic: {

		In: function ( k ) {

			return k * k;

		},

		Out: function ( k ) {

			return k * ( 2 - k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
			return - 0.5 * ( --k * ( k - 2 ) - 1 );

		}

	},

	Cubic: {

		In: function ( k ) {

			return k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k + 2 );

		}

	},

	Quartic: {

		In: function ( k ) {

			return k * k * k * k;

		},

		Out: function ( k ) {

			return 1 - --k * k * k * k;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
			return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

		}

	},

	Quintic: {

		In: function ( k ) {

			return k * k * k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

		}

	},

	Sinusoidal: {

		In: function ( k ) {

			return 1 - Math.cos( k * Math.PI / 2 );

		},

		Out: function ( k ) {

			return Math.sin( k * Math.PI / 2 );

		},

		InOut: function ( k ) {

			return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

		}

	},

	Exponential: {

		In: function ( k ) {

			return k === 0 ? 0 : Math.pow( 1024, k - 1 );

		},

		Out: function ( k ) {

			return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

		},

		InOut: function ( k ) {

			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
			return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

		}

	},

	Circular: {

		In: function ( k ) {

			return 1 - Math.sqrt( 1 - k * k );

		},

		Out: function ( k ) {

			return Math.sqrt( 1 - --k * k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
			return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

		},

		Out: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

		},

		InOut: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
			return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

		}

	},

	Back: {

		In: function ( k ) {

			var s = 1.70158;
			return k * k * ( ( s + 1 ) * k - s );

		},

		Out: function ( k ) {

			var s = 1.70158;
			return --k * k * ( ( s + 1 ) * k + s ) + 1;

		},

		InOut: function ( k ) {

			var s = 1.70158 * 1.525;
			if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
			return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

		}

	},

	Bounce: {

		In: function ( k ) {

			return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

		},

		Out: function ( k ) {

			if ( k < ( 1 / 2.75 ) ) {

				return 7.5625 * k * k;

			} else if ( k < ( 2 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

			} else if ( k < ( 2.5 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

			} else {

				return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

			}

		},

		InOut: function ( k ) {

			if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
			return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

		if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
		if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

		return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );

	},

	Bezier: function ( v, k ) {

		var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

		for ( i = 0; i <= n; i++ ) {
			b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
		}

		return b;

	},

	CatmullRom: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

		if ( v[ 0 ] === v[ m ] ) {

			if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

			return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

		} else {

			if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
			if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

			return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

		}

	},

	Utils: {

		Linear: function ( p0, p1, t ) {

			return ( p1 - p0 ) * t + p0;

		},

		Bernstein: function ( n , i ) {

			var fc = TWEEN.Interpolation.Utils.Factorial;
			return fc( n ) / fc( i ) / fc( n - i );

		},

		Factorial: ( function () {

			var a = [ 1 ];

			return function ( n ) {

				var s = 1, i;
				if ( a[ n ] ) return a[ n ];
				for ( i = n; i > 1; i-- ) s *= i;
				return a[ n ] = s;

			}

		} )(),

		CatmullRom: function ( p0, p1, p2, p3, t ) {

			var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
			return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

		}

	}

};
(function() {


//The functions inherit and base are taken out of the google closure project.
//Those functions are part of the Apache License (see Appache_License file)

/**
 * Inherit the prototype methods from one constructor into another.
 * Usage:
 * function Parent(a, b) {}
 * Parent.prototype.foo = function(a) {}
 * function Child(a, b, c) {
 *   base(this, a, b);
 * }
 * inherit(Child, Parent);
 *
 * var child = new Child('a', 'b', 'see');
 * child.foo(); // works
 *
 * A superclass' implementation of a method can be invoked as follows:
 * Child.prototype.foo = function(a) {
 *   Child.superClass_.foo.call(this, a);
 *   // other code
 * };
 * @param {Function} child Child class.
 * @param {Function} parent Parent class.
 */
function inherit(child, parent) {
	/** @constructor */
	function tmp() {};
	tmp.prototype = parent.prototype;
	child.superClass_ = parent.prototype;
	child.prototype = new tmp();
	child.prototype.constructor = child;
};

/**
 * Call up to the superclass.
 *
 * If this is called from a constructor, then this calls the superclass
 * contructor with arguments 1-N.
 *
 * If this is called from a prototype method, then you must pass
 * the name of the method as the second argument to this function. If
 * you do not, you will get a runtime error. This calls the superclass'
 * method with arguments 2-N.
 *
 * This function only works if you use inherit to express
 * inheritance relationships between your classes.
 *
 * This function is a compiler primitive. At compile-time, the
 * compiler will do macro expansion to remove a lot of
 * the extra overhead that this function introduces. The compiler
 * will also enforce a lot of the assumptions that this function
 * makes, and treat it as a compiler error if you break them.
 *
 * @param {!Object} me Should always be "this".
 * @param {*=} opt_methodName The method name if calling a super method.
 * @param {...*} var_args The rest of the arguments.
 * @return {*} The return value of the superclass method.
 */
function base(me, opt_methodName, var_args) {
	var caller = arguments.callee.caller;
	if (caller.superClass_) {
		// This is a constructor. Call the superclass constructor.
		return caller.superClass_.constructor.apply( me, Array.prototype.slice.call(arguments, 1) );
	}
	var args = Array.prototype.slice.call(arguments, 2);
	var foundCaller = false;
	for (var ctor = me.constructor; ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
		if (ctor.prototype[opt_methodName] === caller) {
			foundCaller = true;
		} else if (foundCaller) {
			return ctor.prototype[opt_methodName].apply(me, args);
		}
	}
	// If we did not find the caller in the prototype chain,
	// then one of two things happened:
	// 1) The caller is an instance method.
	// 2) This method was not called by the right caller.
	if (me[opt_methodName] === caller){
		return me.constructor.prototype[opt_methodName].apply(me, args);
	} else {
		throw "base called from a method of one name to a method of a different name";
	}
};

// ----------------------------------------------------------------------------

/**
 * global variable, used to check if an animation or movement is currently in progress
 */
var animating = false;

/**
 * global variable, set a function, which is called within the animation loop
 */
var animationHook = undefined;

/**
 * a cameracontroller register here and the update of the gamepad is called
 */
var registeredCameraController = undefined;

/**
 * Updates all the Tweens until all animations are finished and calls the hook.
 */
function animate(){
	if(TWEEN.getAll().length || XMOT.animationHook || XMOT.registeredCameraController) {
		window.requestAnimFrame(XMOT.animate);
		if(XMOT.animationHook) XMOT.animationHook();
		if(XMOT.registeredCameraController) XMOT.registeredCameraController.update();
		TWEEN.update();
	}
	else
		XMOT.animating = false;
};

/**
 * Converts axis angle representation into an quaternion
 * @param {Array.<number>} axis
 * @param {number} angle
 * @return {Array.<number>} quaternion
 */
function axisAngleToQuaternion(axis, angle){
	var normAxis = XMOT.normalizeVector(axis);
	var quat = [];
	var s = Math.sin(angle/2);
	quat[0] = normAxis[0] *s;
	quat[1] = normAxis[1] *s;
	quat[2] = normAxis[2] *s;
	quat[3] = Math.cos(angle/2);
	return quat;
};

/**
 * Normalizes a 3D vector
 * @param {Array.<number>} vector
 * @return {Array.<number>} normalized vector
 */
function normalizeVector(vector){
	var length = Math.sqrt( vector[0]*vector[0] + vector[1]*vector[1] + vector[2]*vector[2] );
	if(length == 0) return vector;
	return [vector[0]/length, vector[1]/length, vector[2]/length];
};

/**
 * Converts a quaternion into an axis angle representation
 * @param {Array.<number>} quat
 * @return {{axis: Array.<number>, angle:number}}
 */
function quaternionToAxisAngle(quat){
	quat4.normalize(quat); //normalise to avoid erros that may happen if qw > 1
	var angle = 2*Math.acos(quat[3]);
	var s = Math.sqrt(1-quat[3]*quat[3]);
	if(s < 0.00001 ) s = 1; //avoid div by zero, direction not important for small s
	var x = quat[0]/s;
	var y = quat[1]/s;
	var z = quat[2]/s;
	return {axis:[x,y,z], angle:angle};
};

/**
 * Interpolate between two quaternions the shortest way
 * See: http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/
 * @param{Array.<number>} a quaternion a
 * @param{Array.<number>} b quaternion b
 * @param{number} t interpolation parameter
 */
function slerp(a, b, t) {
	// quaternion to return
	var qm = {x:0, y:0, z:0, w:0};
	var qa = {x:a[0], y:a[1], z:a[2], w:a[3]};
	var qb = {x:b[0], y:b[1], z:b[2], w:b[3]};
	// Calculate angle between them.
	var cosHalfTheta = qa.w * qb.w + qa.x * qb.x + qa.y * qb.y + qa.z * qb.z;
	// if qa=qb or qa=-qb then theta = 0 and we can return qa
	if (Math.abs(cosHalfTheta) >= 1.0){
		qm.w = qa.w;
		qm.x = qa.x;
		qm.y = qa.y;
		qm.z = qa.z;
		return [qm.x, qm.y, qm.z, qm.w];
	}
	// Calculate temporary values.
	var halfTheta = Math.acos(cosHalfTheta);
	var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);
	// if theta = 180 degrees then result is not fully defined
	// we could rotate around any axis normal to qa or qb
	if (Math.abs(sinHalfTheta) < 0.001){ // fabs is floating point absolute
		qm.w = (qa.w * 0.5 + qb.w * 0.5);
		qm.x = (qa.x * 0.5 + qb.x * 0.5);
		qm.y = (qa.y * 0.5 + qb.y * 0.5);
		qm.z = (qa.z * 0.5 + qb.z * 0.5);
		return [qm.x, qm.y, qm.z, qm.w];
	}
	var ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
	var ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
	//calculate Quaternion.
	qm.w = (qa.w * ratioA + qb.w * ratioB);
	qm.x = (qa.x * ratioA + qb.x * ratioB);
	qm.y = (qa.y * ratioA + qb.y * ratioB);
	qm.z = (qa.z * ratioA + qb.z * ratioB);
	return [qm.x, qm.y, qm.z, qm.w];
};

/**
 * Merges two optionsobjects
 * @param {{duration: number, loop: number, delay: number, easing: Function, callback: Function}} high options with high priority
 * @param {{duration: number, loop: number, delay: number, easing: Function, callback: Function}} low options with low priority
 * @return {{duration: number, loop: number, delay: number, easing: Function, callback: Function}} merged options
 */
function mergeOptions(high, low){
	var ret = {};
	high = high || {};
	low = low || {};
	ret.duration 	= high.duration || low.duration;
	ret.loop 		= high.loop 	|| low.loop;
	ret.delay 		= high.delay 	|| low.delay;
	ret.easing 		= high.easing 	|| low.easing;
	ret.callback 	= high.callback || low.callback;
	return ret;
};

//export
XMOT.inherit = inherit;
XMOT.base = base;
XMOT.animate = animate;
XMOT.animating = animating;
XMOT.animationHook = animationHook;
XMOT.registeredCameraController = registeredCameraController;
XMOT.axisAngleToQuaternion = axisAngleToQuaternion;
XMOT.normalizeVector = normalizeVector;
XMOT.quaternionToAxisAngle = quaternionToAxisAngle;
XMOT.slerp = slerp;
XMOT.mergeOptions = mergeOptions;
}());(function() {

    /**
     * A Moveable implementation.
     * @constructor
     * @implements{Moveable}
     */
    function ClientMoveable(object, transform, constraint) {
    	/**
		 * Object which shall be moveable
		 * @protected
		 * @type {Object}
		 */
		this.object = object;
		/**
		 * Transform coords of the object and the Moveable
		 * @protected
		 * @type {Object}
		 */
		this.transform = transform;
		/**
		 * Constraint of the movement
		 * @protected
		 * @type {Constraint}
		 */
		this.constraint = constraint;
		/**
		 * Queue of movements
		 * @private
		 * @type {Array.<{tween: tween, startPosition:Array.<number>, endPosition:Array.<number>, startOrientation:Array.<number>, endOrientation:Array.<number>}>}
		 */
		this.motionQueue = new Array();
    };

    var p = ClientMoveable.prototype;

    /** @inheritDoc */
    p.setPosition = function(position){
		if(this.constraint.constrainTranslation(position, this))
			this.transform.translation.set(new XML3DVec3(position[0],position[1],position[2]));
		return this;
    };

    /** @inheritDoc */
	p.setOrientation = function(orientation){
		if(this.constraint.constrainRotation(orientation, this)){
			this.transform.rotation.setQuaternion( new XML3DVec3(orientation[0],orientation[1],orientation[2]), orientation[3] );
		}
		return this;
    };

    /** @inheritDoc */
    p.setScale = function(scale){
    	this.transform.scale.set(new XML3DVec3(scale[0], scale[1], scale[2]));
    };

    /** @inheritDoc */
    p.getPosition = function(){
    	return [this.transform.translation.x, this.transform.translation.y, this.transform.translation.z];
    };

    /** @inheritDoc */
    p.getOrientation = function(){
    	var axis = this.transform.rotation.axis;
    	var angle = this.transform.rotation.angle;
    	return XMOT.axisAngleToQuaternion([axis.x, axis.y, axis.z], angle);
    };

    /** @inheritDoc */
    p.getScale = function(){
    	return this.transform.scale;
    };

    /** @inheritDoc */
    p.translate = function(translation){
    	var currentPos = this.getPosition();
    	return this.setPosition([currentPos[0]+translation[0], currentPos[1]+translation[1], currentPos[2]+translation[2]]);
    };

    /** @inheritDoc */
    p.rotate = function(orientation){
		var modifier = new XML3DRotation();
		modifier.setQuaternion( new XML3DVec3(orientation[0],orientation[1],orientation[2]), orientation[3] );
		var destination = this.transform.rotation.multiply( modifier );
		if(this.constraint.constrainRotation(orientation, this))
			this.transform.rotation.set(destination);
		return this;
    };

    /** @inheritDoc */
    p.scale = function(factor){
    	this.transform.scale.multiply(new XML3DVec3(factor[0], factor[1], factor[2]));
    	return this;
    };

    /** @inheritDoc */
    p.moveTo = function(position, orientation, time, opt){
    	opt = opt || {};
    	//no movement needed
    	var queueingAllowed = opt.queueing || true;
		if( (position == undefined && orientation == undefined) || //nowhere to moveto
			(!queueingAllowed && this.movementInProgress()) || //queuing forbiden, but something in progress
			(this.checkIfNoNeedToMove(position, orientation)) ){
			if(opt.callback) opt.callback();
			return this;
		}

		//create new queue entry of the new given data:
		var newEntry = {};
		var tween = new TWEEN.Tween({t:0}).to({t:time}, time);
		if(opt.delay != undefined) tween.delay(opt.delay);
		var that = this;
		var easing = opt.easing;
		//update callback
		tween.onUpdate( function() {
			//this is the data interpolated by the tween
			that.movement(this.t, 0, time, easing);
		} );
		//callback on complete
		tween.onComplete( function(){
			//this is the data interpolated by the tween

			//start next tween (beginning of the queue), if there is any in the queue
			if(that.motionQueue.length > 1){ //we did not remove the finished one yet
				//set startpos / ori of the following moveTo, instead of setting at definition
				var followingMovement = that.motionQueue[1];
				var endedMovement = that.motionQueue[0];
				followingMovement.startPosition = endedMovement.endPosition || that.getPosition();
				followingMovement.startOrientation = endedMovement.endOrientation || that.getOrientation();
				followingMovement.tween.start();
			}
			//remove finished tween from the beginning of the queue
			that.motionQueue.shift();
			//callback after the movement finished
			if(opt.callback && typeof(opt.callback) === "function")
				opt.callback();
		});
		newEntry.tween = tween;
		newEntry.endPosition = position;
		newEntry.endOrientation = orientation;
		//default start values, are the current values
		//those are overwritten if a tween ends before us, see the onComplete callback
		newEntry.startPosition = this.getPosition();
		newEntry.startOrientation = this.getOrientation();

		//push tween to the end of the queue and start if queue was empty
		this.motionQueue.push(newEntry);
		if( this.motionQueue.length-1 == 0){
			newEntry.tween.start();
			if(!XMOT.animating) {
				XMOT.animate();
				XMOT.animating = true;
			}
		}
		return this;
    };

	/**
	 * Checks if we need to move to a poi or if we are already there
	 * @private
	 * @param {Array.<number>} position
	 * @param {Array.<number>} orientation
	 * @return {boolean}
	 */
	p.checkIfNoNeedToMove = function(position, orientation){
		if(!position && !orientation) return true;
		if(!position && orientation) return this.checkPosition(orientation);
		if(position && !orientation) return this.checkPosition(position);
		return this.checkPosition(position) && this.checkPosition(orientation);
	};

	/**
	 * check if current position equals moveTo position
	 * @private
	 * @param {Array.<number>} position
	 * @return {boolean}
	 */
	p.checkPosition = function(position){
		var curPos = this.transform.translation;
		return (curPos.x == position[0] && curPos.y == position[1] && curPos.z == position[2]);
	};

	/**
	 * check if current orientation equals moveTo orientation
	 * @private
	 * @param {Array.<number>} orientation
	 * @return {boolean}
	 */
	p.checkOrientation = function(orientation){
		var curOri = this.transform.orientation;
		return (curOri.x === orientation[0] && curOri.y === orientation[1] && curOri.z === orientation[2] && curOri.w === orientation[3]);
	};

    /**
     * Applies one movement step to the moveable
     * @private
     * @param {number}currentTime
     * @param {number} startTime
     * @param {number} endTime
     * @param {Function} easing
     */
    p.movement = function(currentTime, startTime, endTime, easing){
		var t = (currentTime - startTime) / (endTime - startTime);
		if(easing && typeof(easing) === "function") t = easing(t); //otherwise its linear
		var pos = this.interpolatePosition(t);
		var ori = this.interpolateOrientation(t);
		this.setValue(pos, ori);
    };

    /**
     * Interpolates the position of the current movement
     * @private
     * @param {number} t interpolation parameter
     * @return {Array.<number>|undefined} position
     */
    p.interpolatePosition = function(t){
		var end = this.motionQueue[0].endPosition;
		if(end == undefined) return undefined;
		var start = this.motionQueue[0].startPosition;
		var ret = [];
		var i = 0;
		for(i=0; i<start.length; i++ ){
			ret[i] = start[i] + ( end[i] - start[i] ) * t;
		}
		return ret;
    };

    /**
     * interpoaltes the orientation of the current movement
     * @private
     * @param {number} t interpolation paramater
     * @return {Array.<number>|undefined} orientation
     */
    p.interpolateOrientation = function(t){
		var end = this.motionQueue[0].endOrientation;
		if(end == undefined) return undefined;
		var start = this.motionQueue[0].startOrientation;
		return XMOT.slerp(start, end, t);
    };

    /**
	 * Set position and animation of the moveable
	 * @private
	 * @param {Array.<number>|undefined} position
	 * @param {Array.<number>|undefined} orientation
	 */
	p.setValue = function(position, orientation){
		if(position != undefined)
			this.setPosition(position);
		if(orientation != undefined)
			this.setOrientation(orientation);
	};

	/** @inheritDoc */
	p.movementInProgress = function(){
		return this.motionQueue.length > 0;
	};

    /**@inheritDoc */
    p.stop = function(){
		this.motionQueue.shift().tween.stop();
		this.motionQueue = []; //clear array
    };

    /** @inheritDoc */
    p.setConstraint = function(constraint){
		this.constraint = constraint;
    };

    //export
    XMOT.ClientMoveable = ClientMoveable;

}());(function(){
	/**
	 * ClientMotionFactory implementation
	 * @constructor
	 * @implements{MotionFactory}
	 */
	function ClientMotionFactory(){
		/**
		 * Counter to create unique IDs for the elements added to DOM
		 * @private
		 * @type {number}
		 */
		this.id = 0;
	};

	var m = ClientMotionFactory.prototype;

	/** @inheritDoc */
	m.createMoveable = function(element, constraint){
		if(!element) throw "No valid element, cannot create Moveable.";
		return new XMOT.ClientMoveable(element, this.getTransform(element), constraint);
	};

	/** @inheritDoc */
	m.createAnimatable = function(element, constraint){
		if(!element) throw "No valid element, cannot create Animatable.";
		return new XMOT.ClientAnimatable(element, this.getTransform(element), constraint);
	};

	/** @inheritDoc */
    m.createKeyframeAnimation = function(name, element, opt){
    	if(!element) throw "No valid element, cannot create Animatable.";
		var child = element.firstElementChild;
		var keys = undefined;
		var position = undefined;
		var orientation = undefined;
		var scale = undefined;
		while(child){
			//TODO: does child.name work for native?
			switch(child.name){
				case "key" : 		 keys = this.getValueFromChild(child, undefined); break;
				case "position" : 	 position = this.getValueFromChild(child, keys.length*3); break; 
				case "orientation" : orientation = this.getValueFromChild(child, keys.length*4); break;
				case "scale" : 		 scale = this.getValueFromChild(child, keys.length*3); break;
				default: break;
			}
			child = child.nextElementSibling;
		}
		if(!keys || (!position && !orientation && !scale)){
			throw "Element is not a valid keyframe animation";
		}
		else{
			return new XMOT.ClientKeyframeAnimation(name, keys, position, orientation, scale, opt);
		}
    };

	/**
	 * get Values from child
	 * @param {*} child
	 * @param {number}
	 * @return {Array.<number>}
	 */
    m.getValueFromChild = function(child, number){
		if(!XML3D._native)
		{
			var val = child.value;
			if(!val || (number && val.length != number )) return undefined;
			else return val;
		}
		else
		{
			throw "Animations are currently not supported in native Version.";
			//TODO: code for native version
		}
	};

    /**
     * creates a unique id
     * @return {string} unique id
     */
    m.createUniqueId = function(){
    	return "createdByClientMotionFactory" + this.id++;
    };

    /**
     * Gets the transform of an element and creates a transform if necessary
     * @param {Object} obj element
     * @return {Object} transform
     */
    m.getTransform = function(obj){
    	var t = XML3D.URIResolver.resolve(obj.transform, obj.ownerDocument);
    	if (!t || obj.transform == "") {
    		var defs = document.createElementNS(XML3D.xml3dNS, "defs");
    		t = document.createElementNS(XML3D.xml3dNS, "transform");
    		t.id = this.createUniqueId();
    		defs.appendChild(t);
    		obj.appendChild(defs);
    		obj.transform = "#"+t.id;
    	}
    	return t;
    };

	//export
	XMOT.ClientMotionFactory = ClientMotionFactory;
}());(function(){

	/**
	 * An implementation of Animatable
	 * @constructor
	 * @implements Animatable
	 * @extends ClientMoveable
	 */
	var ClientAnimatable = function(obj, transform, constraint){

		//call parent constructor here
		XMOT.base(this, obj, transform, constraint);

		/**
		 * Map of KeyframeAnimations
		 * The key of the map is  a string, which is the name of the animation
		 * type:  Map.key: string, Map.data: {animation: Animation, opt: Object}
		 * @private
		 * @type {Object}
		 */
		this.availableAnimations = {};
		/**
		 * Map of active KeyframeAnimations
		 * Note: This works since the IDs are only numbers.
		 * Those numbers are turned into strings  and those are used as keys.
		 * type: Map.key: number, Map.data: {animation: Animation, clockGenerator: TWEEN.Tween, opt: Object}
		 * @private
		 * @type {Object}
		 */
		this.activeAnimations = {};
		/**
		 * Counter of IDs for active animations
		 * Attention: this might turn to infinity
		 * @private
		 * @type {number}
		 */
		this.idCounter = 0;
	};

	//inheritence is done here
	XMOT.inherit(ClientAnimatable, XMOT.ClientMoveable);

    var ca = ClientAnimatable.prototype;

    /** @inheritDoc */
    ca.addAnimation = function(animation, opt){
		//do not change options of the animation, store options of the animation of this animatable
		//same animation might have different options on another animatable
		this.availableAnimations[animation.name] = new Object();
		var tmp = this.availableAnimations[animation.name];
		tmp.opt = XMOT.mergeOptions(opt, animation.getOptions());
		tmp.animation = animation;
		return this;
    };

    /** @inheritDoc */
    ca.startAnimation = function(name, opt){
		var id = this.idCounter;
		this.idCounter++;
		var animation = this.availableAnimations[name];
		if(!animation) throw "Add animation before starting animation: "+name;
		this.activeAnimations[id] = {animation:animation.animation, opt:XMOT.mergeOptions(opt, animation.opt)};
		this.startClockGenerator(id);
		//finally return the id after setting up everything
		return id;
    };

    /**
     * Starts a ClockGenerator which calls the Animation "from time to time", which then applies the current status of the animation to the animatable.
     * @private
     */
    ca.startClockGenerator = function(id){
		//use a tween as a clock generator
    	var a = this.activeAnimations[id];
    	var opt = a.opt;
		var time = opt.duration;
		var cg = new TWEEN.Tween({t:0}).to({t:time}, time).delay(opt.delay);

		//setup update and complete callbacks
		var that = this;
		cg.onUpdate(function(value){
			//this is the interpolated object!
			a.animation.applyAnimation(that, this.t, 0, time, opt.easing);
		});

		cg.onComplete( function(value){
			//this is the interpolated object!
			//animation ended -> callback or loop
			var numberOfLoops = opt.loop;
			if(isFinite(numberOfLoops)){
				if( numberOfLoops > 1 ){ //we must loop again
					opt.loop = numberOfLoops - 1;
					that.startClockGenerator(id);
				}else {
					//no more loops, we are finished and now the callback
					var cb = opt.callback;
					if(typeof(cb) === "function") cb();
					a = undefined; //clean up
				}
			}
			else{
				//infinite loops
				that.startClockGenerator(id);
			}
		});

		//and finally the start
		a.clockGenerator = cg;
		cg.start();
		if(!XMOT.animating) {
			XMOT.animating = true;
			XMOT.animate();
		}
    };

    /** @inheritDoc */
    ca.stopAnimation = function(id){
    	var toStop = this.activeAnimations[id];
		if(toStop) {
			toStop.clockGenerator.stop();
			this.activeAnimations[id] = undefined;
		}
		return this;
    };

    //export
	XMOT.ClientAnimatable = ClientAnimatable;

}());(function(){
	/**
	 * ClientKeyframeAnimation implementation
	 * @param{string} name name of the animation
	 * @param{Array.<number>} keys keys
	 * @param{Array.<number>|undefined} positionValues
	 * @param{Array.<number>|undefined} orientationValues
	 * @constructor
	 * @implements{Animation}
	 */
	function ClientKeyframeAnimation(name, keys, positionValues, orientationValues, scaleValues, opt){

		/**
		 * name of animation
		 * @private
		 * @type {string}
		 */
		this.name = name;
		/**
		 * Array of the keys
		 * @private
		 * @type{Array.<number>}
		 */
		this.keys = keys;
		/**
		 * Array fo the position values
		 * @private
		 * @type{Array.<number>|undefined}
		 */
		this.positionValues = positionValues;
		/**
		 * Array of the orientation values
		 * @private
		 * @type{Array.<number>|undefined}
		 */
		this.orientationValues = orientationValues;
		/**
		 * Array of the scale values
		 * @private
		 * @type{Array.<number>|undefined}
		 */
		this.scaleValues = scaleValues;

		//options - set defaults
		/**
		 * loop
		 * @private
		 * @type {number}
		 */
		this.loop = 1;
		/**
		 * delay
		 * @private
		 * @type{number}
		 */
		this.delay = 0;
		/**
		 * Duration of the animation
		 * @private
		 * @type {number}
		 */
		this.duration = 1000;
		/**
		 * easing
		 * @private
		 * @type {Function}
		 */
		this.easing = TWEEN.Easing.Linear.None;
		/**
		 * Callback, executed as soon as the animation ended
		 * @private
		 * @type {Function}
		 */
		this.callback = function(){};
		if(opt){
			this.setOptions(opt);
		}
	};

	var k = ClientKeyframeAnimation.prototype;

	/** @inheritDoc */
	k.applyAnimation = function(animatable, currentTime, startTime, endTime, easing){
		var t = (currentTime - startTime) / (endTime - startTime);
		if(easing && typeof(easing) === "function") t = easing(t); //otherwise its linear
		var lmo = this.keys.length - 1;
		if (t <= this.keys[0]){
			this.setValue( animatable, this.getPosition(0), this.getOrientation(0), this.getScale(0) );
		}else if (t >= this.keys[lmo]){
			this.setValue( animatable, this.getPosition(lmo), this.getOrientation(lmo), this.getScale(lmo) );
		}else{
			for ( var i = 0; i < lmo; i++){
				if (this.keys[i] < t && t <= this.keys[i + 1]) {
					var p = (t - this.keys[i]) / (this.keys[i + 1] - this.keys[i]);
					this.setValue( animatable, this.getInterpolatedPosition(i, p), this.getInterpolatedOrientation(i, p), this.getInterpolatedScale(i, p) );
				}
			}
		}
	};

	/**
	 * Set position and animation of the animatable
	 * @private
	 * @param {Animatable} animatable
	 * @param {Array.<number>|undefined} position
	 * @param {Array.<number>|undefined} orientation
	 */
	k.setValue = function(animatable, position, orientation, scale){
		if(position != undefined)
			animatable.setPosition(position);
		if(orientation != undefined)
			animatable.setOrientation(orientation);
		if(scale != undefined)
			animatable.setScale(scale);
	};

	/**
	 * Interpolates positionvalues between index i and index i+1 with parameter t
	 * @private
	 * @param {number} index
	 * @param {number} t interpolationparameter
	 * @return {Array.<number>|undefined} Position
	 */
	k.getInterpolatedPosition = function(index, t){
		if(this.positionValues == undefined) return undefined;
		return this.interpolateArray(this.getPosition(index), this.getPosition(index+1), t);
	};

	/**
	 * Interpolates scalevalues between index i and index i+1 with parameter t
	 * @private
	 * @param {number} index
	 * @param {number} t interpolationparameter
	 * @return {Array.<number>|undefined} Position
	 */
	k.getInterpolatedScale = function(index, t){
		if(this.scaleValues == undefined) return undefined;
		return this.interpolateArray(this.getScale(index), this.getScale(index+1), t);
	};

	/**
	 * Interpolate the values of two arrays
	 * @private
	 * @param{Array.<number>} a1 array 1
	 * @param{Array.<number>} a2 array 2
	 * @param {number} t interpolationparameter
	 * @return {Array.<number>|undefined} interpolated array
	 */
	k.interpolateArray = function(a1, a2, t){
		var ret = [];
		var i = 0;
		var l = a1.length;
		if(a1.length != a2.length) return undefined;
		for(i=0; i<l; i++ ){
			ret[i] = a1[i] + ( a2[i] - a1[i] ) * t;
		}
		return ret;
	};

	/**
	 * Interpolates keyvalues between index i and index i+1 with parameter t
	 * @private
	 * @param {number} index
	 * @param {number} t interpolationparameter
	 * @return {Array.<number>|undefined} Orientation
	 */
	k.getInterpolatedOrientation = function(index, t){
		if(this.orientationValues == undefined) return undefined;
		var start = this.getOrientation(index);
		var end = this.getOrientation(index+1);
		return XMOT.slerp(start, end, t);
	};

	/**
	 * Gets a position corresponding to a key
	 * @private
	 * @param {number} key
	 * @return {Array.<number>|undefined} Position
	 */
	k.getPosition = function(key){
		if(this.positionValues == undefined || key > this.keys.length-1 /*just in case*/) return undefined;
		var index = key*3;
		return [ this.positionValues[index], this.positionValues[index+1], this.positionValues[index+2] ];
	};

	/**
	 * Gets a sacle corresponding to a key
	 * @private
	 * @param {number} key
	 * @return {Array.<number>|undefined} Position
	 */
	k.getScale = function(key){
		if(this.scaleValues == undefined || key > this.keys.length-1 /*just in case*/) return undefined;
		var index = key*3;
		return [ this.scaleValues[index], this.scaleValues[index+1], this.scaleValues[index+2] ];
	};

	/**
	 * Gets an orientation corresponding to a key
	 * @private
	 * @param {number} key
	 * @return {Array.<number>|undefined} Orientation
	 */
	k.getOrientation = function(key){
		if(this.orientationValues == undefined || key > this.keys.length-1 /*just in case*/) return undefined;
		var index = key*4;
		return [ this.orientationValues[index], this.orientationValues[index+1], this.orientationValues[index+2], this.orientationValues[index+3] ];
	};

	/** @inheritDoc */
	k.getOptions = function(){
		return {duration: this.duration, loop: this.loop, delay: this.delay, easing: this.easing, callback: this.callback};
	};

    /** @inheritDoc */
    k.setOptions = function(opt){
		if(opt.loop)
			this.loop = opt.loop;
		if(opt.duration)
			this.duration = opt.duration;
		if(opt.easingk && typeof(opt.easing) === "function")
			this.easing = opt.easing;
		if(opt.callback && typeof(opt.callback) === "function")
			this.callback = opt.callback;
    };

	//export
	XMOT.ClientKeyframeAnimation = ClientKeyframeAnimation;
}());(function() {

	/**
	 * A CombinedAnimation
	 * @constructor
	 */
	function CombinedAnimation(name, opt){
		/**
		 * name of animation
		 * @private
		 * @type {string}
		 */
		this.name = name;

		/**
		 * Animations array
		 * Stores animation and their options
		 * @private
		 * type{Array.<{animation: Animation, opt:{duration: number|undefined, loop: number|undefined, delay: number|undefined, easing: function|undefined, callback: function|undefined}|undefined, boolean: callbackCalled}>}
		 */
		this.animations = [];

		/**
		 * Counter of finished child animations
		 * @private
		 * @type {number}
		 */
		this.finishedAnimationsCounter = 0;

		//options - set defaults
		/**
		 * loop
		 * @private
		 * @type {number}
		 */
		this.loop = 1;
		/**
		 * delay
		 * @private
		 * @type{number}
		 */
		this.delay = 0;
		/**
		 * Duration of the animation
		 * @private
		 * @type {number}
		 */
		this.duration = 1000;
		/**
		 * easing
		 * @private
		 * @type {Function}
		 */
		this.easing = TWEEN.Easing.Linear.None;
		/**
		 * Callback, executed as soon as the animation ended
		 * @private
		 * @type {Function}
		 */
		this.callback = function(){};
		if(opt){
			this.setOptions(opt);
		}
	};
	var ca = CombinedAnimation.prototype;

	/**
	 * Resetflags of the child animations
	 * @private
	 */
	ca.resetFlags = function(){
    	var i = 0;
    	var animations = this.animations;
    	var length = animations.length;
    	for(i=0; i<length; i++)
    		animations[i].callbackCalled = false;
	};

	/**
	 * Adds an animation
	 * @param {Animation} animation
	 * @param { {duration: number, loop: number, delay: number, easing: Function, callback: Function}|undefined } opt
	 * @return this
	 */
	ca.addAnimation = function(animation, opt){
		this.animations.push({animation: animation, opt: XMOT.mergeOptions(opt, animation.getOptions()), callbackCalled: false});
		//adopt duration correctly
		var needed_duration = opt.duration*opt.loop + opt.delay;
		if(this.duration < needed_duration) this.duration = needed_duration;
		return this;
	};
	
	/** @inheritDoc */
    ca.applyAnimation = function(animatable, overAllCurrentTime, overAllstartTime/*0*/, overAllendTime, combinedEasing){
    	var i = 0;
    	var animations = this.animations;
    	var length = animations.length;
    	for(i=0; i<length; i++){
    		var a = animations[i];
    		var opt = a.opt;
    		var duration = opt.duration;
    		var tmp = overAllCurrentTime - opt.delay;
    		if(tmp > 0  && !a.callbackCalled){
    			if(tmp < duration * opt.loop){
	    			var currentLoopMinusOne = Math.floor(tmp/duration);
	    			a.animation.applyAnimation(animatable, tmp - duration*currentLoopMinusOne, overAllstartTime, duration, opt.easing);
	    			//combinedEasing is animation.getOption("easing"), which means, that we have this in the options if there was no easing added while addAnimation()
    			}else{
    				opt.callback();
    				this.finishedAnimationsCounter++;
    				if(this.finishedAnimationsCounter === animations.length) this.resetFlags();
    			}
    		}
    	}
    };

    /** @inheritDoc */
    ca.setOptions = function(opt){
		if(opt.loop)
			this.loop = opt.loop;
		if(opt.duration)
			this.duration = opt.duration;
		if(opt.easingk && typeof(opt.easing) === "function")
			this.easing = opt.easing;
		if(opt.callback && typeof(opt.callback) === "function")
			this.callback = opt.callback;
    };
    
	/** @inheritDoc */
	ca.getOptions = function(){
		return {duration: this.duration, loop: this.loop, delay: this.delay, easing: this.easing, callback: this.callback};
	};
	
//export
XMOT.CombinedAnimation = CombinedAnimation;
}());
(function(){
	/**
	 * ConstraintCollection
	 * Combines a number of constraints
	 * @constructor
	 * @param {Array.<Constraint>|undefined} constraints
	 * @param {boolean} breakEarly do not check all constraints if one fail
	 * @implements {Constraint}
	 */
	var ConstraintCollection = function(constraints, breakEarly){
		/**
		 * Collection of Contraints
		 * @private
		 * @type {Array.<Constraint>|undefined}
		 */
		this.constraints = constraints == undefined ? [] : constraints;
		/**
		 * break early flag
		 * @private
		 * @type{boolean}
		 */
		this.breakEarly = breakEarly || true;
	};
	var c = ConstraintCollection.prototype;

	/** @inheritDoc */
    c.constrainRotation = function(newRotation, moveable){
    	var constraints = this.constraints;
    	var length = constraints.length;
		var i = 0;
		var ret = true;
		var breakEarly = this.breakEarly;
		
		while( i<length && (ret || !breakEarly) ){
			ret = ret && constraints[i].constrainRotation(newRotation, moveable);
			i++;
		}
    	return ret;
    };

    /** @inheritDoc */
    c.constrainTranslation = function(newPosition, moveable){
    	var constraints = this.constraints;
		var length = constraints.length;
		var i = 0;
		var ret = true;
		var breakEarly = this.breakEarly;
		while( i<length && (ret || !breakEarly) ){
			ret = ret && constraints[i].constrainTranslation(newPosition, moveable);
			i++;
		}
    	return ret;
    };

    /**
     * Adds a constraint to the collection
     * @param {Constraint} constraint
     */
    c.addConstraint = function(constraint){
		this.constraints.push(constraint);
    };

    /**
     * Removes a constraint from the collection
     * @param {Constraint} constraint
     */
    c.removeContraint = function(constraint){
		var i = this.constraints.indexOf(constraint);
		//indexOf returns -1 if item was not found
		if(i !== -1) this.constraints.splice(i,1);
    };

    //export
    XMOT.ConstraintCollection = ConstraintCollection;
}());
(function(){
	/**
	 * SimpleConstraint
	 * @constructor
	 * @param {boolean} allowedToMove
	 * @param {boolean} allowedToRotate
	 * @implements {Constraint}
	 */
	var SimpleConstraint = function(allowedToMove, allowedToRotate){
		/**
		 * allowed to move
		 * @private
		 * @type {boolean}
		 */
		this.allowedToMove = allowedToMove;
		/**
		 * allowed to Rotate
		 * @private
		 * @type {boolean}
		 */
		this.allowedToRotate = allowedToRotate;
	};
	var s = SimpleConstraint.prototype;

	/** @inheritDoc */
    s.constrainRotation = function(newRotation, moveable){
		return this.allowedToRotate;
    };

    /** @inheritDoc */
    s.constrainTranslation = function(newPosition, moveable){
		return this.allowedToMove;
    };

    //export
    XMOT.SimpleConstraint = SimpleConstraint;
}());
(function(){
	/**
	 * ProhibitAxisMovementConstraint
	 * prohibit axismovement, but allow movement around an epsilon of a specified center
	 * @constructor
	 * @param {Boolean} x prohibit x axis
	 * @param {Boolean} y prohibit y axis
	 * @param {Boolean} z prohibit z axis
	 * @param {number} epsilon
	 * @param {number} center
	 * @implements {Constraint}
	 */
	var ProhibitAxisMovementConstraint = function(x,y,z, epsilon, center){
		/**
		 * prohibit x axis
		 * @private
		 * @type {Boolean}
		 */
		this.x = x;
		/**
		 * prohibit y axis
		 * @private
		 * @type {Boolean}
		 */
		this.y = y;
		/**
		 * prohibit z axis
		 * @private
		 * @type {Boolean}
		 */
		this.z = z;
		/**
		 * epsilon
		 * @private
		 * @type {number}
		 */
		this.epsilon = epsilon ? epsilon : 0;
		/**
		 * center
		 * @private
		 * @type {number}
		 */
		this.center =  center ? center : 0;

	};
	var c = ProhibitAxisMovementConstraint.prototype;

	/** @inheritDoc */
    c.constrainRotation = function(newRotation, moveable){
		return true;
    };

    /** @inheritDoc */
    c.constrainTranslation = function(newPosition, moveable){
    	var center = this.center;
    	var epsilon = this.epsilon;
    	var currentPosition = moveable.getPosition();
		if(this.x && Math.abs(center - newPosition[0]) > epsilon) newPosition[0] = currentPosition[0];
		if(this.y && Math.abs(center - newPosition[1]) > epsilon) newPosition[1] = currentPosition[1];
		if(this.z && Math.abs(center - newPosition[2]) > epsilon) newPosition[2] = currentPosition[2];
    	return true;
    };

    //export
    XMOT.ProhibitAxisMovementConstraint = ProhibitAxisMovementConstraint;
}());
(function(){
	/**
	 * A CameraController
	 * In order to use this gamepad functiponality of this class do as follows:
	 * 1. Use Chrome.
	 * 2. Get A XBox360 Controller.
	 * 3. Activate the gamepad api of chrome -> about:flags
	 * 4. Add the gamepad.js to your application: http://www.gamepadjs.com/
	 * 5. Have Fun :-)
	 * @constructor
	 * @param {string} camera_id name of the group of the camera
	 * @param {Array.<number>} initialRotation rotation to rotate the camera in a manner, that "forward" is a movement along -z
	 */
	function CameraController(camera_id, initialRotation){
		/**
		 * @private
		 * @type {Object}
		 */
		this.currentlyPressedKeys = {};
		/**
		 * Points of Interest
		 * @private
		 * @type {Array.<{pos:Array.<number>, ori:Array.<number>}>}
		 */
		this.poi = [];
		/**
		 * Time to move to the next poi in milliseconds
		 * @private
		 * @type {number}
		 */
		this.poiMoveToTime = 3000; //ms
		/**
		 * last visited poi
		 * @private
		 * @type {number}
		 */
		this.currentPoi = 0;
		/**
		 * needed to check if the used poi button is released before triggering the next movement
		 * @private
		 * @type {boolean}
		 */
		this.allowPoi = true; 
		/**
		 * Old mouse position
		 * @private
		 * @type {{x: number, y: number}}
		 */
		this.oldMousePosition = {x:0,y:0};
		/**
		 * flag: mouse button currently down
		 * @private
		 * @type {boolean}
		 */
		this.mouseButtonIsDown = false;
		/**
		 * factor to slow or speed movement
		 * @private
		 * @type {number}
		 */
		this.slowthis = 1;
		/**
		 * Sensivity for movement of gamepad
		 * @private
		 * @type {number}
		 */
		this.moveSensivityPad = 0.4 * this.slowthis;
		/**
		 * Sensivity for rotation of gamepad
		 * @private
		 * @type {number}
		 */
		this.rotationSensivityPad = 0.0025 * this.slowthis;
		/**
		 * Sensivity for movement of keyboard
		 * @private
		 * @type {number}
		 */
		this.moveSensivityKeyboard = 0.75 * this.slowthis;
		/**
		 * Sensivity for rotation of mouse and keyboard
		 * @private
		 * @type {number}
		 */
		this.rotationSensivityMouse = 0.005 * this.slowthis;
		/**
		 * Angle, that we currently look up or down
		 * @private
		 * @type {number}
		 */
		this.angleUp = 0;
		/**
		 * Constraint
		 * @private
		 * @type {ConstraintCollection}
		 */
		this.constraint = new XMOT.ConstraintCollection();
	
		var factory = new XMOT.ClientMotionFactory();
		var cam = document.getElementById(camera_id);
		/**
		 * The Moveable
		 * @private
		 * @type {Moveable}
		 */
		this.moveable = factory.createMoveable(cam, this.constraint);
		this.moveable.rotate(initialRotation);
		/**
		 * starting point of the moveable, used to reset position and orientation
		 * @private
		 * @type {{position: Array.<number>, orientation: Array.<number>}}
		 */
		this.startingPoint = {position:this.moveable.getPosition(), orientation:this.moveable.getOrientation()};
	
		this.initEvents();

		//finally, register in the animation loop
		if( !XMOT.registeredCameraController){
			XMOT.registeredCameraController = this;
			XMOT.animate();
		}
		else
			throw "Only one CameraController allowed.";
	};
	var cc = CameraController.prototype;

	/**
	 * Get current position in local space
	 * @public
	 * @return {Array.<number>} 3D vector
	 */
	cc.getPosition = function(){
		return this.moveable.getPosition();
	};

	/**
	 * Get current orientation in local space
	 * @public
	 * @return {Array.<number>} quaternion
	 */
	cc.getOrientation = function(){
		return this.moveable.getOrientation();
	};

	// public:
	/**
	 * Add a Point of Interest
	 * @public
	 * @param {Array.<number>} position
	 * @param {Array.<number>} orientation
	 * @return {CameraController} this
	 */
	cc.addPointOfInterest = function(position, orientation){
		this.poi.push({pos:position, ori:orientation});
		return this;
	};

	/**
	 * Remove the latest added Point of Interest
	 * @public
	 * @return {CameraController} this
	 */
	cc.removePointOfInterest = function(){
		this.poi.pop();
		return this;
	};

	/**
	 * Add a Constraint
	 * @public
	 * @param {Constraint} constraint
	 */
	cc.addConstraint = function(constraint){
		this.constraint.addConstraint(constraint);
	};

	/**
	 * Update movement
	 * @public
	 */
	cc.update = function(){
		this.updateController();
		this.updateKeyMovement();
	};

	// private:
	/**
	 * updates the controller - gets called autmatically
	 * To use the Controller the gamepad.js is needed as well.
	 * @private
	 */
	cc.updateController = function() {
		if(!window.Gamepad)return;
		var pads = Gamepad.getStates();
		for ( var i = 0; i < pads.length; ++i) {
			var pad = pads[i];
			if (pad) {
				if(pad.rightShoulder1){ //lower shoulder buttons
					this.nextPoi();
				}
				if(pad.leftShoulder1){
					this.beforePoi();
				}
				if(pad.rightShoulder0){ //upper shoulder buttons
					this.moveUpAndDown(-this.moveSensivityPad);
				}
				if(pad.leftShoulder0){
					this.moveUpAndDown(this.moveSensivityPad);
				}
				if(pad.start){
					this.reset();
				}
				//back and for
				var y = (pad.leftStickY < -0.15 || pad.leftStickY > 0.15) ? pad.leftStickY : 0;
				if(y != 0) this.moveBackAndForward(y*this.moveSensivityPad);
				//left and right - transalte
				var x = (pad.leftStickX < -0.15 || pad.leftStickX > 0.15) ? pad.leftStickX : 0;
				if(x != 0) this.moveLeftAndRight(x*this.moveSensivityPad);
				//up and down
				var rotUpDown = (pad.rightStickY < -0.15 || pad.rightStickY > 0.15) ? pad.rightStickY : 0;
				if(rotUpDown != 0) this.rotateCameraUpAndDown(-this.rotationSensivityPad*rotUpDown);
				//left and right - rotate
				var rotLeftRight = (pad.rightStickX < -0.15 || pad.rightStickX > 0.15) ? pad.rightStickX : 0;
				if(rotLeftRight != 0) this.rotateCameraLeftAndRight(-this.rotationSensivityPad*rotLeftRight);
			}
		}
	};

	// ---------- functions to handle movement ----------
	/**
	 * Move camera back and forward
	 * @private
	 * @param {number} l length of the movement
	 */
	cc.moveBackAndForward = function(l){
		var vecX = [0, 0, 1];
		var result = vec3.create();
		quat4.multiplyVec3(this.moveable.getOrientation(),vecX, result);
		this.moveable.translate(vec3.scale(vec3.normalize(result), l));
	};

	/**
	 * Move camera left and right (strafe)
	 * @private
	 * @param {number} l length of the movement
	 */
	cc.moveLeftAndRight = function(l){
		var vecY = [1, 0, 0]; // global x is local z of the camera
		var result = vec3.create();
		quat4.multiplyVec3(this.moveable.getOrientation(),vecY, result);
		this.moveable.translate(vec3.scale(vec3.normalize(result), l));
	};

	/**
	 * Move camera Up and Down
	 * @private
	 * @param {number} l length of the movement
	 */
	cc.moveUpAndDown = function(l){
		var vecY = [0, 1, 0];
		var result = vec3.create();
		quat4.multiplyVec3(this.moveable.getOrientation(),vecY, result);
		this.moveable.translate(vec3.scale(vec3.normalize(result), l));
	};

	/**
	 * Move to the next Point of Interest
	 * @private
	 */
	cc.nextPoi = function(){
		if(this.poi.length == 0 || !this.allowPoi || this.moveable.movementInProgress()) return;

		this.currentPoi = this.currentPoi == this.poi.length-1 ? 0 : this.currentPoi+1;
		var movetopoi = this.poi[this.currentPoi];
		this.allowPoi = false;

		this.preventRolling();
		var that = this;
		this.moveable.moveTo(movetopoi.pos, movetopoi.ori, this.poiMoveToTime, {queueing: false, callback: function(){that.moveToCallback();}});
	};

	/**
	 * Move to the next Point of Interest
	 * @private
	 */
	cc.beforePoi = function(){
		if(this.poi.length == 0 || !this.allowPoi || this.moveable.movementInProgress()) return;

		this.currentPoi = this.currentPoi == 0 ? this.poi.length-1 : this.currentPoi-1;
		var movetopoi = this.poi[this.currentPoi];
		this.allowPoi = false;

		this.preventRolling();
		var that = this;
		this.moveable.moveTo(movetopoi.pos, movetopoi.ori, this.poiMoveToTime, {queueing: false, callback: function(){that.moveToCallback();}});
	};

	/**
	 * rotate up/down before any other movement, this prevends from rolling
	 * @private
	 */
	cc.preventRolling = function(){
		this.moveable.rotate( XMOT.axisAngleToQuaternion( [1,0,0], -this.angleUp) );
		this.angleUp = 0;
	};

	/**
	 * Rotates the camera up and down by an given angle
	 * @private 
	 * @param {number} angle
	 */
	cc.rotateCameraUpAndDown = function(angle){
		this.angleUp += angle*Math.PI;
		this.moveable.rotate( XMOT.axisAngleToQuaternion( [1,0,0], angle*Math.PI) );
	};

	/**
	 * Rotates the camera left and right by an given angle
	 * @private 
	 * @param {number} angle
	 */
	cc.rotateCameraLeftAndRight = function(angle){
		//rotate up/down befor rotating sidewards, this prevends from rolling
		this.moveable.rotate( XMOT.axisAngleToQuaternion( [1,0,0], -this.angleUp) );
		this.moveable.rotate( XMOT.axisAngleToQuaternion( [0,1,0], angle*Math.PI) );
		//and rotate up/down again
		this.moveable.rotate( XMOT.axisAngleToQuaternion( [1,0,0], this.angleUp) );
	};

	/**
	 * Resets the camera to the starting Position
	 * @private 
	 */
	cc.reset = function(){
		this.moveable.setPosition(this.startingPoint.position);
		this.moveable.setOrientation(this.startingPoint.orientation);
		this.angleUp = 0;
	};

	/**
	 * Callback of the movement to a PoI
	 * Needed to prevent movement while we move to a PoI
	 * @private 
	 */
	cc.moveToCallback = function(){
		this.allowPoi = true;
	};
	
	// ---------- event handler ----------

	/**
	 * Init Events
	 * @private
	 */
	cc.initEvents = function(){
		//registered on window, since registring on div did not work, events never triggered
		var that = this;
		window.addEventListener("keydown", function(e){that.keypressEventHandler(e);}, false);
		window.addEventListener("keyup", function(e){that.keyUpEventHandler(e);}, false);
		window.addEventListener("mousemove", function(e){that.mouseMovementHandler(e);}, false);
		window.addEventListener("mousedown", function(e){that.mouseDownHandler(e);}, false);
		window.addEventListener("mouseup", function(e){that.mouseUpHandler(e);}, false);
	};

	/**
	 * Handles key events
	 * @private
	 * @param {Event} e event
	 */
	cc.keypressEventHandler = function(e){
		if(!this.allowPoi) return;
		e = window.event || e;
		var kc = e.keyCode;
		if(! this.currentlyPressedKeys[kc])
		{
			var flag = this.moveWithKey(kc);
			if(flag){
				this.currentlyPressedKeys[kc] = true;
			}
			switch(kc){
				case 69 : this.nextPoi(); break; // q
				case 81 : this.beforePoi(); break; // e
				case 82 : this.reset(); break; //r
				default : flag = false; break;
			}
			if(flag) this.stopDefaultEventAction(e);
		}
	};

	/**
	 * Removes key from the list of currently pressed keys
	 * @param
	 * @param {Event} e
	 */
	cc.keyUpEventHandler = function(e){
	    if(!this.allowPoi) return;
	    e = window.event || e;
	    delete this.currentlyPressedKeys[e.keyCode];
	};

	/**
	 * handle single key
	 * @private
	 * @param {number} keyCode
	 * @return {boolean}
	 */
	cc.moveWithKey = function(keyCode){
	    switch(keyCode){
			case 83 : this.moveBackAndForward(this.moveSensivityKeyboard); break; // s
			case 87 : this.moveBackAndForward(-this.moveSensivityKeyboard); break; // w
			case 65 : this.moveLeftAndRight(-this.moveSensivityKeyboard); break; // a
			case 68 : this.moveLeftAndRight(this.moveSensivityKeyboard); break; // d
			case 33 : this.moveUpAndDown(this.moveSensivityKeyboard); break; //page up
			case 34 : this.moveUpAndDown(-this.moveSensivityKeyboard); break; //page down
			case 38 : this.rotateCameraUpAndDown(this.rotationSensivityMouse); break; // up Arrow
			case 40 : this.rotateCameraUpAndDown(-this.rotationSensivityMouse); break; // down Arrow
			case 37 : this.rotateCameraLeftAndRight(this.rotationSensivityMouse); break; // left Arrow
			case 39 : this.rotateCameraLeftAndRight(-this.rotationSensivityMouse); break; // right Arrow
	        default : return false; break;
	    }
	    return true;
	};

	/**
	 * update movement of currently pressed keys
	 * @private
	 */
	cc.updateKeyMovement = function(){
	    for(var kc in this.currentlyPressedKeys){
	        this.moveWithKey(kc*1); //*1 -> to make its a number now
	    }
	};

	/**
	 * Handles mousemovement events
	 * @private
	 * @param {Event} e event
	 */
	cc.mouseMovementHandler = function(e){
		if(!this.mouseButtonIsDown || !this.allowPoi) return;
		var currentX = e.pageX;
		var currentY = e.pageY;
		var x = currentX - this.oldMousePosition.x;
		var y = currentY - this.oldMousePosition.y;
		this.oldMousePosition.x = currentX;
		this.oldMousePosition.y = currentY;
		if(x != 0)
			this.rotateCameraLeftAndRight(-this.rotationSensivityMouse*x);
		if(y != 0)
			this.rotateCameraUpAndDown(-this.rotationSensivityMouse*y);
	};

	/**
	 * Handles mousebutton up event
	 * @private
	 * @param {Event} e event
	 */
	cc.mouseUpHandler = function(e){
		if(e.button == 2){
			this.stopDefaultEventAction(e);
			this.mouseButtonIsDown = false;
		}
	};

	/**
	 * Handles mousebutton down events
	 * @private
	 * @param {Event} e event
	 */
	cc.mouseDownHandler = function(e){
		if(e.button == 2){
			this.stopDefaultEventAction(e);
			this.mouseButtonIsDown = true;
			this.oldMousePosition.x = e.pageX;
			this.oldMousePosition.y = e.pageY;
		}
	};

	/**
	 * Stops HTML Default action of events
	 * Note: in some Browsers the context menu still apears, but there is a workaround:
	 * <body ... oncontextmenu="return false;">
	 * @param {Object} e event
	 */
	cc.stopDefaultEventAction = function(e){
		if (e && e.preventDefault) {
			e.preventDefault();
		} else if (window.event && window.event.returnValue){
			window.eventReturnValue = false;
		}
	};

	XMOT.CameraController = CameraController;
}());(function() {

    /**
     * @constructor
     */
    var ExamineController = function(cameraGroup, opt) {
        var cam = typeof cameraGroup == 'string' ? document.getElementById(cameraGroup) : cameraGroup;

        /**
         * Constraint
         *
         * @private
         * @type {ConstraintCollection}
         */
        this.constraint = new XMOT.ConstraintCollection();
        var factory = new XMOT.ClientMotionFactory();
        /**
         * The Moveable
         *
         * @private
         * @type {Moveable}
         */
        this.moveable = factory.createMoveable(cam, this.constraint);
        var xml3d = this.getScene(cam) || {};
        this.canvas = {};
        this.canvas.width = xml3d.width || 800;
        this.canvas.height = xml3d.height || 600;

        opt = opt || {};
        this.rotateSpeed = opt.rotateSpeed || 1;
        this.dollySpeed = opt.dollySpeed || 40;
        this.sceneRadius = opt.sceneRadius || this.getSceneRadius(xml3d);
        this.revolveAroundPoint = opt.revolveAroundPoint || this.getRevolveAroundPointFromScene(xml3d);

        this.lastPos = {
            x : -1,
            y : -1
        };
    };

    ExamineController.NONE = 0;
    ExamineController.ROTATE = 1;
    ExamineController.DOLLY = 2;

    ExamineController.prototype.action = ExamineController.NONE;

    ExamineController.prototype.getScene = function(element) {
        var xml3d = element;
        while (xml3d.nodeName != "xml3d" && xml3d.parentNode)
            xml3d = xml3d.parentNode;
        return xml3d && xml3d.nodeName == "xml3d" ? xml3d : null;
    };

    ExamineController.prototype.getSceneRadius = function(xml3d) {
        if (xml3d && xml3d.getBoundingBox) {
            var length = xml3d.getBoundingBox().size().length() || 1;
            return length * 0.5;
        }
        return 1;
    };

    ExamineController.prototype.getRevolveAroundPointFromScene = function(xml3d) {
        if (xml3d && xml3d.getBoundingBox) {
            var bb = xml3d.getBoundingBox();
            if (!bb.isEmpty()) {
                var c = bb.center();
                return vec3.create([ c.x, c.y, c.z ]);
            }
        }
        return vec3.create([ 0, 0, 0 ]);
    };

    ExamineController.prototype.rotateAroundPoint = function(rot, point) {
        this.moveable.rotate(rot);
        var aa = XMOT.quaternionToAxisAngle(rot);
        var q = XMOT.axisAngleToQuaternion(this.inverseTransformOf(aa.axis), aa.angle);
        var trans = quat4.multiplyVec3(q, vec3.subtract(this.moveable.getPosition(), point, vec3.create()), vec3.create());
        this.moveable.setPosition(vec3.add(point, trans, vec3.create()));
    };

    ExamineController.prototype.inverseTransformOf = function(vec) {
        return quat4.multiplyVec3(this.moveable.getOrientation(), vec, vec3.create());
    };

    ExamineController.prototype.start = function(pos, action) {
        this.lastPos.x = pos.x;
        this.lastPos.y = pos.y;
        this.action = action || ExamineController.NONE;
    };

    ExamineController.prototype.stop = function() {
        this.action = ExamineController.NONE;
    };

    ExamineController.prototype.doAction = function(pos) {
        if (!this.action)
            return;

        var canvas = this.canvas;

        switch (this.action) {
        case (ExamineController.DOLLY):
		    var coef = 0.2 * this.sceneRadius;
            var dy = coef * this.dollySpeed * (pos.y - this.lastPos.y) / canvas.height;
            this.moveable.translate(this.inverseTransformOf([ 0, 0, dy ]));
            break;
        case (ExamineController.ROTATE):
            var dx = -this.rotateSpeed * (pos.x - this.lastPos.x) * 2.0 * Math.PI / canvas.width;
            var dy = -this.rotateSpeed * (pos.y - this.lastPos.y) * 2.0 * Math.PI / canvas.height;

            var mx = XMOT.axisAngleToQuaternion([ 0, 1, 0 ], dx);
            var my = XMOT.axisAngleToQuaternion([ 1, 0, 0 ], dy);
            var result = quat4.multiply(mx, my);
            this.rotateAroundPoint(result, this.revolveAroundPoint);
            break;
        }
        this.lastPos.x = pos.x;
        this.lastPos.y = pos.y;
    };

    XMOT.ExamineController = ExamineController;

}());