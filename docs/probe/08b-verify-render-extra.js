/**
 * 追加验证：
 *  1) 半格连续性 —— 用同一组主题色，直接比较「round 取整」与「floor + 小数」两种插值公式
 *     在 0.45→0.55 区间的相邻步色差，证明修复前后的差别（公式在页面里现算，不改动交付代码）。
 *  2) 竖屏舞台比例 —— 9:16 视频的舞台必须是"高而窄"，而不是被 max-height 压成横向。
 *  3) 减少动态效果下封面是否真的完全无形变（读 uniform + 像素 A/B）。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
const ARGS = ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'];
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';
fs.mkdirSync(OUT, { recursive: true });
const R = { results: [], note: (k, v) => { R.results.push({ k, v }); console.log('• ' + k + ' :: ' + JSON.stringify(v)); } };

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ARGS });

  /* ---------------- 1) round vs floor 的连续性对比 ---------------- */
  const p = await (await b.newContext({ viewport: { width: 900, height: 640 } })).newPage();
  await p.goto(BASE + '/works', { waitUntil: 'networkidle', timeout: 90000 });
  const cmp = await p.evaluate(async () => {
    const mod = await import('/assets/__none__').catch(() => null);
    // 直接用 works.ts 里的色值（打包后取不到模块，所以这里把 6 件作品的主题色抄一份做对照计算）
    const pairs = [
      ['#E9D9C3', '#7F9BB5'],
      ['#F3A6B8', '#FFD98E'],
      ['#8FB79A', '#F2E4C9'],
      ['#B9A7E0', '#3F3A55'],
      ['#3E5C86', '#C9D6E4'],
      ['#E08A5C', '#F6E3D0'],
    ];
    void mod;
    const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const mix = (a, c, t) => a.map((v, i) => v + (c[i] - v) * t);
    const clamp = (v, a, c) => Math.min(c, Math.max(a, v));

    // 复刻旧的写法：idx = round(pos)，frac = clamp(pos - idx, 0, 1)
    const oldFormula = (pos, count) => {
      const idx = Math.min(count - 1, Math.max(0, Math.round(pos)));
      const i1 = Math.min(count - 1, idx + 1);
      const frac = clamp(pos - idx, 0, 1);
      return mix(rgb(pairs[idx][0]), rgb(pairs[i1][0]), frac);
    };
    // 现在的写法：idx = floor(pos)，frac = pos - idx
    const newFormula = (pos, count) => {
      const p0 = clamp(pos, 0, count - 1);
      const i0 = Math.min(count - 1, Math.floor(p0));
      const i1 = Math.min(count - 1, i0 + 1);
      const frac = i1 === i0 ? 0 : clamp(p0 - i0, 0, 1);
      return mix(rgb(pairs[i0][0]), rgb(pairs[i1][0]), frac);
    };

    const pts = [0.35, 0.40, 0.45, 0.48, 0.49, 0.5, 0.51, 0.52, 0.55, 0.60, 0.65];
    const dist = (a, c) => Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) + Math.abs(a[2] - c[2]);
    const walk = (fn) => {
      let max = 0, at = null, prev = null, series = [];
      for (const t of pts) {
        const c = fn(t, 6).map((v) => Math.round(v));
        series.push({ t, rgb: c });
        if (prev) {
          const d = dist(prev.c, c);
          if (d > max) { max = d; at = [prev.t, t]; }
        }
        prev = { t, c };
      }
      return { max, at, series };
    };
    const o = walk(oldFormula);
    const n = walk(newFormula);
    return {
      采样点: pts,
      旧写法_最大相邻步色差: o.max,
      旧写法_跳变位置: o.at,
      新写法_最大相邻步色差: n.max,
      新写法_跳变位置: n.at,
      旧写法_序列: o.series.map((s) => s.rgb.join(',')),
      新写法_序列: n.series.map((s) => s.rgb.join(',')),
    };
  });
  R.note('round vs floor 连续性对比', cmp);

  /* ---------------- 2) 竖屏/横屏/方形舞台比例 ---------------- */
  const vctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const pv = await vctx.newPage();
  const stageFor = async (slug) => {
    await pv.goto(BASE + '/works/' + slug, { waitUntil: 'networkidle', timeout: 60000 });
    await pv.waitForTimeout(3600);
    return pv.evaluate(() => {
      const st = document.querySelector('.detail__stage');
      const r = st.getBoundingClientRect();
      const v = document.querySelector('video.detail__video');
      return {
        url: location.pathname,
        arVar: getComputedStyle(st).getPropertyValue('--ar').trim(),
        w: Math.round(r.width), h: Math.round(r.height),
        实际比例: +(r.width / r.height).toFixed(4),
        视频自身比例: v ? +(v.videoWidth / (v.videoHeight || 1)).toFixed(4) : null,
        视频渲染尺寸: v ? { w: Math.round(v.getBoundingClientRect().width), h: Math.round(v.getBoundingClientRect().height) } : null,
      };
    });
  };
  const s16 = await stageFor('salt-horizon');       // 16:9
  const s9 = await stageFor('nine-lives');          // 9:16
  const s1 = await stageFor('static-bloom');        // 1:1（无视频）
  R.note('舞台比例 · 16:9', s16);
  R.note('舞台比例 · 9:16', s9);
  R.note('舞台比例 · 1:1（无视频）', s1);
  R.note('比例是否守住（|实际-期望| < 0.02）', {
    '16:9': Math.abs(s16.实际比例 - 16 / 9) < 0.02,
    '9:16': Math.abs(s9.实际比例 - 9 / 16) < 0.02,
    '1:1': Math.abs(s1.实际比例 - 1) < 0.02,
  });
  await pv.goto(BASE + '/works/nine-lives', { waitUntil: 'networkidle' });
  await pv.waitForTimeout(3000);
  await pv.screenshot({ path: path.join(OUT, 'S1-vertical-stage.png') });

  /* ---------------- 3) 减少动态效果：uniform 全零 + 像素 A/B ---------------- */
  const rb = await b.newContext({ viewport: { width: 900, height: 640 }, reducedMotion: 'reduce' });
  const pr = await rb.newPage();
  await pr.goto(BASE + '/works', { waitUntil: 'networkidle' });
  await pr.waitForTimeout(3200);
  await pr.evaluate(() => window.__nav.jumpTo(2, { force: true }));
  await pr.waitForTimeout(1800);
  await pr.evaluate(() => window.__scene.debugFreezeTime(3.0));
  const clip = { x: 150, y: 60, width: 600, height: 600 };
  await pr.evaluate(() => window.__nav.debugPinVelocity(0));
  await pr.waitForTimeout(900);
  const rRest = await pr.evaluate(() => window.__scene.debugReadState());
  await pr.screenshot({ path: path.join(OUT, 'R-rest.png'), clip });
  await pr.evaluate(() => window.__nav.debugPinVelocity(3));
  await pr.waitForTimeout(1200);
  const rBend = await pr.evaluate(() => window.__scene.debugReadState());
  await pr.screenshot({ path: path.join(OUT, 'R-bend-requested.png'), clip });
  R.note('减少动态效果 · uniform 是否全零', {
    rest: { bend: rRest.bend, bendMag: rRest.bendMag, depth: rRest.depth, tiltY: rRest.tiltY, roll: rRest.roll, lineVel: rRest.lineVel },
    请求bend3后: { bend: rBend.bend, bendMag: rBend.bendMag, depth: rBend.depth, tiltY: rBend.tiltY, roll: rBend.roll, lineVel: rBend.lineVel },
    全零: rBend.bend === 0 && rBend.bendMag === 0 && rBend.depth === 0 && rBend.tiltY === 0 && rBend.roll === 0 && rBend.lineVel === 0,
  });

  // 普通模式同样的两帧，作为对照
  const nb = await b.newContext({ viewport: { width: 900, height: 640 } });
  const pn = await nb.newPage();
  await pn.goto(BASE + '/works', { waitUntil: 'networkidle' });
  await pn.waitForTimeout(3200);
  await pn.evaluate(() => window.__nav.jumpTo(2, { force: true }));
  await pn.waitForTimeout(1800);
  await pn.evaluate(() => window.__scene.debugFreezeTime(3.0));
  await pn.evaluate(() => window.__nav.debugPinVelocity(0));
  await pn.waitForTimeout(900);
  const nRest = await pn.evaluate(() => window.__scene.debugReadState());
  await pn.screenshot({ path: path.join(OUT, 'N-rest.png'), clip });
  await pn.evaluate(() => window.__nav.debugPinVelocity(3));
  await pn.waitForTimeout(1200);
  const nBend = await pn.evaluate(() => window.__scene.debugReadState());
  await pn.screenshot({ path: path.join(OUT, 'N-bend.png'), clip });
  R.note('普通模式 · uniform（对照）', {
    rest: { bend: nRest.bend, bendMag: nRest.bendMag, depth: nRest.depth },
    请求bend3后: { bend: nBend.bend, bendMag: nBend.bendMag, depth: nBend.depth, tiltY: nBend.tiltY, roll: nBend.roll },
    reduceBend: nRest.reduceBend,
  });

  fs.writeFileSync(path.join(OUT, 'verify-extra.json'), JSON.stringify(R.results, null, 1));
  await b.close();
  console.log('\nDONE → docs/verify/verify-extra.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
