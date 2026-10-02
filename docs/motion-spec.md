# motion-spec.md — 运动规格

> 前版历史记录。接入真实视频后的刚性专辑盒、双 RenderTarget 转场与当前参数见 [真实视频版动效说明](own-videos-motion.md)。下文纸张弯曲及整屏云幕描述不再适用于当前目录。

本文件记录网站里每个动效的**触发方式、起止状态、参与图层、运动方向、时间轴、缓动、中断处理**，
并把每条结论标注来源：

| 标记 | 含义 |
| --- | --- |
| **【已观察】** | 在参考站 <https://ponpon-mania.com/> 上实测得到。括注 `E01`…`E23` 是下面「观察证据」里的编号 |
| **【拟定】** | 按提示词给的起点设定，**没有**在参考站上验证过 |
| **【未验证】** | 参考站对应行为无法测量（多在 WebGL 内部），取与本实现自洽的经验值，或明确记为待验证 |
| **【本实现适配】** | 参考站是漫画阅读器、本实现是影像作品集，功能对不上，按提示词要求做的对应设计 |

参数全部集中在 `src/config/motion.ts`，每条都带 `src` 字段和依据说明。改手感只改那一个文件。

---

## 一、观察证据（对参考站的实测）

用 Playwright + 无头 Chromium（`--use-angle=swiftshader`）实测，脚本与原始输出留在
`docs/probe/`（`probe.js` / `probe2.js` 与对应 log、DOM dump、采样 JSON）。

### 技术栈（实测）

| 编号 | 结论 |
| --- | --- |
| E01 | **Nuxt 3（Vue）** 应用；`body` 背景 `rgb(23,23,23)`；字体 Libre Franklin；`html` 字号 12px |
| E02 | `.app-header{transition:color .4s}` |
| E03 | `.page-index .app-header{transition-delay:.6s}` —— 首页上顶栏颜色变化延后 600ms |
| E04 | 导航胶囊：`.app-header__link-text:after{border:1.5px solid;border-radius:25px;padding:5px 20px;opacity:0;transform:translateY(-50%) translate(-50%) scale(.9);transition:opacity .15s,transform .15s ease-in-out}`；选中态 `font-weight:800` 且胶囊常显 |
| E05 | 顶栏 `.app-header{top:10px}`；字标 `svg{width:140px}`（≤700px → 100px）；署名 `font-size:6.6px`（≤700px → 7px）；`.edge-blocker{width:30px}` |
| E06 | 两侧链接位置：`--chapters{right:calc(50% + 130px)}`、`--about{left:calc(50% + 130px)}`（1440 宽下实测 x=486.1 / 850） |
| E07 | WebGL canvas 尺寸 = CSS 尺寸（1440×900 时 `canvas.width=1440`，DPR 1）；`--vh` 由 JS 写成 `9px`；`html` 上有 `is-gpu-1 os-win browser-chrome is-desktop lang-en page-index` 这类能力/路由标记 |
| E08 | 1440 宽下导航字号实测 15px |
| E09 | **全站 0 个 `<img>`**，也没有任何 `background-image` —— 插画/海报全部由 WebGL 绘制；DOM 只放文字、按钮、链接 |
| E10 | `/chapters` 的翻页是**分格（stepped）**：单次 `wheel deltaY=120` **不移动**；连续 5 次才前进 1 格。首尾**双向 clamp**（index 0 / index 4 各自顶住） |
| E11 | 底部信息条 `.chapters__container-buttons`：1440×900 下 x=36、y=673.1、w=1368、h=80.8，`transform:scale(.95)`；`.chapter-tip`（support us）在右下 x=1327.5 |
| E12 | 非当前章节的文字块被压成 `matrix3d(0,0,0,0, … 0,0.984808,-0.173648,0 …)` —— **scale(0) + 绕轴旋转 10°**（`cos10°=0.9848`、`sin10°=0.1736`） |
| E13 | 章节页海报布局（1440×900 截图量取，换算到 1440 宽）：中央边长 ≈ 568px（≈0.63 视口高）；邻封边长 ≈ 306px（≈0.54 倍中央）、中心水平偏移 ≈ 477px（≈0.84 倍中央边长）、**画面内旋转 ±8–10°、方向按左右对称**；再外侧还有一层更小、更倾斜的封面临近出画。中央海报竖向略偏上约 15px |
| E14 | 参考站产物里共 244 段 GLSL 字面量。反复出现的工具函数：`scaleUV` / `rotateUV` / `map` / `cmap` / `snoise`(Ashima 2D simplex) / `hash2` / `boxBlur` / `rectangle`。**自研渲染器（OGL）+ 自写着色器** |
| E15 | 速度驱动：背景着色器用 `cmap(abs(uVelocity),0.,10.,1.,4.)` 与 `cmap(abs(uVelocity),1.,24.,0.,1.)` 把速度映射成扰动与条纹强度；封面着色器用 `uVelocity` 的符号与大小驱动噪声 |
| E16 | 背景是**双色 fbm 混色**（`mix(uColor1,uColor2, …snoise…)`），`uProgress` 平移噪声输入 → 颜色连续流动；另有一个巨大的圆形/有机色块随进度漂移变尺寸 |
| E17 | 背景有明显胶片颗粒；颗粒用 `floor(uTime*0.01)*5.` 做采样保持，避免逐帧频闪 |
| E18 | 关于页右侧定位点 `.about-nav-bar`：`position:fixed; right:20px; top:450px`、`opacity:0`、`transform:translateY(-36.5px)`；每项 `.about-nav-bar__item` 9×9px，内点 `scale(.6)` |
| E19 | 关于页底部 `.progress-container/.progress-bar`：`position:fixed; height:3px`，进度用 `transform:scaleX()` 表达 |
| E20 | 关于页 section 结构：`.about-intro` 100vh / `.about-what` 200vh / `.about-team` 350vh / `.about-support` 100vh —— 递减到递增的分段高度 |
| E21 | 首屏加载层 `.preloader`：底色 `#fff6f0`；`.preloader__ponpon-container{transform:scale(0) rotate(-120deg)}`；进度线 `.preloader__svg` 311×6，底 `#f2f2f2`、进度 `#ffcc8e` |
| E22 | `.overlay-lang--top` 背景 `#f1abbd`；关于页实测背景就是这个粉 + 奶油云层 |
| E23 | `#f7c704`（`.in-loader` 进度条）；`body` 的 class 会切换 `page-index / page-chapters / page-about` 与 `is-chapter-loading`、`is-support`、`cookies-hidden` 等状态 |

