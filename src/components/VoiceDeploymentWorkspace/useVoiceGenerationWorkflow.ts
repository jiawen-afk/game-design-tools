import { useState } from 'react'

import {
  type VoiceAdvancedParams,
  type VoiceGenerationMode,
  type VoiceGenerationParams,
  type VoiceGenerationRecord,
  cloneVoiceParams,
  createVoiceRecordName,
  defaultVoiceGenerationParams,
  prepareCloneFromRecord,
} from './voiceDeploymentModel'
import { generateVoiceAudio, uploadReferenceAudio } from './voiceDeploymentService'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export interface UseVoiceGenerationWorkflowParams {
  connected: boolean
  port: number
  serviceUrl: string
  recordCount: number
  onRecordCreated: (record: VoiceGenerationRecord) => void
}

export function useVoiceGenerationWorkflow({
  connected,
  port,
  serviceUrl,
  recordCount,
  onRecordCreated,
}: UseVoiceGenerationWorkflowParams) {
  const [voiceParams, setVoiceParams] = useState<VoiceGenerationParams>(() => cloneVoiceParams(defaultVoiceGenerationParams))
  const [pendingReferenceFile, setPendingReferenceFile] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')

  const updateParams = (patch: Partial<VoiceGenerationParams>) => {
    setVoiceParams((current) => ({ ...current, ...patch }))
  }

  const updateAdvanced = (patch: Partial<VoiceAdvancedParams>) => {
    setVoiceParams((current) => ({ ...current, advanced: { ...current.advanced, ...patch } }))
  }

  const setMode = (mode: VoiceGenerationMode) => {
    setVoiceParams((current) => ({ ...current, mode }))
  }

  const resetParams = () => {
    setVoiceParams(cloneVoiceParams(defaultVoiceGenerationParams))
    setPendingReferenceFile(null)
  }

  const selectReferenceFile = (file: File) => {
    setPendingReferenceFile(file)
    updateParams({
      referenceAudioName: file.name,
      referenceAudioPath: null,
    })
  }

  const loadParams = (record: VoiceGenerationRecord) => {
    setVoiceParams(cloneVoiceParams(record.params))
    setPendingReferenceFile(null)
  }

  const cloneFromRecord = (record: VoiceGenerationRecord) => {
    if (!record.audioPath) return
    setVoiceParams(prepareCloneFromRecord(record))
    setPendingReferenceFile(null)
  }

  const canGenerate = connected
    && !generating
    && voiceParams.text.trim().length > 0
    && (voiceParams.mode === 'blind-box' || voiceParams.mode === 'voice-design' || Boolean(pendingReferenceFile || voiceParams.referenceAudioPath))
    && (voiceParams.mode !== 'high-similarity-clone' || voiceParams.promptText.trim().length > 0)

  const generateVoice = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setGenerationError('')
    try {
      let paramsForRequest = cloneVoiceParams(voiceParams)
      if (pendingReferenceFile) {
        const uploaded = await uploadReferenceAudio(port, pendingReferenceFile)
        paramsForRequest = {
          ...paramsForRequest,
          referenceAudioName: uploaded.orig_name || pendingReferenceFile.name,
          referenceAudioPath: uploaded.path,
        }
        setVoiceParams(paramsForRequest)
        setPendingReferenceFile(null)
      }

      const audio = await generateVoiceAudio(serviceUrl, paramsForRequest)
      onRecordCreated({
        id: randomId(),
        name: createVoiceRecordName(paramsForRequest, recordCount + 1),
        createdAt: new Date().toISOString(),
        audioUrl: audio.audioUrl,
        audioPath: audio.audioPath,
        params: cloneVoiceParams(paramsForRequest),
      })
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'VoxCPM 生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return {
    voiceParams,
    generating,
    generationError,
    canGenerate,
    updateParams,
    updateAdvanced,
    setMode,
    resetParams,
    selectReferenceFile,
    loadParams,
    cloneFromRecord,
    generateVoice,
  }
}
