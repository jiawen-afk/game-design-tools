import { Alert, Button, Tag, Upload, type UploadProps } from 'antd'
import { InboxOutlined, ScissorOutlined } from '@ant-design/icons'

import { formatAudioClipTime, type AudioClipSource } from './audioClipModel'

interface AudioClipEditorImportSurfaceProps {
  error?: string
  source?: AudioClipSource | null
  sourceKindLabel?: string
  durationSeconds?: number
  uploadProps: UploadProps
}

export function AudioClipEditorImportSurface({
  error,
  source,
  sourceKindLabel,
  durationSeconds = 0,
  uploadProps,
}: AudioClipEditorImportSurfaceProps) {
  if (!source) {
    return (
      <section className="voice-panel audio-editor-panel" aria-labelledby="audio-editor-title">
        <div className="panel-title">
          <ScissorOutlined />
          <h3 id="audio-editor-title">音频编辑</h3>
        </div>
        <Upload.Dragger {...uploadProps} className="audio-import-dropzone">
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">拖入音频文件</p>
          <p className="ant-upload-hint">也可以从生成配音或生成音效的历史记录中选择“剪辑片段”。</p>
        </Upload.Dragger>
        {error ? <Alert type="warning" showIcon title={error} /> : null}
      </section>
    )
  }

  return (
    <div className="audio-editor-source-row">
      <Tag>{sourceKindLabel}</Tag>
      <strong>{source.record.name}</strong>
      <span>{formatAudioClipTime(durationSeconds)}</span>
      <Upload {...uploadProps}>
        <Button size="small" icon={<InboxOutlined />}>更换音频</Button>
      </Upload>
    </div>
  )
}
