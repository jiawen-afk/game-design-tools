import { createMemoryDirectoryHandle } from './personalSpaceFileStorage'
import { createPersonalSpaceAsset } from './personalSpaceModel'

export async function createPersistedVoiceFixture() {
  const directory = createMemoryDirectoryHandle('ProjectRoot')
  await directory.writeText('配音/2026-06-25/welcome.wav', 'voice-bytes')
  const voice = {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      resourcePaths: ['blob:voice'],
    }),
    createdAt: '2026-06-25T00:00:00.000Z',
    storageResourcePaths: ['ProjectRoot/配音/2026-06-25/welcome.wav'],
  }

  return { directory, voice }
}
