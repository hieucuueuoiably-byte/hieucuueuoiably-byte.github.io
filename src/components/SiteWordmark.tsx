import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SITE } from '../data/site'

interface SiteWordmarkProps { reducedMotion: boolean; onHome: () => void }

/** One persistent title keeps every route on the same navigation row. */
export function SiteWordmark({ reducedMotion, onHome }: SiteWordmarkProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root || reducedMotion) return
    let observer: MutationObserver | undefined
    const context = gsap.context(() => {
      const idle = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.8 })
        .to('.site-wordmark__glyph-motion', { y: -4, scaleY: 1.025, duration: .42, stagger: .085, ease: 'sine.out' })
        .to('.site-wordmark__glyph-motion', { y: 0, scaleY: 1, duration: .62, stagger: .085, ease: 'sine.inOut' }, .38)
      const intro = gsap.timeline({ paused: true })
        .fromTo('.site-wordmark__glyph', { opacity: 0, yPercent: 115, rotationX: -55 }, { opacity: 1, yPercent: 0, rotationX: 0, duration: .85, stagger: .055, ease: 'back.out(1.35)' }, .18)
        .fromTo('.site-wordmark__rule', { scaleX: 0 }, { scaleX: 1, duration: .65, ease: 'power3.out' }, .62)
        .fromTo('.site-wordmark__tagline-text', { opacity: 0, y: 9 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' }, .68)
        .fromTo('.site-wordmark__accent', { opacity: 0, scale: 0, rotation: -90 }, { opacity: 1, scale: 1, rotation: 0, duration: .8, stagger: .12, ease: 'back.out(1.6)' }, .55)
        .call(() => idle.play(), [], 1.3)
      const loader = document.querySelector('.preloader')
      if (!loader || loader.classList.contains('is-done')) intro.play()
      else {
        observer = new MutationObserver(() => {
          if (loader.classList.contains('is-done')) { observer?.disconnect(); intro.play() }
        })
        observer.observe(loader, { attributes: true, attributeFilter: ['class'] })
      }
    }, root)
    return () => { observer?.disconnect(); context.revert() }
  }, [reducedMotion])

  return <div className={'app-header__title-wrapper site-wordmark' + (reducedMotion ? ' site-wordmark--still' : '')} ref={rootRef}>
    <h1 className="site-wordmark__heading">
      <a className="site-wordmark__link" href="/" aria-label={`${SITE.name} — 返回首页`} onClick={event => { event.preventDefault(); onHome() }}>
        <span className="site-wordmark__accent" aria-hidden="true"><svg className="site-wordmark__spark" viewBox="0 0 24 24"><path d="M12 0Q13 10 24 12Q13 13 12 24Q11 13 0 12Q11 10 12 0Z" fill="currentColor" /></svg></span>
        <span className="site-wordmark__text" aria-hidden="true">{Array.from(SITE.name).map((glyph, i) => <span className="site-wordmark__glyph-clip" key={i}><span className="site-wordmark__glyph"><span className="site-wordmark__glyph-motion">{glyph}</span></span></span>)}</span>
        <span className="site-wordmark__accent site-wordmark__accent--right" aria-hidden="true"><svg className="site-wordmark__spark" viewBox="0 0 24 24"><path d="M12 0Q13 10 24 12Q13 13 12 24Q11 13 0 12Q11 10 12 0Z" fill="currentColor" /></svg></span>
      </a>
    </h1>
    <p className="site-wordmark__tagline"><span className="site-wordmark__rule" aria-hidden="true" /><span className="site-wordmark__tagline-text">{SITE.tagline}</span><span className="site-wordmark__rule" aria-hidden="true" /></p>
  </div>
}
