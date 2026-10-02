import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { flushSync } from 'react-dom'
import gsap from 'gsap'

import { PUBLISHED_WORKS as WORKS, findWorkIndexBySlug, type Work } from './data/works'
import { SCENE_WORKS, WORK_CATEGORIES, categoryForPath, categoryForWork, getCategory, getWorksForCategory, type WorkCategoryId } from './data/categories'
import { navigator } from './state/navController'
import { video } from './state/videoController'
import { useNav, useWorksInput } from './state/useNav'
import { WorksScene, type SceneMode } from './gl/WorksScene'
import { TransitionController } from './lib/transition'
import { detectWebGL, exposeSceneForVerification, prefersReducedMotion, watchEnv } from './lib/env'
import { shouldDisableBend } from './config/motion'

import { Header } from './components/Header'
import { Preloader } from './components/Preloader'
import { TransitionLayer } from './components/TransitionLayer'
import { ControlBar } from './components/ControlBar'
import { syncCardTargets } from './components/CardTargets'

import { HomePage } from './pages/HomePage'
import { WorksPage } from './pages/WorksPage'
import { AboutPage } from './pages/AboutPage'

import './styles/global.css'
import './styles/collection-nodes.css'
import './styles/inline-video.css'
import './styles/chapter-reader.css'

/**
 * GSAP 默认的 lagSmoothing(500, 33) 会在某一帧卡住超过 500ms 时，
 * 只把时间轴推进 33ms —— 对"切回标签页"是好事，但对转场是坏事：
 * 换页那一帧要 flushSync 换路由 + 挂载新页面，本来就可能卡几百毫秒，
 * 结果整条转场在墙钟上被拉长（实测 1.05s 的转场跑成 2.2s）。
 * 直接关掉它（lagSmoothing(0)）：转场时长就严格等于配置值，不会被某一帧的长阻塞拉长。
 * 代价是"标签页切回来时转场会瞬间补完"—— 1 秒的转场，这个代价可以接受，
 * 而且比"转场被拉成两倍长"更符合预期。
 */
gsap.ticker.lagSmoothing(0)

/** 路由 → WebGL 舞台模式 */
function modeFor(pathname: string): SceneMode {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/about')) return 'about'
  if (pathname === '/works' || pathname === '/works/') return 'works'
  if (pathname.startsWith('/works/category/')) return 'collection'
  if (pathname.startsWith('/works/')) return 'player'
  return 'works'
}

/** 用两张主题色算一个"平均亮度"，决定顶栏文字该用墨色还是奶油色 */
function navColorFor(work: Work | undefined, mode: SceneMode): 'ink' | 'cream' {
  if (mode === 'about' || mode === 'collection') return 'ink'
  if (mode === 'home') return 'cream'
  if (mode === 'player') return 'ink'
  if (!work) return 'ink'
  const lum = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16)
    const r = ((n >> 16) & 255) / 255
    const g = ((n >> 8) & 255) / 255
    const b = (n & 255) / 255
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const avg = (lum(work.themeColors[0]) + lum(work.themeColors[1])) / 2
  // 背景是由两张主题色混出来的，所以平均亮度够高就用墨色字
  return avg > 0.58 ? 'ink' : 'cream'
}

