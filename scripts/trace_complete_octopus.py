"""Trace the completed generated octopus into the site's flat Path2D artwork.

Only the octopus entry changes. The transparent reference PNG is preserved;
the website renders closed vector contours rather than the generated bitmap.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'public/home-ai/octopus-complete-v1.png'
out=ROOT/'src/data/home-character-paths.json'
review=ROOT/'docs/octopus-grounding'
review.mkdir(parents=True,exist_ok=True)
rgba=np.asarray(Image.open(source).convert('RGBA'))
alpha=(rgba[:,:,3]>95).astype(np.uint8)*255
alpha=cv2.morphologyEx(alpha,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
n,labels,stats,_=cv2.connectedComponentsWithStats(alpha)
for i in range(1,n):
    if stats[i,cv2.CC_STAT_AREA]<90: alpha[labels==i]=0
ys,xs=np.where(alpha>0)
scale=760/(xs.max()-xs.min())
offset=np.array([50-xs.min()*scale,420-ys.min()*scale])

def paths(mask,minimum=12):
    contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:return ''
    def contour(c):
        pts=cv2.approxPolyDP(c,1.1,True).reshape(-1,2)*scale+offset
        if len(pts)<3:return ''
        f=lambda p:f'{p[0]:.1f} {p[1]:.1f}'
        d='M'+f((pts[-1]+pts[0])/2)
        for i,p in enumerate(pts):d+='Q'+f(p)+' '+f((p+pts[(i+1)%len(pts)])/2)
        return d+'Z'
    result=[]
    for i,c in enumerate(contours):
        if hierarchy[0,i,3]>=0 or cv2.contourArea(c)<minimum:continue
        result.append(contour(c));child=hierarchy[0,i,2]
        while child>=0:
            if cv2.contourArea(contours[child])>=minimum:result.append(contour(contours[child]))
            child=hierarchy[0,child,0]
    return ''.join(result)

rgb=cv2.medianBlur(rgba[:,:,:3],3).astype(np.int16)
r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
colors=['#25212d','#b67fea','#fff0cf','#ffcf45','#f497bc','#006073']
regions=np.ones_like(alpha,dtype=np.uint8)
regions[(r>195)&(g>160)&(b<g-8)&(b>100)]=2
regions[(r>190)&(g>145)&(b<130)]=3
regions[(r>190)&(g<190)&(b>130)&(b<r-8)]=4
teal=(r<110)&(g>35)&(b>g-40)&(g>r+12)
regions[teal]=5
regions[(np.max(rgb,axis=2)<105)&(~teal)]=0
regions[alpha==0]=255
shapes=[{'fill':'#b67fea','d':paths(alpha)}]
for index in [1,2,3,4,5,0]:
    d=paths(((regions==index)&(alpha>0)).astype(np.uint8)*255)
    if d:shapes.append({'fill':colors[index],'d':d})
lo=np.array([xs.min(),ys.min()])*scale+offset
hi=np.array([xs.max(),ys.max()])*scale+offset
bounds=[int(lo[0])-3,int(lo[1])-3,int(hi[0]-lo[0])+7,int(hi[1]-lo[1])+7]
data=json.loads(out.read_text(encoding='utf-8'))
data['octopus']={'bounds':bounds,'shapes':shapes}
out.write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1672 941">'+''.join(f'<path fill="{s["fill"]}" stroke="{s["fill"]}" stroke-width=".65" fill-rule="evenodd" d="{s["d"]}"/>' for s in shapes)+'</svg>'
(review/'complete-octopus-vector.svg').write_text(svg,encoding='utf-8')
report={'source':str(source.relative_to(ROOT)),'bounds':bounds,'scale':scale,'offset':offset.tolist(),'shapes':len(shapes),'curve_segments':sum(s['d'].count('Q') for s in shapes)}
(review/'vector-stats.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
