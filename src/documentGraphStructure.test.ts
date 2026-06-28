import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { packageJsonSource } from './appStructureTestHelpers.test'

test('document graph controls panel delegates category tree filtering to a focused component', () => {
  const panelSource = readFileSync('src/components/DocumentWorkspace/DocumentGraphControlsPanel.tsx', 'utf8')
  const categoryFilterPath = 'src/components/DocumentWorkspace/DocumentGraphCategoryFilter.tsx'

  assert.ok(existsSync(categoryFilterPath), 'document graph category filter should exist')
  const categoryFilterSource = readFileSync(categoryFilterPath, 'utf8')

  assert.match(panelSource, /from '\.\/DocumentGraphCategoryFilter'/)
  assert.match(panelSource, /<DocumentGraphCategoryFilter/)
  assert.doesNotMatch(panelSource, /function visibleCategoryTree/)
  assert.doesNotMatch(panelSource, /function categoryTreeMatches/)
  assert.doesNotMatch(panelSource, /className="document-category-tree"/)
  assert.match(categoryFilterSource, /function DocumentGraphCategoryFilter/)
  assert.match(categoryFilterSource, /function visibleCategoryTree/)
  assert.match(categoryFilterSource, /className="document-category-tree"/)
})

test('document graph view model stays pure and free of UI runtime dependencies', () => {
  const source = readFileSync('src/components/DocumentWorkspace/documentGraphViewModel.ts', 'utf8')

  assert.doesNotMatch(source, /from 'react'|from "react"|React\./)
  assert.doesNotMatch(source, /from 'antd'|from "antd"|antd/)
  assert.doesNotMatch(source, /getDesktopApi|desktopApi|gameDesignToolsDesktop|electron/)
})

test('document graph view model delegates focused responsibilities to model modules', () => {
  const facadeSource = readFileSync('src/components/DocumentWorkspace/documentGraphViewModel.ts', 'utf8')
  const modelPaths = [
    'src/components/DocumentWorkspace/documentGraphTypes.ts',
    'src/components/DocumentWorkspace/documentGraphLabels.ts',
    'src/components/DocumentWorkspace/documentGraphCoreModel.ts',
    'src/components/DocumentWorkspace/documentGraphCategoryModel.ts',
    'src/components/DocumentWorkspace/documentGraphFilterModel.ts',
    'src/components/DocumentWorkspace/documentGraphNodeActionModel.ts',
    'src/components/DocumentWorkspace/documentGraphNodeDetailsModel.ts',
    'src/components/DocumentWorkspace/documentGraphChartModel.ts',
  ]

  for (const path of modelPaths) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  for (const moduleName of [
    'documentGraphTypes',
    'documentGraphLabels',
    'documentGraphCategoryModel',
    'documentGraphFilterModel',
    'documentGraphNodeActionModel',
    'documentGraphNodeDetailsModel',
    'documentGraphChartModel',
  ]) {
    assert.match(facadeSource, new RegExp(`from './${moduleName}'`))
  }

  assert.doesNotMatch(facadeSource, /function\s+(filterDocumentGraph|focusTargetForDocumentNode|contextActionForDocumentNode|describeDocumentGraphNode|buildDocumentGraphChartOption)\b/)
})

test('document graph filtering delegates focused subgraph expansion to a focused model', () => {
  const filterSource = readFileSync('src/components/DocumentWorkspace/documentGraphFilterModel.ts', 'utf8')
  const focusModelPath = 'src/components/DocumentWorkspace/documentGraphFocusModel.ts'

  assert.ok(existsSync(focusModelPath), `${focusModelPath} should exist`)
  const focusModelSource = readFileSync(focusModelPath, 'utf8')

  assert.match(filterSource, /from '\.\/documentGraphFocusModel'/)
  assert.match(filterSource, /focusDocumentGraph/)
  assert.doesNotMatch(filterSource, /function\s+(focusGraph|directionalEntityDetailEdges|sameLabelSemanticNodeIds|sameLabelSemanticRecordIds|descriptionGroupId|detailCenterTermId)\b/)
  assert.match(focusModelSource, /export function focusDocumentGraph/)
  assert.match(focusModelSource, /description_group:/)
  assert.match(focusModelSource, /directionalEntityDetailEdges/)
})

test('document graph details panel reuses core graph node data helpers', () => {
  const detailsSource = readFileSync('src/components/DocumentWorkspace/DocumentGraphDetailsPanel.tsx', 'utf8')
  const coreModelSource = readFileSync('src/components/DocumentWorkspace/documentGraphCoreModel.ts', 'utf8')

  for (const helperName of [
    'categoryPathsForDocumentGraphNode',
    'recordForDocumentGraphNode',
    'stringArray',
  ]) {
    assert.match(coreModelSource, new RegExp(`export function ${helperName}\\b`))
    assert.match(detailsSource, new RegExp(helperName))
  }

  assert.match(detailsSource, /from '\.\/documentGraphCoreModel'/)
  assert.doesNotMatch(detailsSource, /function stringArray\b/)
  assert.doesNotMatch(detailsSource, /function recordForNode\b/)
  assert.doesNotMatch(detailsSource, /node\.data\.categoryPathGroups/)
})

test('document graph canvas keeps echarts instance stable across graph option updates', () => {
  const source = readFileSync('src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx', 'utf8')

  assert.match(source, /chartRef/)
  assert.match(source, /setOption\(buildDocumentGraphChartOption/)
  assert.doesNotMatch(source, /chart\.dispose\(\)[\s\S]*\}, \[focusNodeId, graph, mode\]\)/)
})

test('document graph canvas panel renders through echarts instead of handwritten svg', () => {
  const source = readFileSync('src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx', 'utf8')
  const packageSource = packageJsonSource()

  assert.match(packageSource, /"echarts"/)
  assert.match(source, /echarts\/core/)
  assert.match(source, /GraphChart/)
  assert.match(source, /buildDocumentGraphChartOption/)
  assert.match(source, /className="document-graph-echarts"/)
  assert.doesNotMatch(source, /documentKnowledgeModel/)
  assert.doesNotMatch(source, /<svg|<line|<circle|<text/)
})

test('document graph canvas routes graph node clicks through node actions and list opens details directly', () => {
  const workspaceSource = readFileSync('src/components/DocumentWorkspace/DocumentWorkspace.tsx', 'utf8')
  const canvasSource = readFileSync('src/components/DocumentWorkspace/DocumentGraphCanvasPanel.tsx', 'utf8')

  assert.match(workspaceSource, /const applyGraphNodeAction = useCallback\(\(nodeId: string\) => \{/)
  assert.match(workspaceSource, /contextActionForDocumentNode\(/)
  assert.match(workspaceSource, /workspace\.applyNodeAction\(action\)/)
  assert.match(workspaceSource, /onFocusNode=\{applyGraphNodeAction\}/)
  assert.match(workspaceSource, /onContextNode=\{applyGraphNodeAction\}/)
  assert.match(workspaceSource, /onOpenListNode=\{workspace\.focusNode\}/)
  assert.match(canvasSource, /onOpenListNode: \(nodeId: string\) => void/)
  assert.match(canvasSource, /if \(nodeId\) onFocusNodeRef\.current\(nodeId\)/)
  assert.match(canvasSource, /onClick=\{\(\) => onOpenListNode\(node\.id\)\}/)
})
