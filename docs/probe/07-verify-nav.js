/**
 * 验证重写后的横移机制是否复现参考站的三条关键观测：
 *   ① 单次 120 不动（位移 < 半格 → snap 吸回）
 *   ② 5×120 走一格
 *   ③ 3×(−120) 退回一格
 * 外加：按钮的 snap 时长/缓动、键盘方向、越界顶回、速度曲线、localStorage 恢复。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';
const BASE = 'http://127.0.0.1:4321';
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
const ARGS = ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'];

const R = { results: [], note: (k, v) => { R.results.push({ k, v }); console.log('• ' + k + ' :: ' + JSON.stringify(v)); } };

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ARGS });

  const fresh = async () => {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.goto(BASE + '/works', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(3400);
    await p.evaluate(() => { localStorage.removeItem('portfolio:last-work'); window.__nav.snapInstant(0); });
    await p.waitForTimeout(1200);
    await p.mouse.move(640, 400);
    return p;
  };

  const state = (p) => p.evaluate(() => {
    const s = window.__nav.getSnapshot();
    const d = window.__nav.debugReadNav();
    return {
      sel: s.selectedIndex,
      target: +d.target.toFixed(4),
      current: +d.current.toFixed(4),
      vel: +d.vel.toFixed(3),
      snapping: d.snapping,
    };
  });

  const wheelSeq = async (p, deltas, gap = 60) => {
    for (let i = 0; i < deltas.length; i++) {
      await p.mouse.wheel(0, deltas[i]);
      if (i < deltas.length - 1) await p.waitForTimeout(gap);
    }
    await p.waitForTimeout(2000);
  };

  /* ① 单次 120 */
  {
    const p = await fresh();
    await wheelSeq(p, [120]);
    R.note('① 单次 120 → 应不动', await state(p));
    await p.close();
  }
  /* ② 5×120 */
  {
    const p = await fresh();
    await wheelSeq(p, [120, 120, 120, 120, 120]);
    R.note('② 5×120 → 应前进 1 格', await state(p));
    await p.close();
  }
  /* ③ 3×(−120) */
  {
    const p = await fresh();
    await p.evaluate(() => window.__nav.snapInstant(2));
    await p.waitForTimeout(900);
    await p.mouse.move(640, 400);
    await wheelSeq(p, [-120, -120, -120]);
    R.note('③ 从 2 起 3×(−120) → 应退回 1 格', await state(p));
    await p.close();
  }
  /* ④ 连续大滚：是否会连跳多格（说明是连续自由滚动，不是"一次一格"） */
  {
    const p = await fresh();
    await wheelSeq(p, [600, 600], 80);
    R.note('④ 2×600（=2.5 格位移）→ 应前进约 2–3 格', await state(p));
    await p.close();
  }
  /* ⑤ 按钮 snap：0.4s cubic.out 的时长与轨迹 */
  {
    const p = await fresh();
    await p.evaluate(() => window.__nav.snapInstant(0));
    await p.waitForTimeout(900);
    const trace = p.evaluate(() => new Promise((res) => {
      const out = [];
      const t0 = performance.now();
      const tick = () => {
        const d = window.__nav.debugReadNav();
        out.push([+(performance.now() - t0).toFixed(0), +d.current.toFixed(4), +d.vel.toFixed(3), d.snapping]);
        if (performance.now() - t0 < 900) requestAnimationFrame(tick); else res(out);
      };
      requestAnimationFrame(tick);
    }));
    await p.evaluate(() => window.__nav.step(1));
    const tr = await trace;
    fs.writeFileSync(OUT + '/snap-step-trace.json', JSON.stringify(tr));
    const settled = tr.find((x) => Math.abs(x[1] - 1) < 0.002);
    const peakV = Math.max(...tr.map((x) => Math.abs(x[2])));
    R.note('⑤ 按钮切一格 · 轨迹', {
      采样帧数: tr.length,
      到达目标耗时ms: settled ? settled[0] : '未在 900ms 内到达',
      峰值速度: +peakV.toFixed(2),
      结束状态: tr[tr.length - 1],
    });
    await p.close();
  }
  /* ⑥ 键盘方向（参考站：ArrowDown=上一格 / ArrowUp=下一格） */
  {
    const p = await fresh();
    await p.evaluate(() => window.__nav.snapInstant(2));
    await p.waitForTimeout(900);
    await p.keyboard.press('ArrowDown');
    await p.waitForTimeout(1100);
    const afterDown = (await state(p)).sel;
    await p.keyboard.press('ArrowUp');
    await p.waitForTimeout(1100);
    const afterUp = (await state(p)).sel;
    await p.keyboard.press('ArrowLeft');
    await p.waitForTimeout(1100);
    const afterLeft = (await state(p)).sel;
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(1100);
    const afterRight = (await state(p)).sel;
    R.note('⑥ 键盘映射', {
      起始: 2,
      ArrowDown: afterDown, ArrowUp: afterUp, ArrowLeft: afterLeft, ArrowRight: afterRight,
      与参考站一致: afterDown === 1 && afterUp === 2 && afterLeft === 1 && afterRight === 2,
    });
    await p.close();
  }
  /* ⑦ 越界顶回：大幅越过末格后应被阻尼顶回并停在末格 */
  {
    const p = await fresh();
    await p.evaluate(() => window.__nav.snapInstant(5));
    await p.waitForTimeout(900);
    await p.mouse.move(640, 400);
    const peak = p.evaluate(() => new Promise((res) => {
      let mx = 0;
      const t0 = performance.now();
      const tick = () => {
        const d = window.__nav.debugReadNav();
        if (d.target > mx) mx = d.target;
        if (performance.now() - t0 < 1800) requestAnimationFrame(tick);
        else res({ 目标位置最大越界值: +mx.toFixed(4), 末帧: { target: +d.target.toFixed(4), current: +d.current.toFixed(4) } });
      };
      requestAnimationFrame(tick);
    }));
    await p.mouse.wheel(0, 1500);
    const pk = await peak;
    await p.waitForTimeout(600);
    R.note('⑦ 越界顶回（末格再往前滚）', { ...pk, 最终: await state(p) });
    await p.close();
  }
  /* ⑧ 首格反向越界 */
  {
    const p = await fresh();
    await p.evaluate(() => window.__nav.snapInstant(0));
    await p.waitForTimeout(900);
    await p.mouse.move(640, 400);
    await p.mouse.wheel(0, -1500);
    await p.waitForTimeout(1600);
    R.note('⑧ 首格再往回滚 → 应停在 0', await state(p));
    await p.close();
  }
  /* ⑨ localStorage 恢复 */
  {
    const p = await fresh();
    await p.evaluate(() => { window.__nav.snapInstant(3); window.__nav.remember(); });
    await p.waitForTimeout(900);
    const ls = await p.evaluate(() => localStorage.getItem('portfolio:last-work'));
    await p.goto(BASE + '/works', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3600);
    const restored = await state(p);
    R.note('⑨ 刷新后恢复上次看的那一件', { localStorage: ls, 恢复后: restored, 正确: restored.sel === 3 });
    await p.close();
  }
  /* ⑩ 切换作品时的速度与弯曲强度（验证弯曲确实随速度变化） */
  {
    const p = await fresh();
    await p.evaluate(() => window.__nav.snapInstant(0));
    await p.waitForTimeout(900);
    await p.mouse.move(640, 400);
    const trace = p.evaluate(() => new Promise((res) => {
      const out = [];
      const t0 = performance.now();
      const tick = () => {
        const d = window.__nav.debugReadNav();
        const st = window.__scene?.debugReadState?.();
        out.push([+(performance.now() - t0).toFixed(0), +d.vel.toFixed(3), st ? +st.bendMag.toFixed(3) : null, st ? +st.bend.toFixed(4) : null]);
        if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res(out);
      };
      requestAnimationFrame(tick);
    }));
    for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(60); }
    const tr = await trace;
    fs.writeFileSync(OUT + '/speed-vs-bend-trace.json', JSON.stringify(tr));
    const maxV = Math.max(...tr.map((x) => Math.abs(x[1])));
    const maxBendMag = Math.max(...tr.map((x) => x[2] ?? 0));
    const bendAtMaxV = tr.filter((x) => Math.abs(x[1]) > maxV * 0.9).map((x) => x[3])[0];
    const sign = tr.filter((x) => x[3] != null && Math.abs(x[3]) > 0.001).map((x) => Math.sign(x[3]));
    R.note('⑩ 速度 ↔ 弯曲强度', {
      峰值速度: +maxV.toFixed(2), 峰值bendMag: +maxBendMag.toFixed(3),
      峰值速度时的bend: bendAtMaxV,
      弯曲方向: [...new Set(sign)],
    });
    await p.close();
  }

  fs.writeFileSync(OUT + '/nav-mechanism.json', JSON.stringify(R.results, null, 1));
  await b.close();
  console.log('\nDONE → docs/verify/nav-mechanism.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
