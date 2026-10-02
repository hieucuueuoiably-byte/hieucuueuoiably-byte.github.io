# 验收报告 — v4

> 前版历史记录。接入 `zucai` 真实素材后的当前验收见 [真实视频版验收记录](own-videos-acceptance.md)，不要将本文件中的版本指纹、弯曲幅度和旧转场验收用于当前版本。

> **验证版本**：`v4` · 源码指纹 `sha256[:16] = 965358df6ac8143d` · 构建时间 2026-09-30 14:05 (+08:00)
>
> **v4 相对 v3 的改动**：① 修 StrictMode 下视频 src 被清空；② 键盘按页面拆作用域；
> ③ 修速度采样锚点（按钮/键盘切换的弯曲原本恒为 0）；④ 进度条聚焦时方向键只调进度；
> ⑤ 用**真 GPU** 重新标定 `wheelDeltaPerStep`（480→400）与 `velocityRef`；
> ⑥ **纠正上一版的一个错误结论**：本机并非只能软件渲染（见 C 块）。
>
> **v4 的验证分开发服务与生产预览两套环境分别做**（v3 只在生产预览上做过）：
> `npx vite dev`（React StrictMode 生效，effect 会 setup→cleanup→setup）
> 与 `npx vite preview`（构建产物）。两套都要过 —— 只在其中一套通过不算通过。
> 指纹由这 12 个文件的内容拼起来算：`App.tsx` `navController.ts` `useNav.ts` `videoController.ts`
> `motion.ts` `WorksScene.ts` `CoverMaterial.ts` `BackgroundMaterial.ts` `transition.ts`
> `WorkDetailPage.tsx` `works.ts` `global.css`
>
> **本报告的截图/录屏全部是该版本重新生成的**（`docs/shots/` 下所有文件 mtime ≥ 12:28；
> v4 新增的双环境与手感样片在 `docs/verify/`，mtime ≥ 13:50）。
> 上一版（v2，修复前）的证据已移到 `../_reference-scratch/archive-shots/v2-20260930-AM/`，
> `docs/verify-v1-20260930-AM/` 是同期的旧验收数据 —— **都不作为本版本的证据**。

本报告按三块分开写，因为它们的可信度不一样：

| 分块 | 可信度 |
| --- | --- |
| **A 功能正确性** | 高。与渲染后端无关，结论可直接采信 |
| **B 动效相似度** | 中。结构/数值来自参考站源码与实测；视觉相似度是并排对照的判断，不是像素级拟合 |
| **C 性能** | 低。本机只有 SwiftShader 软件渲染可用，**帧率数字不代表真机** |

复现命令：

```bash
npm run build                                  # tsc -b && vite build
npx vite preview --port 4321 --strictPort --host 127.0.0.1
node docs/probe/03-self-check.js               # A 块的逐项自检（输出见 03-self-check.log）
node docs/probe/07-verify-nav.js               # 横移机制专项
node docs/probe/08-verify-render.js            # 渲染级验证（uniform 读回 + 像素 A/B）
node docs/probe/09-verify-transition.js        # 转场时长与配置联动
```

> 本机 4173 端口被其他程序占用，预览请用 4321；开发服务用 5199。
> 另外：**`npm run build` 之前要先停掉 `vite preview`**，否则 Windows 下 `dist/videos` 句柄被占用会报 `EPERM`。
>
> 双环境验证：`node docs/probe/11-verify-dual-env.js`、`node docs/probe/12-verify-keyboard.js`、
> `node docs/probe/13-verify-slider-keys.js`、`node docs/probe/14-tune-on-gpu.js`
> （后两个需要 `--use-angle=d3d11` 走真 GPU）。

---

## A · 功能正确性

### A1 逐项检查

