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
  assert.match(panelSource, /添加选中区块到待处理/)
  assert.match(panelSource, /导出到本地/)
  assert.match(panelSource, /收藏到项目空间-配音/)
  assert.match(panelSource, /收藏到项目空间-音效/)
  assert.match(panelSource, /onContextMenu/)
  assert.match(panelSource, /draggable/)
  assert.doesNotMatch(panelSource, /设为开始/)
  assert.doesNotMatch(panelSource, /设为结束/)
  assert.match(cssHub, /voiceDeployment\.audioEditor\.css/)
})

test('audio clip editor persists region edits after drag instead of fighting live drag updates', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')

  assert.match(panelSource, /editorCallbacksRef/)
  assert.match(panelSource, /region-update/)
  assert.match(panelSource, /region-updated/)
  assert.match(panelSource, /editorCallbacksRef\.current\.onUpdateRegion/)
  assert.doesNotMatch(panelSource, /regionsPlugin\.on\('region-update', syncUpdatedRegion\)/)
  assert.match(panelSource, /regionsPlugin\.on\('region-updated', syncUpdatedRegion\)/)
})

test('audio clip editor renders pending segments as wrapped waveform cards with playback in the pending block', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const cssSource = read('src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css')

  assert.match(panelSource, /audio-editor-pending-block/)
  assert.match(panelSource, />待处理</)
  assert.match(panelSource, /播放全部/)
  assert.match(panelSource, /playPendingAt\(pendingIndex\)/)
  assert.match(panelSource, /audio-editor-pending-waveform/)
  assert.match(panelSource, /audio-editor-pending-card/)
  assert.doesNotMatch(panelSource, /播放待处理/)
  assert.doesNotMatch(panelSource, /待处理列表/)
  assert.match(cssSource, /audio-editor-pending-list[\s\S]*flex-wrap:\s*wrap/)
  assert.match(cssSource, /audio-editor-pending-card/)
  assert.match(cssSource, /audio-editor-pending-waveform/)
})

test('audio clip editor puts add-selected action next to selected playback control', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const controlsMatch = panelSource.match(
    /<div className="audio-editor-controls">([\s\S]*?)<\/div>\n\n      <div className="audio-editor-time-grid">/,
  )
  const pendingActionsMatch = panelSource.match(
    /<div className="audio-editor-pending-actions">([\s\S]*?)<\/div>\n        <\/div>/,
  )

  assert.ok(controlsMatch)
  assert.ok(pendingActionsMatch)
  assert.match(controlsMatch[1], /播放选中区块[\s\S]*添加选中区块到待处理/)
  assert.match(controlsMatch[1], /onAddSelectedRegionToPending/)
  assert.doesNotMatch(pendingActionsMatch[1], /添加选中区块/)
  assert.doesNotMatch(pendingActionsMatch[1], /onAddSelectedRegionToPending/)
})

