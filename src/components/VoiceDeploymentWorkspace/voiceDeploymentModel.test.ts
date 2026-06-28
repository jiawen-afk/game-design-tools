import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

test('voice deployment model tests stay split by responsibility', () => {
  const source = readFileSync('src/components/VoiceDeploymentWorkspace/voiceDeploymentModel.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/VoiceDeploymentWorkspace/voiceDeploymentHardwareModel.test.ts',
    'src/components/VoiceDeploymentWorkspace/voiceDeploymentPayloadModel.test.ts',
    'src/components/VoiceDeploymentWorkspace/voiceDeploymentRecordModel.test.ts',
    'src/components/VoiceDeploymentWorkspace/voiceDeploymentScriptStructure.test.ts',
    'src/components/VoiceDeploymentWorkspace/voiceDeploymentLibraryStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'voiceDeploymentModel.test.ts should only keep split guards')
  for (const delegatedToken of [
    'parseNvidia' + 'SmiReport',
    'buildGradio' + 'GeneratePayload',
    'createVoice' + 'RecordName',
    'voxcpmDeployment' + 'ScriptPaths',
    'Voice' + 'LibraryPanel',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
