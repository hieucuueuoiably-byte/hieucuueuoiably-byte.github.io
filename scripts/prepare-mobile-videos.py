"""Create bandwidth-limited mobile copies without modifying the desktop videos."""
from pathlib import Path
import json
import subprocess

PROJECT = Path(__file__).resolve().parents[1]
VIDEOS = PROJECT / 'public' / 'videos'
OUTPUT = VIDEOS / 'mobile'
OUTPUT.mkdir(exist_ok=True)

def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries',
        'format=duration,size,bit_rate:stream=codec_name,width,height', '-of', 'json', str(path)
    ], text=True))

results = []
for source in sorted(VIDEOS.glob('*.mp4')):
    original = probe(source)
    stream = next(s for s in original['streams'] if s['codec_name'] == 'h264')
    portrait = stream['height'] > stream['width']
    size = 'scale=432:768:force_original_aspect_ratio=decrease:force_divisible_by=2' if portrait else 'scale=960:540:force_original_aspect_ratio=decrease:force_divisible_by=2'
    destination = OUTPUT / source.name
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
        '-map', '0:v:0', '-map', '0:a:0?', '-vf', size,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '25',
        '-maxrate', '600k', '-bufsize', '900k', '-pix_fmt', 'yuv420p',
        '-g', '60', '-keyint_min', '30', '-sc_threshold', '0',
        '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', str(destination)
    ], check=True)
    encoded = probe(destination)
    old_size = int(original['format']['size'])
    new_size = int(encoded['format']['size'])
    results.append({
        'slug': source.stem, 'video': '/videos/mobile/' + source.name,
        'bytes': new_size, 'desktopBytes': old_size,
        'bitrate': int(encoded['format']['bit_rate']),
        'duration': float(encoded['format']['duration']),
        'width': next(s['width'] for s in encoded['streams'] if 'width' in s),
        'height': next(s['height'] for s in encoded['streams'] if 'height' in s),
        'savingPercent': round(100 * (1 - new_size / old_size), 1),
    })
    print(f'{source.stem}: {new_size / 1e6:.2f} MB, saved {results[-1]["savingPercent"]}%', flush=True)

manifest = {'videoCount': len(results), 'totalBytes': sum(r['bytes'] for r in results), 'desktopTotalBytes': sum(r['desktopBytes'] for r in results), 'videos': results}
(PROJECT / 'docs' / 'mobile-video-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(PROJECT / 'src' / 'data' / 'mobile-videos.json').write_text(json.dumps({r['slug']: r['video'] for r in results}, indent=2) + '\n', encoding='utf-8')
print(f'Mobile video total: {manifest["totalBytes"] / 1e6:.2f} MB', flush=True)