### 源码级证据（E24–E28）：从产物里读出的分页器

行为测量在这里不可靠 —— 同一段脚本 `01-probe.js` 能复现「5×120 走一格」，换个写法就测不动，
说明行为依赖会话状态。所以又做了运行时取证与源码定位：

| 编号 | 结论 |
| --- | --- |
| E24 | `/chapters` 上有 4 个 `window` wheel 监听，**没有任何一处 `preventDefault`**；`body overflow:hidden`、`documentElement.scrollHeight === clientHeight`、无任何可滚动容器 → 滚动完全由 JS 接管 |
| E25 | 真正的分页器是产物里的 `class IQ`（`targetX`/`currentX` 分离 + `velocityTracker` + `snap`）。滚轮入口：`onWheel(e){ if(scrollIn) return; clearSnap(); targetX -= (e.deltaY + e.deltaX)/400 }` —— **没有阈值、没有冷却、deltaX 与 deltaY 相加** |
| E26 | 渲染跟随用二阶临界阻尼（Unity `SmoothDamp` 写法）：`Ne(currentX, targetX, state.lerp, dt)`，`state.lerp` 默认 **100**、拖动时 **200**；越界用 `smoothTime = 40` 把 `targetX` 阻尼顶回（不是硬 clamp） |
| E27 | 吸附补间四组参数：`next()/prev()` = **0.4s cubic.out**；点海报/定位点 = **0.6s cubic.out**；停稳自动吸附 = **0.3s power2.inOut**（移动端竖屏改 `cubic.out`）；轻扫 = **0.3s power2.out**。补间期间 `targetX` 跟着 `currentX` 走，所以新输入能打断并接着滚 |
| E28 | `class al`（VelocityTracker）：速度 = 位移/时间×1000，**最近 20 帧滑动平均**，钳位 `±40`。停稳判定 `|速度| < 0.1 && 离最近一格 > 0.01`。另有 `localStorage['last-chapter']` 记忆与键盘映射（ArrowDown/Left/a/q = 上一格，ArrowUp/Right/d = 下一格，Enter = 进入） |

完整节选见 `docs/probe/reference-pager-excerpts.md`（原样转储没有放进交付目录）。

### 关键算法：封面弯曲（从参考站 GLSL 93 抄回的思路）

```glsl
// UV 空间：绕中心的旋转畸变，强度与"离中心多近"成反比
float turbulence = snoise(baseUV * 1.6 + timeOffset + uSeed.zx * 10.);
float distFromCenter = max(0.1, length(baseUV));
baseUV += rotate(((turbulence - 0.5) / distFromCenter)
                 * smoothstep(-0.2, 0.4, originalUV.y) * 0.45) * baseUV;
// 另有来自流体模拟的 UV 偏移：baseUV.x -= fluidColor.r * 0.007 * vUv.y;
```

参考站还在同一份产物里带了 **Navier–Stokes 流体求解器**（GLSL 130 是 Pavel Dobryakov WebGL-Fluid
的 curl/divergence 那一套），把速度/涡量纹理喂给封面与背景着色器。

**本实现只取「噪声驱动的绕中心旋转畸变 + 距离权重 + 纵向权重」这条主线，并且改成真实顶点位移**
（见 M03）。没有移植流体求解器 —— 那是另一个量级的工程量，而且对本作品的观感贡献有限。

