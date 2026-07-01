import test from 'node:test'
import assert from 'node:assert/strict'

import { createSpriteAssetForUpload } from './personalSpaceResourceActions'
import { defaultPersonalSpaceState } from './personalSpaceModel'

test('sprite upload action accepts WebP sprite sheets with index json', async () => {
  const createdUrls: string[] = []
  const originalCreateObjectUrl = URL.createObjectURL
  URL.createObjectURL = ((file: File) => {
    const url = `blob://${file.name}`
    createdUrls.push(url)
    return url
  }) as typeof URL.createObjectURL
  try {
    const asset = await createSpriteAssetForUpload(defaultPersonalSpaceState, [
      new File(['webp'], 'sprite.webp', { type: 'image/webp' }),
      new File(['{}'], 'index.json', { type: 'application/json' }),
    ], null)

    assert.equal(asset.name, 'sprite.webp')
    assert.equal(asset.kind, 'sprite')
    assert.deepEqual(asset.resourcePaths, ['blob://sprite.webp', 'blob://index.json'])
    assert.deepEqual(createdUrls, ['blob://sprite.webp', 'blob://index.json'])
  } finally {
    URL.createObjectURL = originalCreateObjectUrl
  }
})
