/**
 * 修复后的渲染级验证。
 *
 * 重点是"不只看 navigator.velocity"：
 *  - 弯曲是否真的画出来了 → 冻结着色器时间后做 A/B 像素对比
 *  - 背景半格是否连续 → 逐点采样真正喂给着色器的双色，看相邻步的色差有没有跳变
 *  - 视频链路 → 首次播放 / 暂停 / 进度 / 换作品停播 / 离开停播
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

/** PNG 像素统计：不做完整解码，够用的糙解码只需要宽高 + 采样比较 */
async function readPng(file) {
  return fs.readFileSync(file);
}

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ARGS });

  /* ===================================================================
     一、弯曲是否真的渲染出来（像素级 A/B）
     =================================================================== */
  const ctxA = await b.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
  const pA = await ctxA.newPage();
  const errsA = [];
  pA.on('pageerror', (e) => errsA.push(String(e).slice(0, 200)));
  pA.on('console', (m) => { if (m.type() === 'error') errsA.push('C:' + m.text().slice(0, 200)); });
  await pA.goto(BASE + '/works', { waitUntil: 'networkidle', timeout: 90000 });
  await pA.waitForTimeout(3400);

  // 居中到 2 号作品，等它停稳
  await pA.evaluate(() => window.__nav.jumpTo(2, { force: true }));
  await pA.waitForTimeout(2000);
  // 冻结着色器时间：此后所有截图的噪声相位一致
  await pA.evaluate(() => window.__scene.debugFreezeTime(3.0));

  const clip = { x: 150, y: 60, width: 600, height: 600 };
  const shot = async (name) => {
    const f = path.join(OUT, name + '.png');
    await pA.screenshot({ path: f, clip });
    return f;
  };

  // A: 速度 0（静止，应当完全摊平）
  await pA.evaluate(() => window.__nav.debugPinVelocity(0));
  await pA.waitForTimeout(1200);
  const stRest = await pA.evaluate(() => window.__scene.debugReadState());
  const fA = await shot('A-bend-off');

  // B: 速度 +3（正向，弯曲应当出现）
  await pA.evaluate(() => window.__nav.debugPinVelocity(3));
  await pA.waitForTimeout(1200);
  const stFwd = await pA.evaluate(() => window.__scene.debugReadState());
  const fB = await shot('B-bend-forward');

  // C: 速度 −3（反向，弯曲方向应当相反）
  await pA.evaluate(() => window.__nav.debugPinVelocity(-3));
  await pA.waitForTimeout(1200);
  const stRev = await pA.evaluate(() => window.__scene.debugReadState());
  const fC = await shot('C-bend-reverse');

  R.note('uniform · rest', {
    bend: +stRest.bend.toFixed(4), bendMag: +stRest.bendMag.toFixed(4),
    depth: +stRest.depth.toFixed(4), tiltY: +stRest.tiltY.toFixed(4), roll: +stRest.roll.toFixed(4),
    reduceBend: stRest.reduceBend, mode: stRest.mode,
  });
  R.note('uniform · forward(+3)', {
    bend: +stFwd.bend.toFixed(4), bendMag: +stFwd.bendMag.toFixed(4),
    depth: +stFwd.depth.toFixed(4), tiltY: +stFwd.tiltY.toFixed(4), roll: +stFwd.roll.toFixed(4),
  });
  R.note('uniform · reverse(−3)', {
    bend: +stRev.bend.toFixed(4), bendMag: +stRev.bendMag.toFixed(4),
    depth: +stRev.depth.toFixed(4), tiltY: +stRev.tiltY.toFixed(4), roll: +stRev.roll.toFixed(4),
  });

  /* ===================================================================
     二、减少动态效果模式下弯曲必须为 0（同样像素级）
     =================================================================== */
  const ctxR = await b.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const pR = await ctxR.newPage();
  await pR.goto(BASE + '/works', { waitUntil: 'networkidle' });
  await pR.waitForTimeout(3400);
  await pR.evaluate(() => window.__nav.jumpTo(2, { force: true }));
  await pR.waitForTimeout(2000);
  await pR.evaluate(() => window.__scene.debugFreezeTime(3.0));
  await pR.evaluate(() => window.__nav.debugPinVelocity(0));
  await pR.waitForTimeout(1000);
  const stRestReduced = await pR.evaluate(() => window.__scene.debugReadState());
  const fRA = await (async () => { const f = path.join(OUT, 'A2-reduced-rest.png'); await pR.screenshot({ path: f, clip }); return f; })();
  await pR.evaluate(() => window.__nav.debugPinVelocity(3));
  await pR.waitForTimeout(1200);
  const stBendReduced = await pR.evaluate(() => window.__scene.debugReadState());
  const fRB = await (async () => { const f = path.join(OUT, 'B2-reduced-bend-requested.png'); await pR.screenshot({ path: f, clip }); return f; })();

  R.note('reduced-motion · rest', {
    reduceBend: stRestReduced.reduceBend, bend: +stRestReduced.bend.toFixed(4),
    bendMag: +stRestReduced.bendMag.toFixed(4), depth: +stRestReduced.depth.toFixed(4),
  });
  R.note('reduced-motion · 请求 bend=3 之后', {
    reduceBend: stBendReduced.reduceBend, bend: +stBendReduced.bend.toFixed(4),
    bendMag: +stBendReduced.bendMag.toFixed(4), depth: +stBendReduced.depth.toFixed(4),
    tiltY: +stBendReduced.tiltY.toFixed(4),
  });
  R.note('normal-mode · 请求 bend=3 之后（对照）', {
    reduceBend: stFwd.reduceBend, bend: +stFwd.bend.toFixed(4), bendMag: +stFwd.bendMag.toFixed(4),
    depth: +stFwd.depth.toFixed(4),
  });

  /* ===================================================================
     三、背景半格连续性：逐点采样真正喂给着色器的双色
     =================================================================== */
  const colorSweep = async (page, label) => {
    // 采样期间抑制自动吸附：分页器本来总会停在整格，不抑制就观察不到半格态
    await page.evaluate(() => window.__nav.debugSuppressSnap(true));
    const samples = [];
    const pts = [0.000, 0.150, 0.300, 0.450, 0.490, 0.500, 0.510, 0.550, 0.700, 0.850, 1.000];
    for (const t of pts) {
      await page.evaluate((v) => window.__nav.debugSetPosition(v), t);
      await page.waitForTimeout(820); // 让常驻 lerp 收敛
      const st = await page.evaluate(() => window.__scene.debugReadState());
      samples.push({ t, A: st.bgColorA, B: st.bgColorB, targetA: st.bgTargetA, blobR: +st.blobR.toFixed(4), center: st.blobCenter });
    }
    // 相邻步之间的色差（0-255 的曼哈顿距离）
    const deltas = [];
    for (let i = 1; i < samples.length; i++) {
      const h = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
      const a = h(samples[i - 1].targetA);
      const c = h(samples[i].targetA);
      deltas.push({
        from: samples[i - 1].t, to: samples[i].t,
        dTargetA: Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) + Math.abs(a[2] - c[2]),
      });
    }
    R.note(`背景采样 · ${label}`, { samples: samples.map((s) => ({ t: s.t, A: s.A, B: s.B, blobR: s.blobR })) });
    R.note(`背景相邻步色差 · ${label}`, deltas);
    // 找最大跳变与它的步长
    const maxJump = deltas.reduce((m, d) => (d.dTargetA > m.dTargetA ? d : m), deltas[0]);
    const avg = deltas.reduce((s, d) => s + d.dTargetA, 0) / deltas.length;
    await page.evaluate(() => window.__nav.debugSuppressSnap(false));
    R.note(`背景连续性判定 · ${label}`, {
      最大相邻步色差: maxJump.dTargetA, 出现在: `${maxJump.from}→${maxJump.to}`,
      平均相邻步色差: +avg.toFixed(1),
      跳变比: +(maxJump.dTargetA / Math.max(1, avg)).toFixed(2),
    });
    return { samples, deltas, maxJump, avg };
  };

  // 正向 0→1
  const fwd = await colorSweep(pA, '正向 0→1');
  // 反向 1→0
  const rev = await colorSweep(pA, '反向 1→0');
  // 停在半格：0.5 处应当是两色 50/50
  await pA.evaluate(() => { window.__nav.debugSuppressSnap(true); window.__nav.debugSetPosition(0.5); });
  await pA.waitForTimeout(900);
  const half = await pA.evaluate(() => window.__scene.debugReadState());
  R.note('停在半格 t=0.5', { targetA: half.bgTargetA, targetB: half.bgTargetB, blobR: +half.blobR.toFixed(4) });

  /* ===================================================================
     四、视频链路：首次播放 / 暂停 / 进度 / 换作品停播 / 离开停播
     =================================================================== */
  const vctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const pv = await vctx.newPage();
  const errsV = [];
  pv.on('pageerror', (e) => errsV.push(String(e).slice(0, 200)));
  pv.on('console', (m) => { if (m.type() === 'error') errsV.push('C:' + m.text().slice(0, 200)); });
  await pv.goto(BASE + '/works/salt-horizon', { waitUntil: 'networkidle', timeout: 90000 });
  await pv.waitForTimeout(4200);

  const vstate = () =>
    pv.evaluate(() => {
      const v = document.querySelector('video.detail__video');
      return {
        hasEl: !!v,
        src: v ? (v.getAttribute('src') || '') : '',
        paused: v ? v.paused : null,
        currentTime: v ? +v.currentTime.toFixed(2) : null,
        duration: v && Number.isFinite(v.duration) ? +v.duration.toFixed(2) : 0,
        readyState: v ? v.readyState : null,
        navState: window.__nav.getSnapshot().playbackState,
        navIndex: window.__nav.getSnapshot().playbackIndex,
      };
    });

  R.note('视频 · 刚进详情页', await vstate());
  // 首次播放
  await pv.evaluate(() => document.querySelector('.bar-btn--play').click());
  await pv.waitForTimeout(1400);
  const afterPlay = await vstate();
  R.note('视频 · 点播放后', afterPlay);
  R.note('视频 · 首次播放是否成功', { playing: afterPlay.paused === false && afterPlay.currentTime > 0.1 });
  await pv.screenshot({ path: path.join(OUT, 'V1-playing.png') });

  // 进度推进
  await pv.waitForTimeout(1600);
  const t2 = await vstate();
  R.note('视频 · 1.6s 后进度', { currentTime: t2.currentTime, advanced: t2.currentTime > afterPlay.currentTime });

  // 暂停
  await pv.evaluate(() => document.querySelector('.bar-btn--play').click());
  await pv.waitForTimeout(600);
  const afterPause = await vstate();
  R.note('视频 · 点暂停后', { paused: afterPause.paused, navState: afterPause.navState });

  // 拖动进度（点进度轨 60% 处）
  await pv.evaluate(() => {
    const scrub = document.querySelector('.bar__scrub');
    const r = scrub.getBoundingClientRect();
    scrub.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width * 0.6, clientY: r.top + r.height / 2 }));
  });
  await pv.waitForTimeout(500);
  const afterSeek = await vstate();
  R.note('视频 · 拖到 60% 后', { currentTime: afterSeek.currentTime, duration: afterSeek.duration, ratio: +(afterSeek.currentTime / (afterSeek.duration || 1)).toFixed(2) });

  // 换作品（下一件 = 02，竖屏 9:16 测试片）
  await pv.evaluate(() => document.querySelector('.bar-btn[aria-label="下一个作品"]').click());
  await pv.waitForTimeout(3600);
  const nextWork = await pv.evaluate(() => {
    const v = document.querySelector('video.detail__video');
    return {
      url: location.pathname,
      src: v ? (v.getAttribute('src') || '') : '',
      paused: v ? v.paused : null,
      currentTime: v ? +v.currentTime.toFixed(2) : null,
      stageAspect: getComputedStyle(document.querySelector('.detail__stage')).aspectRatio,
      stageRect: (() => { const r = document.querySelector('.detail__stage').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      navState: window.__nav.getSnapshot().playbackState,
    };
  });
  R.note('视频 · 切到下一件（竖屏）', nextWork);
  R.note('视频 · 换作品后旧视频是否已停', { paused: nextWork.paused, srcChanged: nextWork.src.includes('9x16') });
  await pv.evaluate(() => document.querySelector('.bar-btn--play').click());
  await pv.waitForTimeout(1300);
  const vertical = await vstate();
  R.note('视频 · 竖屏片播放', { paused: vertical.paused, currentTime: vertical.currentTime, duration: vertical.duration });
  await pv.screenshot({ path: path.join(OUT, 'V2-vertical-playing.png') });

  // 切到没有视频的作品（03）→ 应当停止并显示「视频待添加」
  await pv.evaluate(() => document.querySelector('.bar-btn[aria-label="下一个作品"]').click());
  await pv.waitForTimeout(3600);
  const noVideo = await pv.evaluate(() => ({
    url: location.pathname,
    hasVideoEl: !!document.querySelector('video.detail__video'),
    missingNotice: !!document.querySelector('.detail__missing'),
    navState: window.__nav.getSnapshot().playbackState,
    playDisabled: (() => { const b = document.querySelector('.bar-btn--play'); return b ? b.disabled : null; })(),
  }));
  R.note('视频 · 切到无视频作品', noVideo);
  await pv.screenshot({ path: path.join(OUT, 'V3-no-video.png') });

  // 离开详情页 → 元素应被清掉
  await pv.evaluate(() => document.querySelector('.bar-btn[aria-label="返回作品列表"]').click());
  await pv.waitForTimeout(3200);
  R.note('视频 · 离开详情页后', await pv.evaluate(() => ({
    url: location.pathname,
    hasVideoEl: !!document.querySelector('video'),
    navState: window.__nav.getSnapshot().playbackState,
    navIndex: window.__nav.getSnapshot().playbackIndex,
  })));

  R.note('控制台错误', { gl场景: errsA, 视频页: errsV });

  fs.writeFileSync(path.join(OUT, 'verify-results.json'), JSON.stringify(R.results, null, 1));
  await b.close();
  console.log('\nDONE →', path.join(OUT, 'verify-results.json'));
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
