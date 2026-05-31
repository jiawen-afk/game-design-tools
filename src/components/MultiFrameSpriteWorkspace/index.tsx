import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  ColorPicker,
  Divider,
  InputNumber,
  Segmented,
  Select,
  Slider,
  Space,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import {
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  HANDLE_CURSORS,
  HANDLE_SIZE,
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
} from './constants'
import { CanvasPublicParamsPanel } from './CanvasPublicParamsPanel'
import { DetailPreviewModal } from './DetailPreviewModal'
import { ExportPanel } from './ExportPanel'
import { FrameThumbnailStrip } from './FrameThumbnailStrip'
import {
  getGuideActionLabel,
  getGuideEmptyStateText,
  getGuideLineEdgeStartPosition,
  getGuideRulerCursor,
  getGuideRulerDragAxis,
  getGuideRulerLabel,
} from './guideModel'
import {
  getWheelScalingButtonLabel,
  type ResizeHandle,
} from './layoutModel'
import {
  buildUploadFileKey,
  filterNewUploadFiles,
} from './model'
import { clampInt } from './numberUtils'
import {
  loadImage,
  makeFrameFromFile,
  revokeFrameUrls,
  revokeSpriteSlicePreviews,
  splitSpriteSheetToPreviews,
} from './imagePipeline'
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
import { useVideoWorkspace } from './useVideoWorkspace'
import {
  readStoredLayoutDefaults,
} from './storage'
import type {
  FrameLayout,
  GuideLine,
  SpriteSheetDraft,
  SpriteSlicePreview,
} from './types'
import './workspace.css'

const { Text, Title } = Typography

