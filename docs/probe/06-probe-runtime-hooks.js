/**
 * 运行时取证：参考站 /chapters 的滚轮到底走到哪里。
 *
 * 做法：在页面脚本执行前注入钩子
 *   - 包装 addEventListener，记录谁注册了 wheel / scroll 监听
 *   - 包装 preventDefault，看是否被吞掉
 *   - 找出所有 scrollWidth > clientWidth 的可滚动元素
 * 然后发滚轮事件，观察：谁收到了、谁滚了、下标变没变。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');

const HOOK = () => {
  const W = window;
  W.__probe = { wheelListeners: [], scrollListeners: [], prevented: 0, scrolls: [], wheelSeen: [] };

  const origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opt) {
    try {
      if (type === 'wheel') W.__probe.wheelListeners.push(this === W ? 'window' : (this.className || this.tagName || String(this)));
      if (type === 'scroll') W.__probe.scrollListeners.push(this === W ? 'window' : (this.className || this.tagName || String(this)));
    } catch (e) { /* ignore */ }
    return origAdd.call(this, type, fn, opt);
  };

  const origPD = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    try { if (this.type === 'wheel') W.__probe.prevented++; } catch (e) { }
    return origPD.call(this);
  };

  const origWheel = W.__probe;
  W.addEventListener('wheel', (e) => {
    origWheel.wheelSeen.push({ dy: Math.round(e.deltaY), dx: Math.round(e.deltaX), trusted: e.isTrusted, target: e.target && (e.target.className || e.target.tagName) });
  }, true);

  document.addEventListener('scroll', (e) => {
    const t = e.target;
    const name = t === document ? 'document' : (t === W ? 'window' : (t.className || t.tagName));
    W.__probe.scrolls.push({ name, sl: t.scrollLeft ?? null, st: t.scrollTop ?? null });
  }, true);
};

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.addInitScript(HOOK);

  // 复刻 v1 的路径：首页 → 点 CTA 进 chapters
  await p.goto('https://ponpon-mania.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
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
  await p.waitForTimeout(2500);
  try { await p.click('.cookie-popin button.accept', { timeout: 2500 }); } catch { }
  await p.click('.home__button');
  await p.waitForTimeout(6000);
  console.log('url =', p.url());

  const activeIdx = () =>
    p.evaluate(() => {
      const list = [...document.querySelectorAll('.chapters-button')];
      let best = -1, bestO = -1;
      list.forEach((e, i) => { const o = parseFloat(getComputedStyle(e).opacity); if (o > bestO) { bestO = o; best = i; } });
      return { idx: best, o: +bestO.toFixed(2), n: list.length };
    });

  console.log('进入后 active =', JSON.stringify(await activeIdx()));

  const env = await p.evaluate(() => {
    const scrollables = [];
    document.querySelectorAll('*').forEach((e) => {
      const cs = getComputedStyle(e);
      const canX = e.scrollWidth > e.clientWidth + 2;
      const canY = e.scrollHeight > e.clientHeight + 2;
      if ((canX || canY) && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) {
        scrollables.push({
          cls: (e.className && String(e.className).slice(0, 70)) || e.tagName,
          ox: cs.overflowX, oy: cs.overflowY,
          sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight,
        });
      }
    });
    return {
      wheelListeners: window.__probe.wheelListeners,
      scrollListeners: window.__probe.scrollListeners.slice(0, 20),
      scrollListenerCount: window.__probe.scrollListeners.length,
      docScroll: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight },
      bodyOverflow: getComputedStyle(document.body).overflow,
      scrollables: scrollables.slice(0, 14),
      globals: Object.keys(window).filter((k) => /lenis|gsap|scroll|pager|smooth/i.test(k)).slice(0, 25),
      hasLenisClass: !!document.querySelector('.lenis, .lenis-wrapper, [class*="lenis"]'),
    };
  });
  console.log('ENV =', JSON.stringify(env, null, 1));

  // 发滚轮
  await p.mouse.move(720, 450);
  await p.evaluate(() => { window.__probe.wheelSeen = []; window.__probe.scrolls = []; window.__probe.prevented = 0; });
  for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(70); }
  await p.waitForTimeout(2000);
  const after = await p.evaluate(() => ({
    wheelSeen: window.__probe.wheelSeen,
    prevented: window.__probe.prevented,
    scrolls: window.__probe.scrolls.slice(0, 12),
    scrollCount: window.__probe.scrolls.length,
  }));
  console.log('WHEEL 之后 =', JSON.stringify(after, null, 1));
  console.log('active now =', JSON.stringify(await activeIdx()));

  // 也试试键盘
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(1500);
  console.log('ArrowDown 之后 active =', JSON.stringify(await activeIdx()));
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(1500);
  console.log('ArrowRight 之后 active =', JSON.stringify(await activeIdx()));

  console.log('errors =', JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