| # | 检查项 | 结果 | 证据 |
| --- | --- | --- | --- |
| A1 | 滚轮：单次 120 不动 | **通过** | 位移 0.25 格 < 半格 → 吸附回原格，`{cur:0, tgt:0, sel:0}` |
| A2 | 滚轮：5×120 前进一格 | **通过** | 累计 1.25 格 → 吸附到 1，`{cur:1, tgt:1, sel:1}` |
| A3 | 滚轮：3×(−120) 退回一格 | **通过** | 从 2 起 → `sel:1` |
| A4 | 滚轮是连续自由滚动（不是"一次手势一格"） | **通过** | 2×600（2.5 格位移）→ 跨 2 格，`sel:2`；单次 6000 可跨多格 |
| A5 | 按钮 / 键盘切一格用补间（0.4s cubic.out） | **通过** | 轨迹在 486ms 内到达目标并停稳（含 ~110ms 帧量化） |
| A6 | 键盘方向与参考站一致 | **通过** | ArrowDown=上一格、ArrowUp=下一格、ArrowLeft=上一格、ArrowRight=下一格 —— 四项全对 |
| A7 | 首尾边界：越界被阻尼顶回、不回绕 | **通过** | 末格再往前滚：目标最大越界 5.0443 → 精确停在 5；首格反向 → 停在 0 |
| A8 | 连续切换 10 次不失控 | **通过** | 从 0 连发 10 次 → 稳定停在末格，无越界、无残留速度 |
| A9 | 切换中反向 | **通过** | 速度符号在采样窗口内翻转，位置轨迹无回弹振荡 |
| A10 | 返回后恢复之前选中的作品与位置 | **通过** | 在 index 2 进详情 → 返回 → `{cur:2, tgt:2, sel:2}`，`snapInstant` 瞬间对齐 |
| A11 | 刷新页面恢复上次看的那一件（照参考站 `localStorage['last-chapter']`） | **通过** | 存 3 → 刷新 → `sel:3` |
| A12 | 直接打开详情页 URL | **通过** | `/works/paper-city` → 舞台模式、封面接续、标题/控制条/URL 三者一致 |
| A13 | 转场：路由切换发生在被遮挡的那一帧 | **通过** | 排程 `coverAt = routeTransition × 0.54`；实测切换时刻 639–832ms（含换页那一帧的阻塞） |
| A14 | 转场时长真的由 `routeTransition` 驱动 | **通过** | 1.05s → 排程 coverAt 0.567s / 总长 1.113s；1.8s → 0.972s / 1.908s，**精确按 1.714 倍等比缩放**，墙钟同步变化 |
| A15 | 背景「位置→颜色」在半格处连续 | **通过** | 停在 0.5 时取到 50/50 混合色 `eec2be`；正向/反向扫描最大相邻步色差 12（出现在采样最粗的 0.85→1 段），跳变比 1.67 —— **半格处无跳变** |
| A16 | 旧写法（`round` 取整）确实会跳色 | **通过（对照）** | 同一组色值下：旧写法最大相邻步色差 **37**（跳变位置正好在 0.49→0.50），新写法 **5** |
| A17 | 竖屏视频的舞台比例不被破坏 | **通过** | 9:16 → 舞台 297×528，实际比例 0.5625（修复前是 998×528 / 1.89）；16:9 → 939×528 / 1.7778；1:1 → 528×528 |
| A18 | 视频：首次播放 / 进度 / 暂停 / 拖动 | **通过** | 点播放 → `paused:false, currentTime 0.42, duration 8, readyState 4`；1.6s 后 3.48；暂停 → `paused`；拖到 60% → `currentTime 4.8 / 8` |
| A19 | 换作品时旧视频停播、新视频可播 | **通过** | src 切到 `test-9x16.mp4`、旧视频 `paused:true`、`currentTime` 归 0；竖屏片可播（1.25s / 6s） |
| A20 | 切到无视频作品 / 离开详情页 | **通过** | 无视频：`video` 元素移除、显示「视频待添加」、播放键 `disabled`、`playbackState:'missing'`；离开：`idle`、`playbackIndex:-1` |
| A21 | 减少动态效果：封面**完全**无形变 | **通过** | 即使把速度钉在 +3，`bend/bendMag/tiltY/roll/depth/lineVel` **全部为 0**；对照普通模式同条件为 `bend:-0.0175, bendMag:0.5, depth:0.0141` |
| A22 | 普通模式确有弯曲（不是被误关） | **通过** | 同上对照；静止时 `bend:0, depth:0.0062`（只剩极轻纸面起伏），运动中明显起效 |
| A23 | 关于页滚动 + 向上滚可回退 | **通过** | 向下：`activeDot 0→3`、进度 `scaleX(1)`、11 个 `[data-reveal]` 全到 `opacity 1`、4 层视差位移各不相同；回滚到顶：全部复位为 0 |
| A24 | 窗口缩放 | **通过** | 1440×900 → 900×640 → 390×844 重新布局正确；竖屏走 `width×0.74` 分支，封面 289px |
| A25 | 移动端触控目标 ≥44px | **通过** | 390×844 实测：播放键 54×54、前后键 44×44 |
| A26 | 移动端横滑 + 轻扫 | **通过** | 拖拽 1:1 跟手；抬手位移 >30px 且时长 <400ms 判定轻扫，补间 0.3s power2.out |
| A27 | WebGL 不可用时的静态版本 | **通过** | 6 张 DOM 卡片（复刻同一套风扇布局）、降级说明条、**可进入详情页**、控制台无错误 |
| A28 | 构建通过 + 无持续控制台错误 | **通过** | `tsc -b && vite build` 成功（62 modules，JS 834KB / gzip 251KB，CSS 23.4KB / gzip 5.6KB）；**主流程 + 降级 + 减少动态效果 + 视频页，控制台错误数 0** |

### A2 视频生命周期（v4 · 开发 + 生产两套都验）

复现路径：`/works/salt-horizon`（16:9 测试片）与 `/works/nine-lives`（9:16 测试片）。

| # | 检查项 | 开发服务（StrictMode） | 生产预览 |
| --- | --- | --- | --- |
| A2-1 | **首次打开详情页，`src` 未被清空** | **通过** — `src="/videos/_test/test-16x9.mp4"`，`readyState 4` | 通过 |
| A2-2 | **首次点播放能播** | **通过** — `paused:false, currentTime 0.24` | 通过 — 0.38 |
| A2-3 | **刷新详情页** | **通过** — src 仍在，可播 | 通过 |
| A2-4 | **暂停** | 通过 — `paused:true, playbackState:'paused'` | 通过 |
| A2-5 | **进度调整（点进度轨 60%）** | 通过 — `currentTime 4.80 / 8s` = 0.60 | 通过 |
| A2-6 | **切到 9:16 竖屏片** | 通过 — src 换、旧视频 `paused` 且归零、舞台 **297×528 / 0.5625**、标题变 02、可播 | 通过（同上） |
| A2-7 | **切回 16:9** | 通过 — 舞台 **939×528 / 1.7778**、标题变 01、可播 | 通过 |
| A2-8 | **离开详情页再返回** | 通过 — 离开时无 `video` 元素，返回后 src 在且可播 | 通过 |
| A2-9 | 控制台错误 | **0** | **0** |

