import * as THREE from 'three'
import gsap from 'gsap'
import { createCoverMaterial, type CoverUniforms } from './CoverMaterial'
import { createBackgroundMaterial, createAlbumCircleMaterial, SCREEN_VERTEX, type BackgroundUniforms } from './BackgroundMaterial'
import { createSceneComposite } from './SceneComposite'
import { HomeAiScene as HomeScene } from './HomeAiScene'
import { HomeFluid, DIRECTORY_FLUID_SETTINGS } from './HomeFluid'
import { ChapterReaderScene } from './ChapterReaderScene'
import { boxCorners, projectCard } from './CardProjection'
import { V } from '../config/motion'
import type { Work } from '../data/works'

export type SceneMode = 'home' | 'works' | 'collection' | 'player' | 'about'
type Rect = { x: number; y: number; w: number; h: number }
type Read = { current: number; target: number; velocity: number; selectedIndex: number; count: number }
const PITCH = 1.9
const COVER_DEPTH = .065
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
const mix = THREE.MathUtils.lerp
const smooth = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
const CIRCLE_MOTION = { close: .28, settle: .07, recolor: .2, open: .86, tolerance: .008 }
type CirclePhase = 'idle' | 'closing' | 'waiting' | 'coloring' | 'opening'

interface CoverEntry {
  work: Work
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>
  material: THREE.ShaderMaterial
  uniforms: CoverUniforms
  texture: THREE.Texture | null
  imageAspect: number
  hover: number
  hoverX: number
  hoverY: number
  intro: { scale: number; y: number }
  circle: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  circleState: { scale: number; mask: number; alpha: number; clock: number }
}

/** One persistent renderer: perspective album stage and two render-target transitions.
 * Reference bindings: YQ/BQ/d6/FQ/VQ/OQ. Directory covers are rigid thin boxes.
 */
export class WorksScene {
  readonly canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  private screenScene = new THREE.Scene()
  private screenCamera = new THREE.Camera()
  private bg: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private bgU: BackgroundUniforms
  private home: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private homeWorld: HomeScene
  private reader: ChapterReaderScene
  private directoryFluid: HomeFluid
  private directoryPointer: THREE.Vector2 | null = null
  private directoryPointerMoves = 0
  private inspectDirectoryMotion = new URLSearchParams(window.location.search).has('inspectMotion')
  private composite: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private fromRT: THREE.WebGLRenderTarget
  private toRT: THREE.WebGLRenderTarget
  private allCovers: CoverEntry[] = []
  private covers: CoverEntry[] = []
  private loader = new THREE.TextureLoader()
  private clock = new THREE.Clock()
  private normalTexture: THREE.Texture | null = null
  private fallbackHome: THREE.Texture | null = null
  private homeSnapshot: THREE.CanvasTexture | null = null
  private mode: SceneMode = 'home'
  private focus = 0
  private exit = 0
  private routeOut = 0
  private routeIn = 1
  private domStage: Rect | null = null
  private width = 1440
  private height = 900
  private aspect = 1.6
  private dpr = 1
  private disposed = false
  private reduceBend = false
  private debugFrozenTime: number | null = null
  private lastRead: Read = { current: 0, target: 0, velocity: 0, selectedIndex: 0, count: 1 }
  private lastIndex = -1
  private activeCircle = -1
  private circleTarget = -1
  private circlePhase: CirclePhase = 'idle'
  private circleTimeline: gsap.core.Timeline | null = null
  private circleSettledFor = 0
  private circleTrace: object[] = []
  private bgColorA = new THREE.Color('#F87800')
  private bgColorB = new THREE.Color('#EB8DB7')
  private homePair: [string,string] = ['#7E7EFF','#FFAD12']
  private pointer = new THREE.Vector2(20,20)
  private raycaster = new THREE.Raycaster()
  private projection = new THREE.Vector3()
  private transition: { from: SceneMode; to: SceneMode; index: number } | null = null

