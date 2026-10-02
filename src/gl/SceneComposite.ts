import * as THREE from 'three'
import { SCREEN_VERTEX } from './BackgroundMaterial'

/** Two render targets and independent phases, matching GQ/HQ. */
export function createSceneComposite(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'SceneComposite', depthTest: false, depthWrite: false,
    uniforms: {
      tFrom: { value: null }, tTo: { value: null },
      uProgress: { value: 0 }, uProgress2: { value: 0 },
      uResolution: { value: new THREE.Vector2(1,1) },
      uTime: { value: 0 }, uDpr: { value: 1 }, uReturn: { value: 0 },
      uColor: { value: new THREE.Color('#171717') },
      uColor2: { value: new THREE.Color('#FEECE2') },
    },
    vertexShader: SCREEN_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D tFrom;
      uniform sampler2D tTo;
      uniform float uProgress;
      uniform float uProgress2;
      uniform float uTime;
      uniform float uDpr;
      uniform float uReturn;
      uniform vec2 uResolution;
      uniform vec3 uColor;
      uniform vec3 uColor2;
      varying vec2 vUv;
      vec2 hash2(vec2 p){return fract(sin(vec2(dot(p+vec2(0.,13.1),vec2(127.1,311.7)),dot(p+vec2(13.1,0.),vec2(269.5,183.3))))*43758.5453123)*2.-1.;}
      vec2 barrel(vec2 uv,float strength){vec2 p=uv-.5;return .5+p*(1.+strength*dot(p,p));}
      float rectangle(vec2 st){vec2 v=smoothstep(vec2(-.05-.0001),vec2(-.05),st);v*=smoothstep(vec2(-.05-.0001),vec2(-.05),1.-st);return v.x*v.y;}
      void main(){
        float aspect=uResolution.x/max(1.,uResolution.y);
        vec2 h=hash2(vUv*10.+mod(floor(uTime*10.)/10.,10.));
        vec2 oldUv=(vUv-.5)/mix(1.,2.,uProgress2)+.5;
        vec4 from=texture2D(tFrom,barrel(oldUv,-2.*uProgress2));
        vec4 to=texture2D(tTo,barrel(vUv,mix(-1.3,0.,uProgress2)));
        float luma=dot(to.rgb,vec3(.2126,.7152,.0722));
        to.rgb=mix(vec3(luma),to.rgb,clamp(uProgress2/.1,0.,1.));
        to.rgb=clamp((to.rgb-.5)*mix(1.2,1.,clamp(uProgress2/.1,0.,1.))+.5,0.,1.);
        if(uReturn<.5){
          vec2 cp=(vUv-.5)/vec2(1.,aspect);
          float dist=length(cp);
          float radius=uProgress2*(aspect>1.?1.:1./aspect)*2.;
          float mask=1.-smoothstep(radius,radius+.0001,dist);
          if(aspect>1.){
            float brightness=dot(from.rgb,vec3(.299,.587,.114));
            float dpr=mix(.6,1.,clamp((uDpr-1.2)/.8,0.,1.));
            from.rgb=mix(from.rgb,mix(uColor,uColor2-abs(h.x)*.5*dpr,brightness*fract(dist*1.3)),uProgress);
          }
          gl_FragColor=mix(from,to,mask);
        }else{
          from=texture2D(tFrom,vUv);
          vec3 ink=vec3(.137,.122,.125);
          from.rgb=mix(from.rgb,ink,uProgress);
          vec2 r1=vUv+vec2(0.,mix(1.1,0.,uProgress)+sin(uTime*.4+vUv.x*5.)*.05);
          vec2 r2=vUv+vec2(0.,mix(1.1,0.,uProgress2)+sin(uTime*.4+vUv.x*6.+.4)*.05);
          float mask=rectangle(r1),mask2=rectangle(r2);
          float dpr=mix(.4,1.,clamp((uDpr-1.2)/.8,0.,1.));
          from.rgb=mix(from.rgb,ink+h.x*vUv.y*.2*dpr,mask);
          gl_FragColor=mix(from,to,mask2);
        }
        #include <colorspace_fragment>
      }
    `,
  })
}
