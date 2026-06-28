import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import { shouldKeepDatabaseSchemaInitialization } from './projectProfileMetadata'

const require = createRequire(import.meta.url)
const {
  projectProfileSummary,
} = require('../../../electron/projectConnectionProfiles.cjs') as {
  projectProfileSummary: (profile: unknown) => {
    id: string
    type: 'database' | 'qiniu_kodo'
    displayName: string
    redactedSummary: string
    lastVerifiedAt: string | null
    schemaInitializedAt?: string | null
  }
}

function storedProfile(id: string, type: 'database' | 'qiniu_kodo', payload: unknown) {
  return {
    id,
    type,
    displayName: 'profile',
    redactedSummary: 'summary',
    lastVerifiedAt: null,
    encryptedPayload: {
      payload: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
    },
  }
}

test('profile summaries expose persisted database schema initialization time', () => {
  const profile = {
    ...storedProfile('db1', 'database', {
      provider: 'postgresql',
      host: 'db.example.com',
      port: 5432,
      database: 'assets',
      username: 'asset_user',
      password: 'secret',
      ssl: true,
    }),
    lastVerifiedAt: '2026-06-24T01:00:00.000Z',
    schemaInitializedAt: '2026-06-24T02:00:00.000Z',
  }

  assert.deepEqual(projectProfileSummary(profile), {
    id: 'db1',
    type: 'database',
    displayName: 'profile',
    redactedSummary: 'summary',
    lastVerifiedAt: '2026-06-24T01:00:00.000Z',
    schemaInitializedAt: '2026-06-24T02:00:00.000Z',
  })
})

test('database schema initialization metadata is kept only when connection target is unchanged', () => {
  const previous = {
    provider: 'postgresql' as const,
    host: 'db.example.com',
    port: 5432,
    database: 'assets',
    username: 'asset_user',
    password: 'old-secret',
    ssl: true,
  }

  assert.equal(shouldKeepDatabaseSchemaInitialization(previous, { ...previous, password: '' }), true)
  assert.equal(shouldKeepDatabaseSchemaInitialization(previous, { ...previous, database: 'other_assets' }), false)
  assert.equal(shouldKeepDatabaseSchemaInitialization(previous, { ...previous, host: 'db2.example.com' }), false)
})
