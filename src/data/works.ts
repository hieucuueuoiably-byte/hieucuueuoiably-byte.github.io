/**
 * 去重后的 30 条精选作品，展示名来自本次整理；时长和比例来自源片。
 * 封面为成片画面，制作参考图与成片截图分别标注；不填写未经确认的履历信息。
 */

export type VideoAspect = '16 / 9' | '9 / 16' | '1 / 1' | '4 / 3' | '21 / 9' | `${number} / ${number}`

export interface ProcessStep {
  /** 步骤名，例如「分镜」「生成」「合成」 */
  step: string
  text: string
}

export interface WorkMaterial {
  src: string
  thumbnail: string
  title: string
  kind: 'reference' | 'screenshot'
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
  /** 本机素材库的作品编号，不包含私人文件路径 */
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
  materials?: WorkMaterial[]
  screenshots?: WorkMaterial[]
  isPlaceholder: boolean
}

export const WORKS: Work[] = [
  {
    id: "work-v0023",
    slug: "curated-v0023",
    no: "01",
    title: "疑案 · 审讯与线索",
    category: "AI 短片",
    tags: [
      "都市悬疑",
      "竖屏剧情"
    ],
    cover: "/covers/curated-v0023.jpg",
    video: "/videos/curated-v0023.mp4",
    poster: "/media/curated-v0023-poster.jpg",
    sourceFile: "AI视频库/V0023",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "01:59",
    description: "都市悬疑 · 竖屏剧情 · 01:59",
    longDescription: "都市悬疑 · 竖屏剧情 · 01:59。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-914c3852548e3640cd6c.jpg",
        thumbnail: "/materials/thumbs/ref-914c3852548e3640cd6c.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-0fa6727c1e1579687aa8.jpg",
        thumbnail: "/materials/thumbs/ref-0fa6727c1e1579687aa8.jpg",
        title: "项目参考图 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-eaf7d821ce5c17e18085.jpg",
        thumbnail: "/materials/thumbs/ref-eaf7d821ce5c17e18085.jpg",
        title: "项目参考图 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-4eb4510859ab46c25fb9.jpg",
        thumbnail: "/materials/thumbs/ref-4eb4510859ab46c25fb9.jpg",
        title: "项目参考图 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-8358c40152be6684f53e.jpg",
        thumbnail: "/materials/thumbs/ref-8358c40152be6684f53e.jpg",
        title: "场景参考 05",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0023-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0023-frame-01.jpg",
        title: "成片画面 · 41.7 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0023-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0023-frame-02.jpg",
        title: "成片画面 · 85.8 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0026",
    slug: "curated-v0026",
    no: "02",
    title: "疑案 · 霓虹追踪",
    category: "AI 短片",
    tags: [
      "都市悬疑",
      "夜景"
    ],
    cover: "/covers/curated-v0026.jpg",
    video: "/videos/curated-v0026.mp4",
    poster: "/media/curated-v0026-poster.jpg",
    sourceFile: "AI视频库/V0026",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "01:33",
    description: "都市悬疑 · 夜景 · 01:33",
    longDescription: "都市悬疑 · 夜景 · 01:33。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-788b66bf0090755a8e2c.jpg",
        thumbnail: "/materials/thumbs/ref-788b66bf0090755a8e2c.jpg",
        title: "场景参考 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-348ba13ff1f3ea2da836.jpg",
        thumbnail: "/materials/thumbs/ref-348ba13ff1f3ea2da836.jpg",
        title: "场景参考 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-d83fa49cab549d55e845.jpg",
        thumbnail: "/materials/thumbs/ref-d83fa49cab549d55e845.jpg",
        title: "项目参考图 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-0fa6727c1e1579687aa8.jpg",
        thumbnail: "/materials/thumbs/ref-0fa6727c1e1579687aa8.jpg",
        title: "项目参考图 04",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0026-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0026-frame-01.jpg",
        title: "成片画面 · 32.6 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0026-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0026-frame-02.jpg",
        title: "成片画面 · 67.1 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0027",
    slug: "curated-v0027",
    no: "03",
    title: "城市关系 · 对话与抉择",
    category: "AI 短片",
    tags: [
      "都市情感",
      "人物表演"
    ],
    cover: "/covers/curated-v0027.jpg",
    video: "/videos/curated-v0027.mp4",
    poster: "/media/curated-v0027-poster.jpg",
    sourceFile: "AI视频库/V0027",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "01:22",
    description: "都市情感 · 人物表演 · 01:22",
    longDescription: "都市情感 · 人物表演 · 01:22。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#7E7EFF",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-cd946d6880665c457227.jpg",
        thumbnail: "/materials/thumbs/ref-cd946d6880665c457227.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-b3da39ddb83b12a28e20.jpg",
        thumbnail: "/materials/thumbs/ref-b3da39ddb83b12a28e20.jpg",
        title: "项目参考图 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-c197d5edf4a116b73668.jpg",
        thumbnail: "/materials/thumbs/ref-c197d5edf4a116b73668.jpg",
        title: "项目参考图 03",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0027-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0027-frame-01.jpg",
        title: "成片画面 · 28.8 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0027-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0027-frame-02.jpg",
        title: "成片画面 · 59.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0028",
    slug: "curated-v0028",
    no: "04",
    title: "草木灵宗 · 荒山复苏",
    category: "AI 短片",
    tags: [
      "仙侠",
      "植物特效",
      "完整剪辑"
    ],
    cover: "/covers/curated-v0028.jpg",
    video: "/videos/curated-v0028.mp4",
    poster: "/media/curated-v0028-poster.jpg",
    sourceFile: "AI视频库/V0028",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "03:20",
    description: "仙侠 · 植物特效 · 03:20",
    longDescription: "仙侠 · 植物特效 · 03:20。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#FFBC03",
      "#ED1E24"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-dfa22609214cfd984a6f.jpg",
        thumbnail: "/materials/thumbs/ref-dfa22609214cfd984a6f.jpg",
        title: "角色参考 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-5be663ac034a2f831942.jpg",
        thumbnail: "/materials/thumbs/ref-5be663ac034a2f831942.jpg",
        title: "角色参考 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-38a75ea16ef1b7768a46.jpg",
        thumbnail: "/materials/thumbs/ref-38a75ea16ef1b7768a46.jpg",
        title: "角色参考 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-98698b664d5855e2c872.jpg",
        thumbnail: "/materials/thumbs/ref-98698b664d5855e2c872.jpg",
        title: "角色参考 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-809acc70ab18e8390f72.jpg",
        thumbnail: "/materials/thumbs/ref-809acc70ab18e8390f72.jpg",
        title: "角色参考 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-e47975c1f5a534f98cef.jpg",
        thumbnail: "/materials/thumbs/ref-e47975c1f5a534f98cef.jpg",
        title: "角色参考 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-0b92c397a4183b3cbd3c.jpg",
        thumbnail: "/materials/thumbs/ref-0b92c397a4183b3cbd3c.jpg",
        title: "角色参考 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-6377fdf1c593ff63a90b.jpg",
        thumbnail: "/materials/thumbs/ref-6377fdf1c593ff63a90b.jpg",
        title: "角色参考 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-459744e3cc7dd693d03d.jpg",
        thumbnail: "/materials/thumbs/ref-459744e3cc7dd693d03d.jpg",
        title: "角色参考 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-6b8fd1b23ddf4e54a1a7.jpg",
        thumbnail: "/materials/thumbs/ref-6b8fd1b23ddf4e54a1a7.jpg",
        title: "角色参考 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-3171f78e50e9193033b6.jpg",
        thumbnail: "/materials/thumbs/ref-3171f78e50e9193033b6.jpg",
        title: "角色参考 11",
        kind: "reference"
      },
      {
        src: "/materials/ref-7d55f001284716ca8593.jpg",
        thumbnail: "/materials/thumbs/ref-7d55f001284716ca8593.jpg",
        title: "角色参考 12",
        kind: "reference"
      },
      {
        src: "/materials/ref-14c3716e111dc1e935dc.jpg",
        thumbnail: "/materials/thumbs/ref-14c3716e111dc1e935dc.jpg",
        title: "角色参考 13",
        kind: "reference"
      },
      {
        src: "/materials/ref-47b71b425a10650d5d86.jpg",
        thumbnail: "/materials/thumbs/ref-47b71b425a10650d5d86.jpg",
        title: "角色参考 14",
        kind: "reference"
      },
      {
        src: "/materials/ref-4543ba1c339ff2616cfd.jpg",
        thumbnail: "/materials/thumbs/ref-4543ba1c339ff2616cfd.jpg",
        title: "道具参考 15",
        kind: "reference"
      },
      {
        src: "/materials/ref-2cc10c0dd7b272bb8d3c.jpg",
        thumbnail: "/materials/thumbs/ref-2cc10c0dd7b272bb8d3c.jpg",
        title: "道具参考 16",
        kind: "reference"
      },
      {
        src: "/materials/ref-5b70d66b3944efe2ff8f.jpg",
        thumbnail: "/materials/thumbs/ref-5b70d66b3944efe2ff8f.jpg",
        title: "道具参考 17",
        kind: "reference"
      },
      {
        src: "/materials/ref-a95d6bd4fcd92294506a.jpg",
        thumbnail: "/materials/thumbs/ref-a95d6bd4fcd92294506a.jpg",
        title: "道具参考 18",
        kind: "reference"
      },
      {
        src: "/materials/ref-7bae03b32afb9c14e4f7.jpg",
        thumbnail: "/materials/thumbs/ref-7bae03b32afb9c14e4f7.jpg",
        title: "道具参考 19",
        kind: "reference"
      },
      {
        src: "/materials/ref-e59bb696f4ae5175ade2.jpg",
        thumbnail: "/materials/thumbs/ref-e59bb696f4ae5175ade2.jpg",
        title: "道具参考 20",
        kind: "reference"
      },
      {
        src: "/materials/ref-e2a96ee95d5d4467208a.jpg",
        thumbnail: "/materials/thumbs/ref-e2a96ee95d5d4467208a.jpg",
        title: "道具参考 21",
        kind: "reference"
      },
      {
        src: "/materials/ref-ccafcfc3d4935875ac86.jpg",
        thumbnail: "/materials/thumbs/ref-ccafcfc3d4935875ac86.jpg",
        title: "道具参考 22",
        kind: "reference"
      },
      {
        src: "/materials/ref-d88d5f2e36f48df0051c.jpg",
        thumbnail: "/materials/thumbs/ref-d88d5f2e36f48df0051c.jpg",
        title: "道具参考 23",
        kind: "reference"
      },
      {
        src: "/materials/ref-e24f6fed8e8e0ccc8757.jpg",
        thumbnail: "/materials/thumbs/ref-e24f6fed8e8e0ccc8757.jpg",
        title: "道具参考 24",
        kind: "reference"
      },
      {
        src: "/materials/ref-3078d3672763c38fc232.jpg",
        thumbnail: "/materials/thumbs/ref-3078d3672763c38fc232.jpg",
        title: "道具参考 25",
        kind: "reference"
      },
      {
        src: "/materials/ref-c098257e9f8e7ae61ca7.jpg",
        thumbnail: "/materials/thumbs/ref-c098257e9f8e7ae61ca7.jpg",
        title: "道具参考 26",
        kind: "reference"
      },
      {
        src: "/materials/ref-de5ef86782053984e280.jpg",
        thumbnail: "/materials/thumbs/ref-de5ef86782053984e280.jpg",
        title: "道具参考 27",
        kind: "reference"
      },
      {
        src: "/materials/ref-109e048dfd62158a20c7.jpg",
        thumbnail: "/materials/thumbs/ref-109e048dfd62158a20c7.jpg",
        title: "道具参考 28",
        kind: "reference"
      },
      {
        src: "/materials/ref-2491c468240d7f52a75f.jpg",
        thumbnail: "/materials/thumbs/ref-2491c468240d7f52a75f.jpg",
        title: "道具参考 29",
        kind: "reference"
      },
      {
        src: "/materials/ref-9f0fdeb27320726f40d8.jpg",
        thumbnail: "/materials/thumbs/ref-9f0fdeb27320726f40d8.jpg",
        title: "道具参考 30",
        kind: "reference"
      },
      {
        src: "/materials/ref-0341adaddf6f962e2b6c.jpg",
        thumbnail: "/materials/thumbs/ref-0341adaddf6f962e2b6c.jpg",
        title: "道具参考 31",
        kind: "reference"
      },
      {
        src: "/materials/ref-80010f0d2f96a42b72d0.jpg",
        thumbnail: "/materials/thumbs/ref-80010f0d2f96a42b72d0.jpg",
        title: "道具参考 32",
        kind: "reference"
      },
      {
        src: "/materials/ref-ba657179b8379dfa81fc.jpg",
        thumbnail: "/materials/thumbs/ref-ba657179b8379dfa81fc.jpg",
        title: "道具参考 33",
        kind: "reference"
      },
      {
        src: "/materials/ref-0b19a50e60503bf21946.jpg",
        thumbnail: "/materials/thumbs/ref-0b19a50e60503bf21946.jpg",
        title: "场景参考 34",
        kind: "reference"
      },
      {
        src: "/materials/ref-9413c80d81b8d4a2379a.jpg",
        thumbnail: "/materials/thumbs/ref-9413c80d81b8d4a2379a.jpg",
        title: "场景参考 35",
        kind: "reference"
      },
      {
        src: "/materials/ref-d0db8b8bbdcb1a0a5019.jpg",
        thumbnail: "/materials/thumbs/ref-d0db8b8bbdcb1a0a5019.jpg",
        title: "场景参考 36",
        kind: "reference"
      },
      {
        src: "/materials/ref-dbef1fafc44b26f75a70.jpg",
        thumbnail: "/materials/thumbs/ref-dbef1fafc44b26f75a70.jpg",
        title: "场景参考 37",
        kind: "reference"
      },
      {
        src: "/materials/ref-df5518d861b894e958a1.jpg",
        thumbnail: "/materials/thumbs/ref-df5518d861b894e958a1.jpg",
        title: "场景参考 38",
        kind: "reference"
      },
      {
        src: "/materials/ref-328d4013d393368ca456.jpg",
        thumbnail: "/materials/thumbs/ref-328d4013d393368ca456.jpg",
        title: "场景参考 39",
        kind: "reference"
      },
      {
        src: "/materials/ref-32bdb2f05a4694bfed28.jpg",
        thumbnail: "/materials/thumbs/ref-32bdb2f05a4694bfed28.jpg",
        title: "场景参考 40",
        kind: "reference"
      },
      {
        src: "/materials/ref-e5cd5dc7c30586e96947.jpg",
        thumbnail: "/materials/thumbs/ref-e5cd5dc7c30586e96947.jpg",
        title: "场景参考 41",
        kind: "reference"
      },
      {
        src: "/materials/ref-a3e1189ea04504311b8a.jpg",
        thumbnail: "/materials/thumbs/ref-a3e1189ea04504311b8a.jpg",
        title: "场景参考 42",
        kind: "reference"
      },
      {
        src: "/materials/ref-58b450bc2dcb7bba7b37.jpg",
        thumbnail: "/materials/thumbs/ref-58b450bc2dcb7bba7b37.jpg",
        title: "场景参考 43",
        kind: "reference"
      },
      {
        src: "/materials/ref-00c1ba161c7ef7dd1250.jpg",
        thumbnail: "/materials/thumbs/ref-00c1ba161c7ef7dd1250.jpg",
        title: "场景参考 44",
        kind: "reference"
      },
      {
        src: "/materials/ref-1cd85b9d10f25a458b06.jpg",
        thumbnail: "/materials/thumbs/ref-1cd85b9d10f25a458b06.jpg",
        title: "场景参考 45",
        kind: "reference"
      },
      {
        src: "/materials/ref-7e6aff8d1856d5a4c81c.jpg",
        thumbnail: "/materials/thumbs/ref-7e6aff8d1856d5a4c81c.jpg",
        title: "场景参考 46",
        kind: "reference"
      },
      {
        src: "/materials/ref-61d1e18bb1303778e4ba.jpg",
        thumbnail: "/materials/thumbs/ref-61d1e18bb1303778e4ba.jpg",
        title: "场景参考 47",
        kind: "reference"
      },
      {
        src: "/materials/ref-a4f17d1bae0fe6ee61f9.jpg",
        thumbnail: "/materials/thumbs/ref-a4f17d1bae0fe6ee61f9.jpg",
        title: "场景参考 48",
        kind: "reference"
      },
      {
        src: "/materials/ref-f15c40722c11edb244bd.jpg",
        thumbnail: "/materials/thumbs/ref-f15c40722c11edb244bd.jpg",
        title: "场景参考 49",
        kind: "reference"
      },
      {
        src: "/materials/ref-265505050008c691dbee.jpg",
        thumbnail: "/materials/thumbs/ref-265505050008c691dbee.jpg",
        title: "项目参考图 50",
        kind: "reference"
      },
      {
        src: "/materials/ref-d7c42a8e9e2ca24483fd.jpg",
        thumbnail: "/materials/thumbs/ref-d7c42a8e9e2ca24483fd.jpg",
        title: "项目参考图 51",
        kind: "reference"
      },
      {
        src: "/materials/ref-4807bcccf78cad4f17d1.jpg",
        thumbnail: "/materials/thumbs/ref-4807bcccf78cad4f17d1.jpg",
        title: "项目参考图 52",
        kind: "reference"
      },
      {
        src: "/materials/ref-c13fcc7206a4df1ad5c3.jpg",
        thumbnail: "/materials/thumbs/ref-c13fcc7206a4df1ad5c3.jpg",
        title: "项目参考图 53",
        kind: "reference"
      },
      {
        src: "/materials/ref-b0a831f24d76a2e768ba.jpg",
        thumbnail: "/materials/thumbs/ref-b0a831f24d76a2e768ba.jpg",
        title: "项目参考图 54",
        kind: "reference"
      },
      {
        src: "/materials/ref-1e0d262d4d4e806e6b0b.jpg",
        thumbnail: "/materials/thumbs/ref-1e0d262d4d4e806e6b0b.jpg",
        title: "项目参考图 55",
        kind: "reference"
      },
      {
        src: "/materials/ref-cb3265f5cd38888360bb.jpg",
        thumbnail: "/materials/thumbs/ref-cb3265f5cd38888360bb.jpg",
        title: "项目参考图 56",
        kind: "reference"
      },
      {
        src: "/materials/ref-e49cd8fc3d52c2692e19.jpg",
        thumbnail: "/materials/thumbs/ref-e49cd8fc3d52c2692e19.jpg",
        title: "项目参考图 57",
        kind: "reference"
      },
      {
        src: "/materials/ref-8d3240a559f5d69abab5.jpg",
        thumbnail: "/materials/thumbs/ref-8d3240a559f5d69abab5.jpg",
        title: "场景参考 58",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0028-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0028-frame-01.jpg",
        title: "成片画面 · 70.2 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0028-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0028-frame-02.jpg",
        title: "成片画面 · 144.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0057",
    slug: "curated-v0057",
    no: "05",
    title: "寒夜与记忆 · 亲情短片",
    category: "AI 短片",
    tags: [
      "亲情",
      "有字幕",
      "完整剪辑"
    ],
    cover: "/covers/curated-v0057.jpg",
    video: "/videos/curated-v0057.mp4",
    poster: "/media/curated-v0057-poster.jpg",
    sourceFile: "AI视频库/V0057",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "02:26",
    description: "亲情 · 有字幕 · 02:26",
    longDescription: "亲情 · 有字幕 · 02:26。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#ED1E24",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-b904d14ecb36b6adbe5e.jpg",
        thumbnail: "/materials/thumbs/ref-b904d14ecb36b6adbe5e.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-8f5ea5b83031dd8b54aa.jpg",
        thumbnail: "/materials/thumbs/ref-8f5ea5b83031dd8b54aa.jpg",
        title: "项目参考图 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-5a7a6f929ee10d18a628.jpg",
        thumbnail: "/materials/thumbs/ref-5a7a6f929ee10d18a628.jpg",
        title: "项目参考图 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-4d70bf7e9ca4d90c495d.jpg",
        thumbnail: "/materials/thumbs/ref-4d70bf7e9ca4d90c495d.jpg",
        title: "项目参考图 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-5711b8945d798ee98721.jpg",
        thumbnail: "/materials/thumbs/ref-5711b8945d798ee98721.jpg",
        title: "项目参考图 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-c964f88c6c54dc50769d.jpg",
        thumbnail: "/materials/thumbs/ref-c964f88c6c54dc50769d.jpg",
        title: "项目参考图 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-df3a1324b8fffb210e66.jpg",
        thumbnail: "/materials/thumbs/ref-df3a1324b8fffb210e66.jpg",
        title: "项目参考图 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-650111c422de29f18c7f.jpg",
        thumbnail: "/materials/thumbs/ref-650111c422de29f18c7f.jpg",
        title: "项目参考图 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-c8f7c68389bac8ce58e0.jpg",
        thumbnail: "/materials/thumbs/ref-c8f7c68389bac8ce58e0.jpg",
        title: "项目参考图 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-5cebef1effc335679a05.jpg",
        thumbnail: "/materials/thumbs/ref-5cebef1effc335679a05.jpg",
        title: "项目参考图 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-9c4f0d232c7b4d2ffc2f.jpg",
        thumbnail: "/materials/thumbs/ref-9c4f0d232c7b4d2ffc2f.jpg",
        title: "项目参考图 11",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0057-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0057-frame-01.jpg",
        title: "成片画面 · 51.0 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0057-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0057-frame-02.jpg",
        title: "成片画面 · 104.9 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0069",
    slug: "curated-v0069",
    no: "06",
    title: "雨夜危机 · 剧情片段",
    category: "AI 短片",
    tags: [
      "悬疑",
      "现实题材"
    ],
    cover: "/covers/curated-v0069.jpg",
    video: "/videos/curated-v0069.mp4",
    poster: "/media/curated-v0069-poster.jpg",
    sourceFile: "AI视频库/V0069",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:00",
    description: "悬疑 · 现实题材 · 01:00",
    longDescription: "悬疑 · 现实题材 · 01:00。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-6120e9c7b25deb57ea53.jpg",
        thumbnail: "/materials/thumbs/ref-6120e9c7b25deb57ea53.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-d32006dffeed852dd4eb.jpg",
        thumbnail: "/materials/thumbs/ref-d32006dffeed852dd4eb.jpg",
        title: "角色参考 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-38de712b1e095e9dc371.jpg",
        thumbnail: "/materials/thumbs/ref-38de712b1e095e9dc371.jpg",
        title: "项目参考图 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-ecdeb16363a82df67e65.jpg",
        thumbnail: "/materials/thumbs/ref-ecdeb16363a82df67e65.jpg",
        title: "项目参考图 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-8dc0915962b6a077b4b0.jpg",
        thumbnail: "/materials/thumbs/ref-8dc0915962b6a077b4b0.jpg",
        title: "项目参考图 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-072ee4cb8edf28c366c8.jpg",
        thumbnail: "/materials/thumbs/ref-072ee4cb8edf28c366c8.jpg",
        title: "项目参考图 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-30ae8b079b01138a3f78.jpg",
        thumbnail: "/materials/thumbs/ref-30ae8b079b01138a3f78.jpg",
        title: "项目参考图 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-a8b6b1e1bc70beb6e6e9.jpg",
        thumbnail: "/materials/thumbs/ref-a8b6b1e1bc70beb6e6e9.jpg",
        title: "项目参考图 08",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0069-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0069-frame-01.jpg",
        title: "成片画面 · 21.0 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0069-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0069-frame-02.jpg",
        title: "成片画面 · 43.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0102",
    slug: "curated-v0102",
    no: "07",
    title: "身份反转 · 酒店门前",
    category: "AI 短片",
    tags: [
      "都市短剧",
      "镜头演示"
    ],
    cover: "/covers/curated-v0102.jpg",
    video: "/videos/curated-v0102.mp4",
    poster: "/media/curated-v0102-poster.jpg",
    sourceFile: "AI视频库/V0102",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:10",
    description: "都市短剧 · 镜头演示 · 00:10",
    longDescription: "都市短剧 · 镜头演示 · 00:10。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-5c21941df8f66a45317a.jpg",
        thumbnail: "/materials/thumbs/ref-5c21941df8f66a45317a.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-15b1aceb10ec98d05c53.jpg",
        thumbnail: "/materials/thumbs/ref-15b1aceb10ec98d05c53.jpg",
        title: "角色参考 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-f7a9d48b179880d9711d.jpg",
        thumbnail: "/materials/thumbs/ref-f7a9d48b179880d9711d.jpg",
        title: "项目参考图 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-23fa5274c93df21be8a5.jpg",
        thumbnail: "/materials/thumbs/ref-23fa5274c93df21be8a5.jpg",
        title: "角色参考 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-d45cc7f994c3caffabdc.jpg",
        thumbnail: "/materials/thumbs/ref-d45cc7f994c3caffabdc.jpg",
        title: "项目参考图 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-8774aff23c7aa36e9e08.jpg",
        thumbnail: "/materials/thumbs/ref-8774aff23c7aa36e9e08.jpg",
        title: "角色参考 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-35077b5ac25f58324ae8.jpg",
        thumbnail: "/materials/thumbs/ref-35077b5ac25f58324ae8.jpg",
        title: "项目参考图 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-13e2f64fa8c8e26484dd.jpg",
        thumbnail: "/materials/thumbs/ref-13e2f64fa8c8e26484dd.jpg",
        title: "角色参考 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-5e42c257970e96a12ef7.jpg",
        thumbnail: "/materials/thumbs/ref-5e42c257970e96a12ef7.jpg",
        title: "项目参考图 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-c5e52159dc77a1f2bd25.jpg",
        thumbnail: "/materials/thumbs/ref-c5e52159dc77a1f2bd25.jpg",
        title: "角色参考 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-923d1ab67f0d008ce4c3.jpg",
        thumbnail: "/materials/thumbs/ref-923d1ab67f0d008ce4c3.jpg",
        title: "项目参考图 11",
        kind: "reference"
      },
      {
        src: "/materials/ref-f5b91269efb5d7717141.jpg",
        thumbnail: "/materials/thumbs/ref-f5b91269efb5d7717141.jpg",
        title: "角色参考 12",
        kind: "reference"
      },
      {
        src: "/materials/ref-e0507091468605df401d.jpg",
        thumbnail: "/materials/thumbs/ref-e0507091468605df401d.jpg",
        title: "场景参考 13",
        kind: "reference"
      },
      {
        src: "/materials/ref-a11fc021c2accf2f6e11.jpg",
        thumbnail: "/materials/thumbs/ref-a11fc021c2accf2f6e11.jpg",
        title: "场景参考 14",
        kind: "reference"
      },
      {
        src: "/materials/ref-8e86ba569802c93faca6.jpg",
        thumbnail: "/materials/thumbs/ref-8e86ba569802c93faca6.jpg",
        title: "场景参考 15",
        kind: "reference"
      },
      {
        src: "/materials/ref-a080b10c277e6a7c6764.jpg",
        thumbnail: "/materials/thumbs/ref-a080b10c277e6a7c6764.jpg",
        title: "场景参考 16",
        kind: "reference"
      },
      {
        src: "/materials/ref-5bbe3a455edd48bfaa88.jpg",
        thumbnail: "/materials/thumbs/ref-5bbe3a455edd48bfaa88.jpg",
        title: "场景参考 17",
        kind: "reference"
      },
      {
        src: "/materials/ref-62377ac5f75d33e0a7ab.jpg",
        thumbnail: "/materials/thumbs/ref-62377ac5f75d33e0a7ab.jpg",
        title: "分镜素材 18",
        kind: "reference"
      },
      {
        src: "/materials/ref-5423e4865c74bca78102.jpg",
        thumbnail: "/materials/thumbs/ref-5423e4865c74bca78102.jpg",
        title: "分镜素材 19",
        kind: "reference"
      },
      {
        src: "/materials/ref-1853a8d1672154cb0106.jpg",
        thumbnail: "/materials/thumbs/ref-1853a8d1672154cb0106.jpg",
        title: "分镜素材 20",
        kind: "reference"
      },
      {
        src: "/materials/ref-692bc02b8678f397aeae.jpg",
        thumbnail: "/materials/thumbs/ref-692bc02b8678f397aeae.jpg",
        title: "道具参考 21",
        kind: "reference"
      },
      {
        src: "/materials/ref-a93ed07aa02daa96718d.jpg",
        thumbnail: "/materials/thumbs/ref-a93ed07aa02daa96718d.jpg",
        title: "道具参考 22",
        kind: "reference"
      },
      {
        src: "/materials/ref-89a7e94344e98bc2d7ae.jpg",
        thumbnail: "/materials/thumbs/ref-89a7e94344e98bc2d7ae.jpg",
        title: "道具参考 23",
        kind: "reference"
      },
      {
        src: "/materials/ref-be98ea2e388e1202995c.jpg",
        thumbnail: "/materials/thumbs/ref-be98ea2e388e1202995c.jpg",
        title: "道具参考 24",
        kind: "reference"
      },
      {
        src: "/materials/ref-bfaf7cae7d97861b3418.jpg",
        thumbnail: "/materials/thumbs/ref-bfaf7cae7d97861b3418.jpg",
        title: "道具参考 25",
        kind: "reference"
      },
      {
        src: "/materials/ref-706573cfb4f43062ecc4.jpg",
        thumbnail: "/materials/thumbs/ref-706573cfb4f43062ecc4.jpg",
        title: "道具参考 26",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0102-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0102-frame-01.jpg",
        title: "成片画面 · 3.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0102-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0102-frame-02.jpg",
        title: "成片画面 · 7.2 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0189",
    slug: "curated-v0189",
    no: "08",
    title: "云海到战机 · 幻想转场",
    category: "AI 短片",
    tags: [
      "奇幻",
      "跨场景转场"
    ],
    cover: "/covers/curated-v0189.jpg",
    video: "/videos/curated-v0189.mp4",
    poster: "/media/curated-v0189-poster.jpg",
    sourceFile: "AI视频库/V0189",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:30",
    description: "奇幻 · 跨场景转场 · 00:30",
    longDescription: "奇幻 · 跨场景转场 · 00:30。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#7E7EFF",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0189-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0189-frame-01.jpg",
        title: "成片画面 · 10.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0189-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0189-frame-02.jpg",
        title: "成片画面 · 21.7 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0224",
    slug: "curated-v0224",
    no: "09",
    title: "红衣女战士 · 巨兽对决",
    category: "AI 短片",
    tags: [
      "动作",
      "巨兽",
      "镜头演示"
    ],
    cover: "/covers/curated-v0224.jpg",
    video: "/videos/curated-v0224.mp4",
    poster: "/media/curated-v0224-poster.jpg",
    sourceFile: "AI视频库/V0224",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:10",
    description: "动作 · 巨兽 · 00:10",
    longDescription: "动作 · 巨兽 · 00:10。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#FFBC03",
      "#ED1E24"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0224-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0224-frame-01.jpg",
        title: "成片画面 · 3.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0224-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0224-frame-02.jpg",
        title: "成片画面 · 7.2 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0226",
    slug: "curated-v0226",
    no: "10",
    title: "海边回望 · 人物情绪",
    category: "AI 短片",
    tags: [
      "情绪表演",
      "海边",
      "镜头演示"
    ],
    cover: "/covers/curated-v0226.jpg",
    video: "/videos/curated-v0226.mp4",
    poster: "/media/curated-v0226-poster.jpg",
    sourceFile: "AI视频库/V0226",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:10",
    description: "情绪表演 · 海边 · 00:10",
    longDescription: "情绪表演 · 海边 · 00:10。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#ED1E24",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0226-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0226-frame-01.jpg",
        title: "成片画面 · 3.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0226-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0226-frame-02.jpg",
        title: "成片画面 · 7.2 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0601",
    slug: "curated-v0601",
    no: "11",
    title: "雨巷里的断亲声明",
    category: "AI 短片",
    tags: [
      "家庭冲突",
      "都市短剧"
    ],
    cover: "/covers/curated-v0601.jpg",
    video: "/videos/curated-v0601.mp4",
    poster: "/media/curated-v0601-poster.jpg",
    sourceFile: "AI视频库/V0601",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:12",
    description: "家庭冲突 · 都市短剧 · 01:12",
    longDescription: "家庭冲突 · 都市短剧 · 01:12。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-6b1e29e11f9e6aba3206.jpg",
        thumbnail: "/materials/thumbs/ref-6b1e29e11f9e6aba3206.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-f422ed77e336bb8324d9.jpg",
        thumbnail: "/materials/thumbs/ref-f422ed77e336bb8324d9.jpg",
        title: "项目参考图 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-68cea7e6452f5773e579.jpg",
        thumbnail: "/materials/thumbs/ref-68cea7e6452f5773e579.jpg",
        title: "道具参考 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-064f850696e7056f62c3.jpg",
        thumbnail: "/materials/thumbs/ref-064f850696e7056f62c3.jpg",
        title: "道具参考 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-e7791a68c1b1309e5cbb.jpg",
        thumbnail: "/materials/thumbs/ref-e7791a68c1b1309e5cbb.jpg",
        title: "项目参考图 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-b77edd54c630bea5eaf6.jpg",
        thumbnail: "/materials/thumbs/ref-b77edd54c630bea5eaf6.jpg",
        title: "项目参考图 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-9288e427f8760a7ff86a.jpg",
        thumbnail: "/materials/thumbs/ref-9288e427f8760a7ff86a.jpg",
        title: "项目参考图 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-fb09e056a70185ef84a6.jpg",
        thumbnail: "/materials/thumbs/ref-fb09e056a70185ef84a6.jpg",
        title: "项目参考图 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-2a6c5ac25a2060b1fccc.jpg",
        thumbnail: "/materials/thumbs/ref-2a6c5ac25a2060b1fccc.jpg",
        title: "项目参考图 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-45afdc11916964b6817e.jpg",
        thumbnail: "/materials/thumbs/ref-45afdc11916964b6817e.jpg",
        title: "项目参考图 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-2d32709b7dc851abcca4.jpg",
        thumbnail: "/materials/thumbs/ref-2d32709b7dc851abcca4.jpg",
        title: "项目参考图 11",
        kind: "reference"
      },
      {
        src: "/materials/ref-70529a1b1b17c43a61a3.jpg",
        thumbnail: "/materials/thumbs/ref-70529a1b1b17c43a61a3.jpg",
        title: "项目参考图 12",
        kind: "reference"
      },
      {
        src: "/materials/ref-6d5e3299ab2e5fa79621.jpg",
        thumbnail: "/materials/thumbs/ref-6d5e3299ab2e5fa79621.jpg",
        title: "项目参考图 13",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0601-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0601-frame-01.jpg",
        title: "成片画面 · 25.1 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0601-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0601-frame-02.jpg",
        title: "成片画面 · 51.6 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0747",
    slug: "curated-v0747",
    no: "12",
    title: "冰洞剑影 · 群像对峙",
    category: "AI 短片",
    tags: [
      "仙侠",
      "剑修",
      "镜头演示"
    ],
    cover: "/covers/curated-v0747.jpg",
    video: "/videos/curated-v0747.mp4",
    poster: "/media/curated-v0747-poster.jpg",
    sourceFile: "AI视频库/V0747",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:30",
    description: "仙侠 · 剑修 · 00:30",
    longDescription: "仙侠 · 剑修 · 00:30。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0747-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0747-frame-01.jpg",
        title: "成片画面 · 10.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0747-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0747-frame-02.jpg",
        title: "成片画面 · 21.7 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0017",
    slug: "curated-v0017",
    no: "13",
    title: "纸箱骑士",
    category: "动画影像",
    tags: [
      "童年幻想",
      "三维动画",
      "完整剪辑"
    ],
    cover: "/covers/curated-v0017.jpg",
    video: "/videos/curated-v0017.mp4",
    poster: "/media/curated-v0017-poster.jpg",
    sourceFile: "AI视频库/V0017",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "02:16",
    description: "童年幻想 · 三维动画 · 02:16",
    longDescription: "童年幻想 · 三维动画 · 02:16。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#7E7EFF",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-46aa52c670bc8da35855.jpg",
        thumbnail: "/materials/thumbs/ref-46aa52c670bc8da35855.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-6a2755b37d8b5777b4ab.jpg",
        thumbnail: "/materials/thumbs/ref-6a2755b37d8b5777b4ab.jpg",
        title: "项目参考图 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-cba264464e0265fc07ac.jpg",
        thumbnail: "/materials/thumbs/ref-cba264464e0265fc07ac.jpg",
        title: "项目参考图 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-7cd6256f8b3cfd45fb51.jpg",
        thumbnail: "/materials/thumbs/ref-7cd6256f8b3cfd45fb51.jpg",
        title: "项目参考图 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-0a23993fadfc53140d24.jpg",
        thumbnail: "/materials/thumbs/ref-0a23993fadfc53140d24.jpg",
        title: "分镜素材 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-39e340958c4a331c4f7e.jpg",
        thumbnail: "/materials/thumbs/ref-39e340958c4a331c4f7e.jpg",
        title: "分镜素材 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-15c8397137d9ef191ecf.jpg",
        thumbnail: "/materials/thumbs/ref-15c8397137d9ef191ecf.jpg",
        title: "分镜素材 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-1b5aa06d93aac8c2cb26.jpg",
        thumbnail: "/materials/thumbs/ref-1b5aa06d93aac8c2cb26.jpg",
        title: "分镜素材 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-82013e479553475079ee.jpg",
        thumbnail: "/materials/thumbs/ref-82013e479553475079ee.jpg",
        title: "分镜素材 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-b0c232db2eef54423770.jpg",
        thumbnail: "/materials/thumbs/ref-b0c232db2eef54423770.jpg",
        title: "分镜素材 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-db7d42063864dabbd2b1.jpg",
        thumbnail: "/materials/thumbs/ref-db7d42063864dabbd2b1.jpg",
        title: "分镜素材 11",
        kind: "reference"
      },
      {
        src: "/materials/ref-b57fb76576dec4905c6e.jpg",
        thumbnail: "/materials/thumbs/ref-b57fb76576dec4905c6e.jpg",
        title: "分镜素材 12",
        kind: "reference"
      },
      {
        src: "/materials/ref-5dd450ce6cd0302654a9.jpg",
        thumbnail: "/materials/thumbs/ref-5dd450ce6cd0302654a9.jpg",
        title: "分镜素材 13",
        kind: "reference"
      },
      {
        src: "/materials/ref-7e393c3bb7581b2244de.jpg",
        thumbnail: "/materials/thumbs/ref-7e393c3bb7581b2244de.jpg",
        title: "分镜素材 14",
        kind: "reference"
      },
      {
        src: "/materials/ref-bee620bc7eefb241e79c.jpg",
        thumbnail: "/materials/thumbs/ref-bee620bc7eefb241e79c.jpg",
        title: "分镜素材 15",
        kind: "reference"
      },
      {
        src: "/materials/ref-5800c01dcfa5859743fc.jpg",
        thumbnail: "/materials/thumbs/ref-5800c01dcfa5859743fc.jpg",
        title: "分镜素材 16",
        kind: "reference"
      },
      {
        src: "/materials/ref-7e7312e52a2b75079392.jpg",
        thumbnail: "/materials/thumbs/ref-7e7312e52a2b75079392.jpg",
        title: "分镜素材 17",
        kind: "reference"
      },
      {
        src: "/materials/ref-1daab57aad6136ba39d2.jpg",
        thumbnail: "/materials/thumbs/ref-1daab57aad6136ba39d2.jpg",
        title: "分镜素材 18",
        kind: "reference"
      },
      {
        src: "/materials/ref-d589507b8aba4a13612c.jpg",
        thumbnail: "/materials/thumbs/ref-d589507b8aba4a13612c.jpg",
        title: "分镜素材 19",
        kind: "reference"
      },
      {
        src: "/materials/ref-af3fd698b06790c08cc8.jpg",
        thumbnail: "/materials/thumbs/ref-af3fd698b06790c08cc8.jpg",
        title: "分镜素材 20",
        kind: "reference"
      },
      {
        src: "/materials/ref-e9ad5c7715c2f93dc24a.jpg",
        thumbnail: "/materials/thumbs/ref-e9ad5c7715c2f93dc24a.jpg",
        title: "分镜素材 21",
        kind: "reference"
      },
      {
        src: "/materials/ref-6e097ff7a27656a8e126.jpg",
        thumbnail: "/materials/thumbs/ref-6e097ff7a27656a8e126.jpg",
        title: "分镜素材 22",
        kind: "reference"
      },
      {
        src: "/materials/ref-abb52f9a243e96e366e7.jpg",
        thumbnail: "/materials/thumbs/ref-abb52f9a243e96e366e7.jpg",
        title: "分镜素材 23",
        kind: "reference"
      },
      {
        src: "/materials/ref-f200a1ad33b985721812.jpg",
        thumbnail: "/materials/thumbs/ref-f200a1ad33b985721812.jpg",
        title: "分镜素材 24",
        kind: "reference"
      },
      {
        src: "/materials/ref-42b6567aa74a7636218d.jpg",
        thumbnail: "/materials/thumbs/ref-42b6567aa74a7636218d.jpg",
        title: "分镜素材 25",
        kind: "reference"
      },
      {
        src: "/materials/ref-5d5d10f59f5b67a3159e.jpg",
        thumbnail: "/materials/thumbs/ref-5d5d10f59f5b67a3159e.jpg",
        title: "分镜素材 26",
        kind: "reference"
      },
      {
        src: "/materials/ref-b325e3e57c0b19c80a7e.jpg",
        thumbnail: "/materials/thumbs/ref-b325e3e57c0b19c80a7e.jpg",
        title: "分镜素材 27",
        kind: "reference"
      },
      {
        src: "/materials/ref-bffb6cd69f5af93cf218.jpg",
        thumbnail: "/materials/thumbs/ref-bffb6cd69f5af93cf218.jpg",
        title: "分镜素材 28",
        kind: "reference"
      },
      {
        src: "/materials/ref-22cf124f1d5bbb4680ec.jpg",
        thumbnail: "/materials/thumbs/ref-22cf124f1d5bbb4680ec.jpg",
        title: "分镜素材 29",
        kind: "reference"
      },
      {
        src: "/materials/ref-dfd8ae07e0bbafe55461.jpg",
        thumbnail: "/materials/thumbs/ref-dfd8ae07e0bbafe55461.jpg",
        title: "分镜素材 30",
        kind: "reference"
      },
      {
        src: "/materials/ref-c1c6709c65aff0847094.jpg",
        thumbnail: "/materials/thumbs/ref-c1c6709c65aff0847094.jpg",
        title: "分镜素材 31",
        kind: "reference"
      },
      {
        src: "/materials/ref-ed000bb7987eedc00a49.jpg",
        thumbnail: "/materials/thumbs/ref-ed000bb7987eedc00a49.jpg",
        title: "分镜素材 32",
        kind: "reference"
      },
      {
        src: "/materials/ref-2ccc671e9f3ee732dd7f.jpg",
        thumbnail: "/materials/thumbs/ref-2ccc671e9f3ee732dd7f.jpg",
        title: "分镜素材 33",
        kind: "reference"
      },
      {
        src: "/materials/ref-4cb0cf9e8d8966bbaf18.jpg",
        thumbnail: "/materials/thumbs/ref-4cb0cf9e8d8966bbaf18.jpg",
        title: "分镜素材 34",
        kind: "reference"
      },
      {
        src: "/materials/ref-1cadc374108fb3452b7e.jpg",
        thumbnail: "/materials/thumbs/ref-1cadc374108fb3452b7e.jpg",
        title: "分镜素材 35",
        kind: "reference"
      },
      {
        src: "/materials/ref-873542dc872067a6f993.jpg",
        thumbnail: "/materials/thumbs/ref-873542dc872067a6f993.jpg",
        title: "分镜素材 36",
        kind: "reference"
      },
      {
        src: "/materials/ref-ebebc255cd85e488b055.jpg",
        thumbnail: "/materials/thumbs/ref-ebebc255cd85e488b055.jpg",
        title: "分镜素材 37",
        kind: "reference"
      },
      {
        src: "/materials/ref-ce7fdd4a29a5b6701b62.jpg",
        thumbnail: "/materials/thumbs/ref-ce7fdd4a29a5b6701b62.jpg",
        title: "分镜素材 38",
        kind: "reference"
      },
      {
        src: "/materials/ref-08963d66950c76251b31.jpg",
        thumbnail: "/materials/thumbs/ref-08963d66950c76251b31.jpg",
        title: "分镜素材 39",
        kind: "reference"
      },
      {
        src: "/materials/ref-728e709137ae0230219a.jpg",
        thumbnail: "/materials/thumbs/ref-728e709137ae0230219a.jpg",
        title: "分镜素材 40",
        kind: "reference"
      },
      {
        src: "/materials/ref-54cb0bcfc6611bb6a320.jpg",
        thumbnail: "/materials/thumbs/ref-54cb0bcfc6611bb6a320.jpg",
        title: "分镜素材 41",
        kind: "reference"
      },
      {
        src: "/materials/ref-7927183d708ecff7c5eb.jpg",
        thumbnail: "/materials/thumbs/ref-7927183d708ecff7c5eb.jpg",
        title: "分镜素材 42",
        kind: "reference"
      },
      {
        src: "/materials/ref-9fd86a4efd3f73eac6ba.jpg",
        thumbnail: "/materials/thumbs/ref-9fd86a4efd3f73eac6ba.jpg",
        title: "分镜素材 43",
        kind: "reference"
      },
      {
        src: "/materials/ref-581fb2bcfa09f8dd92f5.jpg",
        thumbnail: "/materials/thumbs/ref-581fb2bcfa09f8dd92f5.jpg",
        title: "分镜素材 44",
        kind: "reference"
      },
      {
        src: "/materials/ref-269f15be4cd23d5c6aee.jpg",
        thumbnail: "/materials/thumbs/ref-269f15be4cd23d5c6aee.jpg",
        title: "分镜素材 45",
        kind: "reference"
      },
      {
        src: "/materials/ref-37e800b24594f5497303.jpg",
        thumbnail: "/materials/thumbs/ref-37e800b24594f5497303.jpg",
        title: "分镜素材 46",
        kind: "reference"
      },
      {
        src: "/materials/ref-658881f8fa648c6de946.jpg",
        thumbnail: "/materials/thumbs/ref-658881f8fa648c6de946.jpg",
        title: "分镜素材 47",
        kind: "reference"
      },
      {
        src: "/materials/ref-efdc0599d0723106f779.jpg",
        thumbnail: "/materials/thumbs/ref-efdc0599d0723106f779.jpg",
        title: "分镜素材 48",
        kind: "reference"
      },
      {
        src: "/materials/ref-f546f19e6759f73c8774.jpg",
        thumbnail: "/materials/thumbs/ref-f546f19e6759f73c8774.jpg",
        title: "分镜素材 49",
        kind: "reference"
      },
      {
        src: "/materials/ref-bcc034214860c1632591.jpg",
        thumbnail: "/materials/thumbs/ref-bcc034214860c1632591.jpg",
        title: "分镜素材 50",
        kind: "reference"
      },
      {
        src: "/materials/ref-03e2004187897d08f356.jpg",
        thumbnail: "/materials/thumbs/ref-03e2004187897d08f356.jpg",
        title: "分镜素材 51",
        kind: "reference"
      },
      {
        src: "/materials/ref-8759f0bf70fd6a642867.jpg",
        thumbnail: "/materials/thumbs/ref-8759f0bf70fd6a642867.jpg",
        title: "分镜素材 52",
        kind: "reference"
      },
      {
        src: "/materials/ref-d08087f155c35ac73b4e.jpg",
        thumbnail: "/materials/thumbs/ref-d08087f155c35ac73b4e.jpg",
        title: "分镜素材 53",
        kind: "reference"
      },
      {
        src: "/materials/ref-8814fa51e0400d96b924.jpg",
        thumbnail: "/materials/thumbs/ref-8814fa51e0400d96b924.jpg",
        title: "分镜素材 54",
        kind: "reference"
      },
      {
        src: "/materials/ref-98598b4e74029132719b.jpg",
        thumbnail: "/materials/thumbs/ref-98598b4e74029132719b.jpg",
        title: "分镜素材 55",
        kind: "reference"
      },
      {
        src: "/materials/ref-cf041a2af30cd1b318cb.jpg",
        thumbnail: "/materials/thumbs/ref-cf041a2af30cd1b318cb.jpg",
        title: "分镜素材 56",
        kind: "reference"
      },
      {
        src: "/materials/ref-1ae3ee802aa08aa50231.jpg",
        thumbnail: "/materials/thumbs/ref-1ae3ee802aa08aa50231.jpg",
        title: "分镜素材 57",
        kind: "reference"
      },
      {
        src: "/materials/ref-bfc8cfb77a9b43d1e69f.jpg",
        thumbnail: "/materials/thumbs/ref-bfc8cfb77a9b43d1e69f.jpg",
        title: "分镜素材 58",
        kind: "reference"
      },
      {
        src: "/materials/ref-62a37a8b33047e8c413c.jpg",
        thumbnail: "/materials/thumbs/ref-62a37a8b33047e8c413c.jpg",
        title: "分镜素材 59",
        kind: "reference"
      },
      {
        src: "/materials/ref-a1ae779519fe5f3a0b98.jpg",
        thumbnail: "/materials/thumbs/ref-a1ae779519fe5f3a0b98.jpg",
        title: "分镜素材 60",
        kind: "reference"
      },
      {
        src: "/materials/ref-31e03485491d749cbe44.jpg",
        thumbnail: "/materials/thumbs/ref-31e03485491d749cbe44.jpg",
        title: "分镜素材 61",
        kind: "reference"
      },
      {
        src: "/materials/ref-932adb0ee5398e3a0de1.jpg",
        thumbnail: "/materials/thumbs/ref-932adb0ee5398e3a0de1.jpg",
        title: "分镜素材 62",
        kind: "reference"
      },
      {
        src: "/materials/ref-723593ba3f5fd17d69f8.jpg",
        thumbnail: "/materials/thumbs/ref-723593ba3f5fd17d69f8.jpg",
        title: "分镜素材 63",
        kind: "reference"
      },
      {
        src: "/materials/ref-09b27c1344c64dec09af.jpg",
        thumbnail: "/materials/thumbs/ref-09b27c1344c64dec09af.jpg",
        title: "分镜素材 64",
        kind: "reference"
      },
      {
        src: "/materials/ref-8eb8ea6d628ff1c2e4a4.jpg",
        thumbnail: "/materials/thumbs/ref-8eb8ea6d628ff1c2e4a4.jpg",
        title: "分镜素材 65",
        kind: "reference"
      },
      {
        src: "/materials/ref-a0868f207dc5cbaf96b3.jpg",
        thumbnail: "/materials/thumbs/ref-a0868f207dc5cbaf96b3.jpg",
        title: "分镜素材 66",
        kind: "reference"
      },
      {
        src: "/materials/ref-2db3c84f2c2b722e5774.jpg",
        thumbnail: "/materials/thumbs/ref-2db3c84f2c2b722e5774.jpg",
        title: "分镜素材 67",
        kind: "reference"
      },
      {
        src: "/materials/ref-98885b8141fbc33ff3b6.jpg",
        thumbnail: "/materials/thumbs/ref-98885b8141fbc33ff3b6.jpg",
        title: "分镜素材 68",
        kind: "reference"
      },
      {
        src: "/materials/ref-28c2f445b48082735d42.jpg",
        thumbnail: "/materials/thumbs/ref-28c2f445b48082735d42.jpg",
        title: "分镜素材 69",
        kind: "reference"
      },
      {
        src: "/materials/ref-085fc67979fca59e9c4d.jpg",
        thumbnail: "/materials/thumbs/ref-085fc67979fca59e9c4d.jpg",
        title: "分镜素材 70",
        kind: "reference"
      },
      {
        src: "/materials/ref-2e10d60a1e48012936f7.jpg",
        thumbnail: "/materials/thumbs/ref-2e10d60a1e48012936f7.jpg",
        title: "分镜素材 71",
        kind: "reference"
      },
      {
        src: "/materials/ref-434a18965565c362a58a.jpg",
        thumbnail: "/materials/thumbs/ref-434a18965565c362a58a.jpg",
        title: "分镜素材 72",
        kind: "reference"
      },
      {
        src: "/materials/ref-1b82ed9c35ebf9b59902.jpg",
        thumbnail: "/materials/thumbs/ref-1b82ed9c35ebf9b59902.jpg",
        title: "分镜素材 73",
        kind: "reference"
      },
      {
        src: "/materials/ref-84424f158d743433525a.jpg",
        thumbnail: "/materials/thumbs/ref-84424f158d743433525a.jpg",
        title: "分镜素材 74",
        kind: "reference"
      },
      {
        src: "/materials/ref-14e5c16dacf07ef4df3d.jpg",
        thumbnail: "/materials/thumbs/ref-14e5c16dacf07ef4df3d.jpg",
        title: "分镜素材 75",
        kind: "reference"
      },
      {
        src: "/materials/ref-156e0258ca4aebbaea2b.jpg",
        thumbnail: "/materials/thumbs/ref-156e0258ca4aebbaea2b.jpg",
        title: "角色参考 76",
        kind: "reference"
      },
      {
        src: "/materials/ref-6e63199681f0891dc92a.jpg",
        thumbnail: "/materials/thumbs/ref-6e63199681f0891dc92a.jpg",
        title: "角色参考 77",
        kind: "reference"
      },
      {
        src: "/materials/ref-b5e1056b1a1a9c945aef.jpg",
        thumbnail: "/materials/thumbs/ref-b5e1056b1a1a9c945aef.jpg",
        title: "项目参考图 78",
        kind: "reference"
      },
      {
        src: "/materials/ref-dba814ef34c574ff695e.jpg",
        thumbnail: "/materials/thumbs/ref-dba814ef34c574ff695e.jpg",
        title: "项目参考图 79",
        kind: "reference"
      },
      {
        src: "/materials/ref-00b00a3c8f2d0a55f8c9.jpg",
        thumbnail: "/materials/thumbs/ref-00b00a3c8f2d0a55f8c9.jpg",
        title: "项目参考图 80",
        kind: "reference"
      },
      {
        src: "/materials/ref-c1b5dcbe1fcfe28905c2.jpg",
        thumbnail: "/materials/thumbs/ref-c1b5dcbe1fcfe28905c2.jpg",
        title: "项目参考图 81",
        kind: "reference"
      },
      {
        src: "/materials/ref-d84452003984a8e4af58.jpg",
        thumbnail: "/materials/thumbs/ref-d84452003984a8e4af58.jpg",
        title: "项目参考图 82",
        kind: "reference"
      },
      {
        src: "/materials/ref-7b6f60a94153d167cd4a.jpg",
        thumbnail: "/materials/thumbs/ref-7b6f60a94153d167cd4a.jpg",
        title: "项目参考图 83",
        kind: "reference"
      },
      {
        src: "/materials/ref-767b96b2fa9e4dafc59b.jpg",
        thumbnail: "/materials/thumbs/ref-767b96b2fa9e4dafc59b.jpg",
        title: "项目参考图 84",
        kind: "reference"
      },
      {
        src: "/materials/ref-0096f2a026f3683df7f0.jpg",
        thumbnail: "/materials/thumbs/ref-0096f2a026f3683df7f0.jpg",
        title: "项目参考图 85",
        kind: "reference"
      },
      {
        src: "/materials/ref-210206b1f64fe9b986f2.jpg",
        thumbnail: "/materials/thumbs/ref-210206b1f64fe9b986f2.jpg",
        title: "角色参考 86",
        kind: "reference"
      },
      {
        src: "/materials/ref-e4c85eda74b8fb2c0482.jpg",
        thumbnail: "/materials/thumbs/ref-e4c85eda74b8fb2c0482.jpg",
        title: "项目参考图 87",
        kind: "reference"
      },
      {
        src: "/materials/ref-145bc16f231164f457fd.jpg",
        thumbnail: "/materials/thumbs/ref-145bc16f231164f457fd.jpg",
        title: "项目参考图 88",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0017-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0017-frame-01.jpg",
        title: "成片画面 · 47.7 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0017-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0017-frame-02.jpg",
        title: "成片画面 · 98.1 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0018",
    slug: "curated-v0018",
    no: "14",
    title: "亡羊补牢",
    category: "动画影像",
    tags: [
      "黏土童话",
      "寓言",
      "完整剪辑"
    ],
    cover: "/covers/curated-v0018.jpg",
    video: "/videos/curated-v0018.mp4",
    poster: "/media/curated-v0018-poster.jpg",
    sourceFile: "AI视频库/V0018",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:43",
    description: "黏土童话 · 寓言 · 01:43",
    longDescription: "黏土童话 · 寓言 · 01:43。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#FFBC03",
      "#ED1E24"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-f768ab8dcb0b601d4e25.jpg",
        thumbnail: "/materials/thumbs/ref-f768ab8dcb0b601d4e25.jpg",
        title: "分镜素材 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-eefd726d29d5d9c8c500.jpg",
        thumbnail: "/materials/thumbs/ref-eefd726d29d5d9c8c500.jpg",
        title: "分镜素材 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-cf9c7e3f8fd659319be7.jpg",
        thumbnail: "/materials/thumbs/ref-cf9c7e3f8fd659319be7.jpg",
        title: "分镜素材 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-121bc76368733d8b7366.jpg",
        thumbnail: "/materials/thumbs/ref-121bc76368733d8b7366.jpg",
        title: "分镜素材 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-2bed308a2b7bbcff0164.jpg",
        thumbnail: "/materials/thumbs/ref-2bed308a2b7bbcff0164.jpg",
        title: "分镜素材 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-c130e64a59a63e15460b.jpg",
        thumbnail: "/materials/thumbs/ref-c130e64a59a63e15460b.jpg",
        title: "分镜素材 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-c4d0e4fa17f4ae1c5ab9.jpg",
        thumbnail: "/materials/thumbs/ref-c4d0e4fa17f4ae1c5ab9.jpg",
        title: "分镜素材 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-d836e9c90772f3b08cfc.jpg",
        thumbnail: "/materials/thumbs/ref-d836e9c90772f3b08cfc.jpg",
        title: "分镜素材 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-61099a3714b2ae6d4e05.jpg",
        thumbnail: "/materials/thumbs/ref-61099a3714b2ae6d4e05.jpg",
        title: "分镜素材 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-37940f4e346612dba507.jpg",
        thumbnail: "/materials/thumbs/ref-37940f4e346612dba507.jpg",
        title: "分镜素材 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-b376a5df54d562b69457.jpg",
        thumbnail: "/materials/thumbs/ref-b376a5df54d562b69457.jpg",
        title: "分镜素材 11",
        kind: "reference"
      },
      {
        src: "/materials/ref-a3c6ed7bd6cf8e7b8e44.jpg",
        thumbnail: "/materials/thumbs/ref-a3c6ed7bd6cf8e7b8e44.jpg",
        title: "分镜素材 12",
        kind: "reference"
      },
      {
        src: "/materials/ref-7887b3b7a4d6bac00914.jpg",
        thumbnail: "/materials/thumbs/ref-7887b3b7a4d6bac00914.jpg",
        title: "分镜素材 13",
        kind: "reference"
      },
      {
        src: "/materials/ref-e829eb50a2f529140a57.jpg",
        thumbnail: "/materials/thumbs/ref-e829eb50a2f529140a57.jpg",
        title: "项目参考图 14",
        kind: "reference"
      },
      {
        src: "/materials/ref-e9e9644d76a19511ae64.jpg",
        thumbnail: "/materials/thumbs/ref-e9e9644d76a19511ae64.jpg",
        title: "项目参考图 15",
        kind: "reference"
      },
      {
        src: "/materials/ref-3d069c1e08f7575aeb06.jpg",
        thumbnail: "/materials/thumbs/ref-3d069c1e08f7575aeb06.jpg",
        title: "项目参考图 16",
        kind: "reference"
      },
      {
        src: "/materials/ref-976c067569358e3a215a.jpg",
        thumbnail: "/materials/thumbs/ref-976c067569358e3a215a.jpg",
        title: "项目参考图 17",
        kind: "reference"
      },
      {
        src: "/materials/ref-59e913f0b619c9865b33.jpg",
        thumbnail: "/materials/thumbs/ref-59e913f0b619c9865b33.jpg",
        title: "项目参考图 18",
        kind: "reference"
      },
      {
        src: "/materials/ref-ef0210868b72d531ee85.jpg",
        thumbnail: "/materials/thumbs/ref-ef0210868b72d531ee85.jpg",
        title: "项目参考图 19",
        kind: "reference"
      },
      {
        src: "/materials/ref-ecf5997f25631ef44e89.jpg",
        thumbnail: "/materials/thumbs/ref-ecf5997f25631ef44e89.jpg",
        title: "项目参考图 20",
        kind: "reference"
      },
      {
        src: "/materials/ref-0bc8b8380b2004623b09.jpg",
        thumbnail: "/materials/thumbs/ref-0bc8b8380b2004623b09.jpg",
        title: "角色参考 21",
        kind: "reference"
      },
      {
        src: "/materials/ref-7548746f5c144bf9b2e6.jpg",
        thumbnail: "/materials/thumbs/ref-7548746f5c144bf9b2e6.jpg",
        title: "角色参考 22",
        kind: "reference"
      },
      {
        src: "/materials/ref-82eedd76f0075c5f7840.jpg",
        thumbnail: "/materials/thumbs/ref-82eedd76f0075c5f7840.jpg",
        title: "分镜素材 23",
        kind: "reference"
      },
      {
        src: "/materials/ref-74932ff09107f44a20b5.jpg",
        thumbnail: "/materials/thumbs/ref-74932ff09107f44a20b5.jpg",
        title: "分镜素材 24",
        kind: "reference"
      },
      {
        src: "/materials/ref-d59205cf578d7d62afb9.jpg",
        thumbnail: "/materials/thumbs/ref-d59205cf578d7d62afb9.jpg",
        title: "分镜素材 25",
        kind: "reference"
      },
      {
        src: "/materials/ref-64d519d5235b06c91012.jpg",
        thumbnail: "/materials/thumbs/ref-64d519d5235b06c91012.jpg",
        title: "分镜素材 26",
        kind: "reference"
      },
      {
        src: "/materials/ref-30d1f691536b4839e8b0.jpg",
        thumbnail: "/materials/thumbs/ref-30d1f691536b4839e8b0.jpg",
        title: "分镜素材 27",
        kind: "reference"
      },
      {
        src: "/materials/ref-756e1c590bd8dc53d592.jpg",
        thumbnail: "/materials/thumbs/ref-756e1c590bd8dc53d592.jpg",
        title: "分镜素材 28",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0018-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0018-frame-01.jpg",
        title: "成片画面 · 36.2 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0018-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0018-frame-02.jpg",
        title: "成片画面 · 74.4 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0043",
    slug: "curated-v0043",
    no: "15",
    title: "橘猫与女孩 · 日常陪伴",
    category: "动画影像",
    tags: [
      "二维动画",
      "治愈"
    ],
    cover: "/covers/curated-v0043.jpg",
    video: "/videos/curated-v0043.mp4",
    poster: "/media/curated-v0043-poster.jpg",
    sourceFile: "AI视频库/V0043",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:30",
    description: "二维动画 · 治愈 · 00:30",
    longDescription: "二维动画 · 治愈 · 00:30。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#ED1E24",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-e73d1c94404eaf75409d.jpg",
        thumbnail: "/materials/thumbs/ref-e73d1c94404eaf75409d.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-9cec67b6a598f8671085.jpg",
        thumbnail: "/materials/thumbs/ref-9cec67b6a598f8671085.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0043-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0043-frame-01.jpg",
        title: "成片画面 · 10.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0043-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0043-frame-02.jpg",
        title: "成片画面 · 21.6 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0044",
    slug: "curated-v0044",
    no: "16",
    title: "橘猫 · 身体里的微观世界",
    category: "动画影像",
    tags: [
      "二维动画",
      "微观演示"
    ],
    cover: "/covers/curated-v0044.jpg",
    video: "/videos/curated-v0044.mp4",
    poster: "/media/curated-v0044-poster.jpg",
    sourceFile: "AI视频库/V0044",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:00",
    description: "二维动画 · 微观演示 · 01:00",
    longDescription: "二维动画 · 微观演示 · 01:00。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-e73d1c94404eaf75409d.jpg",
        thumbnail: "/materials/thumbs/ref-e73d1c94404eaf75409d.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-9cec67b6a598f8671085.jpg",
        thumbnail: "/materials/thumbs/ref-9cec67b6a598f8671085.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0044-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0044-frame-01.jpg",
        title: "成片画面 · 21.1 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0044-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0044-frame-02.jpg",
        title: "成片画面 · 43.4 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0045",
    slug: "curated-v0045",
    no: "17",
    title: "人类与机器人 · 数据故事",
    category: "动画影像",
    tags: [
      "三维动画",
      "数据可视化"
    ],
    cover: "/covers/curated-v0045.jpg",
    video: "/videos/curated-v0045.mp4",
    poster: "/media/curated-v0045-poster.jpg",
    sourceFile: "AI视频库/V0045",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:57",
    description: "三维动画 · 数据可视化 · 00:57",
    longDescription: "三维动画 · 数据可视化 · 00:57。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-cc0740e780cd6c6c37a5.jpg",
        thumbnail: "/materials/thumbs/ref-cc0740e780cd6c6c37a5.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-ecba84c535ab613154c9.jpg",
        thumbnail: "/materials/thumbs/ref-ecba84c535ab613154c9.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0045-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0045-frame-01.jpg",
        title: "成片画面 · 19.8 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0045-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0045-frame-02.jpg",
        title: "成片画面 · 40.8 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0749",
    slug: "curated-v0749",
    no: "18",
    title: "黑夜里的微光",
    category: "动画影像",
    tags: [
      "陪伴机器人",
      "温暖书房",
      "完整剪辑"
    ],
    cover: "/covers/curated-v0749.jpg",
    video: "/videos/curated-v0749.mp4",
    poster: "/media/curated-v0749-poster.jpg",
    sourceFile: "AI视频库/V0749",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:25",
    description: "陪伴机器人 · 温暖书房 · 01:25",
    longDescription: "陪伴机器人 · 温暖书房 · 01:25。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#7E7EFF",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-5570794c4b293332af45.jpg",
        thumbnail: "/materials/thumbs/ref-5570794c4b293332af45.jpg",
        title: "角色参考 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-380b3446bbd9a9caaa64.jpg",
        thumbnail: "/materials/thumbs/ref-380b3446bbd9a9caaa64.jpg",
        title: "角色参考 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-b053591cbc63829f4ae3.jpg",
        thumbnail: "/materials/thumbs/ref-b053591cbc63829f4ae3.jpg",
        title: "分镜素材 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-83c393ada5ab4b1757cf.jpg",
        thumbnail: "/materials/thumbs/ref-83c393ada5ab4b1757cf.jpg",
        title: "分镜素材 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-6066e5df8af4648d803e.jpg",
        thumbnail: "/materials/thumbs/ref-6066e5df8af4648d803e.jpg",
        title: "分镜素材 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-fdc1ab70fa761a48f2fd.jpg",
        thumbnail: "/materials/thumbs/ref-fdc1ab70fa761a48f2fd.jpg",
        title: "分镜素材 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-d9c0d6ebe3f2b634d5a0.jpg",
        thumbnail: "/materials/thumbs/ref-d9c0d6ebe3f2b634d5a0.jpg",
        title: "分镜素材 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-ba9ec39f8cabc0784b53.jpg",
        thumbnail: "/materials/thumbs/ref-ba9ec39f8cabc0784b53.jpg",
        title: "分镜素材 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-1df8a48479efc158fe07.jpg",
        thumbnail: "/materials/thumbs/ref-1df8a48479efc158fe07.jpg",
        title: "分镜素材 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-4e3c059bc993654221a2.jpg",
        thumbnail: "/materials/thumbs/ref-4e3c059bc993654221a2.jpg",
        title: "分镜素材 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-d7fcbe8b5515fc26ffed.jpg",
        thumbnail: "/materials/thumbs/ref-d7fcbe8b5515fc26ffed.jpg",
        title: "分镜素材 11",
        kind: "reference"
      },
      {
        src: "/materials/ref-5147d8f0c515184d9166.jpg",
        thumbnail: "/materials/thumbs/ref-5147d8f0c515184d9166.jpg",
        title: "分镜素材 12",
        kind: "reference"
      },
      {
        src: "/materials/ref-9ff063436ef97530717c.jpg",
        thumbnail: "/materials/thumbs/ref-9ff063436ef97530717c.jpg",
        title: "分镜素材 13",
        kind: "reference"
      },
      {
        src: "/materials/ref-7751cd185c17b873ee82.jpg",
        thumbnail: "/materials/thumbs/ref-7751cd185c17b873ee82.jpg",
        title: "分镜素材 14",
        kind: "reference"
      },
      {
        src: "/materials/ref-c7403c802a95ff470f67.jpg",
        thumbnail: "/materials/thumbs/ref-c7403c802a95ff470f67.jpg",
        title: "分镜素材 15",
        kind: "reference"
      },
      {
        src: "/materials/ref-86d70b223e902c0583e2.jpg",
        thumbnail: "/materials/thumbs/ref-86d70b223e902c0583e2.jpg",
        title: "分镜素材 16",
        kind: "reference"
      },
      {
        src: "/materials/ref-90d6c33d1b0f4e1b76fb.jpg",
        thumbnail: "/materials/thumbs/ref-90d6c33d1b0f4e1b76fb.jpg",
        title: "分镜素材 17",
        kind: "reference"
      },
      {
        src: "/materials/ref-546a41af91ff9e4c164a.jpg",
        thumbnail: "/materials/thumbs/ref-546a41af91ff9e4c164a.jpg",
        title: "分镜素材 18",
        kind: "reference"
      },
      {
        src: "/materials/ref-5d3d2916e866b31b4161.jpg",
        thumbnail: "/materials/thumbs/ref-5d3d2916e866b31b4161.jpg",
        title: "分镜素材 19",
        kind: "reference"
      },
      {
        src: "/materials/ref-04e06af8190001c54833.jpg",
        thumbnail: "/materials/thumbs/ref-04e06af8190001c54833.jpg",
        title: "分镜素材 20",
        kind: "reference"
      },
      {
        src: "/materials/ref-bad53347cf18b9d19f6d.jpg",
        thumbnail: "/materials/thumbs/ref-bad53347cf18b9d19f6d.jpg",
        title: "分镜素材 21",
        kind: "reference"
      },
      {
        src: "/materials/ref-dca10034e4474ee6224f.jpg",
        thumbnail: "/materials/thumbs/ref-dca10034e4474ee6224f.jpg",
        title: "角色参考 22",
        kind: "reference"
      },
      {
        src: "/materials/ref-8fc9019fab08b16875b0.jpg",
        thumbnail: "/materials/thumbs/ref-8fc9019fab08b16875b0.jpg",
        title: "角色参考 23",
        kind: "reference"
      },
      {
        src: "/materials/ref-b623127275672b2dec65.jpg",
        thumbnail: "/materials/thumbs/ref-b623127275672b2dec65.jpg",
        title: "角色参考 24",
        kind: "reference"
      },
      {
        src: "/materials/ref-e2f53370fee415bfd155.jpg",
        thumbnail: "/materials/thumbs/ref-e2f53370fee415bfd155.jpg",
        title: "角色参考 25",
        kind: "reference"
      },
      {
        src: "/materials/ref-529d8fc81eded8a8a465.jpg",
        thumbnail: "/materials/thumbs/ref-529d8fc81eded8a8a465.jpg",
        title: "项目参考图 26",
        kind: "reference"
      },
      {
        src: "/materials/ref-42a722d35fba58243bb7.jpg",
        thumbnail: "/materials/thumbs/ref-42a722d35fba58243bb7.jpg",
        title: "项目参考图 27",
        kind: "reference"
      },
      {
        src: "/materials/ref-53e32ca094c820a335ee.jpg",
        thumbnail: "/materials/thumbs/ref-53e32ca094c820a335ee.jpg",
        title: "场景参考 28",
        kind: "reference"
      },
      {
        src: "/materials/ref-740a67a20b0c15779028.jpg",
        thumbnail: "/materials/thumbs/ref-740a67a20b0c15779028.jpg",
        title: "场景参考 29",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0749-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0749-frame-01.jpg",
        title: "成片画面 · 29.7 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0749-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0749-frame-02.jpg",
        title: "成片画面 · 61.1 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0032",
    slug: "curated-v0032",
    no: "19",
    title: "金毛的变化 · 宠物剧情广告",
    category: "带货预热",
    tags: [
      "宠物",
      "叙事广告"
    ],
    cover: "/covers/curated-v0032.jpg",
    video: "/videos/curated-v0032.mp4",
    poster: "/media/curated-v0032-poster.jpg",
    sourceFile: "AI视频库/V0032",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "02:02",
    description: "宠物 · 叙事广告 · 02:02",
    longDescription: "宠物 · 叙事广告 · 02:02。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#FFBC03",
      "#ED1E24"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-1d6f46da5bfff158774e.jpg",
        thumbnail: "/materials/thumbs/ref-1d6f46da5bfff158774e.jpg",
        title: "项目参考图 01",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0032-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0032-frame-01.jpg",
        title: "成片画面 · 42.8 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0032-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0032-frame-02.jpg",
        title: "成片画面 · 88.1 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0033",
    slug: "curated-v0033",
    no: "20",
    title: "宠粮近景 · 食欲与照护",
    category: "带货预热",
    tags: [
      "宠物食品",
      "产品近景"
    ],
    cover: "/covers/curated-v0033.jpg",
    video: "/videos/curated-v0033.mp4",
    poster: "/media/curated-v0033-poster.jpg",
    sourceFile: "AI视频库/V0033",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:32",
    description: "宠物食品 · 产品近景 · 00:32",
    longDescription: "宠物食品 · 产品近景 · 00:32。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#ED1E24",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-1d6f46da5bfff158774e.jpg",
        thumbnail: "/materials/thumbs/ref-1d6f46da5bfff158774e.jpg",
        title: "项目参考图 01",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0033-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0033-frame-01.jpg",
        title: "成片画面 · 11.3 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0033-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0033-frame-02.jpg",
        title: "成片画面 · 23.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0035",
    slug: "curated-v0035",
    no: "21",
    title: "宠物检测 · 产品演示",
    category: "带货预热",
    tags: [
      "产品演示",
      "宠物用品"
    ],
    cover: "/covers/curated-v0035.jpg",
    video: "/videos/curated-v0035.mp4",
    poster: "/media/curated-v0035-poster.jpg",
    sourceFile: "AI视频库/V0035",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:58",
    description: "产品演示 · 宠物用品 · 00:58",
    longDescription: "产品演示 · 宠物用品 · 00:58。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-a0c6d26e0ad82bd54018.jpg",
        thumbnail: "/materials/thumbs/ref-a0c6d26e0ad82bd54018.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-90a5432028d4709c8443.jpg",
        thumbnail: "/materials/thumbs/ref-90a5432028d4709c8443.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0035-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0035-frame-01.jpg",
        title: "成片画面 · 20.2 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0035-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0035-frame-02.jpg",
        title: "成片画面 · 41.6 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0036",
    slug: "curated-v0036",
    no: "22",
    title: "微观清洁 · 功能演示",
    category: "带货预热",
    tags: [
      "微观动画",
      "功能演示"
    ],
    cover: "/covers/curated-v0036.jpg",
    video: "/videos/curated-v0036.mp4",
    poster: "/media/curated-v0036-poster.jpg",
    sourceFile: "AI视频库/V0036",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:00",
    description: "微观动画 · 功能演示 · 01:00",
    longDescription: "微观动画 · 功能演示 · 01:00。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0036-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0036-frame-01.jpg",
        title: "成片画面 · 21.0 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0036-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0036-frame-02.jpg",
        title: "成片画面 · 43.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0048",
    slug: "curated-v0048",
    no: "23",
    title: "宠物肠道 · 三维功能演示",
    category: "带货预热",
    tags: [
      "宠物营养",
      "三维动画"
    ],
    cover: "/covers/curated-v0048.jpg",
    video: "/videos/curated-v0048.mp4",
    poster: "/media/curated-v0048-poster.jpg",
    sourceFile: "AI视频库/V0048",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:47",
    description: "宠物营养 · 三维动画 · 01:47",
    longDescription: "宠物营养 · 三维动画 · 01:47。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#7E7EFF",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-5fd84e7849490ee20d93.jpg",
        thumbnail: "/materials/thumbs/ref-5fd84e7849490ee20d93.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-848a0d931bd662b6be0c.jpg",
        thumbnail: "/materials/thumbs/ref-848a0d931bd662b6be0c.jpg",
        title: "项目参考图 02",
        kind: "reference"
      },
      {
        src: "/materials/ref-ab75cfec477e9bc1b6af.jpg",
        thumbnail: "/materials/thumbs/ref-ab75cfec477e9bc1b6af.jpg",
        title: "项目参考图 03",
        kind: "reference"
      },
      {
        src: "/materials/ref-3560197bfdba2a2a2b68.jpg",
        thumbnail: "/materials/thumbs/ref-3560197bfdba2a2a2b68.jpg",
        title: "项目参考图 04",
        kind: "reference"
      },
      {
        src: "/materials/ref-b2c9f9a21a5271c60a3e.jpg",
        thumbnail: "/materials/thumbs/ref-b2c9f9a21a5271c60a3e.jpg",
        title: "项目参考图 05",
        kind: "reference"
      },
      {
        src: "/materials/ref-8dbf6f73e3a3ce33f39d.jpg",
        thumbnail: "/materials/thumbs/ref-8dbf6f73e3a3ce33f39d.jpg",
        title: "项目参考图 06",
        kind: "reference"
      },
      {
        src: "/materials/ref-c7de9bb4242bcfba7f5d.jpg",
        thumbnail: "/materials/thumbs/ref-c7de9bb4242bcfba7f5d.jpg",
        title: "项目参考图 07",
        kind: "reference"
      },
      {
        src: "/materials/ref-ee3910bd950dd45ba16e.jpg",
        thumbnail: "/materials/thumbs/ref-ee3910bd950dd45ba16e.jpg",
        title: "项目参考图 08",
        kind: "reference"
      },
      {
        src: "/materials/ref-f4dfbe342c2ca4f87f01.jpg",
        thumbnail: "/materials/thumbs/ref-f4dfbe342c2ca4f87f01.jpg",
        title: "项目参考图 09",
        kind: "reference"
      },
      {
        src: "/materials/ref-dcc9d5f600709f2e9872.jpg",
        thumbnail: "/materials/thumbs/ref-dcc9d5f600709f2e9872.jpg",
        title: "项目参考图 10",
        kind: "reference"
      },
      {
        src: "/materials/ref-5be3a1985b5f553bd673.jpg",
        thumbnail: "/materials/thumbs/ref-5be3a1985b5f553bd673.jpg",
        title: "项目参考图 11",
        kind: "reference"
      },
      {
        src: "/materials/ref-5c387a6a726ba7b2951c.jpg",
        thumbnail: "/materials/thumbs/ref-5c387a6a726ba7b2951c.jpg",
        title: "项目参考图 12",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0048-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0048-frame-01.jpg",
        title: "成片画面 · 37.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0048-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0048-frame-02.jpg",
        title: "成片画面 · 77.2 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0049",
    slug: "curated-v0049",
    no: "24",
    title: "柯基 · 眼睛与消化演示",
    category: "带货预热",
    tags: [
      "宠物营养",
      "三维动画"
    ],
    cover: "/covers/curated-v0049.jpg",
    video: "/videos/curated-v0049.mp4",
    poster: "/media/curated-v0049-poster.jpg",
    sourceFile: "AI视频库/V0049",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "00:56",
    description: "宠物营养 · 三维动画 · 00:56",
    longDescription: "宠物营养 · 三维动画 · 00:56。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#FFBC03",
      "#ED1E24"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-3f73c3ba487e915525ec.jpg",
        thumbnail: "/materials/thumbs/ref-3f73c3ba487e915525ec.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-2110b2ef6c3c37360006.jpg",
        thumbnail: "/materials/thumbs/ref-2110b2ef6c3c37360006.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0049-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0049-frame-01.jpg",
        title: "成片画面 · 19.6 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0049-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0049-frame-02.jpg",
        title: "成片画面 · 40.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0050",
    slug: "curated-v0050",
    no: "25",
    title: "柯基 · 关节与活力演示",
    category: "带货预热",
    tags: [
      "宠物营养",
      "关节动画"
    ],
    cover: "/covers/curated-v0050.jpg",
    video: "/videos/curated-v0050.mp4",
    poster: "/media/curated-v0050-poster.jpg",
    sourceFile: "AI视频库/V0050",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:00",
    description: "宠物营养 · 关节动画 · 01:00",
    longDescription: "宠物营养 · 关节动画 · 01:00。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#ED1E24",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-3f73c3ba487e915525ec.jpg",
        thumbnail: "/materials/thumbs/ref-3f73c3ba487e915525ec.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-2110b2ef6c3c37360006.jpg",
        thumbnail: "/materials/thumbs/ref-2110b2ef6c3c37360006.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0050-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0050-frame-01.jpg",
        title: "成片画面 · 21.0 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0050-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0050-frame-02.jpg",
        title: "成片画面 · 43.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0051",
    slug: "curated-v0051",
    no: "26",
    title: "柯基 · 微观神经演示",
    category: "带货预热",
    tags: [
      "宠物营养",
      "微观特效"
    ],
    cover: "/covers/curated-v0051.jpg",
    video: "/videos/curated-v0051.mp4",
    poster: "/media/curated-v0051-poster.jpg",
    sourceFile: "AI视频库/V0051",
    videoIsTestClip: false,
    videoAspect: "16 / 9",
    duration: "01:00",
    description: "宠物营养 · 微观特效 · 01:00",
    longDescription: "宠物营养 · 微观特效 · 01:00。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-3f73c3ba487e915525ec.jpg",
        thumbnail: "/materials/thumbs/ref-3f73c3ba487e915525ec.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-2110b2ef6c3c37360006.jpg",
        thumbnail: "/materials/thumbs/ref-2110b2ef6c3c37360006.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0051-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0051-frame-01.jpg",
        title: "成片画面 · 21.0 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0051-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0051-frame-02.jpg",
        title: "成片画面 · 43.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0207",
    slug: "curated-v0207",
    no: "27",
    title: "数字人 · 口播讲解",
    category: "带货预热",
    tags: [
      "数字人",
      "口播"
    ],
    cover: "/covers/curated-v0207.jpg",
    video: "/videos/curated-v0207.mp4",
    poster: "/media/curated-v0207-poster.jpg",
    sourceFile: "AI视频库/V0207",
    videoIsTestClip: false,
    videoAspect: "24 / 43",
    duration: "01:40",
    description: "数字人 · 口播 · 01:40",
    longDescription: "数字人 · 口播 · 01:40。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#EB8DB7",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [
      {
        src: "/materials/ref-e700e14f13835dcb4120.jpg",
        thumbnail: "/materials/thumbs/ref-e700e14f13835dcb4120.jpg",
        title: "项目参考图 01",
        kind: "reference"
      },
      {
        src: "/materials/ref-c3009bc7a1d413ac31e2.jpg",
        thumbnail: "/materials/thumbs/ref-c3009bc7a1d413ac31e2.jpg",
        title: "项目参考图 02",
        kind: "reference"
      }
    ],
    screenshots: [
      {
        src: "/materials/curated-v0207-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0207-frame-01.jpg",
        title: "成片画面 · 35.1 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0207-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0207-frame-02.jpg",
        title: "成片画面 · 72.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0214",
    slug: "curated-v0214",
    no: "28",
    title: "宠粮手机 · 科技展示",
    category: "带货预热",
    tags: [
      "宠物食品",
      "科技转场",
      "镜头演示"
    ],
    cover: "/covers/curated-v0214.jpg",
    video: "/videos/curated-v0214.mp4",
    poster: "/media/curated-v0214-poster.jpg",
    sourceFile: "AI视频库/V0214",
    videoIsTestClip: false,
    videoAspect: "4 / 7",
    duration: "00:10",
    description: "宠物食品 · 科技转场 · 00:10",
    longDescription: "宠物食品 · 科技转场 · 00:10。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#7E7EFF",
      "#F87800"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0214-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0214-frame-01.jpg",
        title: "成片画面 · 3.5 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0214-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0214-frame-02.jpg",
        title: "成片画面 · 7.3 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0216",
    slug: "curated-v0216",
    no: "29",
    title: "宠粮工厂 · 人物展示",
    category: "带货预热",
    tags: [
      "宠物食品",
      "工厂",
      "镜头演示"
    ],
    cover: "/covers/curated-v0216.jpg",
    video: "/videos/curated-v0216.mp4",
    poster: "/media/curated-v0216-poster.jpg",
    sourceFile: "AI视频库/V0216",
    videoIsTestClip: false,
    videoAspect: "4 / 7",
    duration: "00:15",
    description: "宠物食品 · 工厂 · 00:15",
    longDescription: "宠物食品 · 工厂 · 00:15。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#FFBC03",
      "#ED1E24"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0216-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0216-frame-01.jpg",
        title: "成片画面 · 5.3 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0216-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0216-frame-02.jpg",
        title: "成片画面 · 10.9 秒",
        kind: "screenshot"
      }
    ]
  },
  {
    id: "work-v0537",
    slug: "curated-v0537",
    no: "30",
    title: "中秋囤粮 · 字幕广告",
    category: "带货预热",
    tags: [
      "宠物食品",
      "有字幕",
      "竖屏广告"
    ],
    cover: "/covers/curated-v0537.jpg",
    video: "/videos/curated-v0537.mp4",
    poster: "/media/curated-v0537-poster.jpg",
    sourceFile: "AI视频库/V0537",
    videoIsTestClip: false,
    videoAspect: "9 / 16",
    duration: "00:25",
    description: "宠物食品 · 有字幕 · 00:25",
    longDescription: "宠物食品 · 有字幕 · 00:25。保留原始画幅、完整时长与原片声音。",
    role: [],
    process: [],
    themeColors: [
      "#ED1E24",
      "#7E7EFF"
    ],
    isPlaceholder: false,
    materials: [],
    screenshots: [
      {
        src: "/materials/curated-v0537-frame-01.jpg",
        thumbnail: "/materials/thumbs/curated-v0537-frame-01.jpg",
        title: "成片画面 · 8.8 秒",
        kind: "screenshot"
      },
      {
        src: "/materials/curated-v0537-frame-02.jpg",
        thumbnail: "/materials/thumbs/curated-v0537-frame-02.jpg",
        title: "成片画面 · 18.0 秒",
        kind: "screenshot"
      }
    ]
  }
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
