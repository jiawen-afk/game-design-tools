import type { PersonalSpaceState } from './personalSpaceModel'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'
import {
  buildStoryboardCharacterAssetsZip,
  buildStoryboardVoiceAssetsZip,
  buildStoryboardZip,
} from './personalSpaceStoryboardZipBuilders'
import {
  exportZipToTarget,
  type StoryboardExportResult,
} from './personalSpaceStoryboardExportTarget'
import type { ProjectResourceReadOptions } from './personalSpaceStoryboardZipResources'

export type { StoryboardExportResult } from './personalSpaceStoryboardExportTarget'
export type { ProjectResourceReadOptions } from './personalSpaceStoryboardZipResources'

export async function exportStoryboardAssetToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardZip(state, storyboardId, directoryHandle, options), directoryHandle)
}

export async function exportStoryboardVoiceAssetsToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardVoiceAssetsZip(state, [storyboardId], directoryHandle, options), directoryHandle)
}

export async function exportStoryboardCharacterAssetsToTarget(
  state: PersonalSpaceState,
  storyboardId: string,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardCharacterAssetsZip(state, [storyboardId], directoryHandle, options), directoryHandle)
}

export async function exportAllStoryboardVoiceAssetsToTarget(
  state: PersonalSpaceState,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardVoiceAssetsZip(state, state.storyboardGroups.map((group) => group.id), directoryHandle, options), directoryHandle)
}

export async function exportAllStoryboardCharacterAssetsToTarget(
  state: PersonalSpaceState,
  directoryHandle: PersonalSpaceDirectoryHandle | null,
  options: ProjectResourceReadOptions = {},
): Promise<StoryboardExportResult> {
  return exportZipToTarget(await buildStoryboardCharacterAssetsZip(state, state.storyboardGroups.map((group) => group.id), directoryHandle, options), directoryHandle)
}
