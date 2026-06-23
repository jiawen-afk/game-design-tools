import { useEffect, useState } from 'react'
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
import { validateDatabaseProfileInput, validateKodoProfileInput } from '../ProjectStorage'

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
  const [databaseVerification, setDatabaseVerification] = useState<ProjectConnectionVerificationResult | null>(null)
  const [kodoVerification, setKodoVerification] = useState<ProjectConnectionVerificationResult | null>(null)
  const [kodoVerificationProjectId, setKodoVerificationProjectId] = useState('')
  const [databaseSchemaReady, setDatabaseSchemaReady] = useState(false)
  const [databaseProfileDraft, setDatabaseProfileDraft] = useState<DatabaseProfileDraft>({
    provider: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: true,
  })
  const [kodoProfileDraft, setKodoProfileDraft] = useState<KodoProfileDraft>({
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: '',
    domain: '',
  })

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
    setDatabaseSchemaReady(false)
  }, [selectedDatabaseProfileId])

  useEffect(() => {
    setKodoVerification(null)
    setKodoVerificationProjectId('')
  }, [selectedKodoProfileId])

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
    const errors = validateDatabaseProfileInput(databaseProfileDraft)
    if (errors.length > 0) {
      void messageApi.warning(errors[0]!)
      return
    }
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      void messageApi.warning('当前桌面运行时不可用，无法保存远程数据库配置。')
      return
    }
    const summary = await desktopApi.saveProjectConnectionProfile({
      type: 'database',
      displayName: `${databaseProfileDraft.provider} ${databaseProfileDraft.database || databaseProfileDraft.host}`.trim(),
      payload: databaseProfileDraft,
    })
    setDatabaseProfiles((current) => [...current.filter((profile) => profile.id !== summary.id), summary])
    setSelectedDatabaseProfileId(summary.id)
    setDatabaseVerification(null)
    setDatabaseSchemaReady(false)
    void messageApi.success('已保存远程数据库配置')
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
    const errors = validateKodoProfileInput(kodoProfileDraft)
    if (errors.length > 0) {
      void messageApi.warning(errors[0]!)
      return
    }
    const desktopApi = getDesktopApi()
    if (!desktopApi) {
      void messageApi.warning('当前桌面运行时不可用，无法保存七牛 Kodo 配置。')
      return
    }
    const summary = await desktopApi.saveProjectConnectionProfile({
      type: 'qiniu_kodo',
      displayName: `Kodo ${kodoProfileDraft.bucket}`.trim(),
      payload: kodoProfileDraft,
    })
    setKodoProfiles((current) => [...current.filter((profile) => profile.id !== summary.id), summary])
    setSelectedKodoProfileId(summary.id)
    setKodoVerification(null)
    void messageApi.success('已保存七牛 Kodo 配置')
  }

  const verifyDatabaseProfile = async () => {
    const desktopApi = getDesktopApi()
    if (!desktopApi || !selectedDatabaseProfileId) {
      void messageApi.warning('请先保存并选择远程数据库配置')
      return
    }
    const result = await desktopApi.verifyProjectDatabaseProfile(selectedDatabaseProfileId)
    setDatabaseVerification(result)
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
    if (!desktopApi || !selectedKodoProfileId) {
      void messageApi.warning('请先保存并选择七牛 Kodo 配置')
      return
    }
    const result = await desktopApi.verifyProjectKodoProfile(selectedKodoProfileId, projectId)
    setKodoVerification(result)
    setKodoVerificationProjectId(result.ok ? projectId : '')
    await refreshProjectConnectionProfiles()
    void (result.ok ? messageApi.success(result.message) : messageApi.warning(result.message))
  }

  const selectedDatabaseProfile = databaseProfiles.find((profile) => profile.id === selectedDatabaseProfileId)
  const selectedKodoProfile = kodoProfiles.find((profile) => profile.id === selectedKodoProfileId)
  const databaseReady = Boolean(selectedDatabaseProfileId && (databaseVerification?.ok || selectedDatabaseProfile?.lastVerifiedAt))
  const kodoReady = Boolean(selectedKodoProfileId && kodoVerification?.ok && kodoVerificationProjectId)
  const remoteReady = databaseReady && databaseSchemaReady && kodoReady

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
    databaseProfileDraft,
    kodoProfileDraft,
    databaseVerification,
    kodoVerification,
    kodoVerificationProjectId,
    databaseSchemaReady,
    remoteReady,
    setSelectedDatabaseProfileId,
    setSelectedKodoProfileId,
    setDatabaseProfileDraft,
    setKodoProfileDraft,
    saveDatabaseProfile,
    deleteDatabaseProfile,
    saveKodoProfile,
    verifyDatabaseProfile,
    initializeDatabaseSchema,
    verifyKodoProfile,
  }
}
