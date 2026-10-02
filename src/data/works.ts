/**
 * 真实作品目录：全部条目来自 zucai 原视频，封面与 poster 来自实抽帧。
 * 名称采用原文件日期与类别；时长和比例来自 ffprobe；不填写未经确认的履历信息。
 */

export type VideoAspect = '16 / 9' | '9 / 16' | '1 / 1' | '4 / 3' | '21 / 9' | `${number} / ${number}`

export interface ProcessStep {
  /** 步骤名，例如「分镜」「生成」「合成」 */
  step: string
  text: string
}

export interface Work {
  id: string
  slug: string
  /** 显示用序号，例如 "01" */
  no: string
  title: string
  /** 主分类，控制在 2–4 个字，胶囊条上显示 */
  category: string
  /** 次级标签，抽屉/详情里显示 */
  tags: string[]
  /** 封面图路径（public 下），方形；缺失时用内置占位生成器 */
  cover: string
  /** 视频路径；留空字符串 → 详情页显示「视频待添加」 */
  video: string
  /** 保持视频原比例的真实抽帧 */
  poster?: string
  /** 相对 zucai 的原片路径；用于素材溯源 */
  sourceFile?: string
  /**
   * 该视频是否为**用于验证播放链路的测试片**（不是真实作品）。
   * 为 true 时详情页会挂一条明显的横幅说明，避免被误当成真实作品。
   */
  videoIsTestClip?: boolean
  /** 视频真实比例，横屏/竖屏都支持 */
  videoAspect: VideoAspect
  /** 时长文本，例如 "02:14"。留空 → 显示「时长待填写」 */
  duration: string
  /** 一句话简介 */
  description: string
  /** 更长的项目说明 */
  longDescription: string
  /** 个人职责清单 */
  role: string[]
  /** 制作过程 */
  process: ProcessStep[]
  /** 主题色 [主色, 副色]，用于原站目录的径向双色背景与独立圆层；属于设计取色 */
  themeColors: [string, string]
  /** 内容是否为占位 */
  isPlaceholder: boolean
}

