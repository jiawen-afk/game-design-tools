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

test('remote device binding resolver maps project object keys to current device storage profiles', () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => 'db-selected',
    getSelectedStorageProfileId: () => 'kodo-selected',
  })

  resolver.bindProjectToCurrentDevice('project-a', 'db-current', 'kodo-current')
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

test('remote device binding resolver ignores stale local profile bindings', () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })

  resolver.bindProjectToCurrentDevice('project-a', 'db-old', 'kodo-old')

  assert.equal(resolver.currentDeviceBindingForProject('project-a'), null)
  assert.equal(resolver.getRemoteDatabaseProfileId('project-a'), '')
})

test('remote device binding resolver resolves database and storage bindings independently', () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => [],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })

  resolver.bindProjectToCurrentDevice('project-a', 'db-current', 'kodo-missing')
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

test('remote device binding resolver remembers historical asset object key prefixes for renamed projects', () => {
  const storage = createMemoryStorage()
  const resolver = createProjectRemoteDeviceBindingResolver({
    storage,
    getDatabaseProfileIds: () => ['db-current'],
    getStorageProfileIds: () => ['kodo-current'],
    getSelectedDatabaseProfileId: () => '',
    getSelectedStorageProfileId: () => '',
  })

  resolver.bindProjectToCurrentDevice('project-a', 'db-current', 'kodo-current')
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
