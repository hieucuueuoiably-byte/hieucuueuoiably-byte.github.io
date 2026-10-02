/**
 * 参考站滚轮输入重测（v2）。
 *
 * v1 的教训：用"连发反向滚轮把下标顶回 0"来复位，会污染参考站的内部累加状态，
 * 结果 T1/T2 全部测成 false，与首次观测（5×120 能走一格）矛盾。
 * 所以 v2 改成**每次试验都重载页面**，从干净状态开始。
 *
 * 要分离的量：
 *   T1 单次事件的触发阈值（delta 越大越可能触发？还是根本不看单次？）
 *   T2 多事件是否累加
 *   T3 累加窗口（事件间隔多大之后不再累加）
 *   T4 冷却时间（切完一次之后多久接受下一次）
 *   T5 长串事件是"一次手势一格"还是能连跳
 *   T6 方向翻转怎么处理
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/probe';
const SITE = 'https://ponpon-mania.com/chapters';

const log = [];
const rec = (k, v) => { log.push({ k, v }); console.log('• ' + k + ' :: ' + JSON.stringify(v)); };

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();

  const waitReady = async () => {
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

  const fresh = async () => {
    await p.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitReady();
    try { await p.click('.cookie-popin button.accept', { timeout: 2500 }); } catch { }
    await p.waitForTimeout(600);
    await p.mouse.move(640, 400);
  };

  const activeIdx = () =>
    p.evaluate(() => {
      const list = [...document.querySelectorAll('.chapters-button')];
      let best = -1, bestO = -1;
      list.forEach((e, i) => {
        const o = parseFloat(getComputedStyle(e).opacity);
        if (o > bestO) { bestO = o; best = i; }
      });
      return { idx: best, opacity: +bestO.toFixed(2) };
    });

  const sent = async (events, gap) => {
    for (let i = 0; i < events.length; i++) {
      await p.mouse.wheel(0, events[i]);
      if (i < events.length - 1) await p.waitForTimeout(gap);
    }
  };

  // 先做一次基准：确认"干净页面 + 5×120"能走一格（v1 的复位污染反证）
  await fresh();
  const beforeBase = await activeIdx();
  await sent([120, 120, 120, 120, 120], 60);
  await p.waitForTimeout(1800);
  rec('基准 · 干净页面 5×120（间隔 60ms）', { before: beforeBase.idx, after: (await activeIdx()).idx });

  /* ---------------- T1 单次事件阈值 ---------------- */
  const t1 = [];
  for (const d of [60, 120, 240, 600, 1200]) {
    await fresh();
    await sent([d], 0);
    await p.waitForTimeout(1800);
    t1.push({ delta: d, idx: (await activeIdx()).idx, stepped: (await activeIdx()).idx > 0 });
  }
  rec('T1 单次事件 · 各 delta 最终下标', t1);

  /* ---------------- T2 多事件累加 ---------------- */
  const t2 = [];
  for (const [d, n] of [[60, 3], [60, 5], [120, 3], [120, 5], [200, 3], [400, 3]]) {
    await fresh();
    await sent(new Array(n).fill(d), 60);
    await p.waitForTimeout(1800);
    const a = await activeIdx();
    t2.push({ delta: d, n, total: d * n, idx: a.idx, stepped: a.idx > 0 });
  }
  rec('T2 多事件累加（间隔 60ms）', t2);

  /* ---------------- T3 累加窗口 ---------------- */
  const t3 = [];
  for (const gap of [0, 40, 120, 300, 600]) {
    await fresh();
    await sent([120, 120, 120], gap);
    await p.waitForTimeout(1800);
    const a = await activeIdx();
    t3.push({ gap, total: 360, idx: a.idx, stepped: a.idx > 0 });
  }
  rec('T3 累加窗口（3×120，改间隔）', t3);

  /* ---------------- T4 冷却 ---------------- */
  const t4 = [];
  for (const gap of [0, 150, 400, 800, 1500]) {
    await fresh();
    await sent([900], 0);
    await p.waitForTimeout(gap);
    await sent([900], 0);
    await p.waitForTimeout(2400);
    t4.push({ gap, idx: (await activeIdx()).idx });
  }
  rec('T4 冷却（两次 900，改间隔 → 最终下标）', t4);

  /* ---------------- T5 长串事件 ---------------- */
  const t5 = [];
  for (const [d, n, gap] of [[120, 12, 60], [300, 12, 260], [600, 10, 120]]) {
    await fresh();
    await sent(new Array(n).fill(d), gap);
    await p.waitForTimeout(2400);
    const a = await activeIdx();
    t5.push({ delta: d, n, gap, total: d * n, idx: a.idx });
  }
  rec('T5 长串事件（能否连跳多格 / 末格上限）', t5);

  /* ---------------- T6 方向翻转 ---------------- */
  await fresh();
  await sent([900, 900], 200);
  await p.waitForTimeout(1800);
  const fwd = (await activeIdx()).idx;
  await sent([-900], 0);
  await p.waitForTimeout(1800);
  const back = (await activeIdx()).idx;
  rec('T6 方向翻转（前进 2 格后反向 1 次）', { 前进后: fwd, 反向后: back, 退了一格: back === fwd - 1 });

  /* ---------------- T7 单次极大增量能否连跳 ---------------- */
  await fresh();
  await sent([6000], 0);
  await p.waitForTimeout(2600);
  rec('T7 单次 6000（一次事件能跳几格）', { idx: (await activeIdx()).idx });

  fs.writeFileSync(path.join(OUT, 'wheel-input-probe.json'), JSON.stringify(log, null, 1));
  await b.close();
  console.log('\nDONE → docs/probe/wheel-input-probe.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
