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

### 2026-04-21 - Mask/export stabilization (3-day struggle resolved)

- Symptoms observed across projects:
  - Pen/Shape -> Composite masks looked correct in live preview but failed in export.
  - PNG/JPG sometimes rendered full frame, blacked out, or had wrong apparent size.
  - MP4 initially failed with `Cannot call 'encode' on a closed codec`.
  - Dino scenes appeared horizontally stretched/fat in exported stills.

- Root causes (stacked):
  - `html2canvas` ignores CSS `mask-image`, so live CSS masks do not transfer automatically to exported canvas.
  - Full-frame premask (`destination-in`) is unsafe for non-image scenes and can wipe the frame.
  - MP4 encode loop could continue after async encoder failure/closure.
  - PNG alpha was lost because capture forced black background.
  - Deterministic image bake path could diverge from rendered layout in transformed/mixed chains.
  - Direct Image -> Output path could still distort because cloned image object-fit was not always faithfully captured by `html2canvas`.

- Final fixes that produced stable behavior:
  - Enabled per-element masked baking for html2canvas capture (preferred path for masked content).
  - Kept premask restricted to image scenes only: `hasMaskInScene && hasImagesInScene`.
  - For animated MP4 masks, rebuild premask per frame only when mask motion exists.
  - Guarded MP4 encode loop with encoder state/failure checks and always `frame.close()` in `finally`.
  - Preserved PNG alpha via per-call transparent capture (`backgroundColor: null`) and alpha-aware snapshot fallback.
  - Relaxed tiny aspect-ratio tolerance in fit helper to reduce minor visual size drift.
  - For deterministic masked single-image bake, switched to rendered/computed image metrics as source of truth.
  - Disabled deterministic single-image bake when transformed subtree is detected (fallback to isolated html2canvas path).
  - Added pre-bake of object-fit images in cloned export DOM before html2canvas capture (`bakeCloneImagesForCapture(tmpWrap)`) to fix direct Image -> Output stretching.
  - Restored missing Output inspector `Animation JSON` button and hardened export click handlers to avoid silent no-op failures (async error toast + alias IDs).
  - Stabilized Lottie export for Heart/Pen graphs by:
    - fixing composite mask content indexing (`buildCompositeContent(startInd + 1)`),
    - adding `Pen` support via rasterized embedded image assets,
    - applying accumulated composite transform/motion to mask matte decode so full masked shape pulses (not only inner content).

- Guardrails going forward:
  - When preview works but export fails, debug capture path first, not node graph logic.
  - Keep still and MP4 mask safety rules aligned to avoid path drift.
  - Treat deterministic image bake as an optimization; disable it in any ambiguous/transformed scene.
  - Before large refactors, add a quick regression matrix: heart mask scene, dino scene, mixed image+text, animated mask, direct image output.

### 2026-06-03 - Stylize + Mask export regression (geometry drift, missing stylize, mask misalignment)

- Symptoms:
  - Export output not centered while viewport stayed centered.
  - Stylize look (especially brutal mapping) missing or downgraded in export.
  - Pen mask and image content rendered out-of-place or split (shape + rectangular strip mismatch).

- Root causes:
  - Still export prioritized a live-capture branch for filter scenes, then applied premask afterward; this diverged from clone+bake geometry and caused placement drift.
  - Filter pre-bake path initially replaced filtered descendants too aggressively and did not always preserve full style/layout context.
  - Isolated filtered capture did not initially run the same image/mask normalization helpers as the main export path.
  - Deterministic masked single-image optimization could misclassify mixed-content masked subtrees as image-only.
  - Stylize brutal mode relied on `filter: url(#...)`; generic canvas filter handling for SVG URL filters was inconsistent.

- Fixes applied:
  - Reordered still export capture strategy to prefer clone+bake capture first (`captureFrameCanvasWithHtml2canvas`), using live capture only as fallback.
  - Kept masked-element baking enabled in still export path even when filter effects are present.
  - Hardened filtered pre-bake:
    - bake only top-most filtered elements,
    - preserve full inline style (`cssText`) when replacing with baked image,
    - skip tiny utility elements.
  - In isolated filtered capture, explicitly ran:
    - `bakeCloneImagesForCapture(...)`
    - `bakeMaskedElementsForHtml2canvas(...)`
    before html2canvas capture.
  - Tightened deterministic masked-image eligibility to reject masked subtrees containing visible non-image painted content.
  - Added SVG URL-filter raster fallback for brutal-style mapping by parsing `feComponentTransfer` tables and applying equivalent pixel mapping in canvas.

