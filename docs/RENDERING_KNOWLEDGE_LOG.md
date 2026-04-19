# Rendering Knowledge Log

Purpose: keep a durable record of rendering/export failures, root causes, fixes, and prevention rules as new formats and render paths are added.

## Current Render / Export Paths

- Live preview: DOM/CSS render inside `renderRoot`.
- PNG/JPG export: offscreen clone + `html2canvas` capture, then canvas blob export.
- MP4 export: offscreen clone + `html2canvas` frame capture, then WebCodecs H.264 + `mp4-muxer`.
- Embed / JSON / Lottie exports: separate runtime/export paths in `scripts/export.js` and related node renderers.

Important rule:
- Do not assume two export formats use the same renderer. Verify the actual code path before debugging.

## Incident Log

### 2026-03-22 - Motion looked static in export

- Symptom: motion nodes appeared static in exported output.
- Root cause: old export capture relied on `renderLayerToDataUrl(renderRoot)`, which did not preserve animated computed styles correctly.
- Fix: moved export capture toward offscreen clone + `html2canvas` path.
- Prevention: any animated scene should be tested on at least one motion-heavy sample before changing export helpers.

### 2026-03-26 - Mask / motion regression risk

- Symptom: animated mask input could blank preview unexpectedly.
- Root cause: stage of failure was unclear; likely mismatch between mask generation and mask application timing.
- Follow-up: raw-mask inspection/debug overlay was identified as the right next debugging tool.
- Prevention: when mask + motion are both involved, debug mask generation and mask application as separate stages.

### 2026-03-29 - Export captured before images were ready

- Symptom: DOM snapshot export could miss image content.
- Root cause: cloned `<img>` elements were captured before decode/render completed.
- Fix: added `waitForRenderableImages()` before snapshot/capture.
- Prevention: any clone-based renderer must wait for image decode before capture.

### 2026-04-10 - Screen-share MP4 path rejected

- Symptom: browser showed share-surface picker during MP4 export.
- Root cause: `navigator.mediaDevices.getDisplayMedia()` always requires explicit browser permission/selection.
- Fix: removed screen-share export path and restored in-app frame capture.
- Prevention: do not use browser screen-capture APIs for normal export UX unless explicit share-dialog behavior is acceptable.

### 2026-04-10 - Animated MP4 masks drifted or broke

- Symptom: moving masks could render incorrectly in MP4.
- Root cause: precomputed mask canvas was built once and reused across all frames.
- Fix: detect mask motion and rebuild mask canvas per frame when needed.
- Prevention: any frame-based export using cached intermediates must explicitly validate whether those intermediates are time-dependent.

### 2026-04-10 - MP4 fps diverged from project settings

- Symptom: MP4 export always used 30 fps even when project/output settings differed.
- Root cause: hardcoded export fps.
- Fix: read fps from Output/project settings with safe clamp and fallback.
- Prevention: keep Save/Load/Preview/Export driven by the same source-of-truth params whenever possible.

### 2026-04-10 - PNG/JPG exported text only on black background

- Symptom: still-image export lost masked image content and kept only text over black.
- Root cause: PNG/JPG export called `renderLayerToDataUrl(renderRoot)` first. That SVG/foreignObject-style path could return a non-null but visually incomplete result for image + CSS mask scenes, so fallback capture never ran.
- Fix: switched PNG/JPG export to the same `captureFrameCanvasWithHtml2canvas()` path used successfully by MP4.
- Prevention:
  - Treat `renderLayerToDataUrl()` as a limited/simple renderer, not the authoritative path for complex scenes.
  - Do not trust non-null output alone; validate visual completeness for masks, images, and motion.
  - When one format works and another does not, compare the actual capture function first.

### 2026-04-10 - CDN-only export dependencies were fragile

- Symptom: export could fail when CDN access was blocked or unavailable.
- Root cause: `html2canvas` and `mp4-muxer` were loaded only from network CDNs.
- Fix: added local vendor copies with fallback order: local vendor -> jsdelivr -> unpkg.
- Prevention: critical export dependencies should have a local-first load path.

### 2026-04-19 - Motion worked in code, but appeared broken in app

- Symptom: `Motion - Act` appeared non-functional for `Pen -> Motion - Act` and `Text -> Motion - Act` graphs.
- Root cause: stale browser cache served older `scripts/nodes/motion.js` and `scripts/export.js` because script query versions in the HTML entry were outdated.
- Conflict pattern: runtime behavior can mismatch repository code when script version tokens are behind file changes.
- Fix:
  - bumped script query versions in the app HTML (`motion.js` and `export.js`),
  - synced latest version file into `index.html`,
  - pushed deploy commit.
- Prevention:
  - whenever runtime JS changes, update script cache-busting query values in the live HTML entry,
  - treat "works in source but not in browser" as a cache/version-drift check before deep renderer refactors,
  - always include `index.html` sync in live-site pushes.

## High-Risk Areas

- CSS masks and alpha-composite behavior.
- Animated masks and any time-varying cached intermediate.
- Cross-origin images and delayed image decode.
- Divergence between preview renderer and export renderer.
- Divergence between MP4 path and PNG/JPG path.
- Fallback logic that accepts non-null but incomplete image output.
- Script cache/version drift between changed JS files and stale HTML query tokens.

## Prevention Checklist For New Render Methods / Formats

Before merging a new render path:

1. Test a plain text scene.
2. Test image + text composite.
3. Test image masked by Pen/Shape.
4. Test animated mask.
5. Test motion-only animation.
6. Test cross-origin or uploaded image assets.
7. Test transparent output expectations versus solid background expectations.
8. Compare first frame between preview, PNG, JPG, and MP4.
9. Verify fps/duration come from the same output settings used elsewhere.
10. Verify offline behavior if the path depends on external libraries.
11. If renderer-related JS changed, verify script query versions are updated in the live HTML entry.

## Debugging Rules

- Start by identifying the exact renderer in use. Do not debug the wrong path.
- If one export format works and another fails, diff the capture/helper functions before changing node logic.
- For mask bugs, inspect these stages separately:
  - source layer render
  - mask render
  - mask application/composite
- For image bugs, confirm decode timing in the cloned/offscreen DOM.
- For animation bugs, verify whether any cached canvas/data URL is being reused across frames.
- For fallback chains, log which fallback actually executed.
- For "code looks correct but runtime still broken", validate browser cache/version drift first (script query tokens and hard refresh).

## Suggested Future Additions

- Add a debug toggle to preview/export raw mask frames.
- Add lightweight export diagnostics that record which capture path ran (`renderLayerToDataUrl`, `html2canvas`, SVG path, etc.).
- Add a reusable export test scene pack covering text, image, mask, motion, and mixed composites.
- Add a short "render path changed" checklist to future dev logs whenever export logic is modified.