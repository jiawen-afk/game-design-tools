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
  const source = [
    readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalCharacterPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8'),
  ].join('\n')

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
  const serviceSource = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentService.ts', 'utf8')

  assert.match(source, /from '\.\/voiceDeploymentService'/)
  assert.match(source, /from '\.\/voiceRecordStorage'/)
  assert.match(source, /from '\.\/voicePersonalSpaceCollector'/)
  assert.match(source, /generateVoiceAudio/)
  assert.match(source, /collectVoiceRecordToPersonalSpace/)
  assert.doesNotMatch(source, /function checkConnection/)
  assert.doesNotMatch(source, /function uploadReferenceAudio/)
  assert.doesNotMatch(source, /function readStoredRecords/)
  assert.doesNotMatch(source, /function writeStoredRecords/)
  assert.doesNotMatch(source, /function readVoiceRecordBlob/)
  assert.doesNotMatch(source, /fetch\(`\$\{serviceUrl\}\/gradio_api\/call\/generate/)
  assert.doesNotMatch(source, /readGradioEventResult/)
  assert.doesNotMatch(source, /normalizeAudioResult/)
  assert.doesNotMatch(source, /writeAssetResourcesToDirectory/)
  assert.doesNotMatch(source, /getPersonalSpaceDirectoryHandle/)
  assert.match(serviceSource, /export async function generateVoiceAudio/)
  assert.match(serviceSource, /fetch\(`\$\{serviceUrl\}\/gradio_api\/call\/generate/)
  assert.match(serviceSource, /readGradioEventResult/)
  assert.match(serviceSource, /normalizeAudioResult/)
})

test('voice deployment workspace delegates record library view components', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const listSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx', 'utf8')

  assert.doesNotMatch(source, /from '\.\/VoiceRecordLists'/)
  assert.match(source, /from '\.\/VoiceLibraryPanel'/)
  assert.match(source, /<VoiceLibraryPanel/)
  assert.doesNotMatch(source, /const libraryPanel = \(/)
  assert.doesNotMatch(source, /<VoiceRecordList/)
  assert.doesNotMatch(source, /<PersonalSpaceVoiceAssetList/)
  assert.doesNotMatch(source, /function VoiceRecordList/)
  assert.doesNotMatch(source, /function PersonalSpaceVoiceAssetList/)
  assert.match(panelSource, /function VoiceLibraryPanel/)
  assert.match(panelSource, /VoiceRecordList/)
  assert.match(panelSource, /PersonalSpaceVoiceAssetList/)
  assert.match(panelSource, /label: `历史 \$\{records\.length\}`/)
  assert.match(panelSource, /label: `个人空间 \$\{personalSpaceVoiceAssets\.length\}`/)
  assert.match(listSource, /interface VoiceRecordListProps/)
  assert.match(listSource, /function VoiceRecordList/)
  assert.match(listSource, /function PersonalSpaceVoiceAssetList/)
  assert.match(listSource, /Dropdown\.Button/)
  assert.match(listSource, /收藏到个人空间/)
  assert.match(listSource, /收藏并关联角色/)
})

test('voice deployment workspace delegates disconnected setup panels', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelsSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceSetupPanels.tsx', 'utf8')

  assert.match(source, /from '\.\/VoiceSetupPanels'/)
  assert.match(source, /<VoiceSetupPanels/)
  assert.doesNotMatch(source, /id="hw-title"/)
  assert.doesNotMatch(source, /id="deploy-title"/)
  assert.doesNotMatch(source, /gpuCheckCommand/)
  assert.doesNotMatch(source, /latencyDisclaimer/)
  assert.match(panelsSource, /function VoiceSetupPanels/)
  assert.match(panelsSource, /id="hw-title"/)
  assert.match(panelsSource, /id="deploy-title"/)
  assert.match(panelsSource, /gpuCheckCommand/)
  assert.match(panelsSource, /latencyDisclaimer/)
  assert.match(panelsSource, /modelOptions/)
  assert.match(panelsSource, /sourceOptions/)
  assert.match(panelsSource, /deviceOptions/)
})

