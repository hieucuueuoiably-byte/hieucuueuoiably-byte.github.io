/**
 * CDP 屏幕录制：拿到**逐帧带时间戳**的画面，用于验证 1s 级转场的中间帧。
 *
 * 为什么不用 p.screenshot：带 WebGL 的页面上每张要 200–400ms，转场中间帧基本抓不到。
 * 为什么不用 recordVideo：webm 的时间轴与页面事件的对应关系还要猜。
 * screencast 直接把 frame 的 timestamp 给我，能精确定位"哪一帧开始露底"。
 *
 * 用法：node docs/probe/21-screencast.cjs --name=enter --act=click:.home-cta
 * 另存：docs/verify/rec/<name>-sc/*.jpg + trace.json
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const ROOT = path.resolve(__dirname, '..', '..')
const OUT = path.join(ROOT, 'docs', 'verify', 'rec')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/)
    return m ? [m[1], m[2]] : [a, true]
  })
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const W = Number(args.w || 1440)
  const H = Number(args.h || 900)
  const name = String(args.name || 'sc')
  const dir = path.join(OUT, `${name}-sc`)
  fs.mkdirSync(dir, { recursive: true })

  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)))
  await p.goto(args.url || 'http://127.0.0.1:5199/', { waitUntil: 'load' })
  await sleep(Number(args.before || 2600))

  const cdp = await ctx.newCDPSession(p)
  const frames = []
  let t0 = 0
  cdp.on('Page.screencastFrame', async (f) => {
    const i = frames.length
    frames.push({ i, t: +(f.metadata.timestamp * 1000 - t0).toFixed(1) })
    fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}.jpg`), Buffer.from(f.data, 'base64'))
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId })
    } catch {
      /* 关闭时会报错，忽略 */
    }
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 72, everyNthFrame: 1 })

  // 用页面内的时间戳做基准，保证 trace 与 rAF 读数同一时钟
  t0 = await p.evaluate(() => performance.now() - performance.timeOrigin)
  const marks = []
  if (typeof args.act === 'string' && args.act.startsWith('click:')) {
    const sel = args.act.slice('click:'.length)
    // 记录若干页面内状态，便于把帧和"云层 y / 路由"对上
    await p.evaluate(() => {
      window.__trace = []
      const tick = () => {
        const anim = document.querySelector('.home-cloud__anim')
        const m = anim ? new DOMMatrixReadOnly(getComputedStyle(anim).transform) : null
        window.__trace.push({
          t: +(performance.now() - performance.timeOrigin).toFixed(1),
          path: location.pathname,
          y: m ? Math.round(m.m42) : null,
          home: !!document.querySelector('.page.home'),
          works: !!document.querySelector('.page.works-page'),
        })
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await p.click(sel, { force: true })
    marks.push({ t: await p.evaluate(() => performance.now() - performance.timeOrigin), s: 'click ' + sel })
    await sleep(Number(args.after || 2400))
  }

  const trace = await p.evaluate(() => window.__trace || [])
  await cdp.send('Page.stopScreencast').catch(() => {})
  fs.writeFileSync(path.join(dir, 'trace.json'), JSON.stringify({ t0, marks, frames, trace }, null, 2))
  console.log('frames:', frames.length, 'first t=', frames[0]?.t, 'last t=', frames[frames.length - 1]?.t)
  console.log('marks:', JSON.stringify(marks))
  await b.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
