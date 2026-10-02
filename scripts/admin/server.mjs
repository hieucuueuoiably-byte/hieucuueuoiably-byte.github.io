import http from 'node:http'
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join, extname } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { Library, AppError, CATEGORIES, safePath } from './library.mjs'
import { Media } from './media.mjs'
import { connect, webLogin, hasChanges, publish, SITE } from './github.mjs'

const DEFAULT_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const UI = fileURLToPath(new URL('./ui/', import.meta.url))
async function jsonBody(req) {
  let data = ''
  for await (const chunk of req) { data += chunk; if (data.length > 128000) throw new AppError('提交的数据过大', 413) }
  try { return JSON.parse(data || '{}') } catch { throw new AppError('数据格式无效') }
}
export function createAdminServer({ root = DEFAULT_ROOT, port = 5230, authConnect = connect, authLogin = webLogin, publisher = publish } = {}) {
  const library = new Library(root); const media = new Media(root, library)
  const sessions = new Map(); const jobs = new Map(); let busy = null; let actualPort = port; let editing = false; let uploadsInFlight = 0
  const origin = () => `http://127.0.0.1:${actualPort}`
  const errorMessage = error => error instanceof AppError ? error.message : '处理未完成。素材和修改已保留，请检查网络或本机工具后重试'
  function send(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
  function job(session, label, action, login = false) {
    if (busy || editing || uploadsInFlight) throw new AppError('已有任务正在处理，请等待完成', 409)
    const task = { id: randomUUID(), label, status: 'running', message: label, startedAt: new Date().toISOString(), owner: session.id, login }
    jobs.set(task.id, task); busy = task.id
    Promise.resolve().then(() => action((message, extra = {}) => Object.assign(task, { message, ...extra }))).then(result => { task.status = 'done'; task.result = result; task.message = label + '已完成' }).catch(error => { task.status = 'error'; task.message = errorMessage(error) }).finally(() => { task.finishedAt = new Date().toISOString(); busy = null })
    return { id: task.id }
  }
  async function serve(res, path, req) {
    const info = await stat(path).catch(() => { throw new AppError('文件不存在', 404) })
    if (!info.isFile()) throw new AppError('文件不存在', 404)
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' }[extname(path)] || 'application/octet-stream'
    const headers = { 'Content-Type': mime, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' }
    let start = 0, end = info.size - 1, status = 200
    if (req.headers.range) {
      const match = req.headers.range.match(/^bytes=(\d+)-(\d*)$/)
      if (!match) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); res.end(); return }
      start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end
      if (start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); res.end(); return }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`
    }
    headers['Content-Length'] = end - start + 1
    res.writeHead(status, headers)
    if (req.method === 'HEAD') res.end(); else await pipeline(createReadStream(path, { start, end }), res)
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: https://avatars.githubusercontent.com; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'")
    try {
      if (req.headers.host !== `127.0.0.1:${actualPort}`) throw new AppError('请使用后台本机地址打开', 403)
      const url = new URL(req.url, origin()); const path = decodeURIComponent(url.pathname)
      if (['/', '/app.js', '/style.css'].includes(path) && ['GET', 'HEAD'].includes(req.method)) { await serve(res, join(UI, path === '/' ? 'index.html' : path.slice(1)), req); return }
      let sid = (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith('portfolio_admin='))?.slice(16)
      let session = sessions.get(sid)
      if ((!session || Date.now() - session.at > 43200000) && path === '/api/session' && req.method === 'GET') {
        sid = randomBytes(32).toString('hex'); session = { id: sid, csrf: randomBytes(32).toString('hex'), at: Date.now(), connection: null }; sessions.set(sid, session)
        res.setHeader('Set-Cookie', `portfolio_admin=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`)
      }
      if (!session || Date.now() - session.at > 43200000) throw new AppError('请重新打开后台并连接 GitHub', 401)
      if (!['GET', 'HEAD'].includes(req.method) && (req.headers.origin !== origin() || req.headers['x-admin-csrf'] !== session.csrf)) throw new AppError('请求来源无效，请刷新后台后重试', 403)
      if (path === '/api/session' && req.method === 'GET') { send(res, 200, { csrf: session.csrf, user: session.connection?.user ?? null, revision: library.revision, site: SITE, busy }); return }
      if (path === '/api/connect' && req.method === 'POST') { session.connection = await authConnect(root); send(res, 200, { user: session.connection.user }); return }
      if (path === '/api/sign-in' && req.method === 'POST') { send(res, 202, job(session, 'GitHub 登录', async () => { session.connection = await authLogin(root); return { user: session.connection.user } }, true)); return }
      if (path.startsWith('/api/jobs/') && req.method === 'GET') {
        const task = jobs.get(path.slice(10)); if (!task || task.owner !== session.id) throw new AppError('找不到任务', 404)
        const { owner, ...publicTask } = task; send(res, 200, publicTask); return
      }
      if (!session.connection) throw new AppError('请先连接 GitHub 账号', 401)
      if (path === '/api/disconnect' && req.method === 'POST') { session.connection = null; send(res, 200, { ok: true }); return }
      if (path === '/api/library' && req.method === 'GET') {
        send(res, 200, { works: await library.list(), revision: library.revision, pending: await hasChanges(root) || Boolean((await library.pendingPaths()).length), categories: CATEGORIES, busy }); return
      }
      if (path === '/api/history' && req.method === 'GET') { send(res, 200, (await library.history()).map(({ before, after, ...item }) => item)); return }
      if (path.startsWith('/media/') && ['GET', 'HEAD'].includes(req.method)) {
        const relative = path.slice(7); const allowed = new Set((await library.list()).flatMap(work => [work.video, work.cover, work.poster, ...[...(work.materials ?? []), ...(work.screenshots ?? [])].flatMap(item => [item.src, item.thumbnail])]))
        if (!allowed.has('/' + relative)) throw new AppError('素材未关联作品', 404)
        await serve(res, safePath(join(root, 'public'), relative), req); return
      }
      if (path === '/api/uploads' && req.method === 'POST') {
        const input = await jsonBody(req); const id = randomUUID(); const name = String(input.name || '素材').split(/[\\/]/).at(-1).slice(0, 160)
        await mkdir(join(library.state, 'uploads'), { recursive: true })
        await writeFile(join(library.state, 'uploads', id + '.pending.json'), JSON.stringify({ name }))
        send(res, 201, { id }); return
      }
      if (path.startsWith('/api/uploads/') && req.method === 'PUT') {
        if (busy || editing) throw new AppError('已有任务正在处理', 409)
        const id = path.slice(13); if (!/^[a-f0-9-]{36}$/.test(id)) throw new AppError('上传编号无效')
        const meta = JSON.parse(await readFile(join(library.state, 'uploads', id + '.pending.json'), 'utf8').catch(() => { throw new AppError('上传编号无效', 404) }))
        const declared = Number(req.headers['content-length']); if (declared > 2 * 1024 ** 3) throw new AppError('单个原文件请控制在 2 GB 内', 413)
        let bytes = 0
        const limiter = new Transform({ transform(chunk, encoding, done) { bytes += chunk.length; if (bytes > 2 * 1024 ** 3) done(new AppError('文件过大', 413)); else done(null, chunk) } })
        uploadsInFlight++
        try { await pipeline(req, limiter, createWriteStream(join(library.state, 'uploads', id + '.bin'), { flags: 'wx' })) } finally { uploadsInFlight-- }
        if (!bytes) throw new AppError('上传文件为空')
        await writeFile(join(library.state, 'uploads', id + '.json'), JSON.stringify({ name: meta.name, bytes }))
        send(res, 200, { id, bytes }); return
      }
      if (path === '/api/works' && req.method === 'POST') { const input = await jsonBody(req); send(res, 202, job(session, '上传视频', progress => media.video(input, progress))); return }
      if (path === '/api/images' && req.method === 'POST') { const input = await jsonBody(req); send(res, 202, job(session, '添加素材图片', progress => media.images(input, progress))); return }
      if (path.startsWith('/api/works/') && req.method === 'PATCH') {
        if (busy || editing || uploadsInFlight) throw new AppError('请等待当前任务完成', 409)
        editing = true
        try { const input = await jsonBody(req); const work = await library.patch(path.slice(11), input, input.revision); send(res, 200, { work, revision: library.revision }) } finally { editing = false }
        return
      }
      if (path.startsWith('/api/undo/') && req.method === 'POST') {
        if (busy || editing || uploadsInFlight) throw new AppError('请等待当前任务完成', 409)
        editing = true
        try { const input = await jsonBody(req); const work = await library.undo(path.slice(10), input.revision); send(res, 200, { work, revision: library.revision }) } finally { editing = false }
        return
      }
      if (path === '/api/publish' && req.method === 'POST') { send(res, 202, job(session, '发布网站', progress => publisher(root, library, session.connection.token, progress))); return }
      throw new AppError('找不到这个后台接口', 404)
    } catch (error) { if (!res.headersSent && !res.destroyed) send(res, error.status || 500, { message: errorMessage(error) }); else if (!res.destroyed) res.destroy() }
  })
  server.requestTimeout = 600000
  return { server, library, async start() { await library.init(); await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) }); actualPort = server.address().port; return origin() } }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createAdminServer(); app.start().then(url => console.log('素材后台：' + url)).catch(error => { console.error(error.code === 'EADDRINUSE' ? '后台已经启动，请打开 http://127.0.0.1:5230' : '后台启动失败'); process.exitCode = 1 })
}
