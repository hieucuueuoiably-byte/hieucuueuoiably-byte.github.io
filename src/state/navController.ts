/**
 * 作品导航状态控制器。
 *
 * 全站只有这一个地方持有浏览状态，所有输入（滚轮 / 前后按钮 / 触屏横滑 / 键盘左右键）
 * 都走同一条路径，对外暴露提示词要求的六个量：
 *   selectedIndex / targetPosition / currentPosition / velocity / routeTransition / playbackState
 *
 * ⚠️ 这一版是按**参考站源码**重写的，之前那版把机制搞错了。
 *
 * 参考站 https://ponpon-mania.com/ 的章节分页器（产物里的 `class IQ`）实际逻辑：
 *
 *   onWheel(e){ if(this.scrollIn) return; this.clearSnap(); this.targetX -= (e.deltaY + e.deltaX) / 400 }
 *
 *   update(dt){
 *     …越界时用 smoothDamp(smoothTime = 40) 把 targetX 顶回范围内（不是硬 clamp）…
 *     Ne(this, 'currentX', this.targetX, this.state.lerp /* 100，拖动时 200 *\/, dt)   // 二阶临界阻尼
 *     this.targetVelocity.value = this.velocityTracker.update(this.currentX)  // 20 帧滑动平均，钳 ±40
 *     this.calculateSnap()                        // 速度 < 0.1 就 snap 到最近一格
 *   }
 *   next(){ this.targetNav += 1; this.snap(this.targetNav, 0.4, 'cubic.out') }
 *   prev(){ this.targetNav -= 1; this.snap(this.targetNav, 0.4, 'cubic.out') }
 *   snap(i, dur = 0.3, ease = 'power2.inOut'){
 *     gsap.to(this, { currentX: -albums[i].position.x, duration: dur, ease,
 *                     onUpdate: () => this.targetX = this.currentX })   // ← 吸附期间 target 跟着 current 走
 *   }
 *
 * 结论：
 *   · **没有阈值、没有冷却** —— 每个滚轮事件都按 (deltaY + deltaX)/400 连续累加进目标位置
 *   · 「单次 120 不动、五次 120 走一格」不是阈值造成的，而是**位移不足半个格子**、
 *     停稳后被 snap 吸回原来那一格造成的
 *   · 按钮/键盘 0.4s cubic.out；点海报 0.6s cubic.out；自动吸附 0.3s power2.inOut；轻扫 0.3s power2.out
 *   · 越界用 smoothTime 40ms 阻尼顶回，所以有"按到墙上"的手感
 *   · 键盘方向：ArrowDown/ArrowLeft/a/q = 上一格，ArrowUp/ArrowRight/d = 下一格
 *   · 上次看的章节存在 localStorage['last-chapter']，下次进来会恢复
 *
 * 所有数值来源见 src/config/motion.ts 的 nav 段（标了 E-source 的即从产物源码读出）。
 */

import gsap from 'gsap'
import { V } from '../config/motion'

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'missing' | 'error'

export interface NavSnapshot {
  /** 目标位置（浮点，格） */
  targetPosition: number
  /** 渲染位置（浮点，格） */
  currentPosition: number
  /** 当前选中下标 */
  selectedIndex: number
  /** 渲染速度（格/秒，20 帧滑动平均，钳 ±maxVelocity） */
  velocity: number
  routeTransition: boolean
  transitionDir: 1 | -1 | 0
  playbackState: PlaybackState
  playbackIndex: number
  reducedMotion: boolean
  webgl: boolean
  /** 是否正在做吸附补间（验收用） */
  snapping: boolean
  /** 是否处于拖拽中 */
  dragging: boolean
}

type Listener = () => void

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * 参考站用的二阶临界阻尼（Unity SmoothDamp 的写法，产物里的 `Ne`）。
 * 单位：smoothTime 与 dt 都用毫秒。
 * 与一阶指数不同，它带速度记忆 —— 所以"顶住边界"和"跟手"的手感更自然。
 */