### 参考站没能测到的部分（明确记为未验证）

| 编号 | 内容 | 为什么没测到 |
| --- | --- | --- |
| U1 | 转场的**精确时长与缓动曲线** | 舞台退场、前景上涌全发生在 WebGL 内部，DOM 层采样不到；用 DOM 采样只能确认"有遮挡 + 有接续"（E10 的采样里能看到 `.wipe` 类状态与路由切换时刻的先后关系） |
| U2 | 封面弯曲的**最大幅度、时间常数、回零曲线** | 弯曲是顶点/片元着色器内部量，无法从 DOM 读取。只从截图确认了「切换中存在波浪状畸变」（当前版本的取证见 `docs/shots/bend/bend-01-forward-early.jpg` 与 `bend-04-reverse-early.jpg`） |
| U3 | 阻尼插值的**具体系数与收敛曲线** | 只能确认是"一步一跳 + 平滑逼近目标态"。本实现的 τ 是自定值，见 M02 |
| U4 | 触屏横滑、键盘左右键、进度拖动 | 参考站的移动端行为未逐项验证（提示词也把它列为未验证）。本实现的触屏/键盘是**按提示词要求补充**的，不是复现 |
| U5 | 全屏入口（`.fullscreen`）的实际行为 | 只读到 CSS 与 DOM，没走到真实全屏流程 |
| U6 | 关于页各段的**具体视差倍率** | 只能确认存在"前后景不同速"（截图里云层与底色的相对位移明显不一致），具体倍率未量 |

---

## 二、逐项动效规格

### M01 首页 → 作品页（分层转场）

**触发**：首页 CTA「进入作品」/ 顶栏「作品」/ 首页「关于我」/ 顶栏「关于」——都走
`TransitionController.go()`，同一套编排。

**参与图层**（首页自后向前，每层都带 `data-stage-layer`）：

| 层 | 选择器 | 退场方向 | 说明 |
| --- | --- | --- | --- |
| 1 | `.home__bg-tint` | 不参与位移，只跟随整页淡出 | 背景打光 |
| 2 | `.home__mid`（站点名 + 定位） | `yPercent -6`，先退 | 中景 |
| 3 | `.home__disc`（自转圆盘） | `yPercent -6`，后于中景 | 前景装饰 |
| 4 | `.home__fg`（有机云层） | `yPercent -6`，最后退 | 前景 |
| 5 | `.home__cta-wrap` / `.home__hint` / `.home__about-link` | 同上 | UI |
| — | `.app-header` | **完全不参与** | 只换颜色（见 M07） |

**时间轴**（一条 GSAP timeline，单位秒；`scale = 1`，减少动态效果时 `scale = 0.001`）：

```
0.00  ├─ 舞台退出：所有 data-stage-layer → yPercent:-6, opacity:0
      │   duration .36  ease power3.in  stagger .03
0.14  ├─ 前景上涌：.wipe__shape     → scale 0 → 1
      │   duration .46  ease power4.inOut  transform-origin 50% 100%（从底部涌起）
0.46  ├─ 补纯色：  .wipe__fill      → opacity 0 → 1（duration .10，堵住有机边缘的缝）
0.60  ├─ 遮挡完成：flushSync(navigate(to))  ← 只在画面被完全盖住这一帧换路由
      └─ 新内容接续（承接同一条时间轴，从 0 计时）：
         0.00  .wipe__shape → yPercent 0 → -118   duration .50  ease power3.out
         0.07  .wipe__fill  → yPercent 0 → -118   duration .50  ease power3.out
         0.08  新页 data-stage-layer → yPercent 7→0, opacity 0→1
                duration .50  ease power3.out  stagger .03
总长 ≈ 1.16s    路由切换发生在 ≈ 0.60s（实测 622–722ms，见 docs/acceptance.md V1）
```

**遮挡层颜色**：由**目标路由**决定 —— 作品页/详情页/首页用墨色 `#171717`，关于页用纸白 `#fff6f0`。
换页的那一瞬间遮挡层已经是新页的底色，揭幕时不会有割裂感。

**运动方向**：退场一律向上（`yPercent` 负）；遮挡从下往上（`scale` + origin 在底部），
离场也继续向上 —— 所以整条转场的方向语言是一致的「向上」。

**中断处理**：`TransitionController` 内部有 `running` 标志，转场中再次触发直接忽略（不会叠加）。
`kill()` 可强制中断并复位遮挡层。转场期间 `navigator.setRouteTransition(true)`，
`useWorksInput` 的 `enabled` 变 false，滚轮/触屏/键盘全部被吞掉。

**为什么不是整体淡入淡出**：退场是**分层错位**的（4 层各自有 delay 与方向），
遮挡是**几何上涌**（不是 opacity），新内容是**从遮挡层背后接上来**。
全程没有任何一处对"整个页面"做 opacity 补间。对应提示词 M01。

