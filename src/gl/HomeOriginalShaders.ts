/**
 * Selected, AST-extracted home-scene GLSL from the publicly served reference.
 * Source: https://ponpon-mania.com/_nuxt/CfE0pqJa.js
 * Bundle SHA-256: cee45771d42378e6904bf88703ecf08528dcd42553a05dbf48fb192640e664e6
 * Original artwork and shader code remain the reference authors' work.
 * These GLSL bodies preserve original uniforms and formulas; HomeScene supplies
 * the Three.js vertex bindings, runtime uniforms, and output-color handling.
 * REFERENCE_BASE_VERTEX declares OGL attributes: do not use it unmodified in
 * Three ShaderMaterial, which automatically declares those attributes.
 */

// Reference symbol: XJ
export const PORTAL_FRAGMENT = `uniform sampler2D tMap;
uniform sampler2D tFluid;
uniform sampler2D tMask;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntro;
uniform float uStageWidth;
uniform float uHovered;
uniform vec3 uBackgroundColor;  
uniform vec3 uOutlineColor;
varying vec2 vUv;
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 uvFromTextureSize(vec2 uv, vec2 textureSize, vec2 viewportSize) {
  uv = uv * 2. - 1.;
  uv.x *= min(1., (viewportSize.x * textureSize.y) / (viewportSize.y * textureSize.x));
  uv.y *= min(1., (viewportSize.y * textureSize.x) / (viewportSize.x * textureSize.y));
  uv = uv * .5 + .5;
  return uv;
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
vec2 rotateUV(vec2 uv, float rot, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 mr = mat3(
        cos(rot), sin(rot), 0,
        -sin(rot), cos(rot), 0,
        0, 0, 1);

    u = u * mo1;
    u = u * mr;
    u = u * mo2;

    return u.xy;
}

vec2 rotateUV(vec2 uv, float rot) {
    return rotateUV(uv, rot, vec2(0.5));
}
vec4 blendScreen(vec4 base, vec4 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

void main() {
    
    vec2 fluidUv = gl_FragCoord.xy / uResolution;

    vec2 uv = vUv;

    vec4 fluid = texture2D(tFluid, fluidUv);

    vec2 tUv = scaleUV(uv, vec2(1.-fluid.z*0.00001));
    

    vec4 texel = texture2D(tMap, tUv);

    texel.g =  texture2D(tMap, tUv + fluid.xy * 0.00002).g;
    texel.g =  texture2D(tMap, tUv + fluid.xy * 0.00002).g;

    texel.rgb *= mix(vec3(1.), vec3(1.), fluid.z * 0.003);

    float s = cmap(uResolution.x/uResolution.y, 0.5, 1., 0.99, 1.1) + sin(uTime * .9) * 0.05;

    s *= uIntro * 1.05 * cmap(uHovered, 0., 1., 1., 1.1);

    if(uResolution.x / uResolution.y < 0.9) {
        s *= 1.5;
    }

    vec2 maskUv = scaleUV(uvFromTextureSize(uv, vec2(2., 1.), uResolution),  vec2(s));
    

    maskUv.x -= 0.003   ;
    maskUv.xy -= fluid.xy * 0.00005;

    float earL = cmap(maskUv.x, 0., .35, 1., 0.0) * cmap(maskUv.y, 0.5, .9, 0., 1.0);
    float earR = cmap(maskUv.x, 0.65, 1., 0., 1.0) * cmap(maskUv.y, 0.5, .9, 0., 1.0);
    float cheekL = cmap(maskUv.y, 0.5, 0.6, 1., 0.0) * cmap(maskUv.x, 0., .5, 1., 0.0);
    float cheekR = cmap(maskUv.y, 0.5, 0.6, 1., 0.0) * cmap(maskUv.x, 0.5,1., 0., 1.0);

    maskUv.y += earL * sin(uTime * 3.) * 0.04;
    maskUv.y += earR * sin(uTime * 3.) * 0.04;
    maskUv.x += earL * sin(uTime * 2.3) * 0.005;
    maskUv.x += earR * sin(uTime * 3.) * 0.005;
    maskUv.x += cheekL * sin(uTime * 3.1) * 0.002;
    maskUv.x -= cheekR * sin(uTime * 3.1) * 0.002;

    maskUv.y += (1.-uIntro) * 0.15;

    vec4 mask = texture2D(tMask, maskUv);

    texel.rgb = mix(texel.rgb, vec3(0.), cmap(uIntro, 0.1, 1., 1., 0.));

    float maskAlpha = min(1., mask.g + mask.r) * mask.a;

    texel.rgb = mix(texel.rgb, uBackgroundColor, 1.-mask.r);
    texel.rgb = mix(texel.rgb, mix(vec3(0.), uOutlineColor, min(1., fluid.z * .23)), mask.g);

    gl_FragColor = vec4(texel.rgb, 1.);
}`;

