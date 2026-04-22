# Push Workflow (GitHub Pages)

GitHub Pages serves this project from `index.html`.
If `index.html` is not synced, the live site will show an old version even if a newer `oniwire_vX_Y_Z.html` exists.

## Live publish rule (must follow)

1. Build/edit in the latest version file (`oniwire_vX_Y_Z.html`).
2. Sync latest version file into `index.html`.
3. Commit and push.

## Required release stamp (day + time)

For every live push, append a local timestamp after the visible version label so you can confirm freshness instantly.

Use this format everywhere the user sees version text:

- `vX.Y.Z | YYYY-MM-DD HH:mm`
- Example: `v0.2.3 | 2026-04-19 23:40`

Minimum places to update before push:

1. `title` in HTML head.
2. Help "Latest Update" header text (`What changed in v...`).
3. Help "Latest in v..." section title.

Never push a new version file without syncing `index.html` when your goal is to update the live site.

## Standard release commands

Run from repo root:

1. Sync:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\sync-index.ps1`
2. Verify `index.html` is on the expected version:
   - `git diff -- index.html`
   - Required quick check: search title/help labels inside `index.html` for `vX.Y.Z | YYYY-MM-DD HH:mm`.
3. Commit:
   - `git add index.html oniwire_vX_Y_Z.html`
   - `git commit -m "release: vX.Y.Z YYYY-MM-DD HH:mm sync index"`
4. Push:
   - `git push origin main`

## Fast fix (if wrong version is live)

If the live site still shows an old version:

1. Run sync script again.
2. Commit only `index.html` if needed:
   - `git add index.html`
   - `git commit -m "deploy: sync index to vX.Y.Z YYYY-MM-DD HH:mm"`
3. Push to `main`.

## Post-push verification

1. Confirm remote has your latest commit:
   - `git log --oneline -n 3`
2. Wait 1 to 3 minutes for Pages build.
3. Hard refresh browser (`Ctrl+F5`) or open in private window.

## Pre-push checklist

- [ ] I changed the intended `oniwire_vX_Y_Z.html` file.
- [ ] I updated visible version labels to `vX.Y.Z | YYYY-MM-DD HH:mm`.
- [ ] I synced `index.html` using `scripts/sync-index.ps1`.
- [ ] I verified `index.html` contains the target version + timestamp label.
- [ ] My commit includes `index.html` for any live-site update.
- [ ] I pushed to `origin/main`.
