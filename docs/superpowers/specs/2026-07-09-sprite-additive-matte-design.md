# Sprite Additive Matte Post-Processing Design

## Goal

Add a flow 2 post-processing step in the multi-frame sprite workbench that turns black-background skill effects into transparent-background frames after normal matte/background removal. The output must continue through flow 3 alignment, sprite export, and project-space collection as ordinary transparent sprite frames.

## User Workflow

Flow 2 keeps the existing matte card per import group. Below the current frame's original/result preview, add a compact `加色去黑` section.

The section contains:

- `区域模式`: `画笔`, `全选`, `清空`.
- `画笔大小`: a numeric slider used only in brush mode.
- `帧范围`: `当前帧`, `本组全部帧`, `自定义选择`.
- `选择帧`: visible when `自定义选择` is active.
- `黑场阈值`: controls how quickly near-black pixels become transparent.
- `强度`: controls how strongly the conversion is applied.
- `应用加色去黑`: applies the conversion to the selected frames.

The user can keep the normal flow 2 preview frame switcher. Switching preview frames does not change the custom frame selection.

## Region Selection

The region mask is edited on the current flow 2 result preview. Brush strokes mark the region to convert. `全选` marks the whole frame. `清空` removes the mask.

The first implementation stores one mask per group and applies it in normalized image coordinates so it can be reused across frames in the same sprite sheet, video extraction, or batch import group. If a target frame has a different size, the mask scales to that frame's matte image dimensions.

The brush interaction must not replace the existing click-to-pick-background behavior for chroma key. Brush editing is scoped to a dedicated additive preview surface inside the additive section.

## Frame Selection

`帧范围` behavior:

- `当前帧`: applies only to the frame currently shown in the group card.
- `本组全部帧`: applies to every frame in the import group.
- `自定义选择`: applies only to checked frames in that group.

The custom frame chooser opens as an inline expandable panel below the additive controls, not a modal-first blocking workflow. It shows a thumbnail grid for the current group with checkboxes, current-preview highlighting, and controls: `全选`, `清空`, `反选`, `选择当前帧之后`.

For large groups, the chooser also accepts a range string such as `1-8, 12, 20-24`. Ranges are 1-based and inclusive. Invalid tokens are ignored with a visible validation message, while valid tokens remain selected.

If `自定义选择` has no frames selected, `应用加色去黑` is disabled.

## Pixel Processing

The feature is black-to-alpha conversion, not engine-only additive preview.

For pixels inside the selected mask:

1. Read the current `matteUrl` image.
2. Keep the original source alpha.
3. Compute brightness as `max(r, g, b) / 255`.
4. Convert near-black pixels to lower alpha according to `黑场阈值` and `强度`.
5. Unpremultiply the remaining color enough to keep bright effect color visible.
6. Write a PNG blob URL and replace the frame's `matteUrl`.
7. Increment `matteRevision` so the existing flow 3 compose queue refreshes automatically.

Pixels outside the selected mask are copied unchanged. Existing transparent pixels remain transparent.

## Architecture

Keep browser/canvas work out of the main panel.

New focused files:

- `additiveBlendModel.ts`: pure option coercion, frame-range resolution, range-string parsing, and target-frame selection.
- `additiveBlendModel.test.ts`: model tests for target selection and range parsing.
- `spriteAdditiveBlendPipeline.ts`: canvas image processing and mask application.
- `AdditiveBlendPanel.tsx`: UI controls, brush preview surface, and frame chooser.
- `useAdditiveBlendWorkspace.ts`: per-group mask state, custom frame selections, async apply workflow, object URL cleanup, and Ant Design messages.

Existing files to modify:

- `MatteWorkspacePanel.tsx`: render `AdditiveBlendPanel` for each group and pass the selected preview frame.
- `useMattePipeline.ts`: expose an additive apply action that mutates `matteUrl`, increments `matteRevision`, and lets the existing compose queue refresh flow 3 output.
- `types.ts`: add lightweight additive state only if it must persist on `FrameItem`; prefer hook-local UI state and update `matteUrl`/`matteRevision` for output.
- `model.ts` and `matteModel.ts`: export pure additive model helpers if they are shared by tests and UI.

## Error Handling

- If a selected frame has no `matteUrl`, skip it and show a warning listing how many frames were skipped.
- If every selected frame is missing `matteUrl`, block apply and ask the user to run matte/background removal first.
- If canvas creation or image loading fails, keep existing frame output unchanged and show the failure message.
- Revoke replaced object URLs to avoid leaking memory.

## Testing

Required checks:

- Model test: `当前帧`, `本组全部帧`, and `自定义选择` resolve the correct frame ids.
- Model test: range strings parse `1-8, 12, 20-24`, ignore invalid tokens, clamp to frame count, and deduplicate ids.
- Model test: empty custom selection disables apply.
- Focused model-level pixel test: black pixels inside the mask become transparent, bright pixels stay visible, original alpha is preserved, and unmasked pixels are unchanged.
- Structure test: flow 2 delegates additive UI/workflow to focused files instead of embedding canvas post-processing in `MatteWorkspacePanel.tsx`.

## Out Of Scope

- Runtime-only engine additive blending preview.
- Per-frame independent hand-painted masks.
- Animated brush playback.
- Persisting additive masks into project storage.
- Replacing flow 2 chroma key or AI matting.