// Reference symbol: lZ
export const PONPON_FRAGMENT = `uniform sampler2D tMap;
uniform sampler2D tEyes;
varying vec2 vUv;
uniform float uTime;
uniform float uRotation;
uniform float uBlinkToggle;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
vec2 rotateUV(vec2 uv, float rot, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 mr = mat3(
        cos(rot), sin(rot), 0,
        -sin(rot), cos(rot), 0,
        0, 0, 1);

    u = u * mo1;
    u = u * mr;
    u = u * mo2;

    return u.xy;
}

vec2 rotateUV(vec2 uv, float rot) {
    return rotateUV(uv, rot, vec2(0.5));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}
float getUvCropAlpha(vec2 uv, float aa) {
  float alpha = smoothstep(uv.x, uv.x + aa, aa);
  alpha = max(alpha, smoothstep(1.0 - uv.x, 1.0 - uv.x + aa, aa));
  alpha = max(alpha, smoothstep(uv.y, uv.y + aa, aa));
  alpha = max(alpha, smoothstep(1.0 - uv.y, 1.0 - uv.y + aa, aa));
  return 1.0 - alpha;
}

void main() {

    float d = cmap(distance(vUv, vec2(0.5, 0.6)), 0., 0.53, 1., 0.);
    vec2 uv = scaleUV(vUv, vec2(0.9));

    float blinkSin = sin(uTime * 2.5) + sin(uTime * 25.) * 0.23;
    float blink = step(blinkSin, 0.7) * uBlinkToggle;
    float handL = cmap(distance(vUv, vec2(0.115, 0.59)), 0.1, 0.2, 1., 0.);
    float earR = cmap(vUv.x, 0.7, 0.8, 0., 1.0) * cmap(vUv.y, 0.8, 0.81, 0., 1.);
    float earL = cmap(vUv.x, 0.1, 0.12, 0., 1.) * cmap(vUv.x, 0., 0.3, 1., 0.) * (cmap(
        rotateUV(vUv, -0.05).y, 0.67, 0.68, 0., 1.));
    float armL = cmap(vUv.x, 0.0, 0.235, 1., 0.) * cmap(rotateUV(vUv, -0.5).y, 0.69, 0.72, 1., 0.) * cmap(vUv.y, 0.4, 0.4, 0., 1.) - earL * 3.0;
    float armR = cmap(vUv.x, 0.6, 1., 0., 1.) * cmap(vUv.y, 0.3, 0.7 + 0.001, 0., 1.) * cmap(vUv.y, 0.79, 0.791, 1., 0.);

    uv.y += (earL * 0.5 + earR * 0.3) * 0.04 * sin(uTime * 2.);
    uv.x += clamp(armL, 0., 1.) * 0.004 * sin(uTime * 2.);
    uv.y += clamp(armL, 0., 1.) * 0.02 * sin(uTime * 2.3);

    uv.x -= armR * 0.02 * sin(uTime * 2.3);
    uv.y += armR * 0.02 * sin(uTime * 2.3);

    uv.y += cos(uTime * 2.1) * 0.01 * cmap(vUv.y, 0., 1., 0., 1.) * cmap(abs(vUv.x - 0.5), 0.1, 0.5, 1., 0.);
    uv.x += sin(uTime * 1.1) * 0.003 * cmap(vUv.y, 0., 1., 0., 1.) * cmap(abs(vUv.x - 0.5), 0.1, 0.5, 1., 0.);
    

    vec2 eyesUv = scaleUV(uv, vec2( 162./512., 80./512.), vec2(0.5, 0.5));
    eyesUv.x -= -0.002;
    eyesUv.y -= 1.85;
    

    uv = rotateUV(uv, d * 13.01 * (1.-uRotation));

    vec4 eyes = texture2D(tEyes, eyesUv);
    if(eyes.a < 0.9) {
        eyes.a = 0.;
    }
    eyes.rgb = mix(vec3(0.906, 0.71, 0.549), eyes.rgb, eyes.a);
    eyes.a *= getUvCropAlpha(eyesUv, 0.000001);
    eyes.a *= blink;

    vec4 color = texture2D(tMap, uv);
    color = layer(eyes, color);

    color.rgb += max(0., d * 2. * (1. - uRotation));

    if(color.a < 0.01) {
        discard;
    }

    
    gl_FragColor = color;
}`;

// Reference symbol: cZ
export const SIMON_BODY_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}

