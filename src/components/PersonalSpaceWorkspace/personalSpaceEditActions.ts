import {
  addAssetGroup as addAssetGroupToState,
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  deleteAssetGroup as deleteAssetGroupFromState,
  deleteCharacterProfile,
  deleteStoryboardGroup,
  getStoryboardLinkedCharacterIds as getStoryboardLinkedCharacterIdsFromState,
  linkEffectAssetToVoice,
  moveCharacterVoice as moveCharacterVoiceInState,
  moveStoryboardVoice as moveStoryboardVoiceInState,
  renameAssetGroup as renameAssetGroupInState,
  renameCharacterProfile,
  renameStoryboardGroup,
  reorderCharacterProfile,
  reorderCharacterVoice as reorderCharacterVoiceInState,
  reorderStoryboardVoice as reorderStoryboardVoiceInState,
  toggleAssetGroupStar as toggleAssetGroupStarInState,
  toggleCharacterStar as toggleCharacterStarInState,
  toggleStoryboardStar as toggleStoryboardStarInState,
  transferAssetGroup as transferAssetGroupInState,
  unassignAssetFromCharacterColumn,
  unassignVoiceFromStoryboardGroup,
  updatePersonalSpaceAsset,
  updateStoryboardVoiceText,
  type AssetGroupKind,
  type PersonalSpaceState,
} from './personalSpaceModel'

interface PersonalSpaceEditMessageApi {
  error: (content: string) => void
}

export interface PersonalSpaceEditActionsOptions {
  messageApi: PersonalSpaceEditMessageApi
  getSpace: () => PersonalSpaceState
  setSpace: (updater: (current: PersonalSpaceState) => PersonalSpaceState) => void
}

