import {
  archiveAssetForStorageDirectory,
  createPortraitAssetFromUpload,
  createResourceAssetFromUpload,
  deletePersonalSpaceAsset,
  exportStoryboardReference,
  storyboardReferenceFileName,
  type CommonAssetKind,
  type PersonalSpaceAsset,
  type PersonalSpaceState,
} from './personalSpaceModel'
import {
  deleteStoredResourceFiles,
  type PersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
  writeJsonFileToDirectory,
} from './personalSpaceFileStorage'

export interface StoryboardExportResult {
  kind: 'directory' | 'download'
  path?: string
}

export interface AssetDeleteResult {
  attemptedResourceDeletion: boolean
  pendingDeletedPaths: string[]
  resourcesDeleted: boolean
}

function supportsDirectoryPicker() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

function downloadJsonFile(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export async function pickPersonalSpaceDirectory() {
  if (!supportsDirectoryPicker()) return null
  const picker = window as unknown as Window & {
    showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
  }
  return (await picker.showDirectoryPicker({ mode: 'readwrite' })) as PersonalSpaceDirectoryHandle
}

export async function exportStoryboardAssetToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<StoryboardExportResult> {
  const exported = exportStoryboardReference(state, storyboardId)
  const fileName = storyboardReferenceFileName(exported.group.name)
  if (directoryHandle) {
    const path = await writeJsonFileToDirectory(directoryHandle, ['剧情编排资产'], fileName, exported)
    return { kind: 'directory', path }
  }
  downloadJsonFile(fileName, exported)
  return { kind: 'download' }
}

export async function createPortraitAssetForUpload(
  state: PersonalSpaceState,
  file: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<PersonalSpaceAsset> {
  const objectUrl = URL.createObjectURL(file)
  const baseAsset = createPortraitAssetFromUpload({
    name: file.name,
    portraitPath: objectUrl,
  })
  const storedAsset = directoryHandle
    ? await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [{ name: file.name || 'portrait.png', data: file }])
    : archiveAssetForStorageDirectory(state, baseAsset)
  return storedAsset
}

export async function createCommonResourceAssetForUpload(
  state: PersonalSpaceState,
  kind: CommonAssetKind,
  file: File,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<PersonalSpaceAsset> {
  const objectUrl = URL.createObjectURL(file)
  const baseAsset = createResourceAssetFromUpload({
    kind,
    name: file.name,
    resourcePath: objectUrl,
  })
  const storedAsset = directoryHandle
    ? await writeAssetResourcesToDirectory(directoryHandle, baseAsset, [{ name: file.name, data: file }])
    : archiveAssetForStorageDirectory(state, baseAsset)
  return storedAsset
}

export async function deleteAssetWithOptionalResources(
  state: PersonalSpaceState,
  assetId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
): Promise<AssetDeleteResult> {
  const asset = state.assets.find((item) => item.id === assetId)
  if (!state.settings.deleteResourcesWithContent || !asset?.storageResourcePaths.length || !directoryHandle) {
    return {
      attemptedResourceDeletion: false,
      pendingDeletedPaths: [],
      resourcesDeleted: false,
    }
  }

  const cleanup = await deleteStoredResourceFiles(directoryHandle, asset.storageResourcePaths)
  return {
    attemptedResourceDeletion: true,
    pendingDeletedPaths: cleanup.pendingPaths,
    resourcesDeleted: cleanup.pendingPaths.length === 0,
  }
}

export function applyAssetDeleteResult(
  state: PersonalSpaceState,
  assetId: string,
  result: AssetDeleteResult,
): PersonalSpaceState {
  const deleted = deletePersonalSpaceAsset(state, assetId, {
    resourcesDeleted: result.attemptedResourceDeletion ? result.resourcesDeleted : false,
  })
  if (!result.attemptedResourceDeletion || result.pendingDeletedPaths.length === 0) return deleted
  return {
    ...deleted,
    pendingDeletedResourcePaths: Array.from(new Set([
      ...state.pendingDeletedResourcePaths,
      ...result.pendingDeletedPaths,
    ])),
  }
}