void main() {

    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;

    float dispX = 0.;
    float dispY = 0.;

    dispY = sin(uTime * 1.1) * 0.02 * vUv.y  * 0.7;
    dispX = sin(uTime * 0.9) * 0.03 * vUv.y  * 0.7;

    float nose = cmap(distance(vUv, vec2(0.52, 0.785)), 0., .1, 1., 0.);
    dispY += nose * sin(uTime * 1.6) * 0.007 * 0.5;
    dispX += nose * sin(uTime * 1.6) * -0.008 * 0.5;

    float nose2 = cmap(distance(vUv, vec2(0.92, 0.812)), 0., .08, 1., 0.);
    dispY += nose2 * sin(uTime * 1.6) * 0.005 * 0.5;
    dispX += nose2 * sin(uTime * 1.6) * 0.005 * 0.5;

    float mouth = cmap(distance(vUv, vec2(0.725, 0.72)), 0., .15, 1., 0.);
    dispY += mouth * sin(uTime * 1.54) * 0.01 * 0.7;
    dispX += mouth * cos(uTime * 1.54) * 0.01  * 0.7;

    float mouth2 = cmap(distance(vUv, vec2(0.492, 0.722)), 0., .15, 1., 0.);
    dispY += mouth2 * sin(uTime * 1.13) * 0.005 * 0.7;
    dispX += mouth2 * cos(uTime * 1.12) * 0.005 * 0.7;

    float tail = cmap(distance(vUv, vec2(0.113, 0.4765)), 0., .15, 1., 0.);
    dispY += tail * sin(uTime * 2.1) * 0.01;
    dispX += tail * cos(uTime * 2.1) * 0.01;

    vec2 bUv = vUv + vec2(dispX, dispY); 

    vec2 bodyUv = bUv;
    bodyUv.x =  cmap(bodyUv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    bodyUv.y =  cmap(bodyUv.y, 0., 1., stY * uIndexY, stY * (uIndexY + 1.));

    vec4 color = texture2D(tMap, bodyUv);

    float blinkSin = cos(uTime * 1.4 + 2.3) + sin(uTime * 16. + 2.) * 0.1;
    float blink = step(blinkSin, 0.5) ;

    vec2 eyesUv = scaleUV(bUv - vec2(0.055, 0.37), vec2(1., 0.5) * 0.5);
    float st = 1./4.;
    float eyeIndex = 2. + blink;
    eyesUv.x = cmap(eyesUv.x, 0., 1., st * eyeIndex, st * (eyeIndex + 1.));
    eyesUv.y = cmap(eyesUv.y, 0., 1., st * 2., st * (2. + 1.));
    vec4 eyes = texture2D(tMap, eyesUv);
    eyes.rgb = mix(vec3(0.22, 0.14, 0.06), eyes.rgb, eyes.a);  
    color = mix(color, eyes, pow(eyes.a, 10.));

    
    float tongueBlink = 1.;

    vec2 tongueUv = scaleUV(bUv - vec2(-0.14, 0.29), vec2(1. *tongueBlink, 0.5) * 0.6);
    tongueUv.x = cmap(tongueUv.x, 0., 1., st * 2., st * (2. + 1.)) - (1.-tongueBlink) * 0.09;
    tongueUv.y = cmap(tongueUv.y, 0., 1., st * 3., st * (3. + 1.));

        

    tongueUv.y += sin(uTime * 2.6 + vUv.x *15.) * 0.0035 * cmap(vUv.x, 0.4, 0.45, 1., 0.);
    tongueUv.x += sin(uTime * 2.3 + 32.5 + vUv.x *5.) * 0.01 * cmap(vUv.x, 0.2, 0.37, 1., 0.);

 
    vec4 tongue = texture2D(tMap, tongueUv);    

    
    
    

    
    color = mix(color, tongue, pow(tongue.a, 10.));

    gl_FragColor = color;
}`;

// Reference symbol: mZ
export const JEAN_LOUP_HEAD_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;
uniform float uBlinkToggle;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vec2 bUv = vUv;
    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;

    float blinkSin = sin(uTime * 1.38 + 1.) + sin(uTime * 16. 
    + 2.) * 0.1;
    float blink = step(blinkSin, 0.7) * uBlinkToggle;

    float indexY = uIndexY + blink;

    bUv.x =  cmap(bUv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    bUv.y =  cmap(bUv.y, 0., 1., stY * indexY, stY * (indexY + 1.));

    float dispX = 0.;
    float dispY = 0.;
    float nose = cmap(distance(vec2(0.328, 0.2663), vUv), 0.05, 0.3, 1., 0.);
    float mouth = cmap(distance(vec2(0.61, 0.25), vUv), 0.0, 0.2, 1., 0.);
    float hair = cmap(distance(vec2(0.51, 0.9), vUv), 0.0, 0.15, 1., 0.);
    float cheekR = cmap(distance(vec2(0.83, 0.21), vUv), 0.0, 0.2, 1., 0.);
    float earL = cmap(distance(vec2(0.32, 0.74), vUv), 0.0, 0.2, 1., 0.);
    float earR = cmap(distance(vec2(0.723, 0.77), vUv), 0.0, 0.2, 1., 0.);

    dispY = sin(uTime * 1.5) * 0.006;

    dispY += nose * sin(uTime * 1.2) * 0.009;
    dispY += mouth * sin(uTime * 0.7) * 0.003;
    dispX += mouth * sin(uTime * 1.) * 0.003;
    dispX += hair * sin(uTime * 1.3) * 0.007;
    dispY += cheekR * cos(uTime * 1.5) * 0.01;
    dispX += earL * cos(uTime * 1.3) * 0.005;
    dispY += earL * cos(uTime * 1.235) * 0.005;
    dispX -= earR * cos(uTime * 1.3) * 0.005;
    dispY += earR * cos(uTime * 1.235) * 0.005;

    

    
    vec2 uv = bUv + vec2(dispX, dispY);
    vec4 color = texture2D(tMap, uv);

    vec3 mouthColor = vec3(0.984, 0.690, 0.231); 
    

    if(distance(color.rgb, mouthColor) < 0.1) {
        color.rgb = mix(mouthColor, vec3(1.) , cmap(sin(uTime * 1.), -0.5, 0.4, 0., .5)); 
    }

    gl_FragColor = color;
}`;

// Reference symbol: Br
export const SPRITE_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vec2 bUv = vUv;
    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;
    bUv.x =  cmap(bUv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    bUv.y =  cmap(bUv.y, 0., 1., stY * uIndexY, stY * (uIndexY + 1.));

    float dispX = 0.;
    float dispY = 0.;

    float replaceMe = 0.0;

    
    vec2 uv = bUv + vec2(dispX, dispY);
    vec4 color = texture2D(tMap, uv);

    
    
    

    gl_FragColor = color;
}`;

// Reference symbol: ey
export const SIMON_ARM_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}

void main() {

    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;

    float dispX = 0.;
    float dispY = 0.;

    dispY = sin(uTime * 1.1) * 0.02;
    dispX = sin(uTime * 0.9) * 0.03;

    vec2 bUv = vUv + vec2(dispX, dispY); 

    vec2 uv = bUv;
    uv.x =  cmap(uv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    uv.y =  cmap(uv.y, 0., 1., stY * uIndexY, stY * (uIndexY + 1.));

    vec4 color = texture2D(tMap, uv);
    vec4 base = color;

    color.a = pow(color.a, 10.);

    float blink = cmap(sin(uTime * 13.15), .5, 1.,0., 1.) * cmap(sin(uTime * 1.), 0.8, 1., 0., 1.);

    float dist = cmap(distance(bUv, vec2(0.69, 0.52)), 0.02,  0.52 * blink, 1., 0.);

    vec4 halo = vec4(1.0, 1.0, 1.0, dist * blink * 0.3);

    color = layer(halo, color);

    color.a = min(1., color.a + base.a);

    gl_FragColor = color;
}`;

// Reference symbol: pZ
export const CREPE_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}

