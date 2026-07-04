# Sound Effects Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Stable Audio 3 `生成音效` tab to the voice workbench, with one-click Windows setup, service controls, sound generation history, and collection into a new project-space `音效素材` asset category that can link to sprite assets.

**Architecture:** Add `sound` as a first-class project asset kind before UI work, then layer Stable Audio 3 desktop runtime support behind the same desktop-service workflow used by VoxCPM and BiRefNet. Keep the voice workspace entry as a composition layer: sound-effect model logic, service IO, generation workflow, collection, and panels live in focused files under `src/components/VoiceDeploymentWorkspace/`.

**Tech Stack:** React 19, TypeScript, Ant Design 6, Electron 41 IPC, Windows PowerShell deployment scripts, Node `tsx --test`, existing project storage repositories and `DesktopServiceRuntime`.

## Global Constraints

- Add a `生成音效` Tab inside the existing `配音工作台`.
- Keep existing `生成配音` VoxCPM behavior working.
- Add a Stable Audio 3 one-click install script.
- After installation, provide dependency detection, model detection, service detection, start, restart, and stop.
- Model choices are exactly `small-sfx`, `small-music`, and `medium`.
- Default sound-effect model is `small-sfx`.
- `small-sfx`: CPU-capable, 433M, max 120 seconds, sound effects.
- `small-music`: CPU-capable, 433M, max 120 seconds, music loops and short music.
- `medium`: CUDA GPU, 1.4B, max 380 seconds, higher quality and longer audio.
- Do not connect to Stability AI cloud APIs.
- First version does not include LoRA fine-tuning, audio continuation, inpainting, batch generation, lyrics, vocals, character speech, a full audio editor, or timeline editing.
- Use service port `8818` for Stable Audio 3, leaving VoxCPM on `8808`.
- Generated sound effects collect into independent `音效素材`, not `配音`.
- Sound effects can link to existing sprite assets with relation type `sound_sprite`.
- Follow product UI register: restrained colors, compact controls, standard Ant Design affordances, no marketing layout.
- Use TDD: every production behavior change starts with a failing test.

---

## File Structure Map

- `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`: add `sound` to asset kind types and `linkedSpriteAssetIds` to assets.
- `src/components/PersonalSpaceWorkspace/personalSpaceState.ts`: default and legacy-safe normalization for `sound` groups and sprite links.
- `src/components/PersonalSpaceWorkspace/personalSpaceAssetGroups.ts`: route `sound` assets to the `sound` group list.
- `src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts`: labels, storage category, file extension, and `createSoundAssetFromRecord`.
- `src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts`: update/delete sound-sprite link cleanup.
- `src/components/PersonalSpaceWorkspace/personalSpaceDerivedState.ts`: expose sound assets and an `音效素材` resource section.
- `src/components/PersonalSpaceWorkspace/usePersonalResourceGroups.ts`: treat `sound` as a grouped resource section.
- `src/components/ProjectStorage/projectStorageAssetTypes.ts`: add `sound` project kind and typed `sound_sprite` relation.
- `src/components/ProjectStorage/projectLegacyMigration.ts`: export local project rows with `sound` groups and `sound_sprite` relations.
- `src/components/ProjectStorage/projectLegacyRestore.ts`: restore `sound` groups and `linkedSpriteAssetIds`.
- `src/desktopStableAudioRuntimeApi.ts`: typed renderer API for Stable Audio setup/service/generation.
- `src/desktopApi.ts`: include Stable Audio desktop API in `GameDesignToolsDesktopApi`.
- `electron/preload.cjs`: expose Stable Audio IPC calls.
- `electron/main.cjs`: register Stable Audio IPC handlers.
- `electron/stableAudioIpcHandlers.cjs`: setup/status/service/generate IPC implementation.
- `scripts/stable-audio-deploy-common.ps1`: shared Stable Audio deployment helpers.
- `scripts/stable-audio-server.template.py`: local HTTP helper for health and generation.
- `scripts/stable-audio-service.template.ps1`: service management script.
- `scripts/stable-audio-service-install.ps1`: writes commands and config.
- `scripts/deploy-stable-audio-3.ps1`: one-click installer.
- `src/components/VoiceDeploymentWorkspace/soundEffectModel.ts`: model metadata, defaults, validation, payload, record naming.
- `src/components/VoiceDeploymentWorkspace/soundEffectService.ts`: browser fetch client for Stable Audio helper.
- `src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts`: install/status/service state.
- `src/components/VoiceDeploymentWorkspace/useSoundEffectGenerationWorkflow.ts`: generation state and history.
- `src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts`: sound tab composition.
- `src/components/VoiceDeploymentWorkspace/soundEffectPersonalSpaceCollector.ts`: collect generated audio into `sound` assets.
- `src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx`: top-level `生成配音` and `生成音效` tabs.
- `src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx`: model/install/service controls.
- `src/components/VoiceDeploymentWorkspace/SoundEffectGenerationPanel.tsx`: prompt/duration/seed/output controls.
- `src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx`: generated sound history and collect actions.
- `src/components/VoiceDeploymentWorkspace/index.tsx`: render tab composition only.
- `src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css`: import focused sound CSS module.
- `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.css`: sound tab layout.
- Structure tests under `src/*Structure.test.ts` and behavior tests beside their models.
- `package.json`: add new tests to `test:files`.

---

### Task 1: Add `sound` Asset Kind To Project Space Models

**Files:**
- Create: `src/components/PersonalSpaceWorkspace/personalSpaceSoundAssetState.test.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceModel.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceState.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceAssetGroups.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceDerivedState.ts`
- Modify: `src/components/PersonalSpaceWorkspace/usePersonalResourceGroups.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `StoredAssetKind = 'image' | 'sprite' | 'voice' | 'sound'`
- Produces: `AssetGroupKind = 'image' | 'sprite' | 'voice' | 'sound'`
- Produces: `PersonalSpaceAsset.linkedSpriteAssetIds: string[]`
- Produces: `createSoundAssetFromRecord(record: SoundRecordAssetInput): PersonalSpaceAsset`
- Produces: `linkSoundAssetToSprite(state: PersonalSpaceState, soundAssetId: string, spriteAssetId: string): PersonalSpaceState`
- Produces: `createPersonalSpaceDerivedState(space).soundAssets`

- [ ] **Step 1: Write failing sound asset state tests**

Create `src/components/PersonalSpaceWorkspace/personalSpaceSoundAssetState.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clonePersonalSpaceState,
  collectPersonalSpaceAsset,
  createPersonalSpaceAsset,
  createSoundAssetFromRecord,
  createPersonalSpaceDerivedState,
  defaultPersonalSpaceState,
  deletePersonalSpaceAsset,
  linkSoundAssetToSprite,
  storageCategoryForAsset,
} from './personalSpaceModel'

test('default personal space state includes sound asset groups', () => {
  const state = clonePersonalSpaceState(defaultPersonalSpaceState)

  assert.deepEqual(state.assetGroups.sound, ['默认分组'])
  assert.deepEqual(state.starredAssetGroups.sound, [])
})

test('creates sound effect assets with sound kind and audio storage category', () => {
  const asset = createSoundAssetFromRecord({
    id: 'sound-record-1',
    name: 'Sword hit',
    audioUrl: 'blob:sound',
    audioPath: null,
    prompt: 'metal sword hit stone',
    durationSeconds: 3,
    model: 'small-sfx',
    sourceKey: 'sound-record:sound-record-1',
  })

  assert.equal(asset.kind, 'sound')
  assert.equal(asset.assetSubtype, 'sound_effect')
  assert.equal(asset.groupName, '默认分组')
  assert.equal(asset.dialogueText, undefined)
  assert.deepEqual(asset.resourcePaths, ['blob:sound'])
  assert.deepEqual(asset.linkedSpriteAssetIds, [])
  assert.equal(asset.sourceKey, 'sound-record:sound-record-1')
  assert.equal(storageCategoryForAsset(asset), '音效')
})

