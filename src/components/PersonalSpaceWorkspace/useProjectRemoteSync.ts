import { useEffect, useRef, useState } from 'react'

import type { Project } from '../ProjectStorage'
import type { PersonalSpaceState } from './personalSpaceModel'
import { formatRemoteProjectReadError } from './remoteProjectMessages'
import {
  countPendingUploadAssets,
  createEmptyProjectRemoteSyncStatus,
  upsertProjectRemoteSyncTask,
  type ProjectRemoteSyncStatus,
  type ProjectRemoteSyncTask,
} from './projectRemoteSyncStatusModel'

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
  const pendingTasks = (): ProjectRemoteSyncTask[] => Array.from(pending.values()).map((entry) => ({
    projectId: entry.project.id,
    projectName: entry.project.name,
    status: 'pending',
    progress: 0,
    pendingAssetCount: countPendingUploadAssets(entry.state as { assets?: PersonalSpaceState['assets'] }),
  }))

  return {
    drain,
    enqueue,
    hasPending,
    pendingTasks,
  }
}

export function useProjectRemoteSync(options: UseProjectRemoteSyncOptions) {
  const [syncingProjectId, setSyncingProjectId] = useState('')
  const [syncStatus, setSyncStatus] = useState<ProjectRemoteSyncStatus>(() => createEmptyProjectRemoteSyncStatus())
  const optionsRef = useRef(options)
  const manualSyncInFlightProjectIdRef = useRef('')
  const remoteSyncSequenceRef = useRef(0)
  const remoteSyncTimerRef = useRef<number | null>(null)
  const remoteSyncIntervalRef = useRef<number | null>(null)
  const queuedRemoteSyncRef = useRef(createProjectRemoteSyncQueue<PersonalSpaceState>())
  const remoteSyncInFlightRef = useRef(false)

  optionsRef.current = options

  const markSyncTask = (task: ProjectRemoteSyncTask) => {
    setSyncStatus((current) => upsertProjectRemoteSyncTask(current, task))
  }

  const markQueuedTasks = () => {
    setSyncStatus((current) => (
      queuedRemoteSyncRef.current.pendingTasks().reduce(upsertProjectRemoteSyncTask, current)
    ))
  }

  const syncProjectStateToStorage = async (project: Project, nextSpace: PersonalSpaceState) => {
    const currentOptions = optionsRef.current
    if (project.mode !== 'remote') return true
    const syncSequence = remoteSyncSequenceRef.current + 1
    remoteSyncSequenceRef.current = syncSequence
    const pendingAssetCount = countPendingUploadAssets(nextSpace)
    markSyncTask({ projectId: project.id, projectName: project.name, status: 'syncing', progress: 50, pendingAssetCount })
    try {
      await currentOptions.syncProjectStateToStorage(project, nextSpace)
      markSyncTask({ projectId: project.id, projectName: project.name, status: 'succeeded', progress: 100, pendingAssetCount: 0 })
      return true
    } catch (error) {
      const errorMessage = formatRemoteProjectReadError(error, project)
      markSyncTask({
        projectId: project.id,
        projectName: project.name,
        status: 'failed',
        progress: 100,
        pendingAssetCount,
        errorMessage,
      })
      if (remoteSyncSequenceRef.current === syncSequence) {
        void currentOptions.messageApi.warning(`同步远程项目失败：${errorMessage}`)
      }
      return false
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
    markQueuedTasks()
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
      const pendingAssetCount = countPendingUploadAssets(currentSpace)
      markSyncTask({ projectId: project.id, projectName: project.name, status: 'syncing', progress: 50, pendingAssetCount })
      currentOptions.persistProjectSpaceState(syncProjectId, currentSpace)
      await currentOptions.syncProjectStateToStorage(project, currentSpace)
      markSyncTask({ projectId: project.id, projectName: project.name, status: 'succeeded', progress: 100, pendingAssetCount: 0 })
      void currentOptions.messageApi.success('已同步项目空间')
    } catch (error) {
      const errorMessage = formatRemoteProjectReadError(error, project)
      const pendingAssetCount = countPendingUploadAssets(currentOptions.getCurrentSpace())
      markSyncTask({
        projectId: project.id,
        projectName: project.name,
        status: 'failed',
        progress: 100,
        pendingAssetCount,
        errorMessage,
      })
      void currentOptions.messageApi.warning(`同步项目空间失败：${errorMessage}`)
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
    syncStatus,
    syncingProjectId,
    syncActiveProjectNow,
  }
}
