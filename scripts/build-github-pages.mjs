import { readFile, mkdir, copyFile, writeFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { readWorkCollection } from './merge-work-collection.mjs'

// GitHub Pages serves directory index files rather than an SPA rewrite rule.
// Emit an entry for each real route while keeping the existing BrowserRouter.
const project = fileURLToPath(new URL('../', import.meta.url))
const output = join(project, 'dist')
const entry = join(output, 'index.html')
const html = await readFile(entry, 'utf8')
const pageBase = process.env.PAGES_BASE_PATH ?? '/'
if (pageBase !== '' && pageBase !== '/') {
  throw new Error('Use the username.github.io repository or a custom domain. This site requires a root URL.')
}
if (!/src="\/assets\//.test(html)) {
  throw new Error('Expected a Vite build with base=/ before preparing Pages routes.')
}

function unwrap(node) {
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
    node = node.expression
  }
  return node
}

async function routeValues(relativeFile, variableName, propertyName) {
  const sourceText = await readFile(join(project, relativeFile), 'utf8')
  const source = ts.createSourceFile(relativeFile, sourceText, ts.ScriptTarget.Latest, true)
  let array
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === variableName && declaration.initializer) {
        array = unwrap(declaration.initializer)
      }
    }
  }
  if (!array || !ts.isArrayLiteralExpression(array)) {
    throw new Error(`${relativeFile}: ${variableName} must remain a literal array, or this route generator must be updated.`)
  }
  const values = array.elements.map(element => {
    const object = unwrap(element)
    if (!ts.isObjectLiteralExpression(object)) throw new Error(`Expected an object in ${variableName}.`)
    const property = object.properties.find(item =>
      ts.isPropertyAssignment(item) &&
      (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === propertyName
    )
    if (!property) throw new Error(`Missing ${propertyName} in ${variableName}.`)
    const value = unwrap(property.initializer)
    if (!ts.isStringLiteral(value) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.text)) {
      throw new Error(`Expected a safe literal ${propertyName} in ${variableName}.`)
    }
    return value.text
  })
  if (!values.length || new Set(values).size !== values.length) {
    throw new Error(`Empty or duplicate ${propertyName} entries in ${variableName}.`)
  }
  return values
}

const library = readWorkCollection(await readFile(join(project, 'src/data/works.ts'), 'utf8'))
const published = library.filter(work => work.visibility !== 'offline')
const works = published.map(work => work.slug)
if (new Set(works).size !== works.length || works.some(slug => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) throw new Error('Invalid published slugs.')
const categories = await routeValues('src/data/categories.ts', 'collections', 'id')
// Keep public assets in the deployment, including existing video URLs.
// Only an explicit offline state excludes a video from the generated site.
const publishedVideos = new Set(published.map(work => work.video))
for (const work of library.filter(work => work.visibility === 'offline')) {
  if (publishedVideos.has(work.video)) continue
  if (!/^\/videos\/[a-z0-9-]+\.mp4$/.test(work.video)) throw new Error('Unsafe offline video path.')
  for (const video of [work.video, work.video.replace('/videos/', '/videos/mobile/')]) {
    if (!publishedVideos.has(video)) await unlink(join(output, video.slice(1))).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}
const routes = [
  '/works',
  '/about',
  ...categories.map(id => `/works/category/${id}`),
  ...works.map(slug => `/works/${slug}`),
]
for (const route of routes) {
  const destination = join(output, route.slice(1), 'index.html')
  await mkdir(dirname(destination), { recursive: true })
  await copyFile(entry, destination)
}
// Unknown URLs still return HTTP 404 and show the application's 404 view.
await copyFile(entry, join(output, '404.html'))
await writeFile(join(output, '.nojekyll'), '')
console.log(`Pages ready: home + ${routes.length} routes; ${works.length} works, ${categories.length} categories.`)