test('derived project-space sections expose independent sound assets', () => {
  const soundAsset = createSoundAssetFromRecord({
    id: 'record-1',
    name: 'Footstep',
    audioUrl: 'blob:step',
    audioPath: null,
    prompt: 'single boot footstep',
    durationSeconds: 2,
    model: 'small-sfx',
  })
  const state = collectPersonalSpaceAsset(defaultPersonalSpaceState, soundAsset)

  const derived = createPersonalSpaceDerivedState(state)

  assert.equal(derived.soundAssets.length, 1)
  assert.equal(derived.assetCounts.sound, 1)
  assert.ok(derived.resourceSections.some((section) => section.kind === 'sound' && section.title === '音效素材'))
})

test('links sound assets to sprites and removes stale sprite links when assets are deleted', () => {
  let state = clonePersonalSpaceState(defaultPersonalSpaceState)
  const sprite = createPersonalSpaceAsset({
    kind: 'sprite',
    name: 'Hero slash',
    resourcePaths: ['sprite.png', 'index.json'],
  })
  const sound = createSoundAssetFromRecord({
    id: 'record-2',
    name: 'Slash sound',
    audioUrl: 'blob:slash',
    audioPath: null,
    prompt: 'sharp blade slash',
    durationSeconds: 2,
    model: 'small-sfx',
  })

  state = collectPersonalSpaceAsset(state, sprite)
  state = collectPersonalSpaceAsset(state, sound)
  state = linkSoundAssetToSprite(state, sound.id, sprite.id)

  assert.deepEqual(state.assets.find((asset) => asset.id === sound.id)?.linkedSpriteAssetIds, [sprite.id])

  state = deletePersonalSpaceAsset(state, sprite.id)

  assert.deepEqual(state.assets.find((asset) => asset.id === sound.id)?.linkedSpriteAssetIds, [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/PersonalSpaceWorkspace/personalSpaceSoundAssetState.test.ts`

Expected: FAIL with TypeScript/module errors for missing `createSoundAssetFromRecord`, `linkSoundAssetToSprite`, `soundAssets`, and `sound` groups.

- [ ] **Step 3: Implement the minimal sound asset model**

Make these production changes:

```ts
// src/components/PersonalSpaceWorkspace/personalSpaceModel.ts
export type CommonAssetKind = 'map' | 'image' | 'effect' | 'voice' | 'sprite' | 'sound'
export type StoredAssetKind = 'image' | 'sprite' | 'voice' | 'sound'
export type AssetGroupKind = 'image' | 'sprite' | 'voice' | 'sound'

export interface PersonalSpaceAsset {
  // existing fields stay
  linkedSpriteAssetIds: string[]
}

export interface SoundRecordAssetInput {
  id: string
  name: string
  audioUrl?: string
  audioPath: string | null
  prompt: string
  durationSeconds: number
  model: string
  sourceKey?: string
}
```

```ts
// src/components/PersonalSpaceWorkspace/personalSpaceAssetGroups.ts
export const defaultAssetGroups: Record<AssetGroupKind, string[]> = {
  image: ['默认分组'],
  sprite: ['默认分组'],
  voice: ['默认分组'],
  sound: ['默认分组'],
}

export function assetGroupKindForAsset(asset: Pick<PersonalSpaceAsset, 'kind'>): AssetGroupKind {
  if (asset.kind === 'voice') return 'voice'
  if (asset.kind === 'sprite') return 'sprite'
  if (asset.kind === 'sound') return 'sound'
  return 'image'
}
```

```ts
// src/components/PersonalSpaceWorkspace/personalSpaceAssets.ts
export function storageCategoryForAsset(asset: PersonalSpaceAsset): string {
  if (asset.assetSubtype === 'portrait') return '角色肖像'
  if (asset.kind === 'sprite') return '精灵图'
  if (asset.kind === 'voice') return '配音'
  if (asset.kind === 'sound') return '音效'
  return '图片'
}

export function createSoundAssetFromRecord(record: SoundRecordAssetInput): PersonalSpaceAsset {
  const playablePath = record.audioUrl?.trim() || record.audioPath || ''
  return createPersonalSpaceAsset({
    kind: 'sound',
    assetSubtype: 'sound_effect',
    name: record.name,
    groupName: '默认分组',
    resourcePaths: playablePath ? [playablePath] : [],
    sourceKey: record.sourceKey,
  })
}
```

```ts
// src/components/PersonalSpaceWorkspace/personalSpaceAssetOperations.ts
export function linkSoundAssetToSprite(state: PersonalSpaceState, soundAssetId: string, spriteAssetId: string): PersonalSpaceState {
  const next = clonePersonalSpaceState(state)
  next.assets = next.assets.map((asset) => {
    if (asset.id !== soundAssetId || asset.kind !== 'sound') return asset
    return { ...asset, linkedSpriteAssetIds: Array.from(new Set([...asset.linkedSpriteAssetIds, spriteAssetId])) }
  })
  return next
}
```

Also update `createPersonalSpaceAsset`, `clonePersonalSpaceState`, `normalizeStarredAssetGroups`, `deletePersonalSpaceAsset`, `assetKindLabel`, `resourceExtension`, `createPersonalSpaceDerivedState`, and `usePersonalResourceGroups` so `sound` is cloned, grouped, counted, rendered, and cleaned exactly like other top-level asset groups.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/components/PersonalSpaceWorkspace/personalSpaceSoundAssetState.test.ts`

Expected: PASS.

- [ ] **Step 5: Add test to package script and run the relevant personal-space tests**

Add `src/components/PersonalSpaceWorkspace/personalSpaceSoundAssetState.test.ts` to `package.json` `scripts.test:files`.

Run:

```powershell
npx tsx --test src/components/PersonalSpaceWorkspace/personalSpaceSoundAssetState.test.ts src/components/PersonalSpaceWorkspace/personalSpaceAssetState.test.ts src/components/PersonalSpaceWorkspace/personalSpaceModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add package.json src/components/PersonalSpaceWorkspace
git commit -m "feat: add sound asset model"
```

---

### Task 2: Persist `sound` Assets And `sound_sprite` Relations In Project Rows

**Files:**
- Modify: `src/components/ProjectStorage/projectStorageAssetTypes.ts`
- Modify: `src/components/ProjectStorage/projectLegacyMigration.ts`
- Modify: `src/components/ProjectStorage/projectLegacyRestore.ts`
- Modify: `src/components/ProjectStorage/projectLegacyMigration.test.ts`
- Modify: `src/components/ProjectStorage/projectLegacyMigrationRestore.test.ts`
- Modify: `src/components/ProjectStorage/projectStorageModel.test.ts`

**Interfaces:**
- Consumes: `PersonalSpaceAsset.linkedSpriteAssetIds`
- Consumes: `AssetGroupKind` includes `sound`
- Produces: `ProjectAssetKind = 'image' | 'sprite' | 'voice' | 'sound'`
- Produces: `AssetRelation.relation_type` supports `'sound_sprite'`
- Produces: migration rows with `asset_groups.kind === 'sound'`
- Produces: restore rows with `PersonalSpaceState.assetGroups.sound`

- [ ] **Step 1: Write failing project row migration tests**

Append to `src/components/ProjectStorage/projectLegacyMigration.test.ts`:

```ts
test('project row migration exports sound assets and sound-sprite relations', () => {
  const state = clonePersonalSpaceState({
    ...defaultPersonalSpaceState,
    assetGroups: {
      ...defaultPersonalSpaceState.assetGroups,
      sound: ['默认分组', '打击音'],
    },
    assets: [
      {
        id: 'sprite-1',
        kind: 'sprite',
        assetSubtype: 'character_sprite',
        name: 'Hero',
        groupName: '默认分组',
        resourcePaths: ['hero.png', 'hero.index.json'],
        createdAt: '2026-07-04T00:00:00.000Z',
        linkedCharacterIds: [],
        linkedStoryboardIds: [],
        linkedVoiceAssetIds: [],
        linkedSpriteAssetIds: [],
        storageResourcePaths: [],
      },
      {
        id: 'sound-1',
        kind: 'sound',
        assetSubtype: 'sound_effect',
        name: 'Slash',
        groupName: '打击音',
        resourcePaths: ['slash.wav'],
        createdAt: '2026-07-04T00:00:00.000Z',
        linkedCharacterIds: [],
        linkedStoryboardIds: [],
        linkedVoiceAssetIds: [],
        linkedSpriteAssetIds: ['sprite-1'],
        storageResourcePaths: [],
      },
    ],
  })

  const rows = migratePersonalSpaceStateToProjectRows(state, {
    projectId: 'project-1',
    projectName: 'Game',
    now: '2026-07-04T00:00:00.000Z',
    localObjectRoot: 'D:\\assets',
    preserveSourceIds: true,
  })

  assert.ok(rows.assetGroups.some((group) => group.kind === 'sound' && group.name === '打击音'))
  assert.ok(rows.assets.some((asset) => asset.id === 'sound-1' && asset.kind === 'sound' && asset.asset_subtype === 'sound_effect'))
  assert.deepEqual(rows.assetRelations.map((relation) => ({
    source: relation.source_asset_id,
    target: relation.target_asset_id,
    type: relation.relation_type,
  })), [{ source: 'sound-1', target: 'sprite-1', type: 'sound_sprite' }])
})
```

Append to `src/components/ProjectStorage/projectLegacyMigrationRestore.test.ts`:

```ts
test('project row restore keeps sound groups and sound-sprite links', () => {
  const rows = createLegacyProjectRows({
    assetGroups: [
      assetGroupRow({ id: 'group-sound', kind: 'sound', name: '打击音', sort_order: 0 }),
    ],
    assets: [
      assetRow({ id: 'sprite-1', kind: 'sprite', asset_subtype: 'character_sprite', name: 'Hero' }),
      assetRow({ id: 'sound-1', kind: 'sound', asset_subtype: 'sound_effect', group_id: 'group-sound', name: 'Slash' }),
    ],
    assetRelations: [
      assetRelationRow({ source_asset_id: 'sound-1', target_asset_id: 'sprite-1', relation_type: 'sound_sprite' }),
    ],
  })

  const state = restoreProjectRowsToPersonalSpaceState(rows)

  assert.deepEqual(state.assetGroups.sound, ['打击音'])
  assert.deepEqual(state.assets.find((asset) => asset.id === 'sound-1')?.linkedSpriteAssetIds, ['sprite-1'])
})
```

If helper names differ in the target tests, add the equivalent local row builders in the same style as existing tests:

```ts
const assetRelationRow = (patch: Partial<AssetRelation>): AssetRelation => ({
  id: 'relation-1',
  project_id: 'project-1',
  source_asset_id: 'source-1',
  target_asset_id: 'target-1',
  relation_type: 'sound_sprite',
  created_at: '2026-07-04T00:00:00.000Z',
  ...patch,
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectLegacyMigration.test.ts src/components/ProjectStorage/projectLegacyMigrationRestore.test.ts
```

Expected: FAIL because project types do not include `sound`, migration does not export `sound_sprite`, and restore does not return sound groups.

- [ ] **Step 3: Implement project type and row mapping changes**

Make these production changes:

```ts
// src/components/ProjectStorage/projectStorageAssetTypes.ts
export type ProjectAssetKind = 'image' | 'sprite' | 'voice' | 'sound'
export type ProjectAssetGroupKind = ProjectAssetKind
export interface AssetRelation {
  relation_type: 'effect_voice' | 'sound_sprite' | 'derived_from' | string
}
```

```ts
// src/components/ProjectStorage/projectLegacyMigration.ts
const assetRelations = state.assets.flatMap((asset) => {
  const effectVoiceRelations = asset.linkedVoiceAssetIds.map((voiceAssetId): AssetRelation => ({
    id: createProjectStorageId(),
    project_id: options.projectId,
    source_asset_id: mappedId(assetIdMap, asset.id),
    target_asset_id: mappedId(assetIdMap, voiceAssetId),
    relation_type: 'effect_voice',
    created_at: options.now,
  }))
  const soundSpriteRelations = asset.linkedSpriteAssetIds.map((spriteAssetId): AssetRelation => ({
    id: createProjectStorageId(),
    project_id: options.projectId,
    source_asset_id: mappedId(assetIdMap, asset.id),
    target_asset_id: mappedId(assetIdMap, spriteAssetId),
    relation_type: 'sound_sprite',
    created_at: options.now,
  }))
  return [...effectVoiceRelations, ...soundSpriteRelations]
})
```

```ts
// src/components/ProjectStorage/projectLegacyRestore.ts
function restoreAssetGroups(rows: LegacyProjectRows): PersonalSpaceState['assetGroups'] {
  return {
    image: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'image')).map((group) => group.name),
    sprite: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'sprite')).map((group) => group.name),
    voice: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'voice')).map((group) => group.name),
    sound: sortedByOrder(rows.assetGroups.filter((group) => group.kind === 'sound')).map((group) => group.name),
  }
}

const linkedSpriteAssetIds = rows.assetRelations
  .filter((relation) => relation.source_asset_id === asset.id && relation.relation_type === 'sound_sprite')
  .map((relation) => relation.target_asset_id)
```

Return `linkedSpriteAssetIds: idsUniqueInOrder(linkedSpriteAssetIds)` from `restoreAssets`.

- [ ] **Step 4: Run project storage tests to verify they pass**

Run:

```powershell
npx tsx --test src/components/ProjectStorage/projectLegacyMigration.test.ts src/components/ProjectStorage/projectLegacyMigrationRestore.test.ts src/components/ProjectStorage/projectLegacyMigrationRows.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/ProjectStorage src/components/PersonalSpaceWorkspace
git commit -m "feat: persist sound asset relations"
```

---

### Task 3: Add Stable Audio 3 Desktop Runtime Bridge

**Files:**
- Create: `src/desktopStableAudioRuntimeApi.ts`
- Create: `src/components/VoiceDeploymentWorkspace/stableAudioDesktopRuntime.test.cjs`
- Create: `electron/stableAudioIpcHandlers.cjs`
- Modify: `src/desktopApi.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/main.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `DesktopStableAudioModelId = 'small-sfx' | 'small-music' | 'medium'`
- Produces: `DesktopStableAudioSetupOptions { modelPath: string; model: DesktopStableAudioModelId; source: DownloadSource }`
- Produces: `DesktopStableAudioGenerateOptions { prompt: string; durationSeconds: number; seed: number | null; outputName: string }`
- Produces: `runStableAudioSetup(options): Promise<DesktopStableAudioSetupResult>`
- Produces: `queryStableAudioSetupStatus(): Promise<DesktopCommandResult>`
- Produces: `controlStableAudioService(action): Promise<DesktopCommandResult>`
- Produces: `checkStableAudioService(port: number): Promise<DesktopCommandResult>`
- Produces: `generateStableAudio(options): Promise<DesktopStableAudioGenerateResult>`

- [ ] **Step 1: Write failing desktop runtime IPC tests**

Create `src/components/VoiceDeploymentWorkspace/stableAudioDesktopRuntime.test.cjs`:

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  normalizeStableAudioModel,
  resolveStableAudioInstallPaths,
  registerStableAudioIpcHandlers,
} = require('../../../electron/stableAudioIpcHandlers.cjs')

function createIpcMain() {
  const handlers = new Map()
  return {
    handlers,
    handle(channel, handler) {
      handlers.set(channel, handler)
    },
  }
}

test('stable audio model normalization only allows supported model ids', () => {
  assert.equal(normalizeStableAudioModel('small-sfx'), 'small-sfx')
  assert.equal(normalizeStableAudioModel('small-music'), 'small-music')
  assert.equal(normalizeStableAudioModel('medium'), 'medium')
  assert.equal(normalizeStableAudioModel('unknown'), 'small-sfx')
})

test('stable audio install paths stay under GameDesignTools local app data', () => {
  const paths = resolveStableAudioInstallPaths({ LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' })

  assert.equal(paths.stateDir, path.join('C:\\Users\\me\\AppData\\Local', 'GameDesignTools', 'StableAudio3'))
  assert.equal(paths.configPath, path.join(paths.stateDir, 'stable-audio-config.json'))
  assert.equal(paths.servicePath, path.join('C:\\Users\\me\\AppData\\Local', 'GameDesignTools', 'bin', 'stable-audio-service.ps1'))
})

test('stable audio setup launches the deployment script with normalized defaults', async () => {
  const ipcMain = createIpcMain()
  const launchCalls = []
  registerStableAudioIpcHandlers({
    ipcMain,
    resolveDeploymentScript: (name) => `D:\\app\\scripts\\${name}`,
    fsExists: () => true,
    launchSetupTerminal: async (input) => {
      launchCalls.push(input)
      return { started: true, scriptPath: input.scriptPath }
    },
    runCommandOutput: async () => ({ ok: true, output: 'ok' }),
    runServiceCommand: async () => ({ ok: true, output: 'ok' }),
  })

  const result = await ipcMain.handlers.get('stable-audio:run-setup')({}, {
    modelPath: '',
    model: 'bad-model',
    source: 'auto',
  })

  assert.equal(result.started, true)
  assert.equal(launchCalls[0].scriptPath, 'D:\\app\\scripts\\deploy-stable-audio-3.ps1')
  assert.deepEqual(launchCalls[0].args, ['D:\\models\\StableAudio3', 'small-sfx', 'auto'])
})
```

- [ ] **Step 2: Run desktop runtime test to verify it fails**

Run: `node --test src/components/VoiceDeploymentWorkspace/stableAudioDesktopRuntime.test.cjs`

Expected: FAIL because `electron/stableAudioIpcHandlers.cjs` does not exist.

- [ ] **Step 3: Implement IPC handlers and renderer API types**

Create `src/desktopStableAudioRuntimeApi.ts`:

```ts
import type { DownloadSource } from './components/VoiceDeploymentWorkspace/voiceDeploymentModel'
import type { DesktopCommandResult } from './desktopSystemApi'

export type DesktopStableAudioModelId = 'small-sfx' | 'small-music' | 'medium'

export interface DesktopStableAudioSetupOptions {
  modelPath: string
  model: DesktopStableAudioModelId
  source: DownloadSource
}

export interface DesktopStableAudioSetupResult {
  started: boolean
  scriptPath: string
}

export interface DesktopStableAudioGenerateOptions {
  prompt: string
  durationSeconds: number
  seed: number | null
  outputName: string
}

export interface DesktopStableAudioGenerateResult {
  id: string
  name: string
  audioUrl: string
  audioPath: string | null
  prompt: string
  durationSeconds: number
  seed: number | null
  model: DesktopStableAudioModelId
  createdAt: string
}

export interface DesktopStableAudioRuntimeApi {
  runStableAudioSetup(options: DesktopStableAudioSetupOptions): Promise<DesktopStableAudioSetupResult>
  queryStableAudioSetupStatus(): Promise<DesktopCommandResult>
  controlStableAudioService(action: 'start' | 'stop' | 'restart' | 'status'): Promise<DesktopCommandResult>
  checkStableAudioService(port: number): Promise<DesktopCommandResult>
  generateStableAudio(options: DesktopStableAudioGenerateOptions): Promise<DesktopStableAudioGenerateResult>
}
```

Create `electron/stableAudioIpcHandlers.cjs` with injected dependencies for tests:

```js
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { launchSetupTerminal: defaultLaunchSetupTerminal, runServiceCommand: defaultRunServiceCommand } = require('./scriptServiceRuntime.cjs')

const supportedStableAudioModels = new Set(['small-sfx', 'small-music', 'medium'])

function normalizeStableAudioModel(model) {
  return supportedStableAudioModels.has(String(model)) ? String(model) : 'small-sfx'
}

function parseJsonText(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ''))
}

function resolveStableAudioInstallPaths(env = process.env) {
  const localAppData = env.LOCALAPPDATA || ''
  const stateDir = path.join(localAppData, 'GameDesignTools', 'StableAudio3')
  const cmdDir = path.join(localAppData, 'GameDesignTools', 'bin')
  return {
    cmdDir,
    stateDir,
    configPath: path.join(stateDir, 'stable-audio-config.json'),
    servicePath: path.join(cmdDir, 'stable-audio-service.ps1'),
  }
}

function registerStableAudioIpcHandlers({
  ipcMain,
  resolveDeploymentScript,
  fsExists = fs.existsSync,
  launchSetupTerminal = defaultLaunchSetupTerminal,
  runCommandOutput,
  runServiceCommand = defaultRunServiceCommand,
}) {
  ipcMain.handle('stable-audio:run-setup', async (_event, options = {}) => {
    const scriptPath = resolveDeploymentScript('deploy-stable-audio-3.ps1')
    if (!fsExists(scriptPath)) throw new Error(`Stable Audio 3 安装脚本不存在：${scriptPath}`)
    const modelPath = String(options.modelPath || 'D:\\models\\StableAudio3')
    const model = normalizeStableAudioModel(options.model)
    const source = ['auto', 'hf', 'ms'].includes(String(options.source)) ? String(options.source) : 'auto'
    return launchSetupTerminal({
      args: [modelPath, model, source],
      scriptPath,
      title: 'Stable Audio 3 安装依赖',
    })
  })

  ipcMain.handle('stable-audio:setup-status', async () => {
    const { configPath, servicePath } = resolveStableAudioInstallPaths()
    const missing = []
    const details = []
    let config = null
    if (fsExists(servicePath)) details.push(`服务管理脚本：${servicePath}`)
    else missing.push(`缺少服务管理脚本：${servicePath}`)
    if (fsExists(configPath)) {
      config = parseJsonText(await fsp.readFile(configPath, 'utf8'))
      details.push(`安装配置：${configPath}`)
    } else {
      missing.push(`缺少安装配置：${configPath}`)
    }
    if (config?.PythonCommand && runCommandOutput) {
      const probe = await runCommandOutput(String(config.PythonCommand), ['-c', 'import torch; print("torch ok")'], {})
      if (probe.ok) details.push(`Python 依赖：${probe.output || 'torch ok'}`)
      else missing.push(`Python 依赖不可用：${probe.output || 'import torch 失败'}`)
    }
    return missing.length === 0
      ? { ok: true, output: ['Stable Audio 3 依赖已安装。', ...details].join('\n') }
      : { ok: false, output: ['尚未完成 Stable Audio 3 依赖安装。', ...missing, ...details].join('\n') }
  })

  ipcMain.handle('stable-audio:service', async (_event, action = 'status') => {
    const { servicePath } = resolveStableAudioInstallPaths()
    if (!fsExists(servicePath)) return { ok: false, output: '尚未安装 Stable Audio 3 服务管理命令，请先安装依赖。' }
    return runServiceCommand({ action, servicePath })
  })
}

module.exports = {
  normalizeStableAudioModel,
  registerStableAudioIpcHandlers,
  resolveStableAudioInstallPaths,
}
```

Wire `src/desktopApi.ts`, `electron/preload.cjs`, and `electron/main.cjs` to expose and register the new API. Use channel names `stable-audio:run-setup`, `stable-audio:setup-status`, `stable-audio:service`, `stable-audio:health`, and `stable-audio:generate`.

- [ ] **Step 4: Run desktop runtime test to verify it passes**

Run: `node --test src/components/VoiceDeploymentWorkspace/stableAudioDesktopRuntime.test.cjs`

Expected: PASS.

- [ ] **Step 5: Run IPC structure tests**

Run:

```powershell
npx tsx --test src/appDesktopIpcStructure.test.ts src/desktopServiceRuntimeStructure.test.ts src/components/VoiceDeploymentWorkspace/scriptServiceRuntime.test.ts
```

Expected: PASS. If structure tests require explicit channel assertions, add Stable Audio assertions beside VoxCPM/BiRefNet assertions.

- [ ] **Step 6: Commit**

```powershell
git add electron src/desktopApi.ts src/desktopStableAudioRuntimeApi.ts src/components/VoiceDeploymentWorkspace/stableAudioDesktopRuntime.test.cjs package.json
git commit -m "feat: add stable audio desktop bridge"
```

---

### Task 4: Add Stable Audio 3 Deployment Scripts

**Files:**
- Create: `scripts/stable-audio-deploy-common.ps1`
- Create: `scripts/stable-audio-server.template.py`
- Create: `scripts/stable-audio-service.template.ps1`
- Create: `scripts/stable-audio-service-install.ps1`
- Create: `scripts/deploy-stable-audio-3.ps1`
- Create: `src/components/VoiceDeploymentWorkspace/voiceDeploymentStableAudioScriptStructure.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Stable Audio setup IPC calls `deploy-stable-audio-3.ps1 <ModelPath> <ModelId> <Source>`
- Produces: `%LOCALAPPDATA%\GameDesignTools\StableAudio3\stable-audio-config.json`
- Produces: `%LOCALAPPDATA%\GameDesignTools\bin\stable-audio-service.ps1`
- Produces: helper HTTP endpoints `/health`, `/generate`, `/outputs/<file>`

- [ ] **Step 1: Write failing script structure test**

Create `src/components/VoiceDeploymentWorkspace/voiceDeploymentStableAudioScriptStructure.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = {
  deploy: 'scripts/deploy-stable-audio-3.ps1',
  service: 'scripts/stable-audio-service.template.ps1',
  install: 'scripts/stable-audio-service-install.ps1',
  server: 'scripts/stable-audio-server.template.py',
}

function read(path: string) {
  return readFileSync(path, 'utf8')
}

test('stable audio deployment script uses official repository and uv ui extras', () => {
  const deploy = read(files.deploy)

  assert.match(deploy, /Stability-AI\/stable-audio-3/)
  assert.match(deploy, /uv\s+sync\s+--extra\s+ui/)
  assert.match(deploy, /\[ValidateSet\("small-sfx","small-music","medium"\)\]/)
  assert.match(deploy, /\$Port\s*=\s*8818/)
})

test('stable audio service template exposes start stop restart and status actions', () => {
  const service = read(files.service)

  assert.match(service, /ValidateSet\("start",\s*"stop",\s*"restart",\s*"status"\)/)
  assert.match(service, /stable-audio-config\.json/)
  assert.match(service, /Start-ServiceProcess/)
  assert.match(service, /Stop-ServiceProcess/)
})

test('stable audio helper exposes health and generate endpoints', () => {
  const server = read(files.server)

  assert.match(server, /@app\.get\("\/health"\)/)
  assert.match(server, /@app\.post\("\/generate"\)/)
  assert.match(server, /uv/)
  assert.match(server, /stable-audio/)
})
```

- [ ] **Step 2: Run script structure test to verify it fails**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentStableAudioScriptStructure.test.ts`

Expected: FAIL because the Stable Audio script files do not exist.

- [ ] **Step 3: Add deployment scripts**

Create `scripts/deploy-stable-audio-3.ps1` with this top-level contract:

```powershell
param(
    [string]$ModelPath = "D:\models\StableAudio3",
    [ValidateSet("small-sfx","small-music","medium")][string]$ModelVariant = "small-sfx",
    [ValidateSet("auto","hf","ms")][string]$Source = "auto"
)

$ErrorActionPreference = "Stop"
$Port = 8818
$RepoUrl = "https://github.com/Stability-AI/stable-audio-3.git"
$RepoDir = Join-Path $ModelPath "stable-audio-3"

. (Join-Path $PSScriptRoot "stable-audio-deploy-common.ps1")
. (Join-Path $PSScriptRoot "stable-audio-service-install.ps1")

Ensure-GitAvailable
Ensure-UvAvailable
Ensure-Repository $RepoUrl $RepoDir
Invoke-StableAudioInstall $RepoDir
Install-StableAudioServiceCommands $RepoDir $ModelPath $ModelVariant $Port $Source
Write-Host "Stable Audio 3 准备完成。需要启动时运行: stable-audio-start"
```

Create `scripts/stable-audio-server.template.py` as a FastAPI helper with a stable response shape:

```py
from __future__ import annotations

import os
import time
from pathlib import Path

import subprocess

from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()
MODEL_ID = os.environ.get("STABLE_AUDIO_MODEL", "small-sfx")
OUTPUT_DIR = Path(os.environ.get("STABLE_AUDIO_OUTPUT_DIR", "outputs"))
REPO_DIR = Path(os.environ.get("STABLE_AUDIO_REPO_DIR", "."))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

class GenerateRequest(BaseModel):
    prompt: str
    durationSeconds: float
    seed: int | None = None
    outputName: str = "sound-effect"

@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_ID, "ready": True}

@app.post("/generate")
def generate(request: GenerateRequest):
    file_id = f"sound-{int(time.time() * 1000)}"
    output_path = OUTPUT_DIR / f"{file_id}.wav"
    seconds = max(1.0, min(float(request.durationSeconds), 380.0))
    subprocess.run(
        [
            "uv",
            "run",
            "stable-audio",
            "--model",
            MODEL_ID,
            "-p",
            request.prompt,
            "--duration",
            str(seconds),
            "-o",
            str(output_path),
        ],
        cwd=str(REPO_DIR),
        check=True,
    )
    return {
        "id": file_id,
        "name": request.outputName or file_id,
        "audioUrl": f"/outputs/{output_path.name}",
        "audioPath": str(output_path),
        "prompt": request.prompt,
        "durationSeconds": seconds,
        "seed": request.seed,
        "model": MODEL_ID,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

@app.get("/outputs/{file_name}")
def output(file_name: str):
    return FileResponse(OUTPUT_DIR / file_name, media_type="audio/wav")
```

- [ ] **Step 4: Run script structure test to verify it passes**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentStableAudioScriptStructure.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add scripts src/components/VoiceDeploymentWorkspace/voiceDeploymentStableAudioScriptStructure.test.ts package.json
git commit -m "feat: add stable audio deployment scripts"
```

---

### Task 5: Add Sound Effect Model, Service Client, And Workflows

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/soundEffectModel.test.ts`
- Create: `src/components/VoiceDeploymentWorkspace/soundEffectModel.ts`
- Create: `src/components/VoiceDeploymentWorkspace/soundEffectService.ts`
- Create: `src/components/VoiceDeploymentWorkspace/useStableAudioSetup.ts`
- Create: `src/components/VoiceDeploymentWorkspace/useSoundEffectGenerationWorkflow.ts`
- Create: `src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: desktop API from Task 3.
- Produces: `StableAudioModelId`
- Produces: `stableAudioModels`
- Produces: `defaultStableAudioPort = 8818`
- Produces: `defaultSoundEffectParams`
- Produces: `clampSoundDuration(model, seconds)`
- Produces: `createSoundEffectRecordName(params, index)`
- Produces: `buildStableAudioGeneratePayload(params)`
- Produces: `checkStableAudioConnection(port)`
- Produces: `generateStableAudioSound(port, payload)`

- [ ] **Step 1: Write failing sound effect model tests**

Create `src/components/VoiceDeploymentWorkspace/soundEffectModel.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildStableAudioGeneratePayload,
  clampSoundDuration,
  createSoundEffectRecordName,
  defaultSoundEffectParams,
  defaultStableAudioPort,
  stableAudioModels,
} from './soundEffectModel'

test('stable audio model metadata describes the three supported models', () => {
  assert.deepEqual(stableAudioModels.map((model) => model.id), ['small-sfx', 'small-music', 'medium'])
  assert.equal(stableAudioModels.find((model) => model.id === 'small-sfx')?.recommendedUse, '游戏音效、环境声、foley、UI 音')
  assert.equal(stableAudioModels.find((model) => model.id === 'small-music')?.hardware, 'CPU / 轻量设备')
  assert.equal(stableAudioModels.find((model) => model.id === 'medium')?.maxDurationSeconds, 380)
})

test('sound effect defaults prefer small-sfx on port 8818', () => {
  assert.equal(defaultStableAudioPort, 8818)
  assert.equal(defaultSoundEffectParams.model, 'small-sfx')
  assert.equal(defaultSoundEffectParams.durationSeconds, 6)
})

test('duration clamps to the selected model limits', () => {
  assert.equal(clampSoundDuration('small-sfx', 180), 120)
  assert.equal(clampSoundDuration('small-music', 0), 1)
  assert.equal(clampSoundDuration('medium', 500), 380)
})

test('builds stable audio generate payload from params', () => {
  const payload = buildStableAudioGeneratePayload({
    ...defaultSoundEffectParams,
    prompt: 'short magical pickup chime',
    durationSeconds: 8.4,
    seed: 42,
    outputName: 'pickup chime',
  })

  assert.deepEqual(payload, {
    prompt: 'short magical pickup chime',
    durationSeconds: 8,
    seed: 42,
    outputName: 'pickup chime',
  })
})

test('creates concise sound effect record names', () => {
  assert.equal(createSoundEffectRecordName({
    ...defaultSoundEffectParams,
    prompt: 'heavy stone door opening with dust',
  }, 3), '音效 3 · heavy stone')
})
```

- [ ] **Step 2: Run model test to verify it fails**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/soundEffectModel.test.ts`

Expected: FAIL because `soundEffectModel.ts` does not exist.

- [ ] **Step 3: Implement sound effect model and service client**

Create `src/components/VoiceDeploymentWorkspace/soundEffectModel.ts` with:

```ts
export type StableAudioModelId = 'small-sfx' | 'small-music' | 'medium'
export type StableAudioConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected'

export interface StableAudioModelMeta {
  id: StableAudioModelId
  label: string
  hardware: string
  parameterCount: string
  maxDurationSeconds: number
  recommendedUse: string
  note: string
}

export interface SoundEffectParams {
  model: StableAudioModelId
  prompt: string
  durationSeconds: number
  seed: number | null
  outputName: string
}

export interface SoundEffectRecord {
  id: string
  name: string
  createdAt: string
  audioUrl: string
  audioPath: string | null
  prompt: string
  durationSeconds: number
  seed: number | null
  model: StableAudioModelId
}

export const defaultStableAudioPort = 8818

export const stableAudioModels: StableAudioModelMeta[] = [
  {
    id: 'small-sfx',
    label: 'Small SFX',
    hardware: 'CPU / 轻量设备',
    parameterCount: '433M',
    maxDurationSeconds: 120,
    recommendedUse: '游戏音效、环境声、foley、UI 音',
    note: '默认推荐。专门面向音效，适合本地快速生成短声音资产。',
  },
  {
    id: 'small-music',
    label: 'Small Music',
    hardware: 'CPU / 轻量设备',
    parameterCount: '433M',
    maxDurationSeconds: 120,
    recommendedUse: '短音乐、loop、转场音乐',
    note: '专门面向音乐。适合生成短配乐和循环段，不作为音效默认模型。',
  },
  {
    id: 'medium',
    label: 'Medium',
    hardware: 'CUDA GPU',
    parameterCount: '1.4B',
    maxDurationSeconds: 380,
    recommendedUse: '更长、更高质量的音频',
    note: '质量和时长更好，但需要 CUDA GPU 和更完整的本机推理环境。',
  },
]

export const defaultSoundEffectParams: SoundEffectParams = {
  model: 'small-sfx',
  prompt: 'short fantasy sword slash impact',
  durationSeconds: 6,
  seed: null,
  outputName: '',
}

export function clampSoundDuration(model: StableAudioModelId, seconds: number) {
  const meta = stableAudioModels.find((item) => item.id === model) ?? stableAudioModels[0]!
  return Math.max(1, Math.min(meta.maxDurationSeconds, Math.round(Number(seconds) || 1)))
}

export function buildStableAudioGeneratePayload(params: SoundEffectParams) {
  return {
    prompt: params.prompt.trim(),
    durationSeconds: clampSoundDuration(params.model, params.durationSeconds),
    seed: Number.isFinite(params.seed) ? params.seed : null,
    outputName: params.outputName.trim(),
  }
}

export function createSoundEffectRecordName(params: SoundEffectParams, index: number) {
  const prompt = params.prompt.trim().replace(/\s+/g, ' ')
  const suffix = prompt ? ` · ${prompt.slice(0, 11)}` : ''
  return `${params.outputName.trim() || `音效 ${index}`}${suffix}`
}
```

Create `soundEffectService.ts`:

```ts
import type { SoundEffectRecord } from './soundEffectModel'

export async function checkStableAudioConnection(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`)
    return response.ok
  } catch {
    return false
  }
}

