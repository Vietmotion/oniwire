# Push Workflow (GitHub Pages)

This repository is served from `index.html` on GitHub Pages.

## Source of truth

- Development file: `oniwire_vX_Y_Z.html` (latest versioned file)
- Live site entry: `index.html`

## Required rule before push

Always sync the latest version file to `index.html` before pushing changes that should go live.

## Recommended steps

1. Make changes in the latest version file (example: `oniwire_v0_2_3.html`).
2. Sync latest version to `index.html`:
   - Preferred: `powershell -ExecutionPolicy Bypass -File .\scripts\sync-index.ps1`
   - Manual fallback: copy latest version file content into `index.html`.
3. Verify both files changed as expected.
4. Commit both files in the same commit when behavior/content changed.
5. Push to `main`.

## Quick checklist

- [ ] Latest file updated (`oniwire_vX_Y_Z.html`)
- [ ] `index.html` synced from latest file
- [ ] Commit includes both files
- [ ] Pushed to `origin/main`
