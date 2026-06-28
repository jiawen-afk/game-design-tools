import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultPersonalSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'
import { migratePersonalSpaceStateToProjectRows } from './projectLegacyMigration'
import { legacyMigrationOptions } from './projectLegacyMigrationTestHelpers.test'

test('legacy migration creates a default local project and project settings', () => {
  const migrated = migratePersonalSpaceStateToProjectRows(defaultPersonalSpaceState, legacyMigrationOptions)

  assert.equal(migrated.project.id, 'p1')
  assert.equal(migrated.project.mode, 'local')
  assert.equal(migrated.project.object_key_prefix, 'objects/默认项目')
  assert.equal(migrated.settings.database_provider, 'sqlite')
  assert.equal(migrated.settings.storage_provider, 'local')
  assert.equal(migrated.settings.local_object_root, 'D:\\GameAssets')
})
