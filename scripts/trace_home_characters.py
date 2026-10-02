"""Convert the approved character drawing into editable vector curve data.

Source pixels are only used offline as a drawing reference. The webpage paints
solid Path2D color shapes, with no raster character or runtime alpha mask.
Small disconnected ink crumbs and enclosed sub-pixel holes are removed before
tracing; broad negative spaces between arms/legs stay open.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src' / 'data' / 'home-character-paths.json'
REVIEW = ROOT / 'docs' / 'home-code-redraw'
REVIEW.mkdir(parents=True, exist_ok=True)
cv2.setRNGSeed(71)
PALETTES = {
    'director': ['#25212d','#fff0cf','#fa7d0a','#f12736','#ffad79','#ffd075','#45324f'],
    'octopus': ['#25212d','#b67fea','#955ac6','#fff0cf','#ffcf45','#f497bc','#006073','#03404b'],
    'bird': ['#25212d','#9bd78a','#71b77b','#ffc844','#fff0cf','#b880e4','#8151ab','#294a56','#4c6f77','#b09b86','#827469','#f12736'],
}
BASE = {'director':'#fff0cf','octopus':'#b67fea','bird':'#9bd78a'}

def contour_path(contour, epsilon=.6):
    points = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
    if len(points) < 3:
        return ''
    mid = (points[-1] + points[0]) / 2
    def n(v):
        return str(int(v)) if float(v).is_integer() else f'{v:.1f}'
    data = [f'M{n(mid[0])} {n(mid[1])}']
    for index, point in enumerate(points):
        next_mid = (point + points[(index + 1) % len(points)]) / 2
        data.append(f'Q{n(point[0])} {n(point[1])} {n(next_mid[0])} {n(next_mid[1])}')
    return ''.join(data) + 'Z'

def paths_for(mask, epsilon=.6, minimum=3):
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return ''
    result = []
    for index, contour in enumerate(contours):
        if hierarchy[0,index,3] >= 0 or cv2.contourArea(contour) < minimum:
            continue
        result.append(contour_path(contour, epsilon))
        child = hierarchy[0,index,2]
        while child >= 0:
            if cv2.contourArea(contours[child]) >= minimum:
                result.append(contour_path(contours[child], epsilon))
            child = hierarchy[0,child,0]
    return ''.join(result)

result = {}
stats = {}
for name, hex_colors in PALETTES.items():
    rgba = np.asarray(Image.open(ROOT/'public/home-ai/layers'/f'{name}.png').convert('RGBA'))
    alpha = (rgba[:,:,3] > 95).astype(np.uint8) * 255
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
    count, labels, info, _ = cv2.connectedComponentsWithStats(alpha)
    for i in range(1,count):
        if info[i,cv2.CC_STAT_AREA] < 120:
            alpha[labels == i] = 0
    # Fill fine accidental alpha holes, preserving the scenery between limbs.
    count, labels, info, _ = cv2.connectedComponentsWithStats(255-alpha)
    for i in range(1,count):
        if info[i,cv2.CC_STAT_AREA] < 240:
            alpha[labels == i] = 255
    rgb = np.asarray(Image.open(ROOT/'public/home-ai/hero-v5.png').convert('RGB'))
    smooth = cv2.medianBlur(rgb, 3).astype(np.int16)
    r,g,b=smooth[:,:,0],smooth[:,:,1],smooth[:,:,2]
    yy,xx=np.indices(alpha.shape)
    regions=np.ones_like(alpha,dtype=np.uint8)
    # Semantic colors keep source highlights/shadows from becoming new patches.
    # Body colors remain single flat fills, with the original ink and props.
    if name=='director':
        orange=(r>150)&(g>55)&(g<205)&(b<120)&(r-g>25)&(yy<462)
        regions[orange]=2
        regions[(r>145)&(g<130)&(b<135)&(yy>462)&(yy<548)]=3
        regions[(r>200)&(g>115)&(g<180)&(b>70)&(b<160)&(yy>365)&(yy<480)]=4
        lens=((xx-885)/73)**2+((yy-395)/73)**2<1
        regions[lens&(r>190)&(g>155)&(b<145)]=5
        regions[lens&(b>g+8)&(r<190)]=6
        reels=(((xx-846)/69)**2+((yy-305)/66)**2<1)|(((xx-976)/69)**2+((yy-362)/68)**2<1)
        regions[reels]=2
    elif name=='octopus':
        regions[(r>195)&(g>160)&(b<g-8)&(b>100)]=3
        regions[(r>190)&(g>145)&(b<130)]=4
        regions[(r>190)&(g<190)&(b>130)&(b<r-8)]=5
        regions[(r<100)&(g>45)&(b>g-40)]=6
    else:
        regions[(r>160)&(g>130)&(b<150)&(r-g>25)]=3
        regions[(b>g+30)&(r>g+10)]=5
        regions[(r>210)&(g>195)&(b>140)&(r>g)&(g-b>5)]=4
        gear=(xx>1230)&(xx<1390)&(yy>625)&(yy<765)
        regions[gear&(g>r+8)&(b>g-15)]=7
        regions[gear&(r>180)&(g<110)&(b<135)]=11
        mic=(xx>1380)&(yy<440)
        regions[mic]=9
    regions[np.max(smooth,axis=2)<85]=0
    if name=='bird': regions[(xx>1400)&(yy<435)]=9
    regions[alpha==0]=255
    # Remove the source's grain islands while preserving broad shadows and ink.
    small=np.zeros_like(alpha,dtype=bool)
    for index in range(len(hex_colors)):
        count,components,info,_=cv2.connectedComponentsWithStats((regions==index).astype(np.uint8))
        for component in range(1,count):
            if info[component,cv2.CC_STAT_AREA] < (16 if index==0 else 18):
                small[components==component]=True
    good=(alpha>0)&(~small)
    _, nearest=cv2.distanceTransformWithLabels((~good).astype(np.uint8),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
    color_by_label=np.zeros(int(nearest.max())+1,np.uint8)
    color_by_label[nearest[good]]=regions[good]
    regions[small]=color_by_label[nearest[small]]
    shapes = [{'fill':BASE[name],'d':paths_for(alpha,.45,2)}]
    # Regions touch each other; a subpixel same-color stroke closes AA cracks.
    # Draw the dark linework last, like hand ink over flat color fills.
    for index in [*range(1,len(hex_colors)),0]:
        region = ((regions == index)&(alpha>0)).astype(np.uint8)*255
        d = paths_for(region,.48,2)
        if d:
            shapes.append({'fill':hex_colors[index], 'd':d})
    ys,xs = np.where(alpha>0)
    bounds = [int(xs.min())-3,int(ys.min())-3,int(xs.max()-xs.min())+7,int(ys.max()-ys.min())+7]
    result[name] = {'bounds':bounds,'shapes':shapes}
    stats[name] = {'palette':hex_colors,'color_paths':len(shapes),'curve_segments':sum(s['d'].count('Q') for s in shapes),'bounds':bounds}
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1672 941">'
    svg += ''.join(f'<path fill="{s["fill"]}" stroke="{s["fill"]}" stroke-width=".65" fill-rule="evenodd" d="{s["d"]}"/>' for s in shapes)
    svg += '</svg>'
    (REVIEW/f'{name}-vector.svg').write_text(svg,encoding='utf-8')
OUT.write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
stats['bytes'] = OUT.stat().st_size
(REVIEW/'vector-stats.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
print(json.dumps(stats,indent=2))
