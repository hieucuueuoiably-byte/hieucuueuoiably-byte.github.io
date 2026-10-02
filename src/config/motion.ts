/**
 * 动画参数统一管理。
 *
 * 每个数值都带 `src` 字段说明来源：
 *  - 'observed'   : 在参考站 https://ponpon-mania.com/ 上实测得到（见 docs/motion-spec.md 的证据编号）
 *  - 'proposed'   : 官方提示词给出的拟定起点，未在参考站上验证
 *  - 'unverified' : 参考站对应行为无法测量（多为 WebGL 内部量），取与本实现自洽的经验值
 *
 * 当前目录导航手感使用此文件的 nav 参数。
 * homeCloud / homeExit / transitionParts 是旧版参数，当前双 RenderTarget 转场不再使用它们。
 * 当前转场时间轴在 src/lib/transition.ts；专辑尺寸、位置在 src/gl/WorksScene.ts。
 */

export type ParamSource = 'observed' | 'proposed' | 'unverified'

export interface Param<T> {
  value: T
  src: ParamSource
  /** 观察证据 / 推断依据 */
  note: string
}

const p = <T,>(value: T, src: ParamSource, note: string): Param<T> => ({ value, src, note })

export const MOTION = {
  /* ---------------------------------------------------------------- 时间(秒) */
  /** 路由转场总时长：舞台退场 → 前景遮挡 → 新内容接续，共用一条时间轴 */
  routeTransition: p(1.28, 'proposed',
    '提示词给的起点是 800–1200ms。参考站首页点 read now 的实测（docs/probe/18-…）：' +
    '点击后约 730ms 才开始出现遮挡，遮挡圆从 0 长到盖满屏幕约 390ms，粉色第二层再约 130ms，' +
    '到画面稳定约 1.5s。本实现把"画面自身开始动"到"新页面稳定"折成 1.28s：' +
    '上涌 ≈0.49s → 全遮住停 0.23s → 揭开 ≈0.56s。' +
    '中间那 0.23s 的停顿不是凑数：新页面第一次上屏（着色器程序 + 贴图上传）在真机上是几百毫秒的' +
    '长任务，必须让它落在"画面被完全盖住"的窗口里，否则揭开动画会被吃掉' +
    '（见 docs/verify/swap-profile.json 的 longtask 记录）'),

  /**
   * 首页 ↔ 作品的「云层转场」分工比例（详见 src/lib/transition.ts 的 runCloudTransition）。
   *
   * 云层 rig 的 yPercent 只走两个值：0（静止）→ -100%（盖满）→ -200%（完全让开）。
   * `coverAt` 与 `revealAt` 之间刻意留出空档 = 全遮挡的停顿，
   * 给新页面的首帧让路（这项是实测出来的，不是审美取中）。
   */
  homeCloud: {
    stageOutAt: p(0, 'unverified', '相对比例：插画分层退场的起始时刻'),
    stageOut: p(0.26, 'unverified', '相对比例：插画分层退场时长（与云层上涌重叠，不是先后关系）'),
    riseAt: p(0.04, 'unverified', '相对比例：云层开始上涌的时刻'),
    rise: p(0.34, 'observed',
      '相对比例。绝对值 = 1.28 × 0.34 ≈ 0.44s。参考站实测遮挡圆从出现到盖满约 390ms（18- 的半径曲线）'),
    coverAt: p(0.38, 'observed',
      '相对比例：画面被完全盖住、切路由的时刻。绝对值 ≈0.49s，' +
      '与参考站「遮挡开始后 390ms 盖满」同一量级'),
    revealAt: p(0.56, 'unverified',
      '相对比例：开始揭开。与 coverAt 之间的 0.18 是"全遮挡停顿"，专门留给新页面首帧'),
    reveal: p(0.44, 'unverified', '相对比例：揭开时长（0.56+0.44=1.00，整条转场刚好用完）'),
    enterAt: p(0.58, 'unverified', '相对比例：新内容接续的起始时刻'),
    enterIn: p(0.38, 'unverified', '相对比例：新内容接续时长'),
    /**
     * 云层 rig 的**总行程**（yPercent，负数 = 往上）。
     *
     * 几何来自 `.home-cloud` 的结构（见 components/HomeCloud.tsx）：
     *   云图本体 0–100%（实心部分 70.35–100%）、同色填充 100–200%、扇贝下沿到 203.4%。
     * 所以：
     *   -100% 刚好让画面被完全盖住（覆盖 −26.7% … 103.4%）
     *   -204% 让 rig 下沿越过画面上缘，完全让开
     * 改动其中任何一段的高度，都要同步改这个数。
     */
    travel: p(204, 'unverified', '= 100%（云图）+ 100%（填充）+ 3.4%（扇贝下沿）+ 0.6% 余量'),
  },

  /**
   * 首页插画分层的退场幅度。
   *
   * 「为背景、三个角色、标题和前景云分别编排动作，不再统一上移淡出」——
   * 每个层有自己的方向与时刻，数值集中在这里。
   */
  homeExit: {
    /** 整块插画推近的幅度（1 → 1+push）：镜头微微压上去 */
    push: p(0.055, 'unverified', '视觉拟合：太大会看到背景边缘被裁掉一块，太小又不像推镜'),
    /** 标题上抽的距离（占舞台高的百分比）与淡出 —— 最先被"抽走" */
    copyY: p(-30, 'unverified', '视觉拟合：向上抽出，与角色下沉方向相反，形成"幕布拉开"的错位'),
    /** 左侧浣熊下沉 */
    charLeftY: p(9, 'unverified', '视觉拟合'),
    /** 右侧摄影角色下沉 */
    charRightY: p(11, 'unverified', '视觉拟合'),
    /** 中间兔子导演下沉（略多一点，先沉左右、最后沉中间） */
    charCenterY: p(13, 'unverified', '视觉拟合'),
    /** CTA 下沉 */
    ctaY: p(12, 'unverified', '视觉拟合'),
    /** 三个角色之间的相对错位（占退场时长的比例） */
    charStagger: p(0.10, 'unverified', '视觉拟合：左右先退、中间的兔子最后走'),
  },
  /**
   * 转场内部各段的**占整条转场的比例**。
   *
   * 关键约束：`coverAt` 是"画面被完全盖住"的时刻，也就是路由切换的那一帧；
   * 路由切换时刻 = routeTransition × coverAt。改 routeTransition 会等比拉伸整条时间轴，
   * 所有比例不变 —— 所以调总时长不会破坏"必须在遮挡住之后才换页"这个前提。
   *
   * 比例之和刻意让整条转场刚好等于 routeTransition：
   *   coverAt(0.54) + enterAt(0.07) + enterIn(0.39) = 1.00
   */
  transitionParts: {
    /** 舞台退出：起始时刻 / 时长 */
    stageOutAt: p(0, 'unverified', '相对比例，配合 routeTransition 使用'),
    stageOut: p(0.32, 'unverified', '相对比例'),
    /** 遮挡层开始上涌的时刻 / 撑满所需时长 */
    wipeAt: p(0.12, 'unverified', '相对比例'),
    wipeIn: p(0.41, 'unverified', '相对比例；0.12+0.41=0.53，即 53% 处画面被盖住'),
    /** 补纯色的起始时刻与时长（堵住有机边缘的缝） */
    fillAt: p(0.42, 'unverified', '相对比例'),
    fillIn: p(0.09, 'unverified', '相对比例'),
    /** 路由切换时刻。必须 ≥ wipeAt + wipeIn */
    coverAt: p(0.54, 'unverified', '相对比例'),
    /** 遮挡层离场时长 / 补纯色离场延后 / 新内容接入起始与时长 */
    wipeOut: p(0.46, 'unverified', '相对比例'),
    fillOutDelay: p(0.06, 'unverified', '相对比例'),
    enterAt: p(0.07, 'unverified', '相对比例'),
    enterIn: p(0.39, 'unverified', '相对比例；0.54+0.07+0.39 = 1.00'),
  },
  /** 海报归位（阻尼收敛）时间常数 τ：render 每经过 τ 秒靠近 target 约 63% */
  posterSettleTau: p(0.22, 'unverified', '参考站的 pager 用渲染态平滑逼近目标态，实测只能确认是「一步一跳 + 平滑收敛」，收敛曲线无法采样（见 motion-spec 未验证项 U3）'),
  /** 按钮 / 微交互反馈时长 */
  uiFeedback: p(0.18, 'proposed', '提示词给的起点是 150–250ms，取中值'),
  /** 顶栏颜色过渡（参考站 CSS 实测：transition: color .4s） */
  headerColor: p(0.4, 'observed', 'E02：.app-header{transition:color .4s}'),
  /** 顶栏颜色过渡在首页上的延迟（参考站 CSS 实测：.page-index .app-header{transition-delay:.6s}） */
  headerColorDelayOnHome: p(0.6, 'observed', 'E03：.page-index .app-header{transition-delay:.6s}'),
  /** 导航胶囊 hover / active 的过渡（参考站 CSS 实测） */
  navPill: p(0.15, 'observed', 'E04：.app-header__link-text:after{transition:opacity .15s,transform .15s ease-in-out}'),
  /** 封面形变收敛时间：停止切换后弯曲回落的时间常数 */
  bendRelaxTau: p(0.4, 'unverified', '参考站弯曲由噪声+流体驱动、无明确"回零"参数；本实现用一个衰减的强度包络近似'),
  /** 关于页每段文字的出现时长 */
  revealDuration: p(0.7, 'proposed', '提示词要求"文字分段出现"，参考站用 SplitText 逐行，具体时长未测量'),
  /** 关于页逐行错位间隔 */
  revealStagger: p(0.055, 'proposed', '同上'),

  /* ---------------------------------------------------------------- 缓动 */
  ease: {
    /** 通用进出缓动（参考站按钮反馈用的就是 ease-in-out） */
    ui: p('power2.out', 'unverified', '参考站 CSS 用 ease-in-out；JS 侧缓动无法从产物中读取'),
    /** 舞台退场：先慢后快，让位移有"被抽走"的感觉 */
    stageOut: p('power3.in', 'unverified', '视觉拟合'),
    /** 新内容接续：带一点回弹 */
    stageIn: p('power3.out', 'unverified', '视觉拟合'),
    /** 遮挡层上涌 */
    wipeIn: p('power4.inOut', 'unverified', '视觉拟合'),
  },

  /* ---------------------------------------------------------------- 横移/惯性 */
  /* ---------------------------------------------------------------- 横移 / 惯性
   *
   * ⚠️ 这一组数值是照参考站产物里的 `class IQ`（章节分页器）重写的。
   * 旧版本写的是 "wheelStepThreshold = 140（observed）"，那是错的 ——
   * 它把「五次 120 走一格」当成了累加阈值，但参考站根本没有阈值：
   *   onWheel(e){ this.clearSnap(); this.targetX -= (e.deltaY + e.deltaX) / 400 }
   * 真正发生的是「位移不够半个格子 → 停稳后被 snap 吸回原来那一格」。
   * 所以旧的单点观测不足以支撑那个结论，已作废。
   */
  nav: {
    /**
     * 滚多少**像素**的滚轮位移等于一格。
     *
     * 参考站是 `targetX -= (deltaY + deltaX) / 400`，其中 targetX 是世界单位，
     * 源码YQ专辑间距为1.9，所以本项目序号单位的一格对应400×1.9=760像素。
     */
    wheelDeltaPerStep: p(760, 'observed', '公开源码IQ.onWheel除400世界单位，YQ/BQ专辑间距1.9；序号单位除数=760。见ponpon-public-source/excerpts/pager-cover.md'),

    /** 目标位置允许越界多少格（越界后由 edgeSmoothTime 顶回，不硬 clamp） */
    overshoot: p(0.35, 'unverified', '参考站不 clamp targetX，而是用 smoothDamp 顶回；这里给一个小的越界余量'),

    /** 拖拽：从世界单位换算为序号单位，pitch1.9。 */
    dragStepPerPx: p(0.005 / 1.9, 'observed', '参考站0.005世界单位/像素 ÷ 专辑间距1.9'),
    /** 轻扫（flick）判定的最小位移，单位像素（参考站 onMouseUp: |movement.x| > 30） */
    flickMinPx: p(30, 'observed', 'E-source：IQ.onMouseUp 里的 30'),
    /** 轻扫判定的最长时长，单位毫秒（参考站 Date.now() - downNow < 400） */
    flickMaxMs: p(400, 'observed', 'E-source：IQ.onMouseUp 里的 400'),

    /** 渲染位置跟随目标位置的 smoothTime（ms）。参考站 state.lerp 默认 100 */
    smoothTime: p(100, 'observed', 'E-source：IQ.update 里 Ne(currentX, targetX, state.lerp /* 100 */, dt)'),
    /** 拖动时的 smoothTime（ms）。参考站拖动中把 state.lerp 设成 200 */
    smoothTimeDragging: p(200, 'observed', 'E-source：IQ.update 拖动分支 n = 200'),
    /** 越界顶回的 smoothTime（ms）。参考站 Ne(targetX, 边界, 40) */
    edgeSmoothTime: p(40, 'observed', 'E-source：IQ.update 的 Ne(this,"targetX",0,40,t)'),

    /** 速度钳位上界，单位「格/秒」。参考站 VelocityTracker.maxVelocity = 40（世界单位/秒） */
    maxVelocity: p(40, 'observed', 'E-source：class al 的 maxVelocity = 40'),
    /**
     * 速度滑动平均的**时间窗**（ms）。
     *
     * 参考站是"最近 20 帧"（VelocityTracker.historySize = 20）。按 60fps 折算 = 333ms。
     * 这里改成按时间取窗而不是按帧数：低帧率（比如软渲染只有 9fps）下"最近 20 帧"要 2.2 秒
     * 才衰减到 0，会让"停稳"判定迟迟不满足、自动吸附永远不触发。
     * 按时间取窗在 60fps 下与参考站等价，在低帧率下也不会失真。
     */
    velocityWindowMs: p(333, 'observed', 'E-source：class al 的 historySize = 20 帧，按 60fps 折算为 333ms'),

    /* ---- 吸附（参考站的 snap）：这一组是补间，不是指数收敛 ---- */
    /** 按钮 / 键盘：上一格下一格。参考站 next()/prev() = snap(i, 0.4, "cubic.out") */
    snapStepDuration: p(0.4, 'observed', 'E-source：IQ.next/prev 的 0.4 与 cubic.out'),
    snapStepEase: p('cubic.out', 'observed', '同上'),
    /** 停稳后自动吸到最近一格。参考站 calculateSnap = snap(currentIndex, 0.3, "power2.inOut") */
    snapAutoDuration: p(0.3, 'observed', 'E-source：IQ.calculateSnap'),
    snapAutoEase: p('power2.inOut', 'observed', '同上'),
    /** 点海报 / 定位点直达：参考站 onChapterGoTo / clickSnap = snap(i, 0.6, "cubic.out") */
    snapGoToDuration: p(0.6, 'observed', 'E-source：IQ.onChapterGoTo 与 clickSnap'),
    snapGoToEase: p('cubic.out', 'observed', '同上'),
    /** 轻扫触发的一格：参考站 onMouseUp = prev/next(0.3, "power2.out") */
    snapFlickDuration: p(0.3, 'observed', 'E-source：IQ.onMouseUp 的 0.3 + power2.out'),
    /** 判定"已经停稳"的速度阈值（格/秒）。参考站 |targetVelocity| < 0.1 */
    snapVelocityThreshold: p(0.1, 'observed', 'E-source：IQ.calculateSnap'),
    /** 偏离最近一格超过多少才需要吸附。参考站 minDistSnap > 0.01 */
    snapMinDistance: p(0.01, 'observed', 'E-source：IQ.calculateSnap'),
    /**
     * 输入静默期（ms）：最后一次滚轮/拖拽之后这么久才允许自动吸附。
     *
     * 参考站的判定是「渲染速度 < 0.1」，但那个条件在事件间隔里就会被满足，
     * 于是每次事件的位移立刻被吸回、无法累加。实测参考站「单次 120 不动、五次 120 走一格」
     * 靠的正是多次事件的位移能累加，所以这里用静默期而不是速度阈值来等效实现，
     * 并且与帧率无关。130ms 约等于 60fps 下 8 帧。
     */
    snapQuietMs: p(130, 'proposed', '等效实现参考站的"停稳才吸附"，不依赖渲染速度恰好在帧间低于阈值'),
  },

  /* ---------------------------------------------------------------- 封面形变
   *
   * 三个通道的分工是按参考站的**输出形态**定的，不是"越明显越好"。
   * 参考站截图（docs/probe/… 里的 03-chapters-after-wheel）显示：
   *   · 封面**轮廓基本是直角矩形** —— 几何弯曲几乎看不出来
   *   · 画面内部有**斜向的浅色波纹** —— 那是 GLSL 119 用 normal map + 定向光做出的高光
   *   · 邻封被压暗，并且画面内旋转 ±9°
   *
   * 于是这里的权重是：
   *   uvRipple  UV 位移（参考站 GLSL 93 的机制）—— 主要能被感知到的"形变"
   *   bump      程序化法线 + 定向光（替代参考站的法线贴图）—— 产生画面内部的波纹
   *   maxBend / maxDepth  几何顶点位移（提示词要求保留）—— 幅度压到"轮廓仍是方的"
   */
  cover: {
    /** 网格分段数（提示词要求"有足够分段的平面网格"，不以 CSS rotate 冒充弯曲） */
    segments: p(1, 'observed', '目录使用薄盒BoxGeometry；此字段仅兼容旧配置，不再驱动分段平面'),

    /**
     * 封面绕 X 轴"向后仰"的角度（度）。
     *
     * 依据是参考站截图的**长宽比**，不是目测：R3/R4/R5 里中央封面都是
     * 426×380（显示像素，1080×675 的截图），换算成实际 568×507 —— 宽高比 0.892。
     * 封面素材本身是正方形，所以竖向被压掉了 10.8%，正好是绕 X 轴转
     * acos(0.892) ≈ 27° 在正交相机下的投影结果（正交相机下 rotateX 只表现为竖向压缩，
     * 不会产生透视收敛 —— 所以它**看起来只是"略微压扁"**，不会变成斜视）。
     */
    tiltXDeg: p(0, 'observed', '中央目录薄盒不固定后仰；实际Y/Z透视由WorksScene的位移决定'),

    /** 相邻海报的倾斜角（度）。参考站截图量到约 ±9°（E13） */
    neighborTiltDeg: p(9, 'observed', 'E13：截图里左邻逆时针、右邻顺时针各约 8–10°'),
    /** 相邻海报相对中央的缩放 */
    neighborScale: p(0.54, 'observed', 'E13：右侧海报宽约 306px / 中央 568px ≈ 0.54'),
    /** 相邻海报中心的水平偏移（占中央海报宽度的比例） */
    neighborOffset: p(0.84, 'observed', 'E13：右侧海报中心相对中央偏移约 477px / 568px ≈ 0.84'),
    /** 相邻海报的不透明度 */
    neighborOpacity: p(1, 'observed', 'E13：邻封完整可见、不透明'),
    /** 邻封压暗到多少（截图里左邻明显比中央暗） */
    neighborDim: p(0.84, 'observed', 'E13：对比截图，邻封亮度约为中央的 0.8 左右'),

    /* ---- 几何弯曲（顶点位移）：压到"轮廓仍是直角"的量级 ---- */
    /** 几何扭转强度（绕中心的旋转位移，量纲 = 海报宽度） */
    maxBend: p(0, 'observed', '原站目录d6/FQ无顶点弯曲，已移除旧纸张效果'),
    /** 出平面起伏（z 方向）占海报宽度的比例 */
    maxDepth: p(0.022, 'unverified', '同上：参考站看不出出平面鼓包，留一点点让几何法线有东西可算'),
    /** 侧向倾斜（绕 Y 轴，度）—— 切换时的动态侧倾 */
    maxTiltDeg: p(5, 'proposed', '提示词给的起点是侧倾 3–8°；取 5°，不抢邻封那 9° 的静态倾斜'),

    /* ---- UV 位移：参考站 GLSL 93 的机制，这里是主要可感知的一层 ---- */
    /** UV 位移最大幅度（占封面宽度的比例） */
    uvRipple: p(0.012, 'observed', 'E14 + 截图：参考站的内部波纹位移很小（约 1% 量级），是"隐约被推一下"而不是"被揉皱"'),
    /** UV 位移按 vUv.y 加权（参考站 GLSL 93 的两项都乘 vUv.y） */
    uvRippleYWeight: p(1, 'observed', 'E14：baseUV.x -= fluidColor.r * 0.007 * vUv.y —— 明确乘了 vUv.y'),

    /* ---- 法线高光：程序化凹凸代替参考站的法线贴图 ---- */
    /** 凹凸幅度 → 波纹高光的强度 */
    bump: p(0.62, 'unverified', '参考站用 normal map（GLSL 119 的 texture2D(tNormal)）；本实现用程序化高度场求法线，量纲不同'),
    /** 凹凸的空间频率（每张封面大约几条波纹） */
    bumpScale: p(9, 'unverified', '参考站法线贴图分辨率未知；9 对应"一张封面上约 6–8 条波纹"，与截图观感接近'),
    /** 定向光的混合强度（参考站 GLSL 119：color = mix(color, color*exposure(shadow+0.02,1.2), 0.42)） */
    lightingMix: p(0.42, 'observed', 'E14：参考站 GLSL 119 的 mix 系数就是 0.42'),
    /** 光源方向随进度偏移（参考站 GLSL 119：lightDir = normalize(vec3(0.5 - uProgress*0.4, 0.5, 1.0))） */
    lightProgressShift: p(0.4, 'observed', 'E14：参考站 GLSL 119 的原式'),

    /** 速度归一化参考值：|velocity| 达到它就取满强度 */
    velocityRef: p(6, 'proposed',
      '参考站用 cmap(|uVelocity|, 0, 10, 1, 4)（扰动）与 cmap(|uVelocity|, 1, 24, 0, 1)（暗线），' +
      '速度单位是「世界单位/秒」且钳在 ±40（class al）。它的速度也是 20 帧滑动平均，' +
      '一次 0.4s 走一格的补间换算成平均速度约 3×pitch ≈ 3–5.4（pitch 1–1.8），占 0→10 区间的 0.3–0.54。' +
      '本实现真机（RTX 3060）实测：按钮/键盘单步峰值 3.0、一次 5 格滚轮手势 3.0、连续快速滚动 8.4。' +
      '取 6 → 单步 ≈0.50（落在参考站的 0.3–0.54 内）、快速滚动饱和 1.0。' +
      '轨迹原始数据见 docs/verify/vel-trace-*.json'),
    /** 切换方向反转时弯曲方向的符号 */
    bendFlip: p(-1, 'proposed', '提示词要求"方向随切换反转"'),
  },

  /* ---------------------------------------------------------------- 背景
   *
   * 参考站的输出形态（截图 03-chapters-after-wheel）：
   *   · 一个**硬边**的巨大圆形色块压在一个几乎是**平涂**的底色上
   *   · 两个区域内部只有很轻的噪声起伏（GLSL 157 用 mix(uColor1,uColor2, sNoise*0.1+hash.x)，
   *     也就是局部只混 10% 左右），不是"云雾状的大面积双色渐变"
   *   · 整体压一层胶片颗粒
   *
   * 早期版本把双色 fbm 的混色幅度拉满了，结果背景是一团彩色雾，与参考站不符 —— 已按上面重做。
   */
  bg: {
    /** 有机色块随进度变化的响应速度（每秒收敛比例） */
    colorLerpPerSecond: p(3.2, 'unverified', '要"连续过渡、避免突然重置"，所以用常驻 lerp 而不是一次性补间'),
    /** 底色内部允许混进副色的比例（参考站是 10% 量级） */
    fieldMix: p(0.13, 'observed', 'E16：参考站 GLSL 157 用 sNoise*0.1 + hash 作为混色量，所以远远不是满混'),
    /** 大圆的**半径**（不是直径）在整条浏览带上从 A 变到 B 的范围，单位是视口高
     *
     *  注意别把直径当半径写进去：半径 > 1 会让圆直接盖满整个视口，底色就完全看不见了
     *  （踩过一次）。参考站截图量到圆的直径约 0.84–1.32 倍视口短边 → 半径 0.42–0.66。 */
    blobRadius: p([0.7, 0.56] as [number, number], 'observed',
      'E16 + 截图量取。参考站 /chapters 三个状态的圆直径（换算到 1440×900）：' +
      'R5 边界态 ≈1267px（半径 633 ≈ 0.70 视口高）、R4 换页后 ≈1220–1347px、' +
      'R3 刚进场时更大（≥1440，可能是入场动画的过冲）。取 0.70 → 0.56。' +
      '注意别把直径当半径写：半径 > 1 会让圆盖满视口、底色完全看不见（踩过一次）'),
    /** 色块中心在浏览带上移动的范围（相对视口宽高） */
    blobDrift: p(0.16, 'unverified', '视觉拟合：随进度缓慢漂移，不做重置'),
    /** 圆边的硬度（越小越硬）。参考站是相当清晰的硬边 */
    blobEdge: p(0.006, 'observed', 'E16：截图里圆的边缘很干净，几乎没有羽化'),
    /** 圆边上的噪声起伏，避免完美圆的机械感 */
    blobWobble: p(0.008, 'unverified', '参考站边缘有轻微不规则，幅度很小'),
    /** 颗粒强度 */
    grain: p(0.055, 'observed', 'E17：参考站背景有明显胶片颗粒（对比截图可辨）'),
    /** 渲染像素比上限 */
    maxDpr: p(1.75, 'unverified', '性能与清晰度的折中；参考站是 canvas 尺寸=CSS 尺寸（DPR 1，见 E07），本机高分屏下 1.75 更清楚'),
  },

  /* ---------------------------------------------------------------- 布局（参考站实测，直接照搬） */
  layout: {
    /** 顶栏距顶（E05：.app-header{top:10px}） */
    headerTop: p(10, 'observed', 'E05'),
    /** 两侧链接相对中线的水平偏移（E06：right/left: calc(50% ± 130px)） */
    headerLinkOffset: p(130, 'observed', 'E06'),
    /** 顶栏字标宽度（E05：.app-header__title svg{width:140px}） */
    wordmarkWidth: p(140, 'observed', 'E05'),
    /** 移动端字标宽度（E05 @media max-width:700px → 100px） */
    wordmarkWidthMobile: p(100, 'observed', 'E05'),
    /** 署名行字号（E05：font-size:6.6px / 移动 7px） */
    creditFontSize: p(6.6, 'observed', 'E05'),
    /** 导航链接字号（实测计算值 15px，E08） */
    navFontSize: p(15, 'observed', 'E08'),
    /** 导航胶囊圆角（E04：border-radius:25px） */
    navPillRadius: p(25, 'observed', 'E04'),
    /** 导航胶囊描边（E04：border:1.5px solid） */
    navPillBorder: p(1.5, 'observed', 'E04'),
    /** 页面左右边缘的点击拦截带宽度（E05：.edge-blocker{width:30px}） */
    edgeBlocker: p(30, 'observed', 'E05（用于挡住浏览器边缘手势；本实现保留为薄热区）'),
    /** 关于页右侧定位点的尺寸（E18：item 9px，inner 5.4px = scale 0.6） */
    aboutDot: p(9, 'observed', 'E18'),
    aboutDotInactiveScale: p(0.6, 'observed', 'E18'),
    /** 关于页定位点入场的位移（E18：transform: translateY(-36.5px) 且 opacity 0） */
    aboutDotEnterY: p(-36.5, 'observed', 'E18'),
    /** 关于页进度条高度（E19：height:3px） */
    aboutProgressHeight: p(3, 'observed', 'E19'),
    /** 控制条（胶囊）尺寸：参考站实测 .chapters__container-buttons 高 80.8px、整体 scale .95（E11） */
    controlBarHeight: p(80, 'observed', 'E11：1440×900 下高 80.8px'),
    controlBarScale: p(0.95, 'observed', 'E11：.chapters__container-buttons{transform:scale(.95)}'),
    /** 触控目标最小尺寸（提示词要求 ≥44px） */
    minTouchTarget: p(44, 'proposed', '提示词要求'),
  },

  /* ---------------------------------------------------------------- 色板（参考站实测） */
  colors: {
    ink: p('#171717', 'observed', 'E01/E20：body 背景与文字主色 rgb(23,23,23)'),
    cream: p('#feece3', 'observed', 'E01：深底上的前景色 rgb(254,236,227)'),
    paper: p('#fff6f0', 'observed', 'E21：preloader / 关于页底色'),
    pink: p('#f1abbd', 'observed', 'E22：.overlay-lang--top 以及关于页背景'),
    amber: p('#ffcc8e', 'observed', 'E21：preloader 进度线'),
    yellow: p('#f7c704', 'observed', 'E23：in-loader 进度条'),
    grainTint: p('#000000', 'unverified', '颗粒用黑色叠加、低不透明度'),
    /**
     * 首页素材的两个关键色，用 Pillow 从 PNG 里直接采出来的（docs/probe/asset-bounds.py）：
     *   homeFrame —— background.png 四角的外框紫，用作舞台裁切留白的底色，
     *                这样舞台比视口窄时两侧的留白和画作外框连成一片，看不出接缝
     *   homeCloud —— foreground-clouds.png 最底一行的平均色，用作云下同色填充，
     *                保证云层上涌时"云本体"与"延展填充"之间没有色差
     */
    homeFrame: p('#7268FC', 'observed', 'background.png 四角采样：#7268FC / #7169FC / #7266FB'),
    homeCloud: p('#FC749F', 'observed', 'foreground-clouds.png 最底一行（239 个采样点）的平均色'),
  },

  /* ---------------------------------------------------------------- 无障碍 */
  a11y: {
    /** 减少动态效果时的时长倍率 */
    reducedMotionScale: p(0.001, 'proposed', '近乎瞬时，但保留状态变化（不是"不动"）'),
    /**
     * 减少动态效果时是否禁用封面弯曲（装饰性位移）。
     *
     * 注意这里的措辞：是「禁用」而不是「保留」。
     * 之前写成 reducedMotionBend:false，调用侧写 `reducedMotion || !值`，
     * `!false === true` 导致条件恒真 —— 普通模式下弯曲也被关掉了。
     * 现在名字与语义一致，调用侧只有 `reducedMotion && 这个值` 一种写法。
     */
    bendDisabledOnReducedMotion: p(true, 'proposed', '弯曲属于装饰性位移，减少动态效果时应关闭'),
  },
} as const

