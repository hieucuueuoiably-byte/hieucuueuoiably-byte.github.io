# 作品集网站 · 真实视频版

首页保留你选定的蓝紫外景、橙色舞台和粉色云。三个自有角色用曲线路径、纯色填充与黑色描边绘制，使用 11 个渲染部件，配合眼睛图集、关节动作和连续网格形变。内景使用更明显的透视镜头和深度分层，地面与城市分开，底座有独立顶面和侧面。三个气球错峰升起、摇摆，绳子跟随拖动；遮罩在 v7 基础上再扩大约 7.5%。原站的 246 个星点、40 个萤火光点和 512 粒子烟花已接入，自动或点击触发。前景云使用原站的 WebGL 云着色器，扩展为 64 个实例与错位的两排，独立渲染、流体扭曲与描边，有鼠标划过后的涡流与拖尾；6 朵远景云在城市后方单独漂移。实际作品来自相邻的 `zucai` 文件夹：7 条影像作品与 11 条带货预热，共 18 条。分类内直接播放自己的视频，保留声音与原画幅。

## 素材管理后台

双击项目目录中的 `启动素材后台.cmd`，或运行 `npm run admin`，打开 http://127.0.0.1:5230/ 。连接 GitHub 后可以上传视频与图片、编辑分类和描述、下架或重新上架作品。保存修改后，点击「发布到网站」更新 GitHub Pages。原有 48 条作品保留，新增作品追加；下架可以恢复。详细使用方法见 [个人素材后台](docs/material-admin.md)。

## 网站本地运行

```powershell
cd I:\xiaazai\zpj\0.001\portfolio
npm install
npm run dev
```

开发预览：http://127.0.0.1:5199/ 。端口已设为固定值；当前运行的服务可直接打开，无须重复启动。

```powershell
npm run build
npm run preview
```

生产预览：http://127.0.0.1:5201/ 。普通托管使用 `dist` 并配置页面路径回退到 `index.html`。GitHub Pages 使用 `npm run build:pages` 生成各页面的静态入口，支持作品页直接打开和刷新，详见 [GitHub 部署](docs/github-deployment.md)。

## 换内容

| 要修改的内容 | 文件或目录 |
| --- | --- |
| 作品名称、顺序、分类、简介、视频路径 | `src/data/works.ts` |
| 一级分类、分类说明与代表封面 | `src/data/categories.ts` |
| 网站名称、首页副标题、关于文案 | `src/data/site.ts` |
| 代码绘制角色、部件关节、眼睛图集和局部动作 | `src/gl/HomeCodeCharacters.ts` |
| 可编辑的角色曲线路径与配色 | `src/data/home-character-paths.json` |
| 按选定图重新转换角色曲线 | `scripts/trace_home_characters.py`；随后运行 `scripts/trace_complete_octopus.py` 保留新版完整章鱼 |
| 完整章鱼参考图与生图提示词 | `public/home-ai/octopus-complete-v1.png` / `public/home-ai/octopus-complete-v1.prompt.txt` |
| 静态降级的同款代码角色 | `src/gl/HomeCodeFallback.ts` |
| 插画概念图与气球素材 | `public/home-ai/hero-v5.png` / `public/home-ai/layers/` |
| 原站遮罩与素材来源 | `public/home-original/ponpon-mask.webp` / `public/home-original/SOURCE.md` |
| 原站独立前景云、鼠标排斥与回弹 | `src/gl/HomeForegroundClouds.ts` |
| 原站星点、萤火光点、自动和点击烟花 | `src/gl/HomeReferenceParticles.ts` |
| 原站遮罩、云形与描边 GLSL（保留来源） | `src/gl/HomeOriginalShaders.ts` |
| 原抠图素材制作脚本（角色已由代码替代） | `scripts/prepare_home_ai_layers.py`（Python + Pillow + numpy + OpenCV） |
| 首页分层、镜头、入场和曲线动画 | `src/gl/HomeAiScene.ts` |
| 代码绘制的舞台与底座 | `src/gl/HomeAiStage.ts` |
| 鼠标流体计算 | `src/gl/HomeFluid.ts` |
| 人物动作/波纹 GLSL、首页文字与静态降级 | `src/gl/HomeAiShaders.ts` / `src/pages/HomePage.tsx` / `src/styles/home-original.css` |
| 作品目录方形封面 | `public/covers/{slug}.jpg` |
| 播放前的原比例静帧 | `public/media/{slug}-poster.jpg` |
| 网页视频 | `public/videos/{slug}.mp4` |
| 滚轮、拖拽、吸附手感 | `src/config/motion.ts` 的 `nav` 参数 |
| 首页与目录转场时间 | `src/lib/transition.ts` |
| 目录专辑尺寸、透视、位置 | `src/gl/WorksScene.ts` |
| 反光与封面材质 | `src/gl/CoverMaterial.ts` |

