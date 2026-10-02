# -*- coding: utf-8 -*-
"""
校验「五个图层 + README 给的中间角色 transform」是否等价于 hero-preview.png。

README 只说"中间角色仍略大，可从下列定位开始校准"，给的是
  transform-origin: 0 0; translate(5.4%, 10%) scale(.85)
这句到底对不对，直接用像素比对判定，不用靠肉眼在浏览器里来回试。

输出：docs/verify/home-stack-check.png（左：逐层合成；右：素材包预览；下：差值放大）
     + 控制台给出平均绝对误差与最优缩放搜索。
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'public', 'assets', 'home')
OUT = os.path.join(ROOT, 'docs', 'verify')

W, H = 1672, 941
PREVIEW = os.path.join(ROOT, '..', 'homepage-assets', 'hero-preview.png')


def load(name):
    return Image.open(os.path.join(SRC, name)).convert('RGBA')


def place_center(img, tx_pct, ty_pct, k):
    """模拟 transform-origin:0 0; translate(tx,ty) scale(k)"""
    # 先按 k 缩放整幅画布
    nw, nh = int(round(W * k)), int(round(H * k))
    scaled = img.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.paste(scaled, (int(round(W * tx_pct / 100)), int(round(H * ty_pct / 100))), scaled)
    return canvas


def compose(tx, ty, k):
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out = Image.alpha_composite(out, load('background.png'))
    out = Image.alpha_composite(out, load('character-left.png'))
    out = Image.alpha_composite(out, place_center(load('character-center-v2.png'), tx, ty, k))
    out = Image.alpha_composite(out, load('character-right.png'))
    out = Image.alpha_composite(out, load('foreground-clouds.png'))
    return out.convert('RGB')


ref = Image.open(PREVIEW).convert('RGB')
if ref.size != (W, H):
    ref = ref.resize((W, H), Image.LANCZOS)
ra = np.asarray(ref, dtype=np.float32)


def mae(img):
    a = np.asarray(img, dtype=np.float32)
    return float(np.abs(a - ra).mean())


base = compose(5.4, 10.0, 0.85)
print('README 给定的 transform(5.4%%,10%%,0.85) → MAE %.2f' % mae(base))

# 局部搜索：让中间角色对齐到最佳
best = (mae(base), 5.4, 10.0, 0.85)
for k in [0.78, 0.80, 0.82, 0.84, 0.85, 0.86, 0.88, 0.90, 0.92]:
    for tx in [4.0, 4.7, 5.4, 6.1, 6.8]:
        for ty in [8.0, 9.0, 10.0, 11.0, 12.0]:
            m = mae(compose(tx, ty, k))
            if m < best[0]:
                best = (m, tx, ty, k)
print('最佳搜索：MAE %.2f @ tx=%.1f%% ty=%.1f%% k=%.2f' % best)

final = compose(best[1], best[2], best[3])
sheet = Image.new('RGB', (W, H * 2), (18, 18, 18))
sheet.paste(final, (0, 0))
sheet.paste(ref, (0, H))
sheet.save(os.path.join(OUT, 'home-stack-check.png'))

diff = Image.fromarray(
    np.clip(np.abs(np.asarray(final, np.float32) - ra) * 3.0, 0, 255).astype(np.uint8)
)
diff.save(os.path.join(OUT, 'home-stack-diff.png'))
print('WROTE home-stack-check.png / home-stack-diff.png')
