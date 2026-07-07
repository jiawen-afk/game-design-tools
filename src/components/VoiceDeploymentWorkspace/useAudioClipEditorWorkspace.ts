import { useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'

import {
  createDefaultAudioClipName,
  isValidAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import {
  addPendingSegment,
  createAudioClipOutputRanges,
  createAudioSegmentRegion,
  deleteAudioSegmentRegion,
  removePendingSegment,
  reorderPendingSegments,
  reorderPendingSegmentsAroundTarget,
  syncPendingSegmentsWithRegions,
  updateAudioSegmentRegion,
  type AudioPendingDropPlacement,
  type AudioPendingSegment,
  type AudioSegmentRegion,
} from './audioSegmentModel'
import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import { useAudioClipImportWorkflow } from './useAudioClipImportWorkflow'
import { useAudioClipEditorSaveActions } from './useAudioClipEditorSaveActions'
import { useAudioPendingPreviewPlayback } from './useAudioPendingPreviewPlayback'

interface UseAudioClipEditorWorkspaceOptions {
  onVoiceClipCreated: (record: VoiceGenerationRecord) => void
  onSoundEffectClipCreated: (record: SoundEffectRecord) => void
  onPersonalSpaceUpdated?: () => void
}

const defaultRange: AudioClipRange = { startSeconds: 0, endSeconds: 0 }
const legacySelectionRegionId = 'legacy-selection'

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useAudioClipEditorWorkspace({
  onVoiceClipCreated,
  onSoundEffectClipCreated,
  onPersonalSpaceUpdated,
}: UseAudioClipEditorWorkspaceOptions) {
  const [messageApi, messageContextHolder] = message.useMessage()
  const importedAudioUrlRef = useRef<string | null>(null)
  const [source, setSource] = useState<AudioClipSource | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [regions, setRegions] = useState<AudioSegmentRegion[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState('')
  const [pendingSegments, setPendingSegments] = useState<AudioPendingSegment[]>([])
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0)
  const [outputName, setOutputName] = useState('')
  const [error, setError] = useState('')
  const pendingSegmentsRef = useRef<AudioPendingSegment[]>([])

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  )
  const hasValidPendingSegments = pendingSegments.length > 0 && pendingSegments.every(isValidAudioClipRange)
  const canGenerateHistory = Boolean(source && source.sourceKind !== 'imported-audio')
  const canCollectVoice = Boolean(source && (source.sourceKind === 'voice' || source.sourceKind === 'imported-audio'))
  const canCollectSound = Boolean(source && (source.sourceKind === 'sound-effect' || source.sourceKind === 'imported-audio'))
  const hasExportablePendingSegments = Boolean(source) && hasValidPendingSegments
  const legacyRange = selectedRegion ?? pendingSegments[0] ?? defaultRange

  const revokeImportedAudioUrl = (exceptUrl = '') => {
    const currentUrl = importedAudioUrlRef.current
    if (currentUrl && currentUrl !== exceptUrl) URL.revokeObjectURL(currentUrl)
    if (currentUrl !== exceptUrl) importedAudioUrlRef.current = null
  }

  const updatePendingSegments = (
    updater: AudioPendingSegment[] | ((current: AudioPendingSegment[]) => AudioPendingSegment[]),
  ) => {
    const next = typeof updater === 'function'
      ? updater(pendingSegmentsRef.current)
      : updater
    pendingSegmentsRef.current = next
    setPendingSegments(next)
    return next
  }

  const currentOutputRanges = (segments: AudioPendingSegment[] = pendingSegmentsRef.current) => (
    createAudioClipOutputRanges(segments)
  )

  const hasValidCurrentPendingSegments = (
    segments: AudioPendingSegment[] = pendingSegmentsRef.current,
  ) => (
    segments.length > 0 && segments.every(isValidAudioClipRange)
  )

  const {
    playPendingSegmentsPreview,
    stopPendingPreviewPlayback,
  } = useAudioPendingPreviewPlayback({
    currentOutputRanges,
    hasValidCurrentPendingSegments,
    outputName,
    source,
    setError,
  })

  const {
    collectSoundClip,
    collectVoiceClip,
    exportClip,
    generateHistory,
    saving,
  } = useAudioClipEditorSaveActions({
    canCollectSound,
    canCollectVoice,
    canGenerateHistory,
    currentOutputRanges,
    hasValidCurrentPendingSegments,
    messageApi,
    onPersonalSpaceUpdated,
    onSoundEffectClipCreated,
    onVoiceClipCreated,
    outputName,
    setError,
    source,
  })

  useEffect(() => () => {
    revokeImportedAudioUrl()
    stopPendingPreviewPlayback()
  }, [])

  useEffect(() => {
    updatePendingSegments((current) => syncPendingSegmentsWithRegions(current, regions))
  }, [regions])

  const loadSource = (nextSource: AudioClipSource) => {
    stopPendingPreviewPlayback()
    if (nextSource.sourceKind !== 'imported-audio') revokeImportedAudioUrl()
    setSource(nextSource)
    setDurationSeconds(0)
    setRegions([])
    setSelectedRegionId('')
    updatePendingSegments([])
    setCurrentTimeSeconds(0)
    setOutputName(createDefaultAudioClipName(nextSource))
    setError('')
  }

  const { importAudioFile } = useAudioClipImportWorkflow({
    importedAudioUrlRef,
    loadSource,
    revokeImportedAudioUrl,
    setError,
  })

  const addRegionAt = (atSeconds: number) => {
    if (!source || durationSeconds <= 0) return
    const id = createId('segment')
    setRegions((current) => {
      const region = createAudioSegmentRegion({
        id,
        atSeconds,
        durationSeconds,
        existingRegions: current,
      })
      if (!region) {
        setError('当前位置没有足够空间添加片段区块。')
        return current
      }
      setSelectedRegionId(id)
      setError('')
      return [...current, region]
    })
  }

  const updateRegion = (regionId: string, range: AudioClipRange) => {
    setRegions((current) => updateAudioSegmentRegion(current, regionId, range, durationSeconds))
  }

  const deleteRegion = (regionId: string) => {
    setRegions((current) => deleteAudioSegmentRegion(current, regionId))
    updatePendingSegments((current) => removePendingSegment(current, regionId))
    setSelectedRegionId((current) => (current === regionId ? '' : current))
  }

  const addSelectedRegionToPending = () => {
    if (!selectedRegionId) return
    updatePendingSegments((current) => addPendingSegment(current, regions, selectedRegionId))
  }

  const applyLegacyRangeChange = (nextRange: AudioClipRange) => {
    if (selectedRegionId) {
      updateRegion(selectedRegionId, nextRange)
      return
    }
    const nextRegion = {
      id: legacySelectionRegionId,
      startSeconds: nextRange.startSeconds,
      endSeconds: nextRange.endSeconds,
    }
    setRegions([nextRegion])
    setSelectedRegionId(nextRegion.id)
    updatePendingSegments([{
      regionId: nextRegion.id,
      startSeconds: nextRegion.startSeconds,
      endSeconds: nextRegion.endSeconds,
    }])
  }

  return {
    messageContextHolder,
    hasSource: Boolean(source),
    loadSource,
    panelProps: {
      source,
      durationSeconds,
      regions,
      selectedRegionId,
      pendingSegments,
      range: legacyRange,
      currentTimeSeconds,
      outputName,
      saving,
      canSave: hasExportablePendingSegments && !saving && canGenerateHistory,
      canGenerateHistory,
      canExport: hasExportablePendingSegments && !saving,
      canCollectVoice: canCollectVoice && hasExportablePendingSegments && !saving,
      canCollectSound: canCollectSound && hasExportablePendingSegments && !saving,
      canAddSelectedRegionToPending: Boolean(selectedRegion && !pendingSegments.some((item) => item.regionId === selectedRegion.id)),
      error,
      onDurationChange: setDurationSeconds,
      onAddRegionAt: addRegionAt,
      onSelectRegion: setSelectedRegionId,
      onUpdateRegion: updateRegion,
      onDeleteRegion: deleteRegion,
      onAddSelectedRegionToPending: addSelectedRegionToPending,
      onRemovePendingSegment: (regionId: string) => updatePendingSegments((current) => removePendingSegment(current, regionId)),
      onReorderPendingSegment: (fromIndex: number, toIndex: number) => {
        updatePendingSegments((current) => reorderPendingSegments(current, fromIndex, toIndex))
      },
      onCommitPendingSegmentsOrder: updatePendingSegments,
      onReorderPendingSegmentAroundTarget: (
        draggedRegionId: string,
        targetRegionId: string,
        placement: AudioPendingDropPlacement,
      ) => {
        updatePendingSegments((current) => reorderPendingSegmentsAroundTarget(
          current,
          draggedRegionId,
          targetRegionId,
          placement,
        ))
      },
      onRangeChange: applyLegacyRangeChange,
      onCurrentTimeChange: setCurrentTimeSeconds,
      onOutputNameChange: setOutputName,
      onImportAudioFile: importAudioFile,
      onPlayPendingSegments: (
        segments: AudioPendingSegment[],
        loop: boolean,
        onProgress: (sourceTimeSeconds: number) => void,
      ) => {
        void playPendingSegmentsPreview(segments, loop, onProgress)
      },
      onStopPendingPreviewPlayback: stopPendingPreviewPlayback,
      onGenerateHistory: (segments: AudioPendingSegment[]) => void generateHistory(segments),
      onExportClip: (segments: AudioPendingSegment[]) => void exportClip(segments),
      onCollectVoiceClip: (segments: AudioPendingSegment[]) => void collectVoiceClip(segments),
      onCollectSoundClip: (segments: AudioPendingSegment[]) => void collectSoundClip(segments),
      onSaveClip: () => void generateHistory(),
    },
  }
}
