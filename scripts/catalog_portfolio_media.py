"""Publish the reviewed, real-video catalog and write typed static WORKS data."""
from pathlib import Path
import json
import re

PROJECT = Path(__file__).resolve().parents[1]
manifest_path = PROJECT / 'docs' / 'media-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
works_path = PROJECT / 'src' / 'data' / 'works.ts'

choices = [1, 2, 3, 1, 1, 4, 5, 2, 2, 2, 3, 1, 3, 3, 1, 3, 1, 1]
reference_palettes = [
    ['#EB8DB7', '#F87800'], ['#EB8DB7', '#7E7EFF'], ['#7E7EFF', '#F87800'],
    ['#FFBC03', '#ED1E24'], ['#ED1E24', '#7E7EFF'],
]
palettes = [reference_palettes[i % len(reference_palettes)] for i in range(len(manifest['works']))]
focus = [[.5, .3], [.5, .3], [.5, .35], [.5, .28], [.15, .5], [.65, .5], [.5, .32]]
for i, item in enumerate(manifest['works']):
    item['selectedFrame'] = choices[i]
    item['themeColors'] = palettes[i]
    item['coverFit'] = 'crop' if i < 7 else 'contain'
    if i < 7:
        item['coverFocus'] = focus[i]
    item['cover'] = f"/covers/{item['slug']}.jpg"
    item['poster'] = f"/media/{item['slug']}-poster.jpg"
    item['video'] = f"/videos/{item['slug']}.mp4"

manifest['hero'] = {'slug': 'film-0903-02', 'sourceFile': '9月3日 (2).mp4', 'startSeconds': 40.01, 'still': '/media/hero-still.jpg', 'preview': '/media/hero-preview.mp4', 'reason': '横屏暖色人物与橘猫动画，来自现有作品的真实画面。'}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

source = works_path.read_text(encoding='utf-8')
source = source.replace('主题色 [主色, 副色]，驱动背景色块与封面边框。参考站用两色 fbm 混合（GLSL 155/157）', '主题色 [主色, 副色]，用于原站目录的径向双色背景与独立圆层；属于设计取色')
source = re.sub(r'/\*\*.*?\*/', '''/**
 * 真实作品目录：全部条目来自 zucai 原视频，封面与 poster 来自实抽帧。
 * 名称采用原文件日期与类别；时长和比例来自 ffprobe；不填写未经确认的履历信息。
 */''', source, count=1, flags=re.S)
if '`${number} / ${number}`' not in source:
    source = source.replace("export type VideoAspect = '16 / 9' | '9 / 16' | '1 / 1' | '4 / 3' | '21 / 9'", "export type VideoAspect = '16 / 9' | '9 / 16' | '1 / 1' | '4 / 3' | '21 / 9' | `${number} / ${number}`")
if 'poster?: string' not in source:
    source = source.replace('  video: string\n', '  video: string\n  /** 保持视频原比例的真实抽帧 */\n  poster?: string\n  /** 相对 zucai 的原片路径；用于素材溯源 */\n  sourceFile?: string\n')

def dump(value):
    return json.dumps(value, ensure_ascii=False)

lines = ['export const WORKS: Work[] = [']
for i, item in enumerate(manifest['works']):
    meta = item['sourceMetadata']
    seconds = int(round(meta['durationSeconds']))
    duration = f'{seconds // 60:02}:{seconds % 60:02}'
    is_preview = i >= 7
    category = '带货预热' if is_preview else ('动画影像' if i in [4, 5] else 'AI 短片')
    date = re.search(r'(\d+)月(\d+)日', item['sourceFile'])
    if date:
        day = f'{int(date[1]):02}.{int(date[2]):02}'
    else:
        match = re.search(r'2026[-_]?09[-_]?(\d{2})', item['sourceFile'])
        day = f'09.{match[1]}'
    variant = ''
    if item['slug'] == 'film-0824-01':
        variant = ' · 版本 02'
    if is_preview:
        title = f'{day} · 带货预热 {i-6:02}'
    else:
        title = f'{day} · {category}{variant}'
    orientation = '横屏' if meta['width'] >= meta['height'] else '竖屏'
    description = f'{category} · {orientation} · {duration}'
    long_description = f'{orientation}{category}，时长 {duration}。以原始画幅播放，并保留原片声音；封面取自本片画面。'
    row = {
        'id': f'work-{item["no"]}', 'slug': item['slug'], 'no': item['no'],
        'title': title, 'category': category, 'tags': [category, orientation],
        'cover': item['cover'], 'video': item['video'], 'poster': item['poster'],
        'sourceFile': item['sourceFile'], 'videoIsTestClip': False, 'videoAspect': meta['aspect'],
        'duration': duration, 'description': description, 'longDescription': long_description,
        'role': [], 'process': [], 'themeColors': item['themeColors'], 'isPlaceholder': False,
    }
    item['title'], item['category'] = title, category
    lines.append('  {')
    for key, value in row.items():
        lines.append(f'    {key}: {dump(value)},')
    lines.append('  },')
lines.append(']')
source = re.sub(r'export const WORKS: Work\[\] = \[.*?\n\]', '\n'.join(lines), source, count=1, flags=re.S)
works_path.write_text(source, encoding='utf-8')
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'CATALOG {len(manifest["works"])} real videos written to {works_path}')
