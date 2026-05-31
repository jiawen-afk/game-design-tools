# MultiFrame Upload Decoupling Design

## Goal

Continue reducing `src/components/MultiFrameSpriteWorkspace/index.tsx` by moving image upload and sprite-sheet split state into a focused hook.

## Current Coupling

The entry component still owns file upload filtering, pending upload keys, sprite-sheet draft state, slice preview cleanup, preview generation, and split confirmation. These are workflow side effects and do not need to live beside the top-level JSX.

## Design

Create `useUploadWorkspace.ts` beside the existing workspace hooks. It will own:

- Batch image upload change handling.
- Duplicate and pending upload filtering.
- Sprite-sheet draft, row, column, preview, and processing state.
- Object URL cleanup for sprite-sheet drafts and slice previews.
- Conversion from uploaded files or sprite slices into `FrameItem` values.
- Scheduling matte generation after frames are appended.

`index.tsx` will keep only orchestration and rendering:

- Call `useUploadWorkspace`.
- Pass returned state and handlers into `SpriteSheetUploadPanel` and Ant Design `Upload`.
- Continue passing `matteDefaults`, `appendFrames`, `frames`, `framesRef`, and `scheduleMatte` into the hook as explicit dependencies.

## Testing

Add a structural regression test in `model.test.ts` that verifies upload pipeline symbols no longer appear in `index.tsx`, that the new hook imports those dependencies, and that the entry file remains below a tighter line-count threshold.

## Follow-Up View Extraction

After the upload workflow moves out, extract the remaining canvas layout editor JSX into `LayoutWorkspacePanel.tsx`. The component will own the visual composition of the unified canvas editor, guide overlays, resize handles, active-frame controls, and public parameter panel. The entry file will pass state and callbacks from `useLayoutWorkspace` into this component without importing guide-rendering helpers or resize handle constants directly.
