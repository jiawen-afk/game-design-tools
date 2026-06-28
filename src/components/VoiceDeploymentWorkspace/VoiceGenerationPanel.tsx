import type { UploadProps } from 'antd'
import { Alert, Button, Input, Segmented, Upload } from 'antd'
import {
  ApiOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import {
  type VoiceAdvancedParams,
  type VoiceGenerationMode,
  type VoiceGenerationParams,
  voiceModeMeta,
} from './voiceDeploymentModel'
import { VoiceAdvancedParamsPanel } from './VoiceAdvancedParamsPanel'
import { VoiceCharacterSelector } from './VoiceCharacterSelector'
import { VoiceFieldLabel } from './VoiceFieldLabel'

const modeOptions = voiceModeMeta.map((m) => ({
  label: m.label,
  value: m.id,
}))

const quickDesignPrompts = [
  '年轻女性，明亮，语速自然，带一点笑意',
  '中年男性，沉稳，低音，适合旁白',
  '少年角色，精力充沛，语速稍快',
  '机械助手，清晰，冷静，轻微电子质感',
]

interface VoiceGenerationPanelProps {
  voiceParams: VoiceGenerationParams
  selectedModeNote: string
  generationError: string
  generating: boolean
  canGenerate: boolean
  characters: Array<{ id: string; name: string }>
  selectedCharacterId: string | null
  onModeChange: (mode: VoiceGenerationMode) => void
  onParamsChange: (patch: Partial<VoiceGenerationParams>) => void
  onAdvancedChange: (patch: Partial<VoiceAdvancedParams>) => void
  onCharacterSelect: (id: string | null) => void
  onCharacterCreate: (name: string) => void
  onReferenceFileSelected: (file: File) => void
  onGenerate: () => void
  onResetParams: () => void
}

export function VoiceGenerationPanel({
  voiceParams,
  selectedModeNote,
  generationError,
  generating,
  canGenerate,
  characters,
  selectedCharacterId,
  onModeChange,
  onParamsChange,
  onAdvancedChange,
  onCharacterSelect,
  onCharacterCreate,
  onReferenceFileSelected,
  onGenerate,
  onResetParams,
}: VoiceGenerationPanelProps) {
  const uploadProps: UploadProps = {
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      onReferenceFileSelected(file as File)
      return false
    },
  }

  return (
    <section className="voice-panel voice-generator" aria-labelledby="voice-generate-title">
      <div className="panel-title">
        <ApiOutlined />
        <h3 id="voice-generate-title">生成语音</h3>
      </div>

      <div className="voice-generator-layout">
        <div className="form-stack">
          <label className="form-field">
            <VoiceFieldLabel label="生成方式" help="四种方式使用同一个 VoxCPM /generate 接口，通过参数组合切换能力。" />
            <Segmented
              block
              value={voiceParams.mode}
              options={modeOptions}
              onChange={(value) => onModeChange(value as VoiceGenerationMode)}
            />
            <span className="field-note">{selectedModeNote}</span>
          </label>

          <label className="form-field">
            <VoiceFieldLabel label="台词文本" help="最终要生成的语音内容。声音盲盒只需要填写这一项。" />
            <Input.TextArea
              value={voiceParams.text}
              onChange={(e) => onParamsChange({ text: e.target.value })}
              rows={4}
              placeholder="输入角色要说的话"
            />
          </label>

          {(voiceParams.mode === 'voice-design' || voiceParams.mode === 'reference-clone') && (
            <label className="form-field">
              <VoiceFieldLabel label="声音描述" help="描述年龄、性别、情绪、语速、风格或表演状态。参考音频克隆时会在保留音色基础上调整风格。" />
              <Input.TextArea
                value={voiceParams.controlInstruction}
                onChange={(e) => onParamsChange({ controlInstruction: e.target.value })}
                rows={2}
                placeholder="例如：年轻女性，温柔，语速自然，带一点笑意"
              />
              <div className="prompt-chips">
                {quickDesignPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => onParamsChange({ controlInstruction: prompt })}>
                    {prompt}
                  </button>
                ))}
              </div>
            </label>
          )}

          {(voiceParams.mode === 'reference-clone' || voiceParams.mode === 'high-similarity-clone') && (
            <div className="form-field">
              <VoiceFieldLabel label="参考音频" help="用于提取音色。可以上传本地音频，也可以从右侧历史记录中点击克隆。" />
              <div className="reference-row">
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>选择音频</Button>
                </Upload>
                <span>{voiceParams.referenceAudioName || '尚未选择参考音频'}</span>
              </div>
            </div>
          )}

          {voiceParams.mode === 'high-similarity-clone' && (
            <label className="form-field">
              <VoiceFieldLabel label="参考音频文本" help="填写参考音频里实际说出的文本。文本越准确，克隆相似度通常越高。" />
              <Input.TextArea
                value={voiceParams.promptText}
                onChange={(e) => onParamsChange({ promptText: e.target.value })}
                rows={2}
                placeholder="输入参考音频对应的原文"
              />
            </label>
          )}

          <VoiceAdvancedParamsPanel
            advanced={voiceParams.advanced}
            onAdvancedChange={onAdvancedChange}
          />

          {generationError && <Alert type="error" showIcon title={generationError} />}

          <div className="generate-actions">
            <Button
              type="primary"
              icon={generating ? <LoadingOutlined /> : <ThunderboltOutlined />}
              disabled={!canGenerate}
              onClick={onGenerate}
            >
              {generating ? '正在生成' : '生成语音'}
            </Button>
            <Button onClick={onResetParams}>
              重置参数
            </Button>
          </div>
        </div>

        <VoiceCharacterSelector
          characters={characters}
          selectedCharacterId={selectedCharacterId}
          onCharacterSelect={onCharacterSelect}
          onCharacterCreate={onCharacterCreate}
        />
      </div>
    </section>
  )
}