**这一项为什么在 v3 是漏的**：v3 只在**生产预览**上验过（生产构建里 StrictMode 不会 double-invoke），
所以「开发模式首次打开 src 被清成 null」这条完全没被覆盖。这是"只在一个环境验证"的典型代价。

### A3 键盘作用域（v4 · 开发 + 生产两套都验）

判定方式：在页面里用**捕获阶段**监听 `keydown`，并在**宏任务**里读 `e.defaultPrevented` ——
那才是需求本身（"内容页保留正常键盘滚动" = 我们不能调 `preventDefault`）。
不靠滚动位置判定，因为 headless 下 `Home`/`End` 依赖焦点，会抖（实测两套环境各抖了一次，见下）。

**开发服务 与 生产预览 结果一致：**

| 页面 | 期望 | 实测（`defaultPrevented`） |
| --- | --- | --- |
| `/about` | 全部放行（原生滚动） | PageDown / PageUp / ↑ / ↓ / Home / End / 空格 **全部 false** ✓ |
| `/works/:slug` | 只接管 ←/→，其余放行 | ←/→ **true**；PageDown / PageUp / ↑ / ↓ / Home / End / 空格 **全部 false** ✓ |
| `/works` | 全部接管（这一页本来不可滚动） | ↑ / ↓ / PageUp / PageDown / Home / End / a / d **全部 true** ✓ |

| # | 检查项 | 开发 | 生产 |
| --- | --- | --- | --- |
| A3-1 | 关于页 PageDown/↑/↓ 原生滚动 | 通过（scrollY 0→1400→1520） | 通过 |
| A3-2 | 详情页 PageDown/↑/↓ 原生滚动 | 通过（0→700→820） | 通过 |
| A3-3 | 详情页 **←/→ 切作品并同步路由 + 视频 + 标题** | 通过 — `/works/salt-horizon`→`/works/nine-lives`，src 换、标题 01→02，左键回得来 | 通过 |
| A3-4 | **进度条聚焦时 ←/→ 只调进度** | 通过 — activeElement 确认是 `role=slider`；←×3 + →×1 → `currentTime 1.379→1.699`（+0.32 = 2×0.02×8s），**路由未变**，四键全被拦下 | 通过 |
| A3-5 | 反向验证：焦点在 body 时 ←/→ 应切作品 | 通过 | 通过 |
| A3-6 | 作品页 ↑/↓ 换作品且页面不滚动 | 通过 | 通过 |
| A3-7 | 控制台错误 | **0** | **0** |

**一处需要说明的抖动**：脚本里"按 Home/End 后读 scrollY"的写法在两套环境各失败过一次
（dev 的 `Home`、prod 的 `End`），而同一轮的 `defaultPrevented` 判定显示这些键**都被放行了** ——
这是 headless 下 `Home`/`End` 需要文档焦点、而脚本为了别的用例把焦点挪走了导致的测量抖动，
不是代码问题。所以**以 `defaultPrevented` 为准，滚动位置只作旁证**。

### A4 参考站输入机制的重测结论

上一版把 `wheelStepThreshold = 140` 标成 `observed`，依据是「单次 120 不动、五次 120 走一格」。
**这个推断是错的** —— 单点观测既不能证明阈值存在，也不能定出阈值大小。

本轮做了三件事：

1. **行为重测**（`docs/probe/wheel-warmup-probe.json`、`wheel-input-probe.json`）：扫了 delta ∈ {10…1600}、
   事件数 1–20、间隔 0–900ms、以及"干净页面 vs 先点过 CTA"等进入路径。
   结论：**行为高度依赖会话状态**，同一脚本 `01-probe.js` 能复现、新写的脚本不能，
   说明纯行为测量在这里不可靠。

2. **运行时取证**：参考站 `/chapters` 上有 4 个 `window` wheel 监听、
   **没有任何一处 `preventDefault`**、`body overflow:hidden`、`documentElement.scrollHeight == clientHeight`、
   没有任何可滚动容器 —— 所以滚动完全由 JS 接管；页面本身不可滚动。

3. **源码定位**（决定性）：逐 chunk 搜到真正的分页器 `class IQ`，读到完整逻辑：

```js
onWheel(e){ if(this.scrollIn) return; this.clearSnap(); this.targetX -= (e.deltaY + e.deltaX)/400 }
update(dt){
  …越界时 Ne(this,'targetX', 边界, 40, dt) 把 targetX 阻尼顶回…
  Ne(this,'currentX', this.targetX, this.state.lerp /*100，拖动 200*/, dt)   // 二阶临界阻尼
  this.targetVelocity.value = this.velocityTracker.update(this.currentX)     // 20 帧平均，钳 ±40
  this.calculateSnap()                                                       // 停稳 → snap 到最近一格
}
next(){ this.targetNav += 1; this.snap(this.targetNav, 0.4, 'cubic.out') }
snap(i, dur=0.3, ease='power2.inOut'){ gsap.to(this, {currentX: …, duration: dur, ease}) }
```

