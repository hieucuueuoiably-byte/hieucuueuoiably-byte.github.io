# 作品集网站

个人作品集站点：**AI 影像 / 动画 / 短片**的浏览与放映。
交互动效的交互逻辑、运动质感与转场节奏参考 <https://ponpon-mania.com/> 复现，
内容模型换成本作品集（影像作品而不是交互漫画）。

**技术栈**：React 18 + TypeScript + Vite 5 + GSAP 3（含 ScrollTrigger）+ Three.js 0.169

---

## 快速开始

```bash
npm install
npm run dev            # 开发服务器 → http://127.0.0.1:5173
npm run build          # 类型检查 + 生产构建 → dist/
npm run preview        # 预览构建产物 → http://127.0.0.1:4173
npm run typecheck      # 只做类型检查
npm run gen:placeholders   # 重新生成占位封面（已存在同名文件会跳过）
```

> 本机 4173 端口被其他程序占用，预览时可用
> `npx vite preview --port 4321 --strictPort --host 127.0.0.1`。
>
> **开发模式与生产构建要分别验**：开发下 React StrictMode 会把 effect 跑成
> setup→cleanup→setup，少数 bug（比如"清理时误删 React 管的属性"）只在开发下复现。
> 构建前记得先停掉 `vite preview`，否则 Windows 下 `dist/videos` 句柄被占用会报 `EPERM`。

---

## 页面结构

| 路由 | 内容 | 主要动效 |
| --- | --- | --- |
| `/` | 全屏分层视觉舞台：站点名、定位、自转圆盘、前景云层、胶囊按钮「进入作品」 | 分层退场 → 前景上涌遮挡 → 新内容接续（一条时间轴） |
| `/works` | 中央大型方形海报，左右露出相邻作品，底部黑色胶囊控制条（播放、标题、类别、时长、前后切换、进度点） | 滚轮/键盘/触屏/按钮共用控制器；阻尼惯性；封面纸张弯曲；背景色块联动 |
| `/works/:slug` | 视频播放（按真实比例，兼容横屏/竖屏）、作品简介、个人职责、制作过程 | 当前海报接续到播放舞台；其他海报退出；控制条衔接为播放控件；返回恢复位置 |
| `/about` | 创作介绍、理念、制作流程、联系方式 | 前后景不同速滚动、文字分段出现、右侧章节定位点、底部进度条 |
| `*` | 404 兜底 | — |

---

## 交互一览

| 操作 | 结果 |
| --- | --- |
| **滚轮（桌面）** | 上下滚驱动海报横移。**连续累加、没有阈值**：单格（100px）不过件，三格过一件，连着快滚可以连跨多格。停稳后吸附到最近一格 |
| **键盘** | `↓/←/PageUp/a/q` 上一件，`↑/→/PageDown/d` 下一件，`Home/End` 跳首尾（方向照参考站的实际映射：**下=上一件**） |
| **拖拽** | 触屏横滑或鼠标按住拖，1:1 跟手；快速轻扫（>30px 且 <400ms）换一格 |
| **触屏** | 作品页横向拖动改位置；关于页/详情页正常纵向滚动（原生惯性） |
| **点海报两侧空白** | 切上一件 / 下一件 |
| **点进度点** | 直达某件作品 |
| **胶囊条 ▶** | 作品页 = 进入当前作品；详情页 = 播放/暂停 |
| **胶囊条 ⏮ ⏭** | 切换作品（详情页里也走同一套转场） |
| **耳机图标（详情页）** | 返回作品列表，并恢复之前选中的作品与位置 |
| **顶部「作品」「关于」** | 带分层遮挡转场切换路由 |
| **刷新页面** | 回到上次看的那一件（存在 `localStorage`，与参考站同机制） |
| **详情页的键盘** | 只有 `←`/`→` 切作品（会同步路由、视频、标题）；`↑/↓`、PageUp/PageDown、Home/End 全部留给原生滚动 |
| **焦点在播放进度条上** | `←`/`→` 只调播放进度，不切作品；`Home`/`End` 跳到片头/片尾；空格播放/暂停 |

---

## 目录结构

