# Project Storage Architecture Design

Date: 2026-06-23
Status: Draft for user review

## Goal

Introduce project-based asset management with a unified data structure across local and remote storage modes.

The first implementation version supports:

- Local projects backed by SQLite and a local object directory.
- Remote projects backed by PostgreSQL or MySQL plus Qiniu Kodo.
- Creating, editing, and deleting projects.
- Verifying remote database and Qiniu Kodo configuration.
- Initializing remote database tables.
- Migrating a local project to remote mode.
- Migrating the existing global personal-space data into a default local project.

The first implementation version does not support:

- Periodic sync.
- Remote-to-local migration.
- Members, users, permissions, or collaboration roles.
- Tags.
- Asset-link notes.
- Soft deletion for projects, groups, assets, characters, or storyboards.

## Current Context

The current app has a global personal space stored in `localStorage` under `game-design-tools.personal-space.v1`. Resource files are written to a user-authorized local directory. Voice records are stored separately under `game-design-tools.voxcpm.records.v1`.

The current personal-space shape has these major concepts:

- Characters.
- Storyboard groups.
- Assets.
- Asset groups.
- Starred characters, storyboards, and asset groups.
- Resource paths and storage resource paths.
- Character asset links.
- Storyboard voice entries.
- Effect-to-voice asset relations.

The new project storage architecture must replace the global personal-space singleton with an active project context while preserving existing workflows.

## Decisions

- Use SQLite for local project metadata.
- Use local object files for local project binary resources.
- Use PostgreSQL or MySQL for remote project metadata.
- Use Qiniu Kodo for remote binary resources in the first remote storage version.
- Remote mode requires both a verified remote DB profile and a verified Qiniu Kodo profile.
- Keep remote credentials in a local encrypted Electron-managed profile store. Do not store secrets in the project database.
- Use one remote database to manage multiple projects, separated by `project_id`.
- First version supports only local-to-remote migration.
- Project deletion is hard deletion. It removes project metadata and attempts to delete all related local/Kodo objects.
- If hard-delete object cleanup fails, record cleanup tasks.
- All IDs are plain generated IDs without semantic prefixes.
- Object keys use:

```text
objects/{projectId}/{mimeGroup}/{resourceId}.{ext}
```

## Recommended Architecture

Use a relationship-table schema shared by SQLite, PostgreSQL, and MySQL. Keep DB-specific differences inside dialect adapters.

Suggested module boundaries:

- `ProjectStorageWorkspace` or upgraded `PersonalSpaceWorkspace` as the project-space UI entry.
- `projectModel.ts`: project, settings, profile summary, migration status types.
- `projectSchemaModel.ts`: asset, character, storyboard, group, relation types.
- `projectRepository.ts`: storage-agnostic CRUD interface.
- `sqliteProjectRepository.ts`: SQLite implementation.
- `sqlProjectRepository.ts`: PostgreSQL/MySQL implementation.
- `projectSchema.ts`: table initialization and schema-version helpers.
- `projectStorageAdapter.ts`: object storage interface.
- `localObjectStorage.ts`: local object directory implementation.
- `qiniuKodoStorage.ts`: Qiniu Kodo implementation.
- `projectAssetCollectionService.ts`: shared collection service used by all workspaces.
- `projectMigrationService.ts`: existing personal-space migration and local-to-remote migration.
- `secureProfileService` in Electron main process: encrypted DB and Kodo profile storage.

Workspace entry files should stay compositional. Hooks own workflow state. Models own pure logic. Storage, services, and actions own IO.

## Project Space UI

Upgrade the current "个人空间" concept to "项目空间".

The top of project space should include:

- Current project selector.
- Create project action.
- Edit project action.
- Delete project action.
- Project mode/status tag.
- Remote verification/migration status where relevant.

Project space keeps the current functional sections:

- Characters.
- Storyboards.
- Materials.
- Settings.

Settings gains:

- Local object directory status.
- Remote DB profile selector/create/edit.
- Remote DB test connection.
- Remote DB initialize schema.
- Qiniu Kodo profile selector/create/edit.
- Kodo verification.
- Local-to-remote migration action.
- Migration progress and failure report.

The app shell keeps tools as tools. The global "personal space" entry becomes the global "project space" entry.

## Schema

The same logical schema should be supported by SQLite, PostgreSQL, and MySQL.

Use ISO-8601 timestamp strings in TypeScript. Avoid depending on DB-specific date functions in the first version.

Use JSON columns where available. SQLite can store JSON as `TEXT`; PostgreSQL can use `JSONB`; MySQL can use `JSON`.

### `schema_migrations`

Tracks applied schema versions.

```text
version text primary key
applied_at text not null
checksum text null
```

### `projects`

Project main table. Projects are hard-deleted.