void main() {

    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;

    float dispX = 0.;
    float dispY = 0.;

    dispY = sin(uTime * 1.1) * 0.02;
    dispX = sin(uTime * 0.9) * 0.03;

    vec2 bUv = vUv + vec2(dispX, dispY); 

    vec2 uv = bUv;
    uv.x =  cmap(uv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    uv.y =  cmap(uv.y, 0., 1., stY * uIndexY, stY * (uIndexY + 1.));

    vec4 color = texture2D(tMap, uv);
    vec4 base = color;

    color.a = pow(color.a, 10.);

    float blink = cmap(sin(uTime * 13.15), .5, 1.,0., 1.) * cmap(sin(uTime * 1.), 0.8, 1., 0., 1.);

    float dist = cmap(distance(bUv, vec2(0.69, 0.52)), 0.02,  0.2 * blink, 1., 0.);

    vec4 halo = vec4(1.0, 1.0, 1.0, dist * blink);

    color = layer(halo, color);

    color.a = min(1., color.a + base.a);

    gl_FragColor = color;
}`;

// Reference symbol: hZ
export const SIMON_LEFT_ARM_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}

void main() {

    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;

    float dispX = 0.;
    float dispY = 0.;

    dispY = sin(uTime * 1.1) * 0.02;
    dispX = sin(uTime * 0.9) * 0.03;

    vec2 bUv = vUv + vec2(dispX, dispY); 

    vec2 uv = bUv;
    uv.x =  cmap(uv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    uv.y =  cmap(uv.y, 0., 1., stY * uIndexY, stY * (uIndexY + 1.));

    vec4 color = texture2D(tMap, uv);
    vec4 base = color;

    color.rgb = mix(vec3(0.23, 0.71, 0.29), color.rgb, base.a);
    

    float blink = cmap(sin(uTime * 13.15), .5, 1.,0., 1.) * cmap(sin(uTime * 1.), 0.8, 1., 0., 1.);

    float dist = cmap(distance(bUv, vec2(0.69, 0.52)), 0.02,  0.2 * blink, 1., 0.);

    vec4 halo = vec4(1.0, 1.0, 1.0, dist * blink);

    color = layer(halo, color);

    color.a = min(1., color.a + base.a);

    color.rgb = mix(vec3(0.23, 0.71, 0.29), color.rgb, color.a);

    if(color.a < 0.0001) discard;

    gl_FragColor = color;
}`;

// Reference symbol: fZ
export const BEER_FRAGMENT = `uniform sampler2D tFluid;
uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;
uniform vec2 uResolution;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}

void main() {

    vec2 fluidUv = gl_FragCoord.xy / uResolution;
    vec4 fluid = texture2D(tFluid, fluidUv);

    vec2 bUv = vUv;
    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;

    bUv.y += sin(uTime * 1.5) * 0.06;
    bUv.x =  cmap(bUv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    bUv.y =  cmap(bUv.y, 0., 1., stY * uIndexY, stY * (uIndexY + 1.));

    vec2 waterUV  = scaleUV(bUv,vec2(1.1), vec2(stX * uIndexX + stX/2., stY * uIndexY + stY/2.));

    waterUV.x += sin(uTime * 3.5 + vUv.x * 10.) * 0.005 * cmap(vUv.y, 0.5, 0.6, 0., 1.);
    waterUV.x += sin(uTime * 13.5 + vUv.x * 20. - vUv.y * 10.) * 0.0001 * cmap(vUv.y, 0.7, 1., 0., 1.);
    waterUV.y += sin(uTime * 2.5 + vUv.x * 5. + vUv.y * 2.) * 0.01* cmap(vUv.y, 0.5, 0.6, 0., 1.);
    waterUV.y += sin(uTime * 13.5 + vUv.x * 20. - vUv.y * 10.) * 0.0001 * cmap(vUv.y, 0.7, 1., 0., 1.);
    waterUV -= fluid.xy * 0.00015 * cmap(vUv.y, 0.5, 0.6, 0., 1.) * cmap(vUv.y, 0.6, 0.8, 0., 1.);
    vec4 water = texture2D(tMap,  waterUV);

    
    float bubblePattern = 0.0;
    for(float i = 0.0; i <2.0; i++) {
        vec2 bubbleUV = waterUV * 8.;
        bubbleUV.y -= uTime * (0.2 + i * 0.1); 
        bubbleUV.x += sin(uTime * (1.0 + i * 0.5) + bubbleUV.y * 10.0) * 0.02; 
        
        
        float bubble = distance(fract(bubbleUV * (5.0 + i * 2.0)), vec2(0.5));
        float outerEdge = cmap(bubble, 0.1, 0.2, 0., 1.);
        float innerEdge = cmap(bubble, 0.05, 0.1, 0., 1.);
        bubble =  abs(outerEdge - innerEdge) * 0.1;
        
        bubblePattern += bubble;
    }

    vec4 beerColor = vec4(0.941, 0.086, 0.118, 1.);
    
    water.rgb += vec3(bubblePattern) * cmap(distance(vec4(water.rgb, 1.0), beerColor), 0.0, 0.1, 1.0, 0.0);

    vec4 mask = texture2D(tMap, bUv + vec2(stX, 0.));
    
    vec4 outline = texture2D(tMap, bUv + vec2(stX, stY));

    water.a *= 1.-(mask.g * mask.a);

    if(waterUV.x < stX * uIndexX || waterUV.y < stY * uIndexY || waterUV.x > stX * (uIndexX + 1.) || waterUV.y > stY * (uIndexY + 1.)) {
       discard;
    }
    

    vec4 color = layer(outline, water);

    
    
    

    gl_FragColor = color;
}`;

// Reference symbol: vZ
export const TRAY_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uIndexX;
uniform float uIndexY;
uniform float uSpriteWidth;
uniform float uSpriteHeight;
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vec2 bUv = vUv;
    float stX = 1./uSpriteWidth;
    float stY = 1./uSpriteHeight;
    bUv.x =  cmap(bUv.x, 0., 1., stX * uIndexX, stX * (uIndexX + 1.));
    bUv.y =  cmap(bUv.y, 0., 1., stY * uIndexY, stY * (uIndexY + 1.));

    float dispX = 0.;
    float dispY = 0.;

    float replaceMe = 0.0;

        
    float bubblePattern = 0.0;
    for(float i = 0.0; i <2.0; i++) {
        vec2 bubbleUV = bUv * 8.;
        bubbleUV.y -= uTime * (0.2 + i * 0.1); 
        bubbleUV.x += sin(uTime * (1.0 + i * 0.5) + bubbleUV.y * 10.0) * 0.02; 
        
        
        float bubble = distance(fract(bubbleUV * (5.0 + i * 2.0)), vec2(0.5));
        float outerEdge = cmap(bubble, 0.1, 0.2, 0., 1.);
        float innerEdge = cmap(bubble, 0.05, 0.1, 0., 1.);
        bubble =  abs(outerEdge - innerEdge) * 0.1;
        
        bubblePattern += bubble;
    }

    
    vec2 uv = bUv + vec2(dispX, dispY);
    vec4 color = texture2D(tMap, uv);

    vec4 beerColor = vec4(0.941, 0.086, 0.118, 1.);
    vec4 beerColor2 = vec4(0.969, 0.467, 0.004, 1.);
    
    
    color.rgb += vec3(bubblePattern) * cmap(distance(vec4(color.rgb, 1.0), beerColor), 0.0, 0.1, 1.0, 0.0);
    color.rgb += vec3(bubblePattern) * cmap(distance(vec4(color.rgb, 1.0), beerColor2), 0.0, 0.1, 0.7, 0.0);
    gl_FragColor = color;
}`;

// Reference symbol: sZ
export const WOOFER_LEFT_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uCityIntro;
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

#ifndef PI
#define PI 3.141592653589793
#endif

float backOut(float t) {
  float f = 1.0 - t;
  return 1.0 - (pow(f, 1.4) - f * sin(f * PI));
}

void main() {
    vec2 uv = vUv;

    uv.x = uv.x * 0.5;

    float dispX = 0.;
    float dispY = 0.;

    float dTop = cmap(distance(uv, vec2(0.18, 0.55)), 0., .085, 1., 0.);
    float dBottom = cmap(distance(uv, vec2(0.18, 0.256)), 0., .085, 1., 0.);

    uv = scaleUV(uv, vec2(1. -dTop * 0.05 * sin(uTime * 22.)), vec2(0.185, 0.55));
    uv = scaleUV(uv, vec2(1. -dBottom * 0.05 * sin(uTime * 22.)), vec2(0.185, 0.256));

    float scaleY = backOut(cmap(uCityIntro, 0.1, 0.7, 0., 1.));
    uv = scaleUV(uv, vec2(1., scaleY), vec2(0.5, 0.));

    

    vec4 color = texture2D(tMap, uv + vec2(dispX, dispY));
    if(color.a < 0.01) discard;
    gl_FragColor = color;
}`;

