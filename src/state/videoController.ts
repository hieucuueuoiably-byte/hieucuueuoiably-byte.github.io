import { navigator } from './navController'

/**
 * 视频播放控制器（单例）。
 *
 * DOM 里只允许有一个 video 元素真正在播放（提示词：「仅当前视频播放，离开即停止」），
 * 所以详情页把元素注册进来，控制条去操作它。
 *
 * 生命周期约定（这条约定不遵守就会出「首个视频点不动」的 bug）：
 *
 *   register(el)      绑定元素 + 挂监听。此时 `src` 必须**已经**由 React 写好。
 *   resetFor(...)     换作品时调用：只 pause + 回到 0，**绝不碰 src** ——
 *                     src 交给 React 的下一次渲染去改。以前这里会 removeAttribute('src')，
 *                     而它在 register 之后执行，于是刚注册的元素被清掉了 src，
 *                     首次点播放什么都不发生。
 *   unregister(el)    只暂停并解绑；StrictMode 重挂时仍保留 React 管理的 src。
 *
 * 时间轴进度用 rAF 直接读，不经过 React state —— 否则每秒会重渲染 60 次。
 */
class VideoController {
  private el: HTMLVideoElement | null = null
  private cleanupFns: (() => void) | null = null
  /** 监听是否已挂。teardown 时必须一起复位，否则同一元素再次注册会挂不上监听 */
  private wired = false
  private startedPlayback = false
  private playAttempt = 0

  /* ------------------------------------------------------------ 注册 / 注销 */

