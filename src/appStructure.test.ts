import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('app structure tests stay split by responsibility', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/appStructureFocusedSuites.test.ts',
    'src/appStyleStructure.test.ts',
    'src/appDesktopIpcStructure.test.ts',
    'src/desktopServiceRuntimeStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'appStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'project storage' + ' structure tests live',
    'image processing' + ' styles stay split',
    'electron main' + ' delegates BiRefNet',
    'desktop service' + ' startup workflow',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
