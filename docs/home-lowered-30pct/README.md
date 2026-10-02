# 前景角色下移与鼠标随动再减 30%

前景章鱼和鸟的地面高度一起下移：桌面 -225 → -249，窄屏 -165 → -181。角色支撑点和接触阴影同步贴合新的水平地面，静态降级图使用同一参数。1280×720 正面视图中，桌面下移量对应章鱼约 25 像素、鸟约 29 像素。

鼠标 3D 随动参数由 0.7 改为 0.49，即当前版本乘以 70%。镜头位置、观察目标、角色和底座转动、气球鼠标随动、标题随动及按钮悬停推进共用这个参数。

`npm run build` 通过，生产构建为 `index-CroCI-mv.js`。实际生产首页正面与右转已检查，支撑点与地面高度差均为 0，阴影距脚点 0.020 个世界单位，控制台错误为 0。窄屏参数已更新，本轮没有单独进行手机浏览器验收。

```powershell
node scripts/verify-home-grounding.mjs docs/home-lowered-30pct/captures.json
```

截图：`desktop.png`、`tilt.png`；实际场景数据：`captures.json`。参数文件：`src/gl/HomeAiStage.ts`、`src/config/homeMotion.ts`。
