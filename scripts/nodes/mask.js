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
      const isLiveMask = liveMaskEl?.dataset?.frozenLive === "true";

      const frozenUrl = inputs.mask?.dataUrl || inputs.mask?.el?.dataset?.frozenUrl;
      const maskMeta = inputs.mask?.el ? {
        gradient: resolveGradientMetaFromEl(inputs.mask.el),
        shape: resolveMaskMetaFromEl(inputs.mask.el)
      } : null;

      const mask = inputs.mask?.el ? inputs.mask.el.cloneNode(true) : null;

      if(!source) return null;
      if(!mask && rampStops.length === 0 && !(frozenUrl && frozenUrl.length > 0)) return { el: source };

      const liveUrl = isLiveMask ? (liveMaskEl?.dataset?.frozenUrl || "") : "";
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

      const layerContainer = document.createElement("div");
      layerContainer.style.position = "absolute";
      layerContainer.style.inset = "0";
      layerContainer.style.maskImage = maskUrl;
      layerContainer.style.webkitMaskImage = maskUrl;
      layerContainer.style.maskMode = "luminance";
      layerContainer.style.webkitMaskMode = "luminance";
      layerContainer.style.webkitMaskComposite = "source-over";
      layerContainer.style.maskRepeat = "no-repeat";
      layerContainer.style.webkitMaskRepeat = "no-repeat";
      layerContainer.style.maskPosition = "0 0";
      layerContainer.style.webkitMaskPosition = "0 0";
      layerContainer.style.maskSize = "100% 100%";
      layerContainer.style.webkitMaskSize = "100% 100%";
      if(isLiveMask) startLiveMaskUpdate(layerContainer, liveMaskEl, 15);

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