# Remote Asset Cache Manager Design

## Background

Project space now supports local projects and remote projects. Remote projects use a remote database plus Qiniu Kodo object storage. Asset records already store object keys and resource fingerprints in the `assets` table:

- `primary_object_key`
- `primary_size_bytes`
- `primary_hash_sha256`
- `sprite_index_object_key`
- `sprite_index_size_bytes`
- `sprite_index_hash_sha256`

The current read path resolves project object keys through `projectAssetResourceResolver` and then directly calls `ProjectObjectStorage.getObject`. In remote mode this means previewing, playing, or exporting a resource can repeatedly download the same Kodo object. It also means upload, preview, playback, export, migration, and delete flows do not share one asset lifecycle policy.

The next version introduces a project asset manager so remote assets have a local cache strategy while keeping local and remote object storage structures unified.

## Goals

1. Add a central `ProjectAssetManager` to manage project asset binary lifecycle.
2. Cache all remote resources that are produced by this client after upload.
3. Cache all remote resources fetched from object storage after user-triggered view, playback, or export.
4. Reuse cached resources when the database fingerprint has not changed.
5. Download fresh remote resources only when the user performs an action that needs the full asset and the cache is missing or stale.
6. Keep list rendering lightweight. Lists must not eagerly download full remote assets.
7. Clean cache only when an asset or project is hard deleted in the first version.

## Non-Goals

1. Do not add new remote database tables for cache state.
2. Do not query Kodo object metadata before each preview/playback in the first version.
3. Do not add automatic LRU, capacity, or age-based cache cleanup in the first version.
4. Do not implement bidirectional remote-to-local migration in this work.
5. Do not introduce collaborative locking or conflict resolution in this work.

## Architecture

### Existing Boundaries

`ProjectObjectStorage` remains a pure object transport interface:

```ts
export interface ProjectObjectStorage {
  putObject(objectKey: string, data: Blob): Promise<void>
  getObject(objectKey: string): Promise<Blob>
  deleteObject(objectKey: string): Promise<void>
  deleteObjects(objectKeys: string[]): Promise<ProjectObjectDeleteResult>
}
```

Local object storage and Kodo object storage continue to implement this interface. They should not know about asset IDs, resource IDs, hash fields, list behavior, or UI usage.

### New Boundaries

Add `ProjectAssetCacheStorage` as the local cache persistence boundary. It stores and reads cached remote resource blobs from the app internal cache directory.

Add `ProjectAssetManager` as the business lifecycle boundary. It decides whether to read from local object storage, read from remote cache, download from Kodo, populate cache, upload and cache, or delete cache.

`projectAssetResourceResolver` remains as a compatibility layer for existing preview/playback/export callers, but remote object reads should move through `ProjectAssetManager` rather than directly through `ProjectObjectStorage.getObject`.

`usePersonalSpaceWorkspace` creates the active project asset manager and passes it to resource preview, storyboard playback, resource export, migration, and delete flows.

## Cache Location

The cache is stored in the app internal cache directory, separate from the user-visible project local object directory.

Suggested Electron-side layout:

```text
<appData>/project-asset-cache/{projectId}/{resourceRole}/{safeResourceId}/
  data
  meta.json
```

`resourceRole` is one of:

- `primary`
- `sprite_index`

`resourceId` should be the database resource ID when available. If a current frontend type does not expose it yet, implementation should expose the existing `primary_resource_id` and `sprite_index_resource_id` fields through the type mapping instead of inventing a new identifier.

The cache path intentionally avoids using the object key as the primary path identity because object keys contain project names. Project rename or later object-key migration should not make the cache path itself unstable. The object key is still stored in metadata and must match before a cache hit is accepted.

## Cache Metadata

`meta.json` stores:

```json
{
  "projectId": "project-id",
  "objectKey": "objects/project_name/image_png/resource-id.png",
  "resourceRole": "primary",
  "resourceId": "resource-id",
  "mimeType": "image/png",
  "sizeBytes": 12345,
  "hashSha256": "hash-value",
  "fingerprint": "sha256:hash-value",
  "cachedAt": "2026-06-24T00:00:00.000Z",
  "lastAccessedAt": "2026-06-24T00:00:00.000Z"
}
```

The first version does not use `lastAccessedAt` for automatic cleanup, but it should be updated on cache hits so a future cleanup feature can use it without rebuilding history.

## Fingerprint Rules

The project database is the first-version source of truth for remote resource freshness.

Fingerprint construction:

1. If `hashSha256` exists, use `sha256:{hashSha256}`.
2. If hash is missing and `sizeBytes` exists, use `weak:{objectKey}:{sizeBytes}`.
3. If both hash and size are missing, use `weak:{objectKey}` as a compatibility fallback.

Cache hit conditions:

1. Cache data file exists.
2. Cache metadata exists.
3. Metadata `objectKey` equals the requested object key.
4. Metadata `fingerprint` equals the expected fingerprint.

If any condition fails, the cache is stale or missing.

## Core Types

