import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SITE } from '../data/site'
import { CloudShape, ScrollMouse } from '../components/icons'
import { V } from '../config/motion'
import { WORKS } from '../data/works'

gsap.registerPlugin(ScrollTrigger)

interface AboutPageProps {
  reducedMotion: boolean
}

/**
 * 关于页 —— 分段滚动叙事（M06）。
 *
 * 三个必须做到的点：
 *  1. 前后景不同速度 —— 每个 section 铺两层有机色块，`data-parallax` 给出各自的位移量，
 *     用 scrub 绑定滚动位置，所以前后景错速移动。
 *  2. 文字分段出现 —— 所有 `[data-reveal]`（段落、流程卡、联系卡）各绑一个 scrub 补间；
 *     大标题按字拆开做错位。
 *  3. 可回退 —— 全部用 `scrub` 或 `toggleActions: play none none reverse`，
 *     往上滚动画状态会原路退回，而不是"只播一次"。
 *
 * 这一页使用原生文档滚动；作品浏览页的输入处理器在这里停用。
 */
export function AboutPage({ reducedMotion }: AboutPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  /* ------------- 按字拆分大标题（中英文都适用，空格保留） ------------- */
  useLayoutEffect(() => {
    const root = scrollRef.current
    if (!root) return
    root.querySelectorAll<HTMLElement>('[data-chars]').forEach((el) => {
      if (el.dataset.chars === 'done') return
      const text = el.textContent ?? ''
      el.textContent = ''
      const frag = document.createDocumentFragment()
      Array.from(text).forEach((ch) => {
        const span = document.createElement('span')
        span.className = 'ch'
        span.textContent = ch === ' ' ? '\u00a0' : ch
        frag.appendChild(span)
      })
      el.appendChild(frag)
      el.dataset.chars = 'done'
    })
  }, [])

  /* -------------------- 滚动联动 -------------------- */
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const ctx = gsap.context(() => {
      /* 1. 前后景视差：每个 [data-parallax] 层按各自强度反向位移 */
      root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((layer) => {
        if (reducedMotion) { gsap.set(layer, { clearProps: 'transform' }); return }
        const strength = parseFloat(layer.dataset.parallax || '0')
        if (!strength) return
        const section = layer.closest('.about-section') ?? layer
        gsap.fromTo(
          layer,
          { yPercent: strength },
          {
            yPercent: -strength,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        )
      })

      /* 2. 文字分段出现：段落 / 卡片各绑一个 scrub 补间 → 天然可回退 */
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        if (reducedMotion) {
          gsap.set(el, { opacity: 1, y: 0 })
          return
        }
        gsap.fromTo(
          el,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top 92%',
              end: 'top 76%',
              scrub: 0.5,
            },
          }
        )
      })

      /* 3. 大标题逐字：这里用 toggleActions，往回想时会反向播回去 */
      root.querySelectorAll<HTMLElement>('[data-chars]').forEach((el) => {
        const chars = el.querySelectorAll('.ch')
        if (!chars.length) return
        if (reducedMotion) {
          gsap.set(chars, { opacity: 1, yPercent: 0 })
          return
        }
        gsap.fromTo(
          chars,
          { opacity: 0, yPercent: 108 },
          {
            opacity: 1,
            yPercent: 0,
            duration: V.revealDuration,
            ease: 'power3.out',
            stagger: V.revealStagger,
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      })

      /* 4. 底部进度条 */
      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`
        },
      })

      /* 5. 右侧定位点：滚到哪一段就点亮哪一颗 */
      SITE.sections.forEach((s, i) => {
        const section = document.getElementById(s.id)
        if (!section) return
        ScrollTrigger.create({
          trigger: section,
          start: 'top 55%',
          end: 'bottom 55%',
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
        })
      })

      // 定位点离开第一屏之后才滑入（参考站 E18：初始 opacity 0 + translateY(-36.5px)）
      ScrollTrigger.create({
        trigger: root,
        start: 'top top-=80',
        onEnter: () => navRef.current?.classList.add('is-visible'),
        onLeaveBack: () => navRef.current?.classList.remove('is-visible'),
      })
    }, root)

    // 图片/字体加载完之后重新量一次
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    const t = window.setTimeout(refresh, 320)

    return () => {
      window.removeEventListener('load', refresh)
      window.clearTimeout(t)
      ctx.revert()
    }
  }, [reducedMotion])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <div className="page page--scroll">
      <div className="about" ref={scrollRef} data-stage-layer>
        <div className="about__scroll">
          {/* ---------------- 开篇 ---------------- */}
          <section className="about-section about-intro" id="about-intro">
            <div className="about__field" aria-hidden="true">
              <div data-parallax="-7" style={{ position: 'absolute', inset: 0 }}>
                <CloudShape fill="rgba(23,23,23,0.06)" />
              </div>
            </div>
            <div className="about__field" aria-hidden="true">
              <div data-parallax="18" style={{ position: 'absolute', inset: 0 }}>
                <CloudShape fill="rgba(255,246,240,0.9)" />
              </div>
            </div>
            <div className="about-intro__film" data-parallax="8" aria-hidden="true">
              <img src="/media/hero-still.jpg" alt="" />
              <span className="about-intro__film-play">▶</span>
            </div>
            <div className="about__inner">
              <p className="about-eyebrow">ABOUT THE PICTURE SHOW</p>
              <h1 className="about-intro__title" data-chars>
                {SITE.about.introTitle}
              </h1>
            </div>
            <div className="about-intro__scroll">
              <span>向下滚动</span>
              <ScrollMouse />
            </div>
          </section>

          {/* ---------------- 理念 ---------------- */}
          <section className="about-section about-what" id="about-what">
            <div className="about__field" aria-hidden="true">
              <div data-parallax="-9" style={{ position: 'absolute', inset: 0 }}>
                <CloudShape fill="rgba(241,171,189,0.55)" />
              </div>
            </div>
            <div className="about__field" aria-hidden="true">
              <div data-parallax="22" style={{ position: 'absolute', inset: 0 }}>
                <CloudShape fill="rgba(255,246,240,0.92)" />
              </div>
            </div>
            <div className="about__inner">
              <h2 className="about-what__title" data-chars>
                {SITE.about.whatTitle.join('')}
              </h2>
              {SITE.about.paragraphs.map((p) => (
                <p className="about-what__text" key={p} data-reveal>
                  {p}
                </p>
              ))}
            </div>
          </section>

          {/* ---------------- 流程 ---------------- */}
          <section
            className="about-section"
            id="about-flow"
            style={{ padding: 'clamp(50px, 10vh, 140px) 0 clamp(70px, 14vh, 190px)' }}
          >
            <div className="about__field" aria-hidden="true">
              <div data-parallax="13" style={{ position: 'absolute', inset: 0 }}>
                <CloudShape fill="rgba(23,23,23,0.05)" />
              </div>
            </div>
            <div className="about__inner">
              <h2
                className="about-what__title"
                style={{ fontSize: 'clamp(30px, 5.6vw, 76px)' }}
                data-chars
              >
                三种视角，更多想象。
              </h2>
              <ul className="about-flow">
                {SITE.about.flow.map((f) => (
                  <li key={f.step} data-reveal>
                    <strong>{f.step}</strong>
                    <p>{f.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ---------------- 联系 ---------------- */}
          <section className="about-section about-contact" id="about-contact">
            <div className="about__field" aria-hidden="true">
              <div data-parallax="-11" style={{ position: 'absolute', inset: 0 }}>
                <CloudShape fill="rgba(241,171,189,0.5)" />
              </div>
            </div>
            <div className="about__inner">
              <p className="about-eyebrow">{String(WORKS.length).padStart(2, '0')} FILMS & COUNTING</p>
              <h2 className="about-contact__title" data-chars>
                下一部，继续看。
              </h2>
              <button type="button" className="about-watch" data-reveal onClick={() => document.querySelector<HTMLAnchorElement>('.app-header__link--works')?.click()}>回到作品 <span aria-hidden="true">↗</span></button>
              <p className="about-contact__footer">作品集网站 · AI 影像 / 动画 / 短片</p>
            </div>
          </section>
        </div>
      </div>

      {/* 右侧章节定位点（E18） */}
      <nav className="about-nav" ref={navRef} aria-label="章节定位">
        <ul className="about-nav__list">
          {SITE.sections.map((s, i) => (
            <li className="about-nav__item" key={s.id}>
              <button
                type="button"
                className={`about-nav__dot${active === i ? ' is-active' : ''}`}
                onClick={() => scrollTo(s.id)}
                aria-label={`跳到：${s.label}`}
                aria-current={active === i ? 'true' : undefined}
              >
                <span className="about-nav__label">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部进度条（E19） */}
      <div className="about-progress" role="presentation">
        <div className="about-progress__bar" ref={barRef} />
      </div>
    </div>
  )
}
