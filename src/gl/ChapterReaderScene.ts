import * as THREE from 'three'
import type { Work } from '../data/works'
import { SCREEN_VERTEX } from './BackgroundMaterial'
import { READER_BACKGROUND } from './ReaderSourceShaders'
import { createReaderSolidGeometry, READER_SOLID_VERTEX } from './ReaderSolidGeometry'
import { projectCard } from './CardProjection'

type Read = { current:number; target:number; velocity:number; selectedIndex:number; count:number }
type Rect = { x:number; y:number; w:number; h:number }
type Sheet = { work:Work; mesh:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>; x:number; width:number; height:number; padding:number; hover:number; mouse:THREE.Vector2 }

const PAPER_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
varying float vSide;
uniform sampler2D tMap;
uniform sampler2D tNormal;
uniform float uMapReady;
uniform float uVideoMap;
uniform float uView;
uniform float uTime;
uniform float uAlpha;
uniform vec2 uInset;
uniform vec3 uPaper;
void main(){
  vec2 normal=texture2D(tNormal,vUv).rg*2.-1.;
  vec2 uv=(vUv-uInset)/(1.-2.*uInset);
  float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  float grain=fract(sin(dot(vUv,vec2(127.1,311.7)))*43758.5453);
  vec3 paper=uPaper+vec3((grain-.5)*.016);
  if(vSide>.5){
    // Layered cream edges: real front/back/rim geometry, never a duplicated still.
    float layers=sin(vDepth*70.)*.025;
    float bevel=smoothstep(0.,.12,vDepth)*(1.-smoothstep(.86,1.,vDepth));
    vec3 edge=mix(paper*.94,paper*.58,bevel)+vec3(layers);
    if(vSide>1.5)edge=paper*.7;
    gl_FragColor=vec4(edge,uAlpha);
    #include <colorspace_fragment>
    return;
  }
  uv+=normal*.004*(1.-uView);
  vec3 content=uMapReady>.5?texture2D(tMap,clamp(uv,0.,1.)).rgb:paper;
  // Three.js map_fragment: video uploads need manual sRGB decoding (#26516).
  if(uVideoMap>.5)content=mix(pow(content*.9478672986+vec3(.0521327014),vec3(2.4)),content*.0773993808,vec3(lessThanEqual(content,vec3(.04045))));
  gl_FragColor=vec4(mix(paper,content,inside),uAlpha);
  #include <colorspace_fragment>
}`

/** Horizontal reader: original chapter-3 background and Pw paper deformation.
 * Film frames stay in their own aspect ratio inside cream paper margins.
 */
export class ChapterReaderScene {
  readonly group=new THREE.Group()
  private geometry=createReaderSolidGeometry()
  private background:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>
  private sheets:Sheet[]=[]
  private cache=new Map<string,Sheet>()
  private normal:THREE.Texture
  private disposed=false
  private width=1280
  private height=720
  private dpr=1
  private centerY=0
  private unitsPerPixel=1
  private raycaster=new THREE.Raycaster()
  private videoElement:HTMLVideoElement|null=null
  private videoTexture:THREE.VideoTexture|null=null
  private videoSlug=''
  private read:Read={current:0,target:0,velocity:0,selectedIndex:0,count:1}
  private totalTime=0

  constructor(private camera:THREE.PerspectiveCamera,fluid:THREE.Texture){
    this.group.name='FilmChapterReader'
    const neutral=new THREE.DataTexture(new Uint8Array([128,128,255,255]),1,1)
    neutral.needsUpdate=true
    this.normal=neutral
    new THREE.TextureLoader().load('/textures/paper-normals.jpg',texture=>{
      if(this.disposed){texture.dispose();return}
      texture.colorSpace=THREE.NoColorSpace
      texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false
      this.normal.dispose();this.normal=texture
    })
    this.background=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
      name:'Chapter3Background',vertexShader:SCREEN_VERTEX,fragmentShader:READER_BACKGROUND,depthTest:false,depthWrite:false,
      uniforms:{uAlpha:{value:1},uProgress:{value:0},uVelocity:{value:0},uTime:{value:0},uResolution:{value:new THREE.Vector2(this.width,this.height)},uDpr:{value:1},tFluid:{value:fluid},uColor1:{value:new THREE.Color('#7E7EFF')},uColor2:{value:new THREE.Color('#F87800')}}
    }))
    this.background.frustumCulled=false;this.background.renderOrder=-90
    this.group.add(this.background)
  }
  setWorks(works:Work[]){
    this.sheets.forEach(s=>{s.mesh.visible=false})
    this.sheets=works.filter(w=>!!w.video).map(work=>{
      const cached=this.cache.get(work.slug)
      if(cached)return cached
      const material=new THREE.ShaderMaterial({
        name:'FilmReaderSolid',vertexShader:READER_SOLID_VERTEX,fragmentShader:PAPER_FRAGMENT,
        transparent:true,side:THREE.DoubleSide,depthTest:true,depthWrite:true,
        uniforms:{tMap:{value:null},tNormal:{value:this.normal},uMapReady:{value:0},uVideoMap:{value:0},uSeed:{value:new THREE.Vector2(.23+this.cache.size*.1,.41)},uMouse:{value:new THREE.Vector2()},uHover:{value:0},uView:{value:1},uTime:{value:0},uRatio:{value:1},uVelocity:{value:0},uInset:{value:new THREE.Vector2(.03,.03)},uThickness:{value:.06},uEdgeOffset:{value:new THREE.Vector2()},uAlpha:{value:1},uPaper:{value:new THREE.Color('#fff0e9')}}
      })
      const mesh=new THREE.Mesh(this.geometry,material)
      mesh.frustumCulled=false;mesh.renderOrder=10
      const sheet={work,mesh,x:0,width:1,height:1,padding:16,hover:0,mouse:new THREE.Vector2()}
      this.cache.set(work.slug,sheet);this.group.add(mesh)
      return sheet
    })
    this.layoutSizes()
  }
  setSize(width:number,height:number,dpr:number){this.width=width;this.height=height;this.dpr=dpr;this.layoutSizes()}
  private layoutSizes(){
    const mobile=this.width<700
    const landscapePhone=this.height<500&&this.width>this.height
    const safeStyle=getComputedStyle(document.documentElement)
    const safeTop=parseFloat(safeStyle.getPropertyValue('--reader-safe-top'))||0
    const safeBottom=parseFloat(safeStyle.getPropertyValue('--reader-safe-bottom'))||0
    const top=(landscapePhone?78:mobile?134:Math.max(126,Math.min(160,this.height*.185)))+safeTop
    const bottom=this.height-(landscapePhone?94:mobile?138:124)-safeBottom
    const available=Math.max(100,bottom-top)
    this.centerY=(top+bottom)/2
    this.unitsPerPixel=2*this.camera.position.z*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))/this.height
    const gap=Math.max(36,this.width*(mobile?.075:.07))
    let x=0
    this.sheets.forEach((sheet,index)=>{
      const [aw,ah]=sheet.work.videoAspect.split('/').map(Number),ratio=aw/ah
      const pad=mobile?8:16
      const videoHeight=Math.min(available-pad*2,(this.width*(mobile?.90:.76)-pad*2)/ratio)
      sheet.width=videoHeight*ratio+pad*2;sheet.height=videoHeight+pad*2;sheet.padding=pad
      if(index)x+=(this.sheets[index-1].width+sheet.width)/2+gap
      sheet.x=x
      sheet.mesh.material.uniforms.uRatio.value=sheet.width/sheet.height
      sheet.mesh.material.uniforms.uInset.value.set(pad/sheet.width,pad/sheet.height)
      sheet.mesh.material.uniforms.uThickness.value=(mobile?14:20)*this.unitsPerPixel
      sheet.mesh.material.uniforms.uEdgeOffset.value.set((mobile?7:11)/sheet.width,-(mobile?9:14)/sheet.height)
    })
  }
  private scrollX(position:number){
    if(!this.sheets.length)return 0
    const p=THREE.MathUtils.clamp(position,0,this.sheets.length-1),i=Math.floor(p),next=Math.min(i+1,this.sheets.length-1)
    return THREE.MathUtils.lerp(this.sheets[i].x,this.sheets[next].x,p-i)
  }
  update(dt:number,read:Read,pointer:THREE.Vector2,fluid:THREE.Texture,getPoster:(slug:string)=>THREE.Texture|null,element:HTMLVideoElement|null,reduced:boolean,alpha:number){
    this.read=read;this.totalTime+=reduced?0:dt
    const selected=this.sheets[read.selectedIndex]
    if(element!==this.videoElement||selected?.work.slug!==this.videoSlug){
      this.videoTexture?.dispose();this.videoTexture=null
      this.videoElement=element;this.videoSlug=selected?.work.slug??''
      if(element){this.videoTexture=new THREE.VideoTexture(element);this.videoTexture.colorSpace=THREE.SRGBColorSpace;this.videoTexture.minFilter=THREE.LinearFilter}
    }
    const scroll=this.scrollX(read.current)
    const pitch=this.sheets.length>1?(this.sheets[this.sheets.length-1].x/(this.sheets.length-1))*this.unitsPerPixel:1
    const velocity=reduced?0:THREE.MathUtils.clamp(-read.velocity*pitch,-40,40)
    const b=this.background.material.uniforms
    b.uTime.value=this.totalTime*1000;b.uProgress.value=read.current/Math.max(1,this.sheets.length-1);b.uVelocity.value=velocity;b.uDpr.value=this.dpr;b.uAlpha.value=alpha;b.tFluid.value=fluid
    this.sheets.forEach((s,index)=>{
      const x=(s.x-scroll)*this.unitsPerPixel,y=(this.height/2-this.centerY)*this.unitsPerPixel
      const distance=Math.abs(s.x-scroll)
      s.mesh.visible=distance<this.width+s.width
      s.mesh.position.set(x,y,0);s.mesh.scale.set(s.width*this.unitsPerPixel,s.height*this.unitsPerPixel,1)
      s.mesh.rotation.set(0,0,0);s.mesh.updateMatrixWorld()
      const u=s.mesh.material.uniforms,poster=getPoster(s.work.slug)
      const live=index===read.selectedIndex&&element&&element.readyState>=2&&(!element.paused||element.currentTime>.01)
      u.tMap.value=live?this.videoTexture:poster;u.uVideoMap.value=live?1:0;u.uMapReady.value=u.tMap.value?1:0;u.tNormal.value=this.normal;u.uVelocity.value=velocity;u.uTime.value=this.totalTime;u.uView.value=1;u.uAlpha.value=alpha
    })
    this.camera.updateMatrixWorld();this.raycaster.setFromCamera(pointer,this.camera)
    const hit=reduced?undefined:this.raycaster.intersectObjects(this.sheets.filter(s=>s.mesh.visible).map(s=>s.mesh),false)[0]
    this.sheets.forEach(s=>{
      const hovered=hit?.object===s.mesh,local=hovered?s.mesh.worldToLocal(hit.point.clone()):null
      s.hover=THREE.MathUtils.damp(s.hover,hovered?1:0,8,dt)
      s.mouse.x=THREE.MathUtils.damp(s.mouse.x,local?.x??0,10,dt);s.mouse.y=THREE.MathUtils.damp(s.mouse.y,local?.y??0,10,dt)
      const u=s.mesh.material.uniforms;u.uHover.value=s.hover;u.uMouse.value.copy(s.mouse)
      if(!reduced){s.mesh.rotation.y=s.mouse.x*Math.PI*.02*s.hover;s.mesh.rotation.x=-s.mouse.y*Math.PI*.02*s.hover}
      s.mesh.updateMatrixWorld()
    })
  }
  setResolution(width:number,height:number){
    this.background.material.uniforms.uResolution.value.set(width,height)
  }
  getVideoRect():Rect|null{
    const s=this.sheets[this.read.selectedIndex]
    if(!s)return null
    return {x:this.width/2+s.x-this.scrollX(this.read.current)-s.width/2+s.padding,y:this.centerY-s.height/2+s.padding,w:s.width-s.padding*2,h:s.height-s.padding*2}
  }
  getCardTargets(){
    return this.sheets.flatMap((s,index)=>{
      const u=s.mesh.material.uniforms,offset=u.uEdgeOffset.value as THREE.Vector2,corners:THREE.Vector3[]=[]
      for(const x of [-.5,.5])for(const y of [-.5,.5]){
        for(const depth of [0,1]){
          const p=new THREE.Vector3(x+offset.x*depth,y+offset.y*depth,-u.uThickness.value*depth)
          // Match the shader's edge positions, including perspective bending while sliding.
          p.z+=Math.sin(u.uTime.value+(x+.5)*4+(y+.5)*4+u.uSeed.value.x*3.2)*.02
          const screen=new THREE.Vector4(p.x,p.y,p.z,1).applyMatrix4(s.mesh.matrixWorld).applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix)
          p.z-=Math.pow(THREE.MathUtils.clamp(Math.abs(screen.x)/8,0,1),2)*(.5-u.uVelocity.value*.05)
          const t=THREE.MathUtils.clamp((4-Math.abs(p.y))/3.9,0,1),curve=-2.7*(1-(1-t)*(1-t))
          p.x*=1+Math.abs(u.uVelocity.value)*.0003*curve;p.y*=1-Math.abs(u.uVelocity.value)*.002*curve
          corners.push(p)
        }
      }
      const target=projectCard(index,s.mesh,this.camera,this.width,this.height,corners)
      return target?[target]:[]
    })
  }
  diagnostics(){return {background:'chapter-3-UJ',geometry:'25x25-solid-Pw',thicknessPx:this.sheets[this.read.selectedIndex]?.mesh.material.uniforms.uThickness.value/this.unitsPerPixel,velocity:this.background.material.uniforms.uVelocity.value,position:this.read.current,video:this.videoSlug,rect:this.getVideoRect(),live:!!this.videoElement&&!this.videoElement.paused}}
  dispose(){
    this.disposed=true;this.videoTexture?.dispose();this.normal.dispose();this.geometry.dispose();this.background.geometry.dispose();this.background.material.dispose()
    this.cache.forEach(s=>{s.mesh.material.dispose()});this.cache.clear();this.group.clear()
  }
}
