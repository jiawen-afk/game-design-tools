import test from 'node:test'
import assert from 'node:assert/strict'

import {
  redactDatabaseProfile,
  redactKodoProfile,
  validateDatabaseProfileInput,
  validateKodoProfileInput,
} from './projectRemoteProfiles'

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
