import test from 'node:test'
import assert from 'node:assert/strict'

import {
  consumeSpriteUploadBatch,
  createNullableSpriteUploadBatchTracker,
  createRecordSpriteUploadBatchTracker,
  createSpriteUploadBatch,
} from './personalSpaceUploadModel'
import type { UploadFileEntry } from './personalSpaceUploadModel'

function uploadFile(name: string, size: number) {
  return { name, size } as File
}

test('sprite upload batch requires one png or webp and index json', () => {
  assert.equal(createSpriteUploadBatch([uploadFile('sprite.png', 12)]), null)
  assert.equal(createSpriteUploadBatch([uploadFile('sprite.webp', 12)]), null)
  assert.equal(createSpriteUploadBatch([uploadFile('index.json', 8)]), null)

  const batch = createSpriteUploadBatch([
    uploadFile('sprite.webp', 12),
    uploadFile('index.json', 8),
  ])

  assert.deepEqual(batch?.files.map((file) => file.name), ['sprite.webp', 'index.json'])
  assert.equal(batch?.batchKey, 'index.json:8|sprite.webp:12')
})

test('sprite upload batch accepts uppercase sprite image extensions and ignores entries without files', () => {
  const batch = createSpriteUploadBatch([
    null,
    uploadFile('HERO.WEBP', 20),
    uploadFile('index.json', 5),
  ])

  assert.deepEqual(batch?.files.map((file) => file.name), ['HERO.WEBP', 'index.json'])
  assert.equal(batch?.batchKey, 'HERO.WEBP:20|index.json:5')
})

test('sprite upload batch unwraps upload file entries before reading object URLs', () => {
  const spriteFile = uploadFile('sprite.png', 12)
  const indexFile = uploadFile('index.json', 8)
  const batch = createSpriteUploadBatch([
    {
      name: 'wrapped-sprite.png',
      size: 999,
      originFileObj: spriteFile,
    } as UploadFileEntry,
    {
      name: 'wrapped-index.json',
      size: 888,
      originFileObj: indexFile,
    } as UploadFileEntry,
  ])

  assert.equal(batch?.files[0], spriteFile)
  assert.equal(batch?.files[1], indexFile)
  assert.equal(batch?.batchKey, 'index.json:8|sprite.png:12')
})

test('sprite upload batch consumer ignores repeated batches until cleared', () => {
  const firstBatch = createSpriteUploadBatch([
    uploadFile('sprite.png', 12),
    uploadFile('index.json', 8),
  ])
  const secondBatch = createSpriteUploadBatch([
    uploadFile('alternate.png', 16),
    uploadFile('index.json', 8),
  ])
  const consumedKeys = { current: '' }

  assert.equal(consumeSpriteUploadBatch(firstBatch, consumedKeys)?.batchKey, firstBatch?.batchKey)
  assert.equal(consumeSpriteUploadBatch(firstBatch, consumedKeys), null)
  assert.equal(consumeSpriteUploadBatch(secondBatch, consumedKeys)?.batchKey, secondBatch?.batchKey)

  consumedKeys.current = ''
  assert.equal(consumeSpriteUploadBatch(firstBatch, consumedKeys)?.batchKey, firstBatch?.batchKey)
})

test('sprite upload batch tracker adapters clear record and nullable refs consistently', () => {
  const recordRef = { current: { hero: 'old-batch' } }
  const recordTracker = createRecordSpriteUploadBatchTracker(recordRef, 'hero')

  assert.equal(recordTracker.current, 'old-batch')
  recordTracker.current = 'next-batch'
  assert.deepEqual(recordRef.current, { hero: 'next-batch' })
  recordTracker.current = ''
  assert.deepEqual(recordRef.current, {})
  assert.equal(recordTracker.current, '')

  const nullableRef = { current: null as string | null }
  const nullableTracker = createNullableSpriteUploadBatchTracker(nullableRef)

  assert.equal(nullableTracker.current, '')
  nullableTracker.current = 'image-batch'
  assert.equal(nullableRef.current, 'image-batch')
  nullableTracker.current = ''
  assert.equal(nullableRef.current, null)
})
