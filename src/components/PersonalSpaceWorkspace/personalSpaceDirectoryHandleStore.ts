import {
  isStoredNativeDirectoryHandle,
  nativeDirectoryKind,
  restoreNativePersonalSpaceDirectoryHandle,
} from './personalSpaceNativeFileStorage'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'

export interface PersonalSpaceDirectoryHandleStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

let currentPersonalSpaceDirectoryHandle: PersonalSpaceDirectoryHandle | null = null
const directoryHandleKey = 'personal-space-directory'

export function setPersonalSpaceDirectoryHandle(handle: PersonalSpaceDirectoryHandle | null) {
  currentPersonalSpaceDirectoryHandle = handle
}

export function getPersonalSpaceDirectoryHandle() {
  return currentPersonalSpaceDirectoryHandle
}

export function createLocalDirectoryPathStore(): PersonalSpaceDirectoryHandleStore | null {
  if (typeof localStorage === 'undefined') return null
  return {
    async get(key) {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    },
    async set(key, value) {
      localStorage.setItem(key, JSON.stringify(value))
    },
  }
}

export async function persistPersonalSpaceDirectoryHandle(
  handle: PersonalSpaceDirectoryHandle,
  store: PersonalSpaceDirectoryHandleStore | null = createLocalDirectoryPathStore(),
) {
  const storedHandle = handle.kind === nativeDirectoryKind && handle.path
    ? { kind: nativeDirectoryKind, name: handle.name, path: handle.path }
    : handle
  await store?.set(directoryHandleKey, storedHandle)
}

export async function loadPersistedPersonalSpaceDirectoryHandle(
  store: PersonalSpaceDirectoryHandleStore | null = createLocalDirectoryPathStore(),
) {
  const handle = await store?.get(directoryHandleKey)
  if (!handle) return null
  if (isStoredNativeDirectoryHandle(handle)) {
    return restoreNativePersonalSpaceDirectoryHandle(handle)
  }
  const directoryHandle = handle as PersonalSpaceDirectoryHandle
  if (directoryHandle.queryPermission) {
    const current = await directoryHandle.queryPermission({ mode: 'readwrite' })
    if (current === 'granted') return directoryHandle
  } else {
    return directoryHandle
  }
  if (directoryHandle.requestPermission) {
    const next = await directoryHandle.requestPermission({ mode: 'readwrite' })
    if (next === 'granted') return directoryHandle
  }
  return null
}