test('voice deployment workspace delegates connected generation panel', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/VoiceDeploymentWorkspace/VoiceGenerationPanel.tsx', 'utf8')

  assert.match(source, /from '\.\/VoiceGenerationPanel'/)
  assert.match(source, /<VoiceGenerationPanel/)
  assert.doesNotMatch(source, /quickDesignPrompts/)
  assert.doesNotMatch(source, /生成方式/)
  assert.doesNotMatch(source, /高级控制/)
  assert.doesNotMatch(source, /参考音频文本/)
  assert.match(panelSource, /function VoiceGenerationPanel/)
  assert.match(panelSource, /quickDesignPrompts/)
  assert.match(panelSource, /生成方式/)
  assert.match(panelSource, /台词文本/)
  assert.match(panelSource, /参考音频/)
  assert.match(panelSource, /高级控制/)
  assert.match(panelSource, /onGenerate/)
  assert.match(panelSource, /onResetParams/)
  assert.match(panelSource, /onCopyApiExample/)
})

test('personal space settings save gives visible feedback', () => {
  const source = [
    readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8'),
    readFileSync('src/components/PersonalSpaceWorkspace/PersonalSettingsPanel.tsx', 'utf8'),
  ].join('\n')

  assert.match(source, /const saveSettings = \(\) =>/)
  assert.match(source, /messageApi\.success\('已保存个人空间设置'\)/)
  assert.match(source, /savedSettings/)
  assert.match(source, /setSavedSettings\(true\)/)
  assert.match(source, /setSavedSettings\(false\)/)
  assert.match(source, /CheckCircleOutlined/)
  assert.match(source, /savedSettings \? '已保存' : '保存设置'/)
})

test('personal space workspace delegates settings panel', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
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
  assert.match(panelSource, /删除内容同时删除资源/)
  assert.match(panelSource, /待删除资源路径/)
  assert.match(panelSource, /onChooseStorageDirectory/)
  assert.match(panelSource, /onDeleteResourcesWithContentChange/)
})

test('personal space resource kinds are first-level tabs instead of a common resource tab', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const sectionsSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalResourceSections.tsx', 'utf8')

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
  assert.match(source, /<PersonalResourceSection/)
  assert.doesNotMatch(source, /const renderResourceSection = /)
  assert.doesNotMatch(source, /section\.assets\.map/)
  assert.match(sectionsSource, /function PersonalResourceSection/)
  assert.match(sectionsSource, /section\.assets\.map/)
  assert.match(sectionsSource, /关联配音素材/)
  assert.match(sectionsSource, /关联角色/)
  assert.match(sectionsSource, /关联剧情组/)
  assert.match(sectionsSource, /剧情顺序/)
  assert.match(sectionsSource, /存储目标/)
  assert.doesNotMatch(source, /key: 'assets'/)
  assert.doesNotMatch(source, /label: '通用资源管理'/)
  assert.doesNotMatch(source, /<strong>地图素材 \/ 特效素材 \/ 配音素材<\/strong>/)
  assert.doesNotMatch(source, /space\.assets\.map\(\(item\)/)
})

test('personal space workspace delegates character management panel', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalCharacterPanel.tsx', 'utf8')

  assert.match(source, /from '\.\/PersonalCharacterPanel'/)
  assert.match(source, /<PersonalCharacterPanel/)
  assert.doesNotMatch(source, /角色列表/)
  assert.doesNotMatch(source, /<strong>角色肖像<\/strong>/)
  assert.doesNotMatch(source, /<strong>角色精灵图<\/strong>/)
  assert.doesNotMatch(source, /<strong>角色配音<\/strong>/)
  assert.match(panelSource, /function PersonalCharacterPanel/)
  assert.match(panelSource, /角色列表/)
  assert.match(panelSource, /角色肖像/)
  assert.match(panelSource, /角色精灵图/)
  assert.match(panelSource, /角色配音/)
  assert.match(panelSource, /上传肖像/)
  assert.match(panelSource, /onReorderCharacterVoice/)
})

