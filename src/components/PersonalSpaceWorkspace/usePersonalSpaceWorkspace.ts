import { useEffect, useRef, useState } from 'react'
import type { UploadProps } from 'antd'

import {
  clearActiveProjectId,
  createDesktopLocalProjectObjectStorage,
  createDesktopProjectAssetCacheStorage,
  createDesktopLocalProjectRepository,
  createDesktopRemoteProjectRepository,
  createDesktopKodoProjectObjectStorage,
  createProjectAssetManager,
  createProjectWorkspaceBootstrapper,
  hardDeleteProjectWithObjects,
  mergeProjectsRemoteFirst,
  migrateLocalProjectToRemote,
  readActiveProjectId,
  resolveEnabledProjectId,
  restoreProjectRowsToPersonalSpaceState,
  sanitizeObjectKeyPart,
  syncProjectSpaceStateToLocalProjectStorage,
  type Project,
  type ProjectSettings,
  writeActiveProjectId,
} from '../ProjectStorage'
import {
  addAssetGroup,
  addCharacterProfile,
  addStoryboardGroup,
  assignAssetToCharacterColumn,
  assignVoiceToStoryboardGroup,
  deleteCharacterProfile,
  deleteAssetGroup,
  deleteStoryboardGroup,
  getStoryboardLinkedCharacterIds,
  linkEffectAssetToVoice,
  moveCharacterVoice,
  moveStoryboardVoice,
  defaultPersonalSpaceState,
  readPersonalSpaceState,
  renameAssetGroup,
  renameCharacterProfile,
  renameStoryboardGroup,
  reorderCharacterProfile,
  reorderCharacterVoice,
  reorderStoryboardVoice,
  transferAssetGroup,
  type AssetGroupKind,
  type CommonAssetKind,
  type PersonalSpaceState,
  toggleAssetGroupStar,
  toggleCharacterStar,
  toggleStoryboardStar,
  unassignAssetFromCharacterColumn,
  unassignVoiceFromStoryboardGroup,
  updatePersonalSpaceAsset,
  updateStoryboardVoiceText,
} from './personalSpaceModel'
import {
  deleteProjectSpaceState,
  hasProjectSpaceState,
  readProjectSpaceState,
  writeProjectSpaceState,
} from './projectSpaceState'
import {
  applyAssetDeleteResult,
  createCommonResourceAssetForUpload,
  createPortraitAssetForUpload,
  createSpriteAssetForUpload,
  createVoiceAssetForUpload,
  deleteAssetWithOptionalResources,
  exportAllStoryboardCharacterAssetsToTarget,
  exportAllStoryboardVoiceAssetsToTarget,
  exportStoryboardAssetToTarget,
  exportStoryboardCharacterAssetsToTarget,
  exportStoryboardVoiceAssetsToTarget,
} from './personalSpaceResourceActions'
import { usePersonalSpaceSettingsWorkspace } from './usePersonalSpaceSettingsWorkspace'

interface PersonalSpaceMessageApi {
  success: (content: string) => void
  warning: (content: string) => void
  error: (content: string) => void
}

type PersonalSpaceActiveModule = 'characters' | 'storyboards' | 'materials' | 'settings'
type ProjectSpacePage = 'workbench' | 'management'

const REMOTE_PROJECT_SYNC_DEBOUNCE_MS = 1500
const REMOTE_PROJECT_PERIODIC_SYNC_MS = 60000
const projectRepository = createDesktopLocalProjectRepository()
const projectObjectStorage = createDesktopLocalProjectObjectStorage()
const projectAssetCacheStorage = createDesktopProjectAssetCacheStorage()
const projectBootstrapper = createProjectWorkspaceBootstrapper(projectRepository)

type RemoteProjectSettingsSnapshot = Pick<
  ProjectSettings,
  'database_provider' | 'remote_database_profile_id' | 'remote_storage_profile_id'
>

function objectProjectNameFromPrefix(prefix: string) {
  return prefix.split('/')[1] ?? ''
}

function assetKindLabel(kind: string) {
  if (kind === 'sprite') return '精灵图'
  if (kind === 'voice') return '配音'
  return '图片'
}

function createEmptyProjectSpaceState(storageDirectory = ''): PersonalSpaceState {
  return {
    ...defaultPersonalSpaceState,
    settings: {
      ...defaultPersonalSpaceState.settings,
      storageDirectory,
    },
    assetGroups: {
      image: [...defaultPersonalSpaceState.assetGroups.image],
      sprite: [...defaultPersonalSpaceState.assetGroups.sprite],
      voice: [...defaultPersonalSpaceState.assetGroups.voice],
    },
    starredAssetGroups: {
      image: [],
      sprite: [],
      voice: [],
    },
    characters: [],
    assets: [],
    storyboardGroups: [],
    pendingDeletedResourcePaths: [],
  }
}