// Reference symbol: oZ
export const WOOFER_RIGHT_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform float uCityIntro;
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

#ifndef PI
#define PI 3.141592653589793
#endif

float backOut(float t) {
  float f = 1.0 - t;
  return 1.0 - (pow(f, 1.4) - f * sin(f * PI));
}

void main() {
    vec2 uv = vUv;

    uv.x = uv.x * 0.5 + 0.5;

    float dispX = 0.;
    float dispY = 0.;

    float dTop = cmap(distance(uv, vec2(0.83, 0.479)), 0., .08, 1., 0.);
    float dBottom = cmap(distance(uv, vec2(0.83, 0.23)), 0., .08, 1., 0.);

    uv = scaleUV(uv, vec2(1. -dTop * 0.05 * sin(uTime * 22.)), vec2(0.815, 0.479));
    uv = scaleUV(uv, vec2(1. -dBottom * 0.05 * sin(uTime * 22.)), vec2(0.815, 0.23));

   float scaleY = backOut(cmap(uCityIntro, 0.1, 0.7, 0., 1.));
    uv = scaleUV(uv, vec2(1., scaleY), vec2(0.5, 0.));

    vec4 color = texture2D(tMap, uv + vec2(dispX, dispY));
    if(color.a < 0.01) discard;
    gl_FragColor = color;
}`;

// Reference symbol: tZ
export const VEGGIES_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uAlpha;
uniform float uLocalTime;
uniform float uCityIntro;

vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
float exponentialOut(float t) {
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}
void main() {
    float p = cmap(exponentialOut(uCityIntro), 0., 1., 0.9, 1.  );
    vec2 uv = scaleUV(vUv, vec2(p), vec2(0.5, 0.2));

    float dispX = sin(uLocalTime * 5. + vUv.y * 16.) * 0.0005 * vUv.y;
    float dispY = 0.;

    

    vec4 color = texture2D(tMap, uv + vec2(dispX, dispY));
    if(color.a < 0.01) discard;
    gl_FragColor = color;
    gl_FragColor.a *= uAlpha;
}`;

// Reference symbol: iZ
export const CITY_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uCityIntro;

vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
float quarticOut(float t) {
  return pow(t - 1.0, 3.0) * (1.0 - t) + 1.0;
}

#ifndef PI
#define PI 3.141592653589793
#endif

float backOut(float t) {
  float f = 1.0 - t;
  return 1.0 - (pow(f, 1.4) - f * sin(f * PI));
}

void main() {
    vec2 uv = vUv;

    float s1 = backOut(cmap(uCityIntro, 0., 0.9, 0., 1.));
    float s2 = backOut(cmap(uCityIntro, 0.1, 1., 0., 1.));

    float s = uv.x < 0.5 ? s1 : s2;

    uv = scaleUV(uv, vec2(1., s), vec2(0.5, 0.));
    vec4 color = texture2D(tMap, uv);
    
    

    if(color.a < 0.01) discard;
    gl_FragColor = color;
}`;

// Reference symbol: nZ
export const PLATFORM_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uAlpha;
uniform float uLocalTime;

vec2 rotateUV(vec2 uv, float rot, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 mr = mat3(
        cos(rot), sin(rot), 0,
        -sin(rot), cos(rot), 0,
        0, 0, 1);

    u = u * mo1;
    u = u * mr;
    u = u * mo2;

    return u.xy;
}

vec2 rotateUV(vec2 uv, float rot) {
    return rotateUV(uv, rot, vec2(0.5));
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vec2 uv = vUv;

    float time = cmap(mod(uLocalTime / 4.,  1.), 0., 1., -2., 2.);

    vec2 rUvWipe = rotateUV(vUv, 0.5);
    
    float wipe = cmap(rUvWipe.y  - time, 0.45, .5, 0., 1.) *  cmap(rUvWipe.y  - time, 0.5, .7, 1., 0.) ;

    vec4 color = texture2D(tMap, uv);
    if (distance(color.rgb, vec3(0.925, 0.549, 0.718)) < 0.5) {
        color.rgb += vec3(wipe)  * .2;
    }
    if(color.a < 0.01) discard;
    gl_FragColor = color;
    gl_FragColor.a *= uAlpha;
}`;