于是真相是：

| 问题 | 结论 |
| --- | --- |
| 有阈值吗？ | **没有**。每个滚轮事件都按 `(deltaY + deltaX)/400` 连续累加进目标位置 |
| 有冷却吗？ | **没有**。只有 `scrollIn`（入场动画期间）与 `isTweening` 两个门 |
| 有输入过滤吗？ | 没有筛选：`deltaY` 与 `deltaX` 是**相加**，不是"取较大者" |
| 那「一次 120 不动」是什么？ | **位移不够半个格子**，停稳后被 snap 吸回原来那一格 |
| 一次手势只能走一格吗？ | **不是**。位移够就能连跨多格（本实现实测 2×600 跨 2 格） |

**已把 `wheelStepThreshold` 从参数表里删掉**，替换为从源码读出的真实参数
（`wheelDeltaPerStep` = 400 × pitch、smoothTime 100/200、edgeSmoothTime 40、
velocity 时间窗 333ms、maxVelocity 40、以及四组 snap 的时长与缓动）。

### A5 仍然没能测准的（明确标注）

| 项 | 为什么 | 现状 |
| --- | --- | --- |
| `wheelDeltaPerStep = 480` | 参考站的世界单位与原生的"格"不同量纲，一格 = pitch 个世界单位；行为上只能界定 pitch ∈ (0.6, 1.8] | 取中值 1.2 → 480 px/格，**标 proposed** |
| `velocityRef = 6`（封面弯曲的速度参考值） | 参考站速度是"世界单位/秒"且钳在 ±40，与本实现"格/秒"不同量纲 | 按量纲换算取 6，**标 proposed**；软渲染帧率下测不出真机手感，需在真机复调 |
| 转场的**墙钟**耗时 | 换页那一帧要 `flushSync` 换路由 + 挂载新页面，软渲染下这一帧阻塞 0.5–1s | 只把**排程**当作权威（A14）；墙钟另列在 C 块 |
| 参考站转场的缓动曲线 | 在 WebGL 内部完成，DOM 采样不到 | 本实现自定，已标 unverified |

---

### A6 修掉的问题总表（v3 的 11 个 + v4 的 4 个）

