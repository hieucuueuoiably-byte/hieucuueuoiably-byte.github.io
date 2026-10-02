"""Publish a local, deduplicated shortlist as portable website assets.

The selection and cache are local inputs. Public metadata contains catalog IDs,
descriptive titles and web paths, never absolute source paths.
"""
from pathlib import Path
from fractions import Fraction
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
import argparse, hashlib, json, re, subprocess, time
from PIL import Image, ImageOps

PROJECT = Path(__file__).resolve().parents[1]
PUBLIC = PROJECT/'public'
RECIPE = 'h264-main-1280-crf26-max1100-aac96-faststart-v1'

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def run(args):
    result=subprocess.run(args,capture_output=True,text=True,encoding='utf-8',errors='replace')
    if result.returncode:raise RuntimeError(result.stderr[-3000:])
    return result.stdout

def probe(path):
    data=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
    v=next(s for s in data['streams'] if s['codec_type']=='video')
    audio=[s for s in data['streams'] if s['codec_type']=='audio']
    ratio=Fraction(v['width'],v['height'])
    return {'width':v['width'],'height':v['height'],'aspect':f'{ratio.numerator} / {ratio.denominator}','durationSeconds':round(float(data['format']['duration']),3),'videoCodec':v['codec_name'],'pixelFormat':v['pix_fmt'],'audioTracks':len(audio),'audioCodecs':[s['codec_name'] for s in audio],'bytes':path.stat().st_size}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--selection',required=True,type=Path)
    parser.add_argument('--cache',required=True,type=Path)
    args=parser.parse_args()
    collection=json.loads(args.selection.read_text('utf-8'))
    entries=collection['entries']
    assert len(entries)==len({e['displayGroup'] for e in entries})==30
    cache=json.loads(args.cache.read_text('utf-8')) if args.cache.exists() else {}
    for directory in ['videos','covers','media','materials','materials/thumbs']:(PUBLIC/directory).mkdir(parents=True,exist_ok=True)
    material_map={}
    for e in entries:
        for m in e['materials']:
            if m['sha256'] in material_map:continue
            source=Path(m['sourcePath'])
            assert digest(source)==m['sha256']
            name='ref-'+m['sha256'][:20]+'.jpg'
            image_path=PUBLIC/'materials'/name
            thumb_path=PUBLIC/'materials/thumbs'/name
            if not image_path.exists() or not thumb_path.exists():
                with Image.open(source) as im:
                    im=ImageOps.exif_transpose(im)
                    if im.mode in ('RGBA','LA') or 'transparency' in im.info:
                        rgba=im.convert('RGBA');bg=Image.new('RGBA',rgba.size,'white');bg.alpha_composite(rgba);im=bg.convert('RGB')
                    else:im=im.convert('RGB')
                    im.thumbnail((1600,1600),Image.Resampling.LANCZOS)
                    im.save(image_path,quality=85,optimize=True)
                    im.thumbnail((480,480),Image.Resampling.LANCZOS)
                    im.save(thumb_path,quality=80,optimize=True)
            material_map[m['sha256']]={'src':'/materials/'+name,'thumbnail':'/materials/thumbs/'+name,'sourceId':m['imageId']}
    print(f'MATERIALS {len(material_map)} unique reference images prepared.',flush=True)

    def encode(e):
        id=e['id'];slug='curated-'+id.lower();source=Path(e['sourcePath']);sha=digest(source)
        old=cache.get(id,{})
        target=PUBLIC/'videos'/(slug+'.mp4')
        before=probe(source)
        if not (target.exists() and old.get('sourceSHA256')==sha and old.get('recipe')==RECIPE):
            ratio=Fraction(before['width'],before['height']);w,h=ratio.numerator,ratio.denominator
            mult=min(1280//max(w,h),before['width']//w,before['height']//h)
            if w%2 or h%2:mult-=mult%2
            assert mult>0
            # Preserve source composition, subtitles, duration and available audio.
            run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-map','0:v:0','-map','0:a:0?',
                 '-vf',f'scale={w*mult}:{h*mult},setsar=1','-c:v','libx264','-preset','fast','-crf','26',
                 '-maxrate','1100k','-bufsize','2200k','-profile:v','main','-pix_fmt','yuv420p','-threads','2',
                 '-c:a','aac','-b:a','96k','-ac','2','-movflags','+faststart',str(target)])
        after=probe(target)
        assert after['videoCodec']=='h264' and after['pixelFormat']=='yuv420p'
        assert abs(after['durationSeconds']-before['durationSeconds'])<.16
        assert before['aspect']==after['aspect']
        assert after['audioTracks']==before['audioTracks']
        assert all(c=='aac' for c in after['audioCodecs'])
        assert target.stat().st_size<50*1024*1024
        c={'sourceSHA256':sha,'recipe':RECIPE,'sourceMetadata':before,'webMetadata':after,'webSHA256':digest(target)}
        print(f'VIDEO {id} {after["bytes"]/1024/1024:.2f} MB',flush=True)
        return id,c

    args.cache.parent.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        for future in as_completed([pool.submit(encode,e) for e in entries]):
            id,record=future.result();cache[id]=record
            args.cache.write_text(json.dumps(cache,ensure_ascii=False,indent=2),'utf-8')
    assert len({cache[e['id']]['sourceSHA256'] for e in entries})==30
    assert len({cache[e['id']]['webSHA256'] for e in entries})==30

    palette=[['#EB8DB7','#F87800'],['#EB8DB7','#7E7EFF'],['#7E7EFF','#F87800'],['#FFBC03','#ED1E24'],['#ED1E24','#7E7EFF']]
    works=[]
    for e in entries:
        id=e['id'];slug='curated-'+id.lower();meta=cache[id]['sourceMetadata'];ratio=meta['aspect']
        frame=args.selection.parent/'精选30条'/e['coverRelative']
        with Image.open(frame) as im:
            im=ImageOps.exif_transpose(im).convert('RGB')
            im.save(PUBLIC/'media'/(slug+'-poster.jpg'),quality=86,optimize=True)
            cover=ImageOps.fit(im,(1024,1024),Image.Resampling.LANCZOS,centering=(.5,.35))
            cover.save(PUBLIC/'covers'/(slug+'.jpg'),quality=85,optimize=True)
        materials=[]
        for n,m in enumerate(e['materials'],1):
            a=material_map[m['sha256']]
            materials.append({'src':a['src'],'thumbnail':a['thumbnail'],'title':f"{m['role']} {n:02d}",'kind':'reference'})
        screenshots=[]
        for n,s in enumerate(e['screenshots'],1):
            name=slug+f'-frame-{n:02d}.jpg'
            with Image.open(args.selection.parent/'精选30条'/s['copyRelative']) as im:
                im=im.convert('RGB');im.save(PUBLIC/'materials'/name,quality=85,optimize=True)
                im.thumbnail((480,480),Image.Resampling.LANCZOS);im.save(PUBLIC/'materials/thumbs'/name,quality=80,optimize=True)
            screenshots.append({'src':'/materials/'+name,'thumbnail':'/materials/thumbs/'+name,'title':f"成片画面 · {s['timestamp']:.1f} 秒",'kind':'screenshot'})
        seconds=round(meta['durationSeconds']);duration=f'{seconds//60:02d}:{seconds%60:02d}'
        description=' · '.join(e['tags'][:2])+f' · {duration}'
        works.append({'id':'work-'+id.lower(),'slug':slug,'no':f"{e['order']:02d}",'title':e['title'],'category':e['category'],'tags':e['tags'],'cover':'/covers/'+slug+'.jpg','video':'/videos/'+slug+'.mp4','poster':'/media/'+slug+'-poster.jpg','sourceFile':'AI视频库/'+id,'videoIsTestClip':False,'videoAspect':ratio,'duration':duration,'description':description,'longDescription':description+'。保留原始画幅、完整时长与原片声音。','role':[],'process':[],'themeColors':palette[(e['order']-1)%len(palette)],'isPlaceholder':False,'materials':materials,'screenshots':screenshots})

    works_file=PROJECT/'src/data/works.ts'
    old_text=works_file.read_text('utf-8')
    prefix=old_text[:old_text.index('export const WORKS: Work[] =')]
    suffix=old_text[old_text.index('export const findWorkBySlug'):]
    prefix=re.sub(r'^/\*\*[\s\S]*?\*/','/** 已去重的 30 条精选作品；封面为成片画面，参考素材与截图分别标注。 */',prefix,count=1)
    if 'export interface WorkMaterial' not in prefix:
        prefix=prefix.replace('export interface Work {',"export interface WorkMaterial {\n  src: string\n  thumbnail: string\n  title: string\n  kind: 'reference' | 'screenshot'\n}\n\nexport interface Work {")
        prefix=prefix.replace('  isPlaceholder: boolean','  materials?: WorkMaterial[]\n  screenshots?: WorkMaterial[]\n  isPlaceholder: boolean')
    literal=json.dumps(works,ensure_ascii=False,indent=2)
    literal=re.sub(r'^(\s*)"([A-Za-z][A-Za-z0-9]*)":',r'\1\2:',literal,flags=re.M)
    works_file.write_text(prefix+'export const WORKS: Work[] = '+literal+'\n\n'+suffix,'utf-8')

    # Public report intentionally omits original local filenames and paths.
    report={'date':collection['date'],'selectionCount':30,'categoryCounts':dict(Counter(e['category'] for e in entries)),'uniqueReferenceImages':len(material_map),'referenceWorkCount':sum(bool(e['materials']) for e in entries),'screenshotCount':60,'videoBytes':sum(cache[e['id']]['webMetadata']['bytes'] for e in entries),'imageBytes':sum(p.stat().st_size for p in (PUBLIC/'materials').rglob('*.jpg')),'sourcePolicy':'视频按内容分组选取代表版本；制作图片与项目参考未全部确认是实际生成输入；成片截图分别标注。','works':[{'id':e['id'],'slug':'curated-'+e['id'].lower(),'title':e['title'],'category':e['category'],'referenceCount':len(e['materials']),'sourceSHA256':cache[e['id']]['sourceSHA256'],'webSHA256':cache[e['id']]['webSHA256'],'webMetadata':cache[e['id']]['webMetadata']} for e in entries]}
    (PROJECT/'docs/selected-collection-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8')
    print(json.dumps({k:report[k] for k in ['selectionCount','categoryCounts','uniqueReferenceImages','videoBytes','imageBytes']},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
