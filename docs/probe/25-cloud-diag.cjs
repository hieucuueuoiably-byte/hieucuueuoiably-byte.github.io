/**
 * 定点诊断：把云层 rig 设到指定 yPercent，然后
 *  1) 读每个元素的实际计算样式与矩形；
 *  2) 沿视口中心竖线采样像素颜色，给出"哪些区间不是粉色"。
 * 用来确认"上涌到 -100% 还被露底"到底是几何算错还是贴图没上来。
 *
 * 运行：node docs/probe/25-cloud-diag.cjs
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const path = require('path')
const fs = require('fs')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await sleep(2600)

  const rows = await p.evaluate(async () => {
    const anim = document.querySelector('.home-cloud__anim')
    const info = []
    const els = {
      stage: '.home-cloud__stage',
      anim: '.home-cloud__anim',
      art: '.home-cloud__img',
      fill: '.home-cloud__fill',
      
      
    }
    for (const yp of [0, -60, -100, -140, -200]) {
      anim.style.transform = `translateY(${yp}%)`
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const snap = { yp }
      for (const [k, sel] of Object.entries(els)) {
        const el = document.querySelector(sel)
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        snap[k] = {
          rect: [Math.round(r.top), Math.round(r.bottom), Math.round(r.height)],
          tf: cs.transform,
          w: cs.width,
          h: cs.height,
          top: cs.top,
          complete: el.tagName === 'IMG' ? el.complete : undefined,
          natural: el.tagName === 'IMG' ? el.naturalWidth + 'x' + el.naturalHeight : undefined,
          currentSrc: el.tagName === 'IMG' ? el.currentSrc.split('/').pop() : undefined,
        }
      }
      info.push(snap)
    }
    anim.style.transform = ''
    return info
  })
  fs.writeFileSync(path.join(__dirname, '..', 'verify', 'cloud-diag.json'), JSON.stringify(rows, null, 2))
  for (const r of rows) {
    console.log('=== yPercent', r.yp, '===')
    for (const k of ['art', 'fill']) {
      console.log(
        '  ' + k.padEnd(8), 'rect', JSON.stringify(r[k].rect),
        'h=' + r[k].h, 'top=' + r[k].top,
        r[k].tf !== 'none' ? 'tf=' + r[k].tf : '',
        r[k].complete !== undefined ? `img ${r[k].currentSrc} ${r[k].natural} complete=${r[k].complete}` : ''
      )
    }
  }
  await b.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
