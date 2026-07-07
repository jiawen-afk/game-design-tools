import { useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createAudioClipSourceFromImportedFile,
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
  createAudioSegmentRegion,
  deleteAudioSegmentRegion,
  removePendingSegment,
  reorderPendingSegments,
  syncPendingSegmentsWithRegions,
  updateAudioSegmentRegion,
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

interface UseAudioClipEditorWorkspaceOptions {
  onVoiceClipCreated: (record: VoiceGenerationRecord) => void
  onSoundEffectClipCreated: (record: SoundEffectRecord) => void
  onPersonalSpaceUpdated?: () => void
}

const defaultRange: AudioClipRange = { startSeconds: 0, endSeconds: 0 }
const legacySelectionRegionId = 'legacy-selection'
const supportedAudioFilePattern = /\.(aac|flac|m4a|mp3|ogg|opus|wav|webm)$/i

function isImportableAudioFile(file: File) {
  return file.type.startsWith('audio/') || supportedAudioFilePattern.test(file.name)
}

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

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  )
  const outputRanges = pendingSegments.map(({ startSeconds, endSeconds }) => ({ startSeconds, endSeconds }))
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

  useEffect(() => () => revokeImportedAudioUrl(), [])

  useEffect(() => {
    setPendingSegments((current) => syncPendingSegmentsWithRegions(current, regions))
  }, [regions])

  const loadSource = (nextSource: AudioClipSource) => {
    if (nextSource.sourceKind !== 'imported-audio') revokeImportedAudioUrl()
    setSource(nextSource)
    setDurationSeconds(0)
    setRegions([])
    setSelectedRegionId('')
    setPendingSegments([])
    setCurrentTimeSeconds(0)
    setOutputName(createDefaultAudioClipName(nextSource))
    setError('')
  }

  const importAudioFile = (file: File) => {
    if (!isImportableAudioFile(file)) {
      setError('请选择浏览器支持的音频文件。')
      return
    }
    const audioUrl = URL.createObjectURL(file)
    revokeImportedAudioUrl(audioUrl)
    importedAudioUrlRef.current = audioUrl
    loadSource(createAudioClipSourceFromImportedFile(file.name, audioUrl))
  }

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
    setPendingSegments((current) => removePendingSegment(current, regionId))
    setSelectedRegionId((current) => (current === regionId ? '' : current))
  }

  const addSelectedRegionToPending = () => {
    if (!selectedRegionId) return
    setPendingSegments((current) => addPendingSegment(current, regions, selectedRegionId))
  }

  const runWithSavingState = async (workflow: () => Promise<void>, fallbackMessage: string) => {
    if (!source || !hasValidPendingSegments || saving) return
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

  const generateHistory = async () => {
    if (!source || !canGenerateHistory) return
    await runWithSavingState(async () => {
      const result = await saveAudioClip({
        source,
        ranges: outputRanges,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (result.sourceKind === 'voice') onVoiceClipCreated(result.record)
      else onSoundEffectClipCreated(result.record)
      messageApi.success('已生成新的剪辑音频')
    }, '剪辑音频保存失败。')
  }

  const exportClip = async () => {
    if (!source) return
    await runWithSavingState(async () => {
      const result = await exportAudioClip({
        source,
        ranges: outputRanges,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (result) messageApi.success(`已导出：${result.fileName}`)
    }, '剪辑音频导出失败。')
  }

  const saveRenderedAudio = async () => {
    if (!source) throw new Error('请先选择音频。')
    const desktopApi = getDesktopApi()
    if (!desktopApi?.saveEditedAudio) throw new Error('当前桌面运行时不可用，无法收藏剪辑音频。')
    const wav = await renderAudioClipWav({
      source,
      ranges: outputRanges,
      name: outputName,
      desktopApi,
    })
    return desktopApi.saveEditedAudio({
      fileName: outputName,
      data: await wav.arrayBuffer(),
    })
  }

  const collectVoiceClip = async () => {
    if (!source || !canCollectVoice) return
    await runWithSavingState(async () => {
      const savedAudio = await saveRenderedAudio()
      const range = combinedRange(outputRanges)
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

  const collectSoundClip = async () => {
    if (!source || !canCollectSound) return
    await runWithSavingState(async () => {
      const savedAudio = await saveRenderedAudio()
      const range = combinedRange(outputRanges)
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
    setPendingSegments([{
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
      onRemovePendingSegment: (regionId: string) => setPendingSegments((current) => removePendingSegment(current, regionId)),
      onReorderPendingSegment: (fromIndex: number, toIndex: number) => {
        setPendingSegments((current) => reorderPendingSegments(current, fromIndex, toIndex))
      },
      onRangeChange: applyLegacyRangeChange,
      onCurrentTimeChange: setCurrentTimeSeconds,
      onOutputNameChange: setOutputName,
      onImportAudioFile: importAudioFile,
      onGenerateHistory: () => void generateHistory(),
      onExportClip: () => void exportClip(),
      onCollectVoiceClip: () => void collectVoiceClip(),
      onCollectSoundClip: () => void collectSoundClip(),
      onSaveClip: () => void generateHistory(),
    },
  }
}