export function createPersonalSpaceEditActions(options: PersonalSpaceEditActionsOptions) {
  const createCharacter = (name: string) => {
    options.setSpace((current) => addCharacterProfile(current, name))
  }

  const createStoryboard = (name: string) => {
    options.setSpace((current) => addStoryboardGroup(current, name))
  }

  const renameCharacter = (characterId: string, name: string) => {
    options.setSpace((current) => renameCharacterProfile(current, characterId, name))
  }

  const toggleCharacterStar = (characterId: string) => {
    options.setSpace((current) => toggleCharacterStarInState(current, characterId))
  }

  const reorderCharacter = (characterId: string, direction: 'up' | 'down') => {
    options.setSpace((current) => reorderCharacterProfile(current, characterId, direction))
  }

  const deleteCharacter = (characterId: string) => {
    options.setSpace((current) => deleteCharacterProfile(current, characterId))
  }

  const assignAsset = (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice') => {
    options.setSpace((current) => assignAssetToCharacterColumn(current, characterId, assetId, column))
  }

  const unassignAsset = (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice') => {
    options.setSpace((current) => unassignAssetFromCharacterColumn(current, characterId, assetId, column))
  }

  const reorderCharacterVoice = (characterId: string, assetId: string, direction: 'up' | 'down') => {
    options.setSpace((current) => reorderCharacterVoiceInState(current, characterId, assetId, direction))
  }

  const moveCharacterVoice = (characterId: string, draggedAssetId: string, targetAssetId: string) => {
    options.setSpace((current) => moveCharacterVoiceInState(current, characterId, draggedAssetId, targetAssetId))
  }

  const renameStoryboard = (groupId: string, name: string) => {
    options.setSpace((current) => renameStoryboardGroup(current, groupId, name))
  }

  const toggleStoryboardStar = (groupId: string) => {
    options.setSpace((current) => toggleStoryboardStarInState(current, groupId))
  }

  const deleteStoryboard = (groupId: string) => {
    options.setSpace((current) => deleteStoryboardGroup(current, groupId))
  }

  const getStoryboardLinkedCharacterIds = (groupId: string) => (
    getStoryboardLinkedCharacterIdsFromState(options.getSpace(), groupId)
  )

  const assignVoiceToStoryboard = (groupId: string, assetId: string) => {
    options.setSpace((current) => assignVoiceToStoryboardGroup(current, groupId, assetId, ''))
  }

  const unassignStoryboardVoice = (groupId: string, assetId: string) => {
    options.setSpace((current) => unassignVoiceFromStoryboardGroup(current, groupId, assetId))
  }

  const assignStoryboardVoiceCharacter = (groupId: string, assetId: string, characterId: string) => {
    options.setSpace((current) => {
      const withVoiceLink = updatePersonalSpaceAsset(current, assetId, { linkedCharacterIds: [characterId] })
      return {
        ...withVoiceLink,
        storyboardGroups: withVoiceLink.storyboardGroups.map((group) => (
          group.id === groupId
            ? { ...group, characterIds: getStoryboardLinkedCharacterIdsFromState(withVoiceLink, groupId) }
            : group
        )),
      }
    })
  }

  const updateStoryboardVoice = (groupId: string, assetId: string, text: string) => {
    options.setSpace((current) => updateStoryboardVoiceText(current, groupId, assetId, text))
  }

  const reorderStoryboardVoice = (groupId: string, assetId: string, direction: 'up' | 'down') => {
    options.setSpace((current) => reorderStoryboardVoiceInState(current, groupId, assetId, direction))
  }

  const moveStoryboardVoice = (
    groupId: string,
    draggedAssetId: string,
    targetAssetId: string,
    placement: 'before' | 'after' = 'after',
  ) => {
    options.setSpace((current) => moveStoryboardVoiceInState(current, groupId, draggedAssetId, targetAssetId, placement))
  }

  const renameAsset = (assetId: string, name: string) => {
    options.setSpace((current) => updatePersonalSpaceAsset(current, assetId, { name }))
  }

  const changeAssetGroupName = (assetId: string, groupName: string) => {
    options.setSpace((current) => updatePersonalSpaceAsset(current, assetId, { groupName }))
  }

  const changeVoiceDialogueText = (assetId: string, dialogueText: string) => {
    options.setSpace((current) => updatePersonalSpaceAsset(current, assetId, { dialogueText }))
  }

  const changeEffectVoiceLinks = (assetId: string, voiceIds: string[]) => {
    options.setSpace((current) => voiceIds.reduce(
      (next, voiceId) => linkEffectAssetToVoice(next, assetId, voiceId),
      updatePersonalSpaceAsset(current, assetId, { linkedVoiceAssetIds: [] }),
    ))
  }

  const changeVoiceCharacterLinks = (assetId: string, linkedCharacterIds: string[]) => {
    options.setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedCharacterIds }))
  }

  const changeVoiceStoryboardLinks = (assetId: string, linkedStoryboardIds: string[]) => {
    options.setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedStoryboardIds }))
  }

  const addAssetGroup = (kind: AssetGroupKind, name: string) => {
    options.setSpace((current) => addAssetGroupToState(current, kind, name))
  }

  const renameAssetGroup = (kind: AssetGroupKind, fromName: string, toName: string) => {
    options.setSpace((current) => renameAssetGroupInState(current, kind, fromName, toName))
  }

  const toggleAssetGroupStar = (kind: AssetGroupKind, name: string) => {
    options.setSpace((current) => toggleAssetGroupStarInState(current, kind, name))
  }

  const transferAssetGroup = (kind: AssetGroupKind, fromName: string, toName: string) => {
    options.setSpace((current) => transferAssetGroupInState(current, kind, fromName, toName))
  }

  const deleteAssetGroup = (
    kind: AssetGroupKind,
    name: string,
    deleteOptions: { deleteAssets?: boolean; transferToGroup?: string },
  ) => {
    try {
      options.setSpace((current) => deleteAssetGroupFromState(current, kind, name, deleteOptions))
    } catch (error) {
      void options.messageApi.error(String(error).replace(/^Error: /, ''))
    }
  }

  const setDeleteResourcesWithContent = (deleteResourcesWithContent: boolean) => {
    options.setSpace((current) => ({
      ...current,
      settings: { ...current.settings, deleteResourcesWithContent },
    }))
  }

  return {
    createCharacter,
    createStoryboard,
    renameCharacter,
    toggleCharacterStar,
    reorderCharacter,
    deleteCharacter,
    assignAsset,
    unassignAsset,
    reorderCharacterVoice,
    moveCharacterVoice,
    renameStoryboard,
    toggleStoryboardStar,
    deleteStoryboard,
    getStoryboardLinkedCharacterIds,
    assignVoiceToStoryboard,
    unassignStoryboardVoice,
    assignStoryboardVoiceCharacter,
    updateStoryboardVoice,
    reorderStoryboardVoice,
    moveStoryboardVoice,
    renameAsset,
    changeAssetGroupName,
    changeVoiceDialogueText,
    changeEffectVoiceLinks,
    changeVoiceCharacterLinks,
    changeVoiceStoryboardLinks,
    addAssetGroup,
    renameAssetGroup,
    toggleAssetGroupStar,
    transferAssetGroup,
    deleteAssetGroup,
    setDeleteResourcesWithContent,
  }
}
