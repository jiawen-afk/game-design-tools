import { Input } from 'antd'

interface ProjectMetadataFieldsProps {
  name: string
  description: string
  namePlaceholder: string
  descriptionPlaceholder: string
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onSubmit: () => void
}

export function ProjectMetadataFields({
  name,
  description,
  namePlaceholder,
  descriptionPlaceholder,
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: ProjectMetadataFieldsProps) {
  return (
    <div className="remote-form-grid">
      <label className="form-field">
        <span className="field-label">项目名称</span>
        <Input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onPressEnter={onSubmit}
          placeholder={namePlaceholder}
        />
      </label>
      <label className="form-field">
        <span className="field-label">项目说明</span>
        <Input
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder={descriptionPlaceholder}
        />
      </label>
    </div>
  )
}
