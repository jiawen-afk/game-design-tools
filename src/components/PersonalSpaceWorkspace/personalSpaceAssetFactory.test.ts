import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultVoiceGenerationParams, type VoiceGenerationRecord } from '../VoiceDeploymentWorkspace/voiceDeploymentModel'
import {
  assetKindLabel,
  createPersonalSpaceAsset,
  createPortraitAssetFromUpload,
  createResourceAssetFromUpload,
  createSpriteAssetFromExport,
  createVoiceAssetFromRecord,
} from './personalSpaceModel'
import { createDefaultImageAssetCover } from './personalSpaceAssetCoverService'
import { spriteFrameModalStyle } from './personalSpacePreviewModel'

test('default image asset covers are compact 160px webp thumbnails', async () => {
  const originalDocument = (globalThis as unknown as { document?: unknown }).document
  const originalImage = (globalThis as unknown as { Image?: unknown }).Image
  const originalCreateObjectUrl = URL.createObjectURL
  const originalRevokeObjectUrl = URL.revokeObjectURL
  const canvasCalls: Array<{ type?: string; quality?: number; width: number; height: number }> = []
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: () => {},
    }),
    toBlob: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => {
      canvasCalls.push({ type, quality, width: canvas.width, height: canvas.height })
      callback(new Blob(['cover'], { type }))
    },
  }
  class MockImage {
    naturalWidth = 800
    naturalHeight = 400
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }

  ;(globalThis as unknown as { document?: unknown }).document = {
    createElement: (tagName: string) => {
      assert.equal(tagName, 'canvas')
      return canvas
    },
  }
  ;(globalThis as unknown as { Image?: unknown }).Image = MockImage
  URL.createObjectURL = () => 'blob:cover-source'
  URL.revokeObjectURL = () => {}
  try {
    const cover = await createDefaultImageAssetCover(new File(['image'], 'hero.png', { type: 'image/png' }))

    assert.ok(cover)
    assert.equal(cover.name, 'hero-cover.webp')
    assert.equal(cover.data.type, 'image/webp')
    assert.deepEqual(canvasCalls, [{ type: 'image/webp', quality: 0.72, width: 160, height: 80 }])
  } finally {
    ;(globalThis as unknown as { document?: unknown }).document = originalDocument
    ;(globalThis as unknown as { Image?: unknown }).Image = originalImage
    URL.createObjectURL = originalCreateObjectUrl
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
})

test('creates personal space voice asset from a generated voice record', () => {
  const record: VoiceGenerationRecord = {
    id: 'voice-1',
    name: '商人问候',
    createdAt: '2026-06-05T00:00:00.000Z',
    audioUrl: 'http://127.0.0.1/audio.wav',
    audioPath: 'C:\\temp\\audio.wav',
    params: {
      ...defaultVoiceGenerationParams,
      text: '欢迎来到我的商店。',
    },
  }

  const asset = createVoiceAssetFromRecord(record)

  assert.equal(asset.kind, 'voice')
  assert.equal(asset.name, '商人问候')
  assert.equal(asset.dialogueText, '欢迎来到我的商店。')
  assert.deepEqual(asset.resourcePaths, ['http://127.0.0.1/audio.wav'])
  assert.equal(asset.assetSubtype, 'character_voice')
  assert.equal('tags' in asset, false)
})

test('creates personal space sprite asset from exported sprite files', () => {
  const asset = createSpriteAssetFromExport({
    name: '主角行走',
    spritePath: 'D:\\assets\\sprite.png',
    indexPath: 'D:\\assets\\index.json',
  })

  assert.equal(asset.kind, 'sprite')
  assert.equal(asset.name, '主角行走')
  assert.deepEqual(asset.resourcePaths, ['D:\\assets\\sprite.png', 'D:\\assets\\index.json'])
  assert.equal(asset.assetSubtype, 'character_sprite')
  assert.equal('tags' in asset, false)
})

test('sprite modal preview uses the original frame ratio instead of thumbnail scaling', () => {
  const frame = { x: 32, y: 48, w: 96, h: 128 }
  const sheet = { w: 384, h: 512 }
  const style = spriteFrameModalStyle(
    frame,
    sheet,
  )

  assert.deepEqual(style, {
    width: `${frame.w}px`,
    height: `${frame.h}px`,
    backgroundPosition: `-${frame.x}px -${frame.y}px`,
    backgroundSize: `${sheet.w}px ${sheet.h}px`,
  })
})

test('creates portrait assets from uploaded character portraits', () => {
  const asset = createPortraitAssetFromUpload({
    name: 'hero-face.png',
    portraitPath: 'blob:portrait',
  })

  assert.equal(asset.kind, 'image')
  assert.equal(asset.name, 'hero-face.png')
  assert.equal(asset.groupName, '角色肖像')
  assert.deepEqual(asset.resourcePaths, ['blob:portrait'])
  assert.equal(asset.assetSubtype, 'portrait')
  assert.equal('tags' in asset, false)
})

test('creates imported resource assets with original file names and unified kinds', () => {
  const image = createResourceAssetFromUpload({
    kind: 'image',
    name: 'forest.png',
    resourcePath: 'blob:forest',
  })
  const sprite = createResourceAssetFromUpload({
    kind: 'sprite',
    name: 'fire.webm',
    resourcePath: 'blob:fire',
    assetSubtype: 'effect_sprite',
  })
  const voice = createResourceAssetFromUpload({
    kind: 'voice',
    name: 'hello.wav',
    resourcePath: 'blob:hello',
  })

  assert.equal(image.kind, 'image')
  assert.equal(sprite.kind, 'sprite')
  assert.equal(voice.kind, 'voice')
  assert.equal(image.name, 'forest.png')
  assert.equal(sprite.name, 'fire.webm')
  assert.equal(voice.name, 'hello.wav')
  assert.equal(image.groupName, '默认分组')
  assert.equal(sprite.groupName, '默认分组')
  assert.equal(voice.groupName, '默认分组')
  assert.equal(image.assetSubtype, 'generic')
  assert.equal(sprite.assetSubtype, 'effect_sprite')
  assert.equal(voice.assetSubtype, 'character_voice')
  assert.equal('tags' in image, false)
})

test('personal space assets default to a named group', () => {
  const asset = createPersonalSpaceAsset({ kind: 'sprite', name: '火焰爆炸' })

  assert.equal(asset.groupName, '默认分组')
  assert.deepEqual(asset.linkedVoiceAssetIds, [])
})

test('personal space asset kind labels are shared by workspace workflows', () => {
  assert.equal(assetKindLabel('image'), '图片')
  assert.equal(assetKindLabel('map'), '图片')
  assert.equal(assetKindLabel('effect'), '图片')
  assert.equal(assetKindLabel('sprite'), '精灵图')
  assert.equal(assetKindLabel('voice'), '配音')
})
