/** 环境能力探测：减少动态效果、WebGL、触屏、桌面 hover */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

export function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    const gl =
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      (c.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return false
    if (typeof (gl as WebGLRenderingContext).createProgram !== 'function') return false
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}

/** 在运行时监听这两个媒体查询的变化 */
export function watchEnv(cb: (env: { reducedMotion: boolean; touch: boolean }) => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
  const t = window.matchMedia('(hover: none), (pointer: coarse)')
  const fire = () => cb({ reducedMotion: rm.matches, touch: t.matches })
  fire()
  rm.addEventListener?.('change', fire)
  t.addEventListener?.('change', fire)
  return () => {
    rm.removeEventListener?.('change', fire)
    t.removeEventListener?.('change', fire)
  }
}

/**
 * 验收用调试面（和 `window.__nav` 一样，生产环境也保留）。
 *
 * 页面里把当前场景实例挂到这里，验收脚本才能
 * ① 冻结着色器时间后做像素级 A/B 对比；
 * ② 读回真正的 uniform 值（而不是控制器里的意图值）。
 */
export function exposeSceneForVerification(scene: unknown) {
  if (typeof window === 'undefined') return
  ;(window as unknown as Record<string, unknown>).__scene = scene
}
