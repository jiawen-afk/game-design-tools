# Image Processing Layout Redesign

## Goal

Re-plan the image processing workspace so the crop/result stage remains easy to operate when the left-side workflow grows. The current layout stacks upload, matte, crop, and export panels vertically, which makes the control column tall and pulls attention away from the large image stage.

This redesign focuses only on layout and workflow organization. AI upscaling is intentionally out of scope for this implementation and should remain a future export-tab extension point.

## Confirmed Direction

Use layout option A: a top status/action row, a left tabbed parameter panel, and a right fixed large image stage.

## Workspace Structure

### Top Status And Actions

The workspace header should become a compact working toolbar:

- Show the workspace title.
- Show upload entry and current image summary in a compact row.
- Keep primary actions visible without occupying a full left-side card height.
- Include reset or replace-image affordances when an image is loaded.

### Left Parameter Tabs

The left column should show only one parameter group at a time using tabs:

- `抠图`: color key, tolerance, smoothness, spill, erosion, and color picking related controls.
- `裁剪`: crop x/y/width/height and aspect-ratio controls.
- `导出`: format, proportional export scale, derived export width/height, filename, and export action.

Upload should not remain as a tall card inside this column. Export should stay compact and avoid pushing crop controls below the fold.

### Right Image Stage

The right column remains the primary work area:

- Always render `ImageCropResultStage` on the right.
- Give the stage a stable viewport-relative height so it does not become hard to operate when controls change.
- Keep mode toggle, zoom slider, and reset-view controls in the stage toolbar.
- Preserve current interactions: mouse-wheel zoom around pointer, click-to-pick color, crop handles, and crop move/resize.

### Bottom Status Row

Use a compact status row below the main grid for useful dimensions and state:

- source image dimensions
- processed image dimensions
- crop dimensions
- export dimensions
- processing/exporting state

This row should not compete with the stage for height.

## Architecture Boundaries

- `ImageProcessingWorkspace/index.tsx` composes the layout and passes the existing workspace view model to panels.
- UI panels remain presentational. They collect input and call hook methods.
- `useImageProcessingWorkspace.ts` continues to own workflow state and effects.
- `imageProcessingModel.ts` continues to own pure crop/export/zoom math.
- `imageProcessingPipeline.ts` continues to own browser image IO and canvas processing.
- If the top toolbar or status row grows, extract focused presentational components rather than adding large render blocks to `index.tsx`.

## Deferred Upscaling Extension

Future AI upscaling should live in the export tab as a folded export enhancement section. It should not affect this layout redesign, but the export tab should leave enough visual space for a later installed-runtime status and model/scale controls.

## Testing

Add or update tests to enforce the new layout:

- Image processing workspace contains a top toolbar/status area.
- Left side uses tabbed parameter groups for matte, crop, and export.
- Upload is not stacked with all parameter panels in the left column.
- Right main column still owns `ImageCropResultStage`.
- Existing crop/export behavior tests remain valid.

Run:

```powershell
npm test
npm run build
git diff --check
```
