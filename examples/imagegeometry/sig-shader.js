XML3D.shaders.register("sig-eyelight", {

    vertex : [
        "attribute vec2 texcoord;",

		"uniform sampler2D normalTex;",
		"uniform sampler2D positionTex;",
		"uniform sampler2D texcoordTex;",
		"uniform vec3 boundingBox[2];",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec2 fragTexCoord;",

        "uniform mat4 modelViewProjectionMatrix;",
        "uniform mat4 modelViewMatrix;",
        "uniform mat3 normalMatrix;",

        "void main(void) {",
		"	vec3 normal;",
		"	// SiSGetFloat3FromPixels",
		"	normal = texture2D(normalTex, texcoord).rgb;",

		"	vec3 positionTmp;",
		"	// SiSGetFloat3FromPixels",
		"	positionTmp = texture2D(positionTex, texcoord).rgb;",

		"	vec2 texCoordComp;",
		"	// SiSGetFloat2FromPixels ",
		"	vec4 IG_doubleTexCoords = texture2D( texcoordTex, texcoord );",
		"	vec2 vertTexCoord;",
		"	texCoordComp.r = (IG_doubleTexCoords.r * 0.996108948) + (IG_doubleTexCoords.b * 0.003891051);",
		"	texCoordComp.g = (IG_doubleTexCoords.g * 0.996108948) + (IG_doubleTexCoords.a * 0.003891051);",

		"	vec3 direction;",
		"	// SiSGetIGDirection ",
		"	direction = normal.rgb * 2.0 - 1.0;",

		"	vec3 position;",
		"	// SiSGetIGPosition ",
		"	position = positionTmp * (boundingBox[1] - boundingBox[0]) + boundingBox[0];",

		"	// Connector",
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);",
        "    fragNormal = normalize(normalMatrix * direction);",
        "    fragVertexPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;",
        "    fragTexCoord = texCoordComp;",
        "}"
    ].join("\n"),

    fragment : [
        "#ifdef GL_ES",
          "precision highp float;",
        "#endif",

        "uniform float ambientIntensity;",
        "uniform vec3 diffuseColor;",
        "uniform vec3 emissiveColor;",
        "uniform float shininess;",
        "uniform vec3 specularColor;",
        "uniform float transparency;",
        "uniform mat4 viewMatrix;",
        
        "#if HAS_DIFFUSETEXTURE",
        "  uniform sampler2D diffuseTexture;",
        "#endif",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec2 fragTexCoord;",

        "void main(void) {",
        "  vec3 objDiffuse = diffuseColor;",
        "  float alpha = max(0.0, 1.0 - transparency);",
        "  #if HAS_DIFFUSETEXTURE",
        "    vec4 texDiffuse = texture2D(diffuseTexture, fragTexCoord);",
        "    objDiffuse *= texDiffuse.rgb;",
        "    alpha *= texDiffuse.a;",
        "  #endif",
        
        "  if (alpha < 0.005) discard;",

        "  vec3 color = emissiveColor + (ambientIntensity * objDiffuse);\n",
        
        "  vec3 L = normalize(-fragVertexPosition);",     
        "  vec3 N = normalize(fragNormal);",     
        "  float diffuse = max(0.0, dot(N, L)) ;",
        "  float specular = pow(max(0.0, dot(N, L)), shininess*128.0);",

        "  color = color + diffuse*objDiffuse + specular*specularColor;",
        "  gl_FragColor = vec4(color, alpha);",
        "}"
    ].join("\n"),

    addDirectives: function(directives, lights, params) { 
        directives.push("HAS_DIFFUSETEXTURE " + ('diffuseTexture' in params ? "1" : "0"));
    },

    uniforms: {
        diffuseColor    : [1.0, 1.0, 1.0],
        emissiveColor   : [0.0, 0.0, 0.0],
        specularColor   : [1.0, 1.0, 1.0],
        transparency    : 0.0,
        shininess       : 0.5,
        ambientIntensity: 0.0,
        useVertexColor : false,
		boundingBox : [-1, -1, -1, 1 , 1, 1 ]
    },

    samplers: { 
        diffuseTexture : null
    },

	meshRequest : {
		texcoord : { required: true },
		normalTex: null,
		positionTex: null,
		texcoordTex: null,
		vertexCount: null
	}
});