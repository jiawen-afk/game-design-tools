import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('AI matting tests stay split by service responsibility', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/aiMattingModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const helperPath = 'src/components/MultiFrameSpriteWorkspace/aiMattingTestHelpers.test.ts'
  const focusedSuites = [
    'src/components/MultiFrameSpriteWorkspace/aiMattingWorkspaceStructure.test.ts',
    'src/components/MultiFrameSpriteWorkspace/aiMattingDesktopBridge.test.ts',
    'src/components/MultiFrameSpriteWorkspace/aiMattingDeployment.test.ts',
  ]

  assert.ok(existsSync(helperPath), `${helperPath} should exist`)
  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'aiMattingModel.test.ts should only keep split guards')
  for (const delegatedToken of [
    'exposes chroma key ' + 'and AI matting modes',
    'progress separates completed ' + 'active and waiting frames',
    'requires a connected ' + 'BiRefNet service',
    'desktop bridge exposes ' + 'BiRefNet setup',
    'device preference ' + 'controls',
    'service detection waits ' + 'for model readiness',
    'ready checks trigger ' + 'model loading',
    'input dtype with ' + 'loaded model weights',
    'automatic CUDA ' + 'selection',
    'installer prefers CUDA ' + 'PyTorch wheels',
    'enables CORS ' + 'for Electron renderer',
    'delegates helpers ' + 'and generated templates',
    'desktop bridge before ' + 'renderer fetch',
    'renderer fallback checks ' + 'model readiness',
    'reports disconnected ' + 'service without leaking',
    'serializes CPU ' + 'BiRefNet inference',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
