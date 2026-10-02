/**
 * 生成占位封面 SVG。
 *
 * 用途：项目里没有真实封面图时，先用这套占位把版式和动效跑通。
 * 它们**明确标注为占位**（角上有「占位封面 / PLACEHOLDER」标签），不会被误认成真实作品。
 *
 * 用法：node scripts/gen-placeholders.mjs
 * 输出：public/covers/<slug>.svg  +  public/covers/index.json
 *
 * 换成真封面：把同名 .jpg/.png 放进 public/covers/，然后在 src/data/works.ts 里
 * 改 work.cover 的扩展名即可（脚本不会覆盖已存在的位图）。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = join(root, 'public', 'covers')
mkdirSync(outDir, { recursive: true })

/* ---------------- 从 works.ts 里读作品（单一数据源，避免两边不同步） ---------------- */
const worksSrc = readFileSync(join(root, 'src', 'data', 'works.ts'), 'utf8')

function pickAll(re) {
  const out = []
  let m
  while ((m = re.exec(worksSrc))) out.push(m)
  return out
}

const blocks = worksSrc.split(/\n  \{\n/).slice(1)
const works = blocks
  .map((b) => {
    const g = (k) => {
      const m = b.match(new RegExp(`${k}:\\s*'([^']*)'`))
      return m ? m[1] : ''
    }
    const colors = (b.match(/themeColors:\s*\[\s*'([^']+)',\s*'([^']+)'\s*\]/) || []).slice(1)
    return {
      slug: g('slug'),
      no: g('no'),
      title: g('title'),
      category: g('category'),
      tagline: g('description'),
      colorA: colors[0] || '#cccccc',
      colorB: colors[1] || '#555555',
    }
  })
  .filter((w) => w.slug)

if (!works.length) {
  console.error('没能从 works.ts 里解析出作品，请检查文件结构是否变了。')
  process.exit(1)
}

/* ---------------- 版式 ---------------- */
const S = 1024

/** 每个封面一套几何装饰，按序号变化，避免六张长得一样 */
function decorations(i, a, b, dark) {
  const seed = i * 37 + 11
  const rnd = (n) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  const parts = []
  // 大圆
  parts.push(
    `<circle cx="${(rnd(1) * S).toFixed(0)}" cy="${(rnd(2) * S).toFixed(0)}" r="${(S * (0.28 + rnd(3) * 0.26)).toFixed(0)}" fill="${a}" opacity="0.72"/>`
  )
  // 弧带
  const cx = (rnd(4) * S).toFixed(0)
  const cy = (rnd(5) * S).toFixed(0)
  for (let k = 0; k < 3; k++) {
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${(S * (0.18 + k * 0.1)).toFixed(0)}" fill="none" stroke="${b}" stroke-width="${8 - k * 2}" opacity="${(0.5 - k * 0.12).toFixed(2)}"/>`
    )
  }
  // 斜纹块
  const rot = (rnd(6) * 30 - 15).toFixed(1)
  parts.push(
    `<g transform="rotate(${rot} ${S / 2} ${S / 2})" opacity="0.16"><rect x="${-S / 4}" y="${S * (0.35 + rnd(7) * 0.3)}" width="${S * 1.5}" height="${(14 + rnd(8) * 22).toFixed(0)}" fill="${dark}"/></g>`
  )
  parts.push(
    `<g transform="rotate(${(-rot * 1.6).toFixed(1)} ${S / 2} ${S / 2})" opacity="0.1"><rect x="${-S / 4}" y="${S * (0.2 + rnd(9) * 0.5)}" width="${S * 1.5}" height="${(8 + rnd(10) * 14).toFixed(0)}" fill="${dark}"/></g>`
  )
  // 小点阵
  for (let k = 0; k < 14; k++) {
    parts.push(
      `<circle cx="${(rnd(20 + k) * S).toFixed(0)}" cy="${(rnd(40 + k) * S).toFixed(0)}" r="${(2 + rnd(60 + k) * 5).toFixed(1)}" fill="${dark}" opacity="0.22"/>`
    )
  }
  return parts.join('\n    ')
}

function svgFor(w, i) {
  const { colorA: a, colorB: b, no, title, category, tagline } = w
  const dark = '#171717'
  const light = '#feece3'
  const deco = decorations(i, a, b, dark)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="${escapeXml(
    title
  )} — 占位封面">
  <defs>
    <linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <filter id="n${i}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="t"/>
      <feColorMatrix in="t" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.16"/></feComponentTransfer>
    </filter>
    <pattern id="dots${i}" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="${dark}" opacity="0.16"/>
    </pattern>
  </defs>

  <rect width="${S}" height="${S}" fill="url(#g${i})"/>
  <g>
    ${deco}
  </g>
  <rect width="${S}" height="${S}" fill="url(#dots${i})"/>
  <rect width="${S}" height="${S}" filter="url(#n${i})" opacity="0.6"/>

  <!-- 上下压暗，加深色文字可读 -->
  <rect y="${S - 330}" width="${S}" height="330" fill="${dark}" opacity="0.62"/>
  <rect width="${S}" height="150" fill="${dark}" opacity="0.5"/>

  <!-- 序号 -->
  <text x="64" y="112" fill="${light}" font-family="'Libre Franklin',Helvetica,Arial,sans-serif"
        font-size="62" font-weight="800" letter-spacing="-2">${escapeXml(no)}</text>

  <!-- 占位标记 -->
  <g transform="translate(${S - 300} 62)">
    <rect x="0" y="0" width="236" height="46" rx="23" fill="${light}" opacity="0.92"/>
    <text x="118" y="30" text-anchor="middle" fill="${dark}"
          font-family="'Libre Franklin',Helvetica,Arial,sans-serif" font-size="19" font-weight="800"
          letter-spacing="1.4">占位封面 PLACEHOLDER</text>
  </g>

  <!-- 标题与分类 -->
  <text x="64" y="${S - 186}" fill="${light}" font-family="'Libre Franklin',Helvetica,Arial,sans-serif"
        font-size="76" font-weight="800" letter-spacing="-2.4">${escapeXml(title)}</text>
  <text x="66" y="${S - 140}" fill="${light}" opacity="0.78"
        font-family="'Libre Franklin',Helvetica,Arial,sans-serif" font-size="24" font-weight="700"
        letter-spacing="3.6">${escapeXml(category.toUpperCase())}</text>
  <text x="64" y="${S - 78}" fill="${light}" opacity="0.66"
        font-family="'Libre Franklin',Helvetica,Arial,sans-serif" font-size="21" font-weight="500"
        letter-spacing="0.4">${escapeXml(tagline.slice(0, 34))}</text>
</svg>
`
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]))
}

/* ---------------- 写文件 ---------------- */
let n = 0
for (let i = 0; i < works.length; i++) {
  const w = works[i]
  const file = join(outDir, `${w.no}-${w.slug}.svg`)
  if (existsSync(file)) {
    console.log('跳过（已存在）', file)
    continue
  }
  writeFileSync(file, svgFor(w, i), 'utf8')
  console.log('生成', file)
  n++
}

writeFileSync(
  join(outDir, 'index.json'),
  JSON.stringify(
    works.map((w) => ({ slug: w.slug, no: w.no, title: w.title, placeholder: `${w.no}-${w.slug}.svg` })),
    null,
    2
  ),
  'utf8'
)

console.log(`\n完成：${n} 个封面，${works.length} 条索引。`)
