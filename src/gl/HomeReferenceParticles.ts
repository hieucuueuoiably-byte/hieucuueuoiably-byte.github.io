import * as THREE from 'three'
import { FIREFLY_VERTEX, FIREFLY_FRAGMENT, STARS_VERTEX, STARS_FRAGMENT, FIREWORK_VERTEX, FIREWORK_FRAGMENT } from './HomeOriginalShaders'

const seed=(i:number,salt:number)=>((i*salt+salt*3)%997)/997
const map=THREE.MathUtils.mapLinear
const out=(x:number)=>1-Math.pow(1-x,5) // Archived dg = GSAP Power4.
const COUNT=512,POOL=5
type Burst={mesh:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;positions:Float32Array;velocities:Float32Array;sizes:Float32Array;life:Float32Array;random:Float32Array;direction:number;time:number;active:boolean}
type Scheduled={at:number;x:number;y:number;z:number;direction:number}

/** Homepage YJ / FJ / JJ particles from the archived public frontend.
 * Positions and camera distances are converted from reference units into the
 * portfolio's pixel-sized world. GLSL shape, spin, blink and burst dynamics stay
 * at their source scale; seeded placement makes visual checks repeatable.
 */
export class HomeReferenceParticles {
  readonly group=new THREE.Group()
  readonly stars:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>
  readonly fireflies:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>
  private bursts:Burst[]=[]
  private scheduled:Scheduled[]=[]
  private cycleAt=0
  private cycle=0
  private dpr=1
  private enabled=true
  private serial=0
  emitted=0
  get activeBursts(){return this.bursts.filter(b=>b.active).length}
  get firstBurstLife(){return this.bursts.find(b=>b.active)?.life[0]??0}

