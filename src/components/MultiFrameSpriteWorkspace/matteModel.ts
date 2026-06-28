export {
  MATTE_PARAM_MAX,
  coerceMatteDefaults,
  computeChromaKeyAlpha,
  getSpillColorHex,
  normalizeHexColor,
  normalizePickerColor,
  resolveSpillColor,
} from './matteColorModel'
export type {
  MatteDefaults,
  SpillColorMode,
} from './matteColorModel'

export {
  buildMatteFrameGroups,
  getInitialMatteFrameIds,
  getNextMatteGroupName,
  removeMatteFrameGroup,
} from './matteGroupModel'
export type {
  InitialMatteFrameInput,
  MatteFrameGroup,
  MatteGroupFrameState,
  MatteImportGroupKind,
} from './matteGroupModel'

export {
  applyMatteParamsToAllFrames,
  applyMatteParamsToFollowingFrames,
  applyMatteParamsToFrameGroup,
} from './matteParamModel'
export type {
  ApplyMatteParamsToFollowingFramesResult,
  MatteFrameState,
  MatteGroupApplyFrameState,
  MatteParamsState,
} from './matteParamModel'

export {
  buildMatteProcessingProgress,
  dequeueNextInactiveFrameId,
  queueUniqueFrameId,
  resolvePipelineConcurrency,
} from './mattePipelineModel'
export type {
  BuildMatteProcessingProgressOptions,
  MatteProcessingFrameState,
  MatteProcessingProgress,
} from './mattePipelineModel'
