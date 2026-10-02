import * as THREE from 'three'
import characterData from '../data/home-character-paths.json'

type CharacterName='director'|'octopus'|'bird'
type Shape={fill:string;path:Path2D}
type Rig={name:string;path:string;bounds:number[];pivot:number[];kind:'head'|'arm'|'scarf'|'tentacle'|'prop';amplitude:number;frequency:number;phase:number;order:number;eyes?:boolean}
type Piece={mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;group:THREE.Group;canvas:HTMLCanvasElement;bounds:number[];rig?:Rig}
const cache=new Map<CharacterName,Shape[]>(),INK='#25212d'
const RIGS:Record<CharacterName,Rig[]>={
 director:[
  {name:'left-arm',path:'M558326H699L777451L788483L755499L668450H558Z',bounds:[556,324,235,178],pivot:[754,474],kind:'arm',amplitude:.04,frequency:2.3,phase:0,order:1},
  {name:'right-arm',path:'M877487L947457L1048449L1056562L972566L898538L866523Z',bounds:[864,447,194,121],pivot:[887,516],kind:'arm',amplitude:.04,frequency:2.3,phase:.9,order:1},
  {name:'scarf',path:'M560461H820L875491L838514L763536L625541L557517Z',bounds:[555,459,322,84],pivot:[816,486],kind:'scarf',amplitude:.04,frequency:1.3,phase:.5,order:2},
  {name:'head',path:'M720235H1050V454L963458L943480L874488L766480L706431L714344Z',bounds:[704,233,348,258],pivot:[845,476],kind:'head',amplitude:.012,frequency:1.1,phase:0,order:3,eyes:true},
 ],
 // Keep the completed seated outline continuous. Upper-body mesh motion
 // leaves the broad lower tentacles intact and weight-bearing.
 octopus:[],
 bird:[
  {name:'boom-and-hand',path:'M1345280H1645V437L1416460L1346590L1308684L1215793L1127849L1118820L1308480Z',bounds:[1116,278,531,573],pivot:[1294,640],kind:'prop',amplitude:.025,frequency:1.5,phase:.4,order:1},
  {name:'head',path:'M1065420H1316L1451582L1301569L1226568L1169590L1065571Z',bounds:[1063,418,390,174],pivot:[1203,563],kind:'head',amplitude:.013,frequency:.9,phase:.7,order:2,eyes:true},
 ]
}
const VERTEX=`uniform float uTime;uniform float uMotion;uniform float uHead;uniform float uSeated;uniform vec4 uBounds;varying vec2 vUv;
 void main(){vUv=uv;vec3 p=position;float top=smoothstep(.1,.8,uv.y);p.y+=cos(uTime*2.1)*1.2*top*uMotion*uHead;p.x+=sin(uTime*1.1)*.5*top*uMotion*uHead;
 float lifted=smoothstep(.18,.4,uv.y)*(1.-smoothstep(.34,.55,uv.x));p.x+=sin(uTime*.7+.8)*1.7*lifted*uMotion*uSeated;p.y+=cos(uTime*.7+.8)*.7*lifted*uMotion*uSeated;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`
const FRAGMENT=`uniform sampler2D tMap;uniform float uRows;uniform float uBlink;varying vec2 vUv;
 void main(){vec2 uv=vUv;if(uRows>1.5)uv.y=(uv.y+1.-uBlink)*.5;vec4 c=texture2D(tMap,uv);if(c.a<.002)discard;gl_FragColor=c;}`
