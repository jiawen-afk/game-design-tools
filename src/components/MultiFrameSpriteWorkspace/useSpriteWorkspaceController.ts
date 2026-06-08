import { useMemo } from 'react'

import {
  readStoredLayoutDefaults,
} from './storage'
import { useFrameWorkspaceState } from './useFrameWorkspaceState'
import { useLayoutWorkspace } from './useLayoutWorkspace'
import { useMattePipeline } from './useMattePipeline'
import { usePlaybackWorkspace } from './usePlaybackWorkspace'
import { useSpriteExport } from './useSpriteExport'
import { useUploadWorkspace } from './useUploadWorkspace'
import { useVideoWorkspace } from './useVideoWorkspace'
import { useWorkspaceReset } from './useWorkspaceReset'
import { usePersonalSpaceDirectoryAuthorization } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'

export function useSpriteWorkspaceController() {
  const initialLayoutDefaults = useMemo(() => readStoredLayoutDefaults(), [])
  const personalSpaceDirectory = usePersonalSpaceDirectoryAuthorization()
  const frame = useFrameWorkspaceState()
  const layout = useLayoutWorkspace({
    initialLayoutDefaults,
    frames: frame.frames,
    activeFrame: frame.activeFrame,
    detailPreview: frame.detailPreview,
    setFrames: frame.setFrames,
    updateFrame: frame.updateFrame,
  })
  const playback = usePlaybackWorkspace({
    frames: frame.frames,
    framesRef: frame.framesRef,
    selectedFrameIds: frame.selectedFrameIds,
    selectionAnchorId: frame.selectionAnchorId,
    dragOrderId: frame.dragOrderId,
    setFrames: frame.setFrames,
    setSelectedFrameIds: frame.setSelectedFrameIds,
    setSelectionAnchorId: frame.setSelectionAnchorId,
    setActiveId: frame.setActiveId,
    setDragOrderId: frame.setDragOrderId,
    reorder: frame.reorder,
    toggleFrameHidden: frame.toggleFrameHidden,
  })
  const spriteExport = useSpriteExport({
    frames: frame.frames,
    visibleFrames: playback.visibleFrames,
    canvasWidth: layout.canvasWidth,
    canvasHeight: layout.canvasHeight,
    fps: playback.fps,
    playbackMode: playback.playbackMode,
  })
  const matte = useMattePipeline({
    frames: frame.frames,
    framesRef: frame.framesRef,
    setFrames: frame.setFrames,
    updateFrame: frame.updateFrame,
    canvasWidth: layout.canvasWidth,
    canvasHeight: layout.canvasHeight,
    composeStyle: layout.composeStyle,
    composingPaused: !!layout.dragState,
  })
  const upload = useUploadWorkspace({
    frames: frame.frames,
    framesRef: frame.framesRef,
    matteDefaults: matte.matteDefaults,
    appendFrames: frame.appendFrames,
    scheduleMatte: matte.scheduleMatte,
  })
  const video = useVideoWorkspace({
    framesRef: frame.framesRef,
    matteDefaults: matte.matteDefaults,
    appendFrames: frame.appendFrames,
    scheduleMatte: matte.scheduleMatte,
  })
  const { resetAllFrames } = useWorkspaceReset({
    clearMattePipeline: matte.clearMattePipeline,
    setPlaying: playback.setPlaying,
    setPlayIndex: playback.setPlayIndex,
    setPlaybackFrameIds: playback.setPlaybackFrameIds,
    clearFrames: frame.clearFrames,
  })

  return {
    frame,
    layout,
    playback,
    spriteExport,
    matte,
    upload,
    video,
    resetAllFrames,
    ...personalSpaceDirectory,
  }
}
