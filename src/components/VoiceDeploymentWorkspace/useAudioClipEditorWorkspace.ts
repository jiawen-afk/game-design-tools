import { useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'

import { getDesktopApi } from '../../desktopApi'
import {
  createAudioClipSourceFromImportedFile,
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
const supportedAudioFilePattern = /\.(aac|flac|m4a|mp3|ogg|opus|wav|webm)$/i

function isImportableAudioFile(file: File) {
  return file.type.startsWith('audio/') || supportedAudioFilePattern.test(file.name)
}

export function useAudioClipEditorWorkspace({
  onVoiceClipCreated,
  onSoundEffectClipCreated,
}: UseAudioClipEditorWorkspaceOptions) {
  const [messageApi, messageContextHolder] = message.useMessage()
  const importedAudioUrlRef = useRef<string | null>(null)
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

  const revokeImportedAudioUrl = (exceptUrl = '') => {
    const currentUrl = importedAudioUrlRef.current
    if (currentUrl && currentUrl !== exceptUrl) URL.revokeObjectURL(currentUrl)
    if (currentUrl !== exceptUrl) importedAudioUrlRef.current = null
  }

  useEffect(() => () => revokeImportedAudioUrl(), [])

  const loadSource = (nextSource: AudioClipSource) => {
    if (nextSource.sourceKind !== 'imported-audio') revokeImportedAudioUrl()
    setSource(nextSource)
    setDurationSeconds(0)
    setRange(defaultRange)
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
      onImportAudioFile: importAudioFile,
      onSaveClip: () => void saveClip(),
    },
  }
}
