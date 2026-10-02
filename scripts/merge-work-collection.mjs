import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { pathToFileURL } from 'node:url'

export function readWorkCollection(source) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
  return JSON.parse(JSON.stringify(exports.WORKS))
}

/** Updates are additive: entries absent from an import remain in their original order. */
export function mergeWorkCollection(existing, imported) {
  const updates = new Map(imported.map(work => [work.slug, work]))
  if (updates.size !== imported.length) throw new Error('Duplicate imported slugs.')
  let nextNumber = Math.max(0, ...existing.map(work => Number(work.no) || 0)) + 1
  const merged = existing.map(work => {
    const update = updates.get(work.slug)
    if (!update) return work
    updates.delete(work.slug)
    return { ...update, id: work.id, no: work.no, ...(work.visibility ? { visibility: work.visibility } : {}) }
  })
  for (const work of updates.values()) merged.push({ ...work, no: String(nextNumber++).padStart(2, '0') })
  for (const key of ['id', 'slug', 'video', 'no']) {
    if (new Set(merged.map(work => work[key])).size !== merged.length) throw new Error(`Duplicate work ${key}.`)
  }
  return merged
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const existing = readWorkCollection(readFileSync(process.argv[2], 'utf8'))
  const imported = JSON.parse(readFileSync(0, 'utf8'))
  process.stdout.write(JSON.stringify(mergeWorkCollection(existing, imported)))
}
