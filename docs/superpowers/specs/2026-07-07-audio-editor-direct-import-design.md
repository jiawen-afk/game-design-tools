# Audio Editor Direct Import Design

## Goal

Allow users to drag or upload an audio file directly in the `音频编辑` tab, then trim it with the existing waveform editor and save the result as a new audio history record.

## User Flow

- The empty `音频编辑` panel shows a compact upload/drop zone.
- The user can drag an audio file into the zone or click to choose one file.
- Accepted files use browser-supported `audio/*` formats.
- The imported file opens immediately in the waveform editor.
- The default output name is `<原文件名去扩展名> 剪辑`.
- Saving an imported clip creates a new `生成配音` history record, because voice history is the existing generic audio record list. Sound effect history remains reserved for Stable Audio generated records with prompt, model, seed, and duration metadata.

## Architecture

- Extend `AudioClipSource` with an `imported-audio` source kind whose record contains `name`, `audioUrl`, and optional `audioPath`.
- Add pure model helpers for imported file names and imported clip record creation.
- Keep file object URL creation and cleanup in `useAudioClipEditorWorkspace`.
- Keep the panel thin: it renders Ant Design upload/drop UI and calls an `onImportAudioFile(file)` callback.
- Reuse `saveAudioClip`, PCM slicing, WAV encoding, and Electron edited-audio persistence.

## Error Handling

- Non-audio files are rejected in the hook and shown as a panel warning.
- Replacing an imported file revokes the previous imported object URL.
- The existing save errors continue to surface in the panel warning area.

## Testing

- Model tests cover imported source creation and imported clip record output.
- Service tests cover imported clip save routing into a voice record.
- Structure tests cover the direct upload/drop UI and hook callback wiring.
- Build, focused tests, full tests, and whitespace checks remain release gates.
