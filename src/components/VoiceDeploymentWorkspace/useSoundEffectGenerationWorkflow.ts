import { useState } from 'react'

import {
  buildStableAudioGeneratePayload,
  clampSoundDuration,
  createSoundEffectRecordName,
  defaultSoundEffectParams,
  stableAudioModelIds,
  type SoundEffectParams,
  type SoundEffectRecord,
  type StableAudioModelId,
} from './soundEffectModel'
import { generateStableAudioSound } from './soundEffectService'

const soundEffectModelStorageKey = 'game-design-tools.sound-effect.model'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readStoredSoundEffectModel() {
  if (typeof localStorage === 'undefined') return defaultSoundEffectParams.model
  const stored = localStorage.getItem(soundEffectModelStorageKey) as StableAudioModelId | null
  return stored && stableAudioModelIds.includes(stored) ? stored : defaultSoundEffectParams.model
}

function storeSoundEffectModel(model: StableAudioModelId) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(soundEffectModelStorageKey, model)
}

export interface UseSoundEffectGenerationWorkflowParams {
  connected: boolean
  port: number
  recordCount: number
  onRecordCreated: (record: SoundEffectRecord) => void
}

export function useSoundEffectGenerationWorkflow({
  connected,
  port,
  recordCount,
  onRecordCreated,
}: UseSoundEffectGenerationWorkflowParams) {
  const [soundParams, setSoundParams] = useState<SoundEffectParams>(() => ({
    ...defaultSoundEffectParams,
    model: readStoredSoundEffectModel(),
  }))
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')

  const updateParams = (patch: Partial<SoundEffectParams>) => {
    setSoundParams((current) => ({ ...current, ...patch }))
  }

  const updateModel = (model: StableAudioModelId) => {
    storeSoundEffectModel(model)
    setSoundParams((current) => ({
      ...current,
      model,
      durationSeconds: clampSoundDuration(model, current.durationSeconds),
    }))
  }

  const resetParams = (model: StableAudioModelId = defaultSoundEffectParams.model) => {
    storeSoundEffectModel(model)
    setSoundParams({ ...defaultSoundEffectParams, model })
  }

  const loadParams = (record: SoundEffectRecord) => {
    storeSoundEffectModel(record.model)
    setSoundParams({
      model: record.model,
      prompt: record.prompt,
      durationSeconds: record.durationSeconds,
      seed: record.seed,
      outputName: record.name,
    })
  }

  const canGenerate = connected && !generating && soundParams.prompt.trim().length > 0

  const generateSound = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setGenerationError('')
    try {
      const payload = buildStableAudioGeneratePayload(soundParams)
      const generated = await generateStableAudioSound(port, payload)
      onRecordCreated({
        ...generated,
        id: generated.id || randomId(),
        name: generated.name || createSoundEffectRecordName(soundParams, recordCount + 1),
        createdAt: generated.createdAt || new Date().toISOString(),
        prompt: generated.prompt || payload.prompt,
        durationSeconds: generated.durationSeconds || payload.durationSeconds,
        seed: generated.seed ?? payload.seed,
        model: generated.model || soundParams.model,
      })
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Stable Audio 3 生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return {
    soundParams,
    generating,
    generationError,
    canGenerate,
    updateParams,
    updateModel,
    resetParams,
    loadParams,
    generateSound,
  }
}
