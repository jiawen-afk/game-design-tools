export interface DesktopAudioEditSaveOptions {
  fileName: string
  data: ArrayBuffer
}

export interface DesktopAudioEditSaveResult {
  fileName: string
  audioUrl: string
  audioPath: string
}

export interface DesktopAudioFileReadResult {
  name: string
  data: ArrayBuffer
  mimeType: string
}

export interface DesktopAudioEditApi {
  saveEditedAudio(options: DesktopAudioEditSaveOptions): Promise<DesktopAudioEditSaveResult>
  readAudioFile(filePath: string): Promise<DesktopAudioFileReadResult>
}
