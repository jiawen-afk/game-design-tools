import { useEffect, useRef, useState } from 'react'

import {
  getDesktopApi,
  type ProjectConnectionProfileSummary,
  type ProjectConnectionVerificationResult,
} from '../../desktopApi'
import {
  createEditableDatabaseProfileDraft,
  createEditableKodoProfileDraft,
} from '../ProjectStorage'
import { createProjectRemoteProfileActions } from './projectRemoteProfileActions'
import {
  getRemoteProfileDraftStatus,
  type DatabaseProfileDraft,
  type DraftTestState,
  type KodoProfileDraft,
  type ProfileEditMode,
} from './projectRemoteProfileDraftModel'

interface RemoteConnectionProfilesMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
}

const initialDatabaseProfileDraft: DatabaseProfileDraft = {
  provider: 'postgresql',
  host: '',
  port: 5432,
  database: '',
  username: '',
  password: '',
  ssl: true,
}

const initialKodoProfileDraft: KodoProfileDraft = {
  accessKey: '',
  secretKey: '',
  bucket: '',
  region: '',
  domain: '',
}

export function useRemoteConnectionProfilesWorkspace(messageApi: RemoteConnectionProfilesMessageApi) {
  const [connectionProfilesLoaded, setConnectionProfilesLoaded] = useState(false)
  const [databaseProfiles, setDatabaseProfiles] = useState<ProjectConnectionProfileSummary[]>([])
  const [kodoProfiles, setKodoProfiles] = useState<ProjectConnectionProfileSummary[]>([])
  const [selectedDatabaseProfileId, setSelectedDatabaseProfileId] = useState('')
  const [selectedKodoProfileId, setSelectedKodoProfileId] = useState('')
  const [databaseProfileMode, setDatabaseProfileMode] = useState<ProfileEditMode>('create')
  const [kodoProfileMode, setKodoProfileMode] = useState<ProfileEditMode>('create')
  const [databaseDraftTestState, setDatabaseDraftTestState] = useState<DraftTestState>('untested')
  const [kodoDraftTestState, setKodoDraftTestState] = useState<DraftTestState>('untested')
  const [databaseVerification, setDatabaseVerification] = useState<ProjectConnectionVerificationResult | null>(null)
  const [kodoVerification, setKodoVerification] = useState<ProjectConnectionVerificationResult | null>(null)
  const [kodoVerificationProjectId, setKodoVerificationProjectId] = useState('')
  const [databaseSchemaReady, setDatabaseSchemaReady] = useState(false)
  const [databaseProfileDraft, setDatabaseProfileDraftState] = useState<DatabaseProfileDraft>(initialDatabaseProfileDraft)
  const [kodoProfileDraft, setKodoProfileDraftState] = useState<KodoProfileDraft>(initialKodoProfileDraft)
  const previousDatabaseProfileDraftRef = useRef<DatabaseProfileDraft | null>(null)
  const skipNextDatabaseProfileLoadRef = useRef(false)
  const skipNextKodoProfileLoadRef = useRef(false)

  useEffect(() => {
    let mounted = true
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      setConnectionProfilesLoaded(true)
      return () => { mounted = false }
    }

    setConnectionProfilesLoaded(false)
    void (async () => {
      const [nextDatabaseProfiles, nextKodoProfiles] = await Promise.all([
        desktopApi.listProjectConnectionProfiles('database'),
        desktopApi.listProjectConnectionProfiles('qiniu_kodo'),
      ])
      if (!mounted) return
      setDatabaseProfiles(nextDatabaseProfiles)
      setKodoProfiles(nextKodoProfiles)
      setSelectedDatabaseProfileId((current) => current || nextDatabaseProfiles[0]?.id || '')
      setSelectedKodoProfileId((current) => current || nextKodoProfiles[0]?.id || '')
    })().catch(() => {
      if (mounted) void messageApi.warning('无法读取远程项目连接配置')
    }).finally(() => {
      if (mounted) setConnectionProfilesLoaded(true)
    })

    return () => { mounted = false }
  }, [messageApi])

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
        setDatabaseProfileDraftState(editableDraft)
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
        setKodoProfileDraftState(createEditableKodoProfileDraft(profile.payload as KodoProfileDraft))
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

  const setDatabaseProfileDraft = (draft: DatabaseProfileDraft) => {
    setDatabaseProfileDraftState(draft)
    setDatabaseVerification(null)
    setDatabaseSchemaReady(false)
    setDatabaseDraftTestState('untested')
  }

  const setKodoProfileDraft = (draft: KodoProfileDraft) => {
    setKodoProfileDraftState(draft)
    setKodoVerification(null)
    setKodoVerificationProjectId('')
    setKodoDraftTestState('untested')
  }

  const addDatabaseProfile = () => {
    setSelectedDatabaseProfileId('')
    setDatabaseProfileMode('create')
    previousDatabaseProfileDraftRef.current = null
    setDatabaseProfileDraftState(initialDatabaseProfileDraft)
    setDatabaseVerification(null)
    setDatabaseSchemaReady(false)
    setDatabaseDraftTestState('untested')
  }

  const addKodoProfile = () => {
    setSelectedKodoProfileId('')
    setKodoProfileMode('create')
    setKodoProfileDraftState(initialKodoProfileDraft)
    setKodoVerification(null)
    setKodoVerificationProjectId('')
    setKodoDraftTestState('untested')
  }

  const selectDatabaseProfile = (profileId: string) => {
    setSelectedDatabaseProfileId(profileId)
    setDatabaseProfileMode(profileId ? 'edit' : 'create')
    setDatabaseVerification(null)
    setDatabaseSchemaReady(false)
    setDatabaseDraftTestState('untested')
  }

  const selectKodoProfile = (profileId: string) => {
    setSelectedKodoProfileId(profileId)
    setKodoProfileMode(profileId ? 'edit' : 'create')
    setKodoVerification(null)
    setKodoVerificationProjectId('')
    setKodoDraftTestState('untested')
  }

  const selectedDatabaseProfile = databaseProfiles.find((profile) => profile.id === selectedDatabaseProfileId)
  const databaseReady = Boolean(selectedDatabaseProfileId && (databaseVerification?.ok || selectedDatabaseProfile?.lastVerifiedAt))
  const kodoReady = Boolean(selectedKodoProfileId && kodoVerification?.ok && kodoVerificationProjectId)
  const remoteReady = databaseReady && databaseSchemaReady && kodoReady
  const databaseDraftStatus = getRemoteProfileDraftStatus({
    mode: databaseProfileMode,
    selectedProfileId: selectedDatabaseProfileId,
    draftTestState: databaseDraftTestState,
  })
  const kodoDraftStatus = getRemoteProfileDraftStatus({
    mode: kodoProfileMode,
    selectedProfileId: selectedKodoProfileId,
    draftTestState: kodoDraftTestState,
  })
  const databaseDraftTested = databaseDraftStatus.draftTested
  const kodoDraftTested = kodoDraftStatus.draftTested
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
