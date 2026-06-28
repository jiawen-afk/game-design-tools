import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  spriteWorkspaceStyleEntryPath,
  spriteWorkspaceStyleModulePaths,
} from './appStructureTestHelpers.test'

test('sprite workspace structure suite stays split by responsibility', () => {
  const source = readFileSync('src/spriteWorkspaceStructure.test.ts', 'utf8')
  const focusedSuites = [
    'src/spriteWorkspaceCoreStructure.test.ts',
    'src/spriteWorkspaceLayoutStructure.test.ts',
    'src/spriteWorkspaceMatteStructure.test.ts',
    'src/spriteWorkspaceVideoStructure.test.ts',
    'src/spriteWorkspaceUploadStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'spriteWorkspaceStructure.test.ts should only keep top-level split guards')
  for (const delegatedToken of [
    'useLayout' + 'Workspace',
    'useMatte' + 'Pipeline',
    'useVideo' + 'Workspace',
    'Upload' + 'WorkspacePanel',
    'image' + 'Pipeline',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})

test('sprite workspace styles stay split by workspace responsibility', () => {
  const styleEntrySource = readFileSync(spriteWorkspaceStyleEntryPath, 'utf8')

  assert.equal((styleEntrySource.match(/@import/g) ?? []).length, spriteWorkspaceStyleModulePaths.length)
  assert.doesNotMatch(styleEntrySource, /^\s*(?:\.|@media\b)/m)
  for (const path of spriteWorkspaceStyleModulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(styleEntrySource, new RegExp(`@import './${path.split('/').pop()}'`))
  }
})
