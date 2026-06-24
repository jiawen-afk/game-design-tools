import { Button, Input, Popconfirm, Space, Switch, Tag } from 'antd'
import { DeleteOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons'

import type { Project } from '../ProjectStorage'

interface ProjectDetailsCardProps {
  project: Project
  enabledProjectId: string
  projectNameDraft: string
  projectDescriptionDraft: string
  migrating: boolean
  remoteReadyForSelectedProject: boolean
  onProjectNameDraftChange: (name: string) => void
  onProjectDescriptionDraftChange: (description: string) => void
  onEditProject: () => void
  onEnableProject: (projectId: string) => void
  onDisableProject: () => void
  onMigrateToRemote: () => void
  onDeleteProject: (projectId: string) => void
}

export function ProjectDetailsCard({
  project,
  enabledProjectId,
  projectNameDraft,
  projectDescriptionDraft,
  migrating,
  remoteReadyForSelectedProject,
  onProjectNameDraftChange,
  onProjectDescriptionDraftChange,
  onEditProject,
  onEnableProject,
  onDisableProject,
  onMigrateToRemote,
  onDeleteProject,
}: ProjectDetailsCardProps) {
  return (
    <section className="project-card" aria-label="编辑项目">
      <div className="project-card-head">
        <div>
          <span className="field-label">编辑项目</span>
          <h3>{project.name}</h3>
        </div>
        <Space wrap>
          <Tag color={project.mode === 'local' ? 'processing' : 'success'}>
            {project.mode === 'local' ? '本地模式' : '远程模式'}
          </Tag>
          <Switch
            checkedChildren="启用"
            unCheckedChildren="停用"
            checked={enabledProjectId === project.id}
            disabled={migrating}
            onChange={(checked) => {
              if (checked) onEnableProject(project.id)
              else onDisableProject()
            }}
          />
        </Space>
      </div>
      <div className="remote-form-grid">
        <label className="form-field">
          <span className="field-label">项目名称</span>
          <Input
            value={projectNameDraft}
            onChange={(event) => onProjectNameDraftChange(event.target.value)}
            onPressEnter={onEditProject}
            placeholder="项目名称"
          />
        </label>
        <label className="form-field">
          <span className="field-label">项目说明</span>
          <Input
            value={projectDescriptionDraft}
            onChange={(event) => onProjectDescriptionDraftChange(event.target.value)}
            placeholder="项目说明"
          />
        </label>
      </div>
      <Space wrap>
        <Button icon={<EditOutlined />} disabled={migrating || !projectNameDraft.trim()} onClick={onEditProject}>
          编辑项目
        </Button>
        {project.mode === 'local' && (
          <Button
            type="primary"
            icon={<SwapOutlined />}
            loading={migrating}
            disabled={migrating || enabledProjectId !== project.id || !remoteReadyForSelectedProject}
            onClick={onMigrateToRemote}
          >
            {migrating ? '迁移中' : '迁移到远程'}
          </Button>
        )}
        <Popconfirm
          title="删除项目"
          description="将硬删除项目记录和项目内资产数据。"
          okText="删除项目"
          cancelText="取消"
          disabled={migrating}
          onConfirm={() => onDeleteProject(project.id)}
        >
          <Button danger icon={<DeleteOutlined />} disabled={migrating}>删除项目</Button>
        </Popconfirm>
      </Space>
    </section>
  )
}
