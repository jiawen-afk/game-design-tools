import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMemoryDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
  type PersonalSpaceDirectoryHandleStore,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import {
  addCharacterProfile,
  defaultPersonalSpaceState,
  personalSpaceStorageKey,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { defaultVoiceGenerationParams, type VoiceGenerationRecord } from './voiceDeploymentModel'
import { collectVoiceRecordToPersonalSpace } from './voicePersonalSpaceCollector'

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

function createVoiceRecord(): VoiceGenerationRecord {
  return {
    id: 'voice-1',
    name: '商人问候',
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'http://127.0.0.1/audio.wav',
    audioPath: null,
    params: {
      ...defaultVoiceGenerationParams,
      text: '欢迎来到我的商店。',
    },
  }
}

test('collecting generated voice requires an authorized personal space directory', async () => {
  const storage = createMemoryStorage({
    [personalSpaceStorageKey]: JSON.stringify({
      ...defaultPersonalSpaceState,
      settings: { storageDirectory: '', deleteResourcesWithContent: false },
    }),
  })
  const originalLocalStorage = globalThis.localStorage
  const originalFetch = globalThis.fetch
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  setPersonalSpaceDirectoryHandle(null)
  globalThis.fetch = (async () => new Response(new Blob(['voice'], { type: 'audio/wav' }), { status: 200 })) as typeof fetch

  try {
    await assert.rejects(
      () => collectVoiceRecordToPersonalSpace(createVoiceRecord(), undefined, { directoryHandleStore: null }),
      /请先在个人空间-设置中授权目录/
    )
    const state = JSON.parse(storage.getItem(personalSpaceStorageKey) ?? '{}')
    assert.equal(state.assets.length, 0)
  } finally {
    setPersonalSpaceDirectoryHandle(null)
    globalThis.fetch = originalFetch
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true })
  }
})

test('collecting generated voice loads the persisted authorized directory and stores audio resources there', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const store: PersonalSpaceDirectoryHandleStore = {
    get: async () => root,
    set: async () => {},
  }
  const storage = createMemoryStorage({
    [personalSpaceStorageKey]: JSON.stringify({
      ...defaultPersonalSpaceState,
      settings: { storageDirectory: '', deleteResourcesWithContent: false },
    }),
  })
  const originalLocalStorage = globalThis.localStorage
  const originalFetch = globalThis.fetch
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  setPersonalSpaceDirectoryHandle(null)
  globalThis.fetch = (async () => new Response(new Blob(['voice'], { type: 'audio/wav' }), { status: 200 })) as typeof fetch

  const record = createVoiceRecord()

  try {
    const state = await collectVoiceRecordToPersonalSpace(record, undefined, { directoryHandleStore: store })

    assert.equal(state.settings.storageDirectory, 'PersonalSpace')
    assert.equal(state.assets.length, 1)
    assert.match(state.assets[0]!.storageResourcePaths[0]!, /^PersonalSpace\/配音\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.wav$/)
    assert.equal(await root.readText(state.assets[0]!.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), 'voice')
  } finally {
    setPersonalSpaceDirectoryHandle(null)
    globalThis.fetch = originalFetch
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true })
  }
})

test('collecting the same generated voice again keeps only the latest asset and link', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const store: PersonalSpaceDirectoryHandleStore = {
    get: async () => root,
    set: async () => {},
  }
  const seededState = addCharacterProfile({
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: '', deleteResourcesWithContent: false },
  }, '商人')
  const characterId = seededState.characters[0]!.id
  const storage = createMemoryStorage({
    [personalSpaceStorageKey]: JSON.stringify(seededState),
  })
  const originalLocalStorage = globalThis.localStorage
  const originalFetch = globalThis.fetch
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  setPersonalSpaceDirectoryHandle(null)
  globalThis.fetch = (async () => new Response(new Blob(['voice'], { type: 'audio/wav' }), { status: 200 })) as typeof fetch

  const record = createVoiceRecord()

  try {
    const firstState = await collectVoiceRecordToPersonalSpace(record, undefined, { directoryHandleStore: store })
    const secondState = await collectVoiceRecordToPersonalSpace(
      record,
      { target: 'character', targetId: characterId },
      { directoryHandleStore: store },
    )

    assert.equal(firstState.assets.length, 1)
    assert.equal(secondState.assets.length, 1)
    assert.notEqual(secondState.assets[0]!.id, firstState.assets[0]!.id)
    assert.equal(secondState.assets[0]!.sourceKey, 'voice-record:voice-1')
    assert.deepEqual(secondState.assets[0]!.linkedCharacterIds, [characterId])
    assert.deepEqual(secondState.characters[0]!.voiceAssetIds, [secondState.assets[0]!.id])
  } finally {
    setPersonalSpaceDirectoryHandle(null)
    globalThis.fetch = originalFetch
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true })
  }
})
