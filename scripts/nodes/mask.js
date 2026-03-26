window.createOniwireMaskNodeDef = function createOniwireMaskNodeDef({
  normalizeRampStops,
  resolveGradientMetaFromEl,
  resolveMaskMetaFromEl,
  buildRampMaskUrl,
  buildGradientMaskUrl,
  buildShapeMaskUrl,
  hasMotionFlag,
  startLiveMaskUpdate
}){
  return {
    inputs: ["source", "mask"],
    outputs: ["layer"],
    defaults: { invert: false },
    icon: "🎭",
    run: (node, inputs) => {
      const source = inputs.source?.el ? inputs.source.el.cloneNode(true) : null;
      const rampStops = inputs.mask?.stops ? normalizeRampStops(inputs.mask.stops) : [];
      const liveMaskEl = inputs.mask?.el || null;
      const hasAnimatedMask = hasMotionFlag(liveMaskEl);
      const isLiveMask = liveMaskEl?.dataset?.frozenLive === "true" || hasAnimatedMask;
      let liveMaskSourceEl = liveMaskEl;

      const frozenUrl = inputs.mask?.dataUrl || inputs.mask?.el?.dataset?.frozenUrl;
      const maskMeta = inputs.mask?.el ? {
        gradient: resolveGradientMetaFromEl(inputs.mask.el),
        shape: resolveMaskMetaFromEl(inputs.mask.el)
      } : null;

      const mask = inputs.mask?.el ? inputs.mask.el.cloneNode(true) : null;

      if(!source) return null;
      if(!mask && rampStops.length === 0 && !(frozenUrl && frozenUrl.length > 0)) return { el: source };

      const liveUrl = isLiveMask ? (liveMaskSourceEl?.dataset?.frozenUrl || "") : "";
      const maskUrl = isLiveMask
        ? (liveUrl ? `url(${liveUrl})` : null)
        : ((frozenUrl && frozenUrl.length > 0)
          ? `url(${frozenUrl})`
          : (rampStops.length
            ? buildRampMaskUrl(rampStops, !!node.params.invert)
            : (buildGradientMaskUrl(maskMeta?.gradient, !!node.params.invert)
              || buildShapeMaskUrl(maskMeta?.shape, !!node.params.invert))));
      if(!maskUrl && !isLiveMask) return { el: source };

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      if(hasMotionFlag(inputs.source?.el) || hasMotionFlag(inputs.mask?.el)){
        wrap.dataset.hasMotion = "true";
      }

      if(hasAnimatedMask && liveMaskEl){
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

        liveMaskHost.appendChild(liveMaskDriver);
        wrap.appendChild(liveMaskHost);
        liveMaskSourceEl = liveMaskDriver;
      }

      const layerContainer = document.createElement("div");
      layerContainer.style.position = "absolute";
      layerContainer.style.inset = "0";
      layerContainer.style.maskImage = maskUrl;
      layerContainer.style.webkitMaskImage = maskUrl;
      layerContainer.style.maskMode = isLiveMask ? "alpha" : "luminance";
      layerContainer.style.webkitMaskMode = isLiveMask ? "alpha" : "luminance";
      layerContainer.style.webkitMaskComposite = "source-over";
      layerContainer.style.maskRepeat = "no-repeat";
      layerContainer.style.webkitMaskRepeat = "no-repeat";
      layerContainer.style.maskPosition = "0 0";
      layerContainer.style.webkitMaskPosition = "0 0";
      layerContainer.style.maskSize = "100% 100%";
      layerContainer.style.webkitMaskSize = "100% 100%";
      if(isLiveMask) startLiveMaskUpdate(layerContainer, liveMaskSourceEl, 15);

      const sourceClone = source.cloneNode(true);
      sourceClone.style.position = "absolute";
      sourceClone.style.inset = "0";
      layerContainer.appendChild(sourceClone);

      wrap.appendChild(layerContainer);
      return { el: wrap };
    },
    inspector: () => ([
      {k:"invert", type:"checkbox", label:"Invert Mask"}
    ])
  };
};