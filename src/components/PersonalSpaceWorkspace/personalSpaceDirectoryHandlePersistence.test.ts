import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMemoryDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'

test('persists and restores the authorized personal space directory handle', async () => {
  const handles = new Map<string, unknown>()
  const store = {
    get: async (key: string) => handles.get(key) ?? null,
    set: async (key: string, value: unknown) => { handles.set(key, value) },
  }
  const root = createMemoryDirectoryHandle('PersonalSpace')

  await persistPersonalSpaceDirectoryHandle(root, store)
  const restored = await loadPersistedPersonalSpaceDirectoryHandle(store)

  assert.equal(restored, root)
})

test('restored directory handles must allow readwrite access', async () => {
  const denied = {
    ...createMemoryDirectoryHandle('PersonalSpace'),
    queryPermission: async () => 'denied' as PermissionState,
    requestPermission: async () => 'denied' as PermissionState,
  }
  const store = {
    get: async () => denied,
    set: async () => {},
  }

  const restored = await loadPersistedPersonalSpaceDirectoryHandle(store)

  assert.equal(restored, null)
})
