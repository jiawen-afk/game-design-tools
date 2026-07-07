import { useCallback, type MutableRefObject } from 'react'

import {
  createAudioClipSourceFromImportedFile,
  type AudioClipSource,
} from './audioClipModel'

const supportedAudioFilePattern = /\.(aac|flac|m4a|mp3|ogg|opus|wav|webm)$/i

function isImportableAudioFile(file: File) {
  return file.type.startsWith('audio/') || supportedAudioFilePattern.test(file.name)
}

export interface UseAudioClipImportWorkflowOptions {
  importedAudioUrlRef: MutableRefObject<string | null>
  loadSource: (source: AudioClipSource) => void
  revokeImportedAudioUrl: (exceptUrl?: string) => void
  setError: (message: string) => void
}

export function useAudioClipImportWorkflow({
  importedAudioUrlRef,
  loadSource,
  revokeImportedAudioUrl,
  setError,
}: UseAudioClipImportWorkflowOptions) {
  const importAudioFile = useCallback((file: File) => {
    if (!isImportableAudioFile(file)) {
      setError('请选择浏览器支持的音频文件。')
      return
    }
    const audioUrl = URL.createObjectURL(file)
    revokeImportedAudioUrl(audioUrl)
    importedAudioUrlRef.current = audioUrl
    loadSource(createAudioClipSourceFromImportedFile(file.name, audioUrl))
  }, [importedAudioUrlRef, loadSource, revokeImportedAudioUrl, setError])

  return { importAudioFile }
}
