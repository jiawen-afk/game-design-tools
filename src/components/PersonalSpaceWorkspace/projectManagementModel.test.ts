import assert from 'node:assert/strict'
import test from 'node:test'

import { isRemoteProjectConfigurationReady } from './projectManagementModel'

const readyInput = {
  remoteReady: true,
  kodoVerificationProjectId: 'project-a',
  selectedDatabaseProfileId: 'db-profile',
  selectedKodoProfileId: 'kodo-profile',
}

test('remote project configuration readiness is bound to the target project and local profiles', () => {
  assert.equal(isRemoteProjectConfigurationReady(readyInput, 'project-a'), true)
  assert.equal(isRemoteProjectConfigurationReady({ ...readyInput, remoteReady: false }, 'project-a'), false)
  assert.equal(isRemoteProjectConfigurationReady({ ...readyInput, kodoVerificationProjectId: 'project-b' }, 'project-a'), false)
  assert.equal(isRemoteProjectConfigurationReady({ ...readyInput, selectedDatabaseProfileId: '' }, 'project-a'), false)
  assert.equal(isRemoteProjectConfigurationReady({ ...readyInput, selectedKodoProfileId: '' }, 'project-a'), false)
  assert.equal(isRemoteProjectConfigurationReady(readyInput, ''), false)
})
