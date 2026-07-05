import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  productionSourceFiles,
  readSources,
} from './appStructureTestHelpers.test'

test('project space workbench shows current project control and opens separate management page', () => {
  const entrySource = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const workbenchSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx', 'utf8')
  const managementSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementPanel.tsx', 'utf8')
  const managementTabsSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectManagementTabs.tsx', 'utf8')
  const projectDetailsCardSource = readFileSync('src/components/PersonalSpaceWorkspace/ProjectDetailsCard.tsx', 'utf8')
  const managementSurfaceSource = [managementSource, managementTabsSource, projectDetailsCardSource].join('\n')

  assert.match(entrySource, /workspace\.workspacePage === 'management'/)
  assert.match(workbenchSource, /切换项目空间/)
  assert.match(workbenchSource, /当前项目/)
  assert.doesNotMatch(workbenchSource, /className="project-selector"/)
  assert.match(managementTabsSource, /items=\{projectTabItems\}/)
  assert.match(managementTabsSource, /key: 'create'/)
  assert.match(managementSurfaceSource, /启用/)
  assert.match(managementSurfaceSource, /迁移到远程/)
})

test('personal space workspace entry delegates management and workbench views', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const managementSurfacePath = 'src/components/PersonalSpaceWorkspace/ProjectManagementSurface.tsx'
  const workbenchPath = 'src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx'

  assert.ok(existsSync(managementSurfacePath), `${managementSurfacePath} should exist`)
  assert.ok(existsSync(workbenchPath), `${workbenchPath} should exist`)
  const managementSurfaceSource = readFileSync(managementSurfacePath, 'utf8')
  const workbenchSource = readFileSync(workbenchPath, 'utf8')

  assert.match(source, /ProjectManagementSurface/)
  assert.match(source, /PersonalSpaceWorkbench/)
  assert.doesNotMatch(source, /ProjectManagementPanel/)
  assert.doesNotMatch(source, /<PersonalCharacterPanel/)
  assert.doesNotMatch(source, /<PersonalStoryboardPanel/)
  assert.doesNotMatch(source, /<PersonalMaterialsPanel/)
  assert.doesNotMatch(source, /<PersonalSettingsPanel/)
  assert.doesNotMatch(source, /<ProjectRemoteSyncStatusPanel/)
  assert.match(managementSurfaceSource, /ProjectManagementPanel/)
  assert.match(managementSurfaceSource, /onUpdateRemoteProjectLinks=\{workspace\.updateRemoteProjectLinks\}/)
  assert.match(managementSurfaceSource, /onVerifyKodoProfile=\{\(projectId\) => void workspace\.verifyKodoProfile\(projectId\)\}/)
  assert.match(workbenchSource, /PersonalCharacterPanel/)
  assert.match(workbenchSource, /PersonalStoryboardPanel/)
  assert.match(workbenchSource, /PersonalMaterialsPanel/)
  assert.match(workbenchSource, /PersonalSettingsPanel/)
  assert.match(workbenchSource, /ProjectRemoteSyncStatusPanel/)
  assert.match(workbenchSource, /items=\{\[/)
})

test('project space workspace delegates material tab rendering to a focused panel', () => {
  const workspaceSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx', 'utf8')
  const materialsPanelPath = 'src/components/PersonalSpaceWorkspace/PersonalMaterialsPanel.tsx'
  const materialsPanelSource = existsSync(materialsPanelPath) ? readFileSync(materialsPanelPath, 'utf8') : ''

  assert.ok(existsSync(materialsPanelPath), 'personal materials panel should exist')
  assert.match(workspaceSource, /from '\.\/PersonalMaterialsPanel'/)
  assert.doesNotMatch(workspaceSource, /className="personal-inner-tabs"/)
  assert.doesNotMatch(workspaceSource, /resourceSections\.filter/)
  assert.match(materialsPanelSource, /personal-inner-tabs/)
  assert.match(materialsPanelSource, /resourceSections\.filter/)
  assert.match(materialsPanelSource, /PersonalResourceSection/)
})

test('project space styles stay split by workspace responsibility', () => {
  const styleEntryPath = 'src/components/PersonalSpaceWorkspace/personalSpace.css'
  const styleEntrySource = readFileSync(styleEntryPath, 'utf8')
  const styleModulePaths = [
    'src/components/PersonalSpaceWorkspace/personalSpace.base.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.syncStatus.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.projectManagement.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.resources.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.voiceGroups.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.resourceCards.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.assetPreview.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.storyboard.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.characterControls.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.characterProfiles.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.characterAssetPicker.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.characterVoiceLinks.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.storyboardTimeline.css',
    'src/components/PersonalSpaceWorkspace/personalSpace.responsive.css',
  ]

  assert.equal((styleEntrySource.match(/@import/g) ?? []).length, styleModulePaths.length)
  assert.doesNotMatch(styleEntrySource, /^\.[\w-]+/m)
  for (const path of styleModulePaths) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(styleEntrySource, new RegExp(`@import './${path.split('/').pop()}'`))
  }
})

