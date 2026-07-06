import { Alert, Button, Input, InputNumber, Select, Space } from 'antd'
import {
  LoadingOutlined,
  SoundOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

import type { SoundEffectParams, StableAudioModelId, StableAudioModelMeta } from './soundEffectModel'
import { VoiceFieldLabel } from './VoiceFieldLabel'

interface SoundEffectGenerationPanelProps {
  soundParams: SoundEffectParams
  generationError: string
  generating: boolean
  canGenerate: boolean
  stableAudioModels: StableAudioModelMeta[]
  selectedModelMeta: StableAudioModelMeta
  onParamsChange: (patch: Partial<SoundEffectParams>) => void
  onGenerationModelChange: (model: StableAudioModelId) => void
  onGenerate: () => void
  onResetParams: () => void
}

export function SoundEffectGenerationPanel({
  soundParams,
  generationError,
  generating,
  canGenerate,
  stableAudioModels,
  selectedModelMeta,
  onParamsChange,
  onGenerationModelChange,
  onGenerate,
  onResetParams,
}: SoundEffectGenerationPanelProps) {
  const modelOptions = (stableAudioModels.length > 0 ? stableAudioModels : [selectedModelMeta]).map((model) => ({
    label: `${model.label} · ${model.id}`,
    value: model.id,
  }))

  return (
    <section className="voice-panel sound-generation-panel" aria-labelledby="sound-generation-title">
      <div className="panel-title">
        <SoundOutlined />
        <h3 id="sound-generation-title">生成音效</h3>
      </div>

      <div className="form-stack">
        <label className="form-field">
          <VoiceFieldLabel label="提示词" help="描述声音来源、材质、动作、空间和情绪。建议用英文短句获得更稳定的本地推理结果。" />
          <Input.TextArea
            value={soundParams.prompt}
            onChange={(event) => onParamsChange({ prompt: event.target.value })}
            rows={5}
            placeholder="metal sword slash impact, short tail, game sfx"
          />
        </label>

        <div className="sound-param-grid">
          <label className="form-field">
            <VoiceFieldLabel label="模型" help="选择本次生成使用的 Stable Audio 3 模型。" />
            <Select
              value={soundParams.model}
              options={modelOptions}
              onChange={(value) => onGenerationModelChange(value as StableAudioModelId)}
            />
          </label>
          <label className="form-field">
            <VoiceFieldLabel label="时长" help={`当前模型最长 ${selectedModelMeta.maxDurationSeconds} 秒。`} />
            <InputNumber
              min={1}
              max={selectedModelMeta.maxDurationSeconds}
              value={soundParams.durationSeconds}
              addonAfter="秒"
              onChange={(value) => onParamsChange({ durationSeconds: Number(value ?? 1) })}
            />
          </label>
          <label className="form-field">
            <VoiceFieldLabel label="种子" help="留空时服务端随机生成。填写整数可复现相近结果。" />
            <InputNumber
              value={soundParams.seed ?? undefined}
              placeholder="随机"
              onChange={(value) => onParamsChange({ seed: typeof value === 'number' ? value : null })}
            />
          </label>
        </div>

        <label className="form-field">
          <VoiceFieldLabel label="输出名称" help="用于历史记录和收藏到音效素材后的默认名称。" />
          <Input
            value={soundParams.outputName}
            onChange={(event) => onParamsChange({ outputName: event.target.value })}
            placeholder="例如：剑击石面"
          />
        </label>

        {generationError ? <Alert type="error" showIcon title={generationError} /> : null}

        <div className="generate-actions">
          <Button
            type="primary"
            icon={generating ? <LoadingOutlined /> : <ThunderboltOutlined />}
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            {generating ? '正在生成' : '生成音效'}
          </Button>
          <Button onClick={onResetParams}>
            重置参数
          </Button>
          <Space className="sound-model-inline" size={8} wrap>
            <span>{selectedModelMeta.label}</span>
            <span>{selectedModelMeta.hardware}</span>
            <span>{selectedModelMeta.parameterCount}</span>
          </Space>
        </div>
      </div>
    </section>
  )
}