```text
id text primary key
name text not null
description text not null default ''
mode text not null
status text not null
object_key_prefix text not null
created_at text not null
updated_at text not null
metadata_json json/text null
```

Allowed `mode` values:

```text
local
remote
```

Allowed `status` values:

```text
active
migrating
migration_failed
```

`object_key_prefix` is always:

```text
objects/{projectId}
```

### `project_settings`

Non-secret project settings. Remote secrets are stored only in local encrypted profiles.

```text
project_id text primary key references projects(id) on delete cascade
storage_provider text not null
database_provider text not null
local_object_root text null
remote_database_profile_id text null
remote_storage_profile_id text null
last_verified_at text null
updated_at text not null
```

Allowed `storage_provider` values:

```text
local
qiniu_kodo
```

Allowed `database_provider` values:

```text
sqlite
postgresql
mysql
```

Application-level rule for remote projects:

- `storage_provider = qiniu_kodo`
- `database_provider in ('postgresql', 'mysql')`
- `remote_database_profile_id` is not null
- `remote_storage_profile_id` is not null
- DB profile and Kodo profile verification succeeded before switching project mode.

### `asset_groups`

Material groups. Groups are hard-deleted.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
kind text not null
name text not null
starred boolean not null default false
sort_order integer not null default 0
created_at text not null
updated_at text not null
```

Allowed `kind` values:

```text
image
sprite
voice
```

Unique constraint:

```text
unique(project_id, kind, name)
```

### `assets`

A user-visible asset record. Resource fields are merged into this table. There is no `asset_resources` table in the first version.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
kind text not null
asset_subtype text not null
group_id text null references asset_groups(id) on delete set null
name text not null
dialogue_text text null
source_key text null

primary_resource_id text not null
primary_object_key text not null
primary_file_name text not null
primary_mime_group text not null
primary_mime_type text not null
primary_extension text not null
primary_size_bytes integer not null default 0
primary_hash_sha256 text null

sprite_index_resource_id text null
sprite_index_object_key text null
sprite_index_file_name text null
sprite_index_mime_type text null
sprite_index_size_bytes integer null
sprite_index_hash_sha256 text null

sprite_frame_width integer null
sprite_frame_height integer null
sprite_sheet_width integer null
sprite_sheet_height integer null
sprite_fps integer null
sprite_frame_count integer null

created_at text not null
updated_at text not null
metadata_json json/text null
```

Allowed `kind` values:

```text
image
sprite
voice
```

Suggested first-version `asset_subtype` values:

```text
generic
portrait
map
effect
character_sprite
effect_sprite
character_voice
narration
sound_effect
```

Subtype gives the app stable asset semantics. Groups remain user-managed organization.

Examples:

- Character portraits: `kind = image`, `asset_subtype = portrait`.
- Map images: `kind = image`, `asset_subtype = map`.
- Effect images: `kind = image`, `asset_subtype = effect`.
- Regular imported images: `kind = image`, `asset_subtype = generic`.
- Sprite sheets: `kind = sprite`, `asset_subtype = character_sprite`, `effect_sprite`, or `generic`.
- Voice assets: `kind = voice`, `asset_subtype = character_voice`, `narration`, `sound_effect`, or `generic`.

Object key rule:

```text
primary_object_key = objects/{projectId}/{primary_mime_group}/{primary_resource_id}.{primary_extension}
sprite_index_object_key = objects/{projectId}/application/{sprite_index_resource_id}.json
```

Sprite assets:

- `primary_*` points to `sprite.png`.
- `primary_mime_group = image`.
- `primary_mime_type = image/png`.
- `sprite_index_*` points to `index.json`.
- `sprite_index_mime_type = application/json`.
- `sprite_*` summary fields are filled from `index.json` for listing and preview.

Image assets:

- Use only `primary_*` fields.
- `sprite_index_*` fields are null.
- `sprite_*` fields are null.

Voice assets:

- `primary_*` points to audio.
- `primary_mime_group = audio`.
- `dialogue_text` may be filled.
- `sprite_index_*` fields are null.
- `sprite_*` fields are null.

Recommended indexes:

```text
index(project_id, kind)
index(project_id, asset_subtype)
index(project_id, group_id)
unique(project_id, primary_object_key)
unique(project_id, sprite_index_object_key)
```

For DBs where unique nullable behavior differs, application-level validation should also prevent duplicate non-null `sprite_index_object_key`.

Source-key rule:

- `source_key` supports collection de-duplication.
- Enforce uniqueness at the application layer for non-empty `project_id + source_key`.
- DB-specific partial unique indexes can be added where appropriate.

### `characters`

