import { Button, Tag } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

import type { ProjectConnectionProfileSummary, ProjectConnectionVerificationResult } from '../../desktopApi'
import type { DatabaseProfileDraft, KodoProfileDraft } from './usePersonalSpaceSettingsWorkspace'
import { ProjectRemoteDatabaseSettingsPanel } from './ProjectRemoteDatabaseSettingsPanel'
import { ProjectRemoteKodoSettingsPanel } from './ProjectRemoteKodoSettingsPanel'

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
        <ProjectRemoteDatabaseSettingsPanel
          databaseProfiles={databaseProfiles}
          selectedDatabaseProfileId={selectedDatabaseProfileId}
          databaseProfileMode={databaseProfileMode}
          databaseDraftTestState={databaseDraftTestState}
          databaseDraftTested={databaseDraftTested}
          databaseProfileDraft={databaseProfileDraft}
          databaseVerification={databaseVerification}
          databaseSchemaReady={databaseSchemaReady}
          databaseProfileOptions={databaseProfileOptions}
          onSelectedDatabaseProfileChange={onSelectedDatabaseProfileChange}
          onDatabaseProfileDraftChange={onDatabaseProfileDraftChange}
          onAddDatabaseProfile={onAddDatabaseProfile}
          onSaveDatabaseProfile={onSaveDatabaseProfile}
          onDeleteDatabaseProfile={onDeleteDatabaseProfile}
          onVerifyDatabaseProfile={onVerifyDatabaseProfile}
          onInitializeDatabaseSchema={onInitializeDatabaseSchema}
        />
        <ProjectRemoteKodoSettingsPanel
          kodoProfiles={kodoProfiles}
          selectedKodoProfileId={selectedKodoProfileId}
          kodoProfileMode={kodoProfileMode}
          kodoDraftTestState={kodoDraftTestState}
          kodoDraftTested={kodoDraftTested}
          kodoProfileDraft={kodoProfileDraft}
          kodoVerification={kodoVerification}
          kodoVerificationProjectId={kodoVerificationProjectId}
          kodoProfileOptions={kodoProfileOptions}
          selectedVerificationProjectId={selectedVerificationProjectId}
          onSelectedKodoProfileChange={onSelectedKodoProfileChange}
          onKodoProfileDraftChange={onKodoProfileDraftChange}
          onAddKodoProfile={onAddKodoProfile}
          onSaveKodoProfile={onSaveKodoProfile}
          onDeleteKodoProfile={onDeleteKodoProfile}
          onVerifyKodoProfile={onVerifyKodoProfile}
        />
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
