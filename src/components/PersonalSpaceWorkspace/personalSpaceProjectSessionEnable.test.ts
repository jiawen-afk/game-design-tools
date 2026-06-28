import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createProjectSessionHarness,
  createRepositoryStub,
  createSessionProject,
  installLocalStorage,
} from './personalSpaceProjectSessionTestHelpers.test'

test('enabling a remote project without cached state does not report success', async () => {
  const restoreLocalStorage = installLocalStorage()
  try {
    const project = createSessionProject({
      name: '山海再就业',
      mode: 'remote',
      object_key_prefix: 'objects/山海再就业',
    })
    const { actions, messages, state } = createProjectSessionHarness({
      projects: [project],
      bootstrapProjects: [],
      settings: {
        directoryHandle: null,
        draftStorageDirectory: '',
      },
      remoteRepository: createRepositoryStub({
        listProjects: async () => [project],
      }),
    })

    actions.enableProject('project-a')
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.equal(state.selectedManagementProjectId, 'project-a')
    assert.equal(state.activeProjectId, '')
    assert.equal(messages.some((message) => message.type === 'success' && message.content === '已启用项目'), false)
    assert.ok(messages.some((message) => message.type === 'warning'))
  } finally {
    restoreLocalStorage()
  }
})
