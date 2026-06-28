import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  assertFocusedStructureFiles,
  readSourceIfExists,
  testNamePattern,
} from './appStructureTestHelpers.test'

test('app shell structure tests live in focused files', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const appShellStructurePath = 'src/appShellStructure.test.ts'
  const appShellHomeStructurePath = 'src/appShellHomeStructure.test.ts'
  const appShellFooterStructurePath = 'src/appShellFooterStructure.test.ts'
  const appShellReleaseStructurePath = 'src/appShellReleaseStructure.test.ts'
  const appShellDesktopStructurePath = 'src/appShellDesktopStructure.test.ts'
  const appShellFeedbackStructurePath = 'src/appShellFeedbackStructure.test.ts'
  const appShellStructureSource = readSourceIfExists(appShellStructurePath)
  const appShellFooterStructureSource = readSourceIfExists(appShellFooterStructurePath)
  const appShellReleaseStructureSource = readSourceIfExists(appShellReleaseStructurePath)
  const appShellFeedbackStructureSource = readSourceIfExists(appShellFeedbackStructurePath)

  assertFocusedStructureFiles([
    appShellStructurePath,
    appShellHomeStructurePath,
    appShellFooterStructurePath,
    appShellReleaseStructurePath,
    appShellDesktopStructurePath,
    appShellFeedbackStructurePath,
  ])
  assert.doesNotMatch(source, testNamePattern('site footer is app-only'))
  assert.doesNotMatch(source, testNamePattern('production build publishes only Windows desktop deployment scripts'))
  assert.doesNotMatch(source, testNamePattern('app shell exposes a reusable expiring toast layer'))
  assert.match(appShellStructureSource, testNamePattern('app shell structure tests stay split by shell responsibility'))
  assert.match(appShellFooterStructureSource, testNamePattern('site footer is app-only'))
  assert.match(appShellReleaseStructureSource, testNamePattern('production build publishes only Windows desktop deployment scripts'))
  assert.match(appShellFeedbackStructureSource, testNamePattern('app shell exposes a reusable expiring toast layer'))
})