Characters are hard-deleted.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
name text not null
starred boolean not null default false
sort_order integer not null default 0
created_at text not null
updated_at text not null
```

Recommended indexes:

```text
index(project_id, sort_order)
index(project_id, starred)
```

### `character_asset_links`

Links characters to portrait, sprite, and voice assets. Tags and notes are removed.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
character_id text not null references characters(id) on delete cascade
asset_id text not null references assets(id) on delete cascade
column_kind text not null
sort_order integer not null default 0
created_at text not null
updated_at text not null
```

Allowed `column_kind` values:

```text
portrait
sprite
voice
```

Unique constraint:

```text
unique(character_id, asset_id, column_kind)
```

Recommended indexes:

```text
index(project_id, character_id, column_kind, sort_order)
index(project_id, asset_id)
```

### `storyboard_groups`

Storyboard groups are hard-deleted.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
name text not null
starred boolean not null default false
created_at text not null
updated_at text not null
```

Recommended indexes:

```text
index(project_id, starred)
index(project_id, created_at)
```

### `storyboard_voice_entries`

Voice entries inside a storyboard group.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
storyboard_id text not null references storyboard_groups(id) on delete cascade
asset_id text not null references assets(id) on delete cascade
character_id text null references characters(id) on delete set null
text text not null default ''
start_offset_us integer not null default 0
sort_order integer not null default 0
created_at text not null
updated_at text not null
```

`start_offset_us` semantics:

- `0`: play immediately after the previous audio ends.
- Positive value: wait that many microseconds after the previous audio ends.
- Negative value: start that many microseconds before the previous audio ends, allowing overlap.

Examples:

```text
500000   = delay 0.5 seconds
-200000  = start 0.2 seconds before previous audio ends
```

Recommended indexes:

```text
index(project_id, storyboard_id, sort_order)
index(project_id, asset_id)
index(project_id, character_id)
```

Playback implication:

- Current serial `audio.onEnded` playback is not enough for negative offsets.
- Add a focused playback scheduler that can inspect durations, schedule starts, and support overlap.
- Keep this scheduler outside `PersonalStoryboardPanel.tsx`.

### `asset_relations`

