# 原版首页接入与动效验收 · 2026-09-30

首页已换为 Ponpon Mania 的原版分件素材与 WebGL 舞台，网站标题保留“作品集网站”。三个视频分类及分类内原地播放继续使用用户的 18 条视频。

## 实现

- `HomeScene.ts` 在既有 Three.js renderer 中渲染首页。人物、城市、音箱、天空和轮廓使用 `public/home-original/` 中的原版纹理；没有重新生成首页图片。
- `HomeOriginalShaders.ts` 保留选取的原站 GLSL 与源 bundle 的 SHA-256。人物局部形变、眨眼、音箱震动、啤酒液面、轮廓、天空、月亮、星星和气球采用对应原版公式。Three 自动提供的 attribute/matrix 声明在使用时移除。
- `HomeFluid.ts` 为 GPU 压力投影流体：velocity、density、curl、divergence、pressure ping-pong，3 次 Jacobi 压力迭代，加梯度投影和平流。基础参数 sim 64 / dye 256 / density .9 / velocity .2 / curl 2 / radius .01，纹理尺寸按视口比例适配。
- 鼠标位移注入流体；轮廓和画面 UV 读取流体密度，带来局部扭曲、波纹和轻微颜色错位。啤酒和云层也读取同一帧的流体纹理。
- 前景云由 40 个实例平面及原版椭圆 shader 绘制，独立 RT 合成并描边。指针靠近时向两边和下方排开，再按弹簧恢复；没有把前景云烘焙成图片。
- 人物骨架与局部动画同时存在：Ponpon 呼吸、耳朵和双臂；Jean Loup 眨眼、左臂、尾巴与托盘；Simon 眨眼、身体、右臂与煎饼翻转。
- 原版球体气球和表情纹理配合代码运动；绳子按连续曲线更新。星星和萤火虫闪烁；点击画面与定时触发的烟花使用一个粒子池。
- 主按钮悬停：portal 约 1→1.1，内部相机 FOV 45→39，镜头前推；移开 .6s 恢复，进入 1s / delay .2s。来回悬停会取消旧补间。
- 弹性入场与双 RT 转场保持。标题、按钮等 DOM 标签在离开前 .18s 淡出，返回时在转场末尾 .3s 淡入；人物舞台在转场期间仍实时渲染。

## 性能与稳定性

首页复用既有 canvas/renderer，内部大画面 RT 的 DPR 上限 1.5。纹理使用 WebP，没有逐帧加载或分配 RT；粒子、云和绳子复用 buffers。进入其他页面后，首页的流体和局部动画停止更新。dt 有上限，耗散与弹簧按帧间隔适配。

原版 shader 输出编码色彩，首页内部纹理/RT 保持原采样；进入既有线性色彩的转场 RT 时在最终合成处转换一次，避免整屏变暗或转场颜色跳变。原版 Ponpon arm mask 中的零宽 map 区间改为明确的 step，避免 ANGLE 的除零警告。

系统“减少动态效果”会关闭流体、烟花与循环动画；缺少浮点 FBO 时保留中性流体纹理，WebGL 不可用时显示由原版图集拼出的 DOM 降级。减少动态与无 WebGL 分支本轮做代码检查，未改变系统设置进行浏览器强制模拟。

## 浏览器验证

使用开发服务 `5199`（React StrictMode）和生产预览 `5201`，真实浏览器操作；桌面 1280×720、手机尺寸 375×812。

| 检查 | 结果 |
| --- | --- |
| 开发 / 生产首页加载 | `homeWebgl=ready`，`homeFluid=gpu`，原版舞台可见 |
| 实际动画 | shader 帧计数持续增长，Simon arm 角度在约 −.10 到 .25 之间变化 |
| 指针波纹 | 指针输入计数增加，截图显示局部 UV / 色彩扭曲 |
| 按钮悬停 | `homeHover` 从 0→1，画面内镜头明显推进 |
| 首页→分类→首页 | 地址、场景和文字恢复；转场结束后 host opacity=1 |
| 原地横屏播放 | `/works/category/animation`，1920×1080，显示约 448×252，比例 1.77781，currentTime 增长 |
| 原地竖屏播放 | `/works/category/product-previews`，594×1056，显示约 252×448，比例 .56249，currentTime 增长 |
| 返回分类 | video 元素数从 1→0，仍是三个分类 |
| 手机首页 | clientWidth=scrollWidth=375；主按钮约 178×60，无横向溢出 |
| 控制台 | 修正烟花 shader 的保留字后，最终重新加载的开发 / 生产检查均为错误 0 |
| 构建 | `npm run build` 通过；JS 970.68 KB / gzip 279.31 KB；CSS 55.45 KB / gzip 12.11 KB |

截图与 DOM 读数见 `home-original-review/`：`home-desktop.png`、`home-ripple.png`、`home-hover.png`、`home-mobile.png`、`video-landscape.png`、`video-portrait.png`、`browser-checks.json`。

## 对齐范围

原版图画和主要着色器已复用。网页标题、入口和作品内容按作品集适配；角色骨架的循环、云的随机分布、气球绳子和烟花采用可重复、按帧间隔稳定的实现。原站采用 Nuxt/OGL，本工程保留 React/Three。未声称逐像素完全一致，也没有做跨设备帧率基准。

素材署名与来源见 `public/home-original/SOURCE.md`；原版机制取证见 `reference-home-mechanism.md`。
