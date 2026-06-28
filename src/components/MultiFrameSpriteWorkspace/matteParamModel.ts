import type { MatteDefaults } from './matteColorModel'

export interface MatteParamsState extends MatteDefaults {
  keyColor: [number, number, number]
}

export interface MatteFrameState {
  id: string
  matte: MatteParamsState
}

export interface MatteGroupApplyFrameState extends MatteFrameState {
  matteGroupId: string
}

export interface ApplyMatteParamsToFollowingFramesResult<T> {
  frames: T[]
  recomputeIds: string[]
}

function cloneMatteParams(matte: MatteParamsState): MatteParamsState {
  return {
    ...matte,
    keyColor: [...matte.keyColor] as [number, number, number],
  }
}

export function applyMatteParamsToFollowingFrames<T extends MatteFrameState>(
  frames: T[],
  targetId: string
): ApplyMatteParamsToFollowingFramesResult<T> {
  const targetIndex = frames.findIndex((frame) => frame.id === targetId)
  if (targetIndex < 0 || targetIndex >= frames.length - 1) {
    return { frames, recomputeIds: [] }
  }

  const source = frames[targetIndex]
  const recomputeIds: string[] = []
  const next = frames.map((frame, index) => {
    if (index <= targetIndex) return frame
    recomputeIds.push(frame.id)
    return {
      ...frame,
      matte: cloneMatteParams(source.matte),
    }
  })

  return { frames: next, recomputeIds }
}

export function applyMatteParamsToAllFrames<T extends MatteFrameState>(
  frames: T[],
  sourceId: string
): ApplyMatteParamsToFollowingFramesResult<T> {
  const source = frames.find((frame) => frame.id === sourceId)
  if (!source) return { frames, recomputeIds: [] }

  const recomputeIds: string[] = []
  const next = frames.map((frame) => {
    recomputeIds.push(frame.id)
    if (frame.id === sourceId) return frame
    return {
      ...frame,
      matte: cloneMatteParams(source.matte),
    }
  })

  return { frames: next, recomputeIds }
}

export function applyMatteParamsToFrameGroup<T extends MatteGroupApplyFrameState>(
  frames: T[],
  sourceId: string
): ApplyMatteParamsToFollowingFramesResult<T> {
  const source = frames.find((frame) => frame.id === sourceId)
  if (!source) return { frames, recomputeIds: [] }

  const recomputeIds: string[] = []
  const next = frames.map((frame) => {
    if (frame.matteGroupId !== source.matteGroupId) return frame
    recomputeIds.push(frame.id)
    if (frame.id === sourceId) return frame
    return {
      ...frame,
      matte: cloneMatteParams(source.matte),
    }
  })

  return { frames: next, recomputeIds }
}
