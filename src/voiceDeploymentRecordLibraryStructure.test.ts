import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('voice deployment workspace delegates record library view components', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const listSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx', 'utf8')

  assert.doesNotMatch(source, /from '\.\/VoiceRecordLists'/)
  assert.match(source, /from '\.\/VoiceLibraryPanel'/)
  assert.match(source, /const renderVoiceLibraryPanel = \(/)
  assert.match(source, /renderVoiceLibraryPanel\('sticky'\)/)
  assert.match(source, /renderVoiceLibraryPanel\('embedded'\)/)
  assert.match(source, /<VoiceLibraryPanel/)
  assert.equal((source.match(/<VoiceLibraryPanel/g) ?? []).length, 1)
  assert.doesNotMatch(source, /const libraryPanel = \(/)
  assert.doesNotMatch(source, /<VoiceRecordList/)
  assert.doesNotMatch(source, /<PersonalSpaceVoiceAssetList/)
  assert.doesNotMatch(source, /function VoiceRecordList/)
  assert.doesNotMatch(source, /function PersonalSpaceVoiceAssetList/)
  assert.match(panelSource, /function VoiceLibraryPanel/)
  assert.match(panelSource, /VoiceRecordList/)
  assert.match(panelSource, /PersonalSpaceVoiceAssetList/)
  assert.match(panelSource, /label: `历史 \$\{records\.length\}`/)
  assert.match(panelSource, /label: `项目空间 \$\{personalSpaceVoiceAssets\.length\}`/)
  assert.match(listSource, /interface VoiceRecordListProps/)
  assert.match(listSource, /function VoiceRecordList/)
  assert.match(listSource, /function PersonalSpaceVoiceAssetList/)
  assert.doesNotMatch(listSource, /Dropdown\.Button/)
  assert.match(listSource, /menu=\{\{[\s\S]*收藏并关联角色/)
  assert.match(listSource, /收藏到项目空间/)
  assert.match(listSource, /personalSpaceCollectEnabled/)
  assert.match(listSource, /personalSpaceCollectDisabledReason/)
  assert.match(listSource, /disabled=\{!personalSpaceCollectEnabled\}/)
  assert.match(panelSource, /personalSpaceCollectEnabled/)
  assert.match(listSource, /收藏并关联角色/)
})

test('voice deployment workspace delegates record library persistence to a focused hook', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const workspaceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts', 'utf8')
  const recordHookPath = 'src/components/VoiceDeploymentWorkspace/useVoiceRecordLibrary.ts'

  assert.ok(existsSync(recordHookPath), 'voice record library hook should exist')
  const recordHookSource = readFileSync(recordHookPath, 'utf8')

  assert.match(source, /from '\.\/useVoiceDeploymentWorkspace'/)
  assert.match(workspaceHookSource, /from '\.\/useVoiceRecordLibrary'/)
  assert.match(workspaceHookSource, /useVoiceRecordLibrary\(/)
  assert.doesNotMatch(source, /from '\.\/voiceRecordStorage'/)
  assert.doesNotMatch(source, /readStoredRecords|writeStoredRecords/)
  assert.doesNotMatch(source, /updateRecordName|deleteVoiceRecord|clearVoiceRecords/)
  assert.match(recordHookSource, /export function useVoiceRecordLibrary/)
  assert.match(recordHookSource, /readStoredRecords/)
  assert.match(recordHookSource, /writeStoredRecords/)
  assert.match(recordHookSource, /updateRecordName/)
})