**顶栏持续存在**：`.app-header` 不在任何 `data-stage-layer` 里，转场时间轴永远不碰它。
它只通过 CSS transition 换颜色（M07）。

---

### M02 作品横向浏览

> **本节已按参考站源码重写。** 上一版把它描述成"分格翻页 + 滚轮累加阈值 140（observed）"，
> 那是**从单点观测得出的错误结论**。参考站的真实机制是「连续自由滚动 + 停稳后吸附到最近一格」，
> 见 E25–E28 与 `docs/acceptance.md` A3。

**触发**（全部进同一个控制器 `navigator`）：

| 输入 | 处理 |
| --- | --- |
| 桌面滚轮 | `feedWheel(deltaY, deltaX)`：`target += (deltaY + deltaX) / wheelDeltaPerStep`。**不设阈值、不设冷却、不做方向筛选**（与参考站一致，`deltaY` 与 `deltaX` 是相加） |
| 触控板横扫 | 同一入口，`deltaX` 会一起参与累加 |
| 触屏横滑 / 鼠标按住拖 | `feedDrag(dx)`：实时 1:1 改目标位置（参考站 `targetX += delta.x * 0.005`）；抬手时若位移 >30px 且时长 <400ms 判为轻扫 → 换一格（0.3s power2.out） |
| 键盘 | 照参考站映射：`ArrowDown/ArrowLeft/PageUp/a/q` = 上一格，`ArrowUp/ArrowRight/PageDown/d` = 下一格，`Home/End` 跳首尾 |
| 前后按钮（胶囊条） | `navigator.step(±1)` → 0.4s cubic.out 吸附 |
| 点邻封 / 点进度点 | `navigator.jumpTo(i)` → 0.6s cubic.out 吸附 |

**状态分离**（提示词要求）：

```
targetPosition   目标位置（浮点，格）。滚轮/拖拽只改它。
currentPosition  渲染位置（浮点）。二阶临界阻尼跟随 target，驱动画面。
velocity         时间窗（333ms）内位移速度的平均，钳 ±40。驱动封面弯曲与背景条纹。
selectedIndex    clamp(round(target))，只用于"意图"判断（标题、按钮可用性、边界）。
```

**跟随**（`smoothDamp` = Unity SmoothDamp / 参考站的 `Ne`）：

```
current = smoothDamp(current, target, posVel, smoothTimeMs, dtMs)   // smoothTime 100ms，拖动时 200ms
越界时：target = smoothDamp(target, 边界, targetVel, 40ms, dtMs)     // 不是硬 clamp → 有"顶住"的手感
velocity = 时间窗内 (current 位移/dt)·1000 的平均，钳 ±maxVelocity
dt 上限 100ms（低帧率设备夹住，避免跳格）
```

用**二阶临界阻尼**而不是一阶指数：它带速度记忆，所以越界顶回与拖拽跟手都更自然 —— 这是参考站的选择。

**【已观察】** smoothTime 100/200、越界 40ms、速度窗口 20 帧、钳位 ±40、四组吸附时长与缓动，
全部来自参考站源码（E26–E28）。

**「一次手势一格」的观感是怎么来的**：不是输入过滤，而是

1. 滚轮按位移连续累加，**位移不足半格**时；
2. 手势停稳（速度 < 0.1 且离开最近一格 > 0.01）后，
3. 自动吸附把位置吸回**最近**那一格。

所以「单次 120 不动」= 0.25 格 < 半格；「5×120 走一格」= 1.25 格 > 半格；
而位移够大时会**连跨多格**（实测 2×600 → 跨 2 格）。

**吸附的中断处理**：吸附补间期间 `target` 跟着 `current` 走（照抄参考站 `onUpdate`），
所以任何新输入 `clearSnap()` 之后都能从当前位置接着自由滚动，不会"先走完再听你的"。

**与参考站的一处必要差异**：停稳判定额外加了一个 **130ms 输入静默期**。
参考站只用「渲染速度 < 0.1」，但那个条件在两次滚轮事件之间就会被满足，
于是每次事件刚累加的位移立刻被吸回、无法累加 —— 而"能累加"正是「5×120 走一格」的前提。
静默期是语义等价（"手势停下来之后才吸到最近一格"）且与帧率无关的实现。

**边界**：目标位置允许越界 `overshoot = 0.35` 格，随后由 40ms 阻尼顶回。
首尾**不回绕**；实测末格再往前滚时目标最多越界到 5.0443，最终精确停在 5。

**记忆**：`localStorage['portfolio:last-work']`，刷新后恢复上次看的那一件（照参考站 `last-chapter`）。

### M03 封面形变（纸张弯曲）

**这是本项目的核心动效，也是唯一不能用 CSS 近似的一项。**

**几何**：`THREE.PlaneGeometry(1, 1, 64, 64)` —— **64×64 分段**（4225 顶点）。
提示词明确要求"有足够分段的平面网格与顶点变形，不以简单 CSS 旋转冒充"。

