import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appSource = () => readFileSync('src/App.tsx', 'utf8')
const viteConfigSource = () => readFileSync('vite.config.ts', 'utf8')

test('home page shows tool details directly instead of hiding them in a popover', () => {
  const source = appSource()

  assert.doesNotMatch(source, /Popover/)
  assert.match(source, /tool\.details/)
  assert.match(source, /tool\.shortcut/)
  assert.match(source, /tool\.output/)
})

test('home page exposes renamed workspaces and global personal space', () => {
  const source = [
    appSource(),
    readFileSync('src/components/MultiFrameSpriteWorkspace/WorkspaceShell.tsx', 'utf8'),
    readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8'),
  ].join('\n')

  assert.match(source, /精灵图工作台/)
  assert.match(source, /配音工作台/)
  assert.match(source, /个人空间/)
  assert.doesNotMatch(source, /多图动作精灵工作台/)
  assert.doesNotMatch(source, /游戏角色语音工作台/)
})

test('personal space is global navigation instead of a tool list item', () => {
  const source = appSource()

  assert.match(source, /type ToolId = 'multi-frame-sprite' \| 'voice-deployment'/)
  assert.match(source, /type ActiveSurface = ToolId \| 'personal-space'/)
  assert.doesNotMatch(source, /id: 'personal-space'/)
  assert.match(source, /打开个人空间/)
  assert.match(source, /全局空间/)
  assert.doesNotMatch(source, /<kbd>3<\/kbd>/)
})

test('personal space page covers required management modules', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')

  assert.doesNotMatch(source, /\bList\b/)
  assert.match(source, /label: '角色'/)
  assert.match(source, /label: '剧情编排'/)
  assert.match(source, /title: '地图素材'/)
  assert.match(source, /title: '特效素材'/)
  assert.match(source, /title: '配音素材'/)
  assert.match(source, /label: section\.title/)
  assert.doesNotMatch(source, /label: '角色管理'/)
  assert.doesNotMatch(source, /label: '剧情编排管理'/)
  assert.doesNotMatch(source, /label: '通用资源管理'/)
  assert.match(source, /设置/)
  assert.match(source, /资源存储目录/)
  assert.match(source, /删除内容同时删除资源/)
  assert.match(source, /角色肖像/)
  assert.match(source, /上传肖像/)
  assert.match(source, /选择授权目录/)
  assert.match(source, /showDirectoryPicker/)
  assert.match(source, /角色精灵图/)
  assert.match(source, /角色配音/)
  assert.match(source, /关联配音素材/)
  assert.match(source, /导入地图素材/)
  assert.match(source, /导入特效素材/)
  assert.match(source, /导入配音素材/)
  assert.match(source, /导出参考资产/)
  assert.match(source, /关联角色/)
  assert.match(source, /关联剧情组/)
  assert.match(source, /剧情顺序/)
  assert.match(source, /对白文本/)
  assert.match(source, /存储目标/)
  assert.match(source, /待删除资源路径/)
  assert.match(source, /personal-overview/)
  assert.doesNotMatch(source, /moduleCards/)
  assert.doesNotMatch(source, /module-map/)
})

test('desktop shortcuts open tools and ignore editable targets', () => {
  const source = appSource()

  assert.match(source, /isEditableShortcutTarget/)
  assert.match(source, /event\.key === tool\.shortcut/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /HTMLInputElement/)
  assert.match(source, /HTMLTextAreaElement/)
  assert.match(source, /isContentEditable/)
})

test('production build publishes deployment scripts under /scripts', () => {
  const source = viteConfigSource()

  assert.match(source, /copyDeploymentScripts/)
  assert.match(source, /dist\/scripts/)
  assert.match(source, /deploy-voxcpm\.ps1/)
  assert.match(source, /deploy-voxcpm\.sh/)
})

test('Ant Design alerts use v6 title prop instead of deprecated message prop', () => {
  const source = [
    readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8'),
    readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8'),
  ].join('\n')

  assert.doesNotMatch(source, /<Alert[^>]*\bmessage=/)
})

test('voice deployment workspace delegates service, record, and personal space side effects', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')

  assert.match(source, /from '\.\/voiceDeploymentService'/)
  assert.match(source, /from '\.\/voiceRecordStorage'/)
  assert.match(source, /from '\.\/voicePersonalSpaceCollector'/)
  assert.match(source, /collectVoiceRecordToPersonalSpace/)
  assert.doesNotMatch(source, /function checkConnection/)
  assert.doesNotMatch(source, /function uploadReferenceAudio/)
  assert.doesNotMatch(source, /function readStoredRecords/)
  assert.doesNotMatch(source, /function writeStoredRecords/)
  assert.doesNotMatch(source, /function readVoiceRecordBlob/)
  assert.doesNotMatch(source, /writeAssetResourcesToDirectory/)
  assert.doesNotMatch(source, /getPersonalSpaceDirectoryHandle/)
})

test('personal space settings save gives visible feedback', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')

  assert.match(source, /const saveSettings = \(\) =>/)
  assert.match(source, /messageApi\.success\('已保存个人空间设置'\)/)
  assert.match(source, /savedSettings/)
  assert.match(source, /setSavedSettings\(true\)/)
  assert.match(source, /setSavedSettings\(false\)/)
  assert.match(source, /CheckCircleOutlined/)
  assert.match(source, /savedSettings \? '已保存' : '保存设置'/)
})

test('personal space resource kinds are first-level tabs instead of a common resource tab', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')

  assert.match(source, /const resourceSections/)
  assert.match(source, /title: '地图素材'/)
  assert.match(source, /title: '特效素材'/)
  assert.match(source, /title: '配音素材'/)
  assert.match(source, /assets: mapAssets/)
  assert.match(source, /assets: effectAssets/)
  assert.match(source, /assets: voiceAssets/)
  assert.match(source, /resourceSections\.map/)
  assert.match(source, /key: `resource-\$\{section\.kind\}`/)
  assert.match(source, /label: section\.title/)
  assert.match(source, /section\.assets\.map/)
  assert.doesNotMatch(source, /key: 'assets'/)
  assert.doesNotMatch(source, /label: '通用资源管理'/)
  assert.doesNotMatch(source, /<strong>地图素材 \/ 特效素材 \/ 配音素材<\/strong>/)
  assert.doesNotMatch(source, /space\.assets\.map\(\(item\)/)
})
