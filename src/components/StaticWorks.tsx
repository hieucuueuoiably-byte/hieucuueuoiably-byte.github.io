import type { Work } from '../data/works'
import { useNav } from '../state/useNav'
import { V } from '../config/motion'

/**
 * WebGL 不可用时的静态浏览版。
 *
 * 提示词要求「WebGL 不可用时提供可浏览的静态版本」，所以这里用 DOM 卡片把同一套浏览
 * 逻辑重做一遍：滚轮/键盘/触屏仍然走同一个 navigator，进入详情、返回、边界 clamp
 * 全部照旧；版式也尽量对齐 WebGL 那套风扇布局（中央 1.0 / 邻封 0.54、偏移 0.84、
 * 旋转 ±9°，都来自参考站实测 E13）。差别只在没有封面顶点弯曲和背景色块。
 */
export function StaticWorks({ works, onEnter, onJump }: { works: Work[]; onEnter: (index: number) => void; onJump: (index:number)=>void }) {
  const nav = useNav()
  const index = nav.selectedIndex

  return (
    <div className="static-works">
      {works.map((w, i) => {
        const diff = i - index
        const ad = Math.abs(diff)
        if (ad > 2) return null
        const isActive = diff === 0
        const rot = isActive ? 0 : diff > 0 ? 9 : -9
        const sc = ad === 0 ? 1 : ad === 1 ? V.cover.neighborScale : 0.38
        return (
          <button
            key={w.id}
            type="button"
            className={`static-works__card${isActive ? ' is-active' : ''}`}
            style={
              {
                ['--k' as string]: diff,
                ['--rot' as string]: `${rot}deg`,
                ['--sc' as string]: sc,
                zIndex: 10 - ad,
                pointerEvents: 'auto',
              } as React.CSSProperties
            }
            onClick={() => isActive?onEnter(i):onJump(i)}
            aria-label={`${isActive?'进入':'选择'}：${w.no}. ${w.title}`}
            aria-current={isActive ? 'true' : undefined}
          >
            <img src={w.cover} alt="" loading="lazy" />
          </button>
        )
      })}
      <span className="static-works__badge">
        静态浏览版 · 第 {index + 1} / {works.length} 件
      </span>
    </div>
  )
}
