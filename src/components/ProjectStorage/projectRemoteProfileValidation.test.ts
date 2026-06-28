import test from 'node:test'
import assert from 'node:assert/strict'

import {
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
