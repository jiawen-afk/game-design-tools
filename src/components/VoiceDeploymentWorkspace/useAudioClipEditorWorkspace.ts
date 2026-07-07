import { useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createDefaultAudioClipName,
  createImportedAudioClipRecord,
  createSoundEffectClipRecord,
  createVoiceClipRecord,
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
  resolvePendingPreviewSourceTime,
  syncPendingSegmentsWithRegions,
  updateAudioSegmentRegion,
  type AudioPendingDropPlacement,
  type AudioPendingSegment,
  type AudioSegmentRegion,
} from './audioSegmentModel'
import {
  exportAudioClip,
  renderAudioClipWav,
  saveAudioClip,
} from './audioClipService'
import {
  collectSoundEffectRecordToPersonalSpace,
} from './soundEffectPersonalSpaceCollector'
import type { SoundEffectRecord, StableAudioModelId } from './soundEffectModel'
import {
  collectVoiceRecordToPersonalSpace,
} from './voicePersonalSpaceCollector'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import { useAudioClipImportWorkflow } from './useAudioClipImportWorkflow'

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

function combinedRange(ranges: AudioClipRange[]): AudioClipRange {
  const duration = ranges.reduce((sum, range) => sum + Math.max(0, range.endSeconds - range.startSeconds), 0)
  return { startSeconds: 0, endSeconds: Math.round(duration * 1000) / 1000 }
}