export function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const nav = useNav()

  const [webgl, setWebgl] = useState(() => detectWebGL())
  const [env, setEnv] = useState({ reducedMotion: false, touch: false })
  const [booted, setBooted] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageHostRef = useRef<HTMLDivElement>(null)
  const wipeRef = useRef<HTMLDivElement>(null)
  const wipeShapeRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<WorksScene | null>(null)
  const tcRef = useRef<TransitionController | null>(null)
  /** 记录"这一次路由变化是不是我们主动按转场走过去"，用于区分浏览器前进/后退 */
  const expectedPath = useRef<string>(location.pathname)
  const scopeRef = useRef<WorkCategoryId | null>(null)
  /** M05 的热值：0 = 海报还在浏览带里，1 = 已经接续到播放舞台。用 ref 承载，不触发 React */
  const focusRef = useRef({ v: 0 })

  const mode = modeFor(location.pathname)
  const slug = mode === 'player' ? location.pathname.match(/^\/works\/([^/]+)\/?$/)?.[1] ?? '' : ''
  const detailIndex = slug ? findWorkIndexBySlug(slug) : -1
  const activeCategory = mode === 'player' ? categoryForWork(WORKS[detailIndex]) : categoryForPath(location.pathname) ?? 'all'
  const activeWorks = getWorksForCategory(activeCategory)
  const detailLocalIndex = activeWorks.findIndex((work) => work.slug === slug)

  const syncScope = useCallback((category: WorkCategoryId, localIndex?: number) => {
    const items = getWorksForCategory(category)
    if (scopeRef.current !== category) {
      if (scopeRef.current !== null) navigator.remember()
      navigator.setStorageScope(category)
      navigator.setCount(items.length)
      const remembered = navigator.restoreFromStorage()
      navigator.snapInstant(localIndex ?? remembered ?? 0)
      scopeRef.current = category
    } else if (localIndex !== undefined && Math.abs(navigator.read().current-localIndex)>.002) {
      // Route synchronization must not restart a source-duration .4s step as a .6s jump.
      if(!navigator.getSnapshot().snapping||navigator.getTargetIndex()!==localIndex)navigator.jumpTo(localIndex,{force:true})
    }
    sceneRef.current?.setWorks(items)
    sceneRef.current?.snapLayout(navigator.read())
  }, [])

  useLayoutEffect(() => {
    if (location.pathname !== expectedPath.current && tcRef.current?.isRunning) {
      tcRef.current.kill()
      expectedPath.current = location.pathname
    }
    if (scopeRef.current === null || mode === 'works' || mode === 'collection' || mode === 'player') {
      syncScope(activeCategory, mode === 'player' && detailLocalIndex >= 0 ? detailLocalIndex : undefined)
    }
  }, [mode, activeCategory, detailLocalIndex, location.pathname, syncScope])

  /* ------------------------------------------------------------------ 环境 */
  useEffect(() => {
    const stop = watchEnv(setEnv)
    setWebgl(detectWebGL())
    return stop
  }, [])

  useEffect(() => {
    navigator.setCapabilities({ reducedMotion: env.reducedMotion, webgl })
  }, [env.reducedMotion, webgl])

  /* ------------------------------------------------------------------ 舞台 */
  useEffect(() => {
    if (!canvasRef.current || !webgl) return
    const scene = new WorksScene(canvasRef.current, SCENE_WORKS)
    scene.setWorks(activeWorks)
    scene.snapLayout(navigator.read())
    scene.setMode(mode)
    // 普通模式有弯曲；只有「减少动态效果 + 配置要求禁用」才关掉
    scene.setReduceBend(shouldDisableBend(env.reducedMotion))
    sceneRef.current = scene
    // 验收用：把场景实例暴露出去，脚本才能做像素级 A/B 与 uniform 读回
    exposeSceneForVerification(scene)

    /*
     * 封面着色器的预热放在首屏加载层后面跑。
     *
     * 不预热会怎样：首页上封面网格 visible=false，着色器程序一直没被编译，
     * 等转场进作品页、封面第一次上屏时编译，实测卡主线程 632ms，
     * 整段"揭开"动画被吃掉（见 docs/verify/swap-profile.json）。
     * 放在 260ms 这个点：预加载层遮着（1350ms 才收），用户看不到这次卡顿。
     */
    const warmTimer = window.setTimeout(() => scene.warmup(), 260)

    const onResize = () => scene.resize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    // 参考站用 JS 写 --vh 修移动端 100vh 的抖动（E07）
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
    }
    setVh()
    window.addEventListener('resize', setVh)

    return () => {
      window.clearTimeout(warmTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.removeEventListener('resize', setVh)
      scene.dispose()
      sceneRef.current = null
    }
    // mode 只在挂载时用一次，之后由下面那个 effect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl])

  useEffect(() => {
    sceneRef.current?.setMode(mode)
    sceneRef.current?.setReduceBend(shouldDisableBend(env.reducedMotion))
  }, [mode, env.reducedMotion])

  /* --------------------------------------------------- 动作：进入 / 返回 / 切换 */
  const tc = useMemo(() => {
    return new TransitionController({
      getWipe: () => wipeRef.current,
      getWipeShape: () => wipeShapeRef.current,
      getScene: () => sceneRef.current,
      getPage: () => pageHostRef.current?.querySelector('.page') ?? null,
      getHost: () => pageHostRef.current,
      currentPath: () => window.location.pathname,
      navigate: (to) => {
        expectedPath.current = to
        navigateRef.current(to)
      },
      flush: (fn) => flushSync(fn),
    })
  }, [])

  useEffect(() => {
    tcRef.current = tc
    return () => tc.kill()
  }, [tc])

  const goCategory = useCallback((category: WorkCategoryId) => {
    if (tcRef.current?.isRunning) return
    navigator.remember()
    const path = getCategory(category).path
    // Prepare the first-level directory before its home compositor capture.
    if (mode === 'home') syncScope(category)
    void tcRef.current?.go(path, 1)
  }, [mode, syncScope])

  /** Category nodes open their collection; film nodes open the player. */
  const enterWork = useCallback(
    (index: number) => {
      if (tcRef.current?.isRunning) return
      if (activeCategory === 'all') {
        const category = WORK_CATEGORIES[index + 1]
        if (category) goCategory(category.id)
        return
      }
      const work = activeWorks[index]
      if (!work) return
      if (navigator.read().selectedIndex !== index) navigator.jumpTo(index)
      else video.play()
    },
    [activeCategory, activeWorks, goCategory]
  )

  /** 从详情返回列表：恢复之前选中的作品与位置 */
  const backToWorks = useCallback(() => {
    if (tcRef.current?.isRunning) return
    navigator.remember()
    // 先把封面收回浏览带（此时画面已被遮挡层盖住），再换路由
    gsap.to(focusRef.current, { v: 0, duration: 0.34, ease: 'power2.inOut' })
    void tcRef.current?.go(getCategory(activeCategory).path, -1).then(() => {
      if (window.location.pathname !== getCategory(activeCategory).path || scopeRef.current !== activeCategory) return
      // 回来之后把位置瞬间对齐，避免"从 0 滑到原位置"的假动画
      navigator.snapInstant(Math.max(0, detailLocalIndex))
      sceneRef.current?.snapLayout(navigator.read())
    })
  }, [activeCategory, detailLocalIndex])

  /* ------------------------------------- M05：进入/离开作品时驱动封面的接续进度 */
  useEffect(() => {
    if (mode === 'player') {
      gsap.to(focusRef.current, { v: 1, duration: 0.62, ease: 'power3.out' })
    } else if (mode === 'works') {
      gsap.to(focusRef.current, { v: 0, duration: 0.3, ease: 'power2.out' })
    } else {
      gsap.to(focusRef.current, { v: 0, duration: 0.001 })
    }
  }, [mode])

  /* -------------------- 详情页里切上一件 / 下一件：封面先回落一点再接到新舞台 */
  const prevDetailIndex = useRef(-1)
  useEffect(() => {
    if (mode !== 'player') {
      prevDetailIndex.current = -1
      return
    }
    if (prevDetailIndex.current !== -1 && prevDetailIndex.current !== detailIndex) {
      gsap
        .timeline()
        .to(focusRef.current, { v: 0.22, duration: 0.24, ease: 'power2.in' })
        .to(focusRef.current, { v: 1, duration: 0.5, ease: 'power3.out' })
    }
    prevDetailIndex.current = detailIndex
  }, [mode, detailIndex])

  const goWorks = useCallback(() => {
    goCategory('all')
  }, [goCategory])

  const goAbout = useCallback(() => {
    void tcRef.current?.go('/about', 1)
  }, [])

  const goHome = useCallback(() => {
    if (tcRef.current?.isRunning) return
    navigator.remember()
    void tcRef.current?.go('/', -1)
  }, [])

  /** Reader route changes use the same horizontal paper movement as collection pages. */
  const jumpDetail = useCallback((index:number) => {
    const next=activeWorks[index]
    if(!next||tcRef.current?.isRunning)return
    video.pause()
    const path=`/works/${next.slug}`
    expectedPath.current=path
    navigateRef.current(path)
  },[activeWorks])
  const stepDetail = useCallback((dir:1|-1)=>{
    if(tcRef.current?.isRunning)return
    const base=navigator.getSnapshot().snapping?navigator.getTargetIndex():detailLocalIndex
    const next=activeWorks[base+dir]
    if(!next)return
    video.pause();navigator.step(dir)
    const path=`/works/${next.slug}`
    expectedPath.current=path;navigateRef.current(path)
  },[detailLocalIndex,activeWorks])
  // Wheel/drag land on a paper first; update the deep link after it settles.
  useEffect(()=>{
    const read=navigator.read(),state=navigator.getSnapshot()
    if(mode!=='player'||state.snapping||state.dragging||Math.abs(read.current-read.selectedIndex)>.002)return
    const work=activeWorks[read.selectedIndex]
    if(!work||work.slug===slug)return
    const path=`/works/${work.slug}`
    expectedPath.current=path
    navigateRef.current(path,{replace:true})
  },[mode,nav.snapping,nav.dragging,nav.currentPosition,nav.selectedIndex,activeWorks,slug])

  /* ------------------------------------------------------- 浏览器前进/后退兜底 */
  useEffect(() => {
    if (location.pathname === expectedPath.current) return
    // 不是我们主动走过去的一次变化 —— 不做遮挡动画，但给新页面一个轻量接入
    expectedPath.current = location.pathname
    const page = pageHostRef.current?.querySelector('.page')
    if (!page) return
    const layers = Array.from(page.querySelectorAll<HTMLElement>('[data-stage-layer]'))
    if (!layers.length) return
    layers.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(20px)'
    })
    requestAnimationFrame(() => {
      layers.forEach((el) => {
        el.style.transition = 'opacity 320ms ease, transform 420ms cubic-bezier(.16,1,.3,1)'
        el.style.opacity = ''
        el.style.transform = ''
      })
      window.setTimeout(() => {
        layers.forEach((el) => {
          el.style.transition = ''
        })
      }, 480)
    })
  }, [location.pathname])

  /* --------------------------------------------- 路由进入详情/返回时同步播放状态 */
  useEffect(() => {
    if (mode === 'player' && detailIndex >= 0) {
      navigator.setPlayback(WORKS[detailIndex].video ? 'loading' : 'missing', detailIndex)
      navigator.remember()
    }
    if (mode === 'works') {
      navigator.setPlayback('idle', -1)
    }
    if (mode === 'home' || mode === 'about') {
      navigator.setPlayback('idle', -1)
    }
  }, [mode, detailIndex])

  /* ------------------------------------------------------------ body 滚动锁 */
  useEffect(() => {
    const lock = mode === 'home' || mode === 'works' || mode === 'collection' || mode === 'player'
    document.body.classList.toggle('is-locked', lock)
    document.body.dataset.route = mode
    return () => document.body.classList.remove('is-locked')
  }, [mode])

  /* ------------------------------------------- WebGL 不可用时切到静态版本样式 */
  useEffect(() => {
    document.body.classList.toggle('static-mode', !webgl)
    return () => document.body.classList.remove('static-mode')
  }, [webgl])

  useEffect(() => {
    document.body.classList.toggle('is-transitioning', nav.routeTransition)
    return () => document.body.classList.remove('is-transitioning')
  }, [nav.routeTransition])

  /* ------------------------------- WebGL 背景在首页用插画自己的外框色/舞台色 */
  useEffect(() => {
    // Match the original portal's outer purple and the inner orange sky.
    sceneRef.current?.setHomePair('#7E7EFF', '#FFAD12')
  }, [webgl])

  /* ------------------------------------------------------------ 输入接管 */
  // 作品浏览页：接管滚轮 / 拖拽 / 全套键盘
  useWorksInput({
    enabled: (mode === 'works' || mode === 'collection') && !nav.routeTransition,
    wheel: true,
    drag: true,
    keyboard: 'works',
  })

  // 章节式播放页：滚轮和拖拽推动纸张，左右键同步深链接。
  useWorksInput({
    enabled: mode === 'player' && !nav.routeTransition,
    wheel: true,
    drag: true,
    keyboard: 'player',
    onStepWork: stepDetail,
  })

  // 关于页：完全不碰键盘 —— PageDown / 方向键 / Home / End 必须是原生滚动
  useWorksInput({
    enabled: mode === 'about' && !nav.routeTransition,
    wheel: false,
    drag: false,
    keyboard: 'none',
  })

  /* ------------------------------------------------------------ 渲染循环 */
  useEffect(() => {
    let raf = 0
    let last = 0
    let running = true
    let stageProbe = 0

    const loop = (now: number) => {
      if (!running) return
      const dt = last === 0 ? 1 / 60 : Math.min(0.1, (now - last) / 1000)
      last = now
      navigator.update(now)
      const scene = sceneRef.current
      if (scene) {
        const f = focusRef.current.v
        scene.setFocus(f)
        // 其他海报比当前海报更早退场（先散开，再让主角接上舞台）
        scene.setExit(Math.min(1, f * 1.7))
        scene.update(dt, navigator.read())
        syncCardTargets(scene.getCardTargets())
        if ((scene.getMode() === 'works' || scene.getMode() === 'collection' || scene.getMode() === 'player') && stageProbe++ % 4 === 0) {
          const rect = scene.getActiveCoverRect()
          if (rect) {
            document.documentElement.style.setProperty('--cover-bottom', `${rect.y + rect.h}px`)
            document.documentElement.style.setProperty('--cover-width', `${rect.w}px`)
            document.documentElement.style.setProperty('--cover-left', `${rect.x}px`)
            document.documentElement.style.setProperty('--cover-top', `${rect.y}px`)
            document.documentElement.style.setProperty('--cover-height', `${rect.h}px`)
          }
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else {
        running = true
        last = 0
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [webgl])

  /* ------------------------------------------------------------ 首屏加载 */
  useEffect(() => {
    if (booted) return
    const t = window.setTimeout(() => setBooted(true), prefersReducedMotion() ? 260 : 1350)
    return () => window.clearTimeout(t)
  }, [booted])

  const navColor = navColorFor(activeWorks[nav.selectedIndex], mode)
  const delay = location.pathname === '/'
  const worksPage = <WorksPage works={activeWorks} category={activeCategory} onCategory={goCategory} webgl={webgl} onEnter={enterWork} onJump={(i) => mode==='player'?jumpDetail(i):navigator.jumpTo(i)} reducedMotion={env.reducedMotion} />

  return (
    <>
      {/* WebGL 舞台：背景 + 封面形变 */}
      {webgl ? (
        <div className="gl-stage" aria-hidden="true">
          <canvas ref={canvasRef} className="gl-canvas" />
        </div>
      ) : (
        <div className="gl-stage" aria-hidden="true" />
      )}

      <div>
        {/* 顶栏：转场中不参与进出，只换颜色 */}
        <Header
          navColor={navColor}
          delay={delay}
          reducedMotion={env.reducedMotion}
          onHome={goHome}
          onWorks={goWorks}
          onAbout={goAbout}
        />

        <div ref={pageHostRef}>
          <Routes location={location}>
            <Route
              path="/"
              element={
                <HomePage webgl={webgl} onEnter={goWorks} onAbout={goAbout} reducedMotion={env.reducedMotion} />
              }
            />
            <Route
              path="/works"
              element={worksPage}
            />
            <Route path="/works/category/:category" element={categoryForPath(location.pathname) ? worksPage : <Navigate to="/works" replace />} />
            <Route
              path="/works/:slug"
              element={
                detailIndex >= 0 ? worksPage : <Navigate to="/works" replace />
              }
            />
            <Route path="/about" element={<AboutPage reducedMotion={env.reducedMotion} />} />
            <Route
              path="*"
              element={
                <div className="page">
                  <div className="detail" data-stage-layer>
                    <div className="detail__inner">
                      <span className="detail__no">404</span>
                      <h1 className="detail__title">没有这个页面</h1>
                      <p className="detail__text">链接可能已经失效。回到作品列表继续浏览。</p>
                      <div className="detail__next">
                        <a href="/works">作品列表</a>
                      </div>
                    </div>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>

        {!webgl ? (
          <div className="static-notice" role="status">
            当前浏览器/设备没有可用的 WebGL，已切换为<b>静态浏览版</b>：作品仍然可以左右切换、进入详情与返回，
            立体封面与背景转场会简化显示。
          </div>
        ) : null}
      </div>

      <TransitionLayer wipeRef={wipeRef} shapeRef={wipeShapeRef} />

      {/* 底部胶囊控制条：挂在 App 上，跨路由是同一个元素，进入详情时"衔接为播放控件" */}
        {(mode === 'works' || mode === 'collection' || mode === 'player') && activeWorks.length > 0 ? (
        <ControlBar
          mode={mode === 'player' ? 'player' : mode === 'collection' ? 'inline' : 'categories'}
          index={nav.selectedIndex}
          works={activeWorks}
          onPrev={mode === 'player' ? () => stepDetail(-1) : () => navigator.step(-1)}
          onNext={mode === 'player' ? () => stepDetail(1) : () => navigator.step(1)}
          onEnter={enterWork}
          onBack={mode === 'collection' ? goWorks : backToWorks}
          reducedMotion={env.reducedMotion}
        />
      ) : null}

      {/* 首屏加载 */}
      <Preloader done={booted} />
    </>
  )
}
