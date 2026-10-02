import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ArrowRight } from '../components/icons'
import { paintHomeFallback } from '../gl/HomeCodeFallback'
import '../styles/home-original.css'

interface HomePageProps { webgl: boolean; onEnter: () => void; onAbout: () => void; reducedMotion: boolean }
const setHover = (on:boolean) => window.dispatchEvent(new CustomEvent('portfolio:home-hover',{detail:on}))

export function HomePage({webgl,onEnter,onAbout,reducedMotion}:HomePageProps) {
  const rootRef=useRef<HTMLDivElement>(null)
  const fallbackRef=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{if(fallbackRef.current)return paintHomeFallback(fallbackRef.current)},[])
  useEffect(()=>{
    const root=rootRef.current
    if(!root||reducedMotion)return
    let observer:MutationObserver|undefined
    const context=gsap.context(()=>{
      const tl=gsap.timeline({paused:true})
        .fromTo('.home-cta-wrap',{opacity:0,scale:.7},{opacity:1,scale:1,duration:.9,ease:'elastic.out(1,.7)'},.35)
      const loader=document.querySelector('.preloader')
      if(!loader||loader.classList.contains('is-done'))tl.play()
      else {
        observer=new MutationObserver(()=>{if(loader.classList.contains('is-done')){observer?.disconnect();tl.play()}})
        observer.observe(loader,{attributes:true,attributeFilter:['class']})
      }
    },root)
    return ()=>{
      observer?.disconnect()
      context.revert();setHover(false)
    }
  },[reducedMotion])
  return <div className={'page home page--home home--original home--ai'+(reducedMotion?' home--still':'')} ref={rootRef}>
    <div className="home-ai-fallback" aria-hidden="true"><canvas ref={fallbackRef}/></div>
    <div className="home-cta-wrap"><button className="home-cta" type="button" aria-label="进入作品"
      onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)}
      onFocus={()=>setHover(true)} onBlur={()=>setHover(false)}
      onClick={onEnter}><span className="home-cta__label">{Array.from('进入作品').map((glyph,i)=><span key={i}>{glyph}</span>)}</span></button></div>
    <div className="home-corner home-corner--left"><span className="home-original-grid" aria-hidden="true">▪▪<br/>▪▪</span><span>AI FILM<br/>PORTFOLIO</span></div>
    <button className="home-corner home-corner--right" type="button" onClick={onAbout}><span>关于这个作品集</span><ArrowRight/></button>
    <p className="home-hint home-corner">{webgl?'移动鼠标，探索画面':'点击进入，观看作品'}</p>
  </div>
}
