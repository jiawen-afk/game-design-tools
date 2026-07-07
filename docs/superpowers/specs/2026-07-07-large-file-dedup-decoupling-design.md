# Large File Dedup Decoupling Design

## Goal

Find non-test large files and repeated same-logic code, then refactor them in three ordered batches so each responsibility has a focused owner and the architecture guards prevent the old coupling from returning.

## Scope

This work covers the current non-test production candidates found on July 7, 2026:

- Project schema duplicate logic: `electron/projectSchemaDocument.cjs`, `src/components/ProjectStorage/projectSchemaDocument.ts`, `electron/projectSchemaAsset.cjs`, `src/components/ProjectStorage/projectSchemaAsset.ts`, `electron/projectSchemaCore.cjs`, `src/components/ProjectStorage/projectSchemaCore.ts`, `electron/projectRemoteSchema.cjs`, and `src/components/ProjectStorage/projectSchema.ts`.
- Voice large files: `src/components/VoiceDeploymentWorkspace/AudioClipEditorPanel.tsx`, `src/components/VoiceDeploymentWorkspace/useAudioClipEditorWorkspace.ts`, `src/components/VoiceDeploymentWorkspace/SoundEffectSetupPanel.tsx`, and `src/components/VoiceDeploymentWorkspace/voiceDeployment.sound.css`.
- Sprite/Image large files: `src/components/MultiFrameSpriteWorkspace/layoutModel.ts` and `src/components/ImageProcessingWorkspace/useImageExportWorkflow.ts`.

Production TypeScript/TSX files above about 300 lines remain audit candidates. A file may remain over that line only if a focused responsibility and existing local pattern justify it; otherwise it must be split by real responsibility, not by arbitrary line count.

## Architecture

Batch 1 removes duplicated project schema logic. Schema SQL generation becomes a single shared source consumed by both Electron CJS modules and browser-side TypeScript modules. The Electron modules stay CJS-compatible wrappers, while the project-storage TypeScript modules keep their exported TypeScript-facing APIs. Tests assert the wrappers delegate to the shared schema source and that duplicate SQL bodies are not reintroduced.

Batch 2 splits Voice workspace large files. The audio clip editor panel becomes a composition of focused panels for toolbar, track regions, segment list, context menu, and import/drop surfaces. `useAudioClipEditorWorkspace` delegates pure selection/import/range calculations to model helpers and keeps React orchestration in the hook. Stable Audio setup UI moves model/service status and install controls into focused subcomponents. `voiceDeployment.sound.css` becomes an import hub for focused sound setup, studio, library, and responsive CSS modules.

Batch 3 splits Sprite/Image pure and workflow logic. `layoutModel.ts` is divided into focused model modules for zoom/pointer helpers, silhouette preview, ratio/preset application, wheel resizing, and handle resizing. `useImageExportWorkflow.ts` delegates batch preview lifecycle, export preparation, single-image export, and batch export to focused helper hooks/services while preserving the public hook contract used by `useImageProcessingWorkspace.ts`.

## Data Flow

Project schema consumers continue calling the same exported functions. The wrapper modules call into the shared schema source and pass only dialect-specific boolean SQL fragments where needed.

Voice UI state still flows from `useSoundEffectWorkspace` and `useAudioClipEditorWorkspace` into panels. New Voice components receive narrow prop groups instead of the entire editor or setup surface. Pure audio editor helpers receive explicit range, region, and file inputs and return serializable updates.

Sprite/Image consumers keep existing imports where possible through barrel or compatibility exports. New model modules own pure transformations. Workflow helpers receive explicit dependencies for canvas/blob/export side effects so the top-level hook stays readable and testable.

## Error Handling

Refactors must preserve existing user-facing errors and Ant Design message behavior. Schema wrappers must not change SQL text other than removing duplicate ownership. Export and audio-import helpers must continue to revoke object URLs, clear pending state on failures where the current workflow does, and leave failed operations visible to the existing UI surfaces.

## Testing

Each batch starts with a failing structure or model test:

- Project schema tests assert one shared schema owner and wrapper delegation.
- Voice structure tests assert large panels/hooks have been split and import responsibilities live in focused files. Existing audio model tests cover pure range behavior.
- Sprite/Image structure tests assert layout model responsibilities and image export workflow responsibilities live in focused files.

After each batch, run the narrow affected tests. After all batches, run `npm test`, `npm run build`, `git diff --check`, and `git status --short --branch`.

## Non-Goals

This refactor does not change product behavior, copy, storage semantics, release packaging, remote project identity, or image/audio processing algorithms. It does not introduce new dependencies. It does not move domain logic back into broad entry files.

## Approval

The user approved this ordered three-batch design with: "批准，按顺序完成 3个完整目标".
