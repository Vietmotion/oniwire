window.createOniwireCompositeNodeDef = function createOniwireCompositeNodeDef({
  normalizeRampStops,
  hasMotionFlag,
  resolveGradientMetaFromEl,
  resolveMaskMetaFromEl,
  buildRampMaskUrl,
  buildGradientMaskUrl,
  buildShapeMaskUrl,
  startLiveMaskUpdate
}){
  function getCompositeLayerPorts(node){
    const fromParams = Array.isArray(node?.params?.inputPorts)
      ? node.params.inputPorts.map(p => String(p || "").trim()).filter(Boolean)
      : [];
    if(fromParams.length) return fromParams;
    return ["a", "b"];
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

  function getDirectLiveMaskSource(targetEl){
    if(!targetEl) return null;
    if(targetEl?.dataset?.liveMaskSource === "true") return targetEl;
    if(!targetEl.children) return null;
    for(const child of targetEl.children){
      if(child?.dataset?.liveMaskSource === "true") return child;
    }
    if(targetEl.querySelector){
      const nested = targetEl.querySelector("[data-live-mask-source='true']");
      if(nested) return nested;
    }

    // Effect nodes keep the live mask driver in a sibling host under the same wrap.
    const parent = targetEl.parentElement;
    if(parent?.querySelector){
      const siblingScoped = parent.querySelector("[data-live-mask-source='true']");
      if(siblingScoped) return siblingScoped;
    }

    // Last fallback: search a couple ancestors to handle deeply wrapped clones.
    let scope = parent?.parentElement || null;
    let depth = 0;
    while(scope && depth < 2){
      if(scope.querySelector){
        const ancestorScoped = scope.querySelector("[data-live-mask-source='true']");
        if(ancestorScoped) return ancestorScoped;
      }
      scope = scope.parentElement;
      depth += 1;
    }
    return null;
  }

  function rebindLiveMaskTargets(rootEl){
    if(!rootEl || typeof startLiveMaskUpdate !== "function") return;
    const targets = [];

    if(rootEl.dataset?.liveMaskEnabled === "true") targets.push(rootEl);
    if(rootEl.querySelectorAll){
      rootEl.querySelectorAll("[data-live-mask-enabled='true']").forEach((el) => {
        targets.push(el);
      });
    }

    for(const target of targets){
      const source = getDirectLiveMaskSource(target);
      if(!source) continue;
      delete target.dataset.liveMaskBound;
      const fps = Number(target.dataset.liveMaskFps || 15);
      startLiveMaskUpdate(target, source, fps);
    }
  }

  return {
    inputs: (node) => [...getCompositeLayerPorts(node), "mask"],
    outputs: ["layer"],
    defaults: { blend: "normal", opacity: 100, inputPorts: ["a", "b"] },
    icon: "🧬",
    run: (node, inputs) => {
      const layerPorts = getCompositeLayerPorts(node);
      const layerClones = layerPorts
        .map(port => {
          if(!inputs[port]?.el) return null;
          const clone = inputs[port].el.cloneNode(true);
          // Re-bind any live mask drivers inside nested composite layers.
          rebindLiveMaskTargets(clone);
          return clone;
        })
        .filter(Boolean);
      const rampStops = inputs.mask?.stops ? normalizeRampStops(inputs.mask.stops) : [];
      const liveMaskEl = inputs.mask?.el || null;
      const hasAnimatedMask = hasMotionFlag(liveMaskEl);
      const hasFilteredMask = hasStylizedMaskFilter(liveMaskEl);
      const forceRasterMask = String(liveMaskEl?.dataset?.maskMetaMode || "").trim().toLowerCase() === "raster";
      // Blur/stylized masks must be captured as live matte to preserve feathered edges.
      const isLiveMask = forceRasterMask || liveMaskEl?.dataset?.frozenLive === "true" || hasAnimatedMask || hasFilteredMask;
      let liveMaskSourceEl = liveMaskEl;

      const frozenUrl = inputs.mask?.dataUrl || inputs.mask?.el?.dataset?.frozenUrl;
      const maskMeta = inputs.mask?.el ? {
        gradient: resolveGradientMetaFromEl(inputs.mask.el),
        shape: resolveMaskMetaFromEl(inputs.mask.el)
      } : null;

      const M = inputs.mask?.el ? inputs.mask.el.cloneNode(true) : null;
  if(!layerClones.length) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      if(maskMeta?.shape){
        const shapeMeta = maskMeta.shape;
        wrap.dataset.maskShape = String(shapeMeta.shapeType || "circle");
        if(shapeMeta.shapeType === "path" && Array.isArray(shapeMeta.paths) && shapeMeta.paths.length){
          wrap.dataset.maskPathData = JSON.stringify(shapeMeta.paths);
          wrap.dataset.maskX = String(Number(shapeMeta.x || 0));
          wrap.dataset.maskY = String(Number(shapeMeta.y || 0));
          wrap.dataset.maskScale = String(Number(shapeMeta.scale || 1));
          wrap.dataset.maskCx = String(Number(shapeMeta.cx || 0));
          wrap.dataset.maskCy = String(Number(shapeMeta.cy || 0));
        }else{
          wrap.dataset.maskWidth = String(Number(shapeMeta.width || shapeMeta.size || 120));
          wrap.dataset.maskHeight = String(Number(shapeMeta.height || shapeMeta.size || 120));
          wrap.dataset.maskX = String(Number(shapeMeta.x || 100));
          wrap.dataset.maskY = String(Number(shapeMeta.y || 100));
        }
      }
      if(layerPorts.some(port => hasMotionFlag(inputs[port]?.el)) || hasMotionFlag(inputs.mask?.el)){
        wrap.dataset.hasMotion = "true";
      }

      if(isLiveMask && liveMaskEl){
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
        wrap.appendChild(liveMaskHost);
        liveMaskSourceEl = liveMaskDriver;
      }

      const blendMode = node.params.blend || "normal";
      const opacity = Number(node.params.opacity ?? 100) / 100;

      for(let i = 0; i < layerClones.length; i++){
        const layer = layerClones[i];
        // Apply blend and opacity to all layers above the bottom-most layer.
        if(i < layerClones.length - 1){
          layer.style.opacity = String(opacity);
          layer.style.mixBlendMode = blendMode;
        }
      }

      // Append bottom -> top. Port order is top -> bottom (a over b over c...).
      for(let i = layerClones.length - 1; i >= 0; i--){
        wrap.appendChild(layerClones[i]);
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
        wrap.style.maskImage = maskUrl;
        wrap.style.webkitMaskImage = maskUrl;
        wrap.style.maskMode = resolvedMaskMode;
        wrap.style.webkitMaskMode = resolvedMaskMode;
        wrap.style.maskRepeat = "no-repeat";
        wrap.style.webkitMaskRepeat = "no-repeat";
        wrap.style.maskPosition = "0 0";
        wrap.style.webkitMaskPosition = "0 0";
        wrap.style.maskSize = "100% 100%";
        wrap.style.webkitMaskSize = "100% 100%";
        if(isLiveMask){
          const liveMaskFps = hasAnimatedMask ? 15 : (forceRasterMask ? 10 : 5);
          wrap.dataset.liveMaskEnabled = "true";
          wrap.dataset.liveMaskFps = String(liveMaskFps);
          startLiveMaskUpdate(wrap, liveMaskSourceEl, liveMaskFps);
        }
      } else if(M){
        const applyRasterMask = (dataUrl) => {
          if(!dataUrl) return;
          wrap.style.maskImage = `url(${dataUrl})`;
          wrap.style.webkitMaskImage = `url(${dataUrl})`;
          wrap.style.maskMode = "alpha";
          wrap.style.webkitMaskMode = "alpha";
          wrap.style.maskRepeat = "no-repeat";
          wrap.style.webkitMaskRepeat = "no-repeat";
          wrap.style.maskPosition = "0 0";
          wrap.style.webkitMaskPosition = "0 0";
          wrap.style.maskSize = "100% 100%";
          wrap.style.webkitMaskSize = "100% 100%";
        };

        const cachedMaskUrl = String(inputs.mask?.el?.dataset?.frozenUrl || "").trim()
          || (typeof window.oniwireGetLiveMaskCacheUrl === "function"
            ? String(window.oniwireGetLiveMaskCacheUrl(inputs.mask?.el) || "").trim()
            : "");
        if(cachedMaskUrl) applyRasterMask(cachedMaskUrl);

        const canRenderMask = typeof window.renderLayerToDataUrl === "function";
        if(canRenderMask && inputs.mask?.el){
          window.renderLayerToDataUrl(inputs.mask.el, {
            useSimpleShapeRender: false,
            timeoutMs: 500,
            bakeComputedStyles: true,
            backgroundColor: null
          }).then((dataUrl) => {
            if(dataUrl) applyRasterMask(dataUrl);
          }).catch(() => {
            // Best-effort: keep cached URL if available.
          });
        }
      }

      // When a shape mask is connected, add a hidden bounds marker sized to the
      // mask so that measureLayerBounds / updatePreviewSelectionBox uses the
      // mask's footprint instead of the full-canvas inset:0 wrap.
      if(maskMeta?.shape && maskMeta.shape.shapeType !== "path"){
        const sm = maskMeta.shape;
        const bw = Number(sm.width || sm.size || 120);
        const bh = Number(sm.height || sm.size || 120);
        const bx = Number(sm.x || 0);
        const by = Number(sm.y || 0);
        const bounds = document.createElement("div");
        bounds.dataset.boundId = node.id;
        bounds.style.position = "absolute";
        bounds.style.left = (bx - bw / 2) + "px";
        bounds.style.top = (by - bh / 2) + "px";
        bounds.style.width = bw + "px";
        bounds.style.height = bh + "px";
        bounds.style.visibility = "hidden";
        bounds.style.pointerEvents = "none";
        wrap.appendChild(bounds);
      }

      return { el: wrap };
    },
    inspector: () => ([
      {k:"blend", type:"select", label:"Blend Mode", options:[
        "normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn",
        "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"
      ]},
      {k:"opacity", type:"range", label:"Opacity %", min:0, max:100, step:1},
      { type:"actionButtons", label:"Inputs", buttons:[{ label:"+ Input", id:"compositeAddInput" }, { label:"- Input", id:"compositeRemoveInput" }] },
      { k:"inputPorts", type:"compositeInputOrder", label:"Input Order" }
    ])
  };
};
