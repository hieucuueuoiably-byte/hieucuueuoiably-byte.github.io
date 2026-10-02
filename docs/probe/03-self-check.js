const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const OUT = 'C:/Users/123/AppData/Local/Temp/self_check';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const log = (...a) => console.log(...a);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 300)));

  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

  /* ---------- 1. 首页 ---------- */
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  await shot('01-home');
  log('HOME url=', page.url());
  log('HOME body classes=', await page.evaluate(() => document.body.className));
  log('HOME gl ok=', await page.evaluate(() => {
    const c = document.querySelector('canvas.gl-canvas');
    if (!c) return 'no canvas';
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return gl ? gl.getParameter(gl.VERSION) : 'no ctx';
  }));
  log('HOME header color=', await page.evaluate(() => getComputedStyle(document.querySelector('.app-header')).color));
  log('HOME stage layers=', await page.evaluate(() => [...document.querySelectorAll('.page [data-stage-layer]')].map(e => e.className || e.tagName)));

  /* ---------- 2. 进入作品（观察转场） ---------- */
  const sampleNav = () => page.evaluate(() => {
    const n = window.__nav;
    return n ? n.getSnapshot() : null;
  });
  const clickAndSample = async (selector, tag, dur = 1700) => {
    const p = page.evaluate((d) => new Promise((res) => {
      const out = [];
      const t0 = performance.now();
      const read = () => {
        const n = window.__nav;
        const s = n ? n.getSnapshot() : null;
        return {
          t: +(performance.now() - t0).toFixed(0),
          cur: n ? +n.getCurrent().toFixed(3) : null,
          tgt: n ? +n.getTarget().toFixed(3) : null,
          vel: n ? +n.getVelocity().toFixed(3) : null,
          sel: s ? s.selectedIndex : null,
          rt: s ? s.routeTransition : null,
          path: location.pathname,
          wipeVisible: !!document.querySelector('.wipe.is-active'),
        };
      };
      const tick = () => {
        out.push(read());
        if (performance.now() - t0 < d) requestAnimationFrame(tick); else res(out);
      };
      requestAnimationFrame(tick);
    }), dur);
    await page.waitForTimeout(90);
    await page.click(selector);
    const r = await p;
    fs.writeFileSync(`${OUT}/trace-${tag}.json`, JSON.stringify(r));
    return r;
  };

  const t1 = await clickAndSample('.home__cta', 'home-to-works');
  log('TRANSITION frames=', t1.length, 'routeChangedAt(sampled)=', (t1.find(x => x.path !== '/') || {}).t, 'TRUE swapMs=', await page.evaluate(() => window.__lastSwapMs), 'wipeSeen=', t1.some(x => x.wipeVisible));
  await page.waitForTimeout(2500);
  await shot('02-works');
  log('WORKS url=', page.url());

  /* ---------- 3. 滚轮驱动横移：累计阈值 ---------- */
  await page.mouse.move(720, 450);
  const readState = () => page.evaluate(() => {
    const n = window.__nav;
    return { cur: +n.getCurrent().toFixed(3), tgt: n.getTarget(), sel: n.getSnapshot().selectedIndex };
  });
  log('works before wheel: ', JSON.stringify(await readState()));
  for (let i = 1; i <= 3; i++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(90);
    log(`  after wheel#${i} (delta 60):`, JSON.stringify(await readState()));
  }
  await page.mouse.wheel(0, 60);
  await page.waitForTimeout(1200);
  log('  after 4x60=240 →', JSON.stringify(await readState()));
  await shot('03-works-step1');

  /* ---------- 4. 阻尼曲线（单步后的收敛） ---------- */
  const damp = await (async () => {
    const p = page.evaluate(() => new Promise((res) => {
      const out = [];
      const t0 = performance.now();
      const tick = () => {
        const n = window.__nav;
        out.push([+(performance.now() - t0).toFixed(0), +n.getCurrent().toFixed(4), +n.getVelocity().toFixed(3)]);
        if (performance.now() - t0 < 1600) requestAnimationFrame(tick); else res(out);
      };
      requestAnimationFrame(tick);
    }));
    await page.waitForTimeout(70);
    await page.mouse.wheel(0, 400);
    return await p;
  })();
  fs.writeFileSync(`${OUT}/damping.json`, JSON.stringify(damp));
  const from = damp[0][1], to = damp[damp.length - 1][1];
  const t63 = damp.find(x => Math.abs(x[1] - from) >= Math.abs(to - from) * 0.632);
  log('DAMPING from', from, 'to', to, 'reach63% at ~', t63 ? t63[0] + 'ms' : 'n/a', 'frames', damp.length);
  log('DAMPING peak |velocity| =', Math.max(...damp.map(x => Math.abs(x[2]))));
  await shot('04-works-after-wheel');

  /* ---------- 5. 弯曲取证：切换中的封面（WebGL，靠截图） ---------- */
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(170);
  await shot('05-bend-mid');
  await page.waitForTimeout(1500);
  await shot('06-bend-settled');

  /* ---------- 6. 首尾边界 ---------- */
  await page.evaluate(() => window.__nav.jumpTo(0, { force: true }));
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(900);
  log('BOUNDARY at start:', JSON.stringify(await readState()));
  await page.evaluate(() => window.__nav.jumpTo(999, { force: true }));
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(900);
  log('BOUNDARY at end:', JSON.stringify(await readState()));
  await shot('07-boundary-end');

  /* ---------- 7. 连续切换 10 次 ---------- */
  await page.evaluate(() => window.__nav.jumpTo(0, { force: true }));
  await page.waitForTimeout(700);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(90); }
  await page.waitForTimeout(1600);
  log('RAPID 10 steps →', JSON.stringify(await readState()));
  await shot('08-rapid');

  /* ---------- 8. 切换中反向 ---------- */
  await page.evaluate(() => window.__nav.jumpTo(2, { force: true }));
  await page.waitForTimeout(900);
  const rev = await (async () => {
    const p = page.evaluate(() => new Promise((res) => {
      const out = []; const t0 = performance.now();
      const tick = () => {
        const n = window.__nav;
        out.push([+(performance.now() - t0).toFixed(0), +n.getCurrent().toFixed(3), +n.getVelocity().toFixed(3)]);
        if (performance.now() - t0 < 1300) requestAnimationFrame(tick); else res(out);
      };
      requestAnimationFrame(tick);
    }));
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(220);
    await page.mouse.wheel(0, -500);
    return await p;
  })();
  fs.writeFileSync(`${OUT}/reversal.json`, JSON.stringify(rev));
  const velSigns = rev.map(x => Math.sign(x[2])).filter(Boolean);
  const flipAt = velSigns.findIndex((s, i) => i > 0 && s !== velSigns[i - 1]);
  log('REVERSAL sign flip at frame', flipAt, 'of', rev.length, 'values', JSON.stringify(rev.map(x => x[2]).slice(0, 20)));

  /* ---------- 9. 进入作品详情（含 M05 接续） ---------- */
  await page.evaluate(() => window.__nav.jumpTo(2, { force: true }));
  await page.waitForTimeout(800);
  const t2 = await clickAndSample('.bar-btn--play', 'works-to-detail', 1900);
  log('DETAIL transition: TRUE swapMs=', await page.evaluate(() => window.__lastSwapMs), 'wipeSeen=', t2.some(x => x.wipeVisible));
  await page.waitForTimeout(2200);
  await shot('09-detail');
  log('DETAIL cover rect (webgl canvas pixels)=', await page.evaluate(() => {
    const n = window.__nav; return n ? { sel: n.getSnapshot().selectedIndex } : null;
  }));
  log('DETAIL url=', page.url());
  log('DETAIL stage rect=', await page.evaluate(() => {
    const e = document.querySelector('.detail__stage');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  }));
  log('DETAIL missing notice=', await page.evaluate(() => !!document.querySelector('.detail__missing')));
  log('DETAIL bar mode=', await page.evaluate(() => document.querySelector('.control-bar')?.className));
  await page.evaluate(() => { const d = document.querySelector('.detail'); d.scrollTop = 420; });
  await page.waitForTimeout(500);
  await shot('10-detail-scrolled');

  /* ---------- 10. 返回并检查是否恢复位置 ---------- */
  const t3 = await clickAndSample('.bar-btn[aria-label="返回作品列表"]', 'detail-to-works', 1500);
  await page.waitForTimeout(2200);
  log('BACK url=', page.url(), 'restored=', JSON.stringify(await readState()));
  await shot('11-back-to-works');

  /* ---------- 11. 关于页滚动 ---------- */
  await page.click('.app-header__link--about');
  await page.waitForTimeout(2600);
  await shot('12-about-top');
  log('ABOUT url=', page.url());
  log('ABOUT nav visible=', await page.evaluate(() => document.querySelector('.about-nav')?.className));
  const aboutScroll = async (dy, tag, n = 5) => {
    await page.mouse.move(700, 500);
    for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy); await page.waitForTimeout(170); }
    await page.waitForTimeout(700);
    const st = await page.evaluate(() => {
      const sc = document.querySelector('.about');
      const secs = [...document.querySelectorAll('.about-section')].map(s => {
        const inner = s.querySelector('[data-parallax]');
        return { y: +s.getBoundingClientRect().y.toFixed(0), par: inner ? getComputedStyle(inner).transform : null };
      });
      return {
        scrollTop: Math.round(window.scrollY),
        innerScrollTop: Math.round(sc?.scrollTop ?? -1),
        docH: document.documentElement.scrollHeight,
        winH: window.innerHeight,
        active: [...document.querySelectorAll('.about-nav__dot')].findIndex(b => b.classList.contains('is-active')),
        prog: document.querySelector('.about-progress__bar')?.style.transform,
        secs,
        navCls: document.querySelector('.about-nav')?.className,
        revealed: [...document.querySelectorAll('[data-reveal]')].map(e => +(+getComputedStyle(e).opacity).toFixed(2)),
      };
    });
    fs.writeFileSync(`${OUT}/about-${tag}.json`, JSON.stringify(st, null, 1));
    log(`ABOUT ${tag}: windowY=${st.scrollTop} innerY=${st.innerScrollTop} docH=${st.docH} winH=${st.winH} activeDot=${st.active} prog=${st.prog} nav=${st.navCls}`);
    log(`   parallax=${JSON.stringify(st.secs.map(s => s.par))}`);
    log(`   reveal opacity=${JSON.stringify(st.revealed)}`);
    return st;
  };
  await aboutScroll(300, 'down1', 6);
  await shot('13-about-mid');
  await aboutScroll(300, 'down2', 8);
  await shot('14-about-deep');
  // 反向
  await aboutScroll(-300, 'up1', 8);
  await shot('15-about-back-up');
  await aboutScroll(500, 'bottom', 12);
  await shot('16-about-bottom');

  /* ---------- 12. 窗口缩放 ---------- */
  await page.setViewportSize({ width: 900, height: 640 });
  await page.waitForTimeout(900);
  await page.click('.app-header__link--works');
  await page.waitForTimeout(2200);
  await shot('17-resized-works');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1400);
  await shot('18-mobile-works');
  log('MOBILE bar rect=', await page.evaluate(() => {
    const e = document.querySelector('.control-bar'); const r = e.getBoundingClientRect();
    return { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) };
  }));
  log('MOBILE touch targets (min w/h of .bar-btn) =', await page.evaluate(() => {
    const r = [...document.querySelectorAll('.bar-btn')].map(b => { const q = b.getBoundingClientRect(); return Math.min(q.width, q.height); });
    return Math.round(Math.min(...r));
  }));

  /* ---------- 13. 减少动态效果 ---------- */
  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  const rErrs = [];
  rp.on('pageerror', (e) => rErrs.push(String(e).slice(0, 200)));
  await rp.goto(BASE + '/works', { waitUntil: 'networkidle', timeout: 60000 });
  await rp.waitForTimeout(3000);
  await rp.screenshot({ path: `${OUT}/19-reduced-motion.png` });
  log('REDUCED nav=', await rp.evaluate(() => window.__nav.getSnapshot()));
  await rp.goto(BASE + '/about', { waitUntil: 'networkidle' });
  await rp.waitForTimeout(2600);
  await rp.screenshot({ path: `${OUT}/20-reduced-about.png` });
  log('REDUCED about reveal opacities=', await rp.evaluate(() => [...document.querySelectorAll('[data-reveal]')].map(e => +(+getComputedStyle(e).opacity).toFixed(2))));
  log('REDUCED errors=', JSON.stringify(rErrs));

  /* ---------- 14. WebGL 不可用降级 ---------- */
  const nctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await nctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).includes('webgl')) return null;
      return orig.call(this, type, ...rest);
    };
  });
  const np = await nctx.newPage();
  const nErrs = [];
  np.on('pageerror', (e) => nErrs.push(String(e).slice(0, 200)));
  await np.goto(BASE + '/works', { waitUntil: 'networkidle', timeout: 60000 });
  await np.waitForTimeout(3000);
  await np.screenshot({ path: `${OUT}/21-no-webgl.png` });
  log('NO-WEBGL static cards=', await np.evaluate(() => document.querySelectorAll('.static-works__card').length));
  log('NO-WEBGL notice=', await np.evaluate(() => !!document.querySelector('.static-notice')));
  log('NO-WEBGL errors=', JSON.stringify(nErrs));
  await np.evaluate(() => document.querySelector('.static-works__card.is-active').click());
  await np.waitForTimeout(2500);
  log('NO-WEBGL can enter detail → url=', np.url(), 'has detail=', await np.evaluate(() => !!document.querySelector('.detail')));
  await np.screenshot({ path: `${OUT}/22-no-webgl-detail.png` });

  log('\n===== CONSOLE ERRORS (main ctx) =====');
  log(errs.length ? JSON.stringify(errs, null, 1) : '(none)');

  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
