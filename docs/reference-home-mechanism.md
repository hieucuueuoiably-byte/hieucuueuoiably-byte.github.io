# 原站首页机制与素材坐标

核对来源：`../ponpon-public-source/formatted/CfE0pqJa.js`。以下为公开前端包的源码实证，图像与代码归原作者。用户要求复原首页互动时，用此表定位原机制，避免把章节页的纸张/火焰 shader 误当首页效果。

## 首页并非纯代码画角色

`xZ` 首页场景先把天空、月亮、城市、角色、气球和粒子渲染到 `sceneTarget`，再通过 `XJ` portal shader 将内部画面套进 `ponpon-mask`。前景云 `IJ` 再单独叠加。中央角色是一张身体图加眼睛图，侧面角色是部件图集；代码负责部件运动、眨眼、局部 UV 变形、相机与流体互动。

所有世界坐标采用 1×1 的平面几何。相机 z=5、fov=45；内部相机 near=2/far=80。外层相机 near=2/far=8，fov 在 aspect .8→1.25 时 clamp 映射 50→45。`t`/uTime 是秒，update 的 delta `n` 是毫秒。图集 cell 坐标以左下为原点；普通 PNG 的 OGL flipY 默认 true，与 Three TextureLoader 的默认行为一致。Basis 另有已预处理的方向设置，不能将其 flipY=false 直接套给 PNG。

## 中央 Ponpon：uZ / lZ（92354）

- `home-ponpon.png`：512×512；`home-ponpon-eyes.png`：162×80。
- plane scale=(2.09,2.09,2.09)，position=(-.07,.24,-.05)。
- shader 先围绕中点 scaleUV .9。局部 mask 给左/右耳 y 振幅约 .02/.012，频率 2；左臂 x=.004、y=.02；右臂 x/y=.02，频率 2.3。身体中央顶部呼吸 y=.01 cos(t×2.1)、x=.003 sin(t×1.1)。
- 眼睛 UV：`scaleUV(uv, vec2(162./512.,80./512.), vec2(.5))`，x+=.002，y-=1.85；alpha<.9 归零；blink=`step(sin(t*2.5)+sin(t*25.)*.23,.7)*uBlinkToggle`。再用裁剪 alpha 排除贴图边界。
- uRotation 入场 0→1 时对中心距离加权旋转 UV（13.01×(1-uRotation)），并提亮中心；完成后开启眨眼。
- 首次 delay .4，返回 .6；scale 0→base，1.1s elastic.out(1,1)；y 从 base+.5 返回，1.2s expo.out；uRotation 1s elastic.out(1.1,.95)。

## 左侧 Jean Loup：gZ（93325）

`home-jl-sprite.png` 为 1024×1024。它不是逐帧整人动画，而是部件图集。

| 部件 | 图集网格 | cell(x,y) | 局部 scale | 局部 position |
|---|---|---|---|---|
| body | 2×2 | (0,1) | 1.78 | (0,0,0) |
| head 开/闭眼 | 2×4 | (0,0)/(0,1) | (1.8,.9,.9) | (.2,.9,.33) |
| tail | 4×4 | (3,2) | 1 | (.4,.4,0) |
| tail pivot | 无 | 无 | 1.1 | (.2,-.17,-.06) |
| 右臂 | 4×4 | (2,3) | 1 | (0,0,0) |
| 右臂 pivot | 无 | 无 | 1.02 | (.58,.3,.2) |
| 左臂 | 4×4 | (2,1) | 1 | (-.5,.5,0) |
| 左臂 pivot | 无 | 无 | 1.11 | (.355,.225,-.09) |
| beer | 4×4 | (2,0) | .794 | (-.95,.817,.1)，左臂 pivot 子物体 |
| beer mask | 4×4 | (3,0) | 由 shader 合成 | 同 beer |
| beer outline | 4×4 | (3,1) | 由 shader 合成 | 同 beer |
| cloth | 4×4 | (2,2) | .75 | (.47,.35,.24) |
| tray | 4×4 | (3,3) | .97 | (.17,.22,.3) |

