const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/123/AppData/Local/Temp/ponpon_probe';
fs.mkdirSync(OUT, { recursive: true });

const report = { steps: [], notes: [] };
const log = (k, v) => { report.steps.push({ k, v }); console.log('>>> ' + k + ' :: ' + JSON.stringify(v)); };

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-US'
  });
  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

  // ---------- TECH STACK PROBE ----------
  await page.goto('https://ponpon-mania.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);

  const tech = await page.evaluate(() => {
    const c = document.querySelector('canvas.webgl-canvas');
    let glInfo = null;
    if (c) {
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        glInfo = {
          version: gl.getParameter(gl.VERSION),
          renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a',
          w: c.width, h: c.height,
          cssW: c.clientWidth, cssH: c.clientHeight
        };
      }
    }
    const imgs = [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src).slice(0, 30);
    const bgImgs = [...document.querySelectorAll('*')].map(e => getComputedStyle(e).backgroundImage)
      .filter(b => b && b !== 'none').slice(0, 20);
    return {
      htmlFontSize: getComputedStyle(document.documentElement).fontSize,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyFont: getComputedStyle(document.body).fontFamily,
      glInfo, imgCount: imgs.length, imgs, bgImgs,
      classes: [...document.querySelectorAll('[class]')].map(e => e.className).slice(0, 5)
    };
  });
  log('tech', tech);
  await page.screenshot({ path: path.join(OUT, '01-home.png') });

  // header / home geometry
  const homeGeo = await page.evaluate(() => {
    const g = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), fontSize: cs.fontSize, color: cs.color, transform: cs.transform, opacity: cs.opacity, zIndex: cs.zIndex }; };
    return {
      header: g('.app-header'),
      title: g('.app-header__title'),
      credit: g('.app-header__title span'),
      chaptersLink: g('.app-header__link--chapters'),
      aboutLink: g('.app-header__link--about'),
      homeH1: g('.page.home h1'),
      homeP: g('.page.home p'),
      homeBtn: g('.home__button'),
      homeBtnText: (document.querySelector('.home__button') || {}).textContent,
      vinyl: g('.home__vynil'),
      pageHome: g('.page.home'),
      appContainer: g('.app-container'),
      reducers: { vh: getComputedStyle(document.documentElement).getPropertyValue('--vh') }
    };
  });
  log('homeGeo', homeGeo);

  // ---------- TRANSITION: home -> chapters, sample transforms ----------
  const sampleScript = `(() => {
    const res = [];
    const t0 = performance.now();
    return new Promise(resolve => {
      function tick() {
        const t = performance.now() - t0;
        const q = s => document.querySelector(s);
        const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),o:+(+cs.opacity).toFixed(3),tf:cs.transform,cl:cs.clipPath==='none'?'':cs.clipPath,v:cs.visibility}; };
        res.push({ t: +t.toFixed(1),
          url: location.pathname,
          home: box(q('.page.home')),
          homeH1: box(q('.page.home h1')),
          vinyl: box(q('.home__vynil')),
          btn: box(q('.home__button')),
          header: box(q('.app-header')),
          canvas: box(q('canvas.webgl-canvas')),
          chaptersPage: box(q('.page.chapters')),
          chBtn0: box(q('.chapters-button[data-index="0"]')),
          chBtn0Inner: box(q('.chapters-button[data-index="0"] .chapters-button__container')),
          body: document.body.className
        });
        if (t < 2600) requestAnimationFrame(tick); else resolve(res);
      }
      requestAnimationFrame(tick);
    });
  })()`;

  await page.evaluate(() => { window.__probe = null; });
  const transitionPromise = page.evaluate(sampleScript);
  await page.waitForTimeout(120);
  // click the home CTA
  await page.evaluate(() => {
    const b = document.querySelector('.home__button') || document.querySelector('.app-header__link--chapters');
    b.click();
  });
  const transSamples = await transitionPromise;
  report.transition = transSamples;
  log('transitionFrames', transSamples.length);
  fs.writeFileSync(path.join(OUT, 'transition.json'), JSON.stringify(transSamples, null, 1));

  await page.waitForTimeout(2500);
  log('urlAfterEnter', page.url());
  await page.screenshot({ path: path.join(OUT, '02-chapters.png') });

  // chapters geometry
  const chapGeo = await page.evaluate(() => {
    const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), tf: cs.transform, o: cs.opacity, pos: cs.position }; };
    const items = [...document.querySelectorAll('.chapters-button')].map(e => ({
      idx: e.dataset.index,
      cls: e.className,
      self: box(e),
      inner: box(e.querySelector('.chapters-button__container')),
      icon: box(e.querySelector('.chapters-button__icon')),
      title: (e.querySelector('.chapters-button__title') || {}).textContent,
      titleBox: box(e.querySelector('.chapters-button__title-container')),
      texts: box(e.querySelector('.chapters-button__texts')),
      nav: box(e.querySelector('.chapters-button__navigation')),
      href: (e.querySelector('a') || {}).getAttribute ? e.querySelector('a').getAttribute('href') : null
    }));
    const cont = document.querySelector('.chapters__container-buttons');
    return { items, cont: box(cont), contStyle: cont ? { tf: getComputedStyle(cont).transform, w: getComputedStyle(cont).width, pos: getComputedStyle(cont).position, display: getComputedStyle(cont).display, flex: getComputedStyle(cont).flexDirection, gap: getComputedStyle(cont).gap } : null,
      tip: box(document.querySelector('.chapter-tip')) };
  });
  log('chapGeo', chapGeo);
  fs.writeFileSync(path.join(OUT, 'chapGeo.json'), JSON.stringify(chapGeo, null, 1));

  // ---------- WHEEL MAPPING ----------
  const wheelProbe = async (delta, times, gap) => {
    await page.mouse.move(720, 450);
    const before = await page.evaluate(() => [...document.querySelectorAll('.chapters-button')].map(e => { const r = e.querySelector('.chapters-button__container'); const b = r.getBoundingClientRect(); return +b.x.toFixed(2); }));
    for (let i = 0; i < times; i++) {
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(gap);
    }
    await page.waitForTimeout(1600);
    const after = await page.evaluate(() => [...document.querySelectorAll('.chapters-button')].map(e => { const r = e.querySelector('.chapters-button__container'); const b = r.getBoundingClientRect(); return +b.x.toFixed(2); }));
    return { delta, times, gap, before, after, shift: before.map((v, i) => +(after[i] - v).toFixed(2)) };
  };
  log('wheel_120', await wheelProbe(120, 1, 60));
  log('wheel_120_x5', await wheelProbe(120, 5, 60));
  log('wheel_neg', await wheelProbe(-120, 3, 60));

  // ---------- DAMPING: sample per-frame y after a single wheel ----------
  const damping = await page.evaluate(() => new Promise(resolve => {
    const read = () => { const e = document.querySelector('.chapters-button[data-index="0"] .chapters-button__container'); const r = e.getBoundingClientRect(); return +r.x.toFixed(3); };
    const res = []; const t0 = performance.now();
    window.__d = res;
    window.__stop = false;
    function tick() {
      res.push({ t: +(performance.now() - t0).toFixed(1), x: read(), sx: window.scrollX, sy: window.scrollY });
      if (!window.__stop && performance.now() - t0 < 2200) requestAnimationFrame(tick); else resolve(res);
    }
    requestAnimationFrame(tick);
  }).then(r => { window.__d = r; return r; }).catch(() => []));
  // simpler: dispatch wheel then sample
  const dampSamples = await (async () => {
    const p = page.evaluate(() => new Promise(resolve => {
      const read = () => { const e = document.querySelector('.chapters-button[data-index="0"] .chapters-button__container'); const r = e.getBoundingClientRect(); return +r.x.toFixed(3); };
      const res = []; const t0 = performance.now();
      function tick() {
        const t = performance.now() - t0;
        res.push([+t.toFixed(1), read()]);
        if (t < 2200) requestAnimationFrame(tick); else resolve(res);
      }
      requestAnimationFrame(tick);
    }));
    await page.waitForTimeout(80);
    await page.mouse.wheel(0, 400);
    return await p;
  })();
  report.damping = dampSamples;
  fs.writeFileSync(path.join(OUT, 'damping.json'), JSON.stringify(dampSamples));
  log('dampingFrames', dampSamples.length);

  await page.screenshot({ path: path.join(OUT, '03-chapters-after-wheel.png') });

  // ---------- REVERSAL MID-TRANSITION ----------
  const reversal = await (async () => {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
    const p = page.evaluate(() => new Promise(resolve => {
      const read = () => { const e = document.querySelector('.chapters-button[data-index="0"] .chapters-button__container'); const r = e.getBoundingClientRect(); return [+r.x.toFixed(3), +r.y.toFixed(3)]; };
      const res = []; const t0 = performance.now();
      function tick() { const t = performance.now() - t0; res.push([+t.toFixed(1), ...read()]); if (t < 1800) requestAnimationFrame(tick); else resolve(res); }
      requestAnimationFrame(tick);
    }));
    await page.mouse.wheel(0, -900);
    return await p;
  })();
  fs.writeFileSync(path.join(OUT, 'reversal.json'), JSON.stringify(reversal));
  log('reversalFrames', reversal.length);

  // ---------- BOUNDARY ----------
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(50); }
  await page.waitForTimeout(1400);
  const atEnd = await page.evaluate(() => [...document.querySelectorAll('.chapters-button')].map(e => +e.querySelector('.chapters-button__container').getBoundingClientRect().x.toFixed(1)));
  log('boundaryEnd', atEnd);
  for (let i = 0; i < 24; i++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(40); }
  await page.waitForTimeout(1400);
  const atStart = await page.evaluate(() => [...document.querySelectorAll('.chapters-button')].map(e => +e.querySelector('.chapters-button__container').getBoundingClientRect().x.toFixed(1)));
  log('boundaryStart', atStart);
  await page.screenshot({ path: path.join(OUT, '04-chapters-boundary.png') });

  // ---------- NAV ACTIVE PILL ----------
  const pill = await page.evaluate(() => {
    const a = document.querySelector('.app-header__link--chapters');
    const t = a.querySelector('.app-header__link-text');
    const cs = getComputedStyle(t, '::after');
    return { after: { opacity: cs.opacity, transform: cs.transform, border: cs.border, borderRadius: cs.borderRadius, padding: cs.padding, transition: cs.transition }, linkColor: getComputedStyle(a).color, weight: getComputedStyle(a).fontWeight };
  });
  log('navPill', pill);

  // ---------- ENTER CHAPTER ----------
  const enterSamples = await (async () => {
    const p = page.evaluate(`(() => {
      const res=[];const t0=performance.now();
      const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),o:+(+cs.opacity).toFixed(3)};};
      return new Promise(resolve=>{function tick(){const t=performance.now()-t0;
        res.push({t:+t.toFixed(1),url:location.pathname,body:document.body.className,
          chaptersPage:box(document.querySelector('.page.chapters')),
          ch0:box(document.querySelector('.chapters-button[data-index="0"]')),
          chapterPage:box(document.querySelector('.page.chapter')),
          canvas:box(document.querySelector('canvas.webgl-canvas'))});
        if(t<2800)requestAnimationFrame(tick);else resolve(res);}requestAnimationFrame(tick);});})()`);
    await page.waitForTimeout(150);
    await page.evaluate(() => { const a = document.querySelector('.chapters-button[data-index="0"] a'); a.click(); });
    return await p;
  })();
  fs.writeFileSync(path.join(OUT, 'enter-chapter.json'), JSON.stringify(enterSamples, null, 1));
  log('enterChapterFrames', enterSamples.length);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, '05-chapter1.png') });
  log('urlChapter', page.url());
  const chapterDom = await page.evaluate(() => {
    const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), o: cs.opacity, tf: cs.transform, pos: cs.position }; };
    const nodes = [...document.querySelectorAll('.page.chapter *')].slice(0, 60).map(e => ({ tag: e.tagName, cls: e.className, txt: (e.textContent || '').trim().slice(0, 60), box: box(e) }));
    return { nodes, scrollH: document.documentElement.scrollHeight, innerH: innerHeight };
  });
  fs.writeFileSync(path.join(OUT, 'chapterDom.json'), JSON.stringify(chapterDom, null, 1));
  log('chapterScrollH', { scrollH: chapterDom.scrollH, innerH: chapterDom.innerH });

  // ---------- BACK ----------
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  log('urlBack', page.url());
  await page.screenshot({ path: path.join(OUT, '06-back-to-chapters.png') });

  // ---------- ABOUT ----------
  await page.goto('https://ponpon-mania.com/about', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(OUT, '07-about-top.png') });
  const aboutGeo = await page.evaluate(() => {
    const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), o: cs.opacity, tf: cs.transform, pos: cs.position, top: cs.top }; };
    const secs = [...document.querySelectorAll('.about-section')].map(e => ({ cls: e.className, box: box(e) }));
    const dots = [...document.querySelectorAll('[class*="dot"], [class*="nav"], [class*="progress"], [class*="indicator"]')].map(e => ({ cls: e.className, box: box(e) })).slice(0, 20);
    return { secs, dots, scrollH: document.documentElement.scrollHeight, innerH: innerHeight, bodyCls: document.body.className,
      sections: [...document.querySelectorAll('.about-section')].map(e => e.className) };
  });
  log('aboutGeo', aboutGeo);
  fs.writeFileSync(path.join(OUT, 'aboutGeo.json'), JSON.stringify(aboutGeo, null, 1));

  // scroll through about sampling parallax
  const aboutScroll = await (async () => {
    const p = page.evaluate(() => new Promise(resolve => {
      const res = []; const t0 = performance.now();
      const pick = () => {
        const o = { t: null, y: window.scrollY };
        document.querySelectorAll('.about-section').forEach((e, i) => {
          const cs = getComputedStyle(e);
          const inner = e.firstElementChild ? getComputedStyle(e.firstElementChild) : null;
          const canvas = document.querySelector('.webgl-canvas');
          o['s' + i] = [cs.transform, cs.opacity];
          if (inner) o['s' + i + 'i'] = [inner.transform, inner.opacity];
        });
        const c = document.querySelector('.webgl-canvas');
        o.canvas = c ? [c.getBoundingClientRect().y] : null;
        return o;
      };
      function tick() { const t = performance.now() - t0; const o = pick(); o.t = +t.toFixed(1); res.push(o); if (t < 3000) requestAnimationFrame(tick); else resolve(res); }
      requestAnimationFrame(tick);
    }));
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(200); }
    const r = await p;
    fs.writeFileSync(path.join(OUT, 'about-scroll.json'), JSON.stringify(r.slice(0, 400), null, 1));
    return r;
  })();
  log('aboutScrollFrames', aboutScroll.length);
  await page.screenshot({ path: path.join(OUT, '08-about-scrolled.png') });

  // reduced motion check
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rm.newPage();
  await rp.goto('https://ponpon-mania.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await rp.waitForTimeout(4000);
  await rp.screenshot({ path: path.join(OUT, '09-reduced-motion.png') });
  log('reducedMotionLoaded', true);

  report.consoleErrors = consoleErrs.slice(0, 25);
  log('consoleErrorCount', consoleErrs.length);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
