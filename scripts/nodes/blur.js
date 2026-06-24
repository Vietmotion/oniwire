window.createOniwireBlurNodeDef = function createOniwireBlurNodeDef({
  propagateMotionFlag,
  clamp,
  getCanvasSize,
  normalizeRampStops,
  resolveGradientMetaFromEl,
  resolveMaskMetaFromEl,
  buildRampMaskUrl,
  buildGradientMaskUrl,
  buildShapeMaskUrl,
  hasMotionFlag,
  startLiveMaskUpdate
}){
  function hasStylizedMaskFilter(maskEl){
    if(!maskEl) return false;
    const nodes = [maskEl, ...(maskEl.querySelectorAll ? Array.from(maskEl.querySelectorAll("*")) : [])];
    for(const el of nodes){
      const filter = String(el?.style?.filter || "").trim().toLowerCase();
      if(filter && filter !== "none") return true;
    }
    return false;
  }

  async function blurMaskImageUrl(maskUrl, featherPx){
    if(!maskUrl || !(featherPx > 0)) return maskUrl || "";
    const img = await new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = maskUrl;
    });
    if(!img || !img.naturalWidth || !img.naturalHeight) return maskUrl;

    const feather = Math.max(0, Number(featherPx) || 0);
    const pad = Math.ceil(feather * 3);
    const padded = document.createElement("canvas");
    padded.width = img.naturalWidth + (pad * 2);
    padded.height = img.naturalHeight + (pad * 2);
    const paddedCtx = padded.getContext("2d");
    if(!paddedCtx) return maskUrl;
    paddedCtx.clearRect(0, 0, padded.width, padded.height);
    paddedCtx.drawImage(img, pad, pad);

    const blurred = document.createElement("canvas");
    blurred.width = padded.width;
    blurred.height = padded.height;
    const blurredCtx = blurred.getContext("2d");
    if(!blurredCtx) return maskUrl;
    try{
      blurredCtx.filter = `blur(${feather}px)`;
    }catch(_){ }
    blurredCtx.drawImage(padded, 0, 0);

    const out = document.createElement("canvas");
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const outCtx = out.getContext("2d");
    if(!outCtx) return maskUrl;
    outCtx.drawImage(blurred, pad, pad, img.naturalWidth, img.naturalHeight, 0, 0, img.naturalWidth, img.naturalHeight);
    return out.toDataURL("image/png");
  }

  function renderFeatheredShapeMaskUrl(shapeMeta, featherPx, canvasWidth, canvasHeight){
    if(!shapeMeta) return "";
    const feather = Math.max(0, Number(featherPx) || 0);
    const w = Math.max(1, Number(canvasWidth) || 1280);
    const h = Math.max(1, Number(canvasHeight) || 720);
    const type = String(shapeMeta.shapeType || "circle").toLowerCase();
    const x = Number(shapeMeta.x || w / 2);
    const y = Number(shapeMeta.y || h / 2);
    const width = Math.max(1, Number(shapeMeta.width || shapeMeta.size || 120));
    const height = Math.max(1, Number(shapeMeta.height || shapeMeta.size || width));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if(!ctx) return "";
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,255,255,1)";
    ctx.shadowBlur = feather;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const halfW = width / 2;
    const halfH = height / 2;
    ctx.beginPath();
    switch(type){
      case "circle":
        ctx.ellipse(x, y, Math.max(1, halfW), Math.max(1, halfH), 0, 0, Math.PI * 2);
        break;
      case "triangle":
        ctx.moveTo(x, y - halfH);
        ctx.lineTo(x + halfW, y + halfH);
        ctx.lineTo(x - halfW, y + halfH);
        ctx.closePath();
        break;
      case "diamond":
        ctx.moveTo(x, y - halfH);
        ctx.lineTo(x + halfW, y);
        ctx.lineTo(x, y + halfH);
        ctx.lineTo(x - halfW, y);
        ctx.closePath();
        break;
      case "hexagon":
        ctx.moveTo(x, y - halfH);
        ctx.lineTo(x + halfW, y - (halfH * 0.5));
        ctx.lineTo(x + halfW, y + (halfH * 0.5));
        ctx.lineTo(x, y + halfH);
        ctx.lineTo(x - halfW, y + (halfH * 0.5));
        ctx.lineTo(x - halfW, y - (halfH * 0.5));
        ctx.closePath();
        break;
      case "star": {
        const pts = [
          [x, y - halfH],
          [x + (width * 0.11), y - (height * 0.15)],
          [x + halfW, y - (height * 0.15)],
          [x + (width * 0.18), y + (height * 0.07)],
          [x + (width * 0.29), y + halfH],
          [x, y + (height * 0.20)],
          [x - (width * 0.29), y + halfH],
          [x - (width * 0.18), y + (height * 0.07)],
          [x - halfW, y - (height * 0.15)],
          [x - (width * 0.11), y - (height * 0.15)]
        ];
        ctx.moveTo(pts[0][0], pts[0][1]);
        for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        break;
      }
      default:
        ctx.rect(x - halfW, y - halfH, width, height);
        break;
    }
    ctx.fill();
    ctx.restore();
    return canvas.toDataURL("image/png");
  }

  async function applyMaskToTarget(targetEl, wrapEl, maskInput, featherPx = 0, canvasWidth = 1280, canvasHeight = 720){
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
    let maskUrl = isLiveMask
      ? (liveUrl ? `url(${liveUrl})` : null)
      : ((frozenUrl && frozenUrl.length > 0)
        ? `url(${frozenUrl})`
        : (rampStops.length
          ? buildRampMaskUrl(rampStops)
          : (buildGradientMaskUrl(maskMeta?.gradient, false)
            || buildShapeMaskUrl(maskMeta?.shape, false))));
    const hasShapeMask = Boolean(maskMeta?.shape);
    const resolvedMaskMode = (isLiveMask || hasShapeMask) ? "alpha" : "luminance";

    if(hasShapeMask && featherPx > 0 && maskMeta?.shape){
      const featheredUrl = renderFeatheredShapeMaskUrl(maskMeta.shape, featherPx, canvasWidth, canvasHeight);
      if(featheredUrl) maskUrl = `url(${featheredUrl})`;
    } else if(hasShapeMask && featherPx > 0 && maskUrl){
      const rawUrl = String(maskUrl).replace(/^url\((.*)\)$/i, "$1").replace(/^['\"]|['\"]$/g, "");
      const featheredUrl = await blurMaskImageUrl(rawUrl, featherPx);
      if(featheredUrl) maskUrl = `url(${featheredUrl})`;
    }

    if(maskUrl || isLiveMask){
      const normalizedMaskUrl = maskUrl
        ? String(maskUrl).replace(/^url\((.*)\)$/i, "$1").replace(/^['\"]|['\"]$/g, "")
        : "";
      if(normalizedMaskUrl){
        if(wrapEl?.dataset) wrapEl.dataset.frozenUrl = normalizedMaskUrl;
        if(targetEl?.dataset) targetEl.dataset.frozenUrl = normalizedMaskUrl;
      }
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
    defaults: { radius: 12 },
    icon: "🌫️",
    run: async (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const canvasSize = typeof getCanvasSize === "function" ? (getCanvasSize() || {}) : {};
      const canvasWidth = Math.max(1, Number(canvasSize.width) || 1280);
      const canvasHeight = Math.max(1, Number(canvasSize.height) || 720);

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.overflow = "visible";
      propagateMotionFlag(wrap, src.el);

      const base = src.el.cloneNode(true);
      base.style.position = "absolute";
      base.style.inset = "0";
      base.style.opacity = "1";

      const clone = src.el.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.inset = "0";

      const radius = clamp(Number(node.params.radius) || 0, 0, 200);
      const maskShape = String(inputs.mask?.el?.dataset?.maskShape || inputs.in?.el?.dataset?.maskShape || "");
      const maskWidth = String(inputs.mask?.el?.dataset?.maskWidth || inputs.in?.el?.dataset?.maskWidth || "");
      const maskHeight = String(inputs.mask?.el?.dataset?.maskHeight || inputs.in?.el?.dataset?.maskHeight || "");
      const maskX = String(inputs.mask?.el?.dataset?.maskX || inputs.in?.el?.dataset?.maskX || "");
      const maskY = String(inputs.mask?.el?.dataset?.maskY || inputs.in?.el?.dataset?.maskY || "");
      wrap.dataset.liveMaskRevision = ["blur", radius, maskShape, maskWidth, maskHeight, maskX, maskY].join(":");
      clone.style.filter = radius > 0 ? `blur(${radius}px)` : "none";

      await applyMaskToTarget(clone, wrap, inputs.mask, radius, canvasWidth, canvasHeight);
      wrap.appendChild(clone);
      return { el: wrap };
    },
    inspector: () => ([
      { k: "radius", type: "range", label: "Radius", min: 0, max: 120, step: 1 }
    ])
  };
};
