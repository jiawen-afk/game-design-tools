# Audio Editor Multi-Segment Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build multi-segment waveform editing, ordered pending playback, local export, history generation, and source-specific project-space collection for the voice workbench audio editor.

**Architecture:** Keep UI rendering in `AudioClipEditorPanel.tsx`, state/workflow in `useAudioClipEditorWorkspace.ts`, pure editing rules in a new focused model, audio slicing/concatenation in encoding/service files, and filesystem export in the desktop audio edit bridge. The waveform remains on `wavesurfer.js` Regions, with our model enforcing no-overlap and pending-list rules.

**Tech Stack:** React 19, Ant Design 6, wavesurfer.js 7 Regions plugin, TypeScript, Electron IPC, Node test runner through `tsx --test`.

## Global Constraints

- Use existing `wavesurfer.js` Regions plugin.
- Remove `设为开始` and `设为结束`.
- Every output action uses the ordered pending list.
- Voice source actions: `生成到历史`, `导出到本地`, `收藏到项目空间-配音`.
- Sound effect source actions: `生成到历史`, `导出到本地`, `收藏到项目空间-音效`.
- Uploaded source actions: `导出到本地`, `收藏到项目空间-配音`, `收藏到项目空间-音效`.
- Uploaded sources must not show `生成到历史`.
- Export format is WAV only.
- No destructive editing of the source file.
- Follow TDD: write a failing test, watch it fail, implement, watch it pass.

---

### Task 1: Segment Region Model

**Files:**
- Create: `src/components/VoiceDeploymentWorkspace/audioSegmentModel.ts`
- Create: `src/components/VoiceDeploymentWorkspace/audioSegmentModel.test.ts`

**Interfaces:**
- Produces:
  - `AudioSegmentRegion`
  - `AudioPendingSegment`
  - `createAudioSegmentRegion(input): AudioSegmentRegion | null`
  - `updateAudioSegmentRegion(regions, regionId, range, durationSeconds): AudioSegmentRegion[]`
  - `deleteAudioSegmentRegion(regions, regionId): AudioSegmentRegion[]`
  - `addPendingSegment(pending, regions, regionId): AudioPendingSegment[]`
  - `removePendingSegment(pending, regionId): AudioPendingSegment[]`
  - `reorderPendingSegments(pending, fromIndex, toIndex): AudioPendingSegment[]`
  - `syncPendingSegmentsWithRegions(pending, regions): AudioPendingSegment[]`

- [ ] **Step 1: Write failing model tests**

Add tests covering default region creation, overlap clamping, pending de-duplication, pending sync, and reorder:

```typescript
import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'

import {
  addPendingSegment,
  createAudioSegmentRegion,
  deleteAudioSegmentRegion,
  reorderPendingSegments,
  syncPendingSegmentsWithRegions,
  updateAudioSegmentRegion,
} from './audioSegmentModel'

test('creates a selected segment inside the nearest available gap', () => {
  const region = createAudioSegmentRegion({
    id: 'segment-1',
    atSeconds: 1,
    durationSeconds: 5,
    existingRegions: [],
  })
  deepEqual(region, {
    id: 'segment-1',
    startSeconds: 1,
    endSeconds: 4,
  })
})

test('clamps a new segment so it does not overlap the next region', () => {
  const region = createAudioSegmentRegion({
    id: 'segment-2',
    atSeconds: 1,
    durationSeconds: 5,
    existingRegions: [{ id: 'existing', startSeconds: 2, endSeconds: 3 }],
  })
  deepEqual(region, {
    id: 'segment-2',
    startSeconds: 1,
    endSeconds: 2,
  })
})

test('moves a segment only inside its non-overlapping neighbors', () => {
  const regions = updateAudioSegmentRegion([
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 2, endSeconds: 3 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ], 'b', { startSeconds: 0.5, endSeconds: 2.5 }, 6)

  deepEqual(regions, [
    { id: 'a', startSeconds: 0, endSeconds: 1 },
    { id: 'b', startSeconds: 1, endSeconds: 2.5 },
    { id: 'c', startSeconds: 4, endSeconds: 5 },
  ])
})

test('does not add the same region to pending twice', () => {
  const regions = [{ id: 'a', startSeconds: 0, endSeconds: 1 }]
  const first = addPendingSegment([], regions, 'a')
  const second = addPendingSegment(first, regions, 'a')

  deepEqual(second, [{ regionId: 'a', startSeconds: 0, endSeconds: 1 }])
})

test('keeps pending items synced with changed and deleted regions', () => {
  const pending = [
    { regionId: 'a', startSeconds: 0, endSeconds: 1 },
    { regionId: 'b', startSeconds: 2, endSeconds: 3 },
  ]
  const next = syncPendingSegmentsWithRegions(pending, [
    { id: 'b', startSeconds: 2.5, endSeconds: 3.5 },
  ])

  deepEqual(next, [{ regionId: 'b', startSeconds: 2.5, endSeconds: 3.5 }])
})

test('reorders pending segments by drag indexes', () => {
  const pending = [
    { regionId: 'a', startSeconds: 0, endSeconds: 1 },
    { regionId: 'b', startSeconds: 1, endSeconds: 2 },
    { regionId: 'c', startSeconds: 2, endSeconds: 3 },
  ]

  deepEqual(reorderPendingSegments(pending, 0, 2).map((item) => item.regionId), ['b', 'c', 'a'])
  equal(deleteAudioSegmentRegion([{ id: 'a', startSeconds: 0, endSeconds: 1 }], 'a').length, 0)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/audioSegmentModel.test.ts`