// Reference symbol: Q3
export const SKY_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uFluid;
uniform float uReverse;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec2 mirror(vec2 v) {
  vec2 m = mod(v, 2.);
  return mix(m, 2. - m, step(1., m));
}
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
vec2 barrel(vec2 uv, float strength) {
  vec2 st = uv - 0.5;
  float theta = atan(st.x, st.y);
  float radius = sqrt(dot(st, st));
  radius *= 1.0 + strength * (radius * radius);

  return 0.5 + radius * vec2(sin(theta), cos(theta));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}

void main() {
    vec2 fluidUv = gl_FragCoord.xy / uResolution;
    
    vec4 fluid = vec4(0.0, 0.0, 0.0, 0.0);

    vec2 uv = scaleUV(vUv, vec2(1., 0.3), vec2(.5, 0.5));

    uv.x += fluid.x * 0.0001;
    uv.y -= fluid.y * 0.0001;

    

    uv.x = 1.-mod(uv.x * 2., 1.);

    vec4 color = texture2D(tMap, uv);
    gl_FragColor = color;
}`;

// Reference symbol: QJ
export const MOON_FRAGMENT = `uniform sampler2D tMap;
uniform float uTime;
uniform vec4 uFluid;
uniform vec2 uResolution;
varying vec2 vUv;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}

void main() {

    float dist = cmap(distance(vUv, vec2(0.44, 0.48)), 0., 0.4, 1., 0.);

    float blink = cmap(sin(uTime * 2.15), -1., 1., .2, .5);

    vec4 halo = vec4(1.0, 1.0, 1.0, dist * blink);

    vec4 color = texture2D(tMap, scaleUV(vUv, vec2(0.2)));

    vec4 final = layer(color, halo);

    gl_FragColor = final;
}`;

// Reference symbol: aZ
export const DISC_FRAGMENT = `varying vec2 vUv;

vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}
vec4 layer(vec4 foreground, vec4 background) {
  return foreground * foreground.a + background * (1.0 - foreground.a);
}

float circle(vec2 uv, vec2 center, vec2 radius, float aa) {
    vec2 d = abs(uv - center) / radius;
    float dist = length(d);
    return 1. - smoothstep(1.0 - aa, 1.0, dist);
}

void main() {
    vec2 uv = vUv;

    float innerCircle = circle(scaleUV(uv, vec2(1., 0.7)), vec2(0.5, 0.55), vec2(0.16, 0.16), 0.0023 * 10.);
    float innerCircle2 = circle(scaleUV(uv, vec2(1., 0.7)), vec2(0.5, 0.55), vec2(0.162, 0.168), 0.0023 * 10.);

    float outerCircle = circle(scaleUV(uv, vec2(1., 1.)), vec2(0.5, 0.52), vec2(0.485, 0.485), 0.0023);
    float outerCircle2 = circle(scaleUV(uv, vec2(1., 1.)), vec2(0.5, 0.52), vec2(0.487, 0.49), 0.0023);

    vec4 innerCircleColor = vec4(mix(vec3(0.965, 0.659, 0.741), vec3(0.), 1.-innerCircle), innerCircle2);
    vec4 outerCircleColor = vec4(mix(vec3(0.937, 0.118, 0.157), vec3(0.), 1.-outerCircle), outerCircle2);

    if(vUv.y > 0.76) {
        discard;
    }

    gl_FragColor = layer(innerCircleColor, outerCircleColor);
}`;

// Reference symbol: oe
export const REFERENCE_BASE_VERTEX = `attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Reference symbol: kJ. CLOUD_VERTEX uses custom instanced attributes
// random(vec4) and offset(vec3); adapt its OGL built-in declarations for Three.
export const CLOUD_VERTEX = `attribute vec3 position;
attribute vec2 uv;
attribute vec4 random;
attribute vec3 offset;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uFluid;
uniform float uIntro;
uniform float uIntro2;
varying vec4 vRandom;
varying vec2 vUv;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void rotate2d(inout vec2 v, float a) {
    mat2 m = mat2(cos(a), -sin(a), sin(a), cos(a));
    v = m * v;
}

float circularOut(float t) {
  return sqrt((2.0 - t) * t);
}

void main() {
    vUv = uv;
    vRandom = random;

    
    vec3 pos = position;
    
    
    
    
    

    float tilt = random.w;
    float scale = cmap(random.x, 0., 1., 1.2, 1.6) * 0.4 + abs(tilt) * 0.3;
    scale *= circularOut(cmap(uIntro2, random.y  * 0.3, random.y  * 0.3 + 0.7 , 0., 1.));
    pos *= scale;

    
    

    
    rotate2d(pos.xy, cmap(random.x, 0., 1., -0.1, 0.1));

    pos += offset;

    
    pos.x += sin(uTime * 0.1 + random.x * 3.14) * 0.1; 
    pos.y += sin(uTime * 0.1 + random.y * 3.14) * 0.1; 

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}`;

