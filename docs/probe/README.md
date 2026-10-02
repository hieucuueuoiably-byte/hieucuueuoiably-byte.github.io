# docs/probe —— 对参考站的实测档案

这里的文件是 `docs/motion-spec.md` 里那些「【已观察】E01…E23」结论的**原始证据**，
不是本项目运行需要的东西，可以整个目录删掉而不影响站点。

## 文件清单

| 文件 | 是什么 |
| --- | --- |
| `01-probe-home-chapters-about.js` | 第一轮实测脚本：访问首页/`chapters`/`chapter/1`/`about`，采样转场、几何、滚轮映射、阻尼、边界、导航胶囊、关于页定位点 |
| `01-probe.log` | 上面脚本的输出（`>>> tech :: …` 这些就是 E01–E23 的来源） |
| `00-full-report.json` | 第一轮实测的完整 JSON 报告（含逐步采样） |
| `02-probe-burst-and-diagnostics.js` / `02-probe.log` | 第二轮：连拍 + 关于页滚动容器诊断 + 首屏加载完成判定 |
| `03-self-check.js` / `03-self-check.log` | **本项目的**自检脚本与输出（对应 `docs/acceptance.md` 的 V1–V20） |
| `04-bend-capture.js` | 弯曲取证：把目标设到 3 格之外，让速度维持高位后截图 |
| `05-video-record.js` | 关键操作录屏脚本 |
| `06-transition-burst.js` | 转场连拍脚本 |
| `dom-home.txt` / `dom-chapters.txt` / `dom-about.txt` | 参考站三个页面的 DOM 骨架（已剔除 SVG path 数据；`path` 节点被省略） |
| `sample-chapters-geometry.json` | `/chapters` 页所有 `.chapters-button` 的 getBoundingClientRect + transform（E11–E13 的来源） |
| `sample-about-geometry.json` | about 页各 section 尺寸与定位点（E18–E20 的来源） |
| `sample-damping.json` | 阻尼采样（说明见下） |
| `reference-entry.css` | 参考站的入口样式表（格式化后），E02–E06/E18–E23 的直接来源 |
| `reference-glsl-excerpts.md` | 参考站着色器里被本规格引用的少数几段 + 本项目的用法差异说明 |

## 关于来源与版权

`reference-*` 与 `dom-*` 里的内容是 <https://ponpon-mania.com/> 的**公开**前端产物
（压缩 JS / CSS / HTML），抓取时间 2026-09-30，**版权归原作者 Patrick Heng / Justine Soulié 所有**。
放在这里只作为「这些结论确实是实测出来的」的凭据，**不是可复用的代码**。

本项目的实现是重写的：`src/gl/CoverMaterial.ts` 用 Three.js 的
`PlaneGeometry` + 自写 `ShaderMaterial` 做顶点位移与法线重算，
与参考站的 OGL + UV 空间畸变是不同路径。完整的着色器转储**没有**放进交付目录。

## 关于 `sample-damping.json`（重要）

这个文件里采到的数值**不能用来推断参考站的阻尼系数**。
原因：采样脚本读的是 `.chapters-button[data-index="0"] .chapters-button__container` 的 x 坐标，
而参考站的非当前项被压成了 `scale(0)`，所以那一列全程恒为 `720`（中心），没有信息量。
参考站「一步一跳 + 平滑收敛」这个**行为**是确认了的（见 `01-probe.log` 的 `wheel_120_x5`、
`boundaryEnd`、`boundaryStart`），但**收敛曲线测不到** —— 已记为
`docs/motion-spec.md` 的未验证项 U3。保留这个文件是为了说明"为什么没测到"。
