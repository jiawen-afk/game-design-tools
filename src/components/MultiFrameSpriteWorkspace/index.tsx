import { useMemo } from 'react'
import {
  Space,
  Typography,
} from 'antd'
import {
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
} from './constants'
import { LayoutWorkspacePanel } from './LayoutWorkspacePanel'
import { MatteWorkspacePanel } from './MatteWorkspacePanel'
import { OutputWorkspacePanel } from './OutputWorkspacePanel'
import { UploadWorkspacePanel } from './UploadWorkspacePanel'
import { WorkspaceDialogs } from './WorkspaceDialogs'
import { useFrameWorkspaceState } from './useFrameWorkspaceState'
import { useLayoutWorkspace } from './useLayoutWorkspace'
import { useMattePipeline } from './useMattePipeline'
import { usePlaybackWorkspace } from './usePlaybackWorkspace'
import { useSpriteExport } from './useSpriteExport'
import { useUploadWorkspace } from './useUploadWorkspace'
import { useVideoWorkspace } from './useVideoWorkspace'
import { useWorkspaceReset } from './useWorkspaceReset'
import {
  readStoredLayoutDefaults,
} from './storage'
import './workspace.css'

const { Text, Title } = Typography

export default function MultiFrameSpriteWorkspace() {
  const initialLayoutDefaults = useMemo(() => readStoredLayoutDefaults(), [])
  const {
    frames,
    setFrames,
    framesRef,
    activeId,
    setActiveId,
    activeFrame,
    activeFrameIndex,
    selectedFrameIds,
    setSelectedFrameIds,
    selectionAnchorId,
    setSelectionAnchorId,
    detailPreview,
    setDetailPreview,
    detailZoom,
    setDetailZoom,
    dragOrderId,
    setDragOrderId,
    updateFrame,
    appendFrames,
    removeFrame,
    clearFrames,
    reorder,
    toggleFrameHidden,
  } = useFrameWorkspaceState()
  const layoutWorkspace = useLayoutWorkspace({
    initialLayoutDefaults,
    frames,
    activeFrame,
    detailPreview,
    setFrames,
    updateFrame,
  })
  const playbackWorkspace = usePlaybackWorkspace({
    frames,
    framesRef,
    selectedFrameIds,
    selectionAnchorId,
    dragOrderId,
    setFrames,
    setSelectedFrameIds,
    setSelectionAnchorId,
    setActiveId,
    setDragOrderId,
    reorder,
    toggleFrameHidden,
  })
  const {
    fps,
    playbackMode,
    setPlaying,
    setPlayIndex,
    setPlaybackFrameIds,
    visibleFrames,
  } = playbackWorkspace
  const spriteExport = useSpriteExport({
    frames,
    visibleFrames,
    canvasWidth: layoutWorkspace.canvasWidth,
    canvasHeight: layoutWorkspace.canvasHeight,
    fps,
    playbackMode,
  })
  const mattePipeline = useMattePipeline({
    frames,
    framesRef,
    setFrames,
    updateFrame,
    canvasWidth: layoutWorkspace.canvasWidth,
    canvasHeight: layoutWorkspace.canvasHeight,
    composeStyle: layoutWorkspace.composeStyle,
    composingPaused: !!layoutWorkspace.dragState,
  })
  const {
    matteDefaults,
    openMatteDefaults,
    scheduleMatte,
    clearMattePipeline,
    setMatteParam,
    setCustomSpillColor,
    setCustomSpillPickerColor,
    applyMatteToFollowingFrames,
    sampleColor,
  } = mattePipeline

  const uploadWorkspace = useUploadWorkspace({
    frames,
    framesRef,
    matteDefaults,
    appendFrames,
    scheduleMatte,
  })

  const videoWorkspace = useVideoWorkspace({ matteDefaults, appendFrames, scheduleMatte })
  const { resetAllFrames } = useWorkspaceReset({
    clearMattePipeline,
    setPlaying,
    setPlayIndex,
    setPlaybackFrameIds,
    clearFrames,
  })

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginTop: 0 }}>多图动作精灵工作台</Title>
        <Text type="secondary">
          多图独立抠图、统一画布、逐帧缩放对齐、排序预览，并导出 Sprite Sheet ZIP。
        </Text>
      </div>

      <UploadWorkspacePanel
        imageAccept={IMAGE_ACCEPT}
        videoAccept={VIDEO_ACCEPT}
        upload={uploadWorkspace}
        video={videoWorkspace}
      />

      <MatteWorkspacePanel
        frames={frames}
        activeFrameId={activeFrame?.id ?? null}
        onOpenDefaults={openMatteDefaults}
        onRemoveAll={resetAllFrames}
        onActivate={setActiveId}
        onRemove={removeFrame}
        onSampleColor={(frame, event) => void sampleColor(frame, event)}
        onPreview={(url, name) => {
          setDetailPreview({ url, name })
          setDetailZoom(1)
        }}
        onMatteParamChange={setMatteParam}
        onApplyToFollowing={applyMatteToFollowingFrames}
        onCustomSpillPickerColor={setCustomSpillPickerColor}
        onCustomSpillColor={setCustomSpillColor}
      />

      <LayoutWorkspacePanel
        frames={frames}
        activeFrame={activeFrame}
        activeFrameIndex={activeFrameIndex}
        layout={layoutWorkspace}
        setActiveId={setActiveId}
      />
      <OutputWorkspacePanel
        frames={frames}
        playback={playbackWorkspace}
        spriteExport={spriteExport}
        canvasWidth={layoutWorkspace.canvasWidth}
        canvasHeight={layoutWorkspace.canvasHeight}
      />

      <WorkspaceDialogs
        matte={mattePipeline}
        layout={layoutWorkspace}
        detailPreview={detailPreview}
        detailZoom={detailZoom}
        setDetailZoom={setDetailZoom}
        setDetailPreview={setDetailPreview}
      />
    </Space>
  )
}