现有作品名按文件日期与类别填写。填写正式片名时修改 `title` 即可；没有填写虚构客户、奖项或履历。`role` 和 `process` 当前为空，填写后详情页会自动显示对应栏目。

视频使用 H.264、AAC、yuv420p 与 faststart，16 条竖屏为 594×1056，2 条横屏为 1920×1080。网页视频合计约 142 MB，原片约 1.59 GB；原片未修改。方形封面取自真实影片：剧情片围绕主体裁切，产品片保留画面并加衬底；播放画面保持原比例。

新素材准备流程与溯源见 [素材接入](docs/素材接入.md) 和 [媒体清单](docs/media-manifest.json)。批处理脚本需要 Python、Pillow、FFmpeg 和 FFprobe；普通运行网站不需要这些工具。

```powershell
# 核对全部 18 条网页视频、封面、时长、比例和音轨
python -X utf8 scripts/verify_portfolio_media.py
```

## 浏览方式

作品分类与视频浏览的底部控制条已按原站 `ChaptersButton` 的参数加入弹性入场、逐行揭开和悬停反馈；背景大圆接入 `OQ` 的真实 GPU 流体波纹，鼠标滑过会改变边缘与色带，停止后逐渐消散。实现与来源见 [控制条和圆圈动效](docs/control-bar-fluid/README.md)。

- 首页点击“进入作品”，先看到 AI 短片（5）、动画影像（2）、带货预热（11）三个一级分类。
- 点击分类后，在该类视频中左右切换。横屏以 16:9 展示，竖屏以 9:16 展示；点击当前画面或控制条直接原地播放，不再跳到额外详情页。支持进度拖动、暂停与全屏。
- 切换影片或离开分类时停止当前视频；每个分类独立记忆选中的位置。
- 详情页支持播放、暂停、进度拖动、全屏和前后作品。进度条聚焦时方向键调整进度，详情页其他位置的左右键切换作品。
- 返回目录恢复进入前的位置。关于页采用原生文档滚动，章节定位点可以跳转。
- 尊重系统“减少动态效果”，WebGL 不可用时提供静态封面浏览。

## 本轮验证与实现边界

构建、媒体检查与桌面/手机尺寸浏览器检查已完成，见 [真实视频版验收记录](docs/own-videos-acceptance.md)，截图保存在 `docs/own-videos-review/`。

分类与原地播放结构、改分类和封面的具体方法见 [分类导航说明](docs/category-navigation.md)，本轮验证见 [分类与原地播放验收](docs/category-acceptance.md)。

当前首页布局与交互见 [气球、云量与舞台透视 v8](docs/home-interaction-v8/README.md)，原站粒子接入见 [首页透视与原站粒子 v7](docs/home-interaction-v7/README.md)，云流体参数见 [首页分层交互 v6](docs/home-interaction-v6/README.md)，原站机制见 [首页源码分析](docs/reference-home-mechanism.md)。自己的角色继续使用批准的插画轮廓和关节动画；遮罩、前景云、星点、萤火光点与烟花使用归档原站 GLSL，云和烟花运动逻辑也从原源码移植。气球使用现有自有素材与错峰上升循环。原站的角色图集未接入当前首页。此前 [首页分层交互 v5](docs/home-interaction-v5/README.md)、[AI 动态首页验收](docs/ai-home-acceptance.md) 与 [原版首页验收](docs/home-original-acceptance.md) 为历史记录。

