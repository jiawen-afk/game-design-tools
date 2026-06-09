import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import {
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  collectPersonalSpaceAsset,
  createVoiceAssetFromRecord,
  linkEffectAssetToVoice,
  readPersonalSpaceState,
  writePersonalSpaceState,
  type PersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
  type PersonalSpaceDirectoryHandleStore,
  writeAssetResourcesToDirectory,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'

export type VoiceCollectLinkTarget = 'character' | 'effect' | 'storyboard'

export interface VoiceCollectLink {
  target: VoiceCollectLinkTarget
  targetId: string
}

export interface CollectVoiceRecordOptions {
  directoryHandleStore?: PersonalSpaceDirectoryHandleStore | null
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

async function getAuthorizedDirectoryHandle(options?: CollectVoiceRecordOptions) {
  const current = getPersonalSpaceDirectoryHandle()
  if (current) return current
  const persisted = await loadPersistedPersonalSpaceDirectoryHandle(options?.directoryHandleStore)
  if (persisted) setPersonalSpaceDirectoryHandle(persisted)
  return persisted
}

function playableBlobUrl(blob: Blob, fallback: string) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return fallback
  return URL.createObjectURL(blob)
}

export async function collectVoiceRecordToPersonalSpace(
  record: VoiceGenerationRecord,
  link?: VoiceCollectLink,
  options?: CollectVoiceRecordOptions,
): Promise<PersonalSpaceState> {
  let space = readPersonalSpaceState()
  const baseAsset = createVoiceAssetFromRecord({
    ...record,
    dialogueText: record.params.text,
    sourceKey: `voice-record:${record.id}`,
  })
  const directoryHandle = await getAuthorizedDirectoryHandle(options)
  if (!directoryHandle) {
    throw new Error(personalSpaceDirectoryRequiredMessage)
  }
  if (directoryHandle && !space.settings.storageDirectory) {
    space = {
      ...space,
      settings: { ...space.settings, storageDirectory: directoryHandle.name },
    }
  }
  const blob = await readVoiceRecordBlob(record)
  const asset = await writeAssetResourcesToDirectory(directoryHandle, {
    ...baseAsset,
    resourcePaths: [playableBlobUrl(blob, baseAsset.resourcePaths[0] ?? '')],
  }, [
    { name: voiceResourceFileName(record), data: blob },
  ])

  let nextSpace: PersonalSpaceState = collectPersonalSpaceAsset(space, asset)
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
