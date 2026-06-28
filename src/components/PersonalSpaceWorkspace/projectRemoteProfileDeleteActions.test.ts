import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  GameDesignToolsDesktopApi,
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from '../../desktopApi'
import { createProjectRemoteProfileDeleteActions } from './projectRemoteProfileDeleteActions'
import {
  createInitialDatabaseProfileDraft,
  createInitialKodoProfileDraft,
} from './projectRemoteProfileDraftModel'
import type {
  DatabaseProfileDraft,
  DraftTestState,
  KodoProfileDraft,
  ProfileEditMode,
} from './projectRemoteProfileDraftModel'
import type { ProjectRemoteProfileLists } from './projectRemoteProfileRefreshActions'

type StateUpdater<T> = T | ((current: T) => T)

function applyState<T>(current: T, next: StateUpdater<T>) {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next
}

function databaseSummary(id: string): ProjectConnectionProfileSummary {
  return {
    id,
    type: 'database',
    displayName: `Database ${id}`,
    redactedSummary: 'asset_user@db.example.com:5432/assets',
    lastVerifiedAt: null,
    schemaInitializedAt: null,
  }
}

function kodoSummary(id: string): ProjectConnectionProfileSummary {
  return {
    id,
    type: 'qiniu_kodo',
    displayName: `Kodo ${id}`,
    redactedSummary: 'assets@z2',
    lastVerifiedAt: null,
    schemaInitializedAt: null,
  }
}

const databaseProfileDraft: DatabaseProfileDraft = {
  provider: 'postgresql',
  host: 'db.example.com',
  port: 5432,
  database: 'assets',
  username: 'asset_user',
  password: '',
  ssl: true,
}

const kodoProfileDraft: KodoProfileDraft = {
  accessKey: 'ak',
  secretKey: '',
  bucket: 'assets',
  region: 'z2',
  domain: 'https://cdn.example.com',
}

function installDesktopApi(api: Partial<GameDesignToolsDesktopApi>) {
  const previous = globalThis.window
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { gameDesignToolsDesktop: api },
  })
  return () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previous,
    })
  }
}

function createDeleteState() {
  return {
    selectedDatabaseProfileId: 'db1',
    selectedKodoProfileId: 'kodo1',
    databaseProfileMode: 'edit' as ProfileEditMode,
    kodoProfileMode: 'edit' as ProfileEditMode,
    databaseVerification: { ok: true, message: 'ok', lastVerifiedAt: '2026-06-28T00:00:00.000Z' } as ProjectConnectionVerificationResult | null,
    kodoVerification: { ok: true, message: 'ok', lastVerifiedAt: '2026-06-28T00:00:00.000Z' } as ProjectConnectionVerificationResult | null,
    kodoVerificationProjectId: 'project-a',
    databaseSchemaReady: true,
    databaseDraftTestState: 'passed' as DraftTestState,
    kodoDraftTestState: 'passed' as DraftTestState,
    databaseProfileDraft,
    kodoProfileDraft,
  }
}

function createDeleteActions(options: {
  state: ReturnType<typeof createDeleteState>
  refreshProfiles: () => Promise<ProjectRemoteProfileLists>
}) {
  const messages: Array<{ type: 'success' | 'warning'; content: string }> = []
  const previousDatabaseProfileDraftRef = { current: databaseProfileDraft as DatabaseProfileDraft | null }
  return {
    actions: createProjectRemoteProfileDeleteActions({
      messageApi: {
        success: (content) => messages.push({ type: 'success', content }),
        warning: (content) => messages.push({ type: 'warning', content }),
      },
      selectedDatabaseProfileId: options.state.selectedDatabaseProfileId,
      selectedKodoProfileId: options.state.selectedKodoProfileId,
      previousDatabaseProfileDraftRef,
      refreshProfiles: options.refreshProfiles,
      setSelectedDatabaseProfileId: (next) => { options.state.selectedDatabaseProfileId = applyState(options.state.selectedDatabaseProfileId, next) },
      setSelectedKodoProfileId: (next) => { options.state.selectedKodoProfileId = applyState(options.state.selectedKodoProfileId, next) },
      setDatabaseProfileMode: (next) => { options.state.databaseProfileMode = applyState(options.state.databaseProfileMode, next) },
      setKodoProfileMode: (next) => { options.state.kodoProfileMode = applyState(options.state.kodoProfileMode, next) },
      setDatabaseVerification: (next) => { options.state.databaseVerification = applyState(options.state.databaseVerification, next) },
      setKodoVerification: (next) => { options.state.kodoVerification = applyState(options.state.kodoVerification, next) },
      setKodoVerificationProjectId: (next) => { options.state.kodoVerificationProjectId = applyState(options.state.kodoVerificationProjectId, next) },
      setDatabaseSchemaReady: (next) => { options.state.databaseSchemaReady = applyState(options.state.databaseSchemaReady, next) },
      setDatabaseDraftTestState: (next) => { options.state.databaseDraftTestState = applyState(options.state.databaseDraftTestState, next) },
      setKodoDraftTestState: (next) => { options.state.kodoDraftTestState = applyState(options.state.kodoDraftTestState, next) },
      setDatabaseProfileDraft: (next) => { options.state.databaseProfileDraft = applyState(options.state.databaseProfileDraft, next) },
      setKodoProfileDraft: (next) => { options.state.kodoProfileDraft = applyState(options.state.kodoProfileDraft, next) },
    }),
    messages,
    previousDatabaseProfileDraftRef,
  }
}

