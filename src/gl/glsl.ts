/**
 * 着色器公共代码块。
 *
 * 这些函数是从参考站产物里抄回来的通用数学工具（`scaleUV` / `cmap` / `rotateUV` / `snoise`
 * 在参考站 GLSL 92、93、114、116、155 里反复出现），加上本实现补充的 `snoise3`、`hash`、`grain`。
 * 观察证据见 docs/motion-spec.md E14。
 */

/** 2D simplex noise（Ashima / Stefan Gustavson 版，参考站用的同一份实现） */
export const GLSL_SNOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

/** 多八度 fbm，用于背景有机色块 */
float fbm(vec2 p, int octaves, float lacunarity, float gain) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8776, 0.4794, -0.4794, 0.8776);
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * snoise(p);
    p = rot * p * lacunarity;
    a *= gain;
  }
  return v;
}
`

/** UV 工具（照搬参考站 GLSL 114/93 的写法，语义等价） */
export const GLSL_UV = /* glsl */ `
float map_range(float v, float a, float b, float c, float d) {
  float span = b - a;
  if (abs(span) < 1e-6) return c;
  return ((v - a) * (d - c)) / span + c;
}

/** 参考站里叫 cmap：先映射再 clamp，端点是乱序也照样能用 */
float cmap(float v, float a, float b, float c, float d) {
  return clamp(map_range(v, a, b, c, d), min(c, d), max(c, d));
}

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
`

/** 颗粒 + 抖动 */
export const GLSL_GRAIN = /* glsl */ `
float hash11(float n) { return fract(sin(n) * 43758.5453123); }
float hash12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 hash22(vec2 p) {
  return vec2(hash12(p), hash12(p + vec2(31.7, 17.3)));
}

/**
 * 胶片颗粒。参考站背景有明显颗粒（E17），且用 floor(uTime*0.01)*5 做"每隔 0.2 秒换一次"
 * 的采样保持，避免颗粒逐帧频闪——这里沿用同一手法。
 */
float grain(vec2 uv, float time, float strength) {
  float step_ = floor(time * 12.0);
  vec2 j = hash22(uv * 1024.0 + step_ * 13.7);
  float n = hash12(uv * vec2(1920.0, 1080.0) + j * 137.0 + step_);
  // 中灰附近抖动，视觉上更像胶片而不是白噪
  return (n - 0.5) * strength;
}
`
