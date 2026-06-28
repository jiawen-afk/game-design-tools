import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { productionSourceFiles, readSources } from './appStructureTestHelpers.test'

test('document knowledge workspace keeps panels free of storage adapters and workflow hooks', () => {
  const panelPaths = productionSourceFiles('src/components/DocumentWorkspace')
    .filter((path) => /Panel\.tsx$/.test(path))

  assert.deepEqual(panelPaths.sort(), [
    'src/components/DocumentWorkspace/DocumentBrowserPanel.tsx',
    'src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx',
    'src/components/DocumentWorkspace/DocumentGraphControlsPanel.tsx',
    'src/components/DocumentWorkspace/DocumentGraphDetailsPanel.tsx',
  ])

  for (const path of panelPaths) {
    const source = readFileSync(path, 'utf8')
    assert.doesNotMatch(source, /projectSqliteRepository|projectLocalRepositoryProxy|projectRemoteRepositoryProxy/)
    assert.doesNotMatch(source, /\.\.\/\.\.\/desktopApi|electron/)
    assert.doesNotMatch(source, /shjGraphImportAdapter/)
    assert.doesNotMatch(source, /document_source_contents|content_text/)
    assert.doesNotMatch(source, /useDocumentWorkspace/)
  }
})

test('document workspace hook delegates collection loading, search, node details, and deletion workflow', () => {
  const hookSource = readFileSync('src/components/DocumentWorkspace/useDocumentWorkspace.ts', 'utf8')
  const collectionWorkflowPath = 'src/components/DocumentWorkspace/useDocumentCollectionWorkflow.ts'

  assert.ok(existsSync(collectionWorkflowPath), 'document collection workflow hook should exist')
  const collectionWorkflowSource = readFileSync(collectionWorkflowPath, 'utf8')

  assert.match(hookSource, /from '\.\/useDocumentCollectionWorkflow'/)
  assert.match(hookSource, /useDocumentCollectionWorkflow/)
  assert.doesNotMatch(hookSource, /getDocumentCollectionGraph/)
  assert.doesNotMatch(hookSource, /searchDocumentNodes/)
  assert.doesNotMatch(hookSource, /searchDocumentRecords/)
  assert.doesNotMatch(hookSource, /getDocumentNode/)
  assert.doesNotMatch(hookSource, /listDocumentNeighbors/)
  assert.doesNotMatch(hookSource, /deleteDocumentCollection/)
  assert.doesNotMatch(hookSource, /createDefaultDocumentGraphFilter/)
  assert.match(collectionWorkflowSource, /export function useDocumentCollectionWorkflow/)
  assert.match(collectionWorkflowSource, /getDocumentCollectionGraph/)
  assert.match(collectionWorkflowSource, /searchDocumentNodes/)
  assert.match(collectionWorkflowSource, /searchDocumentRecords/)
  assert.match(collectionWorkflowSource, /getDocumentNode/)
  assert.match(collectionWorkflowSource, /listDocumentNeighbors/)
  assert.match(collectionWorkflowSource, /deleteDocumentCollection/)
  assert.match(collectionWorkflowSource, /createDefaultDocumentGraphFilter/)
})

test('document knowledge workspace uses Ant Design v6 alert title prop', () => {
  const source = readFileSync('src/components/DocumentWorkspace/DocumentWorkspace.tsx', 'utf8')

  assert.match(source, /<Alert/)
  assert.match(source, /title=/)
  assert.doesNotMatch(source, /\smessage=/)
})

