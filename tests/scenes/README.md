# Regression Scene Pack

This folder holds the canonical scene pack for render/export parity testing.

## Files

- scene-pack.json: source of truth for scene ids, coverage, and fixture source.
- fixtures/: imported Oniwire animation payloads used as stable seeds.

## Current state

- Seeded scenes from existing project exports: S01, S02.
- Remaining required scenes are listed as manual-build in scene-pack.json and should be created in the editor, then exported into fixtures with matching scene ids.

## Naming rules

- Fixture payload path: tests/scenes/fixtures/<scene-id>.json
- Baseline snapshot folder: tests/snapshots-baseline/<scene-id>/
- Avoid renaming scene ids after baselines are captured.
