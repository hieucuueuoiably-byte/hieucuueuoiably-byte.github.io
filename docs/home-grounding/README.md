# 前景角色落地修复

前面的章鱼与鸟现在站在同一个水平地面上，脚点在呼吸、关节动作和鼠标透视转动期间保持贴地。角色轮廓、纯色绘制与已有 70% 的鼠标 3D 随动强度保持当前设计。

之前红色地面是竖直的插画平面，两个前景角色独立定位并围绕身体中心缩放、摆动，没有共同的地面和脚部锚点。修复前实际主支撑点与目标地面分别相差 -15.469 和 +14.691 个世界单位。

修复使用以下关系：

- 将原有红色地面画面反投影成水平网格，保持正面观看时的轮廓。
- 从角色不透明轮廓量取主支撑点，并包含支撑部件当前的关节旋转；章鱼采用身体下方的支撑触手，右侧伸出的触手继续作为动作部件。
- 每帧在角色关节、缩放与旋转之后校正根节点，让脚点固定在地面高度。桌面地面 Y 为 -225，窄屏为 -165。
- 在两者的脚点放置独立的柔和接触阴影。前景云在落点附近略微下沉，使接地关系更容易看清。
- 静态降级图同步调整支撑点与接触阴影；此路径本轮通过构建检查，未单独模拟禁用 WebGL。

## 验证

浏览器实际场景的脚点世界坐标、地面高度与阴影位置通过 canvas 的 DOM 数据属性记录。检查对象包含桌面正面、左右转动、375×812 手机布局和生产预览。两者脚点与地面高度差均为 0，接触阴影距离脚点 0.020 个世界单位；开发与生产浏览器控制台错误均为 0，手机页面没有横向溢出。

```powershell
node scripts/verify-home-grounding.mjs docs/home-grounding/before.json # 修复前失败
node scripts/verify-home-grounding.mjs docs/home-grounding/after.json  # 修复后通过
```

本轮 `npm run build` 通过，生产文件为 `index-BfFhsjZV.js`。截图：`before.png`、`desktop.png`、`right-up.png`、`left-down.png`、`mobile.png`、`production.png`。

实现文件：`src/gl/HomeCodeCharacters.ts`（支撑点）、`src/gl/HomeAiScene.ts`（脚点补偿与阴影）、`src/gl/HomeAiStage.ts`（水平地面）、`src/gl/HomeForegroundClouds.ts`（脚边云层）、`src/gl/HomeCodeFallback.ts`（静态图同步）。
