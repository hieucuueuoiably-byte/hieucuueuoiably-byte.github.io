/**
 * 量云层 rig 各段在若干 yPercent 下的实际屏幕矩形，并逐一截图。
 *
 * 为什么要这么量：截图里曾看到"上涌到 -100% 还被露底"，但按设计算应该全程遮住。
 * 与其继续推算 CSS 百分比，不如把 rig 手动设到指定位置，直接读 getBoundingClientRect + 截图。
 * （当时就是这样找出根因的：那版把云图上下翻转再放一份当"尾段"，
 *   travel 到 -100% 时那段翻转层的透明区正好压在屏幕下半部 → 下半截露底。）
 *
 * 运行：node docs/probe/24-cloud-geometry.cjs
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const path = require('path')
const fs = require('fs')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const YS = [0, -40, -70, -100, -140, -180, -204]

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

  const dir = path.join(__dirname, '..', 'verify', 'cloud-states')
  fs.mkdirSync(dir, { recursive: true })

  const rows = []
  for (const yp of YS) {
    const snap = await p.evaluate((v) => {
      const anim = document.querySelector('.home-cloud__anim')
      anim.style.transform = `translateY(${v}%)`
      const R = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return [Math.round(r.top), Math.round(r.bottom), Math.round(r.height)]
      }
      return {
        yp: v,
        stage: R('.home-cloud__stage'),
        anim: R('.home-cloud__anim'),
        art: R('.home-cloud__img'),
        fill: R('.home-cloud__fill'),
      }
    }, yp)
    await sleep(90)
    await p.screenshot({ path: path.join(dir, `y${String(Math.abs(yp)).padStart(3, '0')}.png`) })
    rows.push(snap)
  }

  await p.evaluate(() => {
    document.querySelector('.home-cloud__anim').style.transform = ''
  })

  fs.writeFileSync(
    path.join(__dirname, '..', 'verify', 'cloud-geometry.json'),
    JSON.stringify(rows, null, 2)
  )
  console.log('stage 高 =', rows[0].stage[2], '  anim 高 =', rows[0].anim[2])
  console.log('yPercent | art 盒[top..bottom] | fill[top..bottom] | 推算覆盖区间')
  for (const r of rows) {
    // 云图实心部分是盒子下 29.65%（上沿 70.35%）；填充整段实心
    const artTop = r.art[0] + Math.round(r.art[2] * 0.7035)
    const coverTop = Math.min(artTop, r.fill[0])
    const coverBottom = r.fill[1] + Math.round(r.fill[2] * 0.034)
    console.log(
      String(r.yp).padStart(7) + ' | ' + String(r.art[0]).padStart(6) + '..' + String(r.art[1]).padStart(6) +
      ' | ' + String(r.fill[0]).padStart(6) + '..' + String(r.fill[1]).padStart(6) +
      ' | ' + coverTop + '..' + coverBottom
    )
  }
  console.log('WROTE cloud-geometry.json + cloud-states/')
  await b.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