test('audio clip editor previews pending playback through the rendered export audio', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts')
  const cssSource = read('src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css')

  assert.match(panelSource, /onPlayPendingSegments: \(\s*segments: AudioPendingSegment\[\],\s*loop: boolean,\s*onProgress: \(sourceTimeSeconds: number\) => void,\s*\) => void/)
  assert.match(panelSource, /onPlayPendingSegments\(\s*pendingSegmentsRef\.current,\s*pendingPlaybackRef\.current\.loop,\s*\(sourceTimeSeconds\) => \{/)
  assert.match(panelSource, /waveSurferRef\.current\?\.setTime\(sourceTimeSeconds\)/)
  assert.match(panelSource, /editorCallbacksRef\.current\.onCurrentTimeChange\(sourceTimeSeconds\)/)
  assert.match(panelSource, /onStopPendingPreviewPlayback/)
  assert.doesNotMatch(panelSource, /playPendingAt\(0, 'sequence'\)/)
  assert.match(hookSource, /playPendingSegmentsPreview/)
  assert.match(hookSource, /resolvePendingPreviewSourceTime/)
  assert.match(hookSource, /onProgress\(sourceTimeSeconds\)/)
  assert.match(hookSource, /requestAnimationFrame/)
  assert.match(hookSource, /cancelAnimationFrame/)
  assert.match(hookSource, /const ranges = currentOutputRanges\(segments\)/)
  assert.match(hookSource, /const wav = await renderAudioClipWav/)
  assert.match(hookSource, /URL\.createObjectURL\(wav\)/)
  assert.match(hookSource, /new Audio\(previewAudioUrl\)/)
  assert.match(panelSource, /data-audio-pending-region-id/)
  assert.match(panelSource, /is-drop-before/)
  assert.match(panelSource, /is-drop-after/)
  assert.match(panelSource, /previewPendingSegments/)
  assert.match(hookSource, /reorderPendingSegmentsAroundTarget/)
  assert.match(cssSource, /audio-editor-pending-card\.is-drop-before/)
  assert.match(cssSource, /audio-editor-pending-card\.is-drop-after/)
})

test('audio clip editor commits the visible pending drop target when reordering before export', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')

  assert.match(panelSource, /pendingDropTargetRef/)
  assert.match(panelSource, /pendingDropTargetRef\.current = target/)
  assert.match(panelSource, /pendingDropTargetRef\.current \?\? getPendingDropTarget/)
  assert.match(panelSource, /const committedPendingSegments = previewPendingSegmentsRef\.current \?\? reorderPendingSegmentsAroundTarget/)
  assert.match(panelSource, /onCommitPendingSegmentsOrder\(committedPendingSegments\)/)
  assert.doesNotMatch(panelSource, /onReorderPendingSegmentAroundTarget\(\s*draggedRegionId,\s*target\.regionId,\s*target\.placement\s*\)/)
})

test('audio clip editor keeps pending playback and export refs fresh after reordering', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts')
  const renderRefSetup = panelSource.slice(
    panelSource.indexOf('const [previewPendingSegments, setPreviewPendingSegments]'),
    panelSource.indexOf('useEffect(() => {\n    editorCallbacksRef'),
  )

  assert.match(panelSource, /useLayoutEffect/)
  assert.doesNotMatch(renderRefSetup, /pendingSegmentsRef\.current = pendingSegments/)
  assert.match(panelSource, /previewPendingSegmentsRef/)
  assert.match(panelSource, /previewPendingSegmentsRef\.current \?\? reorderPendingSegmentsAroundTarget/)
  assert.match(panelSource, /onPlayPendingSegments\(\s*pendingSegmentsRef\.current,\s*pendingPlaybackRef\.current\.loop,\s*\(sourceTimeSeconds\) => \{/)
  assert.match(panelSource, /waveSurferRef\.current\?\.pause\(\)[\s\S]*onPlayPendingSegments/)
  assert.match(hookSource, /pendingSegmentsRef\.current = next/)
  assert.match(hookSource, /onCommitPendingSegmentsOrder: updatePendingSegments/)
  assert.match(hookSource, /const ranges = currentOutputRanges\(segments\)[\s\S]*exportAudioClip/)
  assert.match(hookSource, /const ranges = currentOutputRanges\(segments\)[\s\S]*saveRenderedAudio\(ranges\)/)
})

test('audio clip editor sends the current visible pending order to output actions', () => {
  const panelSource = read('src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx')
  const hookSource = read('src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts')

  assert.match(panelSource, /onGenerateHistory\(pendingSegmentsRef\.current\)/)
  assert.match(panelSource, /onExportClip\(pendingSegmentsRef\.current\)/)
  assert.match(panelSource, /onCollectVoiceClip\(pendingSegmentsRef\.current\)/)
  assert.match(panelSource, /onCollectSoundClip\(pendingSegmentsRef\.current\)/)
  assert.match(hookSource, /currentOutputRanges = \(segments: AudioPendingSegment\[\] = pendingSegmentsRef\.current\)/)
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
  assert.match(hookSource, /pendingSegmentsRef/)
  assert.match(hookSource, /currentOutputRanges/)
  assert.match(hookSource, /createAudioClipOutputRanges\(segments\)/)
  assert.doesNotMatch(hookSource, /ranges: outputRanges/)
  assert.doesNotMatch(hookSource, /pendingSegments\.map\(\(\{ startSeconds, endSeconds \}\)/)
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
