# 参考站关键着色器片段（节选，仅供技术对照）

来源：<https://ponpon-mania.com/> 公开发布的压缩前端产物（`/_nuxt/CfE0pqJa.js`），
抓取时间 2026-09-30。**版权归原作者（Patrick Heng / Justine Soulié）所有。**
这里只截取 `docs/motion-spec.md` 里实际引用到的少数几行做技术对照，
**本项目的实现是重写的**（见 `src/gl/CoverMaterial.ts`）。
完整的着色器转储没有放进交付目录（避免夹带他人源码）。

---

## 1. 封面形变（产物中的第 93 段 GLSL 字面量，片元着色器节选）

```glsl
vec2 baseUV = vUv;
vec2 centeredUV = baseUV - 0.5;
vec2 originalUV = baseUV;
baseUV = centeredUV;

// 由流体模拟纹理驱动的 UV 偏移
vec4 fluidColor = texture2D(tPanelFluid, gl_FragCoord.xy / uResolution);
baseUV.x -= fluidColor.r * 0.007 * vUv.y;
baseUV.y -= fluidColor.g * 0.007 * vUv.y;

// 低频高度扰动
float heightVariation = snoise(vec2(baseUV.x, baseUV.y - uLocalTime * 1.8) * 0.5 + uSeed.xy * 10.) * 0.5;

// 湍流 + 绕中心的旋转畸变  ← 本项目复用的核心思路
vec2 timeOffset = vec2(-uLocalTime * 0.04, -uLocalTime * 0.5);
float turbulence = snoise(baseUV * 1.6 + timeOffset + uSeed.zx * 10.);
float distFromCenter = max(0.1, length(baseUV));
baseUV += rotate(((turbulence - 0.5) / distFromCenter)
                 * smoothstep(-0.2, 0.4, originalUV.y) * 0.45) * baseUV;
```

**本项目怎么用**：保留「`(turbulence − 0.5) / distFromCenter` × 纵向 smoothstep × 系数」
这条旋转畸变主线，但

- 从 **UV 空间**改到 **顶点空间**（64×64 分段平面），所以纸张是真的起伏，并能重算法线；
- 系数 0.45 → 0.42，并乘上「有符号弯曲强度」`uBend`，让它随速度生长、停止后归零；
- 去掉了流体项（本项目没有流体求解器）。

---

## 2. 速度映射（产物中第 155 / 157 段 GLSL 字面量，节选）

```glsl
float velocityFactor = cmap(abs(uVelocity), 0., 10., 1., 4.);
// …
float lineVelocity  = cmap(abs(uVelocity), 1., 24., 0.0, 1.);
finalColor = mix(finalColor, vec3(0.0),
                 cmap(abs(hashY.x) * lineNoise, 0.35, .5, 0., 1.) * .6 * lineVelocity);
```

**本项目怎么用**：把「速度归一化后调制高频噪声暗线」这条手法用在背景（`uLineVel`）
与封面速度条纹上。但量纲不同（本项目是「格/秒」，参考站是流体速度场量级），
所以 `velocityRef = 3` 是本机实测定的（见 `docs/acceptance.md` V2），不是照搬 10 / 24。

---

## 3. 流体求解（产物中第 130 段 GLSL 字面量，节选）

```glsl
// vorticity 步：Pavel Dobryakov WebGL-Fluid-Simulation 的经典写法
vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
force /= length(force) + 0.0001;
force *= curl * C;
force.y *= -1.0;
vec2 vel = texture2D(uVelocity, vUv).xy;
gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
```

**本项目没有复现流体求解器** —— 它是参考站背景与封面扰动的来源之一，
但对「作品集浏览」这条链路的观感增益抵不上工程量，改用噪声 + 速度包络近似。
已在 `docs/motion-spec.md` 的「还没做到」里记为未复现项。

---

## 4. 反复出现的公共工具函数（只列名字）

`scaleUV` / `rotateUV` / `map` / `cmap` / `snoise`(Ashima 2D simplex) / `hash2` / `boxBlur` /
`rectangle` / `mirror` / `saturation` / `contrast` / `exposure`。

本项目的 `src/gl/glsl.ts` 提供同类工具：`snoise`（用的是同一份公开实现
Ashima Arts / Stefan Gustavson，MIT）、`fbm`、`cmap`（语义与参考站一致：先 map 再 clamp，
端点乱序也能用）、`rot2`、`grain`。