export async function generateStableAudioSound(
  port: number,
  payload: { prompt: string; durationSeconds: number; seed: number | null; outputName: string },
): Promise<SoundEffectRecord> {
  const response = await fetch(`http://127.0.0.1:${port}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`生成音效失败：${response.status}`)
  return response.json()
}
```

Create hooks that mirror `useVoiceDeploymentSetup` and `useVoiceGenerationWorkflow`, but keep only sound-effect state:

```ts
// useStableAudioSetup.ts public return shape
return {
  port,
  portInput,
  setPortInput,
  connectionStatus,
  selectedModel,
  setSelectedModel,
  downloadSource,
  setDownloadSource,
  modelPath,
  setModelPath,
  serviceUrl,
  connected,
  desktopRuntime,
  desktopSetupBusy,
  desktopSetupResult,
  desktopSetupError,
  desktopDependencyStatusBusy,
  desktopDependencyStatusResult,
  desktopServiceBusy,
  desktopServiceResult,
  applyPort,
  runCheck,
  runDesktopSetup,
  queryDesktopDependencyStatus,
  startDesktopService,
  controlDesktopService,
}
```

- [ ] **Step 4: Run sound effect model tests**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/soundEffectModel.test.ts src/components/DesktopServiceRuntime/desktopServiceWorkflow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace package.json
git commit -m "feat: add sound effect workflow model"
```

---

### Task 6: Collect Generated Sounds Into `音效素材` And Link Sprites

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/soundEffectPersonalSpaceCollector.test.ts`
- Create: `src/components/VoiceDeploymentWorkspace/soundEffectPersonalSpaceCollector.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/VoiceCollectLinkModal.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `SoundEffectRecord`
- Consumes: `createSoundAssetFromRecord`
- Consumes: `linkSoundAssetToSprite`
- Produces: `SoundCollectLinkTarget = 'sprite'`
- Produces: `collectSoundEffectRecordToPersonalSpace(record, link?, options?): Promise<PersonalSpaceState>`

- [ ] **Step 1: Write failing collector tests**

Create `src/components/VoiceDeploymentWorkspace/soundEffectPersonalSpaceCollector.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { collectSoundEffectRecordToPersonalSpace } from './soundEffectPersonalSpaceCollector'
import { defaultPersonalSpaceState, writeProjectSpaceState } from '../PersonalSpaceWorkspace/personalSpaceModel'

test('collects sound effect records into sound assets and links selected sprite', async () => {
  writeProjectSpaceState('default-project', {
    ...defaultPersonalSpaceState,
    assets: [{
      id: 'sprite-1',
      kind: 'sprite',
      assetSubtype: 'character_sprite',
      name: 'Hero',
      groupName: '默认分组',
      resourcePaths: ['sprite.png', 'index.json'],
      createdAt: '2026-07-04T00:00:00.000Z',
      linkedCharacterIds: [],
      linkedStoryboardIds: [],
      linkedVoiceAssetIds: [],
      linkedSpriteAssetIds: [],
      storageResourcePaths: [],
    }],
  })

  const blob = new Blob(['sound'], { type: 'audio/wav' })
  const state = await collectSoundEffectRecordToPersonalSpace({
    id: 'record-1',
    name: 'Slash',
    createdAt: '2026-07-04T00:00:00.000Z',
    audioUrl: 'http://127.0.0.1:8818/outputs/slash.wav',
    audioPath: 'D:\\outputs\\slash.wav',
    prompt: 'sharp slash',
    durationSeconds: 2,
    seed: 1,
    model: 'small-sfx',
  }, { target: 'sprite', targetId: 'sprite-1' }, {
    readBlob: async () => blob,
    directoryHandleStore: null,
  })

  const sound = state.assets.find((asset) => asset.kind === 'sound')
  assert.equal(sound?.name, 'Slash')
  assert.equal(sound?.assetSubtype, 'sound_effect')
  assert.deepEqual(sound?.linkedSpriteAssetIds, ['sprite-1'])
})
```

If `writeProjectSpaceState` requires active-project helpers in this test context, follow the existing `voicePersonalSpaceCollector.test.ts` setup and reuse its memory directory handle helper.

- [ ] **Step 2: Run collector test to verify it fails**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/soundEffectPersonalSpaceCollector.test.ts`

Expected: FAIL because `soundEffectPersonalSpaceCollector.ts` does not exist.

- [ ] **Step 3: Implement collector**

Create `soundEffectPersonalSpaceCollector.ts` with this shape:

```ts
import type { SoundEffectRecord } from './soundEffectModel'
import {
  collectPersonalSpaceAsset,
  createSoundAssetFromRecord,
  linkSoundAssetToSprite,
  type PersonalSpaceState,
} from '../PersonalSpaceWorkspace/personalSpaceModel'
import { readCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/projectSpaceState'
import { persistCurrentProjectSpaceState } from '../PersonalSpaceWorkspace/currentProjectSpacePersistence'
import {
  getPersonalSpaceDirectoryHandle,
  loadPersistedPersonalSpaceDirectoryHandle,
  setPersonalSpaceDirectoryHandle,
  writeAssetResourcesToDirectory,
  type PersonalSpaceDirectoryHandleStore,
} from '../PersonalSpaceWorkspace/personalSpaceFileStorage'
import { personalSpaceDirectoryRequiredMessage } from '../PersonalSpaceWorkspace/usePersonalSpaceDirectoryAuthorization'

export type SoundCollectLinkTarget = 'sprite'

export interface SoundCollectLink {
  target: SoundCollectLinkTarget
  targetId: string
}

export interface CollectSoundEffectRecordOptions {
  directoryHandleStore?: PersonalSpaceDirectoryHandleStore | null
  readBlob?: (record: SoundEffectRecord) => Promise<Blob>
  onSyncError?: (error: unknown) => void
}

async function defaultReadBlob(record: SoundEffectRecord) {
  const source = record.audioUrl || record.audioPath
  if (!source) throw new Error('音效记录没有可读取的音频资源')
  const response = await fetch(source)
  if (!response.ok) throw new Error(`读取音效资源失败：${response.status}`)
  return response.blob()
}

export async function collectSoundEffectRecordToPersonalSpace(
  record: SoundEffectRecord,
  link?: SoundCollectLink,
  options?: CollectSoundEffectRecordOptions,
): Promise<PersonalSpaceState> {
  let space = readCurrentProjectSpaceState()
  const baseAsset = createSoundAssetFromRecord({
    ...record,
    sourceKey: `sound-record:${record.id}`,
  })
  const current = getPersonalSpaceDirectoryHandle()
  const persisted = current ? null : await loadPersistedPersonalSpaceDirectoryHandle(options?.directoryHandleStore)
  const directoryHandle = current ?? persisted
  if (persisted) setPersonalSpaceDirectoryHandle(persisted)
  if (!directoryHandle) throw new Error(personalSpaceDirectoryRequiredMessage)
  if (!space.settings.storageDirectory) {
    space = { ...space, settings: { ...space.settings, storageDirectory: directoryHandle.name } }
  }
  const blob = await (options?.readBlob ?? defaultReadBlob)(record)
  const asset = await writeAssetResourcesToDirectory(directoryHandle, {
    ...baseAsset,
    resourcePaths: [URL.createObjectURL(blob)],
  }, [{ name: soundResourceFileName(record), data: blob }])

  let nextSpace = collectPersonalSpaceAsset(space, asset)
  if (link?.target === 'sprite') nextSpace = linkSoundAssetToSprite(nextSpace, asset.id, link.targetId)
  const persistence = await persistCurrentProjectSpaceState(nextSpace, { getDirectoryHandle: () => directoryHandle })
  if (persistence.syncError) options?.onSyncError?.(persistence.syncError)
  return nextSpace
}
```

Add `soundResourceFileName(record)` in the same file. It should prefer the filename from `audioPath`, then `audioUrl`, then `sound.wav`.

- [ ] **Step 4: Run collector tests**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/soundEffectPersonalSpaceCollector.test.ts src/components/VoiceDeploymentWorkspace/voicePersonalSpaceCollector.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace package.json
git commit -m "feat: collect sound effects to project space"
```

---

### Task 7: Add `生成音效` Tabs And Panels

**Files:**
- Create: `src/voiceDeploymentSoundStructure.test.ts`
- Create: `src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/SoundEffectGenerationPanel.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx`
- Create: `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.css`
- Modify: `src/components/VoiceDeploymentWorkspace/index.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css`
- Modify: `src/components/VoiceDeploymentWorkspace/useVoiceDeploymentWorkspace.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `useSoundEffectWorkspace()`
- Produces: a Tabs UI with `生成配音` and `生成音效`
- Produces: model selection, install/status/service buttons, prompt generation controls, sound history, collect actions

- [ ] **Step 1: Write failing structure test**

Create `src/voiceDeploymentSoundStructure.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const files = {
  index: 'src/components/VoiceDeploymentWorkspace/index.tsx',
  tabs: 'src/components/VoiceDeploymentWorkspace/VoiceWorkspaceTabs.tsx',
  setup: 'src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx',
  generator: 'src/components/VoiceDeploymentWorkspace/SoundEffectGenerationPanel.tsx',
  library: 'src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx',
  cssHub: 'src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspace.css',
}

function read(path: string) {
  return readFileSync(path, 'utf8')
}

test('voice deployment workspace renders voice and sound effect tabs through focused components', () => {
  assert.match(read(files.index), /VoiceWorkspaceTabs/)
  assert.match(read(files.tabs), /生成配音/)
  assert.match(read(files.tabs), /生成音效/)
  assert.match(read(files.tabs), /SoundEffectSetupPanel/)
  assert.match(read(files.tabs), /SoundEffectGenerationPanel/)
  assert.match(read(files.tabs), /SoundEffectLibraryPanel/)
})

test('sound effect panels expose model install generation and collection controls', () => {
  assert.match(read(files.setup), /small-sfx/)
  assert.match(read(files.setup), /small-music/)
  assert.match(read(files.setup), /medium/)
  assert.match(read(files.setup), /安装依赖/)
  assert.match(read(files.setup), /启动服务/)
  assert.match(read(files.generator), /提示词/)
  assert.match(read(files.generator), /生成音效/)
  assert.match(read(files.library), /收藏到音效素材/)
  assert.match(read(files.library), /关联精灵图/)
})

test('sound effect CSS stays in a focused module imported by the workspace CSS hub', () => {
  assert.match(read(files.cssHub), /voiceDeployment\.sound\.css/)
})
```

- [ ] **Step 2: Run structure test to verify it fails**

Run: `npx tsx --test src/voiceDeploymentSoundStructure.test.ts`

Expected: FAIL because tab and panel files do not exist.

- [ ] **Step 3: Implement tab composition**

Create `VoiceWorkspaceTabs.tsx`:

```tsx
import { Tabs } from 'antd'
import { SoundEffectGenerationPanel } from './SoundEffectGenerationPanel'
import { SoundEffectLibraryPanel } from './SoundEffectLibraryPanel'
import { SoundEffectSetupPanel } from './SoundEffectSetupPanel'

interface VoiceWorkspaceTabsProps {
  voiceContent: React.ReactNode
  soundWorkspace: ReturnType<typeof import('./useSoundEffectWorkspace').useSoundEffectWorkspace>
}

export function VoiceWorkspaceTabs({ voiceContent, soundWorkspace }: VoiceWorkspaceTabsProps) {
  return (
    <Tabs
      className="voice-workspace-tabs"
      items={[
        { key: 'voice', label: '生成配音', children: voiceContent },
        {
          key: 'sound',
          label: '生成音效',
          children: (
            <div className="sound-workbench">
              <SoundEffectSetupPanel {...soundWorkspace.setupPanelProps} />
              <div className="sound-studio">
                <SoundEffectGenerationPanel {...soundWorkspace.generationPanelProps} />
                <SoundEffectLibraryPanel {...soundWorkspace.libraryPanelProps} />
              </div>
            </div>
          ),
        },
      ]}
    />
  )
}
```

Add panels using Ant Design `Button`, `Input`, `InputNumber`, `Segmented`, `Alert`, `Select`, and `List`. Keep the copy compact:

- `SoundEffectSetupPanel`: model segmented control, model note, install/status/start/restart/stop buttons.
- `SoundEffectGenerationPanel`: prompt textarea, duration input, seed input, output name input, generate button.
- `SoundEffectLibraryPanel`: audio element, rename/delete buttons, `收藏到音效素材`, `关联精灵图`.

Modify `index.tsx` so it still renders `VoiceWorkspaceHeader` and existing voice content, but passes that content into `VoiceWorkspaceTabs`.

- [ ] **Step 4: Run structure test and typecheck**

Run:

```powershell
npx tsx --test src/voiceDeploymentSoundStructure.test.ts
npm run build
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace src/voiceDeploymentSoundStructure.test.ts package.json
git commit -m "feat: add sound effects tab UI"
```

---

### Task 8: Wire Sprite Link Options And Project-Space Sound Section

**Files:**
- Modify: `src/components/VoiceDeploymentWorkspace/useSoundEffectWorkspace.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/SoundEffectLibraryPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalMaterialsPanel.tsx`
- Modify: `src/components/PersonalSpaceWorkspace/PersonalResourceAssetRecord.tsx`
- Modify: `src/personalSpaceResourceStructure.test.ts`
- Modify: `src/components/PersonalSpaceWorkspace/personalSpaceResourceActions.test.ts`

**Interfaces:**
- Consumes: `createPersonalSpaceDerivedState(space).spriteAssets`
- Produces: sound library sprite select options from current project sprite assets
- Produces: visible `音效素材` section in project-space materials/resources

- [ ] **Step 1: Write failing resource structure assertions**

Update `src/personalSpaceResourceStructure.test.ts` with assertions:

```ts
test('personal space resource sections include sound assets as a first-class section', () => {
  const derivedSource = readFileSync('src/components/PersonalSpaceWorkspace/personalSpaceDerivedState.ts', 'utf8')
  const materialsSource = readFileSync('src/components/PersonalSpaceWorkspace/PersonalMaterialsPanel.tsx', 'utf8')

  assert.match(derivedSource, /soundAssets/)
  assert.match(derivedSource, /title:\s*'音效素材'/)
  assert.match(derivedSource, /kind:\s*'sound'/)
  assert.match(materialsSource, /resourceSections/)
})
```

- [ ] **Step 2: Run structure test to verify it fails or catches incomplete UI**

Run: `npx tsx --test src/personalSpaceResourceStructure.test.ts`

Expected before UI/resource updates: FAIL if `音效素材` is missing from derived resource sections.

- [ ] **Step 3: Implement sprite link options in sound workspace**

In `useSoundEffectWorkspace.ts`, derive sprite link options from current project state:

```ts
const spriteLinkOptions = useMemo(() => (
  currentProjectSpace.assets
    .filter((asset) => asset.kind === 'sprite')
    .map((asset) => ({ label: asset.name, value: asset.id }))
), [currentProjectSpace.assets])
```

Expose:

```ts
libraryPanelProps: {
  records,
  spriteLinkOptions,
  onCollectRecord,
  onCollectAndLinkSprite,
  onRenameRecord,
  onDeleteRecord,
  onClearRecords,
}
```

In `SoundEffectLibraryPanel.tsx`, render `Select` only when the user clicks `关联精灵图`, then call `onCollectAndLinkSprite(record, spriteId)`.

- [ ] **Step 4: Run sound and resource tests**

Run:

```powershell
npx tsx --test src/voiceDeploymentSoundStructure.test.ts src/personalSpaceResourceStructure.test.ts src/components/PersonalSpaceWorkspace/personalSpaceSoundAssetState.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/VoiceDeploymentWorkspace src/components/PersonalSpaceWorkspace src/personalSpaceResourceStructure.test.ts
git commit -m "feat: link sound effects to sprites"
```

---

### Task 9: Full Verification And Browser QA

**Files:**
- Modify only files required by failures found in this task.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: verified build and UI behavior.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS. If a test fails, write a focused failing test for the bug before changing production code, then re-run the focused test and `npm test`.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Run diff check**

Run: `git diff --check`

Expected: no output.

- [ ] **Step 4: Start dev server for UI QA**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a localhost URL. If `npm run dev` is not defined, use `npx vite --host 127.0.0.1`.

- [ ] **Step 5: Browser-check the affected UI**

Use the in-app browser at the Vite URL. Verify:

- `配音工作台` opens.
- Tabs show `生成配音` and `生成音效`.
- Existing `生成配音` content still renders.
- `生成音效` shows model selector, install/status/service buttons, prompt form, and empty history.
- At desktop width, service panel and generation/history area do not overlap.
- At a narrow viewport, controls wrap without text overflow.
- Web runtime disables desktop install/service buttons with a clear warning.

- [ ] **Step 6: Stop the dev server**

Stop the Vite process cleanly from the terminal session.

- [ ] **Step 7: Final status**

Run: `git status --short --branch`

Expected: branch is clean after all intended commits, or only intentional uncommitted release notes remain.
