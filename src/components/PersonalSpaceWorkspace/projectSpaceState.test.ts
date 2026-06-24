import test from 'node:test'
import assert from 'node:assert/strict'

import { createPersonalSpaceAsset, defaultPersonalSpaceState } from './personalSpaceModel'
import {
  readCurrentProjectSpaceState,
  deleteProjectSpaceState,
  hasProjectSpaceState,
  projectSpaceStatesStorageKey,
  readCachedProjectSpaceState,
  readProjectSpaceState,
  writeCurrentProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
import { activeProjectStorageKey } from '../ProjectStorage/projectActiveProject'
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
