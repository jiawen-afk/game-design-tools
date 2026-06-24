import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { scheduleStoryboardVoiceStarts, type ProjectAssetManager, type ProjectMode, type ProjectObjectStorage } from '../ProjectStorage'
import type { PersonalSpaceAsset, StoryboardGroup } from './personalSpaceModel'
import { resolveStoryboardVoicePlaybackSource, revokeObjectUrls } from './storyboardPlaybackSources'

type StoryboardPlaybackStep = {
  groupId: string
  assetId: string
  source: string
  startOffsetUs: number
  durationUs: number
}

interface UseStoryboardVoicePlaybackParams {
  storyboardGroups: StoryboardGroup[]
  voiceAssets: PersonalSpaceAsset[]
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

function loadStoryboardVoiceDurationUs(source: string) {
  return new Promise<number>((resolve) => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? Math.max(0, Math.trunc(audio.duration * 1_000_000)) : 0)
    audio.onerror = () => resolve(0)
    audio.src = source
    audio.load()
  })
}

export function useStoryboardVoicePlayback({
  storyboardGroups,
  voiceAssets,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: UseStoryboardVoicePlaybackParams) {
  const voiceById = useMemo(() => new Map(voiceAssets.map((asset) => [asset.id, asset])), [voiceAssets])
  const playbackQueueRef = useRef<StoryboardPlaybackStep[]>([])
  const playbackObjectUrlsRef = useRef<string[]>([])
  const playbackTimersRef = useRef<number[]>([])
  const activePlaybackAudiosRef = useRef<HTMLAudioElement[]>([])
  const playbackRequestRef = useRef(0)
  const [currentPlayback, setCurrentPlayback] = useState<StoryboardPlaybackStep | null>(null)

  const clearStoryboardPlaybackResources = useCallback(() => {
    playbackTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    playbackTimersRef.current = []
    activePlaybackAudiosRef.current.forEach((audio) => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    })
    activePlaybackAudiosRef.current = []
    revokeObjectUrls(playbackObjectUrlsRef.current)
    playbackObjectUrlsRef.current = []
    playbackQueueRef.current = []
    setCurrentPlayback(null)
  }, [])

  const stopStoryboardPlayback = useCallback(() => {
    playbackRequestRef.current += 1
    clearStoryboardPlaybackResources()
  }, [clearStoryboardPlaybackResources])

  const scheduleStoryboardPlayback = useCallback((queue: StoryboardPlaybackStep[], requestId: number) => {
    const schedule = scheduleStoryboardVoiceStarts(queue.map((step) => ({
      id: step.assetId,
      durationUs: step.durationUs,
      startOffsetUs: step.startOffsetUs,
    })))
    const stepByAssetId = new Map(queue.map((step) => [step.assetId, step]))
    let endedCount = 0
    const finishStep = (audio: HTMLAudioElement) => {
      activePlaybackAudiosRef.current = activePlaybackAudiosRef.current.filter((item) => item !== audio)
      endedCount += 1
      if (endedCount >= schedule.length && playbackRequestRef.current === requestId) {
        stopStoryboardPlayback()
      }
    }

    for (const item of schedule) {
      const step = stepByAssetId.get(item.id)
      if (!step) continue
      const timerId = window.setTimeout(() => {
        if (playbackRequestRef.current !== requestId) return
        const audio = new Audio(step.source)
        activePlaybackAudiosRef.current.push(audio)
        setCurrentPlayback(step)
        audio.onended = () => finishStep(audio)
        audio.onerror = () => finishStep(audio)
        void audio.play()
      }, Math.max(0, item.startAtUs / 1000))
      playbackTimersRef.current.push(timerId)
    }
  }, [stopStoryboardPlayback])

  const playStoryboardFrom = useCallback(async (groupId: string, assetId: string) => {
    const requestId = playbackRequestRef.current + 1
    playbackRequestRef.current = requestId
    clearStoryboardPlaybackResources()
    const group = storyboardGroups.find((item) => item.id === groupId)
    if (!group) return
    const orderedEntries = [...group.voiceEntries].sort((a, b) => a.order - b.order)
    const startIndex = orderedEntries.findIndex((entry) => entry.assetId === assetId)
    if (startIndex < 0) return
    const playbackSources = await Promise.all(orderedEntries.slice(startIndex).map(async (entry) => {
      const asset = voiceById.get(entry.assetId)
      const playbackSource = asset ? await resolveStoryboardVoicePlaybackSource(asset, {
        projectObjectStorage,
        projectAssetManager,
        projectId,
        projectMode,
      }) : null
      if (!playbackSource) return null
      const durationUs = await loadStoryboardVoiceDurationUs(playbackSource.source)
      return { entry, playbackSource, durationUs }
    }))
    const objectUrls = playbackSources.flatMap((item) => item?.playbackSource.objectUrl ? [item.playbackSource.objectUrl] : [])
    if (playbackRequestRef.current !== requestId) {
      revokeObjectUrls(objectUrls)
      return
    }
    playbackObjectUrlsRef.current = objectUrls
    const queue = playbackSources.flatMap<StoryboardPlaybackStep>((item) => (
      item ? [{
        groupId,
        assetId: item.entry.assetId,
        source: item.playbackSource.source,
        startOffsetUs: item.entry.startOffsetUs,
        durationUs: item.durationUs,
      }] : []
    ))
    playbackQueueRef.current = queue
    if (queue.length === 0) {
      stopStoryboardPlayback()
      return
    }
    scheduleStoryboardPlayback(queue, requestId)
  }, [
    clearStoryboardPlaybackResources,
    projectAssetManager,
    projectId,
    projectMode,
    projectObjectStorage,
    scheduleStoryboardPlayback,
    stopStoryboardPlayback,
    storyboardGroups,
    voiceById,
  ])

  useEffect(() => () => stopStoryboardPlayback(), [stopStoryboardPlayback])

  return {
    currentPlayback,
    playStoryboardFrom,
    stopStoryboardPlayback,
  }
}
