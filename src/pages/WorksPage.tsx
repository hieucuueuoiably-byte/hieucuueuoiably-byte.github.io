import { useEffect, useState } from 'react'
import type { Work } from '../data/works'
import { WORK_CATEGORIES, getCategory, type WorkCategoryId } from '../data/categories'
import { useNav } from '../state/useNav'
import { StaticWorks } from '../components/StaticWorks'
import { InlineWorkVideo } from '../components/InlineWorkVideo'
import { CardTargets } from '../components/CardTargets'
import { WorkMaterials } from '../components/MaterialGallery'

interface WorksPageProps {
  works: Work[]
  category: WorkCategoryId
  onCategory: (id: WorkCategoryId) => void
  webgl: boolean
  onEnter: (index: number) => void
  onJump: (index: number) => void
  reducedMotion: boolean
}

/**
 * 作品浏览页。
 *
 * 这里几乎没有视觉元素 —— 中央大海报、左右露出的邻封、背景有机色块全部由 WebGL 画
 * （提示词要求「不要将文字、按钮或视频全部画进 Canvas」）。
 * DOM 负责可访问的作品清单、标题朗读、随立体卡片轮廓移动的点击目标和进度点。
 * 底部胶囊控制条挂在 App 上，是跨路由共享的同一个元素。
 */
export function WorksPage({ works, category, onCategory, webgl, onEnter, onJump }: WorksPageProps) {
  const nav = useNav()
  const index = nav.selectedIndex
  const work = works[index]
  const isRoot = category === 'all'
  const collection = getCategory(category)
  const settled = !nav.routeTransition && !nav.dragging && !nav.snapping && Math.abs(nav.currentPosition - index) < 0.025
  const [announce, setAnnounce] = useState('')

  /* 切换后把"当前作品 + 播放入口"同步给屏幕阅读器（视觉状态、标题、入口三者同步） */
  useEffect(() => {
    if (!work) return
    const t = window.setTimeout(
      () =>
        setAnnounce(
          isRoot ? `当前分类：${work.title}，${work.description}` : `当前作品：${work.no}. ${work.title}，分类 ${work.category}，时长 ${work.duration || '待填写'}，本分类共 ${works.length} 个视频`
        ),
      220
    )
    return () => window.clearTimeout(t)
  }, [index, work, isRoot, works.length])

  return (
    <div className="page works-page" data-category={category}>
      <div className="works__edition" data-stage-layer="caption">
        <span>{isRoot ? '作品分类' : collection.label}</span>
        <span>{isRoot ? 'VIDEO COLLECTIONS' : `${works.length} SELECTED FILMS`}</span>
      </div>
      {!isRoot ? <div className="works__breadcrumb"><button type="button" onClick={() => onCategory('all')}>← 返回分类</button><span aria-hidden="true"> / </span><strong>{collection.label}</strong></div> : null}
      <div className="works__counter" data-stage-layer="counter">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <span className="works__counter-line" />
        <span>{String(works.length).padStart(2, '0')}</span>
      </div>
      {/* 屏幕阅读器可读的完整作品清单 */}
      <ul className="sr-only" aria-label={isRoot ? '分类清单' : '作品清单'}>
        {works.map((w, i) => (
          <li key={w.id}>
            <a
              href={isRoot ? WORK_CATEGORIES[i + 1].path : `/works/${w.slug}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault()
                onEnter(i)
              }}
            >
              {w.no}. {w.title} — {w.category}
            </a>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {!isRoot && !works.length ? <div className="works__empty"><h1>暂时没有上架作品</h1><button type="button" onClick={() => onCategory('all')}>返回作品分类</button></div> : null}

      {webgl || !isRoot ? (
        <>
          {webgl ? <CardTargets works={works} index={index} isRoot={isRoot} onEnter={onEnter} onJump={onJump} /> : null}
          {!isRoot && work ? <InlineWorkVideo work={work} settled={settled} /> : null}
          {!isRoot && work && (work.materials?.length || work.screenshots?.length) ? <WorkMaterials work={work} disabled={!settled} /> : null}
          {isRoot && work ? <div className="works__collection-label" aria-hidden="true"><strong>{work.title}</strong><span>{work.description}</span></div> : null}

          {/* 进度点：点击直达某件作品 */}
          <div className="works__dots" role="tablist" aria-label={isRoot ? '选择分类' : '选择作品'}>
            {works.map((w, i) => (
              <button
                key={w.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${w.no}. ${w.title}`}
                className={`works__dot${i === index ? ' is-active' : ''}`}
                onClick={() => onJump(i)}
              />
            ))}
          </div>
          <p className="works__gesture" data-stage-layer="hint">{isRoot ? '选择分类 → 查看视频' : '滚动探索 ↔ 点击播放'}</p>
        </>
      ) : (
        <StaticWorks works={works} onEnter={onEnter} onJump={onJump} />
      )}
    </div>
  )
}