**顶点变形**（`src/gl/CoverMaterial.ts` 的 `deform(vec2 p, float t)`，p 是平面局部坐标 −0.5..0.5）：

```glsl
float d = max(0.22, length(p));                              // 离中心的距离，设下限避免中心撕裂
float turb  = snoise(p*1.6 + vec2(-t*0.040, -t*0.500) + uSeed*10.0);
float turb2 = snoise(p*3.1 + vec2( t*0.070, -t*0.310) + uSeed.yx*13.0);

// 弯曲 A：绕中心的扭转。强度 ∝ 1/距离 × 纵向权重 × uBend  ← 参考站 GLSL 93 的同一思路
float ang = ((turb - 0.5) / d) * smoothstep(-0.56, 0.30, p.y) * uBend * 0.42;

// 弯曲 B：沿 x 的圆柱式卷曲，让"纸"有厚度
float curl = uBend * 0.5;
vec2  q = rot2(ang) * p;
q.x *= 1.0 + curl * 0.20 * (0.35 + abs(p.x));
q.y *= 1.0 - curl * 0.12 * (0.35 + abs(p.y));

// 出平面起伏（z）：高频噪声 + 抛物面鼓包 + 静止时的极轻呼吸
float z = turb2 * 0.5 * uDepth + curl * (p.x*p.x*1.15 - 0.17) * 0.85 + uBreath * turb * 0.025;
```

**法线重算**：用中心差分（`e = 0.012`）对 `deform()` 采样三次得到切向量，`cross(dx, dy)` 得到
形变后的真实法线。这是"弯曲看得见"的前提 —— 只位移不重算法线，视觉上还是平的。

**动态倾斜**：`uTiltY`（绕 Y 轴，3D 侧倾）与 `uRoll`（画面内旋转）都 ∝ 有符号速度，
最大值 `maxTiltDeg = 9°`，与邻封的画面内倾斜角一致。

**速度关联**：`velNorm = min(1, |velocity| / 3)`；实测单次切换的速度峰值约 2.9–3.0
（`docs/acceptance.md` V2），所以**一次切换 ≈ 满弯曲**，连续切换会略超。

**方向反转**：`uBend` 与 `uTiltY`/`uRoll` 都是**有符号**量
（`bendSigned = sign(velocity) · velNorm · bendFlip`，`bendFlip = -1`）。
往前切与往后切，扭转方向与卷曲方向都相反。实测对比
`docs/shots/bend/bend-01-forward-early.jpg` 与 `bend-04-reverse-early.jpg`。

**停止后收敛**：速度归零 → `velNorm → 0` → `uBend`/`uBendMag`/`uTiltY`/`uRoll` 用同一个
一阶收敛（`1 - exp(-14·dt)`）回零；`uDepth` 也随之从 `0.065` 收到 `0.019`。
实测 `bend-03-settled.jpg` / `bend-06-settled-back.jpg` 是**完全摊平**的状态。

**三通道的权重分配（本轮按参考站的输出形态校准过）**

参考站截图显示它的运动形态是「**轮廓基本是直角矩形** + 画面内部有斜向浅色波纹」——
波纹来自 GLSL 119 的 normal map + 定向光，不是几何弯曲。所以本实现：

| 通道 | 参数 | 值 |
| --- | --- | --- |
| 几何顶点位移（提示词要求保留） | `maxBend` / `maxDepth` | 0.035 / 0.022（边缘位移 ≤2% 海报宽，肉眼仍是方块） |
| UV 位移（参考站 GLSL 93 的机制） | `uvRipple` | 0.012，且乘 `vUv.y`（照抄参考站的加权方式） |
| 法线高光（替代参考站 normal map） | `bump` / `lightingMix` | 0.62 / **0.42**（`lightingMix` 取参考站 GLSL 119 原值） |
| 动态侧倾 | `maxTiltDeg` | 5° |

上一版把几何弯曲当成主要表现手段，结果封面被搅成漩涡、轮廓都不方了 —— 这一轮改回来。

**保留内容可读性**（提示词要求）：
1. 弯曲只作用在几何上，贴图的 UV 位移幅度远小于几何位移（`× amp × 0.05`，且 `amp = 0` 时**严格为 0**）。
2. 弯曲光照 `shade` 用 `clamp(vBend,0,1)` 调制 —— 停稳后 `shade = 1`，完全是原图。
3. 沿 x 的卷曲系数只有 0.20 / 0.12，不会把文字拉花。

**一个已经踩掉并修好的坑（记在案）**：初版片元着色器里 UV 位移项写成了
`wuv += rot2(ang) * centered * 2.0` —— 忘了乘 `amp`。静止时 `ang = 0`，旋转是单位矩阵，
但 `centered * 2.0` 仍然被加上去了，于是 `wuv = 3·uv - 1`，UV 被推出 [0,1] 之后 clamp，
封面上下边缘被拉成"平板"。**教训：任何形变项都必须在"强度为 0"时严格退化为 0。**

