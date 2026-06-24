import type { ReactNode } from 'react'
import { Button, Input, Popover, Space } from 'antd'

interface PersonalSpaceTextPopoverProps {
  open: boolean
  className: string
  value: string
  ariaLabel: string
  placeholder: string
  children: ReactNode
  confirmDisabled?: boolean
  confirmIcon?: ReactNode
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function PersonalSpaceTextPopover({
  open,
  className,
  value,
  ariaLabel,
  placeholder,
  children,
  confirmDisabled,
  confirmIcon,
  onOpenChange,
  onValueChange,
  onConfirm,
  onCancel,
}: PersonalSpaceTextPopoverProps) {
  const confirmIfEnabled = () => {
    if (confirmDisabled) return
    onConfirm()
  }

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={onOpenChange}
      content={(
        <div className={`voice-group-rename-popover ${className}`}>
          <Input
            size="small"
            value={value}
            aria-label={ariaLabel}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
            onPressEnter={confirmIfEnabled}
          />
          <Space.Compact>
            <Button size="small" type="primary" icon={confirmIcon} disabled={confirmDisabled} onClick={confirmIfEnabled}>
              确认
            </Button>
            <Button size="small" onClick={onCancel}>
              取消
            </Button>
          </Space.Compact>
        </div>
      )}
    >
      {children}
    </Popover>
  )
}
