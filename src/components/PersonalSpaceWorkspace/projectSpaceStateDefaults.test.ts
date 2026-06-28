import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultPersonalSpaceState } from './personalSpaceModel'
import { createEmptyProjectSpaceState } from './projectSpaceState'

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
