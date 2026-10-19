# OniRender v1 Spec (No-Manifest First)

## 1. Goal

Build a small offline app that converts a PNG image sequence folder into an MP4 file.

Primary objective:
- Works with sequences exported from Oniwire.
- Works with sequences from other software.
- Requires no manifest file to function.

## 2. Product Direction

v1 is sequence-to-video only.

Included in v1:
- Import PNG sequence folder.
- Auto-detect frame order/pattern.
- Let user set or confirm FPS.
- Encode MP4 (H.264).
- Show progress and clear errors.

Not included in v1:
- Frame range export.
- Alternate codecs (ProRes, VP9, AV1).
- Audio.
- Re-rendering graphs or effects.

## 3. Manifest Policy

Manifest is optional, not required.

Behavior:
- If manifest.json exists and is valid, prefill settings from it.
- If manifest.json is missing, run normal auto-detect flow.
- If manifest.json exists but is invalid, warn and continue with auto-detect.

Rationale:
- Keeps workflow open for external sequences.
- Maintains convenience for Oniwire exports.

## 4. User Workflow (Desktop UI)

### Screen A: Input
- Control: Select Folder.
- App scans all PNG files in folder.
- App detects candidate sequence groups.
- If more than one group is found, user chooses one.

### Screen B: Sequence Review
Show:
- Filename pattern (example: frame_%06d.png)
- First frame index
- Last frame index
- Total detected frames
- Missing frames (if any)
- Resolution (from first frame)

User inputs:
- FPS (default 30)
- Missing-frame behavior:
  - Stop on missing (default)
  - Duplicate previous frame
  - Skip missing frame

### Screen C: Output
- Control: Choose output MP4 path.
- Optional settings:
  - CRF (default 18)
  - Preset (default medium)
  - Pixel format (default yuv420p)
  - Background for alpha frames:
    - Black (default)
    - White
    - Custom color

### Screen D: Render
Show live progress:
- Current frame / total
- Percent
- Estimated time remaining
- Cancel button

### Screen E: Result
Show:
- Success/fail state
- Output path
- Duration
- Encoded file size
- Action buttons: Open folder, Render another

## 5. Sequence Detection Rules

Input scanning:
- Read only .png files (case-insensitive).
- Extract trailing numeric token from filename stem.
- Group by prefix + suffix + numeric padding width.

Example groups:
- frame_000001.png -> prefix "frame_", suffix "", padding 6
- shotA.0123.png -> prefix "shotA.", suffix "", padding 4
- img_001_final.png -> prefix "img_", suffix "_final", padding 3

Selection logic:
- If one valid group: auto-select.
- If multiple: present list sorted by frame count descending.

Validation:
- Must have at least 2 frames.
- All selected frames must have same resolution.
- Non-conforming files are ignored (and listed in diagnostics).

## 6. Missing Frame Policy

Default behavior in v1: stop on missing frame.

Alternative behaviors:
- Duplicate previous frame: preserve output duration.
- Skip missing frame: shortens effective frame count.

UI must clearly show chosen policy before render starts.

## 7. Alpha Handling

MP4 output is opaque in v1.

If PNG contains alpha:
- Composite over selected background color before encode.
- Default background is black.

Future extension:
- Optional alpha-preserving intermediate outputs (not v1).

## 8. Encoding Contract

Target encoder behavior (ffmpeg equivalent):
- Codec: H.264
- Pixel format: yuv420p
- CRF default: 18
- Preset default: medium

Equivalent command shape:
- ffmpeg -framerate <fps> -i <pattern> -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium <output.mp4>

## 9. Error Handling

Errors must be explicit and actionable.

Examples:
- No PNG files found in selected folder.
- Could not detect numbered sequence pattern.
- Frame dimensions mismatch at frame 002347.
- Missing frame 000128 (policy: stop on missing).
- Output path is not writable.
- Encoder failed (include short technical reason).

## 10. Install and Distribution

Recommended rollout path:
1. Windows portable executable first (fastest validation).
2. Installer package second (better mainstream UX).

Minimum UX expectation:
- User can run app by double-click.
- No command-line required for normal use.

## 11. Optional CLI (Power Users)

CLI can be added in v1 if low effort.

Example:
- onirender render --input "D:\\seq" --output "D:\\out.mp4" --fps 30 --crf 18 --preset medium

CLI should share the same detection and validation core as UI.

## 12. Implementation Milestones

Milestone 1: Core import + detect
- Folder picker
- Sequence grouping
- Review panel

Milestone 2: Encode pipeline
- Frame reader
- Alpha composite
- MP4 encode
- Progress + cancel

Milestone 3: Packaging
- Portable build
- Basic installer
- Smoke tests on large sequences

## 13. Acceptance Criteria

v1 is accepted when all are true:
- Can render Oniwire PNG sequence to MP4 successfully.
- Can render non-Oniwire PNG sequence to MP4 successfully.
- Handles at least one 600-frame sequence without app crash.
- Shows clear error when sequence is invalid.
- App can be launched by non-technical user on Windows.