| # | 现象 | 根因 | 修法 |
| --- | --- | --- | --- |
| F12 | **开发模式首次打开 `/works/salt-horizon`，视频 `src` 被清成 null**（生产预览不复现） | `<video src>` 是 React 管的属性；StrictMode 在开发下把 effect 跑成 setup→cleanup→setup。cleanup 里的 `unregister → teardown` 调了 `removeAttribute('src')`，而第二次 setup 时 React 认为 `src` 这个 prop 没变、**不会再写一遍** | `teardown` 里**完全不碰 src**，只做「摘监听 + 暂停 + 归零 + 清空控制器引用」。元素的卸载由 React 负责（`<video>` 从 DOM 移除时浏览器自己断开请求、释放解码器）。这样 effect 可以反复执行 |
| F13 | **关于页 / 详情页的 PageUp·PageDown·↑·↓·Home·End 被阻止**，原生滚动失效 | 这两页复用了作品页的键盘处理器（`keyboard: true`），它对所有方向键和翻页键都调 `preventDefault` —— 作品页那样做没问题（那页不可滚动），内容页就是抢滚动 | 键盘拆成三个作用域：`works`（全接管）/ `player`（**只**接管 ←/→）/ `none`（完全不碰）。详情页的 ←/→ 走 `stepDetail` 切路由，保证作品下标、视频源、标题一起同步 |
| F14 | **按钮 / 键盘切换作品时封面弯曲恒为 0**（实测 625 帧全 0），只有滚轮才有弯曲 | 速度采样在 `update()` 开头取 `prev = this.current`，而吸附补间是 GSAP 的 ticker 在**两次 rAF 回调之间**改 `current` —— 取 `prev` 时值已经被改过，每帧位移恒为 0 | 改成记**跨帧锚点**（上一帧末的值与时间戳），谁改的 `current` 都算。参考站也是这么做的：它测的是 `currentX`，不关心是谁推动的。修后按钮单步峰值速度 0 → **2.63~3.0** |
| F15 | 进度条聚焦时按 ←/→ **同时**调进度和切作品 | 进度条的 `onKeyDown` 没有 `stopPropagation`，全局处理器挂在 window 上照样收到 | 进度条的键盘处理加 `stopPropagation` + `preventDefault`，并支持 Home/End/空格；全局处理器把 `[role=slider]` 上的事件整体忽略（双保险） |
| F1 | `setReduceBend` 条件恒真 → **普通模式下弯曲也被关掉** | `env.reducedMotion \|\| !V.a11y.reducedMotionBend`，而 `reducedMotionBend = false`，`!false === true` | 参数改名 `bendDisabledOnReducedMotion`（语义与名字一致），并把判断收口到 `shouldDisableBend()` 一个函数里，调用侧只有唯一写法 |
| F2 | 减少动态效果下封面**仍有出平面起伏** | 只归零了 `uBend/uBendMag/uTiltY/uRoll/uLineVel`，漏了 `uDepth`（出平面）和 `uBreath`（静止呼吸） | 把这些量统一在一个 `if (reduceBend)` 分支里全部归零，实测全为 0 |
| F3 | 首次点播放**什么都不发生** | 详情的 effect 顺序是「先 register，再 `stopFor()`」，而 `stopFor` 会 `removeAttribute('src')`，把刚注册的元素清空了源 | `resetFor()` 只 pause + 归零、**不碰 src**（src 归 React 改）；清 src 只在 `unregister/teardown` 里做（元素要走了） |
| F4 | 换作品后再注册，监听挂不上 | `teardown()` 没把 `wired` 复位 | teardown 里一并 `wired = false`，且 register 的 effect 依赖只看 `playable`（元素是否在 DOM），不含 slug |
| F5 | 背景**在 .5 处跳色** | 用 `Math.round(current)` 取索引，跨过 .5 时索引跳一格、小数部分从 0.5 骤降为 0 | 改 `Math.floor` + 小数插值（`i0 = floor(pos)`、`frac = pos - i0`），并让色块尺寸/位置也由连续 `pos` 驱动 |
| F6 | 竖屏视频被压成横向（舞台 998×528） | `width: min(78vw,1600px)` 是确定值 + `max-height` 截断 → `aspect-ratio` 失效 | 把高度上限折进宽度：`width: min(78vw, 1600px, calc(66vh * var(--ar)))`，`--ar` 由 JS 传纯数字（分数形式不能参与 `calc`） |
| F7 | 自定义 ShaderMaterial 报 `redefinition`，画面全黑 | `position/uv/modelViewMatrix/projectionMatrix` 由 Three.js 自动注入，我重复声明了 | 删除重复声明并加注释说明 |
| F8 | 封面整体**偏暗一大截** | 自定义 ShaderMaterial **不会**自动做输出色彩空间转换，sRGB 纹理解码成线性光后被直接当 sRGB 写出 | 两个片元着色器末尾加 `#include <colorspace_fragment>` |
| F9 | 封面只显示中间一条横带、上下被拉平 | UV 位移项漏乘强度包络 `amp`：静止时旋转是单位矩阵但 `centered*2` 仍被加上，`wuv = 3·uv − 1` 出界被 clamp | 整项乘 `amp`，且 `amp ≤ 0.0005` 时直接跳过。**教训：任何形变项都必须在强度为 0 时严格退化为 0** |
| F10 | 改 `maxBend` 毫无反应，封面被搅成漩涡 | `uBend` 直接吃的是归一化的 ±1，`maxBend` 这个参数**根本没参与运算** | 分离三个量：`bendSign`（方向 ±1）、`bendMag`（0..1 包络，驱动 UV/高光/条纹）、`uBend = bendSign × maxBend`（几何幅度） |
| F11 | 自动吸附永远不触发（`|vel|` 降不下来） | 速度用"最近 20 **帧**"取平均；软渲染 9fps 时要 2.2 秒才衰减到 0 | 改成按**时间窗**（333ms = 20 帧 @60fps）取平均 —— 60fps 下与参考站等价，低帧率下不失真 |

## B · 动效相似度

逐项并排对照见 **`docs/reference-compare.html`**（含参考站截图与本版本截图并排 + 逐项判定表）。
参考站截图取自公开站点，版权归原作者。

### B1 相似度分级

| 级别 | 含义 | 项 |
| --- | --- | --- |
| **一致（数值来自参考站源码或实测）** | 机制与参数都对得上 | 滚轮输入公式（连续累加、无阈值）、二阶阻尼 smoothTime 100/200、越界顶回 40、速度时间窗、四组 snap（0.4 cubic.out / 0.3 power2.inOut / 0.6 cubic.out / 0.3 power2.out）、键盘映射、`localStorage` 记忆、顶栏胶囊数值、顶栏换色与首页 600ms 延迟、两侧链接 `calc(50%±130px)`、首屏加载层构图、风扇布局四个数值、邻封压暗、背景双色 + 硬边圆 + 颗粒采样保持、UV 位移的 `vUv.y` 加权结构、关于页定位点与进度条数值、色板 |
| **适配（功能形态不同，按提示词做的对应设计）** | 机制一致但对象不同 | 内容模型（漫画 → 影像作品集）、进入作品的海报接续、跨路由共享控制条、视频比例与播放控制、形变三通道权重（法线高光替代参考站的法线贴图）、关于页文字分段方式、首页分层舞台、触屏/鼠标拖拽 |
| **未对齐（明确没做到）** | 有差距且未解决 | 流体模拟（参考站用 Navier–Stokes 驱动背景与封面扰动，本实现用噪声 + 速度包络近似）、参考站的角色插画资源、转场缓动曲线的标定 |

### B2 形变形态的校准（本轮的主要改动）

参考站截图（`docs/reference-shots/R4-chapters-after-wheel.png`）显示的运动形态是：

