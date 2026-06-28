import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { packageJsonSource } from './appStructureTestHelpers.test'

test('project storage focused structure tests live in focused files', () => {
  const source = readFileSync('src/projectStorageStructure.test.ts', 'utf8')
  const packageSource = packageJsonSource()
  const desktopStructurePath = 'src/projectStorageDesktopStructure.test.ts'
  const schemaStructurePath = 'src/projectStorageSchemaStructure.test.ts'
  const repositoryStructurePath = 'src/projectStorageRepositoryStructure.test.ts'
  const objectStructurePath = 'src/projectStorageObjectStructure.test.ts'
  const desktopStructureSource = existsSync(desktopStructurePath) ? readFileSync(desktopStructurePath, 'utf8') : ''
  const schemaStructureSource = existsSync(schemaStructurePath) ? readFileSync(schemaStructurePath, 'utf8') : ''
  const repositoryStructureSource = existsSync(repositoryStructurePath) ? readFileSync(repositoryStructurePath, 'utf8') : ''
  const objectStructureSource = existsSync(objectStructurePath) ? readFileSync(objectStructurePath, 'utf8') : ''

  for (const path of [desktopStructurePath, schemaStructurePath, repositoryStructurePath, objectStructurePath]) {
    assert.ok(existsSync(path), `${path} should exist`)
    assert.match(packageSource, new RegExp(path.replace(/\//g, '\\/').replace(/\./g, '\\.')))
  }
  assert.doesNotMatch(source, new RegExp("test\\('" + 'desktop boundary exposes remote project profile'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'project storage table metadata is grouped by storage domain'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'remote project repository uses electron database bridge'))
  assert.doesNotMatch(source, new RegExp("test\\('" + 'project asset cache storage is exposed through electron'))
  assert.match(desktopStructureSource, new RegExp("test\\('" + 'desktop boundary exposes remote project profile'))
  assert.match(schemaStructureSource, new RegExp("test\\('" + 'project storage table metadata is grouped by storage domain'))
  assert.match(repositoryStructureSource, new RegExp("test\\('" + 'project storage repository structure tests stay split'))
  assert.match(objectStructureSource, new RegExp("test\\('" + 'project asset cache storage is exposed through electron'))
})
