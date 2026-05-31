# MultiFrameSpriteWorkspace Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `MultiFrameSpriteWorkspace` state and side effects into focused local hooks while keeping the user workflow unchanged.

**Architecture:** Keep React as the state runtime and avoid new dependencies. `index.tsx` becomes a composition layer, while frame state, playback, export, video, layout, and matte pipelines move into local hooks that exchange data through explicit callbacks.

**Tech Stack:** React 19, TypeScript, Vite, Ant Design, node:test, JSZip.

---

## File Structure

- Create: `src/components/MultiFrameSpriteWorkspace/useFrameWorkspaceState.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/usePlaybackWorkspace.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/index.tsx`
- Modify: `src/components/MultiFrameSpriteWorkspace/model.test.ts`
- Keep: existing panel components and model modules.

## Task 1: Structural Test

**Files:**
- Modify: `src/components/MultiFrameSpriteWorkspace/model.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test that reads `index.tsx` and asserts it imports the new local hooks and stays below a stricter line-count threshold.

```typescript
test('workspace entry delegates stateful workflows to focused hooks', () => {
  const source = readFileSync('src/components/MultiFrameSpriteWorkspace/index.tsx', 'utf8')
  const lineCount = source.split(/\r?\n/).length

  assert.match(source, /from '\.\/useFrameWorkspaceState'/)
  assert.match(source, /from '\.\/usePlaybackWorkspace'/)
  assert.match(source, /from '\.\/useSpriteExport'/)
  assert.match(source, /from '\.\/useVideoWorkspace'/)
  assert.match(source, /from '\.\/useLayoutWorkspace'/)
  assert.match(source, /from '\.\/useMattePipeline'/)
  assert.ok(lineCount < 1500, `expected workspace entry to stay below 1500 lines, got ${lineCount}`)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because the new hook imports do not exist in `index.tsx`.

## Task 2: Frame State Hook

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/useFrameWorkspaceState.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/index.tsx`

- [ ] **Step 1: Move frame collection state**

Move `frames`, `framesRef`, `activeId`, `selectedFrameIds`, `selectionAnchorId`, `dragOrderId`, `detailPreview`, and `detailZoom` into `useFrameWorkspaceState`.

- [ ] **Step 2: Preserve collection operations**

Expose `setFrames`, `updateFrame`, `appendFrames`, `removeFrame`, `removeAllFrames`, `reorder`, `toggleFrameHidden`, `openDetailPreview`, and selection setters.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: the structural test may still fail on missing hooks, but existing behavior tests must stay green.

## Task 3: Playback Hook

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/usePlaybackWorkspace.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/index.tsx`

- [ ] **Step 1: Move playback state and derived data**

Move `fps`, `playbackMode`, `playing`, `playIndex`, `playDirection`, `playbackFrameIds`, visible frame derivation, playback frame derivation, and preview frame selection.

- [ ] **Step 2: Move playback actions**

Move `selectFrameTag`, `startAllPlayback`, `startSelectedPlayback`, `batchHideSelected`, row drag handlers, hide toggling, and playback interval effect.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: existing playback model tests pass.

## Task 4: Export Hook

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/useSpriteExport.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/index.tsx`

- [ ] **Step 1: Move export state**

Move `columns`, `exporting`, and `exportAll`.

- [ ] **Step 2: Keep browser side effects local**

Keep canvas creation, JSZip generation, download link creation, and URL revoke inside the hook.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: sprite index and auto-column tests pass.

## Task 5: Video Hook

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/useVideoWorkspace.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/index.tsx`

- [ ] **Step 1: Move video draft state and refs**

Move video draft, clip range, fps, playback flags, loading flags, extracted frames, crop state, preview refs, and source URL ref.

- [ ] **Step 2: Move video actions**

Move upload, metadata, preview error, time update, clip playback, extraction, crop drag, and confirm frames.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: video model and crop projection tests pass.

## Task 6: Layout and Matte Hooks

**Files:**
- Create: `src/components/MultiFrameSpriteWorkspace/useLayoutWorkspace.ts`
- Create: `src/components/MultiFrameSpriteWorkspace/useMattePipeline.ts`
- Modify: `src/components/MultiFrameSpriteWorkspace/index.tsx`

- [ ] **Step 1: Move layout state**

Move canvas defaults, active ratio controls, drag state, guide lines, canvas stage ref, keyboard movement, pointer drag, and layout default modal state.

- [ ] **Step 2: Move matte pipeline**

Move matte defaults, matte modal state, matte timers, compose timers, `scheduleMatte`, `scheduleCompose`, color sampling, and matte parameter updates.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: all model tests pass.

## Task 7: Final Verification

**Files:**
- Modify: all touched files as needed.

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: all node:test tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build complete with exit code 0.

- [ ] **Step 3: Inspect diff**

Run: `git diff -- src/components/MultiFrameSpriteWorkspace docs/superpowers`

Expected: diff only contains the planned decoupling changes.
