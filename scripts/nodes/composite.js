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
  return {
    inputs: ["a", "b", "mask"],
    outputs: ["layer"],
    defaults: { blend: "normal", opacity: 100 },
    icon: "🧬",
    run: (node, inputs) => {
      const A = inputs.a?.el ? inputs.a.el.cloneNode(true) : null;
      const B = inputs.b?.el ? inputs.b.el.cloneNode(true) : null;
      const rampStops = inputs.mask?.stops ? normalizeRampStops(inputs.mask.stops) : [];
      const liveMaskEl = inputs.mask?.el || null;
      const isLiveMask = liveMaskEl?.dataset?.frozenLive === "true";

      const frozenUrl = inputs.mask?.dataUrl || inputs.mask?.el?.dataset?.frozenUrl;
      const maskMeta = inputs.mask?.el ? {
        gradient: resolveGradientMetaFromEl(inputs.mask.el),
        shape: resolveMaskMetaFromEl(inputs.mask.el)
      } : null;

      const M = inputs.mask?.el ? inputs.mask.el.cloneNode(true) : null;
      if(!A && !B) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      if(hasMotionFlag(inputs.a?.el) || hasMotionFlag(inputs.b?.el) || hasMotionFlag(inputs.mask?.el)){
        wrap.dataset.hasMotion = "true";
      }

      const blendMode = node.params.blend || "normal";
      const opacity = Number(node.params.opacity ?? 100) / 100;

      if(B) wrap.appendChild(B);
      if(A) {
        A.style.opacity = String(opacity);
        A.style.mixBlendMode = blendMode;
        wrap.appendChild(A);
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
      {k:"opacity", type:"range", label:"Opacity %", min:0, max:100, step:1}
    ])
  };
};
