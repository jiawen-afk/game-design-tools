import test from 'node:test'
import assert from 'node:assert/strict'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from './personalSpaceModel'
import {
  createEmptyProjectSpaceState,
  readCurrentProjectSpaceState,
  deleteProjectSpaceState,
  hasProjectSpaceState,
  projectSpaceStatesStorageKey,
  readCachedProjectSpaceState,
  readProjectSpaceState,
  writeCurrentProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
import {
  loadProjectSpaceStateFromStorage,
  persistCurrentProjectSpaceState,
} from './currentProjectSpacePersistence'
import { createMemoryDirectoryHandle } from './personalSpaceFileStorage'
import { activeProjectStorageKey } from '../ProjectStorage/projectActiveProject'
import { createMemoryProjectObjectStorage } from '../ProjectStorage/projectLocalObjectStorage'
import { createMemoryProjectRepository } from '../ProjectStorage/projectSqliteRepository'
import { personalSpaceStorageKey } from './personalSpaceState'

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

test('empty project space state clones defaults with project-local storage directory and cleared stars', () => {
  const empty = createEmptyProjectSpaceState('D:\\ProjectAssets')

  assert.equal(empty.settings.storageDirectory, 'D:\\ProjectAssets')
  assert.deepEqual(empty.assets, [])
  assert.deepEqual(empty.characters, [])
  assert.deepEqual(empty.storyboardGroups, [])
  assert.deepEqual(empty.pendingDeletedResourcePaths, [])
  assert.deepEqual(empty.starredAssetGroups, { image: [], sprite: [], voice: [] })
  assert.notEqual(empty.assetGroups.image, defaultPersonalSpaceState.assetGroups.image)
  assert.deepEqual(empty.assetGroups, defaultPersonalSpaceState.assetGroups)
})

test('project space state stores independent workbench data per project', () => {
  const storage = createMemoryStorage()
  const p1Asset = createPersonalSpaceAsset({ kind: 'voice', name: 'p1.wav' })
  const p2Asset = createPersonalSpaceAsset({ kind: 'voice', name: 'p2.wav' })

  writeProjectSpaceState('p1', { ...defaultPersonalSpaceState, assets: [p1Asset] }, storage)
  writeProjectSpaceState('p2', { ...defaultPersonalSpaceState, assets: [p2Asset] }, storage)

  assert.equal(JSON.parse(storage.getItem(projectSpaceStatesStorageKey)!).p1.assets.length, 1)
  assert.deepEqual(readProjectSpaceState('p1', { storage }).assets.map((asset) => asset.name), ['p1.wav'])
  assert.deepEqual(readProjectSpaceState('p2', { storage }).assets.map((asset) => asset.name), ['p2.wav'])
})

test('project space state uses fallback only for the first read of an unstored project', () => {
  const storage = createMemoryStorage()
  const fallbackAsset = createPersonalSpaceAsset({ kind: 'voice', name: 'legacy.wav' })

  assert.equal(hasProjectSpaceState('p1', storage), false)
  assert.deepEqual(
    readProjectSpaceState('p1', {
      storage,
      fallbackState: { ...defaultPersonalSpaceState, assets: [fallbackAsset] },
    }).assets.map((asset) => asset.name),
    ['legacy.wav'],
  )

  writeProjectSpaceState('p1', defaultPersonalSpaceState, storage)
  assert.equal(hasProjectSpaceState('p1', storage), true)
  assert.deepEqual(
    readProjectSpaceState('p1', {
      storage,
      fallbackState: { ...defaultPersonalSpaceState, assets: [fallbackAsset] },
    }).assets,
    [],
  )
})

test('cached project space reader returns null instead of fallback for uncached projects', () => {
  const storage = createMemoryStorage()
  const cachedAsset = createPersonalSpaceAsset({ kind: 'voice', name: 'cached.wav' })

  assert.equal(readCachedProjectSpaceState('p1', storage), null)

  writeProjectSpaceState('p1', { ...defaultPersonalSpaceState, assets: [cachedAsset] }, storage)
  assert.deepEqual(
    readCachedProjectSpaceState('p1', storage)?.assets.map((asset) => asset.name),
    ['cached.wav'],
  )
})

test('project space state can be hard deleted for removed projects', () => {
  const storage = createMemoryStorage()
  const p1Asset = createPersonalSpaceAsset({ kind: 'voice', name: 'p1.wav' })
  const p2Asset = createPersonalSpaceAsset({ kind: 'voice', name: 'p2.wav' })

  writeProjectSpaceState('p1', { ...defaultPersonalSpaceState, assets: [p1Asset] }, storage)
  writeProjectSpaceState('p2', { ...defaultPersonalSpaceState, assets: [p2Asset] }, storage)
  deleteProjectSpaceState('p1', storage)

  assert.equal(hasProjectSpaceState('p1', storage), false)
  assert.deepEqual(readProjectSpaceState('p1', { storage }).assets, [])
  assert.deepEqual(readProjectSpaceState('p2', { storage }).assets.map((asset) => asset.name), ['p2.wav'])
})

test('current project space helpers write external workspace changes into the enabled project', () => {
  const legacyAsset = createPersonalSpaceAsset({ kind: 'voice', name: 'legacy.wav' })
  const projectAsset = createPersonalSpaceAsset({ kind: 'sprite', name: 'walk.png' })
  const storage = createMemoryStorage({
    [activeProjectStorageKey]: 'p1',
    [personalSpaceStorageKey]: JSON.stringify({ ...defaultPersonalSpaceState, assets: [legacyAsset] }),
  })

  writeCurrentProjectSpaceState({ ...defaultPersonalSpaceState, assets: [projectAsset] }, storage)

  assert.deepEqual(readCurrentProjectSpaceState(storage).assets.map((asset) => asset.name), ['walk.png'])
  assert.deepEqual(readProjectSpaceState('p1', { storage }).assets.map((asset) => asset.name), ['walk.png'])
  assert.deepEqual(JSON.parse(storage.getItem(personalSpaceStorageKey)!).assets.map((asset: { name: string }) => asset.name), ['legacy.wav'])
})

test('current project persistence syncs external workspace changes to local project storage', async () => {
  const storage = createMemoryStorage({ [activeProjectStorageKey]: 'p1' })
  const repository = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await repository.initializeSchema()
  await repository.createProject({
    name: '本地项目',
    description: '',
    localObjectRoot: 'D:\\GameAssets',
    now: '2026-06-25T00:00:00.000Z',
  })
  const createdProject = (await repository.listProjects())[0]!
  await repository.updateProject(createdProject.id, {
    name: '本地项目',
    description: '',
    updatedAt: '2026-06-25T00:00:00.000Z',
  })
  storage.setItem(activeProjectStorageKey, createdProject.id)
  await directory.writeText('配音/2026-06-25/welcome.wav', 'voice-bytes')
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      resourcePaths: ['blob:voice'],
    }),
    createdAt: '2026-06-25T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/配音/2026-06-25/welcome.wav'],
  }

  const result = await persistCurrentProjectSpaceState({
    ...defaultPersonalSpaceState,
    assets: [voice],
  }, {
    storage,
    localRepository: repository,
    localObjectStorage: localObjects,
    getDirectoryHandle: async () => directory,
    now: () => '2026-06-25T01:00:00.000Z',
  })

  assert.equal(result.synced, true)
  assert.equal(result.projectId, createdProject.id)
  assert.deepEqual(readCurrentProjectSpaceState(storage).assets.map((asset) => asset.name), ['欢迎'])
  const rows = await repository.exportProjectRows(createdProject.id)
  assert.ok(rows)
  assert.equal(rows.assets.length, 1)
  assert.equal(await (await localObjects.getObject(rows.assets[0]!.primary_object_key)).text(), 'voice-bytes')
})

