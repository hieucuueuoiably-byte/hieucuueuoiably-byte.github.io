/**
 * 参考站首页 → /chapters 转场的**逐帧定量**测量。
 *
 * 上一轮连拍（17-）证明了形态：从屏幕正中长出一个圆，橙色先来、粉色跟上，
 * 旧页在圆外变成灰。连拍的间隔受截图耗时污染，量不出曲线。
 *
 * 这一轮改成在页面里用 rAF 直接读 WebGL canvas 的像素：
 *  · 每帧把 canvas 缩到 64×40 画进一个 2D canvas，取中心一行/一列；
 *  · 找到"中心色"连续区域的最远边界 → 等效半径（占视口短边）；
 *  · 同时记录 location.pathname 变化的那一帧。
 * 于是得到：半径-时间曲线、被完全盖住的时刻、路由切换时刻、总时长。
 *
 * 运行：node docs/probe/18-probe-reference-enter-curve.cjs
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'verify')
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
const SITE = 'https://ponpon-mania.com/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto(SITE, { waitUntil: 'load' })
  for (let i = 0; i < 60; i++) {
    const busy = await p.evaluate(() => {
      const e = document.querySelector('.preloader')
      if (!e) return false
      const cs = getComputedStyle(e)
      return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02
    })
    if (!busy) break
    await sleep(400)
  }
  await sleep(2200)

  // 在页面里装采样器
  await p.evaluate(() => {
    const canvas = document.querySelector('canvas.webgl-canvas')
    const W = 96, H = 60
    const off = document.createElement('canvas')
    off.width = W
    off.height = H
    const c2d = off.getContext('2d', { willReadFrequently: true })
    window.__samples = []
    window.__pathEvents = []
    let started = 0
    window.__startProbe = () => {
      started = performance.now()
      let lastPath = location.pathname
      const tick = () => {
        const t = performance.now() - started
        try {
          c2d.drawImage(canvas, 0, 0, W, H)
          const d = c2d.getImageData(0, 0, W, H).data
          const at = (x, y) => {
            const i = (y * W + x) * 4
            return [d[i], d[i + 1], d[i + 2]]
          }
          const cx = W >> 1, cy = H >> 1
          const center = at(cx, cy)
          // 沿中线向左右找"与中心色相近"的最远点
          const near = (c, ref) =>
            Math.abs(c[0] - ref[0]) + Math.abs(c[1] - ref[1]) + Math.abs(c[2] - ref[2]) < 90
          let left = cx, right = cx
          while (left > 0 && near(at(left - 1, cy), center)) left--
          while (right < W - 1 && near(at(right + 1, cy), center)) right++
          const radiusPx = Math.max(cx - left, right - cx) / W  // 占视口宽的比例
          const corner = at(1, 1)
          const edgeL = at(1, cy)
          window.__samples.push({
            t: +t.toFixed(1),
            path: location.pathname,
            center,
            corner,
            edgeL,
            radiusW: +radiusPx.toFixed(4),
          })
          if (location.pathname !== lastPath) {
            lastPath = location.pathname
            window.__pathEvents.push({ t: +t.toFixed(1), path: lastPath })
          }
        } catch (e) {
          window.__samples.push({ t: +t.toFixed(1), err: String(e).slice(0, 80) })
        }
        if (t < 2600) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  })

  await p.evaluate(() => window.__startProbe())
  await p.click('.home__button', { force: true })
  await sleep(3200)

  const res = await p.evaluate(() => ({
    samples: window.__samples,
    pathEvents: window.__pathEvents,
  }))

  const s = res.samples
  const report = {
    url: SITE,
    viewport: '1440x900',
    frameCount: s.length,
    pathEvents: res.pathEvents,
    timeline: s,
  }
  fs.writeFileSync(path.join(OUT, 'ref-home-enter-curve.json'), JSON.stringify(report, null, 2))

  console.log('采样帧数', s.length)
  console.log('路由事件', JSON.stringify(res.pathEvents))
  // 打印每 4 帧一行：t、中心色、边缘色、半径
  for (let i = 0; i < s.length; i += 4) {
    const x = s[i]
    console.log(
      String(x.t).padStart(7) + 'ms  center=' + JSON.stringify(x.center) +
      '  corner=' + JSON.stringify(x.corner) +
      '  edgeL=' + JSON.stringify(x.edgeL) +
      '  radiusW=' + x.radiusW
    )
  }
  await b.close()
  console.log('WROTE ref-home-enter-curve.json')
})().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
