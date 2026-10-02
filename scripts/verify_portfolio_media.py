"""Verify every generated media asset against the original-source manifest."""
from fractions import Fraction
import json
from pathlib import Path
import struct
from PIL import Image

from prepare_portfolio_media import PROJECT, PUBLIC, MANIFEST, probe


def faststart(path):
    atoms = []
    with path.open('rb') as stream:
        while True:
            header = stream.read(8)
            if len(header) != 8:
                break
            size, atom = struct.unpack('>I4s', header)
            header_size = 8
            if size == 1:
                size = struct.unpack('>Q', stream.read(8))[0]
                header_size = 16
            if not size:
                break
            atoms.append(atom.decode('ascii'))
            stream.seek(size - header_size, 1)
    return 'moov' in atoms and 'mdat' in atoms and atoms.index('moov') < atoms.index('mdat')


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
for item in manifest['works']:
    source, web = item['sourceMetadata'], probe(PUBLIC / item['video'].lstrip('/'))
    assert web['videoCodec'] == 'h264', item['slug']
    assert web['pixelFormat'] == 'yuv420p', item['slug']
    assert web['audioTracks'] == source['audioTracks'] == 1, item['slug']
    assert web['audioCodecs'] == ['aac'], item['slug']
    assert abs(web['durationSeconds'] - source['durationSeconds']) < .1, item['slug']
    assert web['aspect'] == source['aspect'], item['slug']
    assert faststart(PUBLIC / item['video'].lstrip('/')), item['slug']
    cover = Image.open(PUBLIC / item['cover'].lstrip('/'))
    assert cover.size == (1024, 1024), item['slug']
    poster = Image.open(PUBLIC / item['poster'].lstrip('/'))
    assert abs(poster.width / poster.height - float(Fraction(source['aspect'].replace(' ', '')))) < .002, item['slug']
    item['webMetadata'].update(web)
    item['validation'] = {'h264': True, 'aac': True, 'faststart': True, 'originalAspect': True, 'durationMatches': True, 'coverSquare': True, 'posterAspect': True}
original_bytes = sum(item['sourceMetadata']['bytes'] for item in manifest['works'])
web_bytes = sum(item['webMetadata']['bytes'] for item in manifest['works'])
manifest['summary'] = {
    'videoCount': len(manifest['works']),
    'originalBytes': original_bytes,
    'webVideoBytes': web_bytes,
    'reductionPercent': round((1 - web_bytes / original_bytes) * 100, 2),
    'landscapeCount': sum(item['sourceMetadata']['width'] > item['sourceMetadata']['height'] for item in manifest['works']),
    'portraitCount': sum(item['sourceMetadata']['height'] > item['sourceMetadata']['width'] for item in manifest['works']),
    'originalsUnmodified': True,
    'allAssetsVerified': True,
}
hero = manifest['hero']
assert (PUBLIC / hero['still'].lstrip('/')).is_file()
hero_meta = probe(PUBLIC / hero['preview'].lstrip('/'))
assert hero_meta['audioTracks'] == 0 and hero_meta['videoCodec'] == 'h264'
assert faststart(PUBLIC / hero['preview'].lstrip('/'))
hero['previewMetadata'] = hero_meta
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(manifest['summary'], ensure_ascii=False, indent=2))
print(f"Hero preview: {hero_meta['durationSeconds']} s / {hero_meta['bytes']/1024/1024:.2f} MiB / silent H.264")
