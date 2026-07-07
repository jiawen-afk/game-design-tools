import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('voice deployment workspace delegates service, record, and personal space side effects', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const workspaceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts', 'utf8')
  const serviceSource = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentService.ts', 'utf8')
  const setupHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentSetup.ts', 'utf8')
  const generationHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceGenerationWorkflow.ts', 'utf8')
  const projectSpaceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceProjectSpaceActions.ts', 'utf8')
  const recordLibraryHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceRecordLibrary.ts', 'utf8')

  assert.doesNotMatch(source, /from '\.\/voiceDeploymentService'/)
  assert.doesNotMatch(source, /from '\.\/voiceRecordStorage'/)
  assert.match(source, /from '\.\/useVoiceDeploymentWorkspace'/)
  assert.match(workspaceHookSource, /from '\.\/useVoiceRecordLibrary'/)
  assert.match(workspaceHookSource, /from '\.\/useVoiceProjectSpaceActions'/)
  assert.match(workspaceHookSource, /useVoiceProjectSpaceActions/)
  assert.match(workspaceHookSource, /useVoiceGenerationWorkflow/)
  assert.doesNotMatch(source, /from '\.\/voicePersonalSpaceCollector'/)
  assert.doesNotMatch(source, /collectVoiceRecordToPersonalSpace/)
  assert.doesNotMatch(source, /persistCurrentProjectSpaceState/)
  assert.doesNotMatch(source, /showCurrentProjectSpaceSyncWarning/)
  assert.doesNotMatch(source, /readCurrentProjectSpaceState/)
  assert.doesNotMatch(source, /writeCurrentProjectSpaceState/)
  assert.doesNotMatch(source, /已保存到本地项目缓存，但同步项目存储失败/)
  assert.match(projectSpaceHookSource, /collectVoiceRecordToPersonalSpace/)
  assert.match(projectSpaceHookSource, /persistCurrentProjectSpaceState/)
  assert.match(projectSpaceHookSource, /showCurrentProjectSpaceSyncWarning/)
  assert.match(projectSpaceHookSource, /readCurrentProjectSpaceState/)
  assert.match(setupHookSource, /from '\.\/voiceDeploymentService'/)
  assert.match(setupHookSource, /checkConnection/)
  assert.match(generationHookSource, /generateVoiceAudio/)
  assert.match(recordLibraryHookSource, /from '\.\/voiceRecordStorage'/)
  assert.match(recordLibraryHookSource, /readStoredRecords/)
  assert.match(recordLibraryHookSource, /writeStoredRecords/)
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

test('voice deployment service command results use the shared toast layer', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const workspaceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts', 'utf8')

  assert.match(source, /useVoiceDeploymentWorkspace/)
  assert.match(workspaceHookSource, /useAppToast/)
  assert.match(workspaceHookSource, /showToast/)
  assert.match(workspaceHookSource, /desktopServiceResult/)
  assert.match(workspaceHookSource, /服务命令已执行/)
  assert.doesNotMatch(source, /className="status-alert"/)
  assert.doesNotMatch(source, /<Alert[\s\S]*desktopServiceResult/)
})

test('voice deployment workspace delegates shell orchestration to a focused hook', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const workspaceHookPath = 'src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts'
  const workspaceHookSource = existsSync(workspaceHookPath) ? readFileSync(workspaceHookPath, 'utf8') : ''

  assert.ok(existsSync(workspaceHookPath), 'voice deployment workspace hook should exist')
  assert.match(source, /from '\.\/useVoiceDeploymentWorkspace'/)
  assert.match(source, /useVoiceDeploymentWorkspace/)
  for (const orchestrationToken of [
    'useVoiceDeploymentSetup',
    'useVoiceProjectSpaceActions',
    'useVoiceRecordLibrary',
    'useVoiceGenerationWorkflow',
    'useVoiceCollectLinkDialog',
    'useAppToast',
    'voiceModeMeta',
    'desktopServiceResult',
  ]) {
    assert.doesNotMatch(source, new RegExp(orchestrationToken))
    assert.match(workspaceHookSource, new RegExp(orchestrationToken))
  }
})

test('audio clip editor delegates import surface, menus, toolbar, track, and pending segments', () => {
  const panelPath = 'src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx'
  const importWorkflowPath = 'src/components/VoiceDeploymentWorkspace/useAudioClipImportWorkflow.ts'
  const viewModelPath = 'src/components/VoiceDeploymentWorkspace/audioClipEditorViewModel.ts'
  const importSurfacePath = 'src/components/VoiceDeploymentWorkspace/AudioClipEditorImportSurface.tsx'
  const toolbarPath = 'src/components/VoiceDeploymentWorkspace/AudioClipEditorToolbar.tsx'
  const trackPath = 'src/components/VoiceDeploymentWorkspace/AudioClipEditorTrack.tsx'
  const segmentsPath = 'src/components/VoiceDeploymentWorkspace/AudioClipEditorSegments.tsx'
  const menusPath = 'src/components/VoiceDeploymentWorkspace/AudioClipEditorMenus.tsx'

  for (const path of [
    importWorkflowPath,
    viewModelPath,
    importSurfacePath,
    toolbarPath,
    trackPath,
    segmentsPath,
    menusPath,
  ]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }

  const panelSource = readFileSync(panelPath, 'utf8')
  const workspaceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts', 'utf8')
  const importWorkflowSource = readFileSync(importWorkflowPath, 'utf8')
  const viewModelSource = readFileSync(viewModelPath, 'utf8')
  const importSurfaceSource = readFileSync(importSurfacePath, 'utf8')
  const toolbarSource = readFileSync(toolbarPath, 'utf8')
  const trackSource = readFileSync(trackPath, 'utf8')
  const segmentsSource = readFileSync(segmentsPath, 'utf8')
  const menusSource = readFileSync(menusPath, 'utf8')

  assert.match(panelSource, /AudioClipEditorImportSurface/)
  assert.match(panelSource, /AudioClipEditorToolbar/)
  assert.match(panelSource, /AudioClipEditorTrack/)
  assert.match(panelSource, /AudioClipEditorSegments/)
  assert.match(panelSource, /AudioClipEditorMenus/)
  assert.match(panelSource, /buildAudioClipEditorViewModel/)
  assert.match(workspaceHookSource, /useAudioClipImportWorkflow/)
  assert.doesNotMatch(panelSource, /supportedAudioFilePattern|createAudioClipSourceFromImportedFile/)
  assert.doesNotMatch(panelSource, /Upload\.Dragger/)
  assert.doesNotMatch(panelSource, /audio-editor-pending-card-head/)
  assert.doesNotMatch(panelSource, /audio-context-menu/)
  assert.match(importWorkflowSource, /supportedAudioFilePattern/)
  assert.match(importWorkflowSource, /createAudioClipSourceFromImportedFile/)
  assert.match(viewModelSource, /sourceKindLabel/)
  assert.match(importSurfaceSource, /Upload\.Dragger/)
  assert.match(toolbarSource, /audio-editor-controls/)
  assert.match(trackSource, /audio-waveform/)
  assert.match(segmentsSource, /audio-editor-pending-card-head/)
  assert.match(menusSource, /audio-context-menu/)
})
