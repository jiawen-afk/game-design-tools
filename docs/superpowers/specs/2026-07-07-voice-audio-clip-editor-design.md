# Voice Audio Clip Editor Design

## Context

The voice workbench currently has two audio-producing surfaces:

- `生成配音`: VoxCPM records are kept in the voice history and can be loaded, cloned, collected into project space, or linked to project entities.
- `生成音效`: Stable Audio 3 records are kept in the sound effect history and can be loaded, renamed, collected into the independent sound effect asset category, or linked to sprite sheets.

Users need a first audio editing feature: clip a useful sound segment from any generated voice or sound effect, verify it by repeated playback, name it, and save it as a new generated record in the same source history.

## Decision

Use `wavesurfer.js` for waveform and region interaction, but keep the actual clipping pipeline in first-party code:

- `wavesurfer.js` renders the waveform and interactive region.
- The Regions plugin provides draggable and resizable clip ranges with region playback and loop preview.
- Browser Web Audio decodes the source and slices the selected PCM range.
- A small WAV encoder writes the selected PCM into a new WAV blob.
- Electron persists the WAV file under a local app audio-edit output directory.
- The existing voice or sound effect history receives a new record that points at the persisted file.

This avoids depending on VoxCPM or Stable Audio service availability for editing. It also avoids `ffmpeg.wasm` for the first version because clipping decoded audio is small enough for Web Audio, while FFmpeg adds package weight, startup cost, and extra license complexity through its core.

Reference links:

- wavesurfer.js docs: https://wavesurfer.xyz/docs/
- wavesurfer.js plugins overview: https://wavesurfer.xyz/plugins/
- wavesurfer.js Regions plugin: https://wavesurfer.xyz/plugins/regions
- @wavesurfer/react package: https://www.npmjs.com/package/%40wavesurfer/react
- ffmpeg.wasm FAQ: https://ffmpegwasm.netlify.app/docs/faq/
- FFmpeg legal notes: https://www.ffmpeg.org/legal.html

## User Experience

The voice workbench gains a third top-level tab: `音频编辑`.

History records in both `生成配音` and `生成音效` gain a `剪辑片段` action. Clicking it switches to `音频编辑` and loads the selected record.

The editor shows:

- Source summary: source type, source name, duration, and source metadata.
- Waveform surface: one editable selection region over the waveform.
- Transport controls: play/pause source, play selection, loop selection, stop.
- Time controls: current time, start time, end time, selected duration, plus buttons for `设为开始` and `设为结束`.
- Name field: default name derived from the source record, editable before saving.
- Save action: `生成新音频`.

The editor supports these flows:

1. User drags the waveform or playback cursor to audition any point.
2. User adjusts the region handles or uses `设为开始` and `设为结束`.
3. User repeats playback of the selected segment.
4. User changes the name and generates a new audio record.
5. User can return to editing and generate another clip from the same source.

## Data Flow

### Load source

The edit request carries:

- `sourceKind`: `voice` or `sound-effect`
- `sourceId`
- `name`
- `audioUrl`
- `audioPath`
- Source metadata needed to create a child record

The editor loads audio from `audioUrl` first. If the source is a project object in later extensions, it should use the same local-first resource resolver pattern already used by project-space audio playback.

### Clip source

The clipping model normalizes:

- Start cannot be below `0`.
- End cannot exceed source duration.
- End must be greater than start.
- Selected duration has a minimum threshold of `0.05s` to avoid silent or invalid zero-length files.

The Web Audio pipeline:

1. Fetch source audio as `ArrayBuffer`.
2. Decode via `AudioContext.decodeAudioData`.
3. Convert selected start/end seconds into sample indices.
4. Copy each channel into a new `AudioBuffer`.
5. Encode the new buffer as 16-bit PCM WAV.

### Persist output

Add an Electron IPC method dedicated to voice workbench edited audio:

- Input: `{ data, fileName }`
- Output: `{ audioUrl, audioPath, fileName }`

The main process writes under:

`%LOCALAPPDATA%/GameDesignTools/AudioEdits`

