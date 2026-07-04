import { clonePersonalSpaceState } from './personalSpaceState'
import { deletePersonalSpaceAsset } from './personalSpaceAssetOperations'
import type { AssetGroupKind, CommonAssetKind, PersonalSpaceAsset, PersonalSpaceState } from './personalSpaceModel'

export const defaultAssetGroups: Record<AssetGroupKind, string[]> = {
  image: ['默认分组'],
  sprite: ['默认分组'],
  voice: ['默认分组'],
  sound: ['默认分组'],
}

export function assetGroupKindForAsset(asset: Pick<PersonalSpaceAsset, 'kind'>): AssetGroupKind {
  if (asset.kind === 'voice') return 'voice'
  if (asset.kind === 'sprite') return 'sprite'
  if (asset.kind === 'sound') return 'sound'
  return 'image'
}

export function assetGroupKindForCommonKind(kind: CommonAssetKind): AssetGroupKind {
  if (kind === 'voice') return 'voice'
  if (kind === 'sprite') return 'sprite'
  if (kind === 'sound') return 'sound'
  return 'image'
}

function cleanGroupName(name: string) {
  return name.trim() || '默认分组'
}

function uniqueGroups(groups: string[]) {
  const clean = groups.map(cleanGroupName).filter(Boolean)
  return Array.from(new Set(['默认分组', ...clean]))
}

function groupsForKind(state: PersonalSpaceState, kind: AssetGroupKind) {
  return uniqueGroups([
    ...(state.assetGroups?.[kind] ?? defaultAssetGroups[kind]),
    ...state.assets
      .filter((asset) => assetGroupKindForAsset(asset) === kind)
      .map((asset) => asset.groupName),
  ])
}

function withGroupList(state: PersonalSpaceState, kind: AssetGroupKind, groups: string[]): PersonalSpaceState {
  const nextGroups = uniqueGroups(groups)
  return {
    ...state,
    assetGroups: {
      ...defaultAssetGroups,
      ...(state.assetGroups ?? {}),
      [kind]: nextGroups,
    },
    starredAssetGroups: {
      image: [...(state.starredAssetGroups?.image ?? [])],
      sprite: [...(state.starredAssetGroups?.sprite ?? [])],
      voice: [...(state.starredAssetGroups?.voice ?? [])],
      sound: [...(state.starredAssetGroups?.sound ?? [])],
      [kind]: (state.starredAssetGroups?.[kind] ?? []).filter((groupName) => nextGroups.includes(groupName)),
    },
  }
}

export function addAssetGroup(state: PersonalSpaceState, kind: AssetGroupKind, name: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  return withGroupList(next, kind, [...groupsForKind(next, kind), name])
}

export function renameAssetGroup(state: PersonalSpaceState, kind: AssetGroupKind, fromName: string, toName: string): PersonalSpaceState {
  const from = cleanGroupName(fromName)
  const to = cleanGroupName(toName)
  const next = clonePersonalSpaceState(state)
  next.assets = next.assets.map((asset) => (
    assetGroupKindForAsset(asset) === kind && asset.groupName === from
      ? { ...asset, groupName: to }
      : asset
  ))
  next.starredAssetGroups = {
    ...next.starredAssetGroups,
    [kind]: Array.from(new Set((next.starredAssetGroups[kind] ?? []).map((group) => (group === from ? to : group)))),
  }
  return withGroupList(next, kind, groupsForKind(next, kind).map((group) => (group === from ? to : group)))
}

export function toggleAssetGroupStar(state: PersonalSpaceState, kind: AssetGroupKind, name: string): PersonalSpaceState {
  const groupName = cleanGroupName(name)
  const next = clonePersonalSpaceState(state)
  const current = next.starredAssetGroups[kind] ?? []
  next.starredAssetGroups = {
    ...next.starredAssetGroups,
    [kind]: current.includes(groupName)
      ? current.filter((item) => item !== groupName)
      : [...current, groupName],
  }
  return next
}

export function transferAssetGroup(state: PersonalSpaceState, kind: AssetGroupKind, fromName: string, toName: string): PersonalSpaceState {
  const from = cleanGroupName(fromName)
  const to = cleanGroupName(toName)
  const next = clonePersonalSpaceState(state)
  next.assets = next.assets.map((asset) => (
    assetGroupKindForAsset(asset) === kind && asset.groupName === from
      ? { ...asset, groupName: to }
      : asset
  ))
  return withGroupList(next, kind, groupsForKind(state, kind).concat(to))
}

export function deleteAssetGroup(
  state: PersonalSpaceState,
  kind: AssetGroupKind,
  name: string,
  options: { deleteAssets?: boolean; transferToGroup?: string } = {},
): PersonalSpaceState {
  const target = cleanGroupName(name)
  const groups = groupsForKind(state, kind)
  if (groups.length <= 1) throw new Error('至少保留一个分组')
  if (!groups.includes(target)) return clonePersonalSpaceState(state)

  let next = clonePersonalSpaceState(state)
  const remainingGroups = groups.filter((group) => group !== target)
  const transferTo = cleanGroupName(options.transferToGroup ?? remainingGroups[0] ?? '默认分组')

  if (options.deleteAssets) {
    const deletedIds = next.assets
      .filter((asset) => assetGroupKindForAsset(asset) === kind && asset.groupName === target)
      .map((asset) => asset.id)
    for (const assetId of deletedIds) next = deletePersonalSpaceAsset(next, assetId)
  } else {
    next.assets = next.assets.map((asset) => (
      assetGroupKindForAsset(asset) === kind && asset.groupName === target
        ? { ...asset, groupName: transferTo }
        : asset
    ))
  }

  return withGroupList(next, kind, remainingGroups)
}
