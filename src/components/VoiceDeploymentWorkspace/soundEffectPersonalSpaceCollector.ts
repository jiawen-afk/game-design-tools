import type { SoundEffectRecord } from './soundEffectModel'
import {
  collectPersonalSpaceAsset,
  createSoundAssetFromRecord,
  linkSoundAssetToSprite,
  type PersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  readCurrentProjectSpaceState,
} from '../PersonalSpaceWorkspace/projectSpaceState'
import { persistCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/currentProjectSpacePersistence'
import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
  type PersonalSpaceDirectoryHandleStore,
  writeAssetResourcesToDirectory,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'

export type SoundCollectLinkTarget = 'sprite'

export interface SoundCollectLink {
  target: SoundCollectLinkTarget
  targetId: string
}

export interface CollectSoundEffectRecordOptions {
  directoryHandleStore?: PersonalSpaceDirectoryHandleStore | null
  readBlob?: (record: SoundEffectRecord) => Promise<Blob>
  onSyncError?: (error: unknown) => void
}

export function soundResourceFileName(record: SoundEffectRecord) {
  const fromPath = record.audioPath?.split(/[\\/]/).pop()?.trim()
  if (fromPath) return fromPath
  const fromUrl = record.audioUrl.split('/').pop()?.split('?')[0]?.split('#')[0]?.trim()
  return fromUrl || 'sound.wav'
}

async function readSoundRecordBlob(record: SoundEffectRecord) {
  const source = record.audioUrl || record.audioPath
  if (!source) throw new Error('音效记录没有可读取的音频资源')
  const response = await fetch(source)
  if (!response.ok) throw new Error(`读取音效资源失败：${response.status}`)
  return response.blob()
}

async function getAuthorizedDirectoryHandle(options?: CollectSoundEffectRecordOptions) {
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

export async function collectSoundEffectRecordToPersonalSpace(
  record: SoundEffectRecord,
  link?: SoundCollectLink,
  options?: CollectSoundEffectRecordOptions,
): Promise<PersonalSpaceState> {
  let space = readCurrentProjectSpaceState()
  const baseAsset = createSoundAssetFromRecord({
    ...record,
    sourceKey: `sound-record:${record.id}`,
  })
  const directoryHandle = await getAuthorizedDirectoryHandle(options)
  if (!directoryHandle) {
    throw new Error(personalSpaceDirectoryRequiredMessage)
  }
  if (!space.settings.storageDirectory) {
    space = {
      ...space,
      settings: { ...space.settings, storageDirectory: directoryHandle.name },
    }
  }

  const blob = await (options?.readBlob ?? readSoundRecordBlob)(record)
  const asset = await writeAssetResourcesToDirectory(directoryHandle, {
    ...baseAsset,
    resourcePaths: [playableBlobUrl(blob, baseAsset.resourcePaths[0] ?? '')],
  }, [
    { name: soundResourceFileName(record), data: blob },
  ])

  let nextSpace: PersonalSpaceState = collectPersonalSpaceAsset(space, asset)
  if (link?.target === 'sprite') {
    nextSpace = linkSoundAssetToSprite(nextSpace, asset.id, link.targetId)
  }

  const persistence = await persistCurrentProjectSpaceState(nextSpace, {
    getDirectoryHandle: () => directoryHandle,
  })
  if (persistence.syncError) {
    options?.onSyncError?.(persistence.syncError)
  }
  return nextSpace
}
