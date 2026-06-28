import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import {
  createEditableDatabaseProfileDraft,
  createEditableKodoProfileDraft,
  type DatabaseProfileInput,
  type KodoProfileInput,
  mergeDatabaseProfilePayload,
  mergeKodoProfilePayload,
  redactDatabaseProfile,
  redactKodoProfile,
} from './projectRemoteProfiles'

const require = createRequire(import.meta.url)
const {
  editableProjectProfile,
  mergeProjectProfilePayload: mergeStoredProjectProfilePayload,
} = require('../../../electron/projectConnectionProfiles.cjs') as {
  editableProjectProfile: (profile: unknown) => { payload: unknown } | null
  mergeProjectProfilePayload: (input: unknown, existingProfile: unknown) => unknown
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

test('remote profiles expose redacted summaries without secrets', () => {
  const database = redactDatabaseProfile({
    provider: 'mysql',
    host: 'mysql.example.com',
    port: 3306,
    database: 'assets',
    username: 'root',
    password: 'super-secret',
    ssl: false,
  })
  const kodo = redactKodoProfile({
    accessKey: 'ak-secret',
    secretKey: 'sk-secret',
    bucket: 'asset-bucket',
    region: 'z2',
    domain: 'https://cdn.example.com',
  })

  assert.equal(database.provider, 'mysql')
  assert.equal(database.redactedSummary, 'root@mysql.example.com:3306/assets')
  assert.doesNotMatch(JSON.stringify(database), /super-secret/)
  assert.equal(kodo.provider, 'qiniu_kodo')
  assert.equal(kodo.redactedSummary, 'asset-bucket@z2 https://cdn.example.com')
  assert.doesNotMatch(JSON.stringify(kodo), /ak-secret|sk-secret/)
})

test('editable profile drafts never expose stored database password or kodo secret key', () => {
  const databaseDraft = createEditableDatabaseProfileDraft({
    provider: 'mysql',
    host: 'mysql.example.com',
    port: 3306,
    database: 'assets',
    username: 'root',
    password: 'stored-password',
    ssl: false,
  })
  const kodoDraft = createEditableKodoProfileDraft({
    accessKey: 'ak',
    secretKey: 'stored-secret',
    bucket: 'asset-bucket',
    region: 'z2',
    domain: 'https://cdn.example.com',
  })

  assert.equal(databaseDraft.password, '')
  assert.equal(kodoDraft.secretKey, '')
  assert.doesNotMatch(JSON.stringify(databaseDraft), /stored-password/)
  assert.doesNotMatch(JSON.stringify(kodoDraft), /stored-secret/)
})

test('profile payload merge preserves old secrets only when editing with blank secret fields', () => {
  const databasePayload = mergeDatabaseProfilePayload({
    provider: 'postgresql',
    host: 'new-db.example.com',
    port: 5432,
    database: 'new_assets',
    username: 'asset_user',
    password: '',
    ssl: true,
  }, {
    provider: 'postgresql',
    host: 'old-db.example.com',
    port: 5432,
    database: 'old_assets',
    username: 'asset_user',
    password: 'old-password',
    ssl: false,
  })
  const kodoPayload = mergeKodoProfilePayload({
    accessKey: 'new-ak',
    secretKey: '',
    bucket: 'new-bucket',
    region: 'z2',
    domain: 'https://new.example.com',
  }, {
    accessKey: 'old-ak',
    secretKey: 'old-secret',
    bucket: 'old-bucket',
    region: 'z0',
    domain: '',
  })

  assert.equal(databasePayload.password, 'old-password')
  assert.equal(databasePayload.host, 'new-db.example.com')
  assert.equal(kodoPayload.secretKey, 'old-secret')
  assert.equal(kodoPayload.accessKey, 'new-ak')
  assert.equal(mergeDatabaseProfilePayload({ ...databasePayload, password: 'new-password' }).password, 'new-password')
  assert.equal(mergeKodoProfilePayload({ ...kodoPayload, secretKey: 'new-secret' }).secretKey, 'new-secret')
})

test('electron profile helpers return editable drafts and preserve stored secrets on save', () => {
  const databaseProfile = storedProfile('db1', 'database', {
    provider: 'postgresql',
    host: 'db.example.com',
    port: 5432,
    database: 'assets',
    username: 'asset_user',
    password: 'stored-password',
    ssl: true,
  })
  const kodoProfile = storedProfile('kodo1', 'qiniu_kodo', {
    accessKey: 'ak',
    secretKey: 'stored-secret',
    bucket: 'bucket',
    region: 'z0',
    domain: '',
  })

  assert.equal((editableProjectProfile(databaseProfile)?.payload as DatabaseProfileInput).password, '')
  assert.equal((editableProjectProfile(kodoProfile)?.payload as KodoProfileInput).secretKey, '')
  assert.equal((mergeStoredProjectProfilePayload({
    type: 'database',
    payload: {
      provider: 'postgresql',
      host: 'new.example.com',
      port: 5432,
      database: 'assets',
      username: 'asset_user',
      password: '',
      ssl: true,
    },
  }, databaseProfile) as DatabaseProfileInput).password, 'stored-password')
  assert.equal((mergeStoredProjectProfilePayload({
    type: 'qiniu_kodo',
    payload: {
      accessKey: 'ak2',
      secretKey: '',
      bucket: 'bucket2',
      region: 'z1',
      domain: '',
    },
  }, kodoProfile) as KodoProfileInput).secretKey, 'stored-secret')
})
