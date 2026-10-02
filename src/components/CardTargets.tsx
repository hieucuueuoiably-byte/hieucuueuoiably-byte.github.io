import { useRef } from 'react'
import type { Work } from '../data/works'
import type { CardTarget } from '../gl/CardProjection'
import { navigator } from '../state/navController'
import { video } from '../state/videoController'

/** Accessible buttons clipped to the projected solid, including its visible rim. */
export function CardTargets({works,index,isRoot,onEnter,onJump}:{works:Work[];index:number;isRoot:boolean;onEnter:(index:number)=>void;onJump:(index:number)=>void}){
  const gesture=useRef({id:-1,x:0,y:0,lastX:0,t:0,moved:false})
  return <div className="works__card-targets">
    {works.map((work,i)=><button key={work.slug} type="button" className="works__card-target" data-card-index={i}
      aria-label={i===index?(isRoot?`查看分类 ${work.title}`:`播放或暂停 ${work.title}`):`切换到${isRoot?'分类':'视频'} ${work.title}`}
      onPointerDown={e=>{
        if(e.button!==0)return
        e.stopPropagation()
        gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,t:performance.now(),moved:false}
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={e=>{
        const g=gesture.current
        if(g.id!==e.pointerId)return
        const dx=e.clientX-g.x,dy=e.clientY-g.y
        if(!g.moved){if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy))return;g.moved=true;navigator.setDragging(true)}
        e.preventDefault();e.stopPropagation();navigator.feedDrag(e.clientX-g.lastX);g.lastX=e.clientX
      }}
      onPointerUp={e=>{
        const g=gesture.current
        if(g.id!==e.pointerId)return
        e.stopPropagation();g.id=-1
        if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
        if(g.moved)navigator.endDrag(e.clientX-g.x,performance.now()-g.t)
      }}
      onPointerCancel={()=>{if(gesture.current.moved)navigator.setDragging(false);gesture.current.id=-1}}
      onClick={e=>{
        if(e.detail>0&&gesture.current.moved)return
        if(i!==index)onJump(i)
        else if(isRoot)onEnter(i)
        else video.toggle()
      }}><span className="sr-only">{work.title}</span></button>)}
  </div>
}

/** Positions follow the renderer, without making React rerender at frame rate. */
export function syncCardTargets(targets:CardTarget[]){
  const byIndex=new Map(targets.map(target=>[target.index,target]))
  document.querySelectorAll<HTMLButtonElement>('.works__card-target').forEach(button=>{
    const target=byIndex.get(Number(button.dataset.cardIndex))
    button.style.visibility=target?'visible':'hidden'
    if(!target)return
    Object.assign(button.style,{left:`${target.x}px`,top:`${target.y}px`,width:`${target.w}px`,height:`${target.h}px`,clipPath:target.polygon})
  })
}
