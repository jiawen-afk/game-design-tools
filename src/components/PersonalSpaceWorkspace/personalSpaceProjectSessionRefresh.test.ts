import test from 'node:test'
import assert from 'node:assert/strict'

import { createEmptyProjectSpaceState } from './projectSpaceState'
import {
  createLocalProjectRows,
  createProjectSessionHarness,
  createRepositoryStub,
  createSessionProject,
  installLocalStorage,
} from './personalSpaceProjectSessionTestHelpers.test'

test('refreshing active project state reloads current workbench data from repository rows', async () => {
  const restoreLocalStorage = installLocalStorage()
  try {
    const project = createSessionProject()
    const staleSpace = createEmptyProjectSpaceState('D:\\GameAssets')
    staleSpace.characters = [{
      id: 'character-stale',
      name: 'Stale Character',
      starred: false,
      order: 0,
      portraitAssetIds: [],
      spriteAssetIds: [],
      voiceAssetIds: [],
      portraitAssets: [],
      spriteAssets: [],
      voiceAssets: [],
    }]
    let exportCalls = 0
    const { actions, state, stateRefs } = createProjectSessionHarness({
      projects: [project],
      activeProjectId: project.id,
      selectedManagementProjectId: project.id,
      activeModule: 'characters',
      space: staleSpace,
      localRepository: createRepositoryStub({
        exportProjectRows: async (projectId) => {
          exportCalls += 1
          assert.equal(projectId, project.id)
          return createLocalProjectRows(project)
        },
      }),
    })

    const refreshed = await actions.refreshActiveProjectState()

    assert.equal(refreshed, true)
    assert.equal(exportCalls, 1)
    assert.deepEqual(state.space.characters.map((character) => character.name), ['DB Character'])
    assert.deepEqual(stateRefs.spaceRef.current.characters.map((character) => character.name), ['DB Character'])
  } finally {
    restoreLocalStorage()
  }
})