/** 从 Param 里取纯值，写起来方便一点 */
export const V = {
  routeTransition: MOTION.routeTransition.value,
  homeCloud: {
    stageOutAt: MOTION.homeCloud.stageOutAt.value,
    stageOut: MOTION.homeCloud.stageOut.value,
    riseAt: MOTION.homeCloud.riseAt.value,
    rise: MOTION.homeCloud.rise.value,
    coverAt: MOTION.homeCloud.coverAt.value,
    revealAt: MOTION.homeCloud.revealAt.value,
    reveal: MOTION.homeCloud.reveal.value,
    enterAt: MOTION.homeCloud.enterAt.value,
    enterIn: MOTION.homeCloud.enterIn.value,
    travel: MOTION.homeCloud.travel.value,
  },
  homeExit: {
    push: MOTION.homeExit.push.value,
    copyY: MOTION.homeExit.copyY.value,
    charLeftY: MOTION.homeExit.charLeftY.value,
    charRightY: MOTION.homeExit.charRightY.value,
    charCenterY: MOTION.homeExit.charCenterY.value,
    ctaY: MOTION.homeExit.ctaY.value,
    charStagger: MOTION.homeExit.charStagger.value,
  },
  transitionParts: {
    stageOutAt: MOTION.transitionParts.stageOutAt.value,
    stageOut: MOTION.transitionParts.stageOut.value,
    wipeAt: MOTION.transitionParts.wipeAt.value,
    wipeIn: MOTION.transitionParts.wipeIn.value,
    fillAt: MOTION.transitionParts.fillAt.value,
    fillIn: MOTION.transitionParts.fillIn.value,
    coverAt: MOTION.transitionParts.coverAt.value,
    wipeOut: MOTION.transitionParts.wipeOut.value,
    fillOutDelay: MOTION.transitionParts.fillOutDelay.value,
    enterAt: MOTION.transitionParts.enterAt.value,
    enterIn: MOTION.transitionParts.enterIn.value,
  },
  posterSettleTau: MOTION.posterSettleTau.value,
  uiFeedback: MOTION.uiFeedback.value,
  headerColor: MOTION.headerColor.value,
  headerColorDelayOnHome: MOTION.headerColorDelayOnHome.value,
  navPill: MOTION.navPill.value,
  bendRelaxTau: MOTION.bendRelaxTau.value,
  revealDuration: MOTION.revealDuration.value,
  revealStagger: MOTION.revealStagger.value,
  ease: {
    ui: MOTION.ease.ui.value,
    stageOut: MOTION.ease.stageOut.value,
    stageIn: MOTION.ease.stageIn.value,
    wipeIn: MOTION.ease.wipeIn.value,
  },
  nav: {
    wheelDeltaPerStep: MOTION.nav.wheelDeltaPerStep.value,
    overshoot: MOTION.nav.overshoot.value,
    dragStepPerPx: MOTION.nav.dragStepPerPx.value,
    flickMinPx: MOTION.nav.flickMinPx.value,
    flickMaxMs: MOTION.nav.flickMaxMs.value,
    smoothTime: MOTION.nav.smoothTime.value,
    smoothTimeDragging: MOTION.nav.smoothTimeDragging.value,
    edgeSmoothTime: MOTION.nav.edgeSmoothTime.value,
    maxVelocity: MOTION.nav.maxVelocity.value,
    velocityWindowMs: MOTION.nav.velocityWindowMs.value,
    snapStepDuration: MOTION.nav.snapStepDuration.value,
    snapStepEase: MOTION.nav.snapStepEase.value,
    snapAutoDuration: MOTION.nav.snapAutoDuration.value,
    snapAutoEase: MOTION.nav.snapAutoEase.value,
    snapGoToDuration: MOTION.nav.snapGoToDuration.value,
    snapGoToEase: MOTION.nav.snapGoToEase.value,
    snapFlickDuration: MOTION.nav.snapFlickDuration.value,
    snapVelocityThreshold: MOTION.nav.snapVelocityThreshold.value,
    snapMinDistance: MOTION.nav.snapMinDistance.value,
    snapQuietMs: MOTION.nav.snapQuietMs.value,
  },
  cover: {
    segments: MOTION.cover.segments.value,
    tiltXDeg: MOTION.cover.tiltXDeg.value,
    neighborTiltDeg: MOTION.cover.neighborTiltDeg.value,
    neighborScale: MOTION.cover.neighborScale.value,
    neighborOffset: MOTION.cover.neighborOffset.value,
    neighborOpacity: MOTION.cover.neighborOpacity.value,
    neighborDim: MOTION.cover.neighborDim.value,
    maxBend: MOTION.cover.maxBend.value,
    maxDepth: MOTION.cover.maxDepth.value,
    maxTiltDeg: MOTION.cover.maxTiltDeg.value,
    uvRipple: MOTION.cover.uvRipple.value,
    uvRippleYWeight: MOTION.cover.uvRippleYWeight.value,
    bump: MOTION.cover.bump.value,
    bumpScale: MOTION.cover.bumpScale.value,
    lightingMix: MOTION.cover.lightingMix.value,
    lightProgressShift: MOTION.cover.lightProgressShift.value,
    velocityRef: MOTION.cover.velocityRef.value,
    bendFlip: MOTION.cover.bendFlip.value,
  },
  bg: {
    colorLerpPerSecond: MOTION.bg.colorLerpPerSecond.value,
    fieldMix: MOTION.bg.fieldMix.value,
    blobRadius: MOTION.bg.blobRadius.value,
    blobDrift: MOTION.bg.blobDrift.value,
    blobEdge: MOTION.bg.blobEdge.value,
    blobWobble: MOTION.bg.blobWobble.value,
    grain: MOTION.bg.grain.value,
    maxDpr: MOTION.bg.maxDpr.value,
  },
  layout: {
    headerTop: MOTION.layout.headerTop.value,
    headerLinkOffset: MOTION.layout.headerLinkOffset.value,
    wordmarkWidth: MOTION.layout.wordmarkWidth.value,
    wordmarkWidthMobile: MOTION.layout.wordmarkWidthMobile.value,
    creditFontSize: MOTION.layout.creditFontSize.value,
    navFontSize: MOTION.layout.navFontSize.value,
    navPillRadius: MOTION.layout.navPillRadius.value,
    navPillBorder: MOTION.layout.navPillBorder.value,
    edgeBlocker: MOTION.layout.edgeBlocker.value,
    aboutDot: MOTION.layout.aboutDot.value,
    aboutDotInactiveScale: MOTION.layout.aboutDotInactiveScale.value,
    aboutDotEnterY: MOTION.layout.aboutDotEnterY.value,
    aboutProgressHeight: MOTION.layout.aboutProgressHeight.value,
    controlBarHeight: MOTION.layout.controlBarHeight.value,
    controlBarScale: MOTION.layout.controlBarScale.value,
    minTouchTarget: MOTION.layout.minTouchTarget.value,
  },
  colors: {
    ink: MOTION.colors.ink.value,
    cream: MOTION.colors.cream.value,
    paper: MOTION.colors.paper.value,
    pink: MOTION.colors.pink.value,
    amber: MOTION.colors.amber.value,
    yellow: MOTION.colors.yellow.value,
    grainTint: MOTION.colors.grainTint.value,
    homeFrame: MOTION.colors.homeFrame.value,
    homeCloud: MOTION.colors.homeCloud.value,
  },
  a11y: {
    reducedMotionScale: MOTION.a11y.reducedMotionScale.value,
    bendDisabledOnReducedMotion: MOTION.a11y.bendDisabledOnReducedMotion.value,
  },
} as const

