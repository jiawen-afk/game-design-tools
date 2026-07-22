import { CopyOutlined, LockOutlined } from '@ant-design/icons'
import { Alert, Button, Collapse, InputNumber, Radio, Select, Slider, Switch, Tooltip } from 'antd'

import {
  getUpscaleScaleForPercent,
  type VideoAudioBitrate,
  type VideoAudioMode,
  type VideoQualityMode,
  type VideoQualityPreset,
} from './videoProcessingModel'
import {
  VIDEO_OUTPUT_FORMATS,
  getVideoOutputFormatDefinition,
  getVideoQualityOptions,
  type VideoOutputFormat,
} from './videoProcessingOutputFormatModel'
import type { VideoProcessingWorkspaceViewModel } from './useVideoProcessingWorkspace'

export function VideoProcessingSettingsPanel({ workspace }: { workspace: VideoProcessingWorkspaceViewModel }) {
  const job = workspace.selectedJob
  if (!job) {
    return (
      <aside className="video-processing-panel video-settings-panel">
        <div className="video-panel-heading"><h2>处理参数</h2></div>
        <div className="video-panel-empty">导入视频后，可在这里设置分辨率、压缩、帧率和音频。</div>
      </aside>
    )
  }

  const { input, settings } = job
  const disabled = !workspace.selectedEditable
  const queuedCount = workspace.jobs.filter((item) => item.phase === 'queued').length
  const upscaleScale = getUpscaleScaleForPercent(settings.percent)
  const outputFormat = getVideoOutputFormatDefinition(settings.outputFormat)
  const qualityOptions = getVideoQualityOptions(settings.outputFormat)
  const models = workspace.upscaleRuntimeStatus?.models?.length
    ? workspace.upscaleRuntimeStatus.models
    : ['upscayl-standard-4x', 'upscayl-lite-4x', 'high-fidelity-4x', 'remacri-4x', 'ultramix-balanced-4x', 'ultrasharp-4x', 'digital-art-4x']

  return (
    <aside className="video-processing-panel video-settings-panel" aria-labelledby="video-settings-title">
      <div className="video-panel-heading">
        <div>
          <h2 id="video-settings-title">处理参数</h2>
          <span>{input.width} × {input.height}，{input.averageFps.toFixed(2)} FPS</span>
        </div>
        <div className="video-settings-heading-actions">
          <Button
            size="small"
            icon={<CopyOutlined />}
            disabled={disabled || queuedCount < 2}
            onClick={workspace.applySelectedSettingsToAll}
          >
            应用到全部待处理
          </Button>
          {disabled && <Tooltip title="仅等待中的任务可以修改参数"><LockOutlined /></Tooltip>}
        </div>
      </div>

      <section className="video-settings-section" aria-labelledby="video-output-format-title">
        <div className="video-settings-section-title">
          <h3 id="video-output-format-title">导出格式</h3>
          <span>.{outputFormat.extension}</span>
        </div>
        <label className="video-field">
          <span>容器与编码</span>
          <Select
            value={settings.outputFormat}
            disabled={disabled}
            onChange={(value: VideoOutputFormat) => workspace.updateSettings({ outputFormat: value })}
            options={VIDEO_OUTPUT_FORMATS.map((item) => ({
              label: `${item.label} · ${item.videoCodec} + ${item.audioCodec}`,
              value: item.format,
            }))}
          />
        </label>
        <div className="video-format-summary" role="status">
          <strong>{outputFormat.label} · {outputFormat.videoCodec} + {outputFormat.audioCodec}</strong>
          <span>{outputFormat.compatibility}</span>
        </div>
        {outputFormat.patentNotice && (
          <Alert type="warning" showIcon message={outputFormat.patentNotice} />
        )}
      </section>

      <section className="video-settings-section" aria-labelledby="video-resize-title">
        <div className="video-settings-section-title">
          <h3 id="video-resize-title">分辨率</h3>
          <span>{upscaleScale ? `Upscayl ${upscaleScale}× 后精确缩放` : 'Lanczos 缩放'}</span>
        </div>
        <div className="video-percent-row">
          <Slider
            min={25}
            max={400}
            step={1}
            value={settings.percent}
            disabled={disabled}
            onChange={workspace.setResizePercent}
          />
          <InputNumber
            aria-label="分辨率比例"
            min={25}
            max={400}
            precision={2}
            addonAfter="%"
            value={settings.percent}
            disabled={disabled}
            onChange={(value) => workspace.setResizePercent(Number(value ?? settings.percent))}
          />
        </div>
        <div className="video-dimension-grid">
          <label>
            <span>宽度</span>
            <InputNumber
              min={2}
              step={2}
              addonAfter="px"
              value={settings.width}
              disabled={disabled}
              onChange={(value) => workspace.setResizeWidth(Number(value ?? settings.width))}
            />
          </label>
          <span className="video-dimension-lock" aria-label="宽高比已锁定"><LockOutlined /></span>
          <label>
            <span>高度</span>
            <InputNumber
              min={2}
              step={2}
              addonAfter="px"
              value={settings.height}
              disabled={disabled}
              onChange={(value) => workspace.setResizeHeight(Number(value ?? settings.height))}
            />
          </label>
        </div>
        {settings.percent > 100 && !workspace.upscaylInstalled && (
          <Alert type="warning" showIcon message="放大任务必须先安装 Upscayl GPU 运行包。" />
        )}
      </section>

      <section className="video-settings-section" aria-labelledby="video-compression-title">
        <div className="video-settings-section-title">
          <h3 id="video-compression-title">{outputFormat.compressionLabel} 压缩</h3>
          <span>{settings.qualityMode === 'target-size' && outputFormat.supportsTwoPassTargetSize ? '双遍编码' : '单遍编码'}</span>
        </div>
        <Radio.Group
          block
          optionType="button"
          buttonStyle="solid"
          value={settings.qualityMode}
          disabled={disabled}
          onChange={(event) => workspace.updateSettings({ qualityMode: event.target.value as VideoQualityMode })}
          options={[{ label: '固定质量', value: 'quality' }, { label: '目标大小', value: 'target-size' }]}
        />
        {settings.qualityMode === 'quality' ? (
          <div className="video-quality-options">
            {qualityOptions.map((option) => (
              <label key={option.value}>
                <Radio
                  checked={settings.qualityPreset === option.value}
                  disabled={disabled}
                  onChange={() => workspace.updateSettings({ qualityPreset: option.value as VideoQualityPreset })}
                >
                  {option.label}
                </Radio>
                <span>{option.help}</span>
              </label>
            ))}
          </div>
        ) : (
          <label className="video-field">
            <span>目标文件大小</span>
            <InputNumber
              min={0.1}
              step={0.5}
              precision={2}
              addonAfter="MB"
              value={settings.targetMb}
              disabled={disabled}
              onChange={(value) => workspace.updateSettings({ targetMb: value === null ? null : Number(value) })}
            />
            <small>
              {outputFormat.supportsTwoPassTargetSize ? '使用双遍编码' : '使用目标码率编码'}，超出目标 2% 时自动重试一次。
            </small>
          </label>
        )}
      </section>

      <section className="video-settings-section" aria-labelledby="video-media-title">
        <div className="video-settings-section-title"><h3 id="video-media-title">帧率与音频</h3></div>
        <div className="video-media-grid">
          <label className="video-field">
            <span>目标帧率</span>
            <InputNumber
              min={1}
              max={input.averageFps}
              step={1}
              addonAfter="FPS"
              value={settings.targetFps}
              disabled={disabled}
              onChange={(value) => workspace.updateSettings({ targetFps: Number(value ?? settings.targetFps) })}
            />
          </label>
          <label className="video-field">
            <span>音频</span>
            <Select
              value={settings.audioMode}
              disabled={disabled || !input.hasAudio}
              onChange={(value: VideoAudioMode) => workspace.updateSettings({ audioMode: value })}
              options={[{ label: `${outputFormat.audioCodec}（保留音频）`, value: 'keep' }, { label: '静音', value: 'mute' }]}
            />
          </label>
        </div>
        {settings.audioMode === 'keep' && input.hasAudio && (
          <label className="video-field">
            <span>{outputFormat.audioCodec} 码率</span>
            <Select
              value={settings.audioKbps}
              disabled={disabled}
              onChange={(value: VideoAudioBitrate) => workspace.updateSettings({ audioKbps: value })}
              options={[64, 96, 128, 160].map((value) => ({ label: `${value} kbps`, value }))}
            />
          </label>
        )}
      </section>

      <Collapse
        ghost
        className="video-advanced-collapse"
        items={[{
          key: 'upscayl',
          label: 'Upscayl GPU 高级参数',
          children: (
            <div className="video-advanced-grid">
              <label className="video-field video-field-wide">
                <span>模型</span>
                <Select
                  value={settings.upscaylModel}
                  disabled={disabled}
                  onChange={(value) => workspace.updateSettings({ upscaylModel: value })}
                  options={models.map((model) => ({ label: model, value: model }))}
                />
              </label>
              <label className="video-field">
                <span>GPU</span>
                <Select
                  value={settings.gpuId}
                  disabled={disabled}
                  onChange={(value) => workspace.updateSettings({ gpuId: value })}
                  options={[
                    { label: '自动选择', value: 'auto' },
                    { label: 'GPU 0', value: '0' },
                    { label: 'GPU 1', value: '1' },
                    { label: 'GPU 2', value: '2' },
                  ]}
                />
              </label>
              <label className="video-field">
                <span>分块大小</span>
                <InputNumber
                  min={32}
                  step={32}
                  value={settings.tileSize}
                  disabled={disabled}
                  onChange={(value) => workspace.updateSettings({ tileSize: Number(value ?? settings.tileSize) })}
                />
              </label>
              <label className="video-field video-field-wide">
                <span>线程配置</span>
                <Select
                  value={settings.threadProfile}
                  disabled={disabled}
                  onChange={(value) => workspace.updateSettings({ threadProfile: value })}
                  options={[
                    { label: '均衡 · 1:2:2', value: 'balanced' },
                    { label: '低显存 · 1:1:1', value: 'low-memory' },
                    { label: '吞吐优先 · 2:2:2', value: 'throughput' },
                  ]}
                />
              </label>
              <label className="video-switch-field">
                <span>TTA 增强</span>
                <Switch checked={settings.ttaMode} disabled={disabled} onChange={(ttaMode) => workspace.updateSettings({ ttaMode })} />
              </label>
            </div>
          ),
        }]}
      />

      {workspace.validationErrors.length > 0 && (
        <Alert
          type="error"
          showIcon
          message="当前任务尚不能开始"
          description={<ul>{workspace.validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
        />
      )}
    </aside>
  )
}
