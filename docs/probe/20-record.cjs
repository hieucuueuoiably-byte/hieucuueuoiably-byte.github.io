/**
 * 录屏 + 抽帧取证。
 *
 * 截图（p.screenshot）在带 WebGL 的页面上每张要 200–400ms，
 * 1s 级的转场根本抓不住中间帧（19- 的逐帧读数证明转场本身是正常的，是截图太慢）。
 * 所以改成 recordVideo 全程录制，再用 ffmpeg 抽帧。
 *
 * 用法：
 *   node docs/probe/20-record.cjs --name=enter --w=1440 --h=900 --before=2400 --after=2200 --act=click:.home-cta
 *   node docs/probe/20-record.cjs --name=flow --act=flow        # 跑完整操作链路
 *
 * 抽帧：
 *   ffmpeg -i docs/verify/rec/enter.webm -vf fps=25 docs/verify/rec/enter-frames/%03d.png
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const ROOT = path.resolve(__dirname, '..', '..')
const OUTDIR = path.join(ROOT, 'docs', 'verify', 'rec')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/)
    return m ? [m[1], m[2]] : [a, true]
  })
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 完整操作链路：首页 → 进入作品 → 慢滚 → 快滚 → 反向 → 进入视频 → 返回 → 返回首页 */
async function runFlow(p, log) {
  const mark = (s) => log.push({ t: Date.now(), s })
  const wheel = async (count, delta, gap) => {
    for (let i = 0; i < count; i++) {
      await p.mouse.wheel(0, delta)
      await sleep(gap)
    }
  }
  await sleep(1200)
  mark('点击 进入作品')
  await p.click('.home-cta', { force: true })
  await sleep(1800)

  mark('悬停到舞台中央（滚轮接管区）')
  await p.mouse.move(720, 450)
  await sleep(400)

  mark('慢滚：3 次 120')
  await wheel(3, 120, 120)
  await sleep(1200)

  mark('快滚：12 次 400')
  await wheel(12, 400, 40)
  await sleep(1500)

  mark('反向：14 次 -400')
  await wheel(14, -400, 40)
  await sleep(1500)

  mark('按钮单步：下一件')
  await p.click('.bar__nav .bar-btn:last-child', { force: true })
  await sleep(1200)

  mark('进入视频（播放键）')
  await p.click('.bar-btn--play', { force: true })
  await sleep(2600)

  mark('返回作品列表')
  await p.click('.control-bar .bar-btn:first-child', { force: true })
  await sleep(1800)

  mark('返回首页')
  const idx = await p.evaluate(() => document.querySelectorAll('.app-header__link').length)
  void idx
  await p.click('.app-header__link--works', { force: true })
  await sleep(200)
  await p.goBack()
  await sleep(2200)
  mark('END')
}

;(async () => {
  const W = Number(args.w || 1440)
  const H = Number(args.h || 900)
  const name = String(args.name || 'rec')
  fs.mkdirSync(OUTDIR, { recursive: true })
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUTDIR, size: { width: W, height: H } },
  })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)))
  await p.goto(args.url || 'http://127.0.0.1:5199/', { waitUntil: 'load' })
  await sleep(Number(args.before || 2600))

  const log = []
  if (args.act === 'flow') {
    await runFlow(p, log)
  } else if (typeof args.act === 'string' && args.act.startsWith('click:')) {
    const sel = args.act.slice('click:'.length)
    log.push({ t: Date.now(), s: 'click ' + sel })
    await p.click(sel, { force: true })
    await sleep(Number(args.after || 2200))
  } else {
    await sleep(Number(args.after || 2000))
  }

  const vid = p.video()
  await p.close()
  await ctx.close()
  const target = path.join(OUTDIR, `${name}.webm`)
  if (vid) await vid.saveAs(target)
  await b.close()
  fs.writeFileSync(path.join(OUTDIR, `${name}-marks.json`), JSON.stringify(log, null, 2))
  console.log('WROTE', target)
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
