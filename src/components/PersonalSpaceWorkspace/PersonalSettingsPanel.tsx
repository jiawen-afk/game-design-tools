import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Input, InputNumber, Popconfirm, Segmented, Select, Space, Switch, Tag } from 'antd'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons'

import type { Project } from '../ProjectStorage'
import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'
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
  databaseProfiles: ProjectConnectionProfileSummary[]
  kodoProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  remoteReady: boolean
  onSelectedDatabaseProfileChange: (profileId: string) => void
  onSelectedKodoProfileChange: (profileId: string) => void
  onDatabaseProfileDraftChange: (draft: DatabaseProfileDraft) => void
  onKodoProfileDraftChange: (draft: KodoProfileDraft) => void
  onSaveDatabaseProfile: () => void
  onSaveKodoProfile: () => void
  onVerifyDatabaseProfile: () => void
  onInitializeDatabaseSchema: () => void
  onVerifyKodoProfile: () => void
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
  databaseProfiles,
  kodoProfiles,
  selectedDatabaseProfileId,
  selectedKodoProfileId,
  databaseProfileDraft,
  kodoProfileDraft,
  databaseVerification,
  kodoVerification,
  remoteReady,
  onSelectedDatabaseProfileChange,
  onSelectedKodoProfileChange,
  onDatabaseProfileDraftChange,
  onKodoProfileDraftChange,
  onSaveDatabaseProfile,
  onSaveKodoProfile,
  onVerifyDatabaseProfile,
  onInitializeDatabaseSchema,
  onVerifyKodoProfile,
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
  const databaseProfileOptions = databaseProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))
  const kodoProfileOptions = kodoProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))

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

        <section className="remote-settings-grid" aria-label="远程项目配置">
          <div className="remote-settings-panel">
            <div className="remote-settings-head">
              <span className="field-label">远程数据库</span>
              <Tag color={databaseVerification?.ok ? 'success' : selectedDatabaseProfileId ? 'processing' : undefined}>
                {databaseVerification?.ok ? '已验证' : selectedDatabaseProfileId ? '已选择' : '未配置'}
              </Tag>
            </div>
            <div className="remote-form-grid">
              <label className="form-field">
                <span className="field-label">数据库类型</span>
                <Segmented
                  value={databaseProfileDraft.provider}
                  options={[
                    { label: 'PostgreSQL', value: 'postgresql' },
                    { label: 'MySQL', value: 'mysql' },
                  ]}
                  onChange={(provider) => onDatabaseProfileDraftChange({
                    ...databaseProfileDraft,
                    provider: provider as DatabaseProfileDraft['provider'],
                    port: provider === 'mysql' ? 3306 : 5432,
                  })}
                />
              </label>
              <label className="form-field">
                <span className="field-label">主机</span>
                <Input
                  value={databaseProfileDraft.host}
                  onChange={(event) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, host: event.target.value })}
                  placeholder="db.example.com"
                />
              </label>
              <label className="form-field">
                <span className="field-label">端口</span>
                <InputNumber
                  min={1}
                  max={65535}
                  value={databaseProfileDraft.port}
                  onChange={(value) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, port: Number(value || 0) })}
                />
              </label>
              <label className="form-field">
                <span className="field-label">数据库名</span>
                <Input
                  value={databaseProfileDraft.database}
                  onChange={(event) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, database: event.target.value })}
                  placeholder="game_assets"
                />
              </label>
              <label className="form-field">
                <span className="field-label">用户名</span>
                <Input
                  value={databaseProfileDraft.username}
                  onChange={(event) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, username: event.target.value })}
                  placeholder="asset_user"
                />
              </label>
              <label className="form-field">
                <span className="field-label">密码</span>
                <Input.Password
                  value={databaseProfileDraft.password}
                  onChange={(event) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, password: event.target.value })}
                />
              </label>
              <label className="form-field remote-switch-field">
                <span className="field-label">SSL</span>
                <Switch
                  checked={databaseProfileDraft.ssl}
                  onChange={(ssl) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, ssl })}
                />
              </label>
            </div>
            <Space wrap>
              <Select
                className="remote-profile-select"
                value={selectedDatabaseProfileId || undefined}
                options={databaseProfileOptions}
                placeholder="选择远程数据库配置"
                onChange={onSelectedDatabaseProfileChange}
              />
              <Button icon={<SaveOutlined />} onClick={onSaveDatabaseProfile}>保存数据库配置</Button>
              <Button onClick={onVerifyDatabaseProfile} disabled={!selectedDatabaseProfileId}>测试连接</Button>
              <Button onClick={onInitializeDatabaseSchema} disabled={!selectedDatabaseProfileId}>初始化表结构</Button>
            </Space>
            {databaseVerification && (
              <Alert
                type={databaseVerification.ok ? 'success' : 'warning'}
                showIcon
                title={databaseVerification.message}
              />
            )}
          </div>

          <div className="remote-settings-panel">
            <div className="remote-settings-head">
              <span className="field-label">七牛 Kodo</span>
              <Tag color={kodoVerification?.ok ? 'success' : selectedKodoProfileId ? 'processing' : undefined}>
                {kodoVerification?.ok ? '已验证' : selectedKodoProfileId ? '已选择' : '未配置'}
              </Tag>
            </div>
            <div className="remote-form-grid">
              <label className="form-field">
                <span className="field-label">Access Key</span>
                <Input
                  value={kodoProfileDraft.accessKey}
                  onChange={(event) => onKodoProfileDraftChange({ ...kodoProfileDraft, accessKey: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span className="field-label">Secret Key</span>
                <Input.Password
                  value={kodoProfileDraft.secretKey}
                  onChange={(event) => onKodoProfileDraftChange({ ...kodoProfileDraft, secretKey: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span className="field-label">Bucket</span>
                <Input
                  value={kodoProfileDraft.bucket}
                  onChange={(event) => onKodoProfileDraftChange({ ...kodoProfileDraft, bucket: event.target.value })}
                  placeholder="asset-bucket"
                />
              </label>
              <label className="form-field">
                <span className="field-label">Region</span>
                <Input
                  value={kodoProfileDraft.region}
                  onChange={(event) => onKodoProfileDraftChange({ ...kodoProfileDraft, region: event.target.value })}
                  placeholder="z0"
                />
              </label>
              <label className="form-field">
                <span className="field-label">绑定域名</span>
                <Input
                  value={kodoProfileDraft.domain}
                  onChange={(event) => onKodoProfileDraftChange({ ...kodoProfileDraft, domain: event.target.value })}
                  placeholder="https://cdn.example.com"
                />
              </label>
            </div>
            <Space wrap>
              <Select
                className="remote-profile-select"
                value={selectedKodoProfileId || undefined}
                options={kodoProfileOptions}
                placeholder="选择七牛 Kodo 配置"
                onChange={onSelectedKodoProfileChange}
              />
              <Button icon={<SaveOutlined />} onClick={onSaveKodoProfile}>保存 Kodo 配置</Button>
              <Button onClick={onVerifyKodoProfile} disabled={!selectedKodoProfileId || !activeProject}>验证 Kodo</Button>
            </Space>
            {kodoVerification && (
              <Alert
                type={kodoVerification.ok ? 'success' : 'warning'}
                showIcon
                title={kodoVerification.message}
              />
            )}
          </div>

          <div className="remote-migration-row">
            <Button type="primary" disabled={!remoteReady}>
              迁移到远程
            </Button>
            <Tag color={remoteReady ? 'success' : undefined}>
              {remoteReady ? '远程 DB + 七牛 Kodo 已就绪' : '必须同时配置远程 DB + 远程对象存储'}
            </Tag>
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