// Reference symbol: EJ. CLOUD_VERTEX uses custom instanced attributes
// random(vec4) and offset(vec3); adapt its OGL built-in declarations for Three.
export const CLOUD_FRAGMENT = `uniform vec3 uColor;
uniform float uTime;
uniform sampler2D uFluid;
uniform vec2 uResolution;
uniform float uIntro;

varying vec4 vRandom;
varying vec2 vUv;

vec2 rotateUV(vec2 uv, float rot, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 mr = mat3(
        cos(rot), sin(rot), 0,
        -sin(rot), cos(rot), 0,
        0, 0, 1);

    u = u * mo1;
    u = u * mr;
    u = u * mo2;

    return u.xy;
}

vec2 rotateUV(vec2 uv, float rot) {
    return rotateUV(uv, rot, vec2(0.5));
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 ms = mat3(
        1.0 / scale.x, 0, 0,
        0, 1.0 / scale.y, 0,
        0, 0, 1);

    u = u * mo1;
    u = u * ms;
    u = u * mo2;
    return u.xy;
}

vec2 scaleUV(vec2 uv, vec2 scale) {
    return scaleUV(uv, scale, vec2(0.5));
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

float circle( vec2 _st,  float _radius) {
  float aa = 0.3;
  vec2 dist = _st-vec2(0.5);
	return 1.-smoothstep(_radius-(_radius*aa), _radius+(_radius*aa), dot(dist,dist)*4.0);
}

void main() {
    vec2 uv = vUv;
    
    
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    

    vec4 fluid = vec4(0., 0., 0., 0.);
    
    vec2 h = vec2(0., 0.);

    float index = 1.;
    float pivotX = index < 0.5 ? 0.25 : .75;

    vec2 dist = vec2(0., 0.);
    float rot = 1. * 3.14159265 * floor(vRandom.y * 4.0);

    float multDisp = cmap(uIntro, 0., 1., 1.2, 1.);
    dist.x = sin(uTime * 2.0 + uv.x * cmap(vRandom.x, 0., 1., 1., 14.) + vRandom.z) * 0.02 * multDisp;
    dist.y = sin(uTime * 2.0 + uv.x * cmap(vRandom.x, 0., 1., 1., 14.) + vRandom.z) * 0.02 * multDisp;
    
    
    uv += dist;
    uv = rotateUV(uv, rot, vec2(0.5,0.5));

    vec2 s = vec2(0.9);
    uv = scaleUV(uv, vec2(1., cmap(vRandom.x, 0., 1., 0.45, 1.)) * s, vec2(pivotX,0.5));

    

    vec4 texel = vec4(0., 0., 0., 1.);
    texel.a =   circle(uv, 0.5);
    
    if(texel.a < 0.1) discard;
    texel.rgb = mix(uColor * 1.05, uColor , fluid.z * 0.001  );
    gl_FragColor = texel;
    gl_FragColor.a = 1.;
}`;

// Reference symbol: RJ. CLOUD_VERTEX uses custom instanced attributes
// random(vec4) and offset(vec3); adapt its OGL built-in declarations for Three.
export const CLOUD_COMPOSITE_FRAGMENT = `uniform sampler2D tMap;
varying vec2 vUv;
uniform float uAlpha;
uniform float uTime;
uniform sampler2D uFluid;
uniform vec2 uResolution;
uniform vec3 uColor;

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

void main() {

    vec2 screenUV = gl_FragCoord.xy / uResolution;
    vec4 fluid = texture2D(uFluid, screenUV);

    vec2 uv = vUv;
    vec2 disp = vec2(0.);
    vec2 h = hash2(uv);
    uv += disp -fluid.xy * 0.00025;

    vec4 color = texture2D(tMap, uv);
    
    
    float outline = 0.0;
    float pixelSize = 0.005 + fluid.z * 0.00005;
    float radius = .5;

    
    
    for(int i = 0; i < 8; i++) {
        float angle = float(i) * 6.28318530718 / 8.;
        vec2 offset = vec2(cos(angle), sin(angle)) * pixelSize * radius;
        outline += texture2D(tMap, uv + offset).a;
    }
    
    
    outline /=  8.;

    
    if (outline <1. && color.a > 0.0) {
        color.rgb = mix(uColor, mix(vec3(0.), vec3(0.2),min(1., fluid.z)), cmap(outline, .95, 0.75, 0., 1.));
    }
    
    gl_FragColor = color;
}`;



// Reference symbol: AJ
export const FIREFLY_VERTEX = `attribute vec3 position;
attribute vec4 random;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uFluid;
uniform float uDpr;
varying vec4 vRandom;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vRandom = random;
    
    
    vec3 pos = position * 2.0 - 1.0;
    
    
    vec4 projectedPos = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
    vec2 screenUV = (projectedPos.xy / projectedPos.w) * 0.5 + 0.5;
    vec4 fluid = texture2D(uFluid, screenUV);
    
    
    
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);

    
    float t = uTime;

    mPos.x += sin(t * 1.3 + random.y * 10.) * cmap(random.z, 0., 1., 0.05, 0.1) * (0.43 + fluid.x * 0.0);
    mPos.y += sin(t * 1.2 + random.x * 10.) * cmap(random.z, 0., 1., 0.05, 0.1) * (0.43 + fluid.y * 0.0);
    mPos.z += sin(t * 1. + random.z * 10.) * cmap(random.z, 0., 1., 0.05, 0.1) *( 1. + fluid.z * 0.0);

    
    vec4 mvPos = viewMatrix * mPos;
    gl_PointSize = 12.0 / length(mvPos.xyz) * cmap(random.x, 0., 1., 4., 7.) * (1. + fluid.z * 0.13) * uDpr;
    gl_Position = projectionMatrix * mvPos;
}`;

// Reference symbol: VJ
export const FIREFLY_FRAGMENT = `uniform vec3 uColor;
uniform float uTime;
uniform float uDpr;
uniform sampler2D uMap;
uniform sampler2D uFluid;
uniform vec2 uResolution;

varying vec4 vRandom;

float circle( vec2 _st,  float _radius) {
  float aa = 0.3;
  vec2 dist = _st-vec2(0.5);
	return 1.-smoothstep(_radius-(_radius*aa), _radius+(_radius*aa), dot(dist,dist)*4.0);
}

void main() {
    vec2 uv = gl_PointCoord.xy;
    
    
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    vec4 fluid = texture2D(uFluid, screenUV);
    
    vec4 texel = texture2D(uMap, uv);
    texel.rgb *= mix(uColor, vec3(1.), fluid.z * 0.1);
    gl_FragColor = texel;

    if(texel.a < 0.01) discard;
    gl_FragColor.a = texel.a * (0.4 + abs(sin(uTime * 5.5 + vRandom.x * 100.)) * 0.3);
}`;

