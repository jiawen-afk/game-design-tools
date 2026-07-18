# Upscayl Batch Processing for Image and Sprite Workspaces

## Goal

Eliminate repeated Upscayl process and model startup during sprite-frame and image-batch upscaling while preserving the existing single-image preview workflow and all current upscale settings.

## Scope

- Keep the existing single-image `upscaleImage` API for one-off previews.
- Add a desktop batch API that accepts multiple in-memory images with one shared output format and one shared set of Upscayl options.
- Change sprite batch upscaling to submit all eligible frames in one batch call.
- Change image-workspace batch preview and batch export generation to group images by compatible Upscayl settings and submit each group in one batch call.
- Preserve the current thread profiles: balanced `1:2:2`, low-memory `1:1:1`, and throughput `2:2:2`.
- Do not change video processing, image matting, crop, composition, export encoding, or project storage behavior.

## Considered Approaches

### 1. Generic Electron batch IPC — selected

The renderer prepares image bytes and groups compatible work. Electron writes one temporary input directory, invokes `upscayl-bin.exe` once for the directory, validates every expected output, reads all results, and cleans up.

This keeps filesystem access in Electron, supports both workspaces, preserves renderer-specific preprocessing, and removes repeated process startup.

### 2. Renderer-managed temporary directories

This would expose filesystem paths and lifecycle management to workspace hooks. It weakens the Electron boundary and creates cleanup and path-safety responsibilities in UI code, so it is rejected.

### 3. Persistent Upscayl worker process

This could theoretically minimize startup further, but the current Upscayl CLI exposes directory processing rather than a stable request protocol. Maintaining a custom persistent worker would add cancellation, crash recovery, and model-switching complexity without a verified benefit, so it is rejected.

## Architecture

### Desktop batch contract

Extend `DesktopUpscaleApi` with an `upscaleImageBatch` operation. Each request contains:

- an ordered list of items with a stable request id, display/input name, and binary image data;
- one output format shared by the request;
- one shared `UpscaleOptions` object.

Each response contains the same request id, derived output name, and output binary data. Request ids, rather than filenames alone, map results back to renderer state and allow duplicate source names safely.

The preload bridge forwards the request through a new `upscayl:upscale-batch` IPC channel.

### Electron execution

The handler creates a unique temporary root containing `input` and `output` directories. It generates collision-free ASCII filenames from request order and ids, writes all inputs as PNG files, and calls `upscayl-bin.exe` once with the input and output directories.

After the command exits successfully, the handler verifies that every expected output exists. Missing, duplicate, or unreadable outputs fail the whole request. The handler returns results in request order and removes the temporary root in a `finally` block. Command output remains bounded by the shared command runner behavior.

The existing single-image handler remains available and unchanged in behavior.

### Sprite workspace

`runBatchUpscale` first fetches every selected matte or composed image and builds one PNG batch. One `upscaleImageBatch` call replaces the current per-frame `upscaleImage` loop.

Returned images are then processed in order. Input-image mode still recomposes each upscaled matte image onto the existing canvas, while result-image mode uses the upscaled composed frame directly. Existing result signatures, URL cleanup, progress state, and export requirements remain intact.

### Image workspace

Batch preparation remains item-specific because crop, matte, background, and pre-upscale export scale can differ. Prepared blobs are grouped by a compatibility key containing:

- normalized Upscayl model, scale, tile size, TTA mode, GPU id, and thread profile;
- Upscayl output format.

Each group uses one batch IPC call. A batch with heterogeneous settings therefore starts one Upscayl process per compatibility group, rather than one process per image.

Both “apply all previews” and “export all images” reuse the same batch-preview helper. Existing valid previews are reused; only missing or stale previews are submitted. Generated object URLs and prepared-image cleanup functions are released on success, cancellation, stale-operation detection, and failure.

## Progress and Cancellation

The batch desktop API is request/response based and does not add process cancellation in this change. Workspace progress advances while inputs are prepared and while returned outputs are committed. The UI continues to show the batch as active during the single Upscayl invocation.

Existing operation ids prevent stale renderer results from being committed after settings or selected images change. They do not terminate the already-running desktop process.

## Error Handling

- Reject empty batches before launching Upscayl.
- Reject duplicate or missing request ids.
- Reject unsupported output formats through the same normalization used by the single-image path.
- If Upscayl exits unsuccessfully, report its bounded command output.
- If any expected file is absent, report the missing item and return no partial response.
- Always remove temporary inputs and outputs.
- Workspace batch failures retain previously committed valid previews and revoke only newly generated temporary URLs.
- Never silently substitute original images for requested upscale results.

## Testing

1. Electron unit tests prove one process launch for multiple input images, ordered result mapping, collision-safe input names, output validation, and temporary-directory cleanup on success and failure.
2. API/structure tests prove the batch method is exposed through TypeScript interfaces and preload.
3. Pure image batching tests prove compatibility grouping and stable mapping for heterogeneous settings.
4. Sprite workflow structure tests prevent a return to per-frame `upscaleImage` calls and require the batch API.
5. Image workflow structure tests prevent batch loops from calling the single-image API.
6. Run the complete repository test suite, production build, `git diff --check`, and final status check.

## Success Criteria

- A sprite batch with more than one frame launches one Upscayl process.
- An image batch launches one Upscayl process per unique compatibility group, not per image.
- Single-image preview behavior is unchanged.
- Thread-profile selection reaches every batch command unchanged.
- All expected outputs are validated before results are committed.
- Existing video processing and export behavior remains passing under the full release gate.