  constructor(starTexture:THREE.Texture,fireflyTexture:THREE.Texture,fluid:THREE.Texture,private worldScale:number){
    const create=(count:number,star:boolean)=>{
      const positions=new Float32Array(count*3),random=new Float32Array(count*4)
      for(let i=0;i<count;i++){
        positions.set([seed(i,137)*1.8-.4,star?seed(i,251)*1.8-.4:.1+seed(i,251)*.45,star?seed(i,97)-10.5:i*.04+.6],i*3)
        random.set([seed(i,71),seed(i,131),seed(i,193),seed(i,229)],i*4)
      }
      const geometry=new THREE.BufferGeometry()
      geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('random',new THREE.BufferAttribute(random,4))
      let vertex=this.adapt(star?STARS_VERTEX:FIREFLY_VERTEX)
        .replace('uniform float uTime;','uniform float uTime;\nuniform float uWorldScale;')
      if(star)vertex=vertex.replace('140.0 / length','140.0 * uWorldScale / length').replace(/\* movement;/g,'* movement * uWorldScale;')
      else vertex=vertex.replace('12.0 / length','12.0 * uWorldScale / length')
        .replace('(0.43 + fluid.x * 0.0)','uWorldScale * (0.43 + fluid.x * 0.0)')
        .replace('(0.43 + fluid.y * 0.0)','uWorldScale * (0.43 + fluid.y * 0.0)')
        .replace('( 1. + fluid.z * 0.0)','uWorldScale * ( 1. + fluid.z * 0.0)')
      const material=this.material(vertex,star?STARS_FRAGMENT:FIREFLY_FRAGMENT,{
        uMap:{value:star?starTexture:fireflyTexture},uTime:{value:0},uDpr:{value:1},uWorldScale:{value:worldScale},
        uFluid:{value:fluid},uResolution:{value:new THREE.Vector2(1,1)},uColor:{value:new THREE.Color().setHex(0xffe0a6,THREE.LinearSRGBColorSpace)},
      })
      const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=star?-2:6
      if(star)mesh.position.set(0,2*worldScale,-20*worldScale)
      this.group.add(mesh);return mesh
    }
    this.stars=create(246,true);this.fireflies=create(40,false)
    for(let i=0;i<POOL;i++){
      const positions=new Float32Array(COUNT*3),velocities=new Float32Array(COUNT*3),sizes=new Float32Array(COUNT),life=new Float32Array(COUNT),random=new Float32Array(COUNT)
      const geometry=new THREE.BufferGeometry()
      for(const [name,array] of [['position',positions],['velocity',velocities],['size',sizes],['life',life],['color',random]] as const)
        geometry.setAttribute(name,new THREE.BufferAttribute(array,name==='position'||name==='velocity'?3:1).setUsage(THREE.DynamicDrawUsage))
      const material=this.material(this.adapt(FIREWORK_VERTEX).replace('12. * uDpr','12. * '+worldScale.toFixed(6)+' * uDpr'),FIREWORK_FRAGMENT,{
        uTime:{value:0},uSize:{value:1},uDpr:{value:1},uColor1:{value:new THREE.Color().setHex(0xffe0c4,THREE.LinearSRGBColorSpace)},
        uColor2:{value:new THREE.Color().setHex(0xffe0c4,THREE.LinearSRGBColorSpace)},uColor3:{value:new THREE.Color().setHex(0xffe0c4,THREE.LinearSRGBColorSpace)},
      })
      // The source JJ uses gl.ONE additive glow. Alpha still attenuates the glow.
      material.blending=THREE.CustomBlending;material.blendSrc=THREE.SrcAlphaFactor;material.blendDst=THREE.OneFactor
      const mesh=new THREE.Points(geometry,material);mesh.scale.setScalar(worldScale);mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=7
      // Burst geometry is already in reference units; the model scale converts
      // its velocities and sine turbulence without changing the source formula.
      this.group.add(mesh);this.bursts.push({mesh,positions,velocities,sizes,life,random,direction:0,time:0,active:false})
    }
  }
  private adapt(vertex:string){return vertex.replace(/^attribute vec3 position;\s*/m,'').replace(/^uniform mat4 (modelMatrix|viewMatrix|projectionMatrix|modelViewMatrix);\s*/gm,'')}
  private material(vertexShader:string,fragmentShader:string,uniforms:Record<string,THREE.IUniform>){
    return new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false})
  }
  setSize(width:number,height:number,dpr:number){
    this.dpr=Math.min(dpr,1.5)
    const scale=width/height<=1.2?2:1.5,k=this.worldScale
    this.stars.scale.set(scale*7*k,scale*7*k,k);this.fireflies.scale.set(scale*k,scale*k,k)
    for(const mesh of [this.stars,this.fireflies]){mesh.material.uniforms.uDpr.value=this.dpr;mesh.material.uniforms.uResolution.value.set(width*this.dpr,height*this.dpr)}
    for(const b of this.bursts){b.mesh.material.uniforms.uDpr.value=this.dpr;b.mesh.material.uniforms.uSize.value=Math.min(width,height)*.1}
  }
  reset(time:number){
    for(const b of this.bursts){b.active=false;b.mesh.visible=false;b.life.fill(0)}
    this.scheduled=[];this.cycle=0;this.cycleAt=time+.8
  }
  setReducedMotion(on:boolean,time:number){this.enabled=!on;this.reset(time)}
  emit(worldPoint:THREE.Vector3,direction=0){
    if(!this.enabled)return
    const b=this.bursts.find(b=>!b.active);if(!b)return
    this.serial++;this.emitted++;b.active=true;b.mesh.visible=true;b.time=0;b.direction=direction
    for(let i=0;i<COUNT;i++){
      const n=i+this.serial*COUNT,angle=seed(n,31)*Math.PI*2,polar=seed(n,67)*Math.PI,speed=.2+seed(n,109)*.4
      b.positions.set([worldPoint.x/this.worldScale,worldPoint.y/this.worldScale,worldPoint.z/this.worldScale],i*3)
      b.velocities.set([speed*Math.sin(polar)*Math.cos(angle),speed*Math.sin(polar)*Math.sin(angle),speed*Math.cos(polar)],i*3)
      b.sizes[i]=1+seed(n,173)*2;b.life[i]=1;b.random[i]=seed(n,239)
    }
    this.upload(b)
  }
  update(dt:number,time:number,fluid:THREE.Texture,intro:number){
    for(const mesh of [this.stars,this.fireflies]){mesh.material.uniforms.uTime.value=time;mesh.material.uniforms.uFluid.value=fluid;mesh.visible=intro>.15}
    if(!this.enabled)return
    if(time>=this.cycleAt){
      const start=time,k=this.worldScale,delays=[seed(this.cycle+1,131)*3,seed(this.cycle+1,193)*3,seed(this.cycle+1,251)*3]
      for(let i=0;i<3;i++)this.scheduled.push({at:start+delays[i],x:(i-1)*2.1*k,y:(.2+seed(this.cycle*3+i,71)*1.4)*k,z:(-1-seed(this.cycle*3+i,137)*5)*k,direction:i-1})
      this.cycle++;this.cycleAt=start+Math.max(...delays)+3
    }
    this.scheduled=this.scheduled.filter(s=>{if(time<s.at)return true;this.emit(new THREE.Vector3(s.x,s.y,s.z),s.direction);return false})
    const step=Math.min(dt,.05)*.7
    for(const b of this.bursts){
      if(!b.active)continue
      b.time+=step;let alive=0
      for(let i=0;i<COUNT;i++){
        const life=b.life[i];if(life<=0)continue
        const p=i*3,speed=map(b.random[i],0,1,.8,1.1),r=out(life),spread=map(life,1,.9,0,1)*map(life,0,.3,0,1)
        if(life>.5){const lift=1-out(map(life,1,.5,0,1));b.positions[p+1]+=step*12*lift;b.positions[p]+=step*4*lift*b.direction}
        b.positions[p]+=b.velocities[p]*step*speed*6*r*spread;b.positions[p+1]+=b.velocities[p+1]*step*speed*6*r*spread
        if(life<.6)b.positions[p+1]-=step*2*speed*map(life,0,.6,1,0)
        b.life[i]=Math.max(0,life-step*speed);if(b.life[i]>0)alive++;else b.sizes[i]=0
      }
      b.mesh.material.uniforms.uTime.value=b.time;this.upload(b)
      if(alive===0||b.time>2){b.active=false;b.mesh.visible=false}
    }
  }
  private upload(b:Burst){for(const name of ['position','velocity','size','life','color'])b.mesh.geometry.getAttribute(name).needsUpdate=true}
  dispose(){for(const mesh of [this.stars,this.fireflies,...this.bursts.map(b=>b.mesh)]){mesh.geometry.dispose();mesh.material.dispose()}this.group.clear();this.scheduled=[]}
}