test('personal space page covers required management modules', () => {
  const source = [
    readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalCharacterPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/CharacterProfileCard.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalMaterialsPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceAssetRecord.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalAssetGroupControls.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceGroupBlock.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceGroupTransferControl.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceFilterControl.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceTextPopover.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetActions.ts', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceDerivedState.ts', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8'),
  ].join('\n')

  assert.doesNotMatch(source, /\bList\b/)
  assert.match(source, /label: '角色'/)
  assert.match(source, /label: '剧情编排'/)
  assert.doesNotMatch(source, /label: '角色与剧情编排'/)
  assert.match(source, /label: '素材'/)
  assert.match(source, /label: '公共图片'/)
  assert.match(source, /label: '精灵图'/)
  assert.match(source, /label: '配音'/)
  assert.match(source, /title: '公共图片'/)
  assert.match(source, /title: '精灵图'/)
  assert.match(source, /title: '配音'/)
  assert.doesNotMatch(source, /label: '图片'/)
  assert.doesNotMatch(source, /title: '地图素材'/)
  assert.doesNotMatch(source, /title: '特效素材'/)
  assert.doesNotMatch(source, /label: '图片素材'/)
  assert.doesNotMatch(source, /label: '配音素材'/)
  assert.match(source, /key: 'materials'/)
  assert.doesNotMatch(source, /label: '角色管理'/)
  assert.doesNotMatch(source, /label: '剧情编排管理'/)
  assert.doesNotMatch(source, /label: '通用资源管理'/)
  assert.match(source, /设置/)
  assert.match(source, /资源存储目录/)
  assert.match(source, /删除内容同时删除资源/)
  assert.match(source, /activeKey=\{workspace\.activeModule\}/)
  assert.match(source, /onChange=\{workspace\.changeActiveModuleAndRefresh\}/)
  assert.match(source, /workbenchDisabled = !workspace\.enabledProjectId \|\| !workspace\.directoryHandle/)
  assert.match(source, /disabled: workbenchDisabled/)
  assert.match(source, /directoryHandleChecked/)
  assert.match(source, /需要授权资源目录/)
  assert.match(source, /请先选择授权目录/)
  assert.match(source, /角色肖像/)
  assert.match(source, /上传肖像/)
  assert.match(source, /选择授权目录/)
  assert.match(source, /角色精灵图/)
  assert.match(source, /getSpriteUploadProps/)
  assert.match(source, /spriteUploadProps/)
  assert.match(source, /上传精灵图/)
  assert.match(source, /png 或 webp 和 index\.json/)
  assert.match(source, /角色配音/)
  assert.match(source, /关联配音素材/)
  assert.match(source, /导入公共图片/)
  assert.match(source, /导入精灵图/)
  assert.match(source, /导入配音/)
  assert.match(source, /创建分组/)
  assert.match(source, /转移资产/)
  assert.match(source, /删除分组/)
  assert.match(source, /至少保留一个分组/)
  assert.match(source, /仅星标/)
  assert.match(source, /StarOutlined/)
  assert.match(source, /StarFilled/)
  assert.match(source, /toggleCharacterStar/)
  assert.match(source, /toggleStoryboardStar/)
  assert.match(source, /toggleAssetGroupStar/)
  assert.doesNotMatch(source, /<strong>角色列表<\/strong>/)
  assert.doesNotMatch(source, /<span className="section-caption">角色列表<\/span>/)
  assert.doesNotMatch(source, /<strong>剧情分组<\/strong>/)
  assert.doesNotMatch(source, /<span className="section-caption">剧情分组<\/span>/)
  assert.doesNotMatch(source, /<h3 id=\{`resource-\$\{section\.kind\}-title`\}>\{section\.title\}<\/h3>/)
  assert.doesNotMatch(source, /导出参考资产/)
  assert.match(source, /导出分组配音资产/)
  assert.match(source, /导出分组关联角色资产/)
  assert.match(source, /关联角色/)
  assert.match(source, /关联剧情组/)
  assert.match(source, /剧情顺序/)
  assert.match(source, /对白文本/)
  assert.match(source, /存储目标/)
  assert.doesNotMatch(source, /待删除资源路径/)
  assert.match(source, /personal-overview/)
  assert.doesNotMatch(source, /moduleCards/)
  assert.doesNotMatch(source, /module-map/)
})

test('project space tabs refresh current project data from storage on activation', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/PersonalSpaceWorkbench.tsx', 'utf8')
  const hookSource = readFileSync('src/components/PersonalSpaceWorkspace/usePersonalSpaceWorkspace.ts', 'utf8')
  const sessionActionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceProjectSessionActions.ts', 'utf8')
  const characterPanelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalCharacterPanel.tsx', 'utf8')
  const storyboardPanelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8')
  const materialsPanelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalMaterialsPanel.tsx', 'utf8')
  const resourceSectionsSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx', 'utf8')

  assert.match(sessionActionsSource, /refreshActiveProjectState/)
  assert.match(hookSource, /refreshActiveProjectData/)
  assert.match(hookSource, /changeActiveModuleAndRefresh/)
  assert.match(source, /onChange=\{workspace\.changeActiveModuleAndRefresh\}/)
  assert.match(source, /onRefreshProjectData=\{workspace\.refreshActiveProjectData\}/)
  assert.match(characterPanelSource, /onRefreshProjectData/)
  assert.match(storyboardPanelSource, /onRefreshProjectData/)
  assert.match(materialsPanelSource, /onRefreshProjectData/)
  assert.match(resourceSectionsSource, /onRefreshProjectData/)
})

test('project space stays independent from document knowledge parsing', () => {
  const source = readSources(productionSourceFiles('src/components/PersonalSpaceWorkspace'))

  assert.doesNotMatch(source, /DocumentWorkspace|documentKnowledge|entity_graph\.json/)
  assert.doesNotMatch(source, /term_record|category_paths|site_relation/)
})
