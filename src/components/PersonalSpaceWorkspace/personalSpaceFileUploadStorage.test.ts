import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createCommonResourceAssetForUpload,
  createSpriteAssetForUpload,
  createVoiceAssetForUpload,
  writeAssetResourcesWithGeneratedCoverToDirectory,
} from './personalSpaceResourceActions'
import { createMemoryDirectoryHandle } from './personalSpaceFileStorage'
import {
  createSpriteAssetFromExport,
  defaultPersonalSpaceState,
} from './personalSpaceModel'

test('uploaded character sprite resources require png and index json, keep original asset name, and use hashed storage names', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
  }

  const files = [
    new File(['png'], 'hero.png', { type: 'image/png' }),
    new File(['{}'], 'index.json', { type: 'application/json' }),
  ]
  const stored = await createSpriteAssetForUpload(state, files, root)

  assert.equal(stored.kind, 'sprite')
  assert.equal(stored.name, 'hero.png')
  assert.equal(stored.groupName, '默认分组')
  assert.equal(stored.storageResourcePaths.length, files.length)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.png$/)
  assert.match(stored.storageResourcePaths[1]!, /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.json$/)
  assert.doesNotMatch(stored.storageResourcePaths.join('\n'), /hero\.png|index\.json/)
  assert.equal(await root.readText(stored.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), await files[0]!.text())
  assert.equal(await root.readText(stored.storageResourcePaths[1]!.replace(/^PersonalSpace\//, '')), await files[1]!.text())
  await assert.rejects(
    () => createSpriteAssetForUpload(state, [new File(['{}'], 'index.json')], null),
    /请选择一个 PNG 精灵图和一个 index\.json/,
  )
})

test('uploaded image resources generate an independent cover file for list previews', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
  }
  const file = new File(['image'], 'forest.png', { type: 'image/png' })

  const stored = await createCommonResourceAssetForUpload(state, 'image', file, root, '地图', {
    createCover: async () => ({
      name: 'forest-cover.png',
      data: new Blob(['cover'], { type: 'image/png' }),
      resourcePath: 'blob:forest-cover',
    }),
  })

  assert.equal(stored.kind, 'image')
  assert.equal(stored.coverResourcePath, 'blob:forest-cover')
  assert.equal(stored.storageResourcePaths.length, 1)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/图片\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.png$/)
  assert.match(stored.coverStorageResourcePath ?? '', /^PersonalSpace\/图片\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.png$/)
  assert.notEqual(stored.coverStorageResourcePath, stored.storageResourcePaths[0])
  assert.equal(await root.readText(stored.coverStorageResourcePath!.replace(/^PersonalSpace\//, '')), 'cover')
})

test('uploaded sprite resources keep png and index resource order while adding a cover file', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
  }
  const files = [
    new File(['png'], 'hero.png', { type: 'image/png' }),
    new File(['{}'], 'index.json', { type: 'application/json' }),
  ]

  const stored = await createSpriteAssetForUpload(state, files, root, undefined, {
    createCover: async () => ({
      name: 'hero-cover.png',
      data: new Blob(['sprite-cover'], { type: 'image/png' }),
      resourcePath: 'blob:hero-cover',
    }),
  })

  assert.equal(stored.kind, 'sprite')
  assert.equal(stored.coverResourcePath, 'blob:hero-cover')
  assert.equal(stored.storageResourcePaths.length, 2)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.png$/)
  assert.match(stored.storageResourcePaths[1]!, /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.json$/)
  assert.match(stored.coverStorageResourcePath ?? '', /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.png$/)
  assert.equal(await root.readText(stored.coverStorageResourcePath!.replace(/^PersonalSpace\//, '')), 'sprite-cover')
})

test('generated image resources can be written with an independent generated cover', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
  }
  const asset = createSpriteAssetFromExport({
    name: 'generated-sprite.png',
    spritePath: 'blob:generated-sprite',
    indexPath: 'blob:generated-index',
  })
  const sourceFile = new File(['generated-png'], 'generated-sprite.png', { type: 'image/png' })

  const stored = await writeAssetResourcesWithGeneratedCoverToDirectory(
    state,
    root,
    asset,
    sourceFile,
    [
      { name: 'generated-sprite.png', data: sourceFile },
      { name: 'index.json', data: new Blob(['{}'], { type: 'application/json' }) },
    ],
    {
      createCover: async () => ({
        name: 'generated-cover.png',
        data: new Blob(['generated-cover'], { type: 'image/png' }),
        resourcePath: 'blob:generated-cover',
      }),
    },
  )

  assert.equal(stored.coverResourcePath, 'blob:generated-cover')
  assert.equal(stored.storageResourcePaths.length, 2)
  assert.match(stored.coverStorageResourcePath ?? '', /^PersonalSpace\/精灵图\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.png$/)
  assert.notEqual(stored.coverStorageResourcePath, stored.storageResourcePaths[0])
  assert.equal(await root.readText(stored.coverStorageResourcePath!.replace(/^PersonalSpace\//, '')), 'generated-cover')
})

test('uploaded character voice resources keep original file names and use voice storage folders', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  const state = {
    ...defaultPersonalSpaceState,
    settings: { storageDirectory: 'D:\\GameAssets', deleteResourcesWithContent: false },
  }

  const file = new File(['voice'], 'merchant-hello.wav', { type: 'audio/wav' })
  const stored = await createVoiceAssetForUpload(state, file, root)

  assert.equal(stored.kind, 'voice')
  assert.equal(stored.name, 'merchant-hello.wav')
  assert.equal(stored.groupName, '默认分组')
  assert.equal(stored.assetSubtype, 'character_voice')
  assert.equal('tags' in stored, false)
  assert.equal(stored.storageResourcePaths.length, [file].length)
  assert.match(stored.storageResourcePaths[0]!, /^PersonalSpace\/配音\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{16}\.wav$/)
  assert.doesNotMatch(stored.storageResourcePaths[0]!, /merchant-hello/)
  assert.equal(await root.readText(stored.storageResourcePaths[0]!.replace(/^PersonalSpace\//, '')), await file.text())
})
