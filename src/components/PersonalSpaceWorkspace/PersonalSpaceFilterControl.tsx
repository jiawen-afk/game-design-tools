import { Checkbox, Select } from 'antd'

export interface PersonalSpaceFilterOption {
  label: string
  value: string
}

interface PersonalSpaceFilterControlProps {
  className: string
  value: string
  defaultValue: string
  options: PersonalSpaceFilterOption[]
  onlyStarred: boolean
  onChange: (value: string) => void
  onOnlyStarredChange: (checked: boolean) => void
}

export function PersonalSpaceFilterControl({
  className,
  value,
  defaultValue,
  options,
  onlyStarred,
  onChange,
  onOnlyStarredChange,
}: PersonalSpaceFilterControlProps) {
  return (
    <div className={className}>
      <span className="field-label">筛选</span>
      <Select
        showSearch
        value={value}
        options={options}
        filterOption={(input, option) => {
          if (!input) return true
          if (option?.value === defaultValue) return false
          return String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }}
        onChange={onChange}
      />
      <Checkbox
        checked={onlyStarred}
        onChange={(event) => onOnlyStarredChange(event.target.checked)}
      >
        仅星标
      </Checkbox>
    </div>
  )
}
