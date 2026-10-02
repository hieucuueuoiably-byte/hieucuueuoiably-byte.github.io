# 参考站分页器源码节选（`class IQ`）

来源：<https://ponpon-mania.com/> 公开前端产物 `/_nuxt/CfE0pqJa.js`，抓取时间 2026-09-30。
**版权归原作者（Patrick Heng / Justine Soulié）所有。**

这里只截取 `docs/motion-spec.md` 与 `docs/acceptance.md` 里实际引用到的部分。
完整的方法体转储没有放进交付目录（避免夹带他人源码），放在工作区
`../_reference-scratch/archive-shots/reference-pager-class-IQ.min.txt`。
**本项目的实现是重写的**（`src/state/navController.ts`）。

---

## 1. 构造与状态（节选）

```js
class IQ {
  constructor(world, chapters) {
    this.world = world; this.chapters = chapters;
    this.targetX = 0;          // 目标位置（世界单位，负向坐标）
    this.currentX = 0;         // 渲染位置
    this.introOffset = 0;
    this.currentIndex = 0;
    this.minDistSnap = 0;
    this.velocity = { value: 0 };
    this.targetVelocity = { value: 0 };
    this.state = { lerp: 100 };        // ← 二阶阻尼的 smoothTime 默认值
    this.targetNav = 0;
    this.isTweening = false;
    this.tween = null;
    this.snapTimeout = null;
    this.maxScroll = 0;
    this.progress = 0;
    this.scrollIn = false;             // ← 入场期间的门
    this.velocityTracker = new VelocityTracker();
    this.scrollTimeout = null;
    this.mouseCoef = isMobile ? 2.5 : 1;
  }

  reset() {
    this.currentX = 0; this.currentIndex = 0; this.targetX = 0; this.targetNav = 0;
    this.velocity.value = 0; this.targetVelocity.value = 0;
    this.velocityTracker.reset();
    // 上次看的章节存在 localStorage，进来就恢复
    if (localStorage && localStorage.getItem('last-chapter')) {
      this.currentIndex = parseInt(localStorage.getItem('last-chapter') || '1') - 1;
      this.currentX = -this.chapters.albums[this.currentIndex].position.x;
      this.targetX = this.currentX;
    }
  }
  bind() {
    this.velocityTracker.reset();
    Rn.addUp(this.onKeyUp);
    J.addUp(this.onMouseUp);
    te.on('chapter-goTo', this.onChapterGoTo);
    window.addEventListener('wheel', this.onWheel);   // ← 唯一的滚轮入口
  }
}
```

## 2. 滚轮：**没有阈值、没有冷却、没有筛选**

```js
onWheel(e) {
  if (this.scrollIn) return;                    // 唯一的门：入场动画期间不理输入
  this.clearSnap();                             // 新输入打断正在进行的吸附
  this.targetX -= (e.deltaY + e.deltaX) / 400;  // deltaY 与 deltaX 相加，固定 /400 除数
}
```

**注意方向**：`targetX` 是**负向坐标**（`currentX = -albums[i].position.x`，
`progress = -targetX / maxScroll`），所以 `deltaY` 为正（往下滚）时 `progress` 变大
→ **走下一格**。本项目直接用「格」作坐标，所以对应的是 `target += delta / 常量`。

## 3. 每帧推进：二阶阻尼 + 越界顶回 + 速度追踪 + 停稳吸附

```js
update(dt, t) {
  let n = 100;
  if (J.isDown && !this.scrollIn) {                 // 指针拖拽分支
    this.clearSnap();
    let s = J.delta.x * 0.005;
    const held = Date.now() - J.downNow;
    if (J.isFromTouch && held > 130) s *= (I.width < 700 ? 3 : 1.67);
    else if (J.isFromTouch) s *= 1.4;
    this.targetX += s;
    n = 200;                                        // 拖拽时改成更"跟手"的 200
  }

  // 越界不是硬 clamp：用 smoothTime = 40 把 targetX 阻尼顶回范围内
  if (-this.targetX < 0 && !this.scrollIn) Ne(this, 'targetX', 0, 40, t);
  this.maxScroll = this.chapters.albums.at(-1).position.x;
  if (-this.targetX > this.maxScroll && !this.scrollIn) Ne(this, 'targetX', -this.maxScroll, 40, t);

  this.progress = -this.targetX / this.maxScroll;

  Ne(this.state, 'lerp', n, 100, t);                                // 阻尼参数的自身平滑
  if (!this.isTweening && !this.scrollIn) Ne(this, 'currentX', this.targetX, this.state.lerp, t);

  this.targetVelocity.value = this.velocityTracker.update(this.currentX);
  Ne(this.velocity, 'value', this.targetVelocity.value, 100, t);    // 给着色器用的速度（再平滑一层）

  this.calculateSnap();
}
```

`Ne` 是 Unity `SmoothDamp` 的写法（二阶临界阻尼，带速度记忆）：

```js
function Ne(o, key, target, smoothTime, delta, maxSpeed = Infinity) { /* omega = 2/smoothTime; … exp 近似 … */ }
```

## 4. 吸附：四组时长/缓动

