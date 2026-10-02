import { HomeCodeCharacter } from './HomeCodeCharacters'
import { createAiStageTexture, createAiPodiumTexture, createAiSkyTexture,HOME_ACTOR_DEPTH,HOME_GROUND_Y } from './HomeAiStage'
import { FOREGROUND_CLOUD_COUNT } from './HomeForegroundClouds'
import { Vector3 } from 'three'

/** Static rendering shares the code-drawn actors, even without a GPU. */
export function paintHomeFallback(canvas: HTMLCanvasElement) {
  let disposed = false
  canvas.width = 1672; canvas.height = 941
  const c = canvas.getContext('2d')!
  const stage = createAiStageTexture(), podium = createAiPodiumTexture(), sky=createAiSkyTexture()
  c.fillStyle='#ffad12';c.fillRect(0,0,1672,941)
  c.drawImage(sky.image as HTMLCanvasElement, 0, 0)
  c.drawImage(stage.image as HTMLCanvasElement, 0, 0)
  c.save();c.translate(836,684);c.scale(.94,.94);c.translate(-836,-684);c.drawImage(podium.image as HTMLCanvasElement, 0, 0);c.restore()
  const poses=([['director',835,515,1,3],['octopus',360,665,2,4],['bird',1260,660,3,5]] as const).map(([name,x,y,part,order])=>{
    const actor = new HomeCodeCharacter(name, x, y, part, order)
    const scale=part===1?.94:.84,contact=actor.copyRestGroundContact(new Vector3())
    const depth=1-HOME_ACTOR_DEPTH[name]/(941/(2*Math.tan(Math.PI/8)))
    const footX=836+(x-836)*.65+contact.x*scale,footY=470.5-HOME_GROUND_Y.desktop/depth
    return {actor,name,x,y,part,scale,depth,footX,footY,rootY:part===1?y:footY+contact.y*scale}
  })
  for(const pose of poses.filter(p=>p.part>1)){
    const {part,footX,footY,scale,depth}=pose
    const rx=(part===2?600:85)*scale/2,ry=Math.abs(HOME_GROUND_Y.desktop)*(part===2?130:55)*scale/(2*(941/(2*Math.tan(Math.PI/8)))*depth)
    c.save();c.translate(footX,footY);c.scale(rx,ry)
    const gradient=c.createRadialGradient(0,0,0,0,0,1);gradient.addColorStop(0,'rgba(61,17,28,.36)');gradient.addColorStop(.45,'rgba(61,17,28,.18)');gradient.addColorStop(1,'rgba(61,17,28,0)')
    c.fillStyle=gradient;c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();c.restore()
  }
  for(const {actor,x,y,scale,rootY} of poses){
    c.save();c.translate(836+(x-836)*.65,rootY);c.scale(scale,scale);c.translate(-x,-y)
    actor.update(0, 0); actor.drawStatic(c); actor.dispose();c.restore()
  }
  stage.dispose(); podium.dispose();sky.dispose()
  const base = document.createElement('canvas'); base.width = 1672; base.height = 941
  base.getContext('2d')!.drawImage(canvas, 0, 0)
  const images = ['balloon-1','balloon-2','balloon-3'].map(name => new Promise<HTMLImageElement>(resolve => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(image)
    image.src = '/home-ai/layers/' + name + '.webp'
  }))
  const mask=new Image()
  const maskReady=new Promise<HTMLImageElement>(resolve=>{mask.onload=()=>resolve(mask);mask.onerror=()=>resolve(mask);mask.src='/home-original/ponpon-mask.png'})
  void Promise.all([...images,maskReady]).then(loaded => {
    if (disposed) return
    c.clearRect(0, 0, 1672, 941); c.drawImage(base, 0, 0)
    loaded.slice(0,3).forEach(image => { if (image.naturalWidth) c.drawImage(image, 0, 0) })
    if(mask.naturalWidth) {
      const alpha=document.createElement('canvas');alpha.width=1672;alpha.height=941
      const a=alpha.getContext('2d')!,scale=1.1*1.05,mw=941*2*scale,mh=941*scale
      a.drawImage(mask,(1672-mw)/2,(941-mh)/2,mw,mh)
      const pixels=a.getImageData(0,0,1672,941)
      for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i];pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=0;pixels.data[i+3]=r}
      a.putImageData(pixels,0,0)
      c.globalCompositeOperation='destination-in';c.drawImage(alpha,0,0);c.globalCompositeOperation='source-over'
      base.getContext('2d')!.clearRect(0,0,1672,941);base.getContext('2d')!.drawImage(canvas,0,0)
      c.fillStyle='#7e7eff';c.fillRect(0,0,1672,941)
      c.save();c.shadowColor='#171717';c.shadowBlur=2;c.drawImage(alpha,0,0);c.restore();c.drawImage(base,0,0)
    }
    // Static equivalent of the reference's independent foreground cloud bank.
    for(const inset of [0,2]) {
      c.fillStyle=inset?'#ec8db6':'#171717'
      for(let i=0;i<FOREGROUND_CLOUD_COUNT;i++){
        const t=i<40?i/39:(i-40+.5)/(FOREGROUND_CLOUD_COUNT-40)
        const tilt=t*2-1,rx=55+(i*19%41)*1.2+Math.abs(tilt)*30,ry=50+(i*23%43)*.8
        const row=(i<40?0:28-Math.abs(tilt)*38)+20*Math.exp(-Math.pow((tilt+.20)/.24,2))+20*Math.exp(-Math.pow((tilt-.34)/.24,2))
        c.beginPath();c.ellipse(t*1672,941*(1-Math.abs(tilt)*.13)+(i%2?15:-15)+row,rx-inset,ry-inset,0,0,Math.PI*2);c.fill()
      }
    }
  })
  return () => { disposed = true }
}
