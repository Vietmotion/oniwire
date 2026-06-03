# Baseline Capture Workflow (Phase 0)

This workflow captures the first parity baseline for the v0.3 rebuild.

## Preconditions

- Scene pack exists: tests/scenes/scene-pack.json
- Snapshot index exists: tests/snapshots-baseline/BASELINE_INDEX.md
- Snapshot folders exist under tests/snapshots-baseline/<scene-id>/

## Step 1 - Load each scene

For each scene id in scene-pack.json:

1. If status is seeded:
- Import the fixture json from tests/scenes/fixtures/<file>.json into the app.

2. If status is todo/manual-build:
- Build the scene in editor using the instructions field.
- Export the project payload and save to tests/scenes/fixtures/<scene-id>.json.

## Step 2 - Capture required outputs

For each scene, capture and save:

- preview.png
- export.png
- export.jpg
- mp4_f000.png
- mp4_fmid.png
- mp4_fend.png
- embed_f000.png
- embed_fmid.png
- embed_fend.png

Save files in:
- tests/snapshots-baseline/<scene-id>/

## Step 3 - Update baseline index

Mark TODO entries in tests/snapshots-baseline/BASELINE_INDEX.md as DONE and add notes for any mismatch.

## Step 4 - Run status command

Use this command from repo root:

- npm.cmd run regression:status

Note:
- In this Windows environment, npm may be blocked by PowerShell execution policy.
- If that happens, use npm.cmd instead of npm.

## Exit condition for Phase 0

- All scenes have required snapshot files.
- regression:status reports zero missing snapshots.