- **封面轮廓基本是直角矩形** —— 几何弯曲几乎看不出来
- 画面内部有**斜向的浅色波纹** —— 来自 GLSL 119 的 normal map + 定向光
- 邻封被压暗、画面内旋转 ±9°

上一版把几何弯曲当成主要表现手段，结果封面被搅成漩涡、轮廓都不方了。本轮把权重重新分配：

| 通道 | 参数 | 值 | 依据 |
| --- | --- | --- | --- |
| 几何顶点位移（提示词要求保留） | `maxBend` / `maxDepth` | 0.035 / 0.022 | 压到"边缘位移 ≤2% 海报宽、肉眼仍是方块"，与参考站轮廓一致 |
| UV 位移（参考站 GLSL 93 的机制） | `uvRipple` / 加权 | 0.012 / 乘 `vUv.y` | 参考站约 1% 量级；**位移必须乘强度包络，静止时为 0** |
| 法线高光（替代参考站 normal map） | `bump` / `lightingMix` | 0.62 / **0.42** | `lightingMix` 直接取参考站 GLSL 119 的原值 0.42；定向光方向也照抄 `normalize(0.5 - progress*0.4, 0.5, 1.0)` |
| 动态侧倾 | `maxTiltDeg` | 5° | 不抢邻封那 9° 的静态倾斜 |

实测（`docs/verify/verify-results.json`）：静止 `bend 0 / depth 0.0062`；速度 +3 时
`bend −0.0175 / bendMag 0.5 / tiltY −2.5°`；速度 −3 时符号全部翻转。

### B3 参数来源统计

`src/config/motion.ts` 里每条参数都带 `src` 字段，三种取值：
`observed`（参考站实测或源码读出，注释标 `E-source：…` 或 `E01…E23`）/
`proposed`（提示词起点或量纲换算）/
`unverified`（参考站那侧测不到）。

---


### B4 手感标定（v4 · 真 GPU）

#### wheelDeltaPerStep：扫六档，用「几个滚轮格 = 一件」定标

标准鼠标滚轮一格 = `deltaY 100`。固定手势 = 连续 n 格、间隔 55ms，之后等 2.2s 让它吸附完。

| wheelDeltaPerStep | 1 格 | 2 格 | 3 格 | 5 格 | 8 格 |
| --- | --- | --- | --- | --- | --- |
| 240 | 0 | 1 | 1 | 2 | 3 |
| 320 | 0 | 1 | 1 | 2 | 2 |
| **400（采用）** | 0 | 0 | 1 | 1 | 2 |
| 480 | 0 | 0 | 1 | 1 | 2 |
| 600 | 0 | 0 | 0 | 1 | 1 |
| 720 | 0 | 0 | 0 | 1 | 1 |

- 约束：**单格不过件**（小位移要被吸回，与参考站一致）+ **一次干脆的手势过一件**。
  满足的是 400 / 480 / 600 / 720，其中 400 与 480 的行形状完全相同。
- **采用 400**，理由：它等价于把参考站公式 `(deltaY+deltaX)/400` 里的 pitch 取 **1.0**（最简读法），
  而 pitch 的行为区间是 (0.6, 1.8]（对应 240–720 px/格），400 在其中；同时 3 格就能过一件，手感不拖。
- 想要更"重"：调到 600（8 格才过一件）。**运行时就能试**，不用重新构建：

```js
__tune.set('nav.wheelDeltaPerStep', 600)   // 控制台里直接改
__tune.read()
```

#### velocityRef：保持 6，但依据从"量纲换算"换成"真机实测"

| 输入 | 峰值速度（格/秒，333ms 窗口平均） | bendMag（velocityRef=6） |
| --- | --- | --- |
| 按钮 / 键盘单步（0.4s cubic.out 走 1 格） | **2.63–3.00** | 0.44–0.50 |
| 一次滚轮手势（5 格） | **3.00** | 0.46 |
| 连续快速滚动（10 格） | **8.40** | 1.00（饱和） |

参考站那边：它的速度同样是 20 帧（≈333ms）滑动平均，一次 0.4s 走一格的补间换算成平均速度
≈ 3×pitch ≈ 3–5.4（pitch 1–1.8），落在它自己 `cmap(|v|, 0, 10, ...)` 区间的 **0.3–0.54**。
取 `velocityRef = 6` 时本实现的单步是 **0.50** —— 正好落在参考站的同一比例带里，
而快速滚动能饱和到 1.0。所以这个值现在是**有实测支撑**的，但仍标 `proposed`
（因为两边的速度量纲终究不同，只能按等效占比对齐）。

> **顺带修掉的一个真 bug**：标定之前，按钮/键盘切换的峰值速度实测是 **0**（625 帧全 0），
> 也就是说**只有滚轮切换才有弯曲**。原因是速度采样在 `update()` 开头取 `prev = current`，
> 而吸附补间是 GSAP 的 ticker 在两次 rAF 回调之间改 `current` —— 取 `prev` 时值已被改过。
> 改成跨帧锚点后单步峰值 0 → 2.63~3.0。这条是**因为做了硬件加速、把帧率提上去才暴露出来的**：
> 软渲染 9fps 时帧间隔 110ms，误差被糊掉了。

#### 与参考站的并排录屏：**没能做成，原因如下**