  register(el: HTMLVideoElement | null) {
    if (!el) {
      this.teardown()
      return
    }
    // 换了元素：先把旧的收干净
    if (this.el && this.el !== el) this.teardown()
    this.el = el

    if (this.wired && this.cleanupFns) {
      // 同一元素重复注册（比如 slug 变了但 DOM 节点复用）：只做一次状态同步
      this.syncPlaybackState()
      return
    }

    const onPlay = () => { this.startedPlayback = true;this.syncPlaybackState() }
    const onPause = () => this.syncPlaybackState()
    const onWaiting = () => this.syncPlaybackState()
    const onCanPlay = () => this.syncPlaybackState()
    const onErr = () => this.syncPlaybackState()
    const onEnded = () => this.syncPlaybackState()
    const onTimeUpdate = () => this.syncPlaybackState()

    el.addEventListener('play', onPlay)
    el.addEventListener('playing', onCanPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('error', onErr)
    el.addEventListener('ended', onEnded)
    el.addEventListener('loadedmetadata', onCanPlay)
    el.addEventListener('seeking', onWaiting)
    el.addEventListener('seeked', onCanPlay)
    el.addEventListener('timeupdate', onTimeUpdate)

    this.cleanupFns = () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('playing', onCanPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('error', onErr)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('loadedmetadata', onCanPlay)
      el.removeEventListener('seeking', onWaiting)
      el.removeEventListener('seeked', onCanPlay)
      el.removeEventListener('timeupdate', onTimeUpdate)
    }
    this.wired = true
    this.syncPlaybackState()
  }

  unregister(el?: HTMLVideoElement | null) {
    if (el && this.el !== el) return
    this.teardown()
  }

  /**
   * 解绑：摘监听、暂停播放、清空**控制器自己的**元素引用。
   *
   * ⚠️ 这里**绝对不要碰 `src`**。
   *
   * `<video src={...}>` 的 src 是 React 管的属性。React 18 的 StrictMode 在开发模式下会对
   * effect 执行 setup → cleanup → setup：
   *   1. setup   → register(el)
   *   2. cleanup → unregister(el) → 如果这里 `removeAttribute('src')`，属性就没了
   *   3. setup   → register(el) → 但 React 认为 src 这个 prop 没变，**不会**再写一遍
   * 结果开发模式下首次打开详情页，视频源是 null、点播放毫无反应。
   *
   * 元素的卸载由 React 负责：`<video>` 从 DOM 移除时浏览器会自己断开请求、释放解码器，
   * 所以这里只需要停播 + 解绑。
   */
  private teardown() {
    this.playAttempt += 1
    this.cleanupFns?.()
    this.cleanupFns = null
    this.wired = false
    const el = this.el
    if (el) {
      el.pause()
      try {
        el.currentTime = 0
      } catch {
        /* metadata 之前不允许 seek，忽略 */
      }
    }
    this.el = null
  }

  /** 兼容旧名字（外部已无调用，保留以防外部代码引用） */
  /** 把当前元素的实际状态同步到 navigator 的 playbackState */
  private syncPlaybackState() {
    const el = this.el
    const idx = this.indexHint()
    if (!el) {
      navigator.setPlayback('idle', -1)
      return
    }
    if (!el.getAttribute('src')) {
      navigator.setPlayback('missing', idx)
      return
    }
    if (el.error) {
      navigator.setPlayback('error', idx)
      return
    }
    if (el.seeking || (el.readyState < 3 && !el.paused)) {
      navigator.setPlayback('loading', idx)
      return
    }
    if (el.ended) {
      navigator.setPlayback('paused', idx)
      return
    }
    navigator.setPlayback(el.paused ? 'paused' : 'playing', idx)
  }

  private indexHint = () => navigator.getSnapshot().playbackIndex

  /* ------------------------------------------------------------ 查询 */

  get element() {
    return this.el
  }

  get hasVideo() {
    return !!this.el?.getAttribute('src')
  }

  get isPlaying() {
    return !!this.el && !this.el.paused && !this.el.ended
  }
  /** First playback is initiated by the visitor; later selected films can continue. */
  get hasStartedPlayback() { return this.startedPlayback }

  /* ------------------------------------------------------------ 操作 */

  play() {
    const el = this.el
    if (!el || !el.getAttribute('src')) {
      navigator.setPlayback(el ? 'missing' : 'idle', this.indexHint())
      return
    }
    const attempt = ++this.playAttempt
    const source = el.getAttribute('src')
    const p = el.play()
    if (p && typeof p.catch === 'function') {
      p.catch((error: DOMException) => {
        // A slide can pause or replace the video before play() resolves.
        if(this.el!==el||attempt!==this.playAttempt||el.getAttribute('src')!==source)return
        if(error.name==='AbortError')this.syncPlaybackState()
        else navigator.setPlayback(error.name==='NotAllowedError'?'paused':'error',this.indexHint())
      })
    }
  }

  continuePlayback() { if(this.startedPlayback)this.play() }

  pause() {
    this.playAttempt += 1
    this.el?.pause()
  }

  toggle() {
    if (!this.el) return
    if (this.el.paused) this.play()
    else this.pause()
  }

  seek(ratio: number) {
    const el = this.el
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
    el.currentTime = Math.min(el.duration, Math.max(0, ratio * el.duration))
  }

  /**
   * 换作品时调用：**只停住并归零，不动 src**。
   * src 由 React 的下一次渲染负责更新；顺序错了会导致新视频没有源。
   */
  resetFor(index: number, willHaveVideo: boolean) {
    this.playAttempt += 1
    const el = this.el
    if (el) {
      el.pause()
      try {
        el.currentTime = 0
      } catch {
        /* 有些源在 metadata 之前不允许 seek，忽略 */
      }
    }
    navigator.setPlayback(willHaveVideo ? 'loading' : 'missing', index)
  }

  /** 供控制条 rAF 直接读，不触发 React */
  read() {
    const el = this.el
    if (!el) return { t: 0, d: 0, ratio: 0, playing: false, ready: false }
    const d = Number.isFinite(el.duration) ? el.duration : 0
    return {
      t: el.currentTime,
      d,
      ratio: d > 0 ? el.currentTime / d : 0,
      playing: !el.paused && !el.ended,
      ready: el.readyState >= 2,
    }
  }
}

export const video = new VideoController()

/** mm:ss */
export function fmtTime(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
