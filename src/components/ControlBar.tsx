import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { V } from '../config/motion'
import type { Work } from '../data/works'
import { navigator } from '../state/navController'
import { useNav } from '../state/useNav'
import { video, fmtTime } from '../state/videoController'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from './icons'
import '../styles/control-bar-motion.css'

export type BarMode = 'categories' | 'works' | 'player' | 'inline'

interface ControlBarProps {
  mode: BarMode
  index: number
  works: Work[]
  onPrev: () => void
  onNext: () => void
  /** works 模式：进入当前作品 */
  onEnter: (index: number) => void
  /** player 模式：返回列表 */
  onBack: () => void
  reducedMotion: boolean
}

/**
 * 底部黑色胶囊控制条。
 *
 * 它**挂在 App 上而不是页面里**，所以从作品列表进入详情时是同一个 DOM 元素在变形，
 * 而不是"一个消失、另一个出现"——这就是提示词 M05 要的「控制条衔接为播放控件」。
 */
export function ControlBar({ mode, index, works, onPrev, onNext, onEnter, onBack, reducedMotion }: ControlBarProps) {
  const nav = useNav()
  const barRef = useRef<HTMLDivElement>(null)
  const scrubRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const work: Work | undefined = works[index]
  const isPlayback = mode === 'player' || mode === 'inline'

  /* ------------------------------------------------ 播放页自己的进度刷新（不经过 React） */
  useEffect(() => {
    if (!isPlayback) return
    let raf = 0
    const tick = () => {
      const s = video.read()
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${s.ratio})`
      if (scrubRef.current) {
        scrubRef.current.setAttribute('aria-valuenow', String(Math.round(s.ratio * 100)))
        scrubRef.current.setAttribute('aria-valuetext', `${fmtTime(s.t)} / ${fmtTime(s.d)}`)
      }
      if (timeRef.current) timeRef.current.textContent = `${fmtTime(s.t)} / ${fmtTime(s.d)}`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlayback])

  /* ------------------------------------------------ 模式切换时的衔接动画 */
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const scrub = scrubRef.current
    const d = reducedMotion ? V.a11y.reducedMotionScale : 1
    if (!scrub) return
    const tween = gsap.fromTo(scrub, { opacity: 0, width: 0, marginRight: 0 }, { opacity: 1, width: 150, marginRight: 10, duration: 0.34 * d, ease: 'power3.out' })
    return () => { tween.kill() }
  }, [mode, isPlayback, reducedMotion])

  /* ChaptersButton H/j: the original GSAP entry, adapted to the persistent player. */
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar || reducedMotion) return
    let observer: MutationObserver | undefined
    const context = gsap.context(() => {
      const text = bar.querySelectorAll('.bar__text-inner')
      const play = bar.querySelector('.bar__play-icon')
      const navigation = bar.querySelector('.bar__nav')
      const intro = gsap.timeline({ paused: true })
      gsap.set(bar, { autoAlpha: 0, y: 100, scale: 0, rotationX: -100, transformPerspective: 600 })
      gsap.set(text, { yPercent: 100 })
      gsap.set(play, { xPercent: -100, scale: .75 })
      gsap.set(navigation, { opacity: 0 })
      intro.to(bar, { autoAlpha: 1, duration: .2, ease: 'power2.out' }, .12)
        .to(bar, { scale: 1, duration: 1, ease: 'elastic.out(0.3, 0.3)' }, .12)
        .to(bar, { rotationX: 0, y: 0, duration: .5, ease: 'back.out' }, .12)
        .to(text, { yPercent: 0, duration: .6, stagger: .1, ease: 'expo.out' }, .22)
        .to(play, { xPercent: 0, scale: 1, duration: .5, ease: 'cubic.inOut' }, .02)
        .to(navigation, { opacity: 1, duration: .2, ease: 'cubic.out' }, .22)
      const start = () => {
        const loader = document.querySelector('.preloader')
        if (document.body.classList.contains('is-transitioning') || (loader && !loader.classList.contains('is-done'))) return
        observer?.disconnect()
        intro.play()
      }
      observer = new MutationObserver(start)
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
      const loader = document.querySelector('.preloader')
      if (loader) observer.observe(loader, { attributes: true, attributeFilter: ['class'] })
      start()
    }, bar)
    return () => { observer?.disconnect(); context.revert() }
  }, [mode, reducedMotion])

  useLayoutEffect(()=>{
    if(!barRef.current||reducedMotion)return
    const tween=gsap.fromTo(barRef.current.querySelectorAll('.bar__text-inner'),{yPercent:70,opacity:0},{yPercent:0,opacity:1,duration:.3,ease:'power3.out',stagger:.025})
    return ()=>{tween.kill()}
  },[work?.slug,reducedMotion])

  const hasVideo = !!work?.video
  const playing = nav.playbackState === 'playing'

  const onPlayClick = () => {
    if (!isPlayback) {
      onEnter(index)
    } else if (hasVideo) {
      video.toggle()
    }
  }

  const playLabel =
    mode === 'categories' ? `查看分类：${work?.title ?? ''}` : mode === 'works' ? `进入作品：${work?.title ?? ''}` : playing ? '暂停' : '播放'

  return (
    <div className={`control-bar control-bar--${mode}`} ref={barRef} data-stage-layer data-motion={reducedMotion ? 'reduced' : 'full'}>
      <button
        className="bar-btn bar-btn--play"
        type="button"
        onClick={onPlayClick}
        aria-label={playLabel}
        disabled={!isPlayback ? !work : !hasVideo || nav.snapping || nav.dragging}
        title={mode === 'categories' ? '查看分类' : mode === 'works' ? '进入作品' : hasVideo ? '播放 / 暂停' : '视频待添加'}
      >
        <span className="bar__play-icon">{playing ? <PauseIcon /> : <PlayIcon />}</span>
      </button>

      <div className="bar__meta">
        <span className="bar__title" title={work?.title}>
          <span className="bar__text-inner">{work ? `${work.no}. ${work.title}` : '—'}</span>
        </span>
        <span className="bar__sub">
          <span className="bar__text-inner">{mode === 'categories' ? work?.description : <>{work?.category ?? '—'}{' · '}<span title={work?.duration ? '时长' : '还没填时长'}>
            {work?.duration ? work.duration : '时长待填写'}
          </span>{isPlayback && work ? ` · ${work.videoAspect.replace(/\s*\/\s*/, ':')}` : ''}</>}</span>
        </span>
      </div>

      {/* 播放页专属：进度轨 + 时间。进入时从 0 宽展开，实现"衔接" */}
      {isPlayback ? (
        <div
          className="bar__scrub"
          ref={scrubRef}
          role="slider"
          aria-label="播放进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          tabIndex={hasVideo ? 0 : -1}
          onKeyDown={(e) => {
            if (!hasVideo) return
            /*
             * 焦点在进度条上时，方向键只调播放进度，不切作品。
             * 必须 stopPropagation：全局的键盘处理器挂在 window 上，
             * 不拦住的话 ←/→ 会同时"调进度 + 切作品"。
             * preventDefault 是为了不让方向键触发页面滚动。
             */
            const s = video.read()
            switch (e.key) {
              case 'ArrowLeft':
                e.preventDefault()
                e.stopPropagation()
                video.seek(Math.max(0, s.ratio - 0.02))
                break
              case 'ArrowRight':
                e.preventDefault()
                e.stopPropagation()
                video.seek(Math.min(1, s.ratio + 0.02))
                break
              case 'Home':
                e.preventDefault()
                e.stopPropagation()
                video.seek(0)
                break
              case 'End':
                e.preventDefault()
                e.stopPropagation()
                video.seek(1)
                break
              case ' ':
              case 'Enter':
                e.preventDefault()
                e.stopPropagation()
                video.toggle()
                break
              default:
                break
            }
          }}
          onPointerDown={(e) => {
            if (!hasVideo) return
            e.currentTarget.setPointerCapture(e.pointerId)
            const rect = e.currentTarget.getBoundingClientRect()
            video.seek((e.clientX - rect.left) / rect.width)
          }}
          onPointerMove={(e) => {
            if (!hasVideo || !e.currentTarget.hasPointerCapture(e.pointerId)) return
            const rect = e.currentTarget.getBoundingClientRect()
            video.seek((e.clientX - rect.left) / rect.width)
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
          }}
        >
          <div className="bar__scrub-track">
            <div className="bar__scrub-fill" ref={fillRef} />
          </div>
        </div>
      ) : null}

      {isPlayback ? <span className="bar__time" ref={timeRef}>00:00 / 00:00</span> : null}

      <span className="bar__sep" aria-hidden="true" />
      <span className="bar__index" aria-hidden="true">
        <span className="bar__text-inner">{String(index + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')}</span>
      </span>

      <div className="bar__nav">
        {isPlayback ? (
          <button className="bar-btn" type="button" aria-label="全屏播放" title="全屏播放" onClick={() => { void video.element?.requestFullscreen?.().catch(() => {}) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" /></svg>
          </button>
        ) : null}
        {mode === 'player' ? (
          <button
            className="bar-btn"
            type="button"
            onClick={onBack}
            aria-label="返回作品列表"
            title="返回作品列表"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5.6v12.8c0 .72-.79 1.16-1.4.79l-9.1-5.5a.93.93 0 0 1 0-1.58l9.1-5.5c.61-.37 1.4.07 1.4.79Z" transform="translate(7 0)" />
              <rect x="7.5" y="4.6" width="2.6" height="14.8" rx="1.2" />
            </svg>
          </button>
        ) : null}
        <button
          className="bar-btn"
          type="button"
          onClick={onPrev}
          aria-label={mode === 'categories' ? '上一个分类' : '上一个作品'}
          disabled={index <= 0}
        >
          <PrevIcon />
        </button>
        <button
          className="bar-btn"
          type="button"
          onClick={onNext}
          aria-label={mode === 'categories' ? '下一个分类' : '下一个作品'}
          disabled={index >= works.length - 1}
        >
          <NextIcon />
        </button>
      </div>
    </div>
  )
}

/** 供外部读取当前播放状态（避免在 App 里重复订阅） */
export const readPlayback = () => navigator.getSnapshot().playbackState
