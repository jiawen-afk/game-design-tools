import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectConnectionProfileSummary } from '../../desktopApi'
import type {
  DatabaseProfileDraft,
  DraftTestState,
  KodoProfileDraft,
  ProfileEditMode,
} from './projectRemoteProfileDraftModel'
import {
  createDatabaseProfileSaveInput,
  createInitialDatabaseProfileDraft,
  createInitialKodoProfileDraft,
  createKodoProfileSaveInput,
  getRemoteProfileDraftStatus,
} from './projectRemoteProfileDraftModel'

const databaseDraft: DatabaseProfileDraft = {
  provider: 'postgresql',
  host: 'db.example.com',
  port: 5432,
  database: 'assets',
  username: 'asset_user',
  password: '',
  ssl: true,
}

const kodoDraft: KodoProfileDraft = {
  accessKey: 'ak',
  secretKey: '',
  bucket: 'asset-bucket',
  region: 'z2',
  domain: 'https://cdn.example.com',
}

function databaseSummary(input: Partial<ProjectConnectionProfileSummary> = {}): ProjectConnectionProfileSummary {
  return {
    id: 'db1',
    type: 'database',
    displayName: 'PG assets',
    redactedSummary: 'asset_user@db.example.com:5432/assets',
    lastVerifiedAt: '2026-06-24T01:00:00.000Z',
    schemaInitializedAt: '2026-06-24T02:00:00.000Z',
    ...input,
  }
}

test('remote profile draft model owns fresh initial database and kodo drafts', () => {
  const databaseInitial = createInitialDatabaseProfileDraft()
  const anotherDatabaseInitial = createInitialDatabaseProfileDraft()
  const kodoInitial = createInitialKodoProfileDraft()
  const anotherKodoInitial = createInitialKodoProfileDraft()

  assert.deepEqual(databaseInitial, {
    provider: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: true,
  })
  assert.deepEqual(kodoInitial, {
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: '',
    domain: '',
  })
  assert.notEqual(databaseInitial, anotherDatabaseInitial)
  assert.notEqual(kodoInitial, anotherKodoInitial)
})

test('remote profile draft status requires tests before saving and detects existing profiles', () => {
  const untested = getRemoteProfileDraftStatus({
    mode: 'edit' as ProfileEditMode,
    selectedProfileId: 'db1',
    draftTestState: 'untested' as DraftTestState,
  })
  const failed = getRemoteProfileDraftStatus({
    mode: 'create',
    selectedProfileId: '',
    draftTestState: 'failed',
  })

  assert.deepEqual(untested, {
    isExisting: true,
    draftTested: false,
    canSave: false,
  })
  assert.deepEqual(failed, {
    isExisting: false,
    draftTested: true,
    canSave: true,
  })
})

test('database profile save input keeps schema metadata only when connection target is unchanged', () => {
  const selectedProfile = databaseSummary()

  assert.deepEqual(createDatabaseProfileSaveInput({
    mode: 'edit',
    selectedProfileId: 'db1',
    selectedProfile,
    draft: databaseDraft,
    previousDraft: { ...databaseDraft, password: 'old-secret' },
    verification: { ok: true, message: 'ok', lastVerifiedAt: '2026-06-24T03:00:00.000Z' },
  }), {
    id: 'db1',
    type: 'database',
    displayName: 'postgresql assets',
    payload: databaseDraft,
    lastVerifiedAt: '2026-06-24T03:00:00.000Z',
    schemaInitializedAt: '2026-06-24T02:00:00.000Z',
  })

  assert.equal(createDatabaseProfileSaveInput({
    mode: 'edit',
    selectedProfileId: 'db1',
    selectedProfile,
    draft: { ...databaseDraft, database: 'other_assets' },
    previousDraft: databaseDraft,
    verification: { ok: false, message: 'failed', lastVerifiedAt: null },
  }).schemaInitializedAt, null)
})

test('kodo profile save input preserves edit id and verified timestamp', () => {
  assert.deepEqual(createKodoProfileSaveInput({
    mode: 'edit',
    selectedProfileId: 'kodo1',
    draft: kodoDraft,
    verification: { ok: true, message: 'ok', lastVerifiedAt: '2026-06-24T04:00:00.000Z' },
  }), {
    id: 'kodo1',
    type: 'qiniu_kodo',
    displayName: 'Kodo asset-bucket',
    payload: kodoDraft,
    lastVerifiedAt: '2026-06-24T04:00:00.000Z',
  })
})
