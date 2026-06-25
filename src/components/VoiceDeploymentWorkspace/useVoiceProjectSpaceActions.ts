import { useCallback, useState } from 'react'

import {
  addCharacterProfile,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import {
  readCurrentProjectSpaceState,
} from '../PersonalSpaceWorkspace/projectSpaceState'
import { persistCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/currentProjectSpacePersistence'
import {
  showCurrentProjectSpaceSyncWarning,
  type ProjectSpaceWarningMessageApi,
} from '../PersonalSpaceWorkspace/projectSpacePersistenceMessages'
import {
  personalSpaceDirectoryRequiredMessage,
  usePersonalSpaceDirectoryAuthorization,
} from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'
import type { VoiceGenerationRecord } from './voiceDeploymentModel'
import {
  collectVoiceRecordToPersonalSpace,
  type VoiceCollectLinkTarget,
} from './voicePersonalSpaceCollector'

interface VoiceProjectSpaceMessageApi extends ProjectSpaceWarningMessageApi {
  success(content: string): unknown
  error(content: string): unknown
}

function collectLinkLabel(target?: VoiceCollectLinkTarget) {
  if (target === 'character') return '并关联角色'
  if (target === 'effect') return '并关联特效'
  if (target === 'storyboard') return '并关联剧情'
  return ''
}

export function useVoiceProjectSpaceActions(messageApi: VoiceProjectSpaceMessageApi) {
  const [personalSpaceSnapshot, setPersonalSpaceSnapshot] = useState(() => readCurrentProjectSpaceState())
  const [selectedVoiceCharacterId, setSelectedVoiceCharacterId] = useState<string | null>(null)
  const {
    personalSpaceCollectEnabled,
    personalSpaceCollectDisabledReason,
  } = usePersonalSpaceDirectoryAuthorization()

  const personalSpaceVoiceAssets = personalSpaceSnapshot.assets.filter((asset) => asset.kind === 'voice')
  const selectedVoiceCharacterName = personalSpaceSnapshot.characters.find((character) => character.id === selectedVoiceCharacterId)?.name ?? ''
  const characterLinkOptions = personalSpaceSnapshot.characters.map((character) => ({ label: character.name, value: character.id }))
  const effectLinkOptions = personalSpaceSnapshot.assets
    .filter((asset) => asset.assetSubtype === 'effect')
    .map((asset) => ({ label: asset.name, value: asset.id }))
  const storyboardLinkOptions = personalSpaceSnapshot.storyboardGroups.map((group) => ({ label: group.name, value: group.id }))

  const refreshPersonalSpaceSnapshot = useCallback(() => {
    setPersonalSpaceSnapshot(readCurrentProjectSpaceState())
  }, [])

  const createVoiceCharacter = useCallback(async (name: string) => {
    const nextSpace = addCharacterProfile(personalSpaceSnapshot, name)
    const createdCharacter = nextSpace.characters[nextSpace.characters.length - 1]
    const persistence = await persistCurrentProjectSpaceState(nextSpace)
    if (persistence.syncError) {
      showCurrentProjectSpaceSyncWarning(messageApi, persistence.syncError)
    }
    setPersonalSpaceSnapshot(nextSpace)
    setSelectedVoiceCharacterId(createdCharacter?.id ?? null)
    void messageApi.success(`已创建角色：${createdCharacter?.name ?? name.trim()}`)
  }, [messageApi, personalSpaceSnapshot])

  const collectRecordToPersonalSpace = useCallback(async (
    record: VoiceGenerationRecord,
    link?: { target: VoiceCollectLinkTarget; targetId: string },
  ) => {
    try {
      const nextSpace = await collectVoiceRecordToPersonalSpace(record, link, {
        onSyncError: (error) => {
          showCurrentProjectSpaceSyncWarning(messageApi, error)
        },
      })
      setPersonalSpaceSnapshot(nextSpace)
      void messageApi.success(`已收藏到项目空间${collectLinkLabel(link?.target)}`)
    } catch (error) {
      const reason = error instanceof Error && error.message === personalSpaceDirectoryRequiredMessage
        ? error.message
        : '收藏到项目空间失败，请检查浏览器存储权限。'
      void messageApi.error(reason)
    }
  }, [messageApi])

  return {
    personalSpaceSnapshot,
    personalSpaceVoiceAssets,
    selectedVoiceCharacterId,
    selectedVoiceCharacterName,
    setSelectedVoiceCharacterId,
    characterLinkOptions,
    effectLinkOptions,
    storyboardLinkOptions,
    personalSpaceCollectEnabled,
    personalSpaceCollectDisabledReason,
    createVoiceCharacter,
    collectRecordToPersonalSpace,
    refreshPersonalSpaceSnapshot,
  }
}
