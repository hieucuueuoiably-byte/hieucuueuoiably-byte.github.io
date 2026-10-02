/**
 * 快速 longtask 探针：把某个路由直接打开，看首屏有多少主线程长任务。
 * 用来判断"转场里那一下 347ms 的卡顿"是作品页自己首帧的固有成本，还是转场叠加出来的。
 *
 * 用法：node docs/probe/23-longtask.cjs <url>
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:5199/works'
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.addInitScript(() => {
    window.__lt = []
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__lt.push({ s: +e.startTime.toFixed(0), d: +e.duration.toFixed(0) })
        }
      }).observe({ entryTypes: ['longtask'] })
    } catch (err) {
      window.__lt.push({ err: String(err) })
    }
  })
  const t0 = Date.now()
  await p.goto(url, { waitUntil: 'domcontentloaded' })
  await sleep(4200)
  const lt = await p.evaluate(() => window.__lt)
  console.log('URL', url, ' 墙钟', Date.now() - t0, 'ms')
  console.log('longtasks:', JSON.stringify(lt))
  const total = lt.reduce((a, e) => a + (e.d || 0), 0)
  console.log('长任务合计:', total, 'ms')
  await b.close()
})()
