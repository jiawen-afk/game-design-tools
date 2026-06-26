import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearProjectDeviceBinding,
  clearProjectDeviceBindingFromLocalPersistence,
  hydrateProjectDeviceBindingsFromLocalPersistence,
  readProjectDeviceBinding,
  writeProjectDeviceBinding,
  writeProjectDeviceBindingToLocalPersistence,
  type ProjectDeviceBindingPersistence,
} from './projectDeviceBindings'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => { values.delete(key) },
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

test('project device binding stores current-device remote profile ids per project', () => {
  const storage = createMemoryStorage()

  writeProjectDeviceBinding('project-a', {
    databaseProfileId: 'db-local',
    storageProfileId: 'kodo-local',
  }, storage)

  assert.deepEqual(readProjectDeviceBinding('project-a', storage), {
    databaseProfileId: 'db-local',
    storageProfileId: 'kodo-local',
  })
  assert.equal(readProjectDeviceBinding('project-b', storage), null)
})

test('project device binding ignores partial or blank profile ids', () => {
  const storage = createMemoryStorage()

  writeProjectDeviceBinding('project-a', {
    databaseProfileId: 'db-local',
    storageProfileId: '',
  }, storage)

  assert.equal(readProjectDeviceBinding('project-a', storage), null)
})

test('project device binding can be cleared without touching other projects', () => {
  const storage = createMemoryStorage()
  writeProjectDeviceBinding('project-a', {
    databaseProfileId: 'db-a',
    storageProfileId: 'kodo-a',
  }, storage)
  writeProjectDeviceBinding('project-b', {
    databaseProfileId: 'db-b',
    storageProfileId: 'kodo-b',
  }, storage)

  clearProjectDeviceBinding('project-a', storage)

  assert.equal(readProjectDeviceBinding('project-a', storage), null)
  assert.deepEqual(readProjectDeviceBinding('project-b', storage), {
    databaseProfileId: 'db-b',
    storageProfileId: 'kodo-b',
  })
})

function createMemoryProjectDeviceBindingPersistence(
  seed: Record<string, { databaseProfileId: string, storageProfileId: string }> = {},
): ProjectDeviceBindingPersistence & {
  written: Array<[string, { databaseProfileId: string, storageProfileId: string }]>
  cleared: string[]
} {
  const values = new Map(Object.entries(seed))
  return {
    written: [],
    cleared: [],
    async list() {
      return Object.fromEntries(values)
    },
    async write(projectId, binding) {
      values.set(projectId, binding)
      this.written.push([projectId, binding])
    },
    async clear(projectId) {
      values.delete(projectId)
      this.cleared.push(projectId)
    },
  }
}

test('project device bindings hydrate from local persistence and migrate legacy storage bindings', async () => {
  const storage = createMemoryStorage()
  writeProjectDeviceBinding('legacy-project', {
    databaseProfileId: 'db-legacy',
    storageProfileId: 'kodo-legacy',
  }, storage)
  writeProjectDeviceBinding('persisted-project', {
    databaseProfileId: 'db-stale',
    storageProfileId: 'kodo-stale',
  }, storage)
  const persistence = createMemoryProjectDeviceBindingPersistence({
    'persisted-project': {
      databaseProfileId: 'db-sqlite',
      storageProfileId: 'kodo-sqlite',
    },
  })

  await hydrateProjectDeviceBindingsFromLocalPersistence({ storage, persistence })

  assert.deepEqual(readProjectDeviceBinding('legacy-project', storage), {
    databaseProfileId: 'db-legacy',
    storageProfileId: 'kodo-legacy',
  })
  assert.deepEqual(readProjectDeviceBinding('persisted-project', storage), {
    databaseProfileId: 'db-sqlite',
    storageProfileId: 'kodo-sqlite',
  })
  assert.deepEqual(persistence.written, [[
    'legacy-project',
    { databaseProfileId: 'db-legacy', storageProfileId: 'kodo-legacy' },
  ]])
})

test('project device binding writes and clears through local persistence', async () => {
  const storage = createMemoryStorage()
  const persistence = createMemoryProjectDeviceBindingPersistence()

  await writeProjectDeviceBindingToLocalPersistence('project-a', {
    databaseProfileId: 'db-a',
    storageProfileId: 'kodo-a',
  }, { storage, persistence })

  assert.deepEqual(readProjectDeviceBinding('project-a', storage), {
    databaseProfileId: 'db-a',
    storageProfileId: 'kodo-a',
  })
  assert.deepEqual(persistence.written, [[
    'project-a',
    { databaseProfileId: 'db-a', storageProfileId: 'kodo-a' },
  ]])

  await clearProjectDeviceBindingFromLocalPersistence('project-a', { storage, persistence })

  assert.equal(readProjectDeviceBinding('project-a', storage), null)
  assert.deepEqual(persistence.cleared, ['project-a'])
})
