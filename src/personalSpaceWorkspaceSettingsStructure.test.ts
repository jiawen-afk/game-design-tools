import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('personal space settings save gives visible feedback', () => {
  const source = [
    readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8'),
  ].join('\n')

  assert.match(source, /const saveSettings = \(\) =>/)
  assert.match(source, /messageApi\.success\('已保存项目空间设置'\)/)
  assert.match(source, /savedSettings/)
  assert.match(source, /setSavedSettings\(true\)/)
  assert.match(source, /setSavedSettings\(false\)/)
  assert.match(source, /CheckCircleOutlined/)
  assert.match(source, /savedSettings \? '已保存' : '保存设置'/)
})

test('personal space workspace delegates settings panel', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx', 'utf8')
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8')

  assert.match(source, /from '\.\/PersonalSettingsPanel'/)
  assert.match(source, /<PersonalSettingsPanel/)
  assert.doesNotMatch(source, /<span className="field-label">资源存储目录<\/span>/)
  assert.doesNotMatch(source, /选择授权目录/)
  assert.doesNotMatch(source, /删除内容同时删除资源/)
  assert.doesNotMatch(source, /title="待删除资源路径"/)
  assert.match(panelSource, /function PersonalSettingsPanel/)
  assert.match(panelSource, /资源存储目录/)
  assert.match(panelSource, /选择授权目录/)
  assert.match(panelSource, /在文件资源管理器中打开/)
  assert.match(panelSource, /onOpenStorageDirectory/)
  assert.match(panelSource, /disabled=\{!directoryHandle\}/)
  assert.match(panelSource, /删除内容同时删除资源/)
  assert.doesNotMatch(panelSource, /待删除资源路径/)
  assert.doesNotMatch(panelSource, /pendingDeletedResourcePaths/)
  assert.match(panelSource, /onChooseStorageDirectory/)
  assert.match(panelSource, /onDeleteResourcesWithContentChange/)
})

test('personal space workspace delegates settings and directory authorization to a focused hook', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const settingsHookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceSettingsWorkspace.ts', 'utf8')

  assert.match(source, /from '\.\/usePersonalSpaceSettingsWorkspace'/)
  assert.match(source, /usePersonalSpaceSettingsWorkspace/)
  assert.doesNotMatch(source, /loadPersistedPersonalSpaceDirectoryHandle/)
  assert.doesNotMatch(source, /persistPersonalSpaceDirectoryHandle/)
  assert.doesNotMatch(source, /setPersonalSpaceDirectoryHandle/)
  assert.doesNotMatch(source, /pickPersonalSpaceDirectory/)
  assert.doesNotMatch(source, /const saveSettings = /)
  assert.doesNotMatch(source, /const chooseStorageDirectory = /)
  assert.match(settingsHookSource, /loadPersistedPersonalSpaceDirectoryHandle/)
  assert.match(settingsHookSource, /persistPersonalSpaceDirectoryHandle/)
  assert.match(settingsHookSource, /setPersonalSpaceDirectoryHandle/)
  assert.match(settingsHookSource, /pickPersonalSpaceDirectory/)
  assert.match(settingsHookSource, /openStorageDirectory/)
  assert.match(settingsHookSource, /openPath/)
  assert.doesNotMatch(settingsHookSource, /window\.open/)
  assert.doesNotMatch(settingsHookSource, /file:\/\//)
  assert.match(settingsHookSource, /saveSettings/)
  assert.match(settingsHookSource, /chooseStorageDirectory/)
})
