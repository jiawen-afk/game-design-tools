import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('voice deployment workspace delegates collect-link dialog state', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const workspaceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts', 'utf8')
  const hookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceCollectLinkDialog.ts', 'utf8')

  assert.match(source, /from '\.\/useVoiceDeploymentWorkspace'/)
  assert.match(workspaceHookSource, /from '\.\/useVoiceCollectLinkDialog'/)
  assert.match(workspaceHookSource, /useVoiceCollectLinkDialog/)
  assert.doesNotMatch(source, /interface PendingVoiceCollectLink/)
  assert.doesNotMatch(source, /setPendingCollectLink/)
  assert.doesNotMatch(source, /const collectLinkMeta = /)
  assert.match(hookSource, /interface PendingVoiceCollectLink/)
  assert.match(hookSource, /setPendingCollectLink/)
  assert.match(hookSource, /collectLinkMeta/)
  assert.match(hookSource, /openCollectLinkDialog/)
  assert.match(hookSource, /confirmCollectLink/)
})

test('voice deployment workspace delegates collect-link modal view', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/index.tsx', 'utf8')
  const modalPath = 'src/components/VoiceDeploymentWorkspace/VoiceCollectLinkModal.tsx'

  assert.ok(existsSync(modalPath), 'voice collect-link modal should exist')
  const modalSource = readFileSync(modalPath, 'utf8')

  assert.match(source, /from '\.\/VoiceCollectLinkModal'/)
  assert.match(source, /<VoiceCollectLinkModal/)
  assert.doesNotMatch(source, /<Modal[\s\S]*收藏并关联/)
  assert.doesNotMatch(source, /<Select[\s\S]*notFoundContent=\{collectLinkMeta\.empty\}/)
  assert.match(modalSource, /function VoiceCollectLinkModal/)
  assert.match(modalSource, /<Modal/)
  assert.match(modalSource, /okText="收藏并关联"/)
  assert.match(modalSource, /notFoundContent=\{collectLinkMeta\.empty\}/)
})

test('voice deployment links generated voices to effect assets by subtype', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceProjectSpaceActions.ts', 'utf8')

  assert.match(source, /asset\.assetSubtype === 'effect'/)
  assert.doesNotMatch(source, /asset\.kind === 'effect'/)
})
