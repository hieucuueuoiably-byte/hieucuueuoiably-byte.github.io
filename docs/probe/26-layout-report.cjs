/**
 * 版式读数：把作品页 / 详情页的关键矩形打成一张表，用来判定
 *  - 控制胶囊有没有贴住封面（或播放舞台）的下沿；
 *  - 播放舞台的矩形与 WebGL 里封面接续的落点是否同一个；
 *  - 视频是否保住了自己的比例（没有被拉伸）。
 *
 * 用法：node docs/probe/26-layout-report.cjs
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const path = require('path')
const fs = require('fs')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PAGES = [
  { name: 'works', url: 'http://127.0.0.1:5199/works' },
  { name: 'detail-16x9', url: 'http://127.0.0.1:5199/works/salt-horizon' },
  { name: 'detail-9x16', url: 'http://127.0.0.1:5199/works/nine-lives' },
  { name: 'works-phone', url: 'http://127.0.0.1:5199/works', w: 390, h: 844 },
]

const READ = `(() => {
  const R = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2) }
  }
  const s = window.__scene
  const st = s && s.debugReadState ? s.debugReadState() : null
  const video = document.querySelector('video')
  return {
    viewport: [innerWidth, innerHeight],
    stage: R('.detail__stage'),
    videoEl: video ? (() => { const r = video.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), ratio: +(r.width/r.height).toFixed(4), intrinsic: video.videoWidth + 'x' + video.videoHeight } })() : null,
    bar: R('.control-bar'),
    cover: st ? { mesh: st.mesh, mode: st.mode, focus: st.focus, fit: null } : null,
    bg: st ? { blobR: st.blobR, colorA: st.bgColorA, colorB: st.bgColorB } : null,
    cssCover: getComputedStyle(document.documentElement).getPropertyValue('--cover-squash').trim(),
  }
})()`

;(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const out = {}
  for (const pg of PAGES) {
    const ctx = await b.newContext({
      viewport: { width: pg.w || 1440, height: pg.h || 900 },
      deviceScaleFactor: 1,
    })
    const p = await ctx.newPage()
    await p.goto(pg.url, { waitUntil: 'load' })
    await sleep(3400)
    out[pg.name] = await p.evaluate(READ)
    await ctx.close()
  }
  fs.writeFileSync(
    path.join(__dirname, '..', 'verify', 'layout-report.json'),
    JSON.stringify(out, null, 2)
  )
  for (const [k, v] of Object.entries(out)) {
    console.log('=== ' + k + '  viewport ' + v.viewport.join('x') + ' ===')
    console.log('  control-bar :', JSON.stringify(v.bar))
    console.log('  detail stage:', JSON.stringify(v.stage))
    console.log('  video       :', JSON.stringify(v.videoEl))
    console.log('  封面 mesh    :', JSON.stringify(v.cover && v.cover.mesh), ' mode=' + (v.cover && v.cover.mode), ' focus=' + (v.cover && v.cover.focus))
    console.log('  背景         :', JSON.stringify(v.bg), ' cover-squash=' + v.cssCover)
  }
  await b.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
