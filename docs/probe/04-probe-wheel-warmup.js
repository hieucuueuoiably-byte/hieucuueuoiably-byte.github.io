/**
 * 找出"为什么直接打开 /chapters 时滚轮完全不动"。
 * 假设：参考站的翻页需要先有一次用户手势（v1 能测到的那次会话是先点了 CTA 再进 chapters）。
 * 逐个变体对比，找到能让滚轮生效的最小条件。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const SITE = 'https://ponpon-mania.com';

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const activeIdxOf = (p) =>
    p.evaluate(() => {
      const list = [...document.querySelectorAll('.chapters-button')];
      let best = -1, bestO = -1;
      list.forEach((e, i) => { const o = parseFloat(getComputedStyle(e).opacity); if (o > bestO) { bestO = o; best = i; } });
      return { idx: best, n: list.length };
    });

  const waitPre = async (p) => {
    for (let i = 0; i < 40; i++) {
      const busy = await p.evaluate(() => {
        const e = document.querySelector('.preloader');
        if (!e) return false;
        const cs = getComputedStyle(e);
        return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02;
      });
      if (!busy) break;
      await p.waitForTimeout(600);
    }
    await p.waitForTimeout(2200);
  };

  const trials = [];
  const run = async (name, fn) => {
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    try {
      const before = await fn(p);
      trials.push({ name, ...before });
      console.log('• ' + name + ' :: ' + JSON.stringify(before));
    } catch (e) {
      trials.push({ name, error: String(e).slice(0, 160) });
      console.log('• ' + name + ' :: ERROR ' + String(e).slice(0, 160));
    }
    await p.close();
  };

  const wheel5 = async (p, x, y, d = 120) => {
    await p.mouse.move(x, y);
    for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, d); await p.waitForTimeout(60); }
    await p.waitForTimeout(2000);
    return activeIdxOf(p);
  };

  /* A：直接开 /chapters，无任何手势 */
  await run('A 直接开 /chapters，无手势 → 5×120', async (p) => {
    await p.goto(SITE + '/chapters', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPre(p);
    const g = await p.evaluate(() => ({ isDesktop: document.documentElement.className, body: document.body.className }));
    const r = await wheel5(p, 720, 450);
    return { ...r, body: g.body, html: g.isDesktop };
  });

  /* B：直接开 /chapters，先点一下空白处 */
  await run('B 直接开 + 点一下空白 → 5×120', async (p) => {
    await p.goto(SITE + '/chapters', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPre(p);
    await p.mouse.move(720, 450);
    await p.mouse.down(); await p.mouse.up();
    await p.waitForTimeout(900);
    return wheel5(p, 720, 450);
  });

  /* C：首页 → 点 CTA 进 chapters（复刻 v1 成功的那条路径） */
  await run('C 首页 → 点 CTA → 5×120（复刻 v1）', async (p) => {
    await p.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPre(p);
    try { await p.click('.cookie-popin button.accept', { timeout: 2500 }); } catch { }
    await p.click('.home__button');
    await p.waitForTimeout(4000);
    return wheel5(p, 720, 450);
  });

  /* D：直接开 + 移动鼠标 + 先小滚一次再大滚 */
  await run('D 直接开 + 先小滚一次 → 5×120', async (p) => {
    await p.goto(SITE + '/chapters', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPre(p);
    await p.mouse.move(720, 450);
    await p.mouse.wheel(0, 5);
    await p.waitForTimeout(700);
    return wheel5(p, 720, 450);
  });

  /* E：直接开 + 点顶栏 about 再浏览器返回 */
  await run('E 直接开 + 点 about 再 back → 5×120', async (p) => {
    await p.goto(SITE + '/chapters', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPre(p);
    await p.click('.app-header__link--about');
    await p.waitForTimeout(3000);
    await p.goBack();
    await p.waitForTimeout(4000);
    return wheel5(p, 720, 450);
  });

  /* F：直接开 + 单击中央海报区域 */
  await run('F 直接开 + 点中央海报 → 5×120', async (p) => {
    await p.goto(SITE + '/chapters', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPre(p);
    await p.mouse.click(720, 440);
    await p.waitForTimeout(1200);
    return wheel5(p, 720, 450);
  });

  /* G：直接开 + 键盘按一下 → 5×120（顺便测键盘能不能翻页） */
  await run('G 直接开 + 键盘 ArrowRight → 5×120', async (p) => {
    await p.goto(SITE + '/chapters', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitPre(p);
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(1800);
    const afterKey = await activeIdxOf(p);
    const after5 = await wheel5(p, 720, 450);
    return { 键盘后: afterKey.idx, 滚轮后: after5.idx, n: after5.n };
  });

  require('fs').writeFileSync(
    'I:/xiaazai/zpj/0.001/portfolio/docs/probe/wheel-warmup-probe.json',
    JSON.stringify(trials, null, 1)
  );
  await b.close();
  console.log('\nDONE → docs/probe/wheel-warmup-probe.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
