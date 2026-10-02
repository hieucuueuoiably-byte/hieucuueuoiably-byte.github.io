import * as THREE from 'three'

// Move the seated octopus forward on the same floor: its projected position
// drops slightly while depth compensation preserves its head-on size.
export const HOME_ACTOR_DEPTH={director:0,octopus:350,bird:430}
// Lower the two foreground actors together with their floor and contact shadows.
export const HOME_GROUND_Y={desktop:-249,portrait:-181}

/** Interior only. The original portal shader clips this complete scene later. */
export function createAiStageTexture(includeGround=true) {
  const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941
  const c=canvas.getContext('2d')!
  const buildings=[[168,552,84,144],[257,457,96,239],[383,520,92,176],[499,505,93,191],[617,461,80,235],[705,347,90,349],[800,390,76,306],[890,412,84,284],[976,442,90,254],[1078,502,80,194],[1164,436,82,260],[1267,472,83,224],[1403,563,81,133]]
  buildings.forEach(([x,y,w,h],i)=>{
    c.fillStyle=i%2?'#73a994':'#548b80';c.strokeStyle='#233d38';c.lineWidth=2
    c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h)
    c.beginPath();c.moveTo(x,y);c.lineTo(x+12,y-20);c.lineTo(x+w+12,y-20);c.lineTo(x+w,y);c.closePath();c.fill();c.stroke()
    for(let xx=x+9;xx<x+w-5;xx+=17){c.beginPath();c.moveTo(xx,y+9);c.lineTo(xx,y+h-8);c.stroke()}
    for(let yy=y+15;yy<y+h-4;yy+=25){c.beginPath();c.moveTo(x+5,yy);c.lineTo(x+w-5,yy);c.stroke()}
  })
  for(const [x,y,size] of [[351,489,.9],[604,410,.72],[1130,410,.9],[1351,542,.75]]) {
    c.save();c.translate(x,y);c.scale(size,size);c.fillStyle='#214a43';c.strokeStyle='#214a43';c.lineWidth=8
    c.beginPath();c.moveTo(0,210);c.quadraticCurveTo(10,92,0,0);c.stroke()
    for(let k=0;k<7;k++){c.save();c.rotate(k*Math.PI/4-.75);c.fill(new Path2D('M0 0Q-28 -39 -66 -14Q-32 -6 -5 7Z'));c.restore()}c.restore()
  }
  for(const [x,y] of [[255,374],[1476,506]]) {
    c.strokeStyle='#263e38';c.lineWidth=6;c.strokeRect(x-36,y+16,35,258)
    for(let i=0;i<7;i++){c.beginPath();c.moveTo(x-36,y+25+i*31);c.lineTo(x-1,y+51+i*31);c.stroke()}
    c.fillStyle='#243e39';c.fillRect(x-44,y-35,94,83);c.strokeStyle='#171717';c.lineWidth=3;c.strokeRect(x-44,y-35,94,83)
    c.fillStyle='#ffcf71';c.beginPath();c.ellipse(x,y+5,27,32,0,0,Math.PI*2);c.fill();c.stroke()
  }
  c.fillStyle='#2e4a3e'
  for(let i=0;i<40;i++){const x=90+i*38,y=660+Math.sin(i*7.3)*15;c.beginPath();c.arc(x,y,23+i%4*3,0,Math.PI*2);c.fill()}
  if(includeGround)drawGround(c)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace
  texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter
  return texture
}

function drawGround(c:CanvasRenderingContext2D){
  c.fillStyle='#f1192e';c.beginPath();c.ellipse(836,873,805,215,0,0,Math.PI*2);c.fill();c.strokeStyle='#171717';c.lineWidth=3;c.stroke()
}

/** Extended beyond the old canvas edge so camera pitch never reveals a cut-off floor. */
export function createAiGroundTexture(){
  const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=1400
  drawGround(canvas.getContext('2d')!)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace
  texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter
  return texture
}

/** Reproject the approved head-on floor onto an actual horizontal plane.
 * The source floor starts below the horizon; cropping its transparent top
 * avoids singular rays while preserving its outline and texture coordinates.
 */
export function createAiGroundGeometry(level:number,cameraZ:number){
  const geometry=new THREE.PlaneGeometry(1672,760,64,32)
  const positions=geometry.getAttribute('position') as THREE.BufferAttribute
  const uv=geometry.getAttribute('uv') as THREE.BufferAttribute
  for(let i=0;i<positions.count;i++){
    const sourceY=640+(1-uv.getY(i))*760,rayY=470.5-sourceY,fit=level/rayY
    positions.setXYZ(i,positions.getX(i)*fit,level,cameraZ*(1-fit))
    uv.setY(i,1-sourceY/1400)
  }
  geometry.computeVertexNormals();geometry.computeBoundingSphere()
  return geometry
}

/** Distant clouds drift independently behind the city and actors. */
export function createAiSkyTexture() {
  const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941
  const c=canvas.getContext('2d')!;c.fillStyle='#f1abbd';c.strokeStyle='#171717'
  const cloud=new Path2D('M-200 22C-120 13 -110 10 -63 6C-83 -12 -27 -27 12 -15C6 -53 71 -54 98 -28C127 -18 130 -2 111 3C167 -3 206 7 222 24C255 13 284 19 310 30C337 13 364 31 386 30C390 54 362 66 321 62C277 69 244 51 206 46C170 46 166 61 128 59C88 63 84 36 52 39C1 41 -53 37 -81 33C-122 35 -170 31 -200 22Z')
  for(const [x,y,s] of [[200,260,1.4],[940,245,1.2],[80,390,.8],[1470,360,.74],[450,105,.6],[1160,80,.45]]) {
    c.save();c.translate(x,y);c.scale(s,s);c.lineWidth=1.5;c.fill(cloud);c.stroke(cloud);c.restore()
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace
  texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter
  return texture
}

export function createAiPodiumTexture(drawTop=true){
  const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941
  const c=canvas.getContext('2d')!;c.strokeStyle='#171717';c.lineWidth=3
  c.fillStyle='#ff7800';c.fillRect(666,684,365,126);c.strokeRect(666,684,365,126)
  if(drawTop){c.fillStyle='#ff9d08';const top=new Path2D('M666 684L685 664H1008L1031 684Z');c.fill(top);c.stroke(top)}
  c.fillStyle='#ee7459';c.beginPath();c.arc(834,748,48,0,Math.PI*2);c.fill();c.stroke()
  c.fillStyle='#282034';c.beginPath();c.arc(834,748,36,0,Math.PI*2);c.fill();c.stroke()
  c.fillStyle='#fff6f0';c.beginPath();c.arc(844,733,9,0,Math.PI*2);c.fill()
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace
  texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter
  return texture
}
