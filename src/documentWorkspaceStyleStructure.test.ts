import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  documentWorkspaceStyleEntryPath,
  documentWorkspaceStyleModulePaths,
} from './appStructureTestHelpers.test'

test('document workspace styles stay split by panel responsibility', () => {
  const styleEntrySource = readFileSync(documentWorkspaceStyleEntryPath, 'utf8')

  assert.equal((styleEntrySource.match(/@import/g) ?? []).length, documentWorkspaceStyleModulePaths.length)
  assert.doesNotMatch(styleEntrySource, /^\s*(?:\.|@media\b)/m)
  for (const path of documentWorkspaceStyleModulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(styleEntrySource, new RegExp(`@import './${path.split('/').pop()}'`))
  }
})

test('document knowledge browser uses tabbed results and skeleton loading states', () => {
  const browserSource = readFileSync('src/components/DocumentWorkspace/DocumentBrowserPanel.tsx', 'utf8')
  const source = readFileSync('src/components/DocumentWorkspace/DocumentSearchResults.tsx', 'utf8')

  assert.match(browserSource, /DocumentSearchResults/)
  assert.match(source, /Tabs/)
  assert.match(source, /Skeleton/)
  assert.match(source, /<Tabs/)
  assert.match(source, /<Skeleton/)
})

test('document knowledge collection controls sit with statistics and omit source file badges', () => {
  const browserSource = readFileSync('src/components/DocumentWorkspace/DocumentBrowserPanel.tsx', 'utf8')
  const source = readFileSync('src/components/DocumentWorkspace/DocumentCollectionToolbar.tsx', 'utf8')
  const toolbarStart = source.indexOf('document-collection-summary-bar')
  const toolbarEnd = source.indexOf('className="document-import-progress"', toolbarStart)
  const toolbarSource = source.slice(toolbarStart, toolbarEnd)

  assert.match(browserSource, /DocumentCollectionToolbar/)
  assert.notEqual(toolbarStart, -1)
  assert.notEqual(toolbarEnd, -1)
  assert.match(toolbarSource, /当前集合/)
  assert.match(toolbarSource, /className="document-summary-row"/)
  assert.match(toolbarSource, /className="document-collection-actions"/)
  assert.doesNotMatch(source, /<span className="field-label">项目<\/span>/)
  assert.doesNotMatch(source, /document-source-list/)
  assert.doesNotMatch(source, /workspace\.sources|hash_sha256|size_bytes|file_name/)
})
