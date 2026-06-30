import { clampUniformCrop, computeUniformCropSize, type UniformCrop } from './cropModel'
import { canvasToBlob, loadImage } from './imagePipeline'
import { buildVideoFrameTimestamps, clampVideoClipRange } from './videoModel'
import type { ContainedImageRect, CropBoxRect, ExtractedVideoFrame, VideoDraft } from './types'

export interface ExtractHtmlVideoFramesOptions {
  video: HTMLVideoElement
  draft: VideoDraft
  start: number
  end: number
  fps: number
  onProgress?: (progress: number) => void
}

export interface VideoPreviewCropState {
  imageRect: ContainedImageRect
  safeCrop: UniformCrop
  outputSize: { width: number; height: number }
  cropBox: CropBoxRect
}

export function revokeExtractedVideoFrames(frames: ExtractedVideoFrame[]) {
  frames.forEach((frame) => URL.revokeObjectURL(frame.url))
}

export function hasUniformCrop(crop: UniformCrop): boolean {
  return crop.top !== 0 || crop.bottom !== 0 || crop.left !== 0 || crop.right !== 0
}

export function getContainedImageRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ContainedImageRect | null {
  if (!Number.isFinite(containerWidth) || !Number.isFinite(containerHeight)) return null
  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)) return null
  if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) return null
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight)
  if (!Number.isFinite(scale) || scale <= 0) return null
  const width = imageWidth * scale
  const height = imageHeight * scale
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
    scale,
  }
}

export function computeVideoPreviewCropState(
  frame: Pick<ExtractedVideoFrame, 'width' | 'height'> | undefined,
  containerSize: { width: number; height: number },
  crop: UniformCrop,
  minCropSize: number
): VideoPreviewCropState | null {
  if (!frame) return null
  const imageRect = getContainedImageRect(containerSize.width, containerSize.height, frame.width, frame.height)
  if (!imageRect) return null
  const safeCrop = clampUniformCrop(crop, frame.width, frame.height, minCropSize)
  const outputSize = computeUniformCropSize(frame.width, frame.height, safeCrop, minCropSize)
  return {
    imageRect,
    safeCrop,
    outputSize,
    cropBox: {
      left: safeCrop.left * imageRect.scale,
      top: safeCrop.top * imageRect.scale,
      width: outputSize.width * imageRect.scale,
      height: outputSize.height * imageRect.scale,
    },
  }
}

export async function makeCroppedVideoFrameFile(
  frame: ExtractedVideoFrame,
  crop: UniformCrop,
  minCropSize: number
): Promise<File> {
  const safeCrop = clampUniformCrop(crop, frame.width, frame.height, minCropSize)
  if (!hasUniformCrop(safeCrop)) return new File([frame.blob], frame.name, { type: 'image/png' })

  const size = computeUniformCropSize(frame.width, frame.height, safeCrop, minCropSize)
  const img = await loadImage(frame.url)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建视频裁剪画布')
  ctx.drawImage(img, safeCrop.left, safeCrop.top, size.width, size.height, 0, 0, size.width, size.height)
  const blob = await canvasToBlob(canvas)
  return new File([blob], frame.name, { type: 'image/png' })
}

function seekVideoForCapture(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const capture = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }
    if (Math.abs(video.currentTime - time) < 0.01 && video.readyState >= 2) {
      capture()
      return
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      capture()
    }
    const onError = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(new Error('视频定位失败'))
    }
    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    video.currentTime = time
  })
}

function captureVideoCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) resolve(blob)
      else reject(new Error('视频帧导出失败'))
    }, 'image/png')
  })
}

export async function extractHtmlVideoFrames({
  video,
  draft,
  start,
  end,
  fps,
  onProgress,
}: ExtractHtmlVideoFramesOptions): Promise<ExtractedVideoFrame[]> {
  const width = video.videoWidth || draft.width
  const height = video.videoHeight || draft.height
  if (width <= 0 || height <= 0) throw new Error('视频尚未加载完成')

  const range = clampVideoClipRange({ duration: draft.duration, start, end })
  const timestamps = buildVideoFrameTimestamps(range.start, range.end, fps)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建视频截帧画布')

  const frames: ExtractedVideoFrame[] = []
  video.pause()
  for (let index = 0; index < timestamps.length; index += 1) {
    const time = timestamps[index]!
    await seekVideoForCapture(video, time)
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(video, 0, 0, width, height)
    const blob = await captureVideoCanvasBlob(canvas)
    frames.push({
      index,
      name: `${draft.sourceName.replace(/\.[^.]+$/, '')}_frame_${String(index + 1).padStart(3, '0')}.png`,
      url: URL.createObjectURL(blob),
      blob,
      width,
      height,
      time,
    })
    onProgress?.(Math.round(((index + 1) / timestamps.length) * 100))
  }
  return frames
}

export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0.00s'
  return `${Math.max(0, seconds).toFixed(2)}s`
}
