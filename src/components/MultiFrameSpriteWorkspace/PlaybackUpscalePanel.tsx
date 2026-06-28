import { Button, Progress, Segmented, Select, Slider, Space, Typography } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'

import { upscaylModels, type UpscaleModel } from '../ImageProcessingWorkspace/imageUpscaleModel'
import type { SpriteUpscaleMode } from './spriteUpscaleModel'
import type { SpriteUpscaleWorkspaceViewModel } from './useSpriteUpscaleWorkspace'

const { Text } = Typography

export interface PlaybackUpscalePanelProps {
  upscale: SpriteUpscaleWorkspaceViewModel
}

export function PlaybackUpscalePanel({ upscale }: PlaybackUpscalePanelProps) {
  const upscaleInstalled = upscale.upscaleRuntimeStatus?.installed === true
  const upscaleProgress = upscale.upscaleInstallProgress
  const upscaleActive = upscale.upscaleMode !== 'off'

  return (
    <div className="sprite-upscale-panel">
      <div className="sprite-upscale-heading">
        <Space size={8} wrap>
          <Text strong>高清化模式</Text>
          <Segmented
            value={upscale.upscaleMode}
            onChange={(value) => upscale.setUpscaleMode(value as SpriteUpscaleMode)}
            options={[
              { label: '关闭', value: 'off' },
              { label: '输入图高清化', value: 'input' },
              { label: '结果图高清化', value: 'output' },
            ]}
          />
        </Space>
        <Text type="secondary">{upscaleInstalled ? '运行包已安装' : '未安装时仍可普通播放'}</Text>
      </div>
      {upscaleActive ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Text type="secondary">
            {upscale.upscaleRuntimeStatus?.message ?? '检测 Upscayl 运行包状态。'}
          </Text>
          {upscale.upscaleMode === 'output' ? (
            <Text type="secondary">
              导出后单帧：{upscale.resultUpscaleFrameSize.width} × {upscale.resultUpscaleFrameSize.height}
            </Text>
          ) : (
            <Text type="secondary">输入图高清化会先修复源图，再套用流程 3 参数。</Text>
          )}
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
                    已生成 {upscale.upscaledFrameCount} / {upscale.targetFrameCount} 帧{upscale.upscaleModeLabel}预览
                    {upscale.batchProgress.activeName ? `，正在处理 ${upscale.batchProgress.activeName}` : ''}
                  </Text>
                </div>
              ) : (
                <Text type="secondary">已生成 {upscale.upscaledFrameCount} / {upscale.targetFrameCount} 帧{upscale.upscaleModeLabel}预览</Text>
              )}
            </>
          )}
        </Space>
      ) : null}
    </div>
  )
}
