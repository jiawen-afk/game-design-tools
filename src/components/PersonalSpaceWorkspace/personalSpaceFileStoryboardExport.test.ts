import test from 'node:test'
import assert from 'node:assert/strict'

import {
  exportAllStoryboardVoiceAssetsToTarget,
  exportStoryboardVoiceAssetsToTarget,
} from './personalSpaceResourceActions'
import {
  createMemoryDirectoryHandle,
  readStoredResourceBlob,
  writeJsonFileToDirectory,
} from './personalSpaceFileStorage'
import {
  addStoryboardGroup,
  assignVoiceToStoryboardGroup,
  createPersonalSpaceAsset,
  defaultPersonalSpaceState,
} from './personalSpaceModel'

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