```
portfolio/
├── index.html                 入口（含 Libre Franklin 字体，断网自动退回系统字体栈）
├── vite.config.ts
├── tsconfig*.json
├── scripts/
│   └── gen-placeholders.mjs   生成占位封面 SVG（从 works.ts 读数据，单一数据源）
├── public/
│   ├── favicon.svg
│   └── covers/                封面素材（当前是 6 张占位 SVG + index.json）
├── docs/
│   ├── motion-spec.md         ★ 运动规格：每个动效的触发/起止/图层/方向/时间轴/缓动/中断
│   ├── acceptance.md          ★ 验收报告（v3）：功能正确性 / 动效相似度 / 性能 三块分开
│   ├── reference-compare.html ★ 与参考站的逐项并排对照
│   ├── shots/                 截图与录屏
│   └── probe/                 参考站实测脚本、原始日志、DOM/几何采样数据
└── src/
    ├── main.tsx              应用入口（BrowserRouter）
    ├── App.tsx               路由 + 舞台 + 转场编排 + 渲染循环 + 全局输入路由
    ├── styles/global.css     全部样式；设计令牌与布局数值旁标注了证据编号
    ├── config/motion.ts      ★ 动画参数统一管理（每条带「已观察/拟定/未验证」来源）
    ├── data/
    │   ├── works.ts          ★ 作品数据集中存储（替换内容只改这里）
    │   └── site.ts           关于页文案与联系方式
    ├── state/
    │   ├── navController.ts  ★ selectedIndex / targetPosition / currentPosition / velocity
    │   │                        / routeTransition / playbackState
    │   ├── useNav.ts         React 绑定 + 滚轮/触屏/键盘统一输入路由
    │   └── videoController.ts 视频单例控制器（保证只有当前视频在播）
    ├── lib/
    │   ├── transition.ts     路由转场编排（一条 GSAP 时间轴）
    │   └── env.ts            减少动态效果 / WebGL 能力探测
    ├── gl/
    │   ├── WorksScene.ts     Three.js 舞台：封面风扇布局 + 背景 + 尺寸/清理
    │   ├── CoverMaterial.ts  ★ 封面材质：64×64 分段网格 + 顶点弯曲 + 法线重算
    │   ├── BackgroundMaterial.ts  背景：双色 fbm 混色 + 有机色块 + 颗粒
    │   └── glsl.ts           着色器公共函数（snoise / fbm / cmap / grain）
    ├── components/           Header / Preloader / TransitionLayer / ControlBar / StaticWorks / icons
    └── pages/                HomePage / WorksPage / WorkDetailPage / AboutPage
```

---

## 素材替换

### 1. 作品信息（标题、分类、时长、简介、职责、制作过程）

全部在 **`src/data/works.ts`** 一个文件里。每件作品的结构：

```ts
{
  id: 'w1',
  slug: 'salt-horizon',            // URL 用，唯一
  no: '01',                        // 显示序号
  title: '盐的尽头',
  category: 'AI 短片',              // 胶囊条上显示的类别，建议 2–4 字
  tags: ['AI 影像', '短片'],
  cover: '/covers/01-salt-horizon.svg',   // 封面路径（public 下）
  video: '',                       // 视频路径；留空 → 详情页显示「视频待添加」
  videoAspect: '16 / 9',           // 视频真实比例，支持 16/9、9/16、1/1、4/3、21/9
  duration: '',                    // 时长文本，如 '02:14'；留空 → 显示「时长待填写」
  description: '一句话简介',
  longDescription: '更长的项目说明',
  role: ['个人职责 1', '个人职责 2'],
  process: [{ step: '取材', text: '…' }],
  themeColors: ['#E9D9C3', '#7F9BB5'],   // 驱动背景色块与封面色，切换时连续过渡
  isPlaceholder: true,             // 改完真实内容后设为 false，详情页的占位提示会消失
}
```

**当前所有内容都是占位文本**（标题、简介、职责、制作过程），时长一律留空，
`isPlaceholder: true` 会让详情页显示"这是占位内容"的提示。
**没有任何虚构的客户、奖项、合作方或播放数据。**

### 2. 封面

