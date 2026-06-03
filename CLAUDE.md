# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at 127.0.0.1
npm run build      # tsc -b && vite build
npm test           # run all tests
```

Run a single test file:
```bash
npx tsx --test src/components/MultiFrameSpriteWorkspace/model.test.ts
```

## Architecture

`src/App.tsx` is the home shell. It holds the `tools` array (each entry has `id`, `shortcut`, `input`, `output`) and keyboard routing (`1`/`2` open tools, `Esc` returns). Lazy-loaded workspace components are rendered full-screen when a tool is active.

### MultiFrameSpriteWorkspace

The larger of the two tools. State is split across domain-specific hooks composed by `useSpriteWorkspaceController`:

| Hook | Responsibility |
|---|---|
| `useFrameWorkspaceState` | Frame list, selection, ordering |
| `useUploadWorkspace` / `useVideoWorkspace` | Image and video ingestion |
| `useMattePipeline` | Background removal pipeline |
| `useLayoutWorkspace` | Canvas sizing, zoom, guide lines |
| `usePlaybackWorkspace` | Animation preview |
| `useSpriteExport` | ZIP/sprite-sheet export via JSZip |

Pure logic lives in `*Model.ts` / `*model.ts` files (e.g. `matteModel.ts`, `layoutModel.ts`, `guideModel.ts`). `model.ts` is the public re-export barrel for the workspace. UI panels (`*WorkspacePanel.tsx`, `*WorkspaceToolbar.tsx`) consume the controller via props.

### VoiceDeploymentWorkspace

Thin workspace — all pure logic is in `voiceDeploymentModel.ts` (parses `nvidia-smi` output, evaluates VRAM against `minimumVramGb`/`recommendedVramGb`, generates Docker/direct deploy commands). The React component in `index.tsx` handles GPU detection and command rendering.

## Tests

Tests use Node's built-in `node:test` + `assert/strict` (no Jest/Vitest). Some tests assert on source text with `readFileSync` to enforce structural invariants (e.g. `appStructure.test.ts` checks that `App.tsx` does not use `Popover`).

## Design tokens

All colors are `oklch`-based CSS custom properties defined in `src/styles/app.css`. Brand blue (`--color-brand`) is for selected states and primary actions; green (`--color-accent`) only for success/active output. See `DESIGN.md` for the full palette and layout principles.
