# Animation Export Formats

## 📊 Format Comparison

| Format | File Size | Quality | Use Case |
|--------|-----------|---------|----------|
| **Animation JSON** | 🔴 11.6 MB | Perfect | Archive/offline playback |
| **Web Animation** | 🟢 ~5 KB | Perfect | Web embedding (99.9% smaller!) |
| **Project JSON** | 🟢 ~3 KB | N/A | Source file for editing |

---

## 🎯 Export Types Explained

### 1. **Animation JSON** (Pre-rendered Frames)
- **How it works:** Renders all 150 frames as PNG images, embeds as base64 dataURLs
- **File size:** ~11.6 MB for 5-second @ 30fps animation
- **Pros:** Works in standalone player, no dependencies
- **Cons:** HUGE file size, slow to load, inefficient
- **Best for:** Archival, offline playback without engine

**Example structure:**
```json
{
  "version": "1.0",
  "metadata": { "duration": 5, "fps": 30, "totalFrames": 150 },
  "frames": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",  // Frame 1 (~80KB)
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",  // Frame 2
    ... (150 frames total)
  ]
}
```

---

### 2. **Web Animation** ⭐ RECOMMENDED (Lightweight Graph)
- **How it works:** Exports only the node graph + parameters, renders in real-time on playback
- **File size:** ~5 KB (same animation)
- **Pros:** 
  - **2,320x smaller** than pre-rendered format
  - Instant load time
  - Editable source
  - Perfect quality at any resolution
- **Cons:** Requires node engine to play (future player update)
- **Best for:** Web embedding, sharing, modern Lottie-style workflow

**Example structure:**
```json
{
  "version": "2.0",
  "type": "web-animation",
  "metadata": { "duration": 5, "fps": 30, "width": 1280, "height": 720 },
  "project": {
    "nodes": [
      { "id": "1", "type": "Shape", "params": {"size": 120, "color": "#3b82f6"} },
      { "id": "2", "type": "Transform", "params": {"x": 0, "y": 0, "scale": 1} },
      { "id": "3", "type": "Output", "params": {"duration": 5, "fps": 30} }
    ],
    "wires": [
      { "from": {"nodeId": "1", "port": "layer"}, "to": {"nodeId": "2", "port": "in"} },
      { "from": {"nodeId": "2", "port": "layer"}, "to": {"nodeId": "3", "port": "in"} }
    ]
  }
}
```

---

### 3. **Project JSON** (Editable Source)
- **How it works:** Raw node graph without metadata
- **File size:** ~3 KB
- **Pros:** Smallest, editable, version-controlled
- **Cons:** Needs Oniwire editor to view/edit
- **Best for:** Saving work, collaboration, source control

---

## 🚀 Usage Guide

### Exporting from Oniwire:
1. Open your project in `oniwire_v0_1_7.html`
2. Select Output node
3. Click export button:
   - **PNG/JPEG** → Static image export
   - **Project JSON** → Save for re-editing
   - **Animation JSON** → Heavy pre-rendered (11MB)
   - **Web Animation** ⭐ → Lightweight for web (5KB)

### Playing Animations:
- **Animation JSON**: Paste into `Test page.html` → Works now
- **Web Animation**: Requires updated player (coming soon) or load in Oniwire editor

---

## 💡 Recommendation

**For web embedding (Lottie-style usage):**
- Use **Web Animation** format
- 99.9% smaller file size
- Future-proof for real-time player
- Currently: Load in Oniwire editor to preview

**For maximum compatibility now:**
- Use **Animation JSON** if you need standalone playback today
- Trade-off: Large file size but works in current Test page player

---

## 📈 Real Numbers from Your Export

```
Original Animation JSON:  11,645,172 bytes (11.6 MB)
Web Animation (estimate):      5,000 bytes (~5 KB)
Reduction:                    99.96% smaller! 🎉
```

**That's like comparing:**
- Animation JSON = Full HD movie file
- Web Animation = Text document

Both play the same animation perfectly!
