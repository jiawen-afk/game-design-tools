import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

test('audio clip editor uses wavesurfer regions and focused editor styling', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const cssHub = read('src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css')

  assert.match(panelSource, /wavesurfer\.js/)
  assert.match(panelSource, /regions/)
  assert.match(panelSource, /剪辑片段/)
  assert.match(panelSource, /生成新音频/)
  assert.match(panelSource, /设为开始/)
  assert.match(panelSource, /设为结束/)
  assert.match(cssHub, /voiceDeployment\.audioEditor\.css/)
})
