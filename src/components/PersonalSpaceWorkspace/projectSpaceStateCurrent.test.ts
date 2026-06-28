import test from 'node:test'
import assert from 'node:assert/strict'

import { activeProjectStorageKey } from '../ProjectStorage/projectActiveProject'
import { createPersonalSpaceAsset, defaultPersonalSpaceState } from './personalSpaceModel'
import { personalSpaceStorageKey } from './personalSpaceState'
import {
  readCurrentProjectSpaceState,
  readProjectSpaceState,
  writeCurrentProjectSpaceState,
} from './projectSpaceState'
import { createMemoryStorage } from './currentProjectSpacePersistenceTestHelpers.test'

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