要求的是"用硬件加速浏览器并排录屏"。真 GPU 拿到了（RTX 3060 / d3d11，240fps），
但**参考站那一侧的分页滚轮在自动化环境里驱动不起来**：

- 真 GPU 下重跑了 v1 的三组观测与更激进的组合 —— 单次 120 / 5×120 / 3×(−120) /
  单次 600 / 2×600 / 单次 1600 / 12×300 / 20×(−300)，**下标一次都没变**
  （`docs/verify/reference-gpu-probe.json`，页面本身 240fps 在正常渲染，控制台无错误）。
- 而最早那一版脚本 `docs/probe/01-probe-home-chapters-about.js` **至今仍能复现**滚动。
  两者只差在"进入路径与交互历史"，所以这是**会话状态相关**的差异 —— 我尝试过
  干净页面 / 先点空白 / 先点 CTA / 先点海报 / 长等 60s / 键盘 / 换后端，都没能稳定复现。
- 结论：**参考站的运动录屏这一项做不了**（不是没做，是做不到）。
  参数对齐改走源码级（见 B3 与 `docs/probe/reference-pager-excerpts.md`），
  这比行为观测更可靠；手感对齐改走"等效占比"（上一小节），
  并留了 `__tune` 让你自己边转滚轮边捏。

本实现这一侧的手感样片在 **`docs/verify/tune-hands-on.mp4`**（真 GPU，22.6s）：
按「单格不过件 → 一次手势过一件 → 快速滚动连跨 → 按钮/键盘单步 → 反向滚回」的顺序连续演示。

## C · 性能

> ⚠️ **先纠正上一版的一个错误结论。** v3（以及更早）写的是"本机没有可用的独立显示驱动、
> 只能软件渲染"。**这是错的** —— 实测 Chromium 用 `--use-angle=d3d11`（或不指定后端）就能拿到
> **NVIDIA GeForce RTX 3060 Laptop GPU**：
>
> ```
> --use-angle=swiftshader → ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
> --use-angle=d3d11       → ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU (0x00002520) Direct3D11 vs_5_0 ps_5_0, D3D11)
> 不指定后端             → 同上（NVIDIA D3D11）
> ```
>
> 所以 v4 的性能与手感数据全部改用**真 GPU** 采集。前几轮基于软渲染得出的
> "时间点测量会偏大""只有 9–14fps"之类的限定，从此只对显式指定 SwiftShader 的场合成立。
>
> 另外注意：**headless 下 Chromium 不做垂直同步**，rAF 实测 **240fps**，
> 所以"帧率"这个数字在 headless 里没有意义（它反映的是不设上限时的吞吐）。
> 真正有意义的是**墙钟时间**（GSAP 按真实时间推进）与**每帧位移**，下面报的都是后者。

### C1 帧率（仅作基线，不代表真机）

| 场景 | 真 GPU（RTX 3060 / d3d11） | 软件渲染（SwiftShader，仅作对照） |
| --- | --- | --- |
| 作品页静止（7 个封面 + 背景） | **240fps**（headless 无 vsync，即"跑满"） | ~12fps |
| 作品页运动（满弯曲） | 240fps（无法从帧率看出代价，见下） | ~9fps |
| 转场：换页那一帧的阻塞 | 需在真机上用 Performance 面板复核（headless 测不了长帧分布） | 0.5–1.0s |

**注意这个数字不能当"性能很好"的证据**：headless 不 vsync，240fps 只是"没有被限速"。
要判断真机是否能稳 60fps，需要在**有头**浏览器里看 Performance 面板的帧时间分布 ——
这一项**仍未验证**，因为本机只能跑 headless。

### C2 与渲染相关的开销控制（已实现）

- 渲染像素比上限 `1.75`（`bg.maxDpr`），封顶避免高分屏把 GPU 打满
- 封面贴图用线性过滤、**不生成 mipmap**（封面接近 1:1 显示，省一次上传与显存）
- 标签页隐藏时暂停渲染循环（`visibilitychange`）
- 关于页/首页把 WebGL 背景收掉（`uFade → 0`），减少无效绘制
- 封面网格 64×64 = 4225 顶点；「≥±3」的封面不绘制
- `WorksScene.dispose()` 释放几何/材质/贴图；所有 `addEventListener` 都在对应 effect 的清理函数里移除；GSAP 用 `gsap.context()` 包裹并 `revert()`

### C3 首屏与资源体积

| 项 | 值 |
| --- | --- |
| `dist/assets/index.js` | 834 KB（gzip **251 KB**） |
| `dist/assets/index.css` | 23.4 KB（gzip **5.6 KB**） |
| `dist/index.html` | 1.17 KB |
| `dist` 总体积 | 5.3 MB（其中测试视频 4.6 MB） |
| 依赖 | react 18.3.1 / react-dom 18.3.1 / react-router-dom 6.30.6 / gsap 3.15.0 / three 0.169.0 |
| 构建耗时 | ~2.5–3.5s（62 modules） |

### C4 已知的性能风险

1. **弯曲需要 3 次 `deform()` 求值**（1 次位移 + 2 次中心差分求法线），每顶点 3×`snoise`。
   在弱 GPU 上可能是最大开销。若真机帧率不够，第一优先是把 `segments` 从 64 降到 32（顶点数 1/4）。
