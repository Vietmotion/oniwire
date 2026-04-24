# Push Workflow (GitHub Pages)

> **Hard rule:** Every push that touches the live app MUST include a synced `index.html`.
> Skipping this is the single most common cause of the app appearing frozen or loading a stale version.

GitHub Pages serves this project from `index.html`.
Editing `oniwire_vX_Y_Z.html` alone — no matter how many times you push — does **not** update the live site.

---

## Step-by-step release (do every time, no exceptions)

### Recommended fast path (safe one-command deploy)

From repo root, run:

```powershell
npm run deploy-pages -- "deploy: vX.Y.Z YYYY-MM-DD HH:mm ruler fix"
```

This command now does the full release flow automatically:
- Syncs `index.html` from the latest `oniwire_vX_Y_Z.html`
- Stages changes
- Commits (if needed)
- Pushes to `origin/main`

Use the detailed manual steps below if you need to inspect each stage.

### 1. Edit in the version file

All code changes go into `oniwire_vX_Y_Z.html` (and any supporting files like `styles.css`, `scripts/`).
Do **not** edit `index.html` directly.

### 2. Update the release stamp (day + time)

Before syncing, update the timestamp in **three places** inside `oniwire_vX_Y_Z.html`:

| Location | What to change | Format |
|---|---|---|
| `<title>` in HTML head | `Oniwire (vX.Y.Z \| YYYY-MM-DD HH:mm)` | e.g. `Oniwire (v0.2.3 \| 2026-04-23 20:00)` |
| Help → Latest Update `title` field | `"What changed in vX.Y.Z \| YYYY-MM-DD HH:mm"` | same format |
| Help → `helpSectionTitle` | `Latest in vX.Y.Z — YYYY-MM-DD HH:mm` | visible in the Help panel |

Also bump the CSS cache-bust query string on the same line as the `styles.css` link:

```html
<link rel="stylesheet" href="styles.css?v=YYYYMMDD-HHmm">
```

This forces browsers to fetch the latest CSS and prevents the stale-style freeze on first load.

### 3. Sync `index.html`

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-index.ps1
```

### 4. Verify the sync worked

```powershell
git diff -- index.html
```

Confirm the diff shows:
- Updated `<title>` with new timestamp
- Updated `styles.css?v=` query string
- Updated Help section titles

If `git diff` shows no changes to `index.html`, the sync did not run — stop and re-run step 3.

### 5. Commit — always include both files

```powershell
git add index.html oniwire_vX_Y_Z.html
git commit -m "deploy: vX.Y.Z YYYY-MM-DD HH:mm sync index"
```

A commit that includes `oniwire_vX_Y_Z.html` but **not** `index.html` will leave the live site on the old build.

### 6. Push

```powershell
git push origin main
```

---

## Post-push verification (always do this)

1. Confirm the commit reached remote:
   ```powershell
   git log --oneline -n 3
   ```
2. Wait 1–3 minutes for GitHub Pages to rebuild.
3. Open the site in a **private/incognito window** (bypasses local browser cache).
4. Open Help → Latest Update and confirm the timestamp matches what you just pushed.

---

## Fast fix — if the live site is frozen or on the wrong version

This means `index.html` was not included in the last push. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-index.ps1
git add index.html
git commit -m "deploy: fix sync index to vX.Y.Z YYYY-MM-DD HH:mm"
git push origin main
```

Then follow post-push verification above.

---

## Pre-push checklist

Run through this before every push that goes to the live site:

- [ ] All code changes are in `oniwire_vX_Y_Z.html` (not in `index.html` directly).
- [ ] `<title>` updated to `vX.Y.Z | YYYY-MM-DD HH:mm`.
- [ ] `styles.css?v=YYYYMMDD-HHmm` cache-bust query updated.
- [ ] Help → Latest Update `title` and section heading updated with timestamp.
- [ ] `sync-index.ps1` was run and completed successfully.
- [ ] `git diff -- index.html` confirms the timestamp and CSS version are present.
- [ ] `git add` includes **both** `index.html` and `oniwire_vX_Y_Z.html`.
- [ ] Pushed to `origin/main`.
- [ ] Verified live site in private window shows the correct timestamp in Help → Latest Update.
