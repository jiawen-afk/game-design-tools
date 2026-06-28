import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('remote profile tests stay split by profile responsibility', () => {
  const source = readFileSync('src/components/ProjectStorage/projectRemoteProfiles.test.ts', 'utf8')
  const packageSource = readFileSync('package.json', 'utf8')
  const focusedSuites = [
    'src/components/ProjectStorage/projectRemoteProfileValidation.test.ts',
    'src/components/ProjectStorage/projectRemoteProfileSecrets.test.ts',
    'src/components/ProjectStorage/projectRemoteProfileMetadata.test.ts',
    'src/components/ProjectStorage/projectConnectionProfileStore.test.ts',
  ]

  for (const path of focusedSuites) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/')))
  }

  assert.ok(source.split(/\r?\n/).length <= 100, 'projectRemoteProfiles.test.ts should only keep split guards')
  for (const delegatedToken of [
    'validateDatabase' + 'ProfileInput',
    'redactDatabase' + 'Profile',
    'shouldKeepDatabase' + 'SchemaInitialization',
    'createProjectConnection' + 'ProfileStore',
  ]) {
    assert.doesNotMatch(source, new RegExp(delegatedToken))
  }
})
