import type { CropBox, ImageExportFormat, ImageSourceLike } from './imageProcessingTypes'

export function resolveMatteImageSource(
  draft: ImageSourceLike | null,
  processed: ImageSourceLike | null,
  matteEnabled: boolean
): ImageSourceLike | null {
  return matteEnabled ? processed : draft
}

export interface UpscalePreviewInputs {
  crop: CropBox | null
  exportFormat: ImageExportFormat
  processedUrl: string | null
  upscaleOptions: {
    model: string
    scale: number
    tileSize: number
    ttaMode: boolean
  }
}

export function shouldInvalidateUpscalePreview(previous: UpscalePreviewInputs, next: UpscalePreviewInputs): boolean {
  const sameCrop = previous.crop?.x === next.crop?.x
    && previous.crop?.y === next.crop?.y
    && previous.crop?.width === next.crop?.width
    && previous.crop?.height === next.crop?.height
  const sameProcessed = previous.processedUrl === next.processedUrl
  const sameOptions = previous.upscaleOptions.model === next.upscaleOptions.model
    && previous.upscaleOptions.scale === next.upscaleOptions.scale
    && previous.upscaleOptions.tileSize === next.upscaleOptions.tileSize
    && previous.upscaleOptions.ttaMode === next.upscaleOptions.ttaMode
  return !(sameCrop && sameProcessed && sameOptions)
}
