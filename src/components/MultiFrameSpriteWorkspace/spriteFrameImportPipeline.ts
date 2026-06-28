import { loadImage } from './browserImagePipeline'
import { DEFAULT_MATTE } from './spriteMattePipeline'
import type { MatteDefaults } from './matteModel'
import type { FrameItem, MatteImportGroupKind } from './types'

export interface FrameImportGroupInput {
  id: string
  name: string
  kind: MatteImportGroupKind
}

export function createWorkspaceId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `mf-${Date.now()}-${Math.random()}`
}

export async function makeFrameFromFile(file: File, defaults: MatteDefaults, group: FrameImportGroupInput): Promise<FrameItem> {
  const sourceUrl = URL.createObjectURL(file)
  const img = await loadImage(sourceUrl)
  return {
    id: createWorkspaceId(),
    file,
    sourceName: file.name,
    matteGroupId: group.id,
    matteGroupName: group.name,
    matteGroupKind: group.kind,
    sourceUrl,
    sourceWidth: img.naturalWidth,
    sourceHeight: img.naturalHeight,
    matte: {
      ...DEFAULT_MATTE,
      tolerance: defaults.tolerance,
      smoothness: defaults.smoothness,
      spill: defaults.spill,
      erosion: defaults.erosion,
      spillColorMode: defaults.spillColorMode,
      customSpillHex: defaults.customSpillHex,
    },
    matteUrl: null,
    matteWidth: img.naturalWidth,
    matteHeight: img.naturalHeight,
    matteRevision: 0,
    layout: {
      width: img.naturalWidth,
      height: img.naturalHeight,
      keepAspect: true,
      offsetX: 0,
      offsetY: 0,
    },
    composedUrl: null,
    composedRevision: 0,
    processing: false,
    hidden: false,
  }
}