顶部文字在 [标题与导航排版 v9](docs/home-typography-v9/README.md) 中改为单行站名、居中的副标题和统一基线的导航；增加逐字翻入、分隔线展开、星标呼吸，以及鼠标移动时的轻微文字透视。

首页、一级分类、分类内视频、详情和关于页共用同一个固定顶栏：左侧“作品”、中间“作品集网站”、右侧“关于”使用同一行布局，文字中心对齐，切换节点不改变位置。共享布局位于 `src/styles/site-header.css`，站名与动效位于 `src/components/SiteWordmark.tsx`。桌面顶部使用 `clamp(24px, 3vh, 70px)`，竖屏使用 `clamp(44px, 5.4vh, 76px)`，均计入顶部安全区域。逐字翻入结束后，五个字每约三秒依次轻轻起伏，最大位移 4px；系统减少动态效果时关闭。“进入作品”字号从 22px 增加至 28px、字重 900，四字之间留 `0.06em` 间隔，按钮随文字宽度伸展，保持居中；点击进入一级作品分类。

最新鼠标 3D 随动强度在 0.49 基础上再减少 30%，当前参数为 0.343；镜头、角色、底座、气球鼠标随动共用该参数。统一参数位于 `src/config/homeMotion.ts`，最初的调整记录见 [3D 随动减弱说明](docs/home-3d-reduction/README.md)。桌面地面 Y 为 -249，窄屏为 -181；左侧章鱼再沿地面向前移动 40 个世界单位，正面画面略微下移，角色与接触阴影保持贴地。深度参数位于 `src/gl/HomeAiStage.ts`。

前景章鱼与鸟已修复落地：红色地面改为水平网格，角色动作围绕固定的支撑点展开，脚下有贴地阴影，脚边云层略微下沉。桌面转动、手机布局与生产预览的验证见 [角色落地修复](docs/home-grounding/README.md)。

章鱼进一步补齐为完整坐姿：用内置生图工具补画原来被云截断的下缘和触手，再转换成纯色曲线路径。新版使用连续网格承载头部、触手随动和眨眼，底部触手完整贴地，避免旧关节裁切再次破坏轮廓。接入说明与截图见 [完整章鱼重绘](docs/octopus-grounding/README.md)。

目录动效依据见 [真实视频版动效说明](docs/own-videos-motion.md)。其中旧影院首页与噪声近似流体的描述属于此前版本，以本轮首页文档为准。

参考公开前端归档位于相邻 `ponpon-public-source/`，关键机制提取在其 `excerpts/` 中。本项目的目录专辑是刚性薄盒，旧版“封面速度弯曲”和“整屏云层上涌”已替换。`docs/motion-spec.md`、`docs/acceptance.md` 及 `docs/README-before-own-videos.md` 是前版历史记录，以本轮两份文档为准。



## 章节式播放页（2026-10-02）

分类内播放与单条视频链接已接入参考站章节 3 的背景与纸张顶点 shader。按当前设计，视频播放页已移除奶油色云朵及其渲染层。播放时保持真实视频比例，换片用同一条水平纸张运动，控制栏固定底部。源码对应和开发/生产实测见 [章节式播放页说明](docs/chapter-reader/README.md)。

首次进入需点击播放；第一次成功播放后，本次访问中通过滚轮、拖拽、按钮或方向键切换到其他视频，停稳后自动播放。换片时暂停上一条；手动暂停当前视频会保持暂停。

视频与分类卡片具有实体侧边和背面。点击范围跟随卡片轮廓：点击邻片直接选择该项，点击空白不切换；点击当前分类进入视频列表，点击当前视频播放或暂停。

手机首页角色、标题和播放控制条按小屏调整。用户反馈轻量视频版本在其网络下无法加载后，已恢复原视频地址和原渲染方式；轻量版本暂不启用。原因、体积指标及验证范围见 [手机播放与比例优化](docs/mobile-playback.md)。
