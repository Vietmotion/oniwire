window.createOniwireStylizeNodeDef = function createOniwireStylizeNodeDef({ propagateMotionFlag, clamp, getCanvasSize }){
  const LOOKUP_PRESETS = ["comic", "dreamy", "noir", "retro", "neon", "sunset", "acid"];
  const LOOKUP_PRESET_SET = new Set(LOOKUP_PRESETS);

  function hexToRgb01(hex){
    hex = String(hex || "#000000").replace(/^#/, "");
    if(hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const n = parseInt(hex, 16) || 0;
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
  }

  // Interpolates 3 color stops at arbitrary positions into a 32-sample uniform tableValues string.
  function sampleGradientTable(stops, numSamples){
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    const rVals = [], gVals = [], bVals = [];
    for(let i = 0; i < numSamples; i++){
      const t = i / (numSamples - 1);
      let lo = sorted[0];
      let hi = sorted[sorted.length - 1];
      for(let j = 0; j < sorted.length - 1; j++){
        if(t >= sorted[j].pos && t <= sorted[j + 1].pos){
          lo = sorted[j];
          hi = sorted[j + 1];
          break;
        }
      }
      const span = hi.pos - lo.pos;
      const f = span > 0.0001 ? clamp((t - lo.pos) / span, 0, 1) : (t >= hi.pos ? 1 : 0);
      rVals.push((lo.c.r + (hi.c.r - lo.c.r) * f).toFixed(4));
      gVals.push((lo.c.g + (hi.c.g - lo.c.g) * f).toFixed(4));
      bVals.push((lo.c.b + (hi.c.b - lo.c.b) * f).toFixed(4));
    }
    return { r: rVals.join(" "), g: gVals.join(" "), b: bVals.join(" ") };
  }

  function buildBrutalismSvgFilter(nodeId, amt, shadowHex, shadowPos, midHex, midPos, highHex, highPos){
    const filterId = `bgmap_${String(nodeId).replace(/[^a-z0-9]/gi, "_")}`;
    const old = document.getElementById(filterId);
    if(old){ const p = old.closest("svg"); if(p) p.parentNode.removeChild(p); }

    const stops = [
      { pos: clamp(shadowPos / 100, 0, 1), c: hexToRgb01(shadowHex) },
      { pos: clamp(midPos    / 100, 0, 1), c: hexToRgb01(midHex)    },
      { pos: clamp(highPos   / 100, 0, 1), c: hexToRgb01(highHex)   }
    ];
    const table = sampleGradientTable(stops, 32);

    // Contrast: Amount drives how hard the grayscale crushes before gradient map
    const slope = 1.2 + 2.4 * amt;
    const intercept = (1 - slope) / 2;

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgEl.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
    svgEl.innerHTML = `
      <defs>
        <filter id="${filterId}" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
          <feColorMatrix type="matrix"
            values="0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0 0 0 1 0" result="gray"/>
          <feComponentTransfer in="gray" result="contrasted">
            <feFuncR type="linear" slope="${slope.toFixed(4)}" intercept="${intercept.toFixed(4)}"/>
            <feFuncG type="linear" slope="${slope.toFixed(4)}" intercept="${intercept.toFixed(4)}"/>
            <feFuncB type="linear" slope="${slope.toFixed(4)}" intercept="${intercept.toFixed(4)}"/>
          </feComponentTransfer>
          <feComponentTransfer in="contrasted">
            <feFuncR type="table" tableValues="${table.r}"/>
            <feFuncG type="table" tableValues="${table.g}"/>
            <feFuncB type="table" tableValues="${table.b}"/>
          </feComponentTransfer>
        </filter>
      </defs>`;
    document.body.appendChild(svgEl);
    return filterId;
  }

  function resolveStylizeFilter(preset, amount, texture){
    const amt = clamp(amount / 100, 0, 1);
    const tex = clamp(texture / 100, 0, 1);

    if(preset === "dreamy"){
      const sat = 1 + 0.45 * amt;
      const con = 1 - 0.2 * amt;
      const bri = 1 + 0.12 * amt;
      const blur = 0.5 + tex * 2.6;
      return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)}) hue-rotate(${(6 * amt).toFixed(2)}deg) blur(${blur.toFixed(2)}px)`;
    }

    if(preset === "noir"){
      const con = 1 + 0.7 * amt + 0.2 * tex;
      const bri = 1 - 0.08 * amt;
      return `grayscale(1) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)})`;
    }

    if(preset === "retro"){
      const sep = 0.18 + 0.62 * amt;
      const sat = 1 + 0.35 * amt;
      const con = 1 + 0.2 * tex;
      return `sepia(${sep.toFixed(3)}) saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) hue-rotate(${(-14 * amt).toFixed(2)}deg)`;
    }

    if(preset === "glitch"){
      const sat = 1 + 0.75 * amt;
      const con = 1 + 0.55 * amt;
      const hue = 10 + tex * 20;
      return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) hue-rotate(${hue.toFixed(2)}deg)`;
    }

    if(preset === "neon"){
      const sat = 1.2 + 1.2 * amt;
      const con = 1.05 + 0.7 * amt;
      const bri = 1 + 0.18 * amt;
      const hue = 12 + tex * 26;
      return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)}) hue-rotate(${hue.toFixed(2)}deg)`;
    }

    if(preset === "brutal"){
      // Gradient map is applied via SVG filter in run(); CSS filter is bypassed.
      return "";
    }

    if(preset === "sunset"){
      const sat = 1 + 0.55 * amt;
      const con = 1 + 0.22 * amt;
      const bri = 1 + 0.14 * amt;
      const sep = 0.12 + 0.45 * amt;
      const hue = -(10 + tex * 18);
      return `sepia(${sep.toFixed(3)}) saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)}) hue-rotate(${hue.toFixed(2)}deg)`;
    }

    if(preset === "acid"){
      const sat = 1.25 + 1.1 * amt;
      const con = 1.1 + 0.65 * amt;
      const bri = 0.98 + 0.12 * amt;
      const hue = 65 + tex * 75;
      return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)}) hue-rotate(${hue.toFixed(2)}deg)`;
    }

    const sat = 1 + 0.75 * amt;
    const con = 1 + 0.55 * amt;
    const bri = 1 + 0.1 * amt;
    const hue = -8 * amt;
    return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)}) hue-rotate(${hue.toFixed(2)}deg)`;
  }

  function resolveBoundsFromMaskMeta(srcEl, canvasWidth, canvasHeight){
    const shape = String(srcEl?.dataset?.maskShape || "").toLowerCase();
    if(!shape) return null;

    if(shape === "path"){
      let parsed = [];
      try {
        const raw = JSON.parse(String(srcEl.dataset.maskPathData || "[]"));
        parsed = Array.isArray(raw) ? raw.filter(p => p && typeof p.d === "string" && p.d.trim()) : [];
      } catch(_err) {
        parsed = [];
      }
      if(!parsed.length) return null;

      // Build an offscreen SVG to compute accurate path extents.
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.style.left = "-9999px";
      svg.style.top = "-9999px";
      svg.style.pointerEvents = "none";
      svg.style.opacity = "0";
      document.body.appendChild(svg);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      try {
        for(const pathMeta of parsed){
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", pathMeta.d);
          svg.appendChild(pathEl);
          const box = pathEl.getBBox();
          if(Number.isFinite(box.x) && Number.isFinite(box.y) && Number.isFinite(box.width) && Number.isFinite(box.height)){
            minX = Math.min(minX, box.x);
            minY = Math.min(minY, box.y);
            maxX = Math.max(maxX, box.x + box.width);
            maxY = Math.max(maxY, box.y + box.height);
          }
          svg.removeChild(pathEl);
        }
      } catch(_err) {
        document.body.removeChild(svg);
        return null;
      }
      document.body.removeChild(svg);

      if(!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;

      const tx = Number(srcEl.dataset.maskX || 0);
      const ty = Number(srcEl.dataset.maskY || 0);
      const scale = Number(srcEl.dataset.maskScale || 1);
      const cx = Number(srcEl.dataset.maskCx || 0);
      const cy = Number(srcEl.dataset.maskCy || 0);

      const corners = [
        [minX, minY],
        [maxX, minY],
        [minX, maxY],
        [maxX, maxY]
      ].map(([x, y]) => {
        const sx = cx + ((x - cx) * scale);
        const sy = cy + ((y - cy) * scale);
        return { x: tx + sx, y: ty + sy };
      });

      const left = Math.min(...corners.map(p => p.x));
      const top = Math.min(...corners.map(p => p.y));
      const right = Math.max(...corners.map(p => p.x));
      const bottom = Math.max(...corners.map(p => p.y));

      const x = clamp(left, 0, canvasWidth - 1);
      const y = clamp(top, 0, canvasHeight - 1);
      const bw = clamp(right - left, 1, canvasWidth - x);
      const bh = clamp(bottom - top, 1, canvasHeight - y);
      return { x, y, width: bw, height: bh };
    }

    const w = Number(srcEl.dataset.maskWidth || 0);
    const h = Number(srcEl.dataset.maskHeight || 0);
    const cx = Number(srcEl.dataset.maskX || 0);
    const cy = Number(srcEl.dataset.maskY || 0);
    if(!(w > 0) || !(h > 0)) return null;

    const x = clamp(cx - (w / 2), 0, canvasWidth - 1);
    const y = clamp(cy - (h / 2), 0, canvasHeight - 1);
    const bw = clamp(w, 1, canvasWidth - x);
    const bh = clamp(h, 1, canvasHeight - y);
    return { x, y, width: bw, height: bh };
  }

  function resolveBoundsFromMarkers(srcEl, canvasWidth, canvasHeight){
    const markers = srcEl?.querySelectorAll?.("[data-bound-id]");
    if(!markers || !markers.length) return null;

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    for(const marker of markers){
      const x = Number.parseFloat(marker.style.left || "");
      const y = Number.parseFloat(marker.style.top || "");
      const w = Number.parseFloat(marker.style.width || "");
      const h = Number.parseFloat(marker.style.height || "");
      if(!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) continue;

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + Math.max(1, w));
      bottom = Math.max(bottom, y + Math.max(1, h));
    }

    if(!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) return null;

    const x = clamp(left, 0, canvasWidth - 1);
    const y = clamp(top, 0, canvasHeight - 1);
    const bw = clamp(right - left, 1, canvasWidth - x);
    const bh = clamp(bottom - top, 1, canvasHeight - y);
    return { x, y, width: bw, height: bh };
  }

  function findMaskHost(el){
    if(!el) return null;
    const hasMask = (n) => Boolean(n?.style?.maskImage || n?.style?.webkitMaskImage);
    if(hasMask(el)) return el;
    const nodes = el.querySelectorAll ? el.querySelectorAll("*") : [];
    for(const node of nodes){
      if(hasMask(node)) return node;
    }
    return null;
  }

  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: {
      preset: "lookup",
      lookupPreset: "comic",
      amount: 70,
      texture: 45,
      glitchShift: 8,
      vignette: 20,
      bruteShadow: "#162447",
      bruteShadowPos: 0,
      bruteMid: "#e94560",
      bruteMidPos: 50,
      bruteHigh: "#f5a623",
      bruteHighPos: 100,
      bruteStops: [
        { pos: 0, color: "#162447" },
        { pos: 50, color: "#e94560" },
        { pos: 100, color: "#f5a623" }
      ],
      bruteGrain: 40
    },
    icon: "🧪",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const canvasSize = typeof getCanvasSize === "function" ? (getCanvasSize() || {}) : {};
      const canvasWidth = Math.max(1, Number(canvasSize.width) || 1280);
      const canvasHeight = Math.max(1, Number(canvasSize.height) || 720);

      const bounds = resolveBoundsFromMaskMeta(src.el, canvasWidth, canvasHeight)
        || resolveBoundsFromMarkers(src.el, canvasWidth, canvasHeight)
        || { x: 0, y: 0, width: canvasWidth, height: canvasHeight };

      const bx = clamp(Number(bounds.x) || 0, 0, canvasWidth - 1);
      const by = clamp(Number(bounds.y) || 0, 0, canvasHeight - 1);
      const bw = clamp(Number(bounds.width) || canvasWidth, 1, canvasWidth - bx);
      const bh = clamp(Number(bounds.height) || canvasHeight, 1, canvasHeight - by);

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.isolation = "isolate";
      propagateMotionFlag(wrap, src.el);

      const rawPreset = String(node.params.preset || "lookup");
      const rawLookupPreset = String(node.params.lookupPreset || "comic");
      const normalizedRawPreset = rawPreset === "brutalism" ? "brutal" : rawPreset;
      const mode = rawLookupPreset === "brutalism"
        ? "brutal"
        : ((normalizedRawPreset === "lookup" || normalizedRawPreset === "brutal" || normalizedRawPreset === "glitch")
          ? normalizedRawPreset
          : "lookup");
      const lookupPreset = rawLookupPreset === "brutalism"
        ? "comic"
        : (LOOKUP_PRESET_SET.has(rawLookupPreset)
          ? rawLookupPreset
          : (LOOKUP_PRESET_SET.has(normalizedRawPreset) ? normalizedRawPreset : "comic"));
      const activePreset = mode === "lookup"
        ? lookupPreset
        : (mode === "glitch" ? "glitch" : "brutal");

      // Migrate older Stylize nodes where preset was directly "noir", "retro", etc.
      if(node.params.preset !== mode) node.params.preset = mode;
      if(node.params.lookupPreset !== lookupPreset) node.params.lookupPreset = lookupPreset;

      const amount = clamp(Number(node.params.amount) || 0, 0, 100);
      const texture = clamp(Number(node.params.texture) || 0, 0, 100);
      const mix = clamp(amount / 100, 0, 1);

      const fxFrame = document.createElement("div");
      fxFrame.style.position = "absolute";
      fxFrame.style.left = `${bx}px`;
      fxFrame.style.top = `${by}px`;
      fxFrame.style.width = `${bw}px`;
      fxFrame.style.height = `${bh}px`;
      fxFrame.style.overflow = "hidden";
      fxFrame.style.pointerEvents = "none";

      const base = src.el;
      base.style.position = "absolute";
      base.style.inset = "0";
      base.style.opacity = "1";

      const stylized = src.el.cloneNode(true);
      stylized.style.position = "absolute";
      stylized.style.left = `${-bx}px`;
      stylized.style.top = `${-by}px`;
      stylized.style.width = `${canvasWidth}px`;
      stylized.style.height = `${canvasHeight}px`;
      stylized.style.opacity = String(mix);
      stylized.style.filter = resolveStylizeFilter(activePreset, amount, texture);

      wrap.appendChild(base);
      fxFrame.appendChild(stylized);

      if(mode === "glitch"){
        const shift = clamp(Number(node.params.glitchShift) || 0, 0, 30);

        const red = src.el.cloneNode(true);
        red.style.position = "absolute";
        red.style.left = `${-bx}px`;
        red.style.top = `${-by}px`;
        red.style.width = `${canvasWidth}px`;
        red.style.height = `${canvasHeight}px`;
        red.style.opacity = String(0.18 + mix * 0.22);
        red.style.mixBlendMode = "screen";
        red.style.filter = "sepia(1) saturate(8) hue-rotate(-35deg)";
        red.style.transform = `translate(${shift}px, 0)`;

        const cyan = src.el.cloneNode(true);
        cyan.style.position = "absolute";
        cyan.style.left = `${-bx}px`;
        cyan.style.top = `${-by}px`;
        cyan.style.width = `${canvasWidth}px`;
        cyan.style.height = `${canvasHeight}px`;
        cyan.style.opacity = String(0.14 + mix * 0.2);
        cyan.style.mixBlendMode = "screen";
        cyan.style.filter = "saturate(3.2) hue-rotate(165deg)";
        cyan.style.transform = `translate(${-shift}px, 0)`;

        fxFrame.appendChild(red);
        fxFrame.appendChild(cyan);
      }

      if(mode === "brutal"){
        const fallbackStops = [
          { pos: clamp(Number(node.params.bruteShadowPos ?? 0), 0, 100), color: String(node.params.bruteShadow || "#162447") },
          { pos: clamp(Number(node.params.bruteMidPos ?? 50), 0, 100), color: String(node.params.bruteMid || "#e94560") },
          { pos: clamp(Number(node.params.bruteHighPos ?? 100), 0, 100), color: String(node.params.bruteHigh || "#f5a623") }
        ];
        const rawStops = Array.isArray(node.params.bruteStops) && node.params.bruteStops.length === 3
          ? node.params.bruteStops
          : fallbackStops;
        const mappedStops = [0, 1, 2].map((idx) => {
          const s = rawStops[idx] || fallbackStops[idx];
          return {
            pos: clamp(Number(s.pos), 0, 100),
            color: String(s.color || fallbackStops[idx].color)
          };
        });
        mappedStops[0].pos = clamp(mappedStops[0].pos, 0, mappedStops[1].pos);
        mappedStops[1].pos = clamp(mappedStops[1].pos, mappedStops[0].pos, mappedStops[2].pos);
        mappedStops[2].pos = clamp(mappedStops[2].pos, mappedStops[1].pos, 100);
        node.params.bruteStops = mappedStops;

        const shadowColor = mappedStops[0].color;
        const midColor = mappedStops[1].color;
        const highColor = mappedStops[2].color;
        const shadowPos = mappedStops[0].pos;
        const midPos = mappedStops[1].pos;
        const highPos = mappedStops[2].pos;
        const grainAmt    = clamp(Number(node.params.bruteGrain) || 0, 0, 100) / 100;
        const texAmt      = clamp(texture / 100, 0, 1);

        // Build SVG gradient-map filter (grayscale → contrast → per-channel table lookup)
        const filterId = buildBrutalismSvgFilter(node.id, mix, shadowColor, shadowPos, midColor, midPos, highColor, highPos);
        // Apply to stylized clone (overrides the empty string from resolveStylizeFilter)
        stylized.style.filter = `url(#${filterId})`;
        stylized.style.opacity = "1"; // gradient map is full-replace, not alpha blend

        // Grain — SVG feTurbulence noise overlay on top
        if(grainAmt > 0.01){
          const grainId = `bgrain_${String(node.id).replace(/[^a-z0-9]/gi, "_")}`;
          const baseFreq = (0.45 + texAmt * 0.6).toFixed(3);
          const grainSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          grainSvg.setAttribute("width", `${bw}`);
          grainSvg.setAttribute("height", `${bh}`);
          grainSvg.style.cssText = `position:absolute; inset:0; mix-blend-mode:overlay; opacity:${(grainAmt * 0.6).toFixed(3)}; pointer-events:none;`;
          grainSvg.innerHTML = `<defs><filter id="${grainId}"><feTurbulence type="fractalNoise" baseFrequency="${baseFreq}" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" fill="gray" filter="url(#${grainId})"/>`;
          fxFrame.appendChild(grainSvg);
        }
      }

      const vignette = clamp(Number(node.params.vignette) || 0, 0, 100);
      if(vignette > 0){
        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.pointerEvents = "none";
        const alpha = (vignette / 100) * 0.6;
        overlay.style.background = `radial-gradient(circle at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${alpha.toFixed(3)}) 100%)`;

        // Keep vignette constrained to the same mask so it does not darken outside the masked shape.
        const maskHost = findMaskHost(src.el) || src.el;
        const srcMask = maskHost.style.maskImage || maskHost.style.webkitMaskImage;
        if(srcMask){
          overlay.style.maskImage = srcMask;
          overlay.style.webkitMaskImage = srcMask;
          overlay.style.maskMode = maskHost.style.maskMode || maskHost.style.webkitMaskMode || "alpha";
          overlay.style.webkitMaskMode = maskHost.style.webkitMaskMode || maskHost.style.maskMode || "alpha";
          overlay.style.maskRepeat = maskHost.style.maskRepeat || maskHost.style.webkitMaskRepeat || "no-repeat";
          overlay.style.webkitMaskRepeat = maskHost.style.webkitMaskRepeat || maskHost.style.maskRepeat || "no-repeat";

          const maskPos = maskHost.style.maskPosition || maskHost.style.webkitMaskPosition;
          const maskSize = maskHost.style.maskSize || maskHost.style.webkitMaskSize;
          overlay.style.maskPosition = maskPos || `${-bx}px ${-by}px`;
          overlay.style.webkitMaskPosition = maskPos || `${-bx}px ${-by}px`;
          overlay.style.maskSize = maskSize || `${canvasWidth}px ${canvasHeight}px`;
          overlay.style.webkitMaskSize = maskSize || `${canvasWidth}px ${canvasHeight}px`;

          // Match host transform when mask sits on a transformed descendant (e.g. Composite -> Transform -> Stylize).
          if(maskHost.style.transform){
            overlay.style.transform = maskHost.style.transform;
            overlay.style.transformOrigin = maskHost.style.transformOrigin || "50% 50%";
          }
        }

        fxFrame.appendChild(overlay);
      }

      wrap.appendChild(fxFrame);

      const boundsTarget = document.createElement("div");
      boundsTarget.dataset.boundId = node.id;
      boundsTarget.style.position = "absolute";
      boundsTarget.style.left = `${bx}px`;
      boundsTarget.style.top = `${by}px`;
      boundsTarget.style.width = `${bw}px`;
      boundsTarget.style.height = `${bh}px`;
      boundsTarget.style.visibility = "hidden";
      boundsTarget.style.pointerEvents = "none";
      wrap.appendChild(boundsTarget);

      return { el: wrap };
    },
    inspector: () => ([
      {
        k: "preset",
        type: "select",
        label: "Mode",
        options: [
          { value: "lookup", label: "Lookup filter" },
          { value: "brutal", label: "Brutal" },
          { value: "glitch", label: "Glitch" }
        ]
      },
      {
        k: "lookupPreset",
        type: "select",
        label: "Lookup Filter",
        showIf: { k: "preset", equals: "lookup" },
        options: LOOKUP_PRESETS
      },
      { k: "amount", type: "range", label: "Amount", min: 0, max: 100, step: 1 },
      { k: "texture", type: "range", label: "Texture", min: 0, max: 100, step: 1 },
      { k: "glitchShift", type: "range", label: "Glitch Shift", min: 0, max: 30, step: 1, showIf: { k: "preset", equals: "glitch" } },
      { k: "bruteStops", type: "gradientMap3", label: "Gradient Map", showIf: (n) => String(n?.params?.preset || "") === "brutal", stops: [
        { pos: 0, color: "#162447" },
        { pos: 50, color: "#e94560" },
        { pos: 100, color: "#f5a623" }
      ] },
      { k: "bruteGrain",     type: "range", label: "Grain",              min: 0, max: 100, step: 1, showIf: (n) => String(n?.params?.preset || "") === "brutal" },
      { k: "vignette", type: "range", label: "Vignette", min: 0, max: 100, step: 1 }
    ])
  };
};
