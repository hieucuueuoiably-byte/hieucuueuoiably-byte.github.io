import { useLocation } from 'react-router-dom'
import { SiteWordmark } from './SiteWordmark'
import '../styles/categories.css'
import '../styles/site-header.css'

interface HeaderProps {
  navColor: 'ink' | 'cream'
  /** 首页上颜色过渡延后 600ms（参考站 E03） */
  delay: boolean
  reducedMotion: boolean
  onHome: () => void
  onWorks: () => void
  onAbout: () => void
}

/**
 * 顶栏。
 *
 * 关键点（提示词 M01）：转场时**它不参与进出**，只换颜色 —— 所以这里没有任何
 * data-stage-layer，转场时间轴也不会碰它。颜色由 CSS transition 负责，
 * 并且在首页上加 600ms 的延迟，等遮挡层盖住画面之后才翻色，避免看到"中途变色"。
 */
export function Header({ navColor, delay, reducedMotion, onHome, onWorks, onAbout }: HeaderProps) {
  const { pathname } = useLocation()
  const worksActive = pathname === '/works' || pathname.startsWith('/works/')
  const aboutActive = pathname.startsWith('/about')
  return (
    <header className="app-header app-header--unified" data-nav-color={navColor} data-delay={delay ? 'true' : 'false'}
      onWheel={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}>
      <nav className="app-header__links" aria-label="主导航">
        <div className="app-header__works-group">
        <a
          className={`app-header__link app-header__link--works${worksActive ? ' is-active' : ''}`}
          href="/works"
          aria-current={worksActive ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault()
            onWorks()
          }}
        >
          <span className="app-header__link-text">作品</span>
        </a>
        </div>
        <SiteWordmark reducedMotion={reducedMotion} onHome={onHome} />
        <a
          className={`app-header__link app-header__link--about${aboutActive ? ' is-active' : ''}`}
          href="/about"
          aria-current={aboutActive ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault()
            onAbout()
          }}
        >
          <span className="app-header__link-text">关于</span>
        </a>
      </nav>
    </header>
  )
}
