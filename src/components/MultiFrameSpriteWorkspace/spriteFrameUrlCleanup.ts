import type { FrameItem, SpriteSlicePreview } from './types'

export function revokeFrameUrls(item: FrameItem) {
  URL.revokeObjectURL(item.sourceUrl)
  if (item.matteUrl) URL.revokeObjectURL(item.matteUrl)
  if (item.composedUrl) URL.revokeObjectURL(item.composedUrl)
}

export function revokeSpriteSlicePreviews(slices: SpriteSlicePreview[]) {
  slices.forEach((slice) => URL.revokeObjectURL(slice.url))
}
