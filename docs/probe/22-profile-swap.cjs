/**
 * 定位"换页那一帧卡住"到底是卡在哪一段。
 *
 * 现象：转场里云层上涌正常（~800ms 到 -900），然后主线程整个停住约 1s，
 * 揭开动画被吃掉 —— 屏幕直接从"全粉"跳到"作品页已就位"。
 *
 * 这里做三件事：
 *  1. 用 PerformanceObserver 收 longtask，给出每一段长任务的起止与时长；
 *  2. 读应用自己记录的 `window.__perf.swap`（flushSync 挂载 / 场景切模式各花多久）；
 *  3. 逐帧记录云层 y 与路由，把卡顿区间与画面状态对上。
 *
 * 运行：node docs/probe/22-profile-swap.cjs
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const ROOT = path.resolve(__dirname, '..', '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)))
  await p.goto(process.argv[2] || 'http://127.0.0.1:5199/', { waitUntil: 'load' })
  await sleep(2600)

  await p.evaluate(() => {
    window.__lt = []
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__lt.push({ start: +e.startTime.toFixed(1), dur: +e.duration.toFixed(1) })
        }
      }).observe({ entryTypes: ['longtask'] })
    } catch (err) {
      window.__lt.push({ err: String(err) })
    }
    window.__probe = []
    const tick = () => {
      const anim = document.querySelector('.home-cloud__anim')
      const m = anim ? new DOMMatrixReadOnly(getComputedStyle(anim).transform) : null
      window.__probe.push({
        t: +performance.now().toFixed(1),
        path: location.pathname,
        y: m ? Math.round(m.m42) : null,
      })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  const tClick = await p.evaluate(() => performance.now())
  await p.click('.home-cta', { force: true })
  await sleep(3000)

  const out = await p.evaluate(() => ({
    lt: window.__lt,
    probe: window.__probe,
    perf: window.__perf ?? null,
    swapMs: window.__lastSwapMs ?? null,
    doneMs: window.__lastTransitionDoneMs ?? null,
  }))

  fs.writeFileSync(
    path.join(ROOT, 'docs', 'verify', 'swap-profile.json'),
    JSON.stringify({ tClick, ...out }, null, 2)
  )

  console.log('window.__perf =', JSON.stringify(out.perf))
  console.log('swapMs =', out.swapMs, ' doneMs =', out.doneMs)
  console.log('--- longtask ---')
  const rel = (t) => (t - tClick).toFixed(1)
  for (const e of out.lt) {
    if (e.err) {
      console.log('  longtask 不可用：', e.err)
      continue
    }
    if (e.start < tClick - 200) continue
    console.log(`  起 ${rel(e.start)}ms  时长 ${e.dur}ms`)
  }
  console.log('--- 逐帧（只显示相邻间隔 > 40ms 的跳跃）---')
  const pr = out.probe
  for (let i = 1; i < pr.length; i++) {
    const dt = pr[i].t - pr[i - 1].t
    if (dt > 40 || pr[i].path !== pr[i - 1].path) {
      console.log(
        `  ${rel(pr[i - 1].t)}ms → ${rel(pr[i].t)}ms  (间隔 ${dt.toFixed(0)}ms)  ` +
          `y ${pr[i - 1].y} → ${pr[i].y}  ${pr[i - 1].path} → ${pr[i].path}`
      )
    }
  }
  await b.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