- Prevention rules for future nodes:
  - Any new visual node must define export behavior for both preview and clone-capture paths before release.
  - If a node uses CSS features html2canvas may ignore (`filter`, `mask`, blend combinations), add explicit pre-bake logic at implementation time.
  - Never route filter scenes to a different still-capture primary path unless centering/mask parity is validated against clone capture.
  - Keep MP4 frame capture order aligned with PNG/JPG still capture order. If still export is fixed by clone+bake, MP4 must use the same primary path.
  - Do not disable masked-element baking just because filter effects exist; this breaks mask/image positional parity in mixed Stylize+Mask scenes.
  - Treat deterministic image-only bake as opt-in optimization; default to full subtree capture when ambiguity exists.
  - Add node-level regression checks: viewport parity, center alignment, mask alignment, stylize parity, and mixed-content masked scenes.

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

## Render System Contract (Scalable Guardrails)

This section defines the long-term contract for keeping preview, PNG/JPG, and MP4 behavior aligned as new nodes and effects are added.

### 1) Core Logic Model

- Preview is the visual source of truth.
- Export is a deterministic reconstruction of preview via clone + bake + capture.
- Any effect unsupported by the capture engine (for example CSS filter/mask combinations) must be explicitly baked before capture.
- PNG/JPG and MP4 must share the same primary frame-capture strategy and helper order.

Canonical capture order (still and MP4):

1. Clone render root into isolated wrapper.
2. Wait for renderable images.
3. Bake image object-fit/object-position into pixel-stable images.
4. Bake filter-dependent content (including SVG URL filter fallback where needed).
5. Bake masked elements.
6. Capture with html2canvas.
7. Apply premask only when masked-element bake did not run.
8. Fall back to live/snapshot capture only on failure.

### 2) Why It Broke

The 2026-06-03 regression happened because the contract above was violated in multiple places:

- MP4 and still paths diverged (different primary branches for filter scenes).
- Filter scenes routed to live capture first, while still path relied on clone+bake.
- Mask bake was disabled in some filter branches.
- Deterministic image-only optimization was allowed in mixed-content masked subtrees.

Result: center drift, mask/image misalignment, and stylize parity failure.

### 3) Non-Negotiable Invariants

- Path parity invariant:
  - MP4 first-frame capture and PNG capture must use the same primary helper sequence.
- Mask invariant:
  - Never disable masked-element bake only because filter effects exist.
- Optimization invariant:
  - Deterministic single-image bake is opt-in and must be rejected when subtree ambiguity exists.
- Geometry invariant:
  - Replaced/baked elements must preserve full inline layout/transform style context.
- Fallback invariant:
  - Fallbacks are for failure recovery, not normal routing for specific node categories.

### 4) Node Onboarding Checklist (Before New Node Ships)

For each new node type or major node update:

1. Classify rendering features used:
   - filter, mask, blend, transform, animated style, foreignObject dependencies.
2. Define explicit export strategy:
   - direct capture-safe OR requires pre-bake helper.
3. Add node to regression matrix scenes:
   - static, animated, masked, mixed-content, with/without motion.
4. Verify parity:
   - preview vs PNG first frame vs MP4 first frame.
5. Verify stability:
   - no center shift, no mask drift, no stylize loss.
6. Document helper assumptions in this log.

### 5) Fast Recovery Playbook

When a future render mismatch appears:

1. Identify actual capture path used (do not guess).
2. Compare helper order between preview-success format and failing format.
3. Check if mask/filter/image bake helpers were skipped or reordered.
4. Check deterministic optimization gating conditions.
5. Force parity path first; only then tune optimizations.
6. Capture and store one minimal failing graph as permanent regression fixture.

### 6) Practical Rule For Scale

- Treat rendering as a pipeline contract, not ad-hoc per-format logic.
- Every new feature must either:
  - conform to existing pipeline stages, or
  - add a new stage used consistently by still + MP4.
- If a fix is applied to one export format, parity audit for the other format is required before closing the issue.