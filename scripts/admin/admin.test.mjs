import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { Library, safePath } from './library.mjs'
import { Media } from './media.mjs'
import { createAdminServer } from './server.mjs'
import { command, hasChanges, publish } from './github.mjs'
import { readWorkCollection, mergeWorkCollection } from '../merge-work-collection.mjs'

const source = await readFile(fileURLToPath(new URL('../../src/data/works.ts', import.meta.url)), 'utf8')
const originals = readWorkCollection(source)
async function fixture(t, assets = false) {
  const parent = resolve(tmpdir()); const root = await mkdtemp(join(parent, 'portfolio-admin-test-'))
  t.after(async () => { const target = resolve(root); assert.ok(target.startsWith(parent + sep) && target.split(sep).at(-1).startsWith('portfolio-admin-test-')); await rm(target, { recursive: true, force: true }) })
  await mkdir(join(root, 'src/data'), { recursive: true }); await writeFile(join(root, 'src/data/works.ts'), source)
  if (assets) for (const work of originals) { const path = safePath(join(root, 'public'), work.video); await mkdir(join(root, 'public/videos'), { recursive: true }); await writeFile(path, Buffer.from('fixture-video-' + work.id)) }
  await command('git', ['init', '--quiet', '-b', 'main'], root)
  await command('git', ['config', 'user.name', 'Admin Test'], root); await command('git', ['config', 'user.email', 'admin-test@example.invalid'], root)
  await command('git', ['add', 'src/data/works.ts'], root); await command('git', ['commit', '--quiet', '-m', 'Fixture'], root)
  const library = new Library(root); await library.init(); return { root, library }
}
test('下架、改名和分类不会删除任何原作品，恢复只影响目标作品', async t => {
  const { library, root } = await fixture(t, true)
  const before = await library.list(), target = before[0]
  const updated = await library.patch(target.id, { visibility: 'offline', title: '测试改名', category: '带货预热' }, 0)
  assert.equal(updated.visibility, 'offline'); assert.equal((await library.list()).length, originals.length)
  assert.deepEqual((await library.list()).slice(1), before.slice(1))
  assert.deepEqual(['id', 'slug', 'no', 'video'].map(key => updated[key]), ['id', 'slug', 'no', 'video'].map(key => target[key]))
  assert.ok((await stat(safePath(join(root, 'public'), target.video))).size)
  await assert.rejects(library.patch(target.id, { title: '旧页面覆盖' }, 0), /数据已变化/)
  const history = await library.history(); await library.undo(history[0].id, 1)
  assert.deepEqual(await library.list(), before)
  await library.patch(target.id, { visibility: 'offline' }, 2)
  const merged = mergeWorkCollection(await library.list(), [target])
  assert.equal(merged[0].visibility, 'offline'); assert.equal(merged.length, originals.length)
})
test('图片隐藏可恢复，重复图片只关联一次，拒绝无关路径', async t => {
  const { library } = await fixture(t)
  const selected = originals.find(work => work.materials?.length && work.screenshots?.length)
  await library.patch(selected.id, { materialVisibility: [{ src: selected.materials[0].src, hidden: true }, { src: selected.screenshots[0].src, hidden: true }] }, 0)
  let work = (await library.list()).find(item => item.id === selected.id)
  assert.equal(work.materials[0].hidden, true); assert.equal(work.screenshots[0].hidden, true)
  await assert.rejects(library.patch(selected.id, { materialVisibility: [{ src: '/other.jpg', hidden: false }] }, 1), /图片状态/)
  const image = { src: '/materials/managed-ref-test.jpg', thumbnail: '/materials/thumbs/managed-ref-test.jpg', title: '测试', kind: 'reference' }
  await library.addImages(selected.id, [image, image, image], [])
  work = (await library.list()).find(item => item.id === selected.id)
  assert.equal(work.materials.filter(item => item.src === image.src).length, 1)
  assert.throws(() => safePath(library.state, '../secret'), /路径/)
  assert.throws(() => safePath(library.state, 'x\\..\\secret'), /路径/)
})
test('发布失败后已提交但未推送的版本仍标记为待发布', async t => {
  const { library, root } = await fixture(t)
  await command('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], root)
  assert.equal(await hasChanges(root), false)
  await library.patch(originals[0].id, { title: '待发布作品' }, 0); assert.equal(await hasChanges(root), true)
  await command('git', ['add', 'src/data/works.ts'], root); await command('git', ['commit', '--quiet', '-m', 'Local draft'], root)
  assert.equal(await hasChanges(root), true)
  await command('git', ['remote', 'add', 'origin', 'https://example.invalid/wrong.git'], root)
  await assert.rejects(publish(root, library, 'fake-token', () => {}), /仓库地址/)
})
test('后台限制本机来源、登录与 CSRF，凭证不返回浏览器，视频支持 Range', async t => {
  const { root } = await fixture(t, true)
  let finishPublish
  const app = createAdminServer({ root, port: 0, authConnect: async () => ({ token: 'PRIVATE_TEST_TOKEN', user: { login: 'test-owner', avatar: 'https://avatars.githubusercontent.com/u/1', name: 'Test' } }), publisher: async () => new Promise(resolve => { finishPublish = resolve }) })
  const origin = await app.start(); t.after(async () => { app.server.closeAllConnections(); await new Promise(resolve => app.server.close(resolve)) })
  const sessionResponse = await fetch(origin + '/api/session'), cookie = sessionResponse.headers.get('set-cookie').split(';')[0], session = await sessionResponse.json()
  const request = (path, method = 'GET', body, extra = {}) => fetch(origin + path, { method, headers: { Cookie: cookie, Origin: origin, 'X-Admin-CSRF': session.csrf, 'Content-Type': 'application/json', ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  assert.equal((await request('/api/library')).status, 401)
  assert.equal((await request('/api/connect', 'POST', {}, { Origin: 'https://evil.invalid' })).status, 403)
  assert.equal((await request('/api/connect', 'POST', {}, { 'X-Admin-CSRF': 'invalid' })).status, 403)
  const foreignHost = await new Promise((resolve, reject) => { const req = httpRequest(origin + '/api/session', { headers: { Host: 'evil.invalid' } }, res => { res.resume(); resolve(res.statusCode) }); req.on('error', reject); req.end() })
  assert.equal(foreignHost, 403)
  const connected = await request('/api/connect', 'POST', {}); assert.equal(connected.status, 200); assert.ok(!(await connected.text()).includes('PRIVATE_TEST_TOKEN'))
  const data = await (await request('/api/library')).json(); assert.equal(data.works.length, originals.length)
  const range = await request('/media' + originals[0].video, 'GET', undefined, { Range: 'bytes=1-4' }); assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 4)
  assert.equal((await request('/media/unknown.mp4')).status, 404)
  assert.equal((await request('/media/%2e%2e%2f.admin-data/history.json')).status, 404)
  const patch = await request('/api/works/' + originals[0].id, 'PATCH', { revision: data.revision, visibility: 'offline' }); assert.equal(patch.status, 200)
  const conflict = await request('/api/works/' + originals[0].id, 'PATCH', { revision: data.revision, title: '不应覆盖' }); assert.equal(conflict.status, 409); assert.match((await conflict.json()).message, /数据已变化/)
  const empty = await (await request('/api/uploads', 'POST', { name: 'empty.mp4' })).json()
  assert.equal((await fetch(origin + '/api/uploads/' + empty.id, { method: 'PUT', headers: { Cookie: cookie, Origin: origin, 'X-Admin-CSRF': session.csrf }, body: new Uint8Array() })).status, 400)
  const upload = await (await request('/api/uploads', 'POST', { name: '../private-test.bin' })).json()
  const stored = await fetch(origin + '/api/uploads/' + upload.id, { method: 'PUT', headers: { Cookie: cookie, Origin: origin, 'X-Admin-CSRF': session.csrf }, body: Buffer.from('private-upload') })
  assert.equal(stored.status, 200); assert.equal((await stored.json()).bytes, 14)
  assert.equal(await readFile(join(root, '.admin-data/uploads', upload.id + '.bin'), 'utf8'), 'private-upload')
  assert.equal(JSON.parse(await readFile(join(root, '.admin-data/uploads', upload.id + '.json'))).name, 'private-test.bin')
  assert.equal((await request('/media/.admin-data/uploads/' + upload.id + '.bin')).status, 404)
  const job = await (await request('/api/publish', 'POST', {})).json()
  await new Promise(resolve => setTimeout(resolve, 25))
  assert.equal((await request('/api/works/' + originals[0].id, 'PATCH', { revision: 1, title: '任务中' })).status, 409)
  assert.equal((await request('/api/publish', 'POST', {})).status, 409)
  finishPublish({ url: 'https://example.invalid/', sha: 'test' }); await new Promise(resolve => setTimeout(resolve, 25))
  assert.equal((await (await request('/api/jobs/' + job.id)).json()).status, 'done')
  assert.ok(!(await (await request('/api/session')).text()).includes('PRIVATE_TEST_TOKEN'))
  assert.equal((await request('/api/disconnect', 'POST', {})).status, 200); assert.equal((await request('/api/library')).status, 401)
})
test('生成上线文件时排除下架视频和路由，本机原文件与所有作品记录保留', async t => {
  const { root, library } = await fixture(t, true)
  await library.patch(originals[0].id, { visibility: 'offline' }, 0)
  await mkdir(join(root, 'dist/videos'), { recursive: true }); await mkdir(join(root, 'dist/videos/mobile'), { recursive: true })
  for (const work of originals) await writeFile(safePath(join(root, 'dist'), work.video), 'deployment-fixture')
  const alternate = originals[0].video.replace('/videos/', '/videos/mobile/')
  await writeFile(safePath(join(root, 'dist'), alternate), 'mobile-deployment-fixture')
  await writeFile(join(root, 'dist/index.html'), '<!doctype html><script src="/assets/app.js"></script>')
  await writeFile(join(root, 'src/data/categories.ts'), await readFile(fileURLToPath(new URL('../../src/data/categories.ts', import.meta.url)), 'utf8'))
  let generator = await readFile(fileURLToPath(new URL('../build-github-pages.mjs', import.meta.url)), 'utf8')
  generator = generator.replace("'typescript'", JSON.stringify(new URL('../../node_modules/typescript/lib/typescript.js', import.meta.url).href))
    .replace("'./merge-work-collection.mjs'", JSON.stringify(new URL('../merge-work-collection.mjs', import.meta.url).href))
    .replace("const project = fileURLToPath(new URL('../', import.meta.url))", 'const project = ' + JSON.stringify(root))
  await writeFile(join(root, 'build-test.mjs'), generator)
  await command(process.execPath, ['build-test.mjs'], root)
  assert.equal((await library.list()).length, originals.length)
  assert.ok((await stat(safePath(join(root, 'public'), originals[0].video))).size)
  await assert.rejects(stat(safePath(join(root, 'dist'), originals[0].video)), { code: 'ENOENT' })
  await assert.rejects(stat(safePath(join(root, 'dist'), alternate)), { code: 'ENOENT' })
  await assert.rejects(stat(join(root, 'dist/works', originals[0].slug, 'index.html')), { code: 'ENOENT' })
  for (const work of (await library.list()).filter(item => item.visibility !== 'offline')) { assert.ok((await stat(safePath(join(root, 'dist'), work.video))).size); assert.ok((await stat(join(root, 'dist/works', work.slug, 'index.html'))).size) }
})
test('真实转码完整视频、生成封面、追加作品，重复上传不增加条数', { timeout: 120000 }, async t => {
  const { root, library } = await fixture(t, true)
  const input = join(root, 'synthetic.mp4')
  await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=purple:s=160x90:r=12:d=1.5', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '1.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', input], root)
  const image = join(root, 'synthetic.png')
  await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=orange:s=100x80', '-frames:v', '1', image], root)
  async function store(path, name) { const id = randomUUID(), bytes = await readFile(path); await mkdir(join(library.state, 'uploads'), { recursive: true }); await writeFile(join(library.state, 'uploads', id + '.bin'), bytes); await writeFile(join(library.state, 'uploads', id + '.json'), JSON.stringify({ name, bytes: bytes.length })); return id }
  const uploadId = await store(input, 'synthetic.mp4'), imageId = await store(image, 'reference.png'), media = new Media(root, library)
  const result = await media.video({ uploadId, title: '独立测试视频', category: 'AI 短片', materialUploadIds: [imageId], visibility: 'offline' }, () => {})
  assert.equal(result.duplicate, false); assert.equal((await library.list()).length, originals.length + 1); assert.deepEqual((await library.list()).slice(0, originals.length), originals)
  assert.equal(result.work.visibility, 'offline'); assert.equal(result.work.no, String(Math.max(...originals.map(work => Number(work.no))) + 1).padStart(2, '0'))
  const output = safePath(join(root, 'public'), result.work.video), bytes = await readFile(output)
  assert.ok(bytes.indexOf(Buffer.from('moov')) > 0 && bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat')))
  const probe = JSON.parse((await command('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output], root)).stdout)
  assert.equal(probe.streams.find(stream => stream.codec_type === 'video').codec_name, 'h264'); assert.equal(probe.streams.find(stream => stream.codec_type === 'video').pix_fmt, 'yuv420p'); assert.ok(Math.abs(Number(probe.format.duration) - 1.5) < .2)
  for (const relative of [result.work.cover, result.work.poster, result.work.materials[0].src, result.work.materials[0].thumbnail]) assert.ok((await stat(safePath(join(root, 'public'), relative))).size)
  const duplicate = await media.video({ uploadId, title: '相同视频', category: 'AI 短片' }, () => {}); assert.equal(duplicate.duplicate, true); assert.equal(duplicate.work.id, result.work.id); assert.equal((await library.list()).length, originals.length + 1)
  await media.images({ workId: result.work.id, uploadIds: [imageId, imageId] }, () => {})
  assert.equal((await library.list()).at(-1).materials.length, 1)
  const uploadHistory = (await library.history()).find(item => item.label === '上传视频')
  await library.undo(uploadHistory.id, library.revision); assert.equal((await library.list()).length, originals.length + 1); assert.equal((await library.list()).at(-1).visibility, 'offline'); assert.ok((await stat(output)).size)
})
