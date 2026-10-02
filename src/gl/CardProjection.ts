import * as THREE from 'three'

export type CardTarget = { index:number; x:number; y:number; w:number; h:number; polygon:string }
type Point = { x:number; y:number }

/** Project the solid's silhouette, so the space between cards stays unclickable. */
export function projectCard(index:number,mesh:THREE.Mesh,camera:THREE.Camera,width:number,height:number,corners:THREE.Vector3[]):CardTarget|null {
  if(!mesh.visible)return null
  mesh.updateMatrixWorld()
  const points=corners.map(corner=>{
    const p=corner.clone().applyMatrix4(mesh.matrixWorld).project(camera)
    return {x:(p.x*.5+.5)*width,y:(.5-p.y*.5)*height}
  }).sort((a,b)=>a.x-b.x||a.y-b.y)
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
  const lower:Point[]=[],upper:Point[]=[]
  for(const p of points){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p)}
  for(const p of [...points].reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p)}
  const hull=[...lower.slice(0,-1),...upper.slice(0,-1)]
  const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x))
  const top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y))
  const w=right-left,h=bottom-top
  if(!Number.isFinite(w+h)||w<1||h<1||right<0||left>width||bottom<0||top>height)return null
  return {index,x:left,y:top,w,h,polygon:`polygon(${hull.map(p=>`${((p.x-left)/w*100).toFixed(3)}% ${((p.y-top)/h*100).toFixed(3)}%`).join(',')})`}
}

export function boxCorners(depth:number){
  const points:THREE.Vector3[]=[]
  for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-depth/2,depth/2])points.push(new THREE.Vector3(x,y,z))
  return points
}
