import type { ReactNode } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { PersonalSpaceTextPopover } from './PersonalSpaceTextPopover'

interface CreateNamePopoverButtonProps {
  open: boolean
  className: string
  value: string
  ariaLabel: string
  placeholder: string
  buttonText: string
  confirmIcon?: ReactNode
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function CreateNamePopoverButton({
  open,
  className,
  value,
  ariaLabel,
  placeholder,
  buttonText,
  confirmIcon = <PlusOutlined />,
  onOpenChange,
  onValueChange,
  onConfirm,
  onCancel,
}: CreateNamePopoverButtonProps) {
  return (
    <PersonalSpaceTextPopover
      open={open}
      onOpenChange={onOpenChange}
      className={className}
      value={value}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      confirmIcon={confirmIcon}
      confirmDisabled={!value.trim()}
      onValueChange={onValueChange}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <Button type="primary" icon={<PlusOutlined />} onClick={() => onOpenChange(true)}>{buttonText}</Button>
    </PersonalSpaceTextPopover>
  )
}