export function usePersonalSpaceWorkspace(messageApi: PersonalSpaceMessageApi) {
  const [space, setSpace] = useState(() => readPersonalSpaceState())
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState('')
  const [workspacePage, setWorkspacePage] = useState<ProjectSpacePage>('workbench')
  const [selectedManagementProjectId, setSelectedManagementProjectId] = useState('')
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newStoryboardName, setNewStoryboardName] = useState('')
  const [activeModule, setActiveModule] = useState<PersonalSpaceActiveModule>('characters')
  const [storyboardExportingKey, setStoryboardExportingKey] = useState('')
  const [migratingProjectId, setMigratingProjectId] = useState('')
  const [syncingProjectId, setSyncingProjectId] = useState('')
  const spaceRef = useRef(space)
  const activeProjectIdRef = useRef('')
  const migrationInFlightProjectIdRef = useRef('')
  const manualSyncInFlightProjectIdRef = useRef('')
  const remoteSyncSequenceRef = useRef(0)
  const remoteSyncTimerRef = useRef<number | null>(null)
  const remoteSyncIntervalRef = useRef<number | null>(null)
  const queuedRemoteSyncSpaceRef = useRef<PersonalSpaceState | null>(null)
  const remoteSyncInFlightRef = useRef(false)
  const remoteProjectSettingsByIdRef = useRef<Record<string, RemoteProjectSettingsSnapshot>>({})
  const remoteProjectIdByObjectProjectNameRef = useRef<Record<string, string>>({})
  const spriteUploadBatchKeyByCharacter = useRef<Record<string, string>>({})
  const imageSpriteUploadBatchKey = useRef<string | null>(null)
  const settingsWorkspace = usePersonalSpaceSettingsWorkspace({
    storageDirectory: space.settings.storageDirectory,
    setSpace,
    messageApi,
  })
  const rememberRemoteProjectSettings = (project: Project, settings: ProjectSettings) => {
    remoteProjectSettingsByIdRef.current[project.id] = {
      database_provider: settings.database_provider,
      remote_database_profile_id: settings.remote_database_profile_id,
      remote_storage_profile_id: settings.remote_storage_profile_id,
    }
    remoteProjectIdByObjectProjectNameRef.current[sanitizeObjectKeyPart(project.name)] = project.id
    const objectProjectName = objectProjectNameFromPrefix(project.object_key_prefix)
    if (objectProjectName) remoteProjectIdByObjectProjectNameRef.current[objectProjectName] = project.id
  }
  const selectedRemoteSettingsSnapshot = (): RemoteProjectSettingsSnapshot => ({
    database_provider: settingsWorkspace.databaseProfileDraft.provider,
    remote_database_profile_id: settingsWorkspace.selectedDatabaseProfileId || null,
    remote_storage_profile_id: settingsWorkspace.selectedKodoProfileId || null,
  })
  const remoteSettingsForProject = (projectId: string): RemoteProjectSettingsSnapshot => (
    remoteProjectSettingsByIdRef.current[projectId] ?? selectedRemoteSettingsSnapshot()
  )
  const ensureRemoteProjectSettings = async (projectId: string) => {
    if (remoteProjectSettingsByIdRef.current[projectId]) return
    const localSnapshot = await projectRepository.getProject(projectId)
    if (localSnapshot?.project.mode === 'remote') {
      rememberRemoteProjectSettings(localSnapshot.project, localSnapshot.settings)
    }
  }
  const getRemoteDatabaseProfileId = (projectId?: string) => (
    projectId
      ? remoteProjectSettingsByIdRef.current[projectId]?.remote_database_profile_id || settingsWorkspace.selectedDatabaseProfileId
      : settingsWorkspace.selectedDatabaseProfileId
  )
  const getRemoteStorageProfileId = (objectKey?: string) => {
    const objectProjectName = objectKey?.split('/')[1] ?? ''
    const projectId = objectProjectName ? remoteProjectIdByObjectProjectNameRef.current[objectProjectName] : ''
    return (
      (projectId ? remoteProjectSettingsByIdRef.current[projectId]?.remote_storage_profile_id : '') ||
      settingsWorkspace.selectedKodoProfileId
    )
  }
  const remoteProjectRepository = createDesktopRemoteProjectRepository(getRemoteDatabaseProfileId)
  const remoteProjectObjectStorage = createDesktopKodoProjectObjectStorage(getRemoteStorageProfileId)
  const projectAssetManager = createProjectAssetManager({
    localObjectStorage: projectObjectStorage,
    remoteObjectStorage: remoteProjectObjectStorage,
    cacheStorage: projectAssetCacheStorage,
  })

  const refreshProjectList = async (preferredProjectId = selectedManagementProjectId) => {
    const [localProjects, remoteProjects] = await Promise.all([
      projectRepository.listProjects(),
      remoteProjectRepository.listProjects(),
    ])
    const nextProjects = mergeProjectsRemoteFirst(localProjects, remoteProjects)
    setProjects(nextProjects)
    setSelectedManagementProjectId((current) => {
      const nextPreferredProjectId = preferredProjectId || current || activeProjectIdRef.current
      if (nextPreferredProjectId && nextProjects.some((project) => project.id === nextPreferredProjectId)) return nextPreferredProjectId
      return nextProjects[0]?.id ?? ''
    })
    return nextProjects
  }

  const activateProjectState = (projectId: string, fallbackState?: PersonalSpaceState) => {
    if (activeProjectIdRef.current && activeProjectIdRef.current !== projectId) {
      writeProjectSpaceState(activeProjectIdRef.current, spaceRef.current)
    }

    if (!projectId) {
      activeProjectIdRef.current = ''
      setActiveProjectId('')
      clearActiveProjectId()
      const emptySpace = createEmptyProjectSpaceState()
      spaceRef.current = emptySpace
      setSpace(emptySpace)
      return
    }

    if (!hasProjectSpaceState(projectId)) {
      writeProjectSpaceState(projectId, fallbackState ?? createEmptyProjectSpaceState())
    }

    const nextSpace = readProjectSpaceState(projectId)
    activeProjectIdRef.current = projectId
    spaceRef.current = nextSpace
    setActiveProjectId(projectId)
    setSpace(nextSpace)
    writeActiveProjectId(projectId)
  }

  const findProject = (projectId: string, projectList = projects) => (
    projectList.find((item) => item.id === projectId)
  )

  const loadProjectSpaceState = async (
    projectId: string,
    fallbackState?: PersonalSpaceState,
    projectList = projects,
  ) => {
    const fallbackSpace = fallbackState ?? createEmptyProjectSpaceState()
    const project = findProject(projectId, projectList)
    if (project?.mode === 'remote') {
      try {
        await ensureRemoteProjectSettings(projectId)
        const remoteRows = await remoteProjectRepository.exportProjectRows(projectId)
        if (remoteRows) rememberRemoteProjectSettings(remoteRows.project, remoteRows.settings)
        const nextSpace = remoteRows
          ? restoreProjectRowsToPersonalSpaceState(remoteRows)
          : readProjectSpaceState(projectId, { fallbackState: fallbackSpace })
        writeProjectSpaceState(projectId, nextSpace)
        if (!remoteRows) {
          void messageApi.warning('远程项目数据读取失败，已使用本地项目缓存')
        }
        return nextSpace
      } catch (error) {
        void messageApi.warning(`远程项目数据读取失败，已使用本地项目缓存：${String(error)}`)
      }
    }

    return hasProjectSpaceState(projectId)
      ? readProjectSpaceState(projectId)
      : fallbackSpace
  }

  const activateProjectStateFromStorage = async (
    projectId: string,
    fallbackState?: PersonalSpaceState,
    projectList = projects,
  ) => {
    if (!projectId) {
      activateProjectState('')
      return
    }
    const nextSpace = await loadProjectSpaceState(projectId, fallbackState, projectList)
    activateProjectState(projectId, nextSpace)
  }

  const findProjectRepository = (projectId: string) => {
    const project = findProject(projectId)
    return project?.mode === 'remote' ? remoteProjectRepository : projectRepository
  }

  const projectReadOptionsForActiveProject = () => {
    const project = findProject(activeProjectIdRef.current)
    return {
      projectObjectStorage: project?.mode === 'remote' ? remoteProjectObjectStorage : projectObjectStorage,
      projectAssetManager,
      projectId: project?.id,
      projectMode: project?.mode,
    }
  }

  const syncProjectStateToStorage = async (project: Project, nextSpace: PersonalSpaceState) => {
    if (project.mode === 'remote') {
      await ensureRemoteProjectSettings(project.id)
      const remoteSettings = remoteSettingsForProject(project.id)
      await syncProjectSpaceStateToLocalProjectStorage({
        projectId: project.id,
        projectName: project.name,
        localObjectRoot: '',
        state: nextSpace,
        repository: remoteProjectRepository,
        objectStorage: remoteProjectObjectStorage,
        assetManager: projectAssetManager,
        storageProvider: 'qiniu_kodo',
        databaseProvider: remoteSettings.database_provider,
        remoteDatabaseProfileId: remoteSettings.remote_database_profile_id,
        remoteStorageProfileId: remoteSettings.remote_storage_profile_id,
        directoryHandle: settingsWorkspace.directoryHandle,
        now: new Date().toISOString(),
      })
      return
    }

    await syncProjectSpaceStateToLocalProjectStorage({
      projectId: project.id,
      projectName: project.name,
      localObjectRoot: settingsWorkspace.draftStorageDirectory || nextSpace.settings.storageDirectory || '',
      state: nextSpace,
      localRepository: projectRepository,
      localObjectStorage: projectObjectStorage,
      directoryHandle: settingsWorkspace.directoryHandle,
      now: new Date().toISOString(),
    })
  }

  const syncActiveProjectStateToStorage = async (nextSpace: PersonalSpaceState) => {
    const projectId = activeProjectIdRef.current
    const project = findProject(projectId)
    if (!projectId || project?.mode !== 'remote') return
    const syncSequence = remoteSyncSequenceRef.current + 1
    remoteSyncSequenceRef.current = syncSequence
    try {
      await syncProjectStateToStorage(project, nextSpace)
    } catch (error) {
      if (remoteSyncSequenceRef.current === syncSequence) {
        void messageApi.warning(`同步远程项目失败：${String(error)}`)
      }
    }
  }

  const flushQueuedRemoteSync = async () => {
    if (remoteSyncInFlightRef.current) return
    const queuedSpace = queuedRemoteSyncSpaceRef.current
    queuedRemoteSyncSpaceRef.current = null
    if (!queuedSpace) return
    remoteSyncInFlightRef.current = true
    try {
      await syncActiveProjectStateToStorage(queuedSpace)
    } finally {
      remoteSyncInFlightRef.current = false
      if (queuedRemoteSyncSpaceRef.current) void flushQueuedRemoteSync()
    }
  }

  const scheduleRemoteProjectSync = (nextSpace: PersonalSpaceState, delay = REMOTE_PROJECT_SYNC_DEBOUNCE_MS) => {
    const project = findProject(activeProjectIdRef.current)
    if (project?.mode !== 'remote') return
    queuedRemoteSyncSpaceRef.current = nextSpace
    if (remoteSyncTimerRef.current !== null) window.clearTimeout(remoteSyncTimerRef.current)
    remoteSyncTimerRef.current = window.setTimeout(() => {
      remoteSyncTimerRef.current = null
      void flushQueuedRemoteSync()
    }, delay)
  }

  const syncActiveProjectNow = async () => {
    if (manualSyncInFlightProjectIdRef.current) {
      void messageApi.warning('项目正在同步，请稍候')
      return
    }
    const syncProjectId = activeProjectIdRef.current
    const project = findProject(syncProjectId)
    if (!syncProjectId || !project) {
      void messageApi.warning('请先启用一个项目空间')
      return
    }

    manualSyncInFlightProjectIdRef.current = syncProjectId
    setSyncingProjectId(syncProjectId)
    try {
      writeProjectSpaceState(syncProjectId, spaceRef.current)
      await syncProjectStateToStorage(project, spaceRef.current)
      void messageApi.success('已同步项目空间')
    } catch (error) {
      void messageApi.warning(`同步项目空间失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      if (manualSyncInFlightProjectIdRef.current === syncProjectId) {
        manualSyncInFlightProjectIdRef.current = ''
        setSyncingProjectId('')
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    const initializeProjects = async () => {
      const legacySpace = readPersonalSpaceState()
      const localProjects = await projectBootstrapper.listProjects(legacySpace.settings.storageDirectory || '')
      const remoteProjects = await remoteProjectRepository.listProjects()
      const nextProjects = mergeProjectsRemoteFirst(localProjects, remoteProjects)
      if (cancelled) return
      const enabledProjectId = resolveEnabledProjectId(nextProjects, readActiveProjectId())
      setProjects(nextProjects)
      setSelectedManagementProjectId(enabledProjectId || nextProjects[0]?.id || '')
      if (enabledProjectId) {
        void activateProjectStateFromStorage(enabledProjectId, legacySpace, nextProjects)
      } else {
        activateProjectState('')
      }
    }

    void initializeProjects()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    spaceRef.current = space
    if (activeProjectIdRef.current) {
      writeProjectSpaceState(activeProjectIdRef.current, space)
      scheduleRemoteProjectSync(space)
    }
  }, [space])

  useEffect(() => {
    remoteSyncIntervalRef.current = window.setInterval(() => {
      scheduleRemoteProjectSync(spaceRef.current, 0)
    }, REMOTE_PROJECT_PERIODIC_SYNC_MS)
    return () => {
      if (remoteSyncTimerRef.current !== null) window.clearTimeout(remoteSyncTimerRef.current)
      if (remoteSyncIntervalRef.current !== null) window.clearInterval(remoteSyncIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (settingsWorkspace.directoryHandleChecked && !settingsWorkspace.directoryHandle) {
      setActiveModule('settings')
    }
  }, [settingsWorkspace.directoryHandleChecked, settingsWorkspace.directoryHandle])

  useEffect(() => {
    const selectedProjectId = selectedManagementProjectId
    const project = findProject(selectedProjectId)
    if (!selectedProjectId || project?.mode !== 'remote') return
    void ensureRemoteProjectSettings(selectedProjectId).then(() => {
      const settings = remoteProjectSettingsByIdRef.current[selectedProjectId]
      if (!settings) return
      if (settings.remote_database_profile_id) {
        settingsWorkspace.setSelectedDatabaseProfileId(settings.remote_database_profile_id)
      }
      if (settings.remote_storage_profile_id) {
        settingsWorkspace.setSelectedKodoProfileId(settings.remote_storage_profile_id)
      }
    })
  }, [selectedManagementProjectId, projects])

  const changeActiveModule = (key: string) => {
    const nextModule = key as PersonalSpaceActiveModule
    if (!activeProjectIdRef.current && nextModule !== 'settings') {
      setActiveModule('settings')
      void messageApi.warning('请先启用一个项目空间')
      return
    }
    if (!settingsWorkspace.directoryHandle && nextModule !== 'settings') {
      setActiveModule('settings')
      void messageApi.warning('请先选择授权目录')
      return
    }
    setActiveModule(nextModule)
  }

  const enableProject = (projectId: string) => {
    if (!projects.some((project) => project.id === projectId)) {
      void messageApi.warning('项目不存在，无法启用')
      return
    }
    setSelectedManagementProjectId(projectId)
    void activateProjectStateFromStorage(projectId).then(() => {
      void messageApi.success('已启用项目')
    })
  }

  const disableActiveProject = () => {
    if (!activeProjectIdRef.current) return
    writeProjectSpaceState(activeProjectIdRef.current, spaceRef.current)
    activateProjectState('')
    void messageApi.warning('已取消启用项目')
  }

  const openProjectManagement = () => {
    setSelectedManagementProjectId(activeProjectIdRef.current || projects[0]?.id || '')
    setWorkspacePage('management')
  }

  const closeProjectManagement = () => {
    setWorkspacePage('workbench')
  }

  const createLocalProject = async (name: string, description: string) => {
    const created = await projectRepository.createProject({
      name,
      description,
      localObjectRoot: settingsWorkspace.draftStorageDirectory || space.settings.storageDirectory || '',
      now: new Date().toISOString(),
    })
    writeProjectSpaceState(created.project.id, createEmptyProjectSpaceState(settingsWorkspace.draftStorageDirectory || space.settings.storageDirectory || ''))
    const nextProjects = await refreshProjectList(created.project.id)
    if (nextProjects.length === 1) activateProjectState(created.project.id)
    void messageApi.success('已创建本地项目')
  }

  const createRemoteProject = async (projectId: string, name: string, description: string) => {
    if (
      !projectId ||
      !settingsWorkspace.remoteReady ||
      settingsWorkspace.kodoVerificationProjectId !== projectId ||
      !settingsWorkspace.selectedDatabaseProfileId ||
      !settingsWorkspace.selectedKodoProfileId
    ) {
      void messageApi.warning('请先完成远程数据库验证、表结构初始化和七牛 Kodo 验证')
      return
    }

    const created = await remoteProjectRepository.createRemoteProject({
      id: projectId,
      name,
      description,
      databaseProvider: settingsWorkspace.databaseProfileDraft.provider,
      databaseProfileId: settingsWorkspace.selectedDatabaseProfileId,
      storageProfileId: settingsWorkspace.selectedKodoProfileId,
      now: new Date().toISOString(),
    })
    if (
      created.settings.database_provider !== 'postgresql' &&
      created.settings.database_provider !== 'mysql'
    ) {
      throw new Error('远程项目数据库类型无效。')
    }
    if (!created.settings.remote_database_profile_id || !created.settings.remote_storage_profile_id) {
      throw new Error('远程项目缺少数据库或对象存储配置。')
    }
    await projectRepository.createRemoteProject({
      id: created.project.id,
      name: created.project.name,
      description: created.project.description,
      databaseProvider: created.settings.database_provider,
      databaseProfileId: created.settings.remote_database_profile_id,
      storageProfileId: created.settings.remote_storage_profile_id,
      now: created.project.created_at,
    })
    rememberRemoteProjectSettings(created.project, created.settings)
    writeProjectSpaceState(created.project.id, createEmptyProjectSpaceState(settingsWorkspace.draftStorageDirectory || space.settings.storageDirectory || ''))
    const nextProjects = await refreshProjectList(created.project.id)
    if (nextProjects.length === 1) activateProjectState(created.project.id)
    void messageApi.success('已创建远程项目')
  }

  const renameProject = async (projectId: string, name: string, description: string) => {
    await ensureRemoteProjectSettings(projectId)
    const repository = findProjectRepository(projectId)
    const updated = await repository.updateProject(projectId, {
      name,
      description,
      updatedAt: new Date().toISOString(),
    })
    if (!updated) {
      void messageApi.warning('项目不存在，无法编辑')
      return
    }
    await refreshProjectList(projectId)
    void messageApi.success('已编辑项目')
  }

  const updateRemoteProjectLinks = async (projectId: string) => {
    const project = findProject(projectId)
    if (!project || project.mode !== 'remote') {
      void messageApi.warning('请选择远程项目')
      return
    }
    if (
      !settingsWorkspace.remoteReady ||
      settingsWorkspace.kodoVerificationProjectId !== projectId ||
      !settingsWorkspace.selectedDatabaseProfileId ||
      !settingsWorkspace.selectedKodoProfileId
    ) {
      void messageApi.warning('请先完成远程数据库验证、表结构初始化和当前项目 Kodo 验证')
      return
    }

    const input = {
      name: project.name,
      description: project.description,
      updatedAt: new Date().toISOString(),
      databaseProvider: settingsWorkspace.databaseProfileDraft.provider,
      databaseProfileId: settingsWorkspace.selectedDatabaseProfileId,
      storageProfileId: settingsWorkspace.selectedKodoProfileId,
    }
    const updated = await remoteProjectRepository.updateProject(projectId, input)
    if (!updated) {
      void messageApi.warning('远程项目不存在，无法保存连接')
      return
    }
    rememberRemoteProjectSettings(updated.project, updated.settings)
    const localSnapshot = await projectRepository.getProject(projectId)
    if (localSnapshot?.project.mode === 'remote') {
      await projectRepository.updateProject(projectId, input)
    }
    await refreshProjectList(projectId)
    void messageApi.success('已保存远程项目连接')
  }

  const deleteProject = async (projectId: string) => {
    const projectToDelete = projects.find((project) => project.id === projectId)
    if (projectToDelete?.mode === 'remote') await ensureRemoteProjectSettings(projectId)
    const repository = findProjectRepository(projectId)
    const result = await hardDeleteProjectWithObjects({
      projectId,
      repository,
      localRepository: projectToDelete?.mode === 'remote' ? projectRepository : undefined,
      objectStorage: projectToDelete?.mode === 'remote' ? remoteProjectObjectStorage : projectObjectStorage,
      assetManager: projectAssetManager,
      storageProvider: projectToDelete?.mode === 'remote' ? 'qiniu_kodo' : 'local',
      now: new Date().toISOString(),
    })
    deleteProjectSpaceState(projectId)
    const wasActive = activeProjectIdRef.current === projectId
    if (wasActive) activateProjectState('')
    const nextProjects = await refreshProjectList('')
    const nextEnabledProjectId = wasActive ? resolveEnabledProjectId(nextProjects, readActiveProjectId()) : activeProjectIdRef.current
    if (wasActive && nextEnabledProjectId) void activateProjectStateFromStorage(nextEnabledProjectId, undefined, nextProjects)
    if (result.cleanupTasks.length > 0) {
      void messageApi.warning('已删除项目，部分对象进入待清理记录。')
    } else {
      void messageApi.success('已删除项目')
    }
  }

  const migrateActiveProjectToRemote = async () => {
    if (migrationInFlightProjectIdRef.current) {
      void messageApi.warning('项目正在迁移，请稍候')
      return
    }
    if (!activeProjectId || !settingsWorkspace.remoteReady || settingsWorkspace.kodoVerificationProjectId !== activeProjectId) {
      void messageApi.warning('请先验证远程数据库和七牛 Kodo 配置')
      return
    }

    const migrationProjectId = activeProjectId
    migrationInFlightProjectIdRef.current = migrationProjectId
    setMigratingProjectId(migrationProjectId)
    try {
      writeProjectSpaceState(migrationProjectId, spaceRef.current)
      const project = projects.find((item) => item.id === migrationProjectId)
      if (project) {
        rememberRemoteProjectSettings(project, {
          project_id: migrationProjectId,
          storage_provider: 'qiniu_kodo',
          database_provider: settingsWorkspace.databaseProfileDraft.provider,
          local_object_root: null,
          remote_database_profile_id: settingsWorkspace.selectedDatabaseProfileId,
          remote_storage_profile_id: settingsWorkspace.selectedKodoProfileId,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      try {
        await syncProjectSpaceStateToLocalProjectStorage({
          projectId: migrationProjectId,
          projectName: project?.name ?? '默认项目',
          localObjectRoot: settingsWorkspace.draftStorageDirectory || spaceRef.current.settings.storageDirectory || '',
          state: spaceRef.current,
          localRepository: projectRepository,
          localObjectStorage: projectObjectStorage,
          directoryHandle: settingsWorkspace.directoryHandle,
          now: new Date().toISOString(),
        })
      } catch (error) {
        void messageApi.warning(`同步本地项目存储失败：${error instanceof Error ? error.message : String(error)}`)
        return
      }

      const result = await migrateLocalProjectToRemote({
        projectId: migrationProjectId,
        localRepository: projectRepository,
        remoteRepository: remoteProjectRepository,
        remoteDatabaseProvider: settingsWorkspace.databaseProfileDraft.provider,
        remoteDatabaseProfileId: settingsWorkspace.selectedDatabaseProfileId,
        remoteStorageProfileId: settingsWorkspace.selectedKodoProfileId,
        sourceObjectStorage: projectObjectStorage,
        remoteObjectStorage: remoteProjectObjectStorage,
        assetManager: projectAssetManager,
        now: new Date().toISOString(),
      })

      if (result.status === 'failed') {
        void messageApi.warning(`迁移到远程失败：${result.errorMessage}`)
        return
      }

      const nextProjects = await refreshProjectList(migrationProjectId)
      await activateProjectStateFromStorage(migrationProjectId, undefined, nextProjects)
      void messageApi.success('已迁移到远程项目存储')
    } finally {
      if (migrationInFlightProjectIdRef.current === migrationProjectId) {
        migrationInFlightProjectIdRef.current = ''
        setMigratingProjectId('')
      }
    }
  }

  const createCharacter = () => {
    setSpace((current) => addCharacterProfile(current, newCharacterName))
    setNewCharacterName('')
  }

  const createStoryboard = () => {
    setSpace((current) => addStoryboardGroup(current, newStoryboardName))
    setNewStoryboardName('')
  }

  const exportStoryboardWithStatus = async (
    key: string,
    action: () => Promise<{ kind: 'directory' | 'file'; path?: string }>,
    directoryMessage: string,
    fileMessage: string,
    errorMessage: string,
  ) => {
    setStoryboardExportingKey(key)
    try {
      const result = await action()
      void messageApi.success(result.kind === 'directory'
        ? `${directoryMessage}：${result.path}`
        : `${fileMessage}：${result.path}`)
    } catch (error) {
      void messageApi.error(`${errorMessage}：${String(error)}`)
    } finally {
      setStoryboardExportingKey('')
    }
  }

  const exportStoryboardAsset = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-legacy-${id}`,
      () => exportStoryboardAssetToTarget(space, id, settingsWorkspace.directoryHandle, projectReadOptionsForActiveProject()),
      '已导出剧情编排 ZIP',
      '已保存剧情编排 ZIP',
      '导出剧情编排资产失败',
    )
  }

  const exportStoryboardVoiceAssets = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-voices-${id}`,
      () => exportStoryboardVoiceAssetsToTarget(space, id, settingsWorkspace.directoryHandle, projectReadOptionsForActiveProject()),
      '已导出分组配音资产 ZIP',
      '已保存分组配音资产 ZIP',
      '导出分组配音资产失败',
    )
  }

  const exportStoryboardCharacterAssets = async (id: string) => {
    await exportStoryboardWithStatus(
      `group-characters-${id}`,
      () => exportStoryboardCharacterAssetsToTarget(space, id, settingsWorkspace.directoryHandle, projectReadOptionsForActiveProject()),
      '已导出分组关联角色资产 ZIP',
      '已保存分组关联角色资产 ZIP',
      '导出分组关联角色资产失败',
    )
  }

  const exportAllStoryboardVoiceAssets = async () => {
    await exportStoryboardWithStatus(
      'all-voices',
      () => exportAllStoryboardVoiceAssetsToTarget(space, settingsWorkspace.directoryHandle, projectReadOptionsForActiveProject()),
      '已导出所有分组配音资产 ZIP',
      '已保存所有分组配音资产 ZIP',
      '导出所有分组配音资产失败',
    )
  }

  const exportAllStoryboardCharacterAssets = async () => {
    await exportStoryboardWithStatus(
      'all-characters',
      () => exportAllStoryboardCharacterAssetsToTarget(space, settingsWorkspace.directoryHandle, projectReadOptionsForActiveProject()),
      '已导出所有分组关联角色资产 ZIP',
      '已保存所有分组关联角色资产 ZIP',
      '导出所有分组关联角色资产失败',
    )
  }

  const uploadCharacterPortrait = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createPortraitAssetForUpload(space, file, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignAssetToCharacterColumn(withAsset, characterId, storedAsset.id, 'portrait')
      })
      void messageApi.success('已上传角色肖像')
    } catch (error) {
      void messageApi.error(`上传肖像失败：${String(error)}`)
    }
  }

  const uploadCharacterSprite = async (characterId: string, files: File[]) => {
    try {
      const storedAsset = await createSpriteAssetForUpload(space, files, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignAssetToCharacterColumn(withAsset, characterId, storedAsset.id, 'sprite')
      })
      void messageApi.success('已上传角色精灵图')
    } catch (error) {
      void messageApi.error(`上传精灵图失败：${String(error)}`)
    }
  }

  const uploadCharacterVoice = async (characterId: string, file: File) => {
    try {
      const storedAsset = await createVoiceAssetForUpload(space, file, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignAssetToCharacterColumn(withAsset, characterId, storedAsset.id, 'voice')
      })
      void messageApi.success('已上传角色配音')
    } catch (error) {
      void messageApi.error(`上传配音失败：${String(error)}`)
    }
  }

  const uploadStoryboardVoice = async (groupId: string, file: File) => {
    try {
      const storedAsset = await createVoiceAssetForUpload(space, file, settingsWorkspace.directoryHandle)
      setSpace((current) => {
        const withAsset = { ...current, assets: [storedAsset, ...current.assets] }
        return assignVoiceToStoryboardGroup(withAsset, groupId, storedAsset.id)
      })
      void messageApi.success('已导入并关联配音')
    } catch (error) {
      void messageApi.error(`导入配音失败：${String(error)}`)
    }
  }

  const uploadCommonResource = async (kind: CommonAssetKind, file: File, groupName?: string) => {
    try {
      const storedAsset = await createCommonResourceAssetForUpload(space, kind, file, settingsWorkspace.directoryHandle, groupName)
      setSpace((current) => ({ ...current, assets: [storedAsset, ...current.assets] }))
      void messageApi.success(`已导入${assetKindLabel(kind)}素材`)
    } catch (error) {
      void messageApi.error(`导入${assetKindLabel(kind)}素材失败：${String(error)}`)
    }
  }

  const deleteAsset = async (assetId: string) => {
    const result = await deleteAssetWithOptionalResources(space, assetId, settingsWorkspace.directoryHandle)
    setSpace((current) => applyAssetDeleteResult(current, assetId, result))
    if (result.attemptedResourceDeletion) {
      if (result.pendingDeletedPaths.length > 0) {
        void messageApi.warning('部分资源未能删除，可能已经不存在。')
      } else {
        void messageApi.success('已删除资源和存储目录文件。')
      }
    }
  }

  const portraitUploadProps = (characterId: string): UploadProps => ({
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCharacterPortrait(characterId, file as File)
      return false
    },
  })

  const spriteUploadProps = (characterId: string): UploadProps => ({
    accept: '.png,.json',
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const files = fileList.flatMap((item) => item.originFileObj ? [item.originFileObj] : [])
      if (
        files.some((file) => file.name.toLowerCase().endsWith('.png')) &&
        files.some((file) => file.name.toLowerCase() === 'index.json')
      ) {
        const batchKey = files.map((file) => `${file.name}:${file.size}`).sort().join('|')
        if (spriteUploadBatchKeyByCharacter.current[characterId] === batchKey) return
        spriteUploadBatchKeyByCharacter.current[characterId] = batchKey
        window.setTimeout(() => {
          if (spriteUploadBatchKeyByCharacter.current[characterId] === batchKey) {
            delete spriteUploadBatchKeyByCharacter.current[characterId]
          }
        }, 1000)
        void uploadCharacterSprite(characterId, files)
      }
    },
  })

  const voiceUploadProps = (characterId: string): UploadProps => ({
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCharacterVoice(characterId, file as File)
      return false
    },
  })

  const storyboardVoiceUploadProps = (groupId: string): UploadProps => ({
    accept: 'audio/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadStoryboardVoice(groupId, file as File)
      return false
    },
  })

  const commonResourceUploadProps = (kind: CommonAssetKind, groupName?: string): UploadProps => ({
    accept: kind === 'map' || kind === 'image' ? 'image/*' : kind === 'voice' ? 'audio/*' : '*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadCommonResource(kind, file as File, groupName)
      return false
    },
  })

  const imageSpriteUploadProps = (groupName?: string): UploadProps => ({
    accept: '.png,.json',
    multiple: true,
    maxCount: 2,
    showUploadList: false,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const files = fileList.flatMap((item) => item.originFileObj ? [item.originFileObj] : [])
      if (
        files.some((file) => file.name.toLowerCase().endsWith('.png')) &&
        files.some((file) => file.name.toLowerCase() === 'index.json')
      ) {
        const batchKey = files.map((file) => `${file.name}:${file.size}`).sort().join('|')
        if (imageSpriteUploadBatchKey.current === batchKey) return
        imageSpriteUploadBatchKey.current = batchKey
        window.setTimeout(() => {
          if (imageSpriteUploadBatchKey.current === batchKey) imageSpriteUploadBatchKey.current = null
        }, 1000)
        void (async () => {
          try {
            const storedAsset = await createSpriteAssetForUpload(space, files, settingsWorkspace.directoryHandle, groupName)
            setSpace((current) => ({ ...current, assets: [storedAsset, ...current.assets] }))
            void messageApi.success('已导入精灵图')
          } catch (error) {
            void messageApi.error(`导入精灵图失败：${String(error)}`)
          }
        })()
      }
    },
  })

  const imageAssets = space.assets.filter((asset) => asset.kind === 'image' && asset.assetSubtype !== 'portrait')
  const portraitAssets = imageAssets
  const spriteAssets = space.assets.filter((asset) => asset.kind === 'sprite')
  const voiceAssets = space.assets.filter((asset) => asset.kind === 'voice')
  const characterOptions = space.characters.map((character) => ({ label: character.name, value: character.id }))
  const assetOptions = (assets: typeof space.assets) => assets.map((asset) => ({ label: asset.name, value: asset.id }))
  const resourceSections = [
    {
      kind: 'image' as const,
      title: '公共图片',
      description: '单张图片、地图、场景图、抠图结果和特效参考图。',
      importLabel: '导入公共图片',
      emptyDescription: '还没有公共图片。导入图片或从工作台批量导入后会显示在这里。',
      groupNames: space.assetGroups.image,
      starredGroupNames: space.starredAssetGroups.image,
      assets: imageAssets,
    },
    {
      kind: 'sprite' as const,
      title: '精灵图',
      description: '角色精灵图和特效精灵图，使用 PNG 与 index.json 成套管理。',
      importLabel: '导入精灵图',
      emptyDescription: '还没有精灵图。导入精灵图或从精灵图工作台收藏后会显示在这里。',
      groupNames: space.assetGroups.sprite,
      starredGroupNames: space.starredAssetGroups.sprite,
      assets: spriteAssets,
    },
    {
      kind: 'voice' as const,
      title: '配音',
      description: '从配音工作台收藏或手动导入的角色语音、旁白和音效配音。',
      importLabel: '导入配音',
      emptyDescription: '还没有配音素材。生成或导入配音后可关联角色和剧情组。',
      groupNames: space.assetGroups.voice,
      starredGroupNames: space.starredAssetGroups.voice,
      assets: voiceAssets,
    },
  ]
  const assetCounts = {
    image: imageAssets.length,
    sprite: spriteAssets.length,
    voice: voiceAssets.length,
  }
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const activeProjectObjectStorage = activeProject?.mode === 'remote'
    ? remoteProjectObjectStorage
    : projectObjectStorage
  const projectResourceReadOptions = {
    projectObjectStorage: activeProjectObjectStorage,
    projectAssetManager,
    projectId: activeProject?.id,
    projectMode: activeProject?.mode,
  }

  const storyboardVoiceRefs = (assetId: string) => space.storyboardGroups
    .flatMap((group) => group.voiceEntries
      .filter((entry) => entry.assetId === assetId)
      .map((entry) => `${group.name} #${entry.order + 1}`))

  return {
    space,
    ...settingsWorkspace,
    projects,
    activeProject,
    enabledProjectId: activeProjectId,
    projectObjectStorage: activeProjectObjectStorage,
    projectAssetManager,
    projectResourceReadOptions,
    workspacePage,
    openProjectManagement,
    closeProjectManagement,
    selectedManagementProjectId,
    setSelectedManagementProjectId,
    enableProject,
    disableActiveProject,
    activeModule,
    newCharacterName,
    newStoryboardName,
    storyboardExportingKey,
    migratingProjectId,
    syncingProjectId,
    portraitAssets,
    spriteAssets,
    voiceAssets,
    characterOptions,
    resourceSections,
    assetCounts,
    setNewCharacterName,
    setNewStoryboardName,
    changeActiveModule,
    createLocalProject,
    createRemoteProject,
    renameProject,
    updateRemoteProjectLinks,
    deleteProject,
    migrateActiveProjectToRemote,
    syncActiveProjectNow,
    createCharacter,
    createStoryboard,
    exportStoryboardAsset,
    exportStoryboardVoiceAssets,
    exportStoryboardCharacterAssets,
    exportAllStoryboardVoiceAssets,
    exportAllStoryboardCharacterAssets,
    portraitUploadProps,
    spriteUploadProps,
    voiceUploadProps,
    storyboardVoiceUploadProps,
    commonResourceUploadProps,
    imageSpriteUploadProps,
    assetOptions,
    assetKindLabel,
    storyboardVoiceRefs,
    renameCharacter: (characterId: string, name: string) => setSpace((current) => renameCharacterProfile(current, characterId, name)),
    toggleCharacterStar: (characterId: string) => setSpace((current) => toggleCharacterStar(current, characterId)),
    reorderCharacter: (characterId: string, direction: 'up' | 'down') => setSpace((current) => reorderCharacterProfile(current, characterId, direction)),
    deleteCharacter: (characterId: string) => setSpace((current) => deleteCharacterProfile(current, characterId)),
    assignAsset: (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice') => {
      setSpace((current) => assignAssetToCharacterColumn(current, characterId, assetId, column))
    },
    unassignAsset: (characterId: string, assetId: string, column: 'portrait' | 'sprite' | 'voice') => {
      setSpace((current) => unassignAssetFromCharacterColumn(current, characterId, assetId, column))
    },
    reorderCharacterVoice: (characterId: string, assetId: string, direction: 'up' | 'down') => {
      setSpace((current) => reorderCharacterVoice(current, characterId, assetId, direction))
    },
    moveCharacterVoice: (characterId: string, draggedAssetId: string, targetAssetId: string) => {
      setSpace((current) => moveCharacterVoice(current, characterId, draggedAssetId, targetAssetId))
    },
    renameStoryboard: (groupId: string, name: string) => setSpace((current) => renameStoryboardGroup(current, groupId, name)),
    toggleStoryboardStar: (groupId: string) => setSpace((current) => toggleStoryboardStar(current, groupId)),
    deleteStoryboard: (groupId: string) => setSpace((current) => deleteStoryboardGroup(current, groupId)),
    getStoryboardLinkedCharacterIds: (groupId: string) => getStoryboardLinkedCharacterIds(space, groupId),
    assignVoiceToStoryboard: (groupId: string, assetId: string) => {
      setSpace((current) => assignVoiceToStoryboardGroup(current, groupId, assetId, ''))
    },
    unassignStoryboardVoice: (groupId: string, assetId: string) => {
      setSpace((current) => unassignVoiceFromStoryboardGroup(current, groupId, assetId))
    },
    assignStoryboardVoiceCharacter: (groupId: string, assetId: string, characterId: string) => {
      setSpace((current) => {
        const withVoiceLink = updatePersonalSpaceAsset(current, assetId, { linkedCharacterIds: [characterId] })
        return {
          ...withVoiceLink,
          storyboardGroups: withVoiceLink.storyboardGroups.map((group) => (
            group.id === groupId ? { ...group, characterIds: getStoryboardLinkedCharacterIds(withVoiceLink, groupId) } : group
          )),
        }
      })
    },
    updateStoryboardVoice: (groupId: string, assetId: string, text: string) => {
      setSpace((current) => updateStoryboardVoiceText(current, groupId, assetId, text))
    },
    reorderStoryboardVoice: (groupId: string, assetId: string, direction: 'up' | 'down') => {
      setSpace((current) => reorderStoryboardVoice(current, groupId, assetId, direction))
    },
    moveStoryboardVoice: (groupId: string, draggedAssetId: string, targetAssetId: string, placement: 'before' | 'after' = 'after') => {
      setSpace((current) => moveStoryboardVoice(current, groupId, draggedAssetId, targetAssetId, placement))
    },
    renameAsset: (assetId: string, name: string) => setSpace((current) => updatePersonalSpaceAsset(current, assetId, { name })),
    changeAssetGroupName: (assetId: string, groupName: string) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { groupName }))
    },
    changeVoiceDialogueText: (assetId: string, dialogueText: string) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { dialogueText }))
    },
    changeEffectVoiceLinks: (assetId: string, voiceIds: string[]) => {
      setSpace((current) => voiceIds.reduce(
        (next, voiceId) => linkEffectAssetToVoice(next, assetId, voiceId),
        updatePersonalSpaceAsset(current, assetId, { linkedVoiceAssetIds: [] }),
      ))
    },
    changeVoiceCharacterLinks: (assetId: string, linkedCharacterIds: string[]) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedCharacterIds }))
    },
    changeVoiceStoryboardLinks: (assetId: string, linkedStoryboardIds: string[]) => {
      setSpace((current) => updatePersonalSpaceAsset(current, assetId, { linkedStoryboardIds }))
    },
    addAssetGroup: (kind: AssetGroupKind, name: string) => {
      setSpace((current) => addAssetGroup(current, kind, name))
    },
    renameAssetGroup: (kind: AssetGroupKind, fromName: string, toName: string) => {
      setSpace((current) => renameAssetGroup(current, kind, fromName, toName))
    },
    toggleAssetGroupStar: (kind: AssetGroupKind, name: string) => {
      setSpace((current) => toggleAssetGroupStar(current, kind, name))
    },
    transferAssetGroup: (kind: AssetGroupKind, fromName: string, toName: string) => {
      setSpace((current) => transferAssetGroup(current, kind, fromName, toName))
    },
    deleteAssetGroup: (kind: AssetGroupKind, name: string, options: { deleteAssets?: boolean; transferToGroup?: string }) => {
      try {
        setSpace((current) => deleteAssetGroup(current, kind, name, options))
      } catch (error) {
        void messageApi.error(String(error).replace(/^Error: /, ''))
      }
    },
    deleteAsset,
    setDeleteResourcesWithContent: (deleteResourcesWithContent: boolean) => {
      setSpace((current) => ({
        ...current,
        settings: { ...current.settings, deleteResourcesWithContent },
      }))
    },
  }
}