/** 帧率无关的一阶阻尼系数：dt 秒内应移动的比例 */
export const damp = (perSecond: number, dt: number) => 1 - Math.exp(-perSecond * dt)

/** 一阶低通（用于速度平滑），同样是帧率无关写法 */
export const lowpass = (perSecond: number, dt: number) => 1 - Math.exp(-perSecond * dt)

/**
 * 减少动态效果时是否要关掉封面弯曲。
 *
 * 只在这里表达一次语义：**普通模式永远有弯曲**，只有「减少动态效果 且 配置要求禁用」才关。
 * 之前这个判断散在 App.tsx 里写成 `reducedMotion || !reducedMotionBend`，
 * `!false` 恒真导致普通模式下弯曲也被关掉。收口到这里就不会再写反。
 */
export const shouldDisableBend = (reducedMotion: boolean) =>
  reducedMotion === true && V.a11y.bendDisabledOnReducedMotion === true

/**
 * 调试钩子：**运行时**调参，只改内存里的 `V`，不写回源码。
 *
 * 为什么需要它：滚轮手感（一滚多少像素等于一格）和弯曲强度（速度参考值）这两项，
 * 靠数值推演定不下来 —— 必须一边转滚轮一边看。有了它就不用每改一次都重新构建：
 *
 * ```js
 * __tune.read()                                   // { wheelDeltaPerStep, velocityRef, snapQuietMs, ... }
 * __tune.set('nav.wheelDeltaPerStep', 320)        // 滚轮变"轻"（一滚更容易过一格）
 * __tune.set('cover.velocityRef', 3)              // 弯曲更容易被拉满
 * __tune.set('nav.snapQuietMs', 90)               // 停稳判定更早
 * ```
 *
 * 捏好之后把数值填回本文件里对应参数的 `value`（那才是唯一权威）。
 * 生产环境也保留：体积只有几百字节，而线上复核手感时很有用。
 */
