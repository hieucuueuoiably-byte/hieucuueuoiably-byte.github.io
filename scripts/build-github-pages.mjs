import { readFile, mkdir, copyFile, writeFile, readdir, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

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

const works = await routeValues('src/data/works.ts', 'WORKS', 'slug')
const categories = await routeValues('src/data/categories.ts', 'collections', 'id')
// Publish only videos in the current collection. Old files stay in public/Git
// for recovery; pruning affects the generated deployment output alone.
const selectedVideos = new Set(works.map(slug => `${slug}.mp4`))
for (const folder of ['videos', 'videos/mobile']) {
  const directory = join(output, folder)
  const files = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  for (const file of files) {
    if (file.isFile() && file.name.endsWith('.mp4') && !selectedVideos.has(file.name)) {
      await unlink(join(directory, file.name))
    }
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
