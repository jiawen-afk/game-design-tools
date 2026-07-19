# Video Queue Lifecycle Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pause a drained video queue automatically and select the first video from every new import batch so retained completed records cannot trigger automatic processing or lock the new video's settings.

**Architecture:** Keep terminal-state calculation in `videoProcessingQueueModel.ts` as a pure predicate and wire the resulting lifecycle transition in `useVideoProcessingQueue`. Preserve all terminal job records while changing only the paused state and the selected job id.

**Tech Stack:** TypeScript, React hooks, Node test runner, `tsx --test`.

## Global Constraints

- Keep completed, failed, and canceled video records visible.
- A new video batch starts only after an explicit “处理队列” action.
- Select the first video in each newly imported batch.
- Preserve existing sequential probing, retry, removal, output-directory, and “应用到全部待处理” behavior.
- Develop directly on local `master`; do not push.
- Use TDD before every production behavior change.

---

## File Structure

- `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.ts`: pure drained-batch pause predicate.
- `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts`: terminal, queued, active, already-paused, and empty queue cases.
- `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`: automatic pause effect and first-new-import selection.
- `src/videoProcessingStructure.test.ts`: hook wiring and import-selection ordering guards.

---

### Task 1: Drained Video Queue Predicate

**Files:**
- Modify: `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.ts`
- Modify: `src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts`

**Interfaces:**
- Consumes: `VideoProcessingJob[]`, `paused: boolean`, `activeJobId: string | null`, and `runningJobId: string | null`.
- Produces: `shouldAutoPauseVideoQueue(jobs, paused, activeJobId, runningJobId): boolean`.

- [ ] **Step 1: Write failing predicate tests**

Import `shouldAutoPauseVideoQueue` and add focused tests using the existing `job()` fixture:

```typescript
test('auto pauses a running video queue after every job becomes terminal', () => {
  for (const phase of ['completed', 'failed', 'canceled'] as const) {
    assert.equal(shouldAutoPauseVideoQueue([videoJob('a', phase)], false, null, null), true)
  }
})

test('does not auto pause while video queue work remains active', () => {
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'queued')], false, null, null), false)
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'completed')], false, 'a', null), false)
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'completed')], false, null, 'a'), false)
})

test('does not auto pause an empty or already paused video queue', () => {
  assert.equal(shouldAutoPauseVideoQueue([], false, null, null), false)
  assert.equal(shouldAutoPauseVideoQueue([videoJob('a', 'completed')], true, null, null), false)
})
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx tsx --test src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts
```

Expected: FAIL because `shouldAutoPauseVideoQueue` is not exported.

- [ ] **Step 3: Implement the minimal predicate**

Add to `videoProcessingQueueModel.ts`:

```typescript
export function shouldAutoPauseVideoQueue(
  jobs: VideoProcessingJob[],
  paused: boolean,
  activeJobId: string | null,
  runningJobId: string | null,
) {
  return jobs.length > 0
    && !paused
    && !activeJobId
    && !runningJobId
    && !hasPendingOrActiveVideoJobs(jobs)
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run the command from Step 2. Expected: all queue-model tests pass.

- [ ] **Step 5: Commit the predicate**

```powershell
git add src/components/VideoProcessingWorkspace/videoProcessingQueueModel.ts src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts
git commit -m "fix: detect drained video queues"
```

---

### Task 2: Queue Lifecycle Reset and New Import Selection

**Files:**
- Modify: `src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts`
- Modify: `src/videoProcessingStructure.test.ts`

**Interfaces:**
- Consumes: `shouldAutoPauseVideoQueue` from Task 1.
- Produces: a queue hook that returns to `paused = true` after a drained batch and selects the first job id from each non-empty import batch.

- [ ] **Step 1: Write failing hook-structure regressions**

Extend the video renderer orchestration structure test to require the model import and focused effect:

```typescript
assert.match(queueSource, /shouldAutoPauseVideoQueue/)
assert.match(
  queueSource,
  /shouldAutoPauseVideoQueue\(jobs, paused, activeJobId, runningRef\.current\)[\s\S]*setPaused\(true\)/,
)
```

Add a separate first-new-import selection guard:

```typescript
assert.match(queueSource, /let firstImportedJobId: string \| null = null/)
assert.match(
  queueSource,
  /if \(!firstImportedJobId\) \{\s+firstImportedJobId = id\s+setSelectedJobId\(id\)\s+\}/,
)
assert.doesNotMatch(queueSource, /setSelectedJobId\(\(current\) => current \?\? id\)/)
```

- [ ] **Step 2: Run structure tests and verify RED**

```powershell
npx tsx --test src/videoProcessingStructure.test.ts
```

Expected: FAIL because the automatic-pause effect and first-import selection are absent.

- [ ] **Step 3: Wire automatic pause and first-new selection**

Import `shouldAutoPauseVideoQueue` from `videoProcessingQueueModel`.

After the progress-subscription and output-directory hydration effects, add:

```typescript
useEffect(() => {
  if (shouldAutoPauseVideoQueue(jobs, paused, activeJobId, runningRef.current)) {
    setPaused(true)
  }
}, [activeJobId, jobs, paused])
```

In `importVideos`, replace the stale-selection updater while preserving the existing placeholder and probe behavior:

```typescript
const files = await videoProcessingService.chooseVideoFiles()
let firstImportedJobId: string | null = null
for (const file of files) {
  const id = createJobId()
  if (!firstImportedJobId) {
    firstImportedJobId = id
    setSelectedJobId(id)
  }
  const placeholder = queuedJob(id, fallbackProbe(file))
  placeholder.phase = 'probing'
  placeholder.message = '正在读取视频信息'
  setJobs((current) => [...current, placeholder])
  try {
    const probe = await videoProcessingService.probeVideoFile(file.path)
    setJobs((current) => current.map((job) => job.id === id ? queuedJob(id, probe) : job))
  } catch (error) {
    setJobs((current) => updateVideoQueueJob(current, id, { type: 'fail', error: String(error) }))
  }
}
```

- [ ] **Step 4: Run focused tests and build**

```powershell
npx tsx --test src/components/VideoProcessingWorkspace/videoProcessingQueueModel.test.ts src/videoProcessingStructure.test.ts
npm run build
```

Expected: focused tests and production build pass.

- [ ] **Step 5: Run the release gate**

```powershell
npm test
npm run build
git diff --check
git status --short --branch
```

Expected: all tests and build pass; only Task 2 files remain pending.

- [ ] **Step 6: Commit the hook fix**

```powershell
git add src/components/VideoProcessingWorkspace/useVideoProcessingQueue.ts src/videoProcessingStructure.test.ts
git commit -m "fix: reset completed video queue lifecycle"
```
