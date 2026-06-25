import test from 'node:test'
import assert from 'node:assert/strict'

import { createProjectManagementActions } from './projectManagementActions'
import type { Project } from '../ProjectStorage'

function createProject(id = 'project-a'): Project {
  return {
    id,
    name: '山海再就业',
    description: '测试项目',
    mode: 'remote',
    status: 'active',
    object_key_prefix: 'objects/山海再就业',
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    metadata_json: null,
  }
}

test('saving remote project links keeps the current database provider in project settings', async () => {
  const project = createProject()
  const remoteUpdateInputs: Array<Record<string, unknown>> = []
  const localUpdateInputs: Array<Record<string, unknown>> = []
  const bindings: Array<[string, string, string]> = []
  const messages: Array<{ type: 'success' | 'warning'; content: string }> = []

  const actions = createProjectManagementActions({
    localRepository: {
      initializeSchema: async () => {},
      createProject: async () => { throw new Error('unexpected createProject') },
      createRemoteProject: async () => { throw new Error('unexpected createRemoteProject') },
      updateProject: async (_projectId: string, input: Record<string, unknown>) => {
        localUpdateInputs.push(input as Record<string, unknown>)
        return { project, settings: {} as never }
      },
      listProjects: async () => [project],
      getProject: async () => ({ project, settings: {} as never }),
      importProjectRows: async () => {},
      exportProjectRows: async () => null,
      listAssets: async () => [],
      addCleanupTasks: async () => {},
      listCleanupTasks: async () => [],
      deleteProject: async () => {},
    },
    remoteRepository: {
      initializeSchema: async () => {},
      createProject: async () => { throw new Error('unexpected createProject') },
      createRemoteProject: async () => { throw new Error('unexpected createRemoteProject') },
      updateProject: async (_projectId: string, input: Record<string, unknown>) => {
        remoteUpdateInputs.push(input as Record<string, unknown>)
        return { project, settings: { database_provider: 'mysql' } as never }
      },
      listProjects: async () => [project],
      getProject: async () => ({ project, settings: { database_provider: 'mysql' } as never }),
      importProjectRows: async () => {},
      exportProjectRows: async () => null,
      listAssets: async () => [],
      addCleanupTasks: async () => {},
      listCleanupTasks: async () => [],
      deleteProject: async () => {},
    },
    localObjectStorage: {
      uploadObject: async () => {},
      getObject: async () => null,
      deleteObject: async () => {},
      listObjects: async () => [],
      deleteObjects: async () => [],
    },
    remoteObjectStorage: {
      uploadObject: async () => {},
      getObject: async () => null,
      deleteObject: async () => {},
      listObjects: async () => [],
      deleteObjects: async () => [],
    },
    assetManager: {
      saveAssetFile: async () => '',
      resolveAssetObjectKey: () => '',
      resolveAssetPreviewObjectKey: () => '',
      resolveAssetSourceObjectKey: () => '',
      resolveAssetIndexObjectKey: () => '',
      readAssetPreview: async () => null,
      readAssetSource: async () => null,
      readAssetIndex: async () => null,
      deleteAssetFiles: async () => {},
      deleteAssetPreview: async () => {},
      deleteAssetSource: async () => {},
      deleteAssetIndex: async () => {},
    },
    storageWorkflow: {
      repositoryForProject: () => ({
        initializeSchema: async () => {},
        createProject: async () => { throw new Error('unexpected createProject') },
        createRemoteProject: async () => { throw new Error('unexpected createRemoteProject') },
        updateProject: async () => null,
        listProjects: async () => [],
        getProject: async () => null,
        importProjectRows: async () => {},
        exportProjectRows: async () => null,
        listAssets: async () => [],
        addCleanupTasks: async () => {},
        listCleanupTasks: async () => [],
        deleteProject: async () => {},
      }),
      syncProjectStateToStorage: async () => {},
    },
    remoteDeviceBindingResolver: {
      bindProjectToCurrentDevice: (projectId: string, databaseProfileId: string, storageProfileId: string) => {
        bindings.push([projectId, databaseProfileId, storageProfileId])
      },
    },
    messageApi: {
      success: (content: string) => { messages.push({ type: 'success', content }) },
      warning: (content: string) => { messages.push({ type: 'warning', content }) },
      error: () => {},
    },
    getSettingsWorkspace: () => ({
      draftStorageDirectory: '',
      remoteReady: true,
      kodoVerificationProjectId: project.id,
      selectedDatabaseProfileId: 'db-profile',
      selectedKodoProfileId: 'kodo-profile',
      databaseProfileDraft: {
        provider: 'mysql' as const,
      },
    }),
    getProjects: () => [project],
    getActiveProjectId: () => project.id,
    getSpace: () => ({
      characters: [],
      storyboards: [],
      assetGroups: [],
      assets: [],
      settings: {
        storageDirectory: '',
        autoPlayStoryboardVoice: false,
        deleteResourcesWithContent: false,
      },
      generated: {
        voiceCloneMap: {},
      },
    }),
    migrationInFlightProjectIdRef: { current: '' },
    setMigratingProjectId: () => {},
    refreshProjectList: async () => [project],
    activateProjectState: () => {},
    activateProjectStateFromStorage: async () => true,
    ensureRemoteProjectSettings: async () => {},
    rememberRemoteProjectSettings: () => {},
    findProject: (projectId: string) => (projectId === project.id ? project : undefined),
  } as any)

  const result = await actions.updateRemoteProjectLinks(project.id)

  assert.equal(result, true)
  assert.deepEqual(bindings, [[project.id, 'db-profile', 'kodo-profile']])
  assert.equal(remoteUpdateInputs[0]?.databaseProvider, 'mysql')
  assert.equal(localUpdateInputs[0]?.databaseProvider, 'mysql')
  assert.ok(messages.some((message) => message.type === 'success'))
})
