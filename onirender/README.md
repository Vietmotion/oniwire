# OniRender (v0.1 scaffold)

Minimal desktop tool to convert a PNG sequence folder into MP4.

## Run locally

1. Open terminal in this folder:

```powershell
cd onirender
npm install
npm start
```

2. In app:
- Select PNG folder
- Select detected sequence
- Set FPS
- Choose output mp4 path
- Render

## Notes

- Works with numbered PNG file names (for example `frame_000001.png`).
- Uses ffmpeg-static (bundled ffmpeg binary from npm package).
- Current render mode targets contiguous frame sequences.
- Encoding defaults to playback-safe H.264 (`yuv420p`, high profile, CRF 16, preset slow, tune animation).
- If primary encode settings fail, OniRender automatically falls back to a more compatible H.264 path.
- PNG alpha is explicitly composited to a black background in ffmpeg before MP4 conversion to avoid jagged edge artifacts from alpha drop.
- Output is forced to CFR at the selected FPS and tagged/converted as BT.709 to reduce timing jitter and color-matrix drift.