test('personal space workspace delegates storyboard management panel', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const panelSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalStoryboardPanel.tsx', 'utf8')

  assert.match(source, /from '\.\/PersonalStoryboardPanel'/)
  assert.match(source, /<PersonalStoryboardPanel/)
  assert.doesNotMatch(source, /剧情分组/)
  assert.doesNotMatch(source, /复制参考资产/)
  assert.doesNotMatch(source, /导出参考资产/)
  assert.doesNotMatch(source, /对白文本/)
  assert.match(panelSource, /function PersonalStoryboardPanel/)
  assert.match(panelSource, /剧情分组/)
  assert.match(panelSource, /复制参考资产/)
  assert.match(panelSource, /导出参考资产/)
  assert.match(panelSource, /导入角色/)
  assert.match(panelSource, /导入配音/)
  assert.match(panelSource, /对白文本/)
  assert.match(panelSource, /onReorderStoryboardVoice/)
})

test('personal space workspace delegates resource IO and filesystem side effects', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/index.tsx', 'utf8')
  const actionsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceResourceActions'/)
  assert.match(source, /pickPersonalSpaceDirectory/)
  assert.match(source, /exportStoryboardAssetToTarget/)
  assert.match(source, /createPortraitAssetForUpload/)
  assert.match(source, /createCommonResourceAssetForUpload/)
  assert.match(source, /deleteAssetWithOptionalResources/)
  assert.match(source, /applyAssetDeleteResult/)
  assert.doesNotMatch(source, /function supportsDirectoryPicker/)
  assert.doesNotMatch(source, /function downloadJsonFile/)
  assert.doesNotMatch(source, /function pickDirectoryHandle/)
  assert.doesNotMatch(source, /URL\.createObjectURL\(file\)/)
  assert.doesNotMatch(source, /writeAssetResourcesToDirectory/)
  assert.doesNotMatch(source, /writeJsonFileToDirectory/)
  assert.doesNotMatch(source, /deleteStoredResourceFiles/)
  assert.match(actionsSource, /showDirectoryPicker/)
  assert.match(actionsSource, /URL\.createObjectURL/)
  assert.match(actionsSource, /writeAssetResourcesToDirectory/)
  assert.match(actionsSource, /writeJsonFileToDirectory/)
  assert.match(actionsSource, /deleteStoredResourceFiles/)
})

test('personal space model delegates asset factories and storage paths', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const assetSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceAssets'/)
  assert.match(source, /export \{[\s\S]*createPersonalSpaceAsset[\s\S]*archiveAssetForStorageDirectory[\s\S]*createResourceAssetFromUpload[\s\S]*\} from '\.\/personalSpaceAssets'/)
  assert.doesNotMatch(source, /function sanitizePathPart/)
  assert.doesNotMatch(source, /function groupNameForUploadedResource/)
  assert.doesNotMatch(source, /export function createPersonalSpaceAsset/)
  assert.doesNotMatch(source, /export function archiveAssetForStorageDirectory/)
  assert.doesNotMatch(source, /export function createResourceAssetFromUpload/)
  assert.match(assetSource, /export function createPersonalSpaceAsset/)
  assert.match(assetSource, /export function archiveAssetForStorageDirectory/)
  assert.match(assetSource, /export function createResourceAssetFromUpload/)
  assert.match(assetSource, /function sanitizePathPart/)
  assert.match(assetSource, /function groupNameForUploadedResource/)
})

test('personal space model delegates storyboard operations', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const storyboardSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceStoryboards.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceStoryboards'/)
  assert.match(source, /export \{[\s\S]*addStoryboardGroup[\s\S]*assignVoiceToStoryboardGroup[\s\S]*exportStoryboardReference[\s\S]*\} from '\.\/personalSpaceStoryboards'/)
  assert.doesNotMatch(source, /export function addStoryboardGroup/)
  assert.doesNotMatch(source, /export function assignVoiceToStoryboardGroup/)
  assert.doesNotMatch(source, /export function exportStoryboardReference/)
  assert.match(storyboardSource, /export function addStoryboardGroup/)
  assert.match(storyboardSource, /export function assignVoiceToStoryboardGroup/)
  assert.match(storyboardSource, /export function exportStoryboardReference/)
})