---

### M04 背景联动

**目标**：尺寸、位置、颜色随浏览进度变化，**连续过渡、不突然重置**，保留颗粒质感。

**色**：双色 fbm 混色（复刻参考站 GLSL 155/157 的思路）。

```glsl
float n = fbm(suv*1.45 + vec2(uProgress*0.85, uProgress*0.30) + uTime*0.004, 3, 2.05, 0.5);
float m = fbm(suv*3.10 - vec2(uProgress*0.45, -uProgress*0.55) - uTime*0.003, 2, 2.20, 0.5);
vec3 color = mix(uColorA, uColorB, smoothstep(-0.75, 0.95, n + m*0.45));
```

`uColorA/uColorB` **不是**每次切换赋值，而是常驻 lerp：

```
targetA/targetB = 当前作品主题色 ↔ 下一件主题色，按 (current - floor(current)) 插值
bgColorA/B += (target - bg) * (1 - exp(-3.2 · dt))        // 每秒收敛约 3.2 倍
```

所以：拖到两件中间时背景是两个主题色的中间态；切换方向反转时颜色也跟着反着流回去；
路由跳转（首页 ↔ 作品页）也不会"跳色" —— 它只是换了个目标色，继续 lerp。
实测：`docs/shots/video/contact-desktop.jpg` 里 02→03→04→05 的整屏配色各不相同且平滑。

**大色块**：一个噪声扰动的超大圆形（`uBlobR` + 噪动半径 + `uBlobCenter` 漂移）
- 半径随进度在 `0.42 → 0.66` 视口短边之间变化（`blobRadius`，起止值参考 E16 量级）
- 中心随进度漂移：`x = sin(prog01·π·1.15 − 0.5)·0.16`、`y = cos(prog01·π·0.85)·0.096`
- 边缘半径上叠 `snoise`，所以是"有机"而不是标准圆

**颗粒**：`grain(uv, time, uGrain)` —— 底噪 + 两层 hash，强度 `0.055`（封面另加 `0.028`）。
沿用参考站 E17 的 `floor(uTime*12)` 采样保持，避免逐帧频闪。

**速度条纹**：`uLineVel = min(1, |velocity|/6)` 调制一条高频噪声暗线
（参考站 GLSL 155 用 `|uVelocity|` 做同一件事，E15）。

**连续性的保证**：背景是**常驻渲染**的，不随路由重建。首页/作品页淡入，
播放页压到 0.45，关于页收到 0（关于页改由 DOM 分层负责）—— 用的是 `uFade` 的 lerp，
所以跨路由也不会重启。

---

### M05 进入作品与返回 【本实现适配】

**触发**：胶囊条的 ▶「进入作品」/ 点点进度点后进入 / 详情页的「下一件」。

**进入**：
1. 记位置：`savedRef = { index, current }`，`navigator.remember()`。
2. 走 M01 的同一套分层转场（遮挡遮挡住画面的那一刻换路由）。
3. 路由变成 `/works/:slug` → 舞台模式变 `player` → `focus` 从 0 补间到 1（`power3.out`，0.62s）。
4. `focus` 驱动 WebGL：
   - **当前封面**：位置/尺寸插值到 `.detail__stage` 的**真实 DOM 矩形**
     （`App.tsx` 每 4 帧读一次 `getBoundingClientRect()` 喂给 `WorksScene.setStageRect()`，
     让 DOM 当唯一权威，避免 CSS 与着色器各算一遍对不上），同时把画面内旋转收回 0（纸被摊平），
     `uAlpha` 降到 `1 − f·0.62` —— 封面逐渐让位给视频本体。
   - **其他海报**：`exit = min(1, focus·1.7)`，沿**离开中心的方向**推开
     （`exitShift = exit · 1.25 · sign(diff)`）并淡出，旋转阻尼减半。
5. **控制条衔接**：`.control-bar` 挂在 `App` 上、**跨路由是同一个 DOM 元素**
   （不是"一个消失另一个出现"）。进入播放态时：
   - 进度轨 `.bar__scrub` 从 `width:0, opacity:0` 展开到 `width:150`
   - ▶ 变成播放/暂停（控制 `videoController` 单例里注册的那个 video）
   - 左侧多出「返回列表」按钮
   时长 0.34s / 0.22s，`power3.out` / `power2.in`。
6. **只有当前视频会播**：`VideoController` 是单例，换作品时 `stopFor()` 先 `pause()` + 移除 `src` +
   `load()`；离开详情页 `unregister()`。

**返回**：
1. `focus` 用 0.34s 收回 0（此时画面已被遮挡层盖住）。
2. 走 M01 转场到 `/works`。
3. 转场完成后 `navigator.jumpTo(saved.index, { force: true })` +
   `scene.snapLayout()` —— **瞬间对齐**，避免"从 0 滑回原位置"的假动画。