group rotation.y=.15，scale=.9；横屏 position=(-1.3,-1,.5)，竖屏=(-.9,-1.2,.5)。tail pivot z=sin(t×.7)×.078；左臂 pivot z=sin(t×3)×.04；盘 z=sin(t×4)×.006-.01、x+=sin(t×4)×.006；右臂 x+=sin(t×4)×.004。通用 Br 当前只做图集采样；头部与关节另有局部动画。head mZ 以 cell y切换眨眼，并按鼻/嘴/耳/颊/毛的 UV 距离 mask 加 .003–.01 的局部位移。beer fZ 对液面叠多个正弦并减 fluid.xy×.00015，叠 mask 和 outline；是动态液体而非整杯移动。

首次 delay .66，返回 .86；从 base.x+.4 回归 .7s cubic.out；scale 0→.9，1.5s elastic.out(1.05,1.1)；rotation.z .13→0，1.2s elastic.out(1,1.1)。

## 右侧 Simon：dZ（92840）

`home-simon.png` 为 1024×1024。

| 部件 | 图集网格 | cell(x,y) | scale | position |
|---|---|---|---|---|
| body | 2×1 | (0,0) | (1.5,3,1.5) | (0,0,0)，rotation.y=.05 |
| 右臂 | 4×4 | (2,1) | .9 | (.7,0,-.4) |
| 左臂 | 4×4 | (2,0) | .9 | (-.315,.24,.1) |
| pan | 4×4 | (3,1) | 1 | (0,0,0)，右臂子物体，renderOrder12 |
| crepe | 4×4 | (3,0) | .46×factor | (.223,-.105,0)，右臂子物体，renderOrder11 |
| eye overlay | 4×4 | (2+blink,2) | cZ 内叠加 | 非独立 mesh |
| tongue overlay | 4×4 | (2,3) | cZ 内叠加 | 非独立 mesh |

group rotation.y=.1；横屏 scale1/position(.9,-.9,1.2)，竖屏 scale.9/position(.53,-.9,1.2)。cZ 对身体顶部 sin(t×1.1)×.014 的 y 和 sin(t×.9)×.021 的 x 做呼吸；鼻、双嘴、尾各自有距离 mask，眼与舌通过 shader 自行合成，不要额外完整头部图。右臂 rotation.x=sin(t×1.5)×.2。循环 GSAP repeat=-1/yoyo：offsetArmPos 0→(-.05,-.04) 1s，再→(-.01,.04) 1s；右臂 z 0→-.1 1s，再→.25 1s；煎饼 y .03→.6，x→.1，同时完整翻一圈；factor 1.4→1.6。首次 delay .71，返回 .91；其余入场参数与左侧同。

## 内景布景：rZ / ZJ / eZ

| 对象/素材 | 尺寸 | scale | position | 动态 |
|---|---|---|---|---|
| home-city | 2048×1024 | 横屏(4,4,4)，竖屏(9.4,4.7,9.4) | (0,.2,-4) | 左右分别按 backOut(uCityIntro) 自底部 UV 展开 |
| home-woofers 左/右 | 1024×512 | 2 | (-3.28,-.68,-4.1)/(3.2,-.68,-4.1) | 取贴图左/右半，四个鼓点区 .05 sin(t×22)缩放，位置 y+=sin(t×12)×.003 |
| home-veggies | 2048×512 | (6,1.5,1.5) | (.015,-.65,-.4) | 上沿 dispX=sin(t×5+vUv.y×16)×.0005×vUv.y |
| ponpon-plateform | 508×290 | (508/290,1,1) | (0,-.9,-.1) | 粉色高光斜向 sweep，4s 循环；入场 scale .8→1，1s elastic.out(2,.9)，delay .3 |
| disc | shader，无图 | (1638/461,1.7,2)×2.03 | (0,-1.5,-.5)，rotation.x=-π/2.7 | shader 画红/粉双色圆盘黑描边，入场2s elastic.out(.6,.9)，delay .1 |
| loop-sky-top | 2048×512 | sphere(12.6,9,16.2) | (0,2,-5) | 内向 FRONT cull，不写深度，rotation.y-=deltaMs×.00003 |
| loop-sky-bottom | 2048×512 | sphere(18,15,27) | (0,10,-12) | 同上，rotation.y-=deltaMs×.00001-π；原表达式需注意周期/数学等价 |
| home-moon | 128×128 | 14 | (7.7,10,-35) | halo 白光 .2→.5，sin(t×2.15)；rotation.z=sin(t)×.15；scale 0→14 2s elastic.out(2,1)，delay .8 |

