import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('kodo storage tests stay split by object storage responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectKodoStorage.test.ts', 'utf8')
  const focusedFiles = [
    ['src/components/ProjectStorage/projectKodoStoragePayload.test.ts', 'kodo profile payload is decoded and validated before remote verification'],
    ['src/components/ProjectStorage/projectKodoStorageDownload.test.ts', 'kodo object download supports http access domains'],
    ['src/components/ProjectStorage/projectKodoStorageVerificationSuccess.test.ts', 'kodo verification uploads stats and deletes a probe object under project prefix'],
    ['src/components/ProjectStorage/projectKodoStorageVerificationFailure.test.ts', 'kodo verification deletes probe object when stat fails'],
    ['src/components/ProjectStorage/projectKodoStorageObjectRead.test.ts', 'kodo object reads return object bytes and mime type'],
  ] as const

  for (const [path, testName] of focusedFiles) {
    const focusedSource = existsSync(path) ? readFileSync(path, 'utf8') : ''

    assert.ok(existsSync(path), `${path} should exist`)
    assert.doesNotMatch(source, new RegExp("test\\('" + testName))
    assert.match(focusedSource, new RegExp("test\\('" + testName))
  }
})
