import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'

// Exercise the controller's real DOM-event listeners at the buffering boundary.
let snapshot = { playbackState: 'paused', playbackIndex: 0 }
const navigation = {
  getSnapshot: () => snapshot,
  setPlayback: (playbackState, playbackIndex) => { snapshot = { playbackState, playbackIndex } },
}
const exports = {}
const source = readFileSync(new URL('../src/state/videoController.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
vm.runInNewContext(code, { exports, require: () => ({ navigator: navigation }) })
class MediaElement extends EventTarget {
  paused = false
  ended = false
  seeking = false
  readyState = 4
  currentTime = 1
  duration = 117
  error = null
  getAttribute(name) { return name === 'src' ? '/video.mp4' : null }
  pause() { this.paused = true }
}
const element = new MediaElement()
exports.video.register(element)
assert.equal(snapshot.playbackState, 'playing')
element.readyState = 2 // Current frame exists, but no future frame is available.
element.dispatchEvent(new Event('waiting'))
assert.equal(snapshot.playbackState, 'loading', 'waiting with only a current frame must show buffering')
element.readyState = 4
element.dispatchEvent(new Event('playing'))
assert.equal(snapshot.playbackState, 'playing')
element.paused = true
element.dispatchEvent(new Event('pause'))
assert.equal(snapshot.playbackState, 'paused')
exports.video.unregister(element)
console.log('PASS: buffer shortage, recovery, pause and cleanup.')
