import { Button, Select, Tag } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'

import type {
  StableAudioModelId,
  StableAudioModelMeta,
} from './soundEffectModel'

interface SoundEffectModelInstallPanelProps {
  desktopRuntime: boolean
  desktopSetupBusy: boolean
  installedModelIds: StableAudioModelId[]
  missingModelIds: StableAudioModelId[]
  selectedModel: StableAudioModelId
  stableAudioModels: StableAudioModelMeta[]
  onModelChange: (model: StableAudioModelId) => void
  onRunDesktopSetup: (model?: StableAudioModelId) => void
}

export function SoundEffectModelInstallPanel({
  desktopRuntime,
  desktopSetupBusy,
  installedModelIds,
  missingModelIds,
  selectedModel,
  stableAudioModels,
  onModelChange,
  onRunDesktopSetup,
}: SoundEffectModelInstallPanelProps) {
  const installedModels = stableAudioModels.filter((model) => installedModelIds.includes(model.id))
  const missingModels = stableAudioModels.filter((model) => missingModelIds.includes(model.id))
  const missingModelOptions = missingModels.map((model) => ({
    label: `${model.label} · ${model.id}`,
    value: model.id,
  }))
  const installTarget = missingModelIds.includes(selectedModel)
    ? selectedModel
    : missingModels[0]?.id

  return (
    <>
      <div className="sound-model-status-line sound-model-status-inline">
        <span className="model-select-label">已安装模型</span>
        <span>{installedModels.map((model) => model.id).join('、') || '无'}</span>
      </div>
      <div className="sound-model-install-row">
        <span className="model-select-label">未安装模型</span>
        {missingModels.length > 0 ? (
          <>
            <Select
              value={installTarget}
              options={missingModelOptions}
              onChange={(value) => onModelChange(value)}
              className="sound-install-model-select"
            />
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={desktopSetupBusy}
              disabled={!desktopRuntime || desktopSetupBusy || !installTarget}
              onClick={() => installTarget ? onRunDesktopSetup(installTarget) : undefined}
            >
              安装模型
            </Button>
          </>
        ) : (
          <Tag color="success">无</Tag>
        )}
      </div>
    </>
  )
}
