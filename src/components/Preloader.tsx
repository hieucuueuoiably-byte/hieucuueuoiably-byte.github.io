import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { V } from '../config/motion'

/**
 * 首屏加载层。
 *
 * 参考站观察（E21）：奶油底色 #fff6f0、中央一枚从 scale(0) rotate(-120deg) 转进来的标记、
 * 下方一条 311×6 的进度线（底 #f2f2f2、进度 #ffcc8e）。这里照搬这套构图，
 * 进度用假进度条推进到 100% 然后整层收起 —— 收起之后才轮到首页的分层入场。
 */
export function Preloader({ done }: { done: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const obj = useRef({ v: 0 })

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const tw = gsap.to(obj.current, {
      v: 1,
      duration: 1.15,
      ease: 'power2.inOut',
      onUpdate: () => {
        bar.style.transform = `scaleX(${obj.current.v})`
      },
    })
    return () => {
      tw.kill()
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || !done) return
    const tw = gsap.to(el, { opacity: 0, duration: 0.5, ease: 'power2.out' })
    return () => {
      tw.kill()
    }
  }, [done])

  return (
    <div
      className={`preloader${done ? ' is-done' : ''}`}
      ref={ref}
      role="status"
      aria-live="polite"
      aria-label="正在载入作品集网站"
    >
      <div className="preloader__mark" aria-hidden="true">
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="98" fill={V.colors.ink} />
          <path
            d="M100 34c14 0 22 8 33 16 10 7 22 9 28 19 6 10 4 23-2 33-6 11-16 19-25 28-8 9-13 20-24 24-12 4-25-1-36-7-11-7-22-15-26-27-4-11-1-24 4-35 5-10 14-18 22-26 9-8 16-15 26-16Z"
            fill={V.colors.paper}
          />
          <circle cx="100" cy="100" r="8" fill={V.colors.ink} />
        </svg>
      </div>
      <div className="preloader__track" aria-hidden="true">
        <div className="preloader__bar" ref={barRef} />
      </div>
      <span className="preloader__label">准备放映 · LOADING</span>
    </div>
  )
}
