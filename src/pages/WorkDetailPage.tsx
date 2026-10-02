import { useEffect, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { WORKS, aspectRatioNumber, findWorkIndexBySlug } from '../data/works'
import { getCategory, type WorkCategoryId } from '../data/categories'
import { navigator } from '../state/navController'
import { useNav } from '../state/useNav'
import { video } from '../state/videoController'
import { PlayIcon } from '../components/icons'

interface WorkDetailPageProps {
  /** 返回作品列表（恢复之前选中的作品与位置） */
  onBack: () => void
  /** 直接进入某一件作品（上一件 / 下一件） */
  onEnterIndex: (index: number) => void
  reduction: boolean
  category: WorkCategoryId
  previousIndex: number
  nextIndex: number
}

/**
 * 作品详情页。
 *
 * M05 的落点在 WebGL 那边（当前海报接续到播放舞台），这里负责舞台本身：
 *  - 视频按真实比例显示（16:9 / 9:16 / 1:1 / 21:9 都支持），方形只用于封面
 *  - 没有视频时明确显示「视频待添加」，不用假素材顶替
 *  - 页面内容正常滚动（不接管滚轮），作品浏览区域才接管
 */
export function WorkDetailPage({ onBack, onEnterIndex, category, previousIndex, nextIndex }: WorkDetailPageProps) {
  const { slug } = useParams()
  const nav = useNav()
  const videoRef = useRef<HTMLVideoElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const index = findWorkIndexBySlug(slug)
  const work = index >= 0 ? WORKS[index] : undefined
  const playable = !!work?.video

  /**
   * 顺序很关键，写反了就会出现「第一个视频点不动」。
   *
   * React 在 commit 阶段就把新的 `src` 写到 DOM 上了，之后才跑 effect。
   * 所以：
   *   1) 先 resetFor()：只 pause + 回到 0，**不碰 src**（src 归 React 管）；
   *   2) 后 register()：此时元素上的 src 已经是当前作品的。
   *
   * 另外 register 这个 effect 的依赖只有 `playable`（元素是否存在于 DOM），
   * **不含 slug** —— 元素复用时保留监听，src始终由React管理。
   */
  useEffect(() => {
    if (index < 0) return
    video.resetFor(index, playable)
    window.scrollTo({ top: 0 })
  }, [index, playable])

  useEffect(() => {
    if (!playable) return
    const el = videoRef.current
    video.register(el)
    return () => video.unregister(el)
  }, [playable])

  /* 离开详情页：停止播放并清掉状态 */
  useEffect(() => {
    return () => {
      navigator.setPlayback('idle', -1)
    }
  }, [])

  const prevIndex = previousIndex
  const hasPrev = prevIndex >= 0
  const hasNext = nextIndex >= 0 && nextIndex < WORKS.length

  const stageStyle = useMemo(
    () =>
      ({
        // --ar 给的是一个纯数字（如 1.7778），这样它能参与 calc()；
        // .detail__stage 的宽度公式靠它才能在竖屏视频时算出"高而窄"的舞台
        ['--ar' as string]: String(aspectRatioNumber(work?.videoAspect ?? '16 / 9')),
        ['--ar-frac' as string]: (work?.videoAspect ?? '16 / 9').replace(/\s/g, ''),
      }) as React.CSSProperties,
    [work?.videoAspect]
  )

  if (!work) {
    return (
      <div className="page page--scroll">
        <div className="detail" data-stage-layer ref={scrollRef}>
          <div className="detail__inner detail__body">
            <span className="detail__no">404</span>
            <h1 className="detail__title">找不到这件作品</h1>
            <p className="detail__text">链接里的作品标识不在数据里。回到列表重新挑一件。</p>
            <div className="detail__next">
              <button type="button" onClick={onBack}>
                返回作品列表
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--scroll">
      <div className="detail" ref={scrollRef} data-stage-layer>
        {/* 测试片横幅：fixed 定位，不参与布局 —— 免得把播放舞台推到和 WebGL 接续落点不一致的位置 */}
        {work.videoIsTestClip ? (
          <p className="detail__testclip" role="note">
            <strong>测试片</strong>
            当前播放的是用于验证播放链路的测试片段（画面带时间码与帧号，音轨是低音量正弦波），
            <b>不是作品内容</b>。换自己的片子：视频放进 <code>public/videos/</code>，
            改 <code>src/data/works.ts</code> 的 <code>video</code> / <code>videoAspect</code>，并删掉{' '}
            <code>videoIsTestClip</code>。
          </p>
        ) : null}

        <div className="detail__inner">
          {/* ---------------- 播放舞台：和 WebGL 里封面接续过来的那个矩形位置一致 ---------------- */}
          <div className="detail__hero" ref={heroRef}>
            <div className="detail__stage" style={stageStyle}>
              <div
                className="detail__stage-inner"
                style={{ aspectRatio: String(aspectRatioNumber(work.videoAspect)) }}
              >
                {playable ? (
                  <>
                    <video
                      ref={videoRef}
                      className="detail__video"
                      src={work.video}
                      poster={work.poster}
                      style={{ aspectRatio: String(aspectRatioNumber(work.videoAspect)), height: '100%' }}
                      playsInline
                      preload="metadata"
                      controls={false}
                      aria-label={`${work.title} 视频`}
                      onClick={() => { if (!videoRef.current?.paused) video.pause() }}
                      onDoubleClick={() => { void videoRef.current?.requestFullscreen?.().catch(() => {}) }}
                    />
                    {nav.playbackState !== 'playing' ? (
                      <button
                        type="button"
                        className="detail__play-overlay"
                        onClick={() => video.play()}
                        aria-label={`播放：${work.title}`}
                      >
                        <PlayIcon />
                      </button>
                    ) : null}
                    {nav.playbackState === 'error' ? (
                      <p role="alert" className="detail__video-error">
                        视频暂时无法加载。
                        <button type="button" onClick={() => videoRef.current?.load()}>重新加载</button>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="detail__missing" role="status">
                    <strong>视频待添加</strong>
                    <span>
                      这件作品还没有对应的视频文件。把视频放到 <code>public/videos/</code> 下，
                      然后在 <code>src/data/works.ts</code> 里把 <code>video</code> 字段填上路径即可。
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---------------- 作品信息 ---------------- */}
          <div className="detail__body" data-stage-layer>
            <nav className="detail__breadcrumb" aria-label="当前位置"><Link to="/works">作品分类</Link><span aria-hidden="true"> / </span><Link to={getCategory(category).path} onClick={(e) => { e.preventDefault(); onBack() }}>{getCategory(category).label}</Link><span aria-hidden="true"> / </span><span>{work.title}</span></nav>
            <span className="detail__no">
              {work.no} — 作品
              {work.isPlaceholder ? ' · 内容为占位文本' : ''}
            </span>
            <h1 className="detail__title">{work.title}</h1>

            <ul className="detail__facts">
              <li className="detail__fact">{work.category}</li>
              <li className="detail__fact">时长 {work.duration || '待填写'}</li>
              <li className="detail__fact">比例 {work.videoAspect.replace(/\s/g, '')}</li>
              <li className="detail__fact">{playable ? '可播放' : '视频待添加'}</li>
            </ul>

            <div className="detail__cols">
              <div>
                <h2 className="detail__h2">作品简介</h2>
                <p className="detail__text">{work.longDescription || work.description}</p>
                {work.tags.length ? (
                  <ul className="detail__facts" style={{ marginTop: 18 }}>
                    {work.tags.map((t) => (
                      <li className="detail__fact" key={t}>
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {work.role.length > 0 ? <div>
                <h2 className="detail__h2">个人职责</h2>
                <ul className="detail__roles">
                  {work.role.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div> : null}
            </div>

            {work.process.length > 0 ? <><h2 className="detail__h2" style={{ marginTop: 'clamp(36px, 6vh, 64px)' }}>
              制作过程
            </h2>
            <ol className="detail__process">
              {work.process.map((s, i) => (
                <li className="detail__step" key={s.step}>
                  <span className="detail__step-name">
                    {String(i + 1).padStart(2, '0')} / {s.step}
                  </span>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol></> : null}

            {work.isPlaceholder ? (
              <p className="detail__notice">
                说明：这件作品的标题、简介、职责和制作过程目前都是<b>占位文本</b>，只用于演示版式与动效，
                不代表真实履历；时长也留空了。替换方式见项目根目录 README 的「素材替换」。
              </p>
            ) : null}

            <div className="detail__next">
              <button type="button" onClick={onBack}>
                ← 返回作品列表
              </button>
              {hasPrev ? (
                <button type="button" onClick={() => onEnterIndex(prevIndex)}>
                  {WORKS[prevIndex].no}. {WORKS[prevIndex].title}
                </button>
              ) : null}
              {hasNext ? (
                <button type="button" onClick={() => onEnterIndex(nextIndex)}>
                  {WORKS[nextIndex].no}. {WORKS[nextIndex].title} →
                </button>
              ) : null}
            </div>

            <p className="detail__notice" style={{ marginTop: 22 }}>
              <Link to={getCategory(category).path} onClick={(e) => { e.preventDefault(); onBack() }}>
                返回列表
              </Link>
              {' 会回到你刚才选中的那一件和原来的位置。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
