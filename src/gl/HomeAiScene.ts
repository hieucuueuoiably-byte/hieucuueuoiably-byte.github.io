import * as THREE from 'three'
import gsap from 'gsap'
import { HomeFluid } from './HomeFluid'
import { SCREEN_VERTEX } from './BackgroundMaterial'
import { PART_VERTEX, PART_FRAGMENT, HOME_COMPOSE } from './HomeAiShaders'
import { createAiStageTexture,createAiPodiumTexture,createAiSkyTexture,createAiGroundTexture,createAiGroundGeometry,HOME_ACTOR_DEPTH,HOME_GROUND_Y } from './HomeAiStage'
import { HomeCodeCharacter } from './HomeCodeCharacters'
import { HomeForegroundClouds } from './HomeForegroundClouds'
import { HomeReferenceParticles } from './HomeReferenceParticles'
import { PORTAL_FRAGMENT } from './HomeOriginalShaders'
import { HOME_POINTER_3D_GAIN } from '../config/homeMotion'

const W=1672,H=941,clamp=THREE.MathUtils.clamp
const CAMERA_Z=H/(2*Math.tan(THREE.MathUtils.degToRad(45/2)))
const DEPTH={city:-1250,sky:-1900,...HOME_ACTOR_DEPTH,balloons:-260,podium:35}
// Preserve the approved head-on composition while placing layers in real depth.
const depthFit=(z:number)=>(CAMERA_Z-z)/CAMERA_Z
type Layer={name:string;group:THREE.Group;mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;anchor:THREE.Vector2;part:number;phase:number}

/** Code-drawn actors, scenic textures and live fluid in the shared renderer.
 * Raw sRGB internally; linearize once for the existing route-transition targets.
 */
