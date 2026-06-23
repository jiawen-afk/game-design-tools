import test from 'node:test'
import assert from 'node:assert/strict'

import {
  exportAllStoryboardVoiceAssetsToTarget,
  exportStoryboardVoiceAssetsToTarget,
  createSpriteAssetForUpload,
  createVoiceAssetForUpload,
} from './personalSpaceResourceActions'
import {
  createMemoryDirectoryHandle,
  deleteStoredResourceFiles,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
  readStoredResourceBlob,
  writeJsonFileToDirectory,
  writeAssetResourcesToDirectory,
} from './personalSpaceFileStorage'
import {
  addStoryboardGroup,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  createPortraitAssetFromUpload,
  createSpriteAssetFromExport,
  defaultPersonalSpaceState,
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

test('deletes stored resource files and leaves missing files as pending cleanup', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  await root.writeText('配音素材/问候/audio.wav', 'voice')

  const result = await deleteStoredResourceFiles(root, [
    'PersonalSpace/配音素材/问候/audio.wav',
    'PersonalSpace/配音素材/问候/missing.wav',
  ])

  assert.deepEqual(result.deletedPaths, ['PersonalSpace/配音素材/问候/audio.wav'])
  assert.deepEqual(result.pendingPaths, ['PersonalSpace/配音素材/问候/missing.wav'])
  await assert.rejects(() => root.readText('配音素材/问候/audio.wav'))
})

test('reads stored resource blobs back from authorized directory paths', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  await root.writeText('配音/2026-06-06/audio.wav', 'voice')

  const blob = await readStoredResourceBlob(root, 'PersonalSpace/配音/2026-06-06/audio.wav')

  assert.equal(await blob.text(), 'voice')
})

test('writes storyboard reference json into the storyboard export folder', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')

  const storedPath = await writeJsonFileToDirectory(root, ['剧情编排资产'], 'storyboard-开场.json', {
    group: { name: '开场' },
  })

  assert.equal(storedPath, 'PersonalSpace/剧情编排资产/storyboard-开场.json')
  assert.equal(await root.readText('剧情编排资产/storyboard-开场.json'), JSON.stringify({ group: { name: '开场' } }, null, 2))
})

test('exports storyboard voice asset zips from stored authorized resources', async () => {
  const root = createMemoryDirectoryHandle('PersonalSpace')
  await root.writeText('配音/2026-06-06/line.wav', 'stored voice')
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      name: 'line.wav',
      resourcePaths: ['blob:expired-voice'],
    }),
    storageResourcePaths: ['PersonalSpace/配音/2026-06-06/line.wav'],
    createdAt: '2026-06-06T12:00:00.000Z',
  }
  let state = addStoryboardGroup({ ...defaultPersonalSpaceState, assets: [voice] }, '开场')
  const groupId = state.storyboardGroups[0]!.id
  state = assignVoiceToStoryboardGroup(state, groupId, voice.id, '你好')

  const groupResult = await exportStoryboardVoiceAssetsToTarget(state, groupId, root)
  const allResult = await exportAllStoryboardVoiceAssetsToTarget(state, root)
  const { default: JSZip } = await import('jszip')
  const groupZipBlob = await readStoredResourceBlob(root, groupResult.path!)
  const allZipBlob = await readStoredResourceBlob(root, allResult.path!)
  const groupZip = await JSZip.loadAsync(await groupZipBlob.arrayBuffer())
  const allZip = await JSZip.loadAsync(await allZipBlob.arrayBuffer())
  const groupVoiceEntry = Object.keys(groupZip.files).find((path) => path.startsWith('voices/voice/') && path.endsWith('.wav'))
  const allVoiceEntry = Object.keys(allZip.files).find((path) => (
    path.startsWith('voices/voice/') || path.includes('/voices/voice/')
  ) && path.endsWith('.wav'))

  assert.ok(groupVoiceEntry)
  assert.ok(allVoiceEntry)
  assert.equal(await groupZip.file(groupVoiceEntry)!.async('string'), 'stored voice')
  assert.equal(await allZip.file(allVoiceEntry)!.async('string'), 'stored voice')
})

test('persists and restores the authorized personal space directory handle', async () => {
  const handles = new Map<string, unknown>()
  const store = {
    get: async (key: string) => handles.get(key) ?? null,
    set: async (key: string, value: unknown) => { handles.set(key, value) },
  }
  const root = createMemoryDirectoryHandle('PersonalSpace')

  await persistPersonalSpaceDirectoryHandle(root, store)
  const restored = await loadPersistedPersonalSpaceDirectoryHandle(store)

  assert.equal(restored, root)
})

test('restored directory handles must allow readwrite access', async () => {
  const denied = {
    ...createMemoryDirectoryHandle('PersonalSpace'),
    queryPermission: async () => 'denied' as PermissionState,
    requestPermission: async () => 'denied' as PermissionState,
  }
  const store = {
    get: async () => denied,
    set: async () => {},
  }

  const restored = await loadPersistedPersonalSpaceDirectoryHandle(store)

  assert.equal(restored, null)
})
