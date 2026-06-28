import { createPersonalSpaceAsset } from '../PersonalSpaceWorkspace/personalSpaceModel'

type MemoryDirectoryWriter = {
  writeText: (relativePath: string, value: string) => Promise<void>
}

type VoiceAssetOptions = {
  dialogueText?: string
  resourcePaths?: string[]
  storageResourcePaths?: string[]
}

export async function writeSpriteAndVoiceFiles(directory: MemoryDirectoryWriter) {
  await directory.writeText('精灵图/2026-06-23/walk.png', 'sprite-bytes')
  await directory.writeText('精灵图/2026-06-23/index.json', '{"frames":[]}')
  await directory.writeText('配音/2026-06-23/welcome.wav', 'voice-bytes')
}

export function createSyncSpriteAsset() {
  return {
    ...createPersonalSpaceAsset({
      kind: 'sprite',
      assetSubtype: 'character_sprite',
      name: '行走',
      resourcePaths: ['blob:expired-sprite', 'blob:expired-index'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: [
      'ProjectRoot/精灵图/2026-06-23/walk.png',
      'ProjectRoot/精灵图/2026-06-23/index.json',
    ],
  }
}

export function createSyncVoiceAsset(options: VoiceAssetOptions = {}) {
  return {
    ...createPersonalSpaceAsset({
      kind: 'voice',
      assetSubtype: 'character_voice',
      name: '欢迎',
      dialogueText: options.dialogueText,
      resourcePaths: options.resourcePaths ?? ['blob:expired-voice'],
    }),
    createdAt: '2026-06-23T00:00:00.000Z',
    storageResourcePaths: options.storageResourcePaths ?? ['ProjectRoot/配音/2026-06-23/welcome.wav'],
  }
}
