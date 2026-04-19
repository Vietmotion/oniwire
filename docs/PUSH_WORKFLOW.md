# Push Workflow (GitHub Pages)

GitHub Pages serves this project from `index.html`.
If `index.html` is not synced, the live site will show an old version even if a newer `oniwire_vX_Y_Z.html` exists.

## Live publish rule (must follow)

1. Build/edit in the latest version file (`oniwire_vX_Y_Z.html`).
2. Sync latest version file into `index.html`.
3. Commit and push.

Never push a new version file without syncing `index.html` when your goal is to update the live site.

## Standard release commands

Run from repo root:

1. Sync:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\sync-index.ps1`
2. Verify `index.html` is on the expected version:
   - `git diff -- index.html`
   - Optional quick check: search title inside `index.html` for `vX.Y.Z`.
3. Commit:
   - `git add index.html oniwire_vX_Y_Z.html`
   - `git commit -m "release: vX.Y.Z sync index"`
4. Push:
   - `git push origin main`

## Fast fix (if wrong version is live)

If the live site still shows an old version:

1. Run sync script again.
2. Commit only `index.html` if needed:
   - `git add index.html`
   - `git commit -m "deploy: sync index to vX.Y.Z"`
3. Push to `main`.

## Post-push verification

1. Confirm remote has your latest commit:
   - `git log --oneline -n 3`
2. Wait 1 to 3 minutes for Pages build.
3. Hard refresh browser (`Ctrl+F5`) or open in private window.

## Pre-push checklist

- [ ] I changed the intended `oniwire_vX_Y_Z.html` file.
- [ ] I synced `index.html` using `scripts/sync-index.ps1`.
- [ ] I verified `index.html` contains the target version title.
- [ ] My commit includes `index.html` for any live-site update.
- [ ] I pushed to `origin/main`.
