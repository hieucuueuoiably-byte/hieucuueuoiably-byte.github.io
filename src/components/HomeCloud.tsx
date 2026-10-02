import type { RefObject } from 'react'

interface HomeCloudProps {
  rootRef: RefObject<HTMLDivElement>
  animRef: RefObject<HTMLDivElement>
  /** 首页上（或在首页的转场里）才可见 */
  visible: boolean
  /** 覆盖阶段：抬到顶栏之下、控制条之上的层级，保证整屏被盖住 */
  covering: boolean
}

/**
 * 首页的前景粉色云层 —— **常驻挂在 App 上**，不放在 HomePage 里。
 *
 * 为什么必须常驻：转场是在「云层完全盖住屏幕」的那一帧才切路由的。
 * 如果云层属于 HomePage，路由一换它就被卸载，画面会当场露底 —— 变成硬切，不是揭幕。
 *
 * 结构（竖向坐标都以舞台高度为单位，舞台是同 `.home-stage__inner` 的等比盒子）：
 *
 *   0% ───────────────────────────────  rig 顶端 = `.home-cloud__anim` 的上沿
 *        （云图上半部是透明的，所以 0–70.35% 不遮挡任何东西）
 *   70.35% ───────────────────────────  云层的实际轮廓上沿（左右两边最高）
 *        │  云层本体 = foreground-clouds.png
 *   100% ─────────────────────────────  云图下沿（纯粉色，无缝）
 *        │  __fill：同色填充，顶边接在云图下沿
 *   170.35% ──────────────────────────
 *        │  __tail：把云图上下翻转再放一次，
 *                  于是"扇贝形边缘"落在 rig 的最下沿（200%）
 *   200% ─────────────────────────────  rig 底端
 *
 * 整条 rig 一起上移时：
 *   translateY(0)       → 云层停在画面下缘（首页静止态）
 *   translateY(-100%)   → 画面被完全盖住（这一刻切路由）
 *   translateY(-200%)   → rig 底沿扫出画面上缘，被扇贝边"揭开"
 *
 * 反向上（返回首页）就是倒放：从 -200% 降到 -100%（盖住），再降到 0%（云层落回原位），
 * 全程只动这一个变量，所以两个方向天然对称、不会跳位。
 *
 * 云图上下翻转的那一份（`__tail`）让"揭开"的边界也是云朵轮廓，
 * 而不是一条直边 —— 单靠纯色填充矩形的下沿做揭开会看见一条生硬的水平线。
 */
/**
 * 首页的前景粉色云层 —— **常驻挂在 App 上**，不放在 HomePage 里。
 *
 * 为什么必须常驻：转场是在「云层完全盖住屏幕」的那一帧才切路由的。
 * 如果云层属于 HomePage，路由一换它就被卸载，画面会当场露底 —— 变成硬切，不是揭幕。
 *
 * 结构（竖向坐标都以**舞台高度 = 100%** 为单位，舞台盒子与 `.home-stage__inner` 同公式）：
 *
 *   0% ───────────────────────────────  rig 上沿（`.home-cloud__anim`）
 *        （云图上 70% 是透明的，这一段不遮挡任何东西）
 *   70.35% ───────────────────────────  云层轮廓的实际上沿（左右两端最高，中央低到 95%）
 *        │  __art：foreground-clouds.png
 *   100% ─────────────────────────────  云图下沿（纯粉 #FC749F，与填充同色、无缝）
 *        │  __fill：同色填充（高度正好一个舞台高）
 *   200% ─────────────────────────────  填充下沿；再挂一排 CSS 画的半圆扇贝
 *        │  __fill::after：扇贝下沿（约 3.4%）
 *   203.4% ───────────────────────────  rig 下沿
 *
 * 整条 rig 只动一个 yPercent：
 *   0%      → 云层停在画面下缘（首页静止态，上面 70% 透明，等于没盖）
 *   -100%   → 覆盖 [−26.7%, 103.4%]，画面被完全盖住（这一刻切路由）
 *   -204%   → 覆盖 [−137%, 0]，rig 下沿扫出画面上缘，被扇贝边"揭开"
 *
 * ⚠️ 早先的写法是在填充下面**再放一份上下翻转的云图**，想让揭开界线也是云朵轮廓。
 * 那是错的：翻转层的实心部分在它自己的盒子上半部，travel 到 -100% 时那段正好跑到屏幕
 * 之上，露出的是它下半部的透明区 → 屏幕下半截露底（docs/verify/cloud-states/y100.png）。
 * 现在揭开的界线用 `__fill::after` 的重复径向渐变画扇贝，纯 CSS、不依赖贴图，
 * 几何上"填充到哪儿就遮到哪儿"，不会再有这种对不齐。
 */
export function HomeCloud({ rootRef, animRef, visible, covering }: HomeCloudProps) {
  return (
    <div
      className={`home-cloud${visible ? ' is-visible' : ''}${covering ? ' is-covering' : ''}`}
      ref={rootRef}
      aria-hidden="true"
    >
      <div className="home-cloud__stage">
        <div className="home-cloud__anim" ref={animRef}>
          <div className="home-cloud__fill">
            <img
              className="home-cloud__img"
              src="/assets/home/foreground-clouds.png"
              alt=""
              draggable={false}
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
