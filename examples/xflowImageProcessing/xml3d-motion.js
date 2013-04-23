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

@version: 0.2.0 
**/
                    
/** @namespace **/
var XMOT = XMOT || {};

/** @define {string} */
XMOT.version = '0.2.0';

(function() {

    /**
     * A MotionFactory.
     * @interface
     */
    var MotionFactory = function() {};
    var m = MotionFactory.prototype;

    /**
     * Creates a Transformable out of the given object
     * @param {Object} object base for the Transformable
     * @param {Constraint} constraint Constrain movement
     * @return {Transformable} created Transformable
     */
    m.createTransformable = function(object, constraint){};

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
     * A Transformable.
     * @interface
     */
    var Transformable = function() {};
    var p = Transformable.prototype;

    /**
     * Sets the absolute position of the Transformable in local space.
     * @param {XML3DVec3} position position as 3d vector in local space
     * @return {Transformable} the Transformable
     */
    p.setPosition = function(position){};

    /**
     * Sets the absolute orientation of the Movebale in local space.
     * @param {XML3DRotation>} orientation orientation as quaternion in local space
     * @return {Transformable} the Transformable
     */
    p.setOrientation = function(orientation){};

    /**
     * Sets a new scale factor
     * @param {XML3DVec3} scale scale factor
     */
    p.setScale = function(scale){};

    /**
     * Gets the current position
     * @return {XML3DVec3} position
     */
    p.getPosition = function(){};

    /**
     * Gets the current orientation as quaternion
     * @return {XML3DRotation} orientation
     */
    p.getOrientation = function(){};

    /**
     * Gets the current scale factor
     * @return {XML3DVec3} scale factor
     */
    p.getScale = function(){};

    /**
     * Translate the Transformable by a given Vector.
     * @param {XML3DVec3} translation 3d Vector
     * @return {Transformable} the Transformable
     */
    p.translate = function(translation){};

    /**
     * Rotates the Transformable by a given Quaternion.
     * @param {XML3DRotation} rotation Quaternion
     * @return {Transformable} the Transformable
     */
    p.rotate = function(rotation){};

    /**
     * Scales the transformable by a given vector
     * @param {XML3DVec3} factor scale factor
     * @return {Transformable} the Transformable
     */
    p.scale = function(factor){};

    /**
     * Interpolated translation over time to position in local space.
     * The animation is put into a fifo-queue and will be eventually executed.
     * @param {XML3DVec3|undefined} position local space Vector
     * @param {XML3DRotation|undefined} orientation orientation Quaternion
     * @param {number} time when to reach the position, in milliseconds
     * @param {{delay: number, easing: Function, queueing: Boolean, callback: Function}=} opt options
     * @return {Transformable} the Transformable
     */
    p.moveTo = function(position, orientation, time, opt){};

    /**
     * Returns true if a movement is currently in progress
     * @return {Boolean}
     */
    p.movementInProgress = function(){};

    /**
     * Stops the current movement and cancels every queued movement.
     * @return {Transformable} the Transformable
     */
    p.stop = function(){};

    /**
     * Sets a constraint for the Transformable. The constraint is checked
     * @param {Constraint} constraint Set a constraint to the Transformable
     */
    p.setConstraint = function(constraint){};


    /**
     * An Animatable
     * @extends Transformable
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
     * Checks if a rotation operation is valid. The first argument might be 
     * further constrained inside the method. 
     * 
     * @param {XML3DRotation} newRotation Quaternion, the new rotation
     * @param {{transformable: Transformable}} [opts] options for the constraint-check
     * @return {boolean} returns true if the operation is valid, false otherwise
     */
    c.constrainRotation = function(newRotation, opts){};

    /**
     * Checks if a translation operation is valid. The first argument might be 
     * further constrained inside the method. 
     * 
     * @param {XML3DVec3} newTranslation, the new translation
     * @param {{transformable: Transformable}} [opts] options for the constraint-check
     * @return {boolean} returns true if the operation is valid, false otherwise
     */
    c.constrainTranslation = function(newTranslation, opts){};

    /**
     * Checks if a scaling operation is valid. The first argument might be 
     * further constrained inside the method. 
     * 
     * @param {XML3DVec3} newScale the new scaling
     * @param {{transformable: Transformable}} [opts] options for the constraint-check
     * @return {boolean} returns true if the operation is valid, false otherwise
     */
    c.constrainScaling = function(newScale, opts){};
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
/** 
 * This file constructs the XMOT.math namespace.
 */
(function() {
    
    if (!XMOT.math)
        XMOT.math = {};
    
    var m = XMOT.math; 

    /**
     * Converts axis angle representation into an quaternion
     * @param {Array.<number>} axis
     * @param {number} angle
     * @return {Array.<number>} quaternion
     */
    m.axisAngleToQuaternion = function(axis, angle) {
        var normAxis = XMOT.math.normalizeVector(axis);
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
    m.normalizeVector = function(vector) {
        var length = Math.sqrt( vector[0]*vector[0] + vector[1]*vector[1] + vector[2]*vector[2] );
        if(length == 0) return vector;
        return [vector[0]/length, vector[1]/length, vector[2]/length];
    };

    /**
     * Converts a quaternion into an axis angle representation
     * @param {Array.<number>} quat
     * @return {{axis: Array.<number>, angle:number}}
     */
    m.quaternionToAxisAngle = function(quat) {
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
     * @param{XML3DRotation} from quaternion from
     * @param{XML3DRotation} to quaternion to
     * @param{number} t interpolation parameter
     */
    m.slerp = function(from, to, t) {
        var result = new XML3DRotation();
        // Calculate angle between them -> dotProduct
        var fromAsArray = from.getQuaternion();
        var toAsArray = to.getQuaternion();
        var dotProduct = fromAsArray[0] * toAsArray[0] + fromAsArray[1] * toAsArray[1] + fromAsArray[2] * toAsArray[2] + fromAsArray[3] * toAsArray[3];
        //invert, to make sure we interpolate the shortest way
        if( dotProduct < 0 )
        {
            dotProduct = -dotProduct;
            toAsArray[0] = -toAsArray[0];
            toAsArray[1] = -toAsArray[1];
            toAsArray[2] = -toAsArray[2];
            toAsArray[3] = -toAsArray[3];
        }

        var p = 0;
        var q = 0;
        if( (1-dotProduct) > 0.0001 ) {
            //default case
            var omega = Math.acos(dotProduct);
            var sinomega = Math.sin(omega);
            p = Math.sin((1-t)*omega) / sinomega;
            q = Math.sin(t*omega) / sinomega;
        }
        else {
            //linear interpolation
            p = 1.0-t;
            q = t;
        }

        var x = p * fromAsArray[0] + q * toAsArray[0];
        var y = p * fromAsArray[1] + q * toAsArray[1];
        var z = p * fromAsArray[2] + q * toAsArray[2];
        var w = p * fromAsArray[3] + q * toAsArray[3];
        result.setQuaternion( new XML3DVec3(x, y, z), w);
		return result;
    };

    /** Convert degrees to radians. 
     * 
     *  @param {number} deg angle in degrees.
     *  @return {number} given angle in radians.  
     */
    m.degToRad = function(deg)
    {
        return (deg*(Math.PI/180));
    };
    
    /** Convert radians to degrees  
     * 
     *  @param {number} rad angle in radians
     *  @return {number} given angle in degrees.  
     */
    m.radToDeg = function(rad)
    {
        return (rad*(180/Math.PI));
    };
    
    /** Interpret the given vector as a scaling property and convert it 
     *  to the inverse scaling, which is defined by 1 divided by the vector's 
     *  components. 
     *  
     *  @param {XML3DVec3} vec the scaling vector to convert
     *  @return {XML3DVec3} the inverse scaling vector
     */
    m.vecInverseScale = function(vec)
    {
        return new XML3DVec3(1/vec.x, 1/vec.y, 1/vec.z);
    }; 
    
    /** Intersect a given ray with a plane formed by plOrigin and plNormal. 
     *  It will store the hit point in the last given argument and return 
     *  a number, which describes the intersection. 
     *
     *  @param {XML3DRay} ray 
     *  @param {XML3DVec3} plOrigin
     *  @param {XML3DVec3} plNormal 
     *  @param {XML3DVec3} hitPoint
     *  @return {number} -1 if ray inside plane, 0 if no intersection, 1 if intersection at single point
     */
    m.intersectRayPlane = function(ray, plOrigin, plNormal, hitPoint)
    {
        // Algorithm taken from http://en.wikipedia.org/wiki/Line-plane_intersection
    
        var d = plOrigin.dot(plNormal);
    
        // calculate distance t on ray
        var num = d - ray.origin.dot(plNormal);
        var denom = ray.direction.dot(plNormal);
    
        if(Math.abs(denom) < XML3D.EPSILON)
        {
            if(Math.abs(num) < XML3D.EPSILON)
                return -1;
            else
                return 0;
        }
    
        var t = num / denom;
    
        // calculate hit point
        if(hitPoint !== undefined)
        {
            var scalDir = ray.direction.scale(t);
            var hit = ray.origin.add(scalDir);
    
            hitPoint.x = hit.x;
            hitPoint.y = hit.y;
            hitPoint.z = hit.z;
        }
    
        return 1;
    };
    
    /** Computes the transformation matrix from the given source plane to
     * the destination plane.
     *
     * @param {XML3DVec3} srcOrig
     * @param {XML3DVec3} srcNorm
     * @param {XML3DVec3} [destOrig] if not given, (0,0,0) is taken
     * @param {XML3DVec3} [destNorm]  if not given, (0,0,1) is taken
     *
     * @return {XML3DMatrix} a matrix that represents the transformation from 
     *                  source to destination.
     */
    m.getTransformPlaneToPlane = function(srcOrig, srcNorm, destOrig, destNorm)
    {
        // default params
        if(!destOrig)
            destOrig = new window.XML3DVec3(0,0,0);
        if(!destNorm)
            destNorm = new window.XML3DVec3(0,0,1);
    
        // generate translation & rotation
        var transl = destOrig.subtract(srcOrig);
        var rot = new window.XML3DRotation();
        rot.setRotation(srcNorm, destNorm);
    
        // make matrix
        var xfmMat = new window.XML3DMatrix(); 
        xfmMat = xfmMat.translate(transl.x, transl.y, transl.z);
        xfmMat = xfmMat.rotateAxisAngle(rot.axis.x, rot.axis.y, rot.axis.z, rot.angle);
    
        return xfmMat;
    };

}());
(function(){   
    
    /**
     * XMOT.Class provides a framework for constructing classes.
     *
     * The basic handling is borrowed from JS.class (http://jsclass.jcoglan.com/).
     * The callSuper() idea is taken from Base (http://dean.edwards.name/weblog/2006/03/base/).
     *
     * @param {Object} [base] the base class to inherit from
     * @param {!Object} body the body of the class
     *
     * This class has following features:
     * o initialize(): define this function and it will be called during object construction
     * o callSuper(): invoke in child class to call the overriden super-class method
     * o callback(<methodname>): wraps the given function to be registered as a callback.
     *
     * Notes about callback():
     *     The method returned from callback() preserves the "this" variable inside the
     *     class method.
     *     Beware with overriden functions in subclasses. Only the first call to
     *     callback(myName) creates the callback for the method myName. All further calls
     *     to callback(myName) return the initally created object!
     *
     *  In english: if a base class uses a method onClick() as a callback, you
     *  in the inherited class should not use another method onClick() as a callback
     *  for yourself, since callback("onClick") will always return the callback of the
     *  base class. (Assuming the base class registers itself first).
     */
    XMOT.Class = function(base, body)
    {    
        if(!body)
        {
            body = base; 
            base = null; 
        } 
    
        // constructor idea taken from JS.class (http://jsclass.jcoglan.com/)
        var constructor = function() {
    
            if(this.initialize)
                return this.initialize.apply(this, arguments) || this;
    
            return this;
        };
    
        if(base) // inheritance
        {
            constructor.prototype = makeBridge(base);
    
            // remember parent methods
            var methods = extractMethods(base.prototype);
            XMOT.extend(constructor.prototype.__parentMethods, methods);
        }
        else // base class initialization
        {
            constructor.prototype.callSuper = function() {};
            constructor.prototype.__parentMethods = {};
    
            // method wrapper for callbacks
            constructor.prototype.callback = function(methodName){
    
                if(!this.__callbacks)
                    this.__callbacks = {};
    
                if(!this.__callbacks[methodName])
                {
                    var method = this[methodName]; // get the method
                    var self = this;
    
                    this.__callbacks[methodName] = function() {
                        return method.apply(self, arguments);
                    };
                }
    
                return this.__callbacks[methodName];
            };
        }
    
        // extend the class' prototype with the given body
        XMOT.extend(constructor.prototype, body);
    
        // wrap functions
        for(var name in constructor.prototype)
        {
            // retrieve and validate target function
            var origFn = constructor.prototype[name];
            if(!origFn
            || origFn.constructor !== Function
            || !isClientMethod(name))
                continue;
            
            // skip methods that don't contain callSuper() calls
            var fnstr = "" + origFn; 
            if(0 > fnstr.indexOf("this.callSuper"))
                continue; 
    
            // wrap original call into function that sets the
            // callSuper property to the method of the base class
            (function(){
                var fn = origFn;
                var baseMethod = constructor.prototype.__parentMethods[name];
                if(!baseMethod)
                    baseMethod = function() {};
    
                constructor.prototype[name] = function() {
                    // This idea is taken from Base (http://dean.edwards.name/weblog/2006/03/base/)
                    var prev = this.callSuper;
                    this.callSuper = baseMethod;
    
                    var ret = fn.apply(this, arguments);
    
                    this.callSuper = prev;
                    return ret;
                };
            })();
        }
    
        return constructor;
    };

    /** XMOT.Singleton is a small utility to create singleton classes. 
     *  The idea is also taken from JS.class (http://jsclass.jcoglan.com/).
     *  Thus, see http://jsclass.jcoglan.com/singletons.html for more information. 
     *  
     *  The advantage is that we can still use all the features from the 
     *  XMOT.Class utility. 
     */
    XMOT.Singleton = function(base, body) 
    {        
        var cls = new XMOT.Class(base, body);
        
        var inst = new cls();
        inst.klass = cls; 
        
        return inst; 
    };
    
    /**
     * This function is a copy from JS.class.
     * 
     * @param {!Object} base the base class from which to construct the bridge
     */
    function makeBridge(base)
    {
        /** @constructor */
        var bridge = function() {};
        bridge.prototype = base.prototype;
        return new bridge();
    };
    
    /**
     * Checks if the given method name is a function that is not created
     * by XMOT.Class, but by the class user.
     * 
     * @param {string} name the name to check 
     */
    function isClientMethod(name)
    {
        if(name === "callSuper"
        || name.indexOf("__") === 0
        || name === "callback")
            return false;
    
        return true;
    };
    
    /**
     * Extract all methods from the given object that are client methods.
     * 
     * @param {!Object} obj the object to copy the methods from 
     * 
     * @return {Object} a new object containing only the methods from obj 
     *
     * \sa XMOT.Class.isClientMethod()
     */
    function extractMethods(obj)
    {
        var methodObj = {};
    
        for(var name in obj)
        {
            var member = obj[name];
    
            if(!member) // members initialized to null
                continue;
    
            if(member.constructor === Function
            && isClientMethod(name))
            {
                methodObj[name] = member;
            }
        }
    
        return methodObj;
    }; 
}()); 
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
	function tmp() {}
	tmp.prototype = parent.prototype;
	child.superClass_ = parent.prototype;
	child.prototype = new tmp();
	child.prototype.constructor = child;
}

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
}

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
		window.requestAnimFrame(XMOT.animate, undefined);
		if(XMOT.animationHook) XMOT.animationHook();
		if(XMOT.registeredCameraController) XMOT.registeredCameraController.update();
		TWEEN.update();
	}
	else
		XMOT.animating = false;
}

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
}

/** 
 *  Creates a namespace and subnamespaces, that are contained in the path. 
 * 
 *  @param {string} fullName the full name of the namespace  
 *  
 *  Example: 
 *  
 *  namespace("XMOT.interaction.behaviors"]) will create: 
 *  
 *  XMOT.interaction.behaviors
 */
function namespace(fullName)
{
    var curParentNS = window; 
    
    var namespacePath = fullName.split("."); 
    
    for(var i = 0; i < namespacePath.length; i++)
    {
        var ns = namespacePath[i];
        
        if(!curParentNS[ns])
            curParentNS[ns] = {}; 
        
        curParentNS = curParentNS[ns]; 
    }
}

/** Extend the target object with all attributes from the source object
 * 
 *  @param tarobj the object to be extended 
 *  @param srcobj the object from which to take the attributes 
 */
function extend(tarobj, srcobj)
{ 
    for(var attr in srcobj)
        tarobj[attr] = srcobj[attr]; 
};

//export
XMOT.inherit = inherit;
XMOT.base = base;
XMOT.animate = animate;
XMOT.animating = animating;
XMOT.animationHook = animationHook;
XMOT.registeredCameraController = registeredCameraController;
XMOT.mergeOptions = mergeOptions;
XMOT.namespace = namespace; 
XMOT.extend = extend; 
}());(function() {

    /**
     * A Transformable implementation.
     * @constructor
     * @implements{Transformable}
     */
    function ClientTransformable(object, transform, constraint) {
    	/**
		 * Object which shall be transformable
		 * @protected
		 * @type {Object}
		 */
		this.object = object;
		/**
		 * Transform coords of the object and the Transformable
		 * @protected
		 * @type {Object}
		 */
		this.transform = transform;
		
		/**
		 * Constraint of the movement
		 * @protected
		 * @type {Constraint}
		 */
		if(!constraint)
			constraint = new XMOT.SimpleConstraint(true, true, true); 
		this.constraint = constraint;
		
		/**
		 * Queue of movements
		 * @private
		 * @type {Array.<{tween: tween, startPosition:Array.<number>, endPosition:Array.<number>, startOrientation:Array.<number>, endOrientation:Array.<number>}>}
		 */
		this.motionQueue = [];
    }

    var p = ClientTransformable.prototype;

    /** @inheritDoc */
    p.setPosition = function(position){
		if(this.constraint.constrainTranslation(position, {transformable: this}))
			this.transform.translation.set(position);
		return this;
    };

    /** @inheritDoc */
	p.setOrientation = function(orientation){
		if(this.constraint.constrainRotation(orientation, {transformable: this})){
			this.transform.rotation.set(orientation);
		}
		return this;
    };

    /** @inheritDoc */
    p.setScale = function(scale){
        if(this.constraint.constrainScaling(scale, {transformable: this})){
            this.transform.scale.set(scale);
        }
    };

    /** @inheritDoc */
    p.getPosition = function(){
    	return this.transform.translation;
    };

    /** @inheritDoc */
    p.getOrientation = function(){
		return this.transform.rotation;
    };

    /** @inheritDoc */
    p.getScale = function(){
    	return this.transform.scale;
    };

    /** @inheritDoc */
    p.translate = function(translation){
    	return this.setPosition( translation.add(this.getPosition()) );
    };

    /** @inheritDoc */
    p.rotate = function(orientation){
		var destination = new XML3DRotation(this.transform.rotation, undefined, undefined);
		destination = destination.multiply( orientation );
		if(this.constraint.constrainRotation(orientation, {transformable: this}))
			this.transform.rotation.set(destination);
		return this;
    };

    /** @inheritDoc */
    p.scale = function(factor){
    	this.transform.scale.multiply(factor);
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
		return (curPos.x == position.x && curPos.y == position.y && curPos.z == position.z);
	};

	/**
	 * check if current orientation equals moveTo orientation
	 * @private
	 * @param {Array.<number>} orientation
	 * @return {boolean}
	 */
	p.checkOrientation = function(orientation){
		var curOri = this.transform.orientation;
		return (curOri.x === orientation.x && curOri.y === orientation.y && curOri.z === orientation.z && curOri.w === orientation.w);
	};

    /**
     * Applies one movement step to the transformable
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
		var interpolatedX = start.x + ( end.x - start.x ) * t;
		var interpolatedY = start.y + ( end.y - start.y ) * t;
		var interpolatedZ = start.z + ( end.z - start.z ) * t;
		return new XML3DVec3( interpolatedX, interpolatedY, interpolatedZ );
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
		return XMOT.math.slerp(start, end, t);
    };

    /**
	 * Set position and animation of the transformable
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
		var motion = this.motionQueue.shift();
		if(motion) motion.tween.stop();
		this.motionQueue = [];
		return this;
    };

    /** @inheritDoc */
    p.setConstraint = function(constraint){
		this.constraint = constraint;
    };

    //export
    XMOT.ClientTransformable = ClientTransformable;

}());
/**
 * ClientMotionFactory implementation
 * @constructor
 * @implements{MotionFactory}
 */
XMOT.ClientMotionFactory = new XMOT.Singleton({

    /** @this XMOT.ClientMotionFactory */
    initialize: function()
    {
        /** Counter to create unique IDs for the elements added to DOM.
         *  Is in closure: same for every instance so no ID clashes will
         *  occur across multiple instances of the factory.
         *
         *  @private
         */
        this.id = 0;
    },

    /** @inheritDoc
     *  @this XMOT.ClientMotionFactory
     */
    createTransformable: function(element, constraint)
    {
        if(!element) throw "No valid element, cannot create Transformable.";
        return new XMOT.ClientTransformable(element, this.getTransform(element), constraint);
    },

    /** @inheritDoc
     *  @this XMOT.ClientMotionFactory
     */
    createAnimatable: function(element, constraint)
    {
        if(!element) throw "No valid element, cannot create Animatable.";
        return new XMOT.ClientAnimatable(element, this.getTransform(element), constraint);
    },

    /** @inheritDoc
     *  @this XMOT.ClientMotionFactory
     */
    createKeyframeAnimation: function(name, element, opt)
    {
        if(!element) throw "No valid element, cannot create Animatable.";
        var child = element.firstElementChild;
        var keys = undefined;
        var position = undefined;
        var orientation = undefined;
        var scale = undefined;
        while(child){
            //TODO: does child.name work for native?
            switch(child.name){
                case "key" :         keys = this.getValueFromChild(child, undefined); break;
                case "position" :    position = this.getValueFromChild(child, keys.length*3); break;
                case "orientation" : orientation = this.getValueFromChild(child, keys.length*4); break;
                case "scale" :       scale = this.getValueFromChild(child, keys.length*3); break;
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
    },

    /**
     * get Values from child
     * @this XMOT.ClientMotionFactory
     *
     * @param {*} child
     * @param {number}
     * @return {Array.<number>}
     */
    getValueFromChild: function(child, number)
    {
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
    },

    /**
     * creates a unique id
     * @this XMOT.ClientMotionFactory
     *
     * @return {string} unique id
     */
    createUniqueId: function()
    {
        return "createdByClientMotionFactory" + this.id++;
    },

    /**
     * Gets the transform of an element and creates a transform if necessary
     * @this XMOT.ClientMotionFactory
     *
     * @param {Object} obj element
     * @return {Object} transform
     */
    getTransform: function(obj)
    {
        return XMOT.util.getOrCreateTransform(obj, this.createUniqueId());
    }
});
(function(){

	/**
	 * An implementation of Animatable
	 * @constructor
	 * @implements Animatable
	 * @extends ClientTransformable
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
	XMOT.inherit(ClientAnimatable, XMOT.ClientTransformable);

    var ca = ClientAnimatable.prototype;

    /** @inheritDoc */
    ca.addAnimation = function(animation, opt){
		//do not change options of the animation, store options of the animation of this animatable
		//same animation might have different options on another animatable
		this.availableAnimations[animation.name] = {};
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
					if(typeof(opt.callback) === "function") opt.callback();
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
	}

	var k = ClientKeyframeAnimation.prototype;

	/** @inheritDoc */
	k.applyAnimation = function(animatable, currentTime, startTime, endTime, easing){
		var t = (currentTime - startTime) / (endTime - startTime);
		if(easing && typeof(easing) === "function") t = easing(t); //otherwise its linear
		var indexOfLastKey = this.keys.length - 1;
		if (t <= this.keys[0]){
			this.setValue( animatable, this.getPosition(0), this.getOrientation(0), this.getScale(0) );
		}else if (t >= this.keys[indexOfLastKey]){
			this.setValue( animatable, this.getPosition(indexOfLastKey), this.getOrientation(indexOfLastKey), this.getScale(indexOfLastKey) );
		}else{
			for ( var i = 0; i < indexOfLastKey; i++){
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
	 * @param {XML3DVec3|undefined} position
	 * @param {XML3DRotation|undefined} orientation
	 * @param {XML3DVec3|undefined} scale
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
	 * @return {XML3DVec3|undefined} Position
	 */
	k.getInterpolatedPosition = function(index, t){
		if(this.positionValues == undefined) return undefined;
		return this.interpolateXML3DVec3(this.getPosition(index), this.getPosition(index+1), t);
	};

	/**
	 * Interpolates scalevalues between index i and index i+1 with parameter t
	 * @private
	 * @param {number} index
	 * @param {number} t interpolationparameter
	 * @return {XML3DVec3|undefined} Position
	 */
	k.getInterpolatedScale = function(index, t){
		if(this.scaleValues == undefined) return undefined;
		return this.interpolateXML3DVec3(this.getScale(index), this.getScale(index+1), t);
	};

	/**
	 * Interpolate the values of two arrays
	 * @private
	 * @param {XML3DVec3} vec1
	 * @param {XML3DVec3} vec2
	 * @param {number} t interpolationparameter
	 * @return {XML3DVec3|undefined} interpolated array
	 */
	k.interpolateXML3DVec3 = function(vec1, vec2, t){
		var interpolatedX = vec1.x + ( vec2.x - vec1.x ) * t;
		var interpolatedY = vec1.y + ( vec2.y - vec1.y ) * t;
		var interpolatedZ = vec1.z + ( vec2.z - vec1.z ) * t;
		return new XML3DVec3( interpolatedX, interpolatedY, interpolatedZ );
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
		return XMOT.math.slerp(start, end, t);
	};

	/**
	 * Gets a position corresponding to a key
	 * @private
	 * @param {number} key
	 * @return {XML3DVec3|undefined} Position
	 */
	k.getPosition = function(key){
		if(this.positionValues == undefined || key > this.keys.length-1 /*just in case*/) return undefined;
		var index = key*3;
		return new XML3DVec3( this.positionValues[index], this.positionValues[index+1], this.positionValues[index+2] );
	};

	/**
	 * Gets a sacle corresponding to a key
	 * @private
	 * @param {number} key
	 * @return {XML3DVec3|undefined} Position
	 */
	k.getScale = function(key){
		if(this.scaleValues == undefined || key > this.keys.length-1 /*just in case*/) return undefined;
		var index = key*3;
		return new XML3DVec3( this.scaleValues[index], this.scaleValues[index+1], this.scaleValues[index+2] );
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
		var ret = new XML3DRotation();
		ret.setQuaternion( new XML3DVec3(this.orientationValues[index], this.orientationValues[index+1], this.orientationValues[index+2]), this.orientationValues[index+3]);
		return ret;
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
    c.constrainRotation = function(newRotation, opts){
    	var constraints = this.constraints;
    	var length = constraints.length;
		var i = 0;
		var ret = true;
		var breakEarly = this.breakEarly;
		
		while( i<length && (ret || !breakEarly) ){
			ret = ret && constraints[i].constrainRotation(newRotation, opts);
			i++;
		}
    	return ret;
    };

    /** @inheritDoc */
    c.constrainTranslation = function(newPosition, opts){
    	var constraints = this.constraints;
		var length = constraints.length;
		var i = 0;
		var ret = true;
		var breakEarly = this.breakEarly;
		while( i<length && (ret || !breakEarly) ){
			ret = ret && constraints[i].constrainTranslation(newPosition, opts);
			i++;
		}
    	return ret;
    };
    
    /** @inheritDoc */ 
    c.constraintScaling = function(newScale, opts) { 
        var constraints = this.constraints;
        var length = constraints.length;
        var i = 0;
        var ret = true;
        var breakEarly = this.breakEarly;
        while( i<length && (ret || !breakEarly) ){
            ret = ret && constraints[i].constraintScaling(newScale, opts);
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
     * @param {boolean} [allowedToMove]
     * @param {boolean} [allowedToRotate]
     * @param {boolean} [allowedToScale]
     * @implements {Constraint}
     */
    var SimpleConstraint = function(allowedToMove, allowedToRotate, allowedToScale){
        /**
         * allowed to move
         * @private
         * @type {boolean}
         */
        this.allowedToMove = (allowedToMove !== undefined) ? allowedToMove : true;
        /**
         * allowed to Rotate
         * @private
         * @type {boolean}
         */
        this.allowedToRotate = (allowedToRotate !== undefined) ? allowedToRotate : true;
        /**
         * allowed to scale
         * @private
         * @type {boolean}
         */
        this.allowedToScale = (allowedToScale !== undefined) ? allowedToScale: true;
    };
    var s = SimpleConstraint.prototype;

    /** @inheritDoc */
    s.constrainRotation = function(newRotation, opts){
        return this.allowedToRotate;
    };

    /** @inheritDoc */
    s.constrainTranslation = function(newPosition, opts){
        return this.allowedToMove;
    };

    s.constrainScaling = function(newScale, opts){
        return this.allowedToScale;
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
    c.constrainRotation = function(newRotation, opts){
		return true;
    };

    /** @inheritDoc */
    c.constrainTranslation = function(newPosition, opts){
        if(!opts || !opts.transformable)
            throw "ProhibitAxisMovementConstraint.constrainTranslation: no transformable in options given."; 
            
    	var center = this.center;
    	var epsilon = this.epsilon;
    	var currentPosition = opts.transformable.getPosition();
    	
		if(this.x && Math.abs(center - newPosition.x) > epsilon) newPosition.x = currentPosition.x;
		if(this.y && Math.abs(center - newPosition.y) > epsilon) newPosition.y = currentPosition.y;
		if(this.z && Math.abs(center - newPosition.z) > epsilon) newPosition.z = currentPosition.z;
		
    	return true;
    };

    //export
    XMOT.ProhibitAxisMovementConstraint = ProhibitAxisMovementConstraint;
}());
(function(){
    /**
     * BoxedTranslationConstraint
     * 
     * Constrains the translation to a box. Translation values outside are clipped. 
     *  
     * @constructor
     * @param {XML3DBox} [box] the box constraint. Default: infinitely large box, i.e. no constraint
     * @implements {Constraint}
     */
    var BoxedTranslationConstraint = function(box){
        
        /** 
         * The box within which the translation is to be performed. 
         * @private
         * @type {XML3DBox}
         */
        this.box = null; 
        
        if(box)
            this.box = new window.XML3DBox(box);
        else
        {
            var min = new window.XML3DVec3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE); 
            var max = new window.XML3DVec3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE); 
            
            this.box = new window.XML3DBox(min, max); 
        }
    };
    var c = BoxedTranslationConstraint.prototype;

    /** @inheritDoc */
    c.constrainTranslation = function(newTranslation){
        
        var t = newTranslation; 
        
		t.x = this.clipValue(t.x, this.box.min.x, this.box.max.x);
		t.y = this.clipValue(t.y, this.box.min.y, this.box.max.y);
		t.z = this.clipValue(t.z, this.box.min.z, this.box.max.z);
        
        return true; 
    };

    /** @inheritDoc */
    c.constrainRotation = function(newRotation){
        return true;
    };

    /** @inheritDoc */
    c.constrainScaling = function(newScale){
        return true;
    };
    
    /** Clips a single value by min and maximum value. It returns 
     *  the value within the range of min and max.
     *  
     *  @param {number} value the value to clip
     *  @param {number} min  
     *  @param {number} max
     *  @return {number} 
     *  
     *  @private
     */
    c.clipValue = function(value, min, max){
        if(value < min)
            return min; 
        if(value > max)
            return max; 
        return value; 
    }; 

    //export
    XMOT.BoxedTranslationConstraint = BoxedTranslationConstraint;
}());
(function(){
	/**
	 * A CameraController
	 * In order to use the gamepad functiponality of this class do as follows:
	 * 1. Use Chrome 21 or higher.
	 * 2. Get A XBox360 Controller.
	 * (2. a: Use another Controller in XBox360 Emulation Mode)
	 * (2. b: Add your own XYZGamepad class in GamepadEventProvider.js)
	 * 3. Have Fun :-)
	 * @constructor
	 * @param {string} camera_id name of the group of the camera
	 * @param {string} xml3dElementId name of the group of the complete scene
	 * @param {XML3DRotation} initialRotation rotation to rotate the camera in a manner, that "forward" is a movement along -z
	 * @param {string} mouseButton "left", "right", "middle"
	 * @param {boolean} inspectMode determine wether to use inspectMode or not
	 */
	function CameraController(camera_id, xml3dElementId, initialRotation, mouseButton, inspectMode){
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
		this.moveSensivityPad = 0.04 * this.slowthis;
		/**
		 * Sensivity for rotation of gamepad
		 * @private
		 * @type {number}
		 */
		this.rotationSensivityPad = 0.01 * this.slowthis;
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
		/**
		 * Xml3d Element
		 * @private
		 * @type {HTMLElement}
		 */
		this.xml3dElement = document.getElementById(xml3dElementId);

		var factory = XMOT.ClientMotionFactory;
		var cam = document.getElementById(camera_id);
		/**
		 * The Transformable
		 * @private
		 * @type {Transformable}
		 */
		this.transformable = factory.createTransformable(cam, this.constraint);
		var initRot = initialRotation || new XML3DRotation();
		this.transformable.rotate(initRot);
		/**
		 * starting point of the transformable, used to reset position and orientation
		 * @private
		 * @type {{position: Array.<number>, orientation: Array.<number>}}
		 */
		this.startingPoint = {position:this.transformable.getPosition(), orientation:this.transformable.getOrientation()};

		/**
		 * Mousebutton on which the camera turns:
		 * 0 = left, 1 = middle, 2 = right;
		 */
		this.mouseButton = 0;
		this.setMouseButtonValue(mouseButton);
		this.pointToRotateAround = this.xml3dElement.getBoundingBox().center();

		/**
		 * camera mode freeflight
		 * @type {Boolean|null}
		 */
		this.cameraModeInspect = inspectMode || false;
		this.cameraModeFreeflight = !this.cameraModeInspect;

		this.gamepadEventProvider = XMOT.GamepadEventProvider();
		this.padData = {};
		this.activate();

		//finally, register in the animation loop
		if( !XMOT.registeredCameraController){
			XMOT.registeredCameraController = this;
			XMOT.animate();
		}
		else
			throw "Only one CameraController allowed.";
	}
	var cc = CameraController.prototype;

	cc.activateInspectCameraMode = function(){
		this.cameraModeInspect = true;
		this.cameraModeFreeflight = !this.cameraModeInspect;
	};

	cc.activateFreeFlightCameraMode = function(){
		this.cameraModeFreeflight = true;
		this.cameraModeInspect = !this.cameraModeFreeflight;
	};

	/**
	 * Sets the used mouseButton for camera motion
	 */
	cc.setMouseButtonValue = function(button){
		if(button == "left") this.mouseButton = 0;
		else if(button == "middle") this.mouseButton = 1;
		else if(button == "right") this.mouseButton = 2;
	};

	/**
	 * Get current position in local space
	 * @public
	 * @return {XML3DVec3} 3D vector
	 */
	cc.getPosition = function(){
		return this.transformable.getPosition();
	};

	/**
	 * Get current orientation in local space
	 * @public
	 * @return {XML3DRotation} quaternion
	 */
	cc.getOrientation = function(){
		return this.transformable.getOrientation();
	};

	// public:
	/**
	 * Add a Point of Interest
	 * @public
	 * @param {XML3DVec3} position
	 * @param {XML3DRotation} orientation
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
		this.updateKeyMovement();
		this.updateGamepadMovement();
	};

	// ---------- functions to handle movement ----------
	/**
	 * Move camera back and forward
	 * @private
	 * @param {number} l length of the movement
	 */
	cc.moveBackAndForward = function(l){
		if(l === 0) return;
		var vecZ = new XML3DVec3(0, 0, 1);
		var moveVec = this.transformable.getOrientation().rotateVec3(vecZ);
		moveVec = moveVec.normalize().scale(l);
		this.transformable.translate(moveVec);
	};

	/**
	 * Move camera left and right (strafe)
	 * @private
	 * @param {number} l length of the movement
	 */
	cc.moveLeftAndRight = function(l){
		if(l === 0) return;
		var vecX = new XML3DVec3(1, 0, 0); // global x is local z of the camera
		var moveVec = this.transformable.getOrientation().rotateVec3(vecX);
		moveVec = moveVec.normalize().scale(l);
		this.transformable.translate(moveVec);
		this.pointToRotateAround = this.pointToRotateAround.add(moveVec);
	};

	/**
	 * Move camera Up and Down
	 * @private
	 * @param {number} l length of the movement
	 */
	cc.moveUpAndDown = function(l){
		if(l === 0) return;
		var vecY = new XML3DVec3(0, 1, 0);
		var moveVec = this.transformable.getOrientation().rotateVec3(vecY);
		moveVec = moveVec.normalize().scale(l);
		this.transformable.translate(moveVec);
	};

	/**
	 * Move to the next Point of Interest
	 * @private
	 */
	cc.nextPoi = function(){
		if(this.poi.length == 0 || !this.allowPoi || this.transformable.movementInProgress()) return;
		this.currentPoi = this.currentPoi == this.poi.length-1 ? 0 : this.currentPoi+1;
		var movetopoi = this.poi[this.currentPoi];
		this.allowPoi = false;
		var that = this;
		this.transformable.moveTo(movetopoi.pos, movetopoi.ori, this.poiMoveToTime, {queueing: false, callback: function(){that.moveToCallback();}});
	};

	/**
	 * Move to the next Point of Interest
	 * @private
	 */
	cc.beforePoi = function(){
		if(this.poi.length == 0 || !this.allowPoi || this.transformable.movementInProgress()) return;
		this.currentPoi = this.currentPoi == 0 ? this.poi.length-1 : this.currentPoi-1;
		var movetopoi = this.poi[this.currentPoi];
		this.allowPoi = false;
		var that = this;
		this.transformable.moveTo(movetopoi.pos, movetopoi.ori, this.poiMoveToTime, {queueing: false, callback: function(){that.moveToCallback();}});
	};

	/**
	 * Stops the current movement to a poi
	 * @public
	 */
	cc.stopMovementToPoi = function(){
		this.transformable.stop();
		this.allowPoi = true;
	};

	/**
	 * rotate up/down before any other movement, this prevends from rolling
	 * @private
	 */
	cc.preventRolling = function(){
		this.transformable.rotate( new XML3DRotation( new XML3DVec3(1, 0, 0), -this.angleUp) );
		this.angleUp = 0;
	};

	/**
	 * Rotates the camera up and down by an given angle
	 * @private 
	 * @param {number} angle
	 */
	cc.rotateCameraUpAndDown = function(angle){
		this.angleUp += angle*Math.PI;
		this.transformable.rotate( new XML3DRotation(new XML3DVec3(1, 0, 0), angle*Math.PI) );
	};

	/**
	 * Rotates the camera left and right by an given angle
	 * @private 
	 * @param {number} angle
	 */
	cc.rotateCameraLeftAndRight = function(angle){
		
		//rotate up/down befor rotating sidewards, this prevends from rolling
		this.transformable.rotate( new XML3DRotation(new XML3DVec3(1, 0, 0), -this.angleUp) );
		this.transformable.rotate( new XML3DRotation(new XML3DVec3(0, 1, 0), angle) );
		//and rotate up/down again
		this.transformable.rotate( new XML3DRotation(new XML3DVec3(1, 0, 0), this.angleUp) );
	};

	cc.rotateCameraAroundPointLeftAndRight = function(angle){
		var distanceToLookAt = this.distanceBetweenCameraAndPoint(this.pointToRotateAround);
		this.transformable.setPosition(new XML3DVec3(0, 0, 0));
		this.rotateCameraLeftAndRight(angle);
		var newDirection = this.cameraDirectionAsXML3D();
		var tmp = newDirection.scale(distanceToLookAt).negate();
		this.transformable.setPosition(tmp);
		this.transformable.translate(this.pointToRotateAround);
	};

	cc.rotateCameraAroundPointUpAndDown = function(angle){
		var distanceToLookAt = this.distanceBetweenCameraAndPoint(this.pointToRotateAround);
		this.transformable.setPosition(new XML3DVec3(0, 0, 0));
		this.rotateCameraUpAndDown(angle);
		var newDirection = this.cameraDirectionAsXML3D();
		var tmp = newDirection.scale(distanceToLookAt).negate();
		this.transformable.setPosition(tmp);
		this.transformable.translate(this.pointToRotateAround);
	};

	/**
	 * distance between camera and a point
	 * @param {XML3DVec3} point
	 * @return {Number|void}
	 */
	cc.distanceBetweenCameraAndPoint = function(point){
		var camPosition = this.transformable.transform.translation;
		return camPosition.subtract(point).length();
	};

	/**
	 * look at a certain point
	 * @public
	 * @param {XML3DVec3} point
	 */
	cc.lookAtPoint = function(point){
		var initCamDirection = new XML3DVec3(0, 0, -1);
		
		// reset orientation 
		this.angleUp = 0; 
		this.transformable.setOrientation(new XML3DRotation()); 
		
		// calculate new direction
		var position = this.getPosition();
		var direction = point.subtract(position);
		direction = direction.normalize(); 
				
		// create rotation from angle b/w initial and new direction
		var dirRot = new XML3DRotation(); 
		dirRot.setRotation(initCamDirection, direction);
		var quat = dirRot._data; 
		
		// convert rotation to euler angles ... 
		var eulerx = Math.atan((2*(quat[0]*quat[1] + quat[2]*quat[3]))/(1-2*(quat[1]*quat[1] + quat[2]*quat[2]))); 
		var eulery = Math.asin(2*(quat[0]*quat[2] - quat[3]*quat[1])); 
		
		// ... and forward the actual rotation to the usual rotation methods
		this.rotateCameraUpAndDown(eulerx); 
		this.rotateCameraLeftAndRight(-eulery);
	};

	/**
	 * Get rotation to look from a point at another
	 * @param {XML3DVec3} fromPoint
	 * @param {XML3DVec3} atPoint
	 * @return {XML3DVec3|void}
	 */
	cc.getRotationToLookFromPointAtPoint = function (fromPoint, atPoint) {
		return this.getRotationFromDirection(atPoint.subtract(fromPoint));
	};

	/**
	 * @private
	 * @param {XML3DVec3} direction
	 * @return {{XML3DVec3}|void}
	 */
	cc.getRotationFromDirection = function (direction) {
		//xml3DVec3 fails with error if normalizing null vector
		if (!direction) direction =  new window.XML3DVec3(0,0,-1);

		if( !(direction.x == 0 && direction.y == 0 && direction.z == 0) ){
			direction = direction.normalize();
		}


		var up = new XML3DVec3(0,1,0);
		var tmpX = direction.cross(up);

		if(tmpX.length() != 0) {
			tmpX = this.transformable.transform.rotation.rotateVec3(new window.XML3DVec3(1,0,0));
		}
		var tmpY = tmpX.cross(direction);
		var tmpZ = direction.negate();

		var q = quat4.create();
		quat4.setFromBasis(tmpX, up._data, tmpZ, q);
		var lookAtVector = new XML3DRotation();
		lookAtVector._setQuaternion(q);
		return lookAtVector;
	};

	/**
	 * Returns the normalized camera Direction in XML3D format
	 * @private
	 * @return {*}
	 */
	cc.cameraDirectionAsXML3D = function(){
		var camOrientation = this.transformable.transform.rotation;
		// as per spec: [getOrientation] is the orientation multiplied with the default direction (0, 0, -1)
		return camOrientation.rotateVec3(new XML3DVec3(0,0,-1)).normalize();
	};

	/**
	 * Resets the camera to the starting Position
	 * @private 
	 */
	cc.reset = function(){
		this.transformable.setPosition(this.startingPoint.position);
		this.transformable.setOrientation(this.startingPoint.orientation);
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
	 */
	cc.activate = function(){
		this.toggleHandlers(true); 
	};
	
	/**
	 * Deregister from all events
	 */
	cc.deactivate = function(){
		this.toggleHandlers(false); 
	};

	/** 
	 * (de-)registers event handlers for the controller. 
	 * @private
	 */
	cc.toggleHandlers = function(switchOn){

		var cb = XMOT.util.wrapCallback;

		// select the callbacks
		var winListener = window.addEventListener; 
		var xml3dListener = this.xml3dElement.addEventListener; 
		
		if(switchOn === false)
		{
			winListener = window.removeEventListener; 
			xml3dListener = this.xml3dElement.removeEventListener; 
		}

		//registered on window, since registring on div did not work, events never triggered        
		winListener.call(window, "keydown", cb(this, this.keyDownEventHandler), false);
		winListener.call(window, "keyup", cb(this, this.keyUpEventHandler), false);
		winListener.call(window, "mousemove", cb(this, this.mouseMovementHandler), false);
		winListener.call(window, "mouseup", cb(this, this.mouseUpHandler), false);
		xml3dListener.call(this.xml3dElement, "mousedown", cb(this, this.mouseDownHandler), false);
		
		winListener.call(window, "GamepadButtonDown", cb(this, this.gamepadButtonDownHandler), false);
		winListener.call(window, "GamepadButtonUp", cb(this, this.gamepadButtonUpHandler), false);
		winListener.call(window, "GamepadAxis", cb(this, this.gamepadAxisHandler), false);
	};

	/**
	 * Handles key events
	 * @private
	 * @param {Event} e event
	 */
	cc.keyDownEventHandler = function(e){
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
				case XMOT.KEY_Q : this.nextPoi(); break; 
				case XMOT.KEY_E : this.beforePoi(); break;
				case XMOT.KEY_R : this.reset(); break; 
				case XMOT.KEY_T : this.seeTheCompleteScene(); break;
				default : flag = false; break;
			}
			if(flag) this.stopDefaultEventAction(e);
		}
	};

	/**
	 * Removes key from the list of currently pressed keys
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
			case XMOT.KEY_S : this.moveBackAndForward(this.moveSensivityKeyboard); break; 
			case XMOT.KEY_W : this.moveBackAndForward(-this.moveSensivityKeyboard); break; 
			case XMOT.KEY_A : this.moveLeftAndRight(-this.moveSensivityKeyboard); break; 
			case XMOT.KEY_D : this.moveLeftAndRight(this.moveSensivityKeyboard); break;
			case XMOT.KEY_PGUP : this.moveUpAndDown(this.moveSensivityKeyboard); break; 
			case XMOT.KEY_PGDOWN : this.moveUpAndDown(-this.moveSensivityKeyboard); break; 
			case XMOT.KEY_UP : this.rotateUpAndDown(this.rotationSensivityMouse); break;
			case XMOT.KEY_DOWN : this.rotateUpAndDown(-this.rotationSensivityMouse); break; 
			case XMOT.KEY_LEFT : this.rotateLeftAndRight(this.rotationSensivityMouse); break;
			case XMOT.KEY_RIGHT : this.rotateLeftAndRight(-this.rotationSensivityMouse); break; 
	        default : return false; break;
	    }
	    return true;
	};

	cc.rotateLeftAndRight = function(angle)
	{
		if(angle === 0) return;
		if(this.cameraModeInspect){
			this.rotateCameraAroundPointLeftAndRight(angle);
		}else if(this.cameraModeFreeflight){
			this.rotateCameraLeftAndRight(angle);
		}
	};

	cc.rotateUpAndDown = function(angle)
	{
		if(angle === 0) return;
		if(this.cameraModeInspect){
			this.rotateCameraAroundPointUpAndDown(angle);
		}else if(this.cameraModeFreeflight){
			this.rotateCameraUpAndDown(angle);
		}
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
			this.rotateLeftAndRight(-this.rotationSensivityMouse*x);
		if(y != 0)
			this.rotateUpAndDown(-this.rotationSensivityMouse*y);
	};

	/**
	 * Handles mousebutton up event
	 * @private
	 * @param {Event} e event
	 */
	cc.mouseUpHandler = function(e){
		if(e.button == this.mouseButton){
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
		if(e.button == this.mouseButton){
			this.stopDefaultEventAction(e);
			this.mouseButtonIsDown = true;
			this.oldMousePosition.x = e.pageX;
			this.oldMousePosition.y = e.pageY;
		}
	};

	cc.updateGamepadMovement = function(){
		for(var item in this.padData){
			switch (item){
				case "RT" : this.moveUpAndDown(this.padData[item]*this.moveSensivityPad); break;
				case "LT" : this.moveUpAndDown(this.padData[item]*this.moveSensivityPad*-1); break;
				case "Left" : if(this.padData[item]) this.moveLeftAndRight(this.moveSensivityPad*-1); break;
				case "Right" : if(this.padData[item]) this.moveLeftAndRight(this.moveSensivityPad); break;
				case "Up" : if(this.padData[item]) this.moveBackAndForward(this.moveSensivityPad*-1); break;
				case "Down" : if(this.padData[item]) this.moveBackAndForward(this.moveSensivityPad); break;
				case "LeftStickX" : this.moveLeftAndRight(this.padData[item] * this.moveSensivityPad); break;
				case "LeftStickY" : this.moveBackAndForward(this.padData[item] * this.moveSensivityPad); break;
				case "RightStickX" : this.rotateLeftAndRight(this.padData[item] * this.rotationSensivityPad*-1); break;
				case "RightStickY" : this.rotateUpAndDown(this.padData[item] * this.rotationSensivityPad); break;
				default: break;
			}
		}
	};

	cc.gamepadButtonDownHandler = function(e){
		switch (e.detail.button) {
			case "RB": this.nextPoi(); break;
			case "LB": this.beforePoi(); break;
			case "Start": this.reset(); break;
			case "Back" : this.seeTheCompleteScene(); break;
			default: this.padData[e.detail.button] = e.detail.value; break;
		}
	};

	cc.gamepadButtonUpHandler = function(e){
		this.padData[e.detail.button] = e.detail.value;
	};

	cc.gamepadAxisHandler = function(e){
		this.padData[e.detail.axis] = this.handleAxisThreshold(e.detail.value);
	};

	cc.handleAxisThreshold = function(value){
		if(value > 0.15 || value < -0.15)
			return value;
		else
			return 0;
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

	cc.seeTheCompleteScene = function(){
		var sceneBBox = this.xml3dElement.getBoundingBox();
		var center = sceneBBox.center(); 

		var moveBy = sceneBBox.max;
		this.transformable.setPosition(new XML3DVec3(moveBy.x, moveBy.y, moveBy.z));
		
		this.angleUp = 0; 
		this.lookAtPoint(center);
	};

	XMOT.CameraController = CameraController;
}());/**
 * User: ebersold
 * Date: 10/23/12
 * Time: 12:34 PM
 */

(function () {

	/**
	 * A GamepadAttribute
	 * @param name {string}
	 * @param value {number}
	 * @constructor
	 */
	function GamepadAttribute(name, value) {
		this.name = name;
		this.value = value;
	}

	/**
	 * Gamepad
	 * @constructor
	 */
	function Gamepad(status) {
		this.timestamp = status.timestamp;
		this.id = status.id;
		this.index = status.index;
	}

	/**
	 * @abstract
	 * @param newStatus
	 */
	Gamepad.prototype.updateStatus = function (newStatus) { };

	Gamepad.prototype.getId = function () {
		return this.id;
	};

	Gamepad.prototype.getIndex = function () {
		return this.index;
	};

	Gamepad.prototype.dispatchButtonEvent = function (attribute) {
		var eventName = attribute.value ? "GamepadButtonDown" : "GamepadButtonUp";
		var detail = {
			button: attribute.name,
			value: attribute.value,
			padID: this.index
		};
		this.dispatchCustomEvent(eventName, detail);
	};

	Gamepad.prototype.dispatchAxisEvent = function (attribute) {
		var eventName = "GamepadAxis";
		var detail = {
			axis: attribute.name,
			value: attribute.value,
			padID: this.index
		};
		this.dispatchCustomEvent(eventName, detail);
	};

	Gamepad.prototype.dispatchCustomEvent = function (eventName, detail) {
		var options = {
			detail: detail,
			bubbles: true,
			cancelable: false
		};
		var event = new window.CustomEvent(eventName, options);
		document.dispatchEvent(event);
	};



	/**
	 * XBox360Gamepad
	 * @extends Gamepad
	 * @constructor
	 */
	function XBox360Gamepad(status) {
		XMOT.base(this, status);
		this.buttons = [];
		this.axes = [];
		this.initButtons(status);
		this.initAxes(status);
	}

	XMOT.inherit(XBox360Gamepad, Gamepad);

	XBox360Gamepad.prototype.initButtons = function (status) {
		this.buttons.push(new GamepadAttribute("A", status.buttons[0]));
		this.buttons.push(new GamepadAttribute("B", status.buttons[1]));
		this.buttons.push(new GamepadAttribute("X", status.buttons[3]));
		this.buttons.push(new GamepadAttribute("Y", status.buttons[2]));
		this.buttons.push(new GamepadAttribute("LB", status.buttons[4]));
		this.buttons.push(new GamepadAttribute("RB", status.buttons[5]));
		this.buttons.push(new GamepadAttribute("LT", status.buttons[6]));
		this.buttons.push(new GamepadAttribute("RT", status.buttons[7]));
		this.buttons.push(new GamepadAttribute("Back", status.buttons[8]));
		this.buttons.push(new GamepadAttribute("Start", status.buttons[9]));
		this.buttons.push(new GamepadAttribute("LeftStickClick", status.buttons[10]));
		this.buttons.push(new GamepadAttribute("RightStickClick", status.buttons[11]));
		this.buttons.push(new GamepadAttribute("Up", status.buttons[12]));
		this.buttons.push(new GamepadAttribute("Down", status.buttons[13]));
		this.buttons.push(new GamepadAttribute("Left", status.buttons[14]));
		this.buttons.push(new GamepadAttribute("Right", status.buttons[15]));
	};

	XBox360Gamepad.prototype.initAxes = function (status) {
		this.axisEpsilon = 0.001;
		this.axes.push(new GamepadAttribute("LeftStickX", status.axes[0]));
		this.axes.push(new GamepadAttribute("LeftStickY", status.axes[1]));
		this.axes.push(new GamepadAttribute("RightStickX", status.axes[2]));
		this.axes.push(new GamepadAttribute("RightStickY", status.axes[3]));
	};

	XBox360Gamepad.prototype.updateStatus = function (newStatus) {
		if (newStatus.timestamp === this.timestamp ||
			newStatus.index !== this.index ||
			newStatus.id !== this.id) {
			return;
		}
		this.updateButtons(newStatus);
		this.updateAxes(newStatus);
	};

	XBox360Gamepad.prototype.updateButtons = function (newStatus) {
		for(var i=0; i<this.buttons.length; i++){
			if(this.buttons[i].value !== newStatus.buttons[i]){
				this.buttons[i].value = newStatus.buttons[i];
				this.dispatchButtonEvent(this.buttons[i]);
			}
		}
	};

	XBox360Gamepad.prototype.updateAxes = function (newStatus) {
		for(var i=0; i<this.axes.length; i++){
			if(newStatus[i] !== this.axes[i].value && Math.abs(this.axes[i].value - newStatus.axes[i]) > this.axisEpsilon){
				this.axes[i].value = newStatus.axes[i];
				this.dispatchAxisEvent(this.axes[i]);
			}
		}
	};



	/**
	 * GamepadConnector - Singleton
	 * This whole module will only work with Chrome 21 (or higher)
	 * @private
	 * @constructor
	 */
	function GamepadEventProvider() {
		this.instance;
		this.pollingInProgress = false;
		this.pads = [];
		this.startPolling();
	}

	GamepadEventProvider.prototype.gamepadApiAvailable = function () {
		return !!navigator.webkitGetGamepads || !!navigator.webkitGamepads;
	};

	GamepadEventProvider.prototype.getInstance = function(){
		if(!this.instance)
			this.instance = new GamepadEventProvider();
		return this.instance;
	};

	GamepadEventProvider.prototype.init = function(){
		if (!this.gamepadApiAvailable()) {
			console.log("No Gamepad API available");
			return undefined;
		}
		return this.getInstance();
	};

	GamepadEventProvider.prototype.startPolling = function () {
		if (!this.pollingInProgress) {
			this.pollingInProgress = true;
			this.onePoll();
		}
	};

	GamepadEventProvider.prototype.onePoll = function () {
		var newStatusData = this.getNewStatusDataFromAPI();
		if (!newStatusData) {
			console.log("Cannot retrieve gamepad data");
			return;
		}
		this.processNewStatusData(newStatusData);
		this.nextPoll();
	};

	GamepadEventProvider.prototype.getNewStatusDataFromAPI = function () {
		return (navigator.webkitGetGamepads && navigator.webkitGetGamepads()) || navigator.webkitGamepads;
	};

	GamepadEventProvider.prototype.processNewStatusData = function (newStatusData) {
		this.handleNewlyConnectedGamepads(newStatusData);
		this.handleDisconnectedGamepads(newStatusData);
		this.updateGamepads(newStatusData);
	};

	GamepadEventProvider.prototype.handleNewlyConnectedGamepads = function (newStatusData) {
		for (var i=0; i<newStatusData.length; i++) {
			var index = newStatusData[i] ? newStatusData[i].index : undefined;
			if(index !== undefined && !this.pads[index]){
				this.pads[index] = this.createNewGamepad(newStatusData[i]);
			}
		}
	};

	GamepadEventProvider.prototype.createNewGamepad = function (newGamepadData) {
		var id = newGamepadData.id;
		if(id.indexOf("Xbox 360 Controller") !== -1){
			return new XBox360Gamepad(newGamepadData);
		}
		console.log("Unknown Controller id: " + id);
		return undefined;
	};

	GamepadEventProvider.prototype.handleDisconnectedGamepads = function (newStatusData) {
		for(var i=0; i<this.pads.length; i++){
			if(!this.pads[i]){
				continue;
			}
			var index = this.pads[i].getIndex();
			if( !newStatusData[index] ){
				this.pads[index] = undefined;
			}
		}
	};

	GamepadEventProvider.prototype.updateGamepads = function (newStatusData) {
		for(var i=0; i<this.pads.length; i++){
			if(!this.pads[i]){
				continue;
			}
			var index = this.pads[i].getIndex();
			this.pads[i].updateStatus(newStatusData[index]);
		}
	};

	GamepadEventProvider.prototype.nextPoll = function () {
		if(!this.pollingInProgress){
			return;
		}
		if(window.requestAnimFrame){
			window.requestAnimFrame(this.onePoll.bind(this), undefined);
		}
		else if(window.requestAnimationFrame){
			window.requestAnimationFrame(this.onePoll.bind(this), undefined);
		}
	};

	GamepadEventProvider.prototype.stopPolling = function () {
		this.pollingInProgress = false;
	};

	//export
	XMOT.GamepadEventProvider = GamepadEventProvider.prototype.init.bind(GamepadEventProvider.prototype);
}());
/** Contains useful extensions of XML3D's datatypes, i.e. XML3DBox, XML3DMatrix aso. 
 *  Every data type will have a str() method for a pretty string representation. For other 
 *  extensions see the code below. 
 */

(function() {
    
    /** 
     * @const
     */
    XML3D.EPSILON = 0.00001; 

    /** 
     * Compare two values for equality that differ at most by 
     * XML3D.EPSILON. 
     * 
     * @param {number} a 
     * @param {number} b
     * 
     * @return {boolean} true if a and b differ by at most XML3D.EPSILON
     */
    XML3D.epsilonEquals = function(a, b) {
        var diff;

        diff = a - b;
        if ((diff < 0 ? -diff : diff) > XML3D.EPSILON) {
            return false;
        }
        return true;
    };
}()); 

// ========================================================================
// === XML3DBox === 
// ========================================================================
(function() {
    
    if(!window.XML3DBox)
        return; 
    
    var p = window.XML3DBox.prototype; 
    
    /**
     * @this {XML3DBox} 
     * @return {number} the size of the bounding box 
     */
    p.size = function() { 
        
        return this.max.subtract(this.min); 
    };
     
    /** 
     * @this {XML3DBox} 
     * @param {!XML3DBox} other the bounding box to test intersection with
     * @return {boolean} true if this and the other bbox intersect 
     */
    p.intersects = function(other) { 
        
        return (this.min.x < other.max.x) && (this.max.x > other.min.x) 
        &&     (this.min.y < other.max.y) && (this.max.y > other.min.y) 
        &&     (this.min.z < other.max.z) && (this.max.z > other.min.z); 
        
    };

    /** 
     * @this {XML3DBox} 
     * @return {string} string representation of the bounding box
     */
    p.str = function() { 
        return "[ min: " + this.min.str() + "; max: " + this.max.str() + "]";  
    };

    /** 
     * @this {XML3DBox} 
     * @param {!XML3DBox} other the bounding box to test equality 
     * @return {boolean} true if the two bounding boxes' components differ at most by XML3D.EPSILON 
     */
    p.equals = function(other)
    {
        return this.min.equals(other.min)
            && this.max.equals(other.max); 
    };

    /** 
     * Transforms the min and max of this box with the given matrix. 
     * Afterwards validates it. 
     * 
     * @this {XML3DBox} 
     * @param {!XML3DMatrix} mat the matrix to perform the transformation with. 
     * @return {XML3DBox} this, the transformed bounding box 
     */
    p.transform = function(mat)
    {
        this.min.set(mat.multiplyPt(this.min)); 
        this.max.set(mat.multiplyPt(this.max));     
        
        /* The transformation of the box might mix up the actual min
         * and maximum values of the bounding box, since the box is 
         * always axis-aligned. Thus, we validate it and bring min 
         * and max back in order. 
         */ 
        this.validate(); 
        
        return this; 
    }; 

    /** 
     * Returns the box that sets the min and max properties to 
     * the minimal and maximal vectors of min and max, respectively. 
     * 
     * \sa XML3DBox.transform()
     * 
     * @this {XML3DBox} 
     * @return {XML3DBox} this, the validated bounding box 
     */
    p.validate = function() 
    {
        var mi = new window.XML3DVec3(this.min); 
        var ma = new window.XML3DVec3(this.max); 
        
        this.min.set(mi.mapVec(ma, Math.min)); 
        this.max.set(mi.mapVec(ma, Math.max));
        
        return this; 
    };
}()); 

// ========================================================================
// === XML3DMatrix === 
// ========================================================================    
(function() {
    
    if(!window.XML3DMatrix)
        return;
    
    var p = window.XML3DMatrix.prototype; 
    
    /** 
     * @this XML3DMatrix 
     * 
     * @param {!XML3DMatrix} other the other matrix to test equality with
     * @return {boolean} true if each of the matrices' components differ by at most XML3D.EPSILON
     */
    p.equals = function(other) { 
        
        var eq = XML3D.epsilonEquals; 
        
        return eq(this.m11, other.m11) 
            && eq(this.m12, other.m12) 
            && eq(this.m13, other.m13) 
            && eq(this.m14, other.m14) 
            && eq(this.m21, other.m21) 
            && eq(this.m22, other.m22) 
            && eq(this.m23, other.m23) 
            && eq(this.m24, other.m24) 
            && eq(this.m31, other.m31) 
            && eq(this.m32, other.m32) 
            && eq(this.m33, other.m33) 
            && eq(this.m34, other.m34) 
            && eq(this.m41, other.m41) 
            && eq(this.m42, other.m42) 
            && eq(this.m43, other.m43) 
            && eq(this.m44, other.m44);                 
    }; 
    
    /** Multiplies this matrix with the given vector
     *  
     *  @this {XML3DMatrix} 
     *  @param {!XML3DVec3} vec
     *  @return {XML3DVec3}
     */ 
    p.multiplyDir = function(vec) {
        
        return this.multiplyPt(vec, 0); 
    };

    /** Multiplies this matrix with the given point, that 
     *  is represented by a 3D vector and a scalar w for the 4th dimension. 
     *  
     *  @this {XML3DMatrix} 
     *  
     *  @param {!XML3DVec3} vec the first 3 components of the point stored in a vector 
     *  @param {!number} w the 4th component of the point
     *  
     *  @return {XML3DVec3} the result of multiplication. The 4th component w of the point is 
     *      calculated into the first 3 components (they're normalized by w). 
     */ 
    p.multiplyPt = function(vec, w) {

        if(w === undefined || w === null)
            w = 1;
        
        var _x = 0; var _y = 0; var _z = 0; var _w = w; 
                 
        // column-major multiplication: translation in last column 
        _x = this.m11 * vec.x + this.m21 * vec.y + this.m31 * vec.z + this.m41 * w; 
        _y = this.m12 * vec.x + this.m22 * vec.y + this.m32 * vec.z + this.m42 * w;  
        _z = this.m13 * vec.x + this.m23 * vec.y + this.m33 * vec.z + this.m43 * w; 
        _w = this.m14 * vec.x + this.m24 * vec.y + this.m34 * vec.z + this.m44 * w;
        
        if(_w != 0)
        {
            _x = _x/_w;
            _y = _y/_w; 
            _z = _z/_w; 
        }
        
        return new window.XML3DVec3(_x, _y, _z); 
    };

    /** 
     * Convert the matrix to a string, optionally using a HTML table. The returned string 
     * is output row-major (although XML3DMatrix is column-major). 
     * 
     * @this {XML3DMatrix} 
     * @param {boolean} pretty if true does a pretty output by wrapping the matrix in a table.
     * @return {string}
     */
    p.str = function(pretty) { 
        
        var ret = ""; // return string
        var es = " "; // element separator
        var rs = ""; // row start 
        var re = " | "; // row end
        
        if(pretty)
        {
            var td_style = "width:50px;"; 
            ret = "<table>";
            es = "</td><td style=\"" + td_style + "\">"; 
            rs = "<tr><td style=\"" + td_style + "\">"; 
            re = "</td></tr>";
        }
            
        ret += rs + this.m11.toFixed(3) + es + this.m21.toFixed(3) + es + this.m31.toFixed(3) + es + this.m41.toFixed(3) + re;
        ret += rs + this.m12.toFixed(3) + es + this.m22.toFixed(3) + es + this.m32.toFixed(3) + es + this.m42.toFixed(3) + re;
        ret += rs + this.m13.toFixed(3) + es + this.m23.toFixed(3) + es + this.m33.toFixed(3) + es + this.m43.toFixed(3) + re;
        ret += rs + this.m14.toFixed(3) + es + this.m24.toFixed(3) + es + this.m34.toFixed(3) + es + this.m44.toFixed(3) + re;
        
        if(pretty)
            ret += "</table>"; 
        
        return ret; 
    };

    if(!p.transpose)
    {
        /** 
         * Transposes the matrix. 
         * 
         * @this {XML3DMatrix} 
         * @return {XML3DMatrix} the transposed matrix 
         */
        p.transpose = function() {      
            return new window.XML3DMatrix(
                this.m11, this.m21, this.m31, this.m41, 
                this.m12, this.m22, this.m32, this.m42,
                this.m13, this.m23, this.m33, this.m43,
                this.m14, this.m24, this.m34, this.m44
            );
        }; 
    }

    /** 
     * Return the translation of this matrix as XML3DVec3. 
     * 
     * @this {XML3DMatrix} 
     * 
     * @return {XML3DVec3} the translation component of the matrix 
     */
    p.translation = function() 
    {   
        return new window.XML3DVec3(this.m41, this.m42, this.m43); 
    };

    /** 
     * Return the scale of this matrix as XML3DVec3. 
     * 
     * @this {XML3DMatrix} 
     * 
     * @return {XML3DVec3} the scale component of the matrix 
     */
    p.scale = function() 
    {   
        var v = new window.XML3DVec3(); 
        
        // scale factor are the magnitudes of the first three basis vectors
        // cf. http://www.gamedev.net/topic/491578-get-scale-factor-from-a-matrix/
        v.x = this.m11; v.y = this.m12; v.z = this.m13; 
        var sx = v.length();
        
        v.x = this.m21; v.y = this.m22; v.z = this.m23; 
        var sy = v.length(); 
        
        v.x = this.m31; v.y = this.m32; v.z = this.m33;
        var sz = v.length(); 
        
        return new window.XML3DVec3(sx, sy, sz); 
    };  

    /** 
     * Return the rotation of this matrix as XML3DRotation. 
     * 
     * @this {XML3DMatrix} 
     * 
     * @return {XML3DRotation} the rotation component of the matrix 
     */
    p.rotation = function() 
    {
        return window.XML3DRotation.fromMatrix(this); 
    }; 
}()); 

// ========================================================================
// === XML3DRay === 
// ========================================================================
(function() {
    
    if(!window.XML3DRay)
        return; 
       
    var p = window.XML3DRay.prototype; 
    
    /**
     * Returns a string representation of the ray. 
     * 
     * @this {XML3DRay}
     * @return {string}
     */
    p.str = function() { 
        return "[ pos: " + this.origin.str() + "; dir: " + this.direction.str() + "]";  
    };        
    
    /** 
     * @this {XML3DRay} 
     * 
     * @param {!XML3DRay} other the other ray to test equality with
     * @return {boolean} true if each component of the rays differ by at most XML3D.EPSILON
     */
    p.equals = function(other) { 
       
        return this.origin.equals(other.origin) 
            && this.direction.equals(other.direction); 
    };
}()); 

// ========================================================================
// === XML3DRotation === 
// ========================================================================
(function() {
    
    if(!window.XML3DRotation)
        return;
    
    var p = window.XML3DRotation.prototype; 
    
    /** 
     * Returns a string representation of XML3DRotation. It can be used 
     * to set attributes such as the <transform>'s rotation attribute. 
     * 
     * @this {XML3DRotation}
     * @return {string}
     */
    p.str = function() {
        return this.axis.str() + " " + this.angle; 
    };
    
    /** 
     * @this {XML3DRotation}          
     * @param {!XML3DRotation} other the other rotation to test equality with 
     * @return {boolean} true if axis and angle of both rotations differ by at most XML3D.EPSILON
     */
    p.equals = function(other) { 
        
        return this.axis.equals(other.axis) 
            && XML3D.epsilonEquals(this.angle, other.angle); 
    }; 
    
    if(!window.XML3DRotation.fromMatrix)
    {
        /** 
         * Constructs an instance of XML3DRotation from the given matrix. 
         * 
         * @param {!XML3DMatrix} mat
         * @return {XML3DRotation}
         */
        window.XML3DRotation.fromMatrix = function(mat) {
            
            var q = new window.XML3DRotation();
            var trace = mat.m11 + mat.m22 + mat.m33;
            if (trace > 0) {        
                var s = 2.0 * Math.sqrt(trace + 1.0);
                q.w = 0.25 * s;
                q.x = (mat.m23 - mat.m32) / s;
                q.y = (mat.m31 - mat.m13) / s;
                q.z = (mat.m12 - mat.m21) / s;
            } else {
                if (mat.m11 > mat.m22 && mat.m11 > mat.m33) {
                    var s = 2.0 * Math.sqrt(1.0 + mat.m11 - mat.m22 - mat.m33);
                    q.w = (mat.m23 - mat.m32) / s;
                    q.x = 0.25 * s;
                    q.y = (mat.m21 + mat.m12) / s;
                    q.z = (mat.m31 + mat.m13) / s;
                } else if (mat.m22 > mat.m33) {
                    var s = 2.0 * Math.sqrt(1.0 + mat.m22 - mat.m11 - mat.m33);
                    q.w = (mat.m31 - mat.m13) / s;
                    q.x = (mat.m21 + mat.m12) / s;
                    q.y = 0.25 * s;
                    q.z = (mat.m32 + mat.m23) / s;
                } else {
                    var s = 2.0 * Math.sqrt(1.0 + mat.m33 - mat.m11 - mat.m22);
                    q.w = (mat.m12 - mat.m21) / s;
                    q.x = (mat.m31 + mat.m13) / s;
                    q.y = (mat.m32 + mat.m23) / s;
                    q.z = 0.25 * s;
                }
            }
            var img = new window.XML3DVec3(q.x, q.y, q.z); 
            if(img.equals(new window.XML3DVec3(0,0,0)))
            {
                q = new window.XML3DRotation(); 
            }
            else 
                q.setQuaternion(img, q.w);
            
            return q;
        };
    }
}()); 

// ========================================================================
// === XML3DVec3 === 
// ========================================================================
(function() {
    
    if(!window.XML3DVec3)
        return;
    
    var p = window.XML3DVec3.prototype; 
    
    /** 
     * Returns a string representation of the vector. It can be used e.g. to set 
     * the <transform>'s translation attribute. 
     * 
     * @this {XML3DVec3} 
     * @return {string}
     */
    p.str = function() 
    { 
        return this.x.toFixed(3) + " " + this.y.toFixed(3) + " " + this.z.toFixed(3); 
    };
    
    /** 
     * Convert the vector to an array. 
     * 
     * @this {XML3DVec3} 
     * @return {Array.<number>}
     */
    p.toArray = function() 
    {
        return new Array(this.x, this.y, this.z); 
    }; 

    /** 
     * Compares the vector with the given one and returns true if all 
     * components differ by at most XML3D.EPSILON. 
     * 
     * @this {XML3DVec3} 
     * @param {XML3DVec3} other
     * @return {boolean}
     */
    p.equals = function(other) 
    {
        if(!other)
            return false; 
        
        return XML3D.epsilonEquals(this.x, other.x) 
            && XML3D.epsilonEquals(this.y, other.y) 
            && XML3D.epsilonEquals(this.z, other.z);
    };  
    
    /** 
     * Extract a vector where the given function is applied to each 
     * component of both vectors.
     *  
     * @this {XML3DVec3}
     * @param {!XML3DVec3} other 
     * @param {!function(number, number)} f
     * @return {XML3DVec3} XML3DVec3(f(this.x,other.x),f(this.y,other.y), f(this.z,other.z))
     * 
     */
    p.mapVec = function(other, f) 
    { 
        var vec = new window.XML3DVec3(); 
        
        vec.x = f(this.x, other.x); 
        vec.y = f(this.y, other.y);
        vec.z = f(this.z, other.z); 
        
        return vec;
    };
}()); 
/** 
 * This file constructs the XMOT.util namespace and adds miscellaneous utilities. 
 */
(function() {

    if(!XMOT.util) 
        XMOT.util = {};
    
    var u = XMOT.util;      
        
    /** 
     * Can be used to wrap the given method into a closure that preserves the 
     * this pointer inside the given function. Internally an object 
     * __callbacks will be attached to the given object. This way several calls 
     * to this function with the same function will return the same wrapper. 
     * This is needed to successfully unregister callbacks again. 
     * 
     * @param {!Object} obj the object on which to call the method f 
     * @param {!function()} fn the method to be wrapped  
     * 
     * @return {function()} the wrapped function 
     */    
    u.wrapCallback = function(obj, fn)
    {
        
        if(!obj.__callbacks)
            obj.__callbacks = {};
        
        if(!obj.__callbacks[fn])
        {
            var method = fn;
            var self = obj; 
            
            obj.__callbacks[fn] = function() { 
                return method.apply(self, arguments); 
            };
        }
        
        return obj.__callbacks[fn]; 
    };
    
    /** 
     * Retrieve the world bounding box of a given node
     * 
     * @param {!Object} node 
     * @return {XML3DBox} 
     */
    u.getWorldBBox = function(node)
    {
        if(!node.getBoundingBox)
            return new window.XML3DBox(); 
        
        var bbox = node.getBoundingBox(); 
        
        if(node.parentNode.getWorldMatrix)
        {
            var parentGlobMat = node.parentNode.getWorldMatrix();        
            bbox.transform(parentGlobMat);
        }
        
        return bbox; 
    };
    
    /** 
     * Retrieve the bounding box of the children of a given node. 
     * 
     * @param {!Object} node
     * @return {XML3DBox} 
     */
    u.getChildrenBBox = function(node)
    {
        var bbox = new window.XML3DBox(); 
             
        var curChild = node.firstChild; 
        while(curChild)
        {
            if(curChild.getBoundingBox)
                bbox.extend(curChild.getBoundingBox());
            
            curChild = curChild.nextSibling; 
        }
        
        return bbox; 
    };
    
    /** Returns the xml3d element in which the given element is contained.
     * If none is found, null is returned. 
     * 
     * @param {!Object} el
     * @return {Object} 
     */
    u.getXml3dRoot = function(el)
    {
        if(!el)
            return null; 
        
        if(el.tagName == "xml3d")
            return el; 
        
        if(el.parentNode)
            return u.getXml3dRoot(el.parentNode); 
        
        return null; 
    }; 
    
    /** Internal helper method. Gets and/or sets a reference pointed to by attrName 
     *  of the element el. For more information see XMOT.util.transform() 
     *  or XMOT.util.shader().  
     *  
     *  @param {!Object} el
     *  @param {!string} attrName
     *  @param {Object} newRefNode 
     *  
     *  @return {Object} 
     */
    function getOrSetRefNode(el, attrName, newRefNode)
    {        
        var oldRefNode = null; 

        var oldRef = el.getAttribute(attrName); 
        if(oldRef && oldRef.length > 0)
            oldRefNode = XML3D.URIResolver.resolveLocal(oldRef);
            
        if(newRefNode)
        {
            var newRef = newRefNode.getAttribute("id"); 
            if(newRef && newRef.length > 0)
            {                
                newRef = "#" + newRef;               
                el.setAttribute(attrName, newRef);                
            }             
        }
        
        return oldRefNode;       
    }; 
    
    /** 
     * Retrieve or set the transform node of a given group node. 
     * 
     * @param {!Object} grp the desired group node
     * @param {Object} xfm (optional) the transform element to which grp's 
     *  transform attribute should be set. The transform has to have an 
     *  id attribute.  
     * 
     * @return {Object} if one argument is given, it returns the current transform
     *  element of el. If two arguments are given, it returns the transform element set 
     *  before it was overridden by xfm.
     */
    u.transform = function(grp, xfm)
    {
        if(grp.tagName !== "group")
            throw "XMOT.util.transform(): given element is not a group."; 
        
        return getOrSetRefNode(grp, "transform", xfm);
    }; 
    
    /** Retrieve or set the shader of the given group node. 
     * 
     * @param {!Object} grp the group of which to retrieve the shader. 
     * @param {Object} sh (optional) the shader element to which el's shader 
     *  attribute should be set. The shader has to have an id attribute. 
     *  
     * @return {Object} if one argument is given, it returns the current shader of el. If 
     *  two arguments are given, it returns the shader set before it was overridden by sh. 
     */
    u.shader = function(grp, sh)
    {
        if(grp.tagName !== "group")
            throw "XMOT.util.shader(): given element is not a group.";  
        
        return getOrSetRefNode(grp, "shader", sh);
    };
    
    /** 
     * Returns the first defs element of the given xml3d element. If none exists, 
     * a corresponding element is created, appended to xml3d and returned. 
     * 
     * @param {!Object} xml3d the xml3d element of which to return the defs element
     * 
     * @return {Object} the first defs element of the given xml3d element 
     */
    u.getOrCreateDefs = function(xml3d)
    {
        var defs = XML3D.util.evaluateXPathExpr(
                xml3d, './/xml3d:defs[1]').singleNodeValue;
        
        if(!defs)
        {
            defs = XMOT.creation.element("defs"); 
            xml3d.appendChild(defs);  
        }
        
        return defs; 
    }; 
    
    /** 
     * Returns the transform element corresponding to the given 
     * group. If it doesn't exist, one will be created with the 
     * id newId, appended to the defs section and targetGrp's 
     * transform reference will be set to the newly created 
     * element. 
     * 
     * @param {!Object} targetGrp the group to retrieve the transform from
     * @param {string} newId the id attribute of the transform to be created 
     * 
     * @return {Object} the transform corresponding to targetGrp
     */
    u.getOrCreateTransform = function(targetGrp, newId)
    {
        var t = XMOT.util.transform(targetGrp);
        
        if(t) // found it, just return 
            return t; 
        
        var xml3d = u.getXml3dRoot(targetGrp);
        if(!xml3d)
            throw "XMOT.util.getOrCreateTransform(): target group does have no xml3d root element!"; 
        var defs = u.getOrCreateDefs(xml3d);  
        
        // create transform
        t = XMOT.creation.element("transform", {id: newId}); 
        defs.appendChild(t);
        targetGrp.setAttribute("transform", "#" + newId);
        
        return t;       
    };

    
    /** Return the first child element of tarNode, whose "name" attribute 
     * is equal to the given one. Useful for retrieving shader attributes. 
     * 
     * @param {!Object} tarNode
     * @param {string} name
     * @return {Object} the found node 
     */ 
    u.getNamedChild = function(tarNode, name)
    {
        var nodes = document.getElementsByName(name); 
        
        for(var i = 0; i < nodes.length; i++)
        {
            if(nodes[i].parentNode === tarNode) 
                return nodes[i]; 
        }
        
        return null; 
    }; 

    /** Get the children of the given node that reside in the XML3D namespace
     * 
     *  @param {!Object} node 
     *  @return {Array.<Object>}
     */
    u.getXML3DChildren = function(node)
    {
        var children = []; 
        
        var n = node.firstChild; 
        while(n)
        {
            if(n.namespaceURI === XML3D.xml3dNS)
                children.push(n); 
            
            n = n.nextSibling; 
        }
        
        return children; 
    };
}());
/**
 * This file constructs the XMOT.creation namespace. It provides a number of small utilities 
 * for creating various objects. Following objects reside here:
 *
 *  o phongShader() shortcut to create a phong <shader> element
 *  o lightshaderPoint() shortcut to create a point <lightshader> element
 *  o data() shortcut to create a <data> element holding various data (position, normals, ...)
 *  o dataSrc() shortcut to create elements like <float>, <float3>
 *  o sphere(), rectangle(), box(): create mesh elements with the named geometry
 */

(function(){
    
    if (!XMOT.creation)
        XMOT.creation = {};
    
    var ns = XMOT.creation; 
    
    /** A wrapper for document.createElementNS() with the xml3d namespace. 
     *
     *  @param {string} tagName the name of the tag to create
     *  @param {!Object} [opts] a list of attributes to the element. Only the 
     *                          attributes with string values will be set.
     *  
     *  A special attribute of opts is "children". It may contain child nodes, that should 
     *  be added to the created element through appendChild(). This special treatment only 
     *  occurs if "children" is an Array. If it contains a usual string, then it is 
     *  treated as usual attribute. 
     * 
     *  Example: 
     *  
     *  var mesh = XMOT.creation.element("mesh", {src: "#mymeshsrc_data"}); 
     * 
     *  XMOT.creation.element("group", {
     *      id: "mygroup",
     *      children: [mesh]
     *  });
     *  
     *  That yields to: 
     *  
     *  <group id="mygroup">
     *    <mesh src="#mymeshsrc_data" /> 
     *  </group>
     */
    ns.element = function(tagName, opts) {
        if(typeof tagName !== "string")
            throw "XMOT.creation.element(): invalid argument";

        var el = XML3D.createElement(tagName);
        
        if(!opts)
            return el; 

        for(var attrName in opts)
        {         
            var attr = opts[attrName];
            
            if(attr && typeof attr == "string")
                el.setAttribute(attrName, attr);        
        } 
        
        if(opts.children && opts.children instanceof Array)
        {
            for(var i = 0; i < opts.children.length; i++)
                el.appendChild(opts.children[i]);
        }        
        
        return el;
    };

    //----------------------------------------------------------------------------
    //--- Shaders ---
    //----------------------------------------------------------------------------
    
    /** Creates a phong shader with the given attributes
     *
     *  @param {Object} [opts] creation options
     *
     * The given options related to the phong shader are the content (TextNodes)
     * of the corresponding data elements, e.g. <float3> for the specularColor
     * shader argument.
     *
     * Supported options:
     *  o id: id attribute
     *  o diffCol: diffuseColor, default "0.8 0 0"
     *  o transp: transparency, default "0.0"
     *  o ambInt: ambientIntensity, default "0.3"
     *  o specCol: specularColor, default "0.55 0.55 0.55"
     *  o shin: shininess, default "0.5"
     *
     *  @return {Object} a shader element
     */
    ns.phongShader = function(opts)
    {
        if(!opts)
            opts = {};
    
        // default options
        if(!opts.diffCol)
            opts.diffCol = "0.8 0 0";
        if(!opts.transp)
            opts.transp = "0.0";
        if(!opts.ambInt)
            opts.ambInt = "0.3";
        if(!opts.specCol)
            opts.specCol = "0.55 0.55 0.55";
        if(!opts.shin)
            opts.shin = "0.5";
    
        // create all elements
        var ds = XMOT.creation.dataSrc;
    
        var sh = XMOT.creation.element("shader", {script:"urn:xml3d:shader:phong"});
    
        if(opts.id)
            sh.setAttribute("id", opts.id);
    
        sh.appendChild(ds("float3", {name:"diffuseColor", val:opts.diffCol}));
        sh.appendChild(ds("float", {name:"ambientIntensity", val:opts.ambInt}));
        sh.appendChild(ds("float", {name:"transparency", val:opts.transp}));
        sh.appendChild(ds("float3", {name:"specularColor", val:opts.specCol}));
        sh.appendChild(ds("float", {name:"shininess", val:opts.shin}));
    
        return sh;
    };
    
    /** Creates a point light lightshader element with the given attributes.
     *
     *  @param {Object} [opts] creation options
     *
     *  valid options:
     *      o id: id attribute
     *      o inten: the string of the textnode child of the intensity data source. Default: "1 1 1"
     *      o atten: the string of the textnode child of the attenuation data source. Default "1.0 0.01 0"
     *
     *  @return {Object} a lightshader element
     */
    ns.lightshaderPoint = function(opts)
    {
        if(!opts)
            opts = {};
    
        var ds = XMOT.creation.dataSrc;
    
        var l = XMOT.creation.element("lightshader", {script: "urn:xml3d:lightshader:point"});
    
        if(!opts.inten)
            opts.inten = "0.8 0.8 0.8";
        if(!opts.atten)
            opts.atten = "1.0 0.01 0";
    
        if(opts.id)
            l.setAttribute("id", opts.id);
    
        l.appendChild(ds("float3", {name:"intensity", val:opts.inten}));
        l.appendChild(ds("float3", {name:"attenuation", val:opts.atten}));
    
        return l;
    };
    
    //----------------------------------------------------------------------------
    // --- Element Helpers ---
    //----------------------------------------------------------------------------
    /** Create a data element with the given data.
     *
     *  @param {Object} [opts] creation options
     *
     *  valid options:
     *      o id: id attribute
     *      o idx: the string of the textnode child of the index data source
     *      o pos: the string of the textnode child of the position data source
     *      o norm: the string of the textnode child of the normal data source
     *      o texcoord: the string of the textnode child of the texcoord data source
     *
     *  @return {Object} a data element
     */
    ns.data = function(opts)
    {
        if(!opts)
            opts = {};
    
        var ds = XMOT.creation.dataSrc;
    
        var d = XMOT.creation.element("data");
    
        if(opts.id)
            d.setAttribute("id", opts.id);
        if(opts.idx)
            d.appendChild(ds("int", {name:"index", val:opts.idx}));
        if(opts.pos)
            d.appendChild(ds("float3", {name:"position", val:opts.pos}));
        if(opts.norm)
            d.appendChild(ds("float3", {name:"normal", val:opts.norm}));
        if(opts.texcoord)
            d.appendChild(ds("float2", {name:"texcoord", val:opts.texcoord}));
    
        return d;
    };
    
    /** Creates a data source element (float, bool, float3, ...).
     *
     *  @param tagName the tag name of the data source
     *  @param [opts] creation options
     *
     *  valid options:
     *      o name: the name attribute of the element
     *      o val: the TextNode child of the element
     *      
     *  @return {Object} a data source element
     */
    ns.dataSrc = function(tagName, opts)
    {
        if(!opts)
            opts = {};
    
        var dataSrc = XMOT.creation.element(tagName);
    
        if(opts.name)
            dataSrc.setAttribute("name", opts.name);
        if(opts.val)
            dataSrc.appendChild(document.createTextNode(opts.val));
    
        return dataSrc;
    };
    
}()); 

/* Put the geo creation stuff in an own closure so it won't spill 
 * the rest of the namespace. 
 */ 
(function(){

    var ns = XMOT.creation;

    /** This creates a mesh element containing a sphere without an id.
     *
     *  @param {Object} xml3d 
     *  @param {string} [id] the id-attribute of the mesh element
     *
     *  @return {Object} a mesh element
     */
    ns.sphere = function(xml3d, id)
    {
        return sphereObj.createMesh(xml3d, id);
    };

    /** Create a rectangle mesh element w/o an id and return it.
     *
     *  This rectangle is a 2x2 square with a normal of (0,0,1) in
     *  the world origin.
     *
     *  @param {Object} xml3d 
     *  @param {string} [id] the id-attribute of the mesh element
     *
     *  @return {Object} a mesh element
     */
    ns.rectangle = function(xml3d, id)
    {
        return rectObj.createMesh(xml3d, id);
    };

    /** Creates a 2x2x2 box in the origin.
     *
     *  @param {Object} xml3d 
     *  @param {string} [id] the id-attribute of the mesh element
     *
     *  @return {Object} mesh element
     */
    ns.box = function(xml3d, id)
    {
        return boxObj.createMesh(xml3d, id);
    };

    /** Small object that holds data concerning a geometry object.
     *  You give it the the actual data,
     *  that is a structure that has fields id, index, position, normal
     *  and texcoord strings.
     * 
     *  @constructor
     */
    var DataObject = new XMOT.Class({

        /** 
         * @param {!Object} data
         */
        initialize: function(data)
        {
            this.dataElements = {}; 
            
            /* keep track how many instance are in scene, per xml3d 
             * element. If there are none the data element is removed, too.
             * 
             * map xml3d element -> num instances
             */
            this.numInstances = {}; 

            this.data = data;
            
            /** @private */
            this._totalNumInstances = 0; // used to create unique mesh IDs 
        },

        /** Returns a mesh element that sources the Object's data element.
         * 
         *  @param {Object} xml3d the xml3d root, where the data object is to be instantiated. 
         *  @param {string} [id] the id attribute of the created mesh. 
         *  @return {Object} the mesh element
         */
        createMesh: function(xml3d, id)
        {
            if(!xml3d)
                throw "XMOT.creation call: xml3d not given!"; 
            
            if(!this.numInstances[xml3d] || this.numInstances[xml3d] < 1)
            {
                this.numInstances[xml3d] = 0; // initialize to zero, incremented below 
                
                var newEl = XMOT.creation.data({
                    id: this.data.id + "_" + this._totalNumInstances,
                    idx: this.data.index,
                    pos: this.data.position,
                    norm: this.data.normal,
                    texcoord: this.data.texcoord
                });

                var defs = XMOT.util.getOrCreateDefs(xml3d);
                defs.appendChild(newEl);

                this.dataElements[xml3d] = newEl; 
            }
            
            this._totalNumInstances++; 
            this.numInstances[xml3d]++;

            var mesh = XMOT.creation.element("mesh", {
                type: "triangles",
                src: "#" + this.dataElements[xml3d].id
            });

            if(id)
                mesh.setAttribute("id", id);

            return mesh;
        }
    });

    //----------------------------------------------------------------------------
    // --- Geometry Data ---
    //----------------------------------------------------------------------------
    var _rect = {};
    _rect.id = "XMOT.creation._rect";
    _rect.index = "0 1 2 1 3 2";
    _rect.position = " -1.0 -1.0 0.0 1.0 -1.0 0.0 -1.0 1.0 0.0 1.0 1.0 0.0";
    _rect.normal = "0.0 0.0 1.0 0.0 0.0 1.0 0.0 0.0 1.0 0.0 0.0 1.0";
    _rect.texcoord = "0.0 0.0 1.0 0.0 0.0 1.0 1.0 1.0";

    var _sphere = {};
    _sphere.id = "XMOT.creation._sphere";
    _sphere.index = "124 0 993 963 30 404 30 31 404 61 0 124 124 62 61 31 92 404 92 93 404 124 123 62 124 125 123 93 155 404 155 156 404 124 186 125 124 187 186 156 217 404 217 218 404 124 248 187 124 249 248 218 279 404 279 280 404 124 310 249 124 311 310 280 341 404 341 342 404 124 372 311 124 373 372 342 403 404 403 405 404 124 435 373 124 436 435 405 466 404 466 467 404 124 497 436 124 498 497 467 528 404 528 529 404 124 559 498 124 560 559 529 590 404 590 591 404 124 621 560 124 622 621 591 652 404 652 653 404 124 683 622 124 684 683 653 714 404 714 715 404 124 745 684 124 746 745 715 776 404 776 777 404 124 807 746 124 808 807 777 838 404 838 839 404 124 869 808 124 870 869 839 900 404 900 901 404 124 931 870 124 932 931 901 962 404 962 963 404 124 993 932 932 993 992 932 992 933 933 992 991 933 991 934 934 991 990 934 990 935 935 990 989 935 989 936 936 989 988 936 988 937 937 988 987 937 987 938 938 987 986 938 986 939 939 986 985 939 985 940 940 985 984 940 984 941 941 984 983 941 983 942 942 983 982 942 982 943 943 982 981 943 981 944 944 981 945 981 980 945 945 980 979 945 979 946 946 979 947 979 978 947 947 978 977 947 977 948 948 977 976 948 976 949 949 976 975 949 975 950 950 975 951 975 974 951 951 974 973 951 973 952 952 973 972 952 972 953 953 972 954 972 971 954 954 971 970 954 970 955 955 970 956 970 969 956 956 969 968 956 968 957 957 968 967 957 967 958 958 967 966 958 966 959 959 966 965 959 965 960 960 965 964 960 964 961 961 964 963 961 963 962 902 961 962 902 962 901 903 960 961 903 961 902 904 959 960 904 960 903 905 958 959 905 959 904 906 957 958 906 958 905 907 956 957 907 957 906 908 955 956 908 956 907 909 954 955 909 955 908 910 953 909 953 954 909 911 952 953 911 953 910 912 951 952 912 952 911 913 950 912 950 951 912 914 949 950 914 950 913 915 948 949 915 949 914 916 947 948 916 948 915 917 946 916 946 947 916 918 945 946 918 946 917 919 944 918 944 945 918 920 943 944 920 944 919 921 942 943 921 943 920 922 941 942 922 942 921 923 940 941 923 941 922 924 939 940 924 940 923 925 938 939 925 939 924 926 937 938 926 938 925 927 936 937 927 937 926 928 935 936 928 936 927 929 934 935 929 935 928 930 933 934 930 934 929 931 932 933 931 933 930 870 931 930 870 930 871 871 930 929 871 929 872 872 929 928 872 928 873 873 928 927 873 927 874 874 927 926 874 926 875 875 926 925 875 925 876 876 925 924 876 924 877 877 924 923 877 923 878 878 923 922 878 922 879 879 922 921 879 921 880 880 921 920 880 920 881 881 920 919 881 919 882 882 919 883 919 918 883 883 918 917 883 917 884 884 917 885 917 916 885 885 916 915 885 915 886 886 915 914 886 914 887 887 914 913 887 913 888 888 913 889 913 912 889 889 912 911 889 911 890 890 911 910 890 910 891 891 910 892 910 909 892 892 909 908 892 908 893 893 908 907 893 907 894 894 907 906 894 906 895 895 906 905 895 905 896 896 905 904 896 904 897 897 904 903 897 903 898 898 903 902 898 902 899 899 902 901 899 901 900 840 899 900 840 900 839 841 898 899 841 899 840 842 897 898 842 898 841 843 896 897 843 897 842 844 895 896 844 896 843 845 894 895 845 895 844 846 893 845 893 894 845 847 892 893 847 893 846 848 891 847 891 892 847 849 890 891 849 891 848 850 889 890 850 890 849 851 888 889 851 889 850 852 887 888 852 888 851 853 886 887 853 887 852 854 885 886 854 886 853 855 884 854 884 885 854 856 883 884 856 884 855 857 882 856 882 883 856 858 881 882 858 882 857 859 880 881 859 881 858 860 879 880 860 880 859 861 878 879 861 879 860 862 877 878 862 878 861 863 876 877 863 877 862 864 875 876 864 876 863 865 874 875 865 875 864 866 873 874 866 874 865 867 872 873 867 873 866 868 871 872 868 872 867 869 870 871 869 871 868 808 869 868 808 868 809 809 868 867 809 867 810 810 867 866 810 866 811 811 866 865 811 865 812 812 865 864 812 864 813 813 864 863 813 863 814 814 863 862 814 862 815 815 862 861 815 861 816 816 861 860 816 860 817 817 860 859 817 859 818 818 859 858 818 858 819 819 858 857 819 857 820 820 857 821 857 856 821 821 856 855 821 855 822 822 855 823 855 854 823 823 854 853 823 853 824 824 853 852 824 852 825 825 852 851 825 851 826 826 851 850 826 850 827 827 850 849 827 849 828 828 849 848 828 848 829 829 848 830 848 847 830 830 847 846 830 846 831 831 846 832 846 845 832 832 845 844 832 844 833 833 844 843 833 843 834 834 843 842 834 842 835 835 842 841 835 841 836 836 841 840 836 840 837 837 840 839 837 839 838 778 837 838 778 838 777 779 836 837 779 837 778 780 835 836 780 836 779 781 834 835 781 835 780 782 833 834 782 834 781 783 832 833 783 833 782 784 831 783 831 832 783 785 830 831 785 831 784 786 829 785 829 830 785 787 828 829 787 829 786 788 827 828 788 828 787 789 826 788 826 827 788 790 825 826 790 826 789 791 824 825 791 825 790 792 823 824 792 824 791 793 822 823 793 823 792 794 821 822 794 822 793 795 820 794 820 821 794 796 819 820 796 820 795 797 818 819 797 819 796 798 817 818 798 818 797 799 816 817 799 817 798 800 815 816 800 816 799 801 814 815 801 815 800 802 813 814 802 814 801 803 812 813 803 813 802 804 811 812 804 812 803 805 810 811 805 811 804 806 809 810 806 810 805 807 808 809 807 809 806 746 807 806 746 806 747 747 806 805 747 805 748 748 805 804 748 804 749 749 804 803 749 803 750 750 803 802 750 802 751 751 802 801 751 801 752 752 801 800 752 800 753 753 800 799 753 799 754 754 799 798 754 798 755 755 798 797 755 797 756 756 797 796 756 796 757 757 796 795 757 795 758 758 795 759 795 794 759 759 794 793 759 793 760 760 793 792 760 792 761 761 792 791 761 791 762 762 791 790 762 790 763 763 790 789 763 789 764 764 789 765 789 788 765 765 788 787 765 787 766 766 787 786 766 786 767 767 786 768 786 785 768 768 785 784 768 784 769 769 784 770 784 783 770 770 783 782 770 782 771 771 782 781 771 781 772 772 781 780 772 780 773 773 780 779 773 779 774 774 779 778 774 778 775 775 778 777 775 777 776 716 775 776 716 776 715 717 774 775 717 775 716 718 773 774 718 774 717 719 772 773 719 773 718 720 771 772 720 772 719 721 770 771 721 771 720 722 769 721 769 770 721 723 768 769 723 769 722 724 767 723 767 768 723 725 766 767 725 767 724 726 765 766 726 766 725 727 764 726 764 765 726 728 763 764 728 764 727 729 762 763 729 763 728 730 761 762 730 762 729 731 760 730 760 761 730 732 759 760 732 760 731 733 758 732 758 759 732 734 757 758 734 758 733 735 756 757 735 757 734 736 755 756 736 756 735 737 754 755 737 755 736 738 753 737 753 754 737 739 752 753 739 753 738 740 751 752 740 752 739 741 750 751 741 751 740 742 749 750 742 750 741 743 748 749 743 749 742 744 747 748 744 748 743 745 746 747 745 747 744 684 745 744 684 744 685 685 744 743 685 743 686 686 743 742 686 742 687 687 742 741 687 741 688 688 741 740 688 740 689 689 740 739 689 739 690 690 739 738 690 738 691 691 738 692 738 737 692 692 737 736 692 736 693 693 736 735 693 735 694 694 735 734 694 734 695 695 734 733 695 733 696 696 733 697 733 732 697 697 732 731 697 731 698 698 731 699 731 730 699 699 730 729 699 729 700 700 729 728 700 728 701 701 728 727 701 727 702 702 727 703 727 726 703 703 726 725 703 725 704 704 725 724 704 724 705 705 724 706 724 723 706 706 723 722 706 722 707 707 722 708 722 721 708 708 721 720 708 720 709 709 720 719 709 719 710 710 719 718 710 718 711 711 718 717 711 717 712 712 717 716 712 716 713 713 716 715 713 715 714 654 713 714 654 714 653 655 712 713 655 713 654 656 711 712 656 712 655 657 710 711 657 711 656 658 709 710 658 710 657 659 708 709 659 709 658 660 707 659 707 708 659 661 706 707 661 707 660 662 705 661 705 706 661 663 704 705 663 705 662 664 703 704 664 704 663 665 702 703 665 703 664 666 701 702 666 702 665 667 700 701 667 701 666 668 699 700 668 700 667 669 698 668 698 699 668 670 697 698 670 698 669 671 696 670 696 697 670 672 695 696 672 696 671 673 694 695 673 695 672 674 693 694 674 694 673 675 692 693 675 693 674 676 691 675 691 692 675 677 690 691 677 691 676 678 689 690 678 690 677 679 688 689 679 689 678 680 687 688 680 688 679 681 686 687 681 687 680 682 685 686 682 686 681 683 684 685 683 685 682 622 683 682 622 682 623 623 682 681 623 681 624 624 681 680 624 680 625 625 680 679 625 679 626 626 679 678 626 678 627 627 678 677 627 677 628 628 677 676 628 676 629 629 676 630 676 675 630 630 675 674 630 674 631 631 674 673 631 673 632 632 673 672 632 672 633 633 672 671 633 671 634 634 671 635 671 670 635 635 670 669 635 669 636 636 669 637 669 668 637 637 668 667 637 667 638 638 667 666 638 666 639 639 666 665 639 665 640 640 665 641 665 664 641 641 664 663 641 663 642 642 663 662 642 662 643 643 662 644 662 661 644 644 661 660 644 660 645 645 660 646 660 659 646 646 659 658 646 658 647 647 658 657 647 657 648 648 657 656 648 656 649 649 656 655 649 655 650 650 655 654 650 654 651 651 654 653 651 653 652 592 651 652 592 652 591 593 650 651 593 651 592 594 649 650 594 650 593 595 648 649 595 649 594 596 647 648 596 648 595 597 646 647 597 647 596 598 645 597 645 646 597 599 644 645 599 645 598 600 643 599 643 644 599 601 642 643 601 643 600 602 641 642 602 642 601 603 640 641 603 641 602 604 639 640 604 640 603 605 638 639 605 639 604 606 637 638 606 638 605 607 636 637 607 637 606 608 635 636 608 636 607 609 634 608 634 635 608 610 633 634 610 634 609 611 632 633 611 633 610 612 631 632 612 632 611 613 630 631 613 631 612 614 629 613 629 630 613 615 628 629 615 629 614 616 627 628 616 628 615 617 626 627 617 627 616 618 625 626 618 626 617 619 624 625 619 625 618 620 623 624 620 624 619 621 622 623 621 623 620 560 621 620 560 620 561 561 620 619 561 619 562 562 619 618 562 618 563 563 618 617 563 617 564 564 617 616 564 616 565 565 616 615 565 615 566 566 615 614 566 614 567 567 614 613 567 613 568 568 613 612 568 612 569 569 612 611 569 611 570 570 611 610 570 610 571 571 610 609 571 609 572 572 609 573 609 608 573 573 608 607 573 607 574 574 607 606 574 606 575 575 606 605 575 605 576 576 605 604 576 604 577 577 604 578 604 603 578 578 603 602 578 602 579 579 602 601 579 601 580 580 601 600 580 600 581 581 600 582 600 599 582 582 599 598 582 598 583 583 598 584 598 597 584 584 597 596 584 596 585 585 596 595 585 595 586 586 595 594 586 594 587 587 594 593 587 593 588 588 593 592 588 592 589 589 592 591 589 591 590 530 589 590 530 590 529 531 588 589 531 589 530 532 587 588 532 588 531 533 586 587 533 587 532 534 585 586 534 586 533 535 584 585 535 585 534 536 583 535 583 584 535 537 582 583 537 583 536 538 581 537 581 582 537 539 580 581 539 581 538 540 579 580 540 580 539 541 578 579 541 579 540 542 577 541 577 578 541 543 576 577 543 577 542 544 575 576 544 576 543 545 574 575 545 575 544 546 573 574 546 574 545 547 572 546 572 573 546 548 571 572 548 572 547 549 570 571 549 571 548 550 569 570 550 570 549 551 568 569 551 569 550 552 567 551 567 568 551 553 566 567 553 567 552 554 565 566 554 566 553 555 564 565 555 565 554 556 563 564 556 564 555 557 562 563 557 563 556 558 561 562 558 562 557 559 560 561 559 561 558 498 559 558 498 558 499 499 558 557 499 557 500 500 557 556 500 556 501 501 556 555 501 555 502 502 555 554 502 554 503 503 554 553 503 553 504 504 553 552 504 552 505 505 552 506 552 551 506 506 551 550 506 550 507 507 550 549 507 549 508 508 549 548 508 548 509 509 548 547 509 547 510 510 547 511 547 546 511 511 546 545 511 545 512 512 545 544 512 544 513 513 544 543 513 543 514 514 543 542 514 542 515 515 542 516 542 541 516 516 541 540 516 540 517 517 540 539 517 539 518 518 539 538 518 538 519 519 538 520 538 537 520 520 537 536 520 536 521 521 536 535 521 535 522 522 535 534 522 534 523 523 534 533 523 533 524 524 533 532 524 532 525 525 532 531 525 531 526 526 531 530 526 530 527 527 530 529 527 529 528 468 527 528 468 528 467 469 526 527 469 527 468 470 525 526 470 526 469 471 524 525 471 525 470 472 523 524 472 524 471 473 522 523 473 523 472 474 521 522 474 522 473 475 520 521 475 521 474 476 519 475 519 520 475 477 518 519 477 519 476 478 517 518 478 518 477 479 516 517 479 517 478 480 515 479 515 516 479 481 514 515 481 515 480 482 513 514 482 514 481 483 512 513 483 513 482 484 511 512 484 512 483 485 510 484 510 511 484 486 509 510 486 510 485 487 508 509 487 509 486 488 507 508 488 508 487 489 506 507 489 507 488 490 505 489 505 506 489 491 504 505 491 505 490 492 503 504 492 504 491 493 502 503 493 503 492 494 501 502 494 502 493 495 500 501 495 501 494 496 499 500 496 500 495 497 498 499 497 499 496 436 497 496 436 496 437 437 496 495 437 495 438 438 495 494 438 494 439 439 494 493 439 493 440 440 493 492 440 492 441 441 492 491 441 491 442 442 491 490 442 490 443 443 490 444 490 489 444 444 489 488 444 488 445 445 488 487 445 487 446 446 487 486 446 486 447 447 486 485 447 485 448 448 485 449 485 484 449 449 484 483 449 483 450 450 483 482 450 482 451 451 482 481 451 481 452 452 481 480 452 480 453 453 480 454 480 479 454 454 479 478 454 478 455 455 478 477 455 477 456 456 477 476 456 476 457 457 476 458 476 475 458 458 475 474 458 474 459 459 474 473 459 473 460 460 473 472 460 472 461 461 472 471 461 471 462 462 471 470 462 470 463 463 470 469 463 469 464 464 469 468 464 468 465 465 468 467 465 467 466 406 465 466 406 466 405 407 464 465 407 465 406 408 463 464 408 464 407 409 462 463 409 463 408 410 461 462 410 462 409 411 460 461 411 461 410 412 459 460 412 460 411 413 458 459 413 459 412 414 457 413 457 458 413 415 456 457 415 457 414 416 455 456 416 456 415 417 454 455 417 455 416 418 453 417 453 454 417 419 452 453 419 453 418 420 451 452 420 452 419 421 450 451 421 451 420 422 449 450 422 450 421 423 448 422 448 449 422 424 447 448 424 448 423 425 446 447 425 447 424 426 445 446 426 446 425 427 444 445 427 445 426 428 443 427 443 444 427 429 442 443 429 443 428 430 441 442 430 442 429 431 440 441 431 441 430 432 439 440 432 440 431 433 438 439 433 439 432 434 437 438 434 438 433 435 436 437 435 437 434 373 435 434 373 434 374 374 434 433 374 433 375 375 433 432 375 432 376 376 432 431 376 431 377 377 431 430 377 430 378 378 430 429 378 429 379 379 429 428 379 428 380 380 428 381 428 427 381 381 427 426 381 426 382 382 426 425 382 425 383 383 425 424 383 424 384 384 424 423 384 423 385 385 423 386 423 422 386 386 422 421 386 421 387 387 421 420 387 420 388 388 420 419 388 419 389 389 419 418 389 418 390 390 418 391 418 417 391 391 417 416 391 416 392 392 416 415 392 415 393 393 415 414 393 414 394 394 414 395 414 413 395 395 413 412 395 412 396 396 412 411 396 411 397 397 411 410 397 410 398 398 410 409 398 409 399 399 409 408 399 408 400 400 408 407 400 407 401 401 407 406 401 406 402 402 406 405 402 405 403 343 402 403 343 403 342 344 401 402 344 402 343 345 400 401 345 401 344 346 399 400 346 400 345 347 398 399 347 399 346 348 397 398 348 398 347 349 396 397 349 397 348 350 395 396 350 396 349 351 394 350 394 395 350 352 393 394 352 394 351 353 392 393 353 393 352 354 391 392 354 392 353 355 390 354 390 391 354 356 389 390 356 390 355 357 388 389 357 389 356 358 387 388 358 388 357 359 386 387 359 387 358 360 385 359 385 386 359 361 384 385 361 385 360 362 383 384 362 384 361 363 382 383 363 383 362 364 381 382 364 382 363 365 380 364 380 381 364 366 379 380 366 380 365 367 378 379 367 379 366 368 377 378 368 378 367 369 376 377 369 377 368 370 375 376 370 376 369 371 374 375 371 375 370 372 373 374 372 374 371 311 372 371 311 371 312 312 371 370 312 370 313 313 370 369 313 369 314 314 369 368 314 368 315 315 368 367 315 367 316 316 367 366 316 366 317 317 366 365 317 365 318 318 365 364 318 364 319 319 364 363 319 363 320 320 363 362 320 362 321 321 362 361 321 361 322 322 361 360 322 360 323 323 360 324 360 359 324 324 359 358 324 358 325 325 358 357 325 357 326 326 357 356 326 356 327 327 356 355 327 355 328 328 355 329 355 354 329 329 354 353 329 353 330 330 353 352 330 352 331 331 352 351 331 351 332 332 351 333 351 350 333 333 350 349 333 349 334 334 349 348 334 348 335 335 348 347 335 347 336 336 347 346 336 346 337 337 346 345 337 345 338 338 345 344 338 344 339 339 344 343 339 343 340 340 343 342 340 342 341 281 340 341 281 341 280 282 339 340 282 340 281 283 338 339 283 339 282 284 337 338 284 338 283 285 336 337 285 337 284 286 335 336 286 336 285 287 334 335 287 335 286 288 333 334 288 334 287 289 332 288 332 333 288 290 331 332 290 332 289 291 330 331 291 331 290 292 329 330 292 330 291 293 328 329 293 329 292 294 327 328 294 328 293 295 326 327 295 327 294 296 325 326 296 326 295 297 324 325 297 325 296 298 323 297 323 324 297 299 322 323 299 323 298 300 321 322 300 322 299 301 320 321 301 321 300 302 319 320 302 320 301 303 318 319 303 319 302 304 317 318 304 318 303 305 316 317 305 317 304 306 315 316 306 316 305 307 314 315 307 315 306 308 313 314 308 314 307 309 312 313 309 313 308 310 311 312 310 312 309 249 310 309 249 309 250 250 309 308 250 308 251 251 308 307 251 307 252 252 307 306 252 306 253 253 306 305 253 305 254 254 305 304 254 304 255 255 304 303 255 303 256 256 303 302 256 302 257 257 302 301 257 301 258 258 301 300 258 300 259 259 300 299 259 299 260 260 299 298 260 298 261 261 298 297 261 297 262 262 297 296 262 296 263 263 296 295 263 295 264 264 295 294 264 294 265 265 294 293 265 293 266 266 293 292 266 292 267 267 292 291 267 291 268 268 291 290 268 290 269 269 290 289 269 289 270 270 289 271 289 288 271 271 288 287 271 287 272 272 287 286 272 286 273 273 286 285 273 285 274 274 285 284 274 284 275 275 284 283 275 283 276 276 283 282 276 282 277 277 282 281 277 281 278 278 281 280 278 280 279 219 278 279 219 279 218 220 277 278 220 278 219 221 276 277 221 277 220 222 275 276 222 276 221 223 274 275 223 275 222 224 273 274 224 274 223 225 272 273 225 273 224 226 271 272 226 272 225 227 270 226 270 271 226 228 269 270 228 270 227 229 268 269 229 269 228 230 267 268 230 268 229 231 266 267 231 267 230 232 265 266 232 266 231 233 264 265 233 265 232 234 263 264 234 264 233 235 262 263 235 263 234 236 261 262 236 262 235 237 260 261 237 261 236 238 259 260 238 260 237 239 258 259 239 259 238 240 257 258 240 258 239 241 256 257 241 257 240 242 255 256 242 256 241 243 254 255 243 255 242 244 253 254 244 254 243 245 252 253 245 253 244 246 251 252 246 252 245 247 250 251 247 251 246 248 249 250 248 250 247 187 248 247 187 247 188 188 247 246 188 246 189 189 246 245 189 245 190 190 245 244 190 244 191 191 244 243 191 243 192 192 243 242 192 242 193 193 242 241 193 241 194 194 241 240 194 240 195 195 240 239 195 239 196 196 239 238 196 238 197 197 238 237 197 237 198 198 237 236 198 236 199 199 236 235 199 235 200 200 235 234 200 234 201 201 234 233 201 233 202 202 233 232 202 232 203 203 232 231 203 231 204 204 231 230 204 230 205 205 230 229 205 229 206 206 229 228 206 228 207 207 228 227 207 227 208 208 227 209 227 226 209 209 226 225 209 225 210 210 225 224 210 224 211 211 224 223 211 223 212 212 223 222 212 222 213 213 222 221 213 221 214 214 221 220 214 220 215 215 220 219 215 219 216 216 219 218 216 218 217 157 216 217 157 217 156 158 215 216 158 216 157 159 214 215 159 215 158 160 213 214 160 214 159 161 212 213 161 213 160 162 211 212 162 212 161 163 210 211 163 211 162 164 209 210 164 210 163 165 208 164 208 209 164 166 207 208 166 208 165 167 206 207 167 207 166 168 205 206 168 206 167 169 204 205 169 205 168 170 203 204 170 204 169 171 202 203 171 203 170 172 201 202 172 202 171 173 200 201 173 201 172 174 199 200 174 200 173 175 198 199 175 199 174 176 197 198 176 198 175 177 196 197 177 197 176 178 195 196 178 196 177 179 194 195 179 195 178 180 193 194 180 194 179 181 192 193 181 193 180 182 191 192 182 192 181 183 190 191 183 191 182 184 189 190 184 190 183 185 188 189 185 189 184 186 187 188 186 188 185 125 186 185 125 185 126 126 185 184 126 184 127 127 184 183 127 183 128 128 183 182 128 182 129 129 182 181 129 181 130 130 181 180 130 180 131 131 180 179 131 179 132 132 179 178 132 178 133 133 178 177 133 177 134 134 177 176 134 176 135 135 176 175 135 175 136 136 175 174 136 174 137 137 174 173 137 173 138 138 173 172 138 172 139 139 172 171 139 171 140 140 171 170 140 170 141 141 170 169 141 169 142 142 169 168 142 168 143 143 168 167 143 167 144 144 167 166 144 166 145 145 166 165 145 165 146 146 165 147 165 164 147 147 164 163 147 163 148 148 163 162 148 162 149 149 162 161 149 161 150 150 161 160 150 160 151 151 160 159 151 159 152 152 159 158 152 158 153 153 158 157 153 157 154 154 157 156 154 156 155 94 154 155 94 155 93 95 153 154 95 154 94 96 152 153 96 153 95 97 151 152 97 152 96 98 150 151 98 151 97 99 149 150 99 150 98 100 148 149 100 149 99 101 147 148 101 148 100 102 146 147 102 147 101 103 145 146 103 146 102 104 144 145 104 145 103 105 143 144 105 144 104 106 142 105 142 143 105 107 141 142 107 142 106 108 140 141 108 141 107 109 139 140 109 140 108 110 138 139 110 139 109 111 137 138 111 138 110 112 136 137 112 137 111 113 135 136 113 136 112 114 134 135 114 135 113 115 133 134 115 134 114 116 132 133 116 133 115 117 131 132 117 132 116 118 130 131 118 131 117 119 129 130 119 130 118 120 128 129 120 129 119 121 127 128 121 128 120 122 126 127 122 127 121 123 125 126 123 126 122 62 123 122 62 122 63 63 122 121 63 121 64 64 121 120 64 120 65 65 120 119 65 119 66 66 119 118 66 118 67 67 118 117 67 117 68 68 117 116 68 116 69 69 116 115 69 115 70 70 115 114 70 114 71 71 114 113 71 113 72 72 113 112 72 112 73 73 112 111 73 111 74 74 111 110 74 110 75 75 110 109 75 109 76 76 109 108 76 108 77 77 108 107 77 107 78 78 107 106 78 106 79 79 106 80 106 105 80 80 105 104 80 104 81 81 104 103 81 103 82 82 103 102 82 102 83 83 102 101 83 101 84 84 101 100 84 100 85 85 100 99 85 99 86 86 99 98 86 98 87 87 98 97 87 97 88 88 97 96 88 96 89 89 96 95 89 95 90 90 95 94 90 94 91 91 94 93 91 93 92 32 91 92 32 92 31 33 90 91 33 91 32 34 89 90 34 90 33 35 88 89 35 89 34 36 87 88 36 88 35 37 86 87 37 87 36 38 85 86 38 86 37 39 84 85 39 85 38 40 83 84 40 84 39 41 82 83 41 83 40 42 81 82 42 82 41 43 80 81 43 81 42 44 79 80 44 80 43 45 78 79 45 79 44 46 77 78 46 78 45 47 76 77 47 77 46 48 75 76 48 76 47 49 74 75 49 75 48 50 73 74 50 74 49 51 72 73 51 73 50 52 71 72 52 72 51 53 70 71 53 71 52 54 69 70 54 70 53 55 68 69 55 69 54 56 67 68 56 68 55 57 66 67 57 67 56 58 65 66 58 66 57 59 64 65 59 65 58 60 63 64 60 64 59 61 62 63 61 63 60 0 61 60 0 60 1 1 60 59 1 59 2 2 59 58 2 58 3 3 58 57 3 57 4 4 57 56 4 56 5 5 56 55 5 55 6 6 55 54 6 54 7 7 54 53 7 53 8 8 53 52 8 52 9 9 52 51 9 51 10 10 51 50 10 50 11 11 50 49 11 49 12 12 49 48 12 48 13 13 48 47 13 47 14 14 47 46 14 46 15 15 46 45 15 45 16 16 45 44 16 44 17 17 44 43 17 43 18 18 43 42 18 42 19 19 42 41 19 41 20 20 41 40 20 40 21 21 40 39 21 39 22 22 39 38 22 38 23 23 38 37 23 37 24 24 37 36 24 36 25 25 36 35 25 35 26 26 35 34 26 34 27 27 34 33 27 33 28 28 33 32 28 32 29 29 32 31 29 31 30 964 29 30 964 30 963 965 28 29 965 29 964 966 27 28 966 28 965 967 26 27 967 27 966 968 25 26 968 26 967 969 24 25 969 25 968 970 23 24 970 24 969 971 22 23 971 23 970 972 21 22 972 22 971 973 20 21 973 21 972 974 19 20 974 20 973 975 18 19 975 19 974 976 17 18 976 18 975 977 16 17 977 17 976 978 15 16 978 16 977 979 14 978 14 15 978 980 13 14 980 14 979 981 12 980 12 13 980 982 11 981 11 12 981 983 10 982 10 11 982 984 9 983 9 10 983 985 8 984 8 9 984 986 7 985 7 8 985 987 6 986 6 7 986 988 5 987 5 6 987 989 4 988 4 5 988 990 3 989 3 4 989 991 2 990 2 3 990 992 1 991 1 2 991 993 0 992 0 1 992";
    _sphere.position = "0.0961330235004 0.0191220473498 -0.995184779167 0.191341012716 0.0380600951612 -0.980785369873 0.284706294537 0.0566316060722 -0.956940531731 0.37532967329 0.074657715857 -0.923879861832 0.462338447571 0.091964840889 -0.88192152977 0.544894635677 0.108386285603 -0.831470012665 0.622203171253 0.123763911426 -0.773010730743 0.693519532681 0.137949615717 -0.707107067108 0.758157014847 0.150806814432 -0.634393692017 0.815492928028 0.162211641669 -0.555570602417 0.864975214005 0.17205427587 -0.471397042274 0.906127274036 0.180239930749 -0.382683753967 0.938552856445 0.186689779162 -0.290284991264 0.961939692497 0.191341713071 -0.195090532303 0.976062476635 0.194150909781 -0.098017334938 0.980785250664 0.195090323687 -1.19209289551e-07 0.976062476635 0.194150909781 0.0980170369148 0.961939752102 0.191341727972 0.19509023428 0.938552975655 0.186689808965 0.290284633636 0.906127393246 0.18023994565 0.382683396339 0.864975333214 0.172054305673 0.471396803856 0.815493106842 0.162211671472 0.555570304394 0.758157253265 0.150806859136 0.634393334389 0.693519890308 0.137949690223 0.70710682869 0.622203588486 0.123763985932 0.773010492325 0.544895112514 0.108386382461 0.831469595432 0.462338984013 0.0919649451971 0.881921231747 0.375330299139 0.0746578425169 0.923879504204 0.284706920385 0.0566317290068 0.956940352917 0.191341713071 0.0380602329969 0.980785250664 0.0961337685585 0.0191221963614 0.995184719563 0.0905560255051 0.037509534508 0.995184719563 0.18023994565 0.0746578350663 0.980785250664 0.26818805933 0.11108712852 0.956940352917 0.353553384542 0.146446615458 0.923879504204 0.435513794422 0.180395722389 0.881921231747 0.513279974461 0.21260753274 0.831469595432 0.586102962494 0.242771789432 0.773010492325 0.653281450272 0.270598053932 0.70710682869 0.714168488979 0.295818299055 0.634393334389 0.768177688122 0.318189620972 0.555570304394 0.814788937569 0.337496638298 0.471396803856 0.853553295135 0.35355335474 0.382683396339 0.884097516537 0.366205215454 0.290284633636 0.906127393246 0.375330269337 0.19509023428 0.919430732727 0.380840688944 0.0980170369148 0.923879444599 0.382683426142 -1.19209289551e-07 0.919430732727 0.380840688944 -0.098017334938 0.906127333641 0.375330269337 -0.195090532303 0.884097456932 0.366205155849 -0.290284991264 0.853553175926 0.353553324938 -0.382683753967 0.814788818359 0.337496578693 -0.471397042274 0.768177509308 0.318189561367 -0.555570602417 0.714168250561 0.295818209648 -0.634393692017 0.653281092644 0.270597904921 -0.707107067108 0.586102545261 0.24277164042 -0.773010730743 0.513279497623 0.212607339025 -0.831470012665 0.435513287783 0.180395513773 -0.88192152977 0.353552818298 0.146446377039 -0.923879861832 0.268187463284 0.111086890101 -0.956940531731 0.180239289999 0.0746575593948 -0.980785369873 0.0905553251505 0.0375092439353 -0.995184779167 0.0814976394176 0.0544549822807 -0.995184779167 0.162211075425 0.108385972679 -0.980785369873 0.241362333298 0.161273166537 -0.956940531731 0.318189114332 0.212607175112 -0.923879861832 0.391951590776 0.261893689632 -0.88192152977 0.461939334869 0.308658003807 -0.831470012665 0.527478337288 0.352449774742 -0.773010730743 0.587937414646 0.392847239971 -0.707107067108 0.642734408379 0.429461449385 -0.634393692017 0.691341459751 0.461939632893 -0.555570602417 0.733290553093 0.489969074726 -0.471397042274 0.768177509308 0.513279855251 -0.382683753967 0.795666635036 0.531647503376 -0.290284991264 0.815493047237 0.54489505291 -0.195090532303 0.827465772629 0.552894949913 -0.098017334938 0.831469476223 0.555570185184 -1.19209289551e-07 0.827465772629 0.552894949913 0.0980170369148 0.815493106842 0.54489505291 0.19509023428 0.795666694641 0.531647562981 0.290284633636 0.768177628517 0.513279914856 0.382683396339 0.733290672302 0.489969164133 0.471396803856 0.691341638565 0.4619397223 0.555570304394 0.642734646797 0.429461598396 0.634393334389 0.587937772274 0.39284747839 0.70710682869 0.527478694916 0.352450013161 0.773010492325 0.461939752102 0.30865830183 0.831469595432 0.391952037811 0.261893987656 0.881921231747 0.318189620972 0.212607517838 0.923879504204 0.24136286974 0.161273509264 0.956940352917 0.16221165657 0.10838637501 0.980785250664 0.0814982652664 0.0544554032385 0.995184719563 0.0693085715175 0.069308578968 0.995184719563 0.13794966042 0.137949675322 0.980785250664 0.205262243748 0.205262243748 0.956940352917 0.27059802413 0.27059802413 0.923879504204 0.333327800035 0.333327800035 0.881921231747 0.392847448587 0.39284747839 0.831469595432 0.448583722115 0.448583751917 0.773010492325 0.499999940395 0.499999970198 0.70710682869 0.546600878239 0.546600937843 0.634393334389 0.587937712669 0.587937712669 0.555570304394 0.62361240387 0.623612463474 0.471396803856 0.653281331062 0.653281390667 0.382683396339 0.67665886879 0.676658987999 0.290284633636 0.693519830704 0.693519830704 0.19509023428 0.703701794147 0.703701794147 0.0980170369148 0.707106649876 0.70710670948 -1.19209289551e-07 0.703701794147 0.703701794147 -0.098017334938 0.693519771099 0.693519830704 -0.195090532303 0.676658809185 0.67665886879 -0.290284991264 0.653281211853 0.653281331062 -0.382683753967 0.623612344265 0.623612344265 -0.471397042274 0.587937533855 0.58793759346 -0.555570602417 0.54660063982 0.546600699425 -0.634393692017 0.499999642372 0.499999672174 -0.707107067108 0.448583424091 0.448583453894 -0.773010730743 0.39284709096 0.392847120762 -0.831470012665 0.333327412605 0.333327442408 -0.88192152977 0.270597577095 0.270597606897 -0.923879861832 0.205261781812 0.205261796713 -0.956940531731 0.137949168682 0.137949168682 -0.980785369873 0.0693080425262 0.0693080425262 -0.995184779167 -5.67579320432e-07 -5.67579377275e-07 -1.0 0.0544549785554 0.0814976319671 -0.995184779167 0.108385965228 0.162211060524 -0.980785369873 0.161273136735 0.241362333298 -0.956940531731 0.212607130408 0.318189114332 -0.923879861832 0.26189365983 0.391951590776 -0.88192152977 0.308657974005 0.461939334869 -0.831470012665 0.352449715137 0.527478337288 -0.773010730743 0.392847180367 0.587937414646 -0.707107067108 0.429461330175 0.642734408379 -0.634393692017 0.461939513683 0.691341459751 -0.555570602417 0.489969044924 0.733290553093 -0.471397042274 0.513279736042 0.768177509308 -0.382683753967 0.531647384167 0.795666635036 -0.290284991264 0.544894933701 0.815493047237 -0.195090532303 0.552894949913 0.827465772629 -0.098017334938 0.55557012558 0.831469476223 -1.19209289551e-07 0.552894949913 0.827465772629 0.0980170369148 0.544894993305 0.815493047237 0.19509023428 0.531647443771 0.795666754246 0.290284633636 0.513279795647 0.768177628517 0.382683396339 0.489969104528 0.733290672302 0.471396803856 0.461939692497 0.69134157896 0.555570304394 0.429461538792 0.642734706402 0.634393334389 0.392847418785 0.587937772274 0.70710682869 0.352449953556 0.527478694916 0.773010492325 0.308658242226 0.461939752102 0.831469595432 0.261893957853 0.391952008009 0.881921231747 0.212607488036 0.318189620972 0.923879504204 0.161273509264 0.241362854838 0.956940352917 0.108386345208 0.16221165657 0.980785250664 0.0544553920627 0.0814982652664 0.995184719563 0.0375095233321 0.0905560180545 0.995184719563 0.074657805264 0.180239930749 0.980785250664 0.111087121069 0.268188029528 0.956940352917 0.146446570754 0.35355335474 0.923879504204 0.180395692587 0.435513734818 0.881921231747 0.212607473135 0.513279914856 0.831469595432 0.242771729827 0.586102902889 0.773010492325 0.270597994328 0.653281450272 0.70710682869 0.295818209648 0.714168488979 0.634393334389 0.318189591169 0.768177568913 0.555570304394 0.337496548891 0.814788877964 0.471396803856 0.353553235531 0.853553235531 0.382683396339 0.366205096245 0.884097516537 0.290284633636 0.37533017993 0.906127274036 0.19509023428 0.380840659142 0.919430673122 0.0980170369148 0.382683336735 0.92387932539 -1.19209289551e-07 0.380840659142 0.919430673122 -0.098017334938 0.375330120325 0.906127274036 -0.195090532303 0.366205066442 0.884097337723 -0.290284991264 0.353553205729 0.853553056717 -0.382683753967 0.337496519089 0.814788758755 -0.471397042274 0.318189442158 0.768177449703 -0.555570602417 0.295818060637 0.714168190956 -0.634393692017 0.270597815514 0.653281033039 -0.707107067108 0.242771565914 0.586102485657 -0.773010730743 0.212607294321 0.513279497623 -0.831470012665 0.180395469069 0.43551325798 -0.88192152977 0.146446317434 0.353552788496 -0.923879861832 0.111086860299 0.268187433481 -0.956940531731 0.0746575444937 0.180239275098 -0.980785369873 0.0375092402101 0.0905553176999 -0.995184779167 0.0191220436245 0.0961330085993 -0.995184779167 0.03806008026 0.191340982914 -0.980785369873 0.0566315799952 0.284706264734 -0.956940531731 0.074657663703 0.375329613686 -0.923879861832 0.0919647961855 0.462338387966 -0.88192152977 0.108386233449 0.544894576073 -0.831470012665 0.123763844371 0.622203052044 -0.773010730743 0.137949541211 0.693519413471 -0.707107067108 0.150806680322 0.758156895638 -0.634393692017 0.16221152246 0.815492808819 -0.555570602417 0.172054201365 0.864975094795 -0.471397042274 0.180239826441 0.906127035618 -0.382683753967 0.186689689755 0.938552677631 -0.290284991264 0.19134157896 0.961939513683 -0.195090532303 0.194150879979 0.976062357426 -0.098017334938 0.195090249181 0.980785012245 -1.19209289551e-07 0.194150879979 0.976062357426 0.0980170369148 0.191341638565 0.961939573288 0.19509023428 0.186689689755 0.938552856445 0.290284633636 0.180239826441 0.906127214432 0.382683396339 0.172054216266 0.864975214005 0.471396803856 0.162211641669 0.815492928028 0.555570304394 0.150806769729 0.758157193661 0.634393334389 0.137949630618 0.693519890308 0.70710682869 0.123763926327 0.622203469276 0.773010492325 0.108386330307 0.54489505291 0.831469595432 0.0919649153948 0.462338894606 0.881921231747 0.0746577978134 0.375330209732 0.923879504204 0.0566317215562 0.284706890583 0.956940352917 0.0380602069199 0.191341683269 0.980785250664 0.0191221851856 0.0961337536573 0.995184719563 -7.92776866376e-09 0.0980171188712 0.995184719563 -2.13393427373e-08 0.195090278983 0.980785250664 -2.21764562269e-09 0.290284633636 0.956940352917 -2.51635512427e-08 0.382683336735 0.923879504204 -1.2003774863e-08 0.471396625042 0.881921231747 -3.81091957991e-08 0.55557012558 0.831469595432 -4.2714081161e-08 0.634393155575 0.773010492325 -5.68386155919e-08 0.70710670948 0.70710682869 -7.68664847328e-08 0.773010313511 0.634393334389 6.34204155858e-09 0.831469357014 0.555570304394 -5.68531390854e-08 0.881921052933 0.471396803856 -8.82093900145e-08 0.923879265785 0.382683396339 -8.63977689392e-08 0.956940174103 0.290284633636 -4.57772486584e-08 0.98078507185 0.19509023428 -1.76155978693e-09 0.995184540749 0.0980170369148 -2.65610378136e-08 0.999999701977 -1.19209289551e-07 -1.76155978693e-09 0.995184540749 -0.098017334938 -9.26083174591e-08 0.980784952641 -0.195090532303 -5.15129023881e-08 0.956939995289 -0.290284991264 -5.33245199108e-08 0.923879086971 -0.382683753967 -4.82113975409e-08 0.881920933723 -0.471397042274 -8.73200889373e-08 0.831469237804 -0.555570602417 -1.06414070444e-07 0.773010015488 -0.634393692017 -5.15013347524e-08 0.707106232643 -0.707107067108 -4.16976710937e-08 0.634392678738 -0.773010730743 -4.00793354061e-08 0.555569648743 -0.831470012665 -3.00820275356e-08 0.471396118402 -0.88192152977 -4.0414207092e-08 0.382682740688 -0.923879861832 -1.89615789736e-08 0.290283977985 -0.956940531731 -8.93307472438e-09 0.195089563727 -0.980785369873 -1.41512201957e-09 0.098016358912 -0.995184779167 -0.0191220454872 0.0961330011487 -0.995184779167 -0.0380600951612 0.191340968013 -0.980785369873 -0.0566316135228 0.284706234932 -0.956940531731 -0.0746577382088 0.375329583883 -0.923879861832 -0.0919648483396 0.462338358164 -0.88192152977 -0.108386300504 0.544894516468 -0.831470012665 -0.123763911426 0.622202992439 -0.773010730743 -0.137949630618 0.693519353867 -0.707107067108 -0.150806874037 0.758156776428 -0.634393692017 -0.162211686373 0.815492749214 -0.555570602417 -0.172054290771 0.864975035191 -0.471397042274 -0.180239915848 0.906126976013 -0.382683753967 -0.186689779162 0.938552618027 -0.290284991264 -0.191341742873 0.961939394474 -0.195090532303 -0.194150879979 0.976062297821 -0.098017334938 -0.195090293884 0.980784952641 -1.19209289551e-07 -0.194150879979 0.976062297821 0.0980170369148 -0.191341727972 0.961939513683 0.19509023428 -0.186689853668 0.938552796841 0.290284633636 -0.180239990354 0.906127154827 0.382683396339 -0.172054320574 0.8649751544 0.471396803856 -0.162211626768 0.815492868423 0.555570304394 -0.150806903839 0.758157074451 0.634393334389 -0.137949734926 0.693519830704 0.70710682869 -0.123764008284 0.622203469276 0.773010492325 -0.108386389911 0.544894993305 0.831469595432 -0.0919649302959 0.462338864803 0.881921231747 -0.0746578425169 0.37533017993 0.923879504204 -0.0566317252815 0.284706890583 0.956940352917 -0.0380602478981 0.191341668367 0.980785250664 -0.0191222000867 0.0961337462068 0.995184719563 -0.037509534508 0.0905560031533 0.995184719563 -0.0746578350663 0.180239900947 0.980785250664 -0.111087121069 0.268188029528 0.956940352917 -0.146446600556 0.353553295135 0.923879504204 -0.180395692587 0.435513675213 0.881921231747 -0.212607517838 0.513279855251 0.831469595432 -0.242771789432 0.586102843285 0.773010492325 -0.270598083735 0.653281390667 0.70710682869 -0.295818299055 0.714168310165 0.634393334389 -0.318189531565 0.768177449703 0.555570304394 -0.337496608496 0.814788758755 0.471396803856 -0.35355335474 0.853553056717 0.382683396339 -0.366205215454 0.884097337723 0.290284633636 -0.375330239534 0.906127154827 0.19509023428 -0.380840629339 0.919430553913 0.0980170369148 -0.382683336735 0.923879206181 -1.19209289551e-07 -0.380840629339 0.919430553913 -0.098017334938 -0.375330239534 0.906127035618 -0.195090532303 -0.366205126047 0.884097218513 -0.290284991264 -0.353553265333 0.853552937508 -0.382683753967 -0.337496578693 0.814788639545 -0.471397042274 -0.318189561367 0.768177330494 -0.555570602417 -0.295818209648 0.714168012142 -0.634393692017 -0.270597875118 0.65328091383 -0.707107067108 -0.242771595716 0.586102366447 -0.773010730743 -0.212607339025 0.513279378414 -0.831470012665 -0.180395513773 0.435513198376 -0.88192152977 -0.146446377039 0.353552728891 -0.923879861832 -0.111086882651 0.268187403679 -0.956940531731 -0.0746575519443 0.180239245296 -0.980785369873 -0.0375092402101 0.0905553027987 -0.995184779167 -0.0544549711049 0.0814976170659 -0.995184779167 -0.108385957778 0.162211030722 -0.980785369873 -0.161273136735 0.241362273693 -0.956940531731 -0.212607160211 0.318189024925 -0.923879861832 -0.26189365983 0.391951501369 -0.88192152977 -0.308657974005 0.46193921566 -0.831470012665 -0.352449715137 0.527478158474 -0.773010730743 -0.392847180367 0.587937235832 -0.707107067108 -0.429461419582 0.64273416996 -0.634393692017 -0.46193960309 0.691341280937 -0.555570602417 -0.489969044924 0.733290374279 -0.471397042274 -0.513279736042 0.768177330494 -0.382683753967 -0.531647384167 0.795666456223 -0.290284991264 -0.544894993305 0.815492749214 -0.195090532303 -0.552894890308 0.827465593815 -0.098017334938 -0.555570065975 0.831469297409 -1.19209289551e-07 -0.552894890308 0.827465593815 0.0980170369148 -0.544894993305 0.815492868423 0.19509023428 -0.531647503376 0.795666515827 0.290284633636 -0.513279855251 0.768177390099 0.382683396339 -0.489969104528 0.733290493488 0.471396803856 -0.461939573288 0.691341400146 0.555570304394 -0.429461538792 0.642734467983 0.634393334389 -0.39284747839 0.587937712669 0.70710682869 -0.352449983358 0.527478575706 0.773010492325 -0.308658242226 0.461939632893 0.831469595432 -0.261893928051 0.391951948404 0.881921231747 -0.212607488036 0.318189531565 0.923879504204 -0.161273494363 0.241362839937 0.956940352917 -0.108386367559 0.162211611867 0.980785250664 -0.0544553995132 0.0814982429147 0.995184719563 -0.0693085715175 0.0693085566163 0.995184719563 -0.13794966042 0.137949630618 0.980785250664 -0.205262213945 0.205262213945 0.956940352917 -0.270597994328 0.270597934723 0.923879504204 -0.333327740431 0.333327710629 0.881921231747 -0.392847418785 0.392847329378 0.831469595432 -0.448583722115 0.448583632708 0.773010492325 -0.499999970198 0.499999880791 0.70710682869 -0.546600818634 0.546600699425 0.634393334389 -0.587937533855 0.587937533855 0.555570304394 -0.623612344265 0.62361228466 0.471396803856 -0.653281271458 0.653281092644 0.382683396339 -0.67665886879 0.676658689976 0.290284633636 -0.693519711494 0.69351965189 0.19509023428 -0.703701674938 0.703701615334 0.0980170369148 -0.707106530666 0.707106471062 -1.19209289551e-07 -0.703701674938 0.703701615334 -0.098017334938 -0.693519711494 0.693519532681 -0.195090532303 -0.67665874958 0.676658689976 -0.290284991264 -0.653281152248 0.653281092644 -0.382683753967 -0.62361228466 0.623612165451 -0.471397042274 -0.587937533855 0.587937355042 -0.555570602417 -0.54660063982 0.546600401402 -0.634393692017 -0.499999582767 0.499999493361 -0.707107067108 -0.448583364487 0.44858327508 -0.773010730743 -0.392847061157 0.39284697175 -0.831470012665 -0.333327382803 0.333327323198 -0.88192152977 -0.270597577095 0.27059751749 -0.923879861832 -0.205261752009 0.205261722207 -0.956940531731 -0.137949153781 0.13794913888 -0.980785369873 -0.0693080276251 0.0693080201745 -0.995184779167 -0.0814976170659 0.054454959929 -0.995184779167 -0.162211030722 0.108385935426 -0.980785369873 -0.241362273693 0.161273092031 -0.956940531731 -0.31818908453 0.212607085705 -0.923879861832 -0.391951501369 0.261893570423 -0.88192152977 -0.461939245462 0.308657854795 -0.831470012665 -0.527478218079 0.352449595928 -0.773010730743 -0.587937295437 0.392847061157 -0.707107067108 -0.642734289169 0.429461121559 -0.634393692017 -0.691341340542 0.461939364672 -0.555570602417 -0.733290433884 0.489968895912 -0.471397042274 -0.768177330494 0.513279616833 -0.382683753967 -0.795666456223 0.531647264957 -0.290284991264 -0.815492868423 0.544894754887 -0.195090532303 -0.827465593815 0.552894771099 -0.098017334938 -0.831469297409 0.555569946766 -1.19209289551e-07 -0.827465593815 0.552894771099 0.0980170369148 -0.815492868423 0.544894874096 0.19509023428 -0.795666575432 0.531647264957 0.290284633636 -0.768177449703 0.513279616833 0.382683396339 -0.733290493488 0.489968985319 0.471396803856 -0.691341400146 0.461939543486 0.555570304394 -0.642734527588 0.429461359978 0.634393334389 -0.587937712669 0.39284735918 0.70710682869 -0.527478635311 0.352449864149 0.773010492325 -0.461939662695 0.308658123016 0.831469595432 -0.391951948404 0.261893898249 0.881921231747 -0.318189561367 0.21260741353 0.923879504204 -0.241362825036 0.161273479462 0.956940352917 -0.162211626768 0.108386322856 0.980785250664 -0.0814982503653 0.0544553771615 0.995184719563 0.0 0.0 1.0 -0.0905559957027 0.0375095121562 0.995184719563 -0.180239900947 0.0746577903628 0.980785250664 -0.268187999725 0.111087098718 0.956940352917 -0.353553265333 0.146446511149 0.923879504204 -0.435513645411 0.180395632982 0.881921231747 -0.513279795647 0.212607368827 0.831469595432 -0.586102843285 0.242771655321 0.773010492325 -0.653281331062 0.270597934723 0.70710682869 -0.714168310165 0.295818090439 0.634393334389 -0.768177390099 0.31818947196 0.555570304394 -0.81478869915 0.337496459484 0.471396803856 -0.853552997112 0.353553086519 0.382683396339 -0.884097278118 0.366204947233 0.290284633636 -0.906127095222 0.375330090523 0.19509023428 -0.919430494308 0.38084051013 0.0980170369148 -0.923879146576 0.382683187723 -1.19209289551e-07 -0.919430494308 0.38084051013 -0.098017334938 -0.906127095222 0.375329971313 -0.195090532303 -0.884097158909 0.366204977036 -0.290284991264 -0.853552877903 0.353553116322 -0.382683753967 -0.814788639545 0.337496399879 -0.471397042274 -0.768177270889 0.318189322948 -0.555570602417 -0.714168012142 0.295817881823 -0.634393692017 -0.65328091383 0.270597726107 -0.707107067108 -0.586102366447 0.242771461606 -0.773010730743 -0.513279378414 0.212607190013 -0.831470012665 -0.435513138771 0.180395409465 -0.88192152977 -0.353552758694 0.146446287632 -0.923879861832 -0.268187373877 0.111086823046 -0.956940531731 -0.180239230394 0.0746575221419 -0.980785369873 -0.0905552953482 0.0375092253089 -0.995184779167 -0.0961329862475 0.0191220324486 -0.995184779167 -0.19134093821 0.0380600653589 -0.980785369873 -0.284706175327 0.0566315576434 -0.956940531731 -0.375329583883 0.0746576339006 -0.923879861832 -0.462338268757 0.0919647589326 -0.88192152977 -0.544894456863 0.108386158943 -0.831470012665 -0.622202932835 0.123763769865 -0.773010730743 -0.693519294262 0.137949466705 -0.707107067108 -0.758156657219 0.150806546211 -0.634393692017 -0.8154925704 0.162211447954 -0.555570602417 -0.864974975586 0.172054111958 -0.471397042274 -0.906126856804 0.180239781737 -0.382683753967 -0.938552498817 0.186689645052 -0.290284991264 -0.961939334869 0.191341474652 -0.195090532303 -0.976062178612 0.19415076077 -0.098017334938 -0.980784833431 0.195090144873 -1.19209289551e-07 -0.976062178612 0.19415076077 0.0980170369148 -0.961939334869 0.191341593862 0.19509023428 -0.938552618027 0.186689585447 0.290284633636 -0.906126976013 0.180239722133 0.382683396339 -0.864975035191 0.172054156661 0.471396803856 -0.815492749214 0.162211567163 0.555570304394 -0.758157014847 0.150806695223 0.634393334389 -0.693519711494 0.137949600816 0.70710682869 -0.622203409672 0.123763866723 0.773010492325 -0.544894874096 0.10838624835 0.831469595432 -0.462338805199 0.0919648781419 0.881921231747 -0.375330120325 0.0746577605605 0.923879504204 -0.284706860781 0.0566317029297 0.956940352917 -0.191341653466 0.0380601994693 0.980785250664 -0.0961337313056 0.019122177735 0.995184719563 -0.0980170965195 -1.08745794591e-08 0.995184719563 -0.195090249181 -2.28326175744e-08 0.980785250664 -0.290284574032 -1.46720502414e-08 0.956940352917 -0.382683247328 -4.42582148708e-08 0.923879504204 -0.471396535635 -3.10984376029e-08 0.881921231747 -0.555569946766 -8.36059399489e-08 0.831469595432 -0.634393036366 -8.95451464089e-08 0.773010492325 -0.707106530666 -5.11834272743e-08 0.70710682869 -0.773010134697 -1.15055811989e-07 0.634393334389 -0.8314691782 -3.18472856975e-08 0.555570304394 -0.881920874119 -8.04276254485e-08 0.471396803856 -0.923879027367 -1.4400009718e-07 0.382683396339 -0.95693987608 -1.4218848321e-07 0.290284633636 -0.980784833431 -4.31086064623e-08 0.19509023428 -0.99518430233 -8.37954061694e-08 0.0980170369148 -0.999999523163 -9.39800415267e-08 -1.19209289551e-07 -0.99518430233 -8.37954061694e-08 -0.098017334938 -0.980784773827 -1.60027326501e-07 -0.195090532303 -0.956939816475 -6.04725514108e-08 -0.290284991264 -0.923878908157 -6.22841653808e-08 -0.382683753967 -0.881920814514 -1.12643853356e-07 -0.471397042274 -0.831468939781 -1.13881128527e-07 -0.555570602417 -0.773009777069 -1.91434466501e-07 -0.634393692017 -0.707106113434 -1.01318953227e-07 -0.707107067108 -0.634392559528 -9.15152895686e-08 -0.773010730743 -0.555569529533 -8.98969503282e-08 -0.831470012665 -0.471395999193 -4.33625473306e-08 -0.88192152977 -0.382682710886 -6.3829745045e-08 -0.923879861832 -0.290283888578 -2.34414017086e-08 -0.956940531731 -0.195089519024 -1.48266963151e-08 -0.980785369873 -0.0980163365602 -8.01564326025e-09 -0.995184779167 -0.096132978797 -0.0191220473498 -0.995184779167 -0.191340923309 -0.0380600914359 -0.980785369873 -0.284706145525 -0.0566316023469 -0.956940531731 -0.375329554081 -0.0746577531099 -0.923879861832 -0.462338238955 -0.091964840889 -0.88192152977 -0.544894397259 -0.108386330307 -0.831470012665 -0.62220287323 -0.123763941228 -0.773010730743 -0.693519234657 -0.13794966042 -0.707107067108 -0.75815653801 -0.15080691874 -0.634393692017 -0.815492451191 -0.16221165657 -0.555570602417 -0.864974915981 -0.172054320574 -0.471397042274 -0.906126797199 -0.180239900947 -0.382683753967 -0.938552439213 -0.186689764261 -0.290284991264 -0.96193921566 -0.191341772676 -0.195090532303 -0.976062059402 -0.194150909781 -0.098017334938 -0.980784773827 -0.195090323687 -1.19209289551e-07 -0.976062059402 -0.194150909781 0.0980170369148 -0.961939275265 -0.191341668367 0.19509023428 -0.938552498817 -0.186689853668 0.290284633636 -0.906126916409 -0.180240005255 0.382683396339 -0.864974975586 -0.172054305673 0.471396803856 -0.81549268961 -0.162211626768 0.555570304394 -0.758156895638 -0.150806903839 0.634393334389 -0.69351965189 -0.137949690223 0.70710682869 -0.622203290462 -0.123764030635 0.773010492325 -0.544894814491 -0.108386404812 0.831469595432 -0.462338775396 -0.0919649302959 0.881921231747 -0.375330090523 -0.0746578425169 0.923879504204 -0.284706830978 -0.0566317252815 0.956940352917 -0.191341638565 -0.0380602404475 0.980785250664 -0.096133723855 -0.0191221982241 0.995184719563 -0.0905559808016 -0.0375095307827 0.995184719563 -0.180239871144 -0.0746578276157 0.980785250664 -0.268187969923 -0.111087106168 0.956940352917 -0.353553205729 -0.146446585655 0.923879504204 -0.435513585806 -0.180395662785 0.881921231747 -0.513279676437 -0.212607488036 0.831469595432 -0.586102664471 -0.24277177453 0.773010492325 -0.653281211853 -0.270597994328 0.70710682869 -0.714168131351 -0.295818269253 0.634393334389 -0.768177270889 -0.318189501762 0.555570304394 -0.814788579941 -0.337496578693 0.471396803856 -0.853552818298 -0.353553324938 0.382683396339 -0.8840970397 -0.366205155849 0.290284633636 -0.906126916409 -0.375330120325 0.19509023428 -0.919430315495 -0.380840599537 0.0980170369148 -0.923879027367 -0.382683336735 -1.19209289551e-07 -0.919430315495 -0.380840599537 -0.098017334938 -0.906126856804 -0.375330209732 -0.195090532303 -0.8840970397 -0.366205066442 -0.290284991264 -0.853552758694 -0.353553205729 -0.382683753967 -0.814788520336 -0.337496578693 -0.471397042274 -0.768177032471 -0.31818947196 -0.555570602417 -0.714167773724 -0.295818209648 -0.634393692017 -0.653280794621 -0.270597875118 -0.707107067108 -0.586102247238 -0.242771610618 -0.773010730743 -0.513279259205 -0.212607339025 -0.831470012665 -0.435513079166 -0.180395469069 -0.88192152977 -0.353552699089 -0.14644639194 -0.923879861832 -0.268187314272 -0.111086852849 -0.956940531731 -0.180239200592 -0.0746575370431 -0.980785369873 -0.090555280447 -0.0375092364848 -0.995184779167 -0.0814975947142 -0.0544549636543 -0.995184779167 -0.162210986018 -0.108385935426 -0.980785369873 -0.241362199187 -0.161273092031 -0.956940531731 -0.318188995123 -0.212607175112 -0.923879861832 -0.39195138216 -0.261893600225 -0.88192152977 -0.461939096451 -0.308657974005 -0.831470012665 -0.527478039265 -0.352449685335 -0.773010730743 -0.587937116623 -0.392847180367 -0.707107067108 -0.642733931541 -0.429461359978 -0.634393692017 -0.691341042519 -0.461939454079 -0.555570602417 -0.73329025507 -0.489969015121 -0.471397042274 -0.76817715168 -0.513279676437 -0.382683753967 -0.795666277409 -0.531647324562 -0.290284991264 -0.8154925704 -0.544894933701 -0.195090532303 -0.827465355396 -0.552894771099 -0.098017334938 -0.831469118595 -0.555570006371 -1.19209289551e-07 -0.827465355396 -0.552894771099 0.0980170369148 -0.815492630005 -0.544894814491 0.19509023428 -0.795666277409 -0.531647384167 0.290284633636 -0.768177211285 -0.513279795647 0.382683396339 -0.733290314674 -0.489969044924 0.471396803856 -0.691341221333 -0.461939513683 0.555570304394 -0.642734289169 -0.429461479187 0.634393334389 -0.587937533855 -0.39284735918 0.70710682869 -0.527478396893 -0.352449923754 0.773010492325 -0.461939483881 -0.308658182621 0.831469595432 -0.391951858997 -0.261893898249 0.881921231747 -0.31818947196 -0.212607458234 0.923879504204 -0.241362780333 -0.161273479462 0.956940352917 -0.162211582065 -0.108386352658 0.980785250664 -0.0814982205629 -0.0544553883374 0.995184719563 -0.0693085342646 -0.0693085566163 0.995184719563 -0.137949600816 -0.137949645519 0.980785250664 -0.205262154341 -0.205262199044 0.956940352917 -0.270597875118 -0.270597934723 0.923879504204 -0.333327651024 -0.333327680826 0.881921231747 -0.392847210169 -0.392847329378 0.831469595432 -0.448583453894 -0.448583632708 0.773010492325 -0.499999731779 -0.499999821186 0.70710682869 -0.546600520611 -0.546600699425 0.634393334389 -0.587937355042 -0.587937414646 0.555570304394 -0.623612105846 -0.62361228466 0.471396803856 -0.653280973434 -0.653281211853 0.382683396339 -0.676658511162 -0.676658689976 0.290284633636 -0.693519413471 -0.693519532681 0.19509023428 -0.703701376915 -0.703701496124 0.0980170369148 -0.707106292248 -0.707106471062 -1.19209289551e-07 -0.703701376915 -0.703701496124 -0.098017334938 -0.693519353867 -0.69351965189 -0.195090532303 -0.676658511162 -0.676658630371 -0.290284991264 -0.65328091383 -0.653281092644 -0.382683753967 -0.623612046242 -0.623612225056 -0.471397042274 -0.587937176228 -0.587937355042 -0.555570602417 -0.546600222588 -0.546600520611 -0.634393692017 -0.499999374151 -0.499999552965 -0.707107067108 -0.44858315587 -0.448583304882 -0.773010730743 -0.392846882343 -0.392847031355 -0.831470012665 -0.333327233791 -0.333327293396 -0.88192152977 -0.270597457886 -0.270597577095 -0.923879861832 -0.205261662602 -0.205261692405 -0.956940531731 -0.137949094176 -0.137949123979 -0.980785369873 -0.0693080052733 -0.0693080201745 -0.995184779167 -0.0544549450278 -0.0814976021647 -0.995184779167 -0.108385898173 -0.162211000919 -0.980785369873 -0.161273047328 -0.241362199187 -0.956940531731 -0.2126070261 -0.318189054728 -0.923879861832 -0.261893510818 -0.391951411963 -0.88192152977 -0.308657765388 -0.461939185858 -0.831470012665 -0.352449476719 -0.527478098869 -0.773010730743 -0.392846941948 -0.587937235832 -0.707107067108 -0.429460972548 -0.64273416996 -0.634393692017 -0.46193921566 -0.691341161728 -0.555570602417 -0.489968776703 -0.733290374279 -0.471397042274 -0.513279438019 -0.768177270889 -0.382683753967 -0.531647145748 -0.795666337013 -0.290284991264 -0.544894576073 -0.815492749214 -0.195090532303 -0.552894592285 -0.827465355396 -0.098017334938 -0.555569767952 -0.8314691782 -1.19209289551e-07 -0.552894592285 -0.827465355396 0.0980170369148 -0.544894635677 -0.815492630005 0.19509023428 -0.531647145748 -0.795666396618 0.290284633636 -0.513279497623 -0.768177390099 0.382683396339 -0.489968836308 -0.733290433884 0.471396803856 -0.461939394474 -0.691341221333 0.555570304394 -0.429461210966 -0.642734348774 0.634393334389 -0.392847239971 -0.587937533855 0.70710682869 -0.352449715137 -0.527478516102 0.773010492325 -0.308658033609 -0.461939543486 0.831469595432 -0.261893838644 -0.391951858997 0.881921231747 -0.212607368827 -0.318189501762 0.923879504204 -0.161273419857 -0.241362795234 0.956940352917 -0.108386293054 -0.162211611867 0.980785250664 -0.0544553585351 -0.0814982354641 0.995184719563 -0.0375094935298 -0.0905559808016 0.995184719563 -0.0746577605605 -0.180239871144 0.980785250664 -0.111087046564 -0.268187940121 0.956940352917 -0.146446481347 -0.353553205729 0.923879504204 -0.18039560318 -0.435513556004 0.881921231747 -0.212607309222 -0.513279676437 0.831469595432 -0.242771521211 -0.586102664471 0.773010492325 -0.270597845316 -0.653281152248 0.70710682869 -0.29581797123 -0.714168071747 0.634393334389 -0.318189352751 -0.76817715168 0.555570304394 -0.337496340275 -0.814788639545 0.471396803856 -0.353552997112 -0.853552937508 0.382683396339 -0.366204857826 -0.884097099304 0.290284633636 -0.375329911709 -0.906126797199 0.19509023428 -0.380840390921 -0.919430196285 0.0980170369148 -0.382683038712 -0.923878967762 -1.19209289551e-07 -0.380840390921 -0.919430196285 -0.098017334938 -0.375329822302 -0.906126916409 -0.195090532303 -0.366204887629 -0.8840970397 -0.290284991264 -0.353552937508 -0.853552818298 -0.382683753967 -0.33749628067 -0.814788579941 -0.471397042274 -0.318189203739 -0.768177092075 -0.555570602417 -0.295817762613 -0.714167892933 -0.634393692017 -0.270597606897 -0.653280794621 -0.707107067108 -0.242771372199 -0.586102247238 -0.773010730743 -0.212607115507 -0.513279259205 -0.831470012665 -0.180395364761 -0.435513049364 -0.88192152977 -0.146446228027 -0.353552699089 -0.923879861832 -0.111086793244 -0.26818728447 -0.956940531731 -0.0746574923396 -0.180239200592 -0.980785369873 -0.037509214133 -0.090555280447 -0.995184779167 -0.0191220249981 -0.0961329713464 -0.995184779167 -0.0380600430071 -0.191340908408 -0.980785369873 -0.0566315427423 -0.28470608592 -0.956940531731 -0.0746575891972 -0.375329524279 -0.923879861832 -0.0919647291303 -0.46233817935 -0.88192152977 -0.108386106789 -0.544894337654 -0.831470012665 -0.12376370281 -0.622202813625 -0.773010730743 -0.137949377298 -0.693519115448 -0.707107067108 -0.150806456804 -0.75815653801 -0.634393692017 -0.162211358547 -0.815492391586 -0.555570602417 -0.172054007649 -0.864974856377 -0.471397042274 -0.180239617825 -0.906126797199 -0.382683753967 -0.186689570546 -0.938552379608 -0.290284991264 -0.191341355443 -0.961939156055 -0.195090532303 -0.194150701165 -0.976061820984 -0.098017334938 -0.195090040565 -0.980784595013 -1.19209289551e-07 -0.194150701165 -0.976061820984 0.0980170369148 -0.191341474652 -0.961939036846 0.19509023428 -0.186689540744 -0.938552439213 0.290284633636 -0.180239647627 -0.906126916409 0.382683396339 -0.172054052353 -0.864974975586 0.471396803856 -0.162211492658 -0.815492510796 0.555570304394 -0.150806620717 -0.758156716824 0.634393334389 -0.137949541211 -0.693519532681 0.70710682869 -0.123763769865 -0.622203230858 0.773010492325 -0.108386218548 -0.544894754887 0.831469595432 -0.0919648632407 -0.462338715792 0.881921231747 -0.0746577382088 -0.37533006072 0.923879504204 -0.0566316656768 -0.284706771374 0.956940352917 -0.0380601771176 -0.191341608763 0.980785250664 -0.0191221628338 -0.0961337089539 0.995184719563 2.1128810701e-08 -0.0980170741677 0.995184719563 3.60336578353e-08 -0.195090204477 0.980785250664 3.37667138695e-08 -0.290284484625 0.956940352917 5.45521849915e-08 -0.382683187723 0.923879504204 2.8270843444e-08 -0.471396446228 0.881921231747 8.95790392974e-08 -0.555569827557 0.831469595432 1.49656727899e-07 -0.634392857552 0.773010492325 7.47579136373e-08 -0.707106351852 0.70710682869 1.29988563913e-07 -0.773009836674 0.634393334389 5.84083252875e-08 -0.831468939781 0.555570304394 1.71103209823e-07 -0.88192075491 0.471396803856 2.05446013979e-07 -0.923878908157 0.382683396339 1.5114812868e-07 -0.956939697266 0.290284633636 1.0188587396e-07 -0.980784475803 0.19509023428 7.24850224287e-08 -0.995183944702 0.0980170369148 1.49770755797e-07 -0.99999922514 -1.19209289551e-07 7.24850224287e-08 -0.995183944702 -0.098017334938 2.42061162226e-07 -0.980784595013 -0.195090532303 1.10290166333e-07 -0.956939637661 -0.290284991264 2.11419106222e-07 -0.923878788948 -0.382683753967 1.91691142959e-07 -0.8819206357 -0.471397042274 1.66685296676e-07 -0.831468760967 -0.555570602417 2.55866922316e-07 -0.77300965786 -0.634393692017 1.54123114271e-07 -0.70710593462 -0.707107067108 1.34025484044e-07 -0.634392440319 -0.773010730743 1.17792311016e-07 -0.555569410324 -0.831470012665 5.51497905121e-08 -0.471395909786 -0.88192152977 9.60459729527e-08 -0.382682621479 -0.923879861832 2.06138075498e-08 -0.290283799171 -0.956940531731 3.09348102689e-08 -0.195089489222 -0.980785369873 1.24159900139e-08 -0.0980163216591 -0.995184779167 0.0191220473498 -0.0961329638958 -0.995184779167 0.0380601026118 -0.191340893507 -0.980785369873 0.0566315799952 -0.284706056118 -0.956940531731 0.0746577680111 -0.375329464674 -0.923879861832 0.0919648334384 -0.462338149548 -0.88192152977 0.108386330307 -0.544894278049 -0.831470012665 0.12376395613 -0.622202694416 -0.773010730743 0.137949675322 -0.693519055843 -0.707107067108 0.150806948543 -0.7581564188 -0.634393692017 0.162211671472 -0.815492272377 -0.555570602417 0.172054365277 -0.864974737167 -0.471397042274 0.180240020156 -0.90612667799 -0.382683753967 0.186689779162 -0.938552260399 -0.290284991264 0.191341817379 -0.961939036846 -0.195090532303 0.194150835276 -0.976061701775 -0.098017334938 0.195090323687 -0.980784475803 -1.19209289551e-07 0.194150835276 -0.976061701775 0.0980170369148 0.191341653466 -0.961938917637 0.19509023428 0.186689823866 -0.938552320004 0.290284633636 0.180240035057 -0.906126737595 0.382683396339 0.172054380178 -0.864974856377 0.471396803856 0.162211596966 -0.815492451191 0.555570304394 0.150806874037 -0.758156597614 0.634393334389 0.137949675322 -0.693519473076 0.70710682869 0.123764052987 -0.622203111649 0.773010492325 0.108386382461 -0.544894695282 0.831469595432 0.0919649153948 -0.462338685989 0.881921231747 0.0746578425169 -0.375330001116 0.923879504204 0.0566317290068 -0.284706741571 0.956940352917 0.0380602478981 -0.191341593862 0.980785250664 0.019122203812 -0.0961336940527 0.995184719563 0.0375095307827 -0.0905559509993 0.995184719563 0.0746578201652 -0.180239826441 0.980785250664 0.111087091267 -0.268187880516 0.956940352917 0.146446555853 -0.353553116322 0.923879504204 0.180395632982 -0.435513496399 0.881921231747 0.212607443333 -0.513279557228 0.831469595432 0.242771759629 -0.586102485657 0.773010492325 0.270597934723 -0.653281033039 0.70710682869 0.295818179846 -0.714167833328 0.634393334389 0.318189442158 -0.768177032471 0.555570304394 0.337496608496 -0.814788460732 0.471396803856 0.353553324938 -0.853552639484 0.382683396339 0.366205096245 -0.88409692049 0.290284633636 0.37533006072 -0.906126618385 0.19509023428 0.380840480328 -0.919429957867 0.0980170369148 0.38268327713 -0.923878729343 -1.19209289551e-07 0.380840480328 -0.919429957867 -0.098017334938 0.375330239534 -0.90612667799 -0.195090532303 0.36620503664 -0.884096860886 -0.290284991264 0.353553295135 -0.85355257988 -0.382683753967 0.337496578693 -0.814788341522 -0.471397042274 0.31818947196 -0.768176853657 -0.555570602417 0.295818209648 -0.714167654514 -0.634393692017 0.270597875118 -0.653280615807 -0.707107067108 0.242771580815 -0.586102068424 -0.773010730743 0.212607309222 -0.513279139996 -0.831470012665 0.180395454168 -0.435512989759 -0.88192152977 0.146446377039 -0.353552609682 -0.923879861832 0.111086815596 -0.268187224865 -0.956940531731 0.0746575444937 -0.18023917079 -0.980785369873 0.0375092327595 -0.0905552655458 -0.995184779167 0.054454959929 -0.081497579813 -0.995184779167 0.108385935426 -0.162210956216 -0.980785369873 0.161273047328 -0.24136210978 -0.956940531731 0.212607145309 -0.318188905716 -0.923879861832 0.261893570423 -0.391951322556 -0.88192152977 0.3086579144 -0.461938977242 -0.831470012665 0.352449625731 -0.527477860451 -0.773010730743 0.392847120762 -0.587936937809 -0.707107067108 0.429461330175 -0.642733812332 -0.634393692017 0.461939424276 -0.691340863705 -0.555570602417 0.489968985319 -0.733290076256 -0.471397042274 0.513279736042 -0.768176972866 -0.382683753967 0.531647264957 -0.795666098595 -0.290284991264 0.544894933701 -0.815492391586 -0.195090532303 0.552894592285 -0.827465057373 -0.098017334938 0.555569887161 -0.831468820572 -1.19209289551e-07 0.552894592285 -0.827465057373 0.0980170369148 0.544894695282 -0.815492331982 0.19509023428 0.531647324562 -0.795666158199 0.290284633636 0.513279736042 -0.768177032471 0.382683396339 0.489969044924 -0.733290195465 0.471396803856 0.461939424276 -0.691341042519 0.555570304394 0.429461330175 -0.642733991146 0.634393334389 0.392847269773 -0.587937355042 0.70710682869 0.352449893951 -0.527478277683 0.773010492325 0.308658123016 -0.461939364672 0.831469595432 0.261893838644 -0.39195176959 0.881921231747 0.21260741353 -0.318189382553 0.923879504204 0.161273434758 -0.241362705827 0.956940352917 0.108386337757 -0.162211552262 0.980785250664 0.0544553846121 -0.0814981982112 0.995184719563 0.0693085491657 -0.0693085119128 0.995184719563 0.137949630618 -0.137949571013 0.980785250664 0.20526213944 -0.205262094736 0.956940352917 0.270597875118 -0.270597815514 0.923879504204 0.333327621222 -0.333327561617 0.881921231747 0.392847239971 -0.39284709096 0.831469595432 0.448583573103 -0.448583364487 0.773010492325 0.499999701977 -0.499999582767 0.70710682869 0.546600520611 -0.546600282192 0.634393334389 0.587937295437 -0.587937176228 0.555570304394 0.623612225056 -0.623611986637 0.471396803856 0.653281092644 -0.653280794621 0.382683396339 0.676658630371 -0.676658391953 0.290284633636 0.693519353867 -0.693519175053 0.19509023428 0.703701257706 -0.703701138496 0.0980170369148 0.707106292248 -0.707106053829 -1.19209289551e-07 0.703701257706 -0.703701138496 -0.098017334938 0.693519592285 -0.693519175053 -0.195090532303 0.676658570766 -0.676658332348 -0.290284991264 0.653281092644 -0.653280735016 -0.382683753967 0.623612165451 -0.623611867428 -0.471397042274 0.587937295437 -0.587936997414 -0.555570602417 0.546600461006 -0.546600103378 -0.634393692017 0.499999463558 -0.499999195337 -0.707107067108 0.448583215475 -0.448583006859 -0.773010730743 0.392846941948 -0.392846763134 -0.831470012665 0.333327263594 -0.333327174187 -0.88192152977 0.27059751749 -0.270597398281 -0.923879861832 0.2052616328 -0.205261588097 -0.956940531731 0.137949109077 -0.137949064374 -0.980785369873 0.0693080127239 -0.0693079903722 -0.995184779167 0.0814975947142 -0.054454933852 -0.995184779167 0.162210986018 -0.108385868371 -0.980785369873 0.241362124681 -0.161272972822 -0.956940531731 0.318188995123 -0.212606981397 -0.923879861832 0.39195138216 -0.261893451214 -0.88192152977 0.461939096451 -0.308657675982 -0.831470012665 0.52747797966 -0.35244935751 -0.773010730743 0.587937116623 -0.392846792936 -0.707107067108 0.642734050751 -0.429460853338 -0.634393692017 0.691341042519 -0.461939066648 -0.555570602417 0.73329025507 -0.489968627691 -0.471397042274 0.768177211285 -0.51327931881 -0.382683753967 0.795666217804 -0.531646966934 -0.290284991264 0.81549268961 -0.544894397259 -0.195090532303 0.827465116978 -0.552894413471 -0.098017334938 0.831468999386 -0.555569589138 -1.19209289551e-07 0.827465116978 -0.552894413471 0.0980170369148 0.815492451191 -0.544894456863 0.19509023428 0.795666337013 -0.531647026539 0.290284633636 0.768177211285 -0.51327931881 0.382683396339 0.733290314674 -0.489968717098 0.471396803856 0.691341102123 -0.461939245462 0.555570304394 0.64273416996 -0.429461032152 0.634393334389 0.587937414646 -0.392847120762 0.70710682869 0.527478396893 -0.352449625731 0.773010492325 0.461939454079 -0.308657944202 0.831469595432 0.391951799393 -0.261893749237 0.881921231747 0.318189412355 -0.212607324123 0.923879504204 0.241362720728 -0.161273375154 0.956940352917 0.162211582065 -0.108386263251 0.980785250664 0.0814982205629 -0.0544553399086 0.995184719563 0.0905559659004 -0.0375094786286 0.995184719563 0.180239841342 -0.0746577382088 0.980785250664 0.268187880516 -0.111087016761 0.956940352917 0.353553116322 -0.146446451545 0.923879504204 0.435513466597 -0.180395528674 0.881921231747 0.513279557228 -0.212607234716 0.831469595432 0.586102545261 -0.242771461606 0.773010492325 0.653281033039 -0.270597755909 0.70710682869 0.714167892933 -0.295817822218 0.634393334389 0.768177032471 -0.318189233541 0.555570304394 0.814788460732 -0.337496250868 0.471396803856 0.853552699089 -0.353552848101 0.382683396339 0.884096980095 -0.366204768419 0.290284633636 0.906126618385 -0.375329762697 0.19509023428 0.919429957867 -0.380840241909 0.0980170369148 0.923878788948 -0.3826828897 -1.19209289551e-07 0.919429957867 -0.380840241909 -0.098017334938 0.906126797199 -0.375329643488 -0.195090532303 0.884096860886 -0.366204738617 -0.290284991264 0.853552699089 -0.353552848101 -0.382683753967 0.814788401127 -0.337496161461 -0.471397042274 0.768176913261 -0.31818908453 -0.555570602417 0.714167714119 -0.295817673206 -0.634393692017 0.653280675411 -0.270597487688 -0.707107067108 0.586102068424 -0.242771282792 -0.773010730743 0.5132791996 -0.212607041001 -0.831470012665 0.435513019562 -0.180395305157 -0.88192152977 0.353552639484 -0.146446198225 -0.923879861832 0.268187195063 -0.11108674109 -0.956940531731 0.18023917079 -0.0746574699879 -0.980785369873 0.0905552729964 -0.0375092029572 -0.995184779167 0.0961329564452 -0.0191220156848 -0.995184779167 0.191340863705 -0.038060028106 -0.980785369873 0.284705996513 -0.0566315092146 -0.956940531731 0.375329464674 -0.074657574296 -0.923879861832 0.462338119745 -0.0919646769762 -0.88192152977 0.544894218445 -0.108386047184 -0.831470012665 0.622202575207 -0.123763650656 -0.773010730743 0.693518996239 -0.137949287891 -0.707107067108 0.758156299591 -0.1508063972 -0.634393692017 0.815492212772 -0.162211284041 -0.555570602417 0.864974677563 -0.172053918242 -0.471397042274 0.906126618385 -0.180239543319 -0.382683753967 0.93855214119 -0.186689466238 -0.290284991264 0.961938977242 -0.191341206431 -0.195090532303 0.976061582565 -0.194150596857 -0.098017334938 0.980784416199 -0.195089921355 -1.19209289551e-07 0.976061582565 -0.194150596857 0.0980170369148 0.961938798428 -0.191341355443 0.19509023428 0.938552260399 -0.186689466238 0.290284633636 0.906126618385 -0.180239543319 0.382683396339 0.864974737167 -0.172054007649 0.471396803856 0.815492331982 -0.162211403251 0.555570304394 0.75815653801 -0.150806516409 0.634393334389 0.693519413471 -0.137949481606 0.70710682869 0.622203111649 -0.123763732612 0.773010492325 0.544894635677 -0.108386166394 0.831469595432 0.462338596582 -0.0919648110867 0.881921231747 0.375329971313 -0.0746577307582 0.923879504204 0.284706711769 -0.0566316470504 0.956940352917 0.19134157896 -0.0380601584911 0.980785250664 0.0961336940527 -0.0191221497953 0.995184719563 0.0980170592666 3.10097227896e-08 0.995184719563 0.195090159774 4.84880615659e-08 0.980785250664 0.29028442502 4.04069737669e-08 0.956940352917 0.382683098316 4.44171703862e-08 0.923879504204 0.471396327019 5.61662005794e-08 0.881921231747 0.555569708347 1.17474399985e-07 0.831469595432 0.634392738342 1.629372548e-07 0.773010492325 0.707106232643 1.09960694772e-07 0.70710682869 0.77300965786 1.97407558744e-07 0.634393334389 0.831468701363 1.11212486331e-07 0.555570304394 0.881920516491 1.68434567627e-07 0.471396803856 0.923878610134 2.49608433478e-07 0.382683396339 0.956939518452 1.89337470147e-07 0.290284633636 0.980784237385 1.72291436229e-07 0.19509023428 0.995183706284 1.28275743805e-07 0.0980170369148 0.999999046326 2.31804605733e-07 -1.19209289551e-07 0.995183706284 1.28275743805e-07 -0.098017334938 0.980784356594 3.53324679736e-07 -0.195090532303 0.956939399242 1.66080880604e-07 -0.290284991264 0.923878610134 2.49608433478e-07 -0.382683753967 0.881920456886 2.44495311108e-07 -0.471397042274 0.831468582153 2.04874623932e-07 -0.555570602417 0.773009359837 2.67813106802e-07 -0.634393692017 0.707105755806 2.18555570086e-07 -0.707107067108 0.6343922019 1.38664262295e-07 -0.773010730743 0.555569291115 1.52995085045e-07 -0.831470012665 0.471395820379 9.46734388663e-08 -0.88192152977 0.382682561874 9.90325190742e-08 -0.923879861832 0.290283709764 3.60547609546e-08 -0.956940531731 0.195089444518 3.68284318597e-08 -0.980785369873 0.0980163067579 1.86431918792e-08 -0.995184779167";
    _sphere.normal = "0.11209448427 0.0222785118967 -0.993438541889 0.207037568092 0.0411694683135 -0.97744679451 0.30002745986 0.0596636869013 -0.95205539465 0.39008757472 0.0775780528784 -0.917477965355 0.476424455643 0.0947599709034 -0.874080657959 0.558153033257 0.110995821655 -0.822260200977 0.634510338306 0.126194030046 -0.762504935265 0.704763948917 0.140171512961 -0.695425271988 0.768211901188 0.152806177735 -0.621631503105 0.824274420738 0.163945436478 -0.541886627674 0.872402131557 0.173528239131 -0.456892609596 0.912137210369 0.181432545185 -0.367503881454 0.943082988262 0.187566757202 -0.274575024843 0.959776580334 0.210791349411 -0.185399949551 0.97930842638 0.180578023195 -0.0910061970353 0.976683855057 0.214331492782 0.00979644153267 0.976073503494 0.193975642323 0.0979949310422 0.961973965168 0.191015347838 0.195074319839 0.938627302647 0.186223939061 0.290261536837 0.906216621399 0.179631948471 0.38267159462 0.865108191967 0.171300396323 0.47138890624 0.81563770771 0.161320835352 0.555558919907 0.758323907852 0.149784848094 0.634388267994 0.693716228008 0.13681447506 0.707113862038 0.622425019741 0.122531816363 0.773003339767 0.545121610165 0.107058934867 0.831446290016 0.46259957552 0.0905484184623 0.881923913956 0.375591307878 0.0731833875179 0.923856317997 0.284981846809 0.055116429925 0.956938385963 0.191625714302 0.0365001372993 0.980773329735 0.106265448034 0.0181890316308 0.994140446186 0.100680559874 0.0385448783636 0.994140446186 0.18082216382 0.0731833875179 0.980773329735 0.268745988607 0.109653003514 0.956938385963 0.354106277227 0.145054474473 0.923856317997 0.436048477888 0.179052099586 0.881923913956 0.513779103756 0.211340680718 0.831446290016 0.586565732956 0.24161504209 0.773003339767 0.653706490993 0.269539475441 0.707113862038 0.714529871941 0.294869840145 0.634388267994 0.768486559391 0.317361980677 0.555558919907 0.815057814121 0.336771756411 0.47138890624 0.853755295277 0.352977067232 0.38267159462 0.884243309498 0.365764349699 0.290261536837 0.906216621399 0.37504196167 0.195074319839 0.919461667538 0.380687892437 0.0979949310422 0.923856317997 0.38267159462 0.0 0.919370114803 0.38096255064 -0.0979949310422 0.906002998352 0.375591307878 -0.195074319839 0.883907616138 0.366618841887 -0.290261536837 0.853297531605 0.354106277227 -0.38267159462 0.814477980137 0.338175594807 -0.47138890624 0.767815172672 0.318979471922 -0.555558919907 0.713766872883 0.296731472015 -0.634388267994 0.652821421623 0.271614730358 -0.707113862038 0.585589170456 0.243903934956 -0.773003339767 0.5127415061 0.213812679052 -0.831446290016 0.434949785471 0.18167668581 -0.881923913956 0.352946549654 0.147801145911 -0.923856317997 0.267586290836 0.112491227686 -0.956938385963 0.179601430893 0.0761131644249 -0.980773329735 0.0984527096152 0.0439161360264 -0.994140446186 0.0879848599434 0.0622882768512 -0.994140446186 0.161320835352 0.109683521092 -0.980773329735 0.240485861897 0.16254158318 -0.956938385963 0.317331463099 0.213812679052 -0.923856317997 0.391125231981 0.263039022684 -0.881923913956 0.461165189743 0.309762865305 -0.831446290016 0.52678000927 0.353465378284 -0.773003339767 0.587298214436 0.393780320883 -0.707113862038 0.642139971256 0.430280476809 -0.634388267994 0.690816998482 0.462660610676 -0.555558919907 0.732840955257 0.490585029125 -0.47138890624 0.767815172672 0.513779103756 -0.38267159462 0.795403897762 0.532029151917 -0.290261536837 0.815301954746 0.545152127743 -0.195074319839 0.827356815338 0.552995383739 -0.0979949310422 0.831446290016 0.555558919907 0.0 0.827539920807 0.552751243114 0.0979949310422 0.827723026276 0.529587686062 0.185399949551 0.789880037308 0.543717741966 0.283516943455 0.768486559391 0.5127415061 0.38267159462 0.73369550705 0.48933377862 0.47138890624 0.69182407856 0.461195707321 0.555558919907 0.643269121647 0.428601950407 0.634388267994 0.588549435139 0.391888171434 0.707113862038 0.528153300285 0.351390123367 0.773003339767 0.462660610676 0.307535022497 0.831446290016 0.392712175846 0.260689109564 0.881923913956 0.318979471922 0.211340680718 0.923856317997 0.242194890976 0.159978032112 0.956938385963 0.16306039691 0.107058934867 0.980773329735 0.0912198275328 0.0574663542211 0.994140446186 0.0782494619489 0.0741599798203 0.994140446186 0.139042332768 0.13681447506 0.980773329735 0.206335648894 0.204138308764 0.956938385963 0.271614730358 0.269539475441 0.923856317997 0.334299743176 0.332316040993 0.881923913956 0.393780320883 0.391888171434 0.831446290016 0.449446082115 0.447676002979 0.773003339767 0.500778198242 0.499191254377 0.707113862038 0.547288417816 0.54585403204 0.634388267994 0.588549435139 0.587298214436 0.555558919907 0.624134063721 0.623065888882 0.47138890624 0.653706490993 0.652821421623 0.38267159462 0.654103219509 0.698507666588 0.290139466524 0.715903222561 0.670400083065 0.194982752204 0.703787326813 0.703573703766 0.0979949310422 0.70708334446 0.70708334446 0.0 0.703573703766 0.703787326813 -0.0979949310422 0.693288981915 0.693716228008 -0.195074319839 0.676320672035 0.67696160078 -0.290261536837 0.652821421623 0.653706490993 -0.38267159462 0.623065888882 0.624134063721 -0.47138890624 0.587298214436 0.588549435139 -0.555558919907 0.54585403204 0.547288417816 -0.634388267994 0.499160736799 0.500778198242 -0.707113862038 0.447676002979 0.449446082115 -0.773003339767 0.391888171434 0.393780320883 -0.831446290016 0.332316040993 0.334299743176 -0.881923913956 0.269539475441 0.271614730358 -0.923856317997 0.204138308764 0.206335648894 -0.956938385963 0.13681447506 0.139042332768 -0.980773329735 0.0741599798203 0.0782494619489 -0.994140446186 0.0 0.0 -1.0 0.0574663542211 0.0912198275328 -0.994140446186 0.107058934867 0.16306039691 -0.980773329735 0.159978032112 0.242194890976 -0.956938385963 0.211340680718 0.318979471922 -0.923856317997 0.260689109564 0.392712175846 -0.881923913956 0.307535022497 0.462660610676 -0.831446290016 0.351390123367 0.528153300285 -0.773003339767 0.391888171434 0.588549435139 -0.707113862038 0.428601950407 0.643269121647 -0.634388267994 0.461195707321 0.69182407856 -0.555558919907 0.48933377862 0.73369550705 -0.47138890624 0.5127415061 0.768486559391 -0.38267159462 0.531235694885 0.795922756195 -0.290261536837 0.544633328915 0.81563770771 -0.195074319839 0.552751243114 0.827539920807 -0.0979949310422 0.555558919907 0.831446290016 0.0 0.552995383739 0.827356815338 0.0979949310422 0.555650472641 0.806512653828 0.201940983534 0.514481008053 0.803430259228 0.299600213766 0.513779103756 0.767815172672 0.38267159462 0.490585029125 0.732840955257 0.47138890624 0.478926956654 0.686330735683 0.547288417816 0.423200160265 0.652150034904 0.628925442696 0.393780320883 0.587298214436 0.707113862038 0.353465378284 0.52678000927 0.773003339767 0.309762865305 0.461165189743 0.831446290016 0.263039022684 0.391155749559 0.881923913956 0.213812679052 0.317331463099 0.923856317997 0.16254158318 0.240485861897 0.956938385963 0.109683521092 0.161320835352 0.980773329735 0.0622882768512 0.0879848599434 0.994140446186 0.0439161360264 0.0984527096152 0.994140446186 0.0761131644249 0.179601430893 0.980773329735 0.112491227686 0.267586290836 0.956938385963 0.147801145911 0.352946549654 0.923856317997 0.18167668581 0.434949785471 0.881923913956 0.213812679052 0.5127415061 0.831446290016 0.243903934956 0.585589170456 0.773003339767 0.271614730358 0.652821421623 0.707113862038 0.272255629301 0.72362434864 0.634174644947 0.343272209167 0.757438898087 0.55534529686 0.338175594807 0.814477980137 0.47138890624 0.354106277227 0.853297531605 0.38267159462 0.366618841887 0.883907616138 0.290261536837 0.375591307878 0.906002998352 0.195074319839 0.38096255064 0.919370114803 0.0979949310422 0.38267159462 0.923856317997 0.0 0.380687892437 0.919461667538 -0.0979949310422 0.375011444092 0.906216621399 -0.195074319839 0.365764349699 0.884243309498 -0.290261536837 0.352977067232 0.853755295277 -0.38267159462 0.336771756411 0.815057814121 -0.47138890624 0.317361980677 0.768486559391 -0.555558919907 0.294869840145 0.714529871941 -0.634388267994 0.269539475441 0.653706490993 -0.707113862038 0.24161504209 0.586565732956 -0.773003339767 0.211340680718 0.513779103756 -0.831446290016 0.179052099586 0.436017930508 -0.881923913956 0.145054474473 0.354106277227 -0.923856317997 0.109653003514 0.268745988607 -0.956938385963 0.0731833875179 0.18082216382 -0.980773329735 0.0385448783636 0.100680559874 -0.994140446186 0.0181890316308 0.106265448034 -0.994140446186 0.0365001372993 0.191625714302 -0.980773329735 0.055116429925 0.284981846809 -0.956938385963 0.0731833875179 0.375591307878 -0.923856317997 0.0905484184623 0.46259957552 -0.881923913956 0.107058934867 0.545121610165 -0.831446290016 0.122531816363 0.622425019741 -0.773003339767 0.13681447506 0.693716228008 -0.707113862038 0.149784848094 0.758323907852 -0.634388267994 0.161320835352 0.81563770771 -0.555558919907 0.171300396323 0.865108191967 -0.47138890624 0.179631948471 0.906216621399 -0.38267159462 0.186223939061 0.938627302647 -0.290261536837 0.191015347838 0.961973965168 -0.195074319839 0.193975642323 0.976073503494 -0.0979949310422 0.195074319839 0.980773329735 0.0 0.194280833006 0.976012468338 0.0979949310422 0.191625714302 0.961851835251 0.195074319839 0.187139496207 0.938444137573 0.290261536837 0.18082216382 0.906002998352 0.38267159462 0.172765284777 0.864803016186 0.47138890624 0.188909575343 0.809839189053 0.55534529686 0.125858336687 0.762840688229 0.634174644947 0.139042332768 0.693288981915 0.707113862038 0.124973297119 0.621936678886 0.773003339767 0.109683521092 0.544602811337 0.831446290016 0.093325600028 0.462050229311 0.881923913956 0.0761131644249 0.375011444092 0.923856317997 0.0581377595663 0.284371465445 0.956938385963 0.0395825058222 0.191015347838 0.980773329735 0.023865474388 0.105136267841 0.994140446186 0.00286873988807 0.107760854065 0.994140446186 0.00155644398183 0.195074319839 0.980773329735 0.00152592547238 0.290261536837 0.956938385963 0.00146488845348 0.38267159462 0.923856317997 0.00140385143459 0.471358388662 0.881923913956 0.00131229590625 0.555558919907 0.831446290016 0.0012207403779 0.634357750416 0.773003339767 0.00112918484956 0.70708334446 0.707113862038 -0.0253608822823 0.772728681564 0.634174644947 0.0272835474461 0.831141114235 0.55534529686 0.000732444226742 0.881893396378 0.47138890624 0.000610370188951 0.923856317997 0.38267159462 0.000457777641714 0.956907868385 0.290261536837 0.000305185094476 0.980773329735 0.195074319839 0.000152592547238 0.995178103447 0.0979949310422 0.0 1.0 0.0 -0.000152592547238 0.995178103447 -0.0979949310422 -0.000305185094476 0.980773329735 -0.195074319839 -0.000457777641714 0.956907868385 -0.290261536837 -0.000610370188951 0.923856317997 -0.38267159462 -0.000732444226742 0.881893396378 -0.47138890624 -0.00088503677398 0.831446290016 -0.555558919907 -0.00100711081177 0.772972822189 -0.634388267994 -0.00112918484956 0.70708334446 -0.707113862038 -0.0012207403779 0.634357750416 -0.773003339767 -0.00131229590625 0.555558919907 -0.831446290016 -0.00140385143459 0.471358388662 -0.881923913956 -0.00146488845348 0.38267159462 -0.923856317997 -0.00152592547238 0.290261536837 -0.956938385963 -0.00155644398183 0.195074319839 -0.980773329735 -0.00286873988807 0.107760854065 -0.994140446186 -0.023865474388 0.105136267841 -0.994140446186 -0.0395825058222 0.191015347838 -0.980773329735 -0.0581377595663 0.284371465445 -0.956938385963 -0.0761131644249 0.375011444092 -0.923856317997 -0.093325600028 0.462050229311 -0.881923913956 -0.109683521092 0.544602811337 -0.831446290016 -0.124973297119 0.621936678886 -0.773003339767 -0.139042332768 0.693288981915 -0.707113862038 -0.151799067855 0.757927179337 -0.634388267994 -0.16306039691 0.815301954746 -0.555558919907 -0.172765284777 0.864803016186 -0.47138890624 -0.18082216382 0.906002998352 -0.38267159462 -0.187139496207 0.938444137573 -0.290261536837 -0.191625714302 0.961851835251 -0.195074319839 -0.194280833006 0.976012468338 -0.0979949310422 -0.195074319839 0.980773329735 0.0 -0.193975642323 0.976073503494 0.0979949310422 -0.191015347838 0.961973965168 0.195074319839 -0.186223939061 0.938627302647 0.290261536837 -0.179631948471 0.906216621399 0.38267159462 -0.171300396323 0.865108191967 0.47138890624 -0.135380104184 0.820490121841 0.55534529686 -0.175634026527 0.752952694893 0.634174644947 -0.13681447506 0.693716228008 0.707113862038 -0.122531816363 0.622425019741 0.773003339767 -0.107058934867 0.545121610165 0.831446290016 -0.0905484184623 0.46259957552 0.881923913956 -0.0731833875179 0.375591307878 0.923856317997 -0.055116429925 0.284981846809 0.956938385963 -0.0365001372993 0.191625714302 0.980773329735 -0.0181890316308 0.106265448034 0.994140446186 -0.0385448783636 0.100680559874 0.994140446186 -0.0731833875179 0.18082216382 0.980773329735 -0.109653003514 0.268745988607 0.956938385963 -0.145054474473 0.354106277227 0.923856317997 -0.179052099586 0.436048477888 0.881923913956 -0.211340680718 0.513779103756 0.831446290016 -0.24161504209 0.586565732956 0.773003339767 -0.269539475441 0.653706490993 0.707113862038 -0.319132059813 0.704214632511 0.634174644947 -0.292855620384 0.77831351757 0.55534529686 -0.336771756411 0.815057814121 0.47138890624 -0.352977067232 0.853755295277 0.38267159462 -0.365764349699 0.884243309498 0.290261536837 -0.37504196167 0.906216621399 0.195074319839 -0.380687892437 0.919461667538 0.0979949310422 -0.38267159462 0.923856317997 0.0 -0.38096255064 0.919370114803 -0.0979949310422 -0.387615591288 0.899410963058 -0.201940983534 -0.347849965096 0.888363301754 -0.299600213766 -0.354106277227 0.853297531605 -0.38267159462 -0.338175594807 0.814477980137 -0.47138890624 -0.318979471922 0.767815172672 -0.555558919907 -0.296731472015 0.713766872883 -0.634388267994 -0.271614730358 0.652821421623 -0.707113862038 -0.243903934956 0.585589170456 -0.773003339767 -0.213812679052 0.5127415061 -0.831446290016 -0.18167668581 0.434949785471 -0.881923913956 -0.147801145911 0.352946549654 -0.923856317997 -0.112491227686 0.267586290836 -0.956938385963 -0.0761131644249 0.179601430893 -0.980773329735 -0.0439161360264 0.0984527096152 -0.994140446186 -0.0622882768512 0.0879848599434 -0.994140446186 -0.109683521092 0.161320835352 -0.980773329735 -0.16254158318 0.240485861897 -0.956938385963 -0.213812679052 0.317331463099 -0.923856317997 -0.263039022684 0.391125231981 -0.881923913956 -0.309762865305 0.461165189743 -0.831446290016 -0.353465378284 0.52678000927 -0.773003339767 -0.393780320883 0.587298214436 -0.707113862038 -0.430280476809 0.642139971256 -0.634388267994 -0.462660610676 0.690816998482 -0.555558919907 -0.490585029125 0.732840955257 -0.47138890624 -0.513779103756 0.767815172672 -0.38267159462 -0.50526446104 0.812707901001 -0.290139466524 -0.571367561817 0.797173976898 -0.194982752204 -0.552995383739 0.827356815338 -0.0979949310422 -0.555558919907 0.831446290016 0.0 -0.552751243114 0.827539920807 0.0979949310422 -0.529587686062 0.827723026276 0.185399949551 -0.543717741966 0.789880037308 0.283516943455 -0.5127415061 0.768486559391 0.38267159462 -0.48933377862 0.73369550705 0.47138890624 -0.439069807529 0.706228852272 0.55534529686 -0.450392156839 0.628406643867 0.634174644947 -0.391888171434 0.588549435139 0.707113862038 -0.351390123367 0.528153300285 0.773003339767 -0.307535022497 0.462660610676 0.831446290016 -0.260689109564 0.392712175846 0.881923913956 -0.211340680718 0.318979471922 0.923856317997 -0.159978032112 0.242194890976 0.956938385963 -0.107058934867 0.16306039691 0.980773329735 -0.0574663542211 0.0912198275328 0.994140446186 -0.0741599798203 0.0782494619489 0.994140446186 -0.13681447506 0.139042332768 0.980773329735 -0.204138308764 0.206335648894 0.956938385963 -0.269539475441 0.271614730358 0.923856317997 -0.332316040993 0.334299743176 0.881923913956 -0.391888171434 0.393780320883 0.831446290016 -0.447676002979 0.449446082115 0.773003339767 -0.499191254377 0.500778198242 0.707113862038 -0.56434828043 0.528458535671 0.634174644947 -0.56840723753 0.606982648373 0.55534529686 -0.623065888882 0.624134063721 0.47138890624 -0.652821421623 0.653706490993 0.38267159462 -0.698507666588 0.654103219509 0.290139466524 -0.670400083065 0.715903222561 0.194982752204 -0.703573703766 0.703787326813 0.0979949310422 -0.70708334446 0.70708334446 0.0 -0.703787326813 0.703573703766 -0.0979949310422 -0.715903222561 0.670400083065 -0.194982752204 -0.654103219509 0.698507666588 -0.290139466524 -0.653706490993 0.652821421623 -0.38267159462 -0.624134063721 0.623065888882 -0.47138890624 -0.588549435139 0.587298214436 -0.555558919907 -0.551377892494 0.53538620472 -0.639759540558 -0.485641032457 0.50437939167 -0.713950037956 -0.449446082115 0.447676002979 -0.773003339767 -0.393780320883 0.391888171434 -0.831446290016 -0.334299743176 0.332316040993 -0.881923913956 -0.271614730358 0.269539475441 -0.923856317997 -0.206335648894 0.204138308764 -0.956938385963 -0.139042332768 0.13681447506 -0.980773329735 -0.0782494619489 0.0741599798203 -0.994140446186 -0.0912198275328 0.0574663542211 -0.994140446186 -0.16306039691 0.107058934867 -0.980773329735 -0.242194890976 0.159978032112 -0.956938385963 -0.318979471922 0.211340680718 -0.923856317997 -0.392712175846 0.260689109564 -0.881923913956 -0.462660610676 0.307535022497 -0.831446290016 -0.528153300285 0.351390123367 -0.773003339767 -0.574877142906 0.412030398846 -0.706900238991 -0.65660572052 0.408215582371 -0.634174644947 -0.69182407856 0.461195707321 -0.555558919907 -0.73369550705 0.48933377862 -0.47138890624 -0.768486559391 0.5127415061 -0.38267159462 -0.77782523632 0.557481586933 -0.290139466524 -0.832941651344 0.517838060856 -0.194982752204 -0.827539920807 0.552751243114 -0.0979949310422 -0.831446290016 0.555558919907 0.0 -0.827356815338 0.552995383739 0.0979949310422 -0.797173976898 0.571367561817 0.194982752204 -0.812707901001 0.50526446104 0.290139466524 -0.767815172672 0.513779103756 0.38267159462 -0.732840955257 0.490585029125 0.47138890624 -0.675893425941 0.484450817108 0.55534529686 -0.65660572052 0.408215582371 0.634174644947 -0.587298214436 0.393780320883 0.707113862038 -0.52678000927 0.353465378284 0.773003339767 -0.461165189743 0.309762865305 0.831446290016 -0.391155749559 0.263039022684 0.881923913956 -0.317331463099 0.213812679052 0.923856317997 -0.240485861897 0.16254158318 0.956938385963 -0.161320835352 0.109683521092 0.980773329735 -0.0879848599434 0.0622882768512 0.994140446186 0.0 0.0 1.0 -0.0984527096152 0.0439161360264 0.994140446186 -0.179601430893 0.0761131644249 0.980773329735 -0.267586290836 0.112491227686 0.956938385963 -0.352946549654 0.147801145911 0.923856317997 -0.434949785471 0.18167668581 0.881923913956 -0.5127415061 0.213812679052 0.831446290016 -0.585589170456 0.243903934956 0.773003339767 -0.652821421623 0.271614730358 0.707113862038 -0.72362434864 0.272255629301 0.634174644947 -0.757438898087 0.343272209167 0.55534529686 -0.814477980137 0.338175594807 0.47138890624 -0.853297531605 0.354106277227 0.38267159462 -0.895657241344 0.336985379457 0.290139466524 -0.893337786198 0.40485855937 0.194982752204 -0.919370114803 0.38096255064 0.0979949310422 -0.923856317997 0.38267159462 0.0 -0.919461667538 0.380687892437 -0.0979949310422 -0.917966246605 0.345377981663 -0.194982752204 -0.8716391325 0.395031601191 -0.290139466524 -0.853755295277 0.352977067232 -0.38267159462 -0.815057814121 0.336771756411 -0.47138890624 -0.768486559391 0.317361980677 -0.555558919907 -0.72362434864 0.272255629301 -0.634174644947 -0.644215226173 0.291940063238 -0.706900238991 -0.586565732956 0.24161504209 -0.773003339767 -0.513779103756 0.211340680718 -0.831446290016 -0.436017930508 0.179052099586 -0.881923913956 -0.354106277227 0.145054474473 -0.923856317997 -0.268745988607 0.109653003514 -0.956938385963 -0.18082216382 0.0731833875179 -0.980773329735 -0.100680559874 0.0385448783636 -0.994140446186 -0.106265448034 0.0181890316308 -0.994140446186 -0.191625714302 0.0365001372993 -0.980773329735 -0.284981846809 0.055116429925 -0.956938385963 -0.375591307878 0.0731833875179 -0.923856317997 -0.46259957552 0.0905484184623 -0.881923913956 -0.545121610165 0.107058934867 -0.831446290016 -0.622425019741 0.122531816363 -0.773003339767 -0.688772261143 0.160649433732 -0.706900238991 -0.762840688229 0.125858336687 -0.634174644947 -0.81563770771 0.161320835352 -0.555558919907 -0.865108191967 0.171300396323 -0.47138890624 -0.906216621399 0.179631948471 -0.38267159462 -0.931943714619 0.217383340001 -0.290139466524 -0.967711389065 0.15967284143 -0.194982752204 -0.976073503494 0.193975642323 -0.0979949310422 -0.980773329735 0.195074319839 0.0 -0.976012468338 0.194280833006 0.0979949310422 -0.955137789249 0.222785115242 0.194982752204 -0.944212138653 0.155796989799 0.290139466524 -0.906002998352 0.18082216382 0.38267159462 -0.864803016186 0.172765284777 0.47138890624 -0.809839189053 0.188909575343 0.55534529686 -0.762840688229 0.125858336687 0.634174644947 -0.693288981915 0.139042332768 0.707113862038 -0.621936678886 0.124973297119 0.773003339767 -0.544602811337 0.109683521092 0.831446290016 -0.462050229311 0.093325600028 0.881923913956 -0.375011444092 0.0761131644249 0.923856317997 -0.284371465445 0.0581377595663 0.956938385963 -0.191015347838 0.0395825058222 0.980773329735 -0.105136267841 0.023865474388 0.994140446186 -0.107760854065 0.00286873988807 0.994140446186 -0.195074319839 0.00155644398183 0.980773329735 -0.290261536837 0.00152592547238 0.956938385963 -0.38267159462 0.00146488845348 0.923856317997 -0.471358388662 0.00140385143459 0.881923913956 -0.555558919907 0.00131229590625 0.831446290016 -0.634357750416 0.0012207403779 0.773003339767 -0.70708334446 0.00112918484956 0.707113862038 -0.772728681564 -0.0253608822823 0.634174644947 -0.831141114235 0.0272835474461 0.55534529686 -0.881893396378 0.000732444226742 0.47138890624 -0.923856317997 0.000610370188951 0.38267159462 -0.956450104713 -0.0313730277121 0.290139466524 -0.980254530907 0.0321665108204 0.194982752204 -0.995178103447 0.000152592547238 0.0979949310422 -1.0 0.0 0.0 -0.995178103447 -0.000152592547238 -0.0979949310422 -0.980254530907 -0.0321665108204 -0.194982752204 -0.956450104713 0.0313730277121 -0.290139466524 -0.923856317997 -0.000610370188951 -0.38267159462 -0.881893396378 -0.000732444226742 -0.47138890624 -0.831446290016 -0.00088503677398 -0.555558919907 -0.772728681564 -0.0253608822823 -0.634174644947 -0.706900238991 0.0231940671802 -0.706900238991 -0.634357750416 -0.0012207403779 -0.773003339767 -0.555558919907 -0.00131229590625 -0.831446290016 -0.471358388662 -0.00140385143459 -0.881923913956 -0.38267159462 -0.00146488845348 -0.923856317997 -0.290261536837 -0.00152592547238 -0.956938385963 -0.195074319839 -0.00155644398183 -0.980773329735 -0.107760854065 -0.00286873988807 -0.994140446186 -0.105136267841 -0.023865474388 -0.994140446186 -0.191015347838 -0.0395825058222 -0.980773329735 -0.284371465445 -0.0581377595663 -0.956938385963 -0.375011444092 -0.0761131644249 -0.923856317997 -0.462050229311 -0.093325600028 -0.881923913956 -0.544602811337 -0.109683521092 -0.831446290016 -0.621936678886 -0.124973297119 -0.773003339767 -0.697836220264 -0.11514633894 -0.706900238991 -0.752952694893 -0.175634026527 -0.634174644947 -0.815301954746 -0.16306039691 -0.555558919907 -0.864803016186 -0.172765284777 -0.47138890624 -0.906002998352 -0.18082216382 -0.38267159462 -0.944212138653 -0.155796989799 -0.290139466524 -0.955137789249 -0.222785115242 -0.194982752204 -0.976012468338 -0.194280833006 -0.0979949310422 -0.980773329735 -0.195074319839 0.0 -0.976073503494 -0.193975642323 0.0979949310422 -0.967711389065 -0.15967284143 0.194982752204 -0.931943714619 -0.217383340001 0.290139466524 -0.906216621399 -0.179631948471 0.38267159462 -0.865108191967 -0.171300396323 0.47138890624 -0.820490121841 -0.135380104184 0.55534529686 -0.752952694893 -0.175634026527 0.634174644947 -0.693716228008 -0.13681447506 0.707113862038 -0.622425019741 -0.122531816363 0.773003339767 -0.545121610165 -0.107058934867 0.831446290016 -0.46259957552 -0.0905484184623 0.881923913956 -0.375591307878 -0.0731833875179 0.923856317997 -0.284981846809 -0.055116429925 0.956938385963 -0.191625714302 -0.0365001372993 0.980773329735 -0.106265448034 -0.0181890316308 0.994140446186 -0.100680559874 -0.0385448783636 0.994140446186 -0.18082216382 -0.0731833875179 0.980773329735 -0.268745988607 -0.109653003514 0.956938385963 -0.354106277227 -0.145054474473 0.923856317997 -0.436048477888 -0.179052099586 0.881923913956 -0.513779103756 -0.211340680718 0.831446290016 -0.587847530842 -0.252571195364 0.768517076969 -0.665150940418 -0.259712517262 0.700033545494 -0.704214632511 -0.319132059813 0.634174644947 -0.77831351757 -0.292855620384 0.55534529686 -0.815057814121 -0.336771756411 0.47138890624 -0.853755295277 -0.352977067232 0.38267159462 -0.8716391325 -0.395031601191 0.290139466524 -0.917966246605 -0.345377981663 0.194982752204 -0.919461667538 -0.380687892437 0.0979949310422 -0.923856317997 -0.38267159462 0.0 -0.919370114803 -0.38096255064 -0.0979949310422 -0.893337786198 -0.40485855937 -0.194982752204 -0.895657241344 -0.336985379457 -0.290139466524 -0.853297531605 -0.354106277227 -0.38267159462 -0.814477980137 -0.338175594807 -0.47138890624 -0.767815172672 -0.318979471922 -0.555558919907 -0.704214632511 -0.319132059813 -0.634174644947 -0.661976993084 -0.24906155467 -0.706900238991 -0.585589170456 -0.243903934956 -0.773003339767 -0.5127415061 -0.213812679052 -0.831446290016 -0.434949785471 -0.18167668581 -0.881923913956 -0.352946549654 -0.147801145911 -0.923856317997 -0.267586290836 -0.112491227686 -0.956938385963 -0.179601430893 -0.0761131644249 -0.980773329735 -0.0984527096152 -0.0439161360264 -0.994140446186 -0.0879848599434 -0.0622882768512 -0.994140446186 -0.161320835352 -0.109683521092 -0.980773329735 -0.240485861897 -0.16254158318 -0.956938385963 -0.317331463099 -0.213812679052 -0.923856317997 -0.391125231981 -0.263039022684 -0.881923913956 -0.461165189743 -0.309762865305 -0.831446290016 -0.52678000927 -0.353465378284 -0.773003339767 -0.597247242928 -0.387676626444 -0.702078282833 -0.6389965415 -0.44599750638 -0.626697599888 -0.690816998482 -0.462660610676 -0.555558919907 -0.732840955257 -0.490585029125 -0.47138890624 -0.767815172672 -0.513779103756 -0.38267159462 -0.812707901001 -0.50526446104 -0.290139466524 -0.797173976898 -0.571367561817 -0.194982752204 -0.827356815338 -0.552995383739 -0.0979949310422 -0.831446290016 -0.555558919907 0.0 -0.827539920807 -0.552751243114 0.0979949310422 -0.832941651344 -0.517838060856 0.194982752204 -0.77782523632 -0.557481586933 0.290139466524 -0.768486559391 -0.5127415061 0.38267159462 -0.73369550705 -0.48933377862 0.47138890624 -0.706228852272 -0.439069807529 0.55534529686 -0.628406643867 -0.450392156839 0.634174644947 -0.600665330887 -0.373424470425 0.706900238991 -0.515762805939 -0.369670718908 0.772820234299 -0.462660610676 -0.307535022497 0.831446290016 -0.392712175846 -0.260689109564 0.881923913956 -0.318979471922 -0.211340680718 0.923856317997 -0.242194890976 -0.159978032112 0.956938385963 -0.16306039691 -0.107058934867 0.980773329735 -0.0912198275328 -0.0574663542211 0.994140446186 -0.0782494619489 -0.0741599798203 0.994140446186 -0.139042332768 -0.13681447506 0.980773329735 -0.206335648894 -0.204138308764 0.956938385963 -0.271614730358 -0.269539475441 0.923856317997 -0.334299743176 -0.332316040993 0.881923913956 -0.393780320883 -0.391888171434 0.831446290016 -0.433729052544 -0.463179409504 0.772820234299 -0.516251087189 -0.483443707228 0.706900238991 -0.528458535671 -0.56434828043 0.634174644947 -0.606982648373 -0.56840723753 0.55534529686 -0.624134063721 -0.623065888882 0.47138890624 -0.653706490993 -0.652821421623 0.38267159462 -0.661336123943 -0.687612533569 0.299600213766 -0.702291965485 -0.682607471943 0.201940983534 -0.703787326813 -0.703573703766 0.0979949310422 -0.70708334446 -0.70708334446 0.0 -0.703573703766 -0.703787326813 -0.0979949310422 -0.670400083065 -0.715903222561 -0.194982752204 -0.698507666588 -0.654103219509 -0.290139466524 -0.652821421623 -0.653706490993 -0.38267159462 -0.623065888882 -0.624134063721 -0.47138890624 -0.587298214436 -0.588549435139 -0.555558919907 -0.53538620472 -0.551377892494 -0.639759540558 -0.50437939167 -0.485641032457 -0.713950037956 -0.447676002979 -0.449446082115 -0.773003339767 -0.391888171434 -0.393780320883 -0.831446290016 -0.332316040993 -0.334299743176 -0.881923913956 -0.269539475441 -0.271614730358 -0.923856317997 -0.204138308764 -0.206335648894 -0.956938385963 -0.13681447506 -0.139042332768 -0.980773329735 -0.0741599798203 -0.0782494619489 -0.994140446186 -0.0574663542211 -0.0912198275328 -0.994140446186 -0.107058934867 -0.16306039691 -0.980773329735 -0.159978032112 -0.242194890976 -0.956938385963 -0.211340680718 -0.318979471922 -0.923856317997 -0.260689109564 -0.392712175846 -0.881923913956 -0.307535022497 -0.462660610676 -0.831446290016 -0.351390123367 -0.528153300285 -0.773003339767 -0.412030398846 -0.574877142906 -0.706900238991 -0.408215582371 -0.65660572052 -0.634174644947 -0.461195707321 -0.69182407856 -0.555558919907 -0.48933377862 -0.73369550705 -0.47138890624 -0.5127415061 -0.768486559391 -0.38267159462 -0.557481586933 -0.77782523632 -0.290139466524 -0.517838060856 -0.832941651344 -0.194982752204 -0.568437755108 -0.815607190132 -0.107760854065 -0.543778777122 -0.8391674757 -0.00698873866349 -0.552995383739 -0.827356815338 0.0979949310422 -0.545152127743 -0.815301954746 0.195074319839 -0.548997461796 -0.787224948406 0.280800819397 -0.504104733467 -0.777397990227 0.376140624285 -0.490585029125 -0.732840955257 0.47138890624 -0.484450817108 -0.675893425941 0.55534529686 -0.408215582371 -0.65660572052 0.634174644947 -0.412030398846 -0.574877142906 0.706900238991 -0.335032194853 -0.538895845413 0.772820234299 -0.309762865305 -0.461165189743 0.831446290016 -0.263039022684 -0.391155749559 0.881923913956 -0.213812679052 -0.317331463099 0.923856317997 -0.16254158318 -0.240485861897 0.956938385963 -0.109683521092 -0.161320835352 0.980773329735 -0.0622882768512 -0.0879848599434 0.994140446186 -0.0439161360264 -0.0984527096152 0.994140446186 -0.0761131644249 -0.179601430893 0.980773329735 -0.112491227686 -0.267586290836 0.956938385963 -0.147801145911 -0.352946549654 0.923856317997 -0.18167668581 -0.434949785471 0.881923913956 -0.213812679052 -0.5127415061 0.831446290016 -0.223456531763 -0.593920707703 0.772820234299 -0.291940063238 -0.644215226173 0.706900238991 -0.272255629301 -0.72362434864 0.634174644947 -0.343272209167 -0.757438898087 0.55534529686 -0.338175594807 -0.814477980137 0.47138890624 -0.335551023483 -0.856715619564 0.391674548388 -0.378002256155 -0.876857817173 0.296945095062 -0.375591307878 -0.906002998352 0.195074319839 -0.38096255064 -0.919370114803 0.0979949310422 -0.352153092623 -0.935911118984 0.0 -0.41077914834 -0.906430244446 -0.0979644134641 -0.345377981663 -0.917966246605 -0.194982752204 -0.395031601191 -0.8716391325 -0.290139466524 -0.352977067232 -0.853755295277 -0.38267159462 -0.336771756411 -0.815057814121 -0.47138890624 -0.317361980677 -0.768486559391 -0.555558919907 -0.272255629301 -0.72362434864 -0.634174644947 -0.291940063238 -0.644215226173 -0.706900238991 -0.24161504209 -0.586565732956 -0.773003339767 -0.211340680718 -0.513779103756 -0.831446290016 -0.179052099586 -0.436048477888 -0.881923913956 -0.145054474473 -0.354106277227 -0.923856317997 -0.109653003514 -0.268745988607 -0.956938385963 -0.0731833875179 -0.18082216382 -0.980773329735 -0.0385448783636 -0.100680559874 -0.994140446186 -0.0181890316308 -0.106265448034 -0.994140446186 -0.0365001372993 -0.191625714302 -0.980773329735 -0.055116429925 -0.284981846809 -0.956938385963 -0.0731833875179 -0.375591307878 -0.923856317997 -0.0905484184623 -0.46259957552 -0.881923913956 -0.107058934867 -0.545121610165 -0.831446290016 -0.122531816363 -0.622425019741 -0.773003339767 -0.160649433732 -0.688772261143 -0.706900238991 -0.125858336687 -0.762840688229 -0.634174644947 -0.161320835352 -0.81563770771 -0.555558919907 -0.171300396323 -0.865108191967 -0.47138890624 -0.179631948471 -0.906216621399 -0.38267159462 -0.217383340001 -0.931943714619 -0.290139466524 -0.15967284143 -0.967711389065 -0.194982752204 -0.22605060041 -0.969145774841 -0.0979644134641 -0.162785723805 -0.986632883549 0.0 -0.194280833006 -0.976012468338 0.0979949310422 -0.191625714302 -0.961851835251 0.195074319839 -0.205938905478 -0.937376022339 0.280800819397 -0.168248549104 -0.911130070686 0.376140624285 -0.172765284777 -0.864803016186 0.47138890624 -0.188909575343 -0.809839189053 0.55534529686 -0.125858336687 -0.762840688229 0.634174644947 -0.160649433732 -0.688772261143 0.706900238991 -0.103305153549 -0.626117765903 0.772820234299 -0.109683521092 -0.544602811337 0.831446290016 -0.093325600028 -0.462050229311 0.881923913956 -0.0761131644249 -0.375011444092 0.923856317997 -0.0581377595663 -0.284371465445 0.956938385963 -0.0395825058222 -0.191015347838 0.980773329735 -0.023865474388 -0.105136267841 0.994140446186 -0.00286873988807 -0.107760854065 0.994140446186 -0.00155644398183 -0.195074319839 0.980773329735 -0.00152592547238 -0.290261536837 0.956938385963 -0.00146488845348 -0.38267159462 0.923856317997 -0.00140385143459 -0.471358388662 0.881923913956 -0.00131229590625 -0.555558919907 0.831446290016 0.0208136234432 -0.634235680103 0.772820234299 -0.0231940671802 -0.706900238991 0.706900238991 0.0253608822823 -0.772728681564 0.634174644947 -0.0272835474461 -0.831141114235 0.55534529686 -0.000732444226742 -0.881893396378 0.47138890624 0.0303048808128 -0.923429071903 0.382488489151 -0.0313730277121 -0.956450104713 0.290139466524 -0.000305185094476 -0.980773329735 0.195074319839 -0.000152592547238 -0.995178103447 0.0979949310422 0.0328073985875 -0.999450683594 0.0 -0.0326242856681 -0.994628727436 -0.0979644134641 0.0321665108204 -0.980254530907 -0.194982752204 -0.0313730277121 -0.956450104713 -0.290139466524 0.000610370188951 -0.923856317997 -0.38267159462 0.000732444226742 -0.881893396378 -0.47138890624 0.00088503677398 -0.831446290016 -0.555558919907 0.0253608822823 -0.772728681564 -0.634174644947 -0.0231940671802 -0.706900238991 -0.706900238991 0.0012207403779 -0.634357750416 -0.773003339767 0.00131229590625 -0.555558919907 -0.831446290016 0.00140385143459 -0.471358388662 -0.881923913956 0.00146488845348 -0.38267159462 -0.923856317997 0.00152592547238 -0.290261536837 -0.956938385963 0.00155644398183 -0.195074319839 -0.980773329735 0.00286873988807 -0.107760854065 -0.994140446186 0.023865474388 -0.105136267841 -0.994140446186 0.0395825058222 -0.191015347838 -0.980773329735 0.0581377595663 -0.284371465445 -0.956938385963 0.0761131644249 -0.375011444092 -0.923856317997 0.093325600028 -0.462050229311 -0.881923913956 0.109683521092 -0.544602811337 -0.831446290016 0.124973297119 -0.621936678886 -0.773003339767 0.129612103105 -0.700155615807 -0.702078282833 0.167516097426 -0.761040091515 -0.626697599888 0.16306039691 -0.815301954746 -0.555558919907 0.172765284777 -0.864803016186 -0.47138890624 0.18082216382 -0.906002998352 -0.38267159462 0.155796989799 -0.944212138653 -0.290139466524 0.222785115242 -0.955137789249 -0.194982752204 0.180578023195 -0.97930842638 -0.0910061970353 0.214331492782 -0.976683855057 0.00979644153267 0.193975642323 -0.976073503494 0.0979949310422 0.191015347838 -0.961973965168 0.195074319839 0.155796989799 -0.944212138653 0.290139466524 0.209875792265 -0.899777233601 0.382488489151 0.171300396323 -0.865108191967 0.47138890624 0.135380104184 -0.820490121841 0.55534529686 0.175634026527 -0.752952694893 0.634174644947 0.11514633894 -0.697836220264 0.706900238991 0.144138917327 -0.617969274521 0.772820234299 0.107058934867 -0.545121610165 0.831446290016 0.0905484184623 -0.46259957552 0.881923913956 0.0731833875179 -0.375591307878 0.923856317997 0.055116429925 -0.284981846809 0.956938385963 0.0365001372993 -0.191625714302 0.980773329735 0.0181890316308 -0.106265448034 0.994140446186 0.0385448783636 -0.100680559874 0.994140446186 0.0731833875179 -0.18082216382 0.980773329735 0.109653003514 -0.268745988607 0.956938385963 0.145054474473 -0.354106277227 0.923856317997 0.179052099586 -0.436048477888 0.881923913956 0.211340680718 -0.513779103756 0.831446290016 0.261940360069 -0.577990055084 0.772820234299 0.24906155467 -0.661976993084 0.706900238991 0.319132059813 -0.704214632511 0.634174644947 0.292855620384 -0.77831351757 0.55534529686 0.336771756411 -0.815057814121 0.47138890624 0.381389826536 -0.841547906399 0.382488489151 0.336985379457 -0.895657241344 0.290139466524 0.37504196167 -0.906216621399 0.195074319839 0.380687892437 -0.919461667538 0.0979949310422 0.38267159462 -0.923856317997 0.0 0.38096255064 -0.919370114803 -0.0979949310422 0.40485855937 -0.893337786198 -0.194982752204 0.336985379457 -0.895657241344 -0.290139466524 0.354106277227 -0.853297531605 -0.38267159462 0.338175594807 -0.814477980137 -0.47138890624 0.318979471922 -0.767815172672 -0.555558919907 0.296731472015 -0.713766872883 -0.634388267994 0.271614730358 -0.652821421623 -0.707113862038 0.243903934956 -0.585589170456 -0.773003339767 0.213812679052 -0.5127415061 -0.831446290016 0.18167668581 -0.434949785471 -0.881923913956 0.147801145911 -0.352946549654 -0.923856317997 0.112491227686 -0.267586290836 -0.956938385963 0.0761131644249 -0.179601430893 -0.980773329735 0.0439161360264 -0.0984527096152 -0.994140446186 0.0622882768512 -0.0879848599434 -0.994140446186 0.109683521092 -0.161320835352 -0.980773329735 0.16254158318 -0.240485861897 -0.956938385963 0.213812679052 -0.317331463099 -0.923856317997 0.263039022684 -0.391155749559 -0.881923913956 0.309762865305 -0.461165189743 -0.831446290016 0.353465378284 -0.52678000927 -0.773003339767 0.393780320883 -0.587298214436 -0.707113862038 0.430280476809 -0.642139971256 -0.634388267994 0.462660610676 -0.690816998482 -0.555558919907 0.490585029125 -0.732840955257 -0.47138890624 0.513779103756 -0.767815172672 -0.38267159462 0.50526446104 -0.812707901001 -0.290139466524 0.571367561817 -0.797173976898 -0.194982752204 0.535996556282 -0.837275326252 -0.107760854065 0.5671864748 -0.823541998863 -0.00698873866349 0.552751243114 -0.827539920807 0.0979949310422 0.544633328915 -0.81563770771 0.195074319839 0.519089341164 -0.801446557045 0.296945095062 0.525894939899 -0.754966914654 0.391674548388 0.48933377862 -0.73369550705 0.47138890624 0.439069807529 -0.706228852272 0.55534529686 0.450392156839 -0.628406643867 0.634174644947 0.373424470425 -0.600665330887 0.706900238991 0.369670718908 -0.515762805939 0.772820234299 0.307535022497 -0.462660610676 0.831446290016 0.260689109564 -0.392712175846 0.881923913956 0.211340680718 -0.318979471922 0.923856317997 0.159978032112 -0.242194890976 0.956938385963 0.107058934867 -0.16306039691 0.980773329735 0.0574663542211 -0.0912198275328 0.994140446186 0.0741599798203 -0.0782494619489 0.994140446186 0.13681447506 -0.139042332768 0.980773329735 0.204138308764 -0.206335648894 0.956938385963 0.269539475441 -0.271614730358 0.923856317997 0.332316040993 -0.334299743176 0.881923913956 0.391888171434 -0.393780320883 0.831446290016 0.463179409504 -0.433729052544 0.772820234299 0.483443707228 -0.516251087189 0.706900238991 0.56434828043 -0.528458535671 0.634174644947 0.56840723753 -0.606982648373 0.55534529686 0.623065888882 -0.624134063721 0.47138890624 0.652821421623 -0.653706490993 0.38267159462 0.676320672035 -0.67696160078 0.290261536837 0.693288981915 -0.693716228008 0.195074319839 0.703573703766 -0.703787326813 0.0979949310422 0.729911208153 -0.683523058891 0.0 0.680227041245 -0.726401567459 -0.0979644134641 0.715903222561 -0.670400083065 -0.194982752204 0.654103219509 -0.698507666588 -0.290139466524 0.653706490993 -0.652821421623 -0.38267159462 0.624134063721 -0.623065888882 -0.47138890624 0.588549435139 -0.587298214436 -0.555558919907 0.547288417816 -0.54585403204 -0.634388267994 0.500778198242 -0.499160736799 -0.707113862038 0.449446082115 -0.447676002979 -0.773003339767 0.393780320883 -0.391888171434 -0.831446290016 0.334299743176 -0.332316040993 -0.881923913956 0.271614730358 -0.269539475441 -0.923856317997 0.206335648894 -0.204138308764 -0.956938385963 0.139042332768 -0.13681447506 -0.980773329735 0.0782494619489 -0.0741599798203 -0.994140446186 0.0912198275328 -0.0574663542211 -0.994140446186 0.16306039691 -0.107058934867 -0.980773329735 0.242194890976 -0.159978032112 -0.956938385963 0.318979471922 -0.211340680718 -0.923856317997 0.392712175846 -0.260689109564 -0.881923913956 0.462660610676 -0.307535022497 -0.831446290016 0.528153300285 -0.351390123367 -0.773003339767 0.588549435139 -0.391888171434 -0.707113862038 0.643269121647 -0.428601950407 -0.634388267994 0.69182407856 -0.461165189743 -0.555558919907 0.73369550705 -0.48933377862 -0.47138890624 0.768486559391 -0.5127415061 -0.38267159462 0.77782523632 -0.557481586933 -0.290139466524 0.832941651344 -0.517838060856 -0.194982752204 0.808862566948 -0.579729616642 -0.0979644134641 0.849238574505 -0.527970194817 0.0 0.827356815338 -0.552995383739 0.0979949310422 0.815301954746 -0.545152127743 0.195074319839 0.787224948406 -0.548997461796 0.280800819397 0.777397990227 -0.504104733467 0.376140624285 0.732840955257 -0.490585029125 0.47138890624 0.675893425941 -0.484450817108 0.55534529686 0.65660572052 -0.408215582371 0.634174644947 0.577959537506 -0.398724317551 0.711996853352 0.527603983879 -0.338389247656 0.779137551785 0.461165189743 -0.309762865305 0.831446290016 0.391155749559 -0.263039022684 0.881923913956 0.317331463099 -0.213812679052 0.923856317997 0.240485861897 -0.16254158318 0.956938385963 0.161320835352 -0.109683521092 0.980773329735 0.0879848599434 -0.0622882768512 0.994140446186 0.0984527096152 -0.0439161360264 0.994140446186 0.179601430893 -0.0761131644249 0.980773329735 0.267586290836 -0.112491227686 0.956938385963 0.352946549654 -0.147801145911 0.923856317997 0.434949785471 -0.18167668581 0.881923913956 0.5127415061 -0.213812679052 0.831446290016 0.585589170456 -0.243903934956 0.773003339767 0.652821421623 -0.271614730358 0.707113862038 0.72362434864 -0.272255629301 0.634174644947 0.757438898087 -0.343272209167 0.55534529686 0.814477980137 -0.338175594807 0.47138890624 0.86474198103 -0.325357824564 0.382488489151 0.8716391325 -0.395031601191 0.290139466524 0.906002998352 -0.375591307878 0.195074319839 0.919370114803 -0.38096255064 0.0979949310422 0.935911118984 -0.352153092623 0.0 0.906430244446 -0.41077914834 -0.0979644134641 0.917966246605 -0.345377981663 -0.194982752204 0.8716391325 -0.395031601191 -0.290139466524 0.853755295277 -0.352977067232 -0.38267159462 0.815057814121 -0.336771756411 -0.47138890624 0.768486559391 -0.317361980677 -0.555558919907 0.714529871941 -0.294869840145 -0.634388267994 0.653706490993 -0.269539475441 -0.707113862038 0.586565732956 -0.24161504209 -0.773003339767 0.513779103756 -0.211340680718 -0.831446290016 0.436048477888 -0.179052099586 -0.881923913956 0.354106277227 -0.145054474473 -0.923856317997 0.268745988607 -0.109653003514 -0.956938385963 0.18082216382 -0.0731833875179 -0.980773329735 0.100680559874 -0.0385448783636 -0.994140446186 0.106265448034 -0.0181890316308 -0.994140446186 0.191625714302 -0.0365001372993 -0.980773329735 0.284981846809 -0.055116429925 -0.956938385963 0.375591307878 -0.0731833875179 -0.923856317997 0.46259957552 -0.0905484184623 -0.881923913956 0.545121610165 -0.107058934867 -0.831446290016 0.622425019741 -0.122531816363 -0.773003339767 0.693716228008 -0.13681447506 -0.707113862038 0.758323907852 -0.149784848094 -0.634388267994 0.81563770771 -0.161320835352 -0.555558919907 0.865108191967 -0.171300396323 -0.47138890624 0.906216621399 -0.179631948471 -0.38267159462 0.931943714619 -0.217383340001 -0.290139466524 0.967711389065 -0.15967284143 -0.194982752204 0.969145774841 -0.22605060041 -0.0979644134641 0.986632883549 -0.162785723805 0.0 0.976012468338 -0.194280833006 0.0979949310422 0.961851835251 -0.191625714302 0.195074319839 0.931943714619 -0.217383340001 0.290139466524 0.911618411541 -0.150395214558 0.382488489151 0.864803016186 -0.172765284777 0.47138890624 0.809839189053 -0.188909575343 0.55534529686 0.762840688229 -0.125858336687 0.634174644947 0.697347939014 -0.153599664569 0.700033545494 0.629108548164 -0.116580709815 0.768517076969 0.544602811337 -0.109683521092 0.831446290016 0.462050229311 -0.093325600028 0.881923913956 0.375011444092 -0.0761131644249 0.923856317997 0.284371465445 -0.0581377595663 0.956938385963 0.191015347838 -0.0395825058222 0.980773329735 0.105136267841 -0.023865474388 0.994140446186 0.107760854065 -0.00286873988807 0.994140446186 0.195074319839 -0.00155644398183 0.980773329735 0.290261536837 -0.00152592547238 0.956938385963 0.38267159462 -0.00146488845348 0.923856317997 0.471358388662 -0.00140385143459 0.881923913956 0.555558919907 -0.00131229590625 0.831446290016 0.626697599888 0.0117191076279 0.779137551785 0.702078282833 -0.0104068117216 0.711996853352 0.766624987125 0.0145878475159 0.641895830631 0.827478885651 -0.0120548112318 0.561357438564 0.881893396378 -0.000732444226742 0.47138890624 0.91991943121 0.0178228095174 0.391674548388 0.954771578312 -0.0136417737231 0.296945095062 0.980773329735 -0.000305185094476 0.195074319839 0.995178103447 -0.000152592547238 0.0979949310422 0.999450683594 0.0328073985875 0.0 0.994628727436 -0.0326548069715 -0.0979644134641 0.980254530907 0.0321665108204 -0.194982752204 0.954771578312 -0.0136417737231 -0.296945095062 0.917477965355 0.0 -0.397747725248 0.874050140381 0.0 -0.48576310277 0.822229683399 0.0 -0.569109141827 0.762504935265 0.0 -0.646961867809 0.695425271988 0.0 -0.718588829041 0.621631503105 0.0 -0.783288061619 0.541856110096 0.0 -0.840449213982 0.456862092018 0.0 -0.889522969723 0.367473363876 0.0 -0.930021047592 0.274544507265 0.0 -0.96154665947 0.178991064429 0.0 -0.983825206757 0.0979949310422 0.0 -0.995178103447";

    var _box = {};
    _box.id = "XMOT.creation._box";
        
    _box.index = "4 0 3 4 3 7 2 6 7 2 7 3 1 5 2 5 6 2 0 4 1 4 5 1 4 7 5 7 6 5 0 1 2 0 2 3";
    _box.position = "1.0 1 -1.0 1.0 -1.0 -1.0 -1 -1 -1.0 -1 1 -1.0 1 1 1.0 1 -1 1.0 -1 -1 1.0 -1 1.0 1.0";
    _box.normal = "0.408246099949 0.408246099949 -0.816492199898 0.816492199898 -0.408246099949 -0.408246099949 -0.577349185944 -0.577349185944 -0.577349185944 -0.408246099949 0.816492199898 -0.408246099949 0.666646301746 0.666646301746 0.333323150873 0.333323150873 -0.666646301746 0.666646301746 -0.577349185944 -0.577349185944 0.577349185944 -0.666646301746 0.333323150873 0.666646301746";
    _box.texcoord = "1.0 0.0 1.0 1.0 0.0 1.0 0.0 0.0 0.0 0.0 0.0 1.0 1.0 1.0 1.0 0.0 0.0 0.0 1.0 0.0 1.0 1.0 0.0 1.0 1.0 0.0 0.0 0.0 0.0 1.0 1.0 1.0 0.0 1.0 0.0 0.0 1.0 0.0 1.0 1.0 0.0 0.0 0.0 1.0 1.0 1.0 1.0 0.0";


    var sphereObj = new DataObject(_sphere);
    var rectObj = new DataObject(_rect);
    var boxObj = new DataObject(_box);
}());(function(){
	
	// source: http://www.mediaevent.de/javascript/Extras-Javascript-Keycodes.html

    // --- keys ---
	XMOT.KEY_A = 65; 
    XMOT.KEY_B = 66;
    XMOT.KEY_C = 67; 
    XMOT.KEY_D = 68;
    XMOT.KEY_E = 69; 
    XMOT.KEY_F = 70;
    XMOT.KEY_G = 71;
    XMOT.KEY_H = 72;
    XMOT.KEY_I = 73;
    XMOT.KEY_J = 74;
    XMOT.KEY_K = 75;
    XMOT.KEY_L = 76;
    XMOT.KEY_M = 77;
    XMOT.KEY_N = 78;
    XMOT.KEY_O = 79;
    XMOT.KEY_P = 80;
    XMOT.KEY_Q = 81; 
    XMOT.KEY_R = 82; 
    XMOT.KEY_S = 83;
	XMOT.KEY_T = 84; 
    XMOT.KEY_U = 85;
    XMOT.KEY_V = 86;
    XMOT.KEY_W = 87;
    XMOT.KEY_X = 88;
    XMOT.KEY_Y = 89;
    XMOT.KEY_Z = 90;
    
    XMOT.KEY_PGUP = 33; 
    XMOT.KEY_PGDOWN = 34;
    
    // arrow keys
    XMOT.KEY_LEFT = 37; 
    XMOT.KEY_UP = 38; 
    XMOT.KEY_RIGHT = 39;
    XMOT.KEY_DOWN = 40; 
}());
/** A simple class to manage a geometric object in XML3D. Elements to be inserted in the defs or
 * xml3d section can be added and removed. The object can be inserted and removed from the
 * document. 
 * 
 * -- Root Element --
 * Special is the root element. In GeoObject.graph["root"] the root element is placed. We want
 * this to have a unique interface for accessing the root node. Also when attaching the geometry 
 * only the root node will be attached. All other elements in the graph attribute can be used 
 * for storage. They will be detached from their parents during destruction. 
 * 
 * -- ID -- 
 * Each GeoObject has an ID. Storage in the defs and graph sections is addressed by local IDs. 
 * 
 * For example addShaders() or addTransforms() take local IDs, but construct elements with global 
 * IDs, formed by the method globalID(). 
 */
XMOT.util.GeoObject = new XMOT.Class({

    /** Initializes the object.
     *
     *  @this {XMOT.util.GeoObject}
     *  @param {string} _id the ID of this object 
     *  @param {!Object} _xml3d the xml3d element in which the object will reside
     *  @param {!Object} [_rootGrp] the group to which this object is to be attached. If not given
     *              it will be appended to the given xml3d element.
     */
    initialize: function(_id, _xml3d, _rootGrp)
    {
        this.ID = _id; 
        this.xml3d = _xml3d;
        this.defsRoot = XMOT.util.getOrCreateDefs(_xml3d);

        if(_rootGrp)
            this.rootGrp = _rootGrp;
        else
            this.rootGrp = _xml3d;
 
        this.defs = {};     // local IDs -> defs element     
        this.graph = {}; // local IDs -> graph element. this.graph["root"] will hold the root node
    },
    
    /** Detaches the object and resets the defs and graph.
     * 
     *  @this {XMOT.util.GeoObject}
     */
    destroy: function() 
    {
        this.detach(); 
        
        this.defs = {}; 
        this.graph = {}; 
    }, 

    // ========================================================================
    // --- Attach/Detach ---
    // ========================================================================
    /** Attach the defs elements and the graph. Alternatively attachDefs() and 
     *  attachGraph() can be called seperately. 
     * 	
     *  @this {XMOT.util.GeoObject} 
     */
    attach: function()
    {
    	this.attachDefs(); 
    	this.attachGraph(); 
    }, 

    /** Remove the graph and defs elements from the DOM. 
     * 
     *  @this {XMOT.util.GeoObject}
     */
    detach: function()
    {
        this._removeChildren(this.rootGrp, this.graph);
        this._removeChildren(this.defsRoot, this.defs);
    },
    
    /** Add all defs elements to the defsRoot 
     * 
     *  @this {XMOT.util.GeoObject} 
     */
    attachDefs: function()
    {
        this._appendChildren(this.defsRoot, this.defs);
    }, 
    
    /** Add the graph["root"] object to the root group  
     * 
     *  @this {XMOT.util.GeoObject}
     */
    attachGraph: function()
    {            
        this.rootGrp.appendChild(this.graph["root"]); 
    },

    // ========================================================================
    // --- Root Handling ---
    // ========================================================================
    /** Set the given node as the root node in the graph. This is the child node 
     *  of this object's root group. 
     * 
     *  @this {XMOT.util.GeoObject}
     *  @param {!Object} rootNode 
     */
    setGraphRoot: function(rootNode)
    {
        this.graph["root"] = rootNode;  
    }, 

    /** Add the given array of children to the graph root, set previously by 
     *  setGraphRoot(). 
     *  
     *  @this {XMOT.util.GeoObject}
     *  @param {Array.<Object>} children
     */
    addToGraphRoot: function(children)
    {
        if(!this.graph["root"]) 
            throw "XMOT.util.GeoObject: no root node present."; 
            
        if(children.constructor !== Array)
            children = [children]; 
        
        for(var i = 0; i < children.length; i++)
            this.graph["root"].appendChild(children[i]); 
    }, 

    /** Retrieve the graph root node. 
     * 
     *  @this {XMOT.util.GeoObject}
     *  @return {Object} 
     */
    getGraphRoot: function() 
    {
        return this.graph["root"]; 
    }, 

    // ========================================================================
    // --- Helpers ---
    // ========================================================================

    /** Convert a given id to a global one. This is done by prepending this object's
     *  id to the given id. This could be done without such a function, but it's 
     *  pretty often used, so the encapsulation is useful.  
     *  
     *  @this {XMOT.util.GeoObject}
     *  @param {string} id a local ID to be converted 
     *  @return {string} the converted, global, ID 
     */
    globalID: function(id)
    {
        return this.ID + "_" + id; 
    },
    
    /** Creates phong shaders and adds them to the defs elements. 
     * 
     *  @this {XMOT.util.GeoObject}
     *  @param {string|Array} IDs a single or array of local IDs for the shader. 
     *  @param {Object} [opts] the options for XMOT.creation.phongShader()
     * 
     *  The id of the created shaders will be set to global IDs. The options
     *  get applied to each of the given IDs.  
     */
    addShaders: function(IDs, opts)
    {
        if(!opts)
            opts = {}; 
        
        if(IDs.constructor !== Array)
            IDs = [IDs]; 
        
        for(var i = 0; i < IDs.length; i++)
        {
            opts.id = this.globalID(IDs[i]);
            
            this.defs[IDs[i]] = XMOT.creation.phongShader(opts);            
        } 
    }, 

    /** Creates transform elements and adds them to the defs elements. 
     * 
     *  @this {XMOT.util.GeoObject}
     *  @param {string|Array} IDs a single or array of local IDs for the transform elements 
     *  @param {Object} [opts] the options for XMOT.creation.element() 
     * 
     *  The id of the created shaders will be set to global IDs. The options will 
     *  be applied to each ID. 
     */
    addTransforms: function(IDs, opts)
    {
        if(!opts)
            opts = {}; 
        
        if(IDs.constructor !== Array)
            IDs = [IDs]; 
        
        for(var i = 0; i < IDs.length; i++)
        {        
            opts.id = this.globalID(IDs[i]);
            
            this.defs[IDs[i]] = XMOT.creation.element("transform", opts);
        }
    }, 
    
    /** Set the contents of the transform elements, that have the given local IDs, 
     *  with the given options. So basically setting a lot of transforms to the same
     *  values with a single call.   
     * 
     *  @this {XMOT.util.GeoObject}
     *  @param {string|Array} localIDs a single ID or an array of IDs 
     *  @param {!Object} opts an object of options, supported: transl, scale, rot
     */
    updateTransforms: function(localIDs, opts)
    {
        if(localIDs.constructor !== Array)
            localIDs = [localIDs];

        var len = localIDs.length;
        for(var i = 0; i < len; i++)
        {
            var el = this.defs[localIDs[i]];
            if(!el)
                continue;

            if(opts.transl)
                el.setAttribute("translation", opts.transl);
            if(opts.scale)
                el.setAttribute("scale", opts.scale);
            if(opts.rot)
                el.setAttribute("rotation", opts.rot);
        }
    },

    // ========================================================================
    // --- Private ---
    // ========================================================================

    /** Append all children to the given element. 
     *   
     *  @this {XMOT.util.GeoObject}
     *  @param {!Object} targetEl 
     *  @param {Array.<Object>} children
     */
    _appendChildren: function(targetEl, children)
    {
        for(var i in children)
            targetEl.appendChild(children[i]);
    },

    /** Remove all childen from the given element. 
     *   
     *  @this {XMOT.util.GeoObject}
     *  @param {!Object} targetEl 
     *  @param {Array.<Object>} children
     */
    _removeChildren: function(targetEl, children)
    {
        for(var i in children)
            targetEl.removeChild(children[i]);
    }
});

/** This class manages listeners for given events, for a variable number of arguments.
 *  It holds a map from event names to listeners. The event names can be managed 
 *  through add/removeListenerTypes() and isListenerType(). 
 *  
 *  To register an event, addListener() should be called with the associated event 
 *  name and a callback method. 
 *  
 *  All listeners of an event type can be called with notifyListeners(), which expects the 
 *  corresponding event name. 
 */
XMOT.util.Observable = new XMOT.Class({

    /** 
     *  @this {XMOT.util.Observable}
     *   
     *  @param listenerTypes a single name or an array of names for 
     *        listener types
     */
    initialize: function(listenerTypes)
    {
        /** @private */
        this._listeners = {};
        /** @private */ 
        this._listenerTypes = {};
        
        this.addListenerTypes(listenerTypes);
    },

    /** Remembers the given (array of) event name as valid event names.
     * 
     *  @this {XMOT.util.Observable}
     */
    addListenerTypes: function(listenerTypes)
    {
        if(!listenerTypes)
            return; 
        
        if(listenerTypes.constructor == Array)
        {
            for(var i = 0; i < listenerTypes.length; i++)
            {
                var type = listenerTypes[i]; 
                if(this._listenerTypes[type] === true) 
                    throw "XMOT.util.Observable: type already registered: '" + type + "'!"; 
                
                this._listenerTypes[type] = true;                
            }
        }
        else if(this._listenerTypes[listenerTypes] === true)
        {
            throw "XMOT.util.Observable: type already registered: '" + listenerTypes + "'!";            
        }
        else 
            this._listenerTypes[listenerTypes] = true;
    },

    /** Remove the given listener types from the array. The listeners will not be 
     *  removed!
     * 
     *  @this {XMOT.util.Observable} 
     */
    removeListenerTypes: function(listenerTypes)
    {
        if(!listenerTypes)
            return; 
        
        if(listenerTypes.constructor == Array)
        {
            for(var i = 0; i < listenerTypes.length; i++)
                this._listenerTypes[listenerTypes[i]] = false;
        }
        else
            this._listenerTypes[listenerTypes] = false;
    },


    /** Add a listener for the given event type 
     *  
     *  @this {XMOT.util.Observable}
     *  
     *  @param {string} evtname
     *  @param {function()} listener
     */
    addListener: function(evtname, listener)
    {
        if(this.isListenerType(evtname))
        {
            if(!this._listeners[evtname])
                this._listeners[evtname] = [];

            this._listeners[evtname].push(listener);
        }
    },

    /** Remove first occurence of given element. 
     * 
     *  @this {XMOT.util.Observable}
     *  @param {string} evtname
     *  @param {function()} listener 
     */
    removeListener: function(evtname, listener)
    {
        if(this.isListenerType(evtname))
        {
            if(!this._listeners[evtname])
                return;

            for(var i = 0; i < this._listeners[evtname].length; i++)
            {
                if(this._listeners[evtname][i] === listener)
                {
                    this._listeners[evtname].slice(i, 1);
                    return;
                }
            }
        }
    },

    /** Notifies all listeners. Arguments can be given to this function that get
     *     forwarded to each listener.
     * 
     *  @this {XMOT.util.Observable}
     *  @param {string} evtname
     */
    notifyListeners: function(evtname)
    {
        if(this.isListenerType(evtname)
        && this._listeners[evtname])
        {
            var args = Array.prototype.slice.call(arguments);
            for(var i = 0; i < this._listeners[evtname].length; i++)
                this._listeners[evtname][i].apply(this, args.slice(1));
        }
    },

    /** Returns whether this listener manager manages the given event name.
     * 
     *  @this {XMOT.util.Observable}
     *  @param {string} evtname
     *  @return {boolean} true if evtname is registered as a listener type. 
     */
    isListenerType: function(evtname)
    {
        return (this._listenerTypes[evtname] === true);
    }
});
(function() {    
    /** 
     * For the given node calls the handler method xfmChanged() when 
     * the global transformation changed. This is the case if the transform 
     * attribute of the target node or of one of the parent nodes changed. 
     * Since transform attributes point to transform elements the transformation of 
     * the target node also changes if corresponding transform elements are modified.  
     * 
     * This observer tracks only these changes, though. It does not track whether some local fields 
     * of the target node change since it does not know which there might be. 
     * 
     * The observer registers itself as listener in all parent nodes that have a transform attribute 
     * to find out when changes to that attribute happen. 
     * 
     * @constructor
     * @param {!Object} _targetNode the node to track
     */
    var TransformTracker = function(_targetNode)
    {          
        if(!_targetNode)
            throw "TransformTracker: no target node specified.";
        
        this.xml3d = XMOT.util.getXml3dRoot(_targetNode);
        if(!this.xml3d)
            throw "TransformTracker: given node is not a child of an xml3d element."; 
        
        this.targetNode = _targetNode; 
        
        /** @private */ 
        this._attached = false; 
        
        this.attach(); 
    }; 
    
    var p = TransformTracker.prototype;
    
    /** Event handler to be overriden by the user
     * 
     * @param {!Object} targetNode the node this observer tracks
     * @param {!Event} evt the original DOM event that caused the change
     */
    p.xfmChanged = function(targetNode, evt) { }; 

    /** 
     * Register callbacks in the given node and all parent nodes. 
     * 
     * @this {TransformTracker} 
     * @param {!Object} [node] (internal) the node to register. If not given the 
     *  target node is taken. 
     */
    p.attach = function(node)
    { 
        if(!this._attached)
        {
            if(!node)
                node = this.targetNode; 
            
            if(node.tagName == "xml3d")
                return; 
            
            if(node.tagName == "group")
            {
                node.addEventListener("DOMAttrModified", 
                    XMOT.util.wrapCallback(this, _onGrpAttrModified), false);
                
                var xfm = XMOT.util.transform(node); 
                if(xfm)
                    xfm.addEventListener("DOMAttrModified", 
                        XMOT.util.wrapCallback(this, _onXfmAttrModified), false);
            }
            else if(node.tagName == "view")
            {
                node.addEventListener("DOMAttrModified", 
                    XMOT.util.wrapCallback(this, _onViewAttrModified), false);
            }
            
            this.attach(node.parentNode); 
            
            this._attached = true; 
        }
    };

    /** 
     * Deregister callbacks in the given node and all parent nodes. 
     * 
     * @this {TransformTracker} 
     * @param {Object} node (internal) the node to register. If not given the 
     *  target node is taken. 
     */
    p.detach = function(node)
    { 
        if(this._attached)
        {
            if(!node)
                node = this.targetNode; 
            
            if(node.tagName == "xml3d")
                return; 
            
            if(node.tagName == "group")
            {
                node.removeEventListener("DOMAttrModified", 
                    XMOT.util.wrapCallback(this, _onGrpAttrModified), false);
            
                var xfm = XMOT.util.transform(node);
                if(xfm)
                    node.removeEventListener("DOMAttrModified", 
                        XMOT.util.wrapCallback(this, _onXfmAttrModified), false);
            }
            else if(node.tagName == "view")
            {
                node.removeEventListener("DOMAttrModified", 
                    XMOT.util.wrapCallback(this, _onViewAttrModified), false);
            }
            
            this.detach(node.parentNode);
            
            this._attached = false; 
        }
    };
       
    function _onGrpAttrModified(evt)
    {   
        if(evt.attrName !== "transform")
            return;
        
        this.xfmChanged(this.targetNode, evt);
    };
    
    function _onViewAttrModified(evt)
    {
        if(evt.attrName !== "position"
        && evt.attrName !== "orientation")
            return; 
        
        this.xfmChanged(this.targetNode, evt); 
    }; 
    
    function _onXfmAttrModified(evt)
    {
        this.xfmChanged(this.targetNode, evt); 
    };

    // export 
    XMOT.TransformTracker = TransformTracker; 
}()); 

(function() { 

    /** 
     * Tracks the active view of the given xml3d tag for changes and applies 
     * the changed pose to the given transform node. 
     * 
     * @param {!Object} _targetTransform the transform element to which the view 
     *      changes are propagated.
     */
    var ViewTracker = function(_targetTransform)
    {                    
        this.targetTransform = _targetTransform;
        if(!this.targetTransform)
            throw "ViewTracker: no target transformation specified."; 
        
        this.xml3d = XMOT.util.getXml3dRoot(_targetTransform); 
        if(!this.xml3d)
            throw "ViewTracker: given node is not a child of an xml3d element.";
        
        this.targetNode = null; // the current view element that is tracked       
        
        /** the TransformTracker used to track changes in the active view element
         *  @private 
         */ 
        this._xfmObs = null; 
        /** @private */ 
        this._attached = false; 
        
        this.attach(); 
    };
    
    var p = ViewTracker.prototype;
        
    /** Event handler to be overriden by the user
     * 
     * @param targetNode the node this observer tracks
     * @param evt the original DOM event that caused the change
     */
    p.xfmChanged = function(targetNode, evt) { };
    
    p.attach = function() 
    {
        if(!this._attached)
        {           
            this.xml3d.addEventListener("DOMAttrModified", 
                XMOT.util.wrapCallback(this, _onXml3DAttrModified), false); 
            
            this.targetNode = XML3D.util.getOrCreateActiveView(this.xml3d);
            
            if(this._xfmObs)
                this._xfmObs.detach(); 
            this._xfmObs = new XMOT.TransformTracker(this.targetNode); 
            this._xfmObs.xfmChanged = XMOT.util.wrapCallback(this, _onXfmChanged);
    
            _onXfmChanged.apply(this, this.targetNode);
            
            this._attached = true; 
        }
    }; 
    
    p.detach = function() 
    {
        if(this._attached)
        {
            this._xfmObs.detach(); 
            this.xml3d.removeEventListener("DOMAttrModified",
                XMOT.util.wrapCallback(this, _onXml3DAttrModified), false);
            
            this._attached = false; 
        }
    };
    
    function _onXml3DAttrModified(evt)
    {
        if(evt.attrName !== "activeView")
            return; 
        
        this.detach(); 
        this.attach(); 
    };
    
    function _onXfmChanged(targetNode, evt)
    {
        var mat = this.targetNode.getWorldMatrix(); 
        
        var transl = new window.XML3DVec3(mat.m41, mat.m42, mat.m43);
        var rot = window.XML3DRotation.fromMatrix(mat); 
               
        this.targetTransform.setAttribute("translation", transl.str()); 
        this.targetTransform.setAttribute("rotation", rot.str());
        
        this.xfmChanged(this.targetNode, evt); 
    }; 
    
    // export 
    XMOT.ViewTracker = ViewTracker; 
}()); 

/** A simple TransformSensor, similar to X3D's TransformSensor.
 *
 * You give it a bounding box and target node. The sensor tracks transformation changes
 * in the target node and notifies the listeners as soon as the bounding box
 * of the target node intersects with the given bounding box.
 *
 * The registered listeners for "start" and "end" have a single argument:
 * the associated transform sensor. Any additional information can be obtained from
 * that sensor.
 * 
 * @extends XMOT.util.Observable
 */
XMOT.TransformSensor = new XMOT.Class(
    XMOT.util.Observable, {

    /** Initializes the sensor with the given values and attaches the sensor to
     *  the target groups.
     *  
     *  @this {XMOT.TransformSensor}
     *  
     *  @param {string} _id a unique identifier for this sensor
     *  @param {Array.<Object>} _tarGrps the groups of which to track transformation changes
     *  @param {XML3DBox} _bbox the bounding box to intersect the target groups with
     */
    initialize: function(_id, _tarGrps, _bbox)
    {        
        this.callSuper([
            "start", "end" // args (this) 
        ]); 

        this.ID = _id;
        this.xml3d = XMOT.util.getXml3dRoot(_tarGrps[0]);
        this.targetGrps = _tarGrps;
        this.bbox = _bbox;

        /** all the target elements that currently intersect with this sensor's
         * bounding box.
         *
         * The type is: grp -> boolean. I.e. it is a set.
         */
        this.currentIntersectGrps = []; 

        this._isAttached = false; 
        this.attach();
    },

    /** @this {XMOT.TransformSensor} */
    attach: function()
    {
        if(!this._isAttached)
        {
            this._observers = [];

            var grps = this.targetGrps;
            for(var i in grps)
            {
                var tar = grps[i];
                this._observers[tar] = new XMOT.TransformTracker(tar);
                this._observers[tar].xfmChanged = this.callback("_xfmChanged");
            }

            this._isAttached = true;
        }
    },

    /** @this {XMOT.TransformSensor} */
    detach: function()
    {
        if(this._isAttached)
        {
            var obs = this._observers;
            for(var i in obs)
            {
                var o = obs[i];

                o.xfmChanged = function() {};
                o.detach();
            }

            this._observers = [];

            this._isAttached = false;
        }
    },

    /** Callback of internally used XMOT.TransformTracker
     * 
     *  @this {XMOT.TransformSensor}
     *  @private
     *  
     *  @param {!Object} tarNode
     */
    _xfmChanged: function(tarNode)
    {
        var tarBBox = tarNode.getBoundingBox();

        var isInt = this.bbox.intersects(tarBBox);
        var alreadyInt = this.currentIntersectGrps[tarNode];

        if(isInt && !alreadyInt) // new intersection (no intersection before)
        {
            this.currentIntersectGrps[tarNode] = true;
            this.notifyListeners("start", this);
        }
        else if(!isInt && alreadyInt) // intersection gone (and intersection before)
        {
            this.currentIntersectGrps[tarNode] = false;
            this.notifyListeners("end", this);
        }
    }
});

XMOT.namespace("XMOT.interaction.behaviors"); 

if(!XMOT.interaction)
    XMOT.interaction = {}; 

if(!XMOT.interaction.behaviors)
    XMOT.interaction.behaviors = {}; 

/** A simple pointing device sensor.
 *
 * Listens to mouse events and notifies listeners of dragging events, i.e.
 * start/end of dragging and the dragging itself, as well as touch events,
 * when the pointing device touched an element (e.g. mouse click event).
 * The state of the sensor includes a pointing device position (represented
 * by a ray), the current hit element and corresponding hit point.
 *
 * Users of the class register handlers to the dragging events
 * "dragstart", "drag" and "dragend". 
 * 
 * @extends XMOT.util.Observable
 *
 */
XMOT.interaction.behaviors.PDSensor = new XMOT.Class(
    XMOT.util.Observable, {

    /** Constructor of PDSensor
     * @this {XMOT.interaction.behaviors.PDSensor}
     * 
     * @param {string} id the id of this sensor
     * @param {Array.<Object>} grps the groups this sensor should look for. All should have the same xml3d root element. 
     */
    initialize: function(id, grps)
    {        
        // setup listener manager
        this.callSuper([                        
            "dragstart", "drag", "dragend", // args (this, MouseEvent) 
            "touch", // args (this, MouseEvent "mouseup"), drag executed on same location
            "attach", "detach" // args (),  raised during calls to attach()/detach()
        ]); 
        
        this.ID = id;
        this.xml3d = XMOT.util.getXml3dRoot(grps[0]); 
        this.pickGroups = grps;
        
        // -- pointing device's pose and hit information --
        this.pdPose = new window.XML3DRay(new window.XML3DVec3(0,0,0), new window.XML3DVec3(0,0,1));
        this.curHitElement = null;
        this.curHitPoint = null; // if hit occured, holds hit point, else is null

        // pointing stuff 
        /** @private */
        this._sensorIsActive = false; 
        /** @private */        
        this._numObjsOver = 0; // number of objects the sensor is pointing towards 
        /** @private */
        this._mouseDownPos = {x: -1, y: -1};

        // attach sensor 
        /** @private */ 
        this._isAttached = false;
        this.attach();
    },

    // -- attaching/detaching of mouse events --
    /**
     * @this {XMOT.interaction.behaviors.PDSensor}
     */
    attach: function()
    {
        if(!this._isAttached)
        {
            for(var i = 0; i < this.pickGroups.length; i++)
            {
                this.pickGroups[i].addEventListener("mouseover",
                    this.callback("_onMouseOver"), false);
                this.pickGroups[i].addEventListener("mouseout",
                    this.callback("_onMouseOut"), false);
                this.pickGroups[i].addEventListener("mousedown",
                    this.callback("_onMouseDown"), false);
            }

            this.xml3d.addEventListener("mousemove", this.callback("_onMouseMove"), false);
            this.xml3d.addEventListener("mouseup", this.callback("_onMouseUp"), false);
            window.addEventListener("mouseout", this.callback("_onMouseOutOfCanvas"), false);
            
            this.notifyListeners("attach"); 

            this._isAttached = true;
        }
    },

    /**
     * @this {XMOT.interaction.behaviors.PDSensor}
     */
    detach: function()
    {
        if(this._isAttached)
        {
            for(var i in this.pickGroups)
            {
                this.pickGroups[i].removeEventListener("mouseover",
                    this.callback("_onMouseOver"), false);
                this.pickGroups[i].removeEventListener("mouseout",
                    this.callback("_onMouseOut"), false);
                this.pickGroups[i].removeEventListener("mousedown",
                    this.callback("_onMouseDown"), false);
            }

            this.xml3d.removeEventListener("mousemove", this.callback("_onMouseMove"), false);
            this.xml3d.removeEventListener("mouseup", this.callback("_onMouseUp"), false);
            window.removeEventListener("mouseout", this.callback("_onMouseOutOfCanvas"), false);
            
            this.notifyListeners("detach"); 

            this._isAttached = false;
        }
    },

    // -- Status access --
    /**
     * @this {XMOT.interaction.behaviors.PDSensor}
     */
    isOver: function() { return (this._numObjsOver === 0); },
    /**
     * @this {XMOT.interaction.behaviors.PDSensor}
     */
    isActive: function() { return this._sensorIsActive; },

    // ========================================================================
    // --- Private --- 
    // ========================================================================

    // -- Mouse Event Handlers --
    /** onMouseOver: called if pd is moved over the influenced groups
     * 
     *  @this {XMOT.interaction.behaviors.PDSensor}
     *  @private 
     *  @param {MouseEvent} evt
     */
    _onMouseOver: function(evt)
    {
        this._numObjsOver++;
    },

    /** onMouseOut: called when pd is moved out of influenced groups
     * 
     *  @this {XMOT.interaction.behaviors.PDSensor}
     *  @private
     *   
     *  @param {MouseEvent} evt
     */
    _onMouseOut: function(evt)
    {
        this._numObjsOver--;
    },

    /** onMouseOutOfCanvas: called when the mouse leaves
     *
     * @this {XMOT.interaction.behaviors.PDSensor}
     * @private
     * @param evt
     */
	_onMouseOutOfCanvas: function(evt)
	{
		if(this._sensorIsActive)
			if(evt.fromElement.tagName == "canvas")
				this._onMouseUp(evt);
	},

    /** onMouseDown: called when primary pd button is pressed over influenced groups
     * 
     *  @this {XMOT.interaction.behaviors.PDSensor}
     *  @private 
     *  @param {MouseEvent} evt
     */
    _onMouseDown: function(evt)
    {
    	evt.stopPropagation(); 
    	
        this._mouseDownPos = {x: evt.pageX, y: evt.pageY};

        this._pickAndUpdateStatus(evt.pageX, evt.pageY);

        this._sensorIsActive = true;

        this.notifyListeners("dragstart", this, evt);
    },

    /** onMouseMove: called whenever the pd is moved
     *  important: it is called when a move happens in xml3d tag,
     *  not just over influenced groups
     * 
     *  @this {XMOT.interaction.behaviors.PDSensor}
     *  @private 
     *  @param {MouseEvent} evt
     */
    _onMouseMove: function(evt)
    {    	
        this._pickAndUpdateStatus(evt.pageX, evt.pageY);

        if(this._sensorIsActive)
        {
        	evt.stopPropagation(); 
        	
            this.notifyListeners("drag", this, evt);
        }
    },

    /** Called when mouseup on xml3d element.
     * 
     *  @this {XMOT.interaction.behaviors.PDSensor}
     *  @private 
     *  
     *  @param {MouseEvent} evt
     */
    _onMouseUp: function(evt)
    {
        this._pickAndUpdateStatus(evt.pageX, evt.pageY);

        if(this._sensorIsActive)
        {
        	evt.stopPropagation(); 
        	
            this._sensorIsActive = false;

            this.notifyListeners("dragend", this, evt);
        }

        // raise click if: mouse position is same for mousedown and mouseup event
        // and an element is currently hit
        if(this.curHitElement
        && this._mouseDownPos.x === evt.pageX
        && this._mouseDownPos.y === evt.pageY
        && evt.button == 0) // only take left-button clicks as touch
            this.notifyListeners("touch", this, evt);
    },

    /** perform a pick with the given page coordinates and update the internal state.
     * 
     *  @this {XMOT.interaction.behaviors.PDSensor}
     *  @private 
     *  @param {number} pageX
     *  @param {number} pageY
     */
    _pickAndUpdateStatus: function(pageX, pageY)
    {
        // update pd sensor status
        var pos = XML3D.util.convertPageCoords(this.xml3d, pageX, pageY);

        this.pdPose = this.xml3d.generateRay(pos.x, pos.y);
        this.curHitPoint = new window.XML3DVec3();

        this.curHitElement = this.xml3d.getElementByPoint(pos.x, pos.y, this.curHitPoint);
        if(!this.curHitElement)
            this.curHitPoint = null; // invalidate hit point
    }
});

XMOT.namespace("XMOT.interaction.behaviors"); 

/** A plane sensor is a pointing device sensor that maps the movement of
 *  the pointing device on a plane. Listeners can be registered for the
 *  event "translchanged", which is raised whenever the pointing
 *  device changed the position on that plane.
 *  In this case the translation property gives the translation since the
 *  start of dragging.
 *
 *  In addition a constraint can be specified to adjust the calculated translation. 
 *
 *  One handy thing is the getCanonicalTranslation() method. No matter what the
 *  current plane origin or normal is, this returns the translation in the
 *  canonical [o: (0,0,0), d: (0,0,1)] plane. This comes in handy when
 *  you need to rely on two dimensions (often the case with mouse).
 *  
 *  @extends XMOT.interaction.behaviors.PDSensor
 */

XMOT.interaction.behaviors.PlaneSensor = new XMOT.Class(
    XMOT.interaction.behaviors.PDSensor,
{
    /** Constructor of PlaneSensor
     * 
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  
     *  @param {string} id the id of this sensor
     *  @param {Array.<Object>} grps the groups this sensor should look for
     *  @param {XML3DVec3|!Object} [planeOrient] the group or vector the sensor takes to decide where the plane
     * 			normal should reside. If it's a group the local z=0 plane of the given group is taken.
     * 			If a vector is given, the vector directly is taken. If not specified a plane
     * 			parallel to the user's view is taken.
     *  @param {XML3DVec3} [transOff] initial translation offset of the sensor
     */
    initialize: function(id, grps, planeOrient, transOff)
    {
        this.callSuper(id, grps);

        // the translation in the plane during a drag operation 
        this.translation = new window.XML3DVec3(0,0,0);
        // plane origin during a drag operation
        this.planeOrigin = new window.XML3DVec3(0,0,0);
        
        /** The translation constraint for constraining the final output value */ 
        this.constraint = new XMOT.BoxedTranslationConstraint();

        /** the offset that is to be used during the drag operation. The translation
         * will be the translation in the plane added to the translation offset. */
        if(transOff)
            this.translationOffset = new XML3DVec3(transOff);
        else
            this.translationOffset = new XML3DVec3(0,0,0);

        /** if false, the offset that is saved b/w the drag operations is not used
         *  for computing the translation along the plane. */
        this.useTransOffset = true;

        this.setPlaneOrientation(planeOrient); 

        // setup listeners
        this.addListenerTypes("translchanged");

        this.addListener("dragstart", this.callback("_onPlaneDragStart"));
        this.addListener("drag", this.callback("_onPlaneDrag"));
        this.addListener("dragend", this.callback("_onPlaneDragEnd"));
    },

    /** retrieve the current translation value in the canonical
     *  plane [o: (0,0,0), d: (0,0,1)] no matter what the current origin or
     *  normal is.
     *
     *  In this method no constraints are applied!
     *  
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     * 
     *  @return {XML3DVec3} 
     */
    getCanonicalTranslation: function()
    {
        var mat = XMOT.math.getTransformPlaneToPlane(this.planeOrigin, this.getPlaneNormal());

        var torig = mat.multiplyPt(this.planeOrigin);
        var tp = mat.multiplyPt(this.planeOrigin.add(this.translation));
        tp = tp.subtract(torig);

        return tp;
    },

    /** Set the plane orientation vector or group.
     * 
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  
     *  @param {XML3DVec3|Object} planeOrient
     */    
    setPlaneOrientation: function(planeOrient)
    {        
        // The plane normal calculated during getPlaneNormal().
        this._validPlaneNormal = new window.XML3DVec3(0, 0, 1);
        this._planeNormalValid = false;

        // user-defined plane orientation
        this._planeNormal = null;
        this._orientGrp = null;

        if(planeOrient)
        {
            if(planeOrient.constructor === window.XML3DVec3)
                this._planeNormal = planeOrient;
            else // no vector, assume group
                this._orientGrp = planeOrient;
        }        
    },

    /** Calculate the plane normal. Always use this method to obtain the plane 
     *  normal.
     *  
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  
     *  @return {XML3DVec3} 
     */
    getPlaneNormal: function()
    {
        if(this._planeNormalValid)
            return this._validPlaneNormal; 
        
        // user set normal
        if(this._planeNormal)
        {
            this._validPlaneNormal = this._planeNormal;
        }
        // user set group 
        else if(this._orientGrp)
        {
            var plNorm = new window.XML3DVec3(0, 0, 1);
            this._validPlaneNormal = this._orientGrp.getWorldMatrix().multiplyDir(plNorm);
        }
        // take view as basis 
        else
        {
            var va = XML3D.util.getOrCreateActiveView(this.xml3d);
            var wMat = va.getViewMatrix().inverse();   
            
            this._validPlaneNormal = wMat.multiplyDir(new window.XML3DVec3(0,0,1));
        }

        this._validPlaneNormal = this._validPlaneNormal.normalize();
        this._planeNormalValid = true;

        return this._validPlaneNormal;
    },

    // ========================================================================
    // --- Private --- 
    // ========================================================================

    // --- Drag methods ---
    /** Callback for PDSensor's dragstart event
     * 
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  @private
     * 
     *  @param {XMOT.interaction.behaviors.PDSensor} sensor
     */
    _onPlaneDragStart: function(sensor)
    {
        this.planeOrigin = new window.XML3DVec3(sensor.curHitPoint);
        this._planeHitPoint = new window.XML3DVec3(this.planeOrigin);
        this._planeNormalValid = false;
    },

    /** Callback for PDSensor's drag event 
     * 
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  @private
     * 
     *  @param {XMOT.interaction.behaviors.PDSensor} sensor
     */
    _onPlaneDrag: function(sensor)
    {
        var hitP = this._calcPlaneHitPoint();
        if(!hitP)
            return;
        this._planeHitPoint = hitP;

        this._calcTranslation(); 

        this.notifyListeners("translchanged", this);
    },

    /** Callback for PDSensor's dragend event 
     * 
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  @private
     * 
     *  @param {XMOT.interaction.behaviors.PDSensor} sensor
     */
    _onPlaneDragEnd: function(sensor)
    {
        this.translationOffset = new window.XML3DVec3(this.translation);
    },

    /** Calculate the hit point on the sensor's plane.
     * 
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  @private
     *
     *  @return {XML3DVec3} the hit point or null in case no hit occured
     */
    _calcPlaneHitPoint: function()
    {
        // intersect ray with view plane norm
        var intersectHitP = new window.XML3DVec3();

        if(1 !== XMOT.math.intersectRayPlane(this.pdPose, 
            this.planeOrigin, this.getPlaneNormal(), intersectHitP))
        {
            // either didnt hit or whole ray lies on plane
            // ignore it
            return null;
        }
            
        return intersectHitP; 
    },
    
    /** Calculate translation based on the current _planeHitPoint 
     *  and apply translation offset and constrain it. It will set 
     *  the translation property of this instance. 
     * 
     *  @this {XMOT.interaction.behaviors.PlaneSensor}
     *  @private
     */
    _calcTranslation: function() 
    {        
        var transl = this._planeHitPoint.subtract(this.planeOrigin);

        if(this.useTransOffset)
            transl = transl.add(this.translationOffset);

        if(this.constraint.constrainTranslation(transl))
        {
            this.translation = transl;             
        }
    } 
});

XMOT.namespace("XMOT.interaction.behaviors"); 

/** Scaler maps the translation on a plane into a uniform scaling in all 3 dimensions.
 *
 * Scaling is performed as follows. We remember the current scaling of the target at the
 * beginning of a drag operation. That scaling is multiplied with a factor to lead the new
 * scaling.
 * The factor is computed in _calcUniformScaleFactor(). It is based on the length of the
 * canonical translation vector on the plane.
 * Canonical translation is used for easy computation. It will always lie in the in the plane
 * with normal (0, 0, 1). With that length we have an initial estimate.
 * We want to make the object smaller, too. So we do the following. If both components of
 * the canonical translation are negative, the factor will become negative. The same holds,
 * if only one component is negative, but the length is below a small threshold.
 *
 * To make the scaling more intuitive, at last the factor is adjusted with the size of the
 * world bounding box of the whole widget. The bigger the widget, the less fast the factor
 * increases. If we don't do this, the scaling of the object will grow faster than the mouse
 * position is moving and, thus, flips with the scaling factor can happen.
 * 
 * @extends XMOT.interaction.behaviors.PlaneSensor
 */
XMOT.interaction.behaviors.Scaler = new XMOT.Class(
    XMOT.interaction.behaviors.PlaneSensor,
{
    /** Constructor of Scaler
     * 
     *  @this {XMOT.interaction.behaviors.Scaler}
     *  
     *  @param {string} id the id of this sensor
     *  @param {Array.<Object>} pickGrps the groups this sensor will listen for events
     *  @param {XMOT.Transformable} targetTransformable the group this sensor will modify. If not given,
     *             it's equal to the first element in pickGrp.
     *  @param {boolean} [uniformScale] whether to perform uniform scaling. Default: true.
     *
     *  @throws "target no transform"/"pick no transform" - targetGrp/pickGrp doesn't have transform attribute
     */
    initialize: function(id, pickGrps, targetTransformable, uniformScale)
    {
        // parent class
        this.callSuper(id, pickGrps, null, null);
        // do not use the offset, we do that ourselves 
        // with the help of _startTarGrpScale 
        this.useTransOffset = false; 

        this.uniformScale = true; 
        if(uniformScale)
            this.uniformScale = uniformScale;

        if(!targetTransformable)
            targetTransformable = XMOT.ClientMotionFactory.createTransformable(pickGrps[0]);
        
        this.targetTransformable = targetTransformable;

        // listeners
        this.addListener("dragstart", this.callback("_onScalePlaneDragStart"));
        this.addListener("translchanged", this.callback("_onScalePlaneTranslChanged"));
    },

    // ========================================================================
    // --- Private --- 
    // ========================================================================

    /** 
     *  @this {XMOT.interaction.behaviors.Scaler}
     *  @private 
     *  
     *  @param {XMOT.interaction.behaviors.Scaler} sensor
     */
    _onScalePlaneDragStart: function(sensor)
    {
        this._startTarGrpScale = new window.XML3DVec3(this.targetTransformable.transform.scale);

        // adjust scaling factor with world bounding box of target node
        var tarSize = XMOT.util.getWorldBBox(this.targetTransformable.object).size();

        this._scaleAdjFactor = tarSize.length();
    },

    /** 
     *  @this {XMOT.interaction.behaviors.Scaler}
     *  @private 
     *  
     *  @param {XMOT.interaction.behaviors.Scaler} sensor
     */
    _onScalePlaneTranslChanged: function(sensor)
    {
        var factor = new window.XML3DVec3(); 

        if(this.uniformScale)
        {
            var fac = this._calcUniformScaleFactor();
            factor.x = factor.y = factor.z = fac;
        }
        else
            factor = sensor.translation;

        var delta = this._startTarGrpScale.multiply(factor);
        var newScale = this._startTarGrpScale.add(delta);
        
        this.targetTransformable.setScale(newScale);
    },

    /** Calculates the scaling factor for uniform scaling.
     *  We take the length of the canonical position on the plane. Also
     *  we have to decide when to apply negative scaling. This is done
     *  if either both position attributes, x and y, are negative or
     *  the length is below a certain threshold and one of x and y is negative.
     *
     *  @this {XMOT.interaction.behaviors.Scaler}
     *  @private
     *  
     *  @return {number} the scaling factor
     */
    _calcUniformScaleFactor: function()
    {
        var canTrans = this.getCanonicalTranslation();

        var fac = Math.sqrt(canTrans.x*canTrans.x + canTrans.y*canTrans.y);

        if((canTrans.x < 0 && canTrans.y < 0) // both negative
        || ((canTrans.x < 0 || canTrans.y < 0) && fac < XML3D.EPSILON)) // one negative and length below threshold
        {
            fac = -fac;
        }

        fac /= this._scaleAdjFactor;

        return fac;
    }
});

XMOT.namespace("XMOT.interaction.behaviors"); 

/** Simple 2DOF controlled rotator.
 *
 * Before usage the bounds have to be set. During dragging the given
 * coordinates are assumed to be in the ranges [0,maxX] and [0,maxY] for x and y
 * coordinates, respectively.
 *
 * The rotating speed can be set using the rotateSpeed attribute.
 *
 * The trackball remembers the rotations of previous rotations so that
 * a new drag operation starts at the last executed rotation. To reset
 * the rotation call resetRotationOffset() before starting to drag.
 *
 * Rotation idea taken from xml3d scene controller's rotate action.
 * See XML3D.Xml3dSceneController.prototype.mouseMoveEvent() "case(this.ROTATE)"
 * for more info.
 */
XMOT.interaction.behaviors.TrackBall = new XMOT.Class({

    /** Initializes the trackball with the dimensions of the tracking space. 
     * 
     *  The dimensions are needed to normalize the dragging input. 
     * 
     *  @this {XMOT.interaction.behaviors.TrackBall}
     *  
     *  @param {number} maxX
     *  @param {number} maxY
     */
    initialize: function(maxX, maxY)
    {
        if(maxX && maxY)
            this.setBounds(maxX, maxY);

        this.rotationSpeed = 1; 
        this.lastRotation = new window.XML3DRotation(); // last rotation calculated in drag()

        /** accumulated rotation of the lastRotation values of previous drag operations
         * Using rotationOffset we can remember the rotation of a drag operation and
         * use it as starting rotation in a next drag operation.
         * Without this every new drag operation would reset the object's rotation to zero
         * angle.
         */
        this.rotationOffset = new XML3DRotation();

        /** 2D start position of dragging 
         *  @private
         */
        this._start2DPos = {x:0, y:0};
        /** @private */
        this._axisRestriction = null;
    },

    /** Sets the maximum x and y values. This is used for
     *  normalizing the 2D positions
     * 
     *  @this {XMOT.interaction.behaviors.TrackBall}
     *  
     *  @param {number} maxX
     *  @param {number} maxY
     */
    setBounds: function(maxX, maxY)
    {
        this.maxX = maxX;
        this.maxY = maxY;
    },

    /** Clear the rotation offset 
     *  
     *  @this {XMOT.interaction.behaviors.TrackBall}
     */ 
    resetRotationOffset: function()
    {
        this.rotationOffset = new window.XML3DRotation();
    },
    
    /** Restrict the rotation to x or y axis
     * 
     *  @this {XMOT.interaction.behaviors.TrackBall}
     *  
     *  @param {string} [axis] the axis to restrict to. Can be "x", "y" or "z". Default: release
     *      the restriction.
     */
    axisRestriction: function(axis)
    {
        if(axis && (axis === "x" || axis === "y" || axis === "z"))
            this._axisRestriction = axis;
        else
            this._axisRestriction = null;

        return this._axisRestriction;
    },

    /** Sets the initial point on the sphere
     * 
     *  @this {XMOT.interaction.behaviors.TrackBall}
     * 
     *  @param {number} x within [0,maxX] 
     *  @param {number} y within [0,maxY]
     */
    dragStart: function(x, y)
    {
        this._start2DPos.x = x;
        this._start2DPos.y = y;
    },

    /** Remember the last output rotation as new offset. 
     *
     *  @this {XMOT.interaction.behaviors.TrackBall}
     */
    dragEnd: function()
    {
        this.rotationOffset = this.lastRotation;
    },

    /** calculate the rotation from start to current point on sphere.
     * 
     *  @this {XMOT.interaction.behaviors.TrackBall}
     *  
     *  @param {number} x within [0,maxX] 
     *  @param {number} y within [0,maxY]
     *  @return {XML3DRotation} the calculated rotation
     */
    drag: function(x, y)
    {                
        var newRot = null;

        var fac = this.rotationSpeed * 2.0 * Math.PI;
        
        // clamp too big values
        if(x > this.maxX)
            x = this.maxX; 
        if(y > this.maxY)
            y = this.maxY; 
        
        // calculate deltas from start position 
        var dx = (x - this._start2DPos.x) / this.maxX;
        dx *= fac; 
        
        var dy = (y - this._start2DPos.y) / this.maxY;
        dy *= fac;
         
        var angle = dx + dy; 

        // calculate rotation based on the axis restriction
        if(this._axisRestriction == "x")
        {
            newRot = new window.XML3DRotation(new window.XML3DVec3(1,0,0), angle);
        }
        else if(this._axisRestriction == "y")
        {
            newRot = new window.XML3DRotation(new window.XML3DVec3(0,1,0), angle);
        }
        else if(this._axisRestriction == "z")
        {
            newRot = new window.XML3DRotation(new window.XML3DVec3(0,0,1), angle);
        }
        else
        {
            var mx = new window.XML3DRotation(new window.XML3DVec3(0,1,0), dx);
            var my = new window.XML3DRotation(new window.XML3DVec3(1,0,0), dy);

            newRot = mx.multiply(my); 
        }

        this.lastRotation = newRot.multiply(this.rotationOffset);

        return this.lastRotation;
    }
});

XMOT.namespace("XMOT.interaction.behaviors"); 

/** Rotater maps the translation on a plane into a trackball rotation and sets
 *  the given group's rotation attribute.
 *  
 *  @extends XMOT.interaction.behaviors.PlaneSensor
 */
XMOT.interaction.behaviors.Rotater = new XMOT.Class(
    XMOT.interaction.behaviors.PlaneSensor,
{
    /** Constructor of Rotater
     * 
     *  @this {XMOT.interaction.behaviors.Rotater}
     *  
     *  @param {string} id the id of this sensor
     *  @param {Array.<Object>} pickGrps the group this sensor will listen for events
     *  @param {XMOT.Transformable} targetTransformable the group this sensor will modify.
     *                 If not given, it is equal to the first element in pickGrp.
     *  @param {number} [rotSpeed] rotation speed, default is 1
     *  @param {XML3DVec3|Object} [planeOrient] modifies the orientation of the underlying
     *                  XML3D.interaction.behaviors.PlaneSensor. 
     *                  See XML3D.interaction.behaviors.PlaneSensor for further information.
     *
     *  @throws "target no transform" if the target group doesn't have a transform
     *           attribute
     */
    initialize: function(id, pickGrps, targetTransformable, rotSpeed, planeOrient)
    {
        // parent class
        this.callSuper(id, pickGrps, planeOrient, null);

        // --- setup pdsensor --- 
        
        this.useTransOffset = false; // always start again at zero translation
        
        /* The trackball assumes values in the range [0,trackMax],
         * but the translation values we get are starting on the object, so rotation
         * should be possible on both sides of the axes of the target object (and not just
         * on the positive sides) so we translate the translation values by half of the maximum
         * tracking values.
         * Here we're not talking in pixels but world-space units. We simply take to be the 
         * space to lie in the [0,Number.MAX_VALUE] range.  
         */
        var trackMax = 250;
        var transMax = trackMax/2;
        var constrBox = new window.XML3DBox(
            new window.XML3DVec3(-transMax, -transMax, -transMax), 
            new window.XML3DVec3(transMax, transMax, transMax)
        );
        this.constraint = new XMOT.BoxedTranslationConstraint(constrBox); 
        
        // --- setup trackball --- 
        
        this.trackBall = new XMOT.interaction.behaviors.TrackBall(trackMax, trackMax);
        if(rotSpeed)
            this.trackBall.rotationSpeed = rotSpeed;
        else
            this.trackBall.rotationSpeed = 4; 

        // --- setup this sensor ---        
        if(!targetTransformable)
            targetTransformable = XMOT.ClientMotionFactory.createTransformable(pickGrps[0]);
        
        this.targetTransformable = targetTransformable; 

        // listeners
        this.addListener("dragstart", this.callback("_onTrackBallDragStart"));
        this.addListener("dragend", this.callback("_onTrackBallDragEnd"));
        this.addListener("translchanged", this.callback("_onTrackBallTranslChanged"));
    },

    /** reset the rotation that gets remembered between drags 
     *
     *  @this {XMOT.interaction.behaviors.Rotater}
     */
    resetRotation: function()
    {
        this.trackBall.resetRotationOffset();
        
        this.targetTransformable.setOrientation(new window.XML3DRotation());
    },

    /** restrict the rotation to x or y axis
     * 
     *  @this {XMOT.interaction.behaviors.Rotater}
     *  
     *  @param {string} [axis] the axis to restrict to. Can be "x", "y" or "z". Default: 
     *          release the restriction
     *  
     *  @return {string} the current axis restriction, or null, if no restriction is applied
     */
    axisRestriction: function(axis)
    {        
        return this.trackBall.axisRestriction(axis);
    },

    /** Set or retrieve the rotation speed
     * 
     *  @this {XMOT.interaction.behaviors.Rotater}
     *  
     *  @param {number} [speed] default: do not set the speed. 
     *  @return {number} the current speed
     */
    rotationSpeed: function(speed)
    {
        if(speed)
            this.trackBall.rotationSpeed = speed;

        return this.trackBall.rotationSpeed;
    },
    
    /** Set or retrieve the status of rotation flipping. Flipped rotation means
     *  the rotation's angle will be negated before it's set in the target transform element.
     *  
     *  @this {XMOT.interaction.behaviors.Rotater}
     *  
     *  @param {boolean} [flip] the new flip value. Default: don't set it
     *  @return {boolean} the current flip value
     */
    flipRotation: function(flip)
    {
        if(flip)
            this._flipRotation = flip; 
        
        return this._flipRotation; 
    },

    // ========================================================================
    // --- Private --- 
    // ========================================================================

    /** 
     *  @private
     *  @this {XMOT.interaction.behaviors.Rotater}
     *  
     *  @param {XMOT.interaction.behaviors.Rotater} sensor
     */
    _onTrackBallDragStart: function(sensor)
    {
        // update the offset with perhaps changed rotation
        this._rotationOffset = new window.XML3DRotation(this.targetTransformable.transform.rotation);
        // reset the trackball's offset: we do that for ourselves 
        this.trackBall.rotationOffset = new XML3DRotation();

        // always start the rotation in the middle of the translation space
        this.trackBall.dragStart(this.trackBall.maxX/2, this.trackBall.maxY/2);
    },

    /** 
     *  @this {XMOT.interaction.behaviors.Rotater}
     *  @private 
     *  
     *  @param {XMOT.interaction.behaviors.Rotater} sensor
     */
    _onTrackBallDragEnd: function(sensor)
    {
        this.trackBall.dragEnd();
    },

    /** 
     *  @this {XMOT.interaction.behaviors.Rotater}
     *  @private
     *  
     *  @param {XMOT.interaction.behaviors.Rotater} sensor 
     */
    _onTrackBallTranslChanged: function(sensor)
    {
        var canTrans = sensor.getCanonicalTranslation(); 

        var canRot = this.trackBall.drag(this.trackBall.maxX/2 + canTrans.x,
                                      this.trackBall.maxY/2 - canTrans.y);
           
        if(this._flipRotation)
            canRot.angle = -canRot.angle;       
                
        var finalRot = this._rotationOffset.multiply(canRot);
        
        this.targetTransformable.setOrientation(finalRot);
    }
});

XMOT.namespace("XMOT.interaction.behaviors"); 

/** Translater is a plane sensor that maps the translation output of that sensor
 *  directly to the given group transform's translation attribute.
 *  
 *  @extends XMOT.interaction.behaviors.PlaneSensor
 */
XMOT.interaction.behaviors.Translater = new XMOT.Class(
        XMOT.interaction.behaviors.PlaneSensor,
{
    /** Constructor of Translater
     * 
     *  @this {XMOT.interaction.behaviors.Translater}
     *  
     *  @param {string} id the id of this sensor
     *  @param {Array.<Object>} pickGrps the group this sensor should look for
     *  @param {XMOT.Transformable} targetTransformable the movable this sensor will modify.
     *                 If not given, a Movable will be created from the first element of pickGrps 
     *  @param {XML3DVec3|!Object} [planeOrient] the group or vector the sensor takes to decide where the plane
     *             normal should reside. If it's a group the local z=0 plane of the given group is taken.
     *             If a vector is given, the vector directly is taken. If not specified a plane
     *             parallel to the user's view is taken.
     */
    initialize: function(id, pickGrps, targetTransformable, planeOrient)
    {      
        
        if(!targetTransformable)
            targetTransformable = XMOT.ClientMotionFactory.createTransformable(pickGrps[0]);
        
        this.targetTransformable = targetTransformable; 
        
        // take local matrix as initial offset
        // we manipulate the transform node of the group, so take the local one
        var transOff = this.targetTransformable.transform.translation;

        this.callSuper(id, pickGrps, planeOrient, transOff);

        this.addListener("dragstart", this.callback("_onTransPlaneDragStart"));
        this.addListener("translchanged", this.callback("_onTranslChanged"));
    },


    // ========================================================================
    // --- Private --- 
    // ========================================================================
    
    /** 
     *  @this {XMOT.interaction.behaviors.Translater}
     *  @private
     *  
     *  @param {XMOT.interaction.behaviors.Translater} sensor
     */
    _onTransPlaneDragStart: function(sensor)
    {
        this.translationOffset = new window.XML3DVec3(this.targetTransformable.transform.translation);
    },

    /** 
     *  @this {XMOT.interaction.behaviors.Translater}
     *  @private
     *  
     *  @param {XMOT.interaction.behaviors.Translater} sensor
     */
    _onTranslChanged: function(sensor)
    {
        this.targetTransformable.setPosition(this.translation);
    }
});

XMOT.namespace("XMOT.interaction.behaviors"); 

/**
 * This class creates and manages the behavior of a ring menu.
 * This ring menu is supposed to be rather simple. You give it a
 * target node and a radius and it places the objects under the target 
 * node on a ring. You can obtain the currently
 * selected object RingMenu.currentSelectedObj and make it step
 * one item to the left or right.
 * 
 * IMPORTANT: the transform properties of the target node as well as 
 * all children will be overriden. In particular, the rotation property 
 * of the target node will be overriden, as well as the translation and
 * rotation properties of the child nodes.  
 */
XMOT.interaction.behaviors.RingMenu = new XMOT.Class({

    /** Creates the ring menu with the given arguments. This method
     *  creates everything it needs for the menu but does not do
     *  any insertions into the dom. The menu will lie in the
     *  world origin with the first selected item in the (0,0,1) direction.
     *
     *  @this {XMOT.interaction.behaviors.RingMenu}
     *  
     *  @param {string} id the identifier of the object. All ids in the ring menu
     *         will include that id somehow. Also the root group of this
     *         menu will have that id so it can be queried easily.
     *  @param {!Object} targetGrp the group under which the menu items reside
     *  @param {number} radius the radius of the ring the objects will lie on
     */
    initialize: function(id, targetGrp, radius)
    {
        this.xml3d = XMOT.util.getXml3dRoot(targetGrp);
        this.ID = id;
        
        this.targetGrp = targetGrp;  

        /** @private */
        this._currentSelectedObjIdx = 0;

        /** @private */
        this._targetChildren = XMOT.util.getXML3DChildren(targetGrp); 
        
        if(this._targetChildren.length < 1)
            throw "RingMenu: at least one child must be present."; 
        
        /** storage for object interpolators. They will do exactly the
         * opposite of what the root interpolator does, to keep the
         * object always aligned to the front when the menu rotates.
         *  @private 
         */
        this._objInterpolators = new Array();

        // rotation angle stuff
        /** @private 
         *  @const 
         */
        this._angleStep = (2*Math.PI) / this._targetChildren.length;
        /** @private */
        this._curAngle = 0; // current rotation of the menu
        /** @private */
        this._stepRotation = new window.XML3DRotation(new window.XML3DVec3(0, 1, 0), this._angleStep);
        /** @private */
        this._radius = radius;

        // setup menu
        this._createInterpolators();
    },

    /** Attach the menu to the given group and all necessary elements to
     *  the defs section.
     *  
     *  @this {XMOT.interaction.behaviors.RingMenu}
     */
    attach: function()
    {
        this._setupChildren();
        
        // attach & update interpolators
        document.body.appendChild(this._rootInterpolator);
        Array.forEach(this._objInterpolators, function(pol) {
            document.body.appendChild(pol);
        });
    },

    /** Detach the previously attached menu. This includes entries in the def section
     *  
     *  @this {XMOT.interaction.behaviors.RingMenu}
     */
    detach: function()
    {
        // detach interpolator
        document.body.removeChild(this._rootInterpolator);
        Array.forEach(this._objInterpolators, function(pol) {
            document.body.removeChild(pol);
        });
    },

    /** Select the left item next to the current one.
     *  It rotates the menu one position in the right direction and thus
     *  selects the element to the left of the current one.
     *  
     *  @this {XMOT.interaction.behaviors.RingMenu}
     */
    stepLeft: function()
    {
        this.step(1);
    },

    /** Selects the right item next to the current one.
     *  See stepRight().
     * 
     * @this {XMOT.interaction.behaviors.RingMenu}
     */
    stepRight: function()
    {
        this.step(-1);
    },

    /** Perform a number of steps in the given direction.
     *
     *  @this {XMOT.interaction.behaviors.RingMenu}
     *  @param {number} numStepsLeft number of steps to go left. If you want to go right,
     *          negate the number of steps.
     */
    step: function(numStepsLeft)
    {
        // create key values
        var startRootRot = "0 1 0 " + this._curAngle;
        var startObjRot = "0 1 0 " + -this._curAngle;

        this._curAngle += numStepsLeft * this._angleStep;

        var endRootRot = "0 1 0 " + this._curAngle;
        var endObjRot = "0 1 0 " + -this._curAngle;

        /** do these checks after the rotation is set
         * to hit the reset button before the next initial
         * rotation.
         */
        if(this._curAngle > 3.14 || this._curAngle < -3.14)
            this._curAngle = 0;

        // set attribute and start root interpolator
        this._startAnimation(this._rootInterpolator, this.targetGrp,
                startRootRot, endRootRot);

        // start animation of each menu object group  
        for(var i = 0; i < this._targetChildren.length; i++)
        {
            this._startAnimation(this._objInterpolators[i], 
                this._targetChildren[i], 
                startObjRot, endObjRot);
        }
        
        /** modify idx of currently selected object. numStepsLeft might 
         *  be negative which might yield a negative new index, too. 
         *  In that case (new idx < 0) we subtract the new index 
         *  from the highest possible index. Since it was modulated before
         *  this will yield always a number between 0 and the number of objects
         *  minus one.
         */ 
        var newIdx = this._currentSelectedObjIdx + numStepsLeft; 
        newIdx %= this._targetChildren.length;         
        if(newIdx < 0)
            newIdx = this._targetChildren.length - newIdx - 1; 
        
        this._currentSelectedObjIdx += newIdx;
    },

    /** The object in the given objList (see initialize()) that is
     *  currently selected.
     *
     *  Selected means it is the object that is currently positioned
     *  in the local (0,0,1) direction.
     * 
     *  @this {XMOT.interaction.behaviors.RingMenu}
     *  @return {Object} 
     */
    currentSelectedObj: function()
    {
        return this._targetChildren[this._currentSelectedObjIdx];
    },

    // ========================================================================
    // --- Private --- 
    // ========================================================================
    
    /** Translates all target children to their proper position on the ring. 
     * 
     *  @this {XMOT.interaction.behaviors.RingMenu}
     *  @private 
     */
    _setupChildren: function()
    {
        this._attachedObjs = new Array();

        // object offset rotation vectors
        var objOffs = new Array();
        objOffs[0] = new window.XML3DVec3(0,0,this._radius);

        for(var i = 0; i < this._targetChildren.length; i++)
        {
            var curChild = this._targetChildren[i]; 
            
            // calculate relative translation
            if(i != 0)
                objOffs[i] = this._stepRotation.rotateVec3(objOffs[i-1]);

            // setup object's translation
            var objXfm = XMOT.util.getOrCreateTransform(curChild, "t_" + this.ID + "_obj_" + i); 
            objXfm.translation.set(objOffs[i]);
        }

        this.currentSelectedObjIdx = 0;
    },

    /** Creates local interpolators for each object and a root node interpolator.
     *  The local interpolators will do the inverse rotation of the root to always
     *  keep them facing towards the front.
     * 
     *  @this {XMOT.interaction.behaviors.RingMenu}
     *  @private 
     *  @param {Array.<Object>} objList
     */
    _createInterpolators: function()
    {
        for(var i = 0; i < this._targetChildren.length; i++)
        {
            // setup object interpolator
            var pol = document.createElementNS(XML3D.x3dNS,
                                               "x3d:OrientationInterpolator");
            
            pol.setAttribute("id", "oi_obj_" + this.ID + "_obj_" + i);
            pol.setAttribute("key", "0 1");
            pol.setAttribute("keyValue", "0 1 0 0 0 1 0 0");
            
            this._objInterpolators.push(pol);
        }

        /* create root interpolator.
         */
        var rpol = document.createElementNS(XML3D.x3dNS,
                                                      "x3d:OrientationInterpolator");
        
        rpol.setAttribute("id", "oi_root_" + this.ID);
        rpol.setAttribute("key", "0 1");
        rpol.setAttribute("keyValue", "0 1 0 0 0 1 0 0");
        
        this._rootInterpolator = rpol; 
    },

    /** Start an animation by setting the interpolator attributes 
     *  and invoking XML3D.startAnimation() 
     *  
     *  @this {XMOT.interaction.behaviors.RingMenu}
     *  @private
     *  
     *  @param {!Object} pol the X3D interpolator
     *  @param {!Object} tarEl the element on which to start the animation
     *  @param {string} startRot initial orientation string
     *  @param {string} endRot final orientation string
     */
    _startAnimation: function(pol, tarEl, startRot, endRot)
    {
        pol.setAttribute("keyValue", startRot + " " + endRot);

        var polId = pol.getAttribute("id");
        var xfmId = XMOT.util.transform(tarEl).getAttribute("id");

        if(XML3D.isAnimationRunning(polId, xfmId, "rotation"))
            return;

        XML3D.startAnimation(polId, xfmId, "rotation", 500);
    }
});

XMOT.namespace("XMOT.interaction.widgets"); 

/** 
 * Widget is a utility base class, that gathers some common functions required 
 * by most widgets. 
 * 
 * o geo and behavior attributes: places where to put geometry and behavior 
 * o attach/detach(): automatic attach and detach and invoking corresponding callbacks, so child classes can react. 
 * o onTargetXfmChanged() : called automatically when target's transformation changes 
 * o callbacks where object creation/destruction takes place 
 * o inherited from XMOT.util.Observable: child classes can use event mechanism easily.
 * 
 * @extends XMOT.util.Observable
 */
XMOT.interaction.widgets.Widget = new XMOT.Class(
    XMOT.util.Observable, {

    /** Sets up the basic construct for a widget and attaches it. 
     *
     *  @this{XMOT.interaction.widgets.Widget}
     *  
     *  @param {string} _id the id if this TransformBox and also the id of the corresponding root group node
     *  @param {XMOT.Transformable} _target the target transformable
     *  @param {boolean} [_autoScaleAdj] automatically fit the scale of the widget's root group to the 
     *      scaling of the target node. Default: true. Useful when widgets have to match the dimensions of the
     *      target node.  
     * 
     *  Most probably the target is not the group, that will be modified, but it's parent group, 
     *  i.e. the group where the widget will be attached. Thus, an additional constraint for 
     *  the target's parent node can be defined by calling Widget.setConstraint(). 
     *
     *  IMPORTANT: the target's corresponding transform node (for a group: the attached
     *  transform node and for a mesh that of it's parent node) is modified. If the target's
     *  group node has no transform element attached one is created.
     *  If the _target's parent node is not a group node an exception is thrown.
     */
    initialize: function(_id, _target, _autoScaleAdj)
    {        
        if(_target.object.parentNode.tagName !== "group")
            throw "XMOT.interaction.widgets.Widget initialization:"
                + "target's parent node must be a group.";
        
        this.callSuper();
        
        this.xml3d = XMOT.util.getXml3dRoot(_target.object);
        this.ID = _id;  
        this.target = _target; 

        // root: the container node whose transform a widget modifies.
        var rootGrp = this.target.object.parentNode;
        this.root = XMOT.ClientMotionFactory.createTransformable(rootGrp); 
        
        this.geo = new XMOT.util.GeoObject(this.ID, this.xml3d, rootGrp); 
        this.behavior = {}; // localID -> behavior, storage for all sensors and alike
        
        /** @private */ 
        this._autoScaleAdj = (_autoScaleAdj !== undefined) ? _autoScaleAdj : true; 
        
        this._isAttached = false; 
        this.attach(); 
    },
    
    /** @this{XMOT.interaction.widgets.Widget} */
    attach: function()
    {
        if(!this._isAttached)
        {
            this._createGeometry();
            this._createBehavior();

            this._isAttached = true;
        }
    },

    /** @this{XMOT.interaction.widgets.Widget} */
    detach: function()
    {
        if(this._isAttached)
        {
            this._destroyBehavior();
            this._destroyGeometry();

            this._isAttached = false;
        }
    },
    
    /** Returns true if any object in the behavior is active. That means 
     *  it has a method isActive and that method returns true. 
     * 
     *  @this{XMOT.interaction.widgets.Widget}
     *  
     *  @return {boolean}
     */
    isActive: function()
    {
        if(!this._isAttached)
            return false; 
        
        for(var i in this.behavior)
        {
            if(this.behavior[i].isActive
            && this.behavior[i].isActive())
                return true; 
        }
        
        return false; 
    }, 
    
    /** Set the given constraint in the root movable. That is the parent node's movable 
     *  of the target movable given in the constructor. 
     * 
     *  @this{XMOT.interaction.widgets.Widget}
     *  
     *  @param {XMOT.Constraint} newConstraint
     */
    setConstraint: function(newConstraint)
    {
        this.root.setConstraint(newConstraint); 
    }, 
    
    // --- Methods to be overriden --- 
    /** Called when transformation of target node changes
     * 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @protected
     */
    onTargetXfmChanged: function() {},  
    
    /** Called when the geo's defs elements should be filled. This is after 
     *  the widget's setup, i.e. a transform called "t_root" will be available already. 
     *  
     *  @this{XMOT.interaction.widgets.Widget}
     *  @protected
     */  
    onCreateDefsElements: function() {}, 
    /** Called when the geo's graph section should be filled. This is after 
     *  the widget's setup, i.e. the graph root is already present and elements should 
     *  be appended to that root. 
     * 
     *  The size of the target node is already incorporated, so the graph elements can 
     *  take a unit size. This is why the widget handles the root element.
     *  
     *  @this{XMOT.interaction.widgets.Widget}
     *  @protected 
     */ 
    onCreateGraph: function() {}, 
    /** Called after defs and groups are attached and the behavior can be set up. This 
     *  is done afterwards a TransformTracker is placed in behavior["target_track"] which 
     *  will invoke the onTarXfmChanged() method, so that clients have a place to adjust 
     *  to transformation changes. 
     *  
     *  @this{XMOT.interaction.widgets.Widget}
     *  @protected
     */ 
    onCreateBehavior: function() {}, 
    /** Called before geo's stuff is destroyed. 
     *  
     *  @this{XMOT.interaction.widgets.Widget}
     *  @protected
     */
    onDestroyGeometry: function() {}, 
    /** Called before geometry is destroyed and where the sensor attribute is still filled. 
     *  
     *  @this{XMOT.interaction.widgets.Widget}
     *  @protected
     */ 
    onDestroyBehavior: function() {}, 
   
    // --- Global ID stuff --- 
    /** all IDs are prefixed with the widget's ID. This function 
     *  encapsulates the creation of such "global" IDs. 
     * 
     *  @this{XMOT.interaction.widgets.Widget}
     *  
     *  @param localID
     *  @return {string} the ID prefixed with the widget's ID 
     */
    globalID: function(localID)
    {
        return this.ID + "_" + localID; 
    },
    
    /** Returns the element corresponding to the global if of the given 
     *  local id. 
     *  
     *  @this{XMOT.interaction.widgets.Widget}
     *  
     *  @param {string} localID
     *  @return {Element} 
     */
    element: function(localID)
    {
        return document.getElementById(this.globalID(localID)); 
    }, 

    // ========================================================================
    // --- Private --- 
    // ========================================================================
    /** 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @private 
     */
    _createGeometry: function()
    {        
        this._createDefsElements();     // own setup 
        this.onCreateDefsElements();    // client's setup 
        this.geo.attachDefs();          // attach 'em 

        this._createGraph();    
        this.onCreateGraph();  
        this.geo.attachGraph(); 
        
        this._onTargetXfmChanged(); 
    },

    /** 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @private 
     */
    _createBehavior: function() 
    {
        this.behavior["target_track"] = new XMOT.TransformTracker(this.target.object);
        this.behavior["target_track"].xfmChanged = this.callback("_onTargetXfmChanged");
        
        this.onCreateBehavior(); 
    }, 

    /** 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @private 
     */
    _destroyGeometry: function()
    {
        this.onDestroyGeometry(); 
        this.geo.destroy(); 
    },

    /** 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @private 
     */
    _destroyBehavior: function()
    {
        this.onDestroyBehavior(); 
        for(var s in this.behavior)
        {
            if(this.behavior[s].detach)
                this.behavior[s].detach();
        }

        this.behavior = {};
    },

    /** 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @private 
     */
    _onTargetXfmChanged: function() 
    {
        this.onTargetXfmChanged(); 
    },

    /** 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @private 
     */
    _createDefsElements: function()
    {
        var targetXfm = this.target.transform;
        var tarBBox = this.target.object.getBoundingBox(); 

        // translation: offset of target's bbox 
        var translation = new window.XML3DVec3(tarBBox.center()); 

        // scale: little big bigger than target's bbox size 
        var scale = new window.XML3DVec3(1,1,1);         
        if(this._autoScaleAdj)
        {            
            var tarBBoxSize = tarBBox.size();
            scale = tarBBoxSize.multiply(new window.XML3DVec3(0.55, 0.55, 0.55));
        }

        // root
        this.geo.addTransforms("t_root", {
            translation: translation.str(), 
            scale: scale.str(), 
            rotation: targetXfm.rotation.str()
        }); 
    }, 

    /** 
     *  @this{XMOT.interaction.widgets.Widget}
     *  @private 
     */
    _createGraph: function()
    {
        this.geo.setGraphRoot(XMOT.creation.element("group", {
            id: this.globalID("g_root"),
            transform: "#" + this.globalID("t_root")
        })); 
    }
}); 

XMOT.namespace("XMOT.interaction.widgets"); 

/**
 * Encapsulates the XML3D.interaction.behaviors.RingMenu behavior
 * into a widget that contains arrows for stepping through the items.
 * 
 * @extends XMOT.interaction.widgets.Widget
 */
XMOT.interaction.widgets.RingMenu = new XMOT.Class(
    XMOT.interaction.widgets.Widget, {

    /** Setup the ring menu and attach it to the target group.
     * 
     *  @this {XMOT.interaction.widgets.RingMenu} 
     *  
     *  @param {!Object} _xml3d
     *  @param {string} _id
     *  @param {!Object} _targetGrp
     *  @param {number} _radius
     */
    initialize: function(_id, _targetGrp, _radius)
    {
        /** @private */
        this._radius = _radius; 
        
        // initialization with targetGrp's children        
        var tarXfm = XMOT.ClientMotionFactory.createTransformable(_targetGrp);        
        this.callSuper(_id, tarXfm, false); 
    },

    /** @this {XMOT.interaction.widgets.RingMenu} */
    stepLeft: function()
    {
        this.behavior["ringmenu"].stepLeft();
    },

    /** @this {XMOT.interaction.widgets.RingMenu} */
    stepRight: function()
    {
        this.behavior["ringmenu"].stepRight();
    },

    /** @this {XMOT.interaction.widgets.RingMenu} */
    step: function(numStepsLeft)
    {
        this.behavior["ringmenu"].step(numStepsLeft);
    },

    /** 
     *  @this{XMOT.interaction.widgets.RingMenu}
     *  @override
     *  @protected
     */
    onCreateDefsElements: function()
    {
        // shaders
        this.geo.addShaders("s_choose", {diffCol: "0.9 0 0"});
        this.geo.addShaders("s_chooseHigh", {diffCol: "0 0.9 0"});  

        // transforms
        var menuBBox = XMOT.util.getChildrenBBox(this.target.object);

        var transly = menuBBox.min.y -1 ;
        var translz = menuBBox.max.z;
        
        this.geo.addTransforms("t_chooseLeft", {
            translation: -2 + " " + transly + " " + translz, 
            rotation: "0 1 0 -1.57",
            scale: "1.3 1.3 1.3"
        }); 
        
        this.geo.addTransforms("t_chooseRight", {
            translation: 2 + " " + transly + " " + translz, 
            rotation: "0 1 0 1.57",
            scale: "1.3 1.3 1.3"
        }); 
    }, 

    /** 
     *  @this{XMOT.interaction.widgets.RingMenu}
     *  @override
     *  @protected
     */
    onCreateGraph: function()
    {        
        this._geoChooseLeft = XMOT.creation.element("group", {
            id: this.globalID("chooseleft"), 
            transform: "#" + this.geo.defs["t_chooseLeft"].id,
            shader: "#" + this.geo.defs["s_choose"].id, 
            children: [this._createArrowGroup()]
        });
        
        this._geoChooseRight = XMOT.creation.element("group", {
            id: this.globalID("chooseright"), 
            transform: "#" + this.geo.defs["t_chooseRight"].id,
            shader: "#" + this.geo.defs["s_choose"].id, 
            children: [this._createArrowGroup()]
        });       
        
        this.geo.addToGraphRoot(this._geoChooseLeft); 
        this.geo.addToGraphRoot(this._geoChooseRight); 
    }, 

    /** 
     *  @this{XMOT.interaction.widgets.RingMenu}
     *  @override
     *  @protected
     */
    onCreateBehavior: function() 
    {                
        var beh = new XMOT.interaction.behaviors.RingMenu(
            this.globalID("behavior"), 
            this.target.object, this._radius
        );        

        this._toggleChooserListeners(true);
        
        beh.attach(); 
        this.behavior["ringmenu"] = beh; 
    }, 

    // ========================================================================
    // --- Private ---
    // ========================================================================

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     *  
     *  @param {boolean} doAttach whether to attach or detach 
     */
    _toggleChooserListeners: function(doAttach)
    {
        var dFn = null; 
        var eFn = null; 
        
        if(doAttach)
        {
            dFn = document.addEventListener; 
            eFn = Element.prototype.addEventListener;
        }
        else
        {
            dFn = document.removeEventListener; 
            eFn = Element.prototype.removeEventListener;            
        }
        
        dFn.call(document, "keyup", 
            this.callback("_onKeyUp"), false);

        // left-arrow focusing
        eFn.call(this._geoChooseLeft, "click", 
            this.callback("stepLeft"), false);
        eFn.call(this._geoChooseLeft, "mouseover", 
                this.callback("_focusLeftArrow"), false);
        eFn.call(this._geoChooseLeft, "mouseout", 
                this.callback("_defocusLeftArrow"), false);    

        // right-arrow focusing
        eFn.call(this._geoChooseRight, "click", 
            this.callback("stepRight"), false);
        eFn.call(this._geoChooseRight, "mouseover", 
                this.callback("_focusRightArrow"), false);
        eFn.call(this._geoChooseRight, "mouseout", 
            this.callback("_defocusRightArrow"), false);
            
    }, 

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     */
    _focusLeftArrow: function() 
    {
        this._focusArrow(this._geoChooseLeft); 
    }, 

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     */
    _defocusLeftArrow: function()
    {
        this._focusArrow(this._geoChooseLeft, true);
    },

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     */
    _focusRightArrow: function() 
    {
        this._focusArrow(this._geoChooseRight); 
    }, 

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     */
    _defocusRightArrow: function()
    {
        this._focusArrow(this._geoChooseRight, true);
    },

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     */
    _focusArrow: function(arr, disableFocus)
    {
        if(disableFocus)
            XMOT.util.shader(arr, this.geo.defs["s_choose"]);
        else
            XMOT.util.shader(arr, this.geo.defs["s_chooseHigh"]);
    },

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     */
    _onKeyUp: function(evt)
    {
        switch(evt.which)
        {
        case 37: // left cursor key
            this.stepLeft();
            break;

        case 39: // right cursor key
            this.stepRight();
            break;
        }
    },

    // --------------------------------
    // -- Creation Helpers --
    // --------------------------------

    /** 
     *  @this {XMOT.interaction.widgets.RingMenu}
     *  @private 
     */
    _createArrowGroup: function()
    {
        var mesh = XMOT.creation.element("mesh", {src: "#d_arrow"});
        
        var grp = XMOT.creation.element("group", {transform: "#t_arrow"});        
        grp.appendChild(mesh); 
        
        return grp; 
    }
});

XMOT.namespace("XMOT.interaction.widgets"); 

/** 
 * The SingleAxisRotator class places thin rotation bars along one of the major axes 
 * to enable easy, axis-constrained rotation of a target object. 
 * 
 * As the name suggests, this rotator will place handles to do rotation around the local 
 * y-axis. For other axes simply place it under a group that rotates the widget geometry 
 * to the proper axis 
 * 
 * @extends XMOT.interaction.widgets.Widget
 */
XMOT.interaction.widgets.SingleAxisRotator = new XMOT.Class(
    XMOT.interaction.widgets.Widget, {
     
    /** Initializes the AxisRotator.
     *  
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  
     *  @param {string} _id 
     *  @param {!Element} _target
     *  @param {Object} [_opts] options for the rotator 
     *  
     *  The following options are supported: 
     *  	o axis: the axis for rotation. "x", "y" or "z". Defaults to "y".
     *  	o color: the diffuse color of the shader for the axis bars 
     *  	o highlightColor: the diffuse color of the shader for the highlighting of the axis bars
     */
    initialize: function(_id, _target, _opts)
    {        
    	if(!_opts)
    		_opts = {}; 
    	
        /** @private */ 
        this._rotationAxis = "y";         
        if(_opts.axis)
        {
            if(typeof _opts.axis !== "string" 
            ||(_opts.axis != "x" && _opts.axis != "y" && _opts.axis != "z"))
                throw "XMOT.interaction.widgets.AxisRotator: invalid axis specified: " + _opts.axis; 
            
            this._rotationAxis = _opts.axis; 
        } 
        
        /** @private */ 
        this._color = "0.9 0.9 0.9";
        if(_opts.color)
        	this._color = _opts.color; 
        
        /** @private */  
        this._highlightColor = "0.9 0.9 0";
        if(_opts.highlightColor)
        	this._highlightColor = _opts.highlightColor; 
        
        this.callSuper(_id, _target); 
    },

    /** Set and/or retrieve the axis restriction. 
     *  See XMOT.interaction.behaviors.Rotater.axisRestriction(). 
     *  
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  
     * 	@param {string} [axis]
     * 	@return {string}
     */
    axisRestriction: function(axis)
    {        
        return this.behavior["rot"].axisRestriction(axis); 
    },

    /** Set or retrieve the status of rotation flipping. 
     *  See XMOT.interaction.behaviors.Rotater.flipRotation(). 
     *  
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  
     *  @param {boolean} [flip] 
     *  @return {boolean} 
     */
    flipRotation: function(flip)
    {
    	return this.behavior["rot"].flipRotation(flip); 
    },

    // --------------------------------
    // -- Widget callbacks --
    // --------------------------------
    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @override
     *  @protected 
     */
    onTargetXfmChanged: function()
    {
        // variables
        var targetInvScale = XMOT.math.vecInverseScale(
            this.target.object.getWorldMatrix().scale().scale(1.15));

        var handleFac = 0.05; // scaling of handles (are 1x1x1 boxes, so scale them down)

        var handle_scale = targetInvScale.scale(handleFac);

        // rotation handles
        var handleScaleStr = handle_scale.x + " 1 " + handle_scale.z;
        this.geo.updateTransforms([
            "t_rot_1", "t_rot_2", "t_rot_3", "t_rot_4"
        ], {scale: handleScaleStr});
    },

    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @override
     *  @protected 
     */
    onCreateDefsElements: function()
    {
        // shaders
        this.geo.addShaders("s_rot_root", {diffCol: this._color, ambInt: 0.8});        
        this.geo.addShaders("s_rot_root_highlight", {diffCol: this._highlightColor, ambInt: 0.8}); 
        
        // transforms
        this.geo.addTransforms("t_rot_1", {translation: "1 0 1"});
        this.geo.addTransforms("t_rot_2", {translation: "-1 0 1"});
        this.geo.addTransforms("t_rot_3", {translation: "1 0 -1"});
        this.geo.addTransforms("t_rot_4", {translation: "-1 0 -1"});

        // roots for rotation handles
        var opts = {}; 
        if(this._rotationAxis == "x")
            opts.rotation = "0 0 1 1.57"; 
        else if(this._rotationAxis == "z")
            opts.rotation = "1 0 0 1.57"; 
        
        this.geo.addTransforms("t_rot_root", opts);
    },

    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @override
     *  @protected 
     */
    onCreateGraph: function()
    {
        var yrot = XMOT.creation.element("group", {
            id: this.globalID("rot_root"),
            shader: "#" + this.globalID("s_rot_root"),
            transform: "#" + this.globalID("t_rot_root"), 
            children: [
                this._createBoxGrp("rot_1"),
                this._createBoxGrp("rot_2"),
                this._createBoxGrp("rot_3"),
                this._createBoxGrp("rot_4")
            ]
        });
        
        this.geo.addToGraphRoot(yrot); 
    },

    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @override
     *  @protected 
     */
    onCreateBehavior: function()
    {
        // rotation handles
        this.behavior["rot"] = this._createRotSensor("rotSensor", "rot_root");
        this.behavior["rot"].axisRestriction(this._rotationAxis); 

        // setup listeners
        this.behavior["rot"].addListener("dragstart", this.callback("_activateHandles"));
        this.behavior["rot"].addListener("dragend", this.callback("_deactivateHandles"));
    },
    // --------------------------------
    // -- Behavior --
    // --------------------------------

    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @private 
     */
    _activateHandles: function()
    {
        var grp = this.element("rot_root");
        var sh = this.element("s_rot_root_highlight"); 
        
        XMOT.util.shader(grp, sh); 
    },

    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @private 
     */
    _deactivateHandles: function()
    {
        var grp = this.element("rot_root");
        var sh = this.element("s_rot_root"); 
        
        XMOT.util.shader(grp, sh); 
    },

    // --------------------------------
    // -- creation helpers --
    // --------------------------------
    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @private
     *  
     *  @param {string} localID  
     */
    _createBoxGrp: function(localID)
    {
        var opts = {};
        
        opts.id = this.globalID(localID);
        opts.transform = "#" + this.globalID("t_" + localID);
        opts.children = [XMOT.creation.box(this.xml3d)];
         
        return XMOT.creation.element("group", opts);
    },

    /** 
     *  @this {XMOT.interaction.widgets.SingleAxisRotator} 
     *  @private
     * 
     *  @param {string} localID the id of the sensor 
     *  @param {string} localPickGrpID the id of the target picking group.
     *   
     *  @return {XMOT.interaction.behaviors.Rotater} 
     */
    _createRotSensor: function(localID, localPickGrpID)
    {
        var pickGrp = document.getElementById(this.globalID(localPickGrpID));
        
        return new XMOT.interaction.behaviors.Rotater(
            this.globalID(localID), [pickGrp], this.root);
    }
});

XMOT.namespace("XMOT.interaction.widgets"); 

/** 
 * The TranslateBox places a semi-transparent cube around the target object. By
 * dragging the sides of that cube the target geometry gets translated along the 
 * dragged plane. 
 * 
 * @extends XMOT.interaction.widgets.Widget
 */
XMOT.interaction.widgets.TranslateBox = new XMOT.Class(
    XMOT.interaction.widgets.Widget, {
    
    /** 
     *  @inheritDoc 
     *  @this {XMOT.interaction.widgets.TranslateBox}
     */
    initialize: function(_id, _target)
    {        
        this.callSuper(_id, _target); 
       
        this.addListenerTypes([
           "dragstart", "dragend", "touch"// args: (this, sensor, original event)   
        ]); 
    }, 

    /** 
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @override
     *  @protected
     */
    onTargetXfmChanged: function()
    {
        var rectFac = 0.93; // scale of rectangles (same, 1x1 rects)

        var rectScaleStr = rectFac + " " + rectFac + " " + rectFac;
        
        this.geo.updateTransforms([
            "t_xytrans", "t_xytrans_inv", "t_yztrans", "t_yztrans_inv",
            "t_xztrans", "t_xztrans_inv"
        ], {scale: rectScaleStr});
    },

    // --------------------------------
    // -- Creation --
    // --------------------------------

    /** 
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @override
     *  @protected
     */
    onCreateDefsElements: function()
    {
        // shaders
        this.geo.addShaders("s_transl", {
            diffCol: "1 1 1", transp: "0.85"
        });
        this.geo.addShaders("s_transl_highlight", {
            diffCol: "1 1 1", transp: "0.4"
        });        
        
        // transforms        
        this.geo.addTransforms("t_xytrans", {
            translation: "0 0 1"}); 
        this.geo.addTransforms("t_xytrans_inv", {
            translation: "0 0 -1", rotation: "0 1 0 3.14"});
        this.geo.addTransforms("t_yztrans", {
            translation: "1 0 0", rotation: "0 1 0 1.57"});
        this.geo.addTransforms("t_yztrans_inv", {
            translation: "-1 0 0", rotation: "0 1 0 -1.57"});
        this.geo.addTransforms("t_xztrans", {
            translation: "0 1 0", rotation: "1 0 0 -1.57"});
        this.geo.addTransforms("t_xztrans_inv", {
            translation: "0 -1 0", rotation: "1 0 0 1.57"});
    },

    /** 
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @override
     *  @protected
     */
    onCreateGraph: function()
    {
        this.geo.addToGraphRoot([
             this._createRectGrp("xytrans"), 
             this._createRectGrp("yztrans"), 
             this._createRectGrp("xztrans"), 
             this._createRectGrp("xytrans_inv"), 
             this._createRectGrp("yztrans_inv"), 
             this._createRectGrp("xztrans_inv")
        ]); 
    },

    /** 
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @override
     *  @protected
     */
    onCreateBehavior: function()
    {       
        this._addTransSensor("xytrans");
        this._addTransSensor("xytrans_inv"); 
        this._addTransSensor("yztrans"); 
        this._addTransSensor("yztrans_inv"); 
        this._addTransSensor("xztrans"); 
        this._addTransSensor("xztrans_inv"); 
    },

    // --------------------------------
    // -- Behavior --
    // --------------------------------
    /** Highlights the active plane by modifying the shader under the id localShaderID  
     * 
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @private 
     * 
     *  @param {XMOT.interaction.behaviors.PDSensor} sensor
     *  @param {MouseEvent} ev
     */
    _onDragStart: function(sensor, ev)
    {
        XMOT.util.shader(sensor.pickGroups[0], 
            this.geo.defs["s_transl_highlight"]); 
        
        this.notifyListeners("dragstart", this, sensor, ev); 
    },
    
    /** Removes the highlight of the active plane .
     * 
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @private 
     * 
     *  @param {XMOT.interaction.behaviors.PDSensor} sensor
     *  @param {MouseEvent} ev 
     */
    _onDragEnd: function(sensor, ev)
    {
        XMOT.util.shader(sensor.pickGroups[0], 
            this.geo.defs["s_transl"]); 
        
        this.notifyListeners("dragend", this, sensor, ev);
    },
    
    /**
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @private 
     * 
     *  @param {XMOT.interaction.behaviors.PDSensor} sensor
     *  @param {MouseEvent} ev
     */
    _onTouch: function(sensor, ev)
    {
        this.notifyListeners("touch", this, sensor, ev); 
    }, 
    
    // --------------------------------
    // -- helpers --
    // --------------------------------
    /**
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @private
     *  
     *  @param {string} localID
     */
    _addTransSensor: function(localID)
    {
        // create sensor
        var pickGrp = this.element(localID);        
        var id = this.globalID(localID + "Sensor");

        this.behavior[localID] = new XMOT.interaction.behaviors.Translater(
            id, [pickGrp], this.root, pickGrp);
        
        // attach listeners
        var self = this;

        this.behavior[localID].addListener("dragstart", function(sensor, ev){self._onDragStart(sensor, ev);});
        this.behavior[localID].addListener("dragend", function(sensor, ev){self._onDragEnd(sensor, ev);});
        this.behavior[localID].addListener("touch", this.callback("_onTouch")); 
    }, 
    
    /**
     *  @this {XMOT.interaction.widgets.TranslateBox}
     *  @private
     *  
     *  @param {string} localID
     */
    _createRectGrp: function(localID)
    {
        var rect = XMOT.creation.rectangle(this.xml3d);

        var opts = {
            id: this.globalID(localID),
            transform: "#" + this.globalID("t_" + localID), 
            shader: "#" + this.globalID("s_transl"), 
            children: [rect]
        }; 
        
        return XMOT.creation.element("group", opts);
    }
});

XMOT.namespace("XMOT.interaction.widgets"); 

/** 
 * The UniformScaler widget will attach interactive cubes at the edges of the bounding box 
 * of the target node. If the cubes are dragged uniform scaling is performed on the target node. 
 * 
 * @extends XMOT.interaction.widgets.Widget
 */
XMOT.interaction.widgets.UniformScaler = new XMOT.Class(
    XMOT.interaction.widgets.Widget, {
        
    /** 
     *  @this{XMOT.interaction.widgets.UniformScaler}
     *  @override
     *  @protected
     */
    onTargetXfmChanged: function()
    {
        var targetInvScale = XMOT.math.vecInverseScale(
            this.target.object.getWorldMatrix().scale().scale(1.15));

        var cubeFac = 0.1; // scaling of cubes (also here those boxes)
        var cube_scale = targetInvScale.scale(cubeFac);

        var cubeScaleStr = cube_scale.x + " " + cube_scale.y + " " + cube_scale.z;
        this.geo.updateTransforms([
            "t_cube_frontleft", "t_cube_frontright", "t_cube_backleft", "t_cube_backright"
        ], {scale: cubeScaleStr});
    },
    
    /** 
     *  @this{XMOT.interaction.widgets.UniformScaler}
     *  @override
     *  @protected
     */
    onCreateDefsElements: function()
    {
        // shaders
        this.geo.addShaders("s_scale", {diffCol: "0.9 0.9 0.9"});
        this.geo.addShaders("s_scale_highlight", {diffCol: "0.9 0.9 0"});
        
        // cubes
        this.geo.addTransforms("t_scale");
        this.geo.addTransforms("t_top_cubes", {translation: "0 1 0"});
        this.geo.addTransforms("t_bot_cubes", {translation: "0 -1 0"});

        this.geo.addTransforms("t_cube_frontleft", {translation: "-1 0 1"});
        this.geo.addTransforms("t_cube_frontright", {translation: "1 0 1"});
        this.geo.addTransforms("t_cube_backleft", {translation: "-1 0 -1"});
        this.geo.addTransforms("t_cube_backright", {translation: "1 0 -1"});
    },
    
    /** 
     *  @this{XMOT.interaction.widgets.UniformScaler}
     *  @override
     *  @protected
     */
    onCreateGraph: function()
    {
        var top = XMOT.creation.element("group", {
            transform: "#" + this.globalID("t_top_cubes"),
            children: [
                this._createBoxGrp("t_cube_frontleft"),
                this._createBoxGrp("t_cube_frontright"), 
                this._createBoxGrp("t_cube_backleft"),
                this._createBoxGrp("t_cube_backright")
            ]
        });

        var bot = XMOT.creation.element("group", {
            transform: "#" + this.globalID("t_bot_cubes"),
            children: [
                this._createBoxGrp("t_cube_frontleft"),
                this._createBoxGrp("t_cube_frontright"),
                this._createBoxGrp("t_cube_backleft"), 
                this._createBoxGrp("t_cube_backright")
            ]
        });

        var cubes = XMOT.creation.element("group", {
            id: this.globalID("scale"),
            transform: "#" + this.globalID("t_scale"),
            shader: "#" + this.globalID("s_scale"), 
            children: [top, bot]
        });

        this.geo.addToGraphRoot(cubes); 
    },
    
    /** 
     *  @this{XMOT.interaction.widgets.UniformScaler}
     *  @override
     *  @protected
     */
    onCreateBehavior: function()
    {        
        var scalehandle = document.getElementById(this.globalID("scale"));

        this.behavior["scale"] = new XMOT.interaction.behaviors.Scaler(
            this.globalID("scaleSensor"), [scalehandle], this.root, true);

        // setup listeners
        this.behavior["scale"].addListener("dragstart", this.callback("_activateHandles"));        
        this.behavior["scale"].addListener("dragend", this.callback("_deactivateHandles"));
    },

    // --------------------------------
    // -- Behavior --
    // --------------------------------

    /** 
     *  @this{XMOT.interaction.widgets.UniformScaler}
     *  @private 
     */
    _activateHandles: function()
    {        
        XMOT.util.shader(this.element("scale"), 
                         this.element("s_scale_highlight"));
    },

    /** 
     *  @this{XMOT.interaction.widgets.UniformScaler}
     *  @private 
     */
    _deactivateHandles: function()
    {        
        XMOT.util.shader(this.element("scale"), 
                         this.element("s_scale"));
    },

    // --------------------------------
    // -- DOM helpers --
    // --------------------------------
    /** 
     *  @this{XMOT.interaction.widgets.UniformScaler}
     *  @private
     *   
     *  @param {string} localTransformID id of the transform element the created group will refer to
     */
    _createBoxGrp: function(localTransformID)
    {
        var box = XMOT.creation.box(this.xml3d);

        var opts = {};

        opts.transform = "#" + this.globalID(localTransformID);
        opts.children = [box];
         
        var grp = XMOT.creation.element("group", opts);

        return grp;
    }
});

XMOT.namespace("XMOT.interaction.widgets"); 

/** 
 * A TransformBox uses the TranslaterBox, Scaler and SingleAxisRotator to set up a 
 * composed widget, that can be translated, rotated and scaled. 
 * 
 * @extends XMOT.interaction.widgets.Widget
 */
XMOT.interaction.widgets.TransformBox = new XMOT.Class(
    XMOT.interaction.widgets.Widget, {
 
    /** Setup axis-flip options and initialize the base class. 
     * 
     * @param {string} _id
     * @param {XMOT.Transformable} _target
     * @param {{x: boolean, y: boolean, z: boolean}=} rotationFlipOpts whether to flip the rotation around the given local axis.
     * 												  rotationFlipOpts attributes and and the parameter itself is optional. 
     */
	initialize: function(_id, _target, rotationFlipOpts)
	{
		this._flipRotAxes = {x: false, y: false, z: false}; 
		
		if(rotationFlipOpts)
		{
			this._flipRotAxes.x = rotationFlipOpts.x;
			this._flipRotAxes.y = rotationFlipOpts.y; 
			this._flipRotAxes.z = rotationFlipOpts.z;			
		} 
		
		this.callSuper(_id, _target); 
	}, 

    /** 
     *  @this {XMOT.interaction.widgets.TransformBox}
     *  @override
     *  @protected 
     */
    onCreateBehavior: function()
    {        
        // translation 
        this.behavior["translbox"] = new XMOT.interaction.widgets.TranslateBox(
            this.ID + "_translbox", this.target);
        
        // scaling
        this.behavior["scaler"] = new XMOT.interaction.widgets.UniformScaler(
            this.ID + "_scaler", this.target); 
        
        // rotation
        // options objects for the SingleAxisRotator
        var axes = [ 
        	{axis: "x", color: "0.7 0 0", highlightColor: "0.9 0 0"},
        	{axis: "y", color: "0 0.7 0", highlightColor: "0 0.9 0"},
        	{axis: "z", color: "0 0 0.7", highlightColor: "0 0 0.9"}
        ]; 
        	
        for(var i = 0; i < axes.length; i++)
        {
            var ax = axes[i].axis;
            var id = ax + "rot"; 
            
            this.behavior[id] = new XMOT.interaction.widgets.SingleAxisRotator(
                this.ID + "_" + id, this.target, axes[i]
            );   
            
            this.behavior[id].flipRotation(this._flipRotAxes[ax]);            	 
        }
    }
});

XMOT.namespace("XMOT.interaction.widgets"); 

/**
 * A RotatorBox is composed of an invisible box that lets you translate the target object
 * along the box side's planes. If you hold the mouse button down on that box' sides
 * a translation plane pops up. You can then translate the object along that plane.
 *
 * If you click on the side of that box arrows for rotation popup,
 * with which you can rotate the target in 90 degree-steps.
 * 
 * @extends XMOT.interaction.widgets.Widget
 */
XMOT.interaction.widgets.RotatorBox = new XMOT.Class(
    XMOT.interaction.widgets.Widget, {

    /** Creates the geometry and behavior for the XMOT.interaction.widgets.RotatorBox and attaches it to
     *  the _target node, i.e. adding it to the _target's parent node children.
     *
     *  @this {XMOT.interaction.widgets.RotatorBox}
     *   
     *  @param {string} _id the id if this XMOT.interaction.widgets.TransformBox and also the id of the corresponding root group node
     *  @param {XMOT.Transformable} _target
     *  @param {number} [_arrowScaleFac] scales the arrows with the given factor. Default: 1
     *
     *  IMPORTANT: If the target's parent group node has no transform element attached,
     *  one is created. If the _target's parent node is not a group node an exception is thrown.
     */
    initialize: function(_id, _target, _arrowScaleFac)
    {    
        /** @private */ 
        this._arrowScaleFactor = 1;
        if(_arrowScaleFac)
            this._arrowScaleFactor = _arrowScaleFac;

        // -- Rotation Arrows Variables --
        /** the translation plane group at which the currently active rotation interface
         *  is attached.
         *  @private
         */
        this._activeRotFace = null;
        /** all arrow geometry groups. Maps name to DOM element. Valid keys are
         *  "root", "left", "bot", "right", "top"
         *  @private 
         */
        this._arrows = {};
        
        this.callSuper(_id, _target); 
    },

    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @override
     *  @protected 
     */
    onCreateDefsElements: function()
    {
        this._createGeoDefsShaders();
        this._createGeoDefsTransforms();
        this._createGeoDefsDatas();
    },

    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @override
     *  @protected 
     */
    onCreateGraph: function()
    {
        // arrows
        this._arrows = {}; 
        
        this._addArrowGroup("left");
        this._addArrowGroup("bot");
        this._addArrowGroup("right");
        this._addArrowGroup("top");

        this._arrows["root"] = XMOT.creation.element("group", {
            id: this.globalID("arrow_root"), 
            transform: "#" + this.globalID("t_arrow_root"), 
            children: [
                 this._arrows["left"], 
                 this._arrows["bot"], 
                 this._arrows["right"], 
                 this._arrows["top"]
            ]
        }); 
    },

    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @override
     *  @protected 
     */
    onCreateBehavior: function()
    {
        // translation handles
        this.behavior["transbox"] = new XMOT.interaction.widgets.TranslateBox(
            this.globalID("transbox"), this.target
        ); 
        
        this.behavior["transbox"].addListener("touch", this.callback("_handleTransTouch"));
    },

    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @override
     *  @protected 
     */
    onDestroyGeometry: function()
    {
        this._deactivateArrow(); 
        this._arrows = null; 
    },

    // ========================================================================
    // --- Private ---
    // ========================================================================
    
    // --- Behavior Callbacks ---

    /** Activate/deactive the arrow geometry. Callback from 
     *  XMOT.interaction.widgets.TranslateBox. 
     *  
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @private
     *  
     *  @param {XMOT.interaction.widgets.TranslateBox} translbox
     *  @param {XMOT.interaction.behaviors.PDSensor} sensor the underlying sensor that caused the touch
     *  @param {MouseEvent} evt the original mouse event that raised the event 
     */ 
    _handleTransTouch: function(translbox, sensor, evt)
    {
        // only popup on "bare" touches
        if(!evt.ctrlKey && !evt.altKey && !evt.shiftKey && !evt.metaKey)
        {
            if(!this._arrows["root"] || !sensor.pickGroups[0])
                return;
            
            // hit arrow, do nothing
            if(this._isArrowMesh(sensor.curHitElement))
                return; 

            if(this._activeRotFace)
            {
                // remove rotation interface from that face
                var oldFace = this._deactivateArrow();

                // if a touch occured on a already selected face
                // only deselect it, i.e. just return now
                if(oldFace == sensor.pickGroups[0])
                    return;
            }

            this._activateArrow(sensor.pickGroups[0]);
        }
    },

    /** Place the arrow geometry under the given target group and setup callbacks. 
     * 
     *  @this {XMOT.interaction.widgets.RotatorBox}
     *  @private
     *  
     *  @param {!Object} target
     */
    _activateArrow: function(target)
    {
        var globMat = target.getWorldMatrix();
 
        target.appendChild(this._arrows["root"]);
        this._activeRotFace = target;

        // calculate inverse scale of target's global matrix
        var invScale = XMOT.math.vecInverseScale(globMat.scale());
        var tArrowRoot = XMOT.util.transform(this._arrows["root"]); 
        tArrowRoot.setAttribute("scale", invScale.str());

        // arrows
        this._arrows["left"].addEventListener("click", 
            this.callback("_onRotateLeft"), false);
        this._arrows["right"].addEventListener("click", 
            this.callback("_onRotateRight"), false);
        this._arrows["top"].addEventListener("click", 
            this.callback("_onRotateUp"), false);
        this._arrows["bot"].addEventListener("click", 
            this.callback("_onRotateDown"), false);
    },

    /** Remove the arrow geometry under the given target group. 
     * 
     *  @this {XMOT.interaction.widgets.RotatorBox}
     *  @private
     */
    _deactivateArrow: function()
    {
        var oldFace = this._activeRotFace;

        if(this._arrows["root"].parentNode)
            this._arrows["root"].parentNode.removeChild(this._arrows["root"]);
        this._activeRotFace = null;

        return oldFace;
    },

    /**
     *  @this {XMOT.interaction.widgets.RotatorBox}
     *  @private
     *  
     *  @param {MouseEvent} evt
     */
    _onRotateLeft: function(evt)
    {
        this._arrowRotate(new window.XML3DVec3(0, 1, 0), true);
    },

    /**
     *  @this {XMOT.interaction.widgets.RotatorBox}
     *  @private
     *  
     *  @param {MouseEvent} evt
     */
    _onRotateRight: function(evt)
    {
        this._arrowRotate(new window.XML3DVec3(0, 1, 0));
    },

    /**
     *  @this {XMOT.interaction.widgets.RotatorBox}
     *  @private
     *  
     *  @param {MouseEvent} evt
     */
    _onRotateUp: function(evt)
    {
        this._arrowRotate(new window.XML3DVec3(1, 0, 0), true);
    },

    /**
     *  @this {XMOT.interaction.widgets.RotatorBox}
     *  @private
     *  
     *  @param {MouseEvent} evt
     */
    _onRotateDown: function(evt)
    {
        this._arrowRotate(new window.XML3DVec3(1, 0, 0));
    },

    /** Perform a 90 degree rotation around the given axis 
     * 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @private
     *  
     *  @param {XML3DVec3} localAxis
     *  @param {boolean} negateDirection whether to negate the angle
     */
    _arrowRotate: function(localAxis, negateDirection)
    {
        // setup angle
        var angle = 1.57;
        if(negateDirection)
            angle = -angle;

        // we rotate the given local axis according to the local coordinate
        // the arrows are inside (i.e. on one of the translation planes)
        var xfmRot = XMOT.util.transform(this._arrows["root"].parentNode).rotation;

        // transform local rotation
        var transAxis = xfmRot.rotateVec3(localAxis);
        var transRot = new window.XML3DRotation();
        transRot.setAxisAngle(transAxis, angle);

        // now update root's rotation
        var rootXfm = this.root.transform; 
        var rootRot = rootXfm.rotation;
        var newRot = rootRot.multiply(transRot);
        
        this.root.setOrientation(newRot.getQuaternion());

        // detach the arrow's geometry
        this._deactivateArrow();
    },


    // ------------------------------------------------------------------------
    // --- Creation/Destruction ---
    // ------------------------------------------------------------------------

    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox}  
     *  @private 
     */ 
    _createGeoDefsShaders: function()
    {
        var colStr = "0.9 0.9 0.9";

        var arrowColStr = "0 0.9 0";
        var arrowHighColStr = "0 0 0.9";
        var arrowTranspStr = "0";
        var arrowAmbIntStr = "0.8";

        // root
        this.geo.addShaders("s_root", {diffCol: colStr});

        // arrows
        this.geo.addShaders("s_arrow", {
            diffCol: arrowColStr, 
            transp: arrowTranspStr, 
            ambInt: arrowAmbIntStr
        });
        this.geo.addShaders("s_arrow_highlight", {
            diffCol: arrowHighColStr, 
            transp: arrowTranspStr, 
            ambInt: arrowAmbIntStr
        });
    },

    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @private 
     */ 
    _createGeoDefsTransforms: function()
    {
        var invGlobMat = this.target.object.getWorldMatrix().inverse();
        var invScale = new window.XML3DVec3(invGlobMat.m11, invGlobMat.m22, invGlobMat.m33);

        // variables
        var arrowFac = 0.07 * this._arrowScaleFactor;
        var arrowTransOff = 0.2;

        // arrows
        var arrowScale = new window.XML3DVec3(arrowFac, arrowFac, arrowFac);
        var arrowScaleStr = arrowScale.str();

        var arrowLeftTrans = -arrowTransOff + " 0 0";
        var arrowBotTrans = "0 " + -arrowTransOff + " 0";
        var arrowRightTrans = arrowTransOff + " 0 0";
        var arrowTopTrans = "0 " + arrowTransOff + " 0";

        this.geo.addTransforms("t_arrow_root", {scale: invScale.str()});
        this.geo.addTransforms("t_arrow_left", {
            translation: arrowLeftTrans, scale: arrowScaleStr
        });
        this.geo.addTransforms("t_arrow_bot", {
            translation: arrowBotTrans, scale: arrowScaleStr, rotation: "0 0 1 1.5708"
        });
        this.geo.addTransforms("t_arrow_right", {
            translation: arrowRightTrans, scale: arrowScaleStr, rotation: "0 0 1 3.1416"
        });
        this.geo.addTransforms("t_arrow_top", {
            translation: arrowTopTrans, scale: arrowScaleStr, rotation: "0 0 1 4.7124"
        });
    },

    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @private 
     */ 
    _createGeoDefsDatas: function()
    {
        var arr = XMOT.creation.data({
            id: this.globalID("d_arrow"),
            idx: "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 42 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 60 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 8 85 86 9 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 24 116 117 118 119 120 121 122 123 29 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 36 142 143 144 145 146 39 147 148 149 150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 167 171 172 173 174 175 176 177 178 179 180 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 196 200 201 202 203 204 205 206 207 208 209 210 211 212 213 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 67 234 235 236 237 238 55 239 240 241 234 242 243 244 245 246 46 247 248 249 231 250 251 252 253 254 43 255 256 257 258 259 260 261 262 263 264 265 266 267 268 269 270 271 272 273 274 275 276 277 278 279 280 281 282 283 284 34 132 285 31 286 287 4 288 289 1 70 285 136 31 290 33 291 284 270 34 292 293 30 289 276 1 294 295 3 287 74 4 296 0 297 298 19 299 300 22 301 298 302 19 303 304 301 300 305 22 306 307 299 308 13 309 310 16 311 308 312 13 313 314 311 310 315 16 316 317 309 318 319 320 321 322 323 324 325 326 327 328 329 330 331 332 333 334 335 336 337 338 339 340 341 319 318 342 343 344 345 331 330 346 347 348 349 337 336 350 351 352 353 325 324 354 355 356 357 358 359 360 361 362 363 364 365 366 367 368 369 370 371 372 373 374 375 376 377 378 379 380 381 359 358 382 383 384 385 376 386 387 388 389 62 365 364 390 391 392 393 370 394 395 396 397 51 398 240 399 400 233 401 59 402 250 403 404 230 405 406 407 408 409 255 54 410 245 411 45 412 37 36 413 40 39 413 146 145 37 414 147 39 141 140 40 415 142 36 402 416 251 417 243 242 239 418 419 206 420 267 421 68 422 154 423 273 410 424 246 425 258 257 215 217 426 427 264 263 132 134 428 260 262 429 211 266 430 126 286 293 43 405 431 432 247 433 159 272 434 76 288 295 403 435 66 436 252 437 151 153 438 439 282 281 70 72 440 278 280 441 428 285 442 32 427 129 128 284 442 35 443 444 78 289 445 2 446 447 440 287 445 5 439 79 249 448 207 449 269 450 254 451 155 452 275 453 454 455 57 456 457 458 48 459 460 461 462 463 214 464 212 241 465 466 150 467 148 256 468 235 31 264 32 135 137 469 132 442 284 291 470 290 286 442 285 131 292 471 288 445 287 81 294 472 4 282 5 73 75 473 70 445 289 297 474 296 271 475 127 34 449 35 277 476 77 1 452 2 307 300 477 23 105 478 304 298 477 20 111 479 19 112 20 303 318 304 22 106 23 306 330 307 317 310 480 17 93 481 314 308 480 14 99 482 13 100 14 313 336 314 16 94 17 316 324 317 301 477 300 321 21 483 309 480 308 327 12 484 299 477 298 333 18 485 311 480 310 339 15 486 145 146 487 488 229 228 140 141 489 490 223 222 114 301 21 322 491 323 96 309 12 328 492 329 108 299 18 334 493 335 102 311 15 340 494 341 495 112 302 318 496 342 495 497 498 343 358 344 499 106 305 330 500 346 499 501 502 347 394 348 503 100 312 336 504 350 503 505 506 351 386 352 507 94 315 324 508 354 507 509 510 355 364 356 303 114 113 361 511 512 316 96 95 367 513 514 306 108 107 373 515 516 313 102 101 379 517 518 193 345 511 362 519 363 175 357 513 368 520 369 187 349 515 374 521 375 181 353 517 380 522 381 523 191 524 358 525 382 526 377 376 386 527 387 528 173 529 364 530 390 531 371 370 394 532 395 388 62 533 63 534 64 396 51 535 50 52 536 537 538 122 539 205 540 541 119 118 195 197 542 543 90 89 166 168 544 545 546 83 547 165 548 28 27 549 25 24 549 10 9 550 7 6 550 343 193 192 384 551 385 526 552 553 534 554 555 355 175 174 391 393 556 531 557 558 536 559 560 561 400 562 233 466 401 422 250 231 454 57 563 43 256 405 564 236 235 245 46 418 48 565 459 562 566 567 226 227 568 237 569 406 220 221 570 571 535 572 347 187 186 533 573 574 351 181 180 575 457 389 523 576 577 578 463 397 528 579 580 123 538 25 125 121 27 117 119 28 116 24 581 88 90 7 87 9 582 84 546 10 86 82 6 45 42 583 419 418 584 435 230 232 585 421 422 586 232 399 587 66 65 64 555 588 69 589 590 591 50 560 592 238 593 594 255 42 256 595 468 458 383 61 203 205 200 460 596 597 196 598 198 455 599 600 167 601 169 53 461 392 163 165 160 398 602 240 586 234 67 402 251 250 603 398 399 42 255 43 431 405 407 410 246 245 604 408 594 141 40 413 40 139 41 146 37 413 37 144 38 145 144 37 605 487 146 146 413 39 414 39 41 140 139 40 606 489 141 141 413 36 415 36 38 607 59 250 61 608 59 608 402 59 417 242 609 610 419 459 268 430 266 454 611 421 274 434 272 54 245 612 53 613 54 613 410 54 425 257 614 243 216 244 427 263 615 265 136 135 217 464 426 261 213 212 134 469 428 133 33 290 262 616 429 211 430 209 30 471 292 584 45 411 420 206 208 617 406 405 406 569 618 44 431 412 448 249 248 159 434 157 3 472 294 404 585 230 423 154 156 403 66 587 451 254 253 258 152 259 439 281 619 283 74 73 153 467 438 279 149 148 72 473 440 71 0 296 280 620 441 428 137 285 286 31 30 471 32 129 31 136 264 128 475 284 132 34 33 291 35 444 34 270 449 78 476 289 70 1 0 297 2 447 1 276 452 440 75 287 288 4 3 472 5 79 4 74 282 448 208 207 475 271 270 406 618 407 433 621 432 451 156 155 476 277 276 65 67 561 437 622 436 575 623 458 456 458 61 461 578 624 53 462 461 401 625 626 241 466 234 420 268 267 286 126 128 423 274 273 288 76 78 248 247 432 450 443 449 253 252 436 453 446 452 457 575 458 457 590 63 461 463 578 463 592 52 69 590 456 611 69 68 149 279 278 468 627 564 462 238 592 238 239 610 612 418 239 418 45 584 68 607 422 585 422 230 561 67 400 67 66 586 554 57 56 589 563 534 559 48 47 536 593 565 467 150 438 409 595 255 256 235 617 255 595 256 464 214 426 602 241 240 244 216 215 416 398 251 259 152 151 424 408 246 264 427 32 264 136 265 137 136 285 469 137 428 442 132 428 33 133 132 33 35 291 470 291 444 465 625 466 213 261 260 30 32 471 131 471 129 3 5 472 81 472 79 282 439 5 282 74 283 75 74 287 473 75 440 445 70 440 0 71 70 0 2 297 474 297 447 286 30 293 442 286 128 475 128 127 475 270 284 270 269 449 449 443 35 476 78 77 476 276 289 276 275 452 452 446 2 288 3 295 445 288 78 307 332 300 301 22 21 483 23 478 22 305 106 304 320 298 299 19 18 485 20 479 19 302 112 112 111 20 319 495 302 106 105 23 331 499 305 317 326 310 311 16 15 486 17 481 16 315 94 314 338 308 309 13 12 484 14 482 13 312 100 100 99 14 337 503 312 94 93 17 325 507 315 477 301 304 321 114 21 480 309 317 327 96 12 477 299 307 333 108 18 480 311 314 339 102 15 145 487 143 628 568 227 147 605 146 488 228 629 140 489 138 630 570 221 142 606 141 490 222 631 21 23 483 322 483 478 321 483 322 478 491 322 12 14 484 328 484 482 327 484 328 482 492 328 18 20 485 334 485 479 333 485 334 479 493 334 15 17 486 340 486 481 339 486 340 481 494 340 320 319 302 303 496 318 110 112 495 319 497 495 495 498 110 359 523 524 332 331 305 306 500 330 104 106 499 331 501 499 499 502 104 531 185 371 338 337 312 313 504 336 98 100 503 337 505 503 503 506 98 526 179 377 326 325 315 316 508 324 92 94 507 325 509 507 507 510 92 365 528 529 303 113 496 361 193 511 316 95 508 367 175 513 306 107 500 373 187 515 313 101 504 379 181 517 321 323 115 362 512 632 361 512 362 632 519 362 327 329 97 368 514 633 367 514 368 633 520 368 333 335 109 374 516 634 373 516 374 634 521 374 339 341 103 380 518 635 379 518 380 635 522 380 360 359 524 343 525 358 376 552 526 177 179 526 386 376 378 351 527 386 337 350 505 386 378 352 366 365 529 355 530 364 370 557 531 183 185 531 394 370 372 347 532 394 331 346 501 394 372 348 204 540 205 123 27 121 538 537 636 200 202 203 199 197 196 541 118 637 116 120 117 195 542 638 170 168 167 543 89 639 87 91 88 166 544 640 164 548 165 84 6 82 546 545 641 160 162 163 123 25 549 25 636 26 117 28 549 28 541 29 88 7 550 7 543 8 84 10 550 10 641 11 551 642 385 361 363 194 623 384 383 343 192 525 343 345 193 193 361 194 391 556 643 367 369 176 392 624 393 355 174 530 355 357 175 175 367 176 561 562 644 400 566 562 468 564 235 627 645 564 646 535 647 535 51 572 647 535 571 373 375 188 572 51 50 50 536 560 572 50 591 347 186 532 648 533 649 62 573 533 533 574 649 379 381 182 62 64 573 534 555 64 64 588 573 351 180 527 189 191 523 359 576 523 171 173 528 365 579 528 43 431 44 583 44 412 42 44 583 45 583 412 435 232 66 403 230 435 389 63 62 590 534 63 397 52 51 52 592 536 418 46 45 46 246 604 46 604 42 246 408 604 604 594 42 408 255 594 531 558 183 460 597 49 526 553 177 455 600 58 240 234 586 66 232 586 586 399 240 603 399 232 230 422 231 231 251 603 231 603 232 251 398 603 607 250 422 68 60 607 565 650 459 239 419 610 454 563 651 611 68 421 245 418 612 55 612 239 256 617 405 235 237 617 236 652 237 617 237 406 60 456 61 590 457 456 383 385 61 458 623 383 53 55 462 462 592 463 53 392 391 392 461 624 400 67 233 234 466 233 400 401 566 466 625 401 653 389 388 389 457 63 654 397 396 397 463 52 607 60 59 60 69 456 589 534 590 611 651 69 55 54 612 462 55 238 592 593 536 650 238 610 376 387 552 554 56 555 57 455 58 563 57 554 370 395 557 559 47 560 48 460 49 559 565 48 330 332 307 332 305 300 318 320 304 320 302 298 324 326 317 326 315 310 336 338 314 338 312 308 114 321 115 303 301 114 96 327 97 316 309 96 108 333 109 306 299 108 102 339 103 313 311 102 401 626 566 226 568 224 562 567 644 229 628 227 645 236 564 220 570 218 652 569 237 223 630 221 358 360 344 319 342 497 364 366 356 325 354 509 187 373 188 347 349 187 181 379 182 351 353 181 575 389 653 359 382 576 578 397 654 365 390 579 123 549 27 125 27 29 538 636 25 538 123 122 119 541 28 119 117 120 117 549 24 26 581 24 90 543 7 90 88 91 88 550 9 11 582 9 84 550 6 86 6 8 546 641 10 546 84 83 528 580 171 396 535 646 523 577 189 388 533 648 563 554 534 651 563 589 454 651 611 651 589 69 536 565 559 565 593 650 650 610 459 593 238 650",
            pos: "-3.661734 1.934158 2.409647 -3.576453 1.934158 2.914499 -2.765254 1.934158 2.284969 -7.128298 1.934158 3.832601 -7.13516 1.934158 3.311326 -8.027132 1.934158 3.559729 -8.893265 2.656382 3.035642 -8.926018 2.656382 3.554618 -8.893265 1.934158 3.035642 -8.936935 4.100831 3.72761 -8.904182 4.100831 3.208634 -8.936935 4.823055 3.72761 -10.09473 3.617291 2.784239 -10.15459 3.617291 3.297543 -9.518818 4.220173 3.186607 -12.58926 1.205764 2.501783 -12.47651 1.205764 2.009657 -13.11187 0.602882 1.926304 -12.43892 -1.205764 1.845615 -12.55167 -1.205764 2.337741 -13.07002 -0.602882 1.764693 -10.17454 -3.617291 3.468645 -10.11468 -3.617291 2.955341 -9.534266 -4.220173 3.358792 -8.893265 -4.100831 3.035642 -8.926018 -4.100831 3.554618 -8.893265 -4.823055 3.035642 -8.936935 -2.656382 3.72761 -8.904182 -2.656382 3.208634 -8.936935 -1.934158 3.72761 -7.137447 -1.934158 3.137567 -7.130586 -1.934158 3.658843 -8.022809 -1.934158 3.386061 -3.548026 -1.934158 3.082783 -3.633307 -1.934158 2.577931 -2.730476 -1.934158 2.450448 -1.988704 -0.967079 1.589617 -1.865676 -0.967079 2.075967 -1.988704 -1.934158 1.589617 -1.824667 0.967079 2.238084 -1.947695 0.967079 1.751733 -1.824667 1.934158 2.238084 -5.873344 0 2.354203 -5.027407 -0.356852 2.177498 -5.449535 -0.89213 2.275233 -6.724574 -0.713704 2.455602 -6.724574 0.178426 2.455602 -10.63674 -2.378848 1.945578 -9.848684 -2.230201 2.179288 -10.18744 -2.854617 2.087178 -11.30471 -0.89208 1.693208 -11.52556 0.118917 1.598507 -10.86025 0.178376 1.866765 -9.281256 1.427409 2.305818 -8.431409 1.070556 2.431369 -8.872764 0.505524 2.375666 -10.92353 2.378848 3.912399 -10.06475 2.230201 4.167087 -10.43391 2.854617 4.06671 -8.520256 -1.070556 4.441794 -9.001227 -0.505524 4.381092 -9.446386 -1.427409 4.304975 -11.89214 -0.118917 3.534175 -11.16711 -0.178376 3.826512 -11.65147 0.89208 3.637376 -3.897718 1.427409 3.891155 -4.810712 0.713704 4.165137 -3.897718 0.535278 3.891155 -8.520256 0.356852 4.441794 -9.480783 0.059509 4.29829 -4.518802 1.934158 2.707051 -3.84816 1.807471 1.971325 -4.688249 1.807471 2.252939 -6.39343 1.807471 2.590577 -7.137447 1.934158 3.137567 -6.259595 1.934158 3.071627 -5.395757 1.807471 4.130645 -4.483088 1.807471 3.908597 -5.323885 1.934158 3.616689 -8.936935 1.934158 3.72761 -9.084376 1.807471 4.202477 -8.162754 1.807471 4.30737 -8.970453 3.188151 2.526439 -8.970453 3.878491 2.526439 -8.893265 3.378607 3.035642 -8.970453 1.807471 2.526439 -8.970453 2.497811 2.526439 -9.084376 3.878491 4.202477 -8.936935 3.378607 3.72761 -9.084376 2.497811 4.202477 -8.936935 2.656382 3.72761 -9.084376 3.188151 4.202477 -13.29437 0 0.805865 -13.5666 0 1.164421 -13.00723 0.602882 1.522277 -10.63004 2.855519 2.116823 -10.6063 3.014409 2.441336 -10.08037 3.426623 2.285326 -9.084376 4.56883 4.202477 -8.936935 4.823055 3.72761 -9.557438 4.220173 3.617069 -12.03333 1.713311 3.298482 -12.07247 1.713311 2.956854 -12.60672 1.142208 3.016349 -8.970453 -4.56883 2.526439 -8.893265 -4.823055 3.035642 -9.495646 -4.220173 2.928329 -11.71491 -1.713311 1.685134 -11.86662 -1.713311 1.937871 -12.24854 -1.142208 1.422566 -13.73048 0 2.353695 -13.75086 0 1.800098 -13.17466 -0.602882 2.168719 -10.86763 -2.855519 3.762338 -10.75352 -3.014409 3.48374 -10.27699 -3.426623 3.943397 -8.970453 -3.878491 2.526439 -8.893265 -3.378607 3.035642 -8.970453 -2.497811 2.526439 -8.893265 -2.656382 3.035642 -8.970453 -3.188151 2.526439 -9.084377 -3.188151 4.202477 -9.084377 -3.878491 4.202477 -8.936935 -3.378607 3.72761 -9.084376 -1.807471 4.202477 -9.084377 -2.497811 4.202477 -5.537627 -1.807471 2.459589 -4.688249 -1.807471 2.252939 -5.385731 -1.934158 2.92796 -8.893265 -1.934158 3.035642 -8.970453 -1.807471 2.526439 -8.112742 -1.807471 2.624059 -4.430876 -1.934158 3.389135 -3.5804 -1.807471 3.605999 -4.483088 -1.807471 3.908597 -6.315329 -1.807471 4.271394 -7.128298 -1.934158 3.832601 -6.224038 -1.934158 3.764677 -2.207146 1.807471 1.187254 -1.988704 1.934158 1.589617 -1.988704 0.967079 1.589617 -1.988704 0 1.589617 -2.207146 -0.903735 1.187254 -1.817107 -1.807471 2.763504 -1.824667 -1.934158 2.238084 -1.824667 -0.967079 2.238084 -1.824667 0 2.238084 -1.817107 0.903735 2.763504 -4.688249 1.807471 2.252939 -4.189613 1.427409 1.926084 -5.027407 1.427409 2.177498 -6.724574 1.427409 2.455602 -7.252768 1.807471 2.645463 -6.39343 1.807471 2.590577 -5.732581 1.427409 4.357702 -4.810712 1.427409 4.165137 -5.395757 1.807471 4.130645 -9.084376 1.807471 4.202477 -9.446386 1.427409 4.304975 -8.520256 1.427409 4.441794 -9.281256 3.806156 2.305818 -8.970453 4.56883 2.526439 -8.970453 3.878491 2.526439 -8.970453 3.188151 2.526439 -8.970453 2.497811 2.526439 -9.281256 2.616782 2.305818 -9.446386 3.806156 4.304975 -9.446386 2.616782 4.304975 -9.084376 3.188151 4.202477 -9.084376 1.807471 4.202477 -9.084376 2.497811 4.202477 -12.82791 0 0.920911 -13.29437 0 0.805865 -12.77527 0.571104 1.129336 -10.63674 2.378848 1.945578 -10.4525 2.855519 2.11168 -10.18744 2.854617 2.087178 -9.446386 3.806156 4.304975 -9.084376 4.56883 4.202477 -9.682291 3.997726 4.090179 -11.89214 1.427309 3.534175 -12.17113 1.427309 3.298795 -12.37018 0.951539 3.310629 -9.281256 -3.806156 2.305818 -8.970453 -4.56883 2.526439 -9.526904 -3.997726 2.42193 -11.52556 -1.427309 1.598507 -11.81996 -1.427309 1.571353 -11.96423 -0.951539 1.393374 -13.31139 0 2.795758 -13.73048 0 2.353695 -13.17271 -0.571104 2.701269 -10.92353 -2.378848 3.912399 -10.69399 -2.855519 3.882458 -10.43391 -2.854617 4.06671 -9.281256 -3.806156 2.305818 -9.281256 -2.616782 2.305818 -8.970453 -3.188151 2.526439 -8.970453 -1.807471 2.526439 -8.970453 -2.497811 2.526439 -9.446386 -3.806156 4.304975 -9.084377 -4.56883 4.202477 -9.084377 -3.878491 4.202477 -9.084377 -3.188151 4.202477 -9.084377 -2.497811 4.202477 -9.446386 -2.616782 4.304975 -5.873344 -1.427409 2.354203 -5.027407 -1.427409 2.177498 -5.537627 -1.807471 2.459589 -8.970453 -1.807471 2.526439 -9.281256 -1.427409 2.305818 -8.431409 -1.427409 2.431369 -4.483088 -1.807471 3.908597 -3.897718 -1.427409 3.891155 -4.810712 -1.427409 4.165137 -6.660216 -1.427409 4.468203 -7.238699 -1.807471 4.330369 -6.315329 -1.807471 4.271394 -2.549731 1.427409 1.202768 -2.207146 1.807471 1.187254 -2.207146 0.903735 1.187254 -2.207146 0 1.187254 -2.207146 -0.903735 1.187254 -2.549731 -0.713704 1.202768 -2.11064 -1.427409 3.102915 -1.817107 -1.807471 2.763504 -1.817107 -0.903735 2.763504 -1.817107 0 2.763504 -1.817107 0.903735 2.763504 -2.11064 0.713704 3.102915 -6.660216 0.713704 4.468203 -6.660216 -0.178426 4.468203 -5.732581 0 4.357702 -3.445514 -0.178426 3.723912 -3.897718 -0.713704 3.891155 -3.362792 0.356852 1.600808 -2.549731 0 1.202768 -2.954369 -0.535278 1.410806 -9.312819 -0.059509 2.299685 -8.431409 -0.356852 2.431369 -4.810712 -1.070556 4.165137 -3.897718 -1.427409 3.891155 -8.520256 -1.427409 4.441794 -8.162754 -1.807471 4.30737 -7.590487 -1.427409 4.496264 -7.578222 0.713704 2.481353 -6.724574 1.070556 2.455602 -3.362792 -1.427409 1.600808 -3.84816 -1.807471 1.971325 -4.189613 -1.427409 1.926084 -7.590487 -0.713704 4.496264 -6.660216 -1.070556 4.468203 -2.996681 1.427409 3.536683 -3.5804 1.807471 3.605999 -3.897718 1.427409 3.891155 -5.027407 0.713704 2.177498 -4.189613 0.535278 1.926084 -8.431409 1.427409 2.431369 -8.112742 1.807471 2.624059 -7.578222 1.427409 2.481353 -2.996681 -1.427409 3.536683 -3.5804 -1.807471 3.605999 -2.69074 -1.807471 3.223871 -8.162754 -1.807471 4.30737 -8.033616 -1.934158 3.820232 -7.238699 -1.807471 4.330369 -7.578222 -1.427409 2.481353 -6.724574 -1.427409 2.455602 -7.252768 -1.807471 2.645463 -3.020194 -1.807471 1.615697 -3.661734 -1.934158 2.409647 -3.84816 -1.807471 1.971325 -7.590487 1.427409 4.496264 -6.660216 1.427409 4.468203 -7.238699 1.807471 4.330369 -2.69074 1.807471 3.223871 -3.548026 1.934158 3.082783 -3.5804 1.807471 3.605999 -3.362792 1.427409 1.600808 -3.84816 1.807471 1.971325 -3.020194 1.807471 1.615697 -8.112742 1.807471 2.624059 -8.016325 1.934158 3.125559 -7.252768 1.807471 2.645463 -4.507811 -1.934158 2.792312 -6.228482 -1.934158 3.678046 -6.259595 -1.934158 3.071627 -6.25515 1.934158 3.158258 -6.224038 1.934158 3.764677 -4.441867 1.934158 3.303874 -2.69074 -1.807471 3.223871 -2.678311 -1.934158 2.698668 -7.252768 -1.807471 2.645463 -6.393429 -1.807471 2.590577 -7.238699 1.807471 4.330369 -6.315328 1.807471 4.271394 -3.020194 1.807471 1.615697 -2.817419 1.934158 2.036749 -11.97896 -1.808646 2.71565 -11.86259 -1.808646 2.133914 -10.70176 -3.014409 2.688475 -10.78725 -3.014409 3.282575 -12.58926 -1.205764 2.501783 -11.35647 -2.411528 3.329919 -11.39459 -2.411528 3.059159 -10.09473 -3.617291 2.784239 -11.29123 -2.284415 2.125882 -11.27915 -2.411528 2.386712 -10.77504 3.014409 3.197703 -10.68955 3.014409 2.603603 -11.87921 1.808646 2.217019 -11.99558 1.808646 2.798756 -10.17454 3.617291 3.468645 -11.49164 2.284415 3.275964 -11.39459 2.411528 3.059159 -12.43892 1.205764 1.845615 -11.16275 2.411528 2.177167 -11.27915 2.411528 2.386712 -11.95658 -1.808646 3.139869 -12.5529 -1.205764 2.913697 -11.99558 -1.808646 2.798756 -10.14866 -3.617291 3.601283 -9.542821 -4.220173 3.682552 -9.682291 -3.997726 4.090179 -11.71057 1.808646 1.880888 -12.24896 1.205764 1.553123 -11.86259 1.808646 2.133914 -10.04201 3.617291 2.672818 -9.47072 4.220173 2.87108 -9.526904 3.997726 2.42193 -10.71301 -2.855519 2.278767 -10.13286 -3.426623 2.396475 -10.68955 -3.014409 2.603603 -12.43826 -1.142208 1.71484 -13.00522 -0.571104 1.456951 -12.77527 -0.571104 1.129336 -10.90153 2.855519 3.560677 -10.30302 3.426623 3.81037 -10.78725 3.014409 3.282575 -12.64318 1.142208 2.604017 -13.20291 0.571104 2.218175 -13.17271 0.571104 2.701269 -12.03333 -1.713311 3.298482 -11.22565 -2.284415 3.720055 -11.45336 -2.284415 3.547264 -10.86763 -2.855519 3.762338 -10.63004 -2.855519 2.116823 -11.31869 -1.903078 1.77289 -11.17515 -2.284415 1.916664 -11.71491 -1.713311 1.685134 -10.86763 2.855519 3.762338 -11.63703 1.903078 3.557888 -11.45335 2.284415 3.547264 -12.03333 1.713311 3.298482 -11.71491 1.713311 1.685134 -10.93852 2.284415 1.922753 -11.17515 2.284415 1.916664 -10.63004 2.855519 2.116823 -11.75383 -1.713311 3.529994 -12.27792 -1.142208 3.312449 -12.03333 -1.713311 3.298482 -10.15948 -3.426623 4.017064 -9.62273 -3.997726 4.123762 -9.941363 -3.330387 4.19761 -11.41961 1.713311 1.708906 -11.89523 1.142208 1.470432 -11.71491 1.713311 1.685134 -9.962106 3.426623 2.275422 -9.467902 3.997726 2.413744 -9.735464 3.330387 2.207297 -10.30517 -2.854617 2.094279 -10.08037 -3.426623 2.285326 -10.63004 -2.855519 2.116823 -12.31675 -0.951539 1.342842 -12.80842 -0.475769 1.08759 -12.39848 -0.475769 1.167435 -10.55123 2.854617 3.989901 -10.27699 3.426623 3.943397 -10.86763 2.855519 3.762338 -12.6985 0.951539 3.011459 -13.21849 0.475769 2.69628 -12.84341 0.475769 3.06441 -11.89214 -1.427309 3.534174 -9.941363 -2.141013 4.19761 -10.43391 -2.854617 4.06671 -9.446386 -2.616782 4.304975 -11.09684 2.378848 3.788368 -10.92353 2.378848 3.912399 -12.37018 -0.951539 3.310629 -11.65147 -1.010998 3.637376 -11.52556 1.427309 1.598507 -9.281256 2.616782 2.305818 -9.735464 2.141013 2.207297 -10.18744 2.854617 2.087178 -10.81354 -2.378848 1.947254 -10.63674 -2.378848 1.945578 -11.96423 0.951539 1.393373 -11.30471 1.010998 1.693208 -5.732581 -1.427409 4.357702 -5.27073 -0.535278 4.271644 -2.996681 0.356852 3.536683 -2.551599 -0.535278 3.329626 -7.590487 -1.427409 4.496264 -5.732581 1.427409 4.357702 -6.660216 1.427409 4.468203 -4.189613 -0.713704 1.926084 -3.362792 -1.070556 1.600808 -4.189613 -1.427409 1.926084 -5.873344 1.427409 2.354203 -5.027407 1.427409 2.177498 -7.578222 1.427409 2.481353 -6.724574 -1.427409 2.455602 -5.873344 -1.427409 2.354203 -1.906686 0 1.91385 -1.817107 1.807471 2.763504 -2.207146 -1.807471 1.187254 -6.660216 -1.427409 4.468203 -9.084376 -1.807471 4.202477 -7.578222 -0.535278 2.481353 -8.431409 -1.427409 2.431369 -6.393429 -1.807471 2.590577 -8.520256 1.427409 4.441794 -7.590487 0.535278 4.496264 -6.315328 1.807471 4.271394 -6.724574 1.427409 2.455602 -8.970453 1.807471 2.526439 -5.732581 -1.427409 4.357702 -8.936935 -1.934158 3.72761 -5.323884 -1.934158 3.616689 -2.11064 -1.427409 3.102915 -8.112742 -1.807471 2.624059 -5.027407 -1.427409 2.177498 -3.020194 -1.807471 1.615697 -2.549731 -1.427409 1.202768 -8.162754 1.807471 4.30737 -5.732581 0.713704 4.357702 -2.69074 1.807471 3.223871 -2.11064 1.427409 3.102915 -5.873344 1.427409 2.354203 -8.893265 1.934158 3.035642 -5.38573 1.934158 2.92796 -2.549731 1.427409 1.202768 -5.354808 -1.934158 3.272324 -1.988704 -1.934158 1.589617 -1.824667 -1.934158 2.238084 -5.354807 1.934158 3.272324 -1.824667 1.934158 2.238084 -1.988704 1.934158 1.589617 -4.688249 -1.807471 2.252939 -2.817419 -1.934158 2.036749 -2.207146 -1.807471 1.187254 -4.483088 1.807471 3.908597 -2.678311 1.934158 2.698668 -1.817107 1.807471 2.763504 -9.446386 1.427409 4.304975 -9.446386 2.616782 4.304975 -9.941363 -0.832622 4.19761 -10.92353 -1.070456 3.912399 -10.43391 -1.665243 4.06671 -9.281256 -1.427409 2.305818 -9.281256 -2.616782 2.305818 -10.18744 1.665243 2.087178 -9.735464 0.832622 2.207297 -10.63674 1.070456 1.945578 -5.395757 -1.807471 4.130645 -2.996681 -1.427409 3.536683 -2.996681 -1.070556 3.536683 -5.537628 1.807471 2.459589 -3.362792 1.427409 1.600808 -5.395757 -1.807471 4.130645 -1.817107 -1.807471 2.763504 -8.016326 -1.934158 3.125559 -8.033616 1.934158 3.820232 -5.537628 1.807471 2.459589 -2.207146 1.807471 1.187254 -4.518802 -1.934158 2.707052 -4.430877 1.934158 3.389135 -11.33687 -2.411528 2.722936 -8.936935 -4.823055 3.72761 -13.5666 0 1.164421 -11.33687 2.411528 2.722936 -13.75086 0 1.800098 -8.893265 4.823055 3.035642 -9.557438 -4.220173 3.617069 -9.495646 4.220173 2.928329 -13.00723 -0.602882 1.522277 -13.17466 0.602882 2.168719 -1.817107 -0.903735 2.763504 -2.11064 1.427409 3.102915 -2.207146 0.903735 1.187254 -2.549731 -1.427409 1.202768 -9.084377 -4.56883 4.202477 -8.970453 4.56883 2.526439 -13.29437 0 0.805865 -13.73048 0 2.353695 -13.14452 -0.602882 2.651566 -11.45336 -2.284415 3.547264 -12.60672 -1.142208 3.016349 -13.17271 -0.571104 2.701269 -9.551704 -3.997726 2.479012 -11.17515 -2.284415 1.916664 -10.08037 -3.426623 2.285326 -9.526904 -3.997726 2.42193 -9.696997 3.997726 4.024475 -11.45335 2.284415 3.547264 -10.27699 3.426623 3.943397 -9.682291 3.997726 4.090179 -12.77714 0.602882 1.194544 -11.17515 2.284415 1.916664 -12.24854 1.142208 1.422566 -12.77527 0.571104 1.129336 -10.27699 -3.426623 3.943397 -9.682291 -3.997726 4.090179 -10.08037 3.426623 2.285326 -9.526904 3.997726 2.42193 -12.24854 -1.142208 1.422566 -12.77527 -0.571104 1.129336 -12.60672 1.142208 3.016349 -13.17271 0.571104 2.701269 -9.446386 -3.806156 4.304975 -9.281256 3.806156 2.305818 -12.82791 0 0.920911 -13.31139 0 2.795758 -12.79731 -0.571104 3.067624 -12.60672 -1.142208 3.016349 -11.40977 -1.903078 3.73483 -10.00085 3.330387 4.162191 -11.40977 1.903078 3.73483 -12.36484 0.571104 1.207651 -12.24854 1.142208 1.422566 -11.08292 1.903078 1.782635 -9.794194 -3.330387 2.213832 -11.08292 -1.903078 1.782635 -12.60742 -0.059459 3.190339 -10.92353 0.832622 3.912399 -12.18193 0.059459 1.282992 -10.63674 -0.832622 1.945578 -9.084377 -4.56883 4.202477 -8.936935 -4.100831 3.72761 -9.446386 -1.427409 4.304975 -9.084376 -1.807471 4.202477 -8.893265 -1.934158 3.035642 -8.970453 -3.878491 2.526439 -8.936935 1.934158 3.72761 -9.084376 3.878491 4.202477 -8.970453 4.56883 2.526439 -8.893265 4.100831 3.035642 -9.281256 1.427409 2.305818 -8.970453 1.807471 2.526439 -8.9151 -3.378607 3.381626 -8.9151 3.378607 3.381626 -9.941363 -3.330387 4.19761 -10.43391 2.854617 4.06671 -9.941363 3.330387 4.19761 -10.67911 1.843619 3.992472 -11.40977 1.903078 3.73483 -9.735464 3.330387 2.207297 -10.18744 -2.854617 2.087178 -9.735464 -3.330387 2.207297 -10.41245 -1.843619 2.019055 -11.08292 -1.903078 1.782635 -2.996681 1.427409 3.536683 -2.551599 0.89213 3.329626 -10.44242 1.144842 4.064233 -2.954369 0.89213 1.410806 -10.19525 -1.144842 2.084906 -2.11064 0 3.102915 -2.11064 0.713704 3.102915 -2.11064 -0.713704 3.102915 -2.549731 -1.427409 1.202768 -2.549731 0.713704 1.202768 -12.39848 -0.475769 1.167435 -11.96423 -0.951539 1.393374 -12.37018 0.951539 3.310629 -12.84341 0.475769 3.06441 -11.40977 -1.903078 3.73483 -12.37018 -0.951539 3.310629 -12.84341 -0.475769 3.06441 -11.08292 1.903078 1.782635 -11.96423 0.951539 1.393373 -12.39848 0.475769 1.167435 -8.970453 -4.56883 2.526439 -9.084376 4.56883 4.202477 -5.873344 -0.713704 2.354203 -7.578222 -1.427409 2.481353 -7.590487 1.427409 4.496264 -4.810712 -0.178426 4.165137 -4.810712 1.427409 4.165137 -11.89214 1.427309 3.534175 -10.20505 0.446065 4.130541 -10.43391 -0.237835 4.06671 -11.52556 -1.427309 1.598507 -10.18744 0.237835 2.087178 -9.977429 -0.446065 2.145752 -5.873344 0.713704 2.354203 -4.189613 1.427409 1.926084 -9.281256 -3.806156 2.305818 -9.735464 -3.330387 2.207297 -9.281256 -1.427409 2.305818 -9.446386 3.806156 4.304975 -9.941363 3.330387 4.19761 -9.446386 1.427409 4.304975 -4.810712 -1.427409 4.165137 -6.195873 -0.535278 4.42324 -6.298477 0.535278 2.414343 -1.817107 0 2.763504 -2.207146 0 1.187254 -8.055631 -0.178426 4.479341 -8.520256 -1.427409 4.441794 -9.446386 -1.427409 4.304975 -8.85693 -0.89213 2.378019 -8.983972 0.89213 4.383656 -8.005053 0.178426 2.465823 -8.431409 1.427409 2.431369 -9.281256 1.427409 2.305818 -9.084376 -1.807471 4.202477 -1.817107 -1.807471 2.763504 -3.774655 -0.178426 1.772616 -3.362792 -1.427409 1.600808 -8.970453 1.807471 2.526439 -2.207146 1.807471 1.187254 -2.207146 -1.807471 1.187254 -1.817107 1.807471 2.763504 -10.92353 -2.378848 3.912399 -10.63674 2.378848 1.945578 -2.11064 -1.427409 3.102915 -2.11064 -0.713704 3.102915 -2.549731 1.427409 1.202768 -2.11064 0 3.102915 -1.817107 1.807471 2.763504 -2.549731 0 1.202768 -2.207146 -1.807471 1.187254 -9.084377 -4.56883 4.202477 -8.970453 4.56883 2.526439 -13.29437 0 0.805865 -13.73048 0 2.353695 -8.936935 -4.823055 3.72761 -8.970453 -1.807471 2.526439 -8.970453 -4.56883 2.526439 -9.084376 1.807471 4.202477 -9.084376 4.56883 4.202477 -8.893265 4.823055 3.035642 -9.446386 -3.806156 4.304975 -9.281256 3.806156 2.305818 -2.11064 1.427409 3.102915 -2.549731 0.713704 1.202768 -12.39848 0.475769 1.167435 -12.82791 0 0.920911 -12.84341 -0.475769 3.06441 -13.31139 0 2.795758 -9.418642 -0.669098 2.278346 -9.596104 0.669098 4.275037 -2.549731 -0.713704 1.202768 -11.89214 -1.427309 3.534174 -11.52556 1.427309 1.598507",
            norm: "-0.046081 0.991939 -0.118042 0 1 0 0 1 0 0.004246 0.991743 0.128174 0 1 0 0 1 0 0.999045 0 -0.043693 0.998014 0 0.062985 0.998682 0 -0.051324 0.983476 0 0.181036 0.998014 0 0.062985 0.987089 0 0.160174 -0.671184 0.716267 -0.190981 -0.690337 0.718957 -0.080847 -0.696045 0.71532 -0.061954 -0.699779 0.712403 -0.052827 -0.672259 0.724185 -0.153699 -0.662149 0.729386 -0.171916 -0.633126 -0.730303 -0.256531 -0.669636 -0.726807 -0.152769 -0.663948 -0.727605 -0.172525 -0.704373 -0.709151 0.03105 -0.693117 -0.716218 -0.081367 -0.694125 -0.717203 -0.061729 0.999045 0 -0.043693 0.998014 0 0.062985 0.999677 0 -0.025396 0.983476 0 0.181037 0.998014 0 0.062985 0.981846 0 0.189681 -0.003884 -0.992557 -0.121719 0 -1 0 0 -1 0 0.049601 -0.991091 0.123608 0 -1 0 0 -1 0 0.931395 0 -0.364009 0.969463 0 -0.245237 0.935623 0 -0.353 0.991422 0 -0.130701 0.969463 0 -0.245236 0.990129 0 -0.140158 -0.162474 0.000802 -0.986713 -0.24951 -0.002675 -0.968368 -0.204608 0.001421 -0.978843 -0.074291 0 -0.997237 -0.070597 0.003032 -0.9975 0.303152 -0.004108 -0.952933 0.246525 0.003041 -0.969132 0.256384 -0.007019 -0.966549 0.38326 -0.001036 -0.92364 0.403984 1.4E-05 -0.914766 0.343001 1.9E-05 -0.939335 0.200493 5E-05 -0.979695 0.100222 -0.001755 -0.994964 0.14769 0.000381 -0.989034 -0.3043 -0.004547 0.952565 -0.24614 0.003382 0.969228 -0.257659 -0.007769 0.966205 -0.100303 -0.001568 0.994956 -0.147693 0.00045 0.989033 -0.20034 0.000416 0.979726 -0.404032 -1.6E-05 0.914745 -0.34305 -1.1E-05 0.939317 -0.383206 -0.001122 0.923662 0.327045 0 0.945009 0.246176 0 0.969225 0.325555 0.002008 0.945521 -0.101184 -0.001358 0.994867 -0.192592 -0.001965 0.981277 -0.035654 0.992187 -0.11956 -0.092103 0.966568 -0.239296 -0.070572 0.967535 -0.242686 -0.026638 0.968703 -0.246789 -0.003884 0.992557 -0.121719 -0.014522 0.992498 -0.121396 0.047612 0.968044 0.246218 0.069012 0.967367 0.243799 0.027178 0.991548 0.12686 -0.014423 0.991309 0.130757 -0.028388 0.967977 0.249428 -0.017409 0.968553 0.248199 0.988705 0 -0.149875 0.988705 0 -0.149875 0.999045 0 -0.043693 0.988705 0 -0.149875 0.988705 0 -0.149875 0.955025 0 0.296525 0.983476 0 0.181036 0.955025 0 0.296525 0.983476 0 0.181036 0.955025 0 0.296525 -0.543359 0.737027 -0.401936 -0.598785 0.74083 -0.304347 -0.616459 0.734546 -0.283584 -0.633634 0.711539 -0.303679 -0.631314 0.711431 -0.308722 -0.646286 0.707373 -0.286248 -0.700666 0.697269 0.151269 -0.70255 0.710509 0.040006 -0.700506 0.71243 0.041644 -0.72202 0.686662 0.084745 -0.722825 0.687318 0.071541 -0.725501 0.684985 0.06666 -0.662727 -0.703475 -0.256742 -0.687153 -0.715166 -0.127904 -0.682985 -0.712029 -0.162933 -0.597005 -0.718997 -0.35585 -0.59463 -0.723443 -0.350779 -0.579601 -0.724507 -0.373032 -0.729679 -0.683031 0.032193 -0.689865 -0.716484 -0.103619 -0.699339 -0.712 -0.063095 -0.712634 -0.694036 0.102302 -0.713579 -0.691258 0.113875 -0.708354 -0.6956 0.119898 0.988705 0 -0.149875 0.999045 0 -0.043693 0.988705 0 -0.149875 0.999045 0 -0.043693 0.988705 0 -0.149875 0.955024 0 0.296527 0.955025 0 0.296527 0.983476 0 0.181037 0.955025 -1E-06 0.296525 0.955025 0 0.296526 -0.048719 -0.96825 -0.245189 -0.070572 -0.967535 -0.242685 -0.025123 -0.992374 -0.120677 0.01484 -0.990751 -0.134876 0.027921 -0.969039 -0.245325 0.017812 -0.968791 -0.247238 0.038479 -0.991351 0.12547 0.090138 -0.96645 0.240519 0.069012 -0.967367 0.243799 0.02602 -0.968471 0.247762 0.004246 -0.991743 0.128174 0.015748 -0.991679 0.127765 0.878839 0 -0.477119 0.935623 0 -0.353 0.931396 0 -0.364008 0.931395 0 -0.364009 0.878839 0 -0.477119 0.999897 0 -0.014387 0.990129 0 -0.140158 0.991422 0 -0.130701 0.991422 0 -0.130701 0.999897 0 -0.014387 -0.256302 0.390667 -0.884132 -0.300771 0.387427 -0.871457 -0.225498 0.392146 -0.891837 -0.066631 0.397558 -0.915154 -0.019514 0.398074 -0.917146 -0.100206 0.396952 -0.912353 0.145936 0.396848 0.906209 0.223827 0.393716 0.891566 0.181018 0.393061 0.901518 -0.126612 0.387149 0.913283 -0.135412 0.376176 0.9166 -0.095661 0.397991 0.912388 0.578837 0 -0.815443 0.578837 0 -0.815444 0.578837 0 -0.815444 0.578837 0 -0.815444 0.578837 0 -0.815444 0.578837 0 -0.815444 0.272427 0 0.962177 0.272427 0 0.962177 0.272427 0 0.962177 0.272427 0 0.962177 0.272427 0 0.962177 0.214182 0.317594 -0.923721 0.227248 0.315313 -0.921377 0.187142 0.319387 -0.928962 -0.042742 0.346062 -0.937238 -0.054637 0.333704 -0.941093 -0.090442 0.347553 -0.933289 -0.477938 0.32608 0.815627 -0.471996 0.333702 0.816004 -0.482673 0.327019 0.812456 -0.613958 0.288102 0.734882 -0.6355 0.297287 0.712573 -0.64149 0.283109 0.71298 -0.165407 -0.344709 -0.924022 -0.173422 -0.338234 -0.924945 -0.16186 -0.343752 -0.925006 0.082198 -0.315655 -0.945307 0.093153 -0.329663 -0.939492 0.128208 -0.316085 -0.940028 -0.689363 -0.278927 0.668565 -0.696982 -0.278567 0.66077 -0.677161 -0.279223 0.680799 -0.57384 -0.320763 0.753538 -0.545993 -0.310765 0.778021 -0.542176 -0.322932 0.775732 0.578837 0 -0.815443 0.578837 0 -0.815444 0.578837 0 -0.815444 0.578837 0 -0.815444 0.578837 0 -0.815444 0.272427 0 0.962176 0.272427 0 0.962176 0.272427 0 0.962176 0.272427 0 0.962176 0.272428 0 0.962176 0.272427 0 0.962176 -0.147123 -0.395574 -0.906574 -0.225498 -0.392146 -0.891836 -0.179486 -0.394447 -0.90122 0.124664 -0.403549 -0.906425 0.133037 -0.413949 -0.900526 0.096139 -0.39689 -0.912818 0.258289 -0.388958 0.884307 0.29869 -0.389389 0.871298 0.223827 -0.393716 0.891566 0.065982 -0.398649 0.914727 0.019964 -0.396998 0.917602 0.101217 -0.395783 0.912749 -0.045238 0 -0.998976 -0.045238 0 -0.998976 -0.045238 0 -0.998976 -0.045238 0 -0.998976 -0.045238 0 -0.998976 -0.045238 0 -0.998976 0.756376 0 0.654137 0.756376 0 0.654137 0.756376 0 0.654137 0.756376 0 0.654137 0.756376 0 0.654137 0.756377 0 0.654137 0.07429 0 0.997237 0.070491 0.00309 0.997508 0.16155 0.000468 0.986864 0.371312 -0.000382 0.928508 0.323855 -0.002638 0.946103 -0.401826 0.00089 -0.915716 -0.447007 -0.002054 -0.894528 -0.43433 -0.001049 -0.900753 0.192618 -0.001627 -0.981273 0.101345 -0.001064 -0.994851 0.249591 -0.002752 0.968347 0.327045 0 0.945009 -0.095661 -0.397991 0.912388 -0.061563 -0.396653 0.915902 -0.014938 -0.399036 0.916814 0.010667 -0.00273 -0.999939 -0.070803 -0.002718 -0.997487 -0.37215 -0.381618 -0.846093 -0.329752 -0.385771 -0.861652 -0.300771 -0.387427 -0.871457 -0.010581 -0.00281 0.99994 0.070718 -0.002797 0.997492 0.369741 0.384044 0.846051 0.332113 0.383651 0.861692 0.29869 0.389389 0.871298 -0.246176 0 -0.969225 -0.325686 -0.001897 -0.945476 0.096139 0.39689 -0.912818 0.061441 0.397762 -0.915429 0.014855 0.398005 -0.917263 0.369741 -0.384044 0.846051 0.332113 -0.383651 0.861692 0.401777 -0.377355 0.834373 -0.017409 -0.968553 0.248199 -0.007272 -0.991737 0.128084 0.004319 -0.968642 0.248424 0.014855 -0.398005 -0.917263 -0.066631 -0.397558 -0.915154 -0.019514 -0.398074 -0.917146 -0.113222 -0.965368 -0.235043 -0.046081 -0.991939 -0.118042 -0.092103 -0.966568 -0.239296 -0.014938 0.399036 0.916814 0.065982 0.398649 0.914727 0.019964 0.396998 0.917602 0.11091 0.965307 0.236393 0.049601 0.991091 0.123608 0.090138 0.96645 0.240519 -0.37215 0.381618 -0.846093 -0.329752 0.385771 -0.861652 -0.39913 0.37995 -0.834466 0.017812 0.968791 -0.247238 0.006761 0.99255 -0.121646 -0.004428 0.968884 -0.247474 0 -1 0 0 -1 0 -0.014522 -0.992498 -0.121396 0 1 0 0.015748 0.991679 0.127765 0 1 0 0.11091 -0.965307 0.236393 0.060495 -0.990772 0.12129 -0.004428 -0.968884 -0.247474 -0.026638 -0.968703 -0.246789 0.004319 0.968642 0.248424 0.02602 0.968471 0.247762 -0.113222 0.965368 -0.235043 -0.056369 0.991634 -0.116125 -0.674156 -0.726284 -0.134256 -0.64362 -0.727544 -0.237556 -0.691132 -0.71577 -0.100047 -0.706428 -0.707686 0.011792 -0.701549 -0.711226 -0.044571 -0.71751 -0.689949 0.095656 -0.704124 -0.710037 -0.007586 -0.675467 -0.714702 -0.181508 -0.61146 -0.717807 -0.33297 -0.657038 -0.721504 -0.218478 -0.684246 0.722502 -0.098985 -0.660404 0.720963 -0.20995 -0.681005 0.719598 -0.135685 -0.703272 0.710118 -0.03378 -0.701795 0.712004 0.023126 -0.718965 0.689137 0.090435 -0.702498 0.711547 -0.014012 -0.62956 0.730093 -0.265739 -0.617323 0.71566 -0.326715 -0.65224 0.722448 -0.229462 -0.720673 -0.688938 0.077431 -0.723074 -0.688228 0.059206 -0.702933 -0.710779 -0.02603 -0.708869 -0.692862 0.132087 -0.703372 -0.694754 0.15028 -0.703301 -0.697468 0.137499 -0.602283 0.720081 -0.344586 -0.586165 0.724675 -0.362295 -0.641711 0.725834 -0.247734 -0.644289 0.707402 -0.290646 -0.656286 0.70358 -0.272513 -0.658123 0.703345 -0.268663 -0.627239 -0.712336 -0.314878 -0.641982 -0.70706 -0.296523 -0.66706 -0.717638 -0.200066 -0.576731 -0.729215 -0.368276 -0.55775 -0.735093 -0.385426 -0.561149 -0.730088 -0.389978 -0.714289 0.691264 0.109296 -0.708785 0.693693 0.128119 -0.702249 0.711917 0.00461 -0.725879 0.685807 0.052619 -0.728133 0.684608 0.033671 -0.728192 0.683652 0.04854 -0.71893 -0.691833 0.067132 -0.578275 -0.305209 0.756602 -0.582707 -0.289795 0.759257 -0.547312 -0.292677 0.784085 -0.628806 -0.708247 -0.32092 0.041051 -0.3316 -0.942527 -0.005854 -0.351522 -0.936161 0.04456 -0.353072 -0.934534 -0.712658 0.691032 0.120801 -0.604367 0.300292 0.737947 -0.592671 0.30965 0.743544 -0.624253 0.30388 0.719698 -0.605802 0.720214 -0.338076 -0.006746 0.33578 -0.941916 0.029937 0.324362 -0.945459 -0.023053 0.325425 -0.945287 -0.608531 -0.299827 0.734706 -0.636931 -0.294666 0.712384 -0.616126 -0.286596 0.733656 -0.511487 -0.316359 0.798936 -0.474678 -0.321741 0.819246 -0.50968 -0.324971 0.79663 0.040619 0.337214 -0.940551 0.087467 0.338003 -0.937072 0.082856 0.322981 -0.942771 -0.103103 0.331152 -0.937927 -0.151857 0.328418 -0.932245 -0.136146 0.348537 -0.927355 -0.062444 -0.334593 -0.940292 -0.109176 -0.346557 -0.931654 -0.057072 -0.349278 -0.93528 0.1449 -0.327449 -0.933692 0.195918 -0.324977 -0.925206 0.173486 -0.315838 -0.932818 -0.536884 0.305418 0.786432 -0.522109 0.321444 0.789985 -0.558718 0.315557 0.76698 -0.664846 0.294 0.68669 -0.692414 0.290453 0.660454 -0.667331 0.278549 0.69071 -0.633325 -0.315633 0.706594 -0.240316 -0.000812 0.970694 -0.257321 0.010608 0.966268 -0.223886 -0.001642 0.974614 -0.571472 0.303003 0.762633 -0.553651 0.29903 0.777208 -0.428039 0.001492 0.903759 -0.382887 0.001413 0.923794 0.055518 0.34239 -0.937916 0.22442 -0.001752 -0.974491 0.240578 -0.000865 -0.970629 0.256098 0.009505 -0.966604 -0.01098 -0.333253 -0.942774 -0.011265 -0.312866 -0.94973 0.427341 0.001331 -0.90409 0.382947 0.001319 -0.923769 0.161543 -0.003072 0.986861 0.198497 0.002627 0.980098 0.401713 -0.001149 0.915765 0.434508 0.001001 0.900667 -0.01418 0 0.999899 0.161533 0 0.986867 0.07429 0 0.997237 -0.323931 0.002566 -0.946077 -0.401314 0.001624 -0.915939 -0.327044 0 -0.945009 -0.163369 -0.003065 -0.98656 -0.246176 0 -0.969225 0.01418 0 -0.999899 -0.074291 0 -0.997237 -0.156906 0.004971 -0.987601 0.969463 0 -0.245237 0.999897 0 -0.014387 0.878839 0 -0.477119 0.07429 0 0.997237 -0.126612 -0.387149 0.913283 0.012695 0.001993 -0.999917 0.097719 0.005015 -0.995202 -0.100206 -0.396952 -0.912353 -0.097424 0.005207 0.995229 -0.012547 0.002113 0.999919 0.101217 0.395783 0.912749 -0.074291 0 -0.997237 0.124664 0.403549 -0.906425 0.145936 -0.396848 0.906209 -0.014423 -0.991309 0.130757 0.027178 -0.991548 0.12686 0.423646 -0.385793 0.819566 0.061441 -0.397762 -0.915429 -0.250704 0.004957 -0.968051 -0.39913 -0.37995 -0.834466 -0.426824 -0.368782 -0.825724 -0.061563 0.396653 0.915902 0.161533 0 0.986867 0.401777 0.377355 0.834373 0.423646 0.385793 0.819566 -0.147123 0.395574 -0.906574 0.01484 0.990751 -0.134876 -0.025123 0.992374 -0.120677 -0.426824 0.368782 -0.825724 0 -1 0 -0.069297 -0.989294 -0.128435 0.047484 -0.994987 0.088007 0 1 0 0.047484 0.994987 0.088007 -0.069297 0.989294 -0.128435 -0.256302 -0.390667 -0.884132 -0.056369 -0.991634 -0.116125 -0.125253 -0.96419 -0.233773 0.258289 0.388958 0.884307 0.060495 0.990772 0.12129 0.12443 0.964681 0.232181 -0.204286 0.001667 0.97891 -0.224494 0.00055 0.974475 -0.235115 -0.000416 0.971967 -0.318778 -0.001747 0.947828 -0.278744 -0.000795 0.960365 0.204363 0.001586 -0.978894 0.224931 0.000741 -0.974374 0.278773 -0.000631 -0.960357 0.235152 -0.000336 -0.971958 0.318709 -0.001339 -0.947852 0.181018 -0.393061 0.901518 0.403221 0 0.915103 0.401389 -0.001431 0.915907 -0.179486 0.394446 -0.90122 -0.399172 -0.00463 -0.916864 0.047612 -0.968044 0.246218 0.12443 -0.964681 0.232181 0.006761 -0.99255 -0.121646 -0.007272 0.991737 0.128084 -0.048719 0.96825 -0.245189 -0.125253 0.96419 -0.233773 -0.035654 -0.992187 -0.11956 0.038479 0.991351 0.12547 -0.682974 -0.720974 -0.117231 -0.701894 -0.711088 0.041213 -0.600142 -0.739368 -0.305228 -0.68297 0.720978 -0.11723 -0.688546 0.717609 -0.1046 -0.688847 0.713662 -0.127189 -0.701969 -0.710514 0.049085 -0.679815 0.712672 -0.17306 -0.621535 -0.733801 -0.274281 -0.69669 0.713872 -0.070785 0.999896 0 -0.014387 0.756376 0 0.654137 0.878838 0 -0.477119 -0.045238 0 -0.998976 -0.701101 -0.696924 0.150844 -0.664822 0.702293 -0.25455 -0.54367 -0.735723 -0.403899 -0.730327 0.682332 0.032324 -0.72472 -0.687823 0.040984 -0.716156 -0.69278 0.084713 -0.720966 -0.691196 0.04956 -0.722273 -0.690867 0.031997 -0.655699 -0.702005 -0.277933 -0.613394 -0.713573 -0.338469 -0.643278 -0.703032 -0.303216 -0.656843 -0.697939 -0.285374 -0.702438 0.69642 0.1469 -0.717742 0.68868 0.102792 -0.706759 0.693712 0.13876 -0.700035 0.696709 0.156678 -0.568944 0.729421 -0.379799 -0.620147 0.715824 -0.320956 -0.590567 0.724693 -0.355037 -0.574407 0.729251 -0.37182 -0.509921 -0.295236 0.807971 -0.470534 -0.297465 0.83073 -0.07578 0.326151 -0.942275 -0.127914 0.326528 -0.936492 0.094249 -0.353914 -0.930517 0.143159 -0.354106 -0.924183 -0.653709 0.298282 0.69548 -0.681218 0.292855 0.670953 -0.48044 -0.327387 0.813631 -0.175114 0.348206 -0.920917 0.214593 -0.31509 -0.924482 -0.689504 0.274747 0.670147 -0.663595 -0.289744 0.689703 -0.647598 -0.283072 0.707451 -0.604308 -0.318318 0.730401 -0.50072 0.307588 0.809116 -0.584688 0.293439 0.756329 0.133702 0.338183 -0.931534 0.135367 0.32131 -0.937249 0.006155 0.344347 -0.938822 -0.112851 -0.335504 -0.935255 0.035639 -0.314573 -0.948564 -0.459979 0.000264 0.88793 -0.323529 -0.000977 0.946218 0.460043 0.000287 -0.887897 0.323565 -0.000995 -0.946206 0.955025 0 0.296527 0.983476 0 0.181037 0.272427 0 0.962177 0.272427 0 0.962177 0.998682 0 -0.051324 0.578837 0 -0.815444 0.981846 0 0.18968 0.272427 0 0.962177 0.988705 0 -0.149875 0.999045 0 -0.043693 0.578837 0 -0.815443 0.578837 0 -0.815444 0.998014 0 0.062985 0.998014 0 0.062985 -0.224348 0.009002 0.974468 -0.520839 0.304785 0.797391 -0.486274 0.310635 0.816728 -0.301813 0.003977 0.953359 -0.347529 -0.001624 0.937668 0.223637 0.007784 -0.974642 -0.058293 -0.310568 -0.948762 -0.105224 -0.307719 -0.945641 0.302056 0.003545 -0.953283 0.346782 -0.001549 -0.937944 0.398925 0.004799 0.916971 0.43941 0.001594 0.898285 -0.270638 -0.001732 0.96268 -0.439444 -0.001393 -0.898269 0.270352 -0.00152 -0.96276 0.447354 0.001962 0.894355 0.45724 0 0.889344 0.756377 0 0.654137 -0.442934 0.005773 -0.896536 -0.045238 0 -0.998976 0.474354 -0.001856 -0.880332 0.42723 -0.001506 -0.904142 -0.42792 -0.001582 0.903815 -0.474966 -0.00237 0.880001 -0.342241 0.00293 0.939608 -0.660773 -0.312786 0.682308 -0.686621 -0.309848 0.657682 0.34128 0.002867 -0.939957 0.104847 0.34012 -0.934519 0.153764 0.3375 -0.928682 0.988705 0 -0.149875 0.955025 0 0.296525 -0.150814 0 -0.988562 0.01418 0 -0.999899 -0.01418 0 0.999899 0.249807 0.003036 0.968291 0.246176 0 0.969225 -0.398482 -0.002336 0.917173 -0.255187 -1.9E-05 0.966892 -0.276289 -0.001499 0.961073 0.397819 -0.001819 -0.917462 0.276206 -0.00108 -0.961098 0.255568 2E-05 -0.966791 -0.172362 0 -0.985034 -0.327044 0 -0.945009 0.211978 0 -0.977274 0.223637 -0.007784 -0.974642 0.578837 0 -0.815443 -0.211978 0 0.977274 -0.224348 -0.009002 0.974468 0.272427 0 0.962177 0.246176 0 0.969225 0.124302 0.002641 0.992241 -0.11769 0.00286 -0.993046 0.999896 0 -0.014387 0.878839 0 -0.477119 -0.065087 -0.000489 0.99788 -0.102415 0 0.994742 -0.135412 -0.376176 0.9166 0.148083 0.000532 -0.988975 -0.147988 0.000679 0.988989 0.065325 -0.000623 -0.997864 0.102415 0 -0.994742 0.133037 0.413949 -0.900526 -0.028388 -0.967977 0.249428 0.428274 -0.395033 0.81273 -0.371506 0.000512 -0.92843 -0.403221 0 -0.915103 0.027921 0.969039 -0.245325 -0.435192 0.358567 -0.825856 -0.435192 -0.358567 -0.825856 0.428274 0.395033 0.81273 -0.301133 0.01055 0.953524 0.299943 0.009452 -0.95391 0.443352 -0.006228 0.896326 0.45724 0 0.889344 -0.447566 -0.009202 -0.894204 0.756377 0 0.654137 0.756376 0 0.654137 -0.045238 0 -0.998976 -0.045238 0 -0.998976 -0.472557 -0.332992 0.81597 -0.175436 0.335453 -0.925577 0.226264 -0.314747 -0.921813 -0.698882 0.277376 0.659263 0.987089 0 0.160175 0.988705 0 -0.149875 0.578837 0 -0.815444 0.955025 0 0.296525 0.272427 0 0.962176 0.999677 0 -0.025396 -0.211978 0 0.977274 0.211978 0 -0.977274 0.448041 0.009534 0.893962 -0.45724 0 -0.889343 0.474827 0.002704 -0.880075 0.488961 -0.000227 -0.872306 -0.475425 0.003384 0.87975 -0.488958 -0.000213 0.872307 0.207613 0.002299 -0.978208 -0.207873 0.002368 0.978153 -0.45724 0 -0.889343 -0.398986 0.003349 0.916951 0.398337 0.002665 -0.917235",
            texcoord: "-3.661734 1.934158 -3.576453 1.934158 -2.765254 1.934158 -7.128298 1.934158 -7.13516 1.934158 -8.027132 1.934158 -8.893265 2.656382 -8.926018 2.656382 -8.893265 1.934158 -8.936935 4.100831 -8.904182 4.100831 -8.936935 4.823055 -10.09473 3.617291 -10.15459 3.617291 -9.518818 4.220173 -12.58926 1.205764 -12.47651 1.205764 -13.11187 0.602882 -12.43892 -1.205764 -12.55167 -1.205764 -13.07002 -0.602882 -10.17454 -3.617291 -10.11468 -3.617291 -9.534266 -4.220173 -8.893265 -4.100831 -8.926018 -4.100831 -8.893265 -4.823055 -8.936935 -2.656382 -8.904182 -2.656382 -8.936935 -1.934158 -7.137447 -1.934158 -7.130586 -1.934158 -8.022809 -1.934158 -3.548026 -1.934158 -3.633307 -1.934158 -2.730476 -1.934158 -1.988704 -0.967079 -1.865676 -0.967079 -1.988704 -1.934158 -1.824667 0.967079 -1.947695 0.967079 -1.824667 1.934158 -5.873344 0 -5.027407 -0.356852 -5.449535 -0.89213 -6.724574 -0.713704 -6.724574 0.178426 -10.63674 -2.378848 -9.848684 -2.230201 -10.18744 -2.854617 -11.30471 -0.89208 -11.52556 0.118917 -10.86025 0.178376 -9.281256 1.427409 -8.431409 1.070556 -8.872764 0.505524 -10.92353 2.378848 -10.06475 2.230201 -10.43391 2.854617 -8.520256 -1.070556 -9.001227 -0.505524 -9.446386 -1.427409 -11.89214 -0.118917 -11.16711 -0.178376 -11.65147 0.89208 -3.897718 1.427409 -4.810712 0.713704 -3.897718 0.535278 -8.520256 0.356852 -9.480783 0.059509 -4.518802 1.934158 -3.84816 1.807471 -4.688249 1.807471 -6.39343 1.807471 -7.137447 1.934158 -6.259595 1.934158 -5.395757 1.807471 -4.483088 1.807471 -5.323885 1.934158 -8.936935 1.934158 -9.084376 1.807471 -8.162754 1.807471 -8.970453 3.188151 -8.970453 3.878491 -8.893265 3.378607 -8.970453 1.807471 -8.970453 2.497811 -9.084376 3.878491 -8.936935 3.378607 -9.084376 2.497811 -8.936935 2.656382 -9.084376 3.188151 -13.29437 0 -13.5666 0 -13.00723 0.602882 -10.63004 2.855519 -10.6063 3.014409 -10.08037 3.426623 -9.084376 4.56883 -8.936935 4.823055 -9.557438 4.220173 -12.03333 1.713311 -12.07247 1.713311 -12.60672 1.142208 -8.970453 -4.56883 -8.893265 -4.823055 -9.495646 -4.220173 -11.71491 -1.713311 -11.86662 -1.713311 -12.24854 -1.142208 -13.73048 0 -13.75086 0 -13.17466 -0.602882 -10.86763 -2.855519 -10.75352 -3.014409 -10.27699 -3.426623 -8.970453 -3.878491 -8.893265 -3.378607 -8.970453 -2.497811 -8.893265 -2.656382 -8.970453 -3.188151 -9.084377 -3.188151 -9.084377 -3.878491 -8.936935 -3.378607 -9.084376 -1.807471 -9.084377 -2.497811 -5.537627 -1.807471 -4.688249 -1.807471 -5.385731 -1.934158 -8.893265 -1.934158 -8.970453 -1.807471 -8.112742 -1.807471 -4.430876 -1.934158 -3.5804 -1.807471 -4.483088 -1.807471 -6.315329 -1.807471 -7.128298 -1.934158 -6.224038 -1.934158 -2.207146 1.807471 -1.988704 1.934158 -1.988704 0.967079 -1.988704 0 -2.207146 -0.903735 -1.817107 -1.807471 -1.824667 -1.934158 -1.824667 -0.967079 -1.824667 0 -1.817107 0.903735 -4.688249 1.807471 -4.189613 1.427409 -5.027407 1.427409 -6.724574 1.427409 -7.252768 1.807471 -6.39343 1.807471 -5.732581 1.427409 -4.810712 1.427409 -5.395757 1.807471 -9.084376 1.807471 -9.446386 1.427409 -8.520256 1.427409 -9.281256 3.806156 -8.970453 4.56883 -8.970453 3.878491 -8.970453 3.188151 -8.970453 2.497811 -9.281256 2.616782 -9.446386 3.806156 -9.446386 2.616782 -9.084376 3.188151 -9.084376 1.807471 -9.084376 2.497811 -12.82791 0 -13.29437 0 -12.77527 0.571104 -10.63674 2.378848 -10.4525 2.855519 -10.18744 2.854617 -9.446386 3.806156 -9.084376 4.56883 -9.682291 3.997726 -11.89214 1.427309 -12.17113 1.427309 -12.37018 0.951539 -9.281256 -3.806156 -8.970453 -4.56883 -9.526904 -3.997726 -11.52556 -1.427309 -11.81996 -1.427309 -11.96423 -0.951539 -13.31139 0 -13.73048 0 -13.17271 -0.571104 -10.92353 -2.378848 -10.69399 -2.855519 -10.43391 -2.854617 -9.281256 -3.806156 -9.281256 -2.616782 -8.970453 -3.188151 -8.970453 -1.807471 -8.970453 -2.497811 -9.446386 -3.806156 -9.084377 -4.56883 -9.084377 -3.878491 -9.084377 -3.188151 -9.084377 -2.497811 -9.446386 -2.616782 -5.873344 -1.427409 -5.027407 -1.427409 -5.537627 -1.807471 -8.970453 -1.807471 -9.281256 -1.427409 -8.431409 -1.427409 -4.483088 -1.807471 -3.897718 -1.427409 -4.810712 -1.427409 -6.660216 -1.427409 -7.238699 -1.807471 -6.315329 -1.807471 -2.549731 1.427409 -2.207146 1.807471 -2.207146 0.903735 -2.207146 0 -2.207146 -0.903735 -2.549731 -0.713704 -2.11064 -1.427409 -1.817107 -1.807471 -1.817107 -0.903735 -1.817107 0 -1.817107 0.903735 -2.11064 0.713704 -6.660216 0.713704 -6.660216 -0.178426 -5.732581 0 -3.445514 -0.178426 -3.897718 -0.713704 -3.362792 0.356852 -2.549731 0 -2.954369 -0.535278 -9.312819 -0.059509 -8.431409 -0.356852 -4.810712 -1.070556 -3.897718 -1.427409 -8.520256 -1.427409 -8.162754 -1.807471 -7.590487 -1.427409 -7.578222 0.713704 -6.724574 1.070556 -3.362792 -1.427409 -3.84816 -1.807471 -4.189613 -1.427409 -7.590487 -0.713704 -6.660216 -1.070556 -2.996681 1.427409 -3.5804 1.807471 -3.897718 1.427409 -5.027407 0.713704 -4.189613 0.535278 -8.431409 1.427409 -8.112742 1.807471 -7.578222 1.427409 -2.996681 -1.427409 -3.5804 -1.807471 -2.69074 -1.807471 -8.162754 -1.807471 -8.033616 -1.934158 -7.238699 -1.807471 -7.578222 -1.427409 -6.724574 -1.427409 -7.252768 -1.807471 -3.020194 -1.807471 -3.661734 -1.934158 -3.84816 -1.807471 -7.590487 1.427409 -6.660216 1.427409 -7.238699 1.807471 -2.69074 1.807471 -3.548026 1.934158 -3.5804 1.807471 -3.362792 1.427409 -3.84816 1.807471 -3.020194 1.807471 -8.112742 1.807471 -8.016325 1.934158 -7.252768 1.807471 -4.507811 -1.934158 -6.228482 -1.934158 -6.259595 -1.934158 -6.25515 1.934158 -6.224038 1.934158 -4.441867 1.934158 -2.69074 -1.807471 -2.678311 -1.934158 -7.252768 -1.807471 -6.393429 -1.807471 -7.238699 1.807471 -6.315328 1.807471 -3.020194 1.807471 -2.817419 1.934158 -11.97896 -1.808646 -11.86259 -1.808646 -10.70176 -3.014409 -10.78725 -3.014409 -12.58926 -1.205764 -11.35647 -2.411528 -11.39459 -2.411528 -10.09473 -3.617291 -11.29123 -2.284415 -11.27915 -2.411528 -10.77504 3.014409 -10.68955 3.014409 -11.87921 1.808646 -11.99558 1.808646 -10.17454 3.617291 -11.49164 2.284415 -11.39459 2.411528 -12.43892 1.205764 -11.16275 2.411528 -11.27915 2.411528 -11.95658 -1.808646 -12.5529 -1.205764 -11.99558 -1.808646 -10.14866 -3.617291 -9.542821 -4.220173 -9.682291 -3.997726 -11.71057 1.808646 -12.24896 1.205764 -11.86259 1.808646 -10.04201 3.617291 -9.47072 4.220173 -9.526904 3.997726 -10.71301 -2.855519 -10.13286 -3.426623 -10.68955 -3.014409 -12.43826 -1.142208 -13.00522 -0.571104 -12.77527 -0.571104 -10.90153 2.855519 -10.30302 3.426623 -10.78725 3.014409 -12.64318 1.142208 -13.20291 0.571104 -13.17271 0.571104 -12.03333 -1.713311 -11.22565 -2.284415 -11.45336 -2.284415 -10.86763 -2.855519 -10.63004 -2.855519 -11.31869 -1.903078 -11.17515 -2.284415 -11.71491 -1.713311 -10.86763 2.855519 -11.63703 1.903078 -11.45335 2.284415 -12.03333 1.713311 -11.71491 1.713311 -10.93852 2.284415 -11.17515 2.284415 -10.63004 2.855519 -11.75383 -1.713311 -12.27792 -1.142208 -12.03333 -1.713311 -10.15948 -3.426623 -9.62273 -3.997726 -9.941363 -3.330387 -11.41961 1.713311 -11.89523 1.142208 -11.71491 1.713311 -9.962106 3.426623 -9.467902 3.997726 -9.735464 3.330387 -10.30517 -2.854617 -10.08037 -3.426623 -10.63004 -2.855519 -12.31675 -0.951539 -12.80842 -0.475769 -12.39848 -0.475769 -10.55123 2.854617 -10.27699 3.426623 -10.86763 2.855519 -12.6985 0.951539 -13.21849 0.475769 -12.84341 0.475769 -11.89214 -1.427309 -9.941363 -2.141013 -10.43391 -2.854617 -9.446386 -2.616782 -11.09684 2.378848 -10.92353 2.378848 -12.37018 -0.951539 -11.65147 -1.010998 -11.52556 1.427309 -9.281256 2.616782 -9.735464 2.141013 -10.18744 2.854617 -10.81354 -2.378848 -10.63674 -2.378848 -11.96423 0.951539 -11.30471 1.010998 -5.732581 -1.427409 -5.27073 -0.535278 -2.996681 0.356852 -2.551599 -0.535278 -7.590487 -1.427409 -5.732581 1.427409 -6.660216 1.427409 -4.189613 -0.713704 -3.362792 -1.070556 -4.189613 -1.427409 -5.873344 1.427409 -5.027407 1.427409 -7.578222 1.427409 -6.724574 -1.427409 -5.873344 -1.427409 -1.906686 0 -1.817107 1.807471 -2.207146 -1.807471 -6.660216 -1.427409 -9.084376 -1.807471 -7.578222 -0.535278 -8.431409 -1.427409 -6.393429 -1.807471 -8.520256 1.427409 -7.590487 0.535278 -6.315328 1.807471 -6.724574 1.427409 -8.970453 1.807471 -5.732581 -1.427409 -8.936935 -1.934158 -5.323884 -1.934158 -2.11064 -1.427409 -8.112742 -1.807471 -5.027407 -1.427409 -3.020194 -1.807471 -2.549731 -1.427409 -8.162754 1.807471 -5.732581 0.713704 -2.69074 1.807471 -2.11064 1.427409 -5.873344 1.427409 -8.893265 1.934158 -5.38573 1.934158 -2.549731 1.427409 -5.354808 -1.934158 -1.988704 -1.934158 -1.824667 -1.934158 -5.354807 1.934158 -1.824667 1.934158 -1.988704 1.934158 -4.688249 -1.807471 -2.817419 -1.934158 -2.207146 -1.807471 -4.483088 1.807471 -2.678311 1.934158 -1.817107 1.807471 -9.446386 1.427409 -9.446386 2.616782 -9.941363 -0.832622 -10.92353 -1.070456 -10.43391 -1.665243 -9.281256 -1.427409 -9.281256 -2.616782 -10.18744 1.665243 -9.735464 0.832622 -10.63674 1.070456 -5.395757 -1.807471 -2.996681 -1.427409 -2.996681 -1.070556 -5.537628 1.807471 -3.362792 1.427409 -5.395757 -1.807471 -1.817107 -1.807471 -8.016326 -1.934158 -8.033616 1.934158 -5.537628 1.807471 -2.207146 1.807471 -4.518802 -1.934158 -4.430877 1.934158 -11.33687 -2.411528 -8.936935 -4.823055 -13.5666 0 -11.33687 2.411528 -13.75086 0 -8.893265 4.823055 -9.557438 -4.220173 -9.495646 4.220173 -13.00723 -0.602882 -13.17466 0.602882 -1.817107 -0.903735 -2.11064 1.427409 -2.207146 0.903735 -2.549731 -1.427409 -9.084377 -4.56883 -8.970453 4.56883 -13.29437 0 -13.73048 0 -13.14452 -0.602882 -11.45336 -2.284415 -12.60672 -1.142208 -13.17271 -0.571104 -9.551704 -3.997726 -11.17515 -2.284415 -10.08037 -3.426623 -9.526904 -3.997726 -9.696997 3.997726 -11.45335 2.284415 -10.27699 3.426623 -9.682291 3.997726 -12.77714 0.602882 -11.17515 2.284415 -12.24854 1.142208 -12.77527 0.571104 -10.27699 -3.426623 -9.682291 -3.997726 -10.08037 3.426623 -9.526904 3.997726 -12.24854 -1.142208 -12.77527 -0.571104 -12.60672 1.142208 -13.17271 0.571104 -9.446386 -3.806156 -9.281256 3.806156 -12.82791 0 -13.31139 0 -12.79731 -0.571104 -12.60672 -1.142208 -11.40977 -1.903078 -10.00085 3.330387 -11.40977 1.903078 -12.36484 0.571104 -12.24854 1.142208 -11.08292 1.903078 -9.794194 -3.330387 -11.08292 -1.903078 -12.60742 -0.059459 -10.92353 0.832622 -12.18193 0.059459 -10.63674 -0.832622 -9.084377 -4.56883 -8.936935 -4.100831 -9.446386 -1.427409 -9.084376 -1.807471 -8.893265 -1.934158 -8.970453 -3.878491 -8.936935 1.934158 -9.084376 3.878491 -8.970453 4.56883 -8.893265 4.100831 -9.281256 1.427409 -8.970453 1.807471 -8.9151 -3.378607 -8.9151 3.378607 -9.941363 -3.330387 -10.43391 2.854617 -9.941363 3.330387 -10.67911 1.843619 -11.40977 1.903078 -9.735464 3.330387 -10.18744 -2.854617 -9.735464 -3.330387 -10.41245 -1.843619 -11.08292 -1.903078 -2.996681 1.427409 -2.551599 0.89213 -10.44242 1.144842 -2.954369 0.89213 -10.19525 -1.144842 -2.11064 0 -2.11064 0.713704 -2.11064 -0.713704 -2.549731 -1.427409 -2.549731 0.713704 -12.39848 -0.475769 -11.96423 -0.951539 -12.37018 0.951539 -12.84341 0.475769 -11.40977 -1.903078 -12.37018 -0.951539 -12.84341 -0.475769 -11.08292 1.903078 -11.96423 0.951539 -12.39848 0.475769 -8.970453 -4.56883 -9.084376 4.56883 -5.873344 -0.713704 -7.578222 -1.427409 -7.590487 1.427409 -4.810712 -0.178426 -4.810712 1.427409 -11.89214 1.427309 -10.20505 0.446065 -10.43391 -0.237835 -11.52556 -1.427309 -10.18744 0.237835 -9.977429 -0.446065 -5.873344 0.713704 -4.189613 1.427409 -9.281256 -3.806156 -9.735464 -3.330387 -9.281256 -1.427409 -9.446386 3.806156 -9.941363 3.330387 -9.446386 1.427409 -4.810712 -1.427409 -6.195873 -0.535278 -6.298477 0.535278 -1.817107 0 -2.207146 0 -8.055631 -0.178426 -8.520256 -1.427409 -9.446386 -1.427409 -8.85693 -0.89213 -8.983972 0.89213 -8.005053 0.178426 -8.431409 1.427409 -9.281256 1.427409 -9.084376 -1.807471 -1.817107 -1.807471 -3.774655 -0.178426 -3.362792 -1.427409 -8.970453 1.807471 -2.207146 1.807471 -2.207146 -1.807471 -1.817107 1.807471 -10.92353 -2.378848 -10.63674 2.378848 -2.11064 -1.427409 -2.11064 -0.713704 -2.549731 1.427409 -2.11064 0 -1.817107 1.807471 -2.549731 0 -2.207146 -1.807471 -9.084377 -4.56883 -8.970453 4.56883 -13.29437 0 -13.73048 0 -8.936935 -4.823055 -8.970453 -1.807471 -8.970453 -4.56883 -9.084376 1.807471 -9.084376 4.56883 -8.893265 4.823055 -9.446386 -3.806156 -9.281256 3.806156 -2.11064 1.427409 -2.549731 0.713704 -12.39848 0.475769 -12.82791 0 -12.84341 -0.475769 -13.31139 0 -9.418642 -0.669098 -9.596104 0.669098 -2.549731 -0.713704 -11.89214 -1.427309 -11.52556 1.427309"
        });

        this.geo.defs["d_arrow"] = arr;
    },

    // ------------------------------------------------------------------------
    // --- General Helpers ---
    // ------------------------------------------------------------------------  
    /** 
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @private
     *  
     *  @param {string} side the name of the side where to attach an arrow group. 
     */   
    _addArrowGroup: function(side)
    {
        // the group node 
        var opts = {};
        
        var id = "arrow_" + side; 

        opts.id = this.globalID(id);
        opts.transform = "#" + this.globalID("t_" + id);
        opts.shader = "#" + this.globalID("s_arrow"); // general shaders for all arrows

        var grp = XMOT.creation.element("group", opts);

        // the mesh child
        var arrMeshOpts = {src: "#" + this.globalID("d_arrow")};
        var mesh = XMOT.creation.element("mesh", arrMeshOpts);
        
        grp.appendChild(mesh);

        this._arrows[side] = grp;
    },
    
    /** Returns true if the given element is a mesh node 
     *  and points to arrow geometry. 
     *  
     *  @this {XMOT.interaction.widgets.RotatorBox} 
     *  @private
     *  
     *  @param {!Object} el
     *  @return {boolean}
     */
    _isArrowMesh: function(el)
    {
        if(el.tagName !== "mesh")
            return false; 
        
        if(!el.src)
            return false; 
        
        var srcRef = "#" + this.globalID("d_arrow"); 
        if(el.src === srcRef)
            return true; 
        
        return false; 
    }
});
