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

test('sticky app header stays above compact workspace controls', () => {
  const baseStyleSource = readFileSync('src/styles/app.base.css', 'utf8')
  const shellStyleSource = readFileSync('src/styles/app.shell.css', 'utf8')
  const stickyHeaderLayer = baseStyleSource.match(/--z-sticky-header:\s*(\d+);/)

  assert.ok(stickyHeaderLayer, 'app styles should define a semantic sticky header layer')
  assert.ok(Number(stickyHeaderLayer[1]) > 2, 'sticky header must outrank Ant Design compact controls')
  assert.match(
    shellStyleSource,
    /\.topbar\s*\{[\s\S]*?z-index:\s*var\(--z-sticky-header\);/,
  )
})
