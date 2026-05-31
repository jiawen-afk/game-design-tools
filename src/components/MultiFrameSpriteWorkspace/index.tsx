import { useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  Divider,
  Space,
  Tabs,
  Typography,
  Upload,
} from 'antd'
import {
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
} from './constants'
import { DetailPreviewModal } from './DetailPreviewModal'
import { ExportPanel } from './ExportPanel'
import { LayoutWorkspacePanel } from './LayoutWorkspacePanel'
import { MatteFrameCard } from './MatteFrameCard'
import { MatteDefaultsModal } from './MatteDefaultsModal'
import { LayoutDefaultsModal } from './LayoutDefaultsModal'
import { PlaybackPanel } from './PlaybackPanel'
import { SpriteSheetUploadPanel } from './SpriteSheetUploadPanel'
import { VideoUploadPanel } from './VideoUploadPanel'
import { useFrameWorkspaceState } from './useFrameWorkspaceState'
import { useLayoutWorkspace } from './useLayoutWorkspace'
import { useMattePipeline } from './useMattePipeline'
import { usePlaybackWorkspace } from './usePlaybackWorkspace'
import { useSpriteExport } from './useSpriteExport'
import { useUploadWorkspace } from './useUploadWorkspace'
import { useVideoWorkspace } from './useVideoWorkspace'
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
  const {
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    dragState,
    setDragState,
    guideLines,
    setGuideLines,
    selectedGuideLineId,
    setSelectedGuideLineId,
    setGuideDragState,
    layoutDefaultsOpen,
    setLayoutDefaultsOpen,
    layoutDefaultsDraft,
    setLayoutDefaultsDraft,
    canvasRatioPercent,
    setCanvasRatioPercent,
    canvasRatioBasis,
    setCanvasRatioBasis,
    activeRatioPercent,
    activeRatioBasis,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    outlineColor,
    setOutlineColor,
    outlineWidth,
    setOutlineWidth,
    composeStyle,
    layoutWheelScalingEnabled,
    setLayoutWheelScalingEnabled,
    canvasStageRef,
    setLayout,
    handleLayoutWheel,
    createGuideLine,
    addGuideLine,
    applyAllCenter,
    applyPresetSize,
    applyCanvasRatio,
    updateActiveRatio,
    openLayoutDefaults,
    saveLayoutDefaults,
  } = useLayoutWorkspace({
    initialLayoutDefaults,
    frames,
    activeFrame,
    detailPreview,
    setFrames,
    updateFrame,
  })
  const {
    fps,
    setFps,
    playbackMode,
    setPlaybackMode,
    playing,
    setPlaying,
    playIndex,
    setPlayIndex,
    setPlaybackFrameIds,
    visibleFrames,
    selectedFrameIdSet,
    playbackFrameIdSet,
    playbackFrames,
    previewFrame,
    startAllPlayback,
    startSelectedPlayback,
    batchHideSelected,
    handlePlaybackRowDragStart,
    handlePlaybackRowDrop,
    handlePlaybackRowToggleHidden,
    selectFrameTag,
  } = usePlaybackWorkspace({
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
  const { columns, setColumns, exporting, exportAll } = useSpriteExport({
    frames,
    visibleFrames,
    canvasWidth,
    canvasHeight,
    fps,
    playbackMode,
  })
  const {
    matteDefaults,
    matteDefaultsOpen,
    setMatteDefaultsOpen,
    matteDefaultsDraft,
    setMatteDefaultsDraft,
    openMatteDefaults,
    saveMatteDefaults,
    scheduleMatte,
    clearMattePipeline,
    setMatteParam,
    setCustomSpillColor,
    setCustomSpillPickerColor,
    applyMatteToFollowingFrames,
    sampleColor,
  } = useMattePipeline({
    frames,
    framesRef,
    setFrames,
    updateFrame,
    canvasWidth,
    canvasHeight,
    composeStyle,
    composingPaused: !!dragState,
  })

  const {
    spriteSheetDraft,
    spriteRows,
    setSpriteRows,
    spriteColumns,
    setSpriteColumns,
    spriteSlices,
    spriteProcessing,
    uploadFileList,
    handleUploadChange,
    handleSpriteSheetUpload,
    confirmSpriteSheetSplit,
  } = useUploadWorkspace({
    frames,
    framesRef,
    matteDefaults,
    appendFrames,
    scheduleMatte,
  })

  const {
    videoDraft,
    videoClipStart,
    videoClipEnd,
    videoFps,
    videoPlaying,
    videoLooping,
    videoLoading,
    videoExtracting,
    videoAdding,
    videoExtractProgress,
    videoOperationLabel,
    videoExtractedFrames,
    videoFramePreviewIndex,
    videoCropMode,
    setVideoCropMode,
    videoError,
    videoPreviewRef,
    videoFramePreviewBoxRef,
    videoFrameCount,
    videoLimitMessage,
    previewVideoFrame,
    videoCropImageRect,
    videoCropOutputSize,
    videoCropBox,
    handleVideoUpload,
    applyNativeVideoMetadata,
    handleVideoTimeUpdate,
    handleVideoPreviewError,
    setVideoPlaying,
    setVideoLooping,
    playVideoClip,
    setVideoClipRange,
    setVideoFps,
    resetVideoExtraction,
    resetVideoSegmentPreview,
    extractVideoFrames,
    setVideoFramePreviewIndex,
    setVideoFramePreviewPlaying,
    confirmVideoFrames,
    startVideoCropDrag,
  } = useVideoWorkspace({ matteDefaults, appendFrames, scheduleMatte })

  useEffect(() => {
    const ids = new Set(frames.map((item) => item.id))
    setSelectedFrameIds((prev) => prev.filter((id) => ids.has(id)))
    setSelectionAnchorId((prev) => (prev && ids.has(prev) ? prev : null))
  }, [frames])

  const removeAllFrames = () => {
    clearMattePipeline()
    setPlaying(false)
    setPlayIndex(0)
    setPlaybackFrameIds([])
    clearFrames()
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginTop: 0 }}>多图动作精灵工作台</Title>
        <Text type="secondary">
          多图独立抠图、统一画布、逐帧缩放对齐、排序预览，并导出 Sprite Sheet ZIP。
        </Text>
      </div>

      <Card title="1. 文件上传">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Tabs
            items={[
              {
                key: 'sprite-sheet',
                label: '上传精灵图处理',
                children: (
                  <SpriteSheetUploadPanel
                    imageAccept={IMAGE_ACCEPT}
                    rows={spriteRows}
                    columns={spriteColumns}
                    processing={spriteProcessing}
                    slices={spriteSlices}
                    draft={spriteSheetDraft}
                    onUpload={(file) => void handleSpriteSheetUpload(file)}
                    onRowsChange={setSpriteRows}
                    onColumnsChange={setSpriteColumns}
                    onConfirm={() => void confirmSpriteSheetSplit()}
                  />
                ),
              },
              {
                key: 'video',
                label: '上传视频处理',
                children: (
                  <VideoUploadPanel
                    videoAccept={VIDEO_ACCEPT}
                    loading={videoLoading}
                    operationLabel={videoOperationLabel}
                    draft={videoDraft}
                    error={videoError}
                    previewRef={videoPreviewRef}
                    framePreviewBoxRef={videoFramePreviewBoxRef}
                    clipStart={videoClipStart}
                    clipEnd={videoClipEnd}
                    fps={videoFps}
                    frameCount={videoFrameCount}
                    limitMessage={videoLimitMessage}
                    playing={videoPlaying}
                    looping={videoLooping}
                    extracting={videoExtracting}
                    extractProgress={videoExtractProgress}
                    previewFrame={previewVideoFrame}
                    cropMode={videoCropMode}
                    cropImageRect={videoCropImageRect}
                    cropBox={videoCropBox}
                    cropOutputSize={videoCropOutputSize}
                    extractedFrames={videoExtractedFrames}
                    framePreviewIndex={videoFramePreviewIndex}
                    adding={videoAdding}
                    onUpload={(file) => void handleVideoUpload(file)}
                    onLoadedMetadata={applyNativeVideoMetadata}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onPreviewError={handleVideoPreviewError}
                    onPlayingChange={setVideoPlaying}
                    onLoopingChange={setVideoLooping}
                    onPlayClip={playVideoClip}
                    onClipRangeChange={setVideoClipRange}
                    onFpsChange={setVideoFps}
                    onResetExtraction={resetVideoExtraction}
                    onResetSegmentPreview={resetVideoSegmentPreview}
                    onExtractFrames={() => void extractVideoFrames()}
                    onSelectPreviewFrame={(index) => {
                      setVideoFramePreviewIndex(index)
                      setVideoFramePreviewPlaying(false)
                    }}
                    onCropModeChange={setVideoCropMode}
                    onConfirmFrames={() => void confirmVideoFrames()}
                    onStartCropDrag={startVideoCropDrag}
                  />
                ),
              },
            ]}
          />

          <Divider plain style={{ margin: '4px 0' }}>或</Divider>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Upload
              accept={IMAGE_ACCEPT.join(',')}
              multiple
              fileList={uploadFileList}
              beforeUpload={() => false}
              onChange={handleUploadChange}
              showUploadList={false}
            >
              <Button type="primary" icon={<UploadOutlined />}>批量添加图片</Button>
            </Upload>
          </div>
        </Space>
      </Card>

      <Card
        title="2. 抠图去背"
        extra={
          <Space wrap>
            <Button onClick={openMatteDefaults}>抠图参数配置</Button>
            <Button danger icon={<DeleteOutlined />} disabled={frames.length === 0} onClick={removeAllFrames}>
              移除所有图片
            </Button>
          </Space>
        }
      >
        {frames.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
            {frames.map((item, index) => (
              <MatteFrameCard
                key={item.id}
                item={item}
                index={index}
                frameCount={frames.length}
                active={activeFrame?.id === item.id}
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
            ))}
          </div>
        ) : (
          <Text type="secondary">请先在流程 1 上传多张图片，或上传精灵图切分后添加到这里。</Text>
        )}
      </Card>

      <LayoutWorkspacePanel
        frames={frames}
        activeFrame={activeFrame}
        activeFrameIndex={activeFrameIndex}
        canvasWidth={canvasWidth}
        setCanvasWidth={setCanvasWidth}
        canvasHeight={canvasHeight}
        setCanvasHeight={setCanvasHeight}
        canvasRatioPercent={canvasRatioPercent}
        setCanvasRatioPercent={setCanvasRatioPercent}
        canvasRatioBasis={canvasRatioBasis}
        setCanvasRatioBasis={setCanvasRatioBasis}
        activeRatioPercent={activeRatioPercent}
        activeRatioBasis={activeRatioBasis}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        outlineColor={outlineColor}
        setOutlineColor={setOutlineColor}
        outlineWidth={outlineWidth}
        setOutlineWidth={setOutlineWidth}
        layoutWheelScalingEnabled={layoutWheelScalingEnabled}
        setLayoutWheelScalingEnabled={setLayoutWheelScalingEnabled}
        guideLines={guideLines}
        setGuideLines={setGuideLines}
        selectedGuideLineId={selectedGuideLineId}
        setSelectedGuideLineId={setSelectedGuideLineId}
        setGuideDragState={setGuideDragState}
        canvasStageRef={canvasStageRef}
        setActiveId={setActiveId}
        setDragState={setDragState}
        setLayout={setLayout}
        handleLayoutWheel={handleLayoutWheel}
        createGuideLine={createGuideLine}
        addGuideLine={addGuideLine}
        applyAllCenter={applyAllCenter}
        applyPresetSize={applyPresetSize}
        applyCanvasRatio={applyCanvasRatio}
        updateActiveRatio={updateActiveRatio}
        openLayoutDefaults={openLayoutDefaults}
      />
      <PlaybackPanel
        frames={frames}
        selectedCount={selectedFrameIds.length}
        fps={fps}
        playbackMode={playbackMode}
        playing={playing}
        previewFrame={previewFrame}
        playbackFrameCount={playbackFrames.length}
        playIndex={playIndex}
        visibleFrameCount={visibleFrames.length}
        selectedFrameIds={selectedFrameIdSet}
        playbackFrameIds={playbackFrameIdSet}
        onStartAll={startAllPlayback}
        onStartSelected={startSelectedPlayback}
        onPause={() => setPlaying(false)}
        onFpsChange={setFps}
        onPlaybackModeChange={setPlaybackMode}
        onBatchHideSelected={batchHideSelected}
        onDragStart={handlePlaybackRowDragStart}
        onDrop={handlePlaybackRowDrop}
        onSelect={selectFrameTag}
        onToggleHidden={handlePlaybackRowToggleHidden}
      />

      <ExportPanel
        columns={columns}
        visibleFrameCount={visibleFrames.length}
        exporting={exporting}
        onColumnsChange={setColumns}
        onExport={() => void exportAll()}
      />

      <Divider />
      <Text type="secondary">
        当前帧数：{frames.length}，公共画布：{canvasWidth} × {canvasHeight}
      </Text>

      <MatteDefaultsModal
        open={matteDefaultsOpen}
        draft={matteDefaultsDraft}
        onDraftChange={setMatteDefaultsDraft}
        onSave={saveMatteDefaults}
        onCancel={() => setMatteDefaultsOpen(false)}
      />

      <LayoutDefaultsModal
        open={layoutDefaultsOpen}
        draft={layoutDefaultsDraft}
        onDraftChange={setLayoutDefaultsDraft}
        onSave={saveLayoutDefaults}
        onCancel={() => setLayoutDefaultsOpen(false)}
      />

      <DetailPreviewModal
        preview={detailPreview}
        zoom={detailZoom}
        onZoomChange={setDetailZoom}
        onClose={() => setDetailPreview(null)}
      />
    </Space>
  )
}

