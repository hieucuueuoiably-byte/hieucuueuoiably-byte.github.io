# 背景圆串行切换

用户要求：先收旧圆，在作品切换结束后换色、展开新圆。

实现位于 `src/gl/WorksScene.ts`：收拢 280ms，作品当前/目标位置都到位后等待 70ms，在闭合状态换色 200ms，展开 860ms。原有流体纹理保留；新输入直接跟随最新目标，不叠加中间作品的圆。

最终构建 `index-DRQEMGWo.js`，构建通过。生产版捕获到 `closing → waiting → coloring → opening → idle`；换色与展开阶段位置已抵达作品，旧圆半径为零。连续右/左/左输入只展开最终目标 0；不足一格的滚轮输入回弹后重新展开原圆。开发版 StrictMode 也回到 `idle`，圆缩放为 1。两环境均无控制台错误。

`verification.json` 是实际阶段轨迹，含每阶段时间、旧/新目标、半径与背景两色。`switch-motion.mp4` 是通过浏览器连续截帧并按实际采样间隔编码的操作实录。`closing.png` 展示旧圆已收拢时的画面，`expanded.png` / `final.png` 展示完成状态。本轮未量测移动端帧率。
