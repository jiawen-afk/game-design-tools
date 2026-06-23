import test from 'node:test'
import assert from 'node:assert/strict'

import { createProjectAssetFromCollection } from './projectAssetCollectionService'

test('voice collection creates character voice assets without tags', () => {
  const asset = createProjectAssetFromCollection({
    projectId: 'p1',
    kind: 'voice',
    assetSubtype: 'character_voice',
    name: '欢迎',
    fileName: 'welcome.wav',
    mimeType: 'audio/wav',
    sizeBytes: 10,
    dialogueText: '欢迎',
    sourceKey: 'voice:v1',
    now: '2026-06-23T00:00:00.000Z',
    resourceId: 'r1',
  })

  assert.equal(asset.kind, 'voice')
  assert.equal(asset.asset_subtype, 'character_voice')
  assert.equal(asset.primary_object_key, 'objects/p1/audio/r1.wav')
  assert.equal(asset.dialogue_text, '欢迎')
  assert.equal('tags_json' in asset, false)
})

test('sprite collection creates primary sprite and sprite index object fields', () => {
  const asset = createProjectAssetFromCollection({
    projectId: 'p1',
    kind: 'sprite',
    assetSubtype: 'character_sprite',
    name: '行走',
    fileName: 'sprite.png',
    mimeType: 'image/png',
    sizeBytes: 100,
    now: '2026-06-23T00:00:00.000Z',
    resourceId: 'r1',
    spriteIndex: {
      fileName: 'index.json',
      mimeType: 'application/json',
      sizeBytes: 20,
      resourceId: 'r2',
      frameWidth: 64,
      frameHeight: 64,
      sheetWidth: 256,
      sheetHeight: 256,
      fps: 8,
      frameCount: 16,
    },
  })

  assert.equal(asset.primary_object_key, 'objects/p1/image/r1.png')
  assert.equal(asset.sprite_index_object_key, 'objects/p1/application/r2.json')
  assert.equal(asset.sprite_frame_width, 64)
  assert.equal(asset.sprite_frame_count, 16)
})
