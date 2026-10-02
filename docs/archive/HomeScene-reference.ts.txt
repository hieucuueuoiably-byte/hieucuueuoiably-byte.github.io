import * as THREE from 'three'
import gsap from 'gsap'
import { SCREEN_VERTEX } from './BackgroundMaterial'
import { HomeFluid } from './HomeFluid'
import * as S from './HomeOriginalShaders'

const SPRITE_VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const rawColor = (hex: string) => new THREE.Color().setHex(parseInt(hex.replace('#',''),16),THREE.LinearSRGBColorSpace)
const clamp = THREE.MathUtils.clamp
type Sprite = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>

/** The reference's multipart illustration, original UV shaders and GPU fluid.
 * Artwork stays in raw sRGB through internal targets, then becomes linear only
 * when feeding the portfolio's existing scene-transition targets.
 */
export class HomeScene {
  readonly fluid: HomeFluid
  ready = false
  private disposed = false
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(45,1,2,80)
  private screen = new THREE.Scene()
  private screenCamera = new THREE.Camera()
  private clouds = new THREE.Scene()
  private cloudCamera = new THREE.PerspectiveCamera(45,1,2,80)
  private contentRT = this.target(true)
  private portalRT = this.target(false)
  private cloudRT = this.target(false)
  private portal: Sprite
  private cloudComposite: Sprite
  private output: Sprite
  private geometry = new THREE.PlaneGeometry(1,1)
  private textures = new Map<string, THREE.Texture>()
  private materials: THREE.ShaderMaterial[] = []
  private loadJobs: Promise<unknown>[] = []
  private resolution = new THREE.Vector2(1,1)
  private ponpon = new THREE.Group()
  private wolf = new THREE.Group()
  private simon = new THREE.Group()
  private wolfTail = new THREE.Group()
  private wolfArm = new THREE.Group()
  private simonArm = new THREE.Group()
  private tray!: Sprite
  private crepe!: Sprite
  private skyTop!: THREE.Mesh
  private skyBottom!: THREE.Mesh
  private moon!: Sprite
  private stars!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
  private fireflies!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
  private balloonGeometry = new THREE.SphereGeometry(1,35,22)
  private balloons: { mesh:THREE.Mesh; rope:THREE.Line; points:Float32Array; base:THREE.Vector3; seed:number; scale:number }[] = []
  private fireworks!: THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>
  private burstData=new Float32Array(384*4)
  private burstSlot=0
  private nextBurst=1
  private cloudMesh!: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>
  private cloudPositions = new Float32Array(40*3)
  private cloudBase = new Float32Array(40*3)
  private cloudRandom = new Float32Array(40*4)
  private cloudVelocity = new Float32Array(40*2)
  private mouse = new THREE.Vector2()
  private smoothMouse = new THREE.Vector2()
  private previousPointer: THREE.Vector2 | null = null
  private width = 1280
  private height = 720
  private dpr = 1
  private portrait = false
  private reduced = false
  private started = false
  private elapsed = 0
  private frame = 0
  private pointerMoves = 0
  private intro = { portal:0, ponpon:0, wolf:0, simon:0, city:0, cloud:0, cloudScale:0, spin:0, hover:0 }
  private entrance: gsap.core.Timeline | null = null
  private viewport = new THREE.Vector2()

  constructor(private renderer: THREE.WebGLRenderer) {
    this.fluid = new HomeFluid(renderer)
    this.camera.position.z = this.cloudCamera.position.z = 5
    this.portal = this.screenQuad(S.PORTAL_FRAGMENT,{
      tMap:{value:this.contentRT.texture}, tMask:{value:this.texture('ponpon-mask')},
      tFluid:{value:this.fluid.texture}, uIntro:{value:0}, uStageWidth:{value:1},
      uHovered:{value:0}, uBackgroundColor:{value:rawColor('#7E7EFF')}, uOutlineColor:{value:rawColor('#E5B58C')},
    })
    this.cloudComposite = this.screenQuad(S.CLOUD_COMPOSITE_FRAGMENT,{
      tMap:{value:this.cloudRT.texture},uFluid:{value:this.fluid.texture},uColor:{value:rawColor('#EC8DB6')},uAlpha:{value:1},
    })
    this.output = this.screenQuad(`
      uniform sampler2D tMap;uniform sampler2D tClouds;uniform float uToLinear;
      varying vec2 vUv;
      vec3 linearize(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
      void main(){vec4 p=texture2D(tMap,vUv);vec4 c=texture2D(tClouds,vUv);vec3 rgb=mix(p.rgb,c.rgb,c.a);gl_FragColor=vec4(mix(rgb,linearize(rgb),uToLinear),1.);}`,{
        tMap:{value:this.portalRT.texture},tClouds:{value:null},uToLinear:{value:0},
      })
    this.createEnvironment()
    this.createPonpon()
    this.createWolf()
    this.createSimon()
    this.createClouds()
    this.createParticles()
    this.createBalloons()
    this.createFireworks()
    window.addEventListener('portfolio:home-hover',this.onHover)
    window.addEventListener('pointerup',this.onPointerUp,{passive:true})
    Promise.all(this.loadJobs).then(()=>{
      if(this.disposed)return
      this.ready=true
      document.documentElement.dataset.homeWebgl='ready'
      renderer.domElement.dataset.homeFluid=this.fluid.supported?'gpu':'unavailable'
    }).catch(()=>{
      if(!this.disposed)document.documentElement.dataset.homeWebgl='fallback'
    })
  }

