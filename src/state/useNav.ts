import { useEffect, useRef, useSyncExternalStore } from 'react'
import { navigator, type NavSnapshot } from './navController'
import { V } from '../config/motion'

/** 订阅控制器快照。只有"对外可见量"变化时才重渲染 */
export function useNav(): NavSnapshot {
  return useSyncExternalStore(navigator.subscribe, navigator.getSnapshot, navigator.getSnapshot)
}

/** prefers-reduced-motion（首次渲染就能拿到值，不走 effect） */
export function usePrefersReducedMotion(): boolean {
  const ref = useRef(false)
  if (typeof window !== 'undefined' && window.matchMedia) {
    ref.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  return ref.current
}

export function useReducedMotion() {
  return usePrefersReducedMotion()
}

export type KeyboardScope = 'works' | 'player' | 'none'

interface InputOptions {
  /** 是否接管输入（转场中或非作品页时关掉） */
  enabled: boolean
  /** 竖向/横向滚轮是否都算横移 */
  wheel: boolean
  /** 触屏横滑 + 鼠标按住拖 */
  drag: boolean
  /**
   * 键盘作用域。
   *
   * - `works`：作品浏览页。拦截方向键 / PageUp·PageDown / Home·End / a·d·q —— 这一页
   *   本身不可滚动（`body.is-locked`），拦截不会抢掉任何原生滚动。
   * - `player`：详情页。**只**处理 ←/→（切作品）。↑/↓、PageUp/PageDown、Home/End
   *   一律放行；播放进度条继续独立处理键盘。
   * - `none`：关于页等纯内容页，完全不碰键盘。
   */
  keyboard: KeyboardScope
  /** `player` 作用域下 ←/→ 要做的事（必须切路由，让视频和标题一起同步） */
  onStepWork?: (dir: 1 | -1) => void
  /** 内容区自身可滚动时，只有滚到边界才接管 */
  inner?: HTMLElement | null
}

/**
 * 把滚轮、触屏横滑、鼠标拖拽、键盘统一路由到 navigator。
 *
 * 机制按参考站的实现来：
 *   · 滚轮 **不设阈值**，每个事件按 (deltaY + deltaX) 累加进目标位置；
 *     「一次手势一格」的观感来自"停稳后吸附到最近一格"，不是输入过滤。
 *   · 拖拽实时改目标位置（1:1 跟手），抬手时若构成轻扫则换一格（0.3s power2.out）。
 *   · 键盘映射照参考站：ArrowDown/ArrowLeft/a/q = 上一格，ArrowUp/ArrowRight/d = 下一格。
 *
 * 前后按钮不经过这里 —— 它们直接调 navigator.step()，共用同一个控制器。
 */
export function useWorksInput({ enabled, wheel, drag, keyboard, onStepWork, inner }: InputOptions) {
  useEffect(() => {
    if (!enabled) return
    const el: HTMLElement | Window = inner ?? window

    /* ---------------- 滚轮 ---------------- */
    const onWheel = (e: WheelEvent) => {
      if (!wheel) return
      // 只接管作品浏览区域：可滚动内容滚到边界后仍然把事件留给页面
      if (inner) {
        const atTop = inner.scrollTop <= 0
        const atBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1
        if (!(atTop && e.deltaY < 0) && !(atBottom && e.deltaY > 0)) return
      }
      e.preventDefault()
      // 参考站是把 deltaY 和 deltaX 相加，不做"取较大者"的筛选
      navigator.feedWheel(e.deltaY, e.deltaX)
    }

    /* ---------------- 触屏 / 指针拖拽 ---------------- */
    let dragActive = false
    let locked: 'x' | 'y' | null = null
    let lastX = 0
    let startX = 0
    let startY = 0
    let startTime = 0
    let stopPointerDrag: (() => void) | null = null

    const beginDrag = (x: number, y: number) => {
      dragActive = true
      locked = null
      lastX = x
      startX = x
      startY = y
      startTime = performance.now()
      navigator.setDragging(true)
    }

    const moveDrag = (x: number, y: number, preventDefault?: () => void) => {
      if (!dragActive) return
      const dx = x - lastX
      const totalX = x - startX
      if (!locked) {
        if (Math.abs(totalX) < 6 && Math.abs(y - startY) < 6) return
        // 横向意图优先，纵向留给页面滚动
        locked = Math.abs(totalX) >= Math.abs(y - startY) ? 'x' : 'y'
      }
      if (locked !== 'x') return
      preventDefault?.()
      navigator.feedDrag(dx)
      lastX = x
    }

    const endDrag = (x: number, cancelled = false) => {
      if (!dragActive) return
      const horizontal = locked === 'x'
      dragActive = false
      locked = null
      if (horizontal && !cancelled) navigator.endDrag(x - startX, performance.now() - startTime)
      else navigator.setDragging(false)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (!drag || e.touches.length !== 1) return
      if ((e.target as HTMLElement | null)?.closest('button, a, input, select, textarea, video, [role="slider"]')) return
      beginDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!drag || !dragActive || e.touches.length !== 1) return
      moveDrag(e.touches[0].clientX, e.touches[0].clientY, () => e.preventDefault())
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!drag || !dragActive) return
      const t = e.changedTouches[0]
      endDrag(t ? t.clientX : lastX)
    }
    const onTouchCancel = () => endDrag(lastX, true)

    const onPointerDown = (e: PointerEvent) => {
      if (!drag || e.pointerType === 'touch') return // 触摸走 touch 分支，避免重复
      if (e.button !== 0) return
      const t = e.target as HTMLElement | null
      // 按钮、链接、视频控件上不要抢
      if (t?.closest('button, a, input, select, textarea, video, [role="slider"]')) return
      beginDrag(e.clientX, e.clientY)
      // 用 window 上的 move/up，拖出元素也不会丢
      const onMove = (ev: PointerEvent) => moveDrag(ev.clientX, ev.clientY)
      const onUp = (ev: PointerEvent) => {
        stopPointerDrag?.()
        endDrag(ev.clientX, ev.type === 'pointercancel')
      }
      stopPointerDrag = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        stopPointerDrag = null
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    /* ---------------- 键盘 ---------------- */
    /** 事件来自可交互控件或正在编辑的输入框时，一律不接管 */
    const shouldIgnoreKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return false
      // 正在编辑：绝不抢键
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return true
      // 播放进度条自己处理 ←/→（调进度），全局不要再抢
      if (t.closest?.('[role="slider"]')) return true
      // 视频元素（含原生控件）交给它自己
      if (t.closest?.('video')) return true
      // 注意：**不排除 button/a**。否则"点过一次切换按钮之后方向键就失效"，
      // 因为焦点留在了按钮上。按钮本身不用方向键，所以接管没有冲突。
      return false
    }

    const onKey = (e: KeyboardEvent) => {
      if (keyboard === 'none') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (shouldIgnoreKey(e)) return

      const k = e.key
      const lower = k.length === 1 ? k.toLowerCase() : ''

      if (keyboard === 'player') {
        /*
         * 详情页只做"左右切作品"，而且必须走路由（App 传进来的 onStepWork 会触发
         * 纸张横移），这样作品下标、视频源、标题、控制条会一起同步。
         * ↑/↓、PageUp/PageDown、Home/End、空格一律放行 → 浏览器与视频控件照常。
         */
        if (k === 'ArrowLeft') {
          e.preventDefault()
          onStepWork?.(-1)
        } else if (k === 'ArrowRight') {
          e.preventDefault()
          onStepWork?.(1)
        }
        return
      }

      // keyboard === 'works'：这一页不可滚动，可以放心拦截
      // 映射照参考站 onKeyUp：ArrowDown/ArrowLeft/a/q = 上一格；ArrowUp/ArrowRight/d = 下一格
      if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageUp' || lower === 'a' || lower === 'q') {
        e.preventDefault()
        navigator.step(-1)
      } else if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageDown' || lower === 'd') {
        e.preventDefault()
        navigator.step(1)
      } else if (k === 'Home') {
        e.preventDefault()
        navigator.jumpTo(0)
      } else if (k === 'End') {
        e.preventDefault()
        navigator.jumpTo(navigator.read().count - 1)
      }
    }

    el.addEventListener('wheel', onWheel as EventListener, { passive: false })
    el.addEventListener('touchstart', onTouchStart as EventListener, { passive: true })
    el.addEventListener('touchmove', onTouchMove as EventListener, { passive: false })
    el.addEventListener('touchend', onTouchEnd as EventListener)
    el.addEventListener('touchcancel', onTouchCancel as EventListener)
    if (drag) window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)

    return () => {
      el.removeEventListener('wheel', onWheel as EventListener)
      el.removeEventListener('touchstart', onTouchStart as EventListener)
      el.removeEventListener('touchmove', onTouchMove as EventListener)
      el.removeEventListener('touchend', onTouchEnd as EventListener)
      el.removeEventListener('touchcancel', onTouchCancel as EventListener)
      stopPointerDrag?.()
      if (drag) window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
      navigator.setDragging(false)
    }
  }, [enabled, wheel, drag, keyboard, inner, onStepWork])
}

/**
 * 快捷键提示用（必须和上面的映射一致）。
 * 注意方向：参考站是 ArrowDown / ArrowLeft = 上一格，ArrowUp / ArrowRight = 下一格 ——
 * 与"往下滚看下一件"的直觉相反，但这是参考站的实际映射，照抄。
 */
export const KEY_HINT = {
  prev: ['↓', '←'],
  next: ['↑', '→'],
  wheelPxPerStep: V.nav.wheelDeltaPerStep,
}
