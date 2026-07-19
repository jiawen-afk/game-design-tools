# Video Output Directory Persistence Design

## Goal

Make the video processing workspace remember the last selected OGV output directory across workspace and application restarts, without requiring the user to choose it again for every session.

## Scope

- Persist one last-used output directory for the video processing workspace on the current device.
- Restore and display it when the video workspace opens.
- Reuse it when starting future video queues.
- Use it as the default location when reopening the directory picker.
- Do not share this preference with image processing, sprite processing, project space, or other workspaces.
- Do not store it in project data or synchronize it to other devices.

## Current Constraint

The Electron main process currently maintains an in-memory `selectedOutputDirectories` allow-list. A video job may write only to a directory selected through the native dialog during the current application session.

Renderer-only persistence would restore the visible path but not the main-process authorization. After restarting the application, the UI could display the directory while `video-processing:start` rejects it. The persisted directory must therefore be restored and authorized by the Electron main process.

## Considered Approaches

### 1. Electron main-process preference — selected

Store the video workspace's last output directory under Electron's device-local `userData` directory. Main-process code validates and authorizes the restored path before returning it to the renderer.

This preserves the existing write-path security boundary, works across complete application restarts, and keeps device paths out of project data.

### 2. Renderer `localStorage`

This is simple but cannot safely repopulate the main-process allow-list. Adding a renderer-controlled “authorize arbitrary path” IPC would weaken the current native-dialog trust boundary. This approach is rejected.

### 3. Project-scoped persistence

This would allow one path per project, but Windows filesystem paths are device-specific and should not enter shared or remotely synchronized project configuration. It also exceeds the requested video-workspace-only behavior. This approach is rejected.

## Storage Boundary

Create a focused Electron module responsible for the preference file. The file lives below `app.getPath('userData')` and stores a versioned JSON object containing only the last video output directory.

The module provides focused operations:

- resolve the preference-file path;
- load and validate the stored directory;
- save a newly selected directory atomically;
- clear invalid persisted state.

Loading treats missing files, malformed JSON, blank paths, inaccessible paths, and non-directory paths as “no saved directory”. Invalid state is cleared where safe. Saving writes a temporary JSON file and renames it over the preference file so a process interruption cannot leave partially written JSON.

## Main-Process Flow

When video IPC handlers are registered, start one restoration promise:

1. Load the saved preference.
2. Resolve it to an absolute path.
3. Verify it still exists and is a directory.
4. Add it to `selectedOutputDirectories`.
5. Cache its `{ name, path }` directory information for the current session.

Add a `video-processing:get-output-directory` IPC handler that awaits restoration and returns the valid cached directory or `null`.

The native directory picker awaits restoration and supplies the remembered directory as `defaultPath`. When the user selects a new directory, it validates the path, adds it to the allow-list, updates the session cache, persists it, and returns the selected directory.

Before normalizing a video start request, the handler awaits restoration. A valid restored path is therefore authorized exactly like a path selected earlier in the same session. No general-purpose path-registration IPC is exposed to the renderer.

## Renderer Flow

Extend the typed desktop video API and preload bridge with `getVideoOutputDirectory()`.

The video service exposes the method. `useVideoProcessingQueue` starts with `outputDirectory = null`, then hydrates the remembered directory in an effect. It guards against setting state after unmount. Restoration failure leaves the directory unset and does not show a disruptive startup error.

When the user chooses a new directory, the existing `chooseOutputDirectory` flow continues to update state immediately; persistence is already complete when the IPC call resolves.

Starting a queue continues to open the picker only when no valid directory is restored or selected.

## Invalid and Unwritable Directories

- Missing, inaccessible, malformed, blank, or non-directory saved paths restore as `null` and require a new selection.
- A path that exists but becomes unwritable after restoration remains subject to the existing output preflight write check. The job fails with the existing “output directory not writable” message instead of silently switching directories.
- Canceling the native directory picker keeps the previously remembered directory unchanged.
- A failed preference write makes directory selection fail visibly rather than claiming the path will be remembered when it was not persisted.

## Testing

1. Preference-module tests cover missing files, valid restoration, malformed JSON, non-directory paths, atomic replacement, and normalized absolute paths.
2. Video IPC tests cover restoration into the allow-list, the new getter, picker `defaultPath`, persistence after selection, cancellation preserving the old value, and restored-directory job authorization.
3. Desktop API and preload structure tests require the new typed method and IPC channel.
4. Video workspace structure tests require startup hydration and prevent renderer `localStorage` persistence.
5. Run `npm test`, `npm run build`, `git diff --check`, and confirm a clean final worktree.

## Success Criteria

- After selecting an OGV output directory, completely restarting the application restores it in the video workspace.
- Starting a queue with the restored directory does not reopen the picker and passes the main-process output allow-list.
- Reopening the picker starts from the remembered directory.
- Invalid saved paths do not block workspace startup and do not remain authorized.
- No project or cross-workspace persistence is introduced.
