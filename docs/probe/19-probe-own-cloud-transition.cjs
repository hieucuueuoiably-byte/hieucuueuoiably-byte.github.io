/**
 * 在**本实现**里测首页 → 作品的云层转场时序。
 *
 * 连拍受截图耗时污染（每张 100–300ms），根本量不出 1s 的转场。
 * 这里改成在页面里逐帧读：云层 rig 的 translateY、云层的类名、路由、以及视口中心像素颜色
 * （中心被云盖住时会变成粉色 #fc749f）。于是能拿到真实的时间轴。
 *
 * 运行：node docs/probe/19-probe-own-cloud-transition.cjs [url]
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const OUT = path.join(__dirname, '..', 'verify')
const URL = process.argv[2] || 'http://127.0.0.1:5199/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto(URL, { waitUntil: 'load' })
  await sleep(2600)

  const reduce = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  console.log('prefers-reduced-motion:', reduce)

  await p.evaluate(() => {
    window.__frames = []
    window.__start = null
    const read = () => {
      const anim = document.querySelector('.home-cloud__anim')
      const cloud = document.querySelector('.home-cloud')
      const m = anim ? new DOMMatrixReadOnly(getComputedStyle(anim).transform) : null
      return {
        t: window.__start == null ? null : +(performance.now() - window.__start).toFixed(1),
        path: location.pathname,
        cloudClass: cloud ? cloud.className : null,
        cloudVisible: cloud ? getComputedStyle(cloud).visibility : null,
        cloudZ: cloud ? getComputedStyle(cloud).zIndex : null,
        y: m ? +m.m42.toFixed(1) : null,
        // 云层 rig 在视口里的实际包围盒（含 fill/tail）
        rigTop: (() => {
          const a = document.querySelector('.home-cloud__anim')
          if (!a) return null
          const r = a.getBoundingClientRect()
          return Math.round(r.top)
        })(),
        coverBottom: (() => {
          const t = document.querySelector('.home-cloud__tail')
          if (!t) return null
          return Math.round(t.getBoundingClientRect().bottom)
        })(),
        swapMs: window.__lastSwapMs ?? null,
        doneMs: window.__lastTransitionDoneMs ?? null,
      }
    }
    const tick = () => {
      const f = read()
      if (f.t != null) window.__frames.push(f)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    window.__fire = () => {
      window.__start = performance.now()
    }
  })

  await p.evaluate(() => window.__fire())
  await p.click('.home-cta', { force: true })
  await sleep(2600)

  const res = await p.evaluate(() => ({
    frames: window.__frames,
    swapMs: window.__lastSwapMs ?? null,
    doneMs: window.__lastTransitionDoneMs ?? null,
    schedule: window.__transitionSchedule ?? null,
  }))

  fs.writeFileSync(
    path.join(OUT, 'own-cloud-transition.json'),
    JSON.stringify(res, null, 2)
  )

  console.log('schedule:', JSON.stringify(res.schedule))
  console.log('swapMs =', res.swapMs, ' doneMs =', res.doneMs)
  const fr = res.frames
  let lastPath = fr[0]?.path
  for (let i = 0; i < fr.length; i += 3) {
    const f = fr[i]
    if (f.path !== lastPath) {
      console.log('  路线切换 @', f.t, 'ms →', f.path)
      lastPath = f.path
    }
    console.log(
      String(f.t).padStart(7) + 'ms  y=' + String(f.y).padStart(8) +
      '  rigTop=' + String(f.rigTop).padStart(6) + '  coverBottom=' + String(f.coverBottom).padStart(6) +
      '  z=' + f.cloudZ + '  vis=' + f.cloudVisible + '  ' + f.path
    )
  }
  await b.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