export const WORKS: Work[] = [
  {
    id: "work-01",
    slug: "film-0821",
    no: "01",
    title: "08.21 · AI 短片",
    category: "AI 短片",
    tags: ["AI 短片", "竖屏"],
    cover: "/covers/film-0821.jpg",
    video: "/videos/film-0821.mp4",
    poster: "/media/film-0821-poster.jpg",
    sourceFile: "8月21日.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "01:57",
    description: "AI 短片 · 竖屏 · 01:57",
    longDescription: "竖屏AI 短片，时长 01:57。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#F87800"],
    isPlaceholder: false,
  },
  {
    id: "work-02",
    slug: "film-0823-02",
    no: "02",
    title: "08.23 · AI 短片",
    category: "AI 短片",
    tags: ["AI 短片", "竖屏"],
    cover: "/covers/film-0823-02.jpg",
    video: "/videos/film-0823-02.mp4",
    poster: "/media/film-0823-02-poster.jpg",
    sourceFile: "8月23日(2).mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "01:55",
    description: "AI 短片 · 竖屏 · 01:55",
    longDescription: "竖屏AI 短片，时长 01:55。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#7E7EFF"],
    isPlaceholder: false,
  },
  {
    id: "work-03",
    slug: "film-0824",
    no: "03",
    title: "08.24 · AI 短片",
    category: "AI 短片",
    tags: ["AI 短片", "竖屏"],
    cover: "/covers/film-0824.jpg",
    video: "/videos/film-0824.mp4",
    poster: "/media/film-0824-poster.jpg",
    sourceFile: "8月24日.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "01:26",
    description: "AI 短片 · 竖屏 · 01:26",
    longDescription: "竖屏AI 短片，时长 01:26。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#7E7EFF", "#F87800"],
    isPlaceholder: false,
  },
  {
    id: "work-04",
    slug: "film-0824-01",
    no: "04",
    title: "08.24 · AI 短片 · 版本 02",
    category: "AI 短片",
    tags: ["AI 短片", "竖屏"],
    cover: "/covers/film-0824-01.jpg",
    video: "/videos/film-0824-01.mp4",
    poster: "/media/film-0824-01-poster.jpg",
    sourceFile: "8月24日(1).mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "01:31",
    description: "AI 短片 · 竖屏 · 01:31",
    longDescription: "竖屏AI 短片，时长 01:31。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#FFBC03", "#ED1E24"],
    isPlaceholder: false,
  },
  {
    id: "work-05",
    slug: "film-0901-01",
    no: "05",
    title: "09.01 · 动画影像",
    category: "动画影像",
    tags: ["动画影像", "横屏"],
    cover: "/covers/film-0901-01.jpg",
    video: "/videos/film-0901-01.mp4",
    poster: "/media/film-0901-01-poster.jpg",
    sourceFile: "9月1日 (1).mp4",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:30",
    description: "动画影像 · 横屏 · 01:30",
    longDescription: "横屏动画影像，时长 01:30。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#ED1E24", "#7E7EFF"],
    isPlaceholder: false,
  },
  {
    id: "work-06",
    slug: "film-0903-02",
    no: "06",
    title: "09.03 · 动画影像",
    category: "动画影像",
    tags: ["动画影像", "横屏"],
    cover: "/covers/film-0903-02.jpg",
    video: "/videos/film-0903-02.mp4",
    poster: "/media/film-0903-02-poster.jpg",
    sourceFile: "9月3日 (2).mp4",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:00",
    description: "动画影像 · 横屏 · 01:00",
    longDescription: "横屏动画影像，时长 01:00。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#F87800"],
    isPlaceholder: false,
  },
  {
    id: "work-07",
    slug: "film-0920",
    no: "07",
    title: "09.20 · AI 短片",
    category: "AI 短片",
    tags: ["AI 短片", "竖屏"],
    cover: "/covers/film-0920.jpg",
    video: "/videos/film-0920.mp4",
    poster: "/media/film-0920-poster.jpg",
    sourceFile: "9月20日.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:49",
    description: "AI 短片 · 竖屏 · 00:49",
    longDescription: "竖屏AI 短片，时长 00:49。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#7E7EFF"],
    isPlaceholder: false,
  },
  {
    id: "work-08",
    slug: "preview-0928-164227",
    no: "08",
    title: "09.28 · 带货预热 01",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-164227.jpg",
    video: "/videos/preview-0928-164227.mp4",
    poster: "/media/preview-0928-164227-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T164227.002_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#7E7EFF", "#F87800"],
    isPlaceholder: false,
  },
  {
    id: "work-09",
    slug: "preview-0928-164230",
    no: "09",
    title: "09.28 · 带货预热 02",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-164230.jpg",
    video: "/videos/preview-0928-164230.mp4",
    poster: "/media/preview-0928-164230-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T164230.231_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#FFBC03", "#ED1E24"],
    isPlaceholder: false,
  },
  {
    id: "work-10",
    slug: "preview-0928-164234",
    no: "10",
    title: "09.28 · 带货预热 03",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-164234.jpg",
    video: "/videos/preview-0928-164234.mp4",
    poster: "/media/preview-0928-164234-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T164234.621_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#ED1E24", "#7E7EFF"],
    isPlaceholder: false,
  },
  {
    id: "work-11",
    slug: "preview-0928-164735",
    no: "11",
    title: "09.28 · 带货预热 04",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-164735.jpg",
    video: "/videos/preview-0928-164735.mp4",
    poster: "/media/preview-0928-164735-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T164735.502_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#F87800"],
    isPlaceholder: false,
  },
  {
    id: "work-12",
    slug: "preview-0928-180224",
    no: "12",
    title: "09.28 · 带货预热 05",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-180224.jpg",
    video: "/videos/preview-0928-180224.mp4",
    poster: "/media/preview-0928-180224-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T180224.004_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#7E7EFF"],
    isPlaceholder: false,
  },
  {
    id: "work-13",
    slug: "preview-0928-180226",
    no: "13",
    title: "09.28 · 带货预热 06",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-180226.jpg",
    video: "/videos/preview-0928-180226.mp4",
    poster: "/media/preview-0928-180226-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T180226.930_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#7E7EFF", "#F87800"],
    isPlaceholder: false,
  },
  {
    id: "work-14",
    slug: "preview-0928-180306",
    no: "14",
    title: "09.28 · 带货预热 07",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-180306.jpg",
    video: "/videos/preview-0928-180306.mp4",
    poster: "/media/preview-0928-180306-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T180306.125_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#FFBC03", "#ED1E24"],
    isPlaceholder: false,
  },
  {
    id: "work-15",
    slug: "preview-0928-180315",
    no: "15",
    title: "09.28 · 带货预热 08",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0928-180315.jpg",
    video: "/videos/preview-0928-180315.mp4",
    poster: "/media/preview-0928-180315-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-28T180315.242_剪辑版.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "带货预热 · 竖屏 · 00:25",
    longDescription: "竖屏带货预热，时长 00:25。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#ED1E24", "#7E7EFF"],
    isPlaceholder: false,
  },
  {
    id: "work-16",
    slug: "preview-0929-164520",
    no: "16",
    title: "09.29 · 带货预热 09",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0929-164520.jpg",
    video: "/videos/preview-0929-164520.mp4",
    poster: "/media/preview-0929-164520-poster.jpg",
    sourceFile: "带货预热视频/苏生阁视频_20260929_164520.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:30",
    description: "带货预热 · 竖屏 · 00:30",
    longDescription: "竖屏带货预热，时长 00:30。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#F87800"],
    isPlaceholder: false,
  },
  {
    id: "work-17",
    slug: "preview-0929-164551",
    no: "17",
    title: "09.29 · 带货预热 10",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0929-164551.jpg",
    video: "/videos/preview-0929-164551.mp4",
    poster: "/media/preview-0929-164551-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-29T164551.506.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:30",
    description: "带货预热 · 竖屏 · 00:30",
    longDescription: "竖屏带货预热，时长 00:30。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#EB8DB7", "#7E7EFF"],
    isPlaceholder: false,
  },
  {
    id: "work-18",
    slug: "preview-0929-164557",
    no: "18",
    title: "09.29 · 带货预热 11",
    category: "带货预热",
    tags: ["带货预热", "竖屏"],
    cover: "/covers/preview-0929-164557.jpg",
    video: "/videos/preview-0929-164557.mp4",
    poster: "/media/preview-0929-164557-poster.jpg",
    sourceFile: "带货预热视频/下载 - 2026-09-29T164557.830.mp4",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:30",
    description: "带货预热 · 竖屏 · 00:30",
    longDescription: "竖屏带货预热，时长 00:30。以原始画幅播放，并保留原片声音；封面取自本片画面。",
    role: [],
    process: [],
    themeColors: ["#7E7EFF", "#F87800"],
    isPlaceholder: false,
  },
]

export const findWorkBySlug = (slug: string | undefined) => WORKS.find((w) => w.slug === slug)

export const findWorkIndexBySlug = (slug: string | undefined) =>
  WORKS.findIndex((w) => w.slug === slug)

/** 十六进制 → [0..1] 的 rgb，喂给着色器 */
export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return [0.5, 0.5, 0.5]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * '16 / 9' → 1.7778
 *
 * 为什么要单独拿出一个数字：播放舞台的宽度必须写成
 *   width: min(78vw, 66vh * var(--ar))
 * 才能在竖屏视频（9:16）时得到"高而窄"的舞台。
 * 如果只用 `aspect-ratio: 9/16` 配 `max-height`，浏览器会优先满足确定的 width，
 * 结果 9:16 的舞台会被压成 998×528（比例 1.89）—— 视频比例就废了。
 * 而 aspect-ratio 的分数形式没法参与 calc()，所以这里额外给一个纯数字。
 */
export function aspectRatioNumber(videoAspect: string): number {
  const [aw, ah] = videoAspect.split('/').map((s) => parseFloat(s.trim()))
  if (!Number.isFinite(aw) || !Number.isFinite(ah) || ah <= 0 || aw <= 0) return 16 / 9
  return aw / ah
}
