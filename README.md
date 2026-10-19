# Oniwire

Oniwire is a browser-based node editor for creating visual animations. Connect nodes to build scenes, preview them interactively, and export animations for use on the web or in other creative tools.

## Getting Started

Use a recent version of Chrome or Edge. From the repository root, start a local web server:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/oniwire_v0_2_8.html> to work with the current development version. The app stores settings and saved projects in the browser's local storage, so they are specific to that browser profile.

Some fonts and export-library fallbacks are loaded from external services. A network connection may be needed for those resources.

## Project Layout

- `oniwire_v0_2_8.html`: current development version of the editor.
- `index.html`: entry point served by GitHub Pages.
- `scripts/` and `scripts/nodes/`: editor behavior, node definitions, and export support.
- `styles.css`: shared editor styles.
- `vendor/`: locally bundled browser libraries used by the editor.
- `embed_player.html` and `WEB_EMBEDDING_GUIDE.md`: animation embed player and integration guide.
- `onirender/`: separate Electron utility for converting PNG sequences to MP4.
- `tests/` and `docs/`: regression fixtures and project notes.

## Checks

Run the core scene smoke test and inspect regression snapshot coverage with:

```powershell
npm run core:smoke
npm run regression:status
```

## GitHub Pages

Before publishing a new editor version, run:

```powershell
npm run sync-index
```

This copies the highest numbered root-level `oniwire_v*.html` file to `index.html`. Review the resulting changes before committing. The `npm run deploy-pages` script stages **all** working-tree changes, commits them, and pushes to `main`; do not use it when unrelated or unfinished files are present.

## Third-Party Components

The repository includes or uses third-party libraries and assets. The MIT license in this repository applies to Oniwire's original work only; third-party components remain under their respective licenses. Review and retain each component's license and notices when redistributing it.

## License

Oniwire's original work is licensed under the MIT License. See [LICENSE](LICENSE).
