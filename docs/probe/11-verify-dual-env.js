/**
 * 双环境验证：开发服务（StrictMode 生效）与生产预览。
 *
 * 覆盖：
 *   A 视频生命周期 —— 首次播放 / 刷新详情 / 离开再返回 / 横竖屏互切 / 暂停 / 进度
 *   B 键盘作用域  —— 关于页原生滚动 / 详情页原生滚动 + ←→ 切作品（含路由/视频/标题同步）
 *                    / 进度条聚焦时方向键只调进度 / 作品页方向键切作品
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
const ARGS = ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'];

const BASES = [
  { name: 'dev', url: 'http://127.0.0.1:5199', label: '开发服务（React StrictMode 生效）' },
  { name: 'prod', url: 'http://127.0.0.1:4321', label: '生产预览（构建产物）' },
];

const RESULT = {};
const say = (...a) => console.log(...a);

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ARGS });

  for (const base of BASES) {
    const R = {};
    RESULT[base.name] = R;
    say(`\n========== ${base.name} :: ${base.label} ==========`);

    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 220)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push('C:' + m.text().slice(0, 220)); });

    const vsrc = () => p.evaluate(() => {
      const v = document.querySelector('video.detail__video');
      return {
        hasEl: !!v,
        src: v ? v.getAttribute('src') : null,
        paused: v ? v.paused : null,
        t: v ? +v.currentTime.toFixed(2) : null,
        dur: v && Number.isFinite(v.duration) ? +v.duration.toFixed(2) : 0,
        ready: v ? v.readyState : null,
        nav: window.__nav.getSnapshot().playbackState,
      };
    });
    const barTitle = () => p.evaluate(() => {
      const e = document.querySelector('.bar__title');
      return e ? e.textContent.trim() : null;
    });
    const stage = () => p.evaluate(() => {
      const s = document.querySelector('.detail__stage');
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(4) };
    });
    const play = async () => {
      await p.evaluate(() => document.querySelector('.bar-btn--play')?.click());
    };
    const waitFor = async (fn, ms = 9000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        if (await fn()) return true;
        await p.waitForTimeout(200);
      }
      return false;
    };

    /* ---------------- A1 首次播放（StrictMode 场景） ---------------- */
    await p.goto(base.url + '/works/salt-horizon', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(base.name === 'dev' ? 6000 : 4000); // dev 首次编译较慢
    const a0 = await vsrc();
    R.A1_初始状态 = a0;
    R.A1_src未被清空 = typeof a0.src === 'string' && a0.src.length > 0;
    await play();
    const played = await waitFor(async () => (await vsrc()).t > 0.2, 9000);
    const a1 = await vsrc();
    R.A1_首次播放 = { 成功: played, ...a1 };
    await p.screenshot({ path: path.join(OUT, `dual-${base.name}-A1-firstplay.png`) });

    /* ---------------- A2 刷新详情页 ---------------- */
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(base.name === 'dev' ? 4500 : 3200);
    const a2 = await vsrc();
    await play();
    const played2 = await waitFor(async () => (await vsrc()).t > 0.2, 9000);
    R.A2_刷新后 = { src: a2.src, src在: !!a2.src, 可播放: played2 };

    /* ---------------- A3 暂停 + 进度 ---------------- */
    await play(); // 暂停
    await p.waitForTimeout(700);
    const a3p = await vsrc();
    await p.evaluate(() => {
      const s = document.querySelector('.bar__scrub');
      const r = s.getBoundingClientRect();
      s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width * 0.6, clientY: r.top + r.height / 2 }));
    });
    await p.waitForTimeout(700);
    const a3s = await vsrc();
    R.A3_暂停 = { paused: a3p.paused, nav: a3p.nav };
    R.A3_拖到60pct = { t: a3s.t, dur: a3s.dur, ratio: a3s.dur ? +(a3s.t / a3s.dur).toFixed(2) : null };

    /* ---------------- A4 横竖屏互切 ---------------- */
    await p.evaluate(() => document.querySelector('.bar-btn[aria-label="下一个作品"]')?.click());
    await p.waitForTimeout(3600);
    const a4 = { url: p.url(), ...(await vsrc()), stage: await stage(), title: await barTitle() };
    await play();
    const playedV = await waitFor(async () => (await vsrc()).t > 0.15, 9000);
    R.A4_切到竖屏 = { ...a4, 可播放: playedV };
    await p.screenshot({ path: path.join(OUT, `dual-${base.name}-A4-vertical.png`) });

    await p.evaluate(() => document.querySelector('.bar-btn[aria-label="上一个作品"]')?.click());
    await p.waitForTimeout(3600);
    const a5 = { url: p.url(), ...(await vsrc()), stage: await stage(), title: await barTitle() };
    await play();
    const playedH = await waitFor(async () => (await vsrc()).t > 0.15, 9000);
    R.A5_切回横屏 = { ...a5, 可播放: playedH };

    /* ---------------- A6 离开再返回 ---------------- */
    await p.evaluate(() => document.querySelector('.bar-btn[aria-label="返回作品列表"]')?.click());
    await p.waitForTimeout(3200);
    const left = await p.evaluate(() => ({ url: location.pathname, hasVideo: !!document.querySelector('video') }));
    await p.evaluate(() => document.querySelector('.bar-btn--play')?.click()); // 重新进入作品
    await p.waitForTimeout(3800);
    const back = { url: p.url(), ...(await vsrc()) };
    await play();
    const playedBack = await waitFor(async () => (await vsrc()).t > 0.2, 9000);
    R.A6_离开再返回 = { 离开时: left, 返回后: back, 可播放: playedBack };

    /* ---------------- B 键盘作用域 ---------------- */
    // B1 关于页：原生滚动必须生效
    await p.goto(base.url + '/about', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3600);
    await p.mouse.move(700, 500);
    const scrollY = () => p.evaluate(() => Math.round(window.scrollY));
    const k = async (key, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(key); await p.waitForTimeout(220); } };
    const y0 = await scrollY();
    await k('PageDown', 2);
    const y1 = await scrollY();
    await k('ArrowDown', 4);
    const y2 = await scrollY();
    await k('End');
    const y3 = await scrollY();
    await k('Home');
    const y4 = await scrollY();
    R.B1_关于页原生滚动 = { 起始: y0, PageDown后: y1, ArrowDown后: y2, End后: y3, Home后: y4,
      PageDown生效: y1 > y0, ArrowDown生效: y2 > y1, End生效: y3 > y2, Home生效: y4 < y3 };

    // B2 详情页：上下/翻页/Home/End 原生滚动；←→ 切作品并同步
    await p.goto(base.url + '/works/salt-horizon', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3800);
    const before = { url: p.url(), src: (await vsrc()).src, title: await barTitle() };
    const dy0 = await scrollY();
    await k('PageDown', 2);
    const dy1 = await scrollY();
    await k('ArrowDown', 4);
    const dy2 = await scrollY();
    R.B2_详情页原生滚动 = { PageDown: dy1 > dy0, ArrowDown: dy2 > dy1, dy0, dy1, dy2 };

    await k('ArrowRight');
    await p.waitForTimeout(4000);
    const afterRight = { url: p.url(), src: (await vsrc()).src, title: await barTitle() };
    await k('ArrowLeft');
    await p.waitForTimeout(4000);
    const afterLeft = { url: p.url(), src: (await vsrc()).src, title: await barTitle() };
    R.B2_左右切作品 = {
      前: before, ArrowRight后: afterRight, ArrowLeft后: afterLeft,
      路由同步: afterRight.url !== before.url && afterLeft.url === before.url,
      视频同步: afterRight.src !== before.src,
      标题同步: afterRight.title !== before.title,
    };

    // B3 进度条聚焦：方向键只调进度
    await p.evaluate(() => document.querySelector('.bar__scrub')?.focus());
    await p.waitForTimeout(500);
    const beforeSeek = { url: p.url(), t: (await vsrc()).t };
    await k('ArrowRight', 3);
    await p.waitForTimeout(700);
    const afterSeek = { url: p.url(), t: (await vsrc()).t };
    R.B3_进度条聚焦 = { 前: beforeSeek, 后: afterSeek,
      进度变了: afterSeek.t > beforeSeek.t, 路由没变: afterSeek.url === beforeSeek.url };

    // B4 作品页：方向键换作品，页面不滚动
    await p.goto(base.url + '/works', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3800);
    const sel0 = await p.evaluate(() => window.__nav.getSnapshot().selectedIndex);
    await k('ArrowUp');
    await p.waitForTimeout(1200);
    const sel1 = await p.evaluate(() => window.__nav.getSnapshot().selectedIndex);
    const wy = await scrollY();
    R.B4_作品页键盘 = { 起始: sel0, ArrowUp后: sel1, 换了作品: sel1 !== sel0, 页面未滚动: wy === 0 };

    R.控制台错误 = errs;
    say(JSON.stringify(R, null, 1));
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'dual-env-verify.json'), JSON.stringify(RESULT, null, 1));
  await b.close();
  say('\nDONE → docs/verify/dual-env-verify.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
