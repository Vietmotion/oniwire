# Oniwire v0.3 Rebuild Plan (2026-05-16)

## Goal

Rebuild Oniwire with a clear architecture so preview, PNG/JPG, MP4, and embed outputs are consistent, testable, and easier to maintain.

Primary outcome:
- One render core behavior model shared by all output modes.
- Export paths become adapters, not separate feature implementations.
- Failures become detectable by tests before release.

## Why Rebuild (Observed Pattern)

From project logs and rendering notes, recurring incidents come from the same structural issues:
- Divergent render paths (preview DOM/CSS, still capture, MP4 frame capture, embed runtime, Lottie serializer).
- Mask behavior differences between CSS masks and capture tools.
- Cache/version drift where runtime served stale JS despite source fixes.
- Repeated parity bugs around motion, text, blend, and composite semantics.

This is not a single bug; it is an architecture risk.

## Root Problems To Solve

1. Too many parallel render implementations
- Node semantics are duplicated across preview/export/embed branches.

2. Render intent and render execution are mixed
- Graph evaluation, style composition, and output encoding are tightly coupled.

3. No stable render contract
- There is no single intermediate representation that all output paths consume.

4. No automated regression guardrail
- Fixes rely on manual visual checks, which miss edge cases and regressions.

5. Deployment reliability gaps
- Cache busting is manual and error-prone.

## v0.3 Architecture

### A. Core graph engine (single source of truth)

Create a pure evaluation layer:
- Input: graph + time + project/output settings.
- Output: frame scene tree (typed render instructions).

Responsibilities:
- Resolve node graph deterministically.
- Evaluate motion and transform at time t.
- Normalize masks, blends, opacity, and bounds.
- Produce a scene tree independent from DOM/canvas/html2canvas.

### B. Scene tree contract

Define a stable schema for render instructions:
- Scene
- Group
- ShapePath
- TextBlock
- ImageLayer
- CompositeGroup
- MaskLayer
- EffectLayer

Each node carries:
- id
- local transform matrix
- bounds
- opacity
- blend mode
- timing state
- optional mask descriptor

### C. Renderer adapters (thin)

Adapters consume the same scene tree:
- Preview adapter (DOM/canvas hybrid).
- Still adapter (PNG/JPG capture).
- Video adapter (MP4 frame encoder).
- Embed adapter (portable playback runtime).
- Optional Lottie adapter (feature-gated, not parity-guaranteed by default).

Rule:
- Adapters do not re-implement node semantics.
- Adapters only map scene tree primitives to output technology.

### D. Export pipeline separation

Split export into stages:
1) Evaluate scene tree for frame(s).
2) Render scene tree to frame buffers.
3) Encode output format.

This prevents rendering logic from leaking into file-format code.

### E. Unified mask strategy

Stop relying on CSS mask fidelity in capture tools.
- Resolve masks in render core as alpha operations.
- Render masks explicitly into alpha buffers for still/video/export adapters.
- Keep CSS masks only as optional preview optimization.

### F. Versioning and cache safety

Introduce build id injection:
- Single app version token generated at build/deploy.
- All script tags use that token automatically.
- No manual query param edits.

## Proposed Directory Restructure

Target structure (incremental migration):

- src/core/
  - graph/
  - eval/
  - scene/
  - timing/
- src/renderers/
  - preview/
  - still/
  - video/
  - embed/
  - lottie/
- src/export/
  - png/
  - jpg/
  - mp4/
  - embed/
  - lottie/
- src/nodes/
  - registry/
  - defs/
  - inspectors/
- src/app/
  - state/
  - ui/
  - commands/
- tests/
  - scenes/
  - snapshots/
  - parity/

Current code can remain during migration; v0.3 modules can be introduced alongside existing scripts first.

## Migration Strategy (Low Risk)

### Phase 0 - Freeze and baseline
- Freeze feature work except critical fixes.
- Build canonical regression scene pack.
- Capture baseline outputs for preview/PNG/JPG/MP4/embed.

### Phase 1 - Extract graph evaluation core
- Move graph traversal and time evaluation into pure modules.
- Keep old renderers consuming compatibility wrappers.

### Phase 2 - Introduce scene tree
- Add scene tree schema and converter from current graph state.
- Implement strict validation for schema.

### Phase 3 - Rebuild still renderer first
- Implement PNG/JPG adapter from scene tree.
- Match current expected outputs on scene pack.

### Phase 4 - Rebuild MP4 on top of still renderer frames
- Reuse same frame renderer used by still path.
- Add encoder-only concerns (fps, bitrate, muxing).

### Phase 5 - Rebuild embed runtime from scene tree playback
- Keep embed runtime minimal and deterministic.
- Feature-gate unsupported nodes explicitly.

### Phase 6 - Preview adapter parity pass
- Align preview to scene tree semantics.
- Allow preview-only visual sugar behind flags, never affecting export semantics.

### Phase 7 - Optional Lottie hardening
- Keep Lottie as a compatibility adapter with explicit support matrix.

## Regression Scene Pack (Must Have)

Maintain fixed test projects:
1. Plain text and multiline box-wrap text.
2. Shape + gradient fill.
3. Image + text mixed composite.
4. Shape/Pen mask over image.
5. Animated mask over moving content.
6. Motion-only scene (rotate, pulse, position).
7. Nested composite with blend/opacity.
8. Transform chain with mask and stylize.
9. Direct image output object-fit stress.
10. Transparent background PNG case.

For each scene verify:
- Preview visual
- PNG frame
- JPG frame
- MP4 first/mid/last frame
- Embed playback sampled frames

## Definition of Done for v0.3

- At least 95% parity across regression scene pack between preview and PNG/MP4 sampled frames.
- No known black-frame or full-canvas mask regression in pack.
- No manual script-query cache bumps required in release flow.
- Export path emits diagnostics that identify active renderer adapter and fallback path.
- Add release checklist run before deploy.

## Immediate Next Actions (Start Now)

1. Create src/core scaffold with scene schema and validator.
2. Add tests/scenes JSON fixtures from existing sample projects.
3. Build a frame compare utility (pixel diff threshold + report).
4. Port one node family end-to-end first: Shape + Transform + Motion.
5. Add release script that writes build id into HTML script URLs.

## Operating Rules During Rebuild

- No hidden behavior changes; all semantic changes must be documented in log.
- One feature flag per experimental renderer change.
- Never mix architecture refactor and bugfix bundles in the same commit.
- Every render bug report must include: active adapter, scene id, frame timestamp.
