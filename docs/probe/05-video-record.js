const { chromium } = require('C:/Users/123/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('fs');
const OUT = 'I:/xiaazai/zpj/0.001/portfolio/docs/shots/video';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/123/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  /* ---------------- 桌面完整链路 ---------------- */
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
  });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3800); // 等 preloader 收完

  // 1. 首页 → 作品（分层转场）
  await p.evaluate(() => document.querySelector('.home__cta').click());
  await p.waitForTimeout(2600);

  // 2. 横向浏览：滚轮连续切换（含累计阈值）
  await p.mouse.move(640, 400);
  for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 160); await p.waitForTimeout(950); }
  // 3. 切换中反向
  await p.mouse.wheel(0, 500);
  await p.waitForTimeout(200);
  await p.mouse.wheel(0, -500);
  await p.waitForTimeout(1700);
  // 4. 键盘切换
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(1200);
  // 5. 边界：连续往回直到头部
  for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, -400); await p.waitForTimeout(160); }
  await p.waitForTimeout(1500);
  // 6. 进入作品（封面接续 → 视频舞台），停一下
  await p.mouse.wheel(0, 700);
  await p.waitForTimeout(1000);
  await p.evaluate(() => document.querySelector('.bar-btn--play').click());
  await p.waitForTimeout(3000);
  // 7. 详情页滚动
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(220); }
  await p.waitForTimeout(900);
  // 8. 返回（恢复位置）
  await p.evaluate(() => document.querySelector('.bar-btn[aria-label="返回作品列表"]').click());
  await p.waitForTimeout(2600);
  // 9. 关于页
  await p.evaluate(() => document.querySelector('.app-header__link--about').click());
  await p.waitForTimeout(2600);
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 340); await p.waitForTimeout(230); }
  await p.waitForTimeout(700);
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, -340); await p.waitForTimeout(230); } // 反向回滚
  await p.waitForTimeout(600);
  for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 360); await p.waitForTimeout(200); }
  await p.waitForTimeout(1000);
  await ctx.close(); // 关闭时视频写盘

  /* ---------------- 手机链路 ---------------- */
  const mctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
  });
  const mp = await mctx.newPage();
  await mp.goto('http://127.0.0.1:4321/works', { waitUntil: 'networkidle' });
  await mp.waitForTimeout(3600);
  // 触屏横滑
  const swipe = async (fromX, toX, y) => {
    await mp.touchscreen.tap(200, 400).catch(() => {});
    await mp.evaluate(
      ([fx, tx, yy]) => {
        const el = document.elementFromPoint(fx, yy) || document.body;
        const mk = (type, x) => new TouchEvent(type, {
          bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: yy })],
          changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: yy })],
        });
        el.dispatchEvent(mk('touchstart', fx));
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          el.dispatchEvent(mk('touchmove', fx + ((tx - fx) * i) / steps));
        }
        el.dispatchEvent(mk('touchend', tx));
      },
      [fromX, toX, y]
    );
  };
  await swipe(300, 80, 420);
  await mp.waitForTimeout(1400);
  await swipe(300, 80, 420);
  await mp.waitForTimeout(1600);
  await swipe(80, 320, 420); // 反向
  await mp.waitForTimeout(1600);
  await mp.evaluate(() => document.querySelector('.bar-btn--play').click());
  await mp.waitForTimeout(2800);
  await mp.evaluate(() => window.scrollTo(0, 600));
  await mp.waitForTimeout(900);
  await mctx.close();

  await b.close();
  console.log('VIDEOS:', fs.readdirSync(OUT));
})().catch((e) => { console.error('FAIL', (e && e.stack) || e); process.exit(1); });