```js
next(dur = 0.4, ease = 'cubic.out') { if (this.targetNav < len - 1) this.targetNav += 1; this.snap(this.targetNav, dur, ease); }
prev(dur = 0.4, ease = 'cubic.out') { if (this.targetNav > 0) this.targetNav -= 1; this.snap(this.targetNav, dur, ease); }
onChapterGoTo(e) { this.snap(e, 0.6, 'cubic.out'); }      // 点海报 / 定位点直达
clickSnap(e)     { this.snap(e, 0.6, 'cubic.out'); }
onMouseUp(e) {                                            // 轻扫换一格
  if (J.isFromTouch && Date.now() - J.downNow < 400) {
    if (J.movement.x > 30) this.prev(0.3, 'power2.out');
    else if (J.movement.x < -30) this.next(0.3, 'power2.out');
  }
}

snap(i = this.currentIndex, dur = 0.3, ease = 'power2.inOut') {
  if (this.scrollIn) return;
  if (this.snapTimeout) { clearTimeout(this.snapTimeout); this.snapTimeout = null; }
  this.tween?.kill();
  // 吸附期间 targetX 跟着 currentX 走 —— 所以中途来新输入能接着自由滚
  this.tween = gsap.to(this, {
    currentX: -this.chapters.albums[i].position.x,
    duration: dur, ease,
    onUpdate: () => { this.isTweening = true; this.targetX = this.currentX; },
    onComplete: () => this.clearSnap(),
  });
}

clearSnap() { this.targetNav = this.currentIndex; this.tween?.kill(); this.tween = null; this.isTweening = false; }

calculateSnap() {
  if (this.scrollIn) return;
  if (Math.abs(this.targetVelocity.value) < 0.1 && !J.isDown) {
    // 停稳 → snap 到最近一格；移动端竖屏用 0.3 cubic.out，否则用默认的 0.3 power2.inOut
    if (this.minDistSnap > 0.01 && !this.isTweening && !this.snapTimeout) {
      this.snapTimeout = setTimeout(() => {
        if (isMobile && W < H) this.snap(this.currentIndex, 0.3, 'cubic.out');
        else this.snap(this.currentIndex, 0.3);
        this.snapTimeout = null;
      }, 0);
    }
  } else if (this.snapTimeout) { clearTimeout(this.snapTimeout); this.snapTimeout = null; }

  // 找离 currentX 最近的专辑
  let best = 1e6;
  for (let i = 0; i < this.chapters.albums.length; i++) {
    const d = Math.abs(-this.chapters.albums[i].position.x - this.currentX);
    if (d < best) { best = d; this.currentIndex = i; }
  }
  this.minDistSnap = best;
}
```

## 5. 键盘

```js
onKeyUp(e) {
  if (this.scrollIn) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'q') this.prev();
  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'd') this.next();
  else if (e.keyCode === 13 && Math.abs(this.minDistSnap) < 0.01) te.emit('chapter-enter-pressed', this.currentIndex);
}
```

**ArrowDown 是上一格、ArrowUp 是下一格** —— 与滚动直觉相反，但这是参考站的实际映射。

## 6. 速度追踪器（`class al`）

```js
class al {
  constructor() { this.historySize = 20; this.maxVelocity = 40; /* … */ }
  update(pos) {
    const now = performance.now();
    if (this.lastTimestamp !== 0) {
      const dt = now - this.lastTimestamp, d = pos - this.lastPosition;
      if (dt > 0) {
        let v = d / dt * 1000;
        v = clamp(v, -this.maxVelocity, this.maxVelocity);
        this.velocityHistory.push(v);
        if (this.velocityHistory.length > this.historySize) this.velocityHistory.shift();
        this.velocity = avg(this.velocityHistory);       // ← 20 帧滑动平均
      }
    }
    this.lastPosition = pos; this.lastTimestamp = now;
    return this.velocity;
  }
}
```

## 7. 本项目的用法与差异

| 参考站 | 本项目 | 差异说明 |
| --- | --- | --- |
| `targetX -= (deltaY + deltaX) / 400` | `target += (deltaY + deltaX) / wheelDeltaPerStep` | 坐标系正负相反，故符号相反；`wheelDeltaPerStep = 400 × pitch`，pitch 由行为边界反推 |
| `Ne(currentX, targetX, state.lerp 100/200, dt)` | `smoothDamp(current, target, …, 100/200, dtMs)` | 同一套二阶临界阻尼公式，参数一致 |
| 越界 `Ne(targetX, 边界, 40)` | 同样 40ms | 一致 |
| 速度按"最近 20 帧"平均 | 按 **333ms 时间窗**平均（= 20 帧 @60fps） | 低帧率下按帧数取窗会让速度 2.2 秒不衰减，"停稳"判定永不满足；按时间取窗在 60fps 下等价 |
| 停稳判定 `|渲染速度| < 0.1 && minDist > 0.01` | 同样两个阈值，**外加一个 130ms 输入静默期** | 参考站的两个条件在事件间隔里就会被满足，导致每次事件的位移被立刻吸回、无法累加；静默期是语义等价的、与帧率无关的实现 |
| 吸附补间 `onUpdate: targetX = currentX` | 一致 | 中途新输入可打断并接着自由滚 |
| `localStorage['last-chapter']` | `localStorage['portfolio:last-work']` | 同一个机制 |