4. 恢复的是**作品下标 + 位置**；筛选状态本实现没有实现筛选功能（作品只有 6 件、无分类过滤），
   所以"筛选状态"一项记为不适用。

实测：`docs/acceptance.md` V8（返回到 index 2，`current == target == 2`）。

**详情页里切上一件/下一件**：同一个转场，另外做一次 `focus` 的"回落再起身"
（1 → 0.22 → 1），让新封面从浏览带位置重新接上舞台。

---

### M06 关于页（分段滚动叙事）

**触发**：窗口滚动（关于页**不接管滚轮**，`.page--scroll` + 原生文档滚动）。
**参与图层**：每个 section 铺 1–2 层 `[data-parallax]` 有机色块，以及 `[data-reveal]` 文本块。

| 效果 | 实现 | 起止状态 |
| --- | --- | --- |
| 前后景视差 | 每层按 `yPercent: strength → -strength`，`scrub: true`，触发器是所在 section 的 `top bottom → bottom top` | `strength` 取值：背景 −7/−9/−11、前景 +18/+22/+13 —— **前景比背景快** |
| 文字分段出现 | 每个 `[data-reveal]`（段落、流程卡、联系卡）各绑一个 `opacity 0→1, y 34→0`，`scrub: 0.5`，`start: top 92%`、`end: top 76%` | 见实测 V10：opacity 从 0 逐段走到 1 |
| 大标题逐字 | `[data-chars]` 在挂载时按字符拆成 `<span class="ch">`（中英文与空格都适用），`yPercent 108→0, opacity 0→1`，`stagger 0.055`，`toggleActions: play none none reverse` | 见 `docs/shots/08-about-top.jpg` |
| 右侧章节定位点 | `.about-nav` 初始 `opacity:0 + translateY(-36.5px)`（照搬 E18），滚过第一屏加 `.is-visible`；4 颗点由每段的 ScrollTrigger `onEnter/onEnterBack` 点亮，未选中 `scale(.6)`（E18） | 见 V10：`activeDot` 随滚动 0→3 |
| 底部进度条 | `height:3px`（E19），`transform: scaleX(progress)` | 见 V10：`scaleX(0) → scaleX(0.98)` |

**向上滚动能对应回退**（提示词明确要求）：
- 视差与文字出现全部用 `scrub` —— 它们**本身就是滚动位置的函数**，往上滚一定原路退回。
- 大标题用 `toggleActions: play none none reverse` —— 回退到起点之前会反向播回去。
  实测 V10：`up1` 帧的 reveal opacity 全部回到 `[0,0,0,…]`，`prog = scaleX(0)`，`activeDot = 0`。

**为什么用 scrub 而不是"进场动画"**：提示词要求"滚动向上时动画状态能对应回退，不只触发一次进场"。
一次性进场动画（`once: true`）做不到这件事；scrub 从机制上就保证了。

**纵向留白**：最后一个 section 底部留 `46vh` 滚动余量 —— 否则最下面几张卡片
永远到不了触发区间，会卡在"半出现"（实测时确实出现过，已修）。

---

### M07 微交互

| 元素 | 触发 | 起止状态 | 时长 / 缓动 | 来源 |
| --- | --- | --- | --- | --- |
| 导航胶囊 | hover / 当前路由 | `::after` 描边：`opacity 0→1`，`scale(.9)→scale(1)`；当前项 `font-weight 800` 且胶囊常显 | `.15s ease-in-out` | 【已观察】E04 |
| 顶栏换色 | 路由变化 | `color` 在墨色 `#171717` ↔ 奶油 `#feece3` 之间过渡 | `.4s`；纯首页时 `delay .6s` | 【已观察】E02/E03 |
| 首页 CTA | hover / active | `background` 墨↔奶油互换 + `translateY(-3px) scale(1.02)`；按下 `scale(0.985)` | `0.18s` | 【拟定】 |
| 胶囊条按钮 | hover / active | 背景 `rgba(cream,.14)` + `scale(1.06)`；按下 `scale(0.94)`；`disabled` 时 `opacity .3` | `0.18s` | 【拟定】 |
| 胶囊条 | 切换作品 | `y: 10 → 0` 轻微回弹 | `0.34s power3.out` | 【拟定】 |
| 首页圆盘 | 常驻 | `rotate 0 → 360deg` 线性自转 | `26s` | 【本实现适配】（参考站 `home__vynil` 是个镜像 SVG，是否自转未确认） |
| 链接/按钮下划线 | hover | `.app-footer a:after{transform:scaleX(0→1)}` | 【已观察】E02 同文件里读到，本实现未使用（没有 footer） |
| 404 页 | 路由不匹配 | 静态说明 + 返回入口 | — | 【本实现适配】 |