function createImportedSoundEffectRecord(input: {
  source: { sourceKind: 'imported-audio'; record: AudioClipSource['record'] }
  name: string
  range: AudioClipRange
  savedAudio: { audioUrl: string; audioPath: string | null }
}): SoundEffectRecord {
  return {
    id: createId('sound-clip'),
    name: input.name.trim() || createDefaultAudioClipName(input.source as AudioClipSource),
    createdAt: new Date().toISOString(),
    audioUrl: input.savedAudio.audioUrl,
    audioPath: input.savedAudio.audioPath,
    prompt: `导入音频：${input.source.record.name}`,
    durationSeconds: input.range.endSeconds - input.range.startSeconds,
    seed: null,
    model: 'small-sfx' as StableAudioModelId,
  }
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pendingSegmentsRef = useRef<AudioPendingSegment[]>([])
  const pendingPreviewAudioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPreviewAudioUrlRef = useRef<string | null>(null)
  const pendingPreviewProgressFrameRef = useRef<number | null>(null)
  const pendingPreviewRequestIdRef = useRef(0)

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  )
  const hasValidPendingSegments = pendingSegments.length > 0 && pendingSegments.every(isValidAudioClipRange)
  const canGenerateHistory = Boolean(source && source.sourceKind !== 'imported-audio')
  const canCollectVoice = Boolean(source && (source.sourceKind === 'voice' || source.sourceKind === 'imported-audio'))
  const canCollectSound = Boolean(source && (source.sourceKind === 'sound-effect' || source.sourceKind === 'imported-audio'))
  const canExport = Boolean(source) && hasValidPendingSegments && !saving
  const canSave = canExport && canGenerateHistory
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

  const clearPendingPreviewProgressFrame = () => {
    if (pendingPreviewProgressFrameRef.current === null) return
    cancelAnimationFrame(pendingPreviewProgressFrameRef.current)
    pendingPreviewProgressFrameRef.current = null
  }

  const disposePendingPreviewAudio = () => {
    clearPendingPreviewProgressFrame()
    const audio = pendingPreviewAudioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    pendingPreviewAudioRef.current = null
    if (pendingPreviewAudioUrlRef.current) URL.revokeObjectURL(pendingPreviewAudioUrlRef.current)
    pendingPreviewAudioUrlRef.current = null
  }

  const stopPendingPreviewPlayback = () => {
    pendingPreviewRequestIdRef.current += 1
    disposePendingPreviewAudio()
  }

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

  const runWithSavingState = async (
    segments: AudioPendingSegment[] | undefined,
    workflow: () => Promise<void>,
    fallbackMessage: string,
  ) => {
    if (!source || !hasValidCurrentPendingSegments(segments) || saving) return
    setSaving(true)
    setError('')
    try {
      await workflow()
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : fallbackMessage)
    } finally {
      setSaving(false)
    }
  }

  const generateHistory = async (segments?: AudioPendingSegment[]) => {
    if (!source || !canGenerateHistory) return
    await runWithSavingState(segments, async () => {
      const ranges = currentOutputRanges(segments)
      const result = await saveAudioClip({
        source,
        ranges,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (result.sourceKind === 'voice') onVoiceClipCreated(result.record)
      else onSoundEffectClipCreated(result.record)
      messageApi.success('已生成新的剪辑音频')
    }, '剪辑音频保存失败。')
  }

  const exportClip = async (segments?: AudioPendingSegment[]) => {
    if (!source) return
    await runWithSavingState(segments, async () => {
      const ranges = currentOutputRanges(segments)
      const result = await exportAudioClip({
        source,
        ranges,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (result) messageApi.success(`已导出：${result.fileName}`)
    }, '剪辑音频导出失败。')
  }

  const playPendingSegmentsPreview = async (
    segments: AudioPendingSegment[],
    loop: boolean,
    onProgress: (sourceTimeSeconds: number) => void,
  ) => {
    if (!source || !hasValidCurrentPendingSegments(segments)) return
    const requestId = pendingPreviewRequestIdRef.current + 1
    pendingPreviewRequestIdRef.current = requestId
    disposePendingPreviewAudio()
    setError('')
    try {
      const ranges = currentOutputRanges(segments)
      const wav = await renderAudioClipWav({
        source,
        ranges,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (pendingPreviewRequestIdRef.current !== requestId) return
      const previewAudioUrl = URL.createObjectURL(wav)
      const audio = new Audio(previewAudioUrl)
      audio.loop = loop
      pendingPreviewAudioUrlRef.current = previewAudioUrl
      pendingPreviewAudioRef.current = audio
      const updatePreviewProgress = () => {
        const sourceTimeSeconds = resolvePendingPreviewSourceTime(segments, audio.currentTime)
        if (sourceTimeSeconds !== null) onProgress(sourceTimeSeconds)
      }
      const schedulePreviewProgress = () => {
        clearPendingPreviewProgressFrame()
        pendingPreviewProgressFrameRef.current = requestAnimationFrame(() => {
          pendingPreviewProgressFrameRef.current = null
          if (pendingPreviewAudioRef.current !== audio) return
          updatePreviewProgress()
          if (!audio.paused && !audio.ended) schedulePreviewProgress()
        })
      }
      audio.addEventListener('timeupdate', updatePreviewProgress)
      audio.addEventListener('play', schedulePreviewProgress)
      audio.addEventListener('pause', clearPendingPreviewProgressFrame)
      audio.addEventListener('ended', () => {
        updatePreviewProgress()
        if (audio.loop || pendingPreviewAudioRef.current !== audio) return
        disposePendingPreviewAudio()
      })
      audio.addEventListener('error', () => {
        if (pendingPreviewAudioRef.current !== audio) return
        setError('待处理音频预览失败。')
        disposePendingPreviewAudio()
      }, { once: true })
      updatePreviewProgress()
      await audio.play()
    } catch (previewError) {
      if (pendingPreviewRequestIdRef.current !== requestId) return
      setError(previewError instanceof Error ? previewError.message : '待处理音频预览失败。')
      disposePendingPreviewAudio()
    }
  }

  const saveRenderedAudio = async (ranges: AudioClipRange[]) => {
    if (!source) throw new Error('请先选择音频。')
    const desktopApi = getDesktopApi()
    if (!desktopApi?.saveEditedAudio) throw new Error('当前桌面运行时不可用，无法收藏剪辑音频。')
    const wav = await renderAudioClipWav({
      source,
      ranges,
      name: outputName,
      desktopApi,
    })
    return desktopApi.saveEditedAudio({
      fileName: outputName,
      data: await wav.arrayBuffer(),
    })
  }

  const collectVoiceClip = async (segments?: AudioPendingSegment[]) => {
    if (!source || !canCollectVoice) return
    await runWithSavingState(segments, async () => {
      const ranges = currentOutputRanges(segments)
      const savedAudio = await saveRenderedAudio(ranges)
      const range = combinedRange(ranges)
      const record = source.sourceKind === 'voice'
        ? createVoiceClipRecord({ source, name: outputName, range, savedAudio })
        : source.sourceKind === 'imported-audio'
          ? createImportedAudioClipRecord({ source, name: outputName, range, savedAudio })
          : null
      if (!record) return
      await collectVoiceRecordToPersonalSpace(record)
      onPersonalSpaceUpdated?.()
      messageApi.success('已收藏到项目空间-配音')
    }, '收藏到项目空间-配音失败。')
  }

  const collectSoundClip = async (segments?: AudioPendingSegment[]) => {
    if (!source || !canCollectSound) return
    await runWithSavingState(segments, async () => {
      const ranges = currentOutputRanges(segments)
      const savedAudio = await saveRenderedAudio(ranges)
      const range = combinedRange(ranges)
      const record = source.sourceKind === 'sound-effect'
        ? createSoundEffectClipRecord({ source, name: outputName, range, savedAudio })
        : source.sourceKind === 'imported-audio'
          ? createImportedSoundEffectRecord({ source, name: outputName, range, savedAudio })
          : null
      if (!record) return
      await collectSoundEffectRecordToPersonalSpace(record)
      onPersonalSpaceUpdated?.()
      messageApi.success('已收藏到项目空间-音效')
    }, '收藏到项目空间-音效失败。')
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
      canSave,
      canGenerateHistory,
      canExport,
      canCollectVoice: canCollectVoice && canExport,
      canCollectSound: canCollectSound && canExport,
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