function smoothDamp(
  current: number,
  target: number,
  vel: { v: number },
  smoothTimeMs: number,
  dtMs: number,
  maxSpeed = Infinity
): number {
  const st = Math.max(1e-4, smoothTimeMs)
  const omega = 2 / st
  const x = omega * dtMs
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  let change = current - target
  const originalTo = target
  const maxChange = maxSpeed * st
  if (Number.isFinite(maxChange)) change = clamp(change, -maxChange, maxChange)
  target = current - change
  const temp = (vel.v + omega * change) * dtMs
  vel.v = (vel.v - omega * temp) * exp
  let out = target + (change + temp) * exp
  if (originalTo - current > 0 === out > originalTo) {
    out = originalTo
    vel.v = (out - originalTo) / dtMs
  }
  return out
}

class WorksNavigator {
  private count = 0
  private target = 0
  private current = 0
  private lastTime = 0

  /**
   * 参照参考站的 VelocityTracker：位移速度的滑动平均，钳到 ±maxVelocity。
   * 参考站按"最近 20 帧"取平均；这里按**时间窗**取（333ms = 20 帧 @60fps），
   * 因为低帧率下按帧数取窗会让速度长时间不衰减，"停稳"判定永远不满足。
   */
  private velSamples: { t: number; v: number }[] = []
  private vel = 0
  /**
   * 速度采样的"上一帧末"锚点。
   *
   * 必须记**跨帧**的锚点，不能在 update() 开头取 `prev = this.current`：
   * 吸附补间是 GSAP 的 ticker 在改 `current`，它发生在我的 rAF 回调**之间**。
   * 如果在开头取 prev，等取到的时候 current 已经被补间改过了 → 每帧位移恒为 0 →
   * 按钮/键盘切换时速度永远是 0 → 弯曲完全不会起来（实测 625 帧全 0）。
   */
  private velPrevT = 0
  private velPrevV = 0

  private posVel = { v: 0 }
  private targetVel = { v: 0 }

  private memoryIndex = 0
  private memoryTarget = 0
  private storageScope = 'all'
  private targetNav = 0

  private _routeTransition = false
  private _transitionDir: 1 | -1 | 0 = 0
  private _playback: PlaybackState = 'idle'
  private _playbackIndex = -1
  private _reducedMotion = false
  private _webgl = true
  private _dragging = false
  private _snapping = false

  private snapTween: gsap.core.Tween | null = null
  private pinnedVel: number | null = null
  /** 最后一次输入的时间戳（ms），用于"输入静默期"判定 */
  private lastInputAt = 0
  /**
   * 验收专用：抑制自动吸附。
   *
   * 为什么需要它：分页器**永远会停在整格**（这是正确行为，参考站也一样），
   * 所以"半格处的背景色"只在运动过程中一闪而过、静止时观察不到。
   * 要验证"位置→颜色"这个映射在半格处是否连续，就必须能让渲染位置停在半格上。
   */
  private suppressSnap = false

  private listeners = new Set<Listener>()
  private snapshot: NavSnapshot = this.build()

  /* ------------------------------------------------------------ 订阅 */
  subscribe = (fn: Listener) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getSnapshot = (): NavSnapshot => this.snapshot

  private build(): NavSnapshot {
    return {
      targetPosition: this.target,
      currentPosition: this.current,
      selectedIndex: this.selectedIndex,
      velocity: this.getVelocity(),
      routeTransition: this._routeTransition,
      transitionDir: this._transitionDir,
      playbackState: this._playback,
      playbackIndex: this._playbackIndex,
      reducedMotion: this._reducedMotion,
      webgl: this._webgl,
      snapping: this._snapping,
      dragging: this._dragging,
    }
  }

