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

test('voice history records can open clip editing', () => {
  const voiceLibrarySource = read('src/components/VoiceDeploymentWorkspace/VoiceLibraryPanel.tsx')
  const voiceRecordListSource = read('src/components/VoiceDeploymentWorkspace/VoiceRecordLists.tsx')

  assert.match(voiceLibrarySource, /onClip/)
  assert.match(voiceRecordListSource, /剪辑片段/)
  assert.match(voiceRecordListSource, /ScissorOutlined/)
})

test('audio editor can import local audio files directly', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts')
  const cssSource = read('src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css')

  assert.match(panelSource, /Upload\.Dragger/)
  assert.match(panelSource, /拖入音频文件/)
  assert.match(panelSource, /onImportAudioFile/)
  assert.match(hookSource, /createAudioClipSourceFromImportedFile/)
  assert.match(hookSource, /URL\.createObjectURL/)
  assert.match(hookSource, /URL\.revokeObjectURL/)
  assert.match(cssSource, /audio-import-dropzone/)
})