- 放图：把图片放到 `public/covers/`，文件名随意，然后改 `works.ts` 里的 `cover` 字段。
- 建议尺寸 **1024×1024 正方形**（封面统一是方形；方形只用于封面，视频框按视频自己的比例）。
- 可用的格式：`.jpg` / `.png` / `.webp` / `.svg` 都行。
- 重新生成占位封面：`npm run gen:placeholders`（**已存在的同名文件会跳过**，不会覆盖你的真封面）。
- 加载失败的封面会自动退回一个由 `themeColors` 生成的两色渐变，不会出现黑洞或报错。

### 3. 视频

- 放文件：`public/videos/`（自己建目录），然后填 `works.ts` 的 `video` 字段，例如
  `video: '/videos/salt-horizon.mp4'`，并把 `videoAspect` 改成真实比例（如竖屏 `'9 / 16'`）。
- 播放行为：**同一时间只有一个视频在播**；离开详情页立即停止；点击播放键才播（不自动带声播放）。
- 没填视频时，详情页会显示「视频待添加」+ 一行替换指引，控制条的播放键为 `disabled`。

### 4. 关于页文案与联系方式

**`src/data/site.ts`**：首屏大标题、理念段落、制作流程四步、联系方式四项。
联系方式 `href` 留空就显示成静态文本「（待填写）」；填上链接就变成可点卡片。

### 5. 站点名与导航

- 站点名、页脚定位语：`src/components/Header.tsx` 里的「作品集网站」与「AI 影像 · 动画 · 短片」，
  以及 `index.html` 的 `<title>`。
- 导航项固定两项（作品 / 关于），要加删项需要同步改 `Header.tsx` 与 `App.tsx` 的路由表。

### 6. 动画参数

**`src/config/motion.ts`** 一个文件管全部。每条参数形式是：

```ts
routeTransition: p(1.05, 'proposed', '提示词给的起点是 800–1200ms，取中值'),
//                 ^值    ^来源标记    ^依据说明
```

`src` 取值：`'observed'`（参考站实测）/ `'proposed'`（提示词拟定起点）/ `'unverified'`（未能测量）。
详见 `docs/motion-spec.md` 的「参数来源总表」。

---

## 无障碍与降级

- **DOM 承载可读内容**：文字、导航、按钮、视频全部是真实 DOM（提示词要求"不要将文字、按钮或视频全部画进 Canvas"）。
  WebGL 只画封面与背景。
- **屏幕阅读器**：`/works` 提供完整作品清单（视觉隐藏但可读）、`aria-live` 播报当前作品、
  导航带 `aria-current="page"`、所有图标按钮有 `aria-label`、进度轨是 `role="slider"` 且可键盘操作。
- **键盘**：`←/→/↑/↓/PageUp/PageDown/Home/End` 均可切换；输入控件内不劫持按键。
- **触控目标**：窄屏下所有按钮 ≥44px（实测播放键 54×54，前后键 44×44）。
- **减少动态效果**：尊重 `prefers-reduced-motion`。转场压到近乎瞬时但**保留状态切换**，
  封面弯曲与速度条纹关闭，关于页文字直接显示（不做渐显）。
- **WebGL 不可用**：自动切到**静态浏览版** —— DOM 卡片复刻同一套风扇布局（中央 1.0 / 邻封 0.54、
  偏移 0.84、旋转 ±9°），滚轮/键盘/触屏/进入详情/返回全部照常工作，并显示一条降级说明。
- **JS 关闭**：`<noscript>` 给出提示。

---

## 性能与资源

- 渲染像素比上限 `1.75`（`motion.config.bg.maxDpr`）；`ResizeObserver` 之外的尺寸变化走 `resize` 事件。
- 封面贴图用线性过滤、不生成 mipmap（封面基本在接近 1:1 的尺寸显示，省一次上传与显存）。
- 标签页隐藏时暂停渲染循环（`visibilitychange`）。
- 关于页/首页把背景 WebGL 收掉（`uFade → 0`），减少无效绘制。
- `WorksScene.dispose()` 释放几何/材质/贴图；所有 `addEventListener` 都在对应 effect 的清理函数里移除；
  GSAP 用 `gsap.context()` 包裹并在卸载时 `revert()`。

