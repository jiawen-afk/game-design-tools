import { Card, ColorPicker, Segmented, Slider, Space, Switch, Typography } from 'antd'

import { hexToRgb, rgbToHex } from '../MultiFrameSpriteWorkspace/imagePipeline'
import { normalizePickerColor } from '../MultiFrameSpriteWorkspace/matteModel'
import { MatteAiSetupPanel } from '../MultiFrameSpriteWorkspace/MatteAiSetupPanel'
import type { MatteMode } from '../MultiFrameSpriteWorkspace/aiMattingService'
import type { ImageProcessingWorkspaceViewModel } from './useImageProcessingWorkspace'

const { Text } = Typography

const matteModeOptions: Array<{ label: string; value: MatteMode }> = [
  { label: '色键抠图', value: 'chroma' },
  { label: 'AI抠图', value: 'ai' },
]

export interface ImageMattePanelProps {
  workspace: ImageProcessingWorkspaceViewModel
}

export function ImageMattePanel({ workspace }: ImageMattePanelProps) {
  return (
    <Card
      title="抠图去背"
      className="image-control-card"
      extra={(
        <Switch
          checked={workspace.matteEnabled}
          checkedChildren="开"
          unCheckedChildren="关"
          onChange={workspace.setMatteEnabled}
        />
      )}
    >
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <Segmented
          block
          value={workspace.matteMode}
          options={matteModeOptions}
          disabled={!workspace.matteEnabled}
          onChange={(value) => workspace.setMatteMode(value as MatteMode)}
        />
        {workspace.matteMode === 'ai' ? (
          <MatteAiSetupPanel
            aiMatting={workspace.aiMatting}
            aiMattingProgress={null}
            onAiDetectEnvironment={() => void workspace.aiMatting.detectEnvironment()}
            onAiInstallDependencies={() => void workspace.aiMatting.installDependencies()}
            onAiQueryDependencyStatus={() => void workspace.aiMatting.queryDependencyStatus()}
            onAiStartService={() => void workspace.aiMatting.startService()}
            onAiStopService={() => void workspace.aiMatting.controlService('stop')}
            onAiCheckService={() => void workspace.aiMatting.runCheck()}
            onAiDevicePreferenceChange={(device) => void workspace.aiMatting.setDevicePreference(device)}
          />
        ) : (
          <>
            <label className="image-field">
              <span>关键色</span>
              <ColorPicker
                value={rgbToHex(workspace.matte.keyColor)}
                showText
                disabled={!workspace.matteEnabled}
                onChange={(color, hex) => workspace.updateMatte('keyColor', hexToRgb(normalizePickerColor(color, hex, '#00ff00')))}
              />
            </label>
            <Text type="secondary">
              {workspace.matteEnabled ? '在右侧预览里默认点选背景取色，开启裁剪范围后进入裁剪模式。' : '关闭后使用原图进行裁剪与导出。'}
            </Text>
            <label className="image-field">
              <span>容差：{workspace.matte.tolerance}</span>
              <Slider
                min={0}
                max={100}
                value={workspace.matte.tolerance}
                disabled={!workspace.matteEnabled}
                onChange={(value) => workspace.updateMatte('tolerance', value)}
              />
            </label>
            <label className="image-field">
              <span>平滑：{workspace.matte.smoothness}</span>
              <Slider
                min={0}
                max={100}
                value={workspace.matte.smoothness}
                disabled={!workspace.matteEnabled}
                onChange={(value) => workspace.updateMatte('smoothness', value)}
              />
            </label>
            <label className="image-field">
              <span>去溢色：{workspace.matte.spill}</span>
              <Slider
                min={0}
                max={100}
                value={workspace.matte.spill}
                disabled={!workspace.matteEnabled}
                onChange={(value) => workspace.updateMatte('spill', value)}
              />
            </label>
            <label className="image-field">
              <span>边缘腐蚀：{workspace.matte.erosion}</span>
              <Slider
                min={0}
                max={100}
                value={workspace.matte.erosion}
                disabled={!workspace.matteEnabled}
                onChange={(value) => workspace.updateMatte('erosion', value)}
              />
            </label>
            <Text type="secondary">参数调整会自动刷新处理结果。JPG/JPEG 导出使用导出背景。</Text>
          </>
        )}
      </Space>
    </Card>
  )
}