  constructor(canvas: HTMLCanvasElement, works: Work[]) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor('#171717',1)
    this.directoryFluid = new HomeFluid(this.renderer, DIRECTORY_FLUID_SETTINGS)
    this.canvas.dataset.directoryFluid = this.directoryFluid.supported ? 'gpu' : 'unavailable'
    this.camera.position.z = 5
    const background = createBackgroundMaterial()
    this.bgU = background.uniforms as unknown as BackgroundUniforms
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(2,2), background)
    this.bg.frustumCulled = false
    this.bg.renderOrder = -100
    this.scene.add(this.bg)
    this.fromRT = new THREE.WebGLRenderTarget(1,1,{ depthBuffer: true })
    this.toRT = new THREE.WebGLRenderTarget(1,1,{ depthBuffer: true })
    this.fromRT.texture.colorSpace = THREE.LinearSRGBColorSpace
    this.toRT.texture.colorSpace = THREE.LinearSRGBColorSpace
    this.home = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({
      name: 'HomeSnapshot', depthWrite: false, depthTest: false,
      uniforms: { tMap: { value: null }, uReady: { value: 0 }, uAspect: { value: 1 }, uImageAspect: { value: 1 }, uColor: { value: new THREE.Color(this.homePair[0]) } },
      vertexShader: SCREEN_VERTEX,
      fragmentShader: `uniform sampler2D tMap;uniform float uReady;uniform float uAspect;uniform float uImageAspect;uniform vec3 uColor;varying vec2 vUv;void main(){vec2 fit=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));vec2 uv=(vUv-.5)*fit+.5;gl_FragColor=uReady>.5?texture2D(tMap,uv):vec4(uColor,1.);\n#include <colorspace_fragment>\n}`,
    }))
    this.home.frustumCulled = false
    this.composite = new THREE.Mesh(new THREE.PlaneGeometry(2,2),createSceneComposite())
    this.composite.frustumCulled = false
    this.screenScene.add(this.home,this.composite)
    this.composite.visible = false
    works.forEach((work,index) => {
      const material = createCoverMaterial()
      const uniforms = material.uniforms as unknown as CoverUniforms
      uniforms.uColorA.value.set(work.themeColors[0])
      uniforms.uColorB.value.set(work.themeColors[1])
      uniforms.uRotate.value = (index + 2) * Math.PI / 2
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,COVER_DEPTH),material)
      mesh.frustumCulled = false
      mesh.renderOrder = 10
      const circle = new THREE.Mesh(new THREE.PlaneGeometry(1,1),createAlbumCircleMaterial(work.themeColors[0],work.themeColors[1],index,this.directoryFluid.texture))
      circle.frustumCulled = false
      circle.renderOrder = -50
      circle.visible = false
      this.scene.add(mesh,circle)
      const entry: CoverEntry = { work,mesh,material,uniforms,texture:null,imageAspect:1,hover:0,hoverX:0,hoverY:0,intro:{scale:1,y:0},circle,circleState:{scale:0,mask:0,alpha:0,clock:0} }
      this.allCovers.push(entry)
      this.loadCover(entry)
    })
    this.covers = [...this.allCovers]
    this.loader.load('/textures/plastic-normal-map.jpg',texture => {
      if(this.disposed){texture.dispose();return}
      texture.colorSpace = THREE.NoColorSpace
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false
      this.normalTexture = texture
      this.allCovers.forEach(c=>{c.uniforms.tNormal.value=texture;c.uniforms.uNormalReady.value=1})
    },undefined,()=>{})
    this.homeWorld=new HomeScene(this.renderer)
    this.reader=new ChapterReaderScene(this.camera,this.directoryFluid.texture)
    this.reader.group.visible=false
    this.scene.add(this.reader.group)
    window.addEventListener('pointermove',this.onPointerMove,{ passive:true })
    window.addEventListener('pointerout',this.onPointerOut,{ passive:true })
    this.resize()
  }

  private onPointerMove = (e: PointerEvent) => {
    const r=this.canvas.getBoundingClientRect()
    this.pointer.set(((e.clientX-r.left)/Math.max(1,r.width))*2-1,-((e.clientY-r.top)/Math.max(1,r.height))*2+1)
    if(this.mode==='home')this.homeWorld.setPointer(e.clientX-r.left,e.clientY-r.top)
    else if(!this.reduceBend && (this.mode==='works'||this.mode==='collection'||this.mode==='player')){
      const px=clamp((e.clientX-r.left)/Math.max(1,r.width)),py=clamp(1-(e.clientY-r.top)/Math.max(1,r.height))
      if(this.directoryPointer){
        const dx=px-this.directoryPointer.x,dy=py-this.directoryPointer.y
        if(dx||dy){
          this.directoryFluid.setPointer(px,py,dx,dy)
          this.canvas.dataset.directoryPointerMoves=String(++this.directoryPointerMoves)
        }
      }else this.directoryPointer=new THREE.Vector2()
      this.directoryPointer.set(px,py)
    }
  }
  private onPointerOut = (e: PointerEvent) => { if(!e.relatedTarget){this.pointer.set(20,20);this.homeWorld.leavePointer();this.directoryPointer=null} }
  private installHomeTexture(texture: THREE.Texture) {
    const u=this.home.material.uniforms
    const img=texture.image as {width?:number;height?:number}
    u.tMap.value=texture;u.uReady.value=1
    u.uImageAspect.value=(img.width||this.width)/(img.height||this.height)
  }
  private loadCover(entry: CoverEntry) {
    const image=entry.work.video&&entry.work.poster?entry.work.poster:entry.work.cover
    if(!image)return
    this.loader.load(image,texture=>{
      if(this.disposed){texture.dispose();return}
      texture.colorSpace=THREE.SRGBColorSpace
      texture.minFilter=THREE.LinearFilter
      texture.magFilter=THREE.LinearFilter
      texture.generateMipmaps=false
      texture.anisotropy=Math.min(2,this.renderer.capabilities.getMaxAnisotropy())
      entry.texture=texture
      const image=texture.image as {width?:number;height?:number}
      entry.imageAspect=(image.width||1)/(image.height||1)
      entry.uniforms.tMap.value=texture
      entry.uniforms.uMapReady.value=1
      this.renderer.initTexture(texture)
    },undefined,()=>{})
  }

  setMode(mode: SceneMode) {
    const previous=this.mode
    this.mode=mode
    this.canvas.dataset.sceneMode=mode
    if(mode!==previous){
      this.directoryPointer=null
      if(mode==='home'||mode==='about'||previous==='home')this.directoryFluid.reset()
      if((mode==='home'||mode==='about')&&!this.transition)this.resetCircles()
    }
    if(mode==='home'&&previous!=='home')this.homeWorld.enter()
    if(mode!=='home')this.homeWorld.leavePointer()
    if((mode==='works'||mode==='collection')&&previous!==mode&&previous!=='player'&&!this.transition)this.animateIn()
  }
  getMode(){return this.mode}
  setReduceBend(on:boolean){this.reduceBend=on;this.homeWorld.setReducedMotion(on);this.directoryFluid.setReducedMotion(on);this.directoryPointer=null}
  setHomePair(a:string,b:string){this.homePair=[a,b];this.home.material.uniforms.uColor.value.set(a)}
  setFocus(value:number){this.focus=clamp(value)}
  setExit(value:number){this.exit=clamp(value)}
  setRouteOut(value:number){this.routeOut=clamp(value)}
  setRouteIn(value:number){this.routeIn=clamp(value)}
  setStageRect(rect:Rect){this.domStage=rect}

  /** Change the directory's local slots without recreating the renderer or its textures. */
  setWorks(works: Work[]) {
    if(this.disposed||this.transition)return
    const entries = new Map(this.allCovers.map(entry=>[entry.work.slug,entry]))
    const seen = new Set<string>()
    const next = works.flatMap(work=>{
      const entry=entries.get(work.slug)
      if(!entry||seen.has(work.slug))return []
      seen.add(work.slug)
      return [entry]
    })
    if(next.length===this.covers.length&&next.every((entry,index)=>entry===this.covers[index]))return
    this.reader.setWorks(works)
    this.resetCircles()
    this.allCovers.forEach(entry=>{
      gsap.killTweensOf(entry.intro)
      gsap.killTweensOf(entry.circleState)
      entry.mesh.visible=false
      entry.circle.visible=false
      entry.hover=0;entry.hoverX=0;entry.hoverY=0
      Object.assign(entry.intro,{scale:1,y:0})
      Object.assign(entry.circleState,{scale:0,mask:0,alpha:0,clock:0})
      entry.uniforms.uSelected.value=0
      entry.uniforms.uAlpha.value=0
      entry.circle.material.uniforms.uAlpha.value=0
      entry.circle.material.uniforms.uMask.value=0
      entry.circle.material.uniforms.uClock.value=0
      entry.circle.material.uniforms.tFluid.value=this.directoryFluid.texture
    })
    this.covers=next
    this.activeCircle=-1
    this.lastIndex=-1
    this.focus=0;this.exit=0
    this.routeOut=0;this.routeIn=1
    this.domStage=null
    this.pointer.set(20,20)
    const index=clamp(Math.round(this.lastRead.current),0,Math.max(0,next.length-1))
    this.lastRead={...this.lastRead,current:index,target:index,selectedIndex:index,velocity:0,count:next.length}
    this.snapLayout()
  }

  /** DOM capture remains the same image while both shader phases run. */
  setHomeSnapshot(canvas:HTMLCanvasElement) {
    if(this.disposed)return
    const previous=this.homeSnapshot
    const texture=new THREE.CanvasTexture(canvas)
    texture.colorSpace=THREE.SRGBColorSpace
    texture.minFilter=THREE.LinearFilter
    texture.magFilter=THREE.LinearFilter
    texture.generateMipmaps=false
    this.homeSnapshot=texture
    this.canvas.dataset.homeTexture='snapshot'
    this.installHomeTexture(texture)
    this.renderer.initTexture(texture)
    previous?.dispose()
  }
  beginTransition(from:SceneMode,to:SceneMode,index?:number) {
    if(this.disposed)return
    this.transition={from,to,index:index??Math.round(this.lastRead.current)}
    this.canvas.dataset.transition=`${from}:${to}`
    this.routeOut=0;this.routeIn=1
    if(to==='works')this.animateIn()
    const u=this.composite.material.uniforms
    u.tFrom.value=this.fromRT.texture;u.tTo.value=this.toRT.texture
    u.uProgress.value=0;u.uProgress2.value=0;u.uReturn.value=to==='home'?1:0
    // Produce the first old/new frame before React hides the DOM homepage.
    this.renderMode(from,this.lastRead,this.fromRT)
    this.renderMode(to,this.lastRead,this.toRT)
  }
  setTransitionProgress(p:number,p2?:number) {
    this.composite.material.uniforms.uProgress.value=clamp(p)
    this.composite.material.uniforms.uProgress2.value=clamp(p2??p)
  }
  endTransition(){this.transition=null;this.composite.visible=false;this.routeOut=0;this.routeIn=1;if(this.mode==='home'||this.mode==='about')this.resetCircles();delete this.canvas.dataset.transition}
  captureMode(mode:SceneMode,index?:number):THREE.Texture {
    const read=index==null?this.lastRead:{...this.lastRead,current:index,selectedIndex:index}
    this.renderMode(mode,read,this.toRT)
    this.renderer.setRenderTarget(null)
    return this.toRT.texture
  }

  resize() {
    if(this.disposed)return
    this.width=this.canvas.clientWidth||window.innerWidth
    this.height=this.canvas.clientHeight||window.innerHeight
    this.aspect=this.width/Math.max(1,this.height)
    this.dpr=Math.min(window.devicePixelRatio||1,V.bg.maxDpr)
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(this.width,this.height,false)
    this.camera.aspect=this.aspect
    this.camera.position.z=mix(5,8,clamp((1.1-this.aspect)/0.6))
    this.camera.updateProjectionMatrix()
    const ratio=Math.min(this.dpr,1.5)
    this.fromRT.setSize(Math.round(this.width*ratio),Math.round(this.height*ratio))
    this.toRT.setSize(Math.round(this.width*ratio),Math.round(this.height*ratio))
    this.home.material.uniforms.uAspect.value=this.aspect
    const u=this.composite.material.uniforms
    u.uResolution.value.set(this.width*ratio,this.height*ratio);u.uDpr.value=this.dpr
    this.allCovers.forEach(c=>{
      c.circle.material.uniforms.uResolution.value.set(this.width*this.dpr,this.height*this.dpr)
      c.circle.material.uniforms.uDpr.value=this.dpr
    })
    this.bgU.uDpr.value=this.dpr
    this.homeWorld.setSize(this.width,this.height,this.dpr)
    this.directoryFluid.setSize(this.width,this.height)
    this.reader.setSize(this.width,this.height,this.dpr)
    this.snapLayout()
  }
  warmup() {
    if(this.disposed)return
    const states=this.allCovers.map(c=>c.mesh.visible)
    this.allCovers.forEach(c=>c.mesh.visible=true)
    this.renderer.compile(this.scene,this.camera)
    this.renderer.compile(this.screenScene,this.screenCamera)
    this.allCovers.forEach((c,i)=>{c.mesh.visible=states[i];if(c.texture)this.renderer.initTexture(c.texture)})
  }
  snapLayout(read?:{current:number;count:number}) {
    if(read)this.lastRead={...this.lastRead,...read,selectedIndex:Math.round(read.current)}
    // A scope change must not render one frame in the previous category's colors.
    if(this.lastIndex===-1){
      const index=clamp(Math.round(this.lastRead.current),0,Math.max(0,this.covers.length-1))
      const entry=this.covers[index]
      gsap.killTweensOf(this.bgColorA);gsap.killTweensOf(this.bgColorB)
      if(entry){
        this.bgColorA.set(entry.work.themeColors[1])
        this.bgColorB.set(entry.work.themeColors[0])
        this.bgU.uColorA.value.copy(this.bgColorA)
        this.bgU.uColorB.value.copy(this.bgColorB)
      }
    }
    this.layoutCovers(this.mode,this.lastRead)
  }
  private animateIn() {
    const selected=Math.round(this.lastRead.current)
    this.covers.forEach((c,i)=>{
      gsap.killTweensOf(c.intro)
      if(this.reduceBend){c.intro.scale=1;c.intro.y=0;return}
      c.intro.scale=0;c.intro.y=-0.3
      const distance=Math.abs(i-selected)
      gsap.to(c.intro,{scale:1,duration:2,ease:'elastic.out(1.1,1.5)',delay:.3+distance*.1})
      gsap.to(c.intro,{y:0,duration:1,ease:'expo.out',delay:.1+distance*.1})
    })
  }
  private setCirclePhase(phase:CirclePhase) {
    this.circlePhase=phase
    if(!this.inspectDirectoryMotion)return
    const state=this.covers[this.activeCircle]?.circleState
    this.circleTrace.push({phase,t:Number(performance.now().toFixed(1)),active:this.activeCircle,target:this.circleTarget,current:Number(this.lastRead.current.toFixed(4)),scale:state?.scale??0,bg:this.bgColorA.getHexString(),bgB:this.bgColorB.getHexString()})
    this.circleTrace=this.circleTrace.slice(-24)
    this.canvas.dataset.circlePhase=phase
    this.canvas.dataset.circleTrace=JSON.stringify(this.circleTrace)
  }
  private resetCircles() {
    this.circleTimeline?.kill();this.circleTimeline=null
    gsap.killTweensOf(this.bgColorA);gsap.killTweensOf(this.bgColorB)
    this.allCovers.forEach(c=>{
      gsap.killTweensOf(c.circleState)
      Object.assign(c.circleState,{scale:0,mask:0,alpha:0,clock:0})
      c.circle.visible=false
    })
    this.activeCircle=-1;this.circleTarget=-1;this.circleSettledFor=0
    this.setCirclePhase('idle')
  }
  private circleAligned(read:Read,index:number) {
    return Math.abs(read.current-index)<CIRCLE_MOTION.tolerance&&Math.abs(read.target-index)<CIRCLE_MOTION.tolerance
  }
  private openCircle(index:number,instant=false) {
    const c=this.covers[index]
    if(!c)return
    this.covers.forEach(entry=>{entry.circleState.alpha=0;entry.circleState.scale=0})
    this.activeCircle=index
    Object.assign(c.circleState,{scale:instant?1:0,mask:1,alpha:1,clock:0})
    c.circle.renderOrder=-40
    if(instant){this.setCirclePhase('idle');return}
    this.setCirclePhase('opening')
    this.circleTimeline=gsap.timeline({onComplete:()=>{this.circleTimeline=null;this.setCirclePhase('idle')}})
      .to(c.circleState,{scale:1,duration:CIRCLE_MOTION.open,ease:'power3.out'})
  }
  private closeCircle() {
    this.circleTimeline?.kill();this.circleTimeline=null
    this.circleSettledFor=0
    const c=this.covers[this.activeCircle]
    if(!c||c.circleState.scale<.0001){this.setCirclePhase('waiting');return}
    this.setCirclePhase('closing')
    // Keep the old colour and fluid field while its radius contracts; no overlapping circles.
    this.circleTimeline=gsap.timeline({onComplete:()=>{
      c.circleState.alpha=0
      this.circleTimeline=null
      this.setCirclePhase('waiting')
    }}).to(c.circleState,{scale:0,duration:CIRCLE_MOTION.close,ease:'power3.inOut'})
  }
  private recolorCircle(index:number) {
    const c=this.covers[index]
    if(!c)return
    const [a,b]=c.work.themeColors,ca=new THREE.Color(b),cb=new THREE.Color(a)
    this.setCirclePhase('coloring')
    this.lastIndex=index
    this.circleTimeline=gsap.timeline({onComplete:()=>{
      this.circleTimeline=null
      if(this.circleTarget===index&&this.circleAligned(this.lastRead,index))this.openCircle(index)
      else {this.circleSettledFor=0;this.setCirclePhase('waiting')}
    }}).to(this.bgColorA,{r:ca.r,g:ca.g,b:ca.b,duration:CIRCLE_MOTION.recolor,ease:'power2.inOut'},0)
      .to(this.bgColorB,{r:cb.r,g:cb.g,b:cb.b,duration:CIRCLE_MOTION.recolor,ease:'power2.inOut'},0)
  }
  private updateCircles(dt:number,read:Read,selected:number) {
    const target=clamp(Math.round(read.target),0,Math.max(0,this.covers.length-1))
    if(!this.covers[target])return
    const targetChanged=this.circleTarget!==target
    this.circleTarget=target
    if(this.reduceBend){
      if(this.activeCircle!==selected||this.circlePhase!=='idle'){
        this.circleTimeline?.kill();this.circleTimeline=null
        const [a,b]=this.covers[selected].work.themeColors
        this.bgColorA.set(b);this.bgColorB.set(a);this.lastIndex=selected
        this.openCircle(selected,true)
      }
      return
    }
    const aligned=this.circleAligned(read,target)
    if(this.activeCircle===-1&&this.circlePhase==='idle'&&aligned){
      const [a,b]=this.covers[target].work.themeColors
      this.bgColorA.set(b);this.bgColorB.set(a);this.lastIndex=target
      this.openCircle(target)
    }else if((this.circlePhase==='idle'||this.circlePhase==='opening')&&!this.circleAligned(read,this.activeCircle)){
      this.closeCircle()
    }else if(this.circlePhase==='coloring'&&(!aligned||targetChanged)){
      this.circleTimeline?.kill();this.circleTimeline=null
      this.circleSettledFor=0;this.setCirclePhase('waiting')
    }
    if(this.circlePhase==='waiting'){
      this.circleSettledFor=aligned&&!targetChanged?this.circleSettledFor+dt:0
      if(this.circleSettledFor>=CIRCLE_MOTION.settle)this.recolorCircle(target)
    }
    if(this.inspectDirectoryMotion){
      this.canvas.dataset.circleScale=(this.covers[this.activeCircle]?.circleState.scale??0).toFixed(4)
      this.canvas.dataset.circleActive=String(this.activeCircle)
      this.canvas.dataset.circleTarget=String(target)
      this.canvas.dataset.circlePosition=read.current.toFixed(4)
      this.canvas.dataset.circleBg=this.bgColorA.getHexString()
      this.canvas.dataset.circleBgB=this.bgColorB.getHexString()
    }
  }
  private updateState(dt:number,read:Read,now:number) {
    const selected=clamp(Math.round(read.current),0,Math.max(0,this.covers.length-1))
    const isDirectory=this.mode==='works'||this.transition?.to==='works'||this.transition?.from==='works'
    if(isDirectory)this.updateCircles(dt,read,selected)
    this.bgU.uColorA.value.copy(this.bgColorA);this.bgU.uColorB.value.copy(this.bgColorB)
    this.bgU.uTime.value=now
    this.raycaster.setFromCamera(this.pointer,this.camera)
    const hit=!this.reduceBend&&this.mode==='works'&&!this.transition?this.raycaster.intersectObjects(this.covers.filter(c=>c.mesh.visible).map(c=>c.mesh),false)[0]:undefined
    this.covers.forEach((c,i)=>{
      const hovered=hit?.object===c.mesh
      c.hover=THREE.MathUtils.damp(c.hover,hovered?1:0,hovered?6:9,dt)
      const local=hovered?c.mesh.worldToLocal(hit.point.clone()):null
      c.hoverX=THREE.MathUtils.damp(c.hoverX,local?clamp(local.x,-.5,.5):0,9,dt)
      c.hoverY=THREE.MathUtils.damp(c.hoverY,local?clamp(local.y,-.5,.5):0,9,dt)
      c.uniforms.uTime.value=now
      c.uniforms.uDecorations.value=this.reduceBend?0:1
      const current=i===this.activeCircle?1:0
      c.uniforms.uSelected.value=THREE.MathUtils.damp(c.uniforms.uSelected.value,current,10,dt)
      const state=c.circleState,u=c.circle.material.uniforms
      state.clock+=this.reduceBend?0:dt*(1+c.hover*.5)
      u.uTime.value=now;u.uClock.value=state.clock;u.uMask.value=state.mask;u.uAlpha.value=state.alpha
      u.tFluid.value=this.directoryFluid.texture
    })
  }
  private viewportAt(z:number) {
    const h=2*Math.max(.1,this.camera.position.z-z)*Math.tan(THREE.MathUtils.degToRad(22.5))
    return {w:h*this.aspect,h}
  }
  private stageRect(videoAspect:string):Rect {
    if(this.domStage&&this.domStage.w>1&&this.domStage.h>1)return this.domStage
    const [aw,ah]=videoAspect.split('/').map(Number)
    const aspect=aw>0&&ah>0?aw/ah:16/9
    let w=this.width*.78,h=w/aspect
    if(h>this.height*.66){h=this.height*.66;w=h*aspect}
    return {x:(this.width-w)/2,y:(this.height-h)/2,w,h}
  }
  private layoutCovers(mode:SceneMode,read:Read) {
    const visible=mode==='works'||mode==='collection'||mode==='player'
    this.camera.position.x=read.current*PITCH
    this.camera.rotation.set(0,0,0)
    this.camera.updateMatrixWorld()
    const now=this.debugFrozenTime??this.clock.getElapsedTime()
    const selected=clamp(read.selectedIndex,0,Math.max(0,this.covers.length-1))
    const worldSpeed=Math.abs(read.velocity)*PITCH
    this.covers.forEach((c,index)=>{
      const u=(index-read.current)*PITCH
      c.mesh.visible=visible&&Math.abs(u)<this.viewportAt(1.1).w*1.4+3
      const distance=smooth(clamp(Math.abs(u)/1.4))
      const base=mix(2*(this.aspect<1?1.1:1),.3,clamp(distance/2.5))
      const velocityShrink=mix(0,.05,clamp(worldSpeed/3))
      const shrink=mix(1,.9-velocityShrink,clamp(Math.abs(u)/3))
      const scale=base*shrink*mix(1,1.05,c.hover)*c.intro.scale
      const hoverCoef=mix(1,.5,c.hover)
      let x=index*PITCH,y=c.intro.y+.05+(this.reduceBend?0:Math.sin(now+index*2)*.017*u)
      let z=Math.abs(u)*-.4+1.1
      let sx=scale,sy=scale,sz=scale
      if(mode==='collection'){
        const [width,height]=c.work.videoAspect.split('/').map(Number)
        const aspect=width>0&&height>0?width/height:c.imageAspect
        if(aspect<1)sx*=aspect
        else sy/=aspect
      }
      let rx=.025-c.hoverY*.5,ry=-.075+hoverCoef*u*-.45+c.hoverX*.5,rz=hoverCoef*u*-.1
      let alpha=(1-this.routeOut)*this.routeIn
      y+=(1-this.routeIn)*.6-this.routeOut*.5
      const focus=mode==='player'&&index===selected?this.focus:0
      if(mode==='player'&&index!==selected){sx*=1-this.exit;sy*=1-this.exit;alpha*=1-this.exit;y-=this.exit*.1}
      if(focus>0){
        const rect=this.stageRect(c.work.videoAspect)
        const vp=this.viewportAt(1.12)
        const tx=this.camera.position.x+((rect.x+rect.w/2)/this.width-.5)*vp.w
        const ty=(.5-(rect.y+rect.h/2)/this.height)*vp.h
        x=mix(x,tx,focus);y=mix(y,ty,focus);z=mix(z,1.1,focus)
        sx=mix(sx,rect.w/this.width*vp.w,focus)
        sy=mix(sy,rect.h/this.height*vp.h,focus);sz=mix(sz,2,focus)
        rx*=1-focus;ry*=1-focus;rz*=1-focus
        alpha*=1-focus*.62
      }
      c.mesh.position.set(x,y,z)
      c.mesh.scale.set(Math.max(.00001,sx),Math.max(.00001,sy),Math.max(.00001,sz))
      c.mesh.rotation.set(rx,ry,rz)
      c.mesh.updateMatrixWorld()
      c.uniforms.uAlpha.value=visible?alpha:0
      const boxAspect=Math.max(.0001,sx/Math.max(.0001,sy))
      c.uniforms.uFitUv.value.set(Math.min(1,boxAspect/c.imageAspect),Math.min(1,c.imageAspect/boxAspect))
      const vp=this.viewportAt(0)
      const cs=c.circleState
      c.circle.visible=visible&&cs.alpha>.003&&cs.scale>.0001
      c.circle.position.set(this.camera.position.x,0,-1)
      c.circle.scale.set(vp.w*3*cs.scale,vp.h*3*cs.scale,1)
      c.circle.material.uniforms.uAlpha.value=cs.alpha*(1-this.routeOut)
    })
  }
  private renderMode(mode:SceneMode,read:Read,target:THREE.WebGLRenderTarget|null) {
    const readerMode=mode==='collection'||mode==='player'
    this.reader.group.visible=readerMode
    this.bg.visible=!readerMode
    if(readerMode){
      this.camera.position.x=0;this.camera.rotation.set(0,0,0);this.camera.updateMatrixWorld()
      this.allCovers.forEach(c=>{c.mesh.visible=false;c.circle.visible=false})
      this.reader.setResolution(target?.width??this.width*this.dpr,target?.height??this.height*this.dpr)
    }
    this.renderer.setRenderTarget(target)
    this.renderer.clear()
    if(mode==='home'){
      if(this.homeWorld.ready){this.homeWorld.render(target);return}
      this.home.visible=true;this.composite.visible=false
      this.renderer.render(this.screenScene,this.screenCamera)
    }else{
      if(!readerMode)this.layoutCovers(mode,read)
      this.covers.forEach(c=>c.circle.material.uniforms.uResolution.value.set(target?.width??this.width*this.dpr,target?.height??this.height*this.dpr))
      this.renderer.render(this.scene,this.camera)
    }
  }
  update(dt:number,read:Read) {
    if(this.disposed)return
    this.lastRead=read
    const now=this.debugFrozenTime??this.clock.getElapsedTime()
    if(this.mode==='home'||this.transition?.from==='home'||this.transition?.to==='home')this.homeWorld.update(dt)
    if(this.mode==='works'||this.mode==='collection'||this.mode==='player'||this.transition?.from==='works'||this.transition?.to==='works'){
      this.directoryFluid.update(dt)
      if(this.inspectDirectoryMotion){
        const scale=this.covers[this.activeCircle]?.circleState.scale??0
        const projectionScale=this.viewportAt(0).w/this.viewportAt(-1).w*3*scale
        this.canvas.dataset.directoryFlowPx=this.directoryFluid.readFlowDisplacement(.0001,projectionScale).toFixed(1)
      }
    }
    const readerMode=this.mode==='collection'||this.mode==='player'
    if(readerMode){
      this.camera.position.x=0;this.camera.rotation.set(0,0,0);this.camera.updateMatrixWorld()
      this.reader.update(dt,read,this.pointer,this.directoryFluid.texture,slug=>this.allCovers.find(c=>c.work.slug===slug)?.texture??null,document.querySelector<HTMLVideoElement>('.works__inline-stage video'),this.reduceBend,(1-this.routeOut)*this.routeIn)
      document.body.dataset.readerWebgl='ready'
      if(this.inspectDirectoryMotion)this.canvas.dataset.readerState=JSON.stringify(this.reader.diagnostics())
    }else delete document.body.dataset.readerWebgl
    this.updateState(dt,read,now)
    if(this.transition){
      const t=this.transition
      const transitionRead={...read,selectedIndex:t.index}
      this.renderMode(t.from,transitionRead,this.fromRT)
      this.renderMode(t.to,transitionRead,this.toRT)
      const u=this.composite.material.uniforms
      u.uTime.value=now
      this.home.visible=false;this.composite.visible=true
      this.renderer.setRenderTarget(null)
      this.renderer.clear()
      this.renderer.render(this.screenScene,this.screenCamera)
    }else{
      this.renderMode(this.mode,read,null)
    }
  }

  getActiveCoverRect():Rect|null {
    if(this.mode==='collection'||this.mode==='player')return this.reader.getVideoRect()
    const index=clamp(Math.round(this.lastRead.current),0,Math.max(0,this.covers.length-1))
    const c=this.covers[index]
    if(!c||!c.mesh.visible)return null
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity
    for(const x of [-.5,.5])for(const y of [-.5,.5]){
      this.projection.set(x,y,COVER_DEPTH/2).applyMatrix4(c.mesh.matrixWorld).project(this.camera)
      const px=(this.projection.x*.5+.5)*this.width,py=(-this.projection.y*.5+.5)*this.height
      left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py)
    }
    return {x:left,y:top,w:right-left,h:bottom-top}
  }
  getCardTargets(){
    if(this.transition)return []
    if(this.mode==='collection'||this.mode==='player')return this.reader.getCardTargets()
    if(this.mode!=='works')return []
    const corners=boxCorners(COVER_DEPTH)
    return this.covers.flatMap((cover,index)=>{
      const target=projectCard(index,cover.mesh,this.camera,this.width,this.height,corners)
      return target?[target]:[]
    })
  }
  debugFreezeTime(value:number|null){this.debugFrozenTime=value}
  debugReadState() {
    const index=clamp(Math.round(this.lastRead.current),0,Math.max(0,this.covers.length-1)),c=this.covers[index]
    if(!c)return null
    return {selectedIndex:index,mode:this.mode,focus:this.focus,exit:this.exit,reduceBend:this.reduceBend,frozenTime:this.debugFrozenTime,bend:0,bendMag:0,depth:0,tiltY:0,roll:0,lineVel:0,alpha:c.uniforms.uAlpha.value,geometry:'BoxGeometry',pitch:PITCH,camera:{fov:this.camera.fov,z:this.camera.position.z,x:this.camera.position.x},mesh:{x:c.mesh.position.x,y:c.mesh.position.y,z:c.mesh.position.z,scaleX:c.mesh.scale.x,scaleY:c.mesh.scale.y,rotX:c.mesh.rotation.x,rotY:c.mesh.rotation.y,rotZ:c.mesh.rotation.z},bgColorA:this.bgColorA.getHexString(),bgColorB:this.bgColorB.getHexString(),bgTargetA:this.bgColorA.getHexString(),bgTargetB:this.bgColorB.getHexString(),bgProgress:this.lastRead.current,circle:this.activeCircle,coverRect:this.getActiveCoverRect(),transition:this.transition?{...this.transition,p1:this.composite.material.uniforms.uProgress.value,p2:this.composite.material.uniforms.uProgress2.value}:null}
  }
  dispose() {
    if(this.disposed)return
    this.disposed=true
    window.removeEventListener('pointermove',this.onPointerMove)
    window.removeEventListener('pointerout',this.onPointerOut)
    gsap.killTweensOf(this.bgColorA);gsap.killTweensOf(this.bgColorB)
    this.circleTimeline?.kill();this.circleTimeline=null
    this.reader.dispose()
    delete document.body.dataset.readerWebgl
    this.allCovers.forEach(c=>{
      gsap.killTweensOf(c.intro)
      gsap.killTweensOf(c.circleState)
      c.mesh.geometry.dispose();c.material.dispose();c.texture?.dispose()
      c.circle.geometry.dispose();c.circle.material.dispose()
    })
    this.covers=[]
    this.allCovers=[]
    this.normalTexture?.dispose();this.fallbackHome?.dispose();this.homeSnapshot?.dispose()
    this.homeWorld.dispose()
    this.directoryFluid.dispose()
    for(const mesh of [this.bg,this.home,this.composite]){mesh.geometry.dispose();mesh.material.dispose()}
    this.fromRT.dispose();this.toRT.dispose();this.renderer.dispose()
    this.scene.clear();this.screenScene.clear()
  }
}

export function detectWebGL():boolean {
  try {
    const canvas=document.createElement('canvas')
    const gl=canvas.getContext('webgl2')||canvas.getContext('webgl')
    if(!gl)return false
    const okay=typeof gl.createProgram==='function'
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return okay
  } catch {return false}
}
