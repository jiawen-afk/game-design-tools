# Video Queue Lifecycle Reset Design

## Goal

After a video-processing batch reaches a terminal state, return the queue to an explicit paused state while keeping completed, failed, and canceled records visible. Newly imported videos must remain idle and editable until the user explicitly starts the queue again.

## Reported Behavior

1. A video is imported, configured, and processed successfully.
2. The queue remains in its running state after the final job completes.
3. Importing another video immediately starts processing it without another click on “处理队列”.
4. Even after manually pausing, the settings panel remains locked for the new video.

## Root Cause

The two symptoms come from separate stale queue states in `useVideoProcessingQueue`:

- `paused` is set to `false` by `startAll`, but no transition returns it to `true` when every job is terminal. Adding a later `queued` job therefore satisfies the existing auto-run effect immediately.
- `selectedJobId` is only initialized when it is `null`. After a completed job remains selected, importing another video preserves the completed selection. `useVideoProcessingWorkspace` correctly treats only `queued` jobs as editable, so the settings panel displays and locks the old completed job.

## Selected Behavior

### Batch completion

When the queue is running and all jobs are in terminal phases (`completed`, `failed`, or `canceled`), with no active job or retained running promise, set `paused` back to `true`.

This transition applies whether the final job succeeds, fails, or is canceled. A future import must not start until the user clicks “处理队列” again.

### Record retention

Keep completed, failed, and canceled rows in the queue. Existing result sizes, errors, retry controls, removal controls, and output-directory actions remain available.

### New imports

For every successful file-picker import batch, select the first newly imported video. The first new row may briefly be in `probing`, then becomes `queued` after its native probe completes. Once queued, all settings become editable:

- resolution percentage and dimensions;
- Theora compression mode and quality/target size;
- target frame rate and audio settings;
- Upscayl GPU advanced settings.

When several videos are imported together, the first new video is selected and remains the source for “应用到全部待处理”. Existing retained records are not deleted.

## Architecture

Keep orchestration in `useVideoProcessingQueue` and terminal-state math in `videoProcessingQueueModel.ts`.

Add a pure queue predicate that decides whether a running batch has drained. The hook uses it in a focused effect to restore `paused = true`; the predicate is covered with model tests for completed, failed, canceled, queued, and active cases.

Update the import workflow so it assigns job ids for the newly selected files and selects the first new id instead of conditionally preserving an old completed selection. A structure regression test protects this selection rule because the project currently has no renderer hook test harness.

## State Flow

1. `startAll` validates queued jobs, obtains an output directory, and sets `paused = false`.
2. The existing scheduler processes queued jobs sequentially.
3. When the final job becomes terminal and the active run is released, the drained-queue predicate becomes true.
4. The lifecycle effect sets `paused = true`.
5. A later import appends retained records plus new queued rows and selects the first new row.
6. Because the queue is paused, the new row does not start automatically and remains configurable.
7. Processing resumes only after another explicit `startAll` call.

## Error and Edge Cases

- A failed or canceled final job also ends the batch and restores pause.
- If any queued or active job remains, automatic pause must not occur.
- Manually pausing a batch remains unchanged.
- Import cancellation adds no jobs and does not change the current selection.
- Probe failure leaves the failed import row selected and preserves its diagnostic error.
- Importing a new batch while older queued work exists selects the first new row but does not alter the older jobs. The existing “应用到全部待处理” action still applies to every queued row.

## Testing

1. Extend `videoProcessingQueueModel.test.ts` with a RED/GREEN matrix proving a batch is drained only when it was running and no queued or active jobs remain.
2. Extend `videoProcessingStructure.test.ts` to require first-new-import selection and automatic pause wiring.
3. Run the focused model and structure tests.
4. Run `npm test`, `npm run build`, `git diff --check`, and `git status --short --branch`.

## Success Criteria

- A completed batch automatically displays “队列已暂停”.
- Importing a video after a completed batch never starts it automatically.
- The newly imported video becomes the selected row.
- Its resolution, compression, frame-rate/audio, and Upscayl GPU parameters are editable after probing.
- Old result records remain visible and usable.
