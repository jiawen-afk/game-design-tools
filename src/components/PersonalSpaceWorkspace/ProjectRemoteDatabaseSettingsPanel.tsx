import { Alert, Button, Input, InputNumber, Popconfirm, Segmented, Select, Space, Switch, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import { ProjectRemoteProfileSaveButton } from './ProjectRemoteProfileSaveButton'

interface ProjectRemoteDatabaseSettingsPanelProps {
  databaseProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  databaseProfileMode: 'create' | 'edit'
  databaseDraftTestState: 'untested' | 'passed' | 'failed'
  databaseDraftTested: boolean
  databaseProfileDraft: DatabaseProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  databaseSchemaReady: boolean
  databaseProfileOptions: Array<{ label: string; value: string }>
  onSelectedDatabaseProfileChange: (profileId: string) => void
  onDatabaseProfileDraftChange: (draft: DatabaseProfileDraft) => void
  onAddDatabaseProfile: () => void
  onSaveDatabaseProfile: () => boolean | void | Promise<boolean | void>
  onDeleteDatabaseProfile: () => void
  onVerifyDatabaseProfile: () => void
  onInitializeDatabaseSchema: () => void
}

export function ProjectRemoteDatabaseSettingsPanel({
  databaseProfiles,
  selectedDatabaseProfileId,
  databaseProfileMode,
  databaseDraftTestState,
  databaseDraftTested,
  databaseProfileDraft,
  databaseVerification,
  databaseSchemaReady,
  databaseProfileOptions,
  onSelectedDatabaseProfileChange,
  onDatabaseProfileDraftChange,
  onAddDatabaseProfile,
  onSaveDatabaseProfile,
  onDeleteDatabaseProfile,
  onVerifyDatabaseProfile,
  onInitializeDatabaseSchema,
}: ProjectRemoteDatabaseSettingsPanelProps) {
  return (
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
      <div className="remote-form-grid remote-database-form-grid">
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
        <label className="form-field remote-port-field">
          <span className="field-label">端口</span>
          <InputNumber
            min={1}
            max={65535}
            value={databaseProfileDraft.port}
            onChange={(value) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, port: Number(value || 0) })}
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
            placeholder={databaseProfileMode === 'edit' ? '留空表示不修改密码' : '数据库密码'}
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
        <label className="remote-inline-switch">
          <span className="field-label">SSL</span>
          <Switch
            checked={databaseProfileDraft.ssl}
            size="small"
            onChange={(ssl) => onDatabaseProfileDraftChange({ ...databaseProfileDraft, ssl })}
          />
        </label>
      </div>
      <div className="remote-profile-toolbar">
        <Select
          className="remote-profile-select"
          value={selectedDatabaseProfileId || undefined}
          options={databaseProfileOptions}
          placeholder={databaseProfiles.length > 0 ? '选择远程数据库配置' : '暂无数据库配置'}
          onChange={onSelectedDatabaseProfileChange}
        />
        <Button icon={<PlusOutlined />} onClick={onAddDatabaseProfile}>添加数据库配置</Button>
      </div>
      <div className="remote-profile-actions">
        <ProjectRemoteProfileSaveButton
          testState={databaseDraftTestState}
          tested={databaseDraftTested}
          label="保存当前数据库配置"
          failureDescription="保存后项目仍可能无法连接此数据库。"
          onSave={onSaveDatabaseProfile}
        />
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
        <Button onClick={onVerifyDatabaseProfile}>测试连接</Button>
        <Button onClick={onInitializeDatabaseSchema} disabled={!selectedDatabaseProfileId}>初始化表结构</Button>
      </div>
      {databaseVerification && (
        <Alert
          type={databaseVerification.ok ? 'success' : 'warning'}
          showIcon
          title={databaseVerification.message}
        />
      )}
    </div>
  )
}
