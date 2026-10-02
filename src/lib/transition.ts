import gsap from 'gsap'
import { toCanvas } from 'html-to-image'
import { navigator } from '../state/navController'
import { prefersReducedMotion } from './env'

type Mode = 'home' | 'works' | 'collection' | 'player' | 'about'
export interface TransitionScene {
  setRouteOut: (p: number) => void
  setRouteIn: (p: number) => void
  setHomeSnapshot: (canvas: HTMLCanvasElement) => void
  beginTransition: (from: Mode, to: Mode, index?: number) => void
  setTransitionProgress: (p: number, p2?: number) => void
  endTransition: () => void
}
export interface TransitionContext {
  getWipe: () => HTMLElement | null
  getWipeShape: () => HTMLElement | null
  getScene: () => TransitionScene | null
  getPage: () => HTMLElement | null
  getHost: () => HTMLElement | null
  currentPath: () => string
  navigate: (to: string) => void
  flush: (fn: () => void) => void
}
const modeFor = (path: string): Mode => path === '/' ? 'home'
  : path.startsWith('/about') ? 'about'
  : path.startsWith('/works/category/') ? 'collection'
  : path === '/works' || path === '/works/' ? 'works'
  : path.startsWith('/works/') ? 'player' : 'works'
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Home and works share two render targets. DOM text remains accessible outside WebGL. */
export class TransitionController {
  private running = false
  private current: gsap.core.Timeline | null = null
  private complete: (() => void) | null = null
  private generation = 0
  constructor(private ctx: TransitionContext) {}
  get isRunning() { return this.running }

  private async captureHome() {
    // The layered homepage is already rendered in the shared GL scene.
    if(document.documentElement.dataset.homeWebgl==='ready')return
    const root = this.ctx.getPage()
    if (!root) return
    await Promise.allSettled(Array.from(root.querySelectorAll('img')).map((img) => img.decode()))
    await nextFrame()
    const snapshot = await toCanvas(root, {
      width: window.innerWidth, height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5), skipFonts: true,
      backgroundColor: '#7E7EFF',
      style: { opacity: '1', visibility: 'visible', margin: '0' },
    })
    document.documentElement.dataset.homeCapture=`${snapshot.width}x${snapshot.height}`
    this.ctx.getScene()?.setHomeSnapshot(snapshot)
  }

  async go(to: string, dir: 1 | -1 = 1): Promise<void> {
    if (this.running || to === this.ctx.currentPath()) return
    this.running = true
    const generation = ++this.generation
    navigator.setRouteTransition(true, dir)
    const from = modeFor(this.ctx.currentPath())
    const target = modeFor(to)
    const scene = this.ctx.getScene()
    try {
      const stageRoute = (from === 'home' && target === 'works') || (from === 'works' && target === 'home')
      if (stageRoute && scene && !prefersReducedMotion()) {
        if (from === 'home') await this.captureHome()
        if(from==='home'&&document.documentElement.dataset.homeWebgl==='ready')await this.fadeHomeText()
        if (generation !== this.generation) return
        scene.beginTransition(from, target, navigator.read().selectedIndex)
        const host = this.ctx.getHost()
        if (host) host.style.opacity = '0'
        this.ctx.flush(() => this.ctx.navigate(to))
        window.scrollTo({ top: 0 })
        if (target === 'home') {
          await nextFrame()
          await this.captureHome()
        }
        if (generation !== this.generation) return
        await this.renderTargets(target)
      } else {
        await this.circleWipe(to)
      }
    } catch (error) {
      console.warn('[transition] Snapshot fallback', error)
      this.ctx.flush(() => this.ctx.navigate(to))
    } finally {
      if (generation === this.generation) this.finish()
    }
  }

  /** The live GL stage keeps moving while its accessible DOM labels fade out. */
  private fadeHomeText(): Promise<void> {
    const host=this.ctx.getHost()
    if(!host)return Promise.resolve()
    const tl=gsap.timeline()
    this.current=tl
    tl.to(host,{opacity:0,duration:.18,ease:'power2.out'})
    return new Promise(resolve=>{this.complete=resolve;tl.eventCallback('onComplete',resolve)})
  }

  private renderTargets(target: Mode): Promise<void> {
    const scene = this.ctx.getScene()
    const state = { first: 0, second: 0 }
    const home = target === 'home'
    const duration = home ? 1.1 : 1.55
    const tl = gsap.timeline({ onUpdate: () => scene?.setTransitionProgress(state.first, state.second) })
    this.current = tl
    tl.to(state, { first: 1, duration: 1, ease: 'expo.inOut' }, 0)
      .to(state, { second: 1, duration: home ? 1 : 1.5, ease: 'expo.inOut' }, home ? 0.1 : 0.05)
    const host = this.ctx.getHost()
    if (host) tl.to(host, { opacity: 1, duration: 0.3, ease: 'power2.out' }, duration - 0.3)
    ;(window as unknown as Record<string, unknown>).__transitionSchedule = {
      route: home ? 'wave-render-targets' : 'circle-render-targets',
      first: 1, second: home ? 1 : 1.5, duration,
    }
    return new Promise((resolve) => {
      this.complete = resolve
      tl.eventCallback('onComplete', resolve)
    })
  }

  /** Content pages and reduced motion use an inexpensive center circle. */
  private circleWipe(to: string): Promise<void> {
    const wipe = this.ctx.getWipe()
    const shape = this.ctx.getWipeShape()
    if (!wipe || !shape) {
      this.ctx.flush(() => this.ctx.navigate(to))
      return Promise.resolve()
    }
    const d = prefersReducedMotion() ? 0.14 : 0.45
    wipe.style.visibility = 'visible'
    const target=modeFor(to)
    const color = target === 'home' ? '#7E7EFF' : target === 'about' || target === 'collection' ? '#fff6f0' : '#171717'
    const tl = gsap.timeline()
    this.current = tl
    tl.set(shape, { xPercent: -50, yPercent: -50, scale: 0, backgroundColor: color })
      .to(shape, { scale: 1, duration: d, ease: 'expo.inOut' })
      .add(() => {
        this.ctx.flush(() => this.ctx.navigate(to))
        window.scrollTo({ top: 0 })
      })
      .to(shape, { scale: 0, duration: d, ease: 'expo.inOut' })
    return new Promise((resolve) => {
      this.complete = resolve
      tl.eventCallback('onComplete', resolve)
    })
  }

  private finish() {
    this.ctx.getScene()?.endTransition()
    this.ctx.getScene()?.setRouteOut(0)
    this.ctx.getScene()?.setRouteIn(1)
    const host = this.ctx.getHost()
    if (host) host.style.opacity = ''
    const wipe = this.ctx.getWipe()
    if (wipe) wipe.style.visibility = 'hidden'
    this.running = false
    this.current = null
    this.complete = null
    navigator.setRouteTransition(false, 0)
  }
  kill() {
    ++this.generation
    this.current?.kill()
    this.complete?.()
    this.finish()
  }
}
