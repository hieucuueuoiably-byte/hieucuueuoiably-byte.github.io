# 首页分层交互 v5

本轮按用户要求缩小整体遮罩、让角色向中央站位，并直接移植参考站的前景云代码。自有角色与真实视频分类继续使用项目现有内容。

## 原代码接入范围

- `HomeOriginalShaders.ts` 中的 `PORTAL_FRAGMENT`、`CLOUD_VERTEX`、`CLOUD_FRAGMENT`、`CLOUD_COMPOSITE_FRAGMENT` 来自归档公开前端。来源、原符号和 bundle SHA-256 保留在文件头。
- `public/home-original/ponpon-mask.webp` 是原站的红色内景通道 / 绿色描边通道遮罩。当前首页使用这一纹理；自有角色曲线由 `HomeCodeCharacters.ts` 绘制。
- 云的 40 个实例、基础位置、圆形扭曲、8 方向描边、排斥半径 2 / 强度 1.5、弹簧范围 .05–.15、摩擦范围 .05–.2 来自归档 `formatted/CfE0pqJa.js:90124` 附近的 `IJ` 类。
- 源站云入场：位移 1.4s / 延迟 .5s / power4.inOut，膨胀 2.5s / 延迟 .7s / linear。两段独立控制，已接入当前首页时间轴。
- 适配改动：为 Three.js 删除重复内置声明；随机数用固定种子；云 bank 按视口宽度适配；原以毫秒计算的弹簧改为固定 60 Hz 积分；减少动态效果时停用扰动、排斥和入场。

来源：[Ponpon Mania](https://ponpon-mania.com/fr)，参考站署名开发 Patrick Heng、插画 Justine Soulié。原文件仍保留其作者来源，本轮未将原角色素材接入首页。

## 布局与图层

内景、城市、自己的三个角色先绘入内容目标，再通过原遮罩 shader 裁切。遮罩缩放基准 .86；较窄桌面再乘 `min(1, aspect / 1.6)`；竖屏 .84，并取消源站额外的 1.5 倍放大。原遮罩的呼吸、耳朵 / 脸颊弯曲、流体扰动保留。

桌面角色横向位置乘 .65，中央角色尺寸乘 .94，两侧乘 .84。竖屏单独设置尺寸和位置，右侧角色进一步收拢，保留话筒轮廓。

远景云使用独立透明画布纹理，位于城市后面，低速漂移与轻微视差。前景云使用独立场景和两次渲染：先画 40 个云实例，再应用原流体扰动与描边；最后覆盖在遮罩之外。旧 `layers/clouds.webp` 已移出当前动态首页。

## 检查记录

构建通过（TypeScript + Vite）。浏览器检查与 DOM 诊断保存于 `verification.json`，图片为实际运行截图：

- `desktop.png`：开发首页。
- `production.png`：生产构建宽屏首页。
- `cloud-push.png` / `cloud-return.png`：鼠标排斥和离开后回弹。
- `mobile.png` / `mobile-works.png`：375×812 首页及进入作品分类。

源站原始弹簧按每帧运行，此版固定 60 Hz 以避免高刷新率改变手感。本轮未声称全站逐像素一致，也未替换用户的视频或重生成图片。静态降级图层同步为缩小遮罩和中央站位；本轮浏览器运行在 WebGL 模式。