Generic asset-to-asset relations. Keep this table.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
source_asset_id text not null references assets(id) on delete cascade
target_asset_id text not null references assets(id) on delete cascade
relation_type text not null
created_at text not null
```

Suggested first-version `relation_type` values:

```text
effect_voice
derived_from
```

Unique constraint:

```text
unique(project_id, source_asset_id, target_asset_id, relation_type)
```

Recommended indexes:

```text
index(project_id, source_asset_id)
index(project_id, target_asset_id)
```

### `project_migrations`

Records local-to-remote migration attempts.

```text
id text primary key
project_id text not null references projects(id) on delete cascade
from_mode text not null
to_mode text not null
status text not null
started_at text null
finished_at text null
total_assets integer not null default 0
total_objects integer not null default 0
uploaded_objects integer not null default 0
error_message text null
report_json json/text null
```

Allowed `from_mode`:

```text
local
```

Allowed `to_mode`:

```text
remote
```

Allowed `status` values:

```text
pending
running
succeeded
failed
```

### `deleted_project_cleanup_tasks`

Records failed hard-delete object cleanup.

```text
id text primary key
project_id text not null
storage_provider text not null
object_key text not null
status text not null
error_message text null
created_at text not null
updated_at text not null
```

Allowed `storage_provider` values:

```text
local
qiniu_kodo
```

Allowed `status` values:

```text
pending
succeeded
failed
```

## Secure Local Profiles

Remote DB and Kodo credentials must not be stored in project business tables.

Electron main process should manage encrypted local profiles:

```text
secure_connection_profiles
- id
- type                 -- database | qiniu_kodo
- display_name
- redacted_summary
- encrypted_payload
- created_at
- updated_at
- last_verified_at
```

Database payload examples:

- Provider: PostgreSQL or MySQL.
- Host.
- Port.
- Database name.
- Username.
- Password.
- SSL option.

Kodo payload examples:

- Access key.
- Secret key.
- Bucket.
- Region.
- Public/private domain.
- Upload policy options.

Renderer process only receives:

- Profile ID.
- Display name.
- Redacted summary.
- Verification status.
- Last verified time.

## Remote Verification

Remote mode can only be enabled after both checks pass.

DB verification:

- Open connection.
- Run a lightweight query.
- Check schema migration table.
- Initialize schema if requested.
- Verify required tables and version.

Kodo verification:

- Generate upload token in main process or trusted service layer.
- Upload a small test object under the target project prefix.
- Confirm object existence or fetch accessible URL according to configured access mode.
- Delete the test object.

## Local-To-Remote Migration

First version only supports local-to-remote migration.

Steps:

1. Validate remote DB profile.
2. Validate Qiniu Kodo profile.
3. Initialize remote DB schema.
4. Create `project_migrations` record.
5. Enumerate all local object keys referenced by `assets`.
6. Upload local objects to Kodo using the same object keys.
7. Copy project rows into remote DB.
8. Update local project `mode` to `remote`.
9. Update `project_settings` to remote providers and profile IDs.
10. Mark migration succeeded.

Failure rule:

- If any step fails before final mode switch, keep the project in local mode.
- Store migration failure status and report.
- Uploaded remote objects may be listed in the failure report for cleanup or retry.

## Existing Data Migration

On first upgrade:

1. Create a default local project.
2. Read old `game-design-tools.personal-space.v1`.
3. Create project-level groups, assets, characters, storyboard groups, links, relations, and storyboard entries.
4. Convert old resource references into the new `assets` resource fields.
5. Copy or move existing local resources into the new object directory when available.
6. Keep a backup/export path for old state before marking migration complete.

Old tags and notes are intentionally not migrated as first-class data because the new design removes them.

Mapping highlights:

- Old character stars become `characters.starred`.
- Old storyboard stars become `storyboard_groups.starred`.
- Old starred asset groups become `asset_groups.starred`.
- Old image assets with portrait semantics become `asset_subtype = portrait`.
- Old map/effect assets become `asset_subtype = map` or `effect`.
- Old sprite assets fill `primary_*` and `sprite_index_*`.
- Old voice assets fill `primary_*` and `dialogue_text`.

## Current Feature Adjustments

Remove these current project-space features:

- Asset tags.
- Tag editing UI.
- Character asset link notes.
- Storyboard voice entry notes.
- Upload/collection code that writes semantic tags such as `肖像`, `抠图`, `角色配音`, or `精灵图`.

Replace tag/group-name semantic checks with `asset_subtype`:

- Portrait filtering uses `asset_subtype = portrait`.
- Effect image behavior uses `asset_subtype = effect`.
- Map image behavior uses `asset_subtype = map`.
- Generic images use `asset_subtype = generic`.

Replace direct state writes:

- Existing direct `readPersonalSpaceState` / `writePersonalSpaceState` calls should move behind project repository operations.
- Existing direct `writeAssetResourcesToDirectory` calls should move behind object storage adapter operations.
- Existing collection paths should call `projectAssetCollectionService`.

Affected collection paths:

- Voice generation collection.
- Sprite sheet collection.
- Matte group image collection.
- Manual uploads in project space.

Image processing currently only exports files. It can remain export-only in the first project-storage phase, or add a separate "collect to project space" enhancement after the core project storage is stable.

## Deletion Behavior

Projects, groups, assets, characters, and storyboard groups are hard-deleted.

Project hard-delete should:

1. Count assets and objects.
2. Ask for explicit confirmation.
3. Delete object files from local object storage or Kodo.
4. Delete project rows from the active database.
5. Record failed object cleanup in `deleted_project_cleanup_tasks`.

Entity deletion should rely on foreign keys and explicit repository operations:

- Delete asset: cascade character links, storyboard voice entries, and asset relations.
- Delete character: cascade character links; storyboard entries set `character_id` to null.
- Delete storyboard group: cascade storyboard voice entries.
- Delete asset group: assets set `group_id` to null or must be transferred before delete. The first version should use set-null to avoid accidental mass asset deletion.

## Testing Strategy

Add model and repository tests before UI wiring.

Minimum tests:

- Schema generation includes all required tables and indexes.
- SQLite schema initializes idempotently.
- PostgreSQL/MySQL SQL generation maps the same logical schema.
- Object key generation returns `objects/{projectId}/{mimeGroup}/{resourceId}.{ext}`.
- Asset subtype migration maps old portrait/map/effect semantics.
- Sprite asset creation fills both primary and sprite index fields.
- Character asset link creation no longer accepts tags or notes.
- Storyboard voice entry stores `start_offset_us`.
- Project deletion produces cleanup tasks when object deletion fails.
- Local-to-remote migration keeps project local on failure.

Update `src/appStructure.test.ts` to protect new boundaries:

- Workspace entries do not talk directly to DB adapters.
- Collection workflows go through project asset collection service.
- Credentials stay behind desktop API / Electron main process.
- Tags and link notes do not return to project-space UI.

## Open Implementation Notes

- Use `node:sqlite` if Electron's bundled Node runtime exposes the required stable APIs for the target runtime. If packaging or API availability becomes a problem, use a proven native SQLite package and document the build impact.
- Keep DB connection and Kodo credentials in Electron main process or an equivalent trusted local service layer.
- Keep renderer-side APIs typed in `src/desktopApi.ts`.
- Keep SQL dialect differences isolated. Do not scatter provider branches through UI hooks.
- Keep object storage paths provider-neutral.

