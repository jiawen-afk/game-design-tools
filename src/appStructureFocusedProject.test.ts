import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  assertFocusedStructureFiles,
  readSourceIfExists,
  testNamePattern,
} from './appStructureTestHelpers.test'

test('project storage structure tests live in a focused file', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const projectStorageStructurePath = 'src/projectStorageStructure.test.ts'
  const projectStorageDesktopStructurePath = 'src/projectStorageDesktopStructure.test.ts'
  const projectStorageSchemaStructurePath = 'src/projectStorageSchemaStructure.test.ts'
  const projectStorageRepositoryStructurePath = 'src/projectStorageRepositoryStructure.test.ts'
  const projectStorageObjectStructurePath = 'src/projectStorageObjectStructure.test.ts'

  assertFocusedStructureFiles([
    projectStorageStructurePath,
    projectStorageDesktopStructurePath,
    projectStorageSchemaStructurePath,
    projectStorageRepositoryStructurePath,
    projectStorageObjectStructurePath,
  ])
  assert.doesNotMatch(source, testNamePattern('remote project repository uses electron database bridge'))
  assert.doesNotMatch(source, testNamePattern('project storage table metadata is grouped by storage domain'))
  assert.doesNotMatch(source, testNamePattern('project asset cache storage is exposed through electron'))
  assert.match(readSourceIfExists(projectStorageStructurePath), testNamePattern('project storage focused structure tests live in focused files'))
  assert.match(readSourceIfExists(projectStorageDesktopStructurePath), testNamePattern('desktop boundary exposes remote project profile'))
  assert.match(readSourceIfExists(projectStorageSchemaStructurePath), testNamePattern('project storage table metadata is grouped by storage domain'))
  assert.match(readSourceIfExists(projectStorageRepositoryStructurePath), testNamePattern('project storage repository structure tests stay split'))
  assert.match(readSourceIfExists(projectStorageObjectStructurePath), testNamePattern('project asset cache storage is exposed through electron'))
})

test('project management structure tests live in a focused file', () => {
  const source = readFileSync('src/appStructure.test.ts', 'utf8')
  const projectManagementStructurePath = 'src/projectManagementStructure.test.ts'
  const projectManagementRemoteSettingsStructurePath = 'src/projectManagementRemoteSettingsStructure.test.ts'
  const projectManagementRemoteProfilesStructurePath = 'src/projectManagementRemoteProfilesStructure.test.ts'
  const projectManagementMigrationStructurePath = 'src/projectManagementMigrationStructure.test.ts'
  const projectManagementStartupStructurePath = 'src/projectManagementStartupStructure.test.ts'
  const projectManagementRemoteSyncStructurePath = 'src/projectManagementRemoteSyncStructure.test.ts'
  const projectManagementDeviceBindingStructurePath = 'src/projectManagementDeviceBindingStructure.test.ts'

  assertFocusedStructureFiles([
    projectManagementStructurePath,
    projectManagementRemoteSettingsStructurePath,
    projectManagementRemoteProfilesStructurePath,
    projectManagementMigrationStructurePath,
    projectManagementStartupStructurePath,
    projectManagementRemoteSyncStructurePath,
    projectManagementDeviceBindingStructurePath,
  ])
  assert.doesNotMatch(source, testNamePattern('project management exposes remote database'))
  assert.doesNotMatch(source, testNamePattern('remote project profile ids stay local'))
  assert.doesNotMatch(source, testNamePattern('project workspace keeps manual sync retry'))
  assert.match(readSourceIfExists(projectManagementStructurePath), testNamePattern('project management focused structure tests live in focused files'))
  assert.match(readSourceIfExists(projectManagementRemoteSettingsStructurePath), testNamePattern('project management exposes remote database'))
  assert.match(readSourceIfExists(projectManagementDeviceBindingStructurePath), testNamePattern('remote project profile ids stay local'))
  assert.match(readSourceIfExists(projectManagementRemoteSyncStructurePath), testNamePattern('project workspace keeps manual sync retry'))
})