2. **背景的 fbm 用了 3 个八度**，全屏像素级开销；真机通常无压力，低端移动端可考虑降到 2。
3. **颗粒在片元里算两层 hash**，全屏；参考站也这么做（E17），暂不优化。
4. 转场里 `flushSync(navigate)` 会产生一次同步重挂载 —— 这是"必须被遮挡住才换页"的代价，
   真机上几十毫秒量级，但**软件渲染下这一帧会阻塞 0.5–1 秒**（C1 的帧率数据一部分就是它造成的）。

### C5 `gsap.ticker.lagSmoothing(0)`

本轮显式关掉了 GSAP 的 lagSmoothing。原因：默认的 `lagSmoothing(500, 33)` 会在某帧卡住 >500ms 时
只把时间轴推进 33ms —— 对"切回标签页"是保护，但转场里换页那一帧本来就可能卡几百毫秒，
结果整条转场在墙钟上被拉长（实测 1.05s 的转场跑成 2.2s）。
关掉之后转场时长严格等于配置值（实测墙钟从 2119ms 降到 1625ms，剩余差额是真实的换页阻塞）。
代价是"标签页切回来时转场会瞬时补完"—— 1 秒的转场，这个代价可以接受。

---

## D · 证据清单

```
docs/
├── acceptance.md                 本报告（v3）
├── motion-spec.md                运动规格（逐动效：触发/起止/图层/方向/时间轴/缓动/中断）
├── reference-compare.html        ★ 与参考站的逐项并排对照（含判定表）
├── reference-shots/              对照图：R1–R8 = 参考站，M1–M8 = 本版本
├── shots/                        ★ 本版本的状态截图与录屏（mtime ≥ 12:28）
│   ├── 01-home-wide / 03-works-wide / 05-works-settled / 06-detail-wide / 07-detail-body
│   ├── 08-about-top / 09-about-mid / 10-about-bottom
│   ├── 11-mobile-works / 12-mobile-detail / 13-reduced-motion / 14-no-webgl
│   ├── transition/seq-01..15.jpg     首页→作品页转场连拍
│   ├── bend/fold-01..10.jpg          切换过程中的封面形变连拍
│   └── video/  flow-desktop.mp4（43.8s 桌面完整链路）/ flow-mobile.mp4（14.6s 手机）
│               contact-desktop.jpg / contact-mobile.jpg（缩略图总览，一张图看完流程）
├── verify/                       ★ 本版本的机器可读验证数据
│   ├── verify-results.json           渲染级：uniform 读回 + 背景连续采样 + 视频链路
│   ├── nav-mechanism.json            横移机制专项（10 项）
│   ├── A-bend-off / B-bend-forward / C-bend-reverse / A2-reduced-rest / B2-reduced-bend-requested.png
│   │                                 弯曲 A/B 像素对照（时间冻结，可复现）
│   ├── transition-timing-rt105.json  转场排程与墙钟（1.05s 配置）
│   ├── transition-timing-rt180.json  同上（1.8s 配置，用于证明配置真的驱动时间轴）
│   ├── dual-env-verify.json          ★ v4 开发 + 生产双环境：视频生命周期 + 键盘滚动
│   ├── keyboard-and-gl.json          ★ v4 键盘 defaultPrevented 权威判定 + GL 后端探测
│   ├── slider-keyboard.json          ★ v4 进度条聚焦时方向键只调进度
│   ├── gpu-tuning.json               ★ v4 真 GPU 扫 wheelDeltaPerStep + 速度峰值
│   ├── vel-trace-*.json              ★ v4 速度轨迹（按钮单步 / 5 格 / 快速 10 格）
│   ├── hands-on-script.json          手感样片每一步的下标
│   ├── tune-hands-on.mp4             ★ 手感样片（真 GPU，22.6s）
│   └── dual-{dev,prod}-*.png         双环境截图
└── probe/                        参考站实测脚本与原始数据
    ├── 01-probe-home-chapters-about.js + .log    第一轮实测（E01–E23 的来源）
    ├── 03-self-check.js + .log                   本版本 A 块自检
    ├── 07-verify-nav.js                          横移机制
    ├── 08-verify-render.js                       渲染级验证
    ├── 09-verify-transition.js                   转场时长
    ├── wheel-warmup-probe.json                   "为什么新脚本测不动"的实验
    ├── wheel-input-probe.json                    输入扫描（delta/事件数/间隔/冷却）
    ├── reference-glsl-excerpts.md                参考站着色器节选 + 本实现的用法差异
    └── reference-entry.css                       参考站样式表（E02–E06/E18–E23 的来源）
```

上一版的证据（不作为本版本依据）在 `../_reference-scratch/archive-shots/v2-20260930-AM/`
与 `docs/verify-v1-20260930-AM/`。

`docs/` 总体积约 49MB，其中 `reference-shots/` 15MB（参考站对照截图，PNG）、
`shots/` 19MB（本版本截图与录屏）。**参考站的完整源码与着色器转储没有放进仓库**，
只有被引用的片段（`docs/probe/reference-glsl-excerpts.md`、`reference-pager-excerpts.md`），
原样转储在 `../_reference-scratch/`。
