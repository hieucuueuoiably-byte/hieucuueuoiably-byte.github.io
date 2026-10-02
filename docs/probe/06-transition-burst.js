const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/shots';
const pad = (n) => String(n).padStart(4, '0');

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);

  const shots = [];
  const t0 = Date.now();
  const grab = async () => {
    const t = Date.now() - t0;
    await p.screenshot({ path: OUT + '/transition/raw-' + pad(t) + '.jpg', type: 'jpeg', quality: 62 });
    shots.push(t);
  };
  await grab();
  const promise = (async () => {
    for (let i = 0; i < 13; i++) {
      await p.waitForTimeout(70);
      await grab();
    }
  })();
  await p.waitForTimeout(50);
  await p.evaluate(() => document.querySelector('.home__cta').click());
  await promise;
  console.log('transition frames at', JSON.stringify(shots));
  await p.waitForTimeout(500);
  console.log('TRUE swapMs =', await p.evaluate(() => window.__lastSwapMs));
  await b.close();
  console.log('DONE');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
