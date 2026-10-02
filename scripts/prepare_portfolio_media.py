"""Prepare local source videos without changing source files.

Run `python scripts/prepare_portfolio_media.py probe`, inspect contact sheets,
then `python scripts/prepare_portfolio_media.py encode`.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from fractions import Fraction
import json
import math
from pathlib import Path
import re
import subprocess
import time

from PIL import Image, ImageDraw, ImageFont, ImageOps

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent / 'zucai'
PUBLIC = PROJECT / 'public'
MEDIA = PUBLIC / 'media'
MANIFEST = PROJECT / 'docs' / 'media-manifest.json'
FONT_PATH = Path('C:/Windows/Fonts/msyh.ttc')


def run(args: list[str]) -> str:
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stderr[-6000:])
    return result.stdout


def probe(path: Path) -> dict:
    data = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))
    video = next(s for s in data['streams'] if s['codec_type'] == 'video')
    audio = [s for s in data['streams'] if s['codec_type'] == 'audio']
    width, height = video['width'], video['height']
    for side in video.get('side_data_list', []):
        if abs(side.get('rotation', 0)) % 180 == 90:
            width, height = height, width
    sar = Fraction(video.get('sample_aspect_ratio', '1:1').replace(':', '/')) if video.get('sample_aspect_ratio', '1:1') not in ['0:1', 'N/A'] else Fraction(1)
    display_ratio = Fraction(width, height) * sar
    return {
        'width': width, 'height': height,
        'aspect': f'{display_ratio.numerator} / {display_ratio.denominator}',
        'durationSeconds': round(float(data['format'].get('duration', video.get('duration', 0))), 3),
        'frameRate': video.get('avg_frame_rate'),
        'videoCodec': video.get('codec_name'),
        'pixelFormat': video.get('pix_fmt'),
        'audioTracks': len(audio),
        'audioCodecs': [s.get('codec_name') for s in audio],
        'bytes': path.stat().st_size,
    }


def identity(path: Path) -> tuple[str, tuple]:
    if path.parent == SOURCE:
        match = re.search(r'(\d+)月(\d+)日(?:\s*\((\d+)\))?', path.stem)
        if not match:
            raise ValueError(f'Unexpected source filename: {path}')
        month, day, variant = int(match[1]), int(match[2]), int(match[3] or 0)
        slug = f'film-{month:02}{day:02}' + (f'-{variant:02}' if variant else '')
        return slug, (0, month, day, variant)
    match = re.search(r'2026[-_]?09[-_]?(\d{2})[T_]?(\d{6})', path.stem)
    if not match:
        raise ValueError(f'Unexpected source filename: {path}')
    day, stamp = int(match[1]), match[2]
    return f'preview-092{day - 20}-{stamp}', (1, day, stamp)


def frame(path: Path, at: float, dest: Path, max_edge: int = 1280):
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(at), '-i', str(path),
         '-frames:v', '1', '-vf', f'scale=w=\'if(gte(iw,ih),min({max_edge},iw),-2)\':h=\'if(gte(iw,ih),-2,min({max_edge},ih))\'',
         '-q:v', '2', str(dest)])


def contacts(entries: list[dict]):
    frames_dir = MEDIA / 'candidate-frames'
    frames_dir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(str(FONT_PATH), 18)
    small = ImageFont.truetype(str(FONT_PATH), 14)
    groups = [('films', entries[:7]), ('previews', entries[7:])]
    for group, items in groups:
        sheet = Image.new('RGB', (1450, len(items) * 205 + 50), '#f5eee5')
        draw = ImageDraw.Draw(sheet)
        draw.text((15, 12), f'{group} — 源视频真实帧候选（每条 5 帧）', font=font, fill='#201c28')
        for row, item in enumerate(items):
            top = 50 + row * 205
            meta = item['sourceMetadata']
            draw.text((15, top), f"{item['no']}  {item['sourceFile']}  {meta['width']}×{meta['height']} / {meta['durationSeconds']}s / 音轨 {meta['audioTracks']}", font=small, fill='#201c28')
            samples = []
            for col, portion in enumerate([.10, .28, .47, .67, .85]):
                at = min(meta['durationSeconds'] - .1, max(.05, meta['durationSeconds'] * portion))
                dest = frames_dir / f"{item['slug']}-{col+1}.jpg"
                frame(SOURCE / item['sourceFile'], at, dest)
                samples.append({'number': col+1, 'seconds': round(at, 3), 'file': '/media/candidate-frames/' + dest.name})
                tile = ImageOps.contain(Image.open(dest).convert('RGB'), (275, 148))
                x, y = 15 + col * 285, top + 30
                draw.rectangle((x, y, x + 275, y + 148), fill='#25222c')
                sheet.paste(tile, (x + (275 - tile.width)//2, y + (148 - tile.height)//2))
                draw.text((x, y + 153), f'{col+1}: {at:.2f}s', font=small, fill='#201c28')
            item['frameCandidates'] = samples
            item['selectedFrame'] = 3
        target = MEDIA / f'contact-sheet-{group}.jpg'
        sheet.save(target, quality=93)
        print(f'CONTACT {target}', flush=True)


def encode_one(item: dict) -> dict:
    target = PUBLIC / 'videos' / f"{item['slug']}.mp4"
    source = SOURCE / item['sourceFile']
    started = time.monotonic()
    # Horizontal films: <=1920 longest edge. Portrait films: <=1080 longest edge.
    # Integer multiples of the reduced ratio keep source proportions exact and dimensions even.
    meta = item['sourceMetadata']
    max_edge = 1920 if meta['width'] >= meta['height'] else 1080
    ratio = Fraction(meta['aspect'].replace(' ', ''))
    ratio_w, ratio_h = ratio.numerator, ratio.denominator
    multiplier = min(meta['width'] // ratio_w, meta['height'] // ratio_h, max_edge // max(ratio_w, ratio_h))
    if ratio_w % 2 or ratio_h % 2:
        multiplier -= multiplier % 2
    width, height = ratio_w * multiplier, ratio_h * multiplier
    vf = f'scale={width}:{height},setsar=1'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-map', '0:v:0', '-map', '0:a:0?',
         '-vf', vf, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-threads', '4',
         '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(target)])
    result = probe(target)
    result['encodeSeconds'] = round(time.monotonic() - started, 2)
    print(f"ENCODE {item['slug']} {result['bytes']/1024/1024:.2f} MiB {result['encodeSeconds']}s", flush=True)
    return result


def make_art(item: dict):
    candidate = item['frameCandidates'][item['selectedFrame']-1]
    selected = Image.open(PUBLIC / candidate['file'].lstrip('/')).convert('RGB')
    poster = PUBLIC / 'media' / f"{item['slug']}-poster.jpg"
    selected.save(poster, quality=93)
    # Narrative covers crop around the chosen subject. Product previews retain the full frame.
    if item.get('coverFit') == 'crop':
        cover = ImageOps.fit(selected, (1024, 1024), Image.Resampling.LANCZOS, centering=tuple(item.get('coverFocus', [.5, .3])))
    else:
        cover = Image.new('RGB', (1024, 1024), item['themeColors'][0])
        tile = ImageOps.contain(selected, (1024, 1024), Image.Resampling.LANCZOS)
        cover.paste(tile, ((1024-tile.width)//2, (1024-tile.height)//2))
    cover.save(PUBLIC / 'covers' / f"{item['slug']}.jpg", quality=93)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['probe', 'encode', 'art', 'hero'])
    args = parser.parse_args()
    for directory in [MEDIA, PUBLIC / 'videos', PUBLIC / 'covers', MANIFEST.parent]:
        directory.mkdir(parents=True, exist_ok=True)
    if args.stage == 'probe':
        sources = sorted((p for p in SOURCE.rglob('*') if p.suffix.lower() in ['.mp4', '.mov', '.mkv', '.webm']), key=lambda p: identity(p)[1])
        entries = []
        for index, path in enumerate(sources):
            slug, order = identity(path)
            item = {'no': f'{index+1:02}', 'slug': slug, 'sourceFile': path.relative_to(SOURCE).as_posix(), 'sourceMetadata': probe(path)}
            entries.append(item)
            print(json.dumps(item, ensure_ascii=False), flush=True)
        contacts(entries)
        MANIFEST.write_text(json.dumps({'sourceDirectory': str(SOURCE), 'policy': 'Original files are untouched. Covers/posters are real source-video frames.', 'works': entries}, ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
        entries = manifest['works']
        if args.stage == 'encode':
            with ThreadPoolExecutor(max_workers=2) as pool:
                pending = {pool.submit(encode_one, item): item for item in entries}
                for future in as_completed(pending):
                    slug = pending[future]['slug']
                    metadata = future.result()
                    # Preserve reviewed frame choices or catalog notes written while encoding.
                    current = json.loads(MANIFEST.read_text(encoding='utf-8'))
                    next(it for it in current['works'] if it['slug'] == slug)['webMetadata'] = metadata
                    MANIFEST.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding='utf-8')
        elif args.stage == 'art':
            for item in entries:
                make_art(item)
                print(f"ART {item['slug']} selected {item['selectedFrame']}", flush=True)
            sheet = Image.new('RGB', (1020, math.ceil(len(entries)/3) * 370 + 40), '#f5eee5')
            draw = ImageDraw.Draw(sheet)
            font = ImageFont.truetype(str(FONT_PATH), 16)
            draw.text((15, 10), '真实作品封面：已选帧与主体构图', font=font, fill='#201c28')
            for index, item in enumerate(entries):
                tile = Image.open(PUBLIC / 'covers' / f"{item['slug']}.jpg").resize((320, 320), Image.Resampling.LANCZOS)
                x, y = 10 + (index % 3) * 340, 40 + (index // 3) * 370
                sheet.paste(tile, (x, y))
                draw.text((x, y + 326), f"{item['no']} {item['title']}", font=font, fill='#201c28')
            sheet.save(MEDIA / 'contact-sheet-covers.jpg', quality=93)
        elif args.stage == 'hero':
            item = next(it for it in entries if it['slug'] == manifest['hero']['slug'])
            at = manifest['hero']['startSeconds']
            frame(SOURCE / item['sourceFile'], at, MEDIA / 'hero-still.jpg', 1920)
            run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(at), '-i', str(SOURCE / item['sourceFile']), '-t', '12', '-an',
                 '-vf', "scale=w='if(gte(iw,ih),min(1280,iw),-2)':h='if(gte(iw,ih),-2,min(1280,ih))',setsar=1", '-r', '24',
                 '-c:v', 'libx264', '-preset', 'fast', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(MEDIA / 'hero-preview.mp4')])
            manifest['hero']['previewMetadata'] = probe(MEDIA / 'hero-preview.mp4')
            MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
