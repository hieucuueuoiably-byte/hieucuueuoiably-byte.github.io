/** Source: ponpon-mania.com/_nuxt/CfE0pqJa.js: DJ → UJ and St → Pw.
 * Original public frontend source; adapted for Three.js injected attributes and output colour space.
 */
export const READER_BACKGROUND = /* glsl */ `varying vec2 vUv;
uniform float uAlpha;
uniform float uProgress;
uniform float uVelocity;
uniform float uTime;
uniform vec2 uResolution;
uniform float uDpr;
uniform sampler2D tFluid;
uniform vec3 uColor1;
uniform vec3 uColor2;
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
  {
  const vec4 C = vec4(0.211324865405187,  
                      0.366025403784439,  
                     -0.577350269189626,  
                      0.024390243902439); 

  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  vec2 i1;
  
  
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  
  
  
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  i = mod289(i); 
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 hash2(vec2 p) {
   vec2 h = vec2(0.0);
    h.x = fract(sin(dot(p + vec2(0.0, 13.1), vec2(127.1, 311.7))) * 43758.5453123);
    h.y = fract(sin(dot(p + vec2(13.1, 0.0), vec2(269.5, 183.3))) * 43758.5453123);
    return h * 2.0 - 1.0;
}

vec2 hash2v1(vec2 p) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

vec2 hash2v2(vec2 p) {
    vec2 h = vec2(0.0);
    h.x = fract(sin(dot(p + vec2(0.0, 13.1), vec2(127.1, 311.7))) * 43758.5453123);
    h.y = fract(sin(dot(p + vec2(13.1, 0.0), vec2(269.5, 183.3))) * 43758.5453123);
    return h * 2.0 - 1.0;
}

#define NUM_OCTAVES 2

float fbm(vec2 x, float time) {
    float v = 0.1;
    float a = 1.9;
    vec2 shift = vec2(.1);
    mat2 rot = mat2(cos(0.1), sin(0.5), -sin(0.3), cos(0.5));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * snoise(x * .9 * float(i) * 10.);
        x = rot * x * 0.1 + shift + time * 0.000001;
        a *= .9;
    }
    return v;
}

void main() {
    vec2 uv = vUv;
    vec4 fluid = texture2D(tFluid, uv);
    float aspect = uResolution.x / uResolution.y;
    float sTime = mod(floor(uTime * 0.01) * 5., 10.);

    vec2 sUv = uv;
    sUv.x -= fluid.r * 0.0001;
    sUv.y -= fluid.g * 0.0001;
    sUv.x *= aspect;

    float sNoise = fbm(sUv *  1.1 + uTime * 0.000001 + vec2(uProgress * 0.8 - 0.3, 0.), uTime);
    float lineNoise = snoise(sUv * vec2(4., 200.) + uTime * 0.00005 + vec2(uProgress * 10., 0.));

    vec2 hash = hash2(vUv * 10. + sTime) * cmap(uDpr, 1.1, 2., 0.5, 1.);

    float sinVal = sin(uTime * 0.002 + vUv.x * 14. + vUv.y * 14. ) ;

    vec3 finalColor = uColor2;
    if(sNoise  > 0.1) {
        finalColor = mix(uColor1, uColor2, hash.y);
    } 

    if(sNoise > 0.4 - sinVal * 0.1) {
        finalColor.rgb = uColor2;
    }

    vec2 hashY = hash2(vec2(vUv.y * 1000., 0.));

    float lineVelocity = cmap(abs(uVelocity), 1., 24., 0.0, 1.);

    finalColor = mix(finalColor, vec3(0.), cmap(hashY.x * lineNoise, 0.8, .82, 0., 1.) * lineVelocity);
    finalColor = mix(finalColor, vec3(1.), fluid.z * 0.01);
    finalColor = mix(finalColor, uColor1 + hash.x, fluid.z * 0.01);
    
    gl_FragColor = vec4(finalColor, uAlpha);
    #include <colorspace_fragment>
}`

export const READER_PAPER_VERTEX = /* glsl */ `uniform vec2 uSeed;
uniform vec2 uMouse;
uniform float uTime;
uniform float uHover;
uniform float uRatio;
uniform float uVelocity;

varying vec2 vUv;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
float easeIn(float t) {
  return t * t;
}

float easeOut(float t) {
  return 1. - (1. - t) * (1. - t);
}

void main() {
    vUv = uv;
    vec3 pos = position;

    vec2 mouse = vec2(
        cmap(uMouse.x, -.5, .5, 0., 1.),
        cmap(uMouse.y, -.5, .5, 0., 1.)
    );

    float d = distance(vUv, mouse);
    float centerDist = cmap(distance(vec2(0.5), uv), .7, 0., 0., 1.);

    pos.z += cmap(d, 0., .5, 1., 0.) * -0.3 / uRatio * uHover * centerDist;
    pos.z += sin(uTime + uv.x * 4. + uv.y * 4. + uSeed.x * 3.2) * 0.02;

    
    vec4 screenPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    
    pos.z -= easeIn(cmap(abs(screenPos.x ), 0., 8., 0., 1.)) * (.5 + (uVelocity) * -.05);

    float curve = cmap(easeOut(cmap(abs(pos.y ), 4., 0.1, 0., 1.)), 0., 1., 0., -2.7);
    pos.x *= (1. + abs(uVelocity) * .0003 * curve);
    pos.y *= (1. - abs(uVelocity) * 0.002 * curve);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`
