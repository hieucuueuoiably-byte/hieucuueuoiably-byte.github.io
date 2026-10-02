import { mkdir, readFile, copyFile, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { command } from './github.mjs'
import { AppError, CATEGORIES, safePath, readJSON } from './library.mjs'

async function hash(path) { const h = createHash('sha256'); for await (const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex') }
async function probe(path, root) {
  try { return JSON.parse((await command('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], root)).stdout) }
  catch { throw new AppError('文件无法读取，请上传有效的视频或图片') }
}
export class Media {
  constructor(root, library) { this.root = root; this.library = library; this.public = join(root, 'public'); this.cache = new Map() }
  async upload(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new AppError('上传编号无效')
    const metadata = await readJSON(join(this.library.state, 'uploads', id + '.json'), null)
    if (!metadata) throw new AppError('上传文件不完整，请重新选择文件', 404)
    return { ...metadata, path: join(this.library.state, 'uploads', id + '.bin') }
  }
  async existingVideo(sourceHash) {
    const works = await this.library.list()
    const selected = await readJSON(join(this.root, 'docs/selected-collection-report.json'), { works: [] })
    for (const work of works) {
      const report = selected.works.find(item => item.slug === work.slug)
      if ([work.sourceSHA256, report?.sourceSHA256, report?.webSHA256].includes(sourceHash)) return work
      if (!this.cache.has(work.video)) this.cache.set(work.video, await hash(safePath(this.public, work.video)))
      if (this.cache.get(work.video) === sourceHash) return work
    }
  }
  async image(uploadId, dir, name) {
    const upload = await this.upload(uploadId)
    if (upload.bytes > 25 * 1024 * 1024) throw new AppError('单张图片请控制在 25 MB 内')
    const meta = await probe(upload.path, this.root)
    const stream = meta.streams.find(item => item.codec_type === 'video')
    if (!stream || !['png', 'mjpeg', 'webp', 'gif', 'bmp', 'tiff', 'av1'].includes(stream.codec_name) || stream.width * stream.height > 80000000) throw new AppError('请上传 JPG、PNG、WebP 等图片，尺寸不要超过 8000 万像素')
    const sha = await hash(upload.path); const base = 'managed-ref-' + sha.slice(0, 20) + '.jpg'
    await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', upload.path, '-frames:v', '1', '-vf', 'scale=1600:1600:force_original_aspect_ratio=decrease', '-q:v', '3', join(dir, base)], this.root)
    await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(dir, base), '-frames:v', '1', '-vf', 'scale=480:480:force_original_aspect_ratio=decrease', '-q:v', '4', join(dir, 'thumb-' + base)], this.root)
    return { material: { src: '/materials/' + base, thumbnail: '/materials/thumbs/' + base, title: name || upload.name.replace(/\.[^.]+$/, ''), kind: 'reference' }, files: [[join(dir, base), '/materials/' + base], [join(dir, 'thumb-' + base), '/materials/thumbs/' + base]] }
  }
  async install(files) {
    for (const [source, relative] of files) {
      const dest = safePath(this.public, relative)
      const folder = dest.slice(0, Math.max(dest.lastIndexOf('/'), dest.lastIndexOf('\\')))
      await mkdir(folder, { recursive: true }); await copyFile(source, dest)
    }
    return files.map(([, relative]) => 'public' + relative)
  }
  async images(input, progress) {
    if (!Array.isArray(input.uploadIds) || !input.uploadIds.length || input.uploadIds.length > 40) throw new AppError('每次请选择 1–40 张图片')
    if (!(await this.library.list()).some(work => work.id === input.workId)) throw new AppError('找不到这条作品', 404)
    const dir = join(this.library.state, 'processed', randomUUID()); await mkdir(dir, { recursive: true })
    const materials = []; const files = []
    for (const [i, id] of input.uploadIds.entries()) { progress(`处理图片 ${i + 1}/${input.uploadIds.length}`); const image = await this.image(id, dir); materials.push(image.material); files.push(...image.files) }
    const paths = await this.install(files)
    return this.library.addImages(input.workId, materials, paths)
  }
  async video(input, progress) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 100 || !CATEGORIES.includes(input.category)) throw new AppError('请填写名称并选择分类')
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 4000)) throw new AppError('描述格式无效或超过 4000 字')
    if (input.visibility !== undefined && !['published', 'offline'].includes(input.visibility)) throw new AppError('上架状态无效')
    const upload = await this.upload(input.uploadId); const sha = await hash(upload.path)
    const existing = await this.existingVideo(sha)
    if (existing) return { duplicate: true, work: existing }
    const meta = await probe(upload.path, this.root); const stream = meta.streams.find(item => item.codec_type === 'video')
    const duration = Number(meta.format?.duration)
    if (!stream || !Number.isFinite(duration) || duration <= 0 || stream.width * stream.height > 80000000) throw new AppError('视频时长或尺寸无效')
    const bitrate = Math.min(1100, Math.floor(40 * 1024 * 1024 * 8 / duration / 1000 * .86 - 96))
    if (bitrate < 250) throw new AppError('视频过长，请先拆分为较短的片段再上传。原文件已保留')
    const slug = 'managed-' + sha.slice(0, 20)
    if ((await this.library.list()).some(work => work.slug === slug)) throw new AppError('视频编号冲突，已停止添加以保护已有作品', 409)
    const dir = join(this.library.state, 'processed', slug); await mkdir(dir, { recursive: true })
    const target = join(dir, slug + '.mp4')
    progress('正在压缩视频并保留完整时长')
    await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', upload.path, '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1', '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '26', '-maxrate', `${bitrate}k`, '-bufsize', `${bitrate * 2}k`, '-threads', '2', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', target], this.root)
    if ((await stat(target)).size > 50 * 1024 * 1024) throw new AppError('压缩后仍超过上传限制，请先拆分视频。原文件已保留')
    const web = await probe(target, this.root); const video = web.streams.find(item => item.codec_type === 'video')
    if (Math.abs(Number(web.format.duration) - duration) > .2) throw new AppError('视频时长校验失败，已停止添加作品')
    progress('生成封面与画面')
    const poster = join(dir, slug + '-poster.jpg'); const cover = join(dir, slug + '.jpg')
    await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.min(duration * .35, 10)), '-i', target, '-frames:v', '1', '-vf', 'scale=960:960:force_original_aspect_ratio=decrease', '-q:v', '3', poster], this.root)
    await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', poster, '-frames:v', '1', '-vf', 'scale=1024:1024:force_original_aspect_ratio=increase,crop=1024:1024', '-q:v', '3', cover], this.root)
    const files = [[target, '/videos/' + slug + '.mp4'], [poster, '/media/' + slug + '-poster.jpg'], [cover, '/covers/' + slug + '.jpg']]
    const materials = []
    if (input.materialUploadIds && (!Array.isArray(input.materialUploadIds) || input.materialUploadIds.length > 40)) throw new AppError('每次最多添加 40 张素材图片')
    for (const id of input.materialUploadIds ?? []) { const image = await this.image(id, dir); materials.push(image.material); files.push(...image.files) }
    const seconds = Math.round(duration)
    const work = { id: 'work-' + slug, slug, no: '', title: input.title.trim(), category: input.category, tags: [], cover: '/covers/' + slug + '.jpg', video: '/videos/' + slug + '.mp4', poster: '/media/' + slug + '-poster.jpg', sourceFile: upload.name, sourceSHA256: sha, videoAspect: `${video.width} / ${video.height}`, duration: `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`, description: input.description?.slice(0, 4000) || `${input.category} · ${seconds} 秒`, longDescription: input.description?.slice(0, 4000) || '', role: [], process: [], themeColors: ['#EB8DB7', '#7E7EFF'], isPlaceholder: false, visibility: input.visibility === 'offline' ? 'offline' : 'published', materials, screenshots: [], updatedAt: new Date().toISOString() }
    const paths = await this.install(files)
    return { work: await this.library.append(work, paths), duplicate: false }
  }
}