---

## 调手感（不用重新构建）

控制台里直接改，改完立刻生效；定好之后把数值填回 `src/config/motion.ts` 对应参数的 `value`：

```js
__tune.read()                                  // 看当前所有可调项
__tune.set('nav.wheelDeltaPerStep', 600)       // 滚轮变"重"（8 格才过一件）
__tune.set('cover.velocityRef', 3)             // 弯曲更容易被拉满
__tune.set('nav.snapQuietMs', 90)              // 停稳判定更早
```

可调项：`nav.wheelDeltaPerStep` / `nav.snapQuietMs` / `nav.smoothTime` / `nav.overshoot` /
`cover.velocityRef` / `cover.maxBend` / `cover.uvRipple` / `cover.bump` / `cover.maxTiltDeg` /
`bg.fieldMix` / `bg.blobRadius.0` / `bg.blobRadius.1`

## 已知限制

1. **真机帧时间分布未验证** —— 本机确实有独立 GPU（RTX 3060，`--use-angle=d3d11` 可用，
   headless 下 rAF 跑满 240fps），但 **headless 不做垂直同步**，所以"帧率"没有意义、
   也测不到长帧分布。要判断真机能否稳 60fps，需要在**有头**浏览器里看 Performance 面板。
   前几版文档里"本机只能软件渲染"的说法是**错的**，已在 `docs/acceptance.md` C 块更正。
2. **封面形变与流体模拟** —— 参考站（OGL + 自写 GLSL）带一个 Navier–Stokes 流体求解器驱动扰动；
   本项目用噪声 + 速度包络近似，**没有复现流体求解器**。详见 `docs/motion-spec.md`（B1 表的"未对齐"行）。
3. **两个手感数值的来源**（标 `proposed`，但有实测支撑）：
   - `wheelDeltaPerStep = 400`：真 GPU 扫了 240–720 六档，「单格不过件 + 一次手势过一件」
     在 400/480/600/720 都成立；取 400 因为它等价于把参考站公式里的 pitch 取 1.0。
   - `velocityRef = 6`：真机实测单步峰值 3.0、快速滚动 8.4 → 单步 ≈0.50 饱和，
     落在参考站同一比例带（0.3–0.54）里。
4. **与参考站的并排运动录屏做不了** —— 参考站 `/chapters` 的分页滚轮在自动化环境里驱动不起来
   （真 GPU 下把 8 组滚轮组合都试了，下标一次没变；而最早那版脚本至今仍能复现，
   属会话状态相关差异）。参数对齐改走源码级，手感对齐走等效占比。详见 C 块与 `docs/probe/`。
5. **转场缓动曲线未标定** —— 参考站的转场在 WebGL 内部完成，DOM 层测不到；本项目的时长
   （`routeTransition = 1.05s`，落在提示词给的 800–1200ms 区间内）与内部分段比例是自定的。
6. **筛选状态恢复** —— 本项目没有作品筛选功能，"返回时恢复筛选状态"因此无对应实现。
7. 参考站的彩蛋弹窗、语言切换、全屏入口**未复现**（与作品集主链路无关）。

> 上一版 README 里写的"滚轮累计阈值 140"已被**证伪并删除**：参考站的分页器
> （`class IQ`）没有阈值，是"连续自由滚动 + 停稳吸附到最近一格"。
> 详见 `docs/acceptance.md` 的 A3 与 `docs/probe/reference-pager-excerpts.md`。

---

## 文档

- **[docs/motion-spec.md](docs/motion-spec.md)** — 运动规格。每个动效的触发方式、起止状态、
  参与图层、运动方向、时间轴、缓动、中断处理，以及"已观察 / 拟定 / 未验证"的区分。
- **[docs/acceptance.md](docs/acceptance.md)** — 验收报告。逐项结论、修过的 10 个问题
  （含根因与修法）、"已复现 / 已适配 / 待验证"三张对照表、截图与录屏清单。
- **docs/shots/** — 关键状态截图与**关键操作录屏**（桌面 44.6s / 手机 14.8s）。
- **docs/probe/** — 对参考站的实测脚本与原始数据（DOM dump、几何采样、CSS、着色器节选）。
