/** Scene textures and final composition. Foreground clouds use the source GLSL. */
export const PART_VERTEX = `
varying vec2 vUv;
void main(){
 vUv=uv;vec3 p=position;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`

export const PART_FRAGMENT = `
uniform sampler2D tMap;uniform float uAlpha;varying vec2 vUv;
void main(){vec4 col=texture2D(tMap,vUv);col.a*=uAlpha;if(col.a<.003)discard;gl_FragColor=col;}
`

export const HOME_COMPOSE = `
uniform sampler2D tMap;uniform sampler2D tClouds;uniform sampler2D tFluid;uniform float uTime;
uniform float uMotion;uniform float uToLinear;uniform float uAspect;
uniform vec2 uRipple;uniform float uRippleAt;varying vec2 vUv;
vec3 linearize(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
void main(){
 vec2 offset=vec2(0.);
 vec2 d=vUv-uRipple;d.x*=uAspect;float radius=length(d);float age=max(0.,uTime-uRippleAt);
 float envelope=exp(-age*1.7)*exp(-pow((radius-age*.34)*10.,2.));
 float wave=sin(radius*48.-age*11.)*envelope*.008*uMotion*step(0.,uRippleAt);
 offset+=normalize(d+vec2(.00001))*vec2(1./uAspect,1.)*wave;
 vec2 uv=clamp(vUv+offset,vec2(.001),vec2(.999));
 vec3 col=texture2D(tMap,uv).rgb;
 // The cloud target already has the original fluid warp and outline. Composite
 // it after the portal so foreground clouds do not warp with the background.
 vec4 cloud=texture2D(tClouds,vUv);col=mix(col,cloud.rgb,cloud.a);
 gl_FragColor=vec4(mix(col,linearize(col),uToLinear),1.);
}`
