# Oniwire v0.3 Execution Checklist

Use this as the live tracker while implementing the rebuild plan.

## Phase 0 - Baseline Lock

- [ ] Freeze non-critical feature work.
- [x] Confirm canonical live source flow is unchanged (version file -> index sync).
- [x] Build regression scene pack from existing projects.
- [ ] Capture baseline outputs for each scene: preview screenshot, PNG, JPG, MP4 sampled frames, embed sampled frames.
- [x] Store baseline artifacts under tests/snapshots-baseline/.

## Phase 1 - Core Setup

- [x] Create src/core/scene schema definitions.
- [x] Create src/core/eval graph traversal with deterministic ordering.
- [x] Add scene schema validator and readable error messages.
- [ ] Add adapter diagnostics payload (adapter name, fallback used, frame/time).

## Phase 2 - Still Renderer (PNG/JPG)

- [ ] Implement scene-tree-driven still renderer.
- [ ] Validate text wrap, alignment, and fill parity.
- [ ] Validate image object-fit/object-position parity.
- [ ] Validate composite blend/opacity stacking parity.
- [ ] Validate shape + pen mask alpha behavior.

## Phase 3 - Video Renderer (MP4)

- [ ] Reuse still renderer frame function for MP4 frames.
- [ ] Ensure per-frame mask rebuild only when mask/motion is time-varying.
- [ ] Add encoder guardrails (state/failure checks, frame close in finally).
- [ ] Validate fps/duration from output settings only.

## Phase 4 - Embed Runtime

- [ ] Build scene-tree playback loop for embed path.
- [ ] Keep unsupported feature matrix explicit.
- [ ] Verify motion parity with preview for supported nodes.

## Phase 5 - Preview Alignment

- [ ] Move preview adapter to consume same scene semantics.
- [ ] Keep preview-only visual optimizations behind flags.
- [ ] Verify first-frame and mid-frame parity against still/video adapters.

## Phase 6 - Release Reliability

- [ ] Add build-id injection for script URLs (remove manual query edits).
- [ ] Add pre-release parity check command.
- [ ] Add deploy checklist gate for cache/version sync.

## Required Scene Matrix

- [ ] Text multiline + box wrap.
- [ ] Shape + Gradient fill.
- [ ] Image + Text mixed composite.
- [ ] Image masked by Pen/Shape.
- [ ] Animated mask + motion.
- [ ] Nested composite + blend modes.
- [ ] Transform chain + Stylize + mask.
- [ ] Direct image output stress case.
- [ ] Transparent PNG output case.

## Exit Criteria

- [ ] No blocker regressions on scene matrix.
- [ ] Preview/PNG/MP4 parity within agreed tolerance.
- [ ] Adapter diagnostics visible in export logs.
- [ ] Build/deploy flow no longer depends on manual cache token edits.
