import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearProjectManagementDirtySource,
  createCleanProjectManagementDirtyState,
  hasProjectManagementUnsavedChanges,
  markProjectManagementDirty,
  projectManagementDirtySignature,
} from './projectManagementDirtyModel'

test('project management dirty state starts clean', () => {
  const state = createCleanProjectManagementDirtyState()

  assert.equal(hasProjectManagementUnsavedChanges(state), false)
  assert.equal(projectManagementDirtySignature(state), '')
})

test('project management dirty state tracks project and remote profile draft changes', () => {
  let state = createCleanProjectManagementDirtyState()

  state = markProjectManagementDirty(state, 'projectDetails')
  state = markProjectManagementDirty(state, 'databaseProfileDraft')
  state = markProjectManagementDirty(state, 'kodoProfileDraft')

  assert.equal(hasProjectManagementUnsavedChanges(state), true)
  assert.equal(projectManagementDirtySignature(state), 'projectDetails|databaseProfileDraft|kodoProfileDraft')
})

test('project management dirty state tracks project connection binding changes', () => {
  const state = markProjectManagementDirty(
    createCleanProjectManagementDirtyState(),
    'remoteProjectBinding',
  )

  assert.equal(hasProjectManagementUnsavedChanges(state), true)
  assert.equal(projectManagementDirtySignature(state), 'remoteProjectBinding')
})

test('project management dirty state can clear discarded or saved sources', () => {
  let state = createCleanProjectManagementDirtyState()
  state = markProjectManagementDirty(state, 'projectDetails')
  state = markProjectManagementDirty(state, 'remoteProjectBinding')

  state = clearProjectManagementDirtySource(state, 'projectDetails')

  assert.equal(hasProjectManagementUnsavedChanges(state), true)
  assert.equal(projectManagementDirtySignature(state), 'remoteProjectBinding')
})
