import { spawn } from 'node:child_process'
import { mkdir, open } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url)); const url = 'http://127.0.0.1:5230'
let running = false
try { const result = await fetch(url + '/api/session', { signal: AbortSignal.timeout(1500) }); running = result.ok } catch {}
if (!running) {
  await mkdir(join(root, '.admin-data'), { recursive: true })
  const log = await open(join(root, '.admin-data/server.log'), 'a')
  const child = spawn(process.execPath, [join(root, 'scripts/admin/server.mjs')], { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', log.fd, log.fd] })
  child.unref(); await log.close()
  for (let at = 0; at < 25; at++) {
    try { const response = await fetch(url + '/api/session'); if (response.ok) { running = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}
if (!running) { console.error('后台未能启动，请查看 .admin-data/server.log'); process.exitCode = 1 }
else { console.log('素材后台已启动：' + url); if (!process.argv.includes('--no-browser')) { const browser = spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process '${url}'`], { windowsHide: true, stdio: 'ignore' }); browser.unref() } }