**没有堆叠的装饰动画**：参考站里 `surprise`（彩蛋弹窗）、`cookie-popin`、
`goofyAnimation`、`spinning-cube` 这些**没有复现** —— 它们与"作品集浏览"这条主链路无关，
提示词也要求"未观察到的效果先列为拟定，不自行堆叠装饰动画"。

---

## 三、参数来源总表

`src/config/motion.ts` 里每条都有 `src`，这里给汇总：

| 分组 | 项 | src |
| --- | --- | --- |
| 时间 | `headerColor .4s`、`headerColorDelayOnHome .6s`、`navPill .15s` | 已观察（E02/E03/E04） |
| 时间 | `routeTransition 1.05s`、`uiFeedback .18s`、`revealDuration .7s`、`revealStagger .055s` | 拟定（提示词起点） |
| 时间 | `posterSettleTau .22s`、`bendRelaxTau .4s`、`wipeCoverAt .52` | 未验证（U1/U2/U3） |
| 横移 | `wheelStepThreshold 140` | 已观察（E10：120 不动、600 动） |
| 横移 | `dampingPerSecond 7.2`、`velocitySmoothing 9`、`touchStepPx 48`、`keyStep 1` | 未验证 |
| 形变 | `segments 64`、`maxTiltDeg 9`、`bendFlip -1` | 拟定 |
| 形变 | `neighborTiltDeg 9`、`neighborScale .54`、`neighborOffset .84`、`neighborOpacity 1` | 已观察（E13） |
| 形变 | `maxBend .11`、`maxDepth .065`、`heightVariation` 相关 | 未验证（U2；量纲与参考站不同） |
| 形变 | `velocityRef 3` | 已观察量纲 + 本机实测（E15 + acceptance V2） |
| 背景 | `blobRadius [.42,.66]`、`grain .055` | 已观察（E16/E17） |
| 背景 | `colorLerpPerSecond 3.2`、`blobDrift .16`、`maxDpr 1.75` | 未验证 |
| 布局 | `headerTop 10`、`headerLinkOffset 130`、`wordmarkWidth 140/100`、`creditFontSize 6.6`、`navFontSize 15`、`navPillRadius 25`、`navPillBorder 1.5`、`edgeBlocker 30`、`aboutDot 9 / .6 / -36.5`、`aboutProgressHeight 3`、`controlBarHeight 80`、`controlBarScale .95` | 已观察（E05/E06/E08/E11/E18/E19） |
| 布局 | `minTouchTarget 44` | 拟定（提示词要求；本机实测 44/54px，见 acceptance V11） |
| 色板 | `ink #171717`、`cream #feece3`、`paper #fff6f0`、`pink #f1abbd`、`amber #ffcc8e`、`yellow #f7c704` | 已观察（E01/E20–E23） |

---

## 四、技术栈说明（与提示词推荐的一处差异）

提示词推荐 `React + TypeScript + Vite + GSAP + Three.js`，本实现**按推荐执行**：
React 18 + TypeScript + Vite 5 + GSAP 3.15（含 ScrollTrigger）+ Three.js 0.169。

但需要说明：**参考站实际不是 Three.js，而是 OGL + 自写 GLSL**（E14），
并且带一个 Navier–Stokes 流体求解器（E14/E15）。本实现：
- 用 `THREE.PlaneGeometry(64×64)` + 自写 `ShaderMaterial` 达到**等价的分段网格顶点变形**；
- 把参考站"UV 空间旋转畸变"改成"顶点空间位移 + 法线重算"，观感更实（纸真的起伏了）；
- **没有移植流体求解器**，改用简单噪声 + 速度包络近似它的强度调制作用。

这是有意的取舍：流体求解器对"作品集浏览"这条链路的观感增益，抵不上它带来的
代码量、性能开销与调试成本。已记为【未验证】U2。

---

## 五、还没做到 / 待验证清单

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 转场精确时长与缓动对齐参考站 | 待验证 U1 | 参考站在 WebGL 内完成，测不到；本实现是自定 1.16s |
| 阻尼系数对齐参考站 | 待验证 U3 | 只能确认"分格 + 平滑收敛"这一行为 |
| 封面弯曲幅度/曲线对齐参考站 | 待验证 U2 | 量纲不同，只做了视觉对照 |
| 流体模拟驱动的背景扰动 | 未复现 | 用噪声近似，见上 |
| 参考站彩蛋 / 语言切换 / 全屏 | 未复现 | 与主链路无关，按提示词不堆叠 |
| 关于页视差倍率对齐参考站 | 待验证 U6 | 只确认了"前后景不同速" |
| 作品筛选状态 | 不适用 | 本实现无筛选功能；"恢复筛选状态"因此无对应项 |
| 真实素材（封面 / 视频 / 履历文案） | 待替换 | 全部是占位内容，见 README「素材替换」 |
| 真实 GPU 上的帧率 | 待验证 | 本机无独立浏览器可用，全部实测跑在 SwiftShader 软件渲染上 |