  private emit() {
    const next = this.build()
    const prev = this.snapshot
    const changed =
      prev.selectedIndex !== next.selectedIndex ||
      prev.routeTransition !== next.routeTransition ||
      prev.transitionDir !== next.transitionDir ||
      prev.playbackState !== next.playbackState ||
      prev.playbackIndex !== next.playbackIndex ||
      prev.reducedMotion !== next.reducedMotion ||
      prev.webgl !== next.webgl ||
      prev.snapping !== next.snapping ||
      prev.dragging !== next.dragging ||
      Math.abs(prev.targetPosition - next.targetPosition) > 0.0005 ||
      Math.abs(prev.velocity - next.velocity) > 0.02 ||
      Math.abs(prev.currentPosition - next.currentPosition) > 0.001
    this.snapshot = next
    if (changed) this.listeners.forEach((l) => l())
  }

  /* ------------------------------------------------------------ 初始化 */
  setCount(n: number) {
    this.count = Math.max(1, n)
    this.target = clamp(this.target, 0, this.count - 1)
    this.current = clamp(this.current, 0, this.count - 1)
    this.snapshot = this.build()
  }

  setCapabilities(cap: { reducedMotion: boolean; webgl: boolean }) {
    this._reducedMotion = cap.reducedMotion
    this._webgl = cap.webgl
    this.emit()
  }

  /* ------------------------------------------------------------ 位置 */
  get selectedIndex() {
    return Math.round(clamp(this.target, 0, this.count - 1))
  }

  get isFirst() {
    return this.selectedIndex <= 0
  }

  get isLast() {
    return this.selectedIndex >= this.count - 1
  }

  getTarget() {
    return this.target
  }
  getCurrent() {
    return this.current
  }
  /** Requested paper slot, including an in-flight button/keyboard step. */
  getTargetIndex() { return this.targetNav }
  getVelocity() {
    return this.pinnedVel ?? this.vel
  }

