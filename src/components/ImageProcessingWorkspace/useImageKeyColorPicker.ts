import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'

import {
  mapPreviewPointToImagePixel,
  type Point,
  type PreviewRect,
} from './imageProcessingModel'
import {
  sampleSourceImagePixel,
  type LoadedImageDraft,
} from './imageProcessingPipeline'
import type { MatteParams } from '../MultiFrameSpriteWorkspace/types'

interface UseImageKeyColorPickerOptions {
  draft: LoadedImageDraft | null
  setMatte: Dispatch<SetStateAction<MatteParams>>
}

export function useImageKeyColorPicker({ draft, setMatte }: UseImageKeyColorPickerOptions) {
  const pickKeyColorFromSource = useCallback(async (point: Point, previewRect: PreviewRect) => {
    if (!draft) return
    try {
      const imagePoint = mapPreviewPointToImagePixel(point, previewRect, { width: draft.width, height: draft.height })
      const keyColor = await sampleSourceImagePixel(draft.sourceUrl, imagePoint)
      setMatte((current) => ({ ...current, keyColor }))
      message.success(`已取色：rgb(${keyColor.join(', ')})`)
    } catch (error) {
      message.error(`取色失败：${String(error)}`)
    }
  }, [draft, setMatte])

  return { pickKeyColorFromSource }
}
