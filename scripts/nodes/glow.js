window.createOniwireGlowNodeDef = function createOniwireGlowNodeDef({ propagateMotionFlag, clamp, parseHexColor }){
  return {
    inputs: ["in"],
    outputs: ["layer"],
    defaults: { mode: "outer", color: "#7aa7ff", blur: 24, strength: 70, threshold: 40, intensity: 70 },
    icon: "✨",
    run: (node, inputs) => {
      const src = inputs.in;
      if(!src?.el) return null;

      const wrap = document.createElement("div");
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      propagateMotionFlag(wrap, src.el);

      const mode = node.params.mode || "outer";
      const blur = Math.max(0, Number(node.params.blur) || 0);

      if(mode === "luminance"){
        const glowLayer = src.el.cloneNode(true);
        const t = clamp((Number(node.params.threshold) || 0) / 100, 0, 1);
        const intensity = clamp((Number(node.params.intensity) || 0) / 100, 0, 1);
        const brightness = 1 + t * 0.9;
        const contrast = 1 + t * 3.0;

        glowLayer.style.position = "absolute";
        glowLayer.style.inset = "0";
        glowLayer.style.filter = `grayscale(1) brightness(${brightness}) contrast(${contrast}) blur(${blur}px)`;
        glowLayer.style.mixBlendMode = "screen";
        glowLayer.style.opacity = String(intensity);
        glowLayer.style.pointerEvents = "none";

        wrap.appendChild(src.el);
        wrap.appendChild(glowLayer);
      }else{
        const { r, g, b } = parseHexColor(node.params.color || "#7aa7ff");
        const alpha = clamp((Number(node.params.strength) || 0) / 100, 0, 1);
        const glow = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        wrap.style.filter = `drop-shadow(0 0 ${Math.max(0, blur)}px ${glow})`;
        wrap.appendChild(src.el);
      }
      return { el: wrap };
    },
    inspector: () => ([
      { k: "mode", type: "select", label: "Mode", options: ["outer", "luminance"] },
      { k: "color", type: "color", label: "Glow Color", showIf: { k: "mode", equals: "outer" } },
      { k: "blur", type: "range", label: "Blur", min: 0, max: 120, step: 1 },
      { k: "strength", type: "range", label: "Strength", min: 0, max: 100, step: 1, showIf: { k: "mode", equals: "outer" } },
      { k: "threshold", type: "range", label: "Luma Threshold", min: 0, max: 100, step: 1, showIf: { k: "mode", equals: "luminance" } },
      { k: "intensity", type: "range", label: "Intensity", min: 0, max: 100, step: 1, showIf: { k: "mode", equals: "luminance" } }
    ])
  };
};
