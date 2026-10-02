/**
 * 手感样片（当前构建，硬件加速 d3d11）。
 * 录这一段的目的：把"慢速滚动不动 / 一次手势一件 / 快速滚动连跨"这三种手感连续展示出来，
 * 便于人眼核对，而不是只看数字。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const DIR = 'C:/Users/123/AppData/Local/Temp/selfcheck/gpuvid2';
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: DIR, size: { width: 1280, height: 800 } },
  });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4321/works', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(3600);
  await p.evaluate(() => window.__nav.snapInstant(0));
  await p.waitForTimeout(900);

  const R = { 渲染后端: await p.evaluate(() => {
    const c = document.querySelector('canvas.gl-canvas');
    const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a';
  }), 参数: await p.evaluate(() => window.__tune.read()) };
  R.帧率 = await p.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
    requestAnimationFrame(tick);
  }));

  await p.mouse.move(640, 400);
  const selAt = async (label) => { R[label] = await p.evaluate(() => window.__nav.getSnapshot().selectedIndex); };

  // 1) 慢速一格一格滚 —— 应该完全不动（位移不满半格，被吸回）
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(430); }
  await p.waitForTimeout(1000);
  await selAt('1_慢速四格_应仍为0');

  // 2) 一次手势三格 —— 应该走一件
  for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(50); }
  await p.waitForTimeout(1600);
  await selAt('2_一次手势三格_应为1');

  // 3) 连续快速滚动 —— 应该连跨多件
  for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 180); await p.waitForTimeout(38); }
  await p.waitForTimeout(2400);
  await selAt('3_快速滚动十二格_应连跨');

  // 4) 按钮 + 键盘单步
  await p.evaluate(() => window.__nav.step(1));
  await p.waitForTimeout(1100);
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(1100);
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(1400);
  await selAt('4_按钮与键盘之后');

  // 5) 反向滚回
  for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, -180); await p.waitForTimeout(38); }
  await p.waitForTimeout(2400);
  await selAt('5_反向滚回之后');

  await ctx.close();
  await b.close();
  console.log(JSON.stringify(R, null, 1));
  fs.writeFileSync('I:/xiaazai/zpj/0.001/portfolio/docs/verify/hands-on-script.json', JSON.stringify(R, null, 1));
  console.log('VIDEO DIR:', fs.readdirSync(DIR));
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