The main process returns `audioUrl` as a `file://` URL built from the written path, and returns `audioPath` as the absolute filesystem path. Both are persisted in the record so the history can replay the edited audio after refresh.

### Create record

For `voice` sources:

- Add a new `VoiceGenerationRecord` to voice history.
- Preserve `params` from the source record.
- Use the user-entered name.
- Set `createdAt` to now.
- Set `audioUrl` and `audioPath` from the persisted clip.

For `sound-effect` sources:

- Add a new `SoundEffectRecord` to sound effect history.
- Preserve `prompt`, `seed`, and `model`.
- Set `durationSeconds` to the selected clip duration.
- Use the user-entered name.
- Set `createdAt` to now.
- Set `audioUrl` and `audioPath` from the persisted clip.

The clip result returns to the history that matches the source. Voice clips do not enter sound effect history, and sound effect clips do not enter voice history.

## Components And Modules

New focused modules:

- `audioClipModel.ts`: pure range normalization, duration formatting, default output name, source-to-record metadata shaping.
- `audioClipEncoding.ts`: browser-only decode and WAV encoding helpers.
- `audioClipService.ts`: renderer service for loading, clipping, and saving edited audio through desktop IPC.
- `AudioClipEditorPanel.tsx`: editor presentation and controls.
- `useAudioClipEditorWorkspace.ts`: editor state, waveform lifecycle, region synchronization, save workflow.
- `desktopAudioEditApi.ts`: typed renderer contract for saving edited audio.
- `electron/audioEditIpcHandlers.cjs`: main-process persistence handler.

Existing modules to connect:

- `VoiceWorkspaceTabs.tsx`: add the `音频编辑` tab and controlled active tab state.
- `VoiceRecordLists.tsx`: add `剪辑片段` action for voice history records.
- `SoundEffectLibraryPanel.tsx`: add `剪辑片段` action for sound effect history records.
- `useVoiceDeploymentWorkspace.ts`: expose a clip action and add voice clip results to voice history.
- `useSoundEffectWorkspace.ts`: expose a clip action and add sound effect clip results to sound effect history.
- Desktop bridge files: expose the audio edit save method to the renderer.

## Error Handling

Show clear warnings for:

- Source audio is missing.
- Source audio cannot be fetched.
- Browser cannot decode the source audio.
- Selection is too short or invalid.
- Desktop runtime is unavailable.
- Edited audio cannot be written to disk.

If saving fails, keep the current editor state and selected region so the user can retry.

## Accessibility And Interaction

The waveform is visual, but the editor must remain usable with standard controls:

- Numeric start and end inputs are available beside the waveform.
- Buttons have explicit labels.
- The selected duration is shown as text.
- Keyboard focus stays in normal Ant Design controls.

The waveform is a high-signal visual aid, not the only way to set the clip.

## Testing

Model tests:

- Normalize negative and over-duration ranges.
- Reject or clamp zero-length ranges.
- Derive default output names from source records.
- Build child voice and sound effect records with preserved metadata.

Encoding tests:

- Encode a small generated AudioBuffer into a valid WAV header.
- Preserve channel count, sample rate, and expected frame count.

Storage and IPC tests:

- Electron handler writes inside the audio-edit output directory.
- File names are sanitized.
- Returned paths point to the created file.

Structure tests:

- Voice history exposes the clip action.
- Sound effect history exposes the clip action.
- Voice workbench contains the `音频编辑` tab.
- The audio editor is wired through focused modules, not folded into the workspace index.

Manual verification:

- Generate or load a voice record, clip a segment, save it, refresh the app, and replay the new voice history record.
- Generate or load a sound effect record, clip a segment, save it, refresh the app, and replay the new sound effect history record.
- Confirm repeated selection playback works while editing.

## Non-Goals

First version will not include:

- Fade in/out.
- Volume normalization.
- Noise reduction.
- Multi-track editing.
- MP3 or WebM export.
- Project-space clipping of already collected assets.

Those features can build on the same editor after the clipping pipeline is stable.
