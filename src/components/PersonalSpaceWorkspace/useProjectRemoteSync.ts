import { useEffect, useRef, useState } from 'react'

import type { Project } from '../ProjectStorage'
import type { PersonalSpaceState } from './personalSpaceModel'
import { formatRemoteProjectReadError } from './remoteProjectMessages'

const REMOTE_PROJECT_SYNC_DEBOUNCE_MS = 1500
const REMOTE_PROJECT_PERIODIC_SYNC_MS = 60000

interface ProjectRemoteSyncMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
}

export interface UseProjectRemoteSyncOptions {
  findProject: (projectId: string) => Project | undefined
  getActiveProjectId: () => string
  getCurrentSpace: () => PersonalSpaceState
  persistProjectSpaceState: (projectId: string, state: PersonalSpaceState) => void
  syncProjectStateToStorage: (project: Project, state: PersonalSpaceState) => Promise<void>
  messageApi: ProjectRemoteSyncMessageApi
}

interface QueuedProjectRemoteSync<State> {
  project: Project
  state: State
}

export function createProjectRemoteSyncQueue<State>() {
  const pending = new Map<string, QueuedProjectRemoteSync<State>>()

  const enqueue = (project: Project, state: State) => {
    pending.set(project.id, { project, state })
  }

  const drain = () => {
    const entries = Array.from(pending.values())
    pending.clear()
    return entries
  }

  const hasPending = () => pending.size > 0

  return {
    drain,
    enqueue,
    hasPending,
  }
}

export function useProjectRemoteSync(options: UseProjectRemoteSyncOptions) {
  const [syncingProjectId, setSyncingProjectId] = useState('')
  const optionsRef = useRef(options)
  const manualSyncInFlightProjectIdRef = useRef('')
  const remoteSyncSequenceRef = useRef(0)
  const remoteSyncTimerRef = useRef<number | null>(null)
  const remoteSyncIntervalRef = useRef<number | null>(null)
  const queuedRemoteSyncRef = useRef(createProjectRemoteSyncQueue<PersonalSpaceState>())
  const remoteSyncInFlightRef = useRef(false)

  optionsRef.current = options

  const syncProjectStateToStorage = async (project: Project, nextSpace: PersonalSpaceState) => {
    const currentOptions = optionsRef.current
    if (project.mode !== 'remote') return
    const syncSequence = remoteSyncSequenceRef.current + 1
    remoteSyncSequenceRef.current = syncSequence
    try {
      await currentOptions.syncProjectStateToStorage(project, nextSpace)
    } catch (error) {
      if (remoteSyncSequenceRef.current === syncSequence) {
        const errorMessage = formatRemoteProjectReadError(error, project)
        void currentOptions.messageApi.warning(`同步远程项目失败：${errorMessage}`)
      }
    }
  }

  const flushQueuedRemoteSync = async () => {
    if (remoteSyncInFlightRef.current) return
    const queuedEntries = queuedRemoteSyncRef.current.drain()
    if (queuedEntries.length === 0) return
    remoteSyncInFlightRef.current = true
    try {
      for (const entry of queuedEntries) {
        await syncProjectStateToStorage(entry.project, entry.state)
      }
    } finally {
      remoteSyncInFlightRef.current = false
      if (queuedRemoteSyncRef.current.hasPending()) void flushQueuedRemoteSync()
    }
  }

  const scheduleRemoteProjectSync = (
    nextSpace: PersonalSpaceState,
    delay = REMOTE_PROJECT_SYNC_DEBOUNCE_MS,
  ) => {
    const currentOptions = optionsRef.current
    const project = currentOptions.findProject(currentOptions.getActiveProjectId())
    if (project?.mode !== 'remote') return
    queuedRemoteSyncRef.current.enqueue(project, nextSpace)
    if (remoteSyncTimerRef.current !== null) window.clearTimeout(remoteSyncTimerRef.current)
    remoteSyncTimerRef.current = window.setTimeout(() => {
      remoteSyncTimerRef.current = null
      void flushQueuedRemoteSync()
    }, delay)
  }

  const syncActiveProjectNow = async () => {
    const currentOptions = optionsRef.current
    if (manualSyncInFlightProjectIdRef.current) {
      void currentOptions.messageApi.warning('项目正在同步，请稍候')
      return
    }
    const syncProjectId = currentOptions.getActiveProjectId()
    const project = currentOptions.findProject(syncProjectId)
    if (!syncProjectId || !project) {
      void currentOptions.messageApi.warning('请先启用一个项目空间')
      return
    }

    manualSyncInFlightProjectIdRef.current = syncProjectId
    setSyncingProjectId(syncProjectId)
    try {
      const currentSpace = currentOptions.getCurrentSpace()
      currentOptions.persistProjectSpaceState(syncProjectId, currentSpace)
      await currentOptions.syncProjectStateToStorage(project, currentSpace)
      void currentOptions.messageApi.success('已同步项目空间')
    } catch (error) {
      void currentOptions.messageApi.warning(`同步项目空间失败：${formatRemoteProjectReadError(error, project)}`)
    } finally {
      if (manualSyncInFlightProjectIdRef.current === syncProjectId) {
        manualSyncInFlightProjectIdRef.current = ''
        setSyncingProjectId('')
      }
    }
  }

  useEffect(() => {
    remoteSyncIntervalRef.current = window.setInterval(() => {
      scheduleRemoteProjectSync(optionsRef.current.getCurrentSpace(), 0)
    }, REMOTE_PROJECT_PERIODIC_SYNC_MS)
    return () => {
      if (remoteSyncTimerRef.current !== null) window.clearTimeout(remoteSyncTimerRef.current)
      if (remoteSyncIntervalRef.current !== null) window.clearInterval(remoteSyncIntervalRef.current)
    }
  }, [])

  return {
    scheduleRemoteProjectSync,
    syncingProjectId,
    syncActiveProjectNow,
  }
}
