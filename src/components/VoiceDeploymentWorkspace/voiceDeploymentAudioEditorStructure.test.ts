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
  assert.match(panelSource, /添加选中区块/)
  assert.match(panelSource, /导出到本地/)
  assert.match(panelSource, /收藏到项目空间-配音/)
  assert.match(panelSource, /收藏到项目空间-音效/)
  assert.match(panelSource, /onContextMenu/)
  assert.match(panelSource, /draggable/)
  assert.doesNotMatch(panelSource, /设为开始/)
  assert.doesNotMatch(panelSource, /设为结束/)
  assert.match(cssHub, /voiceDeployment\.audioEditor\.css/)
})

test('audio clip editor keeps wavesurfer region updates constrained with fresh callbacks', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')

  assert.match(panelSource, /editorCallbacksRef/)
  assert.match(panelSource, /region-update/)
  assert.match(panelSource, /editorCallbacksRef\.current\.onUpdateRegion/)
  assert.doesNotMatch(panelSource, /regionsPlugin\.on\('region-updated', \(region\) => \{\s+onSelectRegion/)
})

test('audio clip editor renders pending segments as wrapped waveform cards with playback in the pending block', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const cssSource = read('src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css')

  assert.match(panelSource, /audio-editor-pending-block/)
  assert.match(panelSource, />待处理</)
  assert.match(panelSource, /播放全部/)
  assert.match(panelSource, /playPendingAt\(index\)/)
  assert.match(panelSource, /audio-editor-pending-waveform/)
  assert.match(panelSource, /audio-editor-pending-card/)
  assert.doesNotMatch(panelSource, /播放待处理/)
  assert.doesNotMatch(panelSource, /待处理列表/)
  assert.match(cssSource, /audio-editor-pending-list[\s\S]*flex-wrap:\s*wrap/)
  assert.match(cssSource, /audio-editor-pending-card/)
  assert.match(cssSource, /audio-editor-pending-waveform/)
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

test('audio editor workspace owns multi-segment workflow and source-specific output actions', () => {
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts')
  const workspaceSource = read('src/components/VoiceDeploymentWorkspace/index.tsx')

  assert.match(hookSource, /audioSegmentModel/)
  assert.match(hookSource, /exportAudioClip/)
  assert.match(hookSource, /collectVoiceRecordToPersonalSpace/)
  assert.match(hookSource, /collectSoundEffectRecordToPersonalSpace/)
  assert.match(hookSource, /regions/)
  assert.match(hookSource, /selectedRegionId/)
  assert.match(hookSource, /pendingSegments/)
  assert.match(hookSource, /canGenerateHistory/)
  assert.match(hookSource, /canCollectVoice/)
  assert.match(hookSource, /canCollectSound/)
  assert.match(hookSource, /onAddRegionAt/)
  assert.match(hookSource, /onGenerateHistory/)
  assert.match(hookSource, /onExportClip/)
  assert.match(hookSource, /onCollectVoiceClip/)
  assert.match(hookSource, /onCollectSoundClip/)
  assert.match(workspaceSource, /onPersonalSpaceUpdated/)
})
