import { useRef, useState } from 'react'

import {
  type ProjectConnectionVerificationResult,
} from '../../desktopApi'
import { createProjectRemoteProfileActions } from './projectRemoteProfileActions'
import {
  createInitialDatabaseProfileDraft,
  createInitialKodoProfileDraft,
  type DatabaseProfileDraft,
  type DraftTestState,
  type KodoProfileDraft,
  type ProfileEditMode,
} from './projectRemoteProfileDraftModel'
import { getRemoteConnectionProfileWorkspaceStatus } from './projectRemoteProfileWorkspaceModel'
import { useRemoteConnectionProfileDetails } from './useRemoteConnectionProfileDetails'
import { useRemoteConnectionProfileLists } from './useRemoteConnectionProfileLists'

interface RemoteConnectionProfilesMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
}

export function useRemoteConnectionProfilesWorkspace(messageApi: RemoteConnectionProfilesMessageApi) {
  const [databaseProfileMode, setDatabaseProfileMode] = useState<ProfileEditMode>('create')
  const [kodoProfileMode, setKodoProfileMode] = useState<ProfileEditMode>('create')
  const [databaseDraftTestState, setDatabaseDraftTestState] = useState<DraftTestState>('untested')
  const [kodoDraftTestState, setKodoDraftTestState] = useState<DraftTestState>('untested')
  const [databaseVerification, setDatabaseVerification] = useState<ProjectConnectionVerificationResult | null>(null)
  const [kodoVerification, setKodoVerification] = useState<ProjectConnectionVerificationResult | null>(null)
  const [kodoVerificationProjectId, setKodoVerificationProjectId] = useState('')
  const [databaseSchemaReady, setDatabaseSchemaReady] = useState(false)
  const [databaseProfileDraft, setDatabaseProfileDraftState] = useState<DatabaseProfileDraft>(createInitialDatabaseProfileDraft)
  const [kodoProfileDraft, setKodoProfileDraftState] = useState<KodoProfileDraft>(createInitialKodoProfileDraft)
  const previousDatabaseProfileDraftRef = useRef<DatabaseProfileDraft | null>(null)
  const skipNextDatabaseProfileLoadRef = useRef(false)
  const skipNextKodoProfileLoadRef = useRef(false)
  const {
    connectionProfilesLoaded,
    databaseProfiles,
    kodoProfiles,
    selectedDatabaseProfileId,
    selectedKodoProfileId,
    setDatabaseProfiles,
    setKodoProfiles,
    setSelectedDatabaseProfileId,
    setSelectedKodoProfileId,
  } = useRemoteConnectionProfileLists(messageApi)

  const resetDatabaseProfileEditingState = () => {
    setDatabaseVerification(null)
    setDatabaseSchemaReady(false)
    setDatabaseDraftTestState('untested')
  }

  const resetKodoProfileEditingState = () => {
    setKodoVerification(null)
    setKodoVerificationProjectId('')
    setKodoDraftTestState('untested')
  }

  useRemoteConnectionProfileDetails({
    messageApi,
    selectedDatabaseProfileId,
    selectedKodoProfileId,
    previousDatabaseProfileDraftRef,
    skipNextDatabaseProfileLoadRef,
    skipNextKodoProfileLoadRef,
    setDatabaseProfileDraft: setDatabaseProfileDraftState,
    setKodoProfileDraft: setKodoProfileDraftState,
    setDatabaseProfileMode,
    setKodoProfileMode,
    setDatabaseVerification,
    setKodoVerification,
    setKodoVerificationProjectId,
    setDatabaseSchemaReady,
    setDatabaseDraftTestState,
    setKodoDraftTestState,
  })

  const setDatabaseProfileDraft = (draft: DatabaseProfileDraft) => {
    setDatabaseProfileDraftState(draft)
    resetDatabaseProfileEditingState()
  }

  const setKodoProfileDraft = (draft: KodoProfileDraft) => {
    setKodoProfileDraftState(draft)
    resetKodoProfileEditingState()
  }

  const addDatabaseProfile = () => {
    setSelectedDatabaseProfileId('')
    setDatabaseProfileMode('create')
    previousDatabaseProfileDraftRef.current = null
    setDatabaseProfileDraftState(createInitialDatabaseProfileDraft())
    resetDatabaseProfileEditingState()
  }

  const addKodoProfile = () => {
    setSelectedKodoProfileId('')
    setKodoProfileMode('create')
    setKodoProfileDraftState(createInitialKodoProfileDraft())
    resetKodoProfileEditingState()
  }

  const selectDatabaseProfile = (profileId: string) => {
    setSelectedDatabaseProfileId(profileId)
    setDatabaseProfileMode(profileId ? 'edit' : 'create')
    resetDatabaseProfileEditingState()
  }

  const selectKodoProfile = (profileId: string) => {
    setSelectedKodoProfileId(profileId)
    setKodoProfileMode(profileId ? 'edit' : 'create')
    resetKodoProfileEditingState()
  }

  const {
    selectedDatabaseProfile,
    remoteReady,
    databaseDraftStatus,
    kodoDraftStatus,
    databaseDraftTested,
    kodoDraftTested,
  } = getRemoteConnectionProfileWorkspaceStatus({
    databaseProfiles,
    selectedDatabaseProfileId,
    selectedKodoProfileId,
    databaseProfileMode,
    kodoProfileMode,
    databaseDraftTestState,
    kodoDraftTestState,
    databaseVerification,
    kodoVerification,
    kodoVerificationProjectId,
    databaseSchemaReady,
  })
  const {
    deleteDatabaseProfile,
    deleteKodoProfile,
    initializeDatabaseSchema,
    saveDatabaseProfile,
    saveKodoProfile,
    verifyDatabaseProfile,
    verifyKodoProfile,
  } = createProjectRemoteProfileActions({
    messageApi,
    selectedDatabaseProfileId,
    selectedKodoProfileId,
    selectedDatabaseProfile,
    databaseProfileMode,
    kodoProfileMode,
    databaseProfileDraft,
    kodoProfileDraft,
    databaseVerification,
    kodoVerification,
    databaseDraftStatus,
    kodoDraftStatus,
    previousDatabaseProfileDraftRef,
    skipNextDatabaseProfileLoadRef,
    skipNextKodoProfileLoadRef,
    setDatabaseProfiles,
    setKodoProfiles,
    setSelectedDatabaseProfileId,
    setSelectedKodoProfileId,
    setDatabaseProfileMode,
    setKodoProfileMode,
    setDatabaseVerification,
    setKodoVerification,
    setKodoVerificationProjectId,
    setDatabaseProfileDraft: setDatabaseProfileDraftState,
    setKodoProfileDraft: setKodoProfileDraftState,
    setDatabaseSchemaReady,
    setDatabaseDraftTestState,
    setKodoDraftTestState,
  })

  return {
    connectionProfilesLoaded,
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
    remoteReady,
    setSelectedDatabaseProfileId: selectDatabaseProfile,
    setSelectedKodoProfileId: selectKodoProfile,
    setDatabaseProfileDraft,
    setKodoProfileDraft,
    addDatabaseProfile,
    addKodoProfile,
    saveDatabaseProfile,
    deleteDatabaseProfile,
    saveKodoProfile,
    deleteKodoProfile,
    verifyDatabaseProfile,
    initializeDatabaseSchema,
    verifyKodoProfile,
  }
}
