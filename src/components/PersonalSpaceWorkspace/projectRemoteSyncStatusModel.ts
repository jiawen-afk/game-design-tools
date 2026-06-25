import { isProjectObjectKey } from '../ProjectStorage'
import type { PersonalSpaceAsset } from './personalSpaceModel'

export type ProjectRemoteSyncTaskStatus = 'pending' | 'syncing' | 'succeeded' | 'failed'

export interface ProjectRemoteSyncTask {
  projectId: string
  projectName: string
  status: ProjectRemoteSyncTaskStatus
  progress: number
  pendingAssetCount: number
  errorMessage?: string
}

export interface ProjectRemoteSyncStatus {
  pendingUploadCount: number
  activeTaskCount: number
  tasks: ProjectRemoteSyncTask[]
}

export function createEmptyProjectRemoteSyncStatus(): ProjectRemoteSyncStatus {
  return {
    pendingUploadCount: 0,
    activeTaskCount: 0,
    tasks: [],
  }
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function isActiveTask(task: ProjectRemoteSyncTask) {
  return task.status === 'pending' || task.status === 'syncing'
}

function hasProjectObjectResource(storedPath: string | undefined, resourcePath: string | undefined) {
  return isProjectObjectKey(storedPath) || isProjectObjectKey(resourcePath)
}

function hasPendingPrimaryResource(asset: PersonalSpaceAsset) {
  const storedPath = asset.storageResourcePaths[0]
  const resourcePath = asset.resourcePaths[0]
  if (!storedPath && !resourcePath) return false
  return !hasProjectObjectResource(storedPath, resourcePath)
}

function hasPendingSpriteIndexResource(asset: PersonalSpaceAsset) {
  if (asset.kind !== 'sprite') return false
  const storedPath = asset.storageResourcePaths[1]
  const resourcePath = asset.resourcePaths[1]
  if (!storedPath && !resourcePath) return false
  return !hasProjectObjectResource(storedPath, resourcePath)
}

function hasPendingCoverResource(asset: PersonalSpaceAsset) {
  const storedPath = asset.coverStorageResourcePath
  const resourcePath = asset.coverResourcePath
  if (!storedPath && !resourcePath) return false
  return !hasProjectObjectResource(storedPath, resourcePath)
}

export function countPendingUploadAssets(state: { assets?: PersonalSpaceAsset[] }) {
  const assets = Array.isArray(state.assets) ? state.assets : []
  return assets.filter((asset) => (
    hasPendingPrimaryResource(asset)
    || hasPendingSpriteIndexResource(asset)
    || hasPendingCoverResource(asset)
  )).length
}

function summarizeTasks(tasks: ProjectRemoteSyncTask[]): ProjectRemoteSyncStatus {
  const normalizedTasks = tasks.map((task) => ({
    ...task,
    progress: normalizeProgress(task.progress),
    pendingAssetCount: Math.max(0, Math.round(task.pendingAssetCount)),
  }))
  return {
    pendingUploadCount: normalizedTasks
      .reduce((total, task) => total + task.pendingAssetCount, 0),
    activeTaskCount: normalizedTasks.filter(isActiveTask).length,
    tasks: normalizedTasks,
  }
}

export function upsertProjectRemoteSyncTask(
  status: ProjectRemoteSyncStatus,
  task: ProjectRemoteSyncTask,
): ProjectRemoteSyncStatus {
  const nextTasks = [
    task,
    ...status.tasks.filter((item) => item.projectId !== task.projectId),
  ].slice(0, 8)
  return summarizeTasks(nextTasks)
}

export function removePendingProjectRemoteSyncTask(
  status: ProjectRemoteSyncStatus,
  projectId: string,
): ProjectRemoteSyncStatus {
  return summarizeTasks(status.tasks.filter((task) => task.projectId !== projectId || !isActiveTask(task)))
}

export function shouldShowProjectRemoteSyncStatus(status: ProjectRemoteSyncStatus) {
  return status.pendingUploadCount > 0
}
