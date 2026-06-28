import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createLocalProjectRepository, createSqlJsDatabase } from './projectLocalSqliteRepositoryTestHelpers.test'

test('local sqlite schema initialization adds cover columns to an existing assets table', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'gdt-project-sqlite-'))
  try {
    const databasePath = path.join(tempDir, 'projects.sqlite')
    const SQL = await createSqlJsDatabase()
    const database = new SQL.Database()
    database.run(`
      CREATE TABLE assets (
        id text primary key,
        project_id text not null,
        kind text not null,
        asset_subtype text not null,
        group_id text null,
        name text not null,
        dialogue_text text null,
        source_key text null,
        primary_resource_id text not null,
        primary_object_key text not null,
        primary_file_name text not null,
        primary_mime_group text not null,
        primary_mime_type text not null,
        primary_extension text not null,
        primary_size_bytes integer not null default 0,
        primary_hash_sha256 text null,
        sprite_index_resource_id text null,
        sprite_index_object_key text null,
        sprite_index_file_name text null,
        sprite_index_mime_type text null,
        sprite_index_size_bytes integer null,
        sprite_index_hash_sha256 text null,
        sprite_frame_width integer null,
        sprite_frame_height integer null,
        sprite_sheet_width integer null,
        sprite_sheet_height integer null,
        sprite_fps integer null,
        sprite_frame_count integer null,
        created_at text not null,
        updated_at text not null,
        metadata_json text null
      )
    `)
    await writeFile(databasePath, Buffer.from(database.export()))

    const repository = createLocalProjectRepository(databasePath)
    await repository.initializeSchema()

    const reopened = new SQL.Database(await readFile(databasePath))
    const columns = reopened.exec('PRAGMA table_info(assets)')[0]!.values.map((row: unknown[]) => row[1])
    assert.ok(columns.includes('cover_resource_id'))
    assert.ok(columns.includes('cover_object_key'))
    assert.ok(columns.includes('cover_hash_sha256'))
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
