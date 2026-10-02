"""Regression probes on the actual WebP sprites used by the homepage.

These small patches are solid character pixels in the approved source image.
The original palette masks deleted them, splitting arms, feet and headphones.
Background probes ensure the fix does not merely fill every transparent gap.
"""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOLID = {
    'director': {'reel rim': (895,351), 'right shoulder': (865,500),
                 'right arm': (910,520), 'left shoe': (835,658),
                 'scarf knot': (799,480)},
    'octopus': {'upper edge of right tentacle': (627,715)},
    'bird': {'headphone shadow': (1169,540), 'case face': (1330,690),
             'case lower face': (1315,712), 'neck': (1240,590)},
    'balloon-1': {'red balloon body': (1143,145)},
    'balloon-2': {'orange balloon body': (1116,225)},
    'balloon-3': {'pink balloon body': (1216,181)},
}
CLEAR = {'director': [(700,550), (865,620)], 'bird': [(1198,604),(1360,620)]}
failures = []
results = []
for name, probes in SOLID.items():
    image = Image.open(ROOT / f'public/home-ai/layers/{name}.webp').convert('RGBA')
    alpha = np.asarray(image)[:,:,3]
    for label,(x,y) in probes.items():
        coverage = float((alpha[y-1:y+2,x-1:x+2] >= 240).mean())
        results.append({'layer': name, 'region': label, 'solidCoverage': coverage})
        if coverage < 1:
            failures.append(f'{name}: {label}: solid coverage {coverage:.0%}')
    for x,y in CLEAR.get(name,[]):
        if alpha[y,x] > 15:
            failures.append(f'{name}: background ({x},{y}) unexpectedly opaque')
report = {'passed': not failures, 'results': results, 'failures': failures}
print(json.dumps(report,ensure_ascii=False,indent=2))
if len(sys.argv)>1:
    Path(sys.argv[1]).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
sys.exit(bool(failures))