// Reference symbol: OJ
export const STARS_VERTEX = `attribute vec3 position;
attribute vec4 random;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform vec2 uResolution;
uniform float uDpr;

varying vec4 vRandom;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vRandom = random;

    float aspect = uResolution.x / uResolution.y;
    
    vec3 pos = position * 2.0 - 1.0;

    pos.x *= aspect;    
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;

    
    float movement = cmap(random.z, 0., 1., 0.05, 0.1) * 0.001;
    mPos.x += sin(t * 2. + random.y * 10.) * movement;
    mPos.y += sin(t * 2. + random.x * 10.) * movement;
    mPos.z += sin(t * 2. + random.z * 10.) * movement;

    vec4 mvPos = viewMatrix * mPos;
    
    
    float pointSize = 140.0 / length(mvPos.xyz) * cmap(random.x, 0., 1., 1., 3.5) * uDpr;
    gl_PointSize = pointSize;
    
    gl_Position = projectionMatrix * mvPos;
}`;

// Reference symbol: BJ
export const STARS_FRAGMENT = `uniform float uTime;
uniform sampler2D uMap;

varying vec4 vRandom;
vec2 rotateUV(vec2 uv, float rot, vec2 origin) {
    vec3 u = vec3(uv, 1.0);

    mat3 mo1 = mat3(
        1, 0, -origin.x,
        0, 1, -origin.y,
        0, 0, 1);

    mat3 mo2 = mat3(
        1, 0, origin.x,
        0, 1, origin.y,
        0, 0, 1);

    mat3 mr = mat3(
        cos(rot), sin(rot), 0,
        -sin(rot), cos(rot), 0,
        0, 0, 1);

    u = u * mo1;
    u = u * mr;
    u = u * mo2;

    return u.xy;
}

vec2 rotateUV(vec2 uv, float rot) {
    return rotateUV(uv, rot, vec2(0.5));
}
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vec2 uv = gl_PointCoord.xy;
    
    vec4 texel = texture2D(uMap, rotateUV(uv, vRandom.y + uTime * 0.4 * cmap(vRandom.x, 0., 1., -1., 1.)));
    
    gl_FragColor = texel;

    if(texel.a < 0.01) discard;
    float speed = cmap(vRandom.y, 0., 1., 0.7, 1.2);
    gl_FragColor.a = 0.3 + abs(sin(uTime * 3. * speed + vRandom.x * 10.)) *  cmap(vRandom.x + vRandom.y, 0., 2., 0.3, 0.7);
}`;

// End of selected reference shaders.

// Reference symbol: Z3
export const BALLOON_VERTEX = `attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    
    vec3 pos = position;
    pos.x *= cmap(vUv.y, 0.75, 1., 1., 0.7) * cmap(vUv.y, 0., 0.2, .8, 1.);
    pos.z *= cmap(vUv.y, 0.75, 1., 1., 0.7) * cmap(vUv.y, 0., 0.2, .3, 1.);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

// Reference symbol: jJ
export const BALLOON_FRAGMENT = `varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform sampler2D uSprite;
uniform vec3 uColor;
uniform float uIndex;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vec2 spriteUv = vec2(vUv.x, vUv.y);
    float spriteWidth = 1./2.;
    spriteUv.x = cmap(mod(vUv.x * 2., 1.), 0., 1., uIndex * spriteWidth, (uIndex + 1.) * spriteWidth);
    
    vec3 lightDir = normalize(vec3(5., 5.0, 11.0));
    float diff = dot(vNormal, lightDir);
    
    
    float shadowThreshold = 0.3;
    float shadow = step(shadowThreshold, diff);
    
    vec3 color = uColor;
    vec3 finalColor = color * (0.8 + shadow * 0.2); 
    
    vec4 spriteColor = texture2D(uSprite, spriteUv);
    finalColor = mix(finalColor, vec3(0.), spriteColor.g);
    
    gl_FragColor = vec4(finalColor, 1.0);
}`;

// Reference symbol: NJ
export const BALLOON_OUTLINE_FRAGMENT = `uniform vec3 uColor;

void main() {
    gl_FragColor = vec4(uColor, 1.);
}`;

// Reference symbol: qJ (homepage JJ fireworks)
export const FIREWORK_VERTEX = `attribute vec3 position;
attribute vec3 velocity;
attribute float size;
attribute float life;
attribute float color;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uSize;
uniform float uDpr;

varying float vLife;
varying float vColor;
float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    vLife = life;
    vColor = color;

    
    
    vec3 newPosition = position + velocity * uTime * 0.5;

    
    vec2 disp = vec2(0., 0.);
    disp.x = sin(uTime * 0.3 + position.x * 30.1) * 0.01 * cmap(life, 0.5, 0.8, 1., 0.);
    disp.y = sin(uTime * 0.3 + position.y * 30.1) * 0.01 * cmap(life, 0.5, 0.8, 1., 0.);
    newPosition.xy += disp;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);

    
    vec4 mPos = modelMatrix * vec4(newPosition, 1.0);
      vec4 mvPos = viewMatrix * mPos;
    float particleSize = size / length(mvPos.xyz) * 12. * uDpr * cmap(life, 0., 0.1, 0.5, 1.) * cmap(life, 1., 0.95, 0.8, 1.);
    
    
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = particleSize;
}`;

// Reference symbol: KJ (homepage JJ fireworks)
export const FIREWORK_FRAGMENT = `precision highp float;

varying float vLife;
varying float vColor;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

float map(float oldVal, float oldMin, float oldMax, float newMin, float newMax) {
  float old = oldMax - oldMin;
  float new = newMax - newMin;
  return (((oldVal - oldMin) * new) / old) + newMin;
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
  return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

void main() {
    
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    
    float alpha = cmap(dist, 0.0, 0.5, 1.0, 0.0);
    
    
    alpha *= cmap(vLife, 0.0, 0.3, 0.1, 1.) ;
    
    vec3 color = mix(uColor1, uColor1 * 0.8, cmap(vLife, 0.3, .5, 1., 0.));
    
    
    float glow = 1.0 - dist * 1.2;
    color += glow * 1.8;
    
    
    gl_FragColor = vec4(color, alpha);
}`;
