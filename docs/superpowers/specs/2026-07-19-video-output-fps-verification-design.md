# Video Output Frame-Rate Verification Design

## Goal

Prevent false “output frame rate differs from target” failures after successful video processing while continuing to reject OGV files whose declared playback cadence would be wrong in Godot.

## Evidence and Root Cause

The video encoder applies FFmpeg's `fps` filter, so generated Theora video is constant-frame-rate output. The current verifier nevertheless reads `avg_frame_rate` before `r_frame_rate`.

For Ogg/Theora with an audio stream, FFprobe may derive `avg_frame_rate` from observed frame count and stream duration. Container and audio-duration rounding can move this estimate away from the requested rate even when the encoded Theora time base is correct.

Reproduction with the bundled FFmpeg runtime:

- Target `29.94`: `r_frame_rate = 1497/50 = 29.94`, but `avg_frame_rate = 359/12 ≈ 29.9167`. The current `0.02 fps` tolerance rejects the valid output.
- Target `24.03`: `r_frame_rate = 2403/100 = 24.03`, but `avg_frame_rate = 24/1`. The current verifier also rejects this valid output.
- A 451-frame, 15-second source is approximately `30.067 fps`, making the same kind of statistical rounding disagreement possible.

The encoding command is correct in these cases. The verifier is using the wrong primary metric for a constant-frame-rate output.

## Considered Approaches

### 1. Validate declared playback rate first — selected

Use `r_frame_rate` when it is a valid positive rational. Only fall back to `avg_frame_rate` when the declared rate is unavailable or invalid.

This validates the Theora playback time base that Godot will use while ignoring harmless statistical-average drift.

### 2. Increase the tolerance

A wider tolerance would allow the observed examples, but it would also accept genuinely incorrect declared rates. The required tolerance would grow with video duration and rounding behavior, so no single wider value is reliable. This approach is rejected.

### 3. Accept the output when either rate matches

This would pass files whose statistical average happens to match while their declared Theora cadence is wrong. Such files can play at the wrong speed or drift against audio in Godot. This approach is rejected.

## Verification Rule

For constant-frame-rate Theora output:

1. Parse `r_frame_rate` as the declared playback rate.
2. Parse `avg_frame_rate` as a diagnostic statistical rate.
3. If the declared rate is valid, compare it with the target and do not let the statistical rate override it.
4. If the declared rate is unavailable, compare the statistical rate with the target as a compatibility fallback.
5. Keep the existing `0.02 fps` absolute tolerance because the selected metric should match the requested value closely.
6. Reject the output if neither a valid declared rate nor a valid fallback rate is available.

This rule applies only to verification of generated constant-frame-rate OGV output. Input probing continues to prefer `avg_frame_rate`, because average rate is appropriate when deriving a default target from variable-frame-rate source media.

## Diagnostics

Frame-rate verification errors must include:

- requested target rate;
- parsed declared rate and its original rational text;
- parsed statistical average and its original rational text;
- which metric was used for the decision.

This allows future reports to distinguish a genuine encoding mismatch from missing or malformed FFprobe metadata without preserving the temporary OGV file.

## Scope

- Change only generated OGV frame-rate verification and its focused tests.
- Do not change frame extraction, GPU upscale, Theora encoding arguments, audio encoding, input-media probing, UI frame-rate defaults, or the existing container/codec/pixel-format/resolution/audio checks.
- Keep failures blocking: an output with a genuinely wrong declared playback rate must not be moved into the selected output directory.

## Testing

Focused command tests will cover:

1. Declared rate matches target while statistical average differs by more than the tolerance: pass.
2. Declared rate differs while statistical average matches: fail.
3. Declared rate is unavailable and statistical average matches: pass through fallback.
4. Both rates are unavailable: fail with diagnostic values.
5. Genuine mismatch: fail with target, declared, average, and selected-metric details.
6. Existing Ogg, Theora, yuv420p, resolution, audio, and extra-stream validation remains unchanged.

The release gate remains `npm test`, `npm run build`, `git diff --check`, and a clean `git status`.

## Success Criteria

- The 451-frame / 15-second class of outputs is not rejected when the Theora declared rate matches the requested target.
- Arbitrary valid rates such as `24.03`, `29.94`, and `30.067` pass when their declared rates match.
- An output whose declared playback rate is genuinely wrong remains blocked.
- Error reports contain enough FFprobe rate data to diagnose future cases without reproducing the entire GPU job.
