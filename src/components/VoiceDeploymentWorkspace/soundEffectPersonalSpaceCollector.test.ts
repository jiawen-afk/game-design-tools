import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMemoryDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
  type PersonalSpaceDirectoryHandleStore,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import {
  collectPersonalSpaceAsset,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
  personalSpaceStorageKey,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import type { SoundEffectRecord } from './soundEffectModel'
import { collectSoundEffectRecordToPersonalSpace } from './soundEffectPersonalSpaceCollector'

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

function createSoundRecord(): SoundEffectRecord {
  return {
    id: 'record-1',
    name: 'Slash',
    createdAt: '2026-07-04T00:00:00.000Z',
    audioUrl: 'http://127.0.0.1:8818/outputs/slash.wav',
    audioPath: 'D:\\outputs\\slash.wav',
    prompt: 'sharp slash',
    durationSeconds: 2,
    seed: 1,
    model: 'small-sfx',
  }
}

test('collects sound effect records into sound assets and links selected sprite', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const store: PersonalSpaceDirectoryHandleStore = {
    get: async () => root,
    set: async () => {},
  }
  const sprite = createPersonalSpaceAsset({
    kind: 'sprite',
    assetSubtype: 'character_sprite',
    name: 'Hero',
    resourcePaths: ['sprite.png', 'index.json'],
  })
  const seededState = collectPersonalSpaceAsset(defaultPersonalSpaceState, sprite)
  const storage = createMemoryStorage({
    [personalSpaceStorageKey]: JSON.stringify(seededState),
  })
  const originalLocalStorage = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  setPersonalSpaceDirectoryHandle(null)

  try {
    const state = await collectSoundEffectRecordToPersonalSpace(
      createSoundRecord(),
      { target: 'sprite', targetId: sprite.id },
      {
        directoryHandleStore: store,
        readBlob: async () => new Blob(['sound'], { type: 'audio/wav' }),
      },
    )

    const sound = state.assets.find((asset) => asset.kind === 'sound')
    assert.equal(sound?.name, 'Slash')
    assert.equal(sound?.assetSubtype, 'sound_effect')
    assert.deepEqual(sound?.linkedSpriteAssetIds, [sprite.id])
    assert.match(sound?.storageResourcePaths[0] ?? '', /^PersonalSpace\/音效\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.wav$/)
    assert.equal(await root.readText(sound!.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), 'sound')
  } finally {
    setPersonalSpaceDirectoryHandle(null)
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true })
  }
})
