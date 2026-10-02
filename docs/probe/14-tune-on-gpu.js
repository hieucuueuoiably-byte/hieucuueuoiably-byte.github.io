/**
 * 真 GPU（d3d11 / RTX 3060）上的手感标定。
 *
 * 扫 wheelDeltaPerStep：固定手势 5 格（5×100px = 500px 滚轮位移），看前进几件。
 *   目标：5 格恰好 = 1 件（而单格不该过件，对应参考站"小位移被吸回"的观感）。
 * 量峰值速度：给 velocityRef 定值 —— 目标是"一次按钮切换 ≈ 0.7~0.8 饱和、连续快速滚动 ≈ 1.0 饱和"。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
const GPU = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const BASE = 'http://127.0.0.1:4321';

(async () => {
  const R = {};
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: GPU });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));

  await p.goto(BASE + '/works', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(4000);

  R.渲染后端 = await p.evaluate(() => {
    const c = document.querySelector('canvas.gl-canvas');
    const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a';
  });
  R.可调项 = await p.evaluate(() => window.__tune.read());

  const fps = () => p.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
    requestAnimationFrame(tick);
  }));
  R.帧率_静止 = await fps();

  const settle = async (n = 6) => { await p.evaluate(() => window.__nav.snapInstant(0)); await p.waitForTimeout(700); void n; };
  const sel = () => p.evaluate(() => window.__nav.getSnapshot().selectedIndex);

  /** 固定手势：n 个滚轮格，每格 100px */
  const gesture = async (notches, gap = 55) => {
    await p.mouse.move(640, 400);
    for (let i = 0; i < notches; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(gap); }
    await p.waitForTimeout(2200);
    return sel();
  };

  /* ---------------- 扫 wheelDeltaPerStep ---------------- */
  const sweep = [];
  for (const v of [240, 320, 400, 480, 600, 720]) {
    await p.evaluate((x) => window.__tune.set('nav.wheelDeltaPerStep', x), v);
    const rows = [];
    for (const n of [1, 2, 3, 5, 8]) {
      await settle();
      const advanced = await gesture(n);
      rows.push({ 滚轮格: n, 像素: n * 100, 位移格: +(n * 100 / v).toFixed(3), 前进几件: advanced });
    }
    sweep.push({ wheelDeltaPerStep: v, rows });
    R[`S${v}`] = rows;
  }
  R.扫描 = sweep;

  /* 推荐值：单格不动、5 格走 1 件 */
  const pick = sweep
    .map((s) => ({
      v: s.wheelDeltaPerStep,
      one: s.rows.find((r) => r.滚轮格 === 1).前进几件,
      five: s.rows.find((r) => r.滚轮格 === 5).前进几件,
      eight: s.rows.find((r) => r.滚轮格 === 8).前进几件,
    }))
    .filter((x) => x.one === 0 && x.five === 1);
  R.满足_单格不动_五格走一件 = pick;

  /* ---------------- velocityRef 标定 ---------------- */
  const FINAL = pick.length ? pick[0].v : 480;
  await p.evaluate((x) => window.__tune.set('nav.wheelDeltaPerStep', x), FINAL);

  const traceVel = async (label, run) => {
    await settle();
    const tr = p.evaluate(() => new Promise((res) => {
      const a = []; const t0 = performance.now();
      const tick = () => {
        const d = window.__nav.debugReadNav();
        const s = window.__scene?.debugReadState?.();
        a.push([+(performance.now() - t0).toFixed(0), +d.vel.toFixed(3), s ? +s.bendMag.toFixed(3) : null]);
        if (performance.now() - t0 < 2600) requestAnimationFrame(tick); else res(a);
      };
      requestAnimationFrame(tick);
    }));
    await run();
    const a = await tr;
    const maxV = Math.max(...a.map((x) => Math.abs(x[1])));
    const maxBend = Math.max(...a.map((x) => x[2] ?? 0));
    fs.writeFileSync(path.join(OUT, `vel-trace-${label}.json`), JSON.stringify(a));
    return { 峰值速度: +maxV.toFixed(2), 峰值bendMag: +maxBend.toFixed(3), 采样帧数: a.length };
  };

  R.V_按钮单步 = await traceVel('button-step', async () => { await p.evaluate(() => window.__nav.step(1)); });
  R.V_一次切换_5格 = await traceVel('wheel-5', async () => { await p.mouse.move(640, 400); for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(55); } });
  R.V_快速滚动_10格 = await traceVel('wheel-10-fast', async () => { await p.mouse.move(640, 400); for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 160); await p.waitForTimeout(28); } });

  R.当前velocityRef = await p.evaluate(() => window.__tune.read().velocityRef);

  R.控制台错误 = errs;
  console.log(JSON.stringify(R, null, 1));
  fs.writeFileSync(path.join(OUT, 'gpu-tuning.json'), JSON.stringify(R, null, 1));

  /* ---------------- 录一段手感样片（真 GPU，帧率高所以顺滑） ---------------- */
  const vctx = await b.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: 'C:/Users/123/AppData/Local/Temp/selfcheck/gpuvid', size: { width: 1280, height: 800 } },
  });
  const vp = await vctx.newPage();
  await vp.goto(BASE + '/works', { waitUntil: 'networkidle' });
  await vp.waitForTimeout(3600);
  await vp.evaluate(() => window.__nav.snapInstant(0));
  await vp.waitForTimeout(900);
  await vp.mouse.move(640, 400);
  // 慢速：一格一格滚（应当完全不动，被吸回）
  for (let i = 0; i < 3; i++) { await vp.mouse.wheel(0, 100); await vp.waitForTimeout(420); }
  await vp.waitForTimeout(900);
  // 一次手势五格（应当走一件）
  for (let i = 0; i < 5; i++) { await vp.mouse.wheel(0, 100); await vp.waitForTimeout(55); }
  await vp.waitForTimeout(1500);
  // 连续快速滚动（应当连跨多件）
  for (let i = 0; i < 10; i++) { await vp.mouse.wheel(0, 200); await vp.waitForTimeout(45); }
  await vp.waitForTimeout(2200);
  // 按钮单步 + 键盘
  await vp.evaluate(() => window.__nav.step(1));
  await vp.waitForTimeout(1200);
  await vp.keyboard.press('ArrowUp');
  await vp.waitForTimeout(1200);
  await vp.keyboard.press('ArrowDown');
  await vp.waitForTimeout(1600);
  // 反向滚回
  for (let i = 0; i < 8; i++) { await vp.mouse.wheel(0, -200); await vp.waitForTimeout(45); }
  await vp.waitForTimeout(2200);
  await vctx.close();

  await b.close();
  console.log('\nDONE → docs/verify/gpu-tuning.json + gpuvid/*.webm');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