天空 Q3 的 uFluid 实际未采样（写死 vec4(0)），不要误称天空也受流体驱动。右 Simon 调用 animateIn 两次是源码原样，移植时只需一次。

## 鼠标波纹/曲线：Da + XJ + IJ

Da 为压力投影流体 solver，首页参数 simRes64、dyeRes256、pressure iterations3、densityDissipation=.9、velocityDissipation=.2、pressureDissipation=1、curlStrength=2、radius=1（splat shader radius=.01）。鼠标 delta(px)×5 注入 velocity 和 density 的 xy，z=1。每帧流程是 splat→curl→vorticity→divergence→pressure clear→pressure iterate×3→gradient subtract→velocity advection→density advection。输出的是 density.read.texture，而非 velocity纹理。advection dt 固定 .016。

XJ（90539）采样 `tFluid`：内部画面 scale=1-fluid.z×.00001，green channel UV+=fluid.xy×.00002（源码同一句两次，重写一次即等价）；mask UV-=fluid.xy×.00005。mask 为 `ponpon-mask`，红通道展示内景，绿通道描边，描边色 mix(black,#E5B58C,min(1,fluid.z×.23))，外景背景 #7E7EFF。portal 基础scale映射 aspect .5→1 为 .99→1.1，加sin(t×.9)×.05，再乘 uIntro×1.05×mix(1,1.1,uHovered)，aspect<.9 时再×1.5。mask自带耳和颊曲线：两耳 y+=sin(t×3)×.04、x .005；双颊 x ±sin(t×3.1)×.002。入场 uIntro→1 3s elastic.out(2,1.2)，首次delay .35、返回 .45；竖屏 delay .6/ease elastic.out(1.5,1.4)。

`IJ` 云是40个 shader画的扁圆 instancedquad，在独立透明RT合成，颜色 #EC8DB6。位置x=-3.3→3.3，y约-1.6并随边缘抬升，z=1→1.05；随机spring .05–.15、damping .05–.2。鼠标2世界单位范围排斥，云团x被推开，y向下，弹簧收敛。RJ 云合成 shader 全屏 uv-=fluid.xy×.00025，黑边以8方向 alpha采样获得，pixelSize=.005+fluid.z×.00005。云不是PNG，且其曲线可以同时受到fluid拖拽与弹簧位移。

## Hover 与进入作品

DOM主按钮 mouseenter 发 home:mouse-enter，场景 uHovered0→1+内部相机fov45→39，1s cubic.out、delay .2；mouseleave恢复0/45，.6s cubic.out。镜头z=5-hover×.8，y额外-hover×.3；有短暂50Hz/30Hz、振幅 .005 的相机shake。点击uClicked→1 1s cubic.out，云退场；完整路由转场仍用既有双RT GQ/HQ（详见已有 home-transition.md），而非由这些云挡屏。

这是原站真实首页着色器链路。当前移植在最终合成处统一处理色彩空间：内部保留原始编码采样，送入线性转场 RT 时转换一次；图集贴图自身不得强行在纹理UV上再做cover裁切，否则部件位置会错。若只把整个人PNG做translate/scale，无法复现部件呼吸、眼睛和煎饼翻转。
