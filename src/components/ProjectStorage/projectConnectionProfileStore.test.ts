import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { DatabaseProfileInput } from './projectRemoteProfiles'

const require = createRequire(import.meta.url)
const {
  editableProjectProfile,
  mergeProjectProfilePayload: mergeStoredProjectProfilePayload,
} = require('../../../electron/projectConnectionProfiles.cjs') as {
  editableProjectProfile: (profile: unknown) => { payload: unknown } | null
  mergeProjectProfilePayload: (input: unknown, existingProfile: unknown) => unknown
}
const {
  createProjectConnectionProfileStore,
} = require('../../../electron/projectConnectionProfileStore.cjs') as {
  createProjectConnectionProfileStore: (profilePath: string, options?: { now?: () => string; createProfileId?: () => string }) => {
    list: (type?: 'database' | 'qiniu_kodo') => Promise<unknown[]>
    get: (profileId: string) => Promise<unknown | null>
    save: (input: unknown) => Promise<{
      id: string
      type: 'database' | 'qiniu_kodo'
      displayName: string
      redactedSummary: string
      lastVerifiedAt: string | null
      schemaInitializedAt?: string | null
    }>
    delete: (profileId: string) => Promise<boolean>
    markVerified: (profileId: string, verifiedAt: string) => Promise<void>
    markSchemaInitialized: (profileId: string, initializedAt: string) => Promise<void>
  }
}

test('electron profile store persists verification and schema metadata', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-profile-store-'))
  try {
    const store = createProjectConnectionProfileStore(path.join(tempDir, 'profiles.json'), {
      now: () => '2026-06-24T00:00:00.000Z',
      createProfileId: () => 'db-generated',
    })

    const saved = await store.save({
      type: 'database',
      displayName: 'PG assets',
      payload: {
        provider: 'postgresql',
        host: 'db.example.com',
        port: 5432,
        database: 'assets',
        username: 'asset_user',
        password: 'stored-password',
        ssl: true,
      },
      lastVerifiedAt: '2026-06-24T01:00:00.000Z',
      schemaInitializedAt: '2026-06-24T02:00:00.000Z',
    })

    assert.deepEqual(saved, {
      id: 'db-generated',
      type: 'database',
      displayName: 'PG assets',
      redactedSummary: 'asset_user@db.example.com:5432/assets (SSL)',
      lastVerifiedAt: '2026-06-24T01:00:00.000Z',
      schemaInitializedAt: '2026-06-24T02:00:00.000Z',
    })

    await store.save({
      id: saved.id,
      type: 'database',
      displayName: 'PG assets renamed',
      payload: {
        provider: 'postgresql',
        host: 'db2.example.com',
        port: 5432,
        database: 'assets',
        username: 'asset_user',
        password: '',
        ssl: false,
      },
    })
    await store.markVerified(saved.id, '2026-06-24T03:00:00.000Z')
    await store.markSchemaInitialized(saved.id, '2026-06-24T04:00:00.000Z')

    const editable = editableProjectProfile(await store.get(saved.id))
    assert.equal((editable?.payload as DatabaseProfileInput).password, '')
    const storedPayload = mergeStoredProjectProfilePayload({
      type: 'database',
      payload: {
        provider: 'postgresql',
        host: 'db2.example.com',
        port: 5432,
        database: 'assets',
        username: 'asset_user',
        password: '',
        ssl: false,
      },
    }, await store.get(saved.id)) as DatabaseProfileInput
    assert.equal(storedPayload.password, 'stored-password')
    assert.deepEqual(await store.list('database'), [{
      id: 'db-generated',
      type: 'database',
      displayName: 'PG assets renamed',
      redactedSummary: 'asset_user@db2.example.com:5432/assets',
      lastVerifiedAt: '2026-06-24T03:00:00.000Z',
      schemaInitializedAt: '2026-06-24T04:00:00.000Z',
    }])
    assert.equal(await store.delete(saved.id), true)
    assert.deepEqual(await store.list('database'), [])
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