const RATIO_GROUP_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
  padding: '6px 8px',
  border: '1px solid #b8a898',
  borderRadius: 6,
  background: '#f7f1e8',
}
const RATIO_PERCENT_INPUT_STYLE: React.CSSProperties = { width: 56 }

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
  const [spriteSheetDraft, setSpriteSheetDraft] = useState<SpriteSheetDraft | null>(null)
  const [spriteRows, setSpriteRows] = useState(4)
  const [spriteColumns, setSpriteColumns] = useState(4)
  const [spriteSlices, setSpriteSlices] = useState<SpriteSlicePreview[]>([])
  const [spriteProcessing, setSpriteProcessing] = useState(false)
  const pendingUploadKeysRef = useRef(new Set<string>())
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

  useEffect(() => {
    return () => {
      if (spriteSheetDraft) URL.revokeObjectURL(spriteSheetDraft.sourceUrl)
    }
  }, [spriteSheetDraft])

  useEffect(() => {
    return () => revokeSpriteSlicePreviews(spriteSlices)
  }, [spriteSlices])

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
    let alive = true
    if (!spriteSheetDraft) {
      setSpriteSlices([])
      return () => {
        alive = false
      }
    }
    setSpriteProcessing(true)
    void splitSpriteSheetToPreviews(spriteSheetDraft, spriteRows, spriteColumns)
      .then((previews) => {
        if (!alive) {
          revokeSpriteSlicePreviews(previews)
          return
        }
        setSpriteSlices(previews)
      })
      .catch((e) => {
        if (alive) {
          setSpriteSlices([])
          message.error(`精灵图切分失败：${String(e)}`)
        }
      })
      .finally(() => {
        if (alive) setSpriteProcessing(false)
      })
    return () => {
      alive = false
    }
  }, [spriteColumns, spriteRows, spriteSheetDraft])

  useEffect(() => {
    const ids = new Set(frames.map((item) => item.id))
    setSelectedFrameIds((prev) => prev.filter((id) => ids.has(id)))
    setSelectionAnchorId((prev) => (prev && ids.has(prev) ? prev : null))
  }, [frames])

  const handleUploadChange: UploadProps['onChange'] = ({ fileList }) => {
    const incoming: File[] = []
    for (const item of fileList) {
      const file = item.originFileObj
      if (file) incoming.push(file as File)
    }
    const existingKeys = new Set(framesRef.current.map((item) => buildUploadFileKey(item.file)))
    const nextFiles = filterNewUploadFiles(incoming, {
      existingKeys,
      pendingKeys: pendingUploadKeysRef.current,
    })
    if (nextFiles.length === 0) return
    nextFiles.forEach((file) => pendingUploadKeysRef.current.add(buildUploadFileKey(file)))
    const defaults = matteDefaults
    void Promise.all(nextFiles.map((file) => makeFrameFromFile(file, defaults))).then((created) => {
      appendFrames(created)
      created.forEach((item) => scheduleMatte(item.id))
    }).finally(() => {
      nextFiles.forEach((file) => pendingUploadKeysRef.current.delete(buildUploadFileKey(file)))
    })
  }

  const handleSpriteSheetUpload = async (file: File) => {
    const sourceUrl = URL.createObjectURL(file)
    try {
      const img = await loadImage(sourceUrl)
      setSpriteSheetDraft({
        file,
        sourceUrl,
        sourceName: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    } catch (e) {
      URL.revokeObjectURL(sourceUrl)
      message.error(`精灵图读取失败：${String(e)}`)
    }
  }

  const confirmSpriteSheetSplit = async () => {
    if (spriteSlices.length === 0) return
    setSpriteProcessing(true)
    try {
      const defaults = matteDefaults
      const files = spriteSlices.map((slice) => new File([slice.blob], slice.name, { type: 'image/png' }))
      const created = await Promise.all(files.map((file) => makeFrameFromFile(file, defaults)))
      appendFrames(created)
      created.forEach((item) => scheduleMatte(item.id))
      message.success(`已添加 ${created.length} 帧到流程 2`)
    } catch (e) {
      message.error(`添加切分帧失败：${String(e)}`)
    } finally {
      setSpriteProcessing(false)
    }
  }

  const removeAllFrames = () => {
    clearMattePipeline()
    setPlaying(false)
    setPlayIndex(0)
    setPlaybackFrameIds([])
    clearFrames()
  }

  const uploadFileList: UploadFile[] = frames.map((item) => ({
    uid: item.id,
    name: item.sourceName,
    status: 'done',
    originFileObj: item.file as UploadFile['originFileObj'],
  }))
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

      <Card title="3. 统一画布、缩放与对齐">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <CanvasPublicParamsPanel
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            ratioPercent={canvasRatioPercent}
            ratioBasis={canvasRatioBasis}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            outlineColor={outlineColor}
            outlineWidth={outlineWidth}
            onOpenDefaults={openLayoutDefaults}
            onCanvasWidthChange={setCanvasWidth}
            onCanvasHeightChange={setCanvasHeight}
            onRatioPercentChange={setCanvasRatioPercent}
            onRatioBasisChange={setCanvasRatioBasis}
            onApplyRatio={() => applyCanvasRatio(canvasRatioPercent, canvasRatioBasis)}
            onApplyAllCenter={applyAllCenter}
            onApplyPresetSize={applyPresetSize}
            onStrokeColorChange={setStrokeColor}
            onStrokeWidthChange={setStrokeWidth}
            onOutlineColorChange={setOutlineColor}
            onOutlineWidthChange={setOutlineWidth}
          />

          <FrameThumbnailStrip frames={frames} activeId={activeFrame?.id ?? null} onSelect={setActiveId} />

          <Card size="small" title="当前图片调整">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <Space wrap>
                <Button
                  icon={layoutWheelScalingEnabled ? <LockOutlined /> : <UnlockOutlined />}
                  type={layoutWheelScalingEnabled ? 'default' : 'primary'}
                  aria-pressed={layoutWheelScalingEnabled}
                  onClick={() => setLayoutWheelScalingEnabled((value) => !value)}
                >
                  {getWheelScalingButtonLabel(layoutWheelScalingEnabled)}
                </Button>
                <Text type="secondary">
                  当前：{layoutWheelScalingEnabled ? '开放' : '禁止'}
                </Text>
                <Button size="small" onClick={() => addGuideLine('x')}>
                  {getGuideActionLabel('x')}
                </Button>
                <Button size="small" onClick={() => addGuideLine('y')}>
                  {getGuideActionLabel('y')}
                </Button>
                <Button size="small" disabled={guideLines.length === 0} onClick={() => {
                  setGuideLines([])
                  setSelectedGuideLineId(null)
                }}>
                  清空辅助线
                </Button>
              </Space>
              {activeFrame && (
                <div style={RATIO_GROUP_STYLE}>
                  <Segmented
                    value={activeRatioBasis}
                    onChange={(value) => updateActiveRatio({ basis: value as 'width' | 'height' })}
                    options={[
                      { label: '宽度', value: 'width' },
                      { label: '高度', value: 'height' },
                    ]}
                  />
                  <Text>占画布</Text>
                  <InputNumber
                    min={1}
                    max={300}
                    value={activeRatioPercent}
                    onChange={(v) => updateActiveRatio({ percent: v ?? 80 })}
                    addonAfter="%"
                    style={RATIO_PERCENT_INPUT_STYLE}
                  />
                  <Text>大小</Text>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) 150px', gap: 16, alignItems: 'start' }}>
                <div
                  onWheel={activeFrame ? handleLayoutWheel : undefined}
                  tabIndex={0}
                  style={{
                    minHeight: 540,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#d9d0c4',
                    border: '1px solid #9a8b78',
                    overflow: 'auto',
                    padding: 24,
                    outline: 'none',
                    overscrollBehavior: 'contain',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      paddingTop: 18,
                      paddingLeft: 18,
                      width: 'fit-content',
                      maxWidth: '100%',
                      isolation: 'isolate',
                      overflow: 'visible',
                    }}
                  >
                    <div
                      onPointerDown={(e) => createGuideLine(getGuideRulerDragAxis('x'), e)}
                      title="从 X 轴向下拖出横向辅助线"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 18,
                        right: 0,
                        height: 18,
                        background: '#c9bfaf',
                        border: '1px solid #9a8b78',
                        borderBottom: 0,
                        cursor: getGuideRulerCursor('x'),
                        display: 'grid',
                        placeItems: 'center',
                        color: '#574838',
                        fontSize: 11,
                        fontWeight: 600,
                        zIndex: 30,
                      }}
                    >
                      {getGuideRulerLabel('x')}
                    </div>
                    <div
                      onPointerDown={(e) => createGuideLine(getGuideRulerDragAxis('y'), e)}
                      title="从 Y 轴向右拖出竖向辅助线"
                      style={{
                        position: 'absolute',
                        top: 18,
                        left: 0,
                        bottom: 0,
                        width: 18,
                        background: '#c9bfaf',
                        border: '1px solid #9a8b78',
                        borderRight: 0,
                        cursor: getGuideRulerCursor('y'),
                        display: 'grid',
                        placeItems: 'center',
                        color: '#574838',
                        fontSize: 10,
                        fontWeight: 600,
                        writingMode: 'vertical-rl',
                        zIndex: 30,
                      }}
                    >
                      {getGuideRulerLabel('y')}
                    </div>
                    <div
                      ref={canvasStageRef}
                      onPointerDown={() => setSelectedGuideLineId(null)}
                      style={{
                        position: 'relative',
                        width: canvasWidth,
                        height: canvasHeight,
                        maxWidth: '100%',
                        maxHeight: 780,
                        background: 'repeating-conic-gradient(#ddd 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px',
                        border: '1px solid #6b5d4d',
                        flexShrink: 0,
                        isolation: 'isolate',
                        zIndex: 10,
                      }}
                    >
                    {activeFrame && activeFrame.matteUrl ? (
                      <div
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId)
                          setDragState({
                            kind: 'move',
                            id: activeFrame.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            startOffsetX: activeFrame.layout.offsetX,
                            startOffsetY: activeFrame.layout.offsetY,
                          })
                        }}
                        style={{
                          position: 'absolute',
                          left: canvasWidth / 2 - activeFrame.layout.width / 2 + activeFrame.layout.offsetX,
                          top: canvasHeight / 2 - activeFrame.layout.height / 2 + activeFrame.layout.offsetY,
                          width: activeFrame.layout.width,
                          height: activeFrame.layout.height,
                          cursor: 'move',
                          outline: '1px solid #b55233',
                          zIndex: 2,
                        }}
                      >
                        <img
                          src={activeFrame.composedUrl ?? activeFrame.matteUrl}
                          alt="active composed"
                          draggable={false}
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                        {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((handle) => {
                          const pos: React.CSSProperties = {
                            position: 'absolute',
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            background: '#fff',
                            border: '1px solid #b55233',
                            borderRadius: 2,
                            cursor: HANDLE_CURSORS[handle],
                          }
                          if (handle.includes('n')) pos.top = -HANDLE_SIZE / 2
                          if (handle.includes('s')) pos.bottom = -HANDLE_SIZE / 2
                          if (handle.includes('w')) pos.left = -HANDLE_SIZE / 2
                          if (handle.includes('e')) pos.right = -HANDLE_SIZE / 2
                          if (handle === 'n' || handle === 's') pos.left = `calc(50% - ${HANDLE_SIZE / 2}px)`
                          if (handle === 'e' || handle === 'w') pos.top = `calc(50% - ${HANDLE_SIZE / 2}px)`
                          return (
                            <span
                              key={handle}
                              style={pos}
                              onPointerDown={(e) => {
                                e.stopPropagation()
                                setDragState({
                                  kind: 'resize',
                                  id: activeFrame.id,
                                  handle,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  startWidth: activeFrame.layout.width,
                                  startHeight: activeFrame.layout.height,
                                })
                              }}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          padding: 24,
                          color: '#574838',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <Text type="secondary">{getGuideEmptyStateText()}</Text>
                      </div>
                    )}
                    {guideLines.map((line) => {
                      const selected = selectedGuideLineId === line.id
                      const lineColor = selected ? '#d63384' : '#ff7ab6'
                      const positionPercent = line.axis === 'x'
                        ? (line.position / Math.max(1, canvasWidth)) * 100
                        : (line.position / Math.max(1, canvasHeight)) * 100
                      return (
                        <span
                          key={`canvas-${line.id}`}
                          data-guide-line-overlay={line.axis}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            setSelectedGuideLineId(line.id)
                            setGuideDragState({ id: line.id, axis: line.axis })
                          }}
                          title="拖动辅助线，按 Delete 删除"
                          style={line.axis === 'x'
                            ? {
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${positionPercent}%`,
                                width: 9,
                                transform: 'translateX(-50%)',
                                cursor: 'ew-resize',
                                pointerEvents: 'auto',
                                zIndex: 60,
                              }
                            : {
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${positionPercent}%`,
                                height: 9,
                                transform: 'translateY(-50%)',
                                cursor: 'ns-resize',
                                pointerEvents: 'auto',
                                zIndex: 60,
                              }}
                        >
                          <span
                            aria-hidden="true"
                            style={line.axis === 'x'
                              ? {
                                  position: 'absolute',
                                  top: 0,
                                  bottom: 0,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  borderLeft: `${selected ? 2 : 1}px dashed ${lineColor}`,
                                  pointerEvents: 'none',
                                }
                              : {
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  borderTop: `${selected ? 2 : 1}px dashed ${lineColor}`,
                                  pointerEvents: 'none',
                                }}
                          />
                        </span>
                      )
                    })}
                    </div>
                  </div>
                </div>

                <Space direction="vertical" size={12} style={{ minWidth: 0 }}>
                  {activeFrame ? (
                    <>
                      <Text strong>帧 {activeFrameIndex + 1} / {frames.length}</Text>
                      <Checkbox
                        checked={activeFrame.layout.keepAspect}
                        onChange={(e) => setLayout(activeFrame.id, { keepAspect: e.target.checked })}
                      >
                        锁定比例
                      </Checkbox>
                      <Space>
                        <Text>宽</Text>
                        <InputNumber
                          min={1}
                          max={4096}
                          value={Math.round(activeFrame.layout.width)}
                          onChange={(v) => {
                            const width = v ?? activeFrame.layout.width
                            const patch: Partial<FrameLayout> = { width }
                            if (activeFrame.layout.keepAspect) {
                              patch.height = Math.max(1, Math.round(width / (activeFrame.matteWidth / Math.max(1, activeFrame.matteHeight))))
                            }
                            setLayout(activeFrame.id, patch)
                          }}
                        />
                      </Space>
                      <Space>
                        <Text>高</Text>
                        <InputNumber
                          min={1}
                          max={4096}
                          value={Math.round(activeFrame.layout.height)}
                          onChange={(v) => {
                            const height = v ?? activeFrame.layout.height
                            const patch: Partial<FrameLayout> = { height }
                            if (activeFrame.layout.keepAspect) {
                              patch.width = Math.max(1, Math.round(height * (activeFrame.matteWidth / Math.max(1, activeFrame.matteHeight))))
                            }
                            setLayout(activeFrame.id, patch)
                          }}
                        />
                      </Space>
                      <Space>
                        <Text>X</Text>
                        <InputNumber value={activeFrame.layout.offsetX} onChange={(v) => setLayout(activeFrame.id, { offsetX: v ?? 0 })} />
                      </Space>
                      <Space>
                        <Text>Y</Text>
                        <InputNumber value={activeFrame.layout.offsetY} onChange={(v) => setLayout(activeFrame.id, { offsetY: v ?? 0 })} />
                      </Space>
                      <Button onClick={() => setLayout(activeFrame.id, { offsetX: 0, offsetY: 0 })}>当前帧居中</Button>
                    </>
                  ) : (
                    <>
                      <Text strong>当前帧：无</Text>
                      <Text type="secondary">请先在流程 1 上传或切分图片。</Text>
                    </>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    辅助线显示在画布顶层，用于定位对齐；选中后按 Delete 删除。
                  </Text>
                </Space>
              </div>
          </Card>
        </Space>
      </Card>

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