export class HomeAiScene {
  readonly fluid:HomeFluid
  ready=false
  private disposed=false
  private scene=new THREE.Scene()
  private camera=new THREE.PerspectiveCamera(45,W/H,1,20000)
  private screen=new THREE.Scene()
  private screenCamera=new THREE.Camera()
  private target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true})
  private portalTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false})
  private portalScreen=new THREE.Scene()
  private portal:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>
  private clouds:HomeForegroundClouds
  private resolution=new THREE.Vector2(1,1)
  private geometry=new THREE.PlaneGeometry(W,H,96,54)
  private output:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>
  private background:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>
  private sky:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>
  private ground:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>
  private layers:Layer[]=[]
  private actors:HomeCodeCharacter[]=[]
  private textures:THREE.Texture[]=[]
  private materials:THREE.ShaderMaterial[]=[]
  private jobs:Promise<unknown>[]=[]
  private strings:{mesh:THREE.Line;positions:Float32Array;layer:Layer;index:number}[]=[]
  private particles:HomeReferenceParticles
  private film:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>
  private mouse=new THREE.Vector2()
  private smoothMouse=new THREE.Vector2()
  private previous:THREE.Vector2|null=null
  private width=1280
  private height=720
  private aspect=16/9
  private portrait=false
  private reduced=false
  private started=false
  private elapsed=0
  private balloonTime=0
  private frame=0
  private pointerMoves=0
  private inspectMotion=new URLSearchParams(window.location.search).has('inspect-motion')
  private projected=new THREE.Vector3()
  private burstPoint=new THREE.Vector3()
  private burstRay=new THREE.Vector3()
  private ropeKnot=new THREE.Vector3()
  private groundContact=new THREE.Vector3()
  private contactOffset=new THREE.Vector3()
  private restContact=new THREE.Vector3()
  private floorY=HOME_GROUND_Y.desktop
  private contactShadows:{actor:HomeCodeCharacter;mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>}[]=[]
  private entrance:gsap.core.Timeline|null=null
  private intro={stage:1,director:1,octopus:1,bird:1,clouds:1,cloudScale:1,hover:0}
  private arm=0
  private podium=new THREE.Group()
  private podiumGeometry:THREE.BoxGeometry
  private podiumEdges:THREE.EdgesGeometry

  constructor(private renderer:THREE.WebGLRenderer) {
    this.fluid=new HomeFluid(renderer);this.target.texture.colorSpace=this.portalTarget.texture.colorSpace=THREE.NoColorSpace;this.camera.position.z=CAMERA_Z
    this.clouds=new HomeForegroundClouds(renderer,this.fluid.texture)
    // Original mask and fluid/ear/cheek formulas, with an adjustable overall scale.
    const maskShader=PORTAL_FRAGMENT.replace('uniform float uStageWidth;','uniform float uStageWidth;\nuniform float uMaskScale;')
      .replace('s *= uIntro * 1.05','s *= uMaskScale * max(.001,uIntro) * 1.05')
      .replace('s *= 1.5;', 's *= 1.0;')
      // Longer-lived cloud dye must not split the characters' colour channels.
      .replace(/fluid\.xy \* 0\.00002/g,'clamp(fluid.xy * 0.000003, vec2(-.001), vec2(.001))')
      .replace('maskUv.xy -= fluid.xy * 0.00005;','vec2 maskDrag=fluid.xy * 0.00001;\n    maskUv.xy -= maskDrag / (vec2(1.) + abs(maskDrag) / .006);')
    this.portal=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
      name:'ReferencePortalWithOwnScene',vertexShader:SCREEN_VERTEX,fragmentShader:maskShader,
      depthWrite:false,depthTest:false,blending:THREE.NoBlending,toneMapped:false,
      uniforms:{tMap:{value:this.target.texture},tMask:{value:this.texture('ponpon-mask','/home-original/')},tFluid:{value:this.fluid.texture},
        uResolution:{value:this.resolution},uTime:{value:0},uIntro:{value:1},uStageWidth:{value:1280},uHovered:{value:0},uMaskScale:{value:1},
        uBackgroundColor:{value:new THREE.Color().setHex(0x7e7eff,THREE.LinearSRGBColorSpace)},uOutlineColor:{value:new THREE.Color().setHex(0x171717,THREE.LinearSRGBColorSpace)}}
    }));this.portalScreen.add(this.portal)
    const stage=createAiStageTexture(false);this.textures.push(stage)
    this.background=new THREE.Mesh(this.geometry,this.material(stage,0));this.background.renderOrder=0;this.scene.add(this.background)
    const sky=createAiSkyTexture();this.textures.push(sky)
    this.sky=new THREE.Mesh(this.geometry,this.material(sky,6));this.sky.renderOrder=-1;this.scene.add(this.sky)
    const ground=createAiGroundTexture();this.textures.push(ground)
    this.ground=new THREE.Mesh(createAiGroundGeometry(this.floorY,CAMERA_Z),this.material(ground,7));this.ground.renderOrder=1;this.scene.add(this.ground)
    const podiumTexture=createAiPodiumTexture(false);this.textures.push(podiumTexture)
    const podiumMaterial=this.material(podiumTexture,0);podiumMaterial.transparent=true
    const podiumMesh=new THREE.Mesh(this.geometry,podiumMaterial);podiumMesh.position.set(0,213.5,2);podiumMesh.renderOrder=2.5
    this.podiumGeometry=new THREE.BoxGeometry(365,126,100)
    const face=(hex:number)=>{
      const material=new THREE.ShaderMaterial({vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.);}',
        uniforms:{uColor:{value:new THREE.Color().setHex(hex,THREE.LinearSRGBColorSpace)}},toneMapped:false})
      this.materials.push(material);return material
    }
    const box=new THREE.Mesh(this.podiumGeometry,[face(0xe66000),face(0xf07700),face(0xffa51b),face(0xd95400),face(0xff7800),face(0xd95400)])
    box.position.set(12.5,-63,-50);box.renderOrder=2.3;this.podium.add(box)
    this.podiumEdges=new THREE.EdgesGeometry(this.podiumGeometry)
    const edgeMaterial=face(0x171717);edgeMaterial.depthWrite=false
    const edges=new THREE.LineSegments(this.podiumEdges,edgeMaterial);edges.position.copy(box.position);edges.renderOrder=2.6;this.podium.add(edges)
    this.podium.add(podiumMesh);this.scene.add(this.podium)
    this.film=this.createFilm();this.scene.add(this.film)
    for(const [name,x,y,part,order] of [['director',835,515,1,3],['octopus',360,665,2,4],['bird',1260,660,3,5]] as const){
      const actor=new HomeCodeCharacter(name,x,y,part,order);this.actors.push(actor);this.scene.add(actor.group)
      if(part>1){
        const material=new THREE.ShaderMaterial({name:'GroundContactShadow-'+name,vertexShader:PART_VERTEX,
          fragmentShader:'uniform float uAlpha;varying vec2 vUv;void main(){float r=length(vUv*2.-1.);float soft=1.-smoothstep(.28,1.,r);float core=1.-smoothstep(.0,.62,r);gl_FragColor=vec4(.24,.065,.11,(soft*.20+core*.16)*uAlpha);}',
          uniforms:{uAlpha:{value:1}},transparent:true,depthWrite:false,depthTest:false,toneMapped:false,side:THREE.DoubleSide})
        const shadow=new THREE.Mesh(new THREE.PlaneGeometry(part===2?600:85,part===2?130:55),material)
        shadow.rotation.x=-Math.PI/2;shadow.renderOrder=1.7;this.scene.add(shadow);this.contactShadows.push({actor,mesh:shadow})
      }
    }
    ;[[1143,125],[1116,211],[1216,164]].forEach(([x,y],index)=>{
      const layer=this.addLayer('balloon-'+(index+1),x,y,5,2),positions=new Float32Array(24*3)
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3))
      const material=new THREE.ShaderMaterial({vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uAlpha;void main(){gl_FragColor=vec4(.1,.08,.09,uAlpha);}',uniforms:{uAlpha:{value:1}},transparent:true,depthWrite:false,depthTest:false})
      const mesh=new THREE.Line(geometry,material);mesh.renderOrder=1;this.scene.add(mesh);this.strings.push({mesh,positions,layer,index})
    })
    this.particles=new HomeReferenceParticles(this.texture('night-star','/home-original/'),this.texture('night-firefly','/home-original/'),this.fluid.texture,CAMERA_Z/5)
    this.scene.add(this.particles.group)
    this.output=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
      name:'AiHomeFluidComposite',vertexShader:SCREEN_VERTEX,fragmentShader:HOME_COMPOSE,depthWrite:false,depthTest:false,blending:THREE.NoBlending,toneMapped:false,
      uniforms:{tMap:{value:this.portalTarget.texture},tClouds:{value:this.clouds.texture},tFluid:{value:this.fluid.texture},uTime:{value:0},uMotion:{value:1},uToLinear:{value:0},uAspect:{value:this.aspect},uRipple:{value:new THREE.Vector2(.5,.5)},uRippleAt:{value:-100}},
    }))
    this.screen.add(this.output);window.addEventListener('portfolio:home-hover',this.onHover);window.addEventListener('pointerup',this.onTap,{passive:true})
    Promise.all(this.jobs).then(()=>{
      if(this.disposed)return
      this.ready=true;document.documentElement.dataset.homeWebgl='ready'
      const data=renderer.domElement.dataset;data.homeFluid=this.fluid.supported?'gpu':'unavailable';data.homeArtwork='own-flat-atlas-v12-complete-octopus';data.homeLayers=String(this.layers.length+this.actors.length+3);data.homeCodeCharacters=String(this.actors.length);data.homePortalScale=String(this.portal.material.uniforms.uMaskScale.value);data.homeCloudInstances=String(this.clouds.count);data.homeSkyClouds='6';data.homeBalloonMotion='staggered-rise-sway-and-trailing-ropes';data.homeCloudLayers='independent-foreground-and-sky';data.homeCharacterSpread='.65';data.homeClippedParts=JSON.stringify(this.actors.flatMap(a=>a.clippedParts));data.homeCharacterParts=String(this.actors.reduce((n,a)=>n+a.partCount,0));data.homeEyeFrames=String(this.actors.reduce((n,a)=>n+a.eyeFrameCount,0));data.homePodium='box-365x126x100';data.homeParticles='reference-stars-246,fireflies-40,fireworks-512x5'
    }).catch(()=>{if(!this.disposed)document.documentElement.dataset.homeWebgl='fallback'})
  }
  private material(texture:THREE.Texture,part:number) {
    const material=new THREE.ShaderMaterial({name:'AiHomeLayer-'+part,vertexShader:PART_VERTEX,fragmentShader:PART_FRAGMENT,transparent:part!==0,depthWrite:false,depthTest:false,toneMapped:false,side:THREE.DoubleSide,
      uniforms:{tMap:{value:texture},uTime:{value:0},uMotion:{value:1},uPart:{value:part},uAlpha:{value:1}}})
    this.materials.push(material);return material
  }
  private texture(name:string,path='/home-ai/layers/') {
    let resolve!:(value:unknown)=>void,reject!:(reason:unknown)=>void
    this.jobs.push(new Promise((yes,no)=>{resolve=yes;reject=no}))
    const texture=new THREE.TextureLoader().load(path+name+'.webp',t=>{
      if(this.disposed){t.dispose();resolve(null);return}this.renderer.initTexture(t);resolve(t)
    },undefined,reject)
    texture.colorSpace=THREE.NoColorSpace;texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter;this.textures.push(texture);return texture
  }
  private addLayer(name:string,x:number,y:number,part:number,order:number) {
    const group=new THREE.Group(),anchor=new THREE.Vector2(x-W/2,H/2-y)
    const mesh=new THREE.Mesh(this.geometry,this.material(this.texture(name),part))
    mesh.position.set(-anchor.x,-anchor.y,0);mesh.renderOrder=order;mesh.frustumCulled=false
    group.position.set(anchor.x,anchor.y,0);group.add(mesh);this.scene.add(group)
    const layer={name,group,mesh,anchor,part,phase:this.layers.length*1.7};this.layers.push(layer);return layer
  }
  private createFilm() {
    const coords=[[626,588],[669,564],[741,585],[842,582],[941,557],[1037,576],[1065,641],[1048,681],[972,699],[845,719],[766,682],[714,637],[643,629],[626,588]]
    const curve=new THREE.CatmullRomCurve3(coords.map(([x,y])=>new THREE.Vector3(x-W/2,H/2-y,0)))
    const count=180,p=new Float32Array((count+1)*6),uv=new Float32Array((count+1)*4),indices:number[]=[]
    for(let i=0;i<=count;i++) {
      const f=i/count,center=curve.getPoint(f),tangent=curve.getTangent(f),normal=new THREE.Vector2(-tangent.y,tangent.x).normalize()
      p.set([center.x-normal.x*10,center.y-normal.y*10,0,center.x+normal.x*10,center.y+normal.y*10,0],i*6)
      uv.set([f,0,f,1],i*4)
      if(i<count){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(indices)
    const m=new THREE.ShaderMaterial({name:'CodeFilmRibbon',side:THREE.DoubleSide,depthWrite:false,depthTest:false,
      vertexShader:'uniform float uTime;uniform float uMotion;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.y+=sin(p.x*.018+uTime*.9)*4.*uMotion;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
      fragmentShader:'varying vec2 vUv;void main(){float edge=step(.13,vUv.y)*step(vUv.y,.87);float frame=fract(vUv.x*35.);float hole=step(.12,frame)*step(frame,.8)*step(.23,vUv.y)*step(vUv.y,.77);vec3 color=mix(vec3(.08),vec3(1.,.5,.015),edge);color=mix(color,vec3(1.,.88,.67),hole);gl_FragColor=vec4(color,1.);}',
      uniforms:{uTime:{value:0},uMotion:{value:1}},
    })
    const mesh=new THREE.Mesh(g,m);mesh.renderOrder=2;mesh.frustumCulled=false;return mesh
  }
  setSize(width:number,height:number,dpr:number) {
    this.width=width;this.height=height;this.aspect=width/height;this.portrait=this.aspect<.9
    this.floorY=this.portrait?HOME_GROUND_Y.portrait:HOME_GROUND_Y.desktop
    this.ground.geometry.dispose();this.ground.geometry=createAiGroundGeometry(this.floorY,CAMERA_Z)
    this.camera.aspect=this.aspect;this.camera.updateProjectionMatrix()
    const w=Math.round(width*Math.min(dpr,1.5)),h=Math.round(height*Math.min(dpr,1.5))
    this.target.setSize(w,h);this.portalTarget.setSize(w,h);this.resolution.set(w,h);this.clouds.setSize(width,height,dpr)
    this.fluid.setSize(width,height);this.output.material.uniforms.uAspect.value=this.aspect
    this.particles.setSize(width,height,dpr)
    // Less horizontal enlargement on short/narrow desktop windows.
    this.portal.material.uniforms.uMaskScale.value=this.portrait?.82:Math.min(1,this.aspect/1.6)
    this.portal.material.uniforms.uStageWidth.value=width
  }
  setReducedMotion(on:boolean) {
    this.reduced=on;this.fluid.setReducedMotion(on)
    this.particles.setReducedMotion(on,this.elapsed)
    if(on){this.entrance?.kill();gsap.killTweensOf(this.intro);Object.assign(this.intro,{stage:1,director:1,octopus:1,bird:1,clouds:1,cloudScale:1,hover:0});this.started=true}
  }
  private onHover=(event:Event)=>{
    if(this.reduced||this.disposed)return
    gsap.killTweensOf(this.intro,'hover');gsap.to(this.intro,{hover:(event as CustomEvent<boolean>).detail?1:0,duration:.75,ease:'power2.out'})
  }
  private onTap=(event:PointerEvent)=>{
    if(this.reduced||this.disposed||document.body.dataset.route!=='home'||document.body.classList.contains('is-transitioning'))return
    if(event.pointerType==='touch')this.leavePointer()
    if((event.target as HTMLElement).closest('button,a,nav'))return
    this.output.material.uniforms.uRipple.value.set(event.clientX/this.width,1-event.clientY/this.height);this.output.material.uniforms.uRippleAt.value=this.elapsed
    // Unproject against the actual orbiting camera so the burst starts at the
    // clicked pixel, rather than the old fixed, front-facing camera plane.
    this.burstRay.set(event.clientX/this.width*2-1,1-event.clientY/this.height*2,.5).unproject(this.camera).sub(this.camera.position).normalize()
    const distance=(-350-this.camera.position.z)/this.burstRay.z
    this.burstPoint.copy(this.camera.position).addScaledVector(this.burstRay,distance)
    this.particles.emit(this.burstPoint,(event.clientX/this.width-.5)*2)
  }
  setPointer(x:number,y:number) {
    if(this.reduced||this.disposed)return
    const px=clamp(x/this.width,0,1),py=clamp(1-y/this.height,0,1);this.mouse.set(px*2-1,py*2-1)
    if(this.previous){const dx=px-this.previous.x,dy=py-this.previous.y;if(dx||dy){this.fluid.setPointer(px,py,dx,dy);this.pointerMoves++}}else this.previous=new THREE.Vector2()
    this.previous.set(px,py)
  }
  leavePointer(){this.mouse.set(0,0);this.previous=null}
  enter() {
    if(!this.ready)return
    this.started=true;this.entrance?.kill();gsap.killTweensOf(this.intro)
    if(this.reduced){Object.assign(this.intro,{stage:1,director:1,octopus:1,bird:1,clouds:1,cloudScale:1,hover:0});return}
    this.balloonTime=0;this.fluid.reset();this.clouds.reset();this.particles.reset(this.elapsed);Object.assign(this.intro,{stage:0,director:0,octopus:0,bird:0,clouds:0,cloudScale:0,hover:0})
    this.entrance=gsap.timeline().to(this.intro,{stage:1,duration:1.8,ease:'elastic.out(1,.75)'},.05)
      .to(this.intro,{director:1,duration:1.2,ease:'elastic.out(1,.75)'},.16).to(this.intro,{octopus:1,duration:1.3,ease:'elastic.out(1,.9)'},.27)
      .to(this.intro,{bird:1,duration:1.3,ease:'elastic.out(1,.9)'},.34)
      .to(this.intro,{clouds:1,duration:1.4,ease:'power4.inOut'},.5).to(this.intro,{cloudScale:1,duration:2.5,ease:'none'},.7)
  }
  update(dt:number) {
    if(this.disposed||!this.ready)return
    if(!this.started){const loader=document.querySelector('.preloader');if(!loader||loader.classList.contains('is-done'))this.enter()}
    const step=this.reduced?0:Math.min(dt,.05)
    this.elapsed+=step;this.balloonTime+=step;this.frame++;this.fluid.update(dt)
    this.smoothMouse.lerp(this.mouse,this.reduced?1:1-Math.exp(-dt/.16))
    const t=this.elapsed,motion=this.reduced?0:1,viewW=H*this.aspect,pointerMotion=motion*HOME_POINTER_3D_GAIN
    const orbitX=this.portrait?115:450,orbitY=this.portrait?80:235
    this.camera.position.set(-this.smoothMouse.x*orbitX*pointerMotion,this.smoothMouse.y*orbitY*pointerMotion,CAMERA_Z*(1-this.intro.hover*.075*HOME_POINTER_3D_GAIN))
    this.camera.fov=45-this.intro.hover*5*HOME_POINTER_3D_GAIN
    this.camera.lookAt(this.smoothMouse.x*(this.portrait?35:140)*pointerMotion,-this.smoothMouse.y*(this.portrait?25:90)*pointerMotion,0)
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld()
    const backdropScale=this.portrait?.54:Math.max(1,viewW/W)
    this.background.scale.set(backdropScale*depthFit(DEPTH.city),depthFit(DEPTH.city),1);this.background.position.z=DEPTH.city
    this.sky.scale.set(backdropScale*depthFit(DEPTH.sky),depthFit(DEPTH.sky),1)
    this.sky.position.set(Math.sin(t*.13)*16*motion*depthFit(DEPTH.sky),Math.sin(t*.17)*3*motion*depthFit(DEPTH.sky),DEPTH.sky)
    this.ground.scale.set(backdropScale,1,1);this.ground.position.set(0,0,0)
    for(const layer of [...this.actors,...this.layers]) {
      const {group,anchor,part,phase,name}=layer
      const layoutFit=this.portrait?1:Math.min(1,viewW/W),fit=this.portrait?1:Math.max(.9,layoutFit)
      let sx=fit*(part===1?.94:part<4?.84:.9),sy=sx,x=anchor.x*layoutFit*(part<4?.65:.60),y=anchor.y
      if(part===1)y-=(1-fit)*150
      if(part===5)y-=85
      if(this.portrait) {
        if(part===1){sx=sy=.55;x=0;y=8}else if(part===2){sx=sy=.34;x=-viewW*.22;y=-179}else if(part===3){sx=sy=.34;x=viewW*.27;y=-170}
        else{x=viewW*.28+(phase-7)*5;y=H*.20+(anchor.y-H*.33)*.5;sx=sy=.65}
      }
      const entrance=part===1?this.intro.director:part===2?this.intro.octopus:part===3?this.intro.bird:this.intro.stage
      const breath=part<4?Math.sin(t*(.85+part*.08)+phase)*.006*motion:0
      const z=part===1?DEPTH.director:part===2?DEPTH.octopus:part===3?DEPTH.bird:DEPTH.balloons+Math.sin(t*.55+phase)*55*motion,depth=depthFit(z)
      group.scale.set(Math.max(.001,sx*depth*entrance*(1+breath)),Math.max(.001,sy*depth*entrance*(1-breath)),1)
      group.position.set(x*depth,(y+Math.sin(t*.75+phase)*2*motion)*depth,z)
      group.rotation.z=part<4?Math.sin(t*.65+phase)*.006*motion:part===5?Math.sin(t*.7+phase)*.07*motion:0
      if(part<4)group.rotation.y=this.smoothMouse.x*.06*pointerMotion
      if(part===5) {
        const index=this.layers.indexOf(layer as Layer),travel=this.portrait?280:480,bottom=this.portrait?65:80
        // Stagger each loop at the existing starting height. Fade at the ends
        // so an off-screen balloon can reappear below without a visible jump.
        const progress=THREE.MathUtils.euclideanModulo((y-bottom)/travel+this.balloonTime/(20+index*3),1)
        const alpha=this.reduced?1:THREE.MathUtils.smoothstep(progress,0,.07)*(1-THREE.MathUtils.smoothstep(progress,.83,1))
        const sway=(Math.sin(t*.95+phase)*25+Math.cos(t*.41+phase)*9)*motion+this.smoothMouse.x*18*pointerMotion
        group.position.x=(x+sway)*depth
        group.position.y=(this.reduced?y:bottom+progress*travel+Math.sin(t*1.1+phase)*8)*depth
        group.rotation.z=Math.sin(t*.9+phase)*.14*motion
        group.rotation.y=Math.sin(t*.6+phase)*.12*motion+this.smoothMouse.x*.06*pointerMotion
        ;(layer as Layer).mesh.material.uniforms.uAlpha.value=alpha
      }
      if(layer instanceof HomeCodeCharacter){
        layer.update(t,motion)
        if(part===2||part===3){
          layer.copyRestGroundContact(this.restContact)
          // The support stays on the floor throughout breathing, joint motion,
          // entrance scaling and pointer tilt. Only the body moves around it.
          const footX=x*depth+this.restContact.x*sx*depth
          layer.copyGroundContact(this.contactOffset).multiply(group.scale).applyEuler(group.rotation)
          group.position.set(footX-this.contactOffset.x,this.floorY-this.contactOffset.y,z-this.contactOffset.z)
          const shadow=this.contactShadows.find(s=>s.actor===layer)!.mesh
          shadow.position.set(footX,this.floorY+.02,z)
          shadow.scale.set(sx*depth,sy*depth,1)
          shadow.material.uniforms.uAlpha.value=clamp(entrance,0,1)
        }
      }
      else {layer.mesh.material.uniforms.uTime.value=t;layer.mesh.material.uniforms.uMotion.value=motion}
      if(name==='director'&&layer instanceof HomeCodeCharacter)this.arm=layer.armAngle
    }
    const u=this.output.material.uniforms;u.tFluid.value=this.fluid.texture;u.uTime.value=t;u.uMotion.value=motion
    const pu=this.portal.material.uniforms;pu.tFluid.value=this.fluid.texture;pu.uTime.value=t;pu.uIntro.value=this.intro.stage;pu.uHovered.value=this.intro.hover
    this.clouds.update(dt,t,this.mouse,this.intro.clouds,this.intro.cloudScale,this.reduced,this.fluid.texture)
    for(const material of this.materials){if(material.uniforms.uTime)material.uniforms.uTime.value=t;if(material.uniforms.uMotion)material.uniforms.uMotion.value=motion}
    this.film.material.uniforms.uTime.value=t;this.film.material.uniforms.uMotion.value=motion
    const filmScale=(this.portrait?.62:Math.min(.94,viewW/W))*Math.max(.001,this.intro.director)
    this.film.scale.set(filmScale*depthFit(DEPTH.podium),filmScale*depthFit(DEPTH.podium),1);this.film.position.z=DEPTH.podium
    const podiumScale=(this.portrait?.53:.94)*Math.max(.001,this.intro.director)
    this.podium.scale.setScalar(podiumScale*depthFit(DEPTH.podium));this.podium.position.set(0,(this.portrait?-78.3:-199.5)*depthFit(DEPTH.podium),DEPTH.podium)
    this.podium.rotation.set(-this.smoothMouse.y*.085*pointerMotion,this.smoothMouse.x*.20*pointerMotion,0)
    this.particles.update(dt,t,this.fluid.texture,this.intro.stage)
    for(const rope of this.strings) {
      const {group}=rope.layer
      this.ropeKnot.set([12,16,10][rope.index]*group.scale.x,-[44,37,40][rope.index]*group.scale.y,0).applyEuler(group.rotation).add(group.position)
      const wind=(Math.cos(t*.95+rope.layer.phase)*23.75-Math.sin(t*.41+rope.layer.phase)*3.69+this.smoothMouse.x*20)*motion
      for(let i=0;i<24;i++) {
        const f=i/23,depth=depthFit(group.position.z)
        rope.positions[i*3]=this.ropeKnot.x+(Math.sin(f*2.7+t*1.1+rope.index)*20*motion-wind*.65)*f*depth
        rope.positions[i*3+1]=this.ropeKnot.y-f*(80+Math.sin(t*.9+rope.index)*8*motion)*depth
        rope.positions[i*3+2]=this.ropeKnot.z+Math.sin(f*Math.PI)*12*motion
      }
      ;(rope.mesh.material as THREE.ShaderMaterial).uniforms.uAlpha.value=rope.layer.mesh.material.uniforms.uAlpha.value*this.intro.stage
      ;(rope.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate=true;rope.mesh.visible=this.intro.stage>.2
    }
    if(this.frame%12===0) {
      const d=this.renderer.domElement.dataset;d.homeFrame=String(this.frame);d.homeTime=t.toFixed(3);d.homeArm=this.arm.toFixed(4);d.homeHover=this.intro.hover.toFixed(3);d.homePointerMoves=String(this.pointerMoves);d.homeReduced=String(this.reduced);d.homeCloudDisplacement=this.clouds.displacement.toFixed(4);d.homeCloudIntro=this.intro.clouds.toFixed(3);d.homeCloudScale=this.intro.cloudScale.toFixed(3);d.homePortalScale=Number(pu.uMaskScale.value).toFixed(3)
      d.homeCamera=this.camera.type;d.homeCameraTilt=[this.camera.rotation.x,this.camera.rotation.y].map(x=>x.toFixed(4)).join(',');d.homePointer3dGain=String(HOME_POINTER_3D_GAIN)
      d.homeActorDepths=this.actors.map(a=>a.group.position.z.toFixed(1)).join(',');d.homeBackdropDepth=this.background.position.z.toFixed(1)
      d.homeGroundLevel=String(this.floorY);d.homeGroundPlane='horizontal-and-foot-anchored'
      d.homeGroundContacts=JSON.stringify(this.actors.filter(a=>a.part>1).map(a=>{a.group.updateMatrixWorld(true);a.copyGroundContact(this.groundContact).applyMatrix4(a.group.matrixWorld);return {name:a.name,world:this.groundContact.toArray().map(v=>+v.toFixed(4))}}))
      d.homeGroundShadows=JSON.stringify(this.contactShadows.map(s=>({name:s.actor.name,world:s.mesh.position.toArray().map(v=>+v.toFixed(4))})))
      d.homeBalloonTime=this.balloonTime.toFixed(3)
      d.homeBalloonScreenPositions=JSON.stringify(this.layers.map(a=>{this.projected.copy(a.group.position).project(this.camera);return [+(this.width*(this.projected.x+1)/2).toFixed(1),+(this.height*(1-this.projected.y)/2).toFixed(1),+Number(a.mesh.material.uniforms.uAlpha.value).toFixed(3)]}))
      d.homeBalloonRopesFinite=String(this.strings.every(r=>r.positions.every(Number.isFinite)))
      d.homeActorScreenPositions=JSON.stringify(this.actors.map(a=>{this.projected.copy(a.group.position).project(this.camera);return [+(this.width*(this.projected.x+1)/2).toFixed(1),+(this.height*(1-this.projected.y)/2).toFixed(1)]}))
      this.projected.copy(this.background.position).project(this.camera);d.homeCityScreenOrigin=JSON.stringify([+(this.width*(this.projected.x+1)/2).toFixed(1),+(this.height*(1-this.projected.y)/2).toFixed(1)])
      d.homeParticleTime=t.toFixed(3);d.homeParticleBursts=String(this.particles.activeBursts);d.homeParticleEmitted=String(this.particles.emitted);d.homeParticleLife=this.particles.firstBurstLife.toFixed(3)
      if(this.inspectMotion)d.homeCloudFlowPx=this.fluid.readCloudFlow(1.5).toFixed(1)
    }
  }
  render(target:THREE.WebGLRenderTarget|null) {
    const renderer=this.renderer;renderer.setClearColor(new THREE.Color().setHex(0xffad12,THREE.LinearSRGBColorSpace),1)
    renderer.setRenderTarget(this.target);renderer.clear();renderer.render(this.scene,this.camera)
    renderer.setRenderTarget(this.portalTarget);renderer.clear();renderer.render(this.portalScreen,this.screenCamera)
    this.clouds.render()
    this.output.material.uniforms.uToLinear.value=target?1:0;renderer.setRenderTarget(target);renderer.setClearColor(0x7e7eff,1);renderer.clear();renderer.render(this.screen,this.screenCamera)
  }
  dispose() {
    if(this.disposed)return
    this.disposed=true;this.entrance?.kill();gsap.killTweensOf(this.intro)
    window.removeEventListener('portfolio:home-hover',this.onHover);window.removeEventListener('pointerup',this.onTap)
    this.fluid.dispose();this.clouds.dispose();this.textures.forEach(t=>t.dispose());this.materials.forEach(m=>m.dispose())
    this.actors.forEach(actor=>actor.dispose())
    this.contactShadows.forEach(s=>{s.mesh.geometry.dispose();s.mesh.material.dispose()})
    this.geometry.dispose();this.output.geometry.dispose();this.output.material.dispose();this.target.dispose()
    this.portal.geometry.dispose();this.portal.material.dispose();this.portalTarget.dispose();this.portalScreen.clear()
    this.particles.dispose()
    this.ground.geometry.dispose()
    this.film.geometry.dispose();this.film.material.dispose()
    this.podiumGeometry.dispose();this.podiumEdges.dispose()
    this.strings.forEach(r=>{r.mesh.geometry.dispose();(r.mesh.material as THREE.Material).dispose()})
    this.scene.clear();this.screen.clear();delete document.documentElement.dataset.homeWebgl
  }
}