test('current project persistence syncs external workspace changes to remote project storage', async () => {
  const storage = createMemoryStorage({ [activeProjectStorageKey]: 'p1' })
  const localRepository = createMemoryProjectRepository()
  const remoteRepository = createMemoryProjectRepository()
  const localObjects = createMemoryProjectObjectStorage()
  const remoteObjects = createMemoryProjectObjectStorage()
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await localRepository.initializeSchema()
  await remoteRepository.initializeSchema()
  await remoteRepository.createRemoteProject({
    id: 'p1',
    name: '远程项目',
    description: '',
    databaseProvider: 'postgresql',
    databaseProfileId: 'db-current',
    storageProfileId: 'kodo-current',
    now: '2026-06-25T00:00:00.000Z',
  })
  await directory.writeText('配音/2026-06-25/welcome.wav', 'voice-bytes')
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      resourcePaths: ['blob:voice'],
    }),
    createdAt: '2026-06-25T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/配音/2026-06-25/welcome.wav'],
  }

  const result = await persistCurrentProjectSpaceState({
    ...defaultPersonalSpaceState,
    assets: [voice],
  }, {
    storage,
    localRepository,
    remoteRepository,
    localObjectStorage: localObjects,
    remoteObjectStorage: remoteObjects,
    getDirectoryHandle: async () => directory,
    now: () => '2026-06-25T01:00:00.000Z',
  })

  assert.equal(result.synced, true)
  assert.equal(result.projectId, 'p1')
  assert.deepEqual(readCurrentProjectSpaceState(storage).assets.map((asset) => asset.name), ['欢迎'])
  const rows = await remoteRepository.exportProjectRows('p1')
  assert.ok(rows)
  assert.equal(rows.project.mode, 'remote')
  assert.equal(rows.assets.length, 1)
  assert.equal(await (await remoteObjects.getObject(rows.assets[0]!.primary_object_key)).text(), 'voice-bytes')
})

test('project space loader returns cached remote state and named warning when remote export fails', async () => {
  const storage = createMemoryStorage()
  const cachedAsset = createPersonalSpaceAsset({ kind: 'voice', name: 'cached.wav' })
  writeProjectSpaceState('p1', { ...defaultPersonalSpaceState, assets: [cachedAsset] }, storage)

  const warnings: string[] = []
  const result = await loadProjectSpaceStateFromStorage({
    projectId: 'p1',
    project: {
      id: 'p1',
      name: '山海再就业',
      description: '',
      mode: 'remote',
      status: 'active',
      object_key_prefix: 'objects/山海再就业',
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
      metadata_json: null,
    },
    fallbackState: defaultPersonalSpaceState,
    storage,
    remoteRepository: {
      exportProjectRows: async () => {
        throw new Error('项目 p1 缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。')
      },
    },
    localRepository: {
      importProjectRows: async () => {},
      exportProjectRows: async () => null,
    },
    onRemoteProjectLoaded: () => {},
    onWarning: (message) => warnings.push(message),
  })

  assert.deepEqual(result?.assets.map((asset) => asset.name), ['cached.wav'])
  assert.deepEqual(warnings, [
    '远程项目数据读取失败，已使用本地项目缓存：项目“山海再就业”缺少远程数据库配置，请在项目管理中重新保存远程数据库连接。',
  ])
})
