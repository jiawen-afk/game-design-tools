import { useState } from 'react'

interface UseCreateNamePopoverParams {
  value: string
  onValueChange: (value: string) => void
  onConfirm: (value: string) => void
}

export function useCreateNamePopover({
  value,
  onValueChange,
  onConfirm,
}: UseCreateNamePopoverParams) {
  const [open, setOpen] = useState(false)

  const cancelCreateName = () => {
    onValueChange('')
    setOpen(false)
  }

  const confirmCreateName = () => {
    if (!value.trim()) return
    onConfirm(value)
    setOpen(false)
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setOpen(true)
    else cancelCreateName()
  }

  return {
    open,
    onOpenChange,
    confirmCreateName,
    cancelCreateName,
  }
}
