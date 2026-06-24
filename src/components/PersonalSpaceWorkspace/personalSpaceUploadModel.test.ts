import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createSpriteUploadBatch,
} from './personalSpaceUploadModel'

function uploadFile(name: string, size: number) {
  return { name, size } as File
}

test('sprite upload batch requires one png and index json', () => {
  assert.equal(createSpriteUploadBatch([uploadFile('sprite.png', 12)]), null)
  assert.equal(createSpriteUploadBatch([uploadFile('index.json', 8)]), null)

  const batch = createSpriteUploadBatch([
    uploadFile('sprite.png', 12),
    uploadFile('index.json', 8),
  ])

  assert.deepEqual(batch?.files.map((file) => file.name), ['sprite.png', 'index.json'])
  assert.equal(batch?.batchKey, 'index.json:8|sprite.png:12')
})

test('sprite upload batch accepts uppercase png and ignores entries without files', () => {
  const batch = createSpriteUploadBatch([
    null,
    uploadFile('HERO.PNG', 20),
    uploadFile('index.json', 5),
  ])

  assert.deepEqual(batch?.files.map((file) => file.name), ['HERO.PNG', 'index.json'])
  assert.equal(batch?.batchKey, 'HERO.PNG:20|index.json:5')
})