function shapes(name:CharacterName){
 let values=cache.get(name)
 if(!values){values=characterData[name].shapes.map(s=>({fill:s.fill,path:new Path2D(s.d)}));cache.set(name,values)}
 return values
}
function drawArt(c:CanvasRenderingContext2D,name:CharacterName){
 c.lineJoin='round';c.lineCap='round';c.lineWidth=.65
 for(const shape of shapes(name)){c.fillStyle=c.strokeStyle=shape.fill;c.fill(shape.path,'evenodd');c.stroke(shape.path)}
 // Consistent outer ink, independently of source grain or color quantization.
 c.strokeStyle=INK;c.lineWidth=2.5;c.stroke(shapes(name)[0].path)
}
function closeEyes(canvas:HTMLCanvasElement,bounds:number[],name:CharacterName){
 const c=canvas.getContext('2d')!
 if(name==='director'){
  c.save();c.scale(2,2);c.translate(885-bounds[0],395-bounds[1]);c.beginPath();c.ellipse(0,0,40,42,0,0,Math.PI*2);c.clip()
  c.fillStyle=INK;c.fillRect(-45,-45,90,90)
  for(let k=0;k<6;k++){c.save();c.rotate(k*Math.PI/3);c.fillStyle='#45324f';c.strokeStyle=INK;c.lineWidth=1.5;const blade=new Path2D('M-2 -2L15 -44Q33 -27 35 -4L5 8Z');c.fill(blade);c.stroke(blade);c.restore()}
  c.restore();return
 }
 if(name==='octopus'){
  // Redraw the complete closed-eye cell. The completed eyes have new contours;
  // selectively recolouring old dark pixels leaves fragments of the lashes.
  c.save();c.resetTransform();c.scale(2,2);c.translate(-bounds[0],-bounds[1]);c.fillStyle='#b67fea'
  for(const [x,y,rx,ry] of [[359,621,48,33],[442,569,49,38]]){
   c.beginPath();c.ellipse(x,y,rx,ry,-.45,0,Math.PI*2);c.fill()
  }
  c.strokeStyle=INK;c.lineWidth=5;c.lineCap='round'
  c.stroke(new Path2D('M329630Q355618382603M411582Q439568464549'))
  c.lineWidth=2.5;c.stroke(new Path2D('M331629L327633M337626L334631M460552L463549M455556L458554'))
  c.restore();return
 }
 const data=c.getImageData(0,0,canvas.width,canvas.height),a=data.data
 const eyes=[[1201,481,23,24],[1230,453,23,23]],skin=[155,215,138]
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const i=(y*canvas.width+x)*4;if(a[i+3]<20)continue
  const px=bounds[0]+x/2,py=bounds[1]+y/2
  for(const [ex,ey,rx,ry] of eyes){
   const qx=(px-ex)/rx,qy=(py-ey)/ry
   if(qx*qx+qy*qy>1)continue
   const white=a[i]>150&&a[i+1]-a[i+2]>14,dark=Math.max(a[i],a[i+1],a[i+2])<80
   if(!white&&!dark)continue
   const col=Math.abs(qy+qx*.52)<.07?[37,33,45]:skin
   a[i]=col[0];a[i+1]=col[1];a[i+2]=col[2]
  }
 }
 c.putImageData(data,0,0)
}

/** Same construction as the reference: multipart transparent sprites, head
 * open/closed-eye cells, local UV motion, and joint transforms. Artwork is
 * painted from our own solid vector paths; source-site characters stay unused. */
export class HomeCodeCharacter{
 readonly group=new THREE.Group()
 readonly anchor:THREE.Vector2
 readonly phase:number
 readonly clippedParts:string[]=[]
 private pieces:Piece[]=[]
 private textures:THREE.CanvasTexture[]=[]
 private time=0
 private motion=1
 private staticCanvas:HTMLCanvasElement
 private sourceOrigin:THREE.Vector2
 private sourceContact=new THREE.Vector2()
 private contactPiece:Piece|undefined
 get armAngle(){return this.pieces.find(p=>p.rig?.name==='left-arm')?.group.rotation.z??0}
 get partCount(){return this.pieces.length}
 get eyeFrameCount(){return this.pieces.filter(p=>p.mesh.material.uniforms.uRows.value>1.5).length*2}

