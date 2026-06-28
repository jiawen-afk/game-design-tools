import type { UniformCrop } from './cropModel'
import { MIN_VIDEO_CROP_SIZE } from './constants'
import { createWorkspaceId, makeFrameFromFile } from './imagePipeline'
import type { MatteDefaults } from './matteModel'
import { getInitialMatteFrameIds, getNextMatteGroupName } from './model'
import type { ExtractedVideoFrame, FrameItem } from './types'
import { makeCroppedVideoFrameFile } from './videoFramePipeline'

export interface AddVisibleVideoFramesToWorkspaceParams {
  visibleFrames: ExtractedVideoFrame[]
  videoCrop: UniformCrop
  frames: FrameItem[]
  matteDefaults: MatteDefaults
  appendFrames: (frames: FrameItem[]) => void
  scheduleMatte: (id: string) => void
}

export async function addVisibleVideoFramesToWorkspace({
  visibleFrames,
  videoCrop,
  frames,
  matteDefaults,
  appendFrames,
  scheduleMatte,
}: AddVisibleVideoFramesToWorkspaceParams) {
  const files = await Promise.all(
    visibleFrames.map((frame) => makeCroppedVideoFrameFile(frame, videoCrop, MIN_VIDEO_CROP_SIZE))
  )
  const existingFrameCount = frames.length
  const group = {
    id: createWorkspaceId(),
    name: getNextMatteGroupName(frames, 'video'),
    kind: 'video' as const,
  }
  const created = await Promise.all(files.map((file) => makeFrameFromFile(file, matteDefaults, group)))
  appendFrames(created)
  getInitialMatteFrameIds({
    existingFrameCount,
    createdIds: created.map((item) => item.id),
  }).forEach((id) => scheduleMatte(id))
  return created.length
}
