import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { packageJsonSource } from './appStructureTestHelpers.test'

test('project management focused structure tests live in focused files', () => {
  const source = readFileSync('src/projectManagementStructure.test.ts', 'utf8')
  const packageSource = packageJsonSource()
  const remoteSettingsPath = 'src/projectManagementRemoteSettingsStructure.test.ts'
  const remoteProfilesPath = 'src/projectManagementRemoteProfilesStructure.test.ts'
  const migrationPath = 'src/projectManagementMigrationStructure.test.ts'
  const startupPath = 'src/projectManagementStartupStructure.test.ts'
  const remoteSyncPath = 'src/projectManagementRemoteSyncStructure.test.ts'
  const deviceBindingPath = 'src/projectManagementDeviceBindingStructure.test.ts'
  const remoteSettingsSource = existsSync(remoteSettingsPath) ? readFileSync(remoteSettingsPath, 'utf8') : ''
  const remoteProfilesSource = existsSync(remoteProfilesPath) ? readFileSync(remoteProfilesPath, 'utf8') : ''
  const migrationSource = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : ''
  const startupSource = existsSync(startupPath) ? readFileSync(startupPath, 'utf8') : ''
  const remoteSyncSource = existsSync(remoteSyncPath) ? readFileSync(remoteSyncPath, 'utf8') : ''
  const deviceBindingSource = existsSync(deviceBindingPath) ? readFileSync(deviceBindingPath, 'utf8') : ''

  for (const path of [remoteSettingsPath, remoteProfilesPath, migrationPath, startupPath, remoteSyncPath, deviceBindingPath]) {
    assert.ok(existsSync(path), `${path} should exist`)
  }
  assert.match(packageSource, /src\/projectManagementRemoteSettingsStructure\.test\.ts/)
  assert.match(packageSource, /src\/projectManagementRemoteProfilesStructure\.test\.ts/)
  assert.match(packageSource, /src\/projectManagementMigrationStructure\.test\.ts/)
  assert.match(packageSource, /src\/projectManagementStartupStructure\.test\.ts/)
  assert.match(packageSource, /src\/projectManagementRemoteSyncStructure\.test\.ts/)
  assert.match(packageSource, /src\/projectManagementDeviceBindingStructure\.test\.ts/)
  assert.doesNotMatch(source, new RegExp("test\\('" + 'project management exposes remote database'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'remote profile editing requires tested drafts'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'project workspace routes remote migration'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'project workspace startup resolves migrated projects'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'remote project workspace changes sync through project storage service'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'remote project profile ids stay local'))
  assert.match(remoteSettingsSource, new RegExp("test\\('" + 'project management exposes remote database'))
  assert.match(remoteProfilesSource, new RegExp("test\\('" + 'remote profile editing requires tested drafts'))
  assert.match(migrationSource, new RegExp("test\\('" + 'project workspace routes remote migration'))
  assert.match(startupSource, new RegExp("test\\('" + 'project workspace startup resolves migrated projects'))
  assert.match(remoteSyncSource, new RegExp("test\\('" + 'remote project workspace changes sync through project storage service'))
  assert.match(deviceBindingSource, new RegExp("test\\('" + 'remote project profile ids stay local'))
})
