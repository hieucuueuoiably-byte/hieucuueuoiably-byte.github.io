# 完整章鱼重绘与接入

原章鱼素材的下缘沿前景云轮廓被截断，部分触手没有完整的下半边。上一轮固定支撑点的检查只能证明一个点与地面数学对齐，无法证明截断轮廓看起来能承重。新版补齐身体下缘和触手，改为下方触手铺开、压低的坐姿。

使用内置 `image_gen` 编辑自有素材 `public/home-ai/layers/octopus.png`。完整透明参考图为 `public/home-ai/octopus-complete-v1.png`，原始提示词为同目录的 `octopus-complete-v1.prompt.txt`。保留紫色头部、深青色贝雷帽、半睁眼、脸颊、场记板和黄色吸盘。

网页绘制使用由新参考图转换的纯色曲线路径，位于 `src/data/home-character-paths.json` 的 `octopus` 项。转换脚本 `scripts/trace_complete_octopus.py` 仅修改章鱼；7 个色彩路径、4630 段曲线，完整轮廓范围为 `[47,417,767,429]`。以后重跑旧三角色转换脚本后，需要再运行此脚本保留新版章鱼。

章鱼使用一张连续的 64×48 分段网格与两格眼睛图集，取消旧素材的头部和下方触手关节裁切。上半身与抬起的触手有轻微网格运动，底部不参与这些位移；整体呼吸与透视仍通过贴地支撑点校正。接触阴影扩大至 600×130 的局部地面尺寸，覆盖完整坐姿底部。静态降级图同步使用新轮廓与阴影。

## 检查记录

- `npm run build` 通过；生产文件为 `index-CzzsH9Sk.js`。
- 实际桌面首页、鼠标转动与生产预览已检查；角色图集没有边缘裁切，开发与生产浏览器控制台错误均为 0。
- `character-proof.html` 在开发服务中展示相同角色渲染器的睁眼与闭眼状态。检查截图 `eyes-proof.png` 可以看到完整的帽子、身体、场记板和底部触手；避免用云层遮挡判断完整性。
- 实际场景捕获位于 `captures.json`，支撑点与地面高度差为 0，阴影距支撑点 0.020 个世界单位。这项几何检查仅作为接地关系验证；视觉判断以首页和独立角色截图为依据。
- 本轮保存的截图为桌面与独立角色检查。窄屏检查时用户正在操作同一预览，因此没有把该状态计为手机验收通过。

```powershell
python scripts/trace_complete_octopus.py
node scripts/verify-home-grounding.mjs docs/octopus-grounding/captures.json
```

效果截图：`before.png`、`desktop.png`、`tilt.png`、`production.png`、`eyes-proof.png`。历史目录 `docs/home-grounding/` 记录上一轮的地面网格和支撑点修复。
