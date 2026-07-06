import { useEffect, useMemo, useState } from 'react'

import {
  createDesktopKodoProjectObjectStorage,
  createDesktopLocalProjectObjectStorage,
  createDesktopLocalProjectRepository,
  createDesktopProjectAssetCacheStorage,
  createDesktopRemoteProjectRepository,
  createProjectAssetManager,
  hydrateProjectDeviceBindingsFromLocalPersistence,
  readActiveProjectId,
  readProjectDeviceBinding,
  type ProjectAssetManager,
  type ProjectMode,
  type ProjectObjectStorage,
} from '../ProjectStorage'

export interface VoiceProjectResourceReadOptions {
  projectObjectStorage?: ProjectObjectStorage
  projectAssetManager?: ProjectAssetManager
  projectId?: string
  projectMode?: ProjectMode
}

interface ActiveProjectResourceRef {
  projectId: string
  projectMode: ProjectMode
}

const voiceProjectLocalRepository = createDesktopLocalProjectRepository()
const voiceProjectLocalObjectStorage = createDesktopLocalProjectObjectStorage()
const voiceProjectRemoteObjectStorage = createDesktopKodoProjectObjectStorage((_objectKey, projectId) => (
  projectDeviceBinding(projectId)?.storageProfileId ?? ''
))
const voiceProjectRemoteRepository = createDesktopRemoteProjectRepository((projectId) => (
  projectDeviceBinding(projectId)?.databaseProfileId ?? ''
))
const voiceProjectAssetManager = createProjectAssetManager({
  localObjectStorage: voiceProjectLocalObjectStorage,
  remoteObjectStorage: voiceProjectRemoteObjectStorage,
  cacheStorage: createDesktopProjectAssetCacheStorage(),
})

function projectDeviceBinding(projectId?: string) {
  const resolvedProjectId = projectId?.trim() || readActiveProjectId()
  return resolvedProjectId ? readProjectDeviceBinding(resolvedProjectId) : null
}

async function readActiveProjectResourceRef(): Promise<ActiveProjectResourceRef | null> {
  await hydrateProjectDeviceBindingsFromLocalPersistence()
  const activeProjectId = readActiveProjectId()
  if (!activeProjectId) return null

  const localProject = await voiceProjectLocalRepository.getProject(activeProjectId)
  const project = localProject?.project
    ?? (await voiceProjectRemoteRepository.getProject(activeProjectId).catch(() => null))?.project
    ?? null
  if (!project) return null
  return {
    projectId: project.id,
    projectMode: project.mode,
  }
}

export function useVoiceProjectResourceReadOptions(): VoiceProjectResourceReadOptions {
  const [activeProjectResourceRef, setActiveProjectResourceRef] = useState<ActiveProjectResourceRef | null>(null)

  useEffect(() => {
    let alive = true
    void readActiveProjectResourceRef()
      .then((resourceRef) => {
        if (alive) setActiveProjectResourceRef(resourceRef)
      })
      .catch(() => {
        if (alive) setActiveProjectResourceRef(null)
      })
    return () => {
      alive = false
    }
  }, [])

  return useMemo(() => ({
    projectObjectStorage: activeProjectResourceRef?.projectMode === 'remote'
      ? voiceProjectRemoteObjectStorage
      : activeProjectResourceRef
        ? voiceProjectLocalObjectStorage
        : undefined,
    projectAssetManager: voiceProjectAssetManager,
    projectId: activeProjectResourceRef?.projectId,
    projectMode: activeProjectResourceRef?.projectMode,
  }), [activeProjectResourceRef])
}
