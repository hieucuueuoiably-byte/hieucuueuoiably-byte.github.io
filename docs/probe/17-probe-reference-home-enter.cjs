/**
 * 参考站首页 → 作品页（read now）转场的实测取证。
 *
 * 为什么单独做这一轮：motion-spec 的 M01 是按「分层向上退场 + 遮挡上涌」拟定的，
 * 但从未实际看过参考站首页点 read now 之后各层往哪走。这次把它录下来、
 * 逐帧看，再决定本实现的编排。
 *
 * 做法：
 *  1. 打开首页、等 preloader 消失、截首帧；
 *  2. 点击 .home__button；
 *  3. 之后 3.2 秒内以 ~45ms 间隔连拍，同时每帧记录一次 DOM 快照
 *     （可见的 overlay / 进度层 / 页面根的 class、opacity、transform、尺寸）；
 *  4. 落盘：帧图 + 时间线 JSON。
 *
 * 运行：node docs/probe/17-probe-reference-home-enter.js
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'verify', 'ref-home-enter')
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const SITE = 'https://ponpon-mania.com/'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)))

  await p.goto(SITE, { waitUntil: 'load' })

  // 等 preloader 退场
  const waitPre = async () => {
    for (let i = 0; i < 60; i++) {
      const busy = await p.evaluate(() => {
        const e = document.querySelector('.preloader')
        if (!e) return false
        const cs = getComputedStyle(e)
        return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02
      })
      if (!busy) return
      await sleep(400)
    }
  }
  await waitPre()
  await sleep(2200)

  /**
   * 每帧快照：记录一批候选层的几何与可见性。
   * 不预设选择器 —— 直接扫「有可能参与转场」的元素集合，避免漏掉想不到的层。
   */
  const snapshotExpr = `(() => {
    const sel = [
      '.page.home', '.page', '.home', '.home__vynil', '.home__button-container', '.home__button',
      '.page.home h1', '.page.home p', '.app-header', '.app-header__title-wrapper',
      '.webgl-container', '.webgl-canvas', '.in-loader', '.in-loader .progress-bar',
      '.preloader', '.lang-selector', '.fullscreen', '.app-footer', '.wipe', '.transition',
      '[class*=transition]', '[class*=loader]', '[class*=overlay]'
    ];
    const seen = new Set();
    const out = [];
    for (const s of sel) {
      for (const el of document.querySelectorAll(s)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        out.push({
          sel: s,
          cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '',
          tag: el.tagName.toLowerCase(),
          op: +(parseFloat(cs.opacity).toFixed(3)),
          vis: cs.visibility,
          disp: cs.display,
          z: cs.zIndex,
          pos: cs.position,
          tf: cs.transform,
          clip: cs.clipPath,
          bg: cs.backgroundColor,
          w: Math.round(r.width), h: Math.round(r.height),
          x: Math.round(r.x), y: Math.round(r.y)
        });
      }
    }
    return {
      t: performance.now(),
      url: location.pathname,
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      layers: out.filter(o => o.w > 0 && o.h > 0 && o.disp !== 'none' && o.vis !== 'hidden')
    };
  })()`

  const before = await p.evaluate(snapshotExpr)
  await p.screenshot({ path: path.join(OUT, 'frame-before.png') })

  // 点击 read now
  const btn = await p.$('.home__button')
  if (!btn) throw new Error('没找到 .home__button')
  const t0 = Date.now()
  await btn.click({ force: true })

  const frames = []
  const N = 46
  const GAP = 45
  for (let i = 0; i < N; i++) {
    const snap = await p.evaluate(snapshotExpr)
    snap.tMs = Date.now() - t0
    frames.push(snap)
    await p.screenshot({ path: path.join(OUT, `f${String(i).padStart(2, '0')}.png`) })
    await sleep(GAP)
  }

  await sleep(1500)
  await p.screenshot({ path: path.join(OUT, 'frame-after.png') })
  const after = await p.evaluate(snapshotExpr)

  // 汇总：只保留「在整段里出现/消失过，或几何明显变化」的层
  const keyOf = (l) => l.sel + '|' + l.tag + '|' + l.cls
  const track = new Map()
  for (const f of frames) {
    for (const l of f.layers) {
      const k = keyOf(l)
      if (!track.has(k)) track.set(k, { key: k, samples: [] })
      track.get(k).samples.push({
        t: f.tMs,
        op: l.op, tf: l.tf, w: l.w, h: l.h, x: l.x, y: l.y, clip: l.clip, bg: l.bg,
      })
    }
  }
  const interesting = []
  for (const v of track.values()) {
    const s = v.samples
    const opVals = new Set(s.map((x) => x.op))
    const tfVals = new Set(s.map((x) => x.tf))
    const geoVals = new Set(s.map((x) => `${x.w}x${x.h}@${x.x},${x.y}`))
    if (opVals.size > 2 || tfVals.size > 2 || geoVals.size > 2 || s.length < frames.length * 0.8) {
      interesting.push({
        key: v.key,
        framesSeen: s.length,
        first: s[0],
        mid: s[Math.floor(s.length / 2)],
        last: s[s.length - 1],
        opRange: [Math.min(...s.map((x) => x.op)), Math.max(...s.map((x) => x.op))],
        geoRange: {
          w: [Math.min(...s.map((x) => x.w)), Math.max(...s.map((x) => x.w))],
          h: [Math.min(...s.map((x) => x.h)), Math.max(...s.map((x) => x.h))],
          x: [Math.min(...s.map((x) => x.x)), Math.max(...s.map((x) => x.x))],
          y: [Math.min(...s.map((x) => x.y)), Math.max(...s.map((x) => x.y))],
        },
        sampleEvery: s.filter((_, i) => i % 6 === 0),
      })
    }
  }

  const report = {
    url: SITE,
    viewport: '1440x900',
    frames: frames.length,
    gapMs: GAP,
    before,
    after,
    interesting,
    pageErrors: errs,
  }
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(report, null, 2))

  console.log('页面错误:', errs.length ? errs : '无')
  console.log('--- 转场前 ---')
  console.log(JSON.stringify(before.layers.map((l) => [l.sel, l.cls, l.op, l.w + 'x' + l.h + '@' + l.x + ',' + l.y]).slice(0, 40), null, 1))
  console.log('--- 转场后 url=' + after.url + ' ---')
  console.log(JSON.stringify(after.layers.map((l) => [l.sel, l.cls, l.op, l.w + 'x' + l.h + '@' + l.x + ',' + l.y]).slice(0, 40), null, 1))
  console.log('--- 有变化的层 ---')
  for (const it of interesting) {
    console.log(it.key, '| 出现帧数', it.framesSeen, '| opacity', it.opRange,
      '| geo w', it.geoRange.w, 'h', it.geoRange.h, 'x', it.geoRange.x, 'y', it.geoRange.y)
  }

  await b.close()
  console.log('WROTE', OUT)
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
