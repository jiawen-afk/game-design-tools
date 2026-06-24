import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { PersonalSpaceState } from './personalSpaceModel'
import {
  type PersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  persistPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
} from './personalSpaceFileStorage'
import { pickPersonalSpaceDirectory } from './personalSpaceResourceActions'
import {
  getDesktopApi,
  type ProjectConnectionProfileSummary,
  type ProjectConnectionVerificationResult,
} from '../../desktopApi'
import {
  createEditableDatabaseProfileDraft,
  createEditableKodoProfileDraft,
  validateDatabaseProfileInput,
  validateKodoProfileInput,
} from '../ProjectStorage'

interface PersonalSpaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
}

export type RemoteDatabaseProvider = 'postgresql' | 'mysql'

export interface DatabaseProfileDraft {
  provider: RemoteDatabaseProvider
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

export interface KodoProfileDraft {
  accessKey: string
  secretKey: string
  bucket: string
  region: string
  domain: string
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

type ProfileEditMode = 'create' | 'edit'
type DraftTestState = 'untested' | 'passed' | 'failed'

interface UsePersonalSpaceSettingsWorkspaceParams {
  storageDirectory: string
  setSpace: Dispatch<SetStateAction<PersonalSpaceState>>
  messageApi: PersonalSpaceMessageApi
}

export function usePersonalSpaceSettingsWorkspace({
  storageDirectory,
  setSpace,
  messageApi,
}: UsePersonalSpaceSettingsWorkspaceParams) {
  const [draftStorageDirectory, setDraftStorageDirectory] = useState(storageDirectory)
  const [directoryHandle, setDirectoryHandle] = useState<PersonalSpaceDirectoryHandle | null>(null)
  const [directoryHandleChecked, setDirectoryHandleChecked] = useState(false)
  const [savedSettings, setSavedSettings] = useState(false)
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
  const skipNextDatabaseProfileLoadRef = useRef(false)
  const skipNextKodoProfileLoadRef = useRef(false)

  useEffect(() => {
    let mounted = true
    loadPersistedPersonalSpaceDirectoryHandle()
      .then((handle) => {
        if (!mounted || !handle) return
        setDirectoryHandle(handle)
        setPersonalSpaceDirectoryHandle(handle)
        if (!storageDirectory) {
          setDraftStorageDirectory(handle.path ?? handle.name)
          setSpace((current) => ({
            ...current,
            settings: { ...current.settings, storageDirectory: handle.path ?? handle.name },
          }))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setDirectoryHandleChecked(true)
      })
    return () => { mounted = false }
  }, [setSpace, storageDirectory])

  useEffect(() => {
    let mounted = true
    const desktopApi = getDesktopApi()
    if (!desktopApi) return () => { mounted = false }

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
        setDatabaseProfileDraftState(createEditableDatabaseProfileDraft(profile.payload as DatabaseProfileDraft))
        setDatabaseProfileMode('edit')
        setDatabaseVerification(null)
        setDatabaseSchemaReady(false)
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

  const saveSettings = () => {
    setSpace((current) => ({
      ...current,
      settings: {
        ...current.settings,
        storageDirectory: draftStorageDirectory.trim(),
      },
    }))
    setSavedSettings(true)
    window.setTimeout(() => setSavedSettings(false), 1600)
    void messageApi.success('已保存项目空间设置')
  }

  const chooseStorageDirectory = async () => {
    try {
      const handle = await pickPersonalSpaceDirectory()
      if (!handle) {
        setDirectoryHandleChecked(true)
        void messageApi.warning('当前桌面运行时不可用，无法启用项目空间素材管理。')
        return
      }
      setDirectoryHandle(handle)
      setDirectoryHandleChecked(true)
      setPersonalSpaceDirectoryHandle(handle)
      await persistPersonalSpaceDirectoryHandle(handle)
      setDraftStorageDirectory(handle.path ?? handle.name)
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, storageDirectory: handle.path ?? handle.name },
      }))
      void messageApi.success('已授权资源存储目录')
    } catch {
      setDirectoryHandleChecked(true)
      void messageApi.warning('未选择资源存储目录')
    }
  }

  const openStorageDirectory = () => {
    if (!directoryHandle) {
      void messageApi.warning('请先选择授权目录')
      return
    }
    const desktopPath = directoryHandle.path ?? draftStorageDirectory
    const desktopApi = getDesktopApi()
    if (desktopApi && desktopPath) {
      void desktopApi.openPath(desktopPath).catch(() => {
        void messageApi.warning('无法打开资源目录，请检查目录是否仍然存在。')
      })
      return
    }
    void messageApi.warning('当前桌面运行时不可用，无法打开资源目录。')
  }

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

