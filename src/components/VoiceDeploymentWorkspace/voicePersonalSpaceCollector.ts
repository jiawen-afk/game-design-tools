import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import {
  archiveAssetForStorageDirectory,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  createVoiceAssetFromRecord,
  linkEffectAssetToVoice,
  readPersonalSpaceState,
  writePersonalSpaceState,
  type PersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  getPersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'

export type VoiceCollectLinkTarget = 'character' | 'effect' | 'storyboard'

export interface VoiceCollectLink {
  target: VoiceCollectLinkTarget
  targetId: string
}

function voiceResourceFileName(record: VoiceGenerationRecord) {
  const fromPath = record.audioPath?.split(/[\\/]/).pop()?.trim()
  if (fromPath) return fromPath
  const fromUrl = record.audioUrl.split('/').pop()?.split('?')[0]?.trim()
  return fromUrl || 'voice.wav'
}

async function readVoiceRecordBlob(record: VoiceGenerationRecord) {
  const source = record.audioUrl || record.audioPath
  if (!source) throw new Error('配音记录没有可读取的音频资源')
  const response = await fetch(source)
  if (!response.ok) throw new Error(`读取配音资源失败：${response.status}`)
  return response.blob()
}

export async function collectVoiceRecordToPersonalSpace(
  record: VoiceGenerationRecord,
  link?: VoiceCollectLink,
): Promise<PersonalSpaceState> {
  const space = readPersonalSpaceState()
  const baseAsset = createVoiceAssetFromRecord({ ...record, dialogueText: record.params.text })
  const directoryHandle = getPersonalSpaceDirectoryHandle()
  let asset = archiveAssetForStorageDirectory(space, baseAsset)

  if (directoryHandle) {
    try {
      asset = await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [
        { name: voiceResourceFileName(record), data: await readVoiceRecordBlob(record) },
      ])
    } catch {
      asset = archiveAssetForStorageDirectory(space, baseAsset)
    }
  }

  let nextSpace: PersonalSpaceState = {
    ...space,
    assets: [asset, ...space.assets],
  }
  if (link?.target === 'character') {
    nextSpace = assignAssetToCharacterColumn(nextSpace, link.targetId, asset.id, 'voice', ['角色配音'])
  }
  if (link?.target === 'effect') {
    nextSpace = linkEffectAssetToVoice(nextSpace, link.targetId, asset.id)
  }
  if (link?.target === 'storyboard') {
    nextSpace = assignVoiceToStoryboardGroup(nextSpace, link.targetId, asset.id, record.params.text)
  }

  writePersonalSpaceState(nextSpace)
  return nextSpace
}
