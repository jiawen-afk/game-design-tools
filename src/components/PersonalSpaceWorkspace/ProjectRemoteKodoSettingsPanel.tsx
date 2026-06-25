import { Alert, Button, Input, Popconfirm, Select, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import { ProjectRemoteProfileSaveButton } from './ProjectRemoteProfileSaveButton'

interface ProjectRemoteKodoSettingsPanelProps {
  kodoProfiles: ProjectConnectionProfileSummary[]
  selectedKodoProfileId: string
  kodoProfileMode: 'create' | 'edit'
  kodoDraftTestState: 'untested' | 'passed' | 'failed'
  kodoDraftTested: boolean
  kodoProfileDraft: KodoProfileDraft
  kodoVerification: ProjectConnectionVerificationResult | null
  kodoVerificationProjectId: string
  kodoProfileOptions: Array<{ label: string; value: string }>
  selectedVerificationProjectId: string
  onSelectedKodoProfileChange: (profileId: string) => void
  onKodoProfileDraftChange: (draft: KodoProfileDraft) => void
  onAddKodoProfile: () => void
  onSaveKodoProfile: () => boolean | void | Promise<boolean | void>
  onDeleteKodoProfile: () => void
  onVerifyKodoProfile: (projectId: string) => void
}

export function ProjectRemoteKodoSettingsPanel({
  kodoProfiles,
  selectedKodoProfileId,
  kodoProfileMode,
  kodoDraftTestState,
  kodoDraftTested,
  kodoProfileDraft,
  kodoVerification,
  kodoVerificationProjectId,
  kodoProfileOptions,
  selectedVerificationProjectId,
  onSelectedKodoProfileChange,
  onKodoProfileDraftChange,
  onAddKodoProfile,
  onSaveKodoProfile,
  onDeleteKodoProfile,
  onVerifyKodoProfile,
}: ProjectRemoteKodoSettingsPanelProps) {
  const kodoVerifiedForProject = kodoVerification?.ok && kodoVerificationProjectId === selectedVerificationProjectId

  return (
    <div className="remote-settings-panel">
      <div className="remote-settings-head">
        <span className="field-label">七牛 Kodo</span>
        <Tag color={kodoVerifiedForProject ? 'success' : selectedKodoProfileId ? 'processing' : undefined}>
          {kodoVerifiedForProject ? '已验证' : selectedKodoProfileId ? '已选择' : '未配置'}
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
        <ProjectRemoteProfileSaveButton
          testState={kodoDraftTestState}
          tested={kodoDraftTested}
          label="保存当前 Kodo 配置"
          failureDescription="保存后项目仍可能无法访问此对象存储。"
          onSave={onSaveKodoProfile}
        />
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
  )
}
