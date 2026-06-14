# Image Processing Workspace Design

## Goal

Add a new home-page workspace for single-image processing. The first release should support:

- Uploading `webp`, `jpg`, `jpeg`, and `png` images.
- Chroma-key background removal using the existing matte approach.
- Cropping with live preview and zoom controls.
- Exporting the processed result as `webp`, `jpg`, `jpeg`, or `png`.

## Scope

This workspace is for one image at a time and should stay separate from the sprite-sheet/video workspace. It is the local editor surface for preparing a single image before further work such as AI generation, layer splitting, or later animation tooling.

The first version does not include:

- AI background removal.
- Multi-image batch editing.
- Layer extraction.
- Freeform vector tools.
- Timeline-based animation.

## Home Entry

Add a new tool card on the home page for `图片处理工作台` / `Image Processing Workspace`.

Suggested shortcut order:

1. Sprite workbench
2. Image processing workbench
3. Voice workbench
4. Personal space

The workspace should be reachable from the main tool list and from the keyboard shortcut row.

## User Flow

1. User opens the image processing workspace.
2. User uploads one supported image.
3. User adjusts matte settings to remove the background.
4. User adjusts crop bounds while watching a preview of the cropped output.
5. User zooms in or out to inspect edges and framing.
6. User exports the final image in the desired format.

## Design

### Workspace Structure

Create a focused `src/components/ImageProcessingWorkspace/` directory.

Recommended files:

- `index.tsx` for workspace composition only.
- `useImageProcessingWorkspace.ts` for state, effects, and workflow orchestration.
- `imageProcessingModel.ts` for file acceptance, export format mapping, crop helpers, and other pure logic.
- `imageProcessingPipeline.ts` for canvas/image processing side effects.
- `ImageUploadPanel.tsx`, `ImageMattePanel.tsx`, `ImageCropPanel.tsx`, and `ImageExportPanel.tsx` as the UI grows.

### Image Handling

Use the existing chroma-key style matte workflow as the first release. The workspace should support the same style of background removal already used elsewhere in the app: key color, tolerance, smoothness, spill, and erosion.

The workspace should load the uploaded file into an object URL, render a working preview, and keep the original file available for export processing.

### Cropping and Preview

Cropping should operate on the processed image, not the original unprocessed bitmap. The preview must show the cropped result live.

The preview area should support zoom in and zoom out so the user can inspect edges, transparency, and framing before export. The crop interaction can start with a rectangle-based crop UI; panning can be deferred unless it becomes necessary for usability.

### Export

Export should support `png`, `webp`, `jpg`, and `jpeg`.

- `png` and `webp` should preserve transparency.
- `jpg` and `jpeg` should flatten onto a solid background because JPEG cannot store alpha.
- The default flatten color should be white unless the user chooses another background color later.

The export result should reflect the current matte and crop settings.

## Architecture Boundaries

Keep the workspace entry thin. It should compose panels and hand state down, but not own canvas processing or format conversion.

Keep pure decisions in the model file:

- Supported input extension and MIME checks.
- Output extension and MIME mapping.
- Crop clamping and export filename derivation.
- JPEG flattening behavior as a rule, not a UI accident.

Keep all canvas work in the pipeline file:

- Loading image dimensions.
- Matte application.
- Crop rasterization.
- Export blob creation.

Reuse existing image-loading and matte logic where practical, but do not route this workspace through the sprite-sheet upload flow.

## Testing

Add tests that cover both structure and behavior:

- `src/appStructure.test.ts` should verify the home page exposes the new workspace and the shortcut layout changes with it.
- New workspace model tests should verify supported file types, output format mapping, crop clamping, and JPEG flattening rules.
- Workspace structure tests should verify the entry file stays thin and delegates canvas work to local helpers/hooks.

Run the normal gate after implementation:

```powershell
npm test
npm run build
git diff --check
```

## Follow-Up

After the first release is stable, the next expansion point is AI image generation and later layer splitting. This workspace should stay compatible with that path by keeping the upload, matte, crop, and export steps independent.