test('deleting a database profile selects the next refreshed profile and resets database checks', async () => {
  const state = createDeleteState()
  const deletedProfileIds: string[] = []
  const restore = installDesktopApi({
    deleteProjectConnectionProfile: async (profileId) => {
      deletedProfileIds.push(profileId)
      return true
    },
  })

  try {
    const { actions, messages, previousDatabaseProfileDraftRef } = createDeleteActions({
      state,
      refreshProfiles: async () => ({
        databaseProfiles: [databaseSummary('db2')],
        kodoProfiles: [kodoSummary('kodo1')],
      }),
    })

    await actions.deleteDatabaseProfile()

    assert.deepEqual(deletedProfileIds, ['db1'])
    assert.equal(state.selectedDatabaseProfileId, 'db2')
    assert.equal(state.databaseProfileMode, 'edit')
    assert.equal(state.databaseVerification, null)
    assert.equal(state.databaseSchemaReady, false)
    assert.equal(state.databaseDraftTestState, 'untested')
    assert.equal(previousDatabaseProfileDraftRef.current, databaseProfileDraft)
    assert.deepEqual(messages, [{ type: 'success', content: '已删除远程数据库配置' }])
  } finally {
    restore()
  }
})

test('deleting the last kodo profile returns the kodo draft to create mode', async () => {
  const state = createDeleteState()
  const restore = installDesktopApi({
    deleteProjectConnectionProfile: async () => true,
  })

  try {
    const { actions, messages } = createDeleteActions({
      state,
      refreshProfiles: async () => ({
        databaseProfiles: [databaseSummary('db1')],
        kodoProfiles: [],
      }),
    })

    await actions.deleteKodoProfile()

    assert.equal(state.selectedKodoProfileId, '')
    assert.equal(state.kodoProfileMode, 'create')
    assert.equal(state.kodoVerification, null)
    assert.equal(state.kodoVerificationProjectId, '')
    assert.equal(state.kodoDraftTestState, 'untested')
    assert.deepEqual(state.kodoProfileDraft, createInitialKodoProfileDraft())
    assert.deepEqual(messages, [{ type: 'success', content: '已删除七牛 Kodo 配置' }])
  } finally {
    restore()
  }
})

test('deleting the last database profile clears the previous draft snapshot', async () => {
  const state = createDeleteState()
  const restore = installDesktopApi({
    deleteProjectConnectionProfile: async () => true,
  })

  try {
    const { actions, previousDatabaseProfileDraftRef } = createDeleteActions({
      state,
      refreshProfiles: async () => ({
        databaseProfiles: [],
        kodoProfiles: [kodoSummary('kodo1')],
      }),
    })

    await actions.deleteDatabaseProfile()

    assert.equal(state.selectedDatabaseProfileId, '')
    assert.equal(state.databaseProfileMode, 'create')
    assert.deepEqual(state.databaseProfileDraft, createInitialDatabaseProfileDraft())
    assert.equal(previousDatabaseProfileDraftRef.current, null)
  } finally {
    restore()
  }
})
