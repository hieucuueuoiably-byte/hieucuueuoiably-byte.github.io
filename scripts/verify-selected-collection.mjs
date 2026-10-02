import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { readWorkCollection, mergeWorkCollection } from './merge-work-collection.mjs'

const source = readFileSync(new URL('../src/data/works.ts', import.meta.url), 'utf8')
const allWorks = readWorkCollection(source)
const report = JSON.parse(readFileSync(new URL('../docs/selected-collection-report.json', import.meta.url)))
const originals = JSON.parse(readFileSync(new URL('../docs/original-collection.json', import.meta.url))).works
for (const original of originals) {
  const restored = allWorks.find(work => work.slug === original.slug)
  assert(restored, `Missing existing work: ${original.slug}`)
  for (const key of ['id', 'slug', 'no', 'video']) assert.equal(restored[key], original[key], `Existing identity changed: ${original.slug}/${key}`)
}
const selectedSlugs = new Set(report.works.map(work => work.slug))
const works = allWorks.filter(work => selectedSlugs.has(work.slug))
assert(allWorks.length >= originals.length + works.length)
for (const key of ['id', 'slug', 'video', 'no']) assert.equal(new Set(allWorks.map(work => work[key])).size, allWorks.length, key)
// Reimporting the shortlist must preserve old entries, numbering and order.
assert.deepEqual(mergeWorkCollection(allWorks, works), allWorks)
assert.deepEqual(mergeWorkCollection(allWorks, [works[0]]), allWorks)
assert.equal(mergeWorkCollection(originals, works).length, originals.length + works.length)
const publicRoot = resolve('public')
assert.equal(works.length, 30)
assert.equal(new Set(works.map(w => w.video)).size, 30)
assert.equal(new Set(report.works.map(w => w.sourceSHA256)).size, 30)
assert.equal(new Set(report.works.map(w => w.webSHA256)).size, 30)
assert(allWorks.every(work => ['AI 短片', '动画影像', '带货预热'].includes(work.category)))
const files = new Set()
for (const work of allWorks) {
  for (const path of [work.video, work.cover, work.poster, ...[...(work.materials ?? []), ...(work.screenshots ?? [])].flatMap(m => [m.src, m.thumbnail])]) if (path) files.add(path)
}
for (const work of works) {
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
assert(new Set(works.flatMap(w => w.materials.map(m => m.src))).size >= 295)
const categories = readFileSync(new URL('../src/data/categories.ts', import.meta.url), 'utf8')
for (const cover of [...categories.matchAll(/coverSlug: '([^']+)'/g)].map(m => m[1])) assert(allWorks.some(w => w.slug === cover))
console.log(`PASS: ${originals.length} original works preserved, ${works.length} selected additions, ${allWorks.length} total works, additive/idempotent imports, ${files.size} valid assets, H.264/AAC and faststart for selected videos.`)
