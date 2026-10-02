/**
 * 验证 routeTransition 是否真的驱动时间轴。
 * 分别在两个配置值下测量：路由切换时刻（__lastSwapMs）与转场结束时刻（__lastTransitionDoneMs）。
 * 按比例设计，两者应当与 routeTransition 成正比。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const BASE = 'http://127.0.0.1:4321';
const LABEL = process.argv[2] || 'unknown';
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const runs = [];
  for (let k = 0; k < 3; k++) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(3800);
    await p.evaluate(() => { window.__lastSwapMs = undefined; window.__lastTransitionDoneMs = undefined; });
    await p.evaluate(() => document.querySelector('.home__cta').click());
    // 等到转场结束时间戳被写入
    await p.waitForFunction(() => typeof window.__lastTransitionDoneMs === 'number', null, { timeout: 20000 }).catch(() => {});
    const r = await p.evaluate(() => ({
      swap: window.__lastSwapMs ?? null,
      done: window.__lastTransitionDoneMs ?? null,
      coverAt: window.__lastCoverAtMs ?? null,
      path: location.pathname,
    }));
    runs.push(r);
    await p.close();
  }
  const swap = runs.map((r) => r.swap).filter((v) => typeof v === 'number');
  const done = runs.map((r) => r.done).filter((v) => typeof v === 'number');
  const avg = (a) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null);
  const out = {
    label: LABEL,
    runs,
    avgSwapMs: avg(swap),
    avgDoneMs: avg(done),
    coverAtMs: runs[0]?.coverAt,
  };
  console.log(JSON.stringify(out, null, 1));
  require('fs').writeFileSync(`${OUT}/transition-timing-${LABEL}.json`, JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
