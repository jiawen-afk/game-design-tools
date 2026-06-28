import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  GameDesignToolsDesktopApi,
  ProjectConnectionProfileSummary,
} from '../../desktopApi'
import { refreshProjectConnectionProfiles } from './projectRemoteProfileRefreshActions'

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

function installDesktopApi(api: Partial<GameDesignToolsDesktopApi> | null) {
  const previous = globalThis.window
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: api ? { gameDesignToolsDesktop: api } : undefined,
  })
  return () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previous,
    })
  }
}

test('refreshing remote connection profiles lists both providers and updates state', async () => {
  let databaseProfiles: ProjectConnectionProfileSummary[] = []
  let kodoProfiles: ProjectConnectionProfileSummary[] = []
  const calls: Array<ProjectConnectionProfileSummary['type'] | undefined> = []
  const nextDatabaseProfiles = [databaseSummary('db2')]
  const nextKodoProfiles = [kodoSummary('kodo2')]
  const restore = installDesktopApi({
    listProjectConnectionProfiles: async (type) => {
      calls.push(type)
      return type === 'database' ? nextDatabaseProfiles : nextKodoProfiles
    },
  })

  try {
    const result = await refreshProjectConnectionProfiles({
      messageApi: { warning: () => {} },
      setDatabaseProfiles: (next) => { databaseProfiles = applyState(databaseProfiles, next) },
      setKodoProfiles: (next) => { kodoProfiles = applyState(kodoProfiles, next) },
    })

    assert.deepEqual(calls, ['database', 'qiniu_kodo'])
    assert.deepEqual(databaseProfiles, nextDatabaseProfiles)
    assert.deepEqual(kodoProfiles, nextKodoProfiles)
    assert.deepEqual(result, {
      databaseProfiles: nextDatabaseProfiles,
      kodoProfiles: nextKodoProfiles,
    })
  } finally {
    restore()
  }
})

test('refreshing remote connection profiles warns and leaves state unchanged without desktop runtime', async () => {
  const warnings: string[] = []
  const databaseProfiles = [databaseSummary('db1')]
  const kodoProfiles = [kodoSummary('kodo1')]
  const restore = installDesktopApi(null)

  try {
    const result = await refreshProjectConnectionProfiles({
      messageApi: { warning: (content) => warnings.push(content) },
      setDatabaseProfiles: () => { throw new Error('database profiles should not update') },
      setKodoProfiles: () => { throw new Error('kodo profiles should not update') },
    })

    assert.deepEqual(warnings, ['当前桌面运行时不可用，无法刷新远程连接配置。'])
    assert.deepEqual(databaseProfiles, [databaseSummary('db1')])
    assert.deepEqual(kodoProfiles, [kodoSummary('kodo1')])
    assert.deepEqual(result, { databaseProfiles: [], kodoProfiles: [] })
  } finally {
    restore()
  }
})
