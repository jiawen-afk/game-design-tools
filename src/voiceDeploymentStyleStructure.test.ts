import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  voiceDeploymentStyleEntryPath,
  voiceDeploymentStyleModulePaths,
} from './appStructureTestHelpers.test'

test('voice deployment styles stay split by workspace responsibility', () => {
  const styleEntrySource = readFileSync(voiceDeploymentStyleEntryPath, 'utf8')

  assert.equal((styleEntrySource.match(/@import/g) ?? []).length, voiceDeploymentStyleModulePaths.length)
  assert.doesNotMatch(styleEntrySource, /^\s*(?:\.|@media\b)/m)
  for (const path of voiceDeploymentStyleModulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(styleEntrySource, new RegExp(`@import './${path.split('/').pop()}'`))
  }
})