test('document workspace hook delegates graph interactions to a focused hook', () => {
  const source = readFileSync('src/components/DocumentWorkspace/useDocumentWorkspace.ts', 'utf8')
  const graphHookPath = 'src/components/DocumentWorkspace/useDocumentGraphInteractions.ts'

  assert.ok(existsSync(graphHookPath), 'document graph interaction hook should exist')
  const graphHookSource = readFileSync(graphHookPath, 'utf8')

  assert.match(source, /from '\.\/useDocumentGraphInteractions'/)
  assert.match(source, /useDocumentGraphInteractions\(/)
  assert.doesNotMatch(source, /focusTargetForDocumentNode/)
  assert.doesNotMatch(source, /DocumentNodeAction/)
  assert.doesNotMatch(source, /const toggleGraphNodeType/)
  assert.doesNotMatch(source, /const toggleGraphEdgeType/)
  assert.match(graphHookSource, /export function useDocumentGraphInteractions/)
  assert.match(graphHookSource, /focusTargetForDocumentNode/)
  assert.match(graphHookSource, /toggleGraphNodeType/)
  assert.match(graphHookSource, /changeDescriptionFilter/)
})

test('document workspace hook delegates knowledge import workflow to a focused hook', () => {
  const source = readFileSync('src/components/DocumentWorkspace/useDocumentWorkspace.ts', 'utf8')
  const importHookPath = 'src/components/DocumentWorkspace/useDocumentImportWorkflow.ts'

  assert.ok(existsSync(importHookPath), 'document import workflow hook should exist')
  const importHookSource = readFileSync(importHookPath, 'utf8')

  assert.match(source, /from '\.\/useDocumentImportWorkflow'/)
  assert.match(source, /useDocumentImportWorkflow\(/)
  assert.doesNotMatch(source, /importKnowledgeBaseFile/)
  assert.doesNotMatch(source, /const \[importing, setImporting\] = useState/)
  assert.doesNotMatch(source, /const \[importProgress, setImportProgress\] = useState/)
  assert.match(importHookSource, /export function useDocumentImportWorkflow/)
  assert.match(importHookSource, /importKnowledgeBaseFile/)
  assert.match(importHookSource, /KnowledgeBaseImportProgress/)
})

test('document knowledge import and repository modules do not depend on UI panels', () => {
  const source = readSources([
    'src/components/DocumentWorkspace/documentKnowledgeImportService.ts',
    'src/components/ProjectStorage/projectSqliteRepository.ts',
    'src/components/ProjectStorage/projectLocalRepositoryProxy.ts',
    'src/components/ProjectStorage/projectRemoteRepositoryProxy.ts',
    'electron/projectLocalRepository.cjs',
    'electron/projectRemoteRepository.cjs',
    'electron/projectStorageIpcHandlers.cjs',
  ])

  assert.doesNotMatch(source, /DocumentBrowserPanel|DocumentGraphPanel|DocumentWorkspace\.tsx/)
  assert.doesNotMatch(readFileSync('src/components/DocumentWorkspace/shjGraphImportAdapter.ts', 'utf8'), /from 'react'|from "react"|React\./)
})

test('document browser reuses collection toolbar and delegates search results to a focused component', () => {
  const browserSource = readFileSync('src/components/DocumentWorkspace/DocumentBrowserPanel.tsx', 'utf8')
  const collectionToolbarPath = 'src/components/DocumentWorkspace/DocumentCollectionToolbar.tsx'
  const searchResultsPath = 'src/components/DocumentWorkspace/DocumentSearchResults.tsx'

  assert.ok(existsSync(collectionToolbarPath), 'document collection toolbar component should exist')
  assert.ok(existsSync(searchResultsPath), 'document search results component should exist')

  const collectionToolbarSource = readFileSync(collectionToolbarPath, 'utf8')
  const searchResultsSource = readFileSync(searchResultsPath, 'utf8')

  assert.match(browserSource, /from '\.\/DocumentCollectionToolbar'/)
  assert.match(browserSource, /from '\.\/DocumentSearchResults'/)
  assert.match(browserSource, /<DocumentCollectionToolbar workspace={workspace} showRefresh={false} \/>/)
  assert.match(browserSource, /<DocumentSearchResults workspace={workspace} \/>/)
  assert.doesNotMatch(browserSource, /document-collection-summary-bar/)
  assert.doesNotMatch(browserSource, /document-import-progress/)
  assert.doesNotMatch(browserSource, /document-result-tabs/)
  assert.doesNotMatch(browserSource, /document-node-table/)

  assert.match(collectionToolbarSource, /document-collection-summary-bar/)
  assert.match(collectionToolbarSource, /document-import-progress/)
  assert.match(collectionToolbarSource, /Upload\.LIST_IGNORE/)
  assert.match(searchResultsSource, /document-search/)
  assert.match(searchResultsSource, /document-result-tabs/)
  assert.match(searchResultsSource, /document-node-table/)
  assert.match(searchResultsSource, /document-detail-panel/)
})
