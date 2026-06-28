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
