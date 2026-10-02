import { useEffect, useRef, type CSSProperties } from 'react'
import { findWorkIndexBySlug, type Work } from '../data/works'
import { video } from '../state/videoController'
import { navigator } from '../state/navController'
import { useNav } from '../state/useNav'
import { PlayIcon } from './icons'

/** One real video sits on the selected original-ratio cover without changing routes. */
export function InlineWorkVideo({ work, settled }: { work: Work; settled: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const gesture=useRef({id:-1,x:0,y:0,lastX:0,t:0,moved:false})
  const previousWork=useRef(work.slug)
  const autoplayPending=useRef(video.hasStartedPlayback)
  const nav = useNav()
  const buffering = nav.playbackState === 'loading' && video.isPlaying
  const index = findWorkIndexBySlug(work.slug)
  useEffect(() => {
    if(previousWork.current!==work.slug){
      previousWork.current=work.slug
      autoplayPending.current=video.hasStartedPlayback
    }
    video.resetFor(index, !!work.video)
    const element = ref.current
    video.register(element)
    const playing = () => { autoplayPending.current=false }
    element?.addEventListener('playing',playing)
    const fullscreen = () => { if(element)element.controls=document.fullscreenElement===element }
    document.addEventListener('fullscreenchange',fullscreen)
    return () => { element?.removeEventListener('playing',playing);document.removeEventListener('fullscreenchange',fullscreen);video.unregister(element) }
  }, [index, work.video, work.slug])
  useEffect(() => {
    if(!settled){
      // A short gesture that settles back on the same film should also resume it.
      if(video.isPlaying)autoplayPending.current=true
      video.pause()
      return
    }
    if(autoplayPending.current&&work.video){
      video.continuePlayback()
    }
  }, [settled, index, work.video])
  return <div className="works__inline-stage" data-settled={settled} data-autoplay-enabled={video.hasStartedPlayback} data-aspect={work.videoAspect.replace(/\s/g, '').replace('/', ':')} aria-busy={buffering}
    style={{ '--inline-ar': work.videoAspect.replace(/\s/g, ''), aspectRatio: work.videoAspect } as CSSProperties}
    onPointerDown={e=>{
      if(e.button!==0||document.fullscreenElement||!settled||(e.target as HTMLElement).closest('.works__inline-error'))return
      e.stopPropagation()
      gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,t:performance.now(),moved:false}
      e.currentTarget.setPointerCapture(e.pointerId)
    }}
    onPointerMove={e=>{
      const g=gesture.current
      if(g.id!==e.pointerId)return
      const totalX=e.clientX-g.x,totalY=e.clientY-g.y
      if(!g.moved){
        if(Math.abs(totalX)<8||Math.abs(totalX)<Math.abs(totalY))return
        g.moved=true;navigator.setDragging(true)
      }
      e.preventDefault();e.stopPropagation()
      navigator.feedDrag(e.clientX-g.lastX);g.lastX=e.clientX
    }}
    onPointerUp={e=>{
      const g=gesture.current
      if(g.id!==e.pointerId)return
      e.stopPropagation();g.id=-1
      if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
      if(g.moved)navigator.endDrag(e.clientX-g.x,performance.now()-g.t)
    }}
    onPointerCancel={()=>{if(gesture.current.moved)navigator.setDragging(false);gesture.current.id=-1}}
    onClick={e=>{if(document.fullscreenElement||(e.target as HTMLElement).closest('.works__inline-error')||(e.detail>0&&gesture.current.moved))return;video.toggle()}}
    onDoubleClick={()=>{if(!document.fullscreenElement&&!gesture.current.moved)void ref.current?.requestFullscreen?.().catch(()=>{})}}>
    <video ref={ref} src={work.video} poster={work.poster ?? work.cover} playsInline preload="metadata" controls={false}
      aria-label={`${work.title} 视频`} />
    {nav.playbackState !== 'playing' && !buffering ? <button className="works__inline-play" type="button" aria-label={`播放 ${work.title}`} disabled={!settled}><PlayIcon /></button> : null}
    {buffering ? <div className="works__inline-buffering" role="status" aria-live="polite"><span className="works__inline-spinner" aria-hidden="true" />正在缓冲…</div> : null}
    <span className="works__inline-aspect">{work.videoAspect.replace(/\s/g, '').replace('/', ':')}</span>
    {nav.playbackState === 'error' ? <p className="works__inline-error" role="alert">视频暂时无法播放。<button onClick={() => ref.current?.load()}>重新加载</button></p> : null}
  </div>
}
