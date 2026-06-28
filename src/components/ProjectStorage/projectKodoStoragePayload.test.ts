import test from 'node:test'
import assert from 'node:assert/strict'

import {
  kodoProfile,
  normalizeDownloadDomain,
  normalizeKodoPayload,
  validPayload,
} from './projectKodoStorageTestHelpers.test'

test('kodo profile payload is decoded and validated before remote verification', () => {
  assert.deepEqual(normalizeKodoPayload(kodoProfile(validPayload)), validPayload)

  assert.throws(
    () => normalizeKodoPayload(kodoProfile({ ...validPayload, secretKey: '' })),
    /缺少 Secret Key/,
  )
  assert.throws(
    () => normalizeKodoPayload(kodoProfile({ ...validPayload, bucket: '' })),
    /缺少 Bucket/,
  )
})

test('kodo download domain accepts bare host names from project configuration', () => {
  assert.equal(normalizeDownloadDomain('kodi.linjiawen.com'), 'https://kodi.linjiawen.com')
  assert.equal(normalizeDownloadDomain('https://cdn.example.com/'), 'https://cdn.example.com')
  assert.equal(normalizeDownloadDomain('http://cdn.example.com/'), 'http://cdn.example.com')
})