test('personal space model delegates state persistence and cloning', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const stateSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceState.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceState'/)
  assert.match(source, /export \{[\s\S]*clonePersonalSpaceState[\s\S]*readPersonalSpaceState[\s\S]*writePersonalSpaceState[\s\S]*\} from '\.\/personalSpaceState'/)
  assert.doesNotMatch(source, /export const defaultPersonalSpaceState/)
  assert.doesNotMatch(source, /export function clonePersonalSpaceState/)
  assert.doesNotMatch(source, /export function readPersonalSpaceState/)
  assert.doesNotMatch(source, /export function writePersonalSpaceState/)
  assert.match(stateSource, /export const defaultPersonalSpaceState/)
  assert.match(stateSource, /export function clonePersonalSpaceState/)
  assert.match(stateSource, /export function createPersonalSpaceId/)
})

test('personal space model delegates character operations', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const characterSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceCharacters.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceCharacters'/)
  assert.match(source, /export \{[\s\S]*addCharacterProfile[\s\S]*assignAssetToCharacterColumn[\s\S]*reorderCharacterVoice[\s\S]*\} from '\.\/personalSpaceCharacters'/)
  assert.doesNotMatch(source, /export function addCharacterProfile/)
  assert.doesNotMatch(source, /export function assignAssetToCharacterColumn/)
  assert.doesNotMatch(source, /export function reorderCharacterVoice/)
  assert.doesNotMatch(source, /function normalizeCharacterOrder/)
  assert.match(characterSource, /export function addCharacterProfile/)
  assert.match(characterSource, /export function assignAssetToCharacterColumn/)
  assert.match(characterSource, /export function reorderCharacterVoice/)
  assert.match(characterSource, /function normalizeCharacterOrder/)
})

test('personal space model delegates asset update and delete operations', () => {
  const source = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceModel.ts', 'utf8')
  const operationsSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts', 'utf8')

  assert.match(source, /from '\.\/personalSpaceAssetOperations'/)
  assert.match(source, /export \{[\s\S]*deletePersonalSpaceAsset[\s\S]*updatePersonalSpaceAsset[\s\S]*\} from '\.\/personalSpaceAssetOperations'/)
  assert.doesNotMatch(source, /export function updatePersonalSpaceAsset/)
  assert.doesNotMatch(source, /export function deletePersonalSpaceAsset/)
  assert.doesNotMatch(source, /normalizeAssetLinks/)
  assert.match(operationsSource, /export function updatePersonalSpaceAsset/)
  assert.match(operationsSource, /export function deletePersonalSpaceAsset/)
  assert.match(operationsSource, /normalizeAssetLinks/)
})

test('layout workspace delegates batch frame layout presets to the model', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const modelSource = readFileSync('src/components/MultiFrameSpriteWorkspace/layoutModel.ts', 'utf8')

  assert.match(source, /applyLayoutPresetToFrames/)
  assert.match(modelSource, /export function applyLayoutPresetToFrames/)
  assert.doesNotMatch(source, /const applyAllSize = /)
  assert.doesNotMatch(source, /Math\.max\(\.\.\.frames\.map\(\(f\) => f\.layout\.width\)\)/)
  assert.doesNotMatch(source, /item\.matteWidth \/ Math\.max\(1, item\.matteHeight\)/)
})

test('layout workspace delegates canvas ratio apply feedback to a focused hook', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts', 'utf8')
  const feedbackSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useCanvasRatioApplyFeedback.ts', 'utf8')

  assert.match(source, /from '\.\/useCanvasRatioApplyFeedback'/)
  assert.match(source, /useCanvasRatioApplyFeedback/)
  assert.doesNotMatch(source, /CANVAS_RATIO_MESSAGE_KEY/)
  assert.doesNotMatch(source, /canvasRatioApplyIdsRef/)
  assert.doesNotMatch(source, /canvasRatioFallbackTimerRef/)
  assert.doesNotMatch(source, /getPendingComposedFrameIds/)
  assert.match(feedbackSource, /CANVAS_RATIO_MESSAGE_KEY/)
  assert.match(feedbackSource, /getPendingComposedFrameIds/)
  assert.match(feedbackSource, /startCanvasRatioApplyFeedback/)
  assert.match(feedbackSource, /canvasRatioApplying/)
})