Expected: FAIL because `audioSegmentModel.ts` does not exist.

- [ ] **Step 3: Implement the model**

Create the model with rounded second normalization, 3-second default region duration, minimum duration from `audioClipModel.ts`, neighbor-bound clamping, pending sync, and reorder helpers.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/audioSegmentModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/components/VoiceDeploymentWorkspace/audioSegmentModel.ts src/components/VoiceDeploymentWorkspace/audioSegmentModel.test.ts
git commit -m "Add audio segment editing model"
```

---

### Task 2: Multi-Range Encoding And Services

**Files:**
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipEncoding.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/audioClipService.ts`
- Modify: `src/desktopAudioEditApi.ts`
- Modify: `src/desktopApi.ts`
- Modify: `electron/audioEditIpcHandlers.cjs`
- Create or modify tests:
  - `src/components/VoiceDeploymentWorkspace/audioClipService.test.ts`
  - `src/desktopAudioEditIpcHandlers.test.ts`

**Interfaces:**
- Consumes: `AudioPendingSegment[]` with `{ regionId, startSeconds, endSeconds }`.
- Produces:
  - `concatPcmAudioRanges(pcm, ranges): PcmAudioData`
  - `renderAudioClipWav(input): Promise<Blob>`
  - `saveAudioClip(input: { ranges: AudioClipRange[] })`
  - `exportAudioClip(input: { ranges: AudioClipRange[] })`
  - `saveEditedAudioAs(options)` desktop bridge method.

- [ ] **Step 1: Write failing encoding/service tests**

Add tests that prove multiple ranges concatenate in the requested order and uploaded audio does not generate history:

```typescript
import { deepEqual, equal, ok } from 'node:assert/strict'
import { test } from 'node:test'

import { concatPcmAudioRanges, type PcmAudioData } from './audioClipEncoding'
import { saveAudioClip } from './audioClipService'

function pcm(samples: number[]): PcmAudioData {
  return { sampleRate: 10, numberOfChannels: 1, channelData: [new Float32Array(samples)] }
}

test('concatenates pcm ranges in pending-list order', () => {
  const result = concatPcmAudioRanges(pcm([0, 1, 2, 3, 4, 5]), [
    { startSeconds: 0.3, endSeconds: 0.5 },
    { startSeconds: 0.1, endSeconds: 0.2 },
  ])
  deepEqual(Array.from(result.channelData[0]), [3, 4, 1])
  equal(result.sampleRate, 10)
})

test('saving multiple ranges from a sound effect creates one sound effect record with combined duration', async () => {
  const result = await saveAudioClip({
    source: {
      sourceKind: 'sound-effect',
      record: {
        id: 'sound-1',
        name: 'Hit',
        createdAt: '2026-07-07T00:00:00.000Z',
        audioUrl: 'file:///sound.wav',
        audioPath: null,
        prompt: 'hit',
        durationSeconds: 6,
        seed: 1,
        model: 'small-sfx',
      },
    },
    ranges: [
      { startSeconds: 0.3, endSeconds: 0.5 },
      { startSeconds: 0.1, endSeconds: 0.2 },
    ],
    name: 'Hit edit',
    desktopApi: {
      saveEditedAudio: async () => ({ fileName: 'out.wav', audioUrl: 'file:///out.wav', audioPath: 'out.wav' }),
    },
    readSourcePcm: async () => pcm([0, 1, 2, 3, 4, 5]),
    now: () => '2026-07-07T00:00:00.000Z',
    createId: () => 'clip-1',
  })

  equal(result.sourceKind, 'sound-effect')
  if (result.sourceKind === 'sound-effect') {
    equal(result.record.durationSeconds, 0.3)
    equal(result.record.name, 'Hit edit')
  }
})

test('uploaded audio cannot be generated into history', async () => {
  await saveAudioClip({
    source: {
      sourceKind: 'imported-audio',
      record: { id: 'blob:audio', name: 'Upload', audioUrl: 'blob:audio', audioPath: null },
    },
    ranges: [{ startSeconds: 0, endSeconds: 1 }],
    name: 'Upload edit',
    desktopApi: {
      saveEditedAudio: async () => ({ fileName: 'out.wav', audioUrl: 'file:///out.wav', audioPath: 'out.wav' }),
    },
    readSourcePcm: async () => pcm([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
  }).then(
    () => { throw new Error('expected imported save to fail') },
    (error) => ok(error instanceof Error && error.message.includes('导入音频不能生成到历史')),
  )
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipService.test.ts`

Expected: FAIL because `concatPcmAudioRanges` and `ranges` support do not exist.

- [ ] **Step 3: Implement encoding and service changes**

Add `concatPcmAudioRanges`, let `saveAudioClip` accept `ranges`, reject imported source history generation, and add an `exportAudioClip` service that calls `desktopApi.saveEditedAudioAs`.

- [ ] **Step 4: Add desktop IPC export tests**

Test that `audio-edit:export-as` returns `null` when dialog is canceled and writes the chosen WAV path when selected.

- [ ] **Step 5: Implement desktop bridge**

Add `saveEditedAudioAs` to `DesktopAudioEditApi`, wire `desktopApi.ts` to `window.desktopAPI.audioEdit.saveAs`, and add Electron handler `audio-edit:export-as` with `dialog.showSaveDialog`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipService.test.ts
npx tsx --test src/desktopAudioEditIpcHandlers.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/components/VoiceDeploymentWorkspace/audioClipEncoding.ts src/components/VoiceDeploymentWorkspace/audioClipService.ts src/components/VoiceDeploymentWorkspace/audioClipService.test.ts src/desktopAudioEditApi.ts src/desktopApi.ts electron/audioEditIpcHandlers.cjs src/desktopAudioEditIpcHandlers.test.ts
git commit -m "Add multi-range audio rendering and export"
```

---

### Task 3: Hook Workflow For Regions, Pending Playback, And Actions

**Files:**
- Modify: `src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts`
- Modify: `src/components/VoiceDeploymentWorkspace/index.tsx`
- Modify or create tests:
  - `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`
  - `src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspaceSideEffectsStructure.test.ts`

**Interfaces:**
- Consumes:
  - `AudioSegmentRegion[]`
  - `AudioPendingSegment[]`
  - `saveAudioClip`, `exportAudioClip`
  - `collectVoiceRecordToPersonalSpace`, `collectSoundEffectRecordToPersonalSpace`
- Produces panel props:
  - `regions`, `selectedRegionId`, `pendingSegments`
  - `canGenerateHistory`, `canExport`, `canCollectVoice`, `canCollectSound`
  - `onAddRegionAt`, `onSelectRegion`, `onUpdateRegion`, `onDeleteRegion`
  - `onAddSelectedRegionToPending`, `onRemovePendingSegment`, `onReorderPendingSegment`
  - `onGenerateHistory`, `onExportClip`, `onCollectVoiceClip`, `onCollectSoundClip`

- [ ] **Step 1: Write failing structure tests**

Assert the hook imports the segment model, audio clip service export API, and project-space collectors, and that the workspace passes current project-space action dependencies.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

Expected: FAIL because the new props/workflow names do not exist.

- [ ] **Step 3: Implement hook state and workflows**

Replace the single `range` state with `regions`, `selectedRegionId`, and `pendingSegments`. Keep `currentTimeSeconds`, `outputName`, `saving`, and `error`. Generate history only for voice and sound-effect sources. Export all source types. Collect voice/sound according to source-action rules.

- [ ] **Step 4: Run focused structure tests**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts src/components/VoiceDeploymentWorkspace/index.tsx src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts src/components/VoiceDeploymentWorkspace/voiceDeploymentWorkspaceSideEffectsStructure.test.ts
git commit -m "Wire audio editor multi-segment workflow"
```

