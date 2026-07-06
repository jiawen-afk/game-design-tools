import { isProjectObjectKey } from '../ProjectStorage'
import type { PersonalSpaceAsset } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { assetPrimaryPreviewSource } from '../PersonalSpaceWorkspace/personalSpacePreviewSourceModel'
import { useStoredResourcePreviewSource } from '../PersonalSpaceWorkspace/useStoredResourcePreviewSource'
import type { VoiceProjectResourceReadOptions } from './useVoiceProjectResourceReadOptions'

interface ProjectSpaceAudioPlayerProps extends VoiceProjectResourceReadOptions {
  asset: PersonalSpaceAsset
  emptyText: string
}

function playableFallbackSource(asset: PersonalSpaceAsset) {
  const storedPath = asset.storageResourcePaths[0] ?? ''
  const primarySource = assetPrimaryPreviewSource(asset)
  if (isProjectObjectKey(storedPath) || isProjectObjectKey(primarySource)) return ''
  return primarySource
}

export function ProjectSpaceAudioPlayer({
  asset,
  emptyText,
  projectObjectStorage,
  projectAssetManager,
  projectId,
  projectMode,
}: ProjectSpaceAudioPlayerProps) {
  const audioSource = useStoredResourcePreviewSource(asset, 0, playableFallbackSource(asset), {
    projectObjectStorage,
    projectAssetManager,
    projectId,
    projectMode,
  })
  const hasAudioResource = Boolean(asset.storageResourcePaths[0] || asset.resourcePaths[0])

  if (!audioSource) {
    return <p className="record-text">{hasAudioResource ? '音频正在准备播放...' : emptyText}</p>
  }

  return <audio controls preload="metadata" src={audioSource} />
}