 constructor(readonly name:CharacterName,x:number,y:number,readonly part:number,order:number){
  this.sourceOrigin=new THREE.Vector2(x,y)
  this.anchor=new THREE.Vector2(x-836,470.5-y);this.phase=(part-1)*1.7;this.group.position.set(this.anchor.x,this.anchor.y,0)
  const [bx,by,bw,bh]=characterData[name].bounds
  const bounds=[bx-5,by-5,bw+10,bh+10],rigs=RIGS[name]
  const exclusions=rigs.map(r=>new Path2D(r.path))
  this.staticCanvas=this.surface(bounds,c=>drawArt(c,name))
  // Derive the support point from the painted silhouette rather than its
  // padded atlas rectangle. Raised feet and props must not become the pivot.
  const pixels=this.staticCanvas.getContext('2d')!.getImageData(0,0,this.staticCanvas.width,this.staticCanvas.height).data
  contact:for(let py=this.staticCanvas.height-1;py>=0;py--){
   const xs:number[]=[]
   for(let px=0;px<this.staticCanvas.width;px++){
    const sourceX=bounds[0]+(px+.5)/2
    // The octopus rests on its central underside; its long right tentacle is
    // a gesture, not the weight-bearing point under the torso.
    if(name==='octopus'&&(sourceX<390||sourceX>600))continue
    if(pixels[(py*this.staticCanvas.width+px)*4+3]>127)xs.push(px)
   }
   if(xs.length){this.sourceContact.set(bounds[0]+(xs[Math.floor(xs.length/2)]+.5)/2,bounds[1]+(py+.5)/2);break contact}
  }
  this.addPiece(bounds,[x,y],order,c=>{
   for(const region of exclusions){const outside=new Path2D('M-20 -20H1700V1000H-20Z');outside.addPath(region);c.clip(outside,'evenodd')}
   drawArt(c,name)
  },x,y)
  // Invisible overlapping joint sockets cover the newly exposed seam when a
  // part turns, as in an articulated sprite atlas. They remain behind the art.
  const sockets:nameSocket[] = name==='director'?[[754,474,13,INK],[887,516,13,INK],[845,476,17,'#fff0cf']]:name==='octopus'?[]:[[1294,640,12,INK],[1203,563,15,'#9bd78a']]
  if(sockets.length)this.addPiece(bounds,[x,y],order+.005,c=>{c.beginPath();for(const [sx,sy,r] of sockets){c.moveTo(sx+r,sy);c.arc(sx,sy,r,0,Math.PI*2)}c.clip();drawArt(c,name)},x,y)
  for(const rig of rigs)this.addPiece(rig.bounds,rig.pivot,order+rig.order*.01,c=>{c.clip(new Path2D(rig.path));drawArt(c,name)},x,y,rig)
  const probe=this.staticCanvas.getContext('2d')!;probe.save();probe.resetTransform()
  this.contactPiece=this.pieces.find(piece=>piece.rig&&probe.isPointInPath(new Path2D(piece.rig.path),this.sourceContact.x,this.sourceContact.y))
  probe.restore()
 }
 private surface(bounds:number[],paint:(c:CanvasRenderingContext2D)=>void){
  const canvas=document.createElement('canvas');canvas.width=bounds[2]*2;canvas.height=bounds[3]*2
  const c=canvas.getContext('2d')!;c.scale(2,2);c.translate(-bounds[0],-bounds[1]);c.save();paint(c);c.restore()
  return canvas
 }
 private addPiece(bounds:number[],pivot:number[],order:number,paint:(c:CanvasRenderingContext2D)=>void,x:number,y:number,rig?:Rig){
  const seated=this.name==='octopus',eyes=rig?.eyes||(seated&&this.pieces.length===0)
  const open=this.surface(bounds,paint),closed=eyes?this.surface(bounds,paint):null
  if(closed)closeEyes(closed,bounds,this.name)
  const canvas=document.createElement('canvas');canvas.width=open.width;canvas.height=open.height*(closed?2:1)
  const c=canvas.getContext('2d')!;c.drawImage(open,0,0);if(closed)c.drawImage(closed,0,open.height)
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.NoColorSpace;map.generateMipmaps=false;map.minFilter=map.magFilter=THREE.LinearFilter;this.textures.push(map)
  const material=new THREE.ShaderMaterial({name:'OwnCharacterAtlas-'+this.name+'-'+(rig?.name??'body'),vertexShader:VERTEX,fragmentShader:FRAGMENT,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,
   uniforms:{tMap:{value:map},uTime:{value:0},uMotion:{value:1},uHead:{value:rig?.kind==='head'||seated?1:0},uSeated:{value:seated?1:0},uBounds:{value:new THREE.Vector4(...bounds as [number,number,number,number])},uRows:{value:closed?2:1},uBlink:{value:0}}})
  const group=new THREE.Group();group.position.set(pivot[0]-x,y-pivot[1],0);this.group.add(group)
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(bounds[2],bounds[3],seated?64:rig?.kind==='head'?48:1,seated?48:rig?.kind==='head'?32:1),material)
  mesh.position.set(bounds[0]+bounds[2]/2-pivot[0],pivot[1]-bounds[1]-bounds[3]/2,0);mesh.renderOrder=order;mesh.frustumCulled=false;group.add(mesh)
  this.pieces.push({mesh,group,canvas,bounds,rig})
  const image=open.getContext('2d')!.getImageData(0,0,open.width,open.height).data
  const alpha=(px:number,py:number)=>image[(py*open.width+px)*4+3]>16
  // Only the full actor canvas is a silhouette boundary; rig edges are intended joints.
  if(!rig){
   for(let px=0;px<open.width;px++)if(alpha(px,0)||alpha(px,open.height-1)){this.clippedParts.push(this.name);break}
   for(let py=0;!this.clippedParts.length&&py<open.height;py++)if(alpha(0,py)||alpha(open.width-1,py)){this.clippedParts.push(this.name);break}
  }
 }
 update(time:number,motion:number){
  this.time=time;this.motion=motion
  const phase=(time+(this.name==='bird'?2.1:.7))%5.3,blink=phase>.045&&phase<.17&&motion>0?1:0
  for(const piece of this.pieces){
   const r=piece.rig
   if(r)piece.group.rotation.z=Math.sin(time*r.frequency+r.phase)*r.amplitude*motion
   piece.mesh.material.uniforms.uTime.value=time;piece.mesh.material.uniforms.uMotion.value=motion;piece.mesh.material.uniforms.uBlink.value=piece.mesh.material.uniforms.uRows.value>1.5?blink:0
  }
 }
 /** Actual support point in character-local space, including its joint motion. */
 copyGroundContact(target:THREE.Vector3){
  const piece=this.contactPiece,r=piece?.rig
  if(piece&&r)return target.set(this.sourceContact.x-r.pivot[0],r.pivot[1]-this.sourceContact.y,0).applyEuler(piece.group.rotation).add(piece.group.position)
  return target.set(this.sourceContact.x-this.sourceOrigin.x,this.sourceOrigin.y-this.sourceContact.y,0)
 }
 copyRestGroundContact(target:THREE.Vector3){return target.set(this.sourceContact.x-this.sourceOrigin.x,this.sourceOrigin.y-this.sourceContact.y,0)}
 drawStatic(c:CanvasRenderingContext2D){const [x,y,w,h]=characterData[this.name].bounds;c.drawImage(this.staticCanvas,x-5,y-5,w+10,h+10)}
 dispose(){this.textures.forEach(t=>t.dispose());this.pieces.forEach(p=>{p.mesh.geometry.dispose();p.mesh.material.dispose()});this.group.clear()}
}
type nameSocket=[number,number,number,string]
