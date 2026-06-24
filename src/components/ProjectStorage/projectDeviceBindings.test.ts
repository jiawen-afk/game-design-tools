import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearProjectDeviceBinding,
  readProjectDeviceBinding,
  writeProjectDeviceBinding,
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
