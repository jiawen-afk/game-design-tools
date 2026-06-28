import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMemoryDirectoryHandle,
  writeAssetResourcesToDirectory,
} from './personalSpaceFileStorage'
import {
  createPortraitAssetFromUpload,
  createSpriteAssetFromExport,
} from './personalSpaceModel'

test('writes asset resources into category and import-date folders with hashed names', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const asset = {
    ...createSpriteAssetFromExport({
      name: '主角行走',
      spritePath: 'blob:sprite',
      indexPath: 'blob:index',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }

  const resources = [
    { name: 'sprite.png', data: new Blob(['png']) },
    { name: 'index.json', data: new Blob(['{}'], { type: 'application/json' }) },
  ]
  const stored = await writeAssetResourcesToDirectory(root, asset, resources)

  assert.equal(stored.storageResourcePaths.length, resources.length)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/精灵图\/2026-06-06\/[a-f0-9]{16}\.png$/)
  assert.match(stored.storageResourcePaths[1]!, /^PersonalSpace\/精灵图\/2026-06-06\/[a-f0-9]{16}\.json$/)
  assert.doesNotMatch(stored.storageResourcePaths.join('\n'), /主角行走|sprite|index/)
  assert.equal(await root.readText(stored.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), await resources[0]!.data.text())
  assert.equal(await root.readText(stored.storageResourcePaths[1]!.replace(/^PersonalSpace\//, '')), await resources[1]!.data.text())
})

test('uploaded portrait resources are stored under the portrait category', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const asset = {
    ...createPortraitAssetFromUpload({
      name: 'hero-face.png',
      portraitPath: 'blob:portrait',
    }),
    createdAt: '2026-06-06T12:00:00.000Z',
  }

  const resources = [
    { name: 'portrait.png', data: new Blob(['portrait']) },
  ]
  const stored = await writeAssetResourcesToDirectory(root, asset, resources)

  assert.equal(stored.name, 'hero-face.png')
  assert.equal(stored.storageResourcePaths.length, resources.length)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/角色肖像\/2026-06-06\/[a-f0-9]{16}\.png$/)
  assert.doesNotMatch(stored.storageResourcePaths[0]!, /hero-face/)
  assert.equal(await root.readText(stored.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), await resources[0]!.data.text())
})
