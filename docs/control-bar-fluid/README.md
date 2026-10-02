# 控制条与目录背景圆：原站动效迁移

原站公开前端产物位于工作区 `ponpon-public-source/formatted/`，代码版权归原作者。当前工程将 Vue/OGL 的调用适配为 React/Three.js，保留视频播放、进度拖动、键盘与分类导航。

## 控制条

来源：[Bg17DEuf.js](https://ponpon-mania.com/_nuxt/Bg17DEuf.js) 的 `ChaptersButton`，`j/H/S/Q`。

- 初始 `y=100`、`scale=0`、`rotationX=-100`；延迟 0.12 秒后出现。
- 缩放：1 秒 `elastic.out(0.3, 0.3)`；上移和翻正：0.5 秒 `back.out`。
- 标题、说明与编号从下方揭开：0.6 秒 `expo.out`，错开 0.1 秒。
- 播放图标从左侧移入；悬停图标放大至 1.15，整条放大至 1.1，前后按钮放大至 1.1。
- 分类或影片改变时重放入场；新输入清理旧补间。等待加载层和路由转场结束后播放，避免动效被遮掉。系统减少动态效果时直接呈现。

实现：`src/components/ControlBar.tsx`、`src/styles/control-bar-motion.css`。控制条仍是 App 上的同一个组件；播放进度保留实时更新。

## 背景圆

来源：[CfE0pqJa.js](https://ponpon-mania.com/_nuxt/CfE0pqJa.js) 的 `YQ.createFluid`、`Da` 与 `OQ.main`。

- 使用独立的 GPU 流体场，首页调参不影响目录。
- 64/256 分辨率，3 次压力迭代；密度/速度/压力保留系数为 0.95/0.9/0.95，旋度强度 1，注入半径 `0.15/100`。
- 鼠标位移乘 5 注入，圆片使用 `gl_FragCoord.xy/uResolution` 采样真实密度纹理。
- 原着色器 `uv -= fluid.rg * 0.0001` 同时改变圆边缘与同心色带；流体密度也参与局部颗粒亮度。形变随流体输运和耗散回落。
- 渲染到转场纹理时，采样分辨率跟随实际目标尺寸。减少动态效果时清空流体并停止注入；无浮点渲染目标时使用中性纹理。

实现：`src/gl/BackgroundMaterial.ts`、`src/gl/WorksScene.ts`、`src/gl/HomeFluid.ts`。诊断 URL 加 `?inspectMotion=1` 时，画布的 `data-directory-flow-px` 提供 GPU 采样的位移峰值；日常浏览不执行读回。

截图与验证数据保存于本目录。

## 背景圆切换顺序（2026-10-02 调整）

按用户要求，将原来的旧圆淡出/新圆同时展开改为串行阶段：旧圆 0.28 秒 `power3.inOut` 收拢 → 等作品停稳 70ms → 收拢状态下 0.2 秒 `power2.inOut` 换背景色 → 新圆 0.86 秒 `power3.out` 展开。收拢时保留原色与流体纹理，展开前旧圆已完全隐藏。

新输入会从当前半径收拢，跟踪最新目标；只有导航当前位置和目标位置都抵达对应作品后才换色、展开。连续切换不排队播放中间作品的圆，未跨到下一件的短滚轮操作会收回到原作品并重新展开。分类范围变化、离开舞台和组件销毁时清理补间；减少动态效果时直接呈现最终圆。

这是基于用户新要求的时间编排，非声称原站使用完全相同的时长。参数位于 `WorksScene.ts` 的 `CIRCLE_MOTION`，阶段截图与实际轨迹见 `../circle-sequence/`。

## 浏览器验证（2026-10-02）

- 最终生产构建 `index-BU4iAHOK.js`；`npm run build` 通过。
- 控制条切换时捕获到缩放/翻转和文字揭开，稳定后透明度为 1，三个文字层均回到原位。
- 原站流体参数下，真实指针输入后的 GPU 位移峰值为 63.2px，停止输入后降至 0；截图 `flow.png`、`final.png` 可见圆边缘的局部波动。
- 悬停整条缩放达到 1.1。GSAP 的行内 `scale: none` 覆盖问题已修正。
- 生产版和开发版 StrictMode 均能播放、暂停，视频源保留，readyState 为 4；生产版滑条方向键能改变进度而不改变路由。
- 最终构建与开发环境均无控制台错误。生产页日志里的两条旧构建初始化错误已修复，验证记录明确排除旧 bundle，不混入最终结果。开发环境仅有 React Router 的既有版本迁移提示。
- `verification.json` 保存采样与环境信息；本次未重新量测移动端或整站帧率。
