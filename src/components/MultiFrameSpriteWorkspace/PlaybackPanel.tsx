import { Button, Card, InputNumber, Progress, Segmented, Select, Slider, Space, Switch, Typography } from 'antd'
import { EyeInvisibleOutlined, PlayCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'

import { clampInt } from './numberUtils'
import { PlaybackFrameRow } from './PlaybackFrameRow'
import { upscaylModels, type UpscaleModel } from '../ImageProcessingWorkspace/imageUpscaleModel'
import type { PlaybackMode } from './playbackModel'
import type { SpriteUpscaleWorkspaceViewModel } from './useSpriteUpscaleWorkspace'
import type { FrameItem } from './types'

const { Text } = Typography

export interface PlaybackPanelProps {
  frames: FrameItem[]
  selectedCount: number
  fps: number
  playbackMode: PlaybackMode
  playing: boolean
  previewFrame: FrameItem | undefined
  playbackFrameCount: number
  playIndex: number
  visibleFrameCount: number
  selectedFrameIds: Set<string>
  playbackFrameIds: Set<string>
  upscale: SpriteUpscaleWorkspaceViewModel
  onStartAll: () => void
  onStartSelected: () => void
  onPause: () => void
  onFpsChange: (fps: number) => void
  onPlaybackModeChange: (mode: PlaybackMode) => void
  onBatchHideSelected: () => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
  onSelect: (item: FrameItem, event: React.MouseEvent<HTMLDivElement>) => void
  onToggleHidden: (id: string, event: React.MouseEvent<HTMLElement>) => void
}

export function PlaybackPanel({
  frames,
  selectedCount,
  fps,
  playbackMode,
  playing,
  previewFrame,
  playbackFrameCount,
  playIndex,
  visibleFrameCount,
  selectedFrameIds,
  playbackFrameIds,
  upscale,
  onStartAll,
  onStartSelected,
  onPause,
  onFpsChange,
  onPlaybackModeChange,
  onBatchHideSelected,
  onDragStart,
  onDrop,
  onSelect,
  onToggleHidden,
}: PlaybackPanelProps) {
  const upscaleInstalled = upscale.upscaleRuntimeStatus?.installed === true
  const upscaleProgress = upscale.upscaleInstallProgress
  const frameCounter = `帧 ${Math.min(playIndex + 1, playbackFrameCount)} / ${playbackFrameCount}`
  const emptyPreviewText = visibleFrameCount === 0 && frames.length > 0 ? '没有可预览的可见帧' : '等待帧处理完成'

  return (
    <Card title="4. 预览播放与排序">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Button icon={<PlayCircleOutlined />} onClick={playing ? onPause : onStartAll}>
            {playing ? '暂停播放' : '全部播放'}
          </Button>
          <Button icon={<PlayCircleOutlined />} disabled={selectedCount === 0} onClick={onStartSelected}>
            播放选择的图片
          </Button>
          <Text>FPS</Text>
          <InputNumber min={1} max={60} value={fps} onChange={(value) => onFpsChange(clampInt(value ?? 12, 1, 60))} />
          <Segmented
            value={playbackMode}
            onChange={(value) => onPlaybackModeChange(value as PlaybackMode)}
            options={[
              { label: '循环', value: 'loop' },
              { label: '乒乓', value: 'pingpong' },
            ]}
          />
        </Space>
        <div className="sprite-upscale-panel">
          <div className="sprite-upscale-heading">
            <Space size={8}>
              <Switch
                checked={upscale.upscaleEnabled}
                onChange={upscale.setUpscaleEnabled}
              />
              <Text strong>高清化</Text>
            </Space>
            <Text type="secondary">{upscaleInstalled ? '运行包已安装' : '未安装时仍可普通播放'}</Text>
          </div>
          {upscale.upscaleEnabled ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text type="secondary">
                {upscale.upscaleRuntimeStatus?.message ?? '检测 Upscayl 运行包状态。'}
              </Text>
              {!upscaleInstalled ? (
                <>
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={upscale.upscaleInstalling}
                    onClick={() => void upscale.installUpscaleRuntime()}
                  >
                    安装高清化运行包
                  </Button>
                  {upscaleProgress ? (
                    <Progress
                      percent={upscaleProgress.percent}
                      size="small"
                      status={upscaleProgress.phase === 'error' ? 'exception' : upscaleProgress.phase === 'done' ? 'success' : 'active'}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <div className="sprite-upscale-controls">
                    <label className="sprite-upscale-field">
                      <span>模型</span>
                      <Select
                        value={upscale.upscaleOptions.model}
                        options={upscaylModels.map((model) => ({ value: model, label: model }))}
                        onChange={(model: UpscaleModel) => upscale.updateUpscaleOptions({ model })}
                      />
                    </label>
                    <label className="sprite-upscale-field sprite-upscale-scale">
                      <span>倍数：{upscale.upscaleOptions.scale}x</span>
                      <Slider
                        min={2}
                        max={4}
                        step={1}
                        value={upscale.upscaleOptions.scale}
                        onChange={(scale) => upscale.updateUpscaleOptions({ scale })}
                      />
                    </label>
                    <Button
                      icon={<ThunderboltOutlined />}
                      loading={upscale.upscaleProcessing}
                      disabled={upscale.targetFrameCount === 0}
                      onClick={() => void upscale.runBatchUpscale()}
                    >
                      批量高清化
                    </Button>
                  </div>
                  {upscale.upscaleProcessing || upscale.batchProgress.total > 0 ? (
                    <div className="sprite-upscale-progress">
                      <Progress percent={upscale.batchPercent} size="small" status={upscale.upscaleProcessing ? 'active' : 'success'} />
                      <Text type="secondary">
                        已生成 {upscale.upscaledFrameCount} / {upscale.targetFrameCount} 帧
                        {upscale.batchProgress.activeName ? `，正在处理 ${upscale.batchProgress.activeName}` : ''}
                      </Text>
                    </div>
                  ) : (
                    <Text type="secondary">已生成 {upscale.upscaledFrameCount} / {upscale.targetFrameCount} 帧高清化预览</Text>
                  )}
                </>
              )}
            </Space>
          ) : null}
        </div>
        <div className="playback-workspace-grid">
          <div className="playback-frame-list">
            {frames.map((item, index) => (
              <PlaybackFrameRow
                key={item.id}
                item={item}
                index={index}
                selected={selectedFrameIds.has(item.id)}
                isPreview={previewFrame?.id === item.id}
                inPlaybackList={playbackFrameIds.has(item.id)}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onSelect={onSelect}
                onToggleHidden={onToggleHidden}
              />
            ))}
          </div>
          <div className="playback-preview-pair" data-upscale-enabled={upscale.upscaleEnabled ? 'true' : 'false'}>
            <div className="playback-preview-box">
              {previewFrame?.composedUrl ? (
                <div className="playback-preview-content">
                  <Text strong>原始播放</Text>
                  <img
                    src={previewFrame.composedUrl}
                    alt="preview"
                  />
                  <Text type="secondary">{frameCounter}</Text>
                </div>
              ) : (
                <Text type="secondary">{emptyPreviewText}</Text>
              )}
            </div>
            {upscale.upscaleEnabled ? (
              <div className="playback-preview-box playback-preview-box-upscale">
                {upscale.previewResult ? (
                  <div className="playback-preview-content">
                    <Text strong>高清化播放</Text>
                    <img
                      src={upscale.previewResult.url}
                      alt="upscaled preview"
                    />
                    <Text type="secondary">{frameCounter} · {upscale.previewResult.width} × {upscale.previewResult.height}</Text>
                  </div>
                ) : (
                  <Text type="secondary">
                    {previewFrame?.composedUrl ? '尚未生成此帧高清化预览' : emptyPreviewText}
                  </Text>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <Space wrap>
          <Button
            icon={<EyeInvisibleOutlined />}
            disabled={selectedCount === 0}
            onClick={onBatchHideSelected}
          >
            批量隐藏
          </Button>
          <Text type="secondary">已选 {selectedCount} 张</Text>
        </Space>
      </Space>
    </Card>
  )
}
