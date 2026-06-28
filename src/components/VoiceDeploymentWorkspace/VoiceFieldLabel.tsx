import { Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'

interface VoiceFieldLabelProps {
  label: string
  help: string
}

export function VoiceHelpTip({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <QuestionCircleOutlined className="help-icon" aria-label={text} />
    </Tooltip>
  )
}

export function VoiceFieldLabel({ label, help }: VoiceFieldLabelProps) {
  return (
    <span className="field-label">
      {label}
      <VoiceHelpTip text={help} />
    </span>
  )
}
