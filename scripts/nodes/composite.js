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

  return {
    inputs: (node) => [...getCompositeLayerPorts(node), "mask"],
    outputs: ["layer"],
    defaults: { blend: "normal", opacity: 100, inputPorts: ["a", "b"] },
    icon: "🧬",
    run: (node, inputs) => {
      const layerPorts = getCompositeLayerPorts(node);
      const layerClones = layerPorts
        .map(port => inputs[port]?.el ? inputs[port].el.cloneNode(true) : null)
        .filter(Boolean);
      const rampStops = inputs.mask?.stops ? normalizeRampStops(inputs.mask.stops) : [];
      const liveMaskEl = inputs.mask?.el || null;
      const isLiveMask = liveMaskEl?.dataset?.frozenLive === "true";

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
      if(layerPorts.some(port => hasMotionFlag(inputs[port]?.el)) || hasMotionFlag(inputs.mask?.el)){
        wrap.dataset.hasMotion = "true";
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

      const liveUrl = isLiveMask ? (liveMaskEl?.dataset?.frozenUrl || "") : "";
      const maskUrl = isLiveMask
        ? (liveUrl ? `url(${liveUrl})` : null)
        : ((frozenUrl && frozenUrl.length > 0)
            ? `url(${frozenUrl})`
            : (rampStops.length
                ? buildRampMaskUrl(rampStops)
                : (buildGradientMaskUrl(maskMeta?.gradient, false)
                    || buildShapeMaskUrl(maskMeta?.shape, false))));
      if(maskUrl || isLiveMask){
        wrap.style.maskImage = maskUrl;
        wrap.style.webkitMaskImage = maskUrl;
        wrap.style.maskMode = "luminance";
        wrap.style.webkitMaskMode = "luminance";
        wrap.style.maskRepeat = "no-repeat";
        wrap.style.webkitMaskRepeat = "no-repeat";
        wrap.style.maskPosition = "0 0";
        wrap.style.webkitMaskPosition = "0 0";
        wrap.style.maskSize = "100% 100%";
        wrap.style.webkitMaskSize = "100% 100%";
        if(isLiveMask) startLiveMaskUpdate(wrap, liveMaskEl, 15);
      } else if(M){
        setTimeout(() => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            const tempDiv = document.createElement("div");
            tempDiv.style.position = "absolute";
            tempDiv.style.left = "-9999px";
            tempDiv.style.top = "-9999px";
            tempDiv.style.width = "1280px";
            tempDiv.style.height = "720px";
            tempDiv.style.overflow = "hidden";

            const maskClone = M.cloneNode(true);
            maskClone.style.position = "absolute";
            maskClone.style.inset = "0";
            tempDiv.appendChild(maskClone);
            document.body.appendChild(tempDiv);

            const svg = new XMLSerializer().serializeToString(tempDiv);
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              wrap.style.maskImage = `url(${dataUrl})`;
              wrap.style.webkitMaskImage = `url(${dataUrl})`;
              wrap.style.maskMode = "luminance";
              wrap.style.webkitMaskMode = "luminance";
              wrap.style.maskPosition = "0 0";
              wrap.style.webkitMaskPosition = "0 0";
              wrap.style.maskSize = "100% 100%";
              wrap.style.webkitMaskSize = "100% 100%";
            };
            img.src = "data:image/svg+xml;base64," + btoa(svg);

            document.body.removeChild(tempDiv);
          } catch(_e) {
            M.style.position = "absolute";
            M.style.inset = "0";
            M.style.opacity = "0.5";
            wrap.appendChild(M);
          }
        }, 0);
      }

      return { el: wrap };
    },
    inspector: () => ([
      {k:"blend", type:"select", label:"Blend Mode", options:[
        "normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn",
        "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"
      ]},
      {k:"opacity", type:"range", label:"Opacity %", min:0, max:100, step:1},
      { type:"actionButtons", label:"Inputs", buttons:[{ label:"+ Input", id:"compositeAddInput" }, { label:"- Input", id:"compositeRemoveInput" }] }
    ])
  };
};
