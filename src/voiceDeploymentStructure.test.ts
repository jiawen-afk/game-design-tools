import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('voice deployment structure tests stay split by workspace responsibility', () => {
  const source = readFileSync('src/voiceDeploymentStructure.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/voiceDeploymentStyleStructure.test.ts',
    'src/voiceDeploymentWorkspaceSideEffectsStructure.test.ts',
    'src/voiceDeploymentSetupStructure.test.ts',
    'src/voiceDeploymentServiceControlsStructure.test.ts',
    'src/voiceDeploymentGenerationStructure.test.ts',
    'src/voiceDeploymentRecordLibraryStructure.test.ts',
    'src/voiceDeploymentCollectStructure.test.ts',
    'src/voiceDeploymentSoundStructure.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'voiceDeploymentStructure.test.ts should only keep split guards')
  for (const delegatedToken of [
    'voiceDeployment' + 'StyleEntryPath',
    'VoiceGeneration' + 'Panel',
    'VoiceWorkspace' + 'Header',
    'VoiceLibrary' + 'Panel',
    'VoiceCollect' + 'LinkModal',
    'useVoiceGeneration' + 'Workflow',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
