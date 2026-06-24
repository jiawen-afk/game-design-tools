import { Alert, Button, Input, InputNumber, Popconfirm, Segmented, Select, Space, Switch, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'

import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'

interface RemoteProjectSettingsProps {
  databaseProfiles: ProjectConnectionProfileSummary[]
  kodoProfiles: ProjectConnectionProfileSummary[]
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  databaseProfileMode: 'create' | 'edit'
  kodoProfileMode: 'create' | 'edit'
  databaseDraftTestState: 'untested' | 'passed' | 'failed'
  kodoDraftTestState: 'untested' | 'passed' | 'failed'
  databaseDraftTested: boolean
  kodoDraftTested: boolean
  databaseProfileDraft: DatabaseProfileDraft
  kodoProfileDraft: KodoProfileDraft
  databaseVerification: ProjectConnectionVerificationResult | null
  kodoVerification: ProjectConnectionVerificationResult | null
  kodoVerificationProjectId: string
  databaseSchemaReady: boolean
  databaseProfileOptions: Array<{ label: string; value: string }>
  kodoProfileOptions: Array<{ label: string; value: string }>
  selectedVerificationProjectId: string
  linkTargetProjectId: string
  linkReady: boolean
  onSelectedDatabaseProfileChange: (profileId: string) => void
  onSelectedKodoProfileChange: (profileId: string) => void
  onDatabaseProfileDraftChange: (draft: DatabaseProfileDraft) => void
  onKodoProfileDraftChange: (draft: KodoProfileDraft) => void
  onAddDatabaseProfile: () => void
  onAddKodoProfile: () => void
  onSaveDatabaseProfile: () => boolean | void | Promise<boolean | void>
  onDeleteDatabaseProfile: () => void
  onSaveKodoProfile: () => boolean | void | Promise<boolean | void>
  onDeleteKodoProfile: () => void
  onVerifyDatabaseProfile: () => void
  onInitializeDatabaseSchema: () => void
  onVerifyKodoProfile: (projectId: string) => void
  onUpdateRemoteProjectLinks: (projectId: string) => boolean | void | Promise<boolean | void>
}

export function RemoteProjectSettings({
  databaseProfiles,
  kodoProfiles,
  selectedDatabaseProfileId,
  selectedKodoProfileId,
  databaseProfileMode,
  kodoProfileMode,
  databaseDraftTestState,
  kodoDraftTestState,
  databaseDraftTested,
  kodoDraftTested,
  databaseProfileDraft,
  kodoProfileDraft,
  databaseVerification,
  kodoVerification,
  kodoVerificationProjectId,
  databaseSchemaReady,
  databaseProfileOptions,
  kodoProfileOptions,
  selectedVerificationProjectId,
  linkTargetProjectId,
  linkReady,
  onSelectedDatabaseProfileChange,
  onSelectedKodoProfileChange,
  onDatabaseProfileDraftChange,
  onKodoProfileDraftChange,
  onAddDatabaseProfile,
  onAddKodoProfile,
  onSaveDatabaseProfile,
  onDeleteDatabaseProfile,
  onSaveKodoProfile,
  onDeleteKodoProfile,
  onVerifyDatabaseProfile,
  onInitializeDatabaseSchema,
  onVerifyKodoProfile,
  onUpdateRemoteProjectLinks,
}: RemoteProjectSettingsProps) {
  return (
    <section className="remote-settings-stack" aria-label="远程项目配置">
      <div className="remote-settings-grid">
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
            {databaseDraftTestState === 'failed' ? (
              <Popconfirm
                title="测试失败，仍然保存？"
                description="保存后项目仍可能无法连接此数据库。"
                okText="仍然保存"
                cancelText="取消"
                onConfirm={() => void onSaveDatabaseProfile()}
              >
                <Button icon={<SaveOutlined />} disabled={!databaseDraftTested}>
                  保存当前数据库配置
                </Button>
              </Popconfirm>
            ) : (
              <Button icon={<SaveOutlined />} disabled={!databaseDraftTested} onClick={() => void onSaveDatabaseProfile()}>
                保存当前数据库配置
              </Button>
            )}
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
                placeholder={kodoProfileMode === 'edit' ? '留空表示不修改 Secret Key' : 'Secret Key'}
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
          <div className="remote-profile-toolbar">
            <Select
              className="remote-profile-select"
              value={selectedKodoProfileId || undefined}
              options={kodoProfileOptions}
              placeholder={kodoProfiles.length > 0 ? '选择七牛 Kodo 配置' : '暂无 Kodo 配置'}
              onChange={onSelectedKodoProfileChange}
            />
            <Button icon={<PlusOutlined />} onClick={onAddKodoProfile}>添加 Kodo 配置</Button>
          </div>
          <div className="remote-profile-actions">
            {kodoDraftTestState === 'failed' ? (
              <Popconfirm
                title="测试失败，仍然保存？"
                description="保存后项目仍可能无法访问此对象存储。"
                okText="仍然保存"
                cancelText="取消"
                onConfirm={() => void onSaveKodoProfile()}
              >
                <Button icon={<SaveOutlined />} disabled={!kodoDraftTested}>
                  保存当前 Kodo 配置
                </Button>
              </Popconfirm>
            ) : (
              <Button icon={<SaveOutlined />} disabled={!kodoDraftTested} onClick={() => void onSaveKodoProfile()}>
                保存当前 Kodo 配置
              </Button>
            )}
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
            <Button onClick={() => onVerifyKodoProfile(selectedVerificationProjectId)} disabled={!selectedVerificationProjectId}>
              验证 Kodo
            </Button>
          </div>
          {kodoVerification && (
            <Alert
              type={kodoVerification.ok ? 'success' : 'warning'}
              showIcon
              title={kodoVerification.message}
            />
          )}
        </div>
      </div>
      {linkTargetProjectId && (
        <div className="remote-settings-actions">
          <Tag color={linkReady ? 'success' : undefined}>
            {linkReady ? '当前项目连接已验证' : '保存前需完成 DB 初始化和当前项目 Kodo 验证'}
          </Tag>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!linkReady}
            onClick={() => void onUpdateRemoteProjectLinks(linkTargetProjectId)}
          >
            保存项目绑定
          </Button>
        </div>
      )}
    </section>
  )
}
