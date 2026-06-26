import test from 'node:test'
import assert from 'node:assert/strict'

import { createProjectRemoteDeviceBindingResolver } from './projectRemoteDeviceBinding'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

test('remote device binding resolver maps project object keys to current device storage profiles', async () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => 'db-selected',
    getSelectedStorageProfileId: () => 'kodo-selected',
  })

  await resolver.bindProjectToCurrentDevice('project-a', 'db-current', 'kodo-current')
  resolver.rememberRemoteProject({
    id: 'project-a',
    name: '山海 再就业',
    object_key_prefix: 'objects/山海_再就业',
  })

  assert.deepEqual(resolver.currentDeviceBindingForProject('project-a'), {
    databaseProfileId: 'db-current',
    storageProfileId: 'kodo-current',
  })
  assert.equal(resolver.getRemoteDatabaseProfileId('project-a'), 'db-current')
  assert.equal(resolver.getRemoteStorageProfileId('objects/山海_再就业/audio_wav/r1.wav'), 'kodo-current')
  assert.equal(resolver.getRemoteDatabaseProfileId(), 'db-selected')
  assert.equal(resolver.getRemoteStorageProfileId(), 'kodo-selected')
})

test('remote device binding resolver ignores stale local profile bindings', async () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })

  await resolver.bindProjectToCurrentDevice('project-a', 'db-old', 'kodo-old')

  assert.equal(resolver.currentDeviceBindingForProject('project-a'), null)
  assert.equal(resolver.getRemoteDatabaseProfileId('project-a'), '')
})

test('remote device binding resolver resolves database and storage bindings independently', async () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => [],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })

  await resolver.bindProjectToCurrentDevice('project-a', 'db-current', 'kodo-missing')
  resolver.rememberRemoteProject({
    id: 'project-a',
    name: '山海再就业',
    object_key_prefix: 'objects/山海再就业',
  })

  assert.equal(resolver.getRemoteDatabaseProfileId('project-a'), 'db-current')
  assert.equal(resolver.getRemoteStorageProfileId('objects/山海再就业/image_png/r1.png'), '')
  assert.equal(resolver.currentDeviceBindingForProject('project-a'), null)
})

test('remote device binding resolver does not fallback to selected storage profile for project object keys', () => {
  const resolver = createProjectRemoteDeviceBindingResolver({
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => 'db-selected',
    getSelectedStorageProfileId: () => 'kodo-selected',
  })

  assert.equal(resolver.getRemoteStorageProfileId(), 'kodo-selected')
  assert.equal(resolver.getRemoteStorageProfileId('objects/山海再就业/audio_wav/r1.wav'), '')
})

test('remote device binding resolver remembers historical asset object key prefixes for renamed projects', async () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })

  await resolver.bindProjectToCurrentDevice('project-a', 'db-current', 'kodo-current')
  resolver.rememberRemoteProject({
    id: 'project-a',
    name: '山海再就业 新名',
    object_key_prefix: 'objects/山海再就业_新名',
    assetObjectKeys: [
      'objects/山海再就业/audio_wav/voice-1.wav',
      'objects/山海再就业_旧名/image_png/sprite-1.png',
      '',
      'local/path/ignored.png',
    ],
  })

  assert.equal(resolver.getRemoteStorageProfileId('objects/山海再就业/audio_wav/voice-1.wav'), 'kodo-current')
  assert.equal(resolver.getRemoteStorageProfileId('objects/山海再就业_旧名/image_png/sprite-1.png'), 'kodo-current')
  assert.equal(resolver.getRemoteStorageProfileId('objects/山海再就业_新名/image_png/sprite-2.png'), 'kodo-current')
})

test('remote device binding resolver can resolve storage profile from explicit project id', async () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })
  const getRemoteStorageProfileId = resolver.getRemoteStorageProfileId as (
    objectKey?: string,
    projectId?: string,
  ) => string

  await resolver.bindProjectToCurrentDevice('project-a', 'db-current', 'kodo-current')

  assert.equal(
    getRemoteStorageProfileId('objects/旧项目名/image_png/portrait.png', 'project-a'),
    'kodo-current',
  )
  assert.equal(resolver.getRemoteStorageProfileId('objects/旧项目名/image_png/portrait.png'), '')
})

test('remote device binding resolver falls back to selected storage profile for explicit project reads only', () => {
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage: createMemoryStorage(),
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-selected'],
    getSelectedDatabaseProfileId: () => 'db-current',
    getSelectedStorageProfileId: () => 'kodo-selected',
  })
  const getRemoteStorageProfileId = resolver.getRemoteStorageProfileId as (
    objectKey?: string,
    projectId?: string,
  ) => string

  assert.equal(
    getRemoteStorageProfileId('objects/旧项目名/image_png/portrait.png', 'project-a'),
    'kodo-selected',
  )
  assert.equal(resolver.currentDeviceBindingForProject('project-a'), null)
  assert.equal(resolver.getRemoteStorageProfileId('objects/旧项目名/image_png/portrait.png'), '')
})

test('remote device binding resolver hydrates and writes through local device binding persistence', async () => {
  const storage = createMemoryStorage()
  const writes: Array<[string, { databaseProfileId: string, storageProfileId: string }]> = []
  const clears: string[] = []
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    persistence: {
      async list() {
        return {
          'project-a': {
            databaseProfileId: 'db-sqlite',
            storageProfileId: 'kodo-sqlite',
          },
        }
      },
      async write(projectId, binding) {
        writes.push([projectId, binding])
      },
      async clear(projectId) {
        clears.push(projectId)
      },
    },
    getDatabaseProfileIds: () => ['db-sqlite', 'db-new'],
    getStorageProfileIds: () => ['kodo-sqlite', 'kodo-new'],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })

  await resolver.hydrateCurrentDeviceBindings()

  assert.deepEqual(resolver.currentDeviceBindingForProject('project-a'), {
    databaseProfileId: 'db-sqlite',
    storageProfileId: 'kodo-sqlite',
  })

  await resolver.bindProjectToCurrentDevice('project-a', 'db-new', 'kodo-new')
  assert.deepEqual(writes, [[
    'project-a',
    { databaseProfileId: 'db-new', storageProfileId: 'kodo-new' },
  ]])
  assert.deepEqual(resolver.currentDeviceBindingForProject('project-a'), {
    databaseProfileId: 'db-new',
    storageProfileId: 'kodo-new',
  })

  await resolver.clearProjectFromCurrentDevice('project-a')
  assert.deepEqual(clears, ['project-a'])
  assert.equal(resolver.currentDeviceBindingForProject('project-a'), null)
})
