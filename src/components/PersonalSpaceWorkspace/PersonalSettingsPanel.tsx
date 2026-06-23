import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Input, Popconfirm, Select, Space, Tag } from 'antd'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons'

import type { Project } from '../ProjectStorage'
import type { PersonalSpaceDirectoryHandle } from './personalSpaceFileStorage'

type ProjectSelector = {
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (projectId: string) => void
}

interface PersonalSettingsPanelProps {
  projects: Project[]
  activeProject: Project | null
  projectSelector: ProjectSelector
  storageDirectory: string
  deleteResourcesWithContent: boolean
  savedSettings: boolean
  directoryHandle: PersonalSpaceDirectoryHandle | null
  onCreateLocalProject: (name: string, description: string) => void | Promise<void>
  onRenameProject: (projectId: string, name: string, description: string) => void | Promise<void>
  onDeleteProject: (projectId: string) => void | Promise<void>
  onStorageDirectoryChange: (storageDirectory: string) => void
  onChooseStorageDirectory: () => void
  onOpenStorageDirectory: () => void
  onDeleteResourcesWithContentChange: (deleteResourcesWithContent: boolean) => void
  onSaveSettings: () => void
}

export function PersonalSettingsPanel({
  projects,
  activeProject,
  projectSelector,
  storageDirectory,
  deleteResourcesWithContent,
  savedSettings,
  directoryHandle,
  onCreateLocalProject,
  onRenameProject,
  onDeleteProject,
  onStorageDirectoryChange,
  onChooseStorageDirectory,
  onOpenStorageDirectory,
  onDeleteResourcesWithContentChange,
  onSaveSettings,
}: PersonalSettingsPanelProps) {
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [projectNameDraft, setProjectNameDraft] = useState(activeProject?.name ?? '')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState(activeProject?.description ?? '')

  useEffect(() => {
    setProjectNameDraft(activeProject?.name ?? '')
    setProjectDescriptionDraft(activeProject?.description ?? '')
  }, [activeProject])

  const createProject = async () => {
    const name = newProjectName.trim()
    if (!name) return
    await onCreateLocalProject(name, newProjectDescription)
    setNewProjectName('')
    setNewProjectDescription('')
  }

  const editProject = async () => {
    if (!activeProject || !projectNameDraft.trim()) return
    await onRenameProject(activeProject.id, projectNameDraft, projectDescriptionDraft)
  }

  return (
    <section className="space-panel">
      <div className="form-stack">
        <section className="project-settings-grid" aria-label="项目管理">
          <div className="project-settings-head">
            <div>
              <span className="field-label">当前项目</span>
              <Space wrap>
                <Tag color={activeProject?.mode === 'local' ? 'processing' : activeProject?.mode === 'remote' ? 'success' : undefined}>
                  {activeProject?.mode === 'local' ? '本地模式' : activeProject?.mode === 'remote' ? '远程模式' : '未选择项目'}
                </Tag>
                <span>{projects.length} 个项目</span>
              </Space>
            </div>
            <Select
              className="project-selector"
              value={projectSelector.value}
              options={projectSelector.options}
              placeholder="选择项目"
              disabled={projectSelector.options.length === 0}
              onChange={projectSelector.onChange}
            />
          </div>

          <div className="project-actions">
            <label className="form-field">
              <span className="field-label">创建项目</span>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  onPressEnter={() => void createProject()}
                  placeholder="项目名称"
                />
                <Button type="primary" icon={<PlusOutlined />} disabled={!newProjectName.trim()} onClick={() => void createProject()}>
                  创建项目
                </Button>
              </Space.Compact>
            </label>
            <Input
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="项目说明"
            />
          </div>

          <div className="project-actions">
            <label className="form-field">
              <span className="field-label">编辑项目</span>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={projectNameDraft}
                  disabled={!activeProject}
                  onChange={(event) => setProjectNameDraft(event.target.value)}
                  onPressEnter={() => void editProject()}
                  placeholder="项目名称"
                />
                <Button icon={<EditOutlined />} disabled={!activeProject || !projectNameDraft.trim()} onClick={() => void editProject()}>
                  编辑项目
                </Button>
              </Space.Compact>
            </label>
            <Input
              value={projectDescriptionDraft}
              disabled={!activeProject}
              onChange={(event) => setProjectDescriptionDraft(event.target.value)}
              placeholder="项目说明"
            />
          </div>

          <div className="project-delete-row">
            <Popconfirm
              title="删除项目"
              description="第一版会硬删除当前项目记录，资源对象删除将在后续迁移清理流程中接入。"
              okText="删除项目"
              cancelText="取消"
              onConfirm={() => activeProject && void onDeleteProject(activeProject.id)}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!activeProject}>
                删除项目
              </Button>
            </Popconfirm>
          </div>
        </section>

        <label className="form-field">
          <span className="field-label">资源存储目录</span>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              prefix={<FolderOpenOutlined />}
              value={storageDirectory}
              onChange={(event) => onStorageDirectoryChange(event.target.value)}
              placeholder="例如 D:\\GameAssets\\PersonalSpace"
            />
            <Button icon={<FolderOpenOutlined />} onClick={onChooseStorageDirectory}>
              选择授权目录
            </Button>
          </Space.Compact>
        </label>

        <Checkbox
          checked={deleteResourcesWithContent}
          onChange={(event) => onDeleteResourcesWithContentChange(event.target.checked)}
        >
          删除内容同时删除资源
        </Checkbox>

        <Button
          type="primary"
          icon={savedSettings ? <CheckCircleOutlined /> : <SaveOutlined />}
          onClick={onSaveSettings}
        >
          {savedSettings ? '已保存' : '保存设置'}
        </Button>

        <Alert
          type={directoryHandle ? 'info' : 'warning'}
          showIcon
          title={directoryHandle ? '已授权本地资源目录' : '需要授权资源目录'}
          description={directoryHandle
            ? (
              <div className="settings-directory-actions">
                <span>收藏和上传的新资源会写入授权目录作为存储目标，并按公共图片、精灵图、配音分类管理。</span>
                <Button
                  size="small"
                  icon={<FolderOpenOutlined />}
                  disabled={!directoryHandle}
                  onClick={onOpenStorageDirectory}
                >
                  在文件资源管理器中打开
                </Button>
              </div>
            )
            : '请先选择授权目录，授权完成后即可使用角色、剧情编排和素材模块。'}
        />
      </div>
    </section>
  )
}
