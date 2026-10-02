const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/shots';

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.goto('http://127.0.0.1:4321/works', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3200);

  // 把目标设到 3 格之外，阻尼会让渲染速度维持在高位 —— 这时弯曲最强
  const grab = async (name) => {
    const s = await p.evaluate(() => ({
      v: +window.__nav.getVelocity().toFixed(3),
      c: +window.__nav.getCurrent().toFixed(3),
    }));
    await p.screenshot({ path: OUT + '/' + name + '.jpg', type: 'jpeg', quality: 78 });
    console.log(name, JSON.stringify(s));
    return s;
  };

  await p.evaluate(() => window.__nav.jumpTo(0, { force: true }));
  await p.waitForTimeout(1600);
  await grab('bend-00-rest');

  // 前进：目标 3 格之外
  await p.evaluate(() => { for (let i = 0; i < 3; i++) window.__nav.step(1, { force: true }); });
  await p.waitForTimeout(120);
  await grab('bend-01-forward-early');
  await p.waitForTimeout(120);
  await grab('bend-02-forward-peak');

  // 等收敛
  await p.waitForTimeout(2200);
  await grab('bend-03-settled');

  // 反向：目标回 0，观察弯曲方向翻转
  await p.evaluate(() => { for (let i = 0; i < 3; i++) window.__nav.step(-1, { force: true }); });
  await p.waitForTimeout(150);
  await grab('bend-04-reverse-early');
  await p.waitForTimeout(140);
  await grab('bend-05-reverse-peak');

  await p.waitForTimeout(2200);
  await grab('bend-06-settled-back');

  await b.close();
  console.log('DONE');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