```ts
export type ProjectResourceRole = 'primary' | 'sprite_index'

export interface ProjectAssetResourceRef {
  projectId: string
  projectMode: 'local' | 'remote'
  assetId: string
  resourceId: string
  role: ProjectResourceRole
  objectKey: string
  mimeType?: string | null
  sizeBytes?: number | null
  hashSha256?: string | null
}
```

`ProjectAssetResourceRef` is the required resource identity for cache-aware operations. It keeps the manager independent of UI asset shape while still carrying enough metadata to validate freshness.

Add pure helpers to build these refs from project asset rows:

```ts
buildProjectAssetResourceRefs(asset): ProjectAssetResourceRef[]
buildPrimaryProjectAssetResourceRef(asset): ProjectAssetResourceRef
buildSpriteIndexProjectAssetResourceRef(asset): ProjectAssetResourceRef | null
```

## ProjectAssetCacheStorage Interface

```ts
export interface ProjectAssetCacheStorage {
  getCachedResource(ref: ProjectAssetResourceRef, expectedFingerprint: string): Promise<Blob | null>
  putCachedResource(ref: ProjectAssetResourceRef, fingerprint: string, blob: Blob): Promise<void>
  deleteCachedResource(ref: ProjectAssetResourceRef): Promise<void>
  deleteProjectCache(projectId: string): Promise<void>
}
```

The desktop implementation should use Electron IPC and a local filesystem module. Tests should also include an in-memory cache implementation.

## ProjectAssetManager Interface

```ts
export interface ProjectAssetManager {
  putResource(ref: ProjectAssetResourceRef, blob: Blob): Promise<void>
  getResourceBlob(ref: ProjectAssetResourceRef): Promise<Blob>
  resolveResourceSource(ref: ProjectAssetResourceRef): Promise<{
    source: string
    objectUrl?: string
    blob?: Blob
  }>
  deleteResources(refs: ProjectAssetResourceRef[]): Promise<void>
  deleteProjectCache(projectId: string): Promise<void>
}
```

Manager dependencies:

```ts
interface ProjectAssetManagerOptions {
  localObjectStorage: ProjectObjectStorage
  remoteObjectStorage: ProjectObjectStorage
  cacheStorage: ProjectAssetCacheStorage
}
```

`localObjectStorage` is used for local-mode projects. `remoteObjectStorage` is used for remote-mode Kodo transfer. `cacheStorage` is used only for remote-mode cache.

## Write Flow

When the client creates, collects, generates, migrates, or saves a project asset resource:

1. Build a `ProjectAssetResourceRef`.
2. Call `ProjectAssetManager.putResource(ref, blob)`.
3. If `ref.projectMode === 'local'`, write to local object storage.
4. If `ref.projectMode === 'remote'`, upload to Kodo through remote object storage.
5. After remote upload succeeds, write the same blob into local cache with the current fingerprint.

The upload must complete before cache write is considered valid. If cache write fails after upload, the asset can still be saved because remote storage is the source of truth, but the user should get a non-blocking warning where the calling flow already supports messages.

## Read Flow

When the user views, plays, or exports a full resource:

1. Build a `ProjectAssetResourceRef`.
2. Call `ProjectAssetManager.getResourceBlob(ref)`.
3. If `ref.projectMode === 'local'`, read from local object storage.
4. If `ref.projectMode === 'remote'`, compute expected fingerprint from database fields.
5. Try `cacheStorage.getCachedResource(ref, expectedFingerprint)`.
6. If cache hits, return cached blob and update `lastAccessedAt`.
7. If cache misses or is stale, download from remote object storage.
8. Store downloaded blob in cache with expected fingerprint.
9. Return downloaded blob.

Stale cache must not silently stand in for a changed remote resource. If the cache is stale and the remote download fails, return an error. The UI can show the same kind of preview/playback failure it already shows for missing resources.

## List Rendering

List views must not download full remote resources.

First-version behavior:

1. Image/material lists should not call full resource resolution during card rendering.
2. If a lightweight cover/thumbnail source already exists, use it.
3. If no cover exists for a remote image asset, render file name/type placeholder until the user opens preview.
4. Sprite lists should not read full sheet or sprite index until preview/play.
5. Voice lists should render metadata and a play action; audio is read only when play starts.

This may require moving some `PersonalAssetPreview` behavior from eager render-time loading to explicit preview/play interactions.

## Delete Flow

Asset hard delete:

1. Delete project object storage resources through the existing object deletion flow.
2. Call `ProjectAssetManager.deleteResources(refs)` to remove cache entries for those resources.

Project hard delete:

1. Delete project object storage resources through the existing project deletion flow.
2. Call `ProjectAssetManager.deleteProjectCache(projectId)` to remove the whole project cache directory.

The first version does not scan for orphan cache entries after normal sync.

## Migration And Sync

Local-to-remote migration:

1. Read local source resources.
2. Build remote `ProjectAssetResourceRef` values.
3. Upload each resource through `ProjectAssetManager.putResource`.
4. Successful uploads are immediately cached.