---

### Task 4: Audio Editor Panel UI And Styling

**Files:**
- Modify: `src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css`
- Modify: `src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

**Interfaces:**
- Consumes panel props from Task 3.
- Produces UI for right-click add/delete, draggable/resizable regions, pending list reorder, pending playback, loop playback, source-specific output buttons.

- [ ] **Step 1: Write failing UI structure tests**

Assert:

```typescript
doesNotMatch(sourceText, /设为开始/)
doesNotMatch(sourceText, /设为结束/)
match(sourceText, /添加选中区块到待处理列表/)
match(sourceText, /导出到本地/)
match(sourceText, /收藏到项目空间-配音/)
match(sourceText, /收藏到项目空间-音效/)
match(sourceText, /onContextMenu/)
match(sourceText, /draggable/)
```

- [ ] **Step 2: Run UI structure test and verify RED**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

Expected: FAIL while old controls remain and pending-list UI is absent.

- [ ] **Step 3: Implement panel**

Use Ant Design `Dropdown` or a controlled fixed-position context menu for waveform add/delete actions. Store `Region` instances in a `Map<string, Region>`, update plugin regions from `regions` prop, call hook callbacks on region click/update, and use HTML drag events for pending-list reorder.

- [ ] **Step 4: Implement compact styling**

Keep dense workbench layout: waveform full width, controls in wrapped rows, pending list as compact rows, buttons aligned without nested cards.

- [ ] **Step 5: Run UI structure test and verify GREEN**

Run: `npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx src/components/VoiceDeploymentWorkspace/voiceDeployment.audioEditor.css src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
git commit -m "Build audio editor multi-segment UI"
```

---

### Task 5: Verification And Browser QA

**Files:**
- Modify only if verification finds issues.

**Interfaces:**
- Consumes all previous task output.
- Produces verified working feature.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npx tsx --test src/components/VoiceDeploymentWorkspace/audioSegmentModel.test.ts
npx tsx --test src/components/VoiceDeploymentWorkspace/audioClipService.test.ts
npx tsx --test src/components/VoiceDeploymentWorkspace/voiceDeploymentAudioEditorStructure.test.ts
npx tsx --test src/desktopAudioEditIpcHandlers.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run release test gate**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Check whitespace**

Run: `git diff --check`

Expected: no output.

- [ ] **Step 5: Browser QA**

Run the Vite app, open the voice workbench audio editor, and verify:

- Empty editor still shows audio upload/drop.
- Uploaded audio shows no `生成到历史`.
- Uploaded audio shows `导出到本地`, `收藏到项目空间-配音`, and `收藏到项目空间-音效`.
- Voice source shows only voice collection.
- Sound effect source shows only sound collection.
- Old start/end buttons are gone.
- Pending-list rows fit without overflowing desktop and mobile widths.

- [ ] **Step 6: Final commit if needed**

Run:

```powershell
git status --short
git add <changed-files>
git commit -m "Verify audio editor multi-segment export"
```

Only commit if verification required additional changes.

---

## Self-Review

- Spec coverage: waveform multi-regions, no-overlap rules, pending list, pending playback, history generation, local export, project-space collection, source-specific action visibility, and verification are assigned to Tasks 1-5.
- Completeness scan: task steps contain concrete file paths, commands, and expected outcomes.
- Type consistency: model outputs feed hook state, hook panel props feed the panel, service methods consume pending ranges, and desktop export uses the `saveEditedAudioAs` method named in Task 2.
