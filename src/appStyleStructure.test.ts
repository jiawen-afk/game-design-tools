import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  imageProcessingStyleEntryPath,
  imageProcessingStyleModulePaths,
} from './appStructureTestHelpers.test'

test('image processing styles stay split by workspace responsibility', () => {
  const styleEntrySource = readFileSync(imageProcessingStyleEntryPath, 'utf8')

  assert.equal((styleEntrySource.match(/@import/g) ?? []).length, imageProcessingStyleModulePaths.length)
  assert.doesNotMatch(styleEntrySource, /^\s*(?:\.|@media\b)/m)
  for (const path of imageProcessingStyleModulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(styleEntrySource, new RegExp(`@import './${path.split('/').pop()}'`))
  }
})
