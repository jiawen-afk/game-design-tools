# Audio Editor Multi-Segment Export Design

## Goal

Upgrade the voice workbench audio editor from a single start/end clip tool into a compact multi-segment editor. Users can mark multiple waveform regions, build an ordered pending list from those regions, preview the pending list as one continuous audio source, then export, generate history records, or collect the result into project space according to the source type.

## Source-Specific Actions

The available output actions depend on how the audio entered the editor.

- Voice history source: show `生成到历史`, `导出到本地`, and `收藏到项目空间-配音`.
- Sound effect history source: show `生成到历史`, `导出到本地`, and `收藏到项目空间-音效`.
- Direct uploaded or dragged audio source: show `导出到本地`, `收藏到项目空间-配音`, and `收藏到项目空间-音效`; do not show `生成到历史`.

All actions operate on the ordered pending list. They do not use only the currently selected region unless that selected region has first been added to the list.

## Waveform Editing

Use the existing `wavesurfer.js` Regions plugin as the editing surface.

- Remove the `设为开始` and `设为结束` buttons.
- Right-click an empty waveform position to open an add action for a segment region.
- Adding a segment creates a selected region at the clicked time, with a short default duration clamped to the available gap.
- Regions can be dragged to move their time range.
- Region edges can be dragged to resize start and end.
- Right-clicking a region opens a delete action for that region.
- Multiple regions are allowed, but regions must never overlap.
- If a drag or resize would overlap another region, the editor clamps the region to the nearest valid boundary. If no valid placement exists, it restores the last valid range.
- The selected region is visually distinct and is the target for `添加选中区块到待处理列表`.

## Pending List

The pending list is the source for playback and output.

- Show `添加选中区块到待处理列表` when at least one region exists.
- The button is enabled only when a region is selected and that region is not already in the pending list.
- Each pending item displays order, start time, end time, and duration.
- Pending items can be dragged to reorder playback/export order.
- Each pending item can be removed from the pending list without deleting its waveform region.
- If a region already in the pending list is dragged or resized in the waveform, the pending item reflects the new range.
- If a region is deleted from the waveform, remove its pending item automatically.
- Output buttons are enabled only when the pending list contains at least one valid segment.

## Playback

Playback has two modes.

- Source playback: play or pause the full source audio from the waveform.
- Pending playback: play the pending list as one continuous audio source, using pending item order rather than timeline order.

Pending playback supports one-shot playback and loop playback. During pending playback, the editor plays each referenced region in order and automatically advances to the next segment. Loop mode restarts from the first pending item after the last segment ends.

## Output Behavior

The editor renders a new WAV by decoding the source audio into PCM, slicing every pending range, and concatenating the slices in pending-list order.

`生成到历史` saves the rendered audio through the existing edited-audio storage path and adds a new record:

- Voice source creates a new voice history record.
- Sound effect source creates a new sound effect history record.
- Uploaded audio never uses this action.

`导出到本地` opens a desktop save dialog and writes the rendered WAV to the user-selected path. It does not create a history record. Canceling the save dialog leaves the editor unchanged and should not show an error.

Project-space collection renders the pending list, stores a temporary edited WAV through the app audio-edit output path, then collects that rendered audio into project space:

- `收藏到项目空间-配音` creates a project-space voice asset.
- `收藏到项目空间-音效` creates a project-space sound asset.
- Voice sources can only collect to project-space voice.
- Sound effect sources can only collect to project-space sound.
- Uploaded audio can collect to either project-space voice or project-space sound.

## Architecture

Keep the existing workspace boundaries.

- `AudioClipEditorPanel.tsx`: render the waveform, context actions, pending list, playback controls, and source-specific output buttons.
- `useAudioClipEditorWorkspace.ts`: own region state, selected region, pending order, playback workflow, save/export/collect orchestration, loading state, and messages.
- `audioClipModel.ts` or a focused new model file: own pure region rules, non-overlap clamping, pending-list updates, reorder helpers, and source-action visibility rules.
- `audioClipEncoding.ts`: add multi-range PCM slicing and concatenation helpers.
- `audioClipService.ts`: render pending ranges, generate history records, export local files, and prepare rendered audio records for collection.
- `desktopAudioEditApi.ts` and Electron IPC: add a user-selected export operation while preserving the existing internal edited-audio save operation.
- Project-space collector code: reuse the existing voice and sound collection paths by passing the rendered temporary record shape they already know how to collect.

## Error Handling

- If the source audio cannot be decoded, show the existing editor error area with a clear message.
- If the pending list is empty, disable output and collection buttons.
- If a segment becomes shorter than the minimum valid clip duration, block adding it to pending output.
- If the desktop runtime is unavailable, disable or fail gracefully for save/export/collection actions that need filesystem access.
- If project-space collection needs a resource directory, reuse the current project-space directory authorization message.
- If local export is canceled, show no warning.

## Testing

Add focused tests before implementation changes.

- Region model tests: add, select, delete, clamp, no overlap, restore invalid movement, pending removal after region deletion.
- Pending-list tests: add selected region once, reorder items, update pending item when the region range changes.
- Encoding/service tests: concatenate multiple PCM ranges in pending order and preserve source-specific history behavior.
- Export/IPC tests where practical: sanitize names, save dialog cancellation, and selected-path writing.
- Structure tests: old `设为开始` and `设为结束` controls do not return; source-specific action labels are present through the expected panel props.
- Full verification after implementation: focused tests, `npm test`, `npm run build`, `git diff --check`, and browser QA for waveform layout, pending list density, and responsive behavior.

## Out of Scope

- Destructive editing of the source file.
- Export formats other than WAV.
- Crossfades, fades, silence insertion, volume normalization, or noise reduction.
- Multi-source mixing. The pending list always uses segments from the current single source audio.