const TUNABLE_PATHS = [
  'nav.wheelDeltaPerStep',
  'nav.snapQuietMs',
  'nav.smoothTime',
  'nav.overshoot',
  'cover.velocityRef',
  'cover.maxBend',
  'cover.uvRipple',
  'cover.bump',
  'cover.maxTiltDeg',
  'bg.fieldMix',
  'bg.blobRadius.0',
  'bg.blobRadius.1',
] as const

if (typeof window !== 'undefined') {
  const mutable = V as unknown as Record<string, Record<string, number>>
  ;(window as unknown as Record<string, unknown>).__tune = {
    read() {
      return {
        wheelDeltaPerStep: mutable.nav.wheelDeltaPerStep,
        snapQuietMs: mutable.nav.snapQuietMs,
        smoothTime: mutable.nav.smoothTime,
        overshoot: mutable.nav.overshoot,
        velocityRef: mutable.cover.velocityRef,
        maxBend: mutable.cover.maxBend,
        uvRipple: mutable.cover.uvRipple,
        bump: mutable.cover.bump,
        maxTiltDeg: mutable.cover.maxTiltDeg,
        fieldMix: mutable.bg.fieldMix,
        blobRadius: (mutable.bg.blobRadius as unknown as number[]).slice(),
      }
    },
    set(path: string, value: number) {
      if (!(TUNABLE_PATHS as readonly string[]).includes(path)) {
        // eslint-disable-next-line no-console
        console.warn('[__tune] 不在可调列表里：', path, '可选：', TUNABLE_PATHS.join(', '))
        return false
      }
      if (path.startsWith('bg.blobRadius.')) {
        const i = Number(path.split('.')[2])
        ;(mutable.bg.blobRadius as unknown as number[])[i] = value
        return true
      }
      const [group, key] = path.split('.')
      mutable[group][key] = value
      return true
    },
    paths: TUNABLE_PATHS,
  }
}
