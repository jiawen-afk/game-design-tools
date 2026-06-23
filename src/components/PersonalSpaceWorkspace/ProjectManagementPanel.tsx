import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Input, InputNumber, Popconfirm, Segmented, Select, Space, Switch, Tabs, Tag } from 'antd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
  SwapOutlined,
} from '@ant-design/icons'

import { createProjectId, type Project } from '../ProjectStorage'
import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'

interface ProjectManagementPanelProps {
  projects: Project[]
  enabledProjectId: string
  selectedProjectId: string
  activeProject: Project | null
  migratingProjectId: string
  remoteReady: boolean
  databaseProfiles: ProjectConnectionProfileSummary[]
  kodoProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  kodoVerificationProjectId: string
  databaseSchemaReady: boolean
  onSelectedProjectChange: (projectId: string) => void
  onCreateLocalProject: (name: string, description: string) => void | Promise<void>
  onCreateRemoteProject: (projectId: string, name: string, description: string) => void | Promise<void>
  onRenameProject: (projectId: string, name: string, description: string) => void | Promise<void>
  onDeleteProject: (projectId: string) => void | Promise<void>
  onEnableProject: (projectId: string) => void
  onDisableProject: () => void
  onMigrateToRemote: () => void
  onSelectedDatabaseProfileChange: (profileId: string) => void
  onSelectedKodoProfileChange: (profileId: string) => void
  onDatabaseProfileDraftChange: (draft: DatabaseProfileDraft) => void
  onKodoProfileDraftChange: (draft: KodoProfileDraft) => void
  onSaveDatabaseProfile: () => void
  onDeleteDatabaseProfile: () => void
  onSaveKodoProfile: () => void
  onDeleteKodoProfile: () => void
  onVerifyDatabaseProfile: () => void
  onInitializeDatabaseSchema: () => void
  onVerifyKodoProfile: (projectId: string) => void
  onBack: () => void
}

