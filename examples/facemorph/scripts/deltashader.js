
XML3D.shaders.register("deltashader", {

    vertex : [
        "attribute vec3 position;",
        "attribute vec3 normal;",
        "attribute vec3 tangent;",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragModelPosition;",
        "varying vec3 fragReference;",

        "uniform mat4 modelViewProjectionMatrix;",
        "uniform mat4 modelViewMatrix;",
        "uniform mat4 modelMatrix;",
        "uniform mat3 normalMatrix;",

        "void main(void) {",
        "    fragNormal = normalize(normalMatrix * normal);",
        "    fragVertexPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;",
        "    fragReference = tangent;",
        "    fragModelPosition = position;",
        "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n"),

    fragment : [
        "precision mediump float;",

        "uniform float shininess;",
        "uniform vec3 specularColor;",
        "uniform vec3 diffuseColor;",

        "varying vec3 fragNormal;",
        "varying vec3 fragVertexPosition;",
        "varying vec3 fragModelPosition;",
        "varying vec3 fragReference;",
        
        "uniform vec3 pointLightAttenuation[1];",
        "uniform vec3 pointLightPosition[1];",
        "uniform vec3 pointLightIntensity[1];",
        "uniform vec3 pointLightVisibility[1];",
        "uniform mat4 viewMatrix;",

        "void main(void) {",
        "  vec3 color = vec3(0.0);",
        "  float delta = length(fragModelPosition - fragReference);",
        "  vec3 deltaColor = mix(vec3(0.3, 0.9, 0.3), vec3(0.9, 0.3, 0.3), delta * 2.0);",
          
         //Phong shading
        "  vec4 lPosition = viewMatrix * vec4( pointLightPosition[0], 1.0 );",
        "  vec3 L = lPosition.xyz - fragVertexPosition;",
        "  float dist = length(L);",
        "  L = normalize(L);",
        "  vec3 R = normalize(reflect(L,fragNormal));",
        "  float atten = 1.0 / (pointLightAttenuation[0].x + pointLightAttenuation[0].y * dist + pointLightAttenuation[0].z * dist * dist);",
        "  vec3 Idiff = pointLightIntensity[0] * max(dot(fragNormal,L),0.0) * deltaColor;",
        "  vec3 Ispec = specularColor * pow(max(dot(R, normalize(fragVertexPosition)),0.0), shininess*128.0) * pointLightIntensity[0];",
          
        "  color = color + (atten*(Idiff + Ispec)) * pointLightVisibility[0];",
           
        "  gl_FragColor = vec4(color, 1.0);",
        "}"
    ].join("\n"),

    addDirectives: function(directives, lights, params) {
    },

    uniforms: {
        shininess    : 0.5,
        specularColor : [0.0, 0.0, 0.0],
        diffuseColor  : [0.7, 0.7, 1.0]
    },

    samplers: {
    }
});