const $ = selector => document.querySelector(selector)
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
let csrf = '', works = [], revision = 0, categories = [], currentView = 'library', locked = false, pending = false
let toastTimer
function notify(message, error = false) { $('#toast').textContent = message; $('#toast').className = 'toast' + (error ? ' error' : ''); $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true }, error ? 10000 : 5000) }
async function api(path, method = 'GET', body) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Admin-CSRF': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) { const error = new Error(data.message || '请求未完成，请重试'); error.status = response.status; throw error }
  return data
}
function lock(value) { locked = value; document.querySelectorAll('[data-lock]').forEach(element => { element.disabled = value }); $('#connect').disabled = value; $('#sign-in').disabled = value; $('#disconnect').disabled = value }
const mediaURL = path => '/media' + path
function account(user) { $('#login').hidden = Boolean(user); $('#workspace').hidden = !user; if (user) { $('#avatar').src = user.avatar; $('#account-name').textContent = user.login } }
function render() {
  const active = works.filter(work => work.visibility !== 'offline')
  $('#total-count').textContent = works.length; $('#nav-count').textContent = works.length; $('#published-count').textContent = active.length; $('#offline-count').textContent = works.length - active.length
  $('#image-count').textContent = works.reduce((sum, work) => sum + (work.materials?.length || 0) + (work.screenshots?.length || 0), 0)
  $('#draft-banner').hidden = !pending
  const query = $('#search').value.trim().toLowerCase(), category = $('#category-filter').value, status = $('#status-filter').value
  const filtered = works.filter(work => (!query || [work.title, work.description, ...(work.tags ?? [])].join(' ').toLowerCase().includes(query)) && (!category || work.category === category) && (!status || (work.visibility === 'offline' ? 'offline' : 'published') === status))
  $('#list-count').textContent = `${filtered.length} 条`; $('#empty').hidden = filtered.length > 0
  $('#work-grid').innerHTML = filtered.map(work => { const offline = work.visibility === 'offline'; const images = (work.materials?.length || 0) + (work.screenshots?.length || 0); return `<article class="work-card"><button type="button" class="card-cover" data-preview="${esc(work.id)}" aria-label="预览 ${esc(work.title)}"><img src="${esc(mediaURL(work.cover))}" alt="${esc(work.title)}" loading="lazy" /><span class="play-icon">▷</span><span class="status-chip ${offline ? 'offline' : ''}">${offline ? '已下架' : '上架展示'}</span><span class="duration">${esc(work.duration)}</span></button><div class="card-body"><div class="card-meta"><span>${esc(work.category)}</span><span>No. ${esc(work.no)}</span></div><h3 title="${esc(work.title)}">${esc(work.title)}</h3><p>${images ? `${images} 张关联图片` : '暂未添加关联图片'}</p><div class="card-actions"><button type="button" data-edit="${esc(work.id)}" data-lock>编辑作品 ↗</button><button type="button" data-toggle="${esc(work.id)}" data-lock>${offline ? '重新上架' : '下架'}</button></div></div></article>` }).join('')
  const selected = $('#image-work').value
  $('#image-work').innerHTML = works.map(work => `<option value="${esc(work.id)}">${esc(work.no)} · ${esc(work.title)}</option>`).join(''); if (works.some(work => work.id === selected)) $('#image-work').value = selected
  lock(locked)
}
async function loadLibrary() { const data = await api('/api/library'); works = data.works; revision = data.revision; pending = data.pending; categories = data.categories; const selected = $('#category-filter').value; $('#category-filter').innerHTML = '<option value="">全部分类</option>' + categories.map(category => `<option>${esc(category)}</option>`).join(''); $('#category-filter').value = selected; document.querySelectorAll('.category-options').forEach(select => { const previous = select.value; select.innerHTML = categories.map(category => `<option>${esc(category)}</option>`).join(''); if (previous) select.value = previous }); render(); return data }
async function history() {
  const entries = await api('/api/history')
  $('#history-list').innerHTML = entries.length ? entries.map(entry => `<div class="history-row"><div><div class="history-label">${esc(entry.label)}</div><strong>${esc(entry.title)}</strong><span>${esc(new Date(entry.at).toLocaleString('zh-CN'))}</span></div><button type="button" class="secondary small" data-undo="${esc(entry.id)}" data-lock>${entry.before === null ? '撤下新增作品' : '恢复修改前'}</button></div>`).join('') : '<p class="empty">还没有修改记录。原有作品已完整保留在作品库中。</p>'
  lock(locked)
}
async function view(name) { currentView = name; const copy = { library: ['作品库', '在这里整理视频与参考图片，选择哪些作品展示在网站上。'], upload: ['上传素材', '添加新作品，或把参考图片关联到已有作品。'], history: ['修改记录', '每次修改都留有记录，作品与素材可以恢复。'] }; const [title, description] = copy[name]; $('#view-title').innerHTML = esc(title) + '<span class="title-dot">.</span>'; $('#view-description').textContent = description; ['library', 'upload', 'history'].forEach(key => { $(`#${key}-view`).hidden = key !== name }); document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name)); if (name === 'history') await history() }
function task(label, message, percent) { $('#task-panel').hidden = false; $('#task-title').textContent = label; $('#task-message').textContent = message; $('#task-spinner').hidden = false; $('#task-result').hidden = true; if (percent === undefined) $('#task-progress').removeAttribute('value'); else $('#task-progress').value = percent }
async function monitor(id, label) {
  lock(true)
  try { for (;;) { const job = await api('/api/jobs/' + id); task(label, job.message); if (job.runUrl) { $('#task-result').href = job.runUrl; $('#task-result').hidden = false; $('#task-result').textContent = '查看 GitHub 发布记录 ↗' } if (job.status === 'error') throw new Error(job.message); if (job.status === 'done') { $('#task-spinner').hidden = true; $('#task-progress').value = 100; if (job.result?.runUrl) { $('#task-result').href = job.result.runUrl; $('#task-result').hidden = false; $('#task-result').textContent = '查看 GitHub 发布记录 ↗' } return job.result } await new Promise(resolve => setTimeout(resolve, 1200)) } }
  catch (error) { $('#task-spinner').hidden = true; $('#task-message').textContent = error.message; throw error }
  finally { lock(false) }
}
async function bootstrap() { const session = await api('/api/session'); csrf = session.csrf; $('#site-link').href = session.site + '/'; account(session.user); if (session.user) { await loadLibrary(); if (session.busy) { await monitor(session.busy, '继续当前任务'); await loadLibrary() } } }
$('#connect').addEventListener('click', async () => { lock(true); $('#login-message').textContent = '正在连接 GitHub…'; try { const result = await api('/api/connect', 'POST', {}); account(result.user); await loadLibrary(); $('#login-message').textContent = '' } catch (error) { $('#login-message').textContent = error.message } finally { lock(false) } })
$('#sign-in').addEventListener('click', async () => { lock(true); $('#login-message').textContent = '请在打开的 GitHub 页面完成登录，后台会自动连接。'; try { const job = await api('/api/sign-in', 'POST', {}); const result = await monitor(job.id, 'GitHub 登录'); account(result.user); await loadLibrary(); $('#login-message').textContent = '' } catch (error) { $('#login-message').textContent = error.message } finally { lock(false) } })
$('#disconnect').addEventListener('click', async () => { try { await api('/api/disconnect', 'POST', {}); $('#task-panel').hidden = true; $('#preview-dialog').close(); account(null) } catch (error) { notify(error.message, true) } })
$('#search').addEventListener('input', render); $('#category-filter').addEventListener('change', render); $('#status-filter').addEventListener('change', render)
function edit(work) {
  const form = $('#edit-form'); ['id', 'title', 'category', 'description', 'longDescription'].forEach(key => { form.elements[key].value = work[key] || '' }); form.elements.visibility.value = work.visibility === 'offline' ? 'offline' : 'published'; form.elements.tags.value = (work.tags ?? []).join('，')
  const materials = [...(work.materials ?? []), ...(work.screenshots ?? [])]
  $('#edit-materials').innerHTML = materials.length ? materials.map(item => `<label class="material"><img src="${esc(mediaURL(item.thumbnail || item.src))}" alt="${esc(item.title)}" loading="lazy" /><span><input type="checkbox" data-src="${esc(item.src)}" ${item.hidden ? '' : 'checked'} data-lock /><small title="${esc(item.title)}">${esc(item.title)}</small></span></label>`).join('') : '<p class="subtle">暂无关联图片，可在「上传素材」中添加。</p>'
  lock(locked); $('#edit-dialog').showModal()
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return
  if (!['view', 'close', 'edit', 'preview', 'toggle', 'undo'].some(key => button.dataset[key])) return
  let ownsLock = false
  try {
    if (button.dataset.view) await view(button.dataset.view)
    if (button.dataset.close) $('#' + button.dataset.close).close()
    if (button.dataset.edit) edit(works.find(work => work.id === button.dataset.edit))
    if (button.dataset.preview) { const work = works.find(work => work.id === button.dataset.preview); $('#preview-title').textContent = work.title; const player = $('#preview-video'); player.poster = mediaURL(work.poster || work.cover); player.src = mediaURL(work.video); $('#preview-dialog').showModal() }
    if (button.dataset.toggle && !locked) { ownsLock = true; lock(true); const work = works.find(work => work.id === button.dataset.toggle), visibility = work.visibility === 'offline' ? 'published' : 'offline'; await api('/api/works/' + encodeURIComponent(work.id), 'PATCH', { visibility, revision }); await loadLibrary(); notify(visibility === 'offline' ? '作品已下架，素材仍保留。发布后网站会更新。' : '作品已重新上架。发布后网站会更新。') }
    if (button.dataset.undo && !locked) { ownsLock = true; lock(true); await api('/api/undo/' + button.dataset.undo, 'POST', { revision }); await loadLibrary(); await history(); notify('已恢复，发布后网站会更新。') }
  } catch (error) { notify(error.message, true); if (error.status === 409) await loadLibrary().catch(() => {}) }
  finally { if (ownsLock) lock(false) }
})
$('#preview-dialog').addEventListener('close', () => { const player = $('#preview-video'); player.pause(); player.removeAttribute('src'); player.load() })
$('#edit-form').addEventListener('submit', async event => {
  event.preventDefault(); if (locked) return; lock(true)
  try { const form = event.currentTarget; const input = Object.fromEntries(['title', 'category', 'visibility', 'description', 'longDescription'].map(key => [key, form.elements[key].value])); input.tags = form.elements.tags.value.split(/[,，]/).map(tag => tag.trim()).filter(Boolean); input.materialVisibility = [...$('#edit-materials').querySelectorAll('input')].map(item => ({ src: item.dataset.src, hidden: !item.checked })); input.revision = revision; await api('/api/works/' + encodeURIComponent(form.elements.id.value), 'PATCH', input); $('#edit-dialog').close(); await loadLibrary(); notify('修改已保存，发布后网站会更新。') } catch (error) { notify(error.message, true); if (error.status === 409) await loadLibrary().catch(() => {}) } finally { lock(false) }
})
function validateImages(files) { if (files.length > 40) throw new Error('每次最多选择 40 张图片'); if (files.some(file => file.size > 25 * 1024 * 1024)) throw new Error('单张图片请控制在 25 MB 内') }
async function upload(file, position, count) {
  if (!file.size) throw new Error('文件为空，请重新选择'); if (file.size > 2 * 1024 ** 3) throw new Error('单个原文件请控制在 2 GB 内')
  const { id } = await api('/api/uploads', 'POST', { name: file.name })
  await new Promise((resolve, reject) => { const request = new XMLHttpRequest(); request.open('PUT', '/api/uploads/' + id); request.setRequestHeader('X-Admin-CSRF', csrf); request.setRequestHeader('Content-Type', 'application/octet-stream'); request.upload.addEventListener('progress', event => { task('保存原文件', `${position}/${count} · ${file.name}`, event.lengthComputable ? event.loaded / event.total * 100 : undefined) }); request.onload = () => { let result; try { result = JSON.parse(request.responseText) } catch { result = {} } if (request.status >= 200 && request.status < 300) resolve(result); else reject(new Error(result.message || '文件上传未完成，请重试')) }; request.onerror = () => reject(new Error('文件上传未完成，请检查后台是否运行')); request.onabort = () => reject(new Error('上传已取消')); request.send(file) })
  return id
}
$('#video-form').addEventListener('submit', async event => {
  event.preventDefault(); if (locked) return; const form = event.currentTarget
  try { const video = form.elements.video.files[0], images = [...form.elements.materials.files]; if (!video) throw new Error('请选择视频文件'); validateImages(images); const input = { title: form.elements.title.value, category: form.elements.category.value, description: form.elements.description.value, visibility: form.elements.visibility.value }; lock(true); task('保存原文件', '准备上传'); input.uploadId = await upload(video, 1, images.length + 1); input.materialUploadIds = []; for (let i = 0; i < images.length; i++) input.materialUploadIds.push(await upload(images[i], i + 2, images.length + 1)); const job = await api('/api/works', 'POST', input); const result = await monitor(job.id, '添加视频'); await loadLibrary(); if (result.duplicate) { $('#task-message').textContent = `已有「${result.work.title}」，本次未重复添加`; notify(`已有「${result.work.title}」，没有重复添加。`) } else { form.reset(); await view('library'); notify('新作品已保存，点击「发布到网站」上线。') } }
  catch (error) { $('#task-spinner').hidden = true; $('#task-message').textContent = error.message; notify(error.message, true) } finally { lock(false) }
})
$('#images-form').addEventListener('submit', async event => {
  event.preventDefault(); if (locked) return; const form = event.currentTarget
  try { const images = [...form.elements.images.files]; validateImages(images); if (!images.length) throw new Error('请选择素材图片'); const workId = form.elements.workId.value; lock(true); const uploadIds = []; for (let i = 0; i < images.length; i++) uploadIds.push(await upload(images[i], i + 1, images.length)); const job = await api('/api/images', 'POST', { workId, uploadIds }); await monitor(job.id, '添加素材图片'); await loadLibrary(); form.elements.images.value = ''; notify('素材图片已保存，发布后网站会更新。') }
  catch (error) { $('#task-spinner').hidden = true; $('#task-message').textContent = error.message; notify(error.message, true) } finally { lock(false) }
})
$('#publish').addEventListener('click', async () => {
  if (locked) return; lock(true); task('发布网站', '准备检查作品与素材')
  try { const job = await api('/api/publish', 'POST', {}); const result = await monitor(job.id, '发布网站'); await loadLibrary(); $('#task-message').textContent = '网站已更新，所有修改已发布'; if (result.url) { $('#site-link').href = result.url; notify('发布成功，网站已更新。') } } catch (error) { $('#task-spinner').hidden = true; $('#task-message').textContent = error.message; notify(error.message, true); await loadLibrary().catch(() => {}) } finally { lock(false) }
})
$('#video-form').elements.video.addEventListener('change', event => { const file = event.target.files[0]; const title = $('#video-form').elements.title; if (file && !title.value) title.value = file.name.replace(/\.[^.]+$/, '').slice(0, 100) })
bootstrap().catch(error => { $('#login-message').textContent = error.message; notify(error.message, true) })
