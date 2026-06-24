import { Button, Input, Segmented, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

type ProjectCreateMode = 'local' | 'remote'

interface ProjectCreateCardProps {
  createMode: ProjectCreateMode
  projectName: string
  projectDescription: string
  remoteReadyForCreation: boolean
  remoteReadinessText: string
  onCreateModeChange: (mode: ProjectCreateMode) => void
  onProjectNameChange: (name: string) => void
  onProjectDescriptionChange: (description: string) => void
  onCreateProject: () => void
}

export function ProjectCreateCard({
  createMode,
  projectName,
  projectDescription,
  remoteReadyForCreation,
  remoteReadinessText,
  onCreateModeChange,
  onProjectNameChange,
  onProjectDescriptionChange,
  onCreateProject,
}: ProjectCreateCardProps) {
  return (
    <section className="project-card" aria-label="创建项目">
      <div className="project-card-head">
        <div>
          <span className="field-label">创建项目</span>
          <h3>新的项目空间</h3>
        </div>
        <Segmented
          value={createMode}
          options={[
            { label: '本地项目', value: 'local' },
            { label: '远程项目', value: 'remote' },
          ]}
          onChange={(value) => onCreateModeChange(value as ProjectCreateMode)}
        />
      </div>
      <div className="remote-form-grid">
        <label className="form-field">
          <span className="field-label">项目名称</span>
          <Input
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            onPressEnter={onCreateProject}
            placeholder="例如：地下城怪物包"
          />
        </label>
        <label className="form-field">
          <span className="field-label">项目说明</span>
          <Input
            value={projectDescription}
            onChange={(event) => onProjectDescriptionChange(event.target.value)}
            placeholder="用途、版本或团队说明"
          />
        </label>
      </div>
      <Space wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!projectName.trim() || (createMode === 'remote' && !remoteReadyForCreation)}
          onClick={onCreateProject}
        >
          {createMode === 'remote' ? '创建远程项目' : '创建本地项目'}
        </Button>
        {createMode === 'remote' && (
          <Tag color={remoteReadyForCreation ? 'success' : undefined}>
            {remoteReadyForCreation ? '已验证当前新项目前缀' : remoteReadinessText}
          </Tag>
        )}
      </Space>
    </section>
  )
}
