import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  createEditableDatabaseProfileDraft,
  createEditableKodoProfileDraft,
  type DatabaseProfileInput,
  type KodoProfileInput,
  mergeDatabaseProfilePayload,
  mergeKodoProfilePayload,
  redactDatabaseProfile,
  redactKodoProfile,
  validateDatabaseProfileInput,
  validateKodoProfileInput,
} from './projectRemoteProfiles'
import { shouldKeepDatabaseSchemaInitialization } from './projectProfileMetadata'

const require = createRequire(import.meta.url)
const {
  editableProjectProfile,
  mergeProjectProfilePayload: mergeStoredProjectProfilePayload,
  projectProfileSummary,
} = require('../../../electron/projectConnectionProfiles.cjs') as {
  editableProjectProfile: (profile: unknown) => { payload: unknown } | null
  mergeProjectProfilePayload: (input: unknown, existingProfile: unknown) => unknown
  projectProfileSummary: (profile: unknown) => {
    id: string
    type: 'database' | 'qiniu_kodo'
    displayName: string
    redactedSummary: string
    lastVerifiedAt: string | null
    schemaInitializedAt?: string | null
  }
}
const {
  createProjectConnectionProfileStore,
} = require('../../../electron/projectConnectionProfileStore.cjs') as {
  createProjectConnectionProfileStore: (profilePath: string, options?: { now?: () => string; createProfileId?: () => string }) => {
    list: (type?: 'database' | 'qiniu_kodo') => Promise<unknown[]>
    get: (profileId: string) => Promise<unknown | null>
    save: (input: unknown) => Promise<ReturnType<typeof projectProfileSummary>>
    delete: (profileId: string) => Promise<boolean>
    markVerified: (profileId: string, verifiedAt: string) => Promise<void>
    markSchemaInitialized: (profileId: string, initializedAt: string) => Promise<void>
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

test('database profile validation requires postgresql or mysql connection fields', () => {
  assert.deepEqual(validateDatabaseProfileInput({
    provider: 'postgresql',
    host: 'db.example.com',
    port: 5432,
    database: 'game_assets',
    username: 'asset_user',
    password: 'secret',
    ssl: true,
  }), [])

  assert.deepEqual(validateDatabaseProfileInput({
    provider: 'sqlite' as 'postgresql',
    host: '',
    port: 0,
    database: '',
    username: '',
    password: '',
    ssl: false,
  }), [
    '数据库类型必须是 PostgreSQL 或 MySQL',
    '缺少数据库主机',
    '数据库端口无效',
    '缺少数据库名',
    '缺少数据库用户名',
    '缺少数据库密码',
  ])
})

test('qiniu kodo profile validation requires access keys and bucket fields', () => {
  assert.deepEqual(validateKodoProfileInput({
    accessKey: 'ak',
    secretKey: 'sk',
    bucket: 'bucket',
    region: 'z0',
    domain: 'https://cdn.example.com',
  }), [])

  assert.deepEqual(validateKodoProfileInput({
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: '',
    domain: '',
  }), [
    '缺少 Access Key',
    '缺少 Secret Key',
    '缺少 Bucket',
    '缺少 Region',
  ])
})

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

test('existing database profiles can keep password blank while new profiles require it', () => {
  const draft = {
    provider: 'postgresql' as const,
    host: 'db.example.com',
    port: 5432,
    database: 'game_assets',
    username: 'asset_user',
    password: '',
    ssl: true,
  }

  assert.deepEqual(validateDatabaseProfileInput(draft), ['缺少数据库密码'])
  assert.deepEqual(validateDatabaseProfileInput(draft, { existing: true }), [])
})

test('existing kodo profiles can keep secret key blank while new profiles require it', () => {
  const draft = {
    accessKey: 'ak',
    secretKey: '',
    bucket: 'asset-bucket',
    region: 'z0',
    domain: 'https://cdn.example.com',
  }

  assert.deepEqual(validateKodoProfileInput(draft), ['缺少 Secret Key'])
  assert.deepEqual(validateKodoProfileInput(draft, { existing: true }), [])
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
