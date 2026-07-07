import { useState } from 'react'

import { getDesktopApi } from '../../desktopApi'
import {
  createDefaultAudioClipName,
  createImportedAudioClipRecord,
  createSoundEffectClipRecord,
  createVoiceClipRecord,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import {
  exportAudioClip,
  renderAudioClipWav,
  saveAudioClip,
} from './audioClipService'
import type { AudioPendingSegment } from './audioSegmentModel'
import { collectSoundEffectRecordToPersonalSpace } from './soundEffectPersonalSpaceCollector'
import {
  type SoundEffectRecord,
  type StableAudioModelId,
} from './soundEffectModel'
import { collectVoiceRecordToPersonalSpace } from './voicePersonalSpaceCollector'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

interface AudioClipMessageApi {
  success: (content: string) => void
}

interface UseAudioClipEditorSaveActionsOptions {
  canCollectSound: boolean
  canCollectVoice: boolean
  canGenerateHistory: boolean
  currentOutputRanges: (segments?: AudioPendingSegment[]) => AudioClipRange[]
  hasValidCurrentPendingSegments: (segments?: AudioPendingSegment[]) => boolean
  messageApi: AudioClipMessageApi
  onPersonalSpaceUpdated?: () => void
  onSoundEffectClipCreated: (record: SoundEffectRecord) => void
  onVoiceClipCreated: (record: VoiceGenerationRecord) => void
  outputName: string
  setError: (error: string) => void
  source: AudioClipSource | null
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

export function useAudioClipEditorSaveActions({
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
}: UseAudioClipEditorSaveActionsOptions) {
  const [saving, setSaving] = useState(false)

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

  return {
    collectSoundClip,
    collectVoiceClip,
    exportClip,
    generateHistory,
    saving,
  }
}
