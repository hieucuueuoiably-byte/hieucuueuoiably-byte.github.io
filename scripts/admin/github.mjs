import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { AppError } from './library.mjs'

const exec = promisify(execFile)
export const REPO = 'hieucuueuoiably-byte/hieucuueuoiably-byte.github.io'
export const OWNER = 'hieucuueuoiably-byte'
export const SITE = 'https://hieucuueuoiably-byte.github.io'
export async function command(file, args, root, options = {}) {
  return exec(file, args, { cwd: root, windowsHide: true, timeout: 600000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }, ...options })
}
export async function github(token, path) {
  const response = await fetch('https://api.github.com' + path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Personal-Portfolio-Admin' }, signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new AppError(response.status === 401 ? 'GitHub 登录已失效，请重新连接' : `GitHub 暂时无法访问（${response.status}），请稍后重试`, response.status === 401 ? 401 : 502)
  return response.json()
}
async function credential(root, manager = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', manager ? ['credential-manager', 'get'] : ['credential', 'fill'], { cwd: root, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } })
    let output = ''; const timer = setTimeout(() => { child.kill(); reject(new AppError('GitHub 连接超时，请重新登录', 401)) }, 20000)
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 65536) child.kill() })
    child.stderr.on('data', () => {})
    child.on('error', () => { clearTimeout(timer); reject(new AppError('找不到 Git，请检查本机安装', 503)) })
    child.on('close', code => {
      clearTimeout(timer)
      const token = output.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9)
      output = ''
      if (code || !token) reject(new AppError('此电脑尚未连接 GitHub，请使用“在 GitHub 登录”', 401)); else resolve(token)
    })
    child.stdin.end('protocol=https\nhost=github.com\nusername=' + OWNER + '\n\n')
  })
}
export async function connect(root) {
  let token
  try { token = await credential(root) } catch { token = await credential(root, true) }
  const user = await github(token, '/user')
  if (user.login.toLowerCase() !== OWNER.toLowerCase()) throw new AppError(`请登录网站所有者 ${OWNER} 的 GitHub 账号`, 403)
  const repo = await github(token, `/repos/${REPO}`)
  if (!repo.permissions?.push) throw new AppError('当前 GitHub 账号没有网站仓库的写入权限', 403)
  return { token, user: { login: user.login, avatar: user.avatar_url, name: user.name || user.login } }
}
export async function webLogin(root) {
  await command('git', ['credential-manager', 'github', 'login', '--username', OWNER, '--browser'], root, { timeout: 300000, env: { ...process.env, GCM_INTERACTIVE: 'always' } })
  return connect(root)
}
export async function hasChanges(root) {
  const result = await command('git', ['status', '--porcelain', '--', 'src/data/works.ts'], root)
  if (result.stdout.trim()) return true
  try { return Number((await command('git', ['rev-list', '--count', 'origin/main..HEAD'], root)).stdout.trim()) > 0 } catch { return false }
}
function gitEnv(token) {
  return { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader', GIT_CONFIG_VALUE_0: 'AUTHORIZATION: basic ' + Buffer.from('x-access-token:' + token).toString('base64') }
}
export async function publish(root, library, token, progress) {
  const origin = (await command('git', ['remote', 'get-url', 'origin'], root)).stdout.trim()
  if (origin !== `https://github.com/${REPO}.git` && origin !== `https://github.com/${REPO}`) throw new AppError('网站仓库地址与后台配置不一致，已停止发布', 409)
  const branch = (await command('git', ['branch', '--show-current'], root)).stdout.trim()
  if (branch !== 'main') throw new AppError('请先切回网站的 main 分支', 409)
  const paths = [...new Set(['src/data/works.ts', ...await library.pendingPaths()])]
  if (paths.some(path => path.split('/').includes('..') || (path !== 'src/data/works.ts' && !/^public\/(videos|covers|media|materials)\/[a-zA-Z0-9/_.-]+$/.test(path)))) throw new AppError('待发布素材路径无效，已停止发布', 409)
  const staged = (await command('git', ['diff', '--cached', '--name-only'], root)).stdout.trim().split('\n').filter(Boolean)
  const changed = (await command('git', ['diff', '--name-only'], root)).stdout.trim().split('\n').filter(Boolean)
  if ([...staged, ...changed].some(path => !paths.includes(path))) throw new AppError('项目中有后台以外的未提交修改。为避免误发布，需先处理这些修改', 409)
  progress('检查 GitHub 上的最新版本')
  await command('git', ['fetch', 'origin', 'main'], root, { env: gitEnv(token) })
  try { await command('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], root) } catch { throw new AppError('GitHub 有更新的版本，请先同步项目后再发布；本地素材已保留', 409) }
  const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
  if (!existsSync(npm)) throw new AppError('找不到本机 npm，请重新安装 Node.js', 503)
  for (const script of ['verify:collection', 'verify:playback', 'verify:admin', 'build:pages']) {
    progress(script === 'build:pages' ? '生成网站页面' : '检查作品与素材')
    await command(process.execPath, [npm, 'run', script], root)
  }
  await command('git', ['add', '--', ...paths], root)
  const diff = await command('git', ['diff', '--cached', '--name-only'], root)
  if (diff.stdout.trim()) { progress('保存发布版本'); await command('git', ['commit', '--quiet', '-m', 'Update portfolio materials from personal admin'], root) }
  await library.track(['src/data/works.ts'])
  progress('上传至 GitHub')
  await command('git', ['push', 'origin', 'main'], root, { env: gitEnv(token), timeout: 600000 })
  const sha = (await command('git', ['rev-parse', 'HEAD'], root)).stdout.trim()
  progress('GitHub 正在更新网站', { sha, url: SITE + '/works/' })
  for (let attempt = 0; attempt < 60; attempt++) {
    const runs = await github(token, `/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=3`)
    const run = runs.workflow_runs.find(item => item.event === 'push' && item.path === '.github/workflows/pages.yml')
    if (run) progress('GitHub 正在更新网站', { sha, url: SITE + '/works/', runUrl: run.html_url })
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new AppError('GitHub 部署未成功。修改与素材已保留，可打开发布记录查看原因', 502)
      await library.clearPending()
      return { sha, url: SITE + '/works/', runUrl: run.html_url }
    }
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
  throw new AppError('素材已提交 GitHub，部署仍在进行，请稍后查看网站', 504)
}
