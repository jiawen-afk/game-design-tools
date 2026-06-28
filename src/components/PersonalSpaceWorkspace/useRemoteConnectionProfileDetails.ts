import { useEffect, type MutableRefObject } from 'react'

import {
  getDesktopApi,
  type ProjectConnectionVerificationResult,
} from '../../desktopApi'
import {
  createEditableDatabaseProfileDraft,
  createEditableKodoProfileDraft,
} from '../ProjectStorage'
import type {
  DatabaseProfileDraft,
  DraftTestState,
  KodoProfileDraft,
  ProfileEditMode,
} from './projectRemoteProfileDraftModel'

interface RemoteConnectionProfileDetailsMessageApi {
  warning: (content: string) => void
}

interface UseRemoteConnectionProfileDetailsOptions {
  messageApi: RemoteConnectionProfileDetailsMessageApi
  selectedDatabaseProfileId: string
  selectedKodoProfileId: string
  previousDatabaseProfileDraftRef: MutableRefObject<DatabaseProfileDraft | null>
  skipNextDatabaseProfileLoadRef: MutableRefObject<boolean>
  skipNextKodoProfileLoadRef: MutableRefObject<boolean>
  setDatabaseProfileDraft: (draft: DatabaseProfileDraft) => void
  setKodoProfileDraft: (draft: KodoProfileDraft) => void
  setDatabaseProfileMode: (mode: ProfileEditMode) => void
  setKodoProfileMode: (mode: ProfileEditMode) => void
  setDatabaseVerification: (verification: ProjectConnectionVerificationResult | null) => void
  setKodoVerification: (verification: ProjectConnectionVerificationResult | null) => void
  setKodoVerificationProjectId: (projectId: string) => void
  setDatabaseSchemaReady: (ready: boolean) => void
  setDatabaseDraftTestState: (state: DraftTestState) => void
  setKodoDraftTestState: (state: DraftTestState) => void
}

export function useRemoteConnectionProfileDetails({
  messageApi,
  selectedDatabaseProfileId,
  selectedKodoProfileId,
  previousDatabaseProfileDraftRef,
  skipNextDatabaseProfileLoadRef,
  skipNextKodoProfileLoadRef,
  setDatabaseProfileDraft,
  setKodoProfileDraft,
  setDatabaseProfileMode,
  setKodoProfileMode,
  setDatabaseVerification,
  setKodoVerification,
  setKodoVerificationProjectId,
  setDatabaseSchemaReady,
  setDatabaseDraftTestState,
  setKodoDraftTestState,
}: UseRemoteConnectionProfileDetailsOptions) {
  useEffect(() => {
    let mounted = true
    const desktopApi = getDesktopApi()
    if (!desktopApi || !selectedDatabaseProfileId) return () => { mounted = false }
    if (skipNextDatabaseProfileLoadRef.current) {
      skipNextDatabaseProfileLoadRef.current = false
      return () => { mounted = false }
    }
    void desktopApi.getProjectConnectionProfile(selectedDatabaseProfileId)
      .then((profile) => {
        if (!mounted || profile?.type !== 'database') return
        const editableDraft = createEditableDatabaseProfileDraft(profile.payload as DatabaseProfileDraft)
        previousDatabaseProfileDraftRef.current = editableDraft
        setDatabaseProfileDraft(editableDraft)
        setDatabaseProfileMode('edit')
        setDatabaseVerification(null)
        setDatabaseSchemaReady(Boolean(profile.schemaInitializedAt))
        setDatabaseDraftTestState('untested')
      })
      .catch(() => {
        if (mounted) void messageApi.warning('无法读取远程数据库配置详情')
      })
    return () => { mounted = false }
  }, [messageApi, selectedDatabaseProfileId])

  useEffect(() => {
    let mounted = true
    const desktopApi = getDesktopApi()
    if (!desktopApi || !selectedKodoProfileId) return () => { mounted = false }
    if (skipNextKodoProfileLoadRef.current) {
      skipNextKodoProfileLoadRef.current = false
      return () => { mounted = false }
    }
    void desktopApi.getProjectConnectionProfile(selectedKodoProfileId)
      .then((profile) => {
        if (!mounted || profile?.type !== 'qiniu_kodo') return
        setKodoProfileDraft(createEditableKodoProfileDraft(profile.payload as KodoProfileDraft))
        setKodoProfileMode('edit')
        setKodoVerification(null)
        setKodoVerificationProjectId('')
        setKodoDraftTestState('untested')
      })
      .catch(() => {
        if (mounted) void messageApi.warning('无法读取七牛 Kodo 配置详情')
      })
    return () => { mounted = false }
  }, [messageApi, selectedKodoProfileId])
}
