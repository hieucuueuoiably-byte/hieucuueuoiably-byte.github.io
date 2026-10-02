const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const OUT = 'C:/Users/123/AppData/Local/Temp/ponpon_burst';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0, 150)); });

  await page.goto('https://ponpon-mania.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });

  // accept cookies so the bar does not cover the bottom
  await page.waitForTimeout(1200);
  try { await page.click('.cookie-popin button.accept', { timeout: 4000 }); } catch (e) { console.log('no cookie accept'); }

  // wait for the preloader to fade (poll)
  for (let i = 0; i < 60; i++) {
    const p = await page.evaluate(() => {
      const e = document.querySelector('.preloader');
      if (!e) return { gone: true };
      const cs = getComputedStyle(e);
      return { gone: false, o: cs.opacity, vis: cs.visibility, pe: cs.pointerEvents, cls: e.className };
    });
    if (i % 6 === 0) console.log('preloader@' + i, JSON.stringify(p));
    if (p.gone || p.o === '0' || p.vis === 'hidden') { console.log('PRELOADER DONE at poll ' + i); break; }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '/home-final.png' });
  console.log('HOME FINAL saved');

  const homeState = await page.evaluate(() => {
    const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), o: cs.opacity, vis: cs.visibility, tf: cs.transform, color: cs.color, fs: cs.fontSize, cls: e.className }; };
    return {
      bodyCls: document.body.className,
      preloader: box('.preloader'), inLoader: box('.in-loader'),
      home: box('.page.home'), h1: box('.page.home h1'), p: box('.page.home p'),
      btn: box('.home__button'), btnTxt: (document.querySelector('.home__button') || {}).textContent,
      vinyl: box('.home__vynil'), header: box('.app-header'), credit: box('.app-header__title span'),
      canvas: box('canvas.webgl-canvas'),
      headerColor: getComputedStyle(document.querySelector('.app-header')).color,
      scrollH: document.documentElement.scrollHeight
    };
  });
  console.log('HOME STATE', JSON.stringify(homeState, null, 1));

  // ---------- BURST: home -> chapters ----------
  const burst = async (tag, action, dur, step) => {
    const shots = [];
    const t0 = Date.now();
    let i = 0;
    while (Date.now() - t0 < dur) {
      const p = OUT + '/' + tag + '-' + String(i).padStart(3, '0') + '.png';
      await page.screenshot({ path: p, animations: 'allow' });
      shots.push({ t: Date.now() - t0, p });
      i++;
      await page.waitForTimeout(step);
    }
    return shots;
  };

  const p1 = burst('t-home2ch', null, 1400, 160);
  await page.waitForTimeout(50);
  await page.evaluate(() => document.querySelector('.home__button').click());
  const s1 = await p1;
  console.log('burst1', s1.length, JSON.stringify(s1.map(x => x.t)));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: OUT + '/chapters-settled.png' });
  console.log('url', page.url());

  // ---------- BURST: chapter switch (wheel) ----------
  await page.mouse.move(640, 400);
  const p2 = burst('t-switch', null, 1400, 120);
  await page.mouse.wheel(0, 240);
  const s2 = await p2;
  console.log('burst2', s2.length);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: OUT + '/switch-settled.png' });

  // ---------- BURST: chapter -> chapter detail (play) ----------
  const p3 = burst('t-ch2detail', null, 1400, 160);
  await page.evaluate(() => document.querySelector('.chapters-button[data-index="1"] a, .chapters-button__navigation svg:last-child').click());
  const s3 = await p3;
  console.log('burst3', s3.length);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: OUT + '/detail-settled.png' });
  console.log('url3', page.url());

  const det = await page.evaluate(() => {
    const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), o: cs.opacity, tf: cs.transform }; };
    return { bodyCls: document.body.className, html: document.querySelector('.page.chapter') ? document.querySelector('.page.chapter').innerHTML.slice(0, 1200) : 'none',
      chapter: box('.page.chapter'), video: box('video'), scrollH: document.documentElement.scrollHeight,
      classes: [...document.querySelectorAll('.page.chapter [class]')].slice(0, 40).map(e => e.className) };
  });
  console.log('DETAIL', JSON.stringify(det, null, 1).slice(0, 2500));

  // ---------- about: capture the fixed/scroll container ----------
  await page.goto('https://ponpon-mania.com/about', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  try { await page.click('.cookie-popin button.accept', { timeout: 3000 }); } catch (e) { }
  await page.waitForTimeout(1500);
  const aboutDiag = await page.evaluate(() => {
    const walk = [];
    let el = document.querySelector('.about__container');
    const info = e => { if (!e) return null; const cs = getComputedStyle(e); return { cls: e.className, pos: cs.position, ovf: cs.overflow, ovfY: cs.overflowY, h: e.clientHeight, sh: e.scrollHeight, transform: cs.transform, top: cs.top, height: cs.height }; };
    return {
      html: { sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, ovf: getComputedStyle(document.documentElement).overflow },
      body: { sh: document.body.scrollHeight, ch: document.body.clientHeight, ovf: getComputedStyle(document.body).overflow, ovfY: getComputedStyle(document.body).overflowY, pos: getComputedStyle(document.body).position },
      aboutPage: info(document.querySelector('.page.about')),
      aboutContainer: info(document.querySelector('.about__container')),
      main: info(document.querySelector('.app-container')),
      lenis: [...document.querySelectorAll('[class*="lenis"]')].map(e => ({ cls: e.className, ...info(e) })),
      smooth: [...document.querySelectorAll('[class*="smooth"],[class*="scroll"]')].map(e => e.className).slice(0, 12)
    };
  });
  console.log('ABOUT DIAG', JSON.stringify(aboutDiag, null, 1));

  // scroll burst on about
  const p4 = burst('t-about', null, 1200, 200);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 220); await page.waitForTimeout(120); }
  const s4 = await p4;
  console.log('burst4', s4.length);
  await page.screenshot({ path: OUT + '/about-mid.png' });

  const aboutNav = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.about-nav-bar__item')].map(e => {
      const inner = e.querySelector('.about-nav-bar__item-inner');
      return { cls: e.className, innerTf: inner ? getComputedStyle(inner).transform : null, titleTxt: (e.querySelector('.about-nav-bar__title') || {}).textContent };
    });
    return { items, bar: getComputedStyle(document.querySelector('.about-nav-bar')).transform, prog: getComputedStyle(document.querySelector('.progress-bar')).transform, y: window.scrollY, scrollTopOf: document.scrollingElement ? document.scrollingElement.scrollTop : null };
  });
  console.log('ABOUT NAV', JSON.stringify(aboutNav, null, 1));

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
