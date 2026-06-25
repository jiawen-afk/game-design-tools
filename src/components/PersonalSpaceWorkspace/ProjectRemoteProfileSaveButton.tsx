import { Button, Popconfirm } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

interface ProjectRemoteProfileSaveButtonProps {
  testState: 'untested' | 'passed' | 'failed'
  tested: boolean
  label: string
  failureDescription: string
  onSave: () => boolean | void | Promise<boolean | void>
}

export function ProjectRemoteProfileSaveButton({
  testState,
  tested,
  label,
  failureDescription,
  onSave,
}: ProjectRemoteProfileSaveButtonProps) {
  const saveButton = (
    <Button icon={<SaveOutlined />} disabled={!tested} onClick={testState === 'failed' ? undefined : () => void onSave()}>
      {label}
    </Button>
  )

  if (testState !== 'failed') return saveButton

  return (
    <Popconfirm
      title="测试失败，仍然保存？"
      description={failureDescription}
      okText="仍然保存"
      cancelText="取消"
      onConfirm={() => void onSave()}
    >
      {saveButton}
    </Popconfirm>
  )
}
