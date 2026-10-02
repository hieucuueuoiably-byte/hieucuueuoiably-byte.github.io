import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/data/works.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
vm.runInNewContext(code, { exports })
const works = exports.WORKS
const report = JSON.parse(readFileSync(new URL('../docs/selected-collection-report.json', import.meta.url)))
const publicRoot = resolve('public')
assert.equal(works.length, 30)
assert.equal(new Set(works.map(w => w.video)).size, 30)
assert.equal(new Set(report.works.map(w => w.sourceSHA256)).size, 30)
assert.equal(new Set(report.works.map(w => w.webSHA256)).size, 30)
assert.equal(works.filter(w => w.category === 'AI 短片').length, 12)
assert.equal(works.filter(w => w.category === '动画影像').length, 6)
assert.equal(works.filter(w => w.category === '带货预热').length, 12)
const files = new Set()
for (const work of works) {
  for (const path of [work.video, work.cover, work.poster, ...[...work.materials, ...work.screenshots].flatMap(m => [m.src, m.thumbnail])]) files.add(path)
  assert(work.materials.every(m => m.kind === 'reference'))
  assert(work.screenshots.every(m => m.kind === 'screenshot'))
  assert.equal(work.screenshots.length, 2)
  const web = report.works.find(w => w.slug === work.slug).webMetadata
  assert.equal(web.videoCodec, 'h264')
  assert.equal(web.pixelFormat, 'yuv420p')
  assert.equal(web.aspect, work.videoAspect)
  assert(web.audioCodecs.every(c => c === 'aac'))
  const data = readFileSync(resolve(publicRoot, work.video.slice(1)))
  const atoms = []
  for (let at = 0; at + 8 <= data.length;) {
    let size = data.readUInt32BE(at)
    atoms.push(data.toString('ascii', at + 4, at + 8))
    if (size === 1) size = Number(data.readBigUInt64BE(at + 8))
    if (!size) break
    at += size
  }
  assert(atoms.includes('moov') && atoms.indexOf('moov') < atoms.indexOf('mdat'), work.slug)
}
for (const path of files) {
  assert(!path.includes('..') && !path.includes('\\'))
  const file = resolve(publicRoot, path.slice(1))
  assert(existsSync(file) && statSync(file).size > 0, path)
  assert(statSync(file).size < 50 * 1024 * 1024, path)
}
assert.equal(new Set(works.flatMap(w => w.materials.map(m => m.src))).size, 295)
const categories = readFileSync(new URL('../src/data/categories.ts', import.meta.url), 'utf8')
for (const cover of [...categories.matchAll(/coverSlug: '([^']+)'/g)].map(m => m[1])) assert(works.some(w => w.slug === cover))
console.log(`PASS: 30 unique videos, 12/6/12 categories, 295 shared reference images, 60 labeled screenshots, ${files.size} valid assets, H.264/AAC and faststart.`)
