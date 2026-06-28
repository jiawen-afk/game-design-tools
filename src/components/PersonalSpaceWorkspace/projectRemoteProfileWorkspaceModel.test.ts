import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from '../../desktopApi'
import { getRemoteConnectionProfileWorkspaceStatus } from './projectRemoteProfileWorkspaceModel'

function databaseSummary(id: string, lastVerifiedAt: string | null = null): ProjectConnectionProfileSummary {
  return {
    id,
    type: 'database',
    displayName: `Database ${id}`,
    redactedSummary: 'asset_user@db.example.com:5432/assets',
    lastVerifiedAt,
    schemaInitializedAt: null,
  }
}

const passedVerification: ProjectConnectionVerificationResult = {
  ok: true,
  message: 'ok',
  lastVerifiedAt: '2026-06-28T00:00:00.000Z',
}

test('remote connection profile workspace status requires database schema and project-specific kodo verification', () => {
  const withoutKodoProject = getRemoteConnectionProfileWorkspaceStatus({
    databaseProfiles: [databaseSummary('db1', '2026-06-28T00:00:00.000Z')],
    selectedDatabaseProfileId: 'db1',
    selectedKodoProfileId: 'kodo1',
    databaseProfileMode: 'edit',
    kodoProfileMode: 'edit',
    databaseDraftTestState: 'passed',
    kodoDraftTestState: 'passed',
    databaseVerification: null,
    kodoVerification: passedVerification,
    kodoVerificationProjectId: '',
    databaseSchemaReady: true,
  })

  assert.equal(withoutKodoProject.selectedDatabaseProfile?.id, 'db1')
  assert.equal(withoutKodoProject.databaseReady, true)
  assert.equal(withoutKodoProject.kodoReady, false)
  assert.equal(withoutKodoProject.remoteReady, false)

  const ready = getRemoteConnectionProfileWorkspaceStatus({
    databaseProfiles: [databaseSummary('db1', '2026-06-28T00:00:00.000Z')],
    selectedDatabaseProfileId: 'db1',
    selectedKodoProfileId: 'kodo1',
    databaseProfileMode: 'edit',
    kodoProfileMode: 'edit',
    databaseDraftTestState: 'passed',
    kodoDraftTestState: 'passed',
    databaseVerification: null,
    kodoVerification: passedVerification,
    kodoVerificationProjectId: 'project-a',
    databaseSchemaReady: true,
  })

  assert.equal(ready.kodoReady, true)
  assert.equal(ready.remoteReady, true)
})

test('remote connection profile workspace status derives draft tested flags from edit state', () => {
  const status = getRemoteConnectionProfileWorkspaceStatus({
    databaseProfiles: [],
    selectedDatabaseProfileId: '',
    selectedKodoProfileId: 'kodo1',
    databaseProfileMode: 'create',
    kodoProfileMode: 'edit',
    databaseDraftTestState: 'untested',
    kodoDraftTestState: 'failed',
    databaseVerification: null,
    kodoVerification: null,
    kodoVerificationProjectId: '',
    databaseSchemaReady: false,
  })

  assert.deepEqual(status.databaseDraftStatus, {
    isExisting: false,
    draftTested: false,
    canSave: false,
  })
  assert.deepEqual(status.kodoDraftStatus, {
    isExisting: true,
    draftTested: true,
    canSave: true,
  })
  assert.equal(status.databaseDraftTested, false)
  assert.equal(status.kodoDraftTested, true)
})