  private target(depthBuffer: boolean) {
    const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter})
    target.texture.colorSpace=THREE.NoColorSpace
    return target
  }
  private texture(name: string) {
    const existing=this.textures.get(name)
    if(existing)return existing
    let resolve!: (value:unknown)=>void, reject!: (reason?:unknown)=>void
    this.loadJobs.push(new Promise((res,rej)=>{resolve=res;reject=rej}))
    const texture=new THREE.TextureLoader().load(`/home-original/${name}.webp`,loaded=>{
      if(this.disposed){loaded.dispose();return}
      this.renderer.initTexture(loaded);resolve(loaded)
    },undefined,reject)
    texture.colorSpace=THREE.NoColorSpace
    texture.minFilter=THREE.LinearFilter
    texture.magFilter=THREE.LinearFilter
    texture.generateMipmaps=false
    this.textures.set(name,texture)
    return texture
  }
  private material(fragmentShader:string,uniforms:Record<string,THREE.IUniform>={},vertexShader=SPRITE_VERTEX) {
    // The original arm mask contains a zero-width map range. Define that step
    // explicitly rather than relying on undefined division/smoothstep behavior.
    fragmentShader=fragmentShader.replace('cmap(vUv.y, 0.4, 0.4, 0., 1.)','step(0.4, vUv.y)')
    const material=new THREE.ShaderMaterial({name:'OriginalHomePart',vertexShader,fragmentShader,
      transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
      uniforms:{uTime:{value:0},uLocalTime:{value:0},uResolution:{value:this.resolution},
        uAlpha:{value:1},uCityIntro:{value:1},uBlinkToggle:{value:1},uRotation:{value:1},
        uIndexX:{value:0},uIndexY:{value:0},uSpriteWidth:{value:1},uSpriteHeight:{value:1},...uniforms},
    })
    this.materials.push(material)
    return material
  }
  private screenQuad(fragment:string,uniforms:Record<string,THREE.IUniform>) {
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material(fragment,uniforms,SCREEN_VERTEX))
    mesh.material.depthTest=false;mesh.material.transparent=false;mesh.material.blending=THREE.NoBlending
    mesh.frustumCulled=false
    return mesh
  }
  private sprite(parent:THREE.Object3D,asset:string,fragment:string,size:number|number[],position:number[],grid=[1,1,0,0],order=0) {
    const mesh=new THREE.Mesh(this.geometry,this.material(fragment,{
      tMap:{value:this.texture(asset)},tFluid:{value:this.fluid.texture},
      uSpriteWidth:{value:grid[0]},uSpriteHeight:{value:grid[1]},uIndexX:{value:grid[2]},uIndexY:{value:grid[3]},
    }))
    const dimensions=typeof size==='number'?[size,size,size]:size
    mesh.scale.set(dimensions[0],dimensions[1],dimensions[2]??1)
    mesh.position.set(position[0],position[1],position[2]??0)
    mesh.renderOrder=order
    parent.add(mesh)
    return mesh
  }
  private createEnvironment() {
    const skyMaterial=(name:string)=>{
      const m=this.material(S.SKY_FRAGMENT,{tMap:{value:this.texture(name)},uFluid:{value:this.fluid.texture},uReverse:{value:0}})
      m.side=THREE.BackSide
      return m
    }
    this.skyTop=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),skyMaterial('loop-sky-top'))
    this.skyTop.scale.set(12.6,9,16.2);this.skyTop.position.set(0,2,-5);this.skyTop.renderOrder=-100
    this.skyBottom=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),skyMaterial('loop-sky-bottom'))
    this.skyBottom.scale.set(18,15,27);this.skyBottom.position.set(0,10,-12);this.skyBottom.rotation.y=Math.PI;this.skyBottom.renderOrder=-101
    this.scene.add(this.skyBottom,this.skyTop)
    this.moon=this.sprite(this.scene,'home-moon',S.MOON_FRAGMENT,14,[7.7,10,-35],[1,1,0,0],-90)
    this.moon.material.uniforms.uFluid={value:new THREE.Vector4()}
    this.sprite(this.scene,'home-city',S.CITY_FRAGMENT,4,[0,.2,-4],[1,1,0,0],0)
    this.sprite(this.scene,'home-woofers',S.WOOFER_LEFT_FRAGMENT,2,[-3.28,-.68,-4.1],[1,1,0,0],1)
    this.sprite(this.scene,'home-woofers',S.WOOFER_RIGHT_FRAGMENT,2,[3.2,-.68,-4.1],[1,1,0,0],1)
    this.sprite(this.scene,'home-veggies',S.VEGGIES_FRAGMENT,[6,1.5,1.5],[.015,-.65,-.4],[1,1,0,0],3)
    this.sprite(this.scene,'ponpon-plateform',S.PLATFORM_FRAGMENT,[508/290,1,1],[0,-.9,-.1],[1,1,0,0],5)
    const disc=new THREE.Mesh(this.geometry,this.material(S.DISC_FRAGMENT))
    disc.scale.set(1638/461*2.03,1.7*2.03,2*2.03);disc.position.set(0,-1.5,-.5);disc.rotation.x=-Math.PI/2.7;disc.renderOrder=2
    this.scene.add(disc)
  }
  private createPonpon() {
    this.ponpon.position.set(-.07,.24,-.05)
    const body=this.sprite(this.ponpon,'home-ponpon',S.PONPON_FRAGMENT,2.09,[0,0,0],[1,1,0,0],10)
    body.material.uniforms.tEyes={value:this.texture('home-ponpon-eyes')}
    this.scene.add(this.ponpon)
  }
  private createWolf() {
    this.wolf.rotation.y=.15
    this.sprite(this.wolf,'home-jl-sprite',S.SPRITE_FRAGMENT,1.78,[0,0,0],[2,2,0,1],20)
    this.sprite(this.wolf,'home-jl-sprite',S.JEAN_LOUP_HEAD_FRAGMENT,[1.8,.9,.9],[.2,.9,.33],[2,4,0,0],23)
    this.wolfTail.scale.setScalar(1.1);this.wolfTail.position.set(.2,-.17,-.06)
    this.sprite(this.wolfTail,'home-jl-sprite',S.SPRITE_FRAGMENT,1,[.4,.4,0],[4,4,3,2],19)
    this.wolf.add(this.wolfTail)
    const rightArm=new THREE.Group();rightArm.scale.setScalar(1.02);rightArm.position.set(.58,.3,.2)
    this.sprite(rightArm,'home-jl-sprite',S.SPRITE_FRAGMENT,1,[0,0,0],[4,4,2,3],22)
    this.wolf.add(rightArm)
    this.wolfArm.scale.setScalar(1.11);this.wolfArm.position.set(.355,.225,-.09)
    this.sprite(this.wolfArm,'home-jl-sprite',S.SPRITE_FRAGMENT,1,[-.5,.5,0],[4,4,2,1],21)
    this.sprite(this.wolfArm,'home-jl-sprite',S.BEER_FRAGMENT,.794,[-.95,.817,.1],[4,4,2,0],24)
    this.wolf.add(this.wolfArm)
    this.sprite(this.wolf,'home-jl-sprite',S.SPRITE_FRAGMENT,.75,[.47,.35,.24],[4,4,2,2],25)
    this.tray=this.sprite(this.wolf,'home-jl-sprite',S.TRAY_FRAGMENT,.97,[.17,.22,.3],[4,4,3,3],26)
    this.scene.add(this.wolf)
  }
  private createSimon() {
    this.simon.rotation.y=.1
    const body=this.sprite(this.simon,'home-simon',S.SIMON_BODY_FRAGMENT,[1.5,3,1.5],[0,0,0],[2,1,0,0],30)
    body.rotation.y=.05
    this.simonArm.position.set(.7,0,-.4);this.simonArm.scale.setScalar(.9)
    this.sprite(this.simonArm,'home-simon',S.SIMON_ARM_FRAGMENT,1,[0,0,0],[4,4,2,1],31)
    this.sprite(this.simon,'home-simon',S.SIMON_LEFT_ARM_FRAGMENT,.9,[-.315,.24,.1],[4,4,2,0],33)
    this.sprite(this.simonArm,'home-simon',S.SIMON_ARM_FRAGMENT,1,[0,0,0],[4,4,3,1],35)
    this.crepe=this.sprite(this.simonArm,'home-simon',S.CREPE_FRAGMENT,.46*1.4,[.223,-.105,0],[4,4,3,0],34)
    this.crepe.material.depthTest=false
    this.simon.add(this.simonArm);this.scene.add(this.simon)
  }

  private createParticles() {
    const seed=(index:number,salt:number)=>((index*salt+salt*3)%997)/997
    const create=(count:number,star:boolean)=>{
      const positions=new Float32Array(count*3),random=new Float32Array(count*4)
      for(let i=0;i<count;i++){
        positions.set([seed(i,137)*1.8-.4,star?seed(i,251)*1.8-.4:.1+seed(i,251)*.45,star?seed(i,97)-10.5:i*.04+.6],i*3)
        random.set([seed(i,71),seed(i,131),seed(i,193),seed(i,229)],i*4)
      }
      const geometry=new THREE.BufferGeometry()
      geometry.setAttribute('position',new THREE.BufferAttribute(positions,3))
      geometry.setAttribute('random',new THREE.BufferAttribute(random,4))
      const vertex=(star?S.STARS_VERTEX:S.FIREFLY_VERTEX).replace(/^attribute vec3 position;\s*/,'')
        .replace(/^uniform mat4 (modelMatrix|viewMatrix|projectionMatrix);\s*/gm,'')
      const material=this.material(star?S.STARS_FRAGMENT:S.FIREFLY_FRAGMENT,{
        uMap:{value:this.texture(star?'night-star':'night-firefly')},uDpr:{value:this.dpr},
        uFluid:{value:this.fluid.texture},uColor:{value:rawColor('#ffe0a6')},
      },vertex)
      const mesh=new THREE.Points(geometry,material)
      mesh.renderOrder=star?-105:40
      mesh.frustumCulled=false
      if(star)mesh.position.set(0,2,-20)
      this.scene.add(mesh)
      return mesh
    }
    this.stars=create(246,true);this.fireflies=create(40,false)
  }
  private createBalloons() {
    const colors=['#7E7EFF','#EB8DB7','#ED1C25','#F87800']
    const data=[[-1.5,-2,1.5,.8],[2,-1,-5,1],[1.7,-2,-3,1],[-1.2,-5,2,1],[2,-3,-2,1],[-1.9,-4,2.4,.856],[-.5,-2,-8,1],[-1.3,-2,-6,1]]
    const vertex=S.BALLOON_VERTEX.replace(/^attribute vec3 (position|normal);\s*/gm,'').replace(/^attribute vec2 uv;\s*/m,'')
      .replace(/^uniform mat[34] (modelViewMatrix|projectionMatrix|normalMatrix);\s*/gm,'')
    data.forEach(([x,y,z,scale],i)=>{
      const material=this.material(S.BALLOON_FRAGMENT,{uSprite:{value:this.texture('balloon-sprite')},uIndex:{value:i%2},uColor:{value:rawColor(colors[i%4])}},vertex)
      material.side=THREE.FrontSide
      const mesh=new THREE.Mesh(this.balloonGeometry,material)
      mesh.scale.setScalar(.25*scale);mesh.position.set(x,y,z);mesh.renderOrder=z>1.8?42:7
      const outlineMaterial=this.material(S.BALLOON_OUTLINE_FRAGMENT,{uColor:{value:rawColor('#171717')}},vertex)
      outlineMaterial.side=THREE.BackSide
      const outline=new THREE.Mesh(this.balloonGeometry,outlineMaterial);outline.scale.setScalar(1.04)
      outline.renderOrder=mesh.renderOrder-1;mesh.add(outline)
      const points=new Float32Array(16*3),geometry=new THREE.BufferGeometry()
      geometry.setAttribute('position',new THREE.BufferAttribute(points,3).setUsage(THREE.DynamicDrawUsage))
      const rope=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:rawColor('#171717'),depthWrite:false,toneMapped:false}))
      rope.renderOrder=mesh.renderOrder-1;rope.frustumCulled=false
      this.scene.add(mesh,rope)
      this.balloons.push({mesh,rope,points,base:new THREE.Vector3(x,y,z),seed:i*.67+.1,scale})
    })
  }
  private createFireworks() {
    const direction=new Float32Array(384*3),seeds=new Float32Array(384)
    for(let i=0;i<384;i++){
      const angle=(i%64)/64*Math.PI*2,speed=.65+((i*29)%41)/41*.8
      direction.set([Math.cos(angle)*speed,Math.sin(angle)*speed,Math.sin(i*2.7)*.4],i*3)
      seeds[i]=((i*31)%97)/97;this.burstData[i*4+3]=-100
    }
    const g=new THREE.BufferGeometry()
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(384*3),3))
    g.setAttribute('burst',new THREE.BufferAttribute(this.burstData,4).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('direction',new THREE.BufferAttribute(direction,3))
    g.setAttribute('seed',new THREE.BufferAttribute(seeds,1))
    const vertex=`attribute vec4 burst;attribute vec3 direction;attribute float seed;uniform float uTime;uniform float uDpr;varying float vAlpha;varying vec3 vColor;
      void main(){float age=uTime-burst.w;float alive=step(0.,age)*(1.-step(1.7,age));float t=max(0.,age);vec3 p=burst.xyz+direction*t*.75;p.y-=t*t*.2;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=(3.+seed*4.)*uDpr*5./max(2.,-mv.z);vAlpha=alive*pow(max(0.,1.-t/1.7),1.2);vColor=mix(vec3(1.,.95,.84),vec3(.925,.55,.713),step(.6,seed));}`
    const fragment=`uniform sampler2D uMap;varying float vAlpha;varying vec3 vColor;void main(){vec4 tex=texture2D(uMap,gl_PointCoord);float alpha=tex.a*vAlpha;if(alpha<.01)discard;gl_FragColor=vec4(vColor,alpha);}`
    this.fireworks=new THREE.Points(g,this.material(fragment,{uMap:{value:this.texture('night-star')},uDpr:{value:this.dpr}},vertex))
    this.fireworks.renderOrder=45;this.fireworks.frustumCulled=false;this.scene.add(this.fireworks)
  }
  private emitBurst(x:number,y:number,z:number) {
    const start=(this.burstSlot++%6)*64
    for(let i=start;i<start+64;i++)this.burstData.set([x,y,z,this.elapsed],i*4)
    ;(this.fireworks.geometry.getAttribute('burst') as THREE.BufferAttribute).needsUpdate=true
  }
  private onPointerUp=(event:PointerEvent)=>{
    if(this.reduced||!this.ready||document.body.dataset.route!=='home'||document.body.classList.contains('is-transitioning'))return
    if(event.target instanceof Element&&event.target.closest('button,a'))return
    const h=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*7
    this.emitBurst((event.clientX/this.width-.5)*h*this.width/this.height,(.5-event.clientY/this.height)*h,-2)
  }
  private createClouds() {
    const g=new THREE.InstancedBufferGeometry()
    const plane=new THREE.PlaneGeometry(2,2)
    g.index=plane.index?.clone()??null
    g.setAttribute('position',plane.getAttribute('position').clone())
    g.setAttribute('uv',plane.getAttribute('uv').clone())
    plane.dispose()
    for(let i=0;i<40;i++){
      const t=i/39,tilt=t*2-1,edge=Math.abs(tilt),sign=i%2===0?1:-1
      const y=THREE.MathUtils.mapLinear(edge,.2,1,.1,.2)*sign+THREE.MathUtils.mapLinear(edge,.4,1.2,0,.4)-1.6
      this.cloudBase.set([-3.3+t*6.6,y,1+((i*13)%17)/340],i*3)
      this.cloudRandom.set([((i*19+3)%41)/41,((i*23+7)%43)/43,((i*17+11)%47)/47,tilt],i*4)
    }
    this.cloudPositions.set(this.cloudBase)
    g.setAttribute('offset',new THREE.InstancedBufferAttribute(this.cloudPositions,3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('random',new THREE.InstancedBufferAttribute(this.cloudRandom,4))
    g.instanceCount=40
    const vertex=S.CLOUD_VERTEX.replace(/^attribute vec3 position;\s*/,'').replace(/^attribute vec2 uv;\s*/m,'')
      .replace(/^uniform mat4 (modelMatrix|viewMatrix|projectionMatrix);\s*/gm,'')
    this.cloudMesh=new THREE.Mesh(g,this.material(S.CLOUD_FRAGMENT,{
      uColor:{value:rawColor('#EC8DB6')},uFluid:{value:this.fluid.texture},uIntro:{value:0},uIntro2:{value:0},
    },vertex))
    this.cloudMesh.frustumCulled=false
    this.clouds.add(this.cloudMesh)
  }

  setSize(width:number,height:number,dpr:number) {
    this.width=width;this.height=height;this.dpr=Math.min(dpr,1.5)
    this.portrait=width/height<.9
    const w=Math.max(1,Math.round(width*this.dpr)),h=Math.max(1,Math.round(height*this.dpr))
    this.resolution.set(w,h)
    for(const rt of [this.contentRT,this.portalRT,this.cloudRT])rt.setSize(w,h)
    this.camera.aspect=this.cloudCamera.aspect=width/height
    this.camera.fov=45
    this.cloudCamera.fov=THREE.MathUtils.mapLinear(clamp(width/height,.8,1.25),.8,1.25,50,45)
    this.camera.updateProjectionMatrix();this.cloudCamera.updateProjectionMatrix()
    this.fluid.setSize(width,height)
    this.portal.material.uniforms.uStageWidth.value=width
    this.viewport.set(2*Math.tan(THREE.MathUtils.degToRad(this.cloudCamera.fov/2))*5*width/height,2*Math.tan(THREE.MathUtils.degToRad(this.cloudCamera.fov/2))*5)
    this.scene.traverse(object=>{
      const mesh=object as Sprite
      if(mesh.material?.uniforms?.uCityIntro&&mesh.material.uniforms.tMap?.value===this.textures.get('home-city'))
        mesh.scale.set(this.portrait?9.4:4,this.portrait?4.7:4,this.portrait?9.4:4)
    })
    this.applyCharacterPositions()
    const particleScale=width/height<=1.2?2:1.5
    this.stars.scale.set(particleScale*7,particleScale*7,1)
    this.fireflies.scale.set(particleScale,particleScale,1)
    for(const point of [this.stars,this.fireflies])point.material.uniforms.uDpr.value=this.dpr
    this.fireworks.material.uniforms.uDpr.value=this.dpr
  }
  private applyCharacterPositions() {
    this.wolf.position.set(this.portrait?-.9:-1.3+(1-this.intro.wolf)*.4,this.portrait?-1.2:-1,.5)
    this.simon.position.set(this.portrait?.53:.9-(1-this.intro.simon)*.4,-.9,1.2)
  }
  setReducedMotion(on:boolean) {
    this.reduced=on;this.fluid.setReducedMotion(on)
    if(on){this.entrance?.kill();Object.assign(this.intro,{portal:1,ponpon:1,wolf:1,simon:1,city:1,cloud:1,cloudScale:1,spin:1,hover:0});this.started=true;this.clearBursts()}
  }
  private onHover=(event:Event)=>{
    if(this.disposed||this.reduced)return
    const on=(event as CustomEvent<boolean>).detail
    gsap.killTweensOf(this.intro,'hover')
    gsap.to(this.intro,{hover:on?1:0,duration:on?1:.6,delay:on?.2:0,ease:'power2.out'})
  }
  setPointer(x:number,y:number) {
    if(this.reduced||this.disposed)return
    const px=clamp(x/this.width,0,1),py=clamp(1-y/this.height,0,1)
    this.mouse.set(px*2-1,py*2-1)
    if(this.previousPointer){
      const dx=px-this.previousPointer.x,dy=py-this.previousPointer.y
      if(dx!==0||dy!==0){this.fluid.setPointer(px,py,dx,dy);this.pointerMoves++}
    }
    if(!this.previousPointer)this.previousPointer=new THREE.Vector2()
    this.previousPointer.set(px,py)
  }
  leavePointer(){this.mouse.set(0,0);this.previousPointer=null}
  enter() {
    if(!this.ready)return
    this.started=true
    this.entrance?.kill()
    gsap.killTweensOf(this.intro,'hover')
    if(this.reduced)return
    Object.assign(this.intro,{portal:0,ponpon:0,wolf:0,simon:0,city:0,cloud:0,cloudScale:0,spin:0,hover:0})
    this.fluid.reset()
    this.clearBursts();this.nextBurst=this.elapsed+.8
    this.entrance=gsap.timeline()
      .to(this.intro,{portal:1,duration:3,ease:'elastic.out(2,1.2)'},this.portrait?.6:.35)
      .to(this.intro,{ponpon:1,spin:1,duration:1.2,ease:'elastic.out(1,1)'},.4)
      .to(this.intro,{city:1,duration:1.5,ease:'expo.out'},.5)
      .to(this.intro,{wolf:1,duration:1.5,ease:'elastic.out(1.05,1.1)'},.66)
      .to(this.intro,{simon:1,duration:1.5,ease:'elastic.out(1.05,1.1)'},.71)
      .to(this.intro,{cloud:1,duration:1.4,ease:'power4.inOut'},.5)
      .to(this.intro,{cloudScale:1,duration:2.5,ease:'none'},.7)
  }
  update(dt:number) {
    if(this.disposed||!this.ready)return
    if(!this.started){const loader=document.querySelector('.preloader');if(!loader||loader.classList.contains('is-done'))this.enter()}
    this.elapsed+=this.reduced?0:Math.min(dt,.05)
    this.frame++
    const t=this.reduced?1:this.elapsed
    this.fluid.update(dt)
    const fluid=this.fluid.texture
    for(const m of this.materials){
      m.uniforms.uTime.value=t;m.uniforms.uLocalTime.value=t
      if(m.uniforms.tFluid)m.uniforms.tFluid.value=fluid
      if(m.uniforms.uFluid&&m!==this.moon.material)m.uniforms.uFluid.value=fluid
      if(m.uniforms.uCityIntro)m.uniforms.uCityIntro.value=this.intro.city
    }
    this.portal.material.uniforms.uIntro.value=this.intro.portal
    this.portal.material.uniforms.uHovered.value=this.intro.hover
    this.ponpon.scale.setScalar(Math.max(.001,this.intro.ponpon))
    this.ponpon.position.y=.24+(1-this.intro.ponpon)*.5
    ;(this.ponpon.children[0] as Sprite).material.uniforms.uRotation.value=this.intro.spin
    this.wolf.scale.setScalar(Math.max(.001,this.intro.wolf*.9))
    this.simon.scale.setScalar(Math.max(.001,this.intro.simon*(this.portrait?.9:1)))
    this.wolf.rotation.z=(1-this.intro.wolf)*.13;this.simon.rotation.z=(1-this.intro.simon)*.13
    this.applyCharacterPositions()
    this.wolfTail.rotation.z=Math.sin(t*.7)*.078
    this.wolfArm.rotation.z=Math.sin(t*3)*.04
    this.tray.rotation.z=Math.sin(t*4)*.006-.01;this.tray.position.x=.17+Math.sin(t*4)*.006
    const cooking=(1-Math.cos(t*Math.PI/2))*.5
    this.simonArm.position.set(.7-.05*cooking,-.04*Math.sin(t*Math.PI/2),-.4)
    this.simonArm.rotation.set(Math.sin(t*1.5)*.2,0,THREE.MathUtils.lerp(-.1,.25,cooking))
    const throwPhase=(t%4)/4,throwAmount=Math.max(0,Math.sin((throwPhase-.2)/.55*Math.PI))*(throwPhase>.2&&throwPhase<.75?1:0)
    this.crepe.position.set(.223+.1*throwAmount,-.105+.6*throwAmount,0)
    const spinPhase=clamp((throwPhase-.2)/.55,0,1)
    this.crepe.rotation.z=-.2+(spinPhase*spinPhase*(3-2*spinPhase))*Math.PI*2
    this.crepe.scale.setScalar(.46*(1.4+.2*throwAmount))
    this.skyTop.rotation.y=-t*.03;this.skyBottom.rotation.y=Math.PI-t*.01
    this.moon.rotation.z=Math.sin(t)*.15
    this.smoothMouse.lerp(this.mouse,1-Math.exp(-dt/0.15))
    this.camera.fov=45-this.intro.hover*6
    this.camera.position.set(-this.smoothMouse.x*.1,this.smoothMouse.y*.04-this.intro.hover*.3,5-this.intro.hover*.8)
    this.camera.lookAt(this.smoothMouse.x*.5,-this.smoothMouse.y*.2,0)
    this.camera.updateProjectionMatrix()
    this.updateClouds(dt,t)
    this.updateBalloons(dt,t)
    if(!this.reduced&&this.elapsed>this.nextBurst){
      const index=this.burstSlot%3
      this.emitBurst((index-1)*1.7,.4+index*.35,-2-index)
      this.nextBurst=this.elapsed+3.5
    }
    if(this.frame%12===0){
      const data=this.renderer.domElement.dataset
      data.homeFrame=String(this.frame);data.homePointerMoves=String(this.pointerMoves)
      data.homeHover=this.intro.hover.toFixed(3);data.homeArm=this.simonArm.rotation.z.toFixed(4)
    }
  }
  private clearBursts() {
    for(let i=0;i<384;i++)this.burstData[i*4+3]=-100
    ;(this.fireworks.geometry.getAttribute('burst') as THREE.BufferAttribute).needsUpdate=true
  }
  private updateBalloons(dt:number,t:number) {
    for(const balloon of this.balloons){
      const {mesh,base,seed,points}=balloon
      if(!this.reduced){
        mesh.position.y+=Math.min(dt,.05)*.4
        if(mesh.position.y>6.7)mesh.position.y=-5
      }
      const scale=.25*balloon.scale*this.intro.city
      mesh.scale.setScalar(Math.max(.001,scale))
      mesh.position.x=base.x*(this.portrait?.7:1)+Math.sin(t*.9+seed*6)*.2+Math.cos(t*.9+seed*10)*.05
      mesh.position.z=base.z+Math.sin(t*.9+seed*6)*.02
      mesh.rotation.y=t*.2+seed
      const vpHeight=2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))*(5-mesh.position.z)
      const dx=mesh.position.x-this.mouse.x*vpHeight*this.width/this.height*.5
      const dy=mesh.position.y-this.mouse.y*vpHeight*.5
      const distance=Math.hypot(dx,dy),push=this.reduced?0:Math.max(0,1-distance/1.3)*.18
      mesh.position.x+=dx*push;mesh.position.y+=dy*push*Math.min(dt,.05)*10
      mesh.rotation.z=dx*push
      const length=.34
      for(let i=0;i<16;i++){
        const f=i/15,p=i*3
        points[p]=mesh.position.x+Math.sin(t*1.7+seed-f*3)*.06*f+dx*push*f*f
        points[p+1]=mesh.position.y-.4*scale-f*length
        points[p+2]=mesh.position.z
      }
      ;(balloon.rope.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate=true
      balloon.rope.visible=this.intro.city>.1
    }
  }
  private updateClouds(dt:number,t:number) {
    const material=this.cloudMesh.material
    material.uniforms.uIntro.value=this.intro.cloud;material.uniforms.uIntro2.value=this.intro.cloudScale
    const mx=this.mouse.x*this.viewport.x/2,my=this.mouse.y*this.viewport.y/2
    const step=Math.min(2,dt*60)
    for(let i=0;i<40;i++){
      const p=i*3,r=i*4,v=i*2,rand=this.cloudRandom[r+1]
      const x=this.cloudBase[p]+(1-this.intro.cloud)*-1.1*(2-rand*4)
      const y=this.cloudBase[p+1]+(1-this.intro.cloud)*(rand-.5)*.5
      const dx=x-mx,dy=y-my,distance=Math.hypot(dx,dy)
      const push=this.reduced?0:Math.max(0,1-distance/2)*1.5
      const tx=x+dx*push,ty=y-Math.abs(dy*push)/2
      const spring=.05+this.cloudRandom[r]*.1,friction=.05+rand*.15
      this.cloudVelocity[v]=(this.cloudVelocity[v]+(tx-this.cloudPositions[p])*spring*step)*Math.pow(friction,step)
      this.cloudVelocity[v+1]=(this.cloudVelocity[v+1]+(ty-this.cloudPositions[p+1])*spring*step)*Math.pow(friction,step)
      this.cloudPositions[p]+=this.cloudVelocity[v]*step;this.cloudPositions[p+1]+=this.cloudVelocity[v+1]*step
      this.cloudPositions[p+2]=this.cloudBase[p+2]-(1-this.intro.cloud)*1.2
    }
    ;(this.cloudMesh.geometry.getAttribute('offset') as THREE.InstancedBufferAttribute).needsUpdate=true
    material.uniforms.uTime.value=t
  }
  render(target:THREE.WebGLRenderTarget|null) {
    const renderer=this.renderer
    // Original fragments output raw sRGB. Internal target textures must not decode.
    renderer.setClearColor(rawColor('#FFAD12'),1)
    renderer.setRenderTarget(this.contentRT);renderer.clear();renderer.render(this.scene,this.camera)
    renderer.setClearColor(rawColor('#EC8DB6'),0)
    renderer.setRenderTarget(this.cloudRT);renderer.clear();renderer.render(this.clouds,this.cloudCamera)
    this.screen.clear();this.screen.add(this.portal)
    renderer.setRenderTarget(this.portalRT);renderer.clear();renderer.render(this.screen,this.screenCamera)
    // Reuse the content target for the isolated outlined foreground cloud layer.
    this.screen.clear();this.screen.add(this.cloudComposite)
    renderer.setRenderTarget(this.contentRT);renderer.clear();renderer.render(this.screen,this.screenCamera)
    this.output.material.uniforms.tClouds.value=this.contentRT.texture
    this.output.material.uniforms.uToLinear.value=target?1:0
    this.screen.clear();this.screen.add(this.output)
    renderer.setClearColor('#171717',1)
    renderer.setRenderTarget(target);renderer.clear();renderer.render(this.screen,this.screenCamera)
  }
  dispose() {
    this.disposed=true;this.entrance?.kill();gsap.killTweensOf(this.intro)
    window.removeEventListener('portfolio:home-hover',this.onHover)
    window.removeEventListener('pointerup',this.onPointerUp)
    this.fluid.dispose()
    this.textures.forEach(t=>t.dispose());this.materials.forEach(m=>m.dispose())
    this.geometry.dispose();this.cloudMesh.geometry.dispose()
    this.skyTop.geometry.dispose();this.skyBottom.geometry.dispose()
    this.stars.geometry.dispose();this.fireflies.geometry.dispose()
    this.fireworks.geometry.dispose()
    this.balloonGeometry.dispose()
    this.balloons.forEach(({rope})=>{rope.geometry.dispose();(rope.material as THREE.Material).dispose()})
    for(const mesh of [this.portal,this.cloudComposite,this.output])mesh.geometry.dispose()
    for(const rt of [this.contentRT,this.portalRT,this.cloudRT])rt.dispose()
    this.scene.clear();this.screen.clear();this.clouds.clear()
    delete document.documentElement.dataset.homeWebgl
  }
}
