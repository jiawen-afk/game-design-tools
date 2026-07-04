import { useState } from 'react'

import type { PersonalResourceSectionConfig, PersonalSpaceAsset } from './personalSpaceModel'
import { useRecentStarredFilter } from './useRecentStarredFilter'

interface PersonalResourceGroupView {
  id: string
  name: string
  groupName: string
  assets: PersonalSpaceAsset[]
  starred: boolean
}

export function usePersonalResourceGroups(section: PersonalResourceSectionConfig) {
  const [selectedAssetIdsByGroup, setSelectedAssetIdsByGroup] = useState<Record<string, string[]>>({})
  const isVoiceSection = section.kind === 'voice'
  const isGroupedResourceSection = section.kind === 'image' || section.kind === 'sprite' || section.kind === 'sound' || isVoiceSection
  const defaultGroupFilter = '全部分组'
  const resourceGroups: PersonalResourceGroupView[] = section.groupNames.map((groupName) => ({
    id: groupName,
    name: groupName,
    groupName,
    assets: section.assets.filter((item) => item.groupName === groupName),
    starred: section.starredGroupNames.includes(groupName),
  }))
  const {
    selectedFilter: selectedGroup,
    setSelectedFilter: setSelectedGroup,
    onlyStarred: onlyStarredResourceGroups,
    setOnlyStarred: setOnlyStarredResourceGroups,
    filterOptions: resourceGroupOptions,
    visibleItems: visibleResourceGroups,
  } = useRecentStarredFilter({
    items: resourceGroups,
    defaultValue: defaultGroupFilter,
    defaultLabel: '最近创建的20个分组',
    getId: (group) => group.id,
    getName: (group) => group.name,
    getStarred: (group) => group.starred,
  })
  const groupAssets = section.assets.filter((item) => item.groupName === selectedGroup)
  const canDeleteGroup = section.groupNames.length > 1

  const groupSelectionKey = (groupName: string) => `${section.kind}:${groupName}`
  const selectedAssetIdsForGroup = (groupName: string) => selectedAssetIdsByGroup[groupSelectionKey(groupName)] ?? []
  const updateSelectedAssetIdsForGroup = (groupName: string, assetIds: string[]) => {
    const key = groupSelectionKey(groupName)
    setSelectedAssetIdsByGroup((current) => ({ ...current, [key]: assetIds }))
  }
  const selectedAssetIdsForAssets = (groupName: string, assets: PersonalSpaceAsset[]) => (
    selectedAssetIdsForGroup(groupName).filter((assetId) => assets.some((asset) => asset.id === assetId))
  )
  const allAssetsSelectedForGroup = (groupName: string, assets: PersonalSpaceAsset[]) => {
    const selectedAssetIds = selectedAssetIdsForAssets(groupName, assets)
    return assets.length > 0 && assets.every((asset) => selectedAssetIds.includes(asset.id))
  }
  const toggleAssetSelected = (item: PersonalSpaceAsset, checked: boolean) => {
    const selectedAssetIds = selectedAssetIdsForGroup(item.groupName)
    updateSelectedAssetIdsForGroup(item.groupName, checked
      ? Array.from(new Set(selectedAssetIds.concat(item.id)))
      : selectedAssetIds.filter((assetId) => assetId !== item.id))
  }
  const toggleGroupSelected = (groupName: string, assets: PersonalSpaceAsset[]) => {
    const selectedAssetIds = selectedAssetIdsForGroup(groupName)
    const assetIds = assets.map((asset) => asset.id)
    const allSelected = assetIds.length > 0 && assetIds.every((assetId) => selectedAssetIds.includes(assetId))
    updateSelectedAssetIdsForGroup(groupName, allSelected ? [] : assetIds)
  }
  const clearSelectedAssetIdsForGroup = (groupName: string) => {
    updateSelectedAssetIdsForGroup(groupName, [])
  }

  return {
    allAssetsSelectedForGroup,
    canDeleteGroup,
    clearSelectedAssetIdsForGroup,
    defaultGroupFilter,
    groupAssets,
    isGroupedResourceSection,
    isVoiceSection,
    onlyStarredResourceGroups,
    resourceGroupOptions,
    selectedAssetIdsForAssets,
    selectedAssetIdsForGroup,
    selectedGroup,
    setOnlyStarredResourceGroups,
    setSelectedGroup,
    toggleAssetSelected,
    toggleGroupSelected,
    visibleResourceGroups,
  }
}
