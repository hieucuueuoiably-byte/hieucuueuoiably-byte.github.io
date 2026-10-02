import * as THREE from 'three'

export const SCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`

/** Directory's VQ base field. The selected circles are independent meshes. */
const FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uTime;
uniform float uDpr;
uniform float uFade;
varying vec2 vUv;
vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p + vec2(0.0,13.1),vec2(127.1,311.7)),dot(p + vec2(13.1,0.0),vec2(269.5,183.3)))) * 43758.5453123) * 2.0 - 1.0;
}
void main() {
  float stepTime = mod(floor(uTime * 10.0) / 10.0, 10.0);
  vec2 h = hash2(vUv + stepTime);
  vec3 base = mix(uColorA, uColorB, length(vUv - 0.5) * 0.2);
  float dprFactor = mix(0.4,1.0,clamp((uDpr-1.2)/0.8,0.0,1.0));
  vec3 color = mix(base, vec3(1.0), abs(h.x) * 0.2 * dprFactor);
  gl_FragColor = vec4(color,uFade);
  #include <colorspace_fragment>
}
`

export interface BackgroundUniforms {
  uColorA: { value: THREE.Color }
  uColorB: { value: THREE.Color }
  uTime: { value: number }
  uDpr: { value: number }
  uFade: { value: number }
  [key: string]: THREE.IUniform
}

export function createBackgroundMaterial(): THREE.ShaderMaterial {
  const uniforms: BackgroundUniforms = {
    uColorA: { value: new THREE.Color('#F87800') },
    uColorB: { value: new THREE.Color('#EB8DB7') },
    uTime: { value: 0 }, uDpr: { value: 1 }, uFade: { value: 1 },
  }
  return new THREE.ShaderMaterial({
    name: 'DirectoryBaseField',
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: SCREEN_VERTEX, fragmentShader: FRAG,
    depthTest: false, depthWrite: false,
  })
}

/** OQ: original screen-space density sampling, UV warp and fluid-lit colour bands.
 * Source: ponpon-mania.com/_nuxt/CfE0pqJa.js, OQ main().
 */
export function createAlbumCircleMaterial(a: string, b: string, index: number, fluid: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'AlbumCircle', transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uColorA: { value: new THREE.Color(a) }, uColorB: { value: new THREE.Color(b) },
      uResolution: { value: new THREE.Vector2(1,1) },
      uTime: { value: 0 }, uClock: { value: 0 }, uMask: { value: 0 },
      uAlpha: { value: 0 }, uDpr: { value: 1 }, uIndex: { value: index },
      tFluid: { value: fluid },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec2 uResolution;
      uniform sampler2D tFluid;
      uniform float uTime;
      uniform float uClock;
      uniform float uMask;
      uniform float uAlpha;
      uniform float uDpr;
      varying vec2 vUv;
      vec2 hash2(vec2 p) {
        return fract(sin(vec2(dot(p+vec2(0.,13.1),vec2(127.1,311.7)),dot(p+vec2(13.1,0.),vec2(269.5,183.3))))*43758.5453123)*2.-1.;
      }
      void main(){
        float aspect=uResolution.x/max(1.,uResolution.y);
        vec4 fluid=texture2D(tFluid,gl_FragCoord.xy/uResolution);
        vec2 uv=vUv-fluid.rg*0.0001;
        float grainScale=mix(2.,1.,clamp((uDpr-1.2)/0.8,0.,1.));
        vec2 h=hash2(uv*grainScale+mod(floor(uTime*10.)/10.,10.));
        vec2 cp=vec2((uv.x-0.5)*aspect,uv.y-0.5)/mix(.9,1.,uMask);
        float dist=length(cp);
        float mask=1.-smoothstep(0.,.000001,dist-.5*uMask);
        float grainFactor=mix(.5,1.,clamp((uDpr-1.3)/.7,0.,1.));
        float tint=clamp(h.y*grainFactor,0.,1.)*(.3+fluid.z*.05*mix(.5,1.,clamp((uDpr-1.2)/.8,0.,1.)));
        vec3 color=mix(uColorA,uColorB+tint,fract(dist*5.-uClock*.3));
        float alpha=uAlpha*mask;
        if(alpha<.01)discard;
        gl_FragColor=vec4(color,alpha);
        #include <colorspace_fragment>
      }
    `,
  })
}