  const refreshProjectConnectionProfiles = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi) return { databaseProfiles: [], kodoProfiles: [] }
    const [nextDatabaseProfiles, nextKodoProfiles] = await Promise.all([
      desktopApi.listProjectConnectionProfiles('database'),
      desktopApi.listProjectConnectionProfiles('qiniu_kodo'),
    ])
    setDatabaseProfiles(nextDatabaseProfiles)
    setKodoProfiles(nextKodoProfiles)
    return { databaseProfiles: nextDatabaseProfiles, kodoProfiles: nextKodoProfiles }
  }

  const saveDatabaseProfile = async () => {
    const isExisting = databaseProfileMode === 'edit' && Boolean(selectedDatabaseProfileId)
    const errors = validateDatabaseProfileInput(databaseProfileDraft, { existing: isExisting })
    if (errors.length > 0) {
      void messageApi.warning(errors[0]!)
      return
    }
    if (databaseDraftTestState === 'untested') {
      void messageApi.warning('请先测试远程数据库配置')
      return
    }
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      void messageApi.warning('当前桌面运行时不可用，无法保存远程数据库配置。')
      return
    }
    const summary = await desktopApi.saveProjectConnectionProfile({
      id: databaseProfileMode === 'edit' ? selectedDatabaseProfileId : undefined,
      type: 'database',
      displayName: `${databaseProfileDraft.provider} ${databaseProfileDraft.database || databaseProfileDraft.host}`.trim(),
      payload: databaseProfileDraft,
    })
    setDatabaseProfiles((current) => [...current.filter((profile) => profile.id !== summary.id), summary])
    skipNextDatabaseProfileLoadRef.current = databaseProfileMode === 'create'
    setSelectedDatabaseProfileId(summary.id)
    setDatabaseProfileMode('edit')
    void messageApi.success('已保存远程数据库配置')
  }

  const selectDatabaseProfile = (profileId: string) => {
    setSelectedDatabaseProfileId(profileId)
    setDatabaseProfileMode(profileId ? 'edit' : 'create')
    setDatabaseVerification(null)
    setDatabaseSchemaReady(false)
    setDatabaseDraftTestState('untested')
  }

  const deleteDatabaseProfile = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !selectedDatabaseProfileId) {
      void messageApi.warning('请先选择远程数据库配置')
      return
    }
    const deletedProfileId = selectedDatabaseProfileId
    const deleted = await desktopApi.deleteProjectConnectionProfile(deletedProfileId)
    const { databaseProfiles: nextDatabaseProfiles } = await refreshProjectConnectionProfiles()
    if (!deleted) {
      void messageApi.warning('远程数据库配置不存在或已删除')
      return
    }
    setSelectedDatabaseProfileId((current) => (
      current === deletedProfileId ? nextDatabaseProfiles[0]?.id || '' : current
    ))
    setDatabaseVerification(null)
    setDatabaseSchemaReady(false)
    void messageApi.success('已删除远程数据库配置')
  }

  const saveKodoProfile = async () => {
    const isExisting = kodoProfileMode === 'edit' && Boolean(selectedKodoProfileId)
    const errors = validateKodoProfileInput(kodoProfileDraft, { existing: isExisting })
    if (errors.length > 0) {
      void messageApi.warning(errors[0]!)
      return
    }
    if (kodoDraftTestState === 'untested') {
      void messageApi.warning('请先验证七牛 Kodo 配置')
      return
    }
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      void messageApi.warning('当前桌面运行时不可用，无法保存七牛 Kodo 配置。')
      return
    }
    const summary = await desktopApi.saveProjectConnectionProfile({
      id: kodoProfileMode === 'edit' ? selectedKodoProfileId : undefined,
      type: 'qiniu_kodo',
      displayName: `Kodo ${kodoProfileDraft.bucket}`.trim(),
      payload: kodoProfileDraft,
    })
    setKodoProfiles((current) => [...current.filter((profile) => profile.id !== summary.id), summary])
    skipNextKodoProfileLoadRef.current = kodoProfileMode === 'create'
    setSelectedKodoProfileId(summary.id)
    setKodoProfileMode('edit')
    void messageApi.success('已保存七牛 Kodo 配置')
  }

  const selectKodoProfile = (profileId: string) => {
    setSelectedKodoProfileId(profileId)
    setKodoProfileMode(profileId ? 'edit' : 'create')
    setKodoVerification(null)
    setKodoVerificationProjectId('')
    setKodoDraftTestState('untested')
  }

  const deleteKodoProfile = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !selectedKodoProfileId) {
      void messageApi.warning('请先选择七牛 Kodo 配置')
      return
    }
    const deletedProfileId = selectedKodoProfileId
    const deleted = await desktopApi.deleteProjectConnectionProfile(deletedProfileId)
    const { kodoProfiles: nextKodoProfiles } = await refreshProjectConnectionProfiles()
    if (!deleted) {
      void messageApi.warning('七牛 Kodo 配置不存在或已删除')
      return
    }
    setSelectedKodoProfileId((current) => (
      current === deletedProfileId ? nextKodoProfiles[0]?.id || '' : current
    ))
    setKodoVerification(null)
    setKodoVerificationProjectId('')
    void messageApi.success('已删除七牛 Kodo 配置')
  }

  const verifyDatabaseProfile = async () => {
    const desktopApi = getDesktopApi()
    const isExisting = databaseProfileMode === 'edit' && Boolean(selectedDatabaseProfileId)
    const errors = validateDatabaseProfileInput(databaseProfileDraft, { existing: isExisting })
    if (errors.length > 0) {
      void messageApi.warning(errors[0]!)
      return
    }
    if (!desktopApi) {
      void messageApi.warning('当前桌面运行时不可用，无法测试远程数据库配置')
      return
    }
    const result = await desktopApi.verifyProjectDatabaseProfileDraft(
      databaseProfileDraft,
      isExisting ? selectedDatabaseProfileId : undefined,
    )
    setDatabaseVerification(result)
    setDatabaseDraftTestState(result.ok ? 'passed' : 'failed')
    if (!result.ok) setDatabaseSchemaReady(false)
    await refreshProjectConnectionProfiles()
    void (result.ok ? messageApi.success(result.message) : messageApi.warning(result.message))
  }

  const initializeDatabaseSchema = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !selectedDatabaseProfileId) {
      void messageApi.warning('请先保存并选择远程数据库配置')
      return
    }
    const result = await desktopApi.initializeProjectDatabaseSchema(selectedDatabaseProfileId, databaseProfileDraft.provider)
    setDatabaseSchemaReady(result.ok)
    void (result.ok ? messageApi.success(result.message) : messageApi.warning(result.message))
  }

  const verifyKodoProfile = async (projectId: string) => {
    const desktopApi = getDesktopApi()
    const isExisting = kodoProfileMode === 'edit' && Boolean(selectedKodoProfileId)
    const errors = validateKodoProfileInput(kodoProfileDraft, { existing: isExisting })
    if (errors.length > 0) {
      void messageApi.warning(errors[0]!)
      return
    }
    if (!desktopApi) {
      void messageApi.warning('当前桌面运行时不可用，无法验证七牛 Kodo 配置')
      return
    }
    const result = await desktopApi.verifyProjectKodoProfileDraft(
      kodoProfileDraft,
      projectId,
      isExisting ? selectedKodoProfileId : undefined,
    )
    setKodoVerification(result)
    setKodoDraftTestState(result.ok ? 'passed' : 'failed')
    setKodoVerificationProjectId(result.ok ? projectId : '')
    await refreshProjectConnectionProfiles()
    void (result.ok ? messageApi.success(result.message) : messageApi.warning(result.message))
  }

  const selectedDatabaseProfile = databaseProfiles.find((profile) => profile.id === selectedDatabaseProfileId)
  const selectedKodoProfile = kodoProfiles.find((profile) => profile.id === selectedKodoProfileId)
  const databaseReady = Boolean(selectedDatabaseProfileId && (databaseVerification?.ok || selectedDatabaseProfile?.lastVerifiedAt))
  const kodoReady = Boolean(selectedKodoProfileId && kodoVerification?.ok && kodoVerificationProjectId)
  const remoteReady = databaseReady && databaseSchemaReady && kodoReady
  const databaseDraftTested = databaseDraftTestState !== 'untested'
  const kodoDraftTested = kodoDraftTestState !== 'untested'

  return {
    draftStorageDirectory,
    directoryHandle,
    directoryHandleChecked,
    savedSettings,
    setDraftStorageDirectory,
    saveSettings,
    chooseStorageDirectory,
    openStorageDirectory,
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
