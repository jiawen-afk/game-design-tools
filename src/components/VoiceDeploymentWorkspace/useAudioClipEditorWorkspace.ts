import { useMemo, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createDefaultAudioClipName,
  isValidAudioClipRange,
  normalizeAudioClipRange,
  type AudioClipRange,
  type AudioClipSource,
} from './audioClipModel'
import { saveAudioClip } from './audioClipService'
import type { SoundEffectRecord } from './soundEffectModel'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'

interface UseAudioClipEditorWorkspaceOptions {
  onVoiceClipCreated: (record: VoiceGenerationRecord) => void
  onSoundEffectClipCreated: (record: SoundEffectRecord) => void
}

const defaultRange: AudioClipRange = { startSeconds: 0, endSeconds: 0 }

export function useAudioClipEditorWorkspace({
  onVoiceClipCreated,
  onSoundEffectClipCreated,
}: UseAudioClipEditorWorkspaceOptions) {
  const [messageApi, messageContextHolder] = message.useMessage()
  const [source, setSource] = useState<AudioClipSource | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [range, setRange] = useState<AudioClipRange>(defaultRange)
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0)
  const [outputName, setOutputName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const normalizedRange = useMemo(
    () => normalizeAudioClipRange(range, durationSeconds),
    [durationSeconds, range],
  )
  const canSave = Boolean(source) && isValidAudioClipRange(normalizedRange) && !saving

  const loadSource = (nextSource: AudioClipSource) => {
    setSource(nextSource)
    setDurationSeconds(0)
    setRange(defaultRange)
    setCurrentTimeSeconds(0)
    setOutputName(createDefaultAudioClipName(nextSource))
    setError('')
  }

  const saveClip = async () => {
    if (!source || !canSave) return
    setSaving(true)
    setError('')
    try {
      const result = await saveAudioClip({
        source,
        range: normalizedRange,
        name: outputName,
        desktopApi: getDesktopApi(),
      })
      if (result.sourceKind === 'voice') onVoiceClipCreated(result.record)
      else onSoundEffectClipCreated(result.record)
      messageApi.success('已生成新的剪辑音频')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '剪辑音频保存失败。')
    } finally {
      setSaving(false)
    }
  }

  return {
    messageContextHolder,
    hasSource: Boolean(source),
    loadSource,
    panelProps: {
      source,
      durationSeconds,
      range: normalizedRange,
      currentTimeSeconds,
      outputName,
      saving,
      canSave,
      error,
      onDurationChange: setDurationSeconds,
      onRangeChange: (nextRange: AudioClipRange) => setRange(normalizeAudioClipRange(nextRange, durationSeconds)),
      onCurrentTimeChange: setCurrentTimeSeconds,
      onOutputNameChange: setOutputName,
      onSaveClip: () => void saveClip(),
    },
  }
}
