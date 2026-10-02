# 章节式视频播放页 · 2026-10-02

参考页面：https://ponpon-mania.com/fr/chapter/3

本次按用户要求移植公开前端代码，接入用户已有视频；没有生成或替换作品素材。

当前版本按用户新要求，已删除视频后方的奶油色云朵、实例网格、云朵 shader 和专用 RTT。视频边框现在是带背面与侧边的实体网格，分类卡片也加深了盒体。当前效果见 solid-video-cards.png、solid-category-cards.png；此前截图仅代表对应历史版本。

## 原站代码对应

- `ReaderSourceShaders.ts / READER_BACKGROUND`：原站 `DJ → UJ`。章节 3 的橙色 `#F87800` / 蓝紫 `#7E7EFF`、simplex/fbm 曲线、颗粒、流体 UV 位移和速度线。
- `READER_PAPER_VERTEX`：原站 `St → Pw`。25×25 纸张网格、鼠标下凹、静态起伏、屏幕位置弯曲和速度拉伸公式。
- `ReaderSolidGeometry.ts`：在原顶点公式上新增前面、背面和四周连接网格，桌面深度 20px、手机深度 14px。侧边使用分层材质，视频纹理只显示在正面。
- 纸张法线纹理来自本地参考站存档 `site/textures/common/paper-normals.jpg`，复制为 `public/textures/paper-normals.jpg`。

原始代码存档在 `../ponpon-public-source/formatted/CfE0pqJa.js`。shader 保留原公式，移除了 Three.js 自动注入的 position/uv/matrix 声明，并接入输出色彩空间。视频片元材质保留真实画面和比例，并采用 Three.js map_fragment 的视频 sRGB 解码，避免视频播放后画面变亮。

## 行为与适配

- 分类内直接播放和 `/works/:slug` 深链接使用同一套章节阅读器。
- 图片和视频都在同一张 WebGL 纸张上；真实 video 元素负责解码、点击、播放进度、无障碍和全屏。
- 16:9 和 9:16 按视频原比例显示，四边保留奶油色纸边；邻片以水平纸张排列。
- 删除原来的左右大块点击热区。`CardProjection.ts` 把实体卡片投影成屏幕轮廓，`CardTargets.tsx` 的按钮随渲染逐帧移动并裁剪到该轮廓；点空白不切换，点哪张邻片就选择哪张。当前分类卡片点击进入分类，当前视频点击播放或暂停。
- 按钮 / 左右键 / 滚轮 / 拖拽驱动同一导航控制器。深链接换片使用纸张横移，不再触发整屏圆形遮挡。滚轮停稳后同步深链接。
- 按钮/左右键使用原导航器的 0.4s cubic.out，点击进度点使用 0.6s cubic.out。视频区域用 pointer capture 接续完整拖拽，横滑与点击播放分开判定。
- 控制栏固定底部，换片只更新文字，不在每次换片时重新弹出整个控制栏。播放过程中切换会暂停上一片。
- 首次视频需点击播放。第一次播放后，本次访问中换片停稳即自动播放；手动暂停不会自行重播，切换下一条则自动播放。刷新页面重新等待第一次点击。
- 全屏时恢复可见的原生 video 与浏览器播放控件，退出后继续使用 WebGL 纸张和共享控制栏。
- 原有首页和分类入口继续使用各自的舞台；分类入口的先收圆 / 等切换 / 变色 / 再展开机制仍正常。
- 无 WebGL 时保留真实视频播放，背景降级为同配色的静态纹路；减少动态效果时禁用鼠标弯曲与流体输入。

## 实测

`npm run build`（tsc + Vite）成功。最终生产主文件 `index-B_NnaBQi.js`。

| 项目 | 结果 |
|---|---|
| Dev / React StrictMode 视频链路 | 首次播放、暂停、换片、readyState 4 正常 |
| Prod 视频链路 | 播放、换片、暂停上一片、重新播放正常 |
| 首次点击 / 后续自动播放 | Dev 与 Prod 首次 paused=true、时间 0；首次点击后换片、拖动和滚轮停稳自动播放，生产反向拖动后仍自动播放 |
| 手动暂停 | 生产暂停后时间保持 61.627813 秒；换到下一条后 paused=false，时间继续增长 |
| 点击实体卡片 | Dev 从第 1 片直接点击第 3 片，src 更新为 preview-0928-164234，停稳后 paused=false；Prod 横屏点击左边卡片切换并自动播放 |
| 独立视频链接点击卡片 | Prod 从 film-0821 点击 08.23 卡片，URL 与 src 同步到 film-0823-02，停稳后自动播放、时间增长 |
| 点击空白 | Dev 视频间空白、Prod 分类旁空白点击均未切换；DOM 中 `.works__hit` 数量为 0 |
| 分类卡片 | 点击邻片选中分类；点击当前卡片进入对应分类。卡片拖动后仍留在分类入口，不误进入 |
| 9:16 | 桌面 242.325×430.8；手机 294.75×524，比例 0.5625 |
| 16:9 | 桌面 765.867×430.8，比例 1.77778；手机按原比例缩放 |
| 深链接换片 | URL、标题、src 一起变；连帧中 wipe 均为 false |
| 直接拖动视频纸张 | Dev 前进一片、Prod 反向一片成功；拖动不误播放，之后点击可播 |
| 左右键与进度条 | 左右键换路由；进度条聚焦时右键只改变时间 |
| 滚轮 | 从第 3 片移动并停稳到第 4 片，URL 同步 film-0824-01 |
| 背景 | 原站 shader 已编译；真实指针输入已触发 GPU 流体；云朵已按新要求移除 |
| 全屏 | video 可见，原生 controls=true；退出后 controls=false，回到纸张 |
| 手机布局 | 390×844；四个按钮各有独立 44px 布局宽度，无重叠 |
| 返回分类 | 恢复分类入口，reader 标记清除，圆圈状态 idle |
| 控制台 | 检查的开发、生产页面无 error；Dev 仅有 React Router 升级提示 |

这不是原站视频与漫画内容的逐像素复制：标题、视频比例、控制器和分类结构保留作品集需求。背景与纸张的 shader 公式来自原站；未声称全部漫画内部分镜动画与帧率已逐项对齐。

当前证据：solid-video-cards.png、solid-category-cards.png、solid-horizontal-card.png。此前版本的比例与切换证据：user-preview-no-cloud.png、autoplay-playing.png、desktop-horizontal.png、desktop-vertical.png、mobile-horizontal.png、mobile-vertical.png、switch-00…11.png、switch-trace.json。源码摘要见 source-hashes.json。
