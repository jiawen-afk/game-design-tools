import test from 'node:test'
import assert from 'node:assert/strict'

import {
  readProjectAssetResourceBlob,
  resolveProjectAssetResourceSource,
} from './projectAssetResourceResolver'
import { createMemoryProjectObjectStorage } from '../ProjectStorage'

test('project asset resources can be read from provider-neutral object keys', async () => {
  const storage = createMemoryProjectObjectStorage()
  await storage.putObject('objects/远程项目/audio_wav/r1.wav', new Blob(['voice'], { type: 'audio/wav' }))

  const blob = await readProjectAssetResourceBlob(
    'objects/远程项目/audio_wav/r1.wav',
    'objects/远程项目/audio_wav/r1.wav',
    { projectObjectStorage: storage },
  )

  assert.equal(blob.type, 'audio/wav')
  assert.equal(await blob.text(), 'voice')
})

test('project asset resource sources create playable object URLs from object storage', async () => {
  const previousCreateObjectUrl = URL.createObjectURL
  const previousRevokeObjectUrl = URL.revokeObjectURL
  const created: Array<Blob | MediaSource> = []
  URL.createObjectURL = (blob) => {
    created.push(blob)
    return `blob:resolved-${created.length}`
  }
  URL.revokeObjectURL = () => {}

  try {
    const storage = createMemoryProjectObjectStorage()
    await storage.putObject('objects/远程项目/image_png/r2.png', new Blob(['sprite'], { type: 'image/png' }))

    const resolved = await resolveProjectAssetResourceSource(
      'objects/远程项目/image_png/r2.png',
      'objects/远程项目/image_png/r2.png',
      { projectObjectStorage: storage },
    )

    assert.equal(resolved?.source, 'blob:resolved-1')
    assert.equal(resolved?.objectUrl, 'blob:resolved-1')
    assert.equal(await (created[0]! as Blob).text(), 'sprite')
  } finally {
    URL.createObjectURL = previousCreateObjectUrl
    URL.revokeObjectURL = previousRevokeObjectUrl
  }
})