Periodic remote sync:

1. Sync database rows and missing objects as today.
2. Do not download remote full assets during periodic sync.
3. When remote project rows are loaded, update local project state cache but leave resource blobs lazy.

Remote database load:

1. Restore project state from remote rows.
2. Do not prefetch full resource blobs.
3. User-triggered view/play/export resolves resource blobs through the manager.

## Integration Points

Update these areas:

1. `src/components/ProjectStorage/projectAssetManager.ts`
   - New manager, fingerprint helpers, cache-aware read/write/delete behavior.

2. `src/components/ProjectStorage/projectAssetCacheStorage.ts`
   - Browser-facing cache interface, memory cache for tests, desktop cache implementation.

3. `electron/projectAssetCacheStorage.cjs`
   - Filesystem cache root, safe path resolution, metadata read/write, project cache deletion.

4. Electron main/preload/desktop API
   - IPC bridge for cache get/put/delete operations.

5. `src/components/PersonalSpaceWorkspace/projectAssetResourceResolver.ts`
   - Add cache-aware resource-ref based resolution.
   - Keep legacy path-based functions for callers not yet converted.

6. `src/components/PersonalSpaceWorkspace/PersonalAssetPreview.tsx`
   - Avoid full remote resource downloads during list rendering.
   - Resolve full images/sprite index/audio only on preview/play actions.

7. `src/components/PersonalSpaceWorkspace/storyboardPlaybackSources.ts`
   - Resolve storyboard voice playback through the manager.

8. `src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.ts`
   - Export reads resources through the manager.

9. `src/components/ProjectStorage/projectMigrationService.ts`
   - Remote upload path writes through the manager so uploaded resources are cached.

10. Project sync/save flows
   - Remote-mode object writes use the manager instead of writing directly to Kodo storage.

11. Asset and project delete flows
   - Delete cache after successful object deletion.

## Error Handling

1. Missing cache is normal and should trigger remote download in remote mode.
2. Stale cache is normal and should trigger remote download in remote mode.
3. Remote download failure after stale cache should fail the read; do not serve stale bytes as current data.
4. Remote download failure after cache miss should fail the read.
5. Cache write failure after successful remote download should not prevent preview/playback from using the downloaded blob.
6. Cache write failure after successful remote upload should not mark the upload failed, but should be visible as a warning in flows that already surface warnings.
7. Cache delete failure should not resurrect deleted assets. It may be logged or surfaced as a cleanup warning.

## Concurrency

The first implementation should deduplicate concurrent remote downloads for the same resource identity and fingerprint inside the manager:

```text
download key = projectId + role + resourceId + fingerprint
```

If multiple previews request the same remote resource at once, only one Kodo download should run. All callers receive the same resulting blob or error.

## Testing Plan

Add tests before implementation code.

Unit tests:

1. Fingerprint helper prefers `hashSha256`.
2. Fingerprint helper falls back to `objectKey + sizeBytes`.
3. Fingerprint helper falls back to `objectKey`.
4. Remote `getResourceBlob` returns cached blob when object key and fingerprint match.
5. Remote `getResourceBlob` downloads and caches when cache is missing.
6. Remote `getResourceBlob` downloads and replaces cache when fingerprint changes.
7. Remote stale cache is not returned when remote download fails.
8. Remote `putResource` uploads to remote storage and writes cache after upload.
9. Local `putResource` and `getResourceBlob` bypass cache and use local object storage.
10. `deleteResources` removes cache entries.
11. `deleteProjectCache` removes project cache.
12. Concurrent remote reads for the same fingerprint deduplicate download.

Electron filesystem tests:

1. Cache storage writes `data` and `meta.json`.
2. Cache storage rejects path traversal in project/resource identifiers.
3. Cache storage returns null for metadata mismatch.
4. Project cache deletion removes only the target project cache.

Integration/structure tests:

1. Remote preview/playback/export paths use `ProjectAssetManager`, not direct Kodo `getObject`.
2. List rendering does not call full remote resource resolution during card render.
3. `usePersonalSpaceWorkspace` composes the manager and passes it to project resource flows.
4. Object storage implementations remain transport-only and do not import UI or asset manager modules.

Full verification:

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

## Rollout Sequence

1. Add manager/cache tests and pure fingerprint helpers.
2. Add memory cache storage and manager implementation.
3. Add Electron cache persistence and desktop bridge.
4. Wire resolver and existing preview/playback/export reads through manager.
5. Change list preview behavior to avoid eager full downloads.
6. Wire upload/migration paths through manager.
7. Wire delete paths to cache cleanup.
8. Add architecture guard tests.
9. Run full verification.

## Open Decisions Resolved

1. Cache location: app internal cache directory.
2. Freshness source: project database fingerprint fields only.
3. Remote metadata queries: no Kodo stat before preview/playback in the first version.
4. Cleanup: only hard delete asset/project cache cleanup in the first version.
5. Architecture: central `ProjectAssetManager` wrapping object storage and cache storage.
