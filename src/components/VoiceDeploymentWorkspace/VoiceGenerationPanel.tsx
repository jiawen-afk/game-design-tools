import { useState } from 'react'
import type { UploadProps } from 'antd'
import { Alert, Button, Empty, Input, InputNumber, Segmented, Slider, Switch, Tooltip, Upload } from 'antd'
import {
  ApiOutlined,
  LoadingOutlined,
  UserAddOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import {
  type VoiceAdvancedParams,
  type VoiceGenerationMode,
  type VoiceGenerationParams,
  voiceModeMeta,
} from './voiceDeploymentModel'

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

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <QuestionCircleOutlined className="help-icon" aria-label={text} />
    </Tooltip>
  )
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="field-label">
      {label}
      <HelpTip text={help} />
    </span>
  )
}

function VoiceCharacterSelector({
  characters,
  selectedCharacterId,
  onCharacterSelect,
  onCharacterCreate,
}: {
  characters: Array<{ id: string; name: string }>
  selectedCharacterId: string | null
  onCharacterSelect: (id: string | null) => void
  onCharacterCreate: (name: string) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [newCharacterName, setNewCharacterName] = useState('')
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filteredCharacters = normalizedKeyword
    ? characters.filter((character) => character.name.toLowerCase().includes(normalizedKeyword))
    : characters
  const createCharacter = () => {
    const trimmedName = newCharacterName.trim()
    if (!trimmedName) return
    onCharacterCreate(trimmedName)
    setNewCharacterName('')
    setKeyword('')
  }

  return (
    <aside className="voice-character-selector">
      <div className="panel-title compact">
        <h3>关联角色</h3>
        <HelpTip text="选择角色后，本次生成的音频记录名称会自动带上角色名。" />
      </div>
      <Input
        value={keyword}
        placeholder="搜索角色"
        allowClear
        onChange={(event) => setKeyword(event.target.value)}
      />
      <div className="voice-character-list" role="listbox" aria-label="选择生成语音角色">
        {filteredCharacters.length > 0 ? filteredCharacters.map((character) => (
          <button
            key={character.id}
            type="button"
            className={character.id === selectedCharacterId ? 'is-selected' : ''}
            aria-selected={character.id === selectedCharacterId}
            onClick={() => onCharacterSelect(character.id)}
          >
            {character.name}
          </button>
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配角色" />}
      </div>
      <div className="voice-character-create">
        <Input
          value={newCharacterName}
          placeholder="快捷创建角色"
          allowClear
          onChange={(event) => setNewCharacterName(event.target.value)}
          onPressEnter={createCharacter}
        />
        <Button
          size="small"
          icon={<UserAddOutlined />}
          disabled={!newCharacterName.trim()}
          onClick={createCharacter}
        >
          创建
        </Button>
      </div>
      {selectedCharacterId && (
        <div className="voice-character-selected">
          <Button size="small" onClick={() => onCharacterSelect(null)}>
            取消选择
          </Button>
        </div>
      )}
    </aside>
  )
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
            <FieldLabel label="生成方式" help="四种方式使用同一个 VoxCPM /generate 接口，通过参数组合切换能力。" />
            <Segmented
              block
              value={voiceParams.mode}
              options={modeOptions}
              onChange={(value) => onModeChange(value as VoiceGenerationMode)}
            />
            <span className="field-note">{selectedModeNote}</span>
          </label>

          <label className="form-field">
            <FieldLabel label="台词文本" help="最终要生成的语音内容。声音盲盒只需要填写这一项。" />
            <Input.TextArea
              value={voiceParams.text}
              onChange={(e) => onParamsChange({ text: e.target.value })}
              rows={4}
              placeholder="输入角色要说的话"
            />
          </label>

          {(voiceParams.mode === 'voice-design' || voiceParams.mode === 'reference-clone') && (
            <label className="form-field">
              <FieldLabel label="声音描述" help="描述年龄、性别、情绪、语速、风格或表演状态。参考音频克隆时会在保留音色基础上调整风格。" />
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
              <FieldLabel label="参考音频" help="用于提取音色。可以上传本地音频，也可以从右侧历史记录中点击克隆。" />
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
              <FieldLabel label="参考音频文本" help="填写参考音频里实际说出的文本。文本越准确，克隆相似度通常越高。" />
              <Input.TextArea
                value={voiceParams.promptText}
                onChange={(e) => onParamsChange({ promptText: e.target.value })}
                rows={2}
                placeholder="输入参考音频对应的原文"
              />
            </label>
          )}

          <div className="advanced-box">
            <div className="panel-title compact">
              <h3>高级控制</h3>
              <HelpTip text="这些参数会直接传给 VoxCPM。保持默认值通常即可，调试角色音色时再逐项修改。" />
            </div>

            <div className="advanced-grid">
              <label className="form-field">
                <FieldLabel label="CFG 强度" help="控制文本和声音条件的影响强度。常用 1 到 3，过高可能让声音不自然。" />
                <div className="slider-row">
                  <Slider min={1} max={3} step={0.1} value={voiceParams.advanced.cfgValue} onChange={(value) => onAdvancedChange({ cfgValue: value })} />
                  <InputNumber min={1} max={3} step={0.1} value={voiceParams.advanced.cfgValue} onChange={(value) => onAdvancedChange({ cfgValue: Number(value ?? 2) })} />
                </div>
              </label>

              <label className="form-field">
                <FieldLabel label="DiT 步数" help="扩散推理步数。更高通常更慢，可能更稳定；默认 10 适合快速生成。" />
                <div className="slider-row">
                  <Slider min={1} max={50} step={1} value={voiceParams.advanced.ditSteps} onChange={(value) => onAdvancedChange({ ditSteps: value })} />
                  <InputNumber min={1} max={50} step={1} value={voiceParams.advanced.ditSteps} onChange={(value) => onAdvancedChange({ ditSteps: Number(value ?? 10) })} />
                </div>
              </label>

              <div className="switch-row">
                <span>
                  文本归一化
                  <HelpTip text="将数字、符号等文本改写成更适合朗读的形式。游戏专有名词较多时可以关闭。" />
                </span>
                <Switch checked={voiceParams.advanced.normalize} onChange={(checked) => onAdvancedChange({ normalize: checked })} />
              </div>

              <div className="switch-row">
                <span>
                  参考音频降噪
                  <HelpTip text="对上传的参考音频先做增强处理。录音底噪明显时开启，干净音频可关闭。" />
                </span>
                <Switch checked={voiceParams.advanced.denoise} onChange={(checked) => onAdvancedChange({ denoise: checked })} />
              </div>
            </div>
          </div>

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
