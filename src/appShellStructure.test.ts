import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { packageJsonSource } from './appStructureTestHelpers.test'

test('app shell structure tests stay split by shell responsibility', () => {
  const source = readFileSync('src/appShellStructure.test.ts', 'utf8')
  const packageSource = packageJsonSource()
  const focusedSuites = [
    'src/appShellHomeStructure.test.ts',
    'src/appShellFooterStructure.test.ts',
    'src/appShellReleaseStructure.test.ts',
    'src/appShellDesktopStructure.test.ts',
    'src/appShellFeedbackStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 80, 'appShellStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'tool' + '.details',
    'Site' + 'Footer',
    'appRelease' + 'Metadata',
    'gameDesign' + 'ToolsDesktop',
    'AppToast' + 'Provider',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
