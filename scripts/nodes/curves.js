window.createOniwireCurvesNodeDef = function createOniwireCurvesNodeDef({
  propagateMotionFlag,
  clamp,
  normalizeRampStops,
  resolveGradientMetaFromEl,
  resolveMaskMetaFromEl,
  buildRampMaskUrl,
  buildGradientMaskUrl,
  buildShapeMaskUrl,
  hasMotionFlag,
  startLiveMaskUpdate
}){
  function lerp(a, b, t){
    return a + (b - a) * t;
  }

  function normalizeCurveKnotPositions(shadowsX, midtonesX, highlightsX){
    const eps = 0.01;
    const s = clamp(Number(shadowsX) / 100, 0, 1);
    const m = clamp(Number(midtonesX) / 100, 0, 1);
    const h = clamp(Number(highlightsX) / 100, 0, 1);
    const s2 = clamp(s, 0, 1 - (2 * eps));
    const m2 = clamp(m, s2 + eps, 1 - eps);
    const h2 = clamp(h, m2 + eps, 1);
    return { s: s2, m: m2, h: h2 };
  }

  function buildChannelTable(shadows, midtones, highlights, shadowsX, midtonesX, highlightsX){
    const knots = normalizeCurveKnotPositions(shadowsX, midtonesX, highlightsX);
    const pts = [
      [0, 0],
      [knots.s, clamp(0.25 + (shadows / 100), 0, 1)],
      [knots.m, clamp(0.5 + (midtones / 100), 0, 1)],
      [knots.h, clamp(0.75 + (highlights / 100), 0, 1)],
      [1, 1]
    ];

    const samples = [];
    for(let i = 0; i <= 16; i++){
      const x = i / 16;
      let seg = 0;
      while(seg < pts.length - 2 && x > pts[seg + 1][0]) seg++;

      const [x0, y0] = pts[seg];
      const [x1, y1] = pts[seg + 1];
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      const y = clamp(lerp(y0, y1, t), 0, 1);
      samples.push(y.toFixed(4));
    }

    return samples.join(" ");
  }

  function ensureCurvesFilter(filterId, rTable, gTable, bTable){
    let svgRoot = document.getElementById("oniwireCurvesSvgRoot");
    if(!svgRoot){
      svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgRoot.id = "oniwireCurvesSvgRoot";
      svgRoot.setAttribute("width", "0");
      svgRoot.setAttribute("height", "0");
      svgRoot.style.position = "absolute";
      svgRoot.style.pointerEvents = "none";
      svgRoot.style.opacity = "0";
      svgRoot.style.left = "-9999px";
      svgRoot.style.top = "-9999px";
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgRoot.appendChild(defs);
      document.body.appendChild(svgRoot);
    }

    let defs = svgRoot.querySelector("defs");
    if(!defs){
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgRoot.appendChild(defs);
    }

    let filter = svgRoot.querySelector(`[id="${filterId}"]`);
    if(!filter){
      filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      filter.setAttribute("id", filterId);
      filter.setAttribute("color-interpolation-filters", "sRGB");

      const transfer = document.createElementNS("http://www.w3.org/2000/svg", "feComponentTransfer");

      const feR = document.createElementNS("http://www.w3.org/2000/svg", "feFuncR");
      feR.setAttribute("type", "table");
      transfer.appendChild(feR);

      const feG = document.createElementNS("http://www.w3.org/2000/svg", "feFuncG");
      feG.setAttribute("type", "table");
      transfer.appendChild(feG);

      const feB = document.createElementNS("http://www.w3.org/2000/svg", "feFuncB");
      feB.setAttribute("type", "table");
      transfer.appendChild(feB);

      const feA = document.createElementNS("http://www.w3.org/2000/svg", "feFuncA");
      feA.setAttribute("type", "identity");
      transfer.appendChild(feA);

      filter.appendChild(transfer);
      defs.appendChild(filter);
    }

    const feFuncs = filter.querySelectorAll("feFuncR, feFuncG, feFuncB");
    if(feFuncs.length >= 3){
      feFuncs[0].setAttribute("tableValues", rTable);
      feFuncs[1].setAttribute("tableValues", gTable);
      feFuncs[2].setAttribute("tableValues", bTable);
    }
  }

  function hasStylizedMaskFilter(maskEl){
    if(!maskEl) return false;
    const nodes = [maskEl, ...(maskEl.querySelectorAll ? Array.from(maskEl.querySelectorAll("*")) : [])];
    for(const el of nodes){
      const filter = String(el?.style?.filter || "").trim().toLowerCase();
      if(filter && filter !== "none") return true;
    }
    return false;
  }

  function applyMaskToTarget(targetEl, wrapEl, maskInput){
    if(!targetEl || !maskInput) return false;

    const rampStops = maskInput?.stops ? normalizeRampStops(maskInput.stops) : [];
    const liveMaskEl = maskInput?.el || null;
    const hasAnimatedMask = typeof hasMotionFlag === "function" ? hasMotionFlag(liveMaskEl) : false;
    const hasFilteredMask = hasStylizedMaskFilter(liveMaskEl);
    const isLiveMask = liveMaskEl?.dataset?.frozenLive === "true" || hasAnimatedMask || hasFilteredMask;
    const frozenUrl = maskInput?.dataUrl || maskInput?.el?.dataset?.frozenUrl;
    const maskMeta = maskInput?.el ? {
      gradient: resolveGradientMetaFromEl(maskInput.el),
      shape: resolveMaskMetaFromEl(maskInput.el)
    } : null;

    let liveMaskSourceEl = liveMaskEl;
    if(isLiveMask && liveMaskEl && wrapEl){
      const liveMaskHost = document.createElement("div");
      liveMaskHost.style.position = "fixed";
      liveMaskHost.style.left = "-200vw";
      liveMaskHost.style.top = "-200vh";
      liveMaskHost.style.width = "1280px";
      liveMaskHost.style.height = "720px";
      liveMaskHost.style.overflow = "hidden";
      liveMaskHost.style.pointerEvents = "none";
      liveMaskHost.style.zIndex = "-1";
      liveMaskHost.setAttribute("aria-hidden", "true");

      const liveMaskDriver = liveMaskEl.cloneNode(true);
      liveMaskDriver.style.position = "absolute";
      liveMaskDriver.style.inset = "0";
      liveMaskDriver.style.pointerEvents = "none";
      liveMaskDriver.setAttribute("aria-hidden", "true");
      liveMaskDriver.dataset.liveMaskSource = "true";
      liveMaskHost.appendChild(liveMaskDriver);
      wrapEl.appendChild(liveMaskHost);
      liveMaskSourceEl = liveMaskDriver;
    }

    const liveCacheUrl = typeof window.oniwireGetLiveMaskCacheUrl === "function"
      ? (window.oniwireGetLiveMaskCacheUrl(liveMaskSourceEl) || window.oniwireGetLiveMaskCacheUrl(liveMaskEl) || "")
      : "";
    const liveUrl = isLiveMask
      ? (liveMaskSourceEl?.dataset?.frozenUrl || liveMaskEl?.dataset?.frozenUrl || liveCacheUrl || "")
      : "";
    const maskUrl = isLiveMask
      ? (liveUrl ? `url(${liveUrl})` : null)
      : ((frozenUrl && frozenUrl.length > 0)
        ? `url(${frozenUrl})`
        : (rampStops.length
          ? buildRampMaskUrl(rampStops)
          : (buildGradientMaskUrl(maskMeta?.gradient, false)
            || buildShapeMaskUrl(maskMeta?.shape, false))));
    const hasShapeMask = Boolean(maskMeta?.shape);
    const resolvedMaskMode = (isLiveMask || hasShapeMask) ? "alpha" : "luminance";

    if(maskUrl || isLiveMask){
      targetEl.style.maskImage = maskUrl;
      targetEl.style.webkitMaskImage = maskUrl;
      targetEl.style.maskMode = resolvedMaskMode;
      targetEl.style.webkitMaskMode = resolvedMaskMode;
      targetEl.style.maskRepeat = "no-repeat";
      targetEl.style.webkitMaskRepeat = "no-repeat";
      targetEl.style.maskPosition = "0 0";
      targetEl.style.webkitMaskPosition = "0 0";
      targetEl.style.maskSize = "100% 100%";
      targetEl.style.webkitMaskSize = "100% 100%";
      if(isLiveMask && typeof startLiveMaskUpdate === "function"){
        const liveMaskFps = hasAnimatedMask ? 15 : 5;
        targetEl.dataset.liveMaskEnabled = "true";
        targetEl.dataset.liveMaskFps = String(liveMaskFps);
        startLiveMaskUpdate(targetEl, liveMaskSourceEl, liveMaskFps);
      }
      return true;
    }

    return false;
  }

  return {
    inputs: ["in", "mask"],
    outputs: ["layer"],
    defaults: {
      mode: "RGB",
      rgbShadows: 0,
      rgbMidtones: 0,
      rgbHighlights: 0,
      curveShadowsX: 25,
      curveMidtonesX: 50,
      curveHighlightsX: 75,
      rShadows: 0,
      rMidtones: 0,
      rHighlights: 0,
      gShadows: 0,
      gMidtones: 0,
      gHighlights: 0,
      bShadows: 0,
      bMidtones: 0,
      bHighlights: 0
    },
    icon: "📈",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.isolation = "isolate";
      propagateMotionFlag(wrap, src.el);

      const clone = src.el.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.inset = "0";

      const base = src.el.cloneNode(true);
      base.style.position = "absolute";
      base.style.inset = "0";
      base.style.opacity = "1";

      const rgbShadows = clamp(Number(node.params.rgbShadows) || 0, -100, 100);
      const rgbMidtones = clamp(Number(node.params.rgbMidtones) || 0, -100, 100);
      const rgbHighlights = clamp(Number(node.params.rgbHighlights) || 0, -100, 100);

      const redShadows = clamp(rgbShadows + (Number(node.params.rShadows) || 0), -100, 100);
      const redMidtones = clamp(rgbMidtones + (Number(node.params.rMidtones) || 0), -100, 100);
      const redHighlights = clamp(rgbHighlights + (Number(node.params.rHighlights) || 0), -100, 100);

      const greenShadows = clamp(rgbShadows + (Number(node.params.gShadows) || 0), -100, 100);
      const greenMidtones = clamp(rgbMidtones + (Number(node.params.gMidtones) || 0), -100, 100);
      const greenHighlights = clamp(rgbHighlights + (Number(node.params.gHighlights) || 0), -100, 100);

      const blueShadows = clamp(rgbShadows + (Number(node.params.bShadows) || 0), -100, 100);
      const blueMidtones = clamp(rgbMidtones + (Number(node.params.bMidtones) || 0), -100, 100);
      const blueHighlights = clamp(rgbHighlights + (Number(node.params.bHighlights) || 0), -100, 100);

      const xShadows = Number.isFinite(Number(node.params.curveShadowsX)) ? Number(node.params.curveShadowsX) : 25;
      const xMidtones = Number.isFinite(Number(node.params.curveMidtonesX)) ? Number(node.params.curveMidtonesX) : 50;
      const xHighlights = Number.isFinite(Number(node.params.curveHighlightsX)) ? Number(node.params.curveHighlightsX) : 75;

      const rTable = buildChannelTable(redShadows, redMidtones, redHighlights, xShadows, xMidtones, xHighlights);
      const gTable = buildChannelTable(greenShadows, greenMidtones, greenHighlights, xShadows, xMidtones, xHighlights);
      const bTable = buildChannelTable(blueShadows, blueMidtones, blueHighlights, xShadows, xMidtones, xHighlights);

      const filterId = `oniwireCurves-${node.id}`;
      ensureCurvesFilter(filterId, rTable, gTable, bTable);

      const currentFilter = String(clone.style.filter || "").trim();
      clone.style.filter = currentFilter && currentFilter !== "none"
        ? `${currentFilter} url(#${filterId})`
        : `url(#${filterId})`;

      const maskApplied = applyMaskToTarget(clone, wrap, inputs.mask);
      if(maskApplied){
        wrap.appendChild(base);
      }
      wrap.appendChild(clone);
      return { el: wrap };
    },
    inspector: () => ([
      {
        k: "mode",
        type: "options",
        label: "Mode",
        options: [
          { label: "RGB", value: "RGB" },
          { label: "R", value: "R" },
          { label: "G", value: "G" },
          { label: "B", value: "B" }
        ]
      },
      { k: "curveGraph", type: "curvesGraph", label: "Curve" },
      { k: "rgbShadows", type: "range", label: "RGB Shadows", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "RGB" } },
      { k: "rgbMidtones", type: "range", label: "RGB Midtones", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "RGB" } },
      { k: "rgbHighlights", type: "range", label: "RGB Highlights", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "RGB" } },
      { k: "rShadows", type: "range", label: "Red Shadows", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "R" } },
      { k: "rMidtones", type: "range", label: "Red Midtones", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "R" } },
      { k: "rHighlights", type: "range", label: "Red Highlights", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "R" } },
      { k: "gShadows", type: "range", label: "Green Shadows", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "G" } },
      { k: "gMidtones", type: "range", label: "Green Midtones", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "G" } },
      { k: "gHighlights", type: "range", label: "Green Highlights", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "G" } },
      { k: "bShadows", type: "range", label: "Blue Shadows", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "B" } },
      { k: "bMidtones", type: "range", label: "Blue Midtones", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "B" } },
      { k: "bHighlights", type: "range", label: "Blue Highlights", min: -100, max: 100, step: 1, showIf: { k: "mode", equals: "B" } }
    ])
  };
};
