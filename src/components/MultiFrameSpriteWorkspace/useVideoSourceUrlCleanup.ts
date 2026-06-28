import { useEffect, useRef } from 'react'

import { getVideoSourceUrlToRevoke } from './videoModel'

export function useVideoSourceUrlCleanup(sourceUrl: string | null | undefined) {
  const videoSourceUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const nextUrl = sourceUrl ?? null
    const staleUrl = getVideoSourceUrlToRevoke(videoSourceUrlRef.current, nextUrl)
    if (staleUrl) URL.revokeObjectURL(staleUrl)
    videoSourceUrlRef.current = nextUrl
  }, [sourceUrl])

  useEffect(() => {
    return () => {
      if (videoSourceUrlRef.current) URL.revokeObjectURL(videoSourceUrlRef.current)
    }
  }, [])
}
