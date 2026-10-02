# -*- coding: utf-8 -*-
"""
量取首页素材各图层的 alpha 包围盒与云层上沿轮廓。

用途：把「中间角色初始定位」「标题的留白区域」「按钮可放的中下方」
这些原本靠肉眼估的位置，换成像素测量值，避免反复试。

alpha 阈值取 40：生成工具导出的透明层在整幅画布上有极淡的 alpha 噪点（1–20），
用 `getbbox()`（threshold 0）量出来的包围盒就是整幅画布，没有参考价值。

输出：控制台 + docs/verify/home-asset-bounds.json
"""
import json
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'public', 'assets', 'home')
OUT = os.path.join(ROOT, 'docs', 'verify', 'home-asset-bounds.json')

FILES = [
    'background.png',
    'character-left.png',
    'character-center-v2.png',
    'character-right.png',
    'foreground-clouds.png',
]

TH = 40  # alpha 阈值

report = {}


def solid_bbox(a, th=TH):
    """alpha > th 的紧包围盒"""
    mask = a.point(lambda v: 255 if v > th else 0)
    return mask.getbbox()


def col_profile(a, th=TH, steps=20, axis='x'):
    """沿 x（或 y）取若干条线，给出"第一个/最后一个实心像素"的位置"""
    W, H = a.size
    px = a.load()
    out = []
    n = steps
    if axis == 'x':
        for i in range(n + 1):
            x = min(W - 1, int(W * i / n))
            first = last = None
            for y in range(H):
                if px[x, y] > th:
                    if first is None:
                        first = y
                    last = y
            out.append({'pct': round(i * 100 / n, 2), 'first': first, 'last': last})
    else:
        for i in range(n + 1):
            y = min(H - 1, int(H * i / n))
            first = last = None
            for x in range(W):
                if px[x, y] > th:
                    if first is None:
                        first = x
                    last = x
            out.append({'pct': round(i * 100 / n, 2), 'first': first, 'last': last})
    return out


for name in FILES:
    path = os.path.join(SRC, name)
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    a = im.getchannel('A')
    bb = solid_bbox(a)
    item = {'file': name, 'size': [W, H], 'alphaThreshold': TH,
            'bytes': os.path.getsize(path)}
    if bb:
        x0, y0, x1, y1 = bb
        item['bbox'] = {
            'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1,
            'x0pct': round(x0 / W * 100, 2), 'y0pct': round(y0 / H * 100, 2),
            'x1pct': round(x1 / W * 100, 2), 'y1pct': round(y1 / H * 100, 2),
            'wpct': round((x1 - x0) / W * 100, 2),
            'hpct': round((y1 - y0) / H * 100, 2),
        }
    item['colProfile'] = col_profile(a)   # 每 5% 宽度：该列的实心像素上下界
    report[name] = item

# 逐行：标题区（上方中间）与按钮区（中下方）在各列的实心像素下界 / 上界
print('%-24s %-46s %s' % ('file', 'bbox (solid alpha>40)', 'size'))
for name in FILES:
    it = report[name]
    bb = it.get('bbox')
    s = ''
    if bb:
        s = 'x %6.2f%%..%6.2f%%  y %6.2f%%..%6.2f%%  (%5.2f%% x %5.2f%%)' % (
            bb['x0pct'], bb['x1pct'], bb['y0pct'], bb['y1pct'], bb['wpct'], bb['hpct'])
    print('%-24s %-46s %dx%d' % (name, s, it['size'][0], it['size'][1]))

print()
for name in ['character-left.png', 'character-center-v2.png', 'character-right.png']:
    prof = report[name]['colProfile']
    print(name, '每列实心像素 [first, last] 占画布高 %:')
    for p in prof:
        if p['first'] is None:
            continue
        print('   x=%5.1f%%  first=%5.1f%%  last=%5.1f%%' % (
            p['pct'], p['first'] / 941 * 100, p['last'] / 941 * 100))
    print()

clouds = report['foreground-clouds.png']['colProfile']
print('云层每列上沿占画布高 %:', [None if p['first'] is None else round(p['first'] / 941 * 100, 1) for p in clouds])

# 合成图的对照：把前三层 + 云层按 1:1 叠加，看和 hero-preview 差多少
comp = Image.new('RGBA', (1672, 941), (0, 0, 0, 0))
for name in FILES:
    comp = Image.alpha_composite(comp, Image.open(os.path.join(SRC, name)).convert('RGBA'))
comp.convert('RGB').save(os.path.join(OUT.replace('.json', '-stack-1to1.png')))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print()
print('WROTE', OUT)
