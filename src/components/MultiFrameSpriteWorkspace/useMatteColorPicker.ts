import { useCallback } from 'react'
import type * as React from 'react'
import { message } from 'antd'

import { sampleFrameKeyColor } from './matteColorSampler'
import type { FrameItem, MatteParams } from './types'

interface UseMatteColorPickerOptions {
  setMatteParam: <K extends keyof MatteParams>(id: string, key: K, value: MatteParams[K]) => void
}

export function useMatteColorPicker({ setMatteParam }: UseMatteColorPickerOptions) {
  const sampleColor = useCallback(async (item: FrameItem, event: React.MouseEvent<HTMLImageElement>) => {
    try {
      const keyColor = await sampleFrameKeyColor({
        sourceUrl: item.sourceUrl,
        sourceWidth: item.sourceWidth,
        sourceHeight: item.sourceHeight,
        clientX: event.clientX,
        clientY: event.clientY,
        previewRect: event.currentTarget.getBoundingClientRect(),
      })
      setMatteParam(item.id, 'keyColor', keyColor)
    } catch (error) {
      message.error(`取色失败：${String(error)}`)
    }
  }, [setMatteParam])

  return { sampleColor }
}
