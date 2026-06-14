import { useEffect, useState } from 'react'
import { InputNumber } from 'antd'
import type { InputNumberProps } from 'antd'

export interface CommittedNumberInputProps extends Omit<InputNumberProps<number>, 'value' | 'onChange' | 'onPressEnter'> {
  value: number
  onCommit: (value: number) => void
}

export function CommittedNumberInput({ value, onBlur, onCommit, ...props }: CommittedNumberInputProps) {
  const [draft, setDraft] = useState<number | null>(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    if (draft === null) {
      setDraft(value)
      return
    }
    onCommit(draft)
  }

  return (
    <InputNumber
      {...props}
      value={draft}
      onChange={setDraft}
      onBlur={(event) => {
        commit()
        onBlur?.(event)
      }}
      onPressEnter={commit}
    />
  )
}
