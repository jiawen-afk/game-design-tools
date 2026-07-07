import type { RefObject, MouseEvent } from 'react'

interface AudioClipEditorTrackProps {
  waveformRef: RefObject<HTMLDivElement | null>
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void
}

export function AudioClipEditorTrack({ waveformRef, onContextMenu }: AudioClipEditorTrackProps) {
  return <div className="audio-waveform" ref={waveformRef} onContextMenu={onContextMenu} />
}
