import * as THREE from 'three'

/** Album case: rigid geometry, plastic normal map and a moving reflection.
 * The reference bindings are BQ → d6/FQ, not the reader's paper shaders.
 */
const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vViewNormal;
varying float vIsFrontFace;
void main() {
  vUv = uv;
  vViewNormal = normalize((modelViewMatrix * vec4(normal, 0.0)).xyz);
  vIsFrontFace = step(0.999, normal.z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform sampler2D tNormal;
uniform float uMapReady;
uniform float uNormalReady;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uTime;
uniform float uRotate;
uniform float uSelected;
uniform float uAlpha;
uniform float uDecorations;
uniform vec2 uFitUv;
varying vec2 vUv;
varying vec3 vViewNormal;
varying float vIsFrontFace;
vec2 rotateUv(vec2 p, float a) {
  p -= 0.5;
  return mat2(cos(a), -sin(a), sin(a), cos(a)) * p + 0.5;
}
vec2 mirrorUv(vec2 p) {
  vec2 m = mod(p, 2.0);
  return mix(m, 2.0 - m, step(1.0, m));
}
void main() {
  if (uAlpha < 0.003) discard;
  vec2 uv = (vUv - 0.5) / 1.009 + 0.5;
  vec3 lightDirection = vec3(0.0, 1.0, 1.0);
  vec3 plasticNormal = vec3(0.0, 0.0, 1.0);
  if (uNormalReady > 0.5) {
    plasticNormal = normalize(texture2D(tNormal, rotateUv(uv, uRotate)).rgb * 2.0 - 1.0);
  }
  uv += plasticNormal.xy * 0.004 * dot(vViewNormal, lightDirection) * uDecorations;
  uv = mirrorUv(uv);
  float isFront = vIsFrontFace;
  if (isFront < 0.5) {
    uv.x = step(0.5, uv.x);
    plasticNormal = vec3(0.0);
  }
  uv = (uv - 0.5) * uFitUv + 0.5;
  float lightIntensity = max(dot(vViewNormal, lightDirection), 0.0);
  if(isFront<.5){
    float bevel=smoothstep(0.,.1,vUv.x)*(1.-smoothstep(.9,1.,vUv.x));
    float ridges=sin(vUv.x*100.)*.018;
    vec3 edge=mix(vec3(.32,.25,.22),vec3(.12,.095,.085),bevel);
    edge*=.7+lightIntensity*.4;
    gl_FragColor=vec4(edge+vec3(ridges),uAlpha);
    #include <colorspace_fragment>
    return;
  }
  vec4 texel = uMapReady > 0.5 ? texture2D(tMap, uv) : vec4(mix(uColorA, uColorB, uv.y), 1.0);
  if (isFront > 0.5) {
    texel.rgb *= mix(0.5, 1.0, clamp(lightIntensity, 0.0, 1.0));
    // Film stills need a lighter coating than the reference's illustrated album art.
    float coating = (1.0 - clamp(vViewNormal.z * plasticNormal.z, 0.0, 1.0)) * 0.075 * uDecorations;
    texel.rgb = mix(texel.rgb, vec3(1.0), coating);
    float sweepPosition = mix(-20.0, 5.0, mod(uTime / 5.0, 1.0));
    float sy = rotateUv(vUv, 0.5).y - sweepPosition;
    float sweep = clamp(sy / 0.5, 0.0, 1.0) * clamp((1.0 - sy) / 0.5, 0.0, 1.0);
    texel.rgb += vec3(sweep * uSelected * 0.1 * uDecorations);
  }
  gl_FragColor = vec4(texel.rgb, texel.a * uAlpha);
  #include <colorspace_fragment>
}
`

export interface CoverUniforms {
  tMap: { value: THREE.Texture | null }
  tNormal: { value: THREE.Texture | null }
  uMapReady: { value: number }
  uNormalReady: { value: number }
  uColorA: { value: THREE.Color }
  uColorB: { value: THREE.Color }
  uTime: { value: number }
  uRotate: { value: number }
  uSelected: { value: number }
  uAlpha: { value: number }
  uDecorations: { value: number }
  uFitUv: { value: THREE.Vector2 }
  [key: string]: THREE.IUniform
}

export function createCoverMaterial(): THREE.ShaderMaterial {
  const uniforms: CoverUniforms = {
    tMap: { value: null }, tNormal: { value: null },
    uMapReady: { value: 0 }, uNormalReady: { value: 0 },
    uColorA: { value: new THREE.Color('#EB8DB7') },
    uColorB: { value: new THREE.Color('#F87800') },
    uTime: { value: 0 }, uRotate: { value: Math.PI },
    uSelected: { value: 0 }, uAlpha: { value: 1 },
    uDecorations: { value: 1 }, uFitUv: { value: new THREE.Vector2(1, 1) },
  }
  return new THREE.ShaderMaterial({
    name: 'AlbumPlasticMaterial',
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, side: THREE.FrontSide, depthWrite: true, depthTest: true,
  })
}
