import type { DesktopBinaryData } from './desktopBinaryData'
import type { DesktopImageEncoder } from './components/ImageProcessingWorkspace/imageProcessingModel'

export interface DesktopImageEncodingOptions {
  inputName: string
  encoder: DesktopImageEncoder
  data: ArrayBuffer
}

export interface DesktopImageEncodingResult {
  name: string
  mimeType: 'image/png' | 'image/webp'
  data: DesktopBinaryData
}

export interface DesktopImageEncodingApi {
  encodeImage(options: DesktopImageEncodingOptions): Promise<DesktopImageEncodingResult>
}