export function ProjectManagementPanel({
  projects,
  enabledProjectId,
  selectedProjectId,
  activeProject,
  migratingProjectId,
  remoteReady,
  databaseProfiles,
  kodoProfiles,
  selectedDatabaseProfileId,
  selectedKodoProfileId,
  databaseProfileDraft,
  kodoProfileDraft,
  databaseVerification,
  kodoVerification,
  kodoVerificationProjectId,
  databaseSchemaReady,
  onSelectedProjectChange,
  onCreateLocalProject,
  onCreateRemoteProject,
  onRenameProject,
  onDeleteProject,
  onEnableProject,
  onDisableProject,
  onMigrateToRemote,
  onSelectedDatabaseProfileChange,
  onSelectedKodoProfileChange,
  onDatabaseProfileDraftChange,
  onKodoProfileDraftChange,
  onSaveDatabaseProfile,
  onDeleteDatabaseProfile,
  onSaveKodoProfile,
  onDeleteKodoProfile,
  onVerifyDatabaseProfile,
  onInitializeDatabaseSchema,
  onVerifyKodoProfile,
  onBack,
}: ProjectManagementPanelProps) {
  const [createMode, setCreateMode] = useState<'local' | 'remote'>('local')
  const [remoteCreationProjectId, setRemoteCreationProjectId] = useState(() => createProjectId())
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const [projectNameDraft, setProjectNameDraft] = useState(selectedProject?.name ?? '')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState(selectedProject?.description ?? '')

  useEffect(() => {
    setProjectNameDraft(selectedProject?.name ?? '')
    setProjectDescriptionDraft(selectedProject?.description ?? '')
  }, [selectedProject])

  const databaseProfileOptions = databaseProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))
  const kodoProfileOptions = kodoProfiles.map((profile) => ({
    label: `${profile.displayName} (${profile.redactedSummary})`,
    value: profile.id,
  }))
  const selectedRemoteVerificationProjectId = createMode === 'remote'
    ? remoteCreationProjectId
    : selectedProject?.id || activeProject?.id || enabledProjectId
  const remoteReadyForCreation = remoteReady && kodoVerificationProjectId === remoteCreationProjectId
  const remoteReadyForSelectedProject = Boolean(selectedProject && remoteReady && kodoVerificationProjectId === selectedProject.id)
  const remoteReadinessText = remoteReady ? '远程 DB + 七牛 Kodo 已就绪' : '必须完成 DB 验证、初始化表结构和 Kodo 验证'
  const selectedProjectMigrating = Boolean(selectedProject && migratingProjectId === selectedProject.id)

  const createProject = async () => {
    const name = newProjectName.trim()
    if (!name) return
    if (createMode === 'remote') {
      if (!remoteReadyForCreation) return
      await onCreateRemoteProject(remoteCreationProjectId, name, newProjectDescription)
      setRemoteCreationProjectId(createProjectId())
    } else {
      await onCreateLocalProject(name, newProjectDescription)
    }
    setNewProjectName('')
    setNewProjectDescription('')
  }

  const editProject = async () => {
    if (!selectedProject || !projectNameDraft.trim()) return
    await onRenameProject(selectedProject.id, projectNameDraft, projectDescriptionDraft)
  }

  const createTab = (
    <div className="project-create-grid">
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
            onChange={(value) => setCreateMode(value as 'local' | 'remote')}
          />
        </div>
        <div className="remote-form-grid">
          <label className="form-field">
            <span className="field-label">项目名称</span>
            <Input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onPressEnter={() => void createProject()}
              placeholder="例如：地下城怪物包"
            />
          </label>
          <label className="form-field">
            <span className="field-label">项目说明</span>
            <Input
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="用途、版本或团队说明"
            />
          </label>
        </div>
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!newProjectName.trim() || (createMode === 'remote' && !remoteReadyForCreation)}
            onClick={() => void createProject()}
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

      {createMode === 'remote' && (
        <RemoteProjectSettings
          databaseProfiles={databaseProfiles}
          kodoProfiles={kodoProfiles}
          selectedDatabaseProfileId={selectedDatabaseProfileId}
          selectedKodoProfileId={selectedKodoProfileId}
          databaseProfileDraft={databaseProfileDraft}
          kodoProfileDraft={kodoProfileDraft}
          databaseVerification={databaseVerification}
          kodoVerification={kodoVerification}
          kodoVerificationProjectId={kodoVerificationProjectId}
          databaseSchemaReady={databaseSchemaReady}
          databaseProfileOptions={databaseProfileOptions}
          kodoProfileOptions={kodoProfileOptions}
          selectedVerificationProjectId={selectedRemoteVerificationProjectId}
          onSelectedDatabaseProfileChange={onSelectedDatabaseProfileChange}
          onSelectedKodoProfileChange={onSelectedKodoProfileChange}
          onDatabaseProfileDraftChange={onDatabaseProfileDraftChange}
          onKodoProfileDraftChange={onKodoProfileDraftChange}
          onSaveDatabaseProfile={onSaveDatabaseProfile}
          onDeleteDatabaseProfile={onDeleteDatabaseProfile}
          onSaveKodoProfile={onSaveKodoProfile}
          onDeleteKodoProfile={onDeleteKodoProfile}
          onVerifyDatabaseProfile={onVerifyDatabaseProfile}
          onInitializeDatabaseSchema={onInitializeDatabaseSchema}
          onVerifyKodoProfile={onVerifyKodoProfile}
        />
      )}
    </div>
  )

  const projectTabContent = selectedProject ? (
    <div className="project-create-grid">
      <section className="project-card" aria-label="编辑项目">
        <div className="project-card-head">
          <div>
            <span className="field-label">编辑项目</span>
            <h3>{selectedProject.name}</h3>
          </div>
          <Space wrap>
            <Tag color={selectedProject.mode === 'local' ? 'processing' : 'success'}>
              {selectedProject.mode === 'local' ? '本地模式' : '远程模式'}
            </Tag>
            <Switch
              checkedChildren="启用"
              unCheckedChildren="停用"
              checked={enabledProjectId === selectedProject.id}
              disabled={selectedProjectMigrating}
              onChange={(checked) => {
                if (checked) onEnableProject(selectedProject.id)
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
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onPressEnter={() => void editProject()}
              placeholder="项目名称"
            />
          </label>
          <label className="form-field">
            <span className="field-label">项目说明</span>
            <Input
              value={projectDescriptionDraft}
              onChange={(event) => setProjectDescriptionDraft(event.target.value)}
              placeholder="项目说明"
            />
          </label>
        </div>
        <Space wrap>
          <Button icon={<EditOutlined />} disabled={selectedProjectMigrating || !projectNameDraft.trim()} onClick={() => void editProject()}>
            编辑项目
          </Button>
          {selectedProject.mode === 'local' && (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              loading={selectedProjectMigrating}
              disabled={selectedProjectMigrating || enabledProjectId !== selectedProject.id || !remoteReadyForSelectedProject}
              onClick={onMigrateToRemote}
            >
              {selectedProjectMigrating ? '迁移中' : '迁移到远程'}
            </Button>
          )}
          <Popconfirm
            title="删除项目"
            description="将硬删除项目记录和项目内资产数据。"
            okText="删除项目"
            cancelText="取消"
            disabled={selectedProjectMigrating}
            onConfirm={() => void onDeleteProject(selectedProject.id)}
          >
            <Button danger icon={<DeleteOutlined />} disabled={selectedProjectMigrating}>删除项目</Button>
          </Popconfirm>
        </Space>
      </section>

      {selectedProject.mode === 'local' && (
        <RemoteProjectSettings
          databaseProfiles={databaseProfiles}
          kodoProfiles={kodoProfiles}
          selectedDatabaseProfileId={selectedDatabaseProfileId}
          selectedKodoProfileId={selectedKodoProfileId}
          databaseProfileDraft={databaseProfileDraft}
          kodoProfileDraft={kodoProfileDraft}
          databaseVerification={databaseVerification}
          kodoVerification={kodoVerification}
          kodoVerificationProjectId={kodoVerificationProjectId}
          databaseSchemaReady={databaseSchemaReady}
          databaseProfileOptions={databaseProfileOptions}
          kodoProfileOptions={kodoProfileOptions}
          selectedVerificationProjectId={selectedProject.id}
          onSelectedDatabaseProfileChange={onSelectedDatabaseProfileChange}
          onSelectedKodoProfileChange={onSelectedKodoProfileChange}
          onDatabaseProfileDraftChange={onDatabaseProfileDraftChange}
          onKodoProfileDraftChange={onKodoProfileDraftChange}
          onSaveDatabaseProfile={onSaveDatabaseProfile}
          onDeleteDatabaseProfile={onDeleteDatabaseProfile}
          onSaveKodoProfile={onSaveKodoProfile}
          onDeleteKodoProfile={onDeleteKodoProfile}
          onVerifyDatabaseProfile={onVerifyDatabaseProfile}
          onInitializeDatabaseSchema={onInitializeDatabaseSchema}
          onVerifyKodoProfile={onVerifyKodoProfile}
        />
      )}
    </div>
  ) : (
    <Alert type="info" showIcon title="请选择一个项目，或使用左侧 + 创建项目。" />
  )

  const projectTabItems = useMemo(() => [
    {
      key: 'create',
      label: <PlusOutlined aria-label="创建项目" />,
      children: createTab,
    },
    ...projects.map((project) => ({
      key: project.id,
      label: project.name,
      children: projectTabContent,
    })),
  ], [projects, createTab, projectTabContent])

  return (
    <section className="project-management-page" aria-label="项目管理">
      <div className="project-management-head">
        <div>
          <p className="kicker">项目空间</p>
          <h2 id="project-management-title">项目管理</h2>
          <p>项目标签只用于查看和编辑，卡片里的启用开关决定当前数据写入目标。</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回工作台</Button>
      </div>
      <Tabs
        className="project-management-tabs"
        activeKey={selectedProjectId || 'create'}
        onChange={onSelectedProjectChange}
        items={projectTabItems}
      />
    </section>
  )
}

interface RemoteProjectSettingsProps {
  databaseProfiles: ProjectConnectionProfileSummary[]
  kodoProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  kodoVerificationProjectId: string
  databaseSchemaReady: boolean
  databaseProfileOptions: Array<{ label: string; value: string }>
  kodoProfileOptions: Array<{ label: string; value: string }>
  selectedVerificationProjectId: string
  onSelectedDatabaseProfileChange: (profileId: string) => void
  onSelectedKodoProfileChange: (profileId: string) => void
  onDatabaseProfileDraftChange: (draft: DatabaseProfileDraft) => void
  onKodoProfileDraftChange: (draft: KodoProfileDraft) => void
  onSaveDatabaseProfile: () => void
  onDeleteDatabaseProfile: () => void
  onSaveKodoProfile: () => void
  onDeleteKodoProfile: () => void
  onVerifyDatabaseProfile: () => void
  onInitializeDatabaseSchema: () => void
  onVerifyKodoProfile: (projectId: string) => void
}

function RemoteProjectSettings({
  databaseProfiles,
  kodoProfiles,
  selectedDatabaseProfileId,
  selectedKodoProfileId,
  databaseProfileDraft,
  kodoProfileDraft,
  databaseVerification,
  kodoVerification,
  kodoVerificationProjectId,
  databaseSchemaReady,
  databaseProfileOptions,
  kodoProfileOptions,
  selectedVerificationProjectId,
  onSelectedDatabaseProfileChange,
  onSelectedKodoProfileChange,
  onDatabaseProfileDraftChange,
  onKodoProfileDraftChange,
  onSaveDatabaseProfile,
  onDeleteDatabaseProfile,
  onSaveKodoProfile,
  onDeleteKodoProfile,
  onVerifyDatabaseProfile,
  onInitializeDatabaseSchema,
  onVerifyKodoProfile,
}: RemoteProjectSettingsProps) {
  return (
    <section className="remote-settings-grid" aria-label="远程项目配置">
      <div className="remote-settings-panel">
        <div className="remote-settings-head">
          <span className="field-label">远程数据库</span>
          <Space wrap>
            <Tag color={databaseVerification?.ok ? 'success' : selectedDatabaseProfileId ? 'processing' : undefined}>
              {databaseVerification?.ok ? '已验证' : selectedDatabaseProfileId ? '已选择' : '未配置'}
            </Tag>
            <Tag color={databaseSchemaReady ? 'success' : undefined}>
              {databaseSchemaReady ? '表结构已初始化' : '待初始化表结构'}
            </Tag>
          </Space>
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
            placeholder={databaseProfiles.length > 0 ? '选择远程数据库配置' : '暂无数据库配置'}
            onChange={onSelectedDatabaseProfileChange}
          />
          <Button icon={<SaveOutlined />} onClick={onSaveDatabaseProfile}>保存数据库配置</Button>
          <Popconfirm
            title="删除数据库配置"
            description="只删除本机保存的连接配置，不会删除远程数据库或表数据。"
            okText="删除配置"
            cancelText="取消"
            onConfirm={onDeleteDatabaseProfile}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!selectedDatabaseProfileId}>
              删除数据库配置
            </Button>
          </Popconfirm>
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
          <Tag color={kodoVerification?.ok && kodoVerificationProjectId === selectedVerificationProjectId ? 'success' : selectedKodoProfileId ? 'processing' : undefined}>
            {kodoVerification?.ok && kodoVerificationProjectId === selectedVerificationProjectId ? '已验证' : selectedKodoProfileId ? '已选择' : '未配置'}
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
            placeholder={kodoProfiles.length > 0 ? '选择七牛 Kodo 配置' : '暂无 Kodo 配置'}
            onChange={onSelectedKodoProfileChange}
          />
          <Button icon={<SaveOutlined />} onClick={onSaveKodoProfile}>保存 Kodo 配置</Button>
          <Popconfirm
            title="删除 Kodo 配置"
            description="只删除本机保存的对象存储配置，不会删除七牛 Kodo 中的对象。"
            okText="删除配置"
            cancelText="取消"
            onConfirm={onDeleteKodoProfile}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!selectedKodoProfileId}>
              删除 Kodo 配置
            </Button>
          </Popconfirm>
          <Button onClick={() => onVerifyKodoProfile(selectedVerificationProjectId)} disabled={!selectedKodoProfileId || !selectedVerificationProjectId}>
            验证 Kodo
          </Button>
        </Space>
        {kodoVerification && (
          <Alert
            type={kodoVerification.ok ? 'success' : 'warning'}
            showIcon
            title={kodoVerification.message}
          />
        )}
      </div>
    </section>
  )
}
