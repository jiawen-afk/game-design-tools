import { Alert, type UploadProps } from 'antd'
import { ScissorOutlined } from '@ant-design/icons'

import {
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import {
  type AudioPendingDropPlacement,
  type AudioPendingSegment,
  type AudioSegmentRegion,
} from './audioSegmentModel'
import { buildAudioClipEditorViewModel } from './audioClipEditorViewModel'
import { AudioClipEditorImportSurface } from './AudioClipEditorImportSurface'
import { AudioClipEditorMenus } from './AudioClipEditorMenus'
import { AudioClipEditorOutputActions } from './AudioClipEditorOutputActions'
import { AudioClipEditorSegments } from './AudioClipEditorSegments'
import { AudioClipEditorTimeGrid } from './AudioClipEditorTimeGrid'
import { AudioClipEditorToolbar } from './AudioClipEditorToolbar'
import { AudioClipEditorTrack } from './AudioClipEditorTrack'
import { useAudioClipWaveform } from './useAudioClipWaveform'
import { useAudioPendingSegmentDrag } from './useAudioPendingSegmentDrag'

export interface AudioClipEditorPanelProps {
  source: AudioClipSource | null
  durationSeconds: number
  regions: AudioSegmentRegion[]
  selectedRegionId: string
  pendingSegments: AudioPendingSegment[]
  range: AudioClipRange
  currentTimeSeconds: number
  outputName: string
  saving: boolean
  canGenerateHistory: boolean
  canExport: boolean
  canCollectVoice: boolean
  canCollectSound: boolean
  canAddSelectedRegionToPending: boolean
  error: string
  onDurationChange: (seconds: number) => void
  onAddRegionAt: (seconds: number) => void
  onSelectRegion: (regionId: string) => void
  onUpdateRegion: (regionId: string, range: AudioClipRange) => void
  onDeleteRegion: (regionId: string) => void
  onAddSelectedRegionToPending: () => void
  onRemovePendingSegment: (regionId: string) => void
  onReorderPendingSegment: (fromIndex: number, toIndex: number) => void
  onCommitPendingSegmentsOrder: (segments: AudioPendingSegment[]) => void
  onReorderPendingSegmentAroundTarget: (
    draggedRegionId: string,
    targetRegionId: string,
    placement: AudioPendingDropPlacement,
  ) => void
  onRangeChange: (range: AudioClipRange) => void
  onCurrentTimeChange: (seconds: number) => void
  onOutputNameChange: (name: string) => void
  onImportAudioFile: (file: File) => void
  onPlayPendingSegments: (
    segments: AudioPendingSegment[],
    loop: boolean,
    onProgress: (sourceTimeSeconds: number) => void,
  ) => void
  onStopPendingPreviewPlayback: () => void
  onGenerateHistory: (segments: AudioPendingSegment[]) => void
  onExportClip: (segments: AudioPendingSegment[]) => void
  onCollectVoiceClip: (segments: AudioPendingSegment[]) => void
  onCollectSoundClip: (segments: AudioPendingSegment[]) => void
}

export function AudioClipEditorPanel({
  source,
  durationSeconds,
  regions,
  selectedRegionId,
  pendingSegments,
  range,
  currentTimeSeconds,
  outputName,
  saving,
  canGenerateHistory,
  canExport,
  canCollectVoice,
  canCollectSound,
  canAddSelectedRegionToPending,
  error,
  onDurationChange,
  onAddRegionAt,
  onSelectRegion,
  onUpdateRegion,
  onDeleteRegion,
  onAddSelectedRegionToPending,
  onRemovePendingSegment,
  onCommitPendingSegmentsOrder,
  onRangeChange,
  onCurrentTimeChange,
  onOutputNameChange,
  onImportAudioFile,
  onPlayPendingSegments,
  onStopPendingPreviewPlayback,
  onGenerateHistory,
  onExportClip,
  onCollectVoiceClip,
  onCollectSoundClip,
}: AudioClipEditorPanelProps) {
  const {
    contextMenu,
    pendingSegmentsRef,
    waveformRef,
    handleWaveformContextMenu,
    pausePlayback,
    playPendingAt,
    playPendingSegments,
    playSelectedRegion,
    setContextMenu,
    setPendingPlaybackLoop,
    stopPendingSequencePlayback,
    toggleSourcePlayback,
  } = useAudioClipWaveform({
    source,
    durationSeconds,
    regions,
    selectedRegionId,
    pendingSegments,
    onDurationChange,
    onCurrentTimeChange,
    onSelectRegion,
    onUpdateRegion,
    onStopPendingPreviewPlayback,
    onPlayPendingSegments,
  })
  const {
    draggedPendingRegionId,
    pendingDropTarget,
    previewPendingSegments,
    endPendingDrag,
    handlePendingListDragLeave,
    handlePendingListDragOver,
    handlePendingListDrop,
    startPendingDrag,
  } = useAudioPendingSegmentDrag({
    pendingSegments,
    pendingSegmentsRef,
    onCommitPendingSegmentsOrder,
  })
  const importUploadProps: UploadProps = {
    accept: 'audio/*',
    showUploadList: false,
    beforeUpload: (file: File) => {
      onImportAudioFile(file)
      return false
    },
  }

  const editorViewModel = source
    ? buildAudioClipEditorViewModel({
      source,
      range,
      pendingSegments,
      previewPendingSegments,
    })
    : null

  const addContextRegion = () => {
    if (contextMenu?.type !== 'waveform') return
    onAddRegionAt(contextMenu.atSeconds)
    setContextMenu(null)
  }

  const deleteContextRegion = () => {
    if (contextMenu?.type !== 'region') return
    onDeleteRegion(contextMenu.regionId)
    setContextMenu(null)
  }

  if (!source) {
    return (
      <AudioClipEditorImportSurface
        error={error}
        uploadProps={importUploadProps}
      />
    )
  }

  if (!editorViewModel) return null

  return (
    <section className="voice-panel audio-editor-panel" aria-labelledby="audio-editor-title">
      <div className="panel-title">
        <ScissorOutlined />
        <h3 id="audio-editor-title">音频编辑</h3>
      </div>

      <AudioClipEditorImportSurface
        durationSeconds={durationSeconds}
        source={source}
        sourceKindLabel={editorViewModel.sourceKindLabel}
        uploadProps={importUploadProps}
      />

      <AudioClipEditorTrack
        waveformRef={waveformRef}
        onContextMenu={handleWaveformContextMenu}
      />

      <AudioClipEditorMenus
        contextMenu={contextMenu}
        onAddContextRegion={addContextRegion}
        onDeleteContextRegion={deleteContextRegion}
      />

      <AudioClipEditorToolbar
        canAddSelectedRegionToPending={canAddSelectedRegionToPending}
        selectedRegionId={selectedRegionId}
        onAddSelectedRegionToPending={onAddSelectedRegionToPending}
        onPausePlayback={pausePlayback}
        onPlaySelectedRegion={playSelectedRegion}
        onToggleSourcePlayback={toggleSourcePlayback}
      />

      <AudioClipEditorTimeGrid
        currentTimeSeconds={currentTimeSeconds}
        durationSeconds={durationSeconds}
        pendingDuration={editorViewModel.pendingDuration}
        range={range}
        selectedDuration={editorViewModel.selectedDuration}
        selectedRegionId={selectedRegionId}
        onRangeChange={onRangeChange}
      />

      <AudioClipEditorSegments
        draggedPendingRegionId={draggedPendingRegionId}
        pendingDropTarget={pendingDropTarget}
        pendingDuration={editorViewModel.pendingDuration}
        pendingSegments={pendingSegments}
        visiblePendingSegments={editorViewModel.visiblePendingSegments}
        onDragEnd={endPendingDrag}
        onDragLeave={handlePendingListDragLeave}
        onDragOver={handlePendingListDragOver}
        onDragStart={startPendingDrag}
        onDrop={handlePendingListDrop}
        onLoopChange={setPendingPlaybackLoop}
        onPlayAll={playPendingSegments}
        onPlayPendingSegment={(index) => {
          onStopPendingPreviewPlayback()
          stopPendingSequencePlayback()
          playPendingAt(index)
        }}
        onRemovePendingSegment={onRemovePendingSegment}
        onSelectRegion={onSelectRegion}
      />

      <AudioClipEditorOutputActions
        canCollectSound={canCollectSound}
        canCollectVoice={canCollectVoice}
        canExport={canExport}
        canGenerateHistory={canGenerateHistory}
        outputName={outputName}
        pendingSegments={pendingSegments}
        saving={saving}
        onCollectSoundClip={onCollectSoundClip}
        onCollectVoiceClip={onCollectVoiceClip}
        onExportClip={onExportClip}
        onGenerateHistory={onGenerateHistory}
        onOutputNameChange={onOutputNameChange}
      />

      {error ? <Alert type="warning" showIcon title={error} /> : null}
    </section>
  )
}
