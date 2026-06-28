import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('desktop service startup workflow is shared by voice and ai matting setup hooks', () => {
  const workflowPath = 'src/components/DesktopServiceRuntime/desktopServiceWorkflow.ts'
  const voiceHookSource = readFileSync('src/components/VoiceDeploymentWorkspace/useVoiceDeploymentSetup.ts', 'utf8')
  const mattingHookSource = readFileSync('src/components/MultiFrameSpriteWorkspace/useAiMattingSetup.ts', 'utf8')

  assert.ok(existsSync(workflowPath), `${workflowPath} should exist`)
  const workflowSource = readFileSync(workflowPath, 'utf8')

  assert.match(workflowSource, /export async function runDesktopServiceStartup/)
  assert.match(workflowSource, /export async function waitForDesktopServiceConnection/)
  assert.match(voiceHookSource, /from '\.\.\/DesktopServiceRuntime\/desktopServiceWorkflow'/)
  assert.match(mattingHookSource, /from '\.\.\/DesktopServiceRuntime\/desktopServiceWorkflow'/)
  assert.doesNotMatch(voiceHookSource, /for \(let attempt = 0; attempt < 60/)
  assert.doesNotMatch(mattingHookSource, /for \(let attempt = 0; attempt < 60/)
  assert.doesNotMatch(voiceHookSource, /依赖安装未完成，启动服务已取消/)
  assert.doesNotMatch(mattingHookSource, /依赖安装未完成，启动服务已取消/)
})
