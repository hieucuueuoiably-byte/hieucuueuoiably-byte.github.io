/**
 * 通用截图工具：给定 URL 与可选操作，输出若干张图。
 *
 * 用法：
 *   node docs/probe/shot.cjs --url=http://127.0.0.1:5199/ --out=docs/verify/x/home.png --wait=2600
 *   node docs/probe/shot.cjs --url=.../  --click=.home-cta  --seq=0:120:240:400:700:1100 --outdir=docs/verify/x
 *
 * 参数：
 *   --url      要打开的地址
 *   --out      单张输出路径（配合 --wait）
 *   --outdir   连拍输出目录
 *   --wait     打开后等待毫秒（默认 2600）
 *   --w/--h    视口（默认 1440×900）
 *   --click    点击的选择器（点击前先等待 --clickWait，默认 400）
 *   --seq      点完之后的取样时刻（毫秒，冒号分隔）
 *   --scroll   先滚动到指定 scrollY
 *   --eval     在页面里执行的表达式（用于调试；结果打到 stdout）
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const ROOT = path.resolve(__dirname, '..', '..')

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
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)))
  p.on('console', (m) => {
    if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200))
  })

  await p.goto(args.url, { waitUntil: 'load' })
  await sleep(Number(args.wait || 2600))

  if (args.scroll) {
    await p.evaluate((y) => window.scrollTo(0, y), Number(args.scroll))
    await sleep(600)
  }

  if (args.eval) {
    const r = await p.evaluate(args.eval)
    console.log('EVAL →', JSON.stringify(r, null, 2))
  }

  if (args.click) {
    await sleep(Number(args.clickWait || 400))
    if (args.outdir) {
      fs.mkdirSync(path.join(ROOT, args.outdir), { recursive: true })
      await p.screenshot({ path: path.join(ROOT, args.outdir, 'f-before.png') })
      const seq = String(args.seq || '80:160:240:320:420:520:640:780:940:1120:1400')
        .split(':')
        .map(Number)
      let prev = 0
      await p.click(args.click, { force: true })
      const t0 = Date.now()
      let i = 0
      for (const t of seq) {
        await sleep(Math.max(0, t - (Date.now() - t0)))
        await p.screenshot({ path: path.join(ROOT, args.outdir, `f${String(i).padStart(2, '0')}-${t}ms.png`) })
        i++
      }
      void prev
      console.log('URL after =', p.url())
    } else {
      await p.click(args.click, { force: true })
      await sleep(Number(args.after || 500))
    }
  }

  if (args.out) {
    fs.mkdirSync(path.dirname(path.join(ROOT, args.out)), { recursive: true })
    await p.screenshot({ path: path.join(ROOT, args.out) })
    console.log('WROTE', args.out)
  }
  console.log('errors:', errs.length ? errs : 'none')
  await b.close()
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
