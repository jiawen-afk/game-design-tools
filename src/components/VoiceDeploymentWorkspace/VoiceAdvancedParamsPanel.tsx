import { InputNumber, Slider, Switch } from 'antd'

import type { VoiceAdvancedParams } from './voiceDeploymentModel'
import { VoiceFieldLabel, VoiceHelpTip } from './VoiceFieldLabel'

interface VoiceAdvancedParamsPanelProps {
  advanced: VoiceAdvancedParams
  onAdvancedChange: (patch: Partial<VoiceAdvancedParams>) => void
}

export function VoiceAdvancedParamsPanel({
  advanced,
  onAdvancedChange,
}: VoiceAdvancedParamsPanelProps) {
  return (
    <div className="advanced-box">
      <div className="panel-title compact">
        <h3>高级控制</h3>
        <VoiceHelpTip text="这些参数会直接传给 VoxCPM。保持默认值通常即可，调试角色音色时再逐项修改。" />
      </div>

      <div className="advanced-grid">
        <label className="form-field">
          <VoiceFieldLabel label="CFG 强度" help="控制文本和声音条件的影响强度。常用 1 到 3，过高可能让声音不自然。" />
          <div className="slider-row">
            <Slider min={1} max={3} step={0.1} value={advanced.cfgValue} onChange={(value) => onAdvancedChange({ cfgValue: value })} />
            <InputNumber min={1} max={3} step={0.1} value={advanced.cfgValue} onChange={(value) => onAdvancedChange({ cfgValue: Number(value ?? 2) })} />
          </div>
        </label>

        <label className="form-field">
          <VoiceFieldLabel label="DiT 步数" help="扩散推理步数。更高通常更慢，可能更稳定；默认 10 适合快速生成。" />
          <div className="slider-row">
            <Slider min={1} max={50} step={1} value={advanced.ditSteps} onChange={(value) => onAdvancedChange({ ditSteps: value })} />
            <InputNumber min={1} max={50} step={1} value={advanced.ditSteps} onChange={(value) => onAdvancedChange({ ditSteps: Number(value ?? 10) })} />
          </div>
        </label>

        <div className="switch-row">
          <VoiceFieldLabel label="文本归一化" help="将数字、符号等文本改写成更适合朗读的形式。游戏专有名词较多时可以关闭。" />
          <Switch checked={advanced.normalize} onChange={(checked) => onAdvancedChange({ normalize: checked })} />
        </div>

        <div className="switch-row">
          <VoiceFieldLabel label="参考音频降噪" help="对上传的参考音频先做增强处理。录音底噪明显时开启，干净音频可关闭。" />
          <Switch checked={advanced.denoise} onChange={(checked) => onAdvancedChange({ denoise: checked })} />
        </div>
      </div>
    </div>
  )
}
