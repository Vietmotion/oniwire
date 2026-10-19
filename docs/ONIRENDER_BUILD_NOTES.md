# OniRender Build Notes

## Created scaffold

- Project root: `onirender/`
- Stack: Electron + ffmpeg-static
- Entry points:
  - `onirender/main.js`
  - `onirender/preload.js`
  - `onirender/src/index.html`
  - `onirender/src/renderer.js`

## Current capabilities

- Pick folder and detect PNG numbered sequence groups.
- Show sequence metadata and missing-frame summary.
- Pick output MP4 path.
- Render sequence to H.264 MP4 via ffmpeg.
- Show frame progress and allow cancel.
- Playback-safe default: H.264 4:2:0 (`yuv420p`, high profile, CRF 16, preset slow, tune animation), with automatic fallback to a more compatible profile if needed.

## Current limitations

- Missing-frame fallback policies are not implemented yet (only strict mode practical for now).
- Output options are fixed (CRF/preset/pix_fmt hardcoded).
- Packaging installer is not yet configured.

## 2026-07-12 Final Tuning Pass (Session Wrap)

- Encoder tuned away from all-intra GOP to short-GOP (g=FPS) to reduce perceived playback lag in common desktop players.
- Color signaling switched to full-range BT.709 (`color_range=pc`, `fullrange=on`) for closer sequence-to-mp4 color match.
- CFR forcing kept (`-r`, `-vsync cfr`, `force-cfr=1`) to avoid timing drift.

### Known Remaining Differences (to revisit)

- Slight color delta can still appear depending on player color management.
- Slight motion feel differences can still appear depending on decode performance and player pipeline.
- PNG sequence capture in the web app was stabilized by aligning branch order with still-export path; large scenes should be validated against that baseline before adding new optimizations.
