/**
 * 专项：进度条聚焦时方向键只调进度、不切作品。
 *
 * 上一版脚本在按键前做了 document.body.focus()（为了 Home/End 生效），
 * 那一步把焦点从进度条上抢走了，所以测出来"路由变了、时间没变"。
 * 这里按键前先断言 activeElement 真的是进度条。
 */
const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/verify';
const EXE = 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
const ARGS = ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'];

const HOOK = () => {
  window.__keyLog = [];
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    setTimeout(() => window.__keyLog.push({ key, prevented: e.defaultPrevented }), 0);
  }, true);
};

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ARGS });
  const RESULT = {};

  for (const env of [
    { name: 'dev', url: 'http://127.0.0.1:5199' },
    { name: 'prod', url: 'http://127.0.0.1:4321' },
  ]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.addInitScript(HOOK);
    const R = {};

    await p.goto(env.url + '/works/salt-horizon', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(env.name === 'dev' ? 5500 : 3800);

    // 先用键盘点播一下，让进度有个可观察的基准
    await p.evaluate(() => document.querySelector('.bar-btn--play')?.click());
    await p.waitForTimeout(1400);
    await p.evaluate(() => document.querySelector('.bar-btn--play')?.click()); // 暂停，避免自己往前走
    await p.waitForTimeout(500);

    // 聚焦进度条
    await p.evaluate(() => document.querySelector('.bar__scrub')?.focus());
    await p.waitForTimeout(400);
    R.焦点检查 = await p.evaluate(() => {
      const a = document.activeElement;
      return {
        tag: a ? a.tagName : null,
        cls: a ? String(a.className) : null,
        role: a ? a.getAttribute('role') : null,
        tabIndex: a ? a.getAttribute('tabindex') : null,
        是进度条: !!a && a.getAttribute('role') === 'slider',
      };
    });

    const snap = async () => p.evaluate(() => {
      const v = document.querySelector('video');
      return { url: location.pathname, t: v ? +v.currentTime.toFixed(3) : null };
    });

    await p.evaluate(() => { window.__keyLog = []; });
    const before = await snap();
    const seq = ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft'];
    for (const k of seq) { await p.keyboard.press(k); await p.waitForTimeout(260); }
    await p.waitForTimeout(600);
    const after = await snap();
    const log = await p.evaluate(() => window.__keyLog);

    R.按键 = log;
    R.进度条聚焦 = {
      前: before, 后: after,
      路由未变: after.url === before.url,
      时间变了: after.t !== before.t,
      时间差: +(after.t - before.t).toFixed(3),
      全部被拦下: log.every((x) => x.prevented === true),
    };

    // 反向验证：焦点回到 body 时，←/→ 应该切作品
    await p.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
    await p.waitForTimeout(300);
    const b1 = await snap();
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(4200);
    const b2 = await snap();
    R.焦点在body时 = { 前: b1, 后: b2, 切了作品: b2.url !== b1.url };

    R.控制台错误 = [];
    p.on('pageerror', (e) => R.控制台错误.push(String(e).slice(0, 180)));
    RESULT[env.name] = R;
    console.log(`\n===== ${env.name} =====`);
    console.log(JSON.stringify(R, null, 1));
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'slider-keyboard.json'), JSON.stringify(RESULT, null, 1));
  await b.close();
  console.log('\nDONE → docs/verify/slider-keyboard.json');
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
