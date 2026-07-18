const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')

const { runCommandOutput } = require('./processCommandRunner.cjs')

test('command runner waits for child close after an abort error', async () => {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  const spawnCalls = []
  const run = runCommandOutput('ffmpeg.exe', ['-version'], { signal: 'test-signal' }, (...args) => {
    spawnCalls.push(args)
    return child
  })
  let settled = false
  void run.then(() => { settled = true })

  child.emit('error', new Error('The operation was aborted'))
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(settled, false)

  child.emit('close', null)
  assert.deepEqual(await run, { ok: false, output: 'The operation was aborted' })
  assert.deepEqual(spawnCalls[0], [
    'ffmpeg.exe',
    ['-version'],
    { windowsHide: true, signal: 'test-signal' },
  ])
})

test('command runner collects output and succeeds only on zero exit', async () => {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  const run = runCommandOutput('ffprobe.exe', [], {}, () => child)
  child.stdout.emit('data', Buffer.from('version'))
  child.emit('close', 0)

  assert.deepEqual(await run, { ok: true, output: 'version' })
})
