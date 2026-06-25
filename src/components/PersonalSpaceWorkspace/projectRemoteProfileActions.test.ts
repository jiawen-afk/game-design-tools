import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  GameDesignToolsDesktopApi,
  ProjectConnectionProfileSummary,
  ProjectConnectionVerificationResult,
} from '../../desktopApi'
import { createProjectRemoteProfileActions } from './projectRemoteProfileActions'
import type {
  DatabaseProfileDraft,
  DraftTestState,
  KodoProfileDraft,
  ProfileEditMode,
} from './projectRemoteProfileDraftModel'

type StateUpdater<T> = T | ((current: T) => T)

function applyState<T>(current: T, next: StateUpdater<T>) {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next
}

function databaseSummary(id: string): ProjectConnectionProfileSummary {
  return {
    id,
    type: 'database',
    displayName: 'PG assets',
    redactedSummary: 'asset_user@db.example.com:5432/assets',
    lastVerifiedAt: null,
    schemaInitializedAt: null,
  }
}

function kodoSummary(id: string): ProjectConnectionProfileSummary {
  return {
    id,
    type: 'qiniu_kodo',
    displayName: 'Kodo assets',
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

function createActionsState() {
  return {
    databaseProfiles: [databaseSummary('db1')],
    kodoProfiles: [kodoSummary('kodo1')],
    selectedDatabaseProfileId: 'db1',
    selectedKodoProfileId: 'kodo1',
    databaseProfileMode: 'edit' as ProfileEditMode,
    kodoProfileMode: 'edit' as ProfileEditMode,
    databaseVerification: null as ProjectConnectionVerificationResult | null,
    kodoVerification: null as ProjectConnectionVerificationResult | null,
    kodoVerificationProjectId: 'project-a',
    databaseSchemaReady: true,
    databaseDraftTestState: 'passed' as DraftTestState,
    kodoDraftTestState: 'passed' as DraftTestState,
  }
}

function createActions(options: {
  state: ReturnType<typeof createActionsState>
}) {
  const messages: Array<{ type: 'success' | 'warning'; content: string }> = []
  return {
    actions: createProjectRemoteProfileActions({
      messageApi: {
        success: (content) => messages.push({ type: 'success', content }),
        warning: (content) => messages.push({ type: 'warning', content }),
      },
      selectedDatabaseProfileId: options.state.selectedDatabaseProfileId,
      selectedKodoProfileId: options.state.selectedKodoProfileId,
      selectedDatabaseProfile: options.state.databaseProfiles[0],
      databaseProfileMode: options.state.databaseProfileMode,
      kodoProfileMode: options.state.kodoProfileMode,
      databaseProfileDraft,
      kodoProfileDraft,
      databaseVerification: options.state.databaseVerification,
      kodoVerification: options.state.kodoVerification,
      databaseDraftStatus: { isExisting: true, draftTested: true },
      kodoDraftStatus: { isExisting: true, draftTested: true },
      previousDatabaseProfileDraftRef: { current: databaseProfileDraft },
      skipNextDatabaseProfileLoadRef: { current: false },
      skipNextKodoProfileLoadRef: { current: false },
      setDatabaseProfiles: (next) => { options.state.databaseProfiles = applyState(options.state.databaseProfiles, next) },
      setKodoProfiles: (next) => { options.state.kodoProfiles = applyState(options.state.kodoProfiles, next) },
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
    }),
    messages,
  }
}

test('deleting the last database profile returns the draft to create mode', async () => {
  const state = createActionsState()
  const restore = installDesktopApi({
    deleteProjectConnectionProfile: async () => true,
    listProjectConnectionProfiles: async () => [],
  })
  try {
    const { actions } = createActions({ state })

    await actions.deleteDatabaseProfile()

    assert.equal(state.selectedDatabaseProfileId, '')
    assert.equal(state.databaseProfileMode, 'create')
    assert.equal(state.databaseSchemaReady, false)
    assert.equal(state.databaseVerification, null)
  } finally {
    restore()
  }
})

test('deleting the last kodo profile returns the draft to create mode', async () => {
  const state = createActionsState()
  const restore = installDesktopApi({
    deleteProjectConnectionProfile: async () => true,
    listProjectConnectionProfiles: async () => [],
  })
  try {
    const { actions } = createActions({ state })

    await actions.deleteKodoProfile()

    assert.equal(state.selectedKodoProfileId, '')
    assert.equal(state.kodoProfileMode, 'create')
    assert.equal(state.kodoVerification, null)
    assert.equal(state.kodoVerificationProjectId, '')
  } finally {
    restore()
  }
})
