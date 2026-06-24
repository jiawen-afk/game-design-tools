import type { PersonalSpaceState } from './personalSpaceModel'
import { readActiveProjectId } from '../ProjectStorage/projectActiveProject'
import {
  clonePersonalSpaceState,
  defaultPersonalSpaceState,
  readPersonalSpaceState,
  writePersonalSpaceState,
} from './personalSpaceState'

export const projectSpaceStatesStorageKey = 'game-design-tools.project-space.states.v1'

export interface ProjectSpaceStateReadOptions {
  storage?: Storage
  fallbackState?: PersonalSpaceState
}

type StoredProjectStates = Record<string, PersonalSpaceState>

function readStoredProjectStates(storage: Storage): StoredProjectStates {
  try {
    const raw = storage.getItem(projectSpaceStatesStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredProjectStates(states: StoredProjectStates, storage: Storage) {
  storage.setItem(projectSpaceStatesStorageKey, JSON.stringify(states))
}

export function createEmptyProjectSpaceState(storageDirectory = ''): PersonalSpaceState {
  return {
    ...defaultPersonalSpaceState,
    settings: {
      ...defaultPersonalSpaceState.settings,
      storageDirectory,
    },
    assetGroups: {
      image: [...defaultPersonalSpaceState.assetGroups.image],
      sprite: [...defaultPersonalSpaceState.assetGroups.sprite],
      voice: [...defaultPersonalSpaceState.assetGroups.voice],
    },
    starredAssetGroups: {
      image: [],
      sprite: [],
      voice: [],
    },
    characters: [],
    assets: [],
    storyboardGroups: [],
    pendingDeletedResourcePaths: [],
  }
}

export function hasProjectSpaceState(projectId: string, storage: Storage = localStorage) {
  return Boolean(projectId && readStoredProjectStates(storage)[projectId])
}

export function readProjectSpaceState(projectId: string, options: ProjectSpaceStateReadOptions = {}) {
  const storage = options.storage ?? localStorage
  const stored = projectId ? readStoredProjectStates(storage)[projectId] : null
  if (stored) return clonePersonalSpaceState(stored)
  return clonePersonalSpaceState(options.fallbackState ?? defaultPersonalSpaceState)
}

export function readCachedProjectSpaceState(projectId: string, storage: Storage = localStorage) {
  const stored = projectId ? readStoredProjectStates(storage)[projectId] : null
  return stored ? clonePersonalSpaceState(stored) : null
}

export function writeProjectSpaceState(projectId: string, state: PersonalSpaceState, storage: Storage = localStorage) {
  if (!projectId) return
  const states = readStoredProjectStates(storage)
  states[projectId] = clonePersonalSpaceState(state)
  writeStoredProjectStates(states, storage)
}

export function deleteProjectSpaceState(projectId: string, storage: Storage = localStorage) {
  if (!projectId) return
  const states = readStoredProjectStates(storage)
  delete states[projectId]
  writeStoredProjectStates(states, storage)
}

export function readCurrentProjectSpaceState(storage: Storage = localStorage) {
  const projectId = readActiveProjectId(storage)
  if (projectId) return readProjectSpaceState(projectId, { storage, fallbackState: readPersonalSpaceState(storage) })
  return readPersonalSpaceState(storage)
}

export function writeCurrentProjectSpaceState(state: PersonalSpaceState, storage: Storage = localStorage) {
  const projectId = readActiveProjectId(storage)
  if (projectId) {
    writeProjectSpaceState(projectId, state, storage)
    return
  }
  writePersonalSpaceState(state, storage)
}
