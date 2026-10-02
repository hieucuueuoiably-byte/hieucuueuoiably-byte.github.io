import * as THREE from 'three'
import { READER_PAPER_VERTEX } from './ReaderSourceShaders'

/** The front, back and rim share the same deformation and perimeter vertices. */
export function createReaderSolidGeometry(segments=25){
  const plane=new THREE.PlaneGeometry(1,1,segments,segments)
  const positions:number[]=[],uvs:number[]=[],depths:number[]=[],sides:number[]=[],indices:number[]=[]
  const position=plane.getAttribute('position'),uv=plane.getAttribute('uv')
  for(let face=0;face<2;face++){
    for(let i=0;i<position.count;i++){
      positions.push(position.getX(i),position.getY(i),0)
      uvs.push(uv.getX(i),uv.getY(i));depths.push(face);sides.push(face*2)
    }
    const offset=face*position.count
    for(let i=0;i<plane.index!.count;i+=3){
      const a=plane.index!.getX(i)+offset,b=plane.index!.getX(i+1)+offset,c=plane.index!.getX(i+2)+offset
      indices.push(a,face?c:b,face?b:c)
    }
  }
  const edge=(ax:number,ay:number,bx:number,by:number)=>{
    const n=depths.length
    for(const [x,y,d] of [[ax,ay,0],[bx,by,0],[bx,by,1],[ax,ay,1]]){
      positions.push(x,y,0);uvs.push(x+.5,y+.5);depths.push(d);sides.push(1)
    }
    indices.push(n,n+1,n+2,n,n+2,n+3)
  }
  for(let i=0;i<segments;i++){
    const a=i/segments-.5,b=(i+1)/segments-.5
    edge(a,.5,b,.5);edge(.5,-a,.5,-b);edge(-a,-.5,-b,-.5);edge(-.5,a,-.5,b)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setAttribute('aDepth',new THREE.Float32BufferAttribute(depths,1))
  geometry.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1))
  geometry.setIndex(indices);plane.dispose()
  return geometry
}

export const READER_SOLID_VERTEX=READER_PAPER_VERTEX
  .replace('varying vec2 vUv;',`varying vec2 vUv;
attribute float aDepth;
attribute float aSide;
uniform float uThickness;
uniform vec2 uEdgeOffset;
varying float vDepth;
varying float vSide;`)
  .replace('vec3 pos = position;',`vec3 pos = position;
    vDepth = aDepth;
    vSide = aSide;
    pos.xy += uEdgeOffset * aDepth;
    pos.z -= uThickness * aDepth;`)
