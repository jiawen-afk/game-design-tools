import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertFocusedStructureFiles } from './appStructureTestHelpers.test'

test('app structure focused suite tests stay split by domain', () => {
  const source = readFileSync('src/appStructureFocusedSuites.test.ts', 'utf8')
  const focusedSuites = [
    'src/appStructureFocusedHelpers.test.ts',
    'src/appStructureFocusedAppShell.test.ts',
    'src/appStructureFocusedProject.test.ts',
    'src/appStructureFocusedWorkspaces.test.ts',
  ]

  assertFocusedStructureFiles(focusedSuites)
  assert.ok(source.split(/\r?\n/).length <= 100, 'appStructureFocusedSuites.test.ts should only keep split guards')
  for (const delegatedToken of [
    'app shell structure tests ' + 'live in focused files',
    'project storage structure tests ' + 'live in a focused file',
    'project management structure tests ' + 'live in a focused file',
    'personal space structure tests ' + 'live in a focused file',
    'voice deployment structure tests ' + 'live in a focused file',
    'sprite workspace structure tests ' + 'live in focused files',
    'document structure tests ' + 'live in a focused file',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
