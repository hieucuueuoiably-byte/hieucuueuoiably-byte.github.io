import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readWorkCollection } from '../merge-work-collection.mjs'

export const CATEGORIES = ['AI 短片', '动画影像', '带货预热']
export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
export function safePath(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.includes('\0') || relative.split('/').includes('..')) throw new AppError('文件路径无效')
  const path = resolve(root, relative.replace(/^\/+/, ''))
  if (!path.startsWith(resolve(root) + sep)) throw new AppError('文件路径超出素材目录')
  return path
}
export async function readJSON(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return fallback; throw error }
}
export async function atomicWrite(path, data) {
  const temp = `${path}.${randomUUID()}.tmp`
  await writeFile(temp, data, 'utf8')
  await rename(temp, path)
}
export class Library {
  constructor(root) { this.root = root; this.file = join(root, 'src/data/works.ts'); this.state = join(root, '.admin-data'); this.revision = 0 }
  async init() { await mkdir(this.state, { recursive: true }) }
  async list() { const stamp = (await stat(this.file)).mtimeMs; if (this.stamp !== stamp) { this.cached = readWorkCollection(await readFile(this.file, 'utf8')); this.stamp = stamp } return JSON.parse(JSON.stringify(this.cached)) }
  async history() { return readJSON(join(this.state, 'history.json'), []) }
  async pendingPaths() { return readJSON(join(this.state, 'pending.json'), []) }
  async track(paths) { await atomicWrite(join(this.state, 'pending.json'), JSON.stringify([...new Set([...await this.pendingPaths(), ...paths])])) }
  async clearPending() { await atomicWrite(join(this.state, 'pending.json'), '[]') }
  async save(works) {
    for (const field of ['id', 'slug', 'video', 'no']) if (new Set(works.map(work => work[field])).size !== works.length) throw new AppError(`作品存在重复 ${field}`)
    if (works.some(work => !CATEGORIES.includes(work.category) || !['published', 'offline', undefined].includes(work.visibility))) throw new AppError('分类或上架状态无效')
    const text = await readFile(this.file, 'utf8')
    const from = text.indexOf('export const WORKS: Work[] =')
    const end = text.indexOf('export const PUBLISHED_WORKS')
    if (from < 0 || end < 0) throw new AppError('作品数据格式变化，已停止保存以保护原目录', 409)
    const literal = JSON.stringify(works, null, 2).replace(/^(\s*)"([A-Za-z][A-Za-z0-9]*)":/gm, '$1$2:')
    await atomicWrite(this.file, text.slice(0, from) + 'export const WORKS: Work[] = ' + literal + '\n\n' + text.slice(end))
    this.stamp = undefined
    this.revision++
  }
  async record(before, after, label) {
    const history = await this.history()
    history.unshift({ id: randomUUID(), at: new Date().toISOString(), label, workId: after.id, title: after.title, before, after })
    await atomicWrite(join(this.state, 'history.json'), JSON.stringify(history.slice(0, 500), null, 2))
  }
  async patch(id, input, expectedRevision) {
    if (expectedRevision !== this.revision) throw new AppError('页面数据已变化，请刷新后再保存', 409)
    const works = await this.list(); const index = works.findIndex(work => work.id === id)
    if (index < 0) throw new AppError('找不到这条作品', 404)
    const before = works[index]; const next = { ...before }
    for (const key of ['title', 'description', 'longDescription']) if (key in input) {
      if (typeof input[key] !== 'string' || input[key].length > (key === 'title' ? 100 : 4000)) throw new AppError('文字过长或格式无效')
      next[key] = input[key].trim()
    }
    if (!next.title) throw new AppError('请填写作品名称')
    if ('category' in input) { if (!CATEGORIES.includes(input.category)) throw new AppError('分类无效'); next.category = input.category }
    if ('tags' in input) { if (!Array.isArray(input.tags) || input.tags.length > 12 || input.tags.some(tag => typeof tag !== 'string' || tag.length > 40)) throw new AppError('标签格式无效'); next.tags = input.tags.map(tag => tag.trim()).filter(Boolean) }
    if ('visibility' in input) { if (!['published', 'offline'].includes(input.visibility)) throw new AppError('状态无效'); next.visibility = input.visibility }
    if ('materialVisibility' in input) {
      const available = new Set([...(before.materials ?? []), ...(before.screenshots ?? [])].map(item => item.src))
      if (!Array.isArray(input.materialVisibility) || input.materialVisibility.some(item => !item || !available.has(item.src) || typeof item.hidden !== 'boolean')) throw new AppError('图片状态无效')
      const update = material => {
        const change = input.materialVisibility.find(item => item.src === material.src)
        return change ? { ...material, hidden: change.hidden } : material
      }
      next.materials = (before.materials ?? []).map(update)
      next.screenshots = (before.screenshots ?? []).map(update)
    }
    next.updatedAt = new Date().toISOString(); works[index] = next
    await this.record(before, next, (next.visibility ?? 'published') !== (before.visibility ?? 'published') ? (next.visibility === 'offline' ? '下架作品' : '上架作品') : '编辑作品')
    await this.save(works)
    return next
  }
  async append(work, paths) {
    const works = await this.list()
    work.no = String(Math.max(0, ...works.map(item => Number(item.no))) + 1).padStart(2, '0')
    await this.track(paths); await this.record(null, work, '上传视频'); await this.save([...works, work]); return work
  }
  async addImages(id, materials, paths) {
    const works = await this.list(); const at = works.findIndex(work => work.id === id)
    if (at < 0) throw new AppError('找不到这条作品', 404)
    const before = works[at]
    const existing = new Set((before.materials ?? []).map(item => item.src))
    const unique = materials.filter(item => { if (existing.has(item.src)) return false; existing.add(item.src); return true })
    const after = { ...before, materials: [...(before.materials ?? []), ...unique], updatedAt: new Date().toISOString() }
    works[at] = after; await this.track(paths); await this.record(before, after, '添加素材图片'); await this.save(works); return after
  }
  async undo(id, expectedRevision) {
    if (expectedRevision !== this.revision) throw new AppError('页面数据已变化，请刷新后再操作', 409)
    const entry = (await this.history()).find(item => item.id === id)
    if (!entry) throw new AppError('找不到修改记录', 404)
    const works = await this.list(); const at = works.findIndex(work => work.id === entry.workId)
    if (at < 0) throw new AppError('作品记录缺失，已停止恢复', 409)
    const before = works[at]; const after = entry.before ?? { ...before, visibility: 'offline' }
    works[at] = after; await this.record(before, after, '撤销修改'); await this.save(works); return after
  }
}
