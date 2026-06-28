import {
  exportStoryboardReference,
  getStoryboardLinkedCharacterIds,
  storyboardReferenceFileName,
  type CharacterProfile,
  type PersonalSpaceAsset,
  type PersonalSpaceState,
  type StoryboardReferenceExport,
} from './personalSpaceModel'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import {
  addAssetsToZip,
  sanitizeZipPart,
  type ProjectResourceReadOptions,
  type StoryboardAssetManifestEntry,
} from './personalSpaceStoryboardZipResources'

export interface StoryboardZipFile {
  fileName: string
  zipBlob: Blob
}

function storyboardZipBaseName(name: string) {
  return storyboardReferenceFileName(name).replace(/\.json$/, '')
}

function findStoryboardPortraitAssets(state: PersonalSpaceState, character: CharacterProfile) {
  return character.portraitAssets
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((link) => {
      const asset = state.assets.find((item) => item.id === link.assetId)
      return asset ? [asset] : []
    })
}

function collectStoryboardReferenceAssets(state: PersonalSpaceState, exported: StoryboardReferenceExport) {
  const includedAssets = new Map<string, PersonalSpaceAsset>()
  exported.voiceAssets.forEach((asset) => includedAssets.set(asset.id, asset))
  exported.characters
    .flatMap((character) => [...character.portraitAssetIds, ...character.spriteAssetIds, ...character.voiceAssetIds])
    .forEach((assetId) => {
      const asset = state.assets.find((item) => item.id === assetId)
      if (asset) includedAssets.set(asset.id, asset)
    })
  return Array.from(includedAssets.values())
}

function collectStoryboardVoiceAssets(_state: PersonalSpaceState, exported: StoryboardReferenceExport) {
  const includedAssets = new Map<string, PersonalSpaceAsset>()
  exported.voiceAssets.forEach((asset) => includedAssets.set(asset.id, asset))
  return Array.from(includedAssets.values())
}

function collectStoryboardCharacterPortraitAssets(state: PersonalSpaceState, characters: CharacterProfile[]) {
  const includedAssets = new Map<string, PersonalSpaceAsset>()
  characters.forEach((character) => {
    findStoryboardPortraitAssets(state, character).forEach((asset) => includedAssets.set(asset.id, asset))
  })
  return Array.from(includedAssets.values())
}

export async function buildStoryboardZip(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardZipFile> {
  const exported = exportStoryboardReference(state, storyboardId)
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('storyboard.json', JSON.stringify(exported, null, 2))
  const manifest = await addAssetsToZip(zip, collectStoryboardReferenceAssets(state, exported), 'assets', directoryHandle, options)
  zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
  return {
    fileName: `${storyboardZipBaseName(exported.group.name)}.zip`,
    zipBlob: await zip.generateAsync({ type: 'blob' }),
  }
}

export async function buildStoryboardVoiceAssetsZip(
  state: PersonalSpaceState,
  storyboardIds: string[],
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardZipFile> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const exports = storyboardIds.map((id) => exportStoryboardReference(state, id))
  const manifest: StoryboardAssetManifestEntry[] = []
  if (exports.length === 1) {
    const exported = exports[0]!
    zip.file('storyboard.json', JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardVoiceAssets(state, exported), 'voices', directoryHandle, options))
    zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
    return {
      fileName: `${storyboardZipBaseName(exported.group.name)}-配音资产.zip`,
      zipBlob: await zip.generateAsync({ type: 'blob' }),
    }
  }

  zip.file('storyboards.json', JSON.stringify(exports, null, 2))
  for (const exported of exports) {
    const folderName = `storyboards/${sanitizeZipPart(exported.group.name)}-${sanitizeZipPart(exported.group.id)}`
    zip.file(`${folderName}/storyboard.json`, JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardVoiceAssets(state, exported), `${folderName}/voices`, directoryHandle, options))
  }
  zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
  return {
    fileName: 'storyboards-all-配音资产.zip',
    zipBlob: await zip.generateAsync({ type: 'blob' }),
  }
}

export async function buildStoryboardCharacterAssetsZip(
  state: PersonalSpaceState,
  storyboardIds: string[],
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardZipFile> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const groupCharacterExports = storyboardIds.map((storyboardId) => {
    const exported = exportStoryboardReference(state, storyboardId)
    const characterIds = getStoryboardLinkedCharacterIds(state, storyboardId)
    const characters = characterIds
      .map((characterId) => state.characters.find((character) => character.id === characterId))
      .filter((character): character is CharacterProfile => Boolean(character))
    return { group: exported.group, characters }
  })
  const manifest: StoryboardAssetManifestEntry[] = []

  if (groupCharacterExports.length === 1) {
    const exported = groupCharacterExports[0]!
    zip.file('characters.json', JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardCharacterPortraitAssets(state, exported.characters), 'portraits', directoryHandle, options))
    zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
    return {
      fileName: `${storyboardZipBaseName(exported.group.name)}-关联角色资产.zip`,
      zipBlob: await zip.generateAsync({ type: 'blob' }),
    }
  }

  zip.file('storyboard-characters.json', JSON.stringify(groupCharacterExports, null, 2))
  for (const exported of groupCharacterExports) {
    const folderName = `storyboards/${sanitizeZipPart(exported.group.name)}-${sanitizeZipPart(exported.group.id)}`
    zip.file(`${folderName}/characters.json`, JSON.stringify(exported, null, 2))
    manifest.push(...await addAssetsToZip(zip, collectStoryboardCharacterPortraitAssets(state, exported.characters), `${folderName}/portraits`, directoryHandle, options))
  }
  zip.file('asset-manifest.json', JSON.stringify(manifest, null, 2))
  return {
    fileName: 'storyboards-all-关联角色资产.zip',
    zipBlob: await zip.generateAsync({ type: 'blob' }),
  }
}