  /** 离当前渲染位置最近的那一格（参考站 calculateSnap 里的 minDist 扫描） */
  private nearestIndex() {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < this.count; i++) {
      const d = Math.abs(i - this.current)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  /* ------------------------------------------------------------ 吸附（参考站的 snap） */

  /** 停掉正在进行的吸附补间（参考站的 clearSnap）。任何新输入都要先调它 */
  private markInput() {
    this.lastInputAt = performance.now()
  }

  private clearSnap() {
    this.targetNav = this.nearestIndex()
    if (this.snapTween) {
      this.snapTween.kill()
      this.snapTween = null
    }
    this._snapping = false
  }

  /**
   * 补间到某一格。参数就是参考站的取值：
   *   next()/prev() → 0.4s cubic.out
   *   goTo / 点海报 → 0.6s cubic.out
   *   自动吸附     → 0.3s power2.inOut
   * 补间期间 `target` 跟着 `current` 走（参考站 onUpdate 就是这么写的），
   * 所以中途来新输入时 `clearSnap()` 能直接从当前位置接着自由滚动。
   */
  private snap(index: number, duration: number, ease: string) {
    if (this._routeTransition) return
    const to = clamp(Math.round(index), 0, this.count - 1)
    this.clearSnap()
    this.targetNav = to
    const reduce = this._reducedMotion && V.a11y.reducedMotionScale < 1
    this._snapping = true
    this.snapTween = gsap.to(this, {
      current: to,
      duration: reduce ? Math.max(0.001, duration * V.a11y.reducedMotionScale) : duration,
      ease: reduce ? 'none' : ease,
      onUpdate: () => {
        this.target = this.current
        this.emit()
      },
      onComplete: () => {
        this.snapTween = null
        this._snapping = false
        this.target = to
        this.current = to
        this.posVel.v = 0
        this.emit()
      },
    })
    this.emit()
  }

  /* ------------------------------------------------------------ 输入 */

  /**
   * 滚轮。**不做阈值判断** —— 参考站就是每个事件按 (deltaY + deltaX) / 400 连续累加。
   * `wheelDeltaPerStep` 把参考站的世界单位换算成本实现的「格」。
   */
  feedWheel(deltaY: number, deltaX = 0) {
    if (this._routeTransition) return false
    const d = deltaY + deltaX
    if (d === 0) return false
    this.clearSnap()
    this.markInput()
    /*
     * 方向：参考站是 `targetX -= (deltaY + deltaX)/400`，但它的 targetX 是**负向坐标**
     * （currentX = -albums[i].position.x，progress = -targetX/maxScroll）——
     * 所以 deltaY 为正（往下滚）时 progress 变大，也就是**走下一格**。
     * 本实现直接用"格"作坐标，所以是 `+=`。
     */
    const stepDelta = d / V.nav.wheelDeltaPerStep
    this.target = clamp(
      this.target + stepDelta,
      -V.nav.overshoot,
      this.count - 1 + V.nav.overshoot
    )
    this.emit()
    return true
  }

  /** 拖拽输入（触屏横滑 / 鼠标按住拖）。参考站：targetX += delta.x * 0.005（再除以 pitch） */
  feedDrag(deltaPx: number) {
    if (this._routeTransition) return
    this.clearSnap()
    this.markInput()
    this.target = clamp(
      this.target - deltaPx * V.nav.dragStepPerPx,
      -V.nav.overshoot,
      this.count - 1 + V.nav.overshoot
    )
    this.emit()
  }

  setDragging(on: boolean) {
    this._dragging = on
    this.emit()
  }

  /**
   * 一次拖拽结束。参考站 onMouseUp：触摸、且按下时间 < 400ms、且位移 > 30px → 轻扫换一格，
   * 补间 0.3s power2.out；否则交给自动吸附。
   */
  endDrag(totalPx: number, durationMs: number) {
    this.setDragging(false)
    const isTouchFlick = durationMs < V.nav.flickMaxMs && Math.abs(totalPx) > V.nav.flickMinPx
    if (isTouchFlick && !this._routeTransition) {
      this.step(totalPx < 0 ? 1 : -1, V.nav.snapFlickDuration, 'power2.out')
      return
    }
    // 不构成轻扫：直接吸到最近一格
    const nearest = this.nearestIndex()
    if (Math.abs(this.current - nearest) > V.nav.snapMinDistance) {
      this.snap(nearest, V.nav.snapAutoDuration, V.nav.snapAutoEase)
    }
  }

  /** 前进一步 / 后退一步（按钮与键盘）。参考站 next()/prev() = snap(i, 0.4, 'cubic.out') */
  step(dir: 1 | -1, duration = V.nav.snapStepDuration, ease = V.nav.snapStepEase): boolean {
    if (this._routeTransition) return false
    const base = this._snapping || this.snapTween ? this.targetNav : Math.round(clamp(this.target, 0, this.count - 1))
    const next = clamp(base + dir, 0, this.count - 1)
    if (next === base && Math.abs(this.current - base) < 0.001) return false
    this.targetNav = next
    this.snap(next, duration, ease)
    return true
  }

  /** 直接跳到某一格（点进度点 / 点邻封 / 刷新路由）。参考站 clickSnap = 0.6s cubic.out */
  jumpTo(index: number, opts: { force?: boolean } = {}) {
    if (this._routeTransition && !opts.force) return
    const next = clamp(Math.round(index), 0, this.count - 1)
    this.targetNav = next
    this.snap(next, V.nav.snapGoToDuration, V.nav.snapGoToEase)
  }

  /** 不做补间，立刻落到某一格（返回列表时对齐位置用） */
  snapInstant(index: number) {
    this.clearSnap()
    const v = clamp(index, 0, this.count - 1)
    this.target = v
    this.current = v
    this.targetNav = Math.round(v)
    this.vel = 0
    this.velSamples.length = 0
    this.velPrevT = 0
    this.velPrevV = 0
    this.posVel.v = 0
    this.targetVel.v = 0
    this.lastInputAt = performance.now()
    this.emit()
  }

  /* ------------------------------------------------------------ 每帧推进 */
  update(nowMs: number) {
    // 夹到 100ms：低帧率设备上 dt 过大时会跳格；60fps 下 dt≈16.7ms，完全不受影响
    const dtMs = this.lastTime === 0 ? 16.7 : Math.min(100, nowMs - this.lastTime)
    this.lastTime = nowMs

    /* 越界：不硬 clamp，用 smoothTime = 40ms 阻尼顶回（参考站写法），所以有"顶住"的手感 */
    const lo = 0
    const hi = this.count - 1
    if (this.target < lo) {
      this.target = smoothDamp(this.target, lo, this.targetVel, V.nav.edgeSmoothTime, dtMs)
    } else if (this.target > hi) {
      this.target = smoothDamp(this.target, hi, this.targetVel, V.nav.edgeSmoothTime, dtMs)
    } else {
      this.targetVel.v = 0
    }

    /* 渲染位置跟随目标位置：二阶临界阻尼。拖动时用更长的 smoothTime，所以更"跟手" */
    if (!this._snapping && !this.snapTween) {
      const st = this._dragging ? V.nav.smoothTimeDragging : V.nav.smoothTime
      this.current = smoothDamp(this.current, this.target, this.posVel, st, dtMs)
      if (Math.abs(this.target - this.current) < 0.0005) {
        this.current = this.target
        this.posVel.v = 0
      }
    }

    /*
     * 速度：用「上一帧末 → 本帧末」的位移算（参考站 VelocityTracker 的等价实现）。
     * 这样不管是我的阻尼在移动 current，还是 GSAP 吸附补间在移动它，都能测到 ——
     * 参考站也是这么做的（它测的是 currentX，不关心谁推动的）。
     */
    if (this.velPrevT !== 0) {
      const sdt = nowMs - this.velPrevT
      if (sdt > 0) {
        let raw = ((this.current - this.velPrevV) / sdt) * 1000
        if (!Number.isFinite(raw)) raw = 0
        raw = clamp(raw, -V.nav.maxVelocity, V.nav.maxVelocity)
        this.velSamples.push({ t: nowMs, v: raw })
        const cutoff = nowMs - V.nav.velocityWindowMs
        while (this.velSamples.length > 1 && this.velSamples[0].t < cutoff) this.velSamples.shift()
        this.vel = this.velSamples.reduce((a, s) => a + s.v, 0) / Math.max(1, this.velSamples.length)
      }
    }
    this.velPrevT = nowMs
    this.velPrevV = this.current

    /*
     * 停稳后吸附到最近一格。
     *
     * 参考站的判定是 `|渲染速度| < 0.1 && 偏离最近一格 > 0.01`。但那个条件在低帧率、
     * 或事件间隔较大的时候会在两次滚轮事件之间就被满足 —— 于是每次事件刚累加的位移
     * 立刻被吸回去，"连续滚轮能累加位移"这件事就发生了（实测：单次 120 不动、五次 120
     * 能走一格，靠的就是累加不能被反复吸掉）。
     *
     * 所以这里加一个**输入静默期**：最后一次输入之后snapQuietMs 毫秒内不吸附。
     * 语义上仍然是"手势停下来之后吸到最近一格"，但不依赖渲染速度在帧间是否恰好低于阈值，
     * 因此与帧率无关。
     */
    if (!this.suppressSnap && !this._snapping && !this.snapTween && !this._routeTransition && !this._dragging) {
      const quiet = nowMs - this.lastInputAt >= V.nav.snapQuietMs
      const nearest = this.nearestIndex()
      const dist = Math.abs(this.current - nearest)
      if (quiet && Math.abs(this.vel) < V.nav.snapVelocityThreshold && dist > V.nav.snapMinDistance) {
        this.snap(nearest, V.nav.snapAutoDuration, V.nav.snapAutoEase)
      }
    }

    if (this.current === this.target) {
      this.memoryIndex = this.selectedIndex
      this.memoryTarget = this.target
    }

    this.emit()
  }

  /** 供外部渲染循环读取的"热"值——不触发 React 更新 */
  read() {
    return {
      current: this.current,
      target: this.target,
      velocity: this.getVelocity(),
      selectedIndex: this.selectedIndex,
      count: this.count,
    }
  }

  /* ------------------------------------------------------------ 验收用调试面 */

  debugPinVelocity(v: number | null) {
    this.pinnedVel = v
  }

  /** 直接把位置设到某个值（不经过补间），用于逐点采样半格连续性 */
  debugSetPosition(v: number) {
    this.snapInstant(clamp(v, 0, this.count - 1))
    this.lastTime = 0
  }

  /** 验收专用：抑制/恢复自动吸附（见 suppressSnap 的注释） */
  debugSuppressSnap(on: boolean) {
    this.suppressSnap = on
    if (on) this.clearSnap()
    this.emit()
  }

  /** 读回内部量，验收脚本用 */
  debugReadNav() {
    return {
      target: this.target,
      current: this.current,
      vel: this.vel,
      velocityAvg: this.vel,
      targetNav: this.targetNav,
      snapping: this._snapping,
      dragging: this._dragging,
      nearest: this.nearestIndex(),
      velSamples: this.velSamples.slice(-6),
    }
  }

  /* ------------------------------------------------------------ 转场 */
  setRouteTransition(on: boolean, dir: 1 | -1 | 0 = 0) {
    this._routeTransition = on
    this._transitionDir = on ? dir : 0
    if (on) this.clearSnap()
    this.emit()
  }

  /* ------------------------------------------------------------ 播放 */
  setPlayback(state: PlaybackState, index = -1) {
    this._playback = state
    this._playbackIndex = index
    this.emit()
  }

  /* ------------------------------------------------------------ 记忆 */
  private static readonly LS_KEY = 'portfolio:last-work'

  setStorageScope(scope: string) {
    this.storageScope = scope
  }

  private get storageKey() {
    return `${WorksNavigator.LS_KEY}:${this.storageScope}`
  }

  remember() {
    this.memoryIndex = this.selectedIndex
    this.memoryTarget = this.target
    try {
      window.localStorage?.setItem(this.storageKey, String(this.selectedIndex))
    } catch {
      /* 隐私模式下不可写，忽略 */
    }
  }

  /** 从 localStorage 恢复上次看的那一件（参考站用的就是 localStorage['last-chapter']） */
  restoreFromStorage(): number | null {
    try {
      const raw = window.localStorage?.getItem(this.storageKey)
      if (raw == null) return null
      const i = parseInt(raw, 10)
      if (!Number.isFinite(i)) return null
      const v = clamp(i, 0, this.count - 1)
      this.memoryIndex = v
      this.memoryTarget = v
      return v
    } catch {
      return null
    }
  }

  restore(opts: { instant?: boolean } = {}) {
    this.clearSnap()
    this.target = clamp(this.memoryTarget, 0, this.count - 1)
    if (opts.instant) this.current = this.target
    this.posVel.v = 0
    this.targetVel.v = 0
    this.emit()
  }

  getMemory() {
    return { index: this.memoryIndex, target: this.memoryTarget }
  }

  reset() {
    this.snapInstant(0)
    this.lastTime = 0
  }
}

export const navigator = new WorksNavigator()

/**
 * 调试钩子：把控制器挂到 window，方便在控制台核对状态
 * （`__nav.getSnapshot()` / `__nav.getCurrent()` / `__nav.getVelocity()`）。
 * 体积很小，生产环境也保留，这样线上验收时可以直接读数。
 */
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__nav = navigator
}
