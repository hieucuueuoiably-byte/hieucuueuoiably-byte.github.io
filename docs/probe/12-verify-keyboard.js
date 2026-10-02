/**
 * 键盘作用域的权威判定：不看滚动位置（headless 下 Home/End 依赖焦点，会抖），
 * 而是记录每一次按键**最终有没有被 preventDefault** —— 那才是需求本身：
 *   内容页：必须 defaultPrevented === false（原生滚动不能被拦）
 *   作品页：必须 true（那一页本来不可滚动）
 *   详情页：只有 ←/→ 是 true，其余放行
 *
 * 同时探测有没有可用的硬件加速 GL 后端。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';

const HOOK = () => {
  window.__keyLog = [];
  window.addEventListener(
    'keydown',
    (e) => {
      const key = e.key;
      /*
       * 必须在**宏任务**里读 defaultPrevented。
       * 用 microtask（Promise.then）是不行的：规范规定每次监听器回调返回后都会做一次
       * microtask 检查点，所以那个 then 会在"我这条 capture 监听器跑完、应用的监听器还没跑"
       * 的瞬间执行，读到的永远是 false。
       */
      setTimeout(() => window.__keyLog.push({ key, prevented: e.defaultPrevented }), 0);
    },
    true
  );
};

const KEYS_CONTENT = ['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End', ' '];
const KEYS_WORKS = ['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Home', 'End', 'a', 'd'];

(async () => {
  const RESULT = {};

  /* ---------------- 1) 键盘作用域 ---------------- */
  const b = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  for (const env of [
    { name: 'dev', url: 'http://127.0.0.1:5199' },
    { name: 'prod', url: 'http://127.0.0.1:4321' },
  ]) {
    const R = {};
    RESULT[env.name] = R;
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.addInitScript(HOOK);
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));

    const press = async (keys) => {
      await p.evaluate(() => { window.__keyLog = []; });
      await p.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
      for (const k of keys) {
        await p.keyboard.press(k);
        await p.waitForTimeout(120);
      }
      await p.waitForTimeout(400);
      return p.evaluate(() => window.__keyLog);
    };
    const summarize = (log) => {
      const m = {};
      for (const { key, prevented } of log) {
        if (!(key in m)) m[key] = prevented;
      }
      return m;
    };

    /* 关于页 */
    await p.goto(env.url + '/about', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(3600);
    R.关于页 = summarize(await press(KEYS_CONTENT));
    R.关于页_全部放行 = Object.values(R.关于页).every((v) => v === false);

    /* 详情页 */
    await p.goto(env.url + '/works/salt-horizon', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3800);
    R.详情页 = summarize(await press(['PageDown', 'ArrowDown', 'PageUp', 'ArrowUp', 'Home', 'End', ' ', 'ArrowLeft', 'ArrowRight']));
    R.详情页_上下与翻页放行 =
      R.详情页.PageDown === false && R.详情页.ArrowDown === false &&
      R.详情页.PageUp === false && R.详情页.ArrowUp === false &&
      R.详情页.Home === false && R.详情页.End === false && R.详情页[' '] === false;
    R.详情页_左右被接管 = R.详情页.ArrowLeft === true && R.详情页.ArrowRight === true;

    /* 详情页 + 进度条聚焦 */
    await p.evaluate(() => document.querySelector('.bar__scrub')?.focus());
    await p.waitForTimeout(400);
    const beforeUrl = p.url();
    const beforeT = await p.evaluate(() => { const v = document.querySelector('video'); return v ? +v.currentTime.toFixed(2) : null; });
    R.进度条聚焦 = summarize(await press(['ArrowRight', 'ArrowRight', 'ArrowLeft']));
    const afterUrl = p.url();
    const afterT = await p.evaluate(() => { const v = document.querySelector('video'); return v ? +v.currentTime.toFixed(2) : null; });
    R.进度条聚焦_只调进度 = { 路由未变: afterUrl === beforeUrl, 时间变了: afterT !== beforeT, 前: beforeT, 后: afterT };

    /* 作品页 */
    await p.goto(env.url + '/works', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3800);
    const sel0 = await p.evaluate(() => window.__nav.getSnapshot().selectedIndex);
    R.作品页 = summarize(await press(KEYS_WORKS));
    const sel1 = await p.evaluate(() => window.__nav.getSnapshot().selectedIndex);
    R.作品页_全部被接管 = Object.values(R.作品页).every((v) => v === true);
    R.作品页_键盘换了作品 = { 前: sel0, 后: sel1, 变了: sel0 !== sel1 };

    R.控制台错误 = errs;
    console.log(`\n===== ${env.name} =====`);
    console.log(JSON.stringify(R, null, 1));
    await ctx.close();
  }
  await b.close();

  /* ---------------- 2) 硬件加速探测 ---------------- */
  const probes = [];
  for (const [label, args] of [
    ['swiftshader（软件，当前默认）', ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']],
    ['d3d11（尝试硬件）', ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']],
    ['默认（不指定后端）', ['--ignore-gpu-blocklist']],
    ['gl（直通）', ['--use-gl=desktop', '--ignore-gpu-blocklist']],
  ]) {
    let info = null;
    try {
      const bb = await chromium.launch({ headless: true, executablePath: EXE, args });
      const pp = await (await bb.newContext({ viewport: { width: 800, height: 600 } })).newPage();
      await pp.goto('data:text/html,<canvas id=c></canvas>');
      info = await pp.evaluate(() => {
        const c = document.getElementById('c');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return { ok: false };
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          ok: true,
          version: gl.getParameter(gl.VERSION),
          vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '(no dbg ext)',
          renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '(no dbg ext)',
        };
      });
      await bb.close();
    } catch (e) {
      info = { ok: false, error: String(e).slice(0, 160) };
    }
    probes.push({ label, args, info });
    console.log('GL', label, JSON.stringify(info));
  }
  RESULT.GL探测 = probes;

  fs.writeFileSync(path.join(OUT, 'keyboard-and-gl.json'), JSON.stringify(RESULT, null, 1));
  console.log('\nDONE → docs/verify/keyboard-and-gl.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
