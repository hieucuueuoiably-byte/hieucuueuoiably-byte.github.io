/**
 * 用硬件加速后端（d3d11 / RTX 3060）重试参考站的滚轮分页。
 *
 * 假设：之前用 SwiftShader 时滚轮完全没反应，是因为 WebGL 场景没成功构造
 * → `bind()` 没跑 → `window.addEventListener('wheel', onWheel)` 从未挂上。
 * 真 GPU 下如果场景起来了，滚轮应该能动，也就能做真正的并排对照。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
const GPU = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const SITE = 'https://ponpon-mania.com';

(async () => {
  const R = {};
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: GPU });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));

  const waitPre = async () => {
    for (let i = 0; i < 50; i++) {
      const busy = await p.evaluate(() => {
        const e = document.querySelector('.preloader');
        if (!e) return false;
        const cs = getComputedStyle(e);
        return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02;
      });
      if (!busy) break;
      await p.waitForTimeout(500);
    }
    await p.waitForTimeout(2500);
  };
  const activeIdx = () =>
    p.evaluate(() => {
      const list = [...document.querySelectorAll('.chapters-button')];
      let best = -1, bestO = -1;
      list.forEach((e, i) => { const o = parseFloat(getComputedStyle(e).opacity); if (o > bestO) { bestO = o; best = i; } });
      return best;
    });
  const glInfo = () =>
    p.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return 'no canvas';
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'no ctx';
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'no dbg';
    });

  R.渲染后端 = await (async () => {
    await p.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.waitForTimeout(4000);
    return glInfo();
  })();

  // 走 v1 的路径：首页 → 点 CTA → chapters
  await waitPre();
  try { await p.click('.cookie-popin button.accept', { timeout: 2500 }); } catch { }
  await p.click('.home__button');
  await p.waitForTimeout(6000);
  R.url = p.url();
  R.进入时下标 = await activeIdx();

  // 帧率
  R.帧率 = await p.evaluate(() => new Promise((res) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
    requestAnimationFrame(tick);
  }));

  // 滚轮：把 v1 的三组观测逐一重跑
  const wheelProbe = async (delta, times, gap) => {
    await p.mouse.move(720, 450);
    const before = await activeIdx();
    for (let i = 0; i < times; i++) { await p.mouse.wheel(0, delta); await p.waitForTimeout(gap); }
    await p.waitForTimeout(2000);
    const after = await activeIdx();
    return { delta, times, gap, before, after, moved: after !== before };
  };

  R.W1_单次120 = await wheelProbe(120, 1, 60);
  R.W2_五次120 = await wheelProbe(120, 5, 60);
  R.W3_三次负120 = await wheelProbe(-120, 3, 60);
  R.W4_单次600 = await wheelProbe(600, 1, 60);
  R.W5_两次600 = await wheelProbe(600, 2, 80);
  R.W6_单次1600 = await wheelProbe(1600, 1, 60);
  R.W7_十二次300 = await wheelProbe(300, 12, 60);
  R.W8_二十次负300 = await wheelProbe(-300, 20, 60);

  R.控制台错误 = errs;
  console.log(JSON.stringify(R, null, 1));

  // 顺便录一段参考站的运动形态，供并排对照
  try {
    const vctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'C:/Users/123/AppData/Local/Temp/selfcheck/refvid', size: { width: 1440, height: 900 } } });
    const vp = await vctx.newPage();
    await vp.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await vp.waitForTimeout(4000);
    await vp.click('.home__button').catch(() => { });
    await vp.waitForTimeout(6000);
    for (let i = 0; i < 3; i++) { await vp.mouse.move(720, 450); await vp.mouse.wheel(0, 500); await vp.waitForTimeout(900); }
    await vp.evaluate(() => document.querySelectorAll('.chapters-button')[1]?.click());
    await vp.waitForTimeout(5000);
    for (let i = 0; i < 4; i++) { await vp.mouse.wheel(0, 400); await vp.waitForTimeout(800); }
    await vctx.close();
    R.参考站录屏 = 'ok';
  } catch (e) {
    R.参考站录屏 = 'FAILED ' + String(e).slice(0, 160);
  }

  fs.writeFileSync(path.join(OUT, 'reference-gpu-probe.json'), JSON.stringify(R, null, 1));
  await b.close();
  console.log('\nDONE → docs/verify/reference-gpu-probe.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
